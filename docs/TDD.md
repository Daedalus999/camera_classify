# ClimbSnap — 技术设计文档 (TDD)

## 1. 技术选型

| 层级 | 技术 | 说明 |
|------|------|------|
| 框架 | React Native + Expo (SDK 52) | 跨平台，开发效率高，Expo 生态成熟 |
| 语言 | TypeScript | 类型安全 |
| 导航 | Expo Router (文件系统路由) | 基于文件的路由，简洁直观 |
| 本地数据库 | expo-sqlite | 轻量级本地 SQL 存储，存储分类索引 |
| 媒体选择 | expo-image-picker | 从相册选取照片/视频 |
| 图片展示 | expo-image | 高性能图片组件 |
| 视频播放 | expo-av | 支持倍速播放、进度控制 |
| 日历组件 | react-native-calendars | 成熟的日历组件库 |
| UI 组件 | React Native 内置 + 自定义 | 保持轻量 |

## 2. 项目结构

```
camera_classify/
├── app/                        # Expo Router 页面
│   ├── (tabs)/                 # Tab 导航布局
│   │   ├── _layout.tsx         # Tab 布局配置
│   │   ├── index.tsx           # 日历页（首页）
│   │   ├── locations.tsx       # 地点管理页
│   │   └── settings.tsx        # 设置页
│   ├── _layout.tsx             # 根布局
│   ├── day/[date].tsx          # 日期详情页
│   ├── media/[id].tsx          # 媒体全屏查看页
│   └── upload.tsx              # 上传页
├── src/
│   ├── db/
│   │   ├── schema.ts           # 数据库 Schema 定义
│   │   └── database.ts         # 数据库操作封装
│   ├── components/
│   │   ├── Calendar.tsx         # 日历组件
│   │   ├── MediaGrid.tsx        # 媒体网格组件
│   │   ├── MediaViewer.tsx      # 全屏媒体查看器
│   │   ├── VideoPlayer.tsx      # 视频播放器（含倍速）
│   │   ├── LocationPicker.tsx   # 地点选择器
│   │   └── SpeedControl.tsx     # 倍速控制组件
│   ├── hooks/
│   │   ├── useDatabase.ts       # 数据库 Hook
│   │   ├── useMediaItems.ts     # 媒体数据 Hook
│   │   └── useLocations.ts      # 地点数据 Hook
│   ├── types/
│   │   └── index.ts             # 类型定义
│   └── constants/
│       └── theme.ts             # 主题常量
├── assets/                      # 静态资源
├── app.json                     # Expo 配置
├── package.json
└── tsconfig.json
```

## 3. 数据模型

### 3.1 数据库表设计

```sql
-- 地点表
CREATE TABLE IF NOT EXISTS locations (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL UNIQUE,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 媒体记录表（仅存储引用，不存储文件本身）
CREATE TABLE IF NOT EXISTS media_items (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  uri         TEXT NOT NULL,              -- 本地文件路径
  type        TEXT NOT NULL CHECK(type IN ('photo', 'video')),
  date        TEXT NOT NULL,              -- 关联日期 YYYY-MM-DD
  location_id INTEGER,                    -- 关联地点
  duration    REAL,                        -- 视频时长（秒）
  width       INTEGER,                     -- 宽度
  height      INTEGER,                     -- 高度
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE SET NULL
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_media_date ON media_items(date);
CREATE INDEX IF NOT EXISTS idx_media_location ON media_items(location_id);
```

### 3.2 TypeScript 类型

```typescript
interface Location {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
}

interface MediaItem {
  id: number;
  uri: string;
  type: 'photo' | 'video';
  date: string;           // YYYY-MM-DD
  location_id: number | null;
  location_name?: string; // JOIN 查询时附带
  duration: number | null;
  width: number | null;
  height: number | null;
  created_at: string;
}

interface DayMarking {
  [date: string]: {
    marked: boolean;
    dotColor: string;
  };
}
```

## 4. 关键技术方案

### 4.1 媒体文件不做云存储

应用仅在 SQLite 中记录媒体文件的本地 URI。当用户从相册选择文件时，通过 `expo-image-picker` 获取文件 URI，将 URI 存入数据库。浏览时直接通过 URI 访问本地文件。

**风险**：如果用户在系统相册中删除了文件，应用中的引用将失效。需要在展示时做容错处理。

### 4.2 视频倍速播放

使用 `expo-av` 的 `Video` 组件，通过 `rate` 属性控制播放速率：

```typescript
<Video
  source={{ uri: mediaItem.uri }}
  rate={playbackRate}  // 0.5 | 1.0 | 1.5 | 2.0 | 3.0
  shouldPlay={isPlaying}
/>
```

### 4.3 日历标记

查询数据库中所有有媒体记录的日期，生成 `markedDates` 对象传递给日历组件：

```typescript
const markedDates = await db.getAllAsync<{ date: string }>(
  'SELECT DISTINCT date FROM media_items'
);
```

### 4.4 性能优化

- 媒体网格使用 `FlatList` + `numColumns` 实现，利用内置虚拟化
- 缩略图使用 `expo-image` 的缓存机制
- 数据库查询使用索引优化

## 5. 权限需求

| 权限 | 用途 |
|------|------|
| 相册读取 | 选择照片和视频 |
| 媒体库访问 | 读取本地媒体文件 |
