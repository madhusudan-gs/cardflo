import { useRef, useCallback, useState, useEffect } from "react";
import { Button } from "@/components/ui/shared";
import { Camera, RefreshCw, Loader2 } from "lucide-react";

interface ScannerScreenProps {
    onCapture: (imageBase64: string) => void;
    onCancel: () => void;
}

export function ScannerScreen({ onCapture, onCancel }: ScannerScreenProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const lastFrameRef = useRef<ImageData | null>(null);
    const stabilityCountRef = useRef(0);

    const [stream, setStream] = useState<MediaStream | null>(null);
    const [isAutoCapturing, setIsAutoCapturing] = useState(false);
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        let currentStream: MediaStream | null = null;

        const startCameraInstance = async () => {
            try {
                const mediaStream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        facingMode: "environment",
                        width: { ideal: 1920 },
                        height: { ideal: 1080 }
                    },
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
                const imageBase64 = canvas.toDataURL("image/jpeg", 0.95); // High quality
                onCapture(imageBase64);
            }
        }
    }, [onCapture]);

    // Auto-capture logic
    useEffect(() => {
        const interval = setInterval(() => {
            if (!videoRef.current || !canvasRef.current || isAutoCapturing) return;

            const video = videoRef.current;
            if (video.readyState !== video.HAVE_ENOUGH_DATA) return;

            // Use a small hidden canvas for stability check
            const checkCanvas = document.createElement('canvas');
            checkCanvas.width = 100;
            checkCanvas.height = 100;
            const ctx = checkCanvas.getContext('2d');
            if (!ctx) return;

            // Draw center portion
            ctx.drawImage(video, video.videoWidth / 4, video.videoHeight / 4, video.videoWidth / 2, video.videoHeight / 2, 0, 0, 100, 100);
            const currentFrame = ctx.getImageData(0, 0, 100, 100);

            if (lastFrameRef.current) {
                let diff = 0;
                for (let i = 0; i < currentFrame.data.length; i += 4) {
                    diff += Math.abs(currentFrame.data[i] - lastFrameRef.current.data[i]);
                }

                const threshold = 150000; // Adjust based on testing
                if (diff < threshold) {
                    stabilityCountRef.current += 1;
                    setProgress(Math.min((stabilityCountRef.current / 4) * 100, 100)); // ~2 seconds stability

                    if (stabilityCountRef.current >= 4) {
                        setIsAutoCapturing(true);
                        capture();
                    }
                } else {
                    stabilityCountRef.current = 0;
                    setProgress(0);
                }
            }
            lastFrameRef.current = currentFrame;
        }, 500);

        return () => clearInterval(interval);
    }, [capture, isAutoCapturing]);

    return (
        <div className="fixed inset-0 bg-black flex flex-col z-50">
            <div className="relative flex-1 overflow-hidden">
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="absolute inset-0 w-full h-full object-cover"
                />
                <canvas ref={canvasRef} className="hidden" />

                {/* Overlay Guide */}
                <div className="absolute inset-0 border-[40px] border-black/50 pointer-events-none flex items-center justify-center">
                    <div className="w-full h-64 border-2 border-emerald-500/30 rounded-lg relative">
                        <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-emerald-400"></div>
                        <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-emerald-400"></div>
                        <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-emerald-400"></div>
                        <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-emerald-400"></div>

                        <div className="absolute inset-0 flex flex-col items-center justify-center space-y-2">
                            <p className="text-emerald-400 text-xs font-medium tracking-widest uppercase bg-black/40 px-3 py-1 rounded-full backdrop-blur-sm">
                                {progress > 0 ? "Hold Still..." : "Position Card"}
                            </p>
                            {progress > 0 && (
                                <div className="w-32 h-1 bg-white/10 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-emerald-500 transition-all duration-300"
                                        style={{ width: `${progress}%` }}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="h-32 bg-slate-950 flex items-center justify-between px-8">
                <Button variant="ghost" onClick={onCancel} className="text-white hover:bg-white/10">
                    Cancel
                </Button>

                <div className="relative flex items-center justify-center">
                    {/* Progress Ring */}
                    <svg className="w-24 h-24 absolute -rotate-90 pointer-events-none">
                        <circle
                            cx="48"
                            cy="48"
                            r="42"
                            stroke="currentColor"
                            strokeWidth="4"
                            fill="transparent"
                            className="text-white/10"
                        />
                        <circle
                            cx="48"
                            cy="48"
                            r="42"
                            stroke="currentColor"
                            strokeWidth="4"
                            fill="transparent"
                            strokeDasharray={264}
                            strokeDashoffset={264 - (progress / 100) * 264}
                            className="text-emerald-500 transition-all duration-300"
                        />
                    </svg>
                    <button
                        onClick={capture}
                        disabled={isAutoCapturing}
                        className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center relative group z-10"
                    >
                        <div className="w-16 h-16 bg-white rounded-full transition-transform group-active:scale-90" />
                        {isAutoCapturing && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-full">
                                <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
                            </div>
                        )}
                    </button>
                </div>

                <div className="w-20" /> {/* Spacer */}
            </div>
        </div>
    );
}
