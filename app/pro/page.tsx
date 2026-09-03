"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  Sparkles,
  Smartphone,
  ShieldCheck,
  Clock3,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

type PaymentMethod = "wechat" | "alipay";

export default function ProPage() {
  const router = useRouter();

  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>("wechat");

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [orderNo, setOrderNo] = useState("");
  const [error, setError] = useState("");

  function generateOrderNo() {
    const now = new Date();

    const date =
      `${now.getFullYear()}` +
      `${String(now.getMonth() + 1).padStart(2, "0")}` +
      `${String(now.getDate()).padStart(2, "0")}` +
      `${String(now.getHours()).padStart(2, "0")}` +
      `${String(now.getMinutes()).padStart(2, "0")}` +
      `${String(now.getSeconds()).padStart(2, "0")}`;

    const random = Math.random()
      .toString(36)
      .substring(2, 8)
      .toUpperCase();

    return `CM${date}${random}`;
  }

  async function createOrder() {
    if (loading) return;

    setLoading(true);
    setError("");

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        throw new Error("获取登录状态失败");
      }

      if (!session?.user?.id) {
        throw new Error("请先登录餐谋AI");
      }

      const newOrderNo = generateOrderNo();

      const { error: orderError } = await supabase
        .from("orders")
        .insert({
          order_no: newOrderNo,
          user_id: session.user.id,
          email: session.user.email ?? null,
          plan: "pro",
          billing_cycle: "monthly",
          amount: 29.9,
          payment_method: paymentMethod,
          status: "pending",
        });

      if (orderError) {
        console.error(orderError);

        if (orderError.code === "42501") {
          throw new Error(
            "没有创建订单权限，请检查 orders 表 RLS"
          );
        }

        if (orderError.code === "23505") {
          throw new Error("订单号重复，请重新提交");
        }

        if (orderError.code === "23502") {
          throw new Error(
            "订单缺少必要字段，请检查数据库"
          );
        }

        throw new Error(
          orderError.message || "订单创建失败"
        );
      }

      setOrderNo(newOrderNo);
      setSuccess(true);
    } catch (err: any) {
      console.error(err);

      setError(
        err?.message ||
          "订单创建失败，请稍后重试"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="proPage">

      {/* 顶部 */}

      <header className="proTopbar">
        <button
          className="backButton"
          onClick={() => router.push("/")}
        >
          <ArrowLeft size={18} />
          返回餐谋AI
        </button>

        <div className="proTopBrand">
          <div className="miniLogo">
            谋
          </div>

          <strong>餐谋AI</strong>
        </div>

        <div className="secureText">
          <ShieldCheck size={16} />
          安全订单
        </div>
      </header>

      {!success ? (
        <div className="proContainer">

          {/* 左侧产品 */}

          <section className="proProduct">

            <div className="proBadge">
              <Sparkles size={15} />
              RESTAURANT OS PRO
            </div>

            <h1>
              让AI真正参与
              <br />
              <span>你的餐厅经营。</span>
            </h1>

            <p className="proDescription">
              一套专为餐饮老板打造的AI经营系统，
              从营业额、菜单、差评到利润，
              帮你发现问题并给出执行方案。
            </p>

            <div className="priceBox">
              <span>¥</span>
              <strong>29.9</strong>
              <small>/ 月</small>
            </div>

            <div className="features">

              <Feature text="无限AI经营分析" />

              <Feature text="AI餐饮CEO经营顾问" />

              <Feature text="菜单智能分析" />

              <Feature text="差评自动诊断" />

              <Feature text="利润与成本分析" />

              <Feature text="营销方案生成" />

            </div>

          </section>

          {/* 右侧付款 */}

          <section className="checkoutCard">

            <div className="checkoutHeader">
              <span>ORDER</span>
              <h2>升级 PRO</h2>
              <p>
                选择付款方式并提交付款申请
              </p>
            </div>

            <div className="checkoutPrice">
              <span>应付金额</span>

              <strong>
                ¥29.90
              </strong>
            </div>

            <div className="paymentLabel">
              付款方式
            </div>

            <div className="paymentOptions">

              <button
                className={
                  paymentMethod === "wechat"
                    ? "paymentOption active"
                    : "paymentOption"
                }
                onClick={() =>
                  setPaymentMethod("wechat")
                }
                type="button"
              >
                <div className="paymentIcon wechat">
                  微信
                </div>

                <div>
                  <strong>
                    微信支付
                  </strong>

                  <span>
                    推荐使用
                  </span>
                </div>

                <div className="radio">
                  {paymentMethod === "wechat" && (
                    <Check size={13} />
                  )}
                </div>
              </button>

              <button
                className={
                  paymentMethod === "alipay"
                    ? "paymentOption active"
                    : "paymentOption"
                }
                onClick={() =>
                  setPaymentMethod("alipay")
                }
                type="button"
              >
                <div className="paymentIcon alipay">
                  支付
                </div>

                <div>
                  <strong>
                    支付宝
                  </strong>

                  <span>
                    支持支付宝付款
                  </span>
                </div>

                <div className="radio">
                  {paymentMethod === "alipay" && (
                    <Check size={13} />
                  )}
                </div>
              </button>

            </div>

            <div className="paymentTip">
              <Smartphone size={17} />

              <div>
                <strong>
                  提交付款申请
                </strong>

                <p>
                  提交后按照页面提示完成付款，
                  管理员确认收款后自动开通 PRO。
                </p>
              </div>
            </div>

            {error && (
              <div className="checkoutError">
                {error}
              </div>
            )}

            <button
              className="payButton"
              onClick={createOrder}
              disabled={loading}
            >
              {loading
                ? "正在创建订单..."
                : `提交${paymentMethod === "wechat"
                    ? "微信"
                    : "支付宝"}付款申请`}
            </button>

            <div className="checkoutBottom">

              <div>
                <ShieldCheck size={15} />
                安全订单
              </div>

              <div>
                <Clock3 size={15} />
                人工审核
              </div>

            </div>

          </section>

        </div>
      ) : (

        /* ===============================
           成功页面
        =============================== */

        <div className="successContainer">

          <div className="successCard">

            <div className="successCircle">
              <Check size={32} />
            </div>

            <div className="successBadge">
              ORDER SUBMITTED
            </div>

            <h1>
              订单提交成功
            </h1>

            <p>
              你的PRO付款申请已经提交。
            </p>

            <div className="orderInfo">

              <div>
                <span>订单号</span>
                <strong>{orderNo}</strong>
              </div>

              <div>
                <span>套餐</span>
                <strong>餐谋AI PRO / 月</strong>
              </div>

              <div>
                <span>金额</span>
                <strong>¥29.90</strong>
              </div>

              <div>
                <span>付款方式</span>
                <strong>
                  {paymentMethod === "wechat"
                    ? "微信支付"
                    : "支付宝"}
                </strong>
              </div>

            </div>

            <div className="successNotice">
              <Clock3 size={18} />

              <div>
                <strong>
                  等待管理员审核
                </strong>

                <p>
                  管理员确认付款后，
                  你的账户会自动升级为 PRO，
                  无需重复购买。
                </p>
              </div>
            </div>

            <button
              className="successButton"
              onClick={() => router.push("/")}
            >
              返回餐谋AI
            </button>

          </div>

        </div>
      )}

    </main>
  );
}

function Feature({
  text,
}: {
  text: string;
}) {
  return (
    <div className="feature">
      <div>
        <Check size={14} />
      </div>

      <span>{text}</span>
    </div>
  );
}
