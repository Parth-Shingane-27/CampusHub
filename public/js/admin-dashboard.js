// ========================================================
// CampusHub - Admin Dashboard Script (admin-dashboard.js)
// Handles event CRUD operations, student registrations review,
// search & filter controls, and administrative metrics.
// ========================================================

let currentAdmin = null;
let cachedEvents = [];
let cachedRegistrations = [];

// DOM Elements
const statAdminEvents = document.getElementById("stat-admin-events");
const statAdminUpcoming = document.getElementById("stat-admin-upcoming");
const statAdminRegistrations = document.getElementById("stat-admin-registrations");
const statAdminStudents = document.getElementById("stat-admin-students");
const adminWelcomeTitle = document.getElementById("admin-welcome-title");
const adminLogoutBtn = document.getElementById("admin-logout-btn");

// Tabs
const tabBtnEvents = document.getElementById("tab-btn-events");
const tabBtnRegistrations = document.getElementById("tab-btn-registrations");
const tabBtnStudents = document.getElementById("tab-btn-students");
const studentsTab = document.getElementById("students-tab");
const studentsTableBody = document.getElementById("students-table-body");
const adminStudentsSearch = document.getElementById("admin-students-search");
const adminStudentsCountBadge = document.getElementById("admin-students-count-badge");
const eventsTab = document.getElementById("events-tab");
const registrationsTab = document.getElementById("registrations-tab");

// Events Table
const eventsTableBody = document.getElementById("events-table-body");
const openCreateEventBtn = document.getElementById("open-create-event-btn");
const openCreateEventBtn2 = document.getElementById("open-create-event-btn-2");

// Registrations Table & Filters
const registrationsTableBody = document.getElementById("registrations-table-body");
const adminRegSearch = document.getElementById("admin-reg-search");
const adminRegEventFilter = document.getElementById("admin-reg-event-filter");
const adminRegCountBadge = document.getElementById("admin-reg-count-badge");

// Modal Elements
const eventFormModal = document.getElementById("event-form-modal");
const eventFormClose = document.getElementById("event-form-close");
const eventFormCancelBtn = document.getElementById("event-form-cancel-btn");
const eventFormOverlay = document.getElementById("event-form-overlay");
const eventFormModalTitle = document.getElementById("event-form-modal-title");
const eventCrudForm = document.getElementById("event-crud-form");
const crudFormMessage = document.getElementById("crud-form-message");
const crudSubmitBtn = document.getElementById("crud-submit-btn");

// Form Inputs
const crudEventId = document.getElementById("crud-event-id");
const crudTitle = document.getElementById("crud-title");
const crudCategory = document.getElementById("crud-category");
const crudStatus = document.getElementById("crud-status");
const crudDate = document.getElementById("crud-date");
const crudTime = document.getElementById("crud-time");
const crudVenue = document.getElementById("crud-venue");
const crudCapacity = document.getElementById("crud-capacity");
const crudImage = document.getElementById("crud-image");
const crudDescription = document.getElementById("crud-description");

// --------------------------------------------------------
// 1. Authentication & Initialization
// --------------------------------------------------------
async function initAdminDashboard() {
  try {
    const authRes = await fetch("/api/auth/me");
    if (!authRes.ok) {
      window.location.href = "login.html?redirect=admin-dashboard.html";
      return;
    }

    const authData = await authRes.json();
    if (!authData.isAuthenticated || !authData.user) {
      window.location.href = "login.html?redirect=admin-dashboard.html";
      return;
    }

    // Role Guard: Reject non-admin users
    if (authData.user.role !== "admin") {
      alert("Access Denied: Administrator privileges are required to view this page.");
      window.location.href = "student-dashboard.html";
      return;
    }

    currentAdmin = authData.user;
    adminWelcomeTitle.textContent = `Welcome, ${currentAdmin.fullName || 'Administrator'}!`;

    // Load Stats and Initial Data
    await loadAdminStats();
    await loadAdminEvents();
    await loadAdminRegistrations();

  } catch (error) {
    console.error("Admin dashboard initialization error:", error);
  }
}

// --------------------------------------------------------
// 2. Load Stats Metrics
// --------------------------------------------------------
async function loadAdminStats() {
  try {
    const res = await fetch("/api/admin/stats");
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.stats) {
        statAdminEvents.textContent = data.stats.totalEvents || 0;
        statAdminUpcoming.textContent = data.stats.upcomingEvents || 0;
        statAdminRegistrations.textContent = data.stats.totalRegistrations || 0;
        statAdminStudents.textContent = data.stats.totalStudents || 0;
      }
    }
  } catch (error) {
    console.warn("Could not load admin stats:", error);
  }
}

// --------------------------------------------------------
// 3. Tab Switching
// --------------------------------------------------------
function switchTab(tabName) {
  const tabs = {
    events: [tabBtnEvents, eventsTab],
    registrations: [tabBtnRegistrations, registrationsTab],
    students: [tabBtnStudents, studentsTab]
  };
  Object.entries(tabs).forEach(([name, [btn, panel]]) => {
    btn.classList.toggle("active", name === tabName);
    panel.style.display = name === tabName ? "block" : "none";
  });
  if (tabName === "students") loadAdminStudents();
}

tabBtnEvents.addEventListener("click", () => switchTab("events"));
tabBtnRegistrations.addEventListener("click", () => switchTab("registrations"));

tabBtnStudents.addEventListener("click", () => switchTab("students"));

// Clicking the "Registered Students" stat card opens the all-students tab
const statCardStudents = document.getElementById("stat-card-students");
if (statCardStudents) {
  statCardStudents.addEventListener("click", () => {
    switchTab("students");
    studentsTab.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

// Clicking the "Student Registrations" stat card opens the event-wise registrations tab
const statCardRegistrations = document.getElementById("stat-card-registrations");
if (statCardRegistrations) {
  statCardRegistrations.addEventListener("click", () => {
    switchTab("registrations");
    const tabs = document.getElementById("registrations-tab");
    if (tabs) tabs.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

// --------------------------------------------------------
// 4. Event Management (CRUD)
// --------------------------------------------------------
async function loadAdminEvents() {
  try {
    const res = await fetch("/api/events");
    if (!res.ok) return;

    const data = await res.json();
    cachedEvents = data.events || [];

    renderEventsTable(cachedEvents);
    populateEventFilterDropdown(cachedEvents);

  } catch (error) {
    console.error("Error loading events table:", error);
    eventsTableBody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #ef4444;">Error loading events.</td></tr>`;
  }
}

function renderEventsTable(events) {
  if (events.length === 0) {
    eventsTableBody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 24px;">No campus events found. Click "+ Add New Event" to create one.</td></tr>`;
    return;
  }

  let html = "";
  events.forEach(event => {
    let statusClass = "upcoming";
    if (event.status === "Registration Closed") statusClass = "closed";
    if (event.status === "Completed") statusClass = "completed";

    const availableSeats = event.availableSeats !== undefined ? event.availableSeats : Math.max(0, event.capacity - (event.registeredCount || 0));

    html += `
      <tr>
        <td>
          <strong style="color: var(--dark);">${escapeHtml(event.title)}</strong>
        </td>
        <td><span class="event-tag" style="margin: 0; font-size: 0.72rem;">${escapeHtml(event.category)}</span></td>
        <td>${escapeHtml(event.date)} <br><span style="font-size: 0.8rem; color: var(--text-light);">${escapeHtml(event.time || '10:00 AM')}</span></td>
        <td>${escapeHtml(event.venue)}</td>
        <td>
          <strong>${event.registeredCount || 0} / ${event.capacity}</strong>
          <span style="display: block; font-size: 0.75rem; color: var(--text-light);">(${availableSeats} left)</span>
        </td>
        <td><span class="badge-status ${statusClass}">${escapeHtml(event.status || 'Upcoming')}</span></td>
        <td>
          <div style="display: flex; gap: 6px;">
            <button type="button" class="btn-action btn-action-edit edit-event-btn" data-id="${event.id}">
              Edit
            </button>
            <button type="button" class="btn-action btn-action-danger delete-event-btn" data-id="${event.id}" data-title="${escapeHtml(event.title)}">
              Delete
            </button>
          </div>
        </td>
      </tr>
    `;
  });

  eventsTableBody.innerHTML = html;

  // Attach button events
  eventsTableBody.querySelectorAll(".edit-event-btn").forEach(btn => {
    btn.addEventListener("click", () => openEditEventModal(btn.dataset.id));
  });

  eventsTableBody.querySelectorAll(".delete-event-btn").forEach(btn => {
    btn.addEventListener("click", () => handleDeleteEvent(btn.dataset.id, btn.dataset.title));
  });
}

// --------------------------------------------------------
// 5. Open Modal for Create or Edit Event
// --------------------------------------------------------
function openCreateEventModal() {
  eventCrudForm.reset();
  crudEventId.value = "";
  eventFormModalTitle.textContent = "Create New Event";
  crudSubmitBtn.textContent = "Create Event";
  crudFormMessage.textContent = "";
  crudDate.value = new Date().toISOString().split("T")[0];
  crudCapacity.value = "60";
  crudStatus.value = "Upcoming";

  eventFormModal.style.display = "flex";
  document.body.style.overflow = "hidden";
}

function openEditEventModal(eventId) {
  const event = cachedEvents.find(e => e.id === eventId);
  if (!event) return;

  eventFormModalTitle.textContent = "Edit Event Details";
  crudSubmitBtn.textContent = "Save Changes";
  crudFormMessage.textContent = "";

  crudEventId.value = event.id;
  crudTitle.value = event.title;
  crudCategory.value = event.category;
  crudStatus.value = event.status || "Upcoming";
  crudDate.value = event.date;
  crudTime.value = event.time || "10:00 AM";
  crudVenue.value = event.venue;
  crudCapacity.value = event.capacity;
  crudImage.value = event.image || "";
  crudDescription.value = event.description;

  eventFormModal.style.display = "flex";
  document.body.style.overflow = "hidden";
}

function closeEventFormModal() {
  eventFormModal.style.display = "none";
  document.body.style.overflow = "";
}

[openCreateEventBtn, openCreateEventBtn2].forEach(btn => {
  if (btn) btn.addEventListener("click", openCreateEventModal);
});

if (eventFormClose) eventFormClose.addEventListener("click", closeEventFormModal);
if (eventFormCancelBtn) eventFormCancelBtn.addEventListener("click", closeEventFormModal);
if (eventFormOverlay) eventFormOverlay.addEventListener("click", closeEventFormModal);

// --------------------------------------------------------
// 6. Handle Event CRUD Form Submit
// --------------------------------------------------------
if (eventCrudForm) {
  eventCrudForm.addEventListener("submit", async function (e) {
    e.preventDefault();

    const eventId = crudEventId.value;
    const isEdit = Boolean(eventId);

    const title = crudTitle.value.trim();
    const category = crudCategory.value;
    const status = crudStatus.value;
    const date = crudDate.value;
    const time = crudTime.value.trim();
    const venue = crudVenue.value.trim();
    const capacity = parseInt(crudCapacity.value, 10);
    const image = crudImage.value.trim();
    const description = crudDescription.value.trim();

    // Frontend Validation
    if (!title || title.length < 3) {
      crudFormMessage.textContent = "Title must be at least 3 characters.";
      crudFormMessage.className = "form-message error";
      return;
    }

    if (!date) {
      crudFormMessage.textContent = "Please specify a valid event date.";
      crudFormMessage.className = "form-message error";
      return;
    }

    if (!venue || venue.length < 2) {
      crudFormMessage.textContent = "Please specify a venue.";
      crudFormMessage.className = "form-message error";
      return;
    }

    if (isNaN(capacity) || capacity <= 0) {
      crudFormMessage.textContent = "Seat capacity must be a positive number.";
      crudFormMessage.className = "form-message error";
      return;
    }

    crudSubmitBtn.disabled = true;
    crudSubmitBtn.textContent = "Saving...";

    const payload = {
      title,
      category,
      status,
      date,
      time,
      venue,
      capacity,
      image,
      description
    };

    try {
      const url = isEdit ? `/api/events/${eventId}` : "/api/events";
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      crudSubmitBtn.disabled = false;
      crudSubmitBtn.textContent = isEdit ? "Save Changes" : "Create Event";

      if (res.ok && data.success) {
        if (typeof showToast === "function") {
          showToast(data.message || "Event saved successfully!", "success");
        }

        closeEventFormModal();
        await loadAdminEvents();
        await loadAdminStats();
      } else {
        crudFormMessage.textContent = data.message || "Could not save event.";
        crudFormMessage.className = "form-message error";
      }

    } catch (error) {
      crudSubmitBtn.disabled = false;
      crudSubmitBtn.textContent = isEdit ? "Save Changes" : "Create Event";
      console.error("Error saving event:", error);
      crudFormMessage.textContent = "Server error while saving event.";
      crudFormMessage.className = "form-message error";
    }
  });
}

// --------------------------------------------------------
// 7. Handle Delete Event
// --------------------------------------------------------
async function handleDeleteEvent(eventId, eventTitle) {
  const confirmed = confirm(`Are you sure you want to delete "${eventTitle}"? All active registrations for this event will be marked as cancelled.`);
  if (!confirmed) return;

  try {
    const res = await fetch(`/api/events/${eventId}`, {
      method: "DELETE"
    });

    const data = await res.json();

    if (res.ok && data.success) {
      if (typeof showToast === "function") {
        showToast(data.message || "Event deleted successfully.", "success");
      }
      await loadAdminEvents();
      await loadAdminStats();
      await loadAdminRegistrations();
    } else {
      alert(data.message || "Could not delete event.");
    }

  } catch (error) {
    console.error("Error deleting event:", error);
  }
}

// --------------------------------------------------------
// 8. Student Registrations Management
// --------------------------------------------------------
async function loadAdminRegistrations() {
  try {
    const searchQuery = adminRegSearch ? adminRegSearch.value.trim() : "";
    const eventFilter = adminRegEventFilter ? adminRegEventFilter.value : "All";

    let url = "/api/admin/registrations?";
    if (searchQuery) url += `search=${encodeURIComponent(searchQuery)}&`;
    if (eventFilter && eventFilter !== "All") url += `event=${encodeURIComponent(eventFilter)}&`;

    const res = await fetch(url);
    if (!res.ok) return;

    const data = await res.json();
    cachedRegistrations = data.registrations || [];

    if (adminRegCountBadge) {
      adminRegCountBadge.textContent = `${cachedRegistrations.length} records`;
    }

    renderRegistrationsTable(cachedRegistrations);

  } catch (error) {
    console.error("Error loading admin registrations:", error);
    registrationsTableBody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #ef4444;">Error loading registrations.</td></tr>`;
  }
}

function populateEventFilterDropdown(events) {
  if (!adminRegEventFilter) return;

  const currentVal = adminRegEventFilter.value;
  adminRegEventFilter.innerHTML = `<option value="All">All Events</option>`;

  events.forEach(e => {
    const opt = document.createElement("option");
    opt.value = e.id;
    opt.textContent = e.title;
    adminRegEventFilter.appendChild(opt);
  });

  adminRegEventFilter.value = currentVal || "All";
}

function renderRegistrationsTable(registrations) {
  if (registrations.length === 0) {
    registrationsTableBody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 24px;">No student registrations match your filter.</td></tr>`;
    return;
  }

  // Group registrations event-wise (events in order of first appearance)
  const groups = new Map();
  registrations.forEach(r => {
    const key = r.eventId || r.eventTitle;
    if (!groups.has(key)) groups.set(key, { title: r.eventTitle, items: [] });
    groups.get(key).items.push(r);
  });

  let html = "";
  groups.forEach(group => {
    html += `
      <tr style="background: #f1f5f9;">
        <td colspan="7" style="padding: 12px 14px;">
          <strong style="color: var(--primary); font-size: 1rem;">${escapeHtml(group.title)}</strong>
          <span class="badge-seats" style="margin-left: 10px;">${group.items.length} registration${group.items.length === 1 ? "" : "s"}</span>
        </td>
      </tr>
    `;
    group.items.forEach(r => { html += registrationRowHtml(r); });
  });

  registrationsTableBody.innerHTML = html;

  registrationsTableBody.querySelectorAll(".delete-reg-btn").forEach(btn => {
    btn.addEventListener("click", () => handleDeleteRegistration(btn.dataset.id, btn.dataset.name, btn.dataset.title));
  });
}

function registrationRowHtml(r) {
  const isConfirmed = r.status === "Confirmed";
  const statusClass = isConfirmed ? "confirmed" : "cancelled";

  return `
    <tr>
      <td><strong>${escapeHtml(r.studentName)}</strong></td>
      <td>${escapeHtml(r.studentEmail)}</td>
      <td>${escapeHtml(r.collegeId || '-')} <br><span style="font-size: 0.78rem; color: var(--text-light);">${escapeHtml(r.yearOfStudy || '')}</span></td>
      <td><strong style="color: var(--primary);">${escapeHtml(r.eventTitle)}</strong></td>
      <td>${escapeHtml(r.registeredAt || 'Recent')}</td>
      <td><span class="badge-status ${statusClass}">${escapeHtml(r.status || 'Confirmed')}</span></td>
      <td>
        <button type="button" class="btn-action btn-action-danger delete-reg-btn" data-id="${r.id}" data-name="${escapeHtml(r.studentName)}" data-title="${escapeHtml(r.eventTitle)}">
          Remove
        </button>
      </td>
    </tr>
  `;
}

async function handleDeleteRegistration(regId, studentName, eventTitle) {
  const confirmed = confirm(`Are you sure you want to remove the registration for student "${studentName}" from "${eventTitle}"?`);
  if (!confirmed) return;

  try {
    const res = await fetch(`/api/admin/registrations/${regId}`, {
      method: "DELETE"
    });

    const data = await res.json();

    if (res.ok && data.success) {
      if (typeof showToast === "function") {
        showToast(data.message || "Registration removed.", "success");
      }
      await loadAdminRegistrations();
      await loadAdminStats();
      await loadAdminEvents();
    } else {
      alert(data.message || "Could not delete registration.");
    }

  } catch (error) {
    console.error("Error deleting registration:", error);
  }
}

// Search and filter listeners
if (adminRegSearch) {
  adminRegSearch.addEventListener("input", debounce(loadAdminRegistrations, 300));
}

if (adminRegEventFilter) {
  adminRegEventFilter.addEventListener("change", loadAdminRegistrations);
}

// Admin Logout
if (adminLogoutBtn) {
  adminLogoutBtn.addEventListener("click", handleLogout);
}

// Helpers
function debounce(func, wait) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

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
document.addEventListener("DOMContentLoaded", initAdminDashboard);

// --------------------------------------------------------
// Registered Students (all student accounts)
// --------------------------------------------------------
let cachedStudents = [];

async function loadAdminStudents() {
  try {
    const res = await fetch("/api/admin/students");
    if (!res.ok) return;
    const data = await res.json();
    cachedStudents = data.students || [];
    renderStudentsTable();
  } catch (error) {
    console.error("Error loading students:", error);
    studentsTableBody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: #ef4444;">Error loading students.</td></tr>`;
  }
}

function renderStudentsTable() {
  const q = adminStudentsSearch ? adminStudentsSearch.value.trim().toLowerCase() : "";
  const list = cachedStudents.filter(s =>
    !q || [s.name, s.email, s.collegeId].some(v => (v || "").toLowerCase().includes(q))
  );

  if (adminStudentsCountBadge) {
    adminStudentsCountBadge.textContent = `${list.length} student${list.length === 1 ? "" : "s"}`;
  }

  if (list.length === 0) {
    studentsTableBody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 24px;">No students found.</td></tr>`;
    return;
  }

  studentsTableBody.innerHTML = list.map((s, i) => `
    <tr>
      <td>${i + 1}</td>
      <td><strong>${escapeHtml(s.name)}</strong></td>
      <td>${escapeHtml(s.email)}</td>
      <td>${escapeHtml(s.collegeId || "-")}</td>
      <td>${escapeHtml(s.yearOfStudy || "-")}</td>
      <td>${escapeHtml(s.joinedAt || "-")}</td>
      <td>${s.eventsRegistered}</td>
      <td>
        <button type="button" class="btn-action btn-action-edit edit-student-btn" data-id="${s.id}">Edit</button>
        <button type="button" class="btn-action btn-action-danger delete-student-btn" data-id="${s.id}">Delete</button>
      </td>
    </tr>
  `).join("");

  studentsTableBody.querySelectorAll(".edit-student-btn").forEach(btn =>
    btn.addEventListener("click", () => openStudentModal(btn.dataset.id)));
  studentsTableBody.querySelectorAll(".delete-student-btn").forEach(btn =>
    btn.addEventListener("click", () => deleteStudent(btn.dataset.id)));
}

// ---- Edit / delete a student ----
const studentModal = document.getElementById("student-form-modal");
const studentForm = document.getElementById("student-form");
const studentFormMessage = document.getElementById("student-form-message");

function openStudentModal(id) {
  const s = cachedStudents.find(x => x.id === id);
  if (!s) return;
  document.getElementById("student-form-id").value = s.id;
  document.getElementById("student-form-email").value = s.email;
  document.getElementById("student-form-name").value = s.name;
  document.getElementById("student-form-college-id").value = s.collegeId === "Not provided" ? "" : s.collegeId;
  document.getElementById("student-form-year").value = s.yearOfStudy || "3rd Year";
  studentFormMessage.textContent = "";
  studentModal.style.display = "flex";
}

function closeStudentModal() {
  studentModal.style.display = "none";
}

["student-form-close", "student-form-cancel", "student-form-overlay"].forEach(id =>
  document.getElementById(id).addEventListener("click", closeStudentModal));

studentForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const id = document.getElementById("student-form-id").value;
  try {
    const res = await fetch(`/api/admin/students/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: document.getElementById("student-form-name").value,
        collegeId: document.getElementById("student-form-college-id").value,
        yearOfStudy: document.getElementById("student-form-year").value
      })
    });
    const data = await res.json();
    if (res.ok && data.success) {
      closeStudentModal();
      if (typeof showToast === "function") showToast(data.message, "success");
      await loadAdminStudents();
    } else {
      studentFormMessage.textContent = data.message || "Could not update student.";
      studentFormMessage.className = "form-message error";
    }
  } catch (err) {
    studentFormMessage.textContent = "Unable to connect to the server.";
    studentFormMessage.className = "form-message error";
  }
});

async function deleteStudent(id) {
  const s = cachedStudents.find(x => x.id === id);
  if (!s) return;
  if (!confirm(`Delete student "${s.name}" (${s.email})? Their ${s.eventsRegistered} event registration(s) will also be removed. This cannot be undone.`)) return;

  try {
    const res = await fetch(`/api/admin/students/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (res.ok && data.success) {
      if (typeof showToast === "function") showToast(data.message, "success");
      await loadAdminStudents();
      await loadAdminStats();
      await loadAdminEvents();
    } else {
      alert(data.message || "Could not delete student.");
    }
  } catch (err) {
    alert("Unable to connect to the server.");
  }
}

if (adminStudentsSearch) adminStudentsSearch.addEventListener("input", renderStudentsTable);
