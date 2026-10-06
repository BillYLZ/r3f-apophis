import { useFrame } from '@react-three/fiber'
import { CLOSE_APPROACH_JD, jdToDate } from '../physics/constants.ts'
import { type Follow, nowJD, RATES, useSim } from '../store.ts'

/** Canvas içinde: simülasyon saatini ilerletir. */
export function SimClock() {
  useFrame((_, dt) => {
    const s = useSim.getState()
    if (s.live) {
      // Canlı modda duvar saatine kilitli (sekme arka plandayken de kaymaz)
      const jd = Math.min(Math.max(nowJD(), s.trajectory.start), s.trajectory.end)
      if (jd !== s.jd) useSim.setState({ jd })
      return
    }
    if (!s.playing) return
    const next = s.jd + (s.reverse ? -1 : 1) * s.rate * Math.min(dt, 0.1)
    const tr = s.trajectory
    const jd = Math.min(Math.max(next, tr.start), tr.end)
    useSim.setState({ jd, playing: jd === next })
  })
  return null
}

const FOLLOW_LABELS: Record<Follow, string> = { sun: 'Güneş', earth: 'Dünya', apophis: 'Apophis', moon: 'Ay' }

export function Controls() {
  const { jd, playing, rate, reverse, live, view, follow, trajectory: tr } = useSim()
  const { setJd, setPlaying, setRate, setReverse, setView, setFollow, goLive, jumpTo } = useSim.getState()
  const followOptions: Follow[] = view === 'helio' ? ['sun', 'earth', 'apophis'] : ['earth', 'apophis', 'moon']
  const pct = (t: number) => `${((t - tr.start) / (tr.end - tr.start)) * 100}%`
  const now = nowJD()

  return (
    <div className="panel controls">
      <div className="row">
        <button onClick={() => setReverse(!reverse)} title="Zaman yönü">{reverse ? '◀◀' : '▶▶'}</button>
        <button onClick={() => setPlaying(!playing)}>{playing ? '❚❚ Durdur' : '▶ Oynat'}</button>
        <select value={rate} onChange={(e) => setRate(Number(e.target.value))} title="Zaman hızı">
          {RATES.map((r) => <option key={r.label} value={r.value}>{r.label}</option>)}
        </select>
        <button className={live ? 'live on' : 'live'} onClick={goLive}>● Şimdi</button>
        <button className="accent" onClick={() => jumpTo(CLOSE_APPROACH_JD - 0.5, 'geo', 1 / 24)}>13 Nisan 2029 geçişi</button>
        <span className="spacer" />
        <div className="seg">
          <button className={view === 'helio' ? 'on' : ''} onClick={() => setView('helio')}>Güneş sistemi</button>
          <button className={view === 'geo' ? 'on' : ''} onClick={() => setView('geo')}>Dünya yakını</button>
        </div>
        <label className="follow">
          Takip
          <select value={followOptions.includes(follow) ? follow : followOptions[0]} onChange={(e) => setFollow(e.target.value as Follow)}>
            {followOptions.map((f) => <option key={f} value={f}>{FOLLOW_LABELS[f]}</option>)}
          </select>
        </label>
      </div>
      <input type="range" min={tr.start} max={tr.end} step="any" value={jd} onChange={(e) => setJd(Number(e.target.value))} />
      <div className="ticks">
        <span>{jdToDate(tr.start).getUTCFullYear()}</span>
        {now > tr.start && now < tr.end && <span className="mark now" style={{ left: pct(now) }}>▲ bugün</span>}
        {tr.impact ? (
          <span className="impact-end">çarpma ▲</span>
        ) : (
          <span className="mark ca" style={{ left: pct(CLOSE_APPROACH_JD) }}>▲ 2029</span>
        )}
        {!tr.impact && <span>{jdToDate(tr.end).getUTCFullYear()}</span>}
      </div>
    </div>
  )
}
