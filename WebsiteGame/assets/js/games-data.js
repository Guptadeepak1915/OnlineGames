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
    isNew: true
  },
  {
    id: "snakerush",
    name: "Snake Rush",
    folder: "snakerush/",
    category: "Arcade",
    desc: "Eat, grow and do not hit the wall.",
    bestKey: "snakerush_best",
    art: "SR", c1: '#ff9f43', c2: '#6b1b4e',
    isNew: true
  },
  {
    id: 'memorymatch',
    name: 'Memory Match',
    folder: 'memorymatch/',
    category: 'Puzzle',
    desc: 'Flip cards, find all the pairs and build combos. Every level gets bigger.',
    bestKey: 'memorymatch_best',
    art: 'MM', c1: '#ffd23f', c2: '#3b1b6b',
    isNew: true
  },
  // ADD NEW GAMES ABOVE THIS LINE
];
