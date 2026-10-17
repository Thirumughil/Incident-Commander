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

function createTextSprite(text: string, color = '#38bdf8', bg = 'rgba(16, 17, 21, 0.88)') {
  const canvas = document.createElement('canvas')
  canvas.width = 280
  canvas.height = 68
  const ctx = canvas.getContext('2d')
  if (ctx) {
    ctx.fillStyle = bg
    ctx.beginPath()
    ctx.roundRect(6, 6, 268, 56, 10)
    ctx.fill()
    ctx.strokeStyle = color
    ctx.lineWidth = 2.5
    ctx.stroke()

    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 20px "DM Sans", Inter, -apple-system, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(text, 140, 34)
  }
  const texture = new THREE.CanvasTexture(canvas)
  const spriteMaterial = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false })
  const sprite = new THREE.Sprite(spriteMaterial)
  sprite.scale.set(32, 7.8, 1)
  return sprite
}

/**
 * Interactive3DViewer
 * Adapted from Framer Interactive3DViewer:
 * https://framer.com/m/Interactive3DViewer-nTn47S.js@4q4EPuwYBuI0Yj31mcPU
 *
 * Renders the true FalkorDB knowledge graph (nodes, DEPENDS_ON edges,
 * suspect change events, and causal explain paths) with photorealistic
 * progressive 3D orbital motion, PBR shaders, and contact shadow ground pedestal.
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
      glideCameraTo([0, 160, 380], [0, 0, 0])
    } else {
      glideCameraTo([90, 130, 290], [0, 0, 0])
    }
  }

  // Setup Three.js WebGL Scene for the FalkorDB Interactive 3D Digital Twin
  useEffect(() => {
    if (!mountRef.current || !detail) return
    const container = mountRef.current
    const width = container.clientWidth || 800
    const height = container.clientHeight || 640

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(backgroundColor)
    scene.fog = new THREE.FogExp2(0x060b13, 0.0016)

    const camera = new THREE.PerspectiveCamera(40, width / height, 1, 2000)
    camera.position.set(90, 130, 290)
    cameraRef.current = camera

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = currentExposure
    container.innerHTML = ''
    container.appendChild(renderer.domElement)

    // 2. OrbitControls (Continuous Progressive Orbital Motion)
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.06
    controls.maxDistance = 850
    controls.minDistance = 60
    controls.autoRotate = currentAutoRotate
    controls.autoRotateSpeed = 1.1
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

    const originLight = new THREE.PointLight(0xef4444, 3.0 * currentExposure, 400)
    originLight.position.set(0, 0, 0)
    scene.add(originLight)

    // 4. Ground Shadow Pedestal
    const groundGeo = new THREE.CylinderGeometry(230, 235, 6, 64)
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x090a0d,
      roughness: 0.65,
      metalness: 0.35,
    })
    const groundMesh = new THREE.Mesh(groundGeo, groundMat)
    groundMesh.position.y = -62
    scene.add(groundMesh)

    // Soft Contact Shadow Ring
    const shadowGeo = new THREE.RingGeometry(0, 85 * shadowIntensity, 48)
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.7,
      side: THREE.DoubleSide,
    })
    const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat)
    shadowMesh.rotation.x = Math.PI / 2
    shadowMesh.position.y = -58.8
    scene.add(shadowMesh)

    // Glowing Salt / Cyan Boundary Track
    const ringGeo = new THREE.RingGeometry(110, 113, 64)
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.6,
    })
    const ringMesh = new THREE.Mesh(ringGeo, ringMat)
    ringMesh.rotation.x = Math.PI / 2
    ringMesh.position.y = -58.5
    scene.add(ringMesh)

    // Polar Depth Concentric Web
    const polarHelper = new THREE.PolarGridHelper(260, 16, 6, 64, 0x1e222a, 0x111317)
    polarHelper.position.y = -58.2
    scene.add(polarHelper)

    // 5. Build Digital Twin Meshes from FalkorDB Graph
    const g = detail.graph
    const originName = detail.origin || g.origin || ''
    const alertingSet = new Set(detail.alerting || [])
    const interactiveMeshes: THREE.Object3D[] = []

    interface Node3DData {
      id: string
      type: 'origin' | 'alerting' | 'change' | 'service'
      pos: THREE.Vector3
      mesh: THREE.Mesh
      sprite: THREE.Sprite
      halo?: THREE.Mesh
    }
    const nodeMap = new Map<string, Node3DData>()

    // Compute BFS hop distance from origin along FalkorDB edges
    const hopMap = new Map<string, number>()
    if (originName) hopMap.set(originName, 0)

    const adj = new Map<string, string[]>()
    g.edges.forEach(e => {
      if (!adj.has(e.source)) adj.set(e.source, [])
      if (!adj.has(e.target)) adj.set(e.target, [])
      adj.get(e.source)!.push(e.target)
      adj.get(e.target)!.push(e.source)
    })

    if (originName) {
      const queue: string[] = [originName]
      while (queue.length > 0) {
        const curr = queue.shift()!
        const currHop = hopMap.get(curr) || 0
        const neighbors = adj.get(curr) || []
        for (const n of neighbors) {
          if (!hopMap.has(n)) {
            hopMap.set(n, currHop + 1)
            queue.push(n)
          }
        }
      }
    }

    // A. Origin Node (Root Cause in FalkorDB)
    let originRing: THREE.Mesh | null = null
    if (originName) {
      const geo = new THREE.SphereGeometry(14, 32, 32)
      const mat = new THREE.MeshStandardMaterial({
        color: 0xef4444,
        emissive: 0xb91c1c,
        emissiveIntensity: 0.9,
        roughness: 0.15,
        metalness: 0.85,
      })
      const mesh = new THREE.Mesh(geo, mat)
      mesh.position.set(0, 0, 0)
      mesh.userData = { id: originName, type: 'origin' }

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

      const sprite = createTextSprite(`${originName} [ROOT CAUSE]`, '#ef4444', 'rgba(185, 28, 28, 0.92)')
      sprite.position.set(0, 24, 0)
      mesh.add(sprite)

      scene.add(mesh)
      interactiveMeshes.push(mesh)
      nodeMap.set(originName, {
        id: originName,
        type: 'origin',
        pos: new THREE.Vector3(0, 0, 0),
        mesh,
        sprite,
        halo: originRing,
      })
    }

    // B. Suspect Change Node (Diamond / Octahedron)
    if (g.change) {
      const changeId = g.change.change
      const octGeo = new THREE.OctahedronGeometry(13, 0)
      const octMat = new THREE.MeshStandardMaterial({
        color: 0xa855f7,
        emissive: 0x7e22ce,
        emissiveIntensity: 0.8,
        roughness: 0.15,
        metalness: 0.85,
      })
      const changeMesh = new THREE.Mesh(octGeo, octMat)
      const changePos = new THREE.Vector3(-45, 48, 22)
      changeMesh.position.copy(changePos)
      changeMesh.userData = { id: changeId, type: 'change' }

      const sprite = createTextSprite(`${changeId} [CHANGE]`, '#c084fc', 'rgba(109, 40, 217, 0.92)')
      sprite.position.set(0, 20, 0)
      changeMesh.add(sprite)

      scene.add(changeMesh)
      interactiveMeshes.push(changeMesh)
      nodeMap.set(changeId, {
        id: changeId,
        type: 'change',
        pos: changePos,
        mesh: changeMesh,
        sprite,
      })

      // Connecting Beam Tube to Origin
      const curve = new THREE.LineCurve3(changePos, new THREE.Vector3(0, 0, 0))
      const tubeGeo = new THREE.TubeGeometry(curve, 20, 2.2, 8, false)
      const tubeMat = new THREE.MeshStandardMaterial({
        color: 0xc084fc,
        emissive: 0xa855f7,
        emissiveIntensity: 0.7,
        roughness: 0.3,
      })
      const tubeMesh = new THREE.Mesh(tubeGeo, tubeMat)
      scene.add(tubeMesh)
    }

    // C. Position all other FalkorDB services in topological spherical shells
    const otherNodes = g.nodes.filter(n => n.id !== originName)
    const shellGroups = new Map<number, typeof otherNodes>()
    otherNodes.forEach(node => {
      const hop = hopMap.get(node.id) || node.hops || 2
      if (!shellGroups.has(hop)) shellGroups.set(hop, [])
      shellGroups.get(hop)!.push(node)
    })

    const sortedHops = Array.from(shellGroups.keys()).sort((a, b) => a - b)
    sortedHops.forEach((hop) => {
      const shellNodes = shellGroups.get(hop)!
      const count = shellNodes.length
      const radius = 85 + Math.min(hop, 4) * 55

      shellNodes.forEach((node, idx) => {
        const isAlerting = alertingSet.has(node.id)
        const angle = (idx / count) * Math.PI * 2 + (hop * 0.5)
        const x = Math.cos(angle) * radius
        const z = Math.sin(angle) * radius
        const y = Math.sin(idx * 1.8 + hop) * 22

        const pos = new THREE.Vector3(x, y, z)
        const nodeRadius = isAlerting ? 11 : 8.5
        const geo = new THREE.SphereGeometry(nodeRadius, 24, 24)

        const mat = new THREE.MeshStandardMaterial({
          color: isAlerting ? 0xf97316 : 0x38bdf8,
          emissive: isAlerting ? 0xc2410c : 0x0284c7,
          emissiveIntensity: isAlerting ? 0.7 : 0.45,
          roughness: 0.25,
          metalness: 0.75,
        })
        const mesh = new THREE.Mesh(geo, mat)
        mesh.position.copy(pos)
        mesh.userData = { id: node.id, type: isAlerting ? 'alerting' : 'service' }

        const labelText = isAlerting ? `${node.id} (!) [ALERT]` : `${node.id} (T${node.tier || 1})`
        const labelBorder = isAlerting ? '#fb923c' : '#38bdf8'
        const labelBg = isAlerting ? 'rgba(194, 65, 12, 0.90)' : 'rgba(18, 19, 23, 0.90)'

        const sprite = createTextSprite(labelText, labelBorder, labelBg)
        sprite.position.set(0, nodeRadius + 14, 0)
        mesh.add(sprite)

        scene.add(mesh)
        interactiveMeshes.push(mesh)
        nodeMap.set(node.id, {
          id: node.id,
          type: isAlerting ? 'alerting' : 'service',
          pos,
          mesh,
          sprite,
        })
      })
    })

    // D. Build 3D FalkorDB Dependency Edges (Connecting Real Service Graph)
    interface Edge3DAnim {
      curve: THREE.CatmullRomCurve3
      particles: THREE.Points
    }
    const edgeAnimList: Edge3DAnim[] = []

    g.edges.forEach(edge => {
      const src = nodeMap.get(edge.source)
      const dst = nodeMap.get(edge.target)
      if (!src || !dst) return

      const isCausalPath = (alertingSet.has(edge.source) && edge.target === originName) ||
        (edge.source === originName) ||
        (alertingSet.has(edge.source) && alertingSet.has(edge.target))

      // Slight curve for 3D depth elegance
      const mid = new THREE.Vector3().addVectors(src.pos, dst.pos).multiplyScalar(0.5)
      mid.y += 10
      const curve = new THREE.CatmullRomCurve3([src.pos, mid, dst.pos])

      const tubeGeo = new THREE.TubeGeometry(curve, 24, isCausalPath ? 2.0 : 1.2, 8, false)
      const tubeMat = new THREE.MeshStandardMaterial({
        color: isCausalPath ? 0xf59e0b : 0x38bdf8,
        emissive: isCausalPath ? 0xd97706 : 0x0369a1,
        emissiveIntensity: isCausalPath ? 0.85 : 0.4,
        roughness: 0.35,
        transparent: true,
        opacity: isCausalPath ? 0.95 : 0.65,
      })
      const tubeMesh = new THREE.Mesh(tubeGeo, tubeMat)
      scene.add(tubeMesh)

      // Directional Cone Arrow indicating dependency flow (source -> target)
      const arrowGeo = new THREE.ConeGeometry(isCausalPath ? 3.5 : 2.5, isCausalPath ? 8 : 6, 12)
      const arrowMat = new THREE.MeshStandardMaterial({
        color: isCausalPath ? 0xfbbf24 : 0x38bdf8,
        emissive: isCausalPath ? 0xf59e0b : 0x0284c7,
        emissiveIntensity: 0.8,
      })
      const arrowMesh = new THREE.Mesh(arrowGeo, arrowMat)
      const arrowPoint = curve.getPoint(0.75)
      const tangent = curve.getTangent(0.75)
      arrowMesh.position.copy(arrowPoint)
      arrowMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tangent)
      scene.add(arrowMesh)

      // Animated Energy Particle flowing along dependency edge
      const pGeo = new THREE.BufferGeometry().setFromPoints([src.pos.clone()])
      const pMat = new THREE.PointsMaterial({
        color: isCausalPath ? 0xfef08a : 0x7dd3fc,
        size: isCausalPath ? 6 : 4.5,
        transparent: true,
        opacity: 0.9,
      })
      const particles = new THREE.Points(pGeo, pMat)
      scene.add(particles)

      edgeAnimList.push({ curve, particles })
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
        const s = 1 + Math.sin(clock * 2.5) * 0.08
        originRing.scale.set(s, s, s)
        originRing.rotation.z += 0.01
      }

      // Animate flowing signal particles along all real FalkorDB edges
      edgeAnimList.forEach((e, idx) => {
        const t = (clock * 0.35 + idx * 0.12) % 1.0
        const pt = e.curve.getPoint(t)
        const posAttr = e.particles.geometry.attributes.position as THREE.BufferAttribute
        posAttr.setXYZ(0, pt.x, pt.y, pt.z)
        posAttr.needsUpdate = true
      })

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
      controlsRef.current.autoRotateSpeed = 1.1
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
              background: currentAutoRotate ? 'rgba(56, 189, 248, 0.2)' : 'rgba(18, 19, 23, 0.85)',
              borderColor: currentAutoRotate ? '#38bdf8' : 'rgba(255, 255, 255, 0.12)',
              color: currentAutoRotate ? '#38bdf8' : '#f4f4f6',
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
              background: 'rgba(18, 19, 23, 0.85)',
              borderColor: 'rgba(255, 255, 255, 0.12)',
              color: '#f4f4f6',
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
              background: activePreset === 'origin' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(18, 19, 23, 0.85)',
              borderColor: activePreset === 'origin' ? '#ef4444' : 'rgba(255, 255, 255, 0.12)',
              color: activePreset === 'origin' ? '#f87171' : '#f4f4f6',
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
              background: activePreset === 'blast' ? 'rgba(56, 189, 248, 0.2)' : 'rgba(18, 19, 23, 0.85)',
              borderColor: activePreset === 'blast' ? '#38bdf8' : 'rgba(255, 255, 255, 0.12)',
              color: activePreset === 'blast' ? '#38bdf8' : '#f4f4f6',
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
              background: activePreset === 'default' ? 'rgba(255, 255, 255, 0.15)' : 'rgba(18, 19, 23, 0.85)',
              borderColor: activePreset === 'default' ? '#ffffff' : 'rgba(255, 255, 255, 0.12)',
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

      {/* Bottom Info Banner */}
      <div
        style={{
          position: 'absolute',
          bottom: 16,
          left: 16,
          zIndex: 10,
          background: 'rgba(16, 17, 21, 0.88)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: 10,
          padding: '8px 14px',
          fontSize: 11,
          color: '#a1a1aa',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#38bdf8', boxShadow: '0 0 8px #38bdf8' }} />
        <span><strong>FalkorDB 3D Digital Twin</strong> • Real service nodes, DEPENDS_ON relationship edges, and live signal flow particles</span>
      </div>
    </div>
  )
}
export default Interactive3DViewer
