import React, { useState, useMemo, useEffect } from 'react';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import { Student, TimeTableEntry } from '../../types';
import * as api from '../../api';
import PlusIcon from '../../components/icons/PlusIcon';
import PencilIcon from '../../components/icons/PencilIcon';
import TrashIcon from '../../components/icons/TrashIcon';

interface TimetableManagementProps {
    timetable: TimeTableEntry[];
    onUpdateTimetable: (timetable: TimeTableEntry[], classe: string) => void;
}

const TimetableManagement: React.FC<TimetableManagementProps> = ({ timetable, onUpdateTimetable }) => {
    const [students, setStudents] = useState<Student[]>([]);
    const [loadingStudents, setLoadingStudents] = useState(true);
    const [selectedClass, setSelectedClass] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentEntry, setCurrentEntry] = useState<Partial<TimeTableEntry> | null>(null);

    useEffect(() => {
        const fetchStudents = async () => {
            setLoadingStudents(true);
            try {
                const studentsData = await api.getStudents();
                setStudents(studentsData);
            } catch (error) {
                console.error("Failed to fetch students for timetable:", error);
            } finally {
                setLoadingStudents(false);
            }
        };
        fetchStudents();
    }, []);

    const availableClasses = useMemo(() => {
        const classMap = new Map<string, string>();
        students.forEach(s => {
            if (s.classe && s.classe.trim()) {
                const trimmedClass = s.classe.trim();
                const normalizedClass = trimmedClass.toLowerCase();
                if (!classMap.has(normalizedClass)) {
                    classMap.set(normalizedClass, trimmedClass);
                }
            }
        });
        return Array.from(classMap.values()).sort();
    }, [students]);

    const handleAdd = () => {
        if (!selectedClass) return;
        setCurrentEntry({ classe: selectedClass, day: 'Lundi', time: '', subject: '', teacher: '' });
        setIsModalOpen(true);
    };

    const handleEdit = (entry: TimeTableEntry) => {
        setCurrentEntry(entry);
        setIsModalOpen(true);
    };

    const handleDelete = (id: number) => {
        if (!selectedClass) return;
        const normalizedSelectedClass = selectedClass.trim().toLowerCase();
        const updatedClassTimetable = timetable.filter(entry => 
            entry.classe.trim().toLowerCase() === normalizedSelectedClass && entry.id !== id
        );
        onUpdateTimetable(updatedClassTimetable, selectedClass);
    };

    const handleSave = () => {
        if (!currentEntry || !selectedClass) return;

        const normalizedSelectedClass = selectedClass.trim().toLowerCase();
        const currentClassTimetable = timetable.filter(entry =>
            entry.classe && entry.classe.trim().toLowerCase() === normalizedSelectedClass
        );

        let newTimetableForClass: TimeTableEntry[];

        if (currentEntry.id) { // Editing
            newTimetableForClass = currentClassTimetable.map(entry =>
                entry.id === currentEntry.id ? (currentEntry as TimeTableEntry) : entry
            );
        } else { // Adding
            const newEntry = {
                id: Date.now(), // Temporary ID
                ...currentEntry,
            } as TimeTableEntry;
            newTimetableForClass = [...currentClassTimetable, newEntry];
        }

        const normalizedTimetable = newTimetableForClass.map(entry => ({...entry, classe: selectedClass}));

        onUpdateTimetable(normalizedTimetable, selectedClass);
        setIsModalOpen(false);
        setCurrentEntry(null);
    };

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        if (currentEntry) {
            setCurrentEntry({ ...currentEntry, [e.target.name]: e.target.value });
        }
    };

    const classTimetable = useMemo(() => {
        if (!selectedClass) return [];
        const normalizedSelectedClass = selectedClass.trim().toLowerCase();
        return timetable.filter(entry => entry.classe && entry.classe.trim().toLowerCase() === normalizedSelectedClass);
    }, [timetable, selectedClass]);


    return (
        <Card title="Gestion des Emplois du Temps">
            <div className="mb-6 flex justify-between items-center">
                <div>
                    <label htmlFor="class-select" className="block text-sm font-medium text-gray-700 mb-2">
                        Sélectionner une classe
                    </label>
                    <select
                        id="class-select"
                        className="mt-1 block pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-royal-blue focus:border-royal-blue sm:text-sm rounded-md"
                        onChange={(e) => setSelectedClass(e.target.value)}
                        value={selectedClass ?? ''}
                        disabled={loadingStudents}
                    >
                        <option value="" disabled>-- Choisir une classe --</option>
                        {availableClasses.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>
                {selectedClass && (
                    <Button onClick={handleAdd}>
                        <PlusIcon className="w-4 h-4 mr-2" />
                        Ajouter une entrée
                    </Button>
                )}
            </div>

            {selectedClass ? (
                <div className="overflow-x-auto">
                    <table className="min-w-full bg-white divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Jour</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Heure</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Matière</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Professeur</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {classTimetable.length > 0 ? classTimetable.map(entry => (
                                <tr key={entry.id}>
                                    <td className="px-6 py-4 whitespace-nowrap">{entry.day}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">{entry.time}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">{entry.subject}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">{entry.teacher}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                                        <Button size="sm" variant="ghost" onClick={() => handleEdit(entry)}><PencilIcon/></Button>
                                        <Button size="sm" variant="ghost" className="text-red-600 hover:bg-red-100" onClick={() => handleDelete(entry.id)}><TrashIcon/></Button>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={5} className="text-center py-10 text-gray-500">Aucune entrée pour cette classe.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="text-center py-10 text-gray-500">
                    <p>{loadingStudents ? "Chargement..." : "Veuillez sélectionner une classe pour gérer son emploi du temps."}</p>
                </div>
            )}

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={currentEntry?.id ? "Modifier l'entrée" : "Ajouter une entrée"}
                footer={
                    <>
                        <Button variant="secondary" onClick={() => setIsModalOpen(false)}>Annuler</Button>
                        <Button onClick={handleSave}>Enregistrer</Button>
                    </>
                }
            >
                {currentEntry && (
                    <div className="space-y-4">
                        <div>
                            <label>Jour</label>
                            <select name="day" value={currentEntry.day} onChange={handleFormChange} className="w-full p-2 mt-1 border rounded-md">
                                <option>Lundi</option>
                                <option>Mardi</option>
                                <option>Mercredi</option>
                                <option>Jeudi</option>
                                <option>Vendredi</option>
                            </select>
                        </div>
                        <div><label>Heure</label><input type="text" name="time" value={currentEntry.time || ''} onChange={handleFormChange} className="w-full p-2 mt-1 border rounded-md" placeholder="ex: 09:00 - 10:30"/></div>
                        <div><label>Matière</label><input type="text" name="subject" value={currentEntry.subject || ''} onChange={handleFormChange} className="w-full p-2 mt-1 border rounded-md"/></div>
                        <div><label>Professeur</label><input type="text" name="teacher" value={currentEntry.teacher || ''} onChange={handleFormChange} className="w-full p-2 mt-1 border rounded-md"/></div>
                    </div>
                )}
            </Modal>
        </Card>
    );
};

export default TimetableManagement;