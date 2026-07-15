(() => {
  const menuBtn = document.getElementById("menuBtn");
  const navLinks = document.getElementById("navLinks");

  if (menuBtn && navLinks) {
    menuBtn.addEventListener("click", () => {
      navLinks.classList.toggle("open");
    });
  }

  const contactForm = document.getElementById("contactForm");
  if (contactForm) {
    contactForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const note = document.getElementById("formNote");
      if (note) {
        note.textContent =
          "Thank you. Your message has been recorded in this browser. Please also contact the parish office directly for urgent matters.";
      }
      contactForm.reset();
    });
  }

  const publicEvents = document.getElementById("publicEvents");
  if (publicEvents) {
    try {
      const raw = localStorage.getItem("stfrancis-church-data-v1");
      if (!raw) return;
      const data = JSON.parse(raw);
      const today = new Date().toISOString().slice(0, 10);
      const upcoming = (data.events || [])
        .filter((ev) => ev.date >= today)
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(0, 6);

      if (!upcoming.length) return;

      publicEvents.innerHTML = upcoming
        .map((ev) => {
          const d = new Date(ev.date + "T00:00:00");
          return `
            <article class="event-item">
              <div class="event-date">
                <span class="day">${d.getDate()}</span>
                <span class="month">${d.toLocaleString("en-GB", { month: "short" })}</span>
              </div>
              <div>
                <h3>${ev.title}</h3>
                <p>${ev.time} · ${ev.location}${ev.description ? " · " + ev.description : ""}</p>
              </div>
            </article>`;
        })
        .join("");
    } catch {
      /* keep default markup */
    }
  }
})();
