import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext.js';

export const StudentPortal: React.FC = () => {
  const { state } = useApp();
  const navigate = useNavigate();
  return <div className="portal-page">
    <header><span>STUDENT PORTAL</span><h1>Môn học của bạn</h1><p>Tất cả môn học đang hoạt động đều sẵn sàng—không cần mã tham gia hay mật khẩu môn.</p></header>
    <section className="portal-stats"><article><strong>{state.subjects.length}</strong><small>Môn học</small></article><article><strong>{state.documents.filter((doc) => doc.status === 'ready').length}</strong><small>Tài liệu sẵn sàng</small></article><article><strong>{state.sessions.length}</strong><small>Phiên hỏi đáp</small></article></section>
    <section className="subject-grid">{state.subjects.map((subject) => { const count = state.documents.filter((doc) => doc.subjectId === subject._id || doc.subject === subject.name).filter((doc) => doc.status === 'ready').length; return <button key={subject._id} className="subject-card" onClick={() => navigate(`/study/${subject._id}`)}><div><span>{subject.code}</span><h2>{subject.name}</h2><p>{subject.description || 'Chưa có mô tả môn học.'}</p></div><footer><small>{count} tài liệu</small><span className="material-symbols-outlined">arrow_forward</span></footer></button>; })}</section>
    {state.subjects.length === 0 && <div className="portal-empty">Chưa có môn học nào đang hoạt động.</div>}
    <style>{`.portal-page{width:100%;max-width:1200px;margin:auto;padding:28px}.portal-page header{border-bottom:1px solid var(--color-outline-variant);padding-bottom:20px}.portal-page header>span{font-size:11px;font-weight:700;letter-spacing:.08em;color:var(--color-primary)}.portal-page h1{font-size:28px;margin:5px 0}.portal-page header p{color:var(--color-on-surface-variant)}.portal-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:18px 0}.portal-stats article,.subject-card{background:#fff;border:1px solid var(--color-outline-variant);border-radius:12px;padding:18px;text-align:left}.portal-stats strong{display:block;font-size:27px}.portal-stats small{color:#64748b}.subject-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.subject-card{display:flex;flex-direction:column;justify-content:space-between;min-height:190px;transition:.15s}.subject-card:hover{border-color:#93c5fd;transform:translateY(-2px);box-shadow:var(--shadow-md)}.subject-card>div>span{font-size:11px;font-weight:700;color:var(--color-primary)}.subject-card h2{font-size:18px;margin:6px 0}.subject-card p{color:#64748b;line-height:1.55}.subject-card footer{display:flex;align-items:center;justify-content:space-between;color:#475569}.portal-empty{padding:48px;text-align:center;color:#64748b}@media(max-width:850px){.subject-grid{grid-template-columns:1fr 1fr}}@media(max-width:560px){.portal-page{padding:18px}.portal-stats,.subject-grid{grid-template-columns:1fr}}`}</style>
  </div>;
};
