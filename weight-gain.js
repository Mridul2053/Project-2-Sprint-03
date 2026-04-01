const modal = document.getElementById("workoutModal");
const exerciseTitle = document.getElementById("exerciseTitle");
const weightInput = document.getElementById("weight");
const repsInput = document.getElementById("reps");
const setsInput = document.getElementById("sets");
const workoutList = document.getElementById("workoutList");

let currentExercise = "";

function openModal(exerciseName) {
  currentExercise = exerciseName;
  exerciseTitle.textContent = exerciseName;
  modal.style.display = "flex";
}

function closeModal() {
  modal.style.display = "none";
}

function addWorkout() {
  const weight = weightInput.value;
  const reps = repsInput.value;
  const sets = setsInput.value;

  if (!weight || !reps || !sets) {
    alert("Please fill all fields.");
    return;
  }

  const item = document.createElement("div");
  item.className = "workout-item";

  const text = document.createElement("span");
  text.textContent = `${currentExercise}: ${weight} kg – ${reps} reps – ${sets} sets`;

  const deleteBtn = document.createElement("button");
  deleteBtn.className = "delete-btn";
  deleteBtn.textContent = "Delete";
  deleteBtn.onclick = function () {
    item.remove();
  };

  item.appendChild(text);
  item.appendChild(deleteBtn);
  workoutList.appendChild(item);

  weightInput.value = "";
  repsInput.value = "";
  setsInput.value = "";
}

function clearAll() {
  weightInput.value = "";
  repsInput.value = "";
  setsInput.value = "";
  workoutList.innerHTML = "";
}

window.onclick = function (event) {
  if (event.target === modal) {
    closeModal();
  }
};
