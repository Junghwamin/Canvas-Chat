import { memo } from 'react';

interface SpinnerProps {
  /** Size of the spinner in pixels */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Color variant */
  variant?: 'primary' | 'secondary' | 'white';
  /** Additional CSS classes */
  className?: string;
  /** Accessible label for screen readers */
  label?: string;
}

const sizeMap = {
  sm: 16,
  md: 24,
  lg: 32,
  xl: 48,
};

const colorMap = {
  primary: 'var(--accent-primary)',
  secondary: 'var(--accent-secondary)',
  white: '#ffffff',
};

/**
 * Accessible loading spinner component
 * Uses SVG for crisp rendering at any size
 */
const Spinner = memo(({
  size = 'md',
  variant = 'primary',
  className = '',
  label = '로딩 중...',
}: SpinnerProps) => {
  const pixelSize = sizeMap[size];
  const color = colorMap[variant];

  return (
    <div
      role="status"
      aria-label={label}
      aria-live="polite"
      className={`inline-flex items-center justify-center ${className}`}
    >
      <svg
        width={pixelSize}
        height={pixelSize}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="animate-spin"
        aria-hidden="true"
      >
        {/* Background circle */}
        <circle
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="3"
          strokeOpacity="0.2"
          style={{ color }}
        />
        {/* Animated arc */}
        <path
          d="M12 2C6.48 2 2 6.48 2 12"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          style={{ color }}
        />
      </svg>
      <span className="sr-only">{label}</span>
    </div>
  );
});

Spinner.displayName = 'Spinner';

export default Spinner;

/**
 * Inline spinner for buttons and text
 */
export const InlineSpinner = memo(({
  className = '',
}: {
  className?: string;
}) => (
  <Spinner size="sm" className={className} label="처리 중..." />
));

InlineSpinner.displayName = 'InlineSpinner';

/**
 * Full-page loading overlay
 */
export const LoadingOverlay = memo(({
  message = '로딩 중...',
}: {
  message?: string;
}) => (
  <div
    className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
    role="dialog"
    aria-modal="true"
    aria-label={message}
  >
    <div className="flex flex-col items-center gap-4 p-6 bg-[var(--bg-elevated)] rounded-xl border border-[var(--border-default)]">
      <Spinner size="xl" />
      <span className="text-[var(--text-secondary)] text-sm">{message}</span>
    </div>
  </div>
));

LoadingOverlay.displayName = 'LoadingOverlay';
