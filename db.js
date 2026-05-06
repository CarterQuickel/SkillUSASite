const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const sqlite3 = require("sqlite3").verbose();

const dataDir = path.join(__dirname, "data");
const dbPath = path.join(dataDir, "skillusa.db");
const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "sCh00lw!deY3$t";

let dbInstance = null;

const run = (db, sql, params = []) =>
  new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) {
        reject(err);
        return;
      }
      resolve(this);
    });
  });

const get = (db, sql, params = []) =>
  new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(row);
    });
  });

const all = (db, sql, params = []) =>
  new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(rows);
    });
  });

const getDb = () => {
  if (!dbInstance) {
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    dbInstance = new sqlite3.Database(dbPath);
  }

  return dbInstance;
};

const hashPassword = (password, salt = crypto.randomBytes(16).toString("hex")) => {
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `scrypt:${salt}:${hash}`;
};

const verifyPassword = (password, storedHash) => {
  if (!storedHash || typeof storedHash !== "string") {
    return false;
  }

  const [scheme, salt, hash] = storedHash.split(":");
  if (scheme !== "scrypt" || !salt || !hash) {
    return false;
  }

  const candidate = crypto.scryptSync(password, salt, 64).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(candidate, "hex"));
};

const seedAdminIfMissing = async (db) => {
  const row = await get(db, "SELECT COUNT(*) AS count FROM admin_account");
  if (row.count > 0) {
    return;
  }

  const username = ADMIN_USERNAME;
  const passwordHash = hashPassword(ADMIN_PASSWORD);
  await run(
    db,
    "INSERT INTO admin_account (id, username, password_hash) VALUES (1, ?, ?)",
    [username, passwordHash]
  );
};

const ensureAdminPassword = async (db) => {
  const row = await get(db, "SELECT id FROM admin_account WHERE id = 1");
  const passwordHash = hashPassword(ADMIN_PASSWORD);
  if (!row) {
    await run(
      db,
      "INSERT INTO admin_account (id, username, password_hash) VALUES (1, ?, ?)",
      [ADMIN_USERNAME, passwordHash]
    );
    return;
  }

  await run(
    db,
    "UPDATE admin_account SET username = ?, password_hash = ? WHERE id = 1",
    [ADMIN_USERNAME, passwordHash]
  );
};

const seedStaffIfMissing = async (db) => {
  const row = await get(db, "SELECT COUNT(*) AS count FROM staff");
  if (row.count > 0) {
    return;
  }

  const staffSeed = [
    {
      name: "Advisor One",
      role: "SkillsUSA Advisor",
      bio: "Guides members and supports chapter leadership.",
      section: "Advisors",
      imagePath: "/20250402_092420_54450934127_o.jpg",
      sortOrder: 1
    },
    {
      name: "Advisor Two",
      role: "SkillsUSA Advisor",
      bio: "Connects students with opportunities and competitions.",
      section: "Advisors",
      imagePath: "/20250403_092115_54452034528_o.jpg",
      sortOrder: 2
    },
    {
      name: "Advisor Three",
      role: "SkillsUSA Advisor",
      bio: "Focuses on member growth and project planning.",
      section: "Advisors",
      imagePath: "/20250403_092820_54451787071_o.jpg",
      sortOrder: 3
    },
    {
      name: "Officer One",
      role: "President",
      bio: "Leads chapter meetings and represents SkillsUSA.",
      section: "Officers",
      imagePath: "/20250403_102208_54450934212_o.jpg",
      sortOrder: 1
    },
    {
      name: "Officer Two",
      role: "Vice President",
      bio: "Supports the president and coordinates events.",
      section: "Officers",
      imagePath: "/20250403_103005_54451977999_o.jpg",
      sortOrder: 2
    },
    {
      name: "Officer Three",
      role: "Secretary",
      bio: "Keeps records and manages communication.",
      section: "Officers",
      imagePath: "/20250403_103654_54451786976_o.jpg",
      sortOrder: 3
    }
  ];

  for (const member of staffSeed) {
    await run(
      db,
      `INSERT INTO staff (name, role, bio, section, image_path, sort_order)
       VALUES (?, ?, ?, ?, ?, ?)`
      ,
      [
        member.name,
        member.role,
        member.bio,
        member.section,
        member.imagePath,
        member.sortOrder
      ]
    );
  }
};

const initializeDatabase = async () => {
  const db = getDb();

  await run(db, "PRAGMA foreign_keys = ON");
  await run(
    db,
    `CREATE TABLE IF NOT EXISTS admin_account (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`
  );
  await run(
    db,
    `CREATE TABLE IF NOT EXISTS staff (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      bio TEXT,
      section TEXT NOT NULL,
      image_path TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`
  );

  await seedAdminIfMissing(db);
  await seedStaffIfMissing(db);
  await ensureAdminPassword(db);
};

const getStaffBySection = async (section) => {
  const db = getDb();
  return all(
    db,
    `SELECT id, name, role, bio, image_path
     FROM staff
     WHERE section = ? AND is_active = 1
     ORDER BY sort_order, name`,
    [section]
  );
};

const verifyAdminCredentials = async (username, password) => {
  const db = getDb();
  const row = await get(
    db,
    "SELECT password_hash FROM admin_account WHERE username = ? AND id = 1",
    [username]
  );
  if (!row) {
    return false;
  }

  return verifyPassword(password, row.password_hash);
};

module.exports = {
  initializeDatabase,
  getStaffBySection,
  verifyAdminCredentials
};
