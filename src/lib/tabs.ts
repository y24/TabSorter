/**
 * タブ操作に関するユーティリティクラス
 */
export class TabUtils {
  /**
   * 現在のウィンドウのタブを取得する
   */
  static async getCurrentWindowTabs(): Promise<chrome.tabs.Tab[]> {
    try {
      const window = await chrome.windows.getCurrent();
      const tabs = await chrome.tabs.query({ 
        windowId: window.id
      });
      // hiddenプロパティでフィルタリング（APIではサポートされていないため、手動でフィルタリング）
      return tabs.filter(tab => !tab.hidden);
    } catch (error) {
      console.error('現在のウィンドウのタブ取得に失敗:', error);
      throw error;
    }
  }

  /**
   * すべてのウィンドウのタブを取得する
   */
  static async getAllWindowsTabs(): Promise<chrome.tabs.Tab[]> {
    try {
      const tabs = await chrome.tabs.query({});
      // hiddenプロパティでフィルタリング（APIではサポートされていないため、手動でフィルタリング）
      return tabs.filter(tab => !tab.hidden);
    } catch (error) {
      console.error('すべてのウィンドウのタブ取得に失敗:', error);
      throw error;
    }
  }

  /**
   * ウィンドウIDでタブを取得する
   */
  static async getTabsByWindowId(windowId: number): Promise<chrome.tabs.Tab[]> {
    try {
      const tabs = await chrome.tabs.query({ 
        windowId: windowId
      });
      return tabs.filter(tab => !tab.hidden);
    } catch (error) {
      console.error(`ウィンドウ${windowId}のタブ取得に失敗:`, error);
      throw error;
    }
  }

  /**
   * タブをピン留めと非ピン留めに分離する
   */
  static separatePinnedTabs(tabs: chrome.tabs.Tab[]): {
    pinned: chrome.tabs.Tab[];
    unpinned: chrome.tabs.Tab[];
  } {
    const pinned: chrome.tabs.Tab[] = [];
    const unpinned: chrome.tabs.Tab[] = [];

    for (const tab of tabs) {
      if (tab.pinned) {
        pinned.push(tab);
      } else {
        unpinned.push(tab);
      }
    }

    return { pinned, unpinned };
  }

  /**
   * タブをグループIDで分類する
   */
  static groupTabsByGroupId(tabs: chrome.tabs.Tab[]): Map<number, chrome.tabs.Tab[]> {
    const groups = new Map<number, chrome.tabs.Tab[]>();

    for (const tab of tabs) {
      const groupId = tab.groupId || -1; // グループ未所属は-1として扱う
      if (!groups.has(groupId)) {
        groups.set(groupId, []);
      }
      groups.get(groupId)!.push(tab);
    }

    return groups;
  }

  /**
   * タブを移動する（エラーハンドリング付き）
   */
  static async moveTab(tabId: number, index: number): Promise<boolean> {
    try {
      await chrome.tabs.move(tabId, { index });
      return true;
    } catch (error) {
      console.error(`タブ${tabId}の移動に失敗:`, error);
      return false;
    }
  }

  /**
   * 複数のタブをまとめて移動する
   */
  static async moveTabs(tabIds: number[], index: number): Promise<boolean> {
    try {
      await chrome.tabs.move(tabIds, { index });
      return true;
    } catch (error) {
      console.error(`タブ群の移動に失敗:`, error);
      return false;
    }
  }

  /**
   * タブが有効かどうかをチェックする
   */
  static isValidTab(tab: chrome.tabs.Tab): boolean {
    return !!(tab && tab.id && tab.id !== chrome.tabs.TAB_ID_NONE);
  }

  /**
   * タブのインデックスを取得する（安全版）
   */
  static getTabIndex(tab: chrome.tabs.Tab): number {
    return tab.index ?? -1;
  }

  /**
   * タブのURLが有効かどうかをチェックする
   */
  static isValidUrl(url?: string): boolean {
    if (!url) return false;
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * タブのドメインを取得する
   */
  static getDomain(url?: string): string {
    if (!this.isValidUrl(url)) return '';
    try {
      const urlObj = new URL(url!);
      return urlObj.hostname;
    } catch {
      return '';
    }
  }

  /**
   * タブのタイトルを取得する（安全版）
   */
  static getTabTitle(tab: chrome.tabs.Tab): string {
    return tab.title || tab.url || '無題';
  }
}
