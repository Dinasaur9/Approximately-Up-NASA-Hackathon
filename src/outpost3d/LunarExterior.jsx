import { Component, useCallback, useEffect, useReducer, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import Environment from './Environment.jsx'
import Player from './Player.jsx'
import Interactions from './Interactions.jsx'
import EquipmentPanel from './EquipmentPanel.jsx'
import HabitatInterior from './HabitatInterior.jsx'
import GreenhouseInterior from './GreenhouseInterior.jsx'
import InventoryPanel from './InventoryPanel.jsx'
import Collectibles from './Collectibles.jsx'
import { selectCollectibleInteraction } from './collectibles.js'
import MissionPanel from './MissionPanel.jsx'
import MissionEvents from './MissionEvents.jsx'
import ControlsPanel from './ControlsPanel.jsx'
import { dismissIntroduction, getExplorationOverlay } from './explorationOverlay.js'
import { createExplorationSession, explorationReducer, canRepairSystem, missingRepairItems, getMissionProgress, MISSIONS } from './missions.js'
import { ITEM_TYPES } from './inventory.js'
import { selectGreenhouseInteraction } from './greenhouse.js'
import { sceneProfiles, transitionDestination, createDoorState, canWalkInterior, selectInteriorInteraction, toggleDoor } from './interior.js'
import { interactables, selectInteraction } from './interactions.js'
import './LunarExterior.css'

class SceneBoundary extends Component {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() {
    return this.state.failed ? <p className="exterior-fallback" role="alert">The 3D scene could not start. Check WebGL support and hardware acceleration in your browser.</p> : this.props.children
  }
}

export default function LunarExterior({ onBack }) {
  const [locked, setLocked] = useState(false)
  const [error, setError] = useState('')
  const [nearby, setNearby] = useState(null)
  const [inspecting, setInspecting] = useState(null)
  const [dismissedIntroductions, setDismissedIntroductions] = useState([])
  const [helpOpen, setHelpOpen] = useState(false)
  const panelGate = useRef(null)
  const [location, setLocation] = useState('exterior')
  const [profile, setProfile] = useState(sceneProfiles.initial)
  const [transition, setTransition] = useState(null)
  const [doorState, setDoorState] = useState(createDoorState)
  const [doorNotice, setDoorNotice] = useState('')
  const [inventoryOpen, setInventoryOpen] = useState(false)
  const [inventorySession, dispatch] = useReducer(explorationReducer, undefined, createExplorationSession)
  const [missionOpen, setMissionOpen] = useState(false)
  const [inspectionContext, setInspectionContext] = useState(null)
  const mission = inventorySession.mission
  const operational = mission.status === 'completed'
  const missing = missingRepairItems(inventorySession.inventory)
  const nextObjective = getMissionProgress(mission).find((o) => !o.completed)
  const title = location === 'interior' ? 'Lunar Habitat Interior' : location === 'greenhouse' ? 'Lunar Greenhouse Interior' : 'Lunar Outpost Exterior'
  const interiorWalkable = useCallback((x, z) => canWalkInterior(x, z, doorState), [doorState])
  const interiorSelection = useCallback((x, z) => selectInteriorInteraction(x, z, doorState), [doorState])
  const resolveInteraction = useCallback((x, z) => {
    const base = location === 'interior' ? interiorSelection(x, z)
      : location === 'greenhouse' ? selectGreenhouseInteraction(x, z) : selectInteraction(x, z, interactables)
    return selectCollectibleInteraction(x, z, location, inventorySession.collectedIds, base)
  }, [location, interiorSelection, inventorySession.collectedIds])
  const transitionGuard = useRef(false)
  const blocked = Boolean(inspecting || transition || inventoryOpen || missionOpen || helpOpen)
  const overlay = getExplorationOverlay({ location, dismissed: dismissedIntroductions, locked, blocked })
  const enterButtonRef = useRef(null)
  const onLockChange = useCallback((value) => { setLocked(value); if (value) { setError(''); dispatch({ type: 'start' }) } }, [])
  const onError = useCallback((message) => setError(message), [])
  const closeInspection = useCallback(() => {
    panelGate.current = null
    setInspecting(null)
  }, [])
  const closeInventory = useCallback(() => { panelGate.current = null; setInventoryOpen(false) }, [])
  const closeMissions = useCallback(() => { panelGate.current = null; setMissionOpen(false) }, [])
  const closeHelp = useCallback(() => { panelGate.current = null; setHelpOpen(false) }, [])
  const dismissCurrentIntroduction = () => setDismissedIntroductions((current) => dismissIntroduction(current, location))
  const openHelp = () => {
    if (panelGate.current || transitionGuard.current) return
    panelGate.current = 'help'
    dismissCurrentIntroduction()
    if (document.pointerLockElement) document.exitPointerLock()
    setHelpOpen(true)
  }
  useEffect(() => {
    const toggleInventory = (event) => {
      if (!['KeyI', 'KeyM', 'KeyH'].includes(event.code) || event.repeat || event.ctrlKey || event.metaKey || event.altKey || transitionGuard.current) return
      const requested = event.code === 'KeyI' ? 'inventory' : event.code === 'KeyM' ? 'missions' : 'help'
      if (panelGate.current && panelGate.current !== requested) return
      if (event.target.closest?.('input, textarea, select, [contenteditable="true"]')) return
      event.preventDefault()
      panelGate.current = panelGate.current === requested ? null : requested
      setDismissedIntroductions((current) => dismissIntroduction(current, location))
      if (document.pointerLockElement) document.exitPointerLock()
      if (event.code === 'KeyI') setInventoryOpen((open) => !open)
      else if (event.code === 'KeyM') setMissionOpen((open) => !open)
      else setHelpOpen((open) => !open)
    }
    window.addEventListener('keydown', toggleInventory)
    return () => window.removeEventListener('keydown', toggleInventory)
  }, [location])
  useEffect(() => {
    if (!inventorySession.notification) return
    const timer = setTimeout(() => dispatch({ type: 'dismiss-notification' }), 7000)
    return () => clearTimeout(timer)
  }, [inventorySession.notification])
  const interact = useCallback((entry, position) => {
    if (transitionGuard.current) return
    if (panelGate.current && !(panelGate.current === 'inspection' && !position)) return
    if (entry.action === 'collect') {
      dispatch({ type: 'collect', id: entry.id })
      return
    }
    if (entry.action === 'door' && location === 'interior') {
      const next = toggleDoor(doorState, entry.id, position.x, position.z)
      setDoorState(next)
      setDoorNotice(next === doorState ? 'Step clear of the doorway before closing it.' : '')
      return
    }
    const destination = transitionDestination(location, entry.action)
    if (!destination) {
      panelGate.current = 'inspection'
      setDismissedIntroductions((current) => dismissIntroduction(current, location))
      setInspectionContext({ location, consoleId: entry.id, x: position?.x, z: position?.z, doorState })
      setInspecting(entry)
      return
    }
    transitionGuard.current = true
    panelGate.current = 'transition'
    setInspecting(null)
    setNearby(null)
    setLocked(false)
    setTransition({ destination, profileKey: entry.action === 'exit-greenhouse' ? 'greenhouseExterior' : destination, phase: 'out' })
  }, [location, doorState])
  const panelAction = useCallback((action) => {
    // Only actions explicitly offered by the currently open panel are allowed.
    if (inspecting?.panelAction?.action === action) interact({ action })
  }, [inspecting, interact])
  useEffect(() => {
    if (!transition) return
    const timer = setTimeout(() => {
      if (transition.phase === 'out') {
        setLocation(transition.destination)
        dispatch({ type: 'scene-entered', location: transition.destination })
        setProfile(sceneProfiles[transition.profileKey])
        setTransition({ ...transition, phase: 'in' })
      } else {
        transitionGuard.current = false
        panelGate.current = null
        setTransition(null)
      }
    }, transition.phase === 'out' ? 250 : 300)
    return () => clearTimeout(timer)
  }, [transition])
  useEffect(() => {
    if (overlay !== 'hidden') enterButtonRef.current?.focus()
  }, [overlay, location])
  return <section className="lunar-exterior" aria-label={title}>
    <SceneBoundary>
      <Canvas shadows dpr={[1, 1.5]} camera={{ fov: 70, near: 0.1, far: 350 }}
        fallback={<p className="exterior-fallback">WebGL is unavailable. Use a browser with hardware acceleration enabled.</p>}>
        {location === 'interior' ? <HabitatInterior doorState={doorState} filtrationOperational={operational} /> : location === 'greenhouse' ? <GreenhouseInterior /> : <Environment />}
        <Collectibles location={location} collectedIds={inventorySession.collectedIds} />
        <Player enterButtonRef={enterButtonRef} onLockChange={onLockChange} onError={onError} paused={blocked} profile={profile} canWalkOverride={location === 'interior' ? interiorWalkable : undefined} />
        <Interactions blocked={blocked} onNearby={setNearby} onInspect={interact} resolveInteraction={resolveInteraction} />
        <MissionEvents location={location} doorState={doorState} blocked={blocked} dispatch={dispatch} />
      </Canvas>
    </SceneBoundary>
    <header className="exterior-hud">
      <div><p>Approximately Up // {location === 'interior' ? 'HAB 01' : location === 'greenhouse' ? 'AGRI 01' : 'EVA 01'}</p><h1>{title}</h1></div>
      <div className="exterior-header-actions">
        <button type="button" disabled={blocked} onClick={openHelp}>Help / Controls</button>
        <button type="button" onClick={onBack}>Back to Briefing</button>
      </div>
    </header>
    <div className={`exterior-entry${overlay === 'hidden' ? ' exterior-entry-hidden' : ''}${dismissedIntroductions.includes(location) ? ' exterior-resume' : ''}`}>
      {overlay === 'introduction' && <div>
      <p className="exterior-eyebrow">{location === 'interior' ? 'Pressurized habitat' : location === 'greenhouse' ? 'Agricultural research module' : 'Surface exploration'}</p>
      <h2>{location === 'interior' ? 'Welcome to Habitat 01.' : location === 'greenhouse' ? 'Welcome to Greenhouse 01.' : 'Your first steps outside.'}</h2>
      <p>{location === 'interior' ? 'Use E to open compartment doors along the central corridor. Inspect mission control, life support, research, and crew quarters. Return to the entry airlock and press E to exit.' : location === 'greenhouse' ? 'Explore the growing racks. Use E to inspect hydroponics, water and nutrients, environmental control, and crop storage. Return to the marked airlock to exit.' : 'Inspect the habitat or greenhouse and choose Enter from its information panel. Explore the lander and exterior equipment.'}</p>
      <p>Click to capture the mouse. WASD walks · Mouse looks · Shift moves faster · E inspects · Escape releases the mouse.</p>
      </div>}
      <button key="pointer-lock-entry" type="button" ref={enterButtonRef} onClick={dismissCurrentIntroduction} disabled={locked || blocked} tabIndex={locked || blocked ? -1 : 0}>{dismissedIntroductions.includes(location) ? 'Click to Resume Exploration' : 'Begin Exploration'}</button>
      {overlay === 'resume' && <p>H: Help / Controls</p>}
      {error && <p className="exterior-help" role="status">{error}</p>}
    </div>
    {locked && <div className="exterior-crosshair" aria-hidden="true">+</div>}
    {locked && nearby && !blocked && <p className="exterior-prompt" role="status">Press E — {nearby.prompt || `Inspect ${nearby.name}`}{nearby.action === 'door' && doorNotice && <><br />{doorNotice}</>}</p>}
    {inspecting && <EquipmentPanel equipment={inspecting} onClose={closeInspection} onAction={panelAction} context={location === 'interior' ? 'Habitat station' : location === 'greenhouse' ? 'Greenhouse station' : 'Surface equipment'}>
      {inspecting.id === 'life-support' && location === 'interior' && <section className="mission-maintenance" aria-live="polite">
        <h3>Filtration: {operational ? 'Operational' : 'Maintenance Required'}</h3>
        <p>{operational ? 'Filter replaced. Repair Tool retained. Mission complete.' : 'Replace the filtration cartridge using the reusable Repair Tool.'}</p>
        <div className="maintenance-requirements">
          <h4>Required equipment</h4>
          <ul>{MISSIONS[mission.id].requirements.map((requirement) => {
            const name = ITEM_TYPES[requirement.itemId].name
            const status = operational && requirement.consumed ? 'Installed' : missing.includes(name) ? 'Missing' : 'Available'
            return <li key={requirement.itemId}>
              <span>{name} ×{requirement.quantity}<small>{requirement.consumed ? 'Consumed on repair' : 'Reusable — retained after repair'}</small></span>
              <strong>{status}</strong>
            </li>
          })}</ul>
        </div>
        {!operational && <div className="maintenance-action">
          {missing.length > 0 && <p>Missing: {missing.join(', ')}. Collect this equipment before repairing.</p>}
          <button type="button" disabled={!canRepairSystem(inventorySession, inspectionContext)} onClick={() => dispatch({ type: 'repair', context: inspectionContext })}>Repair System</button>
        </div>}
        <p className="maintenance-disclaimer">Inspecting the console does not change resources. Completing the repair updates mission maintenance state and consumes one inventory filter. The resource simulation remains separate: oxygen quantities and simulation time do not change.</p>
      </section>}
    </EquipmentPanel>}
    {inventoryOpen && <InventoryPanel inventory={inventorySession.inventory} onClose={closeInventory} />}
    {missionOpen && <MissionPanel mission={mission} onClose={closeMissions} />}
    {helpOpen && <ControlsPanel onClose={closeHelp} />}
    {inventorySession.notification && <p className="inventory-notification" role="status">{inventorySession.notification}</p>}
    {transition && <div className={`habitat-transition habitat-transition-${transition.phase}`} role="status">Cycling airlock… {transition.destination === 'interior' ? 'Entering habitat' : transition.destination === 'greenhouse' ? 'Entering greenhouse' : 'Returning to lunar surface'}</div>}
    <footer className="exterior-instructions">{locked ? 'EXPLORING' : 'PAUSED'} · WASD walk · Mouse look · Shift faster · E interact · I inventory · M missions · H help · Esc release<br />
      Mission 01: {operational ? 'Completed — filtration restored' : nextObjective?.label} · {mission.status.replaceAll('-', ' ')}<br />
      {location === 'interior' ? 'Habitat 01 / Interior' : location === 'greenhouse' ? 'Greenhouse 01 / Interior' : 'Lunar surface / Exterior'} · Resource simulation runs separately</footer>
  </section>
}
