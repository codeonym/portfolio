# World assets

Everything the 3D temple streams lives under `public/`. All of it is free:
Sketchfab downloads (CC BY 4.0 / Sketchfab Standard — these **require**
attribution), Mixamo characters and motion capture (free with an Adobe
account, royalty-free in projects), CC0 audio, or owner-supplied audio.
Credits live in `world.credits` (`src/config/world.config.ts`), shown at the
Shadow Gate.

| Path                              | What                                                    | Source · license |
| --------------------------------- | ------------------------------------------------------- | ---------------- |
| `public/models/world/hall.glb`    | the temple — nave, throne dais, stained glass, torches  | [Throne Room](https://sketchfab.com/3d-models/throne-room-247c37e6a9694ae891398911876f0c14) by Uğur Yakışık · CC BY 4.0 (trimmed by `hall.py`) |
| `public/models/world/sung.glb`    | Sung Jin-Woo, the Player (Mixamo clips retargeted)      | [sung S solo leveling](https://sketchfab.com/3d-models/b477120b0c8642e9b94a7c347362dd75) by bgang0892 · Sketchfab Standard; clips: Mixamo |
| `public/models/world/knight.glb`  | the shadow knights (fallen quests → risen soldiers)     | Mixamo *Paladin J Nordstrom* + clips; sword & plume from [Igris Solo Leveling](https://sketchfab.com/3d-models/igris-solo-leveling-0eeb4795c56d4a5cbca69ba2bd340c6a) by missafe · CC BY 4.0 |
| `public/models/world/wraith.glb`  | THE SYSTEM's body behind the throne                     | [Death Star Asuirila Shadow Wraith](https://sketchfab.com/3d-models/death-star-asuirila-shadow-wraith-622cf16de38f4bc3afbf5c83870f96df) by patromes · CC BY 4.0 |
| `public/models/world/lectern.glb` | Guild Hall station                                      | [Stone Book Lectern](https://sketchfab.com/3d-models/stone-book-lectern-821ec86f606a40f5b819bafc3ad013d4) by ambrosia04 · CC BY 4.0 |
| `public/models/world/chest.glb`   | Treasury station (animated lid)                         | [Old Roman-style Treasure Chest (animated)](https://sketchfab.com/3d-models/old-roman-style-treasure-chest-animated-a4f29fc04137433e8eb5470ddb75d311) by Theo Kain · CC BY 4.0 |
| `public/models/world/coins.glb`   | Treasury coins                                          | [Pile of Coins 3](https://sketchfab.com/3d-models/pile-of-coins-3-8c7efafa0470436688b67c90a5b423fb) by SebastianSosnowski · CC BY 4.0 |
| `public/models/world/sword.glb`   | Armory relic blade (stood upright by `orient.py`)       | [Sword of the Defeated](https://sketchfab.com/3d-models/sword-of-the-defeated-224a05d7ec8e4d1b990545128055d865) by Bunny-HungTD · CC BY 4.0 |
| `public/audio/*` (sfx)            | UI, footsteps, portal, ARISE                            | [Kenney](https://kenney.nl) interface / sci-fi / RPG packs · CC0 |
| `public/audio/theme.mp3`          | suspense theme loop (“21-mood-suspense-01”)             | supplied by the owner — re-encoded 128 kbps |
| `public/audio/notify.mp3`         | System notification chime                               | supplied by the owner (Solo Leveling System sound) — trimmed, re-encoded |

## Regenerating

All Blender scripts run headless (Blender ≥ 4.2):
`blender -b -P <script> -- <args>`. If Blender's Python can't import `numpy`
(glTF exporter dependency), they fall back to the distro's `site-packages`.

**1 · The temple.** Download *Throne Room* (glTF), then drop the feast props,
scale to world units (the Hunter is 2.2 tall) and put the floor at 0:

```bash
SRC_DIR=<dir with throne_room.glb> blender -b -P scripts/assets/hall.py   # → $SRC_DIR/hall.glb
```

Materials are restyled at runtime by name (`hall.tsx`), so the model stays
untouched. Torch/bowl positions in `hall.tsx` and the colliders in
`layout.ts` were measured from this model — re-measure if it changes.

**2 · Motion capture (Mixamo).** Mixamo's auto-rigger can't rig Sung or
Igris, so clips come from Mixamo characters and are retargeted:

```bash
# FBX (with skin) per clip, 30 fps, no keyframe reduction; "in place" for locomotion
blender -b -P scripts/assets/mixamo-merge.py -- sung-mx.glb Idle=idle.fbx Walk=walk.fbx …
python3 scripts/assets/retarget.py --from mixamo sung-mx.glb "<zip>/source/sung S solo leveling.glb" <in>/sung-mx.glb
```

`mixamo-merge.py` takes the armature from the first FBX and adds one NLA
track per clip; the app refers to clips by name (`hunter.tsx`,
`shadow-legion.tsx`), so keep them in sync. `mixamo-prep.py` turns a GLB into
a rest-pose FBX for Mixamo's uploader, should a character ever rig cleanly.

**3 · The knights.** Merge the Paladin's clips into `knight_raw.glb`
(step 2, no retarget), split Igris's sword and plume into
`igris_sword.glb` / `igris_plume.glb`, then bake them onto the rig:

```bash
SRC_DIR=<dir> blender -b -P scripts/assets/knight.py -- <in>/knight.glb
```

**4 · Props.** The sword download lies diagonally; stand it up (point down):

```bash
blender -b -P scripts/assets/orient.py -- sword_src.glb <in>/sword.glb
```

**5 · Pack for the web.** Strips Sketchfab's wrapper nodes, shrinks
textures (ImageMagick → JPEG), welds and draco-compresses:

```bash
mkdir <scratch> && cd <scratch>
npm init -y && npm i @gltf-transform/core@4 @gltf-transform/extensions@4 @gltf-transform/functions@4 draco3dgltf
cp <repo>/scripts/assets/pack-sketchfab.mjs .
IN_DIR=<in> OUT_DIR=<repo>/public/models/world node pack-sketchfab.mjs
ONLY=sword.glb IN_DIR=<in> OUT_DIR=… node pack-sketchfab.mjs   # just one
```

Input names are listed at the bottom of `pack-sketchfab.mjs`.

Draco decoding is self-hosted in `public/draco/`.
