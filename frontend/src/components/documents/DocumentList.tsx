import React, { useState } from 'react';
import { useDocuments } from '../../hooks/useDocuments.js';
import { useApp } from '../../context/AppContext.js';
import { DocumentCard } from './DocumentCard.js';

interface DocumentListProps { subjectFilter?: string; canManage?: boolean }

export const DocumentList: React.FC<DocumentListProps> = ({ subjectFilter, canManage = false }) => {
  const { documents, removeDocument } = useDocuments();
  const { dispatch } = useApp();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const filteredDocs = documents.filter((doc) => (!subjectFilter || doc.subject === subjectFilter) && (statusFilter === 'all' || doc.status === statusFilter) && `${doc.originalName} ${doc.chapterTitle}`.toLowerCase().includes(search.toLowerCase()));

  return <div className="document-list-container"><div className="document-filters"><input placeholder="Tìm tài liệu..." value={search} onChange={(e) => setSearch(e.target.value)} /><select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}><option value="all">Tất cả trạng thái</option><option value="uploaded">Uploaded</option><option value="processing">Processing</option><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option><option value="failed">Failed</option></select>{canManage && <button className="btn-primary" onClick={() => dispatch({ type: 'SET_UPLOAD_MODAL', payload: true })}>Upload tài liệu</button>}</div>
    {filteredDocs.length ? <div className="table-responsive"><table className="documents-table"><thead><tr><th>Tài liệu</th><th>Môn học</th><th>Chương</th><th>Trạng thái</th><th>Chunks</th><th>Ngày tải</th>{canManage && <th />}</tr></thead><tbody>{filteredDocs.map((doc) => <DocumentCard key={doc._id} document={doc} canManage={canManage} onDelete={(id) => { if (confirm('Xóa tài liệu này?')) void removeDocument(id); }} />)}</tbody></table></div> : <div className="document-empty">Không có tài liệu phù hợp.</div>}
    <style>{`.document-list-container{display:flex;flex-direction:column;gap:14px}.document-filters{display:flex;gap:8px;align-items:center}.document-filters input,.document-filters select{min-height:38px;border:1px solid var(--color-outline-variant);padding:8px 11px;border-radius:8px;background:#fff;color:#334155}.document-filters input:focus,.document-filters select:focus{border-color:var(--color-primary);box-shadow:0 0 0 3px rgb(37 99 235/.1)}.document-filters input{flex:1}.table-responsive{overflow:auto}.documents-table{width:100%;border-collapse:collapse}.documents-table th{text-align:left;padding:11px 12px;background:#f8fafc;color:#64748b}.document-empty{padding:42px;text-align:center;color:#64748b}@media(max-width:650px){.document-filters{align-items:stretch;flex-direction:column}}`}</style>
  </div>;
};
