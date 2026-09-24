# glb -> Mixamo-ready FBX: rest-pose mesh only, joined, ~1.8 m, feet at 0, facing -Y (front)
import sys, math
try:
    import numpy
except ImportError:
    sys.path.append(f"/usr/lib/python{sys.version_info.major}.{sys.version_info.minor}/site-packages")
import bpy
from mathutils import Vector
args = sys.argv[sys.argv.index("--")+1:]
src, out, height = args[0], args[1], float(args[2])
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
sc = bpy.context.scene
for o in list(sc.objects):
    if o.type == "MESH":
        for m in list(o.modifiers):
            if m.type == "ARMATURE": o.modifiers.remove(m)
        o.vertex_groups.clear()
        if o.data.shape_keys: o.shape_key_clear()
meshes = [o for o in sc.objects if o.type == "MESH" and o.name != "Icosphere"]
for o in list(sc.objects):
    if o not in meshes: bpy.data.objects.remove(o, do_unlink=True)
# bake world transforms into the meshes
for o in meshes:
    mw = o.matrix_world.copy(); o.parent = None; o.matrix_world = mw
bpy.ops.object.select_all(action="DESELECT")
for o in meshes: o.select_set(True)
bpy.context.view_layer.objects.active = meshes[0]
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
bpy.ops.object.join()
ob = bpy.context.view_layer.objects.active
bpy.context.view_layer.update()
vs = [ob.matrix_world @ v.co for v in ob.data.vertices]
mn = Vector([min(v[i] for v in vs) for i in range(3)]); mx = Vector([max(v[i] for v in vs) for i in range(3)])
s = height / (mx.z - mn.z)
cx, cy = (mn.x+mx.x)/2, (mn.y+mx.y)/2
for v in ob.data.vertices:
    v.co = Vector(((v.co.x-cx)*s, (v.co.y-cy)*s, (v.co.z-mn.z)*s))
print("SCALE", s, "verts", len(vs), "mats", [m.name for m in ob.data.materials])
bpy.ops.export_scene.fbx(filepath=out, use_selection=True, path_mode="COPY", embed_textures=True, add_leaf_bones=False, mesh_smooth_type="FACE")
