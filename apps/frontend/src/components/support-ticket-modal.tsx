'use client';

import { useState, type FormEvent } from 'react';
import { toast } from '../hooks/use-toast';
import { createSupportTicket } from '../lib/api/support-tickets';
import type { SupportTicketType } from '../lib/api/types';
import { useTranslations } from '../lib/i18n-provider';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Label } from './ui/label';

export function SupportTicketModal() {
  const { t } = useTranslations();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<SupportTicketType>('HELP');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!message.trim()) return;

    setSubmitting(true);
    try {
      await createSupportTicket({ type, message });
      toast({ title: t('support.success'), variant: 'success' });
      setMessage('');
      setOpen(false);
    } catch {
      toast({ title: t('common.error'), variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          {t('nav.support')}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('support.title')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label>{t('support.type')}</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={type === 'HELP' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setType('HELP')}
              >
                {t('support.type_HELP')}
              </Button>
              <Button
                type="button"
                variant={type === 'COMPLAINT' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setType('COMPLAINT')}
              >
                {t('support.type_COMPLAINT')}
              </Button>
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="support-message">{t('support.message')}</Label>
            <textarea
              id="support-message"
              required
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder={t('support.messagePlaceholder')}
              className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
          <Button type="submit" disabled={submitting} className="w-full">
            {t('support.submit')}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
