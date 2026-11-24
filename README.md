# Merkato Minibus (መርካቶ ሚኒባስ)

A playable 3D driving game built with Three.js, TypeScript, React, and Vite. Drive an iconic blue-and-white Ethiopian share taxi (*minibus*) along a real OpenStreetMap-mapped loop in **Merkato, Addis Ababa**, picking up and dropping off passengers at mapped stops near **St. Raguel Church**, **Cinema Ras**, **Anwar Grand Mosque**, **Gojam Berenda**, and **Autobis Tera**.

---

## Launch Instructions

```bash
npm install
npm run dev
```

Open `http://localhost:3000` in your browser. Press **Enter** / **Space** or click **START SHIFT** to begin at Autobis Tera.

For a production build:

```bash
npm run build
npm run preview
```

---

## Controls

| Action | Keyboard | Touch |
|---|---|---|
| Accelerate | `W` or `↑` | `GAS` pad |
| Brake, then Reverse | `S` or `↓` | `BRAKE / REV` pad |
| Steer Left / Right | `A` / `D` or `←` / `→` | `◀` / `▶` pads |
| Open / Close Sliding Door | `E` | `DOOR (E)` button |
| Sound Horn | `H` | `HORN (H)` button |
| Toggle Driver / Chase Camera | `C` | `CAM (C)` button |
| Recover to Nearest Route Point | `R` | Top-right recover icon |
| Pause / Density Settings | `Esc` | Top-right pause icon |

---

## Route & Map Data (OpenStreetMap)

All street centerlines, junctions, one-way carriageways, building footprints, pedestrian lanes, and landmark coordinates are bundled offline in `src/data/merkatoMapData.json` (extracted via Overpass API centered at `9.0322° N, 38.7400° E`). The game runs with zero live map API calls.

- **Map Attribution:** © OpenStreetMap contributors, licensed under the Open Database License (ODbL).
- **Route Label:** `Game route` — A connected, one-way-compliant ~2.67 km loop constructed from verified OSM drivable streets (`primary`, `secondary`, `tertiary`) and verified Addis Ababa Transport Bureau `share_taxi=yes` / `public_transport=platform` stops:
  1. **Autobis Tera (`አውቶቢስ ተራ`)** — Kenya Street starting pickup
  2. **St. Raguel Church (`ቅዱስ ራጉኤል ቤተ ክርስቲያን`)** — Kenya Street south gate
  3. **Cinema Ras (`ሲኒማ ራስ`)** — Tesema Aba Kemaw St (Southbound `oneway=yes`, OSM node `10937762912`)
  4. **Anwar Grand Mosque (`ታላቁ አንዋር መስጊድ`)** — Tesema Aba Kemaw St (Northbound `oneway=yes`, east of OSM way `42656246`)
  5. **Raguel North (`ራጉኤል ሰሜን`)** — Fitawrari Habte Giorgis St (Westbound `oneway=yes`, OSM node `10925161782`)
  6. **Gojam Berenda (`ጎጃም በረንዳ`)** — Fitawrari Habte Giorgis St (Westbound `oneway=yes`, OSM node `10845731585`)
  7. **Autobis Tera Terminal** — Loop return via `25683064` (`oneway=yes`) & Kenya Street
- **Pedestrian-Only Ways:** Mapped `footway` / `pedestrian` ways are rendered as cobble market alleys populated with pedestrians and excluded from taxi routing.

---

## Image Credits & Visual References

All 3D textures in `src/game/textures.ts` are procedurally generated via HTML5 Canvas (`SRGBColorSpace` + anisotropic filtering) directly informed by studying the following openly licensed Wikimedia Commons photographs:

| Subject | File & Creator | License | Usage in Project |
|---|---|---|---|
| Anwar Grand Mosque (facade, arches, domes, minaret) | *Anwar Grand Mosque.jpg* by **Gangaddis** | CC BY-SA 4.0 | Studied green scalloped parapet, white arches, teal domes, stone minaret |
| Anwar Mosque streetfront & electronics shops | *Anwar mosque (25070187162).jpg* by **Francisco Anzola** | CC BY 2.0 | Studied single-story shopfront awnings, rolling shutters, signs in front of mosque |
| Merkato market stalls, awnings & vans | *Addis Mercato, Adís Abeba, Etiopía, 2024-01-19, DD 27 & DD 28* by **Diego Delso** | CC BY-SA 4.0 | Studied corrugated zinc overhangs, street-edge goods, pedestrian density |
| Merkato street shoppers & porters | *Merkato streets.jpg* by **Abpics234** | CC BY-SA 4.0 | Studied *netela* clothing, head-carried baskets/crates, street clutter |
| Addis Ababa blue-and-white share taxi | *Minibus taxi in Addis Ababa.jpg* by **Radosław Botev** | CC BY 3.0 PL | Studied Toyota HiAce blue/white beltline split, sliding rail, Code-3 AA plate |

---

## Verified vs. Approximated Notes

- **Verified:**
  - Exact street geometry, bends, dual-carriageway splits, and `oneway=yes` restrictions for Kenya Street, Tesema Aba Kemaw Street, and Fitawrari Habte Giorgis Street.
  - Exact positions and side-of-road placement for **Anwar Grand Mosque** (way `42656246`), **St. Raguel Church** (way `42656245`), **Yirga Haile Building** (`49870440`), **Tana Business Center** (`49911431`), **Addis Ababa Business Center** (`49911434`), and the OSM `share_taxi=yes` stop platforms (`Cinema Ras`, `Grand Anwar Mosque`, `Raguel Church`, `Gojam Berenda`, `Autobis Tera`).
  - Anwar Grand Mosque architectural colors (whitewashed colonnade, emerald-green scalloped roofline, teal domes, cream stone minaret, foreground electronics shop row) and Ethiopian blue-and-white HiAce livery.
  - Everyday Addis Ababa minibus Amharic phrases (*"ወራጅ አለ!"* / *"Weraj ale!"*, *"ጋር ያቁሙ"* / *"gar yakumu"*, *"እናመሰግናለን"* / *"Enamesegnalen"*).
- **Approximated:**
  - **St. Raguel Church (Merkato) Exterior Facade:** Because openly licensed street-level exterior photos of Merkato's Debre Hail St. Raguel Church are scarce in open repositories, its 3D model uses an authentic Ethiopian Orthodox octagonal highland-stone sanctuary with tiered roof, golden processional cross, and perimeter compound wall placed on its exact OSM footprint.
  - **Surrounding Shopfront Signage & Upper Floors:** Individual shop names along generic footprints use representative Merkato shop signage (*shamma*, electronics, *berbere/buna*, hardware) in Amharic and English rather than exhaustive per-stall photography.
  - **Route Service Designation:** Labeled `"Game route"` because while individual `share_taxi=yes` stops along these streets are verified in OSM, the exact closed-loop sequence is designed as a cohesive 5–8 minute playable mission.
