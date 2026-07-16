(() => {
  const STORAGE_KEY = "stfrancis-church-data-v1";

  const titles = {
    dashboard: ["Dashboard", "Overview of sanctuary activity"],
    inbox: ["Inbox", "Messages from the website Contact page"],
    birthdays: ["Birthdays", "Download photos, upload finished flyers, publish to the website"],
    events: ["Events", "Sanctuary calendar and gatherings"],
    schedule: ["Weekly schedule", "Mass times and weekly worship items on the website"],
  };

  const seed = () => ({
    messages: [],
    birthdays: [],
    schedule: window.ScheduleUtils
      ? ScheduleUtils.defaultSchedule()
      : [],
    events: [],
  });

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        const data = seed();
        save(data);
        return data;
      }
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed.messages)) parsed.messages = [];
      if (!Array.isArray(parsed.birthdays)) parsed.birthdays = [];
      if (!Array.isArray(parsed.schedule) || !parsed.schedule.length) {
        parsed.schedule = window.ScheduleUtils
          ? ScheduleUtils.defaultSchedule()
          : [];
      }
      return parsed;
    } catch {
      return seed();
    }
  }

  function save(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  let state = load();
  if (!Array.isArray(state.messages)) state.messages = [];
  if (!Array.isArray(state.birthdays)) state.birthdays = [];
  if (!Array.isArray(state.schedule) || !state.schedule.length) {
    state.schedule = window.ScheduleUtils
      ? ScheduleUtils.defaultSchedule()
      : [];
  }
  let modalMode = null;
  let editingId = null;
  let activeBirthdayId = null;
  let uploadedFlyerUrl = null;

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => [...document.querySelectorAll(sel)];

  const modal = $("#modal");
  const modalForm = $("#modalForm");
  const modalTitle = $("#modalTitle");
  const modalBody = $("#modalBody");

  function formatDate(iso) {
    if (!iso) return "—";
    return new Date(iso + "T00:00:00").toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  function syncNewBirthdays() {
    if (!window.BirthdayUtils) return;
    const latest = BirthdayUtils.loadData().birthdays || [];
    const known = new Set(state.birthdays.map((b) => b.id));
    latest.forEach((b) => {
      if (!known.has(b.id)) state.birthdays.push(b);
    });
  }

  function showView(name) {
    $$(".view").forEach((v) => v.classList.remove("active"));
    $$(".nav-link").forEach((b) => b.classList.toggle("active", b.dataset.view === name));
    $(`#view-${name}`).classList.add("active");
    const [title, note] = titles[name];
    $("#pageTitle").textContent = title;
    $("#pageNote").textContent = note;
    $("#sidebar").classList.remove("open");
    if (name === "birthdays") syncNewBirthdays();
    renderAll();
  }

  function renderDashboard() {
    const upcoming = state.events
      .filter((e) => e.date >= new Date().toISOString().slice(0, 10))
      .sort((a, b) => a.date.localeCompare(b.date));

    const unread = state.messages.filter((m) => !m.read).length;
    const pendingBirthdays = state.birthdays.filter((b) => b.status === "pending").length;

    $("#statMessages").textContent = unread;
    $("#statEvents").textContent = upcoming.length;
    $("#statBirthdays").textContent = pendingBirthdays;
    $("#statSchedule").textContent = state.schedule.length;

    const recentMessages = [...state.messages]
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
      .slice(0, 5);

    $("#dashMessages").innerHTML = recentMessages.length
      ? recentMessages
          .map(
            (m) => `
        <tr>
          <td>${formatDateTime(m.createdAt)}</td>
          <td>${escapeHtml(m.name)}</td>
          <td>${escapeHtml(m.contact)}</td>
        </tr>`
          )
          .join("")
      : `<tr><td colspan="3" class="empty">No messages yet</td></tr>`;

    $("#dashEvents").innerHTML = upcoming.length
      ? upcoming
          .slice(0, 4)
          .map((e) => {
            const d = new Date(e.date + "T00:00:00");
            return `
          <li>
            <div class="event-date">
              <span class="day">${d.getDate()}</span>
              <span class="month">${d.toLocaleString("en-GB", { month: "short" })}</span>
            </div>
            <div>
              <h3>${e.title}</h3>
              <p>${e.time} · ${e.location}</p>
            </div>
          </li>`;
          })
          .join("")
      : `<li class="empty">No upcoming events</li>`;
  }

  function renderEvents() {
    const sorted = [...state.events].sort((a, b) => a.date.localeCompare(b.date));
    $("#eventsGrid").innerHTML = sorted.length
      ? sorted
          .map(
            (e) => `
        <article class="event-card">
          <p class="meta">${formatDate(e.date)} · ${e.time}</p>
          <h3>${e.title}</h3>
          <p>${e.location}</p>
          <p>${e.description || ""}</p>
          <div class="actions">
            <button class="btn small" data-edit-event="${e.id}">Edit</button>
            <button class="btn small danger" data-del-event="${e.id}">Delete</button>
          </div>
        </article>`
          )
          .join("")
      : `<p class="empty">No events scheduled</p>`;
  }

  function formatDateTime(iso) {
    if (!iso) return "—";
    return new Date(iso).toLocaleString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function updateInboxBadge() {
    const badge = $("#inboxBadge");
    if (!badge) return;
    const unread = state.messages.filter((m) => !m.read).length;
    badge.textContent = String(unread);
    badge.hidden = unread === 0;
  }

  function updateBirthdayBadge() {
    const badge = $("#birthdayBadge");
    if (!badge) return;
    const pending = state.birthdays.filter((b) => b.status === "pending").length;
    badge.textContent = String(pending);
    badge.hidden = pending === 0;
  }

  function renderBirthdays() {
    syncNewBirthdays();
    updateBirthdayBadge();
    const admin = $("#birthdayAdmin");
    if (!admin) return;

    const rows = [...state.birthdays].sort((a, b) =>
      String(b.submittedAt || "").localeCompare(String(a.submittedAt || ""))
    );

    admin.innerHTML = rows.length
      ? rows
          .map(
            (b) => `
        <article class="birthday-admin-item">
          <img class="birthday-admin-thumb" src="${b.flyerDataUrl || b.imageDataUrl || ""}" alt="" />
          <div>
            <h3>${escapeHtml(b.name)}</h3>
            <p>${BirthdayUtils.formatBirthday(b.date)} · ${
              b.status === "published" ? "Published on website" : "Awaiting flyer upload"
            }</p>
            <p>${escapeHtml(b.contact || "No phone number left")}</p>
          </div>
          <div class="row-actions">
            <button class="btn small" data-download-photo="${b.id}">Download photo</button>
            ${
              b.flyerDataUrl
                ? `<button class="btn small" data-download-flyer="${b.id}">Download flyer</button>`
                : ""
            }
            <button class="btn small primary" data-upload-flyer="${b.id}">Upload flyer</button>
            ${
              b.status === "published"
                ? `<button class="btn small" data-unpublish-birthday="${b.id}">Unpublish</button>`
                : ""
            }
            <button class="btn small danger" data-del-birthday="${b.id}">Delete</button>
          </div>
        </article>`
          )
          .join("")
      : `<p class="empty">No birthday submissions yet. People can send their photo, name, and date from the Birthdays page.</p>`;
  }

  function openFlyerUpload(id) {
    const item = state.birthdays.find((b) => b.id === id);
    if (!item) return;
    activeBirthdayId = id;
    uploadedFlyerUrl = item.flyerDataUrl || null;

    const panel = $("#flyerUploadPanel");
    const nameEl = $("#flyerUploadName");
    const preview = $("#flyerUploadPreview");
    const input = $("#flyerUploadInput");
    const publishBtn = $("#publishBirthdayBtn");
    const unpublishBtn = $("#unpublishBirthdayBtn");

    if (panel) panel.hidden = false;
    if (nameEl) {
      nameEl.textContent = `${item.name} · ${BirthdayUtils.formatBirthday(item.date)} — download the photo, design the flyer, then upload here.`;
    }
    if (input) input.value = "";
    if (preview) {
      if (uploadedFlyerUrl) {
        preview.src = uploadedFlyerUrl;
        preview.hidden = false;
      } else {
        preview.removeAttribute("src");
        preview.hidden = true;
      }
    }
    if (publishBtn) publishBtn.disabled = !uploadedFlyerUrl;
    if (unpublishBtn) unpublishBtn.hidden = item.status !== "published";
    panel?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function closeFlyerUpload() {
    activeBirthdayId = null;
    uploadedFlyerUrl = null;
    const panel = $("#flyerUploadPanel");
    const preview = $("#flyerUploadPreview");
    const input = $("#flyerUploadInput");
    if (panel) panel.hidden = true;
    if (preview) {
      preview.hidden = true;
      preview.removeAttribute("src");
    }
    if (input) input.value = "";
  }

  function downloadBirthdayPhoto(id) {
    const item = state.birthdays.find((b) => b.id === id);
    if (!item?.imageDataUrl) {
      alert("No photo available for this submission.");
      return;
    }
    const a = document.createElement("a");
    a.href = item.imageDataUrl;
    const safeName = (item.name || "photo").toLowerCase().replace(/\s+/g, "-");
    const ext = item.imageDataUrl.startsWith("data:image/png") ? "png" : "jpg";
    a.download = `${safeName}-birthday-photo.${ext}`;
    a.click();
  }

  function downloadBirthdayFlyer(id) {
    const item = state.birthdays.find((b) => b.id === id);
    if (!item?.flyerDataUrl) {
      alert("No uploaded flyer available yet.");
      return;
    }
    const a = document.createElement("a");
    a.href = item.flyerDataUrl;
    const safeName = (item.name || "birthday").toLowerCase().replace(/\s+/g, "-");
    const ext = item.flyerDataUrl.startsWith("data:image/png") ? "png" : "jpg";
    a.download = `${safeName}-birthday-flyer.${ext}`;
    a.click();
  }

  function publishActiveBirthday() {
    if (!activeBirthdayId || !uploadedFlyerUrl) {
      alert("Please upload the finished flyer image first.");
      return;
    }
    state.birthdays = state.birthdays.map((b) =>
      b.id === activeBirthdayId
        ? {
            ...b,
            flyerDataUrl: uploadedFlyerUrl,
            status: "published",
            publishedAt: new Date().toISOString(),
          }
        : b
    );
    save(state);
    renderAll();
    const unpublishBtn = $("#unpublishBirthdayBtn");
    if (unpublishBtn) unpublishBtn.hidden = false;
    alert("Published! The flyer is now on the Birthdays page.");
  }

  function renderInbox() {
    updateInboxBadge();
    const list = $("#inboxList");
    if (!list) return;

    const rows = [...state.messages].sort((a, b) =>
      String(b.createdAt).localeCompare(String(a.createdAt))
    );

    list.innerHTML = rows.length
      ? rows
          .map(
            (m) => `
        <article class="inbox-item ${m.read ? "read" : "unread"}" data-message-id="${m.id}">
          <header class="inbox-item-head">
            <div>
              <h3>${escapeHtml(m.name)}</h3>
              <p class="inbox-meta">${escapeHtml(m.contact)} · ${formatDateTime(m.createdAt)}</p>
            </div>
            <span class="badge ${m.read ? "inactive" : "active"}">${m.read ? "Read" : "New"}</span>
          </header>
          <p class="inbox-body">${escapeHtml(m.message)}</p>
          <div class="row-actions">
            ${
              m.read
                ? ""
                : `<button class="btn small" data-read-message="${m.id}">Mark read</button>`
            }
            <button class="btn small danger" data-del-message="${m.id}">Delete</button>
          </div>
        </article>`
          )
          .join("")
      : `<p class="empty">No messages yet. When visitors use the Contact page, their notes appear here.</p>`;
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function renderSchedule() {
    const table = $("#scheduleTable");
    if (!table) return;
    const rows = [...state.schedule];
    table.innerHTML = rows.length
      ? rows
          .map(
            (item) => `
        <tr>
          <td><strong>${escapeHtml(item.title)}</strong></td>
          <td>${escapeHtml(item.detail || "—")}</td>
          <td>${escapeHtml(item.time || "—")}</td>
          <td>
            <div class="row-actions">
              <button class="btn small" data-edit-schedule="${item.id}">Edit</button>
              <button class="btn small danger" data-del-schedule="${item.id}">Delete</button>
            </div>
          </td>
        </tr>`
          )
          .join("")
      : `<tr><td colspan="4" class="empty">No schedule items yet. Add Mass times to show them on the website.</td></tr>`;
  }

  function scheduleForm(item = {}) {
    return `
      <div class="field">
        <label for="title">Title</label>
        <input id="title" name="title" required value="${escapeHtml(item.title || "")}" placeholder="e.g. First Mass" />
      </div>
      <div class="field-row">
        <div class="field">
          <label for="detail">Detail / day</label>
          <input id="detail" name="detail" value="${escapeHtml(item.detail || "")}" placeholder="e.g. Sunday" />
        </div>
        <div class="field">
          <label for="time">Time / place</label>
          <input id="time" name="time" required value="${escapeHtml(item.time || "")}" placeholder="e.g. 7:30 – 9:30 AM" />
        </div>
      </div>
      <div class="field">
        <label for="description">Description (Worship page)</label>
        <textarea id="description" name="description">${escapeHtml(item.description || "")}</textarea>
      </div>`;
  }

  function renderAll() {
    renderDashboard();
    renderInbox();
    renderBirthdays();
    renderEvents();
    renderSchedule();
  }

  function openModal(title, fieldsHtml, mode, id = null) {
    modalMode = mode;
    editingId = id;
    modalTitle.textContent = title;
    modalBody.innerHTML = fieldsHtml;
    if (typeof modal.showModal === "function") modal.showModal();
  }

  function closeModal() {
    if (modal.open) modal.close();
    modalMode = null;
    editingId = null;
  }

  function eventForm(e = {}) {
    return `
      <div class="field">
        <label for="title">Title</label>
        <input id="title" name="title" required value="${e.title || ""}" />
      </div>
      <div class="field-row">
        <div class="field">
          <label for="date">Date</label>
          <input id="date" name="date" type="date" required value="${e.date || ""}" />
        </div>
        <div class="field">
          <label for="time">Time</label>
          <input id="time" name="time" type="time" required value="${e.time || "10:00"}" />
        </div>
      </div>
      <div class="field">
        <label for="location">Location</label>
        <input id="location" name="location" required value="${e.location || ""}" />
      </div>
      <div class="field">
        <label for="description">Description</label>
        <textarea id="description" name="description">${e.description || ""}</textarea>
      </div>`;
  }

  function formValues() {
    const data = {};
    modalBody.querySelectorAll("input, select, textarea").forEach((el) => {
      data[el.name] = el.value.trim();
    });
    return data;
  }

  modalForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const v = formValues();

    if (modalMode === "event") {
      const record = {
        id: editingId || crypto.randomUUID(),
        title: v.title,
        date: v.date,
        time: v.time,
        location: v.location,
        description: v.description,
      };
      if (editingId) {
        state.events = state.events.map((ev) => (ev.id === editingId ? record : ev));
      } else {
        state.events.push(record);
      }
    }

    if (modalMode === "schedule") {
      const record = {
        id: editingId || crypto.randomUUID(),
        title: v.title,
        detail: v.detail,
        time: v.time,
        description: v.description,
      };
      if (editingId) {
        state.schedule = state.schedule.map((item) =>
          item.id === editingId ? { ...item, ...record } : item
        );
      } else {
        state.schedule.push(record);
      }
    }

    save(state);
    closeModal();
    renderAll();
  });

  $("#modalClose").addEventListener("click", closeModal);
  $("#modalCancel").addEventListener("click", closeModal);

  $$(".nav-link").forEach((btn) =>
    btn.addEventListener("click", () => showView(btn.dataset.view))
  );

  $("#menuToggle").addEventListener("click", () => {
    $("#sidebar").classList.toggle("open");
  });

  $("#addEventBtn").addEventListener("click", () =>
    openModal("Add event", eventForm(), "event")
  );
  $("#addScheduleBtn")?.addEventListener("click", () =>
    openModal("Add schedule item", scheduleForm(), "schedule")
  );

  const markAllReadBtn = $("#markAllReadBtn");
  if (markAllReadBtn) {
    markAllReadBtn.addEventListener("click", () => {
      state.messages = state.messages.map((m) => ({ ...m, read: true }));
      save(state);
      renderAll();
    });
  }

  $("#flyerUploadInput")?.addEventListener("change", async () => {
    const file = $("#flyerUploadInput")?.files?.[0];
    const preview = $("#flyerUploadPreview");
    const publishBtn = $("#publishBirthdayBtn");
    if (!file) {
      uploadedFlyerUrl = null;
      if (preview) {
        preview.hidden = true;
        preview.removeAttribute("src");
      }
      if (publishBtn) publishBtn.disabled = true;
      return;
    }
    try {
      uploadedFlyerUrl = window.BirthdayUtils
        ? await BirthdayUtils.resizeImage(file, 1400, 0.9)
        : await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
      if (preview) {
        preview.src = uploadedFlyerUrl;
        preview.hidden = false;
      }
      if (publishBtn) publishBtn.disabled = false;
    } catch (err) {
      uploadedFlyerUrl = null;
      alert(err.message || "Could not read the flyer image.");
      if (publishBtn) publishBtn.disabled = true;
    }
  });

  $("#publishBirthdayBtn")?.addEventListener("click", publishActiveBirthday);

  $("#unpublishBirthdayBtn")?.addEventListener("click", () => {
    if (!activeBirthdayId) return;
    state.birthdays = state.birthdays.map((b) =>
      b.id === activeBirthdayId
        ? { ...b, status: "pending", publishedAt: null }
        : b
    );
    save(state);
    renderAll();
    const unpublishBtn = $("#unpublishBirthdayBtn");
    if (unpublishBtn) unpublishBtn.hidden = true;
  });

  $("#closeFlyerBtn")?.addEventListener("click", closeFlyerUpload);

  document.addEventListener("click", (e) => {
    const t = e.target;
    if (!(t instanceof HTMLElement)) return;

    if (t.dataset.downloadPhoto) {
      downloadBirthdayPhoto(t.dataset.downloadPhoto);
    }
    if (t.dataset.downloadFlyer) {
      downloadBirthdayFlyer(t.dataset.downloadFlyer);
    }
    if (t.dataset.uploadFlyer) {
      openFlyerUpload(t.dataset.uploadFlyer);
    }
    if (t.dataset.unpublishBirthday) {
      state.birthdays = state.birthdays.map((b) =>
        b.id === t.dataset.unpublishBirthday
          ? { ...b, status: "pending", publishedAt: null }
          : b
      );
      save(state);
      renderAll();
      if (activeBirthdayId === t.dataset.unpublishBirthday) {
        const unpublishBtn = $("#unpublishBirthdayBtn");
        if (unpublishBtn) unpublishBtn.hidden = true;
      }
    }
    if (t.dataset.delBirthday) {
      if (confirm("Delete this birthday submission?")) {
        state.birthdays = state.birthdays.filter(
          (b) => b.id !== t.dataset.delBirthday
        );
        if (activeBirthdayId === t.dataset.delBirthday) closeFlyerUpload();
        save(state);
        renderAll();
      }
    }

    if (t.dataset.readMessage) {
      state.messages = state.messages.map((m) =>
        m.id === t.dataset.readMessage ? { ...m, read: true } : m
      );
      save(state);
      renderAll();
    }
    if (t.dataset.delMessage) {
      if (confirm("Delete this message?")) {
        state.messages = state.messages.filter((m) => m.id !== t.dataset.delMessage);
        save(state);
        renderAll();
      }
    }

    if (t.dataset.editEvent) {
      const ev = state.events.find((x) => x.id === t.dataset.editEvent);
      if (ev) openModal("Edit event", eventForm(ev), "event", ev.id);
    }
    if (t.dataset.delEvent) {
      if (confirm("Delete this event?")) {
        state.events = state.events.filter((ev) => ev.id !== t.dataset.delEvent);
        save(state);
        renderAll();
      }
    }
    if (t.dataset.editSchedule) {
      const item = state.schedule.find((x) => x.id === t.dataset.editSchedule);
      if (item) openModal("Edit schedule item", scheduleForm(item), "schedule", item.id);
    }
    if (t.dataset.delSchedule) {
      if (confirm("Delete this schedule item from the website?")) {
        state.schedule = state.schedule.filter((s) => s.id !== t.dataset.delSchedule);
        save(state);
        renderAll();
      }
    }
  });

  function bootPortal() {
    renderAll();
  }

  if (window.ParishAuth?.isAuthenticated()) {
    bootPortal();
  } else {
    window.addEventListener("parish-portal-unlocked", bootPortal, { once: true });
  }
})();
