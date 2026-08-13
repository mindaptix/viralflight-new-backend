type ChartRow = { label: string; value: number }

const ORANGE = '#F7921D'
const GREEN = '#21B011'

function compact(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(value >= 10_000 ? 0 : 1)}K`
  return String(value)
}

function BarChart({ rows, accent = ORANGE }: { rows: ChartRow[]; accent?: string }) {
  const max = Math.max(...rows.map((row) => row.value), 1)
  if (!rows.length) return <div className="empty-state">No data yet.</div>
  return (
    <ul className="insight-bars">
      {rows.map((row) => (
        <li key={row.label}>
          <span title={row.label}>{row.label}</span>
          <div className="insight-track">
            <i style={{ width: `${Math.max(6, (row.value / max) * 100)}%`, background: accent }} />
          </div>
          <strong>{compact(row.value)}</strong>
        </li>
      ))}
    </ul>
  )
}

function Donut({ rows }: { rows: ChartRow[] }) {
  const total = rows.reduce((sum, row) => sum + row.value, 0)
  if (!total) return <div className="empty-state">No niche data yet.</div>
  const colors = [ORANGE, GREEN, '#111111', '#fbbf24', '#d97a12', '#6b7280']
  let offset = 0
  const stops = rows.map((row, index) => {
    const start = offset
    const pct = (row.value / total) * 100
    offset += pct
    return `${colors[index % colors.length]} ${start}% ${offset}%`
  })
  return (
    <div className="insight-donut">
      <div className="insight-ring" style={{ background: `conic-gradient(${stops.join(', ')})` }}>
        <div>
          <strong>{total}</strong>
          <span>creators</span>
        </div>
      </div>
      <ul>
        {rows.map((row, index) => (
          <li key={row.label}>
            <i style={{ background: colors[index % colors.length] }} />
            {row.label}
            <em>{row.value}</em>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function InsightCharts({
  pipeline,
  campaignViews,
  cities,
  niches,
}: {
  pipeline: ChartRow[]
  campaignViews: ChartRow[]
  cities: ChartRow[]
  niches: ChartRow[]
}) {
  return (
    <section className="insight-grid">
      <article className="dash-card">
        <div className="dash-card-head">
          <h2>Delivery pipeline</h2>
          <span>Where creators sit today</span>
        </div>
        <BarChart accent={ORANGE} rows={pipeline} />
      </article>
      <article className="dash-card">
        <div className="dash-card-head">
          <h2>Campaign views</h2>
          <span>Live Instagram performance</span>
        </div>
        <BarChart accent={GREEN} rows={campaignViews} />
      </article>
      <article className="dash-card">
        <div className="dash-card-head">
          <h2>Creators by city</h2>
          <span>Where the roster sits</span>
        </div>
        <BarChart accent={ORANGE} rows={cities} />
      </article>
      <article className="dash-card">
        <div className="dash-card-head">
          <h2>Niche mix</h2>
          <span>What Viral Flight can pitch</span>
        </div>
        <Donut rows={niches} />
      </article>
    </section>
  )
}
