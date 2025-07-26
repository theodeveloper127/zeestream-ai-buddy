import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Filter, X } from 'lucide-react';
import { collection, query, orderBy, limit, startAfter, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Movie } from '@/types/movie';
import { MovieGrid } from '@/components/movie/MovieGrid';
import { AuthModal } from '@/components/modals/AuthModal';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const MOVIES_PER_PAGE = 24;

const Movies = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [lastDoc, setLastDoc] = useState<any>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const typeFilter = searchParams.get('type') || 'all';
  const categoryFilter = searchParams.get('category') || 'all';

  const categories = ['all', 'action', 'comedy', 'drama', 'thriller', 'horror', 'romance', 'sci-fi'];
  const types = ['all', 'original', 'translated'];

  const updateFilter = (key: string, value: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (value === 'all') {
      newParams.delete(key);
    } else {
      newParams.set(key, value);
    }
    setSearchParams(newParams);
  };

  const loadMovies = async (isLoadMore = false) => {
    try {
      if (isLoadMore) {
        setLoadingMore(true);
      } else {
        setLoading(true);
        setMovies([]);
        setLastDoc(null);
        setHasMore(true);
      }

      const moviesRef = collection(db, 'movies');
      let q = query(moviesRef, orderBy('uploadDate', 'desc'), limit(MOVIES_PER_PAGE));

      // Apply filters
      if (typeFilter !== 'all') {
        q = query(q, where('type', '==', typeFilter));
      }
      if (categoryFilter !== 'all') {
        q = query(q, where('category', '==', categoryFilter));
      }

      // Pagination
      if (isLoadMore && lastDoc) {
        q = query(q, startAfter(lastDoc));
      }

      const querySnapshot = await getDocs(q);
      const newMovies: Movie[] = [];

      querySnapshot.forEach((doc) => {
        newMovies.push({ id: doc.id, ...doc.data() } as Movie);
      });

      if (isLoadMore) {
        setMovies(prev => [...prev, ...newMovies]);
      } else {
        setMovies(newMovies);
      }

      setLastDoc(querySnapshot.docs[querySnapshot.docs.length - 1]);
      setHasMore(newMovies.length === MOVIES_PER_PAGE);
    } catch (error) {
      console.error('Error loading movies:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    loadMovies();
  }, [typeFilter, categoryFilter]);

  const loadMore = () => {
    if (!loadingMore && hasMore) {
      loadMovies(true);
    }
  };

  return (
    <>
      <Helmet>
        <title>Movies - Zeestream</title>
        <meta name="description" content="Browse our collection of movies on Zeestream" />
      </Helmet>

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Movies</h1>
            <p className="text-muted-foreground">
              Discover amazing movies {typeFilter !== 'all' && `in ${typeFilter}`} 
              {categoryFilter !== 'all' && ` ${categoryFilter}`} category
            </p>
          </div>

          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className="md:hidden"
          >
            <Filter className="w-4 h-4 mr-2" />
            Filters
          </Button>
        </div>

        {/* Filters */}
        <div className={`mb-8 ${showFilters ? 'block' : 'hidden md:block'}`}>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Type</label>
              <Select value={typeFilter} onValueChange={(value) => updateFilter('type', value)}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {types.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type === 'all' ? 'All Types' : type.charAt(0).toUpperCase() + type.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Category</label>
              <Select value={categoryFilter} onValueChange={(value) => updateFilter('category', value)}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category === 'all' ? 'All Categories' : category.charAt(0).toUpperCase() + category.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {(typeFilter !== 'all' || categoryFilter !== 'all') && (
              <Button
                variant="ghost"
                onClick={() => {
                  setSearchParams({});
                }}
                className="md:mt-7"
              >
                <X className="w-4 h-4 mr-2" />
                Clear Filters
              </Button>
            )}
          </div>
        </div>

        {/* Movies Grid */}
        <MovieGrid
          movies={movies}
          loading={loading}
          onAuthRequired={() => setShowAuthModal(true)}
        />

        {/* Load More */}
        {hasMore && !loading && (
          <div className="text-center mt-12">
            <Button
              onClick={loadMore}
              disabled={loadingMore}
              variant="outline"
              size="lg"
            >
              {loadingMore ? 'Loading...' : 'Load More Movies'}
            </Button>
          </div>
        )}

        {/* No movies */}
        {!loading && movies.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No movies found with current filters.</p>
            <Button
              variant="outline"
              onClick={() => setSearchParams({})}
              className="mt-4"
            >
              Clear All Filters
            </Button>
          </div>
        )}
      </div>

      <AuthModal open={showAuthModal} onOpenChange={setShowAuthModal} />
    </>
  );
};

export default Movies;