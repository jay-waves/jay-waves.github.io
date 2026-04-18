import { useEffect, useMemo, useRef, useState } from 'react'
import { Hero } from './components/hero'
import { Narrative } from './components/narrative'
import { Bento } from './components/bento'
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
      <main ref={mainRef} className="fullpage-shell">
        <Hero />
        <Narrative />
        <Bento />
      </main>

      <nav className="page-dots" aria-label="Section navigation">
        {panels.map((panel) => (
          <button
            key={panel.id}
            type="button"
            className={panel.id === activePanel ? 'is-active' : ''}
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
