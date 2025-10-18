import React from 'react';
import { User, Student } from '../../types';
import UserIcon from '../../components/icons/UserIcon';
import BellIcon from '../../components/icons/BellIcon';
import CheckCircleIcon from '../../components/icons/CheckCircleIcon';

interface ParentMobileHeaderProps {
    currentUser: User;
    students: Student[];
    selectedStudent: Student | null;
    selectedStudentId: number | null;
    setSelectedStudentId: (id: number) => void;
    unreadCount: number;
    onBellClick: () => void;
}

const ParentMobileHeader: React.FC<ParentMobileHeaderProps> = ({
    currentUser,
    students,
    selectedStudent,
    selectedStudentId,
    setSelectedStudentId,
    unreadCount,
    onBellClick,
}) => {
    return (
        <header className="sticky top-0 bg-header-gradient z-20 p-4 text-white rounded-b-2xl shadow-lg">
            <div className="flex justify-between items-center mb-4">
                <div>
                     <h1 className="text-2xl font-bold">Bonjour, {currentUser.nom.split(' ')[0]}</h1>
                     <p className="text-sm text-white/80">Bienvenue sur votre espace.</p>
                </div>
                 <button
                    onClick={onBellClick}
                    className="relative p-2 text-accent-yellow rounded-full hover:bg-white/20 focus:outline-none"
                    aria-label={`Vous avez ${unreadCount} notifications non lues`}
                    >
                    <BellIcon className="h-7 w-7" />
                    {unreadCount > 0 && (
                        <span className="absolute top-1 right-1 flex items-center justify-center h-5 min-w-[1.25rem] px-1 text-xs font-bold text-white bg-red-600 rounded-full ring-2 ring-white">
                        {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                    )}
                </button>
            </div>
            {students.length > 1 ? (
                <div className="mt-4">
                    <p className="text-sm font-semibold text-white/90 mb-3 px-1">Vos enfants :</p>
                    <div className="flex space-x-4 overflow-x-auto pb-2 -mx-4 px-4 custom-scrollbar-hide">
                        {students.map(student => (
                            <button 
                                key={student.id} 
                                onClick={() => setSelectedStudentId(student.id)}
                                className={`flex-shrink-0 flex flex-col items-center space-y-2 text-center transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-royal-blue focus:ring-accent-yellow rounded-lg p-1 ${selectedStudentId === student.id ? 'opacity-100' : 'opacity-70 hover:opacity-100'}`}
                            >
                                <div className={`relative h-16 w-16 rounded-full border-2 transition-colors duration-200 ${selectedStudentId === student.id ? 'border-accent-yellow' : 'border-white/50'}`}>
                                    {student.photoUrl ? (
                                        <img src={student.photoUrl} alt={student.prenom} className="h-full w-full rounded-full object-cover" />
                                    ) : (
                                        <div className="h-full w-full rounded-full bg-slate-200 flex items-center justify-center">
                                            <UserIcon className="h-8 w-8 text-slate-400" />
                                        </div>
                                    )}
                                    {selectedStudentId === student.id && (
                                        <div className="absolute -bottom-1 -right-1 h-6 w-6 bg-accent-yellow rounded-full border-2 border-royal-blue flex items-center justify-center">
                                            <CheckCircleIcon className="w-4 h-4 text-black" />
                                        </div>
                                    )}
                                </div>
                                <span className={`text-xs font-semibold ${selectedStudentId === student.id ? 'text-accent-yellow' : 'text-white'}`}>{student.prenom}</span>
                            </button>
                        ))}
                    </div>
                </div>
            ) : selectedStudent && (
                 <div className="mt-4 bg-white/20 rounded-lg p-3">
                    <div className="flex items-center space-x-3">
                        {selectedStudent.photoUrl ? (
                            <img src={selectedStudent.photoUrl} alt={`Photo de ${selectedStudent.prenom}`} className="h-12 w-12 rounded-full object-cover border-2 border-white"/>
                        ) : (
                            <div className="h-12 w-12 rounded-full bg-slate-200 flex items-center justify-center border-2 border-white">
                                <UserIcon className="h-6 w-6 text-slate-400"/>
                            </div>
                        )}
                        <div>
                             <p className="text-base font-semibold">{selectedStudent.prenom} {selectedStudent.nom}</p>
                             <p className="text-xs text-white/80">{selectedStudent.niveauScolaire} - {selectedStudent.classe}</p>
                        </div>
                    </div>
                 </div>
            )}
        </header>
    );
};
export default ParentMobileHeader;