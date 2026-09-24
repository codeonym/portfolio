# throne_room.glb -> hall.glb: drop the feast and the crosses, scale to world units (Hunter = 2.2), floor at 0
import sys
try:
    import numpy
except ImportError:
    sys.path.append(f"/usr/lib/python{sys.version_info.major}.{sys.version_info.minor}/site-packages")
import bpy
from mathutils import Matrix, Vector
import os
D = os.path.join(os.environ.get("SRC_DIR", "."), "")  # throne_room.glb in, hall.glb out
S = 0.18
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=D + "throne_room.glb")
sc = bpy.context.scene
for o in list(sc.objects):
    # the feast, and the standing crosses (Effigy_02) — replaced in-app by shadow crystals
    if o.type == "MESH" and any(k in o.name for k in ("Table", "Chair", "Cup", "Wine", "Candle", "Effigy_02")):
        bpy.data.objects.remove(o)
bpy.context.view_layer.update()
meshes = [o for o in sc.objects if o.type == "MESH"]
for o in meshes:
    mw = o.matrix_world.copy(); o.parent = None; o.matrix_world = mw
for o in list(sc.objects):
    if o.type != "MESH": bpy.data.objects.remove(o)
T = Matrix.Scale(S, 4) @ Matrix.Translation(Vector((-0.5, 0, -20.6)))
for o in meshes:
    o.data.transform(T @ o.matrix_world)
    o.matrix_world = Matrix()
    o.name = o.name.split(".")[0]
    o.data.name = o.name
print("OBJS", sorted(o.name for o in meshes))
bpy.ops.export_scene.gltf(filepath=D + "hall.glb", export_format="GLB", export_yup=True)
