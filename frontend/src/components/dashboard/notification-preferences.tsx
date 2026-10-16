'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getNotificationPreferences, setNotificationPreference } from '@/lib/api/notifications.api';
import { Card, CardContent } from '@/components/ui/card';
import { ErrorState } from '@/components/shared/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import type { NotificationChannel, NotificationPreference, NotificationType } from '@/types/api';

const PREFERENCES_KEY = ['notification-preferences'];

const CHANNELS: { value: NotificationChannel; label: string }[] = [
  { value: 'EMAIL', label: 'Email' },
  { value: 'WHATSAPP', label: 'WhatsApp' },
];

/** The reminder trio is one setting from the owner/client's point of view, so it's collapsed
 * into a single row here even though it's 3 separate backend NotificationType values. */
const NOTIFICATION_GROUPS: { key: string; label: string; types: NotificationType[] }[] = [
  { key: 'booking_request', label: 'Nueva solicitud de reserva', types: ['BOOKING_REQUEST'] },
  { key: 'booking_confirmed', label: 'Reserva confirmada', types: ['BOOKING_CONFIRMED'] },
  { key: 'booking_cancelled', label: 'Reserva cancelada', types: ['BOOKING_CANCELLED'] },
  { key: 'payment_received', label: 'Pago recibido', types: ['PAYMENT_RECEIVED'] },
  {
    key: 'reminders',
    label: 'Recordatorios de un evento proximo',
    types: ['REMINDER_7_DAYS', 'REMINDER_3_DAYS', 'REMINDER_1_DAY'],
  },
  { key: 'review_request', label: 'Invitacion a dejar una reseña', types: ['REVIEW_REQUEST'] },
  { key: 'review_response', label: 'Respuesta a tu reseña', types: ['REVIEW_RESPONSE'] },
];

export const NotificationPreferences = () => {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: PREFERENCES_KEY, queryFn: getNotificationPreferences });

  const mutation = useMutation({
    mutationFn: async ({
      types,
      channel,
      enabled,
    }: {
      types: NotificationType[];
      channel: NotificationChannel;
      enabled: boolean;
    }) => {
      await Promise.all(types.map((type) => setNotificationPreference({ type, channel, enabled })));
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: PREFERENCES_KEY });
    },
    onError: (error: { message?: string }) =>
      toast.error('No se pudo guardar la preferencia', { description: error.message }),
  });

  if (query.isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  if (query.isError || !query.data) {
    return <ErrorState onRetry={() => query.refetch()} />;
  }

  const isEnabled = (
    prefs: NotificationPreference[],
    types: NotificationType[],
    channel: NotificationChannel,
  ) =>
    types.every(
      (type) => prefs.find((p) => p.type === type && p.channel === channel)?.enabled ?? true,
    );

  return (
    <Card>
      <CardContent className="space-y-4 pt-5">
        <div>
          <h2 className="font-semibold">Preferencias de notificacion</h2>
          <p className="text-sm text-muted-foreground">
            Elegi que avisos queres recibir por email o WhatsApp. Siempre vas a ver todo en la
            campanita de notificaciones dentro de Mi Evento, independientemente de esto.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <th className="py-2 pr-3">Aviso</th>
                {CHANNELS.map((channel) => (
                  <th key={channel.value} className="px-3 py-2 text-center">
                    {channel.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {NOTIFICATION_GROUPS.map((group) => (
                <tr key={group.key} className="border-t">
                  <td className="py-2.5 pr-3">{group.label}</td>
                  {CHANNELS.map((channel) => {
                    const checked = isEnabled(query.data, group.types, channel.value);
                    return (
                      <td key={channel.value} className="px-3 py-2.5 text-center">
                        <input
                          type="checkbox"
                          className="h-4 w-4"
                          checked={checked}
                          disabled={mutation.isPending}
                          aria-label={`${group.label} por ${channel.label}`}
                          onChange={(e) =>
                            mutation.mutate({
                              types: group.types,
                              channel: channel.value,
                              enabled: e.target.checked,
                            })
                          }
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};
