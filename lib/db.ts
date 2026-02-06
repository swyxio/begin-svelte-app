import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'data', 'hn.db');

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initializeDatabase(db);
  }
  return db;
}

function initializeDatabase(db: Database.Database) {
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
      type TEXT NOT NULL CHECK(type IN ('story', 'comment', 'job')),
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
    CREATE INDEX IF NOT EXISTS idx_users_username ON users(username COLLATE NOCASE);
    CREATE INDEX IF NOT EXISTS idx_votes_item ON votes(item_id);
    CREATE INDEX IF NOT EXISTS idx_favorites_user ON favorites(user_id);
    CREATE INDEX IF NOT EXISTS idx_hidden_user ON hidden(user_id);
    CREATE INDEX IF NOT EXISTS idx_flags_item ON flags(item_id);
  `);
}

// ─── User queries ────────────────────────────────────────

export function createUser(username: string, passwordHash: string): number {
  const db = getDb();
  const result = db.prepare(
    'INSERT INTO users (username, password_hash) VALUES (?, ?)'
  ).run(username, passwordHash);
  return result.lastInsertRowid as number;
}

export function getUserByUsername(username: string) {
  const db = getDb();
  return db.prepare('SELECT * FROM users WHERE username = ? COLLATE NOCASE').get(username) as DbUser | undefined;
}

export function getUserById(id: number) {
  const db = getDb();
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id) as DbUser | undefined;
}

export function updateUserProfile(userId: number, fields: Partial<Pick<DbUser, 'about' | 'email' | 'showdead' | 'noprocrast' | 'maxvisit' | 'minaway' | 'delay'>>) {
  const db = getDb();
  const setClauses: string[] = [];
  const values: unknown[] = [];
  for (const [key, value] of Object.entries(fields)) {
    setClauses.push(`${key} = ?`);
    values.push(value);
  }
  if (setClauses.length === 0) return;
  values.push(userId);
  db.prepare(`UPDATE users SET ${setClauses.join(', ')} WHERE id = ?`).run(...values);
}

export function updateUserPassword(userId: number, passwordHash: string) {
  const db = getDb();
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(passwordHash, userId);
}

export function updateUserKarma(username: string, delta: number) {
  const db = getDb();
  db.prepare('UPDATE users SET karma = MAX(0, karma + ?) WHERE username = ? COLLATE NOCASE').run(delta, username);
}

export function getTopUsers(limit: number = 100) {
  const db = getDb();
  return db.prepare('SELECT username, karma, created_at FROM users ORDER BY karma DESC LIMIT ?').all(limit) as Pick<DbUser, 'username' | 'karma' | 'created_at'>[];
}

// ─── Item queries ────────────────────────────────────────

export function createItem(item: { type: string; by: string; title?: string; url?: string; text?: string; parent_id?: number; story_id?: number }): number {
  const db = getDb();
  const result = db.prepare(
    'INSERT INTO items (type, by, title, url, text, parent_id, story_id) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(item.type, item.by, item.title || null, item.url || null, item.text || null, item.parent_id || null, item.story_id || null);
  return result.lastInsertRowid as number;
}

export function getItemById(id: number) {
  const db = getDb();
  return db.prepare('SELECT * FROM items WHERE id = ?').get(id) as DbItem | undefined;
}

export function getStories(options: { type?: string; titlePrefix?: string; orderBy?: string; limit?: number; offset?: number; excludeHiddenFor?: number; byUser?: string; noobOnly?: boolean }) {
  const db = getDb();
  const conditions: string[] = ['i.deleted = 0'];
  const params: unknown[] = [];

  if (options.type) {
    conditions.push('i.type = ?');
    params.push(options.type);
  } else {
    conditions.push("i.type IN ('story', 'job')");
  }

  if (options.titlePrefix) {
    conditions.push('i.title LIKE ?');
    params.push(options.titlePrefix + '%');
  }

  if (options.excludeHiddenFor) {
    conditions.push('i.id NOT IN (SELECT item_id FROM hidden WHERE user_id = ?)');
    params.push(options.excludeHiddenFor);
  }

  if (options.byUser) {
    conditions.push('i.by = ? COLLATE NOCASE');
    params.push(options.byUser);
  }

  if (options.noobOnly) {
    conditions.push("i.by IN (SELECT username FROM users WHERE created_at > datetime('now', '-7 days'))");
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const orderBy = options.orderBy || 'i.created_at DESC';
  const limit = options.limit || 30;
  const offset = options.offset || 0;

  return db.prepare(`SELECT i.* FROM items i ${where} ORDER BY ${orderBy} LIMIT ? OFFSET ?`).all(...params, limit, offset) as DbItem[];
}

export function getComments(options: { storyId?: number; parentId?: number; byUser?: string; orderBy?: string; limit?: number; offset?: number; noobOnly?: boolean }) {
  const db = getDb();
  const conditions: string[] = ["type = 'comment'", 'deleted = 0'];
  const params: unknown[] = [];

  if (options.storyId) {
    conditions.push('story_id = ?');
    params.push(options.storyId);
  }

  if (options.parentId !== undefined) {
    conditions.push('parent_id = ?');
    params.push(options.parentId);
  }

  if (options.byUser) {
    conditions.push('by = ? COLLATE NOCASE');
    params.push(options.byUser);
  }

  if (options.noobOnly) {
    conditions.push("by IN (SELECT username FROM users WHERE created_at > datetime('now', '-7 days'))");
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const orderBy = options.orderBy || 'created_at DESC';
  const limit = options.limit || 30;
  const offset = options.offset || 0;

  return db.prepare(`SELECT * FROM items ${where} ORDER BY ${orderBy} LIMIT ? OFFSET ?`).all(...params, limit, offset) as DbItem[];
}

export function getCommentsByStory(storyId: number) {
  const db = getDb();
  return db.prepare(
    "SELECT * FROM items WHERE story_id = ? AND type = 'comment' AND deleted = 0 ORDER BY created_at ASC"
  ).all(storyId) as DbItem[];
}

export function getChildComments(parentId: number) {
  const db = getDb();
  return db.prepare(
    "SELECT * FROM items WHERE parent_id = ? AND type = 'comment' AND deleted = 0 ORDER BY score DESC, created_at ASC"
  ).all(parentId) as DbItem[];
}

export function updateItemScore(itemId: number, delta: number) {
  const db = getDb();
  db.prepare('UPDATE items SET score = MAX(score + ?, -4) WHERE id = ?').run(delta, itemId);
}

export function updateItemText(itemId: number, text: string) {
  const db = getDb();
  db.prepare('UPDATE items SET text = ? WHERE id = ?').run(text, itemId);
}

export function deleteItem(itemId: number) {
  const db = getDb();
  db.prepare("UPDATE items SET deleted = 1, text = '[deleted]' WHERE id = ?").run(itemId);
}

export function incrementDescendants(storyId: number, delta: number = 1) {
  const db = getDb();
  db.prepare('UPDATE items SET descendants = MAX(0, descendants + ?) WHERE id = ?').run(delta, storyId);
}

export function getItemByUrl(url: string) {
  const db = getDb();
  return db.prepare("SELECT * FROM items WHERE url = ? AND type = 'story' AND deleted = 0").get(url) as DbItem | undefined;
}

export function killItem(itemId: number) {
  const db = getDb();
  db.prepare('UPDATE items SET dead = 1 WHERE id = ?').run(itemId);
}

export function unkillItem(itemId: number) {
  const db = getDb();
  db.prepare('UPDATE items SET dead = 0 WHERE id = ?').run(itemId);
}

export function getActiveStories(limit: number = 30, offset: number = 0) {
  const db = getDb();
  return db.prepare(`
    SELECT i.*, MAX(c.created_at) as last_comment_at
    FROM items i
    LEFT JOIN items c ON c.story_id = i.id AND c.type = 'comment' AND c.deleted = 0
    WHERE i.type IN ('story', 'job') AND i.deleted = 0 AND i.descendants > 0
    GROUP BY i.id
    ORDER BY last_comment_at DESC
    LIMIT ? OFFSET ?
  `).all(limit, offset) as DbItem[];
}

export function getStoriesFromDomain(domain: string, limit: number = 30, offset: number = 0) {
  const db = getDb();
  return db.prepare(`
    SELECT * FROM items 
    WHERE type = 'story' AND deleted = 0 AND url LIKE ?
    ORDER BY created_at DESC LIMIT ? OFFSET ?
  `).all(`%://${domain}%`, limit, offset) as DbItem[];
}

// ─── Vote queries ────────────────────────────────────────

export function getVote(userId: number, itemId: number) {
  const db = getDb();
  return db.prepare('SELECT * FROM votes WHERE user_id = ? AND item_id = ?').get(userId, itemId) as DbVote | undefined;
}

export function addVote(userId: number, itemId: number, direction: string) {
  const db = getDb();
  db.prepare('INSERT OR REPLACE INTO votes (user_id, item_id, direction) VALUES (?, ?, ?)').run(userId, itemId, direction);
}

export function removeVote(userId: number, itemId: number) {
  const db = getDb();
  db.prepare('DELETE FROM votes WHERE user_id = ? AND item_id = ?').run(userId, itemId);
}

export function getUserVotesForItems(userId: number, itemIds: number[]) {
  if (itemIds.length === 0) return [];
  const db = getDb();
  const placeholders = itemIds.map(() => '?').join(',');
  return db.prepare(`SELECT * FROM votes WHERE user_id = ? AND item_id IN (${placeholders})`).all(userId, ...itemIds) as DbVote[];
}

export function getUserUpvotedItems(userId: number, limit: number = 30, offset: number = 0) {
  const db = getDb();
  return db.prepare(`
    SELECT i.* FROM items i
    JOIN votes v ON v.item_id = i.id
    WHERE v.user_id = ? AND v.direction = 'up' AND i.deleted = 0
    ORDER BY v.created_at DESC LIMIT ? OFFSET ?
  `).all(userId, limit, offset) as DbItem[];
}

// ─── Favorite queries ────────────────────────────────────

export function addFavorite(userId: number, itemId: number) {
  const db = getDb();
  db.prepare('INSERT OR IGNORE INTO favorites (user_id, item_id) VALUES (?, ?)').run(userId, itemId);
}

export function removeFavorite(userId: number, itemId: number) {
  const db = getDb();
  db.prepare('DELETE FROM favorites WHERE user_id = ? AND item_id = ?').run(userId, itemId);
}

export function isFavorite(userId: number, itemId: number): boolean {
  const db = getDb();
  return !!db.prepare('SELECT 1 FROM favorites WHERE user_id = ? AND item_id = ?').get(userId, itemId);
}

export function getUserFavorites(userId: number, limit: number = 30, offset: number = 0) {
  const db = getDb();
  return db.prepare(`
    SELECT i.* FROM items i
    JOIN favorites f ON f.item_id = i.id
    WHERE f.user_id = ? AND i.deleted = 0
    ORDER BY f.created_at DESC LIMIT ? OFFSET ?
  `).all(userId, limit, offset) as DbItem[];
}

// ─── Hidden queries ──────────────────────────────────────

export function addHidden(userId: number, itemId: number) {
  const db = getDb();
  db.prepare('INSERT OR IGNORE INTO hidden (user_id, item_id) VALUES (?, ?)').run(userId, itemId);
}

export function removeHidden(userId: number, itemId: number) {
  const db = getDb();
  db.prepare('DELETE FROM hidden WHERE user_id = ? AND item_id = ?').run(userId, itemId);
}

export function isHidden(userId: number, itemId: number): boolean {
  const db = getDb();
  return !!db.prepare('SELECT 1 FROM hidden WHERE user_id = ? AND item_id = ?').get(userId, itemId);
}

export function getUserHidden(userId: number, limit: number = 30, offset: number = 0) {
  const db = getDb();
  return db.prepare(`
    SELECT i.* FROM items i
    JOIN hidden h ON h.item_id = i.id
    WHERE h.user_id = ? AND i.deleted = 0
    ORDER BY h.created_at DESC LIMIT ? OFFSET ?
  `).all(userId, limit, offset) as DbItem[];
}

// ─── Flag queries ────────────────────────────────────────

export function addFlag(userId: number, itemId: number) {
  const db = getDb();
  db.prepare('INSERT OR IGNORE INTO flags (user_id, item_id) VALUES (?, ?)').run(userId, itemId);
}

export function removeFlag(userId: number, itemId: number) {
  const db = getDb();
  db.prepare('DELETE FROM flags WHERE user_id = ? AND item_id = ?').run(userId, itemId);
}

export function isFlagged(userId: number, itemId: number): boolean {
  const db = getDb();
  return !!db.prepare('SELECT 1 FROM flags WHERE user_id = ? AND item_id = ?').get(userId, itemId);
}

export function getFlagCount(itemId: number): number {
  const db = getDb();
  const result = db.prepare('SELECT COUNT(*) as count FROM flags WHERE item_id = ?').get(itemId) as { count: number };
  return result.count;
}

// ─── Types ───────────────────────────────────────────────

export interface DbUser {
  id: number;
  username: string;
  password_hash: string;
  email: string;
  karma: number;
  about: string;
  showdead: number;
  noprocrast: number;
  maxvisit: number;
  minaway: number;
  delay: number;
  created_at: string;
}

export interface DbItem {
  id: number;
  type: string;
  by: string;
  title: string | null;
  url: string | null;
  text: string | null;
  parent_id: number | null;
  story_id: number | null;
  score: number;
  descendants: number;
  dead: number;
  deleted: number;
  created_at: string;
}

export interface DbVote {
  user_id: number;
  item_id: number;
  direction: string;
  created_at: string;
}
