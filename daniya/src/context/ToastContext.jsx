import React, { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertCircle, Info, ShieldAlert, Sparkles, X } from 'lucide-react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(({ title, message, type = 'info', duration = 4000 }) => {
    const id = Date.now() + Math.random().toString(36).substr(2, 5);
    const newToast = { id, title, message, type, duration };

    setToasts((prev) => [...prev.slice(-3), newToast]); // Keep max 4 toasts

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
    return id;
  }, [removeToast]);

  const getIcon = (type) => {
    switch (type) {
      case 'success':
        return <Sparkles className="w-5 h-5 text-amber-500 shrink-0" />;
      case 'security':
        return <ShieldAlert className="w-5 h-5 text-rose-500 shrink-0" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />;
      case 'info':
      default:
        return <Info className="w-5 h-5 text-amber-600 shrink-0" />;
    }
  };

  const getStyles = (type) => {
    switch (type) {
      case 'success':
        return 'border-amber-300/80 bg-white/95 text-stone-800 shadow-xl shadow-amber-500/10';
      case 'security':
        return 'border-rose-400 bg-white/95 text-stone-800 shadow-xl shadow-rose-500/10';
      case 'error':
        return 'border-red-300 bg-white/95 text-stone-800 shadow-xl shadow-red-500/10';
      case 'info':
      default:
        return 'border-amber-200 bg-white/95 text-stone-800 shadow-xl shadow-amber-500/10';
    }
  };

  return (
    <ToastContext.Provider value={{ showToast, removeToast }}>
      {children}

      {/* Floating Toasts Viewport */}
      <div 
        aria-live="polite" 
        className="fixed top-20 right-4 sm:right-6 z-[9999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none"
      >
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: -16, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className={`pointer-events-auto rounded-2xl border p-3.5 backdrop-blur-md flex items-start gap-3 relative overflow-hidden ${getStyles(
                toast.type
              )}`}
            >
              {/* Festive top shimmer accent line */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-600 via-amber-500 to-rose-600" />

              <div className="mt-0.5">{getIcon(toast.type)}</div>

              <div className="flex-1 pr-2 min-w-0">
                {toast.title && (
                  <p className="font-festive font-bold text-sm text-royal-crimson tracking-wide">
                    {toast.title}
                  </p>
                )}
                {toast.message && (
                  <p className="text-xs text-stone-600 leading-relaxed mt-0.5 font-medium">
                    {toast.message}
                  </p>
                )}
              </div>

              <button
                onClick={() => removeToast(toast.id)}
                className="text-stone-400 hover:text-stone-700 p-1 rounded-lg transition-colors focus:outline-none"
                aria-label="Close notification"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
