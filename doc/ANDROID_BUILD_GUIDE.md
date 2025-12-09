# InkRead Android APK 构建指南

## 📱 项目已配置完成

您的 InkRead 项目已经配置好 Android 平台支持！现在可以生成 APK 文件了。

## 🔧 前置要求

在构建 APK 之前，请确保已安装：

1. **Android Studio** - [下载地址](https://developer.android.com/studio)
   - 安装后需要配置 Android SDK
   - 推荐安装 Android SDK 33 或更高版本

2. **Java JDK** (JDK 17 推荐)
   - 可通过 Android Studio 安装，或单独下载

## 🚀 构建步骤

### 方法一：使用 Android Studio（推荐新手）

1. **打开 Android 项目**
   ```bash
   npm run android:open
   ```
   这会自动在 Android Studio 中打开项目

2. **等待 Gradle 同步完成**
   - 首次打开会下载依赖，可能需要几分钟

3. **构建 APK**
   - 点击菜单: `Build` → `Build Bundle(s) / APK(s)` → `Build APK(s)`
   - 或使用快捷键: `Ctrl + Alt + B`(Windows)

4. **查找 APK 文件**
   - 构建完成后，APK 在: `android/app/build/outputs/apk/debug/app-debug.apk`
   - 点击通知中的 "locate" 可直接打开文件夹

### 方法二：命令行构建（适合有经验的开发者）

#### Debug 版本（用于测试）
```bash
# 1. 构建 Web 应用并同步到 Android
npm run android:sync

# 2. 进入 android 目录构建 Debug APK
cd android
gradlew.bat assembleDebug

# APK 位置: android/app/build/outputs/apk/debug/app-debug.apk
```

#### Release 版本（用于发布）

⚠️ **Release 版本需要签名**，请先配置签名：

1. **生成签名密钥**
   ```bash
   keytool -genkey -v -keystore inkread-release.keystore -alias inkread -keyalg RSA -keysize 2048 -validity 10000
   ```
   - 会提示设置密码和填写信息
   - 密钥文件保存好，不要泄露

2. **配置签名**
   
   在 `android/app/build.gradle` 中添加（在 `android {}` 块内）：
   ```gradle
   signingConfigs {
       release {
           storeFile file("../../inkread-release.keystore")
           storePassword "你的密码"
           keyAlias "inkread"
           keyPassword "你的密码"
       }
   }
   
   buildTypes {
       release {
           signingConfig signingConfigs.release
           minifyEnabled false
           proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
       }
   }
   ```

3. **构建 Release APK**
   ```bash
   npm run android:sync
   cd android
   gradlew.bat assembleRelease
   
   # APK 位置: android/app/build/outputs/apk/release/app-release.apk
   ```

## 📦 快速命令参考

| 命令 | 说明 |
|------|------|
| `npm run build` | 构建 Web 应用 |
| `npm run android:sync` | 构建并同步到 Android |
| `npm run android:open` | 在 Android Studio 中打开 |
| `npx cap sync android` | 同步资源到 Android（不重新构建 Web）|

## 🎨 自定义应用图标和启动画面

### 修改应用图标

1. 准备一个 **1024x1024** 的 PNG 图片
2. 使用在线工具生成各种尺寸：
   - [Icon Kitchen](https://icon.kitchen/)
   - [Android Asset Studio](https://romannurik.github.io/AndroidAssetStudio/icons-launcher.html)
3. 将生成的文件放到 `android/app/src/main/res/` 对应的 `mipmap-*` 文件夹中

### 修改应用名称

编辑 `android/app/src/main/res/values/strings.xml`:
```xml
<resources>
    <string name="app_name">InkRead</string>
    <string name="title_activity_main">InkRead</string>
    ...
</resources>
```

## ⚙️ 配置说明

### capacitor.config.ts

当前配置：
```typescript
{
  appId: 'com.inkread.app',        // 应用包名，全局唯一
  appName: 'InkRead',               // 应用名称
  webDir: 'dist',                   // Web 构建输出目录
  android: {
    allowMixedContent: true,        // 允许 HTTP/HTTPS 混合内容
    webContentsDebuggingEnabled: true // 启用 WebView 调试
  }
}
```

## 🐛 常见问题

### Q: Gradle 下载依赖很慢怎么办？
A: 可以配置国内镜像。编辑 `android/build.gradle`:
```gradle
repositories {
    maven { url 'https://maven.aliyun.com/repository/google' }
    maven { url 'https://maven.aliyun.com/repository/public' }
    google()
    mavenCentral()
}
```

### Q: 构建失败提示找不到 SDK？
A: 
1. 打开 Android Studio
2. 进入 `Tools` → `SDK Manager`
3. 安装推荐的 SDK 版本（SDK 33+）

### Q: APK 安装后打不开或闪退？
A: 
1. 检查浏览器控制台是否有错误
2. 在 Android Studio 的 Logcat 中查看错误日志
3. 确保 `npm run build` 成功完成
4. 确保运行了 `npx cap sync android`

### Q: WebDAV 在 APK 中无法使用？
A: 
1. APK 中不需要代理，WebDAV 会直接连接
2. 确保在 `AndroidManifest.xml` 中添加了网络权限（默认已添加）
3. 对于 HTTPS 连接，确保证书有效

## 📱 安装和测试

1. **连接 Android 设备**
   - 开启开发者选项和 USB 调试
   - 或使用 Android Studio 的模拟器

2. **安装 APK**
   ```bash
   adb install android/app/build/outputs/apk/debug/app-debug.apk
   ```

3. **查看日志**
   ```bash
   adb logcat
   ```

## 🎉 完成！

现在您可以：
- ✅ 使用 `npm run android:sync` 同步最新代码到 Android
- ✅ 使用 `npm run android:open` 在 Android Studio 中打开项目
- ✅ 构建 Debug APK 用于测试
- ✅ 配置签名后构建 Release APK 用于发布

如有问题，请查看 [Capacitor 官方文档](https://capacitorjs.com/docs/android)
