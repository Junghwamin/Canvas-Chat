import { useState } from 'react';
import { useCanvasStore } from '../../stores/canvasStore';

interface SidebarProps {
  onOpenSettings: () => void;
}

export default function Sidebar({ onOpenSettings }: SidebarProps) {
  const {
    canvases,
    currentCanvas,
    selectCanvas,
    createCanvas,
    deleteCanvas,
    updateCanvas,
  } = useCanvasStore();

  const [isCreating, setIsCreating] = useState(false);
  const [newCanvasName, setNewCanvasName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const handleCreate = async () => {
    if (!newCanvasName.trim()) return;

    await createCanvas(newCanvasName.trim());
    setNewCanvasName('');
    setIsCreating(false);
  };

  const handleRename = async (id: string) => {
    if (!editName.trim()) return;

    await updateCanvas(id, { name: editName.trim() });
    setEditingId(null);
    setEditName('');
  };

  const handleDelete = async (id: string) => {
    if (confirm('이 캔버스를 삭제하시겠습니까? 모든 대화가 삭제됩니다.')) {
      await deleteCanvas(id);
    }
  };

  return (
    <div className="w-64 h-full bg-gray-900 border-r border-gray-700 flex flex-col">
      {/* 헤더 */}
      <div className="p-4 border-b border-gray-700">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <span>🎨</span>
          <span>Canvas Chat</span>
        </h1>
      </div>

      {/* 캔버스 목록 */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-2">
          {/* 새 캔버스 버튼 */}
          {isCreating ? (
            <div className="mb-2 p-2 bg-gray-800 rounded-lg">
              <input
                type="text"
                value={newCanvasName}
                onChange={(e) => setNewCanvasName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                placeholder="캔버스 이름..."
                className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:border-pink-500"
                autoFocus
              />
              <div className="flex gap-1 mt-2">
                <button
                  onClick={handleCreate}
                  className="flex-1 px-2 py-1 bg-pink-600 text-white text-xs rounded hover:bg-pink-700"
                >
                  생성
                </button>
                <button
                  onClick={() => setIsCreating(false)}
                  className="flex-1 px-2 py-1 bg-gray-600 text-white text-xs rounded hover:bg-gray-500"
                >
                  취소
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setIsCreating(true)}
              className="w-full mb-2 px-3 py-2 bg-pink-600 hover:bg-pink-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
            >
              <span>➕</span>
              <span>새 캔버스</span>
            </button>
          )}

          {/* 캔버스 리스트 */}
          {canvases.map((canvas) => (
            <div
              key={canvas.id}
              className={`
                group mb-1 p-2 rounded-lg cursor-pointer transition-colors
                ${currentCanvas?.id === canvas.id
                  ? 'bg-pink-900/50 border border-pink-500/50'
                  : 'bg-gray-800 hover:bg-gray-700 border border-transparent'
                }
              `}
              onClick={() => selectCanvas(canvas.id)}
            >
              {editingId === canvas.id ? (
                <div onClick={(e) => e.stopPropagation()}>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleRename(canvas.id)}
                    onBlur={() => setEditingId(null)}
                    className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:border-pink-500"
                    autoFocus
                  />
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-white truncate">
                      {canvas.name}
                    </div>
                    <div className="text-xs text-gray-400">
                      {new Date(canvas.updatedAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="hidden group-hover:flex gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingId(canvas.id);
                        setEditName(canvas.name);
                      }}
                      className="p-1 text-xs text-gray-400 hover:text-white"
                      title="이름 변경"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(canvas.id);
                      }}
                      className="p-1 text-xs text-gray-400 hover:text-red-400"
                      title="삭제"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}

          {canvases.length === 0 && !isCreating && (
            <div className="text-center text-gray-500 text-sm py-8">
              캔버스가 없습니다.
              <br />
              새 캔버스를 만들어보세요!
            </div>
          )}
        </div>
      </div>

      {/* 하단 설정 버튼 */}
      <div className="p-2 border-t border-gray-700">
        <button
          onClick={onOpenSettings}
          className="w-full px-3 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-sm flex items-center gap-2 transition-colors"
        >
          <span>⚙️</span>
          <span>설정</span>
        </button>
      </div>
    </div>
  );
}
