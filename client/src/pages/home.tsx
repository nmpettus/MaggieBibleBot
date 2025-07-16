import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Book, Heart, Loader2, Mic, MicOff, Volume2, VolumeX, Settings } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';

interface BiblicalResponse {
  id: number;
  question: string;
  answer: string;
  scriptureReferences: string;
  recommendedResources?: string;
  createdAt: string;
}

export default function Home() {
  const [question, setQuestion] = useState("");
  const [response, setResponse] = useState<BiblicalResponse | null>(null);
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>("");
  const [microphoneLevel, setMicrophoneLevel] = useState(0);
  const [isTestingMic, setIsTestingMic] = useState(false);
  const [browserInfo, setBrowserInfo] = useState<string>("");
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [silenceTimer, setSilenceTimer] = useState<NodeJS.Timeout | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechSynthesis, setSpeechSynthesis] = useState<SpeechSynthesis | null>(null);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<string>("bIQlQ61Q7WgbyZAL7IWj"); // Always Faith voice
  const [elevenLabsVoices, setElevenLabsVoices] = useState<any[]>([]);
  const [useElevenLabs, setUseElevenLabs] = useState<boolean>(true); // Always try ElevenLabs Faith voice first
  const [currentWordIndex, setCurrentWordIndex] = useState<number>(-1);
  const [highlightTimers, setHighlightTimers] = useState<NodeJS.Timeout[]>([]);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
  const [currentVoiceInfo, setCurrentVoiceInfo] = useState<string>("Faith Voice");
  
  // Function to render text with word highlighting
  const renderHighlightedText = (text: string) => {
    const words = text.split(/\s+/);
    
    return words.map((word, index) => (
      <span
        key={index}
        className={`${
          currentWordIndex === index
            ? 'bg-yellow-100 text-gray-800 px-1 rounded-sm transition-all duration-200 shadow-sm border border-yellow-200'
            : ''
        }`}
      >
        {word}
        {index < words.length - 1 ? ' ' : ''}
      </span>
    ));
  };
  
  // Speech recognition hook
  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition
  } = useSpeechRecognition();

  // Initialize speech synthesis and detect browser
  useEffect(() => {
    const detectBrowser = () => {
      const userAgent = navigator.userAgent;
      let browser = "Unknown";
      
      if (userAgent.includes("Chrome") && !userAgent.includes("Edge")) {
        browser = "Chrome";
      } else if (userAgent.includes("Safari") && !userAgent.includes("Chrome")) {
        browser = "Safari";
      } else if (userAgent.includes("Firefox")) {
        browser = "Firefox";
      } else if (userAgent.includes("Edge")) {
        browser = "Edge";
      }
      
      setBrowserInfo(browser);
      console.log('Browser detected:', browser);
    };

    // Load ElevenLabs voices for better cartoon quality
    const loadElevenLabsVoices = async () => {
      try {
        const response = await fetch('/api/cartoon-voices');
        const data = await response.json();
        setElevenLabsVoices(data.voices || []);
        
        // Auto-select Faith voice for biblical guidance (or Rachel as fallback)
        const faithVoice = data.voices.find((v: any) => v.name.toLowerCase() === 'faith');
        const fallbackVoice = data.voices.find((v: any) => v.name === 'Rachel');
        
        if (faithVoice) {
          setSelectedVoice(faithVoice.voice_id);
          setCurrentVoiceInfo("Faith Voice");
          console.log('Auto-selected Faith voice for Maggie:', faithVoice.name);
        } else if (fallbackVoice) {
          setSelectedVoice(fallbackVoice.voice_id);
          setCurrentVoiceInfo("Rachel Voice");
          console.log('Auto-selected Rachel voice for Maggie (Faith not found):', fallbackVoice.name);
        }
      } catch (error) {
        console.error('Error loading ElevenLabs voices:', error);
        setUseElevenLabs(false);
      }
    };

    // Initialize speech synthesis as fallback
    if ('speechSynthesis' in window) {
      setSpeechSynthesis(window.speechSynthesis);
      
      // Load browser voices as fallback
      const loadBrowserVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        console.log('Available browser voices:', voices.map(v => `${v.name} (${v.lang})`));
        setAvailableVoices(voices);
        
        if (!useElevenLabs) {
          // Only use browser voices if ElevenLabs fails
          const juniorVoice = voices.find(v => v.name.toLowerCase().includes('junior'));
          if (juniorVoice) {
            setSelectedVoice(juniorVoice.name);
            console.log('Fallback to Junior voice:', juniorVoice.name);
          }
        }
      };
      
      loadBrowserVoices();
      window.speechSynthesis.onvoiceschanged = loadBrowserVoices;
    }

    // Try to load ElevenLabs voices first
    loadElevenLabsVoices();

    detectBrowser();
  }, []);

  // Get available audio devices
  useEffect(() => {
    const getAudioDevices = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioInputs = devices.filter(device => device.kind === 'audioinput');
        console.log('Available audio devices:', audioInputs);
        setAudioDevices(audioInputs);
        
        // Auto-select built-in microphone for better Web Speech API compatibility
        const builtInMic = audioInputs.find(device => 
          device.label.toLowerCase().includes('built-in') || 
          device.label.toLowerCase().includes('macbook')
        );
        if (builtInMic) {
          setSelectedDevice(builtInMic.deviceId);
          console.log('Auto-selected built-in microphone for better compatibility:', builtInMic.label);
        } else {
          // Fallback to AirPods if built-in not found
          const airpods = audioInputs.find(device => 
            device.label.toLowerCase().includes('airpods') || 
            device.label.toLowerCase().includes('bluetooth')
          );
          if (airpods) {
            setSelectedDevice(airpods.deviceId);
            console.log('Auto-selected AirPods:', airpods.label);
          }
        }
      } catch (error) {
        console.error('Error getting audio devices:', error);
      }
    };
    
    getAudioDevices();
  }, []);

  const askMaggieMutation = useMutation({
    mutationFn: async (questionText: string) => {
      const res = await apiRequest("POST", "/api/ask-maggie", { question: questionText });
      return await res.json() as BiblicalResponse;
    },
    onSuccess: (data) => {
      setResponse(data);
      setQuestion(""); // Clear the form
      setIsVoiceMode(false); // Ensure voice mode is off
      SpeechRecognition.stopListening(); // Stop any ongoing recognition
      resetTranscript(); // Clear transcript
      setTimeout(() => setHasSubmitted(false), 1000); // Reset submission flag after delay
      
      // Auto-speak the answer with Faith voice (no delay for faster response)
      if (data.answer) {
        speakText(data.answer);
      }
    }
  });

  // Handle transcript changes and auto-submission
  useEffect(() => {
    console.log('Transcript changed:', transcript, 'Voice mode:', isVoiceMode);
    
    if (transcript && isVoiceMode && transcript.length > 5 && !hasSubmitted) {
      console.log('Speech recognized:', transcript);
      setQuestion(transcript);
      
      // Clear existing silence timer
      if (silenceTimer) {
        clearTimeout(silenceTimer);
      }
      
      // Start new silence timer - auto-submit after 2 seconds of silence
      const timer = setTimeout(() => {
        console.log('Auto-submitting after 2 seconds of silence:', transcript);
        setHasSubmitted(true);
        setIsVoiceMode(false);
        SpeechRecognition.stopListening();
        askMaggieMutation.mutate(transcript.trim());
        resetTranscript();
      }, 2000);
      
      setSilenceTimer(timer);
    }
    
    // Handle when user manually stops voice mode
    if (transcript && !isVoiceMode && transcript.length > 5 && !hasSubmitted) {
      console.log('Submitting question after voice mode ended manually:', transcript);
      setHasSubmitted(true);
      SpeechRecognition.stopListening();
      askMaggieMutation.mutate(transcript.trim());
      resetTranscript();
    }
  }, [transcript, isVoiceMode]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (silenceTimer) {
        clearTimeout(silenceTimer);
      }
    };
  }, [silenceTimer]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (question.trim()) {
      askMaggieMutation.mutate(question.trim());
    }
  };

  const handleGoBack = () => {
    window.history.back();
  };

  const startListening = () => {
    if (!browserSupportsSpeechRecognition) {
      console.log('Speech recognition not supported');
      return;
    }
    
    console.log('Starting speech recognition...');
    setIsVoiceMode(true);
    resetTranscript();
    
    // Check microphone access with specific device if selected
    const constraints = {
      audio: selectedDevice ? { deviceId: { exact: selectedDevice } } : true
    };
    
    console.log('Using audio constraints:', constraints);
    
    navigator.mediaDevices.getUserMedia(constraints)
      .then(stream => {
        console.log('Microphone access granted');
        const track = stream.getAudioTracks()[0];
        console.log('Active audio track:', track.label);
        stream.getTracks().forEach(track => track.stop());
        
        SpeechRecognition.startListening({
          continuous: true,
          language: 'en-US',
          interimResults: true
        });
      })
      .catch(error => {
        console.error('Microphone access denied:', error);
        setIsVoiceMode(false);
      });
  };

  const stopListening = () => {
    console.log('Stopping speech recognition...');
    SpeechRecognition.stopListening();
    setIsVoiceMode(false);
    
    // Clear silence timer when manually stopping
    if (silenceTimer) {
      clearTimeout(silenceTimer);
      setSilenceTimer(null);
    }
  };

  // Keep track of current audio for cleanup - moved to top with other state

  // Text-to-speech functions with ElevenLabs integration
  const speakText = async (text: string) => {
    // Prevent multiple simultaneous speech requests
    if (isSpeaking) {
      console.log('Already speaking, ignoring request');
      return;
    }
    
    // Stop any current audio
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      setCurrentAudio(null);
    }
    if (useElevenLabs && selectedVoice) {
      try {
        setIsSpeaking(true);
        console.log('🎤 Faith speaking:', text.substring(0, 50) + '...');
        
        // Show immediate feedback to user
        const startTime = Date.now();
        
        const response = await fetch('/api/generate-speech', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text: text,
            voiceId: selectedVoice
          }),
        });

        if (!response.ok) {
          // Check if it's a quota exceeded issue
          if (response.status === 429) {
            const errorData = await response.json();
            if (errorData.quotaExceeded) {
              console.log('⚠️ ElevenLabs quota exceeded - Faith voice will be available when credits are renewed');
              throw new Error('QUOTA_EXCEEDED');
            }
          }
          // Check for other ElevenLabs issues that might allow fallback
          if (response.status === 500) {
            const errorData = await response.json();
            if (errorData.fallback) {
              console.log('ElevenLabs technical issue, using browser speech:', errorData.message);
              throw new Error('FAITH_VOICE_ERROR');
            }
          }
          throw new Error('Failed to generate speech');
        }

        const audioBuffer = await response.arrayBuffer();
        
        // Use HTML5 Audio for better compatibility
        const audioBlob = new Blob([audioBuffer], { type: 'audio/mpeg' });
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        
        // Set as current audio for cleanup
        setCurrentAudio(audio);
        setCurrentVoiceInfo("Faith Voice");
        
        // Safari requires user interaction for autoplay, but this is triggered by user action
        audio.oncanplaythrough = () => {
          const generationTime = Date.now() - startTime;
          console.log(`🚀 Audio ready in ${generationTime}ms, attempting to play...`);
          
          // Force play immediately (user already interacted by clicking)
          audio.play()
            .then(() => {
              console.log('✅ Audio playback started successfully');
              // Start word highlighting when audio starts with precise duration
              const audioDuration = audio.duration || undefined;
              startWordHighlighting(text, audioDuration);
            })
            .catch(error => {
              console.error('Audio play error (trying fallback):', error);
              // Try browser TTS as fallback
              setIsSpeaking(false);
              setCurrentAudio(null);
              
              // Fallback to enhanced browser speech
              if (speechSynthesis) {
                setIsSpeaking(true);
                playBrowserTTS(text);
                console.log('🔄 Fallback to enhanced browser speech synthesis');
              }
            });
        };
        
        audio.onended = () => {
          setIsSpeaking(false);
          setCurrentAudio(null);
          stopWordHighlighting();
          const totalTime = Date.now() - startTime;
          console.log(`✅ Faith finished speaking (${totalTime}ms total)`);
          URL.revokeObjectURL(audioUrl); // Clean up memory
        };
        
        audio.onerror = (error) => {
          console.error('Audio error:', error);
          setIsSpeaking(false);
          setCurrentAudio(null);
          URL.revokeObjectURL(audioUrl);
        };

        // Add load event handler
        audio.addEventListener('loadstart', () => {
          console.log('Audio loading started...');
        });

        // Preload and start loading immediately
        audio.preload = 'auto';
        audio.load();
        
        // Also try to play when loaded
        audio.addEventListener('loadeddata', () => {
          console.log('Audio data loaded, trying immediate play...');
          if (audio.readyState >= 2) { // HAVE_CURRENT_DATA
            audio.play().catch(err => console.log('Immediate play failed, waiting for canplaythrough'));
          }
        });
        return;
      } catch (error) {
        console.error('ElevenLabs speech error:', error);
        
        // Check if this is actually Azure TTS working (status 500 with fallback message)
        if (error.message && error.message.includes('temporarily unavailable')) {
          console.log('ElevenLabs technical issue, using browser speech:', error.message);
          setCurrentVoiceInfo("Azure Jenny");
          console.log('⚠️ ElevenLabs Faith voice temporarily unavailable - switching to Azure TTS');
          // Continue to browser TTS fallback below (Azure audio will play via API)
        } else {
          setIsSpeaking(false);
          
          // Faith voice failed - use enhanced free TTS as fallback
          if (error.message === 'QUOTA_EXCEEDED') {
            console.log('⚠️ Faith voice quota exceeded - switching to enhanced free TTS');
          } else if (error.message === 'FAITH_VOICE_ERROR') {
            console.log('⚠️ ElevenLabs Faith voice temporarily unavailable - switching to enhanced free TTS');
          } else {
            console.log('⚠️ ElevenLabs service unavailable - switching to enhanced free TTS');
          }
          // Continue to enhanced free TTS fallback below
        }
      }
    }

    // Enhanced free TTS fallback with child-optimized voice
    console.log('Using enhanced free TTS with child-optimized voice');
    
    if (!speechSynthesis) {
      console.log('⚠️ Speech synthesis not available in this browser');
      setIsSpeaking(false);
      return;
    }
    
    // Stop any current speech
    speechSynthesis.cancel();
    
    // Ensure we're in the right state for browser TTS
    setIsSpeaking(true);
    
    // Create utterance with child-optimized settings
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Clear, natural female voice optimization settings
    utterance.rate = 0.85; // Clear speaking rate for better understanding
    utterance.pitch = 1.2; // Slightly higher for feminine voice but not too high
    utterance.volume = 1.0;
    
    // Find the best child-like voice
    const voices = speechSynthesis.getVoices();
    
    // Priority order for clear, natural female voices (most understandable first)
    const clearFemaleVoices = [
      'samantha', 'karen', 'vicki', 'kathy', 'shelley', 'flo', 'sandy',
      'moira', 'tessa', 'anna', 'sara', 'zuzana', 'melina', 'daria',
      'junior', 'kid', 'child', 'young', 'girl', 'toy', 'baby', 'little'
    ];
    
    let chosenVoice = null;
    
    // Try to find the most clear and understandable female voice
    for (const pattern of clearFemaleVoices) {
      chosenVoice = voices.find(voice => 
        voice.name.toLowerCase().includes(pattern) && 
        voice.lang.startsWith('en')
      );
      if (chosenVoice) break;
    }
    
    // Fallback to any English voice if no child-like voice found
    if (!chosenVoice) {
      chosenVoice = voices.find(voice => voice.lang.startsWith('en')) || voices[0];
    }
    
    if (chosenVoice) {
      utterance.voice = chosenVoice;
      const voiceDisplayName = chosenVoice.name.replace(/\s*\([^)]*\)/g, ''); // Remove language codes
      setCurrentVoiceInfo(voiceDisplayName);
      console.log('Using enhanced clear female voice:', chosenVoice.name);
      console.log('🎯 Voice indicator updated to:', voiceDisplayName);
    }
    
    // Event handlers
    utterance.onstart = () => {
      setIsSpeaking(true);
      console.log('Enhanced natural female voice started speaking...');
      startWordHighlighting(text);
    };
    
    utterance.onend = () => {
      setIsSpeaking(false);
      stopWordHighlighting();
      console.log('Enhanced natural female voice finished speaking');
    };
    
    utterance.onerror = (event) => {
      setIsSpeaking(false);
      stopWordHighlighting();
      console.error('Enhanced speech error:', event.error);
    };
    
    // Start speaking with child-optimized settings
    speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    console.log('Stopping speech...');
    
    // Stop ElevenLabs Faith voice audio if playing
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      setCurrentAudio(null);
    }
    
    // Stop browser speech synthesis
    if (speechSynthesis) {
      speechSynthesis.cancel();
    }
    
    setIsSpeaking(false);
    stopWordHighlighting();
  };

  // Function to start word highlighting with precise timing
  const startWordHighlighting = (text: string, audioDuration?: number) => {
    const words = text.split(/\s+/);
    
    // Calculate more precise timing based on actual audio duration or speech patterns
    let millisecondsPerWord: number;
    
    if (audioDuration) {
      // Use actual audio duration for precise timing
      millisecondsPerWord = (audioDuration * 1000) / words.length;
    } else {
      // Enhanced timing calculation based on word characteristics
      const averageWordsPerMinute = 140; // Slightly slower for better comprehension
      const baseMillisecondsPerWord = (60 / averageWordsPerMinute) * 1000;
      
      // Adjust timing based on word length and complexity
      const avgWordLength = words.reduce((sum, word) => sum + word.length, 0) / words.length;
      const complexityMultiplier = Math.max(0.8, Math.min(1.3, avgWordLength / 5));
      
      millisecondsPerWord = baseMillisecondsPerWord * complexityMultiplier;
    }
    
    setCurrentWordIndex(0);
    
    // Clear any existing timers
    highlightTimers.forEach(timer => clearTimeout(timer));
    setHighlightTimers([]);
    
    // Start highlighting words sequentially with precise timing
    let currentIndex = 0;
    
    // Create individual timers for each word based on word-specific timing
    const newTimers: NodeJS.Timeout[] = [];
    
    // Schedule highlighting for each word
    words.forEach((word, index) => {
      // Adjust timing based on word characteristics
      const wordLength = word.length;
      const isPunctuation = /[.!?,:;]/.test(word);
      const isShortWord = wordLength <= 3;
      
      // Calculate individual word timing
      let wordMultiplier = 1;
      if (isPunctuation) wordMultiplier += 0.3; // Pause for punctuation
      if (isShortWord) wordMultiplier *= 0.8; // Faster for short words
      if (wordLength > 8) wordMultiplier *= 1.2; // Slower for long words
      
      const wordDelay = (millisecondsPerWord * wordMultiplier) * index;
      
      const timer = setTimeout(() => {
        setCurrentWordIndex(index);
      }, wordDelay);
      
      newTimers.push(timer);
    });
    
    // Set overall timer for cleanup
    const totalDuration = millisecondsPerWord * words.length;
    const cleanupTimer = setTimeout(() => {
      setCurrentWordIndex(-1);
      setHighlightTimers([]);
    }, totalDuration);
    
    newTimers.push(cleanupTimer);
    setHighlightTimers(newTimers);
  };

  const stopWordHighlighting = () => {
    highlightTimers.forEach(timer => clearTimeout(timer));
    setHighlightTimers([]);
    setCurrentWordIndex(-1);
  };

  const toggleSpeech = () => {
    console.log('Toggle speech clicked. isSpeaking:', isSpeaking, 'response:', response);
    if (isSpeaking) {
      stopSpeaking();
      stopWordHighlighting();
    } else if (response) {
      console.log('Speaking response answer:', response.answer?.substring(0, 50) + '...');
      speakText(response.answer);
    } else {
      console.log('No response available to speak');
    }
  };

  // Test voice function with Rachel voice
  const testVoice = () => {
    const testPhrase = "Hi there! I'm Maggie, your faithful biblical guide! By faith we understand God's love and grace.";
    speakText(testPhrase);
  };

  const testMicrophone = async () => {
    setIsTestingMic(true);
    try {
      const constraints = {
        audio: selectedDevice ? { deviceId: { exact: selectedDevice } } : true
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const microphone = audioContext.createMediaStreamSource(stream);
      
      microphone.connect(analyser);
      analyser.fftSize = 256;
      
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      const checkLevel = () => {
        analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((sum, value) => sum + value, 0) / bufferLength;
        setMicrophoneLevel(Math.round(average));
        
        if (isTestingMic) {
          requestAnimationFrame(checkLevel);
        }
      };
      
      checkLevel();
      
      // Stop after 5 seconds
      setTimeout(() => {
        setIsTestingMic(false);
        setMicrophoneLevel(0);
        stream.getTracks().forEach(track => track.stop());
        audioContext.close();
      }, 5000);
      
    } catch (error) {
      console.error('Error testing microphone:', error);
      setIsTestingMic(false);
    }
  };

  // Auto-stop listening after 30 seconds to prevent endless recording
  useEffect(() => {
    if (listening) {
      const timeout = setTimeout(() => {
        stopListening();
      }, 30000); // 30 second timeout

      return () => clearTimeout(timeout);
    }
  }, [listening]);

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900">
        <div className="absolute inset-0 opacity-40" style={{backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Ccircle cx='30' cy='30' r='1'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")"}}></div>
        <div className="absolute top-0 left-0 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl floating-animation"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-400/10 rounded-full blur-3xl floating-animation" style={{animationDelay: '3s'}}></div>
      </div>

      <div className="relative z-10">
        {/* Navigation Header */}
        <header className="w-full py-4 px-4 sm:px-6">
          <div className="max-w-4xl mx-auto">
            <Button
              variant="ghost"
              onClick={handleGoBack}
              className="glass-card inline-flex items-center text-white/80 hover:text-white transition-all duration-300 text-sm font-medium p-3 h-auto magic-button"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Return to previous page
            </Button>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 px-4 sm:px-6 pb-12">
          <div className="max-w-4xl mx-auto">
            
            {/* Enhanced Hero Section */}
            <section className="text-center mb-12">
              {/* Title with enhanced Maggie image */}
              <div className="flex items-center justify-center gap-6 mb-8">
                {/* Enhanced Maggie logo with multiple glow effects */}
                <div className="relative">
                  <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-400 via-purple-500 to-pink-400 p-1 pulse-glow">
                    <div className="w-full h-full rounded-full bg-white/20 backdrop-blur-sm"></div>
                  </div>
                  <img 
                    src="https://velvety-lamington-6fd815.netlify.app/MaggieRead.jpeg" 
                    alt="Maggie the friendly dog reading a book" 
                    className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover border-4 border-white shadow-2xl floating-animation"
                  />
                  {/* Additional glow rings */}
                  <div className="absolute inset-0 rounded-full border-2 border-white/30 animate-ping" style={{animationDuration: '3s'}}></div>
                </div>
                
                {/* Enhanced title with layered effects */}
                <div className="relative">
                  <h1 className="text-5xl sm:text-6xl font-bold gradient-text leading-tight relative z-10">
                    Ask Maggie Bible Questions
                  </h1>
                  <div className="absolute inset-0 text-5xl sm:text-6xl font-bold gradient-text blur-sm opacity-50 leading-tight animate-pulse"></div>
                </div>
              </div>


            </section>

          {/* Enhanced Question Form */}
          <section className="mb-12">
            <div className="max-w-2xl mx-auto">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Enhanced Question input */}
                <div className="relative">
                  <div className="glass-card p-1 light-runner-border">
                    <Textarea
                      id="question"
                      value={question}
                      onChange={(e) => setQuestion(e.target.value)}
                      rows={4}
                      placeholder="Ask about grace, love, forgiveness, salvation, or any biblical topic..."
                      className="w-full resize-none bg-white/20 backdrop-blur-sm border-0 rounded-xl p-4 pr-12 text-xl text-gray-900 placeholder:text-gray-600 focus:bg-white/30 transition-all duration-300 focus:ring-2 focus:ring-blue-400/50"
                      disabled={askMaggieMutation.isPending}
                    />
                  </div>
                  {browserSupportsSpeechRecognition && (
                    <Button
                      type="button"
                      onClick={listening ? stopListening : startListening}
                      className={`absolute right-3 top-3 p-3 rounded-full transition-all duration-300 magic-button shadow-lg ${
                        listening 
                          ? 'bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white animate-pulse pulse-glow' 
                          : 'bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white'
                      }`}
                      disabled={askMaggieMutation.isPending}
                      title={listening ? "Stop recording" : "Start voice input"}
                    >
                      {listening ? (
                        <MicOff className="w-5 h-5" />
                      ) : (
                        <Mic className="w-5 h-5" />
                      )}
                    </Button>
                  )}
                </div>
                
                {/* Enhanced Voice status */}
                {browserSupportsSpeechRecognition && (
                  <div className="mt-4 text-sm">
                    {listening ? (
                      <div className="glass-card p-4 text-green-200 font-medium text-center">
                        <div className="flex items-center justify-center gap-2 mb-2">
                          <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                          🎤 Listening... Speak clearly into your microphone
                        </div>
                        <span className="text-xs text-white/60">
                          Recording will auto-stop after 30 seconds or click the microphone to stop
                        </span>
                      </div>
                    ) : (
                      <div className="glass-card p-3 text-center">
                        <span className="text-white/80">
                          💡 Click the microphone to speak your question aloud
                        </span>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Enhanced Fallback for unsupported browsers */}
                {!browserSupportsSpeechRecognition && (
                  <div className="glass-card p-4 mt-4 text-sm text-white/70 text-center">
                    Speech recognition not supported in this browser. Please type your question.
                  </div>
                )}

                {/* Enhanced Submit button */}
                <div className="flex justify-center">
                  <Button 
                    type="submit"
                    disabled={!question.trim() || askMaggieMutation.isPending}
                    className="magic-button bg-gradient-to-r from-emerald-500 to-blue-600 hover:from-emerald-600 hover:to-blue-700 text-white font-bold px-12 py-4 rounded-2xl text-lg shadow-2xl"
                  >
                    {askMaggieMutation.isPending ? (
                      <>
                        <Loader2 className="animate-spin -ml-1 mr-3 h-5 w-5" />
                        Asking Maggie...
                      </>
                    ) : (
                      "Ask Maggie"
                    )}
                  </Button>
                </div>

                {/* Error display */}
                {askMaggieMutation.error && (
                  <Alert variant="destructive">
                    <AlertDescription>
                      {askMaggieMutation.error instanceof Error 
                        ? askMaggieMutation.error.message 
                        : "Something went wrong. Please try again."}
                    </AlertDescription>
                  </Alert>
                )}
              </form>
            </div>
          </section>

          {/* Enhanced Response Display */}
          {response && (
            <section className="mb-12">
              <div className="glass-card p-1">
                <Card className="bg-gradient-to-br from-white/30 to-white/10 backdrop-blur-lg border-0 shadow-2xl">
                  <CardContent className="p-6 sm:p-8">
                    <div className="flex items-start space-x-6">
                      {/* Enhanced Maggie's avatar for response */}
                      <div className="flex-shrink-0">
                        <div className="relative">
                          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-emerald-400 to-blue-500 p-1 pulse-glow">
                            <div className="w-full h-full rounded-full bg-white/20 backdrop-blur-sm"></div>
                          </div>
                          <img 
                            src="https://velvety-lamington-6fd815.netlify.app/MaggieRead.jpeg" 
                            alt="Maggie" 
                            className="relative w-16 h-16 rounded-full object-cover border-4 border-white shadow-xl floating-animation"
                          />
                        </div>
                      </div>
                    
                    <div className="flex-1">
                      {/* Enhanced Response header */}
                      <div className="mb-6 flex items-center justify-between">
                        <div>
                          <h3 className="font-bold text-white text-2xl mb-2 gradient-text">Maggie's Biblical Perspective</h3>
                          <p className="text-white/80 text-sm bg-white/10 px-3 py-1 rounded-full backdrop-blur-sm">Based on the New Testament covenant of Grace</p>
                        </div>
                        
                        {/* Listen button with voice indicator */}
                        {speechSynthesis && (
                          <div className="flex items-center ml-4 shrink-0">
                            <div className="flex flex-col items-end">
                              <Button
                                onClick={toggleSpeech}
                                size="sm"
                                disabled={!response}
                                className={`magic-button px-6 py-2 font-semibold border-0 ${
                                  isSpeaking 
                                    ? 'bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 pulse-glow'
                                    : 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600'
                                } text-white`}
                              >
                                {isSpeaking ? (
                                  <>
                                    <VolumeX className="w-5 h-5 mr-2" />
                                    Stop
                                  </>
                                ) : (
                                  <>
                                    <Volume2 className="w-5 h-5 mr-2" />
                                    Listen ✝️
                                  </>
                                )}
                              </Button>
                              <div className="text-xs text-white/80 mt-1 px-3 py-1 bg-black/20 rounded-md backdrop-blur-sm border border-white/20">
                                {currentVoiceInfo || 'Loading Voice...'}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {/* Response content with word highlighting */}
                      <div className="prose prose-gray max-w-none">
                        <p className="text-foreground leading-relaxed mb-4">
                          {renderHighlightedText(response.answer)}
                        </p>
                        
                        {/* Scripture references */}
                        {response.scriptureReferences && (
                          <Card className="bg-white/60 border-l-4 border-l-primary mb-4">
                            <CardContent className="p-4">
                              <h4 className="font-semibold text-foreground text-sm mb-2">Related Scripture:</h4>
                              <p className="text-muted-foreground text-sm italic">
                                {response.scriptureReferences}
                              </p>
                            </CardContent>
                          </Card>
                        )}
                        
                        {/* Age-appropriate resources */}
                        {response.recommendedResources && (
                          <Card className="bg-blue-50/60 border-l-4 border-l-blue-500">
                            <CardContent className="p-4">
                              <h4 className="font-semibold text-foreground text-sm mb-2">📚 For Further Study (Age-Appropriate):</h4>
                              <div className="text-muted-foreground text-sm">
                                {response.recommendedResources.split(/(\[.*?\]\(https?:\/\/.*?\))/).map((part, index) => {
                                  const linkMatch = part.match(/\[(.*?)\]\((https?:\/\/.*?)\)/);
                                  if (linkMatch) {
                                    return (
                                      <a 
                                        key={index}
                                        href={linkMatch[2]} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
                                      >
                                        {linkMatch[1]}
                                      </a>
                                    );
                                  }
                                  return part;
                                })}
                              </div>
                            </CardContent>
                          </Card>
                        )}
                      </div>
                      
                      {/* Response footer */}
                      <div className="mt-6 pt-4 border-t border-gray-200">
                        <p className="text-xs text-muted-foreground">
                          Response generated based on biblical teachings of grace and love. 
                          For deeper study, consider works by Tim Keller and Andrew Farley.
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            </section>
          )}

          {/* Enhanced Additional Info with Better Visibility */}
          <section className="text-center">
            <div className="relative">
              {/* Dark background with enhanced contrast */}
              <div className="absolute inset-0 bg-gradient-to-br from-slate-900/95 to-gray-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/10"></div>
              
              <Card className="relative bg-transparent border-0 shadow-none">
                <CardContent className="p-8 sm:p-12">
                  <h3 className="text-3xl font-bold text-white mb-6 drop-shadow-lg">About This Ministry Tool</h3>
                  <p className="text-gray-100 leading-relaxed max-w-3xl mx-auto mb-8 text-lg drop-shadow-sm">
                    This AI-powered tool provides biblical guidance rooted in the New Testament's message of grace and God's unconditional love. 
                    All responses are crafted with care to reflect sound theological principles, featuring the authentic 
                    <span className="font-bold text-blue-300 drop-shadow-sm"> Faith voice ✝️</span> for spiritual encouragement.
                  </p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mt-12">
                    <div className="text-center">
                      <div className="bg-gradient-to-br from-blue-600/90 to-blue-800/90 backdrop-blur-sm p-4 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4 shadow-xl border border-blue-400/30">
                        <Book className="w-10 h-10 text-blue-100" />
                      </div>
                      <h4 className="font-bold text-white text-lg mb-2 drop-shadow-sm">Scripture-Based</h4>
                      <p className="text-gray-200 drop-shadow-sm">All answers rooted in biblical truth</p>
                    </div>
                    
                    <div className="text-center">
                      <div className="bg-gradient-to-br from-pink-600/90 to-pink-800/90 backdrop-blur-sm p-4 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4 shadow-xl border border-pink-400/30">
                        <Heart className="w-10 h-10 text-pink-100" />
                      </div>
                      <h4 className="font-bold text-white text-lg mb-2 drop-shadow-sm">Grace-Centered</h4>
                      <p className="text-gray-200 drop-shadow-sm">Focused on God's love and grace</p>
                    </div>
                    
                    <div className="text-center">
                      <div className="bg-gradient-to-br from-purple-600/90 to-purple-800/90 backdrop-blur-sm p-4 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4 shadow-xl border border-purple-400/30">
                        <Volume2 className="w-10 h-10 text-purple-100" />
                      </div>
                      <h4 className="font-bold text-white text-lg mb-2 drop-shadow-sm">Faith Voice ✝️</h4>
                      <p className="text-gray-200 drop-shadow-sm">Authentic audio responses</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* Disclaimer at bottom */}
          <footer className="mt-16 pb-8">
            <div className="glass-card p-4 max-w-4xl mx-auto">
              <p className="text-sm text-white/70 leading-relaxed text-center">
                Answers are based on the New Testament covenant of Grace and God's Love as taught by 
                <span className="font-semibold text-blue-200"> Tim Keller, Andrew Farley, and other conservative evangelical pastors and experts</span>.
              </p>
            </div>
          </footer>

        </div>
      </main>
      </div>
    </div>
  );
}
