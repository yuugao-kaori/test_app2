'use client';

import React, { createContext, useContext, useCallback, useState, useEffect } from 'react';
import NotificationComponent from '@/components/Notification';

interface NotificationItem {
  id: string;
  message: string;
  action?: { label: string; onClick: () => void };
}

interface CodeBlockContextType {
  notifications: NotificationItem[];
  addNotification: (message: string) => void;
  removeNotification: (id: string) => void;
}

const CodeBlockContext = createContext<CodeBlockContextType | undefined>(undefined);

export function CodeBlockProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const addNotification = useCallback((message: string) => {
    const id = Date.now().toString();
    setNotifications(prev => [...prev, { id, message }]);
    
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 3000);
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  return (
    <CodeBlockContext.Provider value={{ notifications, addNotification, removeNotification }}>
      {children}
      {mounted && (
        <NotificationComponent
          notifications={notifications}
          onClose={removeNotification}
        />
      )}
    </CodeBlockContext.Provider>
  );
}

export const useCodeBlock = () => {
  const context = useContext(CodeBlockContext);
  if (context === undefined) {
    throw new Error('useCodeBlock must be used within a CodeBlockProvider');
  }
  return context;
};
