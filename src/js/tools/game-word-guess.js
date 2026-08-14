// Word Rush — beat the clock. Words are 3–6 letters; the grid adapts to each
// word's length and greys the unused cells. Solving buys time, missing costs it.
import { celebrate } from "/js/celebrate.js";

const gridEl = document.getElementById("wg-grid");
const keysEl = document.getElementById("wg-keys");
const statusEl = document.getElementById("wg-status");
const timeEl = document.getElementById("wg-time");
const solvedEl = document.getElementById("wg-solved");
const bestEl = document.getElementById("wg-best");
const diffEl = document.getElementById("wg-diff");
const hintEl = document.getElementById("wg-hint");
const hintBtn = document.getElementById("wg-hint-btn");
const hintCostEl = document.getElementById("wg-hint-cost");

const WORDS = {
  3: "ace act add age air arm art ask bad bag bar bat bay bed bee bet bid big bit box boy bug bus but cab can cap car cat cop cow cry cub cup cut day den dig dog dot dry due dug ear eat egg end eye fan far fat fig fin fit fix fly fog fox fun fur gap gas gel gem get gum gun gut guy gym had ham hat hay hen hid him hip his hit hop hot hub hug hut ice icy ink ion its jam jar jaw jet jog joy jug key kid kit lab lap law lay leg lid lie lip log lot low mad man map mat men met mix mob mom mud mug nap net new nod not now nut oak oar odd off oil old one orb our out owl own pad pan paw pay pea pen pet pie pig pin pit pop pot pub pug pun pup put rag ram rat raw ray red rib rid rim rip rob rod rot row rub rug rum run sad sap saw sea set she shy sin sip sir sit six ski sky sly sob son spy sub sum sun tab tag tan tap tar tax tea ten tie tin tip toe ton too top toy try tub tug two use van vat vet vow wag war wax way web wet who why wig win wit yak yes yet zip zoo".split(" "),
  4: "able acid army away baby back bake ball band bank bare base bath beam bean bear beat been beer bell belt bend best bike bird bite blue boat body bold bolt bond bone book boot born boss both bowl bulk bull burn busy cafe cage cake calm camp cane card care cart case cash cast cave cell cent chef chin chip city clip club coal coat code coin cold come cook cool copy core cost crew crop cube cure dark dash data date dawn dead deal dear debt deck deep deer desk dial dice diet dine dirt dish dock dome done door dose dove down drag draw drop drum dual duck dull dust duty each earn ease east easy edge exit face fact fade fail fair fall fame farm fast fate fear feed feel feet file fill film find fine fire firm fish fist five flag flat flee flew flip flow foam fold folk fond food fool foot fork form fort four free frog from fuel full fund fury fuse gain game gate gaze gear gift girl give glad glow goal goat gold golf gone good gown grab gray grew grid grim grin grip grow gulf hail hair half hall halt hand hang hard harm hawk haze head heal heap hear heat heel held hell help herb herd here hero hide high hike hill hint hire hive hold hole holy home hood hook hope horn hose host hour huge hull hunt hurt icon idea idle inch iron item jail jazz jerk join joke jump junk jury just keen keep kept kick kill kind king kiss kite knee knew knit knot know lace lack lady lake lamb lamp land lane last late lawn lazy lead leaf leak lean leap left lend lens less life lift like lime line link lion list live load loan lock loft logo lone long look loop lord lose loss lost loud love luck lump lung lure mail main make male mall many mark mask mass mate math maze meal mean meat meet melt menu mere mesh mild mile milk mill mind mine mint miss mist mode mold mole mood moon more moss most moth move much mule must mute nail name near neat neck need nest news next nice node none noon nose note noun oath obey odds okay once only onto open oral oval oven over pace pack page paid pain pair pale palm park part pass past path peak pear peel peer pest pick pile pill pine pink pint pipe plan play plea plot plug plum plus poem poet pole poll pond pony pool poor port pose post pour pray prep prey prop pull pump pure push quit race rack raft rage raid rail rain rake rank rare rate rave read real rear rely rent rest rice rich ride ring riot ripe rise risk road roam roar robe rock rode role roll roof room root rope rose ruby rude rule rush rust safe sage said sail sake salt same sand sane save scan scar seal seam seat seed seek seem seen self sell send sent ship shop shot show shut sick side sift sign silk sing sink site size skin skip slam slap slid slim slip slot slow snap snow soak soap soda sofa soft soil sold sole solo some song soon sort soul soup sour spin spot star stay stem step stir stop such suit sure surf swan swap swim tail take tale talk tall tank tape task team tear teen tell tend tent term test text than that thaw them then they thin this thus tick tide tidy tile till tilt time tiny tire toad toll tomb tone took tool torn toss tour town trap tray tree trim trip true tube tuck tune turf turn twin type ugly undo unit upon urge used user vain vary vase vast veal veil vein verb very vest veto vice view vine visa void volt vote wade wage wait wake walk wall wand want ward warm warn wash wave weak wear weed week weep well went were west what when whip whom wide wife wild will wind wine wing wink wipe wire wise wish with wolf wood wool word wore work worm worn wrap yard yarn yawn yeah year yell your zero zone zoom".split(" "),
  5: "about above actor acute admit adopt after again agent alarm album alert alike alive allow alone along alter angel anger angle angry apart apple apply arena argue arise armor array arrow aside asset audio audit avoid awake award aware badly baker basic beach began begin being below bench birth black blade blame blank blast bleed blend bless blind block blood board boost booth bound brain brand brave bread break breed brick brief bring broad brown brush build built burst buyer cabin cable calm camel candy canal cargo carry catch cause chain chair chalk charm chart chase cheap check chess chest chief child chill china choir chord chose chunk civic civil claim clash class clean clear clerk click cliff climb cloak clock close cloth cloud clown coach coast could count court cover crack craft crane crash crazy cream crest crime crisp cross crowd crown crude cruel crush curve cycle daily dairy dance dated dealt death debut delay dense depth doubt dozen draft drain drama drank dream dress drift drill drink drive drone drove drown eager eagle early earth eight elbow elder elect elite empty enact ended enemy enjoy enter entry equal error event every exact exert exile exist extra fable faint fairy faith false fancy fault favor feast fence ferry fetch fever fiber field fifth fifty fight final first fixed flame flash fleet flesh float flock flood floor flour fluid flush focus force forge forth forty found frame fraud fresh front frost fruit fully funny gauge ghost giant given glass gleam globe glory glove going grace grade grain grand grant grape graph grasp grass grave great greed green greet grief grill grind groan groom group grove grown guard guess guest guide habit hairy handy happy harsh haste hatch haunt heart heavy hedge hello hence hobby honey honor horse hotel house hover human humor hurry ideal image imply index inner input intro irony issue ivory jelly jewel joint jolly judge juice knife knock known label labor lance large laser later laugh layer learn lease least leave ledge legal lemon level lever light limit linen liver lobby local lodge logic loose lorry loser lover lower loyal lucky lunar lunch magic major maker mango march marsh match maybe mayor meant medal media melon mercy merge merit metal meter midst might minor mixed model moist money month moral motor mount mouse mouth movie music naked nasty naval nerve never newly night noble noise north noted novel nurse ocean offer often olive onset opera orbit order organ ounce outer owner ozone paint panel panic paper party pasta patch pause peace pearl phase phone photo piano piece pilot pinch pitch pixel pizza place plain plane plant plate plaza plead point polar porch pound power press price pride prime print prior prize probe proof proud prove pulse punch pupil quart queen query quest quick quiet quilt quite quota radar radio raise rally ranch range rapid ratio reach react ready realm rebel refer relax reply rhyme rider ridge rifle right rigid rinse risky rival river roast robot rocky roman rough round route royal rugby ruler rural sadly saint salad salon sandy sauce scale scarf scene scent scope score scout scrap sense serve seven shade shaft shake shall shame shape share shark sharp sheep sheet shelf shell shift shine shiny shirt shock shoot shore short shout shown shrug sight silky silly since siren skill slate sleek sleep slice slide slime sling small smart smash smell smile smoke snack snake sneak solar solid solve sorry sound south space spare spark speak spear speed spell spend spice spike spill spine spite split spoil spoke spoon sport spray squad staff stage stain stair stake stale stalk stamp stand stark start state steam steel steep steer stern stick stiff still sting stock stone stood stool store storm story stove strap straw strip study stuff style sugar suite super surge sweat sweep sweet swept swift swing sword syrup table taken tally tango taste teach teeth thank theft their theme there these thick thief thigh thing think third those three threw throw thumb tidal tiger tight timer title toast today token tooth topic torch total touch tough tower toxic trace track trade trail train trait trash treat trend trial tribe trick tried tries troop trout truck truly trunk trust truth tulip tutor twice twist ultra uncle under undue unfit union unite unity upper upset urban usage usher usual vague valid value valve vapor vault venue verse video vigor villa viral virus visit vital vivid vocal vodka voice voter wagon waist waste watch water weary weave wedge weigh weird whale wheat wheel where which while white whole whose widen widow width wield witch woman world worry worse worst worth would wound woven wrist write wrong yacht yeast yield young youth zebra".split(" "),
  6: "abroad accept access across action active actual advice affect afford agency agenda almost always amount animal annual answer anyone appeal appear around arrive artist aspect assist assume attach attack attend author autumn avenue banana basket beauty become before behind belong beside better beyond bishop border bottle bottom branch breath bridge bright broken budget burden bureau butter camera cancel cannot canvas carbon career castle casual caught center chance change charge choice choose chosen church circle client closed closer coffee column combat comedy coming common cookie copper corner cotton county couple course cousin create credit crisis critic custom damage danger dealer debate decade decide defeat defend define degree demand depend deputy desert design desire detail detect device dinner direct doctor dollar domain double dragon driven during easily eating editor effect effort eleven emerge empire employ enable ending energy engage engine enough ensure entire entity equity escape estate ethnic exceed except excess expand expect expert export expose extend extent fabric facing factor fairly fallen family famous father fellow female figure finger finish fiscal flight flying follow forced forest forget formal format former foster fought fourth friend frozen future garden gather gender gentle german ginger glance global golden ground growth guitar handle happen hardly hazard header health heaven height hidden holder honest horror hunter ignore impact import income indeed injury inside intend intent invest island itself jacket jockey junior kidney knight lately latter launch lawyer leader league legacy legend length lesson letter likely liquid listen little living locate lonely luxury mainly makeup manage manner margin marine market master matter mature meadow medium member memory mental method middle mighty mining minute mirror mobile modern modest moment monkey mother motion muscle museum mutual myself narrow nation native nature nearby nearly nickel nobody notice notion number object obtain occupy office offset online option orange origin output oxygen packet palace parade parent parish partly patent patrol people period permit person phrase picked picnic planet please plenty pocket poetry police policy powder praise prayer prefer pretty priest prince prison profit prompt proper proven public pursue puzzle python racket radius random rarely rather rating reader really reason recall recent recipe record reduce reform refuse region regret reject relate relief remain remedy remind remote remove render rental repair repeat report rescue resort result resume retail retain retire return reveal review reward riding ripple rising robust rocket ruling runner sacred saddle safety salary sample saving saying scared scheme school scores screen script search season second secret sector secure select senior sensor serial series server settle severe shadow shaken shaped shared shield should shower shrimp signal silent silver simple simply single sister slight smooth social soccer sodium solved sought source speech spirit spoken spread spring square stable stance static status steady stolen strain streak stream street stress strict strike string strong struck studio submit sudden suffer summer summit sunset supply surely survey switch symbol system tackle talent target tattoo taught tenant tender tennis theory thirty thread threat thrive throat throne tissue toilet tomato tongue toward travel treaty tribal trophy tunnel twenty unable unfair unique united unless unlike update upheld useful valley vendor verbal vessel victim viewer virtue vision visual volume voyage wander weekly weight window winner winter wisdom wonder wooden worker writer yellow".split(" "),
};

/* Solving a word takes most players 25 to 40 seconds of typing and thinking,
 * so a bonus smaller than that meant the clock only ever ran down: two words
 * and out, however well you played. The bonus is now close to what a solve
 * costs, which lets a good run keep going while a slow one still ends.
 * hint: seconds a revealed letter costs, so a hint is a trade rather than a
 * free pass. Beginner pays least. */
const DIFF = {
  beginner: { lens: [3, 4], time: 120, bonus: 24, penalty: 4, hint: 4 },
  intermediate: { lens: [4, 5], time: 100, bonus: 21, penalty: 5, hint: 6 },
  advanced: { lens: [5, 6], time: 80, bonus: 18, penalty: 6, hint: 8 },
};
const MAXLEN = 6, ROWS = 6;
const KEY = "game_word_rush_best";

let answer, len, offset, row, guess, keyState = {};
let cfg, timeLeft, running, ended, busy, solved, timerId;
let shown;    // indices of letters given away by a hint on the current word
let unsolved; // a word is still in play, so the clock running out should reveal it
let best = Number(localStorage.getItem(KEY)) || 0;
bestEl.textContent = best;

const rank = { miss: 0, near: 1, hit: 2 };
const active = (c) => c >= offset && c < offset + len; // is this column part of the word?

function buildGrid() {
  gridEl.innerHTML = "";
  for (let r = 0; r < ROWS; r++) {
    const rowEl = document.createElement("div");
    rowEl.className = "wg-row";
    for (let c = 0; c < MAXLEN; c++) {
      const t = document.createElement("div");
      t.className = "wg-tile" + (active(c) ? "" : " off");
      rowEl.appendChild(t);
    }
    gridEl.appendChild(rowEl);
  }
}

// ↵ and ⌫ resolve to a fallback font, so they never match the weight of the
// letters beside them. The action keys use sprite icons instead.
const ACTION_KEYS = {
  "↵": { key: "Enter", label: "Enter", icon: "check" },
  "⌫": { key: "Backspace", label: "Backspace", icon: "delete" },
};

function buildKeys() {
  const layout = ["qwertyuiop", "asdfghjkl", "↵zxcvbnm⌫"];
  keysEl.innerHTML = "";
  for (const line of layout) {
    const rowEl = document.createElement("div");
    rowEl.className = "wg-krow";
    for (const ch of line) {
      const b = document.createElement("button");
      b.type = "button";
      const action = ACTION_KEYS[ch];
      if (action) {
        b.className = "gkey wide";
        b.setAttribute("aria-label", action.label);
        b.innerHTML = `<svg class="icon" aria-hidden="true"><use href="#${action.icon}"></use></svg>`;
      } else {
        b.className = "gkey";
        b.textContent = ch;
        b.dataset.k = ch;
      }
      b.addEventListener("click", () => input(action ? action.key : ch));
      rowEl.appendChild(b);
    }
    keysEl.appendChild(rowEl);
  }
}

function paintKeys() {
  keysEl.querySelectorAll("[data-k]").forEach((b) => {
    const s = keyState[b.dataset.k];
    b.classList.remove("hit", "near", "miss");
    if (s) b.classList.add(s);
  });
}

/* ---- hints ----
 * A hint hands over one letter in its exact position and charges seconds for
 * it. Two per word at most, and never the whole word: a 3-letter word gets one.
 */
const maxHints = () => Math.min(2, len - 2);

function renderHint() {
  if (!shown.size) { hintEl.hidden = true; hintEl.innerHTML = ""; return; }
  hintEl.hidden = false;
  hintEl.innerHTML = answer
    .split("")
    .map((ch, i) => (shown.has(i) ? `<i>${ch}</i>` : `<i class="blank"></i>`))
    .join("");
  hintEl.setAttribute("aria-label", `Revealed: ${answer.split("").map((ch, i) => (shown.has(i) ? ch : "blank")).join(", ")}`);
}

function updateHintBtn() {
  const left = maxHints() - shown.size;
  hintBtn.disabled = ended || busy || left <= 0;
  hintBtn.setAttribute("aria-label", left > 0 ? `Reveal a letter, costs ${cfg.hint} seconds` : "No hints left for this word");
}

function takeHint() {
  if (ended || busy || shown.size >= maxHints()) return;
  const pool = [];
  for (let i = 0; i < len; i++) if (!shown.has(i)) pool.push(i);
  if (!pool.length) return;
  startClock();
  const i = pool[Math.floor(Math.random() * pool.length)];
  shown.add(i);
  keyState[answer[i]] = "hit";
  paintKeys();
  renderHint();
  timeLeft = Math.max(0, timeLeft - cfg.hint);
  updateTime();
  statusEl.textContent = `Letter ${i + 1} is "${answer[i].toUpperCase()}". −${cfg.hint}s`;
  updateHintBtn();
  if (timeLeft <= 0) endGame();
}

/** Print the answer across a row of the grid, so a word you never got is still
 *  a word you saw. */
function revealAnswer() {
  const tiles = gridEl.children[Math.min(row, ROWS - 1)]?.children;
  if (!tiles) return;
  for (let i = 0; i < len; i++) {
    const t = tiles[offset + i];
    t.textContent = answer[i];
    t.classList.remove("hit", "near", "miss");
    t.classList.add("show");
  }
}

function score(g) {
  const res = Array(len).fill("miss");
  const counts = {};
  for (const ch of answer) counts[ch] = (counts[ch] || 0) + 1;
  for (let i = 0; i < len; i++) if (g[i] === answer[i]) { res[i] = "hit"; counts[g[i]]--; }
  for (let i = 0; i < len; i++) if (res[i] !== "hit" && counts[g[i]] > 0) { res[i] = "near"; counts[g[i]]--; }
  return res;
}

/* ---- timer ---- */
function updateTime() { timeEl.textContent = timeLeft; timeEl.classList.toggle("low", timeLeft <= 10); }
function startClock() {
  if (running || ended) return;
  running = true;
  timerId = setInterval(() => { timeLeft--; updateTime(); if (timeLeft <= 0) endGame(); }, 1000);
}
// A read on how many words you solved in one round against the clock.
function verdict(n) {
  if (n === 0) return { rank: "No words solved", note: "Start with the vowels, then test common endings like -ing or -ed." };
  // Scaled with the clock: a round now runs long enough that the old cut-offs
  // would have called almost every finish very fast.
  if (n < 5) return { rank: "Slow start", note: "Green means the right letter in the right spot; amber means right letter, wrong spot." };
  if (n < 12) return { rank: "Good pace", note: "A solid number of words for a single round." };
  if (n < 22) return { rank: "Fast", note: "A high count to reach before the clock ran out." };
  return { rank: "Very fast", note: "Few players solve this many words in one round." };
}

function endGame() {
  ended = true; running = false; clearInterval(timerId);
  timeLeft = Math.max(0, timeLeft); updateTime();
  const v = verdict(solved);
  // The clock can stop mid-word. Show that word rather than leaving it a secret.
  const missed = unsolved ? ` The word was "${answer.toUpperCase()}".` : "";
  if (unsolved) { revealAnswer(); unsolved = false; }
  // "No words solved" already carries the count, so the tally is dropped there.
  const tally = solved ? ` ${solved} word${solved === 1 ? "" : "s"} solved.` : "";
  statusEl.innerHTML = `${v.rank}.${tally}${missed}<span class="verdict-sub">${v.note}</span>`;
  updateHintBtn();
  if (solved > best) { best = solved; bestEl.textContent = best; try { localStorage.setItem(KEY, best); } catch {} }
}

function nextWord() {
  const l = cfg.lens[Math.floor(Math.random() * cfg.lens.length)];
  answer = WORDS[l][Math.floor(Math.random() * WORDS[l].length)];
  len = l;
  offset = Math.floor((MAXLEN - len) / 2);
  row = 0; guess = ""; keyState = {};
  shown = new Set(); unsolved = true;
  buildGrid(); buildKeys(); renderHint(); updateHintBtn();
}

/* ---- play ---- */
function drawCurrent() {
  const tiles = gridEl.children[row]?.children;
  if (!tiles) return;
  for (let i = 0; i < len; i++) tiles[offset + i].textContent = guess[i] || "";
}

function submit() {
  if (ended || busy) return;
  if (guess.length !== len) { statusEl.textContent = `Enter ${len} letters.`; return; }
  const res = score(guess);
  const tiles = gridEl.children[row].children;
  for (let i = 0; i < len; i++) {
    tiles[offset + i].classList.add(res[i]);
    const k = guess[i];
    if (!keyState[k] || rank[res[i]] > rank[keyState[k]]) keyState[k] = res[i];
  }
  paintKeys();

  if (guess === answer) {
    solved++; solvedEl.textContent = solved;
    unsolved = false;
    timeLeft += cfg.bonus; updateTime();
    statusEl.textContent = `Solved! +${cfg.bonus}s`;
    busy = true; updateHintBtn();
    // The clock stops for the celebration. Watching it is not playing, so it
    // should neither cost the player time nor quietly hand them any.
    const wasRunning = running;
    running = false; clearInterval(timerId);
    celebrate(gridEl, { text: answer, sub: `+${cfg.bonus} seconds`, burst: { from: 0.75, n: 60 } }).then(() => {
      busy = false;
      if (ended) return;
      nextWord();
      if (wasRunning) startClock();
    });
    return;
  }
  row++; guess = "";
  if (row >= ROWS) {
    timeLeft = Math.max(0, timeLeft - cfg.penalty); updateTime();
    revealAnswer();
    statusEl.textContent = `Missed. It was "${answer.toUpperCase()}". −${cfg.penalty}s`;
    unsolved = false;
    busy = true; updateHintBtn();
    setTimeout(() => { busy = false; if (timeLeft <= 0) endGame(); else if (!ended) nextWord(); }, 1600);
  }
}

function input(key) {
  if (ended || busy) return;
  if (key === "Enter") return submit();
  if (key === "Backspace") { guess = guess.slice(0, -1); return drawCurrent(); }
  if (/^[a-z]$/i.test(key) && guess.length < len) { startClock(); guess += key.toLowerCase(); drawCurrent(); }
}

addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === "Backspace" || /^[a-zA-Z]$/.test(e.key)) input(e.key);
});

function newGame() {
  cfg = DIFF[diffEl.value] || DIFF.intermediate;
  clearInterval(timerId);
  running = false; ended = false; busy = false;
  solved = 0; solvedEl.textContent = 0;
  timeLeft = cfg.time; updateTime();
  hintCostEl.textContent = cfg.hint;
  statusEl.textContent = "Type a word and press Enter. The clock starts on your first letter.";
  nextWord();
}

diffEl.addEventListener("change", newGame);
document.getElementById("wg-new").addEventListener("click", newGame);
hintBtn.addEventListener("click", takeHint);
newGame();
