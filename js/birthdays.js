(() => {
  const STORAGE_KEY = "stfrancis-church-data-v1";

  function loadData() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return { events: [], messages: [], birthdays: [] };
      }
      const data = JSON.parse(raw);
      if (!Array.isArray(data.birthdays)) data.birthdays = [];
      if (!Array.isArray(data.messages)) data.messages = [];
      return data;
    } catch {
      return { events: [], messages: [], birthdays: [] };
    }
  }

  function saveData(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  function resizeImage(file, maxSize = 900, quality = 0.72) {
    return new Promise((resolve, reject) => {
      if (!file || !file.type.startsWith("image/")) {
        reject(new Error("Please choose an image file."));
        return;
      }
      if (file.size > 6 * 1024 * 1024) {
        reject(new Error("Image must be under 6MB."));
        return;
      }

      const reader = new FileReader();
      reader.onerror = () => reject(new Error("Could not read the image."));
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error("Could not load the image."));
        img.onload = () => {
          const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
          const width = Math.round(img.width * scale);
          const height = Math.round(img.height * scale);
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL("image/jpeg", quality));
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  function normalizeMonthDay(value) {
    if (!value) return "";
    // Accept MM-DD or legacy YYYY-MM-DD
    if (/^\d{2}-\d{2}$/.test(value)) return value;
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value.slice(5);
    return "";
  }

  function formatBirthday(dateStr) {
    const md = normalizeMonthDay(dateStr);
    if (!md) return "";
    const d = new Date(`2000-${md}T00:00:00`);
    return d.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
    });
  }

  function monthDayKey(dateStr) {
    return normalizeMonthDay(dateStr);
  }

  function isThisMonth(dateStr) {
    const md = normalizeMonthDay(dateStr);
    if (!md) return false;
    const now = new Date();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    return md.startsWith(mm);
  }

  function daysInMonth(month) {
    const m = Number(month);
    if (!m) return 31;
    return new Date(2000, m, 0).getDate();
  }

  function fillDayOptions(daySelect, month, selectedDay = "") {
    if (!daySelect) return;
    const days = daysInMonth(month);
    const previous = selectedDay || daySelect.value;
    daySelect.innerHTML = `<option value="" disabled ${previous ? "" : "selected"}>Select day</option>`;
    for (let day = 1; day <= days; day += 1) {
      const value = String(day).padStart(2, "0");
      const opt = document.createElement("option");
      opt.value = value;
      opt.textContent = String(day);
      if (previous === value && Number(previous) <= days) opt.selected = true;
      daySelect.appendChild(opt);
    }
  }

  window.BirthdayUtils = {
    STORAGE_KEY,
    loadData,
    saveData,
    resizeImage,
    formatBirthday,
    monthDayKey,
    isThisMonth,
    normalizeMonthDay,
  };

  document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("birthdayForm");
    const note = document.getElementById("birthdayFormNote");
    const preview = document.getElementById("birthdayPhotoPreview");
    const photoInput = document.getElementById("birthdayPhoto");
    const gallery = document.getElementById("birthdayGallery");
    const monthSelect = document.getElementById("birthdayMonth");
    const daySelect = document.getElementById("birthdayDay");

    if (monthSelect && daySelect) {
      fillDayOptions(daySelect, monthSelect.value);
      monthSelect.addEventListener("change", () => {
        fillDayOptions(daySelect, monthSelect.value, daySelect.value);
      });
    }

    if (photoInput && preview) {
      photoInput.addEventListener("change", async () => {
        const file = photoInput.files?.[0];
        if (!file) {
          preview.hidden = true;
          preview.removeAttribute("src");
          return;
        }
        try {
          const dataUrl = await resizeImage(file);
          preview.src = dataUrl;
          preview.hidden = false;
          preview.dataset.dataUrl = dataUrl;
        } catch (err) {
          if (note) note.textContent = err.message;
          photoInput.value = "";
          preview.hidden = true;
        }
      });
    }

    if (form) {
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const data = new FormData(form);
        const name = String(data.get("name") || "").trim();
        const month = String(data.get("month") || "").trim();
        const day = String(data.get("day") || "").trim();
        const date = normalizeMonthDay(`${month}-${day}`);
        const contact = String(data.get("contact") || "").trim();
        const file = photoInput?.files?.[0];

        if (!date) {
          if (note) note.textContent = "Please select your birth month and day.";
          return;
        }

        if (!file && !preview?.dataset.dataUrl) {
          if (note) note.textContent = "Please upload a photo for the flyer.";
          return;
        }

        try {
          const imageDataUrl =
            preview?.dataset.dataUrl || (await resizeImage(file));
          const store = loadData();
          store.birthdays.unshift({
            id: crypto.randomUUID(),
            name,
            date,
            contact,
            imageDataUrl,
            status: "pending",
            submittedAt: new Date().toISOString(),
            publishedAt: null,
            flyerDataUrl: null,
          });
          saveData(store);

          form.reset();
          fillDayOptions(daySelect, "");
          if (preview) {
            preview.hidden = true;
            preview.removeAttribute("src");
            delete preview.dataset.dataUrl;
          }
          if (note) {
            note.textContent =
              "Thank you! Your photo and details were received. The media team will design your flyer and publish it here.";
          }
          renderGallery();
        } catch (err) {
          if (note) note.textContent = err.message || "Could not submit. Try again.";
        }
      });
    }

    function renderGallery() {
      if (!gallery) return;
      const published = loadData()
        .birthdays.filter((b) => b.status === "published")
        .sort((a, b) => monthDayKey(a.date).localeCompare(monthDayKey(b.date)));

      if (!published.length) {
        gallery.innerHTML =
          `<p class="empty-birthdays">No published birthday flyers yet. Submit yours below — the sanctuary team will upload it soon.</p>`;
        return;
      }

      gallery.innerHTML = published
        .map(
          (b) => `
        <article class="birthday-card ${isThisMonth(b.date) ? "this-month" : ""}">
          <div class="birthday-photo" style="background-image:url('${b.flyerDataUrl || b.imageDataUrl}')"></div>
          <div class="birthday-card-body">
            <h3>${escapeHtml(b.name)}</h3>
            <p class="birthday-date">${formatBirthday(b.date)}</p>
            ${
              b.flyerDataUrl
                ? `<button type="button" class="btn-download-flyer" data-download-flyer="${b.id}">Download flyer</button>`
                : ""
            }
          </div>
        </article>`
        )
        .join("");
    }

    function escapeHtml(value) {
      return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
    }

    function downloadFlyerById(id) {
      const item = loadData().birthdays.find((b) => b.id === id);
      if (!item?.flyerDataUrl) return;
      const a = document.createElement("a");
      a.href = item.flyerDataUrl;
      const safeName = (item.name || "birthday")
        .toLowerCase()
        .replace(/\s+/g, "-");
      const ext = item.flyerDataUrl.startsWith("data:image/png") ? "png" : "jpg";
      a.download = `${safeName}-birthday-flyer.${ext}`;
      a.click();
    }

    gallery?.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-download-flyer]");
      if (!btn) return;
      downloadFlyerById(btn.dataset.downloadFlyer);
    });

    renderGallery();
  });
})();
