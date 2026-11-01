/* =====================================================
   storage.js - local preferences and Sudoku records
   ===================================================== */
const BEST_KEY = "sudoku_best";
const PREFS_KEY = "sudoku_prefs";
const PLAYS_KEY = "sudoku_plays";

function readStored(key, fallback) {
  let value;
  try {
    value = localStorage.getItem(key);
  } catch (error) {
    console.warn(`Could not read ${key} from local storage.`, error);
    return fallback;
  }
  if (value === null) return fallback;
  try {
    return JSON.parse(value);
  } catch (error) {
    console.warn(`Could not parse saved ${key} data.`, error);
    return fallback;
  }
}

function writeStored(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn(`Could not save ${key} to local storage.`, error);
  }
}

const storedPrefs = readStored(PREFS_KEY, readStored("latinsquare_prefs", {}));
const savedPrefs =
  storedPrefs && typeof storedPrefs === "object" ? storedPrefs : {};
const prefs = {
  diff: ["easy", "medium", "hard"].includes(savedPrefs.diff)
    ? savedPrefs.diff
    : "hard",
};
let best = Math.max(0, Number(readStored(BEST_KEY, readStored("latinsquare_best", 0))) || 0);
let plays = Math.max(0, Number(readStored(PLAYS_KEY, readStored("latinsquare_plays", 0))) || 0);
writeStored(BEST_KEY, best);
writeStored(PREFS_KEY, prefs);
writeStored(PLAYS_KEY, plays);

function savePrefs() {
  writeStored(PREFS_KEY, prefs);
}

function recordPlay() {
  plays++;
  writeStored(PLAYS_KEY, plays);
}

function saveBest(score) {
  if (score <= best) return false;
  best = score;
  writeStored(BEST_KEY, best);
  return true;
}
