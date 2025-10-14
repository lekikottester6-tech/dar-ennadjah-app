import React, { useState, useEffect, useRef, useMemo } from 'react';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import { Message, User, Document } from '../../types';
import SearchIcon from '../../components/icons/SearchIcon';
import ChevronLeftIcon from '../../components/icons/ChevronLeftIcon';
import PaperClipIcon from '../../components/icons/PaperClipIcon';
import XCircleIcon from '../../components/icons/XCircleIcon';
import DocumentIcon from '../../components/icons/DocumentIcon';

interface CommunicationManagementProps {
    messages: Message[];
    parents: User[];
    onAddMessage: (message: Omit<Message, 'id'>) => Promise<void>;
    onBack: () => void;
}

const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });
};

const isImageFile = (fileName: string) => {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
    return imageExtensions.some(ext => fileName.toLowerCase().endsWith(ext));
};

const CommunicationManagement: React.FC<CommunicationManagementProps> = ({ messages, parents, onAddMessage, onBack }) => {
    const [selectedParentId, setSelectedParentId] = useState<number | null>(null);
    const [newMessage, setNewMessage] = useState('');
    const [attachedFile, setAttachedFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState(false);
    const [broadcastMessage, setBroadcastMessage] = useState('');
    const chatEndRef = useRef<HTMLDivElement>(null);
    const ADMIN_ID = 4; // Assuming admin user has id 4
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, selectedParentId]);

    const filteredParents = useMemo(() => {
        if (!searchQuery.trim()) {
            return parents;
        }
        const lowercasedQuery = searchQuery.toLowerCase();
        return parents.filter(parent =>
            parent.nom.toLowerCase().includes(lowercasedQuery) ||
            parent.email.toLowerCase().includes(lowercasedQuery)
        );
    }, [parents, searchQuery]);

    const handleSendMessage = async () => {
        if ((newMessage.trim() === '' && !attachedFile) || selectedParentId === null) return;

        let attachmentData: { attachmentName?: string; attachmentUrl?: string } = {};
        if (attachedFile) {
            const base64Url = await fileToBase64(attachedFile);
            attachmentData = {
                attachmentName: attachedFile.name,
                attachmentUrl: base64Url,
            };
        }

        const msg: Omit<Message, 'id'> = {
            senderId: ADMIN_ID,
            receiverId: selectedParentId,
            contenu: newMessage,
            date: new Date().toISOString(),
            ...attachmentData
        };
        await onAddMessage(msg);

        setNewMessage('');
        setAttachedFile(null);
        if(fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setAttachedFile(e.target.files[0]);
        }
    };

    const handleSendBroadcast = async () => {
        if (broadcastMessage.trim() === '') return;
        const broadcastPromises = parents.map(parent => 
            onAddMessage({
                senderId: ADMIN_ID,
                receiverId: parent.id,
                contenu: broadcastMessage,
                date: new Date().toISOString(),
            })
        );
        await Promise.all(broadcastPromises);
        
        setBroadcastMessage('');
        setIsBroadcastModalOpen(false);
    };

    const selectedConversation = messages
        .filter(m => 
            (m.senderId === selectedParentId && m.receiverId === ADMIN_ID) || 
            (m.senderId === ADMIN_ID && m.receiverId === selectedParentId)
        )
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return (
        <div className="flex flex-col h-full">
            <div className="flex h-full">
                {/* Parent List Pane */}
                <div className={`
                    ${selectedParentId !== null ? 'hidden' : 'flex'} 
                    w-full flex-col border-r border-gray-200 bg-white
                    md:flex md:w-1/3 lg:w-1/4
                `}>
                    <div className="p-3 border-b bg-white flex items-center sticky top-0 z-10">
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            className="!p-2 rounded-full mr-2" 
                            onClick={onBack}
                            aria-label="Retour au menu"
                        >
                            <ChevronLeftIcon className="w-6 h-6 text-gray-600" />
                        </Button>
                        <h3 className="font-semibold text-lg text-gray-800">Messagerie</h3>
                    </div>
                    <div className="p-4 border-b">
                        <Button className="w-full" onClick={() => setIsBroadcastModalOpen(true)}>
                            Message groupé
                        </Button>
                    </div>
                    <div className="p-4 border-b">
                        <div className="relative">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                                <SearchIcon className="h-5 w-5 text-gray-400" />
                            </span>
                            <input
                                type="text"
                                placeholder="Rechercher un parent..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-royal-blue"
                            />
                        </div>
                    </div>
                    <ul className="flex-grow overflow-y-auto">
                        {filteredParents.length > 0 ? (
                            filteredParents.map(parent => (
                                <li key={parent.id} 
                                    className={`p-4 cursor-pointer hover:bg-slate-100 ${selectedParentId === parent.id ? 'bg-royal-blue/10' : 'even:bg-slate-50'}`}
                                    onClick={() => setSelectedParentId(parent.id)}
                                >
                                    <p className="font-semibold text-gray-800">{parent.nom}</p>
                                    <p className="text-sm text-gray-500 truncate">{parent.email}</p>
                                </li>
                            ))
                        ) : (
                            <li className="p-4 text-center text-gray-500">
                                Aucun parent trouvé.
                            </li>
                        )}
                    </ul>
                </div>

                {/* Chat Pane */}
                <div className={`
                    ${selectedParentId === null ? 'hidden' : 'flex'}
                    w-full flex-col 
                    md:flex md:w-2/3 lg:w-3/4
                `}>
                    {selectedParentId ? (
                        <>
                            <div className="p-3 border-b bg-slate-50 flex items-center space-x-3">
                                <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="!p-2 rounded-full md:hidden" 
                                    onClick={() => setSelectedParentId(null)}
                                    aria-label="Retour à la liste"
                                >
                                    <ChevronLeftIcon className="w-6 h-6 text-gray-600" />
                                </Button>
                                <h3 className="font-semibold text-lg text-gray-800 truncate">
                                    {parents.find(p => p.id === selectedParentId)?.nom}
                                </h3>
                            </div>
                            <div className="flex-grow p-4 overflow-y-auto bg-slate-100 space-y-4">
                                {selectedConversation.map(msg => (
                                    <div key={msg.id} className={`flex ${msg.senderId === ADMIN_ID ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl ${msg.senderId === ADMIN_ID ? 'bg-royal-blue text-white' : 'bg-white text-gray-800 shadow-sm'}`}>
                                            {msg.contenu && <p>{msg.contenu}</p>}
                                            {msg.attachmentUrl && msg.attachmentName && (
                                                <div className="mt-2">
                                                    {isImageFile(msg.attachmentName) ? (
                                                        <a href={msg.attachmentUrl} target="_blank" rel="noopener noreferrer">
                                                            <img src={msg.attachmentUrl} alt={msg.attachmentName} className="rounded-lg max-w-full h-auto cursor-pointer" />
                                                        </a>
                                                    ) : (
                                                        <a href={msg.attachmentUrl} download={msg.attachmentName} className={`flex items-center gap-2 p-2 rounded-lg ${msg.senderId === ADMIN_ID ? 'bg-blue-800 hover:bg-blue-900' : 'bg-slate-200 hover:bg-slate-300'}`}>
                                                            <DocumentIcon className="w-5 h-5 flex-shrink-0" />
                                                            <span className="text-sm font-medium underline truncate">{msg.attachmentName}</span>
                                                        </a>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                <div ref={chatEndRef} />
                            </div>
                            <div className="p-4 bg-white border-t">
                                {attachedFile && (
                                    <div className="px-2 py-2 flex items-center justify-between bg-slate-100 rounded-lg mb-2">
                                        <div className="flex items-center gap-2 overflow-hidden">
                                            <PaperClipIcon className="w-5 h-5 text-slate-500 flex-shrink-0" />
                                            <span className="text-sm text-slate-700 truncate">{attachedFile.name}</span>
                                        </div>
                                        <button onClick={() => { setAttachedFile(null); if(fileInputRef.current) fileInputRef.current.value = ''; }} className="p-1 text-slate-500 hover:text-red-600">
                                            <XCircleIcon className="w-5 h-5" />
                                        </button>
                                    </div>
                                )}
                                <div className="flex space-x-2">
                                     <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" />
                                    <Button variant="ghost" className="!p-2 rounded-full flex-shrink-0" onClick={() => fileInputRef.current?.click()}>
                                        <PaperClipIcon className="w-6 h-6 text-slate-600" />
                                    </Button>
                                    <input 
                                        type="text" 
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                                        placeholder="Écrire un message..." 
                                        className="flex-grow border-gray-300 rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-royal-blue"
                                    />
                                    <Button onClick={handleSendMessage} className="rounded-full !px-5">Envoyer</Button>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="hidden md:flex items-center justify-center h-full text-gray-500">
                            <p>Sélectionnez un parent pour commencer à discuter.</p>
                        </div>
                    )}
                </div>
            </div>
            
            <Modal
                isOpen={isBroadcastModalOpen}
                onClose={() => setIsBroadcastModalOpen(false)}
                title="Envoyer un Message Groupé"
                footer={
                    <>
                        <Button variant="ghost" onClick={() => setIsBroadcastModalOpen(false)}>Annuler</Button>
                        <Button onClick={handleSendBroadcast}>Envoyer à tous</Button>
                    </>
                }
            >
                <div>
                    <label htmlFor="broadcastMessage" className="block text-sm font-medium text-gray-700 mb-2">
                        Message
                    </label>
                    <textarea
                        id="broadcastMessage"
                        rows={5}
                        value={broadcastMessage}
                        onChange={(e) => setBroadcastMessage(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-royal-blue"
                        placeholder="Écrivez votre annonce ici..."
                    />
                </div>
            </Modal>
        </div>
    );
};

export default CommunicationManagement;