import { useEffect, useRef } from 'react'

export default function EquipmentPanel({ equipment, onClose }) {
  const dialog = useRef(null)
  useEffect(() => {
    dialog.current.showModal()
  }, [])
  return <dialog ref={dialog} className="equipment-dialog" aria-labelledby="equipment-title" onCancel={(event) => { event.preventDefault(); onClose() }}>
    <p className="exterior-eyebrow">Surface equipment // Inspection</p>
    <h2 id="equipment-title">{equipment.name}</h2>
    <p>{equipment.description}</p>
    <dl><dt>Primary function</dt><dd>{equipment.function}</dd><dt>Mission connection</dt><dd>{equipment.relationship}</dd></dl>
    <p className="equipment-note">Information only. Inspecting equipment does not change resources.</p>
    <button type="button" autoFocus onClick={onClose}>Close Inspection</button>
  </dialog>
}
