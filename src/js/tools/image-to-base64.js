// Image to Base64 data URL, with ready-to-paste HTML and CSS.
import { initDropzone, humanBytes, toast } from "/js/ui.js";

initDropzone(document.getElementById("ib-drop"), (files) => {
  const f = files[0];
  if (!f.type.startsWith("image/")) return toast("Choose an image file.", "error");
  if (f.size > 5 * 1024 * 1024) return toast("Pick an image under 5 MB.", "error");
  const reader = new FileReader();
  reader.onload = () => {
    const dataUrl = String(reader.result);
    document.getElementById("ib-info").textContent = `${f.name} · ${humanBytes(f.size)} → data URL ${humanBytes(dataUrl.length)}`;
    const img = document.getElementById("ib-preview");
    img.src = dataUrl;
    img.classList.remove("hidden");
    document.getElementById("ib-outputs").classList.remove("hidden");
    document.getElementById("ib-dataurl").value = dataUrl;
    document.getElementById("ib-html").value = `<img src="${dataUrl.slice(0, 48)}…" alt="" />`;
    document.getElementById("ib-html").value = `<img src="${dataUrl}" alt="" />`;
    document.getElementById("ib-css").value = `background-image: url("${dataUrl}");`;
  };
  reader.onerror = () => toast("Could not read that file.", "error");
  reader.readAsDataURL(f);
}, { accept: "image/*" });
