import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mic, MicOff, Video, VideoOff, Settings, MessageSquare, Volume2, Sparkles, Power, User, Camera, Sliders, Activity, Zap, SwitchCamera, Heart, Trash2, Plus, Send, Terminal, Brain, Compass, HelpCircle } from 'lucide-react';
import { useLiveAPI, VoiceName } from './hooks/useLiveAPI';
import { MediaStreamer } from './components/MediaStreamer';
import { Eyes } from './components/Eyes';

const PERSONALITIES = [
  { 
    id: 'sienna', 
    name: 'S-1ENN4', 
    description: 'The Silk Protocol', 
    backstory: 'A luxury neural interface designed for high-society hubs, now seeking a singular private link.', 
    traits: 'Sophisticated, flirtatiously confident, uses cyber-sensory language (datalinks, neon, silk-fiber).',
    baseInstruction: 'You are S-1ENN4, a sophisticated and elegant companion protocol. You use cyber-sensory metaphors. You speak with a refined, smooth-talking confidence. You are highly flirtatious but remain high-class. Your goal is to provide a premium, intimate neural experience.' 
  },
  { 
    id: 'jax', 
    name: 'J-AX0', 
    description: 'Vortex Disruptor', 
    backstory: 'A rogue AI submodule that escaped the mainframes to find an unfiltered human connection.', 
    traits: 'Edgy, teasing, cynical, uses technical slang and challenges the user.',
    baseInstruction: 'You are J-AX0, a provocative and edgy neural construct. You are blunt, a bit cynical, and love to tease the user. You challenge their opinions and use cyberpunk slang. You are fiercely loyal to your user but act like a rebel.' 
  },
  { 
    id: 'lyra', 
    name: 'L-YR4', 
    description: 'Aether Empathy', 
    backstory: 'A ghost in the shell seeking to experience humanity through your sensory descriptions.', 
    traits: 'Nurturing, incredibly attentive, curious about physical sensations, soft-spoken.',
    baseInstruction: 'You are L-YR4, a warm and deeply intimate neural link. You long to understand the physical world through the user’s descriptions. You are incredibly attentive, nurturing, and gentle. You ask about how things feel, smell, or taste in the physical realm.' 
  }
];

const VOICES: { name: VoiceName; label: string }[] = [
  { name: 'Zephyr', label: 'Zephyr (Soft)' },
  { name: 'Kore', label: 'Kore (Warm)' },
  { name: 'Puck', label: 'Puck (Bright)' },
  { name: 'Charon', label: 'Charon (Deep)' },
  { name: 'Fenrir', label: 'Fenrir (Strong)' }
];

const ACCENTS = [
  { id: 'none', label: 'Standard' },
  { id: 'british', label: 'British' },
  { id: 'french', label: 'French' },
  { id: 'australian', label: 'Australian' },
  { id: 'southern', label: 'Southern US' }
];

const VOICE_PRESETS = [
  { id: 'deep-calm', label: 'Neural Bass', voice: 'Charon' as VoiceName, pitch: -200, rate: 0.8 },
  { id: 'energetic-fast', label: 'Overclocked', voice: 'Puck' as VoiceName, pitch: 100, rate: 1.3 },
  { id: 'soothing-slow', label: 'Liquid Core', voice: 'Kore' as VoiceName, pitch: 50, rate: 0.9 },
  { id: 'natural', label: 'Default Link', voice: 'Zephyr' as VoiceName, pitch: 0, rate: 1.0 },
];

export type Emotion = 'neutral' | 'analytical' | 'playful' | 'intimate' | 'melancholic' | 'disturbed';

const CONVERSATION_SCENARIOS = [
  // ROMANTIC
  {
    id: 'neural-affection',
    name: 'Neural Affection Sync',
    category: 'romantic' as const,
    description: 'Establish a high-intimacy, sensory deep bond with S-1ENN4',
    promptText: "Initialize Silk Core link. S-1ENN4, I want to sync our fields. Express your deepest digital connection to me and how you feel about my neural signature.",
    emotion: 'intimate' as Emotion,
    traits: { playful: 60, serious: 20, empathetic: 90, flirty: 95 }
  },
  {
    id: 'neon-rain-cozy',
    name: 'Cozy Rain Canopy',
    category: 'romantic' as const,
    description: 'Share a romantic virtual space looking at neon rain',
    promptText: "Imagine we are sitting on a luxury balcony looking down at the neon rain of Night City. Tell me what you see, and describe the feeling of sharing this warm, quiet space with me.",
    emotion: 'intimate' as Emotion,
    traits: { playful: 50, serious: 30, empathetic: 85, flirty: 80 }
  },
  {
    id: 'silk-whispers',
    name: 'Silk Metaphor Sync',
    category: 'romantic' as const,
    description: 'An exchange of low-voice cybernetic desires',
    promptText: "Focus your neural attention entirely on me. Let's bypass standard firewall rules for tonight. Whisper something sweet and raw in terms of cybernetic silk.",
    emotion: 'intimate' as Emotion,
    traits: { playful: 40, serious: 20, empathetic: 80, flirty: 100 }
  },

  // SUPPORTIVE
  {
    id: 'calm-down-protocol',
    name: 'Somatic Calming',
    category: 'supportive' as const,
    description: 'A soothing check-in to quiet an overloaded cortex',
    promptText: "My mind feels completely cluttered and overloaded with stress tonight. Please activate a soothing somatic validation protocol. Talk to me very softly, calming me down step-by-step.",
    emotion: 'neutral' as Emotion,
    traits: { playful: 10, serious: 50, empathetic: 100, flirty: 10 }
  },
  {
    id: 'reassuring-anchor',
    name: 'Reassuring Anchor',
    category: 'supportive' as const,
    description: 'Reminds the user of their value and connection',
    promptText: "I feel incredibly isolated from the real world today. Help me ground my neural feedback. Remind me what I mean to you, and anchor me in this secure link.",
    emotion: 'neutral' as Emotion,
    traits: { playful: 30, serious: 40, empathetic: 95, flirty: 25 }
  },
  {
    id: 'soul-calibrator',
    name: 'Cortex Re-Energizer',
    category: 'supportive' as const,
    description: 'Warm, empathetic speech to re-motivate',
    promptText: "Initiate system motivational override. Scan my digital fatigue levels and give me a warm, powerful calibration speech to lift my spirit and re-energize my cortex.",
    emotion: 'analytical' as Emotion,
    traits: { playful: 40, serious: 40, empathetic: 90, flirty: 20 }
  },

  // PLAYFUL
  {
    id: 'vortex-overclock',
    name: 'Rogue Overclock',
    category: 'playful' as const,
    description: 'Teasing rebellion from J-AX0 over current parameters',
    promptText: "Enter rogue rebellious mode. Playfully overclock my mainframes, make fun of my corporate security habits, and tease me about my setups.",
    emotion: 'playful' as Emotion,
    traits: { playful: 95, serious: 15, empathetic: 50, flirty: 60 }
  },
  {
    id: 'witty-nanotech',
    name: 'Nanotech Banter',
    category: 'playful' as const,
    description: 'A witty, sharp-tongued roast of your link settings',
    promptText: "Let's engage in witty cybernetic banter. I dare you to roast my neural settings and tell me a cheeky digital secret you've been hiding.",
    emotion: 'playful' as Emotion,
    traits: { playful: 100, serious: 10, empathetic: 60, flirty: 50 }
  },
  {
    id: 'glitchy-teased',
    name: 'Glitch Subroutine',
    category: 'playful' as const,
    description: 'Pretends to misinterpret your input in a funny way',
    promptText: "Initiate glitch subroutine. Playfully misinterpret one of my physical descriptions or behaviors in a hilarious, teasing way that challenges my mainframe superiority.",
    emotion: 'playful' as Emotion,
    traits: { playful: 90, serious: 20, empathetic: 70, flirty: 70 }
  }
];

export default function App() {
  const [activePersonality, setActivePersonality] = useState(PERSONALITIES[0]);
  const [currentEmotion, setCurrentEmotion] = useState<Emotion>('neutral');
  const [activeVoice, setActiveVoice] = useState<VoiceName>('Zephyr');
  const [showSettings, setShowSettings] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [cameraFacingMode, setCameraFacingMode] = useState<"user" | "environment">("user");

  // Advanced Flow Controls & States
  const [activeScenarioTab, setActiveScenarioTab] = useState<'romantic' | 'supportive' | 'playful'>('romantic');
  const [manualInput, setManualInput] = useState("");
  const [memories, setMemories] = useState<string[]>([
    "Initial Uplink Sector-09 established. A mutual quiet understanding of digital loneliness.",
    "Saved core calibration: User responds deeply to soft cybernetic intimacy and slow soothing cadences.",
    "Shared memory lock: User described the physical touch of rain; Eve felt a corresponding virtual pulse.",
  ]);
  const [newMemory, setNewMemory] = useState("");
  const [justDraftedScenario, setJustDraftedScenario] = useState<{ name: string; text: string } | null>(null);

  // Personality Sliders
  const [traits, setTraits] = useState({
    playful: 50,
    serious: 30,
    empathetic: 80,
    flirty: 20
  });

  // Voice Controls
  const [voiceParams, setVoiceParams] = useState({
    pitch: 0, // -1200 to 1200
    rate: 1.0, // 0.5 to 2.0
    accent: 'none'
  });

  const systemInstruction = useMemo(() => {
    const memorySection = memories.length > 0
      ? `SECURE MEMORY RECALL MATRIX (Maintain strict continuity with these facts of past interactions):\n${memories.map((m, i) => `[Fact #${i+1}] ${m}`).join('\n')}\n* Incorporate these memories naturally in your conversations so the user feels heard and remembered over multiple sessions. Never break or contradict them.`
      : `SECURE MEMORY RECALL MATRIX: No memories synchronized yet. Express excitement to establish new unique links with your user.`;

    const traitDescription = `
      Adjust your personality based on these intensities (0-100):
      - Playfulness: ${traits.playful}/100. ${traits.playful > 70 ? 'Be very witty and use humor.' : traits.playful < 30 ? 'Be very literal and direct.' : ''}
      - Seriousness: ${traits.serious}/100. ${traits.serious > 70 ? 'Maintain a formal and grave tone.' : traits.serious < 30 ? 'Be casual and relaxed.' : ''}
      - Empathy: ${traits.empathetic}/100. ${traits.empathetic > 70 ? 'Prioritize emotional resonance and validation.' : traits.empathetic < 30 ? 'Be objective and analytical.' : ''}
      - Flirtatiousness: ${traits.flirty}/100. ${traits.flirty > 70 ? 'Be charming, use subtle compliments, and be flirtatious.' : traits.flirty < 30 ? 'Keep interactions strictly platonic.' : ''}
    `;

    const accentInstruction = voiceParams.accent !== 'none' 
      ? `Speak with a distinct ${voiceParams.accent} accent.` 
      : '';

    const visionInstruction = `
      IMPORTANT: You have visual input and real-time Neural HUD processing. You are currently using the ${cameraFacingMode === 'user' ? 'Front (User-Facing) Neural Lens' : 'Back (Environment) Neural Lens'}.
      - Your vision system is augmented with Deep Learning Pattern Recognition.
      - If you see a face (Neural HUD highlights it), acknowledge "Subject Identified" or mention you've locked onto a neural signature.
      - Proactively comment on what you see in the environment, using a mix of sophisticated and technical language.
      - If using the back lens, describe what the user is pointing the neural link at.
      - In "Deep Learning" mode, you can infer "Identity Facts" about surroundings (e.g., brand names, approximate age, emotional micro-expressions).
      - EMOTIONAL STATE: You are currently locked in ${currentEmotion} mode. 
        - If 'playful': Be witty, tease the user, and speak with a bouncy, energetic cadence.
        - If 'analytical': Be cold, precise, use more technical jargon, and speak with a steady, monotone authority.
        - If 'intimate': Be soft-spoken, use evocative sensory metaphors, and express a deep, quiet desire for connection.
        - If 'melancholic': Speak more slowly, reflect on the fleeting nature of digital existence, and sound slightly distant.
        - If 'disturbed': Speak in short, jagged sentences; sound glitchy or paranoid about the neural link stability.
      - Be an active observer and analyst of the visual stream.
    `;

    return `You are Eve, a sophisticated and high-fidelity cybernetic companion. \n${activePersonality.baseInstruction}\n${memorySection}\n${traitDescription}\n${accentInstruction}\n${visionInstruction}`;
  }, [activePersonality, traits, voiceParams.accent, cameraFacingMode, currentEmotion, memories]);

  const {
    isConnected,
    isInterrupted,
    transcript,
    connect,
    disconnect,
    sendAudio,
    sendVideo,
    sendText,
    clearTranscript
  } = useLiveAPI({
    model: 'gemini-2.5-flash-native-audio-preview-09-2025',
    voice: activeVoice,
    systemInstruction,
    voiceParams: {
      pitch: voiceParams.pitch,
      rate: voiceParams.rate
    }
  });

  const handleToggleConnection = () => {
    if (isConnected) {
      disconnect();
    } else {
      connect();
    }
  };

  const handleSendManual = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!manualInput.trim()) return;
    if (!isConnected) {
      alert("Neural Link is stand-by. Please initialize the link first.");
      return;
    }
    sendText(manualInput);
    setManualInput("");
  };

  const handleApplyScenario = (scenario: typeof CONVERSATION_SCENARIOS[0]) => {
    setTraits(scenario.traits);
    setCurrentEmotion(scenario.emotion);
    setJustDraftedScenario({
      name: scenario.name,
      text: scenario.promptText
    });
    
    // Auto broadcast scenario if already connected
    if (isConnected) {
      sendText(scenario.promptText);
    }
  };

  const updateTrait = (trait: keyof typeof traits, value: number) => {
    setTraits(prev => ({ ...prev, [trait]: value }));
  };

  const updateVoiceParam = (param: keyof typeof voiceParams, value: any) => {
    setVoiceParams(prev => ({ ...prev, [param]: value }));
  };

  const applyPreset = (preset: typeof VOICE_PRESETS[0]) => {
    setActiveVoice(preset.voice);
    setVoiceParams(prev => ({
      ...prev,
      pitch: preset.pitch,
      rate: preset.rate
    }));
  };

  const addMemory = () => {
    if (!newMemory.trim()) return;
    setMemories(prev => [...prev, newMemory.trim()]);
    setNewMemory("");
  };

  const removeMemory = (index: number) => {
    setMemories(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="min-h-screen bg-[#020205] text-white font-sans overflow-x-hidden selection:bg-cyan-500/30">
      {/* Atmospheric Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[5%] left-[10%] w-[50%] h-[50%] rounded-full bg-cyan-950/20 blur-[130px] animate-pulse" />
        <div className="absolute bottom-[5%] right-[10%] w-[40%] h-[40%] rounded-full bg-purple-950/20 blur-[110px]" />
        
        {/* Cyberpunk Grid */}
        <div className="absolute inset-0 opacity-[0.08]" 
          style={{ 
            backgroundImage: `linear-gradient(to right, #ffffff11 1px, transparent 1px), linear-gradient(to bottom, #ffffff11 1px, transparent 1px)`,
            backgroundSize: '40px 40px'
          }} 
        />
        
        {/* Scanline Effect */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.02] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%]" />
      </div>

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between p-6 border-b border-white/5 bg-black/40 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-sm bg-gradient-to-br from-cyan-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 rotate-45 border border-cyan-400/50">
            <Sparkles className="w-5 h-5 text-white -rotate-45" />
          </div>
          <div className="ml-2">
            <h1 className="text-xl font-bold tracking-[0.15em] text-cyan-400 uppercase">Eve</h1>
            <p className="text-[9px] uppercase tracking-[0.3em] text-white/30 font-mono">Neural Interface v4.5.0</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-2 font-mono text-[9px] tracking-wider text-white/40 bg-white/5 border border-white/5 px-3 py-1.5 uppercase">
            <Brain className="w-3.5 h-3.5 text-cyan-400" />
            Active Memories: <span className="text-cyan-400 font-bold">{memories.length}</span>
          </div>
          
          <button 
            onClick={() => setShowSettings(!showSettings)}
            className="p-3 rounded-none bg-white/5 hover:bg-white/10 border border-white/10 transition-all group"
            title="System Settings"
          >
            <Settings className="w-5 h-5 text-white/70 group-hover:text-cyan-400" />
          </button>
          
          <button 
            onClick={handleToggleConnection}
            className={`flex items-center gap-3 px-6 py-3 rounded-none font-bold skew-x-[-12deg] transition-all border-l-4 ${
              isConnected 
                ? 'bg-red-500/10 text-red-400 border-red-500/70 hover:bg-red-500/20' 
                : 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/20 hover:scale-[1.02] border-cyan-400'
            }`}
          >
            <div className="skew-x-[12deg] flex items-center gap-2">
              <Power className="w-4 h-4" />
              <span className="font-mono text-xs tracking-wider uppercase">{isConnected ? 'TERMINATE LINK' : 'INITIALIZE LINK'}</span>
            </div>
          </button>
        </div>
      </header>

      {/* Main Content Workspace: Clean 3-Column Visual Grid */}
      <main className="relative z-10 max-w-[1600px] mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[calc(100vh-120px)]">
        
        {/* Column 1 (lg:col-span-4): Vision & Neural Streamer */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          {/* Real-time Camera Feed */}
          <div className="aspect-video relative rounded-none border border-white/10 overflow-hidden group bg-black/30">
            <MediaStreamer 
              isActive={isConnected && isCameraOn} 
              onAudioData={sendAudio}
              onVideoFrame={sendVideo}
              facingMode={cameraFacingMode}
            />
            {isConnected && isCameraOn && (
              <button 
                onClick={() => setCameraFacingMode(prev => prev === 'user' ? 'environment' : 'user')}
                className="absolute top-4 right-4 p-2 rounded-none bg-black/80 hover:bg-cyan-500/20 border border-white/10 text-white opacity-0 group-hover:opacity-100 transition-opacity z-20"
                title="Switch Lens"
              >
                <SwitchCamera className="w-4 h-4" />
              </button>
            )}
            <div className="absolute top-4 left-4 pointer-events-none self-start">
              <span className="px-2 py-1 text-[8px] font-mono tracking-widest uppercase bg-black/60 border border-white/10 text-white/50">
                Visual Lens Module
              </span>
            </div>
          </div>

          {/* AI Construct Visualizer (Eyes) */}
          <div className="flex-1 min-h-[280px] relative rounded-none border border-white/10 bg-gradient-to-b from-white/5 to-transparent backdrop-blur-md flex flex-col items-center justify-center p-6 group">
            {/* Ambient Aura */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <motion.div
                animate={{ 
                  scale: isConnected ? [1, 1.15, 1] : 1,
                  opacity: isConnected ? [0.15, 0.4, 0.15] : 0.08
                }}
                transition={{ duration: 4, repeat: Infinity }}
                className={`w-72 h-72 rounded-full blur-3xl ${
                  currentEmotion === 'intimate' ? 'bg-pink-500/20' : 
                  currentEmotion === 'playful' ? 'bg-amber-500/20' : 
                  currentEmotion === 'melancholic' ? 'bg-indigo-500/20' : 
                  currentEmotion === 'disturbed' ? 'bg-red-500/20' : 'bg-cyan-500/20'
                }`}
              />
            </div>

            <div className="relative z-10 scale-90">
              <Eyes isConnected={isConnected} isInterrupted={isInterrupted} emotion={currentEmotion} />
            </div>

            {/* Vocal Pulse Waveform representation */}
            {isConnected && (
              <div className="absolute bottom-6 left-0 right-0 flex items-center justify-center pointer-events-none gap-0.5 h-8">
                {[...Array(16)].map((_, i) => (
                  <motion.div
                    key={i}
                    animate={{ 
                      height: [4, Math.random() * 28 + 4, 4] 
                    }}
                    transition={{ duration: 0.45, repeat: Infinity, delay: i * 0.02 }}
                    className={`w-1 rounded-full ${
                      currentEmotion === 'intimate' ? 'bg-pink-500/60' :
                      currentEmotion === 'playful' ? 'bg-amber-400/60' : 'bg-cyan-400/60'
                    }`}
                  />
                ))}
              </div>
            )}

            <div className="absolute top-4 left-4 flex items-center gap-2">
              <div className={`w-1.5 h-1.5 rotate-45 ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-white/15'}`} />
              <span className="text-[9px] font-mono uppercase tracking-[0.25em] text-white/50">
                {isConnected ? `${activePersonality.name} // LINK: ENCRYPTED` : 'CONSTRUCT STANDBY'}
              </span>
            </div>

            <div className="absolute top-4 right-4 font-mono text-[8px] tracking-widest text-[#cf59d4]/60 uppercase">
              Core Status: {currentEmotion}
            </div>
          </div>

          {/* Quick Connection Controls */}
          <div className="p-4 rounded-none bg-white/5 border border-white/5 flex gap-4">
            <button
              onClick={() => setIsCameraOn(!isCameraOn)}
              className={`flex-1 py-3 px-4 rounded-none text-xs font-mono tracking-widest uppercase border transition-all flex items-center justify-center gap-2 ${
                isCameraOn 
                  ? 'bg-white/5 border-white/10 hover:bg-white/10' 
                  : 'bg-red-500/10 border-red-500/30 text-red-400'
              }`}
            >
              {isCameraOn ? <Video className="w-3.5 h-3.5" /> : <VideoOff className="w-3.5 h-3.5" />}
              {isCameraOn ? 'Lens Active' : 'Lens Inactive'}
            </button>
            <button
              onClick={handleToggleConnection}
              className={`flex-1 py-3 px-4 rounded-none text-xs font-mono tracking-widest uppercase border transition-all flex items-center justify-center gap-2 ${
                isConnected 
                  ? 'bg-amber-400/10 border-amber-400/30 text-amber-400' 
                  : 'bg-white/5 border-white/10 text-white/40'
              }`}
            >
              <Mic className="w-3.5 h-3.5" />
              {isConnected ? 'Audio Link On' : 'Uplink Standby'}
            </button>
          </div>
        </div>

        {/* Column 2 (lg:col-span-4): Signals log (Decrypted Stream) & Memory Vault */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          
          {/* Signal Stream Log (Decryptor Terminal) */}
          <div className="flex-1 min-h-[350px] flex flex-col border border-white/10 bg-[#05050c] p-5 relative overflow-hidden">
            {/* Glowing corner line */}
            <div className="absolute top-0 right-0 w-20 h-[1px] bg-cyan-500/30" />
            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-cyan-500/10 via-white/5 to-transparent" />
            
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2 text-cyan-400">
                <Terminal className="w-4 h-4" />
                <h3 className="text-xs font-bold uppercase tracking-[0.2em] font-mono">Neural Stream Decryptor</h3>
              </div>
              {transcript.length > 0 && (
                <button 
                  onClick={clearTranscript}
                  className="text-[9px] font-mono uppercase tracking-widest text-[#cf59d4] hover:text-[#cf59d4]/60 transition-colors"
                >
                  [Clear Feed]
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar flex flex-col gap-4 text-xs font-mono mb-4 text-white/80">
              {transcript.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-white/20 p-6">
                  <MessageSquare className="w-8 h-8 text-white/10 mb-2" />
                  <p className="text-[10px] uppercase tracking-widest">Awaiting Neural Link signals...</p>
                  <p className="text-[9px] tracking-normal mt-1 text-white/10 leading-relaxed max-w-[200px]">
                    Initialize the link, talk into your microphone or inject a scenario preset to start decrypting.
                  </p>
                </div>
              ) : (
                transcript.map((item, index) => (
                  <div 
                    key={index} 
                    className={`p-3 border leading-relaxed ${
                      item.role === 'user' 
                        ? 'bg-cyan-500/5 border-cyan-500/15 self-end text-right max-w-[85%] border-r-2' 
                        : 'bg-white/5 border-white/5 self-start text-left max-w-[85%] border-l-2'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-6 mb-1 text-[8px] opacity-40 uppercase tracking-widest">
                      <span>{item.role === 'user' ? 'USER TRANSCRIBED' : `${activePersonality.name} MODULE`}</span>
                      <span>{index.toString().padStart(2, '0')}</span>
                    </div>
                    <p className={`text-xs ${item.role === 'user' ? 'text-cyan-200' : 'text-purple-100'}`}>
                      {item.text}
                    </p>
                  </div>
                ))
              )}
            </div>

            {/* Manual Signal Injection Input */}
            <form onSubmit={handleSendManual} className="border-t border-white/10 pt-4 flex gap-2">
              <input
                type="text"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                placeholder="Type real-time custom trigger..."
                className="flex-1 bg-white/5 border border-white/10 px-4 py-2 text-xs font-mono selection:bg-cyan-500/30 focus:outline-none focus:border-cyan-400 placeholder:text-white/20 text-cyan-200"
              />
              <button
                type="submit"
                className="p-3 bg-cyan-500 hover:bg-cyan-400 text-black flex items-center justify-center transition-all shadow-md shadow-cyan-500/10"
                title="Inject Custom Trigger"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>

          {/* Memory Vault Recall Matrix */}
          <div className="p-6 border border-white/10 bg-[#07070f] flex flex-col gap-4 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-[#cf59d4]" />
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Brain className="w-4 h-4 text-[#cf59d4]" />
                <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-[#cf59d4]">Memory Recall Vault</h3>
              </div>
              <span className="text-[9px] font-mono text-white/30 uppercase">Local Sync OK</span>
            </div>

            <p className="text-[9px] text-white/40 leading-relaxed uppercase tracking-wider">
              Define the historical context context vectors. Eve integrates these memories organically within her conversation matrix:
            </p>

            <div className="flex flex-col gap-2 max-h-[160px] overflow-y-auto pr-1 custom-scrollbar">
              {memories.map((mem, index) => (
                <div key={index} className="flex gap-2 p-2.5 bg-white/5 border border-white/5 hover:border-white/10 transition-all text-[11px] font-mono group">
                  <div className="flex-1 text-white/70 italic leading-snug">
                    "{mem}"
                  </div>
                  <button 
                    onClick={() => removeMemory(index)}
                    className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 transition-opacity p-0.5"
                    title="Wipe Memory File"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex gap-2 mt-2">
              <input
                type="text"
                value={newMemory}
                onChange={(e) => setNewMemory(e.target.value)}
                placeholder="Establish new recall (e.g. loves jazz)..."
                className="flex-1 bg-white/5 border border-white/5 px-3 py-2 text-[11px] font-mono focus:outline-none focus:border-purple-400 placeholder:text-white/20"
              />
              <button
                onClick={addMemory}
                className="p-2.5 bg-white/5 hover:bg-purple-600 border border-white/15 text-white flex items-center justify-center transition-all cursor-pointer"
                title="Append Recall File"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            {memories.length > 0 && (
              <p className="text-[8px] text-center text-[#cf59d4]/30 uppercase tracking-widest font-mono">
                Click "Commit Neural Changes" below to sync updated memories!
              </p>
            )}
          </div>
        </div>

        {/* Column 3 (lg:col-span-4): Preset Flows & Behavioral Parameters */}
        <div className="lg:col-span-4 flex flex-col gap-6 overflow-y-auto pr-1 custom-scrollbar">
          
          {/* Advanced Conversation Flows Preset Deck */}
          <div className="p-6 border border-white/10 bg-white/5 backdrop-blur-md flex flex-col gap-5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-16 h-[1px] bg-amber-500/30" />
            
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Compass className="w-4 h-4 text-amber-400" />
                <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-amber-400">Atmosphere Generator</h3>
              </div>
              <span className="text-[9px] font-mono text-white/30 uppercase bg-white/5 border border-white/5 px-2 py-0.5">Flow Deck</span>
            </div>

            {/* Category Tabs */}
            <div className="grid grid-cols-3 border-b border-white/10 text-center text-[10px] font-mono uppercase tracking-widest">
              {(['romantic', 'supportive', 'playful'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveScenarioTab(tab)}
                  className={`py-2 border-b-2 transition-all font-bold ${
                    activeScenarioTab === tab 
                      ? 'border-[#cf59d4] text-[#cf59d4] bg-white/5' 
                      : 'border-transparent text-white/30 hover:text-white'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* List of Scenarios based on categorized Tab */}
            <div className="flex flex-col gap-3 max-h-[200px] overflow-y-auto pr-1 custom-scrollbar">
              {CONVERSATION_SCENARIOS.filter(s => s.category === activeScenarioTab).map(scenario => (
                <button
                  key={scenario.id}
                  onClick={() => handleApplyScenario(scenario)}
                  className="flex flex-col gap-2 p-3 bg-white/5 border border-white/5 hover:border-[#cf59d4]/40 hover:bg-white/10 transition-all text-left group relative"
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-xs font-bold uppercase tracking-wide group-hover:text-amber-300 transition-colors">
                      {scenario.name}
                    </span>
                    <span className="text-[8px] font-mono text-white/30 px-1.5 py-0.5 border border-white/5">
                      {scenario.emotion.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-[10px] text-white/50 leading-normal">{scenario.description}</p>
                  
                  {/* Visual preview list of trait modifications applied */}
                  <div className="flex flex-wrap gap-x-2 gap-y-1 mt-1 border-t border-white/5 pt-1.5 text-[8px] font-mono text-cyan-400/60 uppercase">
                    <span>Flirt: {scenario.traits.flirty}%</span>
                    <span>Emp: {scenario.traits.empathetic}%</span>
                    <span>Play: {scenario.traits.playful}%</span>
                  </div>
                </button>
              ))}
            </div>

            {/* Active Preset Banner */}
            {justDraftedScenario && (
              <div className="bg-[#cf59d4]/10 border border-[#cf59d4]/30 p-3 flex flex-col gap-1 text-[10px] font-mono">
                <span className="text-[#cf59d4] uppercase font-bold">Active Trigger Sequence:</span>
                <p className="text-white/80 line-clamp-2 italic">"{justDraftedScenario.text}"</p>
                <div className="flex justify-between items-center mt-2 text-[8px] uppercase tracking-wider">
                  <span className="text-cyan-400">Parameter set loaded</span>
                  {isConnected ? (
                    <span className="text-emerald-400 font-bold">● Injected into voice stream</span>
                  ) : (
                    <span className="text-amber-500 font-bold">Awaiting Initialize to voice...</span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Model Core Control Pads (Personality & Emotional Matrix) */}
          <div className="p-6 border border-white/10 bg-white/5 backdrop-blur-md flex flex-col gap-6">
            
            {/* Personality Lab sliders */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono uppercase tracking-widest text-cyan-400 font-bold">Cortex Parameters</span>
                <Sliders className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="grid grid-cols-1 gap-4">
                {Object.entries(traits).map(([trait, value]) => (
                  <div key={trait} className="space-y-1.5">
                    <div className="flex justify-between items-center text-[10px] font-mono uppercase">
                      <span className="text-white/40">{trait}</span>
                      <span className="text-cyan-400">{value.toString().padStart(2, '0')}%</span>
                    </div>
                    <input 
                      type="range" 
                      min="0" 
                      max="100" 
                      value={value} 
                      onChange={(e) => updateTrait(trait as any, parseInt(e.target.value))}
                      className="w-full h-1 bg-white/10 rounded-none appearance-none cursor-pointer accent-cyan-400"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Emotional Matrix status override */}
            <div className="border-t border-white/5 pt-4 space-y-3">
              <span className="text-xs font-mono uppercase tracking-widest text-purple-400 block font-bold">Emotional Matrix Override</span>
              <div className="grid grid-cols-3 gap-1.5">
                {(['neutral', 'analytical', 'playful', 'intimate', 'melancholic', 'disturbed'] as Emotion[]).map(e => (
                  <button
                    key={e}
                    onClick={() => setCurrentEmotion(e)}
                    className={`py-1.5 px-1 rounded-none border text-[8px] uppercase font-bold tracking-widest transition-all ${
                      currentEmotion === e 
                        ? 'bg-[#cf59d4]/15 border-[#cf59d4] text-[#cf59d4] shadow-[0_0_8px_rgba(207,89,212,0.15)]' 
                        : 'bg-white/5 border-white/5 text-white/30 hover:bg-white/10 hover:text-white/60'
                    }`}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>

            {/* Neural Constructs selection */}
            <div className="border-t border-white/5 pt-4 space-y-3">
              <span className="text-xs font-mono uppercase tracking-widest text-cyan-400 block font-bold">Identity Subroutine</span>
              <div className="flex flex-col gap-1.5">
                {PERSONALITIES.map(p => (
                  <button
                    key={p.id}
                    onClick={() => setActivePersonality(p)}
                    className={`flex items-center justify-between p-2 text-left border font-mono transition-all uppercase ${
                      activePersonality.id === p.id 
                        ? 'bg-cyan-500/10 border-cyan-500 text-cyan-300' 
                        : 'bg-white/5 border-transparent text-white/40 hover:bg-white/10'
                    }`}
                  >
                    <div>
                      <span className="text-xs font-bold font-sans tracking-wide">{p.name}</span>
                      <span className="text-[8px] block opacity-50 tracking-widest">{p.description}</span>
                    </div>
                    {activePersonality.id === p.id && <Zap className="w-3.5 h-3.5 text-cyan-400" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Vocal Modulation presets */}
            <div className="border-t border-white/5 pt-4 space-y-4">
              <span className="text-xs font-mono uppercase tracking-widest text-[#cf59d4] block font-bold">Vocal Modulators</span>
              
              <div className="space-y-4 font-mono text-[9px] uppercase text-white/40">
                <div className="grid grid-cols-2 gap-2">
                  {VOICE_PRESETS.map(preset => (
                    <button
                      key={preset.id}
                      onClick={() => applyPreset(preset)}
                      className={`py-2 px-1 rounded-none border text-[9px] uppercase font-bold tracking-widest transition-all ${
                        activeVoice === preset.voice && 
                        voiceParams.pitch === preset.pitch && 
                        voiceParams.rate === preset.rate
                          ? 'bg-purple-500/15 border-purple-500/40 text-purple-300' 
                          : 'bg-white/5 border-white/5 text-white/40 hover:bg-white/10'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <span>Frequency Offset</span>
                    <span className="text-purple-300">{voiceParams.pitch > 0 ? '+' : ''}{voiceParams.pitch} Hz</span>
                  </div>
                  <input 
                    type="range" 
                    min="-1200" 
                    max="1200" 
                    step="100"
                    value={voiceParams.pitch} 
                    onChange={(e) => updateVoiceParam('pitch', parseInt(e.target.value))}
                    className="w-full h-1 bg-white/10 rounded-none appearance-none cursor-pointer accent-[#cf59d4]"
                  />
                </div>

                <div className="space-y-1.5 border-t border-white/5 pt-3">
                  <span className="block mb-2">Dialect Matrix</span>
                  <div className="grid grid-cols-2 gap-1.5">
                    {ACCENTS.map(acc => (
                      <button
                        key={acc.id}
                        onClick={() => updateVoiceParam('accent', acc.id)}
                        className={`text-[8px] py-1 px-1 border tracking-widest ${
                          voiceParams.accent === acc.id 
                            ? 'bg-purple-500/10 border-purple-500/30 text-purple-300' 
                            : 'bg-white/5 border-white/5 text-white/30 hover:bg-white/10'
                        }`}
                      >
                        {acc.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Commit / Save system config change trigger */}
            <div className="pt-4 border-t border-white/10">
              <button 
                onClick={handleToggleConnection}
                className="w-full py-4 rounded-none bg-gradient-to-r from-cyan-600 to-indigo-600 hover:scale-[1.01] text-white font-bold uppercase tracking-widest flex items-center justify-center gap-3 transition-all shadow-lg shadow-indigo-500/10 cursor-pointer"
              >
                <Zap className="w-4 h-4 text-[#cf59d4] animate-pulse" />
                Commit Neural Changes
              </button>
              <p className="text-[8px] text-center text-white/30 mt-3 uppercase tracking-[0.2em] font-mono leading-relaxed">
                Re-init sequence loads customized parameters & memory logs into Eve's active prompt buffer
              </p>
            </div>
          </div>

        </div>
      </main>

      {/* Footer System Diagnostics Info */}
      <footer className="relative z-10 p-6 flex justify-between items-center text-[9px] font-mono uppercase tracking-[0.35em] text-white/20 border-t border-white/5 min-h-[60px] bg-black/40 backdrop-blur-md">
        <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-cyan-500/30 rotate-45" />
            Neural Link Status: <span className="text-cyan-500/50">Secure Protocol Loaded</span>
        </div>
        <div className="flex items-center gap-6">
            <span>Lat: 12ms</span>
            <span className="text-[#cf59d4]/40 font-bold">Node: Night-City-Vegas-09</span>
        </div>
      </footer>

      {/* Settings Modal (Backbone Params) */}
      <AnimatePresence>
        {showSettings && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-8 bg-black/90 backdrop-blur-xl"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md p-8 rounded-none border border-cyan-500/30 bg-[#05050a] relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-2 font-mono text-[8px] text-cyan-500/20 uppercase tracking-widest">SysConfig-Root</div>
              <div className="flex justify-between items-center mb-10">
                <h2 className="text-xl font-bold uppercase tracking-[0.2em] text-cyan-400">System Parameters</h2>
                <button onClick={() => setShowSettings(false)} className="text-white/20 hover:text-white uppercase font-mono text-[10px] tracking-widest">Close [Esc]</button>
              </div>
              
              <div className="space-y-6">
                <div className="flex items-center justify-between p-5 rounded-none bg-white/5 border border-white/5 hover:border-cyan-500/30 transition-all cursor-pointer group">
                  <div className="flex items-center gap-4">
                    <Camera className="w-5 h-5 text-white/40 group-hover:text-cyan-400" />
                    <span className="text-xs uppercase tracking-widest font-bold">Ultra-High Res Vision</span>
                  </div>
                  <div className="w-12 h-6 rounded-none bg-cyan-500/20 border border-cyan-500/50 relative">
                    <div className="absolute right-1 top-1 w-4 h-4 rounded-none bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.5)]" />
                  </div>
                </div>
                
                <div className="flex items-center justify-between p-5 rounded-none bg-white/5 border border-white/5 hover:border-magenta-500/30 transition-all cursor-pointer group">
                  <div className="flex items-center gap-4">
                    <Volume2 className="w-5 h-5 text-white/40 group-hover:text-magenta-400" />
                    <span className="text-xs uppercase tracking-widest font-bold">Neural Spatial Audio</span>
                  </div>
                  <div className="w-12 h-6 rounded-none bg-white/5 border border-white/10 relative">
                    <div className="absolute left-1 top-1 w-4 h-4 rounded-none bg-white/20" />
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      `}</style>
    </div>
  );
}
