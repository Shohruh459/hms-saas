'use client';

import { CalendarCheck } from 'lucide-react';
import { toast } from '../../hooks/use-toast';
import { getHotelBookingUrl } from '../../lib/hotel-link';
import { useTranslations } from '../../lib/i18n-provider';
import { cn } from '../../lib/utils';
import { Button, type ButtonProps } from '../ui/button';

export function HotelBookButton({
  subdomain,
  className,
  ...buttonProps
}: { subdomain: string } & Omit<ButtonProps, 'onClick'>) {
  const { t } = useTranslations();
  const url = getHotelBookingUrl(subdomain);

  function handleClick() {
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      toast({ title: t('discovery.externalNotice') });
    }
  }

  return (
    <Button size="sm" onClick={handleClick} className={cn('gap-1.5', className)} {...buttonProps}>
      <CalendarCheck className="h-3.5 w-3.5 shrink-0" /> {t('discovery.bookRoom')}
    </Button>
  );
}
