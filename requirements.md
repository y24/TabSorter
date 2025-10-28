# Chrome拡張『TabSorter』要件定義書（v0.9）

## 1. 目的

現在開いているタブを、ユーザーが選択した一つの「メイン」ルールで即座に並び替える。タブグループやピン留めの扱いを柔軟に制御でき、将来的なソートルールの追加が容易な拡張性を持つ。

## 2. スコープ

* 対象: Google Chrome（Manifest V3）
* 範囲: **現在アクティブなウィンドウ**内のタブ並び替え（初期仕様）。

  * オプションで「すべてのウィンドウを対象」を将来拡張として検討。
* 権限: `tabs`, `tabGroups`, `storage`, `contextMenus`, `action`

  * ホスト権限は不要（ページ内容にはアクセスしない）。

## 3. 用語

* **メインルール**: 拡張アイコンを左クリックしたときに適用される主たるソートルール。
* **タブグループ**: Chromeのタブグループ機能（`chrome.tabGroups`／`chrome.tabs.group`）
* **ピン留めタブ**: `tab.pinned === true` のタブ。

## 4. ユーザーストーリー（要約）

1. **並び替えの一発実行**: ユーザーは拡張アイコンを左クリックして、設定済みのメインルールでタブを並び替えたい。
2. **都度ルール選択**: アイコンを右クリックして表示されるメニューから、別のソートルールを一時的に適用したい。
3. **タブグループ配慮**: グループを崩さずに先頭へ寄せる、もしくはグループ内だけを並び替えたい。
4. **ピン留め配慮**: ピン留めタブを並び替える／並び替え対象外にしたい。
5. **事故防止**: タブをドラッグで移動中は拡張による並び替えを抑止したい。

## 5. 機能要件

### 5.1 ソートルール

* 実装するルール（初期）

  1. **ドメイン名順**

     * 比較キー: `URLの登録ドメイン（eTLD+1）` → サブドメイン → パス
     * 大文字小文字は無視。国際化ドメインは punycode 正規化。
     * 同一ドメイン内の並び替え副キー: タイトル（`tab.title`）→ URL フルパス。
  2. **開いた順**

     * 取得方法: `tabs.onCreated` をSW（Service Worker）で監視し、`tab.id -> openedAt (Date.now())` を `storage.local` に記録。
     * **初回インストール以前から開いているタブ**は履歴がないため、当該セッションに限り `tab.index` を開いた順の初期値として扱う。
  3. **最近使った順（MRU: Most Recently Used）**

     * 取得方法: `tab.lastAccessed` を使用。降順（最近ほど先頭）。

* ルールの選択

  * 設定画面で**メインルールを1つ**選択（必須）。
  * 右クリックメニューからは任意ルールを都度適用可能（メインルールは変えない）。

* 将来拡張

  * 例: タイトル順、URL長短、YouTube/音楽系優先、ドメインごとのカスタム優先度…
  * ルールは**プラガブル**に追加可能（詳細は§9 アーキテクチャ）。

### 5.2 タブグループの扱い

* 設定: 以下から一つ選択

  1. **グループ内でのみソート**

     * 各グループを独立したソート単位として扱い、グループ間の相対順序は保持。
  2. **グループの塊を保ったまま先頭へ移動**

     * グループ未所属タブとグループを**ブロック単位**で扱い、ブロック間を所定キーで並び替えた上で、全グループブロックをウィンドウ先頭側へ寄せる（塊は崩さない）。
* 注意: ChromeのAPI仕様上、グループの移動は `chrome.tabGroups.update({ collapsed, color, title })` では順序制御不可のため、**グループに属するタブ集合を `chrome.tabs.move` でまとめて移動**する。

### 5.3 ピン留めタブの扱い

* 設定: 以下から一つ選択

  1. **ピン留めタブ内でソート**（ピン留め領域内のみ対象）
  2. **ピン留めタブをソートしない**（ピン留め領域はそのまま固定）

* 制約: Chromeは**ピン留め領域と非ピン留め領域を跨ぐ移動に制約**があるため、

  * 並び替えは **ピン留め領域** と **非ピン留め領域** を分離して処理。
  * 非ピン留めタブをピン留め領域のインデックスに移動しようとした場合は、Chrome側で調整されるため、
    **目標インデックスは領域内で再計算**する（実装で吸収）。

### 5.4 実行トリガ

* **左クリック（actionアイコン）**: メインルールで即ソート。
* **右クリック（context menu: action）**: メニュー表示。

  * `オプションを開く`（設定画面）
  * `今すぐソート >`（サブメニュー: 各ルール）

### 5.5 エラー回避・ドラッグ中抑止

* 並び替え時の `chrome.tabs.move` で、ユーザーが**手動ドラッグ中**だとエラーが発生する場合がある。
* ポリシー:

  * 実行直前に**短時間のドラッグ検知ウィンドウ**を設け、`tabs.onMoved` バーストや `chrome.runtime.lastError` を検知したら**即中断**。
  * 一連の移動操作は**デバウンス**（例: 500ms）して多重実行を防ぐ。
  * 失敗時は**トースト通知**で理由を簡潔に表示（「タブ移動中のため中断」）。

## 6. 非機能要件

* **パフォーマンス**: 200タブ程度まで体感1〜2秒以内の並び替え完了を目安。

  * まとめ移動（連続インデックス）時は `chrome.tabs.move([ids], toIndex)` を活用しAPIコールを削減。
* **信頼性**: 例外時はロールバック不要（表示順のみのため）。
* **拡張性**: ルールをファイル追加だけで登録できる Plugin/Strategy 構造。
* **プライバシー**: ドメイン名・タイムスタンプのみを `storage.local` に保持。ページ内容は扱わない。
* **i18n**: 初期は日本語、将来英語。
* **アクセシビリティ**: キーボードショートカット（`commands`）でメインソートを実行可能（将来）。

## 7. 画面/UX

### 7.1 オプションページ

* 構成

  * メインルール（ラジオボタン）
  * タブグループの扱い（ラジオ）
  * ピン留めタブの扱い（ラジオ）
  * スコープ: 現在のウィンドウのみ / すべてのウィンドウ（将来）
  * 保存/リセット
* バリデーション

  * メインルールは必須選択。

### 7.2 コンテキストメニュー（action アイコンの右クリック）

* `オプションを開く`
* `今すぐソート`（サブメニュー）

  * ドメイン名順
  * 開いた順
  * 最近使った順

### 7.3 通知

* 実行開始/完了、抑止/エラーを短いトーストで表示（`chrome.notifications` ではなく、原則はブラウザ標準UIに依存せずオプションページ内の軽量トーストを採用。必要時のみ `notifications` 権限を追加検討）。

## 8. データモデル

* `storage.local`

  * `settings: {
      mainRule: 'domain' | 'openedAt' | 'lastAccessed',
      groupMode: 'sortWithin' | 'groupsToHead',
      pinMode: 'sortPinned' | 'keepPinned',
      scope: 'currentWindow' // 将来 'allWindows'
    }`
  * `openedAtMap: { [tabId: string]: number }` // onCreatedで記録。

* **マイグレーション**: バージョン番号 `schemaVersion` を付与、将来のキー追加に備える。

## 9. アーキテクチャ

* Manifest V3 / Service Worker（SW）駆動。

* 構成

  * `src/background/`（SW: ルール適用・イベント購読）
  * `src/options/`（設定UI）
  * `src/rules/`（各ソートルール: Strategy）
  * `src/lib/`（タブ取得/グループ操作/正規化/国際化ドメイン処理）

* **Strategy/Plugin設計**

  * ルールは `{ id, label, getKeyFn(t: Tab): SortKey, order: 'asc'|'desc' }` を満たすモジュール。
  * ルール登録は `registerRule(rule)` で DI コンテナに追加。
  * UI 側は `label` を列挙してメニュー生成。SWは `id` で実体を解決。

* **ドメイン正規化**

  * URL → punycode 変換 → eTLD+1 抽出（サブドメインは副キー）。
  * 例外URL（chrome://, chrome-extension:// 等）は末尾へ退避。

## 10. 並び替えアルゴリズム（概要）

1. 対象ウィンドウのタブ一覧を取得（`chrome.tabs.query({windowId, hidden: false})`）。
2. ピン留めモードに応じ、`pinned`/`unpinned` を**別配列**に分離。
3. グループモード

   * **sortWithin**: グループIDごとに配列を分割し、各配列にソートを適用。グループ間順序は保持。
   * **groupsToHead**: タブグループを**ブロック単位**で認識し、ブロックの代表キー（例: ブロック内先頭/最頻ドメイン）でブロック同士を並び替え、ブロックを先頭に寄せる。ブロック内部は必要に応じてルールで整列。
4. キー生成（選択ルールの `getKeyFn`）。
5. 安定ソートを実行（元 `index` を最終副キーにして順序の予期しない反転を防止）。
6. **最小移動計画**を生成

   * 既存順と目標順の**ロングエスト・インクリース・サブシーケンス（LIS）**を残し、不要移動を削減（APIコール数を抑制）。
7. 可能な範囲で**連続IDのまとめ移動**を行い、`chrome.tabs.move` 呼び出しを減らす。
8. 失敗時は中断・通知。

## 11. イベントフロー

* 起動時 / インストール時

  * 既定設定を書き込み。
  * 右クリック用 `contextMenus` を登録。
* `tabs.onCreated` → `openedAtMap[tab.id] = Date.now()`
* `tabs.onRemoved` → `openedAtMap` から削除。
* `tabs.onUpdated`（URL変化）→ ドメインルール時のキャッシュ無効化。
* `tabs.onActivated` → 必要に応じて `lastAccessed` 取得トリガ（参照のみ）。
* `action.onClicked` → メインルール適用。
* `contextMenus.onClicked` → 該当ルール適用 or オプション起動。

## 12. エラーハンドリング

* `chrome.runtime.lastError` を常に確認。
* 代表的な失敗ケース

  * タブドラッグ中 → 中断、ユーザーに再実行を促す文言。
  * タブがクローズ済み → スキップ継続。
  * インデックス競合 → 再計算してリトライ（最大1回）。

## 13. セキュリティ/プライバシー

* ページ内容・履歴・Cookieへのアクセスなし。
* 保存するのは設定とタイムスタンプのみ。
* 同期は**初期は `storage.local`**。将来的に `storage.sync` への切替オプションを提供。

## 14. 受け入れ基準（抜粋）

* 左クリックでメインルールが即時適用される。
* 右クリックメニューに**オプション**と**今すぐソート（3種）**が出る。
* グループ内ソート／グループ塊先頭寄せが設定通りに機能する。
* ピン留めを「ソートしない」にした場合、ピン留め領域の順序は不変。
* 100タブでの並び替えが3秒以内（参考値）で完了。
* 例外URLは最後尾へ退避。

## 15. 制約・既知の仕様

* タブの**手動ドラッグ中**は移動APIが失敗する可能性があるため、実行はデバウンス＋リトライ最小限。
* ピン留め領域と非ピン留め領域を跨ぐ並び替えは**API側の制約**により完全制御不可。設計で吸収する。
* 右クリックメニューは**拡張アイコン（action）**に対して提供（タブ見出しのネイティブコンテキストメニューを直接置換することはできない）。

## 16. ディレクトリ構成（例）

```
TabSorter/
  ├─ manifest.json
  ├─ src/
  │   ├─ background/
  │   │   ├─ index.ts
  │   │   ├─ contextMenus.ts
  │   │   └─ sortExecutor.ts
  │   ├─ rules/
  │   │   ├─ domain.ts
  │   │   ├─ openedAt.ts
  │   │   └─ lastAccessed.ts
  │   ├─ lib/
  │   │   ├─ tabs.ts
  │   │   ├─ groups.ts
  │   │   ├─ punycode.ts
  │   │   └─ storage.ts
  │   └─ types/
  │       └─ index.d.ts
  ├─ options/
  │   ├─ index.html
  │   ├─ index.tsx
  │   └─ style.css
  └─ assets/
      ├─ icon16.png
      ├─ icon32.png
      ├─ icon48.png
      └─ icon128.png
```

## 17. manifest.json（草案）

```json
{
  "manifest_version": 3,
  "name": "TabSorter",
  "version": "0.1.0",
  "action": {
    "default_title": "Sort tabs"
  },
  "permissions": [
    "tabs",
    "tabGroups",
    "storage",
    "contextMenus"
  ],
  "background": {
    "service_worker": "dist/background/index.js",
    "type": "module"
  },
  "options_page": "options/index.html",
  "icons": {
    "16": "assets/icon16.png",
    "32": "assets/icon32.png",
    "48": "assets/icon48.png",
    "128": "assets/icon128.png"
  }
}
```

## 18. 擬似コード（コア）

```ts
async function sortCurrentWindow(ruleId: RuleId, settings: Settings) {
  const win = await chrome.windows.getCurrent();
  const tabs = await chrome.tabs.query({ windowId: win.id });

  // 1) 分離
  const pinned = tabs.filter(t => t.pinned);
  const unpinned = tabs.filter(t => !t.pinned);

  // 2) ルール取得
  const rule = RuleRegistry.get(ruleId);

  // 3) グループ処理
  const sortedPinned   = applyGroupPolicy(pinned, rule, settings.groupMode);
  const sortedUnpinned = applyGroupPolicy(unpinned, rule, settings.groupMode);

  // 4) 実移動
  await applyMovesSequentially(win.id!, [...sortedPinned, ...sortedUnpinned]);
}
```

## 19. テスト観点（抜粋）

* **基本**: 3ルールでのソートが目視で期待順序に一致。
* **グループ**: グループ内のみソート／塊先頭寄せが設定通り。
* **ピン留め**: ソート対象/非対象の切替が正しく動作。
* **例外URL**: `chrome://` 等が最後尾へ退避。
* **大量タブ**: 100/200タブで性能・安定性確認。
* **並行操作**: ユーザーが手でドラッグしている最中は中断される。
* **再起動**: ブラウザ再起動後も設定・openedAtMapの欠損に起因する初回挙動が仕様通り。

## 20. 将来拡張

* ルールの外部定義（JSON/YAML）とホットリロード。
* ドメインごとの**優先度テーブル**。
* `storage.sync` 対応、プロファイル間同期。
* キーボードショートカット（`commands`）。
* 「すべてのウィンドウ」対象化。

## 21. リスクと回避策

* **API制約による微妙な順序ずれ**: LISによる最小移動＋再計算で軽減。
* **拡張のアイコン右クリック以外のメニュー拡張不可**: 仕様として明記（§15）。
* **国際化ドメイン混在**: 正規化レイヤーで吸収、テストケースを用意。

## 22. 受け渡し物

* ソースコード（TypeScript推奨、ESBuild/webpack 等でバンドル）
* ビルドスクリプト
* README（インストール/権限説明/既知の制約）
* テスト手順（手動）
