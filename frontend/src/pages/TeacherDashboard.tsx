import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import { useApp } from '../context/AppContext.js';
import { getClasses, getRoster } from '../services/classApi.js';
import { generateDocumentAssist } from '../services/documentApi.js';
import type { IClassEnrollment, ICourseClass, IDocument, ISubject } from '../types/index.js';

const subjectOf = (courseClass: ICourseClass): ISubject | undefined => typeof courseClass.subjectId === 'string' ? undefined : courseClass.subjectId;
const scopeOf = (document: IDocument): string => document.visibility === 'class-restricted'
  ? (document.classIds ?? []).map((value) => typeof value === 'string' ? value : value.code).join(', ') || 'Chưa chọn lớp'
  : 'Toàn môn';

export const TeacherDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { state: authState } = useAuth();
  const { state: appState, dispatch, refreshDocuments } = useApp();
  const [classes, setClasses] = useState<ICourseClass[]>([]);
  const [selectedClass, setSelectedClass] = useState<ICourseClass | null>(null);
  const [roster, setRoster] = useState<IClassEnrollment[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => { void getClasses().then(setClasses); }, []);

  const openRoster = async (courseClass: ICourseClass) => {
    setSelectedClass(courseClass);
    setRoster(await getRoster(courseClass._id));
  };

  const documents = appState.documents as IDocument[];
  const statusLabel: Record<string, string> = {
    uploaded: 'Đã tải lên', processing: 'Đang xử lý', pending: 'Chờ admin duyệt', approved: 'Đã duyệt', rejected: 'Bị từ chối', failed: 'Xử lý lỗi',
  };

  return <div className="teacher-workspace">
    <section className="teacher-hero"><div><span>TEACHER WORKSPACE</span><h1>Chào {authState.user?.fullName || authState.user?.username}</h1><p>Quản lý lớp được phân công và phạm vi truy cập của từng tài liệu.</p></div><button className="btn-primary" onClick={() => dispatch({ type: 'SET_UPLOAD_MODAL', payload: true })}><span className="material-symbols-outlined">upload_file</span>Tải tài liệu</button></section>
    {message && <div className="teacher-message">{message}</div>}
    <div className="teacher-metrics"><article><strong>{classes.filter((item) => item.status === 'active').length}</strong><span>Lớp active</span></article><article><strong>{documents.filter((item) => item.status === 'approved').length}</strong><span>Tài liệu đã duyệt</span></article><article><strong>{documents.filter((item) => item.status === 'pending').length}</strong><span>Đang chờ duyệt</span></article><article><strong>{documents.filter((item) => item.status === 'rejected').length}</strong><span>Cần upload lại</span></article></div>

    <section className="teacher-section"><div className="teacher-title"><div><h2>Lớp được phân công</h2><p>Join code chỉ hiển thị cho admin và giảng viên của lớp.</p></div></div>
      <div className="teacher-class-grid">{classes.map((courseClass) => <article key={courseClass._id} className="teacher-class-card"><div><span className={`teacher-status ${courseClass.status}`}>{courseClass.status}</span><h3>{courseClass.code}</h3><p>{courseClass.name}</p><small>{subjectOf(courseClass)?.code} · {subjectOf(courseClass)?.name}</small></div><div className="join-code"><span>Join code</span><code>{courseClass.joinCode}</code></div><div className="teacher-actions"><button onClick={() => void openRoster(courseClass)}>Xem roster</button><button onClick={() => navigate(`/study/${subjectOf(courseClass)?._id ?? courseClass.subjectId}`)}>Vào môn học</button></div></article>)}</div>
      {classes.length === 0 && <div className="teacher-empty">Admin chưa phân công lớp active cho tài khoản này.</div>}
    </section>

    {selectedClass && <section className="teacher-section"><div className="teacher-title"><h2>Roster · {selectedClass.code}</h2><button onClick={() => setSelectedClass(null)}>Đóng</button></div><div className="roster-grid">{roster.map((item) => <div key={item._id}><strong>{item.studentId.fullName}</strong><span>{item.studentId.userCode}</span><small>{item.studentId.email}</small></div>)}</div>{roster.length === 0 && <p>Lớp chưa có sinh viên.</p>}</section>}

    <section className="teacher-section"><div className="teacher-title"><div><h2>Tài liệu của môn đang dạy</h2><p>Tài liệu mới sẽ chuyển sang pending sau khi xử lý xong.</p></div><button onClick={() => void refreshDocuments()}>Làm mới</button></div>
      <div className="teacher-table-wrap"><table><thead><tr><th>Tài liệu</th><th>Môn</th><th>Phạm vi</th><th>Trạng thái</th><th>Study assist</th></tr></thead><tbody>{documents.map((document) => <tr key={document._id}><td><strong>{document.originalName}</strong><small>Chương {document.chapter}: {document.chapterTitle}</small>{document.rejectionReason && <em>{document.rejectionReason}</em>}</td><td>{document.subject}</td><td>{scopeOf(document)}</td><td><span className={`doc-state ${document.status}`}>{statusLabel[document.status]}</span></td><td>{['pending', 'approved'].includes(document.status) ? <button disabled={busyId === document._id} onClick={() => { setBusyId(document._id); void generateDocumentAssist(document._id).then(() => setMessage('Đã tạo Study Assist cho tài liệu.')).catch((error) => setMessage(error instanceof Error ? error.message : 'Không thể tạo Study Assist.')).finally(() => setBusyId(null)); }}>{busyId === document._id ? 'Đang tạo...' : 'Tạo/cập nhật'}</button> : 'Không khả dụng'}</td></tr>)}</tbody></table></div>
    </section><TeacherStyle />
  </div>;
};

const TeacherStyle = () => <style>{`
.teacher-workspace{width:100%;padding:28px;max-width:1450px;margin:auto}.teacher-hero{padding:0 0 22px;border-bottom:1px solid var(--color-outline-variant);display:flex;justify-content:space-between;align-items:flex-end}.teacher-hero>div>span{font-size:11px;font-weight:700;letter-spacing:.08em;color:var(--color-primary)}.teacher-hero h1{font-size:28px;letter-spacing:-.03em;margin:4px 0}.teacher-hero p{color:var(--color-on-surface-variant)}.teacher-hero .btn-primary{display:flex;align-items:center;gap:7px}.teacher-message{margin:14px 0;padding:10px 13px;background:#f0fdf4;color:#166534;border:1px solid #dcfce7;border-radius:8px}.teacher-metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:18px 0}.teacher-metrics article,.teacher-section{background:#fff;border:1px solid var(--color-outline-variant);border-radius:12px;padding:18px;box-shadow:var(--shadow-sm)}.teacher-metrics strong{font-size:28px;letter-spacing:-.03em;color:#0f172a;display:block}.teacher-metrics span{color:var(--color-on-surface-variant)}.teacher-section{margin-top:14px}.teacher-title{display:flex;justify-content:space-between;align-items:center;margin-bottom:14px}.teacher-title h2{font-size:17px}.teacher-title p{color:var(--color-on-surface-variant);margin-top:3px}.teacher-title button,.teacher-actions button,.teacher-table-wrap button{min-height:34px;border:1px solid var(--color-outline-variant);background:white;border-radius:8px;padding:7px 10px;font-size:13px;font-weight:600;color:#334155}.teacher-title button:hover,.teacher-actions button:hover,.teacher-table-wrap button:hover{background:#f8fafc;border-color:#cbd5e1}.teacher-class-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.teacher-class-card{border:1px solid #e2e8f0;border-radius:10px;padding:15px;display:flex;flex-direction:column;gap:12px}.teacher-status{font-size:10px;font-weight:700;text-transform:uppercase;background:#f1f5f9;color:#475569;padding:3px 7px;border-radius:20px}.teacher-status.active{background:#f0fdf4;color:#166534}.join-code{display:flex;justify-content:space-between;align-items:center;background:#f8fafc;border:1px solid #eef2f7;padding:9px;border-radius:8px}.join-code code{font-size:17px;letter-spacing:2px}.teacher-actions{display:flex;gap:7px}.teacher-empty{padding:30px;text-align:center;color:#64748b}.roster-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.roster-grid div{background:#f8fafc;border:1px solid #eef2f7;padding:11px;border-radius:8px}.roster-grid span,.roster-grid small{display:block}.teacher-table-wrap{overflow:auto}td small,td em{display:block;color:#64748b;margin-top:4px}.doc-state{font-size:11px;font-weight:600;padding:4px 8px;border-radius:20px;background:#f1f5f9;color:#475569}.doc-state.approved{background:#f0fdf4;color:#166534}.doc-state.pending{background:#fffbeb;color:#92400e}.doc-state.rejected,.doc-state.failed{background:#fef2f2;color:#991b1b}@media(max-width:950px){.teacher-metrics,.teacher-class-grid,.roster-grid{grid-template-columns:1fr 1fr}.teacher-workspace{padding:18px}}@media(max-width:600px){.teacher-metrics,.teacher-class-grid,.roster-grid{grid-template-columns:1fr}.teacher-hero{align-items:flex-start;gap:16px;flex-direction:column}}
`}</style>;
