import { Component, useCallback, useEffect, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import Environment from './Environment.jsx'
import Player from './Player.jsx'
import Interactions from './Interactions.jsx'
import EquipmentPanel from './EquipmentPanel.jsx'
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
  const enterButtonRef = useRef(null)
  const onLockChange = useCallback((value) => { setLocked(value); if (value) { setError(''); setHasExplored(true) } }, [])
  const onError = useCallback((message) => setError(message), [])
  const closeInspection = useCallback(() => {
    setInspecting(null)
  }, [])
  useEffect(() => {
    if (hasExplored && !locked && !inspecting) enterButtonRef.current?.focus()
  }, [hasExplored, locked, inspecting])
  return <section className="lunar-exterior" aria-label="Lunar Outpost Exterior">
    <SceneBoundary>
      <Canvas shadows dpr={[1, 1.5]} camera={{ fov: 70, near: 0.1, far: 350 }}
        fallback={<p className="exterior-fallback">WebGL is unavailable. Use a browser with hardware acceleration enabled.</p>}>
        <Environment />
        <Player enterButtonRef={enterButtonRef} onLockChange={onLockChange} onError={onError} paused={Boolean(inspecting)} />
        <Interactions blocked={Boolean(inspecting)} onNearby={setNearby} onInspect={setInspecting} />
      </Canvas>
    </SceneBoundary>
    <header className="exterior-hud">
      <div><p>Approximately Up // EVA 01</p><h1>Lunar Outpost Exterior</h1></div>
      <button type="button" onClick={onBack}>Back to Briefing</button>
    </header>
    <div className={`exterior-entry${locked || inspecting ? ' exterior-entry-hidden' : ''}`}>
      <p className="exterior-eyebrow">Surface exploration</p>
      <h2>Your first steps outside.</h2>
      <p>Follow the blue path to the airlock. Find the lander east of the habitat, and approach equipment to inspect it with E.</p>
      <button type="button" ref={enterButtonRef} disabled={locked || Boolean(inspecting)} tabIndex={locked || inspecting ? -1 : 0}>{hasExplored ? 'Resume Exploration' : 'Enter Exploration'}</button>
      <p>Click to capture the mouse. WASD walks · Mouse looks · Shift moves faster · E inspects · Escape releases the mouse.</p>
      <p className="exterior-help" role="status">{error || 'Desktop keyboard and mouse required. If mouse capture is blocked, allow pointer lock for this page.'}</p>
    </div>
    {locked && <div className="exterior-crosshair" aria-hidden="true">+</div>}
    {locked && nearby && !inspecting && <p className="exterior-prompt" role="status">Press E — Inspect {nearby.name}</p>}
    {inspecting && <EquipmentPanel equipment={inspecting} onClose={closeInspection} />}
    <footer className="exterior-instructions">{locked ? 'EXPLORING' : 'PAUSED'} · WASD walk · Mouse look · Shift faster · E inspect · Esc release<br />
      Procedural lunar training environment · Exterior only · Resource simulation runs separately</footer>
  </section>
}
