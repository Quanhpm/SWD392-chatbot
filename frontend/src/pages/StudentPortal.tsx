import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import { getClasses, joinClass } from '../services/classApi.js';
import type { ICourseClass, ISubject } from '../types/index.js';

const subjectOf = (courseClass: ICourseClass): ISubject | undefined => typeof courseClass.subjectId === 'string' ? undefined : courseClass.subjectId;

export const StudentPortal: React.FC = () => {
  const navigate = useNavigate();
  const { state: authState } = useAuth();
  const [classes, setClasses] = useState<ICourseClass[]>([]);
  const [joinCode, setJoinCode] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);

  const load = async () => setClasses(await getClasses());
  useEffect(() => { void load(); }, []);
  const enrolledClasses = classes.filter((item) => item.enrolled);
  const joinableClasses = classes.filter((item) => !item.enrolled && item.allowSelfEnrollment);
  const subjects = useMemo(() => Array.from(new Map(enrolledClasses.map((item) => {
    const subject = subjectOf(item);
    return [subject?._id ?? String(item.subjectId), subject];
  })).values()).filter(Boolean) as ISubject[], [classes]);

  const handleJoin = async (event: React.FormEvent) => {
    event.preventDefault(); setJoining(true); setMessage(null);
    try { await joinClass(joinCode); setJoinCode(''); setMessage('Tham gia lớp thành công.'); await load(); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Không thể tham gia lớp.'); }
    finally { setJoining(false); }
  };

  return <div className="student-portal"><section className="student-hero"><div><span>STUDENT PORTAL</span><h1>Xin chào, {authState.user?.fullName || authState.user?.username}</h1><p>Vào lớp bằng mã do giảng viên chia sẻ, sau đó học từ tài liệu đã được admin duyệt.</p></div><form onSubmit={handleJoin}><input maxLength={12} required placeholder="Nhập join code" value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase())}/><button disabled={joining}>{joining ? 'Đang tham gia...' : 'Tham gia lớp'}</button></form></section>
    {message && <div className="student-message">{message}</div>}
    <section className="student-section"><div className="student-title"><h2>Môn học của tôi</h2><span>{subjects.length} môn</span></div><div className="subject-grid">{subjects.map((subject) => <button key={subject._id} className="subject-card" onClick={() => navigate(`/study/${subject._id}`)}><div className="subject-icon"><span className="material-symbols-outlined">auto_stories</span></div><strong>{subject.code}</strong><h3>{subject.name}</h3><p>{subject.description || 'Tài liệu dùng chung của môn học.'}</p><span className="open-label">Vào học <span className="material-symbols-outlined">arrow_forward</span></span></button>)}</div>{subjects.length === 0 && <div className="student-empty">Bạn chưa tham gia lớp active nào.</div>}</section>
    <section className="student-section"><div className="student-title"><h2>Lớp đã tham gia</h2><span>{enrolledClasses.length} lớp</span></div><div className="class-list">{enrolledClasses.map((courseClass) => <article key={courseClass._id}><div><strong>{courseClass.code}</strong><h3>{courseClass.name}</h3><p>{subjectOf(courseClass)?.code} · {subjectOf(courseClass)?.name}</p></div><span className="active-label">Đang học</span></article>)}</div></section>
    {joinableClasses.length > 0 && <section className="student-section"><div className="student-title"><h2>Lớp đang mở tự đăng ký</h2></div><div className="class-list">{joinableClasses.map((courseClass) => <article key={courseClass._id}><div><strong>{courseClass.code}</strong><h3>{courseClass.name}</h3><p>{subjectOf(courseClass)?.name}</p></div><small>Cần join code để tham gia</small></article>)}</div></section>}<StudentStyle />
  </div>;
};

const StudentStyle = () => <style>{`
.student-portal{width:100%;padding:28px;max-width:1400px;margin:auto}.student-hero{padding:0 0 22px;border-bottom:1px solid var(--color-outline-variant);display:flex;justify-content:space-between;align-items:flex-end;gap:24px}.student-hero>div>span{font-size:11px;font-weight:700;letter-spacing:.08em;color:var(--color-primary)}.student-hero h1{font-size:28px;letter-spacing:-.03em;margin:4px 0}.student-hero p{color:var(--color-on-surface-variant)}.student-hero form{display:flex;background:white;padding:4px;border:1px solid var(--color-outline-variant);border-radius:10px;min-width:350px}.student-hero form:focus-within{border-color:var(--color-primary);box-shadow:0 0 0 3px rgb(37 99 235/.1)}.student-hero input{min-width:0;flex:1;padding:8px;color:#0f172a;text-transform:uppercase;letter-spacing:1px}.student-hero button{background:var(--color-primary);color:#fff;padding:8px 12px;border-radius:7px;font-size:13px;font-weight:600}.student-message{margin:14px 0;padding:10px 13px;background:#f0fdf4;color:#166534;border:1px solid #dcfce7;border-radius:8px}.student-section{margin-top:22px}.student-title{display:flex;justify-content:space-between;align-items:center;margin-bottom:11px}.student-title h2{font-size:17px}.student-title>span{color:var(--color-on-surface-variant)}.subject-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.subject-card{text-align:left;background:#fff;border:1px solid var(--color-outline-variant);border-radius:12px;padding:18px;transition:border-color .15s,box-shadow .15s}.subject-card:hover{border-color:#93c5fd;box-shadow:var(--shadow-md)}.subject-icon{width:38px;height:38px;border-radius:9px;background:#eff6ff;color:#2563eb;display:grid;place-items:center;margin-bottom:13px}.subject-icon .material-symbols-outlined{font-size:20px}.subject-card>strong{font-size:11px;color:#2563eb;letter-spacing:.04em}.subject-card h3{font-size:17px;margin:4px 0}.subject-card p{color:var(--color-on-surface-variant);min-height:40px}.open-label{display:flex;align-items:center;gap:5px;color:#1d4ed8;font-weight:600;margin-top:13px;font-size:13px}.open-label .material-symbols-outlined{font-size:16px}.class-list{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}.class-list article{background:#fff;border:1px solid var(--color-outline-variant);border-radius:10px;padding:15px;display:flex;justify-content:space-between;align-items:center}.class-list p,.class-list small{color:var(--color-on-surface-variant);margin-top:4px}.active-label{background:#f0fdf4;color:#166534;border:1px solid #dcfce7;padding:4px 8px;border-radius:20px;font-size:11px;font-weight:600}.student-empty{background:#fff;border:1px dashed #cbd5e1;border-radius:10px;padding:32px;text-align:center;color:#64748b}@media(max-width:900px){.student-hero{align-items:flex-start}.student-hero form{min-width:300px}.subject-grid{grid-template-columns:1fr 1fr}}@media(max-width:650px){.student-portal{padding:18px}.student-hero{flex-direction:column}.student-hero form{min-width:100%;width:100%}.subject-grid,.class-list{grid-template-columns:1fr}}
`}</style>;
