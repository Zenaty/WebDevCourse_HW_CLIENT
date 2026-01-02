// =====================
// Guard
// =====================
const sessionUser = JSON.parse(sessionStorage.getItem("currentUser"));
if (!sessionUser) window.location.replace("index.html");

// =====================
// State
// =====================
let playlists = [];
let activePlaylist = null;
let playIndex = 0;

let ytPlayer = null;
let audioPlayer = null;

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

const mp3Input = document.getElementById("mp3Input");
const uploadMp3Btn = document.getElementById("uploadMp3Btn");

// =====================
// Init
// =====================
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
    li.onclick = () => {
      window.location.href = `playlists.html?playlistId=${p.id}`;
    };

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
            ? `<img src="${v.thumb}" class="card-img-top video-thumb" style="cursor:pointer" data-index="${index}" />`
            : `<audio controls class="w-100">
                <source src="${v.filePath}" type="audio/mpeg">
              </audio>`
        }
        <div class="card-body">
          <h6>${v.title}</h6>

          ${
            v.videoId
              ? `<button class="btn btn-success btn-sm w-100 playVideoBtn mb-2" data-index="${index}">▶ נגן</button>`
              : ""
          }

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

          <button class="btn btn-danger btn-sm w-100 deleteVideo" data-index="${index}">
            Remove
          </button>
        </div>
      </div>
    `;

    videosDiv.appendChild(col);
  });
}

// =====================
// Event delegation
// =====================
videosDiv.onclick = async (e) => {
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

  if (
    e.target.classList.contains("video-thumb") ||
    e.target.classList.contains("playVideoBtn")
  ) {
    playIndex = Number(e.target.dataset.index);
    playCurrent();
  }
};

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

// =====================
// Search & sort
// =====================
searchInPlaylist.oninput = () => {
  if (!activePlaylist) return;
  const q = searchInPlaylist.value.toLowerCase();
  renderVideos(
    activePlaylist.videos.filter((v) => v.title.toLowerCase().includes(q))
  );
};

document.getElementById("sortAZ").onclick = () => {
  activePlaylist.videos.sort((a, b) => a.title.localeCompare(b.title));
  renderVideos();
};

document.getElementById("sortRating").onclick = () => {
  activePlaylist.videos.sort((a, b) => (b.rating || 0) - (a.rating || 0));
  renderVideos();
};

// =====================
// Play full playlist
// =====================
playPlaylistBtn.onclick = () => {
  if (!activePlaylist || activePlaylist.videos.length === 0) {
    alert("אין פריטים בפלייליסט");
    return;
  }

  playIndex = 0;
  playCurrent();
};

// =====================
// YouTube IFrame API
// =====================
function onYouTubeIframeAPIReady() {
  ytPlayer = new YT.Player("playlistPlayer", {
    playerVars: { autoplay: 1 },
    events: { onStateChange },
  });
}

function onStateChange(event) {
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

// =====================
// Audio (MP3)
// =====================
function initAudioPlayer() {
  if (audioPlayer) return;

  audioPlayer = new Audio();
  audioPlayer.onended = () => {
    playIndex++;
    if (playIndex < activePlaylist.videos.length) {
      playCurrent();
    } else {
      audioPlayer.pause();
      audioPlayer.currentTime = 0;
      playIndex = 0;
    }
  };
}

// =====================
// Core playback logic
// =====================
function playCurrent() {
  const v = activePlaylist.videos[playIndex];
  if (!v) return;

  // MP3
  if (v.filePath) {
    initAudioPlayer();
    if (ytPlayer) ytPlayer.stopVideo();

    playerContainer.classList.add("d-none");
    audioPlayer.src = v.filePath;
    audioPlayer.play();
    return;
  }

  // YouTube
  if (v.videoId && ytPlayer) {
    if (audioPlayer) audioPlayer.pause();

    playerContainer.classList.remove("d-none");
    ytPlayer.loadVideoById(v.videoId);
  }
}

// =====================
// MP3 Upload
// =====================
uploadMp3Btn.onclick = async () => {
  if (!activePlaylist) {
    alert("בחר פלייליסט קודם");
    return;
  }

  const file = mp3Input.files[0];
  if (!file || !file.name.toLowerCase().endsWith(".mp3")) {
    alert("בחר קובץ MP3");
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
