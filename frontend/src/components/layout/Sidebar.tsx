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
    ? [{ to: '/admin', icon: 'admin_panel_settings', label: 'Admin Workspace' }]
    : role === 'teacher'
      ? [{ to: '/dashboard', icon: 'dashboard', label: 'Lớp được phân công' }, { to: '/documents', icon: 'folder_open', label: 'Tài liệu' }, { to: '/chat', icon: 'forum', label: 'Kiểm thử Chat AI' }]
      : [{ to: '/portal', icon: 'school', label: 'Lớp của tôi' }, { to: '/documents', icon: 'library_books', label: 'Tài liệu đã duyệt' }, { to: '/chat', icon: 'forum', label: 'Chat AI' }, { to: '/pricing', icon: 'diamond', label: 'Gói câu hỏi' }];

  return <aside className={`app-sidebar-wrap ${appState.sidebarOpen ? 'open' : ''}`}><div className="role-sidebar"><div className="sidebar-profile"><div className="sidebar-avatar">{authState.user?.fullName?.charAt(0) || authState.user?.username.charAt(0)}</div><div><strong>{authState.user?.fullName || authState.user?.username}</strong><span>{roleLabel[role]}</span></div></div>
    <nav>{links.map((link) => <NavLink key={link.to} to={link.to} className={({ isActive }) => isActive ? 'active' : ''}><span className="material-symbols-outlined">{link.icon}</span>{link.label}</NavLink>)}</nav>
    {role === 'teacher' && <button className="sidebar-upload" onClick={() => navigate('/documents')}><span className="material-symbols-outlined">upload_file</span>Upload tài liệu</button>}
    <button className="sidebar-logout" onClick={() => { logout(); navigate('/login'); }}><span className="material-symbols-outlined">logout</span>Đăng xuất</button></div><SidebarStyle /></aside>;
};

const SidebarStyle = () => <style>{`
.role-sidebar{height:100%;background:#fff;border-right:1px solid #e1e5ee;padding:18px 14px;display:flex;flex-direction:column}.sidebar-profile{display:flex;align-items:center;gap:10px;padding:10px 8px 20px}.sidebar-profile strong,.sidebar-profile span{display:block}.sidebar-profile span{font-size:12px;color:#666}.sidebar-avatar{width:40px;height:40px;border-radius:12px;background:#00236f;color:#fff;display:grid;place-items:center;font-weight:700}.role-sidebar nav{display:flex;flex-direction:column;gap:6px}.role-sidebar nav a,.sidebar-logout,.sidebar-upload{display:flex;align-items:center;gap:10px;padding:11px 12px;border-radius:9px;color:#444;text-align:left}.role-sidebar nav a.active{background:#e5eeff;color:#00236f;font-weight:650}.sidebar-upload{margin-top:18px;background:#dff7f2;color:#006a61}.sidebar-logout{margin-top:auto;color:#93000a;width:100%}@media(max-width:1023px){.app-sidebar-wrap{transform:translateX(-100%);transition:.2s;z-index:30;width:256px}.app-sidebar-wrap.open{transform:translateX(0)}}
`}</style>;
