
import { GoogleGenAI, Type } from "@google/genai";
import { Specialty, AIAnalysisResult } from "../types";

export const analyzeSymptomsWithGemini = async (
  symptoms: string, 
  specialties: Specialty[], 
  language: string
): Promise<AIAnalysisResult> => {
    // Use process.env.API_KEY as required by guidelines
    if (!process.env.API_KEY) {
        console.error("API Key missing. Make sure process.env.API_KEY is available.");
        throw new Error("API configuration error.");
    }
    
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    // Use allowed model
    const model = "gemini-2.5-flash";
    
    const specialtyList = specialties.map(s => s.name.en).join(', ');
    
    const prompt = `Analyze these symptoms and recommend the best medical specialty from the following list: ${specialtyList}.
    Symptoms: "${symptoms}"
    Language: ${language}`;

    const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    possibleCondition: { type: Type.STRING },
                    urgency: { type: Type.STRING, enum: ["High", "Medium", "Low"] },
                    explanation: { type: Type.STRING },
                    recommendedSpecialtyName: { type: Type.STRING, description: "Must be one of the specialties provided in the list." },
                    advice: { type: Type.STRING }
                },
                required: ["possibleCondition", "urgency", "explanation", "recommendedSpecialtyName", "advice"]
            }
        }
    });

    const jsonStr = response.text || "{}";
    const result = JSON.parse(jsonStr);
    
    // Match name back to ID for the application logic
    const recommendedSpecialty = specialties.find(s => 
        s.name.en.toLowerCase() === result.recommendedSpecialtyName?.toLowerCase() || 
        s.name.ar.toLowerCase() === result.recommendedSpecialtyName?.toLowerCase()
    ) || specialties[0]; // Fallback to first if no match found

    return {
        possibleCondition: result.possibleCondition,
        urgency: result.urgency as 'High' | 'Medium' | 'Low',
        explanation: result.explanation,
        recommendedSpecialtyId: recommendedSpecialty._id,
        recommendedSpecialtyName: result.recommendedSpecialtyName || recommendedSpecialty.name.en,
        advice: result.advice
    };
};
