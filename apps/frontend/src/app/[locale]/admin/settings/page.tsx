'use client';

import { QrBusinessCardGenerator } from '../../../../components/admin/qr-business-card-generator';
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/card';
import { useTranslations } from '../../../../lib/i18n-provider';

export default function AdminSettingsPage() {
  const { t } = useTranslations();

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t('admin.settings')}</h1>

      <Card>
        <CardHeader>
          <CardTitle>{t('qrCard.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <QrBusinessCardGenerator />
        </CardContent>
      </Card>
    </div>
  );
}
