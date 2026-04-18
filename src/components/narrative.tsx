import { timelineEntries } from '../data/content'

export function Narrative() {
  return (
    <section
      id="panel-experience"
      className="narrative-section snap-panel"
      aria-label="Narrative timeline"
    >
      <header className="narrative-header">
        <h2>Experience</h2>
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
