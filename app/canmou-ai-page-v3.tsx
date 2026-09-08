"use client";

import {
  Bot, Utensils, MessageSquareWarning, Coins, TrendingUp, Package,
  Bell, ChevronRight, Sparkles, ArrowUpRight, Flame, AlertTriangle,
  ShoppingBag, BarChart3, LogOut, Target, CheckCircle2, Zap
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import ProModal from "@/components/ProModal";
import AuthModal from "@/components/AuthModal";
import { supabase } from "@/lib/supabase";

const tools = [
  { id: "ceo", name: "AI餐饮CEO", icon: Bot },
  { id: "menu", name: "菜单AI", icon: Utensils },
  { id: "review", name: "差评AI", icon: MessageSquareWarning },
  { id: "profit", name: "利润AI", icon: Coins },
  { id: "marketing", name: "营销AI", icon: TrendingUp },
  { id: "inventory", name: "库存AI", icon: Package },
];

const dishes = [
  { name: "招牌宫保鸡丁", price: "¥32", sales: "486", margin: "68%", image: "https://images.unsplash.com/photo-1603133872878-684f208fb84b?auto=format&fit=crop&w=600&q=85", tag: "爆款" },
  { name: "招牌炒饭", price: "¥18", sales: "392", margin: "74%", image: "https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=600&q=85", tag: "高毛利" },
  { name: "酸辣汤", price: "¥12", sales: "286", margin: "61%", image: "https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=600&q=85", tag: "稳定" },
];

type Diag = { revenue: string; orders: string; foodCost: string; commission: string; reviews: string; targetAov: string };

type Result = {
  score: number; aov: number; grossProfit: number | null; grossMargin: number | null;
  aovGap: number; opportunity: number; reviewRate: number; issue: string; priority: string;
};

export default function Home() {
  const [active, setActive] = useState("ceo");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [session, setSession] = useState<any>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [showPro, setShowPro] = useState(false);
  const [remaining, setRemaining] = useState(5);
  const [authLoading, setAuthLoading] = useState(true);
  const [diag, setDiag] = useState<Diag>({ revenue: "", orders: "", foodCost: "", commission: "", reviews: "", targetAov: "32" });
  const [diagResult, setDiagResult] = useState<Result | null>(null);
  const [diagLoading, setDiagLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function init() {
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        if (!mounted) return;
        setSession(currentSession);
        if (currentSession) await loadCredits(currentSession); else setRemaining(5);
      } catch (e) { console.error(e); }
      finally { if (mounted) setAuthLoading(false); }
    }
    init();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (!mounted) return;
      setSession(newSession);
      if (newSession) await loadCredits(newSession); else setRemaining(5);
    });
    return () => { mounted = false; subscription.unsubscribe(); };
  }, []);

  async function loadCredits(currentSession?: any) {
    const current = currentSession || session;
    if (!current?.user?.id) { setRemaining(5); return; }
    try {
      const { data: profile } = await supabase.from("profiles").select("plan").eq("id", current.user.id).maybeSingle();
      if (profile?.plan === "pro") { setRemaining(-1); return; }
      const { count, error } = await supabase.from("ai_usage").select("*", { count: "exact", head: true }).eq("user_id", current.user.id);
      if (!error) setRemaining(Math.max(0, 5 - (count || 0)));
    } catch (e) { console.error(e); }
  }

  function updateDiag(key: keyof Diag, value: string) {
    if (value !== "" && !/^\d*(\.\d*)?$/.test(value)) return;
    setDiag((v) => ({ ...v, [key]: value }));
    setDiagResult(null);
  }

  const localCalc = useMemo(() => {
    const revenue = Number(diag.revenue) || 0;
    const orders = Number(diag.orders) || 0;
    const foodCost = Number(diag.foodCost) || 0;
    const commission = Number(diag.commission) || 0;
    const reviews = Number(diag.reviews) || 0;
    const targetAov = Number(diag.targetAov) || 32;
    const aov = orders > 0 ? revenue / orders : 0;
    const hasProfitData = diag.foodCost.trim() !== "" && diag.commission.trim() !== "";
    const grossProfit = hasProfitData ? revenue - foodCost - commission : null;
    const grossMargin = hasProfitData && revenue > 0 ? ((grossProfit as number) / revenue) * 100 : null;
    const aovGap = Math.max(0, targetAov - aov);
    const opportunity = aovGap * orders;
    const reviewRate = orders > 0 ? (reviews / orders) * 100 : 0;
    let score = 80;
    if (aov > 0 && targetAov > 0) score += Math.max(-15, Math.min(10, ((aov / targetAov) - 1) * 30));
    if (grossMargin !== null) score += grossMargin >= 55 ? 7 : grossMargin < 40 ? -12 : -4;
    if (reviewRate > 3) score -= 10; else if (reviewRate > 1.5) score -= 5;
    score = Math.round(Math.max(0, Math.min(100, score)));
    let issue = "经营基本稳定，优先寻找增收机会";
    let priority = "优化客单价与套餐";
    if (grossMargin !== null && grossMargin < 40) { issue = "毛利率偏低，利润空间正在被成本吃掉"; priority = "先控成本，再做增收"; }
    else if (reviewRate > 3) { issue = "差评率偏高，正在影响复购与平台转化"; priority = "优先处理差评与服务问题"; }
    else if (aov > 0 && aov < targetAov) { issue = "客单价偏低，同样的订单量还有明显增收空间"; priority = "优化套餐与加购"; }
    return { revenue, orders, foodCost, commission, reviews, targetAov, aov, grossProfit, grossMargin, aovGap, opportunity, reviewRate, score, issue, priority };
  }, [diag]);

  async function diagnoseToday() {
    if (!diag.revenue || !diag.orders) return;
    const { data: { session: currentSession } } = await supabase.auth.getSession();
    if (!currentSession) { setShowAuth(true); return; }
    if (remaining === 0) { setShowPro(true); return; }
    const c = localCalc;
    const result: Result = { score: c.score, aov: c.aov, grossProfit: c.grossProfit, grossMargin: c.grossMargin, aovGap: c.aovGap, opportunity: c.opportunity, reviewRate: c.reviewRate, issue: c.issue, priority: c.priority };
    setDiagResult(result);
    setDiagLoading(true);
    setAnswer("");
    const prompt = `你是餐谋AI的AI餐饮CEO。请根据以下真实经营数据，为餐饮老板做“今日经营体检”。不要编造数据。\n今日营业额：¥${c.revenue.toFixed(2)}\n今日订单：${c.orders}\n客单价：¥${c.aov.toFixed(2)}\n目标客单价：¥${c.targetAov.toFixed(2)}\n食材成本：${diag.foodCost ? `¥${c.foodCost.toFixed(2)}` : "未提供"}\n平台佣金：${diag.commission ? `¥${c.commission.toFixed(2)}` : "未提供"}\n差评数：${c.reviews}\n差评率：${c.reviewRate.toFixed(2)}%\n${c.grossMargin !== null ? `毛利率：${c.grossMargin.toFixed(1)}%` : "毛利率：数据不足，不能计算"}\n系统初步判断：${c.issue}\n理论客单价增收空间：¥${c.opportunity.toFixed(2)}（仅为估算，不代表保证收入）\n\n请严格按以下结构回答：\n【经营判断】一句话说清今天最重要的问题\n【为什么】最多3条原因\n【今天做什么】给出3个可以今天执行的动作，具体到怎么做\n【预计影响】说明哪些指标可能改善，并明确这是估算\n【明天看什么】列出3个明天必须关注的数字。\n要求：中文、简洁、老板能直接照着做，避免空话。`;
    try {
      const res = await fetch("/api/ai", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${currentSession.access_token}` }, body: JSON.stringify({ tool: "ceo", message: prompt }) });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) { await supabase.auth.signOut(); setShowAuth(true); throw new Error("登录已失效，请重新登录。"); }
      if (res.status === 402) { setRemaining(0); setShowPro(true); return; }
      if (!res.ok) throw new Error(data?.error || "AI请求失败，请稍后再试。");
      setAnswer(data?.answer || "AI没有返回有效内容。");
      if (typeof data?.remaining === "number") setRemaining(data.remaining); else await loadCredits(currentSession);
    } catch (e: any) { setAnswer(e?.message || "请求失败，请稍后再试。"); }
    finally { setDiagLoading(false); }
  }

  async function askAI() {
    if (!question.trim() || loading) return;
    const { data: { session: currentSession } } = await supabase.auth.getSession();
    if (!currentSession) { setShowAuth(true); return; }
    if (remaining === 0) { setShowPro(true); return; }
    setLoading(true); setAnswer("");
    try {
      const res = await fetch("/api/ai", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${currentSession.access_token}` }, body: JSON.stringify({ tool: active, message: question.trim() }) });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) { await supabase.auth.signOut(); setSession(null); setShowAuth(true); throw new Error("登录已失效，请重新登录。"); }
      if (res.status === 402) { setRemaining(0); setShowPro(true); return; }
      if (!res.ok) throw new Error(data?.error || "AI请求失败，请稍后再试。");
      setAnswer(data?.answer || "AI没有返回有效内容。");
      if (typeof data?.remaining === "number") setRemaining(data.remaining); else await loadCredits(currentSession);
    } catch (e: any) { setAnswer(e?.message || "请求失败，请稍后再试。"); }
    finally { setLoading(false); }
  }

  async function logout() { await supabase.auth.signOut(); setSession(null); setRemaining(5); setAnswer(""); setQuestion(""); }
  async function handleAuthSuccess() { setShowAuth(false); const { data: { session: s } } = await supabase.auth.getSession(); setSession(s); if (s) await loadCredits(s); }
  async function handleProSuccess() { setShowPro(false); if (session) await loadCredits(session); }
  const email = session?.user?.email || "";
  const avatarLetter = email ? email.charAt(0).toUpperCase() : "餐";
  const money = (n: number | null) => n === null ? "—" : `¥${n.toLocaleString("zh-CN", { maximumFractionDigits: 0 })}`;

  return <main className="app">
    <aside className="sidebar">
      <div className="brand"><div className="brandLogo">谋</div><div><strong>餐谋AI</strong><span>Restaurant OS</span></div></div>
      <div className="sideLabel">AI 工作台</div>
      <nav>{tools.map((tool) => { const Icon = tool.icon; return <button key={tool.id} type="button" className={active === tool.id ? "sideItem active" : "sideItem"} onClick={() => setActive(tool.id)}><Icon size={18}/><span>{tool.name}</span>{active === tool.id && <i/>}</button>; })}</nav>
      <div className="sideBottom">
        <div className="proCard"><Sparkles size={17}/><strong>{remaining === -1 ? "PRO会员" : "升级 PRO"}</strong><p>{remaining === -1 ? "已解锁全部AI经营能力" : "解锁全部AI经营能力"}</p><button type="button" onClick={() => window.location.href="/pro"}>{remaining === -1 ? "查看会员" : "立即升级"}</button></div>
        {session ? <div className="account"><div className="avatar">{avatarLetter}</div><div style={{minWidth:0,flex:1}}><strong>我的餐厅</strong><span style={{display:"block",maxWidth:120,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{email}</span></div><button type="button" onClick={logout} title="退出登录" style={{border:0,background:"transparent",color:"#71847b",padding:4,cursor:"pointer"}}><LogOut size={15}/></button></div> : <button type="button" className="account" onClick={() => setShowAuth(true)} style={{width:"100%",border:0,background:"transparent",color:"inherit",textAlign:"left",cursor:"pointer"}}><div className="avatar">餐</div><div><strong>登录账户</strong><span>免费版 · 5次AI</span></div></button>}
      </div>
    </aside>

    <section className="content">
      <header className="topbar"><div><div className="breadcrumb">我的餐厅 / 经营驾驶舱</div><h1>早上好，老板 👋</h1></div><div className="topActions"><button type="button" className="iconButton"><Bell size={19}/></button><button type="button" className="dateButton">2026年9月8日</button>{!authLoading && (session ? <button type="button" className="accountButton" onClick={logout}><span>{avatarLetter}</span>退出</button> : <button type="button" className="loginButton" onClick={() => setShowAuth(true)}>登录 / 注册</button>)}</div></header>

      <section className="heroDashboard"><div className="heroText"><div className="status"><span/>DeepSeek AI 实时分析</div><h2>今天的生意，<br/><em>AI帮你盯着。</em></h2><p>从营业额、菜单、利润到差评，餐谋AI每天帮你发现经营机会。</p><button type="button" className="heroButton" onClick={() => document.getElementById("diagnosis")?.scrollIntoView({behavior:"smooth"})}>开始今日体检 <ArrowUpRight size={17}/></button></div><div className="heroImage"><img src="https://images.unsplash.com/photo-1515003197210-e0cd71810b5f?auto=format&fit=crop&w=1200&q=90" alt="餐厅"/><div className="imageOverlay"><span>今日经营状态</span><strong>{diagResult ? (diagResult.score >= 80 ? "良好" : diagResult.score >= 60 ? "需要关注" : "需要干预") : "待体检"}</strong><small>{diagResult ? `AI经营评分 ${diagResult.score}` : "输入今日数据开始分析"}</small></div></div></section>

      <section className="stats"><Stat title="今日营业额" value="¥8,620" change="+12.8%" icon={<Coins/>}/><Stat title="今日订单" value="386" change="+8.4%" icon={<ShoppingBag/>}/><Stat title="客单价" value="¥22.33" change="+3.2%" icon={<BarChart3/>}/><Stat title="预计毛利" value="¥4,921" change="+15.7%" icon={<TrendingUp/>}/></section>

      <section className="panel" id="diagnosis" style={{marginBottom:24,padding:24,borderRadius:22}}>
        <div className="panelHeader"><div><span>DAILY BUSINESS CHECK</span><h3>今日经营体检</h3><p style={{margin:"6px 0 0",color:"#71847b"}}>填入今天真实数据，先算清楚，再让AI告诉你怎么做。</p></div><Target size={24}/></div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,minmax(0,1fr))",gap:14,marginTop:20}}>
          <DiagInput label="今日营业额" value={diag.revenue} onChange={(v)=>updateDiag("revenue",v)} placeholder="例如 8620" suffix="元"/>
          <DiagInput label="今日订单" value={diag.orders} onChange={(v)=>updateDiag("orders",v)} placeholder="例如 386" suffix="单"/>
          <DiagInput label="目标客单价" value={diag.targetAov} onChange={(v)=>updateDiag("targetAov",v)} placeholder="例如 32" suffix="元"/>
          <DiagInput label="食材成本" value={diag.foodCost} onChange={(v)=>updateDiag("foodCost",v)} placeholder="可选" suffix="元"/>
          <DiagInput label="平台佣金" value={diag.commission} onChange={(v)=>updateDiag("commission",v)} placeholder="可选" suffix="元"/>
          <DiagInput label="差评数" value={diag.reviews} onChange={(v)=>updateDiag("reviews",v)} placeholder="例如 3" suffix="条"/>
        </div>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:16,marginTop:20,flexWrap:"wrap"}}>
          <div style={{fontSize:13,color:"#71847b"}}>免费版剩余：{remaining === -1 ? "PRO无限" : `${remaining} 次`} · 毛利率需要同时填写食材成本和平台佣金</div>
          <button type="button" className="fullButton" onClick={diagnoseToday} disabled={diagLoading || !diag.revenue || !diag.orders} style={{maxWidth:260,opacity:diagLoading || !diag.revenue || !diag.orders ? .55 : 1}}>{diagLoading ? "AI正在体检..." : "开始今日经营体检"}<ArrowUpRight size={16}/></button>
        </div>
      </section>

      {diagResult && <section style={{marginBottom:24}}>
        <div style={{display:"grid",gridTemplateColumns:"1.15fr 1fr 1fr 1fr",gap:14}}>
          <MetricCard label="经营评分" value={`${diagResult.score}`} suffix="/100" emphasis/><MetricCard label="今日客单价" value={`¥${diagResult.aov.toFixed(2)}`} suffix={diagResult.aovGap > 0 ? `差 ¥${diagResult.aovGap.toFixed(2)}` : "达标"}/><MetricCard label="预计毛利" value={money(diagResult.grossProfit)} suffix={diagResult.grossMargin === null ? "数据不足" : `${diagResult.grossMargin.toFixed(1)}%`}/><MetricCard label="理论增收空间" value={money(diagResult.opportunity)} suffix="估算"/>
        </div>
        <div className="panel" style={{marginTop:14,padding:24,borderRadius:22}}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:18}}><div style={{width:38,height:38,borderRadius:12,display:"grid",placeItems:"center",background:"#edf7f1"}}><AlertTriangle size={19}/></div><div><div style={{fontSize:12,letterSpacing:1.2,color:"#71847b"}}>TOP ISSUE</div><h3 style={{margin:2}}>今天最该解决的问题</h3></div></div>
          <div style={{fontSize:20,fontWeight:800,marginBottom:8}}>{diagResult.issue}</div>
          <div style={{display:"inline-flex",alignItems:"center",gap:6,padding:"7px 10px",borderRadius:999,background:"#f4f7f5",fontSize:13,fontWeight:700}}><Zap size={14}/>优先级：{localCalc.priority}</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,minmax(0,1fr))",gap:12,marginTop:20}}>
            <ActionCard n="01" text={diagResult.aovGap > 0 ? `把套餐/加购设计到 ¥${diagResult.targetAov} 左右，先提高客单价。` : "继续保持当前客单价，同时测试高毛利加购。"}/>
            <ActionCard n="02" text={diagResult.reviewRate > 3 ? "逐条处理高频差评原因，优先解决重复出现的问题。" : "检查高毛利菜品曝光，增加套餐和加购入口。"}/>
            <ActionCard n="03" text={diagResult.grossMargin !== null && diagResult.grossMargin < 40 ? "逐项核对食材成本和平台扣点，先砍掉低毛利损耗。" : "明天继续记录营业额、订单、客单价，验证今天的调整。"}/>
          </div>
        </div>
      </section>}

      <section className="mainGrid"><div className="panel menuPanel"><div className="panelHeader"><div><span>MENU INTELLIGENCE</span><h3>今日菜品表现</h3></div><button type="button">查看全部 <ChevronRight size={15}/></button></div><div className="dishGrid">{dishes.map((dish)=><div className="dish" key={dish.name}><div className="dishImage"><img src={dish.image} alt={dish.name}/><b>{dish.tag === "爆款" && <Flame size={12}/>} {dish.tag}</b></div><div className="dishInfo"><strong>{dish.name}</strong><div><span>{dish.price}</span><small>{dish.sales}份</small></div><label>毛利率 <em>{dish.margin}</em></label></div></div>)}</div></div>
      <div className="panel alertPanel"><div className="panelHeader"><div><span>AI INSIGHT</span><h3>AI今日诊断</h3></div><Bot size={21}/></div><div className="insight"><div className="insightIcon"><TrendingUp size={19}/></div><div><strong>营业额正在增长</strong><p>今日营业额较昨日增长12.8%，其中招牌宫保鸡丁贡献明显。</p></div></div><div className="insight warning"><div className="insightIcon"><AlertTriangle size={19}/></div><div><strong>发现一个经营机会</strong><p>高毛利菜品曝光不足，建议将招牌炒饭放入套餐。</p></div></div><button type="button" className="fullButton" onClick={()=>document.getElementById("diagnosis")?.scrollIntoView({behavior:"smooth"})}>用真实数据深度分析 <ChevronRight size={16}/></button></div></section>

      <section className="panel aiPanel" id="ai"><div className="aiHeader"><div><div className="aiBadge"><Sparkles size={14}/>DEEPSEEK POWERED</div><h3>AI经营顾问</h3><p>把你的经营问题交给餐谋AI。</p><div className="creditBadge">{remaining === -1 ? "PRO · 无限AI分析" : `免费额度 · 剩余 ${remaining} 次`}</div></div><Bot size={34}/></div><div className="aiInput"><textarea value={question} onChange={(e)=>setQuestion(e.target.value)} placeholder="例如：今天营业额下降了15%，帮我找出可能原因，并告诉我明天应该怎么做……" disabled={loading}/><button type="button" onClick={askAI} disabled={loading || !question.trim()}>{loading ? "AI分析中..." : "开始分析"}<ArrowUpRight size={17}/></button></div>{answer && <div className="aiAnswer"><div className="answerTitle"><Bot size={18}/>餐谋AI分析结果</div><div className="answerBody" style={{whiteSpace:"pre-wrap"}}>{answer}</div></div>}</section>
    </section>
    {showAuth && <AuthModal onClose={()=>setShowAuth(false)} onSuccess={handleAuthSuccess}/>} {showPro && <ProModal onClose={()=>setShowPro(false)} onSuccess={handleProSuccess}/>} 
  </main>;
}

function DiagInput({label,value,onChange,placeholder,suffix}:{label:string;value:string;onChange:(v:string)=>void;placeholder:string;suffix:string}) { return <label style={{display:"block"}}><span style={{display:"block",fontSize:13,fontWeight:700,marginBottom:7,color:"#3e5149"}}>{label}</span><div style={{display:"flex",alignItems:"center",border:"1px solid #dce6e1",borderRadius:12,background:"#fff",padding:"0 12px"}}><input inputMode="decimal" value={value} onChange={(e)=>onChange(e.target.value)} placeholder={placeholder} style={{width:"100%",height:46,border:0,outline:0,background:"transparent",fontSize:15}}/><span style={{fontSize:12,color:"#8a9a93"}}>{suffix}</span></div></label>; }
function MetricCard({label,value,suffix,emphasis=false}:{label:string;value:string;suffix:string;emphasis?:boolean}) { return <div style={{background:"#fff",border:"1px solid #e5ece8",borderRadius:18,padding:"18px 16px",boxShadow:"0 5px 18px rgba(25,50,40,.04)"}}><div style={{fontSize:12,color:"#71847b",marginBottom:8}}>{label}</div><strong style={{fontSize:emphasis?34:24,lineHeight:1.1}}>{value}</strong><div style={{fontSize:12,color:"#8a9a93",marginTop:7}}>{suffix}</div></div>; }
function ActionCard({n,text}:{n:string;text:string}) { return <div style={{padding:16,borderRadius:15,background:"#f7faf8",border:"1px solid #e7eee9"}}><div style={{fontSize:12,fontWeight:800,letterSpacing:1,color:"#6c8077",marginBottom:8}}>{n}</div><div style={{fontSize:14,lineHeight:1.7}}><CheckCircle2 size={15} style={{verticalAlign:"-3px",marginRight:5}}/>{text}</div></div>; }
function Stat({title,value,change,icon}:{title:string;value:string;change:string;icon:React.ReactNode}) { return <div className="stat"><div className="statIcon">{icon}</div><div><span>{title}</span><strong>{value}</strong><small><ArrowUpRight size={12}/>{change}</small></div></div>; }
