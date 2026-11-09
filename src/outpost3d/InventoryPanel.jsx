import { useEffect, useRef, useState } from 'react'
import { ITEM_TYPES } from './inventory.js'

export default function InventoryPanel({ inventory, onClose }) {
  const dialog = useRef(null)
  const [selected, setSelected] = useState(0)
  useEffect(() => { dialog.current.showModal() }, [])
  const slot = inventory[selected]
  const item = slot ? ITEM_TYPES[slot.itemId] : null
  return <dialog ref={dialog} className="equipment-dialog inventory-dialog" aria-labelledby="inventory-title" onCancel={(event) => { event.preventDefault(); onClose() }}>
    <p className="exterior-eyebrow">EVA equipment // Personal inventory</p>
    <h2 id="inventory-title">Player Inventory</h2>
    <p>{inventory.filter(Boolean).length} / {inventory.length} slots occupied · I to close</p>
    <div className="inventory-grid" role="group" aria-label="Inventory slots">
      {inventory.map((entry, index) => <button key={index} type="button" aria-pressed={selected === index} onClick={() => setSelected(index)}>
        <span className="inventory-icon" aria-hidden="true">{entry ? ITEM_TYPES[entry.itemId].icon : '·'}</span>
        <span>Slot {index + 1}: {entry ? ITEM_TYPES[entry.itemId].name : 'Empty'}</span>
        {entry && <strong>×{entry.quantity}</strong>}
      </button>)}
    </div>
    <section className="inventory-description" aria-live="polite">
      <h3>{item?.name || 'Empty slot'}</h3>
      <p>{item?.description || 'Collect equipment in the world with E to fill a slot.'}</p>
      {item && <p>{item.maxStack === 1 ? 'Non-stackable' : `Stack limit: ${item.maxStack}`}</p>}
    </section>
    <p className="equipment-note">Use mission equipment at the Life-Support Console or solar station. Inventory remains separate from the resource simulation.</p>
    <button type="button" autoFocus onClick={onClose}>Close Inventory</button>
  </dialog>
}
