// Suggest a tool.
//
// The page never talks to a server. As the visitor types, this builds a ready
// email from the fields and keeps two things in sync: the mailto link (which
// opens their own mail app, pre-filled) and the copy button's text (a clean,
// paste-anywhere version for anyone on webmail). The visitor just adds their
// name and sends; nothing leaves the device until they do.

const TO = "hello@nobyte.in";

const idea = document.getElementById("sg-idea");
const cat = document.getElementById("sg-cat");
const mail = document.getElementById("sg-mail");
const copy = document.getElementById("sg-copy");

// The subject line, taken from the first line of the pitch.
function title() {
  const t = idea.value.trim().split("\n")[0].trim();
  return t ? `Tool idea: ${t}` : "Tool idea for NoByte";
}

// The email body in a fixed order: greeting, category, the pitch, then a
// sign-off with a name placeholder for the sender to fill in.
function body() {
  const pitch = idea.value.trim() || "(describe the tool here)";
  return [
    "Hi,",
    "",
    `Category: ${cat.value || "Not sure"}`,
    "",
    pitch,
    "",
    "Thanks,",
    "[your name]",
  ].join("\n");
}

// The copy version is a whole email a webmail user can paste and send: the
// address and subject on top, then the body.
function plainMessage() {
  return `To: ${TO}\nSubject: ${title()}\n\n${body()}`;
}

function sync() {
  mail.href = `mailto:${TO}?subject=${encodeURIComponent(title())}&body=${encodeURIComponent(body())}`;
  copy.setAttribute("data-copy-text", plainMessage());
}

[idea, cat].forEach((el) => el.addEventListener("input", sync));
sync();
