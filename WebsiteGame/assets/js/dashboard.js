/* =====================================================
   dashboard.js - Draws the game cards, search and filters
   Reads the GAMES list from games-data.js
   ===================================================== */
(function () {
  const grid = document.getElementById("grid");
  const chipsBox = document.getElementById("chips");
  const search = document.getElementById("search");
  const empty = document.getElementById("empty");
  let cat = "All",
    query = "";

  const esc = (s) =>
    String(s).replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );

  // best score that the game saved on this device (0 if none)
  function bestOf(g) {
    if (!g.bestKey) return 0;
    try {
      const v = +JSON.parse(localStorage.getItem(g.bestKey));
      return v > 0 ? v : 0;
    } catch (e) {
      return 0;
    }
  }

  function renderChips() {
    const cats = ["All"].concat([...new Set(GAMES.map((g) => g.category))]);
    chipsBox.innerHTML = "";
    cats.forEach((c) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "chip" + (c === cat ? " on" : "");
      b.textContent = c;
      b.onclick = () => {
        cat = c;
        renderChips();
        renderGrid();
      };
      chipsBox.appendChild(b);
    });
  }

  function renderGrid() {
    const q = query.trim().toLowerCase();
    const list = GAMES.filter(
      (g) =>
        (cat === "All" || g.category === cat) &&
        (!q ||
          (g.name + " " + g.desc + " " + g.category).toLowerCase().includes(q)),
    );

    grid.innerHTML = list
      .map((g) => {
        const b = bestOf(g);
        return `<a class="g-card" href="${esc(g.folder)}">
        <div class="g-art" style="background:linear-gradient(135deg,${esc(g.c1)},${esc(g.c2)})">
          <span>${esc(g.art || g.name.slice(0, 2).toUpperCase())}</span>${g.isNew ? '<em class="g-new">NEW</em>' : ""}
        </div>
        <div class="g-body">
          <span class="g-tag">${esc(g.category)}</span>
          <h2>${esc(g.name)}</h2>
          <p>${esc(g.desc)}</p>
          <div class="g-foot"><span class="g-best">${b ? "Your best: <b>" + b + "</b>" : "Not played yet"}</span><span class="g-play">Play &rarr;</span></div>
        </div></a>`;
      })
      .join("");
    empty.classList.toggle("hidden", list.length > 0);
    document.getElementById("gCount").textContent = GAMES.length;
  }

  search.addEventListener("input", () => {
    query = search.value;
    renderGrid();
  });
  renderChips();
  renderGrid();
})();
