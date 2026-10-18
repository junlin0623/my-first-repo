import path from 'node:path';
import { generateText, Output } from 'ai';
import { z } from 'zod';
import { getKv } from './db';
import { getAgent, jsonOnly } from './agent';
import { addMessage, background, getDraft, update } from './drafts';
import { MEDIA_DIR } from './legacy';
import { palette } from './palettes';
import { getBrand } from './prompt';
import { renderSpec, TEMPLATE_NAMES, type SpecItem } from './render';

const item = z.object({
  template: z.enum(TEMPLATE_NAMES).describe('xhsCover=小红书封面, xhsPage=小红书内页, xhsEnd=小红书结尾页, mpCover=公众号封面 900×383, mpSquare=公众号方图 500×500'),
  file: z.string().describe('文件名，如 01-封面.png、02-xxx.png、公众号封面-900x383.png'),
  data: z.object({
    tag: z.string().optional().describe('栏目标签'),
    no: z.string().optional().describe('编号，如 No.005'),
    title: z.string().optional().describe('封面标题，≤14 字，可用 \\n 换行，【】包住重点词'),
    sub: z.string().optional().describe('封面副标题'),
    num: z.string().optional().describe('内页页码，如 02 / 08'),
    series: z.string().optional().describe('内页右上角的系列名'),
    heading: z.string().optional().describe('内页标题，【】包住重点词'),
    points: z.array(z.string()).optional().describe('内页 3 个要点，或结尾页 3 条总结；**加粗** 一处'),
    plain: z.string().optional().describe('内页金句框里的一句话'),
    source: z.string().optional().describe('内页来源'),
    question: z.string().optional().describe('结尾页引导评论的问题'),
  }),
});

const brandText = () => {
  const b = getBrand();
  return { name: b.name || '我的账号', catchphrase: b.catchphrase || '划重点', follow: b.follow || '关注我' };
};

// 美编: write the card list (if there is none yet) and render every image.
export function startRender(id: number, { respec = false } = {}) {
  background(id, 'rendering', async () => {
    let d = getDraft(id)!;
    if (respec || !d.spec.trim()) {
      const designer = getAgent('designer');
      const { output } = await generateText({
        model: designer.model,
        instructions: designer.instructions,
        prompt: `为下面这篇稿件出图清单：1 张小红书封面(xhsCover)、4–6 张内页(xhsPage)、1 张结尾页(xhsEnd)、1 张公众号封面(mpCover)、1 张公众号方图(mpSquare)。编号用 ${d.code}。\n\n【小红书稿】\n${d.xhs}\n\n【公众号稿】\n${d.mp.slice(0, 6000)}${jsonOnly(item, { array: true })}`,
        output: Output.array({ element: item, minItems: 3, maxItems: 10 }),
      });
      update(id, { spec: JSON.stringify(output, null, 2) });
      d = getDraft(id)!;
    }
    const spec = JSON.parse(d.spec) as SpecItem[];
    await renderSpec(spec, path.join(MEDIA_DIR, d.code), palette(getKv('palette')), brandText());
    addMessage(`draft:${id}`, 'assistant', `出好了 ${spec.length} 张图，在「卡片」里。`, '美编');
  });
}
