// =====================
// Guard
// =====================
const sessionUser = JSON.parse(sessionStorage.getItem("currentUser"));
if (!sessionUser) window.location.replace("index.html");

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
// Storage helpers
// =====================
function getUsers() {
  return JSON.parse(localStorage.getItem("users")) || [];
}
function saveUsers(users) {
  localStorage.setItem("users", JSON.stringify(users));
}
function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// =====================
// Load user
// =====================
const users = getUsers();
const userIndex = users.findIndex((u) => u.id === sessionUser.id);
if (userIndex === -1) window.location.replace("index.html");

const user = users[userIndex];
user.playlists ??= [];

// =====================
// State
// =====================
let playlists = user.playlists;
let activePlaylist = null;
let playIndex = 0;
let ytPlayer = null;

// =====================
// DOM
// =====================
const playlistList = document.getElementById("playlistList");
const playlistTitle = document.getElementById("playlistTitle");
const videosDiv = document.getElementById("videos");
const emptyMsg = document.getElementById("emptyMsg");
const controls = document.getElementById("controls");
const searchInPlaylist = document.getElementById("searchInPlaylist");
const playPlaylistBtn = document.getElementById("playPlaylistBtn");
const playerContainer = document.getElementById("playerContainer");

// =====================
// Init
// =====================
init();

function init() {
  const params = new URLSearchParams(window.location.search);
  let playlistId = params.get("playlistId");

  if (!playlistId && playlists.length > 0) {
    playlistId = playlists[0].id;
  }

  activePlaylist = playlists.find((p) => p.id === playlistId) || null;

  renderSidebar();
  renderVideos();
}

// =====================
// Sidebar
// =====================
function renderSidebar() {
  playlistList.innerHTML = "";

  playlists.forEach((p) => {
    const li = document.createElement("li");
    li.className = "list-group-item list-group-item-action";
    if (p.id === activePlaylist?.id) li.classList.add("active");

    li.innerText = p.name;
    li.onclick = () =>
      (window.location.href = `playlists.html?playlistId=${p.id}`);

    playlistList.appendChild(li);
  });
}

// =====================
// Videos
// =====================
function renderVideos(list = activePlaylist?.videos) {
  videosDiv.innerHTML = "";

  if (!activePlaylist) {
    emptyMsg.classList.remove("d-none");
    controls.classList.add("d-none");
    playlistTitle.innerText = "";
    playerContainer.classList.add("d-none");
    return;
  }

  activePlaylist.videos ??= [];

  emptyMsg.classList.add("d-none");
  controls.classList.remove("d-none");
  playlistTitle.innerText = activePlaylist.name;

  (list || []).forEach((v, index) => {
    const col = document.createElement("div");
    col.className = "col-md-4";

    col.innerHTML = `
      <div class="card h-100">
        <img
          src="${v.thumb}"
          class="card-img-top video-thumb"
          style="cursor:pointer"
          data-index="${index}"
        />
        <div class="card-body">
          <h6>${escapeHtml(v.title)}</h6>

          <button
            class="btn btn-success btn-sm w-100 playVideoBtn mb-2"
            data-index="${index}"
          >
            ▶ נגן
          </button>

          <select class="form-select rating mb-2" data-index="${index}">
            <option value="">Rating</option>
            ${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
              .map(
                (r) =>
                  `<option value="${r}" ${
                    v.rating == r ? "selected" : ""
                  }>${r}</option>`
              )
              .join("")}
          </select>

          <button
            class="btn btn-danger btn-sm w-100 deleteVideo"
            data-index="${index}"
          >
            Remove
          </button>
        </div>
      </div>
    `;

    videosDiv.appendChild(col);
  });
}

// =====================
// Events
// =====================
videosDiv.onclick = (e) => {
  // ▶ ניגון (תמונה או כפתור)
  if (
    e.target.classList.contains("video-thumb") ||
    e.target.classList.contains("playVideoBtn")
  ) {
    playIndex = Number(e.target.dataset.index);
    playerContainer.classList.remove("d-none");
    playCurrent();
    return;
  }

  // מחיקה
  if (e.target.classList.contains("deleteVideo")) {
    const index = Number(e.target.dataset.index);
    activePlaylist.videos.splice(index, 1);
    saveAll();
    renderVideos();
  }
};

// דירוג
videosDiv.onchange = (e) => {
  if (!e.target.classList.contains("rating")) return;

  const index = Number(e.target.dataset.index);
  activePlaylist.videos[index].rating = Number(e.target.value);
  saveAll();
};

// חיפוש בפלייליסט
searchInPlaylist.oninput = (e) => {
  const q = e.target.value.toLowerCase();
  renderVideos(
    activePlaylist.videos.filter((v) => v.title.toLowerCase().includes(q))
  );
};

// מיון
document.getElementById("sortAZ").onclick = () => {
  activePlaylist.videos.sort((a, b) => a.title.localeCompare(b.title));
  saveAll();
  renderVideos();
};

document.getElementById("sortRating").onclick = () => {
  activePlaylist.videos.sort((a, b) => (b.rating || 0) - (a.rating || 0));
  saveAll();
  renderVideos();
};

// מחיקת פלייליסט
document.getElementById("deletePlaylist").onclick = () => {
  if (!confirm("Delete playlist?")) return;

  user.playlists = user.playlists.filter((p) => p.id !== activePlaylist.id);
  playlists = user.playlists;
  saveAll();
  window.location.href = "playlists.html";
};

// =====================
// Create playlist
// =====================
const modal = new bootstrap.Modal(document.getElementById("newPlaylistModal"));

document.getElementById("newPlaylistBtn").onclick = () => modal.show();

document.getElementById("createPlaylistBtn").onclick = () => {
  const name = document.getElementById("newPlaylistName").value.trim();
  if (!name) return;

  const newPlaylist = { id: crypto.randomUUID(), name, videos: [] };
  user.playlists.push(newPlaylist);

  saveAll();
  modal.hide();
  window.location.href = `playlists.html?playlistId=${newPlaylist.id}`;
};

// =====================
// ▶ Play full playlist (AUTO)
// =====================
playPlaylistBtn.onclick = () => {
  if (!activePlaylist || activePlaylist.videos.length === 0) {
    alert("אין סרטונים בפלייליסט");
    return;
  }

  playIndex = 0;
  playerContainer.classList.remove("d-none");
  playCurrent();
};

// =====================
// YouTube IFrame API
// =====================
function onYouTubeIframeAPIReady() {
  ytPlayer = new YT.Player("playlistPlayer", {
    height: "360",
    width: "100%",
    playerVars: { autoplay: 1 },
    events: {
      onStateChange: onPlayerStateChange,
    },
  });
}

function onPlayerStateChange(event) {
  if (event.data === YT.PlayerState.ENDED) {
    playIndex++;
    if (playIndex < activePlaylist.videos.length) {
      playCurrent();
    } else {
      playerContainer.classList.add("d-none");
      playIndex = 0;
    }
  }
}

function playCurrent() {
  const v = activePlaylist.videos[playIndex];
  if (!v || !v.videoId || !ytPlayer) return;

  ytPlayer.loadVideoById(v.videoId);
}

// =====================
// Save
// =====================
function saveAll() {
  users[userIndex] = user;
  saveUsers(users);
}
