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
      : [{ to: '/portal', icon: 'school', label: 'Tất cả môn học' }, { to: '/documents', icon: 'library_books', label: 'Tài liệu' }, { to: '/chat', icon: 'forum', label: 'Chat AI' }, { to: '/pricing', icon: 'diamond', label: 'Gói câu hỏi' }];

  return <aside className={`app-sidebar-wrap ${appState.sidebarOpen ? 'open' : ''}`}><div className="role-sidebar"><div className="sidebar-profile"><div className="sidebar-avatar">{authState.user?.fullName?.charAt(0) || authState.user?.username.charAt(0)}</div><div><strong>{authState.user?.fullName || authState.user?.username}</strong><span>{roleLabel[role]}</span></div></div>
    <nav>{links.map((link) => <NavLink key={link.to} to={link.to} className={({ isActive }) => isActive ? 'active' : ''}><span className="material-symbols-outlined">{link.icon}</span>{link.label}</NavLink>)}</nav>
    {role === 'teacher' && <button className="sidebar-upload" onClick={() => navigate('/documents')}><span className="material-symbols-outlined">upload_file</span>Upload tài liệu</button>}
    <button className="sidebar-logout" onClick={() => { logout(); navigate('/login'); }}><span className="material-symbols-outlined">logout</span>Đăng xuất</button></div><SidebarStyle /></aside>;
};

const SidebarStyle = () => <style>{`
.role-sidebar{height:100%;background:#fff;border-right:1px solid var(--color-outline-variant);padding:14px 12px;display:flex;flex-direction:column}.sidebar-profile{display:flex;align-items:center;gap:10px;padding:8px 8px 18px;margin-bottom:6px;border-bottom:1px solid #f1f5f9}.sidebar-profile>div:last-child{min-width:0}.sidebar-profile strong,.sidebar-profile span{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.sidebar-profile strong{font-size:13px}.sidebar-profile span{font-size:11px;color:var(--color-on-surface-variant);margin-top:2px}.sidebar-avatar{width:34px;height:34px;flex:0 0 34px;border-radius:9px;background:#0f172a;color:#fff;display:grid;place-items:center;font-size:13px;font-weight:700}.role-sidebar nav{display:flex;flex-direction:column;gap:3px}.role-sidebar nav a,.sidebar-logout,.sidebar-upload{display:flex;align-items:center;gap:10px;min-height:40px;padding:9px 10px;border-radius:8px;color:#475569;text-align:left;font-size:13px;font-weight:500}.role-sidebar nav a .material-symbols-outlined,.sidebar-logout .material-symbols-outlined,.sidebar-upload .material-symbols-outlined{font-size:19px}.role-sidebar nav a:hover{background:#f8fafc;color:#0f172a}.role-sidebar nav a.active{background:#f1f5f9;color:#0f172a;font-weight:600}.role-sidebar nav a.active .material-symbols-outlined{color:var(--color-primary)}.sidebar-upload{margin-top:16px;border:1px solid #dbeafe;background:#eff6ff;color:#1d4ed8}.sidebar-upload:hover{background:#dbeafe}.sidebar-logout{margin-top:auto;width:100%;color:#64748b}.sidebar-logout:hover{background:#fef2f2;color:#b91c1c}@media(max-width:1023px){.app-sidebar-wrap{transform:translateX(-100%);transition:.2s;z-index:100;width:240px}.app-sidebar-wrap.open{transform:translateX(0)}}
`}</style>;
