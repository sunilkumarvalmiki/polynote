import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { DataSet } from 'vis-data';
import { Network, Edge, Node } from 'vis-network';
import 'vis-network/styles/vis-network.css';

export function GraphPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const networkRef = useRef<Network | null>(null);

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
          size: 14,
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
      },
    };

    networkRef.current = new Network(containerRef.current, { nodes, edges }, options);

    return () => {
      networkRef.current?.destroy();
    };
  }, [graphData]);

  return (
    <div className="h-full flex flex-col">
      <div className="border-b border-border p-4 bg-card">
        <h1 className="text-2xl font-bold">Knowledge Graph</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Visualize connections between your notes
        </p>
      </div>
      <div ref={containerRef} className="flex-1 bg-background" style={{ height: '100%' }} />
    </div>
  );
}
