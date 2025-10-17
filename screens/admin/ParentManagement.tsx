import React, { useState, useMemo, useEffect } from 'react';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import PlusIcon from '../../components/icons/PlusIcon';
import PencilIcon from '../../components/icons/PencilIcon';
import TrashIcon from '../../components/icons/TrashIcon';
import SearchIcon from '../../components/icons/SearchIcon';
import KeyIcon from '../../components/icons/KeyIcon';
import { User, Student } from '../../types';
import * as api from '../../api';
import WhatsAppIcon from '../../components/icons/WhatsAppIcon';
import PhoneOutgoingIcon from '../../components/icons/PhoneOutgoingIcon';
import MailIcon from '../../components/icons/MailIcon';

interface ParentManagementProps {
    parents: User[];
    students: Student[];
    onAdd: (parent: Omit<User, 'id' | 'role'>) => Promise<User & { generatedPassword?: string }>;
    onUpdate: (parent: User) => Promise<void>;
    onDelete: (id: number) => Promise<void>;
    onResetPassword: (id: number) => Promise<{ newPassword: string }>;
    initialSearchQuery: string | null;
    addToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const InputField: React.FC<{
    name: keyof Omit<User, 'id' | 'role' | 'password'>;
    label: string;
    type?: string;
    currentParent: Partial<User> | null;
    handleFormChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    formErrors: { [key: string]: string };
}> = ({ name, label, type = 'text', currentParent, handleFormChange, formErrors }) => (
    <div>
        <label htmlFor={name} className="block text-sm font-medium text-gray-700">{label}</label>
        <input
            type={type}
            id={name}
            name={name}
            value={currentParent?.[name] as string || ''}
            onChange={handleFormChange}
            className={`mt-1 block w-full px-3 py-2 border ${formErrors[name] ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-royal-blue focus:border-royal-blue sm:text-sm`}
        />
        {formErrors[name] && <p className="mt-1 text-xs text-red-500">{formErrors[name]}</p>}
    </div>
);


const ParentManagement: React.FC<ParentManagementProps> = ({ parents, students, onAdd, onUpdate, onDelete, onResetPassword, initialSearchQuery, addToast }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const [isResetModalOpen, setIsResetModalOpen] = useState(false);
    const [currentParent, setCurrentParent] = useState<Partial<User> | null>(null);
    const [parentToDelete, setParentToDelete] = useState<number | null>(null);
    const [parentToReset, setParentToReset] = useState<User | null>(null);
    const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});
    const [searchQuery, setSearchQuery] = useState('');
    const [newPassword, setNewPassword] = useState<string | null>(null);
    const [isResetting, setIsResetting] = useState(false);

    useEffect(() => {
        if (initialSearchQuery) {
            setSearchQuery(initialSearchQuery);
        }
    }, [initialSearchQuery]);
    
    const formatWhatsAppNumber = (phone: string | undefined | null): string => {
        if (!phone) return '';
        let formattedPhone = phone.replace(/\s+/g, ''); // remove spaces
        if (formattedPhone.startsWith('0')) {
            formattedPhone = '213' + formattedPhone.substring(1);
        } else if (formattedPhone.startsWith('+')) {
            formattedPhone = formattedPhone.substring(1);
        }
        return formattedPhone;
    };

    const filteredParents = useMemo(() => {
        if (!searchQuery.trim()) {
            return parents;
        }
        const lowercasedQuery = searchQuery.toLowerCase();

        const parentIdsFromClassSearch = new Set(
            students
                .filter(student => student.classe.toLowerCase().includes(lowercasedQuery))
                .map(student => student.parentId)
        );
        
        return parents.filter(parent => 
            parent.nom.toLowerCase().includes(lowercasedQuery) ||
            parent.email.toLowerCase().includes(lowercasedQuery) ||
            parent.telephone?.includes(searchQuery) ||
            parentIdsFromClassSearch.has(parent.id)
        );
    }, [parents, students, searchQuery]);

    const handleAdd = () => {
        setCurrentParent({ nom: '', email: '', telephone: '' });
        setFormErrors({});
        setNewPassword(null);
        setIsModalOpen(true);
    };

    const handleEdit = (parent: User) => {
        setCurrentParent(parent);
        setFormErrors({});
        setNewPassword(null);
        setIsModalOpen(true);
    };

    const handleDelete = (id: number) => {
        setParentToDelete(id);
        setIsDeleteConfirmOpen(true);
    };

    const handleResetPassword = (parent: User) => {
        setParentToReset(parent);
        setNewPassword(null);
        setIsResetModalOpen(true);
    };

    const confirmDelete = async () => {
        if (parentToDelete !== null) {
            await onDelete(parentToDelete);
            setIsDeleteConfirmOpen(false);
            setParentToDelete(null);
        }
    };

    const confirmResetPassword = async () => {
        if (!parentToReset) return;
        setIsResetting(true);
        try {
            const result = await onResetPassword(parentToReset.id);
            setNewPassword(result.newPassword);
        } catch (error) {
            console.error("Failed to reset password", error);
        } finally {
            setIsResetting(false);
        }
    };

    const validateForm = (): boolean => {
        const errors: { [key: string]: string } = {};
        if (!currentParent?.nom?.trim()) errors.nom = "Le nom est requis.";
        
        if (!currentParent?.email?.trim()) {
            errors.email = "L'email est requis.";
        } else if (!/\S+@\S+\.\S+/.test(currentParent.email)) {
            errors.email = "L'adresse email est invalide.";
        } else {
            // Vérifie si l'e-mail est déjà utilisé par un autre parent
            const isDuplicate = parents.some(p => 
                p.email.toLowerCase() === currentParent!.email!.toLowerCase() && p.id !== currentParent!.id
            );
            if (isDuplicate) {
                errors.email = "Cette adresse email est déjà utilisée.";
            }
        }

        if (!currentParent?.telephone?.trim()) errors.telephone = "Le numéro de téléphone est requis.";
        
        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSave = async () => {
        if (!validateForm() || !currentParent) return;

        if (currentParent.id) {
            await onUpdate(currentParent as User);
            closeAllModals();
        } else {
            try {
                const result = await onAdd(currentParent as Omit<User, 'id' | 'role'>);
                if (result && result.generatedPassword) {
                    setCurrentParent(prev => ({ ...prev, id: result.id }));
                    setNewPassword(result.generatedPassword);
                } else {
                    closeAllModals();
                }
            } catch (error: any) {
                if (error.message && error.message.toLowerCase().includes('déjà utilisée')) {
                     setFormErrors(prev => ({...prev, email: "Cette adresse email est déjà utilisée."}));
                } else {
                     console.error("Failed to add parent:", error);
                     addToast(error.message || "Une erreur est survenue lors de l'ajout du parent.", 'error');
                }
            }
        }
    };
    
    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (currentParent) {
            setCurrentParent({ ...currentParent, [e.target.name]: e.target.value });
        }
    };
    
    const handleSendWhatsApp = () => {
        const parent = parentToReset || currentParent;
        if (!parent || !newPassword || !parent.telephone || !parent.nom || !parent.email) {
            addToast("Informations du parent manquantes pour l'envoi WhatsApp.", "error");
            return;
        }
        
        const formattedPhone = formatWhatsAppNumber(parent.telephone);
        
        const message = `Bonjour ${parent.nom},\n\nVoici vos identifiants pour accéder à l'espace parent de Dar Ennadjah :\n\n*Email :* ${parent.email}\n*Mot de passe :* ${newPassword}\n\nCordialement,\nL'administration de Dar Ennadjah`;
        const encodedMessage = encodeURIComponent(message);
        
        const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodedMessage}`;
        
        window.open(whatsappUrl, '_blank');
    };

    const closeAllModals = () => {
        setIsModalOpen(false); setIsDeleteConfirmOpen(false); setIsResetModalOpen(false);
        setCurrentParent(null); setParentToDelete(null); setParentToReset(null);
        setNewPassword(null);
    };

    return (
        <Card title="Gestion des Parents">
            <div className="mb-4 flex flex-col sm:flex-row justify-between items-center gap-4">
                 <div className="relative w-full sm:w-auto">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                        <SearchIcon className="h-5 w-5 text-gray-400" />
                    </span>
                    <input
                        type="text"
                        placeholder="Rechercher par nom, email, classe..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full sm:w-64 pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-royal-blue"
                    />
                </div>
                <Button onClick={handleAdd} className="w-full sm:w-auto">
                    <PlusIcon className="w-4 h-4 mr-2" />
                    Ajouter un parent
                </Button>
            </div>
            <div className="overflow-x-auto">
                <table className="min-w-full bg-white divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nom</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {filteredParents.length > 0 ? filteredParents.map(parent => (
                            <tr key={parent.id} className="even:bg-slate-50">
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{parent.nom}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    <a href={`mailto:${parent.email}`} className="flex items-center space-x-2 text-slate-600 hover:text-royal-blue transition-colors">
                                        <MailIcon className="h-4 w-4 flex-shrink-0" />
                                        <span>{parent.email}</span>
                                    </a>
                                    {parent.telephone ? (
                                        <div className="flex items-center space-x-3 mt-1">
                                            <a href={`tel:${parent.telephone.replace(/\s/g, '')}`} className="flex items-center space-x-2 text-slate-600 hover:text-royal-blue transition-colors">
                                                <PhoneOutgoingIcon className="h-4 w-4 flex-shrink-0" />
                                                <span>{parent.telephone}</span>
                                            </a>
                                            <a 
                                                href={`https://wa.me/${formatWhatsAppNumber(parent.telephone)}`} 
                                                target="_blank" 
                                                rel="noopener noreferrer" 
                                                className="p-1 rounded-full text-green-600 hover:bg-green-100 transition-colors" 
                                                aria-label={`Contacter ${parent.nom} sur WhatsApp`}
                                            >
                                                <WhatsAppIcon className="h-5 w-5" />
                                            </a>
                                        </div>
                                    ) : (
                                        <span className="text-xs text-gray-400 mt-1 block">Pas de numéro</span>
                                    )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-1">
                                    <Button size="sm" variant="ghost" onClick={() => handleEdit(parent)}><PencilIcon/></Button>
                                    <Button size="sm" variant="ghost" onClick={() => handleResetPassword(parent)}><KeyIcon /></Button>
                                    <Button size="sm" variant="ghost" className="text-red-600" onClick={() => handleDelete(parent.id)}><TrashIcon/></Button>
                                </td>
                            </tr>
                        )) : (
                             <tr><td colSpan={3} className="text-center py-10 text-gray-500">Aucun parent trouvé.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            <Modal isOpen={isModalOpen} onClose={closeAllModals} title={newPassword ? "Compte créé" : (currentParent?.id ? "Modifier le parent" : "Ajouter un parent")}
                footer={ newPassword ? <Button onClick={closeAllModals}>Fermer</Button> : <><Button variant="ghost" onClick={closeAllModals}>Annuler</Button><Button onClick={handleSave}>Enregistrer</Button></>}
            >
                {newPassword ? (
                    <div>
                        <p className="text-sm text-gray-600 mb-2">Compte pour <strong>{currentParent?.nom}</strong> créé.</p>
                        <div className="bg-gray-100 p-3 rounded-md text-center"><p className="text-lg font-bold tracking-widest">{newPassword}</p></div>
                        <div className="mt-4 flex flex-col items-center">
                            <Button onClick={handleSendWhatsApp}>
                                <WhatsAppIcon className="w-5 h-5 mr-2" />
                                Envoyer par WhatsApp
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <InputField name="nom" label="Nom" currentParent={currentParent} handleFormChange={handleFormChange} formErrors={formErrors} />
                        <InputField name="email" label="Email" type="email" currentParent={currentParent} handleFormChange={handleFormChange} formErrors={formErrors} />
                        <InputField name="telephone" label="Téléphone" type="tel" currentParent={currentParent} handleFormChange={handleFormChange} formErrors={formErrors} />
                    </div>
                )}
            </Modal>
            
            <Modal isOpen={isResetModalOpen} onClose={closeAllModals} title={`Réinitialiser le mot de passe pour ${parentToReset?.nom}`}
                footer={<Button onClick={closeAllModals}>Fermer</Button>}
            >
                {newPassword ? (
                     <div>
                        <p className="text-sm text-gray-600 mb-2">Le nouveau mot de passe est :</p>
                        <div className="bg-gray-100 p-3 rounded-md text-center"><p className="text-lg font-bold tracking-widest">{newPassword}</p></div>
                        <div className="mt-4 flex flex-col items-center">
                            <Button onClick={handleSendWhatsApp}>
                                <WhatsAppIcon className="w-5 h-5 mr-2" />
                                Envoyer par WhatsApp
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div>
                        <p className="mb-4">Cliquez sur le bouton ci-dessous pour générer un nouveau mot de passe. Le parent ne sera pas notifié à moins que vous ne choisissiez d'envoyer le mot de passe via WhatsApp.</p>
                        <Button onClick={confirmResetPassword} disabled={isResetting} className="w-full">{isResetting ? "Génération..." : "Générer un nouveau mot de passe"}</Button>
                    </div>
                )}
            </Modal>
            
            <Modal isOpen={isDeleteConfirmOpen} onClose={() => setIsDeleteConfirmOpen(false)} title="Confirmer la suppression"
                footer={<><Button variant="ghost" onClick={() => setIsDeleteConfirmOpen(false)}>Annuler</Button><Button variant="danger" onClick={confirmDelete}>Supprimer</Button></>}
            >
                <p>Êtes-vous sûr de vouloir supprimer ce parent ? Les élèves associés devront être réassignés.</p>
            </Modal>
        </Card>
    );
};

export default ParentManagement;