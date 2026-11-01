// ========================================================
// CampusHub 3.0 - Registration Routes (Express)
// Handles student event registrations, cancellations,
// duplicate prevention, and seat capacity enforcement.
// ========================================================

const express = require('express');
const Registration = require('../models/Registration');
const Event = require('../models/Event');
const { requireStudent } = require('../middleware/authMiddleware');
const { hasEventStarted } = require('../utils/eventTime');

const router = express.Router();

// --------------------------------------------------------
// 1. POST /api/registrations — Register student for an event
// --------------------------------------------------------
router.post('/', requireStudent, async (req, res) => {
  try {
    const { eventId } = req.body;

    if (!eventId) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an event ID to register.'
      });
    }

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'The selected event does not exist.'
      });
    }

    if (event.status === 'Registration Closed' || event.status === 'Completed') {
      return res.status(400).json({
        success: false,
        message: `Registration is currently closed for this event (${event.status}).`
      });
    }

    // Events whose date/time has already passed cannot be registered for
    if (hasEventStarted(event)) {
      return res.status(400).json({
        success: false,
        message: 'This event has already started or finished. Registration is closed.'
      });
    }

    const studentId = req.session.user.id;

    // Check duplicate active registration for this student and event
    const existingReg = await Registration.findOne({
      student: studentId,
      event: event._id,
      status: 'Confirmed'
    });

    if (existingReg) {
      return res.status(409).json({
        success: false,
        message: `You are already registered for "${event.title}".`
      });
    }

    // Server-side seat capacity enforcement
    const confirmedCount = await Registration.countDocuments({
      event: event._id,
      status: 'Confirmed'
    });

    if (confirmedCount >= event.capacity) {
      return res.status(400).json({
        success: false,
        message: 'This event has reached maximum capacity. No seats available.'
      });
    }

    // Create registration record in MongoDB
    const newReg = await Registration.create({
      student: studentId,
      event: event._id,
      status: 'Confirmed'
    });

    return res.status(201).json({
      success: true,
      message: `Successfully registered for "${event.title}"!`,
      registration: {
        id: newReg._id.toString(),
        eventId: event._id.toString(),
        eventTitle: event.title,
        status: newReg.status,
        registeredAt: newReg.registeredAt
      }
    });

  } catch (error) {
    console.error('Registration processing error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error processing event registration.'
    });
  }
});

// --------------------------------------------------------
// 2. GET /api/student/registrations or /api/registrations/my
// --------------------------------------------------------
async function getMyRegistrationsHandler(req, res) {
  try {
    const studentId = req.session.user.id;

    const registrations = await Registration.find({ student: studentId })
      .populate('event')
      .sort({ createdAt: -1 });

    const formatted = registrations.map(r => ({
      id: r._id.toString(),
      _id: r._id.toString(),
      eventId: r.event ? r.event._id.toString() : null,
      eventTitle: r.event ? r.event.title : 'Deleted Event',
      eventCategory: r.event ? r.event.category : 'General',
      eventDate: r.event ? r.event.date : 'N/A',
      eventVenue: r.event ? r.event.venue : 'Campus',
      status: r.status,
      registeredAt: r.registeredAt,
      createdAt: r.createdAt
    }));

    return res.status(200).json({
      success: true,
      count: formatted.length,
      registrations: formatted
    });

  } catch (error) {
    console.error('Error fetching student registrations:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error loading your registrations.'
    });
  }
}

router.get('/my', requireStudent, getMyRegistrationsHandler);
router.get('/', requireStudent, getMyRegistrationsHandler);

// --------------------------------------------------------
// 3. POST or PATCH /api/registrations/:id/cancel
// --------------------------------------------------------
async function cancelRegistrationHandler(req, res) {
  try {
    const regId = req.params.id;
    const studentId = req.session.user.id;

    const reg = await Registration.findById(regId).populate('event');
    if (!reg) {
      return res.status(404).json({
        success: false,
        message: 'Registration record not found.'
      });
    }

    // Ownership check: Student can only cancel their own registration
    if (reg.student.toString() !== studentId) {
      return res.status(403).json({
        success: false,
        message: 'Access forbidden. You cannot cancel another student’s registration.'
      });
    }

    if (reg.status === 'Cancelled') {
      return res.status(400).json({
        success: false,
        message: 'This registration has already been cancelled.'
      });
    }

    reg.status = 'Cancelled';
    reg.cancelledAt = new Date();
    await reg.save();

    const title = reg.event ? reg.event.title : 'Event';

    return res.status(200).json({
      success: true,
      message: `Registration for "${title}" has been cancelled.`
    });

  } catch (error) {
    console.error('Error cancelling registration:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while cancelling registration.'
    });
  }
}

router.post('/:id/cancel', requireStudent, cancelRegistrationHandler);
router.patch('/:id/cancel', requireStudent, cancelRegistrationHandler);

// --------------------------------------------------------
// 4. GET /api/student/stats — Metric counts for Student Dashboard
// --------------------------------------------------------
router.get('/stats', requireStudent, async (req, res) => {
  try {
    const studentId = req.session.user.id;

    const totalEvents = await Event.countDocuments();
    const myRegistrationsCount = await Registration.countDocuments({
      student: studentId,
      status: 'Confirmed'
    });

    return res.status(200).json({
      success: true,
      stats: {
        totalEvents,
        myRegistrationsCount
      }
    });

  } catch (error) {
    console.error('Error loading student stats:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error loading student stats.'
    });
  }
});

module.exports = router;
