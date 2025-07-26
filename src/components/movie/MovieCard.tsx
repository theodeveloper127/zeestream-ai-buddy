import React, { useState } from 'react';
import { Play, Download, Heart, MessageCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Movie } from '@/types/movie';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';

interface MovieCardProps {
  movie: Movie;
  onAuthRequired: () => void;
}

export const MovieCard: React.FC<MovieCardProps> = ({ movie, onAuthRequired }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [imageLoaded, setImageLoaded] = useState(false);

  const handlePlay = () => {
    navigate(`/watch/${movie.slug}`);
  };

  const handleLike = () => {
    if (!user) {
      onAuthRequired();
      return;
    }
    // TODO: Implement like functionality
  };

  const handleComment = () => {
    if (!user) {
      onAuthRequired();
      return;
    }
    navigate(`/watch/${movie.slug}#comments`);
  };

  return (
    <div className="movie-card group">
      <div className="relative aspect-[2/3] w-full">
        {/* Z-shaped overlay */}
        <div className="movie-z-overlay" />
        
        {/* Thumbnail */}
        <img
          src={movie.thumbnailUrl}
          alt={movie.name}
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            imageLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          onLoad={() => setImageLoaded(true)}
        />
        
        {/* Loading skeleton */}
        {!imageLoaded && (
          <div className="absolute inset-0 loading-shimmer rounded-lg" />
        )}

        {/* Movie overlay on hover */}
        <div className="movie-overlay">
          <div className="text-center space-y-4">
            <h3 className="text-lg font-semibold text-white px-4">{movie.name}</h3>
            
            <div className="flex items-center justify-center space-x-3">
              <Button
                onClick={handlePlay}
                size="sm"
                className="bg-white/20 hover:bg-white/30 border border-white/30"
              >
                <Play className="w-4 h-4" />
              </Button>
              <Button
                onClick={handlePlay}
                size="sm"
                className="bg-white/20 hover:bg-white/30 border border-white/30"
              >
                <Download className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Coming Soon Badge */}
        {movie.comingSoon && (
          <div className="absolute top-2 right-2 z-30 bg-accent text-accent-foreground px-2 py-1 rounded text-xs font-medium">
            Coming Soon
          </div>
        )}

        {/* Series Badge */}
        {movie.isSeries && (
          <div className="absolute bottom-2 left-2 z-30 bg-black/60 text-white px-2 py-1 rounded text-xs">
            Series
          </div>
        )}
      </div>

      {/* Movie Info */}
      <div className="p-3 space-y-2">
        <h3 className="font-medium truncate">{movie.name}</h3>
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{movie.category}</span>
          <div className="flex items-center space-x-2">
            <span>★ {movie.rating}</span>
          </div>
        </div>
        
        {/* Action buttons */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center space-x-3 text-sm">
            <button
              onClick={handleLike}
              className="flex items-center space-x-1 text-muted-foreground hover:text-primary transition-colors"
            >
              <Heart className="w-4 h-4" />
              <span>{movie.likes}</span>
            </button>
            <button
              onClick={handleComment}
              className="flex items-center space-x-1 text-muted-foreground hover:text-primary transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              <span>{movie.comments.length}</span>
            </button>
          </div>
          
          <span className="text-xs text-muted-foreground">
            {movie.type === 'translated' ? 'Dubbed' : 'Original'}
          </span>
        </div>
      </div>
    </div>
  );
};