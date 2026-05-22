import { useEffect, useRef, useState, useCallback } from "react";
import { ZoomIn, ZoomOut, Camera, Maximize, Target } from 'lucide-react';

interface MediaStreamerProps {
  onAudioData: (base64: string) => void;
  onVideoFrame: (base64: string) => void;
  isActive: boolean;
  facingMode?: "user" | "environment";
  onFaceGaze?: (gaze: { x: number; y: number } | null) => void;
}

export function MediaStreamer({ onAudioData, onVideoFrame, isActive, facingMode = "user", onFaceGaze }: MediaStreamerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  
  const [zoom, setZoom] = useState(1);
  const [capabilities, setCapabilities] = useState<any>(null);
  const [detectedFaces, setDetectedFaces] = useState<any[]>([]);
  const detectorRef = useRef<any>(null);
  const smoothFaceRef = useRef({ x: 160, y: 120, initialized: false });

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

      let stream: MediaStream;
      try {
        // Tier 1: Request video & audio
        stream = await navigator.mediaDevices.getUserMedia({
          video: { 
            width: { ideal: 1280 }, 
            height: { ideal: 720 },
            facingMode: facingMode
          },
          audio: true
        });
      } catch (firstErr) {
        console.warn("Dual-hardware streaming acquisition failed, falling back to video-only:", firstErr);
        try {
          // Tier 2: Video-only stream query
          stream = await navigator.mediaDevices.getUserMedia({
            video: { 
              width: { ideal: 1280 }, 
              height: { ideal: 720 },
              facingMode: facingMode
            },
            audio: false
          });
        } catch (secondErr) {
          console.warn("Video hardware streaming acquisition failed, falling back to audio-only:", secondErr);
          // Tier 3: Audio-only stream query (no camera feed)
          stream = await navigator.mediaDevices.getUserMedia({
            video: false,
            audio: true
          });
        }
      }
      
      streamRef.current = stream;

      const hasVideo = stream.getVideoTracks().length > 0;
      const hasAudio = stream.getAudioTracks().length > 0;

      if (hasVideo) {
        const track = stream.getVideoTracks()[0];
        const caps = track.getCapabilities ? track.getCapabilities() : {};
        setCapabilities(caps);

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } else {
        setCapabilities(null);
        if (videoRef.current) {
          videoRef.current.srcObject = null;
        }
      }

      // Audio processing (only if an active sound track was resolved)
      if (hasAudio) {
        try {
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
        } catch (audioErr) {
          console.error("Failed to initialize system audio graph context:", audioErr);
        }
      }

      // Video processing & Face Detection loop
      const captureFrame = async () => {
        if (!isActive) return;
        if (!streamRef.current || streamRef.current.getVideoTracks().length === 0) {
          // No active video track is available, skip visual processing frame captures
          setTimeout(captureFrame, 1000);
          return;
        }

        if (videoRef.current && canvasRef.current) {
          const context = canvasRef.current.getContext('2d');
          if (context) {
            context.drawImage(videoRef.current, 0, 0, 320, 240);
            const base64 = canvasRef.current.toDataURL('image/jpeg', 0.5).split(',')[1];
            onVideoFrame(base64);

            // Face Detection & Fallback skin tone centroid tracking
            let facesToSet: any[] = [];
            
            if (detectorRef.current && videoRef.current.readyState >= 2) {
                try {
                    facesToSet = await detectorRef.current.detect(videoRef.current);
                } catch (e) {
                    console.warn("Face detection error:", e);
                }
            }

            // Fallback tracking algorithm if native face detection is unavailable or returns no candidates
            if (facesToSet.length === 0) {
              try {
                const imgData = context.getImageData(0, 0, 320, 240);
                const data = imgData.data;
                let sumX = 0;
                let sumY = 0;
                let count = 0;
                
                // Downsample pixel array scan by 4 for 60fps-equivalent performance and instant lookup
                for (let y = 0; y < 240; y += 4) {
                  for (let x = 0; x < 320; x += 4) {
                    const idx = (y * 320 + x) * 4;
                    const r = data[idx];
                    const g = data[idx + 1];
                    const b = data[idx + 2];
                    
                    // Dynamic biological skin frequency mapping boundaries in standard sRGB spectrum
                    if (r > 60 && g > 40 && b > 20 && r > g && r > b && (r - g) > 10 && (r - b) > 10) {
                      sumX += x;
                      sumY += y;
                      count++;
                    }
                  }
                }
                
                if (count > 60) {
                  const rawFaceX = sumX / count;
                  const rawFaceY = sumY / count;
                  
                  if (!smoothFaceRef.current.initialized) {
                    smoothFaceRef.current = { x: rawFaceX, y: rawFaceY, initialized: true };
                  } else {
                    smoothFaceRef.current.x = smoothFaceRef.current.x * 0.75 + rawFaceX * 0.25;
                    smoothFaceRef.current.y = smoothFaceRef.current.y * 0.75 + rawFaceY * 0.25;
                  }
                  
                  facesToSet = [{
                    boundingBox: {
                      x: smoothFaceRef.current.x - 40,
                      y: smoothFaceRef.current.y - 50,
                      width: 80,
                      height: 100
                    },
                    source: 'backup_stencil'
                  }];
                } else {
                  // Slowly drift gaze to the absolute center grid point if tracking is lost
                  if (smoothFaceRef.current.initialized) {
                    smoothFaceRef.current.x = smoothFaceRef.current.x * 0.9 + 160 * 0.1;
                    smoothFaceRef.current.y = smoothFaceRef.current.y * 0.9 + 120 * 0.1;
                    facesToSet = [{
                      boundingBox: {
                        x: smoothFaceRef.current.x - 40,
                        y: smoothFaceRef.current.y - 50,
                        width: 80,
                        height: 100
                      },
                      source: 'backup_stencil'
                    }];
                  }
                }
              } catch (err) {
                console.warn("Fallback centroid tracker failed:", err);
              }
            } else {
              // Smooth out active native face coordinates coordinates as well
              const face = facesToSet[0];
              const vWidth = videoRef.current?.videoWidth || 320;
              const vHeight = videoRef.current?.videoHeight || 240;
              const rawFaceX = (face.boundingBox.x + face.boundingBox.width / 2) * (320 / vWidth);
              const rawFaceY = (face.boundingBox.y + face.boundingBox.height / 2) * (240 / vHeight);
              
              if (!smoothFaceRef.current.initialized) {
                smoothFaceRef.current = { x: rawFaceX, y: rawFaceY, initialized: true };
              } else {
                smoothFaceRef.current.x = smoothFaceRef.current.x * 0.75 + rawFaceX * 0.25;
                smoothFaceRef.current.y = smoothFaceRef.current.y * 0.75 + rawFaceY * 0.25;
              }
            }

            setDetectedFaces(facesToSet);

            // Forward the calculated user coordinate relative offsets [-1, +1]
            if (facesToSet.length > 0 && onFaceGaze) {
              const face = facesToSet[0];
              let cx = 0.5;
              let cy = 0.5;
              
              if (face.source === 'backup_stencil') {
                cx = (face.boundingBox.x + face.boundingBox.width / 2) / 320;
                cy = (face.boundingBox.y + face.boundingBox.height / 2) / 240;
              } else {
                const vWidth = videoRef.current?.videoWidth || 320;
                const vHeight = videoRef.current?.videoHeight || 240;
                cx = (face.boundingBox.x + face.boundingBox.width / 2) / vWidth;
                cy = (face.boundingBox.y + face.boundingBox.height / 2) / vHeight;
              }
              
              // Invert Gaze X so pupils look in the correct absolute direction (mirror mode matching)
              const gazeX = -((cx - 0.5) * 2);
              const gazeY = (cy - 0.5) * 2;
              
              onFaceGaze({
                x: Math.max(-1, Math.min(1, gazeX)),
                y: Math.max(-1, Math.min(1, gazeY))
              });
            } else if (onFaceGaze) {
              onFaceGaze(null);
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
            const widthDiv = face.source === 'backup_stencil' ? 320 : vWidth;
            const heightDiv = face.source === 'backup_stencil' ? 240 : vHeight;

            const style = {
              left: `${(face.boundingBox.x / widthDiv) * 100}%`,
              top: `${(face.boundingBox.y / heightDiv) * 100}%`,
              width: `${(face.boundingBox.width / widthDiv) * 100}%`,
              height: `${(face.boundingBox.height / heightDiv) * 100}%`,
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
