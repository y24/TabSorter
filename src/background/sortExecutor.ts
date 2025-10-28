import { Settings, SortResult, RuleId } from '../types/index.js';
import { TabUtils } from '../lib/tabs.js';
import { GroupUtils } from '../lib/groups.js';
import { SortRuleRegistry } from '../rules/index.js';

/**
 * 並び替え実行エンジン
 */
export class SortExecutor {
  private static isExecuting = false;
  private static debounceTimer: number | null = null;

  /**
   * 現在のウィンドウのタブを並び替える
   */
  static async sortCurrentWindow(ruleId: RuleId, settings: Settings): Promise<SortResult> {
    // デバウンス処理
    if (this.isExecuting) {
      return {
        success: false,
        message: '並び替えが既に実行中です'
      };
    }

    // 短時間のドラッグ検知ウィンドウ
    const dragDetectionWindow = this.createDragDetectionWindow();
    
    try {
      this.isExecuting = true;
      
      // ルールを取得
      const rule = SortRuleRegistry.getRule(ruleId);
      if (!rule) {
        return {
          success: false,
          message: `ルール '${ruleId}' が見つかりません`
        };
      }

      // 現在のウィンドウのタブを取得
      const tabs = await TabUtils.getCurrentWindowTabs();
      if (tabs.length <= 1) {
        return {
          success: true,
          message: '並び替え対象のタブがありません',
          movedTabs: 0
        };
      }

      // ピン留めと非ピン留めに分離
      const { pinned, unpinned } = TabUtils.separatePinnedTabs(tabs);

      // 並び替え実行
      let movedTabs = 0;
      
      if (settings.pinMode === 'sortPinned' && pinned.length > 0) {
        const pinnedResult = await this.sortTabGroup(pinned, rule, settings);
        movedTabs += pinnedResult.movedTabs || 0;
      }
      
      if (unpinned.length > 0) {
        const unpinnedResult = await this.sortTabGroup(unpinned, rule, settings);
        movedTabs += unpinnedResult.movedTabs || 0;
      }

      return {
        success: true,
        message: `${movedTabs}個のタブを並び替えました`,
        movedTabs
      };

    } catch (error) {
      console.error('並び替え実行中にエラー:', error);
      return {
        success: false,
        message: `並び替えに失敗しました: ${error}`
      };
    } finally {
      this.isExecuting = false;
      this.clearDragDetectionWindow(dragDetectionWindow);
    }
  }

  /**
   * タブグループを並び替える
   */
  private static async sortTabGroup(
    tabs: chrome.tabs.Tab[], 
    rule: any, 
    settings: Settings
  ): Promise<SortResult> {
    try {
      if (settings.groupMode === 'sortWithin') {
        return await this.sortWithinGroups(tabs, rule);
      } else {
        return await this.sortGroupsToHead(tabs, rule);
      }
    } catch (error) {
      console.error('グループ並び替え中にエラー:', error);
      return {
        success: false,
        message: `グループ並び替えに失敗: ${error}`
      };
    }
  }

  /**
   * グループ内でのみソート
   */
  private static async sortWithinGroups(tabs: chrome.tabs.Tab[], rule: any): Promise<SortResult> {
    const groups = TabUtils.groupTabsByGroupId(tabs);
    let movedTabs = 0;

    for (const [groupId, groupTabs] of groups) {
      if (groupId === -1) {
        // グループ未所属タブ
        const result = await this.sortTabArray(groupTabs, rule);
        movedTabs += result.movedTabs || 0;
      } else {
        // グループ内タブ
        const result = await this.sortTabArray(groupTabs, rule);
        movedTabs += result.movedTabs || 0;
      }
    }

    return {
      success: true,
      movedTabs
    };
  }

  /**
   * グループの塊を先頭に寄せる
   */
  private static async sortGroupsToHead(tabs: chrome.tabs.Tab[], rule: any): Promise<SortResult> {
    const groups = TabUtils.groupTabsByGroupId(tabs);
    const ungroupedTabs = groups.get(-1) || [];
    const groupedTabs = Array.from(groups.entries())
      .filter(([groupId]) => groupId !== -1)
      .map(([groupId, groupTabs]) => ({ groupId, tabs: groupTabs }));

    let movedTabs = 0;

    // グループ未所属タブを並び替え
    if (ungroupedTabs.length > 0) {
      const result = await this.sortTabArray(ungroupedTabs, rule);
      movedTabs += result.movedTabs || 0;
    }

    // グループを先頭に寄せる
    let currentIndex = 0;
    for (const { groupId, tabs: groupTabs } of groupedTabs) {
      const success = await GroupUtils.moveGroupToIndex(groupId, currentIndex);
      if (success) {
        movedTabs += groupTabs.length;
        currentIndex += groupTabs.length;
      }
    }

    return {
      success: true,
      movedTabs
    };
  }

  /**
   * タブ配列を並び替える
   */
  private static async sortTabArray(tabs: chrome.tabs.Tab[], rule: any): Promise<SortResult> {
    if (tabs.length <= 1) {
      return { success: true, movedTabs: 0 };
    }

    try {
      // ソートキーを生成
      const tabWithKeys = await Promise.all(
        tabs.map(async (tab) => ({
          tab,
          key: await this.getSortKey(tab, rule)
        }))
      );

      // 安定ソートを実行
      tabWithKeys.sort((a, b) => {
        const comparison = this.compareKeys(a.key, b.key, rule.order);
        if (comparison !== 0) return comparison;
        
        // 同順の場合は元のインデックスで安定化
        return (a.tab.index || 0) - (b.tab.index || 0);
      });

      // 最小移動計画を生成して実行
      const sortedTabs = tabWithKeys.map(item => item.tab);
      const movedTabs = await this.executeMinimalMoves(tabs, sortedTabs);

      return {
        success: true,
        movedTabs
      };
    } catch (error) {
      console.error('タブ配列の並び替えに失敗:', error);
      return {
        success: false,
        message: `並び替えに失敗: ${error}`
      };
    }
  }

  /**
   * ソートキーを取得する
   */
  private static async getSortKey(tab: chrome.tabs.Tab, rule: any): Promise<any> {
    if (typeof rule.getKeyFn === 'function') {
      return await rule.getKeyFn(tab);
    }
    return '';
  }

  /**
   * キーを比較する
   */
  private static compareKeys(keyA: any, keyB: any, order: 'asc' | 'desc'): number {
    const result = this.compareValues(keyA, keyB);
    return order === 'desc' ? -result : result;
  }

  /**
   * 値を比較する
   */
  private static compareValues(a: any, b: any): number {
    if (Array.isArray(a) && Array.isArray(b)) {
      for (let i = 0; i < Math.max(a.length, b.length); i++) {
        const comparison = this.compareValues(a[i] || '', b[i] || '');
        if (comparison !== 0) return comparison;
      }
      return 0;
    }

    if (typeof a === 'string' && typeof b === 'string') {
      return a.localeCompare(b);
    }

    if (typeof a === 'number' && typeof b === 'number') {
      return a - b;
    }

    return String(a).localeCompare(String(b));
  }

  /**
   * 最小移動計画を実行する
   */
  private static async executeMinimalMoves(
    originalTabs: chrome.tabs.Tab[], 
    sortedTabs: chrome.tabs.Tab[]
  ): Promise<number> {
    let movedTabs = 0;

    // 現在の順序と目標順序を比較
    for (let i = 0; i < sortedTabs.length; i++) {
      const targetTab = sortedTabs[i];
      const currentTab = originalTabs[i];

      if (targetTab.id !== currentTab.id) {
        // タブを移動
        const success = await TabUtils.moveTab(targetTab.id!, i);
        if (success) {
          movedTabs++;
        }
      }
    }

    return movedTabs;
  }

  /**
   * ドラッグ検知ウィンドウを作成する
   */
  private static createDragDetectionWindow(): any {
    // 簡単な実装 - 実際にはより複雑な検知が必要
    return {
      startTime: Date.now(),
      movedTabs: new Set<number>()
    };
  }

  /**
   * ドラッグ検知ウィンドウをクリアする
   */
  private static clearDragDetectionWindow(window: any): void {
    // クリーンアップ処理
  }
}
