# SkillsStampConnect

専門職大学向けの物理スタンプ型マイクロクレデンシャルシステム。Webギャラリー・管理画面・学生向けマイページ・QRコード外部公開機能を提供する。

> **⚠️ 注記**：このREADMEは、ソースコードをGitHubへアップロードするための暫定版です。本番デプロイ設定（`nginx.conf`・systemd unit）はまだ実装しておらず、このドキュメントは**開発環境でのセットアップ手順のみ**を対象としています。

---

## 前提条件

- Node.js 24 LTS
- Ubuntu 22.04 / 24.04（WSL含む）または同等の環境

---

## セットアップ手順

```bash
git clone <このリポジトリのURL> && cd SkillsStampConnect

# 環境変数
cp .env.example .env
# .env を開き、JWT_SECRET を必ず変更する（production 相当で運用する場合）

# 依存パッケージのインストール
npm install
```

### shadcn/ui のセットアップ

`components.json` は既にリポジトリに含まれているため、`npx shadcn@2.3.0 init` をそのまま実行すると
`Cannot read properties of undefined (reading 'resolvedPaths')` で失敗する。
一時的に退避してから初期化すること。

```bash
mv components.json components.json.bak
npx shadcn@2.3.0 init
```

対話質問への回答：

| 質問 | 回答 |
|---|---|
| Which style would you like to use? | `Default`（`New York` ではない） |
| Which color would you like to use as the base color? | `Slate` |
| Would you like to use CSS variables for theming? | `yes` |

完了後、生成された `components.json` の中身（`style: "default"` / `baseColor: "slate"` / `cssVariables: true` 等）を確認してから、退避したファイルを削除する。

```bash
rm components.json.bak

npx shadcn@2.3.0 add button card dialog badge input label select textarea checkbox alert scroll-area switch alert-dialog
```

### データベースの初期化

```bash
npm run migrate
```

`db/stickers.db` が作成され、初期データ（カテゴリー4件・スタンプ4件）と管理者アカウントが投入される。

### 起動

```bash
npm run dev
```

- フロントエンド: http://localhost:5173
- バックエンドAPI: http://localhost:3000（Viteがプロキシする）

---

## 初回ログイン

`.env` の `INITIAL_ADMIN_USERNAME` / `INITIAL_ADMIN_PASSWORD`（デフォルト: `admin` / `changeme`）で管理画面にログインできる。

---

## `uploads/` ディレクトリについて

`uploads/` はリポジトリに含まれていない（`.gitignore` 対象）。`git clone` した直後は存在しないが、問題ない。

- `server.js` がサーバー起動時に `uploads/` が存在しなければ自動作成する
- `lib/imageStore.js` が、画像がアップロードされた時点で `uploads/stickers/`・`uploads/categories/`・`uploads/students/` を都度自動作成する

事前に手動で作成する必要はない。

---

## 主な機能

- **カテゴリー・スタンプ管理**：管理者・職員がスタンプ（NSS-{AREA}-{TYPE}{SEQ}{VER} 形式のID）とカテゴリーを登録
- **学生アカウント**：CSV一括インポート（`login_id` を自動発行、実名・学籍番号相当の情報は保存しない）
- **実績記録**：職員がスタンプ取得を記録（🔑 職員全員が可能、admin限定ではない）
- **マイページ**：学生本人がプロフィール編集・実績の公開設定（`isVisible`）を行う
- **QRコード外部公開**：`student_profiles.external_public` を ON にすると、`GET /api/public/profile/:loginId` の固定URLがログイン不要で閲覧可能になる（`login_id` が変わらない限り恒久的なURL）

---

## 現在の実装状況

Step 1〜31（プロジェクト基盤・DB・API・フロントエンド・学生機能・外部公開プロフィール）まで完了。デプロイ設定（Step 32：`nginx.conf`・systemd unit・本番運用ドキュメント）は未実施。
