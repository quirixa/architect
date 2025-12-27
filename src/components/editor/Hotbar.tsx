import { BLOCK_BY_ID } from '@/data/blockRegistry';
import { BlockIcon } from './BlockIcon';
import { cn } from '@/lib/utils';

interface HotbarProps {
  slots: number[];
  selectedIndex: number;
  onSelectIndex: (index: number) => void;
  onOpenInventory: () => void;
}

export function Hotbar({ slots, selectedIndex, onSelectIndex, onOpenInventory }: HotbarProps) {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
      <div className="editor-panel p-2 flex gap-1 items-center animate-fade-in">
        {slots.map((blockId, index) => {
          const block = BLOCK_BY_ID.get(blockId);
          const isSelected = index === selectedIndex;
          
          return (
            <div key={index} className="relative">
              <div
                onClick={() => onSelectIndex(index)}
                className={cn(
                  'hotbar-slot',
                  isSelected && 'hotbar-slot-selected'
                )}
              >
                {block ? (
                  <BlockIcon block={block} size="lg" />
                ) : (
                  <div className="w-10 h-10 border border-dashed border-muted-foreground/30 rounded" />
                )}
              </div>
              {/* Hotkey number */}
              <span className={cn(
                'absolute -top-1 -left-1 w-5 h-5 rounded text-xs font-mono flex items-center justify-center',
                isSelected 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-muted text-muted-foreground'
              )}>
                {index + 1}
              </span>
            </div>
          );
        })}
        
        {/* Inventory button */}
        <button
          onClick={onOpenInventory}
          className="hotbar-slot hover:border-primary/60 ml-2"
          title="Open Inventory (E)"
        >
          <svg className="w-6 h-6 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
          </svg>
        </button>
      </div>
      
      {/* Controls hint */}
      <div className="text-center mt-2 text-xs text-muted-foreground font-mono">
        <span className="opacity-60">1-9 Select • E Inventory • LMB Place • RMB Remove</span>
      </div>
    </div>
  );
}
