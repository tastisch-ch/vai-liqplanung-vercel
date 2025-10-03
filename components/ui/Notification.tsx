"use client";

import React, { createContext, useContext } from 'react';

type NotificationType = 'success' | 'error' | 'info' | 'loading';

interface NotificationProps {
  message: string;
  type: NotificationType;
  duration?: number;
  isVisible: boolean;
  onClose?: () => void;
}

export default function Notification(_: NotificationProps) { return null; }

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
  // No-op implementation to remove all toasts while keeping API compatible
  const showNotification = (_message: string, _type: NotificationType, _duration = 3000) => {
    // intentionally empty
  };
  const hideNotification = () => {};
  const notificationProps = { message: '', type: 'info' as NotificationType, isVisible: false, duration: 0 };

  return (
    <NotificationContext.Provider value={{ showNotification, hideNotification, notificationProps }}>
      {children}
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