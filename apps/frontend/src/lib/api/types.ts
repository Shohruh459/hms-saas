export type UserRole = 'SUPER_ADMIN' | 'HOTEL_OWNER' | 'RECEPTIONIST' | 'HOUSEKEEPER' | 'GUEST';

export interface User {
  id: string;
  tenantId: string | null;
  fullName: string;
  phone: string | null;
  email: string | null;
  role: UserRole;
}

export interface AuthResponse {
  accessToken: string;
  user: User;
}

export type RoomStatus = 'AVAILABLE' | 'OCCUPIED' | 'CLEANING' | 'MAINTENANCE';

export interface Room {
  id: string;
  tenantId: string;
  roomNumber: string;
  floor: number;
  type: string;
  pricePerNight: string;
  capacity: number;
  rating: string | null;
  amenities: string[];
  status: RoomStatus;
}

export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'CHECKED_IN' | 'CHECKED_OUT' | 'CANCELLED';
export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';

export interface Booking {
  id: string;
  tenantId: string;
  roomId: string;
  guestId: string;
  checkIn: string;
  checkOut: string;
  totalPrice: string;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  room?: { id: string; roomNumber: string; floor: number };
}

export type ServiceRequestStatus = 'PENDING_ADMIN' | 'APPROVED_BY_ADMIN' | 'REJECTED_BY_ADMIN' | 'COMPLETED' | 'FAILED';

export interface ServiceRequest {
  id: string;
  tenantId: string;
  roomId: string;
  guestId: string;
  reason: string;
  status: ServiceRequestStatus;
  staffNotes: string | null;
  createdAt: string;
  room?: { id: string; roomNumber: string; floor: number };
  guest?: { id: string; fullName: string; phone: string | null };
}

export type SupportTicketType = 'COMPLAINT' | 'HELP';
export type SupportTicketStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';

export interface SupportTicket {
  id: string;
  tenantId: string;
  guestId: string;
  type: SupportTicketType;
  message: string;
  status: SupportTicketStatus;
  response: string | null;
  createdAt: string;
}

export interface PublicTenant {
  id: string;
  name: string;
  subdomain: string;
  locale: string;
  address: string | null;
  phone: string | null;
  latitude: number | null;
  longitude: number | null;
  payments: {
    click: { merchantId: string; serviceId: string } | null;
    payme: { merchantId: string } | null;
    stripe: { enabled: boolean } | null;
  };
}
