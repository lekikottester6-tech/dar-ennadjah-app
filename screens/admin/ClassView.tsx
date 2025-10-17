import React, { useState, useMemo } from 'react';
import { Student, User, Teacher } from '../../types';
import Card from '../../components/common/Card';
import UserIcon from '../../components/icons/UserIcon';
import PhoneIcon from '../../components/icons/PhoneIcon';
import PhoneOutgoingIcon from '../../components/icons/PhoneOutgoingIcon';
import BookOpenIcon from '../../components/icons/BookOpenIcon';
import SearchIcon from '../../components/icons/SearchIcon';

interface ClassViewProps {
    students: Student[];
    parents: User[];
    teachers: Teacher[];
}

const ClassView: React.FC<ClassViewProps> = ({ students, parents, teachers }) => {
    const [searchQuery, setSearchQuery] = useState('');
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
    
    const filteredClasses = useMemo(() => {
        if (!searchQuery) return [];
        return availableClasses.filter(c => c.toLowerCase().includes(searchQuery.toLowerCase()));
    }, [availableClasses, searchQuery]);

    const studentsInClass = useMemo(() => {
        if (!selectedClass) return [];
        const normalizedSelected = String(selectedClass || '').trim().toLowerCase();
        if (!normalizedSelected) return [];

        return students.filter(s => {
            const studentClass = String(s.classe || '').trim().toLowerCase();
            return studentClass === normalizedSelected && !s.isArchived;
        });
    }, [students, selectedClass]);
    
    const teachersInClass = useMemo(() => {
        if (!selectedClass) return [];
        const normalizedSelected = String(selectedClass || '').trim().toLowerCase();
        if (!normalizedSelected) return [];
    
        return teachers.filter(teacher => {
            const assignedClasses = teacher.classes || [];
            
            if (assignedClasses.length === 0) {
                return false;
            }
    
            return assignedClasses.some(c => {
                const teacherClass = String(c || '').trim().toLowerCase();
                return teacherClass === normalizedSelected;
            });
        });
    }, [teachers, selectedClass]);


    const handleSelectClass = (className: string) => {
        setSelectedClass(className);
        setSearchQuery('');
    };

    return (
        <div>
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-royal-blue">Recherche par Classe</h2>
                <div className="mt-2 w-12 h-1 bg-accent-yellow rounded-full"></div>
            </div>

            <Card className="mb-6">
                <label htmlFor="class-search-view" className="block text-sm font-medium text-gray-700 mb-2">
                    Rechercher une classe
                </label>
                <div className="relative">
                     <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                        <SearchIcon className="h-5 w-5 text-gray-400" />
                    </span>
                    <input
                        id="class-search-view"
                        type="text"
                        placeholder="Tapez un nom de classe..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-royal-blue"
                    />
                    {searchQuery && filteredClasses.length > 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg">
                            {filteredClasses.map(c => (
                                <button
                                    key={c}
                                    onClick={() => handleSelectClass(c)}
                                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                >
                                    {c}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </Card>

            {selectedClass ? (
                <div className="space-y-6 fade-in">
                    <div className="bg-white p-4 rounded-lg shadow-sm border">
                        <h3 className="text-xl font-semibold text-slate-800">
                            Classe : <span className="text-royal-blue">{selectedClass}</span>
                        </h3>
                    </div>

                    <Card>
                        <h3 className="text-xl font-semibold text-royal-blue mb-4">Enseignants en {selectedClass} ({teachersInClass.length})</h3>
                        {teachersInClass.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {teachersInClass.map(teacher => (
                                    <div key={teacher.id} className="bg-slate-50 p-4 rounded-lg border flex items-center space-x-4">
                                         <div className="flex-shrink-0 h-14 w-14">
                                            {teacher.photoUrl ? (
                                                <img className="h-14 w-14 rounded-full object-cover" src={teacher.photoUrl} alt={`Photo de ${teacher.prenom}`} />
                                            ) : (
                                                <span className="h-14 w-14 rounded-full bg-gray-100 flex items-center justify-center">
                                                   <UserIcon className="h-8 w-8 text-gray-400" />
                                                </span>
                                            )}
                                        </div>
                                        <div>
                                             <p className="text-base font-bold text-gray-900">{teacher.prenom} {teacher.nom}</p>
                                             <div className="flex items-center space-x-1.5 mt-1 text-sm text-gray-600">
                                                <BookOpenIcon className="w-4 h-4 text-gray-400" />
                                                <span>{teacher.matiere}</span>
                                             </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                             <p className="text-center text-gray-500 py-6">Aucun enseignant trouvé pour cette classe.</p>
                        )}
                    </Card>
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
                                                            <div className="flex items-center space-x-2">
                                                                <a href={`tel:${parent.telephone.replace(/\s/g, '')}`} className="text-royal-blue hover:underline">
                                                                    {parent.telephone}
                                                                </a>
                                                                 <a href={`tel:${parent.telephone.replace(/\s/g, '')}`} className="p-1 rounded-full text-green-600 hover:bg-green-100 transition-colors" aria-label={`Appeler ${parent.nom}`}>
                                                                    <PhoneOutgoingIcon className="h-4 w-4" />
                                                                </a>
                                                            </div>
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
                </div>
            ) : (
                <div className="text-center py-10 text-gray-500 bg-white rounded-lg shadow-sm">
                    <p>Veuillez rechercher et sélectionner une classe pour afficher les détails.</p>
                </div>
            )}
        </div>
    );
};

export default ClassView;
