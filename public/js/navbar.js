// ========================================================
// CampusHub - Role-Aware Navigation Bar Script (navbar.js)
// Automatically checks user session status via /api/auth/me
// and dynamically updates navigation links, user badges,
// and the logout button across all pages.
// ========================================================

// 1. Toast Notification Helper
function showToast(message, type = 'success') {
  const existing = document.querySelector('.toast-alert');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = `toast-alert ${type}`;
  toast.innerHTML = `<span>${type === 'success' ? '✅' : '⚠️'}</span><span>${message}</span>`;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.5s ease';
    setTimeout(() => toast.remove(), 500);
  }, 4000);
}

// 2. Global Logout Handler
async function handleLogout(event) {
  if (event) event.preventDefault();
  try {
    const res = await fetch('/api/auth/logout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    const data = await res.json();
    if (data.success) {
      window.location.href = 'index.html';
    } else {
      showToast('Logout failed. Please try again.', 'error');
    }
  } catch (error) {
    console.error('Logout error:', error);
    window.location.href = 'index.html';
  }
}

// 3. Initialize Role-Aware Navigation
document.addEventListener('DOMContentLoaded', async () => {
  const navLinksContainer = document.querySelector('.nav-links');
  const navCtaContainer = document.querySelector('.nav-cta');

  if (!navLinksContainer || !navCtaContainer) return;

  try {
    const response = await fetch('/api/auth/me');
    if (!response.ok) return;

    const result = await response.json();
    const user = result.user;

    const currentPath = window.location.pathname.split('/').pop() || 'index.html';

    if (user) {
      // User is authenticated (Student or Admin)
      let linksHtml = '';
      linksHtml += `<li><a href="index.html" class="${currentPath === 'index.html' || currentPath === '' ? 'active' : ''}">Home</a></li>`;
      linksHtml += `<li><a href="events.html" class="${currentPath === 'events.html' ? 'active' : ''}">Events</a></li>`;
      linksHtml += `<li><a href="about.html" class="${currentPath === 'about.html' ? 'active' : ''}">About</a></li>`;

      if (user.role === 'admin') {
        linksHtml += `<li><a href="admin-dashboard.html" class="${currentPath === 'admin-dashboard.html' ? 'active' : ''}">Admin Panel</a></li>`;
      } else {
        linksHtml += `<li><a href="student-dashboard.html" class="${currentPath === 'student-dashboard.html' ? 'active' : ''}">My Dashboard</a></li>`;
      }

      navLinksContainer.innerHTML = linksHtml;

      // Update CTA with User profile badge and Logout button
      const roleLabel = user.role === 'admin' ? 'Admin' : 'Student';
      const rolePillClass = user.role === 'admin' ? 'role-pill admin' : 'role-pill';
      const dashboardLink = user.role === 'admin' ? 'admin-dashboard.html' : 'student-dashboard.html';

      navCtaContainer.innerHTML = `
        <div class="nav-user">
          <a href="${dashboardLink}" class="user-badge" title="Go to Dashboard">
            <span>👤 ${user.fullName.split(' ')[0]}</span>
            <span class="${rolePillClass}">${roleLabel}</span>
          </a>
          <button type="button" class="btn btn-outline-light btn-small" id="nav-logout-btn" style="border-color: rgba(255,255,255,0.25); color: #fff;">
            Logout
          </button>
        </div>
      `;

      const logoutBtn = document.getElementById('nav-logout-btn');
      if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
      }

    } else {
      // Visitor is logged out
      // Ensure standard links are present
      navLinksContainer.innerHTML = `
        <li><a href="index.html" class="${currentPath === 'index.html' || currentPath === '' ? 'active' : ''}">Home</a></li>
        <li><a href="events.html" class="${currentPath === 'events.html' ? 'active' : ''}">Events</a></li>
        <li><a href="about.html" class="${currentPath === 'about.html' ? 'active' : ''}">About</a></li>
        <li><a href="login.html" class="${currentPath === 'login.html' ? 'active' : ''}">Login</a></li>
      `;

      navCtaContainer.innerHTML = `
        <a href="register.html" class="btn btn-primary btn-small">Sign Up</a>
      `;
    }

  } catch (err) {
    console.warn('Navbar auth check failed:', err);
  }
});
