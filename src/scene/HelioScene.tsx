import { Line, OrbitControls, Stars } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { osculating, sampleTrajectory } from '../physics/apophis.ts'
import { CLOSE_APPROACH_JD } from '../physics/constants.ts'
import { earthElements, earthState } from '../physics/ephemeris.ts'
import { orbitPoints } from '../physics/kepler.ts'
import { useSim } from '../store.ts'
import { toThree } from './coords.ts'
import { Label } from './Label.tsx'
import { useFollow } from './useFollow.ts'

/** 1 AU = 10 sahne birimi */
const S = 10
const TRAIL_DAYS = 300

export function HelioScene() {
  const camera = useThree((s) => s.camera)
  useEffect(() => {
    camera.position.set(0, 21, 23)
    camera.lookAt(0, 0, 0)
  }, [camera])

  const trajectory = useSim((s) => s.trajectory)
  const earthOrbit = useMemo(() => orbitPoints(earthElements(CLOSE_APPROACH_JD)).map((p) => toThree(p, S)), [])
  const preOrbit = useMemo(
    () => orbitPoints(osculating(trajectory, CLOSE_APPROACH_JD - 60)).map((p) => toThree(p, S)),
    [trajectory],
  )
  const postOrbit = useMemo(() => {
    if (trajectory.impact) return null
    const el = osculating(trajectory, CLOSE_APPROACH_JD + 60)
    // Hiperbolik (Güneş'ten kaçış) yörünge elips olarak çizilemez
    return el.e < 1 ? orbitPoints(el).map((p) => toThree(p, S)) : null
  }, [trajectory])

  const earthRef = useRef<THREE.Group>(null)
  const apoRef = useRef<THREE.Group>(null)
  const trail = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array((TRAIL_DAYS + 2) * 3), 3))
    return g
  }, [])
  const tmp = useMemo(() => new THREE.Vector3(), [])
  const origin = useMemo(() => new THREE.Vector3(), [])
  const follow = useFollow({ sun: 31, earth: 3, apophis: 3 })

  useFrame(() => {
    const { jd, trajectory: tr, follow: target } = useSim.getState()
    toThree(earthState(jd).r, S, earthRef.current!.position)
    toThree(sampleTrajectory(tr, jd).r, S, apoRef.current!.position)
    follow(target === 'earth' ? earthRef.current!.position : target === 'apophis' ? apoRef.current!.position : origin)

    // Son TRAIL_DAYS günün izi, 1 günlük adımlarla + anlık konum
    const pos = trail.attributes.position as THREE.BufferAttribute
    const first = Math.max(tr.start, jd - TRAIL_DAYS)
    let n = 0
    for (let t = Math.ceil(first); t < jd && n <= TRAIL_DAYS; t++, n++) {
      toThree(sampleTrajectory(tr, t).r, S, tmp)
      pos.setXYZ(n, tmp.x, tmp.y, tmp.z)
    }
    toThree(sampleTrajectory(tr, jd).r, S, tmp)
    pos.setXYZ(n++, tmp.x, tmp.y, tmp.z)
    pos.needsUpdate = true
    trail.setDrawRange(0, n)
  })

  return (
    <>
      <OrbitControls makeDefault enableDamping minDistance={0.3} maxDistance={80} />
      <color attach="background" args={['#03040a']} />
      <Stars radius={200} depth={60} count={4000} factor={4} fade />
      <ambientLight intensity={0.15} />
      <pointLight position={[0, 0, 0]} intensity={3} decay={0} />

      <polarGridHelper args={[15, 12, 6, 64, '#1c2440', '#141a30']} />

      <mesh>
        <sphereGeometry args={[0.45, 48, 48]} />
        <meshBasicMaterial color="#ffd27a" />
        <Label text="Güneş" color="#ffd27a" offset={1.4} />
      </mesh>

      <Line points={earthOrbit} color="#3d8bff" lineWidth={1.2} />
      <Line points={preOrbit} color="#ff9b42" lineWidth={1} dashed dashSize={0.25} gapSize={0.15} />
      {postOrbit && <Line points={postOrbit} color="#42e6c8" lineWidth={1} dashed dashSize={0.25} gapSize={0.15} />}

      <line>
        <primitive object={trail} attach="geometry" />
        <lineBasicMaterial color="#ffcf8a" />
      </line>

      <group ref={earthRef}>
        <mesh>
          <sphereGeometry args={[0.16, 32, 32]} />
          <meshStandardMaterial color="#3d8bff" emissive="#0b2a60" />
        </mesh>
        <Label text="Dünya" color="#8fbcff" />
      </group>

      <group ref={apoRef}>
        <mesh>
          <icosahedronGeometry args={[0.09, 0]} />
          <meshStandardMaterial color="#c9a27a" flatShading />
        </mesh>
        <Label text="Apophis" color="#ffcf8a" offset={-1} />
      </group>
    </>
  )
}
