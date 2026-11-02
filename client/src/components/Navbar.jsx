import React from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';

export default function Navbar({ user, onLogout }) {
  const navigate = useNavigate();

  const handleLogoutClick = async () => {
    await onLogout();
    navigate('/');
  };

  return (
    <header>
      <nav className="navbar">
        <div className="container">
          <Link to="/" className="logo">
            <span className="logo-badge">CH</span>
            Campus<span>Hub</span>
          </Link>
          <ul className="nav-links">
            <li>
              <NavLink to="/" className={({ isActive }) => (isActive ? 'active' : '')} end>
                Home
              </NavLink>
            </li>
            <li>
              <NavLink to="/events" className={({ isActive }) => (isActive ? 'active' : '')}>
                Events
              </NavLink>
            </li>
            <li>
              <NavLink to="/about" className={({ isActive }) => (isActive ? 'active' : '')}>
                About
              </NavLink>
            </li>

            {user && user.role === 'admin' && (
              <li>
                <NavLink to="/admin" className={({ isActive }) => (isActive ? 'active' : '')}>
                  Admin Panel
                </NavLink>
              </li>
            )}

            {user && user.role === 'student' && (
              <li>
                <NavLink to="/dashboard" className={({ isActive }) => (isActive ? 'active' : '')}>
                  My Dashboard
                </NavLink>
              </li>
            )}

            {!user && (
              <li>
                <NavLink to="/login" className={({ isActive }) => (isActive ? 'active' : '')}>
                  Login
                </NavLink>
              </li>
            )}
          </ul>

          <div className="nav-cta">
            {user ? (
              <div className="nav-user">
                <Link
                  to={user.role === 'admin' ? '/admin' : '/dashboard'}
                  className="user-badge"
                  title="Go to Dashboard"
                >
                  <span>👤 {(user.name || user.fullName || 'User').split(' ')[0]}</span>
                  <span className={user.role === 'admin' ? 'role-pill admin' : 'role-pill'}>
                    {user.role === 'admin' ? 'Admin' : 'Student'}
                  </span>
                </Link>
                <button
                  type="button"
                  className="btn btn-outline-light btn-small"
                  onClick={handleLogoutClick}
                  style={{ borderColor: 'rgba(255,255,255,0.25)', color: '#fff' }}
                >
                  Logout
                </button>
              </div>
            ) : (
              <Link to="/register" className="btn btn-primary btn-small">
                Sign Up
              </Link>
            )}
          </div>
        </div>
      </nav>
    </header>
  );
}
