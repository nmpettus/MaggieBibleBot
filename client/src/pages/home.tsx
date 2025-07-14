import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, Book, Heart, Loader2 } from "lucide-react";
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

  return (
    <div className="min-h-screen bg-background">
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
          <section className="mb-12">
            <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-8">
              {/* Small round logo */}
              <div className="flex-shrink-0">
                <img 
                  src="https://velvety-lamington-6fd815.netlify.app/MaggieRead.jpeg" 
                  alt="Maggie the friendly dog reading a book" 
                  className="w-20 h-20 sm:w-24 sm:h-24 rounded-full shadow-lg object-cover border-3 border-white"
                />
              </div>
              
              <div className="flex-1 text-center sm:text-left">
                {/* Main heading */}
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4 leading-tight">
                  Ask Maggie Bible Questions
                </h1>

                {/* Explanatory text */}
                <p className="text-lg sm:text-xl text-muted-foreground leading-relaxed">
                  Answers are based on the New Testament covenant of Grace and God's Love as taught by{" "}
                  <span className="font-semibold text-foreground">Tim Keller</span>,{" "}
                  <span className="font-semibold text-foreground">Andrew Farley</span>, and others.
                </p>
              </div>
            </div>
          </section>

          {/* Question Form */}
          <section className="mb-12">
            <Card className="shadow-lg border-gray-100">
              <CardContent className="p-6 sm:p-8">
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Question input */}
                  <div>
                    <label htmlFor="question" className="block text-sm font-semibold text-foreground mb-3">
                      What Bible question would you like to ask Maggie?
                    </label>
                    <Textarea
                      id="question"
                      value={question}
                      onChange={(e) => setQuestion(e.target.value)}
                      rows={4}
                      placeholder="Ask about grace, love, forgiveness, salvation, or any biblical topic..."
                      className="resize-none"
                      disabled={askMaggieMutation.isPending}
                    />
                  </div>

                  {/* Submit button */}
                  <div className="flex justify-center">
                    <Button 
                      type="submit"
                      disabled={!question.trim() || askMaggieMutation.isPending}
                      className="bg-primary hover:bg-blue-700 text-primary-foreground font-semibold px-8 py-3 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 disabled:transform-none"
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
              </CardContent>
            </Card>
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
