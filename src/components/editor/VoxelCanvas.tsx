import { useRef, useEffect, useCallback, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { BLOCK_BY_ID } from '@/data/blockRegistry';
import { BlockPosition, keyToPosition } from '@/hooks/useVoxelWorld';

interface VoxelCanvasProps {
  blockMap: Map<BlockPosition, number>;
  version: number;
  selectedBlockId: number;
  showGrid: boolean;
  cameraMode: 'fps' | 'orbit';
  onPlaceBlock: (x: number, y: number, z: number) => void;
  onRemoveBlock: (x: number, y: number, z: number) => void;
  onDebugInfoUpdate?: (info: DebugInfo) => void;
}

export interface DebugInfo {
  fps: number;
  triangles: number;
  geometries: number;
  cameraPosition: {
    x: number;
    y: number;
    z: number;
  };
}

const WORLD_SIZE = 64;
const GRID_SIZE = 1;
const FPS_MOVE_SPEED = 20;
const FPS_MOUSE_SENSITIVITY = 0.002;

export function VoxelCanvas({
  blockMap,
  version,
  selectedBlockId,
  showGrid,
  cameraMode,
  onPlaceBlock,
  onRemoveBlock,
  onDebugInfoUpdate,
}: VoxelCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const orbitControlsRef = useRef<OrbitControls | null>(null);
  const clockRef = useRef<THREE.Clock>(new THREE.Clock());
  const blockMeshesRef = useRef<Map<string, THREE.Mesh>>(new Map());
  const previewMeshRef = useRef<THREE.Mesh | null>(null);
  const gridHelperRef = useRef<THREE.GridHelper | null>(null);
  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster());
  const mouseRef = useRef<THREE.Vector2>(new THREE.Vector2());
  
  const [isPointerLocked, setIsPointerLocked] = useState(false);
  const isPointerLockedRef = useRef(false);
  const cameraModeRef = useRef(cameraMode);
  const isMouseDownRef = useRef(false);
  const lastPlacedRef = useRef<string | null>(null);
  
  // Debug info refs
  const frameCountRef = useRef(0);
  const lastFPSUpdateRef = useRef(0);
  const fpsRef = useRef(0);
  const triangleCountRef = useRef(0);
  const geometryCountRef = useRef(0);
  const lastDebugUpdateRef = useRef(0);
  
  // FPS camera state
  const yawRef = useRef(0);
  const pitchRef = useRef(0);
  const moveStateRef = useRef({
    forward: false,
    backward: false,
    left: false,
    right: false,
    up: false,
    down: false,
  });
  const velocityRef = useRef(new THREE.Vector3());

  // Get intersection for FPS mode - MOVED TO TOP
  const getFPSIntersection = useCallback(() => {
    if (!sceneRef.current || !cameraRef.current) return null;

    const raycaster = new THREE.Raycaster();
    const camera = cameraRef.current;
    
    const direction = new THREE.Vector3(0, 0, -1);
    direction.applyQuaternion(camera.quaternion);
    raycaster.set(camera.position, direction);

    const objects = sceneRef.current.children.filter(
      obj => obj.name === 'block' || obj.name === 'ground'
    );
    const intersects = raycaster.intersectObjects(objects, false);

    if (intersects.length > 0) {
      const intersect = intersects[0];
      const point = intersect.point.clone();
      const normal = intersect.face?.normal.clone() || new THREE.Vector3(0, 1, 0);
      
      let gridX: number, gridY: number, gridZ: number;
      
      if (intersect.object.name === 'ground') {
        gridX = Math.floor(point.x + WORLD_SIZE / 2);
        gridY = 0;
        gridZ = Math.floor(point.z + WORLD_SIZE / 2);
      } else {
        const pos = intersect.object.position.clone();
        normal.transformDirection(intersect.object.matrixWorld);
        
        gridX = Math.floor(pos.x + normal.x + WORLD_SIZE / 2);
        gridY = Math.floor(pos.y + normal.y - 0.5);
        gridZ = Math.floor(pos.z + normal.z + WORLD_SIZE / 2);
      }

      return { 
        gridX, 
        gridY, 
        gridZ, 
        isBlock: intersect.object.name === 'block',
        blockKey: intersect.object.userData.blockKey,
      };
    }

    return null;
  }, []);

  // Collect debug information
  const collectDebugInfo = useCallback((): DebugInfo => {
    let triangles = 0;
    let geometries = new Set<string>();
    
    if (sceneRef.current) {
      sceneRef.current.traverse((object) => {
        if (object instanceof THREE.Mesh && object.geometry) {
          if (object.geometry.index) {
            triangles += object.geometry.index.count / 3;
          } else {
            triangles += object.geometry.attributes.position.count / 3;
          }
          geometries.add(object.geometry.uuid);
        }
      });
    }
    
    const cameraPos = cameraRef.current?.position.clone() || new THREE.Vector3();
    
    return {
      fps: fpsRef.current,
      triangles,
      geometries: geometries.size,
      cameraPosition: {
        x: cameraPos.x,
        y: cameraPos.y,
        z: cameraPos.z
      }
    };
  }, []);

  // Update debug info
  const updateDebugInfo = useCallback(() => {
    const now = performance.now();
    frameCountRef.current++;
    
    // Update FPS every second
    if (now - lastFPSUpdateRef.current >= 1000) {
      fpsRef.current = frameCountRef.current;
      frameCountRef.current = 0;
      lastFPSUpdateRef.current = now;
      
      // Collect other debug info
      triangleCountRef.current = collectDebugInfo().triangles;
      geometryCountRef.current = collectDebugInfo().geometries;
    }
    
    // Send debug update to parent every 500ms
    if (onDebugInfoUpdate && now - lastDebugUpdateRef.current >= 500) {
      const info = collectDebugInfo();
      onDebugInfoUpdate(info);
      lastDebugUpdateRef.current = now;
    }
  }, [collectDebugInfo, onDebugInfoUpdate]);

  // Initialize Three.js scene
  useEffect(() => {
    if (!containerRef.current) return;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0d1117);
    scene.fog = new THREE.Fog(0x0d1117, 50, 150);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(
      75,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.set(20, 15, 20);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Orbit Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI * 0.9;
    controls.minDistance = 5;
    controls.maxDistance = 100;
    orbitControlsRef.current = controls;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0x404050, 0.5);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(50, 80, 50);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 200;
    directionalLight.shadow.camera.left = -50;
    directionalLight.shadow.camera.right = 50;
    directionalLight.shadow.camera.top = 50;
    directionalLight.shadow.camera.bottom = -50;
    scene.add(directionalLight);

    const hemisphereLight = new THREE.HemisphereLight(0x87CEEB, 0x444444, 0.4);
    scene.add(hemisphereLight);

    // Grid
    const gridHelper = new THREE.GridHelper(WORLD_SIZE, WORLD_SIZE, 0x444444, 0x333333);
    gridHelper.position.y = 0.01;
    scene.add(gridHelper);
    gridHelperRef.current = gridHelper;

    // Ground plane for raycasting
    const groundGeometry = new THREE.PlaneGeometry(WORLD_SIZE, WORLD_SIZE);
    const groundMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x1a1a2e,
      roughness: 0.9,
      metalness: 0.1,
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0;
    ground.receiveShadow = true;
    ground.name = 'ground';
    scene.add(ground);

    // Preview mesh
    const previewGeometry = new THREE.BoxGeometry(1, 1, 1);
    const previewMaterial = new THREE.MeshBasicMaterial({
      color: 0xFFD700,
      transparent: true,
      opacity: 0.4,
      wireframe: false,
    });
    const previewMesh = new THREE.Mesh(previewGeometry, previewMaterial);
    previewMesh.visible = false;
    scene.add(previewMesh);
    previewMeshRef.current = previewMesh;

    // Wireframe overlay for preview
    const wireframeGeometry = new THREE.EdgesGeometry(previewGeometry);
    const wireframeMaterial = new THREE.LineBasicMaterial({ color: 0xFFD700, linewidth: 2 });
    const wireframe = new THREE.LineSegments(wireframeGeometry, wireframeMaterial);
    previewMesh.add(wireframe);

    // Handle resize
    const handleResize = () => {
      if (!containerRef.current) return;
      camera.aspect = containerRef.current.clientWidth / containerRef.current.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    // Start clock
    clockRef.current.start();

    // Animation loop
    let animationId: number;
    const animate = () => {
      animationId = requestAnimationFrame(animate);
      
      const delta = clockRef.current.getDelta();
      const currentMode = cameraModeRef.current;
      
      if (currentMode === 'orbit') {
        controls.update();
      } else if (isPointerLockedRef.current) {
        // FPS movement
        const move = moveStateRef.current;
        
        const yaw = yawRef.current;
        const forwardX = -Math.sin(yaw);
        const forwardZ = -Math.cos(yaw);
        const rightX = Math.cos(yaw);
        const rightZ = -Math.sin(yaw);
        
        const inputZ = Number(move.forward) - Number(move.backward);
        const inputX = Number(move.right) - Number(move.left);
        const inputY = Number(move.up) - Number(move.down);
        
        const moveX = forwardX * inputZ + rightX * inputX;
        const moveZ = forwardZ * inputZ + rightZ * inputX;
        
        velocityRef.current.x += moveX * FPS_MOVE_SPEED * delta;
        velocityRef.current.z += moveZ * FPS_MOVE_SPEED * delta;
        velocityRef.current.y += inputY * FPS_MOVE_SPEED * delta;
        
        const damping = Math.exp(-8 * delta);
        velocityRef.current.x *= damping;
        velocityRef.current.z *= damping;
        velocityRef.current.y *= damping;
        
        camera.position.x += velocityRef.current.x;
        camera.position.z += velocityRef.current.z;
        camera.position.y += velocityRef.current.y;
        
        camera.rotation.order = 'YXZ';
        camera.rotation.y = yawRef.current;
        camera.rotation.x = pitchRef.current;
        camera.rotation.z = 0;

        // Update preview mesh position in FPS mode
        if (previewMeshRef.current && selectedBlockId) {
          const intersection = getFPSIntersection();
          if (intersection) {
            previewMeshRef.current.visible = true;
            previewMeshRef.current.position.set(
              intersection.gridX - WORLD_SIZE / 2 + 0.5,
              intersection.gridY + 0.5,
              intersection.gridZ - WORLD_SIZE / 2 + 0.5
            );
          } else {
            previewMeshRef.current.visible = false;
          }
        }
      }
      
      // Update debug info
      updateDebugInfo();
      
      renderer.render(scene, camera);
    };
    animate();

    // Cleanup
    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [selectedBlockId, getFPSIntersection, updateDebugInfo]);

  // Handle FPS mouse click
  const handleFPSMouseDown = useCallback((event: MouseEvent) => {
    if (!isPointerLockedRef.current) return;
    
    const intersection = getFPSIntersection();
    
    if (event.button === 0 && intersection) {
      onPlaceBlock(intersection.gridX, intersection.gridY, intersection.gridZ);
    } else if (event.button === 2 && intersection && intersection.isBlock) {
      const [x, y, z] = keyToPosition(intersection.blockKey);
      onRemoveBlock(x, y, z);
    }
  }, [getFPSIntersection, onPlaceBlock, onRemoveBlock]);

  // Update camera mode
  useEffect(() => {
    cameraModeRef.current = cameraMode;
    
    if (!orbitControlsRef.current || !cameraRef.current) return;
    
    const controls = orbitControlsRef.current;
    const camera = cameraRef.current;
    
    if (cameraMode === 'orbit') {
      controls.enabled = true;
      
      if (document.pointerLockElement) {
        document.exitPointerLock();
      }
      
      if (previewMeshRef.current) {
        previewMeshRef.current.visible = false;
      }
    } else {
      controls.enabled = false;
      
      const euler = new THREE.Euler().setFromQuaternion(camera.quaternion, 'YXZ');
      yawRef.current = euler.y;
      pitchRef.current = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, euler.x));
      
      velocityRef.current.set(0, 0, 0);
    }
  }, [cameraMode]);

  // Update grid visibility
  useEffect(() => {
    if (gridHelperRef.current) {
      gridHelperRef.current.visible = showGrid;
    }
  }, [showGrid]);

  // Update blocks when blockMap changes
  useEffect(() => {
    if (!sceneRef.current) return;

    const scene = sceneRef.current;
    const currentMeshes = blockMeshesRef.current;
    const newKeys = new Set<string>();

    // Add/update blocks
    blockMap.forEach((blockId, key) => {
      newKeys.add(key);
      const [x, y, z] = keyToPosition(key);
      const block = BLOCK_BY_ID.get(blockId);
      
      if (!block) return;

      if (!currentMeshes.has(key)) {
        const geometry = new THREE.BoxGeometry(GRID_SIZE, GRID_SIZE, GRID_SIZE);
        const material = new THREE.MeshStandardMaterial({
          color: block.texture,
          roughness: 0.8,
          metalness: 0.1,
          transparent: block.transparent,
          opacity: block.transparent ? 0.7 : 1,
        });
        
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(
          x - WORLD_SIZE / 2 + 0.5,
          y + 0.5,
          z - WORLD_SIZE / 2 + 0.5
        );
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.userData.blockKey = key;
        mesh.name = 'block';
        
        scene.add(mesh);
        currentMeshes.set(key, mesh);
      }
    });

    // Remove old blocks
    currentMeshes.forEach((mesh, key) => {
      if (!newKeys.has(key)) {
        scene.remove(mesh);
        mesh.geometry.dispose();
        (mesh.material as THREE.Material).dispose();
        currentMeshes.delete(key);
      }
    });
  }, [blockMap, version]);

  // Get intersection point for block placement (orbit mode)
  const getIntersection = useCallback((event: MouseEvent | React.MouseEvent) => {
    if (!containerRef.current || !sceneRef.current || !cameraRef.current) return null;

    const rect = containerRef.current.getBoundingClientRect();
    mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);

    const objects = sceneRef.current.children.filter(
      obj => obj.name === 'block' || obj.name === 'ground'
    );
    const intersects = raycasterRef.current.intersectObjects(objects, false);

    if (intersects.length > 0) {
      const intersect = intersects[0];
      const point = intersect.point.clone();
      const normal = intersect.face?.normal.clone() || new THREE.Vector3(0, 1, 0);
      
      let gridX: number, gridY: number, gridZ: number;
      
      if (intersect.object.name === 'ground') {
        gridX = Math.floor(point.x + WORLD_SIZE / 2);
        gridY = 0;
        gridZ = Math.floor(point.z + WORLD_SIZE / 2);
      } else {
        const pos = intersect.object.position.clone();
        normal.transformDirection(intersect.object.matrixWorld);
        
        gridX = Math.floor(pos.x + normal.x + WORLD_SIZE / 2);
        gridY = Math.floor(pos.y + normal.y - 0.5);
        gridZ = Math.floor(pos.z + normal.z + WORLD_SIZE / 2);
      }

      return { 
        gridX, 
        gridY, 
        gridZ, 
        isBlock: intersect.object.name === 'block',
        blockKey: intersect.object.userData.blockKey,
      };
    }

    return null;
  }, []);

  // Handle mouse move for preview - orbit mode only
  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (cameraModeRef.current !== 'orbit') return;
    
    const intersection = getIntersection(event);
    
    if (intersection && previewMeshRef.current) {
      previewMeshRef.current.visible = true;
      previewMeshRef.current.position.set(
        intersection.gridX - WORLD_SIZE / 2 + 0.5,
        intersection.gridY + 0.5,
        intersection.gridZ - WORLD_SIZE / 2 + 0.5
      );

      if (isMouseDownRef.current && event.buttons === 1) {
        const key = `${intersection.gridX},${intersection.gridY},${intersection.gridZ}`;
        if (key !== lastPlacedRef.current) {
          onPlaceBlock(intersection.gridX, intersection.gridY, intersection.gridZ);
          lastPlacedRef.current = key;
        }
      }
    } else if (previewMeshRef.current) {
      previewMeshRef.current.visible = false;
    }
  }, [getIntersection, onPlaceBlock]);

  // Handle mouse down - orbit mode only
  const handleMouseDown = useCallback((event: MouseEvent) => {
    if (cameraModeRef.current !== 'orbit') return;
    
    if (event.button === 0) {
      isMouseDownRef.current = true;
      lastPlacedRef.current = null;
      
      const intersection = getIntersection(event);
      if (intersection) {
        const key = `${intersection.gridX},${intersection.gridY},${intersection.gridZ}`;
        onPlaceBlock(intersection.gridX, intersection.gridY, intersection.gridZ);
        lastPlacedRef.current = key;
      }
    } else if (event.button === 2) {
      const intersection = getIntersection(event);
      if (intersection && intersection.isBlock) {
        const [x, y, z] = keyToPosition(intersection.blockKey);
        onRemoveBlock(x, y, z);
      }
    }
  }, [getIntersection, onPlaceBlock, onRemoveBlock]);

  // Handle mouse up
  const handleMouseUp = useCallback(() => {
    isMouseDownRef.current = false;
    lastPlacedRef.current = null;
  }, []);

  // Handle pointer lock for FPS camera
  const handleClick = useCallback(() => {
    if (cameraMode === 'fps' && containerRef.current) {
      containerRef.current.requestPointerLock();
    }
  }, [cameraMode]);

  // FPS mouse look
  const handlePointerLockMove = useCallback((event: MouseEvent) => {
    if (!isPointerLockedRef.current) return;
    
    yawRef.current -= event.movementX * FPS_MOUSE_SENSITIVITY;
    
    pitchRef.current -= event.movementY * FPS_MOUSE_SENSITIVITY;
    pitchRef.current = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, pitchRef.current));
  }, []);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.code) {
        case 'KeyW': moveStateRef.current.forward = true; break;
        case 'KeyS': moveStateRef.current.backward = true; break;
        case 'KeyA': moveStateRef.current.left = true; break;
        case 'KeyD': moveStateRef.current.right = true; break;
        case 'Space': moveStateRef.current.up = true; event.preventDefault(); break;
        case 'ShiftLeft': moveStateRef.current.down = true; break;
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      switch (event.code) {
        case 'KeyW': moveStateRef.current.forward = false; break;
        case 'KeyS': moveStateRef.current.backward = false; break;
        case 'KeyA': moveStateRef.current.left = false; break;
        case 'KeyD': moveStateRef.current.right = false; break;
        case 'Space': moveStateRef.current.up = false; break;
        case 'ShiftLeft': moveStateRef.current.down = false; break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Pointer lock event listeners
  useEffect(() => {
    const handleLockChange = () => {
      const locked = document.pointerLockElement === containerRef.current;
      isPointerLockedRef.current = locked;
      setIsPointerLocked(locked);
      
      if (previewMeshRef.current) {
        previewMeshRef.current.visible = !locked && cameraModeRef.current === 'orbit';
      }
      
      if (!locked) {
        velocityRef.current.set(0, 0, 0);
        moveStateRef.current = {
          forward: false,
          backward: false,
          left: false,
          right: false,
          up: false,
          down: false,
        };
      }
    };

    const handleMouseMoveLock = (event: MouseEvent) => {
      if (isPointerLockedRef.current) {
        handlePointerLockMove(event);
      }
    };

    const handleMouseDownLock = (event: MouseEvent) => {
      if (isPointerLockedRef.current) {
        handleFPSMouseDown(event);
      }
    };

    document.addEventListener('pointerlockchange', handleLockChange);
    document.addEventListener('mousemove', handleMouseMoveLock);
    document.addEventListener('mousedown', handleMouseDownLock);

    return () => {
      document.removeEventListener('pointerlockchange', handleLockChange);
      document.removeEventListener('mousedown', handleMouseDownLock);
      document.removeEventListener('mousemove', handleMouseMoveLock);
    };
  }, [handlePointerLockMove, handleFPSMouseDown]);

  // Regular event listeners for orbit mode
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('mousemove', handleMouseMove);
    container.addEventListener('mousedown', handleMouseDown);
    container.addEventListener('mouseup', handleMouseUp);
    container.addEventListener('contextmenu', (e) => e.preventDefault());

    return () => {
      container.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('mousedown', handleMouseDown);
      container.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseDown, handleMouseUp]);

  return (
    <div 
      ref={containerRef} 
      className="w-full h-full cursor-crosshair"
      onClick={handleClick}
    >
      {/* Cyan dot crosshair overlay for FPS mode */}
      {isPointerLocked && (
        <div className="absolute inset-0 pointer-events-none z-20 flex items-center justify-center">
          <div className="w-2 h-2 bg-cyan-500 rounded-full shadow-lg shadow-cyan-500/50"></div>
        </div>
      )}

      {cameraMode === 'fps' && !isPointerLocked && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-10">
          <div className="editor-panel p-6 text-center animate-scale-in">
            <div className="w-12 h-12 mx-auto mb-4 border-2 border-primary rounded-full flex items-center justify-center">
              <div className="w-2 h-2 bg-primary rounded-full" />
            </div>
            <p className="text-foreground font-medium">Click to enable FPS controls</p>
            <p className="text-sm text-muted-foreground mt-1">
              Press ESC to exit • LMB Place • RMB Remove
            </p>
          </div>
        </div>
      )}
    </div>
  );
}