import React, { useRef, useState, useCallback, useEffect } from 'react';
import Button from './Button';

interface CameraCaptureProps {
    onCapture: (blob: Blob) => void;
    onClose: () => void;
    shape?: 'circle' | 'rectangle';
}

const CameraCapture: React.FC<CameraCaptureProps> = ({ onCapture, onClose, shape = 'rectangle' }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [error, setError] = useState<string | null>(null);

    const startCamera = useCallback(async () => {
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
            }
            setStream(mediaStream);
        } catch (err) {
            console.error("Error accessing camera:", err);
            setError("Impossible d'accéder à la caméra. Veuillez vérifier les autorisations.");
        }
    }, []);

    const stopCamera = useCallback(() => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }
    }, [stream]);

    useEffect(() => {
        startCamera();
        return () => {
            stopCamera();
        };
    }, [startCamera, stopCamera]);

    const handleCapture = () => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const context = canvas.getContext('2d');
            if (context) {
                context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
                canvas.toBlob((blob) => {
                    if (blob) {
                        onCapture(blob);
                    }
                }, 'image/jpeg');
            }
        }
    };

    const videoPreview = () => {
        if (shape === 'circle') {
            return (
                <div className="flex justify-center mb-4">
                    <div className="relative w-64 h-64 overflow-hidden rounded-full border-4 border-white shadow-lg bg-black">
                        <video 
                            ref={videoRef} 
                            autoPlay 
                            playsInline 
                            className="w-full h-full object-cover" 
                        />
                    </div>
                </div>
            );
        }
        
        // default rectangle
        return (
            <video ref={videoRef} autoPlay playsInline className="w-full h-auto rounded-md bg-black" />
        );
    };

    return (
        <div className="bg-gray-100 p-4 rounded-lg">
            {error ? (
                <div className="text-red-600 text-center p-8 bg-red-50 rounded-md">{error}</div>
            ) : (
                videoPreview()
            )}
            <canvas ref={canvasRef} style={{ display: 'none' }} />
            <div className="mt-4 flex justify-center space-x-4">
                <Button variant="secondary" onClick={onClose}>Annuler</Button>
                <Button onClick={handleCapture} disabled={!stream || !!error}>
                    Prendre la photo
                </Button>
            </div>
        </div>
    );
};

export default CameraCapture;