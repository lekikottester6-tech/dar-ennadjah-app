import React from 'react';
import BellIcon from '../../components/icons/BellIcon';

interface AdminMobileHeaderProps {
    unreadCount: number;
    onBellClick: () => void;
}

const AdminMobileHeader: React.FC<AdminMobileHeaderProps> = ({ unreadCount, onBellClick }) => {
    return (
         <header className="sticky top-0 bg-royal-blue z-20 p-4 text-white rounded-b-2xl shadow-lg">
            <div className="flex justify-between items-center">
                <div>
                     <h1 className="text-2xl font-bold">Espace Admin</h1>
                     <p className="text-sm text-white/80">Panneau de contrôle</p>
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
        </header>
    );
};

export default AdminMobileHeader;