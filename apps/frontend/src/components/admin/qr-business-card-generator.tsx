'use client';

import QRCode from 'qrcode';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '../ui/button';
import { fetchPublicTenant } from '../../lib/api/tenant';
import type { PublicTenant } from '../../lib/api/types';
import { useTranslations } from '../../lib/i18n-provider';

const CARD_WIDTH = 1050;
const CARD_HEIGHT = 600;
const SCALE = 2;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/** Mehmonxona uchun QR-vizitka (business card) — QR markazida, logotip fonda watermark sifatida. */
export function QrBusinessCardGenerator() {
  const { t, locale } = useTranslations();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tenant, setTenant] = useState<PublicTenant | null>(null);
  const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [rendering, setRendering] = useState(false);

  useEffect(() => {
    fetchPublicTenant()
      .then(setTenant)
      .catch(() => setTenant(null))
      .finally(() => setLoading(false));
  }, []);

  function handleLogoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setLogoDataUrl(reader.result as string);
    reader.readAsDataURL(file);
  }

  const draw = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas || !tenant) return;

    setRendering(true);
    try {
      canvas.width = CARD_WIDTH * SCALE;
      canvas.height = CARD_HEIGHT * SCALE;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);

      // Fon
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

      // Logotip — fonda yengil (transparent) watermark sifatida, butun kartani qoplaydi
      if (logoDataUrl) {
        try {
          const logoImg = await loadImage(logoDataUrl);
          const maxSize = Math.min(CARD_WIDTH, CARD_HEIGHT) * 0.85;
          const ratio = Math.min(maxSize / logoImg.width, maxSize / logoImg.height);
          const w = logoImg.width * ratio;
          const h = logoImg.height * ratio;
          ctx.save();
          ctx.globalAlpha = 0.08;
          ctx.drawImage(logoImg, (CARD_WIDTH - w) / 2, (CARD_HEIGHT - h) / 2, w, h);
          ctx.restore();
        } catch {
          // Logotip yuklanmasa ham vizitka QR/matn bilan davom etadi.
        }
      }

      // Chap tomon aksent chizig'i
      ctx.fillStyle = '#2563eb';
      ctx.fillRect(0, 0, 10, CARD_HEIGHT);

      // Kichik, aniq (transparent bo'lmagan) logotip — mehmonxona nomi yonida
      let textX = 60;
      if (logoDataUrl) {
        try {
          const logoImg = await loadImage(logoDataUrl);
          const badgeSize = 90;
          const ratio = Math.min(badgeSize / logoImg.width, badgeSize / logoImg.height);
          const w = logoImg.width * ratio;
          const h = logoImg.height * ratio;
          ctx.drawImage(logoImg, 60, 60, w, h);
        } catch {
          // e'tiborsiz qoldiriladi
        }
      }

      // Matnlar
      ctx.fillStyle = '#111827';
      ctx.font = 'bold 40px sans-serif';
      ctx.fillText(tenant.name, textX, 210, 520);

      ctx.font = '24px sans-serif';
      ctx.fillStyle = '#374151';
      let lineY = 260;
      if (tenant.address) {
        ctx.fillText(`📍 ${tenant.address}`, textX, lineY, 520);
        lineY += 36;
      }
      if (tenant.phone) {
        ctx.fillText(`📞 ${tenant.phone}`, textX, lineY, 520);
        lineY += 36;
      }

      ctx.font = 'bold 22px sans-serif';
      ctx.fillStyle = '#2563eb';
      ctx.fillText(t('qrCard.scanCaption'), textX, CARD_HEIGHT - 60, 520);

      // QR kod — o'ng tomonda, markazda
      const qrTargetUrl = `${window.location.origin}/${locale}`;
      const qrSize = 300;
      const qrCanvas = document.createElement('canvas');
      await QRCode.toCanvas(qrCanvas, qrTargetUrl, { width: qrSize, margin: 1, color: { dark: '#111827', light: '#ffffff' } });

      const qrX = CARD_WIDTH - qrSize - 90;
      const qrY = (CARD_HEIGHT - qrSize) / 2;
      // QR ortidagi oq quti — watermark ustida ham skanerlanishi uchun
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(qrX - 16, qrY - 16, qrSize + 32, qrSize + 32);
      ctx.strokeStyle = '#e5e7eb';
      ctx.strokeRect(qrX - 16, qrY - 16, qrSize + 32, qrSize + 32);
      ctx.drawImage(qrCanvas, qrX, qrY, qrSize, qrSize);
    } finally {
      setRendering(false);
    }
  }, [tenant, logoDataUrl, locale, t]);

  useEffect(() => {
    draw();
  }, [draw]);

  function downloadPng() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'vizitka.png';
      a.click();
      URL.revokeObjectURL(url);
    }, 'image/png');
  }

  async function downloadPdf() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const { jsPDF } = await import('jspdf');
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [88.9, 50.8] });
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, 88.9, 50.8);
    pdf.save('vizitka.pdf');
  }

  if (loading) {
    return <p className="text-muted-foreground">{t('common.loading')}</p>;
  }

  if (!tenant) {
    return <p className="text-destructive">{t('common.error')}</p>;
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="logo-upload" className="text-sm font-medium">
          {t('qrCard.logoLabel')}
        </label>
        <input
          id="logo-upload"
          type="file"
          accept="image/*"
          onChange={handleLogoChange}
          className="block text-sm text-muted-foreground"
        />
      </div>

      <div className="overflow-x-auto rounded-lg border bg-secondary/20 p-4">
        <canvas
          ref={canvasRef}
          style={{ width: CARD_WIDTH / 2, height: CARD_HEIGHT / 2 }}
          className="rounded shadow-sm"
          data-testid="qr-card-canvas"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" disabled={rendering} onClick={downloadPng}>
          {t('qrCard.downloadPng')}
        </Button>
        <Button type="button" variant="outline" disabled={rendering} onClick={downloadPdf}>
          {t('qrCard.downloadPdf')}
        </Button>
      </div>
    </div>
  );
}
