// api-mock.ts
// Ce fichier simule le backend. Il utilise le localStorage du navigateur pour conserver les données.

import { User, Student, Teacher, Grade, Attendance, Event, Message, TimeTableEntry, Document, DailyMenu, Observation, Notification, UserRole, AttendanceStatus } from './types';

// --- Configuration ---
const FAKE_DELAY = 200; // Simule une latence réseau en ms
const DB_KEY = 'dar-ennadjah-mock-db';

// --- Base de données en mémoire ---
let db: {
  users: (User & {password?: string})[],
  students: Student[],
  teachers: Teacher[],
  grades: Grade[],
  attendance: Attendance[],
  events: Event[],
  messages: Message[],
  timetable_entries: TimeTableEntry[],
  documents: Document[],
  daily_menus: DailyMenu[],
  observations: Observation[],
  notifications: Notification[],
} = {
  users: [],
  students: [],
  teachers: [],
  grades: [],
  attendance: [],
  events: [],
  messages: [],
  timetable_entries: [],
  documents: [],
  daily_menus: [],
  observations: [],
  notifications: [],
};

// --- Fonctions utilitaires de la base de données ---
const simulateDelay = () => new Promise(resolve => setTimeout(resolve, FAKE_DELAY));

const saveDb = () => {
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(db));
  } catch (e) {
    console.error("Impossible d'enregistrer la base de données simulée dans localStorage", e);
  }
};

const loadDb = () => {
  try {
    const serializedDb = localStorage.getItem(DB_KEY);
    if (serializedDb) {
      db = JSON.parse(serializedDb);
      console.log("Base de données simulée chargée depuis localStorage.");
    } else {
      initializeDefaultData();
      saveDb();
      console.log("Données simulées par défaut initialisées.");
    }
  } catch (e) {
    console.error("Impossible de charger la base de données simulée depuis localStorage", e);
    initializeDefaultData();
  }
};

const generateRandomPassword = (length = 8) => {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let password = '';
    for (let i = 0; i < length; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
};

// --- Données par défaut ---
const initializeDefaultData = () => {
  db.users = [
    { id: 1, nom: 'Ali Benali', email: 'parent1@test.com', role: UserRole.PARENT, telephone: '0661234567', password: '123' },
    { id: 2, nom: 'Fatima Zohra', email: 'parent2@test.com', role: UserRole.PARENT, telephone: '0771234567', password: '123' },
    { id: 3, nom: 'Yacine Bouzid', email: 'parent3@test.com', role: UserRole.PARENT, telephone: '0551234567', password: '123' },
    { id: 4, nom: 'Admin', email: 'admin@enajah.com', role: UserRole.ADMIN, telephone: '0550000000', password: 'admin' },
  ];
  db.students = [
    { id: 101, nom: 'Benali', prenom: 'Karim', dateNaissance: '2018-05-10', classe: 'CP', niveauScolaire: 'Primaire', parentId: 1, isArchived: false, photoUrl: 'https://storage.googleapis.com/aidevs/3565893D903D4A86/0.jpg' },
    { id: 102, nom: 'Benali', prenom: 'Sofia', dateNaissance: '2016-09-22', classe: 'CE2', niveauScolaire: 'Primaire', parentId: 1, isArchived: false, photoUrl: 'https://storage.googleapis.com/aidevs/3565893D903D4A86/1.jpg' },
    { id: 103, nom: 'Zohra', prenom: 'Amina', dateNaissance: '2018-03-15', classe: 'CP', niveauScolaire: 'Primaire', parentId: 2, isArchived: false, photoUrl: 'https://storage.googleapis.com/aidevs/3565893D903D4A86/2.jpg' },
  ];
  db.teachers = [
    { id: 201, nom: 'Khelifi', prenom: 'Nadia', matiere: 'Français', telephone: '0790123456', classes: ['CP', 'CE1'] },
    { id: 202, nom: 'Chaoui', prenom: 'Ahmed', matiere: 'Mathématiques', telephone: '0690123456', classes: ['CE2', 'CM1'] },
  ];
  db.grades = [
    { id: 301, studentId: 101, matiere: 'Lecture', note: 18, coefficient: 2, periode: 'Trimestre 1', date: '2024-10-15' },
    { id: 302, studentId: 101, matiere: 'Calcul', note: 16, coefficient: 2, periode: 'Trimestre 1', date: '2024-10-20' },
    { id: 303, studentId: 103, matiere: 'Lecture', note: 17, coefficient: 2, periode: 'Trimestre 1', date: '2024-10-16' },
  ];
  db.attendance = [
    { id: 401, studentId: 102, date: '2024-10-10', statut: AttendanceStatus.ABSENT_JUSTIFIED, justification: 'Rendez-vous médical' },
    { id: 402, studentId: 102, date: '2024-10-21', statut: AttendanceStatus.LATE },
  ];
  db.timetable_entries = [
    { id: 501, day: 'Lundi', time: '08:30 - 10:00', subject: 'Lecture', teacher: 'Nadia Khelifi', classe: 'CP' },
    { id: 502, day: 'Lundi', time: '10:30 - 12:00', subject: 'Calcul', teacher: 'Ahmed Chaoui', classe: 'CP' },
  ];
  const today = new Date();
  db.daily_menus = [
    { id: 601, date: today.toISOString().split('T')[0], starter: 'Salade de saison', mainCourse: 'Poulet rôti et purée', dessert: 'Pomme', snack: 'Yaourt aux fruits' },
  ];
  db.observations = [
    { id: 701, studentId: 101, date: '2024-10-18', content: 'Karim a fait de très bons progrès en lecture cette semaine.', author: 'Administration' },
  ];
  db.notifications = [
    { id: 801, userId: 1, message: 'Bienvenue sur la nouvelle plateforme Dar Ennadjah !', type: 'info', read: false, timestamp: new Date().toISOString(), link: 'dashboard' },
  ];
  db.events = [
    { id: 901, title: "Fête de fin d'année", description: "Célébration de la fin de l'année scolaire avec tous les élèves.", event_date: '2025-06-20' },
  ];
  db.documents = [
    { id: 1001, title: 'Règlement intérieur', description: "Le règlement officiel de l'école pour l'année en cours.", url: '#' },
  ];
  db.messages = [
    { id: 1101, senderId: 2, receiverId: 4, contenu: "Bonjour, je voudrais savoir si l'excursion de jeudi est maintenue.", date: new Date(Date.now() - 86400000).toISOString() },
    { id: 1102, senderId: 4, receiverId: 2, contenu: "Bonjour Madame Zohra, oui l'excursion est bien maintenue. Cordialement.", date: new Date().toISOString() },
  ];
};

loadDb();

// --- Fonctions de l'API Simulée ---

const deepCopy = <T>(data: T): T => JSON.parse(JSON.stringify(data));

const addNotification = async (userId: number, message: string, type: 'success'|'error'|'info', link: string) => {
    const newNotif: Notification = {
        id: Date.now(),
        userId, message, type, link,
        read: false,
        timestamp: new Date().toISOString(),
    };
    db.notifications.push(newNotif);
    saveDb();
};

// --- Implémentations ---

export const uploadPhoto = async (photo: File): Promise<{ photoUrl: string }> => {
    await simulateDelay();
    // In a real mock, you might convert the file to a base64 URL
    // For simplicity, we'll return a placeholder.
    return { photoUrl: 'https://i.ibb.co/9mP3NfDm/305405320-496622795802027-1850231703747853571-n.jpg' };
};

export const parentLogin = async (credentials: { email: string, password: string }): Promise<User> => {
    await simulateDelay();
    const user = db.users.find(u => u.email === credentials.email && u.role === UserRole.PARENT);
    if (user && user.password === credentials.password) {
        const { password, ...userToReturn } = user;
        return deepCopy(userToReturn);
    }
    throw new Error('Email ou mot de passe incorrect.');
};

// Users
export const getUsers = async (): Promise<User[]> => { await simulateDelay(); return deepCopy(db.users.map(({password, ...u}) => u)); };
export const addUser = async (data: Omit<User, 'id' | 'role'>): Promise<User & { generatedPassword?: string }> => {
    await simulateDelay();
    if (db.users.some(u => u.email.toLowerCase() === data.email.toLowerCase())) {
        throw new Error("Duplicate entry for email");
    }
    const generatedPassword = generateRandomPassword();
    const newUser: User & {password?: string} = { ...data, id: Date.now(), role: UserRole.PARENT, password: generatedPassword };
    db.users.push(newUser);
    saveDb();
    const { password, ...userToReturn } = newUser;
    return deepCopy({ ...userToReturn, generatedPassword });
};
export const updateUser = async (data: User): Promise<User> => {
    await simulateDelay();
    db.users = db.users.map(u => u.id === data.id ? { ...u, ...data } : u);
    saveDb();
    return deepCopy(data);
};
export const deleteUser = async (id: number): Promise<void> => {
    await simulateDelay();
    db.users = db.users.filter(u => u.id !== id);
    saveDb();
};
export const resetParentPassword = async (id: number): Promise<{ newPassword: string }> => {
    await simulateDelay();
    const newPassword = generateRandomPassword();
    db.users = db.users.map(u => u.id === id ? { ...u, password: newPassword } : u);
    saveDb();
    return { newPassword };
};
export const sendPasswordByEmail = async (id: number, password: string): Promise<{ success: boolean }> => {
    await simulateDelay();
    console.log(`SIMULATION: Envoi de l'email au parent ${id} avec le mot de passe ${password}`);
    return { success: true };
};

// Students
export const getStudents = async (): Promise<Student[]> => { await simulateDelay(); return deepCopy(db.students); };
export const addStudent = async (data: Omit<Student, 'id'>): Promise<Student> => {
    await simulateDelay();
    const newStudent: Student = { ...data, id: Date.now() };
    db.students.push(newStudent);
    saveDb();
    return deepCopy(newStudent);
};
export const updateStudent = async (data: Student): Promise<Student> => {
    await simulateDelay();
    db.students = db.students.map(s => s.id === data.id ? data : s);
    saveDb();
    return deepCopy(data);
};

// Teachers
export const getTeachers = async (): Promise<Teacher[]> => { await simulateDelay(); return deepCopy(db.teachers); };
export const addTeacher = async (data: Omit<Teacher, 'id'>): Promise<Teacher> => {
    await simulateDelay();
    const newTeacher: Teacher = { ...data, id: Date.now() };
    db.teachers.push(newTeacher);
    saveDb();
    return deepCopy(newTeacher);
};
export const updateTeacher = async (data: Teacher): Promise<Teacher> => {
    await simulateDelay();
    db.teachers = db.teachers.map(t => t.id === data.id ? data : t);
    saveDb();
    return deepCopy(data);
};
export const deleteTeacher = async (id: number): Promise<void> => {
    await simulateDelay();
    db.teachers = db.teachers.filter(t => t.id !== id);
    saveDb();
};

// Grades
export const getGrades = async (): Promise<Grade[]> => { await simulateDelay(); return deepCopy(db.grades); };
export const addGrade = async (data: Omit<Grade, 'id'>): Promise<Grade> => {
    await simulateDelay();
    const newGrade: Grade = { ...data, id: Date.now() };
    db.grades.push(newGrade);
    const student = db.students.find(s => s.id === data.studentId);
    if (student) {
        await addNotification(student.parentId, `Nouvelle note en ${data.matiere} pour ${student.prenom}: ${data.note}/20.`, 'info', 'suivi');
    }
    saveDb();
    return deepCopy(newGrade);
};
export const updateGrade = async (data: Grade): Promise<Grade> => {
    await simulateDelay();
    db.grades = db.grades.map(g => g.id === data.id ? data : g);
    saveDb();
    return deepCopy(data);
};
export const deleteGrade = async (id: number): Promise<void> => {
    await simulateDelay();
    db.grades = db.grades.filter(g => g.id !== id);
    saveDb();
};

// Attendance
export const getAttendance = async (): Promise<Attendance[]> => { await simulateDelay(); return deepCopy(db.attendance); };
export const addAttendance = async (data: Omit<Attendance, 'id'>): Promise<Attendance> => {
    await simulateDelay();
    const newAttendance: Attendance = { ...data, id: Date.now() };
    db.attendance.push(newAttendance);
    const student = db.students.find(s => s.id === data.studentId);
    if (student) {
        await addNotification(student.parentId, `Nouveau suivi pour ${student.prenom}: ${data.statut} le ${new Date(data.date).toLocaleDateString('fr-FR')}.`, data.statut.includes('Absent') ? 'error' : 'info', 'suivi');
    }
    saveDb();
    return deepCopy(newAttendance);
};
export const updateAttendance = async (data: Attendance): Promise<Attendance> => {
    await simulateDelay();
    db.attendance = db.attendance.map(a => a.id === data.id ? data : a);
    saveDb();
    return deepCopy(data);
};
export const deleteAttendance = async (id: number): Promise<void> => {
    await simulateDelay();
    db.attendance = db.attendance.filter(a => a.id !== id);
    saveDb();
};

// Observations
export const getObservations = async (): Promise<Observation[]> => { await simulateDelay(); return deepCopy(db.observations); };
export const addObservation = async (data: Omit<Observation, 'id'>): Promise<Observation> => {
    await simulateDelay();
    const newObservation: Observation = { ...data, id: Date.now() };
    db.observations.push(newObservation);
    const student = db.students.find(s => s.id === data.studentId);
    if (student) {
        await addNotification(student.parentId, `Nouvelle observation pour ${student.prenom}.`, 'info', 'observations');
    }
    saveDb();
    return deepCopy(newObservation);
};
export const updateObservation = async (data: Observation): Promise<Observation> => {
    await simulateDelay();
    db.observations = db.observations.map(o => o.id === data.id ? data : o);
    saveDb();
    return deepCopy(data);
};
export const deleteObservation = async (id: number): Promise<void> => {
    await simulateDelay();
    db.observations = db.observations.filter(o => o.id !== id);
    saveDb();
};

// Timetable
export const getTimetable = async (): Promise<TimeTableEntry[]> => { await simulateDelay(); return deepCopy(db.timetable_entries); };
export const updateTimetable = async (data: TimeTableEntry[], classe: string): Promise<TimeTableEntry[]> => {
    await simulateDelay();
    const otherClasses = db.timetable_entries.filter(t => t.classe.toLowerCase() !== classe.toLowerCase());
    const newTimetable = data.map((d, i) => ({...d, id: Date.now() + i}));
    db.timetable_entries = [...otherClasses, ...newTimetable];
    const studentsInClass = db.students.filter(s => s.classe.toLowerCase() === classe.toLowerCase());
    const parentIds = [...new Set(studentsInClass.map(s => s.parentId))];
    for (const pid of parentIds) {
        await addNotification(pid, `L'emploi du temps pour la classe ${classe} a été mis à jour.`, 'info', 'suivi');
    }
    saveDb();
    return deepCopy(newTimetable);
};

// Messages
export const getMessages = async (): Promise<Message[]> => { await simulateDelay(); return deepCopy(db.messages); };
export const addMessage = async (data: Omit<Message, 'id'>): Promise<Message> => {
    await simulateDelay();
    const newMessage: Message = { ...data, id: Date.now() };
    db.messages.push(newMessage);
    const sender = db.users.find(u => u.id === data.senderId);
    if (sender) {
        await addNotification(data.receiverId, `Nouveau message de ${sender.nom}.`, 'info', 'messages');
    }
    saveDb();
    return deepCopy(newMessage);
};

// Events
export const getEvents = async (): Promise<Event[]> => { await simulateDelay(); return deepCopy(db.events); };
export const addEvent = async (data: Omit<Event, 'id'>): Promise<Event> => {
    await simulateDelay();
    const newEvent: Event = { ...data, id: Date.now() };
    db.events.push(newEvent);
    const parents = db.users.filter(u => u.role === UserRole.PARENT);
    for (const p of parents) {
        await addNotification(p.id, `Nouvel événement : "${data.title}" le ${new Date(data.event_date).toLocaleDateString('fr-FR')}.`, 'info', 'evenements');
    }
    saveDb();
    return deepCopy(newEvent);
};
export const updateEvent = async (data: Event): Promise<Event> => {
    await simulateDelay();
    db.events = db.events.map(e => e.id === data.id ? data : e);
    saveDb();
    return deepCopy(data);
};
export const deleteEvent = async (id: number): Promise<void> => {
    await simulateDelay();
    db.events = db.events.filter(e => e.id !== id);
    saveDb();
};

// Documents
export const getDocuments = async (): Promise<Document[]> => { await simulateDelay(); return deepCopy(db.documents); };
export const addDocument = async (data: Omit<Document, 'id'>): Promise<Document> => {
    await simulateDelay();
    const newDocument: Document = { ...data, id: Date.now() };
    db.documents.push(newDocument);
    const parents = db.users.filter(u => u.role === UserRole.PARENT);
    for (const p of parents) {
        await addNotification(p.id, `Nouveau document disponible : "${data.title}".`, 'info', 'documents');
    }
    saveDb();
    return deepCopy(newDocument);
};
export const updateDocument = async (data: Document): Promise<Document> => {
    await simulateDelay();
    db.documents = db.documents.map(d => d.id === data.id ? data : d);
    saveDb();
    return deepCopy(data);
};
export const deleteDocument = async (id: number): Promise<void> => {
    await simulateDelay();
    db.documents = db.documents.filter(d => d.id !== id);
    saveDb();
};

// Menus
export const getMenus = async (): Promise<DailyMenu[]> => { await simulateDelay(); return deepCopy(db.daily_menus); };
export const addMenu = async (data: Omit<DailyMenu, 'id'>): Promise<DailyMenu> => {
    await simulateDelay();
    const existing = db.daily_menus.find(m => m.date === data.date);
    if (existing) {
        return updateMenu({ ...data, id: existing.id });
    }
    const newMenu: DailyMenu = { ...data, id: Date.now() };
    db.daily_menus.push(newMenu);
    saveDb();
    return deepCopy(newMenu);
};
export const updateMenu = async (data: DailyMenu): Promise<DailyMenu> => {
    await simulateDelay();
    db.daily_menus = db.daily_menus.map(m => m.id === data.id ? data : m);
    saveDb();
    return deepCopy(data);
};
export const deleteMenu = async (id: number): Promise<void> => {
    await simulateDelay();
    db.daily_menus = db.daily_menus.filter(m => m.id !== id);
    saveDb();
};

// Notifications
export const getNotifications = async (): Promise<Notification[]> => { await simulateDelay(); return deepCopy(db.notifications.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())); };
export const markNotificationAsRead = async (id: number): Promise<{ success: boolean }> => {
    await simulateDelay();
    db.notifications = db.notifications.map(n => n.id === id ? { ...n, read: true } : n);
    saveDb();
    return { success: true };
};
export const markAllNotificationsAsRead = async (userId: number): Promise<{ success: boolean }> => {
    await simulateDelay();
    db.notifications = db.notifications.map(n => n.userId === userId ? { ...n, read: true } : n);
    saveDb();
    return { success: true };
};
