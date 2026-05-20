import { useEffect, useRef, useState, useCallback } from "react";
import { ZoomIn, ZoomOut, Camera, Maximize, Target } from 'lucide-react';

interface MediaStreamerProps {
  onAudioData: (base64: string) => void;
  onVideoFrame: (base64: string) => void;
  isActive: boolean;
  facingMode?: "user" | "environment";
}

export function MediaStreamer({ onAudioData, onVideoFrame, isActive, facingMode = "user" }: MediaStreamerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  
  const [zoom, setZoom] = useState(1);
  const [capabilities, setCapabilities] = useState<any>(null);
  const [detectedFaces, setDetectedFaces] = useState<any[]>([]);
  const detectorRef = useRef<any>(null);

  useEffect(() => {
    // Initialize Face Detector if available
    if ('FaceDetector' in window) {
      detectorRef.current = new (window as any).FaceDetector({
        maxFaces: 5,
        fastMode: true
      });
    }
  }, []);

  useEffect(() => {
    if (isActive) {
      startStream();
    } else {
      stopStream();
      setDetectedFaces([]);
    }
    return () => stopStream();
  }, [isActive, facingMode]);

  const startStream = async () => {
    try {
      // Stop existing stream before starting a new one (important for camera switching)
      stopStream();

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: { ideal: 1280 }, 
          height: { ideal: 720 },
          facingMode: facingMode
        },
        audio: true
      });
      streamRef.current = stream;

      const track = stream.getVideoTracks()[0];
      const caps = track.getCapabilities ? track.getCapabilities() : {};
      setCapabilities(caps);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      // Audio processing
      audioContextRef.current = new AudioContext({ sampleRate: 16000 });
      const source = audioContextRef.current.createMediaStreamSource(stream);
      processorRef.current = audioContextRef.current.createScriptProcessor(4096, 1, 1);

      processorRef.current.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        const pcmData = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          pcmData[i] = Math.max(-1, Math.min(1, inputData[i])) * 0x7FFF;
        }
        const base64 = btoa(String.fromCharCode(...new Uint8Array(pcmData.buffer)));
        onAudioData(base64);
      };

      source.connect(processorRef.current);
      processorRef.current.connect(audioContextRef.current.destination);

      // Video processing & Face Detection loop
      const captureFrame = async () => {
        if (!isActive) return;
        if (videoRef.current && canvasRef.current) {
          const context = canvasRef.current.getContext('2d');
          if (context) {
            context.drawImage(videoRef.current, 0, 0, 320, 240);
            const base64 = canvasRef.current.toDataURL('image/jpeg', 0.5).split(',')[1];
            onVideoFrame(base64);

            // Face Detection
            if (detectorRef.current && videoRef.current.readyState >= 2) {
                try {
                    const faces = await detectorRef.current.detect(videoRef.current);
                    setDetectedFaces(faces);
                } catch (e) {
                    console.warn("Face detection error:", e);
                }
            }
          }
        }
        setTimeout(captureFrame, 200); // 5 FPS for vision/detection
      };
      captureFrame();

    } catch (err) {
      console.error("Error accessing media devices:", err);
    }
  };

  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
  };

  const handleZoom = (direction: 'in' | 'out') => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track || !capabilities?.zoom) return;

    let newZoom = direction === 'in' ? zoom + 0.5 : zoom - 0.5;
    newZoom = Math.max(capabilities.zoom.min, Math.min(capabilities.zoom.max, newZoom));
    
    setZoom(newZoom);
    track.applyConstraints({ advanced: [{ zoom: newZoom } as any] });
  };

  const handleAutoFocus = () => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    
    // Some devices support focusMode: 'continuous' or 'manual'
    const focusSupported = (track.getCapabilities() as any).focusMode;
    if (focusSupported && focusSupported.includes('continuous')) {
        track.applyConstraints({ advanced: [{ focusMode: 'continuous' } as any] });
    }
  };

  const takeSnapshot = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        // High res snapshot
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0);
        
        const dataUrl = canvasRef.current.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = `eve-neurolink-snap-${Date.now()}.png`;
        link.href = dataUrl;
        link.click();

        // Reset canvas size for vision loop if needed (or just use a separate canvas ref)
        canvasRef.current.width = 320;
        canvasRef.current.height = 240;
      }
    }
  };

  return (
    <div className="relative w-full h-full overflow-hidden rounded-2xl bg-black/20 backdrop-blur-sm border border-white/10 group">
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className="w-full h-full object-cover"
      />
      <canvas ref={canvasRef} width={320} height={240} className="hidden" />
      
      {/* Neural HUD Overlay */}
      {isActive && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {detectedFaces.map((face, i) => {
            // Calculate relative positions
            const vWidth = videoRef.current?.videoWidth || 1;
            const vHeight = videoRef.current?.videoHeight || 1;
            const style = {
              left: `${(face.boundingBox.x / vWidth) * 100}%`,
              top: `${(face.boundingBox.y / vHeight) * 100}%`,
              width: `${(face.boundingBox.width / vWidth) * 100}%`,
              height: `${(face.boundingBox.height / vHeight) * 100}%`,
            };

            return (
              <div key={i} className="absolute border border-cyan-400/50 transition-all duration-150" style={style}>
                {/* Corner Markers */}
                <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-cyan-400" />
                <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-cyan-400" />
                <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-cyan-400" />
                <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-cyan-400" />
                
                {/* Identity Tag */}
                <div className="absolute -top-6 left-0 flex flex-col gap-0.5">
                  <div className="bg-cyan-500/80 px-1 text-[8px] font-mono text-black uppercase font-bold tracking-tighter">
                    Subject Identified
                  </div>
                  <div className="font-mono text-[7px] text-cyan-400 uppercase tracking-widest whitespace-nowrap bg-black/60 px-1">
                    CONF: {Math.floor(Math.random() * 20 + 78)}% // ID_{face.boundingBox.width.toFixed(0)}
                  </div>
                </div>

                {/* Sub-Scanning squares */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 border border-magenta-500/30 animate-ping" />
              </div>
            );
          })}

          {/* Global Scanline HUD */}
          <div className="absolute top-1/2 left-4 -translate-y-1/2 flex flex-col gap-1">
             <div className="flex items-center gap-2">
                <div className="w-1 h-3 bg-cyan-500 animate-pulse" />
                <span className="text-[8px] font-mono text-cyan-500/60 uppercase tracking-[0.3em]">Deep Learning Active</span>
             </div>
             <div className="text-[7px] font-mono text-white/20 uppercase tracking-widest pl-3">
                Pattern Matrix: {Math.random() > 0.5 ? 'SYNCED' : 'ANALYZING...'}
             </div>
          </div>
        </div>
      )}

      {/* HUD Info */}
      <div className="absolute top-4 left-4 flex flex-col gap-1">
        <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-none rotate-45 ${isActive ? 'bg-cyan-500 animate-pulse shadow-[0_0_8px_rgba(34,211,238,0.5)]' : 'bg-gray-500'}`} />
            <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-cyan-400/70">
            {isActive ? 'NEURAL SENSORS: ONLINE' : 'VISUAL FEED: DISCONNECTED'}
            </span>
        </div>
        {isActive && (
            <div className="flex flex-col gap-0.5 pl-4">
                <span className="text-[8px] font-mono text-white/30 uppercase tracking-widest">FPS: 4.8 // SCAN: {detectedFaces.length} ENTITY</span>
                {capabilities?.zoom && (
                    <span className="text-[9px] font-mono text-magenta-500/80 uppercase">MAGNIFICATION: {zoom.toFixed(1)}x</span>
                )}
            </div>
        )}
      </div>

      {/* Camera Controls Overlay */}
      {isActive && (
        <div className="absolute bottom-4 right-4 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          {capabilities?.zoom && (
            <>
              <button 
                onClick={() => handleZoom('in')}
                className="p-2 rounded-none bg-black/80 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 transition-all"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button 
                onClick={() => handleZoom('out')}
                className="p-2 rounded-none bg-black/80 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 transition-all"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
            </>
          )}
          <button 
            onClick={handleAutoFocus}
            className="p-2 rounded-none bg-black/80 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 transition-all"
            title="Auto Focus"
          >
            <Target className="w-4 h-4" />
          </button>
          <button 
            onClick={takeSnapshot}
            className="p-2 rounded-none bg-cyan-500 hover:bg-cyan-400 border border-cyan-300 text-black shadow-[0_0_15px_rgba(34,211,238,0.3)] transition-all"
            title="Capture Sync"
          >
            <Camera className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Decorative Frame */}
      <div className="absolute inset-0 border-[20px] border-transparent pointer-events-none">
        <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-cyan-500/40" />
        <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-cyan-500/40" />
        <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-cyan-500/40" />
        <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-cyan-500/40" />
      </div>
    </div>
  );
}
