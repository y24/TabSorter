"use strict";
(() => {
  // src/types/index.ts
  var DEFAULT_SETTINGS = {
    mainRule: "domain",
    groupMode: "sortWithin",
    pinMode: "sortPinned",
    scope: "currentWindow",
    schemaVersion: 1
  };

  // options/index.tsx
  var OptionsPage = class {
    constructor() {
      this.form = document.getElementById("settings-form");
      this.toast = document.getElementById("toast");
      this.resetBtn = document.getElementById("reset-btn");
      this.initialize();
    }
    /**
     * 初期化処理
     */
    async initialize() {
      try {
        await this.loadSettings();
        this.setupEventListeners();
        console.log("\u30AA\u30D7\u30B7\u30E7\u30F3\u30DA\u30FC\u30B8\u304C\u521D\u671F\u5316\u3055\u308C\u307E\u3057\u305F");
      } catch (error) {
        console.error("\u30AA\u30D7\u30B7\u30E7\u30F3\u30DA\u30FC\u30B8\u306E\u521D\u671F\u5316\u306B\u5931\u6557:", error);
        this.showToast("\u8A2D\u5B9A\u306E\u8AAD\u307F\u8FBC\u307F\u306B\u5931\u6557\u3057\u307E\u3057\u305F", "error");
      }
    }
    /**
     * 設定を読み込んでフォームに反映する
     */
    async loadSettings() {
      try {
        const result = await chrome.storage.local.get(["tabSorterData"]);
        const data = result.tabSorterData;
        let settings;
        if (data && data.settings) {
          settings = data.settings;
        } else {
          settings = DEFAULT_SETTINGS;
        }
        this.populateForm(settings);
      } catch (error) {
        console.error("\u8A2D\u5B9A\u306E\u8AAD\u307F\u8FBC\u307F\u306B\u5931\u6557:", error);
        throw error;
      }
    }
    /**
     * フォームに設定を反映する
     */
    populateForm(settings) {
      const mainRuleInput = this.form.querySelector(`input[name="mainRule"][value="${settings.mainRule}"]`);
      if (mainRuleInput) {
        mainRuleInput.checked = true;
      }
      const groupModeInput = this.form.querySelector(`input[name="groupMode"][value="${settings.groupMode}"]`);
      if (groupModeInput) {
        groupModeInput.checked = true;
      }
      const pinModeInput = this.form.querySelector(`input[name="pinMode"][value="${settings.pinMode}"]`);
      if (pinModeInput) {
        pinModeInput.checked = true;
      }
      const scopeInput = this.form.querySelector(`input[name="scope"][value="${settings.scope}"]`);
      if (scopeInput) {
        scopeInput.checked = true;
      }
    }
    /**
     * イベントリスナーを設定する
     */
    setupEventListeners() {
      this.form.addEventListener("submit", (e) => {
        e.preventDefault();
        this.handleFormSubmit();
      });
      this.resetBtn.addEventListener("click", () => {
        this.handleReset();
      });
      this.form.addEventListener("change", () => {
        this.validateForm();
      });
    }
    /**
     * フォーム送信を処理する
     */
    async handleFormSubmit() {
      try {
        if (!this.validateForm()) {
          return;
        }
        const settings = this.getFormData();
        await this.saveSettings(settings);
        this.showToast("\u8A2D\u5B9A\u3092\u4FDD\u5B58\u3057\u307E\u3057\u305F", "success");
      } catch (error) {
        console.error("\u8A2D\u5B9A\u306E\u4FDD\u5B58\u306B\u5931\u6557:", error);
        this.showToast("\u8A2D\u5B9A\u306E\u4FDD\u5B58\u306B\u5931\u6557\u3057\u307E\u3057\u305F", "error");
      }
    }
    /**
     * リセットを処理する
     */
    async handleReset() {
      try {
        if (confirm("\u8A2D\u5B9A\u3092\u30C7\u30D5\u30A9\u30EB\u30C8\u306B\u623B\u3057\u307E\u3059\u304B\uFF1F")) {
          this.populateForm(DEFAULT_SETTINGS);
          await this.saveSettings(DEFAULT_SETTINGS);
          this.showToast("\u8A2D\u5B9A\u3092\u30EA\u30BB\u30C3\u30C8\u3057\u307E\u3057\u305F", "success");
        }
      } catch (error) {
        console.error("\u8A2D\u5B9A\u306E\u30EA\u30BB\u30C3\u30C8\u306B\u5931\u6557:", error);
        this.showToast("\u8A2D\u5B9A\u306E\u30EA\u30BB\u30C3\u30C8\u306B\u5931\u6557\u3057\u307E\u3057\u305F", "error");
      }
    }
    /**
     * フォームのバリデーション
     */
    validateForm() {
      const mainRuleSelected = this.form.querySelector('input[name="mainRule"]:checked');
      if (!mainRuleSelected) {
        this.showToast("\u30E1\u30A4\u30F3\u30EB\u30FC\u30EB\u3092\u9078\u629E\u3057\u3066\u304F\u3060\u3055\u3044", "error");
        return false;
      }
      return true;
    }
    /**
     * フォームデータから設定を取得する
     */
    getFormData() {
      const formData = new FormData(this.form);
      return {
        mainRule: formData.get("mainRule"),
        groupMode: formData.get("groupMode"),
        pinMode: formData.get("pinMode"),
        scope: formData.get("scope"),
        schemaVersion: DEFAULT_SETTINGS.schemaVersion
      };
    }
    /**
     * 設定を保存する
     */
    async saveSettings(settings) {
      try {
        const result = await chrome.storage.local.get(["tabSorterData"]);
        const data = result.tabSorterData || {};
        data.settings = settings;
        await chrome.storage.local.set({ tabSorterData: data });
      } catch (error) {
        console.error("\u8A2D\u5B9A\u306E\u4FDD\u5B58\u306B\u5931\u6557:", error);
        throw error;
      }
    }
    /**
     * トースト通知を表示する
     */
    showToast(message, type) {
      this.toast.textContent = message;
      this.toast.className = `toast ${type}`;
      setTimeout(() => {
        this.toast.classList.add("hidden");
      }, 3e3);
    }
  };
  document.addEventListener("DOMContentLoaded", () => {
    new OptionsPage();
  });
})();
