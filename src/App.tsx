import { useEffect, useMemo, useRef, useState } from 'react'
import { Hero } from './components/hero'
import { Narrative } from './components/narrative'
import { Bento } from './components/bento'
import { BackgroundNoise } from './components/background-noise'
import './App.css'

function App() {
  const mainRef = useRef<HTMLElement | null>(null)
  const [activePanel, setActivePanel] = useState('panel-hero')

  const panels = useMemo(
    () => [
      { id: 'panel-hero', label: 'Home' },
      { id: 'panel-experience', label: 'Experience' },
      { id: 'panel-bento', label: 'Overview' },
    ],
    [],
  )

  useEffect(() => {
    const root = mainRef.current

    if (!root) {
      return
    }

    const elements = root.querySelectorAll<HTMLElement>('.snap-panel')

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.target.id) {
            setActivePanel(entry.target.id)
          }
        })
      },
      {
        root,
        threshold: 0.62,
      },
    )

    elements.forEach((element) => observer.observe(element))

    return () => {
      elements.forEach((element) => observer.unobserve(element))
      observer.disconnect()
    }
  }, [])

  const scrollToPanel = (id: string) => {
    const root = mainRef.current

    if (!root) {
      return
    }

    const target = root.querySelector<HTMLElement>(`#${id}`)
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <>
      <BackgroundNoise />

      <main
        ref={mainRef}
        className="relative z-10 h-screen snap-y snap-proximity overflow-y-auto scroll-smooth [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
      >
        <Hero />
        <Narrative />
        <Bento />
      </main>

      <nav
        className="fixed top-1/2 right-4 z-30 grid -translate-y-1/2 gap-[0.55rem] max-[960px]:right-[0.6rem]"
        aria-label="Section navigation"
      >
        {panels.map((panel) => (
          <button
            key={panel.id}
            type="button"
            className={`h-[10px] w-[10px] cursor-pointer rounded-full border-[1.5px] border-[rgba(137,158,157,0.30)] bg-transparent transition-transform duration-[180ms] hover:scale-[1.15] ${panel.id === activePanel ? 'border-[var(--accent)] bg-[var(--accent)]' : ''}`}
            onClick={() => scrollToPanel(panel.id)}
            aria-label={panel.label}
            title={panel.label}
          />
        ))}
      </nav>
    </>
  )
}

export default App
