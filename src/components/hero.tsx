import { useEffect, useRef, useState } from 'react'
import { AsciiImage } from './ascii'
import { intro } from '../data/content'

export function Hero() {
  const sectionRef = useRef<HTMLElement | null>(null)
  const [revealed, setRevealed] = useState(false)
  const [asciiText, setAsciiText] = useState<string | undefined>(undefined)

  useEffect(() => {
    fetch('/ascii-art.txt')
      .then((r) => r.text())
      .then(setAsciiText)
      .catch(() => undefined)
  }, [])

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
      className="hero-section snap-panel"
      aria-label="Introduction"
      ref={sectionRef}
    >
      <div className="hero-stage" aria-hidden="true">
        <div className="hero-block hero-block-a"></div>
        <div className="hero-block hero-block-b"></div>
        <div className="hero-line hero-line-a"></div>
        <div className="hero-line hero-line-b"></div>
        <AsciiImage
          text={asciiText}
          src="/ascii-art.png"
          variant="hero"
          size="min(520px, 100%)"
          opacity={0.88}
          reveal={true}
          revealed={revealed}
          alt="Portrait rendered in ASCII style"
        />
      </div>

      <div className="hero-intro">
        <p className="hero-name">{intro.name}</p>
        <h1>{intro.role}</h1>
        <div className="hero-meta-rail" aria-label="Profile summary">
          <span>Beijing</span>
          <span>C++ / ROS2</span>
          <span>2026 Spring</span>
        </div>
      </div>
    </section>
  )
}
