import { useState, useCallback, useEffect, useRef } from 'react';
import { VoxelCanvas } from './VoxelCanvas';
import { Hotbar } from './Hotbar';
import { BlockInventory } from './BlockInventory';
import { EditorControls } from './EditorControls';
import { useVoxelWorld } from '@/hooks/useVoxelWorld';
import { BLOCK_REGISTRY, BlockDefinition, exportWorldToJSON, importWorldFromJSON } from '@/data/blockRegistry';
import { toast } from 'sonner';

// Default hotbar blocks
const DEFAULT_HOTBAR = [1, 2, 3, 6, 11, 70, 72, 73, 75];

export function VoxelEditor() {
  const {
    version,
    placeBlock,
    removeBlock,
    getBlockMap,
    clearWorld,
    exportWorld,
    importWorld,
    getBlockCount,
  } = useVoxelWorld();

  const [hotbarSlots, setHotbarSlots] = useState<number[]>(DEFAULT_HOTBAR);
  const [selectedHotbarIndex, setSelectedHotbarIndex] = useState(0);
  const [isInventoryOpen, setIsInventoryOpen] = useState(false);
  const [cameraMode, setCameraMode] = useState<'fps' | 'orbit'>('orbit');
  const [showGrid, setShowGrid] = useState(true);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedBlockId = hotbarSlots[selectedHotbarIndex];

  // Handle block placement
  const handlePlaceBlock = useCallback((x: number, y: number, z: number) => {
    if (selectedBlockId) {
      placeBlock(x, y, z, selectedBlockId);
    }
  }, [selectedBlockId, placeBlock]);

  // Handle block removal
  const handleRemoveBlock = useCallback((x: number, y: number, z: number) => {
    removeBlock(x, y, z);
  }, [removeBlock]);

  // Handle block selection from inventory
  const handleSelectBlock = useCallback((block: BlockDefinition) => {
    const newHotbar = [...hotbarSlots];
    newHotbar[selectedHotbarIndex] = block.id;
    setHotbarSlots(newHotbar);
    setIsInventoryOpen(false);
    toast.success(`Selected ${block.name}`);
  }, [hotbarSlots, selectedHotbarIndex]);

  // Export world
  const handleExport = useCallback(() => {
    const worldData = exportWorld();
    const json = exportWorldToJSON(worldData);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `voxel-map-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${worldData.blocks.length} blocks`);
  }, [exportWorld]);

  // Import world
  const handleImport = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = e.target?.result as string;
        const worldData = importWorldFromJSON(json);
        importWorld(worldData);
        toast.success(`Imported ${worldData.blocks.length} blocks`);
      } catch (error) {
        toast.error('Failed to import map file');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  }, [importWorld]);

  // Clear world
  const handleClear = useCallback(() => {
    if (confirm('Are you sure you want to clear all blocks?')) {
      clearWorld();
      toast.success('World cleared');
    }
  }, [clearWorld]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Number keys for hotbar
      if (event.code >= 'Digit1' && event.code <= 'Digit9') {
        const index = parseInt(event.code.replace('Digit', '')) - 1;
        setSelectedHotbarIndex(index);
        return;
      }

      switch (event.code) {
        case 'KeyE':
          setIsInventoryOpen(prev => !prev);
          break;
        case 'KeyG':
          setShowGrid(prev => !prev);
          break;
        case 'KeyC':
          setCameraMode(prev => prev === 'fps' ? 'orbit' : 'fps');
          break;
        case 'Escape':
          setIsInventoryOpen(false);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="w-full h-screen bg-editor-bg relative overflow-hidden">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* 3D Canvas */}
      <VoxelCanvas
        blockMap={getBlockMap()}
        version={version}
        selectedBlockId={selectedBlockId}
        showGrid={showGrid}
        cameraMode={cameraMode}
        onPlaceBlock={handlePlaceBlock}
        onRemoveBlock={handleRemoveBlock}
      />

      {/* Editor Controls */}
      <EditorControls
        blockCount={getBlockCount()}
        cameraMode={cameraMode}
        showGrid={showGrid}
        onToggleCameraMode={() => setCameraMode(prev => prev === 'fps' ? 'orbit' : 'fps')}
        onToggleGrid={() => setShowGrid(prev => !prev)}
        onExport={handleExport}
        onImport={handleImport}
        onClear={handleClear}
      />

      {/* Hotbar */}
      <Hotbar
        slots={hotbarSlots}
        selectedIndex={selectedHotbarIndex}
        onSelectIndex={setSelectedHotbarIndex}
        onOpenInventory={() => setIsInventoryOpen(true)}
      />

      {/* Block Inventory Modal */}
      <BlockInventory
        isOpen={isInventoryOpen}
        onClose={() => setIsInventoryOpen(false)}
        onSelectBlock={handleSelectBlock}
        selectedBlockId={selectedBlockId}
      />
    </div>
  );
}
