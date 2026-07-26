import dotenv from "dotenv";
import path from "path";
dotenv.config({
  path: process.env.NODE_ENV === "test" ? path.resolve(process.cwd(), ".env.test") : undefined,
  override: true
});
import { createOpenAI } from "@ai-sdk/openai";

console.log("aiModel init: key =", process.env.OPENAI_API_KEY ? `${process.env.OPENAI_API_KEY.slice(0, 15)}...` : "undefined");
console.log("aiModel init: baseURL =", process.env.OPENAI_BASE_URL);

// If a custom baseURL is provided (e.g., for Nvidia Build), create a custom OpenAI provider instance.
// Otherwise, fall back to the default openai provider behavior which uses standard OpenAI API.
const customOpenAI = createOpenAI({
  baseURL: process.env.OPENAI_BASE_URL || undefined,
  apiKey: process.env.OPENAI_API_KEY,
});

// Configure the model to use. Defaults to the placeholder model "gpt-5-nano" if not specified.
// We use .chat() explicitly to ensure it uses the `/chat/completions` endpoint, which is supported by Nvidia Build.
export const aiModel = customOpenAI.chat(process.env.OPENAI_MODEL || "gpt-5-nano");
