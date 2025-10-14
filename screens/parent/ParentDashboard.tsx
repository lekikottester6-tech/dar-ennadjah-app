import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { SCHOOL_WHATSAPP_NUMBER, FACEBOOK_URL, INSTAGRAM_URL } from '../../constants';
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
import CameraIcon from '../../components/icons/CameraIcon';
import PhotoGallery from './PhotoGallery';
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
}

type ParentView = 'dashboard' | 'suivi' | 'messages' | 'cantine' | 'plus' | 'documents' | 'photos' | 'contact' | 'enseignants' | 'evenements' | 'dataflow';
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


const ParentDashboard: React.FC<ParentDashboardProps> = ({ currentUser, onLogout, grades, attendance, timetable, menus, observations, notifications, onMarkAsRead, onMarkAllAsRead }) => {
  const [activeView, setActiveView] = useState<ParentView>('dashboard');
  const [activeSuiviTab, setActiveSuiviTab] = useState<SuiviTab>('notes');

  const [registeredEvents, setRegisteredEvents] = useState<number[]>([]);
  
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [newMessage, setNewMessage] = useState('');
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [currentDate, setCurrentDate] = useState(new Date());
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  
  const ADMIN_ID = 4;
  
  const selectedStudent = useMemo(() => {
    return students.find(s => s.id === selectedStudentId) || null;
  }, [students, selectedStudentId]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
        const [studentsData, eventsData, teachersData, messagesData, documentsData] = await Promise.all([
            api.getStudents(),
            api.getEvents(),
            api.getTeachers(),
            api.getMessages(),
            api.getDocuments(),
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
    } catch (error) {
        console.error("Failed to fetch parent data:", error);
    } finally {
        setLoading(false);
    }
  }, [currentUser.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const subjectAverages = useMemo(() => {
    if (!selectedStudent) return [];
    const studentGrades = grades.filter(g => g.studentId === selectedStudent.id);
    const gradesBySubject = studentGrades.reduce((acc: { [key: string]: { totalPoints: number; totalCoefficients: number } }, grade) => {
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
  }, [grades, selectedStudent]);


  useEffect(() => {
    if (activeView === 'messages') chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeView]);

  const handleToggleRegistration = (eventId: number) => {
    setRegisteredEvents(prev => prev.includes(eventId) ? prev.filter(id => id !== eventId) : [...prev, eventId]);
  };

  const handleSendMessage = async () => {
    if ((newMessage.trim() === '' && !attachedFile) || !selectedStudent) return;

    let attachmentData: { attachmentName?: string; attachmentUrl?: string } = {};
    if (attachedFile) {
        const base64Url = await fileToBase64(attachedFile);
        attachmentData = {
            attachmentName: attachedFile.name,
            attachmentUrl: base64Url,
        };
    }

    await api.addMessage({
        senderId: currentUser.id,
        receiverId: ADMIN_ID,
        contenu: newMessage,
        date: new Date().toISOString(),
        ...attachmentData
    });

    setNewMessage('');
    setAttachedFile(null);
    if(fileInputRef.current) fileInputRef.current.value = '';
    setMessages(await api.getMessages());
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
        setAttachedFile(e.target.files[0]);
    }
  };


  const handleDownload = (doc: Document) => {
    const content = `Titre: ${doc.title}\nDescription: ${doc.description}\nURL: ${doc.url}`;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${doc.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleContactWhatsApp = () => window.open(`https://wa.me/${SCHOOL_WHATSAPP_NUMBER}`, '_blank');
  
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

    const studentSpecificGrades = grades.filter(g => g.studentId === selectedStudent.id).sort((a, b) => (a.date && b.date) ? (new Date(b.date).getTime() - new Date(a.date).getTime()) : (b.id - a.id));
    const studentSpecificAttendance = attendance.filter(a => a.studentId === selectedStudent.id).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const studentTimetable = timetable.filter(t => t.classe === selectedStudent.classe);
    const studentObservations = observations.filter(o => o.studentId === selectedStudent.id).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const latestObservation = studentObservations[0];
    const todayString = getLocalDateString(new Date());
    const menuForToday = menus.find(m => m.date && m.date.startsWith(todayString));

    const mainContent = () => {
        switch (activeView) {
          case 'dashboard':
            return (
              <div className="flex flex-col gap-4">
                <PageTitle>Tableau de bord</PageTitle>
                <Card title="Dernière Observation" className="bg-yellow-50 border-l-4 border-accent-yellow cursor-pointer" onClick={() => { setActiveView('suivi'); setActiveSuiviTab('observations'); }}>
                  {latestObservation ? (
                    <div>
                      <p className="text-sm text-slate-500 mb-1">{new Date(latestObservation.date).toLocaleDateString('fr-FR')} - {latestObservation.author}</p>
                      <p className="text-slate-700 truncate">{latestObservation.content}</p>
                      <p className="text-slate-500 text-xs pt-1 border-t mt-2">Voir tout l'historique</p>
                    </div>
                  ) : <p className="text-center text-slate-500 py-4">Aucune observation.</p>}
                </Card>
                <Card title="Menu du Jour" className="cursor-pointer" onClick={() => setActiveView('cantine')}>
                  {menuForToday ? (
                    <div className="space-y-1 text-sm">
                      {menuForToday.photoUrl && (
                        <ImageWithPreview
                          src={menuForToday.photoUrl}
                          alt="Repas du jour"
                          className="w-full aspect-[2/3] rounded-md mb-2"
                        />
                      )}
                      <p><strong>Plat:</strong> {menuForToday.mainCourse}</p>
                      <p className="text-slate-500 text-xs pt-1 border-t mt-2">Voir le menu de la semaine</p>
                    </div>
                  ) : <p className="text-center text-slate-500 py-4">Menu non disponible.</p>}
                </Card>
                <Card title="Dernières Notes" className="cursor-pointer" onClick={() => { setActiveView('suivi'); setActiveSuiviTab('notes'); }}>
                  {studentSpecificGrades.length > 0 ? (
                      studentSpecificGrades.slice(0, 3).map(g => (
                          <div key={g.id} className="flex justify-between items-center text-sm py-1">
                              <span>{g.matiere}</span>
                              <div className="flex items-center space-x-2">
                                  <span className="text-xs text-slate-400">{g.date ? new Date(g.date).toLocaleDateString('fr-FR') : ''}</span>
                                  <span className="font-bold text-royal-blue">{g.note}/20</span>
                              </div>
                          </div>
                      ))
                  ) : (
                      <p className="text-center text-slate-500 py-4">Aucune note pour l'instant.</p>
                  )}
                  {studentSpecificGrades.length > 0 && <p className="text-slate-500 text-xs pt-1 border-t mt-2">Voir toutes les notes</p>}
                </Card>
                <Card title="Dernières Absences">{studentSpecificAttendance.slice(0, 2).map(a => <p key={a.id}>{new Date(a.date).toLocaleDateString('fr-FR')}: {a.statut}</p>)}</Card>
              </div>
            );
          case 'suivi':
            return (
              <div className="space-y-6">
                <PageTitle>Suivi de {selectedStudent.prenom}</PageTitle>
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
                      {studentSpecificGrades.length > 0 ? (
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
                                    {studentSpecificGrades.map(g => (
                                        <tr key={g.id}>
                                            <td className="p-3 text-slate-600">{g.date ? new Date(g.date).toLocaleDateString('fr-FR') : 'N/A'}</td>
                                            <td className="p-3 font-medium text-slate-800">{g.matiere}</td>
                                            <td className="p-3 text-center font-bold text-royal-blue">{g.note}/20</td>
                                            <td className="p-3 text-center text-slate-500">{g.coefficient}</td>
                                            <td className="p-3 text-slate-500">{g.periode}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                          </div>
                      ) : (
                          <EmptyState 
                                icon={<ArchiveIcon />}
                                title="Aucune note détaillée"
                                message="Les notes apparaîtront ici au fur et à mesure."
                           />
                      )}
                    </Card>
                  </div>
                )}
            
                {activeSuiviTab === 'absences' && (
                  <div className="space-y-4">
                    {studentSpecificAttendance.length > 0 ? (
                        studentSpecificAttendance.map(a => (
                            <Card key={a.id} className="!p-0">
                                <div className={`flex items-center p-3 border-l-4 rounded-l-xl ${
                                    a.statut === 'Présent' ? 'border-green-500' :
                                    a.statut.includes('Absent') ? 'border-red-500' :
                                    'border-accent-yellow'
                                }`}>
                                    <div className="flex-grow">
                                        <p className="font-semibold text-slate-800">{new Date(a.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                                        <p className={`text-sm font-bold ${
                                            a.statut === 'Présent' ? 'text-green-600' :
                                            a.statut.includes('Absent') ? 'text-red-600' :
                                            'text-yellow-700'
                                        }`}>{a.statut}</p>
                                        {a.justification && <p className="text-xs text-slate-500 mt-1">Justification : {a.justification}</p>}
                                    </div>
                                </div>
                            </Card>
                        ))
                    ) : (
                      <Card>
                        <EmptyState 
                            icon={<CheckCircleIcon />}
                            title="Aucune absence"
                            message="L'historique des absences et retards sera affiché ici."
                        />
                      </Card>
                    )}
                  </div>
                )}
            
                {activeSuiviTab === 'observations' && (
                   <div className="space-y-4">
                        {studentObservations.length > 0 ? studentObservations.map(obs => (
                            <Card key={obs.id} className="bg-slate-50 border-l-4 border-royal-blue">
                                <div className="flex justify-between items-center mb-2">
                                    <p className="font-semibold text-slate-700">Par: {obs.author}</p>
                                    <p className="text-sm text-slate-500">{new Date(obs.date).toLocaleDateString('fr-FR')}</p>
                                </div>
                                <p className="text-slate-600 whitespace-pre-wrap">{obs.content}</p>
                            </Card>
                        )) : 
                        <Card><EmptyState icon={<ChatAltIcon />} title="Aucune observation" message="Les observations de l'administration apparaîtront ici." /></Card>
                        }
                    </div>
                )}
                
                {activeSuiviTab === 'emploi-du-temps' && (
                    <Card title="Emploi du temps"><div className="overflow-x-auto -mx-4"><table className="min-w-full text-left"><thead><tr><th className="p-3 font-semibold">Jour</th><th className="p-3 font-semibold">Heure</th><th className="p-3 font-semibold">Matière</th></tr></thead><tbody>{studentTimetable.map(t => <tr key={t.id} className="even:bg-slate-50"><td className="p-3">{t.day}</td><td className="p-3">{t.time}</td><td className="p-3">{t.subject}</td></tr>)}</tbody></table></div></Card>
                )}
              </div>
            );
          case 'cantine':
            const getStartOfWeek = (d: Date) => { const date = new Date(d); date.setDate(date.getDate() - date.getDay()); return date; };
            const startOfWeek = getStartOfWeek(currentDate);
            const weekDays = Array.from({ length: 7 }).map((_, i) => { const d = new Date(startOfWeek); d.setDate(d.getDate() + i); return d; });
            const goToPreviousWeek = () => setCurrentDate(d => { const n = new Date(d); n.setDate(d.getDate() - 7); return n; });
            const goToNextWeek = () => setCurrentDate(d => { const n = new Date(d); n.setDate(d.getDate() + 7); return n; });
            return (
                <div className="space-y-4">
                  <PageTitle>Menu de la Cantine</PageTitle>
                  <Card>
                    <div className="flex justify-between items-center mb-4">
                      <Button onClick={goToPreviousWeek} variant="ghost"><ChevronLeftIcon/></Button>
                      <span className="font-semibold text-center">Semaine du {startOfWeek.toLocaleDateString('fr-FR')}</span>
                      <Button onClick={goToNextWeek} variant="ghost"><ChevronRightIcon/></Button>
                    </div>
                  </Card>
                  {weekDays.map(day => {
                    const dayString = getLocalDateString(day);
                    const menuForDay = menus.find(m => m.date && m.date.startsWith(dayString));
                    return (
                      <Card key={dayString}>
                        <h4 className="font-bold text-royal-blue">{day.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric' })}</h4>
                        {menuForDay ? (
                            <>
                                {menuForDay.photoUrl && (
                                    <ImageWithPreview
                                        src={menuForDay.photoUrl}
                                        alt={`Repas du ${day.toLocaleDateString('fr-FR')}`}
                                        className="w-full aspect-[2/3] rounded-md my-2"
                                    />
                                )}
                                <ul className="space-y-1 text-sm text-slate-600 mt-2">
                                    <li><strong>Entrée:</strong> {menuForDay.starter}</li>
                                    <li><strong>Plat:</strong> {menuForDay.mainCourse}</li>
                                    <li><strong>Dessert:</strong> {menuForDay.dessert}</li>
                                    <li><strong>Goûter:</strong> {menuForDay.snack}</li>
                                </ul>
                            </>
                        ) : <p className="text-sm text-slate-500 italic mt-2">Menu non disponible.</p>}
                      </Card>
                    );
                  })}
                </div>
            );
          case 'plus':
            return (
              <div>
                <PageTitle>Plus d'options</PageTitle>
                <div className="grid grid-cols-2 gap-4">
                  <PlusGridItem label="Documents" icon={<DocumentIcon/>} onClick={() => setActiveView('documents')} />
                  <PlusGridItem label="Photos" icon={<CameraIcon/>} onClick={() => setActiveView('photos')} />
                  <PlusGridItem label="Contact" icon={<PhoneIcon/>} onClick={() => setActiveView('contact')} />
                  <PlusGridItem label="Enseignants" icon={<UserGroupIcon/>} onClick={() => setActiveView('enseignants')} />
                  <PlusGridItem label="Événements" icon={<CalendarIcon/>} onClick={() => setActiveView('evenements')} />
                  <PlusGridItem label="Aide" icon={<InformationCircleIcon/>} onClick={() => setActiveView('dataflow')} />
                </div>
                <div className="pt-8 mt-8 border-t border-slate-200">
                  <h3 className="px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Suivez-nous</h3>
                  <div className="flex items-center space-x-4 px-4">
                      <a href={FACEBOOK_URL} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-royal-blue"><FacebookIcon/></a>
                      <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-pink-600"><InstagramIcon/></a>
                  </div>
                </div>
                <div className="mt-8 pt-8 border-t border-slate-200">
                    <Button onClick={onLogout} variant="danger" className="w-full">
                        <LogoutIcon className="mr-2"/>Déconnexion
                    </Button>
                </div>
              </div>
            )
          case 'documents': return <div><PageTitle>Documents</PageTitle>{documents.map(d => <Card key={d.id} className="mb-2"><div className="flex justify-between items-center"><p>{d.title}</p><Button size="sm" onClick={() => handleDownload(d)}>Télécharger</Button></div></Card>)}</div>;
          case 'photos': return <PhotoGallery />;
          case 'contact': return <div><PageTitle>Contact</PageTitle><Card><Button onClick={handleContactWhatsApp} className="w-full py-3"><WhatsAppIcon className="mr-2"/>Contacter sur WhatsApp</Button></Card></div>;
          case 'enseignants': return <div><PageTitle>Enseignants</PageTitle>{teachers.map(t => <Card key={t.id} className="mb-2"><p>{t.prenom} {t.nom} - {t.matiere}</p></Card>)}</div>;
          case 'evenements': return <div><PageTitle>Événements</PageTitle>{events.map(e => <Card key={e.id} className="mb-2"><p>{e.title}</p><p>{e.event_date}</p></Card>)}</div>;
          case 'dataflow': return <DataFlowExplanation />;
          default: return null;
        }
    };
    
    return (
        <div key={activeView} className="fade-in">
            {mainContent()}
        </div>
    );

  };

  const navItems: { view: ParentView; label: string; icon: React.ReactNode }[] = [
    { view: 'dashboard', label: 'Accueil', icon: <HomeIcon /> },
    { view: 'suivi', label: 'Suivi', icon: <UserIcon /> },
    { view: 'messages', label: 'Messages', icon: <MessageIcon /> },
    { view: 'cantine', label: 'Cantine', icon: <MenuBoardIcon /> },
    { view: 'plus', label: 'Plus', icon: <DotsHorizontalIcon /> }
  ];

  const conversation = useMemo(() => messages
      .filter(m => (m.senderId === currentUser.id && m.receiverId === ADMIN_ID) || (m.senderId === ADMIN_ID && m.receiverId === currentUser.id))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()), 
    [messages, currentUser.id, ADMIN_ID]
  );

  return (
    <div className="h-screen flex flex-col bg-slate-50 text-slate-900">
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
          <div className="fixed top-16 right-4 z-30">
              <NotificationPanel 
                  notifications={notifications}
                  onNotificationClick={handleNotificationClick}
                  onMarkAllAsRead={onMarkAllAsRead}
                  onClose={() => setIsNotificationsOpen(false)}
              />
          </div>
      )}

      {activeView === 'messages' ? (
        <div className="flex-1 flex flex-col overflow-hidden pb-[60px]">
          <div className="px-4 pt-4">
            <PageTitle>Messagerie</PageTitle>
          </div>
          <div className="flex-1 overflow-y-auto space-y-4 px-4">
            {conversation.map(msg => (
              <div key={msg.id} className={`flex ${msg.senderId === currentUser.id ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-xs px-4 py-2 rounded-2xl ${msg.senderId === currentUser.id ? 'bg-royal-blue text-white' : 'bg-slate-200'}`}>
                  {msg.contenu && <p>{msg.contenu}</p>}
                  {msg.attachmentUrl && msg.attachmentName && (
                     <div className="mt-2">
                        {isImageFile(msg.attachmentName) ? (
                            <img src={msg.attachmentUrl} alt={msg.attachmentName} className="rounded-lg max-w-full h-auto" />
                        ) : (
                            <a href={msg.attachmentUrl} download={msg.attachmentName} className="flex items-center gap-2 bg-slate-300 p-2 rounded-lg hover:bg-slate-400">
                                <DocumentIcon className="w-5 h-5" />
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
           <div className="p-2 border-t border-slate-200 bg-white">
            {attachedFile && (
                <div className="px-4 py-2 flex items-center justify-between bg-slate-100 rounded-lg mb-2">
                    <div className="flex items-center gap-2 overflow-hidden">
                        <PaperClipIcon className="w-5 h-5 text-slate-500 flex-shrink-0" />
                        <span className="text-sm text-slate-700 truncate">{attachedFile.name}</span>
                    </div>
                    <button onClick={() => { setAttachedFile(null); if(fileInputRef.current) fileInputRef.current.value = ''; }} className="p-1 text-slate-500 hover:text-red-600">
                        <XCircleIcon className="w-5 h-5" />
                    </button>
                </div>
            )}
            <div className="flex w-full items-center space-x-2 max-w-4xl mx-auto px-2">
                <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" />
                <Button variant="ghost" className="!p-2 rounded-full flex-shrink-0" onClick={() => fileInputRef.current?.click()}>
                    <PaperClipIcon className="w-6 h-6 text-slate-600" />
                </Button>
                <input 
                    type="text" 
                    placeholder="Écrire un message..." 
                    className="flex-grow border border-slate-300 rounded-full py-2 px-4 focus:outline-none focus:ring-2 focus:ring-royal-blue" 
                    value={newMessage} 
                    onChange={(e) => setNewMessage(e.target.value)} 
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                />
                <Button className="rounded-full flex-shrink-0" onClick={handleSendMessage}>
                    Envoyer
                </Button>
            </div>
          </div>
        </div>
      ) : (
        <main className="flex-1 p-4 overflow-y-auto pb-24">
          {renderContent()}
        </main>
      )}

      <BottomNav activeView={activeView} setActiveView={setActiveView} navItems={navItems} />
    </div>
  );
};

export default ParentDashboard;