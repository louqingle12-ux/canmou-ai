import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL!;

const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(
  supabaseUrl,
  serviceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export async function GET(request: Request) {
  try {
    /**
     * ============================
     * 1. 获取用户 Token
     * ============================
     */

    const authorization =
      request.headers.get("authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return NextResponse.json(
        {
          error: "未登录",
        },
        {
          status: 401,
        }
      );
    }

    const token =
      authorization.replace("Bearer ", "");

    /**
     * ============================
     * 2. 验证 Token
     * ============================
     */

    const {
      data: {
        user,
      },
      error: userError,
    } =
      await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      return NextResponse.json(
        {
          error: "登录已失效",
        },
        {
          status: 401,
        }
      );
    }

    /**
     * ============================
     * 3. 验证管理员
     * ============================
     */

    const {
      data: profile,
      error: profileError,
    } =
      await supabaseAdmin
        .from("profiles")
        .select("is_admin, plan")
        .eq("id", user.id)
        .single();

    if (
      profileError ||
      !profile?.is_admin
    ) {
      return NextResponse.json(
        {
          error: "没有管理员权限",
        },
        {
          status: 403,
        }
      );
    }

    /**
     * ============================
     * 4. 获取订单
     * ============================
     */

    const {
      data: orders,
      error: ordersError,
    } =
      await supabaseAdmin
        .from("orders")
        .select("*")
        .order(
          "created_at",
          {
            ascending: false,
          }
        );

    if (ordersError) {
      console.error(
        "Load orders error:",
        ordersError
      );

      return NextResponse.json(
        {
          error:
            "获取订单失败",
        },
        {
          status: 500,
        }
      );
    }

    /**
     * ============================
     * 5. 获取用户邮箱
     * ============================
     */

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
      const {
        data: userData,
      } =
        await supabaseAdmin.auth.admin.getUserById(
          userId
        );

      if (userData?.user) {
        userMap[userId] =
          userData.user.email ||
          "";
      }
    }

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

    return NextResponse.json({
      success: true,
      orders: result,
    });
  } catch (error) {
    console.error(
      "Admin orders GET error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "服务器错误",
      },
      {
        status: 500,
      }
    );
  }
}
