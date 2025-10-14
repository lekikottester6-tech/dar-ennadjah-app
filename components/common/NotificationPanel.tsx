import React from 'react';
import { Notification } from '../../types';
import Button from './Button';

interface NotificationPanelProps {
  notifications: Notification[];
  onNotificationClick: (notification: Notification) => void;
  onMarkAllAsRead: () => void;
  onClose: () => void;
}

function timeSince(dateString: string) {
    const date = new Date(dateString);
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  
    let interval = seconds / 31536000;
    if (interval > 1) {
      return "il y a " + Math.floor(interval) + " ans";
    }
    interval = seconds / 2592000;
    if (interval > 1) {
      return "il y a " + Math.floor(interval) + " mois";
    }
    interval = seconds / 86400;
    if (interval > 1) {
      return "il y a " + Math.floor(interval) + " jours";
    }
    interval = seconds / 3600;
    if (interval > 1) {
      return "il y a " + Math.floor(interval) + " heures";
    }
    interval = seconds / 60;
    if (interval > 1) {
      return "il y a " + Math.floor(interval) + " minutes";
    }
    return "à l'instant";
}
  

const NotificationPanel: React.FC<NotificationPanelProps> = ({ notifications, onNotificationClick, onMarkAllAsRead }) => {
  return (
    <div className="absolute top-full right-0 mt-2 w-80 sm:w-96 bg-white rounded-lg shadow-2xl border z-20">
      <div className="p-4 border-b flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-800">Notifications</h3>
        <Button size="sm" variant="ghost" onClick={onMarkAllAsRead}>
          Tout marquer comme lu
        </Button>
      </div>
      <div className="max-h-96 overflow-y-auto">
        {notifications.length === 0 ? (
          <p className="p-6 text-center text-gray-500">Vous n'avez aucune notification.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {notifications.map(notif => (
              <li
                key={notif.id}
                onClick={() => onNotificationClick(notif)}
                className={`p-4 hover:bg-slate-50 cursor-pointer ${!notif.read ? 'bg-blue-50' : ''}`}
              >
                <div className="flex items-start space-x-3">
                    {!notif.read && <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 flex-shrink-0"></div>}
                    <div className={notif.read ? 'pl-5' : ''}>
                        <p className="text-sm text-gray-700">{notif.message}</p>
                        <p className="text-xs text-gray-400 mt-1">{timeSince(notif.timestamp)}</p>
                    </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default NotificationPanel;