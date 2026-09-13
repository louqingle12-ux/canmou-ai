import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL;

const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY;

const adminEmails = (process.env.ADMIN_EMAILS || "")
  .split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

if (!supabaseUrl || !serviceRoleKey) {
  console.error(
    "Missing Supabase Admin environment variables"
  );
}

const supabaseAdmin = createClient(
  supabaseUrl || "",
  serviceRoleKey || "",
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export async function GET(request: Request) {
  try {
    // ==============================
    // 1. 检查环境变量
    // ==============================

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        {
          success: false,
          error: "Supabase 管理员环境变量缺失",
        },
        { status: 500 }
      );
    }

    // ==============================
    // 2. 获取登录 Token
    // ==============================

    const authorization =
      request.headers.get("authorization");

    if (
      !authorization ||
      !authorization.startsWith("Bearer ")
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "请先登录",
        },
        { status: 401 }
      );
    }

    const token =
      authorization.slice(7).trim();

    // ==============================
    // 3. 验证当前用户
    // ==============================

    const {
      data: authData,
      error: authError,
    } =
      await supabaseAdmin.auth.getUser(token);

    const user = authData?.user;

    if (authError || !user) {
      console.error(
        "Admin auth error:",
        authError
      );

      return NextResponse.json(
        {
          success: false,
          error: "登录已失效，请重新登录",
        },
        { status: 401 }
      );
    }

    const email =
      (user.email || "").toLowerCase();

    // ==============================
    // 4. 查询管理员 Profile
    // ==============================

    const {
      data: profile,
      error: profileError,
    } =
      await supabaseAdmin
        .from("profiles")
        .select(
          "id, is_admin, plan"
        )
        .eq("id", user.id)
        .maybeSingle();

    if (profileError) {
      console.error(
        "Profile query error:",
        profileError
      );

      return NextResponse.json(
        {
          success: false,
          error: "查询管理员资料失败",
          detail: profileError.message,
        },
        { status: 500 }
      );
    }

    // ==============================
    // 5. 三重管理员判断
    // ==============================

    const profileAdmin =
      profile?.is_admin === true;

    const metadataAdmin =
      user.app_metadata?.role ===
      "admin";

    const emailAdmin =
      adminEmails.includes(email);

    const isAdmin =
      profileAdmin ||
      metadataAdmin ||
      emailAdmin;

    if (!isAdmin) {
      return NextResponse.json(
        {
          success: false,
          error:
            "当前账户没有管理员权限",
          user: {
            id: user.id,
            email: user.email,
          },
          checks: {
            profileAdmin,
            metadataAdmin,
            emailAdmin,
          },
        },
        { status: 403 }
      );
    }

    // ==============================
    // 6. ★ 读取真正的 PRO 订单表
    // ==============================

    const {
      data: orders,
      error: ordersError,
    } =
      await supabaseAdmin
        .from("pro_orders")
        .select(`
          id,
          order_no,
          user_id,
          email,
          plan,
          billing_cycle,
          amount,
          payment_method,
          status,
          created_at,
          paid_at,
          expires_at,
          approved_at,
          approved_by,
          trade_no
        `)
        .order(
          "created_at",
          {
            ascending: false,
          }
        );

    if (ordersError) {
      console.error(
        "PRO orders query error:",
        ordersError
      );

      return NextResponse.json(
        {
          success: false,
          error: "获取 PRO 订单失败",
          detail:
            ordersError.message,
        },
        { status: 500 }
      );
    }

    // ==============================
    // 7. 整理订单
    // ==============================

    const result =
      (orders || []).map(
        (order) => ({
          id: order.id,

          order_no:
            order.order_no,

          user_id:
            order.user_id,

          user_email:
            order.email || "未知用户",

          email:
            order.email || "未知用户",

          plan:
            order.plan || "pro",

          billing_cycle:
            order.billing_cycle ||
            "monthly",

          amount:
            Number(order.amount || 0),

          payment_method:
            order.payment_method ||
            "wechat",

          status:
            order.status || "pending",

          created_at:
            order.created_at,

          paid_at:
            order.paid_at,

          expires_at:
            order.expires_at,

          approved_at:
            order.approved_at,

          approved_by:
            order.approved_by,

          trade_no:
            order.trade_no,
        })
      );

    // ==============================
    // 8. 统计
    // ==============================

    const pending =
      result.filter(
        (order) =>
          order.status ===
          "pending"
      );

    const approved =
      result.filter(
        (order) =>
          order.status ===
          "approved"
      );

    const rejected =
      result.filter(
        (order) =>
          order.status ===
          "rejected"
      );

    const totalRevenue =
      approved.reduce(
        (sum, order) =>
          sum +
          Number(
            order.amount || 0
          ),
        0
      );

    // ==============================
    // 9. 返回管理员数据
    // ==============================

    return NextResponse.json({
      success: true,

      admin: {
        id: user.id,
        email: user.email,
        is_admin: true,
        plan:
          profile?.plan ||
          "free",
      },

      orders: result,

      stats: {
        total: result.length,
        pending: pending.length,
        approved: approved.length,
        rejected: rejected.length,
        revenue: totalRevenue,
      },
    });
  } catch (error) {
    console.error(
      "Admin orders fatal error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "管理员订单接口发生错误",
        detail:
          error instanceof Error
            ? error.message
            : String(error),
      },
      { status: 500 }
    );
  }
}
