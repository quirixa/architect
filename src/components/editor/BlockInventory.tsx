import { useState, useMemo } from 'react';
import { X, Search } from 'lucide-react';
import { 
  BLOCK_REGISTRY, 
  BLOCK_CATEGORIES, 
  BlockCategory, 
  getBlocksByCategory,
  BlockDefinition 
} from '@/data/blockRegistry';
import { BlockIcon } from './BlockIcon';
import { cn } from '@/lib/utils';

interface BlockInventoryProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectBlock: (block: BlockDefinition) => void;
  selectedBlockId: number | null;
}

export function BlockInventory({ isOpen, onClose, onSelectBlock, selectedBlockId }: BlockInventoryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<BlockCategory>('all');

  const filteredBlocks = useMemo(() => {
    let blocks = getBlocksByCategory(activeCategory);
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      blocks = blocks.filter(block => 
        block.name.toLowerCase().includes(query) ||
        block.category.toLowerCase().includes(query)
      );
    }
    
    return blocks;
  }, [activeCategory, searchQuery]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="editor-panel w-full max-w-3xl max-h-[80vh] flex flex-col animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">Block Inventory</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-secondary rounded-md transition-colors"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search blocks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input pl-10"
              autoFocus
            />
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex gap-1 p-3 border-b border-border overflow-x-auto scrollbar-thin">
          {BLOCK_CATEGORIES.map(category => (
            <button
              key={category.id}
              onClick={() => setActiveCategory(category.id)}
              className={cn(
                'category-tab whitespace-nowrap',
                activeCategory === category.id && 'category-tab-active'
              )}
            >
              {category.label}
            </button>
          ))}
        </div>

        {/* Block Grid */}
        <div className="flex-1 overflow-y-auto p-4 scrollbar-thin">
          {filteredBlocks.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No blocks found matching "{searchQuery}"
            </div>
          ) : (
            <div className="grid grid-cols-8 gap-2">
              {filteredBlocks.map(block => (
                <div key={block.id} className="flex flex-col items-center gap-1">
                  <BlockIcon
                    block={block}
                    size="lg"
                    selected={selectedBlockId === block.id}
                    onClick={() => onSelectBlock(block)}
                  />
                  <span className="text-[10px] text-muted-foreground text-center leading-tight line-clamp-2">
                    {block.name}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="p-3 border-t border-border text-xs text-muted-foreground text-center">
          {BLOCK_REGISTRY.length} blocks available • Click to select • Press E to close
        </div>
      </div>
    </div>
  );
}
