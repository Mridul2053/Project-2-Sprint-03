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

    // Dark mode
    if (button.id === "darkModeBtn") {
      document.body.classList.toggle("dark-mode");
    }
  });
});

// Save settings to backend
document.getElementById("saveBtn").addEventListener("click", function() {

  let settingsData = {
    name: document.getElementById("name").value,
    email: document.getElementById("email").value,
    weight: document.getElementById("weight").value,
    goal: document.getElementById("goal").value,
    calories: document.getElementById("calories").value,
    water: document.getElementById("water").value,
    steps: document.getElementById("steps").value
  };

  fetch("http://localhost:3000/settings", {
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

// Load saved settings from backend
window.addEventListener("load", function() {

  fetch("http://localhost:3000/settings")
  .then(function(response) {
    return response.json();
  })
  .then(function(data) {
    document.getElementById("name").value = data.name || "";
    document.getElementById("email").value = data.email || "";
    document.getElementById("weight").value = data.weight || "";
    document.getElementById("goal").value = data.goal || "Weight Loss";
    document.getElementById("calories").value = data.calories || "";
    document.getElementById("water").value = data.water || "";
    document.getElementById("steps").value = data.steps || "";
  })
  .catch(function(error) {
    console.log("Could not load settings");
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