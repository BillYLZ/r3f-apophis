import { DEG, J2000 } from './constants.ts'
import type { Vec3 } from './vec.ts'

/** Ekliptik eğikliği ε (J2000) */
export const OBLIQUITY = 23.4392911 * DEG

/** Greenwich ortalama yıldız zamanı [rad] */
export function gmst(jd: number): number {
  const deg = 280.46061837 + 360.98564736629 * (jd - J2000)
  return (((deg % 360) + 360) % 360) * DEG
}

/** Yer merkezli ekliptik vektörün altındaki coğrafi enlem/boylam [derece]. */
export function subPoint(rEcl: Vec3, jd: number): { lat: number; lon: number } {
  const ce = Math.cos(OBLIQUITY), se = Math.sin(OBLIQUITY)
  const x = rEcl[0]
  const y = rEcl[1] * ce - rEcl[2] * se
  const z = rEcl[1] * se + rEcl[2] * ce
  const ra = Math.atan2(y, x)
  const dec = Math.atan2(z, Math.hypot(x, y))
  let lon = (ra - gmst(jd)) / DEG
  lon = ((lon + 540) % 360) - 180
  return { lat: dec / DEG, lon }
}
