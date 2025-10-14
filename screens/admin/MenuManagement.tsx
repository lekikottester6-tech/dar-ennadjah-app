import React, { useState } from 'react';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import { DailyMenu } from '../../types';
import * as api from '../../api';
import PlusIcon from '../../components/icons/PlusIcon';
import PencilIcon from '../../components/icons/PencilIcon';
import TrashIcon from '../../components/icons/TrashIcon';
import ChevronLeftIcon from '../../components/icons/ChevronLeftIcon';
import ChevronRightIcon from '../../components/icons/ChevronRightIcon';
import CameraIcon from '../../components/icons/CameraIcon';
import CameraCapture from '../../components/common/CameraCapture';
import ImageWithPreview from '../../components/common/ImageWithPreview';

interface MenuManagementProps {
    menus: DailyMenu[];
    onAddMenu: (menu: Omit<DailyMenu, 'id'>) => Promise<void>;
    onUpdateMenu: (menu: DailyMenu) => Promise<void>;
    onDeleteMenu: (menuId: number) => Promise<void>;
    addToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const getLocalDateString = (date: Date): string => {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const MenuManagement: React.FC<MenuManagementProps> = ({ menus, onAddMenu, onUpdateMenu, onDeleteMenu, addToast }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const [currentMenu, setCurrentMenu] = useState<Partial<DailyMenu> | null>(null);
    const [menuToDelete, setMenuToDelete] = useState<number | null>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);


    const getStartOfWeek = (date: Date) => {
        const d = new Date(date);
        // Sunday is 0, so we subtract the day number to get to the previous Sunday
        d.setDate(d.getDate() - d.getDay());
        return d;
    };

    const startOfWeek = getStartOfWeek(currentDate);

    // Display Sunday to Saturday (7 days)
    const weekDays = Array.from({ length: 7 }).map((_, i) => {
        const day = new Date(startOfWeek);
        day.setDate(startOfWeek.getDate() + i);
        return day;
    });

    const goToPreviousWeek = () => {
        setCurrentDate(prev => {
            const newDate = new Date(prev);
            newDate.setDate(prev.getDate() - 7);
            return newDate;
        });
    };
    const goToNextWeek = () => {
        setCurrentDate(prev => {
            const newDate = new Date(prev);
            newDate.setDate(prev.getDate() + 7);
            return newDate;
        });
    };

    const handleAdd = (date: string) => {
        setCurrentMenu({ date, starter: '', mainCourse: '', dessert: '', snack: '' });
        setSelectedFile(null);
        setIsCameraOpen(false);
        setUploadError(null);
        setIsModalOpen(true);
    };

    const handleEdit = (menu: DailyMenu) => {
        setCurrentMenu(menu);
        setSelectedFile(null);
        setIsCameraOpen(false);
        setUploadError(null);
        setIsModalOpen(true);
    };
    
    const handleDelete = (id: number) => {
        setMenuToDelete(id);
        setIsDeleteConfirmOpen(true);
    };
    
    const confirmDelete = async () => {
        if (menuToDelete !== null) {
            try {
                await onDeleteMenu(menuToDelete);
                addToast("Menu supprimé avec succès.", 'success');
            } catch (error: any) {
                console.error("Failed to delete menu:", error);
                addToast(error.message || "Erreur lors de la suppression du menu.", 'error');
            } finally {
                setIsDeleteConfirmOpen(false);
                setMenuToDelete(null);
            }
        }
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setTimeout(() => {
            setIsCameraOpen(false);
            setCurrentMenu(null);
            setSelectedFile(null);
            setUploadError(null);
        }, 300);
    };

    const handleSave = async () => {
        if (!currentMenu) return;

        setIsSaving(true);
        setUploadError(null);
        try {
            let menuToSave = { ...currentMenu };
            if (selectedFile) {
                const uploadResult = await api.uploadPhoto(selectedFile);
                menuToSave.photoUrl = uploadResult.photoUrl;
            }
            
            if (menuToSave.id) {
                await onUpdateMenu(menuToSave as DailyMenu);
                addToast("Menu mis à jour avec succès.", 'success');
            } else {
                await onAddMenu(menuToSave as Omit<DailyMenu, 'id'>);
                addToast("Menu ajouté avec succès.", 'success');
            }
            closeModal();
        } catch (error: any) {
            console.error("Échec de l'enregistrement du menu:", error);
            const errorMessage = error.message || "Une erreur inconnue est survenue.";
            setUploadError(`Erreur: ${errorMessage}`);
            addToast(`Erreur: ${errorMessage}`, 'error');
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        if (currentMenu) {
            setCurrentMenu({ ...currentMenu, [e.target.name]: e.target.value });
        }
    };
    
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedFile(e.target.files[0]);
            setUploadError(null);
        }
    };

    const handlePhotoCaptured = (blob: Blob) => {
        const photoFile = new File([blob], "menu_photo.jpg", { type: "image/jpeg" });
        setSelectedFile(photoFile);
        setUploadError(null);
        setIsCameraOpen(false); // Return to the form view
    };

    const weekFormatter = new Intl.DateTimeFormat('fr-FR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });

    return (
        <Card title="Gestion des Menus de la Cantine">
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4 p-4 bg-slate-50 rounded-lg">
                <Button onClick={goToPreviousWeek} variant="ghost"><ChevronLeftIcon className="w-5 h-5 mr-2" /> Semaine Précédente</Button>
                
                <div className="flex flex-col items-center gap-2">
                    <h3 className="text-xl font-semibold text-gray-800 text-center">
                        Semaine du {weekFormatter.format(startOfWeek)}
                    </h3>
                    <div className="flex items-center gap-2">
                        <label htmlFor="menu-date-search-admin" className="text-sm font-medium text-gray-700">Aller à la date :</label>
                        <input
                            id="menu-date-search-admin"
                            type="date"
                            value={currentDate.toISOString().split('T')[0]}
                            onChange={(e) => {
                                if (e.target.value) {
                                    const [year, month, day] = e.target.value.split('-').map(Number);
                                    setCurrentDate(new Date(year, month - 1, day));
                                }
                            }}
                            className="border-gray-300 rounded-md shadow-sm focus:ring-royal-blue focus:border-royal-blue text-sm p-1"
                        />
                    </div>
                </div>
                
                <Button onClick={goToNextWeek} variant="ghost">Semaine Suivante <ChevronRightIcon className="w-5 h-5 ml-2" /></Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-7 gap-4">
                {weekDays.map(day => {
                    const dayString = getLocalDateString(day);
                    const menuForDay = menus.find(m => m.date && m.date.startsWith(dayString));
                    const isWeekend = day.getDay() === 5 || day.getDay() === 6; // Friday or Saturday
                    return (
                        <div key={dayString} className={`p-4 rounded-lg shadow-md flex flex-col ${isWeekend ? 'bg-slate-50' : 'bg-white'}`}>
                            <h4 className={`font-bold text-lg border-b pb-2 mb-3 ${isWeekend ? 'text-gray-500' : 'text-gray-700'}`}>{day.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric' })}</h4>
                            {menuForDay ? (
                                <div className="flex-grow space-y-2 text-sm text-gray-600">
                                    {menuForDay.photoUrl && (
                                        <ImageWithPreview
                                            src={menuForDay.photoUrl}
                                            alt="Repas"
                                            className="w-full aspect-[2/3] rounded-md mb-2"
                                        />
                                    )}
                                    <p><strong>Entrée:</strong> {menuForDay.starter}</p>
                                    <p><strong>Plat:</strong> {menuForDay.mainCourse}</p>
                                    <p><strong>Dessert:</strong> {menuForDay.dessert}</p>
                                    <p><strong>Goûter:</strong> {menuForDay.snack}</p>
                                </div>
                            ) : (
                                <p className="flex-grow text-sm text-gray-400 italic mt-4 text-center">Aucun menu défini.</p>
                            )}
                            <div className="mt-4 pt-3 border-t flex justify-end space-x-2">
                                {menuForDay ? (
                                    <>
                                        <Button size="sm" variant="ghost" onClick={() => handleEdit(menuForDay)}><PencilIcon /></Button>
                                        <Button size="sm" variant="ghost" className="text-red-600 hover:bg-red-100" onClick={() => handleDelete(menuForDay.id)}><TrashIcon /></Button>
                                    </>
                                ) : (
                                    <Button size="sm" onClick={() => handleAdd(dayString)}>
                                        <PlusIcon className="w-4 h-4 mr-1" /> Ajouter
                                    </Button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            <Modal
                isOpen={isModalOpen}
                onClose={closeModal}
                title={isCameraOpen ? "Prendre une photo" : (currentMenu?.id ? "Modifier le menu" : "Ajouter le menu")}
                footer={
                    !isCameraOpen && (
                        <>
                            <Button variant="secondary" onClick={closeModal}>Annuler</Button>
                            <Button onClick={handleSave} disabled={isSaving}>{isSaving ? 'Enregistrement...' : 'Enregistrer'}</Button>
                        </>
                    )
                }
            >
                {isCameraOpen ? (
                     <CameraCapture 
                        onCapture={handlePhotoCaptured}
                        onClose={() => setIsCameraOpen(false)}
                    />
                ) : currentMenu && (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium">Date</label>
                            <input type="text" value={new Date(currentMenu.date!).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} disabled className="w-full p-2 mt-1 border rounded-md bg-gray-100" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium">Entrée</label>
                            <input type="text" name="starter" value={currentMenu.starter || ''} onChange={handleFormChange} className="w-full p-2 mt-1 border rounded-md" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium">Plat principal</label>
                            <input type="text" name="mainCourse" value={currentMenu.mainCourse || ''} onChange={handleFormChange} className="w-full p-2 mt-1 border rounded-md" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium">Dessert</label>
                            <input type="text" name="dessert" value={currentMenu.dessert || ''} onChange={handleFormChange} className="w-full p-2 mt-1 border rounded-md" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium">Goûter</label>
                            <input type="text" name="snack" value={currentMenu.snack || ''} onChange={handleFormChange} className="w-full p-2 mt-1 border rounded-md" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Photo du plat</label>
                            <div className="mt-1">
                                <input 
                                    type="file" 
                                    id="menu-photo-upload" 
                                    accept="image/*" 
                                    onChange={handleFileChange} 
                                    className="hidden"
                                />
                                <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2">
                                    <Button variant="secondary" onClick={() => document.getElementById('menu-photo-upload')?.click()}>
                                        Choisir un fichier
                                    </Button>
                                    <Button variant="ghost" onClick={() => setIsCameraOpen(true)}>
                                        <CameraIcon className="w-4 h-4 mr-2" />
                                        Prendre une photo
                                    </Button>
                                </div>
                            </div>
                            {uploadError && <p className="mt-2 text-xs text-red-500">{uploadError}</p>}
                            {(selectedFile || currentMenu.photoUrl) && (
                                <div className="mt-4">
                                    <img 
                                        src={selectedFile ? URL.createObjectURL(selectedFile) : currentMenu.photoUrl} 
                                        alt="Aperçu" 
                                        className="w-full aspect-[2/3] object-cover rounded-lg shadow-sm"
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                )}
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
                <p>Êtes-vous sûr de vouloir supprimer ce menu ?</p>
            </Modal>
        </Card>
    );
};

export default MenuManagement;