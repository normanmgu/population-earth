# Population Earth — Product Brief

Status: consolidated from the creator's agreed decisions. Working title: Population Earth.

## Purpose and audience

Create an explorable 3D Earth that helps people comprehend the uneven distribution and scale of human settlement. The opening experience should inspire surprise and awe: concentrations of people emerge against large, sparsely settled regions.

The primary audience is the creator, who wants to explore population visually and assess Astra's design and implementation abilities. The result should also be understandable and compelling when shown to others, without specialist knowledge.

## First-version scope

A browser experience showing urban-agglomeration populations as forms rising from their geographic locations. This layer compares **total population in urban areas**, not population density in people per square kilometre. A later, separate gridded density layer will show settlement across all land, including rural areas. The first layer alone must not be presented as a complete map of all people on Earth.

## Visual direction

- A geographically accurate, restrained Earth: recognizable coastlines, muted land and oceans, and selective realism where it improves orientation or visual quality. Population forms dominate.
- An opening wide orbital view with gentle movement that establishes the globe's scale and invites exploration.
- Glowing vertical pillars enriched with clustered points of light, combining readable height with a sense of accumulated human presence. Each form extends radially outward, perpendicular to the globe's surface at its location.
- A polished, minimal presentation with little interface clutter. Colors, materials, and lighting can be refined through concept references; no reference image is required or approved by this brief.
- Pillar height carries the quantitative meaning. Particle decoration must not imply that each point represents a fixed number of people unless that mapping is explicitly implemented and explained. Nearby forms must remain grounded in their individual locations; avoid merging them into unlabelled aggregates.

## Interactions

- Drag to rotate and scroll or pinch to zoom around Earth.
- Provide a population-layer toggle that reveals the city forms growing from the surface.
- Default to linear height: twice the population means twice the height, using one consistent global multiplier. The multiplier is a display scale, not literal geographic altitude.
- Offer an explicitly labeled logarithmic height mode for easier inspection of smaller cities. Keep the scale consistent across locations and label it clearly; selecting a city always shows its underlying population.
- Clicking or tapping a city shows its English name, locally used name in the appropriate script when different and reliably available, and population. The presentation stays compact. Source year and geographic definition must be accessible.

## Data definition

Use a single documented definition of urban settlement worldwide. The agreed target is urban agglomerations, including the connected urban region rather than mixing city-proper and country-specific metro-area totals.

The proposed primary source is [UN World Urbanization Prospects 2025](https://population.un.org/wup/), targeting cities of 50,000 or more inhabitants for the full city layer. Before integration, verify which published table and geographic definition match the intended comparison; retain the source's precise terminology rather than assuming all city tables mean metropolitan area. Use a consistent reference year, provisionally 2025, and distinguish estimates from projections according to the metadata.

Each record needs a stable identifier, coordinates, English name, locally used name(s) with language information where available, country or area, population, reference year, and source. Coordinates and local names may require supplementary sources with documented attribution. Do not invent missing names or treat a light footprint as a measured urban boundary.

For the first visual prototype, a clearly identified sample of 30–100 representative urban areas is sufficient; it must not be described as complete global coverage. The full city dataset follows once the visual direction works.

## Success criteria

1. Within seconds, the globe communicates large differences in urban population and settlement concentration without requiring a tutorial.
2. Earth remains recognizable, and forms are correctly positioned and oriented on its surface.
3. Linear heights preserve population ratios; logarithmic mode is visibly labeled and never silently applied.
4. Selected-city names and populations match their documented sources, and missing local names are handled honestly.
5. Rotation, zoom, and selection feel responsive on the creator's desktop browser; dense regions remain inspectable.
6. The opening view is visually impressive enough to share, while preserving the readability and meaning of the data.

## Decisions for later stages

No further creator decision is needed to use this brief. Validate the source table, coordinate/name coverage, and geographic definitions during data preparation. Approve colors, lighting, and pillar appearance during visual exploration. Exact performance targets depend on the target hardware and belong in the technical plan.

## Approved visual concept

The creator approved the third concept image as the visual direction for further work: [Population Earth concept](population-earth-concept.png). It emphasizes a stylized population-density surface map, with restrained city population pillars and nearby city tags. The image is a visual reference; its rendered data, city positions, and labels are illustrative rather than a validated dataset.

