import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useApp } from '../context/AppContext.js';
import { useAuth } from '../context/AuthContext.js';
import { useChat } from '../context/ChatContext.js';
import { useChatSession } from '../hooks/useChatSession.js';
import { getDocumentChunks, getDocumentFileBlob } from '../services/documentApi.js';
import { getCurrentQuota } from '../services/subscriptionApi.js';
import { ChatMessageList } from '../components/chat/ChatMessageList.js';
import { ChatInput } from '../components/chat/ChatInput.js';
import { QuotaIndicator } from '../components/chat/QuotaIndicator.js';
import type { IChunk, IDocument, IQuotaStatus } from '../types/index.js';

export const StudyPage: React.FC = () => {
  const { subjectId } = useParams<{ subjectId: string }>();
  const navigate = useNavigate();
  const { state, dispatch } = useApp();
  const { state: auth } = useAuth();
  const { dispatch: chatDispatch } = useChat();
  const { messages, isLoading, error, postMessage } = useChatSession();
  const subject = state.subjects.find((item) => item._id === subjectId);
  const documents = useMemo(() => state.documents.filter((doc) => doc.status === 'ready' && (doc.subjectId === subjectId || doc.subject === subject?.name)), [state.documents, subjectId, subject?.name]);
  const [selected, setSelected] = useState<IDocument | null>(null);
  const [chunks, setChunks] = useState<IChunk[]>([]);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [loadingReader, setLoadingReader] = useState(false);
  const [quota, setQuota] = useState<IQuotaStatus | null>(null);

  const refreshQuota = useCallback(async () => {
    if (auth.user?.role === 'admin') return;
    try { setQuota(await getCurrentQuota()); } catch { setQuota(null); }
  }, [auth.user?.role]);

  const openDocument = useCallback(async (document: IDocument) => {
    setSelected(document); setLoadingReader(true); setChunks([]);
    dispatch({ type: 'SET_ACTIVE_SESSION', payload: null }); chatDispatch({ type: 'CLEAR_CHAT' });
    if (fileUrl) URL.revokeObjectURL(fileUrl); setFileUrl(null);
    try {
      const nextChunks = await getDocumentChunks(document._id); setChunks(nextChunks);
      if (document.fileType === 'pdf') setFileUrl(await getDocumentFileBlob(document._id));
    } finally { setLoadingReader(false); }
  }, [dispatch, chatDispatch, fileUrl]);

  useEffect(() => { if (!selected && documents[0]) void openDocument(documents[0]); }, [documents, selected, openDocument]);
  useEffect(() => { void refreshQuota(); }, [refreshQuota]);
  useEffect(() => () => { if (fileUrl) URL.revokeObjectURL(fileUrl); }, [fileUrl]);

  if (!subject) return <div className="study-missing"><h2>Không tìm thấy môn học</h2><button onClick={() => navigate('/')}>Quay lại</button></div>;

  const send = async (text: string) => { if (!selected) return; const next = await postMessage(text, selected._id); if (next) setQuota(next); else await refreshQuota(); };

  return <div className="study-page">
    <aside className="study-nav"><button className="back" onClick={() => navigate(-1)}><span className="material-symbols-outlined">arrow_back</span>Quay lại</button><div className="subject-title"><span>{subject.code}</span><h2>{subject.name}</h2><p>{subject.description}</p></div><div className="document-menu"><small>TÀI LIỆU</small>{documents.map((doc) => <button className={selected?._id === doc._id ? 'active' : ''} key={doc._id} onClick={() => void openDocument(doc)}><span className="material-symbols-outlined">{doc.fileType === 'pdf' ? 'picture_as_pdf' : 'description'}</span><span><strong>Chương {doc.chapter}</strong>{doc.chapterTitle}</span></button>)}{documents.length === 0 && <p>Chưa có tài liệu sẵn sàng.</p>}</div></aside>
    <main className="reader"><header>{selected ? <><div><span>CHƯƠNG {selected.chapter}</span><h1>{selected.chapterTitle}</h1><p>{selected.originalName} · {selected.totalChunks} đoạn kiến thức</p></div></> : <h1>Chọn tài liệu</h1>}</header><div className="reader-body">{loadingReader ? <div className="reader-state"><span className="spinner"/></div> : selected?.fileType === 'pdf' && fileUrl ? <iframe src={fileUrl} title={selected.originalName}/> : chunks.length ? <article><h1>{selected?.chapterTitle}</h1>{chunks.map((chunk) => <section key={chunk.chunkIndex}><p>{chunk.content}</p></section>)}</article> : <div className="reader-state">Chưa có nội dung để đọc.</div>}</div></main>
    <aside className="qa-panel"><header><div><span className="material-symbols-outlined">psychology</span><div><strong>Hỏi đáp tài liệu</strong><small>Chỉ trả lời từ tài liệu đang chọn</small></div></div></header><QuotaIndicator quota={quota}/><ChatMessageList messages={messages} isLoading={isLoading} onSuggestClick={(text) => void send(text)}/>{error && <div className="qa-error">{error}</div>}<ChatInput onSend={(text) => void send(text)} disabled={!selected || isLoading || Boolean(quota && quota.remaining <= 0)} /></aside>
    <style>{`.study-page{height:100vh;display:grid;grid-template-columns:250px minmax(0,1fr) 390px;background:#f8fafc}.study-nav,.qa-panel{background:#fff;min-height:0;display:flex;flex-direction:column}.study-nav{border-right:1px solid #e2e8f0;padding:16px}.back{display:flex;align-items:center;gap:6px;color:#475569;padding:7px 0}.subject-title{padding:18px 0;border-bottom:1px solid #eef2f7}.subject-title>span,.reader header span{font-size:10px;font-weight:700;letter-spacing:.08em;color:#2563eb}.subject-title h2{font-size:18px;margin:5px 0}.subject-title p{font-size:12px;color:#64748b;line-height:1.5}.document-menu{padding-top:16px;display:flex;flex-direction:column;gap:5px;overflow:auto}.document-menu>small{font-size:10px;color:#94a3b8;margin-bottom:5px}.document-menu button{display:flex;gap:9px;text-align:left;padding:10px;border-radius:8px;color:#475569}.document-menu button.active{background:#eff6ff;color:#1d4ed8}.document-menu button>span:last-child{display:flex;flex-direction:column;font-size:12px}.reader{min-width:0;display:flex;flex-direction:column}.reader header{background:#fff;border-bottom:1px solid #e2e8f0;padding:16px 24px}.reader h1{font-size:21px;margin:3px 0}.reader header p{font-size:12px;color:#64748b}.reader-body{min-height:0;flex:1;overflow:auto;padding:24px}.reader-body iframe{width:100%;height:100%;border:1px solid #e2e8f0;border-radius:10px;background:#fff}.reader-body article{max-width:820px;margin:auto;background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:42px 48px;box-shadow:var(--shadow-sm)}.reader-body article h1{font-size:27px;margin-bottom:25px}.reader-body article section p{white-space:pre-wrap;line-height:1.8;color:#334155;margin:0 0 18px}.reader-state{height:100%;display:grid;place-items:center;color:#64748b}.qa-panel{border-left:1px solid #e2e8f0}.qa-panel>header{padding:14px 17px;border-bottom:1px solid #e2e8f0}.qa-panel>header>div{display:flex;gap:9px;align-items:center}.qa-panel header strong,.qa-panel header small{display:block}.qa-panel header small{font-size:11px;color:#64748b}.qa-panel .chat-message-list{flex:1;min-height:0}.qa-error{margin:8px 14px;padding:8px;background:#fef2f2;color:#b91c1c;border-radius:7px;font-size:12px}.study-missing{padding:40px}@media(max-width:1050px){.study-page{grid-template-columns:210px minmax(0,1fr) 330px}}@media(max-width:800px){.study-page{height:auto;min-height:100vh;grid-template-columns:1fr}.study-nav{display:none}.reader{min-height:60vh}.qa-panel{min-height:70vh}.reader-body{padding:12px}.reader-body article{padding:25px 20px}}`}</style>
  </div>;
};
