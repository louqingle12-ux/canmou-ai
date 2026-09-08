"use client";

import {
  Bot,
  Utensils,
  MessageSquareWarning,
  Coins,
  TrendingUp,
  Package,
  Bell,
  ChevronRight,
  Sparkles,
  ArrowUpRight,
  Flame,
  AlertTriangle,
  ShoppingBag,
  BarChart3,
  LogOut,
} from "lucide-react";

import { useEffect, useState } from "react";

import ProModal from "@/components/ProModal";
import AuthModal from "@/components/AuthModal";
import { supabase } from "@/lib/supabase";

/* =========================================================
   AI 工具
========================================================= */

const tools = [
  {
    id: "ceo",
    name: "AI餐饮CEO",
    icon: Bot,
  },
  {
    id: "menu",
    name: "菜单AI",
    icon: Utensils,
  },
  {
    id: "review",
    name: "差评AI",
    icon: MessageSquareWarning,
  },
  {
    id: "profit",
    name: "利润AI",
    icon: Coins,
  },
  {
    id: "marketing",
    name: "营销AI",
    icon: TrendingUp,
  },
  {
    id: "inventory",
    name: "库存AI",
    icon: Package,
  },
];

/* =========================================================
   菜品
========================================================= */

const dishes = [
  {
    name: "招牌宫保鸡丁",
    price: "¥32",
    sales: "486",
    margin: "68%",
    image:
      "https://images.unsplash.com/photo-1603133872878-684f208fb84b?auto=format&fit=crop&w=600&q=85",
    tag: "爆款",
  },
  {
    name: "招牌炒饭",
    price: "¥18",
    sales: "392",
    margin: "74%",
    image:
      "https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=600&q=85",
    tag: "高毛利",
  },
  {
    name: "酸辣汤",
    price: "¥12",
    sales: "286",
    margin: "61%",
    image:
      "https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=600&q=85",
    tag: "稳定",
  },
];

/* =========================================================
   首页
========================================================= */

export default function Home() {
  const [active, setActive] = useState("ceo");

  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");

  const [loading, setLoading] = useState(false);

  const [session, setSession] = useState<any>(null);

  const [showAuth, setShowAuth] = useState(false);
  const [showPro, setShowPro] = useState(false);

  /**
   * remaining:
   *
   * -1 = PRO 无限
   * 0 = 免费额度用完
   * 1~5 = 剩余免费次数
   */
  const [remaining, setRemaining] = useState(5);

  // 今日经营体检
  const [diag, setDiag] = useState({
    revenue: "",
    orders: "",
    foodCost: "",
    commission: "",
    reviews: "",
    targetAov: "32",
  });
  const [diagResult, setDiagResult] = useState<any>(null);
  const [diagLoading, setDiagLoading] = useState(false);

  const [authLoading, setAuthLoading] = useState(true);

  /* =========================================================
     初始化登录状态
  ========================================================= */

  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        const {
          data: { session: currentSession },
        } = await supabase.auth.getSession();

        if (!mounted) return;

        setSession(currentSession);

        if (currentSession) {
          await loadCredits(currentSession);
        } else {
          setRemaining(5);
        }
      } catch (error) {
        console.error(
          "Auth initialization error:",
          error
        );
      } finally {
        if (mounted) {
          setAuthLoading(false);
        }
      }
    }

    init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        if (!mounted) return;

        setSession(newSession);

        if (newSession) {
          await loadCredits(newSession);
        } else {
          setRemaining(5);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  /* =========================================================
     获取用户套餐 + AI额度
  ========================================================= */

  async function loadCredits(currentSession?: any) {
    const current =
      currentSession || session;

    if (!current?.user?.id) {
      setRemaining(5);
      return;
    }

    try {
      /* -----------------------------------------------------
         查询用户套餐
      ----------------------------------------------------- */

      const {
        data: profile,
        error: profileError,
      } = await supabase
        .from("profiles")
        .select("plan")
        .eq("id", current.user.id)
        .maybeSingle();

      if (profileError) {
        console.error(
          "Load profile error:",
          profileError
        );
      }

      /* -----------------------------------------------------
         PRO
      ----------------------------------------------------- */

      if (profile?.plan === "pro") {
        setRemaining(-1);
        return;
      }

      /* -----------------------------------------------------
         免费用户
      ----------------------------------------------------- */

      const {
        count,
        error,
      } = await supabase
        .from("ai_usage")
        .select("*", {
          count: "exact",
          head: true,
        })
        .eq(
          "user_id",
          current.user.id
        );

      if (error) {
        console.error(
          "Load credits error:",
          error
        );
        return;
      }

      setRemaining(
        Math.max(
          0,
          5 - (count || 0)
        )
      );
    } catch (error) {
      console.error(
        "Credits error:",
        error
      );
    }
  }

  /* =========================================================
     AI 请求
  ========================================================= */

  async function askAI() {
    if (
      !question.trim() ||
      loading
    ) {
      return;
    }

    /* -------------------------------------------------------
       获取最新 Session
    ------------------------------------------------------- */

    const {
      data: {
        session: currentSession,
      },
    } =
      await supabase.auth.getSession();

    /* -------------------------------------------------------
       未登录
    ------------------------------------------------------- */

    if (!currentSession) {
      setShowAuth(true);
      return;
    }

    /* -------------------------------------------------------
       免费额度用完
    ------------------------------------------------------- */

    if (remaining === 0) {
      setShowPro(true);
      return;
    }

    setLoading(true);
    setAnswer("");

    try {
      const res = await fetch(
        "/api/ai",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",

            Authorization:
              `Bearer ${currentSession.access_token}`,
          },

          body: JSON.stringify({
            tool: active,
            message:
              question.trim(),
          }),
        }
      );

      let data: any = null;

      try {
        data = await res.json();
      } catch {
        data = {};
      }

      /* -----------------------------------------------------
         登录失效
      ----------------------------------------------------- */

      if (res.status === 401) {
        await supabase.auth.signOut();

        setSession(null);
        setRemaining(5);
        setShowAuth(true);

        throw new Error(
          "登录已失效，请重新登录。"
        );
      }

      /* -----------------------------------------------------
         免费额度用完
      ----------------------------------------------------- */

      if (res.status === 402) {
        setRemaining(0);
        setShowPro(true);
        return;
      }

      /* -----------------------------------------------------
         其它错误
      ----------------------------------------------------- */

      if (!res.ok) {
        throw new Error(
          data?.error ||
            "AI请求失败，请稍后再试。"
        );
      }

      /* -----------------------------------------------------
         AI结果
      ----------------------------------------------------- */

      setAnswer(
        data?.answer ||
          "AI没有返回有效内容。"
      );

      /* -----------------------------------------------------
         更新额度
      ----------------------------------------------------- */

      if (
        typeof data?.remaining ===
        "number"
      ) {
        setRemaining(
          data.remaining
        );
      } else {
        await loadCredits(
          currentSession
        );
      }
    } catch (error: any) {
      console.error(
        "AI request error:",
        error
      );

      setAnswer(
        error?.message ||
          "请求失败，请稍后再试。"
      );
    } finally {
      setLoading(false);
    }
  }

  /* =========================================================
     今日经营体检
  ========================================================= */

  function updateDiag(key: string, value: string) {
    setDiag((prev) => ({ ...prev, [key]: value }));
  }

  function runLocalDiagnosis() {
    const revenue = Number(diag.revenue);
    const orders = Number(diag.orders);
    const foodCost = Number(diag.foodCost);
    const commission = Number(diag.commission);
    const reviews = Number(diag.reviews);
    const targetAov = Number(diag.targetAov) || 32;

    if (!revenue || !orders) return null;

    const aov = revenue / orders;
    const grossProfit = revenue - foodCost - commission;
    const grossMargin = revenue ? (grossProfit / revenue) * 100 : 0;
    const aovGap = Math.max(0, targetAov - aov);
    const revenueOpportunity = aovGap * orders;
    const reviewRate = reviews > 0 ? (reviews / orders) * 100 : 0;

    let priority = "继续保持";
    let severity = "good";
    let reason = "当前输入数据没有发现明显的单一高风险项。";

    if (aovGap >= 5) {
      priority = "客单价偏低";
      severity = "danger";
      reason = `当前客单价约 ¥${aov.toFixed(2)}，距离目标 ¥${targetAov.toFixed(0)} 还有 ¥${aovGap.toFixed(2)}。`;
    } else if (grossMargin < 45 && foodCost > 0) {
      priority = "毛利承压";
      severity = "danger";
      reason = `按已填写成本估算，毛利率约 ${grossMargin.toFixed(1)}%，需要优先检查高成本菜品和平台扣点。`;
    } else if (reviewRate >= 3) {
      priority = "差评需要关注";
      severity = "warning";
      reason = `差评占订单约 ${reviewRate.toFixed(1)}%，建议先把最近差评按原因分类。`;
    } else if (aovGap >= 2) {
      priority = "有客单价提升空间";
      severity = "warning";
      reason = `当前客单价约 ¥${aov.toFixed(2)}，可以通过套餐和加购测试向目标靠近。`;
    }

    return {
      revenue, orders, foodCost, commission, reviews, targetAov,
      aov, grossProfit, grossMargin, aovGap, revenueOpportunity, reviewRate,
      priority, severity, reason,
    };
  }

  async function diagnoseToday() {
    const result = runLocalDiagnosis();
    if (!result) return;

    setDiagResult(result);
    setDiagLoading(true);

    const prompt = `请对这家餐饮店做“今日经营体检”，必须严格基于以下数据，不要编造数据。
今日营业额：¥${result.revenue}
今日订单：${result.orders}
食材成本：${result.foodCost ? `¥${result.foodCost}` : "未提供"}
平台佣金：${result.commission ? `¥${result.commission}` : "未提供"}
差评数：${result.reviews}
目标客单价：¥${result.targetAov}
已计算客单价：¥${result.aov.toFixed(2)}
已计算毛利：${result.foodCost || result.commission ? `¥${result.grossProfit.toFixed(2)}` : "无法完整计算"}
已计算毛利率：${result.foodCost || result.commission ? `${result.grossMargin.toFixed(1)}%` : "无法完整计算"}
客单价提升空间对应的理论日营业额机会：¥${result.revenueOpportunity.toFixed(2)}

请按以下格式回答：
【经营判断】
一句话判断今天最值得老板关注什么。
【核心问题】
只选1个最重要的问题。
【原因分析】
结合数据解释原因；无法判断的地方明确说“数据不足”。
【明天行动】
给出3个明天可以直接执行的动作，按优先级排序。
【关键指标】
告诉老板明天重点盯哪2-3个数字。
【收益机会】
如果存在可计算的提升空间，给出公式和“理论估算”，不要把估算当成保证。`;

    // 复用现有 AI API；本地诊断即使 AI 暂时失败也会保留
    const currentSession = (await supabase.auth.getSession()).data.session;
    if (!currentSession) {
      setDiagLoading(false);
      setShowAuth(true);
      return;
    }
    if (remaining === 0) {
      setDiagLoading(false);
      setShowPro(true);
      return;
    }

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${currentSession.access_token}`,
        },
        body: JSON.stringify({
          tool: "ceo",
          message: prompt,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.status === 402) {
        setRemaining(0);
        setShowPro(true);
        return;
      }
      if (res.status === 401) {
        await supabase.auth.signOut();
        setSession(null);
        setShowAuth(true);
        return;
      }
      if (!res.ok) {
        throw new Error(data?.error || "AI诊断失败");
      }

      setDiagResult((prev: any) => ({
        ...prev,
        aiAnswer: data?.answer || "",
      }));

      if (typeof data?.remaining === "number") {
        setRemaining(data.remaining);
      }
    } catch (error: any) {
      console.error("Diagnosis error:", error);
      setDiagResult((prev: any) => ({
        ...prev,
        aiAnswer: `AI暂时没有返回结果：${error?.message || "请稍后再试"}\n\n你仍可以先参考上面的数据诊断。`,
      }));
    } finally {
      setDiagLoading(false);
    }
  }

  /* =========================================================
     退出登录
  ========================================================= */

  async function logout() {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error(
        "Logout error:",
        error
      );
    }

    setSession(null);
    setRemaining(5);
    setAnswer("");
    setQuestion("");
  }

  /* =========================================================
     登录成功
  ========================================================= */

  async function handleAuthSuccess() {
    setShowAuth(false);

    const {
      data: {
        session: newSession,
      },
    } =
      await supabase.auth.getSession();

    setSession(newSession);

    if (newSession) {
      await loadCredits(
        newSession
      );
    }
  }

  /* =========================================================
     PRO Modal 回调
  ========================================================= */

  async function handleProSuccess() {
    setShowPro(false);

    if (session) {
      await loadCredits(session);
    }
  }

  /* =========================================================
     用户信息
  ========================================================= */

  const email =
    session?.user?.email || "";

  const avatarLetter =
    email
      ? email
          .charAt(0)
          .toUpperCase()
      : "餐";

  /* =========================================================
     页面
  ========================================================= */

  return (
    <main className="app">

      {/* =====================================================
          SIDEBAR
      ===================================================== */}

      <aside className="sidebar">

        {/* 品牌 */}

        <div className="brand">
          <div className="brandLogo">
            谋
          </div>

          <div>
            <strong>
              餐谋AI
            </strong>

            <span>
              Restaurant OS
            </span>
          </div>
        </div>

        {/* 菜单标题 */}

        <div className="sideLabel">
          AI 工作台
        </div>

        {/* AI工具 */}

        <nav>
          {tools.map((tool) => {
            const Icon = tool.icon;

            return (
              <button
                key={tool.id}
                type="button"
                className={
                  active === tool.id
                    ? "sideItem active"
                    : "sideItem"
                }
                onClick={() =>
                  setActive(tool.id)
                }
              >
                <Icon size={18} />

                <span>
                  {tool.name}
                </span>

                {active === tool.id && (
                  <i />
                )}
              </button>
            );
          })}
        </nav>

        {/* =================================================
            SIDEBAR BOTTOM
        ================================================= */}

        <div className="sideBottom">

          {/* =================================================
              PRO
          ================================================= */}

          <div className="proCard">
            <Sparkles size={17} />

            <strong>
              {remaining === -1
                ? "PRO会员"
                : "升级 PRO"}
            </strong>

            <p>
              {remaining === -1
                ? "已解锁全部AI经营能力"
                : "解锁全部AI经营能力"}
            </p>

            <button
              type="button"
              onClick={() => {
                window.location.href =
                  "/pro";
              }}
            >
              {remaining === -1
                ? "查看会员"
                : "立即升级"}
            </button>
          </div>

          {/* =================================================
              ACCOUNT
          ================================================= */}

          {session ? (
            <div className="account">

              <div className="avatar">
                {avatarLetter}
              </div>

              <div
                style={{
                  minWidth: 0,
                  flex: 1,
                }}
              >
                <strong>
                  我的餐厅
                </strong>

                <span
                  style={{
                    display: "block",
                    maxWidth: 120,
                    overflow: "hidden",
                    textOverflow:
                      "ellipsis",
                    whiteSpace:
                      "nowrap",
                  }}
                >
                  {email}
                </span>
              </div>

              <button
                type="button"
                onClick={logout}
                title="退出登录"
                style={{
                  border: 0,
                  background:
                    "transparent",
                  color: "#71847b",
                  padding: 4,
                  cursor: "pointer",
                }}
              >
                <LogOut size={15} />
              </button>

            </div>
          ) : (
            <button
              type="button"
              className="account"
              onClick={() =>
                setShowAuth(true)
              }
              style={{
                width: "100%",
                border: 0,
                background:
                  "transparent",
                color: "inherit",
                textAlign: "left",
                cursor: "pointer",
              }}
            >
              <div className="avatar">
                餐
              </div>

              <div>
                <strong>
                  登录账户
                </strong>

                <span>
                  免费版 · 5次AI
                </span>
              </div>
            </button>
          )}

        </div>
      </aside>

      {/* =====================================================
          MAIN CONTENT
      ===================================================== */}

      <section className="content">

        {/* ===================================================
            TOPBAR
        =================================================== */}

        <header className="topbar">

          <div>
            <div className="breadcrumb">
              我的餐厅 /
              经营驾驶舱
            </div>

            <h1>
              早上好，老板 👋
            </h1>
          </div>

          <div className="topActions">

            <button
              type="button"
              className="iconButton"
            >
              <Bell size={19} />
            </button>

            <button
              type="button"
              className="dateButton"
            >
              2026年9月3日
            </button>

            {!authLoading &&
              (session ? (
                <button
                  type="button"
                  className="accountButton"
                  onClick={logout}
                >
                  <span>
                    {avatarLetter}
                  </span>

                  退出
                </button>
              ) : (
                <button
                  type="button"
                  className="loginButton"
                  onClick={() =>
                    setShowAuth(true)
                  }
                >
                  登录 / 注册
                </button>
              ))}
          </div>
        </header>

        {/* ===================================================
            HERO
        =================================================== */}

        <section className="heroDashboard">

          <div className="heroText">

            <div className="status">
              <span />

              DeepSeek AI
              实时分析
            </div>

            <h2>
              今天的生意，
              <br />

              <em>
                AI帮你盯着。
              </em>
            </h2>

            <p>
              从营业额、菜单、利润到差评，
              餐谋AI每天帮你发现经营机会。
            </p>

            <button
              type="button"
              className="heroButton"
              onClick={() =>
                document
                  .getElementById("diagnosis")
                  ?.scrollIntoView({
                    behavior: "smooth",
                  })
              }
            >
              开始AI诊断

              <ArrowUpRight size={17} />
            </button>

          </div>

          <div className="heroImage">

            <img
              src="https://images.unsplash.com/photo-1515003197210-e0cd71810b5f?auto=format&fit=crop&w=1200&q=90"
              alt="餐厅"
            />

            <div className="imageOverlay">

              <span>
                今日经营状态
              </span>

              <strong>
                良好
              </strong>

              <small>
                AI综合评分 87
              </small>

            </div>
          </div>

        </section>

        {/* ===================================================
            TODAY DIAGNOSIS
        =================================================== */}

        <section className="diagnosisPanel" id="diagnosis">
          <div className="diagnosisIntro">
            <div>
              <div className="diagnosisEyebrow">
                <Sparkles size={14} />
                DAILY BUSINESS CHECKUP
              </div>
              <h2>今天的店，<span>到底哪里在漏钱？</span></h2>
              <p>填入今天最关键的经营数据，先用公式算清楚，再让 AI 找出最值得你明天处理的一个问题。</p>
            </div>
            <div className="diagnosisFree">
              {remaining === -1 ? "PRO · 无限诊断" : `免费额度 · 剩余 ${remaining} 次`}
            </div>
          </div>

          <div className="diagnosisForm">
            {[
              ["revenue", "今日营业额", "¥", "例如 3280"],
              ["orders", "今日订单", "", "例如 126"],
              ["foodCost", "食材成本", "¥", "例如 1180"],
              ["commission", "平台佣金", "¥", "例如 420"],
              ["reviews", "差评数", "", "例如 7"],
              ["targetAov", "目标客单价", "¥", "默认 32"],
            ].map(([key, label, prefix, placeholder]) => (
              <label className="diagField" key={key}>
                <span>{label}</span>
                <div>
                  {prefix && <b>{prefix}</b>}
                  <input
                    inputMode="decimal"
                    value={(diag as any)[key]}
                    onChange={(e) => updateDiag(key, e.target.value)}
                    placeholder={placeholder}
                  />
                </div>
              </label>
            ))}
            <button
              type="button"
              className="diagnoseButton"
              onClick={diagnoseToday}
              disabled={diagLoading || !diag.revenue || !diag.orders}
            >
              {diagLoading ? "AI正在体检…" : "开始今日经营体检"}
              <ArrowUpRight size={17} />
            </button>
          </div>

          {diagResult && (
            <div className="diagnosisResult">
              <div className="scoreBlock">
                <span>今日核心问题</span>
                <strong>{diagResult.priority}</strong>
                <small>{diagResult.reason}</small>
              </div>

              <div className="metricStrip">
                <div><span>客单价</span><strong>¥{diagResult.aov.toFixed(2)}</strong></div>
                <div><span>预计毛利</span><strong>{diagResult.foodCost || diagResult.commission ? `¥${diagResult.grossProfit.toFixed(0)}` : "—"}</strong></div>
                <div><span>毛利率</span><strong>{diagResult.foodCost || diagResult.commission ? `${diagResult.grossMargin.toFixed(1)}%` : "—"}</strong></div>
                <div><span>理论增收空间</span><strong>¥{diagResult.revenueOpportunity.toFixed(0)}/天</strong></div>
              </div>

              <div className="diagnosisAI">
                <div className="diagnosisAITitle"><Bot size={17} /> 餐谋 AI 深度诊断</div>
                <div className="diagnosisAIText">
                  {diagResult.aiAnswer || "AI分析中…"}
                </div>
              </div>
            </div>
          )}
        </section>

        {/* ===================================================
            STATS
        =================================================== */}


        <section className="stats">

          <Stat
            title="今日营业额"
            value="¥8,620"
            change="+12.8%"
            icon={<Coins />}
          />

          <Stat
            title="今日订单"
            value="386"
            change="+8.4%"
            icon={<ShoppingBag />}
          />

          <Stat
            title="客单价"
            value="¥22.33"
            change="+3.2%"
            icon={<BarChart3 />}
          />

          <Stat
            title="预计毛利"
            value="¥4,921"
            change="+15.7%"
            icon={<TrendingUp />}
          />

        </section>

        {/* ===================================================
            MAIN GRID
        =================================================== */}

        <section className="mainGrid">

          {/* =================================================
              MENU
          ================================================= */}

          <div className="panel menuPanel">

            <div className="panelHeader">

              <div>
                <span>
                  MENU
                  INTELLIGENCE
                </span>

                <h3>
                  今日菜品表现
                </h3>
              </div>

              <button
                type="button"
              >
                查看全部

                <ChevronRight
                  size={15}
                />
              </button>

            </div>

            <div className="dishGrid">

              {dishes.map((dish) => (
                <div
                  className="dish"
                  key={dish.name}
                >

                  <div className="dishImage">

                    <img
                      src={dish.image}
                      alt={dish.name}
                    />

                    <b>

                      {dish.tag ===
                        "爆款" && (
                        <Flame
                          size={12}
                        />
                      )}

                      {dish.tag}

                    </b>

                  </div>

                  <div className="dishInfo">

                    <strong>
                      {dish.name}
                    </strong>

                    <div>

                      <span>
                        {dish.price}
                      </span>

                      <small>
                        {dish.sales}
                        份
                      </small>

                    </div>

                    <label>

                      毛利率

                      <em>
                        {dish.margin}
                      </em>

                    </label>

                  </div>

                </div>
              ))}

            </div>

          </div>

          {/* =================================================
              AI INSIGHT
          ================================================= */}

          <div className="panel alertPanel">

            <div className="panelHeader">

              <div>
                <span>
                  AI INSIGHT
                </span>

                <h3>
                  AI今日诊断
                </h3>
              </div>

              <Bot size={21} />

            </div>

            <div className="insight">

              <div className="insightIcon">
                <TrendingUp
                  size={19}
                />
              </div>

              <div>

                <strong>
                  营业额正在增长
                </strong>

                <p>
                  今日营业额较昨日增长
                  12.8%，其中招牌宫保鸡丁贡献明显。
                </p>

              </div>

            </div>

            <div className="insight warning">

              <div className="insightIcon">
                <AlertTriangle
                  size={19}
                />
              </div>

              <div>

                <strong>
                  发现一个经营机会
                </strong>

                <p>
                  高毛利菜品曝光不足，建议将招牌炒饭放入套餐。
                </p>

              </div>

            </div>

            <button
              type="button"
              className="fullButton"
              onClick={() => {

                setActive("ceo");

                document
                  .getElementById("ai")
                  ?.scrollIntoView({
                    behavior: "smooth",
                  });

              }}
            >
              让AI深度分析

              <ChevronRight
                size={16}
              />

            </button>

          </div>

        </section>

        {/* ===================================================
            AI PANEL
        =================================================== */}

        <section
          className="panel aiPanel"
          id="ai"
        >

          <div className="aiHeader">

            <div>

              <div className="aiBadge">

                <Sparkles size={14} />

                DEEPSEEK
                POWERED

              </div>

              <h3>
                AI经营顾问
              </h3>

              <p>
                把你的经营问题交给餐谋AI。
              </p>

              <div className="creditBadge">

                {remaining === -1
                  ? "PRO · 无限AI分析"
                  : `免费额度 · 剩余 ${remaining} 次`}

              </div>

            </div>

            <Bot size={34} />

          </div>

          {/* AI 输入 */}

          <div className="aiInput">

            <textarea
              value={question}
              onChange={(e) =>
                setQuestion(
                  e.target.value
                )
              }
              placeholder="例如：今天营业额下降了15%，帮我找出可能原因，并告诉我明天应该怎么做……"
              disabled={loading}
            />

            <button
              type="button"
              onClick={askAI}
              disabled={
                loading ||
                !question.trim()
              }
            >

              {loading
                ? "AI分析中..."
                : "开始分析"}

              <ArrowUpRight
                size={17}
              />

            </button>

          </div>

          {/* AI结果 */}

          {answer && (
            <div className="aiAnswer">

              <div className="answerTitle">

                <Bot size={18} />

                餐谋AI分析结果

              </div>

              <div className="answerBody">
                {answer}
              </div>

            </div>
          )}

        </section>

      </section>

      {/* =====================================================
          AUTH MODAL
      ===================================================== */}

      {showAuth && (
        <AuthModal
          onClose={() =>
            setShowAuth(false)
          }
          onSuccess={
            handleAuthSuccess
          }
        />
      )}

      {/* =====================================================
          PRO MODAL
      ===================================================== */}

      {showPro && (
        <ProModal
          onClose={() =>
            setShowPro(false)
          }
          onSuccess={
            handleProSuccess
          }
        />
      )}

    </main>
  );
}

/* =========================================================
   数据卡片
========================================================= */

function Stat({
  title,
  value,
  change,
  icon,
}: {
  title: string;
  value: string;
  change: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="stat">

      <div className="statIcon">
        {icon}
      </div>

      <div>

        <span>
          {title}
        </span>

        <strong>
          {value}
        </strong>

        <small>

          <ArrowUpRight
            size={12}
          />

          {change}

        </small>

      </div>

    </div>
  );
}
