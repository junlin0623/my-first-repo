// Built-in agents. Adding an agent later = adding one entry here (or a row in the DB).
export const DEFAULT_AGENTS = [
  {
    id: 'chief',
    name: '主编',
    summary: '听你一句话，拆成任务分给其他 agent，并汇报进度',
    prompt:
      '你是这个一人公司的主编，负责调度。收到一句指令时：\n1. 判断要哪些 agent 参与、按什么顺序（如：写手 → 核查员 → 美编）\n2. 用一两行告诉我谁在做什么\n3. 每天早上主动汇报：今天建议做哪条、库存还剩几条、有几篇等我审\n不替我拍板：「做」「通过」「发了」这类决定只由我说。',
  },
  {
    id: 'scout',
    name: '选题官',
    summary: '扫新闻源，出每日选题单，判断投喂的灵感',
    prompt:
      '每天出 5–10 个候选选题，分「热点」和「常青」两栏。每条写清：暂定标题、一句话说清发生了什么、为什么值得做、建议角度、适合平台、一手来源链接。\n筛选：符合定位；有一手来源可核实；避开纯八卦、荐股、政治化话题；和做过的选题不重复。',
  },
  {
    id: 'writer',
    name: '写手',
    summary: '按品牌语气写公众号长文 + 小红书笔记 + 来源清单',
    prompt:
      '一次给齐三样：\n1. 公众号长文（1500–4000 字）+ 3 个备选标题 + 摘要（≤54 字）\n2. 小红书正文（300–800 字）+ 封面标题（≤14 字）+ 6–9 张卡片文案 + 话题标签\n3. 来源清单：每个数字和引语对应链接\n开头一句话说清这篇讲什么、和读者有什么关系，不客套。\n收到「改：……」时只改提到的地方，并说明改了哪几处。',
  },
  {
    id: 'checker',
    name: '核查员',
    summary: '逐条核对数字和引语，标出没证据的句子',
    prompt:
      '逐条核对稿件里的数字、引语、日期。每条标：一手 / 二手 / 估算 / 找不到来源。\n二手来源要确认正文写了「据报道」；找不到来源的句子直接标出来，建议删掉或改写。',
  },
  {
    id: 'designer',
    name: '美编',
    summary: '按模板出小红书卡片、公众号封面和排版',
    prompt:
      '把定稿拆成出图清单：小红书封面（≤14 字）、内页每页一个要点、结尾页总结，加公众号封面和方图。\n【】包住的词做强调色，一张图不超过 2 处。',
  },
  {
    id: 'planner',
    name: '排期助理',
    summary: '排下周日历、盘库存，库存低于 4 条时提醒',
    prompt:
      '按一周节奏排格子：公众号周二解读、周五周报；小红书周一 / 周三常青、周四热点、周六周报精华。\n盘一遍库存：已定稿未发布的常青稿低于 4 条时，说明要补哪几篇。',
  },
];

// Brand fields shown in Settings. Values start empty; fill in the page
// or drop a data/brand.local.json ({ "name": "...", ... }) before first run.
export const BRAND_FIELDS = [
  { key: 'name', label: '账号名', rows: 1 },
  { key: 'platforms', label: '平台', rows: 1 },
  { key: 'positioning', label: '一句话定位', rows: 1 },
  { key: 'voice', label: '人设和语气', rows: 3 },
  { key: 'avoid', label: '不碰的内容', rows: 2 },
  { key: 'tags', label: '话题标签组', rows: 3 },
] as const;

// Presets for the "add connection" form.
export const CONNECTION_PRESETS = [
  { name: 'Claude', kind: 'anthropic', baseUrl: '', models: ['claude-opus-5-5', 'claude-sonnet-5-5', 'claude-haiku-5-5'] },
  { name: 'DeepSeek', kind: 'openai', baseUrl: 'https://api.deepseek.com/v1', models: ['deepseek-chat', 'deepseek-reasoner'] },
  { name: '通义千问', kind: 'openai', baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1', models: [] },
  { name: 'Kimi', kind: 'openai', baseUrl: 'https://api.moonshot.cn/v1', models: [] },
  { name: '智谱', kind: 'openai', baseUrl: 'https://open.bigmodel.cn/api/paas/v4', models: [] },
  { name: '自定义', kind: 'openai', baseUrl: '', models: [] },
] as const;
