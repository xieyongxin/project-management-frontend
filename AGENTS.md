# 前端开发代理规则

本仓库不维护产品需求副本。当前工作区的唯一 PRD 位于：

`..\project-management-backend\doc\product\PRD-v1.md`

开始任何编码、页面改动或前端测试实现前，必须读取以下后端文档：

1. `..\project-management-backend\doc\product\PRD-v1.md`
2. `..\project-management-backend\doc\DEVELOPMENT.md`
3. `..\project-management-backend\doc\TASKS.md`
4. `..\project-management-backend\doc\DECISIONS.md`

同时阅读本仓库现有约定和根目录 `AGENTS.md`（如果存在）。如果后端文档路径不可用，不得复制一份 PRD，应停止相关产品实现并报告路径问题。

## 强制边界

- 一次只实现一个可独立验收的业务行为。
- 编码前先说明目标、验收条件和预计改动范围。
- 产品决定必须依据唯一 PRD；待确认项不得自行实现。
- 前端按钮隐藏不能代替后端权限校验；页面必须正确处理后端拒绝。
- 私有附件、版本历史、项目日志和 Agent 调用记录不得绕过项目访问边界。
- 不混入无关功能、重构或依赖升级。
- 验证业务风险，不把构建成功当作功能完成。
- 验证通过后创建本地提交，不推送、不部署。
- 前后端使用相同任务编号分别提交。
- 保留用户已有改动，只提交当前任务相关文件。
- 每轮更新后端 `doc/TASKS.md` 的任务状态、验证结果和前后端提交编号。
