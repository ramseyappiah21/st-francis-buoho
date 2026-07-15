(() => {
  const STORAGE_KEY = "stfrancis-church-data-v1";

  const titles = {
    dashboard: ["Dashboard", "Overview of parish activity"],
    members: ["Members", "Membership records and household details"],
    contributions: ["Contributions", "Tithes, offerings, and gifts"],
    events: ["Events", "Parish calendar and gatherings"],
    reports: ["Reports", "Giving and membership summaries"],
  };

  const seed = () => {
    const today = new Date();
    const iso = (offsetDays) => {
      const d = new Date(today);
      d.setDate(d.getDate() + offsetDays);
      return d.toISOString().slice(0, 10);
    };

    return {
      members: [
        {
          id: crypto.randomUUID(),
            firstName: "Ama",
          lastName: "Owusu",
          email: "ama.owusu@example.com",
          phone: "024 000 1122",
          status: "Active",
          joined: iso(-400),
          notes: "Choir lead · Buoho",
        },
        {
          id: crypto.randomUUID(),
          firstName: "Kwame",
          lastName: "Asante",
          email: "kwame.asante@example.com",
          phone: "020 000 3344",
          status: "Active",
          joined: iso(-220),
          notes: "Usher team",
        },
        {
          id: crypto.randomUUID(),
          firstName: "Akosua",
          lastName: "Boateng",
          email: "akosua.b@example.com",
          phone: "027 000 5566",
          status: "Inactive",
          joined: iso(-800),
          notes: "",
        },
      ],
      contributions: [],
      events: [
        {
          id: crypto.randomUUID(),
          title: "Sunday Eucharist",
          date: iso(2),
          time: "09:00",
          location: "Main Church, Buoho",
          description: "Weekly celebration of Holy Mass",
        },
        {
          id: crypto.randomUUID(),
          title: "Youth Fellowship",
          date: iso(5),
          time: "18:30",
          location: "Parish Hall",
          description: "Prayer, games, and Catholic teaching",
        },
        {
          id: crypto.randomUUID(),
          title: "Parish Service Day",
          date: iso(12),
          time: "08:00",
          location: "Church grounds",
          description: "Clean-up and practical service together",
        },
      ],
    };
  };

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        const data = seed();
        data.contributions = [
          {
            id: crypto.randomUUID(),
            memberId: data.members[0].id,
            date: new Date().toISOString().slice(0, 10),
            type: "Tithe",
            method: "Bank transfer",
            amount: 120,
            notes: "",
          },
          {
            id: crypto.randomUUID(),
            memberId: data.members[1].id,
            date: new Date(Date.now() - 86400000 * 3).toISOString().slice(0, 10),
            type: "Offering",
            method: "Cash",
            amount: 45,
            notes: "Thanksgiving",
          },
          {
            id: crypto.randomUUID(),
            memberId: data.members[0].id,
            date: new Date(Date.now() - 86400000 * 20).toISOString().slice(0, 10),
            type: "Special",
            method: "Card",
            amount: 200,
            notes: "Building fund",
          },
        ];
        save(data);
        return data;
      }
      return JSON.parse(raw);
    } catch {
      return seed();
    }
  }

  function save(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  let state = load();
  let modalMode = null;
  let editingId = null;

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => [...document.querySelectorAll(sel)];

  const modal = $("#modal");
  const modalForm = $("#modalForm");
  const modalTitle = $("#modalTitle");
  const modalBody = $("#modalBody");

  function money(n) {
    return new Intl.NumberFormat("en-GH", {
      style: "currency",
      currency: "GHS",
      maximumFractionDigits: 0,
    }).format(Number(n) || 0);
  }

  function memberName(id) {
    const m = state.members.find((x) => x.id === id);
    return m ? `${m.firstName} ${m.lastName}` : "Unknown";
  }

  function formatDate(iso) {
    if (!iso) return "—";
    return new Date(iso + "T00:00:00").toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
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
    renderAll();
  }

  function renderDashboard() {
    const year = new Date().getFullYear();
    const ytd = state.contributions
      .filter((c) => String(c.date).startsWith(String(year)))
      .reduce((sum, c) => sum + Number(c.amount), 0);

    const upcoming = state.events
      .filter((e) => e.date >= new Date().toISOString().slice(0, 10))
      .sort((a, b) => a.date.localeCompare(b.date));

    $("#statMembers").textContent = state.members.filter((m) => m.status === "Active").length;
    $("#statGiving").textContent = money(ytd);
    $("#statEvents").textContent = upcoming.length;
    $("#statFamilies").textContent = new Set(state.members.map((m) => m.lastName)).size;

    const recent = [...state.contributions]
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 5);

    $("#dashContributions").innerHTML = recent.length
      ? recent
          .map(
            (c) => `
        <tr>
          <td>${formatDate(c.date)}</td>
          <td>${memberName(c.memberId)}</td>
          <td>${c.type}</td>
          <td>${money(c.amount)}</td>
        </tr>`
          )
          .join("")
      : `<tr><td colspan="4" class="empty">No contributions yet</td></tr>`;

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

  function renderMembers() {
    const q = ($("#memberSearch").value || "").toLowerCase().trim();
    const rows = state.members
      .filter((m) => {
        const hay = `${m.firstName} ${m.lastName} ${m.email} ${m.phone}`.toLowerCase();
        return !q || hay.includes(q);
      })
      .sort((a, b) => a.lastName.localeCompare(b.lastName));

    $("#membersTable").innerHTML = rows.length
      ? rows
          .map(
            (m) => `
        <tr>
          <td><strong>${m.firstName} ${m.lastName}</strong></td>
          <td>${m.email || "—"}</td>
          <td>${m.phone || "—"}</td>
          <td><span class="badge ${m.status === "Active" ? "active" : "inactive"}">${m.status}</span></td>
          <td>${formatDate(m.joined)}</td>
          <td>
            <div class="row-actions">
              <button class="btn small" data-edit-member="${m.id}">Edit</button>
              <button class="btn small danger" data-del-member="${m.id}">Delete</button>
            </div>
          </td>
        </tr>`
          )
          .join("")
      : `<tr><td colspan="6" class="empty">No members found</td></tr>`;
  }

  function renderContributions() {
    const filter = $("#contributionFilter").value;
    const rows = [...state.contributions]
      .filter((c) => filter === "all" || c.type === filter)
      .sort((a, b) => b.date.localeCompare(a.date));

    $("#contributionsTable").innerHTML = rows.length
      ? rows
          .map(
            (c) => `
        <tr>
          <td>${formatDate(c.date)}</td>
          <td>${memberName(c.memberId)}</td>
          <td>${c.type}</td>
          <td>${c.method}</td>
          <td>${money(c.amount)}</td>
          <td>${c.notes || "—"}</td>
          <td>
            <div class="row-actions">
              <button class="btn small" data-edit-contribution="${c.id}">Edit</button>
              <button class="btn small danger" data-del-contribution="${c.id}">Delete</button>
            </div>
          </td>
        </tr>`
          )
          .join("")
      : `<tr><td colspan="7" class="empty">No contributions recorded</td></tr>`;
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

  function renderReports() {
    const byType = {};
    state.contributions.forEach((c) => {
      byType[c.type] = (byType[c.type] || 0) + Number(c.amount);
    });
    const maxType = Math.max(...Object.values(byType), 1);

    $("#reportByType").innerHTML = Object.keys(byType).length
      ? Object.entries(byType)
          .sort((a, b) => b[1] - a[1])
          .map(
            ([type, total]) => `
          <div class="bar-row">
            <span>${type}</span>
            <div class="bar-track"><div class="bar-fill" style="width:${(total / maxType) * 100}%"></div></div>
            <strong>${money(total)}</strong>
          </div>`
          )
          .join("")
      : `<p class="empty">No giving data yet</p>`;

    const active = state.members.filter((m) => m.status === "Active").length;
    const inactive = state.members.length - active;
    $("#reportMembership").innerHTML = `
      <li><span>Total members</span><strong>${state.members.length}</strong></li>
      <li><span>Active</span><strong>${active}</strong></li>
      <li><span>Inactive</span><strong>${inactive}</strong></li>
      <li><span>Total recorded giving</span><strong>${money(
        state.contributions.reduce((s, c) => s + Number(c.amount), 0)
      )}</strong></li>
      <li><span>Scheduled events</span><strong>${state.events.length}</strong></li>
    `;

    const months = {};
    state.contributions.forEach((c) => {
      const key = c.date.slice(0, 7);
      months[key] = (months[key] || 0) + Number(c.amount);
    });
    const entries = Object.entries(months).sort((a, b) => a[0].localeCompare(b[0])).slice(-6);
    const maxMonth = Math.max(...entries.map(([, v]) => v), 1);

    $("#reportMonthly").innerHTML = entries.length
      ? entries
          .map(([key, total]) => {
            const label = new Date(key + "-01").toLocaleString("en-GB", {
              month: "short",
              year: "numeric",
            });
            return `
            <div class="bar-row">
              <span>${label}</span>
              <div class="bar-track"><div class="bar-fill" style="width:${(total / maxMonth) * 100}%"></div></div>
              <strong>${money(total)}</strong>
            </div>`;
          })
          .join("")
      : `<p class="empty">No monthly totals yet</p>`;
  }

  function renderAll() {
    renderDashboard();
    renderMembers();
    renderContributions();
    renderEvents();
    renderReports();
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

  function memberOptions(selected) {
    return state.members
      .map(
        (m) =>
          `<option value="${m.id}" ${m.id === selected ? "selected" : ""}>${m.firstName} ${m.lastName}</option>`
      )
      .join("");
  }

  function memberForm(m = {}) {
    return `
      <div class="field-row">
        <div class="field">
          <label for="firstName">First name</label>
          <input id="firstName" name="firstName" required value="${m.firstName || ""}" />
        </div>
        <div class="field">
          <label for="lastName">Last name</label>
          <input id="lastName" name="lastName" required value="${m.lastName || ""}" />
        </div>
      </div>
      <div class="field-row">
        <div class="field">
          <label for="email">Email</label>
          <input id="email" name="email" type="email" value="${m.email || ""}" />
        </div>
        <div class="field">
          <label for="phone">Phone</label>
          <input id="phone" name="phone" value="${m.phone || ""}" />
        </div>
      </div>
      <div class="field-row">
        <div class="field">
          <label for="status">Status</label>
          <select id="status" name="status">
            <option ${m.status === "Active" ? "selected" : ""}>Active</option>
            <option ${m.status === "Inactive" ? "selected" : ""}>Inactive</option>
          </select>
        </div>
        <div class="field">
          <label for="joined">Joined</label>
          <input id="joined" name="joined" type="date" required value="${m.joined || new Date().toISOString().slice(0, 10)}" />
        </div>
      </div>
      <div class="field">
        <label for="notes">Notes</label>
        <textarea id="notes" name="notes">${m.notes || ""}</textarea>
      </div>`;
  }

  function contributionForm(c = {}) {
    return `
      <div class="field">
        <label for="memberId">Member</label>
        <select id="memberId" name="memberId" required>
          <option value="">Select member…</option>
          ${memberOptions(c.memberId)}
        </select>
      </div>
      <div class="field-row">
        <div class="field">
          <label for="date">Date</label>
          <input id="date" name="date" type="date" required value="${c.date || new Date().toISOString().slice(0, 10)}" />
        </div>
        <div class="field">
          <label for="amount">Amount (GH₵)</label>
          <input id="amount" name="amount" type="number" min="0" step="0.01" required value="${c.amount ?? ""}" />
        </div>
      </div>
      <div class="field-row">
        <div class="field">
          <label for="type">Type</label>
          <select id="type" name="type">
            ${["Tithe", "Offering", "Special", "Pledge"]
              .map((t) => `<option ${c.type === t ? "selected" : ""}>${t}</option>`)
              .join("")}
          </select>
        </div>
        <div class="field">
          <label for="method">Method</label>
          <select id="method" name="method">
            ${["Cash", "Card", "Bank transfer", "Cheque"]
              .map((t) => `<option ${c.method === t ? "selected" : ""}>${t}</option>`)
              .join("")}
          </select>
        </div>
      </div>
      <div class="field">
        <label for="notes">Notes</label>
        <textarea id="notes" name="notes">${c.notes || ""}</textarea>
      </div>`;
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

    if (modalMode === "member") {
      const record = {
        id: editingId || crypto.randomUUID(),
        firstName: v.firstName,
        lastName: v.lastName,
        email: v.email,
        phone: v.phone,
        status: v.status,
        joined: v.joined,
        notes: v.notes,
      };
      if (editingId) {
        state.members = state.members.map((m) => (m.id === editingId ? record : m));
      } else {
        state.members.push(record);
      }
    }

    if (modalMode === "contribution") {
      const record = {
        id: editingId || crypto.randomUUID(),
        memberId: v.memberId,
        date: v.date,
        type: v.type,
        method: v.method,
        amount: Number(v.amount),
        notes: v.notes,
      };
      if (editingId) {
        state.contributions = state.contributions.map((c) =>
          c.id === editingId ? record : c
        );
      } else {
        state.contributions.push(record);
      }
    }

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

  $("#addMemberBtn").addEventListener("click", () =>
    openModal("Add member", memberForm(), "member")
  );
  $("#addContributionBtn").addEventListener("click", () => {
    if (!state.members.length) {
      alert("Add a member before recording a contribution.");
      return;
    }
    openModal("Record contribution", contributionForm(), "contribution");
  });
  $("#addEventBtn").addEventListener("click", () =>
    openModal("Add event", eventForm(), "event")
  );

  $("#memberSearch").addEventListener("input", renderMembers);
  $("#contributionFilter").addEventListener("change", renderContributions);

  document.addEventListener("click", (e) => {
    const t = e.target;
    if (!(t instanceof HTMLElement)) return;

    if (t.dataset.editMember) {
      const m = state.members.find((x) => x.id === t.dataset.editMember);
      if (m) openModal("Edit member", memberForm(m), "member", m.id);
    }
    if (t.dataset.delMember) {
      if (confirm("Delete this member?")) {
        const id = t.dataset.delMember;
        state.members = state.members.filter((m) => m.id !== id);
        state.contributions = state.contributions.filter((c) => c.memberId !== id);
        save(state);
        renderAll();
      }
    }
    if (t.dataset.editContribution) {
      const c = state.contributions.find((x) => x.id === t.dataset.editContribution);
      if (c) openModal("Edit contribution", contributionForm(c), "contribution", c.id);
    }
    if (t.dataset.delContribution) {
      if (confirm("Delete this contribution?")) {
        state.contributions = state.contributions.filter(
          (c) => c.id !== t.dataset.delContribution
        );
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
  });

  $("#exportBtn").addEventListener("click", () => {
    const lines = [
      ["Date", "Member", "Type", "Method", "Amount", "Notes"].join(","),
      ...state.contributions.map((c) =>
        [
          c.date,
          `"${memberName(c.memberId)}"`,
          c.type,
          c.method,
          c.amount,
          `"${(c.notes || "").replace(/"/g, '""')}"`,
        ].join(",")
      ),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "st-francis-contributions.csv";
    a.click();
    URL.revokeObjectURL(url);
  });

  renderAll();
})();
