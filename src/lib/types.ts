// ✅ This is what we need in vaidik-website/lib/types.ts
export interface User {
  id: string;
  _id: string;
  name: string;
  email: string;
  phoneNumber: string;
  profileImage?: string;
  wallet: { balance: number; currency: string;};
  role: 'user' | 'astrologer';
}

export interface Astrologer {
  _id: string;
  name: string;
  bio: string;
  profilePicture?: string;
  specializations: string[];
  languages: string[];
  experienceYears: number;
  pricing: {
    chat: number;
    call: number;
    videoCall: number;
  };
  country: string;
  ratings: {
    average: number;
    total: number;
    breakdown: {
      5: number;
      4: number;
      3: number;
      2: number;
      1: number;
    };
    approvedReviews: number;
  };
  stats: {
    totalEarnings: number;
    totalMinutes: number;
    totalOrders: number;
    callOrders: number;
    chatOrders: number;
  };
  isChatEnabled: boolean;
  isCallEnabled: boolean;
  availability: {
    isOnline: boolean;
    isAvailable: boolean;
    busyUntil?: string;
    isLive?: boolean;
  };
  tier?: string;
}

export interface WalletTransaction {
  _id: string;
  user: string;
  type: 'recharge' | 'deduction' | 'refund' | 'bonus';
  amount: number;
  description: string;
  transactionId?: string;
  status: 'completed' | 'pending' | 'failed';
  paymentGateway?: string;
  metadata?: {
    orderId?: string;
    astrologerId?: string;
    serviceType?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface PaymentLog {
  _id: string;
  user: string;
  amount: number;
  paymentGateway: string;
  paymentId?: string;
  orderId?: string;
  status: 'pending' | 'completed' | 'failed';
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WalletStats {
  currentBalance: number;
  totalRecharges: number;
  totalSpent: number;
  lifetimeEarnings: number;
}

export interface Order {
  _id: string;
  user: string;
  astrologer: {
    _id: string;
    name: string;
    profileImage: string;
    specialization: string[];
  };
  type: 'chat' | 'call' | 'video';
  status: 'pending' | 'ongoing' | 'completed' | 'cancelled' | 'refunded';
  duration: number; // in seconds
  amount: number;
  paidAmount: number;
  startTime?: string;
  endTime?: string;
  rating?: number;
  review?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrderStats {
  totalOrders: number;
  totalSpent: number;
  totalMinutes: number;
  completedOrders: number;
  cancelledOrders: number;
}
export interface Report {
  _id: string;
  user: string;
  astrologer: {
    _id: string;
    name: string;
    profileImage: string;
  };
  type: 'birth_chart' | 'kundli' | 'numerology' | 'tarot' | 'palmistry' | 'vastu' | 'other';
  title: string;
  description?: string;
  content?: string;
  fileUrl?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'delivered';
  price: number;
  createdAt: string;
  updatedAt: string;
  deliveredAt?: string;
}