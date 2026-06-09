# 苏州启樾投资有限公司经营操作系统

本项目用于长期管理 **苏州启樾投资有限公司** 的创业项目、商业计划、初始想法、成熟经营方案、运营事项、员工关系与社会关系。它不是普通资料夹，而是一个轻量化 Business Operating System：文档负责沉淀判断，数据负责驱动看板，前端负责日常查看和推进。

## 本地查看

```bash
npm run serve
```

默认打开 <http://localhost:4186>。如果只想启动服务：

```bash
npm run serve:only
```

运行项目契约测试：

```bash
npm test
```

## 目录结构

| 路径 | 用途 |
| --- | --- |
| `index.html` | 公司经营看板入口 |
| `assets/` | 前端样式与交互脚本 |
| `data/` | 驱动看板的结构化经营数据 |
| `00-inbox/` | 初始想法、临时记录、待归类事项 |
| `01-company/` | 公司定位、业务边界、组织原则、利益相关方 |
| `02-ventures/` | 创业项目与项目立项材料 |
| `03-business-plans/` | 商业计划书草案、成熟方案、对外版 BP |
| `04-operations/` | 经营节奏、目标管理、风险清单、决策日志 |
| `05-relationships/` | 员工、合作伙伴、社会关系和关键联系人维护 |
| `06-meetings/` | 会议纪要、复盘记录、行动项 |
| `templates/` | 可复制使用的经营文档模板 |
| `99-archive/` | 归档内容 |

## 使用原则

1. **先进入 inbox**：未经筛选的想法先写入 `00-inbox/ideas.md` 或 `data/ideas.json`。
2. **再转为项目**：当想法有明确客户、问题、方案假设和下一步时，进入 `02-ventures/`，并同步更新 `data/ventures.json`。
3. **商业计划分版本**：内部推演、成熟方案、对外 BP 分开管理，避免混用。
4. **经营动作可追踪**：重要会议、决策、风险和行动项分别沉淀到对应目录和数据文件。
5. **关系维护有节奏**：员工、合作伙伴、政府/机构和社会关系都记录维护节奏，不把关系资产变成散乱记忆。
6. **敏感信息不上库**：身份证号、手机号、合同金额、私密关系细节、真实个人隐私和未公开商业机密只写占位说明。

## 数据更新方式

- 更新看板展示内容：编辑 `data/*.json`。
- 新增项目：复制 `templates/venture-brief.md` 到 `02-ventures/<project-name>.md`，再更新 `data/ventures.json`。
- 新增商业计划：复制 `templates/business-plan.md` 到 `03-business-plans/<plan-name>.md`，再更新 `data/business-plans.json`。
- 记录会议：复制 `templates/meeting-notes.md` 到 `06-meetings/YYYY-MM-DD-topic.md`。
- 记录关系维护：复制 `templates/relationship-note.md` 到 `05-relationships/<name-or-org>.md`。

## 初始边界

当前版本以“早期创业公司经营管理”为主，不接入数据库、不做账号系统、不保存真实隐私。后续如果经营数据稳定，可以再扩展为 CRM、项目管理系统、BP 生成器或内部知识库应用。
