alert("settings.js connected");

// Toggle ON/OFF buttons
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

// Save settings to backend
document.getElementById("saveBtn").addEventListener("click", function() {

  let settingsData = {
    email: document.getElementById("email").value,
    name: document.getElementById("name").value,
    weight: document.getElementById("weight").value,
    goal: document.getElementById("goal").value
  };

  fetch("/api/settings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(settingsData)
  })
  .then(function(response) {
    return response.json();
  })
  .then(function(data) {
    alert(data.message);
  })
  .catch(function(error) {
    alert("Backend connection failed");
  });

});

// Change Password button
document.getElementById("changePasswordBtn").addEventListener("click", function() {

  let newPassword = prompt("Enter your new password");

  if (newPassword === null || newPassword === "") {
    alert("Password change cancelled.");
  } else {
    localStorage.setItem("fittracker_password", newPassword);
    alert("Password changed successfully!");
  }

});

// Logout button
document.getElementById("logoutBtn").addEventListener("click", function() {
  alert("You have logged out.");
  window.location.href = "index.html";
});