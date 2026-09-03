"use client";

import { useState } from "react";
import { X, Check, Crown } from "lucide-react";

type Props = {
  onClose: () => void;
};

type BillingCycle = "month" | "year";
type PaymentMethod = "wechat" | "alipay";

export default function ProModal({ onClose }: Props) {
  const [billingCycle, setBillingCycle] =
    useState<BillingCycle>("month");

  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>("wechat");

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [orderNo, setOrderNo] = useState("");

  const amount =
    billingCycle === "month"
      ? 19.9
      : 199;

  async function submitOrder() {
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const response = await fetch(
        "/api/pro-order",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            billingCycle,
            paymentMethod,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "提交订单失败"
        );
      }

      setOrderNo(data.orderNo);

      setSuccess(
        "付款申请已提交，请等待管理员审核。"
      );
    } catch (err: any) {
      setError(
        err?.message ||
          "提交失败，请稍后再试。"
      );
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
      <div
        className="authModal"
        style={{
          maxWidth: 520,
        }}
      >
        <button
          className="authClose"
          onClick={onClose}
        >
          <X size={20} />
        </button>

        <div
          className="authLogo"
          style={{
            marginBottom: 12,
          }}
        >
          <Crown size={20} />
        </div>

        <h2>升级餐谋AI PRO</h2>

        <p className="authSubtitle">
          解锁无限 AI 餐饮经营分析
        </p>

        {/* 套餐 */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "1fr 1fr",
            gap: 12,
            marginTop: 20,
          }}
        >
          <button
            type="button"
            onClick={() =>
              setBillingCycle("month")
            }
            style={{
              padding: 16,
              borderRadius: 14,
              border:
                billingCycle === "month"
                  ? "2px solid #111"
                  : "1px solid #ddd",
              background:
                billingCycle === "month"
                  ? "#f5f5f5"
                  : "#fff",
              textAlign: "left",
            }}
          >
            <div
              style={{
                fontWeight: 700,
              }}
            >
              月度 PRO
            </div>

            <div
              style={{
                fontSize: 24,
                fontWeight: 800,
                marginTop: 5,
              }}
            >
              ¥19.9
            </div>

            <div
              style={{
                fontSize: 12,
                color: "#777",
              }}
            >
              每月
            </div>
          </button>

          <button
            type="button"
            onClick={() =>
              setBillingCycle("year")
            }
            style={{
              padding: 16,
              borderRadius: 14,
              border:
                billingCycle === "year"
                  ? "2px solid #111"
                  : "1px solid #ddd",
              background:
                billingCycle === "year"
                  ? "#f5f5f5"
                  : "#fff",
              textAlign: "left",
            }}
          >
            <div
              style={{
                fontWeight: 700,
              }}
            >
              年度 PRO
            </div>

            <div
              style={{
                fontSize: 24,
                fontWeight: 800,
                marginTop: 5,
              }}
            >
              ¥199
            </div>

            <div
              style={{
                fontSize: 12,
                color: "#777",
              }}
            >
              每年
            </div>
          </button>
        </div>

        {/* 权益 */}
        <div
          style={{
            marginTop: 20,
            padding: 16,
            borderRadius: 14,
            background: "#fafafa",
          }}
        >
          {[
            "AI 餐饮CEO无限分析",
            "菜单利润分析",
            "差评智能处理",
            "营销方案生成",
            "库存与成本分析",
            "不受5次免费额度限制",
          ].map((item) => (
            <div
              key={item}
              style={{
                display: "flex",
                gap: 8,
                alignItems: "center",
                marginBottom: 9,
                fontSize: 14,
              }}
            >
              <Check size={16} />
              {item}
            </div>
          ))}
        </div>

        {/* 支付方式 */}
        <div
          style={{
            marginTop: 20,
          }}
        >
          <div
            style={{
              fontWeight: 700,
              marginBottom: 10,
            }}
          >
            选择支付方式
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "1fr 1fr",
              gap: 10,
            }}
          >
            <button
              type="button"
              onClick={() =>
                setPaymentMethod("wechat")
              }
              style={{
                padding: 13,
                borderRadius: 12,
                border:
                  paymentMethod === "wechat"
                    ? "2px solid #111"
                    : "1px solid #ddd",
                background:
                  paymentMethod === "wechat"
                    ? "#f5f5f5"
                    : "#fff",
              }}
            >
              微信支付
            </button>

            <button
              type="button"
              onClick={() =>
                setPaymentMethod("alipay")
              }
              style={{
                padding: 13,
                borderRadius: 12,
                border:
                  paymentMethod === "alipay"
                    ? "2px solid #111"
                    : "1px solid #ddd",
                background:
                  paymentMethod === "alipay"
                    ? "#f5f5f5"
                    : "#fff",
              }}
            >
              支付宝
            </button>
          </div>
        </div>

        {/* 收款提示 */}
        <div
          style={{
            marginTop: 16,
            padding: 14,
            borderRadius: 12,
            background: "#fff8e6",
            fontSize: 13,
            lineHeight: 1.7,
          }}
        >
          当前为人工审核模式。

          <br />

          提交订单后，请按照你的实际收款方式完成付款，
          然后等待管理员审核。
        </div>

        {error && (
          <div
            className="authError"
            style={{
              marginTop: 14,
            }}
          >
            {error}
          </div>
        )}

        {success && (
          <div
            className="authSuccess"
            style={{
              marginTop: 14,
            }}
          >
            {success}

            {orderNo && (
              <div
                style={{
                  marginTop: 6,
                  fontWeight: 700,
                }}
              >
                订单号：{orderNo}
              </div>
            )}
          </div>
        )}

        {!success && (
          <button
            type="button"
            className="authSubmit"
            disabled={loading}
            onClick={submitOrder}
            style={{
              marginTop: 18,
            }}
          >
            {loading
              ? "提交中..."
              : `提交付款申请 ¥${amount}`}
          </button>
        )}

        <div
          style={{
            marginTop: 14,
            textAlign: "center",
            fontSize: 12,
            color: "#888",
          }}
        >
          月付 ¥19.9 · 年付 ¥199
        </div>
      </div>
    </div>
  );
}
