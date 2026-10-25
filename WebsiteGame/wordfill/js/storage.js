/* storage.js - saves best score and last chosen options in the browser
   The key "wordfill_best" must match bestKey in games-data.js
   so the dashboard card can show "Your best". */
const store = {
  get(k, d){ try{ const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); }catch(e){ return d; } },
  set(k, v){ try{ localStorage.setItem(k, JSON.stringify(v)); }catch(e){} }
};
let best  = +store.get('wordfill_best', 0);
let plays = +store.get('wordfill_plays', 0);

// Call when a run ends. Returns true if it is a new best.
function saveResult(s){
  const newBest = s > best;
  plays++; store.set('wordfill_plays', plays);
  if(newBest){ best = s; store.set('wordfill_best', best); }
  return newBest;
}
