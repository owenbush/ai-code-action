import { type LanguageModel } from 'ai';
export interface AgentLoopOptions {
    model: LanguageModel;
    tools: Record<string, any>;
    system?: string;
    prompt: string;
    maxSteps: number;
    schema?: string;
    githubToken: string;
}
export interface AgentLoopResult {
    text: string;
    json?: string;
    steps: number;
    toolCalls: any[];
}
export declare function runAgentLoop(options: AgentLoopOptions): Promise<AgentLoopResult>;
