import { create } from 'zustand'
import { CLOSE_APPROACH_JD } from './physics/constants.ts'
import { trajectory } from './trajectory.ts'

export type View = 'helio' | 'geo'

/** Simülasyon hızı seçenekleri [gün / saniye] */
export const RATES = [
  { label: '1 dk/s', value: 1 / 1440 },
  { label: '10 dk/s', value: 10 / 1440 },
  { label: '1 sa/s', value: 1 / 24 },
  { label: '6 sa/s', value: 0.25 },
  { label: '1 gün/s', value: 1 },
  { label: '10 gün/s', value: 10 },
  { label: '30 gün/s', value: 30 },
]

interface SimState {
  jd: number
  playing: boolean
  rate: number
  view: View
  setJd: (jd: number) => void
  setPlaying: (p: boolean) => void
  setRate: (r: number) => void
  setView: (v: View) => void
  jumpToFlyby: () => void
}

const clamp = (jd: number) => Math.min(Math.max(jd, trajectory.start), trajectory.end)

export const useSim = create<SimState>((set) => ({
  jd: CLOSE_APPROACH_JD - 330,
  playing: true,
  rate: 10,
  view: 'helio',
  setJd: (jd) => set({ jd: clamp(jd) }),
  setPlaying: (playing) => set({ playing }),
  setRate: (rate) => set({ rate }),
  setView: (view) => set({ view }),
  jumpToFlyby: () => set({ jd: CLOSE_APPROACH_JD - 0.5, view: 'geo', rate: 1 / 24, playing: true }),
}))
