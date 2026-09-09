'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Button } from '../../../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/card';
import { Input } from '../../../../components/ui/input';
import { Label } from '../../../../components/ui/label';
import { toast } from '../../../../hooks/use-toast';
import { useAuth } from '../../../../lib/auth-context';
import { getGoogleAuthUrl } from '../../../../lib/google-auth';
import { useTranslations } from '../../../../lib/i18n-provider';

export default function AdminLoginPage() {
  const { t, locale } = useTranslations();
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      const user = await login({ email, password });
      router.push(user.role === 'HOUSEKEEPER' ? `/${locale}/admin/tasks` : `/${locale}/admin/dashboard`);
    } catch {
      toast({ title: t('common.error'), variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-secondary/30">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{t('admin.loginTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="email">{t('auth.email')}</Label>
              <Input id="email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="password">{t('auth.password')}</Label>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>
            <Button type="submit" disabled={submitting} className="w-full">
              {t('auth.submitLogin')}
            </Button>
          </form>
          <div className="my-4 flex items-center gap-2 text-xs uppercase text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            <span>{t('auth.or')}</span>
            <span className="h-px flex-1 bg-border" />
          </div>
          <a href={getGoogleAuthUrl()} className="block">
            <Button type="button" variant="outline" className="w-full">
              {t('auth.continueWithGoogle')}
            </Button>
          </a>
        </CardContent>
      </Card>
    </main>
  );
}
