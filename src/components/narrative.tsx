import { timelineEntries } from '../data/content'

export function Narrative() {
  return (
    <section
      id="panel-experience"
      className="snap-panel grid min-h-[100svh] snap-start content-center justify-items-center gap-4 border-t border-[var(--line)] p-[clamp(1.1rem,3vw,3rem)]"
      aria-label="Narrative timeline"
    >
      <header className="flex w-[min(100%,1160px)] items-baseline justify-between gap-4 border-b border-dashed border-[var(--line)] pb-3 max-[960px]:flex-col max-[960px]:items-start">
        <h2 className="text-3xl leading-tight tracking-[0.02em] max-[960px]:text-[1.75rem]">Experience</h2>
      </header>

      <div className="timeline-shell">
        {timelineEntries.map((entry) => (
          <article
            key={`${entry.period}-${entry.title}`}
            className={`timeline-card timeline-${entry.category}`}
          >
            <span className="timeline-dot" aria-hidden="true"></span>
            <p className="timeline-period">{entry.period}</p>
            <h3>{entry.title}</h3>
            <p>{entry.text}</p>
            <p className="timeline-category">
              {entry.category === 'Education' ? 'Education' : 'Internship'}
            </p>
          </article>
        ))}
      </div>
    </section>
  )
}
