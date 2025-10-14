import React, { useState, useMemo } from 'react';
import { Student, User } from '../../types';
import Card from '../../components/common/Card';
import UserIcon from '../../components/icons/UserIcon';
import PhoneIcon from '../../components/icons/PhoneIcon';

interface ClassViewProps {
    students: Student[];
    parents: User[];
}

const ClassView: React.FC<ClassViewProps> = ({ students, parents }) => {
    const [selectedClass, setSelectedClass] = useState<string | null>(null);

    const availableClasses = useMemo(() => {
        const classMap = new Map<string, string>();
        students
            .filter(s => !s.isArchived)
            .forEach(s => {
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

    const studentsInClass = useMemo(() => {
        if (!selectedClass) return [];
        const normalizedSelectedClass = selectedClass.toLowerCase();
        return students.filter(s => s.classe.trim().toLowerCase() === normalizedSelectedClass && !s.isArchived);
    }, [students, selectedClass]);

    return (
        <div>
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-royal-blue">Élèves par Classe</h2>
                <div className="mt-2 w-12 h-1 bg-accent-yellow rounded-full"></div>
            </div>

            <Card className="mb-6">
                <label htmlFor="class-select-view" className="block text-sm font-medium text-gray-700 mb-2">
                    Sélectionner une classe
                </label>
                <select
                    id="class-select-view"
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-royal-blue focus:border-royal-blue sm:text-sm rounded-md"
                    onChange={(e) => setSelectedClass(e.target.value || null)}
                    value={selectedClass ?? ''}
                >
                    <option value="">-- Choisir une classe --</option>
                    {availableClasses.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
            </Card>

            {selectedClass ? (
                <Card>
                    <h3 className="text-xl font-semibold text-royal-blue mb-4">Élèves en {selectedClass} ({studentsInClass.length})</h3>
                    {studentsInClass.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {studentsInClass.map(student => {
                                const parent = parents.find(p => p.id === student.parentId);
                                return (
                                    <div key={student.id} className="bg-slate-50 p-4 rounded-lg border flex items-center space-x-4">
                                        <div className="flex-shrink-0 h-14 w-14">
                                            {student.photoUrl ? (
                                                <img className="h-14 w-14 rounded-full object-cover" src={student.photoUrl} alt={`Photo de ${student.prenom}`} />
                                            ) : (
                                                <span className="h-14 w-14 rounded-full bg-gray-100 flex items-center justify-center">
                                                   <UserIcon className="h-8 w-8 text-gray-400" />
                                                </span>
                                            )}
                                        </div>
                                        <div>
                                            <p className="text-base font-bold text-gray-900">{student.prenom} {student.nom}</p>
                                            <div className="mt-1 text-sm text-gray-600">
                                                <p><span className="font-medium text-gray-500">Parent:</span> {parent?.nom || 'N/A'}</p>
                                                <div className="flex items-center space-x-1.5 mt-0.5">
                                                    <PhoneIcon className="w-3.5 h-3.5 text-gray-400"/>
                                                    {parent?.telephone ? (
                                                        <a href={`tel:${parent.telephone.replace(/\s/g, '')}`} className="text-royal-blue hover:underline">
                                                            {parent.telephone}
                                                        </a>
                                                    ) : (
                                                        <span>Non renseigné</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <p className="text-center text-gray-500 py-6">Aucun élève actif trouvé pour cette classe.</p>
                    )}
                </Card>
            ) : (
                <div className="text-center py-10 text-gray-500 bg-white rounded-lg shadow-sm">
                    <p>Veuillez sélectionner une classe pour afficher la liste des élèves.</p>
                </div>
            )}
        </div>
    );
};

export default ClassView;