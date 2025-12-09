# InkRead 应用图标和资源配置

## ✅ 已完成的配置

### 📱 应用名称
- **显示名称**: InkRead
- **包名**: com.inkread.app
- **配置位置**: `android/app/src/main/res/values/strings.xml`

### 🎨 应用图标
已使用 Web 端的 `public/icon.png` 自动生成所有 Android 所需的图标尺寸：

| 尺寸类型 | 图标尺寸 | 文件位置 |
|---------|---------|---------|
| MDPI | 48×48 | `android/app/src/main/res/mipmap-mdpi/` |
| HDPI | 72×72 | `android/app/src/main/res/mipmap-hdpi/` |
| XHDPI | 96×96 | `android/app/src/main/res/mipmap-xhdpi/` |
| XXHDPI | 144×144 | `android/app/src/main/res/mipmap-xxhdpi/` |
| XXXHDPI | 192×192 | `android/app/src/main/res/mipmap-xxxhdpi/` |

每个尺寸包含：
- `ic_launcher.png` - 标准图标
- `ic_launcher_round.png` - 圆形图标（适配圆形图标设备）
- `ic_launcher_foreground.png` - 前景层（自适应图标）
- `ic_launcher_background.png` - 背景层（自适应图标）

## 🔄 如何更新应用图标

### 方法一：自动生成（推荐）

1. **替换源图标文件**
   ```bash
   # 用新图标替换 resources/icon.png
   # 建议尺寸: 1024×1024 像素，PNG 格式
   ```

2. **运行自动生成命令**
   ```bash
   npm run assets:generate
   ```

3. **同步到 Android 项目**
   ```bash
   npm run android:sync
   ```

### 方法二：手动替换

如果您有设计师提供的完整图标资源包：

1. 将各尺寸的图标文件放入对应的 `mipmap-*` 文件夹
2. 确保文件名为：
   - `ic_launcher.png`
   - `ic_launcher_round.png`
   - `ic_launcher_foreground.png`
   - `ic_launcher_background.png`

## 📝 修改应用名称

编辑 `android/app/src/main/res/values/strings.xml`：

```xml
<?xml version='1.0' encoding='utf-8'?>
<resources>
    <string name="app_name">InkRead</string>  <!-- 修改这里 -->
    <string name="title_activity_main">InkRead</string>  <!-- 修改这里 -->
    <string name="package_name">com.inkread.app</string>
    <string name="custom_url_scheme">com.inkread.app</string>
</resources>
```

## 🎨 图标设计建议

### 推荐规格
- **源文件尺寸**: 1024×1024 像素
- **格式**: PNG（透明背景）
- **色彩**: RGB 色彩空间
- **安全区域**: 边缘保留 10% 的安全边距

### 设计要点
1. **简洁明了**: 图标应该在小尺寸下也能清晰辨认
2. **品牌一致**: 与 Web 端图标保持视觉一致性
3. **适配性**: 考虑圆形和方形两种显示方式
4. **对比度**: 确保在深色和浅色背景下都清晰可见

## 🔧 图标资源文件夹说明

```
resources/
└── icon.png          # 源图标文件（1024×1024）

android/app/src/main/res/
├── mipmap-mdpi/      # 低密度屏幕 (48×48)
├── mipmap-hdpi/      # 高密度屏幕 (72×72)
├── mipmap-xhdpi/     # 超高密度屏幕 (96×96)
├── mipmap-xxhdpi/    # 超超高密度屏幕 (144×144)
└── mipmap-xxxhdpi/   # 超超超高密度屏幕 (192×192)
```

## 🚀 启动画面（Splash Screen）

启动画面也已自动生成，位于：
```
android/app/src/main/res/drawable-port-*/splash.png
android/app/src/main/res/drawable-land-*/splash.png
```

如需自定义启动画面：
1. 创建 `resources/splash.png`（建议 2732×2732）
2. 运行 `npm run assets:generate`

## 📱 测试图标效果

### 在模拟器/真机上测试
```bash
# 1. 构建并安装 APK
npm run android:sync
npm run android:open

# 2. 在 Android Studio 中运行应用

# 3. 检查图标在以下位置的显示效果：
#    - 应用抽屉
#    - 主屏幕
#    - 最近任务列表
#    - 设置 → 应用管理
```

### 不同设备形状测试
确保图标在以下设备上显示良好：
- ✓ 方形图标设备（大多数 Android 设备）
- ✓ 圆形图标设备（如部分三星设备）
- ✓ 圆角矩形设备（如 Pixel 系列）
- ✓ 水滴形设备（部分厂商）

## 🛠️ 故障排除

### 图标未更新
如果更新图标后应用中仍显示旧图标：

1. **清理构建缓存**
   ```bash
   cd android
   .\gradlew clean
   cd ..
   ```

2. **重新同步**
   ```bash
   npm run android:sync
   ```

3. **卸载应用重新安装**
   - 在设备上完全卸载应用
   - 重新构建并安装

### 图标质量问题
如果生成的图标模糊或有锯齿：

1. 确保源图标 `resources/icon.png` 尺寸足够大（建议 1024×1024）
2. 使用无损 PNG 格式
3. 避免源图标本身就是缩放后的低质量图片

## 📚 相关资源

- [Android 应用图标设计指南](https://developer.android.com/guide/practices/ui_guidelines/icon_design_launcher)
- [Capacitor Assets CLI 文档](https://github.com/ionic-team/capacitor-assets)
- [自适应图标设计](https://developer.android.com/develop/ui/views/launch/icon_design_adaptive)

## 💡 提示

- 每次修改图标后记得运行 `npm run assets:generate`
- 建议保留源图标的 PSD/AI 等设计文件
- 定期备份 `resources/` 文件夹
- 可以为不同的构建变体（debug/release）使用不同的图标
