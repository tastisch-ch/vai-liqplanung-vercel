"use client";

import React, { createContext, useContext, useMemo, useCallback } from 'react';
import { Toast, ToastActions, ToastIcon } from '@tremor/react';

type NotificationType = 'success' | 'error' | 'info' | 'loading';

interface NotificationProps {
  message: string;
  type: NotificationType;
  duration?: number;
  isVisible: boolean;
  onClose?: () => void;
}

export default function Notification({ message, type, duration = 4000, isVisible, onClose }: NotificationProps) {
  if (!isVisible) return null;

  const tone = useMemo(() => {
    switch (type) {
      case 'success':
        return 'success';
      case 'error':
        return 'error';
      case 'info':
        return 'info';
      case 'loading':
        return 'neutral';
      default:
        return 'info';
    }
  }, [type]);

  const handleClose = useCallback(() => {
    if (onClose) onClose();
  }, [onClose]);

  // Auto close timer handled manually to keep API compatible
  if (duration > 0) {
    setTimeout(handleClose, duration);
  }

  return (
    <div className="fixed top-4 right-4 z-50">
      <Toast className="shadow-lg" onClose={handleClose} tone={tone as any}>
        <ToastIcon />
        <div className="text-sm font-medium">{message}</div>
        <ToastActions />
      </Toast>
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
    duration: 4000
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