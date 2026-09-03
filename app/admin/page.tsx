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
} from "lucide-react";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Order = {
  id: string;
  user_id: string;
  amount: number | string;
  payment_method: string;
  status: string;
  created_at: string;

  // 兼容不同 orders 表字段
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

  const [filter, setFilter] = useState<
    "all" | "pending" | "approved" | "rejected"
  >("all");

  const [selectedOrder, setSelectedOrder] =
    useState<Order | null>(null);

  /**
   * =========================================================
   * 初始化
   * =========================================================
   */

  useEffect(() => {
    checkAdmin();
  }, []);

  /**
   * =========================================================
   * 检查当前用户是否管理员
   * =========================================================
   */

  async function checkAdmin() {
    setLoading(true);
    setError("");

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace("/");
        return;
      }

      const { data: profile, error: profileError } =
        await supabase
          .from("profiles")
          .select("is_admin")
          .eq("id", session.user.id)
          .maybeSingle();

      if (profileError) {
        console.error(profileError);
        throw new Error("无法读取管理员权限");
      }

      if (!profile?.is_admin) {
        router.replace("/");
        return;
      }

      await loadOrders();
    } catch (err: any) {
      console.error("Admin check error:", err);

      setError(
        err?.message ||
          "管理员验证失败，请重新登录。"
      );
    } finally {
      setLoading(false);
    }
  }

  /**
   * =========================================================
   * 获取订单
   * =========================================================
   */

  async function loadOrders() {
    setRefreshing(true);
    setError("");

    try {
      /**
       * 这里通过管理员 API 获取订单。
       *
       * 后面我们会创建：
       *
       * /api/admin/orders
       *
       * 这样不会把 Service Role Key 暴露给浏览器。
       */

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace("/");
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

      let data: any = null;

      try {
        data = await res.json();
      } catch {
        data = {};
      }

      if (res.status === 401) {
        await supabase.auth.signOut();
        router.replace("/");
        return;
      }

      if (res.status === 403) {
        router.replace("/");
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

  /**
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

  /**
   * =========================================================
   * 审核订单
   * =========================================================
   */

  async function updateOrder(
    orderId: string,
    status: "approved" | "rejected"
  ) {
    if (processingId) return;

    const order = orders.find(
      (item) => item.id === orderId
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
        router.replace("/");
        return;
      }

      const res = await fetch(
        `/api/admin/orders/${orderId}`,
        {
          method: "PATCH",

          headers: {
            "Content-Type":
              "application/json",

            Authorization:
              `Bearer ${session.access_token}`,
          },

          body: JSON.stringify({
            status,
          }),
        }
      );

      let data: any = null;

      try {
        data = await res.json();
      } catch {
        data = {};
      }

      if (res.status === 401) {
        await supabase.auth.signOut();
        router.replace("/");
        return;
      }

      if (res.status === 403) {
        throw new Error(
          "没有管理员权限"
        );
      }

      if (!res.ok) {
        throw new Error(
          data?.error ||
            `订单${actionText}失败`
        );
      }

      /**
       * 更新本地订单
       */

      setOrders((current) => {
        const updated =
          current.map((item) =>
            item.id === orderId
              ? {
                  ...item,
                  status,
                }
              : item
          );

        calculateStats(updated);

        return updated;
      });

      setSelectedOrder(null);

      alert(
        status === "approved"
          ? "订单审核通过，用户 PRO 将自动开通。"
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

  /**
   * =========================================================
   * 退出登录
   * =========================================================
   */

  async function logout() {
    await supabase.auth.signOut();
    router.replace("/");
  }

  /**
   * =========================================================
   * 筛选
   * =========================================================
   */

  const filteredOrders =
    filter === "all"
      ? orders
      : orders.filter(
          (order) =>
            order.status === filter
        );

  /**
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
      ).toLocaleString("zh-CN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return date;
    }
  }

  /**
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

  /**
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
        return status;
    }
  }

  /**
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

  /**
   * =========================================================
   * 加载状态
   * =========================================================
   */

  if (loading) {
    return (
      <main className="adminPage">
        <div className="adminLoading">
          <RefreshCw
            size={26}
            className="spin"
          />

          <p>
            正在验证管理员权限...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="adminPage">
      {/* =====================================================
          TOPBAR
      ===================================================== */}

      <header className="adminTopbar">
        <div className="adminBrand">
          <div className="adminLogo">
            谋
          </div>

          <div>
            <strong>
              餐谋AI
            </strong>

            <span>
              管理员后台
            </span>
          </div>
        </div>

        <div className="adminActions">
          <button
            className="adminRefresh"
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
            className="adminBack"
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
            className="adminLogout"
            onClick={logout}
          >
            <LogOut
              size={16}
            />

            退出
          </button>
        </div>
      </header>

      {/* =====================================================
          CONTENT
      ===================================================== */}

      <section className="adminContent">
        {/* 标题 */}

        <div className="adminHeading">
          <div>
            <div className="adminBadge">
              <ShieldCheck
                size={15}
              />

              ADMIN
            </div>

            <h1>
              订单管理
            </h1>

            <p>
              审核用户 PRO 购买申请。
            </p>
          </div>

          <div className="adminSecure">
            <ShieldCheck
              size={18}
            />

            管理员模式
          </div>
        </div>

        {/* 错误 */}

        {error && (
          <div className="adminError">
            <AlertCircle
              size={18}
            />

            <span>
              {error}
            </span>

            <button
              onClick={() =>
                setError("")
              }
            >
              <X size={15} />
            </button>
          </div>
        )}

        {/* ===================================================
            STATS
        =================================================== */}

        <section className="adminStats">
          <div className="adminStat">
            <div className="adminStatIcon">
              <CreditCard
                size={21}
              />
            </div>

            <div>
              <span>
                全部订单
              </span>

              <strong>
                {stats.total}
              </strong>
            </div>
          </div>

          <div className="adminStat pendingStat">
            <div className="adminStatIcon">
              <Clock3
                size={21}
              />
            </div>

            <div>
              <span>
                待审核
              </span>

              <strong>
                {stats.pending}
              </strong>
            </div>
          </div>

          <div className="adminStat approvedStat">
            <div className="adminStatIcon">
              <CheckCircle2
                size={21}
              />
            </div>

            <div>
              <span>
                已通过
              </span>

              <strong>
                {stats.approved}
              </strong>
            </div>
          </div>

          <div className="adminStat rejectedStat">
            <div className="adminStatIcon">
              <XCircle
                size={21}
              />
            </div>

            <div>
              <span>
                已拒绝
              </span>

              <strong>
                {stats.rejected}
              </strong>
            </div>
          </div>
        </section>

        {/* ===================================================
            ORDERS
        =================================================== */}

        <section className="adminPanel">
          <div className="adminPanelHeader">
            <div>
              <span>
                PRO ORDERS
              </span>

              <h2>
                购买订单
              </h2>
            </div>

            <div className="adminFilters">
              <button
                className={
                  filter === "all"
                    ? "active"
                    : ""
                }
                onClick={() =>
                  setFilter("all")
                }
              >
                全部
              </button>

              <button
                className={
                  filter === "pending"
                    ? "active"
                    : ""
                }
                onClick={() =>
                  setFilter(
                    "pending"
                  )
                }
              >
                待审核
              </button>

              <button
                className={
                  filter === "approved"
                    ? "active"
                    : ""
                }
                onClick={() =>
                  setFilter(
                    "approved"
                  )
                }
              >
                已通过
              </button>

              <button
                className={
                  filter === "rejected"
                    ? "active"
                    : ""
                }
                onClick={() =>
                  setFilter(
                    "rejected"
                  )
                }
              >
                已拒绝
              </button>
            </div>
          </div>

          {/* =================================================
              空订单
          ================================================= */}

          {filteredOrders.length ===
            0 && (
            <div className="adminEmpty">
              <CreditCard
                size={38}
              />

              <h3>
                暂无订单
              </h3>

              <p>
                当前筛选条件下没有订单。
              </p>
            </div>
          )}

          {/* =================================================
              MOBILE / DESKTOP ORDER LIST
          ================================================= */}

          {filteredOrders.length >
            0 && (
            <div className="orderTable">
              <div className="orderTableHead">
                <span>
                  用户
                </span>

                <span>
                  套餐
                </span>

                <span>
                  金额
                </span>

                <span>
                  支付方式
                </span>

                <span>
                  时间
                </span>

                <span>
                  状态
                </span>

                <span>
                  操作
                </span>
              </div>

              {filteredOrders.map(
                (order) => (
                  <div
                    className="orderRow"
                    key={
                      order.id
                    }
                  >
                    {/* 用户 */}

                    <div className="orderUser">
                      <div className="orderAvatar">
                        <User
                          size={16}
                        />
                      </div>

                      <div>
                        <strong>
                          {getEmail(
                            order
                          )}
                        </strong>

                        <small>
                          ID：
                          {order.user_id.slice(
                            0,
                            8
                          )}
                          ...
                        </small>
                      </div>
                    </div>

                    {/* 套餐 */}

                    <div>
                      <span className="planTag">
                        {order.plan ||
                          "PRO"}
                      </span>
                    </div>

                    {/* 金额 */}

                    <div className="orderAmount">
                      ¥
                      {Number(
                        order.amount ||
                          0
                      ).toFixed(2)}
                    </div>

                    {/* 支付 */}

                    <div>
                      <span className="paymentTag">
                        {
                          paymentName(
                            order.payment_method
                          )
                        }
                      </span>
                    </div>

                    {/* 时间 */}

                    <div className="orderTime">
                      <CalendarDays
                        size={14}
                      />

                      {formatDate(
                        order.created_at
                      )}
                    </div>

                    {/* 状态 */}

                    <div>
                      <span
                        className={`statusTag ${order.status}`}
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
                        className="viewOrder"
                        onClick={() =>
                          setSelectedOrder(
                            order
                          )
                        }
                      >
                        查看
                      </button>

                      {order.status ===
                        "pending" && (
                        <>
                          <button
                            className="approveButton"
                            disabled={
                              processingId ===
                              order.id
                            }
                            onClick={() =>
                              updateOrder(
                                order.id,
                                "approved"
                              )
                            }
                          >
                            <Check
                              size={14}
                            />

                            通过
                          </button>

                          <button
                            className="rejectButton"
                            disabled={
                              processingId ===
                              order.id
                            }
                            onClick={() =>
                              updateOrder(
                                order.id,
                                "rejected"
                              )
                            }
                          >
                            <X
                              size={14}
                            />

                            拒绝
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </section>
      </section>

      {/* =====================================================
          ORDER DETAIL MODAL
      ===================================================== */}

      {selectedOrder && (
        <div
          className="adminModalOverlay"
          onMouseDown={(e) => {
            if (
              e.currentTarget ===
              e.target
            ) {
              setSelectedOrder(
                null
              );
            }
          }}
        >
          <div className="adminOrderModal">
            <button
              className="adminModalClose"
              onClick={() =>
                setSelectedOrder(
                  null
                )
              }
            >
              <X size={19} />
            </button>

            <div className="modalIcon">
              <CreditCard
                size={23}
              />
            </div>

            <h2>
              订单详情
            </h2>

            <p className="modalSubtitle">
              PRO购买申请
            </p>

            <div className="detailList">
              <Detail
                label="订单ID"
                value={
                  selectedOrder.id
                }
              />

              <Detail
                label="用户ID"
                value={
                  selectedOrder.user_id
                }
              />

              <Detail
                label="用户邮箱"
                value={getEmail(
                  selectedOrder
                )}
              />

              <Detail
                label="套餐"
                value={
                  selectedOrder.plan ||
                  "PRO"
                }
              />

              <Detail
                label="支付金额"
                value={`¥${Number(
                  selectedOrder.amount ||
                    0
                ).toFixed(2)}`}
              />

              <Detail
                label="支付方式"
                value={paymentName(
                  selectedOrder.payment_method
                )}
              />

              <Detail
                label="提交时间"
                value={formatDate(
                  selectedOrder.created_at
                )}
              />

              <Detail
                label="订单状态"
                value={statusName(
                  selectedOrder.status
                )}
              />

              {selectedOrder.trade_no && (
                <Detail
                  label="交易单号"
                  value={
                    selectedOrder.trade_no
                  }
                />
              )}

              {selectedOrder.note && (
                <Detail
                  label="备注"
                  value={
                    selectedOrder.note
                  }
                />
              )}
            </div>

            {selectedOrder.status ===
              "pending" && (
              <div className="modalActions">
                <button
                  className="modalReject"
                  disabled={
                    processingId ===
                    selectedOrder.id
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
                    processingId ===
                    selectedOrder.id
                  }
                  onClick={() =>
                    updateOrder(
                      selectedOrder.id,
                      "approved"
                    )
                  }
                >
                  <Check size={17} />

                  通过并开通 PRO
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =====================================================
          PAGE CSS
      ===================================================== */}

      <style jsx global>{`
        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
        }

        .adminPage {
          min-height: 100vh;
          background: #f5f7f6;
          color: #18352c;
          font-family:
            Inter,
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            "PingFang SC",
            "Microsoft YaHei",
            sans-serif;
        }

        .adminTopbar {
          height: 72px;
          background: #ffffff;
          border-bottom: 1px solid #e7ece9;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 42px;
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
          width: 38px;
          height: 38px;
          border-radius: 11px;
          background: #183c31;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          font-weight: 800;
        }

        .adminBrand strong {
          display: block;
          font-size: 16px;
        }

        .adminBrand span {
          display: block;
          color: #8a9892;
          font-size: 11px;
          margin-top: 2px;
        }

        .adminActions {
          display: flex;
          align-items: center;
          gap: 9px;
        }

        .adminActions button {
          height: 38px;
          border-radius: 9px;
          padding: 0 13px;
          border: 1px solid #e0e7e3;
          background: white;
          display: flex;
          align-items: center;
          gap: 7px;
          cursor: pointer;
          font-size: 13px;
        }

        .adminActions button:hover {
          background: #f5f8f6;
        }

        .adminLogout {
          color: #bd4747;
        }

        .adminContent {
          max-width: 1450px;
          margin: 0 auto;
          padding: 42px;
        }

        .adminHeading {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          margin-bottom: 30px;
        }

        .adminBadge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 1px;
          color: #58776b;
          margin-bottom: 7px;
        }

        .adminHeading h1 {
          margin: 0;
          font-size: 32px;
          letter-spacing: -1px;
        }

        .adminHeading p {
          margin: 7px 0 0;
          color: #83918b;
          font-size: 14px;
        }

        .adminSecure {
          display: flex;
          align-items: center;
          gap: 7px;
          padding: 10px 14px;
          border-radius: 10px;
          background: #e9f4ef;
          color: #2b6953;
          font-size: 13px;
          font-weight: 600;
        }

        .adminStats {
          display: grid;
          grid-template-columns:
            repeat(4, 1fr);
          gap: 15px;
          margin-bottom: 22px;
        }

        .adminStat {
          background: white;
          border: 1px solid #e6ece9;
          border-radius: 15px;
          padding: 20px;
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .adminStatIcon {
          width: 43px;
          height: 43px;
          border-radius: 12px;
          background: #eef3f0;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .adminStat span {
          display: block;
          color: #89958f;
          font-size: 12px;
          margin-bottom: 5px;
        }

        .adminStat strong {
          font-size: 25px;
        }

        .pendingStat
          .adminStatIcon {
          background: #fff5df;
        }

        .approvedStat
          .adminStatIcon {
          background: #e8f6ed;
        }

        .rejectedStat
          .adminStatIcon {
          background: #fcecec;
        }

        .adminPanel {
          background: white;
          border: 1px solid #e6ece9;
          border-radius: 17px;
          overflow: hidden;
        }

        .adminPanelHeader {
          padding: 24px 25px;
          border-bottom: 1px solid #edf1ef;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .adminPanelHeader > div:first-child span {
          color: #9aa59f;
          font-size: 10px;
          letter-spacing: 1.5px;
          font-weight: 700;
        }

        .adminPanelHeader h2 {
          margin: 5px 0 0;
          font-size: 19px;
        }

        .adminFilters {
          display: flex;
          gap: 6px;
        }

        .adminFilters button {
          border: 0;
          background: #f4f6f5;
          color: #68766f;
          padding: 8px 13px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 12px;
        }

        .adminFilters button.active {
          background: #183c31;
          color: white;
        }

        .orderTableHead,
        .orderRow {
          display: grid;
          grid-template-columns:
            2fr
            0.8fr
            0.8fr
            1fr
            1.5fr
            0.9fr
            2fr;
          align-items: center;
          gap: 15px;
        }

        .orderTableHead {
          min-height: 46px;
          padding: 0 25px;
          background: #fafbfa;
          border-bottom: 1px solid #edf1ef;
          color: #98a39e;
          font-size: 11px;
        }

        .orderRow {
          min-height: 85px;
          padding: 13px 25px;
          border-bottom: 1px solid #edf1ef;
          font-size: 12px;
        }

        .orderRow:last-child {
          border-bottom: 0;
        }

        .orderUser {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
        }

        .orderAvatar {
          width: 35px;
          height: 35px;
          flex: 0 0 35px;
          border-radius: 10px;
          background: #edf3f0;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .orderUser strong {
          display: block;
          max-width: 220px;
          overflow: hidden;
          white-space: nowrap;
          text-overflow: ellipsis;
          font-size: 12px;
        }

        .orderUser small {
          display: block;
          color: #a0aaa5;
          margin-top: 4px;
          font-size: 10px;
        }

        .planTag {
          display: inline-flex;
          padding: 5px 9px;
          border-radius: 6px;
          background: #eef7f2;
          color: #287052;
          font-weight: 700;
        }

        .orderAmount {
          font-size: 15px;
          font-weight: 800;
        }

        .paymentTag {
          color: #53665e;
        }

        .orderTime {
          color: #77847e;
          display: flex;
          align-items: center;
          gap: 5px;
        }

        .statusTag {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 6px 9px;
          border-radius: 7px;
          font-weight: 600;
        }

        .statusTag.pending {
          background: #fff4df;
          color: #a56a13;
        }

        .statusTag.approved {
          background: #e8f6ed;
          color: #26704d;
        }

        .statusTag.rejected {
          background: #fceaea;
          color: #ad4b4b;
        }

        .orderActions {
          display: flex;
          align-items: center;
          gap: 5px;
          flex-wrap: wrap;
        }

        .orderActions button {
          border: 0;
          border-radius: 7px;
          padding: 7px 9px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 11px;
        }

        .viewOrder {
          background: #f1f4f2;
          color: #50625a;
        }

        .approveButton {
          background: #e6f5ec;
          color: #26704d;
        }

        .rejectButton {
          background: #fceaea;
          color: #b24b4b;
        }

        .orderActions button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .adminEmpty {
          padding: 80px 20px;
          text-align: center;
          color: #96a19c;
        }

        .adminEmpty h3 {
          margin: 14px 0 5px;
          color: #52625b;
        }

        .adminEmpty p {
          margin: 0;
          font-size: 13px;
        }

        .adminError {
          margin-bottom: 18px;
          padding: 12px 15px;
          border-radius: 10px;
          background: #fff0f0;
          color: #a54343;
          display: flex;
          align-items: center;
          gap: 9px;
          font-size: 13px;
        }

        .adminError span {
          flex: 1;
        }

        .adminError button {
          border: 0;
          background: transparent;
          color: inherit;
          cursor: pointer;
        }

        .adminLoading {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: #6d7d75;
        }

        .adminLoading p {
          font-size: 14px;
          margin-top: 12px;
        }

        .spin {
          animation: adminSpin 1s linear infinite;
        }

        @keyframes adminSpin {
          from {
            transform: rotate(0deg);
          }

          to {
            transform: rotate(360deg);
          }
        }

        .adminModalOverlay {
          position: fixed;
          inset: 0;
          z-index: 100;
          background: rgba(
            13,
            28,
            23,
            0.45
          );
          backdrop-filter: blur(5px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }

        .adminOrderModal {
          width: min(
            520px,
            100%
          );
          max-height: 90vh;
          overflow-y: auto;
          background: white;
          border-radius: 19px;
          padding: 28px;
          position: relative;
          box-shadow:
            0 30px 80px
              rgba(
                0,
                0,
                0,
                0.18
              );
        }

        .adminModalClose {
          position: absolute;
          right: 18px;
          top: 18px;
          border: 0;
          background: #f2f4f3;
          width: 34px;
          height: 34px;
          border-radius: 50%;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .modalIcon {
          width: 45px;
          height: 45px;
          border-radius: 13px;
          background: #e9f4ef;
          color: #2d7157;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 14px;
        }

        .adminOrderModal h2 {
          margin: 0;
          font-size: 21px;
        }

        .modalSubtitle {
          color: #96a19c;
          font-size: 12px;
          margin: 5px 0 22px;
        }

        .detailList {
          border: 1px solid #e8ecea;
          border-radius: 11px;
          overflow: hidden;
        }

        .detailItem {
          min-height: 43px;
          padding: 9px 13px;
          border-bottom: 1px solid #edf1ef;
          display: flex;
          gap: 15px;
          align-items: center;
        }

        .detailItem:last-child {
          border-bottom: 0;
        }

        .detailLabel {
          width: 75px;
          flex: 0 0 75px;
          color: #9aa49f;
          font-size: 11px;
        }

        .detailValue {
          color: #354840;
          font-size: 12px;
          word-break: break-all;
        }

        .modalActions {
          margin-top: 20px;
          display: grid;
          grid-template-columns: 1fr 1.5fr;
          gap: 9px;
        }

        .modalActions button {
          height: 45px;
          border: 0;
          border-radius: 9px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          font-weight: 700;
          cursor: pointer;
        }

        .modalReject {
          background: #fceaea;
          color: #ae4b4b;
        }

        .modalApprove {
          background: #183c31;
          color: white;
        }

        .modalActions button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        @media (max-width: 1100px) {
          .adminContent {
            padding: 25px;
          }

          .adminStats {
            grid-template-columns:
              repeat(2, 1fr);
          }

          .orderTable {
            overflow-x: auto;
          }

          .orderTableHead,
          .orderRow {
            min-width: 1050px;
          }
        }

        @media (max-width: 700px) {
          .adminTopbar {
            padding: 0 15px;
            height: 64px;
          }

          .adminBrand span {
            display: none;
          }

          .adminActions button {
            padding: 0 9px;
          }

          .adminActions button
            span {
            display: none;
          }

          .adminContent {
            padding: 20px 14px;
          }

          .adminHeading {
            align-items: flex-start;
            flex-direction: column;
            gap: 15px;
          }

          .adminHeading h1 {
            font-size: 27px;
          }

          .adminStats {
            grid-template-columns:
              repeat(2, 1fr);
            gap: 9px;
          }

          .adminStat {
            padding: 15px;
          }

          .adminStat strong {
            font-size: 21px;
          }

          .adminPanelHeader {
            align-items: flex-start;
            flex-direction: column;
            gap: 15px;
          }

          .adminFilters {
            width: 100%;
            overflow-x: auto;
          }

          .adminFilters button {
            white-space: nowrap;
          }

          .orderTable {
            overflow-x: auto;
          }

          .orderTableHead,
          .orderRow {
            min-width: 1050px;
          }
        }
      `}</style>
    </main>
  );
}

/**
 * =========================================================
 * Detail
 * =========================================================
 */

function Detail({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="detailItem">
      <span className="detailLabel">
        {label}
      </span>

      <span className="detailValue">
        {value}
      </span>
    </div>
  );
}
