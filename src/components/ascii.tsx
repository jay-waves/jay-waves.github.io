import { useLayoutEffect, useRef, useState } from 'react'

type AsciiVariant = 'hero' | 'bg' | 'divider'

type AsciiImageProps = {
  src?: string
  text?: string
  variant: AsciiVariant
  size?: string
  opacity?: number
  reveal?: boolean
  revealed?: boolean
  alt?: string
}

export function AsciiImage({
  src,
  text,
  variant,
  size,
  opacity,
  reveal = false,
  revealed = false,
  alt = 'ASCII visual',
}: AsciiImageProps) {
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const [fontSize, setFontSize] = useState(0)
  const [textWidth, setTextWidth] = useState(0)
  const wrapStyle = text
    ? {
        width: textWidth || 0,
        visibility: textWidth ? ('visible' as const) : ('hidden' as const),
      }
    : { width: size }

  useLayoutEffect(() => {
    const wrap = wrapRef.current
    const parent = wrap?.parentElement

    if (!text || !wrap || !parent) {
      return
    }

    const lines = text.replace(/\r/g, '').split('\n')
    const longestLine = Math.max(...lines.map((line) => line.length), 1)

    const update = () => {
      const styles = getComputedStyle(wrap)
      const horizontalPadding = parseFloat(styles.paddingLeft) + parseFloat(styles.paddingRight)
      const verticalPadding = parseFloat(styles.paddingTop) + parseFloat(styles.paddingBottom)
      const availableWidth = Math.max(0, Math.min(parent.clientWidth, 520) - horizontalPadding)
      const availableHeight = Math.max(
        0,
        Math.min(window.innerHeight * 0.58, 540) - verticalPadding,
      )
      const characterWidth = 0.61
      const widthSize = availableWidth / (longestLine * characterWidth)
      const heightSize = availableHeight / (lines.length * 1.18)
      const nextFontSize = Math.max(0.75, Math.min(widthSize, heightSize, 3.8))

      setFontSize(nextFontSize)
      setTextWidth(Math.ceil(longestLine * characterWidth * nextFontSize + horizontalPadding))
    }

    update()
    const observer = new ResizeObserver(update)
    observer.observe(parent)
    window.addEventListener('resize', update)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', update)
    }
  }, [text])

  if (text) {
    return (
      <div
        ref={wrapRef}
        className={`ascii-image ascii-${variant} ${reveal ? 'is-reveal' : ''} ${revealed ? 'state-shown' : ''}`}
        style={wrapStyle}
        aria-label={alt}
      >
        <pre className="ascii-text" aria-hidden="true" style={{ opacity, fontSize }}>
          {text}
        </pre>
      </div>
    )
  }

  return (
    <div
      className={`ascii-image ascii-${variant} ${reveal ? 'is-reveal' : ''} ${revealed ? 'state-shown' : ''}`}
      style={wrapStyle}
    >
      <img src={src} style={{ opacity }} alt={alt} loading="lazy" />
    </div>
  )
}
