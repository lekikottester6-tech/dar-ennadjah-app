import React from 'react';

interface EmptyStateProps {
    icon: React.ReactNode;
    title: string;
    message: string;
}

const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, message }) => {
    return (
        <div className="text-center py-10 px-6 bg-slate-50 rounded-lg">
            <div className="flex items-center justify-center h-16 w-16 bg-royal-blue/10 rounded-full mx-auto mb-4">
                <span className="w-8 h-8 text-royal-blue">
                    {icon}
                </span>
            </div>
            <h3 className="text-lg font-semibold text-slate-800">{title}</h3>
            <p className="mt-1 text-sm text-slate-500">{message}</p>
        </div>
    );
};

export default EmptyState;
