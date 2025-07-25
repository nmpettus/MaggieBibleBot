import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ArrowLeft, Book, Heart, Loader2, Mic, MicOff, Volume2, VolumeX, Settings, Play, Pause, Square, SkipBack, SkipForward } from "lucide-react";
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
  const [currentAudioUrl, setCurrentAudioUrl] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [pausedWordIndex, setPausedWordIndex] = useState<number>(-1);
  const [currentResponseText, setCurrentResponseText] = useState<string>("");
  const [showVersePopup, setShowVersePopup] = useState<boolean>(false);
  const [selectedVerse, setSelectedVerse] = useState<string>("");
  const [verseText, setVerseText] = useState<string>("");
  
  // Function to render text with precise word highlighting
  const renderHighlightedText = (text: string) => {
    const words = text.split(/\s+/);
    
    return words.map((word, index) => [
      <span
        key={index}
        className={`transition-all duration-100 ${
          currentWordIndex === index
            ? 'underline decoration-blue-500 decoration-2 underline-offset-2 font-semibold text-blue-700'
            : 'hover:text-gray-600'
        }`}
        style={{
          display: 'inline-block',
          transformOrigin: 'center',
        }}
      >
        {word}
      </span>,
      index < words.length - 1 ? ' ' : null
    ]).flat();
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

  // Enhanced audio control functions
  const toggleSpeech = () => {
    console.log('Toggle speech clicked. isSpeaking:', isSpeaking, 'isPaused:', isPaused, 'response:', response);
    if (isSpeaking && !isPaused) {
      pauseSpeech();
    } else if (isPaused) {
      resumeSpeech();
    } else if (response) {
      console.log('Starting Azure Sara voice for:', response.answer?.substring(0, 50) + '...');
      setCurrentResponseText(response.answer);
      speakText(response.answer);
    } else {
      console.log('No response available to speak');
    }
  };

  const pauseSpeech = () => {
    console.log('🔍 Attempting to pause speech. Current audio:', !!currentAudio, 'Is paused:', currentAudio?.paused);
    console.log('🔍 Current audio readyState:', currentAudio?.readyState, 'networkState:', currentAudio?.networkState);
    
    if (currentAudio && !currentAudio.paused) {
      try {
        currentAudio.pause();
        setIsPaused(true);
        setPausedWordIndex(currentWordIndex);
        console.log(`⏸️ Speech paused successfully at word ${currentWordIndex}`);
      } catch (error) {
        console.log('❌ Error pausing audio:', error);
        setIsPaused(true);
        setPausedWordIndex(currentWordIndex);
      }
    } else if (currentAudio && currentAudio.paused) {
      console.log('⚠️ Audio is already paused, updating UI state');
      setIsPaused(true);
      setPausedWordIndex(currentWordIndex);
    } else {
      console.log('⚠️ Cannot pause: No current audio available');
      // Still update UI to show paused state
      setIsPaused(true);
      setPausedWordIndex(currentWordIndex);
    }
  };

  const resumeSpeech = () => {
    console.log('🔍 Attempting to resume speech. Current audio:', !!currentAudio, 'Is paused:', currentAudio?.paused);
    
    if (currentAudio && currentAudio.paused && isPaused) {
      currentAudio.play()
        .then(() => {
          setIsPaused(false);
          console.log(`▶️ Speech resumed from word ${pausedWordIndex}`);
        })
        .catch((error) => {
          console.log('Error resuming audio:', error);
          setIsPaused(false);
        });
    } else if (currentAudio && !currentAudio.paused) {
      // Audio is already playing, just update state
      setIsPaused(false);
      console.log('▶️ Audio already playing, updated state');
    } else {
      console.log('⚠️ Cannot resume: No current audio available');
      setIsPaused(false);
    }
  };

  const restartFromBeginning = () => {
    if (response?.answer) {
      stopSpeaking();
      setCurrentWordIndex(-1);
      setPausedWordIndex(-1);
      setIsPaused(false);
      setTimeout(() => {
        speakText(response.answer);
      }, 100);
    }
  };

  // Bible verse lookup function
  const handleVerseClick = async (verse: string) => {
    setSelectedVerse(verse);
    setShowVersePopup(true);
    
    // Comprehensive verse text lookup database
    const verseTexts: { [key: string]: string } = {
      'Romans 8:1': 'Therefore, there is now no condemnation for those who are in Christ Jesus.',
      'Matthew 11:28': 'Come to me, all you who are weary and burdened, and I will give you rest.',
      'Romans 8:38-39': 'For I am convinced that neither death nor life, neither angels nor demons, neither the present nor the future, nor any powers, neither height nor depth, nor anything else in all creation, will be able to separate us from the love of God that is in Christ Jesus our Lord.',
      'John 3:16': 'For God so loved the world that he gave his one and only Son, that whoever believes in him shall not perish but have eternal life.',
      'Ephesians 2:8-9': 'For it is by grace you have been saved, through faith - and this is not from yourselves, it is the gift of God - not by works, so that no one can boast.',
      '1 John 1:9': 'If we confess our sins, he is faithful and just and will forgive us our sins and purify us from all unrighteousness.',
      'Romans 5:8': 'But God demonstrates his own love for us in this: While we were still sinners, Christ died for us.',
      'Philippians 4:13': 'I can do all this through him who gives me strength.',
      'Psalm 23:1': 'The Lord is my shepherd, I lack nothing.',
      'John 14:6': 'Jesus answered, I am the way and the truth and the life. No one comes to the Father except through me.',
      'Romans 6:23': 'For the wages of sin is death, but the gift of God is eternal life in Christ Jesus our Lord.',
      '2 Corinthians 5:17': 'Therefore, if anyone is in Christ, the new creation has come: The old has gone, the new is here!',
      'Jeremiah 29:11': 'For I know the plans I have for you, declares the Lord, plans to prosper you and not to harm you, to give you hope and a future.',
      'Isaiah 41:10': 'So do not fear, for I am with you; do not be dismayed, for I am your God. I will strengthen you and help you; I will uphold you with my righteous right hand.',
      'Proverbs 3:5-6': 'Trust in the Lord with all your heart and lean not on your own understanding; in all your ways submit to him, and he will make your paths straight.',
      '1 Peter 5:7': 'Cast all your anxiety on him because he cares for you.',
      'Matthew 5:16': 'In the same way, let your light shine before others, that they may see your good deeds and glorify your Father in heaven.',
      'Galatians 2:20': 'I have been crucified with Christ and I no longer live, but Christ lives in me. The life I now live in the body, I live by faith in the Son of God, who loved me and gave himself for me.',
      'Romans 12:2': 'Do not conform to the pattern of this world, but be transformed by the renewing of your mind. Then you will be able to test and approve what God\'s will is - his good, pleasing and perfect will.',
      'Philippians 4:19': 'And my God will meet all your needs according to the riches of his glory in Christ Jesus.',
      '1 Corinthians 10:13': 'No temptation has overtaken you except what is common to mankind. And God is faithful; he will not let you be tempted beyond what you can bear. But when you are tempted, he will also provide a way out so that you can endure it.',
      'Matthew 6:26': 'Look at the birds of the air; they do not sow or reap or store away in barns, and yet your heavenly Father feeds them. Are you not much more valuable than they?',
      'Hebrews 13:5': 'Keep your lives free from the love of money and be content with what you have, because God has said, Never will I leave you; never will I forsake you.',
      'James 1:17': 'Every good and perfect gift is from above, coming down from the Father of the heavenly lights, who does not change like shifting shadows.',
      '1 John 4:19': 'We love because he first loved us.',
      'Romans 15:13': 'May the God of hope fill you with all joy and peace as you trust in him, so that you may overflow with hope by the power of the Holy Spirit.'
    };
    
    setVerseText(verseTexts[verse] || 'Verse text not available. Please look up this verse in your Bible.');
  };

  // Browser TTS function for fallback
  const playBrowserTTS = (text: string) => {
    if (!speechSynthesis) {
      console.log('⚠️ Speech synthesis not available in this browser');
      setIsSpeaking(false);
      return;
    }
    
    // Stop any current speech
    speechSynthesis.cancel();
    
    // Create utterance with child-optimized settings
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Clear, natural female voice optimization settings
    utterance.rate = 0.85;
    utterance.pitch = 1.2;
    utterance.volume = 1.0;
    
    // Find the best child-like voice
    const voices = speechSynthesis.getVoices();
    
    // Priority order for clear, natural female voices
    const clearFemaleVoices = [
      'samantha', 'karen', 'vicki', 'kathy', 'shelley', 'flo', 'sandy',
      'moira', 'tessa', 'anna', 'sara', 'zuzana', 'melina', 'daria'
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
    
    // Fallback to any English voice if no female voice found
    if (!chosenVoice) {
      chosenVoice = voices.find(voice => voice.lang.startsWith('en')) || voices[0];
    }
    
    if (chosenVoice) {
      utterance.voice = chosenVoice;
      const voiceDisplayName = chosenVoice.name.replace(/\s*\([^)]*\)/g, '');
      setCurrentVoiceInfo(voiceDisplayName);
      console.log('Using browser voice:', chosenVoice.name);
    }
    
    // Event handlers
    utterance.onstart = () => {
      setIsSpeaking(true);
      console.log('Browser TTS started speaking...');
      startWordHighlighting(text);
    };
    
    utterance.onend = () => {
      setIsSpeaking(false);
      stopWordHighlighting();
      console.log('Browser TTS finished speaking');
    };
    
    utterance.onerror = (error) => {
      console.error('Browser TTS error:', error);
      setIsSpeaking(false);
      stopWordHighlighting();
    };
    
    // Speak the text
    speechSynthesis.speak(utterance);
  };

  // Text-to-speech functions with ElevenLabs integration
  const speakText = async (text: string) => {
    // Only stop if there's currently playing audio
    if (currentAudio && !currentAudio.paused) {
      console.log('🔄 Stopping current audio to start new speech...');
      currentAudio.pause();
      currentAudio.currentTime = 0;
    }
    
    // Cancel any browser TTS
    if (speechSynthesis.speaking) {
      speechSynthesis.cancel();
    }
    
    // Reset states but don't prevent new audio from starting
    setIsSpeaking(false);
    stopWordHighlighting();
    
    console.log('🎤 Starting new speech request...');
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
        
        // Get the actual voice used from response headers
        const voiceUsed = response.headers.get('X-Voice-Used') || 'Faith';
        console.log(`🎯 Voice indicator set to: ${voiceUsed}`);
        
        // Use HTML5 Audio for better compatibility - try multiple formats
        let audioBlob, audioUrl, audio;
        
        // Try different audio formats for better Safari compatibility
        const audioFormats = [
          { type: 'audio/mp3', ext: 'mp3' },
          { type: 'audio/mpeg', ext: 'mp3' },
          { type: 'audio/wav', ext: 'wav' }
        ];
        
        const format = audioFormats[0]; // Start with mp3
        audioBlob = new Blob([audioBuffer], { type: format.type });
        audioUrl = URL.createObjectURL(audioBlob);
        audio = new Audio();
        audio.preload = 'auto';
        audio.crossOrigin = 'anonymous';
        audio.src = audioUrl;
        
        console.log(`🎵 Created ${voiceUsed} audio blob: ${audioBlob.size} bytes, type: ${format.type}`);
        
        // Set as current audio for cleanup
        setCurrentAudio(audio);
        setCurrentAudioUrl(audioUrl);
        setIsPaused(false); // Reset pause state when new audio starts
        setCurrentVoiceInfo(voiceUsed);
        
        // Set up proper event handlers first
        audio.onloadeddata = () => {
          console.log(`🎵 ${voiceUsed} data loaded, force auto-play starting...`);
          setIsSpeaking(true); // Set this immediately when we start
          // Aggressive auto-play attempt
          const forcePlay = async () => {
            try {
              // Multiple rapid attempts to start audio
              await audio.play();
              console.log(`✅ ${voiceUsed} auto-play successful! Duration: ${audio.duration}s`);
              startWordHighlightingWithRealTime(text, audio);
            } catch (error) {
              console.log(`⚠️ Auto-play blocked, trying manual trigger approach...`);
              // Set up click listener for manual start
              enableAudioOnClick();
            }
          };
          forcePlay();
        };
        
        audio.onloadedmetadata = () => {
          console.log(`🎵 ${voiceUsed} metadata loaded, duration: ${audio.duration}s`);
        };
        
        audio.oncanplaythrough = () => {
          console.log(`🎵 ${voiceUsed} can play through, ready for playback`);
        };
        
        // Try immediate play with user gesture (required for Safari)
        console.log(`🎵 Starting ${voiceUsed} playback with user gesture...`);
        
        // Force load the audio
        audio.load();
        
        // Enhanced playback with user interaction detection
        const attemptPlay = async (attempt = 1, userTriggered = false) => {
          try {
            console.log(`🎯 ${voiceUsed} play attempt ${attempt} (user: ${userTriggered})`);
            setIsSpeaking(true); // Ensure we're marked as speaking
            
            // For Safari, try different approaches
            if (attempt === 1 && !userTriggered) {
              // First attempt - immediate play
              await audio.play();
            } else if (attempt === 2) {
              // Second attempt - reload and play
              audio.load();
              await new Promise(resolve => setTimeout(resolve, 100));
              await audio.play();
            } else {
              // Third attempt - create new audio element
              const newAudio = new Audio(audioUrl);
              newAudio.preload = 'auto';
              setCurrentAudio(newAudio);
              await newAudio.play();
              // Replace the old audio reference
              Object.assign(audio, newAudio);
            }
            
            console.log(`✅ ${voiceUsed} playback successful on attempt ${attempt}!`);
            startWordHighlightingWithRealTime(text, audio);
          } catch (error) {
            console.log(`❌ ${voiceUsed} attempt ${attempt} failed: ${error.message}`);
            if (attempt < 3) {
              // Try a few more times
              setTimeout(() => attemptPlay(attempt + 1, userTriggered), 200 * attempt);
            } else {
              console.log(`⚠️ ${voiceUsed} failed attempts - audio ready but may need user interaction`);
              // Still mark as speaking since audio is loaded and ready
              setIsSpeaking(true);
              setCurrentVoiceInfo(voiceUsed);
            }
          }
        };
        
        // Enhanced click event to prioritize Sara voice
        let clickListenerActive = true;
        const enableAudioOnClick = (event) => {
          // Don't auto-play if the click was on pause/control buttons
          if (!clickListenerActive || 
              event.target.closest('.audio-controls') || 
              event.target.closest('[data-audio-control]')) {
            console.log('🎯 Ignoring click on audio controls');
            return;
          }
          
          console.log(`🎯 User click detected, playing ${voiceUsed} voice immediately`);
          if (audio && audio.paused && !isPaused) { // Only play if not intentionally paused
            audio.play()
              .then(() => {
                console.log(`✅ ${voiceUsed} started via user click!`);
                startWordHighlightingWithRealTime(text, audio);
                clickListenerActive = false;
                document.body.removeEventListener('click', enableAudioOnClick);
              })
              .catch((error) => {
                console.log(`❌ ${voiceUsed} still blocked:`, error.message);
              });
          }
        };
        
        // Add click listener immediately for backup
        document.body.addEventListener('click', enableAudioOnClick);
        
        // Try immediate auto-play - this often works right after user interaction
        setTimeout(() => {
          if (audio.paused) {
            console.log('🎯 Trying delayed auto-play...');
            audio.play()
              .then(() => {
                console.log('✅ Delayed auto-play successful!');
                startWordHighlightingWithRealTime(text, audio);
              })
              .catch(() => {
                console.log('⚠️ Auto-play still blocked - waiting for user click');
              });
          }
        }, 500);


        
        audio.onended = () => {
          setIsSpeaking(false);
          setCurrentAudio(null);
          stopWordHighlighting();
          const totalTime = Date.now() - startTime;
          console.log(`✅ ${voiceUsed} finished speaking (${totalTime}ms total)`);
          URL.revokeObjectURL(audioUrl); // Clean up memory
        };
        
        // Prevent audio interference by ensuring only one plays
        audio.onplay = () => {
          console.log(`🔊 ${voiceUsed} started playing - ensuring no other audio conflicts`);
          setIsSpeaking(true);
          setCurrentVoiceInfo(voiceUsed);
          setIsPaused(false); // Ensure pause state is correct when playing
        };
        
        // Add pause event handler
        audio.onpause = () => {
          console.log(`⏸️ ${voiceUsed} paused`);
          setIsPaused(true);
        };
        
        audio.onerror = (error) => {
          console.error('Audio error:', error);
          setIsSpeaking(false);
          setCurrentAudio(null);
          URL.revokeObjectURL(audioUrl);
          stopWordHighlighting();
        };

        // Add load event handler
        audio.addEventListener('loadstart', () => {
          console.log('Audio loading started...');
        });

        // Load the audio data
        audio.preload = 'auto';
        audio.load();
        return;
      } catch (error) {
        console.error('ElevenLabs speech error:', error);
        
        // Always check for Azure TTS response regardless of error
        console.log('⚠️ Faith voice failed - Azure Sara should be available via server fallback');
        
        // Don't immediately fall back to browser TTS
        // The server should provide Azure Sara audio via the /api/generate-speech endpoint
        setIsSpeaking(false);
        return;
      }
    }

    // If we reach here, no server TTS worked, try browser fallback
    console.log('⚠️ Server TTS unavailable, using browser fallback');
    
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
    console.log('🛑 Stopping all audio immediately...');
    
    // Force stop ALL HTML5 audio elements on the page
    const allAudioElements = document.querySelectorAll('audio');
    allAudioElements.forEach((audio, index) => {
      try {
        audio.pause();
        audio.currentTime = 0;
        audio.src = '';
        audio.load(); // Reset the audio element
        console.log(`🛑 Stopped audio element ${index + 1}`);
      } catch (error) {
        console.log(`⚠️ Error stopping audio element ${index + 1}:`, error);
      }
    });
    
    // Stop Azure Sara or Faith voice audio if playing
    if (currentAudio) {
      try {
        currentAudio.pause();
        currentAudio.currentTime = 0;
        currentAudio.src = '';
        currentAudio.load(); // Reset the audio element completely
        // Remove ALL event listeners to prevent further events
        currentAudio.onended = null;
        currentAudio.onerror = null;
        currentAudio.onloadeddata = null;
        currentAudio.onloadedmetadata = null;
        currentAudio.oncanplaythrough = null;
        currentAudio.onplay = null;
        currentAudio.onpause = null;
        currentAudio.ontimeupdate = null;
        console.log('✅ Current audio completely stopped and reset');
      } catch (error) {
        console.log('⚠️ Error stopping current audio:', error);
      }
      setCurrentAudio(null);
    }
    
    // Clean up audio URL to prevent memory leaks
    if (currentAudioUrl) {
      try {
        URL.revokeObjectURL(currentAudioUrl);
        console.log('🧹 Cleaned up audio URL');
      } catch (error) {
        console.log('⚠️ Error cleaning audio URL:', error);
      }
      setCurrentAudioUrl(null);
    }
    
    // Stop browser speech synthesis completely
    if (speechSynthesis) {
      speechSynthesis.cancel();
      // Force cancel multiple times to ensure it stops
      setTimeout(() => speechSynthesis.cancel(), 100);
      setTimeout(() => speechSynthesis.cancel(), 200);
      console.log('✅ Browser TTS completely cancelled');
    }
    
    // Remove any pending click listeners that might restart audio
    // Note: enableAudioOnClick is defined within speakText function scope
    
    // Stop all word highlighting immediately
    stopWordHighlighting();
    
    // Reset all speech-related states immediately
    setIsSpeaking(false);
    setCurrentVoiceInfo(null);
    setIsPaused(false);
    setPausedWordIndex(-1);
    
    console.log('🛑 All speech and audio completely stopped');
  };

  // Function to start word highlighting with precise timing
  const startWordHighlighting = (text: string, audioDuration?: number) => {
    const words = text.split(/\s+/);
    console.log(`🎯 Starting word highlighting for ${words.length} words, audio duration: ${audioDuration}s`);
    
    // Calculate more precise timing based on actual audio duration or speech patterns
    let millisecondsPerWord: number;
    
    if (audioDuration && !isNaN(audioDuration) && audioDuration > 0) {
      // Use actual audio duration for precise timing
      millisecondsPerWord = (audioDuration * 1000) / words.length;
      console.log(`🎯 Using actual duration: ${millisecondsPerWord}ms per word`);
    } else {
      // Enhanced timing for Azure TTS voices (they speak faster than browser TTS)
      const averageWordsPerMinute = 160; // Azure voices are typically faster
      const baseMillisecondsPerWord = (60 / averageWordsPerMinute) * 1000;
      
      // Adjust timing based on word length and complexity
      const avgWordLength = words.reduce((sum, word) => sum + word.length, 0) / words.length;
      const complexityMultiplier = Math.max(0.8, Math.min(1.3, avgWordLength / 5));
      
      millisecondsPerWord = baseMillisecondsPerWord * complexityMultiplier;
      console.log(`🎯 Using estimated timing: ${millisecondsPerWord}ms per word`);
    }
    
    setCurrentWordIndex(0);
    
    // Clear any existing timers
    highlightTimers.forEach(timer => clearTimeout(timer));
    setHighlightTimers([]);
    
    // Start highlighting words sequentially with precise timing
    let currentIndex = 0;
    
    // Create individual timers for each word based on word-specific timing
    const newTimers: NodeJS.Timeout[] = [];
    
    // Pre-calculate all word timings first
    const wordTimings: number[] = [];
    let cumulativeDelay = 0;
    
    words.forEach((word, index) => {
      // Store the delay for this word
      wordTimings[index] = cumulativeDelay;
      
      // Calculate timing for next word
      const wordLength = word.length;
      const isPunctuation = /[.!?,:;]/.test(word);
      const isShortWord = wordLength <= 3;
      
      let wordMultiplier = 1;
      if (isPunctuation) wordMultiplier += 0.4; // Longer pause for punctuation
      if (isShortWord) wordMultiplier *= 0.7; // Faster for short words
      if (wordLength > 8) wordMultiplier *= 1.3; // Slower for long words
      
      const wordDuration = millisecondsPerWord * wordMultiplier;
      cumulativeDelay += wordDuration;
    });
    
    // Add small startup delay to sync with audio playback
    const audioStartupDelay = 100; // Small delay to account for audio processing
    
    // Now schedule the timers with pre-calculated delays
    words.forEach((word, index) => {
      const delay = wordTimings[index] + audioStartupDelay;
      
      const timer = setTimeout(() => {
        setCurrentWordIndex(index);
        console.log(`🎯 Highlighting word ${index + 1}/${words.length}: "${word}" at ${delay}ms`);
      }, delay);
      
      newTimers.push(timer);
    });
    
    // Set overall timer for cleanup using the final cumulative delay
    const totalDuration = cumulativeDelay + 500; // Add small buffer
    const cleanupTimer = setTimeout(() => {
      setCurrentWordIndex(-1);
      setHighlightTimers([]);
    }, totalDuration);
    
    newTimers.push(cleanupTimer);
    setHighlightTimers(newTimers);
  };

  // Real-time word highlighting with adaptive timing
  const startWordHighlightingWithRealTime = (text: string, audio: HTMLAudioElement) => {
    const words = text.split(/\s+/);
    console.log(`🎯 Starting natural highlighting for ${words.length} words, duration: ${audio.duration}s`);
    
    if (!audio.duration || isNaN(audio.duration)) {
      console.log('🎯 No valid duration, falling back to timer-based highlighting');
      startWordHighlighting(text, undefined);
      return;
    }
    
    // Calculate precise word timing based on Azure Sara's speech patterns
    const totalDuration = audio.duration;
    const baseTimePerWord = totalDuration / words.length;
    let lastWordIndex = -1;
    
    setCurrentWordIndex(0);
    
    // Simplified timing that closely matches Azure Sara's natural pace
    const calculateWordTiming = (wordIndex: number) => {
      // Pure linear distribution with minimal adjustments
      const baseTime = (wordIndex / words.length) * totalDuration;
      
      // Azure Sara speaks at a fairly consistent pace, so minimal adjustments
      const word = words[wordIndex];
      let adjustment = 0;
      
      if (word) {
        // Only adjust for significant punctuation pauses
        if (/[.!?]/.test(word)) {
          adjustment += 0.3; // Sentence endings have longer pauses
        } else if (/[,:;]/.test(word)) {
          adjustment += 0.1; // Shorter pauses for commas
        }
      }
      
      return baseTime + adjustment;
    };
    
    // Use timeupdate event for precise sync
    const handleTimeUpdate = () => {
      const currentTime = audio.currentTime;
      
      // Find the word that should be highlighted at this exact time
      let targetWordIndex = -1;
      
      for (let i = 0; i < words.length; i++) {
        const wordStartTime = calculateWordTiming(i);
        const wordEndTime = calculateWordTiming(i + 1);
        
        // Use current time with minimal delay to stay closer to actual speech
        const delayedTime = currentTime + 0.05;
        
        if (delayedTime >= wordStartTime && delayedTime < wordEndTime) {
          targetWordIndex = i;
          break;
        }
      }
      
      // Fallback to pure linear timing if calculation doesn't work
      if (targetWordIndex === -1) {
        const delayedTime = currentTime + 0.05;
        targetWordIndex = Math.floor((delayedTime / totalDuration) * words.length);
        targetWordIndex = Math.min(targetWordIndex, words.length - 1);
      }
      
      // Update highlighting only when word changes
      if (targetWordIndex >= 0 && targetWordIndex !== lastWordIndex) {
        setCurrentWordIndex(targetWordIndex);
        lastWordIndex = targetWordIndex;
        
        const word = words[targetWordIndex];
        const progressPercentage = (currentTime / totalDuration) * 100;
        console.log(`🎯 Natural sync: word ${targetWordIndex + 1}/${words.length} "${word}" at ${currentTime.toFixed(2)}s (${progressPercentage.toFixed(1)}%)`);
      }
    };
    
    // Clean up any existing event listeners
    audio.removeEventListener('timeupdate', handleTimeUpdate);
    
    // Add the new event listener with higher frequency updates
    audio.addEventListener('timeupdate', handleTimeUpdate);
    
    // Clean up when audio ends
    const handleEnded = () => {
      setCurrentWordIndex(-1);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };
    
    audio.addEventListener('ended', handleEnded);
  };

  const stopWordHighlighting = () => {
    console.log('🛑 Stopping word highlighting...');
    
    // Clear all highlighting timers
    highlightTimers.forEach(timer => {
      if (timer) clearTimeout(timer);
    });
    setHighlightTimers([]);
    setCurrentWordIndex(-1);
    
    // Clear any adaptive highlighting intervals
    if (window.adaptiveHighlightInterval) {
      clearInterval(window.adaptiveHighlightInterval);
      window.adaptiveHighlightInterval = null;
    }
    
    // Remove highlighting from all words in the response
    const responseElement = document.querySelector('[data-response-text]');
    if (responseElement) {
      const words = responseElement.querySelectorAll('.highlighted-word');
      words.forEach(word => {
        word.classList.remove('text-blue-600', 'font-bold', 'bg-blue-100', 'rounded', 'px-1');
      });
      console.log(`🧹 Cleared highlighting from ${words.length} words`);
    }
    
    console.log('✅ Word highlighting stopped completely');
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
      {/* Soft light background */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <div className="absolute inset-0 opacity-30" style={{backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%2393c5fd' fill-opacity='0.08'%3E%3Ccircle cx='30' cy='30' r='1'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")"}}></div>
        <div className="absolute top-0 left-0 w-96 h-96 bg-blue-200/20 rounded-full blur-3xl floating-animation"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-200/20 rounded-full blur-3xl floating-animation" style={{animationDelay: '3s'}}></div>
      </div>

      <div className="relative z-10">
        {/* Navigation Header */}
        <header className="w-full py-4 px-4 sm:px-6">
          <div className="max-w-4xl mx-auto">
            <Button
              variant="ghost"
              onClick={handleGoBack}
              className="glass-card inline-flex items-center text-gray-700 hover:text-gray-900 transition-all duration-300 text-sm font-medium p-3 h-auto magic-button"
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
                  <h1 className="text-5xl sm:text-6xl font-bold gradient-text leading-relaxed relative z-10 py-2">
                    Ask Maggie Questions
                  </h1>
                  <div className="absolute inset-0 text-5xl sm:text-6xl font-bold gradient-text blur-sm opacity-50 leading-relaxed animate-pulse py-2">Ask Maggie Questions</div>
                </div>
              </div>


            </section>

          {/* Enhanced Question Form */}
          <section className="mb-12">
            <div className="max-w-2xl mx-auto">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Enhanced Question input */}
                <div className="relative">
                  <div className="glass-card p-1 light-runner-border shadow-2xl">
                    <Textarea
                      id="question"
                      value={question}
                      onChange={(e) => setQuestion(e.target.value)}
                      rows={3}
                      placeholder="Ask about grace, love, forgiveness, salvation, or any biblical topic..."
                      className="w-full resize-none bg-white/60 backdrop-blur-sm border-0 rounded-xl p-4 pr-12 text-xl text-gray-900 placeholder:text-gray-500 focus:bg-white/80 transition-all duration-300 focus:ring-2 focus:ring-blue-400/50 shadow-inner"
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
                      <div className="glass-card p-4 text-green-700 font-medium text-center shadow-xl">
                        <div className="flex items-center justify-center gap-2 mb-2">
                          <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                          🎤 Listening... Speak clearly into your microphone
                        </div>
                        <span className="text-xs text-gray-600">
                          Recording will auto-stop after 30 seconds or click the microphone to stop
                        </span>
                      </div>
                    ) : (
                      <div className="glass-card p-3 text-center shadow-xl">
                        <span className="text-gray-700">
                          💡 Click the microphone to speak your question aloud
                        </span>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Enhanced Fallback for unsupported browsers */}
                {!browserSupportsSpeechRecognition && (
                  <div className="glass-card p-4 mt-4 text-sm text-gray-600 text-center shadow-xl">
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
                <Card className="bg-gradient-to-br from-white/80 to-white/60 backdrop-blur-lg border-0 shadow-2xl">
                  <CardContent className="p-6 sm:p-8">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:space-x-6 space-y-4 sm:space-y-0">
                      {/* Enhanced Maggie's avatar for response */}
                      <div className="flex-shrink-0 flex justify-center sm:justify-start">
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
                    
                    <div className="flex-1 text-center sm:text-left">
                      {/* Enhanced Response header */}
                      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
                        <div className="text-center sm:text-left">
                          <h3 className="font-bold text-gray-800 text-2xl mb-2 gradient-text">Maggie's Biblical Perspective</h3>
                          <p className="text-gray-600 text-sm bg-blue-100/60 px-3 py-1 rounded-full backdrop-blur-sm inline-block">Based on the New Testament covenant of Grace</p>
                        </div>
                        
                        {/* Listen button with voice indicator */}
                        {speechSynthesis && (
                          <div className="flex items-center justify-center sm:justify-end sm:ml-4 shrink-0">
                            <div className="flex flex-col items-center sm:items-end">
                              <div className="flex gap-2">
                                <Button
                                  onClick={toggleSpeech}
                                  size="sm"
                                  disabled={!response}
                                  data-audio-control="pause-resume"
                                  className={`magic-button px-4 py-2 font-semibold border-0 ${
                                    isSpeaking && !isPaused 
                                      ? 'bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 pulse-glow'
                                      : isPaused
                                      ? 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700'
                                      : 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600'
                                  } text-white`}
                                >
                                  {isSpeaking && !isPaused ? (
                                    <>
                                      <Pause className="w-4 h-4 mr-1" />
                                      Pause
                                    </>
                                  ) : isPaused ? (
                                    <>
                                      <Play className="w-4 h-4 mr-1" />
                                      Resume
                                    </>
                                  ) : (
                                    <>
                                      <Volume2 className="w-4 h-4 mr-1" />
                                      Listen ✝️
                                    </>
                                  )}
                                </Button>
                                
                                {(isSpeaking || isPaused) && (
                                  <>
                                    <Button
                                      onClick={restartFromBeginning}
                                      size="sm"
                                      data-audio-control="restart"
                                      className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white px-3 py-2"
                                      title="Restart from beginning"
                                    >
                                      <SkipBack className="w-4 h-4" />
                                    </Button>
                                    
                                    <Button
                                      onClick={() => { stopSpeaking(); setIsPaused(false); setPausedWordIndex(-1); }}
                                      size="sm"
                                      data-audio-control="stop"
                                      className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-3 py-2"
                                      title="Stop completely"
                                    >
                                      <Square className="w-4 h-4" />
                                    </Button>
                                  </>
                                )}
                              </div>
                              <div className="text-xs text-gray-700 mt-1 px-3 py-1 bg-blue-100/60 rounded-md backdrop-blur-sm border border-blue-200/50">
                                {currentVoiceInfo || 'Loading Voice...'}
                              </div>
                              {isSpeaking && (
                                <div className="text-xs text-gray-600 mt-1 px-2 py-1 bg-blue-50/60 rounded text-center">
                                  Word highlighting syncs with speech patterns
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {/* Response content with word highlighting */}
                      <div className="prose prose-gray max-w-none text-center sm:text-left">
                        <p className="text-foreground leading-relaxed mb-4">
                          {renderHighlightedText(response.answer)}
                        </p>
                        
                        {/* Clickable Scripture references */}
                        {response.scriptureReferences && (
                          <Card className="bg-white/60 border-l-4 border-l-primary mb-4">
                            <CardContent className="p-4">
                              <h4 className="font-semibold text-foreground text-sm mb-2">📖 Related Scripture (click to read):</h4>
                              <div className="text-muted-foreground text-sm">
                                {response.scriptureReferences.split(/[\s,;]+/).map((verse, index) => {
                                  // Check if this is a valid Bible verse reference
                                  const versePattern = /^(1|2|3)?\s?[A-Za-z]+\s+\d+:\d+(-\d+)?$/;
                                  if (versePattern.test(verse.trim())) {
                                    return (
                                      <span key={index}>
                                        <button
                                          onClick={() => handleVerseClick(verse.trim())}
                                          className="text-blue-600 hover:text-blue-800 hover:underline font-medium cursor-pointer bg-blue-50/60 px-2 py-1 rounded-md mr-2 mb-1 inline-block transition-all hover:bg-blue-100/80"
                                          title={`Click to read ${verse.trim()}`}
                                        >
                                          {verse.trim()}
                                        </button>
                                        {index < response.scriptureReferences.split(/[\s,;]+/).length - 1 ? ' ' : ''}
                                      </span>
                                    );
                                  } else {
                                    return <span key={index} className="italic">{verse} </span>;
                                  }
                                })}
                              </div>
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

          {/* Bible Verse Popup Dialog */}
          <Dialog open={showVersePopup} onOpenChange={setShowVersePopup}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="text-lg font-bold text-gray-800 mb-2">
                  📖 {selectedVerse}
                </DialogTitle>
              </DialogHeader>
              <div className="p-4">
                <p className="text-gray-700 leading-relaxed italic text-lg mb-4">
                  "{verseText}"
                </p>
                <div className="text-xs text-gray-500 border-t pt-3">
                  Scripture text from the Bible (ESV/NIV). For complete accuracy, please consult your preferred Bible translation.
                </div>
                <div className="flex justify-end mt-4">
                  <Button
                    onClick={() => setShowVersePopup(false)}
                    className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-4 py-2"
                  >
                    Close
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Enhanced Additional Info with Better Visibility */}
          <section className="text-center">
            <div className="relative">
              {/* Light background with enhanced contrast */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/90 to-blue-50/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-blue-200/30"></div>
              
              <Card className="relative bg-transparent border-0 shadow-none">
                <CardContent className="p-8 sm:p-12">
                  <h3 className="text-3xl font-bold text-gray-800 mb-6 drop-shadow-sm">About This Ministry Tool</h3>
                  <p className="text-gray-700 leading-relaxed max-w-3xl mx-auto mb-8 text-lg">
                    This AI-powered tool provides biblical guidance rooted in the New Testament's message of grace and God's unconditional love. 
                    All responses are crafted with care to reflect sound theological principles, featuring the authentic 
                    <span className="font-bold text-blue-600"> Faith voice ✝️</span> for spiritual encouragement.
                  </p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mt-12">
                    <div className="text-center">
                      <div className="bg-gradient-to-br from-blue-500/80 to-blue-600/80 backdrop-blur-sm p-4 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4 shadow-xl border border-blue-300/50">
                        <Book className="w-10 h-10 text-white" />
                      </div>
                      <h4 className="font-bold text-gray-800 text-lg mb-2">Scripture-Based</h4>
                      <p className="text-gray-600">All answers rooted in biblical truth</p>
                    </div>
                    
                    <div className="text-center">
                      <div className="bg-gradient-to-br from-pink-500/80 to-pink-600/80 backdrop-blur-sm p-4 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4 shadow-xl border border-pink-300/50">
                        <Heart className="w-10 h-10 text-white" />
                      </div>
                      <h4 className="font-bold text-gray-800 text-lg mb-2">Grace-Centered</h4>
                      <p className="text-gray-600">Focused on God's love and grace</p>
                    </div>
                    
                    <div className="text-center">
                      <div className="bg-gradient-to-br from-purple-500/80 to-purple-600/80 backdrop-blur-sm p-4 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4 shadow-xl border border-purple-300/50">
                        <Volume2 className="w-10 h-10 text-white" />
                      </div>
                      <h4 className="font-bold text-gray-800 text-lg mb-2">Faith Voice ✝️</h4>
                      <p className="text-gray-600">Authentic audio responses</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>



          {/* Disclaimer at bottom */}
          <footer className="mt-16 pb-8">
            <div className="glass-card p-4 max-w-4xl mx-auto">
              <p className="text-sm text-gray-600 leading-relaxed text-center">
                Answers are based on the New Testament covenant of Grace and God's Love as taught by 
                <span className="font-semibold text-blue-700"> Tim Keller, Andrew Farley, and other conservative evangelical pastors and experts</span>.
              </p>
            </div>
          </footer>

        </div>
      </main>
      </div>
    </div>
  );
}
