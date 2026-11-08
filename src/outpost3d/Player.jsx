import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js'
import { Vector3 } from 'three'
import { canWalk, groundHeight, EYE_HEIGHT } from './world.js'

export default function Player({ enterButtonRef, onLockChange, onError, paused = false }) {
  const { camera, gl } = useThree()
  const keys = useRef(new Set())
  const controlRef = useRef(null)
  const forward = useRef(new Vector3())
  const right = useRef(new Vector3())

  useEffect(() => {
    camera.position.set(0, groundHeight(0, 16) + EYE_HEIGHT, 16)
    camera.lookAt(0, 2, -8)
    const controls = new PointerLockControls(camera, gl.domElement)
    controls.minPolarAngle = 0.15
    controls.maxPolarAngle = Math.PI - 0.15
    controlRef.current = controls
    const clear = () => keys.current.clear()
    const locked = () => { clear(); onLockChange(true) }
    const unlocked = () => { clear(); onLockChange(false) }
    const error = () => { clear(); onError('Mouse capture is unavailable. Allow pointer lock in your browser, then try again. A desktop mouse and keyboard are required.') }
    const enter = () => {
      if (!controls.enabled) return
      if (!gl.domElement.requestPointerLock) { error(); return }
      try {
        const request = gl.domElement.requestPointerLock()
        request?.catch(error)
      } catch { error() }
    }
    const down = (event) => {
      if (!controls.isLocked || !controls.enabled) return
      if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ShiftLeft', 'ShiftRight'].includes(event.code)) {
        event.preventDefault()
        keys.current.add(event.code)
      }
    }
    const up = (event) => keys.current.delete(event.code)
    const visibility = () => { if (document.hidden) clear() }
    const button = enterButtonRef.current
    button?.addEventListener('click', enter)
    controls.addEventListener('lock', locked)
    controls.addEventListener('unlock', unlocked)
    document.addEventListener('pointerlockerror', error)
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', clear)
    document.addEventListener('visibilitychange', visibility)
    return () => {
      button?.removeEventListener('click', enter)
      controls.removeEventListener('lock', locked)
      controls.removeEventListener('unlock', unlocked)
      document.removeEventListener('pointerlockerror', error)
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('blur', clear)
      document.removeEventListener('visibilitychange', visibility)
      if (document.pointerLockElement === gl.domElement) document.exitPointerLock()
      controls.dispose()
      controlRef.current = null
      clear()
    }
  }, [camera, gl, enterButtonRef, onLockChange, onError])

  useEffect(() => {
    if (controlRef.current) controlRef.current.enabled = !paused
    if (paused) keys.current.clear()
  }, [paused])

  useFrame(({ camera: activeCamera }, delta) => {
    if (paused || !controlRef.current?.isLocked) return
    const held = keys.current
    const longitudinal = Number(held.has('KeyW')) - Number(held.has('KeyS'))
    const lateral = Number(held.has('KeyD')) - Number(held.has('KeyA'))
    if (!longitudinal && !lateral) return
    activeCamera.getWorldDirection(forward.current)
    forward.current.y = 0
    forward.current.normalize()
    right.current.crossVectors(forward.current, activeCamera.up).normalize()
    const speed = held.has('ShiftLeft') || held.has('ShiftRight') ? 5 : 2.5
    const step = speed * Math.min(delta, 0.05) / Math.hypot(longitudinal, lateral)
    const dx = (forward.current.x * longitudinal + right.current.x * lateral) * step
    const dz = (forward.current.z * longitudinal + right.current.z * lateral) * step
    // Separate axis resolution lets the astronaut slide along building walls.
    if (canWalk(activeCamera.position.x + dx, activeCamera.position.z)) activeCamera.position.x += dx
    if (canWalk(activeCamera.position.x, activeCamera.position.z + dz)) activeCamera.position.z += dz
    activeCamera.position.y = groundHeight(activeCamera.position.x, activeCamera.position.z) + EYE_HEIGHT
  })
  return null
}
