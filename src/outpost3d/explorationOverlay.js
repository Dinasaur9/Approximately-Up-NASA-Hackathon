export function dismissIntroduction(dismissed, location) {
  return dismissed.includes(location) ? dismissed : [...dismissed, location]
}

export function getExplorationOverlay({ location, dismissed, locked, blocked }) {
  if (locked || blocked) return 'hidden'
  return dismissed.includes(location) ? 'resume' : 'introduction'
}
