'use strict';

window.WoodLineEulerianSolver = class EulerianSolver {
    static getOddDegreeNodes(nodeCount, unvisitedEdges) {
      const deg = new Array(nodeCount).fill(0);
      unvisitedEdges.forEach(([u, v]) => {
        deg[u]++;
        deg[v]++;
      });
      const odd = [];
      deg.forEach((d, i) => {
        if (d % 2 !== 0) odd.push(i);
      });
      return odd;
    }

    // Finds full trail starting from current or optimal node using Fleury / Hierholzer
    static solve(nodeCount, unvisitedEdges, startNode = null) {
      if (unvisitedEdges.length === 0) return [];

      const oddNodes = this.getOddDegreeNodes(nodeCount, unvisitedEdges);

      // If no start node specified:
      let start = startNode;
      if (start === null) {
        if (oddNodes.length === 2) {
          start = oddNodes[0];
        } else if (oddNodes.length === 0) {
          start = unvisitedEdges[0][0];
        } else {
          return null; // Unsolvable from this state
        }
      } else {
        // If start node specified, check if valid starting point:
        if (oddNodes.length === 2 && !oddNodes.includes(start)) {
          return null; // Player must start from an odd node!
        }
      }

      // Backtracking DFS to find exact Eulerian path
      const edgeList = unvisitedEdges.map((e, idx) => ({ u: e[0], v: e[1], origIdx: idx, used: false }));
      const adj = Array.from({ length: nodeCount }, () => []);
      edgeList.forEach((e) => {
        adj[e.u].push({ to: e.v, edge: e });
        adj[e.v].push({ to: e.u, edge: e });
      });

      const path = [];
      const totalEdges = edgeList.length;

      function dfs(u, count) {
        if (count === totalEdges) return true;
        for (let i = 0; i < adj[u].length; i++) {
          const { to, edge } = adj[u][i];
          if (!edge.used) {
            edge.used = true;
            path.push({ from: u, to, edgeIdx: edge.origIdx });
            if (dfs(to, count + 1)) return true;
            edge.used = false;
            path.pop();
          }
        }
        return false;
      }

      const found = dfs(start, 0);
      return found ? path : null;
    }
  };
