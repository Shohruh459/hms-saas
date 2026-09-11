'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { toast } from '../../hooks/use-toast';
import { fetchAdminFeedbacks, replyToFeedback } from '../../lib/api/feedback';
import type { AdminFeedback, FeedbackStatus } from '../../lib/api/types';
import { useTranslations } from '../../lib/i18n-provider';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';

const STATUS_BADGE_VARIANT: Record<FeedbackStatus, 'success' | 'secondary' | 'warning'> = {
  PENDING: 'warning',
  IN_REVIEW: 'secondary',
  RESOLVED: 'success',
};

export function SuperadminFeedbackTab() {
  const { t, locale } = useTranslations();
  const [feedbacks, setFeedbacks] = useState<AdminFeedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFeedback, setActiveFeedback] = useState<AdminFeedback | null>(null);
  const [replyText, setReplyText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    setLoading(true);
    try {
      setFeedbacks(await fetchAdminFeedbacks());
    } catch {
      setFeedbacks([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function openReply(feedback: AdminFeedback) {
    setActiveFeedback(feedback);
    setReplyText(feedback.adminReply ?? '');
  }

  async function handleReplySubmit(event: FormEvent) {
    event.preventDefault();
    if (!activeFeedback || !replyText.trim()) return;
    setSubmitting(true);
    try {
      const updated = await replyToFeedback(activeFeedback.id, replyText.trim());
      setFeedbacks((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      toast({ title: t('superadmin.updated'), variant: 'success' });
      setActiveFeedback(null);
    } catch {
      toast({ title: t('common.error'), variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <p className="text-muted-foreground">{t('common.loading')}</p>;
  }

  if (feedbacks.length === 0) {
    return <p className="text-muted-foreground">{t('superadmin.feedbackNoData')}</p>;
  }

  return (
    <>
      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="w-full min-w-[960px] text-sm">
          <thead className="bg-secondary/50 text-left">
            <tr>
              <th className="p-3 font-medium">{t('superadmin.feedbackHotel')}</th>
              <th className="p-3 font-medium">{t('superadmin.feedbackContact')}</th>
              <th className="p-3 font-medium">{t('superadmin.feedbackMessage')}</th>
              <th className="p-3 font-medium">{t('superadmin.status')}</th>
              <th className="p-3 font-medium">{t('superadmin.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {feedbacks.map((feedback) => (
              <tr key={feedback.id} className="border-t align-top">
                <td className="p-3">
                  <div className="font-medium">{feedback.tenant.name}</div>
                  <div className="text-xs text-muted-foreground">{feedback.tenant.subdomain}</div>
                </td>
                <td className="p-3 text-sm">
                  <div>{feedback.guestName ?? '—'}</div>
                  <div className="text-muted-foreground">{feedback.guestPhone ?? '—'}</div>
                  {feedback.roomNumber && <div className="text-muted-foreground">{feedback.roomNumber}</div>}
                </td>
                <td className="p-3 max-w-[320px]">
                  <Badge variant="secondary" className="mb-1">
                    {t(`feedback.category_${feedback.category}`)}
                  </Badge>
                  <p className="line-clamp-2 text-sm" title={feedback.message}>
                    {feedback.aiSummary ?? feedback.message}
                  </p>
                  <p className="text-xs text-muted-foreground">{new Date(feedback.createdAt).toLocaleDateString(locale)}</p>
                </td>
                <td className="p-3">
                  <Badge variant={STATUS_BADGE_VARIANT[feedback.status]}>{t(`feedback.status_${feedback.status}`)}</Badge>
                </td>
                <td className="p-3">
                  <Button size="sm" onClick={() => openReply(feedback)}>
                    {feedback.adminReply ? t('superadmin.feedbackViewReply') : t('superadmin.feedbackReply')}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={Boolean(activeFeedback)} onOpenChange={(open) => !open && setActiveFeedback(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('superadmin.feedbackReplyModalTitle')}</DialogTitle>
          </DialogHeader>
          {activeFeedback && (
            <form onSubmit={handleReplySubmit} className="space-y-3">
              <p className="rounded-md bg-secondary p-3 text-sm">{activeFeedback.message}</p>
              <textarea
                required
                value={replyText}
                onChange={(event) => setReplyText(event.target.value)}
                placeholder={t('superadmin.feedbackReplyPlaceholder')}
                className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
              <Button type="submit" disabled={submitting} className="w-full">
                {t('superadmin.feedbackSubmitReply')}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
