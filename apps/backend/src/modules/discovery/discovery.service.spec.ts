import { TenantStatus } from '@prisma/client';
import { DiscoveryService } from './discovery.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('DiscoveryService.findHotels', () => {
  let prisma: { tenant: { findMany: jest.Mock } };
  let service: DiscoveryService;

  beforeEach(() => {
    prisma = { tenant: { findMany: jest.fn() } };
    service = new DiscoveryService(prisma as unknown as PrismaService);
  });

  it('faqat ACTIVE + videoApproved tenantlarni so\'raydi', async () => {
    prisma.tenant.findMany.mockResolvedValue([]);

    await service.findHotels();

    expect(prisma.tenant.findMany).toHaveBeenCalledWith({
      where: { status: TenantStatus.ACTIVE, videoApproved: true, videoUrl: { not: null } },
      include: { rooms: { select: { rating: true } } },
    });
  });

  it('region berilsa filtrga qo\'shadi', async () => {
    prisma.tenant.findMany.mockResolvedValue([]);

    await service.findHotels('Samarqand');

    expect(prisma.tenant.findMany).toHaveBeenCalledWith({
      where: { status: TenantStatus.ACTIVE, videoApproved: true, videoUrl: { not: null }, region: 'Samarqand' },
      include: { rooms: { select: { rating: true } } },
    });
  });

  it("xonalar reytingi asosida o'rtacha reytingni hisoblaydi va kamayish tartibida saralaydi", async () => {
    prisma.tenant.findMany.mockResolvedValue([
      { id: 'a', name: 'Hotel A', subdomain: 'a', region: null, address: null, latitude: null, longitude: null, videoUrl: 'u1', rooms: [{ rating: 3 }, { rating: 4 }] },
      { id: 'b', name: 'Hotel B', subdomain: 'b', region: null, address: null, latitude: null, longitude: null, videoUrl: 'u2', rooms: [{ rating: 5 }] },
      { id: 'c', name: 'Hotel C', subdomain: 'c', region: null, address: null, latitude: null, longitude: null, videoUrl: 'u3', rooms: [] },
    ]);

    const result = await service.findHotels();

    expect(result.map((h) => h.id)).toEqual(['b', 'a', 'c']);
    expect(result[0].rating).toBe(5);
    expect(result[1].rating).toBe(3.5);
    expect(result[2].rating).toBeNull();
  });
});
