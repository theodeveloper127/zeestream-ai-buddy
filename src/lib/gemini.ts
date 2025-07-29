import { GoogleGenerativeAI, ChatSession } from '@google/generative-ai';
import { Movie } from '@/types/movie';
import { collection, query, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Timestamp } from 'firebase/firestore';

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

export const getGeminiModel = () => {
  return genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
};

interface AiResponse {
  text: string;
  movies?: Movie[];
  aiAction?: 'search_movies' | 'general_chat' | 'identity_response';
}

const SYSTEM_INSTRUCTION = `
You are Zee AI, the helpful movie assistant for Zeestream, developed by Rwandascratch. Your goal is to assist users with Zeestream-related questions or find movies based on their input.

Capabilities:
1. **Identity/Greeting**: For queries like "who are you", "what is Zeestream", or greetings ("hi"), respond naturally about Zeestream. Example: "Hi [userName]! I'm Zee AI, your Zeestream movie assistant. Ask about our platform or movies!"
2. **Movie Search**: For movie queries (e.g., "funny sci-fi movie with aliens from 2000s", "movies starting with theo", "coming soon movies", "about theogened"), filter or sort the provided movie JSON based on keywords (genres, themes, actors, decades, title prefix, comingSoon status, or specific titles). Return:
   - A friendly message (e.g., "Here are some sci-fi comedies!" or "Here's what I know about 'theogened':").
   - A list of matching movie names (e.g., ["theogened", "theogeneg"]).
   Do NOT return JSON. Use the movie JSON below to find matches. If no matches, suggest up to 50 recent movies (sorted by uploadDate descending) or say no matches were found (e.g., for comingSoon if none exist).
3. **General Conversation**: For non-movie Zeestream queries (e.g., "how does Zeestream work"), respond naturally without referencing movies unless asked. Ask follow-up questions if input is vague (e.g., "Any specific genres you like?").

Movie JSON:
{movieDataForAI}
`;

export const generateChatResponse = async (
  userMessage: string,
  movieContext: Movie[], // Not used directly since we fetch all movies
  chatSession: ChatSession,
  userName?: string
): Promise<AiResponse> => {
  let aiText = '';
  let moviesToSuggest: Movie[] | undefined = undefined;
  let aiAction: AiResponse['aiAction'] = 'general_chat';

  // Fetch all movies from Firebase
  const moviesRef = collection(db, 'movies');
  const querySnapshot = await getDocs(query(moviesRef));
  const allMovies: Movie[] = [];
  querySnapshot.forEach(doc => {
    const data = doc.data();
    if (data.releaseDate instanceof Timestamp) {
      data.releaseDate = data.releaseDate.toDate();
    }
    if (data.uploadDate instanceof Timestamp) {
      data.uploadDate = data.uploadDate.toDate();
    }
    allMovies.push({ id: doc.id, ...data } as Movie);
  });

  // Convert movies to JSON for Gemini
  const movieDataForAI = JSON.stringify(
    allMovies.map(movie => ({
      id: movie.id,
      name: movie.name,
      slug: movie.slug,
      thumbnailUrl: movie.thumbnailUrl,
      type: movie.type,
      category: movie.category,
      likes: movie.likes,
      comments: movie.comments,
      rating: movie.rating,
      uploadDate: movie.uploadDate.toISOString(),
      description: movie.description,
      trailerUrl: movie.trailerUrl,
      isSeries: movie.isSeries,
      relationship: movie.relationship,
      comingSoon: movie.comingSoon,
      releaseDate: movie.releaseDate ? movie.releaseDate.toISOString() : undefined,
      translator: movie.translator,
      watchUrl: movie.watchUrl,
      downloadUrl: movie.downloadUrl,
    })),
    null,
    2
  );

  const fullPrompt = `${SYSTEM_INSTRUCTION.replace('{movieDataForAI}', movieDataForAI)}
User question: ${userMessage}
Respond with a friendly message and, for movie queries, a list of matching movie names (e.g., ["theogened", "theogeneg"]). Do NOT return JSON. Use [userName] for ${userName || 'user'}.`;

  try {
    const result = await chatSession.sendMessage(fullPrompt);
    const response = await result.response;
    const geminiRawText = response.text();

    // Log raw response for debugging
    console.log('Gemini raw response:', geminiRawText);

    // Check if response is JSON (shouldn't happen, but handle as fallback)
    if (geminiRawText.trim().startsWith('{')) {
      console.warn('Unexpected JSON response from Gemini:', geminiRawText);
      try {
        const parsedResponse = JSON.parse(geminiRawText);
        aiText = parsedResponse.text || 'Here are some movies you might like:';
        aiAction = 'search_movies';

        const suggestedMovieNames = (parsedResponse.movie_names || []).map((name: string) => name.toLowerCase());
        moviesToSuggest = allMovies.filter(movie => suggestedMovieNames.includes(movie.name.toLowerCase())).slice(0, 50);

        if (moviesToSuggest.length === 0) {
          aiText = parsedResponse.keywords?.comingSoon
            ? "No upcoming movies found, but here are some recent ones!"
            : "Couldn't find movies matching that, but here are some recent ones!";
          moviesToSuggest = allMovies.sort((a, b) => b.uploadDate.getTime() - a.uploadDate.getTime()).slice(0, 50);
        }
      } catch (jsonError) {
        console.error('Error parsing unexpected JSON response:', jsonError);
        aiText = "Sorry, I couldn't process that movie request. Try asking for specific genres or titles!";
        aiAction = 'general_chat';
      }
    } else {
      // Parse non-JSON response expecting friendly message and optional movie names
      const lines = geminiRawText.split('\n').map(line => line.trim()).filter(line => line);
      aiText = lines[0].replace('[userName]', userName || 'there') || 'Here are some movies you might like:';
      aiAction = 'general_chat';

      // Check for movie names in subsequent lines (e.g., ["theogened", "theogeneg"])
      let suggestedMovieNames: string[] = [];
      const movieNamesMatch = geminiRawText.match(/\[".*?"/g);
      if (movieNamesMatch) {
        try {
          suggestedMovieNames = JSON.parse(movieNamesMatch[0]).map((name: string) => name.toLowerCase());
          aiAction = 'search_movies';
        } catch (error) {
          console.error('Error parsing movie names:', error);
        }
      }

      if (suggestedMovieNames.length > 0) {
        moviesToSuggest = allMovies
          .filter(movie => suggestedMovieNames.includes(movie.name.toLowerCase()))
          .slice(0, 50);
      }

      // Handle special cases (e.g., identity or comingSoon with no matches)
      const lowerCaseAiText = aiText.toLowerCase();
      if (lowerCaseAiText.includes('zee ai') || lowerCaseAiText.includes('zeestream')) {
        aiAction = 'identity_response';
      } else if (lowerCaseAiText.includes('coming soon') && moviesToSuggest?.length === 0) {
        aiText = "I'm sorry, but I don't have information about upcoming releases on Zeestream. Try checking the Zeestream website or app directly.";
      } else if (moviesToSuggest?.length === 0 && aiAction === 'search_movies') {
        aiText = "Couldn't find movies matching that, but here are some recent ones!";
        moviesToSuggest = allMovies.sort((a, b) => b.uploadDate.getTime() - a.uploadDate.getTime()).slice(0, 50);
      }
    }

    if (!aiText) {
      aiText = "Sorry, I couldn't process that. Try asking about Zeestream or movies!";
    }
  } catch (error) {
    console.error('Error with Gemini:', error);
    aiText = "Sorry, I'm having trouble. Try again later.";
  }

  // Log final response for debugging
  console.log('Final AI response:', { text: aiText, movies: moviesToSuggest, aiAction });

  return { text: aiText, movies: moviesToSuggest, aiAction };
};