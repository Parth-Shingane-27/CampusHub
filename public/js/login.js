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
    showLoginMessage("Please use your @mitaoe.ac.in email address.", "error");
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


// ---------------------------------------------------------
// Google Sign-In (restricted to the college domain by the server)
// ---------------------------------------------------------
function redirectAfterLogin(user) {
  const redirectUrl = new URLSearchParams(window.location.search).get("redirect");
  if (user && user.role === "admin") window.location.href = "admin-dashboard.html";
  else if (redirectUrl) window.location.href = redirectUrl;
  else window.location.href = "student-dashboard.html";
}

async function handleGoogleCredential(response) {
  try {
    const res = await fetch("/api/auth/google", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ credential: response.credential })
    });
    const result = await res.json();
    if (res.ok && result.success) {
      showLoginMessage(result.message || "Login successful! Redirecting...", "success");
      setTimeout(() => redirectAfterLogin(result.user), 700);
    } else {
      showLoginMessage(result.message || "Google sign-in failed.", "error");
    }
  } catch (error) {
    showLoginMessage("Unable to connect to the server. Please ensure the server is running.", "error");
  }
}

async function initGoogleSignIn() {
  const holder = document.getElementById("google-signin");
  if (!holder) return;
  try {
    const cfg = await (await fetch("/api/auth/config")).json();
    if (!cfg.googleClientId) { holder.style.display = "none"; return; }
    const start = () => {
      if (!window.google || !google.accounts) return setTimeout(start, 200);
      google.accounts.id.initialize({
        client_id: cfg.googleClientId,
        callback: handleGoogleCredential,
        hd: cfg.allowedEmailDomain
      });
      google.accounts.id.renderButton(holder, { theme: "outline", size: "large", text: "signin_with", width: 300 });
    };
    start();
  } catch (e) {
    holder.style.display = "none";
  }
}
initGoogleSignIn();

// Reveal the admin-only password form
const adminToggle = document.getElementById("admin-toggle");
if (adminToggle) {
  adminToggle.addEventListener("click", (e) => {
    e.preventDefault();
    loginForm.style.display = loginForm.style.display === "none" ? "block" : "none";
  });
}
