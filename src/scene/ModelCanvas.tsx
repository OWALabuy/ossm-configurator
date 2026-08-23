import { OrbitControls } from '@react-three/drei'
import { Canvas, useLoader, useThree } from '@react-three/fiber'
import { Suspense, useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import {
  Box3,
  BufferGeometry,
  Color,
  Mesh,
  PerspectiveCamera,
  Sphere,
  Vector3,
} from 'three'
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js'

import { calculateCameraFit } from './camera-fit'

export interface ModelCanvasProps {
  url: string
  resetVersion: number
  onReady: () => void
}

export default function ModelCanvas({
  url,
  resetVersion,
  onReady,
}: ModelCanvasProps) {
  return (
    <Canvas
      className="part-viewer__canvas"
      camera={{ fov: 38, near: 0.01, far: 100_000, position: [2, 1.4, 2] }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true }}
      onCreated={({ gl }) => {
        gl.setClearColor(new Color('#111713'), 0)
      }}
    >
      <ambientLight intensity={1.15} />
      <hemisphereLight args={['#e9f4ed', '#34463d', 1.8]} />
      <directionalLight color="#fff5d6" intensity={2.8} position={[4, 7, 5]} />
      <directionalLight
        color="#a8cdb8"
        intensity={1.1}
        position={[-5, 1, -3]}
      />
      <Suspense fallback={null}>
        <StlPart url={url} resetVersion={resetVersion} onReady={onReady} />
      </Suspense>
    </Canvas>
  )
}

function StlPart({ url, resetVersion, onReady }: ModelCanvasProps) {
  const loadedGeometry = useLoader(STLLoader, url)
  const geometry = useDisposableCenteredGeometry(loadedGeometry)
  const meshRef = useRef<Mesh>(null)
  const controlsRef = useRef<React.ComponentRef<typeof OrbitControls>>(null)
  const { camera, size } = useThree()

  useLayoutEffect(() => {
    const mesh = meshRef.current
    const controls = controlsRef.current
    if (!mesh || !controls || !(camera instanceof PerspectiveCamera)) return

    const bounds = new Box3().setFromObject(mesh)
    const sphere = bounds.getBoundingSphere(new Sphere())
    const fit = calculateCameraFit(
      sphere.radius,
      camera.fov,
      size.width / size.height,
    )
    const direction = new Vector3(1, 0.72, 1).normalize()

    camera.position.copy(direction.multiplyScalar(fit.distance))
    camera.near = fit.near
    camera.far = fit.far
    camera.updateProjectionMatrix()
    controls.target.set(0, 0, 0)
    controls.update()
    controls.saveState()
    onReady()
  }, [camera, geometry, onReady, resetVersion, size.height, size.width])

  return (
    <>
      <mesh ref={meshRef} geometry={geometry} castShadow receiveShadow>
        <meshStandardMaterial
          color="#c4d9ca"
          roughness={0.66}
          metalness={0.08}
        />
      </mesh>
      <OrbitControls
        ref={controlsRef}
        makeDefault
        enableDamping
        dampingFactor={0.08}
        minDistance={0.01}
        screenSpacePanning
      />
    </>
  )
}

function useDisposableCenteredGeometry(source: BufferGeometry): BufferGeometry {
  const geometry = useMemo(() => {
    const clone = source.clone()
    clone.center()
    if (!clone.attributes.normal) clone.computeVertexNormals()
    clone.computeBoundingBox()
    clone.computeBoundingSphere()
    return clone
  }, [source])

  useEffect(() => () => geometry.dispose(), [geometry])
  return geometry
}
