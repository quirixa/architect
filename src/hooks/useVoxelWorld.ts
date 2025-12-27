import { useState, useCallback, useRef } from 'react';
import { WorldData, createEmptyWorld, BLOCK_BY_ID } from '@/data/blockRegistry';

export type BlockPosition = `${number},${number},${number}`;

export interface VoxelWorldState {
  worldData: WorldData;
  blockMap: Map<BlockPosition, number>;
}

export function positionToKey(x: number, y: number, z: number): BlockPosition {
  return `${x},${y},${z}`;
}

export function keyToPosition(key: BlockPosition): [number, number, number] {
  const parts = key.split(',').map(Number);
  return [parts[0], parts[1], parts[2]];
}

export function useVoxelWorld(initialSize = { x: 64, y: 32, z: 64 }) {
  const [worldData, setWorldData] = useState<WorldData>(() => 
    createEmptyWorld(initialSize.x, initialSize.y, initialSize.z)
  );
  const blockMapRef = useRef<Map<BlockPosition, number>>(new Map());
  const [version, setVersion] = useState(0);

  const placeBlock = useCallback((x: number, y: number, z: number, blockId: number) => {
    const key = positionToKey(x, y, z);
    const block = BLOCK_BY_ID.get(blockId);
    
    if (!block) return false;
    
    // Check bounds
    if (x < 0 || x >= worldData.size.x ||
        y < 0 || y >= worldData.size.y ||
        z < 0 || z >= worldData.size.z) {
      return false;
    }
    
    blockMapRef.current.set(key, blockId);
    setVersion(v => v + 1);
    return true;
  }, [worldData.size]);

  const removeBlock = useCallback((x: number, y: number, z: number) => {
    const key = positionToKey(x, y, z);
    if (blockMapRef.current.has(key)) {
      blockMapRef.current.delete(key);
      setVersion(v => v + 1);
      return true;
    }
    return false;
  }, []);

  const getBlock = useCallback((x: number, y: number, z: number): number | undefined => {
    const key = positionToKey(x, y, z);
    return blockMapRef.current.get(key);
  }, []);

  const hasBlock = useCallback((x: number, y: number, z: number): boolean => {
    const key = positionToKey(x, y, z);
    return blockMapRef.current.has(key);
  }, []);

  const getBlockMap = useCallback(() => {
    return blockMapRef.current;
  }, []);

  const clearWorld = useCallback(() => {
    blockMapRef.current.clear();
    setVersion(v => v + 1);
  }, []);

  const exportWorld = useCallback((): WorldData => {
    const blocks: WorldData['blocks'] = [];
    blockMapRef.current.forEach((id, key) => {
      const [x, y, z] = keyToPosition(key);
      blocks.push({ x, y, z, id });
    });
    return {
      ...worldData,
      blocks,
    };
  }, [worldData]);

  const importWorld = useCallback((data: WorldData) => {
    blockMapRef.current.clear();
    data.blocks.forEach(({ x, y, z, id }) => {
      const key = positionToKey(x, y, z);
      blockMapRef.current.set(key, id);
    });
    setWorldData(data);
    setVersion(v => v + 1);
  }, []);

  const getBlockCount = useCallback(() => {
    return blockMapRef.current.size;
  }, []);

  return {
    worldData,
    version,
    placeBlock,
    removeBlock,
    getBlock,
    hasBlock,
    getBlockMap,
    clearWorld,
    exportWorld,
    importWorld,
    getBlockCount,
  };
}
