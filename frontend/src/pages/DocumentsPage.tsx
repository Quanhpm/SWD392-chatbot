import React, { useState } from 'react';
import { useApp } from '../context/AppContext.js';
import { useAuth } from '../context/AuthContext.js';
import { DocumentList } from '../components/documents/DocumentList.js';

export const DocumentsPage: React.FC = () => {
  const { state } = useApp();
  const { state: authState } = useAuth();
  const [activeSubject, setActiveSubject] = useState<string | null>(null);
  const isTeacher = authState.user?.role === 'teacher';

  return <div className="documents-page-container"><div className="page-header"><div><span>{isTeacher ? 'TEACHER LIBRARY' : 'STUDENT LIBRARY'}</span><h1>Tài liệu môn học</h1><p>{isTeacher ? 'Tài liệu tự động công bố khi xử lý thành công; bạn quản lý các tài liệu do mình upload.' : 'Toàn bộ tài liệu sẵn sàng trong các môn học đang hoạt động.'}</p></div></div>
    <div className="subject-chips-row"><button className={!activeSubject ? 'active' : ''} onClick={() => setActiveSubject(null)}>Tất cả</button>{state.subjects.map((subject) => <button key={subject._id} className={activeSubject === subject.name ? 'active' : ''} onClick={() => setActiveSubject(subject.name)}>{subject.code} · {subject.name}</button>)}</div>
    <div className="page-content-card"><DocumentList subjectFilter={activeSubject ?? undefined} canManage={isTeacher} /></div>
    <style>{`.documents-page-container{width:100%;padding:28px;max-width:1320px;margin:auto}.page-header{padding:0 0 20px;border-bottom:1px solid var(--color-outline-variant)}.page-header span{font-size:11px;font-weight:700;letter-spacing:.08em;color:var(--color-primary)}.page-header h1{font-size:26px;letter-spacing:-.025em;margin:5px 0}.page-header p{max-width:720px;color:var(--color-on-surface-variant)}.subject-chips-row{display:flex;gap:7px;flex-wrap:wrap;margin:18px 0}.subject-chips-row button{min-height:34px;border:1px solid var(--color-outline-variant);background:#fff;padding:7px 11px;border-radius:8px;color:#475569;font-size:13px}.subject-chips-row button:hover{background:#f8fafc;border-color:#cbd5e1}.subject-chips-row button.active{background:#0f172a;color:#fff;border-color:#0f172a}.page-content-card{background:#fff;border:1px solid var(--color-outline-variant);border-radius:12px;padding:18px;box-shadow:var(--shadow-sm)}@media(max-width:650px){.documents-page-container{padding:18px}.page-content-card{padding:14px}}`}</style>
  </div>;
};
