import { Settings, OpenedAtMap, StorageData, DEFAULT_SETTINGS } from '../types/index.js';

/**
 * ストレージ管理クラス
 */
export class StorageManager {
  private static readonly STORAGE_KEY = 'tabSorterData';

  /**
   * 設定を取得する
   */
  static async getSettings(): Promise<Settings> {
    try {
      const result = await chrome.storage.local.get([this.STORAGE_KEY]);
      const data: StorageData = result[this.STORAGE_KEY];
      
      if (!data || !data.settings) {
        return DEFAULT_SETTINGS;
      }
      
      // スキーマバージョンの互換性チェック
      return this.migrateSettings(data.settings);
    } catch (error) {
      console.error('設定の取得に失敗:', error);
      return DEFAULT_SETTINGS;
    }
  }

  /**
   * 設定を保存する
   */
  static async saveSettings(settings: Settings): Promise<void> {
    try {
      const data = await this.getStorageData();
      data.settings = settings;
      await chrome.storage.local.set({ [this.STORAGE_KEY]: data });
    } catch (error) {
      console.error('設定の保存に失敗:', error);
      throw error;
    }
  }

  /**
   * 開いた時刻マップを取得する
   */
  static async getOpenedAtMap(): Promise<OpenedAtMap> {
    try {
      const result = await chrome.storage.local.get([this.STORAGE_KEY]);
      const data: StorageData = result[this.STORAGE_KEY];
      return data?.openedAtMap || {};
    } catch (error) {
      console.error('開いた時刻マップの取得に失敗:', error);
      return {};
    }
  }

  /**
   * 開いた時刻マップを保存する
   */
  static async saveOpenedAtMap(openedAtMap: OpenedAtMap): Promise<void> {
    try {
      const data = await this.getStorageData();
      data.openedAtMap = openedAtMap;
      await chrome.storage.local.set({ [this.STORAGE_KEY]: data });
    } catch (error) {
      console.error('開いた時刻マップの保存に失敗:', error);
      throw error;
    }
  }

  /**
   * タブの開いた時刻を記録する
   */
  static async recordTabOpened(tabId: number): Promise<void> {
    try {
      const openedAtMap = await this.getOpenedAtMap();
      openedAtMap[tabId.toString()] = Date.now();
      await this.saveOpenedAtMap(openedAtMap);
    } catch (error) {
      console.error('タブの開いた時刻の記録に失敗:', error);
    }
  }

  /**
   * タブの開いた時刻を削除する
   */
  static async removeTabOpened(tabId: number): Promise<void> {
    try {
      const openedAtMap = await this.getOpenedAtMap();
      delete openedAtMap[tabId.toString()];
      await this.saveOpenedAtMap(openedAtMap);
    } catch (error) {
      console.error('タブの開いた時刻の削除に失敗:', error);
    }
  }

  /**
   * ストレージデータ全体を取得する
   */
  private static async getStorageData(): Promise<StorageData> {
    try {
      const result = await chrome.storage.local.get([this.STORAGE_KEY]);
      return result[this.STORAGE_KEY] || {
        settings: DEFAULT_SETTINGS,
        openedAtMap: {}
      };
    } catch (error) {
      console.error('ストレージデータの取得に失敗:', error);
      return {
        settings: DEFAULT_SETTINGS,
        openedAtMap: {}
      };
    }
  }

  /**
   * 設定のマイグレーション
   */
  private static migrateSettings(settings: Settings): Settings {
    // 将来のスキーマ変更に対応
    const migratedSettings = { ...DEFAULT_SETTINGS, ...settings };
    migratedSettings.schemaVersion = DEFAULT_SETTINGS.schemaVersion;
    return migratedSettings;
  }

  /**
   * ストレージをクリアする（デバッグ用）
   */
  static async clearStorage(): Promise<void> {
    try {
      await chrome.storage.local.clear();
    } catch (error) {
      console.error('ストレージのクリアに失敗:', error);
      throw error;
    }
  }
}
