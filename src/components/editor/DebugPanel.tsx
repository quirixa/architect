import { Activity, ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';

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

interface DebugPanelProps {
  debugInfo: DebugInfo;
}

export function DebugPanel({ debugInfo }: DebugPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="editor-panel w-48 animate-slide-in-right panel-shadow">
      <div 
        className="editor-panel-header py-1.5"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <Activity className="w-3 h-3 text-primary" />
          <span className="text-xs font-semibold uppercase tracking-wide">Debug</span>
        </div>
        {isExpanded ? (
          <ChevronDown className="w-3 h-3 text-muted-foreground" />
        ) : (
          <ChevronRight className="w-3 h-3 text-muted-foreground" />
        )}
      </div>
      
      {isExpanded && (
        <div className="p-2 space-y-1 animate-fade-in">
          <div className="flex justify-between">
            <span className="stat-label">FPS</span>
            <span className="stat-value">{debugInfo.fps.toFixed(0)}</span>
          </div>
          <div className="flex justify-between">
            <span className="stat-label">Triangles</span>
            <span className="stat-value">{debugInfo.triangles.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="stat-label">Geometries</span>
            <span className="stat-value">{debugInfo.geometries}</span>
          </div>
          <div className="border-t border-border my-2" />
          <div className="space-y-0.5">
            <span className="stat-label">Camera Position</span>
            <div className="grid grid-cols-3 gap-1 text-xs font-mono">
              <div>
                <span className="text-red-400">X: </span>
                <span className="text-foreground">{debugInfo.cameraPosition.x.toFixed(1)}</span>
              </div>
              <div>
                <span className="text-green-400">Y: </span>
                <span className="text-foreground">{debugInfo.cameraPosition.y.toFixed(1)}</span>
              </div>
              <div>
                <span className="text-blue-400">Z: </span>
                <span className="text-foreground">{debugInfo.cameraPosition.z.toFixed(1)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}