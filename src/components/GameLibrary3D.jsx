import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { Brush, Evaluator, SUBTRACTION } from 'three-bvh-csg'

function GameLibrary3D({ games = [] }) {
  const mountRef = useRef(null)
  const sceneRef = useRef(null)
  const cameraRef = useRef(null)
  const rendererRef = useRef(null)
  const cameraAngleRef = useRef(Math.PI) // Horizontal rotation angle - start at 180 degrees
  const cameraPitchRef = useRef(Math.PI) // Vertical rotation angle (pitch) - start at 180 degrees on X axis
  const isDraggingRef = useRef(false)
  const lastMouseXRef = useRef(0)
  const lastMouseYRef = useRef(0)
  const gameBoxesRef = useRef([]) // Store references to game boxes for interaction
  const boxEdgesRef = useRef([]) // Store references to edge highlights
  const holeMeshesRef = useRef([]) // Store references to hole meshes for click/hover detection
  const holeEdgesRef = useRef([]) // Store references to hole edge highlights
  const raycasterRef = useRef(new THREE.Raycaster())
  const mouseRef = useRef(new THREE.Vector2())
  const hoveredHoleRef = useRef(null) // Currently hovered hole

  useEffect(() => {
    if (!mountRef.current) return

    // Scene setup
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0xf8f8f8) // Soft white background
    sceneRef.current = scene

    // Camera setup - very close to wall with wide FOV
    const camera = new THREE.PerspectiveCamera(
      34, // Wider FOV to see more of the wall
      mountRef.current.clientWidth / mountRef.current.clientHeight,
      0.1,
      1000
    )
    camera.position.set(0, 2, 0.00) // Very very close to the wall
    camera.lookAt(0, 3, 0) // Look at center of tall wall
    cameraRef.current = camera

    // Renderer setup with better quality
    const renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      alpha: false,
      powerPreference: "high-performance"
    })
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)) // Cap pixel ratio for performance
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.2 // Slightly brighter
    mountRef.current.appendChild(renderer.domElement)
    rendererRef.current = renderer

    // Enhanced lighting - well lit room with window as main source
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.0) // Increased for brighter ceiling
    scene.add(ambientLight)

    // Main directional light from window (top, slanted ceiling area)
    const mainLight = new THREE.DirectionalLight(0xb3d9ff, 1.5) // Sky blue tint from window
    mainLight.position.set(0, 12, 2) // Above, coming from window area
    mainLight.castShadow = true
    mainLight.shadow.mapSize.width = 4096
    mainLight.shadow.mapSize.height = 4096
    mainLight.shadow.camera.near = 0.5
    mainLight.shadow.camera.far = 25
    mainLight.shadow.camera.left = -10
    mainLight.shadow.camera.right = 10
    mainLight.shadow.camera.top = 8
    mainLight.shadow.camera.bottom = -3
    mainLight.shadow.bias = -0.0001
    mainLight.shadow.normalBias = 0.02
    mainLight.shadow.radius = 8 // Softer shadows
    mainLight.shadow.bias = -0.0005 // Reduce shadow artifacts
    scene.add(mainLight)

    // Additional fill light to ensure well-lit room
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.6)
    fillLight.position.set(-2, 4, 3)
    fillLight.castShadow = false
    scene.add(fillLight)

    // Hemisphere light for natural sky/ground lighting
    const hemiLight = new THREE.HemisphereLight(0xb3d9ff, 0xffffff, 0.4)
    hemiLight.position.set(0, 12, 0)
    scene.add(hemiLight)

    // Floor - dark chestnut hardwood
    const floorTexture = createChestnutHardwoodTexture()
    const floorNormalMap = createHardwoodNormalMap()
    const floorMaterial = new THREE.MeshStandardMaterial({
      map: floorTexture,
      normalMap: floorNormalMap,
      normalScale: new THREE.Vector2(0.6, 0.6),
      roughness: 0.7,
      metalness: 0.0
    })
    const floorGeometry = new THREE.PlaneGeometry(25, 25)
    const floor = new THREE.Mesh(floorGeometry, floorMaterial)
    floor.rotation.x = -Math.PI / 2
    floor.position.y = 0
    floor.receiveShadow = true
    scene.add(floor)

    // Baseboards
    const baseboardMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.3,
      metalness: 0.0
    })
    const baseboardHeight = 0.1
    const baseboardDepth = 0.05
    
    // Back wall baseboard
    const backBaseboard = new THREE.Mesh(
      new THREE.BoxGeometry(12, baseboardHeight, baseboardDepth),
      baseboardMaterial
    )
    backBaseboard.position.set(0, baseboardHeight / 2, -10)
    backBaseboard.receiveShadow = true
    scene.add(backBaseboard)

    // Left wall baseboard
    const leftBaseboard = new THREE.Mesh(
      new THREE.BoxGeometry(20, baseboardHeight, baseboardDepth),
      baseboardMaterial
    )
    leftBaseboard.rotation.y = Math.PI / 2
    leftBaseboard.position.set(-6, baseboardHeight / 2, 0)
    leftBaseboard.receiveShadow = true
    scene.add(leftBaseboard)

    // Right wall baseboard
    const rightBaseboard = new THREE.Mesh(
      new THREE.BoxGeometry(20, baseboardHeight, baseboardDepth),
      baseboardMaterial
    )
    rightBaseboard.rotation.y = -Math.PI / 2
    rightBaseboard.position.set(6, baseboardHeight / 2, 0)
    rightBaseboard.receiveShadow = true
    scene.add(rightBaseboard)

    // Walls - creamy white
    const wallMaterial = new THREE.MeshStandardMaterial({
      color: "#fffbf6", // Creamy white (same as ceiling)
      roughness: 0.6,
      metalness: 0.0
    })

    // Back wall - simple test: 1 wall with 1 square hole in center
    const wallWidth = 12
    const wallHeight = 10
    const wallThickness = 0.8 // Thick wall for CSG operations
    const wallFrontZ = -10 // Front face of wall

    // Left wall (plain, no shelves) - taller
    const leftWallGeometry = new THREE.PlaneGeometry(20, wallHeight)
    const leftWall = new THREE.Mesh(leftWallGeometry, wallMaterial)
    leftWall.rotation.y = Math.PI / 2
    leftWall.position.set(-wallWidth / 2, wallHeight / 2, 0)
    leftWall.receiveShadow = true
    scene.add(leftWall)

    // Right wall (plain, no shelves) - taller
    const rightWallGeometry = new THREE.PlaneGeometry(20, wallHeight)
    const rightWall = new THREE.Mesh(rightWallGeometry, wallMaterial)
    rightWall.rotation.y = -Math.PI / 2
    rightWall.position.set(wallWidth / 2, wallHeight / 2, 0)
    rightWall.receiveShadow = true
    scene.add(rightWall)

    // Flat ceiling - white cream/eggshell color
    const ceilingMaterial = new THREE.MeshStandardMaterial({
      color: "#fffbf6", // White cream/eggshell (neutral warm white, no green)
      emissive: "#fffbf6", // Emissive to make it appear brighter
      emissiveIntensity: 0.3, // Subtle glow to appear whiter
      roughness: 0.6,
      metalness: 0.0
    })
    
    const ceilingHeight = 10
    const ceilingDepth = 20 // Depth of the ceiling
    const ceilingWidth = 12 // Matching wall width
    
    // Single flat ceiling
    const ceilingGeometry = new THREE.PlaneGeometry(ceilingWidth, ceilingDepth)
    const ceiling = new THREE.Mesh(ceilingGeometry, ceilingMaterial)
    ceiling.rotation.x = Math.PI / 2 // Horizontal
    ceiling.position.y = ceilingHeight
    ceiling.position.z = -ceilingDepth / 2
    ceiling.position.x = 0 // Centered
    scene.add(ceiling)

    // Window in the top left corner of the ceiling, tilted to match ceiling
    const baseWindowWidth = 4
    const baseWindowHeight = 3
    const windowWidth = baseWindowWidth * 1.5 // 6
    const windowHeight = baseWindowHeight * 1.5 // 4.5
    const windowDepth = 0.3
    const frameThickness = 0.15
    const padding = 1.5 // Padding from ceiling edge
    
    // Window frame - rich wooden brown
    const windowFrameMaterial = new THREE.MeshStandardMaterial({
      color: 0x8b4513, // Rich wooden brown (saddle brown - warm, rich wood tone)
      roughness: 0.7,
      metalness: 0.0
    })
    
    // Window positioned in top left corner, flat on the ceiling
    const ceilingTopEdge = -10 // Top edge of ceiling (furthest from camera)
    const leftWallX = -6 // Left wall position
    const windowX = leftWallX + padding + windowWidth / 2 // Padding from left edge
    const windowZ = ceilingTopEdge + padding + windowHeight / 2 // Padding from top edge
    const windowY = ceilingHeight - 0.15 // Slightly below ceiling surface
    
    // Top frame (along X axis, at positive Z edge - "top" from camera view)
    const topFrame = new THREE.Mesh(
      new THREE.BoxGeometry(windowWidth + frameThickness * 2, frameThickness, windowDepth),
      windowFrameMaterial
    )
    topFrame.position.set(windowX, windowY, windowZ + windowHeight / 2 + frameThickness / 2)
    topFrame.rotation.x = Math.PI / 2 // Horizontal, flat
    scene.add(topFrame)
    
    // Bottom frame (along X axis, at negative Z edge - "bottom" from camera view)
    const bottomFrame = new THREE.Mesh(
      new THREE.BoxGeometry(windowWidth + frameThickness * 2, frameThickness, windowDepth),
      windowFrameMaterial
    )
    bottomFrame.position.set(windowX, windowY, windowZ - windowHeight / 2 - frameThickness / 2)
    bottomFrame.rotation.x = Math.PI / 2 // Horizontal, flat
    scene.add(bottomFrame)
    
    // Left frame (along Z axis, at negative X edge)
    const leftFrame = new THREE.Mesh(
      new THREE.BoxGeometry(frameThickness, windowHeight + frameThickness * 2, windowDepth),
      windowFrameMaterial
    )
    leftFrame.position.set(windowX - windowWidth / 2 - frameThickness / 2, windowY, windowZ)
    leftFrame.rotation.x = Math.PI / 2 // Horizontal, flat
    scene.add(leftFrame)
    
    // Right frame (along Z axis, at positive X edge)
    const rightFrame = new THREE.Mesh(
      new THREE.BoxGeometry(frameThickness, windowHeight + frameThickness * 2, windowDepth),
      windowFrameMaterial
    )
    rightFrame.position.set(windowX + windowWidth / 2 + frameThickness / 2, windowY, windowZ)
    rightFrame.rotation.x = Math.PI / 2 // Horizontal, flat
    scene.add(rightFrame)

    // Window glass with blue sky - flat on ceiling
    const skyTexture = createSkyTexture()
    const windowGlassMaterial = new THREE.MeshStandardMaterial({
      map: skyTexture,
      emissive: 0x87ceeb,
      emissiveIntensity: 0.3,
      transparent: false,
      roughness: 0.1,
      metalness: 0.0
    })
    const windowGlass = new THREE.Mesh(
      new THREE.PlaneGeometry(windowWidth, windowHeight),
      windowGlassMaterial
    )
    windowGlass.position.set(windowX, windowY, windowZ)
    windowGlass.rotation.x = Math.PI / 2 // Horizontal, flat
    scene.add(windowGlass)

    // Create the main wall as a thick box (Brush for CSG)
    const wallGeometry = new THREE.BoxGeometry(wallWidth, wallHeight, wallThickness)
    const wallBrush = new Brush(wallGeometry, wallMaterial)
    wallBrush.position.set(0, wallHeight / 2, wallFrontZ + wallThickness / 2)
    wallBrush.updateMatrixWorld()
    
    // Define multiple holes with various widths, heights, and Y positions
    const baseHoleHeight = 1.0 // Base height
    const holeHeightVariation = 0.3 // Variation range (±0.15 from base)
    const holeDepth = wallThickness + 0.1 // Slightly deeper than wall thickness
    const minHeightFromGround = 2.0 // Minimum distance from ground (2 box heights)
    const minSpacing = 0.3 // Minimum spacing between boxes
    
    // Array of holes: { x, y, width, height }
    // Max 4 holes per row, ensure they're not too close to edges
    // Wall width is 12, so keep holes within -5.5 to 5.5 (with margin)
    const holes = [
      // Row 1 (around y = 2.5-3.5) - max 4 holes
      { x: -4.5, y: 2.8, width: 1.8, height: 0.95 },
      { x: -1.5, y: 3.0, width: 1.9, height: 1.1 },
      { x: 1.5, y: 2.9, width: 1.7, height: 1.05 },
      { x: 4.2, y: 3.1, width: 1.6, height: 0.92 },
      
      // Row 2 (around y = 4-5) - max 4 holes
      { x: -4.2, y: 4.3, width: 1.8, height: 1.12 },
      { x: -1.2, y: 4.5, width: 2.0, height: 0.96 },
      { x: 1.8, y: 4.4, width: 1.6, height: 1.08 },
      { x: 4.5, y: 4.6, width: 1.5, height: 0.94 },
      
      // Row 3 (around y = 5.5-6.5) - max 4 holes
      { x: -4.5, y: 6.0, width: 1.9, height: 1.02 },
      { x: -1.5, y: 6.2, width: 1.7, height: 0.98 },
      { x: 1.5, y: 6.1, width: 1.8, height: 1.06 },
      { x: 4.2, y: 6.3, width: 1.6, height: 0.99 },
      
      // Row 4 (around y = 7-8) - max 4 holes
      { x: -4.2, y: 7.5, width: 1.9, height: 1.09 },
      { x: -1.2, y: 7.7, width: 2.0, height: 0.91 },
      { x: 1.8, y: 7.6, width: 1.5, height: 1.13 },
      { x: 4.5, y: 7.8, width: 1.7, height: 0.97 },
    ]
    
    // Ensure minimum spacing between holes (0.3 units minimum) and prevent edge clipping
    // Wall width is 12, so keep holes within safe bounds (-5.5 to 5.5)
    const wallLeftEdge = -wallWidth / 2
    const wallRightEdge = wallWidth / 2
    const safeMargin = 0.5 // Safe margin from wall edges
    
    for (let i = 0; i < holes.length; i++) {
      for (let j = i + 1; j < holes.length; j++) {
        const hole1 = holes[i]
        const hole2 = holes[j]
        
        // Calculate bounding boxes
        const hole1Left = hole1.x - hole1.width / 2
        const hole1Right = hole1.x + hole1.width / 2
        const hole1Bottom = hole1.y - hole1.height / 2
        const hole1Top = hole1.y + hole1.height / 2
        
        const hole2Left = hole2.x - hole2.width / 2
        const hole2Right = hole2.x + hole2.width / 2
        const hole2Bottom = hole2.y - hole2.height / 2
        const hole2Top = hole2.y + hole2.height / 2
        
        // Calculate horizontal distance
        const horizontalDist = Math.max(
          hole1Left - hole2Right, // hole1 is to the left
          hole2Left - hole1Right  // hole2 is to the left
        )
        
        // Calculate vertical distance
        const verticalDist = Math.max(
          hole1Bottom - hole2Top, // hole1 is below
          hole2Bottom - hole1Top  // hole2 is below
        )
        
        // If holes overlap or are too close, adjust position
        if (horizontalDist < minSpacing && verticalDist < minSpacing) {
          // Holes are too close - move hole2
          if (horizontalDist < minSpacing) {
            // Adjust X position
            if (hole1.x < hole2.x) {
              hole2.x = hole1Right + minSpacing + hole2.width / 2
            } else {
              hole2.x = hole1Left - minSpacing - hole2.width / 2
            }
          }
          if (verticalDist < minSpacing) {
            // Adjust Y position
            if (hole1.y < hole2.y) {
              hole2.y = hole1Top + minSpacing + hole2.height / 2
            } else {
              hole2.y = hole1Bottom - minSpacing - hole2.height / 2
            }
          }
        }
      }
      
      // Ensure hole doesn't go beyond wall edges
      const hole = holes[i]
      const holeLeft = hole.x - hole.width / 2
      const holeRight = hole.x + hole.width / 2
      
      if (holeLeft < wallLeftEdge + safeMargin) {
        hole.x = wallLeftEdge + safeMargin + hole.width / 2
      }
      if (holeRight > wallRightEdge - safeMargin) {
        hole.x = wallRightEdge - safeMargin - hole.width / 2
      }
    }
    
    // Perform CSG subtraction for each hole
    let backWall = null
    try {
      const evaluator = new Evaluator()
      let result = wallBrush
      
      // Subtract each hole from the wall
      holes.forEach((hole, index) => {
        // Use RoundedBoxGeometry for rounded edges
        // Parameters: width, height, depth, segments, radius
        const cornerRadius = 0.15 // Radius for rounded corners
        const segments = 3 // Number of segments for the rounded corners
        const holeGeometry = new RoundedBoxGeometry(
          hole.width, 
          hole.height, // Use individual height for each hole
          holeDepth, 
          segments, 
          cornerRadius
        )
        const holeBrush = new Brush(holeGeometry)
        holeBrush.position.set(hole.x, hole.y, wallFrontZ + holeDepth / 2)
        holeBrush.updateMatrixWorld()
        
        // Subtract this hole from the current result
        result = evaluator.evaluate(result, holeBrush, SUBTRACTION)
        console.log(`Hole ${index + 1} subtracted, x: ${hole.x}, y: ${hole.y}, width: ${hole.width}`)
      })
      
      if (result && result.geometry) {
        // Set material
        result.material = wallMaterial.clone()
        
        // Check if geometry has vertices
        const position = result.geometry.attributes.position
        if (position && position.count > 0) {
          // Recalculate normals
          result.geometry.computeVertexNormals()
          
          result.castShadow = true
          result.receiveShadow = true
          backWall = result
          console.log('CSG result is valid, vertices:', position.count, 'holes:', holes.length)
        } else {
          console.error('CSG result has no vertices, using fallback')
        }
      }
    } catch (error) {
      console.error('CSG failed:', error)
    }
    
    // Fallback: simple wall without hole
    if (!backWall) {
      console.log('Using fallback simple wall')
      backWall = new THREE.Mesh(
        new THREE.PlaneGeometry(wallWidth, wallHeight),
        wallMaterial
      )
      backWall.position.set(0, wallHeight / 2, wallFrontZ)
      backWall.receiveShadow = true
    }
    
    // Add wall to scene
    scene.add(backWall)
    console.log('Wall added to scene, visible:', backWall.visible, 'position:', backWall.position)

    // Create clickable/hoverable meshes for each hole
    holeMeshesRef.current = []
    holeEdgesRef.current = []
    
    holes.forEach((hole) => {
      // Create an invisible plane for click/hover detection
      // PlaneGeometry by default faces the +Z direction, which is correct for our wall
      const holePlaneGeometry = new THREE.PlaneGeometry(hole.width, hole.height)
      const holePlaneMaterial = new THREE.MeshBasicMaterial({
        visible: false, // Invisible but still clickable
        side: THREE.DoubleSide // Double-sided to catch rays from both directions
      })
      const holePlane = new THREE.Mesh(holePlaneGeometry, holePlaneMaterial)
      // Position at the front face of the wall (where holes are visible)
      // Camera is at z=0 looking toward negative Z, so planes need to face negative Z
      holePlane.position.set(hole.x, hole.y, wallFrontZ + 0.1) // Forward from wall surface
      holePlane.rotation.y = Math.PI // Rotate 180 degrees to face the camera (negative Z direction)
      holePlane.userData.hole = hole // Store hole data
      holePlane.userData.isHole = true // Mark as hole for debugging
      scene.add(holePlane)
      holeMeshesRef.current.push(holePlane)
      
      console.log('Created hole mesh for hole at:', hole.x, hole.y, 'width:', hole.width, 'height:', hole.height, 'z:', wallFrontZ + 0.1)
      
      // Create edge highlight for hover effect
      const holeEdgesGeometry = new THREE.EdgesGeometry(new THREE.PlaneGeometry(hole.width, hole.height))
      const holeEdgesMaterial = new THREE.LineBasicMaterial({
        color: 0x00ff00, // Green highlight
        linewidth: 3,
        visible: false // Hidden by default, shown on hover
      })
      const holeEdges = new THREE.LineSegments(holeEdgesGeometry, holeEdgesMaterial)
      holeEdges.position.copy(holePlane.position)
      holeEdges.rotation.copy(holePlane.rotation) // Same rotation as plane
      holeEdges.userData.hole = hole
      scene.add(holeEdges)
      holeEdgesRef.current.push(holeEdges)
    })
    
    console.log('Total hole meshes created:', holeMeshesRef.current.length)

    // Add wooden ledges at the bottom of each hole
    // Use light IKEA-style brown
    const ledgeMaterial = new THREE.MeshStandardMaterial({
      color: 0xd4a574, // Light IKEA brown (beige/tan wood color)
      roughness: 0.7,
      metalness: 0.0
    })
    
    holes.forEach((hole) => {
      const ledgeThickness = 0.05 // Thickness of the ledge
      const ledgeProtrusion = 0.08 // How much the ledge protrudes from the wall
      const ledgeDepth = holeDepth + ledgeProtrusion // Ledge extends into the hole and protrudes
      
      // Create rounded ledge to match the rounded hole
      const ledgeGeometry = new RoundedBoxGeometry(
        hole.width,
        ledgeThickness,
        ledgeDepth,
        3, // segments
        0.15 // corner radius (same as holes)
      )
      
      const ledge = new THREE.Mesh(ledgeGeometry, ledgeMaterial)
      // Position at the bottom of the hole, protruding slightly
      ledge.position.set(
        hole.x,
        hole.y - hole.height / 2, // Bottom of the hole (using individual height)
        wallFrontZ + ledgeDepth / 2 - ledgeProtrusion / 2 // Slightly forward to protrude
      )
      ledge.castShadow = true
      ledge.receiveShadow = true
      scene.add(ledge)
    })

    // Create PS5-style game boxes and place them on shelves
    if (games && games.length > 0) {
      const ps5Blue = 0x003087 // PS5 blue color
      // PS5 game box dimensions - 2.2x bigger on every axis
      const boxWidth = 0.55 // Width of game box (0.25 * 2.2)
      const boxHeight = 0.77 // Height of game box (0.35 * 2.2)
      const boxDepth = 0.0264 // Depth (thickness) of game box (0.012 * 2.2)
      // Boxes need spacing between them, not padding from edges
      const boxSpacing = 0.25 // Spacing between boxes (increased significantly to prevent ledge clipping)
      const boxPadding = 0.05 // Minimal padding from hole edges (just to prevent touching)
      const topPadding = 0.05 // Minimal padding at the top
      const ledgeProtrusion = 0.08 // How much the ledge protrudes (needed for spacing calculation)
      
      
      // Store boxes for interaction
      gameBoxesRef.current = []
      boxEdgesRef.current = [] // Initialize edge highlights array
      
      // Track how many boxes are in each hole
      const boxesPerHole = Array(holes.length).fill(0)
      
      // Create game boxes and distribute them across available holes
      games.forEach((game, gameIndex) => {
        // Find a suitable hole for this game (round-robin distribution)
        const holeIndex = gameIndex % holes.length
        const hole = holes[holeIndex]
        const boxesInThisHole = boxesPerHole[holeIndex]
        
        // Calculate how many boxes can fit horizontally in this hole
        // Account for extra spacing to prevent ledge clipping
        const availableWidth = hole.width - (boxPadding * 2)
        const boxesPerRow = Math.max(1, Math.floor(availableWidth / (boxWidth + boxSpacing)))
        
        // Calculate row and column for this box
        const rowIndex = Math.floor(boxesInThisHole / boxesPerRow)
        const colIndex = boxesInThisHole % boxesPerRow
        
        // Calculate position within the hole with extra spacing
        const startX = hole.x - (hole.width / 2) + boxPadding + (boxWidth / 2)
        const boxX = startX + colIndex * (boxWidth + boxSpacing)
        
        // Calculate Y position - boxes sit on the ledge
        // Add extra vertical spacing to account for ledge protrusion
        const ledgeTopY = hole.y - hole.height / 2 + 0.05 // Top of the ledge (ledge thickness is 0.05)
        const verticalSpacing = boxHeight + boxSpacing // Ensure enough space between boxes
        const boxYPosition = ledgeTopY + boxHeight / 2 + (rowIndex * verticalSpacing)
        
        // Make sure box fits within hole height (accounting for ledge, padding, and top spacing)
        const maxY = hole.y + (hole.height / 2) - boxPadding - topPadding
        if (boxYPosition + (boxHeight / 2) > maxY) {
          return // Skip if box doesn't fit
        }
        
        // Increment box count for this hole
        boxesPerHole[holeIndex]++
        
        // Create PS5-style game box
        const boxGeometry = new RoundedBoxGeometry(
          boxWidth,
          boxHeight,
          boxDepth,
          2, // segments for rounded corners
          0.005 // small corner radius
        )
        
        // Create materials array for different faces
        // Face order: right, left, top, bottom, front, back
        // PS5 translucent blue material
        const ps5MaterialProps = {
          color: ps5Blue,
          transparent: true,
          opacity: 0.85, // Translucent like PS5 cases
          roughness: 0.2,
          metalness: 0.1
        }
        
        const materials = [
          // Right face - side edge
          new THREE.MeshStandardMaterial(ps5MaterialProps),
          // Left face - side edge
          new THREE.MeshStandardMaterial(ps5MaterialProps),
          // Top face
          new THREE.MeshStandardMaterial(ps5MaterialProps),
          // Bottom face
          new THREE.MeshStandardMaterial(ps5MaterialProps),
          // Front face - game cover goes here
          new THREE.MeshStandardMaterial(ps5MaterialProps),
          // Back face
          new THREE.MeshStandardMaterial(ps5MaterialProps)
        ]
        
        const boxMesh = new THREE.Mesh(boxGeometry, materials)
        
        // Load game cover image if available and apply to front face (index 4)
        if (game.image) {
          const textureLoader = new THREE.TextureLoader()
          textureLoader.load(
            game.image,
            (texture) => {
              // Update the front face material (index 4) with the cover image
              materials[4] = new THREE.MeshStandardMaterial({
                map: texture,
                transparent: true,
                opacity: 0.9,
                roughness: 0.2,
                metalness: 0.1
              })
              boxMesh.material = materials // Update materials array
            },
            undefined,
            (error) => {
              console.warn('Failed to load game cover:', game.name, error)
            }
          )
        }
        
        // Position box on the ledge - front face should be visible
        // Box stands upright with front face showing (no rotation needed)
        boxMesh.position.set(
          boxX,
          boxYPosition,
          wallFrontZ + holeDepth / 2 + boxDepth / 2 + 0.01 // Position forward from back of hole
        )
        
        // No rotation - box stands normally with front face visible
        boxMesh.rotation.x = 0
        boxMesh.rotation.y = 0
        boxMesh.rotation.z = 0
        
        // Make sure box is visible
        boxMesh.visible = true
        boxMesh.updateMatrixWorld()
        
        boxMesh.castShadow = true
        boxMesh.receiveShadow = true
        
        // Store game data and rotation state on the mesh
        boxMesh.userData = {
          game: game,
          isRotating: false,
          targetRotationX: 0,
          currentRotationX: 0
        }
        
        // Create edge highlight for hover effect
        const edgesGeometry = new THREE.EdgesGeometry(boxGeometry)
        const edgesMaterial = new THREE.LineBasicMaterial({
          color: 0xffffff,
          linewidth: 2,
          visible: false // Hidden by default, shown on hover
        })
        const edges = new THREE.LineSegments(edgesGeometry, edgesMaterial)
        edges.position.copy(boxMesh.position)
        edges.rotation.copy(boxMesh.rotation)
        edges.userData.boxMesh = boxMesh // Link to parent box
        
        // Add to scene and store references
        scene.add(boxMesh)
        scene.add(edges)
        gameBoxesRef.current.push(boxMesh)
        boxEdgesRef.current.push(edges)
      })
    }

    // Mouse controls for horizontal and vertical rotation
    const handleMouseDown = (e) => {
      // Start camera dragging
      isDraggingRef.current = true
      lastMouseXRef.current = e.clientX
      lastMouseYRef.current = e.clientY
      if (mountRef.current) {
        mountRef.current.style.cursor = 'grabbing'
      }
    }

    const handleMouseMove = (e) => {
      // Only process hover if mouse is over the canvas
      const rect = rendererRef.current?.domElement.getBoundingClientRect()
      if (!rect) return
      
      const mouseX = e.clientX - rect.left
      const mouseY = e.clientY - rect.top
      
      // Check if mouse is within canvas bounds
      if (mouseX < 0 || mouseX > rect.width || mouseY < 0 || mouseY > rect.height) {
        // Mouse is outside canvas - hide highlights
        if (hoveredHoleRef.current) {
          hoveredHoleRef.current = null
          holeEdgesRef.current.forEach(edge => edge.visible = false)
          if (mountRef.current && !isDraggingRef.current) {
            mountRef.current.style.cursor = 'grab'
          }
        }
        if (!isDraggingRef.current) return
      }
      
      // Check for hover on holes (even when not dragging)
      if (holeMeshesRef.current.length > 0 && rendererRef.current && cameraRef.current) {
        // Calculate mouse position in normalized device coordinates relative to canvas
        mouseRef.current.x = (mouseX / rect.width) * 2 - 1
        mouseRef.current.y = -(mouseY / rect.height) * 2 + 1
        
        // Update raycaster
        raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current)
        
        // Check for intersections with hole meshes
        const intersects = raycasterRef.current.intersectObjects(holeMeshesRef.current, false)
        
        // Hide all hole edge highlights first
        holeEdgesRef.current.forEach(edge => {
          edge.visible = false
        })
        
        if (intersects.length > 0) {
          // Hovering over a hole - show edge highlight
          const hoveredHoleMesh = intersects[0].object
          const hoveredHole = hoveredHoleMesh.userData.hole
          hoveredHoleRef.current = hoveredHoleMesh
          
          console.log('Hovering over hole at:', hoveredHole.x, hoveredHole.y, 'distance:', intersects[0].distance)
          
          // Find and show the corresponding edge highlight
          const edgeHighlight = holeEdgesRef.current.find(edge => edge.userData.hole === hoveredHole)
          if (edgeHighlight) {
            edgeHighlight.visible = true
          }
          
          // Change cursor to pointer
          if (mountRef.current && !isDraggingRef.current) {
            mountRef.current.style.cursor = 'pointer'
          }
        } else {
          // Not hovering over any hole
          if (hoveredHoleRef.current) {
            console.log('Stopped hovering over hole')
            hoveredHoleRef.current = null
          }
          if (mountRef.current && !isDraggingRef.current) {
            mountRef.current.style.cursor = 'grab'
          }
        }
      }
      
      if (!isDraggingRef.current) return
      
      const deltaX = e.clientX - lastMouseXRef.current
      const deltaY = e.clientY - lastMouseYRef.current
      const sensitivity = 0.004
      
      // Horizontal rotation - constrained to ±30 degrees
      cameraAngleRef.current += deltaX * sensitivity
      const maxAngle = (30 * Math.PI)// Convert 30 degrees to radians
      cameraAngleRef.current = Math.max(-maxAngle, Math.min(maxAngle, cameraAngleRef.current))
      
      // Vertical rotation (pitch) - no constraints, free rotation
      cameraPitchRef.current -= deltaY * sensitivity // Negative for natural up/down
      
      lastMouseXRef.current = e.clientX
      lastMouseYRef.current = e.clientY
    }

    const handleMouseUp = () => {
      isDraggingRef.current = false
      if (mountRef.current) {
        mountRef.current.style.cursor = 'grab'
      }
    }

    // Touch controls for mobile
    const handleTouchStart = (e) => {
      if (e.touches.length === 1) {
        isDraggingRef.current = true
        lastMouseXRef.current = e.touches[0].clientX
        lastMouseYRef.current = e.touches[0].clientY
      }
    }

    const handleTouchMove = (e) => {
      if (!isDraggingRef.current || e.touches.length !== 1) return
      
      const deltaX = e.touches[0].clientX - lastMouseXRef.current
      const deltaY = e.touches[0].clientY - lastMouseYRef.current
      const sensitivity = 0.004
      
      // Horizontal rotation - constrained to ±30 degrees
      cameraAngleRef.current += deltaX * sensitivity
      const maxAngle = (30 * Math.PI) // Convert 30 degrees to radians
      cameraAngleRef.current = Math.max(-maxAngle, Math.min(maxAngle, cameraAngleRef.current))
      
      // Vertical rotation (pitch) - no constraints, free rotation
      cameraPitchRef.current -= deltaY * sensitivity // Negative for natural up/down
      
      lastMouseXRef.current = e.touches[0].clientX
      lastMouseYRef.current = e.touches[0].clientY
    }

    const handleTouchEnd = () => {
      isDraggingRef.current = false
      if (mountRef.current) {
        mountRef.current.style.cursor = 'grab'
      }
    }

    // Attach events only to the canvas element, not the window
    const handleMouseLeave = () => {
      // Hide highlights when mouse leaves canvas
      if (hoveredHoleRef.current) {
        hoveredHoleRef.current = null
        holeEdgesRef.current.forEach(edge => edge.visible = false)
        if (mountRef.current) {
          mountRef.current.style.cursor = 'grab'
        }
      }
    }
    
    renderer.domElement.addEventListener('mousedown', handleMouseDown)
    renderer.domElement.addEventListener('mousemove', handleMouseMove)
    renderer.domElement.addEventListener('mouseup', handleMouseUp)
    renderer.domElement.addEventListener('mouseleave', handleMouseLeave)
    renderer.domElement.addEventListener('touchstart', handleTouchStart)
    renderer.domElement.addEventListener('touchmove', handleTouchMove)
    renderer.domElement.addEventListener('touchend', handleTouchEnd)

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate)

      // Update hole edge highlights to follow their hole meshes
      holeEdgesRef.current.forEach(edge => {
        if (edge.userData.hole) {
          const hole = edge.userData.hole
          edge.position.set(hole.x, hole.y, wallFrontZ + 0.01)
        }
      })
      
      // Update camera rotation (horizontal and vertical)
      const radius = 0.05 // Very close to wall, minimal movement
      const baseCameraY = 2 // Base height
      const cameraY = baseCameraY
      
      camera.position.x = Math.sin(cameraAngleRef.current) * radius
      camera.position.z = 0.05 + Math.cos(cameraAngleRef.current) * 0.02
      camera.position.y = cameraY
      
      // Calculate look-at point based on pitch
      // When starting at Math.PI (180 degrees), we need to invert the pitch calculation
      // relativePitch of 0 should look straight ahead at the wall
      const relativePitch = cameraPitchRef.current - Math.PI
      const lookDistance = 5
      const lookX = Math.sin(cameraAngleRef.current) * lookDistance
      const lookZ = Math.cos(cameraAngleRef.current) * lookDistance
      // Invert the Y calculation since we start at 180 degrees
      const lookY = cameraY - Math.tan(relativePitch) * lookDistance
      
      camera.lookAt(lookX, lookY, lookZ)

      renderer.render(scene, camera)
    }
    animate()

    // Handle window resize
    const handleResize = () => {
      if (!mountRef.current) return
      
      camera.aspect = mountRef.current.clientWidth / mountRef.current.clientHeight
      camera.updateProjectionMatrix()
      renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight)
    }
    window.addEventListener('resize', handleResize)

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize)
      renderer.domElement.removeEventListener('mousedown', handleMouseDown)
      renderer.domElement.removeEventListener('mousemove', handleMouseMove)
      renderer.domElement.removeEventListener('mouseup', handleMouseUp)
      renderer.domElement.removeEventListener('mouseleave', handleMouseLeave)
      renderer.domElement.removeEventListener('touchstart', handleTouchStart)
      renderer.domElement.removeEventListener('touchmove', handleTouchMove)
      renderer.domElement.removeEventListener('touchend', handleTouchEnd)
      
      if (mountRef.current && renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement)
      }
      
      // Dispose of geometries and materials
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh || object instanceof THREE.LineSegments) {
          object.geometry?.dispose()
          if (Array.isArray(object.material)) {
            object.material.forEach(material => {
              material.map?.dispose()
              material.normalMap?.dispose()
              material.dispose()
            })
          } else {
            object.material.map?.dispose()
            object.material.normalMap?.dispose()
            object.material.dispose()
          }
        }
      })
      
      // Clear refs
      gameBoxesRef.current = []
      boxEdgesRef.current = []
      holeMeshesRef.current = []
      holeEdgesRef.current = []
      
      renderer.dispose()
    }
  }, [games])

  return (
    <div 
      ref={mountRef} 
      className="w-full h-[500px] md:h-[600px] rounded-xl overflow-hidden border border-gray-700 mt-8"
      style={{ cursor: 'grab' }}
    />
  )
}

// Helper function to create dark chestnut hardwood floor texture with vertical planks
function createChestnutHardwoodTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 2048
  canvas.height = 1024
  const ctx = canvas.getContext('2d')

  // Dark chestnut base color
  ctx.fillStyle = '#4a2d1f'
  ctx.fillRect(0, 0, 2048, 1024)

  // Vertical plank dimensions (planks run top to bottom)
  const plankWidth = 80 // Width of each vertical plank
  const gapWidth = 0.5 // Very thin gap between planks
  
  // Very subtle color variations - all very close dark chestnut shades
  const baseChestnut = '#4a2d1f'
  const chestnut1 = '#4b2e20' // Very slightly lighter
  const chestnut2 = '#492c1e' // Very slightly darker
  const chestnut3 = '#4c2f21' // Very slightly lighter
  const chestnut4 = '#482b1d' // Very slightly darker
  const chestnut5 = '#4d3022' // Very slightly lighter
  
  const colors = [baseChestnut, chestnut1, chestnut2, chestnut3, chestnut4, chestnut5]

  // Create vertical planks (continuous stripes that stop and start)
  // Track color per column so consecutive planks in same column have same color
  const columnColors = new Map()
  let currentX = 0
  let columnIndex = 0
  
  while (currentX < 2048) {
    let currentY = 0
    let plankInColumn = 0
    
    // Fill entire column with planks
    while (currentY < 1024) {
      // Each plank has varying length (to show individual planks)
      const plankLength = 150 + Math.random() * 250 // Vary plank length
      const plankStartY = currentY
      const plankEndY = Math.min(plankStartY + plankLength, 1024)
      const actualPlankLength = plankEndY - plankStartY
      
      // Use same color for all planks in this column
      if (!columnColors.has(columnIndex)) {
        // Assign a color to this column
        const colorIndex = columnIndex % colors.length
        columnColors.set(columnIndex, colors[colorIndex])
      }
      const plankColor = columnColors.get(columnIndex)
      
      // Draw the vertical plank
      ctx.fillStyle = plankColor
      ctx.fillRect(currentX, plankStartY, plankWidth, actualPlankLength)

      // Add very subtle horizontal wood grain (since planks are vertical)
      ctx.strokeStyle = plankColor
      ctx.globalAlpha = 0.15 // Very subtle grain
      ctx.lineWidth = 0.3
      const grainCount = Math.floor(actualPlankLength / 30)
      for (let g = 0; g < grainCount; g++) {
        const grainY = plankStartY + (g * 30)
        ctx.beginPath()
        ctx.moveTo(currentX, grainY)
        ctx.lineTo(currentX + plankWidth, grainY)
        ctx.stroke()
      }
      ctx.globalAlpha = 1.0 // Reset alpha

      // Move to next plank in this column
      currentY = plankEndY + gapWidth
      plankInColumn++
    }

    // Add very thin gap line between columns (vertical line)
    ctx.strokeStyle = '#3d2418' // Darker for the gap
    ctx.lineWidth = 0.5
    ctx.beginPath()
    ctx.moveTo(currentX + plankWidth, 0)
    ctx.lineTo(currentX + plankWidth, 1024)
    ctx.stroke()

    // Move to next column
    currentX += plankWidth + gapWidth
    columnIndex++
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(6, 3)
  texture.anisotropy = 16

  return texture
}

// Create normal map for hardwood floor (vertical planks)
function createHardwoodNormalMap() {
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 256
  const ctx = canvas.getContext('2d')

  // Create a subtle normal map pattern for vertical planks
  const imageData = ctx.createImageData(512, 256)
  for (let y = 0; y < 256; y++) {
    for (let x = 0; x < 512; x++) {
      const index = (y * 512 + x) * 4
      // Normal map: R=X, G=Y, B=Z (all normalized to 0-255)
      // For subtle wood grain effect - horizontal grain (since planks are vertical)
      const grain = Math.sin(y * 0.1) * 0.06 + Math.sin(x * 0.02) * 0.03
      const value = 128 + grain * 30
      imageData.data[index] = value     // R
      imageData.data[index + 1] = value // G
      imageData.data[index + 2] = 255   // B (pointing up)
      imageData.data[index + 3] = 255   // A
    }
  }
  ctx.putImageData(imageData, 0, 0)

  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(8, 4)

  return texture
}

// Create sky texture for window
function createSkyTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 256
  const ctx = canvas.getContext('2d')

  // Create gradient sky
  const gradient = ctx.createLinearGradient(0, 0, 0, 256)
  gradient.addColorStop(0, '#87ceeb') // Sky blue at top
  gradient.addColorStop(0.5, '#b0e0e6') // Lighter blue in middle
  gradient.addColorStop(1, '#e0f6ff') // Very light blue at bottom
  
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, 512, 256)

  // Add subtle clouds
  ctx.fillStyle = 'rgba(255, 255, 255, 0.3)'
  for (let i = 0; i < 5; i++) {
    const x = Math.random() * 512
    const y = Math.random() * 150
    const size = 30 + Math.random() * 40
    
    ctx.beginPath()
    ctx.arc(x, y, size, 0, Math.PI * 2)
    ctx.arc(x + size * 0.6, y, size * 0.8, 0, Math.PI * 2)
    ctx.arc(x + size * 1.2, y, size * 0.6, 0, Math.PI * 2)
    ctx.fill()
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.ClampToEdgeWrapping

  return texture
}

// Create carved stone texture
function createStoneTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 1024
  canvas.height = 1024
  const ctx = canvas.getContext('2d')

  // Light stone base color
  ctx.fillStyle = '#e8e6e3'
  ctx.fillRect(0, 0, 1024, 1024)

  // Add stone texture with variations and carved appearance
  const imageData = ctx.createImageData(1024, 1024)
  for (let y = 0; y < 1024; y++) {
    for (let x = 0; x < 1024; x++) {
      const index = (y * 1024 + x) * 4
      
      // Create stone-like variation with noise
      const noiseX = Math.sin(x * 0.02) * 0.3 + Math.sin(x * 0.05) * 0.2
      const noiseY = Math.sin(y * 0.02) * 0.3 + Math.sin(y * 0.05) * 0.2
      const noise = (noiseX + noiseY) * 15 + (Math.random() - 0.5) * 10
      
      // Base stone color with variation
      const baseR = 232
      const baseG = 230
      const baseB = 227
      
      const valueR = Math.max(220, Math.min(245, baseR + noise))
      const valueG = Math.max(220, Math.min(245, baseG + noise))
      const valueB = Math.max(220, Math.min(245, baseB + noise))
      
      imageData.data[index] = valueR     // R
      imageData.data[index + 1] = valueG // G
      imageData.data[index + 2] = valueB // B
      imageData.data[index + 3] = 255   // A
    }
  }
  ctx.putImageData(imageData, 0, 0)

  // Add subtle carved/chiseled lines for stone texture
  ctx.strokeStyle = 'rgba(200, 198, 195, 0.3)'
  ctx.lineWidth = 1
  for (let i = 0; i < 20; i++) {
    const x = Math.random() * 1024
    const y = Math.random() * 1024
    const length = 50 + Math.random() * 100
    const angle = Math.random() * Math.PI * 2
    
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x + Math.cos(angle) * length, y + Math.sin(angle) * length)
    ctx.stroke()
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(1, 1)

  return texture
}

export default GameLibrary3D
