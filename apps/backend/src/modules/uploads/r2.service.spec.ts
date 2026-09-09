import { ConfigService } from '@nestjs/config';
import { InternalServerErrorException } from '@nestjs/common';
import { R2Service } from './r2.service';

const sendMock = jest.fn();

jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn().mockImplementation(() => ({ send: sendMock })),
  PutObjectCommand: jest.fn().mockImplementation((input) => ({ input })),
}));

describe('R2Service.uploadTenantVideo', () => {
  let config: { get: jest.Mock };
  let service: R2Service;

  const env: Record<string, string> = {
    R2_ENDPOINT: 'https://acc.r2.cloudflarestorage.com',
    R2_ACCESS_KEY_ID: 'key',
    R2_SECRET_ACCESS_KEY: 'secret',
    R2_BUCKET_NAME: 'hms-videos',
    R2_PUBLIC_BASE_URL: 'https://videos.example.com/',
  };

  beforeEach(() => {
    sendMock.mockReset();
    config = { get: jest.fn((key: string) => env[key]) };
    service = new R2Service(config as unknown as ConfigService);
  });

  it('R2 sozlanmagan bo\'lsa InternalServerErrorException tashlaydi', async () => {
    config.get.mockReturnValue(undefined);

    await expect(
      service.uploadTenantVideo('tenant-1', { buffer: Buffer.from('x'), mimetype: 'video/mp4', originalname: 'a.mp4' }),
    ).rejects.toBeInstanceOf(InternalServerErrorException);
  });

  it("to'g'ri sozlamalar bilan R2'ga yuklaydi va ommaviy URL qaytaradi", async () => {
    sendMock.mockResolvedValue({});

    const url = await service.uploadTenantVideo('tenant-1', {
      buffer: Buffer.from('video-bytes'),
      mimetype: 'video/mp4',
      originalname: 'hotel-tour.mp4',
    });

    expect(sendMock).toHaveBeenCalledTimes(1);
    expect(url).toMatch(/^https:\/\/videos\.example\.com\/tenant-videos\/tenant-1\/.+\.mp4$/);
  });
});
