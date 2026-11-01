import React from 'react';
import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-col">
            <Link to="/" className="logo">
              <span className="logo-badge">CH</span>
              CampusHub
            </Link>
            <p>CampusHub is a one-stop platform to discover, register and participate in every college event with ease.</p>
          </div>
          <div className="footer-col">
            <h4>Quick Links</h4>
            <ul>
              <li><Link to="/">Home</Link></li>
              <li><Link to="/events">Events</Link></li>
              <li><Link to="/about">About</Link></li>
            </ul>
          </div>
          <div className="footer-col">
            <h4>Account</h4>
            <ul>
              <li><Link to="/login">Login</Link></li>
              <li><Link to="/register">Register</Link></li>
            </ul>
          </div>
          <div className="footer-col">
            <h4>Contact</h4>
            <p>Student Activity Center<br />Main Campus, Block A<br />contact@campushub.edu</p>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; 2026 CampusHub. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
