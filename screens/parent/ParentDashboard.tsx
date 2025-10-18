import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { FACEBOOK_URL, INSTAGRAM_URL, SCHOOL_PHONE_PRIMARY, SCHOOL_PHONE_SECONDARY } from '../../constants';
import * as api from '../../api';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import HomeIcon from '../../components/icons/HomeIcon';
import UserIcon from '../../components/icons/UserIcon';
import BookOpenIcon from '../../components/icons/BookOpenIcon';
import CalendarIcon from '../../components/icons/CalendarIcon';
import MessageIcon from '../../components/icons/MessageIcon';
import DocumentIcon from '../../components/icons/DocumentIcon';
import LogoutIcon from '../../components/icons/LogoutIcon';
import { Message, Document, Grade, Attendance, TimeTableEntry, Student, Event, Teacher, DailyMenu, Observation, Notification, User } from '../../types';
import InformationCircleIcon from '../../components/icons/InformationCircleIcon';
import DataFlowExplanation from '../common/DataFlowExplanation';
import PhoneIcon from '../../components/icons/PhoneIcon';
import WhatsAppIcon from '../../components/icons/WhatsAppIcon';
import FacebookIcon from '../../components/icons/FacebookIcon';
import InstagramIcon from '../../components/icons/InstagramIcon';
import MenuBoardIcon from '../../components/icons/MenuBoardIcon';
import ChevronLeftIcon from '../../components/icons/ChevronLeftIcon';
import ChevronRightIcon from '../../components/icons/ChevronRightIcon';
import ChatAltIcon from '../../components/icons/ChatAltIcon';
import NotificationPanel from '../../components/common/NotificationPanel';
import BottomNav from '../../components/layout/BottomNav';
import ParentMobileHeader from './ParentMobileHeader';
import DotsHorizontalIcon from '../../components/icons/DotsHorizontalIcon';
import UserGroupIcon from '../../components/icons/UserGroupIcon';
import ClipboardListIcon from '../../components/icons/ClipboardListIcon';
import BarChart from '../../components/common/BarChart';
import EmptyState from '../../components/common/EmptyState';
import ArchiveIcon from '../../components/icons/ArchiveIcon';
import PaperClipIcon from '../../components/icons/PaperClipIcon';
import XCircleIcon from '../../components/icons/XCircleIcon';
import CheckCircleIcon from '../../components/icons/CheckCircleIcon';
import ImageWithPreview from '../../components/common/ImageWithPreview';
import CalendarMinusIcon from '../../components/icons/CalendarMinusIcon';

interface ParentDashboardProps {
  currentUser: User;
  onLogout: () => void;
  grades: Grade[];
  attendance: Attendance[];
  timetable: TimeTableEntry[];
  menus: DailyMenu[];
  observations: Observation[];
  notifications: Notification[];
  onMarkAsRead: (id: number) => void;
  onMarkAllAsRead: () => void;
  addToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

type ParentView = 'dashboard' | 'suivi' | 'messages' | 'cantine' | 'plus' | 'documents' | 'contact' | 'enseignants' | 'evenements' | 'dataflow';
type SuiviTab = 'notes' | 'absences' | 'observations' | 'emploi-du-temps';

const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });
};

const isImageFile = (fileName: string) => {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
    return imageExtensions.some(ext => fileName.toLowerCase().endsWith(ext));
};

const getLocalDateString = (date: Date): string => {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const PageTitle: React.FC<{children: React.ReactNode}> = ({children}) => (
    <div className="mb-6">
        <h2 className="text-2xl font-bold text-royal-blue">{children}</h2>
        <div className="mt-2 w-12 h-1 bg-accent-yellow rounded-full"></div>
    </div>
);

const TabButton: React.FC<{active: boolean, onClick: () => void, children: React.ReactNode}> = ({ active, onClick, children }) => (
    <button
        onClick={onClick}
        className={`w-full rounded-md py-2 text-sm font-semibold transition-colors duration-200 focus:outline-none ${
            active ? 'bg-royal-blue text-white shadow' : 'bg-transparent text-slate-600 hover:bg-white/50'
        }`}
    >
        {children}
    </button>
);

const PlusGridItem: React.FC<{label: string, icon: React.ReactNode, onClick: () => void}> = ({label, icon, onClick}) => (
  <button 
      onClick={onClick} 
      className="flex flex-col items-center justify-center text-center w-full h-32 p-2 bg-white rounded-xl shadow-lg border border-slate-100 hover:bg-slate-50 hover:-translate-y-1 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-royal-blue"
  >
      <div className="flex items-center justify-center h-12 w-12 bg-royal-blue/10 rounded-full mb-2">
          <span className="w-6 h-6 text-royal-blue">
              {icon}
          </span>
      </div>
      <span className="font-semibold text-slate-700 text-sm">{label}</span>
  </button>
);

const SummaryItem: React.FC<{
    icon: React.ReactNode;
    label: string;
    value: React.ReactNode;
    detail?: string;
    onClick: () => void;
    colorClass?: string;
}> = ({ icon, label, value, detail, onClick, colorClass = 'bg-royal-blue/10 text-royal-blue' }) => (
    <button onClick={onClick} className="flex items-center w-full p-3 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 border border-slate-100">
        <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${colorClass}`}>
            {icon}
        </div>
        <div className="ml-4 text-left flex-grow overflow-hidden">
            <p className="text-sm font-semibold text-slate-500">{label}</p>
            <p className="text-base font-bold text-slate-800 truncate">{value}</p>
        </div>
        <ChevronRightIcon className="w-5 h-5 text-slate-400 flex-shrink-0 ml-2" />
    </button>
);

const ParentDashboard: React.FC<ParentDashboardProps> = ({ currentUser, onLogout, grades, attendance, timetable, menus, observations, notifications, onMarkAsRead, onMarkAllAsRead, addToast }) => {
  const [activeView, setActiveView] = useState<ParentView>('dashboard');
  const [activeSuiviTab, setActiveSuiviTab] = useState<SuiviTab>('notes');
  const [filterPeriod, setFilterPeriod] = useState('all'); // 'all', 't1', 't2', 't3', 'last_month'

  const [registeredEvents, setRegisteredEvents] = useState<number[]>([]);
  
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [adminUser, setAdminUser] = useState<User | null>(null);
  
  const [newMessage, setNewMessage] = useState('');
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [currentDate, setCurrentDate] = useState(new Date());
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  
  const selectedStudent = useMemo(() => {
    return students.find(s => s.id === selectedStudentId) || null;
  }, [students, selectedStudentId]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
        const [studentsData, eventsData, teachersData, messagesData, documentsData, adminData] = await Promise.all([
            api.getStudents(),
            api.getEvents(),
            api.getTeachers(),
            api.getMessages(),
            api.getDocuments(),
            api.getAdminUser(),
        ]);
        
        const parentStudents = studentsData.filter(s => s.parentId === currentUser.id && !s.isArchived);
        setStudents(parentStudents);
        
        if (parentStudents.length > 0) {
            setSelectedStudentId(parentStudents[0].id);
        }

        setEvents(eventsData);
        setTeachers(teachersData);
        setMessages(messagesData);
        setDocuments(documentsData);
        setAdminUser(adminData);
    } catch (error) {
        console.error("Failed to fetch parent data:", error);
        addToast("Impossible de charger les données de l'élève. Veuillez réessayer.", 'error');
    } finally {
        setLoading(false);
    }
  }, [currentUser.id, addToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);
  
  // Données brutes par élève, pour le tableau de bord
  const studentGrades = useMemo(() => {
    if (!selectedStudent) return [];
    return grades.filter(g => g.studentId === selectedStudent.id)
        .sort((a, b) => (a.date && b.date) ? (new Date(b.date).getTime() - new Date(a.date).getTime()) : (b.id - a.id));
  }, [grades, selectedStudent]);

  const studentAttendance = useMemo(() => {
      if (!selectedStudent) return [];
      return attendance.filter(a => a.studentId === selectedStudent.id)
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [attendance, selectedStudent]);

  const studentObservations = useMemo(() => {
      if (!selectedStudent) return [];
      return observations.filter(o => o.studentId === selectedStudent.id)
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [observations, selectedStudent]);

  // Données filtrées pour la section "Suivi"
  const dateBasedFilter = useCallback(<T extends { date: string }>(data: T[]): T[] => {
    const now = new Date();
    if (filterPeriod === 'last_month') {
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(now.getMonth() - 1);
        return data.filter(item => new Date(item.date) >= oneMonthAgo);
    } else if (filterPeriod.startsWith('t')) {
        const currentMonth = now.getMonth();
        let schoolYearStart = now.getFullYear();
        if (currentMonth < 8) { 
            schoolYearStart -= 1;
        }
        let startDate, endDate;
        if (filterPeriod === 't1') {
            startDate = new Date(schoolYearStart, 8, 1);
            endDate = new Date(schoolYearStart, 11, 31);
        } else if (filterPeriod === 't2') {
            startDate = new Date(schoolYearStart + 1, 0, 1);
            endDate = new Date(schoolYearStart + 1, 2, 31);
        } else if (filterPeriod === 't3') {
            startDate = new Date(schoolYearStart + 1, 3, 1);
            endDate = new Date(schoolYearStart + 1, 7, 31);
        }
        if (startDate && endDate) {
            return data.filter(item => {
                const itemDate = new Date(item.date);
                return itemDate >= startDate && itemDate <= endDate;
            });
        }
    }
    return data;
  }, [filterPeriod]);

  const suiviFilteredGrades = useMemo(() => {
    if (!selectedStudent) return [];
    let gradesToFilter = studentGrades;

    if (filterPeriod.startsWith('t')) {
        const trimesterMap: { [key: string]: string } = { t1: 'Trimestre 1', t2: 'Trimestre 2', t3: 'Trimestre 3' };
        const targetTrimester = trimesterMap[filterPeriod];
        if (targetTrimester) {
            gradesToFilter = gradesToFilter.filter(g => g.periode === targetTrimester);
        }
    } else if (filterPeriod === 'last_month') {
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
        gradesToFilter = gradesToFilter.filter(g => new Date(g.date) >= oneMonthAgo);
    }
    return gradesToFilter;
  }, [studentGrades, selectedStudent, filterPeriod]);

  const suiviFilteredAttendance = useMemo(() => {
    if (!selectedStudent) return [];
    return dateBasedFilter(studentAttendance);
  }, [studentAttendance, selectedStudent, dateBasedFilter]);

  const suiviFilteredObservations = useMemo(() => {
      if (!selectedStudent) return [];
      return dateBasedFilter(studentObservations);
  }, [studentObservations, selectedStudent, dateBasedFilter]);

  const subjectAverages = useMemo(() => {
    if (!selectedStudent) return [];
    const gradesToAverage = suiviFilteredGrades;
    const gradesBySubject = gradesToAverage.reduce((acc: { [key: string]: { totalPoints: number; totalCoefficients: number } }, grade) => {
        const { matiere } = grade;
        if (!acc[matiere]) acc[matiere] = { totalPoints: 0, totalCoefficients: 0 };
        acc[matiere].totalPoints += grade.note * grade.coefficient;
        acc[matiere].totalCoefficients += grade.coefficient;
        return acc;
    }, {});

    return Object.keys(gradesBySubject).map((subject) => ({
        label: subject,
        value: gradesBySubject[subject].totalCoefficients > 0 ? (gradesBySubject[subject].totalPoints / gradesBySubject[subject].totalCoefficients) : 0,
    }));
  }, [suiviFilteredGrades, selectedStudent]);


  useEffect(() => {
    if (activeView === 'messages') chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeView]);

  const handleToggleRegistration = (eventId: number) => {
    setRegisteredEvents(prev => prev.includes(eventId) ? prev.filter(id => id !== eventId) : [...prev, eventId]);
  };

  const handleSendMessage = async () => {
    if ((newMessage.trim() === '' && !attachedFile) || !selectedStudent || !adminUser) {
        addToast("Impossible d'envoyer un message sans destinataire valide.", "error");
        return;
    }

    if (!currentUser || typeof currentUser.id !== 'number') {
        addToast("Erreur d'authentification. Veuillez vous reconnecter.", 'error');
        console.error("Tentative d'envoi de message sans ID utilisateur valide:", currentUser);
        return;
    }

    let attachmentData: { attachmentName?: string | null; attachmentUrl?: string | null } = {
        attachmentName: null,
        attachmentUrl: null,
    };
    if (attachedFile) {
        try {
            const base64Url = await fileToBase64(attachedFile);
            attachmentData = {
                attachmentName: attachedFile.name,
                attachmentUrl: base64Url,
            };
        } catch (error) {
            console.error("Error converting file to Base64:", error);
            addToast("Erreur lors de la préparation de la pièce jointe.", "error");
            return;
        }
    }

    try {
        await api.addMessage({
            senderId: currentUser.id,
            receiverId: adminUser.id,
            contenu: newMessage,
            date: new Date().toISOString(),
            attachmentName: attachmentData.attachmentName,
            attachmentUrl: attachmentData.attachmentUrl,
        });

        setNewMessage('');
        setAttachedFile(null);
        if(fileInputRef.current) fileInputRef.current.value = '';
        setMessages(await api.getMessages());
    } catch (error: any) {
        console.error("Failed to send message:", error);
        addToast(error.message || "Erreur lors de l'envoi du message.", 'error');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
        setAttachedFile(e.target.files[0]);
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) onMarkAsRead(notification.id);
    if (notification.link) {
      if (notification.link === 'observations') {
        setActiveView('suivi');
        setActiveSuiviTab('observations');
      } else {
        setActiveView(notification.link as ParentView);
      }
    }
    setIsNotificationsOpen(false);
  };

  const renderContent = () => {
    if (loading) return <div className="text-center p-10 text-slate-500">Chargement...</div>;
    if (students.length === 0) return <Card title="Aucun élève trouvé"><p className="text-center py-10 text-slate-500">Aucun élève n'est associé à ce compte. Contactez l'administration.</p></Card>;
    if (!selectedStudent) return <div className="text-center p-10 text-slate-500">Veuillez sélectionner un élève.</div>;

    const studentTimetable = timetable.filter(t => t.classe === selectedStudent.classe);
    const latestObservation = studentObservations[0];

    switch (activeView) {
      case 'dashboard':
        const todayString = getLocalDateString(new Date());
        const menuForToday = menus.find(m => m.date && m.date.startsWith(todayString));
        const latestGradeToday = studentGrades.find(g => g.date && g.date.startsWith(todayString));
        const attendanceForToday = studentAttendance.find(a => a.date && a.date.startsWith(todayString));

        return (
          <div className="flex flex-col gap-6">
            <div className="p-6 bg-header-gradient rounded-2xl text-white shadow-lg -mx-4 -mt-4">
                <h2 className="text-3xl font-bold">Bonjour, {currentUser.nom.split(' ')[0]} !</h2>
                <p className="text-white/80 mt-1">{new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>

            <Card title={`Aujourd'hui pour ${selectedStudent.prenom}`}>
              <div className="space-y-3">
                  <SummaryItem 
                      icon={<MenuBoardIcon className="w-6 h-6" />}
                      label="Menu du jour"
                      value={menuForToday ? menuForToday.mainCourse : "Non disponible"}
                      onClick={() => setActiveView('cantine')}
                  />
                  {latestGradeToday ? (
                      <SummaryItem 
                          icon={<BookOpenIcon className="w-6 h-6" />}
                          label="Nouvelle note"
                          value={`${latestGradeToday.note}/20 en ${latestGradeToday.matiere}`}
                          onClick={() => { setActiveView('suivi'); setActiveSuiviTab('notes'); }}
                      />
                  ) : (
                       <SummaryItem 
                          icon={<BookOpenIcon className="w-6 h-6" />}
                          label="Dernière note"
                          value="Aucune nouvelle note"
                          onClick={() => { setActiveView('suivi'); setActiveSuiviTab('notes'); }}
                      />
                  )}
                  {attendanceForToday ? (
                      <SummaryItem 
                          icon={<CalendarMinusIcon className="w-6 h-6" />}
                          label="Suivi présence"
                          value={attendanceForToday.statut}
                          colorClass={attendanceForToday.statut.includes("Absent") ? "bg-red-100 text-red-600" : "bg-yellow-100 text-yellow-700"}
                          onClick={() => { setActiveView('suivi'); setActiveSuiviTab('absences'); }}
                      />
                  ) : (
                      <SummaryItem 
                          icon={<CheckCircleIcon className="w-6 h-6" />}
                          label="Suivi présence"
                          value="Présent(e)"
                          colorClass="bg-green-100 text-green-600"
                          onClick={() => { setActiveView('suivi'); setActiveSuiviTab('absences'); }}
                      />
                  )}
              </div>
            </Card>

            <Card title="Dernière Observation" className="bg-yellow-50 border-l-4 border-accent-yellow cursor-pointer" onClick={() => { setActiveView('suivi'); setActiveSuiviTab('observations'); }}>
              {latestObservation ? (
                <div>
                  <p className="text-sm text-slate-500 mb-1">{new Date(latestObservation.date).toLocaleDateString('fr-FR')} - {latestObservation.author}</p>
                  <p className="text-slate-700 truncate">{latestObservation.content}</p>
                  <p className="text-slate-500 text-xs pt-1 border-t mt-2">Voir tout l'historique</p>
                </div>
              ) : <p className="text-center text-slate-500 py-4">Aucune observation.</p>}
            </Card>
            
            <Card title="Dernières Absences">{studentAttendance.slice(0, 2).map(a => <p key={a.id}>{new Date(a.date).toLocaleDateString('fr-FR')}: {a.statut}</p>)}</Card>
          </div>
        );
      case 'suivi':
        return (
          <div className="space-y-6">
            <PageTitle>Suivi de {selectedStudent.prenom}</PageTitle>

            <div className="my-4 p-2 bg-slate-100 rounded-lg">
                <p className="font-semibold text-slate-700 text-sm mb-2">Filtrer par période :</p>
                <div className="grid grid-cols-3 gap-2">
                    <Button size="sm" variant={filterPeriod === 'all' ? 'primary' : 'ghost'} onClick={() => setFilterPeriod('all')}>Tout</Button>
                    <Button size="sm" variant={filterPeriod === 't1' ? 'primary' : 'ghost'} onClick={() => setFilterPeriod('t1')}>T1</Button>
                    <Button size="sm" variant={filterPeriod === 't2' ? 'primary' : 'ghost'} onClick={() => setFilterPeriod('t2')}>T2</Button>
                    <Button size="sm" variant={filterPeriod === 't3' ? 'primary' : 'ghost'} onClick={() => setFilterPeriod('t3')}>T3</Button>
                    <Button size="sm" variant={filterPeriod === 'last_month' ? 'primary' : 'ghost'} onClick={() => setFilterPeriod('last_month')} className="col-span-2">Dernier Mois</Button>
                </div>
            </div>

            <div className="flex space-x-1 rounded-lg bg-slate-100 p-1 mb-4">
                <TabButton active={activeSuiviTab === 'notes'} onClick={() => setActiveSuiviTab('notes')}>Notes</TabButton>
                <TabButton active={activeSuiviTab === 'absences'} onClick={() => setActiveSuiviTab('absences')}>Absences</TabButton>
                <TabButton active={activeSuiviTab === 'observations'} onClick={() => setActiveSuiviTab('observations')}>Observations</TabButton>
                <TabButton active={activeSuiviTab === 'emploi-du-temps'} onClick={() => setActiveSuiviTab('emploi-du-temps')}>Emploi du temps</TabButton>
            </div>
        
            {activeSuiviTab === 'notes' && (
              <div className="space-y-6">
                <Card title="Moyennes par Matière">
                    {subjectAverages.length > 0 ? (
                        <BarChart data={subjectAverages} />
                    ) : (
                       <EmptyState 
                            icon={<ArchiveIcon />}
                            title="Aucune note pour l'instant"
                            message="Les moyennes de votre enfant apparaîtront ici."
                       />
                    )}
                </Card>
                <Card title="Détail des notes">
                  {suiviFilteredGrades.length > 0 ? (
                      <div className="overflow-x-auto -mx-4">
                          <table className="min-w-full text-left text-sm">
                            <thead className="text-xs text-slate-500 uppercase bg-slate-50">
                                <tr>
                                    <th className="p-3 font-semibold">Date</th>
                                    <th className="p-3 font-semibold">Matière</th>
                                    <th className="p-3 font-semibold text-center">Note</th>
                                    <th className="p-3 font-semibold text-center">Coeff.</th>
                                    <th className="p-3 font-semibold">Trimestre</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {suiviFilteredGrades.map(g => (
                                    <tr key={g.id}>
                                        <td className="p-3 text-slate-600">{g.date ? new Date(g.date).toLocaleDateString('fr-FR') : 'N/A'}</td>
                                        <td className="p-3 font-medium text-slate-800">{g.matiere}</td>
                                        <td className="p-3 text-center font-bold text-royal-blue">{g.note}/20</td>
                                        <td className="p-3 text-center text-slate-500">{g.coefficient}</td>
                                        <td className="p-3 text-slate-600">{g.periode}</td>
                                    </tr>
                                ))}
                            </tbody>
                          </table>
                      </div>
                  ) : (
                      <EmptyState 
                            icon={<ArchiveIcon />}
                            title="Aucune note pour cette période"
                            message="Les détails des notes de votre enfant apparaîtront ici."
                       />
                  )}
                </Card>
              </div>
            )}
            {activeSuiviTab === 'absences' && (
              <Card title="Historique des absences et retards">
                {suiviFilteredAttendance.length > 0 ? (
                  <ul className="space-y-2">
                    {suiviFilteredAttendance.map(a => (
                      <li key={a.id} className="p-3 rounded-lg flex justify-between items-center bg-slate-50">
                        <div><span className="font-semibold">{new Date(a.date).toLocaleDateString('fr-FR')}: </span><span className="font-bold">{a.statut}</span></div>
                        {a.justification && <p className="text-xs text-slate-500">({a.justification})</p>}
                      </li>
                    ))}
                  </ul>
                ) : (
                    <EmptyState 
                        icon={<CheckCircleIcon />}
                        title="Aucune absence pour cette période"
                        message="Votre enfant a été présent à toutes les leçons enregistrées."
                    />
                )}
              </Card>
            )}
            {activeSuiviTab === 'observations' && (
              <Card title="Historique des observations">
                {suiviFilteredObservations.length > 0 ? (
                  <ul className="space-y-4">
                    {suiviFilteredObservations.map(obs => (
                      <li key={obs.id} className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
                        <div className="flex justify-between items-center mb-2 text-sm text-slate-500">
                            <span>Par : <strong>{obs.author}</strong></span>
                            <span>Le : <strong>{new Date(obs.date).toLocaleDateString('fr-FR')}</strong></span>
                        </div>
                        <p className="text-slate-700 whitespace-pre-wrap">{obs.content}</p>
                      </li>
                    ))}
                  </ul>
                ) : (
                    <EmptyState 
                        icon={<ChatAltIcon />}
                        title="Aucune observation pour cette période"
                        message="Aucune observation n'a été enregistrée pour votre enfant."
                    />
                )}
              </Card>
            )}
            {activeSuiviTab === 'emploi-du-temps' && (
              <Card title="Emploi du temps">
                {studentTimetable.length > 0 ? (
                  <div className="overflow-x-auto -mx-4">
                    <table className="min-w-full text-left text-sm">
                        <thead className="text-xs text-slate-500 uppercase bg-slate-50">
                            <tr>
                                <th className="p-3 font-semibold">Jour</th>
                                <th className="p-3 font-semibold">Heure</th>
                                <th className="p-3 font-semibold">Matière</th>
                                <th className="p-3 font-semibold">Professeur</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {studentTimetable.map(t => (
                                <tr key={t.id}>
                                    <td className="p-3 font-medium text-slate-800">{t.day}</td>
                                    <td className="p-3 text-slate-600">{t.time}</td>
                                    <td className="p-3 text-slate-600">{t.subject}</td>
                                    <td className="p-3 text-slate-600">{t.teacher}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                  </div>
                ) : (
                    <EmptyState 
                        icon={<CalendarIcon />}
                        title="Emploi du temps non disponible"
                        message="L'emploi du temps pour la classe de votre enfant n'a pas encore été publié."
                    />
                )}
              </Card>
            )}
          </div>
        );
        case 'messages':
            const conversation = messages.filter(m => adminUser && ((m.senderId === currentUser.id && m.receiverId === adminUser.id) || (m.senderId === adminUser.id && m.receiverId === currentUser.id)))
              .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
            
            if (!adminUser) {
                return <Card title="Messagerie"><p className="text-center text-slate-500 py-4">Le service de messagerie est momentanément indisponible.</p></Card>
            }
            
            return (
                <div className="flex flex-col h-full bg-white">
                    <div className="p-3 border-b bg-slate-50 flex items-center space-x-3 flex-shrink-0">
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            className="!p-2 rounded-full" 
                            onClick={() => setActiveView('dashboard')}
                            aria-label="Retour au tableau de bord"
                        >
                            <ChevronLeftIcon className="w-6 h-6 text-gray-600" />
                        </Button>
                        <h3 className="font-semibold text-lg text-gray-800 truncate">
                            Message à l'administration
                        </h3>
                    </div>
                    <div className="flex-1 p-4 overflow-y-auto space-y-4">
                        {conversation.map(msg => (
                             <div key={msg.id} className={`flex ${msg.senderId === currentUser.id ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl ${msg.senderId === currentUser.id ? 'bg-royal-blue text-white' : 'bg-slate-200 text-slate-800'}`}>
                                    {msg.contenu && <p>{msg.contenu}</p>}
                                    {msg.attachmentUrl && msg.attachmentName && (
                                        <div className="mt-2">
                                            {isImageFile(msg.attachmentName) ? (
                                                <ImageWithPreview src={msg.attachmentUrl} alt={msg.attachmentName} className="rounded-lg max-w-full h-auto cursor-pointer" />
                                            ) : (
                                                <a href={msg.attachmentUrl} download={msg.attachmentName} className={`flex items-center gap-2 p-2 rounded-lg ${msg.senderId === currentUser.id ? 'bg-blue-800 hover:bg-blue-900' : 'bg-slate-300 hover:bg-slate-400'}`}>
                                                    <DocumentIcon className="w-5 h-5 flex-shrink-0" />
                                                    <span className="text-sm font-medium underline truncate">{msg.attachmentName}</span>
                                                </a>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                        <div ref={chatEndRef} />
                    </div>
                    <div className="p-4 bg-white border-t flex-shrink-0">
                         {attachedFile && (
                            <div className="px-2 py-2 flex items-center justify-between bg-slate-100 rounded-lg mb-2">
                                <div className="flex items-center gap-2 overflow-hidden">
                                    <PaperClipIcon className="w-5 h-5 text-slate-500 flex-shrink-0" />
                                    <span className="text-sm text-slate-700 truncate">{attachedFile.name}</span>
                                </div>
                                <button onClick={() => { setAttachedFile(null); if(fileInputRef.current) fileInputRef.current.value = ''; }} className="p-1 text-slate-500 hover:text-red-600">
                                    <XCircleIcon className="w-5 h-5" />
                                </button>
                            </div>
                        )}
                        <div className="flex space-x-2">
                            <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" />
                            <Button variant="ghost" className="!p-2 rounded-full flex-shrink-0" onClick={() => fileInputRef.current?.click()}>
                                <PaperClipIcon className="w-6 h-6 text-slate-600" />
                            </Button>
                            <input type="text" value={newMessage} onChange={e => setNewMessage(e.target.value)} onKeyPress={e => e.key === 'Enter' && handleSendMessage()} placeholder="Écrire un message..." className="flex-grow border-slate-300 rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-royal-blue" />
                            <Button onClick={handleSendMessage} className="rounded-full !px-5">Envoyer</Button>
                        </div>
                    </div>
                </div>
            );
        case 'cantine':
            const getStartOfWeek = (date: Date) => {
                const d = new Date(date);
                d.setDate(d.getDate() - d.getDay()); // Sunday
                return d;
            };
            const startOfWeek = getStartOfWeek(currentDate);
            const weekDays = Array.from({ length: 7 }).map((_, i) => {
                const day = new Date(startOfWeek);
                day.setDate(startOfWeek.getDate() + i);
                return day;
            });
            const weekFormatter = new Intl.DateTimeFormat('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' });
            return (
                <div className="space-y-6">
                    <PageTitle>Menu de la Cantine</PageTitle>
                    <Card>
                        <div className="flex justify-between items-center mb-4">
                            <Button onClick={() => setCurrentDate(new Date(currentDate.setDate(currentDate.getDate() - 7)))} variant="ghost"><ChevronLeftIcon /></Button>
                            <h3 className="text-center font-semibold text-royal-blue">Semaine du {weekFormatter.format(startOfWeek)}</h3>
                            <Button onClick={() => setCurrentDate(new Date(currentDate.setDate(currentDate.getDate() + 7)))} variant="ghost"><ChevronRightIcon /></Button>
                        </div>
                        <div className="space-y-4">
                            {weekDays.map(day => {
                                const dayString = getLocalDateString(day);
                                const menuForDay = menus.find(m => m.date && m.date.startsWith(dayString));
                                const isWeekend = day.getDay() === 5 || day.getDay() === 6; // Fri/Sat
                                return (
                                     <div key={dayString} className={`p-4 rounded-lg ${isWeekend ? 'bg-slate-50' : 'bg-white border'}`}>
                                        <h4 className={`font-bold ${isWeekend ? 'text-slate-400' : 'text-slate-800'}`}>{day.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric' })}</h4>
                                        {menuForDay ? (
                                            <div className="text-sm mt-2 space-y-2">
                                                {menuForDay.photoUrl && <ImageWithPreview src={menuForDay.photoUrl} alt="Repas" className="w-full aspect-[4/3] rounded-md mb-2" />}
                                                <p><strong>Entrée:</strong> {menuForDay.starter}</p>
                                                <p><strong>Plat:</strong> {menuForDay.mainCourse}</p>
                                                <p><strong>Dessert:</strong> {menuForDay.dessert}</p>
                                                <p><strong>Goûter:</strong> {menuForDay.snack}</p>
                                            </div>
                                        ) : (
                                            <p className="text-sm text-slate-400 italic mt-2">Aucun menu défini.</p>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </Card>
                </div>
            );
        case 'plus':
            return (
                <div className="space-y-6">
                    <PageTitle>Plus d'options</PageTitle>
                    <div className="grid grid-cols-2 gap-4">
                        <PlusGridItem label="Documents" icon={<DocumentIcon />} onClick={() => setActiveView('documents')} />
                        <PlusGridItem label="Événements" icon={<CalendarIcon />} onClick={() => setActiveView('evenements')} />
                        <PlusGridItem label="Enseignants" icon={<UserGroupIcon />} onClick={() => setActiveView('enseignants')} />
                        <PlusGridItem label="Contact" icon={<PhoneIcon />} onClick={() => setActiveView('contact')} />
                        <PlusGridItem label="Comment ça marche ?" icon={<InformationCircleIcon />} onClick={() => setActiveView('dataflow')} />
                    </div>
                    <div className="mt-8 pt-8 border-t border-slate-200">
                        <Button onClick={onLogout} variant="danger" className="w-full">
                            <LogoutIcon className="mr-2"/>Déconnexion
                        </Button>
                    </div>
                </div>
            );
       case 'documents': 
            return (
                <div className="space-y-6">
                    <PageTitle>Documents à Télécharger</PageTitle>
                    {documents.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {documents.map(doc => {
                                const isImage = doc.mimeType?.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(doc.url);
                                return (
                                    <Card key={doc.id} className="flex flex-col p-0">
                                        {isImage ? (
                                            <ImageWithPreview
                                                src={doc.url}
                                                alt={doc.title}
                                                className="w-full h-48 object-cover rounded-t-xl"
                                            />
                                        ) : (
                                            <div className="w-full h-48 bg-slate-100 flex items-center justify-center rounded-t-xl">
                                                <DocumentIcon className="w-16 h-16 text-slate-400" />
                                            </div>
                                        )}
                                        <div className="p-4 flex flex-col flex-grow">
                                            <h3 className="font-bold text-lg text-slate-800">{doc.title}</h3>
                                            <p className="text-sm text-slate-600 mt-1 flex-grow mb-4">{doc.description}</p>
                                            <a
                                                href={doc.url}
                                                download
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="mt-auto"
                                            >
                                                <Button className="w-full">
                                                    Télécharger
                                                </Button>
                                            </a>
                                        </div>
                                    </Card>
                                );
                            })}
                        </div>
                    ) : (
                        <Card>
                            <p className="text-center text-slate-500 py-10">Aucun document n'est disponible pour le moment.</p>
                        </Card>
                    )}
                </div>
            );
       case 'contact':
            const formatWhatsAppNumber = (phone: string) => phone.replace(/[\s+]/g, '');
            return (
            <div>
                <PageTitle>Contact</PageTitle>
                <Card>
                    <div className="space-y-4">
                        <div>
                            <h3 className="text-lg font-semibold text-slate-800 mb-3">Contacter sur WhatsApp</h3>
                            <div className="space-y-2">
                                <Button className="w-full justify-start text-left !py-3" onClick={() => window.open(`https://wa.me/${formatWhatsAppNumber(SCHOOL_PHONE_PRIMARY)}`, '_blank')}>
                                    <WhatsAppIcon className="mr-3 flex-shrink-0 h-7 w-7" />
                                    <div>
                                        <span className="font-bold">Préscolaire-Primaire</span>
                                        <span className="block text-xs opacity-80">{SCHOOL_PHONE_PRIMARY}</span>
                                    </div>
                                </Button>
                                <Button className="w-full justify-start text-left !py-3" onClick={() => window.open(`https://wa.me/${formatWhatsAppNumber(SCHOOL_PHONE_SECONDARY)}`, '_blank')}>
                                    <WhatsAppIcon className="mr-3 flex-shrink-0 h-7 w-7" />
                                    <div>
                                        <span className="font-bold">Collège-Lycée</span>
                                        <span className="block text-xs opacity-80">{SCHOOL_PHONE_SECONDARY}</span>
                                    </div>
                                </Button>
                            </div>
                        </div>
                        <div className="pt-4 border-t border-slate-200">
                            <h3 className="text-lg font-semibold text-slate-800 mb-3">Réseaux Sociaux</h3>
                            <div className="space-y-2">
                                <a href={FACEBOOK_URL} target="_blank" rel="noopener noreferrer" className="block">
                                    <Button variant="ghost" className="w-full">
                                        <FacebookIcon className="mr-2" /> Facebook
                                    </Button>
                                </a>
                                <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" className="block">
                                    <Button variant="ghost" className="w-full">
                                        <InstagramIcon className="mr-2" /> Instagram
                                    </Button>
                                </a>
                            </div>
                        </div>
                    </div>
                </Card>
            </div>
        );
       case 'enseignants':
            return (
                <div className="space-y-6">
                    <PageTitle>L'équipe pédagogique</PageTitle>
                    {teachers.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {teachers.map(teacher => (
                                <Card key={teacher.id} className="p-4">
                                    <div className="flex items-center space-x-4">
                                        <div className="flex-shrink-0">
                                            {teacher.photoUrl ? (
                                                <img className="h-16 w-16 rounded-full object-cover" src={teacher.photoUrl} alt={`Photo de ${teacher.prenom}`} />
                                            ) : (
                                                <div className="h-16 w-16 rounded-full bg-slate-200 flex items-center justify-center">
                                                    <UserIcon className="h-8 w-8 text-slate-400" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-grow">
                                            <h3 className="text-lg font-semibold text-slate-800">{teacher.prenom} {teacher.nom}</h3>
                                            <p className="text-sm text-royal-blue">{teacher.matiere}</p>
                                            <p className="text-xs text-slate-500 mt-1">{teacher.telephone}</p>
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <EmptyState
                            icon={<UserGroupIcon />}
                            title="Aucun enseignant"
                            message="La liste des enseignants sera bientôt disponible."
                        />
                    )}
                </div>
            );
       case 'evenements': return <div><PageTitle>Événements</PageTitle><Card>{events.map(e => <div key={e.id} className="p-2 border-b"><h3>{e.title}</h3><p>{new Date(e.event_date).toLocaleDateString('fr-FR')}</p><Button onClick={() => handleToggleRegistration(e.id)}>{registeredEvents.includes(e.id) ? 'Inscrit' : "S'inscrire"}</Button></div>)}</Card></div>;
       case 'dataflow': return <DataFlowExplanation />;
       default: return null;
    }
  };

  const navItems: { view: ParentView; label: string; icon: React.ReactNode }[] = [
    { view: 'dashboard', label: 'Accueil', icon: <HomeIcon /> },
    { view: 'suivi', label: 'Suivi', icon: <ClipboardListIcon /> },
    { view: 'messages', label: 'Messages', icon: <MessageIcon /> },
    { view: 'cantine', label: 'Cantine', icon: <MenuBoardIcon /> },
    { view: 'plus', label: 'Plus', icon: <DotsHorizontalIcon /> },
  ];

  return (
    <div className="h-screen flex flex-col bg-slate-200 text-slate-900">
      <ParentMobileHeader
        currentUser={currentUser}
        students={students}
        selectedStudent={selectedStudent}
        selectedStudentId={selectedStudentId}
        setSelectedStudentId={setSelectedStudentId}
        unreadCount={notifications.filter(n => !n.read).length}
        onBellClick={() => setIsNotificationsOpen(p => !p)}
      />
       {isNotificationsOpen && (
          <div className="fixed top-28 right-4 z-30">
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
        // FIX: The `useState` setter function has a wider type than what `BottomNav` expects.
        // Wrapping it in a new function `(view) => setActiveView(view)` resolves the type mismatch.
        <BottomNav activeView={activeView} setActiveView={(view) => setActiveView(view)} navItems={navItems} />
      )}
    </div>
  );
};

export default ParentDashboard;