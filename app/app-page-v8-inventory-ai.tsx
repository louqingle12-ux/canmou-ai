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
  score: number; aov: number; targetAov: number; grossProfit: number | null; grossMargin: number | null;
  aovGap: number; opportunity: number; reviewRate: number; issue: string; priority: string;
};

type MenuDishInput = { id: number; name: string; price: string; cost: string; sales: string };

type MenuResult = {
  totalSales: number;
  totalRevenue: number;
  totalGrossProfit: number;
  avgMargin: number;
  best: string;
  worst: string;
};

type ReviewResult = {
  review: string;
  reply: string;
  severity: "高" | "中" | "低";
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
  const [menuDishes, setMenuDishes] = useState<MenuDishInput[]>([
    { id: 1, name: "招牌宫保鸡丁", price: "32", cost: "10", sales: "486" },
    { id: 2, name: "招牌炒饭", price: "18", cost: "5", sales: "392" },
    { id: 3, name: "酸辣汤", price: "12", cost: "4.7", sales: "286" },
  ]);
  const [menuResult, setMenuResult] = useState<MenuResult | null>(null);
  const [menuAnswer, setMenuAnswer] = useState("");
  const [menuLoading, setMenuLoading] = useState(false);
  const [reviewText, setReviewText] = useState("");
  const [reviewResult, setReviewResult] = useState<ReviewResult | null>(null);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [profit, setProfit] = useState({ revenue: "", foodCost: "", commission: "", labor: "", rent: "", other: "" });
  const [profitResult, setProfitResult] = useState<any>(null);
  const [profitAnswer, setProfitAnswer] = useState("");
  const [profitLoading, setProfitLoading] = useState(false);
  const [marketing, setMarketing] = useState({ goal: "提升复购", budget: "300", aov: "32", targetOrders: "50" });
  const [marketingResult, setMarketingResult] = useState<any>(null);
  const [marketingAnswer, setMarketingAnswer] = useState("");
  const [marketingLoading, setMarketingLoading] = useState(false);
  const [inventory, setInventory] = useState({ material: "鸡腿肉", stock: "80", dailyUse: "18", unitCost: "12", leadDays: "2", shelfDays: "3" });
  const [inventoryResult, setInventoryResult] = useState<any>(null);
  const [inventoryAnswer, setInventoryAnswer] = useState("");
  const [inventoryLoading, setInventoryLoading] = useState(false);

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
    const result: Result = { score: c.score, aov: c.aov, targetAov: c.targetAov, grossProfit: c.grossProfit, grossMargin: c.grossMargin, aovGap: c.aovGap, opportunity: c.opportunity, reviewRate: c.reviewRate, issue: c.issue, priority: c.priority };
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

  function updateMenuDish(id: number, key: keyof Omit<MenuDishInput, "id">, value: string) {
    setMenuDishes(prev => prev.map(d => d.id === id ? { ...d, [key]: value } : d));
  }

  function addMenuDish() {
    setMenuDishes(prev => [...prev, { id: Date.now(), name: "", price: "", cost: "", sales: "" }]);
  }

  function removeMenuDish(id: number) {
    setMenuDishes(prev => prev.length <= 1 ? prev : prev.filter(d => d.id !== id));
  }

  async function analyzeMenu() {
    const valid = menuDishes.filter(d => d.name.trim() && Number(d.price) > 0 && Number(d.cost) >= 0 && Number(d.sales) > 0);
    if (!valid.length || menuLoading) return;
    const { data: { session: currentSession } } = await supabase.auth.getSession();
    if (!currentSession) { setShowAuth(true); return; }
    if (remaining === 0) { setShowPro(true); return; }

    const rows = valid.map(d => {
      const price = Number(d.price), cost = Number(d.cost), sales = Number(d.sales);
      const margin = price > 0 ? ((price - cost) / price) * 100 : 0;
      const grossProfit = (price - cost) * sales;
      return { ...d, price, cost, sales, margin, grossProfit, revenue: price * sales };
    });
    const totalSales = rows.reduce((sum, d) => sum + d.sales, 0);
    const totalRevenue = rows.reduce((sum, d) => sum + d.revenue, 0);
    const totalGrossProfit = rows.reduce((sum, d) => sum + d.grossProfit, 0);
    const avgMargin = totalRevenue > 0 ? (totalGrossProfit / totalRevenue) * 100 : 0;
    const best = [...rows].sort((a,b) => b.grossProfit - a.grossProfit)[0]?.name || "—";
    const worst = [...rows].sort((a,b) => a.grossProfit - b.grossProfit)[0]?.name || "—";
    setMenuResult({ totalSales, totalRevenue, totalGrossProfit, avgMargin, best, worst });
    setMenuLoading(true);
    setMenuAnswer("");

    const prompt = `你是餐谋AI的菜单经营专家。请只根据下面真实菜品数据分析，不要编造数据。\n\n${rows.map((d,i)=>`${i+1}. ${d.name}｜售价¥${d.price.toFixed(2)}｜单份食材成本¥${d.cost.toFixed(2)}｜销量${d.sales}份｜单份毛利率${d.margin.toFixed(1)}%｜累计销售额¥${d.revenue.toFixed(2)}｜累计毛利¥${d.grossProfit.toFixed(2)}`).join("\n")}\n\n合计销量：${totalSales}份\n合计销售额：¥${totalRevenue.toFixed(2)}\n合计毛利：¥${totalGrossProfit.toFixed(2)}\n加权平均毛利率：${avgMargin.toFixed(1)}%\n\n请严格输出：\n【菜单判断】一句话说清菜单目前最大问题\n【赚钱菜】指出1-2个最值得重点推广的菜，并说明理由\n【低利润菜】指出1-2个需要优化的菜，说明问题在哪里\n【价格建议】只在数据足够时给出具体涨价/套餐建议，不确定就明确说需要更多数据\n【今天怎么改】给老板3个可以今天执行的动作\n【利润机会】只能基于现有数据做估算，并明确“估算”\n要求：中文、直接、具体，不说空话，不虚构销量、成本或顾客反馈。`;
    try {
      const res = await fetch("/api/ai", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${currentSession.access_token}` }, body: JSON.stringify({ tool: "menu", message: prompt }) });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) { await supabase.auth.signOut(); setSession(null); setShowAuth(true); throw new Error("登录已失效，请重新登录。"); }
      if (res.status === 402) { setRemaining(0); setShowPro(true); return; }
      if (!res.ok) throw new Error(data?.error || "菜单分析失败，请稍后再试。");
      setMenuAnswer(data?.answer || "AI没有返回有效内容。");
      if (typeof data?.remaining === "number") setRemaining(data.remaining); else await loadCredits(currentSession);
    } catch (e: any) { setMenuAnswer(e?.message || "请求失败，请稍后再试。"); }
    finally { setMenuLoading(false); }
  }

  async function analyzeReview() {
    const text = reviewText.trim();
    if (!text || reviewLoading) return;
    const { data: { session: currentSession } } = await supabase.auth.getSession();
    if (!currentSession) { setShowAuth(true); return; }
    if (remaining === 0) { setShowPro(true); return; }

    setReviewLoading(true);
    setReviewResult(null);
    const prompt = `你是餐谋AI的外卖差评处理专家。请分析下面这条真实顾客差评。不要编造事实，不要承诺无法确认的赔偿。

顾客差评：${text}

请严格按以下结构输出：
【问题判断】用一句话判断顾客最核心的不满。
【问题类型】从服务、出餐速度、口味、分量、包装、卫生、价格、配送、其他中选择最符合的1-2项。
【建议回复】写一段可以直接复制给顾客的回复，语气真诚、克制，不推卸责任，不要出现“亲”“宝贝”等套话；如果责任不明确，使用中性表达。
【店铺整改】给老板3个今天可以执行的动作。
【优先级】高/中/低，并说明为什么。
要求：中文、具体、简洁。不要虚构订单信息、赔偿金额、员工姓名或顾客身份。`;

    try {
      const res = await fetch("/api/ai", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${currentSession.access_token}` }, body: JSON.stringify({ tool: "review", message: prompt }) });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) { await supabase.auth.signOut(); setSession(null); setShowAuth(true); throw new Error("登录已失效，请重新登录。"); }
      if (res.status === 402) { setRemaining(0); setShowPro(true); return; }
      if (!res.ok) throw new Error(data?.error || "差评分析失败，请稍后再试。");
      const aiText = data?.answer || "AI没有返回有效内容。";
      const severity = /【优先级】[^\n]*(高)/.test(aiText) ? "高" : /【优先级】[^\n]*(中)/.test(aiText) ? "中" : "低";
      const replyMatch = aiText.match(/【建议回复】\s*([\s\S]*?)(?=\n【|$)/);
      setReviewResult({ review: text, reply: replyMatch?.[1]?.trim() || aiText, severity: severity as ReviewResult["severity"] });
      if (typeof data?.remaining === "number") setRemaining(data.remaining); else await loadCredits(currentSession);
    } catch (e: any) {
      setReviewResult({ review: text, reply: e?.message || "请求失败，请稍后再试。", severity: "中" });
    } finally { setReviewLoading(false); }
  }

  function updateProfit(key: keyof typeof profit, value: string) {
    if (value !== "" && !/^\d*(\.\d*)?$/.test(value)) return;
    setProfit(v => ({ ...v, [key]: value }));
    setProfitResult(null);
  }

  async function analyzeProfit() {
    if (!profit.revenue || profitLoading) return;
    const { data: { session: currentSession } } = await supabase.auth.getSession();
    if (!currentSession) { setShowAuth(true); return; }
    if (remaining === 0) { setShowPro(true); return; }
    const revenue = Number(profit.revenue) || 0;
    const foodCost = Number(profit.foodCost) || 0;
    const commission = Number(profit.commission) || 0;
    const labor = Number(profit.labor) || 0;
    const rent = Number(profit.rent) || 0;
    const other = Number(profit.other) || 0;
    const grossProfit = revenue - foodCost - commission;
    const totalCost = foodCost + commission + labor + rent + other;
    const netProfit = revenue - totalCost;
    const margin = revenue > 0 ? netProfit / revenue * 100 : 0;
    const costRate = revenue > 0 ? totalCost / revenue * 100 : 0;
    const items = [
      ["食材成本", foodCost], ["平台佣金", commission], ["人工成本", labor], ["房租", rent], ["其他成本", other]
    ].sort((a,b) => Number(b[1]) - Number(a[1]));
    const biggest = items[0];
    const result = { revenue, foodCost, commission, labor, rent, other, grossProfit, totalCost, netProfit, margin, costRate, biggestName: biggest[0] as string, biggestCost: Number(biggest[1]) };
    setProfitResult(result);
    setProfitLoading(true);
    setProfitAnswer("");
    const prompt = `你是餐谋AI利润经营专家。请根据以下真实经营数据，帮餐饮老板找出利润问题。不要编造数据。
营业额：¥${revenue.toFixed(2)}
食材成本：¥${foodCost.toFixed(2)}
平台佣金：¥${commission.toFixed(2)}
人工成本：¥${labor.toFixed(2)}
房租：¥${rent.toFixed(2)}
其他成本：¥${other.toFixed(2)}
系统计算总成本：¥${totalCost.toFixed(2)}
系统计算利润：¥${netProfit.toFixed(2)}
利润率：${margin.toFixed(1)}%
最大成本项：${biggest[0]} ¥${Number(biggest[1]).toFixed(2)}

严格按以下结构回答：
【利润判断】一句话判断当前利润状态
【钱花在哪里】指出最大的2个成本压力
【降本增利】给出3个今天可以执行的动作，必须具体
【每月利润机会】只能基于已有数据做合理估算，并明确是假设
【明天看什么】列出3个关键数字。
要求：中文、简洁、数字优先，不说空话。`;
    try {
      const res = await fetch("/api/ai", { method:"POST", headers:{"Content-Type":"application/json", Authorization:`Bearer ${currentSession.access_token}`}, body:JSON.stringify({tool:"profit", message:prompt}) });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) { await supabase.auth.signOut(); setSession(null); setShowAuth(true); throw new Error("登录已失效，请重新登录。"); }
      if (res.status === 402) { setRemaining(0); setShowPro(true); return; }
      if (!res.ok) throw new Error(data?.error || "利润分析失败，请稍后再试。");
      setProfitAnswer(data?.answer || "AI没有返回有效内容。");
      if (typeof data?.remaining === "number") setRemaining(data.remaining); else await loadCredits(currentSession);
    } catch (e:any) { setProfitAnswer(e?.message || "请求失败，请稍后再试。"); }
    finally { setProfitLoading(false); }
  }

  function updateMarketing(key: keyof typeof marketing, value: string) {
    if ((key === "budget" || key === "aov" || key === "targetOrders") && value !== "" && !/^\d*(\.\d*)?$/.test(value)) return;
    setMarketing(v => ({ ...v, [key]: value }));
    setMarketingResult(null);
  }

  async function analyzeMarketing() {
    if (!marketing.budget || !marketing.aov || !marketing.targetOrders || marketingLoading) return;
    const { data: { session: currentSession } } = await supabase.auth.getSession();
    if (!currentSession) { setShowAuth(true); return; }
    if (remaining === 0) { setShowPro(true); return; }
    const budget = Number(marketing.budget) || 0;
    const aov = Number(marketing.aov) || 0;
    const targetOrders = Number(marketing.targetOrders) || 0;
    const grossRevenue = aov * targetOrders;
    const promoCost = budget;
    const estimatedRevenueAfterPromo = Math.max(0, grossRevenue - promoCost);
    const result = { goal: marketing.goal, budget, aov, targetOrders, grossRevenue, promoCost, estimatedRevenueAfterPromo };
    setMarketingResult(result);
    setMarketingLoading(true);
    setMarketingAnswer("");
    const prompt = `你是餐谋AI营销经营专家。请为餐饮老板设计一个小预算、可执行、尽量不亏钱的营销活动。不要编造平台流量、转化率或顾客数据。

活动目标：${marketing.goal}
营销预算上限：¥${budget.toFixed(2)}
当前客单价：¥${aov.toFixed(2)}
目标订单数：${targetOrders}
按当前客单价计算的目标营业额：¥${grossRevenue.toFixed(2)}

请严格按以下结构回答：
【活动方案】给出一个具体活动，说明门槛、优惠和适用人群
【为什么这样设计】最多3条，重点说明如何避免无效优惠
【预算控制】说明预算怎么分配，并明确估算前提
【预计结果】只能基于现有数据做情景估算，分别说明保守/中性/乐观，不保证结果
【直接可发文案】分别给出外卖平台、朋友圈、抖音/小红书各1条，短而自然
【今天执行】列出3步，老板今天就能做
要求：中文、具体、数字优先，不说空话，不承诺必然涨单。`;
    try {
      const res = await fetch("/api/ai", { method:"POST", headers:{"Content-Type":"application/json", Authorization:`Bearer ${currentSession.access_token}`}, body:JSON.stringify({tool:"marketing", message:prompt}) });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) { await supabase.auth.signOut(); setSession(null); setShowAuth(true); throw new Error("登录已失效，请重新登录。"); }
      if (res.status === 402) { setRemaining(0); setShowPro(true); return; }
      if (!res.ok) throw new Error(data?.error || "营销分析失败，请稍后再试。");
      setMarketingAnswer(data?.answer || "AI没有返回有效内容。");
      if (typeof data?.remaining === "number") setRemaining(data.remaining); else await loadCredits(currentSession);
    } catch (e:any) { setMarketingAnswer(e?.message || "请求失败，请稍后再试。"); }
    finally { setMarketingLoading(false); }
  }

  function updateInventory(key: keyof typeof inventory, value: string) {
    if ((key !== "material") && value !== "" && !/^\d*(\.\d*)?$/.test(value)) return;
    setInventory(v => ({ ...v, [key]: value }));
    setInventoryResult(null);
  }

  async function analyzeInventory() {
    if (!inventory.material.trim() || !inventory.stock || !inventory.dailyUse || !inventory.unitCost || inventoryLoading) return;
    const { data: { session: currentSession } } = await supabase.auth.getSession();
    if (!currentSession) { setShowAuth(true); return; }
    if (remaining === 0) { setShowPro(true); return; }
    const stock = Number(inventory.stock) || 0;
    const dailyUse = Number(inventory.dailyUse) || 0;
    const unitCost = Number(inventory.unitCost) || 0;
    const leadDays = Number(inventory.leadDays) || 0;
    const shelfDays = Number(inventory.shelfDays) || 0;
    const stockDays = dailyUse > 0 ? stock / dailyUse : 0;
    const inventoryValue = stock * unitCost;
    const reorderPoint = dailyUse * Math.max(1, leadDays) * 1.2;
    const suggestedPurchase = Math.max(0, Math.ceil(dailyUse * (Math.max(1, leadDays) + 2) - stock));
    const expiryRisk = shelfDays > 0 && stockDays > shelfDays;
    const status = stockDays <= leadDays ? "缺货风险" : expiryRisk ? "积压/临期风险" : stockDays <= leadDays + 2 ? "接近补货" : "库存正常";
    const result = { stock, dailyUse, unitCost, leadDays, shelfDays, stockDays, inventoryValue, reorderPoint, suggestedPurchase, expiryRisk, status };
    setInventoryResult(result);
    setInventoryLoading(true);
    setInventoryAnswer("");
    const prompt = `你是餐谋AI库存经营专家。请根据以下真实库存数据，帮助餐饮老板决定今天是否采购。不要编造销量、损耗或供应商数据。
原料：${inventory.material.trim()}
当前库存：${stock} 份/单位
日均消耗：${dailyUse} 份/单位
单份成本：¥${unitCost.toFixed(2)}
采购提前期：${leadDays} 天
保质期：${shelfDays} 天
系统估算库存价值：¥${inventoryValue.toFixed(2)}
系统估算可用天数：${stockDays.toFixed(1)} 天
系统建议补货点：${reorderPoint.toFixed(1)} 份/单位
系统建议采购量：${suggestedPurchase} 份/单位
系统判断：${status}

严格按以下结构回答：
【库存判断】一句话说明当前风险
【采购建议】告诉老板今天买不买、建议买多少，并说明依据
【浪费风险】如果存在积压/临期风险，指出最该做什么；没有则明确说暂未发现
【成本控制】给出3个具体动作
【明天采购清单】列出老板明天需要重点检查的3项数据
要求：中文、数字优先、短句、可执行，不假装知道真实损耗率。`;
    try {
      const res = await fetch("/api/ai", { method:"POST", headers:{"Content-Type":"application/json", Authorization:`Bearer ${currentSession.access_token}`}, body:JSON.stringify({tool:"inventory", message:prompt}) });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) { await supabase.auth.signOut(); setSession(null); setShowAuth(true); throw new Error("登录已失效，请重新登录。"); }
      if (res.status === 402) { setRemaining(0); setShowPro(true); return; }
      if (!res.ok) throw new Error(data?.error || "库存分析失败，请稍后再试。");
      setInventoryAnswer(data?.answer || "AI没有返回有效内容。");
      if (typeof data?.remaining === "number") setRemaining(data.remaining); else await loadCredits(currentSession);
    } catch (e:any) { setInventoryAnswer(e?.message || "请求失败，请稍后再试。"); }
    finally { setInventoryLoading(false); }
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
      <nav>{tools.map((tool) => { const Icon = tool.icon; return <button key={tool.id} type="button" className={active === tool.id ? "sideItem active" : "sideItem"} onClick={() => { setActive(tool.id); if (tool.id === "menu") document.getElementById("menu-ai")?.scrollIntoView({behavior:"smooth"}); else if (tool.id === "ceo") document.getElementById("diagnosis")?.scrollIntoView({behavior:"smooth"}); else if (tool.id === "review") document.getElementById("review-ai")?.scrollIntoView({behavior:"smooth"}); else if (tool.id === "profit") document.getElementById("profit-ai")?.scrollIntoView({behavior:"smooth"}); else if (tool.id === "marketing") document.getElementById("marketing-ai")?.scrollIntoView({behavior:"smooth"}); else if (tool.id === "inventory") document.getElementById("inventory-ai")?.scrollIntoView({behavior:"smooth"}); else document.getElementById("ai")?.scrollIntoView({behavior:"smooth"}); }}><Icon size={18}/><span>{tool.name}</span>{active === tool.id && <i/>}</button>; })}</nav>
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

      <section className="panel" id="menu-ai" style={{marginBottom:24,padding:24,borderRadius:22}}>
        <div className="panelHeader"><div><span>MENU INTELLIGENCE</span><h3>菜单AI · 菜品赚钱能力分析</h3><p style={{margin:"6px 0 0",color:"#71847b"}}>填入菜品售价、单份食材成本和销量，餐谋AI帮你找出赚钱菜、低利润菜和价格机会。</p></div><Utensils size={24}/></div>
        <div style={{overflowX:"auto",marginTop:20}}>
          <div style={{minWidth:720}}>
            <div style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr 44px",gap:10,padding:"0 4px 8px",fontSize:12,fontWeight:800,color:"#71847b"}}><span>菜品名称</span><span>售价</span><span>单份成本</span><span>销量</span><span/></div>
            {menuDishes.map((dish,index)=><div key={dish.id} style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr 44px",gap:10,marginBottom:10}}>
              {(["name","price","cost","sales"] as const).map(key=><input key={key} value={dish[key]} onChange={e=>updateMenuDish(dish.id,key,e.target.value)} placeholder={key==="name"?"例如 招牌牛肉面":key==="price"?"32":"0"} inputMode={key==="name"?"text":"decimal"} style={{height:46,border:"1px solid #dce6e1",borderRadius:12,padding:"0 12px",outline:0,fontSize:14,background:"#fff"}}/>)}
              <button type="button" onClick={()=>removeMenuDish(dish.id)} disabled={menuDishes.length<=1} style={{height:46,border:"1px solid #e5ece8",borderRadius:12,background:"#fff",color:"#8a9a93",cursor:menuDishes.length<=1?"not-allowed":"pointer"}}>×</button>
            </div>)}
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,marginTop:14,flexWrap:"wrap"}}>
          <button type="button" onClick={addMenuDish} style={{height:42,padding:"0 14px",borderRadius:12,border:"1px solid #cfe0d8",background:"#f5faf7",fontWeight:700,cursor:"pointer"}}>＋ 添加菜品</button>
          <div style={{fontSize:13,color:"#71847b"}}>至少填写1个完整菜品 · 每次分析消耗1次AI额度</div>
          <button type="button" className="fullButton" onClick={analyzeMenu} disabled={menuLoading || !menuDishes.some(d=>d.name.trim() && Number(d.price)>0 && Number(d.sales)>0)} style={{maxWidth:240,opacity:menuLoading?.55:1}}>{menuLoading?"AI正在分析菜单...":"开始菜单AI分析"}<ArrowUpRight size={16}/></button>
        </div>
      </section>

      {menuResult && <section style={{marginBottom:24}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,minmax(0,1fr))",gap:14}}>
          <MetricCard label="菜单销量" value={menuResult.totalSales.toLocaleString("zh-CN")} suffix="份"/>
          <MetricCard label="菜单销售额" value={money(menuResult.totalRevenue)} suffix="当前录入菜品"/>
          <MetricCard label="累计毛利" value={money(menuResult.totalGrossProfit)} suffix={`${menuResult.avgMargin.toFixed(1)}% 加权毛利率`}/>
          <MetricCard label="最赚钱菜" value={menuResult.best} suffix="按累计毛利判断"/>
        </div>
        <div className="panel" style={{marginTop:14,padding:24,borderRadius:22}}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}><div style={{width:38,height:38,borderRadius:12,display:"grid",placeItems:"center",background:"#edf7f1"}}><Utensils size={19}/></div><div><div style={{fontSize:12,letterSpacing:1.2,color:"#71847b"}}>AI MENU REPORT</div><h3 style={{margin:2}}>菜单经营结论</h3></div></div>
          <div style={{fontSize:14,color:"#71847b",marginBottom:14}}>当前累计毛利最低的菜：<strong style={{color:"#14201b"}}>{menuResult.worst}</strong>。最终是否调整，结合AI建议和真实顾客反馈决定。</div>
          {menuAnswer && <div className="aiAnswer" style={{marginTop:8}}><div className="answerTitle"><Bot size={18}/>餐谋AI菜单分析</div><div className="answerBody" style={{whiteSpace:"pre-wrap"}}>{menuAnswer}</div></div>}
        </div>
      </section>}

      <section className="panel" id="profit-ai" style={{marginBottom:24,padding:24,borderRadius:22}}>
        <div className="panelHeader"><div><span>PROFIT INTELLIGENCE</span><h3>利润AI · 钱到底被什么吃掉了？</h3><p style={{margin:"6px 0 0",color:"#71847b"}}>填入今天的收入和主要成本，先算清真实利润，再让AI找出最大的利润黑洞。</p></div><Coins size={24}/></div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,minmax(0,1fr))",gap:14,marginTop:20}}>
          {([ ["revenue","营业额","例如 8620"],["foodCost","食材成本","例如 2600"],["commission","平台佣金","例如 800"],["labor","人工成本","例如 1200"],["rent","房租分摊","例如 500"],["other","其他成本","例如 300"] ] as const).map(([key,label,placeholder])=><DiagInput key={key} label={label} value={profit[key]} onChange={(v)=>updateProfit(key,v)} placeholder={placeholder} suffix="元"/>)}
        </div>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:16,marginTop:20,flexWrap:"wrap"}}>
          <div style={{fontSize:13,color:"#71847b"}}>至少填写营业额 · 每次分析消耗1次AI额度</div>
          <button type="button" className="fullButton" onClick={analyzeProfit} disabled={profitLoading || !profit.revenue} style={{maxWidth:260,opacity:profitLoading || !profit.revenue ? .55 : 1}}>{profitLoading?"AI正在分析利润...":"开始利润AI分析"}<ArrowUpRight size={16}/></button>
        </div>
      </section>

      <section className="panel" id="marketing-ai" style={{marginBottom:24,padding:24,borderRadius:22}}>
        <div className="panelHeader"><div><span>MARKETING INTELLIGENCE</span><h3>营销AI · 这次活动怎么做才不容易亏？</h3><p style={{margin:"6px 0 0",color:"#71847b"}}>输入目标和预算，餐谋AI帮你设计活动、控制优惠成本，并生成可以直接发布的文案。</p></div><TrendingUp size={24}/></div>
        <div style={{display:"grid",gridTemplateColumns:"1.2fr repeat(3,minmax(0,1fr))",gap:14,marginTop:20}}>
          <label style={{display:"block"}}><span style={{display:"block",fontSize:13,fontWeight:700,marginBottom:7,color:"#3e5149"}}>活动目标</span><select value={marketing.goal} onChange={e=>updateMarketing("goal",e.target.value)} style={{width:"100%",height:46,border:"1px solid #dce6e1",borderRadius:12,padding:"0 12px",background:"#fff",fontSize:14}}><option>提升复购</option><option>拉新获客</option><option>清库存</option><option>提升客单价</option></select></label>
          <DiagInput label="预算上限" value={marketing.budget} onChange={v=>updateMarketing("budget",v)} placeholder="例如 300" suffix="元"/>
          <DiagInput label="当前客单价" value={marketing.aov} onChange={v=>updateMarketing("aov",v)} placeholder="例如 32" suffix="元"/>
          <DiagInput label="目标订单" value={marketing.targetOrders} onChange={v=>updateMarketing("targetOrders",v)} placeholder="例如 50" suffix="单"/>
        </div>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:16,marginTop:20,flexWrap:"wrap"}}>
          <div style={{fontSize:13,color:"#71847b"}}>系统先算目标营业额，再让AI设计活动 · 每次分析消耗1次AI额度</div>
          <button type="button" className="fullButton" onClick={analyzeMarketing} disabled={marketingLoading || !marketing.budget || !marketing.aov || !marketing.targetOrders} style={{maxWidth:270,opacity:marketingLoading || !marketing.budget || !marketing.aov || !marketing.targetOrders ? .55 : 1}}>{marketingLoading?"AI正在设计活动...":"开始营销AI分析"}<ArrowUpRight size={16}/></button>
        </div>
      </section>

      {marketingResult && <section style={{marginBottom:24}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,minmax(0,1fr))",gap:14}}>
          <MetricCard label="营销预算" value={money(marketingResult.budget)} suffix="上限"/>
          <MetricCard label="目标订单" value={marketingResult.targetOrders.toLocaleString("zh-CN")} suffix="单"/>
          <MetricCard label="目标营业额" value={money(marketingResult.grossRevenue)} suffix="按当前客单价估算"/>
          <MetricCard label="优惠后收入空间" value={money(marketingResult.estimatedRevenueAfterPromo)} suffix="扣除预算的简单情景估算" emphasis/>
        </div>
        <div className="panel" style={{marginTop:14,padding:24,borderRadius:22}}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}><div style={{width:38,height:38,borderRadius:12,display:"grid",placeItems:"center",background:"#edf7f1"}}><TrendingUp size={19}/></div><div><div style={{fontSize:12,letterSpacing:1.2,color:"#71847b"}}>AI MARKETING REPORT</div><h3 style={{margin:2}}>营销执行方案</h3></div></div>
          {marketingAnswer && <div className="aiAnswer"><div className="answerTitle"><Bot size={18}/>餐谋AI营销分析</div><div className="answerBody" style={{whiteSpace:"pre-wrap"}}>{marketingAnswer}</div></div>}
        </div>
      </section>}

      <section className="panel" id="inventory-ai" style={{marginBottom:24,padding:24,borderRadius:22}}>
        <div className="panelHeader"><div><span>INVENTORY INTELLIGENCE</span><h3>库存AI · 今天到底该不该进货？</h3><p style={{margin:"6px 0 0",color:"#71847b"}}>输入原料库存和消耗速度，餐谋AI帮你判断缺货、积压和采购量。</p></div><Package size={24}/></div>
        <div style={{display:"grid",gridTemplateColumns:"1.4fr repeat(5,minmax(0,1fr))",gap:14,marginTop:20}}>
          <label style={{display:"block"}}><span style={{display:"block",fontSize:13,fontWeight:700,marginBottom:7,color:"#3e5149"}}>原料名称</span><input value={inventory.material} onChange={e=>updateInventory("material",e.target.value)} placeholder="例如 鸡腿肉" style={{width:"100%",height:46,border:"1px solid #dce6e1",borderRadius:12,padding:"0 12px",outline:0,fontSize:14,background:"#fff"}}/></label>
          <DiagInput label="当前库存" value={inventory.stock} onChange={v=>updateInventory("stock",v)} placeholder="80" suffix="份"/>
          <DiagInput label="日均消耗" value={inventory.dailyUse} onChange={v=>updateInventory("dailyUse",v)} placeholder="18" suffix="份"/>
          <DiagInput label="单份成本" value={inventory.unitCost} onChange={v=>updateInventory("unitCost",v)} placeholder="12" suffix="元"/>
          <DiagInput label="提前期" value={inventory.leadDays} onChange={v=>updateInventory("leadDays",v)} placeholder="2" suffix="天"/>
          <DiagInput label="保质期" value={inventory.shelfDays} onChange={v=>updateInventory("shelfDays",v)} placeholder="3" suffix="天"/>
        </div>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:16,marginTop:20,flexWrap:"wrap"}}>
          <div style={{fontSize:13,color:"#71847b"}}>系统先计算可用天数和补货点，再让AI给采购建议 · 每次分析消耗1次AI额度</div>
          <button type="button" className="fullButton" onClick={analyzeInventory} disabled={inventoryLoading || !inventory.material.trim() || !inventory.stock || !inventory.dailyUse || !inventory.unitCost} style={{maxWidth:260,opacity:inventoryLoading || !inventory.material.trim() || !inventory.stock || !inventory.dailyUse || !inventory.unitCost ? .55 : 1}}>{inventoryLoading?"AI正在分析库存...":"开始库存AI分析"}<ArrowUpRight size={16}/></button>
        </div>
      </section>

      {inventoryResult && <section style={{marginBottom:24}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,minmax(0,1fr))",gap:14}}>
          <MetricCard label="库存价值" value={money(inventoryResult.inventoryValue)} suffix={`${inventoryResult.stock} 份库存`}/>
          <MetricCard label="可用天数" value={`${inventoryResult.stockDays.toFixed(1)} 天`} suffix={`日均消耗 ${inventoryResult.dailyUse} 份`}/>
          <MetricCard label="建议采购" value={`${inventoryResult.suggestedPurchase} 份`} suffix={`补货点 ${inventoryResult.reorderPoint.toFixed(0)} 份`} emphasis/>
          <MetricCard label="库存状态" value={inventoryResult.status} suffix={inventoryResult.expiryRisk ? "注意保质期" : "按当前数据判断"}/>
        </div>
        <div className="panel" style={{marginTop:14,padding:24,borderRadius:22}}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}><div style={{width:38,height:38,borderRadius:12,display:"grid",placeItems:"center",background:"#edf7f1"}}><Package size={19}/></div><div><div style={{fontSize:12,letterSpacing:1.2,color:"#71847b"}}>AI INVENTORY REPORT</div><h3 style={{margin:2}}>库存经营结论</h3></div></div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,minmax(0,1fr))",gap:12,marginBottom:16}}>
            <ActionCard n="01" text={`当前库存约可用 ${inventoryResult.stockDays.toFixed(1)} 天，采购提前期 ${inventoryResult.leadDays} 天。`}/>
            <ActionCard n="02" text={`建议补货到安全区间，系统本次建议采购 ${inventoryResult.suggestedPurchase} 份。`}/>
            <ActionCard n="03" text={inventoryResult.expiryRisk ? `当前库存可能超过保质期覆盖天数，优先促销/调整备货，避免浪费。` : "目前未发现明显临期积压信号，继续每天记录消耗速度。"}/>
          </div>
          {inventoryAnswer && <div className="aiAnswer"><div className="answerTitle"><Bot size={18}/>餐谋AI库存分析</div><div className="answerBody" style={{whiteSpace:"pre-wrap"}}>{inventoryAnswer}</div></div>}
        </div>
      </section>}

      {profitResult && <section style={{marginBottom:24}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,minmax(0,1fr))",gap:14}}>
          <MetricCard label="营业额" value={money(profitResult.revenue)} suffix="本次录入"/>
          <MetricCard label="总成本" value={money(profitResult.totalCost)} suffix={`${profitResult.costRate.toFixed(1)}% 成本率`}/>
          <MetricCard label="实际利润" value={money(profitResult.netProfit)} suffix={`${profitResult.margin.toFixed(1)}% 利润率`} emphasis/>
          <MetricCard label="最大成本项" value={profitResult.biggestName} suffix={money(profitResult.biggestCost)}/>
        </div>
        <div className="panel" style={{marginTop:14,padding:24,borderRadius:22}}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}><div style={{width:38,height:38,borderRadius:12,display:"grid",placeItems:"center",background:"#edf7f1"}}><Coins size={19}/></div><div><div style={{fontSize:12,letterSpacing:1.2,color:"#71847b"}}>AI PROFIT REPORT</div><h3 style={{margin:2}}>利润经营结论</h3></div></div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:12,marginBottom:16}}>
            <div style={{padding:16,borderRadius:15,background:"#f7faf8",border:"1px solid #e7eee9"}}><span style={{fontSize:12,color:"#71847b"}}>毛利</span><strong style={{display:"block",fontSize:22,marginTop:6,color:"#14201b"}}>{money(profitResult.grossProfit)}</strong></div>
            <div style={{padding:16,borderRadius:15,background:"#f7faf8",border:"1px solid #e7eee9"}}><span style={{fontSize:12,color:"#71847b"}}>最大成本</span><strong style={{display:"block",fontSize:22,marginTop:6,color:"#14201b"}}>{profitResult.biggestName} · {money(profitResult.biggestCost)}</strong></div>
          </div>
          {profitAnswer && <div className="aiAnswer"><div className="answerTitle"><Bot size={18}/>餐谋AI利润分析</div><div className="answerBody" style={{whiteSpace:"pre-wrap"}}>{profitAnswer}</div></div>}
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
function MiniReviewPoint({n,title,text}:{n:string;title:string;text:string}) { return <div style={{display:"flex",gap:10,alignItems:"flex-start"}}><div style={{width:30,height:30,borderRadius:9,background:"#eaf4ee",display:"grid",placeItems:"center",fontSize:11,fontWeight:900,color:"#4f6d5e",flex:"0 0 auto"}}>{n}</div><div><strong style={{display:"block",fontSize:14,color:"#14201b",marginBottom:3}}>{title}</strong><span style={{fontSize:12.5,lineHeight:1.6,color:"#71847b"}}>{text}</span></div></div>; }

function MetricCard({label,value,suffix,emphasis=false}:{label:string;value:string;suffix:string;emphasis?:boolean}) { return <div style={{background:"#fff",color:"#14201b",border:"1px solid #e5ece8",borderRadius:18,padding:"18px 16px",boxShadow:"0 5px 18px rgba(25,50,40,.04)"}}><div style={{fontSize:12,color:"#71847b",marginBottom:8}}>{label}</div><strong style={{fontSize:emphasis?34:24,lineHeight:1.1}}>{value}</strong><div style={{fontSize:12,color:"#8a9a93",marginTop:7}}>{suffix}</div></div>; }
function ActionCard({n,text}:{n:string;text:string}) { return <div style={{padding:16,borderRadius:15,background:"#f7faf8",color:"#14201b",border:"1px solid #e7eee9"}}><div style={{fontSize:12,fontWeight:800,letterSpacing:1,color:"#6c8077",marginBottom:8}}>{n}</div><div style={{fontSize:14,lineHeight:1.7}}><CheckCircle2 size={15} style={{verticalAlign:"-3px",marginRight:5}}/>{text}</div></div>; }
function Stat({title,value,change,icon}:{title:string;value:string;change:string;icon:React.ReactNode}) { return <div className="stat"><div className="statIcon">{icon}</div><div><span>{title}</span><strong>{value}</strong><small><ArrowUpRight size={12}/>{change}</small></div></div>; }
