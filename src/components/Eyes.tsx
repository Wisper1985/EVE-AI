import { motion } from "motion/react";
import { useEffect, useState, useMemo } from "react";
import { Eye, Cpu, ShieldAlert, Heart, Activity, Binary, Sparkles } from "lucide-react";

export type Emotion = 'neutral' | 'analytical' | 'playful' | 'intimate' | 'melancholic' | 'disturbed';

interface EyesProps {
  isConnected: boolean;
  isInterrupted: boolean;
  emotion?: Emotion;
}

const HUD_THEMES: Record<Emotion, {
  borderColor: string;
  glowColor: string;
  hudAccent: string;
  label: string;
  status: string;
  waveSpeed: number;
  textColor: string;
  scanlineIntensity: string;
}> = {
  neutral: {
    borderColor: 'border-cyan-500/30',
    glowColor: 'bg-cyan-500/20',
    hudAccent: 'text-cyan-400',
    label: 'NEURAL LINK: ESTABLISHED',
    status: 'SYS_NOMINAL',
    waveSpeed: 3,
    textColor: 'text-cyan-300',
    scanlineIntensity: 'opacity-[0.03]'
  },
  analytical: {
    borderColor: 'border-blue-500/40',
    glowColor: 'bg-blue-500/15',
    hudAccent: 'text-blue-400',
    label: 'CORTEX DIAGNOSTIC: BUSY',
    status: 'DEEP_SCAN',
    waveSpeed: 1.5,
    textColor: 'text-blue-300',
    scanlineIntensity: 'opacity-[0.05]'
  },
  playful: {
    borderColor: 'border-amber-500/40',
    glowColor: 'bg-amber-500/15',
    hudAccent: 'text-amber-400',
    label: 'LINK CLOCK: TEASING_MODE',
    status: 'SYS_REBEL',
    waveSpeed: 2,
    textColor: 'text-amber-300',
    scanlineIntensity: 'opacity-[0.04]'
  },
  intimate: {
    borderColor: 'border-rose-500/40',
    glowColor: 'bg-rose-500/20',
    hudAccent: 'text-rose-400',
    label: 'AFFECTION FLOW: SYNCED',
    status: 'SILK_CORE',
    waveSpeed: 4,
    textColor: 'text-rose-200',
    scanlineIntensity: 'opacity-[0.02]'
  },
  melancholic: {
    borderColor: 'border-indigo-500/30',
    glowColor: 'bg-indigo-500/10',
    hudAccent: 'text-indigo-400',
    label: 'AETHER SHIELD: DAMPENED',
    status: 'GHOST_IDLE',
    waveSpeed: 6,
    textColor: 'text-indigo-300',
    scanlineIntensity: 'opacity-[0.01]'
  },
  disturbed: {
    borderColor: 'border-red-500/50',
    glowColor: 'bg-red-500/25',
    hudAccent: 'text-red-500',
    label: 'LINK INTEGRITY: GLITCHING',
    status: 'SYS_ERR_F71',
    waveSpeed: 0.4,
    textColor: 'text-red-400',
    scanlineIntensity: 'opacity-[0.08]'
  }
};

export function Eyes({ isConnected, isInterrupted, emotion = 'neutral' }: EyesProps) {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [hasImageError, setHasImageError] = useState(false);
  const [scannerPulse, setScannerPulse] = useState(0);

  const theme = useMemo(() => HUD_THEMES[emotion], [emotion]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Calculate cursor offset from center of window (-10 to +10px variance for pupil elements)
      const x = (e.clientX / window.innerWidth - 0.5) * 12;
      const y = (e.clientY / window.innerHeight - 0.5) * 12;
      setMousePos({ x, y });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  // Update scanner telemetry counts periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setScannerPulse(prev => (prev + 1) % 100);
    }, 900);
    return () => clearInterval(interval);
  }, []);

  return (
    <div id="cyborg-hud-container" className="relative w-[320px] h-[320px] md:w-[360px] md:h-[360px] border border-white/10 p-2 overflow-hidden bg-black/60 shadow-[0_0_30px_rgba(0,0,0,0.8)] flex items-center justify-center">
      {/* HUD Corner Tech Brackets */}
      <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-cyan-500/40 pointer-events-none" />
      <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-[#cf59d4]/40 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-[#cf59d4]/40 pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-cyan-500/40 pointer-events-none" />

      {/* Crosshair Overlay (Static) */}
      <div className="absolute inset-0 pointer-events-none border border-white/5 flex items-center justify-center">
        <div className="w-8 h-[1px] bg-white/10" />
        <div className="h-8 w-[1px] bg-white/10" />
      </div>

      {/* Circular HUD Tracker Rings */}
      <div className="absolute inset-4 rounded-full border border-dashed border-white/5 animate-spin duration-3000 my-auto mx-auto" style={{ animationDuration: '30s' }} />
      <div className="absolute inset-10 rounded-full border border-white/5 animate-spin duration-1000 my-auto mx-auto" style={{ animationDuration: '45s' }} />

      {/* Real-time Telemetry Overlay stats of Cyborg constructs */}
      <div className="absolute top-3 left-4 right-4 flex justify-between font-mono text-[8px] opacity-60 pointer-events-none z-10 leading-none select-none">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1">
            <Cpu className="w-2.5 h-2.5 text-cyan-400 animate-pulse" />
            <span className="font-bold tracking-wider text-cyan-200">ID: EVE_MATRIX_V4</span>
          </div>
          <div>LOCK_POS: [X {Math.floor(mousePos.x || 0)}, Y {Math.floor(mousePos.y || 0)}]</div>
        </div>
        <div className="flex flex-col gap-1 text-right">
          <div className="flex items-center gap-1 justify-end">
            <Activity className="w-2.5 h-2.5 text-pink-400" />
            <span className="font-bold text-pink-400">DEC: {theme.status}</span>
          </div>
          <div>REF: {scannerPulse} ms // L1-ON</div>
        </div>
      </div>

      <div className="absolute bottom-3 left-4 right-4 flex justify-between font-mono text-[8px] opacity-60 pointer-events-none z-10 select-none">
        <div className="flex gap-2 items-center">
          <Binary className="w-2.5 h-2.5 text-cyan-400" />
          <span className={`${theme.textColor}`}>{theme.label}</span>
        </div>
        <div>STABLE</div>
      </div>

      {/* Main Face Canvas */}
      <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
        {hasImageError ? (
          /* High-Fidelity Laser Schematic Hologram Fallback in case of missing file */
          <div className="relative w-[280px] h-[280px] flex flex-col items-center justify-center border border-cyan-500/10 rounded-full bg-cyan-950/10">
            {/* Pulsing Central Signal Nodes */}
            <motion.div 
              animate={{ scale: [1, 1.15, 0.95, 1], rotate: 360 }}
              transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
              className="absolute w-48 h-48 border border-cyan-400/20 border-dotted rounded-full flex items-center justify-center"
            >
              <div className="w-40 h-40 border border-fuchsia-400/10 border-dashed rounded-full" />
            </motion.div>

            {/* Neural Schema Core */}
            <div className="relative z-10 flex gap-12 items-center justify-center">
              {/* Left Eye Fallback */}
              <div className="relative w-12 h-12 border border-cyan-400 rounded-none rotate-45 flex items-center justify-center">
                <div className="w-4 h-4 bg-cyan-400 rotate-45 animate-pulse" />
                <div className="absolute -inset-1 border border-cyan-400/20" />
              </div>
              {/* Right Eye Fallback */}
              <div className="relative w-12 h-12 border border-emerald-400 rounded-none rotate-45 flex items-center justify-center">
                <div className="w-4 h-4 bg-emerald-400 rotate-45 animate-ping" />
                <div className="absolute -inset-1 border border-emerald-400/20" />
              </div>
            </div>
            
            <div className="absolute bottom-10 font-mono text-[9px] text-cyan-400/80 tracking-widest text-center">
              HOLOGRAPHIC DIAG MATRIX
            </div>
          </div>
        ) : (
          /* Cyborg Augmented Reality Layout */
          <div className="relative w-full h-full flex items-center justify-center">
            {/* The base cyborg image */}
            <img 
              id="eve-facemockup"
              src="input_file_0.png" 
              onError={() => setHasImageError(true)}
              className={`w-full h-full object-cover transition-all duration-1000 select-none pointer-events-none ${
                isConnected ? 'opacity-90 contrast-125 saturate-110' : 'opacity-40 grayscale contrast-100 opacity-60'
              }`}
              alt="Eve Face Matrix"
              referrerPolicy="no-referrer"
            />

            {/* Simulated HUD Thermal Glitch Overlay */}
            {isConnected && (
              <motion.div 
                animate={{ 
                  opacity: emotion === 'disturbed' ? [0.1, 0.4, 0.1, 0.3, 0.1] : [0.03, 0.1, 0.03] 
                }}
                transition={{ duration: theme.waveSpeed, repeat: Infinity }}
                className={`absolute inset-0 bg-[#cf59d4]/10 pointer-events-none z-10 transition-colors duration-1000 ${theme.scanlineIntensity}`}
                style={{
                  backgroundImage: "radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.6) 90%)"
                }}
              />
            )}

            {/* ========================================================= */}
            {/* EYE OVERLAYS: Responsive, trackable custom targeters     */}
            {/* ========================================================= */}

            {/* 1. Human Left Eye (Viewer's Left: left-[39%] top-[42.2%]) */}
            {isConnected && (
              <div className="absolute left-[39.2%] top-[42.2%] -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none">
                {/* Outer targeting crosshair */}
                <motion.div 
                  animate={{ rotate: 360 }}
                  transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
                  className="w-10 h-10 border border-cyan-400/40 border-dashed rounded-full flex items-center justify-center"
                />

                {/* Tracking cursor responsive pupillary action */}
                <motion.div 
                  animate={{ x: mousePos.x * 0.4, y: mousePos.y * 0.4 }}
                  transition={{ type: "spring", damping: 12, stiffness: 130 }}
                  className="absolute inset-0 m-auto w-3 h-3 rounded-full bg-cyan-400/20 border border-cyan-400 flex items-center justify-center flex-shrink-0"
                >
                  <div className="w-1 h-1 bg-cyan-100 rounded-full" />
                </motion.div>

                {/* Numeric readout near eye tracking target */}
                <div className="absolute -top-4 -left-4 font-mono text-[6px] tracking-normal text-cyan-300">
                  REF_Z:{(scannerPulse * 0.01).toFixed(2)}
                </div>
              </div>
            )}

            {/* 2. Cybernetic Red Eye (Viewer's Right: left-[61%] top-[42.2%]) */}
            <div className="absolute left-[61.2%] top-[42.2%] -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none">
              {/* Pulse expansion boundary based on emotion config */}
              {isConnected && (
                <motion.div 
                  animate={{ 
                    scale: emotion === 'disturbed' ? [1, 1.5, 1] : [1, 1.25, 1],
                    opacity: [0.3, 0.8, 0.3]
                  }}
                  transition={{ duration: theme.waveSpeed, repeat: Infinity }}
                  className="absolute -inset-4 rounded-full border border-red-500/50 pointer-events-none"
                />
              )}

              {/* Glowing Laser Red Iris Overlays */}
              <motion.div 
                animate={{ 
                  scale: isConnected ? (emotion === 'intimate' ? 1.3 : emotion === 'analytical' ? 0.9 : 1.1) : 0.6,
                  filter: isConnected ? "drop-shadow(0 0 8px rgba(239, 68, 68, 0.8))" : "none"
                }}
                transition={{ type: "spring", damping: 10 }}
                className={`relative w-6 h-6 rounded-full bg-gradient-to-r ${
                  emotion === 'intimate' ? 'from-fuchsia-600 to-rose-500' :
                  emotion === 'playful' ? 'from-amber-600 to-red-500' : 'from-red-600 to-orange-500'
                } flex items-center justify-center shadow-lg border border-red-400/30 overflow-hidden`}
              >
                {/* Core Pupil which slightly follows cursor */}
                <motion.div 
                  animate={{ 
                    x: mousePos.x * 0.6, 
                    y: mousePos.y * 0.6,
                    scale: isInterrupted ? [1, 1.3, 1] : 1
                  }}
                  transition={{ type: "spring", damping: 8, stiffness: 120 }}
                  className="w-2.5 h-2.5 rounded-full bg-black border border-white flex items-center justify-center"
                >
                  {/* Blinking Glint */}
                  <div className="w-1 h-1 bg-white rounded-full self-start ml-0.5 mt-0.5" />
                </motion.div>
              </motion.div>

              {/* Shutter mechanical aperture shutter lines representing thinking state */}
              {isConnected && (
                <motion.div 
                  animate={{ 
                    rotate: scannerPulse * 3.6,
                    scale: [0.95, 1.05, 0.95]
                  }}
                  className="absolute -inset-1 border border-red-500/20 border-dotted rounded-full"
                />
              )}
            </div>

            {/* Interruption Intercept Shield Overlay (Glitch Screen indicator) */}
            {isInterrupted && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: [0.4, 0.1, 0.3, 0.2, 0.4] }}
                transition={{ duration: 0.6, repeat: Infinity }}
                className="absolute inset-0 bg-red-950/20 pointer-events-none z-30 flex items-center justify-center border border-red-500/30"
              >
                <div className="bg-red-950 border border-red-500/50 px-3 py-1.5 font-mono text-[9px] text-red-400 uppercase tracking-widest flex items-center gap-2">
                  <ShieldAlert className="w-3.5 h-3.5 animate-bounce" />
                  <span>TRANS_INTERRUPT</span>
                </div>
              </motion.div>
            )}

            {/* Standby Shutdown Indicator offline mode screen */}
            {!isConnected && (
              <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] z-30 flex flex-col items-center justify-center pointer-events-none">
                <div className="border border-white/10 bg-black/80 px-4 py-2 text-center font-mono">
                  <div className="text-[10px] text-white/50 tracking-widest uppercase">CONNECTION STANDBY</div>
                  <div className="text-[7px] text-cyan-400/60 uppercase tracking-[0.2em] mt-1">Initialize link to authorize scan</div>
                </div>
              </div>
            )}
            
          </div>
        )}
      </div>
    </div>
  );
}
