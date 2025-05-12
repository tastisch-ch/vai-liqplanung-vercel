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
  switch (type) {
    case 'success':
      return 'bg-green-100 border-green-500 text-green-700';
    case 'error':
      return 'bg-red-100 border-red-500 text-red-700';
    case 'info':
      return 'bg-blue-100 border-blue-500 text-blue-700';
    case 'loading':
      return 'bg-gray-100 border-gray-500 text-gray-700';
    default:
      return 'bg-gray-100 border-gray-500 text-gray-700';
  }
};

const getIcon = (type: NotificationType) => {
  switch (type) {
    case 'success':
      return '✅';
    case 'error':
      return '❌';
    case 'info':
      return 'ℹ️';
    case 'loading':
      return '⏳';
    default:
      return 'ℹ️';
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
      className={`fixed top-4 right-4 z-50 p-4 rounded-md border-l-4 shadow-md max-w-md transition-all duration-300 ${getTypeStyles(type)}`}
      role="alert"
    >
      <div className="flex items-start">
        <div className="mr-2 text-xl">{getIcon(type)}</div>
        <div className="flex-1">
          <p className="font-semibold">{message}</p>
        </div>
        <button 
          onClick={() => {
            setVisible(false);
            if (onClose) onClose();
          }}
          className="text-gray-500 hover:text-gray-700 transition-colors"
          aria-label="Close"
        >
          ×
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