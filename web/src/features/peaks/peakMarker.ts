import { mapColors } from '@/styles/tokens'

const pixelRatio = 2
const size = 12 // CSS px

// A small solid triangle, the topo-map summit symbol, with a thin cream edge
// so it stays visible on dark hillshade. Drawn at runtime so its colours come
// from the tokens rather than a sprite file.
export function drawPeakMarker(): { image: ImageData; pixelRatio: number } {
  const px = size * pixelRatio
  const canvas = document.createElement('canvas')
  canvas.width = px
  canvas.height = px
  const ctx = canvas.getContext('2d')!

  const inset = 1.5 * pixelRatio
  ctx.beginPath()
  ctx.moveTo(px / 2, inset)
  ctx.lineTo(px - inset, px - inset)
  ctx.lineTo(inset, px - inset)
  ctx.closePath()
  ctx.lineJoin = 'round'
  ctx.lineWidth = 1.5 * pixelRatio
  ctx.strokeStyle = mapColors.peakHalo
  ctx.stroke()
  ctx.fillStyle = mapColors.peak
  ctx.fill()

  return { image: ctx.getImageData(0, 0, px, px), pixelRatio }
}
