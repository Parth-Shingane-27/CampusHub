// ========================================================
// CampusHub 3.0 - Registration Model (Mongoose)
// Represents a student registering for a specific event.
// Uses references to User and Event documents.
// ========================================================

const mongoose = require('mongoose');

const registrationSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: true
    },
    status: {
      type: String,
      enum: ['Confirmed', 'Cancelled'],
      default: 'Confirmed'
    },
    registeredAt: {
      type: String,
      default: () =>
        new Date().toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'short',
          year: 'numeric'
        })
    },
    cancelledAt: {
      type: Date
    }
  },
  {
    timestamps: true
  }
);

// Compound index to optimize finding active registrations and prevent duplicates
registrationSchema.index({ student: 1, event: 1, status: 1 });

const Registration =
  mongoose.models.Registration || mongoose.model('Registration', registrationSchema);

module.exports = Registration;
