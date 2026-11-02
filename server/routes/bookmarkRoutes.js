// ========================================================
// CampusHub - Bookmark Routes (Express)
// Lets students save events they are interested in.
// ========================================================

const express = require('express');
const mongoose = require('mongoose');
const User = require('../models/User');
const Event = require('../models/Event');
const { requireStudent } = require('../middleware/authMiddleware');
const { effectiveStatus, getEventStart, getEventEnd, toLocalIso } = require('../utils/eventTime');

const router = express.Router();

// --------------------------------------------------------
// 1. GET /api/bookmarks — Saved events (with details)
// --------------------------------------------------------
router.get('/', requireStudent, async (req, res) => {
  try {
    const user = await User.findById(req.session.user.id).populate('bookmarks');
    const events = (user ? user.bookmarks : [])
      .filter(Boolean) // events deleted since being saved populate as null
      .map(evt => ({
        id: evt._id.toString(),
        title: evt.title,
        category: evt.category,
        date: evt.date,
        time: evt.time,
        venue: evt.venue,
        description: evt.description,
        status: effectiveStatus(evt),
        startsAt: toLocalIso(getEventStart(evt)),
        endsAt: toLocalIso(getEventEnd(evt))
      }));

    return res.status(200).json({
      success: true,
      count: events.length,
      eventIds: events.map(e => e.id),
      events
    });
  } catch (error) {
    console.error('Error loading bookmarks:', error);
    return res.status(500).json({ success: false, message: 'Server error loading saved events.' });
  }
});

// --------------------------------------------------------
// 2. POST /api/bookmarks/:eventId — Save an event
// --------------------------------------------------------
router.post('/:eventId', requireStudent, async (req, res) => {
  try {
    const { eventId } = req.params;
    if (!mongoose.isValidObjectId(eventId) || !(await Event.exists({ _id: eventId }))) {
      return res.status(404).json({ success: false, message: 'Event not found.' });
    }

    await User.updateOne({ _id: req.session.user.id }, { $addToSet: { bookmarks: eventId } });
    return res.status(200).json({ success: true, message: 'Event saved to your bookmarks.' });
  } catch (error) {
    console.error('Error saving bookmark:', error);
    return res.status(500).json({ success: false, message: 'Server error saving the event.' });
  }
});

// --------------------------------------------------------
// 3. DELETE /api/bookmarks/:eventId — Remove a saved event
// --------------------------------------------------------
router.delete('/:eventId', requireStudent, async (req, res) => {
  try {
    const { eventId } = req.params;
    if (!mongoose.isValidObjectId(eventId)) {
      return res.status(404).json({ success: false, message: 'Event not found.' });
    }

    await User.updateOne({ _id: req.session.user.id }, { $pull: { bookmarks: eventId } });
    return res.status(200).json({ success: true, message: 'Event removed from your bookmarks.' });
  } catch (error) {
    console.error('Error removing bookmark:', error);
    return res.status(500).json({ success: false, message: 'Server error removing the event.' });
  }
});

module.exports = router;
