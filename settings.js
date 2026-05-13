// ================================================================
//  settings.js  —  FIXED VERSION
//  What was broken and what was changed:
//
//  FIX 1 — Save settings:
//    BEFORE: sent { email, name, weight, goal }
//            email is ignored by server; age & height were missing
//    AFTER:  sends { name, age, height, weight, goal }
//            matches exactly what POST /api/settings expects
//
//  FIX 2 — Change password:
//    BEFORE: saved password to localStorage only — never hit the server
//    AFTER:  asks for current + new password, calls POST /api/settings/password
//
//  FIX 3 — Logout:
//    BEFORE: just redirected to index.html — session stayed alive on server
//    AFTER:  calls POST /logout first, THEN redirects on success
// ================================================================

// Toggle ON/OFF buttons (unchanged — this part was fine)
let toggleButtons = document.querySelectorAll(".toggle");

toggleButtons.forEach(function(button) {
  button.addEventListener("click", function() {
    if (button.textContent.trim() === "ON") {
      button.textContent = "OFF";
      button.classList.remove("on");
      button.classList.add("off");
    } else {
      button.textContent = "ON";
      button.classList.remove("off");
      button.classList.add("on");
    }

    if (button.id === "darkModeBtn") {
      document.body.classList.toggle("dark-mode");
    }
  });
});

// ----------------------------------------------------------------
//  FIX 1 — Save settings
//  Added: age, height
//  Removed: email (server ignores it and it can't be changed here)
// ----------------------------------------------------------------
document.getElementById("saveBtn").addEventListener("click", function() {

  let settingsData = {
    name:   document.getElementById("name").value,
    age:    document.getElementById("age").value,      // was missing
    height: document.getElementById("height").value,   // was missing
    weight: document.getElementById("weight").value,
    goal:   document.getElementById("goal").value
    // email removed — POST /api/settings does not accept or update email
  };

  fetch("/api/settings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(settingsData)
  })
  .then(function(response) { return response.json(); })
  .then(function(data) { alert(data.message); })
  .catch(function() { alert("Could not save settings. Please try again."); });

});

// ----------------------------------------------------------------
//  FIX 2 — Change password
//  BEFORE: localStorage.setItem("fittracker_password", newPassword)
//          → password was saved in the browser only, server never knew
//  AFTER:  calls POST /api/settings/password with currentPassword + newPassword
// ----------------------------------------------------------------
document.getElementById("changePasswordBtn").addEventListener("click", function() {

  let currentPassword = prompt("Enter your CURRENT password");
  if (currentPassword === null || currentPassword.trim() === "") {
    alert("Password change cancelled.");
    return;
  }

  let newPassword = prompt("Enter your NEW password (minimum 6 characters)");
  if (newPassword === null || newPassword.trim() === "") {
    alert("Password change cancelled.");
    return;
  }

  if (newPassword.length < 6) {
    alert("New password must be at least 6 characters.");
    return;
  }

  // Now actually send it to the server
  fetch("/api/settings/password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      currentPassword: currentPassword,
      newPassword: newPassword
    })
  })
  .then(function(response) { return response.json(); })
  .then(function(data) {
    alert(data.message);
  })
  .catch(function() {
    alert("Could not change password. Please try again.");
  });

});

// ----------------------------------------------------------------
//  FIX 3 — Logout
//  BEFORE: alert + window.location.href = "index.html"
//          → browser redirected but server session was never destroyed
//  AFTER:  calls POST /logout first, server destroys the session,
//          then redirects to index.html on success
// ----------------------------------------------------------------
document.getElementById("logoutBtn").addEventListener("click", function() {

  fetch("/logout", {
    method: "POST"
  })
  .then(function(response) { return response.json(); })
  .then(function(data) {
    // Session is now destroyed on the server — safe to redirect
    window.location.href = "index.html";
  })
  .catch(function() {
    // Even if the request fails, redirect so the user isn't stuck
    window.location.href = "index.html";
  });

});