// ========================================================
// CampusHub 3.0 - MongoDB Database Connection (Mongoose)
// Connects to MongoDB Atlas via process.env.MONGODB_URI.
// Seeds initial Admin account, demo student, and default campus events.
// ========================================================

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const User = require('../models/User');
const Event = require('../models/Event');
const Registration = require('../models/Registration');

// Default campus events matching the original CampusHub design
const DEFAULT_EVENTS = [
  {
    title: 'Code Sprint Hackathon',
    category: 'Technical',
    date: '2026-09-12',
    time: '9:00 AM – 9:00 AM (24 hrs)',
    venue: 'CS Block, Lab 3',
    description: 'A 24-hour coding marathon where teams build solutions to real-world problems and compete for prizes.',
    image: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=500&q=80',
    capacity: 60,
    status: 'Upcoming'
  },
  {
    title: 'Rhythm Night',
    category: 'Cultural',
    date: '2026-09-18',
    time: '6:30 PM',
    venue: 'Open Air Theatre',
    description: 'An evening of music, dance and drama performed by talented students from every department.',
    image: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?auto=format&fit=crop&w=500&q=80',
    capacity: 200,
    status: 'Upcoming'
  },
  {
    title: 'Inter-College Sports Meet',
    category: 'Sports',
    date: '2026-09-22',
    time: '8:00 AM',
    venue: 'Main Ground',
    description: 'Athletics, football and basketball tournaments between college teams across the region.',
    image: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=500&q=80',
    capacity: 100,
    status: 'Upcoming'
  },
  {
    title: 'AI & Machine Learning Workshop',
    category: 'Workshop',
    date: '2026-09-28',
    time: '10:00 AM',
    venue: 'Seminar Hall 2',
    description: 'Hands-on session covering the basics of AI and machine learning tools, led by industry experts.',
    image: 'https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=500&q=80',
    capacity: 50,
    status: 'Upcoming'
  },
  {
    title: 'Robotics Expo',
    category: 'Technical',
    date: '2026-10-03',
    time: '11:00 AM',
    venue: 'Mechanical Block',
    description: 'Showcasing student-built robots and automation projects with live demonstrations.',
    image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=500&q=80',
    capacity: 80,
    status: 'Upcoming'
  },
  {
    title: 'Art & Photography Exhibition',
    category: 'Cultural',
    date: '2026-10-06',
    time: '4:00 PM',
    venue: 'Art Gallery Hall',
    description: 'A curated exhibition of student artwork, sketches and photography projects.',
    image: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?auto=format&fit=crop&w=500&q=80',
    capacity: 120,
    status: 'Upcoming'
  },
  {
    title: '3x3 Basketball Championship',
    category: 'Sports',
    date: '2026-10-09',
    time: '3:00 PM',
    venue: 'Indoor Sports Complex',
    description: 'Fast-paced 3-on-3 basketball tournament open to all department teams.',
    image: 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?auto=format&fit=crop&w=500&q=80',
    capacity: 40,
    status: 'Upcoming'
  },
  {
    title: 'Public Speaking Bootcamp',
    category: 'Workshop',
    date: '2026-10-14',
    time: '2:00 PM',
    venue: 'Seminar Hall 1',
    description: 'Build confidence and communication skills through guided practice sessions.',
    image: 'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=500&q=80',
    capacity: 45,
    status: 'Upcoming'
  }
];

// Seed initial database records safely without duplicates
async function seedInitialData() {
  try {
    // 1. Ensure Administrator Account Exists
    const adminEmail = (process.env.ADMIN_EMAIL || 'admin@mitaoe.ac.in').toLowerCase().trim();
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@12345';
    const adminName = process.env.ADMIN_NAME || 'Campus Administrator';

    const existingAdmin = await User.findOne({ email: adminEmail });
    if (!existingAdmin) {
      const adminHash = await bcrypt.hash(adminPassword, 10);
      await User.create({
        name: adminName,
        email: adminEmail,
        collegeId: 'FACULTY-001',
        yearOfStudy: 'Faculty / Admin',
        password: adminHash,
        role: 'admin'
      });
      console.log(`[MongoDB] Initialized default Admin account: ${adminEmail}`);
    }

    // 2. Ensure Demo Student Account Exists for effortless faculty evaluation
    const demoStudentEmail = 'sakshi@mitaoe.ac.in';
    const existingStudent = await User.findOne({ email: demoStudentEmail });
    if (!existingStudent) {
      const studentHash = await bcrypt.hash('Student@123', 10);
      await User.create({
        name: 'Sakshi Shewale',
        email: demoStudentEmail,
        collegeId: 'CS2026045',
        yearOfStudy: '3rd Year',
        password: studentHash,
        role: 'student'
      });
      console.log(`[MongoDB] Initialized demo Student account: ${demoStudentEmail}`);
    }

    // 3. Ensure Default Events Exist
    const eventCount = await Event.countDocuments();
    if (eventCount === 0) {
      await Event.insertMany(DEFAULT_EVENTS);
      console.log(`[MongoDB] Seeded ${DEFAULT_EVENTS.length} default campus events.`);
    }
  } catch (seedError) {
    console.error('[MongoDB] Error during initial seeding:', seedError.message);
  }
}

// Connect to MongoDB
async function connectDB() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.warn('⚠️  MONGODB_URI is not set in your .env file.');
    console.warn('   Please configure your MongoDB Atlas connection string in .env:');
    console.warn('   MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/campushub?retryWrites=true&w=majority\n');
    return false;
  }

  try {
    console.log('[MongoDB] Connecting to database...');
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    console.log('[MongoDB] Connected successfully to database.');

    // Drop indexes left over from older schemas (e.g. a unique userId+eventId index
    // that made every new registration fail) and create the ones the models declare
    for (const Model of [User, Event, Registration]) {
      try {
        await Model.syncIndexes();
      } catch (indexError) {
        console.warn(`[MongoDB] Could not sync indexes for ${Model.modelName}:`, indexError.message);
      }
    }

    // Seed data on startup
    await seedInitialData();
    return true;
  } catch (error) {
    console.error('[MongoDB] Connection error:', error.message);
    console.warn('   Check your internet connection, IP whitelist in Atlas, and credentials.');
    return false;
  }
}

module.exports = {
  connectDB,
  seedInitialData
};
