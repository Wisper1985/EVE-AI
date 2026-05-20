import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";
import { useCallback, useEffect, useRef, useState } from "react";

export type VoiceName = 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Zephyr';

export interface LiveAPIConfig {
  model: string;
  voice: VoiceName;
  systemInstruction: string;
  voiceParams?: {
    pitch: number; // -1200 to 1200 (cents)
    rate: number;  // 0.5 to 2.0
  };
  tools?: any[];
  onFunctionCall?: (functionCall: { name: string; args: any; id?: string }) => Promise<any>;
}

export function useLiveAPI(config: LiveAPIConfig) {
  const [isConnected, setIsConnected] = useState(false);
  const [isInterrupted, setIsInterrupted] = useState(false);
  const [transcript, setTranscript] = useState<{ role: 'user' | 'model', text: string, imageUrl?: string }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  const sessionRef = useRef<any>(null);
  const speakingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioWorkletNodeRef = useRef<AudioWorkletNode | null>(null);
  const nextStartTimeRef = useRef<number>(0);

  const connect = useCallback(async () => {
    setError(null);
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      setError("API Key is missing. Please add GEMINI_API_KEY to Settings > Secrets in the builder panel.");
      return;
    }

    const ai = new GoogleGenAI({ apiKey });
    
    try {
      const sessionPromise = ai.live.connect({
        model: config.model,
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: config.voice } },
          },
          systemInstruction: config.systemInstruction,
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          tools: config.tools,
        },
        callbacks: {
          onopen: () => {
            setIsConnected(true);
            setError(null);
            console.log("Live API connected");
          },
          onmessage: async (message: LiveServerMessage) => {
            const msgAsAny = message as any;

            // Handle tool callbacks requested by the Live model
            if (msgAsAny.toolCall && config.onFunctionCall) {
              const { functionCalls } = msgAsAny.toolCall;
              if (functionCalls && sessionRef.current) {
                for (const call of functionCalls) {
                  try {
                    const responseResult = await config.onFunctionCall(call);
                    sessionRef.current.sendToolResponse({
                      functionResponses: [{
                        response: responseResult || { status: "executed" },
                        id: call.id
                      }]
                    });
                  } catch (err: any) {
                    console.error("Error executing tool call in useLiveAPI:", err);
                    sessionRef.current.sendToolResponse({
                      functionResponses: [{
                        response: { error: err?.message || "Execution failed" },
                        id: call.id
                      }]
                    });
                  }
                }
              }
            }

            if (message.serverContent?.interrupted) {
              setIsInterrupted(true);
              setIsSpeaking(false);
              if (speakingTimeoutRef.current) {
                clearTimeout(speakingTimeoutRef.current);
              }
              // Clear audio queue
              nextStartTimeRef.current = audioContextRef.current?.currentTime || 0;
              // Mark last model chunk as interrupted
              setTranscript(prev => {
                if (prev.length > 0 && prev[prev.length - 1].role === 'model') {
                  const updated = [...prev];
                  const last = updated[updated.length - 1];
                  if (!last.text.endsWith("[Interrupted]")) {
                    updated[updated.length - 1] = { ...last, text: last.text + " [Interrupted]" };
                  }
                  return updated;
                }
                return prev;
              });
            }

            // User Audio transcription returned by Gemini Live
            const serverContentAsAny = message.serverContent as any;
            if (serverContentAsAny?.userTurn?.parts) {
              const userText = serverContentAsAny.userTurn.parts
                .map((p: any) => p.text)
                .filter(Boolean)
                .join("");
              if (userText) {
                setTranscript(prev => [...prev, { role: 'user', text: userText }]);
              }
            }

            // Model transcription and playback
            if (message.serverContent?.modelTurn) {
              const parts = message.serverContent.modelTurn.parts;
              let modelTextChunk = "";
              for (const part of parts) {
                if (part.inlineData) {
                  const base64Audio = part.inlineData.data;
                  playAudioChunk(base64Audio);
                }
                if (part.text) {
                  modelTextChunk += part.text;
                }
              }
              if (modelTextChunk) {
                setTranscript(prev => {
                  const last = prev[prev.length - 1];
                  if (last && last.role === 'model' && !last.text.endsWith("[Interrupted]")) {
                    const updated = [...prev];
                    updated[updated.length - 1] = {
                      ...last,
                      text: last.text + modelTextChunk
                    };
                    return updated;
                  } else {
                    return [...prev, { role: 'model', text: modelTextChunk }];
                  }
                });
              }
            }
            
            if (message.serverContent?.turnComplete) {
              setIsInterrupted(false);
            }
          },
          onclose: () => {
            setIsConnected(false);
            setIsSpeaking(false);
            if (speakingTimeoutRef.current) {
              clearTimeout(speakingTimeoutRef.current);
            }
            console.log("Live API closed");
          },
          onerror: (err: any) => {
            console.error("Live API error:", err);
            setError(err?.message || "Connection error occurred. Check api key or internet connectivity.");
            setIsConnected(false);
            setIsSpeaking(false);
            if (speakingTimeoutRef.current) {
              clearTimeout(speakingTimeoutRef.current);
            }
          }
        }
      });

      sessionRef.current = await sessionPromise;
    } catch (e: any) {
      console.error("Live connect failed initialization:", e);
      setError(e?.message || "Initialization failed.");
      setIsConnected(false);
    }
  }, [config]);

  const disconnect = useCallback(() => {
    if (sessionRef.current) {
      sessionRef.current.close();
      sessionRef.current = null;
    }
    setIsConnected(false);
    setIsSpeaking(false);
    if (speakingTimeoutRef.current) {
      clearTimeout(speakingTimeoutRef.current);
    }
  }, []);

  const sendAudio = useCallback((base64Data: string) => {
    if (sessionRef.current && isConnected) {
      sessionRef.current.sendRealtimeInput({
        audio: { data: base64Data, mimeType: 'audio/pcm;rate=16000' }
      });
    }
  }, [isConnected]);

  const sendVideo = useCallback((base64Data: string) => {
    if (sessionRef.current && isConnected) {
      sessionRef.current.sendRealtimeInput({
        video: { data: base64Data, mimeType: 'image/jpeg' }
      });
    }
  }, [isConnected]);

  const sendText = useCallback((textStr: string) => {
    if (sessionRef.current && isConnected) {
      sessionRef.current.sendRealtimeInput({
        text: textStr
      });
      setTranscript(prev => [...prev, { role: 'user', text: textStr }]);
    }
  }, [isConnected]);

  const clearTranscript = useCallback(() => {
    setTranscript([]);
  }, []);

  const playAudioChunk = (base64Audio: string) => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    }

    const binaryString = atob(base64Audio);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    const pcmData = new Int16Array(bytes.buffer);
    const floatData = new Float32Array(pcmData.length);
    for (let i = 0; i < pcmData.length; i++) {
      floatData[i] = pcmData[i] / 32768.0;
    }

    const buffer = audioContextRef.current.createBuffer(1, floatData.length, 24000);
    buffer.getChannelData(0).set(floatData);

    const source = audioContextRef.current.createBufferSource();
    source.buffer = buffer;
    
    // Apply voice parameters
    if (config.voiceParams) {
      source.playbackRate.value = config.voiceParams.rate;
      source.detune.value = config.voiceParams.pitch;
    }

    source.connect(audioContextRef.current.destination);

    const startTime = Math.max(audioContextRef.current.currentTime, nextStartTimeRef.current);
    source.start(startTime);
    nextStartTimeRef.current = startTime + buffer.duration;

    // Speech animation timeout calculation
    setIsSpeaking(true);
    if (speakingTimeoutRef.current) {
      clearTimeout(speakingTimeoutRef.current);
    }
    const totalDurationSec = nextStartTimeRef.current - audioContextRef.current.currentTime;
    if (totalDurationSec > 0) {
      speakingTimeoutRef.current = setTimeout(() => {
        setIsSpeaking(false);
      }, totalDurationSec * 1000);
    }
  };

  return {
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
  };
}
