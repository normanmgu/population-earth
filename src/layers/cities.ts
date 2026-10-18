import * as THREE from 'three';
import type { CityDataset, DisplayScale } from '../data/contracts';
import { geographicNormal } from '../globe/geography';
import { pillarMatrix, populationHeight, visibleAnchor, type HeightMode } from './city-math';

// A quantitative batch, a marker batch and at most 50,000 decorative points.
// Widths/markers/particles never encode population. Only radial height does.
export function createCityLayer(dataset: CityDataset, scale: DisplayScale) {
  const cities = dataset.cities;
  const normals = cities.map(c => geographicNormal(c.longitude, c.latitude));
  const heights = new Float32Array(cities.length);
  const growth = { value: 1 };
  const group = new THREE.Group();
  const geometry = new THREE.CylinderGeometry(1, 1, 1, 6).translate(0, .5, 0);
  const material = new THREE.ShaderMaterial({
    uniforms: { growth },
    vertexShader: `uniform float growth; varying vec3 color; varying float level;
      void main(){vec3 p=position; p.y*=growth; color=instanceColor; level=position.y;
      gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(p,1.);}`,
    fragmentShader: `varying vec3 color; varying float level;
      void main(){gl_FragColor=vec4(color*mix(.65,1.25,level),1.);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      }`,
  });
  const pillars = new THREE.InstancedMesh(geometry, material, cities.length);
  const markerGeometry = new THREE.SphereGeometry(dataset.coverage === 'full' ? .0012 : .0045, 8, 6);
  const markerMaterial = new THREE.MeshBasicMaterial({ color: 0xffb065 });
  const markers = new THREE.InstancedMesh(markerGeometry, markerMaterial, cities.length);
  const matrix = new THREE.Matrix4();
  const orange = new THREE.Color('#ff943e'), selectedColor = new THREE.Color('#fff1bd');
  cities.forEach((_, i) => {
    markers.setMatrixAt(i, matrix.makeTranslation(normals[i].clone().multiplyScalar(1.002)));
    pillars.setColorAt(i, orange);
  });
  markers.instanceMatrix.needsUpdate = true;
  group.add(pillars, markers);

  const pointGeometry = new THREE.BufferGeometry();
  const pointsPerCity = Math.min(8, Math.floor(50000 / cities.length));
  const positions = new Float32Array(cities.length * pointsPerCity * 3);
  const offsets = new Float32Array(positions.length);
  const pointHeights = new Float32Array(cities.length * pointsPerCity);
  let seed = 20251017;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  const fractions = new Float32Array(pointHeights.length);
  cities.forEach((_, i) => {
    const tangent = new THREE.Vector3(0, 1, 0).cross(normals[i]).normalize();
    const bitangent = normals[i].clone().cross(tangent);
    for (let j = 0; j < pointsPerCity; j++) {
      const k = i * pointsPerCity + j;
      normals[i].toArray(positions, k * 3);
      const angle = random() * Math.PI * 2, radius = .004 + random() * .004;
      tangent.clone().multiplyScalar(Math.cos(angle) * radius).addScaledVector(bitangent, Math.sin(angle) * radius).toArray(offsets, k * 3);
      fractions[k] = .1 + random() * .85;
    }
  });
  pointGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  pointGeometry.setAttribute('offset', new THREE.BufferAttribute(offsets, 3));
  pointGeometry.setAttribute('height', new THREE.BufferAttribute(pointHeights, 1));
  const pointMaterial = new THREE.ShaderMaterial({
    uniforms: { growth }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `attribute vec3 offset; attribute float height; uniform float growth;
      void main(){vec3 p=position*(1.+height*growth)+offset; gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.); gl_PointSize=2.;}`,
    fragmentShader: `uniform float growth; void main(){float r=length(gl_PointCoord-.5); if(r>.5)discard; gl_FragColor=vec4(1.,.45,.12,(1.-r*2.)*.6*growth);}`,
  });
  const particles = new THREE.Points(pointGeometry, pointMaterial);
  particles.frustumCulled = false;
  group.add(particles);
  // A nonquantitative selection ring leaves the pillar's dimensions intact.
  const ringGeometry = new THREE.RingGeometry(.011, .014, 32);
  const ringMaterial = new THREE.MeshBasicMaterial({ color: 0xffe3a4, side: THREE.DoubleSide, depthWrite: false });
  const ring = new THREE.Mesh(ringGeometry, ringMaterial);
  ring.visible = false; group.add(ring);
  let selectedIndex = -1;
  function setHeightMode(mode: HeightMode) {
    cities.forEach((city, i) => {
      heights[i] = populationHeight(city.population, mode, scale);
      pillars.setMatrixAt(i, pillarMatrix(city.longitude, city.latitude, heights[i], dataset.coverage === 'full' ? .0012 : .0028));
      for (let j = 0; j < pointsPerCity; j++) pointHeights[i * pointsPerCity + j] = heights[i] * fractions[i * pointsPerCity + j];
    });
    pillars.instanceMatrix.needsUpdate = true;
    pillars.computeBoundingSphere();
    pointGeometry.attributes.height.needsUpdate = true;
  }
  function selectCity(id: string | null) {
    if (selectedIndex >= 0) pillars.setColorAt(selectedIndex, orange);
    selectedIndex = cities.findIndex(c => c.id === id);
    ring.visible = selectedIndex >= 0;
    if (selectedIndex >= 0) {
      pillars.setColorAt(selectedIndex, selectedColor);
      ring.position.copy(normals[selectedIndex]).multiplyScalar(1.006);
      ring.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normals[selectedIndex]);
    }
    pillars.instanceColor!.needsUpdate = true;
  }
  const raycaster = new THREE.Raycaster();
  const tip = new THREE.Vector3(), onRay = new THREE.Vector3(), onSegment = new THREE.Vector3();
  // CPU segments use the SAME growth factor as the shader. A 12px hit target
  // makes small linear pillars selectable without inventing a minimum height.
  function pick(x: number, y: number, width: number, height: number, camera: THREE.PerspectiveCamera) {
    if (!group.visible) return [];
    // Input can arrive between a camera reset and the next rendered frame.
    camera.updateMatrixWorld();
    raycaster.setFromCamera(new THREE.Vector2(x / width * 2 - 1, 1 - y / height * 2), camera);
    const candidates: { id: string; distance: number; depth: number }[] = [];
    cities.forEach((city, i) => {
      if (!visibleAnchor(normals[i], camera.position)) return;
      tip.copy(normals[i]).multiplyScalar(1 + heights[i] * growth.value);
      const distanceSq = raycaster.ray.distanceSqToSegment(normals[i], tip, onRay, onSegment);
      const depth = camera.position.distanceTo(onSegment);
      const tolerance = 12 * 2 * depth * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) / height;
      if (distanceSq <= tolerance * tolerance) candidates.push({ id: city.id, distance: Math.sqrt(distanceSq) / tolerance, depth });
    });
    return candidates.sort((a, b) => a.distance - b.distance || a.depth - b.depth).map(c => c.id);
  }
  setHeightMode('linear');
  return { group, normals, heights, growth, pick, setHeightMode, selectCity,
    setParticles(visible: boolean) { particles.visible = visible; },
    dispose() {
      geometry.dispose(); material.dispose(); markerGeometry.dispose(); markerMaterial.dispose();
      pointGeometry.dispose(); pointMaterial.dispose(); ringGeometry.dispose(); ringMaterial.dispose();
      pillars.dispose(); markers.dispose();
    },
  };
}
