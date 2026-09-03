import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL!;

const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const MONTH_PRICE = 19.9;
const YEAR_PRICE = 199;

function generateOrderNo() {
  const now = new Date();

  const date =
    now
      .toISOString()
      .replace(/\D/g, "")
      .slice(0, 14);

  const random =
    Math.random()
      .toString(36)
      .substring(2, 8)
      .toUpperCase();

  return `CM${date}${random}`;
}

export async function POST(
  request: Request
) {
  try {
    const authHeader =
      request.headers.get(
        "authorization"
      );

    if (
      !authHeader ||
      !authHeader.startsWith("Bearer ")
    ) {
      return NextResponse.json(
        {
          error: "请先登录",
        },
        {
          status: 401,
        }
      );
    }

    const token =
      authHeader
        .substring(7)
        .trim();

    const supabase =
      createClient(
        SUPABASE_URL,
        SUPABASE_ANON_KEY,
        {
          global: {
            headers: {
              Authorization:
                `Bearer ${token}`,
            },
          },
        }
      );

    const {
      data: { user },
      error: userError,
    } =
      await supabase.auth.getUser(
        token
      );

    if (
      userError ||
      !user
    ) {
      return NextResponse.json(
        {
          error:
            "登录已经失效，请重新登录",
        },
        {
          status: 401,
        }
      );
    }

    const body =
      await request.json();

    const billingCycle =
      body?.billingCycle ===
      "year"
        ? "year"
        : "month";

    const paymentMethod =
      body?.paymentMethod ===
      "alipay"
        ? "alipay"
        : "wechat";

    const amount =
      billingCycle === "year"
        ? YEAR_PRICE
        : MONTH_PRICE;

    const orderNo =
      generateOrderNo();

    const { error } =
      await supabase
        .from("pro_orders")
        .insert({
          order_no: orderNo,
          user_id: user.id,
          email:
            user.email || "",
          plan: "pro",
          billing_cycle:
            billingCycle,
          amount,
          payment_method:
            paymentMethod,
          status: "pending",
        });

    if (error) {
      console.error(
        "Create PRO order error:",
        error
      );

      return NextResponse.json(
        {
          error:
            "订单创建失败，请稍后再试",
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json({
      success: true,
      orderNo,
      amount,
      billingCycle,
      paymentMethod,
      status: "pending",
    });
  } catch (error) {
    console.error(
      "PRO order fatal error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "服务器发生错误",
      },
      {
        status: 500,
      }
    );
  }
}
