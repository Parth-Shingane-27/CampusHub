// ========================================================
// CampusHub - Dynamic Events Management (events.js)
// Fetches real event data from GET /api/events,
// handles real-time search, category filtering, sorting,
// live seat availability, and one-click student registration.
// ========================================================

// 1. State Variables
let allEvents = [];
let currentUser = null;
let registeredEventIds = new Set();
let selectedCategory = "All";
let selectedEventForModal = null;

// 2. DOM Elements
const searchInput = document.getElementById("event-search");
const categoryButtons = document.querySelectorAll(".filter-chip");
const sortSelect = document.getElementById("event-sort");
const eventsGrid = document.querySelector(".events-list .events-grid");
const eventCount = document.getElementById("event-count");
const noResults = document.getElementById("no-results");

// Modal DOM elements
const eventModal = document.getElementById("event-modal");
const modalTitle = document.getElementById("modal-title");
const modalCategory = document.getElementById("modal-category");
const modalMeta = document.getElementById("modal-meta");
const modalDesc = document.getElementById("modal-desc");
const modalClose = document.getElementById("modal-close");
const modalCloseBtn = document.getElementById("modal-close-btn");
const modalRegisterBtn = document.getElementById("modal-register-btn");
const modalOverlay = document.getElementById("modal-overlay");

// --------------------------------------------------------
// 3. Render Events Cards into DOM
// --------------------------------------------------------
function renderEventCards(eventsToRender) {
  if (!eventsGrid) return;

  eventsGrid.innerHTML = "";

  if (eventsToRender.length === 0) {
    if (noResults) noResults.style.display = "block";
    if (eventCount) eventCount.textContent = "Showing 0 of " + allEvents.length + " events";
    return;
  }

  if (noResults) noResults.style.display = "none";
  if (eventCount) eventCount.textContent = "Showing " + eventsToRender.length + " of " + allEvents.length + " events";

  eventsToRender.forEach(function (event) {
    const isRegistered = registeredEventIds.has(event.id);
    const availableSeats = event.availableSeats !== undefined ? event.availableSeats : Math.max(0, event.capacity - (event.registeredCount || 0));
    const isFull = availableSeats <= 0;
    const isClosed = event.status === "Registration Closed" || event.status === "Completed";

    // Create article element
    const article = document.createElement("article");
    article.className = "event-card";
    article.dataset.category = event.category;
    article.dataset.date = event.date;
    article.dataset.id = event.id;

    // Determine seat badge status
    let seatBadgeClass = "badge-seats";
    if (isFull) seatBadgeClass += " full";
    else if (availableSeats <= 10) seatBadgeClass += " limited";

    // Determine action button state
    let actionBtnText = "View Details";

    article.innerHTML = `
      <div class="event-card-img">
        <span class="event-tag">${escapeHtml(event.category)}</span>
        <img src="${escapeHtml(event.image)}" alt="${escapeHtml(event.title)}" loading="lazy">
      </div>
      <div class="event-card-body">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; margin-bottom: 8px;">
          <h3>${escapeHtml(event.title)}</h3>
          <span class="${seatBadgeClass}" title="Capacity: ${event.capacity}">
            ${isFull ? 'Full' : availableSeats + ' seats left'}
          </span>
        </div>
        <div class="event-meta">
          <span class="icon">≡ƒôà ${escapeHtml(event.date)}</span>
          <span class="icon">ΓÅ░ ${escapeHtml(event.time || '10:00 AM')}</span>
          <span class="icon">≡ƒôì ${escapeHtml(event.venue)}</span>
        </div>
        <p class="event-desc">${escapeHtml(event.description)}</p>
        <div style="display: flex; gap: 8px; margin-top: 14px;">
          <button type="button" class="btn btn-secondary btn-small btn-block view-details-btn">
            ${actionBtnText}
          </button>
          ${isRegistered ? `
            <span class="badge-status confirmed" style="display: flex; align-items: center; justify-content: center; padding: 0 12px; white-space: nowrap;">
              Γ£ô Registered
            </span>
          ` : ''}
        </div>
      </div>
    `;

    // Attach click handler to View Details button
    const viewBtn = article.querySelector(".view-details-btn");
    viewBtn.addEventListener("click", () => openEventModal(event));

    eventsGrid.appendChild(article);
  });
}

// --------------------------------------------------------
// 4. Filtering and Sorting Logic
// --------------------------------------------------------
function filterAndSortEvents() {
  const searchText = (searchInput ? searchInput.value : "").trim().toLowerCase();

  // 1. Filter
  let filtered = allEvents.filter(function (event) {
    const categoryMatches = selectedCategory === "All" || event.category.toLowerCase() === selectedCategory.toLowerCase();
    const searchMatches =
      event.title.toLowerCase().includes(searchText) ||
      event.description.toLowerCase().includes(searchText) ||
      event.venue.toLowerCase().includes(searchText);

    return categoryMatches && searchMatches;
  });

  // 2. Sort
  const sortValue = sortSelect ? sortSelect.value : "date";
  if (sortValue === "name") {
    filtered.sort((a, b) => a.title.localeCompare(b.title));
  } else {
    filtered.sort((a, b) => a.date.localeCompare(b.date));
  }

  // 3. Render
  renderEventCards(filtered);
}

// --------------------------------------------------------
// 5. Category Buttons & Controls Setup
// --------------------------------------------------------
categoryButtons.forEach(function (button) {
  button.addEventListener("click", function () {
    selectedCategory = button.dataset.category;

    categoryButtons.forEach(btn => {
      btn.classList.toggle("active", btn === button);
    });

    filterAndSortEvents();
  });
});

if (searchInput) {
  searchInput.addEventListener("input", filterAndSortEvents);
}

if (sortSelect) {
  sortSelect.addEventListener("change", filterAndSortEvents);
}

const eventControls = document.getElementById("event-controls");
if (eventControls) {
  eventControls.addEventListener("submit", e => e.preventDefault());
}

// --------------------------------------------------------
// 6. Event Details Modal Interaction
// --------------------------------------------------------
function openEventModal(event) {
  if (!eventModal) return;
  selectedEventForModal = event;

  const isRegistered = registeredEventIds.has(event.id);
  const availableSeats = event.availableSeats !== undefined ? event.availableSeats : Math.max(0, event.capacity - (event.registeredCount || 0));
  const isFull = availableSeats <= 0;
  const isClosed = event.status === "Registration Closed" || event.status === "Completed";

  modalTitle.textContent = event.title;
  modalCategory.textContent = event.category;

  modalMeta.innerHTML = `
    <span class="icon">≡ƒôà ${escapeHtml(event.date)}</span>
    <span class="icon">ΓÅ░ ${escapeHtml(event.time || '10:00 AM')}</span>
    <span class="icon">≡ƒôì ${escapeHtml(event.venue)}</span>
    <span class="icon">≡ƒæÑ Capacity: ${event.capacity} (${availableSeats} available)</span>
    <span class="icon">≡ƒôî Status: <strong style="color: ${event.status === 'Upcoming' ? '#10b981' : '#f59e0b'}">${escapeHtml(event.status || 'Upcoming')}</strong></span>
  `;

  modalDesc.textContent = event.description;

  // Configure modal register button state
  if (modalRegisterBtn) {
    // Reset styles
    modalRegisterBtn.onclick = null;
    modalRegisterBtn.disabled = false;
    modalRegisterBtn.className = "btn btn-primary btn-small";

    if (!currentUser) {
      // User is not logged in
      modalRegisterBtn.textContent = "Login to Register";
      modalRegisterBtn.href = "login.html?redirect=" + encodeURIComponent(window.location.pathname);
    } else if (currentUser.role === "admin") {
      // User is admin
      modalRegisterBtn.textContent = "Manage in Admin Panel";
      modalRegisterBtn.href = "admin-dashboard.html";
    } else if (isRegistered) {
      // Already registered
      modalRegisterBtn.textContent = "Γ£ô Already Registered";
      modalRegisterBtn.disabled = true;
      modalRegisterBtn.className = "btn btn-secondary btn-small";
      modalRegisterBtn.href = "#";
    } else if (isClosed) {
      // Event closed
      modalRegisterBtn.textContent = "Registration Closed";
      modalRegisterBtn.disabled = true;
      modalRegisterBtn.className = "btn btn-secondary btn-small";
      modalRegisterBtn.href = "#";
    } else if (isFull) {
      // Event full
      modalRegisterBtn.textContent = "Event Full";
      modalRegisterBtn.disabled = true;
      modalRegisterBtn.className = "btn btn-secondary btn-small";
      modalRegisterBtn.href = "#";
    } else {
      // Student can register
      modalRegisterBtn.textContent = "Register Now";
      modalRegisterBtn.href = "#";
      modalRegisterBtn.onclick = function (e) {
        e.preventDefault();
        handleEventRegistration(event.id);
      };
    }
  }

  eventModal.style.display = "flex";
  document.body.style.overflow = "hidden";
}

function closeEventModal() {
  if (!eventModal) return;
  eventModal.style.display = "none";
  document.body.style.overflow = "";
}

// --------------------------------------------------------
// 7. Student Event Registration Request
// --------------------------------------------------------
async function handleEventRegistration(eventId) {
  if (!modalRegisterBtn) return;
  modalRegisterBtn.disabled = true;
  modalRegisterBtn.textContent = "Registering...";

  try {
    const res = await fetch("/api/registrations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId: eventId })
    });

    const data = await res.json();

    if (res.ok && data.success) {
      if (typeof showToast === "function") {
        showToast(data.message || "Registration confirmed!", "success");
      }

      registeredEventIds.add(eventId);

      // Decrement seats locally
      const target = allEvents.find(e => e.id === eventId);
      if (target) {
        target.registeredCount = (target.registeredCount || 0) + 1;
        target.availableSeats = Math.max(0, target.capacity - target.registeredCount);
      }

      // Re-render modal button
      modalRegisterBtn.textContent = "Γ£ô Already Registered";
      modalRegisterBtn.disabled = true;
      modalRegisterBtn.className = "btn btn-secondary btn-small";

      // Refresh list
      filterAndSortEvents();

      setTimeout(() => {
        closeEventModal();
      }, 1200);

    } else {
      modalRegisterBtn.disabled = false;
      modalRegisterBtn.textContent = "Register Now";
      if (typeof showToast === "function") {
        showToast(data.message || "Registration failed.", "error");
      } else {
        alert(data.message || "Registration failed.");
      }
    }

  } catch (error) {
    modalRegisterBtn.disabled = false;
    modalRegisterBtn.textContent = "Register Now";
    console.error("Registration error:", error);
    if (typeof showToast === "function") {
      showToast("Server error. Please try again.", "error");
    }
  }
}

// Modal event listeners
if (modalClose) modalClose.addEventListener("click", closeEventModal);
if (modalCloseBtn) modalCloseBtn.addEventListener("click", closeEventModal);
if (modalOverlay) modalOverlay.addEventListener("click", closeEventModal);

document.addEventListener("keydown", function (event) {
  if (event.key === "Escape" && eventModal && eventModal.style.display === "flex") {
    closeEventModal();
  }
});

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

// --------------------------------------------------------
// 8. Initial Load: Fetch Session, Registrations, and Events
// --------------------------------------------------------
async function initializePage() {
  try {
    // 1. Check user session
    const authRes = await fetch("/api/auth/me");
    if (authRes.ok) {
      const authData = await authRes.json();
      currentUser = authData.user;
    }

    // 2. If student, fetch student's current registrations
    if (currentUser && currentUser.role === "student") {
      try {
        const myRegRes = await fetch("/api/student/registrations");
        if (myRegRes.ok) {
          const myRegData = await myRegRes.json();
          if (Array.isArray(myRegData.registrations)) {
            myRegData.registrations.forEach(r => {
              if (r.status === "Confirmed") {
                registeredEventIds.add(r.eventId);
              }
            });
          }
        }
      } catch (regErr) {
        console.warn("Could not load student registrations:", regErr);
      }
    }

    // 3. Fetch all events
    const eventsRes = await fetch("/api/events");
    if (eventsRes.ok) {
      const eventsData = await eventsRes.json();
      allEvents = eventsData.events || [];
      filterAndSortEvents();
    }

  } catch (error) {
    console.error("Error loading events page data:", error);
  }
}

initializePage();
