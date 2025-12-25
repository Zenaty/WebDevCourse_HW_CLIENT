document.getElementById("registerForm").addEventListener("submit", register);

function register(event) {
  event.preventDefault();

  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value;
  const confirmPassword = document.getElementById("confirmPassword").value;
  const firstName = document.getElementById("firstName").value.trim();
  const imageUrl = document.getElementById("imageUrl").value.trim();
  const error = document.getElementById("error");

  error.textContent = "";

  // 1. שדות חובה
  if (!username || !password || !confirmPassword || !firstName || !imageUrl) {
    error.textContent = "All fields are required";
    return;
  }

  // 2. מינימום 6 תווים
  if (password.length < 6) {
    error.textContent = "Password must be at least 6 characters";
    return;
  }

  // 3. לפחות אות, מספר ותו מיוחד
  const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z\d]).+$/;
  if (!passwordRegex.test(password)) {
    error.textContent =
      "Password must contain a letter, a number and a special character";
    return;
  }

  // 4. אימות סיסמה
  if (password !== confirmPassword) {
    error.textContent = "Passwords do not match";
    return;
  }

  // 5. בדיקה אם המשתמש קיים
  const users = JSON.parse(localStorage.getItem("users")) || [];
  const userExists = users.some((u) => u.username === username);

  if (userExists) {
    error.textContent = "Username already exists";
    return;
  }

  // 6. שמירת משתמש
  const newUser = {
    username,
    password,
    firstName,
    imageUrl,
  };

  users.push(newUser);
  localStorage.setItem("users", JSON.stringify(users));

  // 7. מעבר ללוגין
  window.location.href = "login.html";
}
