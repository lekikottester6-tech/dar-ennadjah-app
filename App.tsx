import React, { useState, useCallback, useEffect } from 'react';
import LoginScreen from './screens/LoginScreen';
import ParentDashboard from './screens/parent/ParentDashboard';
import AdminDashboard from './screens/admin/AdminDashboard';
import { UserRole, Grade, Attendance, TimeTableEntry, DailyMenu, Observation, Notification, AttendanceStatus, User } from './types';
import * as api from './api';
import NotificationToast from './components/common/NotificationToast';

// Clé pour stocker les informations de l'utilisateur dans le localStorage
const USER_STORAGE_KEY = 'dar-ennadjah-user';

const App: React.FC = () => {
  // Essaye de récupérer l'utilisateur depuis le localStorage au chargement initial
  const getInitialUser = (): User | null => {
    try {
      const savedUser = localStorage.getItem(USER_STORAGE_KEY);
      return savedUser ? JSON.parse(savedUser) : null;
    } catch (error) {
      console.error("Failed to parse user from localStorage", error);
      return null;
    }
  };

  const [currentUser, setCurrentUser] = useState<User | null>(getInitialUser());

  const [grades, setGrades] = useState<Grade[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [timetable, setTimetable] = useState<TimeTableEntry[]>([]);
  const [menus, setMenus] = useState<DailyMenu[]>([]);
  const [observations, setObservations] = useState<Observation[]>([]);
  const [allNotifications, setAllNotifications] = useState<Notification[]>([]);
  const [toasts, setToasts] = useState<Omit<Notification, 'userId' | 'read' | 'timestamp' | 'link'>[]>([]);
  const [loading, setLoading] = useState(true);

  const removeToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(n => n.id !== id));
  }, []);

  const addToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info', duration: number = 7000) => {
    const newToast = {
      id: Date.now() + Math.random(), // Make ID unique to prevent key conflicts
      message,
      type,
    };
    setToasts(prev => [...prev, newToast]);
    setTimeout(() => {
      removeToast(newToast.id);
    }, duration);
  }, [removeToast]);


  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch data sequentially to be more resilient to server cold starts
      const gradesData = await api.getGrades();
      const attendanceData = await api.getAttendance();
      const timetableData = await api.getTimetable();
      const menusData = await api.getMenus();
      const observationsData = await api.getObservations();
      const notificationsData = await api.getNotifications();

      setGrades(gradesData);
      setAttendance(attendanceData);
      setTimetable(timetableData);
      setMenus(menusData);
      setObservations(observationsData);
      setAllNotifications(notificationsData);
    } catch (error) {
      console.error("Failed to fetch data", error);
      addToast("Erreur de chargement des données principales. Veuillez réessayer.", "error");
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    if (currentUser) {
      fetchData();
    }
  }, [currentUser, fetchData]);

  const handleLogin = useCallback((user: User) => {
    // Sauvegarde l'utilisateur dans le localStorage
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
    setCurrentUser(user);
  }, []);

  const handleLogout = useCallback(() => {
    // Supprime l'utilisateur du localStorage
    localStorage.removeItem(USER_STORAGE_KEY);
    setCurrentUser(null);
  }, []);

  const refreshData = async () => {
      const [grades, attendance, notifications, observations] = await Promise.all([
          api.getGrades(),
          api.getAttendance(),
          api.getNotifications(),
          api.getObservations()
      ]);
      setGrades(grades);
      setAttendance(attendance);
      setAllNotifications(notifications);
      setObservations(observations);
  };

  // Handlers to modify the shared state via API
  const handleAddGrade = async (newGradeData: Omit<Grade, 'id'>) => {
    await api.addGrade(newGradeData);
    const student = (await api.getStudents()).find(s => s.id === newGradeData.studentId);
    addToast(`Note pour ${student?.prenom} ajoutée avec succès.`, 'success');
    await refreshData();
  };

  const handleUpdateGrade = async (updatedGrade: Grade) => {
    await api.updateGrade(updatedGrade);
    addToast('Note mise à jour.', 'success');
    await refreshData();
  };

  const handleDeleteGrade = async (gradeId: number) => {
    await api.deleteGrade(gradeId);
    addToast('Note supprimée.', 'success');
    await refreshData();
  };

  const handleAddAttendance = async (newAttendanceData: Omit<Attendance, 'id'>) => {
    await api.addAttendance(newAttendanceData);
    const student = (await api.getStudents()).find(s => s.id === newAttendanceData.studentId);
    addToast(`Suivi pour ${student?.prenom} ajouté.`, 'success');
    
     if (newAttendanceData.statut === AttendanceStatus.ABSENT_UNJUSTIFIED || newAttendanceData.statut === AttendanceStatus.ABSENT_JUSTIFIED) {
        const studentAbsencesCount = (await api.getAttendance()).filter(
            a => a.studentId === newAttendanceData.studentId && 
            (a.statut === AttendanceStatus.ABSENT_JUSTIFIED || a.statut === AttendanceStatus.ABSENT_UNJUSTIFIED)
        ).length;

        if (studentAbsencesCount === 3) {
            addToast(
                `Attention : L'élève ${student?.prenom} ${student?.nom} a atteint 3 absences.`,
                'error'
            );
        }
    }
    await refreshData();
  };

  const handleUpdateAttendance = async (updatedAttendance: Attendance) => {
    await api.updateAttendance(updatedAttendance);
    addToast('Suivi mis à jour.', 'success');
    await refreshData();
  };

  const handleDeleteAttendance = async (attendanceId: number) => {
    await api.deleteAttendance(attendanceId);
    addToast('Suivi supprimé.', 'success');
    await refreshData();
  };

  const handleUpdateTimetable = async (updatedTimetableForClass: TimeTableEntry[], classe: string) => {
    try {
        await api.updateTimetable(updatedTimetableForClass, classe);
        // To ensure data consistency and avoid issues with API response formats,
        // we will always refetch the entire timetable after a successful update.
        // This is more robust than relying on the POST response body.
        const allTimetableData = await api.getTimetable();
        setTimetable(allTimetableData);
        addToast("L'emploi du temps a été mis à jour avec succès.", 'success');
    } catch (error) {
        console.error("Failed to update timetable:", error);
        addToast("Erreur lors de la mise à jour de l'emploi du temps.", 'error');
    }
  };
  
  const handleAddObservation = async (newObservationData: Omit<Observation, 'id'>) => {
    await api.addObservation(newObservationData);
    const student = (await api.getStudents()).find(s => s.id === newObservationData.studentId);
    addToast(`Observation pour ${student?.prenom} ajoutée.`, 'success');
    await refreshData();
  };

  const handleUpdateObservation = async (updatedObservation: Observation) => {
    await api.updateObservation(updatedObservation);
    addToast('Observation mise à jour.', 'success');
    await refreshData();
  };

  const handleDeleteObservation = async (observationId: number) => {
    await api.deleteObservation(observationId);
    addToast('Observation supprimée.', 'success');
    await refreshData();
  };
  
  const handleMarkNotificationAsRead = async (notificationId: number) => {
    await api.markNotificationAsRead(notificationId);
    setAllNotifications(prev => prev.map(n => n.id === notificationId ? {...n, read: true} : n));
  };
  
  const handleMarkAllNotificationsAsRead = async (userId: number) => {
      await api.markAllNotificationsAsRead(userId);
      setAllNotifications(prev => prev.map(n => n.userId === userId ? {...n, read: true} : n));
  };


  const renderContent = () => {
    if (loading && currentUser) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <p className="text-xl text-slate-600">Chargement des données...</p>
        </div>
      );
    }
    
    if (!currentUser) {
      return <LoginScreen onLogin={handleLogin} />;
    }

    switch (currentUser.role) {
      case UserRole.PARENT:
        return <ParentDashboard
                  currentUser={currentUser}
                  onLogout={handleLogout} 
                  grades={grades} 
                  attendance={attendance} 
                  timetable={timetable}
                  menus={menus}
                  observations={observations}
                  notifications={allNotifications.filter(n => n.userId === currentUser.id)}
                  onMarkAsRead={handleMarkNotificationAsRead}
                  onMarkAllAsRead={() => handleMarkAllNotificationsAsRead(currentUser.id)}
                  addToast={addToast}
                />;
      case UserRole.ADMIN:
        return <AdminDashboard
                  onLogout={handleLogout}
                  grades={grades}
                  attendance={attendance}
                  onAddGrade={handleAddGrade}
                  onUpdateGrade={handleUpdateGrade}
                  onDeleteGrade={handleDeleteGrade}
                  onAddAttendance={handleAddAttendance}
                  onUpdateAttendance={handleUpdateAttendance}
                  onDeleteAttendance={handleDeleteAttendance}
                  timetable={timetable}
                  onUpdateTimetable={handleUpdateTimetable}
                  observations={observations}
                  onAddObservation={handleAddObservation}
                  onUpdateObservation={handleUpdateObservation}
                  onDeleteObservation={handleDeleteObservation}
                  notifications={allNotifications}
                  onMarkAsRead={handleMarkNotificationAsRead}
                  onMarkAllAsRead={() => handleMarkAllNotificationsAsRead(currentUser.id)}
                  addToast={addToast}
                />;
      default:
        return <p>Rôle utilisateur non reconnu.</p>;
    }
  };

  return (
    <>
      <div className="fixed bottom-4 right-4 z-[100] space-y-2">
        {toasts.map(toast => (
          <NotificationToast
            key={toast.id}
            notification={toast}
            onDismiss={() => removeToast(toast.id)}
          />
        ))}
      </div>
      {renderContent()}
    </>
  );
};

export default App;
