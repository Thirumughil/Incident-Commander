import React, { useEffect, useRef, useState, useCallback } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { RotateCw, Sun, Target, Compass, Layers, Filter } from 'lucide-react'
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

interface HoveredServiceData {
  id: string
  tier: number
  isOrigin: boolean
  isAlerting: boolean
  outgoing: string[]
  incoming: string[]
}

/**
 * High-DPI 3D Billboard Sprite Generator
 * Creates crisp, non-colliding holographic pins with clear status badges.
 */
function createTextSprite(
  title: string,
  badge: string,
  borderColor: string,
  badgeBg: string,
  badgeTextColor = '#ffffff',
  scaleWidth = 38
) {
  const canvas = document.createElement('canvas')
  canvas.width = 420
  canvas.height = 96
  const ctx = canvas.getContext('2d')
  if (ctx) {
    // Background frosted container
    ctx.fillStyle = 'rgba(10, 12, 16, 0.94)'
    ctx.beginPath()
    ctx.roundRect(4, 4, 412, 88, 16)
    ctx.fill()
    ctx.strokeStyle = borderColor
    ctx.lineWidth = 3
    ctx.stroke()

    // Title / Service Name
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 26px "DM Sans", Inter, -apple-system, sans-serif'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    // Trim only if extremely long
    const displayTitle = title.length > 17 ? `${title.slice(0, 16)}…` : title
    ctx.fillText(displayTitle, 20, 48)

    // Tag / Badge on right
    if (badge) {
      ctx.font = 'bold 16px "DM Sans", Inter, sans-serif'
      const badgeWidth = ctx.measureText(badge).width + 22
      const badgeX = 402 - badgeWidth
      ctx.fillStyle = badgeBg
      ctx.beginPath()
      ctx.roundRect(badgeX, 26, badgeWidth, 44, 10)
      ctx.fill()

      ctx.fillStyle = badgeTextColor
      ctx.textAlign = 'center'
      ctx.fillText(badge, badgeX + badgeWidth / 2, 48)
    }
  }
  const texture = new THREE.CanvasTexture(canvas)
  texture.minFilter = THREE.LinearFilter
  const spriteMaterial = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
  })
  const sprite = new THREE.Sprite(spriteMaterial)
  const scaleHeight = (scaleWidth * 96) / 420
  sprite.scale.set(scaleWidth, scaleHeight, 1)
  return sprite
}

/**
 * Interactive3DViewer
 *
 * User-Friendly 3D Architectural Digital Twin of the FalkorDB Incident Graph:
 * 1. Semantic Architectural Flow: Root Cause at apex, Alerting blast arc in front,
 *    healthy dependencies flanking gracefully on left/right wings.
 * 2. Causal Path Illumination: Clear, unentangled glowing amber conduits showing
 *    failure propagation, while background edges are subtly dimmed.
 * 3. Path Focus Toggle: Instant 1-click switch between focused incident blast radius
 *    and full network topology.
 * 4. Interactive Hover Isolation: Hovering any node highlights its upstream and downstream
 *    paths while dimming irrelevant edges.
 * 5. Elevated 3D Isometric Vantage: Clear line-of-sight with zero spaghetti clutter.
 */
export const Interactive3DViewer: React.FC<Interactive3DViewerProps> = ({
  detail,
  backgroundColor = '#060b13',
  autoRotate = false,
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
  const [activePreset, setActivePreset] = useState<'flow' | 'origin' | 'topdown' | 'reset'>('flow')
  const [focusBlastOnly, setFocusBlastOnly] = useState<boolean>(true)
  const [hoveredService, setHoveredService] = useState<HoveredServiceData | null>(null)

  // Smooth camera glide
  const glideCameraTo = useCallback((pos: [number, number, number], target: [number, number, number] = [0, 8, 10]) => {
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
  const handlePreset = (preset: 'flow' | 'origin' | 'topdown' | 'reset') => {
    setActivePreset(preset)
    if (preset === 'flow') {
      glideCameraTo([0, 160, 240], [0, 8, 15])
    } else if (preset === 'origin') {
      glideCameraTo([0, 45, 45], [0, 16, -45])
    } else if (preset === 'topdown') {
      glideCameraTo([0, 310, 5], [0, 5, 5])
    } else {
      glideCameraTo([0, 180, 250], [0, 8, 10])
    }
  }

  // Setup Three.js WebGL Scene
  useEffect(() => {
    if (!mountRef.current || !detail) return
    const container = mountRef.current
    const width = container.clientWidth || 800
    const height = container.clientHeight || 640

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(backgroundColor)
    scene.fog = new THREE.FogExp2(0x060b13, 0.0014)

    // Elevated Isometric Vantage Point (38 degrees downward)
    const camera = new THREE.PerspectiveCamera(38, width / height, 1, 2000)
    camera.position.set(0, 180, 250)
    cameraRef.current = camera

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = currentExposure
    container.innerHTML = ''
    container.appendChild(renderer.domElement)

    // 2. OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.06
    controls.maxDistance = 750
    controls.minDistance = 50
    controls.target.set(0, 8, 10)
    controls.autoRotate = currentAutoRotate
    controls.autoRotateSpeed = 0.8
    controlsRef.current = controls

    // 3. PBR Lighting & Shadows
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9 * currentExposure)
    scene.add(ambientLight)

    const mainLight = new THREE.DirectionalLight(0xffffff, 1.4 * currentExposure)
    mainLight.position.set(80, 220, 120)
    scene.add(mainLight)

    const cyanFill = new THREE.PointLight(0x38bdf8, 2.0 * currentExposure, 700)
    cyanFill.position.set(-100, 100, 100)
    scene.add(cyanFill)

    const originLight = new THREE.PointLight(0xef4444, 3.5 * currentExposure, 350)
    originLight.position.set(0, 20, -45)
    scene.add(originLight)

    // 4. Ground Architecture Cyber-Pedestal
    const groundGeo = new THREE.CylinderGeometry(235, 240, 6, 64)
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x090a0d,
      roughness: 0.7,
      metalness: 0.3,
    })
    const groundMesh = new THREE.Mesh(groundGeo, groundMat)
    groundMesh.position.y = -42
    scene.add(groundMesh)

    // Soft Contact Shadow
    const shadowGeo = new THREE.RingGeometry(0, 95 * shadowIntensity, 48)
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.65,
      side: THREE.DoubleSide,
    })
    const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat)
    shadowMesh.rotation.x = Math.PI / 2
    shadowMesh.position.y = -38.8
    scene.add(shadowMesh)

    // Concentric Semantic Zone Rings
    // Inner Origin Zone (Red)
    const originZoneGeo = new THREE.RingGeometry(38, 40, 64)
    const originZoneMat = new THREE.MeshBasicMaterial({
      color: 0xef4444,
      transparent: true,
      opacity: 0.45,
      side: THREE.DoubleSide,
    })
    const originZone = new THREE.Mesh(originZoneGeo, originZoneMat)
    originZone.rotation.x = Math.PI / 2
    originZone.position.set(0, -38.5, -45)
    scene.add(originZone)

    // Front Blast Radius Arc (Amber)
    const blastZoneGeo = new THREE.RingGeometry(85, 87, 64)
    const blastZoneMat = new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
    })
    const blastZone = new THREE.Mesh(blastZoneGeo, blastZoneMat)
    blastZone.rotation.x = Math.PI / 2
    blastZone.position.set(0, -38.5, 30)
    scene.add(blastZone)

    // Coordinate Grid Helper
    const polarHelper = new THREE.PolarGridHelper(260, 16, 6, 64, 0x1e2430, 0x11141a)
    polarHelper.position.y = -38.3
    scene.add(polarHelper)

    // 5. FalkorDB Graph Data & Dynamic Semantic Layout
    const g = detail.graph
    const originName = detail.origin || g.origin || ''
    const alertingSet = new Set(detail.alerting || [])
    const interactiveMeshes: THREE.Object3D[] = []

    interface Node3DData {
      id: string
      tier: number
      type: 'origin' | 'alerting' | 'change' | 'service'
      pos: THREE.Vector3
      mesh: THREE.Mesh
      sprite: THREE.Sprite
      stem: THREE.Mesh
      halo?: THREE.Mesh
      outgoing: string[]
      incoming: string[]
    }
    const nodeMap = new Map<string, Node3DData>()

    // Index incoming and outgoing edges per node
    const outgoingMap = new Map<string, string[]>()
    const incomingMap = new Map<string, string[]>()
    g.edges.forEach(e => {
      if (!outgoingMap.has(e.source)) outgoingMap.set(e.source, [])
      outgoingMap.get(e.source)!.push(e.target)

      if (!incomingMap.has(e.target)) incomingMap.set(e.target, [])
      incomingMap.get(e.target)!.push(e.source)
    })

    // Compute Structured Semantic Node Positions:
    // - Origin at center-rear apex: (0, 16, -45)
    // - Ingress service (e.g. frontend-proxy) at front center: (0, 6, 125)
    // - Alerting services in a prominent front-facing fan arc (Z: 45 to 80, X: -75 to 75)
    // - Healthy services symmetrically distributed on left/right wings (X: -140 to -95 and 95 to 140)
    const positions = new Map<string, THREE.Vector3>()

    if (originName) {
      positions.set(originName, new THREE.Vector3(0, 16, -45))
    }

    const allNodeIds = g.nodes.map(n => n.id)
    const ingressNodes = allNodeIds.filter(id =>
      id.includes('proxy') || id.includes('gateway') || id.includes('ingress')
    )
    ingressNodes.forEach(id => {
      positions.set(id, new THREE.Vector3(0, 6, 130))
    })

    const alertingList = allNodeIds.filter(id => alertingSet.has(id) && id !== originName && !ingressNodes.includes(id))
    const alertCount = alertingList.length
    alertingList.forEach((id, idx) => {
      const t = alertCount <= 1 ? 0 : (idx / (alertCount - 1)) - 0.5
      const x = t * 145
      const z = 70 - Math.abs(t) * 30
      positions.set(id, new THREE.Vector3(x, 8, z))
    })

    const healthyList = allNodeIds.filter(id =>
      !alertingSet.has(id) && id !== originName && !ingressNodes.includes(id)
    )
    const half = Math.ceil(healthyList.length / 2)
    const leftHealthy = healthyList.slice(0, half)
    const rightHealthy = healthyList.slice(half)

    leftHealthy.forEach((id, idx) => {
      const t = leftHealthy.length <= 1 ? 0 : idx / (leftHealthy.length - 1)
      const x = -115 - t * 30
      const z = -25 + t * 90
      positions.set(id, new THREE.Vector3(x, 0, z))
    })

    rightHealthy.forEach((id, idx) => {
      const t = rightHealthy.length <= 1 ? 0 : idx / (rightHealthy.length - 1)
      const x = 115 + t * 30
      const z = -25 + t * 90
      positions.set(id, new THREE.Vector3(x, 0, z))
    })

    // A. Create Origin Node (Root Cause)
    let originHalo: THREE.Mesh | null = null
    if (originName && positions.has(originName)) {
      const pos = positions.get(originName)!
      const geo = new THREE.SphereGeometry(14, 32, 32)
      const mat = new THREE.MeshStandardMaterial({
        color: 0xef4444,
        emissive: 0xdc2626,
        emissiveIntensity: 0.95,
        roughness: 0.15,
        metalness: 0.85,
      })
      const mesh = new THREE.Mesh(geo, mat)
      mesh.position.copy(pos)
      mesh.userData = { id: originName, type: 'origin', tier: 1 }

      // Orbiting Halo Torus
      const torusGeo = new THREE.TorusGeometry(22, 1.6, 16, 64)
      const torusMat = new THREE.MeshStandardMaterial({
        color: 0xf87171,
        emissive: 0xef4444,
        emissiveIntensity: 0.9,
      })
      originHalo = new THREE.Mesh(torusGeo, torusMat)
      originHalo.rotation.x = Math.PI / 2
      originHalo.position.copy(pos)
      scene.add(originHalo)

      // Leader stem connecting sphere to billboard badge
      const stemGeo = new THREE.CylinderGeometry(0.4, 0.4, 16, 8)
      const stemMat = new THREE.MeshBasicMaterial({ color: 0xef4444, transparent: true, opacity: 0.8 })
      const stem = new THREE.Mesh(stemGeo, stemMat)
      stem.position.set(0, 14 + 8, 0)
      mesh.add(stem)

      // Billboard Text Badge
      const sprite = createTextSprite(originName, '🔥 ROOT CAUSE', '#ef4444', 'rgba(220, 38, 38, 0.95)', '#ffffff', 44)
      sprite.position.set(0, 14 + 20, 0)
      mesh.add(sprite)

      scene.add(mesh)
      interactiveMeshes.push(mesh)
      nodeMap.set(originName, {
        id: originName,
        tier: 1,
        type: 'origin',
        pos,
        mesh,
        sprite,
        stem,
        halo: originHalo,
        outgoing: outgoingMap.get(originName) || [],
        incoming: incomingMap.get(originName) || [],
      })
    }

    // B. Create Suspect Change Node (Holographic Diamond elevated above Origin)
    if (g.change && originName) {
      const changeId = g.change.change
      const originPos = positions.get(originName) || new THREE.Vector3(0, 16, -45)
      const changePos = new THREE.Vector3(originPos.x, originPos.y + 60, originPos.z)

      const octGeo = new THREE.OctahedronGeometry(12, 0)
      const octMat = new THREE.MeshStandardMaterial({
        color: 0xa855f7,
        emissive: 0x9333ea,
        emissiveIntensity: 0.9,
        roughness: 0.15,
        metalness: 0.85,
      })
      const changeMesh = new THREE.Mesh(octGeo, octMat)
      changeMesh.position.copy(changePos)
      changeMesh.userData = { id: changeId, type: 'change', tier: 1 }

      // Laser conduit connecting change to origin
      const tetherGeo = new THREE.CylinderGeometry(0.8, 0.8, 52, 12)
      const tetherMat = new THREE.MeshStandardMaterial({
        color: 0xc084fc,
        emissive: 0xa855f7,
        emissiveIntensity: 0.9,
      })
      const tether = new THREE.Mesh(tetherGeo, tetherMat)
      tether.position.set(originPos.x, originPos.y + 28, originPos.z)
      scene.add(tether)

      const sprite = createTextSprite(changeId, '⚡ SUSPECT DEPLOY', '#c084fc', 'rgba(147, 51, 234, 0.95)', '#ffffff', 42)
      sprite.position.set(0, 20, 0)
      changeMesh.add(sprite)

      scene.add(changeMesh)
      interactiveMeshes.push(changeMesh)
      nodeMap.set(changeId, {
        id: changeId,
        tier: 1,
        type: 'change',
        pos: changePos,
        mesh: changeMesh,
        sprite,
        stem: tether,
        outgoing: [originName],
        incoming: [],
      })
    }

    // C. Create Alerting & Healthy Service Nodes
    g.nodes.forEach(node => {
      if (node.id === originName) return
      const pos = positions.get(node.id) || new THREE.Vector3(0, 0, 0)
      const isAlerting = alertingSet.has(node.id)
      const tier = node.tier || 1
      const radius = isAlerting ? 10.5 : 8.5

      const geo = new THREE.SphereGeometry(radius, 28, 28)
      const mat = new THREE.MeshStandardMaterial({
        color: isAlerting ? 0xf97316 : 0x0284c7,
        emissive: isAlerting ? 0xea580c : 0x0369a1,
        emissiveIntensity: isAlerting ? 0.85 : 0.45,
        roughness: 0.2,
        metalness: 0.8,
      })
      const mesh = new THREE.Mesh(geo, mat)
      mesh.position.copy(pos)
      mesh.userData = { id: node.id, type: isAlerting ? 'alerting' : 'service', tier }

      // Subtle ground contact shadow ring for each node
      const nRingGeo = new THREE.RingGeometry(radius + 2, radius + 3.5, 32)
      const nRingMat = new THREE.MeshBasicMaterial({
        color: isAlerting ? 0xf59e0b : 0x38bdf8,
        transparent: true,
        opacity: isAlerting ? 0.6 : 0.25,
        side: THREE.DoubleSide,
      })
      const nRing = new THREE.Mesh(nRingGeo, nRingMat)
      nRing.rotation.x = Math.PI / 2
      nRing.position.set(pos.x, -38.2, pos.z)
      scene.add(nRing)

      // Slender vertical leader stem
      const stemGeo = new THREE.CylinderGeometry(0.3, 0.3, 14, 8)
      const stemMat = new THREE.MeshBasicMaterial({
        color: isAlerting ? 0xf59e0b : 0x38bdf8,
        transparent: true,
        opacity: 0.75,
      })
      const stem = new THREE.Mesh(stemGeo, stemMat)
      stem.position.set(0, radius + 7, 0)
      mesh.add(stem)

      // Billboard Text Badge
      const badgeText = isAlerting ? '⚠️ ALERTING' : `Tier ${tier}`
      const badgeBorder = isAlerting ? '#f59e0b' : 'rgba(255, 255, 255, 0.16)'
      const badgeBg = isAlerting ? 'rgba(234, 88, 12, 0.95)' : 'rgba(18, 19, 23, 0.92)'
      const sprite = createTextSprite(
        node.id,
        badgeText,
        badgeBorder,
        badgeBg,
        isAlerting ? '#ffffff' : '#e2e8f0',
        isAlerting ? 38 : 33
      )
      sprite.position.set(0, radius + 18, 0)
      mesh.add(sprite)

      scene.add(mesh)
      interactiveMeshes.push(mesh)
      nodeMap.set(node.id, {
        id: node.id,
        tier,
        type: isAlerting ? 'alerting' : 'service',
        pos,
        mesh,
        sprite,
        stem,
        outgoing: outgoingMap.get(node.id) || [],
        incoming: incomingMap.get(node.id) || [],
      })
    })

    // D. Build Dependencies & Causal Conduits
    interface Edge3DEntity {
      source: string
      target: string
      isCausal: boolean
      tubeMesh: THREE.Mesh
      tubeMat: THREE.MeshStandardMaterial
      arrowMesh: THREE.Mesh
      particles: THREE.Points
      curve: THREE.CatmullRomCurve3
    }
    const edgeEntities: Edge3DEntity[] = []

    g.edges.forEach(edge => {
      const src = nodeMap.get(edge.source)
      const dst = nodeMap.get(edge.target)
      if (!src || !dst) return

      // Causal Blast Radius Path: directly connects alerting nodes or root cause
      const isCausal = (alertingSet.has(edge.source) && edge.target === originName) ||
        (edge.source === originName) ||
        (alertingSet.has(edge.source) && alertingSet.has(edge.target))

      // Low parabolic curve hugging ground plane to avoid blocking nodes
      const mid = new THREE.Vector3().addVectors(src.pos, dst.pos).multiplyScalar(0.5)
      mid.y = Math.min(src.pos.y, dst.pos.y) + (isCausal ? 4.5 : 2.0)
      const curve = new THREE.CatmullRomCurve3([src.pos, mid, dst.pos])

      // Physical 3D Tube Conduit
      const radius = isCausal ? 1.6 : 0.55
      const tubeGeo = new THREE.TubeGeometry(curve, 24, radius, 8, false)
      const tubeMat = new THREE.MeshStandardMaterial({
        color: isCausal ? 0xf59e0b : 0x334155,
        emissive: isCausal ? 0xfbbf24 : 0x0f172a,
        emissiveIntensity: isCausal ? 0.9 : 0.15,
        roughness: 0.3,
        metalness: 0.7,
        transparent: true,
        opacity: isCausal ? 0.95 : (focusBlastOnly ? 0.12 : 0.35),
      })
      const tubeMesh = new THREE.Mesh(tubeGeo, tubeMat)
      scene.add(tubeMesh)

      // Directional Flow Cone Indicator
      const arrowGeo = new THREE.ConeGeometry(isCausal ? 2.6 : 1.4, isCausal ? 6.5 : 3.8, 10)
      const arrowMat = new THREE.MeshStandardMaterial({
        color: isCausal ? 0xfbbf24 : 0x475569,
        emissive: isCausal ? 0xf59e0b : 0x1e293b,
        emissiveIntensity: isCausal ? 0.85 : 0.2,
        transparent: true,
        opacity: isCausal ? 0.95 : (focusBlastOnly ? 0.12 : 0.4),
      })
      const arrowMesh = new THREE.Mesh(arrowGeo, arrowMat)
      const arrowPos = curve.getPoint(0.72)
      const tangent = curve.getTangent(0.72)
      arrowMesh.position.copy(arrowPos)
      arrowMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tangent)
      scene.add(arrowMesh)

      // Animated Flowing Signal Particle
      const pGeo = new THREE.BufferGeometry().setFromPoints([src.pos.clone()])
      const pMat = new THREE.PointsMaterial({
        color: isCausal ? 0xfef08a : 0x7dd3fc,
        size: isCausal ? 5.5 : 3.5,
        transparent: true,
        opacity: isCausal ? 0.95 : (focusBlastOnly ? 0.05 : 0.4),
      })
      const particles = new THREE.Points(pGeo, pMat)
      scene.add(particles)

      edgeEntities.push({
        source: edge.source,
        target: edge.target,
        isCausal,
        tubeMesh,
        tubeMat,
        arrowMesh,
        particles,
        curve,
      })
    })

    // 6. Interactive Raycasting & Hover Path Isolation
    const raycaster = new THREE.Raycaster()
    const mouse = new THREE.Vector2(-999, -999)
    let currentHoverId: string | null = null

    function updateEdgeHighlights(activeNodeId: string | null) {
      edgeEntities.forEach(ent => {
        if (!activeNodeId) {
          // Reset to default focus mode
          ent.tubeMat.opacity = ent.isCausal ? 0.95 : (focusBlastOnly ? 0.12 : 0.35)
          ent.tubeMat.emissiveIntensity = ent.isCausal ? 0.9 : 0.15
          ent.arrowMesh.material = ent.tubeMat
          const pMat = ent.particles.material as THREE.PointsMaterial
          pMat.opacity = ent.isCausal ? 0.95 : (focusBlastOnly ? 0.05 : 0.4)
        } else {
          // Highlight ONLY edges connected to hovered node
          const isConnected = ent.source === activeNodeId || ent.target === activeNodeId
          ent.tubeMat.opacity = isConnected ? 1.0 : 0.04
          ent.tubeMat.emissiveIntensity = isConnected ? 1.0 : 0.02
          ent.arrowMesh.material = ent.tubeMat
          const pMat = ent.particles.material as THREE.PointsMaterial
          pMat.opacity = isConnected ? 1.0 : 0.02
        }
      })
    }

    function onMouseMove(e: MouseEvent) {
      const rect = renderer.domElement.getBoundingClientRect()
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1

      raycaster.setFromCamera(mouse, camera)
      const hits = raycaster.intersectObjects(interactiveMeshes)

      if (hits.length > 0) {
        const id = hits[0].object.userData.id
        if (id && id !== currentHoverId) {
          currentHoverId = id
          const nodeData = nodeMap.get(id)
          if (nodeData) {
            setHoveredService({
              id,
              tier: nodeData.tier,
              isOrigin: nodeData.type === 'origin',
              isAlerting: nodeData.type === 'alerting',
              outgoing: nodeData.outgoing,
              incoming: nodeData.incoming,
            })
            updateEdgeHighlights(id)
          }
        }
      } else {
        if (currentHoverId !== null) {
          currentHoverId = null
          setHoveredService(null)
          updateEdgeHighlights(null)
        }
      }
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
          [hitPos.x, hitPos.y + 45, hitPos.z + 85],
          [hitPos.x, hitPos.y + 8, hitPos.z]
        )
      }
    }

    renderer.domElement.addEventListener('mousemove', onMouseMove)
    renderer.domElement.addEventListener('click', onClick)

    // 7. Animation Loop
    let clock = 0
    function animate() {
      animFrameRef.current = requestAnimationFrame(animate)
      clock += 0.02
      controls.update()

      // Pulse Origin Halo
      if (originHalo) {
        const s = 1 + Math.sin(clock * 3.0) * 0.06
        originHalo.scale.set(s, s, s)
        originHalo.rotation.z += 0.015
      }

      // Animate flowing signal particles along all edges
      edgeEntities.forEach((e, idx) => {
        const speed = e.isCausal ? 0.45 : 0.25
        const t = (clock * speed + idx * 0.14) % 1.0
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
  }, [detail, backgroundColor, shadowIntensity, currentExposure, currentAutoRotate, focusBlastOnly, onSelectService, glideCameraTo])

  // Sync autoRotate
  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.autoRotate = currentAutoRotate
      controlsRef.current.autoRotateSpeed = 0.8
    }
  }, [currentAutoRotate])

  const originName = detail?.origin || detail?.graph.origin || ''
  const alertingCount = (detail?.alerting || []).length

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
          {/* Path Mode Toggle: User-friendly Blast Focus vs All Paths */}
          <button
            type="button"
            className="tool-btn"
            onClick={() => setFocusBlastOnly(!focusBlastOnly)}
            title="Toggle between Incident Blast Radius Paths and Full Network Topology"
            style={{
              padding: '6px 12px',
              fontSize: '12px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: focusBlastOnly ? 'rgba(245, 158, 11, 0.22)' : 'rgba(18, 19, 23, 0.85)',
              borderColor: focusBlastOnly ? '#f59e0b' : 'rgba(255, 255, 255, 0.12)',
              color: focusBlastOnly ? '#fbbf24' : '#f4f4f6',
              borderRadius: 8,
              border: '1px solid',
              cursor: 'pointer',
              backdropFilter: 'blur(8px)',
              fontWeight: 600,
            }}
          >
            <Filter size={13} color={focusBlastOnly ? '#fbbf24' : '#a1a1aa'} />
            <span>{focusBlastOnly ? '🔥 Blast Paths (Focused)' : '🌐 All Dependencies (21)'}</span>
          </button>

          {/* Auto-Rotate Toggle */}
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
            <span>{currentAutoRotate ? 'Orbiting' : 'Orbit Paused'}</span>
          </button>

          {/* Exposure Adjustment */}
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
            onClick={() => handlePreset('flow')}
            style={{
              padding: '5px 10px',
              fontSize: '11px',
              background: activePreset === 'flow' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(18, 19, 23, 0.85)',
              borderColor: activePreset === 'flow' ? '#f59e0b' : 'rgba(255, 255, 255, 0.12)',
              color: activePreset === 'flow' ? '#fbbf24' : '#f4f4f6',
              borderRadius: 6,
              border: '1px solid',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <Compass size={11} color="#f59e0b" /> Incident Flow
          </button>

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
            onClick={() => handlePreset('topdown')}
            style={{
              padding: '5px 10px',
              fontSize: '11px',
              background: activePreset === 'topdown' ? 'rgba(56, 189, 248, 0.2)' : 'rgba(18, 19, 23, 0.85)',
              borderColor: activePreset === 'topdown' ? '#38bdf8' : 'rgba(255, 255, 255, 0.12)',
              color: activePreset === 'topdown' ? '#38bdf8' : '#f4f4f6',
              borderRadius: 6,
              border: '1px solid',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <Layers size={11} color="#38bdf8" /> Top-Down Map
          </button>

          <button
            type="button"
            onClick={() => handlePreset('reset')}
            style={{
              padding: '5px 10px',
              fontSize: '11px',
              background: activePreset === 'reset' ? 'rgba(255, 255, 255, 0.15)' : 'rgba(18, 19, 23, 0.85)',
              borderColor: activePreset === 'reset' ? '#ffffff' : 'rgba(255, 255, 255, 0.12)',
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

      {/* Interactive Telemetry HUD Card (Anchored Top-Left) */}
      {hoveredService ? (
        <div
          style={{
            position: 'absolute',
            top: 62,
            left: 16,
            zIndex: 10,
            width: 280,
            background: 'rgba(14, 16, 21, 0.94)',
            backdropFilter: 'blur(16px)',
            border: `1px solid ${hoveredService.isOrigin ? '#ef4444' : hoveredService.isAlerting ? '#f59e0b' : '#38bdf8'}`,
            borderRadius: 10,
            padding: '10px 14px',
            boxShadow: '0 12px 30px rgba(0,0,0,0.6)',
            pointerEvents: 'none',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontWeight: 700, fontSize: 13, color: '#ffffff' }}>{hoveredService.id}</span>
            <span
              style={{
                fontSize: 10,
                fontWeight: 600,
                padding: '2px 6px',
                borderRadius: 4,
                background: hoveredService.isOrigin ? 'rgba(239,68,68,0.2)' : hoveredService.isAlerting ? 'rgba(245,158,11,0.2)' : 'rgba(56,189,248,0.2)',
                color: hoveredService.isOrigin ? '#f87171' : hoveredService.isAlerting ? '#fbbf24' : '#38bdf8',
                border: '1px solid currentColor',
              }}
            >
              {hoveredService.isOrigin ? 'ROOT CAUSE' : hoveredService.isAlerting ? 'FIRING ALERT' : `TIER ${hoveredService.tier || 1}`}
            </span>
          </div>
          <div style={{ fontSize: 11, color: '#a1a1aa', lineHeight: 1.5 }}>
            <div><strong>Status:</strong> {hoveredService.isOrigin ? 'Origin of degradation' : hoveredService.isAlerting ? 'Downstream alert firing' : 'Healthy dependency'}</div>
            <div><strong>Depends on ({hoveredService.outgoing.length}):</strong> {hoveredService.outgoing.join(', ') || 'none'}</div>
            <div><strong>Called by ({hoveredService.incoming.length}):</strong> {hoveredService.incoming.join(', ') || 'none'}</div>
          </div>
          <div style={{ marginTop: 6, fontSize: 10, color: '#38bdf8', display: 'flex', alignItems: 'center', gap: 4 }}>
            <span>👆 Click node to view Service Profile Drawer</span>
          </div>
        </div>
      ) : (
        <div
          style={{
            position: 'absolute',
            top: 62,
            left: 16,
            zIndex: 10,
            background: 'rgba(14, 16, 21, 0.88)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: 8,
            padding: '8px 12px',
            fontSize: 11,
            color: '#a1a1aa',
            display: 'flex',
            flexDirection: 'column',
            gap: 3,
            pointerEvents: 'none',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#ef4444', boxShadow: '0 0 6px #ef4444' }} />
            <span style={{ color: '#f4f4f6', fontWeight: 600 }}>Root Cause: <span style={{ color: '#ef4444' }}>{originName}</span></span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#f59e0b', boxShadow: '0 0 6px #f59e0b' }} />
            <span>Impact: <strong style={{ color: '#fbbf24' }}>{alertingCount}</strong> alerting services in blast radius</span>
          </div>
          <div style={{ fontSize: 10, color: '#71717a', marginTop: 2 }}>
            💡 Hover any node to isolate its paths • Click to inspect drawer
          </div>
        </div>
      )}

      {/* Main 3D Canvas Mount */}
      <div
        ref={mountRef}
        style={{ width: '100%', height: '100%', flex: 1, minHeight: '640px' }}
      />

      {/* Bottom User-Friendly Architecture Legend Bar */}
      <div
        style={{
          position: 'absolute',
          bottom: 16,
          left: 16,
          right: 16,
          zIndex: 10,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            background: 'rgba(14, 16, 21, 0.90)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: 8,
            padding: '6px 14px',
            fontSize: 11,
            color: '#a1a1aa',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            pointerEvents: 'auto',
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', boxShadow: '0 0 6px #ef4444' }} />
            <span style={{ color: '#f87171', fontWeight: 600 }}>Root Cause</span>
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 8, height: 8, transform: 'rotate(45deg)', background: '#c084fc', boxShadow: '0 0 6px #c084fc' }} />
            <span style={{ color: '#c084fc' }}>Suspect Deploy</span>
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f59e0b', boxShadow: '0 0 6px #f59e0b' }} />
            <span style={{ color: '#fbbf24' }}>Firing Alert</span>
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#0284c7', boxShadow: '0 0 6px #38bdf8' }} />
            <span style={{ color: '#7dd3fc' }}>Healthy Fleet</span>
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 18, height: 3, background: '#f59e0b', borderRadius: 2, boxShadow: '0 0 6px #f59e0b' }} />
            <span style={{ color: '#fef08a' }}>Causal Path</span>
          </span>
        </div>

        <div
          style={{
            background: 'rgba(14, 16, 21, 0.90)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: 8,
            padding: '6px 12px',
            fontSize: 11,
            color: '#71717a',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <span>FalkorDB Graph Engine • Port 6380 • Real-time Cypher Traversal</span>
        </div>
      </div>
    </div>
  )
}

export default Interactive3DViewer
