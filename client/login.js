// אם כבר מחובר — לא נותנים להישאר בלוגין
const currentUser = sessionStorage.getItem("currentUser");
if (currentUser) {
  window.location.replace("search.html");
}

document.getElementById("loginForm").addEventListener("submit", function (e) {
  e.preventDefault();

  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();
  const errorMsg = document.getElementById("errorMsg");

  errorMsg.classList.add("d-none");

  const users = JSON.parse(localStorage.getItem("users")) || [];
  const user = users.find(
    (u) => u.username === username && u.password === password
  );

  if (!user) {
    errorMsg.classList.remove("d-none");
    return;
  }

  // SessionStorage בלי סיסמה
  const sessionUser = {
    id: user.id,
    username: user.username,
    firstName: user.firstName,
    imageUrl: user.imageUrl,
  };

  sessionStorage.setItem("currentUser", JSON.stringify(sessionUser));

  // replace כדי שכפתור Back לא יחזיר ללוגין
  window.location.replace("search.html");
});
