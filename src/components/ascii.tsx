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
  const wrapStyle = { width: size }

  if (text) {
    return (
      <div
        className={`ascii-image ascii-${variant} ${reveal ? 'is-reveal' : ''} ${revealed ? 'state-shown' : ''}`}
        style={wrapStyle}
        aria-label={alt}
      >
        <pre className="ascii-text" aria-hidden="true" style={{ opacity }}>
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
      <img src={src} style={{ width: '100%', opacity }} alt={alt} loading="lazy" />
    </div>
  )
}
