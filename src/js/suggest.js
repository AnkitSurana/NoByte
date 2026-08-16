// Suggest a tool.
//
// The page never talks to a server. As the visitor types, this builds a plain
// message from the fields and keeps two things in sync: the mailto link (which
// opens their own mail app, pre-filled) and the copy button's text (a clean,
// paste-anywhere version for anyone without a mail app). The message only
// leaves the device when the visitor sends it.

const TO = "hello@nobyte.in";

const idea = document.getElementById("sg-idea");
const cat = document.getElementById("sg-cat");
const why = document.getElementById("sg-why");
const mail = document.getElementById("sg-mail");
const copy = document.getElementById("sg-copy");

function subject() {
  const t = idea.value.trim();
  return t ? `Tool idea: ${t}` : "Tool idea for NoByte";
}

// The readable heart of the message, shared by the email body and the copy.
function body() {
  const lines = [`The pitch: ${idea.value.trim() || "(add a line here)"}`];
  if (cat.value) lines.push(`Category: ${cat.value}`);
  const extra = why.value.trim();
  if (extra) lines.push("", extra);
  return lines.join("\n");
}

// Plain, paste-anywhere version. No "To:/Subject:" header noise: just the
// message and a reminder of where it goes, so pasting it into any email or
// note makes sense on its own.
function plainMessage() {
  return `${body()}\n\nSend to: ${TO}`;
}

function sync() {
  mail.href = `mailto:${TO}?subject=${encodeURIComponent(subject())}&body=${encodeURIComponent(body())}`;
  copy.setAttribute("data-copy-text", plainMessage());
}

[idea, cat, why].forEach((el) => el.addEventListener("input", sync));
sync();
