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
            "Thank you. Your message was sent to the sanctuary team.";
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
    const emptyHtml =
      `<p class="empty-events">No upcoming events right now. Check back soon, or see Mass times on the Worship page.</p>`;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const data = raw ? JSON.parse(raw) : { events: [] };
      const today = new Date().toISOString().slice(0, 10);
      const upcoming = (data.events || [])
        .filter((ev) => ev.date >= today)
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(0, 12);

      if (!upcoming.length) {
        publicEvents.innerHTML = emptyHtml;
      } else {
        publicEvents.innerHTML = upcoming
          .map((ev) => {
            const d = new Date(ev.date + "T00:00:00");
            const title = escapeHtml(ev.title || "Event");
            const time = escapeHtml(ev.time || "");
            const location = escapeHtml(ev.location || "");
            const description = ev.description
              ? ` · ${escapeHtml(ev.description)}`
              : "";
            return `
            <article class="event-item">
              <div class="event-date">
                <span class="day">${d.getDate()}</span>
                <span class="month">${d.toLocaleString("en-GB", { month: "short" })}</span>
              </div>
              <div>
                <h3>${title}</h3>
                <p>${time} · ${location}${description}</p>
              </div>
            </article>`;
          })
          .join("");
      }
    } catch {
      publicEvents.innerHTML = emptyHtml;
    }
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
})();
