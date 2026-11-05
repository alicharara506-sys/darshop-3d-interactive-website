"""Make a heavy GLB light enough for phones, with Blender.

Simplifies the mesh, scales textures down and saves with Draco compression.
Run: blender -b --factory-startup -P tools/blender_shrink_glb.py -- in.glb out.glb [faces=250000] [tex=1024]
"""
import sys
import bpy

argv = sys.argv[sys.argv.index("--") + 1:]
SRC, OUT = argv[0], argv[1]
FACES = int(argv[2]) if len(argv) > 2 else 250000
TEX = int(argv[3]) if len(argv) > 3 else 1024

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=SRC)

meshes = [o for o in bpy.context.scene.objects if o.type == "MESH"]
total = sum(len(o.data.polygons) for o in meshes)
print("BEFORE faces", total, "images", [(i.name, tuple(i.size)) for i in bpy.data.images])
ratio = min(1.0, FACES / max(total, 1))
for o in meshes:
    if ratio < 1:
        m = o.modifiers.new("simplify", "DECIMATE"); m.ratio = ratio
for img in bpy.data.images:
    w, h = img.size
    if max(w, h) > TEX:
        k = TEX / max(w, h); img.scale(int(w * k), int(h * k))

bpy.ops.export_scene.gltf(filepath=OUT, export_format="GLB", export_apply=True,
                          export_draco_mesh_compression_enable=True,
                          export_draco_mesh_compression_level=7,
                          export_image_format="JPEG", export_jpeg_quality=93)
print("AFTER faces ~", int(total * ratio), "->", OUT)
