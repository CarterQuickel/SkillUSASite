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

const seedNewsIfMissing = async (db) => {
  const row = await get(db, "SELECT COUNT(*) AS count FROM news_items");
  if (row.count > 0) {
    return;
  }

  const seedNews = [
    {
      title: "State Championship Winners Announced",
      info: "Our SkillsUSA team brought home multiple medals from the state championships this year. Read about the amazing performances and achievements of our talented students who competed against the best in the state.",
      imageUrl: "https://via.placeholder.com/600x400?text=Featured+Story",
      date: "2026-05-05",
      category: "Competition Results",
      isFeatured: 1
    },
    {
      title: "Spring Training Workshop Scheduled",
      info: "Join us for an intensive training workshop to prepare for upcoming competitions. Industry experts will lead sessions in various technical skills.",
      imageUrl: "https://via.placeholder.com/400x300?text=Article+2",
      date: "2026-04-28",
      category: "Events",
      isFeatured: 0
    },
    {
      title: "Student Profile: Rising Star in Carpentry",
      info: "Meet this month's featured student and learn about their journey with SkillsUSA and how the program has shaped their career path and professional goals.",
      imageUrl: "https://via.placeholder.com/400x300?text=Article+3",
      date: "2026-04-20",
      category: "Student Spotlight",
      isFeatured: 0
    },
    {
      title: "Registration Open for Summer Programs",
      info: "Don't miss out! Registration is now open for our summer training programs. Spaces are limited, so register early to secure your spot in your preferred program.",
      imageUrl: "https://via.placeholder.com/400x300?text=Article+4",
      date: "2026-04-15",
      category: "Announcements",
      isFeatured: 0
    },
    {
      title: "Local Competition Results In",
      info: "Congratulations to all participants in the local competition! Check out who's advancing to the regional competition and see detailed results from each event category.",
      imageUrl: "https://via.placeholder.com/400x300?text=Article+5",
      date: "2026-04-08",
      category: "Events",
      isFeatured: 0
    },
    {
      title: "Scholarship Opportunity for SkillsUSA Members",
      info: "Several of our corporate sponsors are offering scholarships specifically for SkillsUSA members. Learn about eligibility requirements and how to apply for these valuable opportunities.",
      imageUrl: "https://via.placeholder.com/400x300?text=Article+6",
      date: "2026-04-01",
      category: "Student Spotlight",
      isFeatured: 0
    }
  ];

  for (const item of seedNews) {
    await run(
      db,
      `INSERT INTO news_items (title, info, image_url, date, category, is_featured)
       VALUES (?, ?, ?, ?, ?, ?)`
      ,
      [item.title, item.info, item.imageUrl, item.date, item.category, item.isFeatured]
    );
  }
};

const seedEventsIfMissing = async (db) => {
  const row = await get(db, "SELECT COUNT(*) AS count FROM event_items");
  if (row.count > 0) {
    return;
  }

  const seedEvents = [
    {
      title: "Regional Qualifier Round 1",
      info: "First round of regional qualifiers. Students compete in various technical skills to advance to the next round.",
      location: "York County School of Technology",
      startDate: "2026-05-15",
      endDate: null,
      duration: null
    },
    {
      title: "Leadership Training Intensive",
      info: "Join our intensive 3-day leadership development workshop. Build communication and team-building skills essential for competition success. Includes meals and materials.",
      location: "Conference Center",
      startDate: "2026-05-22",
      endDate: "2026-05-24",
      duration: "3-Day Workshop"
    },
    {
      title: "Regional Qualifier Finals",
      info: "Final round of regional qualifications. Top performers will advance to the state championships.",
      location: "York County School of Technology",
      startDate: "2026-06-05",
      endDate: null,
      duration: null
    },
    {
      title: "State Championship Preparation Boot Camp",
      info: "Intensive 4-day preparation boot camp for students advancing to state championships. Learn from experienced judges, mentors, and industry professionals.",
      location: "Main Campus",
      startDate: "2026-06-18",
      endDate: "2026-06-21",
      duration: "4-Day Boot Camp"
    },
    {
      title: "State Championship Competition",
      info: "The pinnacle event! Our students compete against the best from across Pennsylvania for state titles and advancement to nationals. Multiple skill competitions, networking, and awards.",
      location: "State Conference Center",
      startDate: "2026-07-09",
      endDate: "2026-07-12",
      duration: "4-Day Event"
    },
    {
      title: "Summer Skill Development Programs",
      info: "Intensive month-long programs offering skill development in carpentry, culinary arts, information technology, health sciences, and more. Flexible scheduling available.",
      location: "Various Locations",
      startDate: "2026-08-01",
      endDate: "2026-08-31",
      duration: "Full Month Program"
    }
  ];

  for (const item of seedEvents) {
    await run(
      db,
      `INSERT INTO event_items (title, info, location, start_date, end_date, duration)
       VALUES (?, ?, ?, ?, ?, ?)`
      ,
      [item.title, item.info, item.location, item.startDate, item.endDate, item.duration]
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
  await run(
    db,
    `CREATE TABLE IF NOT EXISTS news_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      info TEXT NOT NULL,
      image_url TEXT,
      date TEXT NOT NULL,
      category TEXT NOT NULL,
      is_featured INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`
  );
  await run(
    db,
    `CREATE TABLE IF NOT EXISTS event_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      info TEXT NOT NULL,
      location TEXT,
      start_date TEXT NOT NULL,
      end_date TEXT,
      duration TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`
  );

  await seedAdminIfMissing(db);
  await seedStaffIfMissing(db);
  await seedNewsIfMissing(db);
  await seedEventsIfMissing(db);
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

const getNewsItems = async () => {

  const db = getDb();

  return all(
    db,
    `
      SELECT
        id,
        title,
        info,
        image_url,
        date,
        category,
        is_featured
      FROM news_items
      ORDER BY
        is_featured DESC,
        date DESC,
        id DESC
    `
  );

};

const getNewsItemById = async (id) => {

  const db = getDb();

  return get(
    db,
    `
      SELECT
        id,
        title,
        info,
        image_url,
        date,
        category,
        is_featured
      FROM news_items
      WHERE id = ?
    `,
    [id]
  );

};

const createNewsItem = async ({
  title,
  info,
  imageUrl,
  date,
  category,
  isFeatured
}) => {

  const db = getDb();

  const result = await run(
    db,
    `
      INSERT INTO news_items (
        title,
        info,
        image_url,
        date,
        category,
        is_featured
      )
      VALUES (?, ?, ?, ?, ?, ?)
    `,
    [
      title,
      info,
      imageUrl,
      date,
      category,
      isFeatured ? 1 : 0
    ]
  );

  return result.lastID;
};

const updateNewsItem = async (
  id,
  {
    title,
    info,
    imageUrl,
    date,
    category,
    isFeatured
  }
) => {

  const db = getDb();

  await run(
    db,
    `
      UPDATE news_items
      SET
        title = ?,
        info = ?,
        image_url = ?,
        date = ?,
        category = ?,
        is_featured = ?,
        updated_at = datetime('now')
      WHERE id = ?
    `,
    [
      title,
      info,
      imageUrl,
      date,
      category,
      isFeatured ? 1 : 0,
      id
    ]
  );

};

const deleteNewsItem = async (id) => {
  const db = getDb();
  await run(db, "DELETE FROM news_items WHERE id = ?", [id]);
};

const getEventItems = async () => {
  const db = getDb();
  return all(
    db,
    `SELECT id, title, info, location, start_date, end_date, duration
     FROM event_items
     ORDER BY start_date ASC, id ASC`
  );
};

const getEventItemById = async (id) => {
  const db = getDb();
  return get(
    db,
    `SELECT id, title, info, location, start_date, end_date, duration
     FROM event_items
     WHERE id = ?`,
    [id]
  );
};

const createEventItem = async ({ title, info, location, startDate, endDate, duration }) => {
  const db = getDb();
  const result = await run(
    db,
    `INSERT INTO event_items (title, info, location, start_date, end_date, duration)
     VALUES (?, ?, ?, ?, ?, ?)`
    ,
    [title, info, location, startDate, endDate, duration]
  );
  return result.lastID;
};

const updateEventItem = async (id, { title, info, location, startDate, endDate, duration }) => {
  const db = getDb();
  await run(
    db,
    `UPDATE event_items
     SET title = ?, info = ?, location = ?, start_date = ?, end_date = ?, duration = ?, updated_at = datetime('now')
     WHERE id = ?`
    ,
    [title, info, location, startDate, endDate, duration, id]
  );
};

const deleteEventItem = async (id) => {
  const db = getDb();
  await run(db, "DELETE FROM event_items WHERE id = ?", [id]);
};

module.exports = {
  initializeDatabase,
  getStaffBySection,
  verifyAdminCredentials,
  getNewsItems,
  getNewsItemById,
  createNewsItem,
  updateNewsItem,
  deleteNewsItem,
  getEventItems,
  getEventItemById,
  createEventItem,
  updateEventItem,
  deleteEventItem
};
