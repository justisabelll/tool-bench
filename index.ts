import { openrouter } from './ai';
import { generateText } from 'ai';

const { text } = await generateText({
  model: openrouter.languageModel('openai/gpt-4.1-nano'),
  prompt: 'What is OpenRouter?',
});

console.log(text);
