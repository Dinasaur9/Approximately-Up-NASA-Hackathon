import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { selectInteraction } from './interactions.js'

export default function Interactions({ blocked, onNearby, onInspect }) {
  const { camera, gl } = useThree()
  const lastId = useRef(null)
  const opening = useRef(false)
  useEffect(() => {
    if (!blocked) opening.current = false
    const down = (event) => {
      if (event.code !== 'KeyE' || event.repeat || blocked || opening.current || document.pointerLockElement !== gl.domElement) return
      // Recheck distance at the instant E is pressed, not against an old HUD value.
      const selected = selectInteraction(camera.position.x, camera.position.z)
      if (!selected) return
      event.preventDefault()
      opening.current = true
      document.exitPointerLock()
      onInspect(selected)
    }
    window.addEventListener('keydown', down)
    return () => window.removeEventListener('keydown', down)
  }, [blocked, camera, gl, onInspect])
  useFrame(() => {
    const selected = !blocked && document.pointerLockElement === gl.domElement
      ? selectInteraction(camera.position.x, camera.position.z) : null
    if (selected?.id !== lastId.current) {
      lastId.current = selected?.id
      onNearby(selected)
    }
  })
  return null
}
