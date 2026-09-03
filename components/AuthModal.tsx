"use client";

import { useState } from "react";
import {
  X,
  Mail,
  Lock,
  Sparkles,
  Eye,
  EyeOff,
} from "lucide-react";

import { supabase } from "@/lib/supabase";

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

  const [showPassword, setShowPassword] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  async function handleSubmit(
    e: React.FormEvent
  ) {
    e.preventDefault();

    if (loading) return;

    setError("");
    setSuccess("");

    const cleanEmail =
      email.trim().toLowerCase();

    if (!cleanEmail) {
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
      /**
       * ============================
       * 登录
       * ============================
       */

      if (mode === "login") {
        const {
          data,
          error,
        } =
          await supabase.auth.signInWithPassword(
            {
              email: cleanEmail,
              password,
            }
          );

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

      /**
       * ============================
       * 注册
       * ============================
       */

      const {
        data,
        error,
      } =
        await supabase.auth.signUp({
          email: cleanEmail,
          password,
        });

      if (error) {
        throw error;
      }

      /**
       * 如果 Supabase 没有开启邮箱验证
       */

      if (data.session) {
        onSuccess();
        return;
      }

      /**
       * 如果开启邮箱验证
       */

      setSuccess(
        "注册成功！请先去邮箱完成验证，然后返回餐谋AI登录。"
      );

      setMode("login");
      setPassword("");
    } catch (err: any) {
      console.error(
        "Auth error:",
        err
      );

      const message =
        err?.message ||
        "操作失败，请稍后再试。";

      const lower =
        message.toLowerCase();

      if (
        lower.includes(
          "invalid login credentials"
        )
      ) {
        setError(
          "邮箱或密码错误，请检查后重试。"
        );
      } else if (
        lower.includes(
          "user already registered"
        )
      ) {
        setError(
          "这个邮箱已经注册，请直接登录。"
        );
      } else if (
        lower.includes(
          "email not confirmed"
        )
      ) {
        setError(
          "邮箱还没有验证，请先去邮箱完成验证。"
        );
      } else if (
        lower.includes(
          "password should be at least"
        )
      ) {
        setError(
          "密码至少需要6位。"
        );
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  }

  function switchMode(
    nextMode: "login" | "register"
  ) {
    setMode(nextMode);
    setError("");
    setSuccess("");
    setPassword("");
  }

  return (
    <div
      className="authOverlay"
      onMouseDown={(e) => {
        if (
          e.target ===
          e.currentTarget
        ) {
          onClose();
        }
      }}
    >
      <div className="authModal">
        {/* 关闭 */}

        <button
          className="authClose"
          type="button"
          onClick={onClose}
          aria-label="关闭"
        >
          <X size={20} />
        </button>

        {/* Logo */}

        <div className="authLogo">
          <Sparkles size={19} />
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

        <form
          onSubmit={handleSubmit}
        >
          {/* 邮箱 */}

          <label>邮箱</label>

          <div className="authInput">
            <Mail size={17} />

            <input
              type="email"
              value={email}
              onChange={(e) =>
                setEmail(
                  e.target.value
                )
              }
              placeholder="请输入邮箱"
              autoComplete="email"
              disabled={loading}
            />
          </div>

          {/* 密码 */}

          <label>密码</label>

          <div className="authInput">
            <Lock size={17} />

            <input
              type={
                showPassword
                  ? "text"
                  : "password"
              }
              value={password}
              onChange={(e) =>
                setPassword(
                  e.target.value
                )
              }
              placeholder="至少6位密码"
              autoComplete={
                mode === "login"
                  ? "current-password"
                  : "new-password"
              }
              disabled={loading}
            />

            <button
              type="button"
              className="passwordToggle"
              onClick={() =>
                setShowPassword(
                  !showPassword
                )
              }
            >
              {showPassword ? (
                <EyeOff size={17} />
              ) : (
                <Eye size={17} />
              )}
            </button>
          </div>

          {/* 错误 */}

          {error && (
            <div className="authError">
              {error}
            </div>
          )}

          {/* 成功 */}

          {success && (
            <div className="authSuccess">
              {success}
            </div>
          )}

          {/* 提交 */}

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

        {/* 切换 */}

        <div className="authSwitch">
          {mode === "login" ? (
            <>
              还没有账户？

              <button
                type="button"
                onClick={() =>
                  switchMode(
                    "register"
                  )
                }
              >
                立即注册
              </button>
            </>
          ) : (
            <>
              已经有账户？

              <button
                type="button"
                onClick={() =>
                  switchMode(
                    "login"
                  )
                }
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
