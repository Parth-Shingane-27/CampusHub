import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../services/api';
import EventModal from '../components/EventModal';
import { TimeBadge, CalendarLinks, BookmarkButton } from '../components/EventBadges';
import { useLiveEvents, useMinuteTick } from '../utils/eventUtils';

const PAGE_SIZE = 9;

export default function Events({ user, onShowToast }) {
  const [searchParams] = useSearchParams();
  const initialCategory = searchParams.get('category') || 'All';

  const [events, setEvents] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [sortOption, setSortOption] = useState('date');
  const [registeredEventIds, setRegisteredEventIds] = useState(new Set());
  const [bookmarkedIds, setBookmarkedIds] = useState(new Set());
  const [, setTick] = useState(0);

  // Modal State
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [registering, setRegistering] = useState(false);

  const isStudent = user && user.role === 'student';

  useMinuteTick(setTick);

  // Wait for the user to stop typing before searching
  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(searchText.trim()), 300);
    return () => clearTimeout(id);
  }, [searchText]);

  // Back to the first page whenever the filters change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, selectedCategory, sortOption]);

  // Load one page of events (silent = no loading state, used for live refreshes)
  const loadEvents = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      try {
        const data = await api.getEvents({
          category: selectedCategory,
          search: debouncedSearch,
          sort: sortOption,
          page,
          limit: PAGE_SIZE
        });
        setEvents(data.events || []);
        setTotal(data.total || 0);
        setPages(data.pages || 1);
        setSelectedEvent((current) => {
          if (!current) return current;
          return (data.events || []).find((e) => e.id === current.id) || current;
        });
      } catch (err) {
        console.error('Error fetching events:', err);
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [selectedCategory, debouncedSearch, sortOption, page]
  );

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  // Seat counts update live when anyone registers or cancels
  useLiveEvents(() => loadEvents(true));

  // Student registrations and bookmarks
  useEffect(() => {
    if (!isStudent) {
      setRegisteredEventIds(new Set());
      setBookmarkedIds(new Set());
      return;
    }
    api
      .getMyRegistrations()
      .then((data) => {
        setRegisteredEventIds(
          new Set((data.registrations || []).filter((r) => r.status === 'Confirmed').map((r) => r.eventId))
        );
      })
      .catch((err) => console.warn('Could not load student registrations:', err));
    api
      .getBookmarks()
      .then((data) => setBookmarkedIds(new Set(data.eventIds || [])))
      .catch((err) => console.warn('Could not load bookmarks:', err));
  }, [isStudent]);

  const handleRegister = async (eventId) => {
    setRegistering(true);
    try {
      const res = await api.registerForEvent(eventId);
      if (res && res.success) {
        onShowToast(res.message || 'Registration confirmed!', 'success');
        setRegisteredEventIds((prev) => new Set([...prev, eventId]));
        await loadEvents(true);
      }
    } catch (err) {
      onShowToast(err.message || 'Registration failed.', 'error');
    } finally {
      setRegistering(false);
    }
  };

  const handleToggleBookmark = async (eventId) => {
    const wasSaved = bookmarkedIds.has(eventId);
    try {
      const res = wasSaved ? await api.removeBookmark(eventId) : await api.addBookmark(eventId);
      setBookmarkedIds((prev) => {
        const next = new Set(prev);
        if (wasSaved) next.delete(eventId);
        else next.add(eventId);
        return next;
      });
      onShowToast(res.message, 'success');
    } catch (err) {
      onShowToast(err.message || 'Could not update bookmark.', 'error');
    }
  };

  const handleOpenModal = (event) => {
    setSelectedEvent(event);
    setIsModalOpen(true);
  };

  return (
    <main>
      {/* ============ PAGE HEADER ============ */}
      <section className="page-header">
        <div className="container">
          <h1>Upcoming Events</h1>
          <p>Browse and discover every technical, cultural, sports and workshop event happening on campus.</p>
        </div>
      </section>

      <div className="container">
        {/* ============ SEARCH + FILTER BAR ============ */}
        <form className="filter-bar" onSubmit={(e) => e.preventDefault()}>
          <div className="search-box">
            <span className="icon">🔍</span>
            <input
              type="text"
              placeholder="Search events by name, description, venue..."
              value={searchText}
              maxLength={100}
              onChange={(e) => setSearchText(e.target.value)}
              aria-label="Search events"
            />
          </div>
          <div className="filter-chip-group" aria-label="Filter events by category">
            {['All', 'Technical', 'Cultural', 'Sports', 'Workshop'].map((cat) => (
              <button
                key={cat}
                type="button"
                className={`filter-chip ${selectedCategory.toLowerCase() === cat.toLowerCase() ? 'active' : ''}`}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat === 'Workshop' ? 'Workshops' : cat}
              </button>
            ))}
          </div>
          <select
            className="filter-select"
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value)}
            aria-label="Sort events"
          >
            <option value="date">Sort by: Date</option>
            <option value="name">Sort by: Name (A-Z)</option>
          </select>
        </form>

        {/* ============ EVENTS GRID ============ */}
        <section className="events-list">
          <p className="event-count" aria-live="polite">
            Showing {events.length} of {total} events
          </p>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px 0' }}>
              <p>Loading campus events...</p>
            </div>
          ) : events.length === 0 ? (
            <p className="no-results" style={{ display: 'block' }}>
              No matching events found. Try a different search query or category filter.
            </p>
          ) : (
            <div className="events-grid mt-40">
              {events.map((event) => {
                const eventId = event.id || event._id;
                const isRegistered = registeredEventIds.has(eventId);
                const availableSeats =
                  event.availableSeats !== undefined
                    ? event.availableSeats
                    : Math.max(0, event.capacity - (event.registeredCount || 0));
                const isFull = availableSeats <= 0;
                const isClosed = event.status !== 'Upcoming';

                let seatBadgeClass = 'badge-seats';
                if (isFull || isClosed) seatBadgeClass += ' full';
                else if (availableSeats <= 10) seatBadgeClass += ' limited';

                return (
                  <article className="event-card" key={eventId}>
                    <div className="event-card-img">
                      <span className="event-tag">{event.category}</span>
                      {isStudent && (
                        <BookmarkButton
                          saved={bookmarkedIds.has(eventId)}
                          onToggle={() => handleToggleBookmark(eventId)}
                        />
                      )}
                      <img src={event.image} alt={event.title} loading="lazy" />
                    </div>
                    <div className="event-card-body">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '8px' }}>
                        <h3>{event.title}</h3>
                        <span className={seatBadgeClass} title={`Total Capacity: ${event.capacity}`}>
                          {isClosed ? (event.status === 'Completed' ? 'Completed' : 'Closed') : isFull ? 'Full' : `${availableSeats} seats left`}
                        </span>
                      </div>
                      <div style={{ marginBottom: '8px' }}>
                        <TimeBadge event={event} />
                      </div>
                      <div className="event-meta">
                        <span className="icon">📅 {event.date}</span>
                        <span className="icon">⏰ {event.time || '10:00 AM'}</span>
                        <span className="icon">📍 {event.venue}</span>
                      </div>
                      <p className="event-desc">{event.description}</p>
                      <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
                        <button
                          type="button"
                          className="btn btn-secondary btn-small btn-block"
                          onClick={() => handleOpenModal(event)}
                        >
                          View Details
                        </button>
                        {isRegistered && (
                          <span className="badge-status confirmed" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 12px', whiteSpace: 'nowrap' }}>
                            ✓ Registered
                          </span>
                        )}
                      </div>
                      <CalendarLinks event={event} />
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {pages > 1 && (
            <nav className="pager" aria-label="Event pages">
              <button
                type="button"
                className="btn btn-secondary btn-small"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                ← Previous
              </button>
              <span>
                Page {page} of {pages}
              </span>
              <button
                type="button"
                className="btn btn-secondary btn-small"
                disabled={page >= pages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next →
              </button>
            </nav>
          )}
        </section>
      </div>

      {/* ============ EVENT DETAILS MODAL ============ */}
      <EventModal
        event={selectedEvent}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        user={user}
        isRegistered={Boolean(selectedEvent && registeredEventIds.has(selectedEvent.id || selectedEvent._id))}
        onRegister={handleRegister}
        registering={registering}
      />
    </main>
  );
}
