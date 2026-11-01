// ========================================================
// CampusHub - Student Dashboard Script (student-dashboard.js)
// Loads student registrations, stats, and profile details.
// Enables cancelling registrations and editing profile info.
// ========================================================

let currentStudent = null;

// DOM Elements
const welcomeName = document.getElementById("welcome-name");
const welcomeSubtext = document.getElementById("welcome-subtext");
const statTotalEvents = document.getElementById("stat-total-events");
const statMyRegistrations = document.getElementById("stat-my-registrations");
const statYearDisplay = document.getElementById("stat-year-display");
const registrationsContainer = document.getElementById("student-registrations-container");
const registrationsCountBadge = document.getElementById("registrations-count-badge");
const studentLogoutBtn = document.getElementById("student-logout-btn");

// Profile elements
const profileViewMode = document.getElementById("profile-view-mode");
const profileEditForm = document.getElementById("profile-edit-form");
const toggleEditBtn = document.getElementById("toggle-edit-profile-btn");
const cancelEditBtn = document.getElementById("cancel-edit-profile-btn");
const profileMessage = document.getElementById("profile-message");

const profileName = document.getElementById("profile-name");
const profileEmail = document.getElementById("profile-email");
const profileCollegeId = document.getElementById("profile-college-id");
const profileYear = document.getElementById("profile-year");

const editFullname = document.getElementById("edit-fullname");
const editCollegeid = document.getElementById("edit-collegeid");
const editYear = document.getElementById("edit-year");

// --------------------------------------------------------
// 1. Check Authentication & Initialize Dashboard
// --------------------------------------------------------
async function initStudentDashboard() {
  try {
    const authRes = await fetch("/api/auth/me");
    if (!authRes.ok) {
      window.location.href = "login.html?redirect=student-dashboard.html";
      return;
    }

    const authData = await authRes.json();
    if (!authData.isAuthenticated || !authData.user) {
      window.location.href = "login.html?redirect=student-dashboard.html";
      return;
    }

    if (authData.user.role === "admin") {
      window.location.href = "admin-dashboard.html";
      return;
    }

    currentStudent = authData.user;
    renderProfileDetails();

    // Fetch dashboard stats & registrations
    await loadStudentStats();
    await loadStudentRegistrations();

  } catch (error) {
    console.error("Dashboard initialization error:", error);
  }
}

// --------------------------------------------------------
// 2. Render Profile Details
// --------------------------------------------------------
function renderProfileDetails() {
  if (!currentStudent) return;

  welcomeName.textContent = `Welcome, ${currentStudent.fullName}!`;
  welcomeSubtext.textContent = `${currentStudent.yearOfStudy || 'Student'} • ${currentStudent.collegeId} • ${currentStudent.email}`;

  profileName.textContent = currentStudent.fullName;
  profileEmail.textContent = currentStudent.email;
  profileCollegeId.textContent = currentStudent.collegeId;
  profileYear.textContent = currentStudent.yearOfStudy || '3rd Year';
  statYearDisplay.textContent = currentStudent.yearOfStudy || '3rd Year';

  // Pre-fill edit inputs
  editFullname.value = currentStudent.fullName;
  editCollegeid.value = currentStudent.collegeId;
  if (currentStudent.yearOfStudy) {
    editYear.value = currentStudent.yearOfStudy;
  }
}

// --------------------------------------------------------
// 3. Load Stats (Total Events & Registered Count)
// --------------------------------------------------------
async function loadStudentStats() {
  try {
    const res = await fetch("/api/student/stats");
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.stats) {
        statTotalEvents.textContent = data.stats.totalEvents || 0;
        statMyRegistrations.textContent = data.stats.myRegistrationsCount || 0;
      }
    }
  } catch (error) {
    console.warn("Could not load student stats:", error);
  }
}

// --------------------------------------------------------
// 4. Load Student Registrations
// --------------------------------------------------------
async function loadStudentRegistrations() {
  if (!registrationsContainer) return;

  try {
    const res = await fetch("/api/student/registrations");
    if (!res.ok) {
      registrationsContainer.innerHTML = `
        <div class="empty-state">
          <p style="color: #ef4444;">Error loading your registrations. Please refresh.</p>
        </div>
      `;
      return;
    }

    const data = await res.json();
    const registrations = data.registrations || [];

    const confirmedCount = registrations.filter(r => r.status === "Confirmed").length;
    if (registrationsCountBadge) {
      registrationsCountBadge.textContent = `${confirmedCount} Confirmed`;
    }

    if (registrations.length === 0) {
      registrationsContainer.innerHTML = `
        <div class="empty-state">
          <span class="empty-state-icon">🎟️</span>
          <h3>No event registrations yet</h3>
          <p>You haven't registered for any campus events yet. Explore upcoming hackathons, cultural nights, and workshops!</p>
          <a href="events.html" class="btn btn-primary btn-small">Explore Upcoming Events</a>
        </div>
      `;
      return;
    }

    // Build registrations card list
    let html = '<div style="display: flex; flex-direction: column; gap: 16px;">';

    registrations.forEach(reg => {
      const isConfirmed = reg.status === "Confirmed";
      const statusClass = isConfirmed ? "confirmed" : "cancelled";

      html += `
        <div style="background: #fff; border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 18px 20px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 14px; box-shadow: 0 1px 4px rgba(0,0,0,0.04);">
          <div>
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
              <span class="event-tag" style="margin: 0; font-size: 0.72rem;">${escapeHtml(reg.eventCategory || 'General')}</span>
              <span class="badge-status ${statusClass}">${escapeHtml(reg.status)}</span>
            </div>
            <h4 style="font-size: 1.15rem; color: var(--dark); margin-bottom: 6px;">${escapeHtml(reg.eventTitle)}</h4>
            <div style="display: flex; flex-wrap: wrap; gap: 16px; font-size: 0.85rem; color: var(--text-light);">
              <span>📅 ${escapeHtml(reg.eventDate || 'TBA')}</span>
              <span>📍 ${escapeHtml(reg.eventVenue || 'Campus')}</span>
              <span>🕒 Registered: ${escapeHtml(reg.registeredAt || 'Recent')}</span>
            </div>
          </div>
          <div>
            ${isConfirmed ? `
              <button type="button" class="btn-action btn-action-danger cancel-reg-btn" data-id="${reg.id}" data-title="${escapeHtml(reg.eventTitle)}">
                Cancel Registration
              </button>
            ` : `
              <span style="font-size: 0.82rem; color: var(--text-light); font-style: italic;">Cancelled</span>
            `}
          </div>
        </div>
      `;
    });

    html += '</div>';
    registrationsContainer.innerHTML = html;

    // Attach click listeners to Cancel buttons
    const cancelButtons = registrationsContainer.querySelectorAll(".cancel-reg-btn");
    cancelButtons.forEach(btn => {
      btn.addEventListener("click", () => handleCancelRegistration(btn.dataset.id, btn.dataset.title));
    });

  } catch (error) {
    console.error("Error loading registrations:", error);
    registrationsContainer.innerHTML = `
      <div class="empty-state">
        <p style="color: #ef4444;">Unable to connect to server. Please try again later.</p>
      </div>
    `;
  }
}

// --------------------------------------------------------
// 5. Handle Cancel Registration
// --------------------------------------------------------
async function handleCancelRegistration(regId, eventTitle) {
  const confirmed = confirm(`Are you sure you want to cancel your registration for "${eventTitle}"? Your seat will be made available for other students.`);
  if (!confirmed) return;

  try {
    const res = await fetch(`/api/student/registrations/${regId}/cancel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" }
    });

    const data = await res.json();

    if (res.ok && data.success) {
      if (typeof showToast === "function") {
        showToast(data.message || "Registration cancelled successfully.", "success");
      } else {
        alert(data.message || "Registration cancelled.");
      }
      await loadStudentStats();
      await loadStudentRegistrations();
    } else {
      if (typeof showToast === "function") {
        showToast(data.message || "Could not cancel registration.", "error");
      } else {
        alert(data.message || "Could not cancel registration.");
      }
    }

  } catch (error) {
    console.error("Error cancelling registration:", error);
    if (typeof showToast === "function") {
      showToast("Server error. Please try again.", "error");
    }
  }
}

// --------------------------------------------------------
// 6. Handle Profile Edit & Submission
// --------------------------------------------------------
if (toggleEditBtn) {
  toggleEditBtn.addEventListener("click", () => {
    profileViewMode.style.display = "none";
    profileEditForm.style.display = "block";
    toggleEditBtn.style.display = "none";
  });
}

if (cancelEditBtn) {
  cancelEditBtn.addEventListener("click", () => {
    profileEditForm.style.display = "none";
    profileViewMode.style.display = "block";
    toggleEditBtn.style.display = "inline-block";
    profileMessage.textContent = "";
  });
}

if (profileEditForm) {
  profileEditForm.addEventListener("submit", async function (e) {
    e.preventDefault();

    const newName = editFullname.value.trim();
    const newCollegeId = editCollegeid.value.trim();
    const newYear = editYear.value;

    if (!newName || newName.length < 2) {
      profileMessage.textContent = "Full name must be at least 2 characters.";
      profileMessage.className = "form-message error";
      return;
    }

    if (!newCollegeId || newCollegeId.length < 2) {
      profileMessage.textContent = "College ID must be at least 2 characters.";
      profileMessage.className = "form-message error";
      return;
    }

    try {
      const res = await fetch("/api/auth/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: newName,
          collegeId: newCollegeId,
          yearOfStudy: newYear
        })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        currentStudent = data.user;
        renderProfileDetails();

        profileEditForm.style.display = "none";
        profileViewMode.style.display = "block";
        toggleEditBtn.style.display = "inline-block";

        if (typeof showToast === "function") {
          showToast("Profile updated successfully!", "success");
        }
      } else {
        profileMessage.textContent = data.message || "Failed to update profile.";
        profileMessage.className = "form-message error";
      }

    } catch (err) {
      console.error("Profile update error:", err);
      profileMessage.textContent = "Server error while saving profile.";
      profileMessage.className = "form-message error";
    }
  });
}

// Logout handler
if (studentLogoutBtn) {
  studentLogoutBtn.addEventListener("click", handleLogout);
}

// Helper: Escape HTML string
function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Initialize on page load
document.addEventListener("DOMContentLoaded", initStudentDashboard);
