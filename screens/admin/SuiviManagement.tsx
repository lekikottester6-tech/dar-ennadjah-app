import React, { useState, useEffect, useMemo } from 'react';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import { Student, Grade, Attendance, AttendanceStatus, User, Observation } from '../../types';
import * as api from '../../api';
import PlusIcon from '../../components/icons/PlusIcon';
import PencilIcon from '../../components/icons/PencilIcon';
import TrashIcon from '../../components/icons/TrashIcon';
import SearchIcon from '../../components/icons/SearchIcon';
import PrintIcon from '../../components/icons/PrintIcon';
import PrintableStudentFile from './PrintableStudentFile';

interface SuiviManagementProps {
    students: Student[];
    parents: User[];
    observations: Observation[];
    loadingStudents: boolean;
    grades: Grade[];
    attendance: Attendance[];
    onAddGrade: (grade: Omit<Grade, 'id'>) => void;
    onUpdateGrade: (grade: Grade) => void;
    onDeleteGrade: (gradeId: number) => void;
    onAddAttendance: (attendance: Omit<Attendance, 'id'>) => void;
    onUpdateAttendance: (attendance: Attendance) => void;
    onDeleteAttendance: (attendanceId: number) => void;
}

const SuiviManagement: React.FC<SuiviManagementProps> = ({ students: allStudents, parents, observations, loadingStudents, grades, attendance, onAddGrade, onUpdateGrade, onDeleteGrade, onAddAttendance, onUpdateAttendance, onDeleteAttendance }) => {
    const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterPeriod, setFilterPeriod] = useState('all'); // 'all', 't1', 't2', 't3', 'last_month'

    // Modal and form state
    const [isGradeModalOpen, setIsGradeModalOpen] = useState(false);
    const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false);
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const [isPrintViewOpen, setIsPrintViewOpen] = useState(false);
    
    const [currentGrade, setCurrentGrade] = useState<Partial<Grade> | null>(null);
    const [currentAttendance, setCurrentAttendance] = useState<Partial<Attendance> | null>(null);
    const [itemToDelete, setItemToDelete] = useState<{id: number, type: 'grade' | 'attendance'} | null>(null);
    
    const activeStudents = useMemo(() => allStudents.filter(s => !s.isArchived), [allStudents]);
    
    const filteredStudents = useMemo(() => {
        if (!searchQuery.trim()) {
            return activeStudents;
        }
        const lowercasedQuery = searchQuery.toLowerCase();
        return activeStudents.filter(student =>
            `${student.prenom} ${student.nom}`.toLowerCase().includes(lowercasedQuery) ||
            student.classe.toLowerCase().includes(lowercasedQuery)
        );
    }, [activeStudents, searchQuery]);

    const selectedStudent = useMemo(() => allStudents.find(s => s.id === selectedStudentId), [allStudents, selectedStudentId]);

    useEffect(() => {
        if (filteredStudents.length === 1) {
            if (selectedStudentId !== filteredStudents[0].id) {
                setSelectedStudentId(filteredStudents[0].id);
            }
            return;
        }

        if (selectedStudentId && !filteredStudents.some(s => s.id === selectedStudentId)) {
            setSelectedStudentId(null);
        }

        if (!selectedStudentId && searchQuery === '' && filteredStudents.length > 0) {
            setSelectedStudentId(filteredStudents[0].id);
        }
    }, [filteredStudents, searchQuery, selectedStudentId]);

    const filteredGrades = useMemo(() => {
        let studentGrades = grades.filter(g => g.studentId === selectedStudentId);

        if (filterPeriod === 'all' || filterPeriod === 'last_month') {
            return studentGrades.sort((a, b) => (a.date && b.date) ? (new Date(b.date).getTime() - new Date(a.date).getTime()) : b.id - a.id);
        }

        if (filterPeriod.startsWith('t')) {
            const trimesterMap: { [key: string]: string } = { t1: 'Trimestre 1', t2: 'Trimestre 2', t3: 'Trimestre 3' };
            const targetTrimester = trimesterMap[filterPeriod];
            if (targetTrimester) {
                studentGrades = studentGrades.filter(g => g.periode === targetTrimester);
            }
        }

        return studentGrades.sort((a, b) => (a.date && b.date) ? (new Date(b.date).getTime() - new Date(a.date).getTime()) : b.id - a.id);
    }, [grades, selectedStudentId, filterPeriod]);

    const filteredAttendance = useMemo(() => {
        let studentAttendance = attendance.filter(a => a.studentId === selectedStudentId);
        const now = new Date();

        if (filterPeriod === 'last_month') {
            const oneMonthAgo = new Date();
            oneMonthAgo.setMonth(now.getMonth() - 1);
            studentAttendance = studentAttendance.filter(a => new Date(a.date) >= oneMonthAgo);
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
                studentAttendance = studentAttendance.filter(a => {
                    const attDate = new Date(a.date);
                    return attDate >= startDate && attDate <= endDate;
                });
            }
        }

        return studentAttendance.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [attendance, selectedStudentId, filterPeriod]);

    const handleAddGradeClick = () => {
        setCurrentGrade({ studentId: selectedStudentId!, matiere: '', note: 0, coefficient: 1, periode: 'Trimestre 1', date: new Date().toISOString().split('T')[0] });
        setIsGradeModalOpen(true);
    };

    const handleEditGrade = (grade: Grade) => {
        setCurrentGrade(grade);
        setIsGradeModalOpen(true);
    };
    
    const handleDeleteGrade = (id: number) => {
        setItemToDelete({id, type: 'grade'});
        setIsDeleteConfirmOpen(true);
    }

    const handleSaveGrade = () => {
        if (!currentGrade || !currentGrade.matiere || currentGrade.note === undefined || !currentGrade.date) return;
        
        if (currentGrade.id) {
            onUpdateGrade(currentGrade as Grade);
        } else {
            onAddGrade(currentGrade as Omit<Grade, 'id'>);
        }
        setIsGradeModalOpen(false);
        setCurrentGrade(null);
    };

    const handleAddAttendanceClick = () => {
        const today = new Date().toISOString().split('T')[0];
        setCurrentAttendance({ studentId: selectedStudentId!, date: today, statut: AttendanceStatus.ABSENT_UNJUSTIFIED, justification: '' });
        setIsAttendanceModalOpen(true);
    };

    const handleEditAttendance = (att: Attendance) => {
        setCurrentAttendance(att);
        setIsAttendanceModalOpen(true);
    };

    const handleDeleteAttendance = (id: number) => {
        setItemToDelete({id, type: 'attendance'});
        setIsDeleteConfirmOpen(true);
    };

    const handleSaveAttendance = () => {
        if (!currentAttendance || !currentAttendance.date) return;

        if (currentAttendance.id) {
            onUpdateAttendance(currentAttendance as Attendance);
        } else {
            onAddAttendance(currentAttendance as Omit<Attendance, 'id'>);
        }
        setIsAttendanceModalOpen(false);
        setCurrentAttendance(null);
    };

    const confirmDelete = () => {
        if (!itemToDelete) return;
        if (itemToDelete.type === 'grade') {
            onDeleteGrade(itemToDelete.id);
        } else {
            onDeleteAttendance(itemToDelete.id);
        }
        setIsDeleteConfirmOpen(false);
        setItemToDelete(null);
    };
    
    const handleGradeFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        if (currentGrade) {
            const { name, value } = e.target;
            setCurrentGrade({ ...currentGrade, [name]: (name === 'note' || name === 'coefficient') ? parseFloat(value) : value });
        }
    };

    const handleAttendanceFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        if (currentAttendance) {
            setCurrentAttendance({ ...currentAttendance, [e.target.name]: e.target.value });
        }
    };
    
    return (
        <Card title="Suivi Scolaire (Notes et Absences)">
            <div className="mb-6">
                <label htmlFor="student-search" className="block text-sm font-medium text-gray-700 mb-2">
                    Rechercher un élève
                </label>
                <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                        <SearchIcon className="h-5 w-5 text-gray-400" />
                    </span>
                    <input
                        type="text"
                        id="student-search"
                        placeholder="Rechercher par nom, prénom ou classe..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-royal-blue"
                    />
                </div>
            </div>

            <div className="mb-6">
                <label htmlFor="student-select" className="block text-sm font-medium text-gray-700 mb-2">
                    Sélectionner un élève
                </label>
                <select
                    id="student-select"
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-royal-blue focus:border-royal-blue sm:text-sm rounded-md"
                    onChange={(e) => setSelectedStudentId(e.target.value ? parseInt(e.target.value, 10) : null)}
                    value={selectedStudentId ?? ''}
                    disabled={loadingStudents}
                >
                    <option value="">
                         {searchQuery ? 
                            (filteredStudents.length > 0 ? 'Sélectionnez un résultat' : 'Aucun élève trouvé') : 
                            '-- Choisir dans la liste --'
                        }
                    </option>
                    {filteredStudents.map(s => (
                        <option key={s.id} value={s.id}>{s.prenom} {s.nom} ({s.classe})</option>
                    ))}
                </select>
            </div>

            {selectedStudent ? (
                <>
                <div className="bg-royal-blue/10 border-l-4 border-royal-blue p-4 rounded-r-lg mb-6">
                    <h3 className="text-lg font-semibold text-royal-blue">
                        Résumé pour {selectedStudent.prenom} {selectedStudent.nom}
                    </h3>
                    <div className="flex justify-between items-center">
                        <p className="text-sm text-slate-600">
                            Classe: {selectedStudent.classe} - Niveau: {selectedStudent.niveauScolaire}
                        </p>
                        <Button variant="ghost" size="sm" onClick={() => setIsPrintViewOpen(true)}>
                            <PrintIcon className="w-4 h-4 mr-2" />
                            Générer Fiche
                        </Button>
                    </div>
                </div>

                <div className="my-6 p-2 bg-slate-100 rounded-lg">
                    <p className="font-semibold text-slate-700 text-sm mb-2">Filtrer par période :</p>
                    <div className="grid grid-cols-3 gap-2">
                        <Button size="sm" variant={filterPeriod === 'all' ? 'primary' : 'ghost'} onClick={() => setFilterPeriod('all')}>Tout</Button>
                        <Button size="sm" variant={filterPeriod === 't1' ? 'primary' : 'ghost'} onClick={() => setFilterPeriod('t1')}>T1</Button>
                        <Button size="sm" variant={filterPeriod === 't2' ? 'primary' : 'ghost'} onClick={() => setFilterPeriod('t2')}>T2</Button>
                        <Button size="sm" variant={filterPeriod === 't3' ? 'primary' : 'ghost'} onClick={() => setFilterPeriod('t3')}>T3</Button>
                        <Button size="sm" variant={filterPeriod === 'last_month' ? 'primary' : 'ghost'} onClick={() => setFilterPeriod('last_month')} className="col-span-2">Dernier Mois</Button>
                    </div>
                </div>

                <div className="flex flex-col gap-8">
                    <Card>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold text-royal-blue">Notes</h3>
                            <Button size="sm" onClick={handleAddGradeClick}><PlusIcon className="w-4 h-4 mr-1" />Ajouter</Button>
                        </div>
                        <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
                            {filteredGrades.length > 0 ? filteredGrades.map((g, index) => (
                                <div key={g.id} className={`p-3 rounded-lg flex justify-between items-center ${index % 2 !== 0 ? 'bg-slate-50' : 'bg-white'}`}>
                                    <div><span className="font-semibold">{g.matiere}: </span><span className="font-bold text-royal-blue">{g.note}/20</span></div>
                                    <div className="space-x-1"><Button size="sm" variant="ghost" onClick={() => handleEditGrade(g)}><PencilIcon/></Button><Button size="sm" variant="ghost" className="text-red-600" onClick={() => handleDeleteGrade(g.id)}><TrashIcon/></Button></div>
                                </div>
                            )) : <p className="text-center text-slate-500 py-4">Aucune note.</p>}
                        </div>
                    </Card>

                    <Card>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold text-royal-blue">Absences</h3>
                             <Button size="sm" onClick={handleAddAttendanceClick}><PlusIcon className="w-4 h-4 mr-1" />Ajouter</Button>
                        </div>
                         <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
                            {filteredAttendance.length > 0 ? filteredAttendance.map((a, index) => (
                                <div key={a.id} className={`p-3 rounded-lg flex justify-between items-center ${index % 2 !== 0 ? 'bg-slate-50' : 'bg-white'}`}>
                                    <div><span className="font-semibold">{new Date(a.date).toLocaleDateString('fr-FR')}: </span><span className="font-bold">{a.statut}</span></div>
                                     <div className="space-x-1"><Button size="sm" variant="ghost" onClick={() => handleEditAttendance(a)}><PencilIcon/></Button><Button size="sm" variant="ghost" className="text-red-600" onClick={() => handleDeleteAttendance(a.id)}><TrashIcon/></Button></div>
                                </div>
                            )) : <p className="text-center text-slate-500 py-4">Aucune absence.</p>}
                        </div>
                    </Card>
                </div>
                </>
            ) : (
                <div className="text-center py-10 text-gray-500">
                    <p>{loadingStudents ? "Chargement..." : "Sélectionnez un élève pour commencer."}</p>
                </div>
            )}

            <Modal isOpen={isGradeModalOpen} onClose={() => setIsGradeModalOpen(false)} title={currentGrade?.id ? "Modifier la note" : "Ajouter une note"}
                footer={<><Button variant="ghost" onClick={() => setIsGradeModalOpen(false)}>Annuler</Button><Button onClick={handleSaveGrade}>Enregistrer</Button></>}>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Date</label>
                        <input type="date" name="date" value={currentGrade?.date || ''} onChange={handleGradeFormChange} className="w-full p-2 mt-1 border rounded-md focus:ring-royal-blue focus:border-royal-blue"/>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Matière</label>
                        <input type="text" name="matiere" value={currentGrade?.matiere || ''} onChange={handleGradeFormChange} className="w-full p-2 mt-1 border rounded-md focus:ring-royal-blue focus:border-royal-blue"/>
                    </div>
                    <div className="flex space-x-2">
                        <div className="w-1/2">
                            <label className="block text-sm font-medium text-gray-700">Note</label>
                            <input type="number" name="note" value={currentGrade?.note ?? ''} onChange={handleGradeFormChange} className="w-full p-2 mt-1 border rounded-md focus:ring-royal-blue focus:border-royal-blue"/>
                        </div>
                        <div className="w-1/2">
                            <label className="block text-sm font-medium text-gray-700">Coefficient</label>
                            <input type="number" name="coefficient" value={currentGrade?.coefficient ?? ''} onChange={handleGradeFormChange} className="w-full p-2 mt-1 border rounded-md focus:ring-royal-blue focus:border-royal-blue"/>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Période</label>
                        <select name="periode" value={currentGrade?.periode || 'Trimestre 1'} onChange={handleGradeFormChange} className="w-full p-2 mt-1 border rounded-md focus:ring-royal-blue focus:border-royal-blue">
                            <option>Trimestre 1</option><option>Trimestre 2</option><option>Trimestre 3</option>
                        </select>
                    </div>
                </div>
            </Modal>

             <Modal isOpen={isAttendanceModalOpen} onClose={() => setIsAttendanceModalOpen(false)} title={currentAttendance?.id ? "Modifier l'entrée" : "Ajouter une entrée"}
                footer={<><Button variant="ghost" onClick={() => setIsAttendanceModalOpen(false)}>Annuler</Button><Button onClick={handleSaveAttendance}>Enregistrer</Button></>}>
                <div className="space-y-4">
                     <div>
                        <label className="block text-sm font-medium text-gray-700">Date</label>
                        <input type="date" name="date" value={currentAttendance?.date || ''} onChange={handleAttendanceFormChange} className="w-full p-2 mt-1 border rounded-md focus:ring-royal-blue focus:border-royal-blue"/>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Statut</label>
                        <select name="statut" value={currentAttendance?.statut || ''} onChange={handleAttendanceFormChange} className="w-full p-2 mt-1 border rounded-md focus:ring-royal-blue focus:border-royal-blue">
                            {Object.values(AttendanceStatus).map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700">Justification (optionnel)</label>
                        <input type="text" name="justification" value={currentAttendance?.justification || ''} onChange={handleAttendanceFormChange} className="w-full p-2 mt-1 border rounded-md focus:ring-royal-blue focus:border-royal-blue"/>
                    </div>
                </div>
            </Modal>
            
            <Modal isOpen={isDeleteConfirmOpen} onClose={() => setIsDeleteConfirmOpen(false)} title="Confirmer la suppression"
                footer={<><Button variant="ghost" onClick={() => setIsDeleteConfirmOpen(false)}>Annuler</Button><Button variant="danger" onClick={confirmDelete}>Supprimer</Button></>}>
                <p>Êtes-vous sûr de vouloir supprimer cet élément ? Cette action est irréversible.</p>
            </Modal>

            {isPrintViewOpen && selectedStudent && (
                 <PrintableStudentFile
                    student={selectedStudent}
                    parent={parents.find(p => p.id === selectedStudent.parentId)}
                    grades={filteredGrades}
                    attendance={filteredAttendance}
                    observations={observations.filter(o => o.studentId === selectedStudent.id)}
                    onClose={() => setIsPrintViewOpen(false)}
                />
            )}
        </Card>
    );
};

export default SuiviManagement;