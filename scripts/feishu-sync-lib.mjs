import { readFile } from "node:fs/promises";

const requiredEnvVars = ["FEISHU_APP_ID", "FEISHU_APP_SECRET"];

export const getFeishuConfig = (env = process.env) => {
  const missing = requiredEnvVars.filter((key) => !env[key]);
  const hasTarget = env.FEISHU_FOLDER_TOKEN || env.FEISHU_TARGET_DOCUMENT_URL;
  if (missing.length) {
    throw new Error(`缺少飞书配置：${missing.join(", ")}`);
  }
  if (!hasTarget) {
    throw new Error("缺少飞书配置：FEISHU_FOLDER_TOKEN or FEISHU_TARGET_DOCUMENT_URL");
  }

  return {
    appId: env.FEISHU_APP_ID,
    appSecret: env.FEISHU_APP_SECRET,
    folderToken: env.FEISHU_FOLDER_TOKEN,
    targetDocumentUrl: env.FEISHU_TARGET_DOCUMENT_URL
  };
};

export const extractFeishuTokenFromUrl = (value) => {
  const url = new URL(value);
  const match = url.pathname.match(/\/(wiki|docx|docs|drive\/folder)\/([^/?#]+)/);
  if (!match) throw new Error("无法从飞书链接中提取 token");
  const [, rawType, token] = match;
  return {
    type: rawType === "drive/folder" ? "folder" : rawType,
    token
  };
};

export const parseDotEnv = (text) =>
  Object.fromEntries(
    text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"))
      .map((line) => {
        const separator = line.indexOf("=");
        if (separator === -1) return [line, ""];
        const key = line.slice(0, separator).trim();
        const value = line.slice(separator + 1).trim().replace(/^["']|["']$/g, "");
        return [key, value];
      })
  );

export const loadEnvFile = async (filePath) => {
  try {
    return parseDotEnv(await readFile(filePath, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return {};
    throw error;
  }
};

const splitLongText = (text, maxBlockChars) => {
  if (text.length <= maxBlockChars) return [text];
  const parts = [];
  for (let index = 0; index < text.length; index += maxBlockChars) {
    parts.push(text.slice(index, index + maxBlockChars));
  }
  return parts;
};

export const textBlock = (content) => ({
  block_type: 2,
  text: {
    elements: [
      {
        text_run: {
          content
        }
      }
    ]
  }
});

const richTextBlock = (blockType, field, content) => ({
  block_type: blockType,
  [field]: {
    elements: [
      {
        text_run: {
          content: content
            .replaceAll(/\*\*([^*]+)\*\*/g, "$1")
            .replaceAll(/`([^`]+)`/g, "$1")
        }
      }
    ]
  }
});

const headingBlock = (level, content) => {
  const normalizedLevel = Math.min(Math.max(level, 1), 9);
  return richTextBlock(normalizedLevel + 2, `heading${normalizedLevel}`, content);
};

const bulletBlock = (content) => richTextBlock(12, "bullet", content);
const orderedBlock = (content) => richTextBlock(13, "ordered", content);
const codeBlock = (content) => richTextBlock(14, "code", content);
const quoteBlock = (content) => richTextBlock(15, "quote", content);

const pushSplitTextBlocks = (blocks, content, maxBlockChars) => {
  splitLongText(content, maxBlockChars).forEach((part) => blocks.push(textBlock(part)));
};

export const markdownToFeishuBlocks = (markdown, options = {}) => {
  const maxBlockChars = options.maxBlockChars || 1800;
  const blocks = [];
  let paragraph = [];
  let codeLines = null;

  const flush = () => {
    const content = paragraph.join("\n").trim();
    paragraph = [];
    if (!content) return;
    pushSplitTextBlocks(blocks, content, maxBlockChars);
  };

  for (const rawLine of markdown.replaceAll("\r\n", "\n").split("\n")) {
    const trimmed = rawLine.trim();

    if (trimmed.startsWith("```")) {
      if (codeLines) {
        blocks.push(codeBlock(codeLines.join("\n")));
        codeLines = null;
      } else {
        flush();
        codeLines = [];
      }
      continue;
    }

    if (codeLines) {
      codeLines.push(rawLine);
      continue;
    }

    if (!trimmed) {
      flush();
      continue;
    }

    const heading = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      flush();
      blocks.push(headingBlock(heading[1].length, heading[2]));
      continue;
    }

    const bullet = trimmed.match(/^-\s+(.+)$/);
    if (bullet) {
      flush();
      blocks.push(bulletBlock(bullet[1]));
      continue;
    }

    const ordered = trimmed.match(/^\d+\.\s+(.+)$/);
    if (ordered) {
      flush();
      blocks.push(orderedBlock(ordered[1]));
      continue;
    }

    const quote = trimmed.match(/^>\s?(.+)$/);
    if (quote) {
      flush();
      blocks.push(quoteBlock(quote[1]));
      continue;
    }

    paragraph.push(trimmed);
  }

  if (codeLines) blocks.push(codeBlock(codeLines.join("\n")));
  flush();
  return blocks;
};

export const markdownToTextBlocks = markdownToFeishuBlocks;

export const createFeishuClient = ({ fetchImpl = fetch, baseUrl = "https://open.feishu.cn/open-apis" } = {}) => {
  const request = async (path, { method = "GET", token, body } = {}) => {
    const response = await fetchImpl(`${baseUrl}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      ...(body ? { body: JSON.stringify(body) } : {})
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload.code) {
      throw new Error(payload.msg || `飞书 API 请求失败：${method} ${path}`);
    }
    return payload;
  };

  return {
    getTenantAccessToken: async ({ appId, appSecret }) => {
      const payload = await request("/auth/v3/tenant_access_token/internal", {
        method: "POST",
        body: {
          app_id: appId,
          app_secret: appSecret
        }
      });
      return payload.tenant_access_token;
    },

    createDocument: async ({ token, folderToken, title }) => {
      const payload = await request("/docx/v1/documents", {
        method: "POST",
        token,
        body: {
          folder_token: folderToken,
          title
        }
      });
      return payload.data.document;
    },

    getDocument: async ({ token, documentId }) => {
      const payload = await request(`/docx/v1/documents/${documentId}`, {
        token
      });
      return payload.data.document;
    },

    getWikiNode: async ({ token, nodeToken }) => {
      const payload = await request(
        `/wiki/v2/spaces/get_node?token=${encodeURIComponent(nodeToken)}&obj_type=wiki`,
        {
          token
        }
      );
      return payload.data.node;
    },

    createWikiNode: async ({ token, spaceId, parentNodeToken, title }) => {
      const payload = await request(`/wiki/v2/spaces/${spaceId}/nodes`, {
        method: "POST",
        token,
        body: {
          obj_type: "docx",
          node_type: "origin",
          parent_node_token: parentNodeToken,
          title
        }
      });
      return payload.data.node;
    },

    createBlockChildren: async ({ token, documentId, blockId, revisionId, children }) => {
      const query = revisionId ? `?document_revision_id=${encodeURIComponent(revisionId)}` : "";
      const payload = await request(`/docx/v1/documents/${documentId}/blocks/${blockId}/children${query}`, {
        method: "POST",
        token,
        body: {
          index: -1,
          children
        }
      });
      return payload.data;
    },

    getBlockChildren: async ({ token, documentId, blockId, pageToken }) => {
      const query = pageToken ? `?page_token=${encodeURIComponent(pageToken)}` : "";
      const payload = await request(`/docx/v1/documents/${documentId}/blocks/${blockId}/children${query}`, {
        token
      });
      return payload.data;
    },

    deleteBlockChildren: async ({ token, documentId, blockId, revisionId, startIndex, endIndex }) => {
      const query = revisionId ? `?document_revision_id=${encodeURIComponent(revisionId)}` : "";
      const payload = await request(`/docx/v1/documents/${documentId}/blocks/${blockId}/children/batch_delete${query}`, {
        method: "DELETE",
        token,
        body: {
          start_index: startIndex,
          end_index: endIndex
        }
      });
      return payload.data;
    }
  };
};
