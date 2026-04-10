# ClimbSnap — 技术设计文档 (TDD)

## 1. 技术选型

| 层级 | 技术 | 版本 | 说明 |
|------|------|------|------|
| 框架 | React Native + Expo | SDK 54 | 跨平台，Expo 生态成熟 |
| 语言 | TypeScript | 5.9 | 类型安全 |
| 导航 | Expo Router | 6.x | 基于文件系统的路由 |
| 本地数据库 | expo-sqlite | 16.x | Native 端轻量级 SQL 存储 |
| Web 存储 | localStorage | - | Web 端使用 JSON 序列化替代 SQLite |
| 媒体选择 | expo-image-picker | 17.x | 从相册选取照片/视频 |
| 图片展示 | expo-image | 3.x | 高性能图片组件，内置缓存 |
| 视频播放 | expo-av | 16.x | 支持倍速播放、进度控制 |
| 日历组件 | react-native-calendars | 1.1314+ | 成熟的日历组件库 |
| 图标 | @expo/vector-icons (Ionicons) | 15.x | 丰富的图标集 |
| UI 组件 | React Native 内置 + 自定义 | - | 保持轻量，无第三方 UI 库 |

## 2. 项目结构

```
camera_classify/
├── app/                          # Expo Router 页面（文件系统路由）
│   ├── _layout.tsx               # 根布局（Stack Navigator）
│   ├── (tabs)/                   # Tab 导航组
│   │   ├── _layout.tsx           # Tab 布局配置（4 个标签）
│   │   ├── home.tsx              # 主页（训练统计 + 月份列表）
│   │   ├── index.tsx             # 日历页（月历 + 标记点）
│   │   ├── locations.tsx         # 地点管理页（CRUD）
│   │   └── settings.tsx          # 设置页（清除数据、关于）
│   ├── day/[date].tsx            # 日期详情页（按地点分组的媒体网格）
│   ├── month/[month].tsx         # 月度详情页（按日期分组的媒体网格）
│   ├── media/[id].tsx            # 媒体全屏查看 + 编辑页
│   ├── location/[id].tsx         # 地点详情页（该地点所有媒体）
│   └── upload.tsx                # 上传页（Modal）
├── src/
│   ├── db/
│   │   └── database.ts           # 数据库操作封装（双平台适配）
│   ├── components/
│   │   ├── MediaGrid.tsx          # 媒体网格组件（含同名分组）
│   │   ├── VideoPlayer.tsx        # 视频播放器（含倍速控制）
│   │   └── LocationPicker.tsx     # 地点选择器（含新建功能）
│   ├── hooks/
│   │   ├── useMediaItems.ts       # 媒体数据 Hooks（按日期/月份/地点）
│   │   └── useLocations.ts        # 地点数据 Hook（CRUD）
│   ├── types/
│   │   └── index.ts               # TypeScript 类型定义
│   └── constants/
│       └── theme.ts               # 主题常量（颜色、间距、字号、圆角）
├── assets/                        # 静态资源（图标、启动图）
├── docs/
│   ├── PRD.md                     # 产品需求文档
│   └── TDD.md                     # 技术设计文档（本文件）
├── app.json                       # Expo 配置
├── eas.json                       # EAS Build 配置
├── package.json
├── tsconfig.json
└── metro.config.js
```

## 3. 数据模型

### 3.1 数据库表设计（Native SQLite）

```sql
CREATE TABLE IF NOT EXISTS locations (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL UNIQUE,
  color       TEXT NOT NULL DEFAULT '#6C63FF',
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS media_items (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  uri         TEXT NOT NULL,
  type        TEXT NOT NULL CHECK(type IN ('photo', 'video')),
  date        TEXT NOT NULL,              -- YYYY-MM-DD
  location_id INTEGER,
  title       TEXT,                       -- 可选标题，最多 10 字符
  status      TEXT NOT NULL DEFAULT 'none', -- 'none' | 'success' | 'attempt'
  duration    REAL,                       -- 视频时长（秒）
  width       INTEGER,
  height      INTEGER,
  thumbnail_uri TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_media_date ON media_items(date);
CREATE INDEX IF NOT EXISTS idx_media_location ON media_items(location_id);
```

### 3.2 Web 端存储结构（localStorage JSON）

```typescript
interface WebDB {
  locations: Location[];
  mediaItems: (MediaItem & { location_id: number | null })[];
  nextLocationId: number;
  nextMediaId: number;
}
// 存储 key: 'climbsnap_db'
```

### 3.3 TypeScript 类型

```typescript
interface Location {
  id: number;
  name: string;
  color: string;
  created_at: string;
  updated_at: string;
}

type MediaStatus = 'none' | 'success' | 'attempt';

interface MediaItem {
  id: number;
  uri: string;
  type: 'photo' | 'video';
  date: string;                    // YYYY-MM-DD
  location_id: number | null;
  location_name?: string;          // JOIN 查询时附带
  location_color?: string;         // JOIN 查询时附带
  title: string | null;
  status: MediaStatus;
  duration: number | null;
  width: number | null;
  height: number | null;
  thumbnail_uri: string | null;
  created_at: string;
}

interface DayMediaGroup {
  location: Location | null;
  items: MediaItem[];
}

interface MonthStat {
  month: string;                   // YYYY-MM
  days: number;                    // 该月有记录的天数
}

type PlaybackSpeed = 0.5 | 1.0 | 1.5 | 2.0 | 3.0;
```

## 4. 关键技术方案

### 4.1 双平台数据库适配

`database.ts` 通过 `Platform.OS === 'web'` 在运行时选择存储后端：

- **Native (iOS/Android)**：使用 `expo-sqlite`，WAL 模式，外键约束开启，支持事务
- **Web**：使用 `localStorage` + JSON 序列化，模拟同样的 CRUD 接口

所有导出函数签名一致，调用方无需关心平台差异。数据库初始化采用单例 + Promise 缓存模式，避免重复打开。

### 4.2 数据库迁移

对已存在的数据库，通过 `ALTER TABLE` 添加新列（`title`、`status`），用 try-catch 忽略"列已存在"的错误，实现向前兼容的增量迁移。

### 4.3 媒体文件引用（非复制）

应用仅在数据库中记录媒体文件的本地 URI。通过 `expo-image-picker` 获取文件 URI 后存入数据库，浏览时直接通过 URI 访问本地文件。

**风险**：如果用户在系统相册中删除了文件，应用中的引用将失效。展示时通过 `expo-image` 的内置容错处理。

### 4.4 视频倍速播放

使用 `expo-av` 的 `Video` 组件，通过 `rate` 属性和 `setRateAsync` 方法控制播放速率。播放控件支持：

- 播放/暂停
- 前进/后退 10 秒
- 进度条显示
- 倍速选择器（0.5x / 1x / 1.5x / 2x / 3x）
- 3 秒无操作自动隐藏控件

### 4.5 日历标记

查询数据库中所有有媒体记录的日期及其关联地点颜色，生成 `markedDates` 对象传递给 `react-native-calendars`：

```typescript
const rows = await db.getAllAsync<{ date: string; color: string | null }>(
  `SELECT DISTINCT m.date, l.color
   FROM media_items m LEFT JOIN locations l ON m.location_id = l.id`
);
```

### 4.6 同名媒体分组

`MediaGrid` 组件中，`groupByTitle` 函数将所有同名（`title` 相同且非空）的媒体项聚合：

- 2 个及以上同名项形成可展开/折叠的子集合
- 单独的有标题项和无标题项正常展示
- 分组是纯计算逻辑（`useMemo`），编辑标题后返回列表自动重新分组
- 使用手动行布局（每行 3 个 cell）替代 `FlatList numColumns`，以支持分组头和媒体行混排
- 提供 `scrollable` 属性，嵌套在 `SectionList` 内时使用 `View` 渲染避免虚拟化列表嵌套

### 4.7 数据清除安全处理

`clearAllData` 先关闭数据库连接、清空模块级缓存，再调用 `deleteDatabaseAsync`。用 try-catch 包裹删除操作，当数据库文件已不存在时忽略错误，避免重复清除报错。

### 4.8 性能优化

- 媒体网格使用 `FlatList` 虚拟化（顶层）或 `View` 直接渲染（嵌套场景）
- 缩略图使用 `expo-image` 的内置缓存和渐进加载（`transition={200}`）
- 数据库查询使用 `date` 和 `location_id` 索引
- 批量插入使用 `withExclusiveTransactionAsync` 事务
- 月度统计使用 `GROUP BY` + `COUNT(DISTINCT date)` 单次查询
- 页面聚焦时通过 `useFocusEffect` 刷新数据，避免不必要的轮询

## 5. 路由设计

| 路由 | 页面 | 展示方式 |
|------|------|---------|
| `/(tabs)/home` | 主页（训练统计） | Tab |
| `/(tabs)/index` | 日历页 | Tab |
| `/(tabs)/locations` | 地点管理 | Tab |
| `/(tabs)/settings` | 设置 | Tab |
| `/day/[date]` | 日期详情 | Stack Push |
| `/month/[month]` | 月度详情 | Stack Push |
| `/location/[id]` | 地点详情 | Stack Push |
| `/upload` | 上传页 | Modal |
| `/media/[id]` | 媒体查看/编辑 | Full Screen Modal |

## 6. 数据库操作 API

| 函数 | 说明 |
|------|------|
| `getAllLocations()` | 获取所有地点（按名称排序） |
| `createLocation(name)` | 创建地点（自动分配颜色） |
| `updateLocation(id, name)` | 更新地点名称 |
| `deleteLocation(id)` | 删除地点（关联媒体自动解除关联） |
| `getLocationMediaCount(id)` | 获取地点关联的媒体数量 |
| `addMediaItem(item)` | 添加单条媒体记录 |
| `addMediaItems(items)` | 批量添加媒体记录（事务） |
| `updateMediaItem(id, updates)` | 更新媒体的标题/状态/地点 |
| `deleteMediaItem(id)` | 删除媒体记录 |
| `getMediaByDate(date)` | 按日期查询媒体（含地点信息） |
| `getMediaByMonth(month)` | 按月份查询媒体 |
| `getMediaByLocation(locationId)` | 按地点查询媒体 |
| `getMediaById(id)` | 按 ID 查询单条媒体 |
| `getMarkedDates()` | 获取所有有记录的日期及颜色 |
| `getMonthlyStats()` | 获取月度统计（月份 + 天数） |
| `getMediaCountByDate(date)` | 获取指定日期的照片/视频数量 |
| `clearAllData()` | 清除所有数据（安全处理重复调用） |

## 7. 权限需求

| 权限 | 平台 | 用途 |
|------|------|------|
| `NSPhotoLibraryUsageDescription` | iOS | 读取相册照片和视频 |
| `READ_EXTERNAL_STORAGE` | Android | 读取外部存储 |
| `READ_MEDIA_IMAGES` | Android 13+ | 读取图片 |
| `READ_MEDIA_VIDEO` | Android 13+ | 读取视频 |
| `RECORD_AUDIO` | Android | 视频播放音频 |

## 8. 构建与发布

| 配置 | Profile | 平台 | 输出 |
|------|---------|------|------|
| 内部测试 | `preview` | Android | APK |
| 生产发布 | `production` | Android | App Bundle (AAB) |

```bash
# 构建 Android APK
eas build --profile preview --platform android

# 构建 Android App Bundle
eas build --profile production --platform android
```
