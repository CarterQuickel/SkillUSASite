const path = require("path");
const express = require("express");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.static(path.join(__dirname, "public")));
app.use(express.static(path.join(__dirname, "SkillsUSARealImages")));

app.get("/api/images", (req, res) => {
  const folder = req.query.folder;

  const dirPath = path.join(__dirname, "public", folder);

  fs.readdir(dirPath, (err, files) => {
    if (err) return res.json([]);

    const images = files
      .filter(f => f.endsWith(".jpg") || f.endsWith(".png"))
      .map(f => `/${folder}/${f}`);

    res.json(images);
  });
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

app.get("/staff", (req, res) => {
	res.render("staff");
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

app.listen(PORT, () => {
	console.log(`Server running at http://localhost:${PORT}`);
});
