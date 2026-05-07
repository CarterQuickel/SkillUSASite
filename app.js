const path = require("path");
const fs = require("fs");
const express = require("express");
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
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || "0.0.0.0";
const PUBLIC_HOST = process.env.PUBLIC_HOST || "172.16.3.200";
const uploadsDir = path.join(__dirname, "public", "uploads");

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(
	session({
		name: "skillusa.admin",
		secret: process.env.SESSION_SECRET || "dev-only-change-this",
		resave: false,
		saveUninitialized: false,
			rolling: true,
		cookie: {
			httpOnly: true,
			sameSite: "lax",
				maxAge: 10 * 60 * 1000
		}
	})
);
app.use((req, res, next) => {
	res.locals.isAdmin = Boolean(req.session.isAdmin);
	next();
});
app.use(express.static(path.join(__dirname, "public")));
app.use(express.static(path.join(__dirname, "SkillsUSARealImages")));

if (!fs.existsSync(uploadsDir)) {
	fs.mkdirSync(uploadsDir, { recursive: true });
}

const upload = multer({
	storage: multer.diskStorage({
		destination: uploadsDir,
		filename: (req, file, cb) => {
			const timestamp = Date.now();
			const random = Math.round(Math.random() * 1e9);
			const ext = path.extname(file.originalname).toLowerCase();
			cb(null, `news-${timestamp}-${random}${ext}`);
		}
	}),
	limits: { fileSize: 50 * 1024 * 1024 },
	fileFilter: (req, file, cb) => {
		const allowed = [".png", ".jpg", ".jpeg"];
		const ext = path.extname(file.originalname).toLowerCase();
		if (!allowed.includes(ext)) {
			cb(new Error("Only PNG and JPG images are allowed."));
			return;
		}
		cb(null, true);
	}
});

app.get("/", (req, res) => {
	res.render("index");
});

app.get("/bars", (req, res) => {
    res.render("bars");
});

app.get("/about", (req, res) => {
	res.render("about");
});

app.get("/admin/login", (req, res) => {
	if (req.session.isAdmin) {
		res.redirect("/admin");
		return;
	}

	res.render("admin-login", { error: null, message: null, username: "" });
});

app.post("/admin/login", async (req, res, next) => {
	try {
		const username = (req.body.username || "").trim();
		const password = req.body.password || "";
		const isValid = await verifyAdminCredentials(username, password);
		if (!isValid) {
			res.status(401).render("admin-login", {
				error: "Invalid username or password.",
				message: null,
				username
			});
			return;
		}

		req.session.isAdmin = true;
		req.session.adminUsername = username;
		res.redirect("/");
	} catch (error) {
		next(error);
	}
});

app.get("/admin", (req, res) => {
	if (!req.session.isAdmin) {
		res.redirect("/admin/login");
		return;
	}

	res.render("admin-dashboard", { username: req.session.adminUsername || "admin" });
});

app.post("/admin/logout", (req, res, next) => {
	req.session.destroy((error) => {
		if (error) {
			next(error);
			return;
		}
		res.clearCookie("skillusa.admin");
		res.redirect("/admin/login");
	});
});

app.post("/admin/upload", (req, res) => {
	if (!req.session.isAdmin) {
		res.status(403).json({ error: "Unauthorized" });
		return;
	}

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
