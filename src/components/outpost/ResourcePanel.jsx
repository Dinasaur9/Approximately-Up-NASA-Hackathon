import { useId } from 'react'

export default function ResourcePanel({ label, value, unit, maximum, description, warning }) {
  const id = useId()
  return (
    <article className={`outpost-panel outpost-resource${warning ? ' outpost-warning' : ''}`}>
      <h2 id={id}>{label}</h2>
      <p className="outpost-value">{value.toFixed(2)} <span>{unit}</span></p>
      <meter aria-labelledby={id} min={0} max={maximum} value={Math.min(value, maximum)} />
      <p className="outpost-caption">{description}</p>
      {warning && <p className="outpost-warning-text">Warning: {warning}</p>}
    </article>
  )
}
