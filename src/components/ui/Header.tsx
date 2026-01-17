import { useState } from 'react';
import { useCanvasStore } from '../../stores/canvasStore';

interface HeaderProps {
  onExport: () => void;
  onSearch: () => void;
}

export default function Header({ onExport, onSearch }: HeaderProps) {
  const { currentCanvas, updateCanvas, error, setError } = useCanvasStore();
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState('');

  const handleRename = async () => {
    if (currentCanvas && editName.trim()) {
      await updateCanvas(currentCanvas.id, { name: editName.trim() });
    }
    setIsEditingName(false);
  };

  if (!currentCanvas) {
    return (
      <header className="h-12 bg-gray-900 border-b border-gray-700 flex items-center justify-center">
        <span className="text-gray-400">캔버스를 선택하세요</span>
      </header>
    );
  }

  return (
    <header className="h-12 bg-gray-900 border-b border-gray-700 flex items-center justify-between px-4">
      {/* 캔버스 이름 */}
      <div className="flex items-center gap-2">
        {isEditingName ? (
          <input
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleRename()}
            onBlur={handleRename}
            className="px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-pink-500"
            autoFocus
          />
        ) : (
          <h2
            className="text-lg font-semibold text-white cursor-pointer hover:text-pink-400"
            onClick={() => {
              setEditName(currentCanvas.name);
              setIsEditingName(true);
            }}
          >
            {currentCanvas.name}
          </h2>
        )}
      </div>

      {/* 오류 메시지 */}
      {error && (
        <div className="flex items-center gap-2 px-3 py-1 bg-red-900/50 border border-red-500 rounded">
          <span className="text-red-300 text-sm">{error}</span>
          <button
            onClick={() => setError(null)}
            className="text-red-400 hover:text-red-300"
          >
            ✕
          </button>
        </div>
      )}

      {/* 액션 버튼 */}
      <div className="flex items-center gap-2">
        <button
          onClick={onSearch}
          className="px-3 py-1 bg-gray-800 hover:bg-gray-700 text-white rounded text-sm flex items-center gap-1"
          title="검색"
        >
          🔍 검색
        </button>
        <button
          onClick={onExport}
          className="px-3 py-1 bg-gray-800 hover:bg-gray-700 text-white rounded text-sm flex items-center gap-1"
          title="내보내기"
        >
          📤 내보내기
        </button>
      </div>
    </header>
  );
}
