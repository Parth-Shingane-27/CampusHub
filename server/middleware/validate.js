// ========================================================
// CampusHub - Request validation helpers
// ========================================================

const mongoose = require('mongoose');

// Rejects a request whose URL parameter is not a valid MongoDB ObjectId
function validObjectId(param = 'id') {
  return (req, res, next) => {
    if (!mongoose.isValidObjectId(req.params[param])) {
      return res.status(400).json({ success: false, message: 'Invalid identifier.' });
    }
    next();
  };
}

// Escapes user input so it can be placed inside a RegExp literally
function escapeRegex(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Parses an integer query value, clamped to [min, max]; returns fallback if absent/invalid
function intParam(value, fallback, min, max) {
  const n = parseInt(value, 10);
  if (Number.isNaN(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

module.exports = { validObjectId, escapeRegex, intParam };
