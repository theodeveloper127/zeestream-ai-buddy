import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Play, Users, Globe, Zap } from 'lucide-react';

const About = () => {
  return (
    <>
      <Helmet>
        <title>About Us - Zeestream</title>
        <meta name="description" content="Learn about Zeestream - your ultimate movie streaming destination" />
      </Helmet>

      <div className="container mx-auto px-4 py-12">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            About <span className="text-gradient">Zeestream</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            We're passionate about bringing you the best movie streaming experience with 
            cutting-edge technology and an extensive library of content.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
          <div className="text-center group">
            <div className="w-16 h-16 bg-gradient-primary rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
              <Play className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-lg font-semibold mb-2">High Quality Streaming</h3>
            <p className="text-muted-foreground text-sm">
              Enjoy movies in HD and 4K quality with seamless streaming experience.
            </p>
          </div>

          <div className="text-center group">
            <div className="w-16 h-16 bg-gradient-primary rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
              <Users className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Community Driven</h3>
            <p className="text-muted-foreground text-sm">
              Connect with fellow movie enthusiasts through comments and ratings.
            </p>
          </div>

          <div className="text-center group">
            <div className="w-16 h-16 bg-gradient-primary rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
              <Globe className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Global Content</h3>
            <p className="text-muted-foreground text-sm">
              Discover movies from around the world with original and dubbed versions.
            </p>
          </div>

          <div className="text-center group">
            <div className="w-16 h-16 bg-gradient-primary rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
              <Zap className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-lg font-semibold mb-2">AI Assistant</h3>
            <p className="text-muted-foreground text-sm">
              Get personalized movie recommendations with our AI-powered chat assistant.
            </p>
          </div>
        </div>

        {/* Story Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-16">
          <div>
            <h2 className="text-3xl font-bold mb-6">Our Story</h2>
            <div className="space-y-4 text-muted-foreground">
              <p>
                Zeestream was born from a simple idea: everyone deserves access to great movies. 
                We started as a small team of movie enthusiasts who wanted to create a platform 
                that combines the latest technology with a vast library of content.
              </p>
              <p>
                Today, we're proud to offer a streaming experience that includes everything from 
                blockbuster hits to indie gems, with both original and translated versions to 
                serve our global audience.
              </p>
              <p>
                Our AI-powered recommendation system learns from your preferences to suggest 
                movies you'll love, making movie discovery effortless and exciting.
              </p>
            </div>
          </div>

          <div className="relative">
            <div className="aspect-video bg-gradient-card rounded-xl flex items-center justify-center">
              <div className="text-center">
                <div className="w-20 h-20 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-4">
                  <Play className="w-10 h-10 text-white" />
                </div>
                <p className="text-muted-foreground">Bringing movies to life</p>
              </div>
            </div>
          </div>
        </div>

        {/* Mission Section */}
        <div className="bg-card rounded-xl p-8 text-center">
          <h2 className="text-3xl font-bold mb-4">Our Mission</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            To democratize entertainment by providing universal access to quality movies, 
            fostering a global community of film lovers, and using technology to enhance 
            the way people discover and enjoy cinema.
          </p>
        </div>
      </div>
    </>
  );
};

export default About;