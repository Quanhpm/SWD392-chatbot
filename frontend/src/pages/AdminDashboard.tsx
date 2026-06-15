import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useApp } from '../context/AppContext.js';
import * as adminApi from '../services/adminApi.js';
import * as classApi from '../services/classApi.js';
import { approveDocument, getDocumentAssist, getDocumentChunks, getDocumentFileUrl, rejectDocument, type DocumentAssistData } from '../services/documentApi.js';
import { createSubject, deleteSubject } from '../services/subjectApi.js';
import type { IClassEnrollment, ICourseClass, IDocument, ISubject, IUser, UserRole } from '../types/index.js';

type Tab = 'overview' | 'users' | 'catalog' | 'review';
const userId = (user: IUser) => user._id ?? user.id;
const populatedId = (value: ICourseClass['teacherId']): string => typeof value === 'string' ? value : value?._id ?? value?.id ?? '';
const subjectOf = (courseClass: ICourseClass): ISubject | undefined => typeof courseClass.subjectId === 'string' ? undefined : courseClass.subjectId;

export const AdminDashboard: React.FC = () => {
  const { state: appState, refreshDocuments, refreshSubjects } = useApp();
  const [tab, setTab] = useState<Tab>('overview');
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
      await adminApi.createUser(newUser); setNewUser({ username: '', password: '', role: 'student', fullName: '', email: '', userCode: '' }); await loadCore();
    }, 'Đã tạo tài khoản.');
  };

  const createCourse = (event: React.FormEvent) => {
    event.preventDefault();
    void run(async () => {
      await createSubject(newSubject); setNewSubject({ code: '', name: '', description: '' }); await refreshSubjects(); await loadCore();
    }, 'Đã tạo môn học.');
  };

  const createCourseClass = (event: React.FormEvent) => {
    event.preventDefault();
    void run(async () => {
      await classApi.createClass({ ...newClass, teacherId: newClass.teacherId || undefined });
      setNewClass({ code: '', name: '', subjectId: '', teacherId: '', status: 'draft', allowSelfEnrollment: false }); await loadCore();
    }, 'Đã tạo lớp học.');
  };

  const openRoster = async (courseClass: ICourseClass) => {
    setSelectedClass(courseClass); setRoster(await classApi.getRoster(courseClass._id));
  };

  const openReview = async (document: IDocument) => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedDocument(document); setRejectReason(''); setPreviewUrl(null); setAssist(null); setPreviewChunks([]);
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

  const renderCatalog = () => (
    <>
      <div className="admin-grid three">
        <form className="admin-card form-stack" onSubmit={createCourse}><h2>Tạo môn học</h2>
          <input required placeholder="Mã môn (VD: SWD392)" value={newSubject.code} onChange={(e) => setNewSubject({ ...newSubject, code: e.target.value.toUpperCase() })} />
          <input required placeholder="Tên môn học" value={newSubject.name} onChange={(e) => setNewSubject({ ...newSubject, name: e.target.value })} />
          <textarea placeholder="Mô tả" value={newSubject.description} onChange={(e) => setNewSubject({ ...newSubject, description: e.target.value })} />
          <button className="btn-primary" disabled={busy}>Tạo môn</button>
        </form>
        <form className="admin-card form-stack" onSubmit={createCourseClass}><h2>Tạo lớp học</h2>
          <input required placeholder="Mã lớp" value={newClass.code} onChange={(e) => setNewClass({ ...newClass, code: e.target.value.toUpperCase() })} />
          <input required placeholder="Tên lớp" value={newClass.name} onChange={(e) => setNewClass({ ...newClass, name: e.target.value })} />
          <select required value={newClass.subjectId} onChange={(e) => setNewClass({ ...newClass, subjectId: e.target.value })}><option value="">Chọn môn học</option>{appState.subjects.filter((s) => s.isActive).map((s) => <option key={s._id} value={s._id}>{s.code} · {s.name}</option>)}</select>
          <select value={newClass.teacherId} onChange={(e) => setNewClass({ ...newClass, teacherId: e.target.value, status: e.target.value ? 'active' : 'draft' })}><option value="">Chưa phân công</option>{teachers.map((t) => <option key={userId(t)} value={userId(t)}>{t.fullName} · {t.userCode}</option>)}</select>
          <label className="check"><input type="checkbox" checked={newClass.allowSelfEnrollment} onChange={(e) => setNewClass({ ...newClass, allowSelfEnrollment: e.target.checked })} /> Cho phép tự tham gia</label>
          <button className="btn-primary" disabled={busy}>Tạo lớp</button>
        </form>
        <section className="admin-card"><h2>Môn học</h2><div className="stack-list">{appState.subjects.map((subject) => <div className="list-row" key={subject._id}><span><strong>{subject.code}</strong><small>{subject.name}</small></span><button onClick={() => void run(async () => { await deleteSubject(subject._id); await refreshSubjects(); await loadCore(); }, 'Đã lưu trữ môn học.')}>Lưu trữ</button></div>)}</div></section>
      </div>
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
    </>
  );

  const renderReview = () => (
    <div className="admin-grid review-grid"><section className="admin-card"><h2>Chờ duyệt ({pendingDocuments.length})</h2><div className="stack-list">{pendingDocuments.map((document) => <button className={`review-row ${selectedDocument?._id === document._id ? 'selected' : ''}`} key={document._id} onClick={() => void openReview(document)}><strong>{document.originalName}</strong><small>{document.subject} · Chương {document.chapter}</small></button>)}</div></section>
      <section className="admin-card preview-card">{selectedDocument ? <><div className="section-title"><div><h2>{selectedDocument.originalName}</h2><small>{selectedDocument.subject} · {selectedDocument.totalChunks} chunks</small></div></div>
        {previewUrl ? selectedDocument.fileType === 'pdf' ? <iframe title="Document preview" src={previewUrl} /> : <><a className="download-link" href={previewUrl} download={selectedDocument.originalName}>Tải file để xem bản gốc</a><div className="text-preview">{previewChunks.length ? previewChunks.slice(0, 5).map((content, index) => <p key={index}>{content}</p>) : <p>Không có nội dung text để preview.</p>}</div></> : <p>Không thể tải preview file.</p>}
        <h3>Study Assist</h3>{assist ? <div className="assist-preview">{assist.takeaways.map((item) => <div key={item.concept}><strong>{item.concept}</strong><p>{item.desc}</p></div>)}</div> : <p>Giảng viên chưa tạo study assist.</p>}
        <textarea placeholder="Lý do từ chối (bắt buộc khi reject)" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
        <div className="actions"><button className="approve" disabled={busy} onClick={() => void run(async () => { await approveDocument(selectedDocument._id); setSelectedDocument(null); await refreshDocuments(); await loadCore(); }, 'Đã duyệt tài liệu.')}>Duyệt</button><button className="reject" disabled={busy || rejectReason.trim().length < 3} onClick={() => void run(async () => { await rejectDocument(selectedDocument._id, rejectReason); setSelectedDocument(null); await refreshDocuments(); await loadCore(); }, 'Đã từ chối tài liệu.')}>Từ chối</button></div>
      </> : <div className="empty">Chọn một tài liệu để review.</div>}</section></div>
  );

  return <div className="admin-page"><header className="admin-hero"><div><span>ADMIN WORKSPACE</span><h1>Điều hành học vụ</h1><p>Quản lý con người, lớp học và chất lượng tài liệu tại một nơi.</p></div><button onClick={() => void Promise.all([loadCore(), refreshDocuments(), refreshSubjects()])}>Làm mới dữ liệu</button></header>
    {message && <div className="admin-message">{message}<button onClick={() => setMessage(null)}>×</button></div>}
    <nav className="admin-tabs">{([['overview', 'Tổng quan'], ['users', 'Tài khoản'], ['catalog', 'Môn & lớp'], ['review', `Duyệt tài liệu (${pendingDocuments.length})`]] as [Tab, string][]).map(([key, label]) => <button className={tab === key ? 'active' : ''} onClick={() => setTab(key)} key={key}>{label}</button>)}</nav>
    {tab === 'overview' && <div className="metric-grid">{summary && Object.entries(summary).map(([key, value]) => <div className="metric-card" key={key}><strong>{value}</strong><span>{{ users: 'Tài khoản active', subjects: 'Môn học active', classes: 'Lớp đang học', pendingDocuments: 'Tài liệu chờ duyệt' }[key as keyof adminApi.AdminSummary]}</span></div>)}</div>}
    {tab === 'users' && renderUsers()}{tab === 'catalog' && renderCatalog()}{tab === 'review' && renderReview()}
    <AdminStyle />
  </div>;
};

const AdminStyle = () => <style>{`
.admin-page{padding:32px;max-width:1500px;margin:auto}.admin-hero{background:linear-gradient(125deg,#001b54,#006a61);color:#fff;padding:30px;border-radius:20px;display:flex;justify-content:space-between;align-items:center}.admin-hero span{font-size:12px;letter-spacing:2px;color:#86f2e4}.admin-hero h1{font-size:32px;margin:5px 0}.admin-hero button,.admin-tabs button,.admin-card button{background:#fff;border:1px solid #c5c5d3;padding:9px 13px;border-radius:8px;color:#00236f}.admin-card .btn-primary{background:#00236f;color:#fff;border-color:#00236f}.admin-tabs{display:flex;gap:8px;margin:24px 0}.admin-tabs button.active{background:#00236f;color:#fff;border-color:#00236f}.admin-tabs.compact{margin:0}.admin-message{margin:14px 0;padding:12px 16px;background:#dff7f2;color:#005047;border-radius:10px;display:flex;justify-content:space-between}.metric-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}.metric-card,.admin-card{background:#fff;border:1px solid #e1e5ee;border-radius:16px;padding:20px;box-shadow:var(--shadow-sm)}.metric-card strong{display:block;font-size:32px;color:#00236f}.metric-card span,small{display:block;color:#666;margin-top:4px}.admin-grid{display:grid;gap:18px}.admin-grid.two{grid-template-columns:320px 1fr}.admin-grid.three{grid-template-columns:repeat(3,1fr)}.admin-grid.review-grid{grid-template-columns:360px 1fr}.form-stack{display:flex;flex-direction:column;gap:10px}.admin-card h2{margin-bottom:15px}.admin-card input,.admin-card select,.admin-card textarea{border:1px solid #c5c5d3;background:#fff;padding:10px 12px;border-radius:8px;width:100%}.admin-card textarea{min-height:80px}.check{display:flex;align-items:center;gap:8px}.check input{width:auto}.admin-toolbar,.section-title,.list-row,.actions{display:flex;align-items:center;gap:9px}.admin-toolbar,.section-title,.list-row{justify-content:space-between}.table-wrap{overflow:auto;margin-top:12px}table{width:100%;border-collapse:collapse}th,td{text-align:left;padding:12px;border-bottom:1px solid #eee}.actions{justify-content:flex-end}.stack-list{display:flex;flex-direction:column;gap:8px}.list-row,.review-row{padding:11px;border:1px solid #e3e6ec;border-radius:10px}.class-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}.class-card{border:1px solid #dce2ec;border-radius:14px;padding:16px;display:flex;flex-direction:column;gap:12px}.class-card code{font-size:20px;letter-spacing:2px;background:#eff4ff;padding:10px;border-radius:8px;text-align:center}.status{font-size:11px;text-transform:uppercase;padding:4px 7px;border-radius:20px;background:#eee}.status.active{background:#dff7f2;color:#006a61}.review-row{text-align:left;background:#fff}.review-row.selected{border-color:#00236f;background:#eff4ff}.preview-card iframe{width:100%;height:440px;border:1px solid #ddd;border-radius:10px;margin:14px 0}.preview-card h3{margin-top:16px}.text-preview{max-height:260px;overflow:auto;background:#f7f9fc;border:1px solid #e1e5ee;border-radius:10px;padding:14px;white-space:pre-wrap}.text-preview p+p{margin-top:10px}.assist-preview{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin:10px 0}.assist-preview div{background:#f5f7fb;padding:10px;border-radius:8px}.admin-card .approve{background:#006a61;color:#fff}.admin-card .reject{background:#ba1a1a;color:#fff}.download-link{display:block;padding:18px;background:#eff4ff;border-radius:10px;margin:14px 0;text-align:center}.empty{min-height:400px;display:grid;place-items:center;color:#666}@media(max-width:1000px){.metric-grid,.admin-grid.two,.admin-grid.three,.admin-grid.review-grid,.class-grid{grid-template-columns:1fr}.admin-page{padding:18px}.admin-hero{align-items:flex-start;gap:20px}.admin-tabs{overflow:auto}}
`}</style>;
