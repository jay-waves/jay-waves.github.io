import { timelineEntries } from '../data/content'
import { BinaryDivider } from './binary-divider'

const timelineToneClasses = [
  'bg-[var(--card-blue)] text-[var(--text)]',
  'bg-[#C9A176] text-[var(--text)]',
  'bg-[var(--card-ochre)] text-[var(--text)]',
  'bg-[var(--card-rose)] text-[var(--text)]',
  'bg-[var(--card-mauve)] text-[#edf3e8]',
]

export function Narrative() {
  return (
    <section
      id="panel-experience"
      className="snap-panel grid min-h-[100svh] snap-start content-center justify-items-center gap-0 border-t border-[var(--line)] p-[clamp(1.1rem,3vw,3rem)]"
      aria-label="Narrative timeline"
    >
      <header className="section-header flex w-full flex-col gap-2 pb-5">
        <h2 className="text-3xl leading-tight tracking-[0.02em] max-[960px]:text-[1.75rem]">Experience</h2>
        <BinaryDivider />
      </header>

      <div className="relative grid w-full max-w-[760px] grid-cols-1 gap-[0.9rem] py-4">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute bottom-0 left-[12px] top-0 w-px rotate-[5deg] bg-[linear-gradient(180deg,rgba(137,158,157,0.05),rgba(137,158,157,0.22),rgba(137,158,157,0.05))] lg:left-1/2 lg:-translate-x-1/2 lg:rotate-0"
        />

        {timelineEntries.map((entry, index) => {
          const isOddCard = index % 2 === 0
          const toneClass = timelineToneClasses[index % timelineToneClasses.length]
          const isDarkTone = index % timelineToneClasses.length === 4
          const isInstituteCard = entry.title.includes('Institute 502')

          return (
          <article
            key={`${entry.period}-${entry.title}`}
            className={`relative z-[1] w-auto justify-self-stretch rounded-[26px] border border-[rgba(137,158,157,0.10)] px-4 pb-[0.95rem] pt-4 transition-[filter,border-color,transform] duration-[180ms] ease hover:-translate-y-[2px] hover:brightness-[0.955] hover:border-[rgba(137,158,157,0.22)] ml-[1.6rem] lg:ml-0 lg:w-[min(100%,560px)] lg:justify-self-center ${isOddCard ? 'lg:-translate-x-[58px]' : 'lg:translate-x-[58px]'} ${toneClass}`}
          >
            <span
              className={`absolute top-[1.15rem] z-[2] h-4 w-4 rounded-full bg-[var(--accent)] shadow-[0_0_0_5px_rgba(240,236,228,0.82),0_0_0_10px_rgba(137,158,157,0.10)] left-[-1.65rem] ${isOddCard ? 'lg:left-[calc(100%+26px)]' : 'lg:left-auto lg:right-[calc(100%+26px)]'}`}
              aria-hidden="true"
            />
            <p className={`mb-[0.4rem] mt-0 text-[0.85rem] ${isDarkTone ? 'text-[#d5e1e2]' : 'text-[var(--muted)]'} ${isInstituteCard ? '!text-[#f4f8f5]' : ''}`}>{entry.period}</p>
            <h3 className={`m-0 mb-[0.55rem] text-[1.03rem] ${isInstituteCard ? 'text-[#fcfffd]' : ''}`}>{entry.title}</h3>
            <p className={`m-0 ${isDarkTone ? 'text-[#edf3e8]' : 'text-[var(--muted)]'} ${isInstituteCard ? '!text-[#f1f7f3]' : ''}`}>{entry.text}</p>
            <p
              className={`mt-[0.8rem] inline-flex rounded-full border px-[0.58rem] py-[0.28rem] text-[0.76rem] ${isDarkTone ? 'border-[rgba(213,225,226,0.45)] bg-[rgba(237,243,232,0.08)] text-[#d5e1e2]' : 'border-[rgba(137,158,157,0.18)] bg-[rgba(255,255,255,0.18)] text-[var(--muted)]'} ${isInstituteCard ? '!border-[rgba(244,248,245,0.62)] !bg-[rgba(244,248,245,0.12)] !text-[#f4f8f5]' : ''}`}
            >
              {entry.category === 'Education' ? 'Education' : 'Internship'}
            </p>
          </article>
          )
        })}
      </div>
    </section>
  )
}
