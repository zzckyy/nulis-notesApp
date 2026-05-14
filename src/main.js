import "./style.css";
import "bulma/css/bulma.css";
import "./assets/fontawesome-free-7.2.0-web/css/all.css";

// ─── LocalStorage helpers ───────────────────────────────────────────────────

const STORAGE_KEY = "nulis_notes";

function loadNotes() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveNotes(notes) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
}

function createNote(title) {
  return {
    id: crypto.randomUUID(),
    title: title.trim() || "Untitled",
    content: "",
    contentText: "",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

// ─── Utilities ──────────────────────────────────────────────────────────────

function formatDate(ts) {
  const d = new Date(ts);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "2-digit" });
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const ACCENTS = ["#C9B8E8", "#B8C9E8", "#E8C9B8", "#B8E8C9", "#E8DDB8", "#D4B8E8"];
function accentColor(i) { return ACCENTS[i % ACCENTS.length]; }

// ─── Toast notification ──────────────────────────────────────────────────────

function showToast(message, type = "default") {
  const existing = document.getElementById("nulis-toast");
  if (existing) existing.remove();

  const toast = document.createElement("div");
  toast.id = "nulis-toast";
  toast.className = `toast toast--${type}`;
  toast.setAttribute("role", "status");
  toast.setAttribute("aria-live", "polite");
  toast.innerHTML = `
    <i class="fa-solid ${type === "success" ? "fa-circle-check" : type === "danger" ? "fa-circle-exclamation" : "fa-circle-info"}"></i>
    <span>${escapeHtml(message)}</span>
  `;
  document.body.appendChild(toast);

  // Trigger animation
  requestAnimationFrame(() => toast.classList.add("toast--visible"));

  setTimeout(() => {
    toast.classList.remove("toast--visible");
    toast.addEventListener("transitionend", () => toast.remove(), { once: true });
  }, 3000);
}

// ─── Confirm modal ───────────────────────────────────────────────────────────
// Returns a Promise<boolean> — resolves true on confirm, false on cancel.

function openConfirm({ title, message, confirmLabel = "Delete", isDanger = true }) {
  return new Promise((resolve) => {
    const overlay = document.getElementById("confirm-modal");
    const titleEl = document.getElementById("confirm-title");
    const msgEl   = document.getElementById("confirm-message");
    const okBtn   = document.getElementById("confirm-ok");
    const cancelBtn = document.getElementById("confirm-cancel");

    titleEl.textContent   = title;
    msgEl.textContent     = message;
    okBtn.textContent     = confirmLabel;
    okBtn.className       = `btn ${isDanger ? "btn-danger" : "btn-primary"}`;

    overlay.classList.add("is-active");
    cancelBtn.focus();

    function cleanup(result) {
      overlay.classList.remove("is-active");
      okBtn.removeEventListener("click", onOk);
      cancelBtn.removeEventListener("click", onCancel);
      overlay.removeEventListener("click", onBackdrop);
      document.removeEventListener("keydown", onKey);
      resolve(result);
    }

    const onOk      = () => cleanup(true);
    const onCancel  = () => cleanup(false);
    const onBackdrop = (e) => { if (e.target === overlay) cleanup(false); };
    const onKey     = (e) => { if (e.key === "Escape") cleanup(false); };

    okBtn.addEventListener("click", onOk);
    cancelBtn.addEventListener("click", onCancel);
    overlay.addEventListener("click", onBackdrop);
    document.addEventListener("keydown", onKey);
  });
}

// ─── Render library ──────────────────────────────────────────────────────────

function renderLibrary(filter = "") {
  const notes   = loadNotes();
  const query   = filter.toLowerCase().trim();
  const filtered = query
    ? notes.filter(
        (n) =>
          n.title.toLowerCase().includes(query) ||
          n.contentText.toLowerCase().includes(query)
      )
    : notes;

  const countEl = document.getElementById("notes-count");
  const listEl  = document.getElementById("notes-list");

  if (countEl) countEl.textContent = filtered.length;
  if (!listEl) return;

  if (filtered.length === 0) {
    listEl.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <div class="empty-state__icon"><i class="fa-regular fa-note-sticky"></i></div>
        <p class="empty-state__title">${query ? "No results found" : "No notes yet"}</p>
        <p class="empty-state__sub">${
          query
            ? "Try a different search term."
            : "Tap the + button to create your first note."
        }</p>
      </div>`;
    return;
  }

  listEl.innerHTML = filtered
    .slice()
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .map((note, i) => {
      const preview = note.contentText
        ? note.contentText.slice(0, 80).replace(/\n/g, " ")
        : "No content yet…";
      return `
        <div class="note-card" data-id="${note.id}" role="button" tabindex="0" aria-label="Open note: ${escapeHtml(note.title)}">
          <div class="note-card__accent" style="background:${accentColor(i)}"></div>
          <div class="note-card__body">
            <p class="note-card__title">${escapeHtml(note.title)}</p>
            <p class="note-card__preview">${escapeHtml(preview)}</p>
            <span class="note-card__meta">
              <i class="fa-regular fa-clock"></i>
              Last edited: ${formatDate(note.updatedAt)}
            </span>
          </div>
          <button class="note-card__delete" data-delete="${note.id}" aria-label="Delete note" title="Delete">
            <i class="fa-solid fa-trash-can"></i>
          </button>
        </div>`;
    })
    .join("");

  // Open note
  listEl.querySelectorAll(".note-card").forEach((card) => {
    card.addEventListener("click", (e) => {
      if (e.target.closest("[data-delete]")) return;
      window.location.href = `/editor.html?id=${card.dataset.id}`;
    });
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); card.click(); }
    });
  });

  // Delete note — with confirm modal
  listEl.querySelectorAll("[data-delete]").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      e.stopPropagation();
      const id    = btn.dataset.delete;
      const note  = loadNotes().find((n) => n.id === id);
      const title = note?.title || "this note";

      const confirmed = await openConfirm({
        title: "Delete note?",
        message: `"${title}" will be permanently deleted.`,
        confirmLabel: "Delete",
        isDanger: true,
      });

      if (!confirmed) return;
      const notes = loadNotes().filter((n) => n.id !== id);
      saveNotes(notes);
      renderLibrary(document.getElementById("search-input")?.value || "");
      showToast("Note deleted", "default");
    });
  });
}

// ─── New Note modal ──────────────────────────────────────────────────────────

function openNewNoteModal() {
  const overlay = document.getElementById("new-note-modal");
  overlay.classList.add("is-active");
  setTimeout(() => document.getElementById("note-title-input")?.focus(), 50);
}

function closeNewNoteModal() {
  document.getElementById("new-note-modal").classList.remove("is-active");
  document.getElementById("note-title-input").value = "";
}

function handleCreateNote() {
  const title = document.getElementById("note-title-input")?.value || "";
  const note  = createNote(title);
  const notes = loadNotes();
  notes.unshift(note);
  saveNotes(notes);
  closeNewNoteModal();
  window.location.href = `/editor.html?id=${note.id}`;
}

// ─── Settings drawer ─────────────────────────────────────────────────────────

function openSettings() {
  document.getElementById("settings-drawer").classList.add("is-active");
  document.getElementById("settings-drawer").querySelector(".drawer-sheet").focus();
}

function closeSettings() {
  document.getElementById("settings-drawer").classList.remove("is-active");
}

// Backup — export notes as a JSON file download
function handleBackup() {
  const notes = loadNotes();
  if (notes.length === 0) {
    showToast("No notes to back up", "default");
    return;
  }

  const payload = JSON.stringify({ version: 1, exportedAt: Date.now(), notes }, null, 2);
  const blob    = new Blob([payload], { type: "application/json" });
  const url     = URL.createObjectURL(blob);
  const a       = document.createElement("a");
  const date    = new Date().toISOString().slice(0, 10);

  a.href     = url;
  a.download = `nulis-backup-${date}.json`;
  a.click();
  URL.revokeObjectURL(url);

  showToast(`Backed up ${notes.length} note${notes.length !== 1 ? "s" : ""}`, "success");
}

// Restore — import from a JSON backup file
function handleRestore() {
  const input = document.createElement("input");
  input.type  = "file";
  input.accept = "application/json,.json";

  input.addEventListener("change", async () => {
    const file = input.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      // Accept both raw array and our versioned format
      const incoming = Array.isArray(data) ? data : data?.notes;
      if (!Array.isArray(incoming)) throw new Error("Invalid format");

      // Validate each note has minimum required fields
      const valid = incoming.filter(
        (n) => n && typeof n.id === "string" && typeof n.title === "string"
      );
      if (valid.length === 0) throw new Error("No valid notes found");

      const existing = loadNotes();
      const existingIds = new Set(existing.map((n) => n.id));

      // Merge: keep existing, add new ones that don't conflict
      const merged   = [...existing];
      let   imported = 0;

      for (const n of valid) {
        if (existingIds.has(n.id)) {
          // Overwrite if backup is newer
          const idx = merged.findIndex((m) => m.id === n.id);
          if (n.updatedAt > merged[idx].updatedAt) {
            merged[idx] = n;
            imported++;
          }
        } else {
          merged.push(n);
          imported++;
        }
      }

      saveNotes(merged);
      renderLibrary(document.getElementById("search-input")?.value || "");
      closeSettings();
      showToast(`Restored ${imported} note${imported !== 1 ? "s" : ""}`, "success");
    } catch (err) {
      showToast("Restore failed — invalid backup file", "danger");
    }
  });

  input.click();
}

// Delete all notes
async function handleDeleteAll() {
  const notes = loadNotes();
  if (notes.length === 0) {
    showToast("No notes to delete", "default");
    return;
  }

  closeSettings();

  const confirmed = await openConfirm({
    title: "Delete all notes?",
    message: `All ${notes.length} note${notes.length !== 1 ? "s" : ""} will be permanently deleted. This cannot be undone.`,
    confirmLabel: "Delete all",
    isDanger: true,
  });

  if (!confirmed) return;
  saveNotes([]);
  renderLibrary("");
  showToast("All notes deleted", "default");
}

// ─── Mount HTML ───────────────────────────────────────────────────────────────

document.querySelector("#app").innerHTML = `

  <!-- Nav -->
  <nav class="lib-nav" role="navigation" aria-label="Main navigation">
    <span class="lib-nav__brand">nulis</span>
    <div class="lib-nav__actions">
      <button class="icon-btn" id="settings-btn" title="Settings" aria-label="Open settings">
        <i class="fa-solid fa-sliders"></i>
      </button>
    </div>
  </nav>

  <!-- Search -->
  <div class="lib-search">
    <div class="lib-search__inner">
      <i class="fa-solid fa-magnifying-glass lib-search__icon" aria-hidden="true"></i>
      <input
        type="search"
        id="search-input"
        class="lib-search__input"
        placeholder="Search notes…"
        aria-label="Search notes"
        autocomplete="off"
      />
    </div>
  </div>

  <!-- Section header -->
  <div class="lib-section">
    <span class="lib-section__title">All Notes</span>
    <span class="lib-section__count" id="notes-count">0</span>
  </div>

  <!-- Notes list -->
  <main id="notes-list" class="notes-list" role="main" aria-label="Notes list"></main>

  <!-- FAB -->
  <button class="fab" id="fab-new" aria-label="Create new note" title="New note">
    <i class="fa-solid fa-plus"></i>
  </button>

  <!-- ── New Note Modal ── -->
  <div class="modal-overlay" id="new-note-modal" role="dialog" aria-modal="true" aria-labelledby="new-note-heading">
    <div class="modal-sheet">
      <div class="modal-handle" aria-hidden="true"></div>
      <p class="modal-title" id="new-note-heading">New Note</p>
      <input
        type="text"
        id="note-title-input"
        class="modal-input"
        placeholder="Note title…"
        maxlength="80"
        aria-label="Note title"
      />
      <div class="modal-actions">
        <button class="btn btn-ghost" id="modal-cancel">Cancel</button>
        <button class="btn btn-primary" id="modal-create">Create</button>
      </div>
    </div>
  </div>

  <!-- ── Confirm Modal ── -->
  <div class="modal-overlay" id="confirm-modal" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title">
    <div class="modal-sheet modal-sheet--sm">
      <div class="modal-handle" aria-hidden="true"></div>
      <div class="confirm-icon">
        <i class="fa-solid fa-triangle-exclamation"></i>
      </div>
      <p class="modal-title" id="confirm-title">Are you sure?</p>
      <p class="modal-desc" id="confirm-message"></p>
      <div class="modal-actions">
        <button class="btn btn-ghost" id="confirm-cancel">Cancel</button>
        <button class="btn btn-danger" id="confirm-ok">Delete</button>
      </div>
    </div>
  </div>

  <!-- ── Settings Drawer ── -->
  <div class="drawer-overlay" id="settings-drawer" role="dialog" aria-modal="true" aria-labelledby="settings-heading">
    <div class="drawer-sheet" tabindex="-1">

      <!-- Drawer header -->
      <div class="drawer-header">
        <h2 class="drawer-title" id="settings-heading">Settings</h2>
        <button class="icon-btn" id="settings-close" aria-label="Close settings">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>

      <!-- Stats pill -->
      <div class="settings-stats" id="settings-stats"></div>

      <!-- Section: Data -->
      <p class="settings-section-label">Data</p>

      <div class="settings-list">

        <button class="settings-item" id="btn-backup">
          <span class="settings-item__icon settings-item__icon--blue">
            <i class="fa-solid fa-cloud-arrow-down"></i>
          </span>
          <span class="settings-item__body">
            <span class="settings-item__title">Backup notes</span>
            <span class="settings-item__sub">Download a JSON file of all your notes</span>
          </span>
          <i class="fa-solid fa-chevron-right settings-item__arrow"></i>
        </button>

        <button class="settings-item" id="btn-restore">
          <span class="settings-item__icon settings-item__icon--green">
            <i class="fa-solid fa-cloud-arrow-up"></i>
          </span>
          <span class="settings-item__body">
            <span class="settings-item__title">Restore notes</span>
            <span class="settings-item__sub">Import from a nulis backup file</span>
          </span>
          <i class="fa-solid fa-chevron-right settings-item__arrow"></i>
        </button>

      </div>

      <!-- Section: Danger zone -->
      <p class="settings-section-label settings-section-label--danger">Danger zone</p>

      <div class="settings-list">

        <button class="settings-item settings-item--danger" id="btn-delete-all">
          <span class="settings-item__icon settings-item__icon--red">
            <i class="fa-solid fa-trash-can"></i>
          </span>
          <span class="settings-item__body">
            <span class="settings-item__title">Delete all notes</span>
            <span class="settings-item__sub">Permanently remove every note</span>
          </span>
          <i class="fa-solid fa-chevron-right settings-item__arrow"></i>
        </button>

      </div>

      <!-- App version -->
      <p class="settings-version">nulis v1.0</p>

    </div>
  </div>

`;

// ─── Wire up events ───────────────────────────────────────────────────────────

// FAB → new note
document.getElementById("fab-new").addEventListener("click", openNewNoteModal);

// New note modal
document.getElementById("modal-cancel").addEventListener("click", closeNewNoteModal);
document.getElementById("modal-create").addEventListener("click", handleCreateNote);
document.getElementById("note-title-input").addEventListener("keydown", (e) => {
  if (e.key === "Enter") handleCreateNote();
  if (e.key === "Escape") closeNewNoteModal();
});
document.getElementById("new-note-modal").addEventListener("click", (e) => {
  if (e.target === e.currentTarget) closeNewNoteModal();
});

// Settings drawer
document.getElementById("settings-btn").addEventListener("click", () => {
  // Refresh stats each time drawer opens
  const notes = loadNotes();
  const total = notes.length;
  const words = notes.reduce((acc, n) => acc + (n.contentText?.split(/\s+/).filter(Boolean).length || 0), 0);
  document.getElementById("settings-stats").innerHTML = `
    <span class="stats-pill"><strong>${total}</strong> note${total !== 1 ? "s" : ""}</span>
  `;
  openSettings();
});
document.getElementById("settings-close").addEventListener("click", closeSettings);
document.getElementById("settings-drawer").addEventListener("click", (e) => {
  if (e.target === e.currentTarget) closeSettings();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && document.getElementById("settings-drawer").classList.contains("is-active")) {
    closeSettings();
  }
});

// Settings actions
document.getElementById("btn-backup").addEventListener("click", handleBackup);
document.getElementById("btn-restore").addEventListener("click", handleRestore);
document.getElementById("btn-delete-all").addEventListener("click", handleDeleteAll);

// Search
document.getElementById("search-input").addEventListener("input", (e) => {
  renderLibrary(e.target.value);
});

// Initial render
renderLibrary();
