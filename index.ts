import { openrouter } from './ai';
import { generateText, type Tool } from 'ai';
import type { TestCase } from './testcases';
import { testCases } from './testcases';
import { fileTool, searchTool, weatherInSfTool, calculatorTool } from './tools';
import { modelsToRun, type RunnableModel } from './constants';
import fs from 'node:fs';

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
  calculatorTool,
};

async function runCase(
  model: RunnableModel,
  systemPrompt: string,
  testCase: TestCase
): Promise<CaseResult> {
  try {
    const { toolCalls, text } = await generateText({
      model: model.llm,
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
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      id: testCase.id,
      passed: false,
      reason: `Error during run: ${message}`,
    };
  }
}

async function main() {
  const systemPrompt =
    'You are a helpful assistant. You have access to a variety of tools. Use them when appropriate to answer the user prompt. When you are done, output the final answer.';

  fs.mkdirSync('results', { recursive: true });

  const aggregateResults: Record<string, { passed: number; total: number }> =
    {};

  for (const model of modelsToRun) {
    const results: CaseResult[] = [];
    // Parallelize test cases for this model
    const promises = testCases.map((testCase) =>
      runCase(model, systemPrompt, testCase)
    );
    const modelResults = await Promise.all(promises);
    results.push(...modelResults);

    // Log per-case results with
    console.log(`\n=== Results for ${model.name} ===`);
    for (const result of results) {
      const status = result.passed ? 'PASS' : 'FAIL';
      console.log(`[${status}] ${result.id}: ${result.reason ?? 'No issues'}`);
      if (!result.passed && result.actualCalls) {
        console.log(
          '  Actual Calls:',
          JSON.stringify(result.actualCalls, null, 2)
        );
      }
    }

    const passedCount = results.filter((r) => r.passed).length;
    console.log(
      `Summary: Passed ${passedCount} of ${
        results.length
      } test cases (Pass rate: ${((passedCount / results.length) * 100).toFixed(
        2
      )}%)`
    );

    fs.writeFileSync(
      `results/${model.name}.json`,
      JSON.stringify(results, null, 2)
    );

    aggregateResults[model.name] = {
      passed: passedCount,
      total: results.length,
    };
  }

  fs.writeFileSync(
    'results/aggregate.json',
    JSON.stringify(aggregateResults, null, 2)
  );
  console.log('\nAggregate results saved to results/aggregate.json');
}

main();
