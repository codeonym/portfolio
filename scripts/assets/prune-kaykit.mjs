// V5 asset pipeline: prune KayKit (CC0) GLBs to what the world uses, merge the
// dungeon kit into one atlas-sharing GLB, draco-compress everything.
//
//   KAYKIT_DIR=<dir with the cloned KayKit repos> OUT_DIR=public/models/world \
//     node scripts/assets/prune-kaykit.mjs
//
// needs: @gltf-transform/{core,extensions,functions}@4 + draco3dgltf (install
// them in a scratch dir — they are not app dependencies). See README.md here.
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { dedup, draco, mergeDocuments, prune, unpartition, weld } from "@gltf-transform/functions";
import draco3d from "draco3dgltf";
import { mkdirSync, readdirSync } from "node:fs";
import path from "node:path";

const A = path.resolve(process.env.KAYKIT_DIR ?? "kaykit");
const OUT = path.resolve(process.env.OUT_DIR ?? "public/models/world");
mkdirSync(OUT, { recursive: true });

const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({
    "draco3d.encoder": await draco3d.createEncoderModule(),
    "draco3d.decoder": await draco3d.createDecoderModule(),
  });

function find(dir, name) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      const r = find(p, name);
      if (r) return r;
    } else if (e.name === name) return p;
  }
  return null;
}

async function finish(doc, out) {
  await doc.transform(dedup(), prune({ keepAttributes: false }), weld(), unpartition(), draco());
  await io.write(path.join(OUT, out), doc);
}

async function character(file, keepAnims, dropMeshes, out) {
  const doc = await io.read(find(A, file));
  const root = doc.getRoot();
  for (const anim of root.listAnimations()) {
    if (keepAnims.includes(anim.getName())) continue;
    // drop channels + samplers only; accessors may be shared with kept
    // clips (KayKit reuses time inputs) — prune removes the orphans
    for (const channel of anim.listChannels()) channel.dispose();
    for (const sampler of anim.listSamplers()) sampler.dispose();
    anim.dispose();
  }
  for (const node of root.listNodes()) {
    if (dropMeshes.includes(node.getName())) node.dispose();
  }
  const kept = root.listAnimations().map((a) => a.getName());
  const missing = keepAnims.filter((n) => !kept.includes(n));
  if (missing.length) throw new Error(`${file}: missing ${missing}`);
  await finish(doc, out);
  console.log(out, kept);
}

// ── the Player: hooded rogue with twin daggers
await character(
  "Rogue_Hooded.glb",
  ["Idle", "Walking_A", "Running_A", "Spellcast_Long", "Spellcast_Raise", "Dualwield_Melee_Attack_Slice", "Cheer", "Interact", "Jump_Full_Short"],
  ["1H_Crossbow", "2H_Crossbow", "Throwable"],
  "hunter.glb",
);

// ── the fallen: skeletons that ARISE as shadow soldiers
const skeletonAnims = [
  "Skeletons_Inactive_Floor_Pose",
  "Skeletons_Awaken_Floor_Long",
  "Idle",
  "Cheer",
  "Taunt",
  "Running_A",
  "Walking_D_Skeletons",
];
for (const kind of ["Warrior", "Minion", "Mage", "Rogue"]) {
  await character(`Skeleton_${kind}.glb`, skeletonAnims, [], `skeleton-${kind.toLowerCase()}.glb`);
}

// ── the dungeon kit: every piece as a named root node, one shared atlas
const pieces = [
  "pillar", "pillar_decorated", "column", "wall", "wall_arched", "wall_broken",
  "wall_doorway", "wall_pillar", "wall_cracked", "wall_half", "floor_tile_large",
  "floor_tile_big_grate", "floor_foundation_allsides", "stairs", "stairs_wide",
  "banner_patternA_white", "banner_thin_white", "banner_triple_white",
  "torch_mounted", "torch_lit", "candle_lit", "candle_triple", "chest", "chest_gold",
  "coin_stack_large", "coin_stack_medium", "shelves", "shelf_large", "shelf_small_candles",
  "table_long_decorated_A", "table_long_tablecloth_decorated_A", "table_medium_decorated_A",
  "barrel_large", "crates_stacked", "sword_shield", "sword_shield_gold", "rubble_large",
  "rubble_half", "trunk_large_A", "keg_decorated", "keyring_hanging", "barrier",
  "barrier_column", "box_stacked", "stool", "chair",
];
const kitDir = path.dirname(find(A, "wall.gltf.glb"));
const kit = await io.read(path.join(kitDir, "wall.gltf.glb"));
const kitScene = kit.getRoot().listScenes()[0];
for (const child of kitScene.listChildren()) child.dispose();
for (const name of pieces) {
  const file = readdirSync(kitDir).find((f) => f === `${name}.gltf.glb` || f === `${name}.glb`);
  if (!file) throw new Error(`kit piece missing: ${name}`);
  const src = await io.read(path.join(kitDir, file));
  const map = mergeDocuments(kit, src);
  const srcScene = map.get(src.getRoot().listScenes()[0]);
  const group = kit.createNode(name);
  for (const child of srcScene.listChildren()) group.addChild(child);
  kitScene.addChild(group);
  srcScene.dispose();
}
await finish(kit, "dungeon-kit.glb");
console.log("dungeon-kit.glb", kitScene.listChildren().length, "pieces");
