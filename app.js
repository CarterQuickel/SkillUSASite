const path = require("path");
const fs = require("fs");
const http = require("http");
const express = require("express");
const session = require("express-session");
const multer = require("multer");
const { Server } = require("socket.io");
const {
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
} = require("./db");

require("dotenv").config();

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = process.env.PORT || 3000;
const PUBLIC_HOST = process.env.PUBLIC_HOST || process.env.HOST || "172.16.3.115";
const HOST = process.env.HOST || PUBLIC_HOST || "0.0.0.0";
const uploadsDir = path.join(__dirname, "public", "uploads");
const albumsDir = path.join(__dirname, "public", "albums");

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
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

let nodemailer = require("nodemailer");

// Configure the SMTP transport
const smtpConfig = {
	service: "dreamhost",
	host: "smtp.dreamhost.com",
	port: 465,
	secure: true,
	auth: {
		user: process.env.EMAIL_USER,
		pass: process.env.EMAIL_PASSWORD,
	},
};

const transporter = nodemailer.createTransport(smtpConfig);

app.get("/api/images", (req, res) => {
	const rawFolder = String(req.query.folder || "");
	const normalized = path.normalize(rawFolder).replace(/^([.][.][\\/])+/, "");
	const albumsRoot = path.join(__dirname, "public", "albums");
	const dirPath = path.resolve(__dirname, "public", normalized);

	if (!normalized.startsWith("albums")) {
		res.json([]);
		return;
	}
	if (!dirPath.startsWith(albumsRoot + path.sep) && dirPath !== albumsRoot) {
		res.json([]);
		return;
	}

	fs.readdir(dirPath, (err, files) => {
		if (err) return res.json([]);

		const images = files
			.filter((file) => file.endsWith(".jpg") || file.endsWith(".png") || file.endsWith(".jpeg"))
			.map((file) => `/${normalized}/${file}`);

		res.json(images);
	});
});

if (!fs.existsSync(uploadsDir)) {
	fs.mkdirSync(uploadsDir, { recursive: true });
}
if (!fs.existsSync(albumsDir)) {
	fs.mkdirSync(albumsDir, { recursive: true });
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

const sponsorUpload = multer({
	storage: multer.diskStorage({
		destination: uploadsDir,
		filename: (req, file, cb) => {
			const timestamp = Date.now();
			const random = Math.round(Math.random() * 1e9);
			const ext = path.extname(file.originalname).toLowerCase();
			cb(null, `sponsor-${timestamp}-${random}${ext}`);
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

const albumUpload = multer({
	storage: multer.diskStorage({
		destination: (req, file, cb) => {
			const folder = req.album?.folder;
			if (!folder) {
				cb(new Error("Album folder missing."));
				return;
			}
			const dir = path.join(albumsDir, folder);
			fs.mkdirSync(dir, { recursive: true });
			cb(null, dir);
		},
		filename: (req, file, cb) => {
			const timestamp = Date.now();
			const random = Math.round(Math.random() * 1e9);
			const ext = path.extname(file.originalname).toLowerCase();
			cb(null, `album-${timestamp}-${random}${ext}`);
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

// Separate multer instance for sponsor form logos - uses memory storage for email attachments
const logoUpload = multer({
	storage: multer.memoryStorage(),
	limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit for logos
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

app.get("/", async (req, res, next) => {
	try {
		const sponsors = await getSponsors();
		res.render("index", { sponsors });
	} catch (error) {
		next(error);
	}
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

app.post("/admin/sponsor-upload", (req, res) => {
	if (!req.session.isAdmin) {
		res.status(403).json({ error: "Unauthorized" });
		return;
	}

	sponsorUpload.single("logo")(req, res, (error) => {
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
	const success = req.session.formSuccess || false;
	const error = req.session.formError || null;
	
	// Clear session messages after retrieving them
	req.session.formSuccess = false;
	req.session.formError = null;
	
	res.render("contact", { success, error });
});

app.get("/donate", (req, res) => {
	const success = req.session.formSuccess || false;
	const error = req.session.formError || null;
	
	// Clear session messages after retrieving them
	req.session.formSuccess = false;
	req.session.formError = null;
	
	res.render("donate", { success, error });
});

app.get("/sponsor", async (req, res, next) => {
	try {
		const success = req.session.formSuccess || false;
		const error = req.session.formError || null;
		const sponsors = await getSponsors();
		// Clear session messages after retrieving them
		req.session.formSuccess = false;
		req.session.formError = null;
		res.render("sponsor", { success, error, sponsors });
	} catch (error) {
		next(error);
	}
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

const STAFF_SECTIONS = new Set(["Advisors", "Officers"]);

const isValidAlbumFolder = (value) => /^[a-zA-Z0-9_-]+$/.test(value || "");

const loadAlbum = async (req, res, next) => {
	const id = Number(req.params.id);
	if (!id) {
		res.status(400).json({ error: "Invalid album id." });
		return;
	}
	try {
		const album = await getAlbumById(id);
		if (!album) {
			res.status(404).json({ error: "Album not found." });
			return;
		}
		req.album = album;
		next();
	} catch (error) {
		next(error);
	}
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
				const payload = { id, title, info, date, imageUrl, category, isFeatured: false };
				if (req.body && req.body.tempId) payload.tempId = req.body.tempId;
				io.emit("news-upsert", payload);
				res.status(201).json({ id, tempId: req.body?.tempId || null });
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
		io.emit("news-upsert", { id, title, info, date, imageUrl, category });
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
		io.emit("news-delete", { id });
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
				const payload = { id, title, info, location, startDate, endDate, duration };
				if (req.body && req.body.tempId) payload.tempId = req.body.tempId;
				io.emit("event-upsert", payload);
				res.status(201).json({ id, tempId: req.body?.tempId || null });
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
		io.emit("event-upsert", { id, title, info, location, startDate, endDate, duration });
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
		io.emit("event-delete", { id });
		res.json({ ok: true });
	} catch (error) {
		res.status(500).json({ error: "Failed to delete event." });
	}
});

app.post("/api/staff", async (req, res) => {
	if (!ensureAdmin(req, res)) {
		return;
	}
	try {
		const name = (req.body.name || "").trim();
		const role = (req.body.role || "").trim();
		const bio = (req.body.bio || "").trim();
		const section = (req.body.section || "").trim();
		const imageUrl = (req.body.imageUrl || "/icons/placeholder.png").trim();
		if (!name || !role || !bio || !section) {
			res.status(400).json({ error: "Name, role, bio, and section are required." });
			return;
		}
		if (!STAFF_SECTIONS.has(section)) {
			res.status(400).json({ error: "Invalid section." });
			return;
		}
		const id = await createStaffMember({
			name,
			role,
			bio,
			section,
			imagePath: imageUrl,
			sortOrder: 0
		});
		res.status(201).json({ id });
	} catch (error) {
		res.status(500).json({ error: "Failed to create staff member." });
	}
});

app.put("/api/staff/:id", async (req, res) => {
	if (!ensureAdmin(req, res)) {
		return;
	}
	try {
		const id = Number(req.params.id);
		const name = (req.body.name || "").trim();
		const role = (req.body.role || "").trim();
		const bio = (req.body.bio || "").trim();
		const section = (req.body.section || "").trim();
		const imageUrl = (req.body.imageUrl || "").trim();
		if (!id || !name || !role || !bio || !section) {
			res.status(400).json({ error: "Name, role, bio, and section are required." });
			return;
		}
		if (!STAFF_SECTIONS.has(section)) {
			res.status(400).json({ error: "Invalid section." });
			return;
		}
		await updateStaffMember(id, { name, role, bio, section, imagePath: imageUrl || "/icons/placeholder.png" });
		res.json({ ok: true });
	} catch (error) {
		res.status(500).json({ error: "Failed to update staff member." });
	}
});

app.delete("/api/staff/:id", async (req, res) => {
	if (!ensureAdmin(req, res)) {
		return;
	}
	try {
		const id = Number(req.params.id);
		if (!id) {
			res.status(400).json({ error: "Invalid id." });
			return;
		}
		await deleteStaffMember(id);
		res.json({ ok: true });
	} catch (error) {
		res.status(500).json({ error: "Failed to delete staff member." });
	}
});

app.post("/api/albums", async (req, res) => {
	if (!ensureAdmin(req, res)) {
		return;
	}
	try {
		const title = (req.body.title || "").trim();
		const description = (req.body.description || "").trim();
		const folder = (req.body.folder || "").trim();
		if (!title || !description || !folder) {
			res.status(400).json({ error: "Title, description, and folder are required." });
			return;
		}
		if (!isValidAlbumFolder(folder)) {
			res.status(400).json({ error: "Folder must use letters, numbers, hyphens, or underscores." });
			return;
		}
		const existing = await getAlbumByFolder(folder);
		if (existing) {
			res.status(400).json({ error: "Folder already exists." });
			return;
		}
		const id = await createAlbum({ title, description, folder });
		const dirPath = path.join(albumsDir, folder);
		fs.mkdirSync(dirPath, { recursive: true });
		res.status(201).json({ id });
	} catch (error) {
		res.status(500).json({ error: "Failed to create album." });
	}
});

app.put("/api/albums/:id", async (req, res) => {
	if (!ensureAdmin(req, res)) {
		return;
	}
	try {
		const id = Number(req.params.id);
		const title = (req.body.title || "").trim();
		const description = (req.body.description || "").trim();
		if (!id || !title || !description) {
			res.status(400).json({ error: "Title and description are required." });
			return;
		}
		await updateAlbum(id, { title, description });
		res.json({ ok: true });
	} catch (error) {
		res.status(500).json({ error: "Failed to update album." });
	}
});

app.delete("/api/albums/:id", loadAlbum, async (req, res) => {
	if (!ensureAdmin(req, res)) {
		return;
	}
	try {
		const folder = req.album.folder;
		await deleteAlbum(req.album.id);
		const dirPath = path.join(albumsDir, folder);
		await fs.promises.rm(dirPath, { recursive: true, force: true });
		res.json({ ok: true });
	} catch (error) {
		res.status(500).json({ error: "Failed to delete album." });
	}
});

app.post("/api/albums/:id/images", loadAlbum, (req, res) => {
	if (!ensureAdmin(req, res)) {
		return;
	}
	albumUpload.array("images", 50)(req, res, (error) => {
		if (error) {
			res.status(400).json({ error: error.message });
			return;
		}
		if (!req.files || req.files.length === 0) {
			res.status(400).json({ error: "No files uploaded." });
			return;
		}
		const images = req.files.map((file) => `/albums/${req.album.folder}/${file.filename}`);
		res.json({ images });
	});
});

app.delete("/api/albums/:id/images", loadAlbum, async (req, res) => {
	if (!ensureAdmin(req, res)) {
		return;
	}
	try {
		const filename = String(req.body.filename || "").trim();
		if (!filename || filename !== path.basename(filename)) {
			res.status(400).json({ error: "Invalid filename." });
			return;
		}
		const ext = path.extname(filename).toLowerCase();
		if (![".png", ".jpg", ".jpeg"].includes(ext)) {
			res.status(400).json({ error: "Invalid file type." });
			return;
		}
		const filePath = path.join(albumsDir, req.album.folder, filename);
		await fs.promises.unlink(filePath);
		res.json({ ok: true });
	} catch (error) {
		if (error && error.code === "ENOENT") {
			res.status(404).json({ error: "File not found." });
			return;
		}
		res.status(500).json({ error: "Failed to delete image." });
	}
});

app.post("/api/sponsors", async (req, res) => {
	if (!ensureAdmin(req, res)) {
		return;
	}
	try {
		const name = (req.body.name || "Sponsor").trim() || "Sponsor";
		const logoUrl = (req.body.logoUrl || "").trim();
		const linkUrl = (req.body.linkUrl || "").trim();
		if (!logoUrl || !linkUrl) {
			res.status(400).json({ error: "Logo and link are required." });
			return;
		}
		const id = await createSponsor({ name, logoUrl, linkUrl, sortOrder: 0 });
		res.status(201).json({ id });
	} catch (error) {
		res.status(500).json({ error: "Failed to create sponsor." });
	}
});

app.put("/api/sponsors/:id", async (req, res) => {
	if (!ensureAdmin(req, res)) {
		return;
	}
	try {
		const id = Number(req.params.id);
		const name = (req.body.name || "Sponsor").trim() || "Sponsor";
		const logoUrl = (req.body.logoUrl || "").trim();
		const linkUrl = (req.body.linkUrl || "").trim();
		if (!id || !logoUrl || !linkUrl) {
			res.status(400).json({ error: "Logo and link are required." });
			return;
		}
		await updateSponsor(id, { name, logoUrl, linkUrl, sortOrder: 0 });
		res.json({ ok: true });
	} catch (error) {
		res.status(500).json({ error: "Failed to update sponsor." });
	}
});

app.delete("/api/sponsors/:id", async (req, res) => {
	if (!ensureAdmin(req, res)) {
		return;
	}
	try {
		const id = Number(req.params.id);
		if (!id) {
			res.status(400).json({ error: "Invalid id." });
			return;
		}
		await deleteSponsor(id);
		res.json({ ok: true });
	} catch (error) {
		res.status(500).json({ error: "Failed to delete sponsor." });
	}
});

app.get("/photos", async (req, res, next) => {
	try {
		const albums = await getAlbums();
		res.render("photos", { albums });
	} catch (error) {
		next(error);
	}
});

app.post("/contact", (req, res) => {
	const { name, email, subject, message } = req.body;
	
	const mailOptions = {
		from: process.env.EMAIL_USER,
		to: process.env.EMAIL_TO,
		replyTo: email,
		subject: `New Contact Form: ${subject}`,
		text: `
Name: ${name}
Email: ${email}
Subject: ${subject}

Message:
${message}
		`,
	};

	transporter.sendMail(mailOptions, (error, info) => {
		if (error) {
			req.session.formError = "Failed to send message";
			res.redirect("/contact");
		} else {
			req.session.formSuccess = true;
			res.redirect("/contact");
			}
		}); // This line is now correctly placed
	});

	app.post("/donate", (req, res) => {
	const { name, email, message } = req.body;

	const mailOptions = {
		from: process.env.EMAIL_USER,
		to: process.env.EMAIL_TO,
		replyTo: email,
		subject: `New Donation Form from ${name}`,
		text: `
Name: ${name}
Email: ${email}

Message:
${message}
		`,
	};

	transporter.sendMail(mailOptions, (error, info) => {
		if (error) {
			req.session.formError = "Failed to send donation inquiry";
			res.redirect("/donate");
		} else {
			req.session.formSuccess = true;
			res.redirect("/donate");
		}
	});
});

app.post("/sponsor", (req, res) => {
	logoUpload.single("logo")(req, res, (error) => {
		if (error) {
			req.session.formError = error.message;
			return res.redirect("/sponsor");
		}

		// Check if file was uploaded
		if (!req.file) {
			req.session.formError = "Company logo is required";
			return res.redirect("/sponsor");
		}

		const { company, contact, email, tier, message } = req.body;
		const logoBuffer = req.file.buffer;
		const logoFilename = req.file.originalname;

		const mailOptions = {
			from: process.env.EMAIL_USER,
			to: process.env.EMAIL_TO,
			replyTo: email,
			subject: `New Sponsorship Form from ${company}`,
			text: `
Company Name: ${company}
Contact Person: ${contact}
Email: ${email}
Sponsorship Tier: ${tier}

Additional Information:
${message || "No additional information provided"}
			`,
			attachments: [
				{
					filename: logoFilename,
					content: logoBuffer
				}
			]
		};

		transporter.sendMail(mailOptions, (error, info) => {
			if (error) {
				req.session.formError = "Failed to send sponsorship request";
				res.redirect("/sponsor");
			} else {
				req.session.formSuccess = true;
				res.redirect("/sponsor");
			}
		});
	});
});

const startServer = async () => {
	await initializeDatabase();
	await new Promise((resolve, reject) => {
		server.once("error", reject);
		server.listen(PORT, HOST, () => {
			console.log(`Server listening at http://${PUBLIC_HOST}:${PORT}`);
			resolve();
		});
	});
};

startServer().catch((error) => {
	console.error("Failed to start server:", error);
	process.exit(1);
});
