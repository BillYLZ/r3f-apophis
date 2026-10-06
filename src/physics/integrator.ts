/**
 * Dormand–Prince 5(4) uyarlamalı adımlı Runge–Kutta integratörü.
 * y' = f(t, y); y = [x, y, z, vx, vy, vz]
 */
export type Deriv = (t: number, y: Float64Array) => Float64Array

const C = [0, 1 / 5, 3 / 10, 4 / 5, 8 / 9, 1, 1]
const A = [
  [],
  [1 / 5],
  [3 / 40, 9 / 40],
  [44 / 45, -56 / 15, 32 / 9],
  [19372 / 6561, -25360 / 2187, 64448 / 6561, -212 / 729],
  [9017 / 3168, -355 / 33, 46732 / 5247, 49 / 176, -5103 / 18656],
  [35 / 384, 0, 500 / 1113, 125 / 192, -2187 / 6784, 11 / 84],
]
const B5 = [35 / 384, 0, 500 / 1113, 125 / 192, -2187 / 6784, 11 / 84, 0]
const B4 = [5179 / 57600, 0, 7571 / 16695, 393 / 640, -92097 / 339200, 187 / 2100, 1 / 40]

export interface IntegrateOptions {
  rtol?: number
  atol?: number
  /** Duruma bağlı en büyük adım (ör. gezegene yakınken küçük). */
  maxStep?: (t: number, y: Float64Array) => number
  onStep: (t: number, y: Float64Array) => void
}

export function integrate(f: Deriv, t0: number, y0: Float64Array, t1: number, opts: IntegrateOptions) {
  const rtol = opts.rtol ?? 1e-11
  const atol = opts.atol ?? 1e-14
  const dir = Math.sign(t1 - t0)
  const n = y0.length
  let t = t0
  let y = Float64Array.from(y0)
  let h = dir * 1e-3
  const k: Float64Array[] = []
  const tmp = new Float64Array(n)
  opts.onStep(t, y)
  while (dir * (t1 - t) > 1e-12) {
    if (opts.maxStep) {
      const hm = opts.maxStep(t, y)
      if (Math.abs(h) > hm) h = dir * hm
    }
    if (dir * (t + h - t1) > 0) h = t1 - t
    for (let s = 0; s < 7; s++) {
      for (let j = 0; j < n; j++) {
        let acc = y[j]
        for (let m = 0; m < s; m++) acc += h * A[s][m] * k[m][j]
        tmp[j] = acc
      }
      k[s] = f(t + C[s] * h, tmp)
    }
    let err = 0
    const y5 = new Float64Array(n)
    for (let j = 0; j < n; j++) {
      let s5 = y[j], s4 = y[j]
      for (let s = 0; s < 7; s++) {
        s5 += h * B5[s] * k[s][j]
        s4 += h * B4[s] * k[s][j]
      }
      y5[j] = s5
      const sc = atol + rtol * Math.max(Math.abs(y[j]), Math.abs(s5))
      err = Math.max(err, Math.abs(s5 - s4) / sc)
    }
    if (err <= 1) {
      t += h
      y = y5
      opts.onStep(t, y)
    }
    const factor = err === 0 ? 5 : Math.min(5, Math.max(0.2, 0.9 * err ** -0.2))
    h *= factor
  }
}
