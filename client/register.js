document.getElementById("registerForm").addEventListener("submit", register);

async function register(e) {
  e.preventDefault();

  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value;
  const confirmPassword = document.getElementById("confirmPassword").value;
  const firstName = document.getElementById("firstName").value.trim();
  const imageUrl = document.getElementById("imageUrl").value.trim();
  const error = document.getElementById("errorMsg");

  error.textContent = "";

  // ===== validations =====
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

  // ===== server register =====
  try {
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username,
        password,
        firstName,
        imageUrl,
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      error.textContent = data.message || "Registration failed";
      return;
    }

    // success - go to login
    window.location.replace("login.html");
  } catch (err) {
    error.textContent = "Server error. Try again later.";
  }
}
