# stand a diagonal sword upright: longest principal axis -> +Z, heavier end (hilt/guard) up
import sys
try:
    import numpy as np
except ImportError:
    sys.path.append(f"/usr/lib/python{sys.version_info.major}.{sys.version_info.minor}/site-packages")
    import numpy as np
import bpy
from mathutils import Matrix, Vector
src, out = sys.argv[sys.argv.index("--")+1:]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
sc = bpy.context.scene
meshes = [o for o in sc.objects if o.type == "MESH"]
for o in meshes:
    mw = o.matrix_world.copy(); o.parent = None; o.matrix_world = mw
for o in list(sc.objects):
    if o.type != "MESH": bpy.data.objects.remove(o)
for o in meshes:
    o.data.transform(o.matrix_world); o.matrix_world = Matrix()
pts = np.array([v.co[:] for o in meshes for v in o.data.vertices])
c = pts.mean(0)
w, V = np.linalg.eigh(np.cov((pts - c).T))
axis = V[:, np.argmax(w)]
proj = (pts - c) @ axis
# the guard is wide: whichever end has more spread across the axis is the hilt
lo, hi = proj < np.percentile(proj, 20), proj > np.percentile(proj, 80)
spread = lambda m: np.linalg.norm((pts[m] - c) - np.outer(proj[m], axis), axis=1).mean()
if spread(lo) < spread(hi): axis = -axis  # blade (wide) points down
rot = Vector(axis).rotation_difference(Vector((0, 0, 1))).to_matrix().to_4x4()
T = rot @ Matrix.Translation(-Vector(c))
for o in meshes: o.data.transform(T)
bpy.ops.object.select_all(action="SELECT")
bpy.ops.export_scene.gltf(filepath=out, export_format="GLB", use_selection=True)
pts2 = np.array([v.co[:] for o in meshes for v in o.data.vertices])
print("EXTENT", pts2.min(0).round(1), pts2.max(0).round(1))
