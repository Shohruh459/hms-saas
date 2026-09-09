'use client';

import { toast } from '../../hooks/use-toast';
import { getHotelBookingUrl } from '../../lib/hotel-link';
import { useTranslations } from '../../lib/i18n-provider';
import { Button, type ButtonProps } from '../ui/button';

export function HotelBookButton({ subdomain, ...buttonProps }: { subdomain: string } & Omit<ButtonProps, 'onClick'>) {
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
    <Button size="sm" onClick={handleClick} {...buttonProps}>
      {t('discovery.bookRoom')}
    </Button>
  );
}
