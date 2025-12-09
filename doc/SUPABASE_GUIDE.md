
# Supabase 同步配置指南

本指南将帮助你配置 Supabase 项目，以便 InkRead 使用它作为数据同步后端。

## 第一步：创建项目
1. 访问 [database.new](https://database.new) 或登录 [Supabase Dashboard](https://supabase.com/dashboard)。
2. 点击 **New Project**。
3. 填写项目名称（例如 `InkRead`）和数据库密码。
4. 选择离你最近的 Region（推荐 Singapore 或 Tokyo 以获得较快的访问速度）。
5. 点击 **Create new project** 并等待初始化完成（通常需要 1-2 分钟）。

## 第二步：获取 API 密钥
1. 项目创建完成后，进入 **Project Settings** (左下角齿轮图标)。
2. 选择 **API** 菜单。
3. 在 `Project URL` 和 `Project API keys` 部分，你会看到我们需要的信息：
   - **URL**: `https://xxxxxxxxxxxx.supabase.co`
   - **anon public** key: `eyJh......`
4. 将这两个值复制，稍后填入 InkRead 的设置页面。

## 第三步：创建 Storage Bucket
InkRead 使用 Supabase Storage 来存储你的笔记数据文件。

1. 在左侧菜单栏点击 **Storage** (文件夹图标)。
2. 点击 **New Bucket** 按钮。
3. 在 Name 处输入 (必须完全一致)：`inkread`
4. **重要设置**：
   - **Public Bucket**: 建议设置为 **OFF** (关闭)。保持你的数据私有。
   - 即使是关闭状态，只要你有 API Key 并且配置了下面的策略，App 依然可以访问。
5. 点击 **Save** 创建。

## 第四步：配置访问权限 (Storage Policies)
默认情况下，Storage 是完全封闭的。我们需要添加一条规则允许 App 读写文件。

1. 在 Storage 页面，点击 **Configuration** 标签页，或者点击 Bucket 列表旁边的 **Policies** 链接。
2. 在 `inkread` bucket 下，点击 **New Policy**。
3. 选择 **"For full customization"** (完全自定义)。
4. 填写 Policy Name: `Allow InkRead Sync`。
5. **Allowed Operations** (允许的操作):
   - 勾选 **SELECT** (下载数据)
   - 勾选 **INSERT** (上传新数据)
   - 勾选 **UPDATE** (更新数据)
6. **Target roles** (目标角色):
   - 勾选 **anon** (我们使用的是 anon key)
   - 勾选 **authenticated** (可选，以防万一)
7. 点击 **Review** -> **Save Policy**。

> **高级（更安全）的策略写法（可选）**：
> 如果你懂 SQL，也可以直接使用 SQL Editor 执行以下命令来允许所有读写：
> ```sql
> create policy "Allow All to Anon"
> on storage.objects for all
> to anon
> using ( bucket_id = 'inkread' )
> with check ( bucket_id = 'inkread' );
> ```

## 第五步：在 InkRead 中配置
1. 打开 InkRead App -> 设置。
2. 在 Data Sync 区域选择 **Supabase**。
3. 填入第二步获取的 **Project URL** 和 **Anon Key**。
4. 点击 **Test Connection**。
   - 如果显示 "Connection Successful"，则配置成功！

---

## 常见问题
- **Q: 为什么测试连接失败？**
  - A: 检查 Bucket 名字是否是 `inkread`。检查 Policy 是否正确应用给了 `anon` 角色。
- **Q: 数据是否安全？**
  - A: 使用 Supabase 存储数据也是加密传输的。只要你的 API Key 不泄露，数据就是安全的。请勿将 API Key 分享给他人。
