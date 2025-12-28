// ===== Guard =====
const sessionUser = JSON.parse(sessionStorage.getItem("currentUser"));
if (!sessionUser) {
  window.location.href = "index.html";
}

// ===== State =====
let playlists = [];
let activePlaylist = null;
let playIndex = 0;

// ===== DOM =====
const playlistList = document.getElementById("playlistList");
const playlistTitle = document.getElementById("playlistTitle");
const videosDiv = document.getElementById("videos");
const emptyMsg = document.getElementById("emptyMsg");
const controls = document.getElementById("controls");
const searchInPlaylist = document.getElementById("searchInPlaylist");
const playPlaylistBtn = document.getElementById("playPlaylistBtn");
const playerContainer = document.getElementById("playerContainer");
const playlistPlayer = document.getElementById("playlistPlayer");

const mp3Input = document.getElementById("mp3Input");
const uploadMp3Btn = document.getElementById("uploadMp3Btn");

// ===== Init =====
init();

async function init() {
  const res = await fetch(`/api/playlists/${sessionUser.id}`);
  playlists = await res.json();

  const params = new URLSearchParams(window.location.search);
  let playlistId = params.get("playlistId");

  if (!playlistId && playlists.length > 0) {
    playlistId = playlists[0].id;
  }

  activePlaylist = playlists.find((p) => p.id === playlistId) || null;

  renderSidebar();
  renderVideos();
}

// ===== Sidebar =====
function renderSidebar() {
  playlistList.innerHTML = "";

  playlists.forEach((p) => {
    const li = document.createElement("li");
    li.className = "list-group-item list-group-item-action";
    if (p.id === activePlaylist?.id) li.classList.add("active");

    li.innerText = p.name;
    li.onclick = () => {
      window.location.href = `playlists.html?playlistId=${p.id}`;
    };

    playlistList.appendChild(li);
  });
}

// ===== Videos =====
function renderVideos(list = activePlaylist?.videos) {
  videosDiv.innerHTML = "";

  if (!activePlaylist) {
    emptyMsg.classList.remove("d-none");
    controls.classList.add("d-none");
    playlistTitle.innerText = "";
    playerContainer.classList.add("d-none");
    return;
  }

  emptyMsg.classList.add("d-none");
  controls.classList.remove("d-none");
  playlistTitle.innerText = activePlaylist.name;

  (list || []).forEach((v, index) => {
    const col = document.createElement("div");
    col.className = "col-md-4";

    col.innerHTML = `
      <div class="card h-100">
        ${
          v.videoId
            ? `<img
                 src="${v.thumb}"
                 class="card-img-top video-thumb"
                 style="cursor:pointer"
                 data-index="${index}"
               />`
            : `<audio controls class="w-100">
                 <source src="${v.filePath}" type="audio/mpeg">
               </audio>`
        }
        <div class="card-body">
          <h6>${v.title}</h6>

          <select class="form-select rating mb-2" data-index="${index}">
            <option value="">Rating</option>
            ${[1, 2, 3, 4, 5]
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

// ===== Events (delegation) =====
videosDiv.onclick = async (e) => {
  // מחיקת וידאו
  if (e.target.classList.contains("deleteVideo")) {
    const index = e.target.dataset.index;

    await fetch(
      `/api/playlists/${sessionUser.id}/${activePlaylist.id}/video/${index}`,
      { method: "DELETE" }
    );

    activePlaylist.videos.splice(index, 1);
    renderVideos();
    return;
  }

  // ▶ ניגון שיר YouTube בלחיצה
  if (e.target.classList.contains("video-thumb")) {
    const index = e.target.dataset.index;
    const v = activePlaylist.videos[index];
    if (!v?.videoId) return;

    playIndex = index;
    playerContainer.classList.remove("d-none");
    playlistPlayer.src = `https://www.youtube.com/embed/${v.videoId}?autoplay=1`;
  }
};

// דירוג
videosDiv.onchange = async (e) => {
  if (!e.target.classList.contains("rating")) return;

  const index = e.target.dataset.index;
  activePlaylist.videos[index].rating = Number(e.target.value);

  await fetch(
    `/api/playlists/${sessionUser.id}/${activePlaylist.id}/video/${index}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rating: activePlaylist.videos[index].rating }),
    }
  );
};

// חיפוש
searchInPlaylist.oninput = () => {
  if (!activePlaylist) return;
  const q = searchInPlaylist.value.toLowerCase();
  const filtered = activePlaylist.videos.filter((v) =>
    v.title.toLowerCase().includes(q)
  );
  renderVideos(filtered);
};

// מיון
document.getElementById("sortAZ").onclick = () => {
  activePlaylist.videos.sort((a, b) => a.title.localeCompare(b.title));
  renderVideos();
};

document.getElementById("sortRating").onclick = () => {
  activePlaylist.videos.sort((a, b) => (b.rating || 0) - (a.rating || 0));
  renderVideos();
};

// מחיקת פלייליסט
document.getElementById("deletePlaylist").onclick = async () => {
  if (!confirm("Delete playlist?")) return;

  await fetch(`/api/playlists/${sessionUser.id}/${activePlaylist.id}`, {
    method: "DELETE",
  });

  window.location.href = "playlists.html";
};

// ===== Create playlist =====
const modal = new bootstrap.Modal(document.getElementById("newPlaylistModal"));

document.getElementById("newPlaylistBtn").onclick = () => modal.show();

document.getElementById("createPlaylistBtn").onclick = async () => {
  const name = document.getElementById("newPlaylistName").value.trim();
  if (!name) return;

  const res = await fetch(`/api/playlists/${sessionUser.id}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });

  const playlist = await res.json();
  window.location.href = `playlists.html?playlistId=${playlist.id}`;
};

// ===== Play full playlist =====
playPlaylistBtn.onclick = () => {
  if (!activePlaylist || activePlaylist.videos.length === 0) {
    alert("אין סרטונים בפלייליסט");
    return;
  }

  playIndex = 0;
  playerContainer.classList.remove("d-none");
  playCurrent();
};

function playCurrent() {
  const v = activePlaylist.videos[playIndex];
  if (!v?.videoId) return;

  playlistPlayer.src = `https://www.youtube.com/embed/${v.videoId}?autoplay=1`;
}

// ===== MP3 Upload =====
uploadMp3Btn.onclick = async () => {
  if (!activePlaylist) {
    alert("בחר פלייליסט קודם");
    return;
  }

  const file = mp3Input.files[0];
  if (!file) {
    alert("בחר קובץ MP3");
    return;
  }

  if (!file.name.toLowerCase().endsWith(".mp3")) {
    alert("רק קבצי MP3 מותרים");
    return;
  }

  const formData = new FormData();
  formData.append("file", file);

  await fetch(`/api/playlists/${sessionUser.id}/${activePlaylist.id}/mp3`, {
    method: "POST",
    body: formData,
  });

  const res = await fetch(`/api/playlists/${sessionUser.id}`);
  playlists = await res.json();
  activePlaylist = playlists.find((p) => p.id === activePlaylist.id);

  mp3Input.value = "";
  renderVideos();
};
