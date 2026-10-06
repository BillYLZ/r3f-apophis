import * as THREE from 'three'
import type { Vec3 } from '../physics/vec.ts'

/** Ekliptik (x, y, z) → three.js (x, z, −y): ekliptik düzlemi yatay, kuzey yukarı. */
export function toThree(v: Vec3, s = 1, out = new THREE.Vector3()): THREE.Vector3 {
  return out.set(v[0] * s, v[2] * s, -v[1] * s)
}
