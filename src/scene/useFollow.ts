import { useThree } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { type Follow, useSim } from '../store.ts'

/**
 * Kamerayı seçilen cisme kilitler: hedef her karede cismin konumuna taşınır,
 * kamera da aynı miktarda kaydırılır (kullanıcının döndürme/yakınlaştırması korunur).
 * `distances`: takip başladığında kameranın cisme uzaklığı.
 */
export function useFollow(distances: Partial<Record<Follow, number>>) {
  const camera = useThree((s) => s.camera)
  const controls = useThree((s) => s.controls) as { target: THREE.Vector3 } | null
  const follow = useSim((s) => s.follow)
  const delta = useMemo(() => new THREE.Vector3(), [])

  useEffect(() => {
    const d = distances[follow]
    if (!controls || d === undefined) return
    const dir = delta.subVectors(camera.position, controls.target).normalize()
    camera.position.copy(controls.target).addScaledVector(dir, d)
  }, [follow, controls])

  /** useFrame içinde, cisim konumları güncellendikten sonra çağrılır. */
  return (target: THREE.Vector3) => {
    if (!controls) return
    delta.subVectors(target, controls.target)
    camera.position.add(delta)
    controls.target.copy(target)
  }
}
