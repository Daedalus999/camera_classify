# ClimbSnap

攀岩照片/视频分类管理 App。按日期和地点整理攀岩训练记录，标记完攀状态，支持视频倍速回放。所有数据存储在本地，无云端上传。

## 功能特性

- **日历视图** — 月历展示训练日期，彩色标记点标识有记录的日期
- **训练统计** — 主页显示总训练天数、活跃月份，按月回顾所有记录
- **媒体上传** — 从相册批量选择照片/视频，指定日期、地点、标题和完攀状态
- **同名分组** — 标题相同的媒体自动聚合为可展开/折叠的子集合
- **媒体编辑** — 上传后可随时修改标题、状态和关联地点
- **视频播放** — 内置播放器，支持 0.5x ~ 3x 倍速、进度拖拽、前进/后退 10 秒
- **地点管理** — 自定义攀岩馆名称，自动分配颜色，按地点筛选媒体
- **完全离线** — 所有数据存储在本地 SQLite，无网络请求
- **跨平台** — 支持 iOS、Android 和 Web

## 技术栈

| 技术 | 用途 |
|------|------|
| React Native + Expo SDK 54 | 跨平台框架 |
| TypeScript | 类型安全 |
| Expo Router | 文件系统路由 |
| expo-sqlite | 本地数据库 |
| expo-image | 高性能图片展示 |
| expo-av | 视频播放（倍速） |
| expo-image-picker | 相册媒体选择 |
| react-native-calendars | 日历组件 |

## 快速开始

### 环境要求

- Node.js >= 18
- npm 或 yarn
- Expo CLI（`npx expo`）
- iOS 开发需要 Xcode，Android 开发需要 Android Studio（或直接使用 EAS Build 云端构建）

### 安装依赖

```bash
npm install
```

### 启动开发服务器

```bash
# 启动 Expo 开发服务器
npx expo start

# 指定平台
npx expo start --android
npx expo start --ios
npx expo start --web
```

### 构建 APK

```bash
# 安装 EAS CLI（如未安装）
npm install -g eas-cli

# 登录 Expo 账号
eas login

# 构建 Android APK（preview profile）
eas build --profile preview --platform android

# 构建 Android App Bundle（production profile）
eas build --profile production --platform android
```

## 项目结构

```
camera_classify/
├── app/                      # 页面（Expo Router 文件系统路由）
│   ├── (tabs)/               # Tab 导航（主页、日历、地点、设置）
│   ├── day/[date].tsx        # 日期详情页
│   ├── month/[month].tsx     # 月度详情页
│   ├── media/[id].tsx        # 媒体查看/编辑页
│   ├── location/[id].tsx     # 地点详情页
│   └── upload.tsx            # 上传页
├── src/
│   ├── db/database.ts        # 数据库操作（SQLite + localStorage 双平台）
│   ├── components/           # 可复用组件（MediaGrid、VideoPlayer、LocationPicker）
│   ├── hooks/                # 数据 Hooks（useMediaItems、useLocations）
│   ├── types/                # TypeScript 类型定义
│   └── constants/theme.ts    # 主题常量
├── docs/
│   ├── PRD.md                # 产品需求文档
│   └── TDD.md                # 技术设计文档
└── assets/                   # 图标、启动图等静态资源
```

## 文档

- [产品需求文档 (PRD)](docs/PRD.md)
- [技术设计文档 (TDD)](docs/TDD.md)

## 隐私说明

ClimbSnap 不进行任何网络请求。所有照片和视频始终保存在手机本地相册中，应用仅在本地数据库中记录分类索引（文件路径引用），不复制、不移动、不上传任何媒体文件。
