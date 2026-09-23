"""
The Forge — procedurally models the world's bespoke landmarks in Blender and
exports them as one draco-compressed GLB (public/models/world/forged.glb).

    blender -b --factory-startup --python scripts/assets/forge.py

Every asset is built at the origin (Blender Z-up; the glTF exporter converts to
Y-up) and exported as a named root node. Materials are named placeholders —
the app swaps them for its own shaders by name:
    obsidian · rune (emissive) · crystal · rock · gold · card · portal
"""

import math
import os
import random
import sys

# Blender may run on a Python that can't see the distro's numpy (the glTF
# exporter needs it); fall back to the system site-packages of the same version
try:
    import numpy  # noqa: F401
except ImportError:
    sys.path.append(f"/usr/lib/python{sys.version_info.major}.{sys.version_info.minor}/site-packages")

import bmesh
import bpy
from mathutils import Matrix, Vector, noise

random.seed(7)
OUT = os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "..", "..", "public", "models", "world", "forged.glb"
)

# ── scene reset ────────────────────────────────────────────────────────────
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene

MATERIALS = {}


def material(name, color, emission=None, metallic=0.0, roughness=0.6):
    if name in MATERIALS:
        return MATERIALS[name]
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = (*color, 1)
    bsdf.inputs["Metallic"].default_value = metallic
    bsdf.inputs["Roughness"].default_value = roughness
    if emission:
        bsdf.inputs["Emission Color"].default_value = (*emission, 1)
        bsdf.inputs["Emission Strength"].default_value = 2.0
    MATERIALS[name] = mat
    return mat


M_OBSIDIAN = material("obsidian", (0.03, 0.025, 0.05), metallic=0.2, roughness=0.35)
M_RUNE = material("rune", (0.4, 0.2, 1.0), emission=(0.55, 0.3, 1.0))
M_CRYSTAL = material("crystal", (0.35, 0.2, 0.9), emission=(0.3, 0.15, 0.8), roughness=0.1)
M_ROCK = material("rock", (0.09, 0.08, 0.1), roughness=0.95)
M_GOLD = material("gold", (0.9, 0.65, 0.2), metallic=1.0, roughness=0.3)
M_CARD = material("card", (0.05, 0.06, 0.1), roughness=0.4)
M_PORTAL = material("portal", (0.3, 0.1, 0.8), emission=(0.4, 0.2, 1.0))


def new_object(name, bm, mats):
    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()
    obj = bpy.data.objects.new(name, mesh)
    for m in mats:
        obj.data.materials.append(m)
    scene.collection.objects.link(obj)
    return obj


def join(name, parts):
    """merge several objects into one named mesh object"""
    bpy.ops.object.select_all(action="DESELECT")
    for p in parts:
        p.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]
    bpy.ops.object.join()
    obj = bpy.context.view_layer.objects.active
    obj.name = name
    obj.data.name = name
    return obj


def apply_all(obj):
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    for mod in list(obj.modifiers):
        bpy.ops.object.modifier_apply(modifier=mod.name)
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)


def shade(obj, smooth=False, angle=35):
    for poly in obj.data.polygons:
        poly.use_smooth = smooth
    if smooth:
        obj.data.set_sharp_from_angle(angle=math.radians(angle))


def prism(bm, sides, r_bottom, r_top, z0, z1, offset=(0, 0), twist=0.0, mat=0):
    """closed n-gon frustum between z0 and z1"""
    ox, oy = offset
    bottom, top = [], []
    for i in range(sides):
        a = 2 * math.pi * i / sides
        bottom.append(bm.verts.new((ox + r_bottom * math.cos(a), oy + r_bottom * math.sin(a), z0)))
        a2 = a + twist
        top.append(bm.verts.new((ox + r_top * math.cos(a2), oy + r_top * math.sin(a2), z1)))
    faces = [bm.faces.new(bottom[::-1]), bm.faces.new(top)]
    for i in range(sides):
        j = (i + 1) % sides
        faces.append(bm.faces.new((bottom[i], bottom[j], top[j], top[i])))
    for f in faces:
        f.material_index = mat
    return faces


def shard(bm, base, height, radius, tilt, yaw, sides=6, mat=0):
    """elongated crystal: hexagonal body with a pointed tip, tilted and yawed"""
    rot = Matrix.Rotation(yaw, 4, "Z") @ Matrix.Rotation(tilt, 4, "X")
    body_h = height * 0.72
    ring_b, ring_t = [], []
    for i in range(sides):
        a = 2 * math.pi * i / sides
        p = Vector((radius * math.cos(a), radius * math.sin(a), 0))
        ring_b.append(bm.verts.new(base + rot @ (p * 0.8)))
        ring_t.append(bm.verts.new(base + rot @ (p + Vector((0, 0, body_h)))))
    tip = bm.verts.new(base + rot @ Vector((0, 0, height)))
    faces = [bm.faces.new(ring_b[::-1])]
    for i in range(sides):
        j = (i + 1) % sides
        faces.append(bm.faces.new((ring_b[i], ring_b[j], ring_t[j], ring_t[i])))
        faces.append(bm.faces.new((ring_t[i], ring_t[j], tip)))
    for f in faces:
        f.material_index = mat


# ── 1 · THE ISLAND — cliff underside + broken rim, top surface is drawn in-app ──
def forge_island(radius=32.0, depth=24.0):
    bm = bmesh.new()
    rings, seg = 26, 96
    grid = []
    for r in range(rings + 1):
        t = r / rings
        # rim flares out a touch, then the rock tapers into a jagged root
        rad = radius * (1.02 - 0.15 * t) * (1 - t ** 1.7) + 0.6
        z = -depth * (t ** 1.15) - 0.15
        row = []
        for s in range(seg):
            a = 2 * math.pi * s / seg
            p = Vector((rad * math.cos(a), rad * math.sin(a), z))
            n = noise.noise(p * 0.11) * 4.0 + noise.noise(p * 0.35) * 1.6
            # vertical strata: ridged noise sampled mostly along the angle
            ridge = 1 - abs(noise.noise(Vector((a * 9.0, t * 1.5, 3.3))))
            push = Vector((math.cos(a), math.sin(a), 0)) * (n + ridge * 2.4) * (0.3 + t)
            p += push
            p.z += noise.noise(p * 0.2 + Vector((5, 1, 3))) * 2.4 * t
            row.append(bm.verts.new(p))
        grid.append(row)
    for r in range(rings):
        for s in range(seg):
            n = (s + 1) % seg
            bm.faces.new((grid[r][s], grid[r][n], grid[r + 1][n], grid[r + 1][s]))
    tip = bm.verts.new((0, 0, -depth - 5))
    for s in range(seg):
        bm.faces.new((grid[-1][s], grid[-1][(s + 1) % seg], tip))
    # hanging stalactites so the silhouette reads as torn-out bedrock
    for k in range(26):
        a = random.uniform(0, 2 * math.pi)
        t = random.uniform(0.35, 0.8)
        rad = (radius * (1.02 - 0.15 * t) * (1 - t ** 1.7)) * 0.92
        z = -depth * (t ** 1.15) - 0.5
        length = random.uniform(3, 9) * (1.2 - t)
        c = Vector((rad * math.cos(a), rad * math.sin(a), z))
        geom = bmesh.ops.create_cone(bm, cap_ends=True, segments=5, radius1=random.uniform(0.8, 2.2), radius2=0.0, depth=length)["verts"]
        bmesh.ops.rotate(bm, cent=(0, 0, 0), matrix=Matrix.Rotation(math.pi + random.uniform(-0.25, 0.25), 3, "X"), verts=geom)
        bmesh.ops.translate(bm, vec=c - Vector((0, 0, length / 2)), verts=geom)
    island = new_object("island_rock", bm, [M_ROCK])
    bpy.ops.object.select_all(action="DESELECT")
    island.select_set(True)
    bpy.context.view_layer.objects.active = island
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.mesh.normals_make_consistent(inside=False)
    bpy.ops.object.mode_set(mode="OBJECT")
    shade(island, smooth=True, angle=50)

    # glowing mana veins running down the cliff — thin emissive ribbons
    veins = bmesh.new()
    for k in range(9):
        a0 = random.uniform(0, 2 * math.pi)
        prev = None
        for step in range(14):
            t = step / 13
            a = a0 + math.sin(t * 5 + k) * 0.08
            rad = radius * (1.02 - 0.15 * t) * (1 - t ** 1.7) + 0.9
            z = -depth * (t ** 1.15) * 0.8 - 0.4
            c = Vector((rad * math.cos(a), rad * math.sin(a), z))
            side = Vector((-math.sin(a), math.cos(a), 0)) * (0.18 * (1 - t) + 0.04)
            pair = (veins.verts.new(c - side), veins.verts.new(c + side))
            if prev:
                f = veins.faces.new((prev[0], prev[1], pair[1], pair[0]))
                f.material_index = 0
            prev = pair
    vein_obj = new_object("island_veins", veins, [M_RUNE])
    shade(vein_obj)
    return [island, vein_obj]


# ── 2 · THE SHADOW GATE — obsidian shards ringing an oval rift ──────────────
def forge_gate():
    bm = bmesh.new()
    rx, rz, cz = 4.6, 6.4, 7.4  # oval radii and center height
    count = 34
    for i in range(count):
        a = 2 * math.pi * i / count
        edge = Vector((rx * math.cos(a), 0, cz + rz * math.sin(a)))
        outward = Vector((math.cos(a) / rx, 0, math.sin(a) / rz)).normalized()
        length = random.uniform(1.8, 4.6) * (1.6 if i % 4 == 0 else 1) * (1.3 if math.sin(a) > 0.3 else 1)
        rot = (outward + Vector((random.uniform(-0.35, 0.35), random.uniform(-0.3, 0.3), random.uniform(-0.35, 0.35)))).normalized().to_track_quat("Z", "Y").to_matrix().to_4x4()
        base = edge - outward * 0.4
        ring_b, ring_t = [], []
        sides, r = 5, random.uniform(0.45, 0.95)
        for s in range(sides):
            aa = 2 * math.pi * s / sides + random.uniform(-0.2, 0.2)
            p = Vector((r * math.cos(aa), r * math.sin(aa) * 0.6, 0))
            ring_b.append(bm.verts.new(base + rot @ p))
            ring_t.append(bm.verts.new(base + rot @ (p * 0.55 + Vector((0, 0, length * 0.55)))))
        tip = bm.verts.new(base + rot @ Vector((random.uniform(-0.2, 0.2), 0, length)))
        bm.faces.new(ring_b[::-1])
        for s in range(sides):
            n = (s + 1) % sides
            bm.faces.new((ring_b[s], ring_b[n], ring_t[n], ring_t[s]))
            bm.faces.new((ring_t[s], ring_t[n], tip))
    # a solid obsidian band that holds the shards together
    band = []
    seg = 64
    for i in range(seg):
        a = 2 * math.pi * i / seg
        c = Vector((rx * math.cos(a), 0, cz + rz * math.sin(a)))
        o = Vector((math.cos(a) / rx, 0, math.sin(a) / rz)).normalized()
        band.append([bm.verts.new(c + o * dx + Vector((0, dy, 0))) for dx, dy in ((-0.1, -0.5), (0.7, -0.5), (0.7, 0.5), (-0.1, 0.5))])
    for i in range(seg):
        n = (i + 1) % seg
        for k in range(4):
            kk = (k + 1) % 4
            bm.faces.new((band[i][k], band[n][k], band[n][kk], band[i][kk]))
    frame = new_object("gate_frame", bm, [M_OBSIDIAN])
    shade(frame)

    # three-tier stepped dais with rune inlays on every riser
    dais = bmesh.new()
    for tier, (w, d, z0, z1) in enumerate(((13, 7, 0, 0.45), (10, 5.4, 0.45, 0.9), (7.5, 3.8, 0.9, 1.3))):
        geom = bmesh.ops.create_cube(dais, size=1)["verts"]
        bmesh.ops.scale(dais, vec=(w, d, z1 - z0), verts=geom)
        bmesh.ops.translate(dais, vec=(0, 0, (z0 + z1) / 2), verts=geom)
    runes = bmesh.new()
    for tier, (w, d, z0, z1) in enumerate(((13, 7, 0, 0.45), (10, 5.4, 0.45, 0.9), (7.5, 3.8, 0.9, 1.3))):
        marks = int(w * 1.4)
        for m in range(marks):
            x = -w / 2 + (m + 0.5) * w / marks
            h = (z1 - z0) * random.uniform(0.3, 0.6)
            geom = bmesh.ops.create_cube(runes, size=1)["verts"]
            bmesh.ops.scale(runes, vec=(w / marks * random.uniform(0.25, 0.55), 0.03, h), verts=geom)
            bmesh.ops.translate(runes, vec=(x, -d / 2 - 0.01, (z0 + z1) / 2), verts=geom)
    dais_obj = new_object("gate_dais", dais, [M_OBSIDIAN])
    rune_obj = new_object("gate_runes", runes, [M_RUNE])

    # twin monoliths flanking the rift
    mono = bmesh.new()
    for side in (-1, 1):
        prism(mono, 4, 1.0, 0.55, 0, 11.5, offset=(side * 7.6, 0), twist=0.25)
    mono_obj = new_object("gate_monoliths", mono, [M_OBSIDIAN])
    shade(mono_obj)
    mono_runes = bmesh.new()
    for side in (-1, 1):
        z = 1.2
        while z < 9.5:
            h = random.uniform(0.25, 1.1)
            w = random.choice((0.08, 0.08, 0.3))
            geom = bmesh.ops.create_cube(mono_runes, size=1)["verts"]
            bmesh.ops.scale(mono_runes, vec=(w, 0.05, h), verts=geom)
            depth_at = 1.0 - (z / 11.5) * 0.45  # follow the taper of the monolith
            bmesh.ops.translate(mono_runes, vec=(side * 7.6, -depth_at * 0.72, z + h / 2), verts=geom)
            z += h + random.uniform(0.12, 0.35)
    mono_rune_obj = new_object("gate_monolith_runes", mono_runes, [M_RUNE])

    gate = join("gate", [frame, dais_obj, mono_obj, rune_obj, mono_rune_obj])

    # the rift itself — an oval disc with radial UVs for the portal shader
    rift = bmesh.new()
    center = rift.verts.new((0, 0.05, cz))
    uv_center = (0.5, 0.5)
    ring = []
    seg = 64
    for i in range(seg):
        a = 2 * math.pi * i / seg
        ring.append(rift.verts.new((rx * 0.98 * math.cos(a), 0.05, cz + rz * 0.98 * math.sin(a))))
    uv = rift.loops.layers.uv.new()
    for i in range(seg):
        f = rift.faces.new((center, ring[(i + 1) % seg], ring[i]))
        for loop in f.loops:
            if loop.vert is center:
                loop[uv].uv = uv_center
            else:
                idx = ring.index(loop.vert)
                a = 2 * math.pi * idx / seg
                loop[uv].uv = (0.5 + 0.5 * math.cos(a), 0.5 + 0.5 * math.sin(a))
    portal = new_object("gate_portal", rift, [M_PORTAL])
    return [gate, portal]


# ── 3 · THE AWAKENING ALTAR — hex dais, rune grooves, six obelisks ──────────
def forge_altar():
    bm = bmesh.new()
    for r, z0, z1 in ((5.6, 0, 0.35), (4.4, 0.35, 0.7), (3.1, 0.7, 1.05)):
        prism(bm, 6, r, r * 0.97, z0, z1)
    prism(bm, 6, 1.0, 0.8, 1.05, 1.9)  # center pedestal
    dais = new_object("altar_dais", bm, [M_OBSIDIAN])
    shade(dais)

    grooves = bmesh.new()
    for r, z in ((5.0, 0.36), (3.75, 0.71), (2.5, 1.06)):
        inner, outer = [], []
        seg = 72
        for i in range(seg):
            a = 2 * math.pi * i / seg
            inner.append(grooves.verts.new(((r - 0.09) * math.cos(a), (r - 0.09) * math.sin(a), z)))
            outer.append(grooves.verts.new(((r + 0.09) * math.cos(a), (r + 0.09) * math.sin(a), z)))
        for i in range(seg):
            n = (i + 1) % seg
            grooves.faces.new((inner[i], inner[n], outer[n], outer[i]))
    # radial spokes on the top tier
    for k in range(6):
        a = 2 * math.pi * k / 6 + math.pi / 6
        d = Vector((math.cos(a), math.sin(a), 0))
        s = Vector((-d.y, d.x, 0)) * 0.06
        p0, p1 = d * 1.1, d * 2.45
        vs = [grooves.verts.new(p + o + Vector((0, 0, 1.061))) for p, o in ((p0, -s), (p1, -s), (p1, s), (p0, s))]
        grooves.faces.new(vs)
    groove_obj = new_object("altar_runes", grooves, [M_RUNE])

    obelisks = bmesh.new()
    for k in range(6):
        a = 2 * math.pi * k / 6
        prism(obelisks, 4, 0.42, 0.18, 0, 3.6 + (k % 2) * 0.9, offset=(6.7 * math.cos(a), 6.7 * math.sin(a)), twist=a)
    ob = new_object("altar_obelisks", obelisks, [M_OBSIDIAN])
    shade(ob)
    return [join("altar", [dais, groove_obj, ob])]


# ── 4 · MANA CRYSTALS — one cluster + one loose shard ──────────────────────
def forge_crystals():
    bm = bmesh.new()
    shard(bm, Vector((0, 0, 0)), 3.4, 0.42, 0.0, 0.0)
    for k in range(7):
        a = 2 * math.pi * k / 7 + random.uniform(-0.3, 0.3)
        base = Vector((0.45 * math.cos(a), 0.45 * math.sin(a), 0))
        shard(bm, base, random.uniform(1.2, 2.6), random.uniform(0.18, 0.32), random.uniform(0.35, 0.75), a - math.pi / 2)
    cluster = new_object("crystal_cluster", bm, [M_CRYSTAL])
    shade(cluster)
    single = bmesh.new()
    shard(single, Vector((0, 0, -0.9)), 1.8, 0.3, 0, 0)
    # mirror the tip below so the loose shard reads as a floating bipyramid
    geom = bmesh.ops.create_cone(single, cap_ends=True, segments=6, radius1=0.24, radius2=0.0, depth=0.6)["verts"]
    bmesh.ops.rotate(single, cent=(0, 0, 0), matrix=Matrix.Rotation(math.pi, 3, "X"), verts=geom)
    bmesh.ops.translate(single, vec=(0, 0, -1.2), verts=geom)
    loose = new_object("crystal_shard", single, [M_CRYSTAL])
    shade(loose)
    return [cluster, loose]


# ── 5 · FLOATING ROCKS — three displaced variants ──────────────────────────
def forge_rocks():
    out = []
    for name, size, seed in (("rock_a", 1.0, 1), ("rock_b", 1.4, 2), ("rock_c", 0.8, 3)):
        bm = bmesh.new()
        bmesh.ops.create_icosphere(bm, subdivisions=3, radius=size)
        for v in bm.verts:
            p = v.co
            n = noise.noise(p * 1.1 + Vector((seed * 7, 0, 0))) * 0.5 + noise.noise(p * 2.7) * 0.2
            v.co = p * (1 + n)
            if v.co.z > 0:
                v.co.z *= 0.7
            else:
                v.co.z *= 1.5 + 0.8 * max(0.0, -v.co.z / size)  # tapering root
        obj = new_object(name, bm, [M_ROCK])
        shade(obj)
        out.append(obj)
    return out


# ── 6 · RUNE OBELISK — boundary / waypoint marker ──────────────────────────
def forge_obelisk():
    bm = bmesh.new()
    prism(bm, 4, 0.55, 0.3, 0, 4.2, twist=0.12)
    prism(bm, 4, 0.3, 0.0, 4.2, 5.0, twist=0.12)
    body = new_object("obelisk_body", bm, [M_OBSIDIAN])
    shade(body)
    strip = bmesh.new()
    for k in range(5):
        geom = bmesh.ops.create_cube(strip, size=1)["verts"]
        bmesh.ops.scale(strip, vec=(0.28, 0.04, 0.4), verts=geom)
        bmesh.ops.translate(strip, vec=(0, -0.5 + k * 0.04, 0.8 + k * 0.7), verts=geom)
    glyphs = new_object("obelisk_runes", strip, [M_RUNE])
    return [join("obelisk", [body, glyphs])]


# ── 7 · THE HUNTER'S LICENSE — a bevelled card with a gold frame ────────────
def forge_license():
    bm = bmesh.new()
    geom = bmesh.ops.create_cube(bm, size=1)["verts"]
    bmesh.ops.scale(bm, vec=(1.7, 0.05, 1.08), verts=geom)
    card = new_object("license_card", bm, [M_CARD])
    bev = card.modifiers.new("bevel", "BEVEL")
    bev.width, bev.segments = 0.08, 3
    apply_all(card)
    shade(card, smooth=True)

    frame = bmesh.new()
    w, h, t = 1.62, 1.0, 0.045
    for (x0, z0, x1, z1) in ((-w / 2, h / 2 - t, w / 2, h / 2), (-w / 2, -h / 2, w / 2, -h / 2 + t), (-w / 2, -h / 2, -w / 2 + t, h / 2), (w / 2 - t, -h / 2, w / 2, h / 2)):
        geom = bmesh.ops.create_cube(frame, size=1)["verts"]
        bmesh.ops.scale(frame, vec=(x1 - x0, 0.07, z1 - z0), verts=geom)
        bmesh.ops.translate(frame, vec=((x0 + x1) / 2, 0, (z0 + z1) / 2), verts=geom)
    # emblem: a gold diamond on the left
    geom = bmesh.ops.create_cube(frame, size=1)["verts"]
    bmesh.ops.scale(frame, vec=(0.32, 0.07, 0.32), verts=geom)
    bmesh.ops.rotate(frame, cent=(0, 0, 0), matrix=Matrix.Rotation(math.pi / 4, 3, "Y"), verts=geom)
    bmesh.ops.translate(frame, vec=(-0.48, 0, 0.05), verts=geom)
    gold = new_object("license_gold", frame, [M_GOLD])
    return [join("license", [card, gold])]


made = []
made += forge_island()
made += forge_gate()
made += forge_altar()
made += forge_crystals()
made += forge_rocks()
made += forge_obelisk()
made += forge_license()

for obj in made:
    obj.location = (0, 0, 0)

bpy.ops.export_scene.gltf(
    filepath=os.path.abspath(OUT),
    export_format="GLB",
    export_apply=True,
    export_yup=True,
    export_draco_mesh_compression_enable=True,
    export_draco_mesh_compression_level=7,
    export_materials="EXPORT",
    export_animations=False,
    export_cameras=False,
    export_lights=False,
)
print("FORGED", [o.name for o in made], os.path.getsize(os.path.abspath(OUT)) // 1024, "KB")
