export const PREFIX = "slidenumbers:v1:";
export const LEVELS = {
  3: { label: "Easy", tiles: 8 },
  4: { label: "Medium", tiles: 15 },
  5: { label: "Hard", tiles: 24 },
};
export const PALETTES = [
  { name: "Candy", start: 330, span: 300 },
  { name: "Ocean", start: 165, span: 95 },
  { name: "Sunset", start: 350, span: 80 },
  { name: "Forest", start: 75, span: 100 },
  { name: "Galaxy", start: 245, span: 110 },
  { name: "Citrus", start: 20, span: 70 },
];
export const SOLVER = {
  3: { weight: 1.2, maxNodes: 150000, maxMs: 350 },
  4: { weight: 3, maxNodes: 150000, maxMs: 350 },
  5: { weight: 5, maxNodes: 150000, maxMs: 350 },
};
export const MAX_SCORES = 300;
