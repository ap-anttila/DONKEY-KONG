# DK Island Prototype

Browser-based Phaser 3 prototype inspired by Nintendo-style Donkey Kong platformers. The world mixes 2.5D parallax scenery with 3D-look placeholder characters so you can iterate rapidly while final art is still in production.

## Getting Started

```bash
npm install
npm run dev
```

The dev server opens automatically; press `q` in the terminal to stop it. For production builds run `npm run build` (requires Node.js ≥ 20 because of Vite 7). If you stay on Node 18 you can still develop, but Vite will warn about the engine mismatch.

## Controls

- `← / →` – Run left / right
- `↑` or `Space` – Jump (press mid-air for a double jump)
- `↓` while on a ladder – Climb down
- `P` – Toggle pause overlay
- `F1` – Toggle debug HUD (position, velocity, totals)
- `R` – Restart the level (also works after Game Over)

Collect bananas to increase your score, avoid rolling barrels, and use ladders to reach higher platforms. Losing all hearts triggers a game-over overlay with restart instructions.

## Scene Highlights

- **Parallax world** built with placeholder procedural textures and a five-screen-long level layout generated in `src/world/LevelBuilder.ts`.
- **Player controller** with coyote time, double jump, ladder climbing, hit stun, and camera shake feedback (`src/gameobjects/Player.ts`).
- **Collectibles & hazards** powered by reusable prefabs (`src/gameobjects/Banana.ts`, `src/gameobjects/Barrel.ts`).
- **HUD overlay** (`src/ui/Hud.ts`) showing hearts, banana count, and run timer plus optional debug panel.
- **Quality-of-life**: pause overlay, restart shortcut, and restart-safe event wiring to keep iteration quick.

## Next Steps

- Swap in final 3D renders or sprite sheets via the existing preload hooks.
- Extend `LevelBuilder` with additional layers (ropes, collapsible bridges, enemy spawners).
- Hook up audio cues for jumps, banana pickups, and hazards.
- Integrate tween-based transitions or a world-map scene to connect multiple levels.

Feel free to iterate on the plan items in `src/world/LevelBuilder.ts` to author different stages. The architecture keeps systems decoupled so you can replace placeholder art and add new mechanics without large rewrites.

