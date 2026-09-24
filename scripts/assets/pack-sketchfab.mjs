/**
 * Packs the Sketchfab downloads for the web (credits in README.md):
 *   sung.glb     — Sung Jin-Woo, the Player (after retarget.py baked the clips)
 *   igris.glb    — Igris, the shadow soldiers
 *   wraith.glb   — the Shadow Wraith, THE SYSTEM's body
 *   throne.glb · gargoyle.glb · brazier.glb · angel.glb — dungeon props
 *
 * Drops Sketchfab's wrapper hierarchy, re-encodes oversized PNG textures as
 * JPEG (ImageMagick), welds and draco-compresses.
 *
 *   IN_DIR=<sources> OUT_DIR=<repo>/public/models/world node pack-sketchfab.mjs
 *
 * IN_DIR holds the downloads under the input names listed at the bottom.
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { dedup, draco, flatten, prune, weld } from "@gltf-transform/functions";
import draco3d from "draco3dgltf";

const IN = process.env.IN_DIR ?? ".";
const OUT = process.env.OUT_DIR ?? ".";

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
  const doc = await io.read(join(IN, input));
  shrinkTextures(doc, { size });
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

await pack("sung-anim.glb", "sung.glb", { skinned: true });
await pack("igris_solo_leveling.glb", "igris.glb");
await pack("death_star_asuirila_shadow_wraith.glb", "wraith.glb");
await pack("throne.glb", "throne.glb");
await pack("gargoyle.glb", "gargoyle.glb", { size: 512 });
await pack("brazier.glb", "brazier.glb", { size: 512 });
await pack("angel.glb", "angel.glb", { size: 512 });
