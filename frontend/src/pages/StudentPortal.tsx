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
.student-portal{padding:32px;max-width:1400px;margin:auto}.student-hero{background:linear-gradient(125deg,#003c36,#006a61);color:#fff;padding:34px;border-radius:22px;display:flex;justify-content:space-between;align-items:center;gap:25px}.student-hero>div>span{font-size:12px;letter-spacing:2px;color:#86f2e4}.student-hero h1{font-size:31px;margin:7px 0}.student-hero form{display:flex;background:white;padding:6px;border-radius:12px;min-width:360px}.student-hero input{flex:1;padding:10px;color:#0b1c30;text-transform:uppercase;letter-spacing:1px}.student-hero button{background:#00236f;color:#fff;padding:10px 14px;border-radius:8px}.student-message{margin:14px 0;padding:12px 16px;background:#dff7f2;color:#005047;border-radius:10px}.student-section{margin-top:24px}.student-title{display:flex;justify-content:space-between;align-items:center;margin-bottom:13px}.student-title>span{color:#666}.subject-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}.subject-card{text-align:left;background:#fff;border:1px solid #e1e5ee;border-radius:16px;padding:20px;transition:.2s}.subject-card:hover{transform:translateY(-3px);box-shadow:var(--shadow-md)}.subject-icon{width:42px;height:42px;border-radius:12px;background:#dff7f2;color:#006a61;display:grid;place-items:center;margin-bottom:14px}.subject-card>strong{font-size:12px;color:#006a61}.subject-card h3{font-size:19px;margin:5px 0}.subject-card p{color:#666;min-height:40px}.open-label{display:flex;align-items:center;gap:5px;color:#00236f;font-weight:600;margin-top:15px}.class-list{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}.class-list article{background:#fff;border:1px solid #e1e5ee;border-radius:14px;padding:17px;display:flex;justify-content:space-between;align-items:center}.class-list p,.class-list small{color:#666;margin-top:4px}.active-label{background:#dff7f2;color:#006a61;padding:6px 10px;border-radius:20px;font-size:12px}.student-empty{background:#fff;border:1px dashed #bbb;border-radius:14px;padding:35px;text-align:center;color:#666}@media(max-width:900px){.student-hero{align-items:flex-start}.student-hero form{min-width:300px}.subject-grid{grid-template-columns:1fr 1fr}}@media(max-width:650px){.student-portal{padding:18px}.student-hero{flex-direction:column}.student-hero form{min-width:100%;width:100%}.subject-grid,.class-list{grid-template-columns:1fr}}
`}</style>;
