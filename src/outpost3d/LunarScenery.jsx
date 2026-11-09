import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { BufferAttribute, CanvasTexture, Color, Object3D, PlaneGeometry, Quaternion, RepeatWrapping, Vector3 } from 'three'
import { createScenicRocks, regolithShade, scenicHeight, scenicRandom } from './scenery.js'

export default function LunarScenery() {
  const rocksRef = useRef(null)
  const rocks = useMemo(() => createScenicRocks(), [])
  const { terrain, horizon, texture } = useMemo(() => {
    function surface(size, segments, distant = false) {
      const geometry = new PlaneGeometry(size, size, segments, segments)
      geometry.rotateX(-Math.PI / 2)
      const positions = geometry.attributes.position
      const colors = new Float32Array(positions.count * 3)
      const color = new Color()
      for (let i = 0; i < positions.count; i++) {
        const x = positions.getX(i), z = positions.getZ(i)
        positions.setY(i, scenicHeight(x, z) - (distant ? 0.04 : 0))
        const shade = regolithShade(x, z)
        color.setRGB(shade, shade * 0.98, shade * 0.94)
        color.toArray(colors, i * 3)
      }
      if (distant) {
        // Remove the horizon's center so coarse triangles cannot protrude into paths.
        const indices = []
        const source = geometry.index.array
        for (let i = 0; i < source.length; i += 3) {
          const triangle = [source[i], source[i + 1], source[i + 2]]
          if (triangle.every((index) => Math.max(Math.abs(positions.getX(index)), Math.abs(positions.getZ(index))) >= 90)) indices.push(...triangle)
        }
        geometry.setIndex(indices)
      }
      geometry.setAttribute('color', new BufferAttribute(colors, 3))
      geometry.computeVertexNormals()
      return geometry
    }
    // Tiny deterministic regolith texture: no downloads, displacement or airborne dust.
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 128
    const context = canvas.getContext('2d')
    const pixels = context.createImageData(128, 128)
    for (let i = 0; i < 128 * 128; i++) {
      const value = 180 + Math.floor(scenicRandom(i) * 65)
      pixels.data.set([value, value, value, 255], i * 4)
    }
    context.putImageData(pixels, 0, 0)
    const texture = new CanvasTexture(canvas)
    texture.wrapS = texture.wrapT = RepeatWrapping
    texture.repeat.set(120, 120)
    return { terrain: surface(190, 180), horizon: surface(480, 160, true), texture }
  }, [])
  useEffect(() => () => { terrain.dispose(); horizon.dispose(); texture.dispose() }, [terrain, horizon, texture])
  useLayoutEffect(() => {
    const transform = new Object3D()
    const up = new Vector3(0, 1, 0)
    const normal = new Vector3()
    const yaw = new Quaternion()
    rocks.forEach(({ x, y, z, scale, normal: slope, rotation, shade }, i) => {
      normal.set(...slope).normalize()
      // Align the rock to its local face and bury most of its lower hemisphere.
      transform.position.set(x, y, z).addScaledVector(normal, scale[1] * 0.2)
      transform.quaternion.setFromUnitVectors(up, normal)
      yaw.setFromAxisAngle(up, rotation)
      transform.quaternion.multiply(yaw)
      transform.scale.set(...scale)
      transform.updateMatrix()
      rocksRef.current.setMatrixAt(i, transform.matrix)
      rocksRef.current.setColorAt(i, new Color().setRGB(shade, shade * 0.985, shade * 0.96))
    })
    rocksRef.current.instanceMatrix.needsUpdate = true
    rocksRef.current.instanceColor.needsUpdate = true
    rocksRef.current.computeBoundingSphere()
  }, [rocks])
  return <>
    <mesh geometry={horizon} receiveShadow><meshStandardMaterial vertexColors roughness={1} /></mesh>
    <mesh geometry={terrain} receiveShadow><meshStandardMaterial vertexColors map={texture} roughness={1} /></mesh>
    <instancedMesh ref={rocksRef} args={[undefined, undefined, rocks.length]} receiveShadow>
      <icosahedronGeometry args={[1, 1]} /><meshStandardMaterial roughness={1} />
    </instancedMesh>
  </>
}
