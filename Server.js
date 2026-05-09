const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const Database = require('better-sqlite3');

const app = express();

app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));
// =====================
// PAGE ROUTES
// =====================
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'home.html'));
});
app.use(express.static(path.join(__dirname, 'public')));


const db = new Database('./fittracker.db');

// =====================
// DATABASE TABLES
// =====================
db.prepare(`
CREATE TABLE IF NOT EXISTS users(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT,
  email TEXT UNIQUE,
  password TEXT,
  age INTEGER,
  height TEXT,
  weight TEXT,
  goal TEXT
)
`).run();

db.prepare(`
CREATE TABLE IF NOT EXISTS activities(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_email TEXT,
  activity_type TEXT,
  duration TEXT,
  calories TEXT,
  activity_date TEXT DEFAULT CURRENT_TIMESTAMP
)
`).run();

db.prepare(`
CREATE TABLE IF NOT EXISTS subscriptions(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_email TEXT,
  plan TEXT,
  status TEXT DEFAULT 'active',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
)
`).run();
db.prepare(`
CREATE TABLE IF NOT EXISTS activities(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_email TEXT,
  activity TEXT,
  duration TEXT,
  calories TEXT,
  notes TEXT,
  date TEXT DEFAULT CURRENT_TIMESTAMP
)
  
`).run();


// =====================
// USER REGISTER
// =====================
app.post('/register', (req, res) => {
  const { name, email, password } = req.body;

  try {
    const stmt = db.prepare(
      'INSERT INTO users(name, email, password) VALUES (?, ?, ?)'
    );

    stmt.run(name || '', email, password);

    res.json({ success: true, message: 'User registered successfully' });
  } catch (err) {
    res.json({ success: false, message: 'Email already exists' });
  }
});

// =====================
// USER LOGIN
// =====================
app.post('/login', (req, res) => {
  const { email, password } = req.body;

  const stmt = db.prepare(
    'SELECT * FROM users WHERE email = ? AND password = ?'
  );

  const user = stmt.get(email, password);

  if (user) {
    res.json({ success: true, user });
  } else {
    res.json({ success: false, message: 'Invalid email or password' });
  }
});

// =====================
// ADMIN LOGIN
// =====================
app.post('/admin-login', (req, res) => {
  const { email, password } = req.body;

  if (email === 'admin@fittracker.com' && password === 'admin123') {
    res.json({ success: true, message: 'Admin login successful' });
  } else {
    res.json({ success: false, message: 'Invalid admin login' });
  }
});

// =====================
// ADMIN: GET ALL USERS
// =====================
app.get('/api/admin/users', (req, res) => {
  const users = db.prepare('SELECT id, name, email FROM users').all();
  res.json(users);
});

// =====================
// SETTINGS UPDATE
// =====================
app.post('/api/settings', (req, res) => {
  const { email, name, age, height, weight, goal } = req.body;

  try {
    db.prepare(`
      UPDATE users 
      SET name = ?, age = ?, height = ?, weight = ?, goal = ?
      WHERE email = ?
    `).run(name, age, height, weight, goal, email);

    res.json({ success: true, message: 'Settings updated successfully' });
  } catch (err) {
    res.json({ success: false, message: 'Settings update failed' });
  }
});

// ADD ACTIVITY
app.post('/api/activity', (req, res) => {
  const { user_email, activity, duration, calories, notes } = req.body;

  try {
    const stmt = db.prepare(`
      INSERT INTO activities
      (user_email, activity, duration, calories, notes)
      VALUES (?, ?, ?, ?, ?)
    `);

    stmt.run(
      user_email,
      activity,
      duration,
      calories,
      notes
    );

    res.json({
      success: true,
      message: 'Activity added successfully'
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Failed to add activity'
    });
    
  }
});

// =====================
// ACTIVITY LOG GET
// =====================
// GET ACTIVITIES
app.get('/api/activity', (req, res) => {

  try {

    const stmt = db.prepare(`
      SELECT * FROM activities
      ORDER BY id DESC
    `);

    const activities = stmt.all();

    res.json({
      success: true,
      activities
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      success: false,
      message: 'Failed to fetch activities'
    });
  }
});

// =====================
// PAYPAL / SUBSCRIPTION BASIC SAVE
// =====================
app.post('/api/subscribe', (req, res) => {
  const { email, plan } = req.body;

  try {
    db.prepare(`
      INSERT INTO subscriptions(user_email, plan, status)
      VALUES (?, ?, ?)
    `).run(email || '', plan || 'Premium', 'active');

    res.json({ success: true, message: 'Subscription saved' });
  } catch (err) {
    res.json({ success: false, message: 'Subscription failed' });
  }
});

// =====================
// GET SUBSCRIPTION STATUS
// =====================
app.get('/api/subscription', (req, res) => {
  const email = req.query.email || '';

  const sub = db.prepare(`
    SELECT * FROM subscriptions
    WHERE user_email = ?
    ORDER BY created_at DESC
    LIMIT 1
  `).get(email);

  res.json(sub || { status: 'none' });
});

// =====================
// START SERVER
// =====================
app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});