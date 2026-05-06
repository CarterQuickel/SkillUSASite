const path = require("path");
const express = require("express");
const { initializeDatabase, getStaffBySection } = require("./db");

const app = express();
const PORT = process.env.PORT || 3000;

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

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
