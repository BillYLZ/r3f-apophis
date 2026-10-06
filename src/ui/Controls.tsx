import { useFrame } from '@react-three/fiber'
import { CLOSE_APPROACH_JD, jdToDate } from '../physics/constants.ts'
import { RATES, useSim } from '../store.ts'
import { trajectory } from '../trajectory.ts'

/** Canvas içinde: simülasyon saatini ilerletir. */
export function SimClock() {
  useFrame((_, dt) => {
    const s = useSim.getState()
    if (!s.playing) return
    const next = s.jd + s.rate * Math.min(dt, 0.1)
    s.setJd(next)
    if (next >= trajectory.end) s.setPlaying(false)
  })
  return null
}

export function Controls() {
  const { jd, playing, rate, view, setJd, setPlaying, setRate, setView, jumpToFlyby } = useSim()
  return (
    <div className="panel controls">
      <div className="row">
        <button onClick={() => setPlaying(!playing)}>{playing ? '❚❚ Durdur' : '▶ Oynat'}</button>
        <select value={rate} onChange={(e) => setRate(Number(e.target.value))}>
          {RATES.map((r) => <option key={r.label} value={r.value}>{r.label}</option>)}
        </select>
        <div className="seg">
          <button className={view === 'helio' ? 'on' : ''} onClick={() => setView('helio')}>Güneş sistemi</button>
          <button className={view === 'geo' ? 'on' : ''} onClick={() => setView('geo')}>Dünya yakını</button>
        </div>
        <button className="accent" onClick={jumpToFlyby}>13 Nisan 2029 geçişine git</button>
      </div>
      <input
        type="range"
        min={trajectory.start}
        max={trajectory.end}
        step={1 / 24}
        value={jd}
        onChange={(e) => setJd(Number(e.target.value))}
      />
      <div className="ticks">
        <span>{jdToDate(trajectory.start).getUTCFullYear()}</span>
        <span className="ca" style={{ left: `${((CLOSE_APPROACH_JD - trajectory.start) / (trajectory.end - trajectory.start)) * 100}%` }}>2029 ▲</span>
        <span>{jdToDate(trajectory.end).getUTCFullYear()}</span>
      </div>
    </div>
  )
}
