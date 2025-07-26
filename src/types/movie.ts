export interface Movie {
  id: string;
  name: string;
  slug: string;
  thumbnailUrl: string;
  type: 'original' | 'translated';
  category: string;
  likes: number;
  comments: Comment[];
  rating: number;
  uploadDate: Date;
  description: string;
  trailerUrl: string;
  isSeries: boolean;
  parts?: Episode[];
  comingSoon: boolean;
  releaseDate?: Date;
  translator?: string;
}

export interface Episode {
  id: string;
  title: string;
  episodeNumber: number;
  videoUrl: string;
  thumbnailUrl: string;
  duration: string;
  description: string;
}

export interface Comment {
  id: string;
  userId: string;
  userEmail: string;
  content: string;
  timestamp: Date;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  createdAt: Date;
  likedMovies: string[];
}