// Suggest a tool.
//
// The page never talks to a server. As the visitor types, this builds a plain
// email out of the fields and keeps two things in sync: the mailto link (which
// opens their own mail app) and the copy button's text (for anyone without one
// set up). The message only leaves the device when the visitor sends it.

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

function body() {
  const lines = [`What it should do: ${idea.value.trim() || "(add a line here)"}`];
  if (cat.value) lines.push(`Closest category: ${cat.value}`);
  const extra = why.value.trim();
  if (extra) lines.push("", extra);
  return lines.join("\n");
}

// The copy button carries the whole message, headed with the address so a
// visitor pasting it into a fresh email knows where to send it.
function plainMessage() {
  return `To: ${TO}\nSubject: ${subject()}\n\n${body()}`;
}

function sync() {
  mail.href = `mailto:${TO}?subject=${encodeURIComponent(subject())}&body=${encodeURIComponent(body())}`;
  copy.setAttribute("data-copy-text", plainMessage());
}

[idea, cat, why].forEach((el) => el.addEventListener("input", sync));
sync();
