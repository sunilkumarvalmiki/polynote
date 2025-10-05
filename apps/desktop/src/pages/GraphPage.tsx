import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { DataSet } from 'vis-data';
import { Network, Edge, Node } from 'vis-network';
import { Eye, EyeOff, Settings } from 'lucide-react';
import clsx from 'clsx';
import 'vis-network/styles/vis-network.css';

export function GraphPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const networkRef = useRef<Network | null>(null);
  const [graphEnabled, setGraphEnabled] = useState(true);
  const [showOptions, setShowOptions] = useState(false);
  const [physicsEnabled, setPhysicsEnabled] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [groupByTags, setGroupByTags] = useState(false);

  const { data: graphData } = useQuery({
    queryKey: ['graph'],
    queryFn: () => window.electronAPI?.getGraph(),
  });

  useEffect(() => {
    if (!containerRef.current || !graphData) return;

    // Create network - vis-network DataSet expects different property names
    const nodeData: Node[] = (graphData.nodes || []).map(node => ({
      id: node.id,
      label: node.label,
      group: node.type,
    }));
    
    // Map edges to vis-network format - edges need id property
    const edgeData: Edge[] = (graphData.edges || []).map((edge, index) => ({
      id: `edge-${index}`,
      from: edge.source,
      to: edge.target,
      label: edge.label,
    }));
    
    const nodes = new DataSet(nodeData);
    const edges = new DataSet(edgeData);

    const options = {
      nodes: {
        shape: 'dot',
        size: 16,
        font: {
          size: showLabels ? 14 : 0,
          color: '#ffffff',
        },
        borderWidth: 2,
        borderWidthSelected: 4,
      },
      edges: {
        width: 2,
        color: {
          color: '#848484',
          highlight: '#3b82f6',
        },
        smooth: {
          enabled: true,
          type: 'continuous',
          roundness: 0.5,
        },
      },
      physics: {
        enabled: physicsEnabled,
        stabilization: {
          iterations: 200,
        },
        barnesHut: {
          gravitationalConstant: -2000,
          springConstant: 0.001,
          springLength: 200,
        },
      },
      interaction: {
        hover: true,
        navigationButtons: true,
        keyboard: true,
        zoomView: true,
      },
      configure: {
        enabled: false,
        filter: true,
        container: undefined,
        showButton: true,
      },
    };

    networkRef.current = new Network(containerRef.current, { nodes, edges }, options);

    return () => {
      networkRef.current?.destroy();
    };
  }, [graphData, physicsEnabled, showLabels, groupByTags]);

  return (
    <div className="h-full flex flex-col">
      <div className="border-b border-border p-4 bg-card flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Knowledge Graph</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Visualize connections between your notes
          </p>
        </div>
        
        {/* Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setGraphEnabled(!graphEnabled)}
            className={clsx(
              "flex items-center gap-2 px-4 py-2 rounded-lg transition-colors",
              graphEnabled
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
            aria-label={graphEnabled ? "Disable graph" : "Enable graph"}
          >
            {graphEnabled ? <Eye size={16} /> : <EyeOff size={16} />}
            <span>{graphEnabled ? 'Enabled' : 'Disabled'}</span>
          </button>
          
          <button
            onClick={() => setShowOptions(!showOptions)}
            className="px-4 py-2 bg-muted hover:bg-muted/80 rounded-lg transition-colors"
            aria-label="Graph settings"
          >
            <Settings size={16} />
          </button>
        </div>
      </div>
      
      {/* Options Panel */}
      {showOptions && (
        <div className="border-b border-border p-4 bg-muted/30">
          <div className="max-w-4xl space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Physics Simulation</label>
              <input
                type="checkbox"
                checked={physicsEnabled}
                onChange={(e) => setPhysicsEnabled(e.target.checked)}
                className="toggle"
              />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Show Node Labels</label>
              <input
                type="checkbox"
                checked={showLabels}
                onChange={(e) => setShowLabels(e.target.checked)}
                className="toggle"
              />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Group by Tags</label>
              <input
                type="checkbox"
                checked={groupByTags}
                onChange={(e) => setGroupByTags(e.target.checked)}
                className="toggle"
              />
            </div>
          </div>
        </div>
      )}
      
      {graphEnabled ? (
        <div ref={containerRef} className="flex-1 bg-background" style={{ height: '100%' }} />
      ) : (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          <div className="text-center">
            <EyeOff size={48} className="mx-auto mb-4 opacity-50" />
            <p>Graph visualization is disabled</p>
            <button
              onClick={() => setGraphEnabled(true)}
              className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
            >
              Enable Graph
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
