const BINARY_STREAM = '01'.repeat(240)

export function BinaryDivider() {
  return (
    <p className="binary-divider" aria-hidden="true">
      <span>{BINARY_STREAM}</span>
    </p>
  )
}