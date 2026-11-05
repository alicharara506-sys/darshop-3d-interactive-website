"""Turn a transparent product photo into a solid 3D model (GLB) with Blender.

The photo's outline becomes the shape. The body is "inflated" from the outline
(thicker in the middle, rounded at the edges), the photo is wrapped on the front
(mirrored on the back), and the result is exported as a GLB for the website.
It is not a true 360° model: it looks right from the front and up to ~60° to
the side, which is how the site shows products.

Run (headless):
  blender -b -P tools/blender_photo_to_3d.py -- <in.png> <out.glb> [grid=240] [depth=0.13] [decimate=0.22]
"""
import sys
import bpy
import numpy as np

argv = sys.argv[sys.argv.index("--") + 1:]
SRC, OUT = argv[0], argv[1]
GRID = int(argv[2]) if len(argv) > 2 else 240       # samples along the long side
DEPTH = float(argv[3]) if len(argv) > 3 else 0.13   # max half-thickness, as a share of the long side
DECIMATE = float(argv[4]) if len(argv) > 4 else 0.22  # share of faces kept

bpy.ops.wm.read_factory_settings(use_empty=True)

# ---------- read the photo ----------
img = bpy.data.images.load(SRC)
W, H = img.size
px = np.array(img.pixels[:], dtype=np.float32).reshape(H, W, 4)  # bottom row first
step = max(W, H) / GRID
gw, gh = int(round(W / step)), int(round(H / step))
ys = np.clip(((np.arange(gh) + 0.5) * step).astype(int), 0, H - 1)
xs = np.clip(((np.arange(gw) + 0.5) * step).astype(int), 0, W - 1)
alpha = px[ys][:, xs, 3]
mask = alpha > 0.5

# keep only the biggest connected piece (drops stray specks)
lab = np.zeros(mask.shape, np.int32); cur = 0; sizes = {}
for y0 in range(gh):
    for x0 in range(gw):
        if mask[y0, x0] and not lab[y0, x0]:
            cur += 1; stack = [(y0, x0)]; lab[y0, x0] = cur; n = 0
            while stack:
                y, x = stack.pop(); n += 1
                for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    yy, xx = y + dy, x + dx
                    if 0 <= yy < gh and 0 <= xx < gw and mask[yy, xx] and not lab[yy, xx]:
                        lab[yy, xx] = cur; stack.append((yy, xx))
            sizes[cur] = n
if sizes:
    mask = lab == max(sizes, key=sizes.get)

# ---------- distance from the outline (chamfer) ----------
INF = 1e9
d = np.where(mask, INF, 0.0)
for _ in range(2):
    for y in range(gh):
        for x in range(gw):
            if d[y, x] == 0: continue
            v = d[y, x]
            if y > 0: v = min(v, d[y - 1, x] + 1)
            if x > 0: v = min(v, d[y, x - 1] + 1)
            if y > 0 and x > 0: v = min(v, d[y - 1, x - 1] + 1.414)
            if y > 0 and x < gw - 1: v = min(v, d[y - 1, x + 1] + 1.414)
            d[y, x] = v
    for y in range(gh - 1, -1, -1):
        for x in range(gw - 1, -1, -1):
            if d[y, x] == 0: continue
            v = d[y, x]
            if y < gh - 1: v = min(v, d[y + 1, x] + 1)
            if x < gw - 1: v = min(v, d[y, x + 1] + 1)
            if y < gh - 1 and x < gw - 1: v = min(v, d[y + 1, x + 1] + 1.414)
            if y < gh - 1 and x > 0: v = min(v, d[y + 1, x - 1] + 1.414)
            d[y, x] = v

# Rounded profile: a quarter-circle edge that levels off, so big bodies are
# chunky and thin parts (bits, handles) stay slim.
sat = GRID * 0.075
t = np.clip(d / sat, 0, 1)
hmap = np.sqrt(1 - (1 - t) ** 2) * DEPTH * GRID
# light smoothing
for _ in range(3):
    p = np.pad(hmap, 1, mode="edge")
    sm = (p[:-2, 1:-1] + p[2:, 1:-1] + p[1:-1, :-2] + p[1:-1, 2:] + 4 * hmap) / 8
    hmap = np.where(mask, sm, 0)
hmap = np.maximum(hmap, 0.35)  # tiny rim so front and back don't touch

# ---------- build the mesh on pixel corners ----------
# corner (y, x) is inside if any of its 4 neighbouring cells is inside
cm = np.zeros((gh + 1, gw + 1), bool)
cm[:-1, :-1] |= mask; cm[1:, :-1] |= mask; cm[:-1, 1:] |= mask; cm[1:, 1:] |= mask
ch = np.zeros((gh + 1, gw + 1), np.float32); cnt = np.zeros_like(ch)
for oy in (0, 1):
    for ox in (0, 1):
        ch[oy:gh + oy, ox:gw + ox] += np.where(mask, hmap, 0); cnt[oy:gh + oy, ox:gw + ox] += mask
ch = np.where(cnt > 0, ch / np.maximum(cnt, 1), 0)
# corners on the outline get the rim height
edge = (cnt > 0) & (cnt < 4)
ch[edge] = 0.35

S = 1.0 / GRID  # model units: long side = gw or gh * S ≈ 1
idx = -np.ones((gh + 1, gw + 1), np.int64)
verts, uvs = [], []
for y in range(gh + 1):
    for x in range(gw + 1):
        if cm[y, x]:
            idx[y, x] = len(verts)
            # Blender is Z-up: photo up = +Z, front faces -Y (becomes +Z, towards the viewer, in the GLB)
            verts.append(((x - gw / 2) * S, -ch[y, x] * S, (y - gh / 2) * S))
            uvs.append((x / gw, y / gh))
nF = len(verts)
verts += [(vx, -vy, vz) for vx, vy, vz in verts]

faces, fuv = [], []
edges = {}
for y in range(gh):
    for x in range(gw):
        if not mask[y, x]: continue
        a, b, c, e = idx[y, x], idx[y, x + 1], idx[y + 1, x + 1], idx[y + 1, x]
        faces.append((a, b, c, e))
        faces.append((e + nF, c + nF, b + nF, a + nF))
        for u, v in ((a, b), (b, c), (c, e), (e, a)):
            k = (min(u, v), max(u, v))
            edges[k] = edges.get(k, 0) + 1
        # boundary walls are added below
# side walls on outline edges (edges used by only one front face)
front_faces = faces[0::2]
for f in front_faces:
    for u, v in ((f[0], f[1]), (f[1], f[2]), (f[2], f[3]), (f[3], f[0])):
        if edges[(min(u, v), max(u, v))] == 1:
            faces.append((v, u, u + nF, v + nF))

me = bpy.data.meshes.new("product")
me.from_pydata(verts, [], faces)
me.update()
uv = me.uv_layers.new(name="UVMap")
for poly in me.polygons:
    for li in poly.loop_indices:
        vi = me.loops[li].vertex_index
        uv.data[li].uv = uvs[vi % nF]
ob = bpy.data.objects.new("product", me)
bpy.context.scene.collection.objects.link(ob)
bpy.context.view_layer.objects.active = ob
ob.select_set(True)
bpy.ops.object.shade_smooth()
# Simplify flat areas so the file stays light for phones.
dec = ob.modifiers.new("simplify", "DECIMATE"); dec.ratio = DECIMATE

# ---------- material: the photo ----------
mat = bpy.data.materials.new("photo")
mat.use_nodes = True
nt = mat.node_tree
bsdf = nt.nodes.get("Principled BSDF")
tex = nt.nodes.new("ShaderNodeTexImage"); tex.image = img; tex.interpolation = "Cubic"
nt.links.new(tex.outputs["Color"], bsdf.inputs["Base Color"])
bsdf.inputs["Roughness"].default_value = 0.38
me.materials.append(mat)

# ---------- export ----------
bpy.ops.export_scene.gltf(filepath=OUT, export_format="GLB", use_selection=True,
                          export_apply=True, export_yup=True)
print("WROTE", OUT, "verts", len(verts), "faces", len(faces))
