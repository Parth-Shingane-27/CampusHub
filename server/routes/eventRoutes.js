// ========================================================
// CampusHub 3.0 - Event Routes (Express)
// Public endpoints for event catalog, searching, filtering,
// sorting, and dynamic seat capacity calculation.
// ========================================================

const express = require('express');
const { effectiveStatus } = require('../utils/eventTime');
const Event = require('../models/Event');
const Registration = require('../models/Registration');

const router = express.Router();

// --------------------------------------------------------
// 1. GET /api/events — Public catalog with search, filter, sort
// --------------------------------------------------------
router.get('/', async (req, res) => {
  try {
    const { category, search, sort } = req.query;

    let query = {};

    // 1. Filter by category
    if (category && category !== 'All') {
      query.category = new RegExp(`^${category}$`, 'i');
    }

    // 2. Search query (matches title, description, or venue)
    if (search && search.trim()) {
      const q = search.trim();
      query.$or = [
        { title: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
        { venue: { $regex: q, $options: 'i' } }
      ];
    }

    // 3. Sorting
    let sortOption = { date: 1 }; // Default: chronological
    if (sort === 'name') {
      sortOption = { title: 1 };
    }

    const events = await Event.find(query).sort(sortOption);

    // 4. Calculate actual seat availability from Registration collection
    const enrichedEvents = await Promise.all(
      events.map(async evt => {
        const confirmedCount = await Registration.countDocuments({
          event: evt._id,
          status: 'Confirmed'
        });

        const available = Math.max(0, (evt.capacity || 50) - confirmedCount);

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
          availableSeats: available,
          status: effectiveStatus(evt),
          image: evt.image,
          createdAt: evt.createdAt
        };
      })
    );

    return res.status(200).json({
      success: true,
      count: enrichedEvents.length,
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
router.get('/:id', async (req, res) => {
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

    const enriched = {
      id: event._id.toString(),
      _id: event._id.toString(),
      title: event.title,
      description: event.description,
      category: event.category,
      date: event.date,
      time: event.time,
      venue: event.venue,
      capacity: event.capacity,
      registeredCount: confirmedCount,
      availableSeats: Math.max(0, event.capacity - confirmedCount),
      status: effectiveStatus(event),
      image: event.image
    };

    return res.status(200).json({
      success: true,
      event: enriched
    });

  } catch (error) {
    console.error('Error fetching event by ID:', error);
    return res.status(500).json({
      success: false,
      message: 'Invalid event identifier or server error.'
    });
  }
});

module.exports = router;
