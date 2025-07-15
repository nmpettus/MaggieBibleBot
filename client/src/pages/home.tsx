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
  const [selectedVoice, setSelectedVoice] = useState<string>("");
  
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

    // Initialize speech synthesis
    if ('speechSynthesis' in window) {
      setSpeechSynthesis(window.speechSynthesis);
      
      // Load voices
      const loadVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        console.log('Available voices:', voices.map(v => `${v.name} (${v.lang}) - ${v.gender || 'unknown gender'}`));
        setAvailableVoices(voices);
        
        // Find the best childlike voices for Maggie
        const bestChildlikeVoices = voices.filter(voice => 
          voice.lang.startsWith('en') && (
            // Specifically look for voices known to be youthful/childlike
            voice.name.toLowerCase().includes('alice') ||
            voice.name.toLowerCase().includes('allison') ||
            voice.name.toLowerCase().includes('ava') ||
            voice.name.toLowerCase().includes('susan') ||
            voice.name.toLowerCase().includes('princess') ||
            voice.name.toLowerCase().includes('victoria') ||
            voice.name.toLowerCase().includes('zoey') ||
            voice.name.toLowerCase().includes('zoe') ||
            voice.name.toLowerCase().includes('child') ||
            voice.name.toLowerCase().includes('kid') ||
            voice.name.toLowerCase().includes('young') ||
            voice.name.toLowerCase().includes('girl') ||
            voice.name.toLowerCase().includes('junior') ||
            voice.name.toLowerCase().includes('little')
          )
        );
        
        const goodFemaleVoices = voices.filter(voice => 
          voice.lang.startsWith('en') && (
            voice.name.toLowerCase().includes('samantha') ||
            voice.name.toLowerCase().includes('anna') ||
            voice.name.toLowerCase().includes('kate') ||
            voice.name.toLowerCase().includes('tessa') ||
            voice.name.toLowerCase().includes('fiona') ||
            voice.name.toLowerCase().includes('emma') ||
            voice.name.toLowerCase().includes('olivia') ||
            voice.name.toLowerCase().includes('sophia') ||
            voice.name.toLowerCase().includes('victoria') ||
            voice.name.toLowerCase().includes('allison') ||
            voice.name.toLowerCase().includes('claire') ||
            voice.name.toLowerCase().includes('martha')
          )
        );
        
        // Also look for specialty/novelty voices
        const noveltyVoices = voices.filter(voice => 
          voice.lang.startsWith('en') && (
            voice.name.toLowerCase().includes('bells') ||
            voice.name.toLowerCase().includes('bubbles') ||
            voice.name.toLowerCase().includes('good news') ||
            voice.name.toLowerCase().includes('junior') ||
            voice.name.toLowerCase().includes('pipe organ') ||
            voice.name.toLowerCase().includes('trinoids') ||
            voice.name.toLowerCase().includes('whisper') ||
            voice.name.toLowerCase().includes('deranged') ||
            voice.name.toLowerCase().includes('hysterical')
          )
        );
        
        // Select the best voice available (prefer childlike, then novelty, then female)
        const preferredVoice = bestChildlikeVoices[0] || noveltyVoices[0] || goodFemaleVoices[0] || voices.find(v => v.lang.startsWith('en') && v.name.toLowerCase().includes('female'));
        
        if (preferredVoice) {
          setSelectedVoice(preferredVoice.name);
          console.log('Auto-selected voice for Maggie:', preferredVoice.name);
        } else {
          // Fallback to any English voice
          const fallback = voices.find(v => v.lang.startsWith('en'));
          if (fallback) {
            setSelectedVoice(fallback.name);
            console.log('Fallback voice selected:', fallback.name);
          }
        }
      };
      
      // Load voices immediately and also when they change
      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }

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

  // Text-to-speech functions
  const speakText = (text: string) => {
    if (!speechSynthesis) return;
    
    // Stop any current speech
    speechSynthesis.cancel();
    
    // Create utterance
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Configure voice settings for a more childlike/cartoon sound
    utterance.rate = 0.7; // Slower rate for better comprehension
    utterance.pitch = 1.4; // Higher pitch for cartoon dog voice
    utterance.volume = 1.0;
    
    // Use selected voice or find the best available
    const voices = speechSynthesis.getVoices();
    let chosenVoice = voices.find(voice => voice.name === selectedVoice);
    
    if (!chosenVoice) {
      // Fallback: look for the best childlike voices available
      chosenVoice = voices.find(voice => 
        voice.name.toLowerCase().includes('alice') ||
        voice.name.toLowerCase().includes('allison') ||
        voice.name.toLowerCase().includes('ava') ||
        voice.name.toLowerCase().includes('susan') ||
        voice.name.toLowerCase().includes('zoey') ||
        voice.name.toLowerCase().includes('zoe') ||
        voice.name.toLowerCase().includes('child') ||
        voice.name.toLowerCase().includes('young')
      ) || voices.find(voice => 
        voice.name.toLowerCase().includes('anna') ||
        voice.name.toLowerCase().includes('tessa') ||
        voice.name.toLowerCase().includes('samantha')
      ) || voices.find(voice => voice.lang.startsWith('en'));
    }
    
    if (chosenVoice) {
      utterance.voice = chosenVoice;
      console.log('Using voice for Maggie:', chosenVoice.name);
    }
    
    // Event handlers
    utterance.onstart = () => {
      setIsSpeaking(true);
      console.log('Starting to speak...');
    };
    
    utterance.onend = () => {
      setIsSpeaking(false);
      console.log('Finished speaking');
    };
    
    utterance.onerror = (event) => {
      setIsSpeaking(false);
      console.error('Speech error:', event.error);
    };
    
    // Start speaking
    speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    if (!speechSynthesis) return;
    speechSynthesis.cancel();
    setIsSpeaking(false);
  };

  const toggleSpeech = () => {
    if (isSpeaking) {
      stopSpeaking();
    } else if (response) {
      speakText(response.answer);
    }
  };

  // Test voice function
  const testVoice = () => {
    const testPhrase = "Hi there! I'm Maggie, your friendly biblical guide!";
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
    <div className="min-h-screen bg-white">
      {/* Navigation Header */}
      <header className="w-full py-4 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <Button
            variant="ghost"
            onClick={handleGoBack}
            className="inline-flex items-center text-secondary hover:text-primary transition-colors duration-200 text-sm font-medium p-0 h-auto"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Return to previous page
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-4 sm:px-6 pb-12">
        <div className="max-w-4xl mx-auto">
          
          {/* Hero Section */}
          <section className="text-center mb-12">
            {/* Title with Maggie image */}
            <div className="flex items-center justify-center gap-4 mb-6">
              <img 
                src="https://velvety-lamington-6fd815.netlify.app/MaggieRead.jpeg" 
                alt="Maggie the friendly dog reading a book" 
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover"
              />
              <h1 className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-blue-600 to-red-600 bg-clip-text text-transparent">
                Ask Maggie Bible Questions
              </h1>
            </div>

            {/* Explanatory text */}
            <p className="text-lg text-gray-700 max-w-3xl mx-auto leading-relaxed">
              Answers are based on the New Testament covenant of Grace and God's Love as taught by Tim Keller, Andrew Farley, and other conservative evangelical pastors and experts.
            </p>
          </section>

          {/* Question Form */}
          <section className="mb-12">
            <div className="max-w-2xl mx-auto">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Question input */}
                <div className="relative">
                  <Textarea
                    id="question"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    rows={4}
                    placeholder="Ask about grace, love, forgiveness, salvation, or any biblical topic..."
                    className="w-full resize-none border border-gray-300 rounded-md p-4 pr-12 text-lg shadow-md focus:shadow-lg transition-shadow duration-200"
                    disabled={askMaggieMutation.isPending}
                  />
                  {browserSupportsSpeechRecognition && (
                    <Button
                      type="button"
                      onClick={listening ? stopListening : startListening}
                      className={`absolute right-2 top-2 p-2 rounded-full transition-all duration-200 ${
                        listening 
                          ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse' 
                          : 'bg-blue-100 hover:bg-blue-200 text-blue-600'
                      }`}
                      disabled={askMaggieMutation.isPending}
                      title={listening ? "Stop recording" : "Start voice input"}
                    >
                      {listening ? (
                        <MicOff className="w-4 h-4" />
                      ) : (
                        <Mic className="w-4 h-4" />
                      )}
                    </Button>
                  )}
                </div>
                
                {/* Voice status */}
                {browserSupportsSpeechRecognition && (
                  <div className="mt-2 text-sm text-gray-600">
                    {listening ? (
                      <div className="text-green-600 font-medium">
                        🎤 Listening... Speak clearly into your microphone
                        <br />
                        <span className="text-xs text-gray-500">
                          Recording will auto-stop after 30 seconds or click the microphone to stop
                        </span>
                      </div>
                    ) : (
                      <span className="text-gray-500">
                        💡 Click the microphone to speak your question aloud
                      </span>
                    )}
                  </div>
                )}
                

                
                {/* Fallback for unsupported browsers */}
                {!browserSupportsSpeechRecognition && (
                  <div className="mt-2 text-sm text-gray-500">
                    Speech recognition not supported in this browser. Please type your question.
                  </div>
                )}

                {/* Submit button */}
                <div className="flex justify-center">
                  <Button 
                    type="submit"
                    disabled={!question.trim() || askMaggieMutation.isPending}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-3 rounded-md"
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

          {/* Response Display */}
          {response && (
            <section className="mb-12">
              <Card className="bg-gradient-to-br from-emerald-50 to-blue-50 shadow-lg border-gray-100">
                <CardContent className="p-6 sm:p-8">
                  <div className="flex items-start space-x-4">
                    {/* Maggie's avatar for response */}
                    <div className="flex-shrink-0">
                      <img 
                        src="https://velvety-lamington-6fd815.netlify.app/MaggieRead.jpeg" 
                        alt="Maggie" 
                        className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-md"
                      />
                    </div>
                    
                    <div className="flex-1">
                      {/* Response header */}
                      <div className="mb-4 flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold text-foreground text-lg">Maggie's Biblical Perspective</h3>
                          <p className="text-muted-foreground text-sm">Based on the New Testament covenant of Grace</p>
                        </div>
                        
                        {/* Text-to-speech controls */}
                        {speechSynthesis && (
                          <div className="flex items-center gap-2 ml-4 shrink-0">
                            {/* Voice selector */}
                            <Select value={selectedVoice} onValueChange={setSelectedVoice}>
                              <SelectTrigger className="w-40 h-8 text-xs">
                                <SelectValue placeholder="Select voice" />
                              </SelectTrigger>
                              <SelectContent>
                                {availableVoices
                                  .filter(voice => voice.lang.startsWith('en')) // English voices only
                                  .sort((a, b) => {
                                    // Prioritize the best childlike voices
                                    const getVoiceScore = (voice: SpeechSynthesisVoice) => {
                                      const name = voice.name.toLowerCase();
                                      // Highest priority: true childlike voices
                                      if (name.includes('alice') || name.includes('allison') || name.includes('ava')) return 100;
                                      if (name.includes('susan') || name.includes('zoey') || name.includes('zoe')) return 95;
                                      if (name.includes('child') || name.includes('young') || name.includes('girl') || name.includes('junior')) return 90;
                                      // High priority: novelty/cartoon voices
                                      if (name.includes('bells') || name.includes('bubbles') || name.includes('good news')) return 88;
                                      if (name.includes('trinoids') || name.includes('pipe organ') || name.includes('whisper')) return 87;
                                      // Medium-high: premium female voices
                                      if (name.includes('anna') || name.includes('tessa') || name.includes('samantha')) return 85;
                                      if (name.includes('kate') || name.includes('fiona') || name.includes('emma')) return 80;
                                      if (name.includes('olivia') || name.includes('sophia') || name.includes('victoria')) return 75;
                                      if (name.includes('allison') || name.includes('claire') || name.includes('martha')) return 73;
                                      // Lower: generic female voices
                                      if (name.includes('female') || name.includes('woman')) return 70;
                                      return 0;
                                    };
                                    
                                    return getVoiceScore(b) - getVoiceScore(a) || a.name.localeCompare(b.name);
                                  })
                                  .map((voice, index) => {
                                    const name = voice.name.toLowerCase();
                                    const isChildlike = name.includes('alice') || name.includes('allison') || name.includes('ava') || 
                                                       name.includes('susan') || name.includes('zoey') || name.includes('zoe') ||
                                                       name.includes('child') || name.includes('young') || name.includes('girl') || name.includes('junior');
                                    const isNovelty = name.includes('bells') || name.includes('bubbles') || name.includes('good news') ||
                                                     name.includes('trinoids') || name.includes('pipe organ') || name.includes('whisper');
                                    const isFemale = name.includes('anna') || name.includes('tessa') || name.includes('samantha') ||
                                                    name.includes('kate') || name.includes('fiona') || name.includes('emma') ||
                                                    name.includes('olivia') || name.includes('sophia') || name.includes('victoria') ||
                                                    name.includes('allison') || name.includes('claire') || name.includes('martha');
                                    
                                    return (
                                      <SelectItem key={index} value={voice.name}>
                                        {voice.name} {isChildlike ? '⭐' : isNovelty ? '🎭' : isFemale ? '👧' : ''}
                                      </SelectItem>
                                    );
                                  })}
                              </SelectContent>
                            </Select>
                            
                            {/* Test voice button */}
                            <Button
                              onClick={testVoice}
                              variant="outline"
                              size="sm"
                              className="text-xs px-2"
                              disabled={isSpeaking}
                            >
                              Test
                            </Button>
                            
                            {/* Listen button */}
                            <Button
                              onClick={toggleSpeech}
                              variant="outline"
                              size="sm"
                              disabled={!response}
                            >
                              {isSpeaking ? (
                                <>
                                  <VolumeX className="w-4 h-4 mr-2" />
                                  Stop
                                </>
                              ) : (
                                <>
                                  <Volume2 className="w-4 h-4 mr-2" />
                                  Listen
                                </>
                              )}
                            </Button>
                          </div>
                        )}
                      </div>
                      
                      {/* Response content */}
                      <div className="prose prose-gray max-w-none">
                        <p className="text-foreground leading-relaxed mb-4">
                          {response.answer}
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
            </section>
          )}

          {/* Additional Info */}
          <section className="text-center">
            <Card className="shadow-lg border-gray-100">
              <CardContent className="p-6 sm:p-8">
                <h3 className="text-xl font-semibold text-foreground mb-4">About This Ministry Tool</h3>
                <p className="text-muted-foreground leading-relaxed max-w-2xl mx-auto mb-6">
                  This AI-powered tool is designed to provide biblical guidance rooted in the New Testament's message of grace and God's unconditional love. 
                  All responses are crafted with care to reflect sound theological principles.
                </p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-8">
                  <div className="text-center">
                    <div className="bg-primary/10 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-3">
                      <Book className="w-8 h-8 text-primary" />
                    </div>
                    <h4 className="font-semibold text-foreground">Scripture-Based</h4>
                    <p className="text-muted-foreground text-sm">All answers rooted in biblical truth</p>
                  </div>
                  
                  <div className="text-center">
                    <div className="bg-emerald-500/10 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-3">
                      <Heart className="w-8 h-8 text-emerald-500" />
                    </div>
                    <h4 className="font-semibold text-foreground">Grace-Centered</h4>
                    <p className="text-muted-foreground text-sm">Focused on God's love and grace</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

        </div>
      </main>
    </div>
  );
}
