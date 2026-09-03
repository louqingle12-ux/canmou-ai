"use client";

import { useState } from "react";
import {
  X,
  Sparkles,
  Check,
  Smartphone,
} from "lucide-react";

import { supabase } from "@/lib/supabase";

type Props = {
  onClose: () => void;
  onSuccess?: () => void;
};

export default function ProModal({
  onClose,
  onSuccess,
}: Props) {
  const [paymentMethod, setPaymentMethod] = useState<
    "wechat" | "alipay"
  >("wechat");

  const [loading, setLoading] = useState(false);

  const [success, setSuccess] = useState(false);

  const [error, setError] = useState("");

  /**
   * 生成订单号
   *
   * 示例：
   * CM202609031837AB12
   */
  function generateOrderNo() {
    const now = new Date();

    const year = now.getFullYear();

    const month = String(
      now.getMonth() + 1
    ).padStart(2, "0");

    const day = String(
      now.getDate()
    ).padStart(2, "0");

    const hours = String(
      now.getHours()
    ).padStart(2, "0");

    const minutes = String(
      now.getMinutes()
    ).padStart(2, "0");

    const random = Math.random()
      .toString(36)
      .substring(2, 6)
      .toUpperCase();

    return `CM${year}${month}${day}${hours}${minutes}${random}`;
  }

  /**
   * 创建PRO付款申请
   */
  async function submitOrder() {
    if (loading) return;

    setLoading(true);
    setError("");

    try {
      /**
       * ============================================
       * 1. 获取当前登录用户
       * ============================================
       */

      const {
        data: {
          session,
        },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        console.error(
          "Session error:",
          sessionError
        );

        throw new Error(
          "获取登录状态失败，请重新登录"
        );
      }

      if (!session?.user?.id) {
        setError(
          "请先登录餐谋AI"
        );

        return;
      }

      /**
       * ============================================
       * 2. 获取用户邮箱
       * ============================================
       */

      const userId =
        session.user.id;

      const email =
        session.user.email || null;

      /**
       * ============================================
       * 3. 生成订单号
       * ============================================
       */

      const orderNo =
        generateOrderNo();

      console.log(
        "Creating order:",
        {
          orderNo,
          userId,
          email,
          plan: "pro",
          billingCycle: "monthly",
          amount: 29.9,
          paymentMethod,
        }
      );

      /**
       * ============================================
       * 4. 创建订单
       *
       * 注意：
       *
       * order_no 必填
       * billing_cycle 必填
       * ============================================
       */

      const {
        data: order,
        error: orderError,
      } = await supabase
        .from("orders")
        .insert({
          order_no: orderNo,

          user_id: userId,

          email: email,

          plan: "pro",

          billing_cycle: "monthly",

          amount: 29.9,

          payment_method:
            paymentMethod,

          status: "pending",
        })
        .select()
        .single();

      /**
       * ============================================
       * 5. 数据库错误
       * ============================================
       */

      if (orderError) {
        console.error(
          "Supabase order error:",
          orderError
        );

        console.error(
          "Supabase error details:",
          {
            message:
              orderError.message,
            details:
              orderError.details,
            hint:
              orderError.hint,
            code:
              orderError.code,
          }
        );

        /**
         * 常见错误提示
         */

        if (
          orderError.code ===
          "42501"
        ) {
          throw new Error(
            "没有创建订单的权限，请检查 orders 表的 RLS 策略。"
          );
        }

        if (
          orderError.code ===
          "23505"
        ) {
          throw new Error(
            "订单号重复，请重新提交。"
          );
        }

        if (
          orderError.code ===
          "23502"
        ) {
          throw new Error(
            "订单缺少必要信息，请检查数据库字段设置。"
          );
        }

        throw new Error(
          orderError.message ||
            "订单创建失败"
        );
      }

      /**
       * ============================================
       * 6. 创建成功
       * ============================================
       */

      console.log(
        "Order created:",
        order
      );

      setSuccess(true);

      /**
       * 注意：
       *
       * 这里不要立即把用户变成PRO。
       *
       * 当前只是：
       *
       * 用户提交订单
       * ↓
       * pending
       * ↓
       * 管理员审核
       * ↓
       * approved
       * ↓
       * profiles.plan = pro
       */

      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      console.error(
        "Create order error:",
        err
      );

      setError(
        err?.message ||
          "订单创建失败，请稍后再试"
      );
    } finally {
      setLoading(false);
    }
  }

  /**
   * ============================================
   * UI
   * ============================================
   */

  return (
    <div
      className="proOverlay"
      onMouseDown={(e) => {
        if (
          e.target ===
          e.currentTarget
        ) {
          onClose();
        }
      }}
    >
      <div className="proModal">

        {/* ======================================
            关闭按钮
        ====================================== */}

        <button
          className="proClose"
          onClick={onClose}
          type="button"
          disabled={loading}
          aria-label="关闭"
        >
          <X size={20} />
        </button>

        {!success ? (
          <>
            {/* ==================================
                PRO ICON
            ================================== */}

            <div className="proIcon">
              <Sparkles size={24} />
            </div>

            {/* ==================================
                标题
            ================================== */}

            <h2>
              升级餐谋AI PRO
            </h2>

            <p className="proSubtitle">
              解锁完整AI经营能力
            </p>

            {/* ==================================
                价格
            ================================== */}

            <div className="proPrice">
              <span>¥</span>

              29.9

              <small>
                /月
              </small>
            </div>

            {/* ==================================
                PRO功能
            ================================== */}

            <div className="proFeatures">

              <div>
                <Check size={17} />
                无限AI经营分析
              </div>

              <div>
                <Check size={17} />
                AI餐饮CEO
              </div>

              <div>
                <Check size={17} />
                菜单 / 差评 / 利润分析
              </div>

              <div>
                <Check size={17} />
                解锁全部经营工具
              </div>

            </div>

            {/* ==================================
                付款方式
            ================================== */}

            <div className="paymentTitle">
              选择付款方式
            </div>

            <div className="paymentMethods">

              {/* 微信 */}

              <button
                type="button"
                disabled={loading}
                className={
                  paymentMethod ===
                  "wechat"
                    ? "paymentMethod active"
                    : "paymentMethod"
                }
                onClick={() =>
                  setPaymentMethod(
                    "wechat"
                  )
                }
              >
                <span>
                  微信支付
                </span>
              </button>

              {/* 支付宝 */}

              <button
                type="button"
                disabled={loading}
                className={
                  paymentMethod ===
                  "alipay"
                    ? "paymentMethod active"
                    : "paymentMethod"
                }
                onClick={() =>
                  setPaymentMethod(
                    "alipay"
                  )
                }
              >
                <span>
                  支付宝
                </span>
              </button>

            </div>

            {/* ==================================
                提示
            ================================== */}

            <div className="paymentNotice">
              <Smartphone size={16} />

              <span>
                提交付款申请后，
                请按照页面提示完成付款。
                管理员确认收款后，
                系统会自动开通 PRO。
              </span>
            </div>

            {/* ==================================
                错误
            ================================== */}

            {error && (
              <div className="proError">
                {error}
              </div>
            )}

            {/* ==================================
                提交订单
            ================================== */}

            <button
              className="proSubmit"
              onClick={submitOrder}
              disabled={loading}
            >
              {loading
                ? "正在创建订单..."
                : `提交 ${
                    paymentMethod ===
                    "wechat"
                      ? "微信"
                      : "支付宝"
                  } 付款申请`}
            </button>
          </>
        ) : (

          /* ====================================
             提交成功
          ==================================== */

          <div className="proSuccess">

            <div className="successIcon">
              <Check size={28} />
            </div>

            <h2>
              订单已提交
            </h2>

            <p>
              你的 PRO 付款申请已经提交成功。
            </p>

            <p>
              请完成付款并等待管理员审核。
            </p>

            <p>
              管理员确认付款后，
              系统会自动将你的账户升级为 PRO。
            </p>

            <button
              className="proSubmit"
              onClick={onClose}
              type="button"
            >
              知道了
            </button>

          </div>
        )}
      </div>
    </div>
  );
}
