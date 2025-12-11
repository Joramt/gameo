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
  const raycasterRef = useRef(new THREE.Raycaster())
  const mouseRef = useRef(new THREE.Vector2())

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
    // Heights vary between 0.85 and 1.15
    // All holes positioned at least 2 box heights from ground
    const holes = [
      // Bottom row (around y = 2.5-3.5)
      { x: -5, y: 2.8, width: 1.4, height: 0.95 },
      { x: -3, y: 3.2, width: 1.9, height: 1.1 },
      { x: -0.5, y: 2.6, width: 2.1, height: 0.9 },
      { x: 2, y: 3.0, width: 1.7, height: 1.05 },
      { x: 4.5, y: 2.9, width: 1.5, height: 0.88 },
      
      // Middle row (around y = 4-5.5)
      { x: -4.5, y: 4.3, width: 1.8, height: 1.12 },
      { x: -2, y: 4.8, width: 2.0, height: 0.92 },
      { x: 0.5, y: 4.5, width: 1.6, height: 1.08 },
      { x: 3, y: 4.7, width: 1.9, height: 0.96 },
      { x: 5, y: 4.2, width: 1.3, height: 1.15 },
      
      // Upper middle row (around y = 5.5-7)
      { x: -3.5, y: 6.0, width: 2.2, height: 1.02 },
      { x: -1, y: 6.5, width: 1.7, height: 0.94 },
      { x: 1.5, y: 6.2, width: 1.8, height: 1.06 },
      { x: 4, y: 6.8, width: 1.6, height: 0.98 },
      
      // Top row (around y = 7.5-8.5)
      { x: -4, y: 7.8, width: 1.9, height: 1.09 },
      { x: -1.5, y: 8.2, width: 2.1, height: 0.91 },
      { x: 1, y: 7.6, width: 1.5, height: 1.13 },
      { x: 3.5, y: 8.0, width: 1.8, height: 0.97 },
      { x: 5.2, y: 7.9, width: 1.4, height: 1.04 },
    ]
    
    // Ensure minimum spacing between boxes
    // Sort holes by Y position and adjust if too close
    const sortedHoles = [...holes].sort((a, b) => a.y - b.y)
    for (let i = 1; i < sortedHoles.length; i++) {
      const prev = sortedHoles[i - 1]
      const curr = sortedHoles[i]
      const prevBottom = prev.y - prev.height / 2
      const currTop = curr.y + curr.height / 2
      const spacing = currTop - prevBottom
      
      if (spacing < minSpacing) {
        // Move current hole up to maintain minimum spacing
        const neededY = prevBottom + prev.height / 2 + minSpacing + curr.height / 2
        curr.y = neededY
        // Update original array
        const originalIndex = holes.findIndex(h => h.x === curr.x && h.width === curr.width)
        if (originalIndex !== -1) {
          holes[originalIndex].y = neededY
        }
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
      // Make boxes 3x taller - but still smaller than holes in height
      const boxWidth = 0.18 // Width of game box (wider)
      const boxHeight = 0.84 // Height of game box (3x taller: 0.28 * 3 = 0.84)
      const boxDepth = 0.015 // Depth (thickness) of game box (thicker)
      const boxSpacing = 0.15 // Spacing between boxes (increased significantly to prevent ledge clipping)
      const boxPadding = 0.15 // Padding from hole edges (increased to prevent clipping and add space)
      const topPadding = 0.15 // Extra padding at the top of each hole
      const ledgeProtrusion = 0.08 // How much the ledge protrudes (needed for spacing calculation)
      
      // Helper function to create text texture for game name
      const createTextTexture = (text, width = 512, height = 128) => {
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        
        // Background
        ctx.fillStyle = ps5Blue
        ctx.fillRect(0, 0, width, height)
        
        // Text styling
        ctx.fillStyle = '#ffffff'
        ctx.font = 'bold 48px Arial'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        
        // Draw text (rotated 90 degrees for vertical text on edge)
        ctx.save()
        ctx.translate(width / 2, height / 2)
        ctx.rotate(-Math.PI / 2) // Rotate text to be vertical
        ctx.fillText(text, 0, 0)
        ctx.restore()
        
        const texture = new THREE.CanvasTexture(canvas)
        texture.needsUpdate = true
        return texture
      }
      
      // Store boxes for interaction
      gameBoxesRef.current = []
      
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
        const boxY = ledgeTopY + boxHeight / 2 + (rowIndex * verticalSpacing)
        
        // Make sure box fits within hole height (accounting for ledge, padding, and top spacing)
        const maxY = hole.y + (hole.height / 2) - boxPadding - topPadding
        if (boxY + (boxHeight / 2) > maxY) {
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
        
        // Create text texture for the edge (spine)
        const textTexture = createTextTexture(game.name || 'Game', 512, 128)
        
        // Create materials array for different faces
        // Face order: right, left, top, bottom, front, back
        // After 90° X rotation: right=edge (text), left=hidden, top=front (cover), bottom=back, front=top, back=bottom
        const materials = [
          // Right face - visible edge with game name text
          new THREE.MeshStandardMaterial({
            map: textTexture,
            roughness: 0.3,
            metalness: 0.1
          }),
          // Left face - hidden edge
          new THREE.MeshStandardMaterial({
            color: ps5Blue,
            roughness: 0.3,
            metalness: 0.1
          }),
          // Top face - will be front after rotation (game cover)
          new THREE.MeshStandardMaterial({
            color: ps5Blue,
            roughness: 0.3,
            metalness: 0.1
          }),
          // Bottom face - will be back after rotation
          new THREE.MeshStandardMaterial({
            color: ps5Blue,
            roughness: 0.3,
            metalness: 0.1
          }),
          // Front face - will be top after rotation
          new THREE.MeshStandardMaterial({
            color: ps5Blue,
            roughness: 0.3,
            metalness: 0.1
          }),
          // Back face - will be bottom after rotation
          new THREE.MeshStandardMaterial({
            color: ps5Blue,
            roughness: 0.3,
            metalness: 0.1
          })
        ]
        
        const boxMesh = new THREE.Mesh(boxGeometry, materials)
        
        // Load game cover image if available and apply to top face (front after rotation)
        if (game.image) {
          const textureLoader = new THREE.TextureLoader()
          textureLoader.load(
            game.image,
            (texture) => {
              // Update the top face material (index 2) with the cover image
              materials[2] = new THREE.MeshStandardMaterial({
                map: texture,
                roughness: 0.3,
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
        
        // Position box on the ledge
        boxMesh.position.set(
          boxX,
          boxY,
          wallFrontZ + holeDepth / 2 + boxDepth / 2 + 0.01 // Slightly forward from the back of the hole
        )
        
        // Rotate box 90 degrees on X axis to expose the edge
        boxMesh.rotation.x = Math.PI / 2 // 90 degrees
        boxMesh.rotation.y = 0
        boxMesh.rotation.z = 0
        
        boxMesh.castShadow = true
        boxMesh.receiveShadow = true
        
        // Store game data and rotation state on the mesh
        boxMesh.userData = {
          game: game,
          isRotating: false,
          targetRotationX: 0,
          currentRotationX: 0
        }
        
        // Add to scene and store reference
        scene.add(boxMesh)
        gameBoxesRef.current.push(boxMesh)
      })
    }

    // Mouse controls for horizontal and vertical rotation
    const handleMouseDown = (e) => {
      // First check if clicking on a game box
      if (gameBoxesRef.current.length > 0 && rendererRef.current && cameraRef.current) {
        // Calculate mouse position in normalized device coordinates
        mouseRef.current.x = (e.clientX / rendererRef.current.domElement.clientWidth) * 2 - 1
        mouseRef.current.y = -(e.clientY / rendererRef.current.domElement.clientHeight) * 2 + 1
        
        // Update raycaster
        raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current)
        
        // Check for intersections with game boxes
        const intersects = raycasterRef.current.intersectObjects(gameBoxesRef.current)
        
        if (intersects.length > 0) {
          // Clicked on a game box - rotate it on X axis
          const clickedBox = intersects[0].object
          const userData = clickedBox.userData
          
          // Toggle rotation: if currently at 0, rotate to 45 degrees, otherwise rotate back to 0
          if (userData.targetRotationX === 0) {
            userData.targetRotationX = Math.PI / 4 // 45 degrees
            userData.isRotating = true
          } else {
            userData.targetRotationX = 0
            userData.isRotating = true
          }
          
          return // Don't start camera dragging
        }
      }
      
      // No box clicked, start camera dragging
      isDraggingRef.current = true
      lastMouseXRef.current = e.clientX
      lastMouseYRef.current = e.clientY
      if (mountRef.current) {
        mountRef.current.style.cursor = 'grabbing'
      }
    }

    const handleMouseMove = (e) => {
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

    renderer.domElement.addEventListener('mousedown', handleMouseDown)
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    renderer.domElement.addEventListener('touchstart', handleTouchStart)
    renderer.domElement.addEventListener('touchmove', handleTouchMove)
    renderer.domElement.addEventListener('touchend', handleTouchEnd)

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate)

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
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
      renderer.domElement.removeEventListener('touchstart', handleTouchStart)
      renderer.domElement.removeEventListener('touchmove', handleTouchMove)
      renderer.domElement.removeEventListener('touchend', handleTouchEnd)
      
      if (mountRef.current && renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement)
      }
      
      // Dispose of geometries and materials
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
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
