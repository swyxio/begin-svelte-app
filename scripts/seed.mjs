/**
 * Seed script — populates the database with realistic Hacker News-style content.
 * Run: node scripts/seed.mjs
 */
import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DB_DIR, 'hn.db');

// Ensure data directory exists
if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });

// Remove existing database files (stop the server first if running)
for (const ext of ['', '-shm', '-wal', '-journal']) {
  const f = DB_PATH + ext;
  try { if (fs.existsSync(f)) fs.unlinkSync(f); } catch { /* ignore */ }
}
console.log('Starting fresh database');

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Initialize schema
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    email TEXT DEFAULT '',
    karma INTEGER DEFAULT 1,
    about TEXT DEFAULT '',
    showdead INTEGER DEFAULT 0,
    noprocrast INTEGER DEFAULT 0,
    maxvisit INTEGER DEFAULT 20,
    minaway INTEGER DEFAULT 180,
    delay INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL CHECK(type IN ('story', 'comment', 'job', 'poll', 'pollopt')),
    by TEXT NOT NULL,
    title TEXT,
    url TEXT,
    text TEXT,
    parent_id INTEGER REFERENCES items(id),
    story_id INTEGER REFERENCES items(id),
    score INTEGER DEFAULT 1,
    descendants INTEGER DEFAULT 0,
    dead INTEGER DEFAULT 0,
    deleted INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS votes (
    user_id INTEGER NOT NULL,
    item_id INTEGER NOT NULL,
    direction TEXT NOT NULL CHECK(direction IN ('up', 'down')),
    created_at TEXT DEFAULT (datetime('now')),
    PRIMARY KEY (user_id, item_id)
  );
  CREATE TABLE IF NOT EXISTS favorites (
    user_id INTEGER NOT NULL,
    item_id INTEGER NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    PRIMARY KEY (user_id, item_id)
  );
  CREATE TABLE IF NOT EXISTS hidden (
    user_id INTEGER NOT NULL,
    item_id INTEGER NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    PRIMARY KEY (user_id, item_id)
  );
  CREATE TABLE IF NOT EXISTS flags (
    user_id INTEGER NOT NULL,
    item_id INTEGER NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    PRIMARY KEY (user_id, item_id)
  );
  CREATE INDEX IF NOT EXISTS idx_items_type_created ON items(type, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_items_by ON items(by);
  CREATE INDEX IF NOT EXISTS idx_items_parent ON items(parent_id);
  CREATE INDEX IF NOT EXISTS idx_items_story ON items(story_id);
  CREATE INDEX IF NOT EXISTS idx_items_score ON items(score DESC);
  CREATE INDEX IF NOT EXISTS idx_items_created ON items(created_at DESC);
`);

const now = Date.now();
const hour = 3600000;
const day = 86400000;
const hash = bcrypt.hashSync('password', 10);

function ts(offset) {
  return new Date(now - offset).toISOString().replace('T', ' ').replace('Z', '').slice(0, -4);
}

// ─── Users ───────────────────────────────────────────
const users = [
  { name: 'pg', karma: 6543, about: 'Essayist, programmer, investor. Co-founder of Y Combinator.', age: 365 * day },
  { name: 'dang', karma: 4210, about: 'HN moderator.', age: 300 * day },
  { name: 'tptacek', karma: 5120, about: 'Security researcher. Partner at Latacora.', age: 280 * day },
  { name: 'patio11', karma: 3890, about: 'I write about software, business, and Japan.', age: 250 * day },
  { name: 'jacquesm', karma: 2870, about: 'Programmer. Entrepreneur.', age: 200 * day },
  { name: 'luu', karma: 1940, about: '', age: 180 * day },
  { name: 'dgreensp', karma: 1560, about: '', age: 150 * day },
  { name: 'jgrahamc', karma: 1230, about: 'CTO at Cloudflare.', age: 120 * day },
  { name: 'gruseom', karma: 980, about: '', age: 100 * day },
  { name: 'ColinWright', karma: 760, about: 'Mathematician and juggler.', age: 90 * day },
  { name: 'sama', karma: 3200, about: 'CEO of OpenAI.', age: 350 * day },
  { name: 'rauchg', karma: 1100, about: 'CEO of Vercel.', age: 160 * day },
];

const insertUser = db.prepare('INSERT INTO users (username, password_hash, karma, about, created_at) VALUES (?, ?, ?, ?, ?)');
for (const u of users) {
  insertUser.run(u.name, hash, u.karma, u.about, ts(u.age));
}
console.log(`Created ${users.length} users (password: "password")`);

// ─── Stories ─────────────────────────────────────────
const stories = [
  { by: 'tptacek', title: 'Why I Love Go and Hate Rust (2024)', url: 'https://blog.tptacek.com/go-vs-rust', score: 234, desc: 156, age: 2 * hour },
  { by: 'pg', title: 'Beating the Averages', url: 'http://www.paulgraham.com/avg.html', score: 189, desc: 43, age: 3 * hour },
  { by: 'patio11', title: 'Salary Negotiation: Make More Money', url: 'https://www.kalzumeus.com/2012/01/23/salary-negotiation/', score: 456, desc: 89, age: 5 * hour },
  { by: 'pg', title: "Do Things That Don't Scale", url: 'http://www.paulgraham.com/ds.html', score: 312, desc: 67, age: 4 * hour },
  { by: 'dang', title: 'Show HN: A real-time collaborative text editor', url: 'https://collab-editor.example.com', score: 123, desc: 28, age: 3 * hour },
  { by: 'dang', title: 'Launch HN: New moderation tools for online communities', url: null, text: 'We have been working on a new set of moderation tools that make it easier to maintain discussion quality. The key features include:\n\n- Automated detection of low-quality comments\n- Better tools for community voting\n- Transparency reports\n\nWe would love your feedback.', score: 89, desc: 45, age: 4 * hour },
  { by: 'jacquesm', title: 'The Internet Is Not What You Think It Is (2022)', url: 'https://aeon.co/essays/the-internet', score: 67, desc: 12, age: 8 * hour },
  { by: 'tptacek', title: 'Ask HN: Best resources for learning cryptography?', url: null, text: 'I want to get serious about applied cryptography. What books, courses, or resources do you recommend?\n\nI have a strong math background and am comfortable with programming.', score: 78, desc: 34, age: 6 * hour },
  { by: 'luu', title: 'The Illustrated Transformer (2018)', url: 'https://jalammar.github.io/illustrated-transformer/', score: 145, desc: 23, age: 7 * hour },
  { by: 'rauchg', title: 'Show HN: Next.js 16 – Server Components Everywhere', url: 'https://nextjs.org/blog/next-16', score: 298, desc: 112, age: 1.5 * hour },
  { by: 'jgrahamc', title: 'How Cloudflare Runs Prometheus at Scale', url: 'https://blog.cloudflare.com/prometheus-at-scale', score: 87, desc: 19, age: 9 * hour },
  { by: 'sama', title: 'Reflections on AI Progress', url: 'https://blog.samaltman.com/reflections-on-ai', score: 534, desc: 234, age: 1 * hour },
  { by: 'dgreensp', title: 'SQLite Is All You Need', url: 'https://www.sqlite.org/whentouse.html', score: 201, desc: 56, age: 6 * hour },
  { by: 'ColinWright', title: 'The Mathematics of Juggling', url: 'https://www.juggling.org/papers/math/', score: 45, desc: 8, age: 12 * hour },
  { by: 'gruseom', title: 'Show HN: A completely faithful Hacker News clone', url: 'https://github.com/example/hn-clone', score: 167, desc: 42, age: 2 * hour },
  { by: 'pg', title: 'How to Start a Startup (2005)', url: 'http://www.paulgraham.com/start.html', score: 178, desc: 31, age: 10 * hour },
  { by: 'patio11', title: 'Ask HN: What are you working on?', url: null, text: 'Periodic thread: what are you building? Share your projects, get feedback.', score: 112, desc: 67, age: 5 * hour },
  { by: 'luu', title: 'Mechanical Watch – How a Mechanical Watch Works', url: 'https://ciechanow.ski/mechanical-watch/', score: 234, desc: 34, age: 8 * hour },
  { by: 'jacquesm', title: 'The Absolute Minimum Every Developer Must Know About Unicode', url: 'https://tonsky.me/blog/unicode/', score: 156, desc: 28, age: 11 * hour },
  { by: 'tptacek', title: 'Cryptographic Right Answers (2023)', url: 'https://latacora.micro.blog/2018/04/03/cryptographic-right-answers.html', score: 98, desc: 15, age: 14 * hour },
  { by: 'rauchg', title: 'Why Turborepo Is Migrating from Go to Rust', url: 'https://vercel.com/blog/turborepo-migration-go-rust', score: 187, desc: 89, age: 3 * hour },
  { by: 'sama', title: 'Planning for AGI and Beyond', url: 'https://openai.com/blog/planning-for-agi', score: 423, desc: 178, age: 6 * hour },
  { by: 'dgreensp', title: 'Show HN: Meteor.js Is Back', url: 'https://meteor.com/blog/2024-comeback', score: 76, desc: 22, age: 15 * hour },
  { by: 'jgrahamc', title: 'The Log: What Every Software Engineer Should Know', url: 'https://engineering.linkedin.com/distributed-systems/log-what-every-software-engineer-should-know-about-real-time-datas-unifying', score: 134, desc: 18, age: 18 * hour },
];

const insertStory = db.prepare('INSERT INTO items (type, by, title, url, text, score, descendants, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
for (const s of stories) {
  insertStory.run('story', s.by, s.title, s.url || null, s.text || null, s.score, s.desc, ts(s.age));
}
console.log(`Created ${stories.length} stories`);

// ─── Job posting ─────────────────────────────────────
insertStory.run('job', 'sama', 'OpenAI is hiring engineers', null, 'We are looking for talented engineers to help build AGI safely.', 1, 0, ts(4 * hour));
insertStory.run('job', 'rauchg', 'Vercel is hiring a Senior DevTools Engineer', null, null, 1, 0, ts(8 * hour));
console.log('Created 2 job postings');

// ─── Comments ────────────────────────────────────────
const insertComment = db.prepare('INSERT INTO items (type, by, text, parent_id, story_id, score, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)');

// Comments on story 12 (Reflections on AI - highest score)
const s12 = 12;
const c1 = insertComment.run('comment', 'tptacek', '<p>The pace of progress is genuinely staggering. But I worry we\'re moving faster than our ability to evaluate risks.</p>', s12, s12, 45, ts(50 * 60000)).lastInsertRowid;
const c2 = insertComment.run('comment', 'pg', '<p>The most important thing is that the technology be developed by people who care about getting it right. Speed matters less than direction.</p>', s12, s12, 67, ts(45 * 60000)).lastInsertRowid;
const c3 = insertComment.run('comment', 'patio11', '<p>From a business perspective, the economic implications are enormous. Every knowledge worker\'s job will change within 5 years.</p>', s12, s12, 23, ts(40 * 60000)).lastInsertRowid;
insertComment.run('comment', 'jacquesm', '<p>I agree with this. The question is whether the change will be gradual enough for society to adapt.</p>', c3, s12, 12, ts(35 * 60000));
insertComment.run('comment', 'luu', '<p>History suggests technological transitions are always more gradual than we expect in the moment, but more impactful than we imagine in retrospect.</p>', c3, s12, 18, ts(30 * 60000));
insertComment.run('comment', 'dang', '<p>This is an important perspective. We\'ve tried to be thoughtful about how these discussions happen on HN.</p>', c2, s12, 8, ts(25 * 60000));

// Comments on story 15 (HN clone - Show HN)
const s15 = 15;
const c7 = insertComment.run('comment', 'pg', '<p>This is a great clone! Really faithful to the original design.</p>', s15, s15, 15, ts(1.5 * hour)).lastInsertRowid;
const c8 = insertComment.run('comment', 'tptacek', '<p>I love how they implemented the ranking algorithm. The comment threading is spot on too.</p>', s15, s15, 8, ts(1 * hour)).lastInsertRowid;
insertComment.run('comment', 'dang', '<p>Moved to the front page. This is a great example of a well-executed clone.</p>', s15, s15, 3, ts(0.5 * hour));
insertComment.run('comment', 'patio11', '<p>The attention to detail is impressive. Even the CSS matches perfectly.</p>', s15, s15, 12, ts(0.8 * hour));
const c11 = insertComment.run('comment', 'jacquesm', '<p>Agreed! The table-based layout is exactly like the original.</p>', c7, s15, 5, ts(1.2 * hour)).lastInsertRowid;
insertComment.run('comment', 'dgreensp', '<p>Thanks for the kind words! It was a fun project to build.</p>', c7, s15, 7, ts(0.9 * hour));

// Comments on story 10 (Next.js 16)
const s10 = 10;
insertComment.run('comment', 'dgreensp', '<p>Server Components are a game changer for full-stack React. The DX improvements are substantial.</p>', s10, s10, 23, ts(1 * hour));
insertComment.run('comment', 'jgrahamc', '<p>We\'ve been using Next.js at Cloudflare and the performance improvements with RSC are real.</p>', s10, s10, 15, ts(0.8 * hour));
insertComment.run('comment', 'gruseom', '<p>I\'m still skeptical about the complexity tradeoffs. The mental model is harder than traditional React.</p>', s10, s10, 8, ts(0.5 * hour));

// Comments on story 1 (Go vs Rust)
const s1 = 1;
insertComment.run('comment', 'pg', '<p>Both languages have their place. Go for networked services, Rust for systems programming.</p>', s1, s1, 34, ts(1.5 * hour));
insertComment.run('comment', 'dgreensp', '<p>I\'ve been writing Rust for 3 years now and the learning curve is worth it. The compiler catches so many bugs.</p>', s1, s1, 21, ts(1.2 * hour));
insertComment.run('comment', 'ColinWright', '<p>The <i>real</i> question is: what problem are you solving? Pick the right tool for the job.</p>', s1, s1, 12, ts(1 * hour));

// Comments on story 8 (Ask HN: Cryptography)
const s8 = 8;
insertComment.run('comment', 'tptacek', '<p>Start with <i>Serious Cryptography</i> by Aumasson. Then move to <i>Cryptography Engineering</i> by Ferguson, Schneier, and Kohno.</p>', s8, s8, 34, ts(5 * hour));
insertComment.run('comment', 'ColinWright', '<p>For the mathematical foundations, I recommend <i>An Introduction to Mathematical Cryptography</i> by Hoffstein et al.</p>', s8, s8, 12, ts(4.5 * hour));
insertComment.run('comment', 'jgrahamc', '<p>Dan Boneh\'s online course from Stanford is excellent and free: <a href="https://crypto.stanford.edu/~dabo/courses/OnlineCrypto/" rel="nofollow">https://crypto.stanford.edu/~dabo/courses/OnlineCrypto/</a></p>', s8, s8, 28, ts(4 * hour));

console.log('Created comments with threading');

// ─── Votes ───────────────────────────────────────────
// Add some votes to make karma realistic
const userIds = db.prepare('SELECT id, username FROM users').all();
const userMap = {};
for (const u of userIds) userMap[u.username] = u.id;

const insertVote = db.prepare('INSERT OR IGNORE INTO votes (user_id, item_id, direction) VALUES (?, ?, ?)');
// Each user upvotes a few stories
for (const voter of Object.keys(userMap)) {
  for (let storyId = 1; storyId <= 24; storyId++) {
    if (Math.random() < 0.3) {
      const story = db.prepare('SELECT by FROM items WHERE id = ?').get(storyId);
      if (story && story.by !== voter) {
        insertVote.run(userMap[voter], storyId, 'up');
      }
    }
  }
}
console.log('Created votes');

// ─── Poll ────────────────────────────────────────────
const pollResult = db.prepare(
  'INSERT INTO items (type, by, title, text, score, descendants, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
).run('poll', 'pg', 'Poll: What is your favorite programming language in 2026?', 'Vote for your favorite language below.', 89, 0, ts(4 * hour));
const pollId = pollResult.lastInsertRowid;

const pollOptions = [
  { title: 'Rust', score: 34 },
  { title: 'Python', score: 28 },
  { title: 'TypeScript', score: 22 },
  { title: 'Go', score: 15 },
  { title: 'Zig', score: 8 },
];

for (const opt of pollOptions) {
  db.prepare(
    'INSERT INTO items (type, by, title, parent_id, score, created_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).run('pollopt', 'pg', opt.title, Number(pollId), opt.score, ts(4 * hour));
}
console.log('Created poll with', pollOptions.length, 'options');

// ─── Summary ─────────────────────────────────────────
const totalUsers = db.prepare('SELECT COUNT(*) as c FROM users').get();
const totalItems = db.prepare('SELECT COUNT(*) as c FROM items').get();
const totalComments = db.prepare("SELECT COUNT(*) as c FROM items WHERE type = 'comment'").get();
const totalVotes = db.prepare('SELECT COUNT(*) as c FROM votes').get();

console.log(`\n=== Seed Complete ===`);
console.log(`Users: ${totalUsers.c}`);
console.log(`Stories: ${totalItems.c - totalComments.c}`);
console.log(`Comments: ${totalComments.c}`);
console.log(`Votes: ${totalVotes.c}`);
console.log(`\nAll users have password: "password"`);
console.log(`Try logging in as: pg, dang, tptacek, patio11, etc.`);

db.close();
