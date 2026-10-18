import { Vector3, type PerspectiveCamera } from 'three';
import type { CityRecord } from '../data/contracts';
import { visibleAnchor } from '../layers/city-math';

type Rect = { x: number; y: number; w: number; h: number };
export function overlaps(a: Rect, b: Rect, gap = 8) {
  return a.x < b.x + b.w + gap && a.x + a.w + gap > b.x && a.y < b.y + b.h + gap && a.y + a.h + gap > b.y;
}
export function createLabels(host: HTMLDivElement, cities: CityRecord[], onSelect: (id: string) => void) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('aria-hidden', 'true'); host.append(svg);
  // Fixed pool: full coverage must not create 12,138 buttons or sort each frame.
  const priority = cities.map((_, i) => i).sort((a, b) => cities[b].population - cities[a].population);
  const byId = new Map(cities.map((c, i) => [c.id, i]));
  const labels = Array.from({ length: 12 }, () => {
    const button = document.createElement('button');
    button.className = 'city-label'; button.hidden = true;
    button.onclick = () => onSelect(button.dataset.cityId!);
    const line = document.createElementNS(svg.namespaceURI, 'line');
    svg.append(line); host.append(button);
    return { button, line };
  });
  const projected = new Vector3();
  let selected: string | null = null, hovered: string | null = null;
  return {
    select(id: string | null) { selected = id; },
    hover(id: string | null) { hovered = id; },
    update(camera: PerspectiveCamera, normals: Vector3[], heights: Float32Array, growth: number, visible: boolean) {
      const width = host.clientWidth, height = host.clientHeight;
      // Reserve UI space, then reject intersecting labels. Actual glyph widths
      // are measured, including publisher names in non-Latin scripts.
      const reserved = [...document.querySelectorAll<HTMLElement>('[data-label-obstacle]')]
        .filter(el => el.offsetWidth && el.offsetHeight)
        .map(el => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; });
      let count = 0;
      for (const { button, line } of labels) { button.hidden = true; line.setAttribute('visibility', 'hidden'); }
      if (!visible) return;
      const preferred = [selected, hovered].flatMap(id => id && byId.has(id) ? [byId.get(id)!] : []);
      let candidates = 0;
      const order = [...new Set(preferred)];
      for (let cursor = 0; cursor < order.length + priority.length; cursor++) {
        const i = cursor < order.length ? order[cursor] : priority[cursor - order.length];
        if (cursor >= order.length && order.includes(i)) continue;

        if (count >= (width < 650 ? 5 : 12) || candidates >= 128) break;
        if (!visibleAnchor(normals[i], camera.position)) continue;
        candidates++;
        const { button, line } = labels[count];
        button.textContent = cities[i].nameEn;
        button.setAttribute('aria-label', `Inspect ${cities[i].nameEn}`);
        button.dataset.cityId = cities[i].id;
        projected.copy(normals[i]).multiplyScalar(1 + heights[i] * growth).project(camera);
        if (projected.z < -1 || projected.z > 1) continue;
        const x = (projected.x + 1) * width / 2, y = (1 - projected.y) * height / 2;
        button.hidden = false;
        const w = button.offsetWidth, h = button.offsetHeight;
        const positions = [{ x: x + 16, y: y - h - 10, w, h }, { x: x - w - 16, y: y + 10, w, h }];
        const rect = positions.find(r => r.x > 12 && r.y > 12 && r.x + w < width - 12 && r.y + h < height - 12 && !reserved.some(other => overlaps(r, other)));
        if (!rect) { button.hidden = true; continue; }
        reserved.push(rect); count++;
        button.style.transform = `translate(${rect.x}px,${rect.y}px)`;
        button.classList.toggle('selected', cities[i].id === selected);
        line.setAttribute('x1', String(x)); line.setAttribute('y1', String(y));
        line.setAttribute('x2', String(rect.x > x ? rect.x : rect.x + w)); line.setAttribute('y2', String(rect.y + h / 2));
        line.setAttribute('visibility', 'visible');
      }
    },
    dispose() { host.replaceChildren(); },
  };
}
