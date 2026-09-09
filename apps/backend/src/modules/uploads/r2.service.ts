import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';

export interface UploadableFile {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
}

/**
 * Cloudflare R2 (S3-compatible) video yuklash xizmati. R2 kalitlari
 * konstruktor emas, chaqiruv vaqtida o'qiladi — shu bosqichga tegishli
 * bo'lmagan (masalan e2e) testlarda R2_* environment o'rnatilmagan bo'lsa
 * ham, ilova butunlay ishga tushmay qolmaydi (faqat shu endpoint ishlamaydi).
 */
@Injectable()
export class R2Service {
  constructor(private readonly config: ConfigService) {}

  async uploadTenantVideo(tenantId: string, file: UploadableFile): Promise<string> {
    const { bucket, publicBaseUrl, client } = this.buildClient();

    const extension = file.originalname.includes('.') ? file.originalname.split('.').pop() : 'mp4';
    const key = `tenant-videos/${tenantId}/${randomUUID()}.${extension}`;

    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      }),
    );

    return `${publicBaseUrl}/${key}`;
  }

  private buildClient() {
    const endpoint = this.config.get<string>('R2_ENDPOINT');
    const accessKeyId = this.config.get<string>('R2_ACCESS_KEY_ID');
    const secretAccessKey = this.config.get<string>('R2_SECRET_ACCESS_KEY');
    const bucket = this.config.get<string>('R2_BUCKET_NAME');
    const publicBaseUrl = this.config.get<string>('R2_PUBLIC_BASE_URL');

    if (!endpoint || !accessKeyId || !secretAccessKey || !bucket || !publicBaseUrl) {
      throw new InternalServerErrorException("Cloudflare R2 sozlanmagan (R2_* environment o'zgaruvchilari kerak)");
    }

    const client = new S3Client({
      region: 'auto',
      endpoint,
      credentials: { accessKeyId, secretAccessKey },
    });

    return { bucket, publicBaseUrl: publicBaseUrl.replace(/\/$/, ''), client };
  }
}
