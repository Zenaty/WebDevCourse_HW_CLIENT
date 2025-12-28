const express = require("express");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const multer = require("multer");

const router = express.Router();
const USERS_FILE = path.join(__dirname, "../data/users.json");

const upload = multer({
  dest: path.join(__dirname, "../data/uploads"),
});

function loadUsers() {
  return JSON.parse(fs.readFileSync(USERS_FILE, "utf8"));
}

function saveUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

// GET playlists
router.get("/:userId", (req, res) => {
  const user = loadUsers().find((u) => u.id === req.params.userId);
  if (!user) return res.sendStatus(404);
  res.json(user.playlists);
});

// CREATE playlist
router.post("/:userId", (req, res) => {
  const users = loadUsers();
  const user = users.find((u) => u.id === req.params.userId);

  const playlist = {
    id: crypto.randomUUID(),
    name: req.body.name,
    videos: [],
  };

  user.playlists.push(playlist);
  saveUsers(users);
  res.json(playlist);
});

// DELETE playlist
router.delete("/:userId/:playlistId", (req, res) => {
  const users = loadUsers();
  const user = users.find((u) => u.id === req.params.userId);

  user.playlists = user.playlists.filter((p) => p.id !== req.params.playlistId);

  saveUsers(users);
  res.sendStatus(200);
});

// ADD youtube video
router.post("/:userId/:playlistId/video", (req, res) => {
  const users = loadUsers();
  const user = users.find((u) => u.id === req.params.userId);
  const playlist = user.playlists.find((p) => p.id === req.params.playlistId);

  playlist.videos.push(req.body);
  saveUsers(users);
  res.sendStatus(200);
});

// UPDATE rating
router.put("/:userId/:playlistId/video/:index", (req, res) => {
  const users = loadUsers();
  const user = users.find((u) => u.id === req.params.userId);

  user.playlists.find((p) => p.id === req.params.playlistId).videos[
    req.params.index
  ].rating = req.body.rating;

  saveUsers(users);
  res.sendStatus(200);
});

// DELETE video
router.delete("/:userId/:playlistId/video/:index", (req, res) => {
  const users = loadUsers();
  const user = users.find((u) => u.id === req.params.userId);

  user.playlists
    .find((p) => p.id === req.params.playlistId)
    .videos.splice(req.params.index, 1);

  saveUsers(users);
  res.sendStatus(200);
});

// UPLOAD MP3
router.post("/:userId/:playlistId/mp3", upload.single("file"), (req, res) => {
  const users = loadUsers();
  const user = users.find((u) => u.id === req.params.userId);
  const playlist = user.playlists.find((p) => p.id === req.params.playlistId);

  playlist.videos.push({
    title: req.file.originalname,
    type: "mp3",
    filePath: `/uploads/${req.file.filename}`,
  });

  saveUsers(users);
  res.sendStatus(200);
});

module.exports = router;
