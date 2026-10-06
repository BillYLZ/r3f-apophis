import { useMemo } from 'react'
import { DEFAULT_PARAMS, type FlybyParams, osculating } from '../physics/apophis.ts'
import { CLOSE_APPROACH_JD, EARTH_RADIUS_KM, GEO_RADIUS_KM, KM_S_PER_AU_DAY, MOON_DISTANCE_KM, jdToDate } from '../physics/constants.ts'
import { deg } from '../physics/kepler.ts'
import { useSim } from '../store.ts'
import { fmt, latLon, orbitClass } from './Hud.tsx'

interface SliderProps {
  label: string
  value: number
  min: number
  max: number
  step: number
  unit: string
  digits?: number
  log?: boolean
  onChange: (v: number) => void
  hint?: string
}

/** Logaritmik seçenekli kaydırıcı. */
function Slider({ label, value, min, max, step, unit, digits = 0, log, onChange, hint }: SliderProps) {
  const toPos = (v: number) => (log ? Math.log(v) : v)
  const fromPos = (p: number) => (log ? Math.exp(p) : p)
  return (
    <label className="slider">
      <div className="slider-head">
        <span>{label}</span>
        <span className="val">{fmt(value, digits)} {unit}</span>
      </div>
      <input
        type="range"
        min={toPos(min)}
        max={toPos(max)}
        step={log ? (toPos(max) - toPos(min)) / 1000 : step}
        value={toPos(value)}
        onChange={(e) => {
          const v = fromPos(Number(e.target.value))
          onChange(log ? Math.round(v / step) * step : v)
        }}
      />
      {hint && <div className="dim">{hint}</div>}
    </label>
  )
}

const PRESETS: { label: string; p: Partial<FlybyParams> }[] = [
  { label: 'JPL tahmini', p: DEFAULT_PARAMS },
  { label: 'Ay mesafesi', p: { rpKm: MOON_DISTANCE_KM } },
  { label: 'GEO sınırı', p: { rpKm: GEO_RADIUS_KM } },
  { label: 'Sıyırma (8 000 km)', p: { rpKm: 8000 } },
  { label: 'Çarpma', p: { rpKm: 3000 } },
  { label: 'Çekimsiz Dünya', p: { earthMassFactor: 0 } },
]

export function Params() {
  const params = useSim((s) => s.params)
  const tr = useSim((s) => s.trajectory)
  const { setParams, resetParams } = useSim.getState()
  const f = tr.flyby

  const result = useMemo(() => {
    const pre = osculating(tr, CLOSE_APPROACH_JD - 60)
    const post = tr.impact ? null : osculating(tr, CLOSE_APPROACH_JD + 60)
    return { pre, post }
  }, [tr])

  return (
    <div className="params">
      <p className="dim">
        Senaryo, 13 Nisan 2029 21:46 UTC anındaki yerberi durumundan kurulur ve Güneş + Dünya çekimiyle
        geriye/ileriye yeniden entegre edilir. Kaydırıcıları oynattıkça yörünge anında güncellenir.
      </p>
      <div className="presets">
        {PRESETS.map((x) => (
          <button key={x.label} onClick={() => (x.p === DEFAULT_PARAMS ? resetParams() : setParams(x.p))}>{x.label}</button>
        ))}
      </div>

      <Slider
        label="En yakın geçiş mesafesi rₚ"
        value={params.rpKm}
        min={1000}
        max={1000000}
        step={10}
        unit="km"
        log
        onChange={(rpKm) => setParams({ rpKm })}
        hint={`${fmt(params.rpKm / EARTH_RADIUS_KM, 2)} R⊕ · ${fmt(params.rpKm / MOON_DISTANCE_KM, 3)} Ay mesafesi${params.rpKm <= EARTH_RADIUS_KM ? ' · Dünya yüzeyinin altında → çarpma' : ''}`}
      />
      <Slider
        label="Sonsuzdaki hız v∞"
        value={params.vInfKmS}
        min={0.5}
        max={30}
        step={0.01}
        unit="km/s"
        digits={2}
        onChange={(vInfKmS) => setParams({ vInfKmS })}
        hint="Asteroidin Dünya'ya göre yaklaşma hızı; değiştirmek güneş merkezli yörüngeyi de değiştirir."
      />
      <Slider
        label="Çarpma parametresi açısı"
        value={params.impactAngleDeg}
        min={0}
        max={360}
        step={1}
        unit="°"
        onChange={(impactAngleDeg) => setParams({ impactAngleDeg })}
        hint="Asteroidin Dünya'nın hangi tarafından geçtiği (v∞'a dik düzlemde). Önden geçerse enerji kaybeder, arkadan geçerse kazanır."
      />
      <Slider
        label="Dünya kütlesi çarpanı"
        value={params.earthMassFactor}
        min={0}
        max={10}
        step={0.05}
        unit="×"
        digits={2}
        onChange={(earthMassFactor) => setParams({ earthMassFactor })}
      />

      <h2>Sonuç</h2>
      <table>
        <tbody>
          <tr><th>Hiperbolik dışmerkezlik e</th><td>{fmt(f.e, 3)}</td></tr>
          <tr><th>Sapma açısı δ</th><td>{fmt(deg(f.deflection), 2)}°</td></tr>
          <tr><th>Yerberi hızı vₚ</th><td>{fmt(f.vp * KM_S_PER_AU_DAY, 2)} km/s</td></tr>
          <tr><th>|Δv☉| = 2v∞ sin(δ/2)</th><td>{fmt(2 * f.vInf * Math.sin(f.deflection / 2) * KM_S_PER_AU_DAY, 3)} km/s</td></tr>
          <tr><th>Önce: a / e / i</th><td>{fmt(result.pre.a, 4)} AU / {fmt(result.pre.e, 3)} / {fmt(deg(result.pre.i), 2)}°</td></tr>
          {result.post ? (
            <>
              <tr><th>Sonra: a / e / i</th><td>{result.post.e < 1 ? `${fmt(result.post.a, 4)} AU` : '—'} / {fmt(result.post.e, 3)} / {fmt(deg(result.post.i), 2)}°</td></tr>
              <tr><th>Sınıf</th><td>{orbitClass(result.pre.a, result.pre.e).split(' ')[0]} → {orbitClass(result.post.a, result.post.e).split(' ')[0]}</td></tr>
            </>
          ) : (
            <tr className="impact-row">
              <th>Çarpma</th>
              <td>{latLon(tr.impact!.lat, tr.impact!.lon)} · {jdToDate(tr.impact!.jd).toISOString().slice(11, 19)} UTC · {fmt(tr.impact!.speedKmS, 2)} km/s</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
