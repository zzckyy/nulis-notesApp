import "./style.css";
import Quill from "quill";
import "quill/dist/quill.core.css";
import "quill/dist/quill.snow.css";
import "bulma/css/bulma.css";
import "./assets/fontawesome-free-7.2.0-web/css/all.css";

document.querySelector("#app").innerHTML = `
<div id="app-container">
  <center>
  <div id="editor-area">
    <div id="editor" class="px-0 py-1 m-2"></div>
  </div>
  </center>
  <div id="action-bar" class="is-flex is-justify-content-space-between p-2 m-2">
    <div class="action-group is-flex">
      <button id="undoBtn" class="action-btn" title="Undo">
        <i class="fa-solid fa-arrow-rotate-left"></i>
        <span>Undo</span>
      </button>
      <button id="redoBtn" class="action-btn" title="Redo">
        <i class="fa-solid fa-arrow-rotate-right"></i>
        <span>Redo</span>
      </button>
    </div>

    <label class="view-toggle" for="viewMode" title="Toggle preview mode">
      <input type="checkbox" id="viewMode">
      <span class="toggle-pill"></span>
      <span class="toggle-label">
        <i class="fa-solid fa-eye"></i>
        
      </span>
    </label>
  </div>

</div>
`;

const toolbarOptions = [
  ["bold", "italic", "underline", "strike", "clean"],
  [{ color: [] }, { background: [] }],
  ["link", "image", "video"],
  [{ header: [1, 2, 3, 4, 5, 6, false] }, { align: [] }],
  [{ list: "ordered" }, { list: "bullet" }, { list: "check" }],
  [],
];

const quill = new Quill("#editor", {
  modules: {
    toolbar: toolbarOptions,
    history: { delay: 1000, maxStack: 100, userOnly: false },
  },
  theme: "snow",
});

const undoBtn = document.getElementById("undoBtn");
const redoBtn = document.getElementById("redoBtn");

undoBtn.onclick = () => quill.history.undo();
redoBtn.onclick = () => quill.history.redo();

document.getElementById("viewMode").addEventListener("change", function () {
  if (this.checked) {
    quill.enable(false);
  } else {
    quill.enable();
  }
});
