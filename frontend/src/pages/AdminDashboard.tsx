import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useApp } from '../context/AppContext.js';
import * as adminApi from '../services/adminApi.js';
import * as classApi from '../services/classApi.js';
import { approveDocument, getDocumentAssist, getDocumentChunks, getDocumentFileUrl, rejectDocument, type DocumentAssistData } from '../services/documentApi.js';
import { createSubject, deleteSubject } from '../services/subjectApi.js';
import type { IClassEnrollment, ICourseClass, IDocument, ISubject, IUser, UserRole } from '../types/index.js';
import { Icon } from '../components/shared/Icon.js';

type Tab = 'overview' | 'users' | 'subjects' | 'classes' | 'review';
const userId = (user: IUser) => user._id ?? user.id;
const populatedId = (value: ICourseClass['teacherId']): string => typeof value === 'string' ? value : value?._id ?? value?.id ?? '';
const subjectOf = (courseClass: ICourseClass): ISubject | undefined => typeof courseClass.subjectId === 'string' ? undefined : courseClass.subjectId;
const documentScope = (document: IDocument): string => document.visibility === 'class-restricted'
  ? `Lớp: ${(document.classIds ?? []).map((value) => typeof value === 'string' ? value : `${value.code} · ${value.name}`).join(', ') || 'chưa xác định'}`
  : 'Toàn môn học';

export const AdminDashboard: React.FC = () => {
  const { state: appState, refreshDocuments, refreshSubjects } = useApp();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = (searchParams.get('tab') as Tab) || 'overview';
  const setTab = (newTab: Tab) => {
    setSearchParams({ tab: newTab });
  };
  const [summary, setSummary] = useState<adminApi.AdminSummary | null>(null);
  const [users, setUsers] = useState<IUser[]>([]);
  const [classes, setClasses] = useState<ICourseClass[]>([]);
  const [userRole, setUserRole] = useState<UserRole | 'inactive'>('student');
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [selectedClass, setSelectedClass] = useState<ICourseClass | null>(null);
  const [roster, setRoster] = useState<IClassEnrollment[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<IDocument | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [assist, setAssist] = useState<DocumentAssistData | null>(null);
  const [previewChunks, setPreviewChunks] = useState<string[]>([]);
  const [rejectReason, setRejectReason] = useState('');
  const [newUser, setNewUser] = useState({ username: '', password: '', role: 'student' as UserRole, fullName: '', email: '', userCode: '' });
  const [newSubject, setNewSubject] = useState({ code: '', name: '', description: '' });
  const [newClass, setNewClass] = useState({ code: '', name: '', subjectId: '', teacherId: '', status: 'draft' as ICourseClass['status'], allowSelfEnrollment: false });

  const loadCore = useCallback(async () => {
    const [nextSummary, nextUsers, nextClasses] = await Promise.all([
      adminApi.getSummary(), adminApi.getUsers(), classApi.getClasses(),
    ]);
    setSummary(nextSummary);
    setUsers(nextUsers);
    setClasses(nextClasses);
  }, []);

  useEffect(() => { void loadCore(); }, [loadCore]);
  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  const filteredUsers = useMemo(() => users.filter((user) => {
    if (userRole === 'inactive' ? user.isActive : user.role !== userRole || !user.isActive) return false;
    const value = `${user.username} ${user.fullName} ${user.email} ${user.userCode}`.toLowerCase();
    return value.includes(search.toLowerCase());
  }), [users, userRole, search]);
  
  const teachers = users.filter((user) => user.role === 'teacher' && user.isActive);
  const students = users.filter((user) => user.role === 'student' && user.isActive);
  const pendingDocuments = appState.documents.filter((document) => document.status === 'pending');

  const run = async (action: () => Promise<void>, success: string) => {
    setBusy(true); setMessage(null);
    try { await action(); setMessage(success); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Thao tác thất bại.'); }
    finally { setBusy(false); }
  };

  const createAccount = (event: React.FormEvent) => {
    event.preventDefault();
    void run(async () => {
      await adminApi.createUser(newUser); 
      setNewUser({ username: '', password: '', role: 'student', fullName: '', email: '', userCode: '' }); 
      await loadCore();
    }, 'Đã tạo tài khoản thành công.');
  };

  const createCourse = (event: React.FormEvent) => {
    event.preventDefault();
    void run(async () => {
      await createSubject(newSubject); 
      setNewSubject({ code: '', name: '', description: '' }); 
      await refreshSubjects(); 
      await loadCore();
    }, 'Đã tạo môn học mới.');
  };

  const createCourseClass = (event: React.FormEvent) => {
    event.preventDefault();
    void run(async () => {
      await classApi.createClass({ ...newClass, teacherId: newClass.teacherId || undefined });
      setNewClass({ code: '', name: '', subjectId: '', teacherId: '', status: 'draft', allowSelfEnrollment: false }); 
      await loadCore();
    }, 'Đã tạo lớp học mới.');
  };

  const openRoster = async (courseClass: ICourseClass) => {
    setSelectedClass(courseClass);
    try {
      setRoster(await classApi.getRoster(courseClass._id));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không thể tải danh sách sinh viên.');
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    void navigator.clipboard.writeText(text);
    setMessage(`Đã sao chép ${label} vào bộ nhớ tạm.`);
    setTimeout(() => setMessage(null), 3000);
  };

  const openReview = async (document: IDocument) => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedDocument(document); 
    setRejectReason(''); 
    setPreviewUrl(null); 
    setAssist(null); 
    setPreviewChunks([]);
    const [urlResult, assistResult, chunksResult] = await Promise.allSettled([
      getDocumentFileUrl(document._id), getDocumentAssist(document._id), getDocumentChunks(document._id),
    ]);
    if (urlResult.status === 'fulfilled') setPreviewUrl(urlResult.value);
    if (assistResult.status === 'fulfilled') setAssist(assistResult.value);
    if (chunksResult.status === 'fulfilled') setPreviewChunks(chunksResult.value.map((chunk) => chunk.content));
  };

  const renderUsers = () => (
    <div className="admin-grid two">
      <form className="admin-card form-stack" onSubmit={createAccount}>
        <h2>Tạo tài khoản</h2>
        <select value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value as UserRole })}>
          <option value="student">Sinh viên</option><option value="teacher">Giảng viên</option><option value="admin">Admin</option>
        </select>
        {(['fullName', 'email', 'userCode', 'username', 'password'] as const).map((field) => (
          <input key={field} type={field === 'email' ? 'email' : field === 'password' ? 'password' : 'text'} required minLength={field === 'password' ? 6 : 2}
            placeholder={{ fullName: 'Họ và tên', email: 'Email', userCode: 'Mã người dùng', username: 'Tên đăng nhập', password: 'Mật khẩu' }[field]}
            value={newUser[field]} onChange={(e) => setNewUser({ ...newUser, [field]: field === 'userCode' ? e.target.value.toUpperCase() : e.target.value })} />
        ))}
        <button className="btn-primary" disabled={busy}>Tạo tài khoản</button>
      </form>
      <section className="admin-card wide-card">
        <div className="admin-toolbar">
          <div className="admin-tabs compact">
            {(['admin', 'teacher', 'student', 'inactive'] as const).map((role) => <button key={role} className={userRole === role ? 'active' : ''} onClick={() => setUserRole(role)}>{role}</button>)}
          </div>
          <input placeholder="Tìm theo tên, email, mã..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="table-wrap"><table><thead><tr><th>Người dùng</th><th>Mã</th><th>Vai trò</th><th>Trạng thái</th><th /></tr></thead><tbody>
          {filteredUsers.map((user) => <tr key={userId(user)}><td><strong>{user.fullName}</strong><small>{user.username} · {user.email}</small></td><td>{user.userCode}</td><td>{user.role}</td><td>{user.isActive ? 'Đang hoạt động' : 'Đã vô hiệu hóa'}</td><td className="actions">
            <button onClick={() => { const password = prompt('Mật khẩu mới (ít nhất 6 ký tự)'); if (password) void run(() => adminApi.resetPassword(userId(user), password), 'Đã đặt lại mật khẩu.'); }}>Đặt lại MK</button>
            <button onClick={() => void run(async () => { user.isActive ? await adminApi.deactivateUser(userId(user)) : await adminApi.activateUser(userId(user)); await loadCore(); }, user.isActive ? 'Đã vô hiệu hóa.' : 'Đã kích hoạt.')}>{user.isActive ? 'Vô hiệu hóa' : 'Kích hoạt'}</button>
          </td></tr>)}
        </tbody></table></div>
      </section>
    </div>
  );

  const renderSubjects = () => (
    <div className="admin-grid two">
      <form className="admin-card form-stack" onSubmit={createCourse}><h2>Tạo môn học</h2>
        <input required placeholder="Mã môn (VD: SWD392)" value={newSubject.code} onChange={(e) => setNewSubject({ ...newSubject, code: e.target.value.toUpperCase() })} />
        <input required placeholder="Tên môn học" value={newSubject.name} onChange={(e) => setNewSubject({ ...newSubject, name: e.target.value })} />
        <textarea placeholder="Mô tả" value={newSubject.description} onChange={(e) => setNewSubject({ ...newSubject, description: e.target.value })} />
        <button className="btn-primary" disabled={busy}>Tạo môn</button>
      </form>
      <section className="admin-card"><h2>Môn học</h2><div className="stack-list">{appState.subjects.map((subject) => <div className="list-row" key={subject._id}><span><strong>{subject.code}</strong><small>{subject.name}</small></span><button onClick={() => void run(async () => { await deleteSubject(subject._id); await refreshSubjects(); await loadCore(); }, 'Đã lưu trữ môn học.')}>Lưu trữ</button></div>)}</div></section>
    </div>
  );

  const renderClasses = () => (
    <div className="admin-grid two">
      <form className="admin-card form-stack" onSubmit={createCourseClass}><h2>Tạo lớp học</h2>
        <input required placeholder="Mã lớp" value={newClass.code} onChange={(e) => setNewClass({ ...newClass, code: e.target.value.toUpperCase() })} />
        <input required placeholder="Tên lớp" value={newClass.name} onChange={(e) => setNewClass({ ...newClass, name: e.target.value })} />
        <select required value={newClass.subjectId} onChange={(e) => setNewClass({ ...newClass, subjectId: e.target.value })}><option value="">Chọn môn học</option>{appState.subjects.filter((s) => s.isActive).map((s) => <option key={s._id} value={s._id}>{s.code} · {s.name}</option>)}</select>
        <select value={newClass.teacherId} onChange={(e) => setNewClass({ ...newClass, teacherId: e.target.value, status: e.target.value ? 'active' : 'draft' })}><option value="">Chưa phân công</option>{teachers.map((t) => <option key={userId(t)} value={userId(t)}>{t.fullName} · {t.userCode}</option>)}</select>
        <label className="check"><input type="checkbox" checked={newClass.allowSelfEnrollment} onChange={(e) => setNewClass({ ...newClass, allowSelfEnrollment: e.target.checked })} /> Cho phép tự tham gia</label>
        <button className="btn-primary" disabled={busy}>Tạo lớp</button>
      </form>
      <div className="catalog-main-content">
        <section className="admin-card"><h2>Danh sách lớp</h2><div className="class-grid">{classes.map((courseClass) => <article className="class-card" key={courseClass._id}>
          <div><span className={`status ${courseClass.status}`}>{courseClass.status}</span><h3>{courseClass.code}</h3><p>{courseClass.name}</p><small>{subjectOf(courseClass)?.code} · {subjectOf(courseClass)?.name}</small></div>
          <p>Giảng viên: {typeof courseClass.teacherId === 'object' ? courseClass.teacherId.fullName : 'Chưa phân công'}</p>
          <code>{courseClass.joinCode ?? '--------'}</code>
          <div className="actions"><button onClick={() => void openRoster(courseClass)}>Roster</button><button onClick={() => void run(async () => { await classApi.regenerateJoinCode(courseClass._id); await loadCore(); }, 'Đã tạo mã tham gia mới.')}>Đổi mã</button></div>
          <select value={populatedId(courseClass.teacherId)} onChange={(e) => void run(async () => { await classApi.updateClass(courseClass._id, { teacherId: e.target.value || null, status: e.target.value ? 'active' : 'draft' }); await loadCore(); }, 'Đã cập nhật giảng viên.')}><option value="">Chưa phân công</option>{teachers.map((teacher) => <option key={userId(teacher)} value={userId(teacher)}>{teacher.fullName}</option>)}</select>
        </article>)}</div></section>
        {selectedClass && <section className="admin-card"><div className="section-title"><h2>Roster · {selectedClass.code}</h2><button onClick={() => setSelectedClass(null)}>Đóng</button></div>
          <div className="admin-toolbar"><select id="student-to-add"><option value="">Chọn sinh viên</option>{students.filter((student) => !roster.some((item) => userId(item.studentId) === userId(student))).map((student) => <option value={userId(student)} key={userId(student)}>{student.fullName} · {student.userCode}</option>)}</select><button className="btn-primary" onClick={() => { const select = document.getElementById('student-to-add') as HTMLSelectElement; if (select.value) void run(async () => { await classApi.addStudent(selectedClass._id, select.value); await openRoster(selectedClass); }, 'Đã thêm sinh viên.'); }}>Thêm sinh viên</button></div>
          <div className="stack-list">{roster.map((item) => <div className="list-row" key={item._id}><span><strong>{item.studentId.fullName}</strong><small>{item.studentId.userCode} · {item.source}</small></span><button onClick={() => void run(async () => { await classApi.removeStudent(selectedClass._id, userId(item.studentId)); await openRoster(selectedClass); }, 'Đã xóa khỏi lớp.')}>Xóa khỏi lớp</button></div>)}</div>
        </section>}
      </div>
    </div>
  );

  const renderReview = () => (
    <div className="admin-grid review-grid"><section className="admin-card"><h2>Chờ duyệt ({pendingDocuments.length})</h2><div className="stack-list">{pendingDocuments.map((document) => <button className={`review-row ${selectedDocument?._id === document._id ? 'selected' : ''}`} key={document._id} onClick={() => void openReview(document)}><strong>{document.originalName}</strong><small>{document.subject} · Chương {document.chapter}</small><small>{documentScope(document)}</small></button>)}</div></section>
      <section className="admin-card preview-card">{selectedDocument ? <><div className="section-title"><div><h2>{selectedDocument.originalName}</h2><small>{selectedDocument.subject} · {selectedDocument.totalChunks} chunks</small><strong>{documentScope(selectedDocument)}</strong></div></div>
        {previewUrl ? selectedDocument.fileType === 'pdf' ? <iframe title="Document preview" src={previewUrl} /> : <><a className="download-link" href={previewUrl} download={selectedDocument.originalName}>Tải file để xem bản gốc</a><div className="text-preview">{previewChunks.length ? previewChunks.slice(0, 5).map((content, index) => <p key={index}>{content}</p>) : <p>Không có nội dung text để preview.</p>}</div></> : <p>Không thể tải preview file.</p>}
        <h3>Study Assist</h3>{assist ? <div className="assist-preview">{assist.takeaways.map((item) => <div key={item.concept}><strong>{item.concept}</strong><p>{item.desc}</p></div>)}</div> : <p>Giảng viên chưa tạo study assist.</p>}
        <textarea placeholder="Lý do từ chối (bắt buộc khi reject)" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
        <div className="actions"><button className="approve" disabled={busy} onClick={() => void run(async () => { await approveDocument(selectedDocument._id); setSelectedDocument(null); await refreshDocuments(); await loadCore(); }, 'Đã duyệt tài liệu.')}>Duyệt</button><button className="reject" disabled={busy || rejectReason.trim().length < 3} onClick={() => void run(async () => { await rejectDocument(selectedDocument._id, rejectReason); setSelectedDocument(null); await refreshDocuments(); await loadCore(); }, 'Đã từ chối tài liệu.')}>Từ chối</button></div>
      </> : <div className="empty">Chọn một tài liệu để review.</div>}</section></div>
  );

  return (
    <div className="admin-container">
      <aside className="admin-sidebar">
        <div className="sidebar-brand">
          <span className="sidebar-subtitle">ADMIN WORKSPACE</span>
          <h1 className="sidebar-title">Điều hành học vụ</h1>
          <p className="sidebar-desc">Quản lý hệ thống học vụ</p>
        </div>
        <nav className="sidebar-nav">
          {([
            ['overview', 'Tổng quan', 'dashboard'],
            ['users', 'Tài khoản', 'group'],
            ['subjects', 'Môn học', 'menu_book'],
            ['classes', 'Lớp học', 'school'],
            ['review', `Duyệt tài liệu (${pendingDocuments.length})`, 'rate_review']
          ] as [Tab, string, string][]).map(([key, label, iconName]) => (
            <button
              className={`sidebar-nav-item ${tab === key ? 'active' : ''}`}
              onClick={() => setTab(key)}
              key={key}
            >
              <Icon name={iconName} />
              <span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <button
            className="btn-refresh"
            onClick={() => void Promise.all([loadCore(), refreshDocuments(), refreshSubjects()])}
          >
            <Icon name="refresh" />
            <span>Làm mới dữ liệu</span>
          </button>
        </div>
      </aside>

      <main className="admin-main">
        {message && (
          <div className="admin-message">
            <span>{message}</span>
            <button onClick={() => setMessage(null)}>×</button>
          </div>
        )}
        
        {tab === 'overview' && (
          <div className="tab-pane">
            <div className="tab-header">
              <h2>Tổng quan hệ thống</h2>
              <p>Thống kê số lượng các thực thể trong hệ thống</p>
            </div>
            <div className="metric-grid">
              {summary && Object.entries(summary).map(([key, value]) => {
                const cardMap = {
                  users: { label: 'Tài khoản active', icon: 'group', targetTab: 'users' as Tab },
                  subjects: { label: 'Môn học active', icon: 'menu_book', targetTab: 'subjects' as Tab },
                  classes: { label: 'Lớp đang học', icon: 'school', targetTab: 'classes' as Tab },
                  pendingDocuments: { label: 'Tài liệu chờ duyệt', icon: 'rate_review', targetTab: 'review' as Tab }
                };
                const config = cardMap[key as keyof adminApi.AdminSummary];
                return (
                  <div 
                    className="metric-card interactive" 
                    key={key}
                    onClick={() => setTab(config.targetTab)}
                  >
                    <div className="metric-icon-wrap">
                      <Icon name={config.icon} />
                    </div>
                    <div className="metric-info">
                      <strong>{value}</strong>
                      <span>{config.label}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {tab === 'users' && (
          <div className="tab-pane">
            <div className="tab-header">
              <h2>Quản lý tài khoản</h2>
              <p>Tạo mới và cập nhật trạng thái hoạt động của người dùng</p>
            </div>
            {renderUsers()}
          </div>
        )}

        {tab === 'subjects' && (
          <div className="tab-pane">
            <div className="tab-header">
              <h2>Quản lý môn học</h2>
              <p>Thiết lập môn học mới và lưu trữ môn học</p>
            </div>
            {renderSubjects()}
          </div>
        )}

        {tab === 'classes' && (
          <div className="tab-pane">
            <div className="tab-header">
              <h2>Quản lý lớp học</h2>
              <p>Mở lớp mới, phân công giảng viên, và quản lý danh sách roster</p>
            </div>
            {renderClasses()}
          </div>
        )}

        {tab === 'review' && (
          <div className="tab-pane">
            <div className="tab-header">
              <h2>Duyệt tài liệu học tập</h2>
              <p>Xem trước và phê duyệt tài liệu do giảng viên tải lên</p>
            </div>
            {renderReview()}
          </div>
        )}
      </main>
      <AdminStyle />
    </div>
  );
};

const AdminStyle = () => <style>{`
.admin-container {
  display: flex;
  min-height: 100vh;
  background: var(--color-background, #f8fafc);
  color: var(--color-on-background, #0f172a);
  width: 100%;
}
.admin-sidebar {
  width: 260px;
  background: #fff;
  border-right: 1px solid var(--color-outline-variant);
  padding: 24px 16px;
  display: flex;
  flex-direction: column;
  gap: 24px;
  flex-shrink: 0;
  position: sticky;
  top: 0;
  height: 100vh;
  overflow-y: auto;
}
.sidebar-brand .sidebar-subtitle {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: .08em;
  color: var(--color-primary);
  text-transform: uppercase;
  display: block;
}
.sidebar-brand .sidebar-title {
  font-size: 20px;
  font-weight: 800;
  letter-spacing: -.02em;
  margin: 4px 0 2px;
  color: #0f172a;
}
.sidebar-brand .sidebar-desc {
  font-size: 12px;
  color: var(--color-on-surface-variant);
  margin: 0;
}
.sidebar-nav {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex-grow: 1;
}
.sidebar-nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  border: none;
  background: transparent;
  border-radius: 8px;
  color: #475569;
  font-size: 14px;
  font-weight: 600;
  text-align: left;
  cursor: pointer;
  transition: all 0.2s ease;
  width: 100%;
}
.sidebar-nav-item:hover {
  background: #f1f5f9;
  color: #0f172a;
}
.sidebar-nav-item.active {
  background: var(--color-primary);
  color: #fff;
}
.sidebar-nav-item .icon {
  font-size: 20px;
}
.sidebar-footer {
  border-top: 1px solid var(--color-outline-variant);
  padding-top: 16px;
}
.btn-refresh {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 10px;
  border-radius: 8px;
  border: 1px solid var(--color-outline-variant);
  background: #fff;
  color: #334155;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}
.btn-refresh:hover {
  background: #f8fafc;
  border-color: #cbd5e1;
}
.admin-main {
  flex-grow: 1;
  padding: 32px;
  overflow-y: auto;
  width: calc(100% - 260px);
}
.tab-pane {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.tab-header {
  margin-bottom: 8px;
  border-bottom: 1px solid var(--color-outline-variant);
  padding-bottom: 16px;
}
.tab-header h2 {
  font-size: 22px;
  font-weight: 700;
  letter-spacing: -.02em;
  margin: 0 0 4px;
  color: #0f172a;
}
.tab-header p {
  margin: 0;
  color: var(--color-on-surface-variant);
  font-size: 14px;
}
.catalog-sidebar-forms {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.catalog-main-content {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.admin-card button {
  min-height: 36px;
  background: #fff;
  border: 1px solid var(--color-outline-variant);
  padding: 8px 12px;
  border-radius: 8px;
  color: #334155;
  font-size: 13px;
  font-weight: 600;
}
.admin-card button:hover {
  background: #f8fafc;
  border-color: #cbd5e1;
}
.admin-card .btn-primary {
  background: var(--color-primary);
  color: #fff;
  border-color: var(--color-primary);
}
.admin-tabs.compact {
  margin: 0;
  border: 0;
  padding: 0;
  display: flex;
  gap: 4px;
  background: #fff;
  border: 1px solid var(--color-outline-variant);
  border-radius: 10px;
  padding: 4px;
}
.admin-tabs.compact button {
  border: 0;
  background: transparent;
  white-space: nowrap;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
}
.admin-tabs.compact button.active {
  background: #f1f5f9;
  color: #0f172a;
}
.admin-message {
  margin: 14px 0;
  padding: 10px 13px;
  background: #f0fdf4;
  color: #166534;
  border: 1px solid #dcfce7;
  border-radius: 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.admin-message button {
  border: 0;
  background: transparent;
  color: inherit;
  font-size: 18px;
  cursor: pointer;
}
.metric-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}
.metric-card {
  background: #fff;
  border: 1px solid var(--color-outline-variant);
  border-radius: 12px;
  padding: 20px;
  box-shadow: var(--shadow-sm);
}
.metric-card.interactive {
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 16px;
  transition: all 0.2s ease;
}
.metric-card.interactive:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
  border-color: var(--color-primary);
}
.metric-icon-wrap {
  width: 48px;
  height: 48px;
  border-radius: 10px;
  background: #f1f5f9;
  color: var(--color-primary);
  display: flex;
  align-items: center;
  justify-content: center;
}
.metric-icon-wrap .icon {
  font-size: 24px;
}
.metric-info strong {
  display: block;
  font-size: 24px;
  color: #0f172a;
  letter-spacing: -.03em;
}
.metric-info span {
  display: block;
  font-size: 13px;
  color: var(--color-on-surface-variant);
  margin-top: 2px;
}
.admin-card {
  background: #fff;
  border: 1px solid var(--color-outline-variant);
  border-radius: 12px;
  padding: 18px;
  box-shadow: var(--shadow-sm);
}
.admin-card small {
  display: block;
  color: var(--color-on-surface-variant);
  margin-top: 4px;
}
.admin-grid {
  display: grid;
  gap: 14px;
}
.admin-grid.two {
  grid-template-columns: 300px 1fr;
}
.admin-grid.review-grid {
  grid-template-columns: 340px 1fr;
}
.form-stack {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.admin-card h2 {
  font-size: 16px;
  margin-bottom: 14px;
  color: #0f172a;
}
.admin-card input, .admin-card select, .admin-card textarea {
  border: 1px solid var(--color-outline-variant);
  background: #fff;
  padding: 9px 11px;
  border-radius: 8px;
  width: 100%;
}
.admin-card input:focus, .admin-card select:focus, .admin-card textarea:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgb(37 99 235/.1);
}
.admin-card textarea {
  min-height: 80px;
}
.check {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}
.check input {
  width: auto;
}
.admin-toolbar, .section-title, .list-row, .actions {
  display: flex;
  align-items: center;
  gap: 8px;
}
.admin-toolbar, .section-title, .list-row {
  justify-content: space-between;
}
.admin-toolbar input {
  max-width: 240px;
  border: 1px solid var(--color-outline-variant);
  padding: 8px 12px;
  border-radius: 8px;
}
.table-wrap {
  overflow: auto;
  margin-top: 12px;
}
.table-wrap table {
  width: 100%;
  border-collapse: collapse;
}
.table-wrap th {
  text-align: left;
  padding: 10px 12px;
  border-bottom: 2px solid var(--color-outline-variant);
  color: #475569;
  font-size: 13px;
  font-weight: 600;
}
.table-wrap td {
  padding: 12px;
  border-bottom: 1px solid var(--color-outline-variant);
  font-size: 13px;
}
.table-wrap tr:hover td {
  background: #f8fafc;
}
.actions {
  justify-content: flex-end;
}
.stack-list {
  display: flex;
  flex-direction: column;
  gap: 7px;
}
.list-row, .review-row {
  padding: 10px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.class-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}
.class-card {
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 15px;
  display: flex;
  flex-direction: column;
  gap: 11px;
}
.class-card h3 {
  margin: 0;
  font-size: 16px;
}
.class-card code {
  font-size: 16px;
  letter-spacing: 2px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  padding: 6px;
  border-radius: 7px;
  text-align: center;
  font-family: monospace;
}
.status {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  padding: 3px 7px;
  border-radius: 20px;
  background: #f1f5f9;
  color: #475569;
  display: inline-block;
  margin-bottom: 4px;
}
.status.active {
  background: #f0fdf4;
  color: #166534;
}
.review-row {
  text-align: left;
  background: #fff;
  cursor: pointer;
  flex-direction: column;
  align-items: flex-start;
  width: 100%;
}
.review-row:hover {
  background: #f8fafc;
}
.review-row.selected {
  border-color: #93c5fd;
  background: #eff6ff;
}
.preview-card iframe {
  width: 100%;
  height: 440px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  margin: 14px 0;
}
.preview-card h3 {
  margin-top: 16px;
  font-size: 14px;
}
.text-preview {
  max-height: 260px;
  overflow: auto;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 14px;
  white-space: pre-wrap;
}
.text-preview p+p {
  margin-top: 10px;
}
.assist-preview {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
  margin: 10px 0;
}
.assist-preview div {
  background: #f8fafc;
  border: 1px solid #eef2f7;
  padding: 10px;
  border-radius: 8px;
}
.admin-card .approve {
  background: #15803d;
  color: #fff;
  border-color: #15803d;
}
.admin-card .reject {
  background: #dc2626;
  color: #fff;
  border-color: #dc2626;
}
.download-link {
  display: block;
  padding: 16px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  margin: 14px 0;
  text-align: center;
}
.empty {
  min-height: 400px;
  display: grid;
  place-items: center;
  color: #64748b;
}

@media(max-width:1024px){
  .admin-container {
    flex-direction: column;
  }
  .admin-sidebar {
    width: 100%;
    height: auto;
    position: static;
    border-right: none;
    border-bottom: 1px solid var(--color-outline-variant);
    padding: 16px;
  }
  .admin-main {
    width: 100%;
    padding: 16px;
  }
  .metric-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .admin-grid.two, .admin-grid.review-grid {
    grid-template-columns: 1fr;
  }
}
@media(max-width:640px){
  .metric-grid {
    grid-template-columns: 1fr;
  }
  .class-grid {
    grid-template-columns: 1fr;
  }
}
`}</style>;
