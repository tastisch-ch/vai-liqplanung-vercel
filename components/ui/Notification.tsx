'use client';

import { useState, useEffect } from 'react';
import React, { createContext, useContext } from 'react';

type NotificationType = 'success' | 'error' | 'info' | 'loading';

interface NotificationProps {
  message: string;
  type: NotificationType;
  duration?: number;
  isVisible: boolean;
  onClose?: () => void;
}

const getTypeStyles = (type: NotificationType) => {
  // Tremor-like: white card, subtle ring, colored left border + icon
  switch (type) {
    case 'success':
      return {
        container: 'bg-white text-emerald-900 border-emerald-500',
        icon: 'text-emerald-600'
      };
    case 'error':
      return {
        container: 'bg-white text-rose-900 border-rose-500',
        icon: 'text-rose-600'
      };
    case 'info':
      return {
        container: 'bg-white text-sky-900 border-sky-500',
        icon: 'text-sky-600'
      };
    case 'loading':
      return {
        container: 'bg-white text-gray-800 border-gray-400',
        icon: 'text-gray-500'
      };
    default:
      return {
        container: 'bg-white text-gray-800 border-gray-400',
        icon: 'text-gray-500'
      };
  }
};

const getIconSvg = (type: NotificationType) => {
  switch (type) {
    case 'success':
      return (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M20 6L9 17l-5-5" />
        </svg>
      );
    case 'error':
      return (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
        </svg>
      );
    case 'info':
      return (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
      );
    case 'loading':
      return (
        <svg viewBox="0 0 24 24" className="h-5 w-5 animate-spin" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="10" className="opacity-25" />
          <path d="M12 2a10 10 0 0 1 10 10" className="opacity-75" />
        </svg>
      );
    default:
      return null;
  }
};

export default function Notification({
  message,
  type,
  duration = 5000,
  isVisible,
  onClose
}: NotificationProps) {
  const [visible, setVisible] = useState(isVisible);
  const styles = getTypeStyles(type);

  useEffect(() => {
    setVisible(isVisible);
    
    if (isVisible && duration > 0) {
      const timer = setTimeout(() => {
        setVisible(false);
        if (onClose) onClose();
      }, duration);
      
      return () => clearTimeout(timer);
    }
  }, [isVisible, duration, onClose]);

  if (!visible) return null;

  return (
    <div
      className={`fixed top-4 right-4 z-50 max-w-sm pointer-events-auto animate-[toast-in_180ms_ease-out]`}
      role={type === 'loading' ? 'status' : 'alert'}
      aria-live="polite"
    >
      <div className={`p-4 rounded-xl border-l-4 shadow-lg ring-1 ring-black/5 ${styles.container}`}
           style={{ borderLeftColor: undefined }}>
        <div className="flex items-start gap-3">
          <span className={`shrink-0 ${styles.icon}`}>{getIconSvg(type)}</span>
          <div className="flex-1 text-sm leading-5">
            <p className="font-medium">{message}</p>
          </div>
          <button
            onClick={() => {
              setVisible(false);
              if (onClose) onClose();
            }}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Schließen"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>
      </div>
    </div>
  );
}

// Helper context for managing notifications
interface NotificationContextProps {
  showNotification: (message: string, type: NotificationType, duration?: number) => void;
  hideNotification: () => void;
  notificationProps: {
    message: string;
    type: NotificationType;
    isVisible: boolean;
    duration?: number;
  };
}

const NotificationContext = createContext<NotificationContextProps | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notificationProps, setNotificationProps] = useState({
    message: '',
    type: 'info' as NotificationType,
    isVisible: false,
    duration: 5000
  });

  const showNotification = (message: string, type: NotificationType, duration = 5000) => {
    setNotificationProps({
      message,
      type,
      isVisible: true,
      duration
    });
  };

  const hideNotification = () => {
    setNotificationProps(prev => ({ ...prev, isVisible: false }));
  };

  return (
    <NotificationContext.Provider
      value={{
        showNotification,
        hideNotification,
        notificationProps
      }}
    >
      {children}
      <Notification
        {...notificationProps}
        onClose={hideNotification}
      />
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
}; 