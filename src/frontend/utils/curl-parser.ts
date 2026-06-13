import type { HttpMethod } from "../../shared/types";

export type ParsedCurl = {
  url: string;
  method: HttpMethod;
  headers: Record<string, string>;
  body: string | null;
  body_type: "json" | "raw";
};

export class CurlParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CurlParseError";
  }
}

function unquote(value: string): string {
  if ((value.startsWith("'") && value.endsWith("'")) || (value.startsWith('"') && value.endsWith('"'))) {
    return value.slice(1, -1);
  }
  return value;
}

function mergeContinuationLines(input: string): string {
  return input.replace(/\\\n/g, " ").replace(/\\\r\n/g, " ");
}

export function parseCurl(raw: string): ParsedCurl {
  const cleaned = mergeContinuationLines(raw.trim());
  if (!cleaned.startsWith("curl")) {
    throw new CurlParseError("不是有效的 curl 命令");
  }

  const tokens = tokenize(cleaned);
  let url = "";
  let method: HttpMethod | null = null;
  const headers: Record<string, string> = {};
  let body: string | null = null;
  let hasData = false;

  let i = 1; // skip "curl"
  while (i < tokens.length) {
    const token = tokens[i];

    if (token === "-X" || token === "--request") {
      i++;
      if (i >= tokens.length) throw new CurlParseError("缺少 -X 参数值");
      method = unquote(tokens[i]).toUpperCase() as HttpMethod;
    } else if (token === "-H" || token === "--header") {
      i++;
      if (i >= tokens.length) throw new CurlParseError("缺少 -H 参数值");
      const header = unquote(tokens[i]);
      const colonIndex = header.indexOf(":");
      if (colonIndex > 0) {
        const key = header.slice(0, colonIndex).trim();
        const value = header.slice(colonIndex + 1).trim();
        headers[key] = value;
      }
    } else if (token === "-d" || token === "--data" || token === "--data-raw" || token === "--data-binary") {
      i++;
      if (i >= tokens.length) throw new CurlParseError("缺少 -d 参数值");
      body = unquote(tokens[i]);
      hasData = true;
    } else if (token === "--url") {
      i++;
      if (i >= tokens.length) throw new CurlParseError("缺少 --url 参数值");
      url = unquote(tokens[i]);
    } else if (token === "--get") {
      method = "GET";
    } else if (!token.startsWith("-") && !url) {
      url = unquote(token);
    }

    i++;
  }

  if (!url) {
    throw new CurlParseError("未找到 URL");
  }

  if (!method) {
    method = hasData ? "POST" : "GET";
  }

  const body_type = body && isJsonString(body) ? "json" : "raw";

  return { url, method, headers, body, body_type };
}

function tokenize(input: string): string[] {
  const tokens: string[] = [];
  let current = "";
  let inSingleQuote = false;
  let inDoubleQuote = false;

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];

    if (inSingleQuote) {
      if (ch === "'") {
        inSingleQuote = false;
        tokens.push(current);
        current = "";
      } else {
        current += ch;
      }
    } else if (inDoubleQuote) {
      if (ch === '"') {
        inDoubleQuote = false;
        tokens.push(current);
        current = "";
      } else if (ch === "\\" && i + 1 < input.length) {
        current += input[++i];
      } else {
        current += ch;
      }
    } else if (ch === "'") {
      inSingleQuote = true;
      current = "";
    } else if (ch === '"') {
      inDoubleQuote = true;
      current = "";
    } else if (ch === " " || ch === "\t") {
      if (current) {
        tokens.push(current);
        current = "";
      }
    } else {
      current += ch;
    }
  }

  if (current) {
    tokens.push(current);
  }

  return tokens;
}

function isJsonString(value: string): boolean {
  try {
    JSON.parse(value);
    return true;
  } catch {
    return false;
  }
}
