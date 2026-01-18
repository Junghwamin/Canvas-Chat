import { useEffect, useCallback, memo } from 'react';

interface ToastProps {
  message: string;
  type?: 'error' | 'success' | 'info' | 'warning';
  onClose: () => void;
  duration?: number;
}

// SVG Icons for better consistency
const Icons = {
  error: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="2" />
      <path d="M7 7l6 6M13 7l-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  success: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="2" />
      <path d="M6 10l3 3 5-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  info: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="2" />
      <path d="M10 9v5M10 6v1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  warning: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M10 2L1 18h18L10 2z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M10 8v4M10 14v1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  close: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
};

// Color scheme using CSS variables for consistency
const colorScheme = {
  error: {
    bg: 'bg-[var(--accent-danger)]',
    border: 'border-red-500/30',
    text: 'text-white',
  },
  success: {
    bg: 'bg-[var(--accent-success)]',
    border: 'border-green-500/30',
    text: 'text-white',
  },
  info: {
    bg: 'bg-[var(--accent-primary)]',
    border: 'border-cyan-500/30',
    text: 'text-white',
  },
  warning: {
    bg: 'bg-[var(--accent-warning)]',
    border: 'border-amber-500/30',
    text: 'text-black',
  },
};

const Toast = memo(({ message, type = 'error', onClose, duration = 5000 }: ToastProps) => {
  // Handle keyboard close
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose, duration, handleKeyDown]);

  const { bg, border, text } = colorScheme[type];

  return (
    <div
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
      className={`
        fixed bottom-24 right-4 z-50
        flex items-center gap-3
        px-4 py-3
        rounded-[var(--radius-lg)]
        border ${border}
        shadow-[var(--shadow-lg)]
        ${bg} ${text}
        max-w-md
        animate-slide-in
      `}
    >
      {/* Icon */}
      <span className="flex-shrink-0" aria-hidden="true">
        {Icons[type]}
      </span>

      {/* Message */}
      <span className="flex-1 text-sm font-medium">{message}</span>

      {/* Close button */}
      <button
        onClick={onClose}
        className={`
          flex-shrink-0
          p-1 rounded-[var(--radius-sm)]
          opacity-70 hover:opacity-100
          transition-opacity duration-[var(--transition-fast)]
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50
        `}
        aria-label="알림 닫기"
      >
        {Icons.close}
      </button>
    </div>
  );
});

Toast.displayName = 'Toast';

export default Toast;
