import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import CytoscapeComponent from 'react-cytoscapejs'
import type { ElementDefinition } from 'cytoscape'
import { Maximize2, Minimize2, Zap, RotateCcw, Box, Layers, Eye } from 'lucide-react'
import type { IncidentDetail } from '../types'

interface Graph3DProps {
  detail: IncidentDetail
  onSelectService?: (service: string) => void
}

function createTextSprite(text: string, color = '#38bdf8', bg = 'rgba(13, 21, 34, 0.85)') {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 64
  const ctx = canvas.getContext('2d')
  if (ctx) {
    ctx.fillStyle = bg
    ctx.beginPath()
    ctx.roundRect(8, 8, 240, 48, 8)
    ctx.fill()
    ctx.strokeStyle = color
    ctx.lineWidth = 2.5
    ctx.stroke()

    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 20px "DM Sans", sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(text, 128, 32)
  }
  const texture = new THREE.CanvasTexture(canvas)
  const spriteMaterial = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false })
  const sprite = new THREE.Sprite(spriteMaterial)
  sprite.scale.set(32, 8, 1)
  return sprite
}

export function Graph3D({ detail, onSelectService }: Graph3DProps) {
  const mountRef = useRef<HTMLDivElement | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [highlightExplain, setHighlightExplain] = useState(false)
  const [hoveredNode, setHoveredNode] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'3d' | '2d'>('3d')

  // Keep references to controls & camera
  const controlsRef = useRef<OrbitControls | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const animFrameRef = useRef<number | null>(null)

  // Fullscreen Esc key handler
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isFullscreen])

  // Setup Three.js 3D Scene with Progressive Motion
  useEffect(() => {
    if (viewMode !== '3d' || !mountRef.current) return

    const container = mountRef.current
    const width = container.clientWidth || 800
    const height = container.clientHeight || 500

    // 1. Scene & Camera
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x060b13)
    scene.fog = new THREE.FogExp2(0x060b13, 0.0018)

    const camera = new THREE.PerspectiveCamera(45, width / height, 1, 2000)
    camera.position.set(0, 140, 360)
    cameraRef.current = camera

    // 2. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    container.innerHTML = ''
    container.appendChild(renderer.domElement)

    // 3. Orbit Controls
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.05
    controls.maxDistance = 800
    controls.minDistance = 60
    controls.autoRotate = false
    controlsRef.current = controls

    // 4. Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9)
    scene.add(ambientLight)

    const pointLight = new THREE.PointLight(0x38bdf8, 2, 800)
    pointLight.position.set(0, 100, 100)
    scene.add(pointLight)

    const originLight = new THREE.PointLight(0xef4444, 3, 400)
    originLight.position.set(0, 0, 0)
    scene.add(originLight)

    // 5. Build 3D Node Layout with Progressive Coordinates
    const g = detail.graph
    const originName = g.origin || ''
    const alertingSet = new Set(detail.alerting || [])

    // Map of target 3D positions
    interface Node3DData {
      id: string
      type: 'origin' | 'alerting' | 'change' | 'service'
      targetPos: THREE.Vector3
      currentPos: THREE.Vector3
      mesh: THREE.Mesh
      sprite: THREE.Sprite
      halo?: THREE.Mesh
    }
    const nodeMap = new Map<string, Node3DData>()
    const nodeMeshes: THREE.Object3D[] = []

    const nonOriginNodes = g.nodes.filter(n => n.id !== originName)
    const alertNodes = nonOriginNodes.filter(n => alertingSet.has(n.id))
    const otherNodes = nonOriginNodes.filter(n => !alertingSet.has(n.id))

    // A. Origin Node at (0, 0, 0)
    if (originName) {
      const geo = new THREE.SphereGeometry(14, 32, 32)
      const mat = new THREE.MeshStandardMaterial({
        color: 0xef4444,
        emissive: 0xb91c1c,
        emissiveIntensity: 0.6,
        roughness: 0.2,
        metalness: 0.8
      })
      const mesh = new THREE.Mesh(geo, mat)

      // Pulsing Origin Ring
      const ringGeo = new THREE.RingGeometry(18, 22, 32)
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0xf87171,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.7
      })
      const ring = new THREE.Mesh(ringGeo, ringMat)
      ring.rotation.x = Math.PI / 2
      mesh.add(ring)

      const sprite = createTextSprite(`${originName} [ORIGIN]`, '#ef4444', 'rgba(185, 28, 28, 0.9)')
      sprite.position.set(0, 22, 0)
      mesh.add(sprite)

      const data: Node3DData = {
        id: originName,
        type: 'origin',
        targetPos: new THREE.Vector3(0, 0, 0),
        currentPos: new THREE.Vector3(0, 0, 0),
        mesh,
        sprite,
        halo: ring
      }
      mesh.userData = { id: originName, type: 'origin' }
      scene.add(mesh)
      nodeMap.set(originName, data)
      nodeMeshes.push(mesh)
    }

    // B. Suspect Change Node (Diamond / Octahedron floating above origin)
    if (g.change) {
      const changeId = g.change.change
      const geo = new THREE.OctahedronGeometry(12, 0)
      const mat = new THREE.MeshStandardMaterial({
        color: 0xa855f7,
        emissive: 0x7c3aed,
        emissiveIntensity: 0.8,
        roughness: 0.1,
        metalness: 0.9
      })
      const mesh = new THREE.Mesh(geo, mat)
      const targetPos = new THREE.Vector3(0, 65, 30)

      const sprite = createTextSprite(changeId, '#c084fc', 'rgba(109, 40, 217, 0.9)')
      sprite.position.set(0, 20, 0)
      mesh.add(sprite)

      const data: Node3DData = {
        id: changeId,
        type: 'change',
        targetPos,
        currentPos: new THREE.Vector3(0, 0, 0),
        mesh,
        sprite
      }
      mesh.userData = { id: changeId, type: 'change' }
      scene.add(mesh)
      nodeMap.set(changeId, data)
      nodeMeshes.push(mesh)
    }

    // C. Alerting Nodes in Inner Shell (Radius = 90)
    alertNodes.forEach((node, idx) => {
      const count = alertNodes.length || 1
      const theta = (idx / count) * Math.PI * 2
      const x = Math.cos(theta) * 95
      const z = Math.sin(theta) * 95
      const y = Math.sin(theta * 2) * 25

      const geo = new THREE.SphereGeometry(10, 24, 24)
      const mat = new THREE.MeshStandardMaterial({
        color: 0xf97316,
        emissive: 0xc2410c,
        emissiveIntensity: 0.5,
        roughness: 0.3
      })
      const mesh = new THREE.Mesh(geo, mat)
      const targetPos = new THREE.Vector3(x, y, z)

      const sprite = createTextSprite(`${node.id} (!)`, '#fb923c', 'rgba(194, 65, 12, 0.85)')
      sprite.position.set(0, 16, 0)
      mesh.add(sprite)

      const data: Node3DData = {
        id: node.id,
        type: 'alerting',
        targetPos,
        currentPos: new THREE.Vector3(0, 0, 0),
        mesh,
        sprite
      }
      mesh.userData = { id: node.id, type: 'alerting' }
      scene.add(mesh)
      nodeMap.set(node.id, data)
      nodeMeshes.push(mesh)
    })

    // D. Blast Radius / Outer Services (Shell Radius = 170 to 220)
    otherNodes.forEach((node, idx) => {
      const count = otherNodes.length || 1
      const phi = Math.acos(-1 + (2 * idx) / count)
      const theta = Math.sqrt(count * Math.PI) * phi
      const radius = 160 + (node.hops || 2) * 20
      const x = radius * Math.cos(theta) * Math.sin(phi)
      const z = radius * Math.sin(theta) * Math.sin(phi)
      const y = radius * Math.cos(phi) * 0.65

      const geo = new THREE.SphereGeometry(8, 20, 20)
      const mat = new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x0284c7,
        emissiveIntensity: 0.3,
        roughness: 0.4
      })
      const mesh = new THREE.Mesh(geo, mat)
      const targetPos = new THREE.Vector3(x, y, z)

      const sprite = createTextSprite(node.id, '#38bdf8', 'rgba(15, 23, 42, 0.8)')
      sprite.position.set(0, 14, 0)
      mesh.add(sprite)

      const data: Node3DData = {
        id: node.id,
        type: 'service',
        targetPos,
        currentPos: new THREE.Vector3(0, 0, 0),
        mesh,
        sprite
      }
      mesh.userData = { id: node.id, type: 'service' }
      scene.add(mesh)
      nodeMap.set(node.id, data)
      nodeMeshes.push(mesh)
    })

    // 6. Build 3D Edges with Animated Flow Particles
    interface Edge3DData {
      source: string
      target: string
      line: THREE.Line
      particles: THREE.Points
      curve: THREE.CatmullRomCurve3
    }
    const edgeList: Edge3DData[] = []

    const allEdges = [...g.edges]
    if (g.change && originName) {
      allEdges.push({ source: g.change.change, target: originName, kind: 'TRIGGERED' })
    }

    allEdges.forEach(edge => {
      const srcData = nodeMap.get(edge.source)
      const dstData = nodeMap.get(edge.target)
      if (!srcData || !dstData) return

      // Create line
      const points = [srcData.currentPos, dstData.currentPos]
      const lineGeo = new THREE.BufferGeometry().setFromPoints(points)
      const isPath = highlightExplain && (
        (alertingSet.has(edge.source) && edge.target === originName) ||
        (edge.source === originName)
      )
      const lineMat = new THREE.LineBasicMaterial({
        color: isPath ? 0xf59e0b : 0x334155,
        linewidth: isPath ? 3 : 1,
        transparent: true,
        opacity: isPath ? 1.0 : 0.6
      })
      const line = new THREE.Line(lineGeo, lineMat)
      scene.add(line)

      // Moving photon particle along edge
      const curve = new THREE.CatmullRomCurve3([srcData.currentPos, dstData.currentPos])
      const pGeo = new THREE.BufferGeometry().setFromPoints([srcData.currentPos])
      const pMat = new THREE.PointsMaterial({
        color: isPath ? 0xfbbf24 : 0x38bdf8,
        size: 5,
        transparent: true,
        opacity: 0.9
      })
      const particles = new THREE.Points(pGeo, pMat)
      scene.add(particles)

      edgeList.push({ source: edge.source, target: edge.target, line, particles, curve })
    })

    // 7. Raycasting for Interaction
    const raycaster = new THREE.Raycaster()
    const mouse = new THREE.Vector2(-999, -999)

    function onMouseMove(e: MouseEvent) {
      const rect = renderer.domElement.getBoundingClientRect()
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
    }

    function onClick() {
      raycaster.setFromCamera(mouse, camera)
      const hits = raycaster.intersectObjects(nodeMeshes)
      if (hits.length > 0) {
        const id = hits[0].object.userData.id
        if (id && onSelectService && hits[0].object.userData.type !== 'change') {
          onSelectService(id)
        }
      }
    }

    renderer.domElement.addEventListener('mousemove', onMouseMove)
    renderer.domElement.addEventListener('click', onClick)

    // 8. Progressive 3D Motion Animation Loop
    let clock = 0
    let entranceProgress = 0

    function animate() {
      animFrameRef.current = requestAnimationFrame(animate)
      clock += 0.02
      controls.update()

      // Progressive entrance bloom: interpolate positions
      if (entranceProgress < 1.0) {
        entranceProgress += 0.025
      }

      nodeMap.forEach(data => {
        // Interpolate toward target position
        data.currentPos.lerp(data.targetPos, 0.06)
        data.mesh.position.copy(data.currentPos)

        // Subtle floating / bobbing motion in 3D
        if (data.type !== 'origin') {
          data.mesh.position.y += Math.sin(clock + data.targetPos.x) * 0.25
        } else if (data.halo) {
          // Pulse the origin ring
          const s = 1 + Math.sin(clock * 3) * 0.15
          data.halo.scale.set(s, s, s)
        }
      })

      // Update edges and animated photon positions
      edgeList.forEach(edge => {
        const src = nodeMap.get(edge.source)
        const dst = nodeMap.get(edge.target)
        if (src && dst) {
          const positions = edge.line.geometry.attributes.position as THREE.BufferAttribute
          positions.setXYZ(0, src.mesh.position.x, src.mesh.position.y, src.mesh.position.z)
          positions.setXYZ(1, dst.mesh.position.x, dst.mesh.position.y, dst.mesh.position.z)
          positions.needsUpdate = true

          // Animate photon along edge
          const t = (clock * 0.4 + (edge.line.id % 5) * 0.2) % 1.0
          const pos = new THREE.Vector3().lerpVectors(src.mesh.position, dst.mesh.position, t)
          const pAttr = edge.particles.geometry.attributes.position as THREE.BufferAttribute
          pAttr.setXYZ(0, pos.x, pos.y, pos.z)
          pAttr.needsUpdate = true
        }
      })

      // Hover detection
      raycaster.setFromCamera(mouse, camera)
      const intersects = raycaster.intersectObjects(nodeMeshes)
      if (intersects.length > 0) {
        const hovered = intersects[0].object.userData.id
        setHoveredNode(hovered)
        document.body.style.cursor = 'pointer'
      } else {
        setHoveredNode(null)
        document.body.style.cursor = 'default'
      }

      renderer.render(scene, camera)
    }
    animate()

    // Resize handler
    function handleResize() {
      if (!container || !renderer || !camera) return
      const w = container.clientWidth || 800
      const h = container.clientHeight || 500
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
  }, [detail, highlightExplain, viewMode, onSelectService])

  // Center & Re-fit 3D Camera
  function handleResetView() {
    if (controlsRef.current && cameraRef.current) {
      controlsRef.current.reset()
      cameraRef.current.position.set(0, 140, 360)
      controlsRef.current.target.set(0, 0, 0)
    }
  }

  // 2D Cytoscape Elements (Fallback / Alternative View)
  const cytoscapeElements: ElementDefinition[] = [
    ...detail.graph.nodes.map(n => ({
      data: {
        id: n.id,
        label: n.id === detail.graph.origin ? `${n.id} [ORIGIN]` : (n.alerting ? `${n.id} (!)` : n.id),
        type: n.id === detail.graph.origin ? 'origin' : (n.alerting ? 'alerting' : 'service')
      }
    })),
    ...(detail.graph.change ? [{
      data: {
        id: detail.graph.change.change,
        label: detail.graph.change.change,
        type: 'change'
      }
    }] : []),
    ...detail.graph.edges.map(e => ({
      data: { id: `${e.source}->${e.target}`, source: e.source, target: e.target }
    }))
  ]

  return (
    <div className={`topology-viewer-container ${isFullscreen ? 'fullscreen-mode' : ''}`}>
      {/* 3D Viewport Controls Bar */}
      <div className="viewer-toolbar">
        <div className="viewer-left-controls">
          <div className="view-mode-toggle">
            <button
              type="button"
              className={`mode-btn ${viewMode === '3d' ? 'active' : ''}`}
              onClick={() => setViewMode('3d')}
            >
              <Box size={14} />
              <span>Progressive 3D Motion</span>
            </button>
            <button
              type="button"
              className={`mode-btn ${viewMode === '2d' ? 'active' : ''}`}
              onClick={() => setViewMode('2d')}
            >
              <Layers size={14} />
              <span>2D Planar Layout</span>
            </button>
          </div>

          <button
            type="button"
            className={`tool-btn ${highlightExplain ? 'active' : ''}`}
            onClick={() => setHighlightExplain(!highlightExplain)}
          >
            <Zap size={14} color="#f59e0b" />
            <span>Highlight Explain Path</span>
          </button>
        </div>

        <div className="viewer-right-controls">
          <button
            type="button"
            className="tool-btn"
            onClick={handleResetView}
            title="Fit and Center 3D Camera"
          >
            <RotateCcw size={14} />
            <span>Fit View</span>
          </button>

          {/* Fullscreen Expand / Fit Button (Requested by User) */}
          <button
            type="button"
            className="tool-btn expand-btn"
            onClick={() => {
              setIsFullscreen(prev => {
                const next = !prev
                setTimeout(() => {
                  handleResetView()
                }, 100)
                return next
              })
            }}
            title={isFullscreen ? 'Exit Full Screen' : 'Fit & Expand to Full Screen'}
          >
            {isFullscreen ? (
              <>
                <Minimize2 size={15} color="#38bdf8" />
                <span>Exit Fullscreen</span>
              </>
            ) : (
              <>
                <Maximize2 size={15} color="#38bdf8" />
                <span>Fit & Expand to Full Screen</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Graph Canvas Area */}
      <div className="canvas-viewport-area">
        {viewMode === '3d' ? (
          <div ref={mountRef} className="threejs-canvas-wrapper" />
        ) : (
          <div style={{ width: '100%', height: '100%', background: '#070c14' }}>
            <CytoscapeComponent
              elements={cytoscapeElements}
              style={{ width: '100%', height: '100%' }}
              layout={{ name: 'cose', animate: false, padding: 50 }}
            />
          </div>
        )}

        {/* 3D Motion Status & Legend Pill */}
        <div className="motion-legend-card">
          <div className="legend-status-line">
            <span className="motion-pulse" />
            <span style={{ fontWeight: 600, color: '#e2e8f0' }}>Progressive 3D Force Field</span>
          </div>
          <div className="legend-chips">
            <span className="chip origin"><span className="dot" />Origin: {detail.origin || 'None'}</span>
            <span className="chip alert"><span className="dot" />Alerts: {detail.alerting.length}</span>
            <span className="chip change"><span className="dot" />Suspect Change</span>
          </div>
          <div style={{ fontSize: 10, color: '#64748b', marginTop: 4 }}>
            Drag left to rotate • Right click to pan • Scroll to zoom • Click node to inspect profile
          </div>
        </div>

        {/* Hovered Node Tooltip Callout */}
        {hoveredNode && (
          <div className="node-hover-callout">
            <Eye size={14} color="#38bdf8" />
            <span>Inspect Node: <strong>{hoveredNode}</strong></span>
          </div>
        )}
      </div>
    </div>
  )
}
