'use client';

import { useTranslations } from '../lib/i18n-provider';
import { toast } from './use-toast';
import { useSocketEvent } from './use-socket';

/** Admin/xodimlar paneli uchun real-time Toast + ovozli bildirishnomalar. */
export function useRealtimeAdminNotifications(enabled: boolean) {
  const { t } = useTranslations();

  useSocketEvent('service-request.created', () => {
    if (!enabled) return;
    toast({ title: t('admin.newRequestToast'), variant: 'default' }, { sound: true });
  });

  useSocketEvent('support-ticket.created', () => {
    if (!enabled) return;
    toast({ title: t('admin.newRequestToast'), variant: 'default' }, { sound: true });
  });

  useSocketEvent('booking.paid', () => {
    if (!enabled) return;
    toast({ title: t('admin.newPaymentToast'), variant: 'success' }, { sound: true });
  });
}
