'use client';

import { useEffect, useState } from 'react';
import { Button } from '../../../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/card';
import { toast } from '../../../../hooks/use-toast';
import { useSocketEvent } from '../../../../hooks/use-socket';
import { fetchServiceRequests, staffFulfillServiceRequest } from '../../../../lib/api/service-requests';
import type { ServiceRequest } from '../../../../lib/api/types';
import { useTranslations } from '../../../../lib/i18n-provider';

export default function HousekeeperTasksPage() {
  const { t } = useTranslations();
  const [tasks, setTasks] = useState<ServiceRequest[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});

  async function load() {
    try {
      setTasks(await fetchServiceRequests('APPROVED_BY_ADMIN'));
    } catch {
      setTasks([]);
    }
  }

  useEffect(() => {
    load();
  }, []);

  useSocketEvent('service-request.approved', () => load());

  async function handleFulfill(id: string, completed: boolean) {
    try {
      await staffFulfillServiceRequest(id, completed, notes[id]);
      load();
    } catch {
      toast({ title: t('common.error'), variant: 'destructive' });
    }
  }

  return (
    <div className="mx-auto max-w-md space-y-4">
      <h1 className="text-2xl font-bold">{t('admin.tasks')}</h1>
      {tasks.length === 0 && <p className="text-muted-foreground">{t('admin.noRequests')}</p>}
      <div className="space-y-3">
        {tasks.map((task) => (
          <Card key={task.id}>
            <CardHeader>
              <CardTitle className="text-base">{task.room?.roomNumber ?? task.roomId}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm">{task.reason}</p>
              <textarea
                placeholder={t('admin.staffNotes')}
                value={notes[task.id] ?? ''}
                onChange={(event) => setNotes((prev) => ({ ...prev, [task.id]: event.target.value }))}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
              <div className="grid grid-cols-2 gap-2">
                <Button onClick={() => handleFulfill(task.id, true)}>{t('admin.complete')}</Button>
                <Button variant="destructive" onClick={() => handleFulfill(task.id, false)}>
                  {t('admin.fail')}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
