const express = require('express');
const path = require('path');
const Database = require('better-sqlite3');
const session = require('express-session');
const crypto = require('crypto');

const app = express();

// ═══════════════════════════════════════════════════════════════
//  MIDDLEWARE
// ═══════════════════════════════════════════════════════════════
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET || 'fittracker-super-secret-2025',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 24, httpOnly: true } // 24 hours
}));

// Serve public folder but don't auto-load index.html at "/"
app.use(express.static(path.join(__dirname, 'public'), { index: false }));

// ═══════════════════════════════════════════════════════════════
//  DATABASE SETUP
// ═══════════════════════════════════════════════════════════════
const db = new Database('./fittracker.db');
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  -- USERS
  CREATE TABLE IF NOT EXISTS users (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT    NOT NULL DEFAULT '',
    email       TEXT    NOT NULL UNIQUE,
    password    TEXT    NOT NULL,
    age         INTEGER,
    height      TEXT,
    weight      TEXT,
    goal        TEXT,
    created_at  TEXT    DEFAULT (datetime('now'))
  );

  -- ACTIVITIES
  CREATE TABLE IF NOT EXISTS activities (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id   INTEGER NOT NULL,
    activity  TEXT    NOT NULL,
    duration  TEXT,
    calories  TEXT,
    notes     TEXT,
    date      TEXT    DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  -- MEALS / NUTRITION
  CREATE TABLE IF NOT EXISTS meals (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id   INTEGER NOT NULL,
    meal_name TEXT    NOT NULL,
    calories  REAL    DEFAULT 0,
    protein   REAL    DEFAULT 0,
    carbs     REAL    DEFAULT 0,
    fats      REAL    DEFAULT 0,
    date      TEXT    DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  -- WORKOUTS
  CREATE TABLE IF NOT EXISTS workouts (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id   INTEGER NOT NULL,
    name      TEXT    NOT NULL,
    sets      INTEGER DEFAULT 0,
    reps      INTEGER DEFAULT 0,
    weight    TEXT,
    notes     TEXT,
    date      TEXT    DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  -- WEIGHT LOG
  CREATE TABLE IF NOT EXISTS weight_log (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id   INTEGER NOT NULL,
    weight    REAL    NOT NULL,
    date      TEXT    DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  -- GOALS
  CREATE TABLE IF NOT EXISTS goals (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id          INTEGER NOT NULL UNIQUE,
    target_weight    REAL,
    target_calories  INTEGER,
    target_workouts  INTEGER,
    updated_at       TEXT    DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  -- SUBSCRIPTIONS
  CREATE TABLE IF NOT EXISTS subscriptions (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id       INTEGER NOT NULL,
    plan          TEXT    NOT NULL DEFAULT 'Basic',
    status        TEXT    NOT NULL DEFAULT 'active',
    paypal_sub_id TEXT,
    created_at    TEXT    DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
`);

// ═══════════════════════════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════════════════════════
const SALT = 'fittracker-salt-2025';
const hash = p => crypto.createHash('sha256').update(p + SALT).digest('hex');

const requireAuth = (req, res, next) => {
  if (!req.session.user)
    return res.status(401).json({ success: false, message: 'Please log in first' });
  next();
};

const requireAdmin = (req, res, next) => {
  if (!req.session.isAdmin)
    return res.status(403).json({ success: false, message: 'Admin access required' });
  next();
};

// ═══════════════════════════════════════════════════════════════
//  SEED DEMO USER  (runs once on first start)
// ═══════════════════════════════════════════════════════════════
if (!db.prepare('SELECT id FROM users WHERE email=?').get('demo@fittracker.app')) {
  db.prepare('INSERT INTO users(name,email,password) VALUES(?,?,?)').run(
    'Demo User', 'demo@fittracker.app', hash('Passw0rd!')
  );
  console.log('✅  Demo user created  →  demo@fittracker.app / Passw0rd!');
}

// ═══════════════════════════════════════════════════════════════
//  LANDING & PAGE ROUTES
// ═══════════════════════════════════════════════════════════════
app.get('/', (req, res) =>
  res.sendFile(path.join(__dirname, 'public', 'index.html'))
);

// Redirect bare /login, /register etc. → their .html counterparts if needed
app.get('/login',    (req, res) => res.redirect('/login.html'));
app.get('/register', (req, res) => res.redirect('/register.html'));
app.get('/dashboard',(req, res) => res.redirect('/dashboard.html'));
app.get('/admin',    (req, res) => res.redirect('/admin.html'));

// ═══════════════════════════════════════════════════════════════
//  AUTH  —  /register  /login  /logout  /api/session
// ═══════════════════════════════════════════════════════════════

/** POST /register */
app.post('/register', (req, res) => {
  const { name, email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ success: false, message: 'Email and password are required' });
  if (password.length < 6)
    return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
  try {
    db.prepare('INSERT INTO users(name,email,password) VALUES(?,?,?)').run(
      (name || '').trim(), email.trim().toLowerCase(), hash(password)
    );
    res.json({ success: true, message: 'Account created successfully!' });
  } catch {
    res.status(409).json({ success: false, message: 'That email is already registered' });
  }
});

/** POST /login */
app.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ success: false, message: 'Email and password are required' });

  const user = db.prepare('SELECT * FROM users WHERE email=? AND password=?')
    .get(email.trim().toLowerCase(), hash(password));
  if (!user)
    return res.status(401).json({ success: false, message: 'Invalid email or password' });

  req.session.regenerate(err => {
    if (err) return res.status(500).json({ success: false, message: 'Login failed, please try again' });
    req.session.user = { id: user.id, name: user.name, email: user.email };
    res.json({ success: true, user: req.session.user });
  });
});

/** POST /logout */
app.post('/logout', (req, res) => {
  req.session.destroy(() => res.json({ success: true, message: 'Logged out successfully' }));
});

/** GET /api/session  —  check if currently logged in */
app.get('/api/session', (req, res) => {
  if (!req.session.user)
    return res.status(401).json({ success: false, message: 'Not logged in' });
  res.json({ success: true, user: req.session.user });
});

// ═══════════════════════════════════════════════════════════════
//  ADMIN AUTH  —  /admin-login  /admin-logout
// ═══════════════════════════════════════════════════════════════

/** POST /admin-login */
app.post('/admin-login', (req, res) => {
  const { email, password } = req.body;
  const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@fittracker.com';
  const ADMIN_PASS  = process.env.ADMIN_PASS  || 'admin123';

  if (email === ADMIN_EMAIL && password === ADMIN_PASS) {
    req.session.isAdmin = true;
    return res.json({ success: true, message: 'Admin login successful' });
  }
  res.status(401).json({ success: false, message: 'Invalid admin credentials' });
});

/** POST /admin-logout */
app.post('/admin-logout', (req, res) => {
  req.session.isAdmin = false;
  res.json({ success: true, message: 'Admin logged out' });
});

// ═══════════════════════════════════════════════════════════════
//  ADMIN  —  /api/admin/*   (all require admin session)
// ═══════════════════════════════════════════════════════════════

/** GET /api/admin/stats */
app.get('/api/admin/stats', requireAdmin, (req, res) => {
  const totalUsers         = db.prepare('SELECT COUNT(*) AS c FROM users').get().c;
  const totalActivities    = db.prepare('SELECT COUNT(*) AS c FROM activities').get().c;
  const totalMeals         = db.prepare('SELECT COUNT(*) AS c FROM meals').get().c;
  const totalWorkouts      = db.prepare('SELECT COUNT(*) AS c FROM workouts').get().c;
  const totalSubscriptions = db.prepare("SELECT COUNT(*) AS c FROM subscriptions WHERE status='active'").get().c;
  res.json({ success: true, stats: { totalUsers, totalActivities, totalMeals, totalWorkouts, totalSubscriptions } });
});

/** GET /api/admin/users */
app.get('/api/admin/users', requireAdmin, (req, res) => {
  const users = db.prepare(
    'SELECT id,name,email,age,height,weight,goal,created_at FROM users ORDER BY created_at DESC'
  ).all();
  res.json({ success: true, users });
});

/** DELETE /api/admin/users/:id */
app.delete('/api/admin/users/:id', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM users WHERE id=?').run(req.params.id);
  res.json({ success: true, message: 'User deleted' });
});

/** GET /api/admin/activities */
app.get('/api/admin/activities', requireAdmin, (req, res) => {
  const activities = db.prepare(`
    SELECT a.*, u.name AS user_name, u.email AS user_email
    FROM activities a JOIN users u ON a.user_id = u.id
    ORDER BY a.id DESC
  `).all();
  res.json({ success: true, activities });
});

/** GET /api/admin/subscriptions */
app.get('/api/admin/subscriptions', requireAdmin, (req, res) => {
  const subscriptions = db.prepare(`
    SELECT s.*, u.name AS user_name, u.email AS user_email
    FROM subscriptions s JOIN users u ON s.user_id = u.id
    ORDER BY s.created_at DESC
  `).all();
  res.json({ success: true, subscriptions });
});

// ═══════════════════════════════════════════════════════════════
//  PROFILE / SETTINGS  —  /api/settings
// ═══════════════════════════════════════════════════════════════

/** GET /api/settings  —  fetch current user profile */
app.get('/api/settings', requireAuth, (req, res) => {
  const user = db.prepare(
    'SELECT id,name,email,age,height,weight,goal FROM users WHERE id=?'
  ).get(req.session.user.id);
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });
  res.json({ success: true, user });
});

/** POST /api/settings  —  update profile fields */
app.post('/api/settings', requireAuth, (req, res) => {
  const { name, age, height, weight, goal } = req.body;
  db.prepare('UPDATE users SET name=?,age=?,height=?,weight=?,goal=? WHERE id=?')
    .run(name || '', age || null, height || '', weight || '', goal || '', req.session.user.id);
  if (name) req.session.user.name = name;
  res.json({ success: true, message: 'Profile updated successfully' });
});

/** POST /api/settings/password  —  change password */
app.post('/api/settings/password', requireAuth, (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!newPassword || newPassword.length < 6)
    return res.status(400).json({ success: false, message: 'New password must be at least 6 characters' });

  const user = db.prepare('SELECT id FROM users WHERE id=? AND password=?')
    .get(req.session.user.id, hash(currentPassword));
  if (!user)
    return res.status(401).json({ success: false, message: 'Current password is incorrect' });

  db.prepare('UPDATE users SET password=? WHERE id=?').run(hash(newPassword), req.session.user.id);
  res.json({ success: true, message: 'Password changed successfully' });
});

// ═══════════════════════════════════════════════════════════════
//  ACTIVITIES  —  /api/activity
// ═══════════════════════════════════════════════════════════════

/** POST /api/activity  —  log a new activity */
app.post('/api/activity', requireAuth, (req, res) => {
  const { activity, duration, calories, notes } = req.body;
  if (!activity)
    return res.status(400).json({ success: false, message: 'Activity name is required' });
  db.prepare('INSERT INTO activities(user_id,activity,duration,calories,notes) VALUES(?,?,?,?,?)')
    .run(req.session.user.id, activity, duration || '', calories || '', notes || '');
  res.json({ success: true, message: 'Activity logged!' });
});

/** GET /api/activity  —  get all activities for current user */
app.get('/api/activity', requireAuth, (req, res) => {
  const activities = db.prepare(
    'SELECT * FROM activities WHERE user_id=? ORDER BY id DESC'
  ).all(req.session.user.id);
  res.json({ success: true, activities });
});

/** DELETE /api/activity/:id  —  delete one activity */
app.delete('/api/activity/:id', requireAuth, (req, res) => {
  const r = db.prepare('DELETE FROM activities WHERE id=? AND user_id=?')
    .run(req.params.id, req.session.user.id);
  r.changes
    ? res.json({ success: true, message: 'Activity deleted' })
    : res.status(404).json({ success: false, message: 'Activity not found' });
});

// ═══════════════════════════════════════════════════════════════
//  MEALS / NUTRITION  —  /api/meals
// ═══════════════════════════════════════════════════════════════

/** POST /api/meals  —  log a meal */
app.post('/api/meals', requireAuth, (req, res) => {
  const { meal_name, calories, protein, carbs, fats } = req.body;
  if (!meal_name)
    return res.status(400).json({ success: false, message: 'Meal name is required' });
  db.prepare('INSERT INTO meals(user_id,meal_name,calories,protein,carbs,fats) VALUES(?,?,?,?,?,?)')
    .run(req.session.user.id, meal_name, calories || 0, protein || 0, carbs || 0, fats || 0);
  res.json({ success: true, message: 'Meal logged!' });
});

/** GET /api/meals  —  all meals for current user */
app.get('/api/meals', requireAuth, (req, res) => {
  const meals = db.prepare(
    'SELECT * FROM meals WHERE user_id=? ORDER BY id DESC'
  ).all(req.session.user.id);
  res.json({ success: true, meals });
});

/** GET /api/meals/today  —  today's meals + macro totals */
app.get('/api/meals/today', requireAuth, (req, res) => {
  const meals = db.prepare(
    "SELECT * FROM meals WHERE user_id=? AND date(date)=date('now') ORDER BY id DESC"
  ).all(req.session.user.id);
  const totals = meals.reduce((acc, m) => ({
    calories: acc.calories + (m.calories || 0),
    protein:  acc.protein  + (m.protein  || 0),
    carbs:    acc.carbs    + (m.carbs    || 0),
    fats:     acc.fats     + (m.fats     || 0),
  }), { calories: 0, protein: 0, carbs: 0, fats: 0 });
  res.json({ success: true, meals, totals });
});

/** DELETE /api/meals/:id */
app.delete('/api/meals/:id', requireAuth, (req, res) => {
  const r = db.prepare('DELETE FROM meals WHERE id=? AND user_id=?')
    .run(req.params.id, req.session.user.id);
  r.changes
    ? res.json({ success: true, message: 'Meal deleted' })
    : res.status(404).json({ success: false, message: 'Meal not found' });
});

// ═══════════════════════════════════════════════════════════════
//  WORKOUTS  —  /api/workouts
// ═══════════════════════════════════════════════════════════════

/** POST /api/workouts  —  log a workout */
app.post('/api/workouts', requireAuth, (req, res) => {
  const { name, sets, reps, weight, notes } = req.body;
  if (!name)
    return res.status(400).json({ success: false, message: 'Workout name is required' });
  db.prepare('INSERT INTO workouts(user_id,name,sets,reps,weight,notes) VALUES(?,?,?,?,?,?)')
    .run(req.session.user.id, name, sets || 0, reps || 0, weight || '', notes || '');
  res.json({ success: true, message: 'Workout logged!' });
});

/** GET /api/workouts */
app.get('/api/workouts', requireAuth, (req, res) => {
  const workouts = db.prepare(
    'SELECT * FROM workouts WHERE user_id=? ORDER BY id DESC'
  ).all(req.session.user.id);
  res.json({ success: true, workouts });
});

/** DELETE /api/workouts/:id */
app.delete('/api/workouts/:id', requireAuth, (req, res) => {
  const r = db.prepare('DELETE FROM workouts WHERE id=? AND user_id=?')
    .run(req.params.id, req.session.user.id);
  r.changes
    ? res.json({ success: true, message: 'Workout deleted' })
    : res.status(404).json({ success: false, message: 'Workout not found' });
});

// ═══════════════════════════════════════════════════════════════
//  WEIGHT LOG  —  /api/weight
// ═══════════════════════════════════════════════════════════════

/** POST /api/weight */
app.post('/api/weight', requireAuth, (req, res) => {
  const { weight } = req.body;
  if (!weight)
    return res.status(400).json({ success: false, message: 'Weight value is required' });
  db.prepare('INSERT INTO weight_log(user_id,weight) VALUES(?,?)').run(req.session.user.id, weight);
  res.json({ success: true, message: 'Weight logged!' });
});

/** GET /api/weight */
app.get('/api/weight', requireAuth, (req, res) => {
  const logs = db.prepare(
    'SELECT * FROM weight_log WHERE user_id=? ORDER BY date DESC'
  ).all(req.session.user.id);
  res.json({ success: true, logs });
});

/** DELETE /api/weight/:id */
app.delete('/api/weight/:id', requireAuth, (req, res) => {
  const r = db.prepare('DELETE FROM weight_log WHERE id=? AND user_id=?')
    .run(req.params.id, req.session.user.id);
  r.changes
    ? res.json({ success: true, message: 'Entry deleted' })
    : res.status(404).json({ success: false, message: 'Entry not found' });
});

// ═══════════════════════════════════════════════════════════════
//  GOALS  —  /api/goals
// ═══════════════════════════════════════════════════════════════

/** GET /api/goals */
app.get('/api/goals', requireAuth, (req, res) => {
  const goals = db.prepare('SELECT * FROM goals WHERE user_id=?').get(req.session.user.id);
  res.json({ success: true, goals: goals || {} });
});

/** POST /api/goals  —  create or update */
app.post('/api/goals', requireAuth, (req, res) => {
  const { target_weight, target_calories, target_workouts } = req.body;
  const existing = db.prepare('SELECT id FROM goals WHERE user_id=?').get(req.session.user.id);
  if (existing) {
    db.prepare(`
      UPDATE goals
      SET target_weight=?, target_calories=?, target_workouts=?, updated_at=datetime('now')
      WHERE user_id=?
    `).run(target_weight || null, target_calories || null, target_workouts || null, req.session.user.id);
  } else {
    db.prepare('INSERT INTO goals(user_id,target_weight,target_calories,target_workouts) VALUES(?,?,?,?)')
      .run(req.session.user.id, target_weight || null, target_calories || null, target_workouts || null);
  }
  res.json({ success: true, message: 'Goals saved!' });
});

// ═══════════════════════════════════════════════════════════════
//  SUBSCRIPTIONS  —  /api/subscription  /api/subscribe
// ═══════════════════════════════════════════════════════════════

/** GET /api/subscription/config  —  PayPal client ID + plan IDs */
app.get('/api/subscription/config', (req, res) => {
  res.json({
    clientId: process.env.PAYPAL_CLIENT_ID || 'YOUR_PAYPAL_CLIENT_ID_HERE',
    plans: {
      Basic:   process.env.PAYPAL_PLAN_BASIC   || 'PLAN_ID_BASIC',
      Premium: process.env.PAYPAL_PLAN_PREMIUM || 'PLAN_ID_PREMIUM',
      Pro:     process.env.PAYPAL_PLAN_PRO     || 'PLAN_ID_PRO',
    }
  });
});

/** GET /api/subscription  —  current user's active subscription */
app.get('/api/subscription', requireAuth, (req, res) => {
  const sub = db.prepare(
    'SELECT * FROM subscriptions WHERE user_id=? ORDER BY created_at DESC LIMIT 1'
  ).get(req.session.user.id);
  res.json({ success: true, subscription: sub || { status: 'none', plan: null } });
});

/** POST /api/subscribe  —  called after PayPal payment approved */
app.post('/api/subscribe', requireAuth, (req, res) => {
  const { plan, paypal_sub_id } = req.body;
  const validPlans = ['Basic', 'Premium', 'Pro'];
  if (!validPlans.includes(plan))
    return res.status(400).json({ success: false, message: 'Invalid plan. Choose Basic, Premium, or Pro' });

  // Cancel any existing active subscription first
  db.prepare("UPDATE subscriptions SET status='cancelled' WHERE user_id=?").run(req.session.user.id);
  // Insert new subscription
  db.prepare("INSERT INTO subscriptions(user_id,plan,status,paypal_sub_id) VALUES(?,?,'active',?)")
    .run(req.session.user.id, plan, paypal_sub_id || null);

  res.json({ success: true, message: `Subscribed to ${plan} plan!` });
});

/** POST /api/subscription/cancel */
app.post('/api/subscription/cancel', requireAuth, (req, res) => {
  db.prepare("UPDATE subscriptions SET status='cancelled' WHERE user_id=?").run(req.session.user.id);
  res.json({ success: true, message: 'Subscription cancelled' });
});

// ═══════════════════════════════════════════════════════════════
//  DASHBOARD  —  /api/dashboard  (one call, everything you need)
// ═══════════════════════════════════════════════════════════════

/** GET /api/dashboard */
app.get('/api/dashboard', requireAuth, (req, res) => {
  const uid = req.session.user.id;

  const user           = db.prepare('SELECT id,name,email,age,height,weight,goal FROM users WHERE id=?').get(uid);
  const goals          = db.prepare('SELECT * FROM goals WHERE user_id=?').get(uid) || {};
  const subscription   = db.prepare('SELECT * FROM subscriptions WHERE user_id=? ORDER BY created_at DESC LIMIT 1').get(uid);

  const todayMeals     = db.prepare("SELECT * FROM meals WHERE user_id=? AND date(date)=date('now') ORDER BY id DESC").all(uid);
  const recentActivity = db.prepare('SELECT * FROM activities WHERE user_id=? ORDER BY id DESC LIMIT 5').all(uid);
  const recentWorkouts = db.prepare('SELECT * FROM workouts WHERE user_id=? ORDER BY id DESC LIMIT 5').all(uid);
  const weightHistory  = db.prepare('SELECT * FROM weight_log WHERE user_id=? ORDER BY date DESC LIMIT 10').all(uid);

  const todayTotals = todayMeals.reduce((acc, m) => ({
    calories: acc.calories + (m.calories || 0),
    protein:  acc.protein  + (m.protein  || 0),
    carbs:    acc.carbs    + (m.carbs    || 0),
    fats:     acc.fats     + (m.fats     || 0),
  }), { calories: 0, protein: 0, carbs: 0, fats: 0 });

  res.json({
    success: true,
    dashboard: {
      user,
      goals,
      subscription: subscription || { status: 'none', plan: null },
      today: {
        meals: todayMeals,
        totals: todayTotals,
      },
      recentActivity,
      recentWorkouts,
      weightHistory,
    }
  });
});

// ═══════════════════════════════════════════════════════════════
//  404 FALLBACK
// ═══════════════════════════════════════════════════════════════
app.use((req, res) => {
  if (req.path.startsWith('/api/'))
    return res.status(404).json({ success: false, message: 'API endpoint not found' });
  res.redirect('/');
});

// ═══════════════════════════════════════════════════════════════
//  START
// ═══════════════════════════════════════════════════════════════
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n🚀  FitTracker  →  http://localhost:${PORT}`);
  console.log(`    Landing page : http://localhost:${PORT}/`);
  console.log(`    Login        : http://localhost:${PORT}/login.html`);
  console.log(`    Admin        : admin@fittracker.com / admin123`);
  console.log(`    Demo user    : demo@fittracker.app  / Passw0rd!\n`);
});