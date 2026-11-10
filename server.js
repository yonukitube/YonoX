'use strict';

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');

const ROOT = __dirname;
const PORT = 8766;
const HOST = '0.0.0.0';

const PID_FILE = path.join(ROOT, 'server.pid');

function processIsAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error.code !== 'ESRCH';
  }
}

function stopPreviousYonoX() {
  let oldPid;

  try {
    oldPid = Number(fs.readFileSync(PID_FILE, 'utf8').trim());
  } catch {
    return;
  }

  if (!Number.isSafeInteger(oldPid) || oldPid <= 0 || oldPid === process.pid) {
    throw new Error('Invalid YonoX PID file. Check server.pid before starting.');
  }

  if (!processIsAlive(oldPid)) {
    fs.unlinkSync(PID_FILE);
    return;
  }

  let args, cwd;
  try {
    args = fs.readFileSync(`/proc/${oldPid}/cmdline`, 'utf8').split('\0');
    cwd = fs.readlinkSync(`/proc/${oldPid}/cwd`);
  } catch {
    throw new Error('Cannot verify the previous PID. Refusing to stop an unknown process.');
  }

  const isYonoX =
    cwd === ROOT &&
    path.basename(args[0] || '') === 'node' &&
    args[1] &&
    path.resolve(cwd, args[1]) === path.join(ROOT, 'server.js');

  if (!isYonoX) {
    throw new Error(`PID ${oldPid} is not verified as YonoX. No process was stopped.`);
  }

  console.log(`Stopping previous YonoX process ${oldPid}...`);
  process.kill(oldPid, 'SIGTERM');

  const waitCell = new Int32Array(new SharedArrayBuffer(4));
  for (let i = 0; i < 80 && processIsAlive(oldPid); i++) {
    Atomics.wait(waitCell, 0, 0, 100);
  }

  if (processIsAlive(oldPid)) {
    throw new Error('Previous YonoX process did not stop. Refusing to start another copy.');
  }

  try {
    if (fs.readFileSync(PID_FILE, 'utf8').trim() === String(oldPid)) {
      fs.unlinkSync(PID_FILE);
    }
  } catch {}

  console.log('Previous YonoX process stopped.');
}

stopPreviousYonoX();

process.on('exit', () => {
  try {
    if (fs.readFileSync(PID_FILE, 'utf8').trim() === String(process.pid)) {
      fs.unlinkSync(PID_FILE);
    }
  } catch {}
});

const DB = new DatabaseSync(path.join(ROOT, 'yonox.db'));

DB.exec(`
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  balance REAL NOT NULL DEFAULT 1000,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS companies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  ticker TEXT NOT NULL UNIQUE,
  total_shares INTEGER NOT NULL,
  available_shares INTEGER NOT NULL,
  initial_price REAL NOT NULL,
  current_price REAL NOT NULL,
  owner_id INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  treasury_balance REAL NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS holdings (
  user_id INTEGER NOT NULL REFERENCES users(id),
  company_id INTEGER NOT NULL REFERENCES companies(id),
  quantity INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, company_id)
);

CREATE TABLE IF NOT EXISTS trades (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  company_id INTEGER NOT NULL REFERENCES companies(id),
  side TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  price REAL NOT NULL,
  total REAL NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  expires_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_companies_owner ON companies(owner_id);
CREATE INDEX IF NOT EXISTS idx_trades_user ON trades(user_id);
CREATE INDEX IF NOT EXISTS idx_trades_company ON trades(company_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
`);

DB.exec(`
CREATE TABLE IF NOT EXISTS price_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  price REAL NOT NULL,
  recorded_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_price_history_company
ON price_history(company_id, id);
`);

DB.exec(`
CREATE TABLE IF NOT EXISTS math_daily (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day_key TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0 CHECK(attempts BETWEEN 0 AND 20),
  total_reward INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY(user_id, day_key)
);

CREATE TABLE IF NOT EXISTS math_questions (
  challenge_id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day_key TEXT NOT NULL,
  difficulty TEXT NOT NULL CHECK(difficulty IN ('easy','medium','hard')),
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  created_at TEXT NOT NULL,
  used_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_math_questions_active
ON math_questions(user_id, used_at);
`);





const companyColumns = DB.prepare('PRAGMA table_info(companies)').all();
if (!companyColumns.some(column => column.name === 'treasury_balance')) {
  DB.exec('ALTER TABLE companies ADD COLUMN treasury_balance REAL NOT NULL DEFAULT 0');
}


DB.exec(`
CREATE TABLE IF NOT EXISTS company_listings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id INTEGER NOT NULL REFERENCES companies(id),
  seller_id INTEGER NOT NULL REFERENCES users(id),
  asking_price REAL NOT NULL CHECK(asking_price >= 100 AND asking_price <= 1000),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK(status IN ('active', 'sold', 'cancelled')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  sold_at TEXT,
  buyer_id INTEGER REFERENCES users(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_company_listings_one_active
ON company_listings(company_id) WHERE status = 'active';

UPDATE company_listings
SET status = 'cancelled'
WHERE status = 'active'
AND NOT EXISTS (
  SELECT 1 FROM companies
  WHERE companies.id = company_listings.company_id
  AND companies.owner_id = company_listings.seller_id
);
`);

DB.exec(`
CREATE TABLE IF NOT EXISTS user_tokens (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
`);

const q = {
  userByName: DB.prepare('SELECT * FROM users WHERE username = ?'),
  userById: DB.prepare('SELECT id, username, balance, created_at FROM users WHERE id = ?'),
  insertUser: DB.prepare('INSERT INTO users (username, password_hash, balance) VALUES (?, ?, 1000)'),
  insertSession: DB.prepare('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)'),
  accountByToken: DB.prepare('SELECT user_id FROM user_tokens WHERE token_hash = ?'),
  upsertAccountToken: DB.prepare(`
    INSERT INTO user_tokens (user_id, token_hash)
    VALUES (?, ?)
    ON CONFLICT(user_id) DO UPDATE SET
      token_hash = excluded.token_hash,
      created_at = CURRENT_TIMESTAMP
  `),
  session: DB.prepare(`
    SELECT users.id, users.username, users.balance
    FROM sessions JOIN users ON users.id = sessions.user_id
    WHERE sessions.token_hash = ? AND sessions.expires_at > ?
  `),
  deleteSession: DB.prepare('DELETE FROM sessions WHERE token_hash = ?'),
  deleteExpired: DB.prepare('DELETE FROM sessions WHERE expires_at <= ?'),
  companies: DB.prepare('SELECT * FROM companies ORDER BY id DESC'),
  company: DB.prepare('SELECT * FROM companies WHERE id = ?'),
  insertCompany: DB.prepare(`
    INSERT INTO companies
    (name, ticker, total_shares, available_shares, initial_price, current_price, owner_id)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `),
  holding: DB.prepare('SELECT quantity FROM holdings WHERE user_id = ? AND company_id = ?'),
  upsertHolding: DB.prepare(`
    INSERT INTO holdings (user_id, company_id, quantity)
    VALUES (?, ?, ?)
    ON CONFLICT(user_id, company_id)
    DO UPDATE SET quantity = holdings.quantity + excluded.quantity
  `),
  holdings: DB.prepare(`
    SELECT holdings.quantity, companies.id AS company_id,
           companies.name, companies.ticker, companies.current_price
    FROM holdings JOIN companies ON companies.id = holdings.company_id
    WHERE holdings.user_id = ? AND holdings.quantity > 0
    ORDER BY companies.name
  `),
  updateBalance: DB.prepare('UPDATE users SET balance = ? WHERE id = ?'),
  updateTreasury: DB.prepare('UPDATE companies SET treasury_balance = ? WHERE id = ?'),
  updateAvailable: DB.prepare('UPDATE companies SET available_shares = ? WHERE id = ?'),
  updatePrice: DB.prepare('UPDATE companies SET current_price = ? WHERE id = ?'),
  insertPriceHistory: DB.prepare(
    'INSERT INTO price_history (company_id, price) VALUES (?, ?)'
  ),
  priceHistory: DB.prepare(`
    SELECT price FROM price_history
    WHERE company_id = ? ORDER BY id DESC LIMIT 200
  `),
  priceHistoryCount: DB.prepare(
    'SELECT COUNT(*) AS count FROM price_history WHERE company_id = ?'
  ),
  marketTrades: DB.prepare(`
    SELECT side, quantity, price FROM trades
    WHERE company_id = ? ORDER BY id ASC
  `),
  insertTrade: DB.prepare(`
    INSERT INTO trades (user_id, company_id, side, quantity, price, total)
    VALUES (?, ?, ?, ?, ?, ?)
  `),
  updateHolding: DB.prepare(`
    UPDATE holdings SET quantity = quantity - ?
    WHERE user_id = ? AND company_id = ?
  `),
  history: DB.prepare(`
    SELECT trades.*, companies.name, companies.ticker
    FROM trades JOIN companies ON companies.id = trades.company_id
    WHERE trades.user_id = ? ORDER BY trades.id DESC LIMIT 100
  `)
};


const seedCompany = DB.prepare(`
  INSERT OR IGNORE INTO companies
  (name, ticker, total_shares, available_shares, initial_price, current_price)
  VALUES (?, ?, ?, ?, ?, ?)
`);

for (const c of [
  ['NOVA Technologies', 'NOVA', 100000, 100000, 125.40, 125.40],
  ['Green Energy', 'GREN', 100000, 100000, 82.15, 82.15],
  ['Future Motors', 'FUTR', 100000, 100000, 64.90, 64.90]
]) seedCompany.run(...c);

// Backfill price history for existing companies only once.
for (const company of q.companies.all()) {
  if (Number(q.priceHistoryCount.get(company.id).count) > 0) continue;

  const initialPrice = Number(company.initial_price);
  const issuedShares = Math.max(1, Number(company.total_shares));

  q.insertPriceHistory.run(company.id, initialPrice);

  for (const trade of q.marketTrades.all(company.id)) {
    const executionPrice = Number(trade.price);
    const quantity = Number(trade.quantity);
    const impact = Math.min(0.03, (quantity / issuedShares) * 0.5);
    const direction = trade.side === 'BUY' ? 1 : -1;
    const calculated = executionPrice * (1 + direction * impact);
    const nextPrice = Math.min(
      initialPrice * 10,
      Math.max(
        initialPrice * 0.10,
        Math.round(calculated * 1000000) / 1000000
      )
    );

    q.insertPriceHistory.run(company.id, nextPrice);
  }

  const latest = q.priceHistory.get(company.id);
  const currentPrice = Number(company.current_price);

  if (!latest || Math.abs(Number(latest.price) - currentPrice) > 0.0000005) {
    q.insertPriceHistory.run(company.id, currentPrice);
  }
}

function json(res, status, data, extraHeaders = {}) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    ...extraHeaders
  });
  res.end(JSON.stringify(data));
}

function fail(res, status, message) {
  json(res, status, { error: message });
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', chunk => {
      raw += chunk;
      if (raw.length > 32768) {
        reject(new Error('Request too large'));
        req.destroy();
      }
    });
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  const [salt, expected] = String(stored).split(':');
  if (!salt || !expected) return false;

  const actual = crypto.scryptSync(password, salt, 64);
  const expectedBuffer = Buffer.from(expected, 'hex');

  return actual.length === expectedBuffer.length &&
    crypto.timingSafeEqual(actual, expectedBuffer);
}

function cookieToken(req) {
  const cookies = String(req.headers.cookie || '').split(';');
  const item = cookies.map(x => x.trim()).find(x => x.startsWith('yonox_session='));
  return item ? decodeURIComponent(item.slice('yonox_session='.length)) : null;
}

function setSessionCookie(res, token) {
  res.setHeader('Set-Cookie',
    `yonox_session=${encodeURIComponent(token)}; HttpOnly; SameSite=Strict; Path=/; Max-Age=31536000`
  );
}

function clearSessionCookie(res) {
  res.setHeader('Set-Cookie',
    'yonox_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0'
  );
}

function currentUser(req) {
  const token = cookieToken(req);
  if (!token) return null;

  return q.session.get(hashToken(token), new Date().toISOString()) || null;
}

function transaction(callback) {
  DB.exec('BEGIN IMMEDIATE');
  try {
    const result = callback();
    DB.exec('COMMIT');
    return result;
  } catch (error) {
    DB.exec('ROLLBACK');
    throw error;
  }
}


function mathDayKey() {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: 'Asia/Amman',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(new Date());

  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function makeMathQuestion(difficulty) {
  let a, b, answer, operator;

  if (difficulty === 'easy') {
    a = crypto.randomInt(1, 21);
    b = crypto.randomInt(1, 21);
    operator = crypto.randomInt(0, 2) === 0 ? '+' : '-';

    if (operator === '-' && b > a) [a, b] = [b, a];
    answer = operator === '+' ? a + b : a - b;
  } else if (difficulty === 'medium') {
    a = crypto.randomInt(10, 51);
    b = crypto.randomInt(2, 13);
    operator = '×';
    answer = a * b;
  } else {
    a = crypto.randomInt(100, 1000);
    b = crypto.randomInt(11, 100);
    operator = '×';
    answer = a * b;
  }

  return {
    question: `${a} ${operator} ${b} = ؟`,
    answer: String(answer)
  };
}

async function api(req, res, url) {

  const route = url.pathname;
  const method = req.method;

  if (method === 'GET' && route === '/api/health') {
    return json(res, 200, { name: 'YonoX', status: 'running', database: 'connected' });
  }

  if (method === 'POST' && route === '/api/register') {
    const body = await readBody(req);
    const username = String(body.username || '').trim();

    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      return fail(res, 400, 'Username must be 3-20 letters, numbers or underscores.');
    }
    if (q.userByName.get(username)) {
      return fail(res, 409, 'This username is already registered.');
    }

    try {
      DB.exec('BEGIN IMMEDIATE');

      const secret = crypto.randomBytes(48).toString('hex');
      const result = q.insertUser.run(username, hashPassword(secret));
      const userId = Number(result.lastInsertRowid);

      const accountToken = crypto.randomBytes(48).toString('hex');
      q.upsertAccountToken.run(userId, hashToken(accountToken));

      const sessionToken = crypto.randomBytes(48).toString('hex');
      const expires = new Date(Date.now() + 365 * 86400000).toISOString();
      q.insertSession.run(hashToken(sessionToken), userId, expires);

      DB.exec('COMMIT');
      setSessionCookie(res, sessionToken);

      return json(res, 201, {
        success: true,
        user: q.userById.get(userId),
        token: accountToken
      });
    } catch (error) {
      try { DB.exec('ROLLBACK'); } catch {}
      if (String(error.message).includes('UNIQUE')) {
        return fail(res, 409, 'This username is already registered.');
      }
      throw error;
    }
  }

  if (method === 'POST' && route === '/api/login') {
    const body = await readBody(req);
    const token = String(body.token || '').trim().toLowerCase();

    if (!/^[a-f0-9]{96}$/.test(token)) {
      return fail(res, 400, 'Enter a valid account token.');
    }

    const record = q.accountByToken.get(hashToken(token));
    if (!record) return fail(res, 401, 'Invalid account token.');

    const account = q.userById.get(record.user_id);
    if (!account) return fail(res, 401, 'This account is unavailable.');

    const sessionToken = crypto.randomBytes(48).toString('hex');
    const expires = new Date(Date.now() + 365 * 86400000).toISOString();
    q.insertSession.run(hashToken(sessionToken), account.id, expires);
    setSessionCookie(res, sessionToken);

    return json(res, 200, { success: true, user: account });
  }

  if (method === 'POST' && route === '/api/logout') {
    const token = cookieToken(req);
    if (token) q.deleteSession.run(hashToken(token));
    clearSessionCookie(res);
    return json(res, 200, { success: true });
  }

  const user = currentUser(req);

  if (method === 'POST' && route === '/api/account/token') {
    if (!user) return fail(res, 401, 'Please log in.');

    const token = crypto.randomBytes(48).toString('hex');
    q.upsertAccountToken.run(user.id, hashToken(token));
    return json(res, 200, { success: true, token });
  }

  if (method === 'GET' && route === '/api/me') {
    if (!user) return fail(res, 401, 'Please log in.');
    return json(res, 200, { user });
  }

  if (method === 'GET' && route === '/api/market') {
    const marketCompanies = q.companies.all();
    const priceHistory = {};

    for (const company of marketCompanies) {
      priceHistory[company.id] = q.priceHistory.all(company.id)
        .reverse()
        .map(point => Number(point.price));
    }

    return json(res, 200, {
      companies: marketCompanies,
      priceHistory
    });
  }

  if (!user) return fail(res, 401, 'Please log in.');


  if (method === 'GET' && route === '/api/math/status') {
    const dayKey = mathDayKey();

    const daily = DB.prepare(`
      SELECT attempts, total_reward
      FROM math_daily
      WHERE user_id = ? AND day_key = ?
    `).get(user.id, dayKey);

    const active = DB.prepare(`
      SELECT challenge_id, difficulty, question
      FROM math_questions
      WHERE user_id = ? AND used_at IS NULL
      ORDER BY created_at DESC LIMIT 1
    `).get(user.id);

    const attempts = Number(daily?.attempts || 0);

    return json(res, 200, {
      day: dayKey,
      attempts,
      remaining: Math.max(0, 20 - attempts),
      totalReward: Number(daily?.total_reward || 0),
      activeQuestion: active || null
    });
  }

  if (method === 'POST' && route === '/api/math/question') {
    const body = await readBody(req);
    const difficulty = String(body.difficulty || '');

    if (!['easy', 'medium', 'hard'].includes(difficulty)) {
      return fail(res, 400, 'Invalid difficulty.');
    }

    try {
      const result = transaction(() => {
        const dayKey = mathDayKey();

        const daily = DB.prepare(`
          SELECT attempts FROM math_daily
          WHERE user_id = ? AND day_key = ?
        `).get(user.id, dayKey);

        if (Number(daily?.attempts || 0) >= 20) {
          throw new Error('انتهت محاولاتك العشرين لهذا اليوم.');
        }

        const existing = DB.prepare(`
          SELECT challenge_id, difficulty, question
          FROM math_questions
          WHERE user_id = ? AND used_at IS NULL
          ORDER BY created_at DESC LIMIT 1
        `).get(user.id);

        if (existing) return existing;

        const generated = makeMathQuestion(difficulty);
        const challengeId = crypto.randomUUID();

        DB.prepare(`
          INSERT INTO math_questions
          (challenge_id, user_id, day_key, difficulty, question, answer, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(
          challengeId,
          user.id,
          dayKey,
          difficulty,
          generated.question,
          generated.answer,
          new Date().toISOString()
        );

        return {
          challenge_id: challengeId,
          difficulty,
          question: generated.question
        };
      });

      return json(res, 200, { success: true, question: result });
    } catch (error) {
      return fail(res, 400, error.message);
    }
  }

  if (method === 'POST' && route === '/api/math/answer') {
    const body = await readBody(req);
    const challengeId = String(body.challengeId || '');
    const answer = String(body.answer ?? '').trim();

    if (!/^[0-9]{1,12}$/.test(answer)) {
      return fail(res, 400, 'أدخل إجابة رقمية صحيحة.');
    }

    try {
      const result = transaction(() => {
        const challenge = DB.prepare(`
          SELECT * FROM math_questions
          WHERE challenge_id = ? AND user_id = ? AND used_at IS NULL
        `).get(challengeId, user.id);

        if (!challenge) {
          throw new Error('السؤال غير متاح أو تمت الإجابة عنه مسبقًا.');
        }

        const dayKey = mathDayKey();

        const daily = DB.prepare(`
          SELECT attempts FROM math_daily
          WHERE user_id = ? AND day_key = ?
        `).get(user.id, dayKey);

        if (Number(daily?.attempts || 0) >= 20) {
          throw new Error('انتهت محاولاتك العشرين لهذا اليوم.');
        }

        const correct = answer === challenge.answer;
        const rewards = { easy: 10, medium: 100, hard: 500 };
        const reward = correct ? rewards[challenge.difficulty] : 0;
        const now = new Date().toISOString();

        const marked = DB.prepare(`
          UPDATE math_questions SET used_at = ?
          WHERE challenge_id = ? AND user_id = ? AND used_at IS NULL
        `).run(now, challengeId, user.id);

        if (Number(marked.changes) !== 1) {
          throw new Error('تم إرسال إجابة هذا السؤال مسبقًا.');
        }

        DB.prepare(`
          INSERT INTO math_daily(user_id, day_key, attempts, total_reward)
          VALUES (?, ?, 1, ?)
          ON CONFLICT(user_id, day_key)
          DO UPDATE SET
            attempts = math_daily.attempts + 1,
            total_reward = math_daily.total_reward + excluded.total_reward
        `).run(user.id, dayKey, reward);

        if (reward > 0) {
          const freshUser = q.userById.get(user.id);
          q.updateBalance.run(
            Number(freshUser.balance) + reward,
            user.id
          );
        }

        const updated = DB.prepare(`
          SELECT attempts, total_reward
          FROM math_daily
          WHERE user_id = ? AND day_key = ?
        `).get(user.id, dayKey);

        return {
          correct,
          reward,
          attempts: Number(updated.attempts),
          remaining: Math.max(0, 20 - Number(updated.attempts)),
          totalReward: Number(updated.total_reward),
          balance: Number(q.userById.get(user.id).balance)
        };
      });

      return json(res, 200, { success: true, result });
    } catch (error) {
      return fail(res, 400, error.message);
    }
  }

  if (method === 'GET' && route === '/api/portfolio') {
    return json(res, 200, {
      user: q.userById.get(user.id),
      holdings: q.holdings.all(user.id),
      history: q.history.all(user.id)
    });
  }

  if (method === 'POST' && route === '/api/companies') {
    const body = await readBody(req);
    const name = String(body.name || '').trim();
    const ticker = String(body.ticker || '').trim().toUpperCase();
    const totalShares = Number(body.totalShares);
    const price = Number(body.initialPrice);

    if (name.length < 2 || name.length > 40) {
      return fail(res, 400, 'Company name must be 2-40 characters.');
    }
    if (!/^[A-Z0-9]{2,8}$/.test(ticker)) {
      return fail(res, 400, 'Ticker must be 2-8 letters or numbers.');
    }
    if (!Number.isSafeInteger(totalShares) || totalShares < 1 || totalShares > 1000000000) {
      return fail(res, 400, 'Invalid total shares.');
    }
    if (!Number.isFinite(price) || price <= 0 || price > 1000000) {
      return fail(res, 400, 'Invalid initial price.');
    }

    try {
      const createdCompany = transaction(() => {
        const result = q.insertCompany.run(
          name, ticker, totalShares, totalShares, price, price, user.id
        );
        const companyId = Number(result.lastInsertRowid);
        q.insertPriceHistory.run(companyId, price);
        return q.company.get(companyId);
      });

      return json(res, 201, {
        success: true,
        company: createdCompany
      });
    } catch (error) {
      if (String(error.message).includes('UNIQUE')) {
        return fail(res, 409, 'Ticker already exists.');
      }
      throw error;
    }
  }



  if (method === 'POST' && route === '/api/companies/delete') {
    if (!user) return fail(res, 401, 'Please log in.');

    const body = await readBody(req);
    const companyId = Number(body.companyId);

    if (!Number.isSafeInteger(companyId) || companyId < 1) {
      return fail(res, 400, 'Invalid company.');
    }

    try {
      const result = transaction(() => {
        const company = q.company.get(companyId);
        if (!company) throw new Error('Company not found.');

        if (Number(company.owner_id) !== Number(user.id)) {
          throw new Error('You do not own this company.');
        }

        const trades = DB.prepare(`
          SELECT id, user_id, side, quantity, total
          FROM trades
          WHERE company_id = ?
          ORDER BY id ASC
        `).all(companyId);

        const lotsByUser = new Map();

        for (const trade of trades) {
          const uid = Number(trade.user_id);
          const quantity = Number(trade.quantity);
          const total = Number(trade.total);

          if (!Number.isSafeInteger(quantity) || quantity < 1 ||
              !Number.isFinite(total) || total < 0) {
            throw new Error('Trade history is invalid. Company deletion was cancelled.');
          }

          if (!lotsByUser.has(uid)) lotsByUser.set(uid, []);

          const lots = lotsByUser.get(uid);

          if (trade.side === 'BUY') {
            lots.push({
              remaining: quantity,
              unitCost: total / quantity
            });
          } else if (trade.side === 'SELL') {
            let left = quantity;

            for (const lot of lots) {
              if (!left) break;
              if (lot.remaining <= 0) continue;

              const used = Math.min(left, lot.remaining);
              lot.remaining -= used;
              left -= used;
            }

            if (left > 0) {
              throw new Error('Trade history does not match. Company deletion was cancelled.');
            }
          } else {
            throw new Error('Unknown trade type. Company deletion was cancelled.');
          }
        }

        const expected = new Map();
        for (const [uid, lots] of lotsByUser) {
          expected.set(
            uid,
            lots.reduce((sum, lot) => sum + lot.remaining, 0)
          );
        }

        const holdings = DB.prepare(`
          SELECT user_id, quantity
          FROM holdings
          WHERE company_id = ?
        `).all(companyId);

        const actual = new Map();
        for (const holding of holdings) {
          actual.set(Number(holding.user_id), Number(holding.quantity));
        }

        const allUsers = new Set([...expected.keys(), ...actual.keys()]);
        for (const uid of allUsers) {
          if ((expected.get(uid) || 0) !== (actual.get(uid) || 0)) {
            throw new Error('Share ownership history does not match. Company deletion was cancelled.');
          }
        }

        const claims = [];
        for (const [uid, lots] of lotsByUser) {
          const raw = lots.reduce(
            (sum, lot) => sum + lot.remaining * lot.unitCost,
            0
          );
          const cents = Math.max(0, Math.round(raw * 100));
          if (cents > 0) claims.push({ userId: uid, cents });
        }

        const totalClaims = claims.reduce((sum, item) => sum + item.cents, 0);
        const treasuryBalance = Number(company.treasury_balance);
        if (!Number.isFinite(treasuryBalance) || treasuryBalance < 0) {
          throw new Error('Company treasury is invalid. Company deletion was cancelled.');
        }

        const treasuryCents = Math.round(treasuryBalance * 100);
        const budget = Math.min(treasuryCents, totalClaims);

        let paid = 0;
        if (totalClaims > 0 && budget > 0) {
          const allocations = claims.map(item => {
            const exact = budget * item.cents / totalClaims;
            const base = Math.floor(exact);
            return {
              userId: item.userId,
              cents: base,
              fraction: exact - base,
              maximum: item.cents
            };
          });

          paid = allocations.reduce((sum, item) => sum + item.cents, 0);
          let remaining = budget - paid;

          allocations.sort((a, b) =>
            b.fraction - a.fraction || a.userId - b.userId
          );

          for (const item of allocations) {
            if (!remaining) break;
            if (item.cents < item.maximum) {
              item.cents++;
              remaining--;
              paid++;
            }
          }

          if (remaining !== 0 || paid > treasuryCents || paid > totalClaims) {
            throw new Error('Compensation calculation failed. Company deletion was cancelled.');
          }

          for (const item of allocations) {
            if (item.cents <= 0) continue;

            const account = q.userById.get(item.userId);
            if (!account) {
              throw new Error('An investor account is missing. Company deletion was cancelled.');
            }

            const newBalance =
              Math.round((Number(account.balance) + item.cents / 100) * 100) / 100;

            q.updateBalance.run(newBalance, item.userId);
          }
        }

        DB.prepare('DELETE FROM company_listings WHERE company_id = ?').run(companyId);
        DB.prepare('DELETE FROM holdings WHERE company_id = ?').run(companyId);
        DB.prepare('DELETE FROM trades WHERE company_id = ?').run(companyId);
        DB.prepare('DELETE FROM price_history WHERE company_id = ?').run(companyId);

        const deleted = DB.prepare(
          'DELETE FROM companies WHERE id = ? AND owner_id = ?'
        ).run(companyId, user.id);

        if (Number(deleted.changes) !== 1) {
          throw new Error('Company deletion failed.');
        }

        return {
          companyName: company.name,
          investors: claims.length,
          totalEntitlements: totalClaims / 100,
          distributed: paid / 100,
          treasury: treasuryCents / 100
        };
      });

      return json(res, 200, { success: true, deletion: result });
    } catch (error) {
      return fail(res, 400, error.message);
    }
  }

  if (method === 'GET' && route === '/api/companies/mine') {
    const owned = DB.prepare(`
      SELECT c.*,
        (SELECT l.id FROM company_listings l
         WHERE l.company_id = c.id AND l.status = 'active'
         AND l.seller_id = c.owner_id
         ORDER BY l.id DESC LIMIT 1) AS listing_id,
        (SELECT l.asking_price FROM company_listings l
         WHERE l.company_id = c.id AND l.status = 'active'
         AND l.seller_id = c.owner_id
         ORDER BY l.id DESC LIMIT 1) AS asking_price
      FROM companies c
      WHERE c.owner_id = ?
      ORDER BY c.id DESC
    `).all(user.id);

    return json(res, 200, { companies: owned });
  }

  if (method === 'GET' && route === '/api/company-listings') {
    const listings = DB.prepare(`
      SELECT l.id AS listing_id, l.company_id, l.seller_id,
        l.asking_price, l.created_at,
        c.name, c.ticker, c.current_price, c.initial_price,
        c.total_shares, c.available_shares,
        u.username AS seller_username
      FROM company_listings l
      JOIN companies c ON c.id = l.company_id
      JOIN users u ON u.id = l.seller_id
      WHERE l.status = 'active'
        AND c.owner_id = l.seller_id
      ORDER BY l.created_at DESC
    `).all();

    return json(res, 200, { listings });
  }

  if (method === 'POST' && route === '/api/company-listings/create') {
    const body = await readBody(req);
    const companyId = Number(body.companyId);
    const askingPrice = Number(body.askingPrice);

    if (!Number.isSafeInteger(companyId) || companyId < 1) {
      return fail(res, 400, 'Invalid company.');
    }

    if (!Number.isFinite(askingPrice) ||
        askingPrice < 100 || askingPrice > 1000 ||
        Math.round(askingPrice * 100) !== askingPrice * 100) {
      return fail(res, 400, 'Price must be between 100 and 1000 YNC, with at most 2 decimal places.');
    }

    try {
      const listing = transaction(() => {
        const company = q.company.get(companyId);
        if (!company) throw new Error('Company not found.');
        if (Number(company.owner_id) !== Number(user.id)) {
          throw new Error('You do not own this company.');
        }

        const existing = DB.prepare(`
          SELECT id FROM company_listings
          WHERE company_id = ? AND status = 'active'
        `).get(companyId);

        if (existing) throw new Error('This company is already listed for sale.');

        const result = DB.prepare(`
          INSERT INTO company_listings
          (company_id, seller_id, asking_price)
          VALUES (?, ?, ?)
        `).run(companyId, user.id, askingPrice);

        return DB.prepare(`
          SELECT * FROM company_listings WHERE id = ?
        `).get(Number(result.lastInsertRowid));
      });

      return json(res, 201, { success: true, listing });
    } catch (error) {
      return fail(res, 400, error.message);
    }
  }

  if (method === 'POST' && route === '/api/company-listings/cancel') {
    const body = await readBody(req);
    const listingId = Number(body.listingId);

    if (!Number.isSafeInteger(listingId) || listingId < 1) {
      return fail(res, 400, 'Invalid listing.');
    }

    try {
      transaction(() => {
        const listing = DB.prepare(`
          SELECT * FROM company_listings
          WHERE id = ? AND status = 'active'
        `).get(listingId);

        if (!listing) throw new Error('Listing is no longer active.');
        if (Number(listing.seller_id) !== Number(user.id)) {
          throw new Error("You cannot cancel another user listing.");
        }

        DB.prepare(`
          UPDATE company_listings
          SET status = 'cancelled'
          WHERE id = ? AND status = 'active'
        `).run(listingId);
      });

      return json(res, 200, { success: true });
    } catch (error) {
      return fail(res, 400, error.message);
    }
  }

  if (method === 'POST' && route === '/api/company-listings/buy') {
    const body = await readBody(req);
    const listingId = Number(body.listingId);

    if (!Number.isSafeInteger(listingId) || listingId < 1) {
      return fail(res, 400, 'Invalid listing.');
    }

    try {
      const result = transaction(() => {
        const listing = DB.prepare(`
          SELECT * FROM company_listings
          WHERE id = ? AND status = 'active'
        `).get(listingId);

        if (!listing) throw new Error('This offer is no longer available.');
        if (Number(listing.seller_id) === Number(user.id)) {
          throw new Error('You cannot buy your own company.');
        }

        const company = q.company.get(listing.company_id);
        if (!company ||
            Number(company.owner_id) !== Number(listing.seller_id)) {
          throw new Error('Company ownership has changed. Offer is invalid.');
        }

        const buyer = q.userById.get(user.id);
        const seller = q.userById.get(listing.seller_id);
        const price = Number(listing.asking_price);

        if (!buyer || !seller) throw new Error('Account not found.');
        if (Number(buyer.balance) + 0.000001 < price) {
          throw new Error('Insufficient virtual balance.');
        }

        q.updateBalance.run(
          Math.round((Number(buyer.balance) - price) * 100) / 100,
          user.id
        );

        q.updateBalance.run(
          Math.round((Number(seller.balance) + price) * 100) / 100,
          listing.seller_id
        );

        const transferred = DB.prepare(`
          UPDATE companies SET owner_id = ?
          WHERE id = ? AND owner_id = ?
        `).run(user.id, listing.company_id, listing.seller_id);

        if (Number(transferred.changes) !== 1) {
          throw new Error('Company ownership changed. Purchase cancelled.');
        }

        const sold = DB.prepare(`
          UPDATE company_listings
          SET status = 'sold', buyer_id = ?, sold_at = ?
          WHERE id = ? AND status = 'active'
        `).run(user.id, new Date().toISOString(), listingId);

        if (Number(sold.changes) !== 1) {
          throw new Error('This offer has already been purchased.');
        }

        return {
          companyId: Number(listing.company_id),
          price,
          balance: Number(q.userById.get(user.id).balance),
          newOwnerId: Number(user.id)
        };
      });

      return json(res, 200, { success: true, purchase: result });
    } catch (error) {
      return fail(res, 400, error.message);
    }
  }

  if (method === 'POST' && route === '/api/trade') {
    const body = await readBody(req);
    const companyId = Number(body.companyId);
    const quantity = Number(body.quantity);
    const side = String(body.side || '').toUpperCase();

    if (!Number.isSafeInteger(companyId) || companyId < 1 ||
        !Number.isSafeInteger(quantity) || quantity < 1 || quantity > 1000000000 ||
        !['BUY', 'SELL'].includes(side)) {
      return fail(res, 400, 'Invalid trade details.');
    }

    try {
      const result = transaction(() => {
        const company = q.company.get(companyId);
        if (!company) throw new Error('Company not found.');

        // The current price is the execution price for this trade.
        const executionPrice = Number(company.current_price);
        const total = Math.round(executionPrice * 100 * quantity) / 100;
        const freshUser = q.userById.get(user.id);
        const holding = q.holding.get(user.id, companyId);

        if (side === 'BUY') {
          if (company.available_shares < quantity) {
            throw new Error('Not enough shares available.');
          }
          if (freshUser.balance + 0.000001 < total) {
            throw new Error('Insufficient virtual balance.');
          }

          q.updateBalance.run(
            Math.round((freshUser.balance - total) * 100) / 100,
            user.id
          );
          q.updateTreasury.run(
            Math.round((Number(company.treasury_balance) + total) * 100) / 100,
            companyId
          );
          q.updateAvailable.run(company.available_shares - quantity, companyId);
          q.upsertHolding.run(user.id, companyId, quantity);
        } else {
          if (!holding || holding.quantity < quantity) {
            throw new Error('You do not own enough shares.');
          }

          const treasury = Number(company.treasury_balance || 0);
          if (treasury + 0.000001 < total) {
            throw new Error('Company treasury has insufficient funds for this sale.');
          }

          q.updateTreasury.run(
            Math.round((treasury - total) * 100) / 100,
            companyId
          );
          q.updateBalance.run(
            Math.round((freshUser.balance + total) * 100) / 100,
            user.id
          );
          q.updateAvailable.run(company.available_shares + quantity, companyId);
          q.updateHolding.run(quantity, user.id, companyId);
        }

        // Record the trade at the price before applying its market impact.
        q.insertTrade.run(
          user.id, companyId, side, quantity, executionPrice, total
        );

        // Quantity relative to issued shares determines price movement.
        const issuedShares = Math.max(1, Number(company.total_shares));
        const rawImpact = (quantity / issuedShares) * 5;
        const impact = Math.min(0.10, rawImpact);
        const direction = side === 'BUY' ? 1 : -1;

        // Keep the price within sensible limits relative to its initial value.
        const initialPrice = Number(company.initial_price);
        const lowerLimit = initialPrice * 0.10;
        const upperLimit = initialPrice * 10;
        const calculatedPrice = executionPrice * (1 + direction * impact);
        const nextPrice = Math.min(
          upperLimit,
          Math.max(lowerLimit, Math.round(calculatedPrice * 1000000) / 1000000)
        );

        q.updatePrice.run(nextPrice, companyId);
        q.insertPriceHistory.run(companyId, nextPrice);

        return {
          side,
          quantity,
          price: executionPrice,
          total,
          nextPrice,
          priceChangePercent: executionPrice
            ? ((nextPrice - executionPrice) / executionPrice) * 100
            : 0,
          balance: q.userById.get(user.id).balance,
          treasuryBalance: Number(q.company.get(companyId).treasury_balance)
        };
      });

      return json(res, 200, { success: true, trade: result });
    } catch (error) {
      return fail(res, 400, error.message);
    }
  }

  return fail(res, 404, 'API route not found.');
}

function serveStatic(req, res, url) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return fail(res, 405, 'Method not allowed.');
  }

  let pathname;
  try {
    pathname = decodeURIComponent(url.pathname);
  } catch {
    return fail(res, 400, 'Invalid path.');
  }

  if (pathname === '/') pathname = '/index.html';

  const file = path.resolve(ROOT, '.' + pathname);
  if (file !== ROOT && !file.startsWith(ROOT + path.sep)) {
    return fail(res, 403, 'Forbidden.');
  }

  fs.stat(file, (error, stat) => {
    if (error || !stat.isFile()) return fail(res, 404, 'File not found.');

    const types = {
      '.html': 'text/html; charset=utf-8',
      '.js': 'text/javascript; charset=utf-8',
      '.css': 'text/css; charset=utf-8',
      '.json': 'application/json; charset=utf-8',
      '.svg': 'image/svg+xml',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.ico': 'image/x-icon'
    };

    res.writeHead(200, {
      'Content-Type': types[path.extname(file)] || 'application/octet-stream',
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'no-cache'
    });

    if (req.method === 'HEAD') return res.end();

    fs.createReadStream(file).pipe(res);
  });
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${HOST}:${PORT}`);

    if (url.pathname.startsWith('/api/')) {
      await api(req, res, url);
    } else {
      serveStatic(req, res, url);
    }
  } catch (error) {
    console.error(error);
    if (!res.headersSent) fail(res, 500, 'Internal server error.');
    else res.end();
  }
});

function simulateMarketTick() {
  try {
    transaction(() => {
      for (const company of q.companies.all()) {
        const current = Number(company.current_price);
        const initial = Number(company.initial_price);
        if (!(current > 0) || !(initial > 0)) continue;

        const deviation = (initial - current) / initial;
        const reversion = Math.max(-0.0001, Math.min(0.0001, deviation * 0.00002));
        const noise = (Math.random() * 2 - 1) * 0.0005;
        const lower = initial * 0.10;
        const upper = initial * 10;
        const next = Math.min(
          upper,
          Math.max(lower, Math.round(current * (1 + reversion + noise) * 1000000) / 1000000)
        );

        if (next !== current) {
          q.updatePrice.run(next, company.id);
          q.insertPriceHistory.run(company.id, next);
        }
      }
    });
  } catch (error) {
    console.error('Market simulation error:', error.message);
  }
}

q.deleteExpired.run(new Date().toISOString());

simulateMarketTick();
const marketSimulationTimer = setInterval(simulateMarketTick, 5000);
marketSimulationTimer.unref?.();

server.listen(PORT, HOST, () => {
  fs.writeFileSync(PID_FILE, String(process.pid));
  console.log(`YonoX server running at http://${HOST}:${PORT}`);
  console.log('SQLite database connected.');
});

process.on('SIGINT', () => {
  server.close(() => {
    DB.close();
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  server.close(() => {
    DB.close();
    process.exit(0);
  });
});
