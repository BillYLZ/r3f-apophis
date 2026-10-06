import katex from 'katex'
import 'katex/dist/katex.min.css'
import { useState } from 'react'
import { AU_KM, KM_S_PER_AU_DAY, MU_EARTH, CLOSE_APPROACH_KM } from '../physics/constants.ts'
import { deg } from '../physics/kepler.ts'
import { trajectory } from '../trajectory.ts'

function Tex({ children }: { children: string }) {
  return <div className="tex" dangerouslySetInnerHTML={{ __html: katex.renderToString(children, { displayMode: true, throwOnError: false }) }} />
}

const f = trajectory.flyby
const vInf = (f.vInf * KM_S_PER_AU_DAY).toFixed(2)
const vp = (f.vp * KM_S_PER_AU_DAY).toFixed(2)
const muKm = (MU_EARTH * AU_KM ** 3 / 86400 ** 2).toFixed(0)

export function Equations() {
  const [open, setOpen] = useState(() => window.innerWidth > 1100)
  return (
    <div className={`panel equations ${open ? '' : 'closed'}`}>
      <button className="toggle" onClick={() => setOpen(!open)}>{open ? '× Denklemleri gizle' : '∑ Yörünge denklemleri'}</button>
      {open && (
        <div className="eq-body">
          <h2>1 · Kepler yörüngesi (iki cisim)</h2>
          <p>Ortalama anomali zamanla doğrusal artar, eksantrik anomali Kepler denkleminden (Newton–Raphson) bulunur:</p>
          <Tex>{String.raw`M = M_0 + n\,(t - t_0),\qquad n = \sqrt{\mu_\odot / a^3}`}</Tex>
          <Tex>{String.raw`M = E - e\sin E`}</Tex>
          <Tex>{String.raw`\mathbf{r}_{\text{pf}} = \begin{pmatrix} a(\cos E - e) \\ a\sqrt{1-e^2}\,\sin E \\ 0\end{pmatrix},\quad \mathbf{r} = R_z(\Omega)\,R_x(i)\,R_z(\omega)\,\mathbf{r}_{\text{pf}}`}</Tex>
          <Tex>{String.raw`v^2 = \mu\left(\frac{2}{r} - \frac{1}{a}\right)\quad\text{(vis-viva)}`}</Tex>
          <p>Dünya'nın konumu bu denklemlerle (JPL Standish J2000 elemanları) hesaplanır.</p>

          <h2>2 · Apophis'in hareket denklemi</h2>
          <p>Güneş merkezli çerçevede Güneş ve Dünya çekimi; son terim Güneş'in Dünya tarafından ivmelendirilmesinden gelen dolaylı terimdir:</p>
          <Tex>{String.raw`\ddot{\mathbf{r}} = -\mu_\odot\frac{\mathbf{r}}{|\mathbf{r}|^3} - \mu_\oplus\frac{\mathbf{r}-\mathbf{r}_\oplus}{|\mathbf{r}-\mathbf{r}_\oplus|^3} - \mu_\oplus\frac{\mathbf{r}_\oplus}{|\mathbf{r}_\oplus|^3}`}</Tex>
          <p>Uyarlamalı adımlı Dormand–Prince RK5(4) ile, Dünya'ya yaklaştıkça küçülen adımlarla ({trajectory.t.length.toLocaleString('tr-TR')} adım) entegre edilir.</p>

          <h2>3 · Yakın geçiş: hiperbolik yörünge</h2>
          <p>Dünya'nın etki küresi içinde göreli hareket bir hiperboldür:</p>
          <Tex>{String.raw`e = 1 + \frac{r_p\,v_\infty^2}{\mu_\oplus} = 1 + \frac{${CLOSE_APPROACH_KM}\cdot ${vInf}^2}{${muKm}} = ${f.e.toFixed(3)}`}</Tex>
          <Tex>{String.raw`v_p = \sqrt{v_\infty^2 + \frac{2\mu_\oplus}{r_p}} = ${vp}\ \text{km/s}`}</Tex>
          <Tex>{String.raw`\sin\frac{\delta}{2} = \frac{1}{e}\ \Rightarrow\ \delta = ${deg(f.deflection).toFixed(1)}^\circ`}</Tex>
          <p>
            Yerberi yönü asimptotların açıortayındadır: <span dangerouslySetInnerHTML={{ __html: katex.renderToString(String.raw`\hat r_p = \sin\tfrac{\delta}{2}\,\hat v_\infty + \cos\tfrac{\delta}{2}\,\hat b`) }} />.
            Asteroit Dünya'nın arkasından geçtiği için güneş merkezli enerji kazanır:
          </p>
          <Tex>{String.raw`\Delta\mathbf{v}_\odot = \mathbf{v}_\infty^{+} - \mathbf{v}_\infty^{-},\quad |\Delta\mathbf{v}| = 2v_\infty\sin\tfrac{\delta}{2} = ${(2 * f.vInf * KM_S_PER_AU_DAY / f.e).toFixed(2)}\ \text{km/s}`}</Tex>
          <p className="dim">
            Sonuç: a ≈ 0,922 AU (Aten) → a ≈ 1,10 AU (Apollo). Yakın geçiş GEO uydularının yörüngesinin içinden, Atlantik üzerinde gerçekleşir.
          </p>
        </div>
      )}
    </div>
  )
}
