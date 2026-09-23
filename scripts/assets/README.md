# World assets

Everything the 3D world streams lives under `public/`. Nearly all of it is free —
CC0 or authored here (the two owner-supplied audio files excepted) — and nothing needs attribution, though we credit anyway
(`world.credits` in `src/config/world.config.ts`, shown at the Shadow Gate).

| Path                                   | What                                              | Source · license                                                                                   |
| -------------------------------------- | ------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `public/models/world/forged.glb`       | island underside, Shadow Gate, altar, crystals, rocks, obelisk, Hunter's License | **authored** — `forge.py` (Blender, procedural)                                                     |
| `public/models/world/hunter.glb`       | the Hunter (Rogue_Hooded, 9 clips)                | [KayKit Adventurers](https://github.com/KayKit-Game-Assets/KayKit-Character-Pack-Adventures-1.0) · CC0 |
| `public/models/world/skeleton-*.glb`   | the fallen quests (7 clips each)                  | [KayKit Skeletons](https://github.com/KayKit-Game-Assets/KayKit-Character-Pack-Skeletons-1.0) · CC0   |
| `public/models/world/dungeon-kit.glb`  | 46 dungeon pieces, one shared atlas               | [KayKit Dungeon Remastered](https://github.com/KayKit-Game-Assets/KayKit-Dungeon-Remastered-1.0) · CC0 |
| `public/models/player.glb`             | the Player hologram (Mixamo rig)                  | the owner's own Mixamo export                                                                      |
| `public/env/night.hdr`                 | night sky (kloppenheim_02_puresky, 1k)            | [Poly Haven](https://polyhaven.com) · CC0                                                           |
| `public/textures/stone/*`              | plateau floor (monastery_stone_floor, 1k)         | [Poly Haven](https://polyhaven.com) · CC0                                                           |
| `public/audio/*` (sfx)                 | UI, footsteps, portal, ARISE                      | [Kenney](https://kenney.nl) interface / sci-fi / RPG packs · CC0                                    |
| `public/audio/theme.mp3`               | suspense theme loop (“21-mood-suspense-01”)       | supplied by the owner — re-encoded 128 kbps                                                          |
| `public/audio/notify.mp3`              | System notification chime                         | supplied by the owner (Solo Leveling System sound) — trimmed, re-encoded                             |

## Regenerating

**Forged set** (Blender ≥ 4.2; edit the script, re-run, commit the GLB):

```bash
blender -b --factory-startup --python scripts/assets/forge.py
```

If Blender's Python can't import `numpy` (glTF exporter dependency), the
script falls back to the distro's `site-packages` for the same Python version.

**KayKit characters + kit** (prunes unused clips/meshes, merges the kit into
one GLB, draco-compresses — ~30 MB of sources → ~2 MB):

```bash
mkdir -p /tmp/kaykit && cd /tmp/kaykit
for r in Dungeon-Remastered-1.0 Character-Pack-Skeletons-1.0 Character-Pack-Adventures-1.0; do
  git clone --depth 1 https://github.com/KayKit-Game-Assets/KayKit-$r.git
done
npm init -y && npm i @gltf-transform/core@4 @gltf-transform/extensions@4 @gltf-transform/functions@4 draco3dgltf
cp <repo>/scripts/assets/prune-kaykit.mjs . && KAYKIT_DIR=. OUT_DIR=<repo>/public/models/world node prune-kaykit.mjs
```

Clip and piece lists live at the top of `prune-kaykit.mjs`; the app refers to
clips by name (`hunter.tsx`, `shadow-legion.tsx`) and pieces by name
(`<Kit name="…" />`), so keep them in sync.

Draco decoding is self-hosted in `public/draco/`.
