export enum UserRole {
  ADMIN = 'admin',
  PARENT = 'parent',
  TEACHER = 'teacher'
}

export interface User {
  id: number;
  nom: string;
  email: string;
  role: UserRole;
  telephone?: string;
}

export interface Student {
  id: number;
  nom: string;
  prenom: string;
  dateNaissance: string;
  classe: string;
  niveauScolaire?: string;
  parentId: number;
  isArchived?: boolean;
  photoUrl?: string;
}

export interface Teacher {
  id: number;
  nom: string;
  prenom: string;
  matiere: string;
  telephone: string;
  photoUrl?: string;
  classes?: string[];
}

export interface Grade {
  id: number;
  studentId: number;
  matiere: string;
  note: number;
  coefficient: number;
  periode: string;
  date: string;
}

export enum AttendanceStatus {
  PRESENT = 'Présent',
  ABSENT_UNJUSTIFIED = 'Absent (Non justifié)',
  ABSENT_JUSTIFIED = 'Absent (Justifié)',
  LATE = 'En retard'
}

export interface Attendance {
  id: number;
  studentId: number;
  date: string;
  statut: AttendanceStatus;
  justification?: string;
}

export interface Event {
  id: number;
  title: string;
  description: string;
  event_date: string;
}

export interface Message {
  id: number;
  senderId: number;
  receiverId: number;
  contenu: string;
  date: string;
  attachmentName?: string;
  attachmentUrl?: string;
}

export interface TimeTableEntry {
  id: number;
  day: 'Lundi' | 'Mardi' | 'Mercredi' | 'Jeudi' | 'Vendredi';
  time: string;
  subject: string;
  teacher: string;
  classe: string;
}

export interface Document {
  id: number;
  title: string;
  description: string;
  url: string;
  mimeType?: string;
}

export interface DailyMenu {
  id: number;
  date: string; // YYYY-MM-DD
  starter: string;
  mainCourse: string;
  dessert: string;
  snack: string; // Goûter
  photoUrl?: string;
}

export interface Observation {
  id: number;
  studentId: number;
  date: string; // YYYY-MM-DD
  content: string;
  author: string; // e.g., "Administration"
}

export interface Notification {
  id: number;
  // This can be a specific user ID or a role name for broadcast
  userId: number;
  message: string;
  type: 'success' | 'error' | 'info';
  read: boolean;
  timestamp: string; // ISO String for dates
  link?: string; // Optional link to navigate to a specific view
}