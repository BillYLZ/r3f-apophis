import { sampleTrajectory } from '../physics/apophis.ts'
import { AU_KM, CLOSE_APPROACH_JD, EARTH_RADIUS_KM, KM_S_PER_AU_DAY, MU_EARTH, MU_SUN, jdToDate } from '../physics/constants.ts'
import { subPoint } from '../physics/earthRotation.ts'
import { earthState } from '../physics/ephemeris.ts'
import { deg, stateToElements } from '../physics/kepler.ts'
import { norm, sub } from '../physics/vec.ts'
import { useSim } from '../store.ts'
import { trajectory } from '../trajectory.ts'

const LD_KM = 384400
const fmt = (x: number, d = 0) => x.toLocaleString('tr-TR', { minimumFractionDigits: d, maximumFractionDigits: d })

/** Dünya'nın Hill küresi ≈ 0,01 AU: içinde yer merkezli, dışında güneş merkezli elemanlar. */
const HILL_AU = 0.01

/** Yakın geçişe kalan / geçen süre, ör. "T − 3 g 4 sa 12 dk" */
function countdown(jd: number): string {
  const dt = jd - CLOSE_APPROACH_JD
  let m = Math.round(Math.abs(dt) * 1440)
  const d = Math.floor(m / 1440); m -= d * 1440
  const h = Math.floor(m / 60); m -= h * 60
  return `T ${dt < 0 ? '−' : '+'} ${d ? `${d} g ` : ''}${h} sa ${m} dk`
}

export function Hud() {
  const jd = useSim((s) => s.jd)
  const ast = sampleTrajectory(trajectory, jd)
  const earth = earthState(jd)
  const rel = { r: sub(ast.r, earth.r), v: sub(ast.v, earth.v) }
  const dAu = norm(rel.r)
  const dKm = dAu * AU_KM
  const vRel = norm(rel.v) * KM_S_PER_AU_DAY
  const near = dAu < HILL_AU
  const el = near ? stateToElements(rel, MU_EARTH) : stateToElements(ast, MU_SUN)
  const sp = subPoint(rel.r, jd)
  const date = jdToDate(jd)

  return (
    <div className="panel hud">
      <h1>99942 Apophis</h1>
      <div className="date">{date.toISOString().slice(0, 16).replace('T', ' ')} UTC</div>
      <table>
        <tbody>
          {Math.abs(jd - CLOSE_APPROACH_JD) < 30 && <tr><th>En yakın geçiş</th><td>{countdown(jd)}</td></tr>}
          <tr><th>Dünya'ya uzaklık</th><td>{dKm < 2e6 ? `${fmt(dKm)} km` : `${fmt(dAu, 4)} AU`}</td></tr>
          <tr><th></th><td className="dim">{fmt(dKm / LD_KM, 2)} Ay mesafesi · {fmt(dKm / EARTH_RADIUS_KM, 1)} R⊕</td></tr>
          <tr><th>Göreli hız</th><td>{fmt(vRel, 2)} km/s</td></tr>
          <tr><th>Güneş'e uzaklık</th><td>{fmt(norm(ast.r), 4)} AU</td></tr>
          {dKm < 400000 && (
            <tr><th>Altındaki nokta</th><td>{fmt(Math.abs(sp.lat), 1)}°{sp.lat >= 0 ? 'K' : 'G'} {fmt(Math.abs(sp.lon), 1)}°{sp.lon >= 0 ? 'D' : 'B'}</td></tr>
          )}
        </tbody>
      </table>
      <h2>{near ? 'Yer merkezli oskülatör yörünge (hiperbol)' : 'Güneş merkezli oskülatör yörünge'}</h2>
      <table>
        <tbody>
          <tr><th>a</th><td>{near ? `${fmt(el.a * AU_KM)} km` : `${fmt(el.a, 4)} AU`}</td></tr>
          <tr><th>e</th><td>{fmt(el.e, 4)}</td></tr>
          <tr><th>i</th><td>{fmt(deg(el.i), 3)}°</td></tr>
          {!near && <tr><th>P</th><td>{fmt(365.25 * el.a ** 1.5, 1)} gün</td></tr>}
          {!near && <tr><th>Sınıf</th><td>{el.a < 1 ? 'Aten (a < 1 AU)' : 'Apollo (a > 1 AU)'}</td></tr>}
        </tbody>
      </table>
    </div>
  )
}
