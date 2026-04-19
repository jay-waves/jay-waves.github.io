import { useEffect, useRef, useState } from 'react'
import { githubProfile, contactItems, skills, type ContactItem } from '../data/content'
import { BinaryDivider } from './binary-divider'

export function GitHubContribution() {
  const chartUrl = `https://ghchart.rshah.org/${githubProfile.username}`

  return (
    <>
      <h3>Contributions</h3>
      <a
        className="contrib-link"
        href={githubProfile.profileUrl}
        target="_blank"
        rel="noreferrer"
      >
        <img
          src={chartUrl}
          alt={`${githubProfile.username} GitHub contribution chart`}
          loading="lazy"
        />
      </a>
    </>
  )
}
function ContactIcon({ icon }: { icon: ContactItem['icon'] }) {
  if (icon === 'email') {
    return (
      <svg viewBox="0 0 24 24" className="contact-icon">
        <path fill="currentColor" d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6Zm0 4-8 5-8-5V6l8 5 8-5v2Z" />
      </svg>
    )
  }
  if (icon === 'wechat') {
    return (
      <svg viewBox="0 0 24 24" className="contact-icon">
        <path
          fill="currentColor"
          d="M8.9 4C5.1 4 2 6.5 2 9.6c0 1.8 1 3.4 2.6 4.5L4 17.6l3-1.5c.6.1 1.3.2 1.9.2.1 0 .2 0 .3 0-.2-.5-.3-1.1-.3-1.6 0-3.4 3.2-6.2 7.1-6.2h.3C15.5 5.8 12.5 4 8.9 4Zm-2 4.3c.4 0 .8.4.8.8s-.4.8-.8.8-.8-.4-.8-.8.3-.8.8-.8Zm4.1 0c.4 0 .8.4.8.8s-.4.8-.8.8-.8-.4-.8-.8.4-.8.8-.8ZM16.2 9.7c-3.2 0-5.8 2.2-5.8 4.9 0 1.5.8 2.9 2.2 3.8l-.5 2.5 2.4-1.2c.6.1 1.1.2 1.7.2 3.2 0 5.8-2.2 5.8-4.9s-2.6-4.9-5.8-4.9Zm-2.1 4c.3 0 .6.3.6.6s-.3.6-.6.6-.6-.3-.6-.6.2-.6.6-.6Zm4.2 0c.3 0 .6.3.6.6s-.3.6-.6.6-.6-.3-.6-.6.3-.6.6-.6Z"
        />
      </svg>
    )
  }
  if (icon === 'github') {
    return (
      <svg viewBox="0 0 24 24" className="contact-icon">
        <path
          fill="currentColor"
          d="M12 2C6.48 2 2 6.48 2 12c0 4.41 2.87 8.14 6.84 9.46.5.09.66-.21.66-.47v-1.66c-2.78.61-3.37-1.18-3.37-1.18-.46-1.15-1.11-1.46-1.11-1.46-.9-.62.07-.61.07-.61 1 .07 1.53 1.03 1.53 1.03.89 1.51 2.33 1.07 2.9.82.09-.64.35-1.07.63-1.31-2.22-.25-4.56-1.11-4.56-4.95 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.64 0 0 .84-.27 2.75 1.02A9.54 9.54 0 0 1 12 6.8c.85 0 1.71.11 2.51.34 1.91-1.29 2.75-1.02 2.75-1.02.55 1.37.2 2.39.1 2.64.64.7 1.03 1.59 1.03 2.68 0 3.85-2.34 4.69-4.58 4.94.36.31.69.92.69 1.86v2.76c0 .26.18.57.67.47A10 10 0 0 0 22 12c0-5.52-4.48-10-10-10Z"
        />
      </svg>
    )
  }
  if (icon === 'blog') {
    return (
      <svg viewBox="0 0 24 24" className="contact-icon">
        <path
          fill="currentColor"
          d="M4 4h16v16H4V4Zm2 2v12h12V6H6Zm2.2 2.2h3.6c1.8 0 2.8.9 2.8 2.3 0 .8-.4 1.5-1 1.8.9.3 1.4 1 1.4 2.1 0 1.6-1.2 2.5-3.2 2.5H8.2V8.2Zm2 1.6v2h1.4c.8 0 1.2-.3 1.2-1s-.4-1-1.2-1h-1.4Zm0 3.6v2h1.7c.9 0 1.3-.3 1.3-1.1s-.4-1-1.3-1h-1.7Z"
        />
      </svg>
    )
  }
  return null
}

export function Bento() {
  const [ascii, setAscii] = useState('')
  const [fontSize, setFontSize] = useState(4)
  const wrapRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    fetch('/ascii-art2.txt')
      .then((r) => r.text())
      .then(setAscii)
      .catch(() => setAscii(''))
  }, [])

  useEffect(() => {
    const wrap = wrapRef.current
    if (!wrap || !ascii) return

    const lines = ascii.replace(/\r/g, '').split('\n').filter((line, index, arr) => !(index === arr.length - 1 && line === ''))
    const longest = Math.max(...lines.map((l) => l.length), 1)

    const update = () => {
      const w = wrap.clientWidth
      const h = wrap.clientHeight
      if (!w || !h) return

      const sizeW = w / (longest * 0.62)
      const sizeH = h / (lines.length * 1.05)
      setFontSize(Math.max(2.4, Math.min(sizeW, sizeH, 8)))
    }

    requestAnimationFrame(update)
    const ro = new ResizeObserver(update)
    ro.observe(wrap)
    return () => ro.disconnect()
  }, [ascii])

  return (
    <section id="panel-bento" className="snap-panel snap-start min-h-[100svh] flex flex-col items-center p-[clamp(1.1rem,3vw,3rem)]">
      <header className="section-header w-full pb-5">
        <h2 className="text-3xl tracking-[0.02em]">Overview</h2>
        <BinaryDivider />
      </header>

      <div className="grid w-full max-w-[1160px] grid-cols-1 gap-6 md:grid-cols-5">

        {/* SKILLS */}
        <article className="bento-card card-emotion md:col-span-2 flex flex-col overflow-hidden">
          <h3 className="text-[1.22rem] tracking-[0.02em]">Skills</h3>

          <ul className="relative z-10 mt-2 m-0 grid list-none content-start gap-2 p-0 text-sm leading-[1.5] text-[var(--text)]">
            {skills.map((item) => (
              <li key={item.key} className="flex items-start gap-2">
                <span className="mt-1 h-[6px] w-[6px] rounded-full bg-[var(--accent)]" aria-hidden="true" />
                <span>
                  {item.segments.map((segment, index) => (
                    <span
                      key={`${item.key}-${index}`}
                      className={segment.emphasis ? 'skill-emphasis' : undefined}
                    >
                      {segment.text}
                    </span>
                  ))}
                </span>
              </li>
            ))}
          </ul>

          <div
            ref={wrapRef}
            className="emotion-ascii-wrap mt-auto pointer-events-none opacity-40"
          >
            <pre className="emotion-ascii" style={{ fontSize }}>
              {ascii}
            </pre>
          </div>
        </article>

        {/* RIGHT: STACK */}
        <div className="md:col-span-3 grid gap-6">

          {/* CONTACT */}
          <article className="bento-card card-contact">
            <h3>Contact</h3>

            <ul className="contact-list">
              {contactItems.map((item) => (
                <li key={item.label}>
                  {item.href ? (
                    <a
                      className="contact-link"
                      href={item.href}
                      target={item.href.startsWith('http') ? '_blank' : undefined}
                      rel={item.href.startsWith('http') ? 'noreferrer' : undefined}
                    >
                      <span className="contact-label-wrap">
                        <ContactIcon icon={item.icon} />
                        <span>{item.label}</span>
                      </span>
                      <span className="contact-value">{item.value}</span>
                    </a>
                  ) : (
                    <div className="contact-link is-static">
                      <span className="contact-label-wrap">
                        <ContactIcon icon={item.icon} />
                        <span>{item.label}</span>
                      </span>
                      <span className="contact-value">{item.value}</span>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </article>

          {/* CONTRIBUTION */}
          <article className="bento-card card-contribution" aria-label="GitHub contributions">
            <GitHubContribution />
          </article>

        </div>

      </div>
    </section>
  )
}