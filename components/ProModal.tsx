"use client";

import {
  X,
  Sparkles,
  Check,
  Crown,
} from "lucide-react";

type Props = {
  open?: boolean;
  onClose: () => void;
  onSuccess?: () => void | Promise<void>;
};

export default function ProModal({
  open,
  onClose,
}: Props) {
  if (!open) return null;

  return (
    <div
      className="authOverlay"
      onMouseDown={(e) => {
        if (
          e.target ===
          e.currentTarget
        ) {
          onClose();
        }
      }}
    >
      <div className="proModal">
        {/* 关闭 */}

        <button
          className="authClose"
          type="button"
          onClick={onClose}
          aria-label="关闭"
        >
          <X size={20} />
        </button>

        {/* Logo */}

        <div className="proLogo">
          <Crown size={25} />
        </div>

        <div className="proBadge">
          <Sparkles size={14} />
          餐谋AI PRO
        </div>

        <h2>
          解锁完整AI经营能力
        </h2>

        <p className="proSubtitle">
          免费版5次AI分析已经用完。
          升级PRO后，不再受免费次数限制。
        </p>

        {/* 功能 */}

        <div className="proFeatures">
          <div>
            <Check size={17} />
            无限AI经营分析
          </div>

          <div>
            <Check size={17} />
            AI餐饮CEO
          </div>

          <div>
            <Check size={17} />
            菜单利润优化
          </div>

          <div>
            <Check size={17} />
            差评智能处理
          </div>

          <div>
            <Check size={17} />
            营销方案生成
          </div>

          <div>
            <Check size={17} />
            库存成本分析
          </div>
        </div>

        {/* 价格 */}

        <div className="proPrice">
          <span>¥</span>
          <strong>29.9</strong>
          <small>/月</small>
        </div>

        {/* 支付按钮 */}

        <button
          className="proSubmit"
          type="button"
          onClick={() => {
            alert(
              "PRO购买功能即将上线"
            );
          }}
        >
          立即升级 PRO
          <Sparkles size={17} />
        </button>

        <button
          className="proCancel"
          type="button"
          onClick={onClose}
        >
          暂时不用
        </button>
      </div>
    </div>
  );
}
