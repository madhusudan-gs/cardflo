import { useRef, useCallback, useState, useEffect } from "react";
import { Button } from "@/components/ui/shared";
import { Camera, RefreshCw, Loader2, Sparkles } from "lucide-react";


// Helper function to quickly score the sharpness/focus of a video frame 
// by analyzing pixel intensity differences (basic edge detection).
const calculateSharpness = (video: HTMLVideoElement): number => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return 0;

    // Scale down to 200px width for fast processing without blocking the UI thread
    canvas.width = 200;
    canvas.height = Math.floor(200 * (video.videoHeight / video.videoWidth)) || 200;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    let totalScore = 0;
    let count = 0;
    const width = canvas.width;

    for (let y = 0; y < canvas.height - 1; y++) {
        for (let x = 0; x < canvas.width - 1; x++) {
            const i = (y * width + x) * 4;
            const rightI = (y * width + (x + 1)) * 4;
            const bottomI = ((y + 1) * width + x) * 4;

            // Grayscale approx
            const p = (data[i] + data[i + 1] + data[i + 2]) / 3;
            const rightP = (data[rightI] + data[rightI + 1] + data[rightI + 2]) / 3;
            const bottomP = (data[bottomI] + data[bottomI + 1] + data[bottomI + 2]) / 3;

            // Sum of absolute differences between adjacent pixels
            totalScore += Math.abs(p - rightP) + Math.abs(p - bottomP);
            count++;
        }
    }

    return count > 0 ? totalScore / count : 0;
};

interface ScannerScreenProps {
    onCapture: (imageBase64: string) => void;
    onCancel: () => void;
}

export function ScannerScreen({ onCapture, onCancel }: ScannerScreenProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const detectionCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const guideRef = useRef<HTMLDivElement>(null);

    const streamRef = useRef<MediaStream | null>(null);
    const isStartingRef = useRef<boolean>(false);

    const [isProcessing, setIsProcessing] = useState(false);
    const [status, setStatus] = useState<"IDLE" | "DETECTING" | "STEADY" | "CAPTURING">("IDLE");

    // Refs for loop state to avoid closure staleness (matches prototype logic)
    const statusRef = useRef(status);
    const isProcessingRef = useRef(isProcessing);

    // Crucial fix: store onCapture and onCancel in refs so their identity changing
    // doesn't cause the AI polling or camera `useEffect` to tear down and restart endlessly.
    const onCaptureRef = useRef(onCapture);
    const onCancelRef = useRef(onCancel);
    useEffect(() => {
        onCaptureRef.current = onCapture;
        onCancelRef.current = onCancel;
    }, [onCapture, onCancel]);

    useEffect(() => { statusRef.current = status; }, [status]);
    useEffect(() => { isProcessingRef.current = isProcessing; }, [isProcessing]);

    const stopCamera = useCallback(() => {
        console.log("Scanner: Stopping camera tracks");
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
        }
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
    }, []);

    // Initialize detection canvas
    useEffect(() => {
        detectionCanvasRef.current = document.createElement('canvas');
        detectionCanvasRef.current.width = 480;
        detectionCanvasRef.current.height = 480;
    }, []);

    const startCamera = useCallback(async () => {
        if (streamRef.current || isStartingRef.current) return;

        isStartingRef.current = true;
        try {
            console.log("Scanner: Requesting camera access");
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: { ideal: "environment" },
                    width: { ideal: 1920 },
                    height: { ideal: 1080 }
                },
            });

            // If the camera was stopped while we were waiting for permissions
            if (!isStartingRef.current) {
                console.log("Scanner: Camera access granted but component unmounted, stopping tracks.");
                mediaStream.getTracks().forEach(track => track.stop());
                return;
            }

            streamRef.current = mediaStream;
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
                try {
                    await videoRef.current.play();
                } catch (e) {
                    console.warn("Scanner: Auto-play prevented or failed", e);
                }
            }
        } catch (err: any) {
            console.error("Scanner Error accessing camera:", err);
            // Handle iOS specific NotAllowedError or other errors gracefully
            if (err.name === "NotAllowedError") {
                alert("Camera permission denied. Please enable camera access in your browser settings and try again.");
            } else if (err.name === "NotFoundError") {
                alert("No camera device found on this system.");
            } else {
                alert("Could not access camera. Please allow permissions and try again.");
            }
            onCancelRef.current(); // Automatically exit scanner if broken
        } finally {
            isStartingRef.current = false;
        }
    }, []);

    useEffect(() => {
        startCamera();

        return () => {
            console.log("Scanner: Unmounting, cleaning up camera");
            isStartingRef.current = false; // Signal any pending getUserMedia to abort
            stopCamera();
        };
    }, [startCamera, stopCamera]);

    const captureFullRes = useCallback(async (isManual: boolean = false) => {
        if (videoRef.current && canvasRef.current && guideRef.current) {
            const video = videoRef.current;
            if (video.videoWidth === 0 || video.videoHeight === 0) return;

            setStatus("CAPTURING");

            // If manual capture, attempt to apply hardware zoom first
            if (isManual && streamRef.current) {
                try {
                    const track = streamRef.current.getVideoTracks()[0];
                    if (track) {
                        const capabilities: any = track.getCapabilities ? track.getCapabilities() : {};
                        if (capabilities && capabilities.zoom) {
                            // Apply a 2x zoom (or max if less than 2x)
                            const targetZoom = Math.min(2, capabilities.zoom.max || 2);
                            console.log(`Scanner: Applying manual hardware zoom: ${targetZoom}x`);
                            await track.applyConstraints({
                                advanced: [{ zoom: targetZoom }] as any
                            });
                            // Wait for optics to adjust and auto-focus
                            await new Promise(resolve => setTimeout(resolve, 600));
                        } else {
                            console.log("Scanner: Hardware zoom not supported by this lens.");
                        }
                    }
                } catch (e) {
                    console.error("Scanner: Could not apply hardware zoom", e);
                }
            }

            const canvas = canvasRef.current;

            try {
                // Burst Capture: Take 5 frames over ~750ms and pick the sharpest one!
                let bestFrameBase64 = "";
                let bestScore = -1;
                const burstCount = 5;
                const delayBetweenFramesMs = 150;

                console.log(`Scanner: Starting burst capture of ${burstCount} frames...`);

                for (let i = 0; i < burstCount; i++) {
                    if (i > 0) {
                        await new Promise(resolve => setTimeout(resolve, delayBetweenFramesMs));
                    }

                    const score = calculateSharpness(video);

                    canvas.width = video.videoWidth;
                    canvas.height = video.videoHeight;
                    const context = canvas.getContext("2d");
                    if (context) {
                        context.drawImage(video, 0, 0, canvas.width, canvas.height);
                        const frameBase64 = canvas.toDataURL("image/jpeg", 0.95);

                        console.log(`Scanner: Burst frame ${i + 1}/${burstCount}, sharpness score: ${score.toFixed(2)}`);
                        if (score > bestScore) {
                            bestScore = score;
                            bestFrameBase64 = frameBase64;
                        }
                    }
                }

                console.log(`Scanner: Burst complete. Selected clearest frame with score: ${bestScore.toFixed(2)}`);
                if (bestFrameBase64) {
                    onCaptureRef.current(bestFrameBase64);
                }
            } catch (err) {
                console.error("Scanner: Cropping failed, falling back to full resolution", err);

                // Fallback to full resolution without crop
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                const context = canvas.getContext("2d");
                if (context) {
                    context.drawImage(video, 0, 0, canvas.width, canvas.height);
                    const imageBase64 = canvas.toDataURL("image/jpeg", 0.95);
                    onCaptureRef.current(imageBase64);
                }
            }
        }
    }, []);

    // AI-Based Card Detection Loop (2000ms) - Only fires if an actual card is visible
    useEffect(() => {
        console.log("Scanner: Starting AI Detection Loop");

        const interval = setInterval(async () => {
            if (!videoRef.current || !detectionCanvasRef.current) return;

            // Only process frames when we are actively idling/waiting for a card.
            // If we are already detecting or capturing, ignore.
            if (statusRef.current !== "IDLE") return;

            const video = videoRef.current;
            if (video.readyState !== 4) return;

            const ctx = detectionCanvasRef.current.getContext('2d');
            if (!ctx) return;

            try {
                const vW = video.videoWidth;
                const vH = video.videoHeight;
                if (vW === 0 || vH === 0) return;

                // Downsample slightly for network upload, but keep resolution high enough to read handheld cards
                const sampleScale = 0.75;
                detectionCanvasRef.current.width = vW * sampleScale;
                detectionCanvasRef.current.height = vH * sampleScale;

                ctx.drawImage(video, 0, 0, vW * sampleScale, vH * sampleScale);
                const base64Image = detectionCanvasRef.current.toDataURL("image/jpeg", 0.7);

                setIsProcessing(true);
                // Switch to detecting while we await network so we don't spam multiple calls
                setStatus("DETECTING");

                const response = await fetch('/api/extract/detect', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ imageBase64: base64Image })
                });

                if (!response.ok) throw new Error('Failed to detect card');
                const result = await response.json();

                if (result && result.card_present) {
                    console.log("Scanner: AI verified card presence! Capturing HD...");
                    setStatus("STEADY");

                    clearInterval(interval); // Disable further searching

                    // Small delay so UI displays "Steady!" feedback
                    setTimeout(() => {
                        setStatus("CAPTURING");
                        captureFullRes(false);
                    }, 500);
                } else {
                    // No card found, reset to IDLE so the next loop can fire
                    setStatus("IDLE");
                }
            } catch (err) {
                console.error("Scanner: AI Detection loop error:", err);
                setStatus("IDLE"); // Reset on error to prevent locking
            } finally {
                setIsProcessing(false);
            }
        }, 2000); // 2 Second interval completely stabilizes the UI

        return () => {
            console.log("Scanner: Clearing AI Detection Loop");
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
                    muted
                    className="absolute inset-0 w-full h-full object-cover"
                />
                <canvas ref={canvasRef} className="hidden" />

                {/* Overlay Guide */}
                <div className="absolute inset-0 border-[40px] border-black/50 pointer-events-none flex items-center justify-center">
                    <div ref={guideRef} className={`w-full h-64 border-2 rounded-lg relative transition-colors duration-500 ${status === "STEADY" || status === "CAPTURING" ? "border-emerald-400" :
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
                            {status === "IDLE" && !isProcessing && (
                                <div className="absolute top-8 left-8 right-8 flex items-center justify-center animate-in fade-in duration-300">
                                    <div className="flex items-center gap-2 bg-black/40 px-6 py-2 rounded-full border border-white/10 backdrop-blur-md">
                                        <span className="text-[10px] font-black text-white/70 uppercase tracking-widest">Align card in frame</span>
                                    </div>
                                </div>
                            )}
                            {status === "DETECTING" && (
                                <div className="absolute top-8 left-8 right-8 flex items-center justify-center animate-in fade-in duration-300">
                                    <div className="flex items-center gap-2 bg-cyan-500/20 px-6 py-2 rounded-full border border-cyan-500/30 backdrop-blur-md">
                                        <div className="w-2 h-2 bg-cyan-500 rounded-full animate-pulse"></div>
                                        <span className="text-[10px] font-black text-cyan-500 uppercase tracking-widest">Sensing card...</span>
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
                        <div className={`absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent transition-opacity duration-300 ${isProcessing && status === "DETECTING" ? "opacity-100 scan-laser" : "opacity-0"}`} />
                    </div>
                </div>
            </div>

            <div className="h-32 bg-slate-950 flex items-center justify-between px-8">
                <Button variant="ghost" onClick={onCancel} className="text-white hover:bg-white/10">
                    Cancel
                </Button>

                <div className="relative flex items-center justify-center">
                    <button
                        onClick={() => captureFullRes(true)}
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
