import React, { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext(null);

let toastId = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info', duration = 4000) => {
    const id = ++toastId;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 max-w-xs w-full pointer-events-none">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className="toast-enter pointer-events-auto"
            onClick={() => removeToast(toast.id)}
          >
            <div className={`
              flex items-start gap-3 p-3 rounded-lg border backdrop-blur-sm cursor-pointer
              ${toast.type === 'success' ? 'bg-green-900/80 border-green-500/50 text-green-100' :
                toast.type === 'error' ? 'bg-red-900/80 border-red-500/50 text-red-100' :
                toast.type === 'warning' ? 'bg-yellow-900/80 border-yellow-500/50 text-yellow-100' :
                'bg-turf-surface/90 border-turf-border text-turf-text'}
            `}>
              <span className="text-lg leading-none mt-0.5">
                {toast.type === 'success' ? '✅' :
                 toast.type === 'error' ? '❌' :
                 toast.type === 'warning' ? '⚠️' : 'ℹ️'}
              </span>
              <p className="text-sm font-body leading-snug">{toast.message}</p>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
