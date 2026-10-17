import React, { useEffect, useRef, useState, useCallback } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { RotateCw, Sun, Compass, Target, Box } from 'lucide-react'
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
 * High-DPI 3D Billboard Sprite Generator
 * Generates an anti-aliased CanvasTexture sprite anchored in 3D world space
 */
function create3DTextSprite(
  title: string,
  badge?: string,
  accentColor = '#38bdf8',
  bgColor = 'rgba(10, 11, 14, 0.95)',
  scaleSize: [number, number] = [46, 12.5]
): THREE.Sprite {
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 140
  const ctx = canvas.getContext('2d')
  if (ctx) {
    // Pill Container
    ctx.fillStyle = bgColor
    ctx.beginPath()
    ctx.roundRect(8, 8, 496, 124, 28)
    ctx.fill()

    // Outer Crisp Salt Border
    ctx.strokeStyle = accentColor
    ctx.lineWidth = 5
    ctx.stroke()

    // Title Text
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 46px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = badge ? 'top' : 'middle'
    ctx.fillText(title, 256, badge ? 22 : 70)

    // Badge / Status Sublabel
    if (badge) {
      ctx.fillStyle = accentColor
      ctx.font = 'bold 28px "JetBrains Mono", Consolas, monospace'
      ctx.fillText(badge, 256, 78)
    }
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.minFilter = THREE.LinearFilter
  texture.generateMipmaps = false

  const spriteMaterial = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
    depthTest: false,
  })

  const sprite = new THREE.Sprite(spriteMaterial)
  sprite.scale.set(scaleSize[0], scaleSize[1], 1)
  return sprite
}

/**
 * Interactive3DViewer (Photorealistic 3D Digital Twin Graph)
 *
 * Implements a fully-defined 3D microservice topology:
 * - Real FalkorDB dependency graph edges (DEPENDS_ON) with animated energy particle pulses
 * - PBR material spheres with specular reflection, calibrated metallic/roughness, and emissive cores
 * - World-space 3D text sprites anchored to each service node that orbit smoothly
 * - Ground cyber-pedestal with blast radius distance rings (Hops 1..4)
 * - Hotspot telemetry inspection on hover/click with smooth camera gliding
 */
export const Interactive3DViewer: React.FC<Interactive3DViewerProps> = ({
  detail,
  backgroundColor = '#07080a',
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
  const [activePreset, setActivePreset] = useState<'origin' | 'blast' | 'top' | 'default'>('default')
  const [hoveredNodeInfo, setHoveredNodeInfo] = useState<{
    id: string
    type: string
    tier?: number
    hops?: number
    upstreamCount: number
    downstreamCount: number
  } | null>(null)

  // Camera glide interpolation
  const glideCameraTo = useCallback(
    (pos: [number, number, number], target: [number, number, number] = [0, 0, 0]) => {
      if (!cameraRef.current || !controlsRef.current) return
      const cam = cameraRef.current
      const ctrl = controlsRef.current
      const startPos = cam.position.clone()
      const endPos = new THREE.Vector3(...pos)
      const startTarget = ctrl.target.clone()
      const endTarget = new THREE.Vector3(...target)
      const startTime = performance.now()
      const duration = 750

      const step = (now: number) => {
        const elapsed = now - startTime
        const p = Math.min(1.0, elapsed / duration)
        const ease = 1 - Math.pow(1 - p, 3) // ease-out cubic
        cam.position.lerpVectors(startPos, endPos, ease)
        ctrl.target.lerpVectors(startTarget, endTarget, ease)
        ctrl.update()
        if (p < 1.0) {
          requestAnimationFrame(step)
        }
      }
      requestAnimationFrame(step)
    },
    []
  )

  // Camera presets
  const handlePreset = (preset: 'origin' | 'blast' | 'top' | 'default') => {
    setActivePreset(preset)
    if (preset === 'origin') {
      glideCameraTo([0, 50, 190], [0, 0, 0])
    } else if (preset === 'blast') {
      glideCameraTo([0, 180, 420], [0, 0, 0])
    } else if (preset === 'top') {
      glideCameraTo([0, 430, 20], [0, 0, 0])
    } else {
      glideCameraTo([110, 150, 340], [0, 0, 0])
    }
  }

  // Setup 3D Scene
  useEffect(() => {
    if (!mountRef.current || !detail) return
    const container = mountRef.current
    const width = container.clientWidth || 800
    const height = container.clientHeight || 640

    // 1. Scene, Camera, WebGL Renderer
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(backgroundColor)
    scene.fog = new THREE.FogExp2(0x07080a, 0.0012)

    const camera = new THREE.PerspectiveCamera(42, width / height, 1, 2500)
    camera.position.set(110, 150, 340)
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
    controls.maxDistance = 900
    controls.minDistance = 60
    controls.autoRotate = currentAutoRotate
    controls.autoRotateSpeed = 1.0
    controlsRef.current = controls

    // 3. PBR Studio Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9 * currentExposure)
    scene.add(ambientLight)

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.8 * currentExposure)
    keyLight.position.set(120, 220, 140)
    scene.add(keyLight)

    const fillLight = new THREE.DirectionalLight(0x38bdf8, 1.2 * currentExposure)
    fillLight.position.set(-140, -80, -100)
    scene.add(fillLight)

    const originPointLight = new THREE.PointLight(0xef4444, 3.5 * currentExposure, 600)
    originPointLight.position.set(0, 0, 0)
    scene.add(originPointLight)

    // 4. Ground Pedestal & Blast Radius Spatial Coordinate Rings
    const groundGeo = new THREE.CylinderGeometry(270, 280, 8, 64)
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x0c0d11,
      roughness: 0.6,
      metalness: 0.4,
    })
    const groundMesh = new THREE.Mesh(groundGeo, groundMat)
    groundMesh.position.y = -66
    scene.add(groundMesh)

    // Radial distance coordinate rings representing blast radius hops
    const hopRadii = [
      { radius: 65, color: 0xef4444, label: 'Origin Zone' },
      { radius: 110, color: 0xf59e0b, label: 'Hop 1 (Alerting Core)' },
      { radius: 175, color: 0x38bdf8, label: 'Hop 2 (Direct Dependents)' },
      { radius: 240, color: 0x818cf8, label: 'Hop 3+ (Cascade Horizon)' },
    ]

    hopRadii.forEach(({ radius, color }) => {
      const ringGeo = new THREE.RingGeometry(radius - 0.8, radius + 0.8, 64)
      const ringMat = new THREE.MeshBasicMaterial({
        color,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.45,
      })
      const ringMesh = new THREE.Mesh(ringGeo, ringMat)
      ringMesh.rotation.x = Math.PI / 2
      ringMesh.position.y = -61.8
      scene.add(ringMesh)
    })

    // Contact shadow ring under the digital twin
    const shadowGeo = new THREE.RingGeometry(0, 75 * shadowIntensity, 48)
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.75,
      side: THREE.DoubleSide,
    })
    const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat)
    shadowMesh.rotation.x = Math.PI / 2
    shadowMesh.position.y = -61.5
    scene.add(shadowMesh)

    // 5. Build Digital Twin Node Hierarchy & Positions
    const g = detail.graph
    const originName = g.origin || detail.origin || ''
    const alertingSet = new Set(detail.alerting || [])

    interface NodeTwinData {
      id: string
      type: 'origin' | 'alerting' | 'change' | 'service'
      position: THREE.Vector3
      mesh: THREE.Mesh
      sprite: THREE.Sprite
      halo?: THREE.Mesh
      tier?: number
      hops?: number
    }

    const nodeTwinMap = new Map<string, NodeTwinData>()
    const interactiveMeshes: THREE.Object3D[] = []

    // Helper: calculate upstream & downstream counts for each node
    const upstreamMap = new Map<string, string[]>()
    const downstreamMap = new Map<string, string[]>()
    g.edges.forEach(e => {
      if (!upstreamMap.has(e.source)) upstreamMap.set(e.source, [])
      upstreamMap.get(e.source)!.push(e.target)

      if (!downstreamMap.has(e.target)) downstreamMap.set(e.target, [])
      downstreamMap.get(e.target)!.push(e.source)
    })

    // Separate node categories
    const nonOriginNodes = g.nodes.filter(n => n.id !== originName)
    const alertNodes = nonOriginNodes.filter(n => alertingSet.has(n.id))
    const otherNodes = nonOriginNodes.filter(n => !alertingSet.has(n.id))

    // A. Origin Node (Root Cause Core at Center 0, 0, 0)
    let originHalo1: THREE.Mesh | null = null
    let originHalo2: THREE.Mesh | null = null
    if (originName) {
      const geo = new THREE.SphereGeometry(15, 32, 32)
      const mat = new THREE.MeshStandardMaterial({
        color: 0xef4444,
        emissive: 0xdc2626,
        emissiveIntensity: 0.85,
        roughness: 0.15,
        metalness: 0.85,
      })
      const mesh = new THREE.Mesh(geo, mat)
      mesh.position.set(0, 0, 0)
      mesh.userData = { id: originName, type: 'origin', tier: 1, hops: 0 }
      scene.add(mesh)
      interactiveMeshes.push(mesh)

      // Dual rotating halo toruses
      const haloGeo1 = new THREE.TorusGeometry(23, 1.4, 16, 64)
      const haloMat1 = new THREE.MeshBasicMaterial({ color: 0xf87171, transparent: true, opacity: 0.85 })
      originHalo1 = new THREE.Mesh(haloGeo1, haloMat1)
      originHalo1.rotation.x = Math.PI / 2
      mesh.add(originHalo1)

      const haloGeo2 = new THREE.TorusGeometry(28, 1.0, 16, 64)
      const haloMat2 = new THREE.MeshBasicMaterial({ color: 0xef4444, transparent: true, opacity: 0.55 })
      originHalo2 = new THREE.Mesh(haloGeo2, haloMat2)
      originHalo2.rotation.y = Math.PI / 3
      mesh.add(originHalo2)

      // 3D Text Sprite above origin
      const sprite = create3DTextSprite(originName, 'ROOT CAUSE ORIGIN', '#ef4444', 'rgba(185, 28, 28, 0.95)', [54, 14.8])
      sprite.position.set(0, 36, 0)
      mesh.add(sprite)

      nodeTwinMap.set(originName, {
        id: originName,
        type: 'origin',
        position: mesh.position,
        mesh,
        sprite,
        halo: originHalo1,
        tier: 1,
        hops: 0,
      })
    }

    // B. Suspect Change Node (Floating Holographic Diamond)
    if (g.change) {
      const changeId = g.change.change
      const octGeo = new THREE.OctahedronGeometry(13, 0)
      const octMat = new THREE.MeshStandardMaterial({
        color: 0xa855f7,
        emissive: 0x9333ea,
        emissiveIntensity: 0.85,
        roughness: 0.15,
        metalness: 0.9,
      })
      const changeMesh = new THREE.Mesh(octGeo, octMat)
      changeMesh.position.set(-52, 54, 28)
      changeMesh.userData = { id: changeId, type: 'change' }
      scene.add(changeMesh)
      interactiveMeshes.push(changeMesh)

      // Change Sprite
      const sprite = create3DTextSprite(changeId, 'SUSPECT CHANGE', '#c084fc', 'rgba(126, 34, 206, 0.95)', [48, 13.2])
      sprite.position.set(0, 28, 0)
      changeMesh.add(sprite)

      // Connecting holographic beam from change to origin
      if (originName) {
        const beamCurve = new THREE.LineCurve3(new THREE.Vector3(-52, 54, 28), new THREE.Vector3(0, 0, 0))
        const beamGeo = new THREE.TubeGeometry(beamCurve, 20, 2, 8, false)
        const beamMat = new THREE.MeshStandardMaterial({
          color: 0xc084fc,
          emissive: 0xa855f7,
          emissiveIntensity: 0.75,
          roughness: 0.3,
        })
        const beamMesh = new THREE.Mesh(beamGeo, beamMat)
        scene.add(beamMesh)
      }

      nodeTwinMap.set(changeId, {
        id: changeId,
        type: 'change',
        position: changeMesh.position,
        mesh: changeMesh,
        sprite,
      })
    }

    // C. Alerting Core Nodes (Inner Shell Radius = 105)
    alertNodes.forEach((node, idx) => {
      const count = alertNodes.length || 1
      const theta = (idx / count) * Math.PI * 2
      const radius = 105
      const x = Math.cos(theta) * radius
      const z = Math.sin(theta) * radius
      const y = Math.sin(theta * 2) * 22

      const geo = new THREE.SphereGeometry(11, 28, 28)
      const mat = new THREE.MeshStandardMaterial({
        color: 0xf97316,
        emissive: 0xea580c,
        emissiveIntensity: 0.75,
        roughness: 0.2,
        metalness: 0.8,
      })
      const mesh = new THREE.Mesh(geo, mat)
      mesh.position.set(x, y, z)
      mesh.userData = { id: node.id, type: 'alerting', tier: node.tier || 1, hops: node.hops || 1 }
      scene.add(mesh)
      interactiveMeshes.push(mesh)

      // Warning Halo
      const haloGeo = new THREE.RingGeometry(14, 17, 32)
      const haloMat = new THREE.MeshBasicMaterial({ color: 0xfbbf24, side: THREE.DoubleSide, transparent: true, opacity: 0.8 })
      const halo = new THREE.Mesh(haloGeo, haloMat)
      halo.rotation.x = Math.PI / 2
      mesh.add(halo)

      // 3D Text Sprite
      const sprite = create3DTextSprite(node.id, 'ALERT FIRING (!)', '#f59e0b', 'rgba(194, 65, 12, 0.95)', [48, 13.2])
      sprite.position.set(0, 28, 0)
      mesh.add(sprite)

      nodeTwinMap.set(node.id, {
        id: node.id,
        type: 'alerting',
        position: mesh.position,
        mesh,
        sprite,
        halo,
        tier: node.tier || 1,
        hops: node.hops || 1,
      })
    })

    // D. Outer Dependent Services (Structured Multi-Tier Shells: Radius = 170..240)
    otherNodes.forEach((node, idx) => {
      const count = otherNodes.length || 1
      const hops = node.hops || (node.tier === 1 ? 2 : node.tier === 2 ? 3 : 4)
      const baseRadius = 165 + (hops - 1) * 35
      const phi = Math.acos(-1 + (2 * idx) / count)
      const theta = Math.sqrt(count * Math.PI) * phi

      const x = baseRadius * Math.cos(theta) * Math.sin(phi)
      const z = baseRadius * Math.sin(theta) * Math.sin(phi)
      const y = baseRadius * Math.cos(phi) * 0.55

      // Node sphere sized by service tier
      const radiusSize = node.tier === 1 ? 10 : node.tier === 2 ? 8 : 7
      const geo = new THREE.SphereGeometry(radiusSize, 24, 24)
      const mat = new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x0284c7,
        emissiveIntensity: 0.45,
        roughness: 0.25,
        metalness: 0.85,
      })
      const mesh = new THREE.Mesh(geo, mat)
      mesh.position.set(x, y, z)
      mesh.userData = { id: node.id, type: 'service', tier: node.tier || 2, hops }
      scene.add(mesh)
      interactiveMeshes.push(mesh)

      // 3D Text Sprite with Tier Badge
      const tierLabel = `Tier ${node.tier || 2}`
      const sprite = create3DTextSprite(node.id, tierLabel, '#38bdf8', 'rgba(12, 18, 28, 0.92)', [38, 10.4])
      sprite.position.set(0, radiusSize + 18, 0)
      mesh.add(sprite)

      nodeTwinMap.set(node.id, {
        id: node.id,
        type: 'service',
        position: mesh.position,
        mesh,
        sprite,
        tier: node.tier || 2,
        hops,
      })
    })

    // 6. Build Real Directed Graph Dependency Conduits (DEPENDS_ON)
    interface EdgeTwinData {
      source: string
      target: string
      tube: THREE.Mesh
      particles: THREE.Points
      curve: THREE.CatmullRomCurve3
      isExplain: boolean
    }

    const edgeTwinList: EdgeTwinData[] = []
    const allEdges = [...g.edges]

    allEdges.forEach(edge => {
      const src = nodeTwinMap.get(edge.source)
      const dst = nodeTwinMap.get(edge.target)
      if (!src || !dst) return

      // Determine if this edge forms part of the critical causal explain path
      const isExplain =
        (alertingSet.has(edge.source) && edge.target === originName) ||
        (edge.source === originName) ||
        (alertingSet.has(edge.source) && alertingSet.has(edge.target))

      // Gentle curved 3D conduit
      const mid = new THREE.Vector3()
        .addVectors(src.position, dst.position)
        .multiplyScalar(0.5)
      // Slight elevation arc
      mid.y += 12

      const curve = new THREE.CatmullRomCurve3([src.position, mid, dst.position])
      const tubeGeo = new THREE.TubeGeometry(curve, 24, isExplain ? 1.8 : 0.9, 8, false)
      const tubeMat = new THREE.MeshStandardMaterial({
        color: isExplain ? 0xf59e0b : 0x38bdf8,
        emissive: isExplain ? 0xd97706 : 0x0284c7,
        emissiveIntensity: isExplain ? 0.85 : 0.35,
        roughness: 0.25,
        metalness: 0.7,
        transparent: true,
        opacity: isExplain ? 0.95 : 0.65,
      })
      const tube = new THREE.Mesh(tubeGeo, tubeMat)
      scene.add(tube)

      // Animated Energy Particle along conduit
      const pGeo = new THREE.BufferGeometry().setFromPoints([src.position])
      const pMat = new THREE.PointsMaterial({
        color: isExplain ? 0xfef08a : 0x7dd3fc,
        size: isExplain ? 6 : 4,
        transparent: true,
        opacity: 0.95,
      })
      const particles = new THREE.Points(pGeo, pMat)
      scene.add(particles)

      edgeTwinList.push({
        source: edge.source,
        target: edge.target,
        tube,
        particles,
        curve,
        isExplain,
      })
    })

    // 7. Raycaster for Hotspot Inspection & Click Navigation
    const raycaster = new THREE.Raycaster()
    const mouse = new THREE.Vector2(-999, -999)
    let hoveredMesh: THREE.Object3D | null = null

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
        // Eased focus glide
        glideCameraTo(
          [hitPos.x + 25, hitPos.y + 40, hitPos.z + 130],
          [hitPos.x, hitPos.y, hitPos.z]
        )
      }
    }

    renderer.domElement.addEventListener('mousemove', onMouseMove)
    renderer.domElement.addEventListener('click', onClick)

    // 8. Animation Loop
    let clock = 0
    function animate() {
      animFrameRef.current = requestAnimationFrame(animate)
      clock += 0.02
      controls.update()

      // Halo rotations
      if (originHalo1) originHalo1.rotation.z += 0.015
      if (originHalo2) originHalo2.rotation.x += 0.01

      // Energy particles flowing along conduits
      edgeTwinList.forEach((edge, i) => {
        const speed = edge.isExplain ? 0.35 : 0.2
        const t = (clock * speed + i * 0.15) % 1.0
        const point = edge.curve.getPoint(t)
        const attr = edge.particles.geometry.attributes.position as THREE.BufferAttribute
        attr.setXYZ(0, point.x, point.y, point.z)
        attr.needsUpdate = true
      })

      // Raycaster hover state
      raycaster.setFromCamera(mouse, camera)
      const hits = raycaster.intersectObjects(interactiveMeshes)
      if (hits.length > 0) {
        const targetObj = hits[0].object
        if (targetObj !== hoveredMesh) {
          hoveredMesh = targetObj
          document.body.style.cursor = 'pointer'
          const data = targetObj.userData
          const up = upstreamMap.get(data.id) || []
          const down = downstreamMap.get(data.id) || []
          setHoveredNodeInfo({
            id: data.id,
            type: data.type,
            tier: data.tier,
            hops: data.hops,
            upstreamCount: up.length,
            downstreamCount: down.length,
          })

          // Highlight connected conduits
          edgeTwinList.forEach(e => {
            const isConnected = e.source === data.id || e.target === data.id
            const mat = e.tube.material as THREE.MeshStandardMaterial
            if (isConnected) {
              mat.emissiveIntensity = 1.4
              mat.opacity = 1.0
            } else {
              mat.emissiveIntensity = e.isExplain ? 0.85 : 0.25
              mat.opacity = e.isExplain ? 0.8 : 0.35
            }
          })
        }
      } else if (hoveredMesh) {
        hoveredMesh = null
        document.body.style.cursor = 'default'
        setHoveredNodeInfo(null)
        // Reset edge intensities
        edgeTwinList.forEach(e => {
          const mat = e.tube.material as THREE.MeshStandardMaterial
          mat.emissiveIntensity = e.isExplain ? 0.85 : 0.35
          mat.opacity = e.isExplain ? 0.95 : 0.65
        })
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

  // Sync auto-rotate
  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.autoRotate = currentAutoRotate
      controlsRef.current.autoRotateSpeed = 1.0
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
      {/* Top Model Controls Bar with Figma Salt & Pepper Palette */}
      <div
        className="model-viewer-controls-bar"
        style={{
          position: 'absolute',
          top: 14,
          left: 14,
          right: 14,
          zIndex: 10,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          pointerEvents: 'none',
        }}
      >
        <div style={{ display: 'flex', gap: 8, pointerEvents: 'auto' }}>
          {/* Auto-Rotate Orbital Motion Toggle */}
          <button
            type="button"
            onClick={() => setCurrentAutoRotate(!currentAutoRotate)}
            title="Toggle Continuous Progressive 3D Orbit"
            style={{
              padding: '6px 14px',
              fontSize: '12px',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: currentAutoRotate ? 'rgba(56, 189, 248, 0.22)' : 'rgba(18, 19, 23, 0.85)',
              borderColor: currentAutoRotate ? '#38bdf8' : 'rgba(255, 255, 255, 0.12)',
              color: currentAutoRotate ? '#38bdf8' : '#f4f4f6',
              borderRadius: 8,
              border: '1px solid',
              cursor: 'pointer',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              transition: 'all 0.15s ease',
            }}
          >
            <RotateCw size={13} className={currentAutoRotate ? 'spin-slow' : ''} />
            <span>{currentAutoRotate ? 'Orbiting (3D Motion)' : 'Orbit Paused'}</span>
          </button>

          {/* Exposure Adjustment */}
          <button
            type="button"
            onClick={() => setCurrentExposure(prev => (prev >= 1.6 ? 0.8 : +(prev + 0.3).toFixed(1)))}
            title="Adjust WebGL HDR Exposure"
            style={{
              padding: '6px 14px',
              fontSize: '12px',
              fontWeight: 500,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: 'rgba(18, 19, 23, 0.85)',
              borderColor: 'rgba(255, 255, 255, 0.12)',
              color: '#f4f4f6',
              borderRadius: 8,
              border: '1px solid',
              cursor: 'pointer',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
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
              padding: '5px 12px',
              fontSize: '11px',
              fontWeight: 600,
              background: activePreset === 'origin' ? 'rgba(239, 68, 68, 0.25)' : 'rgba(18, 19, 23, 0.85)',
              borderColor: activePreset === 'origin' ? '#ef4444' : 'rgba(255, 255, 255, 0.10)',
              color: activePreset === 'origin' ? '#f87171' : '#d4d4d8',
              borderRadius: 6,
              border: '1px solid',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              backdropFilter: 'blur(14px)',
            }}
          >
            <Target size={11} color="#ef4444" /> Focus Origin
          </button>

          <button
            type="button"
            onClick={() => handlePreset('blast')}
            style={{
              padding: '5px 12px',
              fontSize: '11px',
              fontWeight: 600,
              background: activePreset === 'blast' ? 'rgba(56, 189, 248, 0.25)' : 'rgba(18, 19, 23, 0.85)',
              borderColor: activePreset === 'blast' ? '#38bdf8' : 'rgba(255, 255, 255, 0.10)',
              color: activePreset === 'blast' ? '#38bdf8' : '#d4d4d8',
              borderRadius: 6,
              border: '1px solid',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              backdropFilter: 'blur(14px)',
            }}
          >
            <Compass size={11} color="#38bdf8" /> Full Topology
          </button>

          <button
            type="button"
            onClick={() => handlePreset('top')}
            style={{
              padding: '5px 12px',
              fontSize: '11px',
              fontWeight: 600,
              background: activePreset === 'top' ? 'rgba(168, 85, 247, 0.25)' : 'rgba(18, 19, 23, 0.85)',
              borderColor: activePreset === 'top' ? '#a855f7' : 'rgba(255, 255, 255, 0.10)',
              color: activePreset === 'top' ? '#c084fc' : '#d4d4d8',
              borderRadius: 6,
              border: '1px solid',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              backdropFilter: 'blur(14px)',
            }}
          >
            <Box size={11} color="#c084fc" /> Top-Down
          </button>

          <button
            type="button"
            onClick={() => handlePreset('default')}
            style={{
              padding: '5px 12px',
              fontSize: '11px',
              fontWeight: 600,
              background: activePreset === 'default' ? 'rgba(255, 255, 255, 0.15)' : 'rgba(18, 19, 23, 0.85)',
              borderColor: activePreset === 'default' ? '#ffffff' : 'rgba(255, 255, 255, 0.10)',
              color: '#ffffff',
              borderRadius: 6,
              border: '1px solid',
              cursor: 'pointer',
              backdropFilter: 'blur(14px)',
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

      {/* Hover Hotspot Telemetry Card (Anchored Top-Left below controls) */}
      {hoveredNodeInfo && (
        <div
          style={{
            position: 'absolute',
            top: 60,
            left: 14,
            zIndex: 10,
            background: 'rgba(18, 19, 23, 0.92)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.18)',
            borderRadius: 10,
            padding: '10px 14px',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.6)',
            pointerEvents: 'none',
            minWidth: 180,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background:
                  hoveredNodeInfo.type === 'origin'
                    ? '#ef4444'
                    : hoveredNodeInfo.type === 'alerting'
                      ? '#f59e0b'
                      : hoveredNodeInfo.type === 'change'
                        ? '#a855f7'
                        : '#38bdf8',
                boxShadow: `0 0 8px ${
                  hoveredNodeInfo.type === 'origin' ? '#ef4444' : '#38bdf8'
                }`,
              }}
            />
            <strong style={{ color: '#ffffff', fontSize: 13, fontFamily: '"DM Sans", sans-serif' }}>
              {hoveredNodeInfo.id}
            </strong>
          </div>
          <div style={{ fontSize: 11, color: '#a1a1aa', lineHeight: 1.4 }}>
            <div>
              Role:{' '}
              <strong style={{ color: '#f4f4f6' }}>
                {hoveredNodeInfo.type === 'origin'
                  ? 'Root Cause Origin'
                  : hoveredNodeInfo.type === 'alerting'
                    ? 'Alerting Service'
                    : hoveredNodeInfo.type === 'change'
                      ? 'Suspect Change'
                      : 'Dependent Service'}
              </strong>
            </div>
            {hoveredNodeInfo.tier && (
              <div>
                Tier: <strong style={{ color: '#f4f4f6' }}>Tier {hoveredNodeInfo.tier}</strong>
              </div>
            )}
            <div>
              Dependencies: Upstream ({hoveredNodeInfo.upstreamCount}) &bull; Downstream (
              {hoveredNodeInfo.downstreamCount})
            </div>
            <div style={{ marginTop: 4, color: '#38bdf8', fontSize: 10, fontWeight: 600 }}>
              &rarr; Click node to inspect service profile
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Interactive3DViewer
