// YAML to JSON and back, live, in the browser. js-yaml is a page global.
import { debounce } from "/js/ui.js";

const $ = (id) => document.getElementById(id);
const inp = $("yj-in"), out = $("yj-out"), err = $("yj-error");
const inLabel = $("yj-in-label"), outLabel = $("yj-out-label");
let dir = "y2j";

function convert() {
  err.textContent = "";
  const raw = inp.value.trim();
  if (!raw) { out.value = ""; return; }
  try {
    if (dir === "y2j") {
      out.value = JSON.stringify(jsyaml.load(raw), null, 2);
    } else {
      out.value = jsyaml.dump(JSON.parse(raw), { indent: 2, lineWidth: -1 });
    }
  } catch (e) {
    err.textContent = e.message;
    out.value = "";
  }
}

function updateLabels() {
  const y2j = dir === "y2j";
  inLabel.textContent = y2j ? "YAML" : "JSON";
  outLabel.textContent = y2j ? "JSON" : "YAML";
}

const run = debounce(convert, 120);
inp.addEventListener("input", run);

// Swap flips the direction and carries the converted result over as the new input.
$("yj-swap").addEventListener("click", () => {
  dir = dir === "y2j" ? "j2y" : "y2j";
  inp.value = out.value;
  updateLabels();
  convert();
});

$("yj-example").addEventListener("click", () => {
  inp.value = dir === "y2j"
    ? "name: NoByte\ntools:\n  - json formatter\n  - yaml to json\nprivate: true\ncount: 72"
    : '{\n  "name": "NoByte",\n  "tools": ["json formatter", "yaml to json"],\n  "private": true,\n  "count": 72\n}';
  convert();
});

updateLabels();
convert();
