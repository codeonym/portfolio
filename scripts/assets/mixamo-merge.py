# merge Mixamo FBX clips into one GLB: first file gives the armature (and skin if present)
# usage: blender -b -P merge.py -- out.glb name=file.fbx name=file.fbx ...
import sys
try:
    import numpy
except ImportError:
    sys.path.append(f"/usr/lib/python{sys.version_info.major}.{sys.version_info.minor}/site-packages")
import bpy
args = sys.argv[sys.argv.index("--")+1:]
out, pairs = args[0], [a.split("=",1) for a in args[1:]]
bpy.ops.wm.read_factory_settings(use_empty=True)
base = None
actions = []
for name, path in pairs:
    before = set(bpy.data.objects)
    bpy.ops.import_scene.fbx(filepath=path, automatic_bone_orientation=False, ignore_leaf_bones=True)
    new = [o for o in bpy.data.objects if o not in before]
    arm = next(o for o in new if o.type == "ARMATURE")
    act = arm.animation_data.action if arm.animation_data else None
    if act:
        act.name = name
        act.use_fake_user = True
        actions.append(act)
    if base is None:
        base = arm
    else:
        for o in new: bpy.data.objects.remove(o, do_unlink=True)
base.animation_data_create()
for a in actions:
    tr = base.animation_data.nla_tracks.new(); tr.name = a.name
    st = tr.strips.new(a.name, 1, a); st.name = a.name
    tr.mute = True
base.animation_data.action = None
print("ACTIONS", [a.name for a in actions])
bpy.ops.export_scene.gltf(filepath=out, export_format="GLB", export_animation_mode="NLA_TRACKS", export_yup=True, export_apply=False, export_force_sampling=True, export_frame_step=1)
