import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface ToastProps {
  toast: ToastMessage | null;
  onDismiss: () => void;
}

export const Toast: React.FC<ToastProps> = ({ toast, onDismiss }) => {
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      onDismiss();
    }, 3500);
    return () => clearTimeout(timer);
  }, [toast, onDismiss]);

  if (!toast) return null;

  const bgColors = {
    success: 'bg-emerald-950/90 border-emerald-500/50 text-emerald-300',
    error: 'bg-red-950/90 border-red-500/50 text-red-300',
    info: 'bg-blue-950/90 border-blue-500/50 text-blue-300',
  };

  const icons = {
    success: <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />,
    error: <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />,
    info: <Info className="w-4 h-4 text-blue-400 shrink-0" />,
  };

  return (
    <div className="fixed bottom-16 lg:bottom-6 right-4 z-50 animate-in slide-in-from-bottom-5 duration-200">
      <div
        className={`px-4 py-2.5 rounded-xl border backdrop-blur-md shadow-2xl flex items-center gap-2.5 text-xs font-medium ${
          bgColors[toast.type]
        }`}
      >
        {icons[toast.type]}
        <span>{toast.message}</span>
        <button
          type="button"
          onClick={onDismiss}
          className="ml-2 hover:opacity-70"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
