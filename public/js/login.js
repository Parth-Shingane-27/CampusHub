// ========================================================
// CampusHub - Login Handler (login.js)
// Client-side validation + Node.js Express Server Authentication
// Communicates with POST /api/auth/login.
// Role-based redirection:
// - Student -> student-dashboard.html
// - Admin   -> admin-dashboard.html
// ========================================================

const loginForm = document.getElementById("login-form");
const loginMessage = document.getElementById("login-message");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const submitBtn = document.getElementById("login-submit-btn");

// Helper function to display messages
function showLoginMessage(message, type) {
  if (!loginMessage) return;
  loginMessage.textContent = message;
  loginMessage.className = "form-message " + type;
}

// Clear message when inputs change
[emailInput, passwordInput].forEach(input => {
  if (input) {
    input.addEventListener("input", () => {
      if (loginMessage.textContent !== "") {
        loginMessage.textContent = "";
        loginMessage.className = "form-message";
      }
    });
  }
});

// Demo Credentials Auto-Fill
const fillStudentBtn = document.getElementById("fill-student-btn");
const fillAdminBtn = document.getElementById("fill-admin-btn");

if (fillStudentBtn) {
  fillStudentBtn.addEventListener("click", () => {
    emailInput.value = "sakshi@campushub.edu";
    passwordInput.value = "Student@123";
    showLoginMessage("Student demo credentials filled. Click Login to sign in.", "success");
  });
}

if (fillAdminBtn) {
  fillAdminBtn.addEventListener("click", () => {
    emailInput.value = "admin@campushub.edu";
    passwordInput.value = "Admin@12345";
    showLoginMessage("Admin demo credentials filled. Click Login to sign in.", "success");
  });
}

// Form Submission Event
loginForm.addEventListener("submit", async function (event) {
  event.preventDefault();

  const email = emailInput.value.trim();
  const password = passwordInput.value;

  // Regular expression to check email format
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // 1. Client-Side Validation
  if (!email) {
    showLoginMessage("Please enter your email address.", "error");
    emailInput.focus();
    return;
  }
  if (!emailPattern.test(email)) {
    showLoginMessage("Please enter a valid email address (e.g. you@college.edu).", "error");
    emailInput.focus();
    return;
  }
  if (!password) {
    showLoginMessage("Please enter your password.", "error");
    passwordInput.focus();
    return;
  }

  // 2. Server Authentication (POST /api/auth/login)
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = "Verifying Credentials...";
  }

  try {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email, password: password })
    });

    const result = await response.json();

    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = "Login";
    }

    if (response.ok && result.success) {
      showLoginMessage(result.message || "Login successful! Redirecting...", "success");

      // Check URL for redirect parameter
      const urlParams = new URLSearchParams(window.location.search);
      const redirectUrl = urlParams.get("redirect");

      setTimeout(() => {
        if (result.user && result.user.role === "admin") {
          window.location.href = "admin-dashboard.html";
        } else if (redirectUrl) {
          window.location.href = redirectUrl;
        } else {
          window.location.href = "student-dashboard.html";
        }
      }, 700);

    } else {
      // Server returned validation or authentication error (400, 401, 429)
      showLoginMessage(result.message || "Invalid email or password.", "error");
    }

  } catch (error) {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = "Login";
    }
    console.error("Login request error:", error);
    showLoginMessage("Unable to connect to the server. Please ensure the server is running.", "error");
  }
});
