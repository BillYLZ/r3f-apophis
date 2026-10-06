import { Line, OrbitControls, Stars, useTexture } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { Suspense, useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { type Impact, type Trajectory, sampleTrajectory } from '../physics/apophis.ts'
import { AU_KM, CLOSE_APPROACH_JD, DEG, EARTH_RADIUS_KM, GEO_RADIUS_KM } from '../physics/constants.ts'
import { gmst, OBLIQUITY } from '../physics/earthRotation.ts'
import { earthState, moonGeocentric } from '../physics/ephemeris.ts'
import { type Vec3, scale, sub } from '../physics/vec.ts'
import { useSim } from '../store.ts'
import { toThree } from './coords.ts'
import { Label } from './Label.tsx'
import { useFollow } from './useFollow.ts'

/** 1 sahne birimi = 10 000 km */
const KM = 1 / 10000
const S = AU_KM * KM
const R_EARTH = EARTH_RADIUS_KM * KM

function geocentricApophis(tr: Trajectory, jd: number): Vec3 {
  return sub(sampleTrajectory(tr, jd).r, earthState(jd).r)
}

/**
 * Ekvator çerçevesi: yerel +Y kuzey kutbu, yerel +X ilkbahar noktası (γ).
 * Ekliptik koordinatlarında kutup = (0, sin ε, cos ε).
 */
function equatorialBasis() {
  const x = toThree([1, 0, 0])
  const y = toThree([0, Math.sin(OBLIQUITY), Math.cos(OBLIQUITY)])
  const z = new THREE.Vector3().crossVectors(x, y)
  return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z))
}

/** Dönen Dünya çerçevesinde enlem/boylam → konum (Greenwich +X, doğu −Z). */
function geographic(lat: number, lon: number, r: number) {
  return new THREE.Vector3(
    r * Math.cos(lat * DEG) * Math.cos(lon * DEG),
    r * Math.sin(lat * DEG),
    -r * Math.cos(lat * DEG) * Math.sin(lon * DEG),
  )
}

function Earth({ impact }: { impact: Impact | null }) {
  const tex = useTexture(`${import.meta.env.BASE_URL}textures/earth-blue-marble.jpg`)
  tex.colorSpace = THREE.SRGBColorSpace
  const spin = useRef<THREE.Mesh>(null)
  const marker = useRef<THREE.Group>(null)
  useFrame(() => {
    const jd = useSim.getState().jd
    // Greenwich meridyeni dokunun ortasında (u = 0,5 → yerel +X); GMST kadar döndür
    spin.current!.rotation.y = gmst(jd)
    if (marker.current) marker.current.visible = !!impact && jd >= impact.jd - 1e-6
  })
  return (
    <mesh ref={spin}>
      <sphereGeometry args={[R_EARTH, 96, 96]} />
      <meshStandardMaterial map={tex} roughness={0.9} />
      {impact && (
        <group ref={marker} position={geographic(impact.lat, impact.lon, R_EARTH * 1.005)}>
          <mesh>
            <sphereGeometry args={[0.025, 16, 16]} />
            <meshBasicMaterial color="#ff3b30" />
          </mesh>
          <Label text="Çarpma" color="#ff6b5e" />
        </group>
      )}
    </mesh>
  )
}

export function GeoScene() {
  const camera = useThree((s) => s.camera)
  useEffect(() => {
    camera.position.set(9, 10, 19)
    camera.lookAt(0, 0, 0)
  }, [camera])

  const trajectory = useSim((s) => s.trajectory)
  const eqQuat = useMemo(equatorialBasis, [])

  const path = useMemo(() => {
    const pts: THREE.Vector3[] = []
    const end = Math.min(trajectory.end, CLOSE_APPROACH_JD + 2.5)
    for (let t = CLOSE_APPROACH_JD - 2.5; t < end; t += 2 / 1440) pts.push(toThree(geocentricApophis(trajectory, t), S))
    pts.push(toThree(geocentricApophis(trajectory, end), S))
    return pts
  }, [trajectory])

  const moonOrbit = useMemo(() => {
    const pts: THREE.Vector3[] = []
    for (let t = CLOSE_APPROACH_JD - 14; t <= CLOSE_APPROACH_JD + 14; t += 0.1) pts.push(toThree(moonGeocentric(t), S))
    return pts
  }, [])

  const apoRef = useRef<THREE.Group>(null)
  const moonRef = useRef<THREE.Group>(null)
  const sunRef = useRef<THREE.DirectionalLight>(null)
  const origin = useMemo(() => new THREE.Vector3(), [])
  const follow = useFollow({ earth: 21, apophis: 2 })

  useFrame(() => {
    const { jd, trajectory: tr, follow: target } = useSim.getState()
    toThree(geocentricApophis(tr, jd), S, apoRef.current!.position)
    apoRef.current!.visible = !tr.impact || jd < tr.impact.jd
    toThree(moonGeocentric(jd), S, moonRef.current!.position)
    toThree(scale(earthState(jd).r, -1), 100, sunRef.current!.position)
    follow(target === 'apophis' ? apoRef.current!.position : origin)
  })

  return (
    <>
      <OrbitControls makeDefault enableDamping minDistance={0.2} maxDistance={120} />
      <color attach="background" args={['#020308']} />
      <Stars radius={300} depth={50} count={5000} factor={4} fade />
      <ambientLight intensity={0.08} />
      <directionalLight ref={sunRef} intensity={2.6} />

      <group quaternion={eqQuat}>
        <Suspense
          fallback={
            <mesh>
              <sphereGeometry args={[R_EARTH, 48, 48]} />
              <meshStandardMaterial color="#2d5fa8" />
            </mesh>
          }
        >
          <Earth impact={trajectory.impact} />
        </Suspense>
        {/* Yer eşzamanlı (GEO) uydu kuşağı — ekvator düzleminde, 42 164 km */}
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[GEO_RADIUS_KM * KM - 0.03, GEO_RADIUS_KM * KM + 0.03, 128]} />
          <meshBasicMaterial color="#7a8cff" transparent opacity={0.55} side={THREE.DoubleSide} />
        </mesh>
        <group position={[GEO_RADIUS_KM * KM, 0, 0]}>
          <Label text="GEO 35 786 km" color="#a9b4ff" />
        </group>
      </group>

      <Line points={path} color={trajectory.impact ? '#ff6b5e' : '#ff9b42'} lineWidth={1.6} />
      <Line points={moonOrbit} color="#8a8f9c" lineWidth={0.8} dashed dashSize={0.6} gapSize={0.4} />

      <group ref={moonRef}>
        <mesh>
          <sphereGeometry args={[1737 * KM, 32, 32]} />
          <meshStandardMaterial color="#b8b8b8" />
        </mesh>
        <Label text="Ay" color="#c8ccd6" />
      </group>

      <group ref={apoRef}>
        <mesh>
          <icosahedronGeometry args={[0.15, 0]} />
          <meshStandardMaterial color="#e0b88a" emissive="#5a3a10" flatShading />
        </mesh>
        <Label text="Apophis" color="#ffcf8a" />
      </group>
    </>
  )
}
