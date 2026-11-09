// Session inventory only. No resource effects, mission rewards, or persistence IO.
export const ITEM_TYPES = Object.freeze({
  filter: Object.freeze({ name: 'Replacement Oxygen Filter', icon: '▤', maxStack: 3, description: 'A sealed replacement filter cartridge for atmosphere-handling equipment. Mission 01 consumes one cartridge when repairing filtration at the Life-Support Console.' }),
  tool: Object.freeze({ name: 'Repair Tool', icon: '⚒', maxStack: 1, description: 'A reusable maintenance tool. Each tool occupies its own slot. Required for Mission 01 repair and retained afterward.' }),
  nutrient: Object.freeze({ name: 'Nutrient Sample', icon: '◈', maxStack: 5, description: 'A labeled sample of hydroponic nutrients for later research. It does not change greenhouse production.' }),
  cell: Object.freeze({ name: 'Spare Power Cell', icon: '▣', maxStack: 2, description: 'A portable spare cell. Mission 02 consumes one cell during exterior solar station maintenance. It does not charge the resource-model battery.' }),
})
export const INVENTORY_SLOTS = 6

export function createInventory(capacity = INVENTORY_SLOTS) {
  if (!Number.isInteger(capacity) || capacity < 1 || capacity > 100) throw new RangeError('Invalid inventory capacity.')
  return Array(capacity).fill(null)
}
function validate(inventory, itemId, quantity) {
  if (!Array.isArray(inventory) || inventory.length < 1 || !ITEM_TYPES[itemId] || !Number.isInteger(quantity) || quantity < 1) throw new TypeError('Invalid inventory operation.')
  for (const slot of inventory) {
    if (slot !== null && (!ITEM_TYPES[slot.itemId] || !Number.isInteger(slot.quantity) || slot.quantity < 1 || slot.quantity > ITEM_TYPES[slot.itemId].maxStack)) throw new TypeError('Invalid inventory slot.')
  }
}
export function ownsItem(inventory, itemId, quantity = 1) {
  validate(inventory, itemId, quantity)
  return inventory.reduce((sum, slot) => sum + (slot?.itemId === itemId ? slot.quantity : 0), 0) >= quantity
}
/** Atomic operation: insufficient space leaves the original inventory untouched. */
export function addItem(inventory, itemId, quantity = 1) {
  validate(inventory, itemId, quantity)
  const limit = ITEM_TYPES[itemId].maxStack
  const capacity = inventory.reduce((sum, slot) => sum + (!slot ? limit : slot.itemId === itemId ? limit - slot.quantity : 0), 0)
  if (capacity < quantity) return { ok: false, inventory, reason: 'Inventory full. No items were collected.' }
  let remaining = quantity
  const next = inventory.map((slot) => {
    if (slot?.itemId !== itemId || !remaining) return slot ? { ...slot } : null
    const added = Math.min(remaining, limit - slot.quantity)
    remaining -= added
    return { itemId, quantity: slot.quantity + added }
  })
  for (let i = 0; i < next.length && remaining; i++) {
    if (next[i]) continue
    const added = Math.min(remaining, limit)
    next[i] = { itemId, quantity: added }
    remaining -= added
  }
  return { ok: true, inventory: next }
}
export function removeItem(inventory, itemId, quantity = 1) {
  validate(inventory, itemId, quantity)
  if (!ownsItem(inventory, itemId, quantity)) return { ok: false, inventory, reason: 'Not enough items.' }
  let remaining = quantity
  const next = inventory.map((slot) => {
    if (slot?.itemId !== itemId || !remaining) return slot ? { ...slot } : null
    const removed = Math.min(remaining, slot.quantity)
    remaining -= removed
    return slot.quantity === removed ? null : { ...slot, quantity: slot.quantity - removed }
  })
  return { ok: true, inventory: next }
}
export const createInventorySession = () => ({ inventory: createInventory(), collectedIds: [], notification: '' })

/** Immutable collection transaction couples inventory changes to unique world IDs. */
export function collectItem(state, object) {
  if (!object || typeof object.id !== 'string' || !object.id || !ITEM_TYPES[object.itemId] || !Number.isInteger(object.quantity) || object.quantity < 1) throw new TypeError('Invalid collectible.')
  if (state.collectedIds.includes(object.id)) return state
  const result = addItem(state.inventory, object.itemId, object.quantity)
  if (!result.ok) return { ...state, notification: result.reason }
  return { inventory: result.inventory, collectedIds: [...state.collectedIds, object.id], notification: `Collected ${ITEM_TYPES[object.itemId].name} ×${object.quantity}. Press I to view inventory.` }
}
