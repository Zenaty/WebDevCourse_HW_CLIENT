// =====================
// Helpers
// =====================
function getSessionUser() {
  return JSON.parse(sessionStorage.getItem("currentUser"));
}

function getUsers() {
  return JSON.parse(localStorage.getItem("users")) || [];
}

function saveUsers(users) {
  localStorage.setItem("users", JSON.stringify(users));
}

function getFullUser(sessionUser) {
  return getUsers().find((u) => u.id === sessionUser.id);
}

function isVideoInAnyPlaylist(user, videoId) {
  user.playlists ??= [];
  return user.playlists.some((p) =>
    (p.videos || []).some((v) => v.videoId === videoId)
  );
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function isoDurationToHMS(iso) {
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return "00:00";
  const h = +m[1] || 0;
  const min = +m[2] || 0;
  const s = +m[3] || 0;
  const pad = (x) => String(x).padStart(2, "0");
  return h ? `${h}:${pad(min)}:${pad(s)}` : `${pad(min)}:${pad(s)}`;
}

function formatViews(n) {
  return Number(n || 0).toLocaleString();
}

// =====================
// Guard
// =====================
const sessionUser = getSessionUser();
if (!sessionUser) {
  window.location.replace("index.html");
}

// =====================
// Header
// =====================
document.getElementById(
  "welcomeMsg"
).innerText = `שלום ${sessionUser.username}`;
document.getElementById("userImg").src = sessionUser.imageUrl;

document.getElementById("logoutBtn").onclick = () => {
  sessionStorage.removeItem("currentUser");
  window.location.replace("index.html");
};

// =====================
// DOM
// =====================
const searchInput = document.getElementById("searchInput");
const searchBtn = document.getElementById("searchBtn");
const resultsDiv = document.getElementById("results");

const videoModalEl = document.getElementById("videoModal");
const videoModal = new bootstrap.Modal(videoModalEl);
const videoPlayer = document.getElementById("videoPlayer");
const videoTitle = document.getElementById("videoTitle");

const playlistModalEl = document.getElementById("playlistModal");
const playlistModal = new bootstrap.Modal(playlistModalEl);
const playlistSelect = document.getElementById("playlistSelect");
const newPlaylistName = document.getElementById("newPlaylistName");
const saveToPlaylistBtn = document.getElementById("saveToPlaylistBtn");

const favToast = new bootstrap.Toast(document.getElementById("favToast"));

// =====================
// YouTube
// =====================
const API_KEY = "AIzaSyBEQ4678To2KttgMLu-WqBnJqVqpE9syiE";
const MAX_RESULTS = 6;

// =====================
// QueryString sync
// =====================
const params = new URLSearchParams(window.location.search);
const initialQ = params.get("q");

if (initialQ) {
  searchInput.value = initialQ;
  searchYouTube(initialQ);
}

searchBtn.onclick = triggerSearch;
searchInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    triggerSearch();
  }
});

function triggerSearch() {
  const q = searchInput.value.trim();
  if (!q) return;

  const url = new URL(window.location.href);
  url.searchParams.set("q", q);
  history.pushState({}, "", url);

  searchYouTube(q);
}

window.addEventListener("popstate", () => {
  const q = new URLSearchParams(window.location.search).get("q");
  searchInput.value = q || "";
  if (q) searchYouTube(q);
  else resultsDiv.innerHTML = "";
});

// =====================
// Search flow
// =====================
async function searchYouTube(query) {
  resultsDiv.innerHTML = "";

  const searchUrl =
    `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video` +
    `&maxResults=${MAX_RESULTS}&q=${encodeURIComponent(query)}&key=${API_KEY}`;

  const searchData = await fetch(searchUrl).then((r) => r.json());
  const items = (searchData.items || []).filter((i) => i.id?.videoId);

  if (!items.length) {
    resultsDiv.innerHTML = `<div class="text-muted">אין תוצאות</div>`;
    return;
  }

  const ids = items.map((i) => i.id.videoId).join(",");
  const videosUrl =
    `https://www.googleapis.com/youtube/v3/videos?part=contentDetails,statistics` +
    `&id=${ids}&key=${API_KEY}`;

  const videosData = await fetch(videosUrl).then((r) => r.json());
  const byId = new Map((videosData.items || []).map((v) => [v.id, v]));

  items.forEach((item) => {
    const videoId = item.id.videoId;
    const title = item.snippet.title;
    const thumb = item.snippet.thumbnails.medium.url;
    const extra = byId.get(videoId);

    renderCard({
      videoId,
      title,
      thumb,
      duration: isoDurationToHMS(extra?.contentDetails?.duration),
      views: formatViews(extra?.statistics?.viewCount),
    });
  });

  initTooltips();
}

// =====================
// Render card
// =====================
let selectedVideo = null;
let selectedCard = null;

function renderCard(video) {
  const fullUser = getFullUser(sessionUser);
  fullUser.playlists ??= [];

  const alreadySaved = isVideoInAnyPlaylist(fullUser, video.videoId);

  const col = document.createElement("div");
  col.className = "col-md-4";

  col.innerHTML = `
    <div class="card h-100 shadow-sm position-relative">
      ${
        alreadySaved
          ? `<span class="badge bg-success position-absolute top-0 end-0 m-2">✓</span>`
          : ""
      }

      <img src="${
        video.thumb
      }" class="card-img-top video-thumb" style="cursor:pointer">

      <div class="card-body d-flex flex-column gap-2">
        <h6 class="video-title clamp-2 m-0"
            data-bs-toggle="tooltip"
            title="${escapeHtml(video.title)}"
            style="cursor:pointer">
          ${escapeHtml(video.title)}
        </h6>

        <div class="d-flex justify-content-between text-muted small">
          <span>⏱ ${video.duration}</span>
          <span>👁 ${video.views}</span>
        </div>

        <button type="button" class="btn btn-sm btn-outline-primary playBtn">
          נגן
        </button>

        <button type="button"
          class="btn btn-sm ${
            alreadySaved ? "btn-outline-secondary" : "btn-outline-success"
          } addFavBtn"
          ${alreadySaved ? "disabled" : ""}>
          ${alreadySaved ? "כבר במועדפים" : "הוסף למועדפים"}
        </button>
      </div>
    </div>
  `;

  col.querySelector(".video-thumb").onclick =
    col.querySelector(".video-title").onclick =
    col.querySelector(".playBtn").onclick =
      () => openVideo(video.videoId, video.title);

  col.querySelector(".addFavBtn").onclick = () => openPlaylistModal(video, col);

  resultsDiv.appendChild(col);
}

// =====================
// Video modal
// =====================
function openVideo(videoId, title) {
  videoPlayer.src = `https://www.youtube.com/embed/${videoId}`;
  videoTitle.innerText = title;
  videoModal.show();
}

videoModalEl.addEventListener("hidden.bs.modal", () => {
  videoPlayer.src = "";
});

// =====================
// Playlist modal
// =====================
function openPlaylistModal(video, cardEl) {
  selectedVideo = video;
  selectedCard = cardEl;

  const fullUser = getFullUser(sessionUser);
  fullUser.playlists ??= [];

  playlistSelect.innerHTML = fullUser.playlists
    .map((p) => `<option value="${p.id}">${escapeHtml(p.name)}</option>`)
    .join("");

  newPlaylistName.value = "";
  playlistModal.show();
}

saveToPlaylistBtn.addEventListener("click", (e) => {
  e.preventDefault();

  const users = getUsers();
  const idx = users.findIndex((u) => u.id === sessionUser.id);
  if (idx === -1) return;

  const user = users[idx];
  user.playlists ??= [];

  let playlist = user.playlists.find((p) => p.id === playlistSelect.value);

  const newName = newPlaylistName.value.trim();
  if (newName) {
    playlist = { id: crypto.randomUUID(), name: newName, videos: [] };
    user.playlists.push(playlist);
  }

  if (!playlist) return;

  playlist.videos ??= [];
  if (!playlist.videos.some((v) => v.videoId === selectedVideo.videoId)) {
    playlist.videos.push({
      videoId: selectedVideo.videoId,
      title: selectedVideo.title,
      thumb: selectedVideo.thumb,
      rating: null,
    });
  }

  saveUsers(users);

  document.querySelector(
    "#favToast a"
  ).href = `playlists.html?playlistId=${playlist.id}`;

  favToast.show();
  playlistModal.hide();

  markCardAsSaved(selectedCard);
});

// =====================
// UI update only
// =====================
function markCardAsSaved(card) {
  const btn = card.querySelector(".addFavBtn");

  btn.textContent = "כבר במועדפים";
  btn.classList.remove("btn-outline-success");
  btn.classList.add("btn-outline-secondary");
  btn.disabled = true;

  if (!card.querySelector(".badge")) {
    const badge = document.createElement("span");
    badge.className = "badge bg-success position-absolute top-0 end-0 m-2";
    badge.innerText = "✓";
    card.querySelector(".card").appendChild(badge);
  }
}

// =====================
// Tooltips
// =====================
function initTooltips() {
  document
    .querySelectorAll('[data-bs-toggle="tooltip"]')
    .forEach((el) => new bootstrap.Tooltip(el));
}
