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
} from "lucide-react";

import { useState } from "react";

const tools = [
  { id: "ceo", name: "AI餐饮CEO", icon: Bot },
  { id: "menu", name: "菜单AI", icon: Utensils },
  { id: "review", name: "差评AI", icon: MessageSquareWarning },
  { id: "profit", name: "利润AI", icon: Coins },
  { id: "marketing", name: "营销AI", icon: TrendingUp },
  { id: "inventory", name: "库存AI", icon: Package },
];

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

export default function Home() {
  const [active, setActive] = useState("ceo");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);

  async function askAI() {
    if (!question.trim() || loading) return;

    setLoading(true);
    setAnswer("");

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tool: active,
          message: question,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "AI请求失败");
      }

      setAnswer(data.answer);
    } catch (error: any) {
      setAnswer(error.message || "请求失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="brandLogo">谋</div>
          <div>
            <strong>餐谋AI</strong>
            <span>Restaurant OS</span>
          </div>
        </div>

        <div className="sideLabel">AI 工作台</div>

        <nav>
          {tools.map((tool) => {
            const Icon = tool.icon;

            return (
              <button
                key={tool.id}
                className={active === tool.id ? "sideItem active" : "sideItem"}
                onClick={() => setActive(tool.id)}
              >
                <Icon size={18} />
                <span>{tool.name}</span>
                {active === tool.id && <i />}
              </button>
            );
          })}
        </nav>

        <div className="sideBottom">
          <div className="proCard">
            <Sparkles size={17} />
            <strong>升级 PRO</strong>
            <p>解锁全部AI经营能力</p>
            <button>立即升级</button>
          </div>

          <div className="account">
            <div className="avatar">餐</div>
            <div>
              <strong>我的餐厅</strong>
              <span>免费版</span>
            </div>
          </div>
        </div>
      </aside>

      <section className="content">
        <header className="topbar">
          <div>
            <div className="breadcrumb">我的餐厅 / 经营驾驶舱</div>
            <h1>早上好，老板 👋</h1>
          </div>

          <div className="topActions">
            <button className="iconButton">
              <Bell size={19} />
            </button>

            <button className="dateButton">
              2026年9月3日
            </button>
          </div>
        </header>

        <section className="heroDashboard">
          <div className="heroText">
            <div className="status">
              <span />
              DeepSeek AI 实时分析
            </div>

            <h2>
              今天的生意，
              <br />
              <em>AI帮你盯着。</em>
            </h2>

            <p>
              从营业额、菜单、利润到差评，
              餐谋AI每天帮你发现经营机会。
            </p>

            <button
              className="heroButton"
              onClick={() =>
                document
                  .getElementById("ai")
                  ?.scrollIntoView({ behavior: "smooth" })
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
              <span>今日经营状态</span>
              <strong>良好</strong>
              <small>AI综合评分 87</small>
            </div>
          </div>
        </section>

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

        <section className="mainGrid">
          <div className="panel menuPanel">
            <div className="panelHeader">
              <div>
                <span>MENU INTELLIGENCE</span>
                <h3>今日菜品表现</h3>
              </div>

              <button>
                查看全部 <ChevronRight size={15} />
              </button>
            </div>

            <div className="dishGrid">
              {dishes.map((dish) => (
                <div className="dish" key={dish.name}>
                  <div className="dishImage">
                    <img src={dish.image} alt={dish.name} />
                    <b>
                      {dish.tag === "爆款" && <Flame size={12} />}
                      {dish.tag}
                    </b>
                  </div>

                  <div className="dishInfo">
                    <strong>{dish.name}</strong>

                    <div>
                      <span>{dish.price}</span>
                      <small>{dish.sales}份</small>
                    </div>

                    <label>
                      毛利率 <em>{dish.margin}</em>
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="panel alertPanel">
            <div className="panelHeader">
              <div>
                <span>AI INSIGHT</span>
                <h3>AI今日诊断</h3>
              </div>

              <Bot size={21} />
            </div>

            <div className="insight">
              <div className="insightIcon">
                <TrendingUp size={19} />
              </div>

              <div>
                <strong>营业额正在增长</strong>
                <p>
                  今日营业额较昨日增长 12.8%，
                  其中招牌宫保鸡丁贡献明显。
                </p>
              </div>
            </div>

            <div className="insight warning">
              <div className="insightIcon">
                <AlertTriangle size={19} />
              </div>

              <div>
                <strong>发现一个经营机会</strong>
                <p>
                  高毛利菜品曝光不足，建议将招牌炒饭放入套餐。
                </p>
              </div>
            </div>

            <button
              className="fullButton"
              onClick={() => {
                setActive("ceo");
                document
                  .getElementById("ai")
                  ?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              让AI深度分析
              <ChevronRight size={16} />
            </button>
          </div>
        </section>

        <section className="panel aiPanel" id="ai">
          <div className="aiHeader">
            <div>
              <div className="aiBadge">
                <Sparkles size={14} />
                DEEPSEEK POWERED
              </div>

              <h3>AI经营顾问</h3>

              <p>
                把你的经营问题交给餐谋AI。
              </p>
            </div>

            <Bot size={34} />
          </div>

          <div className="aiInput">
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="例如：今天营业额下降了15%，帮我找出可能原因，并告诉我明天应该怎么做……"
            />

            <button onClick={askAI} disabled={loading}>
              {loading ? "AI分析中..." : "开始分析"}
              <ArrowUpRight size={17} />
            </button>
          </div>

          {answer && (
            <div className="aiAnswer">
              <div className="answerTitle">
                <Bot size={18} />
                餐谋AI分析结果
              </div>

              <div className="answerBody">{answer}</div>
            </div>
          )}
        </section>
      </section>
    </main>
  );
}

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
      <div className="statIcon">{icon}</div>

      <div>
        <span>{title}</span>
        <strong>{value}</strong>

        <small>
          <ArrowUpRight size={12} />
          {change}
        </small>
      </div>
    </div>
  );
}
