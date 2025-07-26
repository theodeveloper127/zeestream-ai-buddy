import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI("AIzaSyB2MFZWyj_Wn0whFADg1f19G7ELC6HedHU");

export const getGeminiModel = () => {
  return genAI.getGenerativeModel({ model: "gemini-pro" });
};

export const generateChatResponse = async (prompt: string, movieContext?: any[]) => {
  try {
    const model = getGeminiModel();
    
    let enhancedPrompt = prompt;
    if (movieContext && movieContext.length > 0) {
      const movieData = movieContext.map(movie => 
        `${movie.name} (${movie.category}) - ${movie.description}`
      ).join('\n');
      
      enhancedPrompt = `You are a movie assistant for Zeestream. Here are some movies in our database:
${movieData}

User question: ${prompt}

Please provide a helpful response. If the user is asking about specific movies, you can reference the ones above. Keep responses concise and friendly.`;
    } else {
      enhancedPrompt = `You are a movie assistant for Zeestream streaming platform. User question: ${prompt}. Please provide a helpful, concise response about movies or streaming.`;
    }

    const result = await model.generateContent(enhancedPrompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('Gemini API error:', error);
    throw new Error('Failed to generate response');
  }
};