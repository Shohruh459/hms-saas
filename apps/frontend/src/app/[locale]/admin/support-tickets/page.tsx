'use client';

import { useEffect, useState } from 'react';
import { Badge } from '../../../../components/ui/badge';
import { Button } from '../../../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/card';
import { toast } from '../../../../hooks/use-toast';
import { useSocketEvent } from '../../../../hooks/use-socket';
import { fetchSupportTickets, respondSupportTicket } from '../../../../lib/api/support-tickets';
import type { SupportTicket } from '../../../../lib/api/types';
import { useTranslations } from '../../../../lib/i18n-provider';

export default function SupportTicketsPage() {
  const { t } = useTranslations();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [responses, setResponses] = useState<Record<string, string>>({});

  async function load() {
    try {
      setTickets(await fetchSupportTickets());
    } catch {
      setTickets([]);
    }
  }

  useEffect(() => {
    load();
  }, []);

  useSocketEvent('support-ticket.created', () => load());

  async function handleRespond(id: string, status: 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED') {
    const response = responses[id];
    if (!response?.trim()) return;
    try {
      await respondSupportTicket(id, response, status);
      load();
    } catch {
      toast({ title: t('common.error'), variant: 'destructive' });
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t('admin.supportTickets')}</h1>
      {tickets.length === 0 && <p className="text-muted-foreground">{t('admin.noRequests')}</p>}
      <div className="grid grid-cols-1 gap-4">
        {tickets.map((ticket) => (
          <Card key={ticket.id}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-base">
                <span>{t(`support.type_${ticket.type}`)}</span>
                <Badge>{ticket.status}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm">{ticket.message}</p>
              {ticket.response && <p className="text-sm text-muted-foreground">→ {ticket.response}</p>}
              {ticket.status !== 'CLOSED' && (
                <>
                  <textarea
                    value={responses[ticket.id] ?? ''}
                    onChange={(event) => setResponses((prev) => ({ ...prev, [ticket.id]: event.target.value }))}
                    placeholder={t('support.messagePlaceholder')}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" onClick={() => handleRespond(ticket.id, 'IN_PROGRESS')}>
                      IN_PROGRESS
                    </Button>
                    <Button size="sm" onClick={() => handleRespond(ticket.id, 'RESOLVED')}>
                      RESOLVED
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleRespond(ticket.id, 'CLOSED')}>
                      CLOSED
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
