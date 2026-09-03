"use client";

import { useState } from "react";
import {
  Bot,
  ChevronRight,
  Coins,
  MessageSquareWarning,
  Package,
  Sparkles,
  Utensils,
  TrendingUp
} from "lucide-react";

const tools = [
  {
    id: "ceo",
    title: "AI餐饮CEO",
    desc: "全局分析餐厅经营问题",
    icon: Bot
  },
  {
    id: "menu",
    title: "菜单优化",
    desc: "分析爆款、利润和菜品结构",
    icon: Utensils
  },
  {
    id: "review",
    title: "差评处理",
    desc: "自动诊断差评并生成回复",
    icon: MessageSquareWarning
  },
  {
    id: "profit",
    title: "利润分析",
    desc: "计算真实利润与成本结构",
    icon: Coins
  },
  {
    id: "marketing",
    title: "营销增长",
    desc: "生成餐饮营销和短视频方案",
    icon: TrendingUp
  },
  {
    id: "inventory",
    title: "库存助手",
    desc: "库存、采购和缺货预测",
    icon: Package
  }
];

export default function Home() {
  const [active, setActive] = useState("ceo");
  const [input, setInput] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);

  const current = tools.find((item) => item.id === active)!;

  async function askAI() {
    if (!input.trim() || loading) return;

    setLoading(true);
    setAnswer("");

    try {
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          tool: active,
          message: input
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "AI请求失败");
      }

      setAnswer(data.answer);
    } catch (error: any) {
      setAnswer("请求失败：" + error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main>
      <nav className="nav">
        <div className="brand">
          <div className="logo">谋</div>

          <div>
            <strong>餐谋AI</strong>
            <small>AI餐饮经营增长平台</small>
          </div>
        </div>

        <div className="navLinks">
          <a href="#tools">AI工具</a>
          <a href="#about">经营闭环</a>
          <button>登录 / 注册</button>
        </div>
      </nav>

      <section className="hero">
        <div className="eyebrow">
          <Sparkles size={15} />
          DEEPSEEK AI POWERED
        </div>

        <h1>
          让AI成为你的
          <br />
          <span>餐饮经营团队</span>
        </h1>

        <p>
          从菜单、利润、差评、库存到营销，
          <br />
          餐谋AI帮助餐饮老板做出更快、更准确的经营决策。
        </p>

        <div className="workspace">
          <div className="workspaceTop">
            <div>
              <small>当前AI员工</small>
              <h2>{current.title}</h2>
            </div>

            <div className="online">
              <i />
              DeepSeek 在线
            </div>
          </div>

          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              current.desc +
              "。例如：今天营业额下降18%，帮我分析原因。"
            }
          />

          <div className="workspaceBottom">
            <div className="chips">
              {tools.slice(0, 3).map((tool) => (
                <button
                  key={tool.id}
                  className={active === tool.id ? "chip active" : "chip"}
                  onClick={() => setActive(tool.id)}
                >
                  {tool.title}
                </button>
              ))}
            </div>

            <button
              className="send"
              onClick={askAI}
              disabled={loading}
            >
              {loading ? "AI分析中..." : "开始分析"}
              <ChevronRight size={17} />
            </button>
          </div>

          {answer && (
            <div className="answer">
              <div className="answerTitle">
                <Bot size={18} />
                餐谋AI分析结果
              </div>

              <div className="answerText">
                {answer}
              </div>
            </div>
          )}
        </div>
      </section>

      <section id="tools" className="toolsSection">
        <div className="sectionTitle">
          <small>AI WORKFORCE</small>
          <h2>一套系统，覆盖餐厅经营核心环节</h2>
          <p>
            不只是聊天机器人，而是可以参与经营决策的AI工作台。
          </p>
        </div>

        <div className="toolGrid">
          {tools.map((tool) => {
            const Icon = tool.icon;

            return (
              <button
                className="toolCard"
                key={tool.id}
                onClick={() => {
                  setActive(tool.id);
                  window.scrollTo({
                    top: 0,
                    behavior: "smooth"
                  });
                }}
              >
                <div className="toolIcon">
                  <Icon size={22} />
                </div>

                <h3>{tool.title}</h3>

                <p>{tool.desc}</p>

                <span>
                  立即使用
                  <ChevronRight size={15} />
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section id="about" className="about">
        <div>
          <small>经营闭环</small>

          <h2>
            从“问AI”
            <br />
            到“AI帮你经营”
          </h2>
        </div>

        <div className="steps">
          <div>
            <b>01</b>
            <h3>输入数据</h3>
            <p>营业额、订单、菜品、成本、差评等。</p>
          </div>

          <div>
            <b>02</b>
            <h3>DeepSeek分析</h3>
            <p>AI拆解问题并找到经营关键变量。</p>
          </div>

          <div>
            <b>03</b>
            <h3>执行方案</h3>
            <p>告诉你今天应该做什么，以及为什么。</p>
          </div>
        </div>
      </section>

      <footer>
        <div className="brand">
          <div className="logo">谋</div>
          <strong>餐谋AI</strong>
        </div>

        <span>AI餐饮经营增长平台</span>
      </footer>
    </main>
  );
}
