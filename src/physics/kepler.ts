import { DEG } from './constants.ts'
import { type Vec3, cross, dot, norm, scale, sub } from './vec.ts'

/** Klasik yörünge elemanları (açılar radyan). */
export interface Elements {
  a: number // yarı büyük eksen [AU]
  e: number // dışmerkezlik
  i: number // eğim
  node: number // Ω, çıkış düğümü boylamı
  peri: number // ω, günberi argümanı
  M: number // ortalama anomali
}

export interface State {
  r: Vec3
  v: Vec3
}

/** Kepler denklemi M = E − e·sin E, Newton–Raphson ile. */
export function solveKepler(M: number, e: number): number {
  M = ((M % (2 * Math.PI)) + 3 * Math.PI) % (2 * Math.PI) - Math.PI
  let E = e < 0.8 ? M : Math.PI * Math.sign(M || 1)
  for (let k = 0; k < 50; k++) {
    const dE = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E))
    E -= dE
    if (Math.abs(dE) < 1e-14) break
  }
  return E
}

/** Perifokal → ekliptik dönüşümü: R_z(Ω)·R_x(i)·R_z(ω) */
function perifocalToEcliptic(x: number, y: number, el: Elements): Vec3 {
  const cO = Math.cos(el.node), sO = Math.sin(el.node)
  const ci = Math.cos(el.i), si = Math.sin(el.i)
  const cw = Math.cos(el.peri), sw = Math.sin(el.peri)
  return [
    (cO * cw - sO * sw * ci) * x + (-cO * sw - sO * cw * ci) * y,
    (sO * cw + cO * sw * ci) * x + (-sO * sw + cO * cw * ci) * y,
    sw * si * x + cw * si * y,
  ]
}

/** Eliptik yörünge elemanlarından konum ve hız. */
export function elementsToState(el: Elements, mu: number): State {
  const E = solveKepler(el.M, el.e)
  const cE = Math.cos(E), sE = Math.sin(E)
  const b = el.a * Math.sqrt(1 - el.e * el.e)
  const n = Math.sqrt(mu / el.a ** 3)
  const r = el.a * (1 - el.e * cE)
  const x = el.a * (cE - el.e)
  const y = b * sE
  const vx = (-el.a * n * sE * el.a) / r
  const vy = (b * n * cE * el.a) / r
  return { r: perifocalToEcliptic(x, y, el), v: perifocalToEcliptic(vx, vy, el) }
}

/** Konum/hızdan oskülatör elemanlar (eliptik veya hiperbolik). */
export function stateToElements({ r, v }: State, mu: number): Elements {
  const rn = norm(r)
  const h = cross(r, v)
  const hn = norm(h)
  const nodeVec: Vec3 = [-h[1], h[0], 0]
  const nn = norm(nodeVec)
  const eVec = sub(scale(cross(v, h), 1 / mu), scale(r, 1 / rn))
  const e = norm(eVec)
  const energy = dot(v, v) / 2 - mu / rn
  const a = -mu / (2 * energy)
  const i = Math.acos(h[2] / hn)
  let node = nn > 1e-12 ? Math.acos(nodeVec[0] / nn) : 0
  if (nodeVec[1] < 0) node = 2 * Math.PI - node
  let peri = nn > 1e-12 && e > 1e-12 ? Math.acos(Math.max(-1, Math.min(1, dot(nodeVec, eVec) / (nn * e)))) : 0
  if (eVec[2] < 0) peri = 2 * Math.PI - peri
  let nu = Math.acos(Math.max(-1, Math.min(1, dot(eVec, r) / (e * rn))))
  if (dot(r, v) < 0) nu = 2 * Math.PI - nu
  let M: number
  if (e < 1) {
    const E = 2 * Math.atan2(Math.sqrt(1 - e) * Math.sin(nu / 2), Math.sqrt(1 + e) * Math.cos(nu / 2))
    M = E - e * Math.sin(E)
  } else {
    const F = 2 * Math.atanh(Math.sqrt((e - 1) / (e + 1)) * Math.tan(nu / 2))
    M = e * Math.sinh(F) - F
  }
  return { a, e, i, node, peri, M }
}

/** Gerçek anomaliden ortalama anomali (eliptik). */
export function trueToMean(nu: number, e: number): number {
  const E = 2 * Math.atan2(Math.sqrt(1 - e) * Math.sin(nu / 2), Math.sqrt(1 + e) * Math.cos(nu / 2))
  return E - e * Math.sin(E)
}

/** Yörünge elipsini çizim için örnekler. */
export function orbitPoints(el: Elements, segments = 360): Vec3[] {
  const pts: Vec3[] = []
  const b = el.a * Math.sqrt(1 - el.e * el.e)
  for (let k = 0; k <= segments; k++) {
    const E = (k / segments) * 2 * Math.PI
    pts.push(perifocalToEcliptic(el.a * (Math.cos(E) - el.e), b * Math.sin(E), el))
  }
  return pts
}

export const deg = (rad: number) => rad / DEG
