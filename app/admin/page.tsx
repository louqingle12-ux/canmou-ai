"use client";

import {
  Check,
  X,
  RefreshCw,
  ShieldCheck,
  Clock3,
  CheckCircle2,
  XCircle,
  LogOut,
  ArrowLeft,
  CreditCard,
  User,
  CalendarDays,
  AlertCircle,
  Eye,
  Search,
  Lock,
} from "lucide-react";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Order = {
  id: string;
  user_id: string;
  amount: number | string;
  payment_method: string;
  status: string;
  created_at: string;

  user_email?: string | null;
  email?: string | null;
  plan?: string | null;
  note?: string | null;
  trade_no?: string | null;
};

type Stats = {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
};

type FilterType =
  | "all"
  | "pending"
  | "approved"
  | "rejected";

export default function AdminPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [orders, setOrders] = useState<Order[]>([]);

  const [stats, setStats] = useState<Stats>({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
  });

  const [error, setError] = useState("");

  const [processingId, setProcessingId] =
    useState<string | null>(null);

  const [filter, setFilter] =
    useState<FilterType>("all");

  const [selectedOrder, setSelectedOrder] =
    useState<Order | null>(null);

  const [search, setSearch] = useState("");

  const [initialized, setInitialized] =
    useState(false);

  /*
   * =========================================================
   * 初始化
   * =========================================================
   */

  useEffect(() => {
    checkAdmin();
  }, []);

  /*
   * =========================================================
   * 管理员验证
   *
   * 重要：
   * 不再直接查询 profiles.is_admin。
   * 统一交给服务器端 /api/admin/orders 验证。
   *
   * 这样可以避免 RLS 导致：
   *
   * 管理员页面
   * ↓
   * profiles 查询失败
   * ↓
   * 被误判为非管理员
   * ↓
   * router.replace("/")
   * ↓
   * 闪退
   * =========================================================
   */

  async function checkAdmin() {
    if (initialized) return;

    setLoading(true);
    setError("");

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      /*
       * 没有登录状态时，不自动踢回首页。
       * 给用户一个明确提示。
       */
      if (!session) {
        setError(
          "当前没有检测到登录状态，请先登录管理员账号。"
        );
        return;
      }

      const res = await fetch(
        "/api/admin/orders",
        {
          method: "GET",

          headers: {
            Authorization:
              `Bearer ${session.access_token}`,
          },

          cache: "no-store",
        }
      );

      let data: any = {};

      try {
        data = await res.json();
      } catch {
        data = {};
      }

      /*
       * Token 失效
       */
      if (res.status === 401) {
        setError(
          "管理员登录状态已失效，请重新登录。"
        );
        return;
      }

      /*
       * 没有管理员权限
       *
       * 注意：
       * 这里绝对不再 router.replace("/")
       */
      if (res.status === 403) {
        setError(
          "当前账号没有管理员权限。"
        );
        return;
      }

      if (!res.ok) {
        throw new Error(
          data?.error ||
            "管理员后台加载失败"
        );
      }

      const list: Order[] =
        Array.isArray(data?.orders)
          ? data.orders
          : [];

      setOrders(list);
      calculateStats(list);

      setInitialized(true);
    } catch (err: any) {
      console.error(
        "Admin check error:",
        err
      );

      setError(
        err?.message ||
          "管理员后台加载失败，请稍后重试。"
      );
    } finally {
      setLoading(false);
    }
  }

  /*
   * =========================================================
   * 获取订单
   * =========================================================
   */

  async function loadOrders() {
    setRefreshing(true);
    setError("");

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setError(
          "登录状态已失效，请重新登录。"
        );
        return;
      }

      const res = await fetch(
        "/api/admin/orders",
        {
          method: "GET",

          headers: {
            Authorization:
              `Bearer ${session.access_token}`,
          },

          cache: "no-store",
        }
      );

      let data: any = {};

      try {
        data = await res.json();
      } catch {
        data = {};
      }

      if (res.status === 401) {
        setError(
          "管理员登录状态已失效，请重新登录。"
        );
        return;
      }

      if (res.status === 403) {
        setError(
          "当前账号没有管理员权限。"
        );
        return;
      }

      if (!res.ok) {
        throw new Error(
          data?.error ||
            "获取订单失败"
        );
      }

      const list: Order[] =
        Array.isArray(data?.orders)
          ? data.orders
          : [];

      setOrders(list);
      calculateStats(list);
      setInitialized(true);
    } catch (err: any) {
      console.error(
        "Load orders error:",
        err
      );

      setError(
        err?.message ||
          "订单加载失败，请稍后再试。"
      );
    } finally {
      setRefreshing(false);
    }
  }

  /*
   * =========================================================
   * 统计
   * =========================================================
   */

  function calculateStats(
    list: Order[]
  ) {
    setStats({
      total: list.length,

      pending: list.filter(
        (order) =>
          order.status === "pending"
      ).length,

      approved: list.filter(
        (order) =>
          order.status === "approved"
      ).length,

      rejected: list.filter(
        (order) =>
          order.status === "rejected"
      ).length,
    });
  }

  /*
   * =========================================================
   * 审核订单
   * =========================================================
   */

  async function updateOrder(
    orderId: string,
    status:
      | "approved"
      | "rejected"
  ) {
    if (processingId) return;

    const order = orders.find(
      (item) =>
        item.id === orderId
    );

    if (!order) return;

    const actionText =
      status === "approved"
        ? "通过"
        : "拒绝";

    const confirmed =
      window.confirm(
        `确定要${actionText}这个订单吗？`
      );

    if (!confirmed) return;

    setProcessingId(orderId);
    setError("");

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setError(
          "登录状态已失效，请重新登录。"
        );
        return;
      }

      /*
       * 通过：
       *
       * POST
       * /api/admin/orders/[id]/approve
       *
       * 拒绝：
       *
       * PATCH
       * /api/admin/orders/[id]
       */

      const isApprove =
        status === "approved";

      const url = isApprove
        ? `/api/admin/orders/${orderId}/approve`
        : `/api/admin/orders/${orderId}`;

      const options: RequestInit = {
        method: isApprove
          ? "POST"
          : "PATCH",

        headers: {
          "Content-Type":
            "application/json",

          Authorization:
            `Bearer ${session.access_token}`,
        },

        cache: "no-store",
      };

      if (!isApprove) {
        options.body =
          JSON.stringify({
            status: "rejected",
          });
      }

      const res = await fetch(
        url,
        options
      );

      let data: any = {};

      try {
        data = await res.json();
      } catch {
        data = {};
      }

      if (res.status === 401) {
        setError(
          "管理员登录状态已失效。"
        );
        return;
      }

      if (res.status === 403) {
        setError(
          "没有管理员权限。"
        );
        return;
      }

      if (!res.ok) {
        throw new Error(
          data?.error ||
            `订单${actionText}失败`
        );
      }

      /*
       * 更新本地订单
       */

      const updated =
        orders.map((item) =>
          item.id === orderId
            ? {
                ...item,
                status,
              }
            : item
        );

      setOrders(updated);
      calculateStats(updated);

      setSelectedOrder(null);

      /*
       * 操作成功后重新拉一次服务器数据
       * 防止前端状态和数据库不一致
       */

      await loadOrders();

      window.alert(
        status === "approved"
          ? "订单审核通过，用户 PRO 已自动开通。"
          : "订单已拒绝。"
      );
    } catch (err: any) {
      console.error(
        "Update order error:",
        err
      );

      setError(
        err?.message ||
          "操作失败，请稍后再试。"
      );
    } finally {
      setProcessingId(null);
    }
  }

  /*
   * =========================================================
   * 退出登录
   * =========================================================
   */

  async function logout() {
    try {
      await supabase.auth.signOut();
    } finally {
      router.push("/");
    }
  }

  /*
   * =========================================================
   * 筛选 + 搜索
   * =========================================================
   */

  const filteredOrders =
    useMemo(() => {
      let result =
        filter === "all"
          ? orders
          : orders.filter(
              (order) =>
                order.status ===
                filter
            );

      const keyword =
        search.trim().toLowerCase();

      if (keyword) {
        result = result.filter(
          (order) => {
            const email =
              getEmail(order)
                .toLowerCase();

            const id =
              String(order.id)
                .toLowerCase();

            const userId =
              String(order.user_id)
                .toLowerCase();

            const method =
              paymentName(
                order.payment_method
              ).toLowerCase();

            return (
              email.includes(keyword) ||
              id.includes(keyword) ||
              userId.includes(keyword) ||
              method.includes(keyword)
            );
          }
        );
      }

      return result;
    }, [
      orders,
      filter,
      search,
    ]);

  /*
   * =========================================================
   * 格式化时间
   * =========================================================
   */

  function formatDate(
    date: string
  ) {
    if (!date) return "-";

    try {
      return new Date(
        date
      ).toLocaleString(
        "zh-CN",
        {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        }
      );
    } catch {
      return date;
    }
  }

  /*
   * =========================================================
   * 金额
   * =========================================================
   */

  function formatAmount(
    amount: number | string
  ) {
    const value =
      Number(amount);

    if (
      Number.isNaN(value)
    ) {
      return String(amount || "0");
    }

    return value.toFixed(2);
  }

  /*
   * =========================================================
   * 支付方式
   * =========================================================
   */

  function paymentName(
    method?: string
  ) {
    if (!method) return "未知";

    const value =
      method.toLowerCase();

    if (
      value.includes("wechat") ||
      value.includes("微信")
    ) {
      return "微信支付";
    }

    if (
      value.includes("alipay") ||
      value.includes("支付宝")
    ) {
      return "支付宝";
    }

    return method;
  }

  /*
   * =========================================================
   * 状态
   * =========================================================
   */

  function statusName(
    status: string
  ) {
    switch (status) {
      case "pending":
        return "待审核";

      case "approved":
        return "已通过";

      case "rejected":
        return "已拒绝";

      default:
        return status || "未知";
    }
  }

  /*
   * =========================================================
   * 邮箱
   * =========================================================
   */

  function getEmail(
    order: Order
  ) {
    return (
      order.user_email ||
      order.email ||
      order.user_id ||
      "-"
    );
  }

  /*
   * =========================================================
   * 状态颜色
   * =========================================================
   */

  function statusClass(
    status: string
  ) {
    switch (status) {
      case "approved":
        return "statusApproved";

      case "rejected":
        return "statusRejected";

      default:
        return "statusPending";
    }
  }

  /*
   * =========================================================
   * 加载状态
   * =========================================================
   */

  if (loading) {
    return (
      <>
        <style jsx global>{adminStyles}</style>

        <main className="adminPage">
          <div className="adminLoading">
            <div className="loadingLogo">
              谋
            </div>

            <RefreshCw
              size={24}
              className="spin"
            />

            <h2>
              正在进入管理员后台
            </h2>

            <p>
              正在验证管理员权限...
            </p>
          </div>
        </main>
      </>
    );
  }

  /*
   * =========================================================
   * 页面
   * =========================================================
   */

  return (
    <>
      <style jsx global>
        {adminStyles}
      </style>

      <main className="adminPage">
        {/* ===================================================
            顶部导航
        =================================================== */}

        <header className="adminTopbar">
          <div className="adminBrand">
            <div className="adminLogo">
              谋
            </div>

            <div className="brandText">
              <strong>
                餐谋AI
              </strong>

              <span>
                ADMIN CONSOLE
              </span>
            </div>
          </div>

          <div className="adminTopActions">
            <div className="secureBadge">
              <ShieldCheck
                size={15}
              />

              管理员模式
            </div>

            <button
              className="topButton"
              onClick={loadOrders}
              disabled={refreshing}
            >
              <RefreshCw
                size={16}
                className={
                  refreshing
                    ? "spin"
                    : ""
                }
              />

              刷新
            </button>

            <button
              className="topButton"
              onClick={() =>
                router.push("/")
              }
            >
              <ArrowLeft
                size={16}
              />

              返回网站
            </button>

            <button
              className="logoutButton"
              onClick={logout}
            >
              <LogOut
                size={16}
              />

              退出
            </button>
          </div>
        </header>

        {/* ===================================================
            主体
        =================================================== */}

        <section className="adminContent">
          {/* 页面标题 */}

          <div className="pageHeading">
            <div>
              <div className="headingBadge">
                <Lock size={13} />

                PRIVATE ADMIN
              </div>

              <h1>
                管理员控制台
              </h1>

              <p>
                管理餐谋AI PRO 订单、付款申请和用户升级。
              </p>
            </div>

            <div className="headingRight">
              <div className="headingIcon">
                <ShieldCheck
                  size={24}
                />
              </div>

              <div>
                <strong>
                  系统安全
                </strong>

                <span>
                  Server-side verified
                </span>
              </div>
            </div>
          </div>

          {/* 错误 */}

          {error && (
            <div className="errorBox">
              <div className="errorIcon">
                <AlertCircle
                  size={19}
                />
              </div>

              <div className="errorText">
                <strong>
                  后台提示
                </strong>

                <span>
                  {error}
                </span>
              </div>

              <button
                className="errorClose"
                onClick={() =>
                  setError("")
                }
              >
                <X size={16} />
              </button>
            </div>
          )}

          {/* =================================================
              数据统计
          ================================================= */}

          <section className="statsGrid">
            <div className="statCard">
              <div className="statTop">
                <span>
                  全部订单
                </span>

                <div className="statIcon">
                  <CreditCard
                    size={19}
                  />
                </div>
              </div>

              <strong>
                {stats.total}
              </strong>

              <small>
                PRO 购买申请总数
              </small>
            </div>

            <div className="statCard pendingCard">
              <div className="statTop">
                <span>
                  待审核
                </span>

                <div className="statIcon">
                  <Clock3
                    size={19}
                  />
                </div>
              </div>

              <strong>
                {stats.pending}
              </strong>

              <small>
                等待管理员处理
              </small>
            </div>

            <div className="statCard approvedCard">
              <div className="statTop">
                <span>
                  已通过
                </span>

                <div className="statIcon">
                  <CheckCircle2
                    size={19}
                  />
                </div>
              </div>

              <strong>
                {stats.approved}
              </strong>

              <small>
                PRO 已成功开通
              </small>
            </div>

            <div className="statCard rejectedCard">
              <div className="statTop">
                <span>
                  已拒绝
                </span>

                <div className="statIcon">
                  <XCircle
                    size={19}
                  />
                </div>
              </div>

              <strong>
                {stats.rejected}
              </strong>

              <small>
                未通过的申请
              </small>
            </div>
          </section>

          {/* =================================================
              快捷概览
          ================================================= */}

          <section className="overviewBar">
            <div className="overviewLeft">
              <div className="overviewDot" />

              <div>
                <strong>
                  PRO 订单审核中心
                </strong>

                <span>
                  当前共有{" "}
                  <b>
                    {stats.pending}
                  </b>{" "}
                  个订单等待处理
                </span>
              </div>
            </div>

            {stats.pending > 0 && (
              <button
                className="quickPending"
                onClick={() =>
                  setFilter("pending")
                }
              >
                查看待审核订单
              </button>
            )}
          </section>

          {/* =================================================
              订单面板
          ================================================= */}

          <section className="ordersPanel">
            {/* 面板头 */}

            <div className="panelHeader">
              <div>
                <div className="panelLabel">
                  PRO ORDERS
                </div>

                <h2>
                  订单管理
                </h2>

                <p>
                  审核用户的 PRO 购买申请。
                </p>
              </div>

              <button
                className="refreshMain"
                onClick={loadOrders}
                disabled={refreshing}
              >
                <RefreshCw
                  size={16}
                  className={
                    refreshing
                      ? "spin"
                      : ""
                  }
                />

                {refreshing
                  ? "刷新中..."
                  : "刷新数据"}
              </button>
            </div>

            {/* 工具栏 */}

            <div className="toolbar">
              <div className="filterGroup">
                <button
                  className={
                    filter === "all"
                      ? "filterActive"
                      : ""
                  }
                  onClick={() =>
                    setFilter("all")
                  }
                >
                  全部
                  <span>
                    {stats.total}
                  </span>
                </button>

                <button
                  className={
                    filter === "pending"
                      ? "filterActive"
                      : ""
                  }
                  onClick={() =>
                    setFilter("pending")
                  }
                >
                  待审核
                  <span>
                    {stats.pending}
                  </span>
                </button>

                <button
                  className={
                    filter === "approved"
                      ? "filterActive"
                      : ""
                  }
                  onClick={() =>
                    setFilter("approved")
                  }
                >
                  已通过
                  <span>
                    {stats.approved}
                  </span>
                </button>

                <button
                  className={
                    filter === "rejected"
                      ? "filterActive"
                      : ""
                  }
                  onClick={() =>
                    setFilter("rejected")
                  }
                >
                  已拒绝
                  <span>
                    {stats.rejected}
                  </span>
                </button>
              </div>

              <div className="searchBox">
                <Search
                  size={17}
                />

                <input
                  value={search}
                  onChange={(e) =>
                    setSearch(
                      e.target.value
                    )
                  }
                  placeholder="搜索邮箱、订单号、用户ID..."
                />

                {search && (
                  <button
                    onClick={() =>
                      setSearch("")
                    }
                  >
                    <X size={15} />
                  </button>
                )}
              </div>
            </div>

            {/* =================================================
                空状态
            ================================================= */}

            {filteredOrders.length ===
              0 && (
              <div className="emptyState">
                <div className="emptyIcon">
                  <CreditCard
                    size={27}
                  />
                </div>

                <h3>
                  {search
                    ? "没有找到相关订单"
                    : filter ===
                        "pending"
                    ? "暂时没有待审核订单"
                    : "暂无订单数据"}
                </h3>

                <p>
                  {search
                    ? "请尝试其他搜索关键词。"
                    : "当用户提交 PRO 购买申请后，订单会显示在这里。"}
                </p>

                {search && (
                  <button
                    onClick={() =>
                      setSearch("")
                    }
                  >
                    清除搜索
                  </button>
                )}
              </div>
            )}

            {/* =================================================
                订单列表
            ================================================= */}

            {filteredOrders.length >
              0 && (
              <div className="orderList">
                {filteredOrders.map(
                  (order) => {
                    const isProcessing =
                      processingId ===
                      order.id;

                    return (
                      <div
                        className="orderRow"
                        key={order.id}
                      >
                        {/* 用户 */}

                        <div className="orderUser">
                          <div className="userAvatar">
                            <User
                              size={19}
                            />
                          </div>

                          <div className="userInfo">
                            <strong>
                              {getEmail(
                                order
                              )}
                            </strong>

                            <span>
                              ID：
                              {String(
                                order.id
                              ).slice(
                                0,
                                14
                              )}
                              ...
                            </span>
                          </div>
                        </div>

                        {/* 金额 */}

                        <div className="orderAmount">
                          <span>
                            金额
                          </span>

                          <strong>
                            ¥
                            {formatAmount(
                              order.amount
                            )}
                          </strong>
                        </div>

                        {/* 支付 */}

                        <div className="paymentInfo">
                          <span>
                            支付方式
                          </span>

                          <strong>
                            {paymentName(
                              order.payment_method
                            )}
                          </strong>
                        </div>

                        {/* 时间 */}

                        <div className="dateInfo">
                          <span>
                            提交时间
                          </span>

                          <strong>
                            {formatDate(
                              order.created_at
                            )}
                          </strong>
                        </div>

                        {/* 状态 */}

                        <div>
                          <span
                            className={`statusBadge ${statusClass(
                              order.status
                            )}`}
                          >
                            {order.status ===
                              "pending" && (
                              <Clock3
                                size={13}
                              />
                            )}

                            {order.status ===
                              "approved" && (
                              <CheckCircle2
                                size={13}
                              />
                            )}

                            {order.status ===
                              "rejected" && (
                              <XCircle
                                size={13}
                              />
                            )}

                            {statusName(
                              order.status
                            )}
                          </span>
                        </div>

                        {/* 操作 */}

                        <div className="orderActions">
                          <button
                            className="detailButton"
                            onClick={() =>
                              setSelectedOrder(
                                order
                              )
                            }
                            title="查看详情"
                          >
                            <Eye
                              size={16}
                            />

                            查看
                          </button>

                          {order.status ===
                            "pending" && (
                            <>
                              <button
                                className="approveButton"
                                disabled={
                                  !!processingId
                                }
                                onClick={() =>
                                  updateOrder(
                                    order.id,
                                    "approved"
                                  )
                                }
                              >
                                {isProcessing ? (
                                  <RefreshCw
                                    size={15}
                                    className="spin"
                                  />
                                ) : (
                                  <Check
                                    size={15}
                                  />
                                )}

                                通过
                              </button>

                              <button
                                className="rejectButton"
                                disabled={
                                  !!processingId
                                }
                                onClick={() =>
                                  updateOrder(
                                    order.id,
                                    "rejected"
                                  )
                                }
                              >
                                <X
                                  size={15}
                                />

                                拒绝
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  }
                )}
              </div>
            )}
          </section>

          {/* 底部安全提示 */}

          <div className="adminFooter">
            <div>
              <ShieldCheck
                size={16}
              />

              <span>
                餐谋AI 管理员控制台
              </span>
            </div>

            <span>
              管理员操作均经过服务器权限验证
            </span>
          </div>
        </section>

        {/* ===================================================
            订单详情弹窗
        =================================================== */}

        {selectedOrder && (
          <div
            className="modalOverlay"
            onClick={() =>
              setSelectedOrder(null)
            }
          >
            <div
              className="orderModal"
              onClick={(e) =>
                e.stopPropagation()
              }
            >
              <div className="modalHeader">
                <div>
                  <span>
                    ORDER DETAIL
                  </span>

                  <h2>
                    订单详情
                  </h2>
                </div>

                <button
                  className="modalClose"
                  onClick={() =>
                    setSelectedOrder(
                      null
                    )
                  }
                >
                  <X size={20} />
                </button>
              </div>

              <div className="modalStatus">
                <span
                  className={`statusBadge ${statusClass(
                    selectedOrder.status
                  )}`}
                >
                  {selectedOrder.status ===
                    "pending" && (
                    <Clock3 size={14} />
                  )}

                  {selectedOrder.status ===
                    "approved" && (
                    <CheckCircle2
                      size={14}
                    />
                  )}

                  {selectedOrder.status ===
                    "rejected" && (
                    <XCircle size={14} />
                  )}

                  {statusName(
                    selectedOrder.status
                  )}
                </span>
              </div>

              <div className="detailGrid">
                <div className="detailItem">
                  <span>
                    <User size={15} />
                    用户邮箱
                  </span>

                  <strong>
                    {getEmail(
                      selectedOrder
                    )}
                  </strong>
                </div>

                <div className="detailItem">
                  <span>
                    <CreditCard
                      size={15}
                    />
                    订单金额
                  </span>

                  <strong className="amountLarge">
                    ¥
                    {formatAmount(
                      selectedOrder.amount
                    )}
                  </strong>
                </div>

                <div className="detailItem">
                  <span>
                    <CreditCard
                      size={15}
                    />
                    支付方式
                  </span>

                  <strong>
                    {paymentName(
                      selectedOrder.payment_method
                    )}
                  </strong>
                </div>

                <div className="detailItem">
                  <span>
                    <CalendarDays
                      size={15}
                    />
                    创建时间
                  </span>

                  <strong>
                    {formatDate(
                      selectedOrder.created_at
                    )}
                  </strong>
                </div>

                <div className="detailItem fullDetail">
                  <span>
                    用户 ID
                  </span>

                  <strong className="mono">
                    {selectedOrder.user_id ||
                      "-"}
                  </strong>
                </div>

                <div className="detailItem fullDetail">
                  <span>
                    订单 ID
                  </span>

                  <strong className="mono">
                    {selectedOrder.id}
                  </strong>
                </div>

                {selectedOrder.plan && (
                  <div className="detailItem">
                    <span>
                      套餐
                    </span>

                    <strong>
                      {selectedOrder.plan}
                    </strong>
                  </div>
                )}

                {selectedOrder.trade_no && (
                  <div className="detailItem">
                    <span>
                      交易单号
                    </span>

                    <strong className="mono">
                      {
                        selectedOrder.trade_no
                      }
                    </strong>
                  </div>
                )}

                {selectedOrder.note && (
                  <div className="detailItem fullDetail">
                    <span>
                      备注
                    </span>

                    <strong>
                      {selectedOrder.note}
                    </strong>
                  </div>
                )}
              </div>

              {selectedOrder.status ===
                "pending" && (
                <div className="modalActions">
                  <button
                    className="modalReject"
                    disabled={
                      !!processingId
                    }
                    onClick={() =>
                      updateOrder(
                        selectedOrder.id,
                        "rejected"
                      )
                    }
                  >
                    <X size={17} />

                    拒绝订单
                  </button>

                  <button
                    className="modalApprove"
                    disabled={
                      !!processingId
                    }
                    onClick={() =>
                      updateOrder(
                        selectedOrder.id,
                        "approved"
                      )
                    }
                  >
                    {processingId ===
                    selectedOrder.id ? (
                      <RefreshCw
                        size={17}
                        className="spin"
                      />
                    ) : (
                      <Check
                        size={17}
                      />
                    )}

                    通过并开通 PRO
                  </button>
                </div>
              )}

              <div className="modalSecurity">
                <ShieldCheck
                  size={15}
                />

                订单操作由服务器端管理员权限控制
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  );
}

/*
 * =========================================================
 * 管理员后台样式
 * =========================================================
 */

const adminStyles = `
* {
  box-sizing: border-box;
}

.adminPage {
  min-height: 100vh;
  background:
    radial-gradient(
      circle at 15% 0%,
      rgba(35, 125, 91, 0.12),
      transparent 32%
    ),
    radial-gradient(
      circle at 90% 10%,
      rgba(80, 180, 135, 0.08),
      transparent 30%
    ),
    #07120e;

  color: #e8f2ed;

  font-family:
    -apple-system,
    BlinkMacSystemFont,
    "SF Pro Display",
    "PingFang SC",
    "Microsoft YaHei",
    sans-serif;

  min-width: 0;
}

/* =========================================================
   Loading
   ========================================================= */

.adminLoading {
  min-height: 100vh;

  display: flex;
  flex-direction: column;

  align-items: center;
  justify-content: center;

  gap: 14px;

  color: #dcebe4;
}

.loadingLogo {
  width: 56px;
  height: 56px;

  border-radius: 17px;

  display: grid;
  place-items: center;

  background:
    linear-gradient(
      145deg,
      #75efb6,
      #36b77d
    );

  color: #062015;

  font-size: 25px;
  font-weight: 900;

  box-shadow:
    0 14px 40px
    rgba(72, 223, 156, 0.2);
}

.adminLoading h2 {
  margin: 5px 0 0;

  font-size: 19px;

  color: #f3faf7;
}

.adminLoading p {
  margin: 0;

  color: #829b90;

  font-size: 14px;
}

/* =========================================================
   Topbar
   ========================================================= */

.adminTopbar {
  height: 76px;

  display: flex;

  align-items: center;
  justify-content: space-between;

  padding:
    0 28px;

  border-bottom:
    1px solid
    rgba(150, 205, 181, 0.11);

  background:
    rgba(5, 17, 13, 0.88);

  backdrop-filter:
    blur(18px);

  position: sticky;

  top: 0;

  z-index: 20;
}

.adminBrand {
  display: flex;

  align-items: center;

  gap: 12px;
}

.adminLogo {
  width: 39px;
  height: 39px;

  border-radius: 12px;

  display: grid;
  place-items: center;

  background:
    linear-gradient(
      145deg,
      #7af2b9,
      #31ae76
    );

  color: #062116;

  font-size: 20px;
  font-weight: 900;
}

.brandText {
  display: flex;

  flex-direction: column;

  gap: 2px;
}

.brandText strong {
  color: #f3fbf7;

  font-size: 15px;
}

.brandText span {
  color: #688379;

  font-size: 9px;

  letter-spacing: 1.5px;

  font-weight: 700;
}

.adminTopActions {
  display: flex;

  align-items: center;

  gap: 8px;
}

.secureBadge {
  display: flex;

  align-items: center;

  gap: 6px;

  padding:
    8px 11px;

  border-radius: 10px;

  color: #80e9b8;

  background:
    rgba(65, 188, 128, 0.08);

  border:
    1px solid
    rgba(90, 213, 153, 0.15);

  font-size: 12px;

  font-weight: 700;
}

.topButton,
.logoutButton {
  border: 1px solid
    rgba(160, 205, 185, 0.12);

  background:
    rgba(255, 255, 255, 0.035);

  color: #bdd0c7;

  border-radius: 10px;

  min-height: 37px;

  padding:
    0 12px;

  display: flex;

  align-items: center;

  gap: 6px;

  cursor: pointer;

  font-size: 12px;

  font-weight: 600;
}

.topButton:hover {
  background:
    rgba(255, 255, 255, 0.07);

  color: #fff;
}

.logoutButton {
  color: #f1a6a6;

  border-color:
    rgba(255, 100, 100, 0.15);
}

.logoutButton:hover {
  background:
    rgba(255, 80, 80, 0.08);
}

/* =========================================================
   Content
   ========================================================= */

.adminContent {
  width: min(
    1400px,
    calc(100% - 48px)
  );

  margin: 0 auto;

  padding:
    40px 0 55px;
}

.pageHeading {
  display: flex;

  align-items: flex-end;

  justify-content: space-between;

  gap: 30px;

  margin-bottom: 26px;
}

.headingBadge {
  display: inline-flex;

  align-items: center;

  gap: 6px;

  padding:
    6px 9px;

  border-radius: 8px;

  background:
    rgba(72, 212, 145, 0.08);

  border:
    1px solid
    rgba(72, 212, 145, 0.13);

  color: #69dca6;

  font-size: 10px;

  letter-spacing: 1px;

  font-weight: 800;
}

.pageHeading h1 {
  margin:
    12px 0 7px;

  color: #f4fbf7;

  font-size:
    clamp(28px, 4vw, 42px);

  line-height: 1.1;

  letter-spacing: -1.2px;
}

.pageHeading p {
  margin: 0;

  color: #799187;

  font-size: 14px;
}

.headingRight {
  min-width: 205px;

  display: flex;

  align-items: center;

  gap: 11px;

  padding:
    13px 15px;

  border:
    1px solid
    rgba(125, 190, 160, 0.12);

  border-radius: 14px;

  background:
    rgba(255, 255, 255, 0.025);
}

.headingIcon {
  width: 40px;
  height: 40px;

  border-radius: 11px;

  display: grid;
  place-items: center;

  background:
    rgba(72, 210, 145, 0.09);

  color: #72dfaa;
}

.headingRight strong {
  display: block;

  color: #dcece5;

  font-size: 13px;
}

.headingRight span {
  display: block;

  margin-top: 3px;

  color: #627a70;

  font-size: 10px;
}

/* =========================================================
   Error
   ========================================================= */

.errorBox {
  display: flex;

  align-items: center;

  gap: 11px;

  padding:
    13px 15px;

  margin-bottom: 20px;

  border:
    1px solid
    rgba(255, 120, 120, 0.16);

  border-radius: 13px;

  background:
    rgba(255, 70, 70, 0.055);
}

.errorIcon {
  color: #ff9e9e;

  flex: 0 0 auto;
}

.errorText {
  min-width: 0;

  display: flex;

  flex-direction: column;

  gap: 3px;
}

.errorText strong {
  color: #ffd1d1;

  font-size: 12px;
}

.errorText span {
  color: #bd8d8d;

  font-size: 12px;

  word-break: break-word;
}

.errorClose {
  margin-left: auto;

  width: 30px;
  height: 30px;

  border: 0;

  background: transparent;

  color: #ae7777;

  cursor: pointer;
}

/* =========================================================
   Stats
   ========================================================= */

.statsGrid {
  display: grid;

  grid-template-columns:
    repeat(4, minmax(0, 1fr));

  gap: 13px;

  margin-bottom: 15px;
}

.statCard {
  min-width: 0;

  padding:
    18px 19px;

  border-radius: 16px;

  border:
    1px solid
    rgba(143, 199, 173, 0.11);

  background:
    linear-gradient(
      145deg,
      rgba(255, 255, 255, 0.045),
      rgba(255, 255, 255, 0.018)
    );

  box-shadow:
    0 10px 35px
    rgba(0, 0, 0, 0.08);
}

.statTop {
  display: flex;

  align-items: center;

  justify-content: space-between;

  margin-bottom: 13px;
}

.statTop > span {
  color: #7c958a;

  font-size: 12px;

  font-weight: 600;
}

.statIcon {
  width: 35px;
  height: 35px;

  border-radius: 10px;

  display: grid;
  place-items: center;

  color: #7bdfae;

  background:
    rgba(70, 204, 139, 0.08);
}

.statCard > strong {
  display: block;

  color: #f2faf6;

  font-size: 29px;

  line-height: 1;
}

.statCard small {
  display: block;

  margin-top: 8px;

  color: #536b61;

  font-size: 10px;
}

.pendingCard .statIcon {
  color: #f0c46d;

  background:
    rgba(240, 196, 109, 0.08);
}

.approvedCard .statIcon {
  color: #6fe0a8;

  background:
    rgba(80, 210, 145, 0.08);
}

.rejectedCard .statIcon {
  color: #ed8f8f;

  background:
    rgba(237, 100, 100, 0.08);
}

/* =========================================================
   Overview
   ========================================================= */

.overviewBar {
  min-height: 66px;

  display: flex;

  align-items: center;

  justify-content: space-between;

  gap: 15px;

  padding:
    11px 14px;

  margin-bottom: 15px;

  border:
    1px solid
    rgba(104, 207, 157, 0.12);

  border-radius: 15px;

  background:
    linear-gradient(
      90deg,
      rgba(67, 185, 126, 0.06),
      rgba(255, 255, 255, 0.018)
    );
}

.overviewLeft {
  display: flex;

  align-items: center;

  gap: 11px;
}

.overviewDot {
  width: 9px;
  height: 9px;

  border-radius: 50%;

  background: #66dda2;

  box-shadow:
    0 0 0 5px
    rgba(102, 221, 162, 0.08);
}

.overviewLeft strong {
  display: block;

  color: #dcece4;

  font-size: 12px;
}

.overviewLeft span {
  display: block;

  margin-top: 3px;

  color: #687f75;

  font-size: 10px;
}

.overviewLeft b {
  color: #7de4b0;
}

.quickPending {
  border: 0;

  padding:
    9px 13px;

  border-radius: 9px;

  background:
    rgba(92, 224, 158, 0.1);

  color: #79e3ad;

  cursor: pointer;

  font-size: 11px;

  font-weight: 700;
}

/* =========================================================
   Orders panel
   ========================================================= */

.ordersPanel {
  overflow: hidden;

  border:
    1px solid
    rgba(140, 200, 174, 0.11);

  border-radius: 19px;

  background:
    rgba(8, 22, 17, 0.82);

  box-shadow:
    0 24px 70px
    rgba(0, 0, 0, 0.16);
}

.panelHeader {
  display: flex;

  align-items: center;

  justify-content: space-between;

  gap: 20px;

  padding:
    22px 23px 18px;

  border-bottom:
    1px solid
    rgba(150, 200, 180, 0.07);
}

.panelLabel {
  color: #5fb58a;

  font-size: 9px;

  font-weight: 900;

  letter-spacing: 1.8px;
}

.panelHeader h2 {
  margin:
    6px 0 4px;

  color: #edf7f2;

  font-size: 20px;
}

.panelHeader p {
  margin: 0;

  color: #687f75;

  font-size: 11px;
}

.refreshMain {
  display: flex;

  align-items: center;

  gap: 7px;

  border:
    1px solid
    rgba(119, 206, 163, 0.14);

  background:
    rgba(86, 203, 143, 0.07);

  color: #7bdfad;

  border-radius: 10px;

  min-height: 37px;

  padding:
    0 12px;

  cursor: pointer;

  font-size: 11px;

  font-weight: 700;
}

.refreshMain:disabled {
  opacity: 0.6;

  cursor: wait;
}

/* =========================================================
   Toolbar
   ========================================================= */

.toolbar {
  display: flex;

  align-items: center;

  justify-content: space-between;

  gap: 15px;

  padding:
    14px 17px;

  background:
    rgba(255, 255, 255, 0.012);

  border-bottom:
    1px solid
    rgba(150, 200, 180, 0.06);
}

.filterGroup {
  display: flex;

  align-items: center;

  gap: 5px;

  overflow-x: auto;

  scrollbar-width: none;
}

.filterGroup::-webkit-scrollbar {
  display: none;
}

.filterGroup button {
  white-space: nowrap;

  display: flex;

  align-items: center;

  gap: 7px;

  border: 0;

  background: transparent;

  color: #6e867b;

  padding:
    8px 10px;

  border-radius: 8px;

  cursor: pointer;

  font-size: 11px;

  font-weight: 700;
}

.filterGroup button span {
  min-width: 19px;

  height: 19px;

  display: grid;

  place-items: center;

  border-radius: 6px;

  background:
    rgba(255, 255, 255, 0.04);

  color: #667e73;

  font-size: 9px;
}

.filterGroup button:hover {
  color: #b9cec4;
}

.filterGroup button.filterActive {
  background:
    rgba(85, 212, 148, 0.09);

  color: #79dfac;
}

.filterGroup button.filterActive span {
  background:
    rgba(85, 212, 148, 0.12);

  color: #7ce1af;
}

.searchBox {
  width: 285px;

  height: 37px;

  flex: 0 1 285px;

  display: flex;

  align-items: center;

  gap: 8px;

  padding:
    0 11px;

  border:
    1px solid
    rgba(145, 195, 174, 0.1);

  border-radius: 9px;

  background:
    rgba(0, 0, 0, 0.12);

  color: #536b61;
}

.searchBox input {
  min-width: 0;

  flex: 1;

  border: 0;

  outline: none;

  background: transparent;

  color: #dbe9e3;

  font-size: 11px;
}

.searchBox input::placeholder {
  color: #4e655c;
}

.searchBox button {
  border: 0;

  background: transparent;

  color: #617a6f;

  cursor: pointer;

  display: grid;

  place-items: center;
}

/* =========================================================
   Order list
   ========================================================= */

.orderList {
  width: 100%;
}

.orderRow {
  display: grid;

  grid-template-columns:
    minmax(200px, 1.7fr)
    100px
    105px
    145px
    90px
    auto;

  align-items: center;

  gap: 15px;

  padding:
    15px 18px;

  border-bottom:
    1px solid
    rgba(140, 190, 170, 0.055);

  transition:
    background 0.15s ease;
}

.orderRow:hover {
  background:
    rgba(255, 255, 255, 0.018);
}

.orderUser {
  min-width: 0;

  display: flex;

  align-items: center;

  gap: 10px;
}

.userAvatar {
  width: 36px;
  height: 36px;

  flex: 0 0 auto;

  border-radius: 10px;

  display: grid;
  place-items: center;

  color: #78dbaa;

  background:
    rgba(72, 206, 143, 0.08);

  border:
    1px solid
    rgba(90, 215, 155, 0.09);
}

.userInfo {
  min-width: 0;
}

.userInfo strong {
  display: block;

  overflow: hidden;

  text-overflow: ellipsis;

  white-space: nowrap;

  color: #dcebe4;

  font-size: 11px;
}

.userInfo span {
  display: block;

  margin-top: 4px;

  color: #50685e;

  font-size: 9px;
}

.orderAmount span,
.paymentInfo span,
.dateInfo span {
  display: block;

  margin-bottom: 5px;

  color: #4f675d;

  font-size: 9px;
}

.orderAmount strong,
.paymentInfo strong,
.dateInfo strong {
  display: block;

  color: #bdcec7;

  font-size: 10px;
}

.orderAmount strong {
  color: #e6f1eb;

  font-size: 13px;
}

.statusBadge {
  display: inline-flex;

  align-items: center;

  justify-content: center;

  gap: 5px;

  white-space: nowrap;

  min-height: 27px;

  padding:
    0 8px;

  border-radius: 7px;

  font-size: 9px;

  font-weight: 800;
}

.statusPending {
  color: #e8c577;

  background:
    rgba(232, 197, 119, 0.08);

  border:
    1px solid
    rgba(232, 197, 119, 0.1);
}

.statusApproved {
  color: #6cdda5;

  background:
    rgba(76, 211, 143, 0.08);

  border:
    1px solid
    rgba(76, 211, 143, 0.1);
}

.statusRejected {
  color: #ed9696;

  background:
    rgba(237, 100, 100, 0.08);

  border:
    1px solid
    rgba(237, 100, 100, 0.1);
}

.orderActions {
  display: flex;

  align-items: center;

  justify-content: flex-end;

  gap: 5px;

  flex-wrap: wrap;
}

.detailButton,
.approveButton,
.rejectButton {
  height: 29px;

  display: inline-flex;

  align-items: center;

  justify-content: center;

  gap: 5px;

  border-radius: 7px;

  padding:
    0 8px;

  cursor: pointer;

  font-size: 9px;

  font-weight: 800;
}

.detailButton {
  border:
    1px solid
    rgba(150, 200, 180, 0.09);

  background:
    rgba(255, 255, 255, 0.025);

  color: #8da69b;
}

.approveButton {
  border:
    1px solid
    rgba(85, 220, 151, 0.13);

  background:
    rgba(74, 211, 143, 0.08);

  color: #6ee0a7;
}

.rejectButton {
  border:
    1px solid
    rgba(240, 110, 110, 0.12);

  background:
    rgba(240, 90, 90, 0.06);

  color: #e99595;
}

.detailButton:hover {
  background:
    rgba(255, 255, 255, 0.055);
}

.approveButton:hover {
  background:
    rgba(74, 211, 143, 0.14);
}

.rejectButton:hover {
  background:
    rgba(240, 90, 90, 0.1);
}

.approveButton:disabled,
.rejectButton:disabled,
.detailButton:disabled {
  opacity: 0.5;

  cursor: not-allowed;
}

/* =========================================================
   Empty
   ========================================================= */

.emptyState {
  padding:
    75px 20px;

  text-align: center;
}

.emptyIcon {
  width: 58px;
  height: 58px;

  margin: 0 auto 15px;

  display: grid;
  place-items: center;

  border-radius: 16px;

  color: #60796e;

  background:
    rgba(255, 255, 255, 0.035);

  border:
    1px solid
    rgba(140, 190, 170, 0.08);
}

.emptyState h3 {
  margin:
    0 0 7px;

  color: #bacbc4;

  font-size: 14px;
}

.emptyState p {
  margin:
    0 auto 15px;

  max-width: 420px;

  color: #5b7167;

  font-size: 11px;

  line-height: 1.6;
}

.emptyState button {
  border: 0;

  background:
    rgba(77, 210, 144, 0.08);

  color: #73dca8;

  padding:
    8px 12px;

  border-radius: 8px;

  cursor: pointer;

  font-size: 10px;

  font-weight: 700;
}

/* =========================================================
   Footer
   ========================================================= */

.adminFooter {
  display: flex;

  align-items: center;

  justify-content: space-between;

  gap: 15px;

  padding:
    18px 3px 0;

  color: #4f665d;

  font-size: 9px;
}

.adminFooter > div {
  display: flex;

  align-items: center;

  gap: 6px;

  color: #60796e;
}

/* =========================================================
   Modal
   ========================================================= */

.modalOverlay {
  position: fixed;

  inset: 0;

  z-index: 100;

  display: flex;

  align-items: center;

  justify-content: center;

  padding: 20px;

  background:
    rgba(1, 8, 5, 0.78);

  backdrop-filter:
    blur(10px);
}

.orderModal {
  width: min(
    620px,
    100%
  );

  max-height:
    calc(100vh - 40px);

  overflow-y: auto;

  border:
    1px solid
    rgba(143, 203, 177, 0.15);

  border-radius: 21px;

  background:
    linear-gradient(
      145deg,
      #0c2018,
      #07150f
    );

  box-shadow:
    0 35px 100px
    rgba(0, 0, 0, 0.5);

  padding:
    22px;
}

.modalHeader {
  display: flex;

  align-items: flex-start;

  justify-content: space-between;

  gap: 20px;
}

.modalHeader span {
  color: #5eb889;

  font-size: 9px;

  letter-spacing: 1.7px;

  font-weight: 900;
}

.modalHeader h2 {
  margin:
    7px 0 0;

  color: #f1f8f4;

  font-size: 23px;
}

.modalClose {
  width: 34px;
  height: 34px;

  border: 0;

  border-radius: 9px;

  display: grid;
  place-items: center;

  background:
    rgba(255, 255, 255, 0.045);

  color: #81978e;

  cursor: pointer;
}

.modalStatus {
  margin:
    18px 0;
}

.detailGrid {
  display: grid;

  grid-template-columns:
    repeat(2, minmax(0, 1fr));

  gap: 10px;
}

.detailItem {
  min-width: 0;

  padding:
    13px;

  border:
    1px solid
    rgba(150, 200, 180, 0.07);

  border-radius: 11px;

  background:
    rgba(255, 255, 255, 0.022);
}

.detailItem.fullDetail {
  grid-column:
    1 / -1;
}

.detailItem > span {
  display: flex;

  align-items: center;

  gap: 5px;

  color: #627b70;

  font-size: 9px;

  margin-bottom: 7px;
}

.detailItem > strong {
  display: block;

  color: #d2e0da;

  font-size: 11px;

  overflow-wrap: anywhere;
}

.detailItem .amountLarge {
  color: #78e1ad;

  font-size: 17px;
}

.mono {
  font-family:
    ui-monospace,
    SFMono-Regular,
    Menlo,
    Monaco,
    Consolas,
    monospace;

  font-size: 9px !important;

  color: #849d92 !important;
}

.modalActions {
  display: grid;

  grid-template-columns:
    1fr 1.5fr;

  gap: 9px;

  margin-top: 17px;
}

.modalReject,
.modalApprove {
  height: 43px;

  border-radius: 10px;

  display: flex;

  align-items: center;

  justify-content: center;

  gap: 7px;

  cursor: pointer;

  font-size: 11px;

  font-weight: 800;
}

.modalReject {
  border:
    1px solid
    rgba(237, 110, 110, 0.14);

  background:
    rgba(237, 90, 90, 0.07);

  color: #e99898;
}

.modalApprove {
  border:
    1px solid
    rgba(80, 220, 148, 0.17);

  background:
    linear-gradient(
      135deg,
      rgba(83, 218, 148, 0.18),
      rgba(54, 177, 117, 0.11)
    );

  color: #7be2af;
}

.modalReject:disabled,
.modalApprove:disabled {
  opacity: 0.55;

  cursor: not-allowed;
}

.modalSecurity {
  display: flex;

  align-items: center;

  justify-content: center;

  gap: 5px;

  margin-top: 15px;

  color: #50685d;

  font-size: 9px;
}

/* =========================================================
   Spin
   ========================================================= */

.spin {
  animation:
    adminSpin 0.8s
    linear infinite;
}

@keyframes adminSpin {
  to {
    transform:
      rotate(360deg);
  }
}

/* =========================================================
   Tablet
   ========================================================= */

@media (
  max-width: 1100px
) {
  .statsGrid {
    grid-template-columns:
      repeat(2, minmax(0, 1fr));
  }

  .orderRow {
    grid-template-columns:
      minmax(190px, 1.5fr)
      90px
      100px
      110px
      80px
      auto;

    gap: 9px;

    padding:
      14px 12px;
  }

  .orderActions {
    justify-content: flex-start;
  }
}

/* =========================================================
   Mobile
   ========================================================= */

@media (
  max-width: 760px
) {
  .adminTopbar {
    height: auto;

    min-height: 66px;

    padding:
      11px 13px;

    gap: 10px;
  }

  .adminTopActions {
    gap: 5px;
  }

  .secureBadge,
  .topButton:first-of-type {
    display: none;
  }

  .topButton,
  .logoutButton {
    min-height: 34px;

    padding:
      0 8px;

    font-size: 10px;
  }

  .brandText span {
    display: none;
  }

  .adminContent {
    width:
      calc(100% - 22px);

    padding:
      25px 0 35px;
  }

  .pageHeading {
    display: block;
  }

  .headingRight {
    margin-top: 15px;

    min-width: 0;
  }

  .statsGrid {
    grid-template-columns:
      repeat(2, minmax(0, 1fr));

    gap: 8px;
  }

  .statCard {
    padding:
      14px;
  }

  .statCard > strong {
    font-size: 24px;
  }

  .overviewBar {
    align-items: flex-start;

    flex-direction: column;
  }

  .quickPending {
    width: 100%;
  }

  .panelHeader {
    align-items: flex-start;

    flex-direction: column;

    padding:
      18px 15px;
  }

  .refreshMain {
    width: 100%;
  }

  .toolbar {
    align-items: stretch;

    flex-direction: column;

    padding:
      11px;
  }

  .searchBox {
    width: 100%;

    flex-basis: 37px;
  }

  .orderRow {
    display: block;

    padding:
      15px 13px;
  }

  .orderUser {
    margin-bottom: 13px;
  }

  .orderAmount,
  .paymentInfo,
  .dateInfo {
    display: inline-block;

    width: 32%;

    vertical-align: top;

    margin-bottom: 12px;
  }

  .orderActions {
    margin-top: 4px;

    justify-content: flex-start;
  }

  .detailButton,
  .approveButton,
  .rejectButton {
    min-height: 32px;

    padding:
      0 10px;
  }

  .adminFooter {
    flex-direction: column;

    align-items: flex-start;
  }

  .detailGrid {
    grid-template-columns:
      1fr;
  }

  .detailItem.fullDetail {
    grid-column:
      auto;
  }

  .modalActions {
    grid-template-columns:
      1fr;
  }

  .orderModal {
    padding:
      17px;

    border-radius: 17px;
  }
}

/* =========================================================
   Very small
   ========================================================= */

@media (
  max-width: 420px
) {
  .adminLogo {
    width: 35px;
    height: 35px;
  }

  .brandText strong {
    font-size: 13px;
  }

  .logoutButton {
    padding:
      0 7px;
  }

  .pageHeading h1 {
    font-size: 29px;
  }

  .orderAmount,
  .paymentInfo,
  .dateInfo {
    width: 100%;

    display: block;
  }

  .statsGrid {
    grid-template-columns:
      1fr 1fr;
  }

  .statCard small {
    font-size: 8px;
  }
}
`;
