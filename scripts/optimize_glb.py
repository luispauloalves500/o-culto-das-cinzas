"""Reempacota o GLB do Elias REV6 com texturas menores (mesma malha, ossos, nós e clipes).
uso: python3 scripts/optimize_glb.py entrada.glb saida.glb [lado_max=1024] [--notex]"""
import json, struct, io, sys
from PIL import Image
src, dst = sys.argv[1], sys.argv[2]
side = int(sys.argv[3]) if len(sys.argv) > 3 and sys.argv[3].isdigit() else 1024
notex = '--notex' in sys.argv
f = open(src, 'rb').read()
cl, = struct.unpack('<I', f[12:16]); j = json.loads(f[20:20 + cl])
bl, = struct.unpack('<I', f[20 + cl:24 + cl]); b = f[28 + cl:28 + cl + bl]
imgviews = {i['bufferView']: n for n, i in enumerate(j['images'])}
out = bytearray(); views = []
for vi, bv in enumerate(j['bufferViews']):
    data = b[bv.get('byteOffset', 0):bv.get('byteOffset', 0) + bv['byteLength']]
    if vi in imgviews:
        im = Image.open(io.BytesIO(data)).convert('RGB')
        if notex: im = im.resize((4, 4))
        elif max(im.size) > side: im = im.resize((side, side), Image.LANCZOS)
        o = io.BytesIO(); im.save(o, 'JPEG', quality=88, optimize=True); data = o.getvalue()
        j['images'][imgviews[vi]]['mimeType'] = 'image/jpeg'
    while len(out) % 4: out.append(0)
    nb = dict(bv); nb['byteOffset'] = len(out); nb['byteLength'] = len(data); nb['buffer'] = 0
    out += data; views.append(nb)
while len(out) % 4: out.append(0)
j['bufferViews'] = views; j['buffers'] = [{'byteLength': len(out)}]
j.setdefault('asset', {}).setdefault('extras', {})['optimizedForWeb'] = {'textureMax': side, 'format': 'jpeg q88', 'source': src.split('/')[-1]}
js = json.dumps(j, separators=(',', ':')).encode()
while len(js) % 4: js += b' '
total = 12 + 8 + len(js) + 8 + len(out)
with open(dst, 'wb') as w:
    w.write(struct.pack('<III', 0x46546C67, 2, total))
    w.write(struct.pack('<II', len(js), 0x4E4F534A)); w.write(js)
    w.write(struct.pack('<II', len(out), 0x004E4942)); w.write(out)
print(dst, total)
