import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { api } from './services/api';

import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';

import Home from './pages/Home';
import Events from './pages/Events';
import About from './pages/About';
import Login from './pages/Login';
import Register from './pages/Register';
import StudentDashboard from './pages/StudentDashboard';
import AdminDashboard from './pages/AdminDashboard';

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });

  // Toast Notification Helper
  const showToast = (message, type = 'success') => {
    setToast({ visible: true, message, type });
    setTimeout(() => {
      setToast({ visible: false, message: '', type: 'success' });
    }, 4000);
  };

  // Verify current user session on startup
  const checkAuth = async () => {
    setLoading(true);
    try {
      const data = await api.getMe();
      if (data && data.isAuthenticated && data.user) {
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch (err) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const handleLoginSuccess = (loggedInUser) => {
    setUser(loggedInUser);
  };

  const handleLogout = async () => {
    try {
      await api.logout();
      setUser(null);
      showToast('Logged out successfully.', 'success');
    } catch (err) {
      console.warn('Logout notice:', err);
      setUser(null);
    }
  };

  return (
    <div className="app-container" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar user={user} onLogout={handleLogout} />

      <div style={{ flex: 1 }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/events" element={<Events user={user} onShowToast={showToast} />} />
          <Route path="/about" element={<About />} />
          <Route
            path="/login"
            element={<Login onLoginSuccess={handleLoginSuccess} onShowToast={showToast} />}
          />
          <Route
            path="/register"
            element={<Register onLoginSuccess={handleLoginSuccess} onShowToast={showToast} />}
          />

          {/* Protected Student Portal */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute user={user} loading={loading} requiredRole="student">
                <StudentDashboard
                  user={user}
                  onUpdateUser={setUser}
                  onLogout={handleLogout}
                  onShowToast={showToast}
                />
              </ProtectedRoute>
            }
          />

          {/* Protected Admin Control Center */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute user={user} loading={loading} requiredRole="admin">
                <AdminDashboard
                  user={user}
                  onLogout={handleLogout}
                  onShowToast={showToast}
                />
              </ProtectedRoute>
            }
          />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>

      <Footer />

      {/* Floating Toast Notification */}
      {toast.visible && (
        <div className={`toast-alert ${toast.type}`}>
          <span>{toast.type === 'success' ? '✅' : '⚠️'}</span>
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}
