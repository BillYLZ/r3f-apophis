import { useState } from 'react'
import { Equations } from './Equations.tsx'
import { Params } from './Params.tsx'

type Tab = 'params' | 'equations'

export function SidePanel() {
  const [tab, setTab] = useState<Tab | null>(() => (window.innerWidth > 1100 ? 'params' : null))
  return (
    <div className={`panel side ${tab ? '' : 'closed'}`}>
      <div className="tabs">
        <button className={tab === 'params' ? 'on' : ''} onClick={() => setTab(tab === 'params' ? null : 'params')}>⚙ Parametreler</button>
        <button className={tab === 'equations' ? 'on' : ''} onClick={() => setTab(tab === 'equations' ? null : 'equations')}>∑ Denklemler</button>
        {tab && <button className="close" onClick={() => setTab(null)} aria-label="Kapat">×</button>}
      </div>
      {tab === 'params' && <Params />}
      {tab === 'equations' && <Equations />}
    </div>
  )
}
