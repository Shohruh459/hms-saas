import { Star, Users } from 'lucide-react';
import Link from 'next/link';
import type { Room } from '../lib/api/types';
import { getAmenityIcon } from '../lib/amenity-icons';
import { useTranslations } from '../lib/i18n-provider';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from './ui/card';

export function RoomCard({ room }: { room: Room }) {
  const { t, locale } = useTranslations();

  return (
    <Card className="transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/15">
      <CardHeader>
        <CardTitle>
          {room.roomNumber} — {room.type}
        </CardTitle>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Users className="h-4 w-4" /> {room.capacity} {t('room.capacity')}
          </span>
          {room.rating && (
            <span className="flex items-center gap-1">
              <Star className="h-4 w-4 fill-amber-400 text-amber-400" /> {room.rating}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-2xl font-bold">
          {Number(room.pricePerNight).toLocaleString()}{' '}
          <span className="text-sm font-normal text-muted-foreground">so&apos;m / {t('room.perNight')}</span>
        </p>
        {room.amenities.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {room.amenities.map((amenity) => {
              const Icon = getAmenityIcon(amenity);
              return (
                <Badge key={amenity} variant="secondary" className="gap-1">
                  <Icon className="h-3 w-3" />
                  {t(`filters.amenity_${amenity}`)}
                </Badge>
              );
            })}
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Link href={`/${locale}/rooms/${room.id}/book`} className="w-full">
          <Button className="w-full">{t('room.book')}</Button>
        </Link>
      </CardFooter>
    </Card>
  );
}
