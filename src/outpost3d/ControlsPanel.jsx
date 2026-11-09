import { useEffect, useRef } from 'react'

export default function ControlsPanel({ onClose }) {
  const dialog = useRef(null)
  useEffect(() => { dialog.current.showModal() }, [])
  return <dialog ref={dialog} className="equipment-dialog" aria-labelledby="controls-title" onCancel={(event) => { event.preventDefault(); onClose() }}>
    <p className="exterior-eyebrow">Mission control // Exploration help</p>
    <h2 id="controls-title">Help / Controls</h2>
    <dl>
      <dt>WASD / Mouse</dt><dd>Walk and look around after clicking Resume Exploration.</dd>
      <dt>Shift</dt><dd>Move faster while held.</dd>
      <dt>E</dt><dd>Use the nearby prompt to inspect, collect, open a door, or exit a module.</dd>
      <dt>I / M</dt><dd>Toggle inventory or the mission tracker. Close the current panel before opening another.</dd>
      <dt>H</dt><dd>Open or close this help panel.</dd>
      <dt>Escape</dt><dd>Release mouse-look or close a panel.</dd>
    </dl>
    <p>Inspect the habitat or greenhouse entrance and choose Enter. Mission 01 requires the Repair Tool and Replacement Oxygen Filter at the habitat Life-Support Console.</p>
    <p className="equipment-note">Closing a panel preserves your view. Click the compact resume prompt to recapture the mouse. Desktop keyboard and mouse required.</p>
    <p className="equipment-note">Resource indicators show the next hour’s model preview, labeled PLAN. They do not advance time. Reserve warnings use stored battery ≤3.6 kWh and oxygen ≤0.64 kg. Dim lighting is a visual warning only; it does not save simulated power. Last completed greenhouse power is shown separately in the HUD.</p>
    <button type="button" autoFocus onClick={onClose}>Close Help</button>
  </dialog>
}
