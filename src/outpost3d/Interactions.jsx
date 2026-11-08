import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { selectInteraction, interactables } from './interactions.js'

export default function Interactions({ blocked, onNearby, onInspect, entries = interactables, resolveInteraction }) {
  const { camera, gl } = useThree()
  const lastId = useRef(null)
  const opening = useRef(false)
  useEffect(() => {
    if (!blocked) opening.current = false
    const down = (event) => {
      if (event.code !== 'KeyE' || event.repeat || blocked || opening.current || document.pointerLockElement !== gl.domElement) return
      // Recheck distance at the instant E is pressed, not against an old HUD value.
      const selected = resolveInteraction ? resolveInteraction(camera.position.x, camera.position.z) : selectInteraction(camera.position.x, camera.position.z, entries)
      if (!selected) return
      event.preventDefault()
      if (selected.action !== 'door') {
        opening.current = true
        document.exitPointerLock()
      }
      onInspect(selected, { x: camera.position.x, z: camera.position.z })
    }
    window.addEventListener('keydown', down)
    return () => window.removeEventListener('keydown', down)
  }, [blocked, camera, gl, onInspect, entries, resolveInteraction])
  useFrame(() => {
    const selected = !blocked && document.pointerLockElement === gl.domElement
      ? (resolveInteraction ? resolveInteraction(camera.position.x, camera.position.z) : selectInteraction(camera.position.x, camera.position.z, entries)) : null
    const signature = selected ? `${selected.id}:${selected.prompt || ''}` : null
    if (signature !== lastId.current) {
      lastId.current = signature
      onNearby(selected)
    }
  })
  return null
}
