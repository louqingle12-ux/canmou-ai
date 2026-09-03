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

type Params = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(
  request: Request,
  { params }: Params
) {
  try {
    /**
     * ============================
     * 1. 获取订单 ID
     * ============================
     */

    const { id: orderId } =
      await params;

    if (!orderId) {
      return NextResponse.json(
        {
          error: "订单ID不能为空",
        },
        {
          status: 400,
        }
      );
    }

    /**
     * ============================
     * 2. 获取管理员 Token
     * ============================
     */

    const authorization =
      request.headers.get(
        "authorization"
      );

    if (
      !authorization?.startsWith(
        "Bearer "
      )
    ) {
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
      authorization.replace(
        "Bearer ",
        ""
      );

    /**
     * ============================
     * 3. 验证当前用户
     * ============================
     */

    const {
      data: {
        user: adminUser,
      },
      error: userError,
    } =
      await supabaseAdmin.auth.getUser(
        token
      );

    if (
      userError ||
      !adminUser
    ) {
      return NextResponse.json(
        {
          error:
            "管理员登录已失效",
        },
        {
          status: 401,
        }
      );
    }

    /**
     * ============================
     * 4. 验证管理员身份
     * ============================
     */

    const {
      data: adminProfile,
      error: adminProfileError,
    } =
      await supabaseAdmin
        .from("profiles")
        .select("is_admin")
        .eq(
          "id",
          adminUser.id
        )
        .single();

    if (
      adminProfileError ||
      !adminProfile?.is_admin
    ) {
      return NextResponse.json(
        {
          error:
            "没有管理员权限",
        },
        {
          status: 403,
        }
      );
    }

    /**
     * ============================
     * 5. 查询订单
     * ============================
     */

    const {
      data: order,
      error: orderError,
    } =
      await supabaseAdmin
        .from("orders")
        .select("*")
        .eq(
          "id",
          orderId
        )
        .single();

    if (
      orderError ||
      !order
    ) {
      return NextResponse.json(
        {
          error:
            "订单不存在",
        },
        {
          status: 404,
        }
      );
    }

    /**
     * ============================
     * 6. 防止重复审核
     * ============================
     */

    if (
      order.status ===
      "approved"
    ) {
      return NextResponse.json({
        success: true,
        message:
          "该订单已经通过",
      });
    }

    /**
     * ============================
     * 7. 给用户升级 PRO
     * ============================
     */

    const {
      error: planError,
    } =
      await supabaseAdmin
        .from("profiles")
        .update({
          plan: "pro",
        })
        .eq(
          "id",
          order.user_id
        );

    if (planError) {
      console.error(
        "Upgrade user error:",
        planError
      );

      return NextResponse.json(
        {
          error:
            "升级用户 PRO 失败",
        },
        {
          status: 500,
        }
      );
    }

    /**
     * ============================
     * 8. 更新订单状态
     * ============================
     */

    const {
      error: updateOrderError,
    } =
      await supabaseAdmin
        .from("orders")
        .update({
          status:
            "approved",

          approved_at:
            new Date().toISOString(),

          approved_by:
            adminUser.id,
        })
        .eq(
          "id",
          orderId
        );

    /**
     * 如果订单更新失败
     *
     * 注意：
     * profiles 已经升级 PRO。
     *
     * 这里立即尝试回滚。
     */

    if (updateOrderError) {
      console.error(
        "Update order error:",
        updateOrderError
      );

      await supabaseAdmin
        .from("profiles")
        .update({
          plan: "free",
        })
        .eq(
          "id",
          order.user_id
        );

      return NextResponse.json(
        {
          error:
            "订单更新失败，已回滚 PRO 状态",
        },
        {
          status: 500,
        }
      );
    }

    /**
     * ============================
     * 9. 成功
     * ============================
     */

    return NextResponse.json({
      success: true,

      message:
        "审核通过，用户已经升级 PRO",

      orderId,

      userId:
        order.user_id,
    });
  } catch (error) {
    console.error(
      "Approve order error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "服务器内部错误",
      },
      {
        status: 500,
      }
    );
  }
}
