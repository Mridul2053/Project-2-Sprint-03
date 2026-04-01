// ===============================
// FITNESS TRACKER BACKEND
// ===============================

const express = require('express');
const fs = require('fs');
const cors = require('cors');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

const DB_FILE = 'database.json';

// ===============================
// DATABASE FUNCTIONS
// ===============================
function readDB() {
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
  } catch {
    return { users: [] };
  }
}

function writeDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

if (!fs.existsSync(DB_FILE)) {
  writeDB({ users: [] });
}

// ===============================
// HELPERS
// ===============================
function getUser(db, username) {
  return db.users.find(u => u.username === username);
}

function safeNumber(val) {
  const num = Number(val);
  return isNaN(num) || num < 0 ? 0 : num;
}

// ===============================
// REGISTER
// ===============================
app.post('/register', (req, res) => {
  const { username } = req.body;

  if (!username || username.length < 3) {
    return res.status(400).json({ error: 'Invalid username' });
  }

  const db = readDB();

  if (getUser(db, username)) {
    return res.status(400).json({ error: 'User exists' });
  }

  const newUser = {
    username,
    createdAt: new Date().toISOString(),

    dashboard: {
      calories: 0,
      workout: 0,
      steps: 0,
      water: 0
    },

    goals: {
      calorieTarget: 2200,
      targetWeight: 68,
      currentWeight: 72
    },

    activity: []
  };

  db.users.push(newUser);
  writeDB(db);

  res.json({ message: 'Registered', user: newUser });
});

// ===============================
// LOGIN
// ===============================
app.post('/login', (req, res) => {
  const { username } = req.body;

  const db = readDB();
  const user = getUser(db, username);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json({ message: 'Login success', user });
});

// ===============================
// GET FULL DASHBOARD (MAIN API)
// ===============================
app.get('/dashboard/:username', (req, res) => {
  const { username } = req.params;

  const db = readDB();
  const user = getUser(db, username);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const percent = Math.min(
    Math.round((user.dashboard.calories / user.goals.calorieTarget) * 100),
    100
  );

  res.json({
    ...user.dashboard,
    goals: user.goals,
    goalPercent: percent,
    activity: user.activity.slice(-5).reverse()
  });
});

// ===============================
// UPDATE DAILY DATA
// ===============================
app.post('/dashboard/:username', (req, res) => {
  const { username } = req.params;
  let { workout, steps, water, calories } = req.body;

  const db = readDB();
  const user = getUser(db, username);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  // sanitize
  workout = safeNumber(workout);
  steps = safeNumber(steps);
  water = safeNumber(water);
  calories = safeNumber(calories);

  user.dashboard = { workout, steps, water, calories };

  // update activity log
  user.activity.push({
    date: new Date().toISOString(),
    workout,
    steps,
    water,
    calories
  });

  writeDB(db);

  res.json({ message: 'Updated', dashboard: user.dashboard });
});

// ===============================
// UPDATE WEIGHT
// ===============================
app.post('/weight/:username', (req, res) => {
  const { username } = req.params;
  let { currentWeight } = req.body;

  const db = readDB();
  const user = getUser(db, username);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  currentWeight = safeNumber(currentWeight);

  user.goals.currentWeight = currentWeight;

  writeDB(db);

  res.json({
    message: 'Weight updated',
    currentWeight
  });
});

// ===============================
// RESET DAY
// ===============================
app.post('/reset/:username', (req, res) => {
  const { username } = req.params;

  const db = readDB();
  const user = getUser(db, username);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  user.dashboard = {
    calories: 0,
    workout: 0,
    steps: 0,
    water: 0
  };

  writeDB(db);

  res.json({ message: 'Day reset' });
});

// ===============================
// DELETE USER
// ===============================
app.delete('/user/:username', (req, res) => {
  const { username } = req.params;

  const db = readDB();
  db.users = db.users.filter(u => u.username !== username);

  writeDB(db);

  res.json({ message: 'User deleted' });
});

// ===============================
// START SERVER
// ===============================
app.listen(PORT, () => {
  console.log(`🔥 Server running at http://localhost:${PORT}`);
});
