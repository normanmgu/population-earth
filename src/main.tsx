import { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { createGlobe, type GlobeStatus } from './globe/controller';
import { loadCities } from './data/loader';
import { formatPopulation, populationHeight, type HeightMode } from './layers/city-math';
import './app/styles.css';

type CityRelease = Awaited<ReturnType<typeof loadCities>>;
type Panel = 'cities' | 'details' | 'source' | null;
function App() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const labelHost = useRef<HTMLDivElement>(null);
  const detailTitle = useRef<HTMLHeadingElement>(null);
  const globe = useRef<ReturnType<typeof createGlobe> | null>(null);
  const [status, setStatus] = useState<GlobeStatus | 'unsupported'>('loading');
  const [attempt, setAttempt] = useState(0);
  const [dataAttempt, setDataAttempt] = useState(0);
  const [release, setRelease] = useState<CityRelease | null>(null);
  const [dataError, setDataError] = useState(false);
  const [mode, setMode] = useState<HeightMode>('linear');
  const [citiesVisible, setCitiesVisible] = useState(true);
  const [particles, setParticles] = useState(true);
  const [growth, setGrowth] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [nearby, setNearby] = useState<string[]>([]);
  const [panel, setPanel] = useState<Panel>(null);
  const [query, setQuery] = useState('');
  const [resultPage, setResultPage] = useState(0);
  useEffect(() => setResultPage(0), [query, nearby]);
  const [settingsOpen, setSettingsOpen] = useState(innerWidth > 650);
  const failed = status === 'unsupported' || status === 'context-lost';
  const selected = release?.dataset.cities.find(c => c.id === selectedId);
  const source = release?.manifest.sources.find(s => s.id === (selected?.populationSourceId ?? release.manifest.sources[0].id));
  const definition = release?.manifest.definitions.find(d => d.id === (selected?.definitionId ?? release.manifest.definitions[0].id));
  const activePanel = failed && !panel ? 'cities' : panel;
  function choose(id: string) { setSelectedId(id); setPanel('details'); setNearby([]); }
  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(media.matches);
    media.addEventListener('change', update); return () => media.removeEventListener('change', update);
  }, []);
  useEffect(() => {
    const abort = new AbortController(); setDataError(false);
    loadCities(abort.signal).then(setRelease).catch(() => { if (!abort.signal.aborted) setDataError(true); });
    return () => abort.abort();
  }, [dataAttempt]);
  useEffect(() => {
    setStatus('loading');
    try {
      globe.current = createGlobe(canvas.current!, setStatus, labelHost.current!, ids => {
        if (ids.length === 1) choose(ids[0]);
        else { setNearby(ids); setPanel('cities'); setQuery(''); }
      });
      // Only development and the explicit benchmark build expose QA controls.
      if ((import.meta.env.DEV || import.meta.env.MODE === 'benchmark')) Object.assign(window, { __populationEarth: globe.current });
    } catch { setStatus('unsupported'); }
    return () => { globe.current?.dispose(); globe.current = null; if ((import.meta.env.DEV || import.meta.env.MODE === 'benchmark')) Reflect.deleteProperty(window, '__populationEarth'); };
  }, [attempt]);
  useEffect(() => { if (release) globe.current?.setCities(release.dataset, release.manifest.display); }, [release, attempt]);
  useEffect(() => { globe.current?.setHeightMode(mode); }, [mode, attempt]);
  useEffect(() => { globe.current?.setLayers({ cities: citiesVisible, particles }); }, [citiesVisible, particles, attempt]);
  useEffect(() => { globe.current?.setGrowth(growth); }, [growth, attempt]);
  useEffect(() => { globe.current?.selectCity(selectedId); }, [selectedId, attempt]);
  useEffect(() => { globe.current?.refreshLabels(); }, [panel, nearby, query, settingsOpen, status]);
  useEffect(() => {
    if (panel === 'details') detailTitle.current?.focus({ preventScroll: true });
    if (panel === 'cities' && !nearby.length) document.getElementById('city-search')?.focus({ preventScroll: true });
  }, [panel, selectedId, nearby]);
  const searchIndex = useMemo(() => release?.dataset.cities.map(city => ({ city,
    text: `${city.nameEn} ${city.countryOrArea.name} ${city.localNames.map(n => n.value).join(' ')}`.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase(),
  })) ?? [], [release]);
  const results = useMemo(() => {
    const text = query.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();
    const ids = nearby.length ? new Set(nearby) : null;
    return searchIndex.filter(entry => (!ids || ids.has(entry.city.id)) && entry.text.includes(text)).map(entry => entry.city);
  }, [searchIndex, query, nearby]);
  const pageSize = 50, pageCount = Math.max(1, Math.ceil(results.length / pageSize));
  const currentPage = Math.min(resultPage, pageCount - 1);
  return <main className={failed ? 'graphics-failed' : undefined} onPointerDownCapture={() => globe.current?.stopIntro()} onKeyDownCapture={() => globe.current?.stopIntro()}>
    <canvas key={attempt} ref={canvas} tabIndex={failed ? -1 : 0} aria-label="Interactive Earth. Drag to rotate; scroll or pinch to zoom. Select a city pillar or use Browse cities. Arrow keys rotate, plus and minus zoom, Home resets the view." />
    <div ref={labelHost} className="city-labels" aria-label="Visible city labels" />
    <header data-label-obstacle><h1>Population Earth</h1><p className="eyebrow"><span /> 12,138 cities · 50,000+ people</p><p className="edition">2025 estimates <span>·</span> DEGURBA city coverage</p></header>
    <div className="controls" data-label-obstacle aria-label="Globe controls">
      <button disabled={failed} onClick={() => globe.current?.zoom(.87)} aria-label="Zoom in">+</button>
      <button disabled={failed} onClick={() => globe.current?.zoom(1.15)} aria-label="Zoom out">−</button>
      <button disabled={failed} className="reset" aria-label="Reset view" onClick={() => globe.current?.resetView()}>↺ <span>Reset view</span></button>
    </div>
    <section className="layer-controls" data-label-obstacle aria-label="City display">
      <div className="toolbar"><button aria-expanded={settingsOpen} onClick={() => setSettingsOpen(v => !v)}>Display <span>{settingsOpen ? '−' : '+'}</span></button><button onClick={() => { setPanel('cities'); setNearby([]); }}>Browse cities</button></div>
      <p className="scale-label">Height: {mode} <span>— total city population</span></p>
      {settingsOpen && <div className="settings">
        <label className="check"><input type="checkbox" checked={citiesVisible} onChange={e => setCitiesVisible(e.target.checked)} /> City pillars</label>
        <fieldset><legend>Height mode</legend><div className="segmented">{(['linear', 'logarithmic'] as const).map(value => <button key={value} aria-pressed={mode === value} onClick={() => setMode(value)}>{value === 'linear' ? 'Linear' : 'Logarithmic'}</button>)}</div></fieldset>
        {citiesVisible && release && <div className="legend" aria-label={`${mode} population height legend`}>
          {[1000000, 10000000, 40000000].map(p => <div key={p}><i style={{ height: `${populationHeight(p, mode, release.manifest.display) / release.manifest.display.heightReference * 46}px` }} /><span>{p / 1000000}M</span></div>)}<p>People · fixed scale<br />{mode === 'linear' ? 'Twice the population, twice the height.' : 'Log heights compress population differences.'}</p>
        </div>}
        <label className="check"><input type="checkbox" checked={particles} onChange={e => setParticles(e.target.checked)} /> Decorative particles</label>
        <label className="check"><input type="checkbox" checked={growth} onChange={e => setGrowth(e.target.checked)} /> Growth animation</label>
        <button className="text-button" disabled={failed || !release || !growth || reducedMotion || !citiesVisible} onClick={() => globe.current?.replayGrowth()}>Replay growth ↗</button>
        {reducedMotion && <p className="muted">Reduced motion: growth stays still.</p>}
        <p className="muted">Markers and particles are decorative; only pillar height encodes population.</p>
      </div>}
      <button className="source-link" onClick={() => setPanel('source')}>Data & sources ↗</button>
    </section>
    {activePanel && <aside className="inspector" data-label-obstacle aria-label="City inspector">
      <div className="panel-heading"><h2>{activePanel === 'cities' ? nearby.length ? 'Nearby cities' : 'Explore cities' : activePanel === 'source' ? 'Data & sources' : 'Selected city'}</h2><button aria-label="Close panel" onClick={() => { setPanel(null); setNearby([]); }}>×</button></div>
      <div className="panel-body">
        {activePanel === 'cities' && <>
          <p className="muted">{nearby.length ? 'Several cities share this small screen area. Choose one to inspect.' : 'All eligible 2025 records from UN WUP F21. Search by city or country.'}</p>
          {nearby.length > 0 && <button className="text-button" onClick={() => setNearby([])}>Show all cities</button>}
          <label className="search-label" htmlFor="city-search">Find a city</label><input id="city-search" type="search" placeholder="City or country" value={query} onChange={e => setQuery(e.target.value)} />
          <p className="muted" role="status">{release ? `${results.length} ${results.length === 1 ? 'city' : 'cities'}` : dataError ? 'City data unavailable' : 'Loading cities…'}</p>
          <ul className="city-list">{results.slice(currentPage * pageSize, (currentPage + 1) * pageSize).map(city => <li key={city.id}><button onClick={() => choose(city.id)}><span>{city.nameEn}<small>{city.countryOrArea.name}</small></span><span className="list-population">{formatPopulation(city.population)}</span></button></li>)}</ul>
          {pageCount > 1 && <nav aria-label="Search result pages"><button disabled={currentPage === 0} onClick={() => setResultPage(currentPage - 1)}>Previous page</button><span> Page {currentPage + 1} of {pageCount} </span><button disabled={currentPage + 1 === pageCount} onClick={() => setResultPage(currentPage + 1)}>Next page</button></nav>}
          {release && results.length === 0 && <p>No matching cities.</p>}
        </>}
        {activePanel === 'details' && selected && <>
          <p className="country">{selected.countryOrArea.name}</p><h3 ref={detailTitle} tabIndex={-1}>{selected.nameEn}</h3>
          {selected.localNames.map(name => <p key={`${name.language}-${name.value}`} lang={name.language} dir="auto">{name.value}</p>)}
          <p className="population" data-testid="population">{formatPopulation(selected.population, source?.displayPrecisionPeople)}</p><p className="muted">people · mid-year {selected.referenceYear} {selected.valueStatus}<br />Rounded to the nearest 1,000 people.</p>
          <button className="primary-button" disabled={failed || !citiesVisible} onClick={() => globe.current?.focusCity(selected.id)}>Zoom to city ↗</button>
          {!citiesVisible && <p className="muted">Turn on city pillars to locate this city.</p>}
          <dl><dt>Settlement definition</dt><dd>{definition?.label}</dd><dt>Location</dt><dd>{selected.latitude.toFixed(4)}°, {selected.longitude.toFixed(4)}°<br />{selected.coordinateMethod}</dd><dt>Publisher record</dt><dd>{selected.sourceRecordId}</dd><dt>Population source</dt><dd>{source?.publisher}<br />{source?.title}</dd></dl>
          <button className="text-button" onClick={() => setPanel('source')}>Inspect source & methodology ↗</button>
          <button className="text-button" onClick={() => { setPanel('cities'); setNearby([]); }}>Back to city search</button>
        </>}
        {activePanel === 'source' && release && source && <>
          <p className="source-disclosure">12,138 cities · 50,000+ people</p><p>All 12,138 eligible DEGURBA cities with a published 2025 population of at least 50,000. The source has 4,690 records without a 2025 value; these are excluded, never treated as zero. This is not a map of all people or settlements.</p>
          <h3>{definition?.label}</h3><p>{definition?.description}</p>
          <p><a href={source.url} target="_blank" rel="noreferrer">{source.title} ↗</a></p>
          <dl><dt>Population</dt><dd>Mid-year 2025 estimates. Workbook sheet {source.sheet}, column BJ (2025), in {source.units}; multiplied by 1,000. {source.displayPrecisionNote}</dd><dt>Coordinates</dt><dd>Population-weighted centroids, columns J/K. {source.coordinateDatum}</dd><dt>Names</dt><dd>Publisher display names are preserved. This release has no separately verified local-script names.</dd><dt>Fixed height scale</dt><dd>Ceiling: 41,913,860 people; maximum height: 0.12 Earth radii. Log reference: 50,000 people. Perspective changes apparent height; selection never changes geometry.</dd></dl>
          <p className="formula">Linear: h = 0.12 × P / 41,913,860<br />Log: h = 0.12 × ln(1 + P/50,000) / ln(1 + 41,913,860/50,000)</p>
          <p className="muted">{source.attribution}</p><p><a href={source.licenseUrl} target="_blank" rel="noreferrer">{source.license}</a> · Retrieved {source.retrievedDate}</p>
          <p><a href={`${import.meta.env.BASE_URL}data/m3-2025-v1/manifest.json`} target="_blank" rel="noreferrer">Source manifest & checksum ↗</a></p><p><a href={`${import.meta.env.BASE_URL}data/m3-2025-v1/reconciliation.json`}>Coverage reconciliation</a> · <a href={`${import.meta.env.BASE_URL}data/m3-2025-v1/exclusions.json`}>Exclusions</a> · <a href={`${import.meta.env.BASE_URL}data/m3-2025-v1/provenance.json`}>Row provenance</a></p>
          {selected && <button className="text-button" onClick={() => setPanel('details')}>Back to {selected.nameEn}</button>}
        </>}
      </div>
    </aside>}
    <div className={failed || status === 'asset-error' ? 'status error' : 'status'} role="status">
      {status === 'loading' && 'Preparing Earth…'}
      {status === 'asset-error' && <><p>The Earth texture could not load. Check your connection and try again.</p><button onClick={() => setAttempt(a => a + 1)}>Retry texture</button></>}
      {failed && <><h2>{status === 'context-lost' ? 'Graphics connection interrupted' : 'This globe needs WebGL2'}</h2><p>{status === 'context-lost' ? 'Rebuild the globe to continue exploring.' : 'Try a current browser with hardware acceleration enabled.'} City search and source details remain available.</p><button onClick={() => setAttempt(a => a + 1)}>Try again</button></>}
    </div>
    {(!release || dataError) && <div className="data-status" role="status" data-label-obstacle>{dataError ? <><p>The city data could not load. The globe is still available.</p><button onClick={() => setDataAttempt(a => a + 1)}>Retry city data</button></> : 'Loading 12,138 cities…'}</div>}
    <footer data-label-obstacle><div><p className="instruction">Drag to rotate <span>·</span> Select a pillar to inspect</p><p className="scope">UN WUP 2025 · DEGURBA cities · Density is not displayed</p></div><a href="https://www.naturalearthdata.com/" target="_blank" rel="noreferrer">Made with Natural Earth <span>↗</span></a></footer>
  </main>;
}
createRoot(document.getElementById('root')!).render(<App />);
