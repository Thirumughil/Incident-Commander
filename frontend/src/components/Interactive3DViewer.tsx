import React, { useEffect, useRef, useState, useCallback } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { RotateCw, Sun, Compass, Target } from 'lucide-react'
import type { IncidentDetail } from '../types'

export interface Interactive3DViewerProps {
  modelFile?: string
  detail?: IncidentDetail
  backgroundColor?: string
  autoRotate?: boolean
  cameraControls?: boolean
  shadowIntensity?: number
  exposure?: number
  environmentImage?: 'neutral' | 'legacy'
  onSelectService?: (service: string) => void
  className?: string
}

/**
 * Interactive3DViewer
 * Adapted from Framer Interactive3DViewer:
 * https://framer.com/m/Interactive3DViewer-nTn47S.js@4q4EPuwYBuI0Yj31mcPU
 *
 * Provides photorealistic progressive 3D orbital motion, PBR shaders,
 * contact shadow ground pedestal, exposure calibration, and interactive hotspot telemetry.
 */
export const Interactive3DViewer: React.FC<Interactive3DViewerProps> = ({
  detail,
  backgroundColor = '#060b13',
  autoRotate = true,
  shadowIntensity = 1.2,
  exposure = 1.1,
  onSelectService,
  className = '',
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null)
  const controlsRef = useRef<OrbitControls | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const animFrameRef = useRef<number | null>(null)

  const [currentAutoRotate, setCurrentAutoRotate] = useState<boolean>(autoRotate)
  const [currentExposure, setCurrentExposure] = useState<number>(exposure)
  const [activePreset, setActivePreset] = useState<'origin' | 'blast' | 'default'>('default')

  // Smooth camera glide
  const glideCameraTo = useCallback((pos: [number, number, number], target: [number, number, number] = [0, 0, 0]) => {
    if (!cameraRef.current || !controlsRef.current) return
    const cam = cameraRef.current
    const ctrl = controlsRef.current
    const startPos = cam.position.clone()
    const endPos = new THREE.Vector3(...pos)
    const startTarget = ctrl.target.clone()
    const endTarget = new THREE.Vector3(...target)
    const startTime = performance.now()
    const duration = 650

    const step = (now: number) => {
      const elapsed = now - startTime
      const p = Math.min(1.0, elapsed / duration)
      const ease = 1 - Math.pow(1 - p, 3)
      cam.position.lerpVectors(startPos, endPos, ease)
      ctrl.target.lerpVectors(startTarget, endTarget, ease)
      ctrl.update()
      if (p < 1.0) {
        requestAnimationFrame(step)
      }
    }
    requestAnimationFrame(step)
  }, [])

  // Camera presets
  const handlePreset = (preset: 'origin' | 'blast' | 'default') => {
    setActivePreset(preset)
    if (preset === 'origin') {
      glideCameraTo([0, 45, 170], [0, 0, 0])
    } else if (preset === 'blast') {
      glideCameraTo([0, 160, 360], [0, 0, 0])
    } else {
      glideCameraTo([90, 120, 280], [0, 0, 0])
    }
  }

  // Setup Three.js WebGL Scene for the Interactive 3D Digital Twin
  useEffect(() => {
    if (!mountRef.current || !detail) return
    const container = mountRef.current
    const width = container.clientWidth || 800
    const height = container.clientHeight || 640

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(backgroundColor)
    scene.fog = new THREE.FogExp2(0x060b13, 0.0018)

    const camera = new THREE.PerspectiveCamera(40, width / height, 1, 2000)
    camera.position.set(90, 120, 280)
    cameraRef.current = camera

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = currentExposure
    container.innerHTML = ''
    container.appendChild(renderer.domElement)

    // 2. OrbitControls (Continuous Progressive Orbital Motion from Framer component)
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.06
    controls.maxDistance = 850
    controls.minDistance = 60
    controls.autoRotate = currentAutoRotate
    controls.autoRotateSpeed = 1.2
    controlsRef.current = controls

    // 3. PBR Lighting & Shadows
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85 * currentExposure)
    scene.add(ambientLight)

    const mainLight = new THREE.DirectionalLight(0xffffff, 1.5 * currentExposure)
    mainLight.position.set(100, 200, 100)
    scene.add(mainLight)

    const pointLight = new THREE.PointLight(0x38bdf8, 2.5 * currentExposure, 800)
    pointLight.position.set(0, 80, 80)
    scene.add(pointLight)

    // 4. Ground Shadow Pedestal (inspired by shadowIntensity)
    const groundGeo = new THREE.CylinderGeometry(210, 215, 6, 64)
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x070e18,
      roughness: 0.65,
      metalness: 0.35,
    })
    const groundMesh = new THREE.Mesh(groundGeo, groundMat)
    groundMesh.position.y = -62
    scene.add(groundMesh)

    // Soft Contact Shadow Ring
    const shadowGeo = new THREE.RingGeometry(0, 75 * shadowIntensity, 48)
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.65,
      side: THREE.DoubleSide,
    })
    const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat)
    shadowMesh.rotation.x = Math.PI / 2
    shadowMesh.position.y = -58.8
    scene.add(shadowMesh)

    // Glowing Cyan Boundary Track
    const ringGeo = new THREE.RingGeometry(95, 98, 64)
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.7,
    })
    const ringMesh = new THREE.Mesh(ringGeo, ringMat)
    ringMesh.rotation.x = Math.PI / 2
    ringMesh.position.y = -58.5
    scene.add(ringMesh)

    // 5. Build Digital Twin Meshes from Incident Data
    const originName = detail.origin || detail.graph.origin || ''
    const alertingSet = new Set(detail.alerting || [])
    const interactiveMeshes: THREE.Object3D[] = []

    // A. Origin Core Sphere
    let originRing: THREE.Mesh | null = null
    if (originName) {
      const geo = new THREE.SphereGeometry(15, 32, 32)
      const mat = new THREE.MeshStandardMaterial({
        color: 0xef4444,
        emissive: 0xb91c1c,
        emissiveIntensity: 0.85,
        roughness: 0.15,
        metalness: 0.85,
      })
      const mesh = new THREE.Mesh(geo, mat)
      mesh.position.set(0, 0, 0)
      mesh.userData = { id: originName, type: 'origin' }
      scene.add(mesh)
      interactiveMeshes.push(mesh)

      // Orbiting Halo Torus
      const torusGeo = new THREE.TorusGeometry(22, 1.6, 16, 64)
      const torusMat = new THREE.MeshStandardMaterial({
        color: 0xf87171,
        emissive: 0xef4444,
        emissiveIntensity: 0.9,
      })
      originRing = new THREE.Mesh(torusGeo, torusMat)
      originRing.rotation.x = Math.PI / 2
      scene.add(originRing)
    }

    // B. Suspect Change Octahedron (Diamond)
    if (detail.graph.change) {
      const octGeo = new THREE.OctahedronGeometry(13, 0)
      const octMat = new THREE.MeshStandardMaterial({
        color: 0xa855f7,
        emissive: 0x7e22ce,
        emissiveIntensity: 0.75,
        roughness: 0.15,
        metalness: 0.85,
      })
      const changeMesh = new THREE.Mesh(octGeo, octMat)
      changeMesh.position.set(-60, 36, 20)
      changeMesh.userData = { id: detail.graph.change.change, type: 'change' }
      scene.add(changeMesh)
      interactiveMeshes.push(changeMesh)

      // Connecting Beam Tube
      const curve = new THREE.LineCurve3(new THREE.Vector3(-60, 36, 20), new THREE.Vector3(0, 0, 0))
      const tubeGeo = new THREE.TubeGeometry(curve, 20, 2, 8, false)
      const tubeMat = new THREE.MeshStandardMaterial({
        color: 0xc084fc,
        emissive: 0xa855f7,
        emissiveIntensity: 0.5,
        roughness: 0.3,
      })
      const tubeMesh = new THREE.Mesh(tubeGeo, tubeMat)
      scene.add(tubeMesh)
    }

    // C. Alerting Cluster
    const nodes = detail.graph.nodes || []
    const alertNodes = nodes.filter(n => alertingSet.has(n.id) && n.id !== originName)
    const otherNodes = nodes.filter(n => !alertingSet.has(n.id) && n.id !== originName)

    alertNodes.forEach((node, idx) => {
      const count = alertNodes.length || 1
      const angle = (idx / count) * Math.PI * 2
      const radius = 95
      const x = Math.cos(angle) * radius
      const z = Math.sin(angle) * radius
      const y = 14 + Math.sin(idx * 2) * 10

      const geo = new THREE.SphereGeometry(10, 24, 24)
      const mat = new THREE.MeshStandardMaterial({
        color: 0xf97316,
        emissive: 0xc2410c,
        emissiveIntensity: 0.6,
        roughness: 0.25,
        metalness: 0.75,
      })
      const mesh = new THREE.Mesh(geo, mat)
      mesh.position.set(x, y, z)
      mesh.userData = { id: node.id, type: 'alerting' }
      scene.add(mesh)
      interactiveMeshes.push(mesh)

      // Connecting amber beam
      const curve = new THREE.LineCurve3(new THREE.Vector3(x, y, z), new THREE.Vector3(0, 0, 0))
      const tubeGeo = new THREE.TubeGeometry(curve, 20, 1.5, 8, false)
      const tubeMat = new THREE.MeshStandardMaterial({
        color: 0xf59e0b,
        emissive: 0xd97706,
        emissiveIntensity: 0.4,
        roughness: 0.4,
      })
      const tubeMesh = new THREE.Mesh(tubeGeo, tubeMat)
      scene.add(tubeMesh)
    })

    // D. Outer Blast Radius Services
    otherNodes.forEach((node, idx) => {
      const count = otherNodes.length || 1
      const angle = (idx / count) * Math.PI * 2 + 0.4
      const radius = 155
      const x = Math.cos(angle) * radius
      const z = Math.sin(angle) * radius
      const y = (idx % 2 === 0 ? 1 : -1) * 18

      const geo = new THREE.SphereGeometry(8, 20, 20)
      const mat = new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x0284c7,
        emissiveIntensity: 0.4,
        roughness: 0.3,
        metalness: 0.7,
      })
      const mesh = new THREE.Mesh(geo, mat)
      mesh.position.set(x, y, z)
      mesh.userData = { id: node.id, type: 'service' }
      scene.add(mesh)
      interactiveMeshes.push(mesh)
    })

    // 6. Raycaster for Interaction
    const raycaster = new THREE.Raycaster()
    const mouse = new THREE.Vector2(-999, -999)

    function onMouseMove(e: MouseEvent) {
      const rect = renderer.domElement.getBoundingClientRect()
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
    }

    function onClick() {
      raycaster.setFromCamera(mouse, camera)
      const hits = raycaster.intersectObjects(interactiveMeshes)
      if (hits.length > 0) {
        const id = hits[0].object.userData.id
        const hitPos = hits[0].object.position
        if (id && onSelectService && hits[0].object.userData.type !== 'change') {
          onSelectService(id)
        }
        glideCameraTo(
          [hitPos.x + 20, hitPos.y + 40, hitPos.z + 120],
          [hitPos.x, hitPos.y, hitPos.z]
        )
      }
    }

    renderer.domElement.addEventListener('mousemove', onMouseMove)
    renderer.domElement.addEventListener('click', onClick)

    // 7. Progressive Motion Animation Loop
    let clock = 0
    function animate() {
      animFrameRef.current = requestAnimationFrame(animate)
      clock += 0.02
      controls.update()

      if (originRing) {
        const s = 1 + Math.sin(clock * 2.5) * 0.1
        originRing.scale.set(s, s, s)
        originRing.rotation.z += 0.01
      }

      renderer.render(scene, camera)
    }
    animate()

    function handleResize() {
      if (!container || !renderer || !camera) return
      const w = container.clientWidth || 800
      const h = container.clientHeight || 640
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    }
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      renderer.domElement.removeEventListener('mousemove', onMouseMove)
      renderer.domElement.removeEventListener('click', onClick)
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
      renderer.dispose()
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement)
      }
    }
  }, [detail, backgroundColor, shadowIntensity, currentExposure, currentAutoRotate, onSelectService, glideCameraTo])

  // Sync autoRotate
  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.autoRotate = currentAutoRotate
      controlsRef.current.autoRotateSpeed = 1.2
    }
  }, [currentAutoRotate])

  return (
    <div
      className={`interactive-3d-viewer-root ${className}`}
      style={{
        width: '100%',
        height: '100%',
        minHeight: '640px',
        backgroundColor,
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Top Model Controls Bar */}
      <div
        className="model-viewer-controls-bar"
        style={{
          position: 'absolute',
          top: 16,
          left: 16,
          right: 16,
          zIndex: 10,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          pointerEvents: 'none',
        }}
      >
        <div style={{ display: 'flex', gap: 8, pointerEvents: 'auto' }}>
          {/* Auto-Rotate Toggle (from Framer Interactive3DViewer) */}
          <button
            type="button"
            className={`tool-btn ${currentAutoRotate ? 'active' : ''}`}
            onClick={() => setCurrentAutoRotate(!currentAutoRotate)}
            title="Toggle Continuous Progressive 3D Orbit"
            style={{
              padding: '6px 12px',
              fontSize: '12px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: currentAutoRotate ? 'rgba(56, 189, 248, 0.2)' : 'rgba(15, 23, 42, 0.85)',
              borderColor: currentAutoRotate ? '#38bdf8' : 'rgba(56, 189, 248, 0.2)',
              color: currentAutoRotate ? '#38bdf8' : '#94a3b8',
              borderRadius: 8,
              border: '1px solid',
              cursor: 'pointer',
              backdropFilter: 'blur(8px)',
            }}
          >
            <RotateCw size={13} className={currentAutoRotate ? 'spin-slow' : ''} />
            <span>{currentAutoRotate ? 'Orbiting (3D Motion)' : 'Orbit Paused'}</span>
          </button>

          {/* Exposure Adjustment (from Framer Interactive3DViewer) */}
          <button
            type="button"
            className="tool-btn"
            onClick={() => setCurrentExposure(prev => (prev >= 1.6 ? 0.8 : +(prev + 0.3).toFixed(1)))}
            title="Adjust WebGL HDR Exposure"
            style={{
              padding: '6px 12px',
              fontSize: '12px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: 'rgba(15, 23, 42, 0.85)',
              borderColor: 'rgba(56, 189, 248, 0.2)',
              color: '#94a3b8',
              borderRadius: 8,
              border: '1px solid',
              cursor: 'pointer',
              backdropFilter: 'blur(8px)',
            }}
          >
            <Sun size={13} color="#f59e0b" />
            <span>Exp: {currentExposure.toFixed(1)}x</span>
          </button>
        </div>

        {/* Camera Hotspot Presets */}
        <div style={{ display: 'flex', gap: 6, pointerEvents: 'auto' }}>
          <button
            type="button"
            onClick={() => handlePreset('origin')}
            style={{
              padding: '5px 10px',
              fontSize: '11px',
              background: activePreset === 'origin' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(15, 23, 42, 0.85)',
              borderColor: activePreset === 'origin' ? '#ef4444' : 'rgba(148, 163, 184, 0.2)',
              color: activePreset === 'origin' ? '#f87171' : '#94a3b8',
              borderRadius: 6,
              border: '1px solid',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <Target size={11} color="#ef4444" /> Focus Origin
          </button>

          <button
            type="button"
            onClick={() => handlePreset('blast')}
            style={{
              padding: '5px 10px',
              fontSize: '11px',
              background: activePreset === 'blast' ? 'rgba(56, 189, 248, 0.2)' : 'rgba(15, 23, 42, 0.85)',
              borderColor: activePreset === 'blast' ? '#38bdf8' : 'rgba(148, 163, 184, 0.2)',
              color: activePreset === 'blast' ? '#38bdf8' : '#94a3b8',
              borderRadius: 6,
              border: '1px solid',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <Compass size={11} color="#38bdf8" /> Blast Radius
          </button>

          <button
            type="button"
            onClick={() => handlePreset('default')}
            style={{
              padding: '5px 10px',
              fontSize: '11px',
              background: activePreset === 'default' ? 'rgba(148, 163, 184, 0.2)' : 'rgba(15, 23, 42, 0.85)',
              borderColor: activePreset === 'default' ? '#94a3b8' : 'rgba(148, 163, 184, 0.2)',
              color: '#ffffff',
              borderRadius: 6,
              border: '1px solid',
              cursor: 'pointer',
            }}
          >
            Reset
          </button>
        </div>
      </div>

      {/* Main 3D Canvas Mount */}
      <div
        ref={mountRef}
        style={{ width: '100%', height: '100%', flex: 1, minHeight: '640px' }}
      />

      {/* Interactive 3D Callout Badges Floating Over Key Nodes */}
      {detail?.origin && (
        <div
          style={{
            position: 'absolute',
            top: '44%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'none',
            zIndex: 5,
          }}
        >
          <div
            onClick={() => onSelectService?.(detail.origin!)}
            style={{
              background: 'rgba(239, 68, 68, 0.9)',
              border: '2px solid #ffffff',
              color: '#ffffff',
              padding: '4px 10px',
              borderRadius: '16px',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 0 20px rgba(239, 68, 68, 0.8)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              pointerEvents: 'auto',
            }}
          >
            <span>⚠️ {detail.origin} [ROOT CAUSE]</span>
          </div>
        </div>
      )}

      {/* Bottom Info Banner */}
      <div
        style={{
          position: 'absolute',
          bottom: 16,
          left: 16,
          zIndex: 10,
          background: 'rgba(10, 17, 28, 0.85)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(56, 189, 248, 0.2)',
          borderRadius: 10,
          padding: '8px 14px',
          fontSize: 11,
          color: '#94a3b8',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#38bdf8', boxShadow: '0 0 8px #38bdf8' }} />
        <span><strong>Interactive 3D Digital Twin</strong> • PBR shaded microservice topology, orbital auto-rotation & contact shadow pedestal</span>
      </div>
    </div>
  )
}
export default Interactive3DViewer
