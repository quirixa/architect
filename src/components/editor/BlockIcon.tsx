import { BlockDefinition } from '@/data/blockRegistry';
import { cn } from '@/lib/utils';

interface BlockIconProps {
  block: BlockDefinition;
  size?: 'sm' | 'md' | 'lg';
  selected?: boolean;
  onClick?: () => void;
  showName?: boolean;
}

const sizeClasses = {
  sm: 'w-8 h-8',
  md: 'w-10 h-10',
  lg: 'w-12 h-12',
};

export function BlockIcon({ block, size = 'md', selected, onClick, showName }: BlockIconProps) {
  // Create a 3D-like block appearance using CSS
  const baseColor = block.texture;
  
  return (
    <div
      onClick={onClick}
      className={cn(
        'block-slot relative cursor-pointer transition-all duration-100',
        sizeClasses[size],
        selected && 'block-slot-selected',
        onClick && 'hover:scale-105 active:scale-95'
      )}
      title={block.name}
    >
      {/* 3D block effect */}
      <div className="absolute inset-1 flex items-center justify-center">
        <div 
          className="w-full h-full rounded-sm relative overflow-hidden"
          style={{ 
            backgroundColor: baseColor,
            boxShadow: `inset 2px 2px 0 rgba(255,255,255,0.2), inset -2px -2px 0 rgba(0,0,0,0.3)`
          }}
        >
          {/* Top face highlight */}
          <div 
            className="absolute inset-0 opacity-20"
            style={{
              background: 'linear-gradient(135deg, rgba(255,255,255,0.4) 0%, transparent 50%)'
            }}
          />
          {/* Block pattern for some categories */}
          {block.category === 'tiles' && (
            <div className="absolute inset-0 opacity-30" 
              style={{
                backgroundImage: 'linear-gradient(45deg, rgba(0,0,0,0.1) 25%, transparent 25%, transparent 75%, rgba(0,0,0,0.1) 75%)',
                backgroundSize: '4px 4px'
              }}
            />
          )}
        </div>
      </div>
      
      {showName && (
        <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] text-muted-foreground whitespace-nowrap">
          {block.name}
        </div>
      )}
    </div>
  );
}
