const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const Database = require('better-sqlite3');

const app = express();

app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

const db = new Database('./fittracker.db');

// CREATE USERS TABLE
db.prepare(`
CREATE TABLE IF NOT EXISTS users(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE,
  password TEXT
)
`).run();

// HOME PAGE
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// REGISTER
app.post('/register', (req, res) => {
  const { email, password } = req.body;

  try {
    const stmt = db.prepare(
      'INSERT INTO users(email, password) VALUES(?, ?)'
    );

    stmt.run(email, password);

    res.json({ success: true });
  } catch (err) {
    res.json({ success: false, message: 'Email already exists or registration failed' });
  }
});

// LOGIN
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

// ADMIN LOGIN
app.post('/admin-login', (req, res) => {
  const { email, password } = req.body;

  if (email === 'admin@fittracker.com' && password === 'admin123') {
    res.json({ success: true });
  } else {
    res.json({ success: false, message: 'Invalid admin login' });
  }
});

// START SERVER
app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});