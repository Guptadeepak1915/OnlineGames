/* =====================================================
   levels.js - Level layouts. Each row has 8 characters.
     1-6  normal brick (1 hit), the number picks the colour
     T    tough brick (2 hits)
     X    explosive brick (breaks its neighbours)
     P    power brick (always drops a power-up)
     S    steel brick (cannot be broken)
     .    empty
   After the last level the list repeats with more tough bricks.
   ===================================================== */
const LEVELS = [
  {name: 'Warm Up',      rows: ['11111111','22222222','33333333','44444444']},
  {name: 'Rainbow Wall', rows: ['11111111','22222222','33333333','44444444','55555555','66666666']},
  {name: 'Hard Hats',    rows: ['TTTTTTTT','11111111','22222222','11111111']},
  {name: 'Checkerboard', rows: ['1.1.1.1.','.2.2.2.2','3.3.3.3.','.4.4.4.4','5.5.5.5.']},
  {name: 'Pyramid',      rows: ['...11...','..2222..','.333333.','44444444']},
  {name: 'Power Up!',    rows: ['1P1111P1','22222222','3T3333T3','44444444']},
  {name: 'Boom Town',    rows: ['11XXXX11','22222222','3X3333X3','44444444']},
  {name: 'Fortress',     rows: ['SSS..SSS','.T1111T.','.222222.','..3333..']},
  {name: 'Diamond',      rows: ['...TT...','..T11T..','.T1221T.','T123321T','.T1221T.','..T11T..','...TT...']},
  {name: 'Final Boss',   rows: ['TTTTTTTT','TXPXXPXT','T222222T','T333333T','44444444']}
];
