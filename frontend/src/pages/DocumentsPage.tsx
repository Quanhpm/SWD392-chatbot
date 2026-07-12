import React, { useState } from 'react';
import { useApp } from '../context/AppContext.js';
import { useAuth } from '../context/AuthContext.js';
import { DocumentList } from '../components/documents/DocumentList.js';

export const DocumentsPage: React.FC = () => {
  const { state } = useApp();
  const { state: authState } = useAuth();
  const [activeSubject, setActiveSubject] = useState<string | null>(null);
  const isTeacher = authState.user?.role === 'teacher';

  return <div className="documents-page-container"><div className="page-header"><div><span className="page-eyebrow"><span className="material-symbols-outlined">library_books</span>{isTeacher ? 'Teacher library' : 'Student library'}</span><h1>Tài liệu môn học</h1><p>{isTeacher ? 'Tài liệu tự động công bố khi xử lý thành công; bạn quản lý các tài liệu do mình upload.' : 'Toàn bộ tài liệu sẵn sàng trong các môn học đang hoạt động.'}</p></div><div className="documents-header-stat"><span className="material-symbols-outlined">inventory_2</span><strong>{state.documents.length}</strong><small>Tổng tài liệu</small></div></div>
    <div className="subject-chips-row"><button className={!activeSubject ? 'active' : ''} onClick={() => setActiveSubject(null)}>Tất cả</button>{state.subjects.map((subject) => <button key={subject._id} className={activeSubject === subject.name ? 'active' : ''} onClick={() => setActiveSubject(subject.name)}>{subject.code} · {subject.name}</button>)}</div>
    <div className="page-content-card"><DocumentList subjectFilter={activeSubject ?? undefined} canManage={isTeacher} /></div>
    <style>{`.documents-page-container{width:100%;max-width:1340px;margin:auto;padding:36px 40px 48px}.page-header{display:flex;align-items:center;justify-content:space-between;gap:24px;padding:0 0 26px;border-bottom:1px solid var(--color-outline-variant)}.page-header h1{font-size:32px;letter-spacing:-.04em;margin:10px 0 8px}.page-header p{max-width:720px;color:var(--color-on-surface-variant);line-height:1.6}.documents-header-stat{display:grid;grid-template-columns:auto auto;column-gap:10px;align-items:center;padding:13px 16px;border:1px solid #dfe5ff;border-radius:14px;background:#f7f8ff;color:#4338ca}.documents-header-stat .material-symbols-outlined{grid-row:span 2;font-size:23px}.documents-header-stat strong{font-size:22px;line-height:1}.documents-header-stat small{grid-column:2;color:#64748b;font-size:11px}.subject-chips-row{display:flex;gap:8px;flex-wrap:wrap;margin:22px 0 16px}.subject-chips-row button{min-height:36px;border:1px solid var(--color-outline-variant);background:#fff;padding:8px 13px;border-radius:10px;color:#475569;font-size:12px;font-weight:600;transition:all var(--transition-fast)}.subject-chips-row button:hover{background:#f8faff;border-color:#a5b4fc;color:#4338ca}.subject-chips-row button.active{background:#312e81;color:#fff;border-color:#312e81;box-shadow:0 5px 12px rgb(49 46 129 / .15)}.page-content-card{background:#fff;border:1px solid var(--color-outline-variant);border-radius:16px;padding:22px;box-shadow:var(--shadow-sm)}@media(max-width:700px){.documents-page-container{padding:26px 18px 34px}.page-header{align-items:flex-start}.documents-header-stat{display:none}.page-content-card{padding:15px}}`}</style>
  </div>;
};
