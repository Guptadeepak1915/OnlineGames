/**
 * 1Line Wood Craft - Premium One Stroke Puzzle Game Engine
 * Features:
 * - 18 mathematically validated Eulerian graphs
 * - Real-time Eulerian path solver & intelligent hint engine
 * - Polished wooden board & brass/gemstone canvas renderer (HiDPI Retina support)
 * - Touch & mouse dragging or tap-to-step gameplay
 * - Web Audio API procedural sound synthesizer (authentic wooden taps & chimes)
 * - Responsive UI matching onlinefreegame.netlify.app & screenshot specs
 */

(function () {
  'use strict';

  const SoundFX = window.WoodLineSoundFX;
  const LEVELS = window.WoodLineLevels;
  const EulerianSolver = window.WoodLineEulerianSolver;

  /* ==========================================================================
     4. Main Game Application
     ========================================================================== */
  class WoodOneLineGame {
    constructor() {
      this.sound = new SoundFX();
      this.unlockedLevelIndex = parseInt(localStorage.getItem('woodline_unlocked') || '0', 10);
      this.hintsLeft = parseInt(localStorage.getItem('woodline_hints') || '17', 10);
      this.savedProgress = this.readProgress();
      this.currentLevelIndex = this.savedProgress
        ? this.savedProgress.levelIndex
        : Math.min(this.unlockedLevelIndex, LEVELS.length - 1);

      // State of the current puzzle
      this.currentLevel = null;
      this.currentNode = null;
      this.visitedEdges = new Set(); // Stores "u-v" keys
      this.moveHistory = [];         // [{ from, to, edgeIndex }]
      this.hintEdge = null;          // { from, to }

      // Input & Dragging Tracking
      this.isDragging = false;
      this.dragPos = { x: 0, y: 0 };
      this.canvasSize = 400; // Logical board size (400 x 400)

      // Time tracking
      this.startTime = 0;
      this.timerInterval = null;

      this.initDOMElements();
      this.initCanvas();
      this.bindEvents();
      this.loadLevel(this.currentLevelIndex);
      this.restoreProgress(this.savedProgress);
      this.saveProgress();
      this.renderGallery();
      this.updateHintDisplay();
      if (this.visitedEdges.size === this.currentLevel.edges.length) {
        this.onStageClear();
      }
    }

    initDOMElements() {
      this.backBtn = document.getElementById('backBtn');
      this.canvas = document.getElementById('gameCanvas');
      this.ctx = this.canvas.getContext('2d');
      this.hudLevel = document.getElementById('hudLevel');
      this.hudStage = document.getElementById('hudStage');
      this.pauseBtn = document.getElementById('pauseBtn');
      this.undoBtn = document.getElementById('undoBtn');
      this.resetBtn = document.getElementById('resetBtn');
      this.hintBtn = document.getElementById('hintBtn');
      this.hintCount = document.getElementById('hintCount');
      this.hintToast = document.getElementById('hintToast');
      this.soundToggleBtn = document.getElementById('soundToggleBtn');
      this.soundIcon = document.getElementById('soundIcon');
      this.levelsGalleryBtn = document.getElementById('levelsGalleryBtn');

      // Modals
      this.winModal = document.getElementById('winModal');
      this.nextStageBtn = document.getElementById('nextStageBtn');
      this.shareScoreBtn = document.getElementById('shareScoreBtn');
      this.replayStageBtn = document.getElementById('replayStageBtn');
      this.winTime = document.getElementById('winTime');
      this.winSolvedCount = document.getElementById('winSolvedCount');

      this.pauseModal = document.getElementById('pauseModal');
      this.resumeBtn = document.getElementById('resumeBtn');
      this.pauseRestartBtn = document.getElementById('pauseRestartBtn');
      this.pauseGalleryBtn = document.getElementById('pauseGalleryBtn');

      this.galleryModal = document.getElementById('galleryModal');
      this.closeGalleryBtn = document.getElementById('closeGalleryBtn');
      this.stagesGrid = document.getElementById('stagesGrid');
      this.footerStagesLink = document.getElementById('footerStagesLink');
      this.resetAllDataBtn = document.getElementById('resetAllDataBtn');
    }

    readProgress() {
      const saved = localStorage.getItem('woodline_progress');
      if (!saved) return null;

      try {
        const progress = JSON.parse(saved);
        if (!Number.isInteger(progress.levelIndex) || progress.levelIndex < 0 ||
            progress.levelIndex >= LEVELS.length || !Array.isArray(progress.moves)) {
          throw new Error('Invalid saved puzzle progress');
        }

        const level = LEVELS[progress.levelIndex];
        const edgeKeys = new Set(level.edges.map(([u, v]) => this.getEdgeKey(u, v)));
        const visited = new Set();
        let currentNode = null;
        const moves = progress.moves.map((move) => {
          if (!Array.isArray(move) || move.length !== 2 ||
              !Number.isInteger(move[0]) || !Number.isInteger(move[1])) {
            throw new Error('Invalid saved puzzle move');
          }

          const [from, to] = move;
          const key = this.getEdgeKey(from, to);
          if (!edgeKeys.has(key) || visited.has(key) ||
              (currentNode !== null && currentNode !== from)) {
            throw new Error('Saved puzzle moves do not form a valid path');
          }

          visited.add(key);
          currentNode = to;
          return { from, to, key };
        });

        const selectedNode = progress.currentNode;
        if (selectedNode !== null &&
            (!Number.isInteger(selectedNode) || selectedNode < 0 ||
             selectedNode >= level.nodes.length ||
             (currentNode !== null && selectedNode !== currentNode))) {
          throw new Error('Invalid saved puzzle position');
        }

        return {
          levelIndex: progress.levelIndex,
          moves,
          currentNode: currentNode === null ? selectedNode : currentNode
        };
      } catch (error) {
        console.warn('Unable to restore saved puzzle progress:', error);
        localStorage.removeItem('woodline_progress');
        return null;
      }
    }

    restoreProgress(progress) {
      if (!progress) return;

      this.moveHistory = progress.moves;
      this.visitedEdges = new Set(progress.moves.map(({ key }) => key));
      this.currentNode = progress.currentNode;
      this.draw();
    }

    saveProgress() {
      localStorage.setItem('woodline_progress', JSON.stringify({
        levelIndex: this.currentLevelIndex,
        moves: this.moveHistory.map(({ from, to }) => [from, to]),
        currentNode: this.currentNode
      }));
    }

    initCanvas() {
      // Responsive HiDPI scaling
      const resize = () => {
        const rect = this.canvas.parentElement.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        const size = Math.min(rect.width, rect.height) || 360;

        this.canvas.width = size * dpr;
        this.canvas.height = size * dpr;
        this.canvas.style.width = `${size}px`;
        this.canvas.style.height = `${size}px`;

        this.ctx.resetTransform ? this.ctx.resetTransform() : this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.scale((size * dpr) / this.canvasSize, (size * dpr) / this.canvasSize);
        this.draw();
      };

      window.addEventListener('resize', resize);
      setTimeout(resize, 50);
    }

    loadLevel(index) {
      if (index < 0 || index >= LEVELS.length) return;
      this.currentLevelIndex = index;
      this.currentLevel = LEVELS[index];

      this.currentNode = null;
      this.visitedEdges.clear();
      this.moveHistory = [];
      this.hintEdge = null;
      this.isDragging = false;

      // Update HUD
      this.hudLevel.textContent = 1;
      this.hudStage.textContent = this.currentLevel.id;

      // Reset timer
      this.startTime = Date.now();

      this.draw();
    }

    /* ==========================================================================
       Canvas Rendering Engine (Rich Walnut Grain, Brass Pegs & Molten Gold)
       ========================================================================== */
    draw() {
      if (!this.ctx || !this.currentLevel) return;

      const ctx = this.ctx;
      const size = this.canvasSize;
      const lvl = this.currentLevel;

      ctx.clearRect(0, 0, size, size);

      // 1. Recessed Carved Track Channels (All Edges)
      lvl.edges.forEach(([u, v]) => {
        const p1 = lvl.nodes[u];
        const p2 = lvl.nodes[v];
        const key = this.getEdgeKey(u, v);
        const isVisited = this.visitedEdges.has(key);

        if (!isVisited) {
          // Carved routing in hardwood
          ctx.beginPath();
          ctx.moveTo(p1[0], p1[1]);
          ctx.lineTo(p2[0], p2[1]);

          // Deep dark bottom groove
          ctx.strokeStyle = '#180b05';
          ctx.lineWidth = 14;
          ctx.lineCap = 'round';
          ctx.stroke();

          // Inner wooden channel
          ctx.strokeStyle = '#432212';
          ctx.lineWidth = 8;
          ctx.stroke();

          // Subtle upper bevel light
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      });

      // 2. Visited Edges (Molten Liquid Gold Inlay)
      lvl.edges.forEach(([u, v]) => {
        const key = this.getEdgeKey(u, v);
        if (this.visitedEdges.has(key)) {
          const p1 = lvl.nodes[u];
          const p2 = lvl.nodes[v];

          // Radiant golden bloom
          ctx.beginPath();
          ctx.moveTo(p1[0], p1[1]);
          ctx.lineTo(p2[0], p2[1]);
          ctx.strokeStyle = 'rgba(245, 158, 11, 0.45)';
          ctx.lineWidth = 18;
          ctx.lineCap = 'round';
          ctx.stroke();

          // Warm amber body
          ctx.strokeStyle = '#f59e0b';
          ctx.lineWidth = 9;
          ctx.stroke();

          // Molten yellow-white core
          ctx.strokeStyle = '#fff2a3';
          ctx.lineWidth = 3.5;
          ctx.stroke();
        }
      });

      // 3. Active Dragging Line (Follows finger/mouse from currentNode)
      if (this.currentNode !== null && this.isDragging) {
        const p0 = lvl.nodes[this.currentNode];
        ctx.beginPath();
        ctx.moveTo(p0[0], p0[1]);
        ctx.lineTo(this.dragPos.x, this.dragPos.y);

        ctx.strokeStyle = 'rgba(255, 224, 116, 0.35)';
        ctx.lineWidth = 14;
        ctx.lineCap = 'round';
        ctx.stroke();

        ctx.strokeStyle = '#fbb01b';
        ctx.lineWidth = 6;
        ctx.stroke();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // 4. Hint Guide Pulsation (if active)
      if (this.hintEdge) {
        const pFrom = lvl.nodes[this.hintEdge.from];
        const pTo = lvl.nodes[this.hintEdge.to];

        // Animated pulsing dashed hint line
        const dashOffset = (Date.now() / 35) % 24;
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(pFrom[0], pFrom[1]);
        ctx.lineTo(pTo[0], pTo[1]);
        ctx.setLineDash([8, 6]);
        ctx.lineDashOffset = -dashOffset;
        ctx.strokeStyle = '#ffe484';
        ctx.lineWidth = 5;
        ctx.stroke();
        ctx.restore();

        // Pulsing target beacon
        ctx.beginPath();
        ctx.arc(pTo[0], pTo[1], 24 + Math.sin(Date.now() / 150) * 4, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 215, 0, 0.7)';
        ctx.lineWidth = 3;
        ctx.stroke();
      }

      // 5. Wooden Pegs / Polished Gemstone Nodes
      lvl.nodes.forEach(([x, y], idx) => {
        const isCurrent = this.currentNode === idx;
        const radius = isCurrent ? 16 : 14;

        // Drop shadow
        ctx.beginPath();
        ctx.arc(x, y + 4, radius + 2, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
        ctx.fill();

        // Polished Brass Rim Bezel
        const brassGrad = ctx.createRadialGradient(x - 3, y - 3, 2, x, y, radius + 3);
        brassGrad.addColorStop(0, '#fff4b8');
        brassGrad.addColorStop(0.5, '#d49b28');
        brassGrad.addColorStop(1, '#664107');

        ctx.beginPath();
        ctx.arc(x, y, radius + 3, 0, Math.PI * 2);
        ctx.fillStyle = brassGrad;
        ctx.fill();

        // Gemstone Sphere / Colored Marble (matching screenshot theme)
        const gemGrad = ctx.createRadialGradient(x - 4, y - 4, 1, x, y, radius);
        if (lvl.color === 'purple') {
          gemGrad.addColorStop(0, '#f3c7ff');
          gemGrad.addColorStop(0.3, '#c084fc');
          gemGrad.addColorStop(0.7, '#9333ea');
          gemGrad.addColorStop(1, '#4c1d95');
        } else if (lvl.color === 'blue') {
          gemGrad.addColorStop(0, '#bfdbfe');
          gemGrad.addColorStop(0.3, '#60a5fa');
          gemGrad.addColorStop(0.7, '#2563eb');
          gemGrad.addColorStop(1, '#1e3a8a');
        } else if (lvl.color === 'green') {
          gemGrad.addColorStop(0, '#bbf7d0');
          gemGrad.addColorStop(0.3, '#4ade80');
          gemGrad.addColorStop(0.7, '#16a34a');
          gemGrad.addColorStop(1, '#14532d');
        } else {
          gemGrad.addColorStop(0, '#fef08a');
          gemGrad.addColorStop(0.3, '#facc15');
          gemGrad.addColorStop(0.7, '#d97706');
          gemGrad.addColorStop(1, '#78350f');
        }

        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = gemGrad;
        ctx.fill();

        // 3D Specular Highlight Glare
        ctx.beginPath();
        ctx.arc(x - 4, y - 4, radius * 0.35, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
        ctx.fill();

        // Current Active Node Glowing Halo
        if (isCurrent) {
          ctx.beginPath();
          ctx.arc(x, y, radius + 6, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(255, 240, 150, 0.85)';
          ctx.lineWidth = 2.5;
          ctx.stroke();
        }
      });
    }

    /* ==========================================================================
       Interactive Touch & Mouse Handling
       ========================================================================== */
    bindEvents() {
      const getPos = (e) => {
        const rect = this.canvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        const scaleX = this.canvasSize / rect.width;
        const scaleY = this.canvasSize / rect.height;
        return {
          x: (clientX - rect.left) * scaleX,
          y: (clientY - rect.top) * scaleY
        };
      };

      const onPointerDown = (e) => {
        const pos = getPos(e);
        if (e.type !== 'touchstart' || this.findNearbyNode(pos) !== -1) {
          e.preventDefault();
        }
        this.handleStart(pos);
      };

      const onPointerMove = (e) => {
        if (!this.isDragging) return;
        e.preventDefault();
        const pos = getPos(e);
        this.handleMove(pos);
      };

      const onPointerUp = (e) => {
        if (this.isDragging) {
          this.isDragging = false;
          this.draw();
        }
      };

      // Unified Pointer Events
      this.canvas.addEventListener('mousedown', onPointerDown);
      window.addEventListener('mousemove', onPointerMove);
      window.addEventListener('mouseup', onPointerUp);

      this.canvas.addEventListener('touchstart', onPointerDown, { passive: false });
      window.addEventListener('touchmove', onPointerMove, { passive: false });
      window.addEventListener('touchend', onPointerUp);

      // Button Controls
      this.backBtn.addEventListener('click', () => {
        if (window.history.length > 1) {
          window.history.back();
        } else {
          window.location.href = '../index.html';
        }
      });
      this.undoBtn.addEventListener('click', () => this.undo());
      this.resetBtn.addEventListener('click', () => this.resetStage());
      this.hintBtn.addEventListener('click', () => this.useHint());
      this.pauseBtn.addEventListener('click', () => this.showModal(this.pauseModal));

      // Sound Toggle
      this.soundToggleBtn.addEventListener('click', () => {
        const enabled = this.sound.toggle();
        this.soundIcon.textContent = enabled ? '🔊' : '🔇';
      });

      // Modals
      this.resumeBtn.addEventListener('click', () => this.hideModal(this.pauseModal));
      this.pauseRestartBtn.addEventListener('click', () => {
        this.hideModal(this.pauseModal);
        this.resetStage();
      });
      this.pauseGalleryBtn.addEventListener('click', () => {
        this.hideModal(this.pauseModal);
        this.showModal(this.galleryModal);
      });

      this.levelsGalleryBtn.addEventListener('click', () => this.showModal(this.galleryModal));
      this.closeGalleryBtn.addEventListener('click', () => this.hideModal(this.galleryModal));
      this.footerStagesLink.addEventListener('click', (e) => {
        e.preventDefault();
        this.showModal(this.galleryModal);
      });

      this.nextStageBtn.addEventListener('click', () => {
        this.hideModal(this.winModal);
        if (this.currentLevelIndex + 1 < LEVELS.length) {
          this.loadLevel(this.currentLevelIndex + 1);
        } else {
          this.loadLevel(0);
        }
        this.saveProgress();
      });

      this.replayStageBtn.addEventListener('click', () => {
        this.hideModal(this.winModal);
        this.resetStage();
      });
      this.shareScoreBtn.addEventListener('click', () => this.shareScore());

      // Reset All Progress (Storage clearing)
      this.resetAllDataBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (confirm('Reset all unlocked stages and best scores?')) {
          localStorage.removeItem('woodline_unlocked');
          localStorage.removeItem('woodline_hints');
          this.unlockedLevelIndex = 0;
          this.hintsLeft = 17;
          this.updateHintDisplay();
          this.loadLevel(0);
          this.saveProgress();
          this.renderGallery();
        }
      });
    }

    findNearbyNode(pos, radius = 32) {
      if (!this.currentLevel) return -1;
      for (let i = 0; i < this.currentLevel.nodes.length; i++) {
        const [nx, ny] = this.currentLevel.nodes[i];
        const dist = Math.hypot(pos.x - nx, pos.y - ny);
        if (dist <= radius) return i;
      }
      return -1;
    }

    getEdgeKey(u, v) {
      return u < v ? `${u}-${v}` : `${v}-${u}`;
    }

    hasEdge(u, v) {
      return this.currentLevel.edges.some(([n1, n2]) => (n1 === u && n2 === v) || (n1 === v && n2 === u));
    }

    handleStart(pos) {
      const nodeIdx = this.findNearbyNode(pos);
      if (nodeIdx !== -1) {
        if (this.currentNode === null) {
          // Starting the first stroke
          this.currentNode = nodeIdx;
          this.sound.playWoodTap();
        } else if (this.currentNode !== nodeIdx) {
          // Tap-to-step support!
          this.tryConnect(this.currentNode, nodeIdx);
        }
        this.isDragging = true;
        this.dragPos = pos;
        this.saveProgress();
        this.draw();
      }
    }

    handleMove(pos) {
      this.dragPos = pos;
      const targetNode = this.findNearbyNode(pos, 28);
      if (targetNode !== -1 && targetNode !== this.currentNode) {
        this.tryConnect(this.currentNode, targetNode);
      }
      this.draw();
    }

    tryConnect(fromNode, toNode) {
      if (fromNode === null || toNode === null || fromNode === toNode) return;

      if (!this.hasEdge(fromNode, toNode)) return;

      const key = this.getEdgeKey(fromNode, toNode);
      if (this.visitedEdges.has(key)) return; // Can only trace each edge once!

      // Connect edge!
      this.visitedEdges.add(key);
      this.moveHistory.push({ from: fromNode, to: toNode, key });
      this.currentNode = toNode;

      // Play harmonious chime
      this.sound.playLineConnect(this.moveHistory.length);

      // Clear current hint if satisfied
      if (this.hintEdge && ((this.hintEdge.from === fromNode && this.hintEdge.to === toNode) ||
                            (this.hintEdge.from === toNode && this.hintEdge.to === fromNode))) {
        this.hintEdge = null;
      }

      this.draw();
      this.checkWinCondition();
      this.saveProgress();
    }

    undo() {
      if (this.moveHistory.length === 0) return;
      const lastMove = this.moveHistory.pop();
      this.visitedEdges.delete(lastMove.key);
      this.currentNode = lastMove.from;
      this.hintEdge = null;
      this.sound.playUndo();
      this.draw();
      this.saveProgress();
    }

    resetStage() {
      this.visitedEdges.clear();
      this.moveHistory = [];
      this.currentNode = null;
      this.hintEdge = null;
      this.isDragging = false;
      this.sound.playUndo();
      this.draw();
      this.saveProgress();
    }

    useHint() {
      if (this.hintsLeft <= 0) {
        this.showToast('No hints remaining!');
        return;
      }

      const unvisited = this.currentLevel.edges.filter(([u, v]) => !this.visitedEdges.has(this.getEdgeKey(u, v)));
      if (unvisited.length === 0) return;

      const solution = EulerianSolver.solve(this.currentLevel.nodes.length, unvisited, this.currentNode);

      if (!solution || solution.length === 0) {
        this.showToast('Dead end reached! Tap Undo (↩) or Restart (↻)');
        return;
      }

      const nextMove = solution[0];
      this.hintEdge = { from: nextMove.from, to: nextMove.to };

      // If player hasn't selected a starting node yet, highlight the start node
      if (this.currentNode === null) {
        this.currentNode = nextMove.from;
        this.showToast(`Starting at Node ${nextMove.from + 1}`);
      } else {
        this.showToast(`Next: Connect to Node ${nextMove.to + 1}`);
      }

      this.hintsLeft--;
      localStorage.setItem('woodline_hints', this.hintsLeft);
      this.updateHintDisplay();
      this.sound.playWoodTap();
      this.draw();
      this.saveProgress();
    }

    showToast(msg) {
      this.hintToast.textContent = msg;
      this.hintToast.classList.add('show');
      clearTimeout(this.toastTimer);
      this.toastTimer = setTimeout(() => {
        this.hintToast.classList.remove('show');
      }, 2400);
    }

    updateHintDisplay() {
      this.hintCount.textContent = this.hintsLeft;
    }

    checkWinCondition() {
      if (this.visitedEdges.size === this.currentLevel.edges.length) {
        // Complete!
        setTimeout(() => this.onStageClear(), 200);
      }
    }

    onStageClear() {
      this.sound.playVictory();

      // Unlock next stage
      if (this.currentLevelIndex >= this.unlockedLevelIndex) {
        this.unlockedLevelIndex = Math.min(LEVELS.length - 1, this.currentLevelIndex + 1);
        localStorage.setItem('woodline_unlocked', this.unlockedLevelIndex);
      }
      this.saveProgress();

      // Calculate time
      this.elapsedSeconds = Math.max(1, Math.floor((Date.now() - this.startTime) / 1000));
      const mins = Math.floor(this.elapsedSeconds / 60);
      const secs = this.elapsedSeconds % 60;
      this.winTime.textContent = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
      this.winSolvedCount.textContent = `${this.currentLevelIndex + 1} / ${LEVELS.length}`;

      this.renderGallery();
      this.showModal(this.winModal);
    }

    async shareScore() {
      const level = this.currentLevel;
      const score = `I solved ${level.name} (Stage ${level.id}/${LEVELS.length}) in ${this.winTime.textContent} One Line Puzzle !`;
      const shareData = {
        title: 'One Line Puzzle',
        text: `${score} Can you beat my score?`,
        url: window.location.href
      };

      if (navigator.share) {
        try {
          await navigator.share(shareData);
          return;
        } catch (error) {
          if (error.name === 'AbortError') return;
          console.warn('Native score sharing failed; trying clipboard instead:', error);
        }
      }

      try {
        await navigator.clipboard.writeText(`${shareData.text} ${shareData.url}`);
        this.showToast('Score copied! Share it with your friends.');
      } catch (error) {
        console.error('Unable to share or copy the score:', error);
        this.showToast('Could not share the score. Please try again.');
      }
    }

    showModal(modal) {
      modal.classList.remove('hidden');
    }

    hideModal(modal) {
      modal.classList.add('hidden');
    }

    /* ==========================================================================
       Level Selector Gallery (Matching Panel 3 in Screenshot!)
       ========================================================================== */
    renderGallery() {
      this.stagesGrid.innerHTML = '';

      LEVELS.forEach((lvl, idx) => {
        const isUnlocked = idx <= this.unlockedLevelIndex;
        const isCurrent = idx === this.currentLevelIndex;

        const card = document.createElement('div');
        card.className = `stage-card ${isCurrent ? 'current' : ''} ${!isUnlocked ? 'locked' : ''}`;
        card.title = isUnlocked ? `Stage ${lvl.id}: ${lvl.name}` : `Locked (Clear Stage ${idx})`;

        // Build Miniature SVG Thumbnail
        let svgContent = `<svg viewBox="0 0 400 400" width="100%" height="100%">`;

        // Edges
        lvl.edges.forEach(([u, v]) => {
          const p1 = lvl.nodes[u];
          const p2 = lvl.nodes[v];
          svgContent += `<line x1="${p1[0]}" y1="${p1[1]}" x2="${p2[0]}" y2="${p2[1]}" stroke="${isUnlocked ? '#cca484' : '#57331e'}" stroke-width="12" stroke-linecap="round"/>`;
        });

        // Nodes
        const dotColor = isUnlocked
          ? (lvl.color === 'purple' ? '#a855f7' : lvl.color === 'blue' ? '#3b82f6' : lvl.color === 'green' ? '#22c55e' : '#eab308')
          : '#6e442c';

        lvl.nodes.forEach(([x, y]) => {
          svgContent += `<circle cx="${x}" cy="${y}" r="18" fill="${dotColor}" stroke="#ffe27a" stroke-width="3"/>`;
        });

        svgContent += `</svg>`;

        card.innerHTML = `
          <div class="stage-card-thumb">${svgContent}</div>
          <div class="stage-card-num">${isUnlocked ? `Stage ${lvl.id}` : '🔒'}</div>
          <div class="stage-card-stars">${isUnlocked ? (idx < this.unlockedLevelIndex ? '★★★' : '☆☆☆') : ''}</div>
        `;

        if (isUnlocked) {
          card.addEventListener('click', () => {
            this.hideModal(this.galleryModal);
            this.loadLevel(idx);
            this.saveProgress();
          });
        }

        this.stagesGrid.appendChild(card);
      });
    }
  }

  // Initialize on DOM Ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new WoodOneLineGame());
  } else {
    new WoodOneLineGame();
  }
})();
