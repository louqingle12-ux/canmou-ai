import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "餐谋AI｜AI餐饮经营增长平台",
  description:
    "用 DeepSeek AI 帮助餐饮老板分析菜单、利润、差评、营销和库存。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
