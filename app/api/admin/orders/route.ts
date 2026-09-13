import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// 可在 Vercel 环境变量中设置：
// ADMIN_EMAILS=louqingle12@gmail.com
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
    // ==========================================
    // 1. 检查环境变量
    // ==========================================

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        {
          success: false,
          code: "SUPABASE_ENV_MISSING",
          error:
            "服务器缺少 Supabase Admin 环境变量",
        },
        { status: 500 }
      );
    }

    // ==========================================
    // 2. 获取登录 Token
    // ==========================================

    const authorization =
      request.headers.get("authorization");

    if (!authorization) {
      return NextResponse.json(
        {
          success: false,
          code: "NO_AUTHORIZATION",
          error: "没有登录凭证",
        },
        { status: 401 }
      );
    }

    if (!authorization.startsWith("Bearer ")) {
      return NextResponse.json(
        {
          success: false,
          code: "INVALID_AUTHORIZATION",
          error: "登录凭证格式错误",
        },
        { status: 401 }
      );
    }

    const token = authorization.slice(7).trim();

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          code: "EMPTY_TOKEN",
          error: "登录凭证为空",
        },
        { status: 401 }
      );
    }

    // ==========================================
    // 3. 验证 Supabase 用户
    // ==========================================

    const {
      data: authData,
      error: authError,
    } =
      await supabaseAdmin.auth.getUser(token);

    const user = authData?.user;

    if (authError || !user) {
      console.error(
        "Supabase auth error:",
        authError
      );

      return NextResponse.json(
        {
          success: false,
          code: "INVALID_TOKEN",
          error:
            "登录已失效，请退出后重新登录",
        },
        { status: 401 }
      );
    }

    const userEmail =
      (user.email || "").toLowerCase();

    console.log(
      "Admin API user:",
      userEmail,
      user.id
    );

    // ==========================================
    // 4. 查询 profiles
    // ==========================================

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
    }

    // ==========================================
    // 5. 三种管理员身份
    // ==========================================

    // 方法一：
    // profiles.is_admin = true
    const isProfileAdmin =
      profile?.is_admin === true;

    // 方法二：
    // Supabase user metadata
    const metadataRole =
      user.app_metadata?.role;

    const isMetadataAdmin =
      metadataRole === "admin";

    // 方法三：
    // Vercel ADMIN_EMAILS
    const isEmailAdmin =
      !!userEmail &&
      adminEmails.includes(userEmail);

    const isAdmin =
      isProfileAdmin ||
      isMetadataAdmin ||
      isEmailAdmin;

    console.log("Admin permission:", {
      email: userEmail,
      userId: user.id,
      profileExists: !!profile,
      profileAdmin: isProfileAdmin,
      metadataAdmin: isMetadataAdmin,
      emailAdmin: isEmailAdmin,
      isAdmin,
    });

    // ==========================================
    // 6. 没有管理员权限
    // ==========================================

    if (!isAdmin) {
      return NextResponse.json(
        {
          success: false,
          code: "NOT_ADMIN",
          error: "当前账户没有管理员权限",

          // 返回诊断信息
          user: {
            id: user.id,
            email: user.email,
          },

          profile: profile
            ? {
                is_admin:
                  profile.is_admin,
                plan: profile.plan,
              }
            : null,

          checks: {
            profileAdmin:
              isProfileAdmin,
            metadataAdmin:
              isMetadataAdmin,
            emailAdmin:
              isEmailAdmin,
          },
        },
        { status: 403 }
      );
    }

    // ==========================================
    // 7. 获取订单
    // ==========================================

    const {
      data: orders,
      error: ordersError,
    } =
      await supabaseAdmin
        .from("orders")
        .select("*")
        .order("created_at", {
          ascending: false,
        });

    if (ordersError) {
      console.error(
        "Orders query error:",
        ordersError
      );

      return NextResponse.json(
        {
          success: false,
          code: "ORDERS_QUERY_ERROR",
          error: "获取订单失败",
          detail:
            ordersError.message,
        },
        { status: 500 }
      );
    }

    // ==========================================
    // 8. 获取订单用户邮箱
    // ==========================================

    const userIds = Array.from(
      new Set(
        (orders || [])
          .map(
            (order) =>
              order.user_id
          )
          .filter(Boolean)
      )
    );

    const userMap: Record<
      string,
      string
    > = {};

    for (const userId of userIds) {
      try {
        const {
          data: userData,
          error: userError,
        } =
          await supabaseAdmin.auth.admin.getUserById(
            userId
          );

        if (
          !userError &&
          userData?.user
        ) {
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

    // ==========================================
    // 9. 合并订单数据
    // ==========================================

    const result =
      (orders || []).map(
        (order) => ({
          ...order,

          user_email:
            userMap[
              order.user_id
            ] || "未知用户",
        })
      );

    // ==========================================
    // 10. 返回管理员数据
    // ==========================================

    return NextResponse.json({
      success: true,

      admin: {
        id: user.id,
        email: user.email,
        is_admin: true,
        plan:
          profile?.plan || "free",
        permission:
          isProfileAdmin
            ? "profile"
            : isMetadataAdmin
            ? "metadata"
            : "email",
      },

      orders: result,

      stats: {
        total:
          result.length,

        pending:
          result.filter(
            (order) =>
              order.status ===
              "pending"
          ).length,

        approved:
          result.filter(
            (order) =>
              order.status ===
              "approved"
          ).length,

        rejected:
          result.filter(
            (order) =>
              order.status ===
              "rejected"
          ).length,
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
        error: "服务器内部错误",
        detail:
          error instanceof Error
            ? error.message
            : String(error),
      },
      { status: 500 }
    );
  }
}
