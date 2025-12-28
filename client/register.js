document.getElementById("registerForm").addEventListener("submit", register);

function generateGUID() {
  return crypto.randomUUID();
}

function register(event) {
  event.preventDefault();

  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value;
  const confirmPassword = document.getElementById("confirmPassword").value;
  const firstName = document.getElementById("firstName").value.trim();
  const imageUrl = document.getElementById("imageUrl").value.trim();
  const error = document.getElementById("errorMsg");

  error.textContent = "";

  // חובה
  if (!username || !password || !confirmPassword || !firstName || !imageUrl) {
    error.textContent = "All fields are required";
    return;
  }

  // מינימום 6
  if (password.length < 6) {
    error.textContent = "Password must be at least 6 characters";
    return;
  }

  // לפחות אות, מספר, ותו מיוחד
  const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z\d]).+$/;
  if (!passwordRegex.test(password)) {
    error.textContent =
      "Password must contain a letter, a number and a special character";
    return;
  }

  // אימות סיסמה
  if (password !== confirmPassword) {
    error.textContent = "Passwords do not match";
    return;
  }

  const users = JSON.parse(localStorage.getItem("users")) || [];

  // בדיקה שהשם לא קיים
  if (users.some((u) => u.username === username)) {
    error.textContent = "Username already exists";
    return;
  }

  const newUser = {
    id: generateGUID(),
    username,
    password, // חלק A — מקומי (בצד שרת תוציא את זה)
    firstName,
    imageUrl,
    playlists: [],
  };

  users.push(newUser);
  localStorage.setItem("users", JSON.stringify(users));

  // מעבר ללוגין (replace כדי שלא יחזור אחורה לטופס הרשמה)
  window.location.replace("login.html");
}
