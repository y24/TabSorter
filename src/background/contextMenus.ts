import { SortRuleRegistry } from '../rules/index.js';
import { SortExecutor } from './sortExecutor.js';
import { StorageManager } from '../lib/storage.js';

/**
 * コンテキストメニュー管理クラス
 */
export class ContextMenuManager {
  private static readonly MENU_IDS = {
    OPTIONS: 'open-options',
    SORT_DOMAIN: 'sort-domain',
    SORT_OPENED: 'sort-opened',
    SORT_ACCESSED: 'sort-accessed'
  };

  /**
   * コンテキストメニューを初期化する
   */
  static async initialize(): Promise<void> {
    try {
      // 既存のメニューをクリア
      await chrome.contextMenus.removeAll();

      // メインメニューを作成
      await chrome.contextMenus.create({
        id: this.MENU_IDS.OPTIONS,
        title: 'オプションを開く',
        contexts: ['action']
      });

      // ソートメニューの親を作成
      await chrome.contextMenus.create({
        id: 'sort-menu',
        title: 'ソート',
        contexts: ['action']
      });

      // 各ソートルールのサブメニューを作成
      const rules = SortRuleRegistry.getAllRules();
      for (const rule of rules) {
        const menuId = this.getMenuIdForRule(rule.id);
        await chrome.contextMenus.create({
          id: menuId,
          parentId: 'sort-menu',
          title: rule.label,
          contexts: ['action']
        });
      }

      console.log('コンテキストメニューを初期化しました');
    } catch (error) {
      console.error('コンテキストメニューの初期化に失敗:', error);
    }
  }

  /**
   * コンテキストメニューのクリックイベントを処理する
   */
  static async handleClick(info: chrome.contextMenus.OnClickData): Promise<void> {
    try {
      if (!info.menuItemId) return;

      const menuId = info.menuItemId.toString();

      if (menuId === this.MENU_IDS.OPTIONS) {
        await this.openOptions();
        return;
      }

      // ソートルールのメニューIDをチェック
      const ruleId = this.getRuleIdFromMenuId(menuId);
      if (ruleId) {
        await this.executeSort(ruleId);
        return;
      }

      console.warn('未知のメニューID:', menuId);
    } catch (error) {
      console.error('コンテキストメニューのクリック処理に失敗:', error);
    }
  }

  /**
   * オプションページを開く
   */
  private static async openOptions(): Promise<void> {
    try {
      await chrome.runtime.openOptionsPage();
    } catch (error) {
      console.error('オプションページの表示に失敗:', error);
    }
  }

  /**
   * ソートを実行する
   */
  private static async executeSort(ruleId: string): Promise<void> {
    try {
      // 設定を取得
      const settings = await StorageManager.getSettings();
      
      // ソートを実行
      const result = await SortExecutor.sortTabs(ruleId as any, settings);
      
      if (result.success) {
        console.log('ソートが完了しました:', result.message);
        // ここでトースト通知を表示することも可能
      } else {
        console.error('ソートに失敗しました:', result.message);
        // エラー通知を表示
      }
    } catch (error) {
      console.error('ソート実行中にエラー:', error);
    }
  }

  /**
   * ルールIDからメニューIDを取得する
   */
  private static getMenuIdForRule(ruleId: string): string {
    switch (ruleId) {
      case 'domain':
        return this.MENU_IDS.SORT_DOMAIN;
      case 'openedAt':
        return this.MENU_IDS.SORT_OPENED;
      case 'lastAccessed':
        return this.MENU_IDS.SORT_ACCESSED;
      default:
        return `sort-${ruleId}`;
    }
  }

  /**
   * メニューIDからルールIDを取得する
   */
  private static getRuleIdFromMenuId(menuId: string): string | null {
    switch (menuId) {
      case this.MENU_IDS.SORT_DOMAIN:
        return 'domain';
      case this.MENU_IDS.SORT_OPENED:
        return 'openedAt';
      case this.MENU_IDS.SORT_ACCESSED:
        return 'lastAccessed';
      default:
        if (menuId.startsWith('sort-')) {
          return menuId.replace('sort-', '');
        }
        return null;
    }
  }

  /**
   * メニューを更新する（ルールが動的に変更された場合）
   */
  static async updateMenus(): Promise<void> {
    try {
      await this.initialize();
    } catch (error) {
      console.error('メニューの更新に失敗:', error);
    }
  }

  /**
   * メニューを削除する
   */
  static async cleanup(): Promise<void> {
    try {
      await chrome.contextMenus.removeAll();
    } catch (error) {
      console.error('メニューのクリーンアップに失敗:', error);
    }
  }
}
