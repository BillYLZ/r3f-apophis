# r3f-apophis

Uses React Three Fiber to simulate asteroid **99942 Apophis**'s close approach to Earth on **13 April 2029**, computed from orbital mechanics equations.

```bash
npm install
npm run dev      # development server
npm test         # physics checks (Node ≥ 22)
npm run build
```

## Views

- **Solar system:** Earth's orbit, Apophis's numerically integrated path, and its osculating orbits before the flyby (orange) and after it (turquoise).
- **Near Earth:** geocentric hyperbolic path (±2.5 days), the GEO satellite belt (35,786 km), Earth rotating in real time (GMST) with a sunlit side, and the Moon.

The panel shows live distance, relative speed and the sub-point the asteroid is passing over. Inside Earth's Hill sphere it shows the geocentric (hyperbolic) osculating elements; outside it, the heliocentric ones.

## Model

| Component | Method |
|---|---|
| Earth | Kepler orbit, JPL Standish J2000 mean elements (`src/physics/ephemeris.ts`) |
| Kepler equation | `M = E − e sin E`, Newton–Raphson (`src/physics/kepler.ts`) |
| Apophis | Sun + Earth gravity, Dormand–Prince RK5(4) adaptive step (`src/physics/integrator.ts`) |
| Close approach | Initial state built from a hyperbolic flyby at perigee: `e = 1 + r_p v∞²/μ⊕`, `sin(δ/2) = 1/e` (`src/physics/apophis.ts`) |

The initial state is set at the close-approach moment (2029-04-13 21:46 UTC, 38,012 km from Earth's center) and integrated backward and forward. v∞ comes from the difference between Apophis's pre-flyby Kepler orbit and Earth's velocity (≈5.90 km/s). The orientation of the impact parameter was tuned so the post-flyby elements match JPL's forecast.

Results (`npm test`):

| | a [AU] | e | i | Class |
|---|---|---|---|---|
| Before the flyby | 0.9225 | 0.193 | 3.34° | Aten |
| After the flyby | 1.1030 | 0.191 | 2.23° | Apollo |

The sub-point at close approach comes out over the Atlantic (≈29°N, 44°W).

**Limitations:** this is an educational model. Other planets, the Moon's gravity, the Yarkovsky effect and the UTC/TDB difference are ignored. The Moon's position is for display only (a simplified mean orbit). Body sizes are exaggerated.

Earth texture: NASA Blue Marble (public domain).
