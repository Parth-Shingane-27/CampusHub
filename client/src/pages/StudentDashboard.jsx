import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { api } from '../services/api';
import { TimeBadge, CalendarLinks } from '../components/EventBadges';
import { useLiveEvents, useMinuteTick } from '../utils/eventUtils';

// Shape a registration like an event so the badge and calendar helpers can use it
const regToEvent = (reg) => ({
  id: reg.eventId,
  title: reg.eventTitle,
  description: reg.eventDescription,
  venue: reg.eventVenue,
  startsAt: reg.eventStartsAt,
  endsAt: reg.eventEndsAt,
  status: 'Upcoming'
});

export default function StudentDashboard({ user, onUpdateUser, onLogout, onShowToast }) {
  const navigate = useNavigate();

  const [registrations, setRegistrations] = useState([]);
  const [stats, setStats] = useState({ totalEvents: 0, myRegistrationsCount: 0 });
  const [loading, setLoading] = useState(true);
  const [savedEvents, setSavedEvents] = useState([]);
  const [ticketReg, setTicketReg] = useState(null);
  const [, setTick] = useState(0);

  useMinuteTick(setTick);

  // Profile Edit State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileName, setProfileName] = useState(user?.name || user?.fullName || '');
  const [profileCollegeId, setProfileCollegeId] = useState(user?.collegeId || '');
  const [profileYear, setProfileYear] = useState(user?.yearOfStudy || '3rd Year');
  const [profileMsg, setProfileMsg] = useState({ text: '', type: '' });
  const [savingProfile, setSavingProfile] = useState(false);

  // Load dashboard data
  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [regsData, statsData, bookmarkData] = await Promise.all([
        api.getMyRegistrations().catch(() => ({ registrations: [] })),
        api.getStudentStats().catch(() => ({ stats: { totalEvents: 0, myRegistrationsCount: 0 } })),
        api.getBookmarks().catch(() => ({ events: [] }))
      ]);

      setSavedEvents(bookmarkData.events || []);
      setRegistrations(regsData.registrations || []);
      if (statsData && statsData.stats) {
        setStats(statsData.stats);
      }
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  useLiveEvents(loadDashboardData);

  const handleRemoveSaved = async (eventId) => {
    try {
      await api.removeBookmark(eventId);
      setSavedEvents((prev) => prev.filter((e) => e.id !== eventId));
    } catch (err) {
      onShowToast(err.message || 'Could not remove bookmark.', 'error');
    }
  };

  useEffect(() => {
    if (user) {
      setProfileName(user.name || user.fullName || '');
      setProfileCollegeId(user.collegeId || '');
      setProfileYear(user.yearOfStudy || '3rd Year');
    }
  }, [user]);

  // Cancel Registration Handler
  const handleCancel = async (regId, eventTitle) => {
    const confirmed = window.confirm(`Are you sure you want to cancel your registration for "${eventTitle}"? Your seat will be made available for other students.`);
    if (!confirmed) return;

    try {
      const res = await api.cancelRegistration(regId);
      if (res && res.success) {
        onShowToast(res.message || 'Registration cancelled.', 'success');
        await loadDashboardData();
      }
    } catch (err) {
      onShowToast(err.message || 'Could not cancel registration.', 'error');
    }
  };

  // Profile Update Handler
  const handleSaveProfile = async (e) => {
    e.preventDefault();

    if (!profileName.trim() || profileName.trim().length < 2) {
      setProfileMsg({ text: 'Full name must contain at least 2 characters.', type: 'error' });
      return;
    }

    if (!profileCollegeId.trim() || profileCollegeId.trim().length < 2) {
      setProfileMsg({ text: 'College ID must contain at least 2 characters.', type: 'error' });
      return;
    }

    setSavingProfile(true);
    setProfileMsg({ text: '', type: '' });

    try {
      const res = await api.updateProfile({
        name: profileName.trim(),
        collegeId: profileCollegeId.trim(),
        yearOfStudy: profileYear
      });

      if (res && res.success) {
        onUpdateUser(res.user);
        setIsEditingProfile(false);
        onShowToast('Profile updated successfully!', 'success');
      }
    } catch (err) {
      setProfileMsg({ text: err.message || 'Failed to update profile.', type: 'error' });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleLogoutClick = async () => {
    await onLogout();
    navigate('/');
  };

  const confirmedCount = registrations.filter((r) => r.status === 'Confirmed').length;

  return (
    <main>
      {/* ============ DASHBOARD HEADER ============ */}
      <section className="dashboard-header">
        <div className="container">
          <div className="dashboard-user-bar">
            <div>
              <span className="section-tag" style={{ background: 'rgba(255,255,255,0.15)', color: '#818cf8' }}>
                Student Portal
              </span>
              <h1>Welcome, {user?.name || user?.fullName || 'Student'}!</h1>
              <p>
                {user?.yearOfStudy || '3rd Year'} • {user?.collegeId || 'CS Student'} • {user?.email}
              </p>
            </div>
            <div className="dashboard-actions">
              <Link to="/events" className="btn btn-primary btn-small">
                Explore Events
              </Link>
              <button type="button" className="btn btn-outline-light btn-small" onClick={handleLogoutClick}>
                Logout
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ============ MAIN DASHBOARD CONTENT ============ */}
      <div className="container">
        {/* Metric Stats Grid */}
        <div className="stats-grid-dashboard">
          <div className="dashboard-stat-card">
            <div className="dashboard-stat-icon green">📅</div>
            <div className="dashboard-stat-info">
              <h3>{stats.totalEvents || 0}</h3>
              <p>Total Events Available</p>
            </div>
          </div>
          <div className="dashboard-stat-card">
            <div className="dashboard-stat-icon">🎟️</div>
            <div className="dashboard-stat-info">
              <h3>{confirmedCount}</h3>
              <p>Active Registrations</p>
            </div>
          </div>
          <div className="dashboard-stat-card">
            <div className="dashboard-stat-icon purple">🎓</div>
            <div className="dashboard-stat-info">
              <h3>{user?.yearOfStudy || '3rd Year'}</h3>
              <p>Year of Study</p>
            </div>
          </div>
        </div>

        <div className="dashboard-grid">
          {/* Left Column: Registered Events */}
          <div>
            <div className="dashboard-card">
              <div className="dashboard-card-header">
                <h2>My Registered Events</h2>
                <span className="badge-seats">{confirmedCount} Confirmed</span>
              </div>

              {loading ? (
                <div className="empty-state">
                  <p>Loading your event registrations...</p>
                </div>
              ) : registrations.length === 0 ? (
                <div className="empty-state">
                  <span className="empty-state-icon">🎟️</span>
                  <h3>No event registrations yet</h3>
                  <p>You haven't registered for any campus events yet. Explore upcoming hackathons, sports meets, and workshops!</p>
                  <Link to="/events" className="btn btn-primary btn-small">
                    Explore Upcoming Events
                  </Link>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {registrations.map((reg) => {
                    const isConfirmed = reg.status === 'Confirmed';
                    const statusClass = isConfirmed ? 'confirmed' : 'cancelled';

                    return (
                      <div
                        key={reg.id || reg._id}
                        style={{
                          background: '#fff',
                          border: '1px solid var(--border-color)',
                          borderRadius: 'var(--radius-sm)',
                          padding: '18px 20px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          flexWrap: 'wrap',
                          gap: '14px',
                          boxShadow: '0 1px 4px rgba(0,0,0,0.04)'
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
                            <span className="event-tag" style={{ margin: 0, fontSize: '0.72rem' }}>
                              {reg.eventCategory || 'General'}
                            </span>
                            <span className={`badge-status ${statusClass}`}>{reg.status}</span>
                            {isConfirmed && <TimeBadge event={regToEvent(reg)} />}
                            {reg.checkedInAt && <span className="badge-status confirmed">✓ Attended</span>}
                          </div>
                          <h4 style={{ fontSize: '1.15rem', color: 'var(--dark)', marginBottom: '6px' }}>
                            {reg.eventTitle}
                          </h4>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', fontSize: '0.85rem', color: 'var(--text-light)' }}>
                            <span>📅 {reg.eventDate || 'TBA'}</span>
                            <span>📍 {reg.eventVenue || 'Campus'}</span>
                            <span>🕒 Registered: {reg.registeredAt || 'Recent'}</span>
                          </div>
                          {isConfirmed && <CalendarLinks event={regToEvent(reg)} />}
                        </div>

                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          {isConfirmed ? (
                            <>
                              {reg.ticketCode && (
                                <button
                                  type="button"
                                  className="btn btn-primary btn-small"
                                  onClick={() => setTicketReg(reg)}
                                >
                                  🎫 Show Ticket
                                </button>
                              )}
                              {!reg.checkedInAt && (
                                <button
                                  type="button"
                                  className="btn-action btn-action-danger"
                                  onClick={() => handleCancel(reg.id || reg._id, reg.eventTitle)}
                                >
                                  Cancel Registration
                                </button>
                              )}
                            </>
                          ) : (
                            <span style={{ fontSize: '0.82rem', color: 'var(--text-light)', fontStyle: 'italic' }}>
                              Cancelled
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Profile & Assistance */}
          <div>
            {/* Student Profile Card */}
            <div className="dashboard-card">
              <div className="dashboard-card-header">
                <h3>Student Profile</h3>
                {!isEditingProfile && (
                  <button
                    type="button"
                    className="btn-action btn-action-edit"
                    onClick={() => setIsEditingProfile(true)}
                  >
                    Edit Profile
                  </button>
                )}
              </div>

              {!isEditingProfile ? (
                <div>
                  <div style={{ marginBottom: '14px' }}>
                    <label style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-light)', fontWeight: '700' }}>Full Name</label>
                    <p style={{ fontSize: '1.05rem', fontWeight: '600', color: 'var(--dark)' }}>{user?.name || user?.fullName || '-'}</p>
                  </div>
                  <div style={{ marginBottom: '14px' }}>
                    <label style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-light)', fontWeight: '700' }}>Email Address</label>
                    <p style={{ fontSize: '0.95rem', color: 'var(--text-main)' }}>{user?.email || '-'}</p>
                  </div>
                  <div style={{ marginBottom: '14px' }}>
                    <label style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-light)', fontWeight: '700' }}>College ID</label>
                    <p style={{ fontSize: '0.95rem', fontWeight: '600', color: 'var(--text-main)' }}>{user?.collegeId || '-'}</p>
                  </div>
                  <div style={{ marginBottom: '14px' }}>
                    <label style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-light)', fontWeight: '700' }}>Year of Study</label>
                    <p style={{ fontSize: '0.95rem', color: 'var(--text-main)' }}>{user?.yearOfStudy || '3rd Year'}</p>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-light)', fontWeight: '700' }}>Account Status</label>
                    <p><span className="badge-status confirmed">Active Student</span></p>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSaveProfile} novalidate="true">
                  <div className="form-group" style={{ marginBottom: '14px' }}>
                    <label htmlFor="edit-name">Full Name</label>
                    <input
                      type="text"
                      id="edit-name"
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: '14px' }}>
                    <label htmlFor="edit-id">College ID</label>
                    <input
                      type="text"
                      id="edit-id"
                      value={profileCollegeId}
                      onChange={(e) => setProfileCollegeId(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: '18px' }}>
                    <label htmlFor="edit-year-select">Year of Study</label>
                    <select
                      id="edit-year-select"
                      value={profileYear}
                      onChange={(e) => setProfileYear(e.target.value)}
                      required
                    >
                      <option value="1st Year">1st Year</option>
                      <option value="2nd Year">2nd Year</option>
                      <option value="3rd Year">3rd Year</option>
                      <option value="4th Year">4th Year</option>
                      <option value="Post-Graduate">Post-Graduate</option>
                    </select>
                  </div>

                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button type="submit" className="btn btn-primary btn-small" disabled={savingProfile}>
                      {savingProfile ? 'Saving...' : 'Save Changes'}
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary btn-small"
                      onClick={() => {
                        setIsEditingProfile(false);
                        setProfileMsg({ text: '', type: '' });
                      }}
                    >
                      Cancel
                    </button>
                  </div>

                  {profileMsg.text && (
                    <p className={`form-message ${profileMsg.type}`} style={{ marginTop: '10px' }}>
                      {profileMsg.text}
                    </p>
                  )}
                </form>
              )}
            </div>

            {/* Saved Events Card */}
            <div className="dashboard-card">
              <div className="dashboard-card-header">
                <h3>Saved Events</h3>
                <span className="badge-seats">{savedEvents.length}</span>
              </div>
              {savedEvents.length === 0 ? (
                <p style={{ fontSize: '0.9rem', color: 'var(--text-light)' }}>
                  Tap the ☆ on any event to save it here for later.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {savedEvents.map((evt) => (
                    <div key={evt.id} style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                        <strong style={{ color: 'var(--dark)' }}>{evt.title}</strong>
                        <button
                          type="button"
                          className="bookmark-btn saved"
                          style={{ position: 'static', width: '28px', height: '28px', boxShadow: 'none', flexShrink: 0 }}
                          aria-label={`Remove ${evt.title} from saved events`}
                          title="Remove bookmark"
                          onClick={() => handleRemoveSaved(evt.id)}
                        >
                          ★
                        </button>
                      </div>
                      <div style={{ margin: '6px 0', fontSize: '0.82rem', color: 'var(--text-light)' }}>
                        📅 {evt.date} · 📍 {evt.venue}
                      </div>
                      <TimeBadge event={evt} />
                      <CalendarLinks event={evt} />
                    </div>
                  ))}
                  <Link to="/events" className="btn btn-secondary btn-small btn-block" style={{ textAlign: 'center' }}>
                    Browse more events
                  </Link>
                </div>
              )}
            </div>

            {/* Assistance Card */}
            <div className="dashboard-card" style={{ background: '#f8fafc' }}>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '10px' }}>Campus Guidelines</h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-light)', lineHeight: '1.5', marginBottom: '14px' }}>
                Registrations can be cancelled directly from your dashboard prior to the event schedule. When cancelled, your seat is instantly released for fellow students.
              </p>
              <Link to="/about" className="btn btn-outline-dark btn-small btn-block" style={{ border: '1px solid var(--border-color)', textAlign: 'center' }}>
                Learn More
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ============ TICKET QR MODAL ============ */}
      {ticketReg && (
        <div className="modal" style={{ display: 'flex' }} role="dialog" aria-modal="true">
          <div className="modal-overlay" onClick={() => setTicketReg(null)} />
          <div className="modal-box">
            <button type="button" className="modal-close" onClick={() => setTicketReg(null)} aria-label="Close ticket">
              &times;
            </button>
            <div className="modal-header">
              <span className="event-tag">Event Ticket</span>
              <h2>{ticketReg.eventTitle}</h2>
            </div>
            <div className="modal-body">
              <div className="ticket-qr">
                <QRCodeSVG value={ticketReg.ticketCode} size={220} marginSize={2} />
                <p style={{ margin: 0 }}>
                  {user?.name || user?.fullName} · {user?.collegeId}
                </p>
                <p style={{ margin: 0 }}>📅 {ticketReg.eventDate} · 📍 {ticketReg.eventVenue}</p>
                <p className="ticket-code">{ticketReg.ticketCode}</p>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-light)' }}>
                  Show this QR code to the organizers at the venue to check in.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
