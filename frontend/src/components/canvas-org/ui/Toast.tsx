import { useEffect } from 'react';

interface ToastProps {
  message: string;
  type?: 'error' | 'success' | 'info';
  onClose: () => void;
  duration?: number;
}

export default function Toast({ message, type = 'error', onClose, duration = 5000 }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [onClose, duration]);

  const bgColor = {
    error: 'bg-red-600',
    success: 'bg-green-600',
    info: 'bg-blue-600',
  }[type];

  const icon = {
    error: '❌',
    success: '✅',
    info: 'ℹ️',
  }[type];

  return (
    <div className={`fixed bottom-24 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg ${bgColor} text-white max-w-md animate-slide-in`}>
      <span>{icon}</span>
      <span className="flex-1">{message}</span>
      <button
        onClick={onClose}
        className="text-white/70 hover:text-white"
      >
        ✕
      </button>
    </div>
  );
}
