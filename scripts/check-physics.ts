import { AU_KM, CLOSE_APPROACH_JD, KM_S_PER_AU_DAY } from '../src/physics/constants.ts'
import { earthState } from '../src/physics/ephemeris.ts'
import { DEFAULT_PARAMS, buildTrajectory, osculating, sampleTrajectory, type Trajectory } from '../src/physics/apophis.ts'
import { subPoint } from '../src/physics/earthRotation.ts'
import { deg } from '../src/physics/kepler.ts'
import { norm, sub } from '../src/physics/vec.ts'

let failed = false
function check(ok: boolean, msg: string) {
  console.log(`${ok ? '✓' : '✗'} ${msg}`)
  if (!ok) failed = true
}

function minDistance(tr: Trajectory) {
  let best = { d: Infinity, t: 0 }
  for (let t = CLOSE_APPROACH_JD - 1; t <= Math.min(tr.end, CLOSE_APPROACH_JD + 1); t += 1 / 1440) {
    const d = norm(sub(sampleTrajectory(tr, t).r, earthState(t).r)) * AU_KM
    if (d < best.d) best = { d, t }
  }
  return best
}

// 1) Varsayılan (JPL) senaryo
const t0 = performance.now()
const tr = buildTrajectory()
console.log(`entegrasyon: ${tr.t.length} adım, ${(performance.now() - t0).toFixed(0)} ms`)
const f = tr.flyby
console.log(`v∞ = ${(f.vInf * KM_S_PER_AU_DAY).toFixed(3)} km/s, e = ${f.e.toFixed(3)}, δ = ${deg(f.deflection).toFixed(2)}°, vp = ${(f.vp * KM_S_PER_AU_DAY).toFixed(3)} km/s`)
const best = minDistance(tr)
check(Math.abs(best.d - 38012) < 300, `en yakın mesafe ${best.d.toFixed(0)} km (Δt = ${((best.t - CLOSE_APPROACH_JD) * 1440).toFixed(1)} dk)`)
const pre = osculating(tr, CLOSE_APPROACH_JD - 60)
const post = osculating(tr, CLOSE_APPROACH_JD + 60)
console.log(`  önce: a=${pre.a.toFixed(4)} e=${pre.e.toFixed(4)} i=${deg(pre.i).toFixed(3)}°`)
console.log(`  sonra: a=${post.a.toFixed(4)} e=${post.e.toFixed(4)} i=${deg(post.i).toFixed(3)}°`)
check(Math.abs(pre.a - 0.9224) < 0.005, 'geçiş öncesi a ≈ 0,922 AU (Aten)')
check(post.a > 1.09 && post.a < 1.12, 'geçiş sonrası a ≈ 1,10 AU (Apollo)')
check(tr.impact === null, 'çarpma yok')
const sp = subPoint(sub(sampleTrajectory(tr, CLOSE_APPROACH_JD).r, earthState(CLOSE_APPROACH_JD).r), CLOSE_APPROACH_JD)
console.log(`  alt nokta: enlem ${sp.lat.toFixed(1)}°, boylam ${sp.lon.toFixed(1)}°`)

// 2) Dünya çekimi kapalı: yörünge değişmemeli
const free = buildTrajectory({ ...DEFAULT_PARAMS, earthMassFactor: 0 })
const fpre = osculating(free, CLOSE_APPROACH_JD - 60), fpost = osculating(free, CLOSE_APPROACH_JD + 60)
check(Math.abs(fpre.a - fpost.a) < 1e-6, `μ⊕ = 0: a değişmez (${fpre.a.toFixed(5)} → ${fpost.a.toFixed(5)})`)

// 3) Çarpma senaryosu
const hit = buildTrajectory({ ...DEFAULT_PARAMS, rpKm: 3000 })
check(hit.impact !== null && hit.impact.jd < CLOSE_APPROACH_JD, 'r_p = 3000 km: çarpma algılandı')
if (hit.impact) {
  const d = norm(sub(sampleTrajectory(hit, hit.impact.jd).r, earthState(hit.impact.jd).r)) * AU_KM
  check(Math.abs(d - 6378.137) < 1, `çarpma noktası yüzeyde (${d.toFixed(2)} km)`)
  const vExpected = Math.sqrt(5.9 ** 2 + 2 * 398600.4 / 6378.137)
  check(Math.abs(hit.impact.speedKmS - vExpected) < 0.1, `çarpma hızı ${hit.impact.speedKmS.toFixed(2)} km/s ≈ √(v∞² + 2μ⊕/R⊕) = ${vExpected.toFixed(2)}`)
  console.log(`  çarpma: ${((CLOSE_APPROACH_JD - hit.impact.jd) * 1440).toFixed(1)} dk önce, ${hit.impact.lat.toFixed(1)}°, ${hit.impact.lon.toFixed(1)}°`)
}

if (failed) process.exit(1)
