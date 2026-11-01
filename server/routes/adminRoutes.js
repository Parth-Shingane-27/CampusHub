// ========================================================
// CampusHub 3.0 - Admin Routes (Express)
// Handles event CRUD, registrations supervision,
// search and filtering, and administrative analytics.
// Strictly protected by requireAdmin middleware.
// ========================================================

const express = require('express');
const Event = require('../models/Event');
const Registration = require('../models/Registration');
const User = require('../models/User');
const { requireAdmin } = require('../middleware/authMiddleware');

const router = express.Router();

// Apply requireAdmin to all routes in this file
router.use(requireAdmin);

// --------------------------------------------------------
// 1. GET /api/admin/stats — Statistical overview
// --------------------------------------------------------
router.get('/stats', async (req, res) => {
  try {
    const totalEvents = await Event.countDocuments();
    const upcomingEvents = await Event.countDocuments({ status: 'Upcoming' });
    const totalRegistrations = await Registration.countDocuments({ status: 'Confirmed' });
    const totalStudents = await User.countDocuments({ role: 'student' });

    return res.status(200).json({
      success: true,
      stats: {
        totalEvents,
        upcomingEvents,
        totalRegistrations,
        totalStudents
      }
    });

  } catch (error) {
    console.error('Error fetching admin stats:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error loading admin statistics.'
    });
  }
});

// --------------------------------------------------------
// GET /api/admin/students — All registered student accounts
// --------------------------------------------------------
router.get('/students', async (req, res) => {
  try {
    const students = await User.find({ role: 'student' }).sort({ createdAt: -1 });
    const counts = await Registration.aggregate([
      { $match: { status: 'Confirmed' } },
      { $group: { _id: '$student', count: { $sum: 1 } } }
    ]);
    const countMap = new Map(counts.map(c => [String(c._id), c.count]));

    return res.status(200).json({
      success: true,
      count: students.length,
      students: students.map(u => ({
        id: u._id.toString(),
        name: u.name,
        email: u.email,
        collegeId: u.collegeId,
        yearOfStudy: u.yearOfStudy,
        joinedAt: u.createdAt ? u.createdAt.toISOString().slice(0, 10) : '',
        eventsRegistered: countMap.get(u._id.toString()) || 0
      }))
    });
  } catch (error) {
    console.error('Error fetching students:', error);
    return res.status(500).json({ success: false, message: 'Server error loading students.' });
  }
});

// --------------------------------------------------------
// PUT /api/admin/students/:id — Edit a student's profile
// --------------------------------------------------------
router.put('/students/:id', async (req, res) => {
  try {
    const student = await User.findOne({ _id: req.params.id, role: 'student' });
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found.' });
    }

    const { name, collegeId, yearOfStudy } = req.body;
    const validYears = ['1st Year', '2nd Year', '3rd Year', '4th Year', 'Post-Graduate'];

    if (!name || name.trim().length < 2) {
      return res.status(400).json({ success: false, message: 'Name must contain at least 2 characters.' });
    }
    if (!collegeId || collegeId.trim().length < 2) {
      return res.status(400).json({ success: false, message: 'Please enter a valid College ID.' });
    }
    if (!validYears.includes(yearOfStudy)) {
      return res.status(400).json({ success: false, message: 'Please select a valid year of study.' });
    }

    student.name = name.trim();
    student.collegeId = collegeId.trim();
    student.yearOfStudy = yearOfStudy;
    await student.save();

    return res.status(200).json({ success: true, message: `${student.name} updated.` });
  } catch (error) {
    console.error('Error updating student:', error);
    return res.status(500).json({ success: false, message: 'Server error updating student.' });
  }
});

// --------------------------------------------------------
// DELETE /api/admin/students/:id — Remove a student and their registrations
// --------------------------------------------------------
router.delete('/students/:id', async (req, res) => {
  try {
    const student = await User.findOne({ _id: req.params.id, role: 'student' });
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found.' });
    }

    await Registration.deleteMany({ student: student._id });
    await User.findByIdAndDelete(student._id);

    return res.status(200).json({
      success: true,
      message: `${student.name} and their registrations were removed.`
    });
  } catch (error) {
    console.error('Error deleting student:', error);
    return res.status(500).json({ success: false, message: 'Server error deleting student.' });
  }
});

// --------------------------------------------------------
// 2. GET /api/admin/registrations — View & filter all registrations
// --------------------------------------------------------
router.get('/registrations', async (req, res) => {
  try {
    const { search, event } = req.query;

    let query = {};
    if (event && event !== 'All') {
      query.event = event;
    }

    const registrations = await Registration.find(query)
      .populate('student', 'name email collegeId yearOfStudy')
      .populate('event', 'title category date venue')
      .sort({ createdAt: -1 });

    let filtered = registrations.map(r => ({
      id: r._id.toString(),
      _id: r._id.toString(),
      studentName: r.student ? r.student.name : 'Unknown Student',
      studentEmail: r.student ? r.student.email : 'N/A',
      collegeId: r.student ? r.student.collegeId : 'N/A',
      yearOfStudy: r.student ? r.student.yearOfStudy : 'N/A',
      eventId: r.event ? r.event._id.toString() : null,
      eventTitle: r.event ? r.event.title : 'Deleted Event',
      eventCategory: r.event ? r.event.category : 'General',
      eventDate: r.event ? r.event.date : 'N/A',
      eventVenue: r.event ? r.event.venue : 'N/A',
      status: r.status,
      registeredAt: r.registeredAt,
      createdAt: r.createdAt
    }));

    // Filter by student name, email, or collegeId if search query provided
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      filtered = filtered.filter(
        r =>
          r.studentName.toLowerCase().includes(q) ||
          r.studentEmail.toLowerCase().includes(q) ||
          r.collegeId.toLowerCase().includes(q) ||
          r.eventTitle.toLowerCase().includes(q)
      );
    }

    return res.status(200).json({
      success: true,
      count: filtered.length,
      registrations: filtered
    });

  } catch (error) {
    console.error('Error loading admin registrations:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error loading student registrations.'
    });
  }
});

// --------------------------------------------------------
// 3. DELETE /api/admin/registrations/:id — Remove a registration
// --------------------------------------------------------
router.delete('/registrations/:id', async (req, res) => {
  try {
    const reg = await Registration.findById(req.params.id)
      .populate('student', 'name')
      .populate('event', 'title');

    if (!reg) {
      return res.status(404).json({
        success: false,
        message: 'Registration record not found.'
      });
    }

    const studentName = reg.student ? reg.student.name : 'Student';
    await Registration.findByIdAndDelete(req.params.id);

    return res.status(200).json({
      success: true,
      message: `Registration for ${studentName} removed.`
    });

  } catch (error) {
    console.error('Error removing registration:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error removing registration.'
    });
  }
});

// --------------------------------------------------------
// 4. POST /api/admin/events — Create a new event
// --------------------------------------------------------
router.post('/events', async (req, res) => {
  try {
    const { title, category, date, time, venue, description, capacity, image, status } = req.body;

    if (!title || title.trim().length < 3) {
      return res.status(400).json({ success: false, message: 'Event title must be at least 3 characters.' });
    }
    if (!category) {
      return res.status(400).json({ success: false, message: 'Please select an event category.' });
    }
    if (!date) {
      return res.status(400).json({ success: false, message: 'Please specify an event date.' });
    }
    if (!venue || venue.trim().length < 2) {
      return res.status(400).json({ success: false, message: 'Please provide an event venue.' });
    }

    const numCapacity = parseInt(capacity, 10);
    if (isNaN(numCapacity) || numCapacity <= 0) {
      return res.status(400).json({ success: false, message: 'Capacity must be a positive integer.' });
    }

    const newEvent = await Event.create({
      title: title.trim(),
      category: category.trim(),
      date: date.trim(),
      time: time ? time.trim() : '10:00 AM',
      venue: venue.trim(),
      description: description ? description.trim() : 'No description provided.',
      capacity: numCapacity,
      status: status || 'Upcoming',
      image: image && image.trim() ? image.trim() : 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=500&q=80'
    });

    return res.status(201).json({
      success: true,
      message: 'New event created successfully!',
      event: {
        id: newEvent._id.toString(),
        _id: newEvent._id.toString(),
        title: newEvent.title,
        category: newEvent.category,
        date: newEvent.date,
        time: newEvent.time,
        venue: newEvent.venue,
        capacity: newEvent.capacity,
        status: newEvent.status,
        image: newEvent.image,
        availableSeats: newEvent.capacity
      }
    });

  } catch (error) {
    console.error('Error creating event:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while creating event.'
    });
  }
});

// --------------------------------------------------------
// 5. PUT /api/admin/events/:id — Edit an existing event
// --------------------------------------------------------
router.put('/events/:id', async (req, res) => {
  try {
    const { title, category, date, time, venue, description, capacity, image, status } = req.body;

    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found.' });
    }

    if (title) event.title = title.trim();
    if (category) event.category = category.trim();
    if (date) event.date = date.trim();
    if (time) event.time = time.trim();
    if (venue) event.venue = venue.trim();
    if (description) event.description = description.trim();
    if (image) event.image = image.trim();
    if (status) event.status = status.trim();

    if (capacity !== undefined) {
      const numCapacity = parseInt(capacity, 10);
      if (!isNaN(numCapacity) && numCapacity > 0) {
        event.capacity = numCapacity;
      }
    }

    await event.save();

    return res.status(200).json({
      success: true,
      message: 'Event updated successfully!',
      event: {
        id: event._id.toString(),
        _id: event._id.toString(),
        title: event.title,
        category: event.category,
        date: event.date,
        time: event.time,
        venue: event.venue,
        capacity: event.capacity,
        status: event.status,
        image: event.image
      }
    });

  } catch (error) {
    console.error('Error updating event:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while updating event.'
    });
  }
});

// --------------------------------------------------------
// 6. DELETE /api/admin/events/:id — Delete an event
// --------------------------------------------------------
router.delete('/events/:id', async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found.' });
    }

    await Event.findByIdAndDelete(req.params.id);

    // Update linked registrations to Cancelled
    await Registration.updateMany({ event: req.params.id }, { status: 'Cancelled', cancelledAt: new Date() });

    return res.status(200).json({
      success: true,
      message: `Event "${event.title}" deleted successfully.`
    });

  } catch (error) {
    console.error('Error deleting event:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while deleting event.'
    });
  }
});

module.exports = router;
