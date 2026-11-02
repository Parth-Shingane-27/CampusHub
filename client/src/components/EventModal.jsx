import React from 'react';
import { useNavigate } from 'react-router-dom';
import { TimeBadge, CalendarLinks } from './EventBadges';

export default function EventModal({ event, isOpen, onClose, user, isRegistered, onRegister, registering }) {
  const navigate = useNavigate();

  if (!isOpen || !event) return null;

  const availableSeats = event.availableSeats !== undefined ? event.availableSeats : Math.max(0, event.capacity - (event.registeredCount || 0));
  const isFull = availableSeats <= 0;
  const isClosed = event.status === 'Registration Closed' || event.status === 'Completed';

  const handleActionClick = (e) => {
    e.preventDefault();
    if (!user) {
      navigate('/login?redirect=/events');
    } else if (user.role === 'admin') {
      navigate('/admin');
    } else if (!isRegistered && !isFull && !isClosed) {
      onRegister(event.id || event._id);
    }
  };

  return (
    <div className="modal" style={{ display: 'flex' }} role="dialog" aria-modal="true">
      <div className="modal-overlay" onClick={onClose} />
      <div className="modal-box">
        <button type="button" className="modal-close" onClick={onClose} aria-label="Close dialog">
          &times;
        </button>

        <div className="modal-header">
          <span className="event-tag">{event.category}</span>
          <h2>{event.title}</h2>
        </div>

        <div className="modal-body">
          <div className="event-meta" style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
            <span className="icon">📅 {event.date}</span>
            <span className="icon">⏰ {event.time || '10:00 AM'}</span>
            <span className="icon">📍 {event.venue}</span>
            <span className="icon">👥 Capacity: {event.capacity} ({availableSeats} seats available)</span>
            <span className="icon">
              📌 Status: <strong style={{ color: event.status === 'Upcoming' ? '#10b981' : '#f59e0b' }}>{event.status || 'Upcoming'}</strong>
            </span>
          </div>
          <div style={{ marginBottom: '12px' }}>
            <TimeBadge event={event} />
          </div>
          <p className="modal-desc">{event.description}</p>
          {isRegistered && <CalendarLinks event={event} />}
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-secondary btn-small" onClick={onClose}>
            Close
          </button>

          {!user ? (
            <button type="button" className="btn btn-primary btn-small" onClick={handleActionClick}>
              Login to Register
            </button>
          ) : user.role === 'admin' ? (
            <button type="button" className="btn btn-primary btn-small" onClick={handleActionClick}>
              Manage in Admin Panel
            </button>
          ) : isRegistered ? (
            <button type="button" className="btn btn-secondary btn-small" disabled>
              ✓ Already Registered
            </button>
          ) : isClosed ? (
            <button type="button" className="btn btn-secondary btn-small" disabled>
              Registration Closed
            </button>
          ) : isFull ? (
            <button type="button" className="btn btn-secondary btn-small" disabled>
              Event Full
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-primary btn-small"
              onClick={handleActionClick}
              disabled={registering}
            >
              {registering ? 'Registering...' : 'Register Now'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
