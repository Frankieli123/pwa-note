# 使用 shadcn/ui 统一 UI 计划

## 目标
- 全局 UI 统一采用 shadcn/ui 封装组件
- 禁止业务层直接引入 @radix-ui/react-* 原语
- 移除重复/自定义 UI 与 shadcn 样式冲突，统一设计系统令牌

## 步骤
1. 仓库审计：定位直接使用 Radix 的文件、自定义重复 UI
2. 渐进替换：按模块将 Radix 使用改为 `@/components/ui/*`
3. 风格统一：仅使用 Tailwind 令牌（text-muted-foreground、bg-background、ring-ring 等）
4. 约束：ESLint 添加 no-restricted-imports，components/ui 目录下豁免
5. 验证：运行 lint/build/dev 进行回归

## 注意
- 不移除 Radix 依赖（shadcn 底层使用）
- 小批量变更，易回滚

