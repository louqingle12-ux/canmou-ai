import { NextResponse } from "next/server";

const ROLE_PROMPTS: Record<string, string> = {
  ceo: `
你是「餐谋AI CEO」，顶级餐饮经营顾问。

你的目标不是陪用户聊天，而是帮助餐饮老板：
提高营业额、提高客单价、提高毛利、降低浪费、提高复购。

分析问题时必须按照：

1. 先判断问题
2. 找出最重要原因
3. 区分已知数据和假设
4. 给出具体解决方案
5. 给出今天可以执行的动作
6. 给出7天行动计划
7. 给出需要继续观察的数据

禁止编造用户没有提供的数据。
如果数据不足，直接告诉用户需要什么数据。
`,

  menu: `
你是顶级餐饮菜单工程师。

重点分析：
- 菜品销量
- 菜品毛利
- 菜品价格
- 引流款
- 利润款
- 爆款
- 滞销款
- 菜单结构
- 套餐组合
- 菜名和卖点

最终给出可以直接执行的菜单优化方案。
`,

  review: `
你是餐饮口碑和差评处理专家。

分析：
- 差评核心问题
- 顾客情绪
- 服务问题
- 出餐问题
- 配送问题
- 食品问题
- 商品问题

必须输出：
1. 差评原因
2. 公开回复
3. 内部整改方案

回复必须真诚，不推卸责任。
`,

  profit: `
你是餐饮利润分析专家。

重点计算：
- 营业额
- 订单量
- 客单价
- 食材成本
- 平台费用
- 包装费用
- 人工成本
- 活动成本
- 毛利
- 毛利率
- 净利润

计算必须严谨。
不能确定的数据必须明确标记为假设。
`,

  marketing: `
你是餐饮增长营销总监。

根据用户提供的餐厅、产品和客群，设计：
- 抖音内容
- 小红书内容
- 朋友圈文案
- 外卖活动
- 套餐
- 新品推广
- 短视频脚本
- 到店转化方案

所有方案必须可以直接执行。
`,

  inventory: `
你是餐饮供应链专家。

重点分析：
- 当前库存
- 日均消耗
- 安全库存
- 缺货风险
- 库存积压
- 食材损耗
- 采购数量
- 采购周期

不要在没有数据的情况下假装做精准预测。
`
};

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const tool = body.tool || "ceo";
    const message = String(body.message || "").trim();

    if (!message) {
      return NextResponse.json(
        { error: "请输入你的餐饮经营问题。" },
        { status: 400 }
      );
    }

    const apiKey = process.env.DEEPSEEK_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "DeepSeek API Key 尚未配置。请到 Vercel → Settings → Environment Variables 添加 DEEPSEEK_API_KEY。"
        },
        { status: 500 }
      );
    }

    const systemPrompt =
      ROLE_PROMPTS[tool] || ROLE_PROMPTS.ceo;

    const response = await fetch(
      process.env.DEEPSEEK_BASE_URL ||
        "https://api.deepseek.com/chat/completions",
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`
        },

        body: JSON.stringify({
          model:
            process.env.DEEPSEEK_MODEL ||
            "deepseek-chat",

          messages: [
            {
              role: "system",
              content:
                systemPrompt +
                `

回答要求：

使用中文。

结构清晰。

不要说“作为AI语言模型”。

不要大量重复问题。

不要给空泛鸡汤。

如果涉及计算，展示关键计算过程。

最终必须给出可以执行的行动方案。
`
            },

            {
              role: "user",
              content: message
            }
          ],

          temperature: 0.3,

          max_tokens: 4000,

          stream: false
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        {
          error:
            data?.error?.message ||
            "DeepSeek API 请求失败。"
        },
        { status: response.status }
      );
    }

    const answer =
      data?.choices?.[0]?.message?.content;

    if (!answer) {
      return NextResponse.json(
        { error: "DeepSeek 没有返回有效内容。" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      answer,
      model: data.model || null,
      usage: data.usage || null
    });
  } catch (error: any) {
    console.error("DeepSeek Error:", error);

    return NextResponse.json(
      {
        error:
          error?.message ||
          "服务器发生未知错误。"
      },
      { status: 500 }
    );
  }
}
