import {
  CLOSE_APPROACH_JD,
  CLOSE_APPROACH_KM,
  AU_KM,
  DEG,
  EARTH_RADIUS_KM,
  KM_S_PER_AU_DAY,
  MU_EARTH,
  MU_SUN,
} from './constants.ts'
import { subPoint } from './earthRotation.ts'
import { earthState } from './ephemeris.ts'
import { integrate } from './integrator.ts'
import { type Elements, type State, elementsToState, stateToElements, trueToMean } from './kepler.ts'
import { type Vec3, add, cross, dot, norm, scale, sub, unit } from './vec.ts'

/**
 * Apophis (99942) geçiş öncesi oskülatör elemanları (JPL SBDB, yaklaşık).
 * Ortalama anomali, yakın geçiş anında asteroid yörüngesinin çıkış
 * düğümünde (Dünya'nın yörünge düzlemini kestiği nokta) olacağı şekilde seçilir.
 */
const PRE_A = 0.92238
const PRE_E = 0.19117
const PRE_I = 3.3366 * DEG
const PRE_NODE = 203.957 * DEG
const PRE_PERI = 126.664 * DEG

export const preFlybyElements: Elements = {
  a: PRE_A,
  e: PRE_E,
  i: PRE_I,
  node: PRE_NODE,
  peri: PRE_PERI,
  M: trueToMean(-PRE_PERI, PRE_E), // u = ω + ν = 0 → düğümde
}

/** Kullanıcının değiştirebileceği senaryo parametreleri. */
export interface FlybyParams {
  /** Dünya merkezinden en yakın geçiş mesafesi [km] (iki cisim hiperbolünün yerberisi) */
  rpKm: number
  /** Sonsuzdaki göreli hız v∞ [km/s] */
  vInfKmS: number
  /**
   * Çarpma parametresi yönü: v∞'a dik düzlemde açı [derece]. Varsayılan değer,
   * geçiş sonrası elemanların JPL tahminine (a ≈ 1,10 AU, e ≈ 0,19, i ≈ 2,2°;
   * Apollo sınıfı) yakın çıkacağı biçimde ayarlandı — asteroit Dünya'nın
   * arkasından geçerek enerji kazanır.
   */
  impactAngleDeg: number
  /** Dünya kütlesi çarpanı (0 = Dünya çekimi yok) */
  earthMassFactor: number
}

/** Kepler yörüngelerinden çıkan doğal v∞ (Apophis − Dünya hız farkı). */
function naturalVInf() {
  const earth = earthState(CLOSE_APPROACH_JD)
  const ast = elementsToState(preFlybyElements, MU_SUN)
  return sub(ast.v, earth.v)
}

export const DEFAULT_PARAMS: FlybyParams = {
  rpKm: CLOSE_APPROACH_KM,
  vInfKmS: Math.round(norm(naturalVInf()) * KM_S_PER_AU_DAY * 100) / 100,
  impactAngleDeg: 276,
  earthMassFactor: 1,
}

export interface FlybyGeometry {
  muEarth: number // [AU³/gün²]
  vInf: number // [AU/gün]
  rp: number // [AU]
  vp: number // [AU/gün]
  e: number // hiperbolik dışmerkezlik (μ⊕ = 0 ise ∞)
  deflection: number // sapma açısı δ [rad]
  stateAtPerigee: State // güneş merkezli
}

/** İki cisim (Dünya–Apophis) hiperbolik geçiş geometrisi. */
export function flybyGeometry(params: FlybyParams = DEFAULT_PARAMS): FlybyGeometry {
  const jd = CLOSE_APPROACH_JD
  const earth = earthState(jd)
  const muEarth = MU_EARTH * params.earthMassFactor
  const vh = unit(naturalVInf())
  const vInf = params.vInfKmS / KM_S_PER_AU_DAY
  const rp = params.rpKm / AU_KM
  const e = muEarth > 0 ? 1 + (rp * vInf * vInf) / muEarth : Infinity
  const vp = Math.sqrt(vInf * vInf + (2 * muEarth) / rp)
  const deflection = 2 * Math.asin(1 / e)

  // Çarpma parametresi yönü b̂ ⊥ v̂∞: b1 ekliptik kuzeyine en yakın, b2 = v̂∞ × b1
  const angle = params.impactAngleDeg * DEG
  const z: Vec3 = [0, 0, 1]
  const b1 = unit(sub(z, scale(vh, dot(z, vh))))
  const b2 = cross(vh, b1)
  const bHat = add(scale(b1, Math.cos(angle)), scale(b2, Math.sin(angle)))

  // Yerberi, asimptotların açıortayında: r̂p = sin(δ/2)·v̂∞ + cos(δ/2)·b̂,
  // yerberi hızı ona dik: v̂p = cos(δ/2)·v̂∞ − sin(δ/2)·b̂
  const c = Math.cos(deflection / 2), s = Math.sin(deflection / 2)
  const rRel = scale(add(scale(vh, s), scale(bHat, c)), rp)
  const vRel = scale(sub(scale(vh, c), scale(bHat, s)), vp)

  return {
    muEarth,
    vInf,
    rp,
    vp,
    e,
    deflection,
    stateAtPerigee: { r: add(earth.r, rRel), v: add(earth.v, vRel) },
  }
}

/** Güneş + Dünya çekimi altında Apophis'in hareket denklemi (güneş merkezli). */
const makeDerivative = (muEarth: number) => (t: number, y: Float64Array): Float64Array => {
  const e = earthState(t).r
  const rx = y[0], ry = y[1], rz = y[2]
  const r3 = (rx * rx + ry * ry + rz * rz) ** 1.5
  const dx = rx - e[0], dy = ry - e[1], dz = rz - e[2]
  const d3 = (dx * dx + dy * dy + dz * dz) ** 1.5
  const e3 = (e[0] * e[0] + e[1] * e[1] + e[2] * e[2]) ** 1.5
  const out = new Float64Array(6)
  out[0] = y[3]
  out[1] = y[4]
  out[2] = y[5]
  // r̈ = −μ☉ r/|r|³ − μ⊕ (r − r⊕)/|r − r⊕|³ − μ⊕ r⊕/|r⊕|³ (dolaylı terim)
  out[3] = -MU_SUN * rx / r3 - muEarth * (dx / d3 + e[0] / e3)
  out[4] = -MU_SUN * ry / r3 - muEarth * (dy / d3 + e[1] / e3)
  out[5] = -MU_SUN * rz / r3 - muEarth * (dz / d3 + e[2] / e3)
  return out
}

export interface Impact {
  jd: number
  lat: number
  lon: number
  /** Yüzeye çarpma anındaki göreli hız [km/s] */
  speedKmS: number
}

export interface Trajectory {
  t: Float64Array
  /** x,y,z,vx,vy,vz ardışık */
  s: Float64Array
  start: number
  end: number
  params: FlybyParams
  flyby: FlybyGeometry
  /** Dünya yüzeyine çarpma (varsa yörünge bu anda biter) */
  impact: Impact | null
}

function maxStep(t: number, y: Float64Array) {
  const e = earthState(t).r
  const d = Math.hypot(y[0] - e[0], y[1] - e[1], y[2] - e[2])
  return Math.min(2, Math.max(0.0002, d * 5))
}

const EARTH_RADIUS_AU = EARTH_RADIUS_KM / AU_KM

/** Yakın geçiş anından geriye ve ileriye sayısal entegrasyon. */
export function buildTrajectory(params: FlybyParams = DEFAULT_PARAMS, yearsBefore = 5.5, yearsAfter = 7): Trajectory {
  const flyby = flybyGeometry(params)
  const f = makeDerivative(flyby.muEarth)
  const t0 = CLOSE_APPROACH_JD
  const y0 = Float64Array.from([...flyby.stateAtPerigee.r, ...flyby.stateAtPerigee.v])
  const back: { t: number; y: Float64Array }[] = []
  const fwd: { t: number; y: Float64Array }[] = []
  integrate(f, t0, y0, t0 - yearsBefore * 365.25, {
    maxStep,
    onStep: (t, y) => back.push({ t, y: Float64Array.from(y) }),
  })
  back.reverse()

  // Yerberi Dünya'nın içindeyse: geçmişten gelirken yüzeye ilk değdiği an çarpmadır.
  let impact: Impact | null = null
  let all = back
  if (params.rpKm <= EARTH_RADIUS_KM) {
    const inside = (p: { t: number; y: Float64Array }) => {
      const e = earthState(p.t).r
      return Math.hypot(p.y[0] - e[0], p.y[1] - e[1], p.y[2] - e[2]) <= EARTH_RADIUS_AU
    }
    const k = Math.max(1, back.findIndex(inside))
    // Yüzeyi iki adım arasında ikiye bölme ile bul
    let lo = back[k - 1].t, hi = back[k].t
    const tmp = { t: 0, y: new Float64Array(6) }
    for (let it = 0; it < 40; it++) {
      const mid = (lo + hi) / 2
      const st = hermite(back[k - 1], back[k], mid)
      tmp.t = mid
      tmp.y.set([...st.r, ...st.v])
      if (inside(tmp)) hi = mid
      else lo = mid
    }
    const hit = hermite(back[k - 1], back[k], hi)
    all = [...back.slice(0, k), { t: hi, y: Float64Array.from([...hit.r, ...hit.v]) }]
    const earthHit = earthState(hi)
    const sp = subPoint(sub(hit.r, earthHit.r), hi)
    impact = { jd: hi, ...sp, speedKmS: norm(sub(hit.v, earthHit.v)) * KM_S_PER_AU_DAY }
  } else {
    integrate(f, t0, y0, t0 + yearsAfter * 365.25, {
      maxStep,
      onStep: (t, y) => fwd.push({ t, y: Float64Array.from(y) }),
    })
    all = [...back, ...fwd.slice(1)]
  }

  const t = new Float64Array(all.length)
  const s = new Float64Array(all.length * 6)
  all.forEach((p, k) => {
    t[k] = p.t
    s.set(p.y, k * 6)
  })
  return { t, s, start: t[0], end: t[t.length - 1], params, flyby, impact }
}

function hermite(a: { t: number; y: Float64Array }, b: { t: number; y: Float64Array }, jd: number): State {
  const tr = {
    t: Float64Array.of(a.t, b.t),
    s: Float64Array.from([...a.y, ...b.y]),
    start: a.t,
    end: b.t,
  } as Trajectory
  return sampleTrajectory(tr, jd)
}

/** Kübik Hermite enterpolasyonu ile t anındaki durum. */
export function sampleTrajectory(tr: Pick<Trajectory, 't' | 's' | 'start' | 'end'>, jd: number): State {
  const { t, s } = tr
  jd = Math.min(Math.max(jd, tr.start), tr.end)
  let lo = 0, hi = t.length - 1
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1
    if (t[mid] <= jd) lo = mid
    else hi = mid
  }
  const h = t[hi] - t[lo] || 1
  const u = (jd - t[lo]) / h
  const h00 = 2 * u ** 3 - 3 * u ** 2 + 1, h10 = u ** 3 - 2 * u ** 2 + u
  const h01 = -2 * u ** 3 + 3 * u ** 2, h11 = u ** 3 - u ** 2
  const d00 = (6 * u ** 2 - 6 * u) / h, d10 = 3 * u ** 2 - 4 * u + 1
  const d01 = (-6 * u ** 2 + 6 * u) / h, d11 = 3 * u ** 2 - 2 * u
  const r: Vec3 = [0, 0, 0], v: Vec3 = [0, 0, 0]
  const a = lo * 6, b = hi * 6
  for (let j = 0; j < 3; j++) {
    r[j] = h00 * s[a + j] + h10 * h * s[a + 3 + j] + h01 * s[b + j] + h11 * h * s[b + 3 + j]
    v[j] = d00 * s[a + j] + d10 * s[a + 3 + j] + d01 * s[b + j] + d11 * s[b + 3 + j]
  }
  return { r, v }
}

/** Güneş merkezli oskülatör elemanlar (Dünya'dan uzakken anlamlı). */
export function osculating(tr: Trajectory, jd: number): Elements {
  return stateToElements(sampleTrajectory(tr, jd), MU_SUN)
}
