// ========================================================
// CampusHub 3.0 - Event Routes (Express)
// Public endpoints for event catalog, searching, filtering,
// sorting, pagination, live updates and seat capacity.
// ========================================================

const express = require('express');
const { effectiveStatus, getEventStart, getEventEnd, toLocalIso } = require('../utils/eventTime');
const { addClient } = require('../utils/liveUpdates');
const { validObjectId, escapeRegex, intParam } = require('../middleware/validate');
const Event = require('../models/Event');
const Registration = require('../models/Registration');

const router = express.Router();

const CATEGORIES = Event.schema.path('category').enumValues;

function serializeEvent(evt, confirmedCount) {
  return {
    id: evt._id.toString(),
    _id: evt._id.toString(),
    title: evt.title,
    description: evt.description,
    category: evt.category,
    date: evt.date,
    time: evt.time,
    venue: evt.venue,
    capacity: evt.capacity,
    registeredCount: confirmedCount,
    availableSeats: Math.max(0, (evt.capacity || 50) - confirmedCount),
    status: effectiveStatus(evt),
    startsAt: toLocalIso(getEventStart(evt)),
    endsAt: toLocalIso(getEventEnd(evt)),
    image: evt.image,
    createdAt: evt.createdAt
  };
}

// --------------------------------------------------------
// 0. GET /api/events/stream — Live change notifications (SSE)
// --------------------------------------------------------
router.get('/stream', (req, res) => addClient(req, res));

// --------------------------------------------------------
// 1. GET /api/events — Public catalog with search, filter, sort, pagination
//    ?category=&search=&sort=date|name&page=1&limit=12
//    Without "limit" every matching event is returned.
// --------------------------------------------------------
router.get('/', async (req, res) => {
  try {
    const { category, search, sort } = req.query;

    if (category && category !== 'All' && !CATEGORIES.includes(category)) {
      return res.status(400).json({ success: false, message: 'Unknown event category.' });
    }
    if (search && String(search).length > 100) {
      return res.status(400).json({ success: false, message: 'Search text is too long.' });
    }

    const query = {};

    if (category && category !== 'All') {
      query.category = category;
    }

    if (search && String(search).trim()) {
      const q = escapeRegex(String(search).trim());
      query.$or = [
        { title: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
        { venue: { $regex: q, $options: 'i' } }
      ];
    }

    const sortOption = sort === 'name' ? { title: 1 } : { date: 1, title: 1 };

    const paginated = req.query.limit !== undefined;
    const limit = intParam(req.query.limit, 12, 1, 50);
    const page = intParam(req.query.page, 1, 1, 100000);

    const total = await Event.countDocuments(query);
    let finder = Event.find(query).sort(sortOption);
    if (paginated) finder = finder.skip((page - 1) * limit).limit(limit);
    const events = await finder;

    // Seat availability for every event on this page in a single query
    const counts = await Registration.aggregate([
      { $match: { event: { $in: events.map(e => e._id) }, status: 'Confirmed' } },
      { $group: { _id: '$event', count: { $sum: 1 } } }
    ]);
    const countMap = new Map(counts.map(c => [String(c._id), c.count]));

    const enrichedEvents = events.map(evt => serializeEvent(evt, countMap.get(String(evt._id)) || 0));

    return res.status(200).json({
      success: true,
      count: enrichedEvents.length,
      total,
      page: paginated ? page : 1,
      pages: paginated ? Math.max(1, Math.ceil(total / limit)) : 1,
      events: enrichedEvents
    });

  } catch (error) {
    console.error('Error fetching events:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while loading events.'
    });
  }
});

// --------------------------------------------------------
// 2. GET /api/events/:id — Single event details
// --------------------------------------------------------
router.get('/:id', validObjectId(), async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found.'
      });
    }

    const confirmedCount = await Registration.countDocuments({
      event: event._id,
      status: 'Confirmed'
    });

    return res.status(200).json({
      success: true,
      event: serializeEvent(event, confirmedCount)
    });

  } catch (error) {
    console.error('Error fetching event by ID:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while loading the event.'
    });
  }
});

module.exports = router;
