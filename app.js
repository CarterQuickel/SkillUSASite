const express = require("express");
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

});