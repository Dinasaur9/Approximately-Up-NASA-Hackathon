import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { atSolarStation, getInteriorRoom } from './missions.js'

export default function MissionEvents({ location, doorState, blocked, dispatch }) {
  const { gl } = useThree()
  const lastRoom = useRef(null)
  useFrame(({ camera }) => {
    if (blocked || document.pointerLockElement !== gl.domElement) { lastRoom.current = null; return }
    const room = location === 'interior' ? getInteriorRoom(camera.position.x, camera.position.z, doorState) : location === 'exterior' && atSolarStation(camera.position.x, camera.position.z) ? 'solar' : null
    if (room !== lastRoom.current) {
      lastRoom.current = room
      dispatch({ type: 'position', x: camera.position.x, z: camera.position.z, doorState })
    }
  })
  return null
}
