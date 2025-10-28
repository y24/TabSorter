import { SortRule, SortKey } from '../types/index.js';
import { UrlUtils } from '../lib/punycode.js';
import { TabUtils } from '../lib/tabs.js';
import { StorageManager } from '../lib/storage.js';

/**
 * ドメイン名順ソートルール
 */
export const domainSortRule: SortRule = {
  id: 'domain',
  label: 'ドメイン名順',
  getKeyFn: (tab: chrome.tabs.Tab): SortKey => {
    if (!TabUtils.isValidUrl(tab.url)) {
      return ['zzz-special-url', '', '', '']; // 特殊URLは最後尾
    }

    if (UrlUtils.isSpecialUrl(tab.url!)) {
      return ['zzz-special-url', tab.url!, '', ''];
    }

    const domainKey = UrlUtils.getDomainSortKey(tab.url!);
    const title = TabUtils.getTabTitle(tab).toLowerCase();
    
    return [...domainKey, title];
  },
  order: 'asc'
};

/**
 * 開いた順ソートルール
 */
export const openedAtSortRule: SortRule = {
  id: 'openedAt',
  label: '開いた順',
  getKeyFn: async (tab: chrome.tabs.Tab): Promise<SortKey> => {
    if (!tab.id) {
      return [Date.now()]; // IDがない場合は現在時刻
    }

    try {
      const openedAtMap = await StorageManager.getOpenedAtMap();
      const openedAt = openedAtMap[tab.id.toString()];
      
      if (openedAt) {
        return [openedAt];
      }
      
      // 履歴がない場合はインデックスを初期値として使用
      return [tab.index || 0];
    } catch (error) {
      console.error('開いた時刻の取得に失敗:', error);
      return [tab.index || 0];
    }
  },
  order: 'asc'
};

/**
 * 最近使った順ソートルール
 */
export const lastAccessedSortRule: SortRule = {
  id: 'lastAccessed',
  label: '最近使った順',
  getKeyFn: (tab: chrome.tabs.Tab): SortKey => {
    // Chrome拡張機能APIではlastAccessedプロパティが利用できないため、
    // タブのインデックスを代わりに使用（新しいタブほど後ろに配置される）
    const index = tab.index || 0;
    return [index];
  },
  order: 'desc' // 降順（新しいタブほど先頭）
};

/**
 * ソートルールレジストリ
 */
export class SortRuleRegistry {
  private static rules: Map<string, SortRule> = new Map();

  /**
   * ルールを登録する
   */
  static registerRule(rule: SortRule): void {
    this.rules.set(rule.id, rule);
  }

  /**
   * ルールを取得する
   */
  static getRule(ruleId: string): SortRule | undefined {
    return this.rules.get(ruleId);
  }

  /**
   * すべてのルールを取得する
   */
  static getAllRules(): SortRule[] {
    return Array.from(this.rules.values());
  }

  /**
   * ルールIDのリストを取得する
   */
  static getRuleIds(): string[] {
    return Array.from(this.rules.keys());
  }

  /**
   * ルールが存在するかチェックする
   */
  static hasRule(ruleId: string): boolean {
    return this.rules.has(ruleId);
  }
}

// デフォルトルールを登録
SortRuleRegistry.registerRule(domainSortRule);
SortRuleRegistry.registerRule(openedAtSortRule);
SortRuleRegistry.registerRule(lastAccessedSortRule);
