"use client";

import React, { createContext, useContext } from 'react';
import { Toaster } from '@/components/Toaster';
import { useToast } from '@/lib/useToast';

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
  const { toast } = useToast();
  const [notificationProps, setNotificationProps] = React.useState({
    message: '',
    type: 'info' as NotificationType,
    isVisible: false,
    duration: 2000
  });

  const showNotification = (message: string, type: NotificationType, duration = 3000) => {
    // Keep context state for backwards compatibility
    setNotificationProps({ message, type, isVisible: true, duration });
    // Bridge to Tremor toast system
    if (type === 'loading') {
      // Suppress loading toasts per UX feedback
      return;
    }
    const variantMap: Record<NotificationType, 'info' | 'success' | 'warning' | 'error' | 'loading'> = {
      info: 'info',
      success: 'success',
      error: 'error',
      loading: 'loading',
    } as const;
    const { dismiss } = toast({ title: message, variant: variantMap[type], duration });
    if (duration > 0) { setTimeout(() => dismiss(), duration); }
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
      {/* Mount Tremor Toaster globally so it can display any queued toasts */}
      <Toaster />
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