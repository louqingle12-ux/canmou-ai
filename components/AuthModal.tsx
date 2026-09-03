"use client";

import { useState } from "react";
import { supabase } from "../lib/supabase";
import { X, Mail, Lock, Sparkles } from "lucide-react";

type Props = {
  onClose: () => void;
  onSuccess: () => void;
};

export default function AuthModal({
  onClose,
  onSuccess,
}: Props) {
  const [mode, setMode] = useState<
    "login" | "register"
  >("login");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(
    e: React.FormEvent
  ) {
    e.preventDefault();

    setError("");
    setSuccess("");

    if (!email.trim()) {
      setError("请输入邮箱");
      return;
    }

    if (!password) {
      setError("请输入密码");
      return;
    }

    if (password.length < 6) {
      setError("密码至少需要6位");
      return;
    }

    setLoading(true);

    try {
      if (mode === "login") {
        const {
          data,
          error,
        } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (error) {
          throw error;
        }

        if (!data.session) {
          throw new Error(
            "登录成功，但没有获取到登录会话，请重新尝试。"
          );
        }

        onSuccess();
        return;
      }

      const {
        data,
        error,
      } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });

      if (error) {
        throw error;
      }

      if (data.session) {
        onSuccess();
        return;
      }

      setSuccess(
        "注册成功！如果开启了邮箱验证，请先去邮箱完成验证，然后回来登录。"
      );

      setMode("login");
    } catch (err: any) {
      console.error(err);

      const message =
        err?.message || "操作失败，请稍后再试。";

      if (
        message.toLowerCase().includes(
          "invalid login credentials"
        )
      ) {
        setError(
          "邮箱或密码错误，请检查后重试。"
        );
      } else if (
        message
          .toLowerCase()
          .includes("user already registered")
      ) {
        setError(
          "这个邮箱已经注册，请直接登录。"
        );
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="authOverlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="authModal">
        <button
          className="authClose"
          onClick={onClose}
          aria-label="关闭"
        >
          <X size={20} />
        </button>

        <div className="authLogo">
          <Sparkles size={18} />
        </div>

        <h2>
          {mode === "login"
            ? "欢迎回来"
            : "创建餐谋AI账户"}
        </h2>

        <p className="authSubtitle">
          {mode === "login"
            ? "登录后继续使用餐谋AI"
            : "注册即可获得5次免费AI分析"}
        </p>

        <form onSubmit={handleSubmit}>
          <label>邮箱</label>

          <div className="authInput">
            <Mail size={17} />

            <input
              type="email"
              value={email}
              onChange={(e) =>
                setEmail(e.target.value)
              }
              placeholder="请输入邮箱"
              autoComplete="email"
            />
          </div>

          <label>密码</label>

          <div className="authInput">
            <Lock size={17} />

            <input
              type="password"
              value={password}
              onChange={(e) =>
                setPassword(e.target.value)
              }
              placeholder="至少6位密码"
              autoComplete={
                mode === "login"
                  ? "current-password"
                  : "new-password"
              }
            />
          </div>

          {error && (
            <div className="authError">
              {error}
            </div>
          )}

          {success && (
            <div className="authSuccess">
              {success}
            </div>
          )}

          <button
            type="submit"
            className="authSubmit"
            disabled={loading}
          >
            {loading
              ? "处理中..."
              : mode === "login"
              ? "登录餐谋AI"
              : "注册账户"}
          </button>
        </form>

        <div className="authSwitch">
          {mode === "login" ? (
            <>
              还没有账户？
              <button
                onClick={() => {
                  setMode("register");
                  setError("");
                  setSuccess("");
                }}
              >
                立即注册
              </button>
            </>
          ) : (
            <>
              已经有账户？
              <button
                onClick={() => {
                  setMode("login");
                  setError("");
                  setSuccess("");
                }}
              >
                返回登录
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
