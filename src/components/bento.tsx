import { bentoCards, contactItems, type ContactItem } from '../data/content'
import { GitHubContribution } from './github-contribution'

function ContactIcon({ icon }: { icon: ContactItem['icon'] }) {
  if (icon === 'email') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="contact-icon">
        <path
          fill="currentColor"
          d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2Zm0 4-8 5-8-5V6l8 5 8-5v2Z"
        />
      </svg>
    )
  }

  if (icon === 'blog') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="contact-icon">
        <path
          fill="currentColor"
          d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2Zm-7 3c1.93 0 3.5 1.57 3.5 3.5S13.93 13 12 13s-3.5-1.57-3.5-3.5S10.07 6 12 6Zm7 13H5v-.23c0-.62.28-1.2.76-1.58C7.47 15.82 9.64 15 12 15s4.53.82 6.24 2.19c.48.38.76.97.76 1.58V19Z"
        />
      </svg>
    )
  }

  if (icon === 'github') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="contact-icon">
        <path
          fill="currentColor"
          d="M12 2C6.477 2 2 6.589 2 12.248c0 4.526 2.865 8.367 6.839 9.722.5.095.682-.223.682-.496 0-.245-.009-.894-.014-1.754-2.782.617-3.369-1.372-3.369-1.372-.455-1.18-1.11-1.495-1.11-1.495-.908-.637.069-.624.069-.624 1.004.072 1.532 1.055 1.532 1.055.892 1.566 2.341 1.114 2.91.852.091-.666.349-1.114.635-1.37-2.221-.26-4.556-1.137-4.556-5.063 0-1.119.389-2.034 1.029-2.75-.103-.261-.446-1.31.098-2.731 0 0 .84-.277 2.75 1.05A9.3 9.3 0 0 1 12 6.836a9.3 9.3 0 0 1 2.504.348c1.909-1.327 2.747-1.05 2.747-1.05.546 1.42.203 2.47.1 2.731.64.716 1.028 1.631 1.028 2.75 0 3.936-2.339 4.799-4.566 5.054.359.318.678.944.678 1.903 0 1.374-.013 2.482-.013 2.819 0 .276.18.596.688.495A10.26 10.26 0 0 0 22 12.248C22 6.589 17.523 2 12 2Z"
        />
      </svg>
    )
  }

  if (icon === 'wechat') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="contact-icon">
        <path
          fill="currentColor"
          d="M9.238 5C5.238 5 2 7.654 2 10.93c0 1.885 1.074 3.56 2.748 4.65L4.1 18.6l3.336-1.66c.584.11 1.188.168 1.802.168.191 0 .379-.006.566-.018a5.604 5.604 0 0 1-.146-1.263c0-3.275 3.238-5.93 7.238-5.93.08 0 .159.003.238.006C16.467 7.116 13.178 5 9.238 5Zm-2.62 4.68a.81.81 0 1 1 0-1.62.81.81 0 0 1 0 1.62Zm5.24 0a.81.81 0 1 1 0-1.62.81.81 0 0 1 0 1.62Zm4.904 1.86c-2.893 0-5.238 1.927-5.238 4.304 0 1.326.73 2.512 1.878 3.303L13 21l2.353-1.17c.456.088.928.134 1.409.134 2.893 0 5.238-1.927 5.238-4.304 0-2.377-2.345-4.304-5.238-4.304Zm-1.746 4.065a.66.66 0 1 1 0-1.321.66.66 0 0 1 0 1.321Zm3.492 0a.66.66 0 1 1 0-1.321.66.66 0 0 1 0 1.321Z"
        />
      </svg>
    )
  }

  return null
}

function getCardClass(type: string) {
  if (type === 'skills') {
    return 'card-span-mid'
  }

  if (type === 'publication') {
    return 'card-span-mid'
  }

  if (type === 'contact') {
    return 'card-span-wide'
  }

  return 'card-span-compact'
}

export function Bento() {
  return (
    <section id="panel-bento" aria-label="Info summary" className="snap-panel grid min-h-[100svh] snap-start content-center justify-items-center gap-[1.2rem] border-t border-[var(--line)] p-[clamp(1.1rem,3vw,3rem)]">
      <header className="flex w-[min(100%,1160px)] items-baseline justify-between gap-4 border-b border-dashed border-[var(--line)] pb-3 max-[960px]:flex-col max-[960px]:items-start">
        <h2 className="text-3xl leading-tight tracking-[0.02em] max-[960px]:text-[1.75rem]">Overview</h2>
      </header>

      <div className="bento-grid">
        {bentoCards.map((card) => (
          <article key={card.type} className={`bento-card card-${card.type} ${getCardClass(card.type)}`} >
            <h3>{card.title}</h3>
            {card.type === 'contact' ? (
              <ul className="contact-list">
                {contactItems.map((item) => (
                  <li key={item.label}>
                    {item.href ? (
                      <a className="contact-link"
                        href={item.href}
                        target={item.href.startsWith('http') ? '_blank' : undefined}
                        rel={item.href.startsWith('http') ? 'noreferrer' : undefined}
                        aria-label={`${item.label}: ${item.value}`}
                      >
                        <span className="contact-label-wrap">
                          <ContactIcon icon={item.icon} />
                          <span className="contact-label">{item.label}</span>
                        </span>
                        <span className="contact-value">{item.value}</span>
                      </a>
                    ) : (
                      <span className="contact-link is-static">
                        <span className="contact-label-wrap">
                          <ContactIcon icon={item.icon} />
                          <span className="contact-label">{item.label}</span>
                        </span>
                        <span className="contact-value">{item.value}</span>
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <ul>
                {card.lines.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            )}
          </article>
        ))}

        <GitHubContribution />
      </div>
    </section>
  )
}
