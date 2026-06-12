# Neon Horizon: Reloaded

A pixel-art, afrofuturist/cyberpunk side-scrolling platformer built with pure
HTML5 canvas and vanilla JavaScript — no dependencies, no build step.

![aesthetic](https://img.shields.io/badge/palette-black%20%2F%20grey%20%2F%20orange-e8762a)

## Play

**Play online:** https://dermosef91.github.io/Neon-Horizon-Reloaded/

Or open `index.html` in any modern browser, or serve the folder:

```sh
npx serve .
# or
python3 -m http.server 8000
```

then visit `http://localhost:8000`.

## Controls

| Key | Action |
| --- | --- |
| ← / → or A / D | Move |
| ↑ / W / Space | Jump (hold for higher jumps) |
| Enter | Start game |
| R | Restart after win / game over |

**On mobile / touch devices** on-screen buttons appear automatically:
◀ ▶ to move, JUMP to jump, and tap the screen to start or restart.
The canvas scales to fill any screen size (landscape recommended).

## How to win

Run right across the neon city: jump the pits, hop the floating girder
platforms, **stomp** the patrol bots and hover drones (touching them from the
side hurts), and grab amber energy cells for points. Reach the glowing
**EXIT gate** at the far end of the level to complete it — remaining hearts
are converted into a score bonus.

## Features

- Side-scrolling camera with smooth follow and 4 layers of parallax
  (clouds, far skyline, near towers with orange windows and neon signs,
  glowing orange trees)
- Procedurally drawn pixel sprites: afro-haired runner with amber visor,
  patrol bots, hover drones, energy cells
- Platforming feel: coyote time, jump buffering, variable jump height,
  one-way girder platforms
- 3 hearts, invulnerability frames, pit respawn at last safe ground
- Win and game-over states, score, progress bar to the exit
- Tiny WebAudio sound effects (jump, stomp, hurt, pickup, fanfare)
- Mobile support: responsive canvas scaling and on-screen touch controls
- Auto-deployed to GitHub Pages via GitHub Actions on every push
