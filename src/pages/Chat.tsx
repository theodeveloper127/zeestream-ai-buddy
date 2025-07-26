import React, { useState, useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import { Send, Sparkles, User, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { generateChatResponse, getGeminiModel } from '@/lib/gemini'; // Import getGeminiModel
import { Movie } from '@/types/movie';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { AuthModal } from '@/components/modals/AuthModal';
import { ChatSession } from '@google/generative-ai'; // Import ChatSession type

// Simplified ChatMessage interface for session-based chat
export interface ChatMessage {
  id: string; // Unique ID for React key
  content: string;
  isUser: boolean;
  timestamp: Date; // Use Date object for local state
  movies?: Movie[]; // Optional array of movies to display
  aiAction?: 'search_movies' | 'general_chat' | 'identity_response';
}

const MAX_ANON_INTERACTIONS = 5; // Limit for non-logged-in users

const Chat = () => {
  const { user, loading: authLoading } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [aiInteractionCount, setAiInteractionCount] = useState(0); // Tracks AI interactions in current session
  const [movieContext, setMovieContext] = useState<Movie[]>([]);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [chatSession, setChatSession] = useState<ChatSession | null>(null); // State to hold the Gemini ChatSession

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Determine the current interaction limit based on user login status
  const currentInteractionLimit = user ? Infinity : MAX_ANON_INTERACTIONS;
  const canSendMessages = !loading && aiInteractionCount < currentInteractionLimit;

  // Initialize Gemini Chat Session on component mount
  useEffect(() => {
    try {
      const model = getGeminiModel();
      // Start a new chat session. The history is managed internally by the SDK.
      setChatSession(model.startChat({
        history: [], // You can pre-seed history if needed, otherwise empty for fresh session
        generationConfig: {
          maxOutputTokens: 500, // Adjust as needed
        },
      }));
      console.log("Gemini Chat Session started.");
    } catch (error) {
      console.error("Failed to initialize Gemini model or start chat session:", error);
      toast({
        title: "AI Initialization Error",
        description: "Could not start AI assistant. Check API key and network.",
        variant: "destructive",
      });
    }
  }, []); // Run only once on mount

  // Scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load initial movie context and set welcome message
  useEffect(() => {
    const loadMovieContext = async () => {
      try {
        const moviesRef = collection(db, 'movies');
        const q = query(moviesRef, orderBy('likes', 'desc'), limit(20));
        const querySnapshot = await getDocs(q);
        const movies: Movie[] = [];
        querySnapshot.forEach((doc) => {
          movies.push({ id: doc.id, ...doc.data() } as Movie);
        });
        setMovieContext(movies);
      } catch (error) {
        console.error('Error loading movie context:', error);
      }
    };

    loadMovieContext();

    // Always start with a fresh welcome message on component mount
    setMessages([
      {
        id: 'welcome-1',
        content: "Hi! I'm Zee AI, your personal movie assistant. I was developed by Rwandascratch developer teams. How can I help you find movies or answer questions about our collection?",
        isUser: false,
        timestamp: new Date(),
      },
    ]);
  }, []); // Empty dependency array means this runs once on mount

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Ensure chatSession is initialized before sending messages
    if (!chatSession) {
        toast({
            title: "AI Not Ready",
            description: "AI assistant is still initializing. Please wait a moment.",
            variant: "warning",
        });
        return;
    }

    // Prevent submission if loading, input is empty, or interaction limit reached
    if (!input.trim() || loading || !canSendMessages) {
      if (!canSendMessages && !loading) {
        toast({
          title: "Interaction Limit Reached",
          description: `You've reached the maximum ${MAX_ANON_INTERACTIONS} interactions for this session. Please log in for unlimited chat.`,
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

    // Add user message to local state immediately
    setMessages(prev => [...prev, newUserMessage]);
    setInput('');
    setLoading(true);

    try {
      // Call generateChatResponse, passing the chatSession
      const aiResponse = await generateChatResponse(userMessageContent, movieContext, chatSession);
      
      if (aiResponse.text) { 
        const newAiMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          content: aiResponse.text,
          isUser: false,
          timestamp: new Date(),
          movies: aiResponse.movies,
          aiAction: aiResponse.aiAction,
        };

        setMessages(prev => [...prev, newAiMessage]);
        setAiInteractionCount(prev => prev + 1);

        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      } else {
        console.warn("generateChatResponse returned an empty text response.");
        toast({
          title: "No AI Response",
          description: "The AI didn't provide a response. Please try again or rephrase.",
          variant: "warning",
        });
      }

    } catch (error) {
      console.error('Error generating response:', error);
      const errorMessageContent = "I'm sorry, I'm having trouble processing your request right now. Please try again later.";
      const errorAiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: errorMessageContent,
        isUser: false,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorAiMessage]);
      
      toast({
        title: "Error",
        description: "Failed to get response from AI assistant",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMovieClick = (movie: Movie) => {
    navigate(`/watch/${movie.slug}`);
  };

  // Show loading state if auth or chat session is still processing
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
        <meta name="description" content="Chat with Zee AI assistant to discover movies and get recommendations" />
      </Helmet>

      <div className="h-screen flex flex-col bg-background">
        {/* Header */}
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

        {/* Messages */}
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

                      {/* Movie Cards */}
                      {message.movies && message.movies.length > 0 && (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-2">
                          {message.movies.map((movie) => (
                            <Card
                              key={movie.id}
                              className="cursor-pointer hover:shadow-md transition-shadow"
                              onClick={() => handleMovieClick(movie)}
                            >
                              <CardContent className="p-3">
                                <img
                                  src={movie.thumbnailUrl}
                                  alt={movie.name}
                                  className="w-full aspect-[2/3] object-cover rounded mb-2"
                                />
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

        {/* Input area or limit messages */}
        <div className="border-t border-border p-4">
          <div className="container mx-auto">
            {/* Conditional rendering for input field and login/limit messages */}
            {user ? (
              // Case: User is logged in (unlimited chat)
              <form onSubmit={handleSubmit} className="flex space-x-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask me about movies or anything!"
                  disabled={loading}
                  className="flex-1"
                />
                <Button type="submit" disabled={loading || !input.trim()}>
                  <Send className="w-4 h-4" />
                </Button>
              </form>
            ) : (
              // Case: User is NOT logged in
              <>
                {canSendMessages ? (
                  // Anonymous user, still within limit - can type and send
                  <form onSubmit={handleSubmit} className="flex space-x-2">
                    <Input
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder={`Ask me about movies (${MAX_ANON_INTERACTIONS - aiInteractionCount} questions left)`}
                      disabled={loading}
                      className="flex-1"
                    />
                    <Button type="submit" disabled={loading || !input.trim()}>
                      <Send className="w-4 h-4" />
                    </Button>
                  </form>
                ) : (
                  // Anonymous user, limit reached - input hidden
                  <div className="text-center py-4">
                    <p className="text-muted-foreground mb-4">
                      You've used all {MAX_ANON_INTERACTIONS} questions for this session.
                    </p>
                  </div>
                )}
                {/* Always show login/register button for anonymous users, regardless of limit */}
                <div className="text-center mt-4">
                  <p className="text-muted-foreground mb-2">
                    Sign in or register for unlimited chat and personalized experience.
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

      {/* Auth Modal */}
      <AuthModal open={showAuthModal} onOpenChange={setShowAuthModal} />
    </>
  );
};

export default Chat;