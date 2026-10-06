import { useEffect, useMemo } from 'react'
import * as THREE from 'three'

const FONT_PX = 48

/**
 * Ekranda sabit boyutlu metin etiketi (canvas dokulu sprite).
 * `offset`: etiketin nesneye göre dikey kayması (etiket yüksekliği cinsinden).
 */
export function Label({ text, color = '#e4e8f4', offset = 1, size = 0.022 }: { text: string; color?: string; offset?: number; size?: number }) {
  const { texture, aspect } = useMemo(() => {
    const c = document.createElement('canvas')
    const ctx = c.getContext('2d')!
    const font = `500 ${FONT_PX}px Inter, system-ui, sans-serif`
    ctx.font = font
    const w = Math.ceil(ctx.measureText(text).width) + 16
    c.width = w
    c.height = FONT_PX + 16
    ctx.font = font
    ctx.textBaseline = 'middle'
    ctx.shadowColor = 'black'
    ctx.shadowBlur = 8
    ctx.fillStyle = color
    ctx.fillText(text, 8, c.height / 2)
    const texture = new THREE.CanvasTexture(c)
    texture.colorSpace = THREE.SRGBColorSpace
    return { texture, aspect: w / c.height }
  }, [text, color])
  useEffect(() => () => texture.dispose(), [texture])

  return (
    <sprite scale={[size * aspect, size, 1]} center={new THREE.Vector2(0.5, -offset + 0.5)} renderOrder={10}>
      <spriteMaterial map={texture} sizeAttenuation={false} depthTest={false} transparent />
    </sprite>
  )
}
