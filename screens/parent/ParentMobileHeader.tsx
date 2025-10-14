import React from 'react';
import { User, Student } from '../../types';
import UserIcon from '../../components/icons/UserIcon';
import BellIcon from '../../components/icons/BellIcon';

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
            {selectedStudent && (
                 <div className="bg-white/20 rounded-lg p-3">
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
                     {students.length > 1 && (
                      <div className="mt-3">
                           <select 
                                value={selectedStudentId ?? ''}
                                onChange={(e) => setSelectedStudentId(Number(e.target.value))}
                                className="w-full text-sm border-slate-300 rounded-md shadow-sm focus:ring-royal-blue focus:border-royal-blue text-slate-800"
                                aria-label="Changer d'enfant"
                           >
                               {students.map(s => (
                                   <option key={s.id} value={s.id}>
                                       {s.prenom} {s.nom}
                                   </option>
                               ))}
                           </select>
                      </div>
                    )}
                 </div>
            )}
        </header>
    );
};
export default ParentMobileHeader;