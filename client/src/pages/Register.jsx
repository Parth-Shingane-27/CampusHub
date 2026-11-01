import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api';

export default function Register({ onLoginSuccess, onShowToast }) {
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [collegeId, setCollegeId] = useState('');
  const [yearOfStudy, setYearOfStudy] = useState('3rd Year');
  const [selectedEventId, setSelectedEventId] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [availableEvents, setAvailableEvents] = useState([]);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [submitting, setSubmitting] = useState(false);

  // Load events for optional event select
  useEffect(() => {
    api.getEvents()
      .then((data) => {
        if (data && data.events) {
          setAvailableEvents(data.events);
        }
      })
      .catch((err) => console.warn('Could not load events dropdown:', err));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!fullName.trim() || fullName.trim().length < 2) {
      setMessage({ text: 'Please enter your full name (minimum 2 characters).', type: 'error' });
      return;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim() || !emailPattern.test(email.trim())) {
      setMessage({ text: 'Please use your @mitaoe.ac.in email address.', type: 'error' });
      return;
    }

    if (!collegeId.trim() || collegeId.trim().length < 2) {
      setMessage({ text: 'Please enter your College ID.', type: 'error' });
      return;
    }

    if (!password || password.length < 8) {
      setMessage({ text: 'Password must contain at least 8 characters.', type: 'error' });
      return;
    }

    if (password !== confirmPassword) {
      setMessage({ text: 'Passwords do not match. Please re-enter.', type: 'error' });
      return;
    }

    setSubmitting(true);
    setMessage({ text: '', type: '' });

    try {
      const res = await api.register({
        name: fullName.trim(),
        email: email.trim(),
        collegeId: collegeId.trim(),
        yearOfStudy,
        password,
        confirmPassword
      });

      if (res && res.success) {
        onLoginSuccess(res.user);
        onShowToast('Account created successfully! Welcome to CampusHub.', 'success');

        // If an event was optionally chosen, register for it
        if (selectedEventId) {
          try {
            await api.registerForEvent(selectedEventId);
            onShowToast('Auto-registered for selected event!', 'success');
          } catch (eventErr) {
            console.warn('Optional event auto-booking notice:', eventErr);
          }
        }

        setTimeout(() => {
          navigate('/dashboard');
        }, 800);
      }
    } catch (err) {
      setMessage({ text: err.message || 'Registration failed. Please try again.', type: 'error' });
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
            <h1>Create Your Account</h1>
            <p>Join CampusHub to discover and register for college events.</p>
          </div>

          <form onSubmit={handleSubmit} novalidate="true">
            <div className="form-group">
              <label htmlFor="fullname">Full Name</label>
              <input
                type="text"
                id="fullname"
                placeholder="Enter your full name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <input
                type="email"
                id="email"
                placeholder="you@mitaoe.ac.in"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="collegeid">College ID</label>
                <input
                  type="text"
                  id="collegeid"
                  placeholder="e.g. CS2026045"
                  value={collegeId}
                  onChange={(e) => setCollegeId(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="year-of-study">Year of Study</label>
                <select
                  id="year-of-study"
                  value={yearOfStudy}
                  onChange={(e) => setYearOfStudy(e.target.value)}
                  required
                >
                  <option value="1st Year">1st Year</option>
                  <option value="2nd Year">2nd Year</option>
                  <option value="3rd Year">3rd Year</option>
                  <option value="4th Year">4th Year</option>
                  <option value="Post-Graduate">Post-Graduate</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="event-select">Select Event (Optional)</label>
              <select
                id="event-select"
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
              >
                <option value="">-- None (Create student account first) --</option>
                {availableEvents.map((evt) => (
                  <option key={evt.id || evt._id} value={evt.id || evt._id}>
                    {evt.title} ({evt.category})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="password">Password</label>
                <input
                  type="password"
                  id="password"
                  placeholder="Min 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="confirm-password">Confirm Password</label>
                <input
                  type="password"
                  id="confirm-password"
                  placeholder="Re-enter password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
              {submitting ? 'Creating Student Account...' : 'Create Student Account'}
            </button>

            {message.text && (
              <p className={`form-message ${message.type}`} role="status">
                {message.text}
              </p>
            )}
          </form>

          <div className="auth-divider">Already a member</div>

          <p className="auth-footer-text">
            Already have an account? <Link to="/login">Login here</Link>
          </p>
        </div>
      </section>
    </main>
  );
}
