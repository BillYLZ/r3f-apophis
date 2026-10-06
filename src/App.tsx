import { Canvas } from '@react-three/fiber'
import { GeoScene } from './scene/GeoScene.tsx'
import { HelioScene } from './scene/HelioScene.tsx'
import { useSim } from './store.ts'
import { Controls, SimClock } from './ui/Controls.tsx'
import { Hud } from './ui/Hud.tsx'
import { SidePanel } from './ui/SidePanel.tsx'

export default function App() {
  const view = useSim((s) => s.view)
  return (
    <>
      <Canvas camera={{ fov: 45, near: 0.005, far: 2000 }} dpr={[1, 2]}>
        <SimClock />
        {view === 'helio' ? <HelioScene key="helio" /> : <GeoScene key="geo" />}
      </Canvas>
      <Hud />
      <SidePanel />
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
            <span className="sw" style={{ background: '#8a8f9c' }} /> Ay'ın yolu (±14 gün)
            <span className="sw" style={{ background: '#c8ccd6' }} /> Ay'a en yakın geçiş · gri küre: Ay'ın etki küresi
          </>
        )}
        <span className="dim"> · Cisim boyutları büyütülmüştür · Fare: döndür / yakınlaştır</span>
      </div>
    </>
  )
}
