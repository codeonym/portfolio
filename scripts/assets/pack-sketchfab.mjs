/**
 * Packs the scene's downloads for the web (credits in README.md):
 *   hall.glb     — the temple (Sketchfab "Throne Room", trimmed by hall.py)
 *   sung.glb     — Sung Jin-Woo, the Player (Mixamo clips baked by retarget.py)
 *   knight.glb   — the shadow knights (Mixamo Paladin + Igris's sword & plume, knight.py)
 *   wraith.glb   — the Shadow Wraith, THE SYSTEM's body
 *   lectern.glb · chest.glb · coins.glb · sword.glb — station props
 *
 * Drops Sketchfab's wrapper hierarchy, re-encodes oversized PNG textures as
 * JPEG (ImageMagick), strips specular extensions, welds and draco-compresses.
 *
 *   IN_DIR=<sources> OUT_DIR=<repo>/public/models/world node pack-sketchfab.mjs
 *   ONLY=sword.glb,hall.glb …   repacks just those outputs
 *
 * IN_DIR holds the downloads under the input names listed at the bottom.
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS, KHRMaterialsSpecular } from "@gltf-transform/extensions";
import { dedup, draco, flatten, prune, weld } from "@gltf-transform/functions";
import draco3d from "draco3dgltf";

const IN = process.env.IN_DIR ?? ".";
const OUT = process.env.OUT_DIR ?? ".";
const ONLY = process.env.ONLY?.split(",");

const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({
    "draco3d.decoder": await draco3d.createDecoderModule(),
    "draco3d.encoder": await draco3d.createEncoderModule(),
  });

/** PNG textures over `maxKB` become JPEG at `size`px (none of these use alpha) */
function shrinkTextures(doc, { maxKB = 200, size = 1024 }) {
  const scratch = mkdtempSync(join(tmpdir(), "pack-"));
  for (const tex of doc.getRoot().listTextures()) {
    const img = tex.getImage();
    if (!img || img.byteLength < maxKB * 1024) continue;
    const src = join(scratch, "in.png");
    const dst = join(scratch, "out.jpg");
    writeFileSync(src, img);
    execFileSync("magick", [src, "-resize", `${size}x${size}>`, "-quality", "84", dst]);
    tex.setImage(readFileSync(dst)).setMimeType("image/jpeg").setURI("");
    console.log(`    texture ${(img.byteLength / 1024) | 0} KB → ${(readFileSync(dst).byteLength / 1024) | 0} KB`);
  }
}

async function pack(input, output, { skinned = false, size = 1024 } = {}) {
  if (ONLY && !ONLY.includes(output)) return;
  const doc = await io.read(join(IN, input));
  // specular maps barely register under this lighting; not worth the bytes
  doc.getRoot().listExtensionsUsed().filter((e) => e.extensionName === KHRMaterialsSpecular.EXTENSION_NAME).forEach((e) => e.dispose());
  shrinkTextures(doc, { maxKB: 64, size });
  // flatten would detach joints from their skeleton — static meshes only
  if (!skinned) await doc.transform(flatten());
  await doc.transform(
    dedup(),
    prune(),
    weld(),
    draco({ method: "edgebreaker", quantizePosition: 14, quantizeNormal: 10, quantizeTexcoord: 12 }),
  );
  const bytes = await io.writeBinary(doc);
  writeFileSync(join(OUT, output), bytes);
  console.log(`  ${output.padEnd(12)} ${(bytes.byteLength / 1024) | 0} KB`);
}

await pack("hall.glb", "hall.glb", { size: 1024 });
await pack("sung-mx.glb", "sung.glb", { skinned: true });
await pack("knight.glb", "knight.glb", { skinned: true });
await pack("death_star_asuirila_shadow_wraith.glb", "wraith.glb");
await pack("stone_book_lectern.glb", "lectern.glb", { size: 512 });
await pack("old_roman_style_treasure_chest_animated.glb", "chest.glb", { skinned: true, size: 512 });
await pack("pile_of_coins_3.glb", "coins.glb", { size: 512 });
// stood upright, point down, by scripts/assets/orient.py first
await pack("sword_of_the_defeated.glb", "sword.glb", { size: 512 });
