import { useRef, useEffect, useCallback, useState } from 'react';
import * as THREE from 'three';
import { BLOCK_BY_ID } from '@/data/blockRegistry';
import { BlockPosition, keyToPosition } from '@/hooks/useVoxelWorld';

interface VoxelCanvasProps {
  blockMap: Map<BlockPosition, number>;
  version: number;
  selectedBlockId: number;
  showGrid: boolean;
  cameraMode: 'fps'; // Only FPS mode now
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
  isGrounded: boolean;
  velocity: {
    x: number;
    y: number;
    z: number;
  };
}

const WORLD_SIZE = 64;
const GRID_SIZE = 1;
const FPS_MOVE_SPEED = 20;
const MOUSE_SENSITIVITY = 0.002;

export function VoxelCanvas({
  blockMap,
  version,
  selectedBlockId,
  showGrid,
  cameraMode, // Always 'fps'
  onPlaceBlock,
  onRemoveBlock,
  onDebugInfoUpdate,
}: VoxelCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const clockRef = useRef<THREE.Clock>(new THREE.Clock());
  const blockMeshesRef = useRef<Map<string, THREE.Mesh>>(new Map());
  const previewMeshRef = useRef<THREE.Mesh | null>(null);
  const gridHelperRef = useRef<THREE.GridHelper | null>(null);
  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster());
  
  const [isPointerLocked, setIsPointerLocked] = useState(false);
  const isPointerLockedRef = useRef(false);
  const isMouseDownRef = useRef(false);
  const lastPlacedRef = useRef<string | null>(null);
  
  // Debug info refs
  const frameCountRef = useRef(0);
  const lastFPSUpdateRef = useRef(0);
  const fpsRef = useRef(0);
  const triangleCountRef = useRef(0);
  const geometryCountRef = useRef(0);
  const lastDebugUpdateRef = useRef(0);
  
  // Camera state
  const yawRef = useRef(0);
  const pitchRef = useRef(0);
  const velocityRef = useRef(new THREE.Vector3());
  const cameraPositionRef = useRef(new THREE.Vector3(20, 15, 20));
  
  // Movement state
  const moveStateRef = useRef({
    forward: false,
    backward: false,
    left: false,
    right: false,
    up: false,
    down: false,
  });

  // Convert grid coordinates to world coordinates (center of block)
  const gridToWorld = useCallback((gridX: number, gridY: number, gridZ: number) => {
    return new THREE.Vector3(
      gridX - (WORLD_SIZE / 2) + 0.5,
      gridY + 0.5,
      gridZ - (WORLD_SIZE / 2) + 0.5
    );
  }, []);

  // Convert world coordinates to grid coordinates
  const worldToGrid = useCallback((worldPos: THREE.Vector3) => {
    return {
      x: Math.floor(worldPos.x + (WORLD_SIZE / 2)),
      y: Math.floor(worldPos.y),
      z: Math.floor(worldPos.z + (WORLD_SIZE / 2))
    };
  }, []);

  // Get intersection for FPS mode
  const getFPSIntersection = useCallback(() => {
    if (!sceneRef.current || !cameraRef.current) return null;

    const raycaster = new THREE.Raycaster();
    const camera = cameraRef.current;
    
    const direction = new THREE.Vector3(0, 0, -1);
    direction.applyQuaternion(camera.quaternion);
    raycaster.set(camera.position, direction);

    const objects = Array.from(blockMeshesRef.current.values());
    const intersects = raycaster.intersectObjects(objects, false);

    if (intersects.length > 0) {
      const intersect = intersects[0];
      const point = intersect.point.clone();
      const normal = intersect.face?.normal.clone() || new THREE.Vector3(0, 1, 0);
      
      const blockPos = intersect.object.position;
      normal.transformDirection(intersect.object.matrixWorld);
      
      // Calculate adjacent position
      const adjacentWorldPos = blockPos.clone().add(normal);
      const adjacentGridPos = worldToGrid(adjacentWorldPos);
      
      return { 
        gridX: adjacentGridPos.x,
        gridY: adjacentGridPos.y,
        gridZ: adjacentGridPos.z,
        isBlock: true,
        blockKey: intersect.object.userData.blockKey,
      };
    }

    return null;
  }, [worldToGrid]);

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
      },
      isGrounded: false, // Not used in FPS mode
      velocity: {
        x: velocityRef.current.x,
        y: velocityRef.current.y,
        z: velocityRef.current.z
      }
    };
  }, []);

  // Update debug info
  const updateDebugInfo = useCallback(() => {
    const now = performance.now();
    frameCountRef.current++;
    
    if (now - lastFPSUpdateRef.current >= 1000) {
      fpsRef.current = frameCountRef.current;
      frameCountRef.current = 0;
      lastFPSUpdateRef.current = now;
    }
    
    if (onDebugInfoUpdate && now - lastDebugUpdateRef.current >= 500) {
      const info = collectDebugInfo();
      onDebugInfoUpdate(info);
      lastDebugUpdateRef.current = now;
    }
  }, [collectDebugInfo, onDebugInfoUpdate]);

  // FPS mode movement
  const updateFPSMovement = useCallback((delta: number) => {
    if (!cameraRef.current) return;
    
    const move = moveStateRef.current;
    
    const yaw = yawRef.current;
    const forwardX = -Math.sin(yaw);
    const forwardZ = -Math.cos(yaw);
    const rightX = Math.cos(yaw);
    const rightZ = -Math.sin(yaw);
    
    const inputZ = Number(move.forward) - Number(move.backward);
    const inputX = Number(move.right) - Number(move.left);
    const inputY = Number(move.up) - Number(move.down);
    
    let moveX = forwardX * inputZ + rightX * inputX;
    let moveZ = forwardZ * inputZ + rightZ * inputX;
    
    if (moveX !== 0 && moveZ !== 0) {
      const length = Math.sqrt(moveX * moveX + moveZ * moveZ);
      moveX /= length;
      moveZ /= length;
    }
    
    velocityRef.current.x += moveX * FPS_MOVE_SPEED * delta;
    velocityRef.current.z += moveZ * FPS_MOVE_SPEED * delta;
    velocityRef.current.y += inputY * FPS_MOVE_SPEED * delta;
    
    const damping = Math.exp(-8 * delta);
    velocityRef.current.x *= damping;
    velocityRef.current.z *= damping;
    velocityRef.current.y *= damping;
    
    cameraPositionRef.current.x += velocityRef.current.x;
    cameraPositionRef.current.z += velocityRef.current.z;
    cameraPositionRef.current.y += velocityRef.current.y;
    
    cameraRef.current.position.copy(cameraPositionRef.current);
    
    cameraRef.current.rotation.order = 'YXZ';
    cameraRef.current.rotation.y = yawRef.current;
    cameraRef.current.rotation.x = pitchRef.current;
    cameraRef.current.rotation.z = 0;

    if (previewMeshRef.current && selectedBlockId) {
      const intersection = getFPSIntersection();
      if (intersection) {
        previewMeshRef.current.visible = true;
        const worldPos = gridToWorld(intersection.gridX, intersection.gridY, intersection.gridZ);
        previewMeshRef.current.position.copy(worldPos);
      } else {
        previewMeshRef.current.visible = false;
      }
    }
  }, [getFPSIntersection, selectedBlockId, gridToWorld]);

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
    camera.position.copy(cameraPositionRef.current);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    const euler = new THREE.Euler().setFromQuaternion(camera.quaternion, 'YXZ');
    yawRef.current = euler.y;
    pitchRef.current = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, euler.x));

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

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

    // Grid helper (visual grid lines)
    const gridHelper = new THREE.GridHelper(WORLD_SIZE, WORLD_SIZE, 0x444444, 0x333333);
    gridHelper.position.y = 0.01;
    scene.add(gridHelper);
    gridHelperRef.current = gridHelper;

    // Ground plane - SOLID GROUND
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

    // Wireframe overlay
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
      
      if (isPointerLockedRef.current) {
        updateFPSMovement(delta);
      }
      
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
  }, [selectedBlockId, updateFPSMovement, updateDebugInfo, gridToWorld]);

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
      
      if (!currentMeshes.has(key)) {
        const [x, y, z] = keyToPosition(key);
        const block = BLOCK_BY_ID.get(blockId);
        
        if (!block) return;

        const geometry = new THREE.BoxGeometry(GRID_SIZE, GRID_SIZE, GRID_SIZE);
        const material = new THREE.MeshStandardMaterial({
          color: block.texture,
          roughness: 0.8,
          metalness: 0.1,
          transparent: block.transparent,
          opacity: block.transparent ? 0.7 : 1,
        });
        
        const mesh = new THREE.Mesh(geometry, material);
        
        const worldPos = gridToWorld(x, y, z);
        mesh.position.copy(worldPos);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.userData.blockKey = key;
        mesh.name = 'block';
        
        scene.add(mesh);
        currentMeshes.set(key, mesh);
      }
    });

    // Remove blocks that no longer exist
    const keysToRemove: string[] = [];
    currentMeshes.forEach((mesh, key) => {
      if (!newKeys.has(key)) {
        keysToRemove.push(key);
      }
    });

    keysToRemove.forEach(key => {
      const mesh = currentMeshes.get(key);
      if (mesh) {
        scene.remove(mesh);
        mesh.geometry.dispose();
        (mesh.material as THREE.Material).dispose();
        currentMeshes.delete(key);
      }
    });
  }, [blockMap, version, gridToWorld]);

  // Handle click to enable pointer lock
  const handleClick = useCallback(() => {
    if (containerRef.current) {
      containerRef.current.requestPointerLock();
    }
  }, []);

  // Mouse look
  const handlePointerLockMove = useCallback((event: MouseEvent) => {
    if (!isPointerLockedRef.current) return;
    
    yawRef.current -= event.movementX * MOUSE_SENSITIVITY;
    
    pitchRef.current -= event.movementY * MOUSE_SENSITIVITY;
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
        
        case 'Space': 
          moveStateRef.current.up = true;
          event.preventDefault();
          break;
          
        case 'ShiftLeft': 
          moveStateRef.current.down = true;
          break;
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      switch (event.code) {
        case 'KeyW': moveStateRef.current.forward = false; break;
        case 'KeyS': moveStateRef.current.backward = false; break;
        case 'KeyA': moveStateRef.current.left = false; break;
        case 'KeyD': moveStateRef.current.right = false; break;
        
        case 'Space': 
          moveStateRef.current.up = false;
          break;
          
        case 'ShiftLeft': 
          moveStateRef.current.down = false;
          break;
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
        previewMeshRef.current.visible = false;
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

  return (
    <div 
      ref={containerRef} 
      className="w-full h-full cursor-crosshair"
      onClick={handleClick}
    >
      {/* Crosshair for FPS mode */}
      {isPointerLocked && (
        <div className="absolute inset-0 pointer-events-none z-20 flex items-center justify-center">
          <div className="w-2 h-2 bg-cyan-500 rounded-full shadow-lg shadow-cyan-500/50"></div>
        </div>
      )}

      {!isPointerLocked && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-10">
          <div className="editor-panel p-6 text-center animate-scale-in">
            <div className="w-12 h-12 mx-auto mb-4 border-2 border-primary rounded-full flex items-center justify-center">
              <div className="w-2 h-2 bg-primary rounded-full" />
            </div>
            <p className="text-foreground font-medium">FPS Mode</p>
            <p className="text-sm text-muted-foreground mt-1">
              WASD: Move • Space/Shift: Up/Down • LMB: Place • RMB: Remove • ESC: Exit
            </p>
            <p className="text-xs text-blue-500 mt-2">
              ✈️ Free flight mode • No gravity • Fly anywhere
            </p>
          </div>
        </div>
      )}
    </div>
  );
}