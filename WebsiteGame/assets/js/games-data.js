/* =====================================================
   games-data.js - LIST OF ALL GAMES (the dashboard reads this)
   To add a game: copy one block, change the values, keep the comma.
   Or run:  node tools/new-game.js "Game Name" Arcade "Short description"
   ===================================================== */
const GAMES = [
  {
    id: 'fliprun',
    name: 'FlipRun',
    folder: 'fliprun/',
    category: 'Arcade',
    desc: 'Flip gravity with one tap, dodge spikes, grab coins and build combos up to x5.',
    bestKey: 'fliprun_best',
    art: 'FR', c1: '#ff5c7a', c2: '#3b1b6b',
    isNew: false
  },
  {
    id: 'numfill',
    name: 'NumFill',
    folder: 'numfill/',
    category: 'Puzzle',
    desc: 'Fill the blank boxes so every row and column adds up to its clue total.',
    bestKey: 'numfill_best',
    art: 'NF', c1: '#3df2e0', c2: '#1b6b4e',
    isNew: false
  },
  {
    id: "snakerush",
    name: "Snake Rush",
    folder: "snakerush/",
    category: "Arcade",
    desc: "Slither, steer with precision, eat fruits to grow longer, and dodge walls and your own tail.",
    bestKey: "snakerush_best",
    art: "SR", c1: '#ff9f43', c2: '#6b1b4e',
    isNew: false
  },
  {
    id: 'memorymatch',
    name: 'Memory Match',
    folder: 'memorymatch/',
    category: 'Puzzle',
    desc: 'Flip cards, find all the pairs and build combos. Every level gets bigger.',
    bestKey: 'memorymatch_best',
    art: 'MM', c1: '#ffd23f', c2: '#3b1b6b',
    isNew: false
  },
  {
    id: 'tictactoe',
    name: 'Tic Tac Toe',
    folder: 'tictactoe/',
    category: 'Puzzle',
    desc: 'Play vs the computer on 3 levels or with a friend. Build a winning streak.',
    bestKey: 'tictactoe_best',
    art: 'TTT', c1: '#ff5c7a', c2: '#2a0f2e',
    isNew: false
  },
  {
    id: "2048merge",
    name: "2048 Merge",
    folder: "2048merge/",
    category: "Puzzle",
    desc: "Slide numbered tiles across the 4x4 grid and merge identical numbers to build the legendary 2048 tile.",
    bestKey: "2048merge_best",
    art: "2M", c1: '#ffd23f', c2: '#3b1b6b',
    isNew: false
  },
  {
    id: 'fourinarow',
    name: 'Four in a Row',
    folder: 'fourinarow/',
    category: 'Puzzle',
    desc: 'Drop discs and connect four. Play vs the computer on 3 levels or with a friend.',
    bestKey: 'fourinarow_best',
    art: '4R', c1: '#ffd23f', c2: '#c93353',
    isNew: false
  },
  {
    id: 'wordfill',
    name: 'Word Fill',
    folder: 'wordfill/',
    category: 'Word',
    desc: 'Find the missing letters before time runs out. Pick a category and beat the clock.',
    bestKey: 'wordfill_best',
    art: 'WF', c1: '#3df2e0', c2: '#3b1b6b',
    isNew: false
  },
  {
    id: 'bricksbreakerquest',
    name: 'Bricks Breaker Quest',
    folder: 'bricksbreakerquest/',
    category: 'Arcade',
    desc: 'Bounce the ball, break every brick, catch power-ups and earn stars on each level quest.',
    bestKey: 'bricksbreakerquest_best',
    art: 'BQ', c1: '#ff9f43', c2: '#3b1b6b',
    isNew: false
  },
  {
    id: "slidingpuzzlemaster",
    name: "Sliding Puzzle Master",
    folder: "slidingpuzzlemaster/",
    category: "Puzzle",
    desc: "Slide the numbered tiles into numerical order in this classic brain teaser with daily challenges.",
    bestKey: "slidingpuzzlemaster_best",
    art: "SP", c1: '#ff9f43', c2: '#6b1b4e',
    isNew: false
  },
  {
    id: "woodennumberpuzzle",
    name: "Wooden Number Slide",
    folder: "woodennumberpuzzle/",
    category: "Puzzle",
    desc: "A rich tactile wooden sliding puzzle. Arrange numbers across 3x3, 4x4, and 5x5 grids with hints and undos.",
    bestKey: "woodennumberpuzzle_best",
    art: "WOODEN", c1: '#ff5c7a', c2: '#0f2a1a',
    isNew: false
  },
  {
    id: "woodblock",
    name: "Wood Block Puzzle",
    folder: "woodblock/",
    category: "Arcade",
    desc: "Place wooden blocks on the 8x8 grid, clear full rows and columns, and achieve high combo scores.",
    bestKey: "woodblock_best",
    art: "WB", c1: '#ff5c7a', c2: '#0f2a1a',
    isNew: false
  },
  {
    id: "sudoku",
    name: "Sudoku",
    folder: "sudoku/",
    category: "Puzzle",
    desc: "Solve unique 9x9 Sudoku puzzles using row, column, and 3x3 box logic with pencil notes and hints.",
    bestKey: "sudoku_best",
    art: "SDK", c1: '#ffd23f', c2: '#3b1b6b',
    isNew: false
  },
  {
    id: "onelinepuzzle",
    name: "One Line Puzzle",
    folder: "onelinepuzzle/",
    category: "Puzzle",
    desc: "Connect all nodes in one continuous unbroken line without lifting your finger or retracing any path.",
    bestKey: "onelinepuzzle_best",
    art: "OL", c1: '#ffd23f', c2: '#3b1b6b',
    isNew: true
  },
  {
    id: "fruitslice",
    name: "Fruit Slice",
    folder: "fruitslice/",
    category: "Fun",
    desc: "Slice flying juicy fruits, chain massive katana combos, and steer clear of explosive black bombs.",
    bestKey: "fruitslice_best",
    art: "FS", c1: '#3df2e0', c2: '#2a0f2e',
    isNew: true
  },
  {
    id: "targethit",
    name: "Target Hit",
    folder: "targethit/",
    category: "Arcade",
    desc: "Throw knives at rotating targets without hitting previous objects. Slice apples and defeat armored bosses!",
    bestKey: "targethit_best",
    art: "TH", c1: '#3df2e0', c2: '#120d2b',
    isNew: true
  }
];
