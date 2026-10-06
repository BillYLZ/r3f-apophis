import { AU_KM, CLOSE_APPROACH_JD, KM_S_PER_AU_DAY } from '../src/physics/constants.ts'
import { earthState } from '../src/physics/ephemeris.ts'
import { buildTrajectory, osculating, sampleTrajectory } from '../src/physics/apophis.ts'
import { deg } from '../src/physics/kepler.ts'
import { norm, sub } from '../src/physics/vec.ts'

const angle = process.argv[2] ? Number(process.argv[2]) * Math.PI / 180 : undefined
const t0 = performance.now()
const tr = buildTrajectory(4, 7, angle)
console.log(`entegrasyon: ${tr.t.length} adım, ${(performance.now() - t0).toFixed(0)} ms`)
const f = tr.flyby
console.log(`v∞ = ${(f.vInf * KM_S_PER_AU_DAY).toFixed(3)} km/s, e = ${f.e.toFixed(3)}, δ = ${deg(f.deflection).toFixed(2)}°, vp = ${(f.vp * KM_S_PER_AU_DAY).toFixed(3)} km/s`)

let best = { d: Infinity, t: 0 }
for (let t = CLOSE_APPROACH_JD - 1; t <= CLOSE_APPROACH_JD + 1; t += 1 / 1440) {
  const d = norm(sub(sampleTrajectory(tr, t).r, earthState(t).r)) * AU_KM
  if (d < best.d) best = { d, t }
}
console.log(`min mesafe ${best.d.toFixed(0)} km, Δt = ${((best.t - CLOSE_APPROACH_JD) * 1440).toFixed(1)} dk`)
for (const [label, jd] of [['önce (-60 g)', CLOSE_APPROACH_JD - 60], ['sonra (+60 g)', CLOSE_APPROACH_JD + 60]] as const) {
  const el = osculating(tr, jd)
  console.log(`${label}: a=${el.a.toFixed(4)} e=${el.e.toFixed(4)} i=${deg(el.i).toFixed(3)}° P=${(365.25 * el.a ** 1.5).toFixed(1)} g`)
}
const pre = osculating(tr, CLOSE_APPROACH_JD - 60)
if (Math.abs(pre.a - 0.9224) > 0.005) { console.error('geçiş öncesi a beklenen değerden uzak'); process.exit(1) }
if (Math.abs(best.d - 38012) > 300) { console.error('yakın geçiş mesafesi hatalı'); process.exit(1) }
const post = osculating(tr, CLOSE_APPROACH_JD + 60)
if (post.a < 1.09 || post.a > 1.12) { console.error('geçiş sonrası a beklenen değerden uzak'); process.exit(1) }
console.log('✓ fizik kontrolleri geçti')
import { subPoint } from '../src/physics/earthRotation.ts'
const sp = subPoint(sub(sampleTrajectory(tr, CLOSE_APPROACH_JD).r, earthState(CLOSE_APPROACH_JD).r), CLOSE_APPROACH_JD)
console.log(`yakın geçişte alt nokta: enlem ${sp.lat.toFixed(1)}°, boylam ${sp.lon.toFixed(1)}°`)
