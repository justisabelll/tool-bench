import { openrouter } from './ai';
import { generateText, type Tool } from 'ai';
import type { TestCase } from './testcases';
import { testCases } from './testcases';
import { fileTool, searchTool, weatherInSfTool } from './tools';

interface CaseResult {
  id: string;
  passed: boolean;
  reason?: string;
  actualCalls?: { toolName: string; args: any }[];
}

const tools = {
  fileTool,
  weatherInSfTool,
  searchTool,
};

async function runCase(
  model: string,
  systemPrompt: string,
  testCase: TestCase
): Promise<CaseResult> {
  const { toolCalls, text } = await generateText({
    model: openrouter.languageModel(model),
    system: systemPrompt,
    messages: [{ role: 'user', content: testCase.prompt }],
    tools,
  });

  const actualCalls = (toolCalls ?? []).map(({ toolName, args }) => ({
    toolName,
    args,
  }));

  if (testCase.allowNoTool && actualCalls.length === 0) {
    return { id: testCase.id, passed: true };
  }

  if (testCase.expectedCalls.length !== actualCalls.length) {
    return {
      id: testCase.id,
      passed: false,
      reason: `Expected ${testCase.expectedCalls.length} tool calls, but got ${actualCalls.length}`,
      actualCalls,
    };
  }

  for (const expectedCall of testCase.expectedCalls) {
    const actualCall = actualCalls.find(
      (ac) => ac.toolName === expectedCall.toolName
    );

    if (!actualCall) {
      return {
        id: testCase.id,
        passed: false,
        reason: `Expected tool call ${expectedCall.toolName} was not made.`,
        actualCalls,
      };
    }

    const result = expectedCall.argsMatcher.safeParse(actualCall.args);
    if (!result.success) {
      return {
        id: testCase.id,
        passed: false,
        reason: `Tool call ${
          expectedCall.toolName
        } args validation failed: ${result.error.toString()}`,
        actualCalls,
      };
    }
  }

  return { id: testCase.id, passed: true, actualCalls };
}

async function main() {
  const systemPrompt =
    'You are a helpful assistant. You have access to a variety of tools. Use them when appropriate to answer the user prompt. When you are done, output the final answer.';

  const results: CaseResult[] = [];
  for (const testCase of testCases) {
    const result = await runCase('openai/gpt-4.1', systemPrompt, testCase);
    results.push(result);
    console.log(
      `[${result.passed ? 'PASS' : 'FAIL'}] ${result.id}: ${
        result.reason ?? ''
      }`
    );
    if (!result.passed) {
      console.log('Actual Calls:', result.actualCalls);
    }
  }

  const passedCount = results.filter((r) => r.passed).length;
  console.log(`\nPassed ${passedCount} of ${results.length} test cases.`);
}

main();
