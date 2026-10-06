import { create } from 'zustand'
import { DEFAULT_PARAMS, type FlybyParams, type Trajectory, buildTrajectory } from './physics/apophis.ts'
import { dateToJD } from './physics/constants.ts'

export type View = 'helio' | 'geo'
export type Follow = 'sun' | 'earth' | 'apophis'

/** Gerçek zaman: 1 saniyede 1 saniye [gün/s] */
export const REALTIME = 1 / 86400

/** Simülasyon hızı seçenekleri [gün / saniye] */
export const RATES = [
  { label: '1× (gerçek zaman)', value: REALTIME },
  { label: '60× · 1 dk/s', value: 60 * REALTIME },
  { label: '600× · 10 dk/s', value: 600 * REALTIME },
  { label: '3 600× · 1 sa/s', value: 1 / 24 },
  { label: '21 600× · 6 sa/s', value: 0.25 },
  { label: '1 gün/s', value: 1 },
  { label: '10 gün/s', value: 10 },
  { label: '30 gün/s', value: 30 },
]

export const nowJD = () => dateToJD(new Date())

interface SimState {
  jd: number
  playing: boolean
  rate: number
  /** Geri yönde akış */
  reverse: boolean
  /** Canlı: simülasyon saati duvar saatine kilitli */
  live: boolean
  view: View
  follow: Follow
  params: FlybyParams
  trajectory: Trajectory
  setJd: (jd: number) => void
  setPlaying: (p: boolean) => void
  setRate: (r: number) => void
  setReverse: (r: boolean) => void
  setView: (v: View) => void
  setFollow: (f: Follow) => void
  setParams: (p: Partial<FlybyParams>) => void
  resetParams: () => void
  goLive: () => void
  jumpTo: (jd: number, view?: View, rate?: number) => void
}

export const useSim = create<SimState>((set, get) => {
  const clamp = (jd: number) => {
    const tr = get().trajectory
    return Math.min(Math.max(jd, tr.start), tr.end)
  }

  // Parametre değişince yeniden entegrasyon; kaydırıcı sürüklenirken kareler birleştirilir.
  let pending = 0
  const rebuild = () => {
    cancelAnimationFrame(pending)
    pending = requestAnimationFrame(() => {
      const trajectory = buildTrajectory(get().params)
      set({ trajectory, jd: Math.min(Math.max(get().jd, trajectory.start), trajectory.end) })
    })
  }

  return {
    jd: nowJD(),
    playing: true,
    rate: REALTIME,
    reverse: false,
    live: true,
    view: 'helio',
    follow: 'sun',
    params: DEFAULT_PARAMS,
    trajectory: buildTrajectory(DEFAULT_PARAMS),
    setJd: (jd) => set({ jd: clamp(jd), live: false }),
    setPlaying: (playing) => set({ playing, live: false }),
    setRate: (rate) => set({ rate, live: false }),
    setReverse: (reverse) => set({ reverse, live: false }),
    setView: (view) => set({ view, follow: view === 'geo' ? 'earth' : get().follow }),
    setFollow: (follow) => set({ follow }),
    setParams: (p) => {
      set({ params: { ...get().params, ...p } })
      rebuild()
    },
    resetParams: () => {
      set({ params: DEFAULT_PARAMS })
      rebuild()
    },
    goLive: () => set({ jd: clamp(nowJD()), rate: REALTIME, reverse: false, playing: true, live: true }),
    jumpTo: (jd, view, rate) =>
      set({
        jd: clamp(jd),
        live: false,
        playing: true,
        reverse: false,
        ...(view ? { view, follow: view === 'geo' ? 'earth' : get().follow } : {}),
        ...(rate ? { rate } : {}),
      }),
  }
})
