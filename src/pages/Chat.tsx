import React, { useState, useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import { Send, Sparkles, User, ArrowLeft, Play, Download } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { generateChatResponse, getGeminiModel } from '@/lib/gemini';
import { Movie } from '@/types/movie';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { AuthModal } from '@/components/modals/AuthModal';
import { ChatSession } from '@google/generative-ai';

export interface ChatMessage {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
  movies?: Movie[];
  aiAction?: 'search_movies' | 'general_chat' | 'identity_response';
}

const MAX_ANON_INTERACTIONS = 5;

const Chat = () => {
  const { user, loading: authLoading } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [aiInteractionCount, setAiInteractionCount] = useState(0);
  const [movieContext, setMovieContext] = useState<Movie[]>([]);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [chatSession, setChatSession] = useState<ChatSession | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  const currentInteractionLimit = user ? Infinity : MAX_ANON_INTERACTIONS;
  const canSendMessages = !loading && aiInteractionCount < currentInteractionLimit;

  useEffect(() => {
    try {
      const model = getGeminiModel();
      setChatSession(model.startChat({
        history: [],
        generationConfig: { maxOutputTokens: 500 },
      }));
    } catch (error) {
      console.error("Failed to initialize Gemini:", error);
      toast({
        title: "AI Initialization Error",
        description: "Could not start AI assistant.",
        variant: "destructive",
      });
    }
  }, []);

  useEffect(() => {
    const loadMovieContext = async () => {
      try {
        const moviesRef = collection(db, 'movies');
        const q = query(moviesRef, orderBy('uploadDate', 'desc'), limit(50));
        const querySnapshot = await getDocs(q);
        const movies: Movie[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          if (data.releaseDate instanceof Timestamp) {
            data.releaseDate = data.releaseDate.toDate();
          }
          if (data.uploadDate instanceof Timestamp) {
            data.uploadDate = data.uploadDate.toDate();
          }
          movies.push({ id: doc.id, ...data } as Movie);
        });
        setMovieContext(movies);
      } catch (error) {
        console.error('Error loading movie context:', error);
        toast({
          title: "Error Loading Movies",
          description: "Failed to load movie context. Try again later.",
          variant: "destructive",
        });
      }
    };

    loadMovieContext();
    setMessages([
      {
        id: 'welcome-1',
        content: user?.displayName
          ? `Hey ${user.displayName}! I'm Zee AI, your Zeestream movie assistant. Ask about movies or Zeestream!`
          : "Hi! I'm Zee AI, your Zeestream movie assistant. Ask about movies or Zeestream!",
        isUser: false,
        timestamp: new Date(),
      },
    ]);
  }, [user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatSession) {
      toast({
        title: "AI Not Ready",
        description: "AI assistant is initializing. Please wait.",
        variant: "warning",
      });
      return;
    }
    if (!input.trim() || loading || !canSendMessages) {
      if (!canSendMessages && !loading) {
        toast({
          title: "Interaction Limit Reached",
          description: `Max ${MAX_ANON_INTERACTIONS} interactions reached. Please log in.`,
          variant: "destructive",
        });
      }
      return;
    }

    const userMessageContent = input.trim();
    const newUserMessage: ChatMessage = {
      id: Date.now().toString(),
      content: userMessageContent,
      isUser: true,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, newUserMessage]);
    setInput('');
    setLoading(true);

    try {
      const aiResponse = await generateChatResponse(userMessageContent, movieContext, chatSession, user?.displayName);
      console.log('AI response received:', aiResponse); // Debug log

      const newAiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: aiResponse.text, // Only the friendly text
        isUser: false,
        timestamp: new Date(),
        movies: aiResponse.movies || [], // Ensure movies array is defined
        aiAction: aiResponse.aiAction,
      };

      setMessages(prev => [...prev, newAiMessage]);
      setAiInteractionCount(prev => prev + 1);
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (error) {
      console.error('Error generating response:', error);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: "Sorry, I'm having trouble. Try again later.",
        isUser: false,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
      toast({
        title: "Error",
        description: "Failed to get AI response.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMovieClick = (movie: Movie) => {
    navigate(`/watch/${movie.slug}`);
  };

  const handlePlayClick = (movie: Movie, e: React.MouseEvent) => {
    e.stopPropagation();
    if (movie.watchUrl) {
      window.location.href = movie.watchUrl;
    } else {
      toast({
        title: "No Watch URL",
        description: "This movie is not available to watch yet.",
        variant: "warning",
      });
    }
  };

  const handleDownloadClick = (movie: Movie, e: React.MouseEvent) => {
    e.stopPropagation();
    if (movie.downloadUrl) {
      window.location.href = movie.downloadUrl;
    } else {
      toast({
        title: "No Download URL",
        description: "This movie is not available for download yet.",
        variant: "warning",
      });
    }
  };

  if (authLoading || !chatSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading AI chat...</p>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Zee AI Assistant - Zeestream</title>
        <meta name="description" content="Chat with Zee AI to discover movies on Zeestream" />
      </Helmet>

      <div className="h-screen flex flex-col bg-background">
        <div className="border-b border-border p-4">
          <div className="container mx-auto flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(-1)}
              aria-label="Go back"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-primary rounded-full flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white animate-cycle" />
              </div>
              <div>
                <h1 className="font-semibold">Zee AI Assistant</h1>
                <p className="text-xs text-muted-foreground">
                  {user ? "Unlimited interactions" : `${aiInteractionCount}/${MAX_ANON_INTERACTIONS} interactions used`}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="container mx-auto p-4 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-3xl ${message.isUser ? 'order-2' : 'order-1'}`}>
                  <div
                    className={`flex items-start space-x-3 ${
                      message.isUser ? 'flex-row-reverse space-x-reverse' : ''
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        message.isUser
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {message.isUser ? (
                        <User className="w-4 h-4" />
                      ) : (
                        <Sparkles className="w-4 h-4" />
                      )}
                    </div>
                    
                    <div className="space-y-3">
                      <div
                        className={`p-3 rounded-lg ${
                          message.isUser
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{message.content}</p>
                      </div>

                      {message.movies && message.movies.length > 0 && (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-2">
                          {message.movies.map((movie) => (
                            <Card
                              key={movie.id}
                              className="cursor-pointer hover:shadow-md transition-shadow"
                              onClick={() => handleMovieClick(movie)}
                            >
                              <CardContent className="p-3">
                                <div className="relative">
                                  <img
                                    src={movie.thumbnailUrl}
                                    alt={movie.name}
                                    className="w-full aspect-[2/3] object-cover rounded mb-2"
                                  />
                                  <div className="absolute top-2 right-2 flex space-x-2">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="bg-black bg-opacity-50 rounded-full"
                                      onClick={(e) => handlePlayClick(movie, e)}
                                    >
                                      <Play className="w-5 h-5 text-white" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="bg-black bg-opacity-50 rounded-full"
                                      onClick={(e) => handleDownloadClick(movie, e)}
                                    >
                                      <Download className="w-5 h-5 text-white" />
                                    </Button>
                                  </div>
                                </div>
                                <h4 className="font-medium text-sm truncate">{movie.name}</h4>
                                <p className="text-xs text-muted-foreground">{movie.category}</p>
                                <div className="flex items-center justify-between mt-1">
                                  <span className="text-xs">★ {movie.rating}</span>
                                  <span className="text-xs text-muted-foreground">
                                    {movie.type === 'translated' ? 'Dubbed' : 'Original'}
                                  </span>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      )}

                      <p className="text-xs text-muted-foreground">
                        {message.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                    <Sparkles className="w-4 h-4 animate-pulse" />
                  </div>
                  <div className="bg-muted p-3 rounded-lg">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        <div className="border-t border-border p-4">
          <div className="container mx-auto">
            {user ? (
              <form onSubmit={handleSubmit} className="flex space-x-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask about movies or Zeestream!"
                  disabled={loading}
                  className="flex-1"
                />
                <Button type="submit" disabled={loading || !input.trim()}>
                  <Send className="w-4 h-4" />
                </Button>
              </form>
            ) : (
              <>
                {canSendMessages ? (
                  <form onSubmit={handleSubmit} className="flex space-x-2">
                    <Input
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder={`Ask about movies (${MAX_ANON_INTERACTIONS - aiInteractionCount} questions left)`}
                      disabled={loading}
                      className="flex-1"
                    />
                    <Button type="submit" disabled={loading || !input.trim()}>
                      <Send className="w-4 h-4" />
                    </Button>
                  </form>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-muted-foreground mb-4">
                      You've used all {MAX_ANON_INTERACTIONS} questions for this session.
                    </p>
                  </div>
                )}
                <div className="text-center mt-4">
                  <p className="text-muted-foreground mb-2">
                    Sign in for unlimited chat and personalized experience.
                  </p>
                  <Button onClick={() => setShowAuthModal(true)} className="btn-stream">
                    Login / Register
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <AuthModal open={showAuthModal} onOpenChange={setShowAuthModal} />
    </>
  );
};
export default Chat;