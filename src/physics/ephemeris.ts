import { DEG, J2000, MU_SUN } from './constants.ts'
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

export function earthState(jd: number): State {
  return elementsToState(earthElements(jd), MU_SUN)
}

/**
 * Ay'ın yer merkezli konumu — yalnızca görselleştirme için
 * basitleştirilmiş ortalama yörünge (≈ birkaç derece doğruluk).
 */
export function moonGeocentric(jd: number): Vec3 {
  const d = jd - J2000
  const L = (218.316 + 13.176396 * d) * DEG // ortalama boylam
  const M = (134.963 + 13.064993 * d) * DEG // ortalama anomali
  const F = (93.272 + 13.22935 * d) * DEG // enlem argümanı
  const lon = L + 6.289 * DEG * Math.sin(M)
  const lat = 5.128 * DEG * Math.sin(F)
  const distKm = 385001 - 20905 * Math.cos(M)
  const distAu = distKm / 149597870.7
  return [
    distAu * Math.cos(lat) * Math.cos(lon),
    distAu * Math.cos(lat) * Math.sin(lon),
    distAu * Math.sin(lat),
  ]
}
