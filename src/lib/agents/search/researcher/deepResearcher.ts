import { ActionOutput, ResearcherInput, ResearcherOutput } from '../types';
import { ActionRegistry } from './actions';
import SessionManager from '@/lib/session';
import { Chunk, Message, ReasoningResearchBlock } from '@/lib/types';
import formatChatHistoryAsString from '@/lib/utils/formatHistory';
import { CheckpointManager } from '@/lib/db/checkpointManager';
import { ToolCall } from '@/lib/models/types';

/**
 * ReAct Deep Research Agent:
 * Operates an autonomous Thought -> Action -> Observation cycle.
 * Iteratively reasons about what information is still missing, calls search and scrape tools,
 * observes the findings, updates checkpoints at each step, and concludes when sufficient depth is reached.
 */
export class DeepResearchAgent {
  async execute(
    session: SessionManager,
    input: ResearcherInput,
    threadId: string,
  ): Promise<ResearcherOutput> {
    const researchBlockId = crypto.randomUUID();
    let currentStep = 0;
    let parentCheckpointId: string | undefined;

    session.emitBlock({
      id: researchBlockId,
      type: 'research',
      data: {
        subSteps: [],
      },
    });

    const maxIterations = 8;
    const actionOutputs: ActionOutput[] = [];
    const allCollectedChunks: Chunk[] = [];

    const availableTools = ActionRegistry.getAvailableActionTools({
      classification: input.classification,
      fileIds: input.config.fileIds,
      mode: 'quality',
      sources: input.config.sources,
    });

    const toolsDescription = ActionRegistry.getAvailableActionsDescriptions({
      classification: input.classification,
      fileIds: input.config.fileIds,
      mode: 'quality',
      sources: input.config.sources,
    });

    const reactSystemPrompt = `
You are an expert Autonomous ReAct Research Agent.
You investigate topics using an explicit conversational ReAct loop:
1. Thought: Always call \`__reasoning_preamble\` first with your natural conversation thought:
   - On the first step: State what you are searching for and why (e.g., "Let me search this for you to find the latest verified information...").
   - On subsequent steps: Analyze what you learned from previous search results and state what is still missing or what angle to explore next (e.g., "Okay, I see the basic facts, but I need more specific data on X. Let me search for that now...").
   - When concluding: Call \`__reasoning_preamble\` saying you have collected enough comprehensive data (e.g., "I now have enough detailed data across all angles. Here is the final report..."), and then call \`done\`.
2. Action: Select relevant tools:
   - \`web_search\`: Search the live web for targeted facts and developments.
   - \`uploads_search\`: Search inside user uploaded documents if attached.
   - \`done\`: Conclude the research loop when you have gathered all necessary information.
3. Observation: Review observations carefully before formulating your next thought.

Maintain this cadence:
Turn 1: __reasoning_preamble ("Okay, let me search this for you...") -> web_search [...]
Turn 2: __reasoning_preamble ("I found initial details, but I need more data on [subtopic]...") -> web_search [...]
Turn 3+: __reasoning_preamble ("I have enough data from multiple credible sources. Preparing report...") -> done

<available_tools>
${toolsDescription}
</available_tools>
`;

    const conversationHistory: Message[] = [
      {
        role: 'user',
        content: `
<conversation>
${formatChatHistoryAsString(input.chatHistory.slice(-5))}
User Query: "${input.followUp}" (Standalone Intent: ${input.classification.standaloneFollowUp})
</conversation>
Please begin your ReAct research process.
        `.trim(),
      },
    ];

    for (let iteration = 0; iteration < maxIterations; iteration++) {
      currentStep++;
      const block = session.getBlock(researchBlockId);

      const actionStream = input.config.llm.streamText({
        messages: [
          { role: 'system', content: reactSystemPrompt },
          ...conversationHistory,
        ],
        tools: availableTools,
      });

      let reasoningEmitted = false;
      const reasoningId = crypto.randomUUID();
      let finalToolCalls: ToolCall[] = [];

      for await (const partialRes of actionStream) {
        if (partialRes.toolCallChunk && partialRes.toolCallChunk.length > 0) {
          partialRes.toolCallChunk.forEach((tc) => {
            if (
              tc.name === '__reasoning_preamble' &&
              tc.arguments['plan'] &&
              block &&
              block.type === 'research'
            ) {
              if (!reasoningEmitted) {
                reasoningEmitted = true;
                block.data.subSteps.push({
                  id: reasoningId,
                  type: 'reasoning',
                  reasoning: tc.arguments['plan'],
                });
              } else {
                const subStepIndex = block.data.subSteps.findIndex(
                  (s: any) => s.id === reasoningId,
                );
                if (subStepIndex !== -1) {
                  (block.data.subSteps[subStepIndex] as ReasoningResearchBlock).reasoning =
                    tc.arguments['plan'];
                }
              }

              session.updateBlock(researchBlockId, [
                {
                  op: 'replace',
                  path: '/data/subSteps',
                  value: block.data.subSteps,
                },
              ]);
            }

            const existingIndex = finalToolCalls.findIndex(
              (ftc) => ftc.id === tc.id,
            );
            if (existingIndex !== -1) {
              finalToolCalls[existingIndex].arguments = tc.arguments;
            } else {
              finalToolCalls.push(tc);
            }
          });
        }
      }

      // If no tools were called, prompt a fallback search or conclude
      if (finalToolCalls.length === 0) {
        if (iteration === 0) {
          finalToolCalls = [
            {
              id: crypto.randomUUID(),
              name: 'web_search',
              arguments: { queries: [input.classification.standaloneFollowUp || input.followUp] },
            },
          ];
        } else {
          break;
        }
      }

      // Check if agent concluded
      const isDone = finalToolCalls.some((tc) => tc.name === 'done');
      if (isDone && iteration > 0) {
        break;
      }

      // Filter out meta-reasoning tool call from tool execution
      const actionableCalls = finalToolCalls.filter(
        (tc) => tc.name !== '__reasoning_preamble' && tc.name !== 'done',
      );

      if (actionableCalls.length === 0) {
        if (isDone) break;
        continue;
      }

      // Add assistant turn to conversation
      conversationHistory.push({
        role: 'assistant',
        content: '',
        tool_calls: finalToolCalls,
      });

      // Execute Actionable Tools
      const stepResults = await ActionRegistry.executeAll(actionableCalls, {
        llm: input.config.llm,
        embedding: input.config.embedding,
        session,
        researchBlockId,
        fileIds: input.config.fileIds,
        mode: 'quality',
      });

      actionOutputs.push(...stepResults);

      // Collect new search or scrape evidence chunks
      for (const res of stepResults) {
        if (res.type === 'search_results' && Array.isArray(res.results)) {
          allCollectedChunks.push(...res.results);
        }
      }

      // Save LangGraph-spec superstep checkpoint and tool writes
      parentCheckpointId = await CheckpointManager.saveCheckpoint(
        threadId,
        currentStep,
        {
          iteration,
          calls: actionableCalls.map((c) => ({ name: c.name, args: c.arguments })),
          totalChunksSoFar: allCollectedChunks.length,
        },
        parentCheckpointId,
        actionableCalls.map((c, i) => ({
          taskId: `react_step_${iteration}_${i}`,
          channel: c.name,
          value: { args: c.arguments, outputType: stepResults[i]?.type },
        })),
      );

      // Feed observations back into agent conversation memory
      actionableCalls.forEach((call, idx) => {
        const out = stepResults[idx];
        let observationText = '';
        if (out && out.type === 'search_results') {
          observationText = `Retrieved ${out.results.length} sources:\n` +
            out.results.slice(0, 4).map((r) => `- [${r.metadata.title}](${r.metadata.url}): ${r.content.slice(0, 250)}...`).join('\n');
        } else {
          observationText = JSON.stringify(out);
        }

        conversationHistory.push({
          role: 'tool',
          id: call.id,
          name: call.name,
          content: observationText,
        });
      });
    }

    // Deduplicate and filter collected sources
    const seenUrls = new Map<string, number>();
    const uniqueChunks: Chunk[] = [];

    for (const chunk of allCollectedChunks) {
      const url = chunk.metadata.url;
      if (url && !seenUrls.has(url)) {
        seenUrls.set(url, uniqueChunks.length);
        uniqueChunks.push(chunk);
      } else if (url && seenUrls.has(url)) {
        const existingIdx = seenUrls.get(url)!;
        uniqueChunks[existingIdx].content += `\n\n${chunk.content}`;
      }
    }

    // Emit consolidated sources block to UI
    session.emitBlock({
      id: crypto.randomUUID(),
      type: 'source',
      data: uniqueChunks,
    });

    // Save final cross-thread long-term memory
    await CheckpointManager.storePut(
      'research_history',
      threadId,
      {
        query: input.followUp,
        sourcesCount: uniqueChunks.length,
        completedAt: new Date().toISOString(),
      },
    );

    return {
      findings: actionOutputs,
      searchFindings: uniqueChunks,
    };
  }
}
