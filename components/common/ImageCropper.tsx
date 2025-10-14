import React, { useState, useRef, useEffect } from 'react';
import ReactCrop, { type Crop, type PixelCrop, centerCrop, makeAspectCrop } from 'react-image-crop';
import Modal from './Modal';
import Button from './Button';

interface ImageCropperProps {
    imageSrc: string;
    onCropComplete: (croppedImageBlob: Blob) => void;
    onCancel: () => void;
    aspect?: number;
}

// Fonction pour dessiner l'image recadrée sur un canevas
function canvasPreview(
    image: HTMLImageElement,
    canvas: HTMLCanvasElement,
    crop: PixelCrop
) {
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        throw new Error('No 2d context');
    }

    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    const pixelRatio = window.devicePixelRatio;

    canvas.width = Math.floor(crop.width * scaleX * pixelRatio);
    canvas.height = Math.floor(crop.height * scaleY * pixelRatio);

    ctx.scale(pixelRatio, pixelRatio);
    ctx.imageSmoothingQuality = 'high';

    const cropX = crop.x * scaleX;
    const cropY = crop.y * scaleY;

    const centerX = image.naturalWidth / 2;
    const centerY = image.naturalHeight / 2;

    ctx.save();
    ctx.translate(-cropX, -cropY);
    ctx.translate(centerX, centerY);
    ctx.translate(-centerX, -centerY);
    ctx.drawImage(
        image,
        0,
        0,
        image.naturalWidth,
        image.naturalHeight,
        0,
        0,
        image.naturalWidth,
        image.naturalHeight
    );
    ctx.restore();
}


const ImageCropper: React.FC<ImageCropperProps> = ({ imageSrc, onCropComplete, onCancel, aspect = 1 }) => {
    const imgRef = useRef<HTMLImageElement>(null);
    const previewCanvasRef = useRef<HTMLCanvasElement>(null);
    const [crop, setCrop] = useState<Crop>();
    const [completedCrop, setCompletedCrop] = useState<PixelCrop>();

    function onImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
        if (aspect) {
            const { width, height } = e.currentTarget;
            setCrop(centerCrop(makeAspectCrop({ unit: '%', width: 90 }, aspect, width, height), width, height));
        }
    }
    
    useEffect(() => {
        if (completedCrop?.width && completedCrop?.height && imgRef.current && previewCanvasRef.current) {
            canvasPreview(imgRef.current, previewCanvasRef.current, completedCrop);
        }
    }, [completedCrop]);

    const handleConfirmCrop = () => {
        if (!previewCanvasRef.current) {
            return;
        }
        previewCanvasRef.current.toBlob((blob) => {
            if (blob) {
                onCropComplete(blob);
            }
        }, 'image/jpeg');
    };

    return (
        <Modal
            isOpen={true}
            onClose={onCancel}
            title="Ajuster la photo"
            size="lg"
            footer={
                <>
                    <Button variant="ghost" onClick={onCancel}>Annuler</Button>
                    <Button onClick={handleConfirmCrop} disabled={!completedCrop}>Valider</Button>
                </>
            }
        >
            <div className="space-y-4">
                 <p className="text-center text-sm text-gray-600">
                    Déplacez et redimensionnez le cadre pour ajuster la photo.
                </p>
                <div className="flex justify-center bg-slate-100 p-2 rounded-lg">
                    <ReactCrop
                        crop={crop}
                        onChange={(_, percentCrop) => setCrop(percentCrop)}
                        onComplete={(c) => setCompletedCrop(c)}
                        aspect={aspect}
                        circularCrop={aspect === 1}
                    >
                        <img
                            ref={imgRef}
                            alt="Crop me"
                            src={imageSrc}
                            onLoad={onImageLoad}
                            className="max-h-[50vh] object-contain"
                        />
                    </ReactCrop>
                </div>
                
                {completedCrop && (
                    <div className="mt-4">
                        <h4 className="text-center text-sm font-medium text-gray-600 mb-2">Aperçu</h4>
                        <div className="flex justify-center">
                            <canvas
                                ref={previewCanvasRef}
                                style={{
                                    objectFit: 'contain',
                                    width: 150,
                                    height: 150,
                                    borderRadius: aspect === 1 ? '50%' : '0',
                                }}
                            />
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
};

export default ImageCropper;