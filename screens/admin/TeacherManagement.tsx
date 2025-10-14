import React, { useState, useMemo } from 'react';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import PlusIcon from '../../components/icons/PlusIcon';
import PencilIcon from '../../components/icons/PencilIcon';
import TrashIcon from '../../components/icons/TrashIcon';
import SearchIcon from '../../components/icons/SearchIcon';
import { Teacher, Student } from '../../types';
import * as api from '../../api';
import UserIcon from '../../components/icons/UserIcon';
import CameraIcon from '../../components/icons/CameraIcon';
import CameraCapture from '../../components/common/CameraCapture';

interface TeacherManagementProps {
    teachers: Teacher[];
    students: Student[];
    onAdd: (teacher: Omit<Teacher, 'id'>) => Promise<void>;
    onUpdate: (teacher: Teacher) => Promise<void>;
    onDelete: (id: number) => Promise<void>;
}

const InputField: React.FC<{
    name: keyof Omit<Teacher, 'id' | 'photoUrl' | 'classes'>;
    label: string;
    type?: string;
    currentTeacher: Partial<Teacher> | null;
    handleFormChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    formErrors: { [key: string]: string };
}> = ({ name, label, type = 'text', currentTeacher, handleFormChange, formErrors }) => (
    <div>
        <label htmlFor={name} className="block text-sm font-medium text-gray-700">{label}</label>
        <input
            type={type}
            id={name}
            name={name}
            value={currentTeacher?.[name] as string || ''}
            onChange={handleFormChange}
            className={`mt-1 block w-full px-3 py-2 border ${formErrors[name] ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-royal-blue focus:border-royal-blue sm:text-sm`}
        />
        {formErrors[name] && <p className="mt-1 text-xs text-red-500">{formErrors[name]}</p>}
    </div>
);

const TeacherManagement: React.FC<TeacherManagementProps> = ({ teachers, students, onAdd, onUpdate, onDelete }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const [currentTeacher, setCurrentTeacher] = useState<Partial<Teacher> | null>(null);
    const [teacherToDelete, setTeacherToDelete] = useState<number | null>(null);
    const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});
    const [searchQuery, setSearchQuery] = useState('');
    const [subjectFilter, setSubjectFilter] = useState('all');
    const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const uniqueSubjects = useMemo(() => {
        const subjects = new Set(teachers.map(t => t.matiere));
        return ['Toutes les matières', ...Array.from(subjects).sort()];
    }, [teachers]);

    const uniqueClasses = useMemo(() => {
        return [...new Set(students.map(s => s.classe))].sort();
    }, [students]);
    
    const filteredTeachers = useMemo(() => {
        let filtered = teachers;

        if (subjectFilter !== 'all' && subjectFilter !== 'Toutes les matières') {
            filtered = filtered.filter(teacher => teacher.matiere === subjectFilter);
        }
        
        if (!searchQuery.trim()) {
            return filtered;
        }

        const lowercasedQuery = searchQuery.toLowerCase();
        return filtered.filter(teacher => 
            teacher.nom.toLowerCase().includes(lowercasedQuery) ||
            teacher.prenom.toLowerCase().includes(lowercasedQuery) ||
            teacher.matiere.toLowerCase().includes(lowercasedQuery) ||
            teacher.telephone.includes(searchQuery)
        );
    }, [teachers, searchQuery, subjectFilter]);
    
    const closeModal = () => {
        setIsModalOpen(false);
        setIsCameraOpen(false);
        setTimeout(() => {
            setCurrentTeacher(null);
            setSelectedPhoto(null);
        }, 300);
    };

    const handleAdd = () => {
        setCurrentTeacher({ nom: '', prenom: '', matiere: '', telephone: '', classes: [] });
        setFormErrors({});
        setSelectedPhoto(null);
        setIsCameraOpen(false);
        setIsModalOpen(true);
    };

    const handleEdit = (teacher: Teacher) => {
        setCurrentTeacher({ ...teacher, classes: teacher.classes || [] });
        setFormErrors({});
        setSelectedPhoto(null);
        setIsCameraOpen(false);
        setIsModalOpen(true);
    };

    const handleDelete = (id: number) => {
        setTeacherToDelete(id);
        setIsDeleteConfirmOpen(true);
    };

    const confirmDelete = async () => {
        if (teacherToDelete !== null) {
            await onDelete(teacherToDelete);
            setIsDeleteConfirmOpen(false);
            setTeacherToDelete(null);
        }
    };

    const validateForm = (): boolean => {
        const errors: { [key: string]: string } = {};
        if (!currentTeacher?.nom?.trim()) errors.nom = "Le nom est requis.";
        if (!currentTeacher?.prenom?.trim()) errors.prenom = "Le prénom est requis.";
        if (!currentTeacher?.matiere?.trim()) errors.matiere = "La matière est requise.";
        if (!currentTeacher?.telephone?.trim()) errors.telephone = "Le numéro de téléphone est requis.";
        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSave = async () => {
        if (!validateForm() || !currentTeacher) return;

        setIsSaving(true);
        try {
            let teacherToSave = { ...currentTeacher };
            
            if (selectedPhoto) {
                 try {
                    const uploadResult = await api.uploadPhoto(selectedPhoto);
                    teacherToSave.photoUrl = uploadResult.photoUrl;
                } catch (error) {
                    console.error("Photo upload failed:", error);
                    setFormErrors(prev => ({ ...prev, photo: "Échec du téléchargement de la photo." }));
                    setIsSaving(false);
                    return;
                }
            }
    
            if (teacherToSave.id) {
                await onUpdate(teacherToSave as Teacher);
            } else {
                await onAdd(teacherToSave as Omit<Teacher, 'id'>);
            }
            closeModal();
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (currentTeacher) {
            const { name, value } = e.target;
            setCurrentTeacher({ ...currentTeacher, [name]: value });
        }
    };

    const handleClassChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { value: className, checked } = e.target;
        if (currentTeacher) {
            const currentClasses = currentTeacher.classes || [];
            let newClasses: string[];
            if (checked) {
                newClasses = [...currentClasses, className];
            } else {
                newClasses = currentClasses.filter(c => c !== className);
            }
            setCurrentTeacher({ ...currentTeacher, classes: newClasses });
        }
    };
    
    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setSelectedPhoto(e.target.files[0]);
        }
    };
    
    const handlePhotoCaptured = (blob: Blob) => {
        const photoFile = new File([blob], "teacher_photo.jpg", { type: "image/jpeg" });
        setSelectedPhoto(photoFile);
        setIsCameraOpen(false);
    };

    return (
        <Card title="Gestion des Enseignants">
            <div className="mb-4 flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
                    <div className="relative w-full sm:w-auto">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                            <SearchIcon className="h-5 w-5 text-gray-400" />
                        </span>
                        <input
                            type="text"
                            placeholder="Rechercher..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full sm:w-52 pl-10 pr-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-royal-blue"
                        />
                    </div>
                    <div className="relative w-full sm:w-auto">
                        <select
                            id="subject-filter"
                            aria-label="Filtrer par matière"
                            value={subjectFilter}
                            onChange={(e) => setSubjectFilter(e.target.value)}
                            className="w-full pl-3 pr-8 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-royal-blue text-sm"
                        >
                            {uniqueSubjects.map(subject => (
                                <option key={subject} value={subject === 'Toutes les matières' ? 'all' : subject}>
                                    {subject}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
                <Button onClick={handleAdd} className="w-full sm:w-auto flex-shrink-0">
                    <PlusIcon className="w-4 h-4 mr-2" />
                    Ajouter un professeur
                </Button>
            </div>
            <div className="overflow-x-auto">
                <table className="min-w-full bg-white divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nom Complet</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Matière</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Classes</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {filteredTeachers.length > 0 ? filteredTeachers.map(teacher => (
                            <tr key={teacher.id} className="even:bg-slate-50">
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center">
                                        <div className="flex-shrink-0 h-10 w-10">
                                            {teacher.photoUrl ? (
                                                <img className="h-10 w-10 rounded-full object-cover" src={teacher.photoUrl} alt="" />
                                            ) : (
                                                <span className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
                                                   <UserIcon className="h-6 w-6 text-gray-400" />
                                                </span>
                                            )}
                                        </div>
                                        <div className="ml-4">
                                             <div className="text-sm font-medium text-gray-900">{teacher.prenom} {teacher.nom}</div>
                                             <div className="text-xs text-gray-500">{teacher.telephone}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{teacher.matiere}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                     <div className="flex flex-wrap gap-1 max-w-xs">
                                        {teacher.classes && teacher.classes.length > 0 ? (
                                            teacher.classes.map(c => <span key={c} className="px-2 py-0.5 text-xs font-medium bg-royal-blue/10 text-royal-blue rounded-full">{c}</span>)
                                        ) : (
                                            <span className="text-xs text-gray-400 italic">Aucune</span>
                                        )}
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                                    <Button size="sm" variant="ghost" onClick={() => handleEdit(teacher)}><PencilIcon/></Button>
                                    <Button size="sm" variant="ghost" className="text-red-600 hover:bg-red-100" onClick={() => handleDelete(teacher.id)}><TrashIcon/></Button>
                                </td>
                            </tr>
                        )) : (
                            <tr><td colSpan={4} className="text-center py-10 text-gray-500">Aucun enseignant trouvé.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            <Modal 
                isOpen={isModalOpen} 
                onClose={closeModal} 
                title={isCameraOpen ? "Prendre une photo" : (currentTeacher?.id ? "Modifier le professeur" : "Ajouter un professeur")}
                footer={!isCameraOpen && (<><Button variant="ghost" onClick={closeModal}>Annuler</Button><Button onClick={handleSave} disabled={isSaving}>{isSaving ? 'Enregistrement...' : 'Enregistrer'}</Button></>)}
                size="lg"
            >
                {isCameraOpen ? (
                    <CameraCapture onCapture={handlePhotoCaptured} onClose={() => setIsCameraOpen(false)} shape="circle" />
                ) : (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Photo de profil</label>
                            <div className="mt-2 flex items-center space-x-4">
                                <div className="h-20 w-20 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden border">
                                    {selectedPhoto ? (
                                        <img src={URL.createObjectURL(selectedPhoto)} alt="Aperçu" className="h-full w-full object-cover" />
                                    ) : currentTeacher?.photoUrl ? (
                                        <img src={currentTeacher.photoUrl} alt="Photo actuelle" className="h-full w-full object-cover" />
                                    ) : (
                                        <UserIcon className="h-12 w-12 text-slate-400" />
                                    )}
                                </div>
                                <div className="flex flex-col space-y-2">
                                    <input type="file" id="photo-upload-teacher" accept="image/*" onChange={handlePhotoChange} className="hidden" />
                                    <Button variant="secondary" onClick={() => document.getElementById('photo-upload-teacher')?.click()}>
                                        Uploader
                                    </Button>
                                    <Button variant="ghost" onClick={() => setIsCameraOpen(true)}>
                                        <CameraIcon className="w-4 h-4 mr-2" />
                                        Prendre une photo
                                    </Button>
                                </div>
                            </div>
                            {formErrors.photo && <p className="mt-2 text-xs text-red-500">{formErrors.photo}</p>}
                        </div>
                        <InputField name="nom" label="Nom" currentTeacher={currentTeacher} handleFormChange={handleFormChange} formErrors={formErrors} />
                        <InputField name="prenom" label="Prénom" currentTeacher={currentTeacher} handleFormChange={handleFormChange} formErrors={formErrors} />
                        <InputField name="matiere" label="Matière" currentTeacher={currentTeacher} handleFormChange={handleFormChange} formErrors={formErrors} />
                        <InputField name="telephone" label="Téléphone" type="tel" currentTeacher={currentTeacher} handleFormChange={handleFormChange} formErrors={formErrors} />
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Classes Assignées</label>
                            <div className="mt-2 p-3 border border-gray-300 rounded-md max-h-40 overflow-y-auto">
                                {uniqueClasses.length > 0 ? (
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                        {uniqueClasses.map(className => (
                                            <div key={className} className="flex items-center">
                                                <input
                                                    id={`class-${className}`}
                                                    name="classes"
                                                    type="checkbox"
                                                    value={className}
                                                    checked={currentTeacher?.classes?.includes(className) || false}
                                                    onChange={handleClassChange}
                                                    className="h-4 w-4 text-royal-blue border-gray-300 rounded focus:ring-royal-blue"
                                                />
                                                <label htmlFor={`class-${className}`} className="ml-2 block text-sm text-gray-900">
                                                    {className}
                                                </label>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-center text-gray-500">Aucune classe disponible. Ajoutez des élèves pour créer des classes.</p>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </Modal>
            
            <Modal isOpen={isDeleteConfirmOpen} onClose={() => setIsDeleteConfirmOpen(false)} title="Confirmer la suppression"
                footer={<><Button variant="ghost" onClick={() => setIsDeleteConfirmOpen(false)}>Annuler</Button><Button variant="danger" onClick={confirmDelete}>Supprimer</Button></>}
            ><p>Êtes-vous sûr de vouloir supprimer ce professeur ?</p></Modal>
        </Card>
    );
};

export default TeacherManagement;
