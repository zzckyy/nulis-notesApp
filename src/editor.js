import "./style.css";
import Quill from "quill";
import "quill/dist/quill.core.css";
import "quill/dist/quill.snow.css";
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

function getNoteById(id) {
  return loadNotes().find((n) => n.id === id) || null;
}

function updateNote(id, patch) {
  const notes = loadNotes();
  const idx = notes.findIndex((n) => n.id === id);
  if (idx === -1) return;
  notes[idx] = { ...notes[idx], ...patch, updatedAt: Date.now() };
  saveNotes(notes);
}

// ─── Get note ID from URL ────────────────────────────────────────────────────

const params = new URLSearchParams(window.location.search);
const noteId = params.get("id");

// Redirect to library if no valid ID
if (!noteId) {
  window.location.href = "/";
}

const note = getNoteById(noteId);

if (!note) {
  window.location.href = "/";
}

// ─── Build editor UI ─────────────────────────────────────────────────────────

document.querySelector("#editor").innerHTML = `
  <div id="editor-app">

    <!-- Nav -->
    <nav class="editor-nav" role="navigation" aria-label="Editor navigation">
      <a href="/" class="editor-nav__back" aria-label="Back to library" title="Back">
        <i class="fa-solid fa-chevron-left"></i>
      </a>
      <span class="editor-nav__title" id="nav-title">${escapeHtml(note.title)}</span>
      <span class="editor-nav__status" id="save-status" aria-live="polite">
        <span class="status-dot" id="status-dot"></span>
        <span id="status-text">Saved</span>
      </span>
    </nav>

    <!-- Quill editor area -->
    <div id="editor-area">
      <div id="quill-editor"></div>
    </div>

    <!-- Action bar -->
    <div id="action-bar">
      <div class="action-group">
        <button id="undoBtn" class="action-btn" title="Undo" aria-label="Undo">
          <i class="fa-solid fa-arrow-rotate-left"></i>
          <span>Undo</span>
        </button>
        <button id="redoBtn" class="action-btn" title="Redo" aria-label="Redo">
          <i class="fa-solid fa-arrow-rotate-right"></i>
          <span>Redo</span>
        </button>
      </div>

      <label class="view-toggle" for="viewMode" title="Toggle preview mode" aria-label="Toggle preview mode">
        <input type="checkbox" id="viewMode" role="switch" aria-checked="false">
        <span class="toggle-pill"></span>
        <span class="toggle-label">
          <i class="fa-solid fa-eye" aria-hidden="true"></i>
        </span>
      </label>
    </div>

  </div>
`;

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ─── Init Quill ──────────────────────────────────────────────────────────────

const toolbarOptions = [
  ["bold", "italic", "underline", "strike", "clean"],
  [{ color: [] }, { background: [] }],
  ["link", "image"],
  [{ header: [1, 2, 3, 4, 5, 6, false] }, { align: [] }],
  [{ list: "ordered" }, { list: "bullet" }, { list: "check" }],
];

const quill = new Quill("#quill-editor", {
  modules: {
    toolbar: toolbarOptions,
    history: { delay: 1000, maxStack: 100, userOnly: false },
  },
  placeholder: "Start writing…",
  theme: "snow",
});

// ─── Load saved content ──────────────────────────────────────────────────────

if (note.content) {
  try {
    const delta = JSON.parse(note.content);
    quill.setContents(delta, "silent");
  } catch {
    quill.setText(note.content, "silent");
  }
}

// Move cursor to end
quill.setSelection(quill.getLength(), 0);

// ─── Auto-save on change ─────────────────────────────────────────────────────

const statusDot = document.getElementById("status-dot");
const statusText = document.getElementById("status-text");

let saveTimer = null;

function setSaving() {
  statusDot.className = "status-dot saving";
  statusText.textContent = "Saving…";
}

function setSaved() {
  statusDot.className = "status-dot saved";
  statusText.textContent = "Saved";
}

quill.on("text-change", () => {
  setSaving();
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    const delta = quill.getContents();
    const text = quill.getText().trim();
    updateNote(noteId, {
      content: JSON.stringify(delta),
      contentText: text,
    });
    setSaved();
  }, 600);
});

// ─── Undo / Redo ─────────────────────────────────────────────────────────────

document.getElementById("undoBtn").addEventListener("click", () => quill.history.undo());
document.getElementById("redoBtn").addEventListener("click", () => quill.history.redo());

// ─── View mode toggle ─────────────────────────────────────────────────────────

document.getElementById("viewMode").addEventListener("change", function () {
  const isPreview = this.checked;
  this.setAttribute("aria-checked", String(isPreview));
  if (isPreview) {
    quill.enable(false);
  } else {
    quill.enable(true);
    quill.focus();
  }
});
