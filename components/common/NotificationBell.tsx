import React from 'react';
import BellIcon from '../icons/BellIcon';

interface NotificationBellProps {
  unreadCount: number;
  onClick: () => void;
}

const NotificationBell: React.FC<NotificationBellProps> = ({ unreadCount, onClick }) => {
  return (
    <button
      onClick={onClick}
      className="relative p-2 text-slate-500 rounded-full hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-royal-blue"
      aria-label={`Vous avez ${unreadCount} notifications non lues`}
    >
      <BellIcon className="h-7 w-7" />
      {unreadCount > 0 && (
        <span className="absolute top-1 right-1 flex items-center justify-center h-5 min-w-[1.25rem] px-1 text-xs font-bold text-white bg-red-600 rounded-full ring-2 ring-white">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </button>
  );
};

export default NotificationBell;