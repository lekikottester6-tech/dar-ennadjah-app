import React, { useState, useCallback, useEffect } from 'react';
import Card from '../../components/common/Card';
import ChevronLeftIcon from '../../components/icons/ChevronLeftIcon';
import ChevronRightIcon from '../../components/icons/ChevronRightIcon';
import XIcon from '../../components/icons/XIcon';

const photos = [
    'https://storage.googleapis.com/aidevs/F8B243B5A96E4929/0.jpg',
    'https://storage.googleapis.com/aidevs/F8B243B5A96E4929/1.jpg',
    'https://storage.googleapis.com/aidevs/F8B243B5A96E4929/2.jpg',
    'https://storage.googleapis.com/aidevs/F8B243B5A96E4929/3.jpg',
];

const PhotoGallery: React.FC = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

    const openModal = (index: number) => {
        setCurrentPhotoIndex(index);
        setIsModalOpen(true);
    };

    const closeModal = useCallback(() => {
        setIsModalOpen(false);
    }, []);

    const showNextPhoto = useCallback(() => {
        setCurrentPhotoIndex((prevIndex) => (prevIndex + 1) % photos.length);
    }, []);

    const showPrevPhoto = useCallback(() => {
        setCurrentPhotoIndex((prevIndex) => (prevIndex - 1 + photos.length) % photos.length);
    }, []);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isModalOpen) return;
            if (e.key === 'ArrowRight') {
                showNextPhoto();
            } else if (e.key === 'ArrowLeft') {
                showPrevPhoto();
            } else if (e.key === 'Escape') {
                closeModal();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isModalOpen, showNextPhoto, showPrevPhoto, closeModal]);

    return (
        <Card title="Photos de Dar Ennadjah">
            <p className="mb-6 text-gray-600">Découvrez les derniers moments et activités de notre école.</p>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {photos.map((photo, index) => (
                    <div key={index} className="aspect-w-1 aspect-h-1 cursor-pointer group" onClick={() => openModal(index)}>
                        <img
                            src={photo}
                            alt={`Galerie photo ${index + 1}`}
                            className="object-cover w-full h-full rounded-lg shadow-md transition-transform transform group-hover:scale-105 duration-300"
                        />
                    </div>
                ))}
            </div>

            {isModalOpen && (
                <div 
                    className="fixed inset-0 bg-black bg-opacity-80 z-50 flex justify-center items-center p-4 transition-opacity duration-300" 
                    onClick={closeModal}
                    aria-modal="true"
                    role="dialog"
                >
                    <div className="relative max-w-4xl max-h-full" onClick={(e) => e.stopPropagation()}>
                        <img
                            src={photos[currentPhotoIndex]}
                            alt={`Galerie photo ${currentPhotoIndex + 1}`}
                            className="object-contain w-full h-full max-h-[90vh] rounded-lg"
                        />
                        <button
                            onClick={closeModal}
                            className="absolute top-2 right-2 text-white bg-black bg-opacity-50 rounded-full p-2 hover:bg-opacity-75 transition-colors"
                            aria-label="Fermer"
                        >
                            <XIcon className="w-6 h-6" />
                        </button>
                        <button
                            onClick={showPrevPhoto}
                            className="absolute top-1/2 left-2 -translate-y-1/2 text-white bg-black bg-opacity-50 rounded-full p-2 hover:bg-opacity-75 transition-colors"
                            aria-label="Photo précédente"
                        >
                            <ChevronLeftIcon className="w-8 h-8" />
                        </button>
                        <button
                            onClick={showNextPhoto}
                            className="absolute top-1/2 right-2 -translate-y-1/2 text-white bg-black bg-opacity-50 rounded-full p-2 hover:bg-opacity-75 transition-colors"
                            aria-label="Photo suivante"
                        >
                            <ChevronRightIcon className="w-8 h-8" />
                        </button>
                    </div>
                </div>
            )}
        </Card>
    );
};

export default PhotoGallery;