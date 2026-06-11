import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(new URL("..", import.meta.url).pathname);

test("feishu sync files and npm command are present", async () => {
  const packageJson = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));

  assert.equal(existsSync(path.join(root, "scripts/sync-feishu.mjs")), true);
  assert.equal(existsSync(path.join(root, "scripts/feishu-sync-lib.mjs")), true);
  assert.equal(existsSync(path.join(root, ".env.example")), true);
  assert.equal(existsSync(path.join(root, "data/feishu-docs.json")), true);
  assert.equal(packageJson.scripts["sync:feishu"], "node scripts/sync-feishu.mjs");
});

test("markdown is converted into styled Feishu blocks", async () => {
  const { markdownToFeishuBlocks } = await import("../scripts/feishu-sync-lib.mjs");
  const blocks = markdownToFeishuBlocks("# 标题\n\n## 二级标题\n\n正文\n\n- 动作一\n- 动作二\n\n> 关键判断");

  assert.equal(blocks[0].block_type, 3);
  assert.equal(blocks[0].heading1.elements[0].text_run.content, "标题");
  assert.equal(blocks[1].block_type, 4);
  assert.equal(blocks[1].heading2.elements[0].text_run.content, "二级标题");
  assert.ok(blocks.some((block) => block.block_type === 12 && block.bullet.elements[0].text_run.content === "动作一"));
  assert.ok(blocks.some((block) => block.block_type === 15 && block.quote.elements[0].text_run.content === "关键判断"));
});

test("long Feishu text blocks are split without losing style", async () => {
  const { markdownToFeishuBlocks } = await import("../scripts/feishu-sync-lib.mjs");
  const blocks = markdownToFeishuBlocks(`正文${"很长".repeat(12)}`, { maxBlockChars: 12 });

  assert.ok(blocks.length > 1);
  assert.ok(blocks.every((block) => block.block_type === 2));
  assert.ok(blocks.every((block) => block.text.elements[0].text_run.content.length <= 12));
});

test("required Feishu env vars are validated without leaking values", async () => {
  const { extractFeishuTokenFromUrl, getFeishuConfig } = await import("../scripts/feishu-sync-lib.mjs");

  assert.throws(
    () => getFeishuConfig({ FEISHU_APP_ID: "cli_xxx", FEISHU_APP_SECRET: "secret" }),
    /FEISHU_FOLDER_TOKEN or FEISHU_TARGET_DOCUMENT_URL/
  );

  assert.equal(
    getFeishuConfig({
      FEISHU_APP_ID: "cli_xxx",
      FEISHU_APP_SECRET: "secret",
      FEISHU_TARGET_DOCUMENT_URL: "https://my.feishu.cn/wiki/FoHtw2kvii9WYak9A5ScWfuknrg"
    }).targetDocumentUrl,
    "https://my.feishu.cn/wiki/FoHtw2kvii9WYak9A5ScWfuknrg"
  );

  assert.deepEqual(
    extractFeishuTokenFromUrl("https://my.feishu.cn/wiki/FoHtw2kvii9WYak9A5ScWfuknrg?x=1"),
    {
      type: "wiki",
      token: "FoHtw2kvii9WYak9A5ScWfuknrg"
    }
  );
});

test("Feishu client creates wiki docx nodes under a parent", async () => {
  const { createFeishuClient } = await import("../scripts/feishu-sync-lib.mjs");
  const calls = [];
  const client = createFeishuClient({
    baseUrl: "https://example.test",
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      return {
        ok: true,
        json: async () => ({
          code: 0,
          data: {
            node: {
              node_token: "wik_child",
              obj_token: "doc_child",
              obj_type: "docx",
              title: "新文档"
            }
          }
        })
      };
    }
  });

  const node = await client.createWikiNode({
    token: "tenant-token",
    spaceId: "space_1",
    parentNodeToken: "parent_node",
    title: "新文档"
  });

  assert.equal(node.obj_token, "doc_child");
  assert.equal(calls[0].url, "https://example.test/wiki/v2/spaces/space_1/nodes");
  assert.equal(calls[0].options.method, "POST");
  assert.deepEqual(JSON.parse(calls[0].options.body), {
    obj_type: "docx",
    node_type: "origin",
    parent_node_token: "parent_node",
    title: "新文档"
  });
});
