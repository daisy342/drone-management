import React, { useState, useCallback, useEffect } from 'react';
import './Toast.css';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastMessage {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

interface ToastContextType {
  showToast: (type: ToastType, message: string, duration?: number) => void;
  hideToast: (id: string) => void;
}

// 全局 toast 控制函数
let globalShowToast: ((type: ToastType, message: string, duration?: number) => void) | null = null;

export const showToast = (type: ToastType, message: string, duration: number = 3000) => {
  if (globalShowToast) {
    globalShowToast(type, message, duration);
  }
};

// Toast 容器组件
export const ToastContainer: React.FC = () => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const hideToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const showToastCallback = useCallback((type: ToastType, message: string, duration = 3000) => {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    const newToast: ToastMessage = { id, type, message, duration };
    setToasts(prev => [...prev, newToast]);

    // 自动关闭
    if (duration > 0) {
      setTimeout(() => {
        hideToast(id);
      }, duration);
    }
  }, [hideToast]);

  // 注册全局函数
  useEffect(() => {
    globalShowToast = showToastCallback;
    return () => {
      globalShowToast = null;
    };
  }, [showToastCallback]);

  const getIcon = (type: ToastType) => {
    switch (type) {
      case 'success':
        return '✓';
      case 'error':
        return '✕';
      case 'warning':
        return '!';
      case 'info':
        return 'i';
      default:
        return 'i';
    }
  };

  return (
    <div className="toast-container">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`toast toast-${toast.type}`}
          onClick={() => hideToast(toast.id)}
        >
          <span className="toast-icon">{getIcon(toast.type)}</span>
          <span className="toast-message">{toast.message}</span>
          <button className="toast-close" onClick={(e) => { e.stopPropagation(); hideToast(toast.id); }}>
            ✕
          </button>
        </div>
      ))}
    </div>
  );
};

export default ToastContainer;
