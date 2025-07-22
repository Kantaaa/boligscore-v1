import { GoogleGenAI, Type } from "@google/genai";
import { Property, AiSuggestion } from "../types";

// As per strict guidelines, the API key is expected to be available in the execution environment.
// The hosting platform is responsible for providing this variable.
if (!process.env.API_KEY) {
  console.warn("API_KEY environment variable not found. AI features will not work.");
}
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

const buildPrompt = (property: Property): string => {
  return `
Analyze the following property and provide 3-5 specific renovation suggestions.
For each suggestion, provide a title, a brief description, and an estimated cost level (Lav, Middels, Høy).

Property Details:
- Address: ${property.address}
- Type: ${property.propertyType}
- Built: ${property.yearBuilt}
- Price: ${property.price.toLocaleString('nb-NO')} NOK
- Area: ${property.area} m²
- General Condition: ${property.condition}
- Kitchen Quality: ${property.kitchenQuality}/10
- Living Room Quality: ${property.livingRoomQuality}/10
- Bathroom Count: ${property.bathrooms}
- Renovation Needs Note: ${property.renovationNeeds || 'Ingen spesifikke notater'}

Based on these details, what are your top renovation suggestions?
`;
};

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    suggestions: {
      type: Type.ARRAY,
      description: "A list of 3-5 renovation suggestions.",
      items: {
        type: Type.OBJECT,
        properties: {
          title: {
            type: Type.STRING,
            description: "A short, catchy title for the renovation suggestion in Norwegian (e.g., 'Moderniser Kjøkkenet')."
          },
          description: {
            type: Type.STRING,
            description: "A one or two sentence description in Norwegian of the suggested renovation and its benefits."
          },
          cost_level: {
            type: Type.STRING,
            description: "The estimated cost level for the renovation. Must be one of: 'Lav', 'Middels', 'Høy'."
          }
        },
      }
    }
  }
};


export const getRenovationSuggestions = async (property: Property): Promise<AiSuggestion[]> => {
    if (!process.env.API_KEY) {
        throw new Error("Gemini API-nøkkel er ikke konfigurert. AI-funksjoner er utilgjengelige.");
    }

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: buildPrompt(property),
            config: {
                systemInstruction: "You are a helpful assistant for real estate evaluation. You provide concise, practical, and actionable renovation suggestions in Norwegian. Your goal is to help users identify improvements that could increase a property's value and appeal. Respond only with the requested JSON.",
                responseMimeType: "application/json",
                responseSchema: responseSchema,
                temperature: 0.7,
            },
        });

        const jsonText = response.text.trim();
        if (!jsonText) {
            throw new Error("AI-en ga et tomt svar.");
        }

        const result = JSON.parse(jsonText);
        if (!result.suggestions || !Array.isArray(result.suggestions)) {
            console.error("Unexpected JSON structure from AI:", result);
            throw new Error("AI-en returnerte et uventet format.");
        }

        return result.suggestions;

    } catch (error: any) {
        console.error("Error fetching AI suggestions:", error);
        // Provide a more user-friendly error message
        if (error.message.includes('API key not valid')) {
            throw new Error('API-nøkkelen er ugyldig. Sjekk konfigurasjonen.');
        }
        throw new Error("En feil oppstod under henting av AI-forslag.");
    }
};
