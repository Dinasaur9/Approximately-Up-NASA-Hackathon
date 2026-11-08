import { useEffect, useRef } from 'react'

export default function EquipmentPanel({ equipment, onClose, onAction, context = 'Surface equipment' }) {
  const dialog = useRef(null)
  useEffect(() => {
    dialog.current.showModal()
  }, [])
  return <dialog ref={dialog} className="equipment-dialog" aria-labelledby="equipment-title" onCancel={(event) => { event.preventDefault(); onClose() }}>
    <p className="exterior-eyebrow">{context} // Inspection</p>
    <h2 id="equipment-title">{equipment.name}</h2>
    <p>{equipment.description}</p>
    <dl><dt>Primary function</dt><dd>{equipment.function}</dd><dt>Mission connection</dt><dd>{equipment.relationship}</dd></dl>
    <p className="equipment-note">Information only. Inspecting equipment does not change resources.</p>
    {equipment.panelAction && onAction && <button type="button" onClick={() => onAction(equipment.panelAction.action)}>{equipment.panelAction.label}</button>}
    <button type="button" autoFocus onClick={onClose}>Close Inspection</button>
  </dialog>
}
