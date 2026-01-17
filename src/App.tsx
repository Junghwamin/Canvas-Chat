import { useEffect, useState } from 'react';
import { useCanvasStore } from './stores/canvasStore';
import Sidebar from './components/ui/Sidebar';
import Header from './components/ui/Header';
import Canvas from './components/Canvas';
import SettingsModal from './components/ui/SettingsModal';
import SearchModal from './components/ui/SearchModal';
import ExportModal from './components/ui/ExportModal';
import Toast from './components/ui/Toast';

function App() {
  const { loadCanvases, loadSettings, error, setError } = useCanvasStore();

  const [showSettings, setShowSettings] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showExport, setShowExport] = useState(false);

  // 앱 초기화
  useEffect(() => {
    const init = async () => {
      await loadSettings();
      await loadCanvases();
    };
    init();
  }, [loadCanvases, loadSettings]);

  // 키보드 단축키
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + K: 검색
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setShowSearch(true);
      }
      // Ctrl/Cmd + ,: 설정
      if ((e.ctrlKey || e.metaKey) && e.key === ',') {
        e.preventDefault();
        setShowSettings(true);
      }
      // Ctrl/Cmd + E: 내보내기
      if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
        e.preventDefault();
        setShowExport(true);
      }
      // Escape: 모달 닫기
      if (e.key === 'Escape') {
        setShowSettings(false);
        setShowSearch(false);
        setShowExport(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="flex h-screen bg-gray-900">
      {/* 사이드바 */}
      <Sidebar onOpenSettings={() => setShowSettings(true)} />

      {/* 메인 영역 */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header
          onSearch={() => setShowSearch(true)}
          onExport={() => setShowExport(true)}
        />
        <main className="flex-1 overflow-hidden">
          <Canvas />
        </main>
      </div>

      {/* 모달들 */}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
      {showSearch && <SearchModal onClose={() => setShowSearch(false)} />}
      {showExport && <ExportModal onClose={() => setShowExport(false)} />}

      {/* 에러 토스트 */}
      {error && <Toast message={error} type="error" onClose={() => setError(null)} />}
    </div>
  );
}

export default App;
