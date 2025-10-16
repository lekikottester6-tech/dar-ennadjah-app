import React, { useState, useEffect, useMemo } from 'react';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import { Student, Observation } from '../../types';
import * as api from '../../api';
import PlusIcon from '../../components/icons/PlusIcon';
import PencilIcon from '../../components/icons/PencilIcon';
import TrashIcon from '../../components/icons/TrashIcon';
import SearchIcon from '../../components/icons/SearchIcon';

interface ObservationManagementProps {
    observations: Observation[];
    onAddObservation: (observation: Omit<Observation, 'id'>) => void;
    onUpdateObservation: (observation: Observation) => void;
    onDeleteObservation: (observationId: number) => void;
}

const ObservationManagement: React.FC<ObservationManagementProps> = ({ observations, onAddObservation, onUpdateObservation, onDeleteObservation }) => {
    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    // Modal and form state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    
    const [currentObservation, setCurrentObservation] = useState<Partial<Observation> | null>(null);
    const [itemToDelete, setItemToDelete] = useState<number | null>(null);
    
    useEffect(() => {
        const fetchStudents = async () => {
            setLoading(true);
            try {
                const studentsData = await api.getStudents();
                const activeStudents = studentsData.filter(s => !s.isArchived);
                setStudents(activeStudents);
            } catch (error) {
                console.error("Failed to fetch students for observation management:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchStudents();
    }, []);

    const filteredStudents = useMemo(() => {
        if (!searchQuery.trim()) {
            return students;
        }
        const lowercasedQuery = searchQuery.toLowerCase();
        return students.filter(student =>
            `${student.prenom} ${student.nom}`.toLowerCase().includes(lowercasedQuery) ||
            student.classe.toLowerCase().includes(lowercasedQuery)
        );
    }, [students, searchQuery]);

    useEffect(() => {
        if (filteredStudents.length === 1) {
            if (selectedStudentId !== filteredStudents[0].id) {
                setSelectedStudentId(filteredStudents[0].id);
            }
            return;
        }

        if (selectedStudentId && !filteredStudents.some(s => s.id === selectedStudentId)) {
            setSelectedStudentId(null);
        }
    }, [filteredStudents, selectedStudentId]);

    const selectedStudentObservations = useMemo(() => {
        if (!selectedStudentId) return [];
        return observations
            .filter(o => o.studentId === selectedStudentId)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [observations, selectedStudentId]);

    // --- Handlers ---
    const handleAddClick = () => {
        const today = new Date().toISOString().split('T')[0];
        setCurrentObservation({ studentId: selectedStudentId!, date: today, content: '', author: 'Administration' });
        setIsModalOpen(true);
    };

    const handleEdit = (observation: Observation) => {
        setCurrentObservation(observation);
        setIsModalOpen(true);
    };
    
    const handleDelete = (id: number) => {
        setItemToDelete(id);
        setIsDeleteConfirmOpen(true);
    }

    const confirmDelete = () => {
        if (itemToDelete === null) return;
        onDeleteObservation(itemToDelete);
        setIsDeleteConfirmOpen(false);
        setItemToDelete(null);
    };

    const handleSave = () => {
        if (!currentObservation || !currentObservation.content?.trim()) return;
        
        if (currentObservation.id) {
            onUpdateObservation(currentObservation as Observation);
        } else {
            onAddObservation(currentObservation as Omit<Observation, 'id'>);
        }
        setIsModalOpen(false);
        setCurrentObservation(null);
    };
    
    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        if (currentObservation) {
            const { name, value } = e.target;
            setCurrentObservation({ ...currentObservation, [name]: value });
        }
    };
    
    return (
        <Card title="Gestion des Observations">
             <div className="mb-6">
                <label htmlFor="student-search-obs" className="block text-sm font-medium text-gray-700 mb-2">
                    Rechercher un élève
                </label>
                <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                        <SearchIcon className="h-5 w-5 text-gray-400" />
                    </span>
                    <input
                        type="text"
                        id="student-search-obs"
                        placeholder="Rechercher par nom, prénom ou classe..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-royal-blue"
                    />
                </div>
            </div>
            <div className="mb-6">
                <label htmlFor="student-select" className="block text-sm font-medium text-gray-700 mb-2">
                    Sélectionner un élève (actifs uniquement)
                </label>
                <select
                    id="student-select"
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-royal-blue focus:border-royal-blue sm:text-sm rounded-md"
                    onChange={(e) => setSelectedStudentId(e.target.value ? parseInt(e.target.value, 10) : null)}
                    value={selectedStudentId ?? ''}
                    disabled={loading}
                >
                    <option value="">
                        {searchQuery ? 
                            (filteredStudents.length > 0 ? 'Sélectionnez un résultat' : 'Aucun élève trouvé') : 
                            '-- Choisir dans la liste --'
                        }
                    </option>
                    {filteredStudents.map(s => (
                        <option key={s.id} value={s.id}>{s.prenom} {s.nom} ({s.classe})</option>
                    ))}
                </select>
            </div>

            {selectedStudentId ? (
                <div>
                    <div className="flex justify-between items-center mb-4 border-b pb-2">
                        <h3 className="text-xl font-semibold text-royal-blue">Historique des observations</h3>
                        <Button onClick={handleAddClick}>
                            <PlusIcon className="w-4 h-4 mr-2" />
                            Ajouter une observation
                        </Button>
                    </div>
                    <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                        {selectedStudentObservations.length > 0 ? selectedStudentObservations.map(obs => (
                            <div key={obs.id} className="bg-white p-4 rounded-lg shadow-sm border">
                                <div className="flex justify-between items-center mb-2 text-sm text-gray-500">
                                    <span>Par : <strong>{obs.author}</strong></span>
                                    <span>Le : <strong>{new Date(obs.date).toLocaleDateString('fr-FR')}</strong></span>
                                </div>
                                <p className="text-gray-700 whitespace-pre-wrap mb-3">{obs.content}</p>
                                <div className="flex justify-end space-x-2">
                                    <Button size="sm" variant="ghost" onClick={() => handleEdit(obs)} aria-label={`Modifier observation`}><PencilIcon/></Button>
                                    <Button size="sm" variant="ghost" className="text-red-600 hover:bg-red-100" onClick={() => handleDelete(obs.id)} aria-label={`Supprimer observation`}><TrashIcon/></Button>
                                </div>
                            </div>
                        )) : (
                             <div className="text-center py-10 text-gray-500">
                                <p>Aucune observation pour cet élève.</p>
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <div className="text-center py-10 text-gray-500">
                    <p>{loading ? "Chargement des élèves..." : "Veuillez sélectionner un élève pour gérer ses observations."}</p>
                </div>
            )}

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={currentObservation?.id ? "Modifier l'observation" : "Ajouter une observation"}
                footer={<><Button variant="secondary" onClick={() => setIsModalOpen(false)}>Annuler</Button><Button onClick={handleSave}>Enregistrer</Button></>}>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Date</label>
                        <input type="date" name="date" value={currentObservation?.date || ''} onChange={handleFormChange} className="w-full p-2 mt-1 border rounded-md"/>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Auteur</label>
                        <input type="text" name="author" value={currentObservation?.author || ''} onChange={handleFormChange} className="w-full p-2 mt-1 border rounded-md"/>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Contenu de l'observation</label>
                        <textarea name="content" value={currentObservation?.content || ''} onChange={handleFormChange} rows={5} className="w-full p-2 mt-1 border rounded-md"/>
                    </div>
                </div>
            </Modal>
            
            <Modal isOpen={isDeleteConfirmOpen} onClose={() => setIsDeleteConfirmOpen(false)} title="Confirmer la suppression"
                footer={<><Button variant="secondary" onClick={() => setIsDeleteConfirmOpen(false)}>Annuler</Button><Button variant="danger" onClick={confirmDelete}>Supprimer</Button></>}>
                <p>Êtes-vous sûr de vouloir supprimer cette observation ? Cette action est irréversible.</p>
            </Modal>

        </Card>
    );
};

export default ObservationManagement;