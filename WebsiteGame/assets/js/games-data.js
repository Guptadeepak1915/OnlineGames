/* =====================================================
   games-data.js - LIST OF ALL GAMES (the dashboard reads this)
   To add a game: copy one block, change the values, keep the comma.
   Or run:  node tools/new-game.js "Game Name" Arcade "Short description"
   ===================================================== */
const GAMES = [
  {
    id: 'fliprun',
    name: 'FlipRun',
    folder: 'fliprun/',                 // folder name inside WebsiteGame
    category: 'Arcade',
    desc: 'Flip gravity with one tap, dodge spikes, grab coins and build combos up to x5.',
    bestKey: 'fliprun_best',            // localStorage key where the game saves best score
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
    desc: "Eat, grow and do not hit the wall.",
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
    desc: "Slide and merge tiles to reach 2048.",
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
    isNew: true
  },
  // ADD NEW GAMES ABOVE THIS LINE
];
