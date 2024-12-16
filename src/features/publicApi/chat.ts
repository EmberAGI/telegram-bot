import z from "zod";
import { getEmberTGUrl } from "../../common/settings";

const ChatEmberResponse = z.object({
  status: z.union([
    z.literal("done"),
    z.literal("processing"),
    z.literal("error"),
  ]),
  message: z.string(),
  suggestions: z.array(z.string()).nullish(),
});

interface ChatResponse {
  message: string;
  suggestions?: string[];
}

export default async function (
  senderUid: string,
  message: string,
  isGroup: boolean,
  username: string | undefined,
  onActivity: (message: string) => void,
): Promise<ChatResponse> {
  const response = await fetch(`${getEmberTGUrl()}/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      user_id: senderUid,
      message,
      is_group: isGroup,
      username,
    }),
  });

  if (!response.ok || response.body == null) {
    throw new Error("Failed to connect to Ember server");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  while (true) {
    const { done, value } = await reader.read();
    const { event, rawData } = parseSseResponse(decoder.decode(value));
    console.log("=== event ===", event);
    console.log("=== rawData ===", rawData);
    if (done && event !== "done") {
      throw new Error("Invalid response");
    }

    if (rawData == null) {
      continue;
    }

    const data = await ChatEmberResponse.safeParseAsync(JSON.parse(rawData));
    if (!data.success) {
      throw new Error("Invalid response");
    }
    const response = data.data;
    const chatResponse: ChatResponse = {
      message: response.message,
      suggestions: response.suggestions ?? undefined,
    };

    switch (event) {
      case "done":
        return chatResponse;
      case "activity":
        onActivity(response.message);
        continue;
      case "error":
        chatResponse.message = `Error: ${response.message}`;
        return chatResponse;
      default:
        throw new Error("Invalid response");
    }
  }
}

function parseSseResponse(value: string) {
  console.log("=== value ===", value);
  const lines = value.split("\n");
  let event = undefined;
  let rawData = undefined;

  for (const line of lines) {
    if (line.startsWith("event: ")) {
      event = line.substring("event: ".length).trim();
    } else if (line.startsWith("data: ")) {
      rawData = line.substring("data: ".length);
    }
  }

  return { event, rawData };
}
