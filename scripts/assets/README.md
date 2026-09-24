# World assets

Everything the 3D world streams lives under `public/`. All of it is free: CC0,
authored here, free Sketchfab downloads (CC BY 4.0 / Sketchfab Standard — these
**require** attribution), or owner-supplied audio. Credits live in
`world.credits` (`src/config/world.config.ts`), shown at the Shadow Gate.

| Path                                   | What                                              | Source · license                                                                                   |
| -------------------------------------- | ------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `public/models/world/forged.glb`       | island underside, Shadow Gate, altar, crystals, rocks, obelisk, Hunter's License | **authored** — `forge.py` (Blender, procedural)                                                     |
| `public/models/world/sung.glb`         | Sung Jin-Woo, the Player (9 retargeted clips)     | [sung S solo leveling](https://sketchfab.com/3d-models/b477120b0c8642e9b94a7c347362dd75) by bgang0892 · Sketchfab Standard |
| `public/models/world/igris.glb`        | Igris — the fallen quests / shadow soldiers       | [Igris Solo Leveling](https://sketchfab.com/3d-models/igris-solo-leveling-0eeb4795c56d4a5cbca69ba2bd340c6a) by missafe · CC BY 4.0 |
| `public/models/world/wraith.glb`       | THE SYSTEM's body above the altar                 | [Death Star Asuirila Shadow Wraith](https://sketchfab.com/3d-models/death-star-asuirila-shadow-wraith-622cf16de38f4bc3afbf5c83870f96df) by patromes · CC BY 4.0 |
| `public/models/world/throne.glb`       | the Monarch's throne (Shadow Crypt)               | [Throne](https://sketchfab.com/3d-models/throne-090686ea4d314b789b4b47470d3057cd) by Matt LeMoine · CC BY 4.0 |
| `public/models/world/gargoyle.glb`     | Shadow Gate guardians                             | [Gargoyle (8.5K Tris)](https://sketchfab.com/3d-models/gargoyle-85k-tris-6ee63765c42642928c61510dac7b3df4) by adamvfc · CC BY 4.0 |
| `public/models/world/brazier.glb`      | violet-fire braziers along the roads              | [Medieval Brazier](https://sketchfab.com/3d-models/medieval-brazier-cff29e533e3a4298a5d112cf7bb2558c) by Sky_Hunter · CC BY 4.0 |
| `public/models/world/angel.glb`        | Double Dungeon statues around the altar           | [Angel (old marble version)](https://sketchfab.com/3d-models/angel-old-marble-version-2c879fc654b44f5e8d12527948535b51) by SebastianSosnowski · CC BY 4.0 |
| `public/models/world/hunter.glb`       | source of Sung's clips (not loaded by the app)    | [KayKit Adventurers](https://github.com/KayKit-Game-Assets/KayKit-Character-Pack-Adventures-1.0) · CC0 |
| `public/models/world/dungeon-kit.glb`  | 46 dungeon pieces, one shared atlas               | [KayKit Dungeon Remastered](https://github.com/KayKit-Game-Assets/KayKit-Dungeon-Remastered-1.0) · CC0 |
| `public/models/player.glb`             | the old Player hologram (unused since v6.1)       | the owner's own Mixamo export                                                                      |
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

**Sketchfab characters + props.** Sung ships without animations, so the
KayKit Hunter's clips are retargeted onto his Biped rig first (pure Python,
no dependencies), then everything is packed (same scratch-dir setup as above):

```bash
python3 scripts/assets/retarget.py public/models/world/hunter.glb "<zip>/source/sung S solo leveling.glb" <in>/sung-anim.glb
cp scripts/assets/pack-sketchfab.mjs <scratch> && cd <scratch>
IN_DIR=<in> OUT_DIR=<repo>/public/models/world node pack-sketchfab.mjs
```

Input names are listed at the bottom of `pack-sketchfab.mjs`; props used the
1k-texture GLB download.

Draco decoding is self-hosted in `public/draco/`.
