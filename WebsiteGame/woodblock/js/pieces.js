/* =====================================================
   pieces.js - the wooden block shapes and wood types
   '#' = a block, '.' = empty space inside the shape.
   weight = how often the shape shows up (bigger = more often)
   ===================================================== */

// Wood types. Colours here are only used for the flying wood chips.
// The block colours are in css/game.css (classes .w0 to .w5), keep them similar.
const WOODS = [
  {name: 'Oak',      chip: '#c99a5b'},
  {name: 'Maple',    chip: '#e3bf87'},
  {name: 'Cherry',   chip: '#b05a38'},
  {name: 'Walnut',   chip: '#7b5231'},
  {name: 'Teak',     chip: '#bd7e3e'},
  {name: 'Mahogany', chip: '#8d3f2a'}
];

const SHAPE_DEFS = [
  ['dot', 2, ['#']],
  ['h2', 6, ['##']],   ['v2', 6, ['#', '#']],
  ['h3', 6, ['###']],  ['v3', 6, ['#', '#', '#']],
  ['h4', 3, ['####']], ['v4', 3, ['#', '#', '#', '#']],
  ['h5', 2, ['#####']],['v5', 2, ['#', '#', '#', '#', '#']],
  ['sq2', 5, ['##', '##']],
  ['sq3', 1.5, ['###', '###', '###']],
  ['r23', 3, ['###', '###']], ['r32', 3, ['##', '##', '##']],
  // small corners (3 blocks)
  ['l1', 4, ['#.', '##']], ['l2', 4, ['.#', '##']], ['l3', 4, ['##', '#.']], ['l4', 4, ['##', '.#']],
  // L and J (4 blocks)
  ['L1', 3, ['#.', '#.', '##']], ['L2', 3, ['###', '#..']], ['L3', 3, ['##', '.#', '.#']], ['L4', 3, ['..#', '###']],
  ['J1', 3, ['.#', '.#', '##']], ['J2', 3, ['#..', '###']], ['J3', 3, ['##', '#.', '#.']], ['J4', 3, ['###', '..#']],
  // T
  ['T1', 3, ['###', '.#.']], ['T2', 3, ['.#', '##', '.#']], ['T3', 3, ['.#.', '###']], ['T4', 3, ['#.', '##', '#.']],
  // S and Z
  ['S1', 2.5, ['.##', '##.']], ['S2', 2.5, ['#.', '##', '.#']],
  ['Z1', 2.5, ['##.', '.##']], ['Z2', 2.5, ['.#', '##', '#.']],
  // big corners (5 blocks)
  ['C1', 1.5, ['#..', '#..', '###']], ['C2', 1.5, ['###', '#..', '#..']],
  ['C3', 1.5, ['###', '..#', '..#']], ['C4', 1.5, ['..#', '..#', '###']]
];

const SHAPES = SHAPE_DEFS.map(([id, weight, rows]) => {
  const cells = [];
  rows.forEach((row, r) => row.split('').forEach((ch, c) => { if(ch === '#') cells.push([r, c]); }));
  return {id, weight, cells, w: rows[0].length, h: rows.length, size: cells.length};
});
const SHAPE_BY_ID = {};
SHAPES.forEach(s => { SHAPE_BY_ID[s.id] = s; });

// a piece = a shape + a wood type + a grain angle (so no two blocks look exactly the same)
function makePiece(shapeId, wood, angle){
  const s = SHAPE_BY_ID[shapeId];
  return {id: s.id, cells: s.cells, w: s.w, h: s.h, size: s.size, wood, angle};
}
function randomPiece(){
  const s = pickWeighted(SHAPES, x => x.weight);
  return makePiece(s.id, rnd(WOODS.length), 84 + rnd(13));
}
