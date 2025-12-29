import { useState } from 'react';
import { 
  Download, 
  Upload, 
  Trash2, 
  Grid3X3, 
  MousePointer2,
  Keyboard,
  ChevronDown,
  ChevronUp,
  Box,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface EditorControlsProps {
  blockCount: number;
  cameraMode: 'fps'; // Only FPS mode now
  showGrid: boolean;
  onToggleCameraMode: () => void; // Can be removed or kept for future expansion
  onToggleGrid: () => void;
  onExport: () => void;
  onImport: () => void;
  onClear: () => void;
}

export function EditorControls({
  blockCount,
  cameraMode, // Always 'fps'
  showGrid,
  onToggleCameraMode,
  onToggleGrid,
  onExport,
  onImport,
  onClear,
}: EditorControlsProps) {
  const [showHelp, setShowHelp] = useState(false);

  return (
    <>
      {/* Top Left - Stats & Tools */}
      <div className="fixed top-4 left-4 z-40 flex flex-col gap-2">
        {/* Stats Panel */}
        <div className="editor-panel px-4 py-2 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Box className="w-4 h-4 text-primary" />
            <span className="font-mono text-sm">{blockCount.toLocaleString()}</span>
            <span className="text-xs text-muted-foreground">blocks</span>
          </div>
        </div>

        {/* Camera Mode - Only FPS Mode */}
        <div className="editor-button flex items-center gap-2 border-primary/50 bg-primary/10">
          <MousePointer2 className="w-4 h-4" />
          <span className="text-sm">FPS Mode</span>
        </div>

        {/* Grid Toggle */}
        <button
          onClick={onToggleGrid}
          className={cn(
            'editor-button flex items-center gap-2',
            showGrid && 'border-primary/50 bg-primary/10'
          )}
        >
          <Grid3X3 className="w-4 h-4" />
          <span className="text-sm">Grid {showGrid ? 'On' : 'Off'}</span>
        </button>
      </div>

      {/* Top Right - File Operations */}
      <div className="fixed bottom-4 right-4 z-40 flex flex-col gap-2">
        <button onClick={onExport} className="editor-button-primary flex items-center gap-2">
          <Download className="w-4 h-4" />
          <span className="text-sm">Export JSON</span>
        </button>
        
        <button onClick={onImport} className="editor-button flex items-center gap-2">
          <Upload className="w-4 h-4" />
          <span className="text-sm">Import</span>
        </button>
        
        <button 
          onClick={onClear}
          className="editor-button flex items-center gap-2 hover:border-destructive/50 hover:text-destructive"
        >
          <Trash2 className="w-4 h-4" />
          <span className="text-sm">Clear All</span>
        </button>
      </div>

      {/* Bottom Left - Help */}
      <div className="fixed bottom-4 left-4 z-40">
        <div className="editor-panel">
          <button
            onClick={() => setShowHelp(!showHelp)}
            className="px-3 py-2 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <Keyboard className="w-4 h-4" />
            <span>Controls</span>
            {showHelp ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
          
          {showHelp && (
            <div className="px-3 pb-3 space-y-2 text-xs border-t border-border pt-2 mt-1">
              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                <span className="font-mono text-primary">WASD</span>
                <span className="text-muted-foreground">Move</span>
                
                <span className="font-mono text-primary">Space</span>
                <span className="text-muted-foreground">Up</span>
                
                <span className="font-mono text-primary">Shift</span>
                <span className="text-muted-foreground">Down</span>
                
                <span className="font-mono text-primary">Mouse</span>
                <span className="text-muted-foreground">Look</span>
                
                <span className="font-mono text-primary">LMB</span>
                <span className="text-muted-foreground">Place Block</span>
                
                <span className="font-mono text-primary">RMB</span>
                <span className="text-muted-foreground">Remove Block</span>
                
                <span className="font-mono text-primary">1-9</span>
                <span className="text-muted-foreground">Select Hotbar</span>
                
                <span className="font-mono text-primary">E</span>
                <span className="text-muted-foreground">Inventory</span>
                
                <span className="font-mono text-primary">G</span>
                <span className="text-muted-foreground">Toggle Grid</span>
                
                <span className="font-mono text-primary">ESC</span>
                <span className="text-muted-foreground">Exit FPS</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}