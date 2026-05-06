const path = require("path");
const express = require("express");
const session = require("express-session");
const { initializeDatabase, getStaffBySection, verifyAdminCredentials } = require("./db");

const app = express();
const PORT = process.env.PORT || 3000;

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.urlencoded({ extended: false }));
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
	res.render("news");
});

app.get("/photos", (req, res) => {
	res.render("photos");
});

const startServer = async () => {
	await initializeDatabase();
	app.listen(PORT, () => {
		console.log(`Server running at http://localhost:${PORT}`);
	});
};

startServer().catch((error) => {
	console.error("Failed to start server:", error);
	process.exit(1);
});
