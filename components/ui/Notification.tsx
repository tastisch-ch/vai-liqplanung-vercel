"use client";

import React, { createContext, useContext, useMemo, useCallback, useEffect } from 'react';
import { Callout } from '@tremor/react';

type NotificationType = 'success' | 'error' | 'info' | 'loading';

interface NotificationProps {
  message: string;
  type: NotificationType;
  duration?: number;
  isVisible: boolean;
  onClose?: () => void;
}

export default function Notification({ message, type, duration = 2000, isVisible, onClose }: NotificationProps) {
  if (!isVisible) return null;

  const color = useMemo(() => {
    switch (type) {
      case 'success':
        return 'emerald';
      case 'error':
        return 'rose';
      case 'info':
        return 'sky';
      case 'loading':
        return 'gray';
      default:
        return 'sky';
    }
  }, [type]);

  const handleClose = useCallback(() => {
    if (onClose) onClose();
  }, [onClose]);

  // Auto close timer handled via effect to avoid multiple timers on re-render
  useEffect(() => {
    if (!isVisible) return;
    if (duration > 0) {
      const t = setTimeout(handleClose, duration);
      return () => clearTimeout(t);
    }
  }, [duration, isVisible, handleClose]);

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm">
      <div className="relative">
        <Callout title={message} color={color as any} className="shadow-lg" />
        <button
          aria-label="Schließen"
          onClick={handleClose}
          className="absolute -right-2 -top-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-gray-600 shadow ring-1 ring-black/5 hover:text-gray-800"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
        </button>
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
  const [notificationProps, setNotificationProps] = React.useState({
    message: '',
    type: 'info' as NotificationType,
    isVisible: false,
    duration: 2000
  });

  const showNotification = (message: string, type: NotificationType, duration = 5000) => {
    setNotificationProps({
      message,
      type,
      isVisible: true,
      duration
    });
  };

  const hideNotification = () => setNotificationProps(prev => ({ ...prev, isVisible: false }));

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