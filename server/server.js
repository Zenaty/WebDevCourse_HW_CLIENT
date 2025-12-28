const express = require("express");
const path = require("path");

const authRoutes = require("./routes/auth.routes");
const playlistsRoutes = require("./routes/playlists.routes");

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// client static
app.use(express.static(path.join(__dirname, "../client")));

// mp3 files
app.use("/uploads", express.static(path.join(__dirname, "data/uploads")));

// api
app.use("/api/auth", authRoutes);
app.use("/api/playlists", playlistsRoutes);

app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});
