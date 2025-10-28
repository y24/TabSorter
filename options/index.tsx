import { Settings, DEFAULT_SETTINGS } from '../src/types/index.js';

/**
 * オプションページのメインクラス
 */
class OptionsPage {
  private form: HTMLFormElement;
  private toast: HTMLElement;
  private resetBtn: HTMLButtonElement;

  constructor() {
    this.form = document.getElementById('settings-form') as HTMLFormElement;
    this.toast = document.getElementById('toast') as HTMLElement;
    this.resetBtn = document.getElementById('reset-btn') as HTMLButtonElement;

    this.initialize();
  }

  /**
   * 初期化処理
   */
  private async initialize(): Promise<void> {
    try {
      // 設定を読み込んでフォームに反映
      await this.loadSettings();

      // イベントリスナーを設定
      this.setupEventListeners();

      console.log('オプションページが初期化されました');
    } catch (error) {
      console.error('オプションページの初期化に失敗:', error);
      this.showToast('設定の読み込みに失敗しました', 'error');
    }
  }

  /**
   * 設定を読み込んでフォームに反映する
   */
  private async loadSettings(): Promise<void> {
    try {
      // Chrome拡張のストレージから設定を取得
      const result = await chrome.storage.local.get(['tabSorterData']);
      const data = result.tabSorterData;
      
      let settings: Settings;
      if (data && data.settings) {
        settings = data.settings;
      } else {
        settings = DEFAULT_SETTINGS;
      }

      // フォームに設定を反映
      this.populateForm(settings);
    } catch (error) {
      console.error('設定の読み込みに失敗:', error);
      throw error;
    }
  }

  /**
   * フォームに設定を反映する
   */
  private populateForm(settings: Settings): void {
    // メインルール
    const mainRuleInput = this.form.querySelector(`input[name="mainRule"][value="${settings.mainRule}"]`) as HTMLInputElement;
    if (mainRuleInput) {
      mainRuleInput.checked = true;
    }

    // グループモード
    const groupModeInput = this.form.querySelector(`input[name="groupMode"][value="${settings.groupMode}"]`) as HTMLInputElement;
    if (groupModeInput) {
      groupModeInput.checked = true;
    }

    // ピンモード
    const pinModeInput = this.form.querySelector(`input[name="pinMode"][value="${settings.pinMode}"]`) as HTMLInputElement;
    if (pinModeInput) {
      pinModeInput.checked = true;
    }

    // 並び順
    const sortOrderInput = this.form.querySelector(`input[name="sortOrder"][value="${settings.sortOrder}"]`) as HTMLInputElement;
    if (sortOrderInput) {
      sortOrderInput.checked = true;
    }

    // スコープ
    const scopeInput = this.form.querySelector(`input[name="scope"][value="${settings.scope}"]`) as HTMLInputElement;
    if (scopeInput) {
      scopeInput.checked = true;
    }
  }

  /**
   * イベントリスナーを設定する
   */
  private setupEventListeners(): void {
    // フォーム送信イベント
    this.form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleFormSubmit();
    });

    // リセットボタンイベント
    this.resetBtn.addEventListener('click', () => {
      this.handleReset();
    });

    // フォーム変更時のバリデーション
    this.form.addEventListener('change', () => {
      this.validateForm();
    });
  }

  /**
   * フォーム送信を処理する
   */
  private async handleFormSubmit(): Promise<void> {
    try {
      // フォームのバリデーション
      if (!this.validateForm()) {
        return;
      }

      // フォームデータから設定を取得
      const settings = this.getFormData();

      // 設定を保存
      await this.saveSettings(settings);

      this.showToast('設定を保存しました', 'success');
    } catch (error) {
      console.error('設定の保存に失敗:', error);
      this.showToast('設定の保存に失敗しました', 'error');
    }
  }

  /**
   * リセットを処理する
   */
  private async handleReset(): Promise<void> {
    try {
      if (confirm('設定をデフォルトに戻しますか？')) {
        // デフォルト設定をフォームに反映
        this.populateForm(DEFAULT_SETTINGS);
        
        // デフォルト設定を保存
        await this.saveSettings(DEFAULT_SETTINGS);
        
        this.showToast('設定をリセットしました', 'success');
      }
    } catch (error) {
      console.error('設定のリセットに失敗:', error);
      this.showToast('設定のリセットに失敗しました', 'error');
    }
  }

  /**
   * フォームのバリデーション
   */
  private validateForm(): boolean {
    // メインルールが選択されているかチェック
    const mainRuleSelected = this.form.querySelector('input[name="mainRule"]:checked') as HTMLInputElement;
    if (!mainRuleSelected) {
      this.showToast('メインルールを選択してください', 'error');
      return false;
    }

    return true;
  }

  /**
   * フォームデータから設定を取得する
   */
  private getFormData(): Settings {
    const formData = new FormData(this.form);
    
    return {
      mainRule: formData.get('mainRule') as any,
      groupMode: formData.get('groupMode') as any,
      pinMode: formData.get('pinMode') as any,
      scope: formData.get('scope') as any,
      sortOrder: formData.get('sortOrder') as any,
      schemaVersion: DEFAULT_SETTINGS.schemaVersion
    };
  }

  /**
   * 設定を保存する
   */
  private async saveSettings(settings: Settings): Promise<void> {
    try {
      // 既存のデータを取得
      const result = await chrome.storage.local.get(['tabSorterData']);
      const data = result.tabSorterData || {};

      // 設定を更新
      data.settings = settings;

      // ストレージに保存
      await chrome.storage.local.set({ tabSorterData: data });
    } catch (error) {
      console.error('設定の保存に失敗:', error);
      throw error;
    }
  }

  /**
   * トースト通知を表示する
   */
  private showToast(message: string, type: 'success' | 'error'): void {
    this.toast.textContent = message;
    this.toast.className = `toast ${type}`;
    
    // 3秒後に自動で非表示
    setTimeout(() => {
      this.toast.classList.add('hidden');
    }, 3000);
  }
}

// ページ読み込み完了後に初期化
document.addEventListener('DOMContentLoaded', () => {
  new OptionsPage();
});
