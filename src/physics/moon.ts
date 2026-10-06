import { DEG, J2000 } from './constants.ts'
import type { Vec3 } from './vec.ts'

/**
 * Ay'ın yer merkezli konumu — Meeus, "Astronomical Algorithms" Bölüm 47
 * (ELP-2000/82'nin kısaltılmış seri açılımı). Boylamda ~10″, uzaklıkta
 * ~birkaç on km doğruluk. Tarihin ekliptiğinden J2000 ekliptiğine
 * genel presesyonla (boylamda 1,39697°/yüzyıl) çevrilir; nütasyon ihmal edilir.
 */

// [D, M, M', F, Σl (1e-6°), Σr (1e-3 km)]
const LR: number[][] = [
  [0, 0, 1, 0, 6288774, -20905355],
  [2, 0, -1, 0, 1274027, -3699111],
  [2, 0, 0, 0, 658314, -2955968],
  [0, 0, 2, 0, 213618, -569925],
  [0, 1, 0, 0, -185116, 48888],
  [0, 0, 0, 2, -114332, -3149],
  [2, 0, -2, 0, 58793, 246158],
  [2, -1, -1, 0, 57066, -152138],
  [2, 0, 1, 0, 53322, -170733],
  [2, -1, 0, 0, 45758, -204586],
  [0, 1, -1, 0, -40923, -129620],
  [1, 0, 0, 0, -34720, 108743],
  [0, 1, 1, 0, -30383, 104755],
  [2, 0, 0, -2, 15327, 10321],
  [0, 0, 1, 2, -12528, 0],
  [0, 0, 1, -2, 10980, 79661],
  [4, 0, -1, 0, 10675, -34782],
  [0, 0, 3, 0, 10034, -23210],
  [4, 0, -2, 0, 8548, -21636],
  [2, 1, -1, 0, -7888, 24208],
  [2, 1, 0, 0, -6766, 30824],
  [1, 0, -1, 0, -5163, -8379],
  [1, 1, 0, 0, 4987, -16675],
  [2, -1, 1, 0, 4036, -12831],
  [2, 0, 2, 0, 3994, -10445],
  [4, 0, 0, 0, 3861, -11650],
  [2, 0, -3, 0, 3665, 14403],
  [0, 1, -2, 0, -2689, -7003],
  [2, 0, -1, 2, -2602, 0],
  [2, -1, -2, 0, 2390, 10056],
  [1, 0, 1, 0, -2348, 6322],
  [2, -2, 0, 0, 2236, -9884],
]

// [D, M, M', F, Σb (1e-6°)]
const B: number[][] = [
  [0, 0, 0, 1, 5128122],
  [0, 0, 1, 1, 280602],
  [0, 0, 1, -1, 277693],
  [2, 0, 0, -1, 173237],
  [2, 0, -1, 1, 55413],
  [2, 0, -1, -1, 46271],
  [2, 0, 0, 1, 32573],
  [0, 0, 2, 1, 17198],
  [2, 0, 1, -1, 9266],
  [0, 0, 2, -1, 8822],
  [2, -1, 0, -1, 8216],
  [2, 0, -2, -1, 4324],
  [2, 0, 1, 1, 4200],
  [2, 1, 0, -1, -3359],
  [2, -1, -1, 1, 2463],
]

/** Tarihin ekliptiğinde boylam, enlem [derece] ve uzaklık [km] (doğrulama için ayrı). */
export function moonEclipticOfDate(jd: number): { lon: number; lat: number; distKm: number } {
  const T = (jd - J2000) / 36525
  const Lp = 218.3164477 + 481267.88123421 * T
  const D = (297.8501921 + 445267.1114034 * T) * DEG
  const M = (357.5291092 + 35999.0502909 * T) * DEG
  const Mp = (134.9633964 + 477198.8675055 * T) * DEG
  const F = (93.272095 + 483202.0175233 * T) * DEG
  const E = 1 - 0.002516 * T
  const A1 = (119.75 + 131.849 * T) * DEG
  const A2 = (53.09 + 479264.29 * T) * DEG
  const A3 = (313.45 + 481266.484 * T) * DEG
  const LpR = Lp * DEG

  let sl = 0, sr = 0, sb = 0
  for (const [d, m, mp, f, l, r] of LR) {
    const arg = d * D + m * M + mp * Mp + f * F
    const e = m === 0 ? 1 : Math.abs(m) === 1 ? E : E * E
    sl += l * e * Math.sin(arg)
    sr += r * e * Math.cos(arg)
  }
  for (const [d, m, mp, f, b] of B) {
    const e = m === 0 ? 1 : Math.abs(m) === 1 ? E : E * E
    sb += b * e * Math.sin(d * D + m * M + mp * Mp + f * F)
  }
  sl += 3958 * Math.sin(A1) + 1962 * Math.sin(LpR - F) + 318 * Math.sin(A2)
  sb += -2235 * Math.sin(LpR) + 382 * Math.sin(A3) + 175 * Math.sin(A1 - F) + 175 * Math.sin(A1 + F) +
    127 * Math.sin(LpR - Mp) - 115 * Math.sin(LpR + Mp)

  return {
    lon: (((Lp + sl / 1e6) % 360) + 360) % 360,
    lat: sb / 1e6,
    distKm: 385000.56 + sr / 1000,
  }
}

/** Ay'ın yer merkezli konumu, J2000 ekliptik çerçevesi [AU]. */
export function moonGeocentric(jd: number): Vec3 {
  const { lon, lat, distKm } = moonEclipticOfDate(jd)
  const T = (jd - J2000) / 36525
  const l = (lon - 1.396971 * T) * DEG
  const b = lat * DEG
  const d = distKm / 149597870.7
  return [d * Math.cos(b) * Math.cos(l), d * Math.cos(b) * Math.sin(l), d * Math.sin(b)]
}
