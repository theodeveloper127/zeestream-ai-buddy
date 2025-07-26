import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

export const getGeminiModel = () => {
  return genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
};

export const generateChatResponse = async (prompt: string, movieContext?: any[]) => {
  try {
    const model = getGeminiModel();
    
    let enhancedPrompt = prompt;
    if (movieContext?.length > 0) {
      const movieData = movieContext.map(movie => 
        `${movie.name} (${movie.category}) - ${movie.description}`
      ).join('\n');
      
      enhancedPrompt = `You are a movie assistant for Zeestream. Here are some movies in our database:
${movieData}

User question: ${prompt}

Please provide a helpful response.`;
    } else {
      enhancedPrompt = `You are a movie assistant for Zeestream. User question: ${prompt}`;
    }

    const result = await model.generateContent(enhancedPrompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('Gemini API error:', error);
    throw new Error('Failed to generate response');
  }
};
