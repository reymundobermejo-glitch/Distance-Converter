const KM_TO_MI = 0.621371192;
const MI_TO_KM = 1.609344;
const STORAGE_KEY = "distance-converter";
const MAX_HISTORY = 8;

const PRESETS = [
  { label: "5K", value: 5, direction: "km-to-mi" },
  { label: "10K", value: 10, direction: "km-to-mi" },
  { label: "Half marathon", value: 21.0975, direction: "km-to-mi" },
  { label: "Marathon 42.195 km", value: 42.195, direction: "km-to-mi" },
  { label: "26.2 mi", value: 26.2, direction: "mi-to-km" },
  { label: "50 mi", value: 50, direction: "mi-to-km" },
  { label: "100 km", value: 100, direction: "km-to-mi" },
  { label: "500 km trip", value: 500, direction: "km-to-mi" },
];

const input = document.getElementById("distanceInput");
const errorText = document.getElementById("errorText");
const precision = document.getElementById("precision");
const precisionValue = document.getElementById("precisionValue");
const resultValue = document.getElementById("resultValue");
const resultIcon = document.getElementById("resultIcon");
const formulaText = document.getElementById("formulaText");
const copyBtn = document.getElementById("copyBtn");
const swapBtn = document.getElementById("swapBtn");
const themeToggle = document.getElementById("themeToggle");
const presetsEl = document.getElementById("presets");
const historyEl = document.getElementById("history");
const clearHistory = document.getElementById("clearHistory");

let lastValidKey = "";
let historyTimer = null;
let state = loadState();

function loadState() {
  try {
    return {
      direction: "km-to-mi",
      precision: 2,
      theme: "light",
      history: [],
      ...JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"),
    };
  } catch {
    return { direction: "km-to-mi", precision: 2, theme: "light", history: [] };
  }
}

function saveState() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      direction: getDirection(),
      precision: Number(precision.value),
      theme: document.documentElement.dataset.theme || "light",
      history: state.history,
    })
  );
}

function getDirection() {
  return document.querySelector('input[name="direction"]:checked').value;
}

function setDirection(value) {
  const radio = document.querySelector(`input[name="direction"][value="${value}"]`);
  if (radio) radio.checked = true;
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  const dark = theme === "dark";
  themeToggle.setAttribute("aria-pressed", String(dark));
  themeToggle.querySelector(".theme-icon").textContent = dark ? "☀️" : "🌙";
  themeToggle.querySelector(".theme-label").textContent = dark ? "Light" : "Dark";
}

function parseInput(raw) {
  const trimmed = raw.trim();
  if (!trimmed) return { empty: true };
  const normalized = trimmed.replace(",", ".");
  const n = Number(normalized);
  if (!Number.isFinite(n)) return { error: true };
  return { value: n };
}

function convert(value, direction) {
  return direction === "km-to-mi" ? value * KM_TO_MI : value * MI_TO_KM;
}

function format(n, digits) {
  return n.toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function unitLabels(direction) {
  return direction === "km-to-mi"
    ? { from: "km", to: "mi", icon: "🚗", formula: "× 0.621371" }
    : { from: "mi", to: "km", icon: "🏃", formula: "× 1.609344" };
}

function convertLive() {
  const parsed = parseInput(input.value);
  const direction = getDirection();
  const digits = Number(precision.value);
  const labels = unitLabels(direction);

  formulaText.textContent = labels.formula;
  resultIcon.textContent = labels.icon;
  precisionValue.textContent = String(digits);

  if (parsed.empty) {
    errorText.hidden = true;
    input.classList.remove("error");
    resultValue.textContent = "—";
    copyBtn.disabled = true;
    lastValidKey = "";
    return;
  }

  if (parsed.error) {
    errorText.hidden = false;
    input.classList.remove("error");
    void input.offsetWidth;
    input.classList.add("error");
    resultValue.textContent = "—";
    copyBtn.disabled = true;
    return;
  }

  errorText.hidden = true;
  input.classList.remove("error");
  const out = convert(parsed.value, direction);
  const formatted = `${format(out, digits)} ${labels.to}`;
  const key = `${parsed.value}|${direction}|${digits}`;

  resultValue.textContent = formatted;
  copyBtn.disabled = false;
  resultValue.classList.remove("pulse");
  void resultValue.offsetWidth;
  resultValue.classList.add("pulse");

  if (key !== lastValidKey) {
    lastValidKey = key;
    const entry = `${format(parsed.value, Math.min(digits, 4))} ${labels.from} → ${formatted}`;
    clearTimeout(historyTimer);
    historyTimer = setTimeout(() => pushHistory(entry), 700);
  }
}

function pushHistory(entry) {
  state.history = [entry, ...state.history.filter((item) => item !== entry)].slice(0, MAX_HISTORY);
  renderHistory();
  saveState();
}

function renderHistory() {
  historyEl.innerHTML = "";
  if (!state.history.length) {
    const li = document.createElement("li");
    li.textContent = "No conversions yet";
    historyEl.append(li);
    return;
  }
  state.history.forEach((item) => {
    const li = document.createElement("li");
    li.textContent = item;
    historyEl.append(li);
  });
}

function swapDirection() {
  setDirection(getDirection() === "km-to-mi" ? "mi-to-km" : "km-to-mi");
  convertLive();
  saveState();
}

PRESETS.forEach((preset) => {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.textContent = preset.label;
  btn.addEventListener("click", () => {
    setDirection(preset.direction);
    input.value = String(preset.value);
    convertLive();
    saveState();
  });
  presetsEl.append(btn);
});

input.addEventListener("focus", () => input.select());
input.addEventListener("input", () => {
  convertLive();
  saveState();
});
document.querySelectorAll('input[name="direction"]').forEach((radio) => {
  radio.addEventListener("change", () => {
    convertLive();
    saveState();
  });
});
precision.addEventListener("input", () => {
  convertLive();
  saveState();
});
swapBtn.addEventListener("click", swapDirection);
themeToggle.addEventListener("click", () => {
  applyTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark");
  saveState();
});
copyBtn.addEventListener("click", async () => {
  if (copyBtn.disabled) return;
  await navigator.clipboard.writeText(resultValue.textContent);
  copyBtn.textContent = "Copied";
  setTimeout(() => {
    copyBtn.textContent = "Copy";
  }, 1200);
});
clearHistory.addEventListener("click", () => {
  state.history = [];
  lastValidKey = "";
  renderHistory();
  saveState();
});
document.addEventListener("keydown", (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
    event.preventDefault();
    swapDirection();
  }
});

applyTheme(state.theme === "dark" ? "dark" : "light");
setDirection(state.direction === "mi-to-km" ? "mi-to-km" : "km-to-mi");
precision.value = String(Math.min(6, Math.max(0, Number(state.precision) || 2)));
renderHistory();
convertLive();
