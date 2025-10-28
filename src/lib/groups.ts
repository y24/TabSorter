/**
 * タブグループ操作に関するユーティリティクラス
 */
export class GroupUtils {
  /**
   * グループ内のタブを取得する
   */
  static async getGroupTabs(groupId: number): Promise<chrome.tabs.Tab[]> {
    try {
      const tabs = await chrome.tabs.query({ groupId });
      return tabs;
    } catch (error) {
      console.error(`グループ${groupId}のタブ取得に失敗:`, error);
      return [];
    }
  }

  /**
   * グループ情報を取得する
   */
  static async getGroupInfo(groupId: number): Promise<chrome.tabGroups.TabGroup | null> {
    try {
      const group = await chrome.tabGroups.get(groupId);
      return group;
    } catch (error) {
      console.error(`グループ${groupId}の情報取得に失敗:`, error);
      return null;
    }
  }

  /**
   * グループ内でタブを並び替える
   */
  static async sortTabsWithinGroup(
    groupId: number, 
    sortedTabIds: number[]
  ): Promise<boolean> {
    try {
      // グループ内の最初のタブのインデックスを取得
      const groupTabs = await this.getGroupTabs(groupId);
      if (groupTabs.length === 0) return true;

      const firstTabIndex = Math.min(...groupTabs.map(tab => tab.index!));
      
      // グループ内のタブを順番に移動
      for (let i = 0; i < sortedTabIds.length; i++) {
        await chrome.tabs.move(sortedTabIds[i], { index: firstTabIndex + i });
      }
      
      return true;
    } catch (error) {
      console.error(`グループ${groupId}内の並び替えに失敗:`, error);
      return false;
    }
  }

  /**
   * グループ全体を指定位置に移動する
   */
  static async moveGroupToIndex(
    groupId: number, 
    targetIndex: number
  ): Promise<boolean> {
    try {
      const groupTabs = await this.getGroupTabs(groupId);
      if (groupTabs.length === 0) return true;

      const tabIds = groupTabs.map(tab => tab.id!).filter(id => id !== undefined);
      await chrome.tabs.move(tabIds, { index: targetIndex });
      
      return true;
    } catch (error) {
      console.error(`グループ${groupId}の移動に失敗:`, error);
      return false;
    }
  }

  /**
   * グループのブロック情報を取得する
   */
  static getGroupBlocks(tabs: chrome.tabs.Tab[]): Array<{
    groupId: number;
    tabs: chrome.tabs.Tab[];
    startIndex: number;
    endIndex: number;
  }> {
    const groups = new Map<number, chrome.tabs.Tab[]>();
    
    // タブをグループIDで分類
    for (const tab of tabs) {
      const groupId = tab.groupId || -1;
      if (!groups.has(groupId)) {
        groups.set(groupId, []);
      }
      groups.get(groupId)!.push(tab);
    }

    // ブロック情報を生成
    const blocks: Array<{
      groupId: number;
      tabs: chrome.tabs.Tab[];
      startIndex: number;
      endIndex: number;
    }> = [];

    for (const [groupId, groupTabs] of groups) {
      if (groupTabs.length === 0) continue;

      const indices = groupTabs.map(tab => tab.index!).sort((a, b) => a - b);
      blocks.push({
        groupId,
        tabs: groupTabs,
        startIndex: indices[0],
        endIndex: indices[indices.length - 1]
      });
    }

    // 開始インデックスでソート
    blocks.sort((a, b) => a.startIndex - b.startIndex);
    
    return blocks;
  }

  /**
   * グループが存在するかチェックする
   */
  static async groupExists(groupId: number): Promise<boolean> {
    try {
      await chrome.tabGroups.get(groupId);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * グループの代表キーを取得する（ソート用）
   */
  static getGroupRepresentativeKey(
    groupTabs: chrome.tabs.Tab[], 
    getKeyFn: (tab: chrome.tabs.Tab) => any
  ): any {
    if (groupTabs.length === 0) return '';
    
    // グループ内の最初のタブのキーを代表とする
    return getKeyFn(groupTabs[0]);
  }
}
