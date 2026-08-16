// Suggest a tool.
//
// The page never talks to a server. As the visitor types, this builds a ready
// email from the fields and keeps two things in sync: the mailto link (which
// opens their own mail app, pre-filled) and the copy button's text (a clean,
// paste-anywhere version for anyone on webmail). The visitor just adds their
// name and sends; nothing leaves the device until they do.

const TO = "hello@nobyte.in";

const titleEl = document.getElementById("sg-title");
const cat = document.getElementById("sg-cat");
const details = document.getElementById("sg-details");
const mail = document.getElementById("sg-mail");
const copy = document.getElementById("sg-copy");

// The subject line comes from the idea title.
function subjectLine() {
  const t = titleEl.value.trim();
  return t ? `Tool idea: ${t}` : "Tool idea for NoByte";
}

// The email body in a fixed order: greeting, the idea, category, any extra
// detail, then a sign-off with a name placeholder for the sender to fill in.
function body() {
  const lines = [
    "Hi,",
    "",
    titleEl.value.trim() || "(name your idea above)",
    "",
    `Category: ${cat.value || "Not sure"}`,
  ];
  const extra = details.value.trim();
  if (extra) lines.push("", extra);
  lines.push("", "Thanks,", "[your name]");
  return lines.join("\n");
}

// The copy version is a whole email a webmail user can paste and send: the
// address and subject on top, then the body.
function plainMessage() {
  return `To: ${TO}\nSubject: ${subjectLine()}\n\n${body()}`;
}

function sync() {
  mail.href = `mailto:${TO}?subject=${encodeURIComponent(subjectLine())}&body=${encodeURIComponent(body())}`;
  copy.setAttribute("data-copy-text", plainMessage());
}

[titleEl, cat, details].forEach((el) => el.addEventListener("input", sync));
sync();
