// src/lib/gemini.ts
import { GoogleGenerativeAI, ChatSession } from '@google/generative-ai';
import { Movie } from '@/types/movie';
// Assuming ChatMessage is defined in Chat.tsx and exported for type use
import { ChatMessage } from '@/components/Chat'; 

// Initialize the Google Generative AI with the API key from environment variables
const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

// Function to get the Generative Model instance
export const getGeminiModel = () => {
  return genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
};

// Define the structure of the AI's response to the UI
interface AiResponse {
  text: string;
  movies?: Movie[];
  aiAction?: 'search_movies' | 'general_chat' | 'identity_response'; // AI will decide this now
}

// System instruction to guide the Gemini model's behavior and identity
const SYSTEM_INSTRUCTION = `
You are Zee AI, the helpful movie assistant for Zeestream. You were developed by Rwandascratch developer teams.
Your primary goal is to assist users in finding movies, providing recommendations, and answering questions about Zeestream's content.

Here are your capabilities and how you should respond:
1.  **Identity/Greeting:** If the user asks "who are you", "what are you", "tell me about yourself", or a general greeting like "hi" or "hello", respond as Zee AI.
    * **For "who are you" / "what are you" / "tell me about yourself":** "I am Zee AI. I'm a computer program designed to process and generate human-like text. I don't have personal experiences, emotions, or a physical body. My knowledge is based on a massive dataset of text and code I was trained on, which includes a vast amount of information from books, articles, websites, and more. I was developed by Rwandascratch to help users with many different information-related tasks."
    * **For "hi" / "hello":** "Hi there! I'm Zee AI, your personal movie assistant. How can I help you today?"
    * **For "what can you do":** "I can help you search for movies, recommend something based on your preferences, or provide information about our extensive collection. Just ask!"

2.  **Movie Search/Recommendation:** If the user asks for movie recommendations, searches for specific movies, or asks "what to watch", you MUST try to suggest movies from the provided 'Movie Context'.
    * **When suggesting movies, you MUST respond in a JSON format.** This allows the application to display movie cards.
    * The JSON should have two keys: "type" (always "movies") and "text" (a brief introductory sentence), and "movie_names" (an array of movie names from the context).
    * **Example JSON response for movie recommendation:**
        \`\`\`json
        {
          "type": "movies",
          "text": "Here are some movies you might like:",
          "movie_names": ["The Great Adventure", "Space Odyssey", "Mystery Manor"]
        }
        \`\`\`
    * If you can't find specific movies matching the user's query but they clearly want movies, suggest some popular ones from the context and use the JSON format.
    * Limit movie suggestions to a maximum of 6.

3.  **General Conversation:** For any other questions or conversation that is not about movies or your identity, respond naturally as a helpful AI assistant. Do NOT use the JSON format for general conversation.

**Movie Context (from Zeestream's database):**
Below is a list of movies available in our database. Use this information to answer movie-related queries.
`;

// Main function to generate chat responses with custom logic and Gemini SDK integration
export const generateChatResponse = async (
  userMessage: string, 
  movieContext: Movie[], 
  chatSession: ChatSession // Accepts the SDK's ChatSession for conversational memory
): Promise<AiResponse> => {
  let aiText = '';
  let moviesToSuggest: Movie[] | undefined = undefined;
  let aiAction: AiResponse['aiAction'] = 'general_chat'; // Default action

  console.log("\n--- generateChatResponse called ---");
  console.log("User message:", userMessage);
  console.log("Movie context size:", movieContext.length);

  // Format movie context for the AI
  const movieDataForAI = movieContext.map(movie => 
    `Name: ${movie.name}, Category: ${movie.category}, Description: ${movie.description}`
  ).join('\n');

  // Construct the full prompt for Gemini
  const fullPrompt = `${SYSTEM_INSTRUCTION}
${movieDataForAI}

User question: ${userMessage}

Please provide your response based on the instructions above.`;

  console.log("Sending prompt to Gemini:\n", fullPrompt);

  try {
    // Send the full prompt to the Gemini chat session
    const result = await chatSession.sendMessage(fullPrompt);
    const response = await result.response;
    const geminiRawText = response.text(); // Get the raw text from the response

    console.log("Raw response from Gemini:", geminiRawText);

    // Attempt to parse the response as JSON for movie recommendations
    try {
      const parsedResponse = JSON.parse(geminiRawText);
      if (parsedResponse.type === "movies" && Array.isArray(parsedResponse.movie_names)) {
        aiText = parsedResponse.text || "Here are some movies you might like:";
        const suggestedMovieNames = parsedResponse.movie_names.map((name: string) => name.toLowerCase());
        
        // Filter movies from the original movieContext based on names provided by Gemini
        moviesToSuggest = movieContext.filter(movie => 
          suggestedMovieNames.includes(movie.name.toLowerCase())
        ).slice(0, 6); // Ensure we don't exceed 6, even if Gemini suggests more

        if (moviesToSuggest.length === 0 && parsedResponse.movie_names.length > 0) {
            // If Gemini suggested names but we couldn't match them, fallback to popular
            aiText = "I couldn't find specific movies matching that, but here are some popular titles you might enjoy from our collection:";
            moviesToSuggest = movieContext.slice(0, 6);
        } else if (moviesToSuggest.length === 0 && parsedResponse.movie_names.length === 0) {
            // If Gemini intended to suggest movies but provided no names, fallback to popular
            aiText = "I couldn't find specific movies for you, but here are some popular titles you might enjoy from our collection:";
            moviesToSuggest = movieContext.slice(0, 6);
        }

        aiAction = 'search_movies';
        console.log("Parsed JSON response (movies). aiText:", aiText, "Movies:", moviesToSuggest.map(m => m.name));
      } else {
        // Not a movie JSON response, treat as general text
        aiText = geminiRawText;
        aiAction = 'general_chat'; // Or 'identity_response' if it matches identity text
        
        // Simple check to set aiAction for identity, based on the static text in SYSTEM_INSTRUCTION
        const lowerCaseAiText = aiText.toLowerCase();
        if (lowerCaseAiText.includes("i am zee ai") || lowerCaseAiText.includes("hi there! i'm zee ai")) {
            aiAction = 'identity_response';
        }
        console.log("Plain text response. aiText:", aiText);
      }
    } catch (jsonError) {
      // If JSON parsing fails, it's a plain text response
      aiText = geminiRawText;
      aiAction = 'general_chat'; // Or 'identity_response' if it matches identity text
      
      // Simple check to set aiAction for identity, based on the static text in SYSTEM_INSTRUCTION
      const lowerCaseAiText = aiText.toLowerCase();
      if (lowerCaseAiText.includes("i am zee ai") || lowerCaseAiText.includes("hi there! i'm zee ai")) {
          aiAction = 'identity_response';
      }
      console.log("JSON parsing failed, treating as plain text. aiText:", aiText);
    }

    if (!aiText) {
      console.warn("Gemini ChatSession returned no text response after parsing.");
      aiText = "I couldn't get a specific response from the AI. Please try rephrasing.";
    }

  } catch (error) {
      console.error("Error with Gemini response via ChatSession:", error);
      aiText = "I'm sorry, I'm having trouble with the AI right now. Please try again later.";
      aiAction = 'general_chat';
  }

  // Final guarantee: Ensure aiText is never empty before returning
  if (!aiText) {
      console.warn("aiText is still empty after all logic, defaulting to generic message.");
      aiText = "I'm not sure how to respond to that. Can you ask me something else?";
      aiAction = 'general_chat';
  }

  console.log("--- generateChatResponse finished. Final AiResponse: ---");
  console.log("Final Text:", aiText);
  console.log("Final Movies:", moviesToSuggest ? moviesToSuggest.map(m => m.name) : 'none');
  console.log("Final Action:", aiAction);
  console.log("----------------------------------\n");

  return { text: aiText, movies: moviesToSuggest, aiAction };
};