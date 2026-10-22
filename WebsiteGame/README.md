# WebsiteGame (GameHub)

All games live in ONE folder. The dashboard (index.html) shows them all.

```
WebsiteGame/
├── index.html            Dashboard (shows all games, search, filters)
├── fliprun/              Game 1
├── numfill/              Game 2
├── <new game>/           Every new game gets its own folder here
├── assets/
│   ├── css/style.css     Shared theme (colors, buttons, cards)
│   ├── css/site.css      Dashboard and blog styles
│   └── js/
│       ├── games-data.js LIST OF GAMES  <- add each new game here
│       ├── dashboard.js  Draws the dashboard
│       ├── site-config.js AdSense ID (one place for all games)
│       └── ads.js        Loads ads
├── blog/                 Articles
├── privacy.html  about.html  contact.html
├── ads.txt  robots.txt  sitemap.xml
└── tools/new-game.js     Makes a new game folder for you
```

## Add a new game (easy way)
1. Open terminal in the WebsiteGame folder.
2. Run: `node tools/new-game.js "Snake Rush" Arcade "Eat, grow and avoid the wall."`
3. A folder `snakerush/` is created with a starter game and it appears on the dashboard.
4. Replace the starter code in `snakerush/js/game.js` with your real game.
5. `git add .`, `git commit`, `git push`.

## Add a game I built for you
1. Put the game folder inside WebsiteGame (next to fliprun and numfill).
2. Open `assets/js/games-data.js` and add one block above the line `// ADD NEW GAMES ABOVE THIS LINE`.
3. Add the game link to `sitemap.xml`.

Rules for every game folder:
- Use `../assets/css/style.css` for the shared theme.
- Save the best score in localStorage with a key like `gamename_best`, and put the same key in `bestKey`. The dashboard shows it on the card.
- Add a link back to `../index.html`.
