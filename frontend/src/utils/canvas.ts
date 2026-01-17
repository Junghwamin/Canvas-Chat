import { ChatNode, ChatEdge } from '@/types/canvas';
import dagre from '@dagrejs/dagre';

// Auto-layout nodes using Dagre
export function getLayoutedElements(
    nodes: ChatNode[],
    edges: ChatEdge[],
    direction: 'TB' | 'LR' = 'TB'
) {
    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));

    const nodeWidth = 350;
    const nodeHeight = 200;

    dagreGraph.setGraph({ rankdir: direction, ranksep: 100, nodesep: 80 });

    nodes.forEach((node) => {
        dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
    });

    edges.forEach((edge) => {
        dagreGraph.setEdge(edge.source, edge.target);
    });

    dagre.layout(dagreGraph);

    const layoutedNodes = nodes.map((node) => {
        const nodeWithPosition = dagreGraph.node(node.id);
        return {
            ...node,
            position: {
                x: nodeWithPosition.x - nodeWidth / 2,
                y: nodeWithPosition.y - nodeHeight / 2,
            },
        };
    });

    return { nodes: layoutedNodes, edges };
}

// Find all descendant node IDs
export function findDescendants(
    nodeId: string,
    edges: ChatEdge[]
): string[] {
    const descendants: string[] = [];
    const queue = [nodeId];

    while (queue.length > 0) {
        const currentId = queue.shift()!;
        const children = edges
            .filter((edge) => edge.source === currentId)
            .map((edge) => edge.target);

        descendants.push(...children);
        queue.push(...children);
    }

    return descendants;
}

// Count direct children
export function countChildren(nodeId: string, edges: ChatEdge[]): number {
    return edges.filter((edge) => edge.source === nodeId).length;
}

// Split response by markdown headings
export function splitResponseByHeadings(text: string): string[] {
    const headingRegex = /^##\s+(.+)$/gm;
    const matches = Array.from(text.matchAll(headingRegex));

    if (matches.length === 0) {
        return [text];
    }

    const sections: string[] = [];
    let lastIndex = 0;

    matches.forEach((match, i) => {
        if (i === 0 && match.index! > 0) {
            // Include intro before first heading
            sections.push(text.substring(0, match.index!).trim());
        }

        const startIndex = match.index!;
        const endIndex = i < matches.length - 1 ? matches[i + 1].index! : text.length;
        sections.push(text.substring(startIndex, endIndex).trim());
        lastIndex = endIndex;
    });

    return sections.filter((s) => s.length > 0);
}

// Export canvas to JSON
export function exportToJSON(data: any): string {
    return JSON.stringify(data, null, 2);
}

// Download file
export function downloadFile(filename: string, content: string, mimeType = 'text/plain') {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}
