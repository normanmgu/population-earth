import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { geographicNormal, OPENING } from './geography';
import type { CityDataset, DisplayScale } from '../data/contracts';
import { createCityLayer } from '../layers/cities';
import { isClick, type HeightMode } from '../layers/city-math';
import { createLabels } from '../interaction/labels';
export type GlobeStatus = 'loading' | 'ready' | 'asset-error' | 'context-lost';
export function createGlobe(canvas: HTMLCanvasElement, onStatus: (status: GlobeStatus) => void, labelHost: HTMLDivElement, onPick: (ids: string[]) => void) {
  const context = canvas.getContext('webgl2', { antialias: true, alpha: true });
  if (!context) throw new Error('WebGL2 unavailable');
  const renderer = new THREE.WebGLRenderer({ canvas, context, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, .1, 30);
  const controls = new OrbitControls(camera, canvas);
  controls.enablePan = false;
  controls.enableDamping = true;
  controls.dampingFactor = .085;
  controls.minDistance = 1.7;
  controls.maxDistance = 5;
  controls.rotateSpeed = .45;
  controls.zoomSpeed = .65;
  controls.autoRotateSpeed = .16;
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let interacted = false, disposed = false, lost = false, frame = 0, last = 0;
  let introElapsed = 0;
  let cityLayer: ReturnType<typeof createCityLayer> | undefined;
  let labels: ReturnType<typeof createLabels> | undefined;
  let dataset: CityDataset | undefined;
  let heightMode: HeightMode = 'linear', citiesVisible = true, particlesVisible = true, growthEnabled = true;
  let selectedId: string | null = null, growthElapsed = 1;
  const lightOffset = new THREE.Vector3(-1, 2, 1);
  let renderCount = 0;
  const geometry = new THREE.SphereGeometry(1, 96, 64);
  const material = new THREE.MeshStandardMaterial({ color: 0x172434, roughness: 1, metalness: 0 });
  const earth = new THREE.Mesh(geometry, material);
  scene.add(earth);
  scene.add(new THREE.AmbientLight(0xb9cee5, 2.1));
  const light = new THREE.DirectionalLight(0xddeaff, 2.7);
  scene.add(light);
  const atmosphereMaterial = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.BackSide,
    vertexShader: `varying vec3 n; varying vec3 eye; void main(){vec4 p=modelViewMatrix*vec4(position,1.); n=normalize(normalMatrix*normal); eye=normalize(-p.xyz); gl_Position=projectionMatrix*p;}`,
    fragmentShader: `varying vec3 n; varying vec3 eye; void main(){float edge=pow(1.-abs(dot(normalize(n),normalize(eye))),5.); gl_FragColor=vec4(.13,.38,.72,edge*.42);}`,
  });
  const atmosphere = new THREE.Mesh(geometry, atmosphereMaterial);
  atmosphere.scale.setScalar(1.012);
  scene.add(atmosphere);
  let texture: THREE.Texture | undefined;
  onStatus('loading');
  new THREE.TextureLoader().load(`${import.meta.env.BASE_URL}textures/earth-base-2k.png`, loaded => {
    if (disposed) { loaded.dispose(); return; }
    texture = loaded;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
    material.color.set(0xffffff);
    material.map = texture;
    material.needsUpdate = true;
    onStatus('ready'); wake();
  }, undefined, () => { if (!disposed) onStatus('asset-error'); });
  function render(time: number) {
    frame = 0;
    if (disposed || lost || document.hidden) return;
    const dt = last ? Math.min((time-last)/1000, .05) : 0;
    last = time;
    const auto = !motion.matches && !interacted && introElapsed < 12;
    controls.autoRotate = auto;
    if (auto) introElapsed += dt;
    const changed = controls.update(dt);
    const growing = !!cityLayer && growthElapsed < 1 && growthEnabled && !motion.matches;
    if (growing) growthElapsed = Math.min(1, growthElapsed + dt);
    if (cityLayer) cityLayer.growth.value = growthElapsed;
    light.position.copy(camera.position).add(lightOffset);
    renderer.render(scene, camera);
    renderCount++;
    if (cityLayer) labels?.update(camera, cityLayer.normals, cityLayer.heights, growthElapsed, citiesVisible);
    if (auto || changed || growing) wake();
  }
  function wake() { if (!disposed && !lost && !document.hidden && !frame) frame = requestAnimationFrame(render); }
  function stopIntro() { interacted = true; controls.autoRotate = false; wake(); }
  function resize() {
    const { width, height } = canvas.getBoundingClientRect();
    renderer.setSize(width, height, false);
    const wasNarrow = camera.aspect < 1;
    camera.aspect = width / Math.max(height, 1);
    camera.updateProjectionMatrix();
    if (wasNarrow !== (camera.aspect < 1)) resetView();
    wake();
  }
  function resetView() {
    stopIntro(); controls.reset();
    const distance = Math.max(OPENING.distance, 1.13 / Math.sin(Math.atan(Math.tan(THREE.MathUtils.degToRad(21)) * Math.min(camera.aspect, 1))));
    controls.maxDistance = Math.max(5, distance + .5);
    camera.position.copy(geographicNormal(OPENING.longitude, OPENING.latitude).multiplyScalar(distance));
    controls.target.set(0,0,0); controls.update(); wake();
  }
  function zoom(factor: number) { stopIntro(); camera.position.multiplyScalar(factor).clampLength(controls.minDistance, controls.maxDistance); controls.update(); wake(); }
  function rotate(horizontal: number, vertical: number) {
    stopIntro(); const s = new THREE.Spherical().setFromVector3(camera.position);
    s.theta += horizontal; s.phi = THREE.MathUtils.clamp(s.phi + vertical, .05, Math.PI-.05);
    camera.position.setFromSpherical(s); controls.update(); wake();
  }
  function key(event: KeyboardEvent) {
    const keys: Record<string, () => void> = {
      ArrowLeft: () => rotate(-.12,0), ArrowRight: () => rotate(.12,0),
      ArrowUp: () => rotate(0,-.12), ArrowDown: () => rotate(0,.12),
      '+': () => zoom(.9), '=': () => zoom(.9), '-': () => zoom(1.1), Home: resetView,
    };
    if (keys[event.key]) { event.preventDefault(); keys[event.key](); }
  }
  function preference() { controls.enableDamping = !motion.matches; if (motion.matches) { stopIntro(); growthElapsed = 1; } wake(); }
  function visibility() { last = 0; if (document.hidden) { cancelAnimationFrame(frame); frame=0; } else wake(); }
  function contextLost(event: Event) { event.preventDefault(); lost=true; cancelAnimationFrame(frame); frame=0; labels?.dispose(); onStatus('context-lost'); }
  function setCities(data: CityDataset, scale: DisplayScale) {
    if (cityLayer) { scene.remove(cityLayer.group); cityLayer.dispose(); labels?.dispose(); }
    dataset = data; cityLayer = createCityLayer(data, scale);
    cityLayer.group.visible = citiesVisible;
    cityLayer.setHeightMode(heightMode); cityLayer.setParticles(particlesVisible); cityLayer.selectCity(selectedId);
    scene.add(cityLayer.group);
    labels = createLabels(labelHost, data.cities, id => { stopIntro(); onPick([id]); });
    labels.select(selectedId);
    growthElapsed = growthEnabled && !motion.matches ? 0 : 1; wake();
  }
  function setHeightMode(mode: HeightMode) { if (heightMode === mode) return; stopIntro(); heightMode = mode; cityLayer?.setHeightMode(mode); wake(); }
  function setLayers(layers: { cities: boolean; particles: boolean }) {
    if (citiesVisible === layers.cities && particlesVisible === layers.particles) return;
    stopIntro(); citiesVisible = layers.cities; particlesVisible = layers.particles;
    if (cityLayer) { cityLayer.group.visible = citiesVisible; cityLayer.setParticles(particlesVisible); } wake();
  }
  function selectCity(id: string | null) { if (selectedId === id) return; stopIntro(); selectedId = id; cityLayer?.selectCity(id); labels?.select(id); wake(); }
  function focusCity(id: string) {
    const city = dataset?.cities.find(c => c.id === id); if (!city) return;
    stopIntro();
    // Clear residual damping so a drag cannot pull the camera away afterwards.
    controls.reset();
    const narrow = camera.aspect < 1;
    const distance = narrow ? 3.4 : 2.25;
    // On a phone, frame the selected anchor above the bottom details sheet.
    const latitude = THREE.MathUtils.clamp(city.latitude - (narrow ? 15 : 0), -80, 80);
    camera.position.copy(geographicNormal(city.longitude - (narrow ? 12 : 0), latitude).multiplyScalar(distance));
    controls.target.set(0, 0, 0); controls.update(); wake();
  }
  function setGrowth(enabled: boolean) { growthEnabled = enabled; if (!enabled) growthElapsed = 1; wake(); }
  function replayGrowth() { stopIntro(); growthElapsed = growthEnabled && !motion.matches ? 0 : 1; wake(); }
  type PointerStart = { x: number; y: number; id: number; moved: boolean };
  let pointerStart: PointerStart | null = null;
  const pointers = new Set<number>();
  let hoverTime = 0;
  function pick(event: PointerEvent) {
    const rect = canvas.getBoundingClientRect();
    return cityLayer?.pick(event.clientX - rect.left, event.clientY - rect.top, rect.width, rect.height, camera) ?? [];
  }
  function pointerDown(event: PointerEvent) {
    stopIntro(); pointers.add(event.pointerId);
    pointerStart = pointers.size === 1 && event.button === 0 ? { x: event.clientX, y: event.clientY, id: event.pointerId, moved: false } : null;
  }
  function pointerMove(event: PointerEvent) {
    if (pointerStart && !isClick(pointerStart, { x: event.clientX, y: event.clientY })) pointerStart.moved = true;
    if (pointers.size || event.timeStamp - hoverTime < 80) return;
    hoverTime = event.timeStamp;
    const ids = pick(event); canvas.style.cursor = ids.length ? 'pointer' : 'grab'; labels?.hover(ids[0] ?? null); wake();
  }
  function pointerUp(event: PointerEvent) {
    if (pointerStart?.id === event.pointerId && !pointerStart.moved && isClick(pointerStart, { x: event.clientX, y: event.clientY })) {
      const ids = pick(event); if (ids.length) onPick(ids);
    }
    pointers.delete(event.pointerId); pointerStart = null;
  }
  function pointerCancel(event: PointerEvent) { pointers.delete(event.pointerId); pointerStart = null; }
  // Remounting through the UI creates all resources afresh after context loss.
  canvas.addEventListener('webglcontextlost', contextLost);
  canvas.addEventListener('pointerdown', pointerDown);
  canvas.addEventListener('pointermove', pointerMove);
  canvas.addEventListener('pointerup', pointerUp);
  canvas.addEventListener('pointercancel', pointerCancel);
  canvas.addEventListener('wheel', stopIntro, { passive: true });
  canvas.addEventListener('keydown', key);
  motion.addEventListener('change', preference);
  document.addEventListener('visibilitychange', visibility);
  controls.addEventListener('change', wake);
  const observer = new ResizeObserver(resize); observer.observe(canvas);
  resize(); resetView(); interacted=false; preference(); wake();
  return { resetView, zoom, setCities, setHeightMode, setLayers, selectCity, focusCity, setGrowth, replayGrowth, stopIntro, refreshLabels: wake,
    debug: {
      rotate,
      cameraDistance: () => camera.position.length(),
      pick: (x: number, y: number) => cityLayer?.pick(x, y, canvas.clientWidth, canvas.clientHeight, camera) ?? [],
      resources: () => {
        const buffers = new Set<ArrayBufferLike>(), geometries = new Set<THREE.BufferGeometry>();
        scene.traverse(object => {
          if (object instanceof THREE.Mesh || object instanceof THREE.Points) {
            geometries.add(object.geometry);
            if (object instanceof THREE.InstancedMesh) {
              buffers.add(object.instanceMatrix.array.buffer);
              if (object.instanceColor) buffers.add(object.instanceColor.array.buffer);
            }
          }
        });
        for (const geometry of geometries) {
          for (const attribute of Object.values(geometry.attributes)) {
            if (attribute instanceof THREE.BufferAttribute) buffers.add(attribute.array.buffer);
          }
          if (geometry.index) buffers.add(geometry.index.array.buffer);
        }
        const bufferBytes = [...buffers].reduce((sum, buffer) => sum + buffer.byteLength, 0);
        const textureImage = texture?.image as HTMLImageElement | undefined;
        const textureBytes = textureImage ? textureImage.width * textureImage.height * 4 * 4 / 3 : 0;
        return { bufferBytes, textureBytesWithMipmaps: textureBytes, applicationResourceBytes: bufferBytes + textureBytes,
          drawingBufferPixels: canvas.width * canvas.height, renderTargets: 0,
          note: 'Application buffer allocations plus RGBA8 texture/mipmap estimate. Driver copies, default framebuffer/MSAA and internal renderer textures are excluded.' };
      },
      snapshot: () => ({ renderCount, camera: camera.position.toArray(), growth: growthElapsed, mode: heightMode,
        heights: cityLayer ? [...cityLayer.heights] : [], calls: renderer.info.render.calls, memory: { ...renderer.info.memory },
        points: dataset?.cities.map((city, i) => {
          const p = cityLayer!.normals[i].clone().multiplyScalar(1 + cityLayer!.heights[i] * growthElapsed).project(camera);
          const base = cityLayer!.normals[i].clone().project(camera);
          return { id: city.id, x: (p.x + 1) * canvas.clientWidth / 2, y: (1 - p.y) * canvas.clientHeight / 2,
            baseX: (base.x + 1) * canvas.clientWidth / 2, baseY: (1 - base.y) * canvas.clientHeight / 2,
            visible: cityLayer!.normals[i].dot(camera.position) > 1.001 };
        }),
      }),
    },
    dispose() {
      disposed=true; cancelAnimationFrame(frame); observer.disconnect(); controls.dispose();
      canvas.removeEventListener('webglcontextlost', contextLost);
      canvas.removeEventListener('pointerdown', pointerDown); canvas.removeEventListener('pointermove', pointerMove);
      canvas.removeEventListener('pointerup', pointerUp); canvas.removeEventListener('pointercancel', pointerCancel);
      canvas.removeEventListener('wheel', stopIntro); canvas.removeEventListener('keydown', key);
      motion.removeEventListener('change', preference); document.removeEventListener('visibilitychange', visibility);
      cityLayer?.dispose(); labels?.dispose();
      texture?.dispose(); geometry.dispose(); material.dispose(); atmosphereMaterial.dispose(); renderer.dispose();
    },
  };
}
