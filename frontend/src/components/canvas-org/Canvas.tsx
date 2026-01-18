import { useCallback, useEffect, useState, useMemo, useRef } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  BackgroundVariant,
} from '@xyflow/react';
import type { Connection, Node, Edge, NodeTypes, NodeChange } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import ChatNodeComponent from './nodes/ChatNodeComponent';
import InputPanel from './ui/InputPanel';
import NodeEditModal from './ui/NodeEditModal';
import { useCanvasStore } from '../../stores/canvasStore';
import { getLayoutedElements } from '../../utils/layoutUtils';
import type { ChatNode, NodeData } from '../../types';

const nodeTypes: NodeTypes = {
  chatNode: ChatNodeComponent as any,
};

export default function Canvas() {
  const {
    currentCanvas,
    nodes: chatNodes,
    selectedNodeId,
    selectNode,
    addNode,
    updateNode,
    deleteNode,
  } = useCanvasStore();

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);

  // 노드 위치 캐시 (드래그 위치 유지용)
  const nodePositionsRef = useRef<Map<string, { x: number; y: number }>>(new Map());

  // 노드 삭제 이벤트를 필터링하는 핸들러 (React Flow 내부 삭제 방지)
  const handleNodesChange = useCallback((changes: NodeChange[]) => {
    // 삭제 변경사항은 무시 (삭제는 우리 핸들러를 통해서만)
    const filteredChanges = changes.filter((change) => change.type !== 'remove');
    onNodesChange(filteredChanges);
  }, [onNodesChange]);

  // ChatNode를 React Flow Node로 변환 (selectedNodeId 의존성 제거)
  const convertToFlowNodes = useCallback(
    (chatNodes: ChatNode[], selectedId: string | null): Node[] => {
      return chatNodes.map((chatNode) => {
        // 캐시된 위치가 있으면 사용 (드래그 중 위치 유지)
        const cachedPosition = nodePositionsRef.current.get(chatNode.id);
        const position = cachedPosition || chatNode.position;

        return {
          id: chatNode.id,
          type: 'chatNode',
          position,
          data: {
            chatNode,
            isSelected: selectedId === chatNode.id,
          },
        };
      });
    },
    []
  );

  // ChatNode에서 Edge 생성
  const createEdges = useCallback((chatNodes: ChatNode[]): Edge[] => {
    return chatNodes
      .filter((node) => node.parentId)
      .map((node) => ({
        id: `${node.parentId}-${node.id}`,
        source: node.parentId!,
        target: node.id,
        type: 'smoothstep',
        animated: true,
        style: { stroke: '#06b6d4', strokeWidth: 2 },  // 시안 색상
      }));
  }, []);

  // 자식 노드 맵 생성 (O(n) 한 번만 - 성능 최적화)
  const childrenMap = useMemo(() => {
    const map = new Map<string, ChatNode[]>();
    for (const node of chatNodes) {
      if (node.parentId) {
        const siblings = map.get(node.parentId) || [];
        siblings.push(node);
        map.set(node.parentId, siblings);
      }
    }
    return map;
  }, [chatNodes]);

  // 자손 수 캐시 (memoized - O(n) 한 번만)
  const descendantCountCache = useMemo(() => {
    const cache = new Map<string, number>();

    const count = (nodeId: string): number => {
      if (cache.has(nodeId)) return cache.get(nodeId)!;

      const children = childrenMap.get(nodeId) || [];
      let total = children.length;
      for (const child of children) {
        total += count(child.id);
      }
      cache.set(nodeId, total);
      return total;
    };

    // 모든 노드에 대해 미리 계산
    for (const node of chatNodes) {
      count(node.id);
    }
    return cache;
  }, [chatNodes, childrenMap]);

  // 하위 노드 수를 O(1)로 조회
  const countDescendants = useCallback((nodeId: string): number => {
    return descendantCountCache.get(nodeId) || 0;
  }, [descendantCountCache]);

  // 접혀있는 노드의 하위 노드 ID 목록 가져오기 (Map 기반 최적화)
  const getHiddenNodeIds = useCallback((): Set<string> => {
    const hiddenIds = new Set<string>();

    const collectDescendants = (parentId: string) => {
      const children = childrenMap.get(parentId) || [];
      for (const child of children) {
        hiddenIds.add(child.id);
        collectDescendants(child.id);
      }
    };

    // 접힌 노드의 모든 하위 노드를 숨김 목록에 추가
    for (const node of chatNodes) {
      if (node.isCollapsed) {
        collectDescendants(node.id);
      }
    }

    return hiddenIds;
  }, [chatNodes, childrenMap]);

  // 노드 콜백 함수들 (노드 컴포넌트에 전달) - onToggleCollapse 포함
  const nodeCallbacks = useMemo(() => ({
    onAddChild: async (parentId: string) => {
      if (!currentCanvas) return;
      const parent = chatNodes.find((n) => n.id === parentId);
      if (!parent) return;
      const siblings = chatNodes.filter((n) => n.parentId === parentId);
      const offsetX = siblings.length * 250;
      const newNode = await addNode({
        canvasId: currentCanvas.id,
        parentId,
        type: 'user',
        content: '',
        summary: '',
        isCompressed: false,
        position: {
          x: parent.position.x + offsetX,
          y: parent.position.y + 150,
        },
      });
      setEditingNodeId(newNode.id);
      selectNode(newNode.id);
    },
    onEdit: (id: string) => setEditingNodeId(id),
    onDelete: async (nodeId: string) => {
      if (confirm('이 노드와 하위 노드를 모두 삭제하시겠습니까?')) {
        await deleteNode(nodeId);
      }
    },
    onToggleCollapse: async (nodeId: string) => {
      const node = chatNodes.find(n => n.id === nodeId);
      if (node) {
        await updateNode(nodeId, { isCollapsed: !node.isCollapsed });
      }
    },
  }), [currentCanvas, chatNodes, addNode, selectNode, deleteNode, updateNode]);

  // 노드 변경 시 React Flow 업데이트 (스마트 업데이트)
  useEffect(() => {
    // 숨겨진 노드 ID 목록 가져오기
    const hiddenIds = getHiddenNodeIds();

    // 숨겨지지 않은 노드만 필터링
    const visibleChatNodes = chatNodes.filter(n => !hiddenIds.has(n.id));

    setNodes((prevNodes) => {
      const newFlowNodes = convertToFlowNodes(visibleChatNodes, selectedNodeId);

      // 노드 ID별로 맵핑
      const prevNodeMap = new Map(prevNodes.map(n => [n.id, n]));

      return newFlowNodes.map((newNode) => {
        const prevNode = prevNodeMap.get(newNode.id);
        const chatNode = visibleChatNodes.find(n => n.id === newNode.id);
        const childCount = chatNode ? countDescendants(chatNode.id) : 0;

        // 기존 노드가 있으면 위치 유지, data만 업데이트
        if (prevNode) {
          return {
            ...prevNode,
            data: {
              ...newNode.data,
              ...nodeCallbacks,
              childCount,
            },
          };
        }

        // 새 노드는 콜백 추가하여 반환
        return {
          ...newNode,
          data: {
            ...newNode.data,
            ...nodeCallbacks,
            childCount,
          },
        };
      });
    });

    // 엣지도 숨겨진 노드 제외
    const visibleEdges = createEdges(chatNodes).filter(
      edge => !hiddenIds.has(edge.source) && !hiddenIds.has(edge.target)
    );
    setEdges(visibleEdges);
  }, [chatNodes, selectedNodeId, convertToFlowNodes, createEdges, setNodes, setEdges, nodeCallbacks, getHiddenNodeIds, countDescendants]);

  // 루트 노드 추가
  const handleAddRootNode = useCallback(async () => {
    if (!currentCanvas) return;

    const newNode = await addNode({
      canvasId: currentCanvas.id,
      parentId: null,
      type: 'user',
      content: '',
      summary: '',
      isCompressed: false,
      position: { x: 400, y: 100 },
    });

    setEditingNodeId(newNode.id);
    selectNode(newNode.id);
  }, [currentCanvas, addNode, selectNode]);

  // 노드 위치 변경 저장
  const onNodeDragStop = useCallback(
    (_: any, node: Node) => {
      updateNode(node.id, { position: node.position });
    },
    [updateNode]
  );

  // 노드 클릭
  const onNodeClick = useCallback(
    (_: any, node: Node) => {
      selectNode(node.id);
    },
    [selectNode]
  );

  // 캔버스 클릭 (선택 해제)
  const onPaneClick = useCallback(() => {
    selectNode(null);
  }, [selectNode]);

  // 연결 생성
  const onConnect = useCallback(
    (connection: Connection) => {
      if (connection.source && connection.target) {
        updateNode(connection.target, { parentId: connection.source });
        setEdges((eds) => addEdge(connection, eds));
      }
    },
    [updateNode, setEdges]
  );

  // 자동 레이아웃
  const handleAutoLayout = useCallback(async () => {
    if (nodes.length === 0) return;

    const { nodes: layoutedNodes } = getLayoutedElements(nodes, edges, 'TB');

    // 애니메이션을 위해 노드 위치 업데이트
    setNodes(layoutedNodes);

    // DB에도 위치 저장
    for (const node of layoutedNodes) {
      await updateNode(node.id, { position: node.position });
    }
  }, [nodes, edges, setNodes, updateNode]);

  if (!currentCanvas) {
    return (
      <div className="flex items-center justify-center h-full text-white/50">
        캔버스를 선택하거나 새로 만들어주세요.
      </div>
    );
  }

  return (
    <div className="w-full h-full relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onNodeDragStop={onNodeDragStop}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        fitView
        minZoom={0.1}
        maxZoom={2}
        defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={24}
          size={1.5}
          color="#334155"
        />
        <Controls className="!bg-slate-800/90 !border-slate-600/50 !rounded-xl !shadow-xl backdrop-blur-sm" />
        <MiniMap
          nodeColor={(node: Node) => {
            const chatNode = (node.data as unknown as NodeData)?.chatNode;
            switch (chatNode.type) {
              case 'user':
                return '#1e40af';
              case 'assistant':
                return '#7c3aed';
              case 'system':
                return '#374151';
              default:
                return '#374151';
            }
          }}
          maskColor="rgba(0,0,0,0.8)"
          className="bg-gray-900 border-gray-700"
        />
      </ReactFlow>

      {/* 자동 레이아웃 버튼 */}
      {chatNodes.length > 1 && (
        <button
          onClick={handleAutoLayout}
          className="absolute top-4 right-4 px-3 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg shadow-lg transition-colors flex items-center gap-2 text-sm"
          title="자동 레이아웃"
        >
          📐 정렬
        </button>
      )}

      {/* 빈 캔버스일 때 시작 버튼 */}
      {chatNodes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <button
            onClick={handleAddRootNode}
            className="px-6 py-3 bg-pink-600 hover:bg-pink-700 text-white rounded-lg shadow-lg pointer-events-auto transition-colors"
          >
            ➕ 첫 번째 질문 추가
          </button>
        </div>
      )}

      {/* 입력 패널 */}
      <InputPanel
        onAddNode={nodeCallbacks.onAddChild}
        onAddRootNode={handleAddRootNode}
      />

      {/* 노드 편집 모달 */}
      {editingNodeId && (
        <NodeEditModal
          nodeId={editingNodeId}
          onClose={() => setEditingNodeId(null)}
        />
      )}
    </div>
  );
}
