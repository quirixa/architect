// Block Registry - All block definitions with placeholder textures
// Textures are solid colors that can be replaced later

export type BlockCategory = 
  | 'all'
  | 'full-blocks'
  | 'slabs'
  | 'wall-items'
  | 'decorations'
  | 'tiles'
  | 'pillars'
  | 'solid-colors';

export interface BlockDefinition {
  id: number;
  name: string;
  category: BlockCategory;
  texture: string; // Hex color for placeholder
  solid: boolean;
  collision: boolean;
  transparent?: boolean;
}

export const BLOCK_CATEGORIES: { id: BlockCategory; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'full-blocks', label: 'Full Blocks' },
  { id: 'slabs', label: 'Slabs' },
  { id: 'wall-items', label: 'Wall Items' },
  { id: 'decorations', label: 'Decorations' },
  { id: 'tiles', label: 'Tiles' },
  { id: 'pillars', label: 'Pillars' },
  { id: 'solid-colors', label: 'Solid Colors' },
];

// Block Registry with placeholder textures (solid colors)
export const BLOCK_REGISTRY: BlockDefinition[] = [
  // Full Blocks
  { id: 1, name: 'Stone', category: 'full-blocks', texture: '#808080', solid: true, collision: true },
  { id: 2, name: 'Cobblestone', category: 'full-blocks', texture: '#696969', solid: true, collision: true },
  { id: 3, name: 'Brick', category: 'full-blocks', texture: '#B35A3C', solid: true, collision: true },
  { id: 4, name: 'Concrete', category: 'full-blocks', texture: '#9E9E9E', solid: true, collision: true },
  { id: 5, name: 'Metal', category: 'full-blocks', texture: '#71797E', solid: true, collision: true },
  { id: 6, name: 'Wood Planks', category: 'full-blocks', texture: '#A0785A', solid: true, collision: true },
  { id: 7, name: 'Dark Wood', category: 'full-blocks', texture: '#5D4037', solid: true, collision: true },
  { id: 8, name: 'Sandstone', category: 'full-blocks', texture: '#D4C4A8', solid: true, collision: true },
  { id: 9, name: 'Obsidian', category: 'full-blocks', texture: '#1A1A2E', solid: true, collision: true },
  { id: 10, name: 'Glass', category: 'full-blocks', texture: '#E0F7FA', solid: true, collision: true, transparent: true },
  { id: 11, name: 'Dirt', category: 'full-blocks', texture: '#8B5A2B', solid: true, collision: true },
  { id: 12, name: 'Grass', category: 'full-blocks', texture: '#567D46', solid: true, collision: true },
  
  // Slabs
  { id: 20, name: 'Stone Slab', category: 'slabs', texture: '#808080', solid: true, collision: true },
  { id: 21, name: 'Wood Slab', category: 'slabs', texture: '#A0785A', solid: true, collision: true },
  { id: 22, name: 'Concrete Slab', category: 'slabs', texture: '#9E9E9E', solid: true, collision: true },
  { id: 23, name: 'Brick Slab', category: 'slabs', texture: '#B35A3C', solid: true, collision: true },
  { id: 24, name: 'Metal Slab', category: 'slabs', texture: '#71797E', solid: true, collision: true },
  { id: 25, name: 'Sandstone Slab', category: 'slabs', texture: '#D4C4A8', solid: true, collision: true },
  
  // Wall Items
  { id: 30, name: 'Wall Torch', category: 'wall-items', texture: '#FFA500', solid: false, collision: false },
  { id: 31, name: 'Wall Sign', category: 'wall-items', texture: '#A0785A', solid: false, collision: false },
  { id: 32, name: 'Wall Lamp', category: 'wall-items', texture: '#FFE4B5', solid: false, collision: false },
  { id: 33, name: 'Wall Vent', category: 'wall-items', texture: '#4A4A4A', solid: false, collision: false },
  { id: 34, name: 'Wall Panel', category: 'wall-items', texture: '#6E6E6E', solid: false, collision: false },
  { id: 35, name: 'Wall Screen', category: 'wall-items', texture: '#1E90FF', solid: false, collision: false },
  
  // Decorations
  { id: 40, name: 'Crate', category: 'decorations', texture: '#8B4513', solid: true, collision: true },
  { id: 41, name: 'Barrel', category: 'decorations', texture: '#654321', solid: true, collision: true },
  { id: 42, name: 'Box', category: 'decorations', texture: '#D2691E', solid: true, collision: true },
  { id: 43, name: 'Computer', category: 'decorations', texture: '#2F4F4F', solid: true, collision: true },
  { id: 44, name: 'Chair', category: 'decorations', texture: '#3E3E3E', solid: false, collision: true },
  { id: 45, name: 'Table', category: 'decorations', texture: '#5D4E37', solid: false, collision: true },
  { id: 46, name: 'Plant Pot', category: 'decorations', texture: '#228B22', solid: false, collision: true },
  { id: 47, name: 'Trash Can', category: 'decorations', texture: '#4A4A4A', solid: false, collision: true },
  
  // Tiles
  { id: 50, name: 'Floor Tile', category: 'tiles', texture: '#C0C0C0', solid: true, collision: true },
  { id: 51, name: 'Checkered Tile', category: 'tiles', texture: '#E8E8E8', solid: true, collision: true },
  { id: 52, name: 'Industrial Tile', category: 'tiles', texture: '#505050', solid: true, collision: true },
  { id: 53, name: 'Hazard Tile', category: 'tiles', texture: '#FFD700', solid: true, collision: true },
  { id: 54, name: 'Grate', category: 'tiles', texture: '#3C3C3C', solid: true, collision: true, transparent: true },
  { id: 55, name: 'Carpet', category: 'tiles', texture: '#8B0000', solid: true, collision: true },
  
  // Pillars
  { id: 60, name: 'Stone Pillar', category: 'pillars', texture: '#A0A0A0', solid: true, collision: true },
  { id: 61, name: 'Metal Pillar', category: 'pillars', texture: '#5A5A5A', solid: true, collision: true },
  { id: 62, name: 'Wood Pillar', category: 'pillars', texture: '#8B7355', solid: true, collision: true },
  { id: 63, name: 'Concrete Pillar', category: 'pillars', texture: '#BEBEBE', solid: true, collision: true },
  { id: 64, name: 'Industrial Beam', category: 'pillars', texture: '#4A4A4A', solid: true, collision: true },
  
  // Solid Colors
  { id: 70, name: 'White', category: 'solid-colors', texture: '#FFFFFF', solid: true, collision: true },
  { id: 71, name: 'Black', category: 'solid-colors', texture: '#1A1A1A', solid: true, collision: true },
  { id: 72, name: 'Red', category: 'solid-colors', texture: '#DC143C', solid: true, collision: true },
  { id: 73, name: 'Blue', category: 'solid-colors', texture: '#1E90FF', solid: true, collision: true },
  { id: 74, name: 'Green', category: 'solid-colors', texture: '#32CD32', solid: true, collision: true },
  { id: 75, name: 'Yellow', category: 'solid-colors', texture: '#FFD700', solid: true, collision: true },
  { id: 76, name: 'Orange', category: 'solid-colors', texture: '#FF8C00', solid: true, collision: true },
  { id: 77, name: 'Purple', category: 'solid-colors', texture: '#8B008B', solid: true, collision: true },
  { id: 78, name: 'Cyan', category: 'solid-colors', texture: '#00CED1', solid: true, collision: true },
  { id: 79, name: 'Pink', category: 'solid-colors', texture: '#FF69B4', solid: true, collision: true },
  { id: 80, name: 'Gray', category: 'solid-colors', texture: '#808080', solid: true, collision: true },
  { id: 81, name: 'Brown', category: 'solid-colors', texture: '#8B4513', solid: true, collision: true },
];

// Create a lookup map for quick access by ID
export const BLOCK_BY_ID = new Map<number, BlockDefinition>(
  BLOCK_REGISTRY.map(block => [block.id, block])
);

// Get blocks by category
export function getBlocksByCategory(category: BlockCategory): BlockDefinition[] {
  if (category === 'all') {
    return BLOCK_REGISTRY;
  }
  return BLOCK_REGISTRY.filter(block => block.category === category);
}

// Export format for the world map
export interface WorldData {
  version: string;
  size: { x: number; y: number; z: number };
  blocks: { x: number; y: number; z: number; id: number }[];
  metadata?: Record<string, unknown>;
}

export function createEmptyWorld(sizeX = 32, sizeY = 16, sizeZ = 32): WorldData {
  return {
    version: '1.0.0',
    size: { x: sizeX, y: sizeY, z: sizeZ },
    blocks: [],
  };
}

export function exportWorldToJSON(world: WorldData): string {
  return JSON.stringify(world, null, 2);
}

export function importWorldFromJSON(json: string): WorldData {
  const data = JSON.parse(json);
  if (!data.version || !data.size || !data.blocks) {
    throw new Error('Invalid world data format');
  }
  return data as WorldData;
}
