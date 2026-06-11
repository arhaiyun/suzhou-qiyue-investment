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

const chunk = (items, size) => {
  const chunks = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
};

const writeBlocks = async ({ client, token, documentId, blocks }) => {
  for (const children of chunk(blocks, 50)) {
    await client.createBlockChildren({
      token,
      documentId,
      blockId: documentId,
      children
    });
  }
};

const readMarkdown = (relativePath) => readFile(path.join(root, relativePath), "utf8");

const main = async () => {
  const envFromFile = await loadEnvFile(path.join(root, ".env"));
  const config = getFeishuConfig({ ...process.env, ...envFromFile });
  if (!config.targetDocumentUrl) {
    throw new Error("需要 FEISHU_TARGET_DOCUMENT_URL 指向作为父级目录的 Wiki 文档");
  }

  const client = createFeishuClient();
  const token = await client.getTenantAccessToken(config);
  const target = extractFeishuTokenFromUrl(config.targetDocumentUrl);
  if (target.type !== "wiki") {
    throw new Error("批量创建 Wiki 子文档需要 FEISHU_TARGET_DOCUMENT_URL 为 wiki 链接");
  }

  const parent = await client.getWikiNode({ token, nodeToken: target.token });
  const docs = [
    {
      id: "feishu-original-input",
      title: "01 原始输入清单",
      path: "docs/source-materials/project-workflow-input-original.md"
    },
    {
      id: "feishu-expert-answers",
      title: "02 项目问题专家解答",
      path: "04-operations/smart-emotional-companion-pendant-expert-review.md"
    },
    {
      id: "feishu-professional-business-plan",
      title: "03 专业商业计划书",
      path: "03-business-plans/smart-emotional-companion-pendant-professional-business-plan.md"
    }
  ];

  const results = [];
  for (const doc of docs) {
    const markdown = await readMarkdown(doc.path);
    const node = await client.createWikiNode({
      token,
      spaceId: parent.space_id,
      parentNodeToken: parent.node_token,
      title: doc.title
    });
    await writeBlocks({
      client,
      token,
      documentId: node.obj_token,
      blocks: markdownToFeishuBlocks(markdown)
    });
    const url = `https://my.feishu.cn/wiki/${node.node_token}`;
    results.push({
      ...doc,
      nodeToken: node.node_token,
      documentId: node.obj_token,
      url,
      syncedAt: new Date().toISOString()
    });
    console.log(`已创建：${doc.title} ${url}`);
  }

  await writeFile(
    path.join(root, "data/feishu-wiki-docs.json"),
    `${JSON.stringify(results, null, 2)}\n`
  );
};

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
