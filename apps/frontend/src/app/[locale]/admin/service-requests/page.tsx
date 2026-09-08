'use client';

import { useEffect, useState } from 'react';
import { Badge } from '../../../../components/ui/badge';
import { Button } from '../../../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/card';
import { toast } from '../../../../hooks/use-toast';
import { useSocketEvent } from '../../../../hooks/use-socket';
import { adminApproveServiceRequest, fetchServiceRequests } from '../../../../lib/api/service-requests';
import type { ServiceRequest } from '../../../../lib/api/types';
import { useTranslations } from '../../../../lib/i18n-provider';

export default function ServiceRequestsPage() {
  const { t } = useTranslations();
  const [requests, setRequests] = useState<ServiceRequest[]>([]);

  async function load() {
    try {
      setRequests(await fetchServiceRequests());
    } catch {
      setRequests([]);
    }
  }

  useEffect(() => {
    load();
  }, []);

  useSocketEvent('service-request.created', () => load());
  useSocketEvent('service-request.approved', () => load());
  useSocketEvent('service-request.rejected', () => load());
  useSocketEvent('service-request.completed', () => load());
  useSocketEvent('service-request.failed', () => load());

  async function handleDecision(id: string, approve: boolean) {
    try {
      await adminApproveServiceRequest(id, approve);
      load();
    } catch {
      toast({ title: t('common.error'), variant: 'destructive' });
    }
  }

  const pending = requests.filter((request) => request.status === 'PENDING_ADMIN');
  const others = requests.filter((request) => request.status !== 'PENDING_ADMIN');

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t('admin.serviceRequests')}</h1>

      {requests.length === 0 && <p className="text-muted-foreground">{t('admin.noRequests')}</p>}

      <div className="grid grid-cols-1 gap-4">
        {[...pending, ...others].map((request) => (
          <Card key={request.id}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-base">
                <span>
                  {request.room?.roomNumber ?? request.roomId} — {request.guest?.fullName}
                </span>
                <Badge>{request.status}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm">{request.reason}</p>
              {request.status === 'PENDING_ADMIN' && (
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => handleDecision(request.id, true)}>
                    {t('admin.approve')}
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => handleDecision(request.id, false)}>
                    {t('admin.reject')}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
