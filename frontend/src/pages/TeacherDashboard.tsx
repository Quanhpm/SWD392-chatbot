import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import { useApp } from '../context/AppContext.js';
import { getClasses, getRoster } from '../services/classApi.js';
import { generateDocumentAssist } from '../services/documentApi.js';
import type { IClassEnrollment, ICourseClass, IDocument, ISubject } from '../types/index.js';

const subjectOf = (courseClass: ICourseClass): ISubject | undefined => typeof courseClass.subjectId === 'string' ? undefined : courseClass.subjectId;

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
    <section className="teacher-hero"><div><span>TEACHER WORKSPACE</span><h1>Chào {authState.user?.fullName || authState.user?.username}</h1><p>Quản lý lớp được phân công và chuẩn bị tài liệu dùng chung cho môn học.</p></div><button className="btn-primary" onClick={() => dispatch({ type: 'SET_UPLOAD_MODAL', payload: true })}><span className="material-symbols-outlined">upload_file</span>Tải tài liệu</button></section>
    {message && <div className="teacher-message">{message}</div>}
    <div className="teacher-metrics"><article><strong>{classes.filter((item) => item.status === 'active').length}</strong><span>Lớp active</span></article><article><strong>{documents.filter((item) => item.status === 'approved').length}</strong><span>Tài liệu đã duyệt</span></article><article><strong>{documents.filter((item) => item.status === 'pending').length}</strong><span>Đang chờ duyệt</span></article><article><strong>{documents.filter((item) => item.status === 'rejected').length}</strong><span>Cần upload lại</span></article></div>

    <section className="teacher-section"><div className="teacher-title"><div><h2>Lớp được phân công</h2><p>Join code chỉ hiển thị cho admin và giảng viên của lớp.</p></div></div>
      <div className="teacher-class-grid">{classes.map((courseClass) => <article key={courseClass._id} className="teacher-class-card"><div><span className={`teacher-status ${courseClass.status}`}>{courseClass.status}</span><h3>{courseClass.code}</h3><p>{courseClass.name}</p><small>{subjectOf(courseClass)?.code} · {subjectOf(courseClass)?.name}</small></div><div className="join-code"><span>Join code</span><code>{courseClass.joinCode}</code></div><div className="teacher-actions"><button onClick={() => void openRoster(courseClass)}>Xem roster</button><button onClick={() => navigate(`/study/${subjectOf(courseClass)?._id ?? courseClass.subjectId}`)}>Vào môn học</button></div></article>)}</div>
      {classes.length === 0 && <div className="teacher-empty">Admin chưa phân công lớp active cho tài khoản này.</div>}
    </section>

    {selectedClass && <section className="teacher-section"><div className="teacher-title"><h2>Roster · {selectedClass.code}</h2><button onClick={() => setSelectedClass(null)}>Đóng</button></div><div className="roster-grid">{roster.map((item) => <div key={item._id}><strong>{item.studentId.fullName}</strong><span>{item.studentId.userCode}</span><small>{item.studentId.email}</small></div>)}</div>{roster.length === 0 && <p>Lớp chưa có sinh viên.</p>}</section>}

    <section className="teacher-section"><div className="teacher-title"><div><h2>Tài liệu của môn đang dạy</h2><p>Tài liệu mới sẽ chuyển sang pending sau khi xử lý xong.</p></div><button onClick={() => void refreshDocuments()}>Làm mới</button></div>
      <div className="teacher-table-wrap"><table><thead><tr><th>Tài liệu</th><th>Môn</th><th>Trạng thái</th><th>Study assist</th></tr></thead><tbody>{documents.map((document) => <tr key={document._id}><td><strong>{document.originalName}</strong><small>Chương {document.chapter}: {document.chapterTitle}</small>{document.rejectionReason && <em>{document.rejectionReason}</em>}</td><td>{document.subject}</td><td><span className={`doc-state ${document.status}`}>{statusLabel[document.status]}</span></td><td>{['pending', 'approved'].includes(document.status) ? <button disabled={busyId === document._id} onClick={() => { setBusyId(document._id); void generateDocumentAssist(document._id).then(() => setMessage('Đã tạo Study Assist cho tài liệu.')).catch((error) => setMessage(error instanceof Error ? error.message : 'Không thể tạo Study Assist.')).finally(() => setBusyId(null)); }}>{busyId === document._id ? 'Đang tạo...' : 'Tạo/cập nhật'}</button> : 'Không khả dụng'}</td></tr>)}</tbody></table></div>
    </section><TeacherStyle />
  </div>;
};

const TeacherStyle = () => <style>{`
.teacher-workspace{padding:32px;max-width:1450px;margin:auto}.teacher-hero{padding:32px;border-radius:22px;background:linear-gradient(130deg,#00236f,#4059aa);color:white;display:flex;justify-content:space-between;align-items:center}.teacher-hero span{font-size:12px;letter-spacing:2px}.teacher-hero h1{font-size:32px;margin:7px 0}.teacher-hero .btn-primary{display:flex;align-items:center;gap:8px;background:#fff;color:#00236f}.teacher-message{margin:14px 0;padding:12px 16px;background:#dff7f2;border-radius:10px}.teacher-metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:15px;margin:20px 0}.teacher-metrics article,.teacher-section{background:#fff;border:1px solid #e1e5ee;border-radius:16px;padding:20px}.teacher-metrics strong{font-size:30px;color:#00236f;display:block}.teacher-metrics span{color:#666}.teacher-section{margin-top:18px}.teacher-title{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px}.teacher-title p{color:#666;margin-top:3px}.teacher-title button,.teacher-actions button,.teacher-table-wrap button{border:1px solid #c5c5d3;background:white;border-radius:8px;padding:8px 11px}.teacher-class-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}.teacher-class-card{border:1px solid #dce2ec;border-radius:14px;padding:16px;display:flex;flex-direction:column;gap:14px}.teacher-status{font-size:11px;text-transform:uppercase;background:#eee;padding:4px 7px;border-radius:20px}.teacher-status.active{background:#dff7f2;color:#006a61}.join-code{display:flex;justify-content:space-between;align-items:center;background:#eff4ff;padding:10px;border-radius:9px}.join-code code{font-size:18px;letter-spacing:2px}.teacher-actions{display:flex;gap:8px}.teacher-empty{padding:30px;text-align:center;color:#666}.roster-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.roster-grid div{background:#f5f7fb;padding:12px;border-radius:10px}.roster-grid span,.roster-grid small{display:block}.teacher-table-wrap{overflow:auto}table{width:100%;border-collapse:collapse}th,td{text-align:left;padding:12px;border-bottom:1px solid #eee}td small,td em{display:block;color:#666;margin-top:4px}.doc-state{font-size:12px;padding:5px 8px;border-radius:20px;background:#eee}.doc-state.approved{background:#dff7f2;color:#006a61}.doc-state.pending{background:#fff1c6;color:#795900}.doc-state.rejected,.doc-state.failed{background:#ffdad6;color:#93000a}@media(max-width:950px){.teacher-metrics,.teacher-class-grid,.roster-grid{grid-template-columns:1fr 1fr}.teacher-workspace{padding:18px}}@media(max-width:600px){.teacher-metrics,.teacher-class-grid,.roster-grid{grid-template-columns:1fr}.teacher-hero{align-items:flex-start;gap:20px}}
`}</style>;
