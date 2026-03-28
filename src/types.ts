export type UserRole = 'patient' | 'doctor' | 'admin';

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  emailVerified?: boolean;
  role: UserRole;
  createdAt: string;
  lastLogin?: string;
  previousLogin?: string;
  loginCount?: number;
  age?: number;
  sex?: 'Male' | 'Female' | 'Other';
  mobile?: string;
  bloodGroup?: string;
  address?: string;
  lastActiveTab?: string;
  healthMetrics?: HealthMetric[];
}

export interface HealthMetric {
  date: string;
  heartRate: number;
  bloodPressure: {
    systolic: number;
    diastolic: number;
  };
}

export interface Doctor {
  id: string;
  name: string;
  department: string;
  phone?: string;
  availability: {
    day: string;
    slots: string[];
  }[];
  experience: string;
}

export interface Appointment {
  id: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  doctorId: string;
  doctorName: string;
  time: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  createdAt: string;
}

export interface Prediction {
  id: string;
  userId: string;
  symptoms?: string;
  result: string;
  confidence: number;
  type: 'symptom' | 'skin';
  createdAt: string;
}

export interface Medicine {
  id: string;
  name: string;
  category: string;
  description: string;
}

export interface MedicineTaken {
  id: string;
  userId: string;
  medicineId: string;
  medicineName: string;
  dosage: string;
  takenAt: string;
}
