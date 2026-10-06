import { Canvas } from '@react-three/fiber'
import { Suspense } from 'react'
import { GeoScene } from './scene/GeoScene.tsx'
import { HelioScene } from './scene/HelioScene.tsx'
import { useSim } from './store.ts'
import { Controls, SimClock } from './ui/Controls.tsx'
import { Equations } from './ui/Equations.tsx'
import { Hud } from './ui/Hud.tsx'

export default function App() {
  const view = useSim((s) => s.view)
  return (
    <>
      <Canvas camera={{ fov: 45, near: 0.01, far: 2000 }} dpr={[1, 2]}>
        <SimClock />
        <Suspense fallback={null}>{view === 'helio' ? <HelioScene key="helio" /> : <GeoScene key="geo" />}</Suspense>
      </Canvas>
      <Hud />
      <Equations />
      <Controls />
      <div className="legend">
        {view === 'helio' ? (
          <>
            <span className="sw" style={{ background: '#3d8bff' }} /> Dünya yörüngesi
            <span className="sw" style={{ background: '#ff9b42' }} /> Apophis geçiş öncesi
            <span className="sw" style={{ background: '#42e6c8' }} /> Apophis geçiş sonrası
          </>
        ) : (
          <>
            <span className="sw" style={{ background: '#ff9b42' }} /> Yer merkezli yol (±2,5 gün)
            <span className="sw" style={{ background: '#7a8cff' }} /> GEO kuşağı
            <span className="sw" style={{ background: '#8a8f9c' }} /> Ay yörüngesi
          </>
        )}
        <span className="dim"> · Cisim boyutları büyütülmüştür</span>
      </div>
    </>
  )
}
