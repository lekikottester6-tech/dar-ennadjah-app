
import React from 'react';
import Card from '../../components/common/Card';
import UserIcon from '../../components/icons/UserIcon';
import DatabaseIcon from '../../components/icons/DatabaseIcon';
import BellIcon from '../../components/icons/BellIcon';
import ArrowRightIcon from '../../components/icons/ArrowRightIcon';

const FlowStep: React.FC<{ icon: React.ReactNode; title: string; description: string }> = ({ icon, title, description }) => (
    <div className="flex flex-col items-center text-center max-w-xs mx-auto">
        <div className="bg-blue-100 text-blue-600 rounded-full p-4 mb-4">
            {icon}
        </div>
        <h3 className="text-lg font-semibold text-gray-800 mb-2">{title}</h3>
        <p className="text-gray-600 text-sm">{description}</p>
    </div>
);

const ArrowConnector: React.FC = () => (
    <div className="flex-1 flex items-center justify-center text-gray-300 my-4 lg:my-0">
        <ArrowRightIcon className="w-8 h-8 transform rotate-90 lg:rotate-0" />
    </div>
);


const DataFlowExplanation: React.FC = () => {
    return (
        <Card title="Flux de Données : Comment ça marche ?">
            <p className="mb-12 text-center text-gray-600 max-w-3xl mx-auto">
                Voici un aperçu simplifié de la manière dont les informations circulent de l'administration aux parents pour assurer un suivi transparent et en temps réel.
            </p>
            <div className="flex flex-col lg:flex-row items-stretch justify-center lg:space-x-4">
                <FlowStep 
                    icon={<UserIcon className="w-8 h-8"/>} 
                    title="1. Administration" 
                    description="L'admin ajoute ou modifie les notes, absences, et l'emploi du temps." 
                />
                <ArrowConnector />
                <FlowStep 
                    icon={<DatabaseIcon className="w-8 h-8"/>}
                    title="2. Système Central" 
                    description="La donnée est enregistrée et liée au profil de l'élève concerné." 
                />
                <ArrowConnector />
                <FlowStep 
                    icon={<UserIcon className="w-8 h-8"/>}
                    title="3. Espace Parent" 
                    description="L'information est instantanément visible dans l'espace personnel du parent." 
                />
                 <ArrowConnector />
                <FlowStep 
                    icon={<BellIcon className="w-8 h-8"/>}
                    title="4. Notification" 
                    description="Une notification (simulée) est envoyée pour informer le parent de la mise à jour." 
                />
            </div>
        </Card>
    );
};

export default DataFlowExplanation;
