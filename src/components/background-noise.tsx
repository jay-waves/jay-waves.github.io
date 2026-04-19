import { useEffect, useRef } from 'react'
import rough from 'roughjs/bin/rough'

export function BackgroundNoise() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current

    if (!canvas) {
      return
    }

    const draw = () => {
      const ratio = window.devicePixelRatio || 1
      const width = window.innerWidth
      const height = window.innerHeight

      canvas.width = Math.floor(width * ratio)
      canvas.height = Math.floor(height * ratio)
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`

      const ctx = canvas.getContext('2d')

      if (!ctx) {
        return
      }

      ctx.setTransform(ratio, 0, 0, ratio, 0, 0)
      ctx.clearRect(0, 0, width, height)

      const rc = rough.canvas(canvas)
      const startX = -width * 0.24
      const minEndX = width * 0.48
      const maxEndX = width * 1.04
      const slopeBase = 0.27

      let y = height * 1.15

      while (y > -height * 0.35) {
        const progress = Math.min(1, Math.max(0, 1 - y / (height * 1.25)))
        const densityBias = (1 - progress) ** 1.7
        const drawChance = 0.45 + densityBias * 0.75
        const step = 6 + progress * 18 + Math.random() * 6

        if (Math.random() < drawChance) {
          const laneBurst = 1 + Math.floor(Math.random() * (2 + densityBias * 6))

          for (let i = 0; i < laneBurst; i += 1) {
            const localYOffset = (Math.random() - 0.5) * (6 + progress * 16)
            const localSlope = slopeBase + Math.random() * 0.08
            const endX =
              minEndX +
              progress * (maxEndX - minEndX) +
              Math.random() * width * 0.08
            const alpha = 0.03 + densityBias * (0.14 + Math.random() * 0.06)
            const strokeWidth =
              0.55 + densityBias * 0.95 + Math.random() * 0.45

            rc.line(
              startX,
              y + localYOffset,
              endX,
              y + localSlope * (endX - startX) + localYOffset,
              {
                stroke: `rgba(78, 88, 87, ${alpha.toFixed(3)})`,
                strokeWidth,
                roughness: 0.5 + Math.random() * 0.35,
                bowing: 0.1 + Math.random() * 0.22,
                seed: Math.floor(Math.random() * 100000),
              },
            )
          }
        }

        y -= step
      }

      ctx.save()
      ctx.globalCompositeOperation = 'destination-in'

      const diagonalFade = ctx.createLinearGradient(
        width * 0.1,
        height * 0.92,
        width * 0.96,
        height * 0.06,
      )
      diagonalFade.addColorStop(0, 'rgba(0,0,0,1)')
      diagonalFade.addColorStop(0.45, 'rgba(0,0,0,0.68)')
      diagonalFade.addColorStop(1, 'rgba(0,0,0,0.14)')

      ctx.fillStyle = diagonalFade
      ctx.fillRect(0, 0, width, height)
      ctx.restore()
    }

    draw()
    window.addEventListener('resize', draw)

    return () => {
      window.removeEventListener('resize', draw)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-0"
      aria-hidden="true"
    />
  )
}
