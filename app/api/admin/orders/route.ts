import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(request: Request) {
  try {
    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        {
          success: false,
          error: "服务器缺少 Supabase 环境变量",
          debug: {
            hasUrl: !!supabaseUrl,
            hasServiceRole: !!serviceRoleKey,
          },
        },
        { status: 500 }
      );
    }

    const authHeader = request.headers.get("authorization");

    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        {
          success: false,
          error: "未登录",
        },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7).trim();

    // 普通客户端：验证当前登录用户
    const supabaseAuth = createClient(
      supabaseUrl,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      }
    );

    const {
      data: { user },
      error: authError,
    } = await supabaseAuth.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        {
          success: false,
          error: "登录身份验证失败",
          debug: {
            message: authError?.message || "没有用户",
          },
        },
        { status: 401 }
      );
    }

    // 服务端管理员客户端
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

    // 检查管理员权限
    const { data: profile, error: profileError } =
      await supabaseAdmin
        .from("profiles")
        .select("id,email,is_admin,plan")
        .eq("id", user.id)
        .maybeSingle();

    if (profileError) {
      console.error("PROFILE ERROR:", profileError);

      return NextResponse.json(
        {
          success: false,
          error: "读取管理员资料失败",
          debug: {
            code: profileError.code,
            message: profileError.message,
            details: profileError.details,
            hint: profileError.hint,
          },
        },
        { status: 500 }
      );
    }

    if (!profile?.is_admin) {
      return NextResponse.json(
        {
          success: false,
          error: "当前账户没有管理员权限",
          debug: {
            userId: user.id,
            email: user.email,
            profileFound: !!profile,
            isAdmin: profile?.is_admin ?? false,
          },
        },
        { status: 403 }
      );
    }

    // 读取真正的 PRO 订单表
    const {
      data: orders,
      error: ordersError,
    } = await supabaseAdmin
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
      .order("created_at", {
        ascending: false,
      });

    if (ordersError) {
      console.error("PRO ORDERS ERROR:", ordersError);

      return NextResponse.json(
        {
          success: false,
          error: "PRO订单数据库查询失败",
          debug: {
            code: ordersError.code,
            message: ordersError.message,
            details: ordersError.details,
            hint: ordersError.hint,
          },
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      orders: orders || [],
      count: orders?.length || 0,
      admin: {
        id: user.id,
        email: user.email,
      },
    });
  } catch (error: any) {
    console.error("ADMIN ORDERS FATAL ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: "后台订单接口发生异常",
        debug: {
          message: error?.message || String(error),
          stack: error?.stack || null,
        },
      },
      { status: 500 }
    );
  }
}
