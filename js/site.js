(() => {
  const menuBtn = document.getElementById("menuBtn");
  const navLinks = document.getElementById("navLinks");

  if (menuBtn && navLinks) {
    menuBtn.addEventListener("click", () => {
      navLinks.classList.toggle("open");
    });
  }

  const STORAGE_KEY = "stfrancis-church-data-v1";

  const contactForm = document.getElementById("contactForm");
  if (contactForm) {
    contactForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const form = new FormData(contactForm);
      const name = String(form.get("name") || "").trim();
      const contact = String(form.get("contact") || "").trim();
      const message = String(form.get("message") || "").trim();
      const note = document.getElementById("formNote");

      try {
        let data = { events: [], messages: [] };
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) data = { ...data, ...JSON.parse(raw) };
        if (!Array.isArray(data.messages)) data.messages = [];

        data.messages.unshift({
          id: crypto.randomUUID(),
          name,
          contact,
          message,
          createdAt: new Date().toISOString(),
          read: false,
        });

        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));

        if (note) {
          note.textContent =
            "Thank you. Your message was sent to the Sanctuary Portal inbox.";
        }
        contactForm.reset();
      } catch {
        if (note) {
          note.textContent =
            "Sorry — the message could not be saved. Please try again or contact the sanctuary office directly.";
        }
      }
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
