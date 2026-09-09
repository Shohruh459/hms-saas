import { Injectable } from '@nestjs/common';
import { Prisma, TenantStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DiscoveryService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Faqat ACTIVE va videoApproved mehmonxonalar — reyting ro'yxati, xarita
   * (lat/lng) va Reels-uslubidagi video feed uchun bitta manba. `region`
   * berilsa, faqat shu hududdagi mehmonxonalar qaytariladi.
   */
  async findHotels(region?: string) {
    const tenants = await this.prisma.tenant.findMany({
      where: {
        status: TenantStatus.ACTIVE,
        videoApproved: true,
        videoUrl: { not: null },
        ...(region ? { region } : {}),
      },
      include: { rooms: { select: { rating: true } } },
    });

    return tenants
      .map((tenant) => ({
        id: tenant.id,
        name: tenant.name,
        subdomain: tenant.subdomain,
        region: tenant.region,
        address: tenant.address,
        latitude: tenant.latitude,
        longitude: tenant.longitude,
        videoUrl: tenant.videoUrl,
        rating: this.averageRating(tenant.rooms),
      }))
      .sort((a, b) => (b.rating ?? -1) - (a.rating ?? -1));
  }

  private averageRating(rooms: { rating: Prisma.Decimal | null }[]): number | null {
    const ratings = rooms.map((room) => room.rating).filter((rating): rating is Prisma.Decimal => rating !== null).map(Number);
    if (ratings.length === 0) return null;
    return Math.round((ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length) * 10) / 10;
  }
}
