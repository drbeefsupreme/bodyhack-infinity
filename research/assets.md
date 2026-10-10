# 3D assets and reference photos for the Bodybuilding Appearance Explorer

Research dates: 2026-10-09 and 2026-10-10 (UTC). Scope: openly licensed 3D models of a muscular adult male, anatomical muscle meshes, and Wikimedia Commons reference photos. This file holds no app code. Numbers in square brackets point to the numbered **Sources** list at the end.

## Bottom line

- No openly licensed, login-free asset combines a bodybuilder physique, separate muscle meshes, and a matching skin.
- The most usable and legally cleanest body is the **MakeHuman base mesh with its targets (CC0)**. It is a complete skin body with UVs, 13,380 vertices, and region-level muscle morphs. It has no per-muscle segmentation, and its muscle borders are soft.
- The best muscle segmentation is **Écorché** (glTF, 362 named muscle meshes, CC BY-SA 4.0), built from BodyParts3D (CC BY 4.0) and Z-Anatomy (CC BY-SA 4.0). It is an average build with no skin and no UVs.
- Separation, striations, and veins must be authored as shader, normal-map, or displacement layers. No open asset ships them in a usable form.
- Section 10 gives the full recommendation and the limits.

## 1. Method

- **Login test.** I ran `curl -sSIL` (or a ranged GET when HEAD was refused) without cookies or tokens. "Yes" means HTTP 200 or 206 with the file itself.
- **Measurements.** A throwaway Bun script read vertex counts, face counts, and bounding boxes from OBJ, STL, PLY, and glTF/GLB files. For glTF, the box is in accessor space unless a note says otherwise.
- **Visual check.** A throwaway software rasterizer made grayscale previews (front, side, back, 3/4 view) of the downloaded meshes. The previews are our own renders. They are in the candidate folders.
- **Licenses.** Quotes come from the page that is cited. "[INFERENCE]" marks a conclusion that no page states. "[UNVERIFIED]" marks a claim that I could not check.
- **Parallel slices.** Four research slices did part of the checks (parametric bodies were done directly). I checked these key claims again myself: the BodyParts3D license page [29], the Écorché license and README [45][26], the Quaternius QAL page [131], the Sketchfab download docs and the 401 response [140][157], the SMK KAS224 record and 3D page [67][77], the BodyParts3D parts lists (no latissimus dorsi, no rectus abdominis), and the licenses of five Commons photos and one anatomy plate.

## 2. Fit criteria

- Muscular physique that can look like a bodybuilder.
- Readable muscle groups (pecs, delts, arms, abs, lats, back, quads, hamstrings, calves).
- Separate muscle segmentation, so that the app can deepen grooves at muscle borders, add striations along fibre directions, and morph fullness per muscle.
- Browser-ready format (glTF/GLB or OBJ) and a size of about 1 million triangles or fewer.
- Legally clean: CC0 or CC BY. CC BY-SA is usable with a share-alike duty. NC, ND, and custom licenses are not usable.

## 3. Comparison table

| Candidate | License (as stated) | Login-free download | Format | Size (measured unless noted) | Muscle segmentation | Pose | Fit |
|---|---|---|---|---|---|---|---|
| MakeHuman base mesh + targets | "CC0 1.0 Universal" [1] | Yes [4] | OBJ + text targets | body 13,380 v / 26,756 tris | No (skin); region morphs | A-pose | **Best legal skin base** |
| MPFB2 (Blender add-on) | assets "CC0 1.0 Universal"; code GPLv3 [9] | Yes [12] | Blender add-on | same mesh | No | A-pose + rigs | Same shapes; needs Blender |
| MakeHuman "Malemuscles" skin | "CC-BY - Creative Commons Attribution" [19] | Yes | JPG maps + MHMAT | 8192² colour, 4096² normal | Painted only | n/a | Reference only (provenance) |
| Écorché (Charleeh/ecorche) | "CC BY-SA 4.0" (model) [45] | Yes | GLB (quantized / meshopt) | 486,005 v / 984,688 tris | **Yes: 362 muscle meshes, FMA IDs** | Anatomical position | **Best segmentation** |
| BodyParts3D 4.0 (DBCLS) | "Creative Commons Attribution 4.0 International" [29] | Yes [28] | OBJ per part | muscles 1,596,530 v | Yes (no lats, no rectus abdominis) | Anatomical | Raw source, heavy |
| Z-Anatomy | "CC BY-SA 4.0" [39][41] | Yes | FBX, .blend | 2,323,591 tris (muscles) | Yes (~470 muscle meshes) | Anatomical | Heavy; BY-SA |
| NIH 3D (VHM arms, bust, HRA skin, torso) | "CC-BY" badge [51]–[57] | Yes | GLB/STL | 188k–1.43M v | No (merged) | Parts / standing | Low |
| SMK Herakles Lansdowne cast | Public Domain Mark 1.0 [67] | Yes | STL | 400,026 tris (small STL) | No (fused) | Contrapposto + club, lion skin, plinth | Reference only |
| SMK Doryphoros cast | PDM 1.0 [74]; "CC0 Public Domain" on Sketchfab [97] | Yes | GLB, STL | 137,585 v / 275,182 tris | No | Contrapposto + stump, plinth | Prototype mesh only |
| Francavilla écorché statuette | "CC0 Public Domain" [146]; Zenodo cc-zero [93] | Yes (Zenodo) | GLB + PBR maps | 181,284 v / 303,228 tris | No (fused) | Dramatic pose, large base | Reference only |
| Scan the World statues (Farnese Hercules, Borghese, Houdon écorché …) | "BY-NC-SA" [85]–[91] | Bot-protected | STL | n/a | No | Various | **Not usable (NC)** |
| Sketchfab CC BY bodybuilders (5 found) | "CC Attribution" [147]–[152] | **No (401)** [157] | glTF after login | 11,835–630,125 v (API) | No | Various | Possible with an account |
| Quaternius Superhero Male | pack "CC0" vs site "QAL v1.0" [130][131] | Yes (itch.io) | glTF, FBX | 8,483 v / 14,318 tris | No | T-pose | Stylized; license conflict |
| Poly Pizza "Male base" | "CC-BY 3.0" [126] | Yes | GLB | 24,461 v / 48,916 tris | No | A-pose | Not muscular |
| three.js example humans | Mixamo terms, others mixed [110]–[122] | Yes | GLB/FBX/OBJ | not measured | No | T-pose / animated | None |
| Kenney, Poly Haven | "Creative Commons CC0" [134]; "all licensed as CC0" [168] | Yes | zip / GLB | not measured | No | n/a | None |
| MB-Lab | generated models "AGPL 3" [23] | Yes (archived repo) | Blender | n/a | No | n/a | Rejected (AGPL) |
| Open3DModel | "Personal use or Education" [62]–[64] | Ad gateway | .max/.rar | n/a | n/a | n/a | Rejected |

## 4. Parametric human bodies (skin surface)

### 4.1 MakeHuman 1.x base mesh and targets (downloaded)

- **URL:** https://github.com/makehumancommunity/makehuman (files in `makehuman/data/3dobjs/` and `makehuman/data/targets/`) [3][4].
- **Author / owner:** MakeHuman Team / MakeHuman Community. The target files name Manuel Bastioni as the original author [5].
- **License:** "These assets have been released under CC0 1.0 Universal." The assets include "The base mesh and proxies", "Targets and modifiers", and "Textures". The project "makes no claim whatsoever over output such as: Exports to files (FBX, OBJ, DAE, MHX2...)" [1][2]. Each target file says "This asset was explicitly released as CC0 in september 2020" [5]. The program code is AGPL, but we need only the assets [1].
- **Download without login:** yes. `base.obj` returned HTTP 200 with Content-Length 1,749,303 [4]. All 1,280 `.target` files are plain text in the public repository [3]. The latest release is v1.3.0 (2024-05-15) [7].
- **Format:** OBJ (quads, with UVs) plus `.target` files. One target line is "vertex index, dx, dy, dz".
- **Polycount:** not stated. Measured: the file has 19,158 vertices and 21,334 UV coordinates. The `body` group uses 13,380 vertices and 13,378 quads (26,756 triangles). The other vertices belong to helper meshes (tights, skirt, hair, eyes, teeth, tongue) and joint cubes.
- **Structure:** one skin surface. There are no muscle meshes. The MPFB vertex-group table has only helper, joint, and Left/Mid/Right groups [18].
- **Pose:** A-pose (arms about 45° down), from our render.
- **Downloaded to:** `research/asset-candidates/makehuman/`: `base.obj` (1,749,303 B), 25 target files in `targets/` (2.4 MB), a generated variant `makehuman-maxmuscle-avgweight-ideal-localmuscle.obj` (1,547,888 B), and `preview-variants-A-B-C-D.png`.
- **Bounding box (body group):** base 9.93 × 16.66 × 4.23 units; variant C 12.40 × 17.30 × 4.74 units. [INFERENCE] The units are decimetres, because the neutral base is 16.66 units tall.
- **Muscle morphs:** The muscle-related targets are region morphs [6]. Vertices moved by each `-incr` target (measured): stomach tone 175; forearm muscle 237 per side; shoulder muscle 237 per side; calf muscle 292–304 per side; upper-arm muscle 319 per side; thigh muscle 474 per side; pectoral 863; dorsi (lats) 868; torso V-shape 6,342. The macro "maxmuscle" targets move 6,825–8,239 vertices.

**Slider test.** The docs describe Muscle, Weight, and Proportions macro sliders [8]. I summed the CC0 target files with fixed weights to copy the slider settings below. [INFERENCE] The MakeHuman app may weight macro targets a little differently, so the shapes are close but not exact.

| Variant | Targets and weights | Result in our render |
|---|---|---|
| A | male-young ethnic targets, 1/3 each | Average young man |
| B | A + `universal-male-young-maxmuscle-minweight` (Muscle 100 %, Weight minimum) | Lean, athletic, "fit" build. Not a bodybuilder. |
| C | A + `maxmuscle-averageweight` + `idealproportions` + 14 local muscle targets at +100 % | Broad shoulders, large pecs, lats, arms, and thighs. Closest to a bodybuilder silhouette. Soft borders, no striations. |
| D | Same as C, but with `maxmuscle-maxweight` | Very massive and cartoon-like, with a thick waist and exaggerated lats and quads. |

![MakeHuman variants A–D; columns: front, side, back, 3/4](asset-candidates/makehuman/preview-variants-A-B-C-D.png)

**Fitness:**
- Muscular physique: partly. The macro sliders alone give an athletic build (B). The local muscle targets add a bodybuilder-like silhouette (C). No setting shows contest-level separation.
- Readable muscle groups: weak. Pec, ab, and delt shapes read under raking light. Borders stay soft at 13,380 vertices.
- Segmentation: none. [INFERENCE] The vertex sets of the local targets can serve as rough region masks for pecs, lats, shoulders, arms, forearms, thighs, calves, and abs.
- Fullness: good as a visual morph. [INFERENCE] Each target can become a glTF morph target, because a target is only a list of vertex offsets.
- Grooves, striations, veins: these need authored normal or displacement maps on the MakeHuman UV layout. MPFB states that "The bundled assets currently do not include any normal maps for skins" [17]. The body is all quads. [INFERENCE] Catmull–Clark subdivision gives about 53,500 quads (one level) or 214,000 quads (two levels) for displacement.

### 4.2 MPFB2, the MakeHuman add-on for Blender

- **URL:** https://extensions.blender.org/add-ons/mpfb/ [12]; repository https://github.com/makehumancommunity/mpfb2 [10].
- **Author / owner:** MakeHuman Community; the extension page lists "Joel-Palmius" [12].
- **License:** "MPFB uses the same license setup as MakeHuman, but with GPLv3 as source code license". The assets "have been released under CC0 1.0 Universal". The team "makes no claim whatsoever over output such as: Exports to files (FBX, OBJ, DAE, MHX2...)" [9].
- **Download without login:** yes. The v2.0.17 zip returned HTTP 200 after a 302, 45,031,536 B [12]. Asset packs also download without login: system assets 280,737,770 B, Skins 02 76,112,708 B, Arms 01 210,241 B [13]–[16].
- **Format:** Blender add-on. It needs Blender 4.2 or later [10][11]. Blender is not installed on this host, so I did not run MPFB.
- **Polycount / structure:** MPFB ships the same `base.obj` (same git blob SHA `d26635e9`, 1,749,303 B) and the same muscle targets (as `.target.gz`) [193]. It adds rigs, Rigify support, and a procedural skin material [12]. The system assets include CC0 proxy topologies such as `male_muscle_13290` [14].
- **Pose:** A-pose; rigs allow posing [12].
- **Downloaded to:** not downloaded (same mesh and targets as 4.1).
- **Fitness:** the same shape space as MakeHuman. Use MPFB if the team wants a rigged GLB with shape keys from Blender.

### 4.3 MakeHuman community assets with muscle detail

The user-contributed repository lists 189 skins and 394 targets [194][195]. The muscle-related entries are below.

| Asset | Author (date) | License (page) | Content | Decision |
|---|---|---|---|---|
| "Malemuscles 男性肌肉图解" skin [19] | 123guzhanhong123 (2020-12-28) | "CC-BY - Creative Commons Attribution" | 8192 × 8192 colour map of painted muscles, tendons, and veins; 4096 × 4096 normal map; MHMAT name `muscleveinmale`; "Compatibility: 1.1.x" | **Downloaded** to `asset-candidates/makehuman-community-malemuscles/` (17,036,357 B, 12,057,753 B, 1,030 B). It shows fibre directions on the MakeHuman UVs. It looks like an écorché, not skin. The page does not state the source of the painting, so use it as a reference only. |
| "Eves Young Caucasian Male Muscular" skin [20] | jimlsmith9999 (2020-03-10) | "CC-BY - Creative Commons Attribution" | 14 MB diffuse PNG | Not downloaded. The page says "Attribution given to 3d.sk for the photo references." Textures from a commercial photo site are a provenance risk. |
| "BASESTRONG" target [21] | pppancho68 (2018-01-31) | "CC-BY - Creative Commons Attribution" | "SMOOTH STYLIZED MALE STRONG", large modification, 659,461 B | Not downloaded (stylized). |
| "HarveyStomachMusclesV2" target [22] | callharvey3d (2016-03-15) | "CC-BY - Creative Commons Attribution" | Abdominal muscle target, 3,343 B | Not downloaded (small; possible ab-definition morph). |

The CC0 pack "Arms 01" adds realistic arm shape targets (upper arm, lower arm, wrist, armpit) [15].

### 4.4 Other parametric models

- **Anny** (NAVER LABS Europe): code "licensed under the Apache License, Version 2.0". It "relies on MakeHuman assets adapted from MPFB2 that are licensed under the CC0 1.0 Universal License". Its SMPL-X topology "can be downloaded for non-commercial use only" [25]. It uses the same mesh and shape space as MakeHuman, so it adds nothing for us.
- **MB-Lab**: "The default license for models generated by the software is AGPL 3" [23]. The repository is archived [24]. Rejected.

## 5. Anatomical muscle meshes

### 5.1 Écorché (Charleeh/ecorche) (downloaded)

- **URL:** https://github.com/Charleeh/ecorche [44]. The README links a demo at https://charleeh.github.io/ecorche/ [26] (not opened).
- **Author / owner:** GitHub user "Charleeh". The repository has one commit (`320805e06aee`, 2026-10-07) [27].
- **License:** the model is under "Creative Commons Attribution-ShareAlike 4.0 International (CC BY-SA 4.0)"; the code is MIT. "The model is a derivative of BodyParts3D (© The Database Center for Life Science, CC BY 4.0) and Z-Anatomy (Gauthier Kervyn, CC BY-SA 4.0)" [45][46].
- **Download without login:** yes. `ecorche.glb` returned HTTP 200 with Content-Length 14,314,536; `ecorche.meshopt.glb` 6,004,016; `ecorche.structures.json` 96,243.
- **Format:** GLB with `KHR_mesh_quantization` (int16 positions in 0.1 mm units, root scale 0.0001), plus a copy with `EXT_meshopt_compression` for the web [26].
- **Polycount:** stated "486,005 vertices, 984,688 triangles" in 634 named meshes [26]; measured the same. Muscles: 362 meshes (203 superficial, 159 deep), 358,236 vertices, 729,904 triangles. Skeleton: 272 meshes, 127,769 vertices.
- **Structure:** one named node per structure. Each node has `extras` with name, layer, side, source, and FMA ID [26]. Muscle heads are separate meshes (for example, three deltoid parts; clavicular, sternocostal, and abdominal parts of pectoralis major; long and short heads of biceps). Attributes are POSITION, NORMAL, and COLOR_0 only: no UVs, no skin, no rig, no morph targets. The left half mirrors the right half [26].
- **Pose:** anatomical position, arms at the sides, faces +Z, Y up, soles on y = 0 [26]. Our render confirms it.
- **Downloaded to:** `research/asset-candidates/ecorche/` (`ecorche.glb`, `ecorche.meshopt.glb`, `ecorche.structures.json`, `LICENSE.md`, `ATTRIBUTION.md`, `preview-render-front-side-back-34.png`). Bounding box about 0.648 × 1.710 × 0.262 m.
- **Sample muscles (left side, vertices / triangles):** pectoralis major, sternocostal part 1,599 / 3,198; deltoid, clavicular part 466 / 984; biceps brachii, long head 320 / 636; rectus abdominis 8,002 / 16,000; latissimus dorsi 8,005 / 16,000; rectus femoris 1,277 / 2,558.
- **Fitness:** this is the best segmentation found. Each muscle can be scaled, inflated along its normals, or tinted. Borders between neighbours exist as real geometry. Limits: the build is an average adult male (from the BodyParts3D base), not a bodybuilder. There is no skin. There are no UVs, so striations need triplanar or procedural shading or generated UVs. Fibre directions are not stored. The project is new and has one author. Share-alike applies to any modified mesh that we ship.

![Écorché render: front, side, back, 3/4](asset-candidates/ecorche/preview-render-front-side-back-34.png)

### 5.2 BodyParts3D 4.0, DBCLS (downloaded)

- **URL:** https://dbarchive.biosciencedbc.jp/en/bodyparts3d/download.html [28].
- **Author / owner:** Database Center for Life Science (DBCLS). Paper: Mitsuhashi N, Fujieda K, Tamura T, Kawamoto S, Takagi T, Okubo K. *Nucleic Acids Research* 2009;37:D782–D785 [37][38].
- **License:** the page (last updated 2025/02/27) says: "The license for this database is specified in the Creative Commons Attribution 4.0 International." Required credit: "BodyParts3D, © The Database Center for Life Science licensed under CC Attribution 4.0 International" [29]. **Conflict:** the 2013 OBJ file headers still say "Creative Commons Attribution-Share Alike 2.1 Japan" [31].
- **Download without login:** yes. `isa_BP3D_4.0_obj_99.zip` returned HTTP 200, 142,903,898 B; `partof_BP3D_4.0_obj_99.zip` 64,888,505 B [28][34]. The description page says "Need for user registration: Not available" [30].
- **Format:** one OBJ per part (`FJxxxx.obj`), with normals and no UVs. Units are mm [35]. Each OBJ header holds the file ID, the FMA concept ID, the English name, and the bounds (checked in the files).
- **Polycount:** the release note states 1,651 elemental representations [33]. Measured IS-A set: 2,234 OBJ files, 4,209,773 vertices, 6,681,030 faces. Muscles: 361 files, 1,596,530 vertices, 2,236,432 faces. Skin (`FJ2810.obj`): 102,467 vertices, 203,382 faces, box 666.9 × 292.0 × 1,719.5 mm.
- **Structure:** separate parts; muscle heads are split. **Missing in 4.0:** latissimus dorsi and rectus abdominis (no entry in either parts list; I checked). Internal oblique and transversus abdominis are also missing (slice finding).
- **Pose:** upright, arms at the sides [35].
- **Body basis:** the model was built on the TARO voxel model from 2 mm MRI of a male volunteer. The paper cites TARO as a "Japanese adult male … of average height and weight" [38]. So the build is average, not a bodybuilder.
- **Downloaded to:** `research/asset-candidates/bodyparts3d/` (736 MB on disk: PART-OF zip kept, both sets extracted, IS-A zip deleted).
- **Fitness:** an authoritative CC BY source of separate, named muscles. It is heavy, lacks the lats and rectus abdominis, and has no UVs. Use Écorché unless share-alike blocks it.

### 5.3 Z-Anatomy (downloaded, FBX)

- **URL:** https://github.com/LluisV/Z-Anatomy (Unity app with FBX files) [39]; https://github.com/Z-Anatomy/Models-of-human-anatomy (Blender template) [41]; https://www.z-anatomy.com/ [42].
- **Author / owner:** Gauthier Kervyn (design, 3D, anatomy), Marcin Zielinski (Blender add-on), Lluís Vinent Juanico (Unity). The original model is credited to Kousaku Okubo (BodyParts3D) [39][41].
- **License:** "This work is licensed under a Creative Commons Attribution-ShareAlike 4.0 International License" [39]. "All the code and content shared by 'Z-Anatomy' is under Creative Commons Attribution-ShareAlike 4.0 International License" [41]. **Flag:** the Z-Anatomy license document lists some reference models under NC licenses (inner ear "CC-BY-NC-SA 4.0", kidney "CC-BY-NC 4.0") [40]. They are not muscles, but a whole-file copy can include them.
- **Download without login:** yes. `MuscularSystem100.fbx` returned HTTP 200, 37,343,180 B. The Blender template `Z-Anatomy.zip` returned 200, 86,734,957 B [39][41]. The Google Drive folder also downloads without login [43].
- **Format:** FBX (Unity repository) and .blend (template). The project offers no glTF or OBJ.
- **Polycount:** not stated. Measured `MuscularSystem100.fbx` (three.js FBXLoader): 686 meshes, 2,323,591 triangles, 1,164,683 unique positions; about 470 muscle meshes and 210 connective-tissue meshes (name heuristic); 94 of 686 meshes have UVs. `Regions_of_human_body100.fbx`: a skin split into 301 regional patches, 69,461 vertices, 136,109 triangles.
- **Structure:** separate muscle meshes, left and right objects. It includes the latissimus dorsi and transversus abdominis.
- **Pose:** the BodyParts3D standing pose.
- **Downloaded to:** `research/asset-candidates/z-anatomy-fbx/` (40 MB). Box 67.08 × 170.11 × 26.86; [INFERENCE] units are cm.
- **Fitness:** it fills the BodyParts3D gaps, but it is heavy, FBX-only, CC BY-SA, and an average build. Écorché already merges the needed parts.

### 5.4 NIH 3D (downloaded, four entries)

Downloads use `https://3d.nih.gov/api/download?...` and returned HTTP 200 without login. A dialog says that a download means agreement with the site terms [53].

| Entry | License (page badge) | File (size) | Measured | Notes |
|---|---|---|---|---|
| 3DPX-012628 / 3DPX-012629, Visible Human Male left / right arm muscles [51][52] | "CC-BY" (links CC BY 4.0) | `3dp_nlmvhm_larm_0-repaired-nih3d.glb` (13,573,004 B); `3dp_nlmvhm_rarm-repaired-nih3d.glb` (5,273,188 B) | 484,694 v; 188,240 v | One merged mesh per arm, no names. Folder `nih3d-vhm-arm-muscles/`. |
| 3DPX-023209, Visible Human Male bust [54] | "CC-BY" | `3dp_vhmbust-nih3d.glb` (40,194,400 B) | 1,425,268 v; 498,902 tris; box 0.53 × 0.348 × 0.35 | Half skin, half muscles, one merged mesh. Folder `nih3d-vhm-bust/`. |
| 3DPX-021016, HRA "Skin, Male" [56] | "CC-BY" | `3d-vh-m-skin.glb` (19,901,928 B) | 414,594 v; 829,184 tris; box 1.043 × 1.824 × 0.326 m | Average whole-body skin. The "Body, Male" set (3DPX-021022) has no skeletal muscle system [55]. Folder `nih3d-hra-male/`. |
| 3DPX-022818, Artec 3D torso scan [57] | "CC-BY" badge, but the text says "Creative Commons Attribution 3.0 Unported" | `torso-nih3d.glb` (8,394,668 B) | 299,732 v; 100,000 tris; box 466.1 × 297.4 × 515.7 | Lean torso scan, no segmentation, license wording conflicts. Folder `nih3d-artec-torso/`. |

Rejected for NC/ND licenses: 3DPX-001774 "CC-BY-NC-SA" and 3DPX-003410 "CC-BY-NC-ND" [58][59]. A search for "muscle" gave 79 results, mostly molecules, and no full-body segmented muscle model [60].

### 5.5 GitHub viewers and mirrors (not downloaded)

- **ashemag/human-atlas:** a viewer for all BodyParts3D parts. Code MIT; data "CC BY 4.0". It uses custom binary chunks, not glTF, and adds no new geometry [47].
- **JohanBellander/BodyExplorer:** a muscle GLB from BodyParts3D (401 parts) and Z-Anatomy (66 parts), "decimated to ~4000 faces each" (`public/anatomy.glb`, 25,133,568 B). It has no LICENSE file; the README says the code is MIT and the data follows the source licenses [48]. Écorché supersedes it.
- **Kevin-Mattheus-Moerman/BodyParts3D:** an STL mirror of release 3.0 under CC BY-SA 2.1 JP [49]. Old.
- **dbcls/bp3d:** server code, no newer meshes [50].

### 5.6 Rejected

- **Open3DModel:** the pages state "License: Personal use or Education" (IDs 14500 "Bodybuilder", 180078, 180062). ID 349802 states both "CC-Attribution NonCommercial" and "Personal use or Education". The models are user uploads with no stated provenance, and downloads pass through an ad gateway [61]–[65].
- **Open Anatomy Project:** six regional atlases; no full-body muscular system [66].

## 6. Statue and écorché scans

### 6.1 SMK Herakles Lansdowne, plaster cast KAS224 (downloaded)

- **URL:** https://open.smk.dk/artwork/image/KAS224; API record [67].
- **Author / owner:** Statens Museum for Kunst (SMK), Royal Cast Collection. SMK says that most of its 3D models were made with Scan the World [77].
- **License:** the API gives `rights` = "https://creativecommons.org/publicdomain/mark/1.0/" and `public_domain` = true [67]. The SMK API page defines this as "The artwork is out of copyright (and SMK data on the artwork, including photos, can be used freely)" [76]. The 3D page says: "With these files you can 3D print your own favorite sculpture and freely use the artworks in your own projects" [77].
- **Download without login:** yes. The small STL returned HTTP 200, 20,001,384 B. The full STL is 200,002,484 B.
- **Format:** binary STL, no texture, no UVs.
- **Polycount:** not stated. Measured (small STL): 400,026 triangles, about 200,000 shared vertices.
- **Structure:** one fused surface, including the club, the lion skin, and the plinth.
- **Pose:** contrapposto. The right hand holds a club on the shoulder. The lion skin hangs from the left hand to the base (our render).
- **Downloaded to:** `research/asset-candidates/smk-herakles-lansdowne/kd17cz49m_KAS224_small.stl` and `preview-render.png`. Box 55.0 × 45.6 × 130.0 units, Z up. The real cast is 208 cm tall [67].
- **Fitness:** strong classical musculature (clear abs, obliques, pecs), but an idealized body, not a bodybuilder. No segmentation. Use it as a reference, or as a "classical ideal" comparison.

![SMK Herakles Lansdowne render](asset-candidates/smk-herakles-lansdowne/preview-render.png)

### 6.2 SMK Doryphoros, plaster cast KAS11 (downloaded)

- **URL:** https://open.smk.dk/artwork/image/KAS11; Sketchfab copy [97].
- **License:** the API gives Public Domain Mark 1.0 and `public_domain` = true [74]. The Sketchfab API label is "CC0 Public Domain" [97]. The SMK Sketchfab collection says: "The 3D models carry a Public Domain license and can be downloaded, repurposed, remixed, printed by anyone" [79].
- **Download without login:** yes from the SMK API (GLB HTTP 200, 4,954,404 B; STL 13,759,184 B). The Sketchfab download needs a login.
- **Measured:** 137,585 vertices, 275,182 triangles, one mesh, no texture. Box 46.1 × 130.0 × 47.5 units, Y up. The cast is 213 cm tall.
- **Pose:** contrapposto, with a tree-stump support and a rectangular plinth (our render).
- **Downloaded to:** `research/asset-candidates/smk-doryphoros/pc289q07k_smk-doryphoros.glb` and `preview-render.png`.
- **Fitness:** an athletic classical canon. It is a quick test mesh for a viewer or shader. It cannot morph per muscle.

### 6.3 Francavilla écorché statuette (downloaded)

- **URL:** https://zenodo.org/records/21376387 (mirror) [93]; original Sketchfab model [96][146]. Two sibling statuettes exist [94][95][144][145].
- **Author / owner:** Virtual Museums of Małopolska (Sketchfab user WirtualneMuzeaMalopolski). The statuette is by Pierre Franqueville (Pietro Francavilla), Jagiellonian University Museum [93][144].
- **License:** the Sketchfab API gives "CC0 Public Domain" with "Credit is not mandatory. Commercial use is allowed." Zenodo shows `cc-zero`. The GLB `asset.extras` say "CC0-1.0" [93][146]. The museum's own page was not checked (JavaScript app).
- **Download without login:** yes from Zenodo (HTTP 200, 15,436,344 B). The Sketchfab download returned 401.
- **Measured:** 181,284 vertices, 303,228 triangles in 3 primitives (split at the 16-bit index limit, not at muscles). PBR textures: base colour, metallic-roughness, normal.
- **Pose:** a twisting pose. One arm is raised and holds drapery or a flayed skin. One foot rests on a stump. The figure stands on a large rectangular base (our render).
- **Downloaded to:** `research/asset-candidates/francavilla-ecorche-wmm/9a3f4fef02af4be3a3cd105aea218dc5.glb` and `preview-render.png`. World height about 0.756 units.
- **Fitness:** muscles read very clearly, and the license is CC0. But the pose is fixed and dramatic, the mesh is fused, there is no skin, and the anatomy is 16th-century art. Reference only.

![Francavilla écorché render](asset-candidates/francavilla-ecorche-wmm/preview-render.png)

### 6.4 Other SMK casts (not downloaded)

All these files returned HTTP 200 without login under `https://api.smk.dk/api/v1/download-3d/` [74]:

- Belvedere Torso, KAS402 (fragment): 51,021,584 B.
- Borghese Gladiator, KAS499: 100,000,384 B. **Flag:** the API says `public_domain` = false, with rights "https://www.smk.dk/en/section/use-of-smk-material/" [75]. The SMK upload on MyMiniFactory shows "PDM" [81]. [INFERENCE] The API record looks like a data error.
- Dying Gaul, KAS1312 (small STL): 20,001,584 B.
- Discobolus, KAS1074: 100,000,084 B.
- Laocoön, KAS385 (small STL): 20,005,084 B.

All are fused scans with bases. SMK has no full Farnese Hercules and no écorché in its 3D set (only a Farnese head, KAS701).

### 6.5 Scan the World on MyMiniFactory (not usable)

- **Objects checked:** Farnese Hercules (Cairo fragment), Flayed Man (Houdon's écorché, Louvre), Gladiateur Borghese (Louvre), Dying Galatian (Capitoline), Discobolus (British Museum), Laocoön (Vatican), Hercules Épitrapézios (Louvre) [85]–[91].
- **License:** each page shows "BY-NC-SA" and links to CC BY-NC-SA 4.0. The badges include "You may not use the object for commercial purposes" [85]–[91]. Not usable under our rules.
- **Download:** plain `curl` gets HTTP 403 (Cloudflare). With a browser User-Agent and no cookies, `/download/<id>` redirects to a signed STL URL. The API needs a key or OAuth [92]. The Zenodo "3DBigDataSpace" mirrors are also `cc-by-nc-sa-4.0` [98]–[101].

### 6.6 Other sources

- **Three D Scans (Oliver Laric):** about 150 scans. The live site states no usage terms. A 2017 snapshot said "All scans can be downloaded and used without copyright restrictions" [68]–[70]. Zipped OBJ/STL files download without login (for example, Hermes, 38,253,168 B) [71]. There is no Farnese or Borghese. License unclear.
- **Smithsonian, "The Dying Tecumseh":** "Restrictions & Rights: CC0". GLB derivatives with 150,000 faces exist. The pose is reclining. At test time, `3d-api.si.edu` served an expired TLS certificate [102][103]. Low fit.
- **Mia Doryphoros and Puget "Hercules as Archer":** Zenodo shows `cc-zero` [104]–[106]. For the Doryphoros, the current Sketchfab license is [UNVERIFIED] (empty license object).
- **Cleveland Museum of Art "1987.2 Hercules":** "CC0 Public Domain", but a tiny bronze (14.5 × 8 cm) and Sketchfab-only [107].
- **Warning:** Zenodo/Objaverse mirrors can show a license that differs from the current Sketchfab license. Examples: geoffreymarchal's Borghese and Discobolus show `cc-by-4.0` on Zenodo, but Sketchfab now shows "Standard" or NC [108][109].

## 7. General libraries and Sketchfab

### 7.1 Sketchfab (login required)

The search API works without login. Downloads do not: "Downloading a model requires the user to be authenticated with a Sketchfab account" [140]. An unauthenticated `GET /v3/models/<uid>/download` returned `401 {"detail":"Authentication credentials were not provided."}` for all 11 tested models [157]. I repeated the test for one model. The structure of each model below comes from thumbnails and descriptions only [UNVERIFIED].

| Model | Author (year) | API license | Vertices / faces (API) | Notes |
|---|---|---|---|---|
| "bodybuilder base mesh" [147] | Rouker (2022) | "CC Attribution" | 11,835 / 23,596 | Skin; tags "bodyscan", "Bodybuilder"; deep pec, ab, and serratus grooves in the thumbnail. Lightest bodybuilder base. |
| "Male base muscular anatomy" [150] | CharacterZone (2022) | "CC Attribution" | 18,855 / 37,648 | Skin with a normal map; T-pose; "ready for bodybuilding poses and rig". |
| "Bulky Male Bodybuilder Basemesh" [149] | ZBIGE (2026) | "CC Attribution" | 136,635 / 273,266 | Sculpt with shorts; A-pose-like. |
| "Male Human Strong Body - Free / Downloadable" [151] | orthovasky (2018) | "CC Attribution" | 630,125 / 1,260,230 | Nude sculpt; A-pose; heavy. |
| "Posed Bodybuilder" [152] | samuel_taiwo (2026) | "CC Attribution" | 135,588 / 271,136 | Textured, trunks, fixed posing stance. |
| "Male Full Body Ecorche" [141] | diegoluga (2016) | "CC Attribution" | 320,785 / 640,470 | Écorché sculpt with painted fibres; athletic, not bodybuilder mass. |
| "Male Body Muscular System - Anatomy Study" [142] | ruslangadzhiev (2016) | "CC Attribution" | 106,133 / 210,498 | Muscular-system sculpt; A-pose. |
| "Myology" [143] | Z-Anatomy (2021) | "CC Attribution-ShareAlike" | 2,894,527 / 5,711,831 | BodyParts3D-based; very heavy. |
| "Anatomical figure - écorché" (3 scans) [144]–[146] | Virtual Museums of Małopolska (2020) | "CC0 Public Domain" | 141,566–151,610 v | One is mirrored on Zenodo (section 6.3). |

Flagged or rejected: "Anatomy Study - Male Bodybuilder" says "CC Attribution" in the API, but its description asks for "educational / non-commercial purposes only" [153]. Two 3dUVpro models say they were "generated using the free Mesha AI Toolkit", so their anatomy and provenance are unreliable [154][155]. One model is stylized [156]; one has no head or hands [148].

### 7.2 Quaternius "Universal Base Characters", Superhero Male (downloaded)

- **URL:** https://quaternius.com/packs/universalbasecharacters.html [130]; itch.io [132].
- **License (conflict):** the pack page says "License CC0". The itch.io page says "Creative Commons Zero v1.0 Universal". The zip's `License_Standard.txt` says "CC0 1.0 Universal". But https://quaternius.com/license.html now says "Quaternius Asset License (QAL) v1.0 … Last updated: 8/28/2026". QAL forbids redistributing "the Assets themselves" and says "the version in effect at the time you obtained the Assets governs your use of them". QAL allows a "completed Product that merely incorporates the Assets" [130]–[132].
- **Download without login:** yes, through the itch.io "No thanks, just take me to the downloads" flow; zip 128,968,391 B [132][133].
- **Measured:** `Superhero_Male_FullBody.gltf`: 8,483 vertices, 14,318 triangles, 3 meshes, 1 skin, 7 textures (including a normal map). Box about 1.86 × 1.82 × 0.29 ([INFERENCE] metres). T-pose.
- **Downloaded to:** `research/asset-candidates/quaternius-universal-base-characters/` (9.6 MB; the zip was deleted).
- **Fitness:** a stylized game "superhero" body. Muscle detail is mostly in the normal map. No segmentation. Treat it as QAL, not CC0.

### 7.3 Poly Pizza "Male base" (downloaded)

- **URL:** https://poly.pizza/m/eWGDnQ0jzmH; author Артур Мигранов; license "CC-BY 3.0" [126].
- **Download:** HTTP 200, 882,032 B, no login. **Measured:** 24,461 vertices, 48,916 triangles, one mesh, A-pose. Box 11.685 × 20.741 × 3.770 (units unknown).
- **Downloaded to:** `research/asset-candidates/polypizza-male-base/male-base_643af51e.glb`.
- **Fitness:** a neutral body, not muscular. The other Poly Pizza hits ("Buff man", "Fitness Character", "Buff Guy") are low-poly cartoons (576–5,144 triangles) [123]–[129].

### 7.4 Other libraries (not downloaded)

- **three.js examples:** no muscular human. `Xbot`, `Soldier`, `Michelle`, and "Samba Dancing" come from Mixamo, so Adobe terms apply. LeePerrySmith is a head under CC BY 3.0. RobotExpressive is a CC0 robot. Nefertiti is CC BY-NC [110]–[121].
- **Mixamo:** "available free for anyone with an Adobe ID"; Adobe terms, not a CC license [122].
- **Kenney:** "License Creative Commons CC0"; cartoon characters [134]–[136].
- **BlendSwap:** a license per model; the download page says "Sign in to download" [158]–[160].
- **OpenGameArt:** "Muscleboy" (CC0, a boxing-dummy torso), "Big Guy" (CC-BY 3.0, a stylized brute), "Male body subD mesh" (CC-BY-SA 3.0, a neutral quad base) [161]–[164].
- **Renderpeople free models:** custom terms; clothed scans; zips of 395–468 MB [165].
- **3D Scan Store free scan:** the terms forbid commercial use of free downloads without permission [166][167].
- **Poly Haven:** "Our assets are all licensed as CC0"; the only humans are a robed statue and a marble bust [168][169].

## 8. Downloaded files

> Note (lead): these downloads were deleted from the project after the evaluation. The app uses none of them; the figure is procedural (see `docs/modeling.md`).

All folders are under `research/asset-candidates/`. Total size on disk: 962 MB (BodyParts3D is 736 MB of this).

| Folder | Files | Size | Measured | Bounding box | License |
|---|---|---|---|---|---|
| `makehuman/` | `base.obj`; `targets/*.target` (25); generated `makehuman-maxmuscle-avgweight-ideal-localmuscle.obj`; preview PNG | 1,749,303 B; 2.4 MB; 1,547,888 B | 19,158 v total; body 13,380 v / 13,378 quads | base body 9.93 × 16.66 × 4.23; variant C 12.40 × 17.30 × 4.74 (dm, inferred) | CC0 [1] |
| `makehuman-community-malemuscles/` | `Malemusclescolor.jpg` (8192²), `Malemusclesnormal.jpg` (4096²), `Malemuscles.mhmat` | 17,036,357 B; 12,057,753 B; 1,030 B | textures only | n/a | CC-BY [19] |
| `ecorche/` | `ecorche.glb`, `ecorche.meshopt.glb`, `ecorche.structures.json`, `LICENSE.md`, `ATTRIBUTION.md`, preview PNG | 14,314,536 B; 6,004,016 B; 96,243 B | 486,005 v / 984,688 tris; 634 meshes | 0.648 × 1.710 × 0.262 m | CC BY-SA 4.0 [45] |
| `bodyparts3d/` | `partof_BP3D_4.0_obj_99.zip`, extracted PART-OF (1,258 OBJ) and IS-A (2,234 OBJ) sets, parts lists | 64,888,505 B zip; 736 MB total | IS-A 4,209,773 v; muscles 1,596,530 v; skin 102,467 v | whole IS-A set 666.9 × 292.0 × 1,729.7 mm | CC BY 4.0 (page) [29] |
| `z-anatomy-fbx/` | `MuscularSystem100.fbx`, `Regions_of_human_body100.fbx` | 37,343,180 B; 4,433,260 B | 2,323,591 tris (muscles); 69,461 v (skin regions) | 67.08 × 170.11 × 26.86 (cm, inferred) | CC BY-SA 4.0 [39] |
| `nih3d-vhm-arm-muscles/` | left and right arm GLBs | 13,573,004 B; 5,273,188 B | 484,694 v; 188,240 v | 2.985 × 7.568 × 3.379; 3.348 × 7.174 × 3.494 (units unknown) | CC BY [51][52] |
| `nih3d-vhm-bust/` | `3dp_vhmbust-nih3d.glb` | 40,194,400 B | 1,425,268 v | 0.53 × 0.348 × 0.35 | CC BY [54] |
| `nih3d-hra-male/` | `3d-vh-m-skin.glb` | 19,901,928 B | 414,594 v / 829,184 tris | 1.043 × 1.824 × 0.326 m | CC BY [56] |
| `nih3d-artec-torso/` | `torso-nih3d.glb` | 8,394,668 B | 299,732 v / 100,000 tris | 466.1 × 297.4 × 515.7 | CC BY (wording conflict) [57] |
| `smk-herakles-lansdowne/` | `kd17cz49m_KAS224_small.stl`, preview PNG | 20,001,384 B | 400,026 tris | 55.0 × 45.6 × 130.0 (Z up) | PDM 1.0 [67] |
| `smk-doryphoros/` | `pc289q07k_smk-doryphoros.glb`, preview PNG | 4,954,404 B | 137,585 v / 275,182 tris | 46.1 × 130.0 × 47.5 (Y up) | PDM 1.0 / CC0 [74][97] |
| `francavilla-ecorche-wmm/` | `9a3f4fef02af4be3a3cd105aea218dc5.glb`, preview PNG | 15,436,344 B | 181,284 v / 303,228 tris | local 17.7 × 30.4 × 16.0; world height 0.756 | CC0 [93][146] |
| `quaternius-universal-base-characters/` | Superhero Male glTF, bin, FBX, textures, `License_Standard.txt` | 9.6 MB | 8,483 v / 14,318 tris | 1.86 × 1.82 × 0.29 | CC0 vs QAL [130][131] |
| `polypizza-male-base/` | `male-base_643af51e.glb` | 882,032 B | 24,461 v / 48,916 tris | 11.685 × 20.741 × 3.770 | CC-BY 3.0 [126] |

## 9. Visual references: Wikimedia Commons photos

No photo was downloaded. A research slice viewed each image as an in-memory thumbnail and confirmed the license and the author on the file page. I re-checked six licenses through the Commons API (#1, #7, #8, #9, #13, plate A). Key: STR = striations, VAS = vascularity, SEP = separation, COND = conditioning (leanness), FULL = fullness, FLAT = less full or less dry contrast.

| # | File page | Author (as on page) | License (as on page) | Region / pose | Concepts | Note |
|---|---|---|---|---|---|---|
| 1 | [Phil Heath Kai Greene.JPG](https://commons.wikimedia.org/wiki/File%3APhil_Heath_Kai_Greene.JPG) [170] | Kevin Laval | CC0 | Two pros, full front, hands on hips, Mr. Olympia 2012 | STR (quads), SEP, VAS, FULL, COND | Best single reference: sharp, 5184 × 3456, CC0. Strong tan and oil shine. |
| 2 | [SBFF SM 2019 … Arne Lundell.jpg](https://commons.wikimedia.org/wiki/File%3ASBFF_SM_2019_Bodybuilding_%2B95_kg_Winner%2C_Arne_Lundell.jpg) [171] | Rikard Strömmer | CC BY-SA 4.0 | Full body, front double biceps, stage | SEP, VAS, COND | Clean light; low resolution (672 × 1187 crop). |
| 3 | [Behnam Navid.jpg](https://commons.wikimedia.org/wiki/File%3ABehnam_Navid.jpg) [172] | BehnamNavid65 | CC BY-SA 4.0 | Full body, front pose, stage | SEP, STR (quads), VAS, COND | Sharp leg detail. [INFERENCE] Uploader may be the athlete; "own work" is doubtful. |
| 4 | [DF-SC-01-04792 … Northern Japan Bodybuilding Championships.jpeg](https://commons.wikimedia.org/wiki/File%3ADF-SC-01-04792_Shawn_Wolfe_and_Derrick_Anderson_strike_poses_during_the_finals_of_the_9th_annual_Northern_Japan_Bodybuilding_Championships.jpeg) [173] | US Army Photo by Scene Camera Operator: SSGT Milo E. Ware, Jr. | Public domain | Two men, most-muscular variants, stage, 1999 | SEP, VAS, COND | Red colour cast. |
| 5 | [Team Malmstrom members compete … 150508-F-GF295-053.jpg](https://commons.wikimedia.org/wiki/File%3ATeam_Malmstrom_members_compete_in_bodybuilding_competition_150508-F-GF295-053.jpg) [174] | Airman 1st Class Collin Schmidt | Public domain | Full body, arm overhead, abs and legs, stage | COND, SEP (abs, serratus, quads) | Hard spotlight; small figure in a large frame. |
| 6 | [US Navy 021105-N-1288N-016 Darrell A. Lewis ….jpg](https://commons.wikimedia.org/wiki/File%3AUS_Navy_021105-N-1288N-016_Darrell_A._Lewis_strikes_one_of_the_poses_he_used_in_competition.jpg) [175] | U.S. Navy photo by Journalist 2nd Class Jeffrey Nichols. | Public domain | Most-muscular, gym | SEP, VAS (forearms), COND (moderate) | On-camera flash; clear skin texture. |
| 7 | [US Navy 060318-N-9869B-074 … Andrew Frazier ….jpg](https://commons.wikimedia.org/wiki/File%3AUS_Navy_060318-N-9869B-074_Engineman_2nd_Class_Andrew_Frazier_flexes_his_muscles_during_the_GNC_-_NPC_World_Gym_Classic_San_Diego_Bodybuilding_%5E_Figure_Championships.jpg) [176] | U.S. Navy Photo by Journalist 2nd Class Alexis R. Brown | Public domain | Double-biceps variant, stage | VAS (biceps, forearms, delts), SEP, COND | Good arm-vein example; warm light. |
| 8 | [NPC Wayne NJ.jpg](https://commons.wikimedia.org/wiki/File%3ANPC_Wayne_NJ.jpg) [177] | Dskhara1 | CC BY-SA 4.0 | Front double biceps, outdoors, posing trunks | SEP, STR (quads), VAS, COND | Daylight skin texture; not a stage. |
| 9 | [Vascular (7453726488).jpg](https://commons.wikimedia.org/wiki/File%3AVascular_%287453726488%29.jpg) [178] | istolethetv from Hong Kong, China | CC BY 2.0 | Torso and abs close-up, stage | VAS (lower abdomen), SEP, COND | Clear lower-ab veins; a little soft. |
| 10 | [Torso (7452190414).jpg](https://commons.wikimedia.org/wiki/File%3ATorso_%287452190414%29.jpg) [179] | istolethetv from Hong Kong, China | CC BY 2.0 | Torso, relaxed front | COND, VAS, FLAT (contrast) | Lean but moderate mass. |
| 11 | [Arms race (7452180634).jpg](https://commons.wikimedia.org/wiki/File%3AArms_race_%287452180634%29.jpg) [180] | istolethetv from Hong Kong, China | CC BY 2.0 | Crab most-muscular line-up | SEP (delts, traps, triceps), VAS, FULL | Only the nearest athlete is sharp. |
| 12 | [Face the music (7453727096).jpg](https://commons.wikimedia.org/wiki/File%3AFace_the_music_%287453727096%29.jpg) [181] | istolethetv from Hong Kong, China | CC BY 2.0 | Back, relaxed rear stance | SEP (lats, teres, erectors) | Weak: soft focus, orange light. |
| 13 | [Ferenci Marek, póza č. 6.jpg](https://commons.wikimedia.org/wiki/File%3AFerenci_Marek%2C_p%C3%B3za_%C4%8D._6.jpg) [182] | Ladislav Ferenci | CC BY-SA 3.0 | Back double biceps, B&W studio | SEP (traps, infraspinatus, teres, erectors, hamstrings, calves), COND | Clearest back view. Flag: watermark "© 2011 Katarina Acél". |
| 14 | [Ferenci Marek, póza č. 7.jpg](https://commons.wikimedia.org/wiki/File%3AFerenci_Marek%2C_p%C3%B3za_%C4%8D._7.jpg) [183] | Ladislav Ferenci | CC BY-SA 3.0 | Rear, hands on hips, B&W studio | SEP (back, hamstrings, calves), COND | Same watermark flag. |
| 15 | [Mikhail Volinkin prep6.jpg](https://commons.wikimedia.org/wiki/File%3AMikhail_Volinkin_prep6.jpg) [184] | Mikhail Volinkin1 | CC0 | Upper body, gym, shorts | VAS (delts, biceps, forearms), FULL, SEP | Good shoulder veins. [INFERENCE] Uploader may be the athlete. |
| 16 | [Сhampionship of the Kaliningrad area on bodybuilding 15.jpg](https://commons.wikimedia.org/wiki/File%3A%D0%A1hampionship_of_the_Kaliningrad_area_on_bodybuilding_15.jpg) [185] | Александр Подгорчук / "Клопс" | CC BY-SA 4.0 | Abdominals-and-thigh pose, stage | SEP (abs, serratus, intercostals), VAS, COND | Small (800 × 1200); logo watermark. |
| 17 | [Сhampionship of the Kaliningrad area on bodybuilding 24.jpg](https://commons.wikimedia.org/wiki/File%3A%D0%A1hampionship_of_the_Kaliningrad_area_on_bodybuilding_24.jpg) [186] | Александр Подгорчук / "Клопс" | CC BY-SA 4.0 | Upper back close-up, stage | SEP (rear delts, infraspinatus, teres, traps), VAS | Sharp; small; watermark. |
| 18 | [Ray Buchanan bodybuilding.jpg](https://commons.wikimedia.org/wiki/File%3ARay_Buchanan_bodybuilding.jpg) [187] | Playray | CC BY-SA 4.0 | Side chest, stage | STR (faint, pec near armpit), SEP, COND | Text overlay. [INFERENCE] Uploader may be the athlete. |
| 19 | [Basra bodybuilding competition DVIDS288960.jpg](https://commons.wikimedia.org/wiki/File%3ABasra_bodybuilding_competition_DVIDS288960.jpg) [188] | Staff Sgt. Adelita Mead | Public domain | Front pose, shorts, gym stage | FLAT (contrast), COND (moderate) | Amateur, not stage-ready. Contrast only. |

Public-domain anatomy plates for fibre directions (Henry Vandyke Carter, Gray's *Anatomy*, 1918 edition scans; license "Public domain"):

| Plate | File page | Use |
|---|---|---|
| A | [Gray410.png](https://commons.wikimedia.org/wiki/File%3AGray410.png) [190] | Fan-shaped fibres of pectoralis major; deltoid fibre direction. |
| B | [Gray409.png](https://commons.wikimedia.org/wiki/File%3AGray409.png) [189] | Trapezius, latissimus dorsi, rear deltoid, rhomboids. |
| C | [Gray430.png](https://commons.wikimedia.org/wiki/File%3AGray430.png) [191] | Rectus femoris (bipennate), vastus lateralis and medialis, sartorius line. |
| D | [Gray432.png](https://commons.wikimedia.org/wiki/File%3AGray432.png) [192] | Thigh cross-section with intermuscular septa (where deep grooves sit). |

Gaps: no sharp Commons stage photo of a clearly "flat" or "spilled-over" physique was found. No sharp professional rear lat spread was found. Several Mr. Olympia 2008, Arnold Classic 2014/2016/2017, and other sets were rejected (far away, clothed, blurred, or not bodybuilding).

## 10. Recommendation

**Use the MakeHuman base mesh and targets (CC0) as the visible body.** It is the only candidate that is all of these at once:

1. Legally clean with no attribution or share-alike duty [1].
2. Downloadable without login [4].
3. A complete skin body with head, hands, feet, and UVs.
4. Light for a browser (13,380 vertices, 26,756 triangles).
5. Shipped with region-level muscle morphs (pecs, lats, V-taper, shoulders, upper arms, forearms, thighs, calves, abdominal tone) [6].

Build the "bodybuilder" from the male base, Muscle 100 %, ideal Proportions, and the local muscle targets (variant C). Keep the regional targets as separate morphs for "fullness". MPFB in Blender gives the same shapes with a rig, if the team needs one [9][12].

**Limits of this choice:**

- **Physique:** variant C is a bodybuilder-like silhouette, not a contest physique. Variant D overshoots into caricature. [INFERENCE] An artist pass (our own CC0 target) will be needed for a convincing stage look.
- **Separation:** there is no per-muscle geometry. Groove lines must come from an authored mask or normal map on the MakeHuman UVs, or from muscle borders projected from Écorché or BodyParts3D. [INFERENCE] Projection needs a registration step, because the builds and arm poses differ (MakeHuman A-pose, Écorché arms at the sides).
- **Striations:** no asset stores fibre directions. Author a direction field per region (Gray's plates [189]–[192] and the Écorché shapes help) and drive a shader or a normal map with it. At 13,380 vertices, striations must live in textures or shaders, not in geometry.
- **Veins:** no open vein maps were found, except the CC-BY "Malemuscles" painting, whose source is not stated [19]. Author vein paths and use photos #7, #9, and #15 as references.
- **Fullness:** the morphs exist, but they are artists' shape changes. They do not model glycogen, water, or any physiology. The app must label them as a visual impression.

**Use Écorché (CC BY-SA 4.0) for the anatomy layer only if the team accepts share-alike** [45]. It is the best source for an "under the skin" view and for per-muscle masks: 362 named muscle meshes, FMA IDs, 6 MB compressed. Its limits: an average build, no skin, no UVs, no fibre data, and a new single-author project. If share-alike is a blocker, use raw BodyParts3D 4.0 (CC BY 4.0 per its page) and accept the missing latissimus dorsi and rectus abdominis and the old CC BY-SA 2.1 JP file headers [29][31].

**Do not use:** Scan the World statues (NC) [85]–[91], MB-Lab (AGPL) [23], Open3DModel (personal or educational use only) [62], or Quaternius as "CC0" (the site now states QAL) [131]. The Sketchfab CC BY bodybuilders need a Sketchfab account [140]. If someone downloads them, check "bodybuilder base mesh" [147] and "Male base muscular anatomy" [150] first. None of them has muscle segmentation.

**Statue casts (SMK, Public Domain Mark):** legally clean, but fused, posed, and joined to props and plinths [67][74]. Use them only as references or for a "classical ideal" comparison.

**Honest summary:** no downloaded asset shows separation, striations, veins, and fullness by itself. MakeHuman gives a clean, light, morphable body. Écorché gives clean muscle labels under share-alike. The look of "dry", "crispy", "full", or "flat" must come from effects that the team authors.

## Sources

All URLs below were fetched during this research (2026-10-09/10). Types: license-page, asset-page, repository, documentation, publication (academic), forum. Sources 1–25, 26–27, 67, and 193–195 were checked directly; the others come from the research slices, and the key ones were re-checked (see section 1).

### MakeHuman, MPFB and other parametric bodies

1. MakeHuman LICENSE.md (license setup: AGPL code, CC0 assets, output). MakeHuman Team. 2020. <https://raw.githubusercontent.com/makehumancommunity/makehuman/master/LICENSE.md>. Type: license-page. Supports: Assets (base mesh, proxies, targets, textures, poses) are CC0 1.0; the project claims no rights over exports such as OBJ/FBX.
2. MakeHuman LICENSE.ASSETS.md. MakeHuman Team. n.d. <https://raw.githubusercontent.com/makehumancommunity/makehuman/master/LICENSE.ASSETS.md>. Type: license-page. Supports: Full CC0 1.0 Universal text for MakeHuman assets.
3. MakeHuman repository tree (master). MakeHuman Community (GitHub). n.d. <https://api.github.com/repos/makehumancommunity/makehuman/git/trees/master?recursive=1>. Type: repository. Supports: base.obj (1,749,303 B) and 1,280 plain-text .target files are in the public repo.
4. MakeHuman base mesh base.obj (raw download). MakeHuman Community. n.d. <https://raw.githubusercontent.com/makehumancommunity/makehuman/master/makehuman/data/3dobjs/base.obj>. Type: asset-page. Supports: HTTP 200 without login; Content-Length 1,749,303.
5. MakeHuman target caucasian-male-young.target (file header). MakeHuman Community (orig. Manuel Bastioni). 2020. <https://raw.githubusercontent.com/makehumancommunity/makehuman/master/makehuman/data/targets/macrodetails/caucasian-male-young.target>. Type: asset-page. Supports: Header: 'This asset was explicitly released as CC0 in september 2020'; target format = vertex index + offset.
6. MakeHuman modeling_modifiers.json. MakeHuman Community. n.d. <https://raw.githubusercontent.com/makehumancommunity/makehuman/master/makehuman/data/modifiers/modeling_modifiers.json>. Type: repository. Supports: Lists Muscle/Weight/Proportions macros and local muscle modifiers (torso-muscle-pectoral, torso-muscle-dorsi, upperarm-muscle, etc.).
7. MakeHuman releases (GitHub API). MakeHuman Community. 2024. <https://api.github.com/repos/makehumancommunity/makehuman/releases?per_page=5>. Type: repository. Supports: Latest release v1.3.0 published 2024-05-15 ('Body shapes library and bugfixes').
8. Modeling the body (MakeHuman documentation). MakeHuman Community. n.d. <https://static.makehumancommunity.org/makehuman/docs/modeling_the_body.html>. Type: documentation. Supports: Describes the Muscle, Weight and Proportions macro sliders.
9. MPFB2 LICENSE.md. MakeHuman Team. 2021. <https://raw.githubusercontent.com/makehumancommunity/mpfb2/master/LICENSE.md>. Type: license-page. Supports: MPFB code GPLv3; bundled assets CC0 1.0; no claim over exports.
10. MPFB2 README. MakeHuman Community. n.d. <https://raw.githubusercontent.com/makehumancommunity/mpfb2/master/README.md>. Type: repository. Supports: MPFB 2.x is a Blender human generator; needs Blender 4.2 or later.
11. MPFB: Getting started. MakeHuman Community. n.d. <https://static.makehumancommunity.org/mpfb/docs/getting_started.html>. Type: documentation. Supports: Install from the Blender extension platform; add the 'makehuman system assets' pack.
12. MPFB on Blender Extensions. Joel Palmius / Blender Foundation site. 2026. <https://extensions.blender.org/add-ons/mpfb/>. Type: asset-page. Supports: MPFB 2.0.17 (July 22nd, 2026); zip download HTTP 200 without login, 45,031,536 B.
13. MakeHuman asset packs. MakeHuman Community. 2026. <https://static.makehumancommunity.org/assets/assetpacks/index.html>. Type: asset-page. Supports: Lists CC0 and CC-BY asset packs, incl. 'Arms 01' realistic arm deformation targets and 'Skins 02' natural male skins.
14. makehuman_system_assets pack page. MakeHuman Community. n.d. <https://static.makehumancommunity.org/assets/assetpacks/makehuman_system_assets.html>. Type: asset-page. Supports: System skins and proxies (incl. male_muscle_13290) are CC0; zip 280,737,770 B, HTTP 200.
15. Arms 01 asset pack page. MakeHuman Community. n.d. <https://static.makehumancommunity.org/assets/assetpacks/arms01.html>. Type: asset-page. Supports: CC0 arm shape targets (Mindfront, Elvaerwyn); zip 210,241 B, HTTP 200.
16. Skins 02 asset pack page. MakeHuman Community. n.d. <https://static.makehumancommunity.org/assets/assetpacks/skins02.html>. Type: asset-page. Supports: CC0 natural male skins; zip 76,112,708 B, HTTP 200.
17. MPFB: Artistic tasks. MakeHuman Community. n.d. <https://static.makehumancommunity.org/mpfb/contributing/art.html>. Type: documentation. Supports: 'The bundled assets currently do not include any normal maps for skins.'
18. MPFB basemesh_vertex_groups.json. MakeHuman Community. n.d. <https://raw.githubusercontent.com/makehumancommunity/mpfb2/master/src/mpfb/data/mesh_metadata/basemesh_vertex_groups.json>. Type: repository. Supports: Base-mesh vertex groups are helpers, joints and Left/Mid/Right only; no muscle groups.
19. Malemuscles skin (user-contributed asset). 123guzhanhong123. 2020. <http://www.makehumancommunity.org/skin/malemuscles.html>. Type: asset-page. Supports: License 'CC-BY - Creative Commons Attribution'; muscle-diagram colour map + normal map for MakeHuman 1.1.x.
20. Eves Young Caucasian Male Muscular (user-contributed skin). jimlsmith9999. 2020. <http://www.makehumancommunity.org/skin/eves_young_caucasian_male_muscular.html>. Type: asset-page. Supports: License 'CC-BY'; description credits 3d.sk photo references (provenance flag).
21. BASESTRONG (user-contributed target). pppancho68. 2018. <http://www.makehumancommunity.org/target/basestrong.html>. Type: asset-page. Supports: 'SMOOTH STYLIZED MALE STRONG' large-modification target; License 'CC-BY'.
22. HarveyStomachMusclesV2 (user-contributed target). callharvey3d. 2016. <http://www.makehumancommunity.org/target/harveystomachmusclesv2.html>. Type: asset-page. Supports: Abdominal muscle target; License 'CC-BY'.
23. MB-Lab license.txt. Manuel Bastioni / MB-Lab. 2018. <https://raw.githubusercontent.com/animate1978/MB-Lab/master/license.txt>. Type: license-page. Supports: Database and generated models are AGPL 3 by default.
24. MB-Lab repository metadata. animate1978 (GitHub). 2024. <https://api.github.com/repos/animate1978/MB-Lab>. Type: repository. Supports: Repository is archived; last push 2024-07-21.
25. Anny README. NAVER LABS Europe. 2026. <https://raw.githubusercontent.com/naver/anny/main/README.md>. Type: repository. Supports: Code Apache 2.0; uses MakeHuman/MPFB2 CC0 assets; SMPL-X topology is non-commercial only.

### Anatomical muscle meshes

26. Écorché README. Charleeh (GitHub). 2026. <https://raw.githubusercontent.com/Charleeh/ecorche/main/README.md>. Type: repository. Supports: 634 named meshes (203 superficial + 159 deep muscles), 486,005 vertices, metres, Y up; per-node extras with FMA IDs.
27. Écorché commit history. Charleeh (GitHub). 2026. <https://api.github.com/repos/Charleeh/ecorche/commits?per_page=3>. Type: repository. Supports: Single commit 320805e06aee on 2026-10-07.
28. BodyParts3D Download page. DBCLS / LSDB Archive. n.d. <https://dbarchive.biosciencedbc.jp/en/bodyparts3d/download.html>. Type: asset-page. Supports: File list and sizes (isa 136 MB, partof 62 MB OBJ zips; parts lists).
29. BodyParts3D License. DBCLS. 2025. <https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html>. Type: license-page. Supports: Current license is CC Attribution 4.0 International; required credit line; last updated 2025/02/27.
30. BodyParts3D Database Description. DBCLS. n.d. <https://dbarchive.biosciencedbc.jp/en/bodyparts3d/desc.html>. Type: documentation. Supports: Adult human male whole-body model; License CC BY; no user registration; creator Kousaku Okubo; DOI 10.18908/lsdba.nbdc00837-000.
31. BodyParts3D README_e. DBCLS. 2025. <https://dbarchive.biosciencedbc.jp/data/bodyparts3d/LATEST/README_e.html>. Type: documentation. Supports: Parts-list columns (FMA concept id, representation id, English name); element/compound files; OBJ per element; license update 2025/02/27.
32. BodyParts3D PART-OF mesh data page. DBCLS. n.d. <https://dbarchive.biosciencedbc.jp/en/bodyparts3d/data-8.html>. Type: documentation. Supports: partof zip = 1,258 entries, OBJ, created by 3D CAD.
33. BodyParts3D Release 4.0 note. DBCLS. 2013. <https://dbarchive.biosciencedbc.jp/data/bodyparts3d/LATEST/release_4.0_e.html>. Type: documentation. Supports: V4.0 counts (is-a 1651 elemental reps); FJ file IDs; warning that data may contain many errors.
34. BodyParts3D LATEST directory. DBCLS. 2025. <https://dbarchive.biosciencedbc.jp/data/bodyparts3d/LATEST/>. Type: repository. Supports: Archive list and sizes; coordinate_system.png.
35. BodyParts3D coordinate system image. DBCLS. 2013. <https://dbarchive.biosciencedbc.jp/data/bodyparts3d/LATEST/coordinate_system.png>. Type: documentation. Supports: Unit mm; axes; standing pose with arms at sides.
36. BodyParts3D 3.0 archive directory. DBCLS. 2011. <https://dbarchive.biosciencedbc.jp/data/bodyparts3d/20110915/>. Type: repository. Supports: Older release with obj_95 (522M) and obj_99 (128M) archives.
37. BodyParts3D: 3D structure database for anatomical concepts (PubMed). Mitsuhashi N, Fujieda K, Tamura T, Kawamoto S, Takagi T, Okubo K. 2009. <https://pubmed.ncbi.nlm.nih.gov/18835852/>. Type: publication. Supports: Database represents a 3D whole-body model of an adult human male.
38. BodyParts3D paper full text (PMC2686534 via NCBI BioC API). Mitsuhashi N et al. 2009. <https://www.ncbi.nlm.nih.gov/research/bionlp/RESTful/pmcoa.cgi/BioC_json/PMC2686534/unicode>. Type: publication. Supports: Built on the TARO voxel model from 2 mm MRI of a male volunteer; TARO cited as Japanese adult male of average height and weight.
39. LluisV/Z-Anatomy (Unity app, FBX models). Lluís Vinent Juanico. 2022. <https://github.com/LluisV/Z-Anatomy>. Type: repository. Supports: CC BY-SA 4.0 statement; FBX models folder; Google Drive .blend link.
40. Z-Anatomy license document. Z-Anatomy. n.d. <https://docs.google.com/document/d/1peWW_7IiVgTTAwcI_auv38YSJ6qGWRuTMxzzhkRpXIk/edit>. Type: license-page. Supports: All Z-Anatomy content CC-BY-SA 4.0; BodyParts3D credited CC-BY 4.0; NC-licensed reference models (inner ear, kidney).
41. Z-Anatomy/Models-of-human-anatomy (Blender template). Gauthier Kervyn / Z-Anatomy. 2024. <https://github.com/Z-Anatomy/Models-of-human-anatomy>. Type: repository. Supports: Models derived from BodyParts3D; CC BY-SA 4.0; Z-Anatomy.zip 86.7 MB.
42. Z-Anatomy website. Z-Anatomy. n.d. <https://www.z-anatomy.com/>. Type: asset-page. Supports: Official project site (JS app; content not readable without JS).
43. Z-Anatomy Google Drive models folder. Z-Anatomy / Lluís Vinent. n.d. <https://drive.google.com/drive/folders/18M7IuH2ai2fl21Ud0YH1mSlNEPPmcZzq>. Type: repository. Supports: Z-Anatomy_Template.zip (164,964,672 B) and Z-Biomechanics.7z downloadable without login.
44. Écorché (Charleeh/ecorche). Charleeh. 2026. <https://github.com/Charleeh/ecorche>. Type: repository. Supports: 634 named meshes (362 muscles), glTF, metres, CC BY-SA 4.0 model / MIT code; built from BodyParts3D + Z-Anatomy.
45. Écorché LICENSE.md. Charleeh. 2026. <https://github.com/Charleeh/ecorche/blob/main/LICENSE.md>. Type: license-page. Supports: Model CC BY-SA 4.0, code MIT; credit line.
46. Écorché ATTRIBUTION.md. Charleeh. 2026. <https://github.com/Charleeh/ecorche/blob/main/ATTRIBUTION.md>. Type: documentation. Supports: Source files used, license history (OBJ headers say CC BY-SA 2.1 JP), list of changes, Z-Anatomy parts taken via BodyExplorer.
47. ashemag/human-atlas. ashemag. 2026. <https://github.com/ashemag/human-atlas>. Type: repository. Supports: BodyParts3D web viewer; data CC BY 4.0, code MIT; 2,288,268 triangles; custom binary format.
48. JohanBellander/BodyExplorer. Johan Bellander. 2026. <https://github.com/JohanBellander/BodyExplorer>. Type: repository. Supports: Muscle glb from BodyParts3D (401) + Z-Anatomy (66); code MIT per README; data under source licenses.
49. Kevin-Mattheus-Moerman/BodyParts3D. Kevin Mattheus Moerman. n.d. <https://github.com/Kevin-Mattheus-Moerman/BodyParts3D>. Type: repository. Supports: STL mirror of BodyParts3D 3.0; CC BY-SA 2.1 JP note; claim of skin/muscle intersections in 4.0.
50. dbcls/bp3d. DBCLS (BITS). n.d. <https://github.com/dbcls/bp3d>. Type: repository. Supports: BodyParts3D development/server code (no new mesh release found).
51. NIH 3D entry 3DPX-012628 Visible Human Male Left Arm Muscles. kbrowne / NIH 3D. 2019. <https://3d.nih.gov/entries/3DPX-012628>. Type: asset-page. Supports: CC-BY badge to CC BY 4.0; made from Visible Human Male cryo/CT, 3D Slicer + ZBrush.
52. NIH 3D entry 3DPX-012629 Visible Human Male Right Arm Muscles. kbrowne / NIH 3D. 2019. <https://3d.nih.gov/entries/3DPX-012629>. Type: asset-page. Supports: CC-BY badge to CC BY 4.0.
53. NIH 3D download page 12628/3. NIH 3D. n.d. <https://3d.nih.gov/entries/download/12628/3>. Type: asset-page. Supports: File list (STL input; glb/stl/wrl/3mf/blend outputs); terms dialog; API download URL.
54. NIH 3D entry 3DPX-023209 Visible Human Male Bust. kbrowne / NIH 3D. 2025. <https://3d.nih.gov/entries/3DPX-023209>. Type: asset-page. Supports: CC-BY badge; half skin / half musculature bust.
55. NIH 3D entry 3DPX-021022 Body, Male (HRA). HRA / NIH 3D. 2024. <https://3d.nih.gov/entries/3DPX-021022>. Type: asset-page. Supports: CC-BY badge; Male united reference organ set from Visible Human Male.
56. NIH 3D entry 3DPX-021016 Skin, Male (HRA). HRA / NIH 3D. 2024. <https://3d.nih.gov/entries/3DPX-021016>. Type: asset-page. Supports: CC-BY badge; male skin surface from Visible Human Male.
57. NIH 3D entry 3DPX-022818 Detailed human torso model. SunnyArt / Artec 3D. 2025. <https://3d.nih.gov/entries/3DPX-022818>. Type: asset-page. Supports: CC-BY 4.0 badge vs description text CC BY 3.0 Unported; Artec scan of a torso.
58. NIH 3D entry 3DPX-001774 Musculature Sketch Color. chris@printhuman.org. 2015. <https://3d.nih.gov/entries/3DPX-001774>. Type: asset-page. Supports: License CC-BY-NC-SA (rejected).
59. NIH 3D entry 3DPX-003410 Gluteal Muscle. courtierj. 2016. <https://3d.nih.gov/entries/3DPX-003410>. Type: asset-page. Supports: License CC-BY-NC-ND (rejected).
60. NIH 3D search: muscle. NIH 3D. n.d. <https://3d.nih.gov/discover?q=muscle&sort=relevance>. Type: asset-page. Supports: 79 results, mostly molecules; no full-body muscle model.
61. Open3DModel Anatomy category. Open3dModel.com. n.d. <https://open3dmodel.com/3d-models/anatomy>. Type: asset-page. Supports: 616 anatomy files; bodybuilder and muscle entries listed.
62. Open3DModel Bodybuilder (ID 14500). EmilyC (user upload). 2015. <https://open3dmodel.com/3d-models/bodybuilder-free-3d-model_14500.html>. Type: asset-page. Supports: License: Personal use or Education; .max; User-Contributed Content.
63. Open3DModel Anatomy Body Skeleton With Muscles (180078). Emma.D (user upload). n.d. <https://open3dmodel.com/3d-models/3d-model-anatomy-body-skeleton-with-muscles_180078.html>. Type: asset-page. Supports: License: Personal use or Education.
64. Open3DModel Anatomy Human Body Bones Muscles (180062). NovaDream (user upload). n.d. <https://open3dmodel.com/3d-models/3d-model-anatomy-human-body-bones-muscles_180062.html>. Type: asset-page. Supports: License: Personal use or Education.
65. Open3DModel Man Body Human Anatomy (349802). Max_Ray (user upload). n.d. <https://open3dmodel.com/3d-models/man-body-human-anatomy_349802.html>. Type: asset-page. Supports: License: CC-Attribution NonCommercial (and 'Personal or Education').
66. The Open Anatomy Project. Surgical Planning Lab, Brigham and Women's Hospital. n.d. <https://www.openanatomy.org/>. Type: documentation. Supports: Six regional atlases (brain, liver, inner ear, knee, abdomen, thorax); no full-body muscle atlas.

### Statue and écorché scans, museum open access

67. SMK API record KAS224 (Herakles Lansdowne cast). Statens Museum for Kunst. n.d. <https://api.smk.dk/api/v1/art/?object_number=KAS224&lang=en>. Type: repository. Supports: rights = Public Domain Mark 1.0, public_domain = true; cast 208 x 88 x 76 cm.
68. Three D Scans – Free 3D scan archive (home and page/2). Oliver Laric / Three D Scans. n.d. <https://threedscans.com/>. Type: repository. Supports: List of about 150 scans; entry pages link direct zip downloads.
69. Info – Three D Scans (live). Three D Scans. n.d. <https://threedscans.com/info/>. Type: documentation. Supports: The live page lists institutions and says the project was initiated in 2012 by Oliver Laric. It has no usage statement.
70. Info – Three D Scans (Wayback snapshot 2017-06-06). Three D Scans / Internet Archive. 2017. <http://web.archive.org/web/20170606161328/http://threedscans.com/info/>. Type: documentation. Supports: "All scans can be downloaded and used without copyright restrictions.".
71. Hermes fastening his sandals – Three D Scans. Three D Scans. n.d. <https://threedscans.com/vienna/hermes-fastening-his-sandals/>. Type: asset-page. Supports: Plaster cast; 67 x 178 x 96 cm; hermes.OBJ.zip download link.
72. Neptune – Three D Scans. Three D Scans. n.d. <https://threedscans.com/uncategorized/neptune/>. Type: asset-page. Supports: Musée de la Romanité, photogrammetry 2022, neptuneRaw.stl.zip.
73. Lucius Quinctius Cincinnatus – Three D Scans. Three D Scans. n.d. <https://threedscans.com/vienna/lucius-quinctius-cincinnatus/>. Type: asset-page. Supports: Beyer marble, 116 x 275 x 128 cm, STL zip (128 MB).
74. SMK API art search (has_3d_file:true). Statens Museum for Kunst. n.d. <https://api.smk.dk/api/v1/art/search/?keys=*&filters=%5Bhas_3d_file:true%5D&offset=0&rows=100&lang=en>. Type: repository. Supports: 371 objects with 3D files; rights/public_domain fields; files_3D URLs and sizes.
75. SMK API record KAS499 (Borghese Gladiator). Statens Museum for Kunst. n.d. <https://api.smk.dk/api/v1/art/?object_number=KAS499&lang=en>. Type: repository. Supports: public_domain false; rights = use-of-smk-material URL; creator death date 1975 (apparent data error).
76. The SMK API. Statens Museum for Kunst. 2019. <https://www.smk.dk/en/article/smk-api/>. Type: documentation. Supports: Definition of public_domain: true; API needs no key.
77. 3D models from the collection. Statens Museum for Kunst. n.d. <https://www.smk.dk/en/article/3d-models>. Type: documentation. Supports: STL downloads from SMK Open; "freely use the artworks in your own projects"; made with Scan the World.
78. Use of SMK material. Statens Museum for Kunst. 2018. <https://www.smk.dk/en/section/use-of-smk-material/>. Type: license-page. Supports: Public-domain works are "free of copyright" and free to use for all purposes.
79. SMK² presents: Digital Casts (Sketchfab collection). SMK (smkmuseum). n.d. <https://sketchfab.com/smkmuseum/collections/smk2-presents-digital-casts-be9b5276fb1049f180a25d706c8f3949>. Type: license-page. Supports: "The 3D models carry a Public Domain license and can be downloaded, repurposed, remixed, printed by anyone.".
80. 3D Printable Belvedere Torso by SMK. SMK / MyMiniFactory. 2017. <https://www.myminifactory.com/object/3d-print-belvedere-torso-49742>. Type: asset-page. Supports: License shown as PDM (CC Public Domain Mark 1.0).
81. 3D Printable Borghese Gladiator by SMK. SMK / MyMiniFactory. 2019. <https://www.myminifactory.com/object/3d-print-borghese-gladiator-105803>. Type: asset-page. Supports: License shown as PDM.
82. 3D Printable Dying Gaul by SMK. SMK / MyMiniFactory. 2019. <https://www.myminifactory.com/object/3d-print-dying-gaul-105799>. Type: asset-page. Supports: License shown as PDM.
83. 3D Printable Discobolus by SMK. SMK / MyMiniFactory. 2023. <https://www.myminifactory.com/object/3d-print-discobolus-271434>. Type: asset-page. Supports: License shown as PDM.
84. 3D Printable Laocoon and His Sons by SMK. SMK / MyMiniFactory. 2017. <https://www.myminifactory.com/object/3d-print-laocoon-and-his-sons-52652>. Type: asset-page. Supports: License shown as PDM.
85. 3D Printable Farnese Hercules by Scan The World. Scan The World / MyMiniFactory. 2019. <https://www.myminifactory.com/object/3d-print-farnese-hercules-97302>. Type: asset-page. Supports: Cairo fragmentary copy; License BY-NC-SA.
86. 3D Printable Flayed Man at The Louvre, Paris by Scan The World. Scan The World / MyMiniFactory. 2015. <https://www.myminifactory.com/object/3d-print-flayed-man-at-the-louvre-paris-6635>. Type: asset-page. Supports: Houdon écorché; License BY-NC-SA (links CC BY-NC-SA 4.0).
87. 3D Printable Gladiateur Borghese at the Louvre by Scan The World. Scan The World / MyMiniFactory. 2015. <https://www.myminifactory.com/object/3d-print-gladiateur-borghese-at-the-louvre-paris-france-6482>. Type: asset-page. Supports: License BY-NC-SA.
88. 3D Printable The Dying Galatian at The Capitoline Museums by Scan The World. Scan The World / MyMiniFactory. 2015. <https://www.myminifactory.com/object/3d-print-the-dying-gaul-at-the-palace-of-versailles-france-14305>. Type: asset-page. Supports: License BY-NC-SA.
89. 3D Printable Discobolus at The British Museum by Scan The World. Scan The World / MyMiniFactory. 2015. <https://www.myminifactory.com/object/3d-print-discobolus-at-the-british-museum-london-7896>. Type: asset-page. Supports: License BY-NC-SA.
90. 3D Printable The Laocoön Group at The Vatican Museums by Scan The World. Scan The World / MyMiniFactory. 2015. <https://www.myminifactory.com/object/3d-print-the-laocon-group-at-the-vatican-museums-vatican-city-15115>. Type: asset-page. Supports: License BY-NC-SA.
91. 3D Printable Hercules Épitrapézios at The Louvre by Scan The World. Scan The World / MyMiniFactory. 2015. <https://www.myminifactory.com/object/3d-print-hercules-pitrapzios-at-the-louvre-paris-12676>. Type: asset-page. Supports: License BY-NC-SA.
92. MyMiniFactory API Documentation. MyMiniFactory. n.d. <https://github.com/MyMiniFactory/api-documentation>. Type: documentation. Supports: API needs an authenticated client; the OpenAPI file defines ApiKeyAuth (query 'key') and OAuth2.
93. Anatomical figure – écorché (Zenodo record 21376387). WirtualneMuzeaMalopolski. 2026. <https://zenodo.org/records/21376387>. Type: asset-page. Supports: cc-zero; Francavilla statuette, inv. 3915; GLB 15,436,344 B.
94. Anatomical figure – écorché (Zenodo record 21528504). WirtualneMuzeaMalopolski. 2026. <https://zenodo.org/records/21528504>. Type: asset-page. Supports: cc-zero; sibling statuette, inv. 3916.
95. Anatomical figure – écorché (Zenodo record 21291060). WirtualneMuzeaMalopolski. 2026. <https://zenodo.org/records/21291060>. Type: asset-page. Supports: cc-zero; sibling statuette, inv. 3917.
96. Anatomical figure – écorché (Sketchfab, via API). WirtualneMuzeaMalopolski. 2020. <https://sketchfab.com/3d-models/anatomical-figure-ecorche-9a3f4fef02af4be3a3cd105aea218dc5>. Type: asset-page. Supports: License "CC0 Public Domain"; 303,228 faces; download API needs login (401).
97. Doryphoros (The Spear Bearer) on Sketchfab (via API). SMK (smkmuseum). n.d. <https://sketchfab.com/3d-models/doryphoros-the-spear-bearer-2b213f98afa742a5880af130b4d4eddc>. Type: asset-page. Supports: License "CC0 Public Domain"; 275,419 faces.
98. Flayed Man at The Louvre, Paris (Zenodo mirror). Scan-the-World. 2026. <https://zenodo.org/records/21679630>. Type: asset-page. Supports: cc-by-nc-sa-4.0; GLB, USDZ, and decimated GLBs.
99. The Farnese Hercules at The Jardin des Tuileries (Zenodo mirror). Scan-the-World. 2026. <https://zenodo.org/records/21689305>. Type: asset-page. Supports: cc-by-nc-sa-4.0.
100. Gladiateur Borghese at the Louvre (Zenodo mirror). Scan-the-World. 2026. <https://zenodo.org/records/21354070>. Type: asset-page. Supports: cc-by-nc-sa-4.0.
101. The Dying Galatian at The Capitoline Museums (Zenodo mirror). Scan-the-World. 2026. <https://zenodo.org/records/21244674>. Type: asset-page. Supports: cc-by-nc-sa-4.0.
102. The Dying Tecumseh – Smithsonian 3D. Smithsonian American Art Museum. n.d. <https://3d.si.edu/object/3d/dying-tecumseh:a572abe8-d60a-4ad5-aa86-6609e85ec4a6>. Type: asset-page. Supports: Restrictions & Rights: CC0; public-domain usage text; marble, 93.1 x 197.2 x 136.6 cm.
103. Dying Tecumseh Voyager document.json. Smithsonian Institution. n.d. <https://3d-api.si.edu/content/document/a572abe8-d60a-4ad5-aa86-6609e85ec4a6/document.json>. Type: repository. Supports: GLB derivatives (150k/100k/20k faces), byte sizes, bounding box in metres.
104. Mia's Doryphoros (Zenodo mirror). artsmia. n.d. <https://zenodo.org/records/10285658>. Type: asset-page. Supports: cc-zero; GLB 9.1 MB; Mia Doryphoros photogrammetry.
105. High-resolution Doryphoros! (Zenodo mirror). artsmia. n.d. <https://zenodo.org/records/10272598>. Type: asset-page. Supports: cc-zero; GLB 153 MB; four-million-face model.
106. Pierre Puget's Hercules as Archer (Zenodo mirror). artsmia. n.d. <https://zenodo.org/records/10231758>. Type: asset-page. Supports: cc-zero; GLB 9.1 MB.
107. 1987.2 Hercules (Sketchfab, via API). Cleveland Museum of Art (clevelandart). n.d. <https://sketchfab.com/3d-models/19872-hercules-0fd4f91f65c84953a29d6b8beb496cab>. Type: asset-page. Supports: CC0 Public Domain; 40,000 faces; 14.5 x 8 cm bronze.
108. Borghese Gladiator by geoffreymarchal (Zenodo mirror). geoffreymarchal. 2016. <https://zenodo.org/records/10386971>. Type: asset-page. Supports: Zenodo shows cc-by-4.0, but the Sketchfab API now shows "Standard" (license mismatch).
109. Discobolus by geoffreymarchal (Zenodo mirror). geoffreymarchal. 2017. <https://zenodo.org/records/10227583>. Type: asset-page. Supports: Zenodo shows cc-by-4.0, but the Sketchfab API now shows CC BY-NC-SA (license mismatch).

### General 3D libraries and Sketchfab

110. three.js repository tree (dev). mrdoob / three.js contributors. n.d. <https://api.github.com/repos/mrdoob/three.js/git/trees/dev?recursive=1>. Type: repository. Supports: List of human models under examples/models (Xbot, Soldier, Michelle, kira, LeePerrySmith, RobotExpressive, facecap, etc.).
111. LeePerrySmith_License.txt. three.js / Lee Perry-Smith. n.d. <https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/models/gltf/LeePerrySmith/LeePerrySmith_License.txt>. Type: repository. Supports: LeePerrySmith head is CC Attribution 3.0 Unported.
112. RobotExpressive README. three.js / Don McCurdy. n.d. <https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/models/gltf/RobotExpressive/README.md>. Type: repository. Supports: RobotExpressive by Tomás Laulhé (Quaternius), CC0 1.0.
113. examples/models/fbx/README.md. three.js. n.d. <https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/models/fbx/README.md>. Type: repository. Supports: Only nurbs.fbx has a stated CC0 license in the fbx folder.
114. male02 readme. three.js. n.d. <https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/models/obj/male02/readme.txt>. Type: repository. Supports: male02 is by Reallusion iClone from Google 3D Warehouse; no license stated.
115. Nefertiti README. three.js / Fraunhofer IGD. n.d. <https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/models/gltf/Nefertiti/README.md>. Type: repository. Supports: Nefertiti is CC BY-NC.
116. webgl_animation_skinning_additive_blending.html. three.js. n.d. <https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/webgl_animation_skinning_additive_blending.html>. Type: repository. Supports: Xbot.glb credited as model from mixamo.com.
117. webgl_animation_multiple.html. three.js. n.d. <https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/webgl_animation_multiple.html>. Type: repository. Supports: Soldier.glb credited as model from mixamo.com.
118. webgl_tsl_skinning.html. three.js. n.d. <https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/webgl_tsl_skinning.html>. Type: repository. Supports: Michelle.glb credited as a model from Mixamo.
119. webgl_animation_skinning_ik.html. three.js. n.d. <https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/webgl_animation_skinning_ik.html>. Type: repository. Supports: kira.glb credited to Aki, scene marked CC0.
120. webgl_loader_fbx.html. three.js. n.d. <https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/webgl_loader_fbx.html>. Type: repository. Supports: Samba Dancing credited as Mixamo; Head_69 has no credit.
121. webgl_materials_cubemap.html. three.js. n.d. <https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/webgl_materials_cubemap.html>. Type: repository. Supports: WaltHead credited to David OReilly; no license.
122. Mixamo | Common questions. Adobe. 2021. <https://helpx.adobe.com/creative-cloud/faq/mixamo-faq.html>. Type: documentation. Supports: Mixamo needs an Adobe ID; characters royalty free under Adobe terms, not CC.
123. Poly Pizza search: bodybuilder. Poly Pizza. n.d. <https://poly.pizza/search/bodybuilder>. Type: asset-page. Supports: 10 results (Buff man, Fitness Character, Buff Guy, gym props).
124. Poly Pizza search: muscular man. Poly Pizza. n.d. <https://poly.pizza/search/muscular%20man>. Type: asset-page. Supports: 16 results incl. Male base, MAN.BODY, male_base.
125. Poly Pizza search: anatomy. Poly Pizza. n.d. <https://poly.pizza/search/anatomy>. Type: asset-page. Supports: Only organ/bone models; no muscular body.
126. Male base (Poly Pizza). Артур Мигранов. 2018. <https://poly.pizza/m/eWGDnQ0jzmH>. Type: asset-page. Supports: Creative Commons Attribution (CC-BY 3.0), 48.9k tris, no login required.
127. Buff man (Poly Pizza). joney_lol. n.d. <https://poly.pizza/m/NvDx04YkKo>. Type: asset-page. Supports: CC-BY 3.0, 576 tris.
128. Fitness Character (Poly Pizza). iPoly3D. n.d. <https://poly.pizza/m/eMOTyGEAxj>. Type: asset-page. Supports: CC0 1.0, 2370 tris.
129. Buff Guy (Poly Pizza). Polygonal Mind. 2023. <https://poly.pizza/m/6jUuCHmQ1I>. Type: asset-page. Supports: Public Domain (CC0), 5144 tris.
130. Quaternius – Universal Base Characters. Quaternius. 2025. <https://quaternius.com/packs/universalbasecharacters.html>. Type: asset-page. Supports: Pack page states License CC0, ~13k tris, FBX/OBJ/glTF, download via itch.io.
131. Quaternius Asset License (QAL) v1.0. Quaternius. 2026. <https://quaternius.com/license.html>. Type: license-page. Supports: Custom license forbidding redistribution of the assets themselves; conflicts with CC0 on pack page.
132. Universal Base Characters on itch.io. Quaternius. 2025. <https://quaternius.itch.io/universal-base-characters>. Type: asset-page. Supports: Asset license Creative Commons Zero v1.0 Universal; Standard zip 122 MB, min price 0.
133. Universal Base Characters purchase page. itch.io / Quaternius. n.d. <https://quaternius.itch.io/universal-base-characters/purchase>. Type: asset-page. Supports: 'No thanks, just take me to the downloads' option (no account).
134. Kenney – Animated Characters Protagonists. Kenney. n.d. <https://kenney.nl/assets/animated-characters-protagonists>. Type: asset-page. Supports: License: Creative Commons CC0; direct zip link.
135. Kenney support / common questions. Kenney. n.d. <https://kenney.nl/support>. Type: license-page. Supports: All assets on asset pages are public domain licensed (CC0).
136. Kenney 3D character asset list. Kenney. n.d. <https://kenney.nl/assets/category:3D?search=character>. Type: asset-page. Supports: Kenney 3D character packs are stylized (Blocky, Animated, Mini).
137. Sketchfab Data API v3 swagger. Sketchfab. n.d. <https://docs.sketchfab.com/data-api/v3/swagger.json>. Type: documentation. Supports: Search 'license' enum (cc0, by, by-sa…) and download endpoint 401 'User token is not valid or missing'.
138. Sketchfab Data API v3 licenses. Sketchfab. n.d. <https://api.sketchfab.com/v3/licenses>. Type: documentation. Supports: License labels/slugs and CC 4.0 URLs used by Sketchfab.
139. Sketchfab search API (example query). Sketchfab. n.d. <https://api.sketchfab.com/v3/search?type=models&q=bodybuilder&downloadable=true&license=by&count=24>. Type: documentation. Supports: Unauthenticated search works; returns license, vertexCount, faceCount.
140. Sketchfab – Downloading models (Download API). Sketchfab. n.d. <https://sketchfab.com/developers/download-api/downloading-models>. Type: documentation. Supports: 'Downloading a model requires the user to be authenticated with a Sketchfab account.'.
141. Male Full Body Ecorche (API). diegoluga. 2016. <https://api.sketchfab.com/v3/models/ab11ebff89224f03bd75efede1164cf6>. Type: asset-page. Supports: CC Attribution, v 320785 / f 640470.
142. Male Body Muscular System - Anatomy Study (API). ruslangadzhiev. 2016. <https://api.sketchfab.com/v3/models/991eb96938be4d0d8fadee241a1063d3>. Type: asset-page. Supports: CC Attribution, v 106133 / f 210498.
143. Myology (API). Z-Anatomy. 2021. <https://api.sketchfab.com/v3/models/31b40fd809b14665b93773936d67c52c>. Type: asset-page. Supports: CC Attribution-ShareAlike, v 2894527 / f 5711831, derived from BodyParts3D.
144. Anatomical figure - écorché (API). Virtual Museums of Małopolska. 2020. <https://api.sketchfab.com/v3/models/675678f1e3b3425dba685f5421f57cd4>. Type: asset-page. Supports: CC0 Public Domain, v 150266 / f 299954, Franqueville statuette scan.
145. Anatomical figure - écorché, variant 2 (API). Virtual Museums of Małopolska. 2020. <https://api.sketchfab.com/v3/models/0b4bf087f6064180895917e4a93f527b>. Type: asset-page. Supports: CC0 Public Domain, v 141566 / f 282480.
146. Anatomical figure - écorché, variant 3 (API). Virtual Museums of Małopolska. 2020. <https://api.sketchfab.com/v3/models/9a3f4fef02af4be3a3cd105aea218dc5>. Type: asset-page. Supports: CC0 Public Domain, v 151610 / f 303228.
147. bodybuilder base mesh (API). Rouker. 2022. <https://api.sketchfab.com/v3/models/f9218d0b1a834c52acc93eb6a88934fe>. Type: asset-page. Supports: CC Attribution, v 11835 / f 23596, tags bodyscan/Bodybuilder.
148. Bodybuilder Man Anatomy Practice Basemesh (API). aaolson817. 2018. <https://api.sketchfab.com/v3/models/67f60a34b71e497ead72645e8c5e9151>. Type: asset-page. Supports: CC Attribution, v 23999 / f 47994.
149. Bulky Male Bodybuilder Basemesh (API). ZBIGE. 2026. <https://api.sketchfab.com/v3/models/da0fcff6b54147a4a13105090709a33a>. Type: asset-page. Supports: CC Attribution, v 136635 / f 273266.
150. Male base muscular anatomy (API). CharacterZone. 2022. <https://api.sketchfab.com/v3/models/0954aa04666d45aab9633009318f7b66>. Type: asset-page. Supports: CC Attribution, v 18855 / f 37648.
151. Male Human Strong Body - Free / Downloadable (API). orthovasky. 2018. <https://api.sketchfab.com/v3/models/c370d7b22dd249129acad646e04d2452>. Type: asset-page. Supports: CC Attribution, v 630125 / f 1260230.
152. Posed Bodybuilder (API). samuel_taiwo. 2026. <https://api.sketchfab.com/v3/models/ec2110f9cbdd4bd483da39364032a507>. Type: asset-page. Supports: CC Attribution, v 135588 / f 271136.
153. Anatomy Study - Male Bodybuilder (API). keegan.watson.works. 2017. <https://api.sketchfab.com/v3/models/1e2e3d39a3bb4721b4a3d8d9e7411f59>. Type: asset-page. Supports: CC Attribution in API but description says non-commercial only (conflict).
154. Muscular bodybuilder, Boxing, Fighter (API). 3dUVpro. 2024. <https://api.sketchfab.com/v3/models/7267364d6d4249beb9927374b4c2339a>. Type: asset-page. Supports: CC Attribution; description says generated with Meshy AI toolkit.
155. Bodybuilder athletic muscular (API). 3dUVpro. 2025. <https://api.sketchfab.com/v3/models/77848029153d40508ad4ff7856cf4ebb>. Type: asset-page. Supports: CC Attribution; description says generated with Meshy AI toolkit.
156. Stylized big muscle base mesh man (API). horanbeckman. 2023. <https://api.sketchfab.com/v3/models/3a4f1b2057da4ca687077bfa8ea3780f>. Type: asset-page. Supports: CC Attribution, v 22437 / f 44594, stylized.
157. Sketchfab download endpoint (unauthenticated test). Sketchfab. n.d. <https://api.sketchfab.com/v3/models/ab11ebff89224f03bd75efede1164cf6/download>. Type: documentation. Supports: 401 {"detail":"Authentication credentials were not provided."} (same for all 11 UIDs tested).
158. BlendSwap – Free Blender 3D Models. BlendSwap. n.d. <https://blendswap.com/3d>. Type: asset-page. Supports: Per-model CC licenses (cc0, cc-by, cc-by-sa, cc-by-nc).
159. BlendSwap – Human Male Base Mesh with armature. nashnir. n.d. <https://blendswap.com/blend/21626>. Type: asset-page. Supports: Example CC0 blend page.
160. BlendSwap download page (blend 21626). BlendSwap. n.d. <https://blendswap.com/blend/21626/download>. Type: asset-page. Supports: Page shows 'Sign in to download' (login required).
161. OpenGameArt 3D search: muscle. OpenGameArt.org. n.d. <https://opengameart.org/art-search-advanced?keys=muscle&field_art_type_tid%5B%5D=10>. Type: asset-page. Supports: 9 results; Muscleboy, Big Guy, Male body subD mesh.
162. Muscleboy 3D Model. digitaln8m4r3. n.d. <https://opengameart.org/content/muscleboy-3d-model>. Type: asset-page. Supports: CC0; boxing dummy torso; zip 5126434 bytes.
163. Big Guy. piacenti. n.d. <https://opengameart.org/content/big-guy>. Type: asset-page. Supports: CC-BY 3.0; stylized brute; zip 22615937 bytes.
164. Male body subD mesh. Julius. n.d. <https://opengameart.org/content/male-body-subd-mesh>. Type: asset-page. Supports: CC-BY-SA 3.0; neutral quad base mesh; zip 680339 bytes.
165. Free 3D People. Renderpeople. 2025. <https://renderpeople.com/free-3d-people/>. Type: asset-page. Supports: Free models under same terms as paid models; No Registration Required; zips 395–468 MB.
166. Download free 3d Body Scan for tutorial. 3D Scan Store (Ten24). n.d. <https://www.3dscanstore.com/download-free-3d-bodyscan-for-tutorial>. Type: asset-page. Supports: Free ZTL body scan, 374 MB S3 zip, no license stated on page.
167. 3dscanstore Terms & Conditions / Licensing. 3D Scan Store. n.d. <https://www.3dscanstore.com/terms-and-conditions-licensing>. Type: license-page. Supports: Forbids commercial/for-profit use of free downloads without permission.
168. Poly Haven asset license. Poly Haven. n.d. <https://polyhaven.com/license>. Type: license-page. Supports: All assets are CC0.
169. Poly Haven models API. Poly Haven. n.d. <https://api.polyhaven.com/assets?t=models>. Type: documentation. Supports: 521 models; only gothic_statue and marble_bust_01 are human figures.

### Wikimedia Commons photos and anatomy plates

170. File:Phil Heath Kai Greene.JPG. Kevin Laval. 2012. <https://commons.wikimedia.org/wiki/File%3APhil_Heath_Kai_Greene.JPG>. Type: asset-page. Supports: CC0; Mr. Olympia 2012 front pose; quad striations, separation, vascularity, fullness.
171. File:SBFF SM 2019 Bodybuilding +95 kg Winner, Arne Lundell.jpg. Rikard Strömmer. 2019. <https://commons.wikimedia.org/wiki/File%3ASBFF_SM_2019_Bodybuilding_%2B95_kg_Winner%2C_Arne_Lundell.jpg>. Type: asset-page. Supports: CC BY-SA 4.0; front double biceps on stage; quad and ab separation, arm veins.
172. File:Behnam Navid.jpg. BehnamNavid65. 2022. <https://commons.wikimedia.org/wiki/File%3ABehnam_Navid.jpg>. Type: asset-page. Supports: CC BY-SA 4.0; stage front pose; quad striations and separation, vascularity.
173. File:DF-SC-01-04792 Shawn Wolfe and Derrick Anderson … Northern Japan Bodybuilding Championships.jpeg. US Army Photo by Scene Camera Operator: SSGT Milo E. Ware, Jr. 1999. <https://commons.wikimedia.org/wiki/File%3ADF-SC-01-04792_Shawn_Wolfe_and_Derrick_Anderson_strike_poses_during_the_finals_of_the_9th_annual_Northern_Japan_Bodybuilding_Championships.jpeg>. Type: asset-page. Supports: Public domain (US Army); most-muscular poses; separation, conditioning.
174. File:Team Malmstrom members compete in bodybuilding competition 150508-F-GF295-053.jpg. Airman 1st Class Collin Schmidt. 2015. <https://commons.wikimedia.org/wiki/File%3ATeam_Malmstrom_members_compete_in_bodybuilding_competition_150508-F-GF295-053.jpg>. Type: asset-page. Supports: Public domain (USAF); very lean stage pose; abs, serratus, quads.
175. File:US Navy 021105-N-1288N-016 Darrell A. Lewis strikes one of the poses he used in competition.jpg. U.S. Navy photo by Journalist 2nd Class Jeffrey Nichols. 2002. <https://commons.wikimedia.org/wiki/File%3AUS_Navy_021105-N-1288N-016_Darrell_A._Lewis_strikes_one_of_the_poses_he_used_in_competition.jpg>. Type: asset-page. Supports: Public domain (US Navy); most-muscular in gym; separation, forearm veins.
176. File:US Navy 060318-N-9869B-074 Engineman 2nd Class Andrew Frazier flexes his muscles during the GNC - NPC World Gym Classic San Diego Bodybuilding ^ Figure Championships.jpg. U.S. Navy Photo by Journalist 2nd Class Alexis R. Brown. 2006. <https://commons.wikimedia.org/wiki/File%3AUS_Navy_060318-N-9869B-074_Engineman_2nd_Class_Andrew_Frazier_flexes_his_muscles_during_the_GNC_-_NPC_World_Gym_Classic_San_Diego_Bodybuilding_%5E_Figure_Championships.jpg>. Type: asset-page. Supports: Public domain (US Navy); stage double biceps; arm vascularity, abs, quads.
177. File:NPC Wayne NJ.jpg. Dskhara1. 2017. <https://commons.wikimedia.org/wiki/File%3ANPC_Wayne_NJ.jpg>. Type: asset-page. Supports: CC BY-SA 4.0; outdoor front double biceps; quad striations, vascularity in daylight.
178. File:Vascular (7453726488).jpg. istolethetv from Hong Kong, China (Flickr). 2012. <https://commons.wikimedia.org/wiki/File%3AVascular_%287453726488%29.jpg>. Type: asset-page. Supports: CC BY 2.0; lower abdominal vascularity, ab separation.
179. File:Torso (7452190414).jpg. istolethetv from Hong Kong, China (Flickr). 2012. <https://commons.wikimedia.org/wiki/File%3ATorso_%287452190414%29.jpg>. Type: asset-page. Supports: CC BY 2.0; lean torso with moderate mass (contrast example).
180. File:Arms race (7452180634).jpg. istolethetv from Hong Kong, China (Flickr). 2012. <https://commons.wikimedia.org/wiki/File%3AArms_race_%287452180634%29.jpg>. Type: asset-page. Supports: CC BY 2.0; crab most-muscular line-up; delt/trap separation, forearm veins.
181. File:Face the music (7453727096).jpg. istolethetv from Hong Kong, China (Flickr). 2012. <https://commons.wikimedia.org/wiki/File%3AFace_the_music_%287453727096%29.jpg>. Type: asset-page. Supports: CC BY 2.0; back view on stage, soft focus.
182. File:Ferenci Marek, póza č. 6.jpg. Ladislav Ferenci. 2011. <https://commons.wikimedia.org/wiki/File%3AFerenci_Marek%2C_p%C3%B3za_%C4%8D._6.jpg>. Type: asset-page. Supports: CC BY-SA 3.0; studio back double biceps; back, hamstring, calf separation.
183. File:Ferenci Marek, póza č. 7.jpg. Ladislav Ferenci. 2011. <https://commons.wikimedia.org/wiki/File%3AFerenci_Marek%2C_p%C3%B3za_%C4%8D._7.jpg>. Type: asset-page. Supports: CC BY-SA 3.0; studio rear pose; back and leg separation.
184. File:Mikhail Volinkin prep6.jpg. Mikhail Volinkin1. 2019. <https://commons.wikimedia.org/wiki/File%3AMikhail_Volinkin_prep6.jpg>. Type: asset-page. Supports: CC0; gym upper-body shot; shoulder/arm vascularity, fullness.
185. File:Сhampionship of the Kaliningrad area on bodybuilding 15.jpg. Александр Подгорчук / "Клопс" (Westpress Kaliningrad). 2019. <https://commons.wikimedia.org/wiki/File%3A%D0%A1hampionship_of_the_Kaliningrad_area_on_bodybuilding_15.jpg>. Type: asset-page. Supports: CC BY-SA 4.0; abdominal-and-thigh pose; abs, serratus, forearm veins.
186. File:Сhampionship of the Kaliningrad area on bodybuilding 24.jpg. Александр Подгорчук / "Клопс" (Westpress Kaliningrad). 2019. <https://commons.wikimedia.org/wiki/File%3A%D0%A1hampionship_of_the_Kaliningrad_area_on_bodybuilding_24.jpg>. Type: asset-page. Supports: CC BY-SA 4.0; upper back close-up; rear delt/teres/infraspinatus separation.
187. File:Ray Buchanan bodybuilding.jpg. Playray. 2016. <https://commons.wikimedia.org/wiki/File%3ARay_Buchanan_bodybuilding.jpg>. Type: asset-page. Supports: CC BY-SA 4.0; side chest on stage; faint pec fiber lines, delt separation.
188. File:Basra bodybuilding competition DVIDS288960.jpg. Staff Sgt. Adelita Mead. 2010. <https://commons.wikimedia.org/wiki/File%3ABasra_bodybuilding_competition_DVIDS288960.jpg>. Type: asset-page. Supports: Public domain (US Army); amateur, moderate conditioning (contrast).
189. File:Gray409.png. Henry Vandyke Carter. 1918. <https://commons.wikimedia.org/wiki/File%3AGray409.png>. Type: asset-page. Supports: Public domain; Gray's plate 409, back muscle fiber directions.
190. File:Gray410.png. Henry Vandyke Carter. 1918. <https://commons.wikimedia.org/wiki/File%3AGray410.png>. Type: asset-page. Supports: Public domain; Gray's plate 410, pectoralis major and deltoid fiber directions.
191. File:Gray430.png. Henry Vandyke Carter. 1918. <https://commons.wikimedia.org/wiki/File%3AGray430.png>. Type: asset-page. Supports: Public domain; Gray's plate 430, quadriceps/sartorius fiber directions.
192. File:Gray432.png. Henry Vandyke Carter. 1918. <https://commons.wikimedia.org/wiki/File%3AGray432.png>. Type: asset-page. Supports: Public domain; Gray's plate 432, thigh cross-section with intermuscular septa.

### Additional sources (MakeHuman)

193. MPFB2 repository tree (master). MakeHuman Community (GitHub). n.d. <https://api.github.com/repos/makehumancommunity/mpfb2/git/trees/master?recursive=1>. Type: repository. Supports: MPFB ships src/mpfb/data/3dobjs/base.obj (same git blob SHA as MakeHuman's base.obj) and the muscle targets as .target.gz.
194. User-contributed skins (list, 4 pages). MakeHuman Community. n.d. <http://www.makehumancommunity.org/skins.html>. Type: asset-page. Supports: 189 user skins; muscle-related entries include 'Malemuscles' and 'Eves Young Caucasian Male Muscular'.
195. User-contributed targets (list, 8 pages). MakeHuman Community. n.d. <http://www.makehumancommunity.org/targets.html>. Type: asset-page. Supports: 394 user targets; muscle-related entries include 'BASESTRONG' and 'HarveyStomachMusclesV2'.

## Open questions / uncertainty

- **Share-alike scope.** Is CC BY-SA acceptable for an anatomy layer (Écorché, Z-Anatomy)? Do masks, labels, or textures that we derive from these meshes count as adapted material? This needs a legal decision.
- **BodyParts3D license conflict.** The page has said CC BY 4.0 since 2025-02-27, but the 2013 OBJ headers still say CC BY-SA 2.1 Japan. Follow the page (as Écorché and human-atlas do), or ask DBCLS to confirm.
- **Écorché maturity.** The repository is two days old, has one commit and one author, and has no review history. We checked the license, the counts, and a render. We did not check muscle intersections or mirror accuracy in detail.
- **MakeHuman slider match.** Our variants A–D sum target files with fixed weights. The MakeHuman app may weight macro targets a little differently. Confirm the final shape with a MakeHuman or MPFB export.
- **Detail at web resolution.** No test yet shows whether a 13,380-vertex body plus normal maps can read as "dry" or "crispy" on screen. Subdivision or displacement may be needed.
- **Registration effort.** Projecting Écorché or BodyParts3D muscle borders onto the MakeHuman body needs a registration step (different build and arm pose). The effort is unknown.
- **Sketchfab models.** The CC BY bodybuilders could not be inspected without an account. Their real structure and counts are [UNVERIFIED]. [INFERENCE] The "bodyscan" tag on one model may mean a scan of a real person, which can raise likeness and consent questions.
- **Quaternius.** The pack page and zip say CC0, but the site license (QAL v1.0, 2026-08-28) restricts redistribution. Which one governs a download made on 2026-10-09?
- **SMK and Three D Scans.** The SMK API marks the Borghese Gladiator as not public domain, which looks like a data error. Three D Scans states no current usage terms.
- **Commons photos.** Three "own work" uploads seem to come from the athletes (#3, #15, #18). Two images (#13, #14) carry another photographer's watermark. CC BY-SA photos add share-alike duties if we change or composite them in the app.
- **Missing references.** No sharp, openly licensed stage photo of a clearly "flat" or "spilled-over" physique was found. The contrast examples (#10, #19) are weak.
- **Provenance of community textures.** The CC-BY "Malemuscles" painting does not state its source. The "Eves" skin credits commercial 3d.sk photo references.
- **Units.** The Z-Anatomy FBX units (probably cm), the NIH arm GLB units, and the statue scan units (scaled to 130 units) are not stated by the sources.
