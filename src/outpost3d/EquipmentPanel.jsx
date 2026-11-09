import { useEffect, useRef } from 'react'

export default function EquipmentPanel({ equipment, onClose, onAction, context = 'Surface equipment', children }) {
  const dialog = useRef(null)
  useEffect(() => {
    dialog.current.showModal()
  }, [])
  return <dialog ref={dialog} className="equipment-dialog equipment-inspection" aria-labelledby="equipment-title" onCancel={(event) => { event.preventDefault(); onClose() }}>
    <div className="inspection-content">
    <p className="exterior-eyebrow">{context} // Inspection</p>
    <h2 id="equipment-title">{equipment.name}</h2>
    <p>{equipment.description}</p>
    <dl><dt>Primary function</dt><dd>{equipment.function}</dd><dt>Mission connection</dt><dd>{equipment.relationship}</dd></dl>
    <p className="equipment-note">Inspecting this equipment does not change resources.</p>
    {children}
    {equipment.panelAction && onAction && <button type="button" onClick={() => onAction(equipment.panelAction.action)}>{equipment.panelAction.label}</button>}
    </div>
    <footer className="inspection-actions">
      <button type="button" autoFocus onClick={onClose}>Close Inspection</button>
    </footer>
  </dialog>
}
