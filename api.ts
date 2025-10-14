import { User, Student, Teacher, Grade, Attendance, Event, Message, TimeTableEntry, Document, DailyMenu, Observation, Notification } from './types';

const BASE_URL = 'http://localhost:3001/api';

// Helper pour les requêtes API
async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    let url = `${BASE_URL}${endpoint}`;

    // Ajout d'un paramètre anti-cache pour toutes les requêtes GET afin de garantir des données fraîches.
    if (!options.method || options.method.toUpperCase() === 'GET') {
        const separator = url.includes('?') ? '&' : '?';
        url += `${separator}_=${new Date().getTime()}`;
    }

    try {
        const response = await fetch(url, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
            },
            ...options,
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: response.statusText }));
            throw new Error(errorData.message || `Erreur API: ${response.status}`);
        }

        if (response.status === 204) { // No Content
            return {} as T;
        }

        return response.json();
    } catch (error) {
        console.error(`Erreur lors de la requête API vers ${endpoint}:`, error);
        throw error; // Propage l'erreur pour qu'elle soit gérée par le code appelant
    }
}

// --- Photo Upload ---
export const uploadPhoto = async (photo: File): Promise<{ photoUrl: string }> => {
    const formData = new FormData();
    formData.append('photo', photo);

    try {
        // Note: we hit the /api/upload endpoint
        const response = await fetch(`${BASE_URL}/upload`, {
            method: 'POST',
            body: formData,
            // Ne pas définir l'en-tête 'Content-Type', le navigateur le fera correctement pour FormData
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: response.statusText }));
            throw new Error(errorData.message || `Échec du téléchargement: ${response.status}`);
        }

        return response.json();
    } catch (error) {
        console.error(`Erreur API lors du téléchargement de la photo:`, error);
        throw error;
    }
};

// --- Auth ---
export const parentLogin = (credentials: {email: string, password: string}): Promise<User> => {
    return apiRequest<User>('/parent-login', {
        method: 'POST',
        body: JSON.stringify(credentials),
    });
};

// --- Users (Parents) ---
export const getUsers = (): Promise<User[]> => apiRequest<User[]>('/users');
export const addUser = (data: Omit<User, 'id' | 'role'>): Promise<User & { generatedPassword?: string }> => {
    return apiRequest<User & { generatedPassword?: string }>('/users', {
        method: 'POST',
        body: JSON.stringify({ ...data, role: 'parent' }), // Ensure role is set
    });
};
export const updateUser = (data: User): Promise<User> => {
    return apiRequest<User>(`/users/${data.id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
    });
};
export const deleteUser = (id: number): Promise<void> => {
    return apiRequest<void>(`/users/${id}`, { method: 'DELETE' });
};
export const resetParentPassword = (id: number): Promise<{ newPassword: string }> => {
    return apiRequest<{ newPassword: string }>(`/users/${id}/reset-password`, {
        method: 'POST',
    });
};
export const sendPasswordByEmail = (id: number, password: string): Promise<{ success: boolean }> => {
    return apiRequest<{ success: boolean }>(`/users/${id}/send-password`, {
        method: 'POST',
        body: JSON.stringify({ password }),
    });
};

// --- Students ---
export const getStudents = (): Promise<Student[]> => apiRequest<Student[]>('/students');
export const addStudent = (data: Omit<Student, 'id'>): Promise<Student> => {
    return apiRequest<Student>('/students', {
        method: 'POST',
        body: JSON.stringify(data),
    });
};
export const updateStudent = (data: Student): Promise<Student> => {
    return apiRequest<Student>(`/students/${data.id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
    });
};

// --- Teachers ---
export const getTeachers = (): Promise<Teacher[]> => apiRequest<Teacher[]>('/teachers');
export const addTeacher = (data: Omit<Teacher, 'id'>): Promise<Teacher> => {
    return apiRequest<Teacher>('/teachers', {
        method: 'POST',
        body: JSON.stringify(data),
    });
};
export const updateTeacher = (data: Teacher): Promise<Teacher> => {
    return apiRequest<Teacher>(`/teachers/${data.id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
    });
};
export const deleteTeacher = (id: number): Promise<void> => {
    return apiRequest<void>(`/teachers/${id}`, { method: 'DELETE' });
};

// --- Grades ---
export const getGrades = (): Promise<Grade[]> => apiRequest<Grade[]>('/grades');
export const addGrade = (data: Omit<Grade, 'id'>): Promise<Grade> => {
    return apiRequest<Grade>('/grades', {
        method: 'POST',
        body: JSON.stringify(data),
    });
};
export const updateGrade = (data: Grade): Promise<Grade> => {
    return apiRequest<Grade>(`/grades/${data.id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
    });
};
export const deleteGrade = (id: number): Promise<void> => {
    return apiRequest<void>(`/grades/${id}`, { method: 'DELETE' });
};

// --- Attendance ---
export const getAttendance = (): Promise<Attendance[]> => apiRequest<Attendance[]>('/attendance');
export const addAttendance = (data: Omit<Attendance, 'id'>): Promise<Attendance> => {
    return apiRequest<Attendance>('/attendance', {
        method: 'POST',
        body: JSON.stringify(data),
    });
};
export const updateAttendance = (data: Attendance): Promise<Attendance> => {
    return apiRequest<Attendance>(`/attendance/${data.id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
    });
};
export const deleteAttendance = (id: number): Promise<void> => {
    return apiRequest<void>(`/attendance/${id}`, { method: 'DELETE' });
};

// --- Observations ---
export const getObservations = (): Promise<Observation[]> => apiRequest<Observation[]>('/observations');
export const addObservation = (data: Omit<Observation, 'id'>): Promise<Observation> => {
    return apiRequest<Observation>('/observations', {
        method: 'POST',
        body: JSON.stringify(data),
    });
};
export const updateObservation = (data: Observation): Promise<Observation> => {
    return apiRequest<Observation>(`/observations/${data.id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
    });
};
export const deleteObservation = (id: number): Promise<void> => {
    return apiRequest<void>(`/observations/${id}`, { method: 'DELETE' });
};

// --- Timetable ---
export const getTimetable = (): Promise<TimeTableEntry[]> => apiRequest<TimeTableEntry[]>('/timetable');
export const updateTimetable = (data: TimeTableEntry[], classe: string): Promise<TimeTableEntry[]> => {
    return apiRequest<TimeTableEntry[]>(`/timetable?classe=${encodeURIComponent(classe)}`, {
        method: 'POST',
        body: JSON.stringify(data),
    });
};

// --- Messages ---
export const getMessages = (): Promise<Message[]> => apiRequest<Message[]>('/messages');
export const addMessage = (data: Omit<Message, 'id'>): Promise<Message> => {
    // We limit the size of the request body to avoid issues with very large files.
    // The backend should also have a limit. 5MB is a reasonable default.
    const bodySize = JSON.stringify(data).length;
    if (bodySize > 5 * 1024 * 1024) {
        return Promise.reject(new Error("La taille du fichier est trop grande. (Max 5MB)"));
    }
    
    return apiRequest<Message>('/messages', {
        method: 'POST',
        body: JSON.stringify(data),
    });
};

// --- Events ---
export const getEvents = (): Promise<Event[]> => apiRequest<Event[]>('/events');
export const addEvent = (data: Omit<Event, 'id'>): Promise<Event> => {
    return apiRequest<Event>('/events', {
        method: 'POST',
        body: JSON.stringify(data),
    });
};
export const updateEvent = (data: Event): Promise<Event> => {
    return apiRequest<Event>(`/events/${data.id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
    });
};
export const deleteEvent = (id: number): Promise<void> => {
    return apiRequest<void>(`/events/${id}`, { method: 'DELETE' });
};

// --- Documents ---
export const getDocuments = (): Promise<Document[]> => apiRequest<Document[]>('/documents');
export const addDocument = (data: Omit<Document, 'id'>): Promise<Document> => {
    return apiRequest<Document>('/documents', {
        method: 'POST',
        body: JSON.stringify(data),
    });
};
export const updateDocument = (data: Document): Promise<Document> => {
    return apiRequest<Document>(`/documents/${data.id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
    });
};
export const deleteDocument = (id: number): Promise<void> => {
    return apiRequest<void>(`/documents/${id}`, { method: 'DELETE' });
};

// --- Menus ---
export const getMenus = (): Promise<DailyMenu[]> => apiRequest<DailyMenu[]>('/menus');
export const addMenu = (data: Omit<DailyMenu, 'id'>): Promise<DailyMenu> => {
    return apiRequest<DailyMenu>('/menus', {
        method: 'POST',
        body: JSON.stringify(data),
    });
};
export const updateMenu = (data: DailyMenu): Promise<DailyMenu> => {
    return apiRequest<DailyMenu>(`/menus/${data.id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
    });
};
export const deleteMenu = (id: number): Promise<void> => {
    return apiRequest<void>(`/menus/${id}`, { method: 'DELETE' });
};

// --- Notifications ---
export const getNotifications = (): Promise<Notification[]> => apiRequest<Notification[]>('/notifications');
export const markNotificationAsRead = (id: number): Promise<{ success: boolean }> => {
    return apiRequest<{ success: boolean }>(`/notifications/${id}/read`, {
        method: 'POST',
    });
};
export const markAllNotificationsAsRead = (userId: number): Promise<{ success: boolean }> => {
    return apiRequest<{ success: boolean }>(`/notifications/user/${userId}/read-all`, {
        method: 'POST',
    });
};