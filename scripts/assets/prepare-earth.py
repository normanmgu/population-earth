"""Run with bundled Python (Pillow + numpy). Download source URL in manifest first."""
from pathlib import Path
import hashlib, json, zipfile, io
import numpy as np
from PIL import Image
ROOT = Path(__file__).resolve().parents[2]
archive = ROOT/'data/raw/earth/NE2_50M_SR_W.zip'
expected = '7e0e07089b699a3cccad98dd1b2446390d8e3f8c5006359d477a329cebcafaa9'
assert hashlib.sha256(archive.read_bytes()).hexdigest() == expected, 'Source archive changed; audit required'
with zipfile.ZipFile(archive) as z:
    world = [float(x) for x in z.read('NE2_50M_SR_W/NE2_50M_SR_W.tfw').decode().split()]
    image = Image.open(io.BytesIO(z.read('NE2_50M_SR_W/NE2_50M_SR_W.tif')))
    width,height=image.size
    dx,ry,rx,dy,x,y=world
    bounds=[x-dx/2,y+dy*(height-.5),x+dx*(width-.5),y-dy/2]
    assert np.allclose(bounds,[-180,-90,180,90],atol=.00001) and rx==ry==0
    pixels=np.asarray(image.convert('RGB').resize((2048,1024),Image.Resampling.LANCZOS),dtype=float)/255
# Source water is blue. This is a decorative material treatment, not a data mask.
water=np.clip((pixels[:,:,2]-pixels[:,:,0]-.025)*14,0,1)[:,:,None]
luma=(pixels*np.array([.2126,.7152,.0722])).sum(2)[:,:,None]
land=np.array([.105,.124,.145])+luma*np.array([.105,.11,.115])
ocean=np.array([.015,.035,.065])+luma*np.array([.018,.028,.040])
result=np.uint8(np.clip(land*(1-water)+ocean*water,0,1)*255)
output=ROOT/'public/textures/earth-base-2k.png'
Image.fromarray(result).save(output,optimize=True)
manifest_path=ROOT/'data/source-manifests/assets.json'
manifest=json.loads(manifest_path.read_text())
asset=next(a for a in manifest['assets'] if a['id']=='earth-base')
asset.update(status='Acquired, bounds verified, transformed and shipped for M1',archiveUrl='https://naturalearth.s3.amazonaws.com/50m_raster/NE2_50M_SR_W.zip',archiveSha256=expected,sourceDimensions=[width,height],worldFile=world,bounds=bounds,path='public/textures/earth-base-2k.png',sha256=hashlib.sha256(output.read_bytes()).hexdigest(),dimensions=[2048,1024],processing='scripts/assets/prepare-earth.py: Lanczos resize, muted charcoal land / navy water using source blue-channel contrast. North-up; no crop, rotation or mirroring. Decorative relief only.',runtime='Pillow 12.3.0; numpy '+np.__version__)
manifest_path.write_text(json.dumps(manifest,indent=2)+'\n')
print(json.dumps(asset,indent=2))
