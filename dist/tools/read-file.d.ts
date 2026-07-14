export declare const readFile: ({
    title?: string;
    providerOptions?: import("@ai-sdk/provider-utils").ProviderOptions;
    metadata?: import("@ai-sdk/provider").JSONObject;
    inputSchema: import("ai").FlexibleSchema<{
        path: string;
    }>;
    contextSchema?: import("ai").FlexibleSchema<import("@ai-sdk/provider-utils").Context> | undefined;
    needsApproval?: boolean | import("@ai-sdk/provider-utils").ToolNeedsApprovalFunction<{
        path: string;
    }, NoInfer<import("@ai-sdk/provider-utils").Context>> | undefined;
    onInputStart?: ((options: import("ai").ToolExecutionOptions<NoInfer<import("@ai-sdk/provider-utils").Context>>) => void | PromiseLike<void>) | undefined;
    onInputDelta?: ((options: {
        inputTextDelta: string;
    } & import("ai").ToolExecutionOptions<NoInfer<import("@ai-sdk/provider-utils").Context>>) => void | PromiseLike<void>) | undefined;
    onInputAvailable?: ((options: {
        input: {
            path: string;
        };
    } & import("ai").ToolExecutionOptions<NoInfer<import("@ai-sdk/provider-utils").Context>>) => void | PromiseLike<void>) | undefined;
    toModelOutput?: ((options: {
        toolCallId: string;
        input: {
            path: string;
        };
        output: string;
    }) => import("@ai-sdk/provider-utils").ToolResultOutput | PromiseLike<import("@ai-sdk/provider-utils").ToolResultOutput>) | undefined;
} & {
    outputSchema?: import("ai").FlexibleSchema<string> | undefined;
    execute: import("ai").ToolExecuteFunction<{
        path: string;
    }, string, NoInfer<import("@ai-sdk/provider-utils").Context>>;
} & {
    description?: string | ((options: {
        context: NoInfer<import("@ai-sdk/provider-utils").Context>;
        experimental_sandbox?: import("ai").Experimental_SandboxSession;
    }) => string) | undefined;
    strict?: boolean;
    inputExamples?: {
        input: NoInfer<{
            path: string;
        }>;
    }[] | undefined;
    id?: never;
    isProviderExecuted?: never;
    args?: never;
    supportsDeferredResults?: never;
} & {
    type?: undefined | "function";
} & {
    execute: import("ai").ToolExecuteFunction<{
        path: string;
    }, string, NoInfer<import("@ai-sdk/provider-utils").Context>>;
}) | ({
    title?: string;
    providerOptions?: import("@ai-sdk/provider-utils").ProviderOptions;
    metadata?: import("@ai-sdk/provider").JSONObject;
    inputSchema: import("ai").FlexibleSchema<{
        path: string;
    }>;
    contextSchema?: import("ai").FlexibleSchema<import("@ai-sdk/provider-utils").Context> | undefined;
    needsApproval?: boolean | import("@ai-sdk/provider-utils").ToolNeedsApprovalFunction<{
        path: string;
    }, NoInfer<import("@ai-sdk/provider-utils").Context>> | undefined;
    onInputStart?: ((options: import("ai").ToolExecutionOptions<NoInfer<import("@ai-sdk/provider-utils").Context>>) => void | PromiseLike<void>) | undefined;
    onInputDelta?: ((options: {
        inputTextDelta: string;
    } & import("ai").ToolExecutionOptions<NoInfer<import("@ai-sdk/provider-utils").Context>>) => void | PromiseLike<void>) | undefined;
    onInputAvailable?: ((options: {
        input: {
            path: string;
        };
    } & import("ai").ToolExecutionOptions<NoInfer<import("@ai-sdk/provider-utils").Context>>) => void | PromiseLike<void>) | undefined;
    toModelOutput?: ((options: {
        toolCallId: string;
        input: {
            path: string;
        };
        output: string;
    }) => import("@ai-sdk/provider-utils").ToolResultOutput | PromiseLike<import("@ai-sdk/provider-utils").ToolResultOutput>) | undefined;
} & {
    outputSchema?: import("ai").FlexibleSchema<string> | undefined;
    execute: import("ai").ToolExecuteFunction<{
        path: string;
    }, string, NoInfer<import("@ai-sdk/provider-utils").Context>>;
} & {
    description?: string | ((options: {
        context: NoInfer<import("@ai-sdk/provider-utils").Context>;
        experimental_sandbox?: import("ai").Experimental_SandboxSession;
    }) => string) | undefined;
    strict?: boolean;
    inputExamples?: {
        input: NoInfer<{
            path: string;
        }>;
    }[] | undefined;
    id?: never;
    isProviderExecuted?: never;
    args?: never;
    supportsDeferredResults?: never;
} & {
    type: "dynamic";
} & {
    execute: import("ai").ToolExecuteFunction<{
        path: string;
    }, string, NoInfer<import("@ai-sdk/provider-utils").Context>>;
}) | ({
    title?: string;
    providerOptions?: import("@ai-sdk/provider-utils").ProviderOptions;
    metadata?: import("@ai-sdk/provider").JSONObject;
    inputSchema: import("ai").FlexibleSchema<{
        path: string;
    }>;
    contextSchema?: import("ai").FlexibleSchema<import("@ai-sdk/provider-utils").Context> | undefined;
    needsApproval?: boolean | import("@ai-sdk/provider-utils").ToolNeedsApprovalFunction<{
        path: string;
    }, NoInfer<import("@ai-sdk/provider-utils").Context>> | undefined;
    onInputStart?: ((options: import("ai").ToolExecutionOptions<NoInfer<import("@ai-sdk/provider-utils").Context>>) => void | PromiseLike<void>) | undefined;
    onInputDelta?: ((options: {
        inputTextDelta: string;
    } & import("ai").ToolExecutionOptions<NoInfer<import("@ai-sdk/provider-utils").Context>>) => void | PromiseLike<void>) | undefined;
    onInputAvailable?: ((options: {
        input: {
            path: string;
        };
    } & import("ai").ToolExecutionOptions<NoInfer<import("@ai-sdk/provider-utils").Context>>) => void | PromiseLike<void>) | undefined;
    toModelOutput?: ((options: {
        toolCallId: string;
        input: {
            path: string;
        };
        output: string;
    }) => import("@ai-sdk/provider-utils").ToolResultOutput | PromiseLike<import("@ai-sdk/provider-utils").ToolResultOutput>) | undefined;
} & {
    outputSchema?: import("ai").FlexibleSchema<string> | undefined;
    execute: import("ai").ToolExecuteFunction<{
        path: string;
    }, string, NoInfer<import("@ai-sdk/provider-utils").Context>>;
} & {
    type: "provider";
    id: `${string}.${string}`;
    args: Record<string, unknown>;
    description?: never;
    strict?: never;
    inputExamples?: never;
} & {
    isProviderExecuted: false;
    supportsDeferredResults?: never;
} & {
    execute: import("ai").ToolExecuteFunction<{
        path: string;
    }, string, NoInfer<import("@ai-sdk/provider-utils").Context>>;
}) | ({
    title?: string;
    providerOptions?: import("@ai-sdk/provider-utils").ProviderOptions;
    metadata?: import("@ai-sdk/provider").JSONObject;
    inputSchema: import("ai").FlexibleSchema<{
        path: string;
    }>;
    contextSchema?: import("ai").FlexibleSchema<import("@ai-sdk/provider-utils").Context> | undefined;
    needsApproval?: boolean | import("@ai-sdk/provider-utils").ToolNeedsApprovalFunction<{
        path: string;
    }, NoInfer<import("@ai-sdk/provider-utils").Context>> | undefined;
    onInputStart?: ((options: import("ai").ToolExecutionOptions<NoInfer<import("@ai-sdk/provider-utils").Context>>) => void | PromiseLike<void>) | undefined;
    onInputDelta?: ((options: {
        inputTextDelta: string;
    } & import("ai").ToolExecutionOptions<NoInfer<import("@ai-sdk/provider-utils").Context>>) => void | PromiseLike<void>) | undefined;
    onInputAvailable?: ((options: {
        input: {
            path: string;
        };
    } & import("ai").ToolExecutionOptions<NoInfer<import("@ai-sdk/provider-utils").Context>>) => void | PromiseLike<void>) | undefined;
    toModelOutput?: ((options: {
        toolCallId: string;
        input: {
            path: string;
        };
        output: string;
    }) => import("@ai-sdk/provider-utils").ToolResultOutput | PromiseLike<import("@ai-sdk/provider-utils").ToolResultOutput>) | undefined;
} & {
    outputSchema?: import("ai").FlexibleSchema<string> | undefined;
    execute: import("ai").ToolExecuteFunction<{
        path: string;
    }, string, NoInfer<import("@ai-sdk/provider-utils").Context>>;
} & {
    type: "provider";
    id: `${string}.${string}`;
    args: Record<string, unknown>;
    description?: never;
    strict?: never;
    inputExamples?: never;
} & {
    isProviderExecuted: true;
    supportsDeferredResults?: boolean;
} & {
    execute: import("ai").ToolExecuteFunction<{
        path: string;
    }, string, NoInfer<import("@ai-sdk/provider-utils").Context>>;
});
