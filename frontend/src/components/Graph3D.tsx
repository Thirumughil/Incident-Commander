import { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import CytoscapeComponent from 'react-cytoscapejs'
import type { ElementDefinition, Core } from 'cytoscape'
import {
  Maximize2, Minimize2, Zap, RotateCcw, Box, Layers, Eye,
  RotateCw, Sun, Compass, Sparkles, Target
} from 'lucide-react'
import type { IncidentDetail } from '../types'
import { Interactive3DViewer } from './Interactive3DViewer'
import { FluidButton } from './FluidButton'

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

const cytoscapeStylesheet = [
  {
    selector: 'node',
    style: {
      'label': 'data(label)',
      'color': '#f8fafc',
      'font-size': '11px',
      'font-family': 'DM Sans, -apple-system, BlinkMacSystemFont, sans-serif',
      'font-weight': 600,
      'text-valign': 'center' as const,
      'text-halign': 'center' as const,
      'background-color': '#131e2e',
      'border-width': 2,
      'border-color': '#38bdf8',
      'width': 68,
      'height': 68,
      'text-wrap': 'wrap' as const,
      'text-max-width': '76px',
      'text-outline-color': '#09101a',
      'text-outline-width': 2,
      'overlay-opacity': 0,
    }
  },
  {
    selector: 'node[type = "origin"]',
    style: {
      'background-color': '#7f1d1d',
      'border-color': '#ef4444',
      'border-width': 4,
      'width': 84,
      'height': 84,
      'font-weight': 700,
      'color': '#ffffff',
      'font-size': '12px',
      'text-outline-color': '#450a0a',
      'text-outline-width': 3,
    }
  },
  {
    selector: 'node[type = "alerting"]',
    style: {
      'background-color': '#9a3412',
      'border-color': '#f97316',
      'border-width': 3,
      'width': 76,
      'height': 76,
      'color': '#ffffff',
      'font-size': '11px',
      'text-outline-color': '#431407',
      'text-outline-width': 2,
    }
  },
  {
    selector: 'node[type = "change"]',
    style: {
      'shape': 'diamond' as const,
      'background-color': '#581c87',
      'border-color': '#a855f7',
      'border-width': 3,
      'width': 80,
      'height': 80,
      'color': '#ffffff',
      'font-size': '11px',
      'text-outline-color': '#2e1065',
      'text-outline-width': 2,
    }
  },
  {
    selector: 'node:selected, node.selected',
    style: {
      'border-color': '#ffffff',
      'border-width': 4,
      'background-color': '#0284c7',
    }
  },
  {
    selector: 'edge',
    style: {
      'curve-style': 'bezier' as const,
      'target-arrow-shape': 'triangle' as const,
      'target-arrow-color': '#64748b',
      'line-color': '#2a3a50',
      'width': 2,
      'opacity': 0.85,
      'arrow-scale': 1.1,
    }
  },
  {
    selector: 'edge[type = "change-edge"]',
    style: {
      'line-style': 'dashed' as const,
      'line-color': '#c084fc',
      'target-arrow-color': '#c084fc',
      'width': 2.5,
      'opacity': 0.9,
    }
  },
  {
    selector: 'edge.highlighted',
    style: {
      'line-color': '#f59e0b',
      'target-arrow-color': '#f59e0b',
      'width': 4,
      'opacity': 1.0,
      'z-index': 99,
    }
  }
]

const coseLayout = {
  name: 'cose',
  animate: false,
  padding: 80,
  componentSpacing: 140,
  nodeRepulsion: () => 2500000,
  nodeOverlap: 60,
  idealEdgeLength: () => 180,
  edgeElasticity: () => 80,
  nestingFactor: 5,
  gravity: 25,
  numIter: 1000,
  initialTemp: 200,
  coolingFactor: 0.95,
  minTemp: 1.0,
  randomize: false
}

export function Graph3D({ detail, onSelectService }: Graph3DProps) {
  const mountRef = useRef<HTMLDivElement | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [highlightExplain, setHighlightExplain] = useState(false)
  const [hoveredNode, setHoveredNode] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'3d' | 'model' | '2d'>('3d')

  // Interactive 3D Viewer enhancements (from Framer component)
  const [autoRotate, setAutoRotate] = useState<boolean>(true)
  const [exposure, setExposure] = useState<number>(1.1)
  const [activePreset, setActivePreset] = useState<'origin' | 'blast' | 'top' | null>(null)

  // References to controls, camera, animation loop, lights
  const controlsRef = useRef<OrbitControls | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const ambientLightRef = useRef<THREE.AmbientLight | null>(null)
  const pointLightRef = useRef<THREE.PointLight | null>(null)
  const animFrameRef = useRef<number | null>(null)
  const cyRef = useRef<Core | null>(null)

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

  // Sync autoRotate state to OrbitControls
  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.autoRotate = autoRotate
      controlsRef.current.autoRotateSpeed = 1.0
    }
  }, [autoRotate])

  // Sync exposure to lights
  useEffect(() => {
    if (ambientLightRef.current) {
      ambientLightRef.current.intensity = 0.85 * exposure
    }
    if (pointLightRef.current) {
      pointLightRef.current.intensity = 2.2 * exposure
    }
  }, [exposure])

  // Smooth camera glide function (eased camera interpolation)
  const glideCameraTo = useCallback((pos: [number, number, number], target: [number, number, number] = [0, 0, 0]) => {
    if (!cameraRef.current || !controlsRef.current) return
    const cam = cameraRef.current
    const ctrl = controlsRef.current
    const startPos = cam.position.clone()
    const endPos = new THREE.Vector3(...pos)
    const startTarget = ctrl.target.clone()
    const endTarget = new THREE.Vector3(...target)
    const startTime = performance.now()
    const duration = 700

    const step = (now: number) => {
      const elapsed = now - startTime
      const p = Math.min(1.0, elapsed / duration)
      // Ease out cubic
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

  // Camera Presets
  const handlePreset = (preset: 'origin' | 'blast' | 'top') => {
    setActivePreset(preset)
    if (preset === 'origin') {
      glideCameraTo([0, 50, 160], [0, 0, 0])
    } else if (preset === 'blast') {
      glideCameraTo([0, 150, 360], [0, 0, 0])
    } else if (preset === 'top') {
      glideCameraTo([0, 380, 20], [0, 0, 0])
    }
  }

  // Setup Three.js 3D Scene with Progressive Motion & Interactive Viewer Enhancements
  useEffect(() => {
    if (viewMode !== '3d' || !mountRef.current) return

    const container = mountRef.current
    const width = container.clientWidth || 800
    const height = container.clientHeight || 500

    // 1. Scene & Camera
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x060b13)
    scene.fog = new THREE.FogExp2(0x060b13, 0.0016)

    const camera = new THREE.PerspectiveCamera(45, width / height, 1, 2000)
    camera.position.set(0, 140, 360)
    cameraRef.current = camera

    // 2. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    container.innerHTML = ''
    container.appendChild(renderer.domElement)

    // 3. Orbit Controls with auto-rotate & silky damping
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.06
    controls.maxDistance = 850
    controls.minDistance = 60
    controls.autoRotate = autoRotate
    controls.autoRotateSpeed = 1.0
    controlsRef.current = controls

    // 4. Lights with Exposure integration
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85 * exposure)
    scene.add(ambientLight)
    ambientLightRef.current = ambientLight

    const pointLight = new THREE.PointLight(0x38bdf8, 2.2 * exposure, 900)
    pointLight.position.set(0, 120, 120)
    scene.add(pointLight)
    pointLightRef.current = pointLight

    const originLight = new THREE.PointLight(0xef4444, 3.2 * exposure, 500)
    originLight.position.set(0, 0, 0)
    scene.add(originLight)

    // 4b. Polar Depth Plane & Ground Shadow Floor (from Interactive3DViewer shadowIntensity)
    const gridHelper = new THREE.PolarGridHelper(260, 16, 8, 64, 0x1e293b, 0x0f172a)
    gridHelper.position.y = -65
    scene.add(gridHelper)

    const shadowGeo = new THREE.RingGeometry(0, 52, 32)
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.7,
      side: THREE.DoubleSide
    })
    const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat)
    shadowMesh.rotation.x = Math.PI / 2
    shadowMesh.position.y = -64.5
    scene.add(shadowMesh)

    // 5. Build 3D Node Layout with Progressive Coordinates
    const g = detail.graph
    const originName = g.origin || ''
    const alertingSet = new Set(detail.alerting || [])

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

    // C. Alerting Nodes in Inner Shell (Radius = 95)
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

    // D. Blast Radius / Outer Services (Shell Radius = 160-220)
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

    // 7. Raycasting for Interaction with Smooth Focus Glide
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
        const hitPos = hits[0].object.position
        if (id && onSelectService && hits[0].object.userData.type !== 'change') {
          onSelectService(id)
        }
        // Smoothly glide camera focus towards clicked service
        glideCameraTo(
          [hitPos.x + 20, hitPos.y + 40, hitPos.z + 120],
          [hitPos.x, hitPos.y, hitPos.z]
        )
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

      if (entranceProgress < 1.0) {
        entranceProgress += 0.025
      }

      nodeMap.forEach(data => {
        data.currentPos.lerp(data.targetPos, 0.06)
        data.mesh.position.copy(data.currentPos)

        if (data.type !== 'origin') {
          data.mesh.position.y += Math.sin(clock + data.targetPos.x) * 0.25
        } else if (data.halo) {
          const s = 1 + Math.sin(clock * 3) * 0.15
          data.halo.scale.set(s, s, s)
        }
      })

      edgeList.forEach(edge => {
        const src = nodeMap.get(edge.source)
        const dst = nodeMap.get(edge.target)
        if (src && dst) {
          const positions = edge.line.geometry.attributes.position as THREE.BufferAttribute
          positions.setXYZ(0, src.mesh.position.x, src.mesh.position.y, src.mesh.position.z)
          positions.setXYZ(1, dst.mesh.position.x, dst.mesh.position.y, dst.mesh.position.z)
          positions.needsUpdate = true

          const t = (clock * 0.4 + (edge.line.id % 5) * 0.2) % 1.0
          const pos = new THREE.Vector3().lerpVectors(src.mesh.position, dst.mesh.position, t)
          const pAttr = edge.particles.geometry.attributes.position as THREE.BufferAttribute
          pAttr.setXYZ(0, pos.x, pos.y, pos.z)
          pAttr.needsUpdate = true
        }
      })

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
  }, [detail, highlightExplain, viewMode, onSelectService, glideCameraTo])

  // Center & Re-fit Camera (3D, Model or 2D)
  function handleResetView() {
    setActivePreset(null)
    if (viewMode === '2d' && cyRef.current) {
      cyRef.current.fit(undefined, 80)
      if (cyRef.current.zoom() > 1.2) {
        cyRef.current.zoom(1.0)
        cyRef.current.center()
      }
      return
    }
    if (controlsRef.current && cameraRef.current) {
      controlsRef.current.reset()
      cameraRef.current.position.set(0, 140, 360)
      controlsRef.current.target.set(0, 0, 0)
    }
  }

  // 2D Cytoscape Elements
  const originName = detail.graph.origin || ''
  const alertingSet = useMemo(() => new Set(detail.alerting || []), [detail.alerting])

  const cytoscapeElements = useMemo<ElementDefinition[]>(() => {
    const nodes: ElementDefinition[] = detail.graph.nodes.map(n => ({
      data: {
        id: n.id,
        label: n.id === originName ? `${n.id}\n[ORIGIN]` : (alertingSet.has(n.id) ? `${n.id}\n(!)` : n.id),
        type: n.id === originName ? 'origin' : (alertingSet.has(n.id) ? 'alerting' : 'service')
      }
    }))

    if (detail.graph.change) {
      nodes.push({
        data: {
          id: detail.graph.change.change,
          label: detail.graph.change.change,
          type: 'change'
        }
      })
    }

    const edges: ElementDefinition[] = detail.graph.edges.map(e => {
      const isPath = highlightExplain && (
        (alertingSet.has(e.source) && e.target === originName) ||
        (e.source === originName)
      )
      return {
        data: {
          id: `${e.source}->${e.target}`,
          source: e.source,
          target: e.target,
          type: 'dependency'
        },
        classes: isPath ? 'highlighted' : ''
      }
    })

    if (detail.graph.change && originName) {
      edges.push({
        data: {
          id: `${detail.graph.change.change}->${originName}`,
          source: detail.graph.change.change,
          target: originName,
          type: 'change-edge'
        },
        classes: highlightExplain ? 'highlighted' : ''
      })
    }

    return [...nodes, ...edges]
  }, [detail.graph, originName, alertingSet, highlightExplain])

  useEffect(() => {
    if (viewMode === '2d' && cyRef.current) {
      const cy = cyRef.current
      const timer = setTimeout(() => {
        cy.resize()
        cy.layout(coseLayout).run()
        cy.fit(undefined, 80)
        if (cy.zoom() > 1.2) {
          cy.zoom(1.0)
          cy.center()
        }
      }, 50)
      return () => clearTimeout(timer)
    }
  }, [viewMode, isFullscreen, detail, highlightExplain])

  const canvasHeight = isFullscreen ? 'calc(100vh - 54px)' : '640px'

  return (
    <div className={`topology-viewer-container ${isFullscreen ? 'fullscreen-mode' : ''}`}>
      {/* Viewport Controls Bar */}
      <div className="viewer-toolbar">
        <div className="viewer-left-controls">
          {/* Mode Selector */}
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
              className={`mode-btn ${viewMode === 'model' ? 'active' : ''}`}
              onClick={() => setViewMode('model')}
              title="Interactive 3D Digital Twin using Google Model-Viewer"
            >
              <Sparkles size={14} color="#38bdf8" />
              <span>Interactive 3D Twin</span>
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

          {/* Progressive 3D Motion Controls powered by FluidButton */}
          {viewMode === '3d' && (
            <>
              {/* Auto-Rotate Orbital Motion Toggle */}
              <FluidButton
                variant={autoRotate ? 'primary' : 'glass'}
                size="sm"
                icon={<RotateCw size={13} className={autoRotate ? 'spin-slow' : ''} />}
                text={autoRotate ? 'Orbiting (3D Motion)' : 'Orbit Paused'}
                onClick={() => setAutoRotate(!autoRotate)}
                title="Toggle continuous progressive 3D orbital motion"
              />

              {/* Exposure Control */}
              <FluidButton
                variant="glass"
                size="sm"
                icon={<Sun size={13} color="#f59e0b" />}
                text={`Exp: ${exposure.toFixed(1)}x`}
                onClick={() => setExposure(prev => (prev >= 1.5 ? 0.8 : +(prev + 0.35).toFixed(1)))}
                title="Adjust WebGL exposure & light intensity"
              />

              {/* Explain Path Highlight */}
              <FluidButton
                variant={highlightExplain ? 'amber' : 'glass'}
                size="sm"
                icon={<Zap size={14} color="#f59e0b" />}
                text="Highlight Explain Path"
                onClick={() => setHighlightExplain(!highlightExplain)}
              />
            </>
          )}

          {viewMode === '2d' && (
            <FluidButton
              variant={highlightExplain ? 'amber' : 'glass'}
              size="sm"
              icon={<Zap size={14} color="#f59e0b" />}
              text="Highlight Explain Path"
              onClick={() => setHighlightExplain(!highlightExplain)}
            />
          )}
        </div>

        <div className="viewer-right-controls" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {/* Camera Hotspot Presets in 3D Mode */}
          {viewMode === '3d' && (
            <div className="camera-presets-group" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <FluidButton
                variant={activePreset === 'origin' ? 'danger' : 'glass'}
                size="sm"
                icon={<Target size={12} color="#ef4444" />}
                text="Focus Origin"
                onClick={() => handlePreset('origin')}
                title="Glide camera to Focus on Root Cause Origin"
              />
              <FluidButton
                variant={activePreset === 'blast' ? 'primary' : 'glass'}
                size="sm"
                icon={<Compass size={12} color="#38bdf8" />}
                text="Blast Radius"
                onClick={() => handlePreset('blast')}
                title="Isometric View of Full Blast Radius"
              />
              <FluidButton
                variant={activePreset === 'top' ? 'purple' : 'glass'}
                size="sm"
                icon={<Box size={12} />}
                text="Top-Down"
                onClick={() => handlePreset('top')}
                title="Top-Down Overhead Spatial Angle"
              />
            </div>
          )}

          {/* Reset / Fit View */}
          <FluidButton
            variant="glass"
            size="sm"
            icon={<RotateCcw size={14} />}
            text="Fit View"
            onClick={handleResetView}
            title={viewMode === '2d' ? 'Fit and Center 2D Graph' : 'Fit and Center 3D Camera'}
          />

          {/* Fullscreen Expand / Fit Button */}
          <FluidButton
            variant="primary"
            size="sm"
            icon={isFullscreen ? <Minimize2 size={15} color="#38bdf8" /> : <Maximize2 size={15} color="#38bdf8" />}
            text={isFullscreen ? 'Exit Fullscreen' : 'Fit & Expand to Full Screen'}
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
          />
        </div>
      </div>

      {/* Main Graph Canvas Area */}
      <div className="canvas-viewport-area">
        {/* 1. 3D WebGL Canvas */}
        <div
          ref={mountRef}
          className="threejs-canvas-wrapper"
          style={{ display: viewMode === '3d' ? 'block' : 'none', width: '100%', height: '100%' }}
        />

        {/* 2. Interactive 3D Model Viewer Twin (Google model-viewer adapted from Framer) */}
        {viewMode === 'model' && (
          <div style={{ width: '100%', height: '100%' }}>
            <Interactive3DViewer
              detail={detail}
              onSelectService={onSelectService}
              autoRotate={autoRotate}
              exposure={exposure}
            />
          </div>
        )}

        {/* 3. 2D Cytoscape Planar Layout */}
        <div
          className="cytoscape-canvas-wrapper"
          style={{
            display: viewMode === '2d' ? 'block' : 'none',
            width: '100%',
            height: canvasHeight,
            minHeight: canvasHeight,
            background: '#060b13'
          }}
        >
          <CytoscapeComponent
            elements={cytoscapeElements}
            stylesheet={cytoscapeStylesheet}
            style={{ width: '100%', height: canvasHeight }}
            layout={coseLayout}
            cy={(cy) => {
              cyRef.current = cy
              cy.removeAllListeners()
              cy.on('tap', 'node', (evt) => {
                const node = evt.target
                const type = node.data('type')
                const id = node.data('id')
                if (type !== 'change' && onSelectService && id) {
                  onSelectService(id)
                }
              })
              cy.on('mouseover', 'node', (evt) => {
                const id = evt.target.data('id')
                setHoveredNode(id)
              })
              cy.on('mouseout', 'node', () => {
                setHoveredNode(null)
              })
              setTimeout(() => {
                cy.resize()
                cy.layout(coseLayout).run()
                cy.fit(undefined, 80)
                if (cy.zoom() > 1.2) {
                  cy.zoom(1.0)
                  cy.center()
                }
              }, 60)
            }}
          />
        </div>

        {/* Graph Status & Legend Pill */}
        <div className="motion-legend-card">
          <div className="legend-status-line">
            <span
              className="motion-pulse"
              style={{
                background: viewMode === '2d' ? '#10b981' : (viewMode === 'model' ? '#a855f7' : '#38bdf8')
              }}
            />
            <span style={{ fontWeight: 600, color: '#e2e8f0' }}>
              {viewMode === '2d'
                ? '2D Planar Schematic (Force-Directed)'
                : (viewMode === 'model'
                    ? 'Interactive 3D Digital Twin (PBR Shader)'
                    : 'Progressive 3D Force Field (Orbital Physics)')}
            </span>
            {viewMode === '3d' && autoRotate && (
              <span style={{ fontSize: 10, color: '#38bdf8', marginLeft: 6, fontWeight: 500 }}>
                [Auto-Orbit Active]
              </span>
            )}
          </div>
          <div className="legend-chips">
            <span className="chip origin"><span className="dot" />Origin: {detail.origin || 'None'}</span>
            <span className="chip alert"><span className="dot" />Alerts: {detail.alerting.length}</span>
            <span className="chip change"><span className="dot" />Suspect Change</span>
          </div>
          <div style={{ fontSize: 10, color: '#64748b', marginTop: 4 }}>
            {viewMode === '2d'
              ? 'Click node to inspect service profile • Drag nodes to reposition • Scroll to zoom'
              : 'Drag left to rotate • Right click to pan • Scroll to zoom • Click node to glide & inspect'}
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
