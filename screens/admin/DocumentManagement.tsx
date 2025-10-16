import React, { useState } from 'react';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import PlusIcon from '../../components/icons/PlusIcon';
import PencilIcon from '../../components/icons/PencilIcon';
import TrashIcon from '../../components/icons/TrashIcon';
import { Document } from '../../types';
import * as api from '../../api';
import ImageWithPreview from '../../components/common/ImageWithPreview';
import PaperClipIcon from '../../components/icons/PaperClipIcon';
import XCircleIcon from '../../components/icons/XCircleIcon';

interface DocumentManagementProps {
    documents: Document[];
    onAdd: (doc: Omit<Document, 'id'>) => Promise<void>;
    onUpdate: (doc: Document) => Promise<void>;
    onDelete: (id: number) => Promise<void>;
}

const DocumentManagement: React.FC<DocumentManagementProps> = ({ documents, onAdd, onUpdate, onDelete }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const [currentDocument, setCurrentDocument] = useState<Partial<Document> | null>(null);
    const [documentToDelete, setDocumentToDelete] = useState<number | null>(null);
    const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const handleAdd = () => {
        setCurrentDocument({ title: '', description: '', url: '' });
        setFormErrors({});
        setSelectedFile(null);
        setIsModalOpen(true);
    };

    const handleEdit = (doc: Document) => {
        setCurrentDocument(doc);
        setFormErrors({});
        setSelectedFile(null);
        setIsModalOpen(true);
    };

    const handleDelete = (id: number) => {
        setDocumentToDelete(id);
        setIsDeleteConfirmOpen(true);
    };

    const confirmDelete = async () => {
        if (documentToDelete !== null) {
            await onDelete(documentToDelete);
            setIsDeleteConfirmOpen(false);
            setDocumentToDelete(null);
        }
    };

    const validateForm = (): boolean => {
        const errors: { [key: string]: string } = {};
        if (!currentDocument?.title?.trim()) errors.title = "Le titre est requis.";
        if (!currentDocument?.description?.trim()) errors.description = "La description est requise.";
        
        if (!selectedFile && !currentDocument?.url?.trim()) {
            errors.url = "Veuillez téléverser un fichier ou fournir une URL.";
        }
        
        if (!selectedFile && currentDocument?.url?.trim()) {
            try {
                new URL(currentDocument.url);
            } catch (_) {
                errors.url = "Veuillez entrer une URL valide.";
            }
        }
        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSave = async () => {
        if (!validateForm() || !currentDocument) return;

        setIsSaving(true);
        let documentToSave: Partial<Document> = { ...currentDocument };

        try {
            if (selectedFile) {
                const uploadResult = await api.uploadPhoto(selectedFile); // Re-using the photo upload API
                documentToSave.url = uploadResult.photoUrl;
                documentToSave.mimeType = selectedFile.type;
            } else {
                documentToSave.mimeType = undefined;
            }
            
            if (documentToSave.id) {
                await onUpdate(documentToSave as Document);
            } else {
                await onAdd(documentToSave as Omit<Document, 'id'>);
            }

            setIsModalOpen(false);
            setCurrentDocument(null);
            setSelectedFile(null);
        } catch (error) {
            console.error("Failed to save document:", error);
            setFormErrors({ general: "Erreur lors de l'enregistrement du document." });
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        if (currentDocument) {
            setCurrentDocument({ ...currentDocument, [e.target.name]: e.target.value });
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedFile(e.target.files[0]);
            if (currentDocument) {
                setCurrentDocument({ ...currentDocument, url: '' });
            }
        }
    };

    return (
        <Card title="Gestion des Documents">
            <div className="mb-4 text-right">
                <Button onClick={handleAdd}>
                    <PlusIcon className="w-4 h-4 mr-2" />
                    Ajouter un document
                </Button>
            </div>
            <div className="overflow-x-auto">
                <table className="min-w-full bg-white divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Titre</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aperçu</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {documents.map(doc => (
                            <tr key={doc.id} className="even:bg-slate-50">
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{doc.title}</td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    {(doc.mimeType?.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp)$/i.test(doc.url)) ? (
                                        <div className="w-16 h-16">
                                            <ImageWithPreview 
                                                src={doc.url}
                                                alt={doc.title}
                                                className="w-16 h-16 rounded-md object-cover"
                                            />
                                        </div>
                                    ) : (
                                        <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-royal-blue hover:underline truncate max-w-xs block">{doc.url}</a>
                                    )}
                                </td>
                                <td className="px-6 py-4 whitespace-normal text-sm text-gray-500">{doc.description}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                                    <Button size="sm" variant="ghost" onClick={() => handleEdit(doc)} aria-label={`Modifier ${doc.title}`}><PencilIcon/></Button>
                                    <Button size="sm" variant="ghost" className="text-red-600 hover:bg-red-100" onClick={() => handleDelete(doc.id)} aria-label={`Supprimer ${doc.title}`}><TrashIcon/></Button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <Modal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)} 
                title={currentDocument?.id ? "Modifier le document" : "Ajouter un document"}
                footer={
                    <>
                        <Button variant="secondary" onClick={() => setIsModalOpen(false)}>Annuler</Button>
                        <Button onClick={handleSave} disabled={isSaving}>{isSaving ? "Enregistrement..." : "Enregistrer"}</Button>
                    </>
                }
            >
                <div className="space-y-4">
                     <div>
                        <label htmlFor="title" className="block text-sm font-medium text-gray-700">Titre</label>
                        <input type="text" id="title" name="title" value={currentDocument?.title || ''} onChange={handleFormChange} className={`mt-1 block w-full px-3 py-2 border ${formErrors.title ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-royal-blue focus:border-royal-blue sm:text-sm`} />
                        {formErrors.title && <p className="mt-1 text-xs text-red-500">{formErrors.title}</p>}
                    </div>
                     <div>
                        <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description</label>
                        <textarea id="description" name="description" value={currentDocument?.description || ''} onChange={handleFormChange} rows={3} className={`mt-1 block w-full px-3 py-2 border ${formErrors.description ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-royal-blue focus:border-royal-blue sm:text-sm`}></textarea>
                         {formErrors.description && <p className="mt-1 text-xs text-red-500">{formErrors.description}</p>}
                    </div>
                     <div>
                        <label htmlFor="file-upload" className="block text-sm font-medium text-gray-700">
                            Téléverser un fichier
                        </label>
                        <div className="mt-1 flex items-center justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                            <div className="space-y-1 text-center">
                                <PaperClipIcon className="mx-auto h-12 w-12 text-gray-400" />
                                <div className="flex text-sm text-gray-600">
                                    <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-royal-blue hover:text-royal-blue/80 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-royal-blue">
                                        <span>Choisissez un fichier</span>
                                        <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={handleFileChange} />
                                    </label>
                                </div>
                                <p className="text-xs text-gray-500">PNG, JPG, PDF etc. jusqu'à 10MB</p>
                            </div>
                        </div>
                        {selectedFile && (
                            <div className="mt-2 px-2 py-1 flex items-center justify-between bg-slate-100 rounded-lg">
                                <span className="text-sm text-slate-700 truncate">{selectedFile.name}</span>
                                <button onClick={() => setSelectedFile(null)} className="p-1 text-slate-500 hover:text-red-600">
                                    <XCircleIcon className="w-4 h-4" />
                                </button>
                            </div>
                        )}
                    </div>
                    <div className="relative flex py-2 items-center">
                        <div className="flex-grow border-t border-gray-200"></div>
                        <span className="flex-shrink mx-4 text-gray-400 text-xs">OU</span>
                        <div className="flex-grow border-t border-gray-200"></div>
                    </div>
                    <div>
                        <label htmlFor="url" className="block text-sm font-medium text-gray-700">Lien URL externe</label>
                        <input type="url" id="url" name="url" placeholder="https://example.com/document.pdf" value={currentDocument?.url || ''} onChange={handleFormChange} disabled={!!selectedFile} className={`mt-1 block w-full px-3 py-2 border ${formErrors.url ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm disabled:bg-gray-100`} />
                        {formErrors.url && <p className="mt-1 text-xs text-red-500">{formErrors.url}</p>}
                    </div>
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
                <p>Êtes-vous sûr de vouloir supprimer ce document ? Cette action est irréversible.</p>
            </Modal>
        </Card>
    );
};

export default DocumentManagement;