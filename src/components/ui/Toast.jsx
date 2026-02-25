import { useEffect, useState } from 'react';
import { CheckCircle, X, AlertCircle, Info } from 'lucide-react';

const Toast = ({ message, type = 'success', duration = 5000, onClose }) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      handleClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      setIsVisible(false);
      onClose?.();
    }, 300);
  };

  if (!isVisible) return null;

  const typeStyles = {
    success: {
      bg: 'bg-emerald-50 border-emerald-200',
      icon: <CheckCircle className="w-5 h-5 text-emerald-600" />,
      text: 'text-emerald-800'
    },
    error: {
      bg: 'bg-red-50 border-red-200',
      icon: <AlertCircle className="w-5 h-5 text-red-600" />,
      text: 'text-red-800'
    },
    info: {
      bg: 'bg-blue-50 border-blue-200',
      icon: <Info className="w-5 h-5 text-blue-600" />,
      text: 'text-blue-800'
    }
  };

  const styles = typeStyles[type] || typeStyles.success;

  return (
    <div
      className={`
        fixed bottom-6 right-6 z-50 max-w-md
        transform transition-all duration-300 ease-out
        ${isExiting ? 'translate-y-2 opacity-0' : 'translate-y-0 opacity-100'}
      `}
    >
      <div className={`flex items-start gap-3 px-4 py-3 rounded-lg border shadow-lg ${styles.bg}`}>
        <div className="flex-shrink-0 mt-0.5">
          {styles.icon}
        </div>
        <div className={`flex-1 text-sm font-medium ${styles.text}`}>
          {message}
        </div>
        <button
          onClick={handleClose}
          className="flex-shrink-0 p-1 rounded hover:bg-black/5 transition-colors"
        >
          <X className="w-4 h-4 text-gray-500" />
        </button>
      </div>
    </div>
  );
};

export default Toast;
