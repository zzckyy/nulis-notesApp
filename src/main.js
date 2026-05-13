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
    content: "",          // Quill Delta JSON string
    contentText: "",      // plain text for preview
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

// ─── Date formatting ────────────────────────────────────────────────────────

function formatDate(ts) {
  const d = new Date(ts);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "2-digit" });
}

// ─── Note card accent color (cycles through palette) ────────────────────────

const ACCENTS = ["#C9B8E8", "#B8C9E8", "#E8C9B8", "#B8E8C9", "#E8DDB8", "#D4B8E8"];

function accentColor(index) {
  return ACCENTS[index % ACCENTS.length];
}

// ─── Render library ─────────────────────────────────────────────────────────

function renderLibrary(filter = "") {
  const notes = loadNotes();
  const query = filter.toLowerCase().trim();
  const filtered = query
    ? notes.filter(
        (n) =>
          n.title.toLowerCase().includes(query) ||
          n.contentText.toLowerCase().includes(query)
      )
    : notes;

  const countEl = document.getElementById("notes-count");
  const listEl = document.getElementById("notes-list");

  if (countEl) countEl.textContent = filtered.length;

  if (!listEl) return;

  if (filtered.length === 0) {
    listEl.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <div class="empty-state__icon">
          <i class="fa-regular fa-note-sticky"></i>
        </div>
        <p class="empty-state__title">${query ? "No results found" : "No notes yet"}</p>
        <p class="empty-state__sub">${
          query
            ? "Try a different search term."
            : "Tap the + button to create your first note."
        }</p>
      </div>
    `;
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
        <div class="note-card" data-id="${note.id}" role="button" tabindex="0" aria-label="Open note: ${note.title}">
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
        </div>
      `;
    })
    .join("");

  // Open note on click / keyboard
  listEl.querySelectorAll(".note-card").forEach((card) => {
    card.addEventListener("click", (e) => {
      if (e.target.closest("[data-delete]")) return;
      const id = card.dataset.id;
      window.location.href = `/editor.html?id=${id}`;
    });
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        card.click();
      }
    });
  });

  // Delete note
  listEl.querySelectorAll("[data-delete]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const id = btn.dataset.delete;
      deleteNote(id);
    });
  });
}

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function deleteNote(id) {
  const notes = loadNotes().filter((n) => n.id !== id);
  saveNotes(notes);
  renderLibrary(document.getElementById("search-input")?.value || "");
}

// ─── Modal ──────────────────────────────────────────────────────────────────

function openModal() {
  const overlay = document.getElementById("new-note-modal");
  overlay.classList.add("is-active");
  setTimeout(() => document.getElementById("note-title-input")?.focus(), 50);
}

function closeModal() {
  const overlay = document.getElementById("new-note-modal");
  overlay.classList.remove("is-active");
  const input = document.getElementById("note-title-input");
  if (input) input.value = "";
}

function handleCreateNote() {
  const input = document.getElementById("note-title-input");
  const title = input?.value || "";
  const note = createNote(title);
  const notes = loadNotes();
  notes.unshift(note);
  saveNotes(notes);
  closeModal();
  window.location.href = `/editor.html?id=${note.id}`;
}

// ─── Mount app ──────────────────────────────────────────────────────────────

document.querySelector("#app").innerHTML = `
  <!-- Nav -->
  <nav class="lib-nav" role="navigation" aria-label="Main navigation">
    <span class="lib-nav__brand">nulis</span>
    <div class="lib-nav__actions">
      <button class="icon-btn" id="sort-btn" title="Sort notes" aria-label="Sort notes">
        <i class="fa-solid fa-arrow-up-wide-short"></i>
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

  <!-- New Note Modal -->
  <div class="modal-overlay" id="new-note-modal" role="dialog" aria-modal="true" aria-labelledby="modal-heading">
    <div class="modal-sheet">
      <div class="modal-handle" aria-hidden="true"></div>
      <p class="modal-title" id="modal-heading">New Note</p>
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
`;

// ─── Wire up events ──────────────────────────────────────────────────────────

// FAB
document.getElementById("fab-new").addEventListener("click", openModal);

// Modal cancel
document.getElementById("modal-cancel").addEventListener("click", closeModal);

// Modal create
document.getElementById("modal-create").addEventListener("click", handleCreateNote);

// Enter key in title input
document.getElementById("note-title-input").addEventListener("keydown", (e) => {
  if (e.key === "Enter") handleCreateNote();
  if (e.key === "Escape") closeModal();
});

// Close modal on overlay click
document.getElementById("new-note-modal").addEventListener("click", (e) => {
  if (e.target === e.currentTarget) closeModal();
});

// Search
document.getElementById("search-input").addEventListener("input", (e) => {
  renderLibrary(e.target.value);
});

// Initial render
renderLibrary();
