import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  createFeishuClient,
  extractFeishuTokenFromUrl,
  getFeishuConfig,
  loadEnvFile,
  markdownToFeishuBlocks
} from "./feishu-sync-lib.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const readJson = async (relativePath) =>
  JSON.parse(await readFile(path.join(root, relativePath), "utf8"));

const writeJson = async (relativePath, value) =>
  writeFile(path.join(root, relativePath), `${JSON.stringify(value, null, 2)}\n`);

const chunk = (items, size) => {
  const chunks = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
};

const main = async () => {
  const envFromFile = await loadEnvFile(path.join(root, ".env"));
  const config = getFeishuConfig({ ...process.env, ...envFromFile });
  const client = createFeishuClient();
  const token = await client.getTenantAccessToken(config);

  const documents = await readJson("data/documents.json");
  const mappings = await readJson("data/feishu-docs.json");
  const mappingById = new Map(mappings.map((mapping) => [mapping.id, mapping]));
  const nextMappings = [];
  let targetDocument = null;

  if (config.targetDocumentUrl) {
    const target = extractFeishuTokenFromUrl(config.targetDocumentUrl);
    if (target.type === "wiki") {
      const node = await client.getWikiNode({ token, nodeToken: target.token });
      targetDocument = {
        documentId: node.obj_token,
        url: config.targetDocumentUrl,
        sourceType: "wiki",
        nodeToken: target.token
      };
    } else if (target.type === "docx") {
      targetDocument = {
        documentId: target.token,
        url: config.targetDocumentUrl,
        sourceType: "docx"
      };
    } else {
      throw new Error("FEISHU_TARGET_DOCUMENT_URL 目前仅支持 wiki 或 docx 链接");
    }
  }

  for (const [index, document] of documents.entries()) {
    const markdown = await readFile(path.join(root, document.path), "utf8");
    const blocks = markdownToFeishuBlocks(markdown);
    const existing = mappingById.get(document.id);

    if (targetDocument && index > 0) {
      nextMappings.push(existing || {
        id: document.id,
        title: document.title,
        path: document.path,
        skipped: "FEISHU_TARGET_DOCUMENT_URL 仅用于测试写入第一份文档"
      });
      continue;
    }

    if (existing?.documentId && !targetDocument) {
      console.log(`跳过已存在文档：${document.title}`);
      nextMappings.push(existing);
      continue;
    }

    const remote = targetDocument || await client.createDocument({
      token,
      folderToken: config.folderToken,
      title: document.title
    });
    const documentId = remote.documentId || remote.document_id;
    const revisionId = remote.revision_id;

    if (targetDocument) {
      const rootChildren = await client.getBlockChildren({
        token,
        documentId,
        blockId: documentId
      });
      const childCount = rootChildren.items?.length || 0;
      if (childCount) {
        const latestDocument = await client.getDocument({ token, documentId });
        await client.deleteBlockChildren({
          token,
          documentId,
          blockId: documentId,
          revisionId: latestDocument.revision_id,
          startIndex: 0,
          endIndex: childCount
        });
      }
    }

    for (const children of chunk(blocks, 50)) {
      await client.createBlockChildren({
        token,
        documentId,
        blockId: documentId,
        revisionId,
        children
      });
    }

    const url = remote.url || `https://feishu.cn/docx/${documentId}`;
    nextMappings.push({
      id: document.id,
      title: document.title,
      path: document.path,
      documentId,
      url,
      sourceType: remote.sourceType || "docx",
      syncedAt: new Date().toISOString()
    });
    console.log(`${targetDocument ? "已写入测试飞书文档" : "已创建飞书文档"}：${document.title} ${url}`);
  }

  await writeJson("data/feishu-docs.json", nextMappings);
};

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
