import OpenAI from "openai";
import {
  chatgptTemperature,
  systemMessageContent as systemMessageMain,
  nDocumentsToInclude,
} from "./config.js";
import { queryVectorDatabase } from "./database.js";
import {
  getMarket,
  executeTransaction,
  sendTokenPreview,
  tools,
} from "./gpttools.js";
import {
  ChatCompletionAssistantMessageParam,
  ChatCompletionCreateParams,
  ChatCompletionMessageParam,
  ChatCompletionMessageToolCall,
  ChatCompletionSystemMessageParam,
  ChatCompletionTool,
  ChatCompletionToolMessageParam,
  ChatCompletionUserMessageParam,
} from "openai/resources/index";

//export type Role = "system" | "user" | "assistant";
//export type Content = string;
/*export interface Message {
  role: Role;
  content: Content;
}*/

export type ChatGptModel = "gpt-3.5-turbo-1106" | "gpt-4-1106-preview";

/*export type ChatbotBody = {
  messages: ChatCompletionMessageParam[];
};*/

export type Conversation = ChatCompletionMessageParam[];

/*export default function routes(
  server: FastifyInstance,
  _options: Object,
  done: any
) {
  server.post("/query", chatgptHandler);
  done();
}

export async function chatgptHandler(
  request: FastifyRequest,
  response: FastifyReply
) {
  try {
    if (!(request.body as ChatbotBody).messages) {
      throw new Error("Malformed request");
    }
    const chatResult = await chatGippity(request.body as ChatbotBody);
    response.send(chatResult);
  } catch (e) {
    console.error(e);
    response.status(400).send({ msg: e });
    return;
  }
}*/

export let openai: OpenAI;
export function setOpenAiInstance() {
  if (!openai) {
    openai = new OpenAI();
  }
}

export interface AiAssistantConfig {
  systemMessageContent: string;
  chatGptModel: ChatGptModel;
  vectorSearch?: boolean;
  temperature?: number;
  maxTokens?: number;
  tools?: ChatCompletionTool[];
  seed?: number;
  responseFormat?: ChatCompletionCreateParams.ResponseFormat;
}

export async function aiAssistant(
  conversation: Conversation = [],
  config: AiAssistantConfig,
): Promise<Conversation> {
  console.log(`aiAssistant - conversation`);
  console.log(conversation);
  console.log(`aiAssistant - config`);
  console.log(JSON.stringify(config, null, 4));

  const userMessage = getLatestUserMessage(conversation);
  let context = `# Context
## Current Date & Time
${new Date().toISOString()}`;
  const previousMessage =
    conversation.length > 0 ? `${getLatestMessageText(conversation)}\n\n` : "";
  if (config.vectorSearch) {
    const relevantDocuments = await queryVectorDatabase(
      `${previousMessage}${userMessage}`,
      nDocumentsToInclude,
    );
    const relevantDocsFormatted = relevantDocuments[0].reduce(
      (acc, doc, index) => {
        return `${acc}
## Search Result ${index + 1}
\`\`\`
${doc}
\`\`\`
`;
      },
      "",
    );
    context = `${context}${relevantDocsFormatted}`;
  }

  config.systemMessageContent = `${config.systemMessageContent}
${context}`;
  const systemMessage: ChatCompletionSystemMessageParam = {
    role: "system",
    content: config.systemMessageContent,
  };
  //console.log(`systemMessage`);
  //console.log(systemMessage);
  conversation = [systemMessage, ...conversation];
  const params: OpenAI.Chat.ChatCompletionCreateParams = {
    messages: conversation,
    model: config.chatGptModel,
    temperature: config.temperature,
    max_tokens: config.maxTokens ?? 1024,
    tools,
    seed: config.seed,
    response_format: config.responseFormat,
  };

  try {
    console.log("Calling OpenAI API...");
    const response = await openai.chat.completions.create(params);

    // Keep for server logs
    console.log("OpenAI API response usage:");
    console.log(response.usage);

    const responseMessage = response.choices[0].message;
    const newResponses: ChatCompletionMessageParam[] = [];
    newResponses.push(responseMessage);
    conversation.push(responseMessage);
  } catch (e) {
    console.error(e);
    throw e;
  }

  // Keep for server logs
  /*console.log("==================== Messages:");
  console.log("Previous Message:");
  console.log(previousMessage);
  console.log("\nUser Message:");
  console.log(userMessage);
  console.log("\nSystem Message Context:");
  console.log(context);
  console.log("\nAgent Response:");
  console.log(newResponses);*/

  conversation.shift(); // Remove system message

  return conversation;
}

export async function runTools(
  toolCalls: ChatCompletionMessageToolCall[],
  availableFunctions: {
    [key: string]: (...args: unknown[]) => ChatCompletionToolMessageParam[];
  },
): Promise<ChatCompletionToolMessageParam[]> {
  const functionResponses = await Promise.allSettled(
    toolCalls.map((toolCall) => {
      // Keep for server logs
      console.log("==================== Tool Call:");
      console.log(toolCall);

      const functionToCall = availableFunctions[toolCall.function.name];
      const functionArgs = JSON.parse(toolCall.function.arguments);
      return functionToCall(functionArgs);
    }),
  );

  console.log(`runTools - functionResponses`);
  console.log(functionResponses);

  return functionResponses.map((functionResponse, index) => {
    const message: ChatCompletionToolMessageParam = {
      tool_call_id: toolCalls[index].id,
      role: "tool",
      content: JSON.stringify(functionResponse, (_, value) =>
        value instanceof Error ? value.message : value,
      ),
    };
    return message;
  });
}

export async function chatGippity(
  userMessage: ChatCompletionUserMessageParam,
  conversationHistory: Conversation = [],
  vectorSearch = true,
  chatGptModel: ChatGptModel = "gpt-4-1106-preview",
): Promise<Conversation> {
  let context = `# Context
## Current Date & Time
${new Date().toISOString()}`;
  const previousMessage =
    conversationHistory.length > 0
      ? `${getLatestMessageText(conversationHistory)}\n\n`
      : "";
  if (vectorSearch) {
    const relevantDocuments = await queryVectorDatabase(
      `${previousMessage}${userMessage}`,
      nDocumentsToInclude,
    );
    const relevantDocsFormatted = relevantDocuments[0].reduce(
      (acc, doc, index) => {
        return `${acc}
## Search Result ${index + 1}
\`\`\`
${doc}
\`\`\`
`;
      },
      "",
    );
    context = `${context}${relevantDocsFormatted}`;
  }

  const systemMessageContent = `${systemMessageMain}
${context}`;
  const systemMessage: ChatCompletionSystemMessageParam = {
    role: "system",
    content: systemMessageContent,
  };
  const conversation: Conversation = [
    systemMessage,
    ...conversationHistory,
    userMessage,
  ];
  const params: OpenAI.Chat.ChatCompletionCreateParams = {
    messages: conversation,
    model: chatGptModel,
    temperature: chatgptTemperature,
    tools,
  };

  const response = await openai.chat.completions.create(params);
  const responseMessage = response.choices[0].message;
  const newResponses: ChatCompletionMessageParam[] = [];
  newResponses.push(responseMessage);
  conversation.push(responseMessage);

  const toolCalls = responseMessage.tool_calls;
  if (toolCalls) {
    // Keep for server logs
    console.log("==================== Tool Call:");
    console.log(toolCalls);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const availableFunctions: { [key: string]: (args: any) => any } = {
      getMarket,
      sendTokenPreview,
      executeTransaction,
    };
    const functionResPromises: ChatCompletionToolMessageParam[] = [];
    for (const toolCall of toolCalls) {
      const functionName = toolCall.function.name;
      const functionToCall = availableFunctions[functionName];
      const functionArgs = JSON.parse(toolCall.function.arguments);
      functionResPromises.push(functionToCall(functionArgs));
    }
    const functionResponses = await Promise.allSettled(functionResPromises);
    functionResponses.forEach((functionResponse, index) => {
      const message: ChatCompletionToolMessageParam = {
        tool_call_id: toolCalls[index].id,
        role: "tool",
        content: JSON.stringify(functionResponse),
      };
      newResponses.push(message);
      conversation.push(message);
    });
  }

  const secondResponse = await openai.chat.completions.create({
    model: "gpt-3.5-turbo-1106",
    messages: conversation,
  });
  const secondResponseMessage = secondResponse.choices[0].message;
  newResponses.push(secondResponseMessage);
  conversation.push(secondResponseMessage);

  // Keep for server logs
  console.log("==================== Messages:");
  console.log("Previous Message:");
  console.log(previousMessage);
  console.log("\nUser Message:");
  console.log(userMessage);
  console.log("\nSystem Message Context:");
  console.log(context);
  console.log("\nAgent Response:");
  console.log(newResponses);

  conversation.shift(); // Remove system message

  return conversation;
}

export function getLatestMessageText(conversation: Conversation): string {
  const assistantContent = conversation.slice(-1)[0].content;

  if (typeof assistantContent !== "string") {
    throw new Error("Chat result content is not string");
  }

  return assistantContent;
}

export function getLatestMessage(
  conversation: Conversation,
): ChatCompletionMessageParam {
  return conversation.slice(-1)[0];
}

function getLatestUserMessage(
  conversation: Conversation,
): ChatCompletionUserMessageParam | undefined {
  const userMessages = conversation.filter(
    (message): message is ChatCompletionUserMessageParam =>
      message.role === "user",
  );
  return userMessages.length > 0 ? userMessages.slice(-1)[0] : undefined;
}

function isAssistantMessage(
  message: ChatCompletionMessageParam,
): message is ChatCompletionAssistantMessageParam {
  return message.role === "assistant";
}

export function getToolCalls(message: ChatCompletionMessageParam) {
  return isAssistantMessage(message) ? message.tool_calls : undefined;
}
