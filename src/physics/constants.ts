// Birimler: uzunluk AU, zaman gün (TDB ≈ UTC; ~70 s fark göz ardı edildi).

/** Gauss çekim sabiti k [AU^{3/2} / gün] */
export const GAUSS_K = 0.01720209895
/** Güneş çekim parametresi μ☉ = k² [AU³/gün²] */
export const MU_SUN = GAUSS_K * GAUSS_K
/** Güneş / Dünya kütle oranı (IAU 2009) */
export const SUN_EARTH_MASS_RATIO = 332946.0487
/** Dünya çekim parametresi μ⊕ [AU³/gün²] */
export const MU_EARTH = MU_SUN / SUN_EARTH_MASS_RATIO

export const AU_KM = 149597870.7
export const DAY_S = 86400
export const KM_S_PER_AU_DAY = AU_KM / DAY_S
export const EARTH_RADIUS_KM = 6378.137
export const GEO_RADIUS_KM = 42164
export const MOON_DISTANCE_KM = 384400

export const DEG = Math.PI / 180
export const J2000 = 2451545.0

/** 2029-04-13 21:46 UTC — JPL tahmini en yakın geçiş anı */
export const CLOSE_APPROACH_JD = dateToJD(new Date(Date.UTC(2029, 3, 13, 21, 46)))
/** Dünya merkezinden en yakın geçiş mesafesi (JPL tahmini ≈ 38 012 km) */
export const CLOSE_APPROACH_KM = 38012

export function dateToJD(d: Date): number {
  return d.getTime() / 86400000 + 2440587.5
}

export function jdToDate(jd: number): Date {
  return new Date((jd - 2440587.5) * 86400000)
}
