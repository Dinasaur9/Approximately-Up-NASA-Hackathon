import { useEffect, useRef } from 'react'
import { LunarOutpostDashboard } from '../screens/LunarOutpost.jsx'
import { interiorStations } from './interiorStations.js'

export default function ResourceTerminal({ session, dispatch, onClose }) {
  const dialog = useRef(null)
  useEffect(() => { dialog.current.showModal() }, [])
  const terminal = interiorStations.find((entry) => entry.id === 'mission-control')
  return <dialog ref={dialog} className="resource-terminal" aria-labelledby="resource-terminal-title"
    onKeyDown={(event) => event.stopPropagation()}
    onCancel={(event) => { event.preventDefault(); onClose() }}>
    <header className="resource-terminal-header">
      <div><p className="exterior-eyebrow">Habitat 01 // Mission Control Terminal</p><h2 id="resource-terminal-title">Resource Management</h2></div>
      <button type="button" autoFocus onClick={onClose}>Close Terminal</button>
    </header>
    <div className="resource-terminal-body">
      <details className="resource-terminal-notes"><summary>About this terminal</summary><p>{terminal.description}</p></details>
      <p className="resource-terminal-notes">Time advances only with Advance One Hour. Restart Mission resets this resource simulation only; inventory and Missions 01–04 stay unchanged.</p>
      <LunarOutpostDashboard session={session} dispatch={dispatch} />
    </div>
    <footer className="resource-terminal-footer">Close to return to your current location, then click Resume Exploration. Resource settings and progress are retained.</footer>
  </dialog>
}
