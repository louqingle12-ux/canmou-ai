"use client";

import { useState } from "react";
import { X, Mail, Lock, Sparkles, Eye, EyeOff, ShieldCheck, Zap, BarChart3 } from "lucide-react";
import { supabase } from "@/lib/supabase";

type Props = { onClose: () => void; onSuccess: () => void };

type Mode = "login" | "register";

export default function AuthModal({ onClose, onSuccess }: Props) {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [forgotMode, setForgotMode] = useState(false);

  function clearMessages() { setError(""); setSuccess(""); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    clearMessages();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) return setError("请输入邮箱地址");
    if (!/^\S+@\S+\.\S+$/.test(cleanEmail)) return setError("请输入正确的邮箱地址");
    if (!forgotMode && password.length < 6) return setError("密码至少需要 6 位");

    setLoading(true);
    try {
      if (forgotMode) {
        const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
          redirectTo: `${window.location.origin}/`,
        });
        if (error) throw error;
        setSuccess("重置邮件已发送，请检查邮箱。如果没看到，请查看垃圾邮件。");
        setForgotMode(false);
        setMode("login");
        return;
      }

      if (mode === "login") {
        const { data, error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
        if (error) throw error;
        if (!data.session) throw new Error("登录会话创建失败，请重新尝试。");
        onSuccess();
        onClose();
        return;
      }

      const { data, error } = await supabase.auth.signUp({ email: cleanEmail, password });
      if (error) throw error;
      if (data.session) {
        onSuccess();
        onClose();
        return;
      }
      setSuccess("注册成功。请先完成邮箱验证，再回来登录餐谋AI。");
      setMode("login");
      setPassword("");
    } catch (err: any) {
      const message = String(err?.message || "操作失败，请稍后再试。");
      const lower = message.toLowerCase();
      if (lower.includes("invalid login credentials")) setError("邮箱或密码不正确。");
      else if (lower.includes("user already registered")) setError("这个邮箱已经注册，直接登录即可。");
      else if (lower.includes("email not confirmed")) setError("邮箱还未验证，请先完成邮箱验证。");
      else if (lower.includes("rate limit")) setError("操作太频繁，请稍后再试。");
      else if (lower.includes("password should be at least")) setError("密码至少需要 6 位。");
      else setError(message);
    } finally { setLoading(false); }
  }

  function switchMode(next: Mode) {
    setMode(next); setForgotMode(false); setPassword(""); clearMessages();
  }

  return (
    <div className="authV2Overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="authV2Shell" role="dialog" aria-modal="true" aria-label={forgotMode ? "找回密码" : mode === "login" ? "登录餐谋AI" : "注册餐谋AI"}>
        <button className="authV2Close" type="button" onClick={onClose} aria-label="关闭"><X size={20} /></button>

        <aside className="authV2Brand">
          <div className="authV2BrandTop"><div className="authV2Logo"><Sparkles size={20} /></div><span>餐谋AI</span></div>
          <div className="authV2BrandBody">
            <div className="authV2Eyebrow">AI RESTAURANT GROWTH</div>
            <h2>让每一次经营决策，<br />都更接近利润。</h2>
            <p>菜单、差评、利润、营销、库存，一套AI工具帮餐饮老板把复杂经营问题变成今天就能执行的动作。</p>
            <div className="authV2Benefits">
              <div><span><Zap size={15} /></span><div><b>5 次免费AI分析</b><small>注册后即可开始</small></div></div>
              <div><span><BarChart3 size={15} /></span><div><b>经营数据持续沉淀</b><small>让AI越来越懂你的店</small></div></div>
              <div><span><ShieldCheck size={15} /></span><div><b>安全登录</b><small>账号数据独立保存</small></div></div>
            </div>
          </div>
          <div className="authV2BrandFoot">餐谋AI · 给餐饮老板的AI经营助手</div>
        </aside>

        <main className="authV2Main">
          <div className="authV2Header">
            <div className="authV2MobileLogo"><Sparkles size={18} /></div>
            <h1>{forgotMode ? "找回密码" : mode === "login" ? "欢迎回来" : "创建你的餐谋AI账户"}</h1>
            <p>{forgotMode ? "输入注册邮箱，我们会发送密码重置邮件。" : mode === "login" ? "登录后继续管理你的餐饮生意" : "注册即送 5 次免费AI分析"}</p>
          </div>

          {!forgotMode && (
            <div className="authV2Tabs">
              <button type="button" className={mode === "login" ? "active" : ""} onClick={() => switchMode("login")}>登录</button>
              <button type="button" className={mode === "register" ? "active" : ""} onClick={() => switchMode("register")}>注册</button>
            </div>
          )}

          <form className="authV2Form" onSubmit={handleSubmit}>
            <label>邮箱地址</label>
            <div className="authV2Input"><Mail size={18} /><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" disabled={loading} /></div>

            {!forgotMode && <>
              <div className="authV2LabelRow"><label>密码</label>{mode === "login" && <button type="button" onClick={() => { setForgotMode(true); clearMessages(); }}>忘记密码？</button>}</div>
              <div className="authV2Input"><Lock size={18} /><input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="至少 6 位密码" autoComplete={mode === "login" ? "current-password" : "new-password"} disabled={loading} /><button type="button" className="authV2Eye" onClick={() => setShowPassword(v => !v)} aria-label={showPassword ? "隐藏密码" : "显示密码"}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div>
            </>}

            {error && <div className="authV2Message error">{error}</div>}
            {success && <div className="authV2Message success">{success}</div>}

            <button className="authV2Submit" type="submit" disabled={loading}>
              {loading ? "处理中…" : forgotMode ? "发送重置邮件" : mode === "login" ? "登录餐谋AI" : "创建账户"}
            </button>
          </form>

          <div className="authV2Bottom">
            {forgotMode ? <button type="button" onClick={() => { setForgotMode(false); clearMessages(); }}>← 返回登录</button> : mode === "login" ? <>还没有账户？ <button type="button" onClick={() => switchMode("register")}>免费注册</button></> : <>已经有账户？ <button type="button" onClick={() => switchMode("login")}>返回登录</button></>}
          </div>
          <div className="authV2Secure"><ShieldCheck size={14} /> 登录信息通过 Supabase 安全认证</div>
        </main>
      </div>
    </div>
  );
}
