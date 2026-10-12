/* =====================================================
   storage.js  -  Save and load data in the browser
   Best score, plays count, sound setting (localStorage)
   ===================================================== */

// Safe wrapper. Does not crash if storage is blocked.
const store = {
  get(k, d){ try{ const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); }catch(e){ return d; } },
  set(k, v){ try{ localStorage.setItem(k, JSON.stringify(v)); }catch(e){} }
};

let best  = +store.get('fliprun_best', 0);
let plays = +store.get('fliprun_plays', 0);
let muted = !!store.get('fliprun_muted', false);

const today = () => new Date().toISOString().slice(0, 10);

// Best score of today only
function getToday(){
  const t = store.get('fliprun_day', null);
  return t && t.d === today() ? t.s : 0;
}

// Call this when a run ends. Returns true if it is a new best.
function saveResult(s){
  const newBest = s > best;
  plays++; store.set('fliprun_plays', plays);
  if(newBest){ best = s; store.set('fliprun_best', best); }
  if(s > getToday()) store.set('fliprun_day', {d: today(), s});
  return newBest;
}

function saveMuted(){ store.set('fliprun_muted', muted); }
