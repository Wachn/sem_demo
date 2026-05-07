import type { Lang, Localized } from '../types';
import { UI_STRINGS } from '../data/ui-strings';

export function t(loc: Localized, lang: Lang): string {
  return loc[lang];
}

export function ui(key: keyof typeof UI_STRINGS, lang: Lang): string {
  const entry = UI_STRINGS[key];
  return entry ? entry[lang] : String(key);
}

export const JUDGE_PROMPT_TEMPLATE: Localized = {
  en: `You are an expert in fraud-prevention agent behavior. You will be given a user query and one or more trajectories showing how the agent attempted the task. Some trajectories may be successful, and others may have failed.

## Guidelines
Your goal is to compare and contrast these trajectories to identify the most useful and generalizable strategies as memory items. Use self-contrast reasoning:
- Identify patterns and strategies that consistently led to success.
- Identify mistakes or inefficiencies from failed trajectories and formulate preventative strategies.
- Prefer strategies that generalize beyond specific scams or exact wording.

## Important notes
- Think first: why did some trajectories succeed while others failed?
- Extract at most 5 memory items from all trajectories combined.
- Do not repeat similar or overlapping items.
- Do not mention specific people, platforms, or string contents — focus on generalizable behaviors.
- Make sure each memory item captures actionable and transferable insights.

## Output Format
\`\`\`
# Memory Item i
## Title <the title of the memory item>
## Description <one sentence summary of the memory item>
## Content <1–5 sentences describing the insights learned to successfully accomplish the task>
\`\`\`

# System Instruction
{system_instruction}

# Input Prompt
Query: {user_query}
Trajectories:
{trajectories}`,
  zh: `你是一名反欺诈代理行为分析专家。你将获得一个用户查询和一条或多条轨迹，展示代理如何尝试完成任务。部分轨迹可能成功，部分可能失败。

## 指南
你的目标是对比这些轨迹，识别最具通用性的策略并提炼为记忆项。使用自对比推理：
- 识别在成功轨迹中反复出现的有效模式与策略。
- 识别失败轨迹中的错误或低效，并提炼出预防性策略。
- 优先选择能跨场景泛化的策略，而非依赖特定诈骗或措辞的策略。

## 重要说明
- 先思考：为什么部分轨迹成功而部分失败？
- 全部轨迹合计最多提取 5 条记忆项。
- 避免重复或语义重叠的条目。
- 不要提及具体人物、平台或字符串，专注于可泛化的行为与推理模式。
- 确保每条记忆项都包含可操作、可转移的洞察。

## 输出格式
\`\`\`
# Memory Item i
## Title <记忆项标题>
## Description <一句话摘要>
## Content <1–5 句描述完成任务所学到的洞察>
\`\`\`

# System Instruction
{system_instruction}

# Input Prompt
Query: {user_query}
Trajectories:
{trajectories}`,
};
