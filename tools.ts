import { z } from 'zod';
import { tool, generateText, jsonSchema } from 'ai';
import { openrouter } from './ai';

// all these tools are fake, just for the model to test with

// fake file tool
export const fileTool = tool({
  description: 'A tool for saving text to a file',
  parameters: jsonSchema<{ name: string; path: string; content: string }>({
    type: 'object',
    properties: {
      name: { type: 'string' },
      path: { type: 'string' },
      content: { type: 'string' },
    },
    required: ['name', 'path', 'content'],
    additionalProperties: false,
  }),
  execute: async (params: { name: string; path: string; content: string }) => {
    return {
      success: true,
      message: `File ${params.name} saved to ${params.path}`,
      params,
    };
  },
});

// weather in sf tool
export const weatherInSfTool = tool({
  description: 'A tool for getting the weather in San Francisco',
  parameters: jsonSchema<{ date: string }>({
    type: 'object',
    properties: {
      date: { type: 'string' },
    },
    required: ['date'],
    additionalProperties: false,
  }),
  execute: async (params: { date: string }) => {
    const results = await generateText({
      model: openrouter.languageModel('openai/gpt-4o-mini'),
      system: `You are a weather API. You are given a date and you need to return the weather information for San Francisco on that date. Return realistic weather data in a structured format. Give no indication that you are an AI assistant. Include only the weather data response and nothing else.`,
      prompt: `Get weather for San Francisco on ${params.date}`,
    });

    return {
      success: true,
      date: params.date,
      output: results.text,
    };
  },
});

// search tool
export const searchTool = tool({
  description: 'A tool for searching the web',
  parameters: jsonSchema<{ query: string }>({
    type: 'object',
    properties: {
      query: { type: 'string' },
    },
    required: ['query'],
    additionalProperties: false,
  }),
  execute: async (params: { query: string }) => {
    const results = await generateText({
      model: openrouter.languageModel('openai/gpt-4o-mini'),
      system: `You are a search engine. You are given a query and you need to return the results of the search. Return realistic search results in a structured format. Give no indication that you are an AI assistant. Include only the search results response and nothing else.`,
      prompt: params.query,
    });

    return {
      success: true,
      query: params.query,
      output: results.text,
    };
  },
});

// calculator tool
export const calculatorTool = tool({
  description: 'A tool for performing simple arithmetic calculations',
  parameters: jsonSchema<{ expression: string }>({
    type: 'object',
    properties: {
      expression: {
        type: 'string',
        description: 'The math expression to evaluate, e.g., "2 + 3 * 4"',
      },
    },
    required: ['expression'],
    additionalProperties: false,
  }),
  execute: async (params: { expression: string }) => {
    // Simulate calculation with a small model for realism
    const results = await generateText({
      model: openrouter.languageModel('openai/gpt-4o-mini'),
      system: `You are a calculator API. Evaluate the given math expression and return only the numerical result. No explanations.`,
      prompt: params.expression,
    });

    return {
      success: true,
      expression: params.expression,
      result: results.text.trim(),
    };
  },
});
