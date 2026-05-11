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

const seedAlbumsIfMissing = async (db) => {
  const row = await get(db, "SELECT COUNT(*) AS count FROM albums");
  if (row.count > 0) {
    return;
  }

  const seedAlbums = [
    {
      title: "Feb. 27, 2026 - NTHS & SkillsUSA",
      description: "Seventy-five members of our SkillsUSA and National Technical Honor Society chapters participated in the Capital Area Cool Schools Polar Plunge on Feb. 27, 2026. They raised over $1,000 for Special Olympics Pennsylvania, which will go toward unified sports programs, engagement activities, training resources, and much more.",
      folder: "2272026"
    },
    {
      title: "Feb. 18, 2026 - SkillsUSA & Culinary Arts",
      description: "The advisors and class representatives for SkillsUSA came together during a special luncheon on Feb. 18, 2026. It was an opportunity to discuss specific chapter topics and review two important life skills: dining etiquette and table manners. The meal was prepared by students in our Culinary Arts program, so they benefited from a chance to practice their food service techniques and front-of-house skills.",
      folder: "2182026"
    },
    {
      title: "Dec. 11, 2025 - Student Council & SkillsUSA Free Hunger York Event",
      description: "We're #YorkTechProud to have students and employees who value giving back to the community. Members of Student Council and SkillsUSA volunteered at the York County Food Bank on Dec. 11, 2025. They packed 1,280 boxes of food for senior citizens in need. Way to go, Spartans!",
      folder: "freeHungerYork"
    },
    {
      title: "April 2-4, 2025 - SkillsUSA National Leadership and Skills Conference",
      description: "Thirteen students and two advisors attended the SkillsUSA Pennsylvania Leadership and Skills Conference in Hershey from April 2-4, 2025. While there, Felicity Troup was elected a state officer, and Rylan McCubbin finished third in the Automotive Technology competition! Thanks to his great performance, Rylan earned a $6,000 scholarship and a Snap-on tool set worth $400. Congratulations, Felicity and Rylan, and thank you to everyone who represented Spartan Nation during this event!",
      folder: "422025"
    },
    {
      title: "Jan. 28, 2025 - SkillsUSA",
      description: "SkillsUSA members participated in an organizational meeting and awards ceremony.",
      folder: "1282025"
    },
    {
      title: "Dec. 17, 2024 - FFA and SkillsUSA",
      description: "Students in FFA and SkillsUSA went on a community service field trip to New Bridgeville on Dec. 17,2024. They pruned trees that were planted by York Tech students in 2014! Thank you to Alan Miller, owner of River Rock Landscape and an Occupational Advisory Committee member at York Tech, for assisting with this learning opportunity.",
      folder: "12172024"
    },
    {
      title: "Nov. 7, 2024 - SkillsUSA PA State Leadership and Skills Conference",
      description: "Our chapter of SkillsUSA is gearing up for another round of conferences, competitions, and skill development. The leadership team and officers met on Nov. 7, 2024, to prepare for a Central Region workshop being held in Gettysburg. They were also fitted for their iconic red jackets, which is always exciting! Thank you to Mr. Balsavage and Mr. Spahr, the chapter's advisors, for helping members prepare for career success through this great organization!",
      folder: "1172024"
    }
  ];

  for (const album of seedAlbums) {
    await run(
      db,
      `INSERT INTO albums (title, description, folder)
       VALUES (?, ?, ?)`
      ,
      [album.title, album.description, album.folder]
    );
  }
};

const seedSponsorsIfMissing = async (db) => {
  const row = await get(db, "SELECT COUNT(*) AS count FROM sponsors");
  if (row.count > 0) {
    return;
  }

  const seedSponsors = [
    { name: "SECCO Electric" },
    { name: "Faulkner" },
    { name: "Hoffman Ford" },
    { name: "Remco, Inc." },
    { name: "Pennsylvania College of Technology" },
    { name: "Ainsworth" },
    { name: "Crown Automotive" },
    { name: "AP Williams Construction" },
    { name: "DCTS Education Foundation" },
    { name: "Dauphin County" },
    { name: "Collision Repair Technology" },
    { name: "LaPorte Painting" },
    { name: "Machinery Tech" },
    { name: "IEC Pennsylvania" },
    { name: "Witmer Group" }
  ];

  for (const [index, sponsor] of seedSponsors.entries()) {
    await run(
      db,
      `INSERT INTO sponsors (name, logo_url, link_url, sort_order)
       VALUES (?, ?, ?, ?)`
      ,
      [sponsor.name, "/icons/placeholder.png", "/sponsor", index + 1]
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
  await run(
    db,
    `CREATE TABLE IF NOT EXISTS sponsors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      logo_url TEXT NOT NULL,
      link_url TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`
  );
  await run(
    db,
    `CREATE TABLE IF NOT EXISTS albums (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      folder TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`
  );

  await seedAdminIfMissing(db);
  await seedStaffIfMissing(db);
  await seedNewsIfMissing(db);
  await seedEventsIfMissing(db);
  await seedSponsorsIfMissing(db);
  await seedAlbumsIfMissing(db);
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

const createStaffMember = async ({ name, role, bio, section, imagePath, sortOrder }) => {
  const db = getDb();
  const result = await run(
    db,
    `INSERT INTO staff (name, role, bio, section, image_path, sort_order, is_active)
     VALUES (?, ?, ?, ?, ?, ?, 1)`
    ,
    [name, role, bio, section, imagePath || null, sortOrder || 0]
  );
  return result.lastID;
};

const updateStaffMember = async (id, { name, role, bio, section, imagePath }) => {
  const db = getDb();
  await run(
    db,
    `UPDATE staff
     SET name = ?, role = ?, bio = ?, section = ?, image_path = ?
     WHERE id = ?`
    ,
    [name, role, bio, section, imagePath || null, id]
  );
};

const deleteStaffMember = async (id) => {
  const db = getDb();
  await run(db, "UPDATE staff SET is_active = 0 WHERE id = ?", [id]);
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
    `SELECT id, title, info, image_url, date, category, is_featured
     FROM news_items
     ORDER BY is_featured DESC, date DESC, id DESC`
  );
};

const createNewsItem = async ({ title, info, imageUrl, date, category, isFeatured }) => {
  const db = getDb();
  const result = await run(
    db,
    `INSERT INTO news_items (title, info, image_url, date, category, is_featured)
     VALUES (?, ?, ?, ?, ?, ?)`
    ,
    [title, info, imageUrl, date, category, isFeatured ? 1 : 0]
  );
  return result.lastID;
};

const updateNewsItem = async (id, { title, info, imageUrl, date, category }) => {
  const db = getDb();
  await run(
    db,
    `UPDATE news_items
     SET title = ?, info = ?, image_url = ?, date = ?, category = ?, updated_at = datetime('now')
     WHERE id = ?`
    ,
    [title, info, imageUrl, date, category, id]
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

const getAlbums = async () => {
  const db = getDb();
  return all(
    db,
    `SELECT id, title, description, folder
     FROM albums
     ORDER BY created_at DESC, id DESC`
  );
};

const getAlbumById = async (id) => {
  const db = getDb();
  return get(
    db,
    `SELECT id, title, description, folder
     FROM albums
     WHERE id = ?`,
    [id]
  );
};

const getAlbumByFolder = async (folder) => {
  const db = getDb();
  return get(
    db,
    `SELECT id, title, description, folder
     FROM albums
     WHERE folder = ?`,
    [folder]
  );
};

const createAlbum = async ({ title, description, folder }) => {
  const db = getDb();
  const result = await run(
    db,
    `INSERT INTO albums (title, description, folder)
     VALUES (?, ?, ?)`
    ,
    [title, description, folder]
  );
  return result.lastID;
};

const updateAlbum = async (id, { title, description }) => {
  const db = getDb();
  await run(
    db,
    `UPDATE albums
     SET title = ?, description = ?, updated_at = datetime('now')
     WHERE id = ?`
    ,
    [title, description, id]
  );
};

const deleteAlbum = async (id) => {
  const db = getDb();
  await run(db, "DELETE FROM albums WHERE id = ?", [id]);
};

const getSponsors = async () => {
  const db = getDb();
  return all(
    db,
    `SELECT id, name, logo_url, link_url, sort_order
     FROM sponsors
     ORDER BY sort_order ASC, name ASC, id ASC`
  );
};

const createSponsor = async ({ name, logoUrl, linkUrl, sortOrder }) => {
  const db = getDb();
  const result = await run(
    db,
    `INSERT INTO sponsors (name, logo_url, link_url, sort_order)
     VALUES (?, ?, ?, ?)`
    ,
    [name, logoUrl, linkUrl, sortOrder || 0]
  );
  return result.lastID;
};

const updateSponsor = async (id, { name, logoUrl, linkUrl, sortOrder }) => {
  const db = getDb();
  await run(
    db,
    `UPDATE sponsors
     SET name = ?, logo_url = ?, link_url = ?, sort_order = ?, updated_at = datetime('now')
     WHERE id = ?`
    ,
    [name, logoUrl, linkUrl, sortOrder || 0, id]
  );
};

const deleteSponsor = async (id) => {
  const db = getDb();
  await run(db, "DELETE FROM sponsors WHERE id = ?", [id]);
};

module.exports = {
  initializeDatabase,
  getStaffBySection,
  createStaffMember,
  updateStaffMember,
  deleteStaffMember,
  verifyAdminCredentials,
  getNewsItems,
  createNewsItem,
  updateNewsItem,
  deleteNewsItem,
  getEventItems,
  createEventItem,
  updateEventItem,
  deleteEventItem,
  getSponsors,
  createSponsor,
  updateSponsor,
  deleteSponsor,
  getAlbums,
  getAlbumById,
  getAlbumByFolder,
  createAlbum,
  updateAlbum,
  deleteAlbum
};