(() => {
  const STORAGE_KEY = "stfrancis-church-data-v1";

  function defaultSchedule() {
    return [
      {
        id: "sched-first-mass",
        title: "First Mass",
        detail: "Sunday",
        time: "7:30 – 9:30 AM",
        description: "Sunday celebration of the Eucharist at the sanctuary.",
      },
      {
        id: "sched-second-mass",
        title: "Second Mass",
        detail: "Sunday",
        time: "9:30 – 11:30 AM",
        description: "Sunday celebration of the Eucharist at the sanctuary.",
      },
      {
        id: "sched-confession",
        title: "Confession",
        detail: "Before Mass & by appointment",
        time: "Sanctuary office",
        description: "Confession is available before Mass and by appointment.",
      },
    ];
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function loadSchedule() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultSchedule();
      const data = JSON.parse(raw);
      if (!Array.isArray(data.schedule) || !data.schedule.length) {
        data.schedule = defaultSchedule();
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      }
      return [...data.schedule];
    } catch {
      return defaultSchedule();
    }
  }

  function scheduleBadge(item) {
    const title = String(item.title || "").trim();
    const words = title.split(/\s+/).filter(Boolean);
    if (words.length >= 2) return words[0].slice(0, 3);
    return title.slice(0, 3) || "•";
  }

  function renderHomeSchedule(container) {
    if (!container) return;
    const items = loadSchedule();
    container.innerHTML = items.length
      ? items
          .map(
            (item) => `
        <div class="time-row">
          <div>
            <strong>${escapeHtml(item.title)}</strong>
            <span>${escapeHtml(item.detail || "")}</span>
          </div>
          <div>${escapeHtml(item.time || "")}</div>
        </div>`
          )
          .join("")
      : `<div class="time-row"><div><strong>No schedule posted</strong><span>Please check with the sanctuary office</span></div></div>`;
  }

  function renderWorshipSchedule(container) {
    if (!container) return;
    const items = loadSchedule();
    container.innerHTML = items.length
      ? items
          .map(
            (item) => `
        <article class="event-item">
          <div class="event-date">
            <span class="day">${escapeHtml(scheduleBadge(item))}</span>
            <span class="month">${escapeHtml(item.detail || "Weekly")}</span>
          </div>
          <div>
            <h3>${escapeHtml(item.title)}${item.time ? ` — ${escapeHtml(item.time)}` : ""}</h3>
            <p>${escapeHtml(item.description || item.detail || "")}</p>
          </div>
        </article>`
          )
          .join("")
      : `<p class="empty-birthdays">No weekly schedule posted yet.</p>`;
  }

  window.ScheduleUtils = {
    STORAGE_KEY,
    defaultSchedule,
    loadSchedule,
    renderHomeSchedule,
    renderWorshipSchedule,
  };

  document.addEventListener("DOMContentLoaded", () => {
    renderHomeSchedule(document.getElementById("homeSchedule"));
    renderWorshipSchedule(document.getElementById("worshipSchedule"));
  });
})();
