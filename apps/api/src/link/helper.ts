export async function isURLReachable(urlString: string): Promise<boolean> {
  try {
    const url = new URL(urlString);
    const response: Response = await fetch(url, {
      method: "HEAD",
      signal: AbortSignal.timeout(5000), // 5 seconds timeout
    });

    return response.ok;
  } catch (_error) {
    return false;
  }
}

interface TextNode {
  type: string;
  text?: string;
  content?: TextNode[];
  attrs?: {
    level?: number;
    [key: string]: unknown;
  };
}

export function extractTextFromNotes(notes: TextNode | null): string {
  if (!notes) return "";

  const text: string[] = [];

  // If the node has direct text, add it
  if (notes.text) {
    text.push(notes.text);
  }

  // Recursively process content array if it exists
  if (notes.content && Array.isArray(notes.content)) {
    for (const node of notes.content) {
      text.push(extractTextFromNotes(node));
    }
  }

  return text.join(" ").trim();
}

export async function convertTextToEmbeddings(text: string) {
  const req = await fetch("http://localhost:11434/api/embeddings", {
    method: "POST",
    body: JSON.stringify({
      model: "jina/jina-embeddings-v2-base-en",
      prompt: text,
    }),
  });
  const responseData = await req.json();
  return responseData.embedding;
}
