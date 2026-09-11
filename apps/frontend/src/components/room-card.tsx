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
          {room.roomNumber} — {room.category}
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
        {room.type === 'SHARED' && (
          <div className="flex flex-wrap gap-1 pt-1">
            <Badge variant="secondary">{t('room.type_SHARED')}</Badge>
            {room.genderPolicy === 'MALE_ONLY' && <Badge variant="secondary">{t('room.genderMaleOnly')}</Badge>}
            {room.genderPolicy === 'FEMALE_ONLY' && <Badge variant="secondary">{t('room.genderFemaleOnly')}</Badge>}
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-2">
        {room.type === 'SHARED' && room.pricePerBed ? (
          <p className="text-2xl font-bold">
            {Number(room.pricePerBed).toLocaleString()}{' '}
            <span className="text-sm font-normal text-muted-foreground">so&apos;m / {t('room.perBed')}</span>
          </p>
        ) : (
          <p className="text-2xl font-bold">
            {Number(room.pricePerNight).toLocaleString()}{' '}
            <span className="text-sm font-normal text-muted-foreground">so&apos;m / {t('room.perNight')}</span>
          </p>
        )}
        {room.type === 'SHARED' && (
          <p className="text-sm text-muted-foreground">
            {room.remainingBeds ?? room.totalBeds}/{room.totalBeds} {t('room.remainingBeds')}
          </p>
        )}
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
