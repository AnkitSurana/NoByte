// Theme toggle + mobile nav. Theme is pre-applied in <head> to avoid flash.
const root = document.documentElement;

function currentTheme() {
  // Light is the default; dark only when explicitly set.
  return root.getAttribute("data-theme") === "dark" ? "dark" : "light";
}

const toggle = document.getElementById("theme-toggle");
if (toggle) {
  toggle.addEventListener("click", () => {
    const next = currentTheme() === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", next);
    try {
      localStorage.setItem("theme", next);
    } catch (e) {}
  });
}

const navToggle = document.getElementById("nav-toggle");
const nav = document.getElementById("nav");
if (navToggle && nav) {
  const isOpen = () => nav.getAttribute("data-open") === "true";
  const setOpen = (open) => {
    nav.setAttribute("data-open", String(open));
    navToggle.setAttribute("aria-expanded", String(open));
    // The drawer covers the page on a phone, so stop the page scrolling behind it.
    document.body.classList.toggle("nav-open", open);
  };

  navToggle.addEventListener("click", () => setOpen(!isOpen()));

  // A tap anywhere outside the drawer closes it — on a phone the drawer floats
  // over the page, so there is no other obvious way back out.
  document.addEventListener("click", (e) => {
    if (!isOpen()) return;
    if (nav.contains(e.target) || navToggle.contains(e.target)) return;
    setOpen(false);
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && isOpen()) {
      setOpen(false);
      navToggle.focus();
    }
  });

  // Following a link inside the drawer should not leave it open behind the
  // next page (it would still be open on a back-navigation restore).
  nav.addEventListener("click", (e) => {
    if (e.target.closest("a")) setOpen(false);
  });

  // Resizing up to desktop reveals the nav inline; clear any drawer state.
  window.addEventListener("resize", () => {
    if (isOpen() && window.innerWidth > 780) setOpen(false);
  });
}
