import { DEG, EARTH_MOON_MASS_RATIO, J2000, MU_SUN } from './constants.ts'
import { moonGeocentric } from './moon.ts'
import { type Elements, type State, elementsToState } from './kepler.ts'
import type { Vec3 } from './vec.ts'

/**
 * Dünya–Ay ağırlık merkezi, Standish (JPL) J2000 ortalama elemanları,
 * 1800–2050 için geçerli. Ekliptik J2000 çerçevesi.
 */
export function earthElements(jd: number): Elements {
  const T = (jd - J2000) / 36525
  const a = 1.00000261 + 0.00000562 * T
  const e = 0.01671123 - 0.00004392 * T
  const i = (-0.00001531 - 0.01294668 * T) * DEG
  const L = (100.46457166 + 35999.37244981 * T) * DEG
  const varpi = (102.93768193 + 0.32327364 * T) * DEG
  const node = 0
  return { a, e, i, node, peri: varpi - node, M: L - varpi }
}

/** Dünya–Ay ağırlık merkezinin (EMB) güneş merkezli durumu. */
export function embState(jd: number): State {
  return elementsToState(earthElements(jd), MU_SUN)
}

/** Dünya merkezinin EMB'den kayması: r⊕ = r_EMB − μ☾/(μ⊕+μ☾) · r☾⊕ */
const MOON_FRACTION = 1 / (1 + EARTH_MOON_MASS_RATIO)
const DT = 0.01 // Ay hızı için merkezi fark adımı [gün]

/** Dünya merkezinin güneş merkezli konumu ve hızı (Ay'ın yarattığı yalpalama dahil). */
export function earthState(jd: number): State {
  const emb = embState(jd)
  const m = moonGeocentric(jd)
  const m1 = moonGeocentric(jd + DT), m0 = moonGeocentric(jd - DT)
  return {
    r: [emb.r[0] - MOON_FRACTION * m[0], emb.r[1] - MOON_FRACTION * m[1], emb.r[2] - MOON_FRACTION * m[2]],
    v: [
      emb.v[0] - (MOON_FRACTION * (m1[0] - m0[0])) / (2 * DT),
      emb.v[1] - (MOON_FRACTION * (m1[1] - m0[1])) / (2 * DT),
      emb.v[2] - (MOON_FRACTION * (m1[2] - m0[2])) / (2 * DT),
    ],
  }
}

/** Entegrasyon için: Dünya ve Ay'ın güneş merkezli konumları (tek Ay hesabıyla). */
let cacheJd = NaN
let cache: { earth: Vec3; moon: Vec3 } = { earth: [0, 0, 0], moon: [0, 0, 0] }
export function earthMoonPositions(jd: number): { earth: Vec3; moon: Vec3 } {
  // Aynı an için art arda çağrılar (adım kontrolü + türev) tek hesap yapar
  if (jd === cacheJd) return cache
  const emb = embState(jd).r
  const m = moonGeocentric(jd)
  const earth: Vec3 = [emb[0] - MOON_FRACTION * m[0], emb[1] - MOON_FRACTION * m[1], emb[2] - MOON_FRACTION * m[2]]
  cacheJd = jd
  cache = { earth, moon: [earth[0] + m[0], earth[1] + m[1], earth[2] + m[2]] }
  return cache
}

export { moonGeocentric }
