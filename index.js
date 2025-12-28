fetch("pagesData/siteData.json")
  .then((res) => {
    if (!res.ok) throw new Error("Failed to load site data");
    return res.json();
  })
  .then((data) => {
    document.getElementById("studentName").innerText = data.student.name;
    document.getElementById("studentId").innerText = data.student.id;

    document.getElementById("githubLink").href = data.links.github;
    document.getElementById("liveLink").href = data.links.live;

    document.getElementById("loginLink").href = data.pages.login;
    document.getElementById("registerLink").href = data.pages.register;
  })
  .catch((err) => console.error("Error loading site data:", err));
