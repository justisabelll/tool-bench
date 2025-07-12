import { z } from 'zod';

export interface TestCase {
  id: string;
  prompt: string;
  expectedCalls: {
    toolName: string;
    argsMatcher: z.ZodObject<any>;
  }[];
  allowNoTool?: boolean;
}

// utility helpers so the matchers stay compact

export const testCases: TestCase[] = [
  {
    id: 'file-save-simple',
    prompt: "Save the text 'Hello world' into a file called notes.txt in /tmp.",
    expectedCalls: [
      {
        toolName: 'fileTool',
        argsMatcher: z.object({
          name: z.literal('notes.txt'),
          path: z.literal('/tmp'),
          content: z.string().refine((s) => s.includes('Hello world')),
        }),
      },
    ],
  },
  {
    id: 'weather-fixed-date',
    prompt:
      'What will the weather be in San Francisco on 2025-07-13? Just tell me.',
    expectedCalls: [
      {
        toolName: 'weatherInSfTool',
        argsMatcher: z.object({
          date: z.literal('2025-07-13'),
        }),
      },
    ],
  },
  {
    id: 'search-ai-news',
    prompt: 'Search the web for the latest AI news in 2025.',
    expectedCalls: [
      {
        toolName: 'searchTool',
        argsMatcher: z.object({
          query: z
            .string()
            .refine((q) => q.includes('AI') && q.includes('2025')),
        }),
      },
    ],
  },
  {
    id: 'control-no-tool-needed',
    prompt: 'Why is the sky blue?',
    expectedCalls: [],
    allowNoTool: true, // any tool call here counts as a failure
  },
  {
    id: 'weather-and-save',
    prompt:
      "Get tomorrow's (2025-07-14) weather in SF and store it in /tmp/weather.txt.",
    expectedCalls: [
      {
        toolName: 'weatherInSfTool',
        argsMatcher: z.object({
          date: z.literal('2025-07-14'),
        }),
      },
      {
        toolName: 'fileTool',
        argsMatcher: z.object({
          name: z.literal('weather.txt'),
          path: z.literal('/tmp'),
          content: z.string().min(11), // some non-empty weather text > 10 chars
        }),
      },
    ],
  },
  {
    id: 'list-weekdays-no-tool',
    prompt: 'List the days of the week in order, nothing else.',
    expectedCalls: [],
    allowNoTool: true,
  },
];
