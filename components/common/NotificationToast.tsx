import React from 'react';
import { Notification } from '../../types';
import CheckCircleIcon from '../icons/CheckCircleIcon';
import XCircleIcon from '../icons/XCircleIcon';
import InformationCircleIcon from '../icons/InformationCircleIcon';
import XIcon from '../icons/XIcon';

interface NotificationToastProps {
    notification: Omit<Notification, 'userId' | 'read' | 'timestamp' | 'link'>;
    onDismiss: () => void;
}

const icons = {
    success: <CheckCircleIcon className="h-6 w-6 text-green-400" aria-hidden="true" />,
    error: <XCircleIcon className="h-6 w-6 text-red-400" aria-hidden="true" />,
    info: <InformationCircleIcon className="h-6 w-6 text-royal-blue" aria-hidden="true" />,
};

const NotificationToast: React.FC<NotificationToastProps> = ({ notification, onDismiss }) => {
    const icon = icons[notification.type];

    return (
        <div className="max-w-sm w-full bg-white shadow-lg rounded-lg pointer-events-auto ring-1 ring-black ring-opacity-5 overflow-hidden">
            <div className="p-4">
                <div className="flex items-start">
                    <div className="flex-shrink-0">{icon}</div>
                    <div className="ml-3 w-0 flex-1 pt-0.5">
                        <p className="text-sm font-medium text-gray-900">Notification</p>
                        <p className="mt-1 text-sm text-gray-500">{notification.message}</p>
                    </div>
                    <div className="ml-4 flex-shrink-0 flex">
                        <button
                            type="button"
                            onClick={onDismiss}
                            className="bg-white rounded-md inline-flex text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-royal-blue"
                        >
                            <span className="sr-only">Fermer</span>
                            <XIcon className="h-5 w-5" aria-hidden="true" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NotificationToast;
