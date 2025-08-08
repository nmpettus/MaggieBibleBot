import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Mic, MicOff, Send, Volume2, VolumeX, Play, Pause, Square, RotateCcw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';

// Popular Bible verses for the popup system
const BIBLE_VERSES = [
  { reference: "John 3:16", text: "For God so loved the world that he gave his one and only Son, that whoever believes in him shall not perish but have eternal life." },
  { reference: "Jeremiah 29:11", text: "For I know the plans I have for you, declares the Lord, plans to prosper you and not to harm you, to give you hope and a future." },
  { reference: "Romans 8:28", text: "And we know that in all things God works for the good of those who love him, who have been called according to his purpose." },
  { reference: "Philippians 4:13", text: "I can do all this through him who gives me strength." },
  { reference: "Psalm 23:1", text: "The Lord is my shepherd, I lack nothing." },
  { reference: "Isaiah 41:10", text: "So do not fear, for I am with you; do not be dismayed, for I am your God. I will strengthen you and help you; I will uphold you with my righteous right hand." },
  { reference: "Matthew 28:20", text: "And surely I am with you always, to the very end of the age." },
  { reference: "Proverbs 3:5-6", text: "Trust in the Lord with all your heart and lean not on your own understanding; in all your ways submit to him, and he will make your paths straight." },
  { reference: "1 Corinthians 13:4-5", text: "Love is patient, love is kind. It does not envy, it does not boast, it is not proud. It does not dishonor others, it is not self-seeking, it is not easily angered, it keeps no record of wrongs." },
  { reference: "Romans 8:38-39", text: "For I am convinced that neither death nor life, neither angels nor demons, neither the present nor the future, nor any powers, neither height nor depth, nor anything else in all creation, will be able to separate us from the love of God that is in Christ Jesus our Lord." },
  { reference: "Ephesians 2:8-9", text: "For it is by grace you have been saved, through faith—and this is not from yourselves, it is the gift of God—not by works, so that no one can boast." },
  { reference: "Psalm 46:10", text: "Be still, and know that I am God; I will be exalted among the nations, I will be exalted in the earth." },
  { reference: "Matthew 11:28", text: "Come to me, all you who are weary and burdened, and I will give you rest." },
  { reference: "Joshua 1:9", text: "Have I not commanded you? Be strong and courageous. Do not be afraid; do not be discouraged, for the Lord your God will be with you wherever you go." },
  { reference: "Psalm 139:14", text: "I praise you because I am fearfully and wonderfully made; your works are wonderful, I know that full well." },
  { reference: "Romans 12:2", text: "Do not conform to the pattern of this world, but be transformed by the renewing of your mind. Then you will be able to test and approve what God's will is—his good, pleasing and perfect will." },
  { reference: "1 Peter 5:7", text: "Cast all your anxiety on him because he cares for you." },
  { reference: "Galatians 5:22-23", text: "But the fruit of the Spirit is love, joy, peace, forbearance, kindness, goodness, faithfulness, gentleness and self-control. Against such things there is no law." },
  { reference: "Hebrews 11:1", text: "Now faith is confidence in what we hope for and assurance about what we do not see." },
  { reference: "James 1:2-3", text: "Consider it pure joy, my brothers and sisters, whenever you face trials of many kinds, because you know that the testing of your faith produces perseverance." },
  { reference: "Psalm 119:105", text: "Your word is a lamp for my feet, a light on my path." },
  { reference: "2 Timothy 1:7", text: "For the Spirit God gave us does not make us timid, but gives us power, love and self-discipline." },
  { reference: "Colossians 3:23", text: "Whatever you do, work at it with all your heart, as working for the Lord, not for human masters." },
  { reference: "1 John 4:19", text: "We love because he first loved us." },
  { reference: "Psalm 37:4", text: "Take delight in the Lord, and he will give you the desires of your heart." }
];

interface BiblicalResponse {
  id: number;
  question: string;
  answer: string;
  scriptureReferences: string;
  recommendedResources?: string;
  createdAt: string;
}

export default function Home() {
  const [question, setQuestion] = useState('');
  const [response, setResponse] = useState<BiblicalResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentWordIndex, setCurrentWordIndex] = useState(-1);
  const [words, setWords] = useState<string[]>([]);
  const [selectedVerse, setSelectedVerse] = useState<{reference: string, text: string} | null>(null);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const highlightTimeoutRef = useRef<NodeJS.Timeout[]>([]);
  const { toast } = useToast();

  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition
  } = useSpeechRecognition();

  // Auto-submit after 2 seconds of silence
  useEffect(() => {
    if (transcript && !listening && transcript.trim().length > 0) {
      const timer = setTimeout(() => {
        setQuestion(transcript);
        resetTranscript();
        handleSubmit(new Event('submit') as any, transcript);
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [transcript, listening]);

  const startListening = () => {
    if (!browserSupportsSpeechRecognition) {
      toast({
        title: "Speech Recognition Not Supported",
        description: "Your browser doesn't support speech recognition. Please type your question instead.",
        variant: "destructive",
      });
      return;
    }

    setIsListening(true);
    resetTranscript();
    SpeechRecognition.startListening({ 
      continuous: true,
      language: 'en-US'
    });
  };

  const stopListening = () => {
    setIsListening(false);
    SpeechRecognition.stopListening();
  };

  const handleSubmit = async (e: React.FormEvent, voiceQuestion?: string) => {
    e.preventDefault();
    const questionToSubmit = voiceQuestion || question;
    
    if (!questionToSubmit.trim()) {
      toast({
        title: "Please ask a question",
        description: "I'd love to help you with a biblical question!",
        variant: "destructive",
      });
      return;
    }

    if (questionToSubmit.trim().length < 5) {
      toast({
        title: "Please be more specific",
        description: "Could you ask a more detailed question so I can give you a thoughtful biblical response?",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setResponse(null);
    stopAudio();

    try {
      const res = await fetch('/api/ask-maggie', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ question: questionToSubmit }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to get response');
      }

      const data: BiblicalResponse = await res.json();
      setResponse(data);
      setQuestion('');
      
      console.log('✅ Got response, will auto-play Sara voice');

    } catch (error) {
      console.error('Error asking question:', error);
      toast({
        title: "Oops! Something went wrong",
        description: error instanceof Error ? error.message : "I'm having trouble right now. Please try again!",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const clearHighlightTimeouts = () => {
    highlightTimeoutRef.current.forEach(timeout => clearTimeout(timeout));
    highlightTimeoutRef.current = [];
  };

  const playAudio = async (text: string) => {
    console.log('🔊 PLAY AUDIO CALLED with text:', text.substring(0, 50) + '...');
    
    try {
      // Stop any existing audio first
      stopAudio();
      
      console.log('🎵 Requesting Sara voice from Azure TTS...');
      
      const response = await fetch('/api/generate-speech', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          text: text,
          voiceName: 'en-US-SaraNeural'
        }),
      });

      console.log('📡 Speech API response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Speech API failed:', errorText);
        throw new Error(`Speech generation failed: ${response.status} - ${errorText}`);
      }

      const voiceUsed = response.headers.get('X-Voice-Used');
      console.log('🎵 Voice used from header:', voiceUsed);

      const audioBlob = await response.blob();
      console.log('🎵 Audio blob size:', audioBlob.size, 'bytes');
      
      if (audioBlob.size === 0) {
        throw new Error('Received empty audio blob');
      }

      const audioUrl = URL.createObjectURL(audioBlob);
      console.log('🎵 Created audio URL:', audioUrl);
      
      // Create new audio element
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      
      // Prepare words for highlighting
      const textWords = text.split(/\s+/).filter(word => word.length > 0);
      setWords(textWords);
      setCurrentWordIndex(-1);
      
      console.log('🎯 Prepared', textWords.length, 'words for highlighting');

      // Set up audio event handlers
      audio.onloadeddata = () => {
        console.log('🎵 Audio loaded, duration:', audio.duration, 'seconds');
        setIsPlaying(true);
        setIsPaused(false);
        
        // Start playing
        audio.play().then(() => {
          console.log('▶️ Audio started playing successfully');
        }).catch(error => {
          console.error('❌ Audio play failed:', error);
          setIsPlaying(false);
          toast({
            title: "Audio Play Failed",
            description: "Sara's voice couldn't start playing. Try again.",
            variant: "destructive",
          });
        });
      };
      
      audio.onplay = () => {
        console.log('🎵 Audio PLAY event fired');
        setIsPlaying(true);
        setIsPaused(false);
        startWordHighlighting(textWords, audio);
      };

      audio.onpause = () => {
        console.log('⏸️ Audio PAUSE event fired');
        setIsPaused(true);
        clearHighlightTimeouts();
      };

      audio.onended = () => {
        console.log('🏁 Audio ENDED event fired');
        setIsPlaying(false);
        setIsPaused(false);
        setCurrentWordIndex(-1);
        setWords([]);
        clearHighlightTimeouts();
        URL.revokeObjectURL(audioUrl);
      };

      audio.onerror = (error) => {
        console.error('💥 Audio ERROR event:', error);
        setIsPlaying(false);
        setIsPaused(false);
        clearHighlightTimeouts();
        toast({
          title: "Audio Error",
          description: "Sara's voice had trouble playing. Please try again.",
          variant: "destructive",
        });
      };

    } catch (error) {
      console.error('💥 Play audio error:', error);
      setIsPlaying(false);
      setIsPaused(false);
      toast({
        title: "Sara Voice Unavailable",
        description: error instanceof Error ? error.message : "Sara's voice is temporarily unavailable. Please try again.",
        variant: "destructive",
      });
    }
  };

  const startWordHighlighting = (textWords: string[], audio: HTMLAudioElement) => {
    console.log('🎯 Starting word highlighting for', textWords.length, 'words');
    
    clearHighlightTimeouts();
    setCurrentWordIndex(-1);
    
    const duration = audio.duration;
    if (!duration || duration === 0) {
      console.warn('⚠️ No audio duration, using estimated timing');
      highlightWithEstimatedTiming(textWords);
      return;
    }
    
    console.log(`⏱️ Audio duration: ${duration}s, calculating timing...`);
    
    // Calculate timing based on actual audio duration
    const totalWords = textWords.length;
    const timePerWord = duration / totalWords * 1000; // milliseconds per word
    
    console.log(`⏱️ Time per word: ${timePerWord}ms`);
    
    textWords.forEach((word, index) => {
      const delay = index * timePerWord;
      
      const timeout = setTimeout(() => {
        if (audioRef.current && !audioRef.current.paused && !audioRef.current.ended) {
          console.log(`🔤 Highlighting word ${index}: "${word}"`);
          setCurrentWordIndex(index);
        }
      }, delay);
      
      highlightTimeoutRef.current.push(timeout);
    });
  };
  
  const highlightWithEstimatedTiming = (textWords: string[]) => {
    console.log('🎯 Using estimated timing for highlighting');
    
    // Sara speaks at about 150-180 words per minute
    const wordsPerMinute = 160;
    const msPerWord = (60 * 1000) / wordsPerMinute;
    
    textWords.forEach((word, index) => {
      const delay = index * msPerWord;
      
      const timeout = setTimeout(() => {
        if (audioRef.current && !audioRef.current.paused && !audioRef.current.ended) {
          console.log(`🔤 Highlighting word ${index} (estimated): "${word}"`);
          setCurrentWordIndex(index);
        }
      }, delay);
      
      highlightTimeoutRef.current.push(timeout);
    });
  };

  const pauseAudio = () => {
    console.log('⏸️ PAUSE AUDIO CALLED');
    if (audioRef.current && isPlaying && !isPaused) {
      console.log('⏸️ Pausing audio...');
      audioRef.current.pause();
      // State will be updated by the onpause event
    } else {
      console.log('⏸️ Cannot pause - audio not playing or already paused');
    }
  };

  const resumeAudio = () => {
    console.log('▶️ RESUME AUDIO CALLED');
    if (audioRef.current && isPlaying && isPaused) {
      console.log('▶️ Resuming audio...');
      audioRef.current.play().then(() => {
        console.log('▶️ Resume successful');
        // State will be updated by the onplay event
      }).catch(error => {
        console.error('❌ Resume failed:', error);
        toast({
          title: "Resume Failed",
          description: "Couldn't resume Sara's voice. Try restarting.",
          variant: "destructive",
        });
      });
    } else {
      console.log('▶️ Cannot resume - audio not paused');
    }
  };

  const stopAudio = () => {
    console.log('⏹️ STOP AUDIO CALLED');
    if (audioRef.current) {
      console.log('⏹️ Stopping audio...');
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsPlaying(false);
    setIsPaused(false);
    setCurrentWordIndex(-1);
    setWords([]);
    clearHighlightTimeouts();
  };

  const restartAudio = () => {
    console.log('🔄 RESTART AUDIO CALLED');
    if (response) {
      stopAudio();
      setTimeout(() => playAudio(response.answer), 100);
    }
  };

  const renderAnswerWithHighlighting = (text: string) => {
    if (!isPlaying || words.length === 0) {
      return <span>{text}</span>;
    }

    return (
      <span>
        {words.map((word, index) => (
          <span
            key={index}
            className={`${
              index === currentWordIndex 
                ? 'font-bold underline decoration-2 underline-offset-2 decoration-blue-600 bg-blue-100 px-1 rounded' 
                : ''
            } transition-all duration-200`}
          >
            {word}{index < words.length - 1 ? ' ' : ''}
          </span>
        ))}
      </span>
    );
  };

  const renderAnswerWithVerseLinks = (text: string) => {
    // Find Bible verse references and make them clickable
    const versePattern = /\b(\d?\s?[A-Za-z]+\s+\d+:\d+(?:-\d+)?)\b/g;
    const parts = text.split(versePattern);
    
    return parts.map((part, index) => {
      const matchingVerse = BIBLE_VERSES.find(verse => 
        verse.reference.toLowerCase().includes(part.toLowerCase().trim()) ||
        part.toLowerCase().includes(verse.reference.toLowerCase())
      );
      
      if (matchingVerse) {
        return (
          <button
            key={index}
            onClick={() => setSelectedVerse(matchingVerse)}
            className="text-blue-600 hover:text-blue-800 underline font-medium cursor-pointer"
          >
            {part}
          </button>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  const renderRecommendedResources = (resources: string) => {
    // Parse the markdown-style links and make them clickable
    const linkPattern = /\[([^\]]+)\]\(([^)]+)\)/g;
    const parts = resources.split(linkPattern);
    
    const result = [];
    for (let i = 0; i < parts.length; i += 3) {
      if (parts[i]) {
        result.push(<span key={i}>{parts[i]}</span>);
      }
      if (parts[i + 1] && parts[i + 2]) {
        result.push(
          <a
            key={i + 1}
            href={parts[i + 2]}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 underline font-medium"
          >
            {parts[i + 1]}
          </a>
        );
      }
    }
    
    return result;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-yellow-50 to-red-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-full overflow-hidden border-4 border-white shadow-lg floating-animation">
              <img 
                src="https://images.pexels.com/photos/1108099/pexels-photo-1108099.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop" 
                alt="Maggie" 
                className="w-full h-full object-cover"
              />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold gradient-text">
              Ask Maggie Questions
            </h1>
          </div>
          <p className="text-lg text-gray-700 max-w-2xl mx-auto leading-relaxed">
            Hi! I'm Maggie, and I love helping with biblical questions! Ask me anything about faith, 
            and I'll share wisdom from conservative evangelical pastors and experts who focus on God's amazing grace and love.
          </p>
        </div>

        {/* Question Input */}
        <Card className="glass-card mb-6 light-runner-border">
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="relative">
                <Textarea
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="What biblical question can I help you with today? (You can type or use the microphone)"
                  className="min-h-[100px] text-base resize-none pr-12 shadow-md focus:shadow-lg transition-shadow duration-200"
                  disabled={isLoading}
                />
                {browserSupportsSpeechRecognition && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-2 hover:bg-blue-100"
                    onClick={isListening ? stopListening : startListening}
                    disabled={isLoading}
                  >
                    {isListening ? (
                      <MicOff className="h-5 w-5 text-red-500" />
                    ) : (
                      <Mic className="h-5 w-5 text-blue-500" />
                    )}
                  </Button>
                )}
              </div>
              
              {transcript && (
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm text-blue-700">
                    <strong>Listening:</strong> {transcript}
                  </p>
                </div>
              )}
              
              <Button 
                type="submit" 
                className="w-full magic-button bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold py-3 text-lg"
                disabled={isLoading || (!question.trim() && !transcript.trim())}
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Thinking...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Send className="h-5 w-5" />
                    Ask Maggie
                  </div>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Response */}
        {response && (
          <Card className="glass-card mb-6">
            <CardContent className="p-6">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-blue-200 flex-shrink-0">
                  <img 
                    src="https://images.pexels.com/photos/1108099/pexels-photo-1108099.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop" 
                    alt="Maggie" 
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-800 mb-2">Maggie's Response:</h3>
                  <div className="prose prose-blue max-w-none">
                    <p className="text-gray-700 leading-relaxed mb-4">
                      {renderAnswerWithHighlighting(response.answer)}
                    </p>
                    
                    {response.scriptureReferences && (
                      <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-400 mb-4">
                        <h4 className="font-semibold text-blue-800 mb-2">📖 Scripture References:</h4>
                        <p className="text-blue-700">
                          {renderAnswerWithVerseLinks(response.scriptureReferences)}
                        </p>
                      </div>
                    )}
                    
                    {response.recommendedResources && (
                      <div className="bg-green-50 p-4 rounded-lg border-l-4 border-green-400">
                        <h4 className="font-semibold text-green-800 mb-2">🌟 Recommended Resources:</h4>
                        <p className="text-green-700">
                          {renderRecommendedResources(response.recommendedResources)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* ENHANCED AUDIO CONTROLS */}
              <div className="mt-6 p-6 bg-gradient-to-r from-blue-50 via-purple-50 to-pink-50 rounded-xl border-2 border-blue-200 shadow-lg">
                {/* Sara Voice Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-blue-300 shadow-md">
                      <img 
                        src="https://images.pexels.com/photos/1108099/pexels-photo-1108099.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop" 
                        alt="Sara" 
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <h4 className="font-bold text-blue-800 text-lg">Sara's Voice</h4>
                      <p className="text-sm text-blue-600">Azure Child Voice</p>
                    </div>
                  </div>
                  
                  {/* Status Indicator */}
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${
                      isPlaying && !isPaused ? 'bg-green-500 animate-pulse' : 
                      isPaused ? 'bg-yellow-500' : 
                      'bg-gray-400'
                    }`}></div>
                    <span className="text-sm font-medium text-gray-700">
                      {isPlaying && !isPaused ? 'Sara Speaking...' : 
                       isPaused ? 'Sara Paused' : 
                       'Sara Ready'}
                    </span>
                  </div>
                </div>

                {/* Control Buttons */}
                <div className="flex flex-wrap items-center gap-3">
                  {!isPlaying ? (
                    <Button
                      onClick={() => playAudio(response.answer)}
                      className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-3 rounded-lg shadow-md transition-all duration-200 hover:scale-105"
                    >
                      <Play className="h-5 w-5" />
                      Play Sara's Voice
                    </Button>
                  ) : (
                    <div className="flex items-center gap-3">
                      {!isPaused ? (
                        <Button
                          onClick={pauseAudio}
                          className="flex items-center gap-2 bg-yellow-600 hover:bg-yellow-700 text-white font-semibold px-4 py-3 rounded-lg shadow-md transition-all duration-200 hover:scale-105"
                        >
                          <Pause className="h-5 w-5" />
                          Pause
                        </Button>
                      ) : (
                        <Button
                          onClick={resumeAudio}
                          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold px-4 py-3 rounded-lg shadow-md transition-all duration-200 hover:scale-105"
                        >
                          <Play className="h-5 w-5" />
                          Continue
                        </Button>
                      )}
                      
                      <Button
                        onClick={restartAudio}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-3 rounded-lg shadow-md transition-all duration-200 hover:scale-105"
                      >
                        <RotateCcw className="h-5 w-5" />
                        Restart
                      </Button>
                      
                      <Button
                        onClick={stopAudio}
                        className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-semibold px-4 py-3 rounded-lg shadow-md transition-all duration-200 hover:scale-105"
                      >
                        <Square className="h-5 w-5" />
                        Stop
                      </Button>
                    </div>
                  )}
                </div>

                {/* Debug Info */}
                <div className="mt-4 p-3 bg-white/50 rounded-lg border border-blue-200">
                  <p className="text-xs text-gray-600">
                    <strong>Debug:</strong> Playing: {isPlaying ? 'Yes' : 'No'} | 
                    Paused: {isPaused ? 'Yes' : 'No'} | 
                    Words: {words.length} | 
                    Current Word: {currentWordIndex + 1}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Bible Verse Dialog */}
        <Dialog open={!!selectedVerse} onOpenChange={() => setSelectedVerse(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-blue-800">
                📖 {selectedVerse?.reference}
              </DialogTitle>
            </DialogHeader>
            <div className="mt-4">
              <p className="text-lg leading-relaxed text-gray-700 italic">
                "{selectedVerse?.text}"
              </p>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}