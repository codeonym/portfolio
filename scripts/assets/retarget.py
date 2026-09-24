"""
Retarget — bakes the KayKit Hunter's clips onto another humanoid rig.

    python3 scripts/assets/retarget.py <source.glb> <target.glb> <out.glb>

Pure Python (no numpy, no Blender). Works directly on glTF node data:

  1. samples every source clip at 30 fps and resolves world transforms;
  2. for each mapped bone pair, a rest alignment rotates the target's rest
     bone direction onto the source's (so an A-pose target follows a T-pose
     source), then each frame applies the source's world-space delta:
         R_target(f) = R_src(f) · R_src_rest⁻¹ · align · R_target_rest
  3. converts back to local rotations down the target hierarchy and writes
     one glTF animation per clip; the pelvis also gets the source hips'
     translation, scaled by leg length.

Bone map: KayKit Rig_Medium → 3ds Max Biped (Bip001 …). Unmapped target
bones (clavicles, fingers, hair, belt) keep their rest pose.
"""

import json
import math
import struct
import sys

FPS = 30

# (source joint, target joint, source child for direction, target child for direction)
BONES = [
    ("hips", "Bip001 Pelvis", "spine", "Bip001 Spine"),
    ("spine", "Bip001 Spine", "chest", "Bip001 Spine2"),
    ("chest", "Bip001 Spine2", "head", "Bip001 Neck"),
    ("head", "Bip001 Head", None, None),
    ("upperarm.l", "Bip001 L UpperArm", "lowerarm.l", "Bip001 L Forearm"),
    ("lowerarm.l", "Bip001 L Forearm", "wrist.l", "Bip001 L Hand"),
    ("wrist.l", "Bip001 L Hand", "handslot.l", "Bip001 L Finger2"),
    ("upperarm.r", "Bip001 R UpperArm", "lowerarm.r", "Bip001 R Forearm"),
    ("lowerarm.r", "Bip001 R Forearm", "wrist.r", "Bip001 R Hand"),
    ("wrist.r", "Bip001 R Hand", "handslot.r", "Bip001 R Finger2"),
    ("upperleg.l", "Bip001 L Thigh", "lowerleg.l", "Bip001 L Calf"),
    ("lowerleg.l", "Bip001 L Calf", "foot.l", "Bip001 L Foot"),
    ("foot.l", "Bip001 L Foot", "toes.l", "Bip001 L Toe0"),
    ("upperleg.r", "Bip001 R Thigh", "lowerleg.r", "Bip001 R Calf"),
    ("lowerleg.r", "Bip001 R Calf", "foot.r", "Bip001 R Foot"),
    ("foot.r", "Bip001 R Foot", "toes.r", "Bip001 R Toe0"),
]
ROOT = ("hips", "Bip001 Pelvis")
# the chibi source holds its arms high and lifts its knees hard; a realistic
# body reads better with the arms lowered and the leg swing damped
ARM_DOWN = math.radians(28)
GAIN = {"upperleg.l": 0.75, "upperleg.r": 0.75, "lowerleg.l": 0.8, "lowerleg.r": 0.8}


# ── quaternion / vector math (x, y, z, w) ──────────────────────────────────
def qmul(a, b):
    ax, ay, az, aw = a
    bx, by, bz, bw = b
    return (
        aw * bx + ax * bw + ay * bz - az * by,
        aw * by - ax * bz + ay * bw + az * bx,
        aw * bz + ax * by - ay * bx + az * bw,
        aw * bw - ax * bx - ay * by - az * bz,
    )


def qinv(q):
    return (-q[0], -q[1], -q[2], q[3])


def qnorm(q):
    n = math.sqrt(sum(c * c for c in q)) or 1.0
    return tuple(c / n for c in q)


def qrot(q, v):
    p = qmul(qmul(q, (v[0], v[1], v[2], 0.0)), qinv(q))
    return (p[0], p[1], p[2])


def qaxis(axis, ang):
    s = math.sin(ang / 2)
    return (axis[0] * s, axis[1] * s, axis[2] * s, math.cos(ang / 2))


def qslerp(a, b, t):
    d = sum(x * y for x, y in zip(a, b))
    if d < 0:
        b = tuple(-c for c in b)
        d = -d
    if d > 0.9995:
        return qnorm(tuple(x + (y - x) * t for x, y in zip(a, b)))
    th = math.acos(d)
    s = math.sin(th)
    wa = math.sin((1 - t) * th) / s
    wb = math.sin(t * th) / s
    return tuple(wa * x + wb * y for x, y in zip(a, b))


def vsub(a, b):
    return (a[0] - b[0], a[1] - b[1], a[2] - b[2])


def vadd(a, b):
    return (a[0] + b[0], a[1] + b[1], a[2] + b[2])


def vscale(a, s):
    return (a[0] * s, a[1] * s, a[2] * s)


def vnorm(a):
    n = math.sqrt(sum(c * c for c in a)) or 1.0
    return (a[0] / n, a[1] / n, a[2] / n)


def vcross(a, b):
    return (a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0])


def qbetween(u, v):
    """shortest rotation taking direction u onto v"""
    u, v = vnorm(u), vnorm(v)
    d = sum(x * y for x, y in zip(u, v))
    if d < -0.9999:
        axis = vcross((1, 0, 0), u)
        if sum(c * c for c in axis) < 1e-6:
            axis = vcross((0, 1, 0), u)
        return qaxis(vnorm(axis), math.pi)
    c = vcross(u, v)
    return qnorm((c[0], c[1], c[2], 1 + d))


# a transform is (translation, rotation, scale) with uniform-ish scale
def compose(parent, local):
    pt, pr, ps = parent
    lt, lr, ls = local
    t = vadd(pt, qrot(pr, (lt[0] * ps[0], lt[1] * ps[1], lt[2] * ps[2])))
    return (t, qmul(pr, lr), (ps[0] * ls[0], ps[1] * ls[1], ps[2] * ls[2]))


# ── glb io ─────────────────────────────────────────────────────────────────
def read_glb(path):
    data = open(path, "rb").read()
    jlen = struct.unpack_from("<I", data, 12)[0]
    doc = json.loads(data[20 : 20 + jlen])
    off = 20 + jlen
    blen = struct.unpack_from("<I", data, off)[0]
    return doc, bytearray(data[off + 8 : off + 8 + blen])


def write_glb(path, doc, binary):
    while len(binary) % 4:
        binary.append(0)
    doc["buffers"][0]["byteLength"] = len(binary)
    js = json.dumps(doc, separators=(",", ":")).encode()
    js += b" " * (-len(js) % 4)
    total = 12 + 8 + len(js) + 8 + len(binary)
    with open(path, "wb") as f:
        f.write(struct.pack("<III", 0x46546C67, 2, total))
        f.write(struct.pack("<II", len(js), 0x4E4F534A) + js)
        f.write(struct.pack("<II", len(binary), 0x004E4942) + bytes(binary))


def read_accessor(doc, binary, idx):
    acc = doc["accessors"][idx]
    view = doc["bufferViews"][acc["bufferView"]]
    n = {"SCALAR": 1, "VEC3": 3, "VEC4": 4}[acc["type"]]
    assert acc["componentType"] == 5126, "float accessors only"
    stride = view.get("byteStride", 4 * n)
    base = view.get("byteOffset", 0) + acc.get("byteOffset", 0)
    out = []
    for i in range(acc["count"]):
        vals = struct.unpack_from(f"<{n}f", binary, base + i * stride)
        out.append(vals[0] if n == 1 else vals)
    return out


def rest_locals(doc):
    locs = []
    for n in doc["nodes"]:
        assert "matrix" not in n, "matrix nodes unsupported"
        locs.append(
            (
                tuple(n.get("translation", (0, 0, 0))),
                tuple(n.get("rotation", (0, 0, 0, 1))),
                tuple(n.get("scale", (1, 1, 1))),
            )
        )
    return locs


def parents(doc):
    par = [None] * len(doc["nodes"])
    for i, n in enumerate(doc["nodes"]):
        for c in n.get("children", []):
            par[c] = i
    return par


def order(doc):
    """nodes parent-first"""
    out = []
    stack = list(reversed(doc["scenes"][doc.get("scene", 0)]["nodes"]))
    while stack:
        i = stack.pop()
        out.append(i)
        stack.extend(reversed(doc["nodes"][i].get("children", [])))
    return out


def worlds(doc, locals_, par, seq):
    w = [None] * len(locals_)
    for i in seq:
        w[i] = locals_[i] if par[i] is None else compose(w[par[i]], locals_[i])
    return w


def sample(times, values, t, path):
    if t <= times[0]:
        return values[0]
    if t >= times[-1]:
        return values[-1]
    lo, hi = 0, len(times) - 1
    while hi - lo > 1:
        mid = (lo + hi) // 2
        if times[mid] <= t:
            lo = mid
        else:
            hi = mid
    k = (t - times[lo]) / (times[hi] - times[lo])
    if path == "rotation":
        return qslerp(values[lo], values[hi], k)
    return tuple(a + (b - a) * k for a, b in zip(values[lo], values[hi]))


# ── main ───────────────────────────────────────────────────────────────────
def main(src_path, dst_path, out_path):
    sdoc, sbin = read_glb(src_path)
    tdoc, tbin = read_glb(dst_path)
    sname = {n.get("name"): i for i, n in enumerate(sdoc["nodes"])}
    tname = {n.get("name"): i for i, n in enumerate(tdoc["nodes"])}
    spar, tpar = parents(sdoc), parents(tdoc)
    sseq, tseq = order(sdoc), order(tdoc)
    srest, trest = rest_locals(sdoc), rest_locals(tdoc)
    sw0 = worlds(sdoc, srest, spar, sseq)
    tw0 = worlds(tdoc, trest, tpar, tseq)

    # rest alignment per pair: target bone direction → source bone direction
    pairs = []
    for s, t, sc, tc in BONES:
        si, ti = sname[s], tname[t]
        if sc:
            sd = vsub(sw0[sname[sc]][0], sw0[si][0])
            td = vsub(tw0[tname[tc]][0], tw0[ti][0])
            align = qbetween(td, sd)
        else:
            align = (0, 0, 0, 1)
        if s.startswith("upperarm."):
            side = 1 if s.endswith(".l") else -1
            align = qmul(qaxis((0, 0, 1), -side * ARM_DOWN), align)
        pairs.append((si, ti, align, GAIN.get(s, 1.0)))
    mapped = {ti: (si, align, gain) for si, ti, align, gain in pairs}

    # leg length ratio scales the hips' travel
    def leg(w, name, hip, foot):
        return abs(w[name[hip]][0][1] - w[name[foot]][0][1])

    ratio = leg(tw0, tname, "Bip001 L Thigh", "Bip001 L Foot") / leg(sw0, sname, "upperleg.l", "foot.l")
    s_root, t_root = sname[ROOT[0]], tname[ROOT[1]]

    tdoc.setdefault("animations", [])
    tdoc["animations"] = []

    def push(floats, kind):
        while len(tbin) % 4:
            tbin.append(0)
        off = len(tbin)
        n = {"SCALAR": 1, "VEC3": 3, "VEC4": 4}[kind]
        flat = [c for v in floats for c in ((v,) if n == 1 else v)]
        tbin.extend(struct.pack(f"<{len(flat)}f", *flat))
        tdoc["bufferViews"].append({"buffer": 0, "byteOffset": off, "byteLength": 4 * len(flat)})
        acc = {"bufferView": len(tdoc["bufferViews"]) - 1, "componentType": 5126, "count": len(floats), "type": kind}
        if n == 1:
            acc["min"], acc["max"] = [min(floats)], [max(floats)]
        tdoc["accessors"].append(acc)
        return len(tdoc["accessors"]) - 1

    for anim in sdoc.get("animations", []):
        tracks = {}
        end = 0.0
        for ch in anim["channels"]:
            smp = anim["samplers"][ch["sampler"]]
            times = read_accessor(sdoc, sbin, smp["input"])
            vals = read_accessor(sdoc, sbin, smp["output"])
            tracks[(ch["target"]["node"], ch["target"]["path"])] = (times, vals)
            end = max(end, times[-1])
        frames = max(2, int(round(end * FPS)) + 1)
        times = [min(end, f / FPS) for f in range(frames)]
        rot_out = {ti: [] for ti in mapped}
        pos_out = []
        for t in times:
            sl = []
            for i, (tt, rr, ss) in enumerate(srest):
                tr = tracks.get((i, "translation"))
                ro = tracks.get((i, "rotation"))
                sc = tracks.get((i, "scale"))
                sl.append(
                    (
                        sample(*tr, t, "translation") if tr else tt,
                        qnorm(sample(*ro, t, "rotation")) if ro else rr,
                        sample(*sc, t, "scale") if sc else ss,
                    )
                )
            sw = worlds(sdoc, sl, spar, sseq)
            # walk the target parent-first, overriding mapped bones' world rotation
            tl = list(trest)
            tw = [None] * len(trest)
            for i in tseq:
                p = tpar[i]
                if i in mapped:
                    si, align, gain = mapped[i]
                    delta = qmul(sw[si][1], qinv(sw0[si][1]))
                    if gain != 1.0:
                        # scale the bone's own swing, not what it inherits
                        pdelta = qmul(sw[spar[si]][1], qinv(sw0[spar[si]][1]))
                        own = qmul(qinv(pdelta), delta)
                        delta = qmul(pdelta, qslerp((0, 0, 0, 1), own, gain))
                    want = qnorm(qmul(delta, qmul(align, tw0[i][1])))
                    prot = tw[p][1] if p is not None else (0, 0, 0, 1)
                    local_r = qnorm(qmul(qinv(prot), want))
                    lt = trest[i][0]
                    if i == t_root:
                        move = vscale(vsub(sw[s_root][0], sw0[s_root][0]), ratio)
                        pw = tw[p] if p is not None else ((0, 0, 0), (0, 0, 0, 1), (1, 1, 1))
                        world_pos = vadd(tw0[i][0], move)
                        lt = qrot(qinv(pw[1]), vsub(world_pos, pw[0]))
                        lt = (lt[0] / pw[2][0], lt[1] / pw[2][1], lt[2] / pw[2][2])
                        pos_out.append(lt)
                    tl[i] = (lt, local_r, trest[i][2])
                    rot_out[i].append(local_r)
                tw[i] = tl[i] if p is None else compose(tw[p], tl[i])

        time_acc = push(times, "SCALAR")
        samplers, channels = [], []
        for ti, qs in rot_out.items():
            samplers.append({"input": time_acc, "output": push(qs, "VEC4"), "interpolation": "LINEAR"})
            channels.append({"sampler": len(samplers) - 1, "target": {"node": ti, "path": "rotation"}})
        samplers.append({"input": time_acc, "output": push(pos_out, "VEC3"), "interpolation": "LINEAR"})
        channels.append({"sampler": len(samplers) - 1, "target": {"node": t_root, "path": "translation"}})
        tdoc["animations"].append({"name": anim["name"], "samplers": samplers, "channels": channels})
        print(f"  {anim['name']:<32} {frames:>3} frames")

    write_glb(out_path, tdoc, tbin)
    print(f"wrote {out_path} (leg ratio {ratio:.2f})")


if __name__ == "__main__":
    if len(sys.argv) != 4:
        sys.exit(__doc__)
    main(*sys.argv[1:])
