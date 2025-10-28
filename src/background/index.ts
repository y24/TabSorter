import { StorageManager } from '../lib/storage.js';
import { SortExecutor } from './sortExecutor.js';
import { ContextMenuManager } from './contextMenus.js';
import { DEFAULT_SETTINGS } from '../types/index.js';

/**
 * Service Worker メインクラス
 */
class TabSorterServiceWorker {
  private isInitialized = false;

  /**
   * 初期化処理
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      console.log('TabSorter Service Worker を初期化中...');

      // デフォルト設定を保存（初回インストール時）
      await this.ensureDefaultSettings();

      // コンテキストメニューを初期化
      await ContextMenuManager.initialize();

      // イベントリスナーを設定
      this.setupEventListeners();

      this.isInitialized = true;
      console.log('TabSorter Service Worker の初期化が完了しました');
    } catch (error) {
      console.error('Service Worker の初期化に失敗:', error);
    }
  }

  /**
   * デフォルト設定を確保する
   */
  private async ensureDefaultSettings(): Promise<void> {
    try {
      const settings = await StorageManager.getSettings();
      if (!settings) {
        await StorageManager.saveSettings(DEFAULT_SETTINGS);
        console.log('デフォルト設定を保存しました');
      }
    } catch (error) {
      console.error('デフォルト設定の保存に失敗:', error);
    }
  }

  /**
   * イベントリスナーを設定する
   */
  private setupEventListeners(): void {
    // 拡張アイコンのクリックイベント
    chrome.action.onClicked.addListener(async (tab) => {
      try {
        await this.handleActionClick();
      } catch (error) {
        console.error('アクションクリックの処理に失敗:', error);
      }
    });

    // コンテキストメニューのクリックイベント
    chrome.contextMenus.onClicked.addListener(async (info, tab) => {
      try {
        await ContextMenuManager.handleClick(info);
      } catch (error) {
        console.error('コンテキストメニュークリックの処理に失敗:', error);
      }
    });

    // タブの作成イベント（開いた時刻を記録）
    chrome.tabs.onCreated.addListener(async (tab) => {
      try {
        if (tab.id) {
          await StorageManager.recordTabOpened(tab.id);
        }
      } catch (error) {
        console.error('タブ作成イベントの処理に失敗:', error);
      }
    });

    // タブの削除イベント（開いた時刻を削除）
    chrome.tabs.onRemoved.addListener(async (tabId, removeInfo) => {
      try {
        await StorageManager.removeTabOpened(tabId);
      } catch (error) {
        console.error('タブ削除イベントの処理に失敗:', error);
      }
    });

    // タブの更新イベント（URL変化時のキャッシュ無効化等）
    chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
      try {
        // URLが変更された場合の処理（将来のキャッシュ無効化等）
        if (changeInfo.url) {
          // 必要に応じてキャッシュを無効化
        }
      } catch (error) {
        console.error('タブ更新イベントの処理に失敗:', error);
      }
    });

    // タブのアクティブ化イベント
    chrome.tabs.onActivated.addListener(async (activeInfo) => {
      try {
        // 必要に応じてlastAccessedの更新処理
        // ChromeのAPIではlastAccessedは自動更新されるため、特別な処理は不要
      } catch (error) {
        console.error('タブアクティブ化イベントの処理に失敗:', error);
      }
    });

    // インストール/更新イベント
    chrome.runtime.onInstalled.addListener(async (details) => {
      try {
        console.log('TabSorter がインストール/更新されました:', details.reason);
        await this.initialize();
      } catch (error) {
        console.error('インストール/更新イベントの処理に失敗:', error);
      }
    });

    // 起動イベント
    chrome.runtime.onStartup.addListener(async () => {
      try {
        console.log('TabSorter が起動しました');
        await this.initialize();
      } catch (error) {
        console.error('起動イベントの処理に失敗:', error);
      }
    });
  }

  /**
   * アクションクリックを処理する（メインルールでソート）
   */
  private async handleActionClick(): Promise<void> {
    try {
      // 設定を取得
      const settings = await StorageManager.getSettings();
      
      // メインルールでソートを実行
      const result = await SortExecutor.sortTabs(settings.mainRule, settings);
      
      if (result.success) {
        console.log('メインルールでのソートが完了しました:', result.message);
      } else {
        console.error('メインルールでのソートに失敗しました:', result.message);
      }
    } catch (error) {
      console.error('アクションクリックの処理に失敗:', error);
    }
  }
}

// Service Worker インスタンスを作成して初期化
const serviceWorker = new TabSorterServiceWorker();
serviceWorker.initialize().catch(error => {
  console.error('Service Worker の初期化に失敗:', error);
});
