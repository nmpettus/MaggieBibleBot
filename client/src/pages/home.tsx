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
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Check if speech recognition is supported
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      setSpeechSupported(true);
      const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setQuestion(prev => prev + (prev ? ' ' : '') + transcript);
        setIsListening(false);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, []);

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

  const handleGoBack = () => {
    window.history.back();
  };

  const toggleSpeechRecognition = () => {
    if (!speechSupported) return;
    
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      recognitionRef.current?.start();
      setIsListening(true);
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
                    className="w-full resize-none border border-gray-300 rounded-md p-4 pr-12 text-lg"
                    disabled={askMaggieMutation.isPending}
                  />
                  {speechSupported && (
                    <Button
                      type="button"
                      onClick={toggleSpeechRecognition}
                      className={`absolute right-2 top-2 p-2 rounded-full ${
                        isListening 
                          ? 'bg-red-500 hover:bg-red-600 text-white' 
                          : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                      }`}
                      disabled={askMaggieMutation.isPending}
                    >
                      {isListening ? (
                        <MicOff className="w-4 h-4" />
                      ) : (
                        <Mic className="w-4 h-4" />
                      )}
                    </Button>
                  )}
                </div>

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
