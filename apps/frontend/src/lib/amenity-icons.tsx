import { Coffee, Dumbbell, ParkingCircle, Trophy, Waves, Wifi, type LucideIcon } from 'lucide-react';

export const AMENITY_ICONS: Record<string, LucideIcon> = {
  pool: Waves,
  gym: Dumbbell,
  tennis: Trophy,
  wifi: Wifi,
  breakfast: Coffee,
  parking: ParkingCircle,
};

export function getAmenityIcon(amenity: string): LucideIcon {
  return AMENITY_ICONS[amenity] ?? Wifi;
}
