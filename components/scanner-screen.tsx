import { useRef, useCallback, useState, useEffect } from "react";
import { Button } from "@/components/ui/shared";
import { Camera, RefreshCw } from "lucide-react";

interface ScannerScreenProps {
    onCapture: (imageBase64: string) => void;
    onCancel: () => void;
}

export function ScannerScreen({ onCapture, onCancel }: ScannerScreenProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);

    useEffect(() => {
        let currentStream: MediaStream | null = null;

        const startCameraInstance = async () => {
            try {
                const mediaStream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: "environment" },
                });
                currentStream = mediaStream;
                setStream(mediaStream);
                if (videoRef.current) {
                    videoRef.current.srcObject = mediaStream;
                }
            } catch (err) {
                console.error("Error accessing camera:", err);
                alert("Could not access camera. Please allow permissions.");
            }
        };

        startCameraInstance();

        return () => {
            if (currentStream) {
                currentStream.getTracks().forEach((track) => track.stop());
            }
        };
    }, []);

    const capture = useCallback(() => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;

            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;

            const context = canvas.getContext("2d");
            if (context) {
                context.drawImage(video, 0, 0, canvas.width, canvas.height);
                const imageBase64 = canvas.toDataURL("image/jpeg", 0.8);
                onCapture(imageBase64);
            }
        }
    }, [onCapture]);

    return (
        <div className="fixed inset-0 bg-black flex flex-col z-50">
            <div className="relative flex-1 overflow-hidden">
                {/* Helper Video Element */}
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="absolute inset-0 w-full h-full object-cover"
                />
                <canvas ref={canvasRef} className="hidden" />

                {/* Overlay Guide */}
                <div className="absolute inset-0 border-[40px] border-black/50 pointer-events-none flex items-center justify-center">
                    <div className="w-full h-64 border-2 border-emerald-500/50 rounded-lg relative">
                        <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-emerald-400 -mt-0.5 -ml-0.5"></div>
                        <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-emerald-400 -mt-0.5 -mr-0.5"></div>
                        <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-emerald-400 -mb-0.5 -ml-0.5"></div>
                        <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-emerald-400 -mb-0.5 -mr-0.5"></div>
                        <p className="text-emerald-400 text-xs text-center mt-2 font-medium tracking-widest uppercase opacity-80 backdrop-blur-sm bg-black/30 py-1">Position Card Here</p>
                    </div>
                </div>
            </div>

            <div className="h-32 bg-slate-950 flex items-center justify-between px-8 pb-4">
                <Button variant="ghost" size="icon" onClick={onCancel} className="text-white">
                    <span className="sr-only">Cancel</span>
                    Cancel
                </Button>

                <button
                    onClick={capture}
                    className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center relative group"
                >
                    <div className="w-16 h-16 bg-white rounded-full transition-transform group-active:scale-90" />
                </button>

                <Button variant="ghost" size="icon" onClick={() => {/* Toggle Camera Logic */ }} className="text-white opacity-50">
                    <RefreshCw className="w-6 h-6" />
                </Button>
            </div>
        </div>
    );
}
