import React, { useState, useCallback, useEffect } from 'react';
import XIcon from '../icons/XIcon';

interface ImageWithPreviewProps {
    src: string;
    alt: string;
    className?: string;
}

const ImageWithPreview: React.FC<ImageWithPreviewProps> = ({ src, alt, className = '' }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);

    const openModal = () => setIsModalOpen(true);
    const closeModal = useCallback(() => setIsModalOpen(false), []);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (isModalOpen && e.key === 'Escape') {
                closeModal();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isModalOpen, closeModal]);

    return (
        <>
            <div className={`cursor-pointer group overflow-hidden ${className}`} onClick={openModal}>
                <img
                    src={src}
                    alt={alt}
                    className="object-cover w-full h-full transition-transform transform group-hover:scale-105 duration-300"
                />
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
                            src={src}
                            alt={alt}
                            className="object-contain w-full h-full max-h-[90vh] rounded-lg"
                        />
                        <button
                            onClick={closeModal}
                            className="absolute -top-3 -right-3 text-white bg-black bg-opacity-50 rounded-full p-2 hover:bg-opacity-75 transition-colors"
                            aria-label="Fermer"
                        >
                            <XIcon className="w-6 h-6" />
                        </button>
                    </div>
                </div>
            )}
        </>
    );
};

export default ImageWithPreview;
