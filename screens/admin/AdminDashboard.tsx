import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import HomeIcon from '../../components/icons/HomeIcon';
import UsersIcon from '../../components/icons/UsersIcon';
import CalendarIcon from '../../components/icons/CalendarIcon';
import MessageIcon from '../../components/icons/MessageIcon';
import DocumentIcon from '../../components/icons/DocumentIcon';
import LogoutIcon from '../../components/icons/LogoutIcon';
import PlusIcon from '../../components/icons/PlusIcon';
import ClockIcon from '../../components/icons/ClockIcon';
import { Grade, Attendance, TimeTableEntry, DailyMenu, Observation, Notification, Student, Teacher, Event, User, Document, UserRole, Message } from '../../types';
import SuiviManagement from './SuiviManagement';
import ClipboardListIcon from '../../components/icons/ClipboardListIcon';
import TimetableManagement from './TimetableManagement';
import InformationCircleIcon from '../../components/icons/InformationCircleIcon';
import DataFlowExplanation from '../common/DataFlowExplanation';
import MenuManagement from './MenuManagement';
import ChatAltIcon from '../../components/icons/ChatAltIcon';
import ObservationManagement from './ObservationManagement';
import StudentManagement from './StudentManagement';
import TeacherManagement from './TeacherManagement';
import ParentManagement from './ParentManagement';
import EventManagement from './EventManagement';
import CommunicationManagement from './CommunicationManagement';
import DocumentManagement from './DocumentManagement';
import SearchIcon from '../../components/icons/SearchIcon';
import NotificationPanel from '../../components/common/NotificationPanel';
import * as api from '../../api';
import BottomNav from '../../components/layout/BottomNav';
import AdminMobileHeader from './AdminMobileHeader';
import CogIcon from '../../components/icons/CogIcon';
import ChevronRightIcon from '../../components/icons/ChevronRightIcon';
import UserGroupIcon from '../../components/icons/UserGroupIcon';
import CakeIcon from '../../components/icons/CakeIcon';
import ClassView from './ClassView';
import BookOpenIcon from '../../components/icons/BookOpenIcon';
import GestionListItem from '../../components/admin/GestionListItem';

interface AdminDashboardProps {
  currentUser: User;
  onLogout: () => void;
  grades: Grade[];
  attendance: Attendance[];
  onAddGrade: (grade: Omit<Grade, 'id'>) => void;
  onUpdateGrade: (grade: Grade) => void;
  onDeleteGrade: (gradeId: number) => void;
  onAddAttendance: (attendance: Omit<Attendance, 'id'>) => void;
  onUpdateAttendance: (attendance: Attendance) => void;
  onDeleteAttendance: (attendanceId: number) => void;
  timetable: TimeTableEntry[];
  onUpdateTimetable: (timetable: TimeTableEntry[], classe: string) => void;
  observations: Observation[];
  onAddObservation: (observation: Omit<Observation, 'id'>) => void;
  onUpdateObservation: (observation: Observation) => void;
  onDeleteObservation: (observationId: number) => void;
  notifications: Notification[];
  onMarkAsRead: (id: number) => void;
  onMarkAllAsRead: () => void;
  addToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

type AdminView = 'dashboard' | 'students' | 'messages' | 'suivi' | 'gestion' | 'teachers' | 'parents' | 'events' | 'documents' | 'timetable' | 'menu' | 'observations' | 'dataflow' | 'classView';

const AdminDashboard: React.FC<AdminDashboardProps> = (props) => {
  const { currentUser, onLogout, grades, attendance, onAddGrade, onUpdateGrade, onDeleteGrade, onAddAttendance, onUpdateAttendance, onDeleteAttendance, timetable, onUpdateTimetable, observations, onAddObservation, onUpdateObservation, onDeleteObservation, notifications, onMarkAsRead, onMarkAllAsRead, addToast } = props;
  const [activeView, setActiveView] = useState<AdminView>('dashboard');
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const [students, setStudents] = useState<Student[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [parents, setParents] = useState<User[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [menus, setMenus] = useState<DailyMenu[]>([]);
  
  const [classSearch, setClassSearch] = useState('');
  const [initialSearchFilter, setInitialSearchFilter] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
        // Fetch data sequentially to avoid overwhelming a "cold start" server.
        const studentsData = await api.getStudents();
        const teachersData = await api.getTeachers();
        const usersData = await api.getUsers();
        const eventsData = await api.getEvents();
        const documentsData = await api.getDocuments();
        const messagesData = await api.getMessages();
        const menusData = await api.getMenus();

        setStudents(studentsData); 
        setTeachers(teachersData); 
        setParents(usersData.filter(u => u.role === UserRole.PARENT));
        setEvents(eventsData); 
        setDocuments(documentsData); 
        setMessages(messagesData); 
        setMenus(menusData);
    } catch (error) { 
        console.error("Failed to fetch admin data:", error);
        addToast("Impossible de charger les données administrateur. Veuillez réessayer.", "error");
    } 
    finally { setLoading(false); }
  }, [addToast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleAddStudent = async (data: Omit<Student, 'id'>) => { const newStudent = await api.addStudent(data); setStudents(prev => [...prev, newStudent]); };
  const handleUpdateStudent = async (data: Student) => { const updatedStudent = await api.updateStudent(data); setStudents(prev => prev.map(s => (s.id === data.id ? updatedStudent : s))); };
  const handleAddTeacher = async (data: Omit<Teacher, 'id'>) => { const newTeacher = await api.addTeacher(data); setTeachers(prev => [...prev, newTeacher]); };
  const handleUpdateTeacher = async (data: Teacher) => { const updatedTeacher = await api.updateTeacher(data); setTeachers(prev => prev.map(t => (t.id === data.id ? updatedTeacher : t))); };
  const handleDeleteTeacher = async (id: number) => { await api.deleteTeacher(id); setTeachers(prev => prev.filter(t => t.id !== id)); };
  const handleAddParent = async (data: Omit<User, 'id' | 'role'>) => { const newParent = await api.addUser(data); setParents(prev => [...prev, newParent]); return newParent; };
  const handleUpdateParent = async (data: User) => { const updated = await api.updateUser(data); setParents(prev => prev.map(p => (p.id === updated.id ? updated : p))); };
  const handleDeleteParent = async (id: number) => { await api.deleteUser(id); setParents(prev => prev.filter(p => p.id !== id)); };
  const handleResetParentPassword = (id: number) => api.resetParentPassword(id);
  const handleAddEvent = async (data: Omit<Event, 'id'>) => { const newEvent = await api.addEvent(data); setEvents(prev => [...prev, newEvent]); };
  const handleUpdateEvent = async (data: Event) => { const updatedEvent = await api.updateEvent(data); setEvents(prev => prev.map(e => (e.id === data.id ? updatedEvent : e))); };
  const handleDeleteEvent = async (id: number) => { await api.deleteEvent(id); setEvents(prev => prev.filter(e => e.id !== id)); };
  const handleAddDocument = async (data: Omit<Document, 'id'>) => { const newDocument = await api.addDocument(data); setDocuments(prev => [...prev, newDocument]); };
  const handleUpdateDocument = async (data: Document) => { const updatedDocument = await api.updateDocument(data); setDocuments(prev => prev.map(d => (d.id === data.id ? updatedDocument : d))); };
  const handleDeleteDocument = async (id: number) => { await api.deleteDocument(id); setDocuments(prev => prev.filter(d => d.id !== id)); };
  
  const handleAddMessage = async (data: Omit<Message, 'id'>) => {
    await api.addMessage(data);
    const updatedMessages = await api.getMessages();
    setMessages(updatedMessages);
  };

  const refreshMenus = async () => {
    try {
        const menusData = await api.getMenus();
        setMenus(menusData);
    } catch (error) {
        console.error("Failed to refresh menus:", error);
        addToast("Erreur lors du rafraîchissement des menus.", 'error');
    }
  };

  const handleAddMenu = async (data: Omit<DailyMenu, 'id'>) => {
    await api.addMenu(data);
    await refreshMenus();
  };
  const handleUpdateMenu = async (data: DailyMenu) => {
    await api.updateMenu(data);
    await refreshMenus();
  };
  const handleDeleteMenu = async (id: number) => {
    await api.deleteMenu(id);
    await refreshMenus();
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) onMarkAsRead(notification.id);
    if (notification.link) setActiveView(notification.link as AdminView);
    setIsNotificationsOpen(false);
  };

  const handleSearchByClass = () => {
    if (!classSearch.trim()) return;
    setInitialSearchFilter(classSearch);
    setActiveView('students');
  };

  const PageTitle: React.FC<{children: React.ReactNode}> = ({children}) => (
    <div className="mb-4">
        <h2 className="text-2xl font-bold text-royal-blue">{children}</h2>
        <div className="mt-2 w-12 h-1 bg-accent-yellow rounded-full"></div>
    </div>
  );

  const mainContent = () => {
    if (loading) return <div className="text-center p-10">Chargement...</div>;
    
    switch (activeView) {
      case 'dashboard':
        const activeStudentsCount = students.filter(s => !s.isArchived).length;
        const upcomingEventsCount = events.filter(e => new Date(e.event_date) >= new Date()).length;
        return (
          <div className="flex flex-col gap-4">
            <PageTitle>Tableau de bord</PageTitle>
            <Card title="Statistiques">
                 <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="bg-royal-blue/10 p-2 rounded-lg"><p className="text-3xl font-bold text-royal-blue">{activeStudentsCount}</p><p className="text-xs text-slate-500 font-semibold">Élèves</p></div>
                    <div className="bg-accent-yellow/10 p-2 rounded-lg"><p className="text-3xl font-bold text-yellow-700">{teachers.length}</p><p className="text-xs text-slate-500 font-semibold">Enseignants</p></div>
                    <div className="bg-green-500/10 p-2 rounded-lg"><p className="text-3xl font-bold text-green-600">{upcomingEventsCount}</p><p className="text-xs text-slate-500 font-semibold">Événements</p></div>
                 </div>
            </Card>
            <Card title="Recherche par Classe">
                <input type="text" placeholder="Ex: CP, CE1..." value={classSearch} onChange={(e) => setClassSearch(e.target.value)} className="w-full px-3 py-2 border rounded-lg mb-2"/>
                <Button onClick={handleSearchByClass} className="w-full" disabled={!classSearch.trim()}><SearchIcon className="w-4 h-4 mr-2" />Rechercher</Button>
            </Card>
            <Card title="Actions rapides">
                <div className="flex flex-col space-y-2">
                    <Button onClick={() => setActiveView('students')}><PlusIcon className="w-4 h-4 mr-2"/> Ajouter un élève</Button>
                    <Button onClick={() => setActiveView('teachers')} variant="secondary"><PlusIcon className="w-4 h-4 mr-2"/> Ajouter un enseignant</Button>
                    <Button onClick={() => setActiveView('parents')} variant="success"><PlusIcon className="w-4 h-4 mr-2"/> Ajouter un parent</Button>
                </div>
            </Card>
          </div>
        );
      case 'students': return <StudentManagement students={students} parents={parents} grades={grades} attendance={attendance} observations={observations} onAdd={handleAddStudent} onUpdate={handleUpdateStudent} initialSearchQuery={initialSearchFilter} addToast={addToast} />;
      case 'teachers': return <TeacherManagement teachers={teachers} students={students} onAdd={handleAddTeacher} onUpdate={handleUpdateTeacher} onDelete={handleDeleteTeacher} />;
      case 'parents': return <ParentManagement parents={parents} students={students} onAdd={handleAddParent} onUpdate={handleUpdateParent} onDelete={handleDeleteParent} onResetPassword={handleResetParentPassword} initialSearchQuery={initialSearchFilter} addToast={addToast} />;
      case 'suivi': return <SuiviManagement 
                                students={students} 
                                parents={parents} 
                                observations={observations} 
                                loadingStudents={loading} 
                                grades={grades} 
                                attendance={attendance} 
                                onAddGrade={onAddGrade}
                                onUpdateGrade={onUpdateGrade}
                                onDeleteGrade={onDeleteGrade}
                                onAddAttendance={onAddAttendance}
                                onUpdateAttendance={onUpdateAttendance}
                                onDeleteAttendance={onDeleteAttendance}
                            />;
      case 'observations': return <ObservationManagement 
                                      observations={observations} 
                                      onAddObservation={onAddObservation} 
                                      onUpdateObservation={onUpdateObservation} 
                                      onDeleteObservation={onDeleteObservation} 
                                    />;
      case 'timetable': return <TimetableManagement timetable={timetable} onUpdateTimetable={onUpdateTimetable} />;
      case 'events': return <EventManagement events={events} onAdd={handleAddEvent} onUpdate={handleUpdateEvent} onDelete={handleDeleteEvent} />;
      case 'messages': return <CommunicationManagement messages={messages} parents={parents} adminUser={currentUser} onAddMessage={handleAddMessage} onBack={() => setActiveView('dashboard')} addToast={addToast} />;
      case 'documents': return <DocumentManagement documents={documents} onAdd={handleAddDocument} onUpdate={handleUpdateDocument} onDelete={handleDeleteDocument} />;
      case 'menu': return <MenuManagement menus={menus} onAddMenu={handleAddMenu} onUpdateMenu={handleUpdateMenu} onDeleteMenu={handleDeleteMenu} addToast={addToast} />;
      case 'dataflow': return <DataFlowExplanation />;
      case 'classView': return <ClassView students={students} parents={parents} teachers={teachers} />;
      case 'gestion':
        return (
            <div>
                <PageTitle>Gestion</PageTitle>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <GestionListItem label="Recherche par Classe" icon={<BookOpenIcon/>} onClick={() => setActiveView('classView')} color="sky" />
                  <GestionListItem label="Enseignants" icon={<UserGroupIcon/>} onClick={() => setActiveView('teachers')} color="green" />
                  <GestionListItem label="Parents" icon={<UsersIcon/>} onClick={() => setActiveView('parents')} color="purple" />
                  <GestionListItem label="Emploi du temps" icon={<ClockIcon/>} onClick={() => setActiveView('timetable')} color="amber" />
                  <GestionListItem label="Observations" icon={<ChatAltIcon/>} onClick={() => setActiveView('observations')} color="rose" />
                  <GestionListItem label="Événements" icon={<CalendarIcon/>} onClick={() => setActiveView('events')} color="teal" />
                  <GestionListItem label="Documents" icon={<DocumentIcon/>} onClick={() => setActiveView('documents')} color="indigo" />
                  <GestionListItem label="Menu Cantine" icon={<CakeIcon/>} onClick={() => setActiveView('menu')} color="pink" />
                  <GestionListItem label="Comment ça marche ?" icon={<InformationCircleIcon/>} onClick={() => setActiveView('dataflow')} color="slate" />
                </div>
                <div className="mt-8 pt-8 border-t border-slate-200">
                    <Button onClick={onLogout} variant="danger" className="w-full">
                        <LogoutIcon className="mr-2"/>Déconnexion
                    </Button>
                </div>
            </div>
        );
      default: return null;
    }
  };

  const renderContent = () => (
      <div key={activeView} className="fade-in">
          {mainContent()}
      </div>
  );

  const navItems: { view: AdminView; label: string; icon: React.ReactNode }[] = [
    { view: 'dashboard', label: 'Accueil', icon: <HomeIcon /> },
    { view: 'students', label: 'Élèves', icon: <UsersIcon /> },
    { view: 'suivi', label: 'Suivi', icon: <ClipboardListIcon /> },
    { view: 'messages', label: 'Messages', icon: <MessageIcon /> },
    { view: 'gestion', label: 'Gestion', icon: <CogIcon /> },
  ];

  return (
    <div className="h-screen flex flex-col bg-slate-200 text-slate-900">
      <AdminMobileHeader
        unreadCount={notifications.filter(n => !n.read).length}
        onBellClick={() => setIsNotificationsOpen(p => !p)}
      />
       {isNotificationsOpen && (
          <div className="fixed top-16 right-4 z-30">
              <NotificationPanel 
                  notifications={notifications}
                  onNotificationClick={handleNotificationClick}
                  onMarkAllAsRead={onMarkAllAsRead}
                  onClose={() => setIsNotificationsOpen(false)}
              />
          </div>
      )}
      <main className={`flex-1 overflow-y-auto ${activeView === 'messages' ? '' : 'p-4 pb-24'}`}>
        {renderContent()}
      </main>
      {activeView !== 'messages' && (
        <BottomNav activeView={activeView} setActiveView={(v) => { setActiveView(v); setInitialSearchFilter(null); }} navItems={navItems} />
      )}
    </div>
  );
};

export default AdminDashboard;
