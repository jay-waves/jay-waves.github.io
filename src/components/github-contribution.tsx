import { githubProfile } from '../data/content'

export function GitHubContribution() {
  const chartUrl = `https://ghchart.rshah.org/${githubProfile.username}`

  return (
    <article
      className="bento-card card-contribution card-span-contrib"
      aria-label="GitHub contributions"
    >
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
    </article>
  )
}
