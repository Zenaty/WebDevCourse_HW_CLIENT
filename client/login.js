// אם מנסים להגיע לדף login אבל כבר מחוברים – מפנים ל־search
const currentUser = sessionStorage.getItem("currentUser");
if (currentUser) {
  window.location.href = "search.html";
}

document
  .getElementById("loginForm")
  .addEventListener("submit", async function (e) {
    e.preventDefault();

    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value.trim();
    const errorMsg = document.getElementById("errorMsg");

    errorMsg.classList.add("d-none");

    // ===== אימות דרך צד שרת =====
    // במקום לחפש ב- localStorage, שולחים בקשה ל- API
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) {
        throw new Error("Invalid credentials");
      }

      const user = await res.json();

      // ===== שמירת המשתמש המחובר בלבד ב־Session Storage =====
      // ללא סיסמה, ללא רשימת משתמשים
      const sessionUser = {
        id: user.id,
        username: user.username,
        firstName: user.firstName,
        imageUrl: user.imageUrl,
      };

      sessionStorage.setItem("currentUser", JSON.stringify(sessionUser));

      // ===== מעבר לדף החיפוש =====
      window.location.replace("search.html");
    } catch (err) {
      errorMsg.classList.remove("d-none");
    }
  });
