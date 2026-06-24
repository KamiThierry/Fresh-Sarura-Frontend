import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import Toast from '../portals/shared/component/Toast';

interface ToastOptions {
  message: string;
  subtitle?: string;
}

interface ToastContextType {
  showToast: (message: string, subtitle?: string) => void;
  hideToast: () => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToastContext = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToastContext must be used within a ToastProvider');
  }
  return context;
};

interface ToastProviderProps {
  children: ReactNode;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const [toast, setToast] = useState<ToastOptions | null>(null);

  const showToast = useCallback((message: string, subtitle?: string) => {
    setToast({ message, subtitle });
  }, []);

  const hideToast = useCallback(() => {
    setToast(null);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, hideToast }}>
      {children}
      {toast && (
        <Toast
          message={toast.message}
          subtitle={toast.subtitle}
          onClose={hideToast}
        />
      )}
    </ToastContext.Provider>
  );
};
