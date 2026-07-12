import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import { requestPasswordReset, resetPasswordWithCode } from '../services/authApi.js';

type ResetStep = 'login' | 'request' | 'reset';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<ResetStep>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const run = async (action: () => Promise<void>) => {
    if (loading) return;
    setLoading(true); setError(null); setNotice(null);
    try { await action(); } catch (err) { setError(err instanceof Error ? err.message : 'Có lỗi xảy ra.'); } finally { setLoading(false); }
  };

  const submitLogin = (event: React.FormEvent) => {
    event.preventDefault();
    void run(async () => { await login(username, password); navigate('/', { replace: true }); });
  };

  const submitRequest = (event: React.FormEvent) => {
    event.preventDefault();
    void run(async () => {
      const message = await requestPasswordReset(username);
      setNotice(message); setStep('reset');
    });
  };

  const submitReset = (event: React.FormEvent) => {
    event.preventDefault();
    if (newPassword.length < 6) { setError('Mật khẩu mới phải có ít nhất 6 ký tự.'); return; }
    void run(async () => {
      const message = await resetPasswordWithCode(username, code, newPassword);
      setNotice(message); setPassword(''); setNewPassword(''); setCode(''); setStep('login');
    });
  };

  const heading = step === 'login' ? ['WELCOME BACK', 'Chào mừng trở lại', 'Đăng nhập để tiếp tục hành trình học tập của bạn.']
    : step === 'request' ? ['PASSWORD RECOVERY', 'Quên mật khẩu?', 'Nhập tên đăng nhập, chúng tôi sẽ gửi mã xác nhận đến email đã đăng ký.']
      : ['VERIFY CODE', 'Đặt lại mật khẩu', 'Nhập mã 6 số trong email và mật khẩu mới của bạn.'];

  return <div className="login-page"><main className="login-card"><section className="login-brand"><div className="brand-mark"><span className="material-symbols-outlined">school</span></div><div className="brand-copy"><span className="brand-kicker">LEARN SMARTER</span><h1>EduSmart</h1><p>Đọc tài liệu, hiểu sâu kiến thức và hỏi đáp với AI dựa trên đúng nguồn môn học.</p><div className="brand-points"><span><span className="material-symbols-outlined">verified</span>Trích dẫn rõ ràng</span><span><span className="material-symbols-outlined">bolt</span>Học tập tập trung</span></div></div><small className="brand-footer">Nền tảng học tập thông minh cho mọi môn học</small></section><section className="login-form"><div className="login-heading"><span>{heading[0]}</span><h2>{heading[1]}</h2><p>{heading[2]}</p></div>
    {step === 'login' && <form onSubmit={submitLogin}><label>Tên đăng nhập<input autoFocus required value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Nhập tên đăng nhập" /></label><label>Mật khẩu<div className="password-field"><input required type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Nhập mật khẩu" /><button type="button" disabled={loading} onClick={() => setShowPassword(!showPassword)}><span className="material-symbols-outlined">{showPassword ? 'visibility_off' : 'visibility'}</span></button></div></label>{error && <div className="login-error"><span className="material-symbols-outlined">error</span>{error}</div>}{notice && <div className="login-success">{notice}</div>}<button className="btn-primary" disabled={loading}>{loading ? 'Đang đăng nhập...' : <>Đăng nhập<span className="material-symbols-outlined">arrow_forward</span></>}</button><button type="button" className="text-button" disabled={loading} onClick={() => { setStep('request'); setError(null); setNotice(null); }}>Quên mật khẩu?</button></form>}
    {step === 'request' && <form onSubmit={submitRequest}><label>Tên đăng nhập<input autoFocus required value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Nhập tên đăng nhập" /></label>{error && <div className="login-error"><span className="material-symbols-outlined">error</span>{error}</div>}<button className="btn-primary" disabled={loading}>{loading ? 'Đang gửi mã...' : 'Gửi mã xác nhận'}</button><button type="button" className="text-button" disabled={loading} onClick={() => { setStep('login'); setError(null); }}>Quay lại đăng nhập</button></form>}
    {step === 'reset' && <form onSubmit={submitReset}><label>Mã xác nhận<input autoFocus required inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="Nhập mã 6 số" /></label><label>Mật khẩu mới<input required minLength={6} type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Ít nhất 6 ký tự" /></label>{error && <div className="login-error"><span className="material-symbols-outlined">error</span>{error}</div>}{notice && <div className="login-success">{notice}</div>}<button className="btn-primary" disabled={loading}>{loading ? 'Đang cập nhật...' : 'Đặt lại mật khẩu'}</button><button type="button" className="text-button" disabled={loading} onClick={() => { setStep('request'); setError(null); setNotice(null); }}>Gửi lại mã</button></form>}
    {step === 'login' && <p className="login-note"><span className="material-symbols-outlined">info</span>Tài khoản được tạo và quản lý bởi Admin.</p>}
    </section></main><style>{`.login-page{min-height:100vh;display:grid;place-items:center;padding:28px;background:radial-gradient(circle at 10% 10%,#e0e7ff 0,transparent 26rem),radial-gradient(circle at 90% 90%,#dbeafe 0,transparent 24rem),#f5f7fb}.login-card{width:min(980px,100%);min-height:590px;display:grid;grid-template-columns:1fr 1fr;background:#fff;border:1px solid #e3e8f2;border-radius:24px;overflow:hidden;box-shadow:0 26px 70px rgb(30 41 59 / .15)}.login-brand{position:relative;display:flex;flex-direction:column;justify-content:space-between;padding:44px;background:linear-gradient(145deg,#17143e 0%,#312e81 54%,#4f46e5 100%);color:#fff;overflow:hidden}.login-brand:after{content:'';position:absolute;width:300px;height:300px;right:-120px;bottom:-120px;border-radius:50%;border:1px solid rgb(255 255 255 / .16);box-shadow:0 0 0 28px rgb(255 255 255 / .04),0 0 0 56px rgb(255 255 255 / .03)}.brand-mark{display:grid;width:52px;height:52px;place-items:center;border:1px solid rgb(255 255 255 / .2);border-radius:16px;background:rgb(255 255 255 / .12);backdrop-filter:blur(10px);color:#c7d2fe}.brand-mark .material-symbols-outlined{font-size:28px}.brand-copy{position:relative;z-index:1;max-width:350px}.brand-kicker,.login-heading>span{font-size:10px;font-weight:800;letter-spacing:.12em}.brand-kicker{color:#c7d2fe}.login-brand h1{font-size:42px;letter-spacing:-.05em;margin:9px 0 13px}.login-brand p{color:#e0e7ff;line-height:1.75;font-size:15px}.brand-points{display:flex;flex-direction:column;gap:11px;margin-top:28px;color:#eef2ff;font-size:12px;font-weight:600}.brand-points span{display:flex;align-items:center;gap:8px}.brand-points .material-symbols-outlined{font-size:17px;color:#a5b4fc}.brand-footer{position:relative;z-index:1;color:#c7d2fe;font-size:11px}.login-form{padding:54px;display:flex;flex-direction:column;justify-content:center}.login-heading>span{color:#4f46e5}.login-form h2{font-size:30px;letter-spacing:-.04em;margin:9px 0 8px}.login-heading>p{color:#64748b;line-height:1.6;margin-bottom:30px}.login-form form{display:flex;flex-direction:column;gap:17px}.login-form label{display:flex;flex-direction:column;gap:7px;font-size:12px;font-weight:700;color:#334155}.login-form input{width:100%;min-height:46px;border:1px solid #dbe1ec;border-radius:11px;padding:11px 13px;transition:all .15s}.login-form input:focus{border-color:#6366f1;box-shadow:0 0 0 4px rgb(99 102 241 / .1)}.password-field{position:relative}.password-field input{padding-right:44px}.password-field button{position:absolute;right:8px;top:8px;width:30px;height:30px;border-radius:8px;color:#94a3b8}.password-field button:hover{background:#f1f5f9;color:#4f46e5}.login-error,.login-success{display:flex;align-items:center;gap:7px;padding:10px 12px;border-radius:10px;font-size:12px}.login-error{background:#fff1f2;color:#be123c;border:1px solid #fecdd3}.login-success{background:#ecfdf5;color:#047857;border:1px solid #a7f3d0}.login-error .material-symbols-outlined{font-size:18px}.login-form .btn-primary{min-height:46px;margin-top:5px;border-radius:11px;box-shadow:0 9px 18px rgb(79 70 229 / .18)}.login-form .btn-primary .material-symbols-outlined{font-size:18px}.text-button{color:#4f46e5;font-size:12px;font-weight:700;text-align:center}.login-note{display:flex;align-items:center;gap:6px;margin-top:26px;color:#94a3b8;font-size:11px}.login-note .material-symbols-outlined{font-size:15px}@media(max-width:700px){.login-page{padding:16px}.login-card{grid-template-columns:1fr;min-height:0}.login-brand{display:none}.login-form{padding:38px 26px}}`}</style></div>;
};
