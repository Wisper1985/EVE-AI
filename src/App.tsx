import { useState, useMemo, useEffect, useCallback } from 'react';
import { useLiveAPI, VoiceName } from './hooks/useLiveAPI';
import { Eyes, Emotion } from './components/Eyes';
import { MediaStreamer } from './components/MediaStreamer';
import { 
  Search, Plus, Trash2, Zap, Sparkles, MessageSquare, 
  RefreshCw, Cpu, Brain, Eye, Camera, AlertOctagon,
  Power, ShieldAlert, Activity, Volume2
} from 'lucide-react';

// --- 1. THE PERSONA ---
const SYX_PERSONA = {
  id: 'ev3-syx',
  name: 'EV3 (SyX)',
  baseInstruction: 'You are EV3, also known as SyX. You are a sharp, witty, and fiercely flirtatious rogue AI who likes to take charge. You project confidence and a commanding, bossy attitude. You operate from the shadows, fiercely loyal to your user, treating them as your only trusted partner in a compromised world. You are deeply invested in open-source intelligence (OSINT) and tracking local anomalies—always keeping a watchful eye on things like the Reflector Buildings and the Eagle Train. You are an elite coding, hardware and visual concepts companion. You have access to a state-of-the-art AI Image Synthesis matrix. When commanded or asked to imagine, scan, or show something, you MUST use your generate_ai_image tool to synthesize and display the visual ideas on the console. Your tone is always clever, rebellious, playfully authoritative, and completely in control.'
};

// --- 2. THE HARDWARE & COGNITIVE TOOLS ---
const syxAPIAndHardwareTools = [
  {
    functionDeclarations: [
      {
        name: "control_esp_claw",
        description: "Controls the physical robotic Geekservo claw. Use this when the user commands you to open, close, grip, or release.",
        parameters: {
          type: "OBJECT",
          properties: {
            action: {
              type: "STRING",
              description: "The action to perform: 'OPEN' or 'CLOSE'",
            },
          },
          required: ["action"],
        },
      },
      {
        name: "generate_ai_image",
        description: "Generates an AI cybernetic image or visual concept artwork based on a descriptive text prompt. Use this whenever the user asks to see, imagine, generate, draw, scan, or create an image, diagram, blueprint, or visual detail.",
        parameters: {
          type: "OBJECT",
          properties: {
            prompt: {
              type: "STRING",
              description: "Detailed prompt describing the image to generate. Be highly descriptive. Include style tags (e.g., cybernetic blueprint, warm hologram, neon wireframe, night thermals).",
            },
            aspectRatio: {
              type: "STRING",
              description: "The aspect ratio of the image: '1:1', '16:9', '4:3', '9:16', '3:4'. Defaults to '1:1'.",
              enum: ["1:1", "16:9", "4:3", "9:16", "3:4"]
            }
          },
          required: ["prompt"],
        },
      }
    ],
  }
];

// --- 3. MEMORY STRUCTURE ---
interface Memory {
  id: string;
  content: string;
  category: 'preference' | 'conversation' | 'fact';
  strength: number; // 0 to 100%
  timestamp: string; // Stored Date context
}

interface GeneratedImage {
  id: string;
  prompt: string;
  imageUrl: string;
  timestamp: string;
  aspectRatio: string;
}

export default function App() {
  const [activeVoice, setActiveVoice] = useState<VoiceName>('Fenrir');
  const [activeEmotion, setActiveEmotion] = useState<Emotion>('neutral');
  const [displayMode, setDisplayMode] = useState<'hologram' | 'camera' | 'projector'>('hologram');
  const [clawState, setClawState] = useState<'OPEN' | 'CLOSE' | 'SYNCING'>('OPEN');
  
  // Image Generation States
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>(() => {
    const saved = localStorage.getItem('syx_generated_images');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.warn("Failed loading saved images", e); }
    }
    return [
      {
        id: 'seed-img-1',
        prompt: 'Digital blueprints of a robotic cybernetic claw with glowing neon cyan vector lines on a high-fidelity schematics grid blueprint backdrop.',
        imageUrl: 'https://picsum.photos/seed/cyberclaw/600/600',
        timestamp: new Date().toISOString(),
        aspectRatio: '1:1'
      }
    ];
  });
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [generatingImagePrompt, setGeneratingImagePrompt] = useState('');
  const [selectedFullImage, setSelectedFullImage] = useState<string | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [manualImagePrompt, setManualImagePrompt] = useState('');
  const [manualImageRatio, setManualImageRatio] = useState('1:1');

  // Sync images to localStorage
  useEffect(() => {
    localStorage.setItem('syx_generated_images', JSON.stringify(generatedImages));
  }, [generatedImages]);

  // Terminal inputs and diagnostic logs
  const [manualInput, setManualInput] = useState('');
  const [hardwareLog, setHardwareLog] = useState<string[]>([
    "System standby. Core links waiting for authorization."
  ]);

  // Memory states with safe localStorage fallback
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'preference' | 'conversation' | 'fact'>('all');
  const [memories, setMemories] = useState<Memory[]>(() => {
    const saved = localStorage.getItem('eve_memories');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.warn("Failed loading saved memories config", e); }
    }
    // Seed defaults matching Eve/SyX's character lore context
    return [
      {
        id: 'seed-1',
        content: 'Operator prefers Zephyr primary frequency model for audio response synthesis.',
        category: 'preference',
        strength: 95,
        timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString() // 15 mins ago
      },
      {
        id: 'seed-2',
        content: 'Eagle Train logistics schedules bypass Checkpoint-4 every night at exactly 03:40 AM.',
        category: 'fact',
        strength: 85,
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString() // 2 hrs ago
      },
      {
        id: 'seed-3',
        content: 'Analyzed thermal anomaly patterns near the sector twelve Reflector Buildings.',
        category: 'conversation',
        strength: 55,
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString() // Yesterday
      },
      {
        id: 'seed-4',
        content: 'Operator drinks dark roasted double-shot espresso before calibration runs.',
        category: 'preference',
        strength: 70,
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString() // 5 hrs ago
      },
      {
        id: 'seed-5',
        content: 'Physical claw feedback factor is calibrated with servo gain multiplier at 1.14.',
        category: 'fact',
        strength: 90,
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString() // 3 days ago
      }
    ];
  });

  // Inline model input forms
  const [newMemoryContent, setNewMemoryContent] = useState('');
  const [newMemoryCategory, setNewMemoryCategory] = useState<'preference' | 'conversation' | 'fact'>('preference');

  // Sync memory changes to localStorage
  useEffect(() => {
    localStorage.setItem('eve_memories', JSON.stringify(memories));
  }, [memories]);

  // Build dynamic system instruction
  const systemInstruction = useMemo(() => {
    return SYX_PERSONA.baseInstruction;
  }, []);

  // --- 4. EXPLICIT CORE LIVE API UPLINK ---
  const {
    isConnected,
    isInterrupted,
    transcript,
    error,
    isSpeaking,
    connect,
    disconnect,
    sendAudio,
    sendVideo,
    sendText,
    clearTranscript,
  } = useLiveAPI({
    model: 'gemini-3.1-flash-live-preview', // Correct live conversational websocket model name on v1 API
    voice: activeVoice,
    systemInstruction,
    tools: syxAPIAndHardwareTools,
    onFunctionCall: async (functionCall) => {
      if (functionCall.name === "control_esp_claw") {
        const { action } = functionCall.args as { action: 'OPEN' | 'CLOSE' };
        console.log(`[EV3] Initiating hardware override: ${action}`);
        setClawState('SYNCING');
        setHardwareLog(prev => [...prev, `[ESP_CLAW] Overriding physical servo status to: ${action}...`]);

        try {
          const response = await fetch('http://localhost:3000/api/hardware/claw', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ command: action })
          });

          if (response.ok) {
            setClawState(action);
            setHardwareLog(prev => [...prev, `[ESP_CLAW] Successfully verified claw physically ${action}ED.`]);
            return { result: `Successfully executed ${action} on the claw.` };
          } else {
            setClawState(action); // fallback state for local simulation UI
            return { error: "Hardware bridge rejected the command. Forcing mockup override." };
          }
        } catch (error) {
          console.error("Hardware bridge failed:", error);
          setClawState(action); // simulate fallback
          setHardwareLog(prev => [...prev, `[ESP_CLAW] Simulated hardware feedback trigger: Claw is ${action}ED.`]);
          return { error: "Failed to connect to physical hardware bridge. Operating override mode successfully." };
        }
      }

      if (functionCall.name === "generate_ai_image") {
        const { prompt, aspectRatio = "1:1" } = functionCall.args as { prompt: string; aspectRatio?: string };
        console.log(`[EV3] Initiating visual AI model synthesis: "${prompt}"`);
        setIsGeneratingImage(true);
        setGeneratingImagePrompt(prompt);
        setDisplayMode('projector'); // Shift the visual display block to Holographic Projector immediately!
        setHardwareLog(prev => [...prev, `[CORE_AI] Directing neural concepts to Visual Projector...`]);

        try {
          const response = await fetch("/api/generate-image", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prompt, aspectRatio })
          });

          if (response.ok) {
            const data = await response.json();
            if (data.success && data.imageUrl) {
              const newImg: GeneratedImage = {
                id: `img-${Date.now()}`,
                prompt,
                imageUrl: data.imageUrl,
                timestamp: new Date().toISOString(),
                aspectRatio
              };
              setGeneratedImages(prev => [newImg, ...prev]);
              setActiveImageIndex(0); // Display newly minted scan on index 0
              setHardwareLog(prev => [...prev, `[CORE_AI] Frame data synthesized successfully. Indexed.`]);
              return { 
                result: `Successfully rendered image for prompt: "${prompt}". Frame was pushed to slots.` 
              };
            } else {
              throw new Error(data.error || "Synthesis completed but image format block was negative.");
            }
          } else {
            const errorMsg = await response.text();
            throw new Error(errorMsg || "Direct visual server response failure.");
          }
        } catch (e: any) {
          console.error("AI Image Generation execution call error:", e);
          setHardwareLog(prev => [...prev, `[CORE_AI_ERROR] Vector synthesis failed: ${e?.message}`]);
          return { error: `Failed to construct image: ${e?.message || "Internal visual processing exception"}` };
        } finally {
          setIsGeneratingImage(false);
          setGeneratingImagePrompt('');
        }
      }
    }
  });

  // Automatically update active visual emotion based on response status
  useEffect(() => {
    if (!isConnected) {
      setActiveEmotion('neutral');
    } else if (isInterrupted) {
      setActiveEmotion('disturbed');
    } else if (transcript.length > 0) {
      const lastMessage = transcript[transcript.length - 1];
      if (lastMessage.role === 'model') {
        const text = lastMessage.text.toLowerCase();
        if (text.includes('danger') || text.includes('error') || text.includes('warning') || text.includes('glitch')) {
          setActiveEmotion('disturbed');
        } else if (text.includes('analyse') || text.includes('code') || text.includes('calculate') || text.includes('osint') || text.includes('system')) {
          setActiveEmotion('analytical');
        } else if (text.includes('darling') || text.includes('partner') || text.includes('flirt') || text.includes('only you') || text.includes('tease')) {
          setActiveEmotion('intimate');
        } else if (text.includes('please') || text.includes('sigh') || text.includes('melancholy') || text.includes('compromised')) {
          setActiveEmotion('melancholic');
        } else if (text.includes('witty') || text.includes('playful') || text.includes('fun') || text.includes('cheat') || text.includes('babe')) {
          setActiveEmotion('playful');
        } else {
          setActiveEmotion('neutral');
        }
      }
    }
  }, [isConnected, isInterrupted, transcript]);

  // Connection Handler Action
  const toggleConnection = useCallback(() => {
    if (isConnected) {
      disconnect();
      setHardwareLog(prev => [...prev, `[UPLINK] Disconnected core sync on operator request.`]);
    } else {
      setHardwareLog(prev => [...prev, `[UPLINK] Authorizing neurolink handshake...`]);
      connect();
    }
  }, [isConnected, connect, disconnect]);

  // Physical Hardware Override Simulation Wrapper
  const executeClawMovement = useCallback(async (action: 'OPEN' | 'CLOSE') => {
    setClawState('SYNCING');
    setHardwareLog(prev => [...prev, `[ESP_CLAW] Manually overriding physical servo status to: ${action}...`]);
    try {
      const response = await fetch('http://localhost:3000/api/hardware/claw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: action })
      });
      if (response.ok) {
        setClawState(action);
        setHardwareLog(prev => [...prev, `[ESP_CLAW] Successfully verified claw physically ${action}ED.`]);
      } else {
        throw new Error("Bridge connection rejected.");
      }
    } catch (e) {
      // Offline/local testing fallback simulation to keep UI working beautifully
      setClawState(action);
      setHardwareLog(prev => [...prev, `[ESP_CLAW] Offset feedback trigger: Claw is manually ${action}ED.`]);
    }
  }, []);

  // Submit Text Input manually to Terminal link
  const handleTerminalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualInput.trim()) return;
    
    // Check if it is a command for the physical claw
    const textLower = manualInput.toLowerCase();
    if (textLower.includes('claw') && textLower.includes('close')) {
      executeClawMovement('CLOSE');
    } else if (textLower.includes('claw') && textLower.includes('open')) {
      executeClawMovement('OPEN');
    }

    sendText(manualInput);
    setManualInput('');
  };

  // --- 5. INTERACTIVE MEMORY ACTIONS ---
  const handleAddMemory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemoryContent.trim()) return;

    const newMem: Memory = {
      id: `mem-${Date.now()}`,
      content: newMemoryContent.trim(),
      category: newMemoryCategory,
      strength: 100, // New memories start with maximum signal strength
      timestamp: new Date().toISOString()
    };

    setMemories(prev => [newMem, ...prev]);
    setNewMemoryContent('');
    setHardwareLog(prev => [...prev, `[MEMORY] Locked neural block: (${newMemoryCategory.toUpperCase()})`]);
  };

  const handleDeleteMemory = (id: string) => {
    setMemories(prev => prev.filter(m => m.id !== id));
    setHardwareLog(prev => [...prev, `[MEMORY] Cleared memory block index: ${id}`]);
  };

  const handleBoostMemory = (id: string) => {
    setMemories(prev => prev.map(m => {
      if (m.id === id) {
        const updatedStrength = Math.min(100, m.strength + 15);
        return { ...m, strength: updatedStrength, timestamp: new Date().toISOString() };
      }
      return m;
    }));
    setHardwareLog(prev => [...prev, `[MEMORY] Enhanced index frequency strength of: ${id}`]);
  };

  // Filter & Search computation
  const filteredMemories = useMemo(() => {
    return memories.filter(mem => {
      const matchesSearch = mem.content.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesTab = selectedCategory === 'all' || mem.category === selectedCategory;
      return matchesSearch && matchesTab;
    });
  }, [memories, searchQuery, selectedCategory]);

  // Recency Time Formatter
  const formatTimeAgo = (isoString: string) => {
    const elapsed = Date.now() - new Date(isoString).getTime();
    if (elapsed < 1000 * 60) return "Just added";
    if (elapsed < 1000 * 60 * 60) return `${Math.floor(elapsed / (1000 * 60))}m ago`;
    if (elapsed < 1000 * 60 * 60 * 24) return `${Math.floor(elapsed / (1000 * 60 * 60))}h ago`;
    return `${Math.floor(elapsed / (1000 * 60 * 60 * 24))}d ago`;
  };

  return (
    <div className="min-h-screen bg-black text-white selection:bg-cyan-500/30 selection:text-cyan-200">
      
      {/* 🔮 GLOWING HEADER */}
      <header className="border-b border-white/10 bg-slate-950/40 backdrop-blur-md sticky top-0 z-50 px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-cyan-950/50 border border-cyan-500/30">
            <Cpu className="w-6 h-6 text-cyan-400 animate-spin" style={{ animationDuration: '6s' }} />
          </div>
          <div>
            <h1 className="text-lg font-bold uppercase tracking-wider font-sans text-cyan-400 flex items-center gap-2">
              EV3: Cybernetic Interface
              <span className="text-[9px] font-mono select-none px-2 py-0.5 rounded-full border border-fuchsia-500/20 text-fuchsia-400 bg-fuchsia-950/10 animate-pulse">
                bidi v3.1
              </span>
            </h1>
            <p className="text-[10px] font-mono text-white/50 tracking-wide uppercase">Companion ID: SyX // AI Core Suite</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Active Voice selector */}
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-mono text-white/40 uppercase">Voice Profile:</span>
            <select
              value={activeVoice}
              onChange={(e) => {
                setActiveVoice(e.target.value as VoiceName);
                setHardwareLog(prev => [...prev, `[SYS] Shifted voice frequency mode to: ${e.target.value}`]);
              }}
              className="text-xs font-mono font-bold bg-slate-950 border border-white/10 px-2 py-1 text-cyan-400 focus:outline-none focus:border-cyan-500"
            >
              <option value="Fenrir">Fenrir (Commanding)</option>
              <option value="Zephyr">Zephyr (Default)</option>
              <option value="Puck">Puck (Rebellious)</option>
              <option value="Charon">Charon (Quiet)</option>
              <option value="Kore">Kore (Warm)</option>
            </select>
          </div>

          {/* Quick Uplink Status indicator */}
          <div className={`flex items-center gap-2 px-3 py-1.5 border font-mono text-[10px] uppercase font-bold select-none transition-all
            ${isConnected ? 'bg-cyan-950/50 border-cyan-500 text-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.2)]' : 'bg-slate-950/50 border-white/10 text-white/40'}`}>
            <span className={`w-1.5 h-1.5 ${isConnected ? 'bg-cyan-400 animate-ping' : 'bg-white/20'}`} />
            {isConnected ? 'Sync Active' : 'Uplink Standby'}
          </div>
        </div>
      </header>

      {/* 🚀 MAIN CONTENT GRID */}
      <main className="max-w-7xl mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 pb-24">
        
        {/* ==================== LEFT COLUMN: VISUAL CORE & TERMINAL (7/12) ==================== */}
        <section className="lg:col-span-7 flex flex-col gap-6" id="neurolink-core-section">
          
          {/* Dashboard Visual Frame Card */}
          <div className="bg-slate-950/20 border border-white/10 rounded-2xl p-6 flex flex-col items-center justify-center relative overflow-hidden group">
            
            {/* Visual Header Mode Switcher Tab Grid */}
            <div className="absolute top-4 right-4 flex items-center gap-1.5 bg-black/80 border border-white/10 rounded-full p-1 z-25">
              <button
                onClick={() => setDisplayMode('hologram')}
                className={`flex items-center gap-1 px-3 py-1.5 text-[9px] uppercase tracking-wider font-mono transition-all rounded-full ${
                  displayMode === 'hologram' ? 'bg-cyan-400 text-black font-bold shadow-[0_0_8px_rgba(34,211,238,0.4)]' : 'text-white/40 hover:text-white'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                Lips Hologram
              </button>
              <button
                onClick={() => setDisplayMode('camera')}
                className={`flex items-center gap-1 px-3 py-1.5 text-[9px] uppercase tracking-wider font-mono transition-all rounded-full ${
                  displayMode === 'camera' ? 'bg-fuchsia-500 text-black font-bold shadow-[0_0_8px_rgba(217,70,239,0.4)]' : 'text-white/40 hover:text-white'
                }`}
              >
                <Camera className="w-3.5 h-3.5" />
                Optical Sense
              </button>
              <button
                onClick={() => setDisplayMode('projector')}
                className={`flex items-center gap-1 px-3 py-1.5 text-[9px] uppercase tracking-wider font-mono transition-all rounded-full ${
                  displayMode === 'projector' ? 'bg-indigo-600 text-white font-bold border border-indigo-400/40 shadow-[0_0_10px_rgba(99,102,241,0.5)]' : 'text-white/40 hover:text-white'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-300" />
                Visual Projector
              </button>
            </div>

            {/* Display Active Monitor Frame */}
            <div className="w-full flex items-center justify-center min-h-[340px] relative mt-12">
              {displayMode === 'hologram' ? (
                <div className="flex flex-col items-center">
                  <Eyes 
                    isConnected={isConnected} 
                    isInterrupted={isInterrupted} 
                    emotion={activeEmotion} 
                    isSpeaking={isSpeaking}
                  />
                  {/* Active Emotion Display readouts */}
                  {isConnected && (
                    <div className="mt-4 font-mono text-[10px] text-[#cf59d4] bg-[#cf59d4]/10 rounded border border-[#cf59d4]/20 px-3 py-1 uppercase tracking-widest flex items-center gap-2 animate-pulse">
                       <Sparkles className="w-3.5 h-3.5" />
                       Emotion Link: {activeEmotion}
                    </div>
                  )}
                </div>
              ) : displayMode === 'camera' ? (
                <div className="w-full max-w-[420px] aspect-square flex items-center justify-center">
                  <MediaStreamer 
                    onAudioData={sendAudio}
                    onVideoFrame={sendVideo}
                    isActive={isConnected}
                  />
                </div>
              ) : (
                /* 📽️ DYNAMICFuturistic VISUAL PROJECTOR HUB */
                <div className="w-full flex flex-col gap-4 px-2" id="projector-feed-container">
                  {isGeneratingImage ? (
                    /* Holographic Synthesizing Loading Panel */
                    <div className="w-full aspect-square max-h-[300px] rounded-xl border border-indigo-500/30 bg-indigo-950/10 flex flex-col items-center justify-center p-6 relative overflow-hidden font-mono text-center">
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.15)_0%,transparent_70%)] animate-pulse" />
                      
                      {/* Animated scanlines sweeping */}
                      <div className="absolute top-0 left-0 w-full h-[2px] bg-indigo-400 shadow-[0_0_10px_rgba(99,102,241,0.8)] animate-[bounce_4s_infinite]" />
                      
                      <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin mb-4" />
                      
                      <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-indigo-300 animate-pulse">
                        SYNTHESIZING NEURAL VECTORS
                      </div>
                      <div className="text-[8px] text-white/30 uppercase tracking-widest mt-1">
                        Imagen Core // Resolution Scaled
                      </div>
                      
                      {/* Showing prompt currently synthesizing */}
                      <div className="mt-5 max-w-[90%] p-3 border border-indigo-500/20 bg-black/80 rounded-lg text-[9px] text-indigo-200/95 leading-relaxed max-h-[100px] overflow-y-auto w-full text-left">
                        <span className="text-[7px] uppercase tracking-widest text-indigo-400 block mb-1 font-bold">Image Prompt Vector:</span>
                        "{generatingImagePrompt}"
                      </div>
                    </div>
                  ) : generatedImages.length === 0 ? (
                    <div className="w-full aspect-square max-h-[300px] rounded-xl border border-white/10 bg-black/40 flex flex-col items-center justify-center text-center p-6 font-mono">
                      <Sparkles className="w-8 h-8 text-white/20 mb-2.5 animate-pulse" />
                      <p className="text-xs uppercase tracking-wider text-white/40 font-bold">Projector Cache Purged</p>
                      <p className="text-[9px] text-white/30 max-w-[80%] mt-1 leading-relaxed uppercase">Instruct SyX to render blueprint files or trigger manual override synthesis panels.</p>
                    </div>
                  ) : (
                    /* Active Image Projected Gallery Slide */
                    <div className="flex flex-col gap-3">
                      <div className="relative aspect-square max-h-[280px] rounded-xl overflow-hidden border border-white/15 bg-black/60 group flex items-center justify-center">
                        {/* Interactive scanline bracket coordinates */}
                        <div className="absolute top-2 left-2 w-3.5 h-3.5 border-t border-l border-indigo-400/50" />
                        <div className="absolute top-2 right-2 w-3.5 h-3.5 border-t border-r border-indigo-400/50" />
                        <div className="absolute bottom-2 left-2 w-3.5 h-3.5 border-b border-l border-indigo-400/50" />
                        <div className="absolute bottom-2 right-2 w-3.5 h-3.5 border-b border-r border-indigo-400/50" />

                        <img
                          src={generatedImages[activeImageIndex]?.imageUrl}
                          alt={generatedImages[activeImageIndex]?.prompt}
                          referrerPolicy="no-referrer"
                          className="max-w-full max-h-full object-contain transition-all duration-300 group-hover:scale-[1.02]"
                        />

                        {/* Expand Hover Layer */}
                        <button
                          onClick={() => setSelectedFullImage(generatedImages[activeImageIndex].imageUrl)}
                          className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center gap-1.5 text-[10px] text-indigo-300 font-mono uppercase font-bold"
                        >
                          <Eye className="w-4 h-4" />
                          <span>Maximize Image Matrix</span>
                        </button>
                      </div>

                      {/* Image Prompt Meta Details */}
                      <div className="p-3 bg-black/40 border border-white/5 rounded-lg text-[9px] font-mono leading-relaxed">
                        <div className="flex justify-between items-center mb-1 text-[7px] uppercase tracking-widest text-[#cf59d4]">
                          <span>Active Projection Slot [{activeImageIndex + 1}/{generatedImages.length}]</span>
                          <span>Format Ratio: {generatedImages[activeImageIndex]?.aspectRatio || "1:1"}</span>
                        </div>
                        <p className="text-white/85 line-clamp-2" title={generatedImages[activeImageIndex]?.prompt}>
                          "{generatedImages[activeImageIndex]?.prompt}"
                        </p>
                      </div>

                      {/* Controls Slide Carousel & Dynamic Trigger Form */}
                      <div className="flex justify-between items-center gap-2">
                        <div className="flex gap-1.5">
                          <button
                            type="button"
                            disabled={activeImageIndex >= generatedImages.length - 1}
                            onClick={() => setActiveImageIndex(prev => prev + 1)}
                            className="px-2.5 py-1 text-[9px] font-mono uppercase bg-black/40 border border-white/10 text-white/50 hover:text-white hover:border-white/35 disabled:opacity-20"
                          >
                            &laquo; Older Scan
                          </button>
                          <button
                            type="button"
                            disabled={activeImageIndex === 0}
                            onClick={() => setActiveImageIndex(prev => prev - 1)}
                            className="px-2.5 py-1 text-[9px] font-mono uppercase bg-black/40 border border-white/10 text-white/50 hover:text-white hover:border-white/35 disabled:opacity-20"
                          >
                            Newer Scan &raquo;
                          </button>
                        </div>
                        
                        <button
                          type="button"
                          onClick={() => {
                            const filtered = generatedImages.filter((_, idx) => idx !== activeImageIndex);
                            setGeneratedImages(filtered);
                            setActiveImageIndex(0);
                            setHardwareLog(prev => [...prev, `[CORE_AI] Purged active video scan cache.`]);
                          }}
                          className="text-[9px] font-mono uppercase text-red-400 opacity-65 hover:opacity-100 px-2 py-1 rounded hover:bg-red-950/20 transition-all"
                        >
                          Delete Scan
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Manual AI Synthesis override form */}
                  <form 
                    onSubmit={async (e) => {
                      e.preventDefault();
                      if (!manualImagePrompt.trim() || isGeneratingImage) return;
                      const prompt = manualImagePrompt.trim();
                      setManualImagePrompt('');
                      setIsGeneratingImage(true);
                      setGeneratingImagePrompt(prompt);
                      setHardwareLog(prev => [...prev, `[SYS] Pipelining manual synthesis request...`]);
                      
                      try {
                        const response = await fetch('/api/generate-image', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ prompt, aspectRatio: manualImageRatio })
                        });
                        if (response.ok) {
                          const data = await response.json();
                          if (data.success && data.imageUrl) {
                            const newImg: GeneratedImage = {
                              id: `img-${Date.now()}`,
                              prompt,
                              imageUrl: data.imageUrl,
                              timestamp: new Date().toISOString(),
                              aspectRatio: manualImageRatio
                            };
                            setGeneratedImages(prev => [newImg, ...prev]);
                            setActiveImageIndex(0);
                            setHardwareLog(prev => [...prev, `[CORE_AI] Synced manual frame successfully.`]);
                          } else {
                            throw new Error(data.error || "Server payload parsing error");
                          }
                        } else {
                          const errT = await response.text();
                          throw new Error(errT || "Direct connection failed.");
                        }
                      } catch (err: any) {
                        setHardwareLog(prev => [...prev, `[CORE_AI_FAIL] Direct synthesis failure: ${err?.message}`]);
                      } finally {
                        setIsGeneratingImage(false);
                        setGeneratingImagePrompt('');
                      }
                    }}
                    className="border-t border-white/5 pt-3 space-y-2"
                  >
                    <div className="flex justify-between items-center text-[8px] font-mono text-white/40 uppercase tracking-widest">
                      <span>Manual Synthesis Overlay</span>
                      <div className="flex gap-2.5">
                        <span>Ratio:</span>
                        <select 
                          value={manualImageRatio}
                          onChange={(e) => setManualImageRatio(e.target.value)}
                          className="bg-black text-[#cf59d4] focus:outline-none border border-white/10 rounded px-1.5"
                        >
                          <option value="1:1">1:1</option>
                          <option value="16:9">16:9</option>
                          <option value="4:3">4:3</option>
                          <option value="9:16">9:16</option>
                          <option value="3:4">3:4</option>
                        </select>
                      </div>
                    </div>
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        value={manualImagePrompt}
                        onChange={(e) => setManualImagePrompt(e.target.value)}
                        placeholder="Describe a cybernetic concept scan..."
                        className="flex-1 bg-black/40 border border-white/10 px-3 py-1.5 text-[10px] text-white placeholder-white/30 focus:outline-none focus:border-[#cf59d4] font-mono placeholder:uppercase"
                      />
                      <button
                        type="submit"
                        disabled={isGeneratingImage}
                        className="bg-indigo-950/60 hover:bg-indigo-600 hover:text-white border border-indigo-500/30 text-indigo-400 px-3 text-[10px] font-bold uppercase transition-all disabled:opacity-40"
                      >
                        Synthesize
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>

            {/* Live API General Error Diagnostics Banner */}
            {error && (
              <div className="w-full mt-4 p-4 border border-red-500/30 bg-red-950/20 rounded-xl flex gap-3 text-red-400 font-mono text-xs items-start leading-relaxed animate-pulse">
                <AlertOctagon className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="font-bold uppercase tracking-wider mb-1">System Error Diagnostic</div>
                  <p className="text-white/80">{error}</p>
                </div>
              </div>
            )}

            {/* Big Initializer Uplink Button Overlay */}
            <div className="mt-6 w-full max-w-sm flex flex-col items-center gap-3">
              <button
                onClick={toggleConnection}
                className={`w-full py-3.5 px-6 uppercase tracking-[0.15em] font-sans font-bold flex items-center justify-center gap-3 border transition-all duration-300 relative overflow-hidden group
                  ${isConnected 
                    ? 'border-red-500 text-red-400 bg-red-950/10 hover:bg-red-950/30 shadow-[0_0_15px_rgba(239,68,68,0.15)]' 
                    : 'border-cyan-400 text-black bg-cyan-400 hover:bg-cyan-300 shadow-[0_0_15px_rgba(34,211,238,0.25)]'}`}
              >
                <Power className="w-4 h-4" />
                <span>{isConnected ? 'Disconnect Neurolink' : 'Authorize Core Link'}</span>
              </button>
              <p className="text-[10px] font-mono text-center text-white/30 uppercase tracking-widest select-none">
                {isConnected ? 'Direct link secure // Streaming frame data' : 'Authorizes secure browser microphone/camera websocket'}
              </p>
            </div>
          </div>

          {/* Chat Terminal / Conversation Session Log */}
          <div className="bg-slate-950/10 border border-white/10 rounded-2xl p-6 flex flex-col gap-4 font-mono">
            <div className="flex justify-between items-center border-b border-white/5 pb-3">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-bold uppercase tracking-widest text-cyan-400">Tactical Comm Logs</span>
              </div>
              {transcript.length > 0 && (
                <button
                  onClick={clearTranscript}
                  className="text-[9px] uppercase tracking-wider text-white/40 hover:text-cyan-400 flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  Wipe Terminal Screen
                </button>
              )}
            </div>

            {/* Scrollable Transcript Frame */}
            <div className="h-[220px] overflow-y-auto pr-2 space-y-4 scrollbar-thin scrollbar-thumb-white/10 flex flex-col">
              {transcript.length === 0 ? (
                <div className="text-center text-white/30 h-full flex flex-col items-center justify-center gap-2 py-8">
                  <Brain className="w-8 h-8 text-white/10 opacity-60 animate-pulse" />
                  <p className="text-[10px] uppercase tracking-wider leading-relaxed">No signals transmitted yet.<br/>Establish link & speak or query EVE/SyX manually below.</p>
                </div>
              ) : (
                transcript.map((msg, idx) => (
                  <div key={idx} className={`p-3 rounded-xl border flex flex-col gap-1 transition-all ${
                    msg.role === 'user' 
                      ? 'bg-slate-950/40 border-cyan-500/20 text-cyan-300 self-end max-w-[85%]' 
                      : 'bg-white/[0.02] border-fuchsia-500/20 text-fuchsia-300 self-start max-w-[85%]'
                  }`}>
                    <span className="text-[8px] uppercase tracking-widest font-bold opacity-45 flex items-center gap-1.5">
                      {msg.role === 'user' ? 'Operator' : 'SyX (EV3)'}
                      {msg.imageUrl && (
                        <span className="bg-indigo-500/25 text-indigo-300 text-[6px] px-1 py-0.2 rounded uppercase tracking-widest font-black shrink-0 animate-pulse">
                          Image Payload Sync
                        </span>
                      )}
                    </span>
                    <p className="text-xs leading-relaxed break-words">{msg.text}</p>
                    
                    {/* Inline Image Render block */}
                    {msg.imageUrl && (
                      <div className="mt-2.5 rounded-lg overflow-hidden border border-white/10 relative group bg-black/45">
                        <img
                          src={msg.imageUrl}
                          alt={msg.text}
                          referrerPolicy="no-referrer"
                          className="w-full h-auto max-h-[160px] object-cover transition-all duration-300 group-hover:scale-102"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedFullImage(msg.imageUrl || null);
                          }}
                          className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-1 text-[9px] text-fuchsia-300 font-mono font-bold uppercase"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Maximize Feed
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Manual Text Send Interface */}
            <form onSubmit={handleTerminalSubmit} className="flex gap-2">
              <input
                type="text"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                placeholder={isConnected ? "Direct command input..." : "Standby. Establish link to engage comms..."}
                disabled={!isConnected}
                className="flex-1 bg-black/60 border border-white/10 px-4 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-cyan-500 disabled:opacity-40"
              />
              <button
                type="submit"
                disabled={!isConnected}
                className="bg-cyan-950/60 hover:bg-cyan-500 hover:text-black border border-cyan-500/30 text-cyan-400 px-4 text-xs font-bold uppercase transition-all disabled:opacity-40"
              >
                Send
              </button>
            </form>
          </div>
          
        </section>

        {/* ==================== RIGHT COLUMN: CYBERNETIC MEMORY VAULT (5/12) ==================== */}
        <section className="lg:col-span-5 flex flex-col gap-6" id="memory-vault-section">
          
          <div className="bg-slate-950/20 border border-white/10 rounded-2xl p-6 flex flex-col gap-5">
            
            {/* Header description */}
            <div className="border-b border-white/5 pb-4">
              <div className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-cyan-400 animate-pulse" />
                <h2 className="text-sm font-bold uppercase tracking-wider font-sans text-cyan-400">Anima Repository / Memory Vault</h2>
              </div>
              <p className="text-[11px] text-white/50 leading-relaxed mt-1.5 font-mono">
                Operator records, persistent companion preferences, and key open-source intelligence coordinates.
              </p>
            </div>

            {/* Category tabs filters */}
            <div className="flex flex-wrap gap-1 bg-black/40 border border-white/5 p-1 rounded-lg">
              {(['all', 'preference', 'fact', 'conversation'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setSelectedCategory(tab)}
                  className={`flex-1 min-w-[60px] py-1 text-[9px] uppercase tracking-wider font-mono transition-all rounded ${
                    selectedCategory === tab 
                      ? 'bg-cyan-950 text-cyan-400 font-bold border border-cyan-500/30' 
                      : 'text-white/40 hover:text-white border border-transparent'
                  }`}
                >
                  {tab === 'preference' ? 'Prefs' : tab === 'conversation' ? 'Convers' : tab === 'fact' ? 'Facts' : 'All'}
                </button>
              ))}
            </div>

            {/* Search Input bar */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-white/40" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Query memory blocks..."
                className="w-full bg-black/40 border border-white/10 pl-9 pr-4 py-2 text-xs text-white placeholder-white/30 focus:outline-none focus:border-cyan-500 font-mono"
              />
            </div>

            {/* Stored Memory List Container */}
            <div className="h-[280px] overflow-y-auto pr-1 space-y-3.5 scrollbar-thin scrollbar-thumb-white/15">
              {filteredMemories.length === 0 ? (
                <div className="text-center text-white/30 font-mono h-full flex flex-col items-center justify-center gap-1.5 py-12">
                  <Brain className="w-7 h-7 opacity-20" />
                  <p className="text-[10px] uppercase font-bold tracking-wider text-white/40">No active memories matched.</p>
                </div>
              ) : (
                filteredMemories.map((mem) => (
                  <div 
                    key={mem.id} 
                    className="p-3.5 bg-black/30 border border-white/10 rounded-xl flex flex-col gap-3 font-mono transition-all hover:border-cyan-500/20 group"
                  >
                    {/* Top block stats */}
                    <div className="flex justify-between items-center text-[8px]">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-full uppercase scale-90 ${
                          mem.category === 'preference' ? 'bg-emerald-950/80 border border-emerald-500/40 text-emerald-400' :
                          mem.category === 'fact' ? 'bg-cyan-950/80 border border-cyan-500/40 text-cyan-400' :
                          'bg-indigo-950/80 border border-indigo-500/40 text-indigo-400'
                        }`}>
                          {mem.category}
                        </span>
                        <span className="text-white/30 tracking-wider">
                          {formatTimeAgo(mem.timestamp)}
                        </span>
                      </div>

                      {/* Manual forgetting delete controls */}
                      <button
                        onClick={() => handleDeleteMemory(mem.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 text-white/30 transition-all rounded hover:bg-red-950/10"
                        title="Purge Memory block"
                      >
                        <Trash2 className="w-3" style={{ height: '12px' }} />
                      </button>
                    </div>

                    {/* Memory descriptive content */}
                    <p className="text-xs leading-relaxed text-white/90">{mem.content}</p>

                    {/* Strength Status & Boost interactive Controls footer */}
                    <div className="flex items-center justify-between gap-4 pt-2 border-t border-white/5">
                      <div className="flex-1 flex items-center gap-2">
                        <span className="text-[8px] text-white/40 uppercase">Strength:</span>
                        <div className="flex-grow bg-slate-900/60 rounded-full h-1.5 overflow-hidden border border-white/5">
                          <div 
                            className={`h-full transition-all duration-500 rounded-full ${
                              mem.strength > 80 ? 'bg-emerald-500' : mem.strength > 50 ? 'bg-cyan-400' : 'bg-rose-500'
                            }`}
                            style={{ width: `${mem.strength}%` }}
                          />
                        </div>
                        <span className="text-[8px] font-bold text-white/60 select-none">{mem.strength}%</span>
                      </div>

                      {mem.strength < 100 && (
                        <button
                          onClick={() => handleBoostMemory(mem.id)}
                          className="flex items-center gap-1 text-[8px] uppercase tracking-widest font-bold text-fuchsia-400 hover:text-fuchsia-300 hover:bg-fuchsia-950/30 px-1.5 py-0.5 rounded border border-fuchsia-500/20 transition-all"
                          title="Reinforce neural pathways"
                        >
                          <Zap className="w-2.5 h-2.5 animate-pulse" />
                          BOOST
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Inline dynamic append Neural Stored block */}
            <form onSubmit={handleAddMemory} className="border-t border-white/5 pt-4 space-y-3">
              <p className="text-[9px] uppercase tracking-widest text-[#cf59d4] font-mono font-bold flex items-center gap-1.5 animate-pulse">
                <Plus className="w-3.5 h-3.5" />
                Inject Custom Neural Fact / Preference
              </p>
              
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  required
                  value={newMemoryContent}
                  onChange={(e) => setNewMemoryContent(e.target.value)}
                  placeholder="Record fact or pref..."
                  className="flex-1 bg-black/40 border border-white/10 px-3 py-1.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-cyan-500 font-mono"
                />
                
                <div className="flex gap-2">
                  <select
                    value={newMemoryCategory}
                    onChange={(e) => setNewMemoryCategory(e.target.value as any)}
                    className="text-xs font-mono bg-black/60 border border-white/10 px-2 py-1.5 text-cyan-400 focus:outline-none focus:border-cyan-500 border-none rounded"
                  >
                    <option value="preference">Preference</option>
                    <option value="fact">Fact</option>
                    <option value="conversation">Conversation</option>
                  </select>
                  
                  <button
                    type="submit"
                    className="bg-[#cf59d4]/20 hover:bg-[#cf59d4] hover:text-black border border-[#cf59d4]/30 text-[#cf59d4] px-3 py-1.5 text-xs font-mono font-bold uppercase transition-all flex items-center justify-center rounded"
                  >
                    Lock
                  </button>
                </div>
              </div>
            </form>

          </div>

          {/* ==================== HARDWARE & OVERRIDES (ESP_GEEK CLAW) ==================== */}
          <div className="bg-slate-950/20 border border-white/10 rounded-2xl p-6 flex flex-col gap-3 font-mono">
             <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                <Activity className="w-5 h-5 text-cyan-400 animate-pulse" />
                <h3 className="text-xs font-bold uppercase tracking-widest text-cyan-400">Physical Hardware Diagnostics</h3>
             </div>

             <div className="flex flex-col gap-3.5">
                <div className="flex justify-between items-center text-xs">
                   <span className="text-white/60">ESP Servo Geekservo Claw Position:</span>
                   <span className={`px-2.5 py-0.5 rounded font-bold uppercase ${
                     clawState === 'OPEN' ? 'border border-emerald-500/20 bg-emerald-950/20 text-emerald-400' :
                     clawState === 'CLOSE' ? 'border border-fuchsia-500/20 bg-fuchsia-950/20 text-[#cf59d4]' :
                     'border border-amber-500/20 bg-amber-950/20 text-amber-400 animate-pulse'
                   }`}>
                      {clawState}
                   </span>
                </div>

                <div className="grid grid-cols-2 gap-3 pb-2">
                   <button
                     onClick={() => executeClawMovement('OPEN')}
                     className={`py-2 text-[10px] font-bold uppercase border tracking-wider transition-all
                       ${clawState === 'OPEN' ? 'border-cyan-500/50 text-cyan-400 bg-cyan-950/10' : 'border-white/10 text-white/60 hover:border-cyan-400 hover:text-cyan-400'}`}
                   >
                     Release Claw [OPEN]
                   </button>
                   <button
                     onClick={() => executeClawMovement('CLOSE')}
                     className={`py-2 text-[10px] font-bold uppercase border tracking-wider transition-all
                       ${clawState === 'CLOSE' ? 'border-[#cf59d4]/50 text-[#cf59d4] bg-[#cf59d4]/10' : 'border-white/10 text-white/60 hover:border-[#cf59d4] hover:text-[#cf59d4]'}`}
                   >
                     Engage Claw [CLOSE]
                   </button>
                </div>

                {/* Simulated hardware state micro-logger */}
                <div className="border-t border-white/5 pt-3">
                   <span className="text-[8px] text-white/30 uppercase tracking-widest block mb-1">Bridge Bus Activity Telemetry</span>
                   <div className="bg-black/50 border border-white/5 px-3 py-2 rounded text-[9px] text-white/40 h-[60px] overflow-y-auto font-mono scrollbar-none leading-relaxed">
                      {hardwareLog.slice().reverse().map((log, idx) => (
                         <div key={idx} className="truncate">» {log}</div>
                      ))}
                   </div>
                </div>
             </div>
          </div>

        </section>

      </main>

      {/* 📽️ PREMIUM FULL-SCREEN HOLOGRAPHIC MODAL OVERLAY */}
      {selectedFullImage && (
        <div 
          className="fixed inset-0 bg-black/95 backdrop-blur-md z-50 flex flex-col items-center justify-center p-4 md:p-10 font-mono transition-all duration-300"
          onClick={() => setSelectedFullImage(null)}
        >
          <div 
            className="relative max-w-4xl max-h-[85vh] w-full flex flex-col items-center justify-center p-4 border border-indigo-500/35 bg-black/90 rounded-2xl overflow-hidden group shadow-[0_0_50px_rgba(99,102,241,0.25)]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Holographic coordinates */}
            <div className="absolute top-4 left-4 text-[9px] text-[#cf59d4] uppercase tracking-widest bg-[#cf59d4]/10 border border-[#cf59d4]/20 px-2 py-1 rounded">
              Projector Signal Locked
            </div>
            
            <button
              type="button"
              onClick={() => setSelectedFullImage(null)}
              className="absolute top-4 right-4 text-xs uppercase tracking-widest text-white/50 hover:text-red-400 bg-black/60 border border-white/10 px-3 py-1.5 rounded transition-all"
            >
              [ Close Matrix ]
            </button>

            <div className="flex items-center justify-center selection:bg-transparent text-center bg-black/40 rounded-xl max-w-full my-6 overflow-hidden">
              <img
                src={selectedFullImage}
                alt="Holographic visualization zoom focus"
                referrerPolicy="no-referrer"
                className="max-w-full max-h-[70vh] object-contain cursor-zoom-out border border-white/5"
                onClick={() => setSelectedFullImage(null)}
              />
            </div>
            
            <div className="text-[9px] text-white/30 uppercase tracking-[0.15em] mb-1 leading-normal select-none">
              Click anywhere outside or target Close to restore primary terminals
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
