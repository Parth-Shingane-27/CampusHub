// ========================================================
// CampusHub 3.0 - User Model (Mongoose)
// Represents both Student and Administrator accounts.
// Passwords stored as bcrypt hashes; emails normalized.
// ========================================================

const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please enter your full name'],
      trim: true,
      minlength: [2, 'Name must contain at least 2 characters']
    },
    email: {
      type: String,
      required: [true, 'Please enter an email address'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please enter a valid email address']
    },
    collegeId: {
      type: String,
      required: [true, 'Please enter your College ID'],
      trim: true
    },
    yearOfStudy: {
      type: String,
      enum: ['1st Year', '2nd Year', '3rd Year', '4th Year', 'Post-Graduate', 'Faculty / Admin'],
      default: '3rd Year'
    },
    password: {
      type: String,
      required: [true, 'Please enter a password'],
      minlength: [8, 'Password must contain at least 8 characters']
    },
    role: {
      type: String,
      enum: ['student', 'admin'],
      default: 'student'
    },
    bookmarks: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Event' }]
  },
  {
    timestamps: true
  }
);

// Method to remove sensitive fields when converting to JSON
userSchema.methods.toJSON = function () {
  const user = this.toObject();
  delete user.password;
  return user;
};

const User = mongoose.models.User || mongoose.model('User', userSchema);

module.exports = User;
