import { useEffect, useRef, useState } from 'react'
import { AsciiImage } from './ascii'
import { intro } from '../data/content'

export function Hero() {
  const sectionRef = useRef<HTMLElement | null>(null)
  const [revealed, setRevealed] = useState(false)

  useEffect(() => {
    const node = sectionRef.current

    if (!node || revealed) {
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setRevealed(true)
          observer.disconnect()
        }
      },
      { threshold: 0.25 },
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [revealed])

  return (
    <section
      id="panel-hero"
      className="snap-panel grid min-h-[100svh] w-full snap-start grid-cols-[minmax(0,560px)_minmax(0,440px)] items-center justify-center justify-items-center gap-[clamp(0.7rem,2vw,1.8rem)] overflow-x-clip p-[clamp(1.1rem,3vw,3rem)] max-[760px]:grid-cols-1 max-[760px]:content-center"
      aria-label="Introduction"
      ref={sectionRef}
    >
      <div className="hero-stage relative grid min-w-0 w-full max-w-[560px] place-items-center isolate" aria-hidden="true">
        <AsciiImage
          src="/ascii-art.png"
          variant="hero"
          size="min(520px, 100%)"
          opacity={0.88}
          reveal={true}
          revealed={revealed}
          alt="Portrait rendered in ASCII style"
        />
      </div>

      <div className="grid max-w-[34ch] justify-items-center gap-4 text-center">
        <p className="m-0 text-[0.88rem] uppercase tracking-[0.08em] text-[var(--muted)]">{intro.name}</p>
        <h1 className="m-0 max-w-[10ch] text-[clamp(1.65rem,4.6vw,4.7rem)] [font-family:var(--display)] italic">{intro.role}</h1>
        <div className="flex flex-wrap justify-center gap-[0.55rem]" aria-label="Profile summary">
          <span className="inline-flex rounded-full border border-[rgba(137,158,157,0.16)] bg-[rgba(255,255,255,0.22)] px-[0.62rem] py-[0.34rem] text-[0.78rem] text-[var(--muted)]">Beijing, China</span>
          <span className="inline-flex rounded-full border border-[rgba(137,158,157,0.16)] bg-[rgba(255,255,255,0.22)] px-[0.62rem] py-[0.34rem] text-[0.78rem] text-[var(--muted)]">C++</span>
          <span className="inline-flex rounded-full border border-[rgba(137,158,157,0.16)] bg-[rgba(255,255,255,0.22)] px-[0.62rem] py-[0.34rem] text-[0.78rem] text-[var(--muted)]">2026 Spring</span>
        </div>
      </div>
    </section>
  )
}
