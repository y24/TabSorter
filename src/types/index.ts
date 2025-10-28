// ソートルールの型定義
export type RuleId = 'domain' | 'openedAt' | 'lastAccessed';

export type GroupMode = 'sortWithin' | 'groupsToHead';
export type PinMode = 'sortPinned' | 'keepPinned';
export type Scope = 'currentWindow' | 'allWindows';
export type SortOrder = 'asc' | 'desc';

// 設定の型定義
export interface Settings {
  mainRule: RuleId;
  groupMode: GroupMode;
  pinMode: PinMode;
  scope: Scope;
  sortOrder: SortOrder;
  schemaVersion: number;
}

// ソートルールのインターフェース
export interface SortRule {
  id: RuleId;
  label: string;
  getKeyFn: (tab: chrome.tabs.Tab) => SortKey;
  order: 'asc' | 'desc';
}

// ソートキーの型（複数のキーを組み合わせて比較）
export type SortKey = string | number | (string | number)[];

// タブの開いた時刻を記録するマップ
export interface OpenedAtMap {
  [tabId: string]: number;
}

// ストレージに保存するデータの型
export interface StorageData {
  settings: Settings;
  openedAtMap: OpenedAtMap;
}

// デフォルト設定
export const DEFAULT_SETTINGS: Settings = {
  mainRule: 'domain',
  groupMode: 'sortWithin',
  pinMode: 'sortPinned',
  scope: 'currentWindow',
  sortOrder: 'asc',
  schemaVersion: 1
};

// ソート実行結果
export interface SortResult {
  success: boolean;
  message?: string;
  movedTabs?: number;
}
