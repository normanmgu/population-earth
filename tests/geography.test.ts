import { describe, it, expect } from 'vitest';
import { SphereGeometry, Vector3 } from 'three';
import { geographicNormal, geographicUV } from '../src/globe/geography';
describe('Earth registration', () => {
  it.each([[0,0,1,0,0],[90,0,0,0,-1],[-90,0,0,0,1],[180,0,-1,0,0],[0,90,0,1,0],[0,-90,0,-1,0]])('registers %s° longitude / %s° latitude', (lon,lat,x,y,z) => {
    expect(geographicNormal(lon,lat).distanceTo(new Vector3(x,y,z))).toBeLessThan(1e-10);
  });
  it('matches the actual sphere UVs to north-up geographic texture coordinates', () => {
    const geometry=new SphereGeometry(1,32,16);
    const positions=geometry.getAttribute('position'), uv=geometry.getAttribute('uv');
    for(let i=0;i<positions.count;i++) {
      if(Math.abs(positions.getY(i))>.999) continue; // poles use half-texel adjustment
      const lon=uv.getX(i)*360-180, lat=uv.getY(i)*180-90;
      expect(geographicNormal(lon,lat).distanceTo(new Vector3().fromBufferAttribute(positions,i))).toBeLessThan(1e-6);
    }
    expect(geographicUV(0,0)).toEqual({u:.5,v:.5});
    geometry.dispose();
  });
});
