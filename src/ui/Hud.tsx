import { sampleTrajectory } from '../physics/apophis.ts'
import { AU_KM, CLOSE_APPROACH_JD, EARTH_RADIUS_KM, KM_S_PER_AU_DAY, MU_SUN, jdToDate } from '../physics/constants.ts'
import { subPoint } from '../physics/earthRotation.ts'
import { earthState } from '../physics/ephemeris.ts'
import { deg, stateToElements } from '../physics/kepler.ts'
import { norm, sub } from '../physics/vec.ts'
import { REALTIME, useSim } from '../store.ts'

const LD_KM = 384400
export const fmt = (x: number, d = 0) =>
  Number.isFinite(x) ? x.toLocaleString('tr-TR', { minimumFractionDigits: d, maximumFractionDigits: d }) : '∞'
export const latLon = (lat: number, lon: number) =>
  `${fmt(Math.abs(lat), 1)}°${lat >= 0 ? 'K' : 'G'} ${fmt(Math.abs(lon), 1)}°${lon >= 0 ? 'D' : 'B'}`

/** Dünya'nın Hill küresi ≈ 0,01 AU: içinde yer merkezli, dışında güneş merkezli elemanlar. */
const HILL_AU = 0.01

/** Bir ana göre süre farkı, ör. "T − 3 g 4 sa 12 dk" */
function countdown(jd: number, ref: number): string {
  const dt = jd - ref
  let m = Math.round(Math.abs(dt) * 1440)
  const d = Math.floor(m / 1440)
  m -= d * 1440
  const h = Math.floor(m / 60)
  m -= h * 60
  return `T ${dt < 0 ? '−' : '+'} ${d ? `${fmt(d)} g ` : ''}${h} sa ${m} dk`
}

export function Hud() {
  const jd = useSim((s) => s.jd)
  const live = useSim((s) => s.live)
  const rate = useSim((s) => s.rate)
  const tr = useSim((s) => s.trajectory)
  const ast = sampleTrajectory(tr, jd)
  const earth = earthState(jd)
  const rel = { r: sub(ast.r, earth.r), v: sub(ast.v, earth.v) }
  const dAu = norm(rel.r)
  const dKm = dAu * AU_KM
  const vRel = norm(rel.v) * KM_S_PER_AU_DAY
  const muE = tr.flyby.muEarth
  const near = dAu < HILL_AU && muE > 0
  const el = near ? stateToElements(rel, muE) : stateToElements(ast, MU_SUN)
  const sp = subPoint(rel.r, jd)
  const impacted = tr.impact && jd >= tr.impact.jd - 1e-6
  const iso = jdToDate(jd).toISOString()

  return (
    <div className="panel hud">
      <div className="title">
        <h1>99942 Apophis</h1>
        {live ? <span className="badge live">● CANLI</span> : rate === REALTIME ? <span className="badge">1×</span> : null}
      </div>
      <div className="date">{iso.slice(0, 10)} {iso.slice(11, 19)} UTC</div>
      {impacted ? (
        <div className="impact">
          ÇARPMA · {latLon(tr.impact!.lat, tr.impact!.lon)}
          <div className="dim">{jdToDate(tr.impact!.jd).toISOString().slice(0, 19).replace('T', ' ')} UTC · {fmt(tr.impact!.speedKmS, 2)} km/s</div>
        </div>
      ) : (
        <>
          <table>
            <tbody>
              {Math.abs(jd - CLOSE_APPROACH_JD) < 60 && (
                <tr><th>En yakın geçiş</th><td>{countdown(jd, CLOSE_APPROACH_JD)}</td></tr>
              )}
              <tr><th>Dünya'ya uzaklık</th><td>{dKm < 2e6 ? `${fmt(dKm)} km` : `${fmt(dAu, 4)} AU`}</td></tr>
              <tr><th></th><td className="dim">{fmt(dKm / LD_KM, 2)} Ay mesafesi · {fmt(dKm / EARTH_RADIUS_KM, 1)} R⊕</td></tr>
              <tr><th>Göreli hız</th><td>{fmt(vRel, 2)} km/s</td></tr>
              <tr><th>Güneş'e uzaklık</th><td>{fmt(norm(ast.r), 4)} AU</td></tr>
              {dKm < 400000 && <tr><th>Altındaki nokta</th><td>{latLon(sp.lat, sp.lon)}</td></tr>}
            </tbody>
          </table>
          <h2>{near ? 'Yer merkezli oskülatör yörünge (hiperbol)' : 'Güneş merkezli oskülatör yörünge'}</h2>
          <table>
            <tbody>
              <tr><th>a</th><td>{near ? `${fmt(el.a * AU_KM)} km` : `${fmt(el.a, 4)} AU`}</td></tr>
              <tr><th>e</th><td>{fmt(el.e, 4)}</td></tr>
              <tr><th>i</th><td>{fmt(deg(el.i), 3)}°</td></tr>
              {!near && el.e < 1 && <tr><th>P</th><td>{fmt(365.25 * el.a ** 1.5, 1)} gün</td></tr>}
              {!near && <tr><th>Sınıf</th><td>{orbitClass(el.a, el.e)}</td></tr>}
            </tbody>
          </table>
        </>
      )}
    </div>
  )
}

export function orbitClass(a: number, e: number) {
  if (e >= 1) return 'Güneş sisteminden kaçış'
  const q = a * (1 - e), Q = a * (1 + e)
  if (a < 1) return Q < 0.983 ? 'Atira (Q < 0,983 AU)' : 'Aten (a < 1 AU)'
  return q < 1.017 ? 'Apollo (a > 1 AU)' : 'Amor (q > 1,017 AU)'
}
