const express = require("express");
<<<<<<< HEAD
const path = require("path");
const http = require("http");
const session = require("express-session");
const SQLiteStore = require("connect-sqlite3")(session);
const {
  initializeDatabase,
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
  deleteEventItem,
  getStaffBySection
} = require("./db");

const app = express();
const server = http.createServer(app);

const io = require("socket.io")(server);

=======
const session = require("express-session");
const multer = require("multer");
const {
	initializeDatabase,
	getStaffBySection,
	verifyAdminCredentials,
	getNewsItems,
	createNewsItem,
	updateNewsItem,
	deleteNewsItem,
	getEventItems,
	createEventItem,
	updateEventItem,
	deleteEventItem
} = require("./db");

const app = express();
>>>>>>> parent of 4d5fa78 (ok)
const PORT = process.env.PORT || 3000;

/*
  INIT DATABASE
*/
initializeDatabase()
  .then(() => {
    console.log("Database initialized");
  })
  .catch(err => {
    console.error("Database init failed:", err);
  });

/*
  MIDDLEWARE
*/
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    store: new SQLiteStore({
      db: "sessions.sqlite",
      dir: "./data"
    }),

    secret: "skillsusa-secret-key",

    resave: false,
    saveUninitialized: false,

    cookie: {
      secure: false,
      maxAge: 1000 * 60 * 60 * 24
    }
  })
);

app.use(express.static(path.join(__dirname, "public")));

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

/*
  GLOBAL ADMIN FLAG
*/
app.use((req, res, next) => {

  res.locals.isAdmin = !!req.session.isAdmin;

  next();
});

/*
  HOME
*/
app.get("/", async (req, res) => {

  try {

    const advisors = await getStaffBySection("Advisors");
    const officers = await getStaffBySection("Officers");

    res.render("index", {
      advisors,
      officers
    });

  } catch (err) {

    console.error(err);
    res.status(500).send("Server Error");

  }

});

/*
  NEWS PAGE
*/
app.get("/news", async (req, res) => {

  try {

    const newsItems = await getNewsItems();

    res.render("news", {
      newsItems
    });

  } catch (err) {

    console.error(err);
    res.status(500).send("Server Error");

  }

});

/*
  EVENTS PAGE
*/
app.get("/events", async (req, res) => {

  try {

    const eventItems = await getEventItems();

    res.render("events", {
      eventItems
    });

  } catch (err) {

    console.error(err);
    res.status(500).send("Server Error");

  }

});

/*
  LOGIN PAGE
*/
app.get("/login", (req, res) => {

  res.render("login", {
    error: null
  });

});

/*
  LOGIN POST
*/
app.post("/login", async (req, res) => {

  const { username, password } = req.body;

  try {

    const valid = await verifyAdminCredentials(
      username,
      password
    );

    if (!valid) {

      return res.render("login", {
        error: "Invalid credentials"
      });

    }

    req.session.isAdmin = true;

    res.redirect("/news");

  } catch (err) {

    console.error(err);

    res.render("login", {
      error: "Login failed"
    });

  }

});

/*
  LOGOUT
*/
app.get("/logout", (req, res) => {

  req.session.destroy(() => {
    res.redirect("/");
  });

});

/*
  ADMIN CHECK
*/
function requireAdmin(req, res, next) {

  if (!req.session.isAdmin) {

    return res.status(401).json({
      error: "Unauthorized"
    });

  }

  next();
}

/*
  =========================
  NEWS API
  =========================
*/

/*
  CREATE NEWS
*/
app.post("/api/news", requireAdmin, async (req, res) => {

  try {

    const id = await createNewsItem(req.body);

    const createdItem = await getNewsItemById(id);

    io.emit("newsCreated", createdItem);

    res.json(createdItem);

  } catch (err) {

    console.error(err);

    res.status(500).json({
      error: "Failed to create news"
    });

  }

});

/*
  UPDATE NEWS
*/
app.put("/api/news/:id", requireAdmin, async (req, res) => {

  try {

    const id = req.params.id;

    await updateNewsItem(id, req.body);

    const updatedItem = await getNewsItemById(id);

    io.emit("newsUpdated", updatedItem);

    res.json(updatedItem);

  } catch (err) {

    console.error(err);

    res.status(500).json({
      error: "Failed to update news"
    });

  }

});

/*
  DELETE NEWS
*/
app.delete("/api/news/:id", requireAdmin, async (req, res) => {

  try {

    const id = req.params.id;

    await deleteNewsItem(id);

    io.emit("newsDeleted", {
      id
    });

    res.json({
      success: true
    });

  } catch (err) {

    console.error(err);

    res.status(500).json({
      error: "Failed to delete news"
    });

  }

});

/*
  =========================
  EVENTS API
  =========================
*/

/*
  CREATE EVENT
*/
app.post("/api/events", requireAdmin, async (req, res) => {

  try {

    const id = await createEventItem(req.body);

    const createdItem = await getEventItemById(id);

    io.emit("eventCreated", createdItem);

    res.json(createdItem);

  } catch (err) {

    console.error(err);

    res.status(500).json({
      error: "Failed to create event"
    });

  }

});

/*
  UPDATE EVENT
*/
app.put("/api/events/:id", requireAdmin, async (req, res) => {

  try {

    const id = req.params.id;

    await updateEventItem(id, req.body);

    const updatedItem = await getEventItemById(id);

    io.emit("eventUpdated", updatedItem);

    res.json(updatedItem);

  } catch (err) {

    console.error(err);

    res.status(500).json({
      error: "Failed to update event"
    });

  }

});

/*
  DELETE EVENT
*/
app.delete("/api/events/:id", requireAdmin, async (req, res) => {

  try {

    const id = req.params.id;

    await deleteEventItem(id);

    io.emit("eventDeleted", {
      id
    });

    res.json({
      success: true
    });

  } catch (err) {

    console.error(err);

    res.status(500).json({
      error: "Failed to delete event"
    });

  }

});

/*
  SOCKET.IO
*/
io.on("connection", socket => {

  console.log("User connected");

  socket.on("disconnect", () => {
    console.log("User disconnected");
  });

});

/*
  START SERVER
*/
server.listen(PORT, () => {

  console.log(`Server running on port ${PORT}`);

<<<<<<< HEAD
});
=======
	upload.single("image")(req, res, (error) => {
		if (error) {
			res.status(400).json({ error: error.message });
			return;
		}

		if (!req.file) {
			res.status(400).json({ error: "No file uploaded." });
			return;
		}

		res.json({ url: `/uploads/${req.file.filename}` });
	});
});

app.get("/staff", async (req, res, next) => {
	try {
		const [advisors, officers] = await Promise.all([
			getStaffBySection("Advisors"),
			getStaffBySection("Officers")
		]);
		res.render("staff", { advisors, officers });
	} catch (error) {
		next(error);
	}
});

app.get("/competitions", (req, res) => {
	res.render("competitions");
});

app.get("/contact", (req, res) => {
	res.render("contact");
});

app.get("/donate", (req, res) => {
	res.render("donate");
});

app.get("/sponsor", (req, res) => {
	res.render("sponsor");
});

app.get("/news", (req, res) => {
	const formatNewsDate = (value) => {
		const parsed = new Date(value);
		if (Number.isNaN(parsed.getTime())) {
			return "";
		}
		return parsed.toLocaleDateString("en-US", {
			year: "numeric",
			month: "long",
			day: "numeric"
		});
	};

	const formatEventDisplay = (startDate, endDate) => {
		const start = new Date(startDate);
		const end = endDate ? new Date(endDate) : null;
		if (Number.isNaN(start.getTime())) {
			return {
				isMultiDay: false,
				displayMonth: "",
				displayDay: "",
				displayRange: ""
			};
		}
		const month = start.toLocaleString("en-US", { month: "short" });
		const day = start.getDate();
		if (end && !Number.isNaN(end.getTime()) && end.getTime() !== start.getTime()) {
			const endMonth = end.toLocaleString("en-US", { month: "short" });
			const endDay = end.getDate();
			return {
				isMultiDay: true,
				displayMonth: month,
				displayDay: "",
				displayRange: endMonth === month ? `${day}-${endDay}` : `${day}-${endMonth} ${endDay}`
			};
		}
		return {
			isMultiDay: false,
			displayMonth: month,
			displayDay: String(day),
			displayRange: ""
		};
	};

	Promise.all([getNewsItems(), getEventItems()])
		.then(([newsItems, eventItems]) => {
			const featuredNews = newsItems.filter((item) => item.is_featured);
			const regularNews = newsItems.filter((item) => !item.is_featured);
			const decoratedNews = (items) =>
				items.map((item) => ({
					...item,
					displayDate: formatNewsDate(item.date)
				}));
			const decoratedEvents = eventItems.map((item) => ({
				...item,
				startDate: item.start_date,
				endDate: item.end_date,
				...formatEventDisplay(item.start_date, item.end_date)
			}));
			res.render("news", {
				featuredNews: decoratedNews(featuredNews),
				regularNews: decoratedNews(regularNews),
				eventItems: decoratedEvents
			});
		})
		.catch((error) => {
			res.status(500).send("Failed to load news.");
			console.error(error);
		});
});

const ensureAdmin = (req, res) => {
	if (!req.session.isAdmin) {
		res.status(403).json({ error: "Unauthorized" });
		return false;
	}
	return true;
};

app.post("/api/news", async (req, res) => {
	if (!ensureAdmin(req, res)) {
		return;
	}
	try {
		const title = (req.body.title || "").trim();
		const info = (req.body.info || "").trim();
		const date = (req.body.date || "").trim();
		const imageUrl = (req.body.imageUrl || "").trim();
		const category = (req.body.category || "Announcements").trim();
		if (!title || !info || !date) {
			res.status(400).json({ error: "Title, info, and date are required." });
			return;
		}
		const id = await createNewsItem({
			title,
			info,
			imageUrl,
			date,
			category,
			isFeatured: false
		});
		res.status(201).json({ id });
	} catch (error) {
		res.status(500).json({ error: "Failed to create news." });
	}
});

app.put("/api/news/:id", async (req, res) => {
	if (!ensureAdmin(req, res)) {
		return;
	}
	try {
		const id = Number(req.params.id);
		const title = (req.body.title || "").trim();
		const info = (req.body.info || "").trim();
		const date = (req.body.date || "").trim();
		const imageUrl = (req.body.imageUrl || "").trim();
		const category = (req.body.category || "Announcements").trim();
		if (!id || !title || !info || !date) {
			res.status(400).json({ error: "Title, info, and date are required." });
			return;
		}
		await updateNewsItem(id, { title, info, imageUrl, date, category });
		res.json({ ok: true });
	} catch (error) {
		res.status(500).json({ error: "Failed to update news." });
	}
});

app.delete("/api/news/:id", async (req, res) => {
	if (!ensureAdmin(req, res)) {
		return;
	}
	try {
		const id = Number(req.params.id);
		if (!id) {
			res.status(400).json({ error: "Invalid id." });
			return;
		}
		await deleteNewsItem(id);
		res.json({ ok: true });
	} catch (error) {
		res.status(500).json({ error: "Failed to delete news." });
	}
});

app.post("/api/events", async (req, res) => {
	if (!ensureAdmin(req, res)) {
		return;
	}
	try {
		const title = (req.body.title || "").trim();
		const info = (req.body.info || "").trim();
		const location = (req.body.location || "").trim();
		const startDate = (req.body.startDate || "").trim();
		const endDate = (req.body.endDate || "").trim() || null;
		const duration = (req.body.duration || "").trim() || null;
		if (!title || !info || !startDate) {
			res.status(400).json({ error: "Title, info, and start date are required." });
			return;
		}
		const id = await createEventItem({
			title,
			info,
			location,
			startDate,
			endDate,
			duration
		});
		res.status(201).json({ id });
	} catch (error) {
		res.status(500).json({ error: "Failed to create event." });
	}
});

app.put("/api/events/:id", async (req, res) => {
	if (!ensureAdmin(req, res)) {
		return;
	}
	try {
		const id = Number(req.params.id);
		const title = (req.body.title || "").trim();
		const info = (req.body.info || "").trim();
		const location = (req.body.location || "").trim();
		const startDate = (req.body.startDate || "").trim();
		const endDate = (req.body.endDate || "").trim() || null;
		const duration = (req.body.duration || "").trim() || null;
		if (!id || !title || !info || !startDate) {
			res.status(400).json({ error: "Title, info, and start date are required." });
			return;
		}
		await updateEventItem(id, { title, info, location, startDate, endDate, duration });
		res.json({ ok: true });
	} catch (error) {
		res.status(500).json({ error: "Failed to update event." });
	}
});

app.delete("/api/events/:id", async (req, res) => {
	if (!ensureAdmin(req, res)) {
		return;
	}
	try {
		const id = Number(req.params.id);
		if (!id) {
			res.status(400).json({ error: "Invalid id." });
			return;
		}
		await deleteEventItem(id);
		res.json({ ok: true });
	} catch (error) {
		res.status(500).json({ error: "Failed to delete event." });
	}
});

app.get("/photos", (req, res) => {
	res.render("photos");
});

const startServer = async () => {
	await initializeDatabase();
	app.listen(PORT, HOST, () => {
		const publicUrl = `http://${PUBLIC_HOST}:${PORT}`;
		console.log(`Server running at ${publicUrl}`);
	});
};

startServer().catch((error) => {
	console.error("Failed to start server:", error);
	process.exit(1);
});
>>>>>>> parent of 4d5fa78 (ok)
