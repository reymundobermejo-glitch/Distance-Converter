const MI_TO_KM = 1.609344;
const KM_TO_MI = 1 / MI_TO_KM;
const STORAGE_KEY = "distance-converter";
const MAX_HISTORY = 8;
const CAL_KEY = "distance-converter-calibrated";

const PRESETS = [
  { label: "5K", value: 5, direction: "km-to-mi" },
  { label: "10K", value: 10, direction: "km-to-mi" },
  { label: "Half marathon", value: 21.0975, direction: "km-to-mi" },
  { label: "Marathon", value: 42.195, direction: "km-to-mi" },
  { label: "26.2 mi", value: 26.2, direction: "mi-to-km" },
  { label: "50 mi", value: 50, direction: "mi-to-km" },
  { label: "100 km", value: 100, direction: "km-to-mi" },
  { label: "500 km", value: 500, direction: "km-to-mi" },
];

const els = {
  input: document.getElementById("distanceInput"),
  error: document.getElementById("errorText"),
  result: document.getElementById("resultValue"),
  formula: document.getElementById("formulaText"),
  sourceUnit: document.getElementById("sourceUnit"),
  resultUnit: document.getElementById("resultUnit"),
  sourceSystem: document.getElementById("sourceSystem"),
  resultSystem: document.getElementById("resultSystem"),
  copyBtn: document.getElementById("copyBtn"),
  swapBtn: document.getElementById("swapBtn"),
  copyReadout: document.getElementById("copyReadout"),
  presets: document.getElementById("presets"),
  presetsToggle: document.getElementById("presetsToggle"),
  history: document.getElementById("history"),
  historyDrawer: document.getElementById("historyDrawer"),
  historyToggle: document.getElementById("historyToggle"),
  clearHistory: document.getElementById("clearHistory"),
  scrim: document.getElementById("scrim"),
  scale: document.getElementById("scale"),
  precisionGroup: document.getElementById("precisionGroup"),
  themeLight: document.getElementById("themeLight"),
  themeDark: document.getElementById("themeDark"),
  rail: document.getElementById("rail"),
};

let direction = "km-to-mi";
let precision = 3;
let lastValidKey = "";
let historyTimer = null;
let seqTimer = null;
let state = loadState();

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function loadState() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    return {
      direction: "km-to-mi",
      precision: 3,
      theme: "light",
      history: [],
      ...parsed,
    };
  } catch {
    return { direction: "km-to-mi", precision: 3, theme: "light", history: [] };
  }
}

function saveState() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      direction,
      precision,
      theme: document.documentElement.dataset.theme || "light",
      history: state.history,
    })
  );
}

function labels() {
  return direction === "km-to-mi"
    ? {
        from: "Kilometers",
        to: "Miles",
        fromCode: "km",
        toCode: "mi",
        fromSys: "km · metric system",
        toSys: "mi · imperial system",
        formula: "× 0.621371192",
      }
    : {
        from: "Miles",
        to: "Kilometers",
        fromCode: "mi",
        toCode: "km",
        fromSys: "mi · imperial system",
        toSys: "km · metric system",
        formula: "× 1.609344",
      };
}

function parseInput(raw) {
  const trimmed = raw.trim();
  if (!trimmed) return { empty: true };
  const n = Number(trimmed.replace(",", "."));
  if (!Number.isFinite(n)) return { error: true };
  return { value: n };
}

function convert(value) {
  return direction === "km-to-mi" ? value * KM_TO_MI : value * MI_TO_KM;
}

function format(n, digits) {
  return n.toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function pulseClass(name, ms) {
  if (prefersReducedMotion()) return;
  document.body.classList.remove(name);
  void document.body.offsetWidth;
  document.body.classList.add(name);
  clearTimeout(seqTimer);
  seqTimer = setTimeout(() => document.body.classList.remove(name), ms);
}

function renderScale(value) {
  const mag = Number.isFinite(value) ? Math.max(-3, Math.min(3, Math.floor(Math.log10(Math.abs(value) || 1)))) : 0;
  els.scale.innerHTML = "";
  for (let i = -3; i <= 3; i += 1) {
    const span = document.createElement("span");
    span.textContent = `10^${i}`;
    if (i === mag) span.style.color = "var(--signal-blue)";
    els.scale.append(span);
  }
  els.rail.style.setProperty("--tick-density", String(4 + Math.abs(mag)));
}

function applyUnits() {
  const l = labels();
  els.sourceUnit.textContent = l.from;
  els.resultUnit.textContent = l.to;
  els.sourceSystem.textContent = l.fromSys;
  els.resultSystem.textContent = l.toSys;
  els.formula.textContent = l.formula;
}

function convertLive(opts = {}) {
  const parsed = parseInput(els.input.value);
  const l = labels();
  applyUnits();
  document.body.classList.toggle("fault", Boolean(parsed.error));

  if (parsed.empty) {
    els.error.hidden = true;
    els.result.textContent = "—";
    els.result.classList.add("is-empty");
    els.copyBtn.disabled = true;
    lastValidKey = "";
    renderScale();
    return;
  }

  if (parsed.error) {
    els.error.hidden = false;
    els.result.textContent = "—";
    els.result.classList.add("is-empty");
    els.copyBtn.disabled = true;
    if (opts.sequence) pulseClass("fault", 700);
    return;
  }

  els.error.hidden = true;
  els.result.classList.remove("is-empty");
  const out = convert(parsed.value);
  const formatted = format(out, precision);
  els.result.textContent = formatted;
  els.copyBtn.disabled = false;
  renderScale(parsed.value);

  const key = `${parsed.value}|${direction}|${precision}`;
  if (key !== lastValidKey) {
    lastValidKey = key;
    const entry = {
      source: parsed.value,
      result: out,
      direction,
      precision,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
    };
    clearTimeout(historyTimer);
    historyTimer = setTimeout(() => pushHistory(entry), 700);
  }

  if (opts.sequence) pulseClass("converting", 620);
}

function normalizeHistory(item) {
  if (item && typeof item === "object" && "source" in item) return item;
  return null;
}

function pushHistory(entry) {
  const key = `${entry.source}|${entry.direction}|${entry.precision}`;
  state.history = [
    entry,
    ...state.history
      .map(normalizeHistory)
      .filter(Boolean)
      .filter((item) => `${item.source}|${item.direction}|${item.precision}` !== key),
  ].slice(0, MAX_HISTORY);
  renderHistory();
  saveState();
}

function renderHistory() {
  els.history.innerHTML = "";
  const items = state.history.map(normalizeHistory).filter(Boolean);
  if (!items.length) {
    const li = document.createElement("li");
    li.textContent = "No conversions yet";
    els.history.append(li);
    return;
  }
  items.forEach((item) => {
    const from = item.direction === "km-to-mi" ? "km" : "mi";
    const to = item.direction === "km-to-mi" ? "mi" : "km";
    const li = document.createElement("li");
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "history-item";
    btn.innerHTML = `<strong>${format(item.source, Math.min(item.precision, 4))} ${from} → ${format(item.result, item.precision)} ${to}</strong><small>${item.time || ""}</small><span class="mini-rail"></span>`;
    btn.addEventListener("click", () => {
      direction = item.direction;
      precision = Math.min(6, Math.max(0, Number(item.precision) || precision));
      renderPrecision();
      els.input.value = String(item.source);
      convertLive({ sequence: true });
      saveState();
      setHistoryOpen(false);
    });
    li.append(btn);
    els.history.append(li);
  });
}

function setHistoryOpen(open) {
  els.historyDrawer.hidden = !open;
  els.scrim.hidden = !open;
  els.historyToggle.setAttribute("aria-expanded", String(open));
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  els.themeLight.setAttribute("aria-pressed", String(theme === "light"));
  els.themeDark.setAttribute("aria-pressed", String(theme === "dark"));
}

function renderPrecision() {
  els.precisionGroup.innerHTML = "";
  for (let i = 0; i <= 6; i += 1) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = String(i);
    btn.setAttribute("aria-pressed", String(i === precision));
    btn.setAttribute("aria-label", `${i} decimal places`);
    btn.addEventListener("click", () => {
      precision = i;
      renderPrecision();
      convertLive();
      saveState();
    });
    els.precisionGroup.append(btn);
  }
}

PRESETS.forEach((preset) => {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "preset";
  btn.textContent = preset.label;
  btn.addEventListener("click", () => {
    direction = preset.direction;
    els.input.value = String(preset.value);
    document.querySelectorAll(".preset").forEach((el) => el.setAttribute("aria-pressed", "false"));
    btn.setAttribute("aria-pressed", "true");
    convertLive({ sequence: true });
    saveState();
  });
  els.presets.append(btn);
});

els.input.addEventListener("focus", () => {
  els.input.select();
  document.body.classList.add("is-focused");
});
els.input.addEventListener("blur", () => document.body.classList.remove("is-focused"));
els.input.addEventListener("input", () => {
  convertLive();
  saveState();
});
els.input.addEventListener("keydown", (event) => {
  if (event.key === "Enter") convertLive({ sequence: true });
});

els.swapBtn.addEventListener("click", () => {
  const parsed = parseInput(els.input.value);
  if (!parsed.empty && !parsed.error) {
    const converted = convert(parsed.value);
    els.input.value = String(converted);
  }
  direction = direction === "km-to-mi" ? "mi-to-km" : "km-to-mi";
  pulseClass("swapping", 500);
  convertLive({ sequence: true });
  saveState();
});

els.themeLight.addEventListener("click", () => {
  applyTheme("light");
  saveState();
});
els.themeDark.addEventListener("click", () => {
  applyTheme("dark");
  saveState();
});

els.copyBtn.addEventListener("click", async () => {
  if (els.copyBtn.disabled) return;
  const l = labels();
  await navigator.clipboard.writeText(`${els.result.textContent} ${l.toCode}`);
  els.copyReadout.hidden = false;
  pulseClass("copied", 700);
  setTimeout(() => {
    els.copyReadout.hidden = true;
  }, 1200);
});

els.historyToggle.addEventListener("click", () => {
  setHistoryOpen(els.historyDrawer.hidden);
});
els.scrim.addEventListener("click", () => setHistoryOpen(false));
els.clearHistory.addEventListener("click", () => {
  state.history = [];
  lastValidKey = "";
  renderHistory();
  saveState();
});
els.presetsToggle.addEventListener("click", () => {
  const open = els.presets.hidden;
  els.presets.hidden = !open;
  els.presetsToggle.setAttribute("aria-expanded", String(open));
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") setHistoryOpen(false);
});

applyTheme(state.theme === "dark" ? "dark" : "light");
direction = state.direction === "mi-to-km" ? "mi-to-km" : "km-to-mi";
precision = Math.min(6, Math.max(0, Number(state.precision) || 3));
state.history = (state.history || []).map(normalizeHistory).filter(Boolean);
renderPrecision();
renderHistory();
convertLive();

if (!sessionStorage.getItem(CAL_KEY) && !prefersReducedMotion()) {
  document.body.classList.add("boot");
  sessionStorage.setItem(CAL_KEY, "1");
  setTimeout(() => document.body.classList.remove("boot"), 800);
}
