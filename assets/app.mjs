const dataSources = {
  company: "data/company.json",
  ventures: "data/ventures.json",
  plans: "data/business-plans.json",
  ideas: "data/ideas.json",
  relationships: "data/relationships.json",
  tasks: "data/tasks.json",
  decisions: "data/decisions.json",
  documents: "data/documents.json"
};

const views = ["Dashboard", "创业项目", "商业计划", "项目文档", "想法池", "运营节奏", "关系维护", "会议决策"];

const state = {
  activeView: "Dashboard",
  activeDocumentId: null,
  data: null
};

const app = document.querySelector("#app");

const escapeHtml = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

const badge = (label, tone = "neutral") => `<span class="badge badge-${tone}">${escapeHtml(label)}</span>`;

const renderInlineMarkdown = (value) =>
  escapeHtml(value)
    .replaceAll(/`([^`]+)`/g, "<code>$1</code>")
    .replaceAll(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");

const isTableSeparator = (line) => /^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?$/.test(line);

const splitTableRow = (line) =>
  line
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());

const renderMarkdown = (markdown) => {
  const lines = markdown.replaceAll("\r\n", "\n").split("\n");
  const html = [];
  let index = 0;

  const isBlockStart = (line, nextLine = "") =>
    /^#{1,4}\s+/.test(line) ||
    /^-\s+/.test(line) ||
    /^\d+\.\s+/.test(line) ||
    /^>\s?/.test(line) ||
    (line.trim().startsWith("|") && isTableSeparator(nextLine));

  while (index < lines.length) {
    const line = lines[index].trim();
    const nextLine = lines[index + 1]?.trim() || "";

    if (!line) {
      index += 1;
      continue;
    }

    if (line.startsWith("#### ")) {
      html.push(`<h4>${renderInlineMarkdown(line.slice(5))}</h4>`);
      index += 1;
      continue;
    }

    if (line.startsWith("### ")) {
      html.push(`<h3>${renderInlineMarkdown(line.slice(4))}</h3>`);
      index += 1;
      continue;
    }

    if (line.startsWith("## ")) {
      html.push(`<h2>${renderInlineMarkdown(line.slice(3))}</h2>`);
      index += 1;
      continue;
    }

    if (line.startsWith("# ")) {
      html.push(`<h1>${renderInlineMarkdown(line.slice(2))}</h1>`);
      index += 1;
      continue;
    }

    if (line.startsWith(">")) {
      const quote = [];
      while (index < lines.length && lines[index].trim().startsWith(">")) {
        quote.push(lines[index].trim().replace(/^>\s?/, ""));
        index += 1;
      }
      html.push(`<blockquote>${quote.map(renderInlineMarkdown).join("<br>")}</blockquote>`);
      continue;
    }

    if (line.startsWith("|") && isTableSeparator(nextLine)) {
      const header = splitTableRow(line);
      index += 2;
      const rows = [];
      while (index < lines.length && lines[index].trim().startsWith("|")) {
        rows.push(splitTableRow(lines[index].trim()));
        index += 1;
      }
      html.push(`
        <div class="doc-table-wrap">
          <table>
            <thead><tr>${header.map((cell) => `<th>${renderInlineMarkdown(cell)}</th>`).join("")}</tr></thead>
            <tbody>
              ${rows.map((row) => `<tr>${row.map((cell) => `<td>${renderInlineMarkdown(cell)}</td>`).join("")}</tr>`).join("")}
            </tbody>
          </table>
        </div>
      `);
      continue;
    }

    if (line.startsWith("- ")) {
      const items = [];
      while (index < lines.length && lines[index].trim().startsWith("- ")) {
        items.push(lines[index].trim().slice(2));
        index += 1;
      }
      html.push(`<ul>${items.map((item) => `<li>${renderInlineMarkdown(item)}</li>`).join("")}</ul>`);
      continue;
    }

    if (/^\d+\.\s+/.test(line)) {
      const items = [];
      while (index < lines.length && /^\d+\.\s+/.test(lines[index].trim())) {
        items.push(lines[index].trim().replace(/^\d+\.\s+/, ""));
        index += 1;
      }
      html.push(`<ol>${items.map((item) => `<li>${renderInlineMarkdown(item)}</li>`).join("")}</ol>`);
      continue;
    }

    const paragraph = [];
    while (index < lines.length) {
      const current = lines[index].trim();
      const following = lines[index + 1]?.trim() || "";
      if (!current || isBlockStart(current, following)) break;
      paragraph.push(current);
      index += 1;
    }
    html.push(`<p>${renderInlineMarkdown(paragraph.join(" "))}</p>`);
  }

  return html.join("");
};

const renderList = (items) => `
  <ul class="clean-list">
    ${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
  </ul>
`;

const sectionHeader = (eyebrow, title, summary) => `
  <div class="section-header">
    <span>${escapeHtml(eyebrow)}</span>
    <h2>${escapeHtml(title)}</h2>
    <p>${escapeHtml(summary)}</p>
  </div>
`;

const metricCard = (metric) => `
  <article class="metric">
    <span>${escapeHtml(metric.label)}</span>
    <strong>${escapeHtml(metric.value)}</strong>
    <p>${escapeHtml(metric.note)}</p>
  </article>
`;

const taskCard = (task) => `
  <article class="task-row">
    <div>
      <strong>${escapeHtml(task.title)}</strong>
      <p>${escapeHtml(task.context)}</p>
    </div>
    <div class="task-meta">
      ${badge(task.status, task.status === "推进中" ? "active" : "neutral")}
      <span>${escapeHtml(task.owner)}</span>
      <span>${escapeHtml(task.due)}</span>
    </div>
  </article>
`;

const renderDashboard = ({ company, tasks, ventures, plans, decisions }) => `
  <section class="hero">
    <div>
      <span class="kicker">Business Operating System</span>
      <h1>${escapeHtml(company.name)}</h1>
      <p>${escapeHtml(company.positioning)}</p>
      <div class="hero-actions">
        ${company.focusAreas.map((item) => badge(item, "active")).join("")}
      </div>
    </div>
    <aside class="command-panel">
      <span>当前经营重点</span>
      <strong>${escapeHtml(company.currentPriority)}</strong>
      <p>${escapeHtml(company.operatingPrinciple)}</p>
    </aside>
  </section>

  <section class="metrics-grid">
    ${company.metrics.map(metricCard).join("")}
  </section>

  <section class="split-grid">
    <div class="panel">
      ${sectionHeader("Portfolio", "创业项目组合", "按阶段跟踪项目假设、风险和下一步动作。")}
      <div class="compact-stack">
        ${ventures.slice(0, 3).map((venture) => `
          <article class="compact-item">
            <div>
              <strong>${escapeHtml(venture.name)}</strong>
              <p>${escapeHtml(venture.problem)}</p>
            </div>
            ${badge(venture.stage, "active")}
          </article>
        `).join("")}
      </div>
    </div>
    <div class="panel">
      ${sectionHeader("Execution", "近期行动项", "每天打开看板时优先处理的经营动作。")}
      <div class="task-stack">
        ${tasks.slice(0, 4).map(taskCard).join("")}
      </div>
    </div>
  </section>

  <section class="split-grid">
    <div class="panel">
      ${sectionHeader("BP", "商业计划成熟度", "区分内部推演、成熟方案和对外版本。")}
      <div class="compact-stack">
        ${plans.map((plan) => `
          <article class="compact-item">
            <div>
              <strong>${escapeHtml(plan.name)}</strong>
              <p>${escapeHtml(plan.audience)} · ${escapeHtml(plan.nextMilestone)}</p>
            </div>
            ${badge(plan.maturity, "neutral")}
          </article>
        `).join("")}
      </div>
    </div>
    <div class="panel">
      ${sectionHeader("Decision", "最近决策", "保留关键判断的背景、选项和后续复盘点。")}
      <div class="compact-stack">
        ${decisions.slice(0, 3).map((decision) => `
          <article class="compact-item">
            <div>
              <strong>${escapeHtml(decision.title)}</strong>
              <p>${escapeHtml(decision.rationale)}</p>
            </div>
            <span class="date">${escapeHtml(decision.date)}</span>
          </article>
        `).join("")}
      </div>
    </div>
  </section>
`;

const renderVentures = ({ ventures }) => `
  ${sectionHeader("Ventures", "创业项目", "从机会识别到商业化验证，每个项目都追踪问题、客户、方案、里程碑和风险。")}
  <section class="card-grid">
    ${ventures.map((venture) => `
      <article class="work-card">
        <div class="card-topline">
          ${badge(venture.stage, "active")}
          <span>${escapeHtml(venture.owner)}</span>
        </div>
        <h3>${escapeHtml(venture.name)}</h3>
        <p>${escapeHtml(venture.problem)}</p>
        <dl>
          <div><dt>目标客户</dt><dd>${escapeHtml(venture.customer)}</dd></div>
          <div><dt>商业模式</dt><dd>${escapeHtml(venture.model)}</dd></div>
          <div><dt>下一步</dt><dd>${escapeHtml(venture.nextAction)}</dd></div>
        </dl>
        <div class="risk-line">${escapeHtml(venture.keyRisk)}</div>
      </article>
    `).join("")}
  </section>
`;

const renderPlans = ({ plans }) => `
  ${sectionHeader("Business Plan", "商业计划", "按用途、受众和成熟度管理 BP，不让草案、内部方案和对外材料混在一起。")}
  <section class="table-panel">
    <div class="data-table">
      <div class="table-head">名称</div>
      <div class="table-head">受众</div>
      <div class="table-head">成熟度</div>
      <div class="table-head">下一里程碑</div>
      ${plans.map((plan) => `
        <div><strong>${escapeHtml(plan.name)}</strong><p>${escapeHtml(plan.purpose)}</p></div>
        <div>${escapeHtml(plan.audience)}</div>
        <div>${badge(plan.maturity, plan.maturity === "成熟版" ? "active" : "neutral")}</div>
        <div>${escapeHtml(plan.nextMilestone)}</div>
      `).join("")}
    </div>
  </section>
`;

const renderDocuments = ({ documents }) => {
  const activeDocument =
    documents.find((document) => document.id === state.activeDocumentId) ||
    documents[0];

  return `
    ${sectionHeader("Documents", "项目文档", "把 Markdown 项目材料转成适合浏览、复盘和对外沟通前检查的阅读版。")}
    <section class="documents-view">
      <aside class="document-list">
        ${documents.map((document) => `
          <button class="${activeDocument.id === document.id ? "active" : ""}" data-document-id="${escapeHtml(document.id)}">
            <span>${escapeHtml(document.category)}</span>
            <strong>${escapeHtml(document.title)}</strong>
            <p>${escapeHtml(document.summary)}</p>
          </button>
        `).join("")}
      </aside>
      <article class="document-reader">
        <div class="document-meta">
          ${badge(activeDocument.category, "active")}
          <span>${escapeHtml(activeDocument.path)}</span>
        </div>
        <div class="markdown-body">
          ${renderMarkdown(activeDocument.content || "")}
        </div>
      </article>
    </section>
  `;
};

const renderIdeas = ({ ideas }) => `
  ${sectionHeader("Inbox", "想法池", "先记录，再筛选。只有通过客户、场景、收益和可执行性检查的想法才进入项目。")}
  <section class="card-grid">
    ${ideas.map((idea) => `
      <article class="work-card">
        <div class="card-topline">
          ${badge(idea.status, idea.status === "待评估" ? "neutral" : "active")}
          <span>${escapeHtml(idea.source)}</span>
        </div>
        <h3>${escapeHtml(idea.title)}</h3>
        <p>${escapeHtml(idea.description)}</p>
        <dl>
          <div><dt>验证问题</dt><dd>${escapeHtml(idea.validationQuestion)}</dd></div>
          <div><dt>下一动作</dt><dd>${escapeHtml(idea.nextStep)}</dd></div>
        </dl>
      </article>
    `).join("")}
  </section>
`;

const renderOperations = ({ company, tasks, decisions }) => `
  ${sectionHeader("Operations", "运营节奏", "把公司经营从灵感驱动转为节奏驱动：周推进、月复盘、季度校准。")}
  <section class="split-grid">
    <div class="panel">
      <h3>经营节奏</h3>
      ${renderList(company.operatingCadence)}
    </div>
    <div class="panel">
      <h3>风险关注</h3>
      ${renderList(company.riskWatchlist)}
    </div>
  </section>
  <section class="panel">
    <h3>行动项</h3>
    <div class="task-stack">
      ${tasks.map(taskCard).join("")}
    </div>
  </section>
  <section class="panel">
    <h3>决策复盘点</h3>
    <div class="compact-stack">
      ${decisions.map((decision) => `
        <article class="compact-item">
          <div>
            <strong>${escapeHtml(decision.title)}</strong>
            <p>${escapeHtml(decision.reviewTrigger)}</p>
          </div>
          <span class="date">${escapeHtml(decision.date)}</span>
        </article>
      `).join("")}
    </div>
  </section>
`;

const renderRelationships = ({ relationships }) => `
  ${sectionHeader("Relationships", "关系维护", "把员工、合作伙伴和社会关系作为长期经营资产管理，记录节奏而不是堆联系人。")}
  <section class="card-grid">
    ${relationships.map((relationship) => `
      <article class="work-card">
        <div class="card-topline">
          ${badge(relationship.category, "active")}
          <span>${escapeHtml(relationship.followUpRhythm)}</span>
        </div>
        <h3>${escapeHtml(relationship.name)}</h3>
        <p>${escapeHtml(relationship.context)}</p>
        <dl>
          <div><dt>维护目标</dt><dd>${escapeHtml(relationship.objective)}</dd></div>
          <div><dt>下一次触达</dt><dd>${escapeHtml(relationship.nextTouch)}</dd></div>
        </dl>
      </article>
    `).join("")}
  </section>
`;

const renderMeetings = ({ decisions, tasks }) => `
  ${sectionHeader("Meetings", "会议决策", "每次会议留下背景、判断、责任人和复盘点，让组织记忆可追踪。")}
  <section class="split-grid">
    <div class="panel">
      <h3>关键决策日志</h3>
      <div class="compact-stack">
        ${decisions.map((decision) => `
          <article class="compact-item">
            <div>
              <strong>${escapeHtml(decision.title)}</strong>
              <p>${escapeHtml(decision.rationale)}</p>
            </div>
            ${badge(decision.status, "neutral")}
          </article>
        `).join("")}
      </div>
    </div>
    <div class="panel">
      <h3>会议后行动</h3>
      <div class="task-stack">
        ${tasks.filter((task) => task.source === "会议").map(taskCard).join("")}
      </div>
    </div>
  </section>
`;

const renderMain = () => {
  const renderers = {
    Dashboard: renderDashboard,
    创业项目: renderVentures,
    商业计划: renderPlans,
    项目文档: renderDocuments,
    想法池: renderIdeas,
    运营节奏: renderOperations,
    关系维护: renderRelationships,
    会议决策: renderMeetings
  };

  return renderers[state.activeView](state.data);
};

const renderShell = () => {
  const { company } = state.data;
  app.innerHTML = `
    <div class="layout">
      <aside class="sidebar">
        <div class="brand">
          <span>启樾</span>
          <div>
            <strong>${escapeHtml(company.shortName)}</strong>
            <p>经营操作系统</p>
          </div>
        </div>
        <nav>
          ${views.map((view) => `
            <button class="${state.activeView === view ? "active" : ""}" data-view="${escapeHtml(view)}">
              ${escapeHtml(view)}
            </button>
          `).join("")}
        </nav>
        <div class="sidebar-footer">
          <span>信息安全</span>
          <p>真实隐私、合同金额、未公开商业机密仅使用占位说明。</p>
        </div>
      </aside>
      <main>
        ${renderMain()}
      </main>
    </div>
  `;

  app.querySelectorAll("[data-view]").forEach((button) => {
    button.addEventListener("click", () => {
      state.activeView = button.dataset.view;
      renderShell();
    });
  });

  app.querySelectorAll("[data-document-id]").forEach((button) => {
    button.addEventListener("click", () => {
      state.activeDocumentId = button.dataset.documentId;
      renderShell();
    });
  });
};

const loadData = async () => {
  const entries = await Promise.all(
    Object.entries(dataSources).map(async ([key, url]) => {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`无法读取 ${url}`);
      return [key, await response.json()];
    })
  );
  state.data = Object.fromEntries(entries);
  state.data.documents = await Promise.all(
    state.data.documents.map(async (document) => {
      const response = await fetch(document.path);
      if (!response.ok) throw new Error(`无法读取 ${document.path}`);
      return { ...document, content: await response.text() };
    })
  );
  state.activeDocumentId = state.data.documents[0]?.id || null;
  renderShell();
};

app.innerHTML = `<div class="loading">正在加载启樾经营看板...</div>`;
loadData().catch((error) => {
  app.innerHTML = `
    <div class="error-state">
      <h1>经营看板加载失败</h1>
      <p>${escapeHtml(error.message)}</p>
    </div>
  `;
});
