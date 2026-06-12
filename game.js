/* ============================================================
   NEON HORIZON: RELOADED
   A pixel-art afrofuturist / cyberpunk side-scrolling platformer.
   Pure canvas + vanilla JS. No dependencies.
   ============================================================ */
(() => {
'use strict';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

const VIEW_W = 480, VIEW_H = 270;
const TILE = 16;

/* ---------- responsive integer-ish scaling ---------- */
function fitCanvas() {
  const s = Math.max(1, Math.min(
    Math.floor(window.innerWidth / VIEW_W),
    Math.floor(window.innerHeight / VIEW_H)
  ));
  canvas.style.width = (VIEW_W * s) + 'px';
  canvas.style.height = (VIEW_H * s) + 'px';
}
window.addEventListener('resize', fitCanvas);
fitCanvas();

/* ============================================================
   PALETTE  (black / grey / orange, from the reference art)
   ============================================================ */
const C = {
  skyTop: '#a8a8a6', skyBot: '#7e7e82',
  cloud: '#c6c6c0', cloudDark: '#b0b0ac',
  farBld: '#55555c', farBld2: '#48484f',
  midBld: '#2e2e35', midBld2: '#26262d',
  window: '#e8762a', windowDim: '#9c4f1e', windowPale: '#d8d8d0',
  metal: '#2c2c34', metalDark: '#1d1d24', metalLight: '#4a4a52',
  neon: '#ff8c2e', neonDeep: '#c4561d',
  leaf1: '#e8762a', leaf2: '#ff9b3d', leaf3: '#b3501a',
  trunk: '#1f1d22',
  amber: '#ffb347',
  white: '#e8e8e2',
};

/* ============================================================
   PIXEL SPRITES (string maps -> offscreen canvases)
   ============================================================ */
const SPRITE_PAL = {
  'k': '#14141a',                      // outline
  'h': '#241d20', 'H': '#3a2e30',      // afro hair + highlight
  's': '#9c6238', 'S': '#7a4828',      // skin + shade
  'o': '#e8762a', 'O': '#b3501a',      // orange jacket + shade
  'y': '#ffb347',                      // amber visor / lights
  'g': '#56565e', 'G': '#3a3a42',      // grey
  'b': '#26262e',                      // boots / dark grey
  'w': '#d8d8d0',                      // pale
  'r': '#ff8c2e',                      // bright neon orange
};

function makeSprite(rows) {
  const h = rows.length, w = rows[0].length;
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const c = cv.getContext('2d');
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const ch = rows[y][x];
      if (ch === '.' || ch === ' ') continue;
      c.fillStyle = SPRITE_PAL[ch] || '#ff00ff';
      c.fillRect(x, y, 1, 1);
    }
  }
  return cv;
}

/* ----- player: 14 x 21, afro + visor + orange jacket ----- */
const PLAYER_BODY = [
  '....kkkkkk....',
  '..kkhhhhhhkk..',
  '.khhHhhhhHhhk.',
  '.khhhhHhhhhhk.',
  'khhHhhhhhhHhhk',
  'khhhhhhHhhhhhk',
  'khhhhhhhhhhhhk',
  '.khksssssskhk.',
  '..ksyyyyyysk..',
  '..kssssssssk..',
  '...kssssssk...',
  '..kooooooook..',
  '.kooOyyOooook.',
  '.koOoooooOook.',
  '.koOoooooOoOk.',
  '..kOooooooOk..',
];
const LEGS_IDLE = [
  '..kggggggk....',
  '..kgg.kggk....',
  '..kgg.kggk....',
  '..kbb.kbbk....',
  '.kbbbkkbbbk...',
];
const LEGS_RUN1 = [
  '..kggggggk....',
  '.kgg...kggk...',
  'kgg.....kggk..',
  'kbb......kbbk.',
  'kbbk.....kbbbk',
];
const LEGS_RUN2 = [
  '..kggggggk....',
  '..kggkggk.....',
  '...kgkgk......',
  '...kbkbk......',
  '..kbbkbbk.....',
];
const LEGS_JUMP = [
  '..kggggggk....',
  '.kggk..kggk...',
  '.kbbk..kbbk...',
  'kbbk....kbbk..',
  '..............',
];
const sprPlayer = {
  idle: makeSprite(PLAYER_BODY.concat(LEGS_IDLE)),
  run1: makeSprite(PLAYER_BODY.concat(LEGS_RUN1)),
  run2: makeSprite(PLAYER_BODY.concat(LEGS_RUN2)),
  jump: makeSprite(PLAYER_BODY.concat(LEGS_JUMP)),
};

/* ----- walker bot: 14 x 12 ----- */
const sprWalker = makeSprite([
  '......kk......',
  '......kyk.....',
  '...kkkggkkk...',
  '..kggggggggk..',
  '.kgGrrrrrrGgk.',
  '.kggggggggggk.',
  '.kgGggggggGgk.',
  '..kggggggggk..',
  '...kbkkkkbk...',
  '...kbk..kbk...',
  '..kkbk..kbkk..',
  '..kkkk..kkkk..',
]);

/* ----- drone: 14 x 10 ----- */
const sprDrone = makeSprite([
  'kkkkkkkkkkkkkk',
  '......kgk.....',
  '....kkgggkk...',
  '...kgggggggk..',
  '..kgGrryyrGgk.',
  '...kgggggggk..',
  '....kkgggkk...',
  '.....k...k....',
  '....ky...yk...',
  '..............',
]);

/* ----- energy cell: 8 x 10 ----- */
const sprCell = makeSprite([
  '..kkkk..',
  '.kggggk.',
  'kgyyyygk',
  'kgywwygk',
  'kgyyyygk',
  'kgyyyygk',
  'kgryyrgk',
  'kgrrrrgk',
  '.kggggk.',
  '..kkkk..',
]);

/* ============================================================
   AUDIO  (tiny WebAudio blips)
   ============================================================ */
let audioCtx = null;
function ensureAudio() {
  if (!audioCtx) {
    try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
    catch (e) { audioCtx = null; }
  }
}
function beep(freq, dur, type, vol, slideTo) {
  if (!audioCtx) return;
  const t = audioCtx.currentTime;
  const o = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  o.type = type || 'square';
  o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(vol || 0.04, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(audioCtx.destination);
  o.start(t); o.stop(t + dur + 0.02);
}
const sfx = {
  jump:  () => beep(240, 0.18, 'square', 0.035, 520),
  stomp: () => beep(320, 0.12, 'square', 0.05, 90),
  hurt:  () => beep(150, 0.25, 'sawtooth', 0.05, 60),
  cell:  () => { beep(880, 0.08, 'triangle', 0.05); setTimeout(() => beep(1320, 0.1, 'triangle', 0.05), 70); },
  win:   () => [392, 523, 659, 784, 1046].forEach((f, i) => setTimeout(() => beep(f, 0.22, 'triangle', 0.06), i * 130)),
  dead:  () => [300, 220, 160, 110].forEach((f, i) => setTimeout(() => beep(f, 0.2, 'sawtooth', 0.05), i * 120)),
};

/* ============================================================
   LEVEL  (built from rect data, rasterized to a tile grid)
   ============================================================ */
const MAPW = 250, MAPH = 17;
const SOLID = 1, ONEWAY = 2;
const grid = new Uint8Array(MAPW * MAPH);

function solidRect(x, y, w, h) {
  for (let j = y; j < y + h; j++)
    for (let i = x; i < x + w; i++)
      if (i >= 0 && i < MAPW && j >= 0 && j < MAPH) grid[j * MAPW + i] = SOLID;
}
function onewayRow(x, y, w) {
  for (let i = x; i < x + w; i++)
    if (i >= 0 && i < MAPW && y >= 0 && y < MAPH) grid[y * MAPW + i] = ONEWAY;
}

/* ground segments (top at row 14), with pits between them */
const GROUNDS = [
  [0, 25], [29, 27], [61, 20], [88, 23], [116, 35], [158, 28], [191, 59],
];
for (const [gx, gw] of GROUNDS) solidRect(gx, 14, gw, 3);

/* raised structures to climb */
solidRect(8, 11, 3, 3);
solidRect(44, 11, 4, 3);
solidRect(92, 12, 3, 2);
solidRect(95, 10, 5, 4);
solidRect(120, 11, 2, 3);
solidRect(128, 12, 3, 2);
solidRect(133, 10, 3, 4);
solidRect(165, 11, 4, 3);
solidRect(228, 12, 3, 2);
solidRect(233, 11, 4, 3);

/* floating one-way girder platforms */
const ONEWAYS = [
  [16, 10, 4], [33, 10, 4], [39, 7, 4],
  [57, 11, 3], [66, 10, 4], [73, 8, 4],
  [81, 12, 3], [85, 9, 3],
  [100, 7, 4], [113, 10, 3],
  [122, 9, 4], [140, 10, 5],
  [151, 12, 3], [155, 9, 3],
  [170, 9, 4], [177, 7, 4],
  [195, 10, 4], [205, 8, 4], [215, 10, 4],
];
for (const [x, y, w] of ONEWAYS) onewayRow(x, y, w);

function tileAt(tx, ty) {
  if (tx < 0 || tx >= MAPW) return SOLID;   // world walls
  if (ty < 0 || ty >= MAPH) return 0;       // open above + pits below
  return grid[ty * MAPW + tx];
}

/* spawn points (tile coords) */
const WALKER_SPAWNS = [14, 36, 50, 68, 78, 97, 125, 138, 146, 168, 180, 200, 212, 225];
const DRONE_SPAWNS = [[46, 6], [74, 5], [90, 6], [113, 7], [130, 6], [160, 6], [198, 6], [218, 7]];
const CELL_SPAWNS = [
  [17, 8], [18, 8], [34, 8], [40, 5], [41, 5], [58, 9],
  [67, 8], [74, 6], [82, 10], [86, 7], [97, 8], [101, 5], [102, 5],
  [114, 8], [123, 7], [134, 8], [142, 8], [152, 10], [156, 7],
  [171, 7], [178, 5], [196, 8], [206, 6], [207, 6], [216, 8], [230, 10],
];
const GOAL = { x: 242 * TILE, y: 11 * TILE, w: 30, h: 48 };  // exit gate on final ground
const LEVEL_W = MAPW * TILE;

/* foreground trees (decorative, like the reference image) */
const TREES = [
  { x: 4 * TILE, y: 14 * TILE, s: 1.2 }, { x: 22 * TILE, y: 14 * TILE, s: 1 },
  { x: 53 * TILE, y: 14 * TILE, s: 1.1 }, { x: 63 * TILE, y: 14 * TILE, s: 0.9 },
  { x: 105 * TILE, y: 14 * TILE, s: 1.2 }, { x: 145 * TILE, y: 14 * TILE, s: 1 },
  { x: 162 * TILE, y: 14 * TILE, s: 1.1 }, { x: 193 * TILE, y: 14 * TILE, s: 0.9 },
  { x: 222 * TILE, y: 14 * TILE, s: 1.2 }, { x: 246 * TILE, y: 14 * TILE, s: 1 },
];

/* ============================================================
   BACKGROUND LAYERS (generated once, drawn with parallax)
   ============================================================ */
function seededRand(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function makeLayer(w, h, draw) {
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const c = cv.getContext('2d');
  draw(c, w, h);
  return cv;
}

/* sky + clouds */
const layerSky = makeLayer(VIEW_W, VIEW_H, (c, w, h) => {
  const g = c.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, C.skyTop);
  g.addColorStop(0.6, C.skyBot);
  g.addColorStop(1, '#6e6e72');
  c.fillStyle = g;
  c.fillRect(0, 0, w, h);
});

const layerClouds = makeLayer(960, 150, (c, w) => {
  const r = seededRand(7);
  for (let i = 0; i < 18; i++) {
    const cx = r() * w, cy = 10 + r() * 90;
    const cw = 50 + r() * 110, chh = 12 + r() * 22;
    c.fillStyle = r() > 0.5 ? C.cloud : C.cloudDark;
    for (let b = 0; b < 6; b++) {
      const bx = cx + (r() - 0.5) * cw, by = cy + (r() - 0.5) * chh;
      const bw = 20 + r() * 50, bh = 8 + r() * 14;
      c.fillRect((bx - bw / 2) | 0, (by - bh / 2) | 0, bw | 0, bh | 0);
    }
  }
});

/* far skyline: grey silhouettes, antennas, a couple of domes */
const layerFar = makeLayer(960, VIEW_H, (c, w, h) => {
  const r = seededRand(42);
  let x = 0;
  while (x < w) {
    const bw = 30 + (r() * 60 | 0);
    const bh = 70 + (r() * 110 | 0);
    const col = r() > 0.5 ? C.farBld : C.farBld2;
    c.fillStyle = col;
    c.fillRect(x, h - bh, bw, bh);
    if (r() > 0.55) {                       // antenna
      c.fillRect(x + (bw / 2 | 0), h - bh - 14, 2, 14);
      c.fillStyle = C.window;
      c.fillRect(x + (bw / 2 | 0), h - bh - 16, 2, 2);
      c.fillStyle = col;
    }
    if (r() > 0.7) {                        // afrofuturist dome cap
      c.beginPath();
      c.arc(x + bw / 2, h - bh, bw / 2.4, Math.PI, 0);
      c.fill();
    }
    c.fillStyle = C.windowPale;             // sparse pale windows
    for (let i = 0; i < bw * bh / 260; i++) {
      if (r() > 0.45) continue;
      c.fillRect(x + 4 + (r() * (bw - 8) | 0), h - bh + 6 + (r() * (bh - 12) | 0), 2, 2);
    }
    x += bw + 2 + (r() * 14 | 0);
  }
});

/* near buildings: dark towers, orange windows, neon signs, trees, cables */
const layerNear = makeLayer(1440, VIEW_H, (c, w, h) => {
  const r = seededRand(1337);
  let x = -10;
  const roofs = [];
  while (x < w) {
    const bw = 50 + (r() * 80 | 0);
    const bh = 100 + (r() * 130 | 0);
    c.fillStyle = r() > 0.5 ? C.midBld : C.midBld2;
    c.fillRect(x, h - bh, bw, bh);
    c.fillStyle = C.metalDark;               // roof rim
    c.fillRect(x, h - bh, bw, 3);
    roofs.push([x, h - bh, bw]);
    /* orange window grid */
    for (let wy = h - bh + 8; wy < h - 8; wy += 9) {
      for (let wx = x + 5; wx < x + bw - 6; wx += 8) {
        const v = r();
        if (v < 0.38) c.fillStyle = C.window;
        else if (v < 0.5) c.fillStyle = C.windowDim;
        else continue;
        c.fillRect(wx, wy, 4, 5);
      }
    }
    /* vertical neon sign on some towers */
    if (r() > 0.6) {
      const sx = x + 6 + (r() * (bw - 18) | 0);
      const sy = h - bh + 12;
      c.fillStyle = C.metalDark;
      c.fillRect(sx - 1, sy - 1, 8, 38);
      c.fillStyle = C.neon;
      for (let i = 0; i < 4; i++) c.fillRect(sx, sy + i * 9, 6, 6);
    }
    x += bw + 8 + (r() * 30 | 0);
  }
  /* hanging cables between rooftops */
  c.strokeStyle = C.metalDark;
  c.lineWidth = 1;
  for (let i = 0; i + 1 < roofs.length; i += 2) {
    const [ax, ay] = roofs[i], [bx2, by] = roofs[i + 1];
    c.beginPath();
    c.moveTo(ax + 10, ay + 2);
    c.quadraticCurveTo((ax + bx2) / 2, Math.max(ay, by) + 26, bx2 + 10, by + 2);
    c.stroke();
  }
  /* glowing orange trees at street level */
  for (let i = 0; i < 14; i++) {
    drawTree(c, 30 + (r() * (w - 60) | 0), h, 0.7 + r() * 0.5, r);
  }
});

function drawTree(c, x, groundY, s, rnd) {
  const r = rnd || seededRand((x * 31) | 0);
  const trunkH = 26 * s | 0;
  c.fillStyle = C.trunk;
  c.fillRect(x - 2, groundY - trunkH, 4, trunkH);
  c.fillRect(x - 6, groundY - trunkH + 6, 5, 3);   // branch
  c.fillRect(x + 2, groundY - trunkH + 12, 6, 3);
  const cy = groundY - trunkH - 8 * s;
  const leaves = [C.leaf3, C.leaf1, C.leaf2];
  for (let pass = 0; pass < 3; pass++) {
    c.fillStyle = leaves[pass];
    const n = (14 - pass * 3) | 0;
    for (let i = 0; i < n; i++) {
      const lx = x + (r() - 0.5) * 38 * s;
      const ly = cy + (r() - 0.5) * 24 * s - pass * 2;
      const lw = (4 + r() * 8) | 0, lh = (3 + r() * 5) | 0;
      c.fillRect((lx - lw / 2) | 0, (ly - lh / 2) | 0, lw, lh);
    }
  }
}

/* ============================================================
   TILE RENDERING
   ============================================================ */
function drawTile(tx, ty, camX) {
  const t = grid[ty * MAPW + tx];
  if (!t) return;
  const x = tx * TILE - camX, y = ty * TILE;
  if (t === SOLID) {
    const exposed = tileAt(tx, ty - 1) !== SOLID;
    ctx.fillStyle = C.metal;
    ctx.fillRect(x, y, TILE, TILE);
    ctx.fillStyle = C.metalDark;             // panel seams + rivets
    ctx.fillRect(x, y + TILE - 1, TILE, 1);
    ctx.fillRect(x + TILE - 1, y, 1, TILE);
    ctx.fillRect(x + 3, y + 5, 2, 2);
    ctx.fillRect(x + 11, y + 10, 2, 2);
    if (exposed) {
      ctx.fillStyle = C.metalLight;
      ctx.fillRect(x, y, TILE, 2);
      ctx.fillStyle = C.neon;                // neon edge light
      ctx.fillRect(x, y, TILE, 1);
    }
  } else if (t === ONEWAY) {
    ctx.fillStyle = C.metalLight;            // girder deck
    ctx.fillRect(x, y + 1, TILE, 4);
    ctx.fillStyle = C.neon;
    ctx.fillRect(x, y, TILE, 1);
    ctx.fillStyle = C.metalDark;             // cross-brace
    ctx.fillRect(x, y + 5, TILE, 2);
    ctx.fillRect(x + 6, y + 7, 3, 4);
  }
}

/* ============================================================
   INPUT
   ============================================================ */
const keys = {};
window.addEventListener('keydown', (e) => {
  if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' '].includes(e.key)) e.preventDefault();
  keys[e.key.toLowerCase()] = true;
  ensureAudio();
  if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
  if (state === 'title' && (e.key === 'Enter' || e.key === ' ')) startGame();
  if ((state === 'win' || state === 'gameover') && e.key.toLowerCase() === 'r') startGame();
});
window.addEventListener('keyup', (e) => { keys[e.key.toLowerCase()] = false; });
const left = () => keys['arrowleft'] || keys['a'];
const right = () => keys['arrowright'] || keys['d'];
const jumpKey = () => keys['arrowup'] || keys['w'] || keys[' '];

/* ============================================================
   ENTITIES + GAME STATE
   ============================================================ */
let state = 'title';      // title | play | win | gameover
let player, walkers, drones, cells, particles;
let camX = 0, frame = 0, score = 0, winTimer = 0;

function startGame() {
  state = 'play';
  score = 0;
  frame = 0;
  camX = 0;
  player = {
    x: 3 * TILE, y: 11 * TILE, w: 10, h: 21,
    vx: 0, vy: 0, dir: 1,
    grounded: false, coyote: 0, jumpBuf: 0, jumpHeld: false,
    hp: 3, inv: 0, anim: 0,
    safeX: 3 * TILE, safeY: 11 * TILE,
  };
  walkers = WALKER_SPAWNS.map((tx) => ({
    x: tx * TILE + 1, y: 0, w: 14, h: 12, vx: 0.5, vy: 0, alive: true, t: 0,
  }));
  // drop each walker onto whatever is beneath its spawn column
  for (const wlk of walkers) {
    let ty = 0;
    while (ty < MAPH && !tileAt(Math.floor((wlk.x + 7) / TILE), ty)) ty++;
    wlk.y = ty * TILE - wlk.h;
  }
  drones = DRONE_SPAWNS.map(([tx, ty]) => ({
    x0: tx * TILE, y0: ty * TILE, x: tx * TILE, y: ty * TILE,
    w: 14, h: 10, dir: 1, alive: true, t: Math.random() * 100,
  }));
  cells = CELL_SPAWNS.map(([tx, ty]) => ({
    x: tx * TILE + 4, y: ty * TILE + 3, w: 8, h: 10, got: false, t: Math.random() * 100,
  }));
  particles = [];
}

function spawnBurst(x, y, color, n) {
  for (let i = 0; i < n; i++) {
    particles.push({
      x, y,
      vx: (Math.random() - 0.5) * 3,
      vy: -Math.random() * 2.5 - 0.5,
      life: 20 + Math.random() * 20,
      color,
    });
  }
}

/* ---------- tile collision (AABB vs grid) ---------- */
function moveAndCollide(e) {
  const res = { grounded: false, hitWall: false };

  e.x += e.vx;
  let x0 = Math.floor(e.x / TILE), x1 = Math.floor((e.x + e.w - 1) / TILE);
  let y0 = Math.floor(e.y / TILE), y1 = Math.floor((e.y + e.h - 1) / TILE);
  if (e.vx > 0) {
    for (let ty = y0; ty <= y1; ty++) {
      if (tileAt(x1, ty) === SOLID) {
        e.x = x1 * TILE - e.w; e.vx = 0; res.hitWall = true; break;
      }
    }
  } else if (e.vx < 0) {
    for (let ty = y0; ty <= y1; ty++) {
      if (tileAt(x0, ty) === SOLID) {
        e.x = (x0 + 1) * TILE; e.vx = 0; res.hitWall = true; break;
      }
    }
  }

  const prevBottom = e.y + e.h;
  e.y += e.vy;
  x0 = Math.floor(e.x / TILE); x1 = Math.floor((e.x + e.w - 1) / TILE);
  y0 = Math.floor(e.y / TILE); y1 = Math.floor((e.y + e.h - 1) / TILE);
  if (e.vy > 0) {
    for (let tx = x0; tx <= x1; tx++) {
      const t = tileAt(tx, y1);
      if (t === SOLID || (t === ONEWAY && prevBottom <= y1 * TILE + 0.01)) {
        e.y = y1 * TILE - e.h; e.vy = 0; res.grounded = true; break;
      }
    }
  } else if (e.vy < 0) {
    for (let tx = x0; tx <= x1; tx++) {
      if (tileAt(tx, y0) === SOLID) {
        e.y = (y0 + 1) * TILE; e.vy = 0; break;
      }
    }
  }
  return res;
}

const overlaps = (a, b) =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

/* ---------- player ---------- */
const ACCEL = 0.35, MAX_VX = 2.2, FRICTION = 0.72, GRAVITY = 0.24, JUMP_V = -5.7;

function hurtPlayer(fromX) {
  if (player.inv > 0) return;
  player.hp--;
  player.inv = 70;
  player.vy = -3.4;
  player.vx = player.x + player.w / 2 < fromX ? -2.6 : 2.6;
  sfx.hurt();
  spawnBurst(player.x + 5, player.y + 10, C.neon, 8);
  if (player.hp <= 0) {
    state = 'gameover';
    sfx.dead();
  }
}

function updatePlayer() {
  const p = player;

  if (left()) { p.vx -= ACCEL; p.dir = -1; }
  else if (right()) { p.vx += ACCEL; p.dir = 1; }
  else p.vx *= FRICTION;
  p.vx = Math.max(-MAX_VX, Math.min(MAX_VX, p.vx));
  if (Math.abs(p.vx) < 0.05) p.vx = 0;

  p.vy = Math.min(p.vy + GRAVITY, 6);

  /* coyote time + jump buffering + variable jump height */
  if (jumpKey() && !p.jumpHeld) p.jumpBuf = 7;
  p.jumpHeld = jumpKey();
  if (p.jumpBuf > 0 && p.coyote > 0) {
    p.vy = JUMP_V;
    p.jumpBuf = 0;
    p.coyote = 0;
    sfx.jump();
  }
  if (!jumpKey() && p.vy < -1.5) p.vy = -1.5;
  if (p.jumpBuf > 0) p.jumpBuf--;

  const res = moveAndCollide(p);
  p.grounded = res.grounded;
  if (p.grounded) {
    p.coyote = 7;
    p.safeX = p.x; p.safeY = p.y;
  } else if (p.coyote > 0) p.coyote--;

  if (p.inv > 0) p.inv--;
  p.anim += Math.abs(p.vx) * 0.25;

  /* fell into a pit */
  if (p.y > MAPH * TILE + 30) {
    p.hp--;
    sfx.hurt();
    if (p.hp <= 0) { state = 'gameover'; sfx.dead(); return; }
    p.x = p.safeX; p.y = p.safeY - 4;
    p.vx = 0; p.vy = 0; p.inv = 70;
  }

  /* reached the exit gate */
  if (overlaps(p, GOAL)) {
    state = 'win';
    winTimer = 0;
    score += p.hp * 250;     // health bonus
    sfx.win();
  }
}

/* ---------- enemies ---------- */
function stompable(e) {
  return player.vy > 0 && player.y + player.h - e.y < 9;
}

function updateWalkers() {
  for (const wlk of walkers) {
    if (!wlk.alive) continue;
    wlk.t++;
    wlk.vy = Math.min(wlk.vy + GRAVITY, 6);
    const res = moveAndCollide(wlk);
    if (res.hitWall) wlk.vx = -wlk.vx;
    if (res.grounded) {
      /* turn at platform edges */
      const aheadX = wlk.vx > 0 ? wlk.x + wlk.w + 1 : wlk.x - 1;
      const tx = Math.floor(aheadX / TILE);
      const ty = Math.floor((wlk.y + wlk.h + 2) / TILE);
      if (!tileAt(tx, ty)) wlk.vx = -wlk.vx;
    }
    if (wlk.y > MAPH * TILE + 60) { wlk.alive = false; continue; }
    if (overlaps(player, wlk)) {
      if (stompable(wlk)) {
        wlk.alive = false;
        player.vy = -4.2;
        score += 100;
        sfx.stomp();
        spawnBurst(wlk.x + 7, wlk.y + 6, C.metalLight, 10);
        spawnBurst(wlk.x + 7, wlk.y + 6, C.neon, 6);
      } else hurtPlayer(wlk.x + wlk.w / 2);
    }
  }
}

function updateDrones() {
  for (const d of drones) {
    if (!d.alive) continue;
    d.t++;
    d.x += d.dir * 0.7;
    if (d.x > d.x0 + 52) d.dir = -1;
    if (d.x < d.x0 - 52) d.dir = 1;
    d.y = d.y0 + Math.sin(d.t * 0.06) * 7;
    if (overlaps(player, d)) {
      if (stompable(d)) {
        d.alive = false;
        player.vy = -4.2;
        score += 150;
        sfx.stomp();
        spawnBurst(d.x + 7, d.y + 5, C.metalLight, 10);
        spawnBurst(d.x + 7, d.y + 5, C.amber, 6);
      } else hurtPlayer(d.x + d.w / 2);
    }
  }
}

function updateCells() {
  for (const cl of cells) {
    if (cl.got) continue;
    cl.t++;
    if (overlaps(player, cl)) {
      cl.got = true;
      score += 50;
      sfx.cell();
      spawnBurst(cl.x + 4, cl.y + 5, C.amber, 6);
    }
  }
}

function updateParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    const pt = particles[i];
    pt.x += pt.vx; pt.y += pt.vy; pt.vy += 0.12; pt.life--;
    if (pt.life <= 0) particles.splice(i, 1);
  }
}

/* ============================================================
   DRAWING
   ============================================================ */
function drawParallax(layer, factor, y, drift) {
  const w = layer.width;
  let off = ((camX * factor + (drift || 0)) % w + w) % w;
  ctx.drawImage(layer, -off, y);
  ctx.drawImage(layer, -off + w, y);
}

function drawWorld() {
  ctx.drawImage(layerSky, 0, 0);
  drawParallax(layerClouds, 0.08, 8, frame * 0.05);
  drawParallax(layerFar, 0.22, 0);
  drawParallax(layerNear, 0.5, 0);

  /* foreground glowing trees (behind tiles) */
  for (const tr of TREES) {
    const sx = tr.x - camX;
    if (sx > -80 && sx < VIEW_W + 80) drawTree(ctx, sx, tr.y, tr.s);
  }

  /* tiles */
  const tx0 = Math.max(0, Math.floor(camX / TILE));
  const tx1 = Math.min(MAPW - 1, Math.floor((camX + VIEW_W) / TILE) + 1);
  for (let ty = 0; ty < MAPH; ty++)
    for (let tx = tx0; tx <= tx1; tx++)
      drawTile(tx, ty, camX);

  drawGoal();

  /* energy cells */
  for (const cl of cells) {
    if (cl.got) continue;
    const bob = Math.sin(cl.t * 0.1) * 2;
    ctx.drawImage(sprCell, (cl.x - camX) | 0, (cl.y + bob) | 0);
  }

  /* walkers */
  for (const wlk of walkers) {
    if (!wlk.alive) continue;
    drawFlipped(sprWalker, wlk.x - camX, wlk.y, wlk.vx < 0);
  }

  /* drones */
  for (const d of drones) {
    if (!d.alive) continue;
    if ((frame & 2) === 0) {                 // rotor flicker
      ctx.fillStyle = C.metalLight;
      ctx.fillRect((d.x - camX) | 0, d.y | 0, 14, 1);
    }
    drawFlipped(sprDrone, d.x - camX, d.y, d.dir < 0);
  }

  drawPlayer();

  for (const pt of particles) {
    ctx.fillStyle = pt.color;
    ctx.fillRect(pt.x - camX | 0, pt.y | 0, 2, 2);
  }
}

function drawFlipped(spr, x, y, flip) {
  if (flip) {
    ctx.save();
    ctx.translate((x | 0) + spr.width, y | 0);
    ctx.scale(-1, 1);
    ctx.drawImage(spr, 0, 0);
    ctx.restore();
  } else {
    ctx.drawImage(spr, x | 0, y | 0);
  }
}

function drawPlayer() {
  const p = player;
  if (p.inv > 0 && (frame & 4) < 2) return;   // hurt blink
  let spr;
  if (!p.grounded) spr = sprPlayer.jump;
  else if (Math.abs(p.vx) > 0.3) spr = (p.anim | 0) % 2 ? sprPlayer.run1 : sprPlayer.run2;
  else spr = sprPlayer.idle;
  /* sprite is 14 wide, hitbox 10 — center it */
  drawFlipped(spr, p.x - 2 - camX, p.y, p.dir < 0);
}

function drawGoal() {
  const gx = GOAL.x - camX, gy = GOAL.y;
  if (gx < -60 || gx > VIEW_W + 60) return;
  const pulse = 0.6 + Math.sin(frame * 0.1) * 0.4;
  /* pillars */
  ctx.fillStyle = C.metalDark;
  ctx.fillRect(gx - 4, gy - 6, 8, GOAL.h + 6);
  ctx.fillRect(gx + GOAL.w - 4, gy - 6, 8, GOAL.h + 6);
  ctx.fillStyle = C.metal;
  ctx.fillRect(gx - 4, gy - 10, GOAL.w + 8, 6);
  /* glowing core */
  ctx.globalAlpha = 0.25 + pulse * 0.3;
  ctx.fillStyle = C.neon;
  ctx.fillRect(gx + 4, gy - 4, GOAL.w - 8, GOAL.h + 4);
  ctx.globalAlpha = 1;
  ctx.fillStyle = C.amber;
  ctx.fillRect(gx + GOAL.w / 2 - 1, gy - 4, 2, GOAL.h + 4);
  /* beacon lights */
  ctx.fillStyle = pulse > 0.8 ? C.amber : C.neonDeep;
  ctx.fillRect(gx - 2, gy - 9, 4, 4);
  ctx.fillRect(gx + GOAL.w - 2, gy - 9, 4, 4);
  ctx.fillStyle = C.white;
  ctx.font = '7px "Courier New", monospace';
  ctx.fillText('EXIT', gx + 4, gy - 13);
}

function drawHeart(x, y, full) {
  ctx.fillStyle = full ? C.neon : '#3a3a42';
  ctx.fillRect(x, y + 1, 3, 3);
  ctx.fillRect(x + 4, y + 1, 3, 3);
  ctx.fillRect(x + 1, y + 3, 5, 3);
  ctx.fillRect(x + 2, y + 5, 3, 2);
  ctx.fillRect(x + 3, y + 7, 1, 1);
  if (full) {
    ctx.fillStyle = C.amber;
    ctx.fillRect(x + 1, y + 2, 1, 1);
  }
}

function drawHUD() {
  ctx.fillStyle = 'rgba(12,12,16,0.55)';
  ctx.fillRect(4, 4, 118, 16);
  for (let i = 0; i < 3; i++) drawHeart(9 + i * 11, 8, i < player.hp);
  ctx.fillStyle = C.amber;
  ctx.font = '8px "Courier New", monospace';
  ctx.fillText('SCORE ' + score, 46, 15);

  /* progress bar to the exit */
  ctx.fillStyle = 'rgba(12,12,16,0.55)';
  ctx.fillRect(VIEW_W - 96, 4, 92, 10);
  ctx.fillStyle = '#3a3a42';
  ctx.fillRect(VIEW_W - 93, 7, 86, 4);
  ctx.fillStyle = C.neon;
  ctx.fillRect(VIEW_W - 93, 7, Math.min(86, 86 * player.x / GOAL.x), 4);
}

function centerText(txt, y, size, color) {
  ctx.font = 'bold ' + size + 'px "Courier New", monospace';
  ctx.fillStyle = color;
  ctx.fillText(txt, (VIEW_W - ctx.measureText(txt).width) / 2, y);
}

function drawTitle() {
  ctx.drawImage(layerSky, 0, 0);
  drawParallax(layerClouds, 0, 8, frame * 0.1);
  drawParallax(layerFar, 0, 0, frame * 0.12);
  drawParallax(layerNear, 0, 0, frame * 0.3);
  ctx.fillStyle = 'rgba(12,12,16,0.45)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  centerText('NEON HORIZON', 96, 32, C.neon);
  centerText('R E L O A D E D', 118, 12, C.amber);
  centerText('Arrows / WASD to move - Space to jump', 168, 9, C.white);
  centerText('Stomp the bots - Grab the cells - Reach the EXIT gate', 184, 9, C.white);
  if ((frame / 30 | 0) % 2 === 0) centerText('PRESS ENTER TO START', 222, 11, C.neon);
}

function drawOverlay(title, sub, color) {
  ctx.fillStyle = 'rgba(12,12,16,0.6)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  centerText(title, 116, 26, color);
  centerText(sub, 142, 11, C.white);
  centerText('FINAL SCORE  ' + score, 166, 11, C.amber);
  if ((frame / 30 | 0) % 2 === 0) centerText('PRESS R TO PLAY AGAIN', 200, 10, C.neon);
}

/* ============================================================
   MAIN LOOP
   ============================================================ */
function update() {
  if (state === 'play') {
    updatePlayer();
    if (state !== 'play') return;     // died / won during player update
    updateWalkers();
    updateDrones();
    updateCells();
    updateParticles();
    const target = player.x + player.w / 2 - VIEW_W * 0.42;
    camX += (target - camX) * 0.12;
    camX = Math.max(0, Math.min(LEVEL_W - VIEW_W, camX));
  } else if (state === 'win') {
    winTimer++;
    updateParticles();
    if (winTimer % 9 === 0) {
      spawnBurst(GOAL.x + Math.random() * GOAL.w, GOAL.y + Math.random() * GOAL.h,
        Math.random() > 0.5 ? C.neon : C.amber, 4);
    }
  }
}

function render() {
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);
  if (state === 'title') {
    drawTitle();
  } else {
    drawWorld();
    drawHUD();
    if (state === 'win') drawOverlay('LEVEL COMPLETE', 'You reached the horizon.', C.neon);
    if (state === 'gameover') drawOverlay('SYSTEM FAILURE', 'The grid claimed another runner.', '#d84a2a');
  }
}

function loop() {
  frame++;
  update();
  render();
  requestAnimationFrame(loop);
}
loop();

})();
