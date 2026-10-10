# Procedural anatomy model

The figure is not a downloaded mesh. It is a signed distance field (SDF) built from anatomical
primitives, meshed once, and baked into morph targets. Every appearance control therefore acts on
anatomical structure: muscle bellies, borders between muscles, fiber directions and vein paths.
No openly licensed asset combined a bodybuilder physique with muscle segmentation (see
`research/assets.md`), which is why the figure is built this way.

## Pipeline

1. **Anatomy** — `scripts/model/anatomy/{torso,back,arms,legs}.ts` define muscles, bony
   landmarks, deep fill ("cores"), superficial veins and fat deposits for the LEFT side (+X);
   the field mirrors them. `scripts/model/skeleton.ts` holds joint positions and the pose (the
   relaxed stance abducts the arms 4° so the inner arm stays clear of the lat).
2. **Field** — `scripts/model/field.ts` evaluates the SDF for one `FieldState` (`types.ts`):
   - each muscle bundle is a swept ellipse along a Catmull-Rom path from origin to insertion,
     with continuously interpolated cross-section frames; the belly profile is `r0 → rp (at tp)
     → r1`, the depth/width ratio is `dr`, and the depth axis follows `up`;
   - bundles of one muscle are smooth-unioned with the muscle's `k`;
   - muscles union with each other (`kInter`), cores union with each other, then the two sets
     blend with a proximity-weighted core radius (order-free, so no seams where parts swap);
   - **separation**: a groove is cut where the nearest separable part meets any separable
     neighbor (`max_j min(sep_i, sep_j)·exp(-g_j²)`), faded smoothly near deep cores;
   - **intramuscular detail**: shallower grooves between different `head`s of one muscle;
   - **fullness / size**: belly radii and depth grow or shrink along the bundle profile;
     tendons and the skeleton do not change;
   - **soft tissue** (fat, "smooth"): a 12-tap low-pass of the relief fills narrow grooves while
     keeping large forms, plus a skin/fat layer and regional fat deposits (fat only);
   - **veins**: authored paths are projected onto the base skin and raised as tubes.
   - `torsoCore` is a lofted stack of horizontal ellipses (not posed).
3. **Build** — `scripts/model/build.ts` samples the base state on a narrow band, meshes it with
   surface nets, keeps the outer skin, smooths and re-projects it, then finds every target
   surface along each vertex normal (nearest root, bracketed and bisected). Vertices without a
   root (filled creases) take their neighbors' offsets. Fat and smooth targets are relaxed
   tangentially and re-projected to remove folds. Outputs: one mesh with morph targets
   `full, flat, sizeUp, sizeDown, fat, smooth, sep, detail, vein` (int8 deltas), per-target SDF
   ambient occlusion, and per-vertex anatomy attributes (fiber direction, across-fiber
   coordinate, striation/grain weights, region id, trunks mask).
4. **Shader** — `src/three/skinMaterial.ts` adds detail too small for geometry: striations
   (rounded fiber-bundle ridges along the fibers, masked to bellies and faded at borders),
   grain (short granular bumps), skin micro relief, AO blending, region highlights and trunks.
5. **Mapping** — `src/three/appearance.ts` maps the eight illustrative controls onto target
   influences and shader strengths. Fat and smoothing deliberately hide grooves, striations,
   grain and veins (a modeling choice, stated in the UI).

Two resolutions ship: `public/model` (3.5 mm grid, ~286k vertices, 37 MB) and
`public/model-lite` (5 mm, ~140k vertices, 18 MB). The app picks lite on small screens and
switches to it once if the first frame of the detailed mesh is slow.

## Building

```sh
npm run model        # bun scripts/model/build.ts --h 0.0035 --out public/model   (~3 min, 28 workers)
npm run model:lite   # 5 mm version
bun scripts/model/build.ts --h 0.005 --targets none --out public/model-x --workers 6   # base only, seconds
npm run sources      # re-extract research source lists into src/content/sources.generated.json
```

## Render harness

`shot.html` renders one build with fixed camera and lighting (used for verification and
screenshots). With the dev server running (`npm run dev`):

```
/shot.html?model=model&view=front&focus=full&a={"bodyFat":0.05,"separation":1,"striations":1}
```

Parameters: `model` (folder under `public/`), `view` (`front|back|left|right|threeQuarter`),
`focus` (`full|shoulders|chest|arms|forearms|abs|back|lowerback|glutes|quads|hamstrings|calves`),
`a` / `b` (appearance JSON; `b` enables the A/B split), `light` (`neutral|stage`), `hl`
(regions to highlight), `dist` (camera distance multiplier). The page sets
`window.__ready = true` after rendering.

Appearance keys (illustrative; 0..1 unless noted): `size` (-1..1), `fullness` (-1..1), `bodyFat`,
`smoothness`, `separation`, `striations`, `vascularity`, `detail`.

## Authoring rules

- Meters, +Y up, the figure faces +Z, +X is the figure's left. Joints are in `skeleton.ts`.
- `B(points, r0, rp, r1, tp, dr, up, head?, bulge?)` makes a bundle. Fan muscles use several
  bundles ordered across the muscle; the striation coordinate runs across them in order.
- Muscles must pack against neighbors and deep cores. Narrow, deep pockets break the
  soft-tissue morphs. Borders should read as grooves made by `sep`, not as gaps.
- `sep`: how strongly a border can show when lean. `intra`: grooves between heads. `stri`: how
  readily striations show. `lines`: striation count across the whole muscle.
