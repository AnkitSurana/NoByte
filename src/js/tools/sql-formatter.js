// SQL formatter, live, in the browser. sql-formatter is a page global.
import { debounce } from "/js/ui.js";

const $ = (id) => document.getElementById(id);
const inp = $("sf-in"), out = $("sf-out"), dialect = $("sf-dialect"), err = $("sf-error");

// A separate example per dialect, each using syntax distinctive to it, so
// formatting shows the dialect is actually supported.
const EXAMPLES = {
  sql: "select u.id, u.name, count(o.id) as orders from users u left join orders o on o.user_id = u.id where u.active = 1 group by u.id, u.name having count(o.id) > 3 order by orders desc limit 10;",
  mysql: "select `id`, `name`, ifnull(`nickname`, `name`) as display from `users` where `created_at` > now() - interval 7 day order by `id` desc limit 20 offset 40;",
  postgresql: "select id, email, data->>'plan' as plan from accounts where email ilike '%@nobyte.in' and created_at::date = current_date order by id limit 25;",
  sqlite: "select id, 'user-' || id as slug, group_concat(tag, ', ') as tags from users join tags on tags.user_id = users.id where active = 1 group by users.id;",
  mariadb: "select `dept`, count(*) as headcount from `employees` where `hired` between '2023-01-01' and '2023-12-31' group by `dept` order by headcount desc;",
  bigquery: "select user_id, array_agg(struct(event, ts) order by ts) as events from `analytics.prod.events` where date(_partitiontime) = current_date() group by user_id;",
  tsql: "select top 10 [id], [name], isnull([email], 'n/a') as email from [dbo].[users] where [created] > getdate() - 30 order by [created] desc;",
};

// True while the input still holds a loaded example (not something the user typed).
let isExample = true;

function format() {
  err.textContent = "";
  const raw = inp.value.trim();
  if (!raw) { out.value = ""; return; }
  try {
    out.value = sqlFormatter.format(raw, { language: dialect.value, keywordCase: "upper" });
  } catch (e) {
    err.textContent = e.message || "Could not format this SQL.";
  }
}

function loadExample() {
  inp.value = EXAMPLES[dialect.value] || EXAMPLES.sql;
  isExample = true;
  format();
}

const run = debounce(format, 150);
inp.addEventListener("input", () => { isExample = false; run(); });
// Switching dialect swaps in that dialect's example, unless you've typed your own.
dialect.addEventListener("change", () => { if (isExample) loadExample(); else format(); });
$("sf-example").addEventListener("click", loadExample);

loadExample();
