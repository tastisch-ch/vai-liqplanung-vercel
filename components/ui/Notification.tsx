"use client";

import React, { createContext, useContext, useMemo, useCallback, useEffect } from 'react';
import { Toaster } from '@/components/Toaster';

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
    <Toaster />
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