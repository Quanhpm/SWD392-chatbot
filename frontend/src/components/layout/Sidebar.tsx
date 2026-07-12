import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.js';
import { useApp } from '../../context/AppContext.js';

const roleLabel = { admin: 'Quản trị viên', teacher: 'Giảng viên', student: 'Sinh viên' } as const;

export const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const { state: authState, logout } = useAuth();
  const { state: appState } = useApp();
  const role = authState.user?.role ?? 'student';
  const links = role === 'admin'
    ? [{ to: '/admin', icon: 'admin_panel_settings', label: 'Admin Workspace' }, { to: '/chat', icon: 'forum', label: 'Kiểm thử Chat AI' }]
    : role === 'teacher'
      ? [{ to: '/dashboard', icon: 'dashboard', label: 'Môn được phân công' }, { to: '/documents', icon: 'folder_open', label: 'Tài liệu' }, { to: '/chat', icon: 'forum', label: 'Chat AI' }]
      : [{ to: '/portal', icon: 'school', label: 'Tất cả môn học' }, { to: '/chat', icon: 'forum', label: 'Chat AI' }, { to: '/pricing', icon: 'diamond', label: 'Gói câu hỏi' }];

  return <aside className={`app-sidebar-wrap ${appState.sidebarOpen ? 'open' : ''}`}><div className="role-sidebar"><div className="sidebar-profile"><div className="sidebar-avatar">{authState.user?.fullName?.charAt(0) || authState.user?.username.charAt(0)}</div><div><strong>{authState.user?.fullName || authState.user?.username}</strong><span>{roleLabel[role]}</span></div></div>
    <nav>{links.map((link) => <NavLink key={link.to} to={link.to} className={({ isActive }) => isActive ? 'active' : ''}><span className="material-symbols-outlined">{link.icon}</span>{link.label}</NavLink>)}</nav>
    {role === 'teacher' && <button className="sidebar-upload" onClick={() => navigate('/documents')}><span className="material-symbols-outlined">upload_file</span>Upload tài liệu</button>}
    <button className="sidebar-logout" onClick={() => { logout(); navigate('/login'); }}><span className="material-symbols-outlined">logout</span>Đăng xuất</button></div><SidebarStyle /></aside>;
};

const SidebarStyle = () => <style>{`
.role-sidebar{height:100%;background:rgba(255,255,255,.82);border-right:1px solid var(--color-outline-variant);padding:18px 14px;display:flex;flex-direction:column}.sidebar-profile{display:flex;align-items:center;gap:11px;padding:8px 9px 20px;margin-bottom:12px;border-bottom:1px solid #eef2f7}.sidebar-profile>div:last-child{min-width:0}.sidebar-profile strong,.sidebar-profile span{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.sidebar-profile strong{font-size:13px}.sidebar-profile span{font-size:11px;color:var(--color-on-surface-variant);margin-top:3px}.sidebar-avatar{width:38px;height:38px;flex:0 0 38px;border-radius:12px;background:linear-gradient(145deg,#1e1b4b,#4338ca);color:#fff;display:grid;place-items:center;font-size:13px;font-weight:700;box-shadow:0 6px 14px rgb(67 56 202 / .18)}.role-sidebar nav{display:flex;flex-direction:column;gap:4px}.role-sidebar nav a,.sidebar-logout,.sidebar-upload{display:flex;align-items:center;gap:11px;min-height:44px;padding:10px 12px;border-radius:11px;color:#64748b;text-align:left;font-size:13px;font-weight:500;transition:background var(--transition-fast), color var(--transition-fast), transform var(--transition-fast)}.role-sidebar nav a .material-symbols-outlined,.sidebar-logout .material-symbols-outlined,.sidebar-upload .material-symbols-outlined{font-size:20px}.role-sidebar nav a:hover{background:#f5f7fb;color:#1e293b;transform:translateX(2px)}.role-sidebar nav a.active{background:linear-gradient(90deg,#eef2ff,#f7f8ff);color:#312e81;font-weight:650;box-shadow:inset 3px 0 #4f46e5}.role-sidebar nav a.active .material-symbols-outlined{color:var(--color-primary);font-variation-settings:'FILL' 1}.sidebar-upload{margin-top:18px;border:1px solid #c7d2fe;background:linear-gradient(135deg,#eef2ff,#e0e7ff);color:#3730a3}.sidebar-upload:hover{background:#e0e7ff}.sidebar-logout{margin-top:auto;width:100%;color:#64748b}.sidebar-logout:hover{background:#fef2f2;color:#b91c1c}@media(max-width:1023px){.app-sidebar-wrap{transform:translateX(-100%);transition:.2s;z-index:100;width:256px}.app-sidebar-wrap.open{transform:translateX(0)}}
`}</style>;
