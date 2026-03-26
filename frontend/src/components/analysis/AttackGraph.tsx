/**
 * 攻击链路图组件
 * 使用 React Flow 渲染交互式攻击链路可视化
 */

import { useCallback } from 'react';
import ReactFlow, {
  Controls,
  MiniMap,
  Background,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
} from '@xyflow/react';
import dagre from 'dagre';
import '@xyflow/react/dist/style.css';
import type { AttackNode, AttackEdge, Severity } from '../../types/analysis';

// 节点形状映射
const nodeTypeConfig = {
  host: { shape: 'circle', color: '#06b6d4' },
  user: { shape: 'rect', color: '#8b5cf6' },
  ip: { shape: 'diamond', color: '#f59e0b' },
  process: { shape: 'hexagon', color: '#ef4444' },
};

// 严重度颜色
const severityColors: Record<Severity, string> = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  low: '#22c55e',
};

// 攻击图属性
export interface AttackGraphProps {
  nodes: AttackNode[];
  edges: AttackEdge[];
  onNodeClick?: (nodeId: string) => void;
  onEdgeClick?: (edgeId: string) => void;
}

// 使用 dagre 计算布局
function getLayoutedElements(
  nodes: AttackNode[],
  edges: AttackEdge[]
): { layoutedNodes: Node[]; layoutedEdges: Edge[] } {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  dagreGraph.setGraph({
    rankdir: 'LR', // 从左到右布局
    nodesep: 50,
    ranksep: 100,
  });

  // 添加节点
  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: 150, height: 50 });
  });

  // 添加边
  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  // 计算布局
  dagre.layout(dagreGraph);

  // 应用布局到节点
  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      id: node.id,
      type: node.type,
      data: {
        label: node.label,
        ...node.data,
      },
      position: {
        x: nodeWithPosition.x - 75,
        y: nodeWithPosition.y - 25,
      },
      style: {
        background: nodeTypeConfig[node.type]?.color || '#6b7280',
        color: '#fff',
        border: node.severity ? `2px solid ${severityColors[node.severity]}` : 'none',
        borderRadius: node.type === 'host' ? '50%' : '4px',
      },
    };
  });

  // 应用样式到边
  const layoutedEdges = edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    type: 'smoothstep',
    animated: edge.animated,
    style: {
      stroke: edge.type === 'confirmed' ? '#22c55e' : '#f97316',
      strokeWidth: 2,
      strokeDasharray: edge.type === 'suspected' ? '5,5' : undefined,
    },
  }));

  return { layoutedNodes, layoutedEdges };
}

// 攻击图组件
export function AttackGraph({
  nodes,
  edges,
  onNodeClick,
  onEdgeClick,
}: AttackGraphProps) {
  const { layoutedNodes, layoutedEdges } = getLayoutedElements(nodes, edges);
  const [flowNodes, setNodes, onNodesChange] = useNodesState(layoutedNodes);
  const [flowEdges, setEdges, onEdgesChange] = useEdgesState(layoutedEdges);

  // 节点点击处理
  const handleNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    onNodeClick?.(node.id);
  }, [onNodeClick]);

  // 边点击处理
  const handleEdgeClick = useCallback((event: React.MouseEvent, edge: Edge) => {
    onEdgeClick?.(edge.id);
  }, [onEdgeClick]);

  return (
    <div className="w-full h-full bg-slate-900 rounded-lg">
      <ReactFlow
        nodes={flowNodes}
        edges={flowEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        onEdgeClick={handleEdgeClick}
        fitView
        attributionPosition="bottom-left"
      >
        <Controls />
        <MiniMap
          nodeColor={(node) => (node.style?.background as string) || '#6b7280'}
          maskColor="rgba(0, 0, 0, 0.8)"
        />
        <Background color="#334155" gap={16} />
      </ReactFlow>
    </div>
  );
}

export default AttackGraph;
