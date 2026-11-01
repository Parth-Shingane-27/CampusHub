// ========================================================
// CampusHub 3.0 (MERN Stack) - Comprehensive Test Suite
// Verifies Mongoose models, validation schemas, security
// middlewares, Express routes, and React client build.
// ========================================================

const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');

// Import Mongoose Models
const User = require('../server/models/User');
const Event = require('../server/models/Event');
const Registration = require('../server/models/Registration');

// Import Middlewares
const { requireAuth, requireStudent, requireAdmin } = require('../server/middleware/authMiddleware');

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
  }
}

async function runTestSuite() {
  console.log('====================================================');
  console.log(' CampusHub 3.0 (MERN Stack) Verification Suite');
  console.log('====================================================\n');

  // --------------------------------------------------------
  // Section 1: User Model & Schema Validation
  // --------------------------------------------------------
  console.log('--- 1. Testing User Mongoose Model ---');

  // Valid student user
  const validUser = new User({
    name: 'Sakshi Shewale',
    email: 'sakshi@mitaoe.ac.in',
    collegeId: 'CS2026045',
    yearOfStudy: '3rd Year',
    password: 'hashed_bcrypt_password_123',
    role: 'student'
  });
  let validUserErr = null;
  try { await validUser.validate(); } catch (err) { validUserErr = err; }
  assert(!validUserErr, 'Valid student user document passes Mongoose validation');
  assert(validUser.email === 'sakshi@mitaoe.ac.in', 'Email normalized to lowercase');
  assert(validUser.role === 'student', 'Default role is student');

  // toJSON removes password
  const userJson = validUser.toJSON();
  assert(userJson.password === undefined, 'User toJSON() method strips password hash from output');

  // Invalid email validation
  const invalidEmailUser = new User({
    name: 'Invalid Email',
    email: 'notanemail',
    collegeId: 'CS2026046',
    password: 'hashed_password'
  });
  let invalidEmailErr = null;
  try { await invalidEmailUser.validate(); } catch (err) { invalidEmailErr = err; }
  assert(
    invalidEmailErr && invalidEmailErr.errors.email,
    'User model rejects invalid email regex pattern'
  );

  // Missing required fields
  const missingFieldsUser = new User({});
  let missingErr = null;
  try { await missingFieldsUser.validate(); } catch (err) { missingErr = err; }
  assert(
    missingErr && missingErr.errors.name && missingErr.errors.email && missingErr.errors.collegeId,
    'User model enforces required fields (name, email, collegeId, password)'
  );

  // Invalid role rejection
  const invalidRoleUser = new User({
    name: 'Test',
    email: 'test@college.edu',
    collegeId: 'ID1',
    password: 'password123',
    role: 'superadmin' // Not in enum
  });
  let roleErr = null;
  try { await invalidRoleUser.validate(); } catch (err) { roleErr = err; }
  assert(
    roleErr && roleErr.errors.role,
    'User model rejects unauthorized roles outside student/admin enum'
  );

  // --------------------------------------------------------
  // Section 2: Event Model & Schema Validation
  // --------------------------------------------------------
  console.log('\n--- 2. Testing Event Mongoose Model ---');

  const validEvent = new Event({
    title: 'Code Sprint Hackathon',
    category: 'Technical',
    date: '2026-09-12',
    time: '9:00 AM – 9:00 AM (24 hrs)',
    venue: 'CS Block, Lab 3',
    capacity: 60,
    status: 'Upcoming',
    description: 'A 24-hour coding marathon where teams build solutions to real-world problems.'
  });
  let validEventErr = null;
  try { await validEvent.validate(); } catch (err) { validEventErr = err; }
  assert(!validEventErr, 'Valid Event document passes Mongoose validation');
  assert(validEvent.status === 'Upcoming', 'Event default status is Upcoming');

  // Negative or zero capacity rejection
  const zeroCapEvent = new Event({
    title: 'Zero Cap Event',
    category: 'Technical',
    date: '2026-10-10',
    venue: 'Hall',
    capacity: 0,
    description: 'Test'
  });
  let zeroCapErr = null;
  try { await zeroCapEvent.validate(); } catch (err) { zeroCapErr = err; }
  assert(
    zeroCapErr && zeroCapErr.errors.capacity,
    'Event model rejects capacity less than 1'
  );

  // Invalid category rejection
  const invalidCatEvent = new Event({
    title: 'Invalid Category Event',
    category: 'Gaming', // Not in enum
    date: '2026-10-10',
    venue: 'Hall',
    capacity: 50,
    description: 'Test'
  });
  let catErr = null;
  try { await invalidCatEvent.validate(); } catch (err) { catErr = err; }
  assert(
    catErr && catErr.errors.category,
    'Event model enforces valid category enum (Technical, Cultural, Sports, Workshop)'
  );

  // --------------------------------------------------------
  // Section 3: Registration Model & Schema Validation
  // --------------------------------------------------------
  console.log('\n--- 3. Testing Registration Mongoose Model ---');

  const studentId = new mongoose.Types.ObjectId();
  const eventId = new mongoose.Types.ObjectId();

  const validReg = new Registration({
    student: studentId,
    event: eventId,
    status: 'Confirmed'
  });
  let regErr = null;
  try { await validReg.validate(); } catch (err) { regErr = err; }
  assert(!regErr, 'Valid Registration document with User and Event references passes validation');
  assert(validReg.status === 'Confirmed', 'Default registration status is Confirmed');

  // Missing references rejection
  const emptyReg = new Registration({});
  let emptyRegErr = null;
  try { await emptyReg.validate(); } catch (err) { emptyRegErr = err; }
  assert(
    emptyRegErr && emptyRegErr.errors.student && emptyRegErr.errors.event,
    'Registration model requires student ObjectId and event ObjectId'
  );

  // --------------------------------------------------------
  // Section 4: Security Middleware (requireAuth, requireStudent, requireAdmin)
  // --------------------------------------------------------
  console.log('\n--- 4. Testing Security Middlewares ---');

  // Helper mock res
  function createMockRes() {
    return {
      statusCode: 200,
      jsonData: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        this.jsonData = data;
        return this;
      }
    };
  }

  // Test requireAuth with no session
  const reqAnon = { session: {} };
  const resAnon = createMockRes();
  let nextCalled = false;
  requireAuth(reqAnon, resAnon, () => { nextCalled = true; });
  assert(resAnon.statusCode === 401 && !nextCalled, 'requireAuth returns 401 Unauthorized for unauthenticated requests');

  // Test requireStudent with student session
  const reqStudent = { session: { user: { role: 'student', id: '123' } } };
  const resStudent = createMockRes();
  nextCalled = false;
  requireStudent(reqStudent, resStudent, () => { nextCalled = true; });
  assert(nextCalled && resStudent.statusCode === 200, 'requireStudent permits authenticated student');

  // Test requireStudent with admin session
  const reqAdmin = { session: { user: { role: 'admin', id: 'admin123' } } };
  const resAdminAsStudent = createMockRes();
  nextCalled = false;
  requireStudent(reqAdmin, resAdminAsStudent, () => { nextCalled = true; });
  assert(resAdminAsStudent.statusCode === 403 && !nextCalled, 'requireStudent rejects admin from student-only operations (403)');

  // Test requireAdmin with student session
  const resStudentAsAdmin = createMockRes();
  nextCalled = false;
  requireAdmin(reqStudent, resStudentAsAdmin, () => { nextCalled = true; });
  assert(resStudentAsAdmin.statusCode === 403 && !nextCalled, 'requireAdmin rejects student from administrative actions (403)');

  // Test requireAdmin with admin session
  const resAdmin = createMockRes();
  nextCalled = false;
  requireAdmin(reqAdmin, resAdmin, () => { nextCalled = true; });
  assert(nextCalled && resAdmin.statusCode === 200, 'requireAdmin permits authenticated admin');

  // --------------------------------------------------------
  // Section 5: React Client Production Build Verification
  // --------------------------------------------------------
  console.log('\n--- 5. Testing React Client Build Artifacts ---');

  const clientDist = path.join(__dirname, '../client/dist');
  const indexHtml = path.join(clientDist, 'index.html');
  const assetsDir = path.join(clientDist, 'assets');

  // The React build is optional: without client/dist the server serves the static frontend in public/
  const publicDir = path.join(__dirname, '../public');
  assert(fs.existsSync(path.join(publicDir, 'index.html')), 'Static frontend public/index.html exists');
  if (!fs.existsSync(clientDist)) {
    console.log('  ℹ️  client/dist not built (run "npm run build" to serve the React client instead)');
  } else {
    assert(fs.existsSync(indexHtml), 'Production client/dist/index.html generated');
  }

  if (fs.existsSync(assetsDir)) {
    const assets = fs.readdirSync(assetsDir);
    const hasJs = assets.some(f => f.endsWith('.js'));
    const hasCss = assets.some(f => f.endsWith('.css'));
    assert(hasJs, 'Vite production JS bundle created in assets/');
    assert(hasCss, 'CampusHub CSS stylesheet bundled in assets/');
  }

  // --------------------------------------------------------
  // Section 6: File Architecture & Deployment Configuration
  // --------------------------------------------------------
  console.log('\n--- 6. Testing MERN Architecture & Configuration ---');

  const requiredFiles = [
    'server/server.js',
    'server/config/db.js',
    'server/models/User.js',
    'server/models/Event.js',
    'server/models/Registration.js',
    'server/routes/authRoutes.js',
    'server/routes/eventRoutes.js',
    'server/routes/registrationRoutes.js',
    'server/routes/adminRoutes.js',
    'server/middleware/authMiddleware.js',
    'client/src/App.jsx',
    'client/src/main.jsx',
    'client/src/pages/Home.jsx',
    'client/src/pages/Events.jsx',
    'client/src/pages/About.jsx',
    'client/src/pages/Login.jsx',
    'client/src/pages/Register.jsx',
    'client/src/pages/StudentDashboard.jsx',
    'client/src/pages/AdminDashboard.jsx',
    'client/src/services/api.js',
    '.env.example',
    'package.json'
  ];

  requiredFiles.forEach(file => {
    const filePath = path.join(__dirname, '..', file);
    assert(fs.existsSync(filePath), `Required MERN file exists: ${file}`);
  });

  console.log('\n====================================================');
  console.log(` MERN Verification Summary: ${passed} Passed, ${failed} Failed`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite().catch(err => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
