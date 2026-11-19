import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../services/api';

export default function Login({ onLoginSuccess, onShowToast }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectUrl = searchParams.get('redirect');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState({ text: '', type: '' });
  const [submitting, setSubmitting] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const googleBtnRef = useRef(null);

  const finishLogin = (res) => {
    onLoginSuccess(res.user);
    onShowToast(res.message || 'Login successful!', 'success');
    if (res.user.role === 'admin') navigate('/admin');
    else if (redirectUrl) navigate(redirectUrl);
    else navigate('/dashboard');
  };

  // Google Sign-In (students, college domain only)
  useEffect(() => {
    let cancelled = false;

    const init = (clientId) => {
      if (cancelled || !window.google || !googleBtnRef.current) return;
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: async (response) => {
          try {
            const res = await api.googleLogin(response.credential);
            if (res && res.success) finishLogin(res);
          } catch (err) {
            setMessage({ text: err.message || 'Google sign-in failed.', type: 'error' });
          }
        }
      });
      window.google.accounts.id.renderButton(googleBtnRef.current, {
        theme: 'outline', size: 'large', text: 'signin_with', width: 320
      });
    };

    api.getAuthConfig()
      .then((cfg) => {
        if (!cfg.googleClientId) {
          setMessage({ text: 'Google sign-in is not configured on the server.', type: 'error' });
          return;
        }
        if (window.google && window.google.accounts) return init(cfg.googleClientId);
        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.onload = () => init(cfg.googleClientId);
        script.onerror = () => setMessage({ text: 'Could not load Google sign-in.', type: 'error' });
        document.head.appendChild(script);
      })
      .catch((err) => setMessage({ text: err.message, type: 'error' }));

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email.trim()) {
      setMessage({ text: 'Please enter your email address.', type: 'error' });
      return;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email.trim())) {
      setMessage({ text: 'Please use your @mitaoe.ac.in email address.', type: 'error' });
      return;
    }

    if (!password) {
      setMessage({ text: 'Please enter your password.', type: 'error' });
      return;
    }

    setSubmitting(true);
    setMessage({ text: '', type: '' });

    try {
      const res = await api.login(email.trim(), password);
      if (res && res.success) {
        finishLogin(res);
      }
    } catch (err) {
      setMessage({ text: err.message || 'Invalid email or password.', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main>
      <section className="auth-section">
        <div className="auth-card">
          <Link to="/" className="logo">
            <span className="logo-badge">CH</span>
            Campus<span>Hub</span>
          </Link>
          <div className="auth-header">
            <h1>Welcome Back</h1>
            <p>Log in to register for events and manage your participation.</p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', margin: '16px 0' }}>
            <div ref={googleBtnRef}></div>
          </div>
          <p className="auth-footer-text" style={{ textAlign: 'center' }}>
            Students: sign in with your @mitaoe.ac.in Google account.{' '}
            <a href="#admin" onClick={(e) => { e.preventDefault(); setShowAdmin(!showAdmin); }}>Admin login</a>
          </p>
          {message.text && !showAdmin && (
            <p className={`form-message ${message.type}`} role="status">{message.text}</p>
          )}

          <form onSubmit={handleSubmit} noValidate style={{ display: showAdmin ? 'block' : 'none' }}>
            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <input
                type="email"
                id="email"
                placeholder="you@mitaoe.ac.in"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setMessage({ text: '', type: '' });
                }}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setMessage({ text: '', type: '' });
                }}
                required
              />
            </div>

            <div className="form-options">
              <div className="checkbox-group">
                <input type="checkbox" id="remember" />
                <label htmlFor="remember">Remember me</label>
              </div>
              <a href="#forgot" onClick={(e) => { e.preventDefault(); alert('For evaluation/demo accounts, use the quick buttons below.'); }} className="forgot-link">
                Forgot Password?
              </a>
            </div>

            <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
              {submitting ? 'Verifying Credentials...' : 'Login'}
            </button>

            {message.text && showAdmin && (
              <p className={`form-message ${message.type}`} role="status">
                {message.text}
              </p>
            )}

          </form>

        </div>
      </section>
    </main>
  );
}
