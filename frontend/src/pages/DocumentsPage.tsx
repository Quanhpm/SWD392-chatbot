import React, { useState } from 'react';
import { useApp } from '../context/AppContext.js';
import { useAuth } from '../context/AuthContext.js';
import { DocumentList } from '../components/documents/DocumentList.js';

export const DocumentsPage: React.FC = () => {
  const { state } = useApp();
  const { state: authState } = useAuth();
  const [activeSubject, setActiveSubject] = useState<string | null>(null);
  const isTeacher = authState.user?.role === 'teacher';

  return <div className="documents-page-container"><div className="page-header"><div><span>{isTeacher ? 'TEACHER LIBRARY' : 'STUDENT LIBRARY'}</span><h1>Tài liệu môn học</h1><p>{isTeacher ? 'Theo dõi tài liệu dùng chung, trạng thái xử lý và kết quả duyệt của admin.' : 'Chỉ tài liệu đã được admin duyệt mới xuất hiện tại đây.'}</p></div></div>
    <div className="subject-chips-row"><button className={!activeSubject ? 'active' : ''} onClick={() => setActiveSubject(null)}>Tất cả</button>{state.subjects.map((subject) => <button key={subject._id} className={activeSubject === subject.name ? 'active' : ''} onClick={() => setActiveSubject(subject.name)}>{subject.code} · {subject.name}</button>)}</div>
    <div className="page-content-card"><DocumentList subjectFilter={activeSubject ?? undefined} canManage={isTeacher} /></div>
    <style>{`.documents-page-container{padding:32px;max-width:1300px;margin:auto}.page-header{background:#fff;border:1px solid #e1e5ee;border-radius:18px;padding:24px}.page-header span{font-size:12px;letter-spacing:2px;color:#006a61}.page-header h1{font-size:30px;margin:6px 0}.page-header p{color:#666}.subject-chips-row{display:flex;gap:8px;flex-wrap:wrap;margin:18px 0}.subject-chips-row button{border:1px solid #c5c5d3;background:#fff;padding:8px 13px;border-radius:20px}.subject-chips-row button.active{background:#00236f;color:#fff;border-color:#00236f}.page-content-card{background:#fff;border:1px solid #e1e5ee;border-radius:16px;padding:20px}@media(max-width:650px){.documents-page-container{padding:18px}}`}</style>
  </div>;
};
