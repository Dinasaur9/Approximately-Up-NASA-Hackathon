import { useEffect, useRef, useState } from 'react'
import { MISSION_ID, MISSIONS, getMissionProgress } from './missions.js'

export default function MissionPanel({ missions, onClose }) {
  const dialog = useRef(null)
  useEffect(() => { dialog.current.showModal() }, [])
  const [selected, setSelected] = useState(MISSION_ID)
  const mission = missions[selected]
  const objectives = getMissionProgress(mission)
  const next = objectives.find((o) => !o.completed)
  return <dialog ref={dialog} className="equipment-dialog" aria-labelledby="mission-title" onCancel={(event) => { event.preventDefault(); onClose() }}>
    <p className="exterior-eyebrow">Mission operations // Tracker</p>
    <div className="mission-selection" role="group" aria-label="Select mission">
      {Object.values(missions).map((entry) => <button type="button" key={entry.id} aria-pressed={selected === entry.id} onClick={() => setSelected(entry.id)}>{MISSIONS[entry.id].title} — {entry.status.replaceAll('-', ' ')}</button>)}
    </div>
    <h2 id="mission-title">{MISSIONS[mission.id].title}</h2>
    <p>{MISSIONS[mission.id].description}</p>
    <p className="mission-status">Status: {mission.status.replaceAll('-', ' ')}</p>
    <ul className="mission-objectives">{objectives.map((o) => <li key={o.id}><span aria-hidden="true">{o.completed ? '✓' : '○'}</span> {o.label} — {o.completed ? 'Complete' : 'Incomplete'}</li>)}</ul>
    <p>{mission.status === 'completed' ? MISSIONS[mission.id].completionMessage : mission.status === 'not-started' ? 'Enter exploration to begin. Opening this panel does not complete objectives.' : `Suggested next action: ${next.label}. Already-owned equipment is recognized.`}</p>
    <p className="equipment-note">Mission training state only. No live oxygen, resource-clock, or dashboard changes.</p>
    <button type="button" autoFocus onClick={onClose}>Close Missions</button>
  </dialog>
}
