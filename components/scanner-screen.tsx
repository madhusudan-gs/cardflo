import { useRef, useCallback, useState, useEffect } from "react";
import { Button } from "@/components/ui/shared";
import { Camera, RefreshCw, Loader2, Sparkles } from "lucide-react";
import { detectSteadyCard } from "@/lib/gemini";

interface ScannerScreenProps {
    onCapture: (imageBase64: string) => void;
    onCancel: () => void;
}

export function ScannerScreen({ onCapture, onCancel }: ScannerScreenProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const detectionCanvasRef = useRef<HTMLCanvasElement | null>(null);

    const streamRef = useRef<MediaStream | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [status, setStatus] = useState<"IDLE" | "DETECTING" | "STEADY" | "CAPTURING">("IDLE");

    // Refs for loop state to avoid closure staleness (matches prototype logic)
    const statusRef = useRef(status);
    const isProcessingRef = useRef(isProcessing);

    useEffect(() => { statusRef.current = status; }, [status]);
    useEffect(() => { isProcessingRef.current = isProcessing; }, [isProcessing]);

    const stopCamera = useCallback(() => {
        if (streamRef.current) {
            console.log("Scanner: Stopping camera tracks");
            streamRef.current.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
        }
    }, []);

    // Initialize detection canvas
    useEffect(() => {
        detectionCanvasRef.current = document.createElement('canvas');
        detectionCanvasRef.current.width = 480;
        detectionCanvasRef.current.height = 480;
    }, []);

    const startCamera = useCallback(async () => {
        if (streamRef.current) return;
        try {
            console.log("Scanner: Requesting camera access");
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: "environment",
                    width: { ideal: 1920 },
                    height: { ideal: 1080 }
                },
            });
            streamRef.current = mediaStream;
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
            }
        } catch (err) {
            console.error("Error accessing camera:", err);
            alert("Could not access camera. Please allow permissions.");
        }
    }, []);

    useEffect(() => {
        startCamera();

        const handleVisibilityChange = () => {
            if (document.hidden) {
                console.log("Scanner: Tab hidden, pausing camera");
                stopCamera();
            } else {
                console.log("Scanner: Tab visible, restarting camera");
                startCamera();
            }
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);
        window.addEventListener("pagehide", stopCamera);

        return () => {
            console.log("Scanner: Unmounting, cleaning up camera");
            stopCamera();
            document.removeEventListener("visibilitychange", handleVisibilityChange);
            window.removeEventListener("pagehide", stopCamera);
        };
    }, [startCamera, stopCamera]);

    const captureFullRes = useCallback(() => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const context = canvas.getContext("2d");
            if (context) {
                context.drawImage(video, 0, 0, canvas.width, canvas.height);
                // Prototype Logic: EXTRACTION_QUALITY: 0.95
                const imageBase64 = canvas.toDataURL("image/jpeg", 0.95);
                onCapture(imageBase64);
            }
        }
    }, [onCapture]);

    // AI Search Loop (1500ms) - Increased frequency for "smoothness"
    useEffect(() => {
        const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
        if (!apiKey) {
            console.error("Scanner: Missing NEXT_PUBLIC_GEMINI_API_KEY");
            return;
        }

        console.log("Scanner: Starting AI Search Loop");

        const interval = setInterval(async () => {
            // Check refs and isProcessing status
            if (!videoRef.current || !detectionCanvasRef.current) return;
            if (statusRef.current === "CAPTURING" || statusRef.current === "STEADY") return;
            if (isProcessingRef.current) return;

            const video = videoRef.current;
            // Robust Capture: Check readyState === 4 (HAVE_ENOUGH_DATA)
            if (video.readyState !== 4) return;

            const ctx = detectionCanvasRef.current.getContext('2d', { willReadFrequently: true });
            if (!ctx) return;

            // Detection Stage: Prototype uses 0.5x scale
            setIsProcessing(true);

            try {
                const vW = video.videoWidth;
                const vH = video.videoHeight;
                if (vW === 0 || vH === 0) return;

                // Prototype Logic: PREVIEW_SCALE: 0.5
                detectionCanvasRef.current.width = vW * 0.5;
                detectionCanvasRef.current.height = vH * 0.5;

                ctx.drawImage(video, 0, 0, detectionCanvasRef.current.width, detectionCanvasRef.current.height);
                // Lower quality to 0.3 for faster transit
                const detectionImage = detectionCanvasRef.current.toDataURL("image/jpeg", 0.3);

                console.log("Scanner: AI checking frame...");
                const { is_steady, card_present } = await detectSteadyCard(detectionImage, apiKey);

                if (card_present && is_steady) {
                    console.log("Scanner: Steady state reached! Capturing HD...");
                    setStatus("STEADY");
                    clearInterval(interval);
                    setStatus("CAPTURING");
                    captureFullRes();
                } else if (!card_present) {
                    setStatus("IDLE");
                } else {
                    setStatus("DETECTING");
                }
            } catch (err) {
                console.error("Scanner: Detection loop error:", err);
            } finally {
                setIsProcessing(false);
            }
        }, 1500); // Increased to 1500ms for stability against 429 errors

        return () => {
            console.log("Scanner: Clearing AI Search Loop");
            clearInterval(interval);
        };
    }, [captureFullRes]);

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
                    <div className={`w-full h-64 border-2 rounded-lg relative transition-colors duration-500 ${status === "STEADY" || status === "CAPTURING" ? "border-emerald-400" :
                        status === "DETECTING" ? "border-cyan-400" : "border-white/20"
                        }`}>
                        <div className={`absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 transition-colors ${status === "STEADY" || status === "CAPTURING" ? "border-emerald-400" : "border-cyan-400"
                            }`}></div>
                        <div className={`absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 transition-colors ${status === "STEADY" || status === "CAPTURING" ? "border-emerald-400" : "border-cyan-400"
                            }`}></div>
                        <div className={`absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 transition-colors ${status === "STEADY" || status === "CAPTURING" ? "border-emerald-400" : "border-cyan-400"
                            }`}></div>
                        <div className={`absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 transition-colors ${status === "STEADY" || status === "CAPTURING" ? "border-emerald-400" : "border-cyan-400"
                            }`}></div>

                        <div className="absolute inset-0 flex flex-col items-center justify-center space-y-3">
                            {isProcessing && (
                                <div className="absolute top-8 left-8 right-8 flex items-center justify-center animate-in fade-in duration-300">
                                    <div className="flex items-center gap-2 bg-emerald-500/20 px-6 py-2 rounded-full border border-emerald-500/30 backdrop-blur-md">
                                        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                                        <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Sensing card... hold steady</span>
                                    </div>
                                </div>
                            )}
                            {(status === "STEADY" || status === "CAPTURING") && (
                                <div className="flex items-center gap-2 bg-emerald-500/20 px-4 py-2 rounded-full backdrop-blur-md border border-emerald-500/30">
                                    <div className="w-2 h-2 bg-emerald-400 rounded-full animate-ping" />
                                    <span className="text-emerald-400 text-xs font-bold tracking-widest uppercase">Steady!</span>
                                </div>
                            )}
                        </div>

                        {/* Scanning Laser Line */}
                        <div className={`absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent transition-opacity duration-300 ${isProcessing ? "opacity-100 scan-laser" : "opacity-0"}`} />
                    </div>
                </div>
            </div>

            <div className="h-32 bg-slate-950 flex items-center justify-between px-8">
                <Button variant="ghost" onClick={onCancel} className="text-white hover:bg-white/10">
                    Cancel
                </Button>

                <div className="relative flex items-center justify-center">
                    <button
                        onClick={captureFullRes}
                        disabled={status === "CAPTURING"}
                        className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center relative group z-10"
                    >
                        <div className={`w-16 h-16 rounded-full transition-all ${status === "CAPTURING" ? "bg-emerald-500 scale-90" : "bg-white group-active:scale-95"
                            }`} />
                        {status === "CAPTURING" && (
                            <div className="absolute inset-0 flex items-center justify-center rounded-full">
                                <Loader2 className="w-8 h-8 text-white animate-spin" />
                            </div>
                        )}
                    </button>

                    <div className="absolute -bottom-6 text-[10px] text-slate-500 uppercase tracking-tighter">
                        {status === "CAPTURING" ? "Capturing HD..." : "Autocapture Active"}
                    </div>
                </div>

                <div className="w-20" /> {/* Spacer */}
            </div>

            <style jsx>{`
                .scan-laser {
                    animation: scan 2s linear infinite;
                    position: absolute;
                    width: 100%;
                }
                @keyframes scan {
                    0% { top: 0; }
                    100% { top: 100%; }
                }
            `}</style>
        </div>
    );
}
