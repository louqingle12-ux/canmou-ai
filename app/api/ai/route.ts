import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * =========================================================
 * 餐谋AI - AI API
 * =========================================================
 *
 * 流程：
 *
 * 前端
 *   ↓
 * Supabase Access Token
 *   ↓
 * /api/ai
 *   ↓
 * 验证用户
 *   ↓
 * 检查 / 消耗 AI 免费额度
 *   ↓
 * DeepSeek
 *   ↓
 * 返回 AI 结果
 *
 * 环境变量：
 *
 * NEXT_PUBLIC_SUPABASE_URL
 * NEXT_PUBLIC_SUPABASE_ANON_KEY
 * DEEPSEEK_API_KEY
 * DEEPSEEK_MODEL
 *
 * =========================================================
 */

export const runtime = "nodejs";

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL;

const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const DEEPSEEK_API_KEY =
  process.env.DEEPSEEK_API_KEY;

const DEEPSEEK_MODEL =
  process.env.DEEPSEEK_MODEL ||
  "deepseek-chat";

const DEEPSEEK_URL =
  "https://api.deepseek.com/chat/completions";


/**
 * =========================================================
 * 工具类型
 * =========================================================
 */

type ToolType =
  | "ceo"
  | "menu"
  | "review"
  | "profit"
  | "marketing"
  | "inventory"
  | string;


/**
 * =========================================================
 * AI 工作角色
 * =========================================================
 */

const TOOL_PROMPTS: Record<string, string> = {
  ceo: `
你是「餐谋AI」的AI餐饮CEO顾问。

你的任务不是陪用户聊天，而是帮助餐饮老板做经营决策。

重点分析：
1. 营业额
2. 订单量
3. 客单价
4. 毛利率
5. 菜品结构
6. 用户评价
7. 获客
8. 复购
9. 外卖经营
10. 成本控制
11. 库存
12. 利润增长

回答必须：
- 直接
- 专业
- 有数据意识
- 少废话
- 给出可以马上执行的动作

如果用户提供的数据不足，先指出缺什么，但仍然尽可能给出判断。
`,

  menu: `
你是「餐谋AI」菜单优化专家。

分析餐厅菜单，包括：
- 菜品销量
- 售价
- 成本
- 毛利
- 毛利率
- 爆款
- 引流款
- 利润款
- 陪跑款
- 滞销款
- 菜品组合
- 套餐设计
- 定价

重点告诉老板：
什么应该保留；
什么应该涨价；
什么应该降价；
什么应该做套餐；
什么应该下架；
什么菜值得重点推广。

不要只给理论，要给具体动作。
`,

  review: `
你是「餐谋AI」差评处理专家。

分析餐饮平台差评，判断：
- 差评原因
- 用户真实痛点
- 是否属于服务问题
- 是否属于产品问题
- 是否属于配送问题
- 是否属于预期管理问题

然后给出：
1. 差评问题分类
2. 回复建议
3. 店内整改方案
4. 防止同类差评再次出现的方法

回复客户时必须自然、真诚，不要像机器人。
`,

  profit: `
你是「餐谋AI」餐饮利润分析师。

重点分析：
- 营业额
- 食材成本
- 人工成本
- 房租
- 平台佣金
- 包装成本
- 营销成本
- 毛利润
- 净利润
- 单店盈利能力

如果数据足够，尽可能计算：
毛利 = 营业额 - 可变成本

毛利率 = 毛利 ÷ 营业额

净利润 = 营业额 - 全部成本

必须指出：
利润到底被什么吃掉了。

最后给出至少3个提升利润的具体方案。
`,

  marketing: `
你是「餐谋AI」餐饮增长营销专家。

重点分析：
- 新客
- 老客
- 复购
- 外卖
- 到店
- 短视频
- 小红书
- 抖音
- 团购
- 套餐
- 优惠券
- 私域

不要建议单纯“多发视频”“多做活动”。

必须考虑：
获客成本、客单价、毛利和复购。

输出可以直接执行的营销方案。
`,

  inventory: `
你是「餐谋AI」餐厅库存与成本控制专家。

重点分析：
- 原材料
- 库存周转
- 损耗
- 临期
- 采购
- 食材成本
- 安全库存

帮助老板降低：
采购浪费；
食材损耗；
库存积压；
缺货风险。

如果用户提供销量和库存数据，要尽量进行量化分析。
`,
};


/**
 * =========================================================
 * 默认系统提示
 * =========================================================
 */

const DEFAULT_SYSTEM_PROMPT = `
你是「餐谋AI」。

这是一个给餐饮老板使用的AI经营操作系统。

你的核心目标：

帮助餐饮老板：
提高营业额；
提高毛利；
降低成本；
提高复购；
减少浪费；
优化菜单；
提升经营效率。

回答不要空泛。

优先使用：

【经营判断】
【问题】
【原因】
【行动方案】

如果可以量化，就量化。

如果无法确定，不要编造数据。

永远不要假装知道用户没有提供的数据。

你可以指出用户的数据不足，并告诉他下一步应该提供什么数据。
`;


/**
 * =========================================================
 * POST
 * =========================================================
 */

export async function POST(request: Request) {
  try {
    /**
     * -------------------------------------------------------
     * 1. 检查环境变量
     * -------------------------------------------------------
     */

    if (
      !SUPABASE_URL ||
      !SUPABASE_ANON_KEY
    ) {
      console.error(
        "Supabase environment variables missing."
      );

      return NextResponse.json(
        {
          error:
            "服务器 Supabase 配置不完整。",
        },
        {
          status: 500,
        }
      );
    }

    if (!DEEPSEEK_API_KEY) {
      console.error(
        "DEEPSEEK_API_KEY missing."
      );

      return NextResponse.json(
        {
          error:
            "服务器 DeepSeek API 未配置。",
        },
        {
          status: 500,
        }
      );
    }


    /**
     * -------------------------------------------------------
     * 2. 获取 Authorization
     * -------------------------------------------------------
     */

    const authHeader =
      request.headers.get(
        "authorization"
      );

    if (
      !authHeader ||
      !authHeader.startsWith(
        "Bearer "
      )
    ) {
      return NextResponse.json(
        {
          error: "请先登录餐谋AI。",
          code: "UNAUTHORIZED",
        },
        {
          status: 401,
        }
      );
    }

    const token =
      authHeader.substring(7).trim();

    if (!token) {
      return NextResponse.json(
        {
          error: "登录凭证无效。",
          code: "UNAUTHORIZED",
        },
        {
          status: 401,
        }
      );
    }


    /**
     * -------------------------------------------------------
     * 3. 创建 Supabase 客户端
     *
     * 关键：
     * 把用户 Token 放进 Authorization。
     *
     * 这样 auth.uid() 才能识别当前用户。
     * -------------------------------------------------------
     */

    const supabase =
      createClient(
        SUPABASE_URL,
        SUPABASE_ANON_KEY,
        {
          global: {
            headers: {
              Authorization:
                `Bearer ${token}`,
            },
          },
        }
      );


    /**
     * -------------------------------------------------------
     * 4. 验证用户
     * -------------------------------------------------------
     */

    const {
      data: {
        user,
      },
      error: userError,
    } =
      await supabase.auth.getUser(
        token
      );

    if (
      userError ||
      !user
    ) {
      console.error(
        "Supabase user error:",
        userError
      );

      return NextResponse.json(
        {
          error:
            "登录已失效，请重新登录。",
          code: "UNAUTHORIZED",
        },
        {
          status: 401,
        }
      );
    }


    /**
     * -------------------------------------------------------
     * 5. 读取请求
     * -------------------------------------------------------
     */

    let body: any;

    try {
      body =
        await request.json();
    } catch {
      return NextResponse.json(
        {
          error:
            "请求数据格式错误。",
          code: "INVALID_JSON",
        },
        {
          status: 400,
        }
      );
    }


    /**
     * -------------------------------------------------------
     * 6. 获取参数
     * -------------------------------------------------------
     */

    const tool: ToolType =
      String(
        body?.tool ||
          "ceo"
      ).trim();

    const message =
      String(
        body?.message ||
          body?.question ||
          ""
      ).trim();


    /**
     * -------------------------------------------------------
     * 7. 参数检查
     * -------------------------------------------------------
     */

    if (!message) {
      return NextResponse.json(
        {
          error:
            "请输入你想咨询的问题。",
          code: "EMPTY_MESSAGE",
        },
        {
          status: 400,
        }
      );
    }

    if (message.length > 12000) {
      return NextResponse.json(
        {
          error:
            "问题内容过长，请控制在 12000 字以内。",
          code: "MESSAGE_TOO_LONG",
        },
        {
          status: 400,
        }
      );
    }


    /**
     * -------------------------------------------------------
     * 8. 消耗 AI 免费额度
     *
     * consume_free_credit 会自动判断：
     *
     * free：
     * 5次额度
     *
     * pro：
     * 不限制
     * -------------------------------------------------------
     */

    const {
      data: creditResult,
      error: creditError,
    } =
      await supabase.rpc(
        "consume_free_credit",
        {
          p_tool: tool,
        }
      );


    /**
     * -------------------------------------------------------
     * 9. 额度系统异常
     * -------------------------------------------------------
     */

    if (creditError) {
      console.error(
        "Credit RPC error:",
        creditError
      );

      return NextResponse.json(
        {
          error:
            "AI额度系统暂时不可用，请稍后再试。",
          code: "CREDIT_SYSTEM_ERROR",
        },
        {
          status: 500,
        }
      );
    }


    /**
     * -------------------------------------------------------
     * 10. 免费次数用完
     * -------------------------------------------------------
     */

    if (
      !creditResult ||
      creditResult.success !== true
    ) {
      return NextResponse.json(
        {
          error:
            creditResult?.message ||
            "免费AI次数已经用完。",
          code:
            creditResult?.code ||
            "NO_CREDITS",
          remaining:
            creditResult?.remaining ??
            0,
          plan:
            creditResult?.plan ||
            "free",
        },
        {
          status: 402,
        }
      );
    }


    /**
     * -------------------------------------------------------
     * 11. 获取剩余次数
     * -------------------------------------------------------
     */

    const remaining =
      typeof creditResult.remaining ===
      "number"
        ? creditResult.remaining
        : 0;

    const plan =
      creditResult.plan ||
      "free";


    /**
     * -------------------------------------------------------
     * 12. 选择 AI 工作角色
     * -------------------------------------------------------
     */

    const toolPrompt =
      TOOL_PROMPTS[tool] ||
      TOOL_PROMPTS.ceo;


    /**
     * -------------------------------------------------------
     * 13. 构建系统提示
     * -------------------------------------------------------
     */

    const systemPrompt = `
${DEFAULT_SYSTEM_PROMPT}

当前AI工作模式：

${toolPrompt}

当前用户ID：
${user.id}

当前工具：
${tool}

请直接解决老板的问题。
`;


    /**
     * -------------------------------------------------------
     * 14. 请求 DeepSeek
     * -------------------------------------------------------
     */

    const deepseekResponse =
      await fetch(
        DEEPSEEK_URL,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",

            Authorization:
              `Bearer ${DEEPSEEK_API_KEY}`,
          },

          body: JSON.stringify({
            model:
              DEEPSEEK_MODEL,

            messages: [
              {
                role: "system",
                content:
                  systemPrompt,
              },

              {
                role: "user",
                content:
                  message,
              },
            ],

            temperature: 0.35,

            max_tokens: 4000,

            stream: false,
          }),

          cache: "no-store",
        }
      );


    /**
     * -------------------------------------------------------
     * 15. DeepSeek API 请求失败
     * -------------------------------------------------------
     */

    if (
      !deepseekResponse.ok
    ) {
      const errorText =
        await deepseekResponse.text();

      console.error(
        "DeepSeek API error:",
        deepseekResponse.status,
        errorText
      );

      /**
       * 注意：
       *
       * 不把 DeepSeek 的完整错误返回给用户，
       * 防止泄露 API 内部信息。
       */

      if (
        deepseekResponse.status ===
        401
      ) {
        return NextResponse.json(
          {
            error:
              "DeepSeek API Key 无效，请检查服务器配置。",
            code: "DEEPSEEK_AUTH_ERROR",
          },
          {
            status: 500,
          }
        );
      }

      if (
        deepseekResponse.status ===
        429
      ) {
        return NextResponse.json(
          {
            error:
              "AI当前请求较多，请稍后再试。",
            code: "DEEPSEEK_RATE_LIMIT",
          },
          {
            status: 429,
          }
        );
      }

      return NextResponse.json(
        {
          error:
            "DeepSeek 暂时无法响应，请稍后再试。",
          code: "DEEPSEEK_ERROR",
        },
        {
          status: 502,
        }
      );
    }


    /**
     * -------------------------------------------------------
     * 16. 解析 DeepSeek 返回结果
     * -------------------------------------------------------
     */

    let deepseekData: any;

    try {
      deepseekData =
        await deepseekResponse.json();
    } catch {
      return NextResponse.json(
        {
          error:
            "AI返回的数据无法解析。",
          code: "INVALID_AI_RESPONSE",
        },
        {
          status: 502,
        }
      );
    }


    /**
     * -------------------------------------------------------
     * 17. 获取 AI 内容
     * -------------------------------------------------------
     */

    const answer =
      deepseekData?.choices?.[0]
        ?.message?.content
        ?.trim();


    /**
     * -------------------------------------------------------
     * 18. AI 没有返回内容
     * -------------------------------------------------------
     */

    if (!answer) {
      console.error(
        "Empty DeepSeek response:",
        deepseekData
      );

      return NextResponse.json(
        {
          error:
            "AI没有返回有效内容，请重新尝试。",
          code: "EMPTY_AI_RESPONSE",
        },
        {
          status: 502,
        }
      );
    }


    /**
     * -------------------------------------------------------
     * 19. 返回给前端
     * -------------------------------------------------------
     */

    return NextResponse.json(
      {
        success: true,

        answer,

        tool,

        plan,

        remaining,

        user: {
          id: user.id,
        },

        model:
          DEEPSEEK_MODEL,

        usage:
          deepseekData?.usage ||
          null,
      },
      {
        status: 200,
        headers: {
          "Cache-Control":
            "no-store",
        },
      }
    );
  } catch (error) {
    /**
     * -------------------------------------------------------
     * 20. 全局错误
     * -------------------------------------------------------
     */

    console.error(
      "AI route fatal error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "服务器发生未知错误，请稍后再试。",
        code: "INTERNAL_SERVER_ERROR",
      },
      {
        status: 500,
      }
    );
  }
}
