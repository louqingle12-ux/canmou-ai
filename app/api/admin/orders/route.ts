import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Supabase Admin 环境变量缺失");
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
    // ============================
    // 1. 获取 Token
    // ============================

    const authorization =
      request.headers.get("authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return NextResponse.json(
        {
          success: false,
          code: "NO_TOKEN",
          error: "未登录，请重新登录",
        },
        { status: 401 }
      );
    }

    const token = authorization.slice(7);

    // ============================
    // 2. 验证用户
    // ============================

    const {
      data: { user },
      error: userError,
    } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      console.error("Auth error:", userError);

      return NextResponse.json(
        {
          success: false,
          code: "INVALID_TOKEN",
          error: "登录已失效，请重新登录",
          detail: userError?.message || null,
        },
        { status: 401 }
      );
    }

    console.log("Admin API 当前用户:", {
      id: user.id,
      email: user.email,
    });

    // ============================
    // 3. 查询 profiles
    // ============================

    const {
      data: profile,
      error: profileError,
    } = await supabaseAdmin
      .from("profiles")
      .select("id, is_admin, plan")
      .eq("id", user.id)
      .maybeSingle();

    console.log("Admin API Profile:", {
      profile,
      profileError,
    });

    // ============================
    // 4. Profile 不存在
    // ============================

    if (profileError) {
      return NextResponse.json(
        {
          success: false,
          code: "PROFILE_QUERY_ERROR",
          error: "查询管理员资料失败",
          detail: profileError.message,
          user_id: user.id,
          user_email: user.email,
        },
        { status: 500 }
      );
    }

    if (!profile) {
      return NextResponse.json(
        {
          success: false,
          code: "PROFILE_NOT_FOUND",
          error: "找不到当前用户的 profiles 记录",
          user_id: user.id,
          user_email: user.email,
        },
        { status: 403 }
      );
    }

    // ============================
    // 5. 判断管理员
    // ============================

    if (profile.is_admin !== true) {
      return NextResponse.json(
        {
          success: false,
          code: "NOT_ADMIN",
          error: "当前账户不是管理员",
          user_id: user.id,
          user_email: user.email,
          is_admin: profile.is_admin,
          plan: profile.plan,
        },
        { status: 403 }
      );
    }

    // ============================
    // 6. 获取订单
    // ============================

    const {
      data: orders,
      error: ordersError,
    } = await supabaseAdmin
      .from("orders")
      .select("*")
      .order("created_at", {
        ascending: false,
      });

    if (ordersError) {
      console.error("Orders error:", ordersError);

      return NextResponse.json(
        {
          success: false,
          code: "ORDERS_QUERY_ERROR",
          error: "获取订单失败",
          detail: ordersError.message,
        },
        { status: 500 }
      );
    }

    // ============================
    // 7. 获取订单用户邮箱
    // ============================

    const userIds = Array.from(
      new Set(
        (orders || [])
          .map((order) => order.user_id)
          .filter(Boolean)
      )
    );

    const userMap: Record<string, string> = {};

    for (const userId of userIds) {
      try {
        const {
          data: userData,
        } =
          await supabaseAdmin.auth.admin.getUserById(
            userId
          );

        if (userData?.user) {
          userMap[userId] =
            userData.user.email || "";
        }
      } catch (error) {
        console.error(
          "Get order user error:",
          userId,
          error
        );
      }
    }

    // ============================
    // 8. 返回订单
    // ============================

    const result = (orders || []).map(
      (order) => ({
        ...order,
        user_email:
          userMap[order.user_id] ||
          "未知用户",
      })
    );

    return NextResponse.json({
      success: true,
      orders: result,
      admin: {
        id: user.id,
        email: user.email,
        is_admin: profile.is_admin,
        plan: profile.plan,
      },
    });
  } catch (error) {
    console.error(
      "Admin orders GET error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        code: "SERVER_ERROR",
        error: "服务器错误",
        detail:
          error instanceof Error
            ? error.message
            : String(error),
      },
      { status: 500 }
    );
  }
}
