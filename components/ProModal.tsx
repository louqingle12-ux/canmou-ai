"use client";

import { useState } from "react";
import { X, Sparkles, Check, Smartphone } from "lucide-react";
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

  async function submitOrder() {
    if (loading) return;

    setLoading(true);
    setError("");

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user?.id) {
        setError("请先登录餐谋AI");
        return;
      }

      const { error: orderError } = await supabase
        .from("orders")
        .insert({
          user_id: session.user.id,
          plan: "pro",
          amount: 29.9,
          payment_method: paymentMethod,
          status: "pending",
        });

      if (orderError) {
        console.error(orderError);
        throw new Error("订单创建失败，请稍后重试");
      }

      setSuccess(true);

      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      console.error("Create order error:", err);

      setError(
        err?.message || "提交失败，请稍后再试"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="proOverlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="proModal">
        <button
          className="proClose"
          onClick={onClose}
          type="button"
        >
          <X size={20} />
        </button>

        {!success ? (
          <>
            <div className="proIcon">
              <Sparkles size={24} />
            </div>

            <h2>升级餐谋AI PRO</h2>

            <p className="proSubtitle">
              解锁完整AI经营能力
            </p>

            <div className="proPrice">
              <span>¥</span>
              29.9
              <small>/月</small>
            </div>

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

            <div className="paymentTitle">
              选择付款方式
            </div>

            <div className="paymentMethods">
              <button
                type="button"
                className={
                  paymentMethod === "wechat"
                    ? "paymentMethod active"
                    : "paymentMethod"
                }
                onClick={() =>
                  setPaymentMethod("wechat")
                }
              >
                <span>微信支付</span>
              </button>

              <button
                type="button"
                className={
                  paymentMethod === "alipay"
                    ? "paymentMethod active"
                    : "paymentMethod"
                }
                onClick={() =>
                  setPaymentMethod("alipay")
                }
              >
                <span>支付宝</span>
              </button>
            </div>

            <div className="paymentNotice">
              <Smartphone size={16} />

              <span>
                提交订单后，根据页面提示完成付款。
                管理员审核后自动开通PRO。
              </span>
            </div>

            {error && (
              <div className="proError">
                {error}
              </div>
            )}

            <button
              className="proSubmit"
              onClick={submitOrder}
              disabled={loading}
            >
              {loading
                ? "正在创建订单..."
                : `提交 ${paymentMethod === "wechat"
                    ? "微信"
                    : "支付宝"} 付款申请`}
            </button>
          </>
        ) : (
          <div className="proSuccess">
            <div className="successIcon">
              <Check size={28} />
            </div>

            <h2>订单已提交</h2>

            <p>
              你的 PRO 付款申请已经提交成功。
            </p>

            <p>
              管理员确认付款后，
              你的账户会自动升级为 PRO。
            </p>

            <button
              className="proSubmit"
              onClick={onClose}
            >
              知道了
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
