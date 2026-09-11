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
export type RoomType = 'PRIVATE' | 'SHARED';
export type GenderPolicy = 'MALE_ONLY' | 'FEMALE_ONLY' | 'MIXED';
export type GuestGender = 'MALE' | 'FEMALE';

export interface Room {
  id: string;
  tenantId: string;
  roomNumber: string;
  floor: number;
  /** Xona uslubi/darajasi (masalan Standard, Deluxe, Suite) */
  category: string;
  pricePerNight: string;
  capacity: number;
  rating: string | null;
  amenities: string[];
  status: RoomStatus;
  type: RoomType;
  genderPolicy: GenderPolicy;
  totalBeds: number;
  pricePerBed: number | null;
  /** SHARED xonalar uchun server hisoblagan hozirgi bo'sh koykalar soni */
  remainingBeds?: number;
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
  bedsBooked: number;
  guestGender: GuestGender | null;
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

export type TenantStatus = 'PENDING' | 'ACTIVE' | 'BLOCKED' | 'EXPIRED';

export interface AdminTenant {
  id: string;
  name: string;
  subdomain: string;
  region: string | null;
  status: TenantStatus;
  subscriptionEndsAt: string | null;
  videoUrl: string | null;
  videoApproved: boolean;
  createdAt: string;
}

export interface SuperadminAccessEntry {
  email: string;
  grantedBy: string | null;
  createdAt: string | null;
  isRoot: boolean;
}

export interface DiscoveryHotel {
  id: string;
  name: string;
  subdomain: string;
  region: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  videoUrl: string | null;
  rating: number | null;
}

export type FeedbackCategory = 'COMPLAINT' | 'SUGGESTION' | 'GENERAL';
export type FeedbackStatus = 'PENDING' | 'IN_REVIEW' | 'RESOLVED';

export interface Feedback {
  id: string;
  tenantId: string;
  roomNumber: string | null;
  guestPhone: string | null;
  guestName: string | null;
  category: FeedbackCategory;
  message: string;
  aiSummary: string | null;
  status: FeedbackStatus;
  adminReply: string | null;
  repliedAt: string | null;
  repliedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FeedbackWithAiReply extends Feedback {
  aiReply: string;
}

export interface MyFeedbackTicket {
  id: string;
  message: string;
  category: FeedbackCategory;
  status: FeedbackStatus;
  adminReply: string | null;
  repliedAt: string | null;
  createdAt: string;
}

export interface AdminFeedback extends Feedback {
  tenant: { id: string; name: string; subdomain: string; phone: string | null };
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
