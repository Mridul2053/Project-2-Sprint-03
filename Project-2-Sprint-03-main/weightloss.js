let currentDayListId = "";
let currentExerciseName = "";
let exerciseDetails = {};

// Open add-exercise modal
function openAddExerciseModal(dayListId, dayTitle) {
  currentDayListId = dayListId;
  document.getElementById("addModalTitle").textContent = "Add Exercise - " + dayTitle;
  document.getElementById("newExerciseInput").value = "";
  document.getElementById("addExerciseModal").style.display = "flex";
}

// Close add-exercise modal
function closeAddExerciseModal() {
  document.getElementById("addExerciseModal").style.display = "none";
}

// Add a new exercise to the selected day
function addNewExercise() {
  const input = document.getElementById("newExerciseInput");
  const exerciseName = input.value.trim();

  if (exerciseName === "") {
    alert("Please enter an exercise name.");
    return;
  }

  const list = document.getElementById(currentDayListId);

  const newButton = document.createElement("button");
  newButton.className = "exercise-link";
  newButton.type = "button";
  newButton.textContent = "• " + exerciseName;
  newButton.onclick = function () {
    openExerciseModal(exerciseName);
  };

  list.appendChild(newButton);

  input.value = "";
  closeAddExerciseModal();
}

// Open exercise detail modal
function openExerciseModal(exerciseName) {
  currentExerciseName = exerciseName;
  document.getElementById("exerciseModalTitle").textContent = exerciseName;
  document.getElementById("weightInput").value = "";
  document.getElementById("repsInput").value = "";
  document.getElementById("setsInput").value = "";
  document.getElementById("exerciseModal").style.display = "flex";
  renderExerciseDetails();
}

// Close exercise detail modal
function closeExerciseModal() {
  document.getElementById("exerciseModal").style.display = "none";
}

// Add details for clicked exercise
function addExerciseDetail() {
  const weight = document.getElementById("weightInput").value.trim();
  const reps = document.getElementById("repsInput").value.trim();
  const sets = document.getElementById("setsInput").value.trim();

  if (!weight || !reps || !sets) {
    alert("Please fill weight, reps, and sets.");
    return;
  }

  if (!exerciseDetails[currentExerciseName]) {
    exerciseDetails[currentExerciseName] = [];
  }

  exerciseDetails[currentExerciseName].push({
    weight: weight,
    reps: reps,
    sets: sets
  });

  document.getElementById("weightInput").value = "";
  document.getElementById("repsInput").value = "";
  document.getElementById("setsInput").value = "";

  renderExerciseDetails();
}

// Show all saved details for selected exercise
function renderExerciseDetails() {
  const detailsList = document.getElementById("exerciseDetailsList");
  detailsList.innerHTML = "";

  const lines = exerciseDetails[currentExerciseName] || [];

  if (lines.length === 0) {
    detailsList.innerHTML = "<p>No entries added yet.</p>";
    return;
  }

  lines.forEach((line, index) => {
    const item = document.createElement("div");
    item.className = "detail-item";

    const text = document.createElement("div");
    text.className = "detail-text";
    text.textContent = `${index + 1}. ${line.weight} kg – ${line.reps} reps – ${line.sets} sets`;

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "delete-line-btn";
    deleteBtn.textContent = "Delete";
    deleteBtn.onclick = function () {
      deleteExerciseDetail(index);
    };

    item.appendChild(text);
    item.appendChild(deleteBtn);
    detailsList.appendChild(item);
  });
}

// Delete one detail line
function deleteExerciseDetail(index) {
  exerciseDetails[currentExerciseName].splice(index, 1);
  renderExerciseDetails();
}

// Clear all lines for selected exercise
function clearExerciseDetails() {
  exerciseDetails[currentExerciseName] = [];
  renderExerciseDetails();
}

// Close modal if clicked outside
window.onclick = function (event) {
  const addModal = document.getElementById("addExerciseModal");
  const exerciseModal = document.getElementById("exerciseModal");

  if (event.target === addModal) {
    closeAddExerciseModal();
  }

  if (event.target === exerciseModal) {
    closeExerciseModal();
  }
};