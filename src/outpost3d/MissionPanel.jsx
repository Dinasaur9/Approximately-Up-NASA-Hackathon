import { useEffect, useRef } from 'react'
import { MISSIONS, getMissionProgress } from './missions.js'

export default function MissionPanel({ mission, onClose }) {
  const dialog = useRef(null)
  useEffect(() => { dialog.current.showModal() }, [])
  const objectives = getMissionProgress(mission)
  const next = objectives.find((o) => !o.completed)
  return <dialog ref={dialog} className="equipment-dialog" aria-labelledby="mission-title" onCancel={(event) => { event.preventDefault(); onClose() }}>
    <p className="exterior-eyebrow">Mission operations // Tracker</p>
    <h2 id="mission-title">{MISSIONS[mission.id].title}</h2>
    <p>{MISSIONS[mission.id].description}</p>
    <p className="mission-status">Status: {mission.status.replaceAll('-', ' ')}</p>
    <ul className="mission-objectives">{objectives.map((o) => <li key={o.id}><span aria-hidden="true">{o.completed ? '✓' : '○'}</span> {o.label} — {o.completed ? 'Complete' : 'Incomplete'}</li>)}</ul>
    <p>{mission.status === 'completed' ? 'All objectives complete. Filtration restored.' : mission.status === 'not-started' ? 'Enter exploration to begin. Opening this panel does not complete objectives.' : `Suggested next action: ${next.label}. Items can be collected in either order.`}</p>
    <p className="equipment-note">Mission training state only. No live oxygen, resource-clock, or dashboard changes.</p>
    <button type="button" autoFocus onClick={onClose}>Close Missions</button>
  </dialog>
}
