'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { MessageCircleHeart, Search, Send, X } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { toast } from '../../hooks/use-toast';
import { fetchMyFeedbackTickets, submitFeedback } from '../../lib/api/feedback';
import type { FeedbackStatus, FeedbackWithAiReply, MyFeedbackTicket } from '../../lib/api/types';
import { useTranslations } from '../../lib/i18n-provider';
import { cn } from '../../lib/utils';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Input } from '../ui/input';

type WidgetTab = 'send' | 'mine';

const STATUS_BADGE_VARIANT: Record<FeedbackStatus, 'success' | 'secondary' | 'warning'> = {
  PENDING: 'warning',
  IN_REVIEW: 'secondary',
  RESOLVED: 'success',
};

/**
 * Mehmonlar uchun "AI Shikoyat va Takliflar" widgeti — pastki o'ng burchakda
 * suzuvchi tugma, ochilganda murojaat yuborish (AI darhol javob beradi) va
 * telefon raqami orqali oldingi murojaatlar/Superadmin javobini ko'rish
 * imkonini beradi.
 */
export function AiFeedbackWidget() {
  const { t } = useTranslations();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<WidgetTab>('send');

  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [roomNumber, setRoomNumber] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<FeedbackWithAiReply | null>(null);

  const [lookupPhone, setLookupPhone] = useState('');
  const [tickets, setTickets] = useState<MyFeedbackTicket[] | null>(null);
  const [looking, setLooking] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!message.trim()) return;
    setSubmitting(true);
    try {
      const data = await submitFeedback({
        message,
        roomNumber: roomNumber.trim() || undefined,
        guestPhone: guestPhone.trim() || undefined,
        guestName: guestName.trim() || undefined,
      });
      setResult(data);
      setMessage('');
    } catch {
      toast({ title: t('common.error'), variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLookup(event: FormEvent) {
    event.preventDefault();
    if (!lookupPhone.trim()) return;
    setLooking(true);
    try {
      setTickets(await fetchMyFeedbackTickets(lookupPhone.trim()));
    } catch {
      toast({ title: t('common.error'), variant: 'destructive' });
      setTickets([]);
    } finally {
      setLooking(false);
    }
  }

  return (
    <>
      <motion.button
        type="button"
        onClick={() => setOpen((value) => !value)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg"
        aria-label={t('feedback.widgetTitle')}
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircleHeart className="h-6 w-6" />}
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.96 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-24 right-6 z-40 flex max-h-[70vh] w-[min(380px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border bg-card shadow-2xl"
          >
            <div className="bg-primary p-4 text-primary-foreground">
              <p className="font-bold">{t('feedback.widgetTitle')}</p>
              <p className="text-xs opacity-90">{t('feedback.widgetSubtitle')}</p>
            </div>

            <div className="flex border-b">
              <button
                type="button"
                onClick={() => setTab('send')}
                className={cn(
                  'flex-1 py-2 text-sm font-medium transition-colors',
                  tab === 'send' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground',
                )}
              >
                {t('feedback.tabSend')}
              </button>
              <button
                type="button"
                onClick={() => setTab('mine')}
                className={cn(
                  'flex-1 py-2 text-sm font-medium transition-colors',
                  tab === 'mine' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground',
                )}
              >
                {t('feedback.tabMine')}
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {tab === 'send' ? (
                <div className="space-y-3">
                  {result && (
                    <div className="space-y-2">
                      <div className="ml-auto max-w-[85%] rounded-2xl rounded-tr-sm bg-primary px-3 py-2 text-sm text-primary-foreground">
                        {result.message}
                      </div>
                      <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-secondary px-3 py-2 text-sm">{result.aiReply}</div>
                    </div>
                  )}
                  <form onSubmit={handleSubmit} className="space-y-2">
                    <Input
                      placeholder={t('feedback.namePlaceholder')}
                      value={guestName}
                      onChange={(event) => setGuestName(event.target.value)}
                    />
                    <Input
                      placeholder={t('feedback.phonePlaceholder')}
                      value={guestPhone}
                      onChange={(event) => setGuestPhone(event.target.value)}
                    />
                    <Input
                      placeholder={t('feedback.roomPlaceholder')}
                      value={roomNumber}
                      onChange={(event) => setRoomNumber(event.target.value)}
                    />
                    <textarea
                      required
                      value={message}
                      onChange={(event) => setMessage(event.target.value)}
                      placeholder={t('feedback.messagePlaceholder')}
                      className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                    <Button type="submit" disabled={submitting} className="w-full gap-1.5">
                      <Send className="h-4 w-4" /> {t('feedback.send')}
                    </Button>
                  </form>
                </div>
              ) : (
                <div className="space-y-3">
                  <form onSubmit={handleLookup} className="flex gap-2">
                    <Input
                      placeholder={t('feedback.phonePlaceholder')}
                      value={lookupPhone}
                      onChange={(event) => setLookupPhone(event.target.value)}
                    />
                    <Button type="submit" size="icon" disabled={looking} aria-label={t('feedback.search')}>
                      <Search className="h-4 w-4" />
                    </Button>
                  </form>

                  {tickets && tickets.length === 0 && (
                    <p className="text-sm text-muted-foreground">{t('feedback.noTickets')}</p>
                  )}

                  {tickets?.map((ticket) => (
                    <div key={ticket.id} className="space-y-1.5 rounded-lg border p-3">
                      <div className="flex items-center justify-between gap-2">
                        <Badge variant={STATUS_BADGE_VARIANT[ticket.status]}>{t(`feedback.status_${ticket.status}`)}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(ticket.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm">{ticket.message}</p>
                      {ticket.adminReply && (
                        <div className="rounded-md bg-secondary px-2 py-1.5 text-sm">
                          <span className="font-medium">{t('feedback.adminReplyLabel')}:</span> {ticket.adminReply}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
