import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { collection, query, orderBy, limit, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Movie } from '@/types/movie';
import { HeroSlider } from '@/components/movie/HeroSlider';
import { MovieGrid } from '@/components/movie/MovieGrid';
import { AuthModal } from '@/components/modals/AuthModal';
import { Button } from '@/components/ui/button';

const Index = () => {
  const [heroMovies, setHeroMovies] = useState<Movie[]>([]);
  const [popularMovies, setPopularMovies] = useState<Movie[]>([]);
  const [categorizedMovies, setCategorizedMovies] = useState<Record<string, Movie[]>>({});
  const [comingSoonMovies, setComingSoonMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const moviesRef = collection(db, 'movies');

        // Load hero movies (top 10 recent)
        const heroQuery = query(moviesRef, orderBy('uploadDate', 'desc'), limit(10));
        const heroSnapshot = await getDocs(heroQuery);
        const heroMoviesData: Movie[] = [];
        heroSnapshot.forEach((doc) => {
          heroMoviesData.push({ id: doc.id, ...doc.data() } as Movie);
        });
        setHeroMovies(heroMoviesData);

        // Load popular movies (top 12 by likes)
        const popularQuery = query(moviesRef, orderBy('likes', 'desc'), limit(12));
        const popularSnapshot = await getDocs(popularQuery);
        const popularMoviesData: Movie[] = [];
        popularSnapshot.forEach((doc) => {
          popularMoviesData.push({ id: doc.id, ...doc.data() } as Movie);
        });
        setPopularMovies(popularMoviesData);

        // Load coming soon movies
        const comingSoonQuery = query(
          moviesRef,
          where('comingSoon', '==', true),
          orderBy('releaseDate', 'asc'),
          limit(12)
        );
        const comingSoonSnapshot = await getDocs(comingSoonQuery);
        const comingSoonMoviesData: Movie[] = [];
        comingSoonSnapshot.forEach((doc) => {
          comingSoonMoviesData.push({ id: doc.id, ...doc.data() } as Movie);
        });
        setComingSoonMovies(comingSoonMoviesData);

        // Load categorized movies
        const categories = ['action', 'comedy', 'drama', 'thriller', 'horror', 'romance'];
        const categorizedData: Record<string, Movie[]> = {};

        for (const category of categories) {
          const categoryQuery = query(
            moviesRef,
            where('category', '==', category),
            orderBy('uploadDate', 'desc'),
            limit(12)
          );
          const categorySnapshot = await getDocs(categoryQuery);
          const categoryMovies: Movie[] = [];
          categorySnapshot.forEach((doc) => {
            categoryMovies.push({ id: doc.id, ...doc.data() } as Movie);
          });
          if (categoryMovies.length > 0) {
            categorizedData[category] = categoryMovies;
          }
        }
        setCategorizedMovies(categorizedData);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-12">
        {/* Hero Skeleton */}
        <div className="h-[70vh] loading-shimmer rounded-xl" />
        
        {/* Content Skeletons */}
        {[...Array(3)].map((_, i) => (
          <div key={i} className="container mx-auto px-4">
            <div className="h-8 w-48 loading-shimmer rounded mb-6" />
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {[...Array(12)].map((_, j) => (
                <div key={j} className="aspect-[2/3] loading-shimmer rounded-lg" />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Zeestream - Your Ultimate Movie Streaming Destination</title>
        <meta 
          name="description" 
          content="Stream the latest movies and TV series on Zeestream. Discover trending content, upcoming releases, and classics all in one place." 
        />
      </Helmet>

      <div className="space-y-12">
        {/* Hero Section */}
        {heroMovies.length > 0 && (
          <div className="container mx-auto px-4">
            <HeroSlider movies={heroMovies} />
          </div>
        )}

        {/* Popular Movies */}
        {popularMovies.length > 0 && (
          <section className="container mx-auto px-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Popular Movies</h2>
              <Link to="/movies?sort=popular">
                <Button variant="ghost">View All</Button>
              </Link>
            </div>
            <MovieGrid
              movies={popularMovies}
              onAuthRequired={() => setShowAuthModal(true)}
            />
          </section>
        )}

        {/* Categorized Movies */}
        {Object.entries(categorizedMovies).map(([category, movies]) => (
          <section key={category} className="container mx-auto px-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold capitalize">{category} Movies</h2>
              <Link to={`/movies?category=${category}`}>
                <Button variant="ghost">View All</Button>
              </Link>
            </div>
            <MovieGrid
              movies={movies}
              onAuthRequired={() => setShowAuthModal(true)}
            />
          </section>
        ))}

        {/* Coming Soon */}
        {comingSoonMovies.length > 0 && (
          <section className="container mx-auto px-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Coming Soon</h2>
              <Link to="/movies?coming_soon=true">
                <Button variant="ghost">View All</Button>
              </Link>
            </div>
            <MovieGrid
              movies={comingSoonMovies}
              onAuthRequired={() => setShowAuthModal(true)}
            />
          </section>
        )}

        {/* Empty State */}
        {heroMovies.length === 0 && popularMovies.length === 0 && Object.keys(categorizedMovies).length === 0 && (
          <div className="container mx-auto px-4 py-20 text-center">
            <h2 className="text-2xl font-bold mb-4">Welcome to Zeestream</h2>
            <p className="text-muted-foreground mb-8">
              No movies available yet. Check back soon for amazing content!
            </p>
            <Link to="/about">
              <Button>Learn More</Button>
            </Link>
          </div>
        )}
      </div>

      <AuthModal open={showAuthModal} onOpenChange={setShowAuthModal} />
    </>
  );
};

export default Index;