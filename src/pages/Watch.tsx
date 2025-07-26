import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Play, Download, Heart, MessageCircle, Star, Calendar, User } from 'lucide-react';
import { doc, getDoc, collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { Movie } from '@/types/movie';
import { MovieGrid } from '@/components/movie/MovieGrid';
import { AuthModal } from '@/components/modals/AuthModal';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

const Watch = () => {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [movie, setMovie] = useState<Movie | null>(null);
  const [suggestions, setSuggestions] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [selectedEpisode, setSelectedEpisode] = useState(0);

  useEffect(() => {
    const loadMovie = async () => {
      if (!slug) return;

      try {
        setLoading(true);

        // Find movie by slug
        const moviesRef = collection(db, 'movies');
        const q = query(moviesRef, where('slug', '==', slug), limit(1));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
          navigate('/404');
          return;
        }

        const movieDoc = querySnapshot.docs[0];
        const movieData = { id: movieDoc.id, ...movieDoc.data() } as Movie;
        setMovie(movieData);

        // Load suggestions (same category)
        const suggestionsQuery = query(
          moviesRef,
          where('category', '==', movieData.category),
          where('id', '!=', movieData.id),
          orderBy('likes', 'desc'),
          limit(12)
        );
        const suggestionsSnapshot = await getDocs(suggestionsQuery);
        const suggestionsData: Movie[] = [];
        suggestionsSnapshot.forEach((doc) => {
          suggestionsData.push({ id: doc.id, ...doc.data() } as Movie);
        });
        setSuggestions(suggestionsData);
      } catch (error) {
        console.error('Error loading movie:', error);
        navigate('/404');
      } finally {
        setLoading(false);
      }
    };

    loadMovie();
  }, [slug, navigate]);

  const handleLike = () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    // TODO: Implement like functionality
  };

  const handleComment = () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    // TODO: Implement comment functionality
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-8">
          <div className="aspect-video loading-shimmer rounded-xl" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              <div className="h-8 loading-shimmer rounded w-3/4" />
              <div className="h-4 loading-shimmer rounded w-1/2" />
              <div className="h-20 loading-shimmer rounded" />
            </div>
            <div className="space-y-4">
              <div className="h-6 loading-shimmer rounded w-1/2" />
              <div className="h-32 loading-shimmer rounded" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!movie) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-2xl font-bold mb-4">Movie not found</h1>
        <Button onClick={() => navigate('/')}>Go Home</Button>
      </div>
    );
  }

  const currentVideo = movie.isSeries && movie.parts 
    ? movie.parts[selectedEpisode]?.videoUrl || movie.trailerUrl
    : movie.trailerUrl;

  return (
    <>
      <Helmet>
        <title>{movie.name} - Watch on Zeestream</title>
        <meta name="description" content={movie.description} />
        <meta property="og:title" content={`${movie.name} - Zeestream`} />
        <meta property="og:description" content={movie.description} />
        <meta property="og:image" content={movie.thumbnailUrl} />
      </Helmet>

      <div className="container mx-auto px-4 py-8">
        {/* Video Player */}
        <div className="aspect-video bg-black rounded-xl overflow-hidden mb-8">
          <video
            controls
            className="w-full h-full"
            poster={movie.thumbnailUrl}
            src={currentVideo}
          >
            Your browser does not support the video tag.
          </video>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Movie Info */}
            <div>
              <h1 className="text-3xl font-bold mb-4">{movie.name}</h1>
              
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-6">
                <div className="flex items-center space-x-1">
                  <Star className="w-4 h-4 text-yellow-500" />
                  <span>{movie.rating}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Calendar className="w-4 h-4" />
                  <span>{new Date(movie.uploadDate).getFullYear()}</span>
                </div>
                <span className="px-2 py-1 bg-primary/20 text-primary rounded text-xs font-medium">
                  {movie.category}
                </span>
                <span className="px-2 py-1 bg-muted rounded text-xs">
                  {movie.type === 'translated' ? 'Dubbed' : 'Original'}
                </span>
                {movie.isSeries && (
                  <span className="px-2 py-1 bg-accent/20 text-accent rounded text-xs">
                    Series
                  </span>
                )}
              </div>

              <p className="text-muted-foreground leading-relaxed mb-6">
                {movie.description}
              </p>

              {/* Action Buttons */}
              <div className="flex items-center space-x-4 mb-6">
                <Button className="btn-stream">
                  <Play className="w-4 h-4 mr-2" />
                  Play
                </Button>
                <Button variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
                <Button variant="ghost" onClick={handleLike}>
                  <Heart className="w-4 h-4 mr-2" />
                  {movie.likes}
                </Button>
                <Button variant="ghost" onClick={handleComment}>
                  <MessageCircle className="w-4 h-4 mr-2" />
                  {movie.comments.length}
                </Button>
              </div>

              {movie.translator && (
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <User className="w-4 h-4" />
                  <span>Translated by: {movie.translator}</span>
                </div>
              )}
            </div>

            {/* Episodes (if series) */}
            {movie.isSeries && movie.parts && movie.parts.length > 0 && (
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold mb-4">Episodes</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {movie.parts.map((episode, index) => (
                      <button
                        key={episode.id}
                        onClick={() => setSelectedEpisode(index)}
                        className={`flex items-center space-x-3 p-3 rounded-lg transition-colors text-left ${
                          selectedEpisode === index
                            ? 'bg-primary/20 border border-primary'
                            : 'bg-muted hover:bg-muted/80'
                        }`}
                      >
                        <img
                          src={episode.thumbnailUrl}
                          alt={episode.title}
                          className="w-16 h-12 object-cover rounded"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{episode.title}</p>
                          <p className="text-xs text-muted-foreground">Episode {episode.episodeNumber}</p>
                          <p className="text-xs text-muted-foreground">{episode.duration}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Comments Section */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4">Comments ({movie.comments.length})</h3>
                {movie.comments.length > 0 ? (
                  <div className="space-y-4">
                    {movie.comments.slice(0, 5).map((comment) => (
                      <div key={comment.id} className="border-b border-border pb-4 last:border-0">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className="font-medium">{comment.userEmail}</span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(comment.timestamp).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-sm">{comment.content}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No comments yet. Be the first to comment!</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Movie Details */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4">Details</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Genre:</span>
                    <span className="capitalize">{movie.category}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Rating:</span>
                    <span>★ {movie.rating}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Type:</span>
                    <span>{movie.type === 'translated' ? 'Dubbed' : 'Original'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Upload Date:</span>
                    <span>{new Date(movie.uploadDate).toLocaleDateString()}</span>
                  </div>
                  {movie.comingSoon && movie.releaseDate && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Release Date:</span>
                      <span>{new Date(movie.releaseDate).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Suggestions */}
        {suggestions.length > 0 && (
          <div className="mt-12">
            <h2 className="text-2xl font-bold mb-6">You might also like</h2>
            <MovieGrid
              movies={suggestions}
              onAuthRequired={() => setShowAuthModal(true)}
            />
          </div>
        )}
      </div>

      <AuthModal open={showAuthModal} onOpenChange={setShowAuthModal} />
    </>
  );
};

export default Watch;