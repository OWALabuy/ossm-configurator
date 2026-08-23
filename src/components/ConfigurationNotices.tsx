import { EvidenceBadge } from './EvidenceBadge'
import type { ConfigurationNoticeViewModel } from './view-models'

export function ConfigurationNotices({
  notices,
}: {
  notices: ConfigurationNoticeViewModel[]
}) {
  if (notices.length === 0) return null

  return (
    <section
      className="configuration-notices"
      aria-label="Configuration notices"
    >
      {notices.map((notice) => (
        <article
          className={`configuration-notice configuration-notice--${notice.severity}`}
          key={notice.id}
        >
          <span className="configuration-notice__icon" aria-hidden="true">
            {notice.severity === 'error'
              ? '×'
              : notice.severity === 'warning'
                ? '!'
                : 'i'}
          </span>
          <div>
            <h3>{notice.title}</h3>
            <p>{notice.message}</p>
            {notice.evidence && (
              <EvidenceBadge evidence={notice.evidence} compact />
            )}
          </div>
        </article>
      ))}
    </section>
  )
}
