import { useState, useRef, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, Book, Heart, Loader2, Mic, MicOff } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface BiblicalResponse {
  id: number;
  question: string;
  answer: string;
  scriptureReferences: string;
  createdAt: string;
}

export default function Home() {
  const [question, setQuestion] = useState("");
  const [response, setResponse] = useState<BiblicalResponse | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const askMaggieMutation = useMutation({
    mutationFn: async (questionText: string) => {
      const res = await apiRequest("POST", "/api/ask-maggie", { question: questionText });
      return await res.json() as BiblicalResponse;
    },
    onSuccess: (data) => {
      setResponse(data);
      setQuestion(""); // Clear the form
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (question.trim()) {
      askMaggieMutation.mutate(question.trim());
    }
  };

  // Initialize speech recognition
  useEffect(() => {
    const initSpeechRecognition = async () => {
      // Check if speech recognition is supported
      if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
        return;
      }

      setSpeechSupported(true);

      // Check microphone permissions
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop()); // Stop the stream immediately
        setPermissionGranted(true);
      } catch (error) {
        console.log('Microphone permission not granted yet');
      }

      // Set up speech recognition
      const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      
      // Configure recognition
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';
      recognitionRef.current.maxAlternatives = 1;

      // Event handlers
      recognitionRef.current.onstart = () => {
        setIsListening(true);
        setStatusMessage("Listening... Speak clearly into your microphone");
        
        // Set a timeout to stop listening after 10 seconds
        timeoutRef.current = setTimeout(() => {
          recognitionRef.current?.stop();
          setStatusMessage("Listening timeout - please try again");
        }, 10000);
      };

      recognitionRef.current.onresult = (event: any) => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        
        try {
          const transcript = event.results[0][0].transcript;
          if (transcript.trim()) {
            setQuestion(prev => prev + (prev ? ' ' : '') + transcript);
            setStatusMessage("Speech recognized successfully!");
            setTimeout(() => setStatusMessage(null), 3000);
          }
        } catch (error) {
          console.error('Error processing speech result:', error);
          setStatusMessage("Could not process speech. Please try again.");
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        
        console.error('Speech recognition error:', event.error);
        
        let message = "Voice recognition failed. Please try again.";
        switch (event.error) {
          case 'network':
            // Network errors are common even with good connection
            message = "Speech recognition temporarily unavailable. You can continue typing your question.";
            break;
          case 'no-speech':
            message = "No speech detected. Please speak louder and try again.";
            break;
          case 'not-allowed':
            message = "Microphone access denied. Please allow microphone access and try again.";
            setPermissionGranted(false);
            break;
          case 'service-not-allowed':
            message = "Speech recognition service not available in this environment.";
            break;
          case 'aborted':
            return; // Don't show error for manual stops
        }
        
        setStatusMessage(message);
        setTimeout(() => setStatusMessage(null), 4000);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
      };
    };

    initSpeechRecognition();
  }, []);

  const handleGoBack = () => {
    window.history.back();
  };

  const startSpeechRecognition = async () => {
    if (!speechSupported) {
      setStatusMessage("Speech recognition is not supported in this browser.");
      setTimeout(() => setStatusMessage(null), 3000);
      return;
    }

    if (isListening) {
      // Stop listening
      recognitionRef.current?.abort();
      setStatusMessage("Speech recognition stopped.");
      setTimeout(() => setStatusMessage(null), 2000);
      return;
    }

    // Request microphone permission if not granted
    if (!permissionGranted) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop());
        setPermissionGranted(true);
      } catch (error) {
        setStatusMessage("Microphone access is required for speech recognition. Please allow access and try again.");
        setTimeout(() => setStatusMessage(null), 5000);
        return;
      }
    }

    // Start recognition with retry logic
    try {
      setStatusMessage(null);
      
      // Add a small delay before starting to avoid rapid fire attempts
      await new Promise(resolve => setTimeout(resolve, 200));
      
      recognitionRef.current?.start();
    } catch (error) {
      console.error('Error starting speech recognition:', error);
      
      // If already started, ignore the error
      if (error.toString().includes('already started')) {
        return;
      }
      
      setStatusMessage("Speech recognition not available right now. Please type your question.");
      setTimeout(() => setStatusMessage(null), 3000);
    }
  };

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
                  {speechSupported && (
                    <Button
                      type="button"
                      onClick={startSpeechRecognition}
                      className={`absolute right-2 top-2 p-2 rounded-full transition-all duration-200 ${
                        isListening 
                          ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse' 
                          : 'bg-blue-100 hover:bg-blue-200 text-blue-600'
                      }`}
                      disabled={askMaggieMutation.isPending}
                      title={isListening ? "Stop recording" : "Start voice input"}
                    >
                      {isListening ? (
                        <MicOff className="w-4 h-4" />
                      ) : (
                        <Mic className="w-4 h-4" />
                      )}
                    </Button>
                  )}
                </div>
                
                {/* Status message */}
                {statusMessage && (
                  <div className={`mt-2 text-sm p-2 rounded-md ${
                    statusMessage.includes('success') || statusMessage.includes('Listening')
                      ? 'bg-green-50 text-green-700 border border-green-200'
                      : 'bg-yellow-50 text-yellow-700 border border-yellow-200'
                  }`}>
                    {statusMessage}
                  </div>
                )}
                
                {/* Helpful tips */}
                {speechSupported && !isListening && (
                  <div className="mt-2 text-xs text-gray-500">
                    💡 Click the microphone to speak your question aloud (or just type it)
                  </div>
                )}
                
                {/* Fallback message for network issues */}
                {!speechSupported && (
                  <div className="mt-2 text-xs text-gray-500">
                    Speech recognition not available in this browser. Please type your question.
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
                      <div className="mb-4">
                        <h3 className="font-semibold text-foreground text-lg">Maggie's Biblical Perspective</h3>
                        <p className="text-muted-foreground text-sm">Based on the New Testament covenant of Grace</p>
                      </div>
                      
                      {/* Response content */}
                      <div className="prose prose-gray max-w-none">
                        <p className="text-foreground leading-relaxed mb-4">
                          {response.answer}
                        </p>
                        
                        {/* Scripture references */}
                        {response.scriptureReferences && (
                          <Card className="bg-white/60 border-l-4 border-l-primary">
                            <CardContent className="p-4">
                              <h4 className="font-semibold text-foreground text-sm mb-2">Related Scripture:</h4>
                              <p className="text-muted-foreground text-sm italic">
                                {response.scriptureReferences}
                              </p>
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
