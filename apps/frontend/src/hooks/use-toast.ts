'use client';

import { useEffect, useState } from 'react';
import { playNotificationSound } from '../lib/notification-sound';

export interface ToastItem {
  id: string;
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive' | 'success';
}

type Listener = (toasts: ToastItem[]) => void;

let toasts: ToastItem[] = [];
const listeners: Listener[] = [];

function emit() {
  listeners.forEach((listener) => listener(toasts));
}

export function dismissToast(id: string) {
  toasts = toasts.filter((item) => item.id !== id);
  emit();
}

export function toast(item: Omit<ToastItem, 'id'>, options: { sound?: boolean } = {}) {
  const id = Math.random().toString(36).slice(2);
  toasts = [...toasts, { id, ...item }];
  emit();
  if (options.sound) {
    playNotificationSound();
  }
  setTimeout(() => dismissToast(id), 6000);
  return id;
}

export function useToast() {
  const [state, setState] = useState<ToastItem[]>(toasts);

  useEffect(() => {
    listeners.push(setState);
    return () => {
      const index = listeners.indexOf(setState);
      if (index >= 0) listeners.splice(index, 1);
    };
  }, []);

  return { toasts: state, toast, dismiss: dismissToast };
}
