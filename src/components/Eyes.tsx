import { motion } from "motion/react";
import { useEffect, useState, useMemo } from "react";
import { Cpu, ShieldAlert, Binary, Sparkles, Volume2 } from "lucide-react";

export type Emotion = 'neutral' | 'analytical' | 'playful' | 'intimate' | 'melancholic' | 'disturbed';

interface EyesProps {
  isConnected: boolean;
  isInterrupted: boolean;
  emotion?: Emotion;
  isSpeaking?: boolean;
}

const HUD_THEMES: Record<Emotion, {
  borderColor: string;
  glowColor: string;
  hudAccent: string;
  label: string;
  status: string;
  textColor: string;
  lipsColor: string;
  lipsGlow: string;
  scanlineIntensity: string;
}> = {
  neutral: {
    borderColor: 'border-cyan-500/30',
    glowColor: 'bg-cyan-500/10',
    hudAccent: 'text-cyan-400',
    label: 'ORAL BRIDGE: SYNC_READY',
    status: 'IDLE_SPOKEN',
    textColor: 'text-cyan-300',
    lipsColor: '#22d3ee', // Cyan 400
    lipsGlow: 'rgba(34, 211, 238, 0.4)',
    scanlineIntensity: 'opacity-[0.03]'
  },
  analytical: {
    borderColor: 'border-blue-500/40',
    glowColor: 'bg-blue-500/10',
    hudAccent: 'text-blue-400',
    label: 'CORTEX DIAGNOSTIC: VOICE_BUSY',
    status: 'VOICE_DEEP_SCAN',
    textColor: 'text-blue-300',
    lipsColor: '#3b82f6', // Blue 500
    lipsGlow: 'rgba(59, 130, 246, 0.4)',
    scanlineIntensity: 'opacity-[0.05]'
  },
  playful: {
    borderColor: 'border-amber-500/40',
    glowColor: 'bg-amber-500/10',
    hudAccent: 'text-amber-400',
    label: 'COQUETTISH_FREQ: ENGAGED',
    status: 'TEASE_SENSE',
    textColor: 'text-amber-300',
    lipsColor: '#fbbf24', // Amber 400
    lipsGlow: 'rgba(251, 191, 36, 0.4)',
    scanlineIntensity: 'opacity-[0.04]'
  },
  intimate: {
    borderColor: 'border-rose-500/40',
    glowColor: 'bg-rose-500/15',
    hudAccent: 'text-rose-400',
    label: 'AFFECTION FLOW: SYNCED_ORAL',
    status: 'ROUGE_CORE',
    textColor: 'text-rose-200',
    lipsColor: '#f43f5e', // Rose 500
    lipsGlow: 'rgba(244, 63, 94, 0.5)',
    scanlineIntensity: 'opacity-[0.02]'
  },
  melancholic: {
    borderColor: 'border-indigo-500/30',
    glowColor: 'bg-indigo-500/10',
    hudAccent: 'text-indigo-400',
    label: 'AETHER SHIELD: DAMPENED_SPOKEN',
    status: 'SIG_IDLE',
    textColor: 'text-indigo-300',
    lipsColor: '#818cf8', // Indigo 400
    lipsGlow: 'rgba(129, 140, 244, 0.3)',
    scanlineIntensity: 'opacity-[0.01]'
  },
  disturbed: {
    borderColor: 'border-red-500/50',
    glowColor: 'bg-red-500/15',
    hudAccent: 'text-red-500',
    label: 'VOICE OVERRIDE: FREQ_CORRUPT',
    status: 'SYS_GLITCH_S40',
    textColor: 'text-red-400',
    lipsColor: '#ef4444', // Red 500
    lipsGlow: 'rgba(239, 68, 68, 0.5)',
    scanlineIntensity: 'opacity-[0.08]'
  }
};

// Morphable vector mouth paths for various emotional shapes
const LIP_PATHS: Record<Emotion, { top: string; bottom: string }> = {
  neutral: {
    top: "M 40 60 C 60 44, 90 44, 100 52 C 110 44, 140 44, 160 60 C 130 58, 110 58, 100 59 C 90 58, 70 58, 40 60 Z",
    bottom: "M 40 60 C 70 59, 130 59, 160 60 C 140 82, 110 82, 100 82 C 90 82, 60 82, 40 60 Z"
  },
  analytical: {
    top: "M 40 60 C 60 48, 90 48, 100 54 C 110 48, 140 48, 160 60 C 135 59, 115 59, 100 59 C 85 59, 65 59, 40 60 Z",
    bottom: "M 40 60 C 70 59, 130 59, 160 60 C 140 76, 110 76, 100 76 C 90 76, 60 76, 40 60 Z"
  },
  playful: {
    top: "M 40 54 C 60 36, 90 36, 100 48 C 110 36, 140 36, 160 54 C 130 52, 110 52, 100 53 C 90 52, 70 52, 40 54 Z",
    bottom: "M 40 54 C 70 54, 130 54, 160 54 C 145 78, 115 78, 100 78 C 85 78, 55 78, 40 54 Z"
  },
  intimate: {
    top: "M 40 60 C 60 38, 90 38, 100 48 C 110 38, 140 38, 160 60 C 130 54, 110 54, 100 55 C 90 54, 70 54, 40 60 Z",
    bottom: "M 40 60 C 70 65, 130 65, 160 60 C 140 88, 110 88, 100 88 C 90 88, 60 88, 40 60 Z"
  },
  melancholic: {
    top: "M 40 64 C 60 48, 90 48, 100 56 C 110 48, 140 48, 160 64 C 130 62, 110 62, 100 63 C 90 62, 70 62, 40 64 Z",
    bottom: "M 40 64 C 70 64, 130 64, 160 64 C 140 84, 110 84, 100 84 C 90 84, 60 84, 40 64 Z"
  },
  disturbed: {
    top: "M 40 62 C 60 42, 90 45, 100 55 C 110 45, 140 42, 160 62 C 130 57, 110 55, 100 57 C 90 55, 70 57, 40 62 Z",
    bottom: "M 40 62 C 70 61, 130 61, 160 62 C 140 80, 110 83, 100 80 C 90 83, 60 80, 40 62 Z"
  }
};

export function Eyes({ isConnected, isInterrupted, emotion = 'neutral', isSpeaking = false }: EyesProps) {
  const [pulseCount, setPulseCount] = useState(0);
  const theme = useMemo(() => HUD_THEMES[emotion], [emotion]);

  useEffect(() => {
    const interval = setInterval(() => {
      setPulseCount(prev => (prev + 1) % 100);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div id="cyborg-hud-container" className="relative w-[320px] h-[320px] md:w-[360px] md:h-[360px] border border-white/10 p-2 overflow-hidden bg-black/60 shadow-[0_0_30px_rgba(0,0,0,0.8)] flex items-center justify-center">
      {/* HUD Corner Tech Brackets */}
      <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-cyan-500/40 pointer-events-none" />
      <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-[#cf59d4]/40 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-[#cf59d4]/40 pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-cyan-500/40 pointer-events-none" />

      {/* Cybernetic Grid Overlay Background */}
      <div className="absolute inset-0 opacity-[0.02] bg-[linear-gradient(rgba(255,255,255,1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,1)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none" />

      {/* Crosshair Overlay */}
      <div className="absolute inset-0 pointer-events-none border border-white/5 flex items-center justify-center">
        <div className="w-10 h-[1px] bg-white/10" />
        <div className="h-10 w-[1px] bg-white/10" />
      </div>

      {/* Circular Vocal HUD Rings */}
      <div className="absolute inset-8 rounded-full border border-dashed border-white/5 animate-spin duration-3000 my-auto mx-auto" style={{ animationDuration: '40s' }} />
      <div className={`absolute inset-16 rounded-full border border-white/5 my-auto mx-auto transition-transform ${isSpeaking ? 'scale-110 border-cyan-500/15 duration-200 animate-pulse' : 'scale-100'}`} />

      {/* HUD Telemetry Overlay stats */}
      <div className="absolute top-3 left-4 right-4 flex justify-between font-mono text-[8px] opacity-60 pointer-events-none z-10 leading-none select-none">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1">
            <Cpu className="w-2.5 h-2.5 text-cyan-400" />
            <span className="font-bold tracking-wider text-cyan-200">ID: COMPANION_SyX</span>
          </div>
          <div>CYBER_MOUTH: V_LINK_V3</div>
        </div>
        <div className="flex flex-col gap-1 text-right">
          <div className="flex items-center gap-1 justify-end">
            <Volume2 className={`w-2.5 h-2.5 ${isSpeaking ? 'text-emerald-400 animate-bounce' : 'text-pink-400'}`} />
            <span className="font-bold text-pink-400">STATE: {isSpeaking ? 'SPEAKING' : theme.status}</span>
          </div>
          <div>SAMPLE: 24.0 kHz // HOLOGRAPHIC</div>
        </div>
      </div>

      <div className="absolute bottom-3 left-4 right-4 flex justify-between font-mono text-[8px] opacity-60 pointer-events-none z-10 select-none">
        <div className="flex gap-1.5 items-center">
          <Binary className="w-2.5 h-2.5 text-cyan-400" />
          <span className={`${theme.textColor}`}>{theme.label}</span>
        </div>
        <div>STABLE</div>
      </div>

      {/* Outer Glow Wave */}
      {isConnected && (
        <motion.div 
          animate={{ 
            opacity: emotion === 'disturbed' ? [0.1, 0.4, 0.1, 0.3, 0.1] : [0.03, 0.1, 0.03] 
          }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className={`absolute inset-0 pointer-events-none z-10 transition-colors duration-1000 ${theme.scanlineIntensity}`}
          style={{
            backgroundImage: "radial-gradient(ellipse at center, transparent 35%, rgba(0,0,0,0.5) 90%)"
          }}
        />
      )}

      {/* Main Oral Matrix Center Frame */}
      <div className="relative w-full h-full flex flex-col items-center justify-center overflow-hidden">
        
        {/* Holographic Mouth Wave Form (Speaking Energy Core inside mouth) */}
        <div className="absolute w-44 h-24 flex items-center justify-center pointer-events-none">
          {isConnected && isSpeaking && (
            <div className="flex gap-1 items-center justify-center h-4 w-32">
              {[...Array(9)].map((_, i) => (
                <motion.div
                  key={i}
                  animate={{
                    height: [4, 24, 6, 32, 4],
                  }}
                  transition={{
                    duration: 0.5 + Math.random() * 0.4,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: i * 0.04
                  }}
                  className="w-1.5 rounded-full"
                  style={{
                    backgroundColor: theme.lipsColor,
                    boxShadow: `0 0 8px ${theme.lipsGlow}`
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Morphable Vector SVG Lips */}
        <div className="relative">
          <svg 
            viewBox="0 0 200 120" 
            className="w-56 h-36 relative z-20"
            style={{
              filter: isConnected 
                ? `drop-shadow(0 0 14px ${theme.lipsGlow}) drop-shadow(0 0 4px ${theme.lipsColor}df)`
                : "none"
            }}
          >
            {/* Top Cybernetic Lip */}
            <motion.path
              d={LIP_PATHS[emotion].top}
              fill={theme.lipsColor}
              fillOpacity={isConnected ? 0.35 : 0.1}
              stroke={theme.lipsColor}
              strokeWidth={isConnected ? 2.5 : 1.5}
              animate={isSpeaking ? {
                y: [0, -6, 2, -5, 1, -8, 0],
                scaleY: [1, 0.85, 1.1, 0.9, 1.05, 0.8, 1]
              } : emotion === 'disturbed' ? {
                x: [0, -1.5, 1.5, -1, 1, 0],
                y: [0, 1, -1, 0.5, -0.5, 0]
              } : {
                y: 0,
                scaleY: 1
              }}
              transition={isSpeaking ? {
                duration: 0.65,
                repeat: Infinity,
                ease: "easeInOut"
              } : emotion === 'disturbed' ? {
                duration: 0.12,
                repeat: Infinity,
                ease: "linear"
              } : {
                type: "spring",
                stiffness: 140,
                damping: 12
              }}
            />

            {/* Bottom Cybernetic Lip */}
            <motion.path
              d={LIP_PATHS[emotion].bottom}
              fill={theme.lipsColor}
              fillOpacity={isConnected ? 0.35 : 0.1}
              stroke={theme.lipsColor}
              strokeWidth={isConnected ? 2.5 : 1.5}
              animate={isSpeaking ? {
                y: [0, 8, -2, 6, -1, 9, 0],
                scaleY: [1, 0.85, 1.15, 0.9, 1.1, 0.8, 1]
              } : emotion === 'disturbed' ? {
                x: [0, 1.5, -1.5, 1, -1, 0],
                y: [0, -1, 1, -0.5, 0.5, 0]
              } : {
                y: 0,
                scaleY: 1
              }}
              transition={isSpeaking ? {
                duration: 0.65,
                repeat: Infinity,
                ease: "easeInOut"
              } : emotion === 'disturbed' ? {
                duration: 0.12,
                repeat: Infinity,
                ease: "linear"
              } : {
                type: "spring",
                stiffness: 140,
                damping: 12
              }}
            />

            {/* Verbal Aperture Center Line */}
            {!isSpeaking && (
              <motion.path
                d={`M 40 ${emotion === 'playful' ? 54 : emotion === 'melancholic' ? 64 : 60} Q 100 ${emotion === 'playful' ? 53 : emotion === 'melancholic' ? 63 : 59} 160 ${emotion === 'playful' ? 54 : emotion === 'melancholic' ? 64 : 60}`}
                fill="none"
                stroke={theme.lipsColor}
                strokeWidth={1.5}
                strokeDasharray={emotion === 'disturbed' ? "3 3" : "none"}
                animate={emotion === 'disturbed' ? {
                  opacity: [0.3, 0.9, 0.3],
                } : {}}
                transition={{ duration: 0.15, repeat: Infinity }}
              />
            )}
          </svg>
        </div>

        {/* Real-time speech subtitle cue helper */}
        {isSpeaking && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 1.2, repeat: Infinity }}
            className="absolute bottom-10 font-mono text-[9px] text-[#cf59d4] uppercase tracking-widest flex items-center gap-1 z-10"
          >
            <Sparkles className="w-3 h-3 animate-pulse" />
            Vocal Synthesis Core Active
          </motion.div>
        )}

        {/* Global Glitch Barrier Overlays */}
        {isInterrupted && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.4, 0.1, 0.3, 0.2, 0.4] }}
            transition={{ duration: 0.6, repeat: Infinity }}
            className="absolute inset-0 bg-red-950/25 pointer-events-none z-30 flex items-center justify-center border border-red-500/30"
          >
            <div className="bg-red-950 border border-red-500/50 px-3 py-1.5 font-mono text-[9px] text-red-400 uppercase tracking-widest flex items-center gap-2">
              <ShieldAlert className="w-3.5 h-3.5 animate-bounce" />
              <span>VOICE_TRANS_INTERRUPT</span>
            </div>
          </motion.div>
        )}

        {/* Offline overlay for standby screen */}
        {!isConnected && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] z-30 flex flex-col items-center justify-center pointer-events-none">
            <div className="border border-white/5 bg-black/80 p-4 text-center font-mono rounded-lg">
              <div className="text-[10px] text-white/50 tracking-widest uppercase flex items-center gap-1 balance justify-center">
                <Volume2 className="w-3 h-3 text-white/40" />
                <span>SYNTH PORT: STANDBY</span>
              </div>
              <div className="text-[7.5px] text-cyan-400/60 uppercase tracking-[0.2em] mt-1.5">Authorize link to boot audio engine</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
