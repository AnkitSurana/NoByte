// Age calculator — exact years/months/days and next-birthday countdown.
const dob = document.getElementById("ag-dob");
const on = document.getElementById("ag-on");
const error = document.getElementById("ag-error");

const iso = (d) => d.toISOString().slice(0, 10);
on.value = iso(new Date());

function calc() {
  error.textContent = "";
  const set = (id, v) => (document.getElementById(id).textContent = v);
  if (!dob.value) { ["ag-main","ag-months","ag-weeks","ag-days","ag-next"].forEach((i) => set(i, "—")); return; }
  const birth = new Date(dob.value + "T00:00:00");
  const target = new Date((on.value || iso(new Date())) + "T00:00:00");
  if (birth > target) { error.textContent = "The date of birth is after the comparison date."; ["ag-main","ag-months","ag-weeks","ag-days","ag-next"].forEach((i) => set(i, "—")); return; }

  let years = target.getFullYear() - birth.getFullYear();
  let months = target.getMonth() - birth.getMonth();
  let days = target.getDate() - birth.getDate();
  if (days < 0) { months--; days += new Date(target.getFullYear(), target.getMonth(), 0).getDate(); }
  if (months < 0) { years--; months += 12; }

  set("ag-main", `${years}y ${months}m ${days}d`);
  const totalDays = Math.floor((target - birth) / 864e5);
  set("ag-months", (years * 12 + months).toLocaleString());
  set("ag-weeks", Math.floor(totalDays / 7).toLocaleString());
  set("ag-days", totalDays.toLocaleString());

  let next = new Date(target.getFullYear(), birth.getMonth(), birth.getDate());
  if (next < target) next = new Date(target.getFullYear() + 1, birth.getMonth(), birth.getDate());
  const until = Math.ceil((next - target) / 864e5);
  set("ag-next", until === 0 ? "Today" : `${until} day${until === 1 ? "" : "s"} (${next.toLocaleDateString()})`);
}
[dob, on].forEach((el) => el.addEventListener("input", calc));
calc();
