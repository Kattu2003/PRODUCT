const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const Database = require('better-sqlite3');

const app = express();
const PORT = process.env.PORT || 9000;

app.use(cors());
app.use(express.json());

// Initialize SQLite DB
const db = new Database('data.db');
db.exec(`
CREATE TABLE IF NOT EXISTS users (
  email TEXT PRIMARY KEY,
  firstName TEXT,
  lastName TEXT,
  role TEXT NOT NULL DEFAULT 'user',
  passwordHash TEXT NOT NULL,
  passwordSalt TEXT NOT NULL,
  createdAt TEXT NOT NULL
);
`);

function hashPassword(password, salt) {
  return crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256').toString('hex');
}

// Health endpoint for container checks
app.get('/health', (req, res) => res.json({ status: 'ok', service: 'backend' }));

// Signup
app.post('/auth/signup', (req, res) => {
  const { email, password, firstName, lastName, role } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'Missing email or password' });
  }
  const existing = db.prepare('SELECT email FROM users WHERE email = ?').get(email.toLowerCase());
  if (existing) {
    return res.status(409).json({ error: 'Account already exists' });
  }
  const salt = crypto.randomBytes(16).toString('hex');
  const passwordHash = hashPassword(password, salt);
  const now = new Date().toISOString();
  const normalizedRole = role === 'therapist' ? 'therapist' : 'user';
  db.prepare('INSERT INTO users (email, firstName, lastName, role, passwordHash, passwordSalt, createdAt) VALUES (?,?,?,?,?,?,?)')
    .run(email.toLowerCase(), firstName || '', lastName || '', normalizedRole, passwordHash, salt, now);
  return res.status(201).json({ ok: true });
});

// Login
app.post('/auth/login', (req, res) => {
  const { email, password, role } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'Missing email or password' });
  }
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase());
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const computed = hashPassword(password, user.passwordSalt);
  if (computed !== user.passwordHash) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  // Optional role check (if a role was requested)
  const normalizedRole = role === 'therapist' ? 'therapist' : 'user';
  const finalRole = user.role || normalizedRole;
  return res.json({
    user: {
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: finalRole,
      fullName: `${user.firstName || ''} ${user.lastName || ''}`.trim()
    },
    token: 'demo-token'
  });
});

app.get('/auth/me', (req, res) => {
  // For demo, this would check token/session in real life
  res.json({ user: { email: 'demo@example.com', role: 'user', name: 'Demo User' } });
});

app.post('/auth/logout', (req, res) => {
  res.json({ ok: true });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend listening on ${PORT}`);
});


