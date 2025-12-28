// ===== Guard =====
const sessionUser = JSON.parse(sessionStorage.getItem("currentUser"));
if (!sessionUser) {
  window.location.href = "index.html";
}

// ===== Header =====
document.getElementById(
  "welcomeMsg"
).innerText = `Hello ${sessionUser.username}`;
document.getElementById("userImg").src = sessionUser.imageUrl;

// ===== Logout =====
document.getElementById("logoutBtn").onclick = () => {
  sessionStorage.removeItem("currentUser");
  window.location.href = "index.html";
};

// ===== YouTube Search =====
const API_KEY = "AIzaSyBEQ4678To2KttgMLu-WqBnJqVqpE9syiE";
const resultsDiv = document.getElementById("results");

document.getElementById("searchBtn").onclick = () => {
  const q = searchInput.value.trim();
  if (q) searchYouTube(q);
};

async function searchYouTube(query) {
  resultsDiv.innerHTML = "";

  const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=6&q=${encodeURIComponent(
    query
  )}&key=${API_KEY}`;

  const data = await fetch(url).then((r) => r.json());
  data.items.forEach(renderCard);
}

// ===== Render Card =====
function renderCard(item) {
  const videoId = item.id.videoId;
  const title = item.snippet.title;
  const thumb = item.snippet.thumbnails.medium.url;

  const col = document.createElement("div");
  col.className = "col-md-4";

  col.innerHTML = `
    <div class="card h-100 shadow-sm">
      <img src="${thumb}" class="card-img-top video-thumb" style="cursor:pointer">
      <div class="card-body">
        <h6 class="video-title" style="cursor:pointer">${title}</h6>
        <button class="btn btn-sm btn-outline-primary w-100 addFavBtn">
          Add to favorites
        </button>
      </div>
    </div>
  `;

  col.querySelector(".video-thumb").onclick = col.querySelector(
    ".video-title"
  ).onclick = () => openVideo(videoId, title);

  col.querySelector(".addFavBtn").onclick = () =>
    openPlaylistModal({ videoId, title, thumb });

  resultsDiv.appendChild(col);
}

// ===== Video Modal =====
function openVideo(videoId, title) {
  videoPlayer.src = `https://www.youtube.com/embed/${videoId}`;
  videoTitle.innerText = title;
  new bootstrap.Modal(videoModal).show();
}

// ===== Playlist Logic (SERVER ONLY) =====
let selectedVideo = null;

async function openPlaylistModal(video) {
  selectedVideo = video;

  const res = await fetch(`/api/playlists/${sessionUser.id}`);
  const playlists = await res.json();

  playlistSelect.innerHTML = playlists
    .map((p) => `<option value="${p.id}">${p.name}</option>`)
    .join("");

  new bootstrap.Modal(playlistModal).show();
}

// ===== Save to Playlist =====
saveToPlaylistBtn.onclick = async () => {
  let playlistId = playlistSelect.value;

  // Create new playlist if needed
  if (newPlaylistName.value.trim()) {
    const res = await fetch(`/api/playlists/${sessionUser.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newPlaylistName.value.trim() }),
    });

    const playlist = await res.json();
    playlistId = playlist.id;
  }

  if (!playlistId) return;

  // Add video to playlist (SERVER)
  await fetch(`/api/playlists/${sessionUser.id}/${playlistId}/video`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(selectedVideo),
  });

  new bootstrap.Toast(favToast).show();
};
