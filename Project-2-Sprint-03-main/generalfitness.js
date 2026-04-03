let currentDayListId = "";

function openAddExerciseModal(dayListId, dayTitle) {
  currentDayListId = dayListId;

  const modal = document.getElementById("addExerciseModal");
  const title = document.getElementById("addModalTitle");
  const input = document.getElementById("newExerciseInput");

  title.textContent = "Add Exercise - " + dayTitle;
  input.value = "";
  modal.style.display = "flex";
  input.focus();
}

function closeAddExerciseModal() {
  document.getElementById("addExerciseModal").style.display = "none";
}

function addNewExercise() {
  const input = document.getElementById("newExerciseInput");
  const exerciseName = input.value.trim();

  if (exerciseName === "") {
    alert("Please enter an exercise name.");
    return;
  }

  const list = document.getElementById(currentDayListId);

  if (!list) {
    alert("Exercise list not found.");
    return;
  }

  const newButton = document.createElement("button");
  newButton.className = "exercise-link";
  newButton.type = "button";
  newButton.textContent = "• " + exerciseName;

  list.appendChild(newButton);

  input.value = "";
  closeAddExerciseModal();
}

window.addEventListener("click", function (event) {
  const addModal = document.getElementById("addExerciseModal");
  if (event.target === addModal) {
    closeAddExerciseModal();
  }
});

window.addEventListener("keydown", function (event) {
  const modal = document.getElementById("addExerciseModal");
  if (event.key === "Escape" && modal.style.display === "flex") {
    closeAddExerciseModal();
  }

  if (event.key === "Enter" && modal.style.display === "flex") {
    addNewExercise();
  }
});