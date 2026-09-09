'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import { Badge } from '../../../../components/ui/badge';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import { toast } from '../../../../hooks/use-toast';
import {
  approveTenantVideo,
  extendTenantSubscription,
  fetchAdminTenants,
  fetchSuperadminAccessList,
  grantSuperadminAccess,
  rejectTenantVideo,
  revokeSuperadminAccess,
  updateTenantStatus,
} from '../../../../lib/api/admin';
import type { AdminTenant, SuperadminAccessEntry, TenantStatus } from '../../../../lib/api/types';
import { useAuth } from '../../../../lib/auth-context';
import { useTranslations } from '../../../../lib/i18n-provider';

const STATUS_BADGE_VARIANT: Record<TenantStatus, 'success' | 'secondary' | 'warning' | 'destructive'> = {
  ACTIVE: 'success',
  PENDING: 'warning',
  BLOCKED: 'destructive',
  EXPIRED: 'secondary',
};

function isForbidden(error: unknown): boolean {
  return Boolean((error as { response?: { status?: number } })?.response?.status === 403);
}

export default function SuperadminPage() {
  const { t, locale } = useTranslations();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [tenants, setTenants] = useState<AdminTenant[]>([]);
  const [accessList, setAccessList] = useState<SuperadminAccessEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [grantSubmitting, setGrantSubmitting] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (user && user.role !== 'SUPER_ADMIN') {
      router.push(`/${locale}/admin/dashboard`);
    }
  }, [authLoading, user, locale, router]);

  async function load() {
    setLoading(true);
    try {
      const [tenantsRes, accessRes] = await Promise.all([fetchAdminTenants(), fetchSuperadminAccessList()]);
      setTenants(tenantsRes);
      setAccessList(accessRes);
      setAccessDenied(false);
    } catch (error) {
      if (isForbidden(error)) {
        setAccessDenied(true);
      }
      setTenants([]);
      setAccessList([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (user?.role === 'SUPER_ADMIN') {
      load();
    }
  }, [user]);

  async function run(tenantId: string, action: () => Promise<AdminTenant>) {
    setBusyId(tenantId);
    try {
      const updated = await action();
      setTenants((prev) => prev.map((tenant) => (tenant.id === updated.id ? updated : tenant)));
      toast({ title: t('superadmin.updated'), variant: 'success' });
    } catch {
      toast({ title: t('common.error'), variant: 'destructive' });
    } finally {
      setBusyId(null);
    }
  }

  async function handleGrant(event: FormEvent) {
    event.preventDefault();
    if (!newEmail.trim()) return;
    setGrantSubmitting(true);
    try {
      await grantSuperadminAccess(newEmail.trim());
      setNewEmail('');
      setAccessList(await fetchSuperadminAccessList());
      toast({ title: t('superadmin.updated'), variant: 'success' });
    } catch {
      toast({ title: t('common.error'), variant: 'destructive' });
    } finally {
      setGrantSubmitting(false);
    }
  }

  async function handleRevoke(email: string) {
    setBusyId(email);
    try {
      await revokeSuperadminAccess(email);
      setAccessList((prev) => prev.filter((entry) => entry.email !== email));
      toast({ title: t('superadmin.updated'), variant: 'success' });
    } catch {
      toast({ title: t('common.error'), variant: 'destructive' });
    } finally {
      setBusyId(null);
    }
  }

  if (user?.role !== 'SUPER_ADMIN') {
    return null;
  }

  if (accessDenied) {
    return (
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">{t('superadmin.title')}</h1>
        <p className="text-destructive">{t('superadmin.accessDenied')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">{t('superadmin.title')}</h1>

        {loading ? (
          <p className="text-muted-foreground">{t('common.loading')}</p>
        ) : tenants.length === 0 ? (
          <p className="text-muted-foreground">{t('superadmin.noHotels')}</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border bg-card">
            <table className="w-full min-w-[860px] text-sm">
              <thead className="bg-secondary/50 text-left">
                <tr>
                  <th className="p-3 font-medium">{t('superadmin.hotel')}</th>
                  <th className="p-3 font-medium">{t('superadmin.region')}</th>
                  <th className="p-3 font-medium">{t('superadmin.status')}</th>
                  <th className="p-3 font-medium">{t('superadmin.subscription')}</th>
                  <th className="p-3 font-medium">{t('superadmin.video')}</th>
                  <th className="p-3 font-medium">{t('superadmin.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {tenants.map((tenant) => {
                  const isBusy = busyId === tenant.id;
                  return (
                    <tr key={tenant.id} className="border-t align-top">
                      <td className="p-3">
                        <div className="font-medium">{tenant.name}</div>
                        <div className="text-xs text-muted-foreground">{tenant.subdomain}</div>
                      </td>
                      <td className="p-3">{tenant.region ?? '—'}</td>
                      <td className="p-3">
                        <Badge variant={STATUS_BADGE_VARIANT[tenant.status]}>{t(`superadmin.status_${tenant.status}`)}</Badge>
                      </td>
                      <td className="p-3">
                        {tenant.subscriptionEndsAt
                          ? new Date(tenant.subscriptionEndsAt).toLocaleDateString(locale)
                          : t('superadmin.noSubscription')}
                      </td>
                      <td className="p-3">
                        {tenant.videoUrl ? (
                          <div className="space-y-1">
                            <a href={tenant.videoUrl} target="_blank" rel="noreferrer" className="text-primary underline">
                              {t('superadmin.watchVideo')}
                            </a>
                            <div>
                              <Badge variant={tenant.videoApproved ? 'success' : 'warning'}>
                                {tenant.videoApproved ? t('superadmin.videoApproved') : t('superadmin.videoPending')}
                              </Badge>
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">{t('superadmin.noVideo')}</span>
                        )}
                      </td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-2">
                          {tenant.status !== 'ACTIVE' && (
                            <Button
                              size="sm"
                              disabled={isBusy}
                              onClick={() => run(tenant.id, () => updateTenantStatus(tenant.id, 'ACTIVE'))}
                            >
                              {t('superadmin.activate')}
                            </Button>
                          )}
                          {tenant.status !== 'BLOCKED' && (
                            <Button
                              size="sm"
                              variant="destructive"
                              disabled={isBusy}
                              onClick={() => run(tenant.id, () => updateTenantStatus(tenant.id, 'BLOCKED'))}
                            >
                              {t('superadmin.block')}
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={isBusy}
                            onClick={() => run(tenant.id, () => extendTenantSubscription(tenant.id))}
                          >
                            {t('superadmin.extend30')}
                          </Button>
                          {tenant.videoUrl && !tenant.videoApproved && (
                            <Button
                              size="sm"
                              disabled={isBusy}
                              onClick={() => run(tenant.id, () => approveTenantVideo(tenant.id))}
                            >
                              {t('superadmin.approveVideo')}
                            </Button>
                          )}
                          {tenant.videoUrl && tenant.videoApproved && (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={isBusy}
                              onClick={() => run(tenant.id, () => rejectTenantVideo(tenant.id))}
                            >
                              {t('superadmin.rejectVideo')}
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-bold">{t('superadmin.accessTitle')}</h2>
        <p className="text-sm text-muted-foreground">{t('superadmin.accessDescription')}</p>

        <form onSubmit={handleGrant} className="flex max-w-md flex-wrap gap-2">
          <Input
            type="email"
            required
            placeholder={t('superadmin.accessEmailPlaceholder')}
            value={newEmail}
            onChange={(event) => setNewEmail(event.target.value)}
            className="flex-1"
          />
          <Button type="submit" disabled={grantSubmitting}>
            {t('superadmin.accessGrant')}
          </Button>
        </form>

        <div className="overflow-x-auto rounded-lg border bg-card">
          <table className="w-full min-w-[520px] text-sm">
            <thead className="bg-secondary/50 text-left">
              <tr>
                <th className="p-3 font-medium">{t('superadmin.accessEmail')}</th>
                <th className="p-3 font-medium">{t('superadmin.accessGrantedBy')}</th>
                <th className="p-3 font-medium">{t('superadmin.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {accessList.map((entry) => (
                <tr key={entry.email} className="border-t">
                  <td className="p-3">
                    <div className="font-medium">{entry.email}</div>
                    {entry.isRoot && <Badge variant="secondary">{t('superadmin.accessRoot')}</Badge>}
                  </td>
                  <td className="p-3 text-muted-foreground">{entry.grantedBy ?? '—'}</td>
                  <td className="p-3">
                    {!entry.isRoot && (
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={busyId === entry.email}
                        onClick={() => handleRevoke(entry.email)}
                      >
                        {t('superadmin.accessRevoke')}
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
