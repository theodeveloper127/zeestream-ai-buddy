import React, { useState, useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import { Send, Bot, User, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { generateChatResponse } from '@/lib/gemini';
import { Movie } from '@/types/movie';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

interface ChatMessage {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
  movies?: Movie[];
}

const MAX_QUERIES = 5;

const Chat = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [queryCount, setQueryCount] = useState(0);
  const [movieContext, setMovieContext] = useState<Movie[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Load initial movie context
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

    // Welcome message
    setMessages([
      {
        id: '1',
        content: "Hi! I'm your movie assistant. I can help you find movies, answer questions about our collection, or recommend something to watch. What would you like to know?",
        isUser: false,
        timestamp: new Date(),
      },
    ]);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading || queryCount >= MAX_QUERIES) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      content: input.trim(),
      isUser: true,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    setQueryCount(prev => prev + 1);

    try {
      const response = await generateChatResponse(input.trim(), movieContext);
      
      // Check if the response should include movie cards
      const shouldShowMovies = input.toLowerCase().includes('movie') || 
                              input.toLowerCase().includes('recommend') ||
                              input.toLowerCase().includes('suggest') ||
                              input.toLowerCase().includes('watch');

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: response,
        isUser: false,
        timestamp: new Date(),
        movies: shouldShowMovies ? movieContext.slice(0, 6) : undefined,
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error generating response:', error);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: "I'm sorry, I'm having trouble processing your request right now. Please try again later.",
        isUser: false,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
      
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

  return (
    <>
      <Helmet>
        <title>AI Chat Assistant - Zeestream</title>
        <meta name="description" content="Chat with our AI assistant to discover movies and get recommendations" />
      </Helmet>

      <div className="h-screen flex flex-col bg-background">
        {/* Header */}
        <div className="border-b border-border p-4">
          <div className="container mx-auto flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-primary rounded-full flex items-center justify-center">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="font-semibold">Movie Assistant</h1>
                <p className="text-xs text-muted-foreground">
                  {queryCount}/{MAX_QUERIES} queries used
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
                        <Bot className="w-4 h-4" />
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
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
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
                    <Bot className="w-4 h-4 animate-pulse" />
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

        {/* Input */}
        <div className="border-t border-border p-4">
          <div className="container mx-auto">
            {queryCount >= MAX_QUERIES ? (
              <div className="text-center py-4">
                <p className="text-muted-foreground mb-4">
                  You've reached the maximum number of queries for this session.
                </p>
                <Button onClick={() => navigate('/')}>
                  Back to Home
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex space-x-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask me about movies..."
                  disabled={loading}
                  className="flex-1"
                />
                <Button type="submit" disabled={loading || !input.trim()}>
                  <Send className="w-4 h-4" />
                </Button>
              </form>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default Chat;