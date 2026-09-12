import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function PATCH(
  request: NextRequest,
  context: {
    params: Promise<{ id: string }>;
  }
) {
  try {
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        { error: "订单ID不能为空" },
        { status: 400 }
      );
    }

    // 获取管理员登录 Token
    const authHeader = request.headers.get("authorization");

    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "未登录" },
        { status: 401 }
      );
    }

    const token = authHeader.replace("Bearer ", "");

    // 验证用户
    const {
      data: { user },
      error: userError,
    } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      return NextResponse.json(
        { error: "登录已失效" },
        { status: 401 }
      );
    }

    // 检查管理员权限
    const { data: profile, error: profileError } =
      await supabaseAdmin
        .from("profiles")
        .select("is_admin")
        .eq("id", user.id)
        .maybeSingle();

    if (profileError) {
      console.error("Profile error:", profileError);

      return NextResponse.json(
        { error: "无法验证管理员权限" },
        { status: 500 }
      );
    }

    if (!profile?.is_admin) {
      return NextResponse.json(
        { error: "没有管理员权限" },
        { status: 403 }
      );
    }

    // 读取请求
    const body = await request.json();

    const status = body?.status;

    // 这个接口只处理拒绝
    if (status !== "rejected") {
      return NextResponse.json(
        {
          error:
            "该接口只支持将订单设置为 rejected",
        },
        { status: 400 }
      );
    }

    // 查询订单
    const { data: order, error: orderError } =
      await supabaseAdmin
        .from("orders")
        .select("*")
        .eq("id", id)
        .maybeSingle();

    if (orderError) {
      console.error("Order query error:", orderError);

      return NextResponse.json(
        { error: "查询订单失败" },
        { status: 500 }
      );
    }

    if (!order) {
      return NextResponse.json(
        { error: "订单不存在" },
        { status: 404 }
      );
    }

    // 已通过的订单不能拒绝
    if (order.status === "approved") {
      return NextResponse.json(
        {
          error:
            "订单已经通过，不能再次拒绝",
        },
        { status: 400 }
      );
    }

    // 更新订单
    const { data: updatedOrder, error: updateError } =
      await supabaseAdmin
        .from("orders")
        .update({
          status: "rejected",
        })
        .eq("id", id)
        .select()
        .single();

    if (updateError) {
      console.error("Order update error:", updateError);

      return NextResponse.json(
        {
          error: "拒绝订单失败",
          detail: updateError.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "订单已拒绝",
      order: updatedOrder,
    });
  } catch (error: any) {
    console.error("Reject order error:", error);

    return NextResponse.json(
      {
        error:
          error?.message ||
          "服务器内部错误",
      },
      { status: 500 }
    );
  }
}
