import React, { useState } from 'react';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import PlusIcon from '../../components/icons/PlusIcon';
import PencilIcon from '../../components/icons/PencilIcon';
import TrashIcon from '../../components/icons/TrashIcon';
import { Event } from '../../types';

interface EventManagementProps {
    events: Event[];
    onAdd: (event: Omit<Event, 'id'>) => Promise<void>;
    onUpdate: (event: Event) => Promise<void>;
    onDelete: (id: number) => Promise<void>;
}

const InputField: React.FC<{
    name: keyof Omit<Event, 'id'>;
    label: string;
    type?: string;
    component?: 'input' | 'textarea';
    currentEvent: Partial<Event> | null;
    handleFormChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
    formErrors: { [key: string]: string };
}> = ({ name, label, type = 'text', component = 'input', currentEvent, handleFormChange, formErrors }) => {
    const commonProps = {
        id: name,
        name: name,
        value: currentEvent?.[name] as string || '',
        onChange: handleFormChange,
        className: `mt-1 block w-full px-3 py-2 border ${formErrors[name] ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`,
    };
    return (
        <div>
            <label htmlFor={name} className="block text-sm font-medium text-gray-700">{label}</label>
            {component === 'input' ? (
                <input type={type} {...commonProps} />
            ) : (
                <textarea {...commonProps} rows={3}></textarea>
            )}
            {formErrors[name] && <p className="mt-1 text-xs text-red-500">{formErrors[name]}</p>}
        </div>
    );
};

const EventManagement: React.FC<EventManagementProps> = ({ events, onAdd, onUpdate, onDelete }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const [currentEvent, setCurrentEvent] = useState<Partial<Event> | null>(null);
    const [eventToDelete, setEventToDelete] = useState<number | null>(null);
    const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});

    const handleAdd = () => {
        setCurrentEvent({ title: '', description: '', event_date: '' });
        setFormErrors({});
        setIsModalOpen(true);
    };

    const handleEdit = (event: Event) => {
        setCurrentEvent(event);
        setFormErrors({});
        setIsModalOpen(true);
    };

    const handleDelete = (id: number) => {
        setEventToDelete(id);
        setIsDeleteConfirmOpen(true);
    };

    const confirmDelete = async () => {
        if (eventToDelete !== null) {
            await onDelete(eventToDelete);
            setIsDeleteConfirmOpen(false);
            setEventToDelete(null);
        }
    };

    const validateForm = (): boolean => {
        const errors: { [key: string]: string } = {};
        if (!currentEvent?.title?.trim()) errors.title = "Le titre est requis.";
        if (!currentEvent?.description?.trim()) errors.description = "La description est requise.";
        if (!currentEvent?.event_date?.trim()) errors.event_date = "La date est requise.";
        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSave = async () => {
        if (!validateForm() || !currentEvent) return;

        if (currentEvent.id) {
            await onUpdate(currentEvent as Event);
        } else {
            await onAdd(currentEvent as Omit<Event, 'id'>);
        }
        setIsModalOpen(false);
        setCurrentEvent(null);
    };
    
    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        if (currentEvent) {
            setCurrentEvent({ ...currentEvent, [e.target.name]: e.target.value });
        }
    };
    
    return (
        <Card title="Gestion des Événements">
            <div className="mb-4 text-right">
                <Button onClick={handleAdd}>
                    <PlusIcon className="w-4 h-4 mr-2" />
                    Ajouter un événement
                </Button>
            </div>
            <div className="overflow-x-auto">
                <table className="min-w-full bg-white divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Titre</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {events.map(event => (
                            <tr key={event.id} className="even:bg-slate-50">
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{event.title}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{event.event_date}</td>
                                <td className="px-6 py-4 whitespace-normal text-sm text-gray-500 max-w-xs truncate">{event.description}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                                    <Button size="sm" variant="ghost" onClick={() => handleEdit(event)} aria-label={`Modifier ${event.title}`}><PencilIcon/></Button>
                                    <Button size="sm" variant="ghost" className="text-red-600 hover:bg-red-100" onClick={() => handleDelete(event.id)} aria-label={`Supprimer ${event.title}`}><TrashIcon/></Button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <Modal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)} 
                title={currentEvent?.id ? "Modifier l'événement" : "Ajouter un événement"}
                footer={
                    <>
                        <Button variant="secondary" onClick={() => setIsModalOpen(false)}>Annuler</Button>
                        <Button onClick={handleSave}>Enregistrer</Button>
                    </>
                }
            >
                <div className="space-y-4">
                    <InputField name="title" label="Titre" currentEvent={currentEvent} handleFormChange={handleFormChange} formErrors={formErrors} />
                    <InputField name="event_date" label="Date" type="date" currentEvent={currentEvent} handleFormChange={handleFormChange} formErrors={formErrors} />
                    <InputField name="description" label="Description" component="textarea" currentEvent={currentEvent} handleFormChange={handleFormChange} formErrors={formErrors} />
                </div>
            </Modal>
            
            <Modal 
                isOpen={isDeleteConfirmOpen} 
                onClose={() => setIsDeleteConfirmOpen(false)} 
                title="Confirmer la suppression"
                footer={
                    <>
                        <Button variant="secondary" onClick={() => setIsDeleteConfirmOpen(false)}>Annuler</Button>
                        <Button variant="danger" onClick={confirmDelete}>Supprimer</Button>
                    </>
                }
            >
                <p>Êtes-vous sûr de vouloir supprimer cet événement ? Cette action est irréversible.</p>
            </Modal>
        </Card>
    );
};

export default EventManagement;