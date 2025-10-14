import React, { useState, useCallback, useMemo, useEffect } from 'react';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import PlusIcon from '../../components/icons/PlusIcon';
import PencilIcon from '../../components/icons/PencilIcon';
import SearchIcon from '../../components/icons/SearchIcon';
import { Student, User, Grade, Attendance, Observation, AttendanceStatus } from '../../types';
import * as api from '../../api';
import UserIcon from '../../components/icons/UserIcon';
import CameraIcon from '../../components/icons/CameraIcon';
import CameraCapture from '../../components/common/CameraCapture';
import ChevronLeftIcon from '../../components/icons/ChevronLeftIcon';
import BookOpenIcon from '../../components/icons/BookOpenIcon';
import ClipboardListIcon from '../../components/icons/ClipboardListIcon';
import ChatAltIcon from '../../components/icons/ChatAltIcon';

interface StudentDetailViewProps {
    student: Student;
    parent: User | undefined;
    attendance: Attendance[];
    observations: Observation[];
    onBack: () => void;
}

const InfoSection: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode; }> = ({ title, icon, children }) => (
    <Card>
        <div className="flex items-center mb-4">
            <span className="p-2 bg-royal-blue/10 rounded-full mr-3 text-royal-blue">{icon}</span>
            <h3 className="text-xl font-semibold text-royal-blue">{title}</h3>
        </div>
        {children}
    </Card>
);

const StudentDetailView: React.FC<StudentDetailViewProps> = ({ student, parent, attendance, observations, onBack }) => {
    return (
        <div className="fade-in">
            <Button variant="ghost" onClick={onBack} className="mb-4">
                <ChevronLeftIcon className="mr-2 h-5 w-5" />
                Retour à la liste des élèves
            </Button>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1">
                    <Card className="sticky top-20 text-center">
                        <div className="w-32 h-32 rounded-full mx-auto mb-4 bg-slate-100 flex items-center justify-center border-4 border-white shadow-md">
                             {student.photoUrl ? (
                                <img className="h-full w-full rounded-full object-cover" src={student.photoUrl} alt={`Photo de ${student.prenom}`} />
                            ) : (
                                <UserIcon className="h-16 w-16 text-slate-400" />
                            )}
                        </div>
                        <h2 className="text-2xl font-bold text-slate-800">{student.prenom} {student.nom}</h2>
                        <p className="text-sm text-slate-500">{student.classe}{student.niveauScolaire ? ` - ${student.niveauScolaire}` : ''}</p>

                        <div className="mt-6 text-left space-y-3 pt-4 border-t">
                            <p><strong>Né(e) le :</strong> {new Date(student.dateNaissance).toLocaleDateString('fr-FR')}</p>
                            <p><strong>Parent :</strong> {parent?.nom || 'N/A'}</p>
                             <p><strong>Statut :</strong> 
                                {student.isArchived ? 
                                    <span className="ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">Archivé</span> : 
                                    <span className="ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">Actif</span>
                                }
                            </p>
                        </div>
                    </Card>
                </div>

                <div className="lg:col-span-2 space-y-6">
                    <InfoSection title="Suivi des Présences" icon={<ClipboardListIcon className="w-6 h-6"/>}>
                        {attendance.length > 0 ? (
                            <ul className="space-y-2">
                                {attendance.map(a => (
                                    <li key={a.id} className={`p-2 rounded-md flex justify-between items-center ${a.statut === AttendanceStatus.PRESENT ? 'bg-green-50' : a.statut.includes('Absent') ? 'bg-red-50' : 'bg-yellow-50'}`}>
                                        <div>
                                            <span className="font-semibold">{new Date(a.date).toLocaleDateString('fr-FR')} : </span>
                                            <span className={`font-bold ${a.statut === AttendanceStatus.PRESENT ? 'text-green-700' : a.statut.includes('Absent') ? 'text-red-700' : 'text-yellow-700'}`}>{a.statut}</span>
                                        </div>
                                        {a.justification && <p className="text-xs text-slate-500">({a.justification})</p>}
                                    </li>
                                ))}
                            </ul>
                        ) : <p className="text-center text-slate-500 py-4">Aucun suivi de présence pour cet élève.</p>}
                    </InfoSection>

                    <InfoSection title="Observations" icon={<ChatAltIcon className="w-6 h-6"/>}>
                        {observations.length > 0 ? (
                           <ul className="space-y-4">
                               {observations.map(obs => (
                                    <li key={obs.id} className="bg-slate-50 p-3 rounded-md border-l-4 border-royal-blue">
                                        <div className="flex justify-between items-center mb-1 text-xs text-slate-500">
                                            <span>Par : <strong>{obs.author}</strong></span>
                                            <span>Le : <strong>{new Date(obs.date).toLocaleDateString('fr-FR')}</strong></span>
                                        </div>
                                        <p className="text-slate-700 whitespace-pre-wrap">{obs.content}</p>
                                    </li>
                               ))}
                           </ul>
                        ) : <p className="text-center text-slate-500 py-4">Aucune observation pour cet élève.</p>}
                    </InfoSection>
                </div>
            </div>
        </div>
    );
};

interface StudentManagementProps {
    students: Student[];
    parents: User[];
    grades: Grade[];
    attendance: Attendance[];
    observations: Observation[];
    onAdd: (student: Omit<Student, 'id'>) => Promise<void>;
    onUpdate: (student: Student) => Promise<void>;
    initialSearchQuery: string | null;
}

const InputField: React.FC<{ 
    name: keyof Omit<Student, 'id' | 'parentId' | 'isArchived' | 'photoUrl'>;
    label: string; 
    type?: string;
    currentStudent: Partial<Student> | null;
    handleFormChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    formErrors: { [key: string]: string };
}> = ({ name, label, type = 'text', currentStudent, handleFormChange, formErrors }) => (
    <div>
        <label htmlFor={name} className="block text-sm font-medium text-gray-700">{label}</label>
        <input
            type={type}
            id={name}
            name={name}
            value={currentStudent?.[name] as string || ''}
            onChange={handleFormChange}
            className={`mt-1 block w-full px-3 py-2 border ${formErrors[name] ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-royal-blue focus:border-royal-blue sm:text-sm`}
        />
        {formErrors[name] && <p className="mt-1 text-xs text-red-500">{formErrors[name]}</p>}
    </div>
);

type StudentView = 'active' | 'archived' | 'all';

const ViewButton: React.FC<{ 
    currentView: StudentView; 
    targetView: StudentView; 
    children: React.ReactNode;
    onClick: (view: StudentView) => void;
}> = ({ currentView, targetView, children, onClick }) => (
    <Button
        size="sm"
        variant={currentView === targetView ? 'primary' : 'ghost'}
        onClick={() => onClick(targetView)}
    >
        {children}
    </Button>
);

const StudentManagement: React.FC<StudentManagementProps> = ({ students, parents, grades, attendance, observations, onAdd, onUpdate, initialSearchQuery }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isArchiveConfirmOpen, setIsArchiveConfirmOpen] = useState(false);
    const [currentStudent, setCurrentStudent] = useState<Partial<Student> | null>(null);
    const [studentToToggleArchive, setStudentToToggleArchive] = useState<Student | null>(null);
    const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});
    const [view, setView] = useState<StudentView>('active');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [viewingStudent, setViewingStudent] = useState<Student | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (initialSearchQuery) {
            setSearchQuery(initialSearchQuery);
        }
    }, [initialSearchQuery]);

    const getParentName = useCallback((parentId: number) => {
        return parents.find(p => p.id === parentId)?.nom || 'N/A';
    }, [parents]);


    const filteredStudents = useMemo(() => {
        let list;
        switch (view) {
            case 'active':
                list = students.filter(s => !s.isArchived);
                break;
            case 'archived':
                list = students.filter(s => s.isArchived);
                break;
            case 'all':
            default:
                list = students;
        }

        if (!searchQuery.trim()) {
            return list;
        }

        const lowercasedQuery = searchQuery.toLowerCase();
        return list.filter(student => 
            student.nom.toLowerCase().includes(lowercasedQuery) ||
            student.prenom.toLowerCase().includes(lowercasedQuery) ||
            student.classe.toLowerCase().includes(lowercasedQuery) ||
            (student.niveauScolaire || '').toLowerCase().includes(lowercasedQuery) ||
            getParentName(student.parentId).toLowerCase().includes(lowercasedQuery)
        );
    }, [students, view, searchQuery, getParentName]);


    const handleAdd = () => {
        setCurrentStudent({ nom: '', prenom: '', dateNaissance: '', classe: '', niveauScolaire: '', parentId: undefined, isArchived: false });
        setSelectedPhoto(null);
        setFormErrors({});
        setIsCameraOpen(false);
        setIsModalOpen(true);
    };

    const handleEdit = (student: Student) => {
        setCurrentStudent(student);
        setSelectedPhoto(null);
        setFormErrors({});
        setIsCameraOpen(false);
        setIsModalOpen(true);
    };

    const handleToggleArchive = (student: Student) => {
        setStudentToToggleArchive(student);
        setIsArchiveConfirmOpen(true);
    };
    
    const handleViewDetails = (student: Student) => {
        setViewingStudent(student);
    };

    const handleBackToList = () => {
        setViewingStudent(null);
    };

    const confirmToggleArchive = async () => {
        if (studentToToggleArchive) {
            const updatedStudent = { ...studentToToggleArchive, isArchived: !studentToToggleArchive.isArchived };
            await onUpdate(updatedStudent);
            setIsArchiveConfirmOpen(false);
            setStudentToToggleArchive(null);
        }
    };

    const validateForm = (): boolean => {
        const errors: { [key: string]: string } = {};
        if (!currentStudent?.nom?.trim()) errors.nom = "Le nom est requis.";
        if (!currentStudent?.prenom?.trim()) errors.prenom = "Le prénom est requis.";
        if (!currentStudent?.dateNaissance?.trim()) errors.dateNaissance = "La date de naissance est requise.";
        if (!currentStudent?.classe?.trim()) errors.classe = "La classe est requise.";
        if (!currentStudent?.parentId) errors.parentId = "Le parent est requis.";
        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSave = async () => {
        if (!validateForm() || !currentStudent) return;
        
        setIsSaving(true);
        try {
            let studentToSave = { ...currentStudent };
    
            if (selectedPhoto) {
                try {
                    const uploadResult = await api.uploadPhoto(selectedPhoto);
                    studentToSave.photoUrl = uploadResult.photoUrl;
                } catch (error) {
                    console.error("Photo upload failed:", error);
                    setFormErrors(prev => ({ ...prev, photo: "Échec du téléchargement de la photo." }));
                    setIsSaving(false);
                    return;
                }
            }
    
            if (studentToSave.id) {
                await onUpdate(studentToSave as Student);
            } else {
                await onAdd(studentToSave as Omit<Student, 'id'>);
            }
            closeModal();
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        if (currentStudent) {
            const { name, value } = e.target;
            setCurrentStudent({ 
                ...currentStudent, 
                [name]: name === 'parentId' ? parseInt(value, 10) : value 
            });
        }
    };

    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setSelectedPhoto(e.target.files[0]);
        }
    };
    
    const handlePhotoCaptured = (blob: Blob) => {
        const photoFile = new File([blob], "student_photo.jpg", { type: "image/jpeg" });
        setSelectedPhoto(photoFile);
        setIsCameraOpen(false);
    };
    
    const closeModal = () => {
        setIsModalOpen(false);
        setIsCameraOpen(false);
        setTimeout(() => {
            setCurrentStudent(null);
            setSelectedPhoto(null);
        }, 300);
    };
    
    if (viewingStudent) {
        const studentParent = parents.find(p => p.id === viewingStudent.parentId);
        const studentAttendance = attendance.filter(a => a.studentId === viewingStudent.id).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        const studentObservations = observations.filter(o => o.studentId === viewingStudent.id).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        
        return (
            <StudentDetailView 
                student={viewingStudent}
                parent={studentParent}
                attendance={studentAttendance}
                observations={studentObservations}
                onBack={handleBackToList}
            />
        );
    }

    return (
        <Card title="Gestion des Élèves">
            <div className="mb-4 flex flex-col gap-4">
                 <div className="relative w-full">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                        <SearchIcon className="h-5 w-5 text-gray-400" />
                    </span>
                    <input
                        type="text"
                        placeholder="Rechercher par nom, classe..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-royal-blue"
                    />
                </div>
                <div className="flex justify-between items-center gap-2">
                    <div className="flex space-x-1">
                        <ViewButton currentView={view} targetView="active" onClick={setView}>Actifs</ViewButton>
                        <ViewButton currentView={view} targetView="archived" onClick={setView}>Archivés</ViewButton>
                        <ViewButton currentView={view} targetView="all" onClick={setView}>Tous</ViewButton>
                    </div>
                    <Button onClick={handleAdd} size="sm">
                        <PlusIcon className="w-4 h-4 mr-1" />
                        Ajouter
                    </Button>
                </div>
            </div>
            <div className="overflow-x-auto">
                <table className="min-w-full bg-white divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Élève</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Classe</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {filteredStudents.length > 0 ? filteredStudents.map(student => (
                            <tr key={student.id} 
                                className={`${student.isArchived ? 'bg-gray-50' : 'even:bg-slate-50'} cursor-pointer hover:bg-slate-100/50`}
                                onClick={() => handleViewDetails(student)}
                            >
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center">
                                        <div className="flex-shrink-0 h-10 w-10">
                                            {student.photoUrl ? (
                                                <img className="h-10 w-10 rounded-full object-cover" src={student.photoUrl} alt="" />
                                            ) : (
                                                <span className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
                                                   <UserIcon className="h-6 w-6 text-gray-400" />
                                                </span>
                                            )}
                                        </div>
                                        <div className="ml-4">
                                             <div className="text-sm font-medium text-gray-900">{student.prenom} {student.nom}</div>
                                             <div className="text-xs text-gray-500">{getParentName(student.parentId)}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{student.classe}</td>
                                 <td className="px-6 py-4 whitespace-nowrap text-sm">
                                    {student.isArchived ? 
                                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">Archivé</span> : 
                                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">Actif</span>
                                    }
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-1" onClick={(e) => e.stopPropagation()}>
                                    <Button size="sm" variant="ghost" onClick={() => handleEdit(student)}><PencilIcon/></Button>
                                    <Button size="sm" variant={student.isArchived ? 'secondary' : 'danger'} onClick={() => handleToggleArchive(student)}>
                                        {student.isArchived ? 'Activer' : 'Archiver'}
                                    </Button>
                                </td>
                            </tr>
                        )) : (
                            <tr><td colSpan={4} className="text-center py-10 text-gray-500">Aucun élève trouvé.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            <Modal 
                isOpen={isModalOpen} 
                onClose={closeModal} 
                title={isCameraOpen ? "Prendre une photo" : (currentStudent?.id ? "Modifier l'élève" : "Ajouter un élève")}
                footer={!isCameraOpen && (<><Button variant="ghost" onClick={closeModal}>Annuler</Button><Button onClick={handleSave} disabled={isSaving}>{isSaving ? 'Enregistrement...' : 'Enregistrer'}</Button></>)}
                size="lg"
            >
                {isCameraOpen ? (
                    <CameraCapture onCapture={handlePhotoCaptured} onClose={() => setIsCameraOpen(false)} shape="circle" />
                ) : (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Photo de l'élève</label>
                            <div className="mt-2 flex items-center space-x-4">
                                <div className="h-20 w-20 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden border">
                                    {selectedPhoto ? (
                                        <img src={URL.createObjectURL(selectedPhoto)} alt="Aperçu" className="h-full w-full object-cover" />
                                    ) : currentStudent?.photoUrl ? (
                                        <img src={currentStudent.photoUrl} alt="Photo actuelle" className="h-full w-full object-cover" />
                                    ) : (
                                        <UserIcon className="h-12 w-12 text-slate-400" />
                                    )}
                                </div>
                                <div className="flex flex-col space-y-2">
                                    <input type="file" id="photo-upload" accept="image/*" onChange={handlePhotoChange} className="hidden" />
                                    <Button variant="secondary" onClick={() => document.getElementById('photo-upload')?.click()}>
                                        Uploader un fichier
                                    </Button>
                                    <Button variant="ghost" onClick={() => setIsCameraOpen(true)}>
                                        <CameraIcon className="w-4 h-4 mr-2" />
                                        Prendre une photo
                                    </Button>
                                </div>
                            </div>
                            {formErrors.photo && <p className="mt-2 text-xs text-red-500">{formErrors.photo}</p>}
                        </div>

                        <InputField name="nom" label="Nom" currentStudent={currentStudent} handleFormChange={handleFormChange} formErrors={formErrors} />
                        <InputField name="prenom" label="Prénom" currentStudent={currentStudent} handleFormChange={handleFormChange} formErrors={formErrors} />
                        <InputField name="dateNaissance" label="Date de Naissance" type="date" currentStudent={currentStudent} handleFormChange={handleFormChange} formErrors={formErrors} />
                        <InputField name="niveauScolaire" label="Niveau Scolaire (optionnel)" currentStudent={currentStudent} handleFormChange={handleFormChange} formErrors={formErrors} />
                        <InputField name="classe" label="Classe" currentStudent={currentStudent} handleFormChange={handleFormChange} formErrors={formErrors} />
                        <div>
                            <label htmlFor="parentId" className="block text-sm font-medium text-gray-700">Parent</label>
                            <select id="parentId" name="parentId" value={currentStudent?.parentId || ''} onChange={handleFormChange} className={`mt-1 block w-full px-3 py-2 border ${formErrors.parentId ? 'border-red-500' : 'border-gray-300'} rounded-md`}>
                                <option value="">Sélectionner un parent</option>
                                {parents.map(p => <option key={p.id} value={p.id}>{p.nom}</option>)}
                            </select>
                             {formErrors.parentId && <p className="mt-1 text-xs text-red-500">{formErrors.parentId}</p>}
                        </div>
                    </div>
                )}
            </Modal>
            
            <Modal isOpen={isArchiveConfirmOpen} onClose={() => setIsArchiveConfirmOpen(false)} title={studentToToggleArchive?.isArchived ? "Désarchiver l'élève" : "Archiver l'élève"}
                footer={<><Button variant="ghost" onClick={() => setIsArchiveConfirmOpen(false)}>Annuler</Button><Button variant={studentToToggleArchive?.isArchived ? 'primary' : 'danger'} onClick={confirmToggleArchive}>{studentToToggleArchive?.isArchived ? 'Désarchiver' : 'Archiver'}</Button></>}>
                <p>Êtes-vous sûr de vouloir {studentToToggleArchive?.isArchived ? 'désarchiver' : 'archiver'} {studentToToggleArchive?.prenom} {studentToToggleArchive?.nom} ?</p>
            </Modal>
        </Card>
    );
};

export default StudentManagement;