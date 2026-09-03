'use client';

import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { Bell } from 'lucide-react';
import {
  getMyNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
} from '@/lib/api/notifications.api';
import type { Notification } from '@/types/api';

const UNREAD_COUNT_POLL_MS = 30_000;

interface NotificationBellProps {
  /** 'right' (default) anchors the panel's right edge to the bell — fits a top-right corner
   * like the mobile header. 'left' anchors the left edge instead, growing rightward into open
   * space — needed in the desktop sidebar, which is narrower than the panel itself. */
  align?: 'left' | 'right';
}

export const NotificationBell = ({ align = 'right' }: NotificationBellProps) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const unreadCountQuery = useQuery({
    queryKey: ['notifications-unread-count'],
    queryFn: getUnreadNotificationCount,
    refetchInterval: UNREAD_COUNT_POLL_MS,
  });

  const notificationsQuery = useQuery({
    queryKey: ['notifications-list'],
    queryFn: getMyNotifications,
    enabled: open,
  });

  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const unreadCount = unreadCountQuery.data ?? 0;

  const handleMarkAsRead = async (id: string) => {
    await markNotificationAsRead(id);
    queryClient.setQueryData<Notification[]>(['notifications-list'], (prev) =>
      prev?.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
    );
    queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="relative flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
        aria-expanded={open}
        aria-label="Notificaciones"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 ? (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-medium leading-none text-destructive-foreground">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          className={`absolute top-full z-20 mt-2 w-80 max-w-[90vw] rounded-[var(--radius)] border bg-background shadow-md ${
            align === 'left' ? 'left-0' : 'right-0'
          }`}
        >
          <div className="border-b px-3 py-2 text-sm font-medium">Notificaciones</div>
          <div className="max-h-80 overflow-y-auto">
            {notificationsQuery.isLoading ? (
              <p className="p-4 text-center text-sm text-muted-foreground">Cargando...</p>
            ) : null}

            {notificationsQuery.isError ? (
              <p className="p-4 text-center text-sm text-muted-foreground">
                No se pudieron cargar las notificaciones.
              </p>
            ) : null}

            {notificationsQuery.data?.length === 0 ? (
              <p className="p-4 text-center text-sm text-muted-foreground">
                No tienes notificaciones todavia.
              </p>
            ) : null}

            {notificationsQuery.data?.map((notification) => (
              <button
                key={notification.id}
                type="button"
                onClick={() => {
                  if (!notification.isRead) handleMarkAsRead(notification.id);
                }}
                className={`flex w-full flex-col gap-0.5 border-b px-3 py-2.5 text-left text-sm last:border-b-0 hover:bg-muted ${
                  notification.isRead ? '' : 'bg-primary/5'
                }`}
              >
                <span className="flex items-center gap-2">
                  {!notification.isRead ? (
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  ) : null}
                  <span className="font-medium">{notification.title}</span>
                </span>
                <span className="text-xs text-muted-foreground">{notification.content}</span>
                <span className="text-xs text-muted-foreground/70">
                  {formatDistanceToNow(new Date(notification.createdAt), {
                    addSuffix: true,
                    locale: es,
                  })}
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
};
