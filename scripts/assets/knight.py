# knight_raw.glb (Mixamo Paladin + clips, via mixamo-merge.py) + Igris sword/plume -> knight.glb
# usage: SRC_DIR=<dir> blender -b -P knight.py -- knight.glb [rx=90 rz=-90 ...]
# props are baked into the rest pose and skinned 100% to the hand / head bones
import sys, math
try:
    import numpy
except ImportError:
    sys.path.append(f"/usr/lib/python{sys.version_info.major}.{sys.version_info.minor}/site-packages")
import bpy
from mathutils import Vector, Matrix, Euler
a = sys.argv[sys.argv.index("--")+1:]
import os
D = os.path.join(os.environ.get("SRC_DIR", "."), "")  # knight_raw.glb, igris_sword.glb, igris_plume.glb
out = a[0]
P = dict(x.split("=") for x in a[1:])
f = lambda k, d: float(P.get(k, d))
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=D+"knight_raw.glb")
sc = bpy.context.scene
arm = next(o for o in sc.objects if o.type == "ARMATURE")
def load(name):
    before = set(sc.objects)
    bpy.ops.import_scene.gltf(filepath=D+f"igris_{name}.glb")
    new = [o for o in sc.objects if o not in before and o.type == "MESH"]
    bpy.ops.object.select_all(action="DESELECT")
    for o in new: o.select_set(True)
    bpy.context.view_layer.objects.active = new[0]
    if len(new) > 1: bpy.ops.object.join()
    ob = bpy.context.view_layer.objects.active
    ob.parent = None
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    for o in [o for o in sc.objects if o not in before and o.type != "MESH"]: bpy.data.objects.remove(o)
    ob.name = "Igris_" + name
    return ob
def bone_world(name):
    b = arm.pose.bones[name]
    m = arm.matrix_world @ b.matrix
    # drop the armature's cm→m scale so props keep their own size
    return Matrix.Translation(m.translation) @ m.to_quaternion().to_matrix().to_4x4()
k = f("scale", 0.63)
arm.data.pose_position = "REST"
bpy.context.view_layer.update()
body = next(o for o in sc.objects if o.type == "MESH" and o.name.startswith("Paladin_J_Nordstrom") and "Helmet" not in o.name)
def bind(ob, bone, world):
    """bake ob into rest space at `world` and skin it 100% to `bone`"""
    ob.data.transform(world)
    ob.matrix_world = Matrix()
    vg = ob.vertex_groups.new(name=bone)
    vg.add(range(len(ob.data.vertices)), 1.0, "REPLACE")
    mod = ob.modifiers.new("Armature", "ARMATURE"); mod.object = arm
    ob.parent = arm
    ob.matrix_parent_inverse = arm.matrix_world.inverted()
# ── sword: grip point (Igris coords) at the hand ──
sw = load("sword")
grip = Vector((f("gx", -0.99), f("gy", -0.15), f("gz", 0.33)))
for v in sw.data.vertices: v.co = (v.co - grip) * k
hw = bone_world("mixamorig:RightHand")
rot = Euler((math.radians(f("rx", 90)), math.radians(f("ry", 0)), math.radians(f("rz", -90))), "XYZ").to_matrix().to_4x4()
off = Matrix.Translation(Vector((f("ox", 0), f("oy", 0.08), f("oz", 0.03))))
bind(sw, "mixamorig:RightHand", hw @ off @ rot)
# ── plume on the helmet ──
pl = load("plume")
anchor = Vector((f("px", 0.07), f("py", 0.05), f("pz", 0.95)))
for v in pl.data.vertices: v.co = (v.co - anchor) * k * f("pscale", 0.85)
head = bone_world("mixamorig:Head")
pr = Euler((math.radians(f("prx", 0)), 0, 0), "XYZ").to_matrix().to_4x4()
bind(pl, "mixamorig:Head", Matrix.Translation(head.translation + Vector((0, f("pdy", 0.02), f("pdz", 0.22)))) @ pr)
arm.data.pose_position = "POSE"
bpy.context.view_layer.update()
print("HAND", hw.translation, "HEAD", head.translation)
bpy.ops.object.select_all(action="SELECT")
bpy.ops.export_scene.gltf(filepath=out, export_format="GLB", export_animation_mode="NLA_TRACKS", export_force_sampling=True)
