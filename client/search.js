function getCurrentUser() {
  const u = sessionStorage.getItem("currentUser");
  if (!u) window.location.replace("index.html");
  return JSON.parse(u);
}

// ===== Guard + Header =====
const currentUser = getCurrentUser();

document.getElementById(
  "welcomeMsg"
).innerText = `שלום ${currentUser.username}`;
document.getElementById("userImg").src = currentUser.imageUrl;

document.getElementById("logoutBtn").onclick = () => {
  sessionStorage.removeItem("currentUser");
  window.location.replace("index.html");
};

// ===== DOM =====
const searchInput = document.getElementById("searchInput");
const searchBtn = document.getElementById("searchBtn");
const resultsDiv = document.getElementById("results");

const videoModal = new bootstrap.Modal(document.getElementById("videoModal"));
const videoPlayer = document.getElementById("videoPlayer");
const videoTitle = document.getElementById("videoTitle");

const playlistModal = new bootstrap.Modal(
  document.getElementById("playlistModal")
);
const playlistSelect = document.getElementById("playlistSelect");
const newPlaylistName = document.getElementById("newPlaylistName");
const saveToPlaylistBtn = document.getElementById("saveToPlaylistBtn");

const favToast = new bootstrap.Toast(document.getElementById("favToast"));

// ===== YouTube =====
import { API_KEY } from "./apiKey.js";
const MAX_RESULTS = 6;

// ===== State =====
let selectedVideo = null;

// ===== Helpers =====
function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function isoDurationToHMS(iso) {
  const m = iso?.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
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

// ===== API =====
async function loadPlaylists() {
  const res = await fetch(`/api/playlists/${currentUser.id}`);
  return await res.json();
}

// ===== Events =====
searchBtn.onclick = triggerSearch;
searchInput.onkeydown = (e) => {
  if (e.key === "Enter") triggerSearch();
};

function triggerSearch() {
  const q = searchInput.value.trim();
  if (!q) return;
  searchYouTube(q);
}

// ===== UI Update After Add =====
function updateUIAfterAdd(videoId) {
  const col = document.querySelector(`.col-md-4[data-video-id="${videoId}"]`);
  if (!col) return;

  // Badge ✓
  if (!col.querySelector(".badge")) {
    const badge = document.createElement("span");
    badge.className = "badge bg-success position-absolute top-0 end-0 m-2";
    badge.innerText = "✓";
    col.querySelector(".card").appendChild(badge);
  }

  // Disable add button
  const addBtn = col.querySelector(".addBtn");
  if (addBtn) {
    addBtn.disabled = true;
    addBtn.classList.remove("btn-outline-success");
    addBtn.classList.add("btn-outline-secondary");
    addBtn.innerText = "כבר במועדפים";
  }
}

// ===== Search =====
async function searchYouTube(query) {
  resultsDiv.innerHTML = "";

  const playlists = await loadPlaylists();

  const searchUrl =
    `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video` +
    `&maxResults=${MAX_RESULTS}&q=${encodeURIComponent(query)}&key=${API_KEY}`;

  const searchData = await fetch(searchUrl).then((r) => r.json());
  const items = (searchData.items || []).filter((i) => i.id?.videoId);

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

    const alreadySaved = playlists.some((p) =>
      p.videos.some((v) => v.videoId === videoId)
    );

    const col = document.createElement("div");
    col.className = "col-md-4";
    col.dataset.videoId = videoId;

    col.innerHTML = `
      <div class="card h-100 position-relative">
        ${
          alreadySaved
            ? `<span class="badge bg-success position-absolute top-0 end-0 m-2">✓</span>`
            : ""
        }
        <img src="${thumb}" class="card-img-top" style="cursor:pointer">
        <div class="card-body">
          <h6 class="clamp-2" title="${escapeHtml(title)}">
            ${escapeHtml(title)}
          </h6>
          <div class="small text-muted">
            ⏱ ${isoDurationToHMS(extra?.contentDetails?.duration)} |
            👁 ${formatViews(extra?.statistics?.viewCount)}
          </div>
          <button class="btn btn-sm btn-outline-primary mt-2 playBtn">
            נגן
          </button>
          <button
            class="btn btn-sm ${
              alreadySaved ? "btn-outline-secondary" : "btn-outline-success"
            } addBtn mt-1"
            ${alreadySaved ? "disabled" : ""}
          >
            ${alreadySaved ? "כבר במועדפים" : "הוסף למועדפים"}
          </button>
        </div>
      </div>
    `;

    // Play
    col.querySelector(".playBtn").onclick = () => {
      videoPlayer.src = `https://www.youtube.com/embed/${videoId}`;
      videoTitle.innerText = title;
      videoModal.show();
    };

    // Add to playlist
    col.querySelector(".addBtn").onclick = async () => {
      selectedVideo = { videoId, title, thumb };

      const pls = await loadPlaylists();
      playlistSelect.innerHTML = pls
        .map((p) => `<option value="${p.id}">${escapeHtml(p.name)}</option>`)
        .join("");

      newPlaylistName.value = "";
      playlistModal.show();
    };

    resultsDiv.appendChild(col);
  });
}

// ===== Save to Playlist =====
saveToPlaylistBtn.onclick = async (e) => {
  e.preventDefault();
  e.stopPropagation();

  let pid = playlistSelect.value;

  if (newPlaylistName.value.trim()) {
    const res = await fetch(`/api/playlists/${currentUser.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newPlaylistName.value.trim() }),
    });
    const pl = await res.json();
    pid = pl.id;
  }

  if (!pid || !selectedVideo) return;

  await fetch(`/api/playlists/${currentUser.id}/${pid}/video`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...selectedVideo,
      rating: null,
    }),
  });

  document.querySelector(
    "#favToast a"
  ).href = `playlists.html?playlistId=${pid}`;

  updateUIAfterAdd(selectedVideo.videoId);

  favToast.show();
  playlistModal.hide();
};
