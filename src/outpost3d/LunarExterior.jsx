import { Component, useCallback, useEffect, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import Environment from './Environment.jsx'
import Player from './Player.jsx'
import Interactions from './Interactions.jsx'
import EquipmentPanel from './EquipmentPanel.jsx'
import HabitatInterior from './HabitatInterior.jsx'
import GreenhouseInterior from './GreenhouseInterior.jsx'
import { greenhouseInteractions, selectGreenhouseInteraction } from './greenhouse.js'
import { interiorInteractions, sceneProfiles, transitionDestination, createDoorState, canWalkInterior, selectInteriorInteraction, toggleDoor } from './interior.js'
import { interactables } from './interactions.js'
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
  const [hasExplored, setHasExplored] = useState(false)
  const [location, setLocation] = useState('exterior')
  const [profile, setProfile] = useState(sceneProfiles.initial)
  const [transition, setTransition] = useState(null)
  const [doorState, setDoorState] = useState(createDoorState)
  const [doorNotice, setDoorNotice] = useState('')
  const title = location === 'interior' ? 'Lunar Habitat Interior' : location === 'greenhouse' ? 'Lunar Greenhouse Interior' : 'Lunar Outpost Exterior'
  const interiorWalkable = useCallback((x, z) => canWalkInterior(x, z, doorState), [doorState])
  const interiorSelection = useCallback((x, z) => selectInteriorInteraction(x, z, doorState), [doorState])
  const transitionGuard = useRef(false)
  const blocked = Boolean(inspecting || transition)
  const enterButtonRef = useRef(null)
  const onLockChange = useCallback((value) => { setLocked(value); if (value) { setError(''); setHasExplored(true) } }, [])
  const onError = useCallback((message) => setError(message), [])
  const closeInspection = useCallback(() => {
    setInspecting(null)
  }, [])
  const interact = useCallback((entry, position) => {
    if (transitionGuard.current) return
    if (entry.action === 'door' && location === 'interior') {
      const next = toggleDoor(doorState, entry.id, position.x, position.z)
      setDoorState(next)
      setDoorNotice(next === doorState ? 'Step clear of the doorway before closing it.' : '')
      return
    }
    const destination = transitionDestination(location, entry.action)
    if (!destination) { setInspecting(entry); return }
    transitionGuard.current = true
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
        setProfile(sceneProfiles[transition.profileKey])
        setTransition({ ...transition, phase: 'in' })
      } else {
        transitionGuard.current = false
        setTransition(null)
      }
    }, transition.phase === 'out' ? 250 : 300)
    return () => clearTimeout(timer)
  }, [transition])
  useEffect(() => {
    if (hasExplored && !locked && !blocked) enterButtonRef.current?.focus()
  }, [hasExplored, locked, blocked])
  return <section className="lunar-exterior" aria-label={title}>
    <SceneBoundary>
      <Canvas shadows dpr={[1, 1.5]} camera={{ fov: 70, near: 0.1, far: 350 }}
        fallback={<p className="exterior-fallback">WebGL is unavailable. Use a browser with hardware acceleration enabled.</p>}>
        {location === 'interior' ? <HabitatInterior doorState={doorState} /> : location === 'greenhouse' ? <GreenhouseInterior /> : <Environment />}
        <Player enterButtonRef={enterButtonRef} onLockChange={onLockChange} onError={onError} paused={blocked} profile={profile} canWalkOverride={location === 'interior' ? interiorWalkable : undefined} />
        <Interactions blocked={blocked} onNearby={setNearby} onInspect={interact} entries={location === 'interior' ? interiorInteractions : location === 'greenhouse' ? greenhouseInteractions : interactables} resolveInteraction={location === 'interior' ? interiorSelection : location === 'greenhouse' ? selectGreenhouseInteraction : undefined} />
      </Canvas>
    </SceneBoundary>
    <header className="exterior-hud">
      <div><p>Approximately Up // {location === 'interior' ? 'HAB 01' : location === 'greenhouse' ? 'AGRI 01' : 'EVA 01'}</p><h1>{title}</h1></div>
      <button type="button" onClick={onBack}>Back to Briefing</button>
    </header>
    <div className={`exterior-entry${locked || blocked ? ' exterior-entry-hidden' : ''}`}>
      <p className="exterior-eyebrow">{location === 'interior' ? 'Pressurized habitat' : location === 'greenhouse' ? 'Agricultural research module' : 'Surface exploration'}</p>
      <h2>{location === 'interior' ? 'Welcome to Habitat 01.' : location === 'greenhouse' ? 'Welcome to Greenhouse 01.' : 'Your first steps outside.'}</h2>
      <p>{location === 'interior' ? 'Use E to open compartment doors along the central corridor. Inspect mission control, life support, research, and crew quarters. Return to the entry airlock and press E to exit.' : location === 'greenhouse' ? 'Explore the growing racks. Use E to inspect hydroponics, water and nutrients, environmental control, and crop storage. Return to the marked airlock to exit.' : 'Inspect the habitat or greenhouse and choose Enter from its information panel. Explore the lander and exterior equipment.'}</p>
      <button type="button" ref={enterButtonRef} disabled={locked || blocked} tabIndex={locked || blocked ? -1 : 0}>{hasExplored ? 'Resume Exploration' : 'Enter Exploration'}</button>
      <p>Click to capture the mouse. WASD walks · Mouse looks · Shift moves faster · E inspects · Escape releases the mouse.</p>
      <p className="exterior-help" role="status">{error || 'Desktop keyboard and mouse required. If mouse capture is blocked, allow pointer lock for this page.'}</p>
    </div>
    {locked && <div className="exterior-crosshair" aria-hidden="true">+</div>}
    {locked && nearby && !blocked && <p className="exterior-prompt" role="status">Press E — {nearby.prompt || `Inspect ${nearby.name}`}{nearby.action === 'door' && doorNotice && <><br />{doorNotice}</>}</p>}
    {inspecting && <EquipmentPanel equipment={inspecting} onClose={closeInspection} onAction={panelAction} context={location === 'interior' ? 'Habitat station' : location === 'greenhouse' ? 'Greenhouse station' : 'Surface equipment'} />}
    {transition && <div className={`habitat-transition habitat-transition-${transition.phase}`} role="status">Cycling airlock… {transition.destination === 'interior' ? 'Entering habitat' : transition.destination === 'greenhouse' ? 'Entering greenhouse' : 'Returning to lunar surface'}</div>}
    <footer className="exterior-instructions">{locked ? 'EXPLORING' : 'PAUSED'} · WASD walk · Mouse look · Shift faster · E inspect · Esc release<br />
      {location === 'interior' ? 'Habitat 01 / Interior' : location === 'greenhouse' ? 'Greenhouse 01 / Interior' : 'Lunar surface / Exterior'} · Resource simulation runs separately</footer>
  </section>
}
