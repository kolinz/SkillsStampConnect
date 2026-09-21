# ソフトウェア設計仕様書（SDD）
## SkillsStampConnect

| 項目 | 内容 |
|------|------|
| 文書バージョン | 1.1 |
| 作成日 | 2026-09-11 |
| 最終更新日 | 2026-09-19（SkillsStampConnect v11.0：QRコード外部公開の導入・キオスクモード廃止） |
| 前身プロジェクト | sticker-gallery（v6.0 〜 v10.0） |
| システム名 | SkillsStampConnect |
| 対象読者 | 開発者・システム担当教員 |

> **本書の位置づけ**：SkillsStampConnect は、「スキルスタンプ・ギャラリー」プロジェクト（sticker-gallery）の v9.0 基盤、および v10.0 で設計した学生アカウント・実績記録・キオスクモード機能を引き継ぎ、**完全に独立したシステム（別デプロイ・別データベース）**として切り出したものである。本文中に残る「(v7.5)」「(v9.0)」「(v10.0)」等の版数注記は、前身プロジェクトでその機能・決定が導入された時期を示す**歴史的な記録**であり、SkillsStampConnect 自体のバージョンではない。ADR 番号（ADR-001〜031）も前身プロジェクトの通し番号をそのまま引き継いでおり、設計判断の経緯を保存する目的で振り直していない。SkillsStampConnect 自体で行った設計変更（下記 v11.0）には新規 ADR 番号（ADR-032〜）を付与する。

### SkillsStampConnect v11.0 変更点サマリー（QRコード外部公開の導入）

学生プロフィールをQRコード・ステッカー・チャームに印刷して外部（就職説明会の企業担当者・オンラインイベント参加者等）に見せたいという要望を受け、以下の変更を行った。

| 区分 | 変更内容 |
|------|---------|
| **公開同意モデルの見直し** | `is_visible`（実績単位）は「完全非公開」と「**ログイン済みの全登録者**（学生・教員・企業担当者を問わずログインしていれば見える）への公開」の二値であることを明確化した。従来「学内公開」と呼んでいたが、ログイン済みであれば学外の卒業生・社会人・オンライン参加者も含まれるため、この呼称は実態と合わないと判断し、呼称・説明文を改めた |
| **`kiosk_public` を `external_public` に置き換え** | `student_profiles.kiosk_public`（就職説明会タブレット限定公開）を廃止し、`student_profiles.external_public`（ログイン不要・不特定多数への外部公開）に置き換えた（→ ADR-032） |
| **キオスクトークン方式の廃止** | `kiosk_tokens` テーブル・`X-Kiosk-Token` ヘッダー認証・`POST/DELETE /api/kiosk-tokens`・`GET /api/kiosk/*`・`KioskTokenEditor`・`kioskFetch.ts` をすべて廃止した |
| **固定URLによるプロフィール公開** | `GET /api/public/profile/:loginId`（認証不要）を新設。`login_id` をそのままパス変数に使い、**印刷後も恒久的に不変の固定URL**とする。`external_public=true` かつ `is_visible=true` の実績のみを返す（→ ADR-032） |
| **トークン方式は不採用** | 当初はランダムな `public_token` を発行する案を検討したが、「QRコード・ステッカー・チャームへの物理印刷」という運用制約上、URLは恒久的に固定でなければならず、再発行を前提とするトークン方式とは相容れないため不採用とした（→ ADR-032） |

このセクション以下（v10.0 以前）は前身プロジェクトの歴史的な変更履歴であり、キオスクモードに関する記述は SkillsStampConnect v11.0 時点ではすでに廃止されていることに留意する。

<details>
<summary>前身プロジェクト（sticker-gallery）v7.0〜v10.0 の変更履歴（参考情報・折りたたみ）</summary>

### v10.0 変更点サマリー

| 区分 | 変更内容 |
|------|---------|
| **スコープ変更** | §1.3 で明示していた「学生認証・個人ポートフォリオの永続化」のスコープ外指定を撤回。教員・学生・企業の三者から「このスタンプを持つ他の学生を知りたい」という要望を受け、学生アカウント・実績記録・公開プロフィールを本バージョンで導入する（→ Appendix E: ADR-024） |
| **データモデル** | `users` テーブルを拡張（`login_id`・`affiliation`・`position`・`graduation_year`・`contact_email`・`email_public`・`must_change_password`・`status`・`role` に `'student'` を追加）。新設：`student_profiles`（アバター・SNS・自由記述）・`student_achievements`（学生ごとの取得スタンプ記録）・`kiosk_tokens`（就職説明会モード用トークン。**SkillsStampConnect v11.0 で廃止、下記参照**） |
| **学生アカウント発行** | 職員による CSV 一括インポート方式を採用（学生の自己登録エンドポイントは設けない）。`login_id` はインポート時にシステムが自動発行し、仮パスワードと共に一度だけ画面表示する（→ ADR-027・ADR-028） |
| **表示名** | 実名ではなく学生本人が設定する表示名を公開情報として扱う。実名はシステムに一切保存しない（→ ADR-025） |
| **公開同意の二層化** | 学内公開（`is_visible`：スタンプ単位）とキオスク公開（`kiosk_public`：プロフィール単位）を分離。就職説明会での公開範囲を学内公開と別に学生が選べる（→ ADR-026・ADR-029。**SkillsStampConnect v11.0 で `kiosk_public` を `external_public` に置き換え、下記参照**） |
| **連絡先メール公開** | `contact_email` は `email_public` チェックボックスがオンの場合のみプロフィールに表示（→ ADR-030） |
| **実績記録の権限** | `student_achievements` の記録操作は 👑 admin 限定ではなく 🔑（職員全員）に開放。物理スタンプの配布が個々の教員の授業単位で行われる実態に合わせた（→ ADR-031） |
| **新規画面** | `StudentDirectory`（公開学生一覧）・`StudentProfilePage`（学生プロフィール）・`MyProfileEditor`（本人編集）・管理画面に `StudentBulkImportEditor`・`StudentAccountEditor`・`AchievementEditor`・`KioskTokenEditor` を追加 |
| **新規 API** | `POST /api/students/import`・`GET/PUT /api/students/:id`・`GET/PUT /api/my/profile`・`GET /api/my/achievements`・`GET /api/stickers/:id/holders`・`GET /api/students`・`POST/DELETE /api/kiosk-tokens`・`GET /api/kiosk/*`（トークン認証） |
| **キオスクモード** | 企業担当者向けに、就職説明会会場のタブレットでログイン不要かつトークン限定公開の閲覧モードを新設。個別の企業アカウントは発行しない | 

### v9.0 変更点サマリー

| 区分 | 変更内容 |
|------|---------|
| **ファイルアップロード** | `multer ^1.x`（脆弱性あり）を廃止。`@fastify/busboy ^3.x` を直接使用する方式に変更（CVE: GHSA-wm7h-9275-46v2 対応） |
| **Vite 設定** | `vite.config.ts` の `root: 'client'` 使用時の起動スクリプトを修正。`"vite client"` → `"vite"` に変更。`postcss.config.js` / `tailwind.config.ts` を `client/` 内にも配置 |
| **環境変数** | `VITE_PORT`・`SERVER_HOST`・`VITE_LATEST_CURRICULUM_YEAR` を `.env` で管理できるよう追加 |
| **authFetch** | `FormData` 送信時に `Content-Type: application/json` を上書きしないよう修正（画像アップロード不具合を解消） |
| **CourseRow** | 授業内容メモを 1 行テキスト（`Input`）から複数行対応（`Textarea`）に変更 |
| **Navbar** | モバイル（320px）対応。`container mx-auto` 廃止・`flex-wrap` 採用 |
| **ファイル配置** | `globals.css` → `client/src/globals.css`、`utils.ts` → `client/src/lib/utils.ts` の正しい配置を明記 |
| **セットアップ手順** | shadcn/ui 初期化（`npx shadcn@latest init`）とコンポーネント追加コマンドを手順に追加 |

### v8.0 変更点サマリー

| 区分 | 変更内容 |
|------|---------|
| **言語** | JavaScript（JSX）→ **TypeScript（TSX）** に全面移行 |
| **CSS フレームワーク** | Bootstrap 5.3 + react-bootstrap → **Tailwind CSS 3.4 + shadcn/ui** に変更 |
| **UI コンポーネント** | react-bootstrap コンポーネント → **shadcn/ui コンポーネント**（Radix UI ベース）に変更 |
| **動的カラー** | inline style `style={{ background: color }}` → Tailwind 任意値 + 必要箇所のみ inline style 併用に変更 |
| **スタイル管理** | `style.css`（最小限）→ `globals.css`（Tailwind directives + CSS 変数テーマ）に変更 |
| **プロジェクト設定** | `vite.config.js` → `vite.config.ts`。`tsconfig.json` / `components.json` / `tailwind.config.ts` を追加 |
| **バックエンド** | **変更なし**（server.js / lib/ / routes/ / db/ はすべて v7.5 のまま） |

### v7.5 変更点サマリー

| 区分 | 変更内容 |
|------|---------|
| **データモデル** | `stickers.category_id` を廃止。`sticker_categories` 中間テーブルを新設し**多対多**に変更 |
| **主カテゴリー** | `stickers.primary_category_id` を追加。スタンプ ID の AREA・表示色の基準カテゴリーを定義 |
| **API** | `GET /api/stickers` に `categories[]`・`primaryCategoryId` を追加。`POST/PUT` も同様に変更 |
| **ギャラリー** | スタンプチップを全所属カテゴリーのカードに表示。主カテゴリー以外は「関連」として薄く表示 |
| **管理 UI** | `StickerEditor` のカテゴリー選択を `Form.Select`（単一）からチェックボックス群＋主指定に変更 |

### v7.4 変更点サマリー

| 区分 | 変更内容 |
|------|---------|
| **セキュリティ** | **XSS・インジェクション・パストラバーサル等のセキュリティ対策を必須仕様として定義**。§3.x にセキュリティアーキテクチャ節を新設 |
| **依存ライブラリ** | `helmet`（HTTP セキュリティヘッダー）・`express-rate-limit`（レート制限）を追加 |
| **デプロイメント** | **Docker Compose を廃止**。Node.js 24 直接起動に変更。§11 を全面書き直し |
| **ファイルシステム** | ファイルアップロードのパストラバーサル対策・Magic bytes 検証を仕様に追加 |
| **入力バリデーション** | 全 API エンドポイントの入力検証仕様を追加 |
| **CORS** | 環境別 CORS 設定を明示 |

### v7.3 変更点サマリー

| 区分 | 変更内容 |
|------|---------|
| **認証方式** | HTTP Basic 認証（単一共有パスワード）を廃止。**JWT（HS256）+ per-user ログイン**に変更 |
| **データモデル** | `users` テーブルを新設。`stickers` に `created_by` 列を追加 |
| **ロール設計** | `admin`（全操作）/ `user`（自分のスタンプのみ編集・削除）の 2 ロールを定義 |
| **API 認可** | エンドポイントごとに `authenticate` / `requireAdmin` / `requireOwnerOrAdmin` ミドルウェアを適用 |
| **新規 API** | `POST /api/auth/login`・`/api/users` CRUD を追加 |
| **フロントエンド** | `UserEditor` コンポーネントを追加。AdminPanel に「👥 ユーザー管理」タブ（admin のみ表示）を追加 |
| **環境変数** | `ADMIN_USERNAME`・`ADMIN_PASSWORD` を廃止。`JWT_SECRET`・`INITIAL_ADMIN_*` に変更 |
| **依存ライブラリ** | 追加なし。パスワードハッシュ・JWT 署名ともに `node:crypto`（Node.js 24 組み込み）で実装 |

### v7.2 変更点サマリー

| 区分 | 変更内容 |
|------|---------|
| **ストレージ** | **S3 互換ストレージ（MinIO / AWS SDK）を廃止**。ローカルファイルシステム（`uploads/` ディレクトリ）に変更 |
| **依存ライブラリ** | `@aws-sdk/client-s3`・`@aws-sdk/s3-request-presigner` を削除。`multer` を追加 |
| **アップロード API** | Presigned PUT URL 方式を廃止。`POST /api/upload` への multipart 直接送信に変更 |
| **Docker Compose** | `minio`・`mc-init` サービスを削除。`uploads_data` ボリュームに置き換え |
| **環境変数** | `S3_*` 変数をすべて削除。`UPLOAD_DIR` のみ追加 |
| **画像配信** | `S3_PUBLIC_BASE` を廃止。Express `express.static('/uploads')` による同一オリジン配信に変更 |

### v7.1 変更点サマリー

| 区分 | 変更内容 |
|------|---------|
| **フロントエンド構成** | **単一 App.jsx から `components/` 分割構成へ変更**。責務境界・import 方向・命名規則を定義 |

### v7.0 変更点サマリー

| 区分 | 変更内容 |
|------|---------|
| アーキテクチャ | フロントエンドを単一 JSX ファイル（App.jsx）に統合（→ v7.1 で分割構成に変更） |
| データモデル | `stickers.type` と `courses.type` の **冗長性を整理**。スタンプ側 `type` を正とし、courses.type は省略可に変更 |
| API | Presigned URL フローを **図解で明確化**。DELETE /api/image/:key の keyエンコード仕様を追記 |
| 認証 | Basic 認証の **ブラウザ動作（保存ダイアログ）** に関する注意事項を追記 |
| 環境 | `development` での MinIO 起動を **オプション化**（モック画像URLで開発可能な方針を追記） |
| 将来拡張 | 学生ポートフォリオビュー・QRコード連携の **インターフェース設計** を具体化 |

</details>

---

## 目次

1. システム概要
2. ユースケース
3. アーキテクチャ
4. データモデル
5. 機能仕様
6. ストレージ仕様
7. API仕様
8. UI／画面仕様
9. 管理画面仕様
10. 環境設定
11. デプロイメント
12. 拡張・将来対応
- Appendix A：定数一覧
- Appendix B：型定義
- Appendix C：責務分担表
- Appendix D：前身プロジェクトの設計判断ログ（v6.0→v7.0）

---

## 1. システム概要

### 1.1 目的

専門職大学における **物理スタンプ型マイクロクレデンシャルシステム** の Web 版ギャラリーおよび管理ツール。物理スタンプと 1:1 で対応する形で、学生のスキル可視化・言語化を支援する。

Web ギャラリーは物理スタンプのリファレンスとして機能し、以下の文脈で使われる。

> **なぜ物理スタンプと Web を並存させるか**：物理スタンプは学生が手元で積み上げられる有形の成果物であり、「所有している」実感を持てる。Web ギャラリーは物理スタンプに説明を付与するリファレンスとして機能し、採用担当者や学生自身が文脈を確認する場所として使う。物理とデジタルを代替関係ではなく補完関係として設計することで、Web ギャラリーが使えない環境（企業ブース・紙の履歴書等）でも物理スタンプが単独で意味を持ち続ける（→ Appendix E: ADR-001）。

- **学生**：履修授業の選択 / 就職活動エントリーシートの準備 / 卒業後の自己 PR 参照
- **企業（採用担当者）**：学内就職説明会ブースで学生のスキルを把握する
- **教員・管理者**：カテゴリー・スタンプ・授業情報の登録と更新

### 1.2 設計原則

| 原則 | 内容 | 根拠 |
|------|------|------|
| 2層構造 | カテゴリーステッカー（大）＞ 授業用スタンプ（小） | 就職説明会ブース掲示の文脈から発生した自然な階層 |
| 文脈的可読性 | スキルを学習分類軸ではなく「採用文脈」で整理 | 採用担当者が即座に判断できることを優先 |
| SMEアクセシビリティ | 中小企業がゼロコストで参照できる Web 公開を前提 | デジタルバッジシステムが持つ参入障壁を除去 |
| ストレージ責務分離 | メタデータは SQLite、バイナリ（画像）は S3 互換 | DB の肥大化回避・配信効率の確保 |
| 物理スタンプとの対応 | Web 上の情報は物理スタンプのリファレンスとして機能 | 物理とデジタルの冗長性を意図的に保持 |

### 1.3 スコープ外（明示）

以下は本バージョンのスコープ外とし、§12 で将来拡張として定義する。

- 企業登録・マッチング機能（企業が個別アカウントを持つマッチング機能。学生プロフィールの限定公開閲覧自体は、v10.0ではキオスクモード、v11.0では学生本人のQRコード外部公開（`external_public`）としてスコープ内。→ ADR-032）
- LMS（Moodle 等）との連携
- QRコードの動的生成（静的 URL の利用を推奨）
- 学生同士・企業と学生間のシステム内メッセージング（DM・チャット）機能。連絡は学生が任意で公開する外部 SNS リンク（X・LinkedIn）を経由する設計とし、大学がモデレーション責任を負う会話基盤は持たない

> **前身プロジェクトでの方針転換（歴史的経緯）**：sticker-gallery v9.0 まで「学生認証・個人ポートフォリオの永続化」をスコープ外としていたが、教員・学生・企業の三者から「このスタンプを持つ他の学生を知りたい」という要望を受け、v10.0 で学生アカウント・実績記録・公開プロフィールを導入した。SkillsStampConnect はこの v10.0 の設計をそのまま引き継いでいる。要望を素朴に「学内SNS」として実装するのではなく、①学生本人の公開同意（is_visible / kiosk_public）を前提とする、②連絡手段は学生が任意で開示する外部 SNS リンクに限定しシステム内チャットは持たない、③実名は保存せず本人設定の表示名のみを公開する、という制約を設けることで、個人情報保護・モデレーション責任の観点から安全な範囲にとどめている（→ Appendix E: ADR-024）。

---

## 2. ユースケース

### UC-1：学生が履修授業を探す

```
前提条件：ギャラリーが公開されている
1. ギャラリーを開く（認証不要）
2. カテゴリーステッカーを一覧で見る
3. 興味のあるカテゴリー（例：Webアプリ開発）のヘッダーをクリック
4. カテゴリー詳細モーダルで含まれるスタンプ一覧を確認
5. 各スタンプをクリックして関連授業・カリキュラム年度・内容を確認
6. 履修計画の参考にする
成功条件：スタンプに紐付く授業名・内容・年度が確認できる
```

### UC-2：就職説明会（学内）で企業がブースを案内する

```
前提条件：企業ブースに物理カテゴリーステッカーが貼付されている
1. 学生がブースのステッカーを見て URL または QR コードでギャラリーを開く
2. 採用担当者向けメッセージでそのカテゴリーが示す経験を把握する
3. 学生が自分の持つスタンプとの一致を確認する
成功条件：企業担当者と学生が共通の語彙（カテゴリー名）で対話できる
```

### UC-3：学生が卒業後に自己 PR で参照する

```
前提条件：学生が物理スタンプの ID を持っている
1. ギャラリーを開く、または検索フィールドにスタンプ ID を入力
2. 自分の持つスタンプの Can-Do 記述・習得スキルを確認
3. エントリーシート・面接でスキルを具体的に言語化する
成功条件：スタンプ ID から Can-Do 記述と習得スキルタグが参照できる
```

### UC-4：教員がスタンプ・授業を登録・更新する

```
前提条件：ADMIN_USERNAME / ADMIN_PASSWORD を知っている
1. 管理画面を開き、ログインする（HTTP Basic 認証）
2. カテゴリー管理タブでカテゴリーを新規作成または編集
3. スタンプ管理タブでスタンプを新規作成・カテゴリーに紐付け
4. 画像をアップロード（Presigned URL 経由で S3 互換ストレージへ直接送信）
5. 授業情報（年度ごとの内容）を登録
6. ギャラリーに即時反映されることを確認
成功条件：ギャラリーにカテゴリー・スタンプ・授業が表示される
```

### UC-5：カリキュラム改訂時に旧年度情報を保持する

```
前提条件：スタンプに既存年度の courses が存在する
1. 教員が新年度の授業情報を同一スタンプに追加（別 curriculum_year）
2. 旧年度の courses は削除しない（アーカイブとして保持）
3. ギャラリーで最新年度バッジ（★）と旧年度バッジが視覚的に区別される
成功条件：同一 sticker_id に複数年度の courses が共存し、それぞれ参照できる
```

### UC-6：学生が初回ログインし、プロフィールを公開設定する（v10.0 新設）

```
前提条件：職員が CSV 一括インポートで学生アカウントを作成済み。login_id・仮パスワードを本人が受け取っている
1. LoginScreen で login_id・仮パスワードでログインする
2. must_change_password=true のため、パスワード変更画面に強制遷移する
3. 新しいパスワードと表示名（実名以外可）を設定する
4. MyProfileEditor でアバター・SNSリンク（X・LinkedIn）・自由入力スキル・やりたいこと・一言を設定する
5. 自分の取得済みスタンプ一覧（実績記録）を確認し、スタンプごとに is_visible（ログイン済み登録者への公開）を切り替える
6. 必要であれば、プロフィール全体の external_public（QRコード等によるログイン不要の外部公開）をONにする
成功条件：学生が希望する範囲だけを他の登録者・教職員・（同意すれば）外部の第三者に公開できる
```

### UC-7：学生・教員がスタンプ保有者を探す（v10.0 新設）

```
前提条件：1名以上の学生が is_visible=true で実績を公開している
1. ギャラビューでスタンプ（SkillChip）をクリックし StickerModal を開く
2. 「取得学生一覧」セクションで is_visible=true の学生の表示名一覧を見る
3. 表示名をクリックして StudentProfilePage に遷移する
4. アバター・一言・SNSリンク・公開スタンプ一覧・自由入力欄を確認する
5. （任意）Navbar の「学生一覧」から StudentDirectory を開き、スタンプを経由せず学生起点で探す
成功条件：公開に同意した学生の情報だけが第三者に見える
```

### UC-8：企業担当者が就職説明会会場・オンラインイベントで学生を探す（v10.0 新設、v11.0 でQRコード経由に変更）

```
前提条件：学生が external_public=true に設定し、プロフィールの固定URL（/api/public/profile/{loginId}）を
          QRコード化してステッカーやチャームに印刷済み
1. 企業担当者が会場のタブレット、もしくはオンラインイベントの画面で学生のQRコードを読み取る／URLを開く
   （ログイン不要）
2. external_public=true の学生に限り、is_visible=true の実績のみを含むプロフィールが表示される
3. 学生のプロフィール（アバター・SNS・自己紹介）を見て、必要ならSNS経由で本人に連絡する
成功条件：企業アカウントもイベント単位のトークン発行も不要に、QRコードを配布された相手だけが
         学生本人の同意した範囲の情報を閲覧できる
備考：QRコード自体は印刷後も恒久的に同一URLを指す。公開・非公開は external_public のON/OFFのみで
     即座に切り替わる（external_public=false にすると同じURL・QRのままアクセス不可になる）
```

---

## 3. アーキテクチャ

### 3.1 技術スタック

| 層 | 技術 | バージョン | 備考 |
|----|------|----------|------|
| ランタイム | Node.js | 24 LTS | `node:sqlite` 組み込みモジュールを使用 |
| Web フレームワーク | Express | 4.x | REST API サーバー |
| データベース | SQLite（`node:sqlite`） | Node.js 24 組み込み | npm パッケージ不要。メタデータ専用 |
| 画像ストレージ | ローカルファイルシステム | Node.js `fs`（組み込み） | `uploads/` ディレクトリに保存。Express で静的配信 |
| ファイル受信 | @fastify/busboy | 3.x | multipart/form-data の受け取り専用。multer v1.x の脆弱性（GHSA-wm7h-9275-46v2）対応で v9.0 より変更 |
| 認証 | JWT（HS256） | `node:crypto`（組み込み） | 外部ライブラリ不要。署名・検証ともに組み込みで実装 |
| パスワードハッシュ | scrypt | `node:crypto`（組み込み） | bcrypt 相当のセキュリティ。npm パッケージ不要 |
| セキュリティヘッダー | helmet | 8.x | XSS・クリックジャッキング等の HTTP ヘッダーを一括設定 |
| レート制限 | express-rate-limit | 7.x | ブルートフォース対策。ログイン API に適用 |
| UI フレームワーク | React + Vite | React 18 / Vite 5 | TSX |
| CSS フレームワーク | Tailwind CSS | 3.4.x | ユーティリティファーストCSS |
| スタイル管理 | `globals.css` | — | Tailwind directives + CSS 変数テーマ。動的テーマカラーのみ inline style |
| フォント | Noto Sans JP | — | Google Fonts から動的ロード |
| QRコード生成 | qrcode.react | 4.x | 学生の外部公開プロフィールURLをQRコード化して表示。外部API通信なし、ブラウザ内でSVG/Canvasにレンダリング |

> **なぜ SQLite か**：学内ツール規模（教員数名・学生数百名）では PostgreSQL 等の別プロセス DB を立てるオーバーヘッドが不要。SQLite はファイル 1 つで完結し、バックアップが `cp` コマンドで済む。将来的に負荷が増大した場合に PostgreSQL へ移行する際も、SQL 構文の差分は軽微（→ ADR-002）。

> **なぜ `node:sqlite` の同期 API（DatabaseSync）か**：非同期 DB クライアント（`better-sqlite3` 等）は Worker Thread を使うことで Express のイベントループをブロックしないが、学内ツール規模では同時接続数が少なく問題にならない。同期 API はコードがシンプルになり、トランザクションの書き方も直感的（→ ADR-003）。

> **なぜ shadcn/ui か**：Web UI のモダン化と安定性向上が採用理由。Radix UI ベースのプリミティブにより Dialog 等の動作が安定し、v7.x で必要だったモーダルの手動実装が不要になる。動的テーマカラー（管理者が設定する HEX 値）は Tailwind JIT が機能しないため、ヘッダー背景等は引き続き inline style を使用する（→ ADR-021）。

> **なぜ qrcode.react か**：QRコード生成は選択肢として (1) npmライブラリでのオフライン生成、(2) 外部APIサービスへの都度リクエスト、(3) 自前実装、の3つがあったが、本プロジェクトが一貫して採用してきた「実行時の外部サービス依存を避け自己完結させる」方針（`@fastify/busboy` 直接使用、`node:crypto` による JWT・scrypt 自前実装等）に合わせ、(1) を採用。React 宣言的コンポーネント（`<QRCodeSVG value={url} />`）として組み込め、既存の TSX コードベースと親和性が高い（→ ADR-033）。

> **ESM 統一**：サーバーサイド・クライアントサイド双方で `import/export` を使用。`package.json` に `"type": "module"` を設定する。

### 3.2 画像ストレージの設計

画像ファイルは `UPLOAD_DIR`（デフォルト: `./uploads`）以下に保存し、Express の `express.static` で `/uploads` パスに配信する。

```
uploads/
  ├── categories/    ← カテゴリー画像
  └── stickers/      ← スタンプ画像
```

> **なぜ S3 互換ストレージ（MinIO 等）をやめてローカルファイルシステムにするか**：学内ツール規模では MinIO コンテナの維持・バケット初期化・AWS SDK の設定コストが効果に見合わない。Node.js 24 の `fs` モジュールと Express の `express.static` だけで画像の保存・配信が完結し、依存ライブラリが減り構成がシンプルになる。SQLite と同様にファイルシステム上で管理するため、`tar` コマンドで一括バックアップできる（→ Appendix E: ADR-015）。

### 3.3 セキュリティアーキテクチャ

学内公開 Web アプリケーションとして、以下のセキュリティ対策を**実装必須**とする。

#### 3.3.1 HTTP セキュリティヘッダー（helmet）

`helmet` ミドルウェアを `server.js` の最初に適用する。

```javascript
import helmet from 'helmet';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc:  ["'self'"],
      scriptSrc:   ["'self'"],           // inline script を禁止
      styleSrc:    ["'self'", "https://fonts.googleapis.com", "'unsafe-inline'"],
      fontSrc:     ["'self'", "https://fonts.gstatic.com"],
      imgSrc:      ["'self'", "data:"],  // /uploads/ の画像は same-origin
      connectSrc:  ["'self'"],
      frameSrc:    ["'none'"],
      objectSrc:   ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,      // 画像配信との兼ね合い
}));
```

設定されるヘッダーと効果：

| ヘッダー | 効果 |
|---------|------|
| `Content-Security-Policy` | inline script 禁止でXSS の影響を最小化 |
| `X-Content-Type-Options: nosniff` | MIME スニッフィング攻撃を防ぐ |
| `X-Frame-Options: SAMEORIGIN` | クリックジャッキングを防ぐ |
| `Referrer-Policy: no-referrer` | 外部サイトへのリファラー漏洩を防ぐ |
| `Strict-Transport-Security` | HTTPS 強制（production のみ有効） |

> **なぜ helmet か**：HTTP セキュリティヘッダーを個別に設定するとミスが生じやすい。helmet は Express のデファクトスタンダードであり、小さな依存で OWASP 推奨ヘッダーを一括設定できる（→ Appendix E: ADR-017）。

#### 3.3.2 XSS 対策

| 対策層 | 内容 |
|--------|------|
| **フロントエンド（React）** | TSX はデフォルトで HTML エスケープ済み。`dangerouslySetInnerHTML` は使用禁止 |
| **バックエンド（JSON API）** | Express のレスポンスは JSON のみ。HTML を直接返すエンドポイントは存在しない |
| **CSP ヘッダー** | inline script を禁止し、仮にスクリプトが注入されても実行をブロック |
| **DB 書き込み** | Prepared Statements のみ使用（後述）。文字列操作によるエスケープは不要 |

#### 3.3.3 SQL インジェクション対策

node:sqlite の Prepared Statements（`db.prepare(sql).run(...params)`）を**必ず**使用する。文字列結合によるクエリ構築を禁止する。

```javascript
// ✅ 正しい（Prepared Statement）
db.prepare('SELECT * FROM stickers WHERE category_id = ?').all(categoryId);

// ❌ 禁止（文字列結合）
db.exec(`SELECT * FROM stickers WHERE category_id = '${categoryId}'`);
```

> node:sqlite の `exec()` はパラメータを受け取らないため、ユーザー入力を含むクエリには**使用禁止**。`prepare().run()` / `prepare().all()` / `prepare().get()` のみ使用する。

#### 3.3.4 パストラバーサル対策（ファイルアップロード・削除）

**アップロード時**：multer がファイルを一時パスに保存後、`lib/imageStore.js` が `randomUUID()` でファイル名を生成する。ユーザーが指定したファイル名は使用しない。

**削除時**：`DELETE /api/image/:key(*)` で受け取った key が `UPLOAD_DIR` 外を指さないことを検証する。

```javascript
// lib/imageStore.js
import { resolve } from 'node:path';

export async function deleteImage(key) {
  if (!key) return;
  const UPLOAD_DIR = resolve(process.env.UPLOAD_DIR ?? './uploads');
  const target = resolve(UPLOAD_DIR, key);

  // UPLOAD_DIR 外へのアクセスを禁止（パストラバーサル防止）
  if (!target.startsWith(UPLOAD_DIR + path.sep)) {
    throw new Error('不正なファイルパスです');
  }
  try { await unlink(target); } catch { /* 存在しない場合は無視 */ }
}
```

#### 3.3.5 ファイルアップロード検証

multer の設定と `lib/imageStore.js` で以下を強制する。

| 検証項目 | 実装 |
|---------|------|
| ファイルサイズ上限 | multer `limits.fileSize: 5 * 1024 * 1024`（5MB） |
| MIME タイプ | multer `fileFilter` で `image/jpeg`・`image/png`・`image/webp`・`image/gif` のみ許可 |
| ファイル名 | `randomUUID() + ext` に強制置換（ユーザー指定名は使用しない） |
| 拡張子 | MIME タイプから決定するホワイトリストのみ（§6.2 参照） |

> MIME タイプはブラウザが送信するため偽装可能。将来的に Magic bytes（ファイル先頭バイト）の検証を追加することでより堅牢になる（現バージョンは MIME ホワイトリストのみ）。

#### 3.3.6 レート制限（express-rate-limit）

ログイン API にブルートフォース対策を適用する。

```javascript
import rateLimit from 'express-rate-limit';

// POST /api/auth/login にのみ適用
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15分
  max: 10,                    // 15分間に最大10回
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'ログイン試行回数が上限を超えました。15分後に再試行してください。' },
});
```

> **なぜ login API のみか**：GET エンドポイント（ギャラリー閲覧）はレート制限を設けず、学内で多人数が同時アクセスする状況に対応する。管理 API（POST/PUT/DELETE）は JWT 認証があるため、ログイン成功後のブルートフォースは意味をなさない。

#### 3.3.7 入力バリデーション

全 POST/PUT エンドポイントで必須フィールドと値の範囲を検証する。

| エンドポイント | 必須フィールド | 値の検証 |
|-------------|-------------|---------|
| POST /api/categories | `id`, `name` | `id`: 英数字・ハイフンのみ（50文字以下）|
| POST /api/stickers | `id`, `categoryId`, `name`, `type` | `type`: `practical`\|`lecture`、`id`: スタンプID形式 |
| POST /api/users | `username`, `password`, `role` | `role`: `admin`\|`user`、`username`: 3〜50文字 |
| POST /api/auth/login | `username`, `password` | 文字列であること |

バリデーション違反時は `400 { "error": "..." }` を返す。エラーメッセージに内部情報（DB エラー等）を含めない。

#### 3.3.8 CORS 設定

```javascript
// server.js
const ALLOWED_ORIGINS = {
  development: ['http://localhost:5173'],  // Vite dev server
  staging:     [],                         // 同一オリジン（Nginx なし）
  production:  [],                         // 同一オリジン（Nginx 経由）
};

const origins = ALLOWED_ORIGINS[process.env.APP_ENV] ?? [];

if (origins.length > 0) {
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
    }
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
  });
}
```

> development 環境では Vite dev server（port 5173）とExpress（port 3000）が別オリジンになるため CORS 許可が必要。staging / production では Nginx が同一ドメインで配信するため CORS 設定不要。

#### 3.3.9 エラーレスポンスの情報漏洩防止

```javascript
// server.js - グローバルエラーハンドラー
app.use((err, req, res, next) => {
  // スタックトレースをログに出力（サーバーサイドのみ）
  console.error(err);

  // クライアントには内部情報を含めない
  const isDev = process.env.APP_ENV === 'development';
  res.status(err.status ?? 500).json({
    error: isDev ? err.message : 'サーバーエラーが発生しました',
  });
});
```

> production / staging では `err.message` をクライアントに返さない。DB エラー・ファイルパス等の内部情報が漏洩することを防ぐ。

### 3.4 システム構成図（Node.js 直接起動）

```
ブラウザ（React SPA）
   │
   ├─ GET  /api/categories        ─┐
   ├─ GET  /api/stickers           ├──→  Express (server.js)
   ├─ POST/PUT/DELETE /api/*  ─────┘         │
   │   ↑ Bearer JWT ヘッダー必須             ├─ node:sqlite ──→ stickers.db
   │                                         │
   ├─ POST /api/upload ────────────────────→ ├─ multer ──→ uploads/{prefix}/{uuid}.{ext}
   │   multipart/form-data                   │
   │   ← { key, url }                        └─ express.static('./uploads')
   │                                                   ↑
   └─ GET  /uploads/{prefix}/{uuid}.{ext} ────────────┘
      （画像配信・認証不要）
```

**アップロードフロー詳細**

```
1. ブラウザ  →  POST /api/upload（Authorization ヘッダー付き）
               Body: multipart/form-data { file: File, prefix: "stickers"|"categories" }
2. Express  →  multer でファイルを受け取り
               uploads/{prefix}/{uuid}.{ext} に保存
3. Express  →  ブラウザに { key, url } を返却
               key: "stickers/uuid.png"
               url: "/uploads/stickers/uuid.png"
4. ブラウザ  →  POST/PUT /api/stickers に { imageKey: key } を含めて送信
5. Express  →  SQLite の image_key 列に key を保存
```

> **v7.1 からの変更点**：Presigned URL 方式（2 ステップ: GET /api/presign → PUT to S3）を廃止し、`POST /api/upload` への 1 ステップのマルチパート送信に変更。フローが単純になりフロントエンドの実装コードも削減される。

### 3.4 コンポーネント構成（フロントエンド）

**v7.1 方針：ファイル分割構成を採用し、責務境界を明確にする**

#### 3.4.1 ファイル→コンポーネント対応表

| ファイル | コンポーネント | 責務 |
|---------|-------------|------|
| `App.tsx` | `<App>` | データフェッチ・状態管理・ビュールーティング・モーダル制御 |
| `components/Navbar.tsx` | `<Navbar>` | sticky-top ナビ。ビュー切り替え・検索フォーム・ログアウト・ログインユーザー表示 |
| `components/common/StickerIcon.tsx` | `<StickerIcon>` | 丸アイコン（画像 or Emoji フォールバック） |
| `components/common/YearBadge.tsx` | `<YearBadge>` | カリキュラム年度バッジ（最新★ / 旧年度） |
| `components/gallery/CategoryCard.tsx` | `<CategoryCard>` | カテゴリーヘッダー＋配下スタンプチップ一覧 |
| `components/gallery/SkillChip.tsx` | `<SkillChip>` | スタンプ 1 件のカード型ボタン |
| `components/gallery/CategoryModal.tsx` | `<CategoryModal>` | カテゴリー詳細・採用担当者向けメッセージ |
| `components/gallery/StickerModal.tsx` | `<StickerModal>` | スタンプ詳細・授業情報・年度グループ |
| `components/admin/LoginScreen.tsx` | `<LoginScreen>` | ユーザー名・パスワードフォーム → JWT 取得 |
| `components/admin/AdminPanel.tsx` | `<AdminPanel>` | 左ペイン一覧＋右ペインエディタの 2 ペインレイアウト。CRUD ハンドラと API 呼び出しを集約 |
| `components/admin/CategoryEditor.tsx` | `<CategoryEditor>` | カテゴリーフォーム CRUD（admin のみ利用可） |
| `components/admin/StickerEditor.tsx` | `<StickerEditor>` | スタンプフォーム CRUD＋授業リスト管理 |
| `components/admin/CourseRow.tsx` | `<CourseRow>` | 授業行フォーム（動的追加・削除の 1 行分） |
| `components/admin/UserEditor.tsx` | `<UserEditor>` | ユーザーフォーム CRUD（admin のみ利用可） |
| `components/gallery/StudentDirectory.tsx` | `<StudentDirectory>`（v10.0） | 公開学生一覧（is_visible な実績を1件以上持つ学生のカードグリッド） |
| `components/gallery/StudentProfilePage.tsx` | `<StudentProfilePage>`（v10.0） | アバター・表示名・一言・SNSリンク・公開スタンプ一覧・自由入力欄の表示 |
| `components/student/MyProfileEditor.tsx` | `<MyProfileEditor>`（v10.0） | 学生本人によるプロフィール編集（アバター・SNS・自由記述・email_public） |
| `components/student/MyAchievements.tsx` | `<MyAchievements>`（v10.0） | 学生本人の取得済みスタンプ一覧とスタンプ単位の is_visible 切り替え |
| `components/student/PasswordChangeScreen.tsx` | `<PasswordChangeScreen>`（v10.0） | must_change_password=true の学生を強制遷移させるパスワード変更フォーム |
| `components/admin/StudentBulkImportEditor.tsx` | `<StudentBulkImportEditor>`（v10.0） | CSV アップロード＋作成結果（login_id・仮パスワード）の一度限りの表示 |
| `components/admin/StudentAccountEditor.tsx` | `<StudentAccountEditor>`（v10.0） | 学生アカウント一覧・表示名強制変更・停止／再有効化 |
| `components/admin/AchievementEditor.tsx` | `<AchievementEditor>`（v10.0） | 学生×スタンプの実績記録（🔑 職員全員が利用可） |
| ~~`components/admin/KioskTokenEditor.tsx`~~ | ~~`<KioskTokenEditor>`（v10.0）~~ | **v11.0 で廃止**。QRコード外部公開（`external_public`、`MyProfileEditor`）に統合（→ ADR-032） |

#### 3.4.2 コンポーネントツリー

```
<App>                          App.tsx
│  状態: cats, stks, view, search
│  状態: catModal, stkModal, currentUser（JWT デコード結果）
│
├── <Navbar>                   components/Navbar.tsx
│     props: view, search, currentUser, onChangeView, onSearch, onLogout
│     ログインユーザー名・ロールバッジを右端に表示
│
├── [gallery view]
│   ├── <CategoryCard> × N     components/gallery/CategoryCard.tsx
│   │     └── <SkillChip> × N
│   ├── <CategoryModal>
│   └── <StickerModal>
│
└── [admin view]
    ├── <LoginScreen>          components/admin/LoginScreen.tsx
    │     props: onLogin(token, user)
    │
    └── <AdminPanel>           components/admin/AdminPanel.tsx
          props: cats, stks, users, currentUser, onUpdate*
          │
          ├── タブ: 🗂 カテゴリー（admin のみ）
          │         🏷 スタンプ（全ユーザー）
          │         👥 ユーザー管理（admin のみ）
          │
          ├── <CategoryEditor> components/admin/CategoryEditor.tsx
          │     admin のみレンダリング
          │
          ├── <StickerEditor>  components/admin/StickerEditor.tsx
          │     保存: 誰でも可
          │     編集・削除: 自分のスタンプ or admin のみ
          │     └── <CourseRow> × N
          │
          └── <UserEditor>     components/admin/UserEditor.tsx
                admin のみレンダリング
                フォーム: ユーザー名・表示名・ロール・パスワード（新規時のみ必須）
```

#### 3.4.3 状態管理の所在

| 状態 | 管理場所 | 理由 |
|------|---------|------|
| `cats`（カテゴリー配列） | `App` | 全ビューが参照する |
| `stks`（スタンプ配列） | `App` | 全ビューが参照する |
| `users`（ユーザー配列） | `App` | AdminPanel のユーザー管理タブが参照する |
| `view`（gallery/admin） | `App` | ルーティング相当 |
| `search`（検索文字列） | `App` | Navbar と gallery 両方が参照する |
| `catModal`, `stkModal` | `App` | モーダルは gallery 上に重なるため App で管理 |
| `currentUser`（`{ id, username, role, displayName }`） | `App` | JWT デコード結果。全コンポーネントがロール判定に使う |
| フォームの各フィールド値 | 各 Editor | Editor 内で完結する一時状態 |
| `courses`（授業リスト） | `StickerEditor` | CourseRow の親 |
| 選択中の編集対象 | `AdminPanel` | 左ペインと右ペインの連携点 |

#### 3.4.4 import の方向規則

循環参照を防ぐためにインポートの方向を一方向に固定する。

```
App.tsx
  └─ imports ─→  components/Navbar.tsx
  └─ imports ─→  components/gallery/*.tsx
  └─ imports ─→  components/admin/*.tsx

components/gallery/*.tsx
  └─ imports ─→  components/common/*.tsx

components/admin/*.tsx
  └─ imports ─→  components/common/*.tsx

components/common/*.tsx
  └─ imports ─→  なし（他コンポーネントに依存しない）
```

> **禁止パターン**：`common/` が `gallery/` や `admin/` を import する、`gallery/` が `admin/` を import する、などの逆方向・横断インポートは禁止。

#### 3.4.5 props の命名規則

| パターン | 例 | 意味 |
|---------|---|------|
| `on{Event}` | `onClick`, `onClose`, `onSave`, `onDelete` | イベントコールバック |
| 単数名詞 | `cat`, `sticker`, `course` | 単一エンティティ |
| 複数名詞 | `categories`, `stickers` | エンティティ配列 |
| `on{Update}{Plural}` | `onUpdateCats`, `onUpdateStickers` | 配列更新コールバック |

### 3.5 ディレクトリ構成

```
SkillsStampConnect/
├── nginx.conf                  # Nginx 設定サンプル（サーバーに直接インストール）
├── SkillsStampConnect.service     # systemd unit ファイルサンプル
├── .env.example
├── .env                        # .gitignore 対象
├── .gitignore
├── package.json
├── vite.config.js
├── server.js                   # Express エントリーポイント
├── lib/
│   ├── database.js             # node:sqlite ラッパー（シングルトン）
│   ├── imageStore.js           # ファイルシステム画像操作（save / delete / imageUrl）
│   └── auth.js                 # JWT 発行・検証・ミドルウェア（authenticate / requireAdmin / requireOwnerOrAdmin）
├── routes/
│   ├── authRoutes.js           # POST /api/auth/login
│   ├── categories.js           # /api/categories
│   ├── stickers.js             # /api/stickers
│   ├── users.js                # /api/users（admin のみ）
│   └── upload.js               # POST /api/upload, DELETE /api/image/:key
├── db/
│   ├── schema.sql
│   ├── seed.sql
│   ├── migrate.js
│   └── stickers.db             # .gitignore 対象
├── uploads/                    # 画像ファイル格納ディレクトリ（.gitignore 対象）
│   ├── categories/
│   └── stickers/
├── tsconfig.json               # TypeScript 設定
├── tsconfig.node.json          # Vite 用 TypeScript 設定
├── tailwind.config.ts          # Tailwind CSS 設定
├── components.json             # shadcn/ui 設定（パス・スタイル等）
└── client/
    ├── index.html
    └── src/
        ├── main.tsx            # React レンダリング
        ├── App.tsx             # ルート・データフェッチ・状態管理・ビュールーティング
        ├── globals.css         # Tailwind directives + CSS 変数テーマ
        ├── lib/
        │   └── utils.ts        # cn() ユーティリティ（shadcn/ui が生成）
        └── components/
            ├── ui/             # shadcn/ui 生成コンポーネント（直接編集しない）
            │   ├── button.tsx
            │   ├── card.tsx
            │   ├── dialog.tsx  # モーダル用
            │   ├── badge.tsx
            │   ├── input.tsx
            │   ├── label.tsx
            │   ├── select.tsx
            │   ├── textarea.tsx
            │   ├── checkbox.tsx
            │   ├── alert.tsx
            │   └── scroll-area.tsx
            ├── Navbar.tsx
            ├── common/
            │   ├── StickerIcon.tsx   # 丸アイコン（画像 or Emoji）
            │   └── YearBadge.tsx     # カリキュラム年度バッジ
            ├── gallery/
            │   ├── CategoryCard.tsx  # カテゴリーカード＋SkillChipリスト
            │   ├── SkillChip.tsx     # スタンプチップ（カード型ボタン）
            │   ├── CategoryModal.tsx # カテゴリー詳細 Dialog
            │   └── StickerModal.tsx  # スタンプ詳細 Dialog
            └── admin/
                ├── LoginScreen.tsx   # JWT ログインフォーム
                ├── AdminPanel.tsx    # 2ペインレイアウト・CRUD ハンドラ・API 呼び出し
                ├── CategoryEditor.tsx
                ├── StickerEditor.tsx
                ├── CourseRow.tsx     # 授業行フォーム（1行分）
                └── UserEditor.tsx    # ユーザー CRUD（admin のみ）
```

**ファイル配置の判断基準**

| 配置先 | 基準 |
|--------|------|
| `components/common/` | ギャラリーと管理画面の**両方**から使われる表示専用コンポーネント |
| `components/gallery/` | ギャラリービューでのみ使われるコンポーネント |
| `components/admin/` | 管理画面でのみ使われるコンポーネント |
| `App.tsx` | アプリ全体の状態を持つルートコンポーネントのみ |

---

## 4. データモデル

### 4.1 ER 図

```
users
  │  id (PK)
  │  username (UNIQUE), password_hash
  │  role: 'admin' | 'user'
  │  display_name, created_at, updated_at
  │
  └──< stickers（created_by FK）
         ※ stickers は users に対して「作成者」として参照される

categories
  │  id (PK)
  │  name, name_en, emoji, color
  │  image_key → uploads/
  │  description, target_roles (JSON), recruit_message
  │  sort_order, created_at, updated_at
  │
  ├──< sticker_categories（中間テーブル）
  │      sticker_id (FK → stickers.id, ON DELETE CASCADE)
  │      category_id (FK → categories.id, ON DELETE CASCADE)
  │      sort_order
  │      PRIMARY KEY (sticker_id, category_id)
  │
  └──< stickers（primary_category_id で参照）

stickers
  │  id (PK)  ← NSS-{AREA}-{TYPE}{SEQ}{VER}（AREA は primary_category の area_code）
  │  primary_category_id (FK → categories.id)  ← 表示色・ID AREA の基準
  │  created_by (FK → users.id, NULL 可)
  │  name, name_en, type, color, emoji
  │  image_key → uploads/
  │  description (Can-Do記述), skills (JSON), level, version
  │  sort_order, created_at, updated_at
  │
  └──< courses
         id (PK)
         sticker_id (FK → stickers.id, ON DELETE CASCADE)
         name, code, type, hours
         curriculum_year  ← 複数年度共存が正常状態
         content_note, sort_order
```

### 4.2 users テーブル（v7.3 新設）

```sql
CREATE TABLE users (
  id            TEXT PRIMARY KEY,
  username      TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,           -- scrypt形式: "{salt}:{hash}"
  role          TEXT NOT NULL CHECK(role IN ('admin','user')),
  display_name  TEXT,                    -- 管理画面・スタンプ一覧に表示する名前
  created_at    TEXT DEFAULT (datetime('now')),
  updated_at    TEXT DEFAULT (datetime('now'))
);
```

> **なぜ `password_hash` に scrypt を使うか**：Node.js 24 の `node:crypto` に `scrypt` 関数が組み込まれており、bcrypt 相当のコスト計算が npm パッケージなしで実現できる。フォーマットは `{16バイトsalt（hex）}:{64バイトhash（hex）}` で自己完結する（→ Appendix E: ADR-016）。

> **なぜ `display_name` を分けるか**：`username` はログイン ID として変更しにくい（変更すると認証情報が変わる）。表示名だけを後から変更できるようにするために分離する。

### 4.3 categories テーブル

```sql
CREATE TABLE categories (
  id              TEXT PRIMARY KEY,
  name            TEXT NOT NULL,
  name_en         TEXT,
  area_code       TEXT NOT NULL,                 -- スタンプ ID の AREA 部分（例: 'WEB','AI'）
  emoji           TEXT    NOT NULL DEFAULT '📌',
  color           TEXT    NOT NULL DEFAULT '#2563EB',
  image_key       TEXT,
  description     TEXT,
  target_roles    TEXT    DEFAULT '[]',           -- JSON配列。アプリ層で parse/stringify
  recruit_message TEXT,
  sort_order      INTEGER DEFAULT 0,
  created_at      TEXT    DEFAULT (datetime('now')),
  updated_at      TEXT    DEFAULT (datetime('now'))
);
```

> **なぜ `target_roles` を JSON 列（TEXT 型）にするか**：対象職種は 1〜5 件程度の短い文字列リストであり、別テーブルを立てて JOIN するほどの規模でない。TEXT 型で JSON 配列を持ち、アプリ層で `JSON.parse/stringify` する方式は SQLite の標準 JSON 関数（`json_each` 等）も使えるため、将来フィルタリングが必要になった場合にも対応できる（→ Appendix E: ADR-006）。

> **なぜ `sort_order` を持つか**：カテゴリーとスタンプの表示順は「就職説明会で企業が重視するスキル領域の優先順位」に基づいて教員が制御する必要がある。`created_at` 順では新規追加のたびに末尾に来るため教員の意図を反映できない。`sort_order` を持つことで管理画面から表示順を任意に変更できる（→ Appendix E: ADR-007）。

### 4.4 stickers テーブル

```sql
CREATE TABLE stickers (
  id                   TEXT PRIMARY KEY,
  primary_category_id  TEXT NOT NULL,             -- 表示色・ID AREA の基準カテゴリー
  created_by           TEXT,                      -- users.id（NULL 可：シードデータ対応）
  name                 TEXT NOT NULL,
  name_en              TEXT,
  type                 TEXT NOT NULL CHECK(type IN ('practical','lecture')),
  color                TEXT NOT NULL DEFAULT '#2563EB',
  emoji                TEXT NOT NULL DEFAULT '⭐',
  image_key            TEXT,
  description          TEXT,                      -- Can-Do記述
  skills               TEXT    DEFAULT '[]',      -- JSON配列
  level                TEXT    CHECK(level IN ('実践','知識')),
  version              TEXT    NOT NULL DEFAULT 'v01',
  sort_order           INTEGER DEFAULT 0,
  created_at           TEXT    DEFAULT (datetime('now')),
  updated_at           TEXT    DEFAULT (datetime('now')),
  FOREIGN KEY (primary_category_id) REFERENCES categories(id),
  FOREIGN KEY (created_by)          REFERENCES users(id) ON DELETE SET NULL
);
```

> **なぜ `category_id` を廃止して `primary_category_id` にするか**：スタンプが複数カテゴリーに属せるようにするため、カテゴリーとの紐づけは `sticker_categories` 中間テーブルに移した。その上で「表示色の基準」と「スタンプ ID の AREA コード」の決定に主カテゴリーが必要なため `primary_category_id` を stickers 本体に持つ（→ Appendix E: ADR-020）。

> **なぜ `created_by` を NULL 可にするか**：既存のシードデータや v7.2 以前に登録されたスタンプには作成者情報がない。NULL を許容することで移行時のデータ破壊を防ぐ。NULL のスタンプは admin のみが編集・削除できる（→ Appendix E: ADR-016）。

### 4.4b sticker_categories テーブル（v7.5 新設）

スタンプとカテゴリーの多対多関係を表す中間テーブル。

```sql
CREATE TABLE sticker_categories (
  sticker_id  TEXT NOT NULL,
  category_id TEXT NOT NULL,
  sort_order  INTEGER DEFAULT 0,   -- このカテゴリー内でのスタンプ表示順
  PRIMARY KEY (sticker_id, category_id),
  FOREIGN KEY (sticker_id)  REFERENCES stickers(id)   ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
);
```

> **なぜ `ON DELETE CASCADE` を両方向に設定するか**：スタンプ削除時・カテゴリー削除時の両方で、紐づきレコードが自動的にクリーンアップされる。カテゴリーの CASCADE は「スタンプ本体は残り、そのカテゴリーへの所属だけが外れる」挙動であり意図通り。ただしカテゴリー削除前に `primary_category_id` の参照整合性チェックが必要（後述）。

> **`primary_category_id` と `sticker_categories` の整合性ルール**
> 1. `primary_category_id` は必ず `sticker_categories` にも登録されていなければならない（API 層で保証）
> 2. カテゴリーを削除する前に、そのカテゴリーを `primary_category_id` として持つスタンプが存在する場合は 409 を返す（スタンプの `primary_category_id` を別カテゴリーに変更してから再試行を促す）

### 4.5 courses テーブル

```sql
CREATE TABLE courses (
  id              TEXT    PRIMARY KEY,
  sticker_id      TEXT    NOT NULL,
  name            TEXT    NOT NULL,
  code            TEXT,
  type            TEXT    CHECK(type IN ('practical','lecture')),
  hours           INTEGER,
  curriculum_year INTEGER NOT NULL,
  content_note    TEXT,
  sort_order      INTEGER DEFAULT 0,
  FOREIGN KEY (sticker_id) REFERENCES stickers(id) ON DELETE CASCADE
);
```

> **なぜ `ON DELETE CASCADE` か**：スタンプを削除した場合、紐付く授業情報は存在意義がなくなるため、明示的に削除する必要がある。CASCADE を設定しておくことでアプリ層での削除忘れを防ぐ。一方、カテゴリー削除時はスタンプが残ることを意図していないため、API 側で配下スタンプの存在確認を行い 409 を返す（→ Appendix E: ADR-008）。

> **なぜ `curriculum_year` を独立軸で管理するか**：カリキュラム改訂は頻繁に起き、同一スタンプが複数年度にまたがる授業と紐付く。旧年度の授業情報を削除すると、その年度に物理スタンプを取得した学生が自分のスタンプの根拠を確認できなくなる。年度別に courses を保持することで、スタンプの価値の経時的な証跡が残る（→ Appendix E: ADR-009）。

**courses.type の扱い（v7.0 変更）**

v6.0 では `stickers.type` と `courses.type` が別管理だったが、実運用では常に一致する。v7.0 では以下のルールを採用する。

| ルール | 内容 |
|--------|------|
| courses.type は省略可 | NULL の場合は親 sticker.type を継承する（API 側で補完） |
| UI 表示 | courses.type が NULL の場合、sticker.type を表示に使う |
| 将来拡張 | 1スタンプに実習・講義の両授業が混在するケースが生じた場合に courses.type を明示する |

### 4.6 インデックス

```sql
CREATE INDEX idx_stickers_primary_cat ON stickers(primary_category_id);
CREATE INDEX idx_stickers_created_by  ON stickers(created_by);
CREATE INDEX idx_sticker_cats_sticker ON sticker_categories(sticker_id);
CREATE INDEX idx_sticker_cats_cat     ON sticker_categories(category_id);
CREATE INDEX idx_courses_sticker      ON courses(sticker_id);
CREATE INDEX idx_courses_year         ON courses(curriculum_year);
```

### 4.7 スタンプ ID 命名規則

```
NSS - {AREA} - {TYPE}{SEQ}{VER}

NSS  : 学校識別子（固定）
AREA : 主カテゴリー（primary_category_id）の area_code
       WEB / AI / UX / PM 等。categories テーブルの area_code 列（v7.5 追加）を参照
TYPE : K = 実践（Kōi） / L = 知識（Lecture）
SEQ  : 3桁連番（001〜）。同一 AREA+TYPE の中で採番
VER  : バージョン（v01〜）。スタンプ内容の大幅改訂時にインクリメント

例: NSS-WEB-K001v01
```

> **v7.5 での変更**：`categories` テーブルに `area_code TEXT NOT NULL` 列を追加する（例: `'WEB'`、`'AI'`）。スタンプ ID の AREA 部分は登録時に `primary_category.area_code` から生成する。既発行の物理スタンプ ID は不変（ADR-010）。複数カテゴリー所属になった後も、発行時に決めた主カテゴリーの area_code がスタンプ ID に使われ続ける。

> **ID 変更ポリシー**：既発行の物理スタンプとの対応を保つため、一度発行した ID は変更しない。内容改訂時は VER をインクリメントして新スタンプとして発行し、旧スタンプはギャラリーに残す。

> **なぜ ID を不変にするか**：物理スタンプは印刷物であり、発行後に ID を変更しても現物を差し替えることができない。ID が変わった場合、学生が手持ちのスタンプで検索しても該当するギャラリーページが見つからなくなる。また URL や QR コードに ID が含まれている場合はリンク切れが生じる。不変性はシステムの信頼性の前提であり、設計段階で明示しておく（→ Appendix E: ADR-010）。

### 4.7 S3 オブジェクトキー規則

```
{prefix}/{uuid}

prefix : categories | stickers
uuid   : Node.js randomUUID() による生成（node:crypto）

例:
  stickers/550e8400-e29b-41d4-a716-446655440000
  categories/f47ac10b-58cc-4372-a567-0e02b2c3d479
```

> **なぜ URL ではなくキーだけ DB に保存するか**：配信 URL はストレージサービスの選択（MinIO / S3 / R2）や配置場所（ドメイン・バケット名）に依存する。DB にキーだけを保存し URL を `imageUrl(key)` 関数でサーバーサイドに組み立てることで、ストレージを乗り換えた際に DB のレコードを一切変更せず `S3_PUBLIC_BASE` 環境変数を更新するだけで済む（→ Appendix E: ADR-011）。 ↔ snake_case 変換表

DB は snake_case、API レスポンス・リクエストボディは camelCase に統一する。

| DB（snake_case） | API（camelCase） |
|-----------------|-----------------|
| primary_category_id | primaryCategoryId |
| image_key | imageKey |
| area_code | areaCode |
| name_en | nameEn |
| sort_order | sortOrder |
| target_roles | targetRoles |
| recruit_message | recruitMessage |
| curriculum_year | curriculumYear |
| content_note | contentNote |
| created_at | createdAt |
| updated_at | updatedAt |
| sticker_count | stickerCount |
| login_id | loginId |
| graduation_year | graduationYear |
| contact_email | contactEmail |
| email_public | emailPublic |
| must_change_password | mustChangePassword |
| avatar_image_key | avatarImageKey |
| x_handle | xHandle |
| linkedin_url | linkedinUrl |
| other_skills | otherSkills |
| external_public | externalPublic |
| is_visible | isVisible |
| acquired_date | acquiredDate |
| recorded_by | recordedBy |

> **なぜ DB は snake_case、API は camelCase に分けるか**：SQLite の慣習は snake_case、JavaScript の慣習は camelCase であり、両者を一致させようとするとどちらかの慣習を破ることになる。変換は機械的に行えるため、境界（routes 層）で一括して変換し、DB 層と UI 層それぞれの慣習を維持する。変換表を SDD に明示することで実装のバラつきを防ぐ。

### 4.8 users テーブル拡張（v10.0）

学生ロールを追加し、CSV インポート由来の属性を保持できるようにする。

```sql
-- 新規列（既存 categories/stickers/courses には影響しない）
ALTER TABLE users ADD COLUMN login_id             TEXT UNIQUE;             -- 学生：システム自動発行／職員：従来の username を継続使用
ALTER TABLE users ADD COLUMN affiliation          TEXT;                    -- 所属（学部・学科等）
ALTER TABLE users ADD COLUMN position             TEXT;                    -- 役職／学年（例: "3年生"）
ALTER TABLE users ADD COLUMN graduation_year       INTEGER;                 -- 卒業予定年度（任意）
ALTER TABLE users ADD COLUMN contact_email         TEXT;                    -- 連絡先メール（任意、本人編集可）
ALTER TABLE users ADD COLUMN email_public          INTEGER NOT NULL DEFAULT 0;  -- 0/1。email_public=1 の場合のみプロフィールに表示
ALTER TABLE users ADD COLUMN must_change_password  INTEGER NOT NULL DEFAULT 0;  -- 0/1。CSVインポート直後の学生は1
ALTER TABLE users ADD COLUMN status                TEXT NOT NULL DEFAULT 'active';  -- 'active' | 'suspended'
```

> **`role` の CHECK 制約について**：SQLite は既存カラムの CHECK 制約を `ALTER TABLE` で直接変更できない。`role IN ('admin','user')` を `role IN ('admin','user','student')` に拡張するには、`db/migrate.js` で「新スキーマのテーブルを作成 → 旧データをコピー → 旧テーブルを削除 → リネーム」の手順を踏む（SQLite 公式の推奨手順）。既存の `admin`・`user` ロールの行はそのまま移行される。

> **なぜ `login_id` を `username` と分けないか**：既存の職員アカウント（admin/user）は `username` を引き続き使う。学生ロールのみ `login_id` を使う設計にすると認可ミドルウェアの分岐が増えるため、`login_id` は `username` の別名カラムとして扱い、認証処理では「`username` または `login_id` のいずれか一致」でログインを受け付ける（実装は `WHERE username = ? OR login_id = ?` の1クエリで完結する）。

> **なぜ `status` を追加するか**：不適切利用があった学生アカウントを「削除」すると `student_achievements`（実績記録）の `student_id` が孤立し、大学側の記録が失われる。`status='suspended'` によってログインのみを止め、実績記録は保持する（→ ADR-031 関連）。

### 4.9 student_profiles テーブル（v10.0 新設）

学生本人が編集する公開プロフィール情報。`users` とは 1:1。

```sql
CREATE TABLE student_profiles (
  user_id           TEXT PRIMARY KEY,              -- users.id（role='student'）
  avatar_image_key  TEXT,                           -- uploads/students/ 配下（§6.2 規則を踏襲）
  x_handle          TEXT,                           -- "@" を含まないハンドルのみ保持
  linkedin_url      TEXT,
  other_skills      TEXT,                           -- 自由入力
  goal              TEXT,                           -- 「やりたいこと」自由入力
  bio               TEXT,                           -- 一言（アプリ層で100文字程度に制限）
  external_public   INTEGER NOT NULL DEFAULT 0,      -- 0/1。ログイン不要の外部公開（QRコード・固定URL経由）への同意
  updated_at        TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

> **なぜ `external_public` を `student_achievements.is_visible` と別に持つか**：`is_visible` はログイン済みの登録者（学生・教員・職員）への公開であり、実質的には「システム利用者全体への公開」である。これに対し `external_public` は**ログイン不要・不特定多数への公開**であり、リスクの質が異なる。QRコード・ステッカー・チャーム等に印刷した固定 URL（`/api/public/profile/:loginId`）経由でアクセスされるのはこの層であり、`is_visible=true` の実績のうちさらに外部公開してよいものを本人が選ぶ（→ Appendix E: ADR-026・ADR-032）。

> **なぜ実名列を持たないか**：v10.0 の学生アカウントは CSV インポート時点で職員が本人確認済みという前提のため、システム内部でも実名の照合用途が生じない。実名の管理責任を大学側の原本（インポート元 CSV）に一元化し、システムが保持する個人情報を最小化する（→ Appendix E: ADR-025）。

### 4.10 student_achievements テーブル（v10.0 新設）

「どの学生が、どのスタンプを、いつ取得したか」を記録する台帳。物理スタンプの配布という事実をデジタルに転記するものであり、Web システム側でスタンプを「発行」するわけではない。

```sql
CREATE TABLE student_achievements (
  id            TEXT PRIMARY KEY,
  student_id    TEXT NOT NULL,                     -- users.id（role='student'）
  sticker_id    TEXT NOT NULL,
  acquired_date TEXT,                               -- 取得日（YYYY-MM-DD）
  is_visible    INTEGER NOT NULL DEFAULT 0,         -- 0/1。学内公開の同意（学生本人が切り替え）
  recorded_by   TEXT,                               -- users.id（記録した職員）
  notes         TEXT,
  created_at    TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (student_id)  REFERENCES users(id)    ON DELETE CASCADE,
  FOREIGN KEY (sticker_id)  REFERENCES stickers(id) ON DELETE CASCADE,
  FOREIGN KEY (recorded_by) REFERENCES users(id)    ON DELETE SET NULL
);
```

> **なぜ `is_visible` のデフォルトを 0（非公開）にするか**：職員が実績を記録した時点では学生本人の公開同意を得ていない。デフォルト非公開（オプトイン）にすることで、学生がログインして初めて自分の意思で公開範囲を選べる（→ Appendix E: ADR-026）。

> **本テーブルと §1.3 のスコープ境界との関係**：v9.0 までの「Web ギャラリーはリファレンス表示であって誰がどのスタンプを持っているかは管理しない」という境界を、本テーブルの新設によって v10.0 で意図的に変更している（→ ADR-024）。カテゴリー・スタンプ定義自体の管理方針（§4.3・§4.4）には影響しない。

### 4.11 kiosk_tokens テーブル（v10.0 新設 → v11.0 で廃止）

> **v11.0 での廃止**：本テーブルおよび `X-Kiosk-Token` 認証によるキオスクモードは v11.0 で廃止し、`student_profiles.external_public`（固定URL・QRコード経由の外部公開）に統合した。就職説明会会場のタブレットも、個々の学生の外部公開 URL（QRコード）を開くだけで閲覧できるため、イベント単位のトークン発行・失効という運用自体が不要になった（→ Appendix E: ADR-032）。旧仕様は Appendix D 相当の記録として ADR-029 に残す。

### 4.12 インデックス追加（v10.0、v11.0 更新）

```sql
CREATE INDEX idx_users_login_id          ON users(login_id);
CREATE INDEX idx_achievements_student    ON student_achievements(student_id);
CREATE INDEX idx_achievements_sticker    ON student_achievements(sticker_id);
CREATE INDEX idx_achievements_visible    ON student_achievements(is_visible);
```

> `idx_kiosk_tokens_token` は `kiosk_tokens` テーブル廃止（v11.0、ADR-032）に伴い削除。

### 4.13 学生アカウント発行フロー（CSV 一括インポート）

```
CSV フォーマット：
  display_name, affiliation, position, graduation_year, contact_email, temp_password

インポート処理（POST /api/students/import、👑 admin のみ）：
  各行ごとに：
    1. login_id をシステムが自動生成（例: "stu-" + randomUUID() の先頭8文字）
    2. temp_password を scrypt でハッシュ化して password_hash に保存
       （temp_password は CSV に管理者が記入した値をそのまま初期パスワードとして使う）
    3. users レコードを作成
       role='student', login_id, display_name, affiliation, position,
       graduation_year, contact_email, must_change_password=1, status='active'
    4. student_profiles レコードを空で作成（学生が後から編集）
  → レスポンス：{ loginId, displayName, tempPassword } の配列
    画面に一度だけ表示し、サーバー側では temp_password の平文を保持しない
```

> **なぜ学生の自己登録エンドポイントを設けないか**：当初は「学籍番号名簿と照合する自己登録」を検討したが、CSV インポートによる直接作成に切り替えたことで、なりすまし登録を狙う公開エンドポイント自体が不要になった。攻撃面が単純に減る（→ Appendix E: ADR-027）。

### 5.1 ギャラリービュー

#### 5.1.1 カテゴリーカード表示

- 全カテゴリーを `sort_order` 昇順・`created_at` 昇順で縦方向に一覧表示
- 各カテゴリーカードは **ヘッダー部**（カテゴリーステッカー本体）と **スタンプチップ部** で構成
- ヘッダー部にはテーマカラーを `linear-gradient(135deg, {color}, {color}cc)` で全面適用
- ヘッダー部クリック → カテゴリー詳細モーダルを開く

**表示項目**

| 要素 | 内容 |
|------|------|
| アイコン | S3 画像（imageUrl）or emoji（フォールバック）。`rounded-circle` |
| カテゴリー名 | 日本語名・英語名 |
| 説明文 | description |
| 対象職種タグ | targetRoles を `Badge rounded-pill` で表示 |
| スタンプ件数 | 実習 N 件 / 講義 N 件（type 別集計） |
| スタンプチップ | 配下 stickers を横並び・折り返しで表示 |

#### 5.1.2 スタンプチップ（SkillChip）

カテゴリーカード下部にカード型ボタンで表示。

| 要素 | 内容 |
|------|------|
| アイコン | StickerIcon コンポーネント（画像 or emoji） |
| スタンプ名 | name |
| 種別バッジ | `bg-warning-subtle text-warning-emphasis`（実習）/ `bg-secondary-subtle text-secondary-emphasis`（講義） |
| スタンプ ID | `text-muted small` で表示 |

クリック → スタンプ詳細モーダルを開く。

**複数カテゴリー所属スタンプの表示ルール**

| 表示場所 | 表示スタイル |
|---------|------------|
| 主カテゴリー（`primaryCategoryId`）のカード | 通常表示（不透明・テーマカラーのボーダー） |
| その他所属カテゴリーのカード | 「関連」として薄く表示（`opacity: 0.55`・ボーダーなし） |

> 同じスタンプが複数カードに現れることで、学生・企業が「このスキルは複数の文脈で使える」と把握できる。主カテゴリーとそれ以外を視覚的に区別することで、スタンプの「本来の所属」が伝わる。

#### 5.1.3 全文検索

ヘッダーの検索フィールドで以下をリアルタイム絞り込み（クライアントサイド）。

- カテゴリー名・説明文・対象職種
- スタンプ名・Can-Do 記述・スキルタグ
- 授業名・科目コード・授業内容メモ

検索ヒット：カテゴリーカードを表示。配下スタンプはさらに絞り込む。
検索ミス：「一致する結果がありません」メッセージを表示。

### 5.2 カテゴリー詳細モーダル

| セクション | 内容 |
|-----------|------|
| ヘッダー | テーマカラー背景・StickerIcon・カテゴリー名・説明文・対象職種タグ |
| 採用担当者向けメッセージ | `Alert variant="warning"`（黄色背景）で強調表示 |
| スタンプ一覧 | 配下 stickers を `list-group-item` で表示。クリックでスタンプ詳細へ遷移 |

### 5.3 スタンプ詳細モーダル

| セクション | 内容 |
|-----------|------|
| パンくず | `{cat.name} › {sticker.name}` |
| ヘッダー | テーマカラー薄グラデーション・StickerIcon・スタンプ名・種別バッジ・ID・レベル |
| Can-Do 記述 | `bg-light rounded` + 左にテーマカラーのボーダーライン |
| 習得スキル | `Badge rounded-pill`（テーマカラー系） |
| 関連授業（年度別） | `curriculum_year` でグループ化。年度降順 |

**授業年度グループの視覚区別**

| 状態 | スタイル |
|------|--------|
| 最新年度（`LATEST_CURRICULUM_YEAR`） | 実線ボーダー（`border`）・通常透明度 |
| 旧年度 | 破線ボーダー（`border-dashed`）・`opacity: 0.85` |

---

## 6. ストレージ仕様

### 6.1 SQLite（メタデータ）

| 項目 | 仕様 |
|------|------|
| ファイルパス | `process.env.DB_PATH`（デフォルト: `./db/stickers.db`） |
| モジュール | `node:sqlite`（Node.js 24 組み込み、npm 不要） |
| API スタイル | `DatabaseSync`（同期 API）|
| PRAGMA | `journal_mode = WAL` / `foreign_keys = ON` |
| JSON 列 | `target_roles`, `skills` は TEXT として格納し、アプリ層で `JSON.parse/stringify` |
| シングルトン | `lib/database.js` でインスタンスを生成してエクスポート |

```javascript
// lib/database.js
import { DatabaseSync } from 'node:sqlite';
const db = new DatabaseSync(process.env.DB_PATH ?? './db/stickers.db');
db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');
export default db;
```

### 6.2 ファイルシステム（画像バイナリ）

| 項目 | 仕様 |
|------|------|
| 格納先 | `UPLOAD_DIR`（デフォルト: `./uploads`）配下 |
| ディレクトリ構造 | `uploads/categories/` と `uploads/stickers/` に prefix で分類 |
| ファイル名 | `{randomUUID()}.{ext}`（`node:crypto` で生成） |
| 拡張子 | multer の `mimetype` から決定。`image/jpeg` → `.jpg`、`image/png` → `.png`、`image/webp` → `.webp` |
| ファイルサイズ上限 | multer の `limits.fileSize` で 5MB に設定 |
| 配信方式 | `express.static(UPLOAD_DIR)` で `/uploads` パスに配信（認証不要） |
| key 形式 | `{prefix}/{uuid}.{ext}`。DB の `image_key` 列に保存 |
| URL 組み立て | `imageUrl(key)` が `/uploads/{key}` を返す。同一オリジンのため絶対 URL 不要 |

**lib/imageStore.js のエクスポート関数**

| 関数 | 引数 | 返り値 | 説明 |
|------|------|--------|------|
| `saveImage` | `file（multerファイルオブジェクト）, prefix` | `{ key, url }` | ファイルを `uploads/{prefix}/` に移動し key を返す |
| `deleteImage` | `key` | `void` | `uploads/{key}` を削除（存在しない場合は無視） |
| `imageUrl` | `key` | `string\|null` | `/uploads/{key}` を返す。key が null なら null |

```javascript
// lib/imageStore.js の実装イメージ
import { rename, unlink, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { extname, join } from 'node:path';

const UPLOAD_DIR = process.env.UPLOAD_DIR ?? './uploads';

const MIME_TO_EXT = {
  'image/jpeg': '.jpg',
  'image/png':  '.png',
  'image/webp': '.webp',
  'image/gif':  '.gif',
};

export async function saveImage(file, prefix) {
  const ext = MIME_TO_EXT[file.mimetype] ?? extname(file.originalname) ?? '.bin';
  const key = `${prefix}/${randomUUID()}${ext}`;
  const dest = join(UPLOAD_DIR, key);
  await mkdir(join(UPLOAD_DIR, prefix), { recursive: true });
  await rename(file.path, dest);          // multer の一時ファイルを移動
  return { key, url: imageUrl(key) };
}

export async function deleteImage(key) {
  if (!key) return;
  try { await unlink(join(UPLOAD_DIR, key)); } catch { /* 存在しない場合は無視 */ }
}

export function imageUrl(key) {
  if (!key) return null;
  return `/uploads/${key}`;
}
```

---

## 7. API 仕様

### 7.1 エンドポイント一覧

**認証レベルの定義**

| 記号 | 意味 |
|------|------|
| 公開 | 認証不要 |
| 🔑 | JWT 必須（`user` / `admin` どちらでも可） |
| 👑 | `admin` ロール必須 |
| 🔑✋ | JWT 必須 + 所有者 or admin（`requireOwnerOrAdmin`） |

| メソッド | パス | 認証 | 説明 |
|---------|------|------|------|
| POST | `/api/auth/login` | 公開 | ログイン → JWT 発行 |
| GET | `/api/categories` | 公開 | カテゴリー一覧 |
| POST | `/api/categories` | 👑 | カテゴリー新規作成 |
| PUT | `/api/categories/:id` | 👑 | カテゴリー更新 |
| DELETE | `/api/categories/:id` | 👑 | カテゴリー削除 |
| GET | `/api/stickers` | 公開 | スタンプ一覧（courses 含む） |
| POST | `/api/stickers` | 🔑 | スタンプ新規作成（created_by に req.user.id を自動設定） |
| PUT | `/api/stickers/:id` | 🔑✋ | スタンプ更新（所有者 or admin のみ） |
| DELETE | `/api/stickers/:id` | 🔑✋ | スタンプ削除（所有者 or admin のみ） |
| GET | `/api/users` | 👑 | ユーザー一覧 |
| POST | `/api/users` | 👑 | ユーザー新規作成 |
| PUT | `/api/users/:id` | 👑 | ユーザー更新（ロール変更含む） |
| DELETE | `/api/users/:id` | 👑 | ユーザー削除（自分自身は不可） |
| POST | `/api/upload` | 🔑 | 画像アップロード |
| DELETE | `/api/image/:key(*)` | 🔑✋ | 画像削除（所有者 or admin のみ） |
| POST | `/api/students/import` | 👑 | 学生アカウント CSV 一括作成（login_id 自動発行） |
| GET | `/api/students` | 👑 | 登録済み学生一覧（管理用。affiliation・position・status 等含む） |
| PUT | `/api/students/:id/status` | 👑 | 学生アカウントの有効化／停止切り替え |
| PUT | `/api/students/:id/display-name` | 👑 | 不適切表示名の強制変更 |
| DELETE | `/api/students/:id` | 👑 | 学生アカウント削除（`student_achievements` は保持） |
| GET | `/api/my/profile` | 🔑（student） | 自分のプロフィール取得 |
| PUT | `/api/my/profile` | 🔑（student） | 表示名・アバター・SNS・自由入力欄・email_public の更新 |
| GET | `/api/my/achievements` | 🔑（student） | 自分の取得済みスタンプ一覧 |
| PUT | `/api/my/achievements/:id/visibility` | 🔑✋（student, 本人のみ） | `is_visible` の切り替え |
| GET | `/api/stickers/:id/holders` | 🔑（全ロール） | 指定スタンプの `is_visible=true` 学生一覧（表示名・アバターのみ） |
| GET | `/api/students-public` | 🔑（全ロール） | `is_visible=true` の実績を1件以上持つ学生の一覧（公開学生一覧画面用） |
| POST | `/api/achievements` | 🔑 | 実績記録の新規作成（職員全員が可） |
| GET | `/api/achievements?studentId=` | 🔑 | 指定学生の実績一覧（管理・記録画面用） |
| DELETE | `/api/achievements/:id` | 🔑 | 実績記録の削除（記録誤りの訂正用） |
| GET | `/api/students/:id/profile` | 🔑（全ロール） | 学生プロフィール取得（`is_visible` なスタンプのみ含む） |
| PUT | `/api/my/profile` の一部 | 🔑（student） | `external_public` の切り替え（QRコード・固定URLによる外部公開への同意） |
| GET | `/api/public/profile/:loginId` | 公開（認証不要） | `external_public=true` の学生のみ、`is_visible=true` の実績を含むプロフィールを返す。`false` の場合は 404 |

> **v11.0 での変更**：`POST/DELETE /api/kiosk-tokens`・`GET /api/kiosk/*`（`X-Kiosk-Token` ヘッダー認証によるキオスクモード）は廃止した。就職説明会・オンラインイベントでの学生閲覧は、学生本人が発行する固定URL（`GET /api/public/profile/:loginId`）に一本化する（→ Appendix E: ADR-032）。

### 7.2 POST /api/auth/login

**リクエスト**

```json
{ "username": "teacher01", "password": "password123" }
```

**レスポンス（成功）**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "usr-xxxx",
    "username": "teacher01",
    "displayName": "山田 太郎",
    "role": "user"
  }
}
```

**レスポンス（失敗）**：`401 { "error": "ユーザー名またはパスワードが正しくありません" }`

**フロントエンド側の処理**

```javascript
const { token, user } = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username, password }),
}).then(r => r.json());

localStorage.setItem('auth_token', token);
localStorage.setItem('auth_user', JSON.stringify(user));
// App の currentUser state に user をセット
```

**JWT ペイロード**

```json
{
  "sub": "usr-xxxx",
  "username": "teacher01",
  "role": "user",
  "iat": 1716192000,
  "exp": 1716220800
}
```

- `iat`：発行時刻（Unix 秒）
- `exp`：有効期限（発行から 8 時間後）
- 署名アルゴリズム：HS256。`JWT_SECRET` 環境変数で鍵を管理

### 7.3 認可ミドルウェアの実装

`lib/auth.js` に以下の 3 つのミドルウェアを定義する。

```javascript
// lib/auth.js
import { createHmac } from 'node:crypto';

// ── JWT 検証ミドルウェア ──────────────────────────────
// 全 🔑・👑・🔑✋ エンドポイントの先頭に適用
export function authenticate(req, res, next) {
  const header = req.headers['authorization'] ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: '認証が必要です' });
  try {
    req.user = verifyToken(token);  // { sub, username, role }
    next();
  } catch {
    res.status(401).json({ error: 'トークンが無効または期限切れです' });
  }
}

// ── admin ロール必須 ────────────────────────────────
// 👑 エンドポイントで authenticate の後に適用
export function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: '管理者権限が必要です' });
  }
  next();
}

// ── 所有者 or admin ─────────────────────────────────
// 🔑✋ エンドポイントで使う。呼び出し側が対象リソースの created_by を取得して渡す
export function requireOwnerOrAdmin(createdBy) {
  return (req, res, next) => {
    if (req.user.role === 'admin' || req.user.sub === createdBy) {
      return next();
    }
    res.status(403).json({ error: '自分のスタンプのみ操作できます' });
  };
}
```

**NULL の `created_by` の扱い**：`created_by` が NULL のスタンプ（シードデータ・v7.2 以前の登録）は、`createdBy === null` として `requireOwnerOrAdmin` が admin のみ許可する。

### 7.4 GET /api/users レスポンス例（admin のみ）

```json
[
  {
    "id": "usr-0001",
    "username": "admin",
    "displayName": "管理者",
    "role": "admin",
    "stickerCount": 0,
    "createdAt": "2025-04-01 10:00:00"
  },
  {
    "id": "usr-0002",
    "username": "teacher01",
    "displayName": "山田 太郎",
    "role": "user",
    "stickerCount": 3,
    "createdAt": "2025-04-10 09:00:00"
  }
]
```

> `password_hash` はレスポンスに含めない。

### 7.5 GET /api/categories レスポンス例

```json
[
  {
    "id": "cat-webdev",
    "name": "Webアプリ開発",
    "nameEn": "Web App Development",
    "emoji": "🌐",
    "color": "#2563EB",
    "imageKey": null,
    "imageUrl": null,
    "description": "HTTP/REST・データベース設計...",
    "targetRoles": ["Webエンジニア", "フルスタックエンジニア"],
    "recruitMessage": "このスタンプ群を持つ学生は...",
    "sortOrder": 0,
    "stickerCount": 3,
    "createdAt": "2025-04-01 10:00:00",
    "updatedAt": "2025-04-01 10:00:00"
  }
]
```

### 7.6 GET /api/stickers レスポンス例

```json
[
  {
    "id": "NSS-WEB-K001v01",
    "primaryCategoryId": "cat-webdev",
    "categories": [
      { "id": "cat-webdev", "name": "Webアプリ開発", "areaCode": "WEB", "color": "#2563EB" },
      { "id": "cat-ai",     "name": "AI・データサイエンス", "areaCode": "AI", "color": "#059669" }
    ],
    "createdBy": {
      "id": "usr-0002",
      "displayName": "山田 太郎"
    },
    "name": "API実習",
    "nameEn": "API Development",
    "type": "practical",
    "color": "#2563EB",
    "emoji": "⚙️",
    "imageKey": null,
    "imageUrl": null,
    "description": "RESTful API の設計・実装・テストを...",
    "skills": ["REST API設計", "エンドポイント実装"],
    "level": "実践",
    "version": "v01",
    "sortOrder": 0,
    "courses": [...]
  }
]
```

> `categories` は所属する全カテゴリーの配列（主カテゴリー含む）。`primaryCategoryId` と `categories[].id` の一致するエントリが主カテゴリー。`createdBy` が NULL のスタンプは `"createdBy": null` として返す。

### 7.7 POST/PUT /api/stickers リクエストボディ

```json
{
  "id": "NSS-WEB-K001v01",
  "primaryCategoryId": "cat-webdev",
  "categoryIds": ["cat-webdev", "cat-ai"],
  "name": "API実習",
  "nameEn": "API Development",
  "type": "practical",
  "color": "#2563EB",
  "emoji": "⚙️",
  "imageKey": "stickers/550e8400-...",
  "description": "RESTful API の設計・実装...",
  "skills": ["REST API設計", "エンドポイント実装"],
  "level": "実践",
  "version": "v01",
  "courses": [
    {
      "id": "c-web-2025",
      "name": "Webアプリケーション開発実習",
      "code": "WEB301",
      "type": "practical",
      "hours": 90,
      "curriculumYear": 2025,
      "contentNote": "FastAPI を用いた REST API 実装...",
      "sortOrder": 0
    }
  ]
}
```

**バリデーションルール**

| フィールド | ルール |
|-----------|--------|
| `categoryIds` | 1 件以上必須。`primaryCategoryId` を含んでいなければ 400 |
| `primaryCategoryId` | `categoryIds` 内の ID のいずれかでなければ 400 |

**更新方式（洗い替え）**

`sticker_categories`・`courses` はどちらも PUT 時に全削除 → 再挿入する。

```
トランザクション内で:
  1. DELETE FROM sticker_categories WHERE sticker_id = ?
  2. INSERT INTO sticker_categories ...（categoryIds の分だけ）
  3. DELETE FROM courses WHERE sticker_id = ?
  4. INSERT INTO courses ...（courses の分だけ）
  5. UPDATE stickers SET primary_category_id = ?, ... WHERE id = ?
```

> **なぜ差分更新でなく洗い替えか**：categories と courses のどちらも 1 スタンプあたり件数が少なく、洗い替えのコストは無視できる。フロントは「現在の全 categoryIds」と「現在の全 courses」をそのまま送信するだけでよい（→ Appendix E: ADR-012）。

### 7.5 POST /api/upload

**リクエスト**

```
Content-Type: multipart/form-data
Authorization: Basic {token}

フィールド:
  file    - 画像ファイル（必須）。5MB 以下
  prefix  - "stickers" または "categories"（デフォルト: "stickers"）
```

**レスポンス例（成功）**

```json
{
  "key": "stickers/550e8400-e29b-41d4-a716-446655440000.png",
  "url": "/uploads/stickers/550e8400-e29b-41d4-a716-446655440000.png"
}
```

**フロントエンド側の処理**

```javascript
// 画像を選択→アップロード→imageKey を取得する一連の処理
const formData = new FormData();
formData.append('file', file);
formData.append('prefix', 'stickers');

const { key, url } = await fetch('/api/upload', {
  method: 'POST',
  headers: { 'Authorization': `Basic ${authToken}` },
  body: formData,                      // Content-Type は自動設定（multipart）
}).then(r => r.json());

setImageKey(key);   // フォームに key を保持 → POST/PUT /api/stickers に含める
setPreviewUrl(url); // 即時プレビュー表示
```

### 7.6 DELETE /api/image/:key(*) の key エンコード

ファイルパスのキーはスラッシュを含む（例: `stickers/uuid.png`）。Express のワイルドカードパラメータ `:key(*)` で受け取る。

```javascript
// routes/upload.js
router.delete('/image/*', basicAuth, async (req, res) => {
  const key = req.params[0];   // "stickers/550e8400-....png"
  await deleteImage(key);
  res.json({ ok: true });
});
```

### 7.7 エラーレスポンス形式

全エラーは以下の形式で返す。

```json
{ "error": "エラーメッセージ（日本語）" }
```

| HTTP ステータス | 用途 |
|---------------|------|
| 400 | 必須パラメータ欠損・不正な値 |
| 401 | 認証失敗（`WWW-Authenticate` ヘッダー付与） |
| 404 | リソースが見つからない |
| 409 | 競合（配下スタンプが存在するカテゴリーの削除等） |
| 500 | サーバー内部エラー |

### 7.8 POST /api/students/import（v10.0 新設）

**リクエスト**

```
Content-Type: multipart/form-data
Authorization: Bearer {token}（👑 admin）

フィールド:
  file - CSVファイル（必須）
         ヘッダー行: display_name,affiliation,position,graduation_year,contact_email,temp_password
```

**レスポンス例（成功）**

```json
{
  "created": [
    {
      "loginId": "stu-8f3a2c",
      "displayName": "みかん",
      "tempPassword": "Xk9$mPq2"
    },
    {
      "loginId": "stu-1b7e40",
      "displayName": "Sakura K.",
      "tempPassword": "qT4#nRb1"
    }
  ],
  "errors": []
}
```

> `tempPassword` はこのレスポンス以外のどこにも平文で保存しない。管理画面はこの配列を一度だけ表示し、CSV や画面キャプチャでの配布は運用側の責任とする。行単位でバリデーションエラーがあった場合は `errors: [{ row, message }]` に格納し、成功分のみ作成する。

### 7.9 GET /api/my/profile・PUT /api/my/profile（v10.0 新設）

**GET レスポンス例**

```json
{
  "displayName": "みかん",
  "affiliation": "情報システム学科",
  "position": "3年生",
  "graduationYear": 2027,
  "contactEmail": "mikan@example.ac.jp",
  "emailPublic": false,
  "avatarImageKey": "students/550e8400-....png",
  "xHandle": "mikan_dev",
  "linkedinUrl": "https://www.linkedin.com/in/mikan-dev",
  "otherSkills": "Figma / Notion運用 / 写真撮影",
  "goal": "フロントエンドエンジニアとしてWebサービスを作りたい",
  "bio": "Webのフロントエンドが得意です。",
  "externalPublic": true
}
```

**PUT リクエストボディ**：上記と同形。`displayName`・`avatarImageKey`・`xHandle`・`linkedinUrl`・`otherSkills`・`goal`・`bio`・`contactEmail`・`emailPublic`・`externalPublic` を学生本人が更新できる。`affiliation`・`position`・`graduationYear` は CSV インポート由来の管理情報のため本人からは更新不可（管理画面からのみ変更可）。

> **`externalPublic` の意味**：`isVisible=true`（下記 7.10）の実績のうち、さらに**ログイン不要の固定URL**（`GET /api/public/profile/:loginId`、7.13）で外部公開してよいかの追加同意。デフォルト `false`。ONにすると、既に発行済みのQRコード・URL（`loginId` は不変）が有効化され、OFFに戻すと同じURL・QRのままアクセス不可になる（→ Appendix E: ADR-032）。

### 7.10 GET /api/my/achievements・PUT /api/my/achievements/:id/visibility（v10.0 新設）

```json
// GET /api/my/achievements
[
  {
    "id": "ach-0001",
    "stickerId": "NSS-WEB-K001v01",
    "stickerName": "Web開発実践",
    "acquiredDate": "2026-06-20",
    "isVisible": true
  }
]
```

```json
// PUT /api/my/achievements/ach-0001/visibility
{ "isVisible": false }
```

### 7.11 GET /api/stickers/:id/holders（v10.0 新設）

```json
[
  { "loginId": "stu-8f3a2c", "displayName": "みかん", "avatarImageKey": "students/....png" },
  { "loginId": "stu-1b7e40", "displayName": "Sakura K.", "avatarImageKey": null }
]
```

> 実名・学籍番号相当の情報は一切含まない。`loginId` はプロフィール取得（`GET /api/students/:id/profile`）のパス変数として使うが、画面には表示しない。

### 7.12 POST /api/achievements（v10.0 新設。🔑 職員全員）

```json
{
  "studentId": "usr-stu-8f3a2c",
  "stickerId": "NSS-WEB-K001v01",
  "acquiredDate": "2026-09-05",
  "notes": "授業内で配布"
}
```

`is_visible` はレスポンスに含めず、常に `false`（デフォルト非公開）で作成される。学生本人がログイン後に公開を選択する。

### 7.13 GET /api/public/profile/:loginId（v11.0 新設。認証不要）

QRコード・ステッカー・チャームに印刷する**固定URL**の実体。`login_id` をそのままパス変数に使い、印刷後も恒久的に同一URLを指す。公開・非公開の制御は `student_profiles.external_public` のON/OFFのみで行い、URL自体は変化しない。

```javascript
// routes/publicProfile.js（イメージ）
router.get('/api/public/profile/:loginId', (req, res) => {
  const student = db.prepare(
    `SELECT u.id, u.display_name, u.email_public, u.contact_email,
            p.avatar_image_key, p.x_handle, p.linkedin_url, p.other_skills, p.goal, p.bio, p.external_public
     FROM users u JOIN student_profiles p ON p.user_id = u.id
     WHERE u.login_id = ? AND u.role = 'student' AND u.status = 'active'`
  ).get(req.params.loginId);

  if (!student || !student.external_public) {
    return res.status(404).json({ error: 'プロフィールが見つかりません' }); // 存在自体を秘匿
  }

  const achievements = db.prepare(
    `SELECT s.id AS sticker_id, s.name, s.emoji, s.color, a.acquired_date
     FROM student_achievements a JOIN stickers s ON s.id = a.sticker_id
     WHERE a.student_id = ? AND a.is_visible = 1`
  ).all(student.id);

  res.json({
    displayName: student.display_name,
    avatarImageKey: student.avatar_image_key,
    xHandle: student.x_handle,
    linkedinUrl: student.linkedin_url,
    otherSkills: student.other_skills,
    goal: student.goal,
    bio: student.bio,
    contactEmail: student.email_public ? student.contact_email : undefined,
    achievements, // is_visible=true のみ
  });
});
```

> **v10.0 のキオスクトークン認証（`X-Kiosk-Token`）・`POST/DELETE /api/kiosk-tokens` は v11.0 で廃止**。就職説明会会場のタブレット・オンラインイベントいずれも、本エンドポイントを開くだけでよく、イベント単位のトークン発行・失効という運用が不要になった（→ Appendix E: ADR-032）。

> **`login_id` を公開URLに使うことについて**：`login_id` は `POST /api/auth/login` の認証識別子でもあるため、これを外部公開URLに使うと `login_id` 自体が第三者に知られる状態になる。ただしログインにはパスワードが別途必要であり、ログインAPIには既存のレート制限（15分10回）がかかっているため、`login_id` の露出のみで不正ログインが成立するわけではない。QRコード印刷という運用制約（URLを恒久的に固定したい）を優先し、この設計を採用する（→ Appendix E: ADR-032）。

---

## 8. UI／画面仕様

### 8.1 ナビゲーションバー

shadcn/ui と Tailwind CSS で実装する。`sticky top-0 z-50 bg-background border-b` クラスで固定ヘッダーを実現する。

| 要素 | 内容 |
|------|------|
| ブランド | 🏷️ スキルスタンプ（左端） |
| ビュー切り替え | 「🖼 ギャラリー」「⚙️ 管理画面」を `Nav.Link` で切り替え |
| 検索フォーム | ギャラリービュー時のみ表示。`Form.Control type="search"` |
| ユーザー情報 | 管理画面ログイン時：`{displayName}` + ロールバッジ（`admin` は `Badge bg="danger"`、`user` は `Badge bg="secondary"`） |
| ログアウト | クリックで `localStorage` トークンをクリアし LoginScreen に戻る |

### 8.2 shadcn/ui コンポーネント対応表

| UI 要素 | shadcn/ui コンポーネント | 備考 |
|--------|----------------------|------|
| ナビゲーションバー | カスタム実装（Tailwind のみ） | shadcn/ui に Navbar は含まれない |
| カテゴリーカード | `Card` / `CardHeader` / `CardContent` | |
| スタンプチップ | `Button variant="outline"` | |
| 種別バッジ（実習） | `Badge` + Tailwind `bg-yellow-50 text-yellow-800 border-yellow-200` | |
| 種別バッジ（講義） | `Badge` + Tailwind `bg-slate-100 text-slate-600 border-slate-200` | |
| 年度バッジ（最新） | `Badge` + Tailwind `bg-slate-900 text-slate-50` | |
| 年度バッジ（旧） | `Badge variant="outline"` | |
| モーダル | `Dialog` / `DialogContent` / `DialogHeader` / `DialogTitle` | Radix UI ベース。ポータル・フォーカストラップ・ESC 閉鎖が自動 |
| 管理フォーム | `Input` / `Label` / `Textarea` / `Select` | `FloatingLabel` は使わない。`Label` + `Input` を縦積みで表現 |
| チェックボックス | `Checkbox` + `Label` | カテゴリー複数選択に使用 |
| ボタン | `Button variant="default"` / `"outline"` / `"destructive"` / `"ghost"` | |
| 採用担当者向けメッセージ | `Alert` + Tailwind `bg-amber-50 border-amber-200 text-amber-900` | |
| スクロール領域 | `ScrollArea` | 管理画面左ペイン一覧 |

> **動的テーマカラーの扱い**：カテゴリー・スタンプのテーマカラーは管理者が任意に設定する HEX 値のため、Tailwind の JIT（ビルド時クラス生成）では対応できない。ヘッダー背景など「テーマカラーをそのまま使う」箇所は引き続き `style={{ background: color }}` の inline style を使用する。`cn()` ユーティリティは静的クラスの条件合成にのみ使う（→ ADR-021）。

### 8.3 カテゴリーカードの視覚設計

| 要素 | 実装 |
|------|------|
| ヘッダー背景 | `style={{ background: \`linear-gradient(135deg, ${color}, ${color}cc)\` }}`（inline style 必須） |
| 装飾円 | `absolute` / `rounded-full` / `bg-white/10` を Tailwind クラスで実装 |
| スタンプ数サマリー | `Badge` + `bg-white/20 text-white` で実習件数・講義件数を表示 |
| ホバー効果 | `hover:shadow-lg transition-shadow duration-200` を `Card` に付与 |

### 8.4 スタンプ種別バッジ

| 種別 | Tailwind クラス | 意味 |
|------|---------------|------|
| 実習・演習（practical） | `bg-yellow-50 text-yellow-800 border border-yellow-200` | 手を動かして習得したスキル |
| 講義（lecture） | `bg-slate-100 text-slate-600 border border-slate-200` | 講義で習得した知識 |

### 8.5 カリキュラム年度バッジ（YearBadge）

| 状態 | shadcn/ui + Tailwind | 表示例 |
|------|---------------------|--------|
| 最新年度 | `<Badge className="bg-slate-900 text-slate-50 rounded-full">` | `2025 ★` |
| 旧年度 | `<Badge variant="outline" className="text-muted-foreground rounded-full">` | `2024` |

### 8.6 globals.css の構成

`style.css` を廃止し、Tailwind の設定と CSS 変数をすべて `globals.css` で管理する。

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Noto Sans JP */
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500&display=swap');

@layer base {
  :root {
    /* shadcn/ui のデフォルトテーマ変数（npx shadcn init で自動生成） */
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --primary: 222.2 47.4% 11.2%;
    --primary-foreground: 210 40% 98%;
    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --border: 214.3 31.8% 91.4%;
    --radius: 0.5rem;
    /* ... shadcn init が生成する全変数 */
  }
  body {
    font-family: 'Noto Sans JP', sans-serif;
    @apply bg-background text-foreground;
  }
}

@layer utilities {
  /* Tailwind に含まれない border-dashed ユーティリティは Tailwind 標準クラスで代替 */
  /* dashed → border-dashed（Tailwind 標準） */
}
```

> ホバー効果（カテゴリーカード・スタンプチップ）は `hover:shadow-lg`・`hover:-translate-y-0.5` 等の Tailwind クラスで直接実装するため、カスタム CSS は不要。

### 8.7 StickerModal の拡張（取得学生一覧）（v10.0）

既存の `StickerModal`（§3.4.1）に「取得学生一覧」セクションを追加する。表示は `GET /api/stickers/:id/holders` の結果を使い、表示名クリックで `StudentProfilePage` に遷移する。実名・学籍番号相当の情報は一切表示しない。

### 8.8 StudentDirectory（公開学生一覧）（v10.0 新設）

Navbar から独立した導線でアクセスする。`GET /api/students-public` の結果をカードグリッド（`grid-template-columns: repeat(auto-fit, minmax(180px, 1fr))`）で表示する。各カードはアバター（またはイニシャル）・表示名・一言（`bio`）・公開スタンプ数を表示し、クリックで `StudentProfilePage` に遷移する。

### 8.9 StudentProfilePage（v10.0 新設）

| 要素 | データソース | 備考 |
|------|------------|------|
| アバター | `student_profiles.avatar_image_key` | 未設定時はイニシャルのフォールバック（`CategoryCard` のパターンを踏襲） |
| 表示名・一言 | `users.display_name` / `student_profiles.bio` | |
| SNSリンク | `student_profiles.x_handle` / `linkedin_url` | `target="_blank" rel="noopener noreferrer"` を必須付与 |
| 連絡先メール | `users.contact_email` | `email_public=true` の場合のみ表示 |
| やりたいこと・自由入力スキル | `student_profiles.goal` / `other_skills` | |
| 公開スタンプ一覧 | `student_achievements`（`is_visible=true` のみ） | `StickerIcon` を再利用 |

### 8.10 外部公開プロフィール画面（v11.0。旧キオスクモードを置き換え）

`GET /api/public/profile/:loginId`（8.9 の `StudentProfilePage` と同じレイアウトを再利用）を表示する、ログイン不要の専用ルート（例: `/public/profile/:loginId`）。

- ログイン導線・管理画面へのリンクを表示しない
- 認証ヘッダー不要の素の `fetch`（または `authFetch` のトークン省略版）で呼び出す。JWT・専用トークンいずれも不要
- 表示対象は `external_public=true` の学生のみ。`external_public=false` の場合は「このプロフィールは非公開です」等の案内を表示する（存在自体は秘匿し、404 相当の扱いとする）
- 表示するスタンプは `is_visible=true` の実績のみ（8.9 と同じ絞り込み）
- URLは `login_id` ベースの**固定URL**であり、QRコード・ステッカー・チャームに一度印刷したら変更されない。公開・非公開は `external_public` のON/OFFのみで切り替わる

> **v10.0 のキオスクモード（会場タブレット向け専用ルート `/kiosk?token=...`、`kioskFetch`、`kiosk_public`）は本画面に統合し廃止した**（→ Appendix E: ADR-032）。

---

## 9. 管理画面仕様

### 9.1 認証（LoginScreen）

- ユーザー名・パスワードフォームで `POST /api/auth/login` を呼び出す
- 成功時：`localStorage.setItem('auth_token', token)` と `localStorage.setItem('auth_user', JSON.stringify(user))` に保存
- App の `currentUser` state に `{ id, username, role, displayName }` をセット
- 以降の全 API 呼び出しで `Authorization: Bearer {token}` ヘッダーを付与する
- 401/403 レスポンス時はトークンをクリアして LoginScreen に戻す

> **なぜ JWT + Bearer トークンに変更したか**：Basic 認証（単一共有パスワード）では「誰が」操作したか追跡できず、スタンプの所有者管理ができない。JWT は `sub`（ユーザー ID）と `role` をペイロードに含み、ミドルウェアが所有者チェックをステートレスに行える（→ Appendix E: ADR-016）。

**学生ログイン（v10.0）**：`login_id` とパスワードで `POST /api/auth/login` を呼び出す（エンドポイントは職員と共通）。レスポンスの `user.mustChangePassword` が `true` の場合、フロントエンドは他の画面に遷移させず `PasswordChangeScreen` を強制表示する。パスワード変更 API（`PUT /api/my/profile` の一部、またはパスワード専用に `PUT /api/my/password` を設ける）呼び出し成功後に `must_change_password` を `0` に更新し、通常のギャラリー／マイページ利用に移行する。

### 9.2 ロール別の操作権限マトリクス

| 操作 | admin | user（自分のスタンプ） | user（他者のスタンプ） | student（自分） | student（他者） | 未ログイン |
|------|-------|----------------------|----------------------|------------------|------------------|---------|
| ギャラリー閲覧 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| 管理画面アクセス | ✓ | ✓ | ✓ | ✗ | ✗ | ✗（LoginScreen） |
| カテゴリー 作成・編集・削除 | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ |
| スタンプ 新規作成・編集・削除 | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ |
| ユーザー（職員）管理 | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ |
| 学生 CSV 一括インポート | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ |
| 学生アカウント停止・表示名強制変更 | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ |
| 実績記録（スタンプ取得の記録） | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ |
| キオスクトークン発行・失効 | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ |
| 自分のプロフィール編集 | — | — | — | ✓ | ✗ | ✗ |
| 自分の実績の公開／非公開切り替え | — | — | — | ✓ | ✗ | ✗ |
| 取得学生一覧・公開プロフィールの閲覧 | ✓ | ✓ | ✓ | ✓ | ✓（公開分のみ） | ✗（要ログインまたはキオスクトークン） |

**UI 上の表現**：user ロールが他者のスタンプを選択したとき、編集フォームは表示するが「保存」「削除」ボタンを `disabled` にする（バックエンドでも 403 を返す二重防衛）。学生アカウントで管理画面 URL に直接アクセスした場合はギャラリーにリダイレクトする。

### 9.3 AdminPanel レイアウト（v10.0 更新）

```
┌─────────────────────────────────────────────────────────────┐
│ Navbar  山田 太郎 [user バッジ]  ログアウト                  │
├──────────────────────┬──────────────────────────────────────┤
│ 左ペイン（200px）    │ 右ペイン（残り全幅）                 │
│ カタログ              │ CategoryEditor / StickerEditor /     │
│  🗂 カテゴリー         │ UserEditor / StudentBulkImportEditor │
│  🏷 スタンプ           │ / StudentAccountEditor /             │
│ 職員                   │ AchievementEditor（KioskTokenEditorはv11.0で廃止）│
│  👤 職員アカウント     │ / 非選択時は空白                     │
│ 学生（v10.0）          │                                       │
│  📤 名簿インポート     │                                       │
│  👥 学生アカウント     │                                       │
│  🏅 実績記録           │                                       │
│  🔑 キオスクトークン   │                                       │
└──────────────────────┴──────────────────────────────────────┘
```

すべて 👑 admin のみ表示（「実績記録」のみ 🔑 職員全員に表示、§9.2 参照）。

### 9.4 CategoryEditor フォーム項目

| 項目 | コンポーネント | 備考 |
|------|-------------|------|
| 画像 | `Form.Control type="file"` | POST /api/upload → imageKey をフォームに保持。即時プレビュー表示 |
| Emoji | `Form.Control` | 画像未登録時のフォールバック |
| テーマカラー | `Form.Control type="color"` + プリセット 10 色ボタン | |
| カテゴリー名 | `FloatingLabel + Form.Control`（必須） | |
| 英語名 | `FloatingLabel + Form.Control` | |
| 説明文 | `FloatingLabel + Form.Control as="textarea"` | |
| 対象職種 | `Form.Control`（カンマ区切りテキスト → 配列変換） | |
| 採用担当者向けメッセージ | `FloatingLabel + Form.Control as="textarea"` | |

### 9.4 StickerEditor フォーム項目

| 項目 | コンポーネント | 備考 |
|------|-------------|------|
| 所属カテゴリー | チェックボックス群（`Form.Check`）+ 主カテゴリー指定ボタン | 1件以上必須。★ ボタンで主カテゴリーを指定。主カテゴリーの color を自動反映 |
| 画像・Emoji・テーマカラー | CategoryEditor と同様 | |
| スタンプ ID | `Form.Control` | 新規時のみ編集可。既存は `readOnly` |
| バージョン | `Form.Select`（v01〜v09） | |
| 種別 | `Form.Select`（practical / lecture） | |
| レベル | `Form.Select`（実践 / 知識） | |
| スタンプ名・英語名 | `FloatingLabel + Form.Control` | |
| Can-Do 記述 | `FloatingLabel + Form.Control as="textarea"` | |
| 習得スキル | `Form.Control`（カンマ区切り） | |
| 関連授業 | CourseRow × N（動的追加・削除） | |

### 9.5 CourseRow フォーム項目

| 項目 | コンポーネント | 備考 |
|------|-------------|------|
| 授業名 | `Form.Control`（必須） | |
| 科目コード | `Form.Control` | |
| 種別 | `Form.Select`（practical / lecture / 空） | |
| カリキュラム年度 | `Form.Control type="number"` | 必須 |
| 時間数 | `Form.Control type="number"` | |
| 授業内容メモ | `Form.Control` | |
| 削除 | `Button variant="outline-danger" size="sm"` | |

### 9.6 UserEditor フォーム項目（admin のみ）

| 項目 | コンポーネント | 備考 |
|------|-------------|------|
| ユーザー名 | `FloatingLabel + Form.Control`（必須） | 新規時のみ編集可。既存は `readOnly` |
| 表示名 | `FloatingLabel + Form.Control` | |
| ロール | `Form.Select`（admin / user） | |
| パスワード | `FloatingLabel + Form.Control type="password"` | 新規時必須。既存は空欄＝変更なし |
| パスワード確認 | `FloatingLabel + Form.Control type="password"` | 新規時必須 |

> 自分自身のロールを変更・削除しようとした場合は UI 側でエラーを表示し、API 側でも 400 を返す。

### 9.7 StudentBulkImportEditor フォーム項目（admin のみ、v10.0 新設）

| 項目 | コンポーネント | 備考 |
|------|-------------|------|
| CSVファイル | `Input type="file" accept=".csv"` | ヘッダー行必須（§4.13 参照） |
| インポート実行 | `Button` | `POST /api/students/import` を呼び出す |
| 結果一覧 | 読み取り専用テーブル（login_id・表示名・仮パスワード） | 画面遷移または再読み込みで消える。再表示不可の注意書きを表示する |
| 行エラー一覧 | `Alert variant="warning"` | 行番号とエラー理由を表示 |

### 9.8 StudentAccountEditor フォーム項目（admin のみ、v10.0 新設）

| 項目 | コンポーネント | 備考 |
|------|-------------|------|
| 検索 | `Input`（表示名・login_id） | |
| 一覧 | テーブル（表示名・所属・役職・状態） | 実名は保持しないため表示項目に含まれない |
| 表示名変更 | ダイアログ内 `Input` | 不適切表示名への対応 |
| 状態切り替え | `Button`（有効化／停止） | `student_achievements` は影響を受けない |

### 9.9 AchievementEditor フォーム項目（🔑 職員全員、v10.0 新設）

| 項目 | コンポーネント | 備考 |
|------|-------------|------|
| 学生選択 | `Combobox`（表示名・login_id で検索） | |
| スタンプ選択 | `Select`（カテゴリー絞り込み可） | |
| 取得日 | `Input type="date"` | |
| メモ | `Textarea` | 任意 |
| 記録 | `Button` | `POST /api/achievements` を呼び出す。作成直後は `is_visible=false` |
| 逆引き一覧 | 学生を選択すると、その学生の実績一覧を右側に表示 | 誤記録の削除もここから行う |

### 9.10 ~~KioskTokenEditor~~（v10.0 新設 → v11.0 で廃止）

> `KioskTokenEditor` および `kiosk_tokens` の管理UIは v11.0 で廃止した。就職説明会・オンラインイベントでの学生閲覧は、学生本人の外部公開設定（9.11 の `externalPublic`）と固定URL（`/api/public/profile/:loginId`）に統合したため、admin が発行・失効を管理するトークンという概念自体が不要になった（→ Appendix E: ADR-032）。

### 9.11 MyProfileEditor / MyAchievements フォーム項目（学生本人、v10.0 新設。v11.0 で `externalPublic` に更新）

| 項目 | コンポーネント | 備考 |
|------|-------------|------|
| 表示名 | `Input`（必須） | 実名でなくてよい |
| アバター | `Input type="file"` | `POST /api/upload`（prefix: `students`）を再利用 |
| X ハンドル / LinkedIn URL | `Input` | 任意。簡易フォーマット検証のみ |
| 自由入力スキル・やりたいこと・一言 | `Textarea` | |
| 連絡先メール公開 | `Checkbox`（`email_public`） | オフの場合、`contact_email` はプロフィールに表示されない |
| 取得済みスタンプ一覧 | 読み取り専用リスト＋スタンプごとの `Switch`（`is_visible`） | `PUT /api/my/achievements/:id/visibility` を呼び出す。ONにするとログイン済みの全登録者に公開される |
| 外部公開（QRコード） | `Switch`（`external_public`） | プロフィール単位。ONにすると `is_visible=true` の実績が固定URL（`/public/profile/{loginId}`）でログイン不要に閲覧可能になる。ON時に確認ダイアログで「このQRコード/URLを知っている人は誰でもログインなしで閲覧できます」と明示する（→ ADR-032） |

### 9.12 CRUD 操作と API 呼び出し

| 操作 | API | 認可 | 追加処理 |
|------|-----|------|---------|
| カテゴリー新規作成 | POST /api/categories | 👑 | — |
| カテゴリー更新 | PUT /api/categories/:id | 👑 | 画像変更時は旧 key を削除後にアップロード |
| カテゴリー削除 | DELETE /api/categories/:id | 👑 | 409 の場合は「配下スタンプを先に削除してください」と表示 |
| スタンプ新規作成 | POST /api/stickers | 🔑 | `created_by` は req.user.id を自動設定 |
| スタンプ更新 | PUT /api/stickers/:id | 🔑✋ | courses は洗い替え（バックエンドで処理） |
| スタンプ削除 | DELETE /api/stickers/:id | 🔑✋ | courses は CASCADE で自動削除 |
| ユーザー新規作成 | POST /api/users | 👑 | パスワードを scrypt でハッシュ化して保存 |
| ユーザー更新 | PUT /api/users/:id | 👑 | パスワード空欄時はハッシュを変更しない |
| ユーザー削除 | DELETE /api/users/:id | 👑 | 自分自身の削除は 400 で拒否 |
| 学生 CSV 一括インポート | POST /api/students/import | 👑 | login_id はサーバー側で自動発行 |
| 学生アカウント状態変更 | PUT /api/students/:id/status | 👑 | `student_achievements` は影響を受けない |
| 学生表示名の強制変更 | PUT /api/students/:id/display-name | 👑 | 不適切表示名への対応 |
| 実績記録の新規作成 | POST /api/achievements | 🔑 | `is_visible` は常に `false` で作成 |
| 実績記録の削除 | DELETE /api/achievements/:id | 🔑 | 記録誤りの訂正用 |
| プロフィール更新 | PUT /api/my/profile | 🔑（student） | affiliation・position・graduationYear は不可 |
| 実績公開切り替え | PUT /api/my/achievements/:id/visibility | 🔑✋（student, 本人のみ） | |
| 外部公開切り替え | PUT /api/my/profile（`externalPublic`） | 🔑✋（student, 本人のみ） | ON確認時にダイアログで公開範囲を明示（9.11） |
| 外部公開プロフィール取得 | GET /api/public/profile/:loginId | 公開（認証不要） | `externalPublic=false` の場合は404相当 |

---

## 10. 環境設定

### 10.1 環境変数の管理方針

`.env.example` をテンプレートとして git 管理し、実際の値を持つ `.env` は `.gitignore` 対象とする。

```
.env.example   # テンプレート（git 管理・コメント付き）
.env           # 各環境の実際の値（.gitignore 対象）
```

### 10.2 環境変数一覧

| 変数名 | デフォルト値 | 説明 |
|--------|------------|------|
| `APP_ENV` | `development` | `development` / `staging` / `production` |
| `PORT` | `3000` | Express リッスンポート |
| `DB_PATH` | `./db/stickers.db` | SQLite ファイルパス |
| `UPLOAD_DIR` | `./uploads` | 画像ファイル格納ディレクトリ。起動時に自動作成 |
| `JWT_SECRET` | `change-me-in-production` | JWT 署名鍵。**production では 32 文字以上のランダム文字列に変更必須** |
| `JWT_EXPIRES_IN` | `28800` | JWT 有効期限（秒）。デフォルト 8 時間 |
| `INITIAL_ADMIN_USERNAME` | `admin` | 初回起動時に作成される admin ユーザーの名前 |
| `INITIAL_ADMIN_PASSWORD` | `changeme` | 初回起動時の admin パスワード（**production では必ず変更**） |
| `LATEST_CURRICULUM_YEAR` | `2025` | 最新年度バッジ（★）の基準。年度変わりに更新 |

> **`ADMIN_USERNAME`・`ADMIN_PASSWORD` は v7.3 で廃止**。`INITIAL_ADMIN_*` は初回マイグレーション時のみ使用し、以降のユーザー管理は管理画面の UserEditor で行う。

### 10.3 環境別差分

| 変数 | development | staging（学内） | production（VPS） |
|------|-------------|----------------|------------------|
| `APP_ENV` | `development` | `staging` | `production` |
| `UPLOAD_DIR` | `./uploads` | `/var/lib/SkillsStampConnect/uploads` 等（絶対パス推奨） | 同左 |
| `JWT_SECRET` | `change-me-in-production` | 任意 | **32 文字以上のランダム文字列に変更必須** |
| `INITIAL_ADMIN_PASSWORD` | `changeme` | 任意 | **強いパスワードに変更必須** |
| SSL/TLS | 不要 | 不要 | **必須（Nginx + Let's Encrypt）** |
| Nginx | 不要 | 不要（直接ポート公開） | **必須（リバースプロキシ）** |
| プロセス管理 | nodemon（`npm run dev`） | `npm start`（+ 必要なら systemctl） | `npm start` via systemctl |

> **v7.4 変更**：Docker のボリュームマウント表記を削除。`UPLOAD_DIR` はサーバー上の絶対パス指定を推奨。

### 10.4 package.json 主要依存

```json
{
  "type": "module",
  "engines": { "node": ">=24.0.0" },
  "scripts": {
    "dev":     "concurrently \"nodemon server.js\" \"vite\"",
    "build":   "vite build",
    "start":   "node server.js",
    "migrate": "node db/migrate.js"
  },
  "dependencies": {
    "express": "^4.x",
    "@fastify/busboy": "^3.x",
    "helmet": "^8.x",
    "express-rate-limit": "^7.x",
    "dotenv": "^16.x"
  },
  "devDependencies": {
    "vite": "^5.x",
    "@vitejs/plugin-react": "^4.x",
    "react": "^18.x",
    "react-dom": "^18.x",
    "typescript": "^5.x",
    "@types/react": "^18.x",
    "@types/react-dom": "^18.x",
    "@types/node": "^20.x",
    "tailwindcss": "^3.4.x",
    "autoprefixer": "^10.x",
    "postcss": "^8.x",
    "class-variance-authority": "^0.7.x",
    "clsx": "^2.x",
    "tailwind-merge": "^2.x",
    "lucide-react": "^0.x",
    "concurrently": "^8.x",
    "nodemon": "^3.x"
  }
}
```

> **shadcn/ui のコンポーネントは npm パッケージではない**。`npx shadcn@latest add button` 等の CLI コマンドでソースコードを `components/ui/` にコピーする。`dependencies` への追加は不要。`class-variance-authority`・`clsx`・`tailwind-merge` は shadcn/ui が依存する小さなユーティリティ。

> `node:sqlite`・`node:fs`・`node:crypto`・`node:path` は Node.js 24 組み込みのため `dependencies` への記載不要。

### 10.5 起動手順

```bash
# 初回セットアップ（全環境共通）
cp .env.example .env          # テンプレートをコピーして .env を編集
npm install

# shadcn/ui の初期化（初回のみ）
npx shadcn@latest init        # components.json が既存の場合は上書き不要（N を選択）
npx shadcn@latest add button card dialog badge input label select textarea checkbox alert scroll-area

npm run build                 # Vite で client/dist をビルド
node db/migrate.js            # スキーマ作成 + 初期データ投入

# development（ローカル開発）
npm run dev                   # Vite dev server (5173) + Express (3000) を同時起動

# staging / production
node server.js                # Node.js 24 で直接起動
```

---

## 11. デプロイメント

> **v7.4 変更**：Docker Compose を廃止。Node.js 24 を直接起動する構成に変更。Nginx はサーバーに直接インストールして使用する。

### 11.1 環境別構成

| 環境 | 起動コマンド | Nginx | SSL |
|------|------------|-------|-----|
| development | `npm run dev`（nodemon + Vite 同時起動） | 不要 | 不要 |
| staging（学内） | `npm start`（直接実行）または systemctl | 不要（直接ポート公開） | 不要 |
| production（VPS） | `npm start` via systemctl | **必須**（リバースプロキシ） | **必須** |

### 11.2 サーバー要件

| 項目 | 最小要件 | 推奨 |
|------|---------|------|
| Node.js | 24 LTS | 最新 LTS |
| OS | Ubuntu 22.04 / 24.04 | Ubuntu 24.04 LTS |
| メモリ | 512MB | 1GB 以上 |
| ディスク | 1GB（画像含む） | 5GB 以上 |
| Nginx | 1.24 以上 | 最新安定版 |

### 11.3 セットアップ手順（staging / production 共通）

```bash
# 1. Node.js 24 のインストール（Ubuntu）
curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
sudo apt-get install -y nodejs

# 2. リポジトリ取得
git clone {repo-url} /opt/SkillsStampConnect
cd /opt/SkillsStampConnect

# 3. 環境変数の設定
cp .env.example .env
vi .env   # JWT_SECRET・UPLOAD_DIR・INITIAL_ADMIN_* を編集

# 4. 依存インストール
npm install

# 5. shadcn/ui の初期化（初回のみ）
npx shadcn@latest init
npx shadcn@latest add button card dialog badge input label select textarea checkbox alert scroll-area

# 6. ビルド + DB 初期化
npm run build           # client/dist を生成
node db/migrate.js      # DB 初期化＋初期 admin ユーザー作成

# 5. uploads ディレクトリの準備
mkdir -p /var/lib/SkillsStampConnect/uploads/{categories,stickers}
# .env の UPLOAD_DIR=/var/lib/SkillsStampConnect/uploads に設定
```

### 11.4 起動・停止・サービス化

**npm scripts（package.json）**

```json
"scripts": {
  "dev":   "concurrently \"nodemon server.js\" \"vite client\"",
  "build": "vite build client",
  "start": "node server.js",
  "migrate": "node db/migrate.js"
}
```

| 場面 | コマンド | 説明 |
|------|---------|------|
| 開発 | `npm run dev` | nodemon（自動リスタート）+ Vite dev server を同時起動 |
| 本番ビルド | `npm run build` | `client/dist/` を生成 |
| 本番起動 | `npm start` | `node server.js` を実行。フォアグラウンドで起動 |
| DB 初期化 | `npm run migrate` | スキーマ作成＋初期 admin 作成 |

**systemctl でサービス化する場合**

サーバー再起動後も自動起動させたい場合は systemd unit ファイルを作成する。

```ini
# /etc/systemd/system/SkillsStampConnect.service
[Unit]
Description=SkillsStampConnect
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/SkillsStampConnect
ExecStart=/usr/bin/npm start
Restart=on-failure
RestartSec=5
EnvironmentFile=/opt/SkillsStampConnect/.env

[Install]
WantedBy=multi-user.target
```

```bash
# 登録・起動
sudo systemctl daemon-reload
sudo systemctl enable SkillsStampConnect
sudo systemctl start SkillsStampConnect

# 状態確認・ログ
sudo systemctl status SkillsStampConnect
sudo journalctl -u SkillsStampConnect -f

# .env 変更後の再起動
sudo systemctl restart SkillsStampConnect
```

> **なぜ pm2 でなく systemctl か**：pm2 はグローバルインストールが必要な追加ツールであり、学内サーバー管理者が慣れていない場合がある。systemctl は Ubuntu に標準で備わっており、`journalctl` でログを確認できる OS ネイティブの仕組み。シンプルな構成ほど障害時の原因追跡が容易になる（→ Appendix E: ADR-018 更新）。

### 11.5 staging 構成（学内 HTTP）

```
学内ネットワーク
  └── http://{学内IP}:3000   →  Node.js 24（server.js）
```

- Nginx 不要。Express が直接ポート 3000 でリクエストを受け付ける
- 画像は `/uploads/*` パスで Express が `express.static` で配信
- 学内サーバーに固定 IP を割り当て、`.env` の設定を確認する

### 11.6 production 構成（VPS・HTTPS）

```
インターネット
  ↓ HTTPS (443)
Nginx（SSL 終端・リバースプロキシ）
  └── gallery.example.com  →  localhost:3000（Node.js 24）
        ├── /api/*          JWT 認証が必要な API
        ├── /uploads/*      画像ファイル（Express static）
        └── /*              React SPA（index.html フォールバック）
```

**Nginx 設定（`/etc/nginx/sites-available/SkillsStampConnect`）**

```nginx
server {
    listen 80;
    server_name gallery.example.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name gallery.example.com;

    ssl_certificate     /etc/letsencrypt/live/gallery.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/gallery.example.com/privkey.pem;
    ssl_protocols       TLSv1.2 TLSv1.3;

    client_max_body_size 10m;    # 画像アップロード上限

    location / {
        proxy_pass         http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
    }
}
```

**SSL 証明書（Let's Encrypt）**

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d gallery.example.com
# 自動更新確認
sudo certbot renew --dry-run
```

### 11.7 データ永続化とバックアップ

| データ | パス | バックアップ方法 |
|--------|------|----------------|
| SQLite | `$DB_PATH`（例: `./db/stickers.db`） | `sqlite3 stickers.db ".backup backup.db"`（ホットバックアップ可） |
| 画像ファイル | `$UPLOAD_DIR`（例: `/var/lib/SkillsStampConnect/uploads/`） | `tar czf uploads_$(date +%Y%m%d).tar.gz uploads/` |

cron でバックアップを自動化する例：

```bash
# crontab -e
0 2 * * * cd /opt/SkillsStampConnect && node -e "
  const { DatabaseSync } = require('node:sqlite');
  const db = new DatabaseSync(process.env.DB_PATH);
  db.exec('.backup /backup/stickers_$(date +%Y%m%d).db');
"
0 2 * * * tar czf /backup/uploads_$(date +\%Y\%m\%d).tar.gz $UPLOAD_DIR
```

### 11.8 セキュリティチェックリスト

| 項目 | staging | production |
|------|---------|-----------|
| `JWT_SECRET` | 任意 | **32 文字以上のランダム文字列に変更必須** |
| `INITIAL_ADMIN_PASSWORD` | 任意 | **強いパスワードに変更必須（起動後すぐ管理画面で変更）** |
| SSL/TLS | 不要 | **必須（Let's Encrypt）** |
| `.env` のパーミッション | `chmod 600 .env` | `chmod 600 .env`（必須） |
| uploads ディレクトリ | — | Web 直接アクセス制限不要（Express が制御） |
| ポート 3000 のファイアウォール | 学内制限 | **外部からのアクセスをブロック（Nginx のみ通す）** |
| systemctl の実行ユーザー | 開発者ユーザー | `www-data` 等の専用ユーザー推奨 |
| `git` への `.env` コミット | NG | NG |

> **ポート 3000 のファイアウォール設定（production）**：Nginx がリバースプロキシとして動作するため、Node.js の 3000 番ポートは外部から直接アクセスできないようにする。
> ```bash
> sudo ufw allow 'Nginx Full'
> sudo ufw deny 3000
> ```

## 12. 拡張・将来対応

### 12.1 学生ポートフォリオビュー（v10.0 で実装済み）

v9.0 まで「近中期」の将来拡張としていたが、v10.0 で `StudentProfilePage`（§8.9）・`student_achievements`（§4.10）として実装した。以下は v10.0 でも未実装の関連拡張候補。

- プロフィールの PDF エクスポート（`POST /api/my/profile/export` 等）
- QR コードから直接 `StudentProfilePage` に遷移する導線（§12.2 と連動）
- 取得スタンプの時系列表示（入学からの積み上げをグラフ化）

### 12.2 QR コード連携（近期）

静的 URL を QR コードにする方式を推奨する（動的 QR コード生成は不要）。

```
https://gallery.example.com?search=NSS-WEB-K001v01
```

フロントエンドで URL パラメータを読み取り、検索フィールドに自動セットする。

### 12.3 認証強化の将来拡張

v7.3 で JWT + RBAC（admin / user）を実装済み。以下は追加で必要になった場合の拡張候補。

- パスワードリセット機能（メール送信が必要になる場合）
- ログイン試行回数の制限（ブルートフォース対策）
- JWT リフレッシュトークン（長期セッションが必要になった場合）

### 12.4 マイグレーション管理の強化

現バージョンは `schema_migrations` テーブルで管理している。スキーマ変更時は `db/schema.sql` を直接変更するのではなく、差分 SQL ファイルを追加するパターンへ移行する。

```
db/
  migrations/
    001_schema.sql
    002_seed.sql
    003_add_sticker_tags.sql   ← 将来追加
```

### 12.5 CDN 対応

`S3_PUBLIC_BASE` を CDN の URL に変更するだけで CloudFront / Cloudflare の前段配置が可能。コード変更は不要。

### 12.6 就職説明会マッチング（将来）

企業が「求めるカテゴリーステッカー」を登録し、学生が持つスタンプと照合する機能。カテゴリーステッカーを共通語彙としたマッチングが自然な拡張として成立する。

> **v10.0 キオスクモード（§4.11・§8.10）との違い**：キオスクモードは「企業がトークン限定公開の学生一覧を閲覧する」だけの一方向機能であり、企業からの検索条件登録・自動マッチングは持たない。本節の「マッチング機能」は、企業に何らかの永続アカウントを持たせ双方向の照合を行う、より大きなスコープの拡張として引き続き将来検討とする。

---

## Appendix A：定数一覧

| 環境変数 | デフォルト値 | 説明 |
|---------|------------|------|
| `APP_ENV` | `development` | 環境識別 |
| `PORT` | `3000` | Express ポート |
| `DB_PATH` | `./db/stickers.db` | SQLite ファイルパス |
| `UPLOAD_DIR` | `./uploads` | 画像ファイル格納ディレクトリ |
| `JWT_SECRET` | `change-me-in-production` | JWT 署名鍵 |
| `JWT_EXPIRES_IN` | `28800` | JWT 有効期限（秒） |
| `INITIAL_ADMIN_USERNAME` | `admin` | 初回 admin ユーザー名 |
| `INITIAL_ADMIN_PASSWORD` | `changeme` | 初回 admin パスワード |
| `LATEST_CURRICULUM_YEAR` | `2025` | 最新年度バッジ基準 |

**アプリケーション内定数（v10.0）**

| 定数 | 値 | 説明 |
|------|-----|------|
| 仮パスワード長 | 10文字程度 | CSVインポート時に管理者が用意する値。システム側での自動生成は行わない |
| bio 文字数上限 | 100文字 | プロフィール一言欄。アプリ層でバリデーション |
| login_id プレフィックス | `stu-` | 例: `stu-8f3a2c`（ランダム8文字を付加） |

> `キオスクトークン レート制限`（v10.0、`X-Kiosk-Token` ヘッダー値単位・15分10回）は、キオスクモード廃止（v11.0、ADR-032）に伴い削除。`GET /api/public/profile/:loginId` は認証不要の公開読み取りエンドポイントであり、レート制限の対象は既存の一般的なリクエスト制限方針に従う（本エンドポイント固有の追加レート制限は不要と判断）。

---

## Appendix B：型定義（TypeScript 形式）

```typescript
type StickerType  = "practical" | "lecture";
type StickerLevel = "実践" | "知識";
type UserRole     = "admin" | "user";

interface User {
  id:           string;
  username:     string;
  displayName?: string;
  role:         UserRole;
  stickerCount?: number;   // GET /api/users のみ付与
  createdAt?:   string;
}

interface JwtPayload {
  sub:      string;         // users.id
  username: string;
  role:     UserRole;
  iat:      number;
  exp:      number;
}

interface Course {
  id:             string;
  stickerId:      string;
  name:           string;
  code?:          string;
  type?:          StickerType;     // null の場合は親 sticker.type を継承
  hours?:         number;
  curriculumYear: number;
  contentNote?:   string;
  sortOrder?:     number;
}

interface StickerCategory {
  id:       string;
  name:     string;
  areaCode: string;
  color:    string;
}

interface Sticker {
  id:                string;       // NSS-{AREA}-{TYPE}{SEQ}{VER}
  primaryCategoryId: string;       // 表示色・ID AREA の基準
  categories:        StickerCategory[];   // 全所属カテゴリー（primaryCategory 含む）
  createdBy:         { id: string; displayName: string } | null;
  name:        string;
  nameEn?:     string;
  type:        StickerType;
  color:       string;             // HEX 例: "#2563EB"
  emoji:       string;
  imageKey:    string | null;      // ファイルパスキー
  imageUrl:    string | null;      // API レスポンス時に組み立て済み URL
  description: string;             // Can-Do 記述
  skills:      string[];
  level:       StickerLevel;
  version:     string;             // 例: "v01"
  sortOrder?:  number;
  courses:     Course[];
  createdAt?:  string;
  updatedAt?:  string;
}

interface Category {
  id:             string;
  name:           string;
  nameEn?:        string;
  areaCode:       string;          // スタンプ ID の AREA 部分
  emoji:          string;
  color:          string;
  imageKey:       string | null;
  imageUrl:       string | null;
  description:    string;
  targetRoles:    string[];
  recruitMessage?: string;
  sortOrder?:     number;
  stickerCount?:  number;          // GET /api/categories のみ付与
  createdAt?:     string;
  updatedAt?:     string;
}

// ── v10.0 追加 ──────────────────────────────────────────

type UserRoleV10 = "admin" | "user" | "student";
type AccountStatus = "active" | "suspended";

interface StudentProfile {
  loginId:         string;
  displayName:      string;         // 実名ではなく本人設定の表示名
  affiliation?:     string;
  position?:        string;         // 学年等
  graduationYear?:  number;
  contactEmail?:    string;
  emailPublic:      boolean;
  avatarImageKey?:  string | null;
  xHandle?:         string | null;
  linkedinUrl?:     string | null;
  otherSkills?:     string;
  goal?:            string;
  bio?:             string;
  externalPublic:   boolean;          // v11.0: kioskPublic を置き換え。ログイン不要の外部公開（QRコード等）への同意
  achievements:     PublicAchievement[];   // is_visible=true のみ
}

interface PublicAchievement {
  stickerId:   string;
  stickerName: string;
  acquiredDate?: string;
}

interface MyAchievement {
  id:            string;
  stickerId:     string;
  stickerName:   string;
  acquiredDate?: string;
  isVisible:     boolean;
}

interface StudentAccountAdminView {
  id:             string;           // users.id
  loginId:        string;
  displayName:    string;
  affiliation?:   string;
  position?:      string;
  status:         AccountStatus;
  createdAt:      string;
}

// KioskToken インターフェースは v11.0 で廃止（→ ADR-032）。kiosk_tokens テーブル自体が削除されたため。

interface StudentImportResult {
  loginId:      string;
  displayName:  string;
  tempPassword: string;             // 一度限りの表示。保存しない
}
```

---

## Appendix C：責務分担表

| データ種別 | 格納先 | 理由 |
|-----------|--------|------|
| カテゴリーメタデータ | SQLite | 構造化・外部キー制約が必要 |
| スタンプメタデータ | SQLite | 同上 |
| 授業情報 | SQLite | 年度・科目コードでの絞り込みが必要 |
| スタンプ画像 | `uploads/stickers/`（ローカル） | バイナリ配信・DB 肥大化回避 |
| カテゴリー画像 | `uploads/categories/`（ローカル） | 同上 |
| ファイルパスキー | SQLite（`image_key` 列） | メタデータとバイナリの結合点。実装変更に対して安定 |
| 認証トークン | ブラウザ `localStorage` | Basic 認証の Base64 トークンを一時保存 |
| 学生プロフィール・実績記録（v10.0） | SQLite（`student_profiles`・`student_achievements`） | 構造化データ・外部キー制約が必要。実名は保持しない |
| 学生アバター画像（v10.0） | `uploads/students/`（ローカル） | 他の画像種別と同じ規則（§6.2） |
| CSVインポート元ファイル（v10.0） | システムには保存しない | アップロード直後にパースし、ファイル自体は永続化しない。実名の原本管理は大学側の責任範囲 |

> `kiosk_tokens`（v10.0）の行は v11.0 でテーブル自体が廃止されたため削除した（→ ADR-032）。

---

## Appendix D：設計判断ログ

### v9.0 → v8.0

| 判断 | 理由 |
|------|------|
| `multer` → `@fastify/busboy` | multer v1.x の `dicer` 依存に高severity脆弱性（GHSA-wm7h-9275-46v2）。multer v3.x は alpha 版のため、`@fastify/busboy` を直接使用する方式を採用 |
| `"vite client"` → `"vite"` | `"vite client"` で起動するとViteが `client/` をカレントとして動くため、プロジェクトルートの `postcss.config.js` / `tailwind.config.ts` が読まれず Tailwind が適用されない |
| `postcss.config.js` / `tailwind.config.ts` を `client/` 内にも配置 | `root: 'client'` の場合、Viteは `client/` 内の PostCSS 設定を探す。`client/tailwind.config.ts` の `content` パスは `client/` 基準（`./index.html`, `./src/**`）にする |
| `authFetch` の `FormData` 対応 | `Content-Type: application/json` を常に設定していたため `FormData` の `multipart/form-data; boundary=...` が上書きされ画像アップロードが失敗していた |
| `CourseRow` の授業内容メモを `Textarea` に変更 | 授業内容の説明は複数行にわたることが多く、1行テキストでは入力しにくい |
| `Navbar` のモバイル対応 | `container mx-auto` と固定幅要素が320px幅でオーバーフローしていた |

### v8.0 → v7.5

| 項目 | v7.5 | v8.0 | 判断理由 |
|------|------|------|---------|
| フロント言語 | JavaScript（JSX） | **TypeScript（TSX）** | shadcn/ui の最適構成は TypeScript。型安全性の向上とエディタサポートの強化 |
| CSS フレームワーク | Bootstrap 5.3 + react-bootstrap | **Tailwind CSS 3.4** | ユーティリティファーストで Tailwind に慣れた開発者に直感的。shadcn/ui との親和性 |
| UI コンポーネント | react-bootstrap | **shadcn/ui**（Radix UI ベース） | アクセシビリティ・モダンなデザイン・コードの完全所有権。ダイアログのポータル・フォーカストラップが自動 |
| モーダル実装 | Bootstrap CSS クラスを React state で切り替え | **shadcn/ui `Dialog`**（Radix UI） | ポータル・ESC 閉鎖・フォーカストラップ・スクロールロックが自動処理され実装コスト削減 |
| スタイル管理 | `style.css`（最小限のカスタム CSS） | **`globals.css`**（Tailwind + CSS 変数） | Bootstrap クラスを Tailwind ユーティリティに置換。カスタム CSS を原則なくす |
| 動的カラー | inline style（Bootstrap と組み合わせ） | **inline style 継続**（Tailwind JIT の制約のため） | 管理者が任意設定する HEX 値はビルド時に確定しないため JIT で対応不可。inline style は例外的に許容 |
| バックエンド | v7.5 と同一 | **変更なし** | フロントエンドの技術選定変更はバックエンドに影響しない |

### v7.5 → v7.4

| 項目 | v7.4 | v7.5 | 判断理由 |
|------|------|------|---------|
| カテゴリー紐づけ | 1対多（`stickers.category_id`） | **多対多（`sticker_categories` 中間テーブル）** | スタンプが複数のカテゴリーに属する実運用ニーズに対応 |
| 主カテゴリー | なし（`category_id` が唯一の関係） | **`primary_category_id` を stickers に追加** | スタンプ ID の AREA コードと表示色の決定基準が必要 |
| `categories` テーブル | `area_code` なし | **`area_code` 列を追加**（例: `'WEB'`, `'AI'`） | スタンプ ID 生成に使う AREA を categories 側で管理する |
| ギャラリー表示 | スタンプは 1 カテゴリーカードのみに表示 | **全所属カテゴリーのカードに表示**（主カテゴリーは通常表示、それ以外は薄く） | 複数カテゴリー所属を視覚的に表現しつつ主カテゴリーを明示 |
| StickerEditor フォーム | `Form.Select`（単一選択） | **チェックボックス群 + 主カテゴリー指定** | 多対多に対応した UI |
| スタンプ更新トランザクション | courses のみ洗い替え | **`sticker_categories` + `courses` の両方を洗い替え** | 同一パターン（ADR-012）を categories にも適用 |

### v7.4 → v7.3

| 項目 | v7.3 | v7.4 | 判断理由 |
|------|------|------|---------|
| セキュリティ対策 | 認証・認可のみ | **XSS・インジェクション・パストラバーサル等を必須仕様として明文化** | 学内公開ツールとして外部からアクセスされる可能性があり、基本的なセキュリティ対策は設計段階で要件に含める必要がある |
| HTTP ヘッダー | 未定義 | **helmet による CSP・X-Frame-Options 等を必須実装** | OWASP 推奨ヘッダーを個別設定すると漏れが生じる。helmet で一括設定することで設定漏れを防ぐ |
| レート制限 | 未定義 | **ログイン API に express-rate-limit を必須適用** | ブルートフォース攻撃への対策として必須 |
| Docker Compose | 使用（v7.2 で minio 等を削除済み） | **廃止**。Node.js 24 直接起動に変更 | Docker を使わない運用が前提と確認された。Dockerfile・docker-compose.yml を削除することで管理対象ファイルが減り構成がシンプルになる |
| デプロイメント | Docker Compose で管理 | **`npm start`（+ systemctl）+ Nginx 直接インストール** | Node.js 24 直接起動。pm2 は不要で `npm start` = `node server.js` で十分。サービス化は OS 標準の systemctl |
| Nginx | Docker コンテナ（production のみ） | **サーバーに直接インストール** | Docker を廃止したため。設定の変更も systemctl reload で即時反映できる |
| Dockerfile | マルチステージビルド定義あり | **削除** | Docker を使わないため不要 |

### v7.3 → v7.2

| 項目 | v7.2 | v7.3 | 判断理由 |
|------|------|------|---------|
| 認証方式 | HTTP Basic 認証（単一共有パスワード） | **JWT（HS256）+ per-user ログイン** | 複数教員が個別のスタンプを登録・管理する要件が加わり、「誰が」操作したかの追跡が必要になった。所有者管理には per-user 認証が必須（→ ADR-016） |
| パスワードハッシュ | なし（単一パスワードを環境変数に平文保存） | **node:crypto の `scrypt`** | bcrypt 相当のセキュリティを npm パッケージなしで実現できる。Node.js 24 組み込みで依存なし |
| JWT 署名 | なし | **node:crypto の HMAC-SHA256** | `jsonwebtoken` パッケージなしで JWT を実装できる。`createHmac('sha256', secret)` で HS256 署名 |
| `users` テーブル | なし | **新設** | ユーザー管理に必要。`password_hash` は scrypt 形式で保存 |
| `stickers.created_by` | なし | **追加（NULL 可）** | 所有者チェックに使用。NULL のスタンプは admin のみ操作可 |
| 環境変数 | `ADMIN_USERNAME` / `ADMIN_PASSWORD` | **`JWT_SECRET` / `INITIAL_ADMIN_*`** | 単一パスワードから per-user 管理へ移行。初回マイグレーション時のみ `INITIAL_ADMIN_*` を使用 |
| `routes/` 構成 | categories / stickers / upload | **authRoutes / categories / stickers / users / upload** | `authRoutes.js` と `users.js` を追加 |

### v7.2 → v7.1

| 項目 | v7.1 | v7.2 | 判断理由 |
|------|------|------|---------|
| 画像ストレージ | MinIO（S3 互換）+ AWS SDK v3 | **ローカルファイルシステム（`uploads/`）** | 学内ツール規模では MinIO コンテナの維持コストが効果に見合わない。Node.js 24 の `fs` と `express.static` で完結する（→ ADR-015） |
| アップロード方式 | Presigned PUT URL（2 ステップ） | **POST /api/upload multipart（1 ステップ）** | ストレージ変更に伴い Presigned URL の存在意義がなくなった。フロントエンドのコードもシンプルになる |
| Docker サービス数 | 4（app・minio・mc-init・nginx） | **2（app・nginx）** | minio と mc-init が不要になった |
| 環境変数 | 12 変数 | **7 変数**（`S3_*` 6 変数を削除） | ストレージ設定が不要になり環境設定が大幅にシンプルになる |

### v7.1 → v7.0

| 項目 | v7.0 | v7.1 | 判断理由 |
|------|------|------|---------|
| フロントエンド構成 | 単一 App.jsx を基本方針とし800行超で分割を検討 | **`components/` 分割構成を採用** | 保守性・可読性を優先。責務境界・import 方向・props 命名規則を SDD で明示することで、分割後の一貫性を担保する |
| `common/` の定義 | 未定義 | **ギャラリー・管理画面の両方から使われる表示専用コンポーネント** | 配置基準が曖昧だと `common/` が肥大化する。「両方から使われる」かつ「表示専用」の 2 条件を満たすものに限定 |
| import の方向 | 未定義 | **一方向規則を明示（App → components、common は被依存のみ）** | 循環参照を防ぐ。循環が起きた場合は状態管理の所在を見直すシグナルとして扱う |
| `AdminPanel` の役割 | Editor コンポーネントが API 呼び出しを担当 | **API 呼び出しと CRUD ハンドラを AdminPanel に集約** | Editor を「フォーム UI のみ」に限定することで再利用性を高める。副作用（fetch）を上位コンポーネントに集める設計原則に従う |

### v6.0 → v7.0

| 項目 | v6.0 | v7.0 | 判断理由 |
|------|------|------|---------|
| フロントエンド構成 | ファイル分割を前提 | 単一 App.jsx を基本（→ v7.1 で撤回） | 学内ツール規模での実装速度・可読性を優先（v7.1 で保守性を優先して変更） |
| courses.type | stickers.type と別管理（必須） | **省略可（NULL → 親 type 継承）** | 実運用で常に一致するため冗長。将来の混在ケースに備えて列は残す |
| DELETE /api/image/:key | パス設計が曖昧 | **`:key(*)` ワイルドカード** で明示 | スラッシュを含む S3 キーを正しく受け取るための明示化 |
| Presigned URL フロー | 文字説明のみ | **図解**を追加 | 実装者の誤解を防ぐ |
| マイグレーション | schema.sql を直接実行 | `schema_migrations` テーブルで管理 | 再実行時の冪等性を保証 |
| 認証トークンの保持 | 未定義 | `localStorage` に Base64 トークンを保存 | 管理画面でのページリロード後も認証状態を維持するため |

---

## Appendix E：アーキテクチャ決定録（ADR）

各 ADR は「何を決めたか」ではなく「**なぜそう決めたか**」を記録する。将来の変更を検討する際に、元の判断の前提が変わったかどうかを確認するために使う。

---

### ADR-001：物理スタンプと Web ギャラリーの並存

**ステータス**：採用

**文脈**  
スキル可視化のツールとして、デジタルバッジシステム（Open Badges 等）が先行事例として存在する。デジタル完結のアプローチも検討した。

**決定**  
物理スタンプを一次成果物とし、Web ギャラリーはそのリファレンスとして位置付ける。両者を代替ではなく補完関係で設計する。

**理由**
- デジタルバッジシステムはプラットフォームへのロックインと退出障壁（アカウント消滅・サービス終了）のリスクを持つ。物理スタンプはプラットフォームに依存しない
- 就職説明会では企業ブースにリアルな物体を貼付することで、学生との会話のきっかけとして機能する。QR コードだけでは視覚的な訴求力がない
- 小規模・地方の中小企業はデジタルバッジシステムへの登録・契約コストを負担できない場合がある。物理スタンプ + 公開 Web URL という組み合わせは参入コストがゼロ
- 物理スタンプは学生が手元に積み上げられる有形の達成感を持てる。デジタルのみでは「取得した実感」が薄れる

**検討した代替案**
- Open Badges / Credly 等のデジタルバッジ専用プラットフォーム → 中小企業の参入障壁・ベンダーロックインが課題
- QR コード付き紙カードのみ → Web ギャラリーがなければスキルの詳細説明ができない

**トレードオフ**  
物理スタンプの印刷・管理コストが発生する。ただし既存の授業スタンプ文化が大学に根付いていれば追加コストは軽微。

---

### ADR-002：データベースとして SQLite を選択

**ステータス**：採用

**文脈**  
専門職大学の学内ツールとして運用する。同時接続ユーザー数は教員数名・閲覧ユーザーは学生数百名・企業担当者。書き込みは教員のみ（管理画面）。

**決定**  
`node:sqlite`（Node.js 24 組み込み）を使用した SQLite を採用する。

**理由**
- 学内ツール規模での同時書き込みは「教員が管理画面を操作する」ケースのみ。WAL モードで同時読み取りに対応できる
- 別プロセスの DB サーバー（PostgreSQL / MySQL）は Docker Compose の複雑度を増やし、バックアップ手順も煩雑になる。SQLite はファイル 1 つで完結し `cp` でバックアップできる
- `node:sqlite` は Node.js 24 に組み込まれており npm パッケージが不要。依存関係の管理が簡素化される
- スキーマ変更時のマイグレーションが SQL ファイルとして管理でき、チームでレビューしやすい

**検討した代替案**
- PostgreSQL → 過剰スペック。Docker Compose に DB コンテナを追加する必要がある
- better-sqlite3 (npm) → Node.js 24 組み込みで済むため不要

**トレードオフ**  
同時書き込みが増えた場合（将来の学生ポートフォリオ機能等）には PostgreSQL への移行が必要になる。その際のマイグレーションコストは数日程度と想定。

---

### ADR-003：node:sqlite の同期 API（DatabaseSync）を採用

**ステータス**：採用

**文脈**  
`node:sqlite` は同期 API（`DatabaseSync`）と非同期 API の両方を提供する。Node.js のイベントループをブロックする同期 API は通常の HTTP サーバーでは忌避される。

**決定**  
`DatabaseSync`（同期 API）を採用する。

**理由**
- 学内ツール規模での同時リクエスト数は数十件以下。イベントループのブロック時間（SQLite クエリの実行時間）は数ミリ秒以下であり実用上問題にならない
- 非同期 API と比較してコードが簡潔になる（`await` 不要・エラーハンドリングが try/catch で完結）
- トランザクションの書き方が直感的（`db.exec('BEGIN')` → 処理 → `db.exec('COMMIT')`）

**検討した代替案**
- 非同期 API → 高負荷時のスループット向上が期待できるが、学内ツール規模では過剰

**トレードオフ**  
高同時接続（秒間数十リクエスト以上の DB アクセス）が発生する規模になった場合はパフォーマンスが問題になる可能性がある。その場合は非同期 API または PostgreSQL へ移行する。

---

### ADR-004：Bootstrap 5.3 + 動的カラーのみ inline style

**ステータス**：採用

**文脈**  
カテゴリーとスタンプはそれぞれ独自のテーマカラーを持つ。このカラーは管理画面から動的に設定され、数十種類存在しうる。

**決定**  
レイアウト・フォーム・バッジ等は Bootstrap 5.3 のユーティリティクラスを使い、テーマカラーが関わる部分のみ `style={{ background: color }}` のインラインスタイルを使う。

**理由**
- CSS カスタムプロパティ（`--bs-primary` 等）の上書きはドキュメント全体に影響するため、コンポーネントごとに異なる色を設定できない
- Tailwind CSS の JIT モードでは動的クラス名が事前生成されないため `bg-[#2563EB]` のような動的クラスが機能しない
- Bootstrap 5.3 の `*-subtle` / `*-emphasis` カラーユーティリティで種別バッジ（実習・講義）の配色を賄える
- インラインスタイルの使用範囲を「動的テーマカラーのみ」に限定することで、静的スタイルとの混在を最小化できる

**検討した代替案**
- Tailwind CSS → 動的カラーの制約が問題になる。学内ツールとしてはBootstrapの方が教員が慣れている可能性が高い
- CSS-in-JS（styled-components 等）→ ビルド依存が増える

---

### ADR-005：ローカルファイルシステムへの直接アップロード（v7.2 変更）

**ステータス**：採用（v7.2 で Presigned URL 方式から変更）

**文脈**  
v7.1 まで Presigned PUT URL 方式（ブラウザ → S3 直接送信）を採用していたが、ストレージ自体をローカルファイルシステムに変更した（ADR-015 参照）。これに伴いアップロード方式も見直した。

**決定**  
`POST /api/upload`（multipart/form-data）でブラウザからファイルを受け取り、`multer` で一時保存後に `uploads/{prefix}/{uuid}.{ext}` へ移動する。

**理由**
- ストレージがローカルファイルシステムになったため、ブラウザが直接書き込む経路（Presigned URL）は存在しない
- `multer` は Express 向けの標準的な multipart パーサーであり、ファイルサイズ制限・MIME タイプ検証が容易
- フロントエンドのアップロードコードが「GET presign → PUT to S3」の 2 ステップから `POST /api/upload` の 1 ステップになり、シンプルになる
- スタンプ画像のサイズは通常 1MB 以下であり、Express のメモリを圧迫しない

**検討した代替案**
- Node.js 24 の `Request.formData()` で multer を使わず処理する → Express との統合が複雑になる

**トレードオフ**  
画像バイナリが Express プロセスのメモリを通過する。5MB のファイルサイズ制限と同時接続数の制限で実用上は問題ない。将来的に大容量ファイルや高頻度アップロードが必要になった場合は S3 互換ストレージへの移行を検討する（移行時のコードへの影響は `lib/imageStore.js` と `routes/upload.js` のみ）。

---

### ADR-006：`target_roles` / `skills` を JSON 列（TEXT 型）で管理

**ステータス**：採用

**文脈**  
対象職種（target_roles）は 1〜5 件程度の文字列リスト、習得スキルタグ（skills）は 3〜10 件程度の文字列リスト。これらを DB で管理する方法として、正規化（別テーブル）か非正規化（JSON 列）の選択がある。

**決定**  
TEXT 型で JSON 配列を格納し、アプリ層で `JSON.parse/stringify` する。

**理由**
- 対象職種・スキルタグは単体で検索・集計される要件がない（検索はクライアントサイドの全文検索で賄う）
- 別テーブルへの正規化は JOIN が増えコードが複雑になる割に、得られるメリット（集計・外部キー制約）が現時点で不要
- SQLite の `json_each()` 関数で将来的に DB 側での絞り込みも可能

**検討した代替案**
- `category_target_roles` テーブルを正規化して作成 → JOIN が増え読み取りクエリが複雑になる

**トレードオフ**  
スキルタグ単体での検索・集計（「このスキルを持つスタンプ一覧」等）をバックエンドで行いたい場合は、正規化またはインデックス付き JSON 列への移行が必要になる。

---

### ADR-007：表示順を `sort_order` カラムで管理

**ステータス**：採用

**文脈**  
カテゴリーとスタンプの表示順をどのカラムで制御するか。`created_at` 順、`name` 順、専用の順序カラムの 3 択がある。

**決定**  
`sort_order INTEGER DEFAULT 0` カラムを追加し、教員が管理画面から任意に制御できるようにする。

**理由**
- 表示順は「就職説明会で企業が重視するスキル領域の優先順位」という教員の判断を反映する必要がある
- `created_at` 順では、後から追加したカテゴリーが常に末尾になる。重要なカテゴリーを先頭に表示したい場合に対応できない
- `name` 順はアイウエオ順になり、重要度との相関がない

**トレードオフ**  
管理画面で `sort_order` の入力フォームが必要になる。初期値はすべて 0 のため、明示的に変更しない限り `created_at` 順と同じになる。将来的にはドラッグ＆ドロップで並び替えられる UI も検討する。

---

### ADR-008：カテゴリー削除時の配下スタンプ確認と 409 返却

**ステータス**：採用

**文脈**  
categories テーブルと stickers テーブルは外部キー関係にある。カテゴリーを削除した場合、配下スタンプの `category_id` が孤立する。

**決定**  
`DELETE /api/categories/:id` では、配下スタンプが 1 件以上存在する場合に 409 を返し削除を拒否する。カスケード削除は行わない。

**理由**
- スタンプは物理スタンプと 1:1 対応しており、親カテゴリーの削除と一緒に静かに消えてしまうのは危険。教員が意図せずスタンプを削除するリスクを防ぐ
- 409（Conflict）は「現在の状態では操作を実行できない」という HTTP の標準的な意味に合致する
- 正しい操作順序（スタンプを先に削除 → カテゴリーを削除）をエラーメッセージで明示することでユーザーを誘導できる

**検討した代替案**
- ON DELETE CASCADE でスタンプも一緒に削除 → 教員の操作ミスで物理スタンプと対応するギャラリーページが消えるリスクが高い
- 配下スタンプを別カテゴリーに強制移動 → どのカテゴリーに移すかの判断を自動化できない

---

### ADR-009：カリキュラム年度を独立した管理軸として設計

**ステータス**：採用

**文脈**  
同一スタンプ（同一の物理スタンプ ID）が複数年度の授業に対応することがある。カリキュラム改訂時に授業内容・科目コード・時間数が変わっても、スタンプの示す「スキル」は本質的に同じである場合が多い。

**決定**  
`curriculum_year` カラムを courses テーブルに設け、同一 sticker_id に複数年度の courses が共存することを正常状態とする。

**理由**
- 旧年度の courses を削除すると、その年度に物理スタンプを取得した学生が自分のスタンプの根拠（どの授業で何を学んだか）をギャラリーで確認できなくなる
- 年度別の授業内容の変遷を記録しておくことは、カリキュラム研究・改訂の証跡としても価値がある
- スタンプの `version` は「スキルの定義が変わった」ときにインクリメントする軸。`curriculum_year` は「同じスキルを別の授業で扱う年度」の軸。これらは独立している

**トレードオフ**  
courses の件数が年度数 × スタンプ数に比例して増加する。ただし数百件規模では SQLite のパフォーマンスに影響しない。

---

### ADR-010：スタンプ ID の不変ポリシー

**ステータス**：採用

**文脈**  
スタンプの内容が改訂された場合、ID を変更するか、VER をインクリメントするかの選択がある。

**決定**  
一度発行した ID は変更しない。内容の大幅な改訂時は `version` をインクリメント（v01 → v02）して新スタンプとして発行し、旧スタンプはギャラリーに残す。

**理由**
- 物理スタンプは印刷物であり、ID を変更しても現物を差し替えることができない
- QR コードや URL に ID が含まれている場合、ID 変更はリンク切れを引き起こす
- 旧 ID の物理スタンプを持つ学生（旧カリキュラム履修者）が自分のスタンプを検索したときに該当ページが見つからなくなる事態を防ぐ
- バージョン管理を VER で行うことで「同じスキル領域の新旧スタンプ」がギャラリーで比較できる

**トレードオフ**  
廃止されたスタンプがギャラリーに残り続ける。将来的に `is_archived` フラグを追加してデフォルト非表示にすることが選択肢になる。

---

### ADR-011：DB にはファイルパスキーのみ保存、URL はサーバーで組み立てる

**ステータス**：採用（v7.2 で S3 キー → ファイルパスキーに変更、設計原則は同一）

**文脈**  
画像の配信 URL をどこで管理するか。DB に完全な URL を保存する方式と、キーのみ保存して URL はサーバーで組み立てる方式がある。

**決定**  
DB の `image_key` 列にはファイルパスキー（例: `stickers/uuid.png`）のみ保存する。URL は `imageUrl(key)` 関数が `/uploads/{key}` を返す。

**理由**
- ストレージの実装（ローカルファイルシステム / S3 等）が変わっても、DB のレコードを更新せずに `lib/imageStore.js` の `imageUrl` 関数だけ変更すれば対応できる
- フロントエンドは API レスポンスの `imageUrl` を使うだけでよく、URL の組み立てロジックを持たなくて済む
- この設計原則は v7.1（S3 キー）から変わらず、格納する値がローカルパスキーに変わったのみ

---

### ADR-012：courses の更新を DELETE+INSERT 洗い替え方式で実装

**ステータス**：採用

**文脈**  
スタンプの PUT リクエストで授業情報を更新する方式として、差分更新（追加・変更・削除を識別）と全件洗い替えの 2 択がある。

**決定**  
`DELETE FROM courses WHERE sticker_id = ?` で全削除後、リクエストボディの courses を全件 INSERT する（洗い替え方式）。

**理由**
- 差分更新はクライアントが「追加/変更/削除」を識別してサーバーに送る必要があり、フロントエンドの状態管理が複雑になる
- 授業情報は 1 スタンプあたり多くても 5〜10 件程度であり、洗い替えのコストは無視できる
- 「現在の全 courses をそのまま送信する」という単純なインターフェースにすることでバグが生じにくい
- トランザクションで DELETE → INSERT を包むことで中間状態（削除だけされて INSERT 前の状態）が外部から見えることを防げる

**トレードオフ**  
courses の件数が非常に多い場合（数百件）は洗い替えのコストが問題になる可能性がある。ただし現在の設計ではその規模に至る前にデータモデルの見直しが必要になる。

---

### ADR-013：認証方式として HTTP Basic 認証を採用

**ステータス**：採用

**文脈**  
管理画面（POST/PUT/DELETE エンドポイント）の認証方式として、HTTP Basic 認証・JWT・セッション認証の選択がある。

**決定**  
HTTP Basic 認証（単一ユーザー：ADMIN_USERNAME / ADMIN_PASSWORD）を採用する。

**理由**
- 管理者は教員数名であり、当面は単一の管理者アカウントで運用する
- JWT やセッション認証は実装・管理のオーバーヘッドが大きい（リフレッシュトークン管理・セッションストア等）
- HTTPS 前提（production）であれば Basic 認証トークン（Base64）の盗聴リスクは Nginx の TLS が解決する
- Express ミドルウェアで数十行で実装でき、`Authorization` ヘッダーを使うため追加ライブラリが不要

**移行トリガー**  
以下の条件のいずれかが発生した場合は JWT + RBAC への移行を検討する。
- 教員が複数人になり権限の分離（閲覧のみ / 編集可）が必要になった
- パスワードのローテーションを個別に管理したくなった
- ログイン履歴の記録が必要になった

---

### ADR-014：staging 環境（学内）では SSL/Nginx を不要とする

**ステータス**：採用

**文脈**  
staging 環境は学内サーバーで運用し、アクセス元は学内ネットワークのみ。production 環境（VPS・外部公開）では HTTPS が必須。

**決定**  
staging 環境では Nginx を使わず、Express と MinIO を直接ポート公開する（HTTP）。Nginx と SSL は production プロファイルのみで有効にする。

**理由**
- 学内ネットワーク内での通信であれば TLS がなくても盗聴リスクは限定的
- Nginx + Let's Encrypt の構成は外部ドメインと公開 IP が必要。学内サーバーには適用できないケースがある
- SSL の不要な staging 環境で Nginx を必須にすると、docker-compose の複雑度が増す
- `docker compose --profile production up -d` と `docker compose up -d` で切り替えられる構成にすることで、staging では余分なサービスが起動しない

**トレードオフ**  
学外からのアクセスが必要になった場合（リモート教員・学外インターン等）は production 構成への移行が必要。その際は `S3_PUBLIC_BASE` の変更も伴う。

---

### ADR-015：S3 互換ストレージを廃止しローカルファイルシステムに変更（v7.2）

**ステータス**：採用

**文脈**  
v7.1 まで画像ストレージとして MinIO（S3 互換）を Docker コンテナで運用し、AWS SDK v3 経由で操作していた。「画像ファイル保存用のフォルダに集約すれば S3 互換ストレージは不要では」という指摘を受けて見直した。

**決定**  
S3 互換ストレージ（MinIO・AWS SDK）を廃止し、Node.js 24 組み込みの `fs` モジュールと Express の `express.static` によるローカルファイルシステム方式に変更する。

**理由**
- 学内ツール規模では画像の同時配信要求が少なく、Express の `express.static` で十分な配信性能が得られる
- MinIO コンテナ・バケット初期化スクリプト・AWS SDK のセットアップコストがなくなり、Docker Compose のサービス数が 4 つ（app・minio・mc-init・nginx）から 2 つ（app・nginx）に減る
- `S3_ENDPOINT`・`S3_PUBLIC_BASE`・`S3_ACCESS_KEY`・`S3_SECRET_KEY`・`S3_BUCKET`・`S3_REGION` の 6 変数が不要になり、環境設定が大幅にシンプルになる
- アップロードフローが「GET /api/presign → PUT to MinIO → POST /api/stickers」の 2 ステップから「POST /api/upload → POST /api/stickers」の 1 ステップになる
- Node.js 24 は `fs/promises`（`rename`・`unlink`・`mkdir`）が組み込みであり、追加ライブラリなしでファイル操作が完結する（`multer` はファイル受信専用の最小限の依存）
- バックアップが SQLite と同様に `tar` でシンプルに取得できる

**検討した代替案**
- MinIO を継続使用 → 学内ツール規模での維持コストに見合わない
- S3 互換をオプション化（環境変数で切り替え）→ 両方のコードパスを維持する複雑さが増す。スコープ外の機能を SDD に残すべきでない

**トレードオフと移行パス**  
将来的に以下の状況が発生した場合は S3 互換ストレージへの移行を検討する。

| 移行トリガー | 対応方法 |
|------------|---------|
| 複数サーバーへのスケールアウト | 共有ストレージが必要になる → `lib/imageStore.js` を S3 実装に差し替え |
| CDN 配信が必要な画像量 | `imageUrl()` の返り値を CDN URL に変更するだけで対応可能 |
| 大容量ファイル（動画等）の追加 | `multer` のサイズ制限を緩和するか S3 直接アップロードに戻す |

`lib/imageStore.js` の `saveImage`・`deleteImage`・`imageUrl` の 3 関数インターフェースを維持しておけば、S3 実装への切り替えはこのファイルの差し替えのみで完了する。DB のレコードは変更不要（ADR-011 参照）。

**v7.2 で削除した要素の一覧**

| 削除した要素 | 理由 |
|------------|------|
| `@aws-sdk/client-s3` | 不要 |
| `@aws-sdk/s3-request-presigner` | 不要 |
| `lib/storage.js` | `lib/imageStore.js` に置き換え |
| `GET /api/presign` エンドポイント | `POST /api/upload` に置き換え |
| Docker サービス `minio` | 不要 |
| Docker サービス `mc-init` | 不要 |
| 環境変数 `S3_BUCKET`・`S3_ENDPOINT`・`S3_REGION`・`S3_ACCESS_KEY`・`S3_SECRET_KEY`・`S3_PUBLIC_BASE` | 不要 |

---

### ADR-016：JWT + RBAC（admin / user）の採用（v7.3）

**ステータス**：採用

**文脈**  
v7.2 まで HTTP Basic 認証（共有パスワード）を使用していた。「各教員や外部の人がスタンプを登録できるようにしたい」「自分のスタンプだけ編集・削除できるようにしたい」という要件が追加された。

**決定**  
HTTP Basic 認証を廃止し、JWT（HS256）+ per-user ログインに変更する。ロールは `admin`（全操作）と `user`（自分のスタンプのみ編集・削除）の 2 種類とする。

**理由**

*なぜ JWT か*
- Basic 認証では「誰が」操作したかをサーバーが識別できない。スタンプの所有者管理（`created_by`）には per-user 認証が必須
- JWT はペイロードに `sub`（ユーザー ID）と `role` を含むため、ミドルウェアがデータベースを参照せずに認可できる（ステートレス）
- セッションストア（Redis 等）が不要であり、学内ツールのシンプルな構成を維持できる
- `node:crypto` の HMAC-SHA256 で署名・検証が完結し、`jsonwebtoken` パッケージが不要

*なぜ scrypt か*
- Node.js 24 の `node:crypto` に組み込まれており npm パッケージ不要
- bcrypt と同等以上のセキュリティ（メモリハード関数）
- 実装がシンプル：`salt:hash` の文字列 1 つで自己完結

*なぜ 2 ロール（admin / user）か*
- 要件が「全操作できる管理者」と「自分のスタンプのみ操作できる一般ユーザー」の 2 種類であり、それ以上のロール分類は過剰
- カテゴリーの登録・編集・削除は教育設計に関わる専門的判断であり admin のみに限定する（ADR-006 の設計原則：技術的判断は教員の責務）
- 将来的に「閲覧のみ」ロールが必要になった場合は `viewer` ロールを追加できる

**ミドルウェアの設計**

3 つのミドルウェアに責務を分離する：

| ミドルウェア | 適用場面 | 判定内容 |
|------------|---------|---------|
| `authenticate` | 🔑 / 👑 / 🔑✋ 全エンドポイント | JWT の署名・有効期限を検証し `req.user` をセット |
| `requireAdmin` | 👑 エンドポイント | `req.user.role === 'admin'` |
| `requireOwnerOrAdmin(createdBy)` | 🔑✋ エンドポイント | `req.user.role === 'admin' \|\| req.user.sub === createdBy` |

**`created_by` が NULL のスタンプの扱い**

シードデータや v7.2 以前に登録されたスタンプは `created_by` が NULL。`requireOwnerOrAdmin(null)` は `admin` のみ許可する。これにより既存データが操作不能になることを防ぎつつ、所有者のない孤立スタンプを admin が整理できる。

**検討した代替案**

- セッション認証 + express-session → セッションストアが必要になりサーバーがステートフルになる
- 既存 Basic 認証に `X-User-ID` ヘッダーを追加する → セキュリティ上信頼できない（クライアントが偽装できる）
- Passport.js → 依存ライブラリが増える。Node.js 24 組み込みで十分

**トレードオフ**

- JWT は有効期限が切れるまでサーバー側でトークンを無効化できない（ログアウトしてもトークンは有効）。有効期限を 8 時間に設定することで影響を限定する
- 将来的にパスワードリセット機能が必要になった場合はメール送信機能の追加が必要

**移行パス（v7.2 → v7.3 の実装手順）**

```
1. db/schema.sql に users テーブルを追加
2. db/migrate.js で初回起動時に INITIAL_ADMIN_* から admin ユーザーを作成
3. stickers テーブルに created_by 列を追加（ALTER TABLE または schema 更新）
4. lib/auth.js を JWT ベースに書き直し（Basic 認証コードを削除）
5. routes/authRoutes.js を新設（POST /api/auth/login）
6. routes/users.js を新設（/api/users CRUD、admin のみ）
7. routes/stickers.js・categories.js の認証ミドルウェアを更新
8. フロントエンド LoginScreen を JWT ログインフォームに変更
9. AdminPanel に「👥 ユーザー管理」タブを追加（admin のみ表示）
```

---

### ADR-017：helmet によるHTTPセキュリティヘッダーの一括設定（v7.4）

**ステータス**：採用

**文脈**  
学内公開 Web アプリケーションとして外部（学外企業・学生のスマートフォン等）からアクセスされる可能性がある。HTTP セキュリティヘッダーはアプリケーションレベルの最初の防衛線として必要。

**決定**  
`helmet` ミドルウェアを `server.js` の先頭に適用し、HTTP セキュリティヘッダーを一括設定する。

**理由**
- HTTP セキュリティヘッダーを個別に設定すると漏れや誤設定が生じやすい
- `helmet` は OWASP 推奨のヘッダーをデフォルトで設定する。設定変更が必要な場合のみオプションで上書きする
- 小さな依存（依存ゼロの単体パッケージ）でリスクが低い
- CSP（Content Security Policy）で inline script を禁止することで、仮に XSS 脆弱性があっても攻撃の影響範囲を限定できる

**トレードオフ**  
CSP の `styleSrc` に `'unsafe-inline'` が必要（Bootstrap の inline style と React のインラインスタイルのため）。完全な CSP にはなっていないが、最も危険な `scriptSrc` の inline を禁止する効果は維持される。

---

### ADR-018：Docker Compose の廃止と Node.js 24 直接起動への変更（v7.4）

**ステータス**：採用

**文脈**  
v7.2 まで Docker Compose で app・minio・nginx（production のみ）を管理していた。v7.2 で minio を廃止したため残るサービスは app と nginx の 2 つになっていた。「Docker Compose では実装しない。Node.js 24 で直接動かす」という方針が確定した。

**決定**  
Docker Compose（docker-compose.yml・Dockerfile）を廃止し、Node.js 24 を直接起動する構成に変更する。起動は `npm start`（= `node server.js`）。サービス化が必要な場合は systemctl。Nginx はサーバーに直接インストールする。

**理由**
- Docker を使わない運用が前提であるため、Dockerfile・docker-compose.yml は維持コストになるだけで価値を生まない
- `npm start` + systemctl の組み合わせは追加ツール不要の最小構成であり、障害時の原因追跡がシンプル
- Docker なしの構成の方が環境変数の管理・ログの確認・プロセスの再起動が簡単
- `UPLOAD_DIR` や `DB_PATH` をサーバーの絶対パスで直接指定できるため、ボリュームマウントの概念が不要になる

**削除したファイル**

| ファイル | 削除理由 |
|---------|---------|
| `docker-compose.yml` | Docker を使わないため |
| `docker-compose.override.yml` | 同上 |
| `Dockerfile` | 同上 |
| `nginx.conf`（Docker 版） | Nginx を直接インストールするため。設定は §11.6 のサンプルを使用 |

**トレードオフ**  
コンテナによる環境の再現性が失われる。開発環境と本番環境で Node.js バージョンを手動で揃える必要がある。`nvm`（Node Version Manager）の使用を推奨する。将来的にチームが大きくなった場合や CI/CD パイプラインを構築する場合には、コンテナ化を再検討する価値がある。

---

### ADR-019：セキュリティ対策の実装必須化（v7.4）

**ステータス**：採用

**文脈**  
v7.3 まで認証・認可（JWT・RBAC）は設計していたが、XSS・SQLインジェクション・パストラバーサル等の攻撃への具体的な対策が仕様として未定義だった。

**決定**  
以下のセキュリティ対策を実装必須の仕様として SDD に定義する：HTTP セキュリティヘッダー（helmet）、XSS 対策（React + CSP）、SQL インジェクション対策（Prepared Statements 必須）、パストラバーサル対策（ファイルパス検証）、ファイルアップロード検証（MIME ホワイトリスト・サイズ制限）、レート制限（ログイン API）、入力バリデーション（全 POST/PUT）、CORS 設定（開発環境のみ許可）、エラーレスポンスの情報漏洩防止。

**各対策の選択理由**

| 対策 | なぜ必要か | 実装コスト |
|------|---------|---------|
| helmet | HTTP ヘッダー設定漏れを防ぐ最小コストの対策 | 1行（`app.use(helmet())`） |
| CSP | inline script 禁止でXSSの影響を限定 | helmet の設定変更のみ |
| Prepared Statements | SQLite でのインジェクション防止。すでに設計済みだが明示的に禁止事項として定義 | 開発規約の明示化のみ |
| パストラバーサル防止 | ファイル削除 API で `../../../etc/passwd` 等のパスを防ぐ | `path.resolve` + 比較で十分 |
| ファイルアップロード検証 | 悪意のあるファイルのアップロードを防ぐ | multer の fileFilter で設定 |
| レート制限 | ブルートフォース攻撃対策。学内でも必要 | express-rate-limit 1設定 |
| 入力バリデーション | 不正な値がDBに入ることを防ぐ | routes 内の if 文 |
| CORS | 開発環境での正確な動作確認 | server.js に10行程度 |
| エラー情報隠蔽 | DBスキーマ・ファイルパスの漏洩防止 | グローバルエラーハンドラー修正 |

**実装の優先順位**  
必須（実装しないと公開不可）：helmet・Prepared Statements・パストラバーサル防止・ファイルアップロード検証・エラー情報隠蔽  
重要（公開前に対応）：レート制限・入力バリデーション・CORS  
推奨（運用中に強化）：Magic bytes 検証・CSP のより厳格な設定

---

### ADR-020：スタンプ・カテゴリー関係を多対多（sticker_categories）に変更（v7.5）

**ステータス**：採用

**文脈**  
v7.4 まで `stickers.category_id`（1対多、1スタンプ = 1カテゴリー）で設計していた。「スタンプが複数のカテゴリーに属することもあるよね」という指摘を受けて見直した。

**決定**  
`stickers.category_id` を廃止し、`sticker_categories` 中間テーブルによる多対多関係に変更する。同時に `stickers.primary_category_id` を追加してスタンプ ID の AREA コードと表示色の決定基準を保持する。

**理由**

*なぜ多対多か*
- 例として「API実習」スタンプは「Webアプリ開発」カテゴリーにも「AI・データサイエンス」カテゴリーにも関連しうる
- ギャラリーで複数カテゴリーカードに同じスタンプが表示されることで、学生は「このスキルが複数の職種文脈で評価される」と気付けるようになる
- 企業担当者は自社が探す職種のカテゴリーカードを見たとき、関連スキルを持つスタンプを漏れなく発見できる

*なぜ primary_category_id を持つか*
- スタンプ ID（`NSS-WEB-K001v01`）の `AREA` 部分はカテゴリーの `area_code` から生成するため、「どのカテゴリーが基準か」を 1 つ定める必要がある
- スタンプのテーマカラーは主カテゴリーの color を初期値として使う（教員が後から変更可）
- ギャラリーでの主/関連の視覚的区別にも使う

*なぜ categories に area_code を追加するか*
- スタンプ ID の AREA 部分（`WEB`、`AI` 等）を categories レコードで管理することで、カテゴリー名が変わっても ID に影響しない
- `area_code` は英大文字・数字のみ・8 文字以内とする（バリデーション）
- 一度登録した `area_code` は変更禁止（既発行スタンプ ID が参照しているため）

**検討した代替案**
- `stickers.category_ids` に JSON 配列を持つ → 外部キー制約・JOIN クエリができない。ADR-006 と同じ理由で配列列は小規模リストのみに使う方針
- `stickers.category_id` を維持しつつ「サブカテゴリー」列を追加 → 関係が非対称になり管理が複雑になる

**トレードオフ**
- `sticker_categories` テーブルが増えることで JOIN が 1 段増える。ただし学内ツール規模では問題にならない
- PUT /api/stickers の更新処理が `sticker_categories` + `courses` の 2 テーブル洗い替えになる（トランザクション内で処理）
- StickerEditor の UI がやや複雑になる（単一 select → チェックボックス群）が、UIモックアップで確認済みの操作性

**整合性ルール（実装時の注意）**
1. `primaryCategoryId` は `categoryIds` の中に含まれていなければならない（API バリデーション）
2. カテゴリー削除前に `primary_category_id` 参照のチェックを行い、存在する場合は 409
3. スタンプ削除時は `sticker_categories` が CASCADE で自動削除される
4. カテゴリー削除時は `sticker_categories` が CASCADE で自動削除される（スタンプ本体は残る）

---

### ADR-021：shadcn/ui + Tailwind CSS + TypeScript の採用（v8.0）

**ステータス**：採用

**文脈**  
v7.x では Bootstrap 5.3 + react-bootstrap + JavaScript（JSX）をフロントエンドスタックとして採用していた。「shadcn/ui に最適な構成で作り直したい」という方針変更があり、フロントエンドスタックを全面的に見直した。

**決定**  
フロントエンドを TypeScript + Tailwind CSS 3.4 + shadcn/ui に変更する。バックエンドは変更しない。

**理由**

**Web UI のモダン化と安定性向上**が採用の理由。

- **モダン化**：2023〜2025 年の Web アプリのデファクトスタンダードになりつつあるデザインシステム。Bootstrap ベースの UI と比較して視覚的な現代感が向上する
- **安定性向上**：Radix UI ベースのプリミティブにより、Dialog（モーダル）のポータル・フォーカストラップ・ESC 閉鎖・スクロールロック・WAI-ARIA 属性が自動処理される。v7.x で手動実装していた `className="modal fade show d-block"` ＋バックドロップ管理が不要になり、動作の安定性が高まる
- **コードの所有権**：npm パッケージではなくソースコードをコピーするため、外部ライブラリの破壊的変更に左右されない

**移行パスとバックエンドへの影響**

バックエンド（server.js / lib/ / routes/ / db/）は完全に変更なし。変更箇所は：
1. `package.json` の devDependencies（Bootstrap/react-bootstrap 削除、Tailwind/TypeScript 追加）
2. `vite.config.js` → `vite.config.ts` + `tsconfig.json`
3. `tailwind.config.ts` + `components.json`（shadcn/ui 設定）
4. `client/src/globals.css`（Tailwind directives）
5. 全 `.jsx` ファイル → `.tsx` への改名と型注釈の追加
6. `components/ui/` に shadcn/ui コンポーネントを追加

**検討した代替案**
- Bootstrap 継続 → アクセシビリティ・モダン性で shadcn/ui に劣る
- MUI（Material UI） → デザインが Material Design に固定され自由度が低い
- Mantine → 優秀だが依存が増える。shadcn/ui のコードコピー方式の方が長期的な依存管理がシンプル

### ADR-022：multer から @fastify/busboy への移行（v9.0）

**ステータス**：採用

**文脈**  
v8.0 まで使用していた `multer ^1.x` は、依存する `dicer` パッケージに高severity脆弱性（GHSA-wm7h-9275-46v2）が存在する。`npm audit` で検出され、対応が必要となった。

**決定**  
`multer` を廃止し、`@fastify/busboy ^3.x` を `routes/upload.js` 内で直接使用する。

**理由**

- `multer ^2.x` も同じ `busboy` 依存系列のため脆弱性が残る
- `multer ^3.x`（alpha）は `@fastify/busboy` に移行済みで脆弱性は解消されているが、alpha 版のため採用リスクが高い
- `@fastify/busboy ^3.x` は安定版で、multer v3 alpha が依存する予定のライブラリでもある
- `routes/upload.js` を直接 `@fastify/busboy` で実装することで multer への依存を完全に排除できる

**実装上の注意点**  
`@fastify/busboy` の `file` イベントは旧式シグネチャ `(fieldname, stream, filename, encoding, mimeType)` を使用する（オブジェクト形式の `info` ではない）。また MIME タイプが正しく取得できない場合のフォールバックとして、ファイル名拡張子からも判定する。

**検討した代替案**
- multer v3 alpha の採用 → alpha 版のため本番利用は時期尚早
- multer v2 の使用 → 同系列の脆弱性が残る
- busboy（オリジナル）の使用 → @fastify/busboy はその後継で互換性が高い

---

### ADR-023：Vite 設定の修正（`"vite client"` 廃止）（v9.0）

**ステータス**：採用

**文脈**  
v8.0 の `package.json` では `"dev": "concurrently \"nodemon server.js\" \"vite client\""` としており、Vite に `client` をディレクトリ引数として渡していた。この場合 Vite は `client/` ディレクトリをカレントとして起動するため、プロジェクトルートの `postcss.config.js` / `tailwind.config.ts` が読み込まれず Tailwind CSS が開発サーバーで適用されないという問題が発生した。

**決定**  
`"vite"` のみ（引数なし）で起動し、`vite.config.ts` の `root: 'client'` 設定に任せる。また `postcss.config.js` と `tailwind.config.ts` を `client/` 内にもコピーし、Vite が `root` ディレクトリ内で PostCSS 設定を確実に発見できるようにする。`client/tailwind.config.ts` の `content` パスは `client/` 基準（`'./index.html'`, `'./src/**/*.{ts,tsx}'`）にする。

**理由**  
`vite.config.ts` に `root: 'client'` を設定している場合、コマンドで追加のディレクトリ引数を渡すと設定が重複・競合する。`vite.config.ts` の設定を正として、コマンドはシンプルに保つ。


---

### ADR-024：スコープ境界の変更 ── 学生アカウント・実績記録の導入（v10.0）

**ステータス**：採用

**文脈**
v9.0 までの §1.3 では「学生認証・個人ポートフォリオの永続化」を明示的にスコープ外としていた。理由は、Web ギャラリーを「誰がどのスタンプを持っているかを管理しない、物理スタンプのリファレンス表示」と位置づけていたためである（§1.1・研究上の設計思想：物理スタンプの "issue and done" モデル、デジタルバッジの永続プラットフォーム依存批判）。一方で、教員・学生・企業の三者から独立に「このスタンプを持つ他の学生を知りたい」という要望が寄せられた。

**決定**
Web ギャラリーに学生アカウント（`users.role='student'`）・実績記録（`student_achievements`）・公開プロフィール（`student_profiles`）を導入し、スタンプ保有者の閲覧機能を提供する。ただし、素朴な「学内 SNS」化を避けるため、以下の制約を設計に組み込む。

1. 学生本人の明示的なオプトイン同意なしに、実績や連絡先を公開しない（デフォルト非公開）
2. システム内メッセージング（DM・チャット）は持たず、連絡は学生が任意で開示する外部 SNS リンクに限定する
3. 実名は一切保存せず、本人設定の表示名のみを公開情報として扱う（→ ADR-025）

**理由**

- 「発行して終わり」の物理スタンプの価値と、「誰が持っているかを検索できる」利便性は本来トレードオフの関係にはない。デジタルバッジ批判の核心は「認定の正本が私企業のプラットフォームに移る」ことであり、本機能は認定の正本（物理スタンプ・カテゴリー定義）には一切手を加えず、その上に「検索・発見レイヤー」を追加するだけである
- 制約1〜3により、個人情報保護・モデレーション責任の観点でのリスクを、大学が単独で運用可能な範囲にとどめている

**検討した代替案**

- 要望通りに学内 SNS（学生同士・企業とのチャット機能）を実装する → モデレーション体制なしに大学公式システムとして運用するリスクが大きく、採用選考文脈での力関係の非対称性（企業→学生への不適切な接触等）への対応が困難と判断し不採用
- スコープ外のまま据え置く → 三者からの要望が独立に発生しており、無視すると物理スタンプ制度自体の実務上の価値が下がる懸念があったため不採用

**トレードオフ**

- システムが保持する個人情報（表示名・所属・自由記述・オプトインした連絡先）が増える。実名を保存しない設計（ADR-025）によって最小化しているが、ゼロにはならない
- 学生アカウントの運用（CSVインポート・停止処理等）という新たな管理業務が職員に発生する

---

### ADR-025：実名を保存せず、本人設定の表示名のみを公開情報とする（v10.0）

**ステータス**：採用

**文脈**
ADR-024 により学生の可視化機能を導入するにあたり、公開一覧・プロフィールにどのような「名前」を出すかを検討した。当初は「学籍番号名簿と実名を照合し、公開一覧には表示名のみを出す」案を検討していたが、後にアカウント発行方式自体を CSV 一括インポート（ADR-027）に変更した結果、実名の照合用途そのものが不要になった。

**決定**
`users` テーブルおよび関連テーブルに実名を保持する列を設けない。CSVインポート時の `display_name` は本人が自由に変更でき（実名のままでも、ハンドルネーム等に変更してもよい）、公開範囲で表示されるのはこの表示名のみとする。学籍番号相当の識別子も保持せず、ログイン識別子はシステムが自動発行する `login_id` を用いる（→ ADR-028）。

**理由**

- CSVインポート方式では、アカウント作成時点で職員が本人確認済みという前提が成立するため、システム内部でも実名を照合用途に使う場面が存在しない
- 実名の管理責任をインポート元 CSV（大学側の原本）に一元化することで、システムが保持する個人情報を最小化できる。これは ADR-024 で述べた「リスクを大学が単独で運用可能な範囲にとどめる」方針とも整合する
- 学生が実名を出したくない場合（就職活動前の段階でハンドルネームを使いたい等）に配慮できる

**トレードオフ**

- システム上で「この表示名の学生は本当に在籍しているか」を実名突合で確認する手段がない。不正利用が疑われる場合は、CSVインポート時の行番号や `affiliation`／`position` を手がかりに大学側の原本と突き合わせる運用になる
- 同一表示名の学生が複数登録される可能性がある（重複を許容する設計のため）。プロフィールページの URL は `login_id` ベースであり、表示名の重複自体は機能上の問題を起こさない

---

### ADR-026：公開同意の二層化（is_visible / kiosk_public）とデフォルト非公開（v10.0）

**ステータス**：採用（v11.0 で `kiosk_public` を `external_public` に置き換え。→ ADR-032）

**文脈**
学生の実績・プロフィールをどの範囲に公開するかについて、「学内（学生・教員）向け」と「学外の就職説明会（企業担当者がタブレット経由で閲覧）向け」ではリスクの質が異なるという指摘があった。また、職員が実績を記録した時点ではまだ学生本人の同意を得ていない。

**決定**
公開同意を 2 つの独立したフラグで管理する。

- `student_achievements.is_visible`（スタンプ単位、デフォルト `false`）：学内の「取得学生一覧」・「公開学生一覧」への表示可否
- `student_profiles.kiosk_public`（プロフィール単位、デフォルト `false`）：キオスクモード（就職説明会タブレット、ADR-029）での表示可否

いずれも学生本人がログイン後に切り替える。職員が代理で設定することはない。

**理由**

- 学内公開と就活イベント公開は、閲覧者の性質（顔見知りの学生・教員 vs. 初対面の企業担当者）が異なり、公開したい範囲も学生ごとに異なりうる。「学内には見せたいが、就活イベントでは時期尚早」（またはその逆）という選択を可能にする
- 記録時点でのデフォルト非公開は、職員が実績を記録する行為と、学生が公開に同意する行為を明確に分離する。職員の記録ミスや配布直後の公開によるトラブルを防ぐ

**検討した代替案**

- 単一の公開フラグで一本化する → 学内向けと対外向けの公開範囲を分けたいという要望に応えられないため不採用
- 職員が公開設定を代行する → ADR-024 の「本人の明示的なオプトイン同意なしに公開しない」という制約に反するため不採用

**トレードオフ**

- 学生が理解すべき同意設定が 2 種類（is_visible はスタンプごと、kiosk_public はプロフィール全体で1つ）に増え、UI 上の説明コストが発生する

> **v11.0 での補足**：`is_visible` を「学内公開」と呼んでいたが、実際には JWT 認証を通過すればアクセスできる `🔑（全ロール）` エンドポイントであり、学外の卒業生・社会人・企業担当者のアカウントを含む**ログイン済み登録者全体**への公開である（「学内」という地理的・組織的限定を技術的に強制する仕組みはない）。この点を踏まえ、`kiosk_public`（就職説明会タブレット限定）はより広い「ログイン不要の外部公開」という用途（QRコード等）に一般化し、`external_public` に置き換えた（→ ADR-032）。本ADRの二層構造（記録単位のis_visible／プロフィール単位のもう1層）という設計そのものは維持している。

---

### ADR-027：学生アカウントは CSV 一括インポートで作成し、自己登録エンドポイントを設けない（v10.0）

**ステータス**：採用

**文脈**
学生アカウントの作成方式として、当初は「学籍番号名簿を事前インポートし、学生本人が学籍番号を入力して自己登録する」方式（`POST /api/auth/student-register` のような公開エンドポイント）を検討していた。この方式はなりすまし登録を防ぐための名簿照合ロジックが必要になる。

**決定**
CSV インポート（`POST /api/students/import`、👑 admin のみ）で職員が直接アカウントを作成する方式に一本化する。学生の自己登録用エンドポイントは設けない。

**理由**

- 自己登録方式は、公開エンドポイントを 1 つ追加することになり、レート制限や名簿照合ロジックの実装・保守コストが発生する
- CSV インポート方式では、職員が用意した名簿がそのままアカウントの正本になるため、照合ロジック自体が不要になり、攻撃面（他人の学籍番号を騙って登録を試みる、名簿照合ロジックの不備を突く等）が単純に減る
- 職員が個々にアカウントを手動作成するよりも、CSV一括処理の方が数百名規模の学生に対応しやすい

**検討した代替案**

- 学籍番号名簿と照合する自己登録方式 → 上記の理由により不採用。加えて、学籍番号自体を保持しない方針（ADR-025）とも整合しない
- 職員が学生ごとに個別にアカウントを作成する（一括インポートなし） → 数百名規模では運用負荷が高すぎるため不採用

**トレードオフ**

- 仮パスワードを含む CSV や画面表示を、職員がどう学生に配布するか（紙で配布・既存の学内連絡システム経由等）がシステム外の運用に委ねられる。システム側は仮パスワードを画面に一度だけ表示し、平文を保存しないことで漏洩リスクを限定する

---

### ADR-028：ログイン識別子（login_id）はシステムが自動発行する（v10.0）

**ステータス**：採用

**文脈**
CSV インポート方式（ADR-027）を採用するにあたり、学生のログイン識別子をどう決めるかを検討した。表示名は重複を許容する設計（ADR-025）のためログイン識別子には使えない。CSV に学籍番号等の列を含める案もあったが、実名同様に学籍番号もシステムに保持しない方針（ADR-025）と整合させる必要があった。

**決定**
`login_id` はシステムがインポート時にランダムに自動発行する（例: `stu-` + ランダム8文字）。CSV には含めない。

**理由**

- CSV に学籍番号のような大学の既存番号体系を持ち込むと、システムが実質的に学籍番号を保持することになり、ADR-025 の「実名・学籍番号相当の識別子を保持しない」方針と矛盾する
- ランダムな `login_id` は、それ単体では在籍者情報と結びつかないため、システムが仮に外部に漏洩した場合の実害を抑えられる

**トレードオフ**

- 学生は `login_id` を覚えられないため、初回ログイン情報（login_id・仮パスワード）を確実に受け取れる配布経路が必要になる（ADR-027 のトレードオフと同じ運用課題）
- 職員側で「この login_id は誰か」を調べる手段が、CSVインポート結果の一覧（一度限り表示）以外にはなく、必要であれば `GET /api/students`（表示名・所属・役職で検索）を使う運用になる

---

### ADR-029：企業向けにはトークン限定公開の「キオスクモード」を提供し、個別アカウントは発行しない（v10.0）

**ステータス**：**廃止（v11.0、→ ADR-032）**。以下は歴史的記録として残す。

**文脈**
企業担当者が就職説明会会場で学生プロフィールを閲覧する方法として、「職員が代理で画面操作する」「企業に個別アカウントを発行する（role に `company` を追加）」「会場のタブレット等でログイン不要の限定公開を提供する」の3案を検討した。

**決定**
会場タブレット向けに、トークン（`kiosk_tokens`）で保護された「ログイン不要の限定公開モード」を提供する。企業向けの個別アカウント・`company` ロールは追加しない。公開範囲は `student_profiles.kiosk_public=true`（ADR-026）の学生に限る。

**理由**

- 個別企業アカウントは、発行・失効・パスワード管理という継続的な運用コストを生む。就職説明会は単発イベントであり、イベント単位で発行・失効できる使い捨てトークンの方が実態に合う
- 完全な「ログイン不要 = 誰でもインターネットから閲覧可能」にすると、学生の同意範囲を超えたスクレイピングのリスクがある。トークンをヘッダーで要求する準公開エンドポイント（`/api/kiosk/*`）にすることで、トークンを知らない第三者からのアクセスを防ぎつつ、会場のタブレットではログイン操作を不要にできる
- ログイン API と同じレート制限をトークン単位に適用することで、トークン漏洩時の総当たり探索リスクも抑える

**検討した代替案**

- 職員が代理で画面操作する → ブース運営の人手が常時必要になり、複数ブースを同時運営する就職説明会の実態に合わない
- 企業に個別アカウントを発行する → 運用コストが高く、そもそも当面の要望は「一覧を見る」ことであり双方向のマッチング（§12.6）までは求められていない

**トレードオフ**

- トークンが漏洩した場合、失効するまでは第三者も閲覧できてしまう。`expires_at` による自動失効と、イベント終了後の手動失効（`revoked_at`）の両方を設けることでリスク期間を限定する
- 将来、企業側からの検索・マッチングが必要になった場合は、別途 §12.6 のスコープで個別アカウント方式を再検討する必要がある

> **v11.0 での廃止理由**：QRコード・ステッカー・チャームによる物理印刷という新たな運用要件が生じ、恒久的に不変な固定URLが必要になった。イベント単位で発行・失効する使い捨てトークン（本ADRの前提）とは相容れないため、本方式は廃止し `external_public` ＋固定URL方式（ADR-032）に統合した。

---

### ADR-030：連絡先メールアドレスはオプトインのチェックボックスで公開制御する（v10.0）

**ステータス**：採用

**文脈**
CSV インポート項目に「連絡先メールアドレス（任意）」を含めることになったが、これを SNS リンク同様に無条件でプロフィールに表示するか、システム内部用途に限定するかを検討した。

**決定**
`users.contact_email` は保持するが、`email_public` チェックボックス（デフォルト `false`）がオンの場合のみ `StudentProfilePage` に表示する。オフの場合は非公開情報として扱う。

**理由**

- X・LinkedIn のハンドルは学生が能動的に入力する外部公開アカウントであるのに対し、メールアドレスは CSV インポート時に職員が把握している場合があり、学生自身が「公開する」と明示的に選んだ情報ではない。両者を同列に無条件公開すると、ADR-024 で掲げた「本人の明示的なオプトイン同意なしに公開しない」という原則に反する
- チェックボックスというシンプルな UI にすることで、学生が公開・非公開を都度判断しやすくする

**トレードオフ**

- 連絡先メールが非公開の学生には、プロフィール経由の連絡手段が SNS リンク（任意入力）のみになる。両方とも未入力の場合、閲覧者から学生への直接連絡手段はシステム上に存在しない（意図された挙動：システムは連絡経路を保証しない）

---

### ADR-031：実績記録の操作権限を admin 限定ではなく職員全員（🔑）に開放する（v10.0）

**ステータス**：採用

**文脈**
「どの学生がどのスタンプを取得したか」を記録する `AchievementEditor`（§9.9）の操作権限を、admin 限定にするか職員全員（🔑）にするかを検討した。物理スタンプは大学の事務局が一括配布するものではなく、個々の教員が授業・実習の中で学生に手渡しする。

**決定**
`POST /api/achievements`・`DELETE /api/achievements/:id` を 🔑（`admin` または `user` ロールを持つ職員全員）に開放する。admin 限定にはしない。

**理由**

- 物理スタンプの配布主体は個々の教員（`user` ロール）であり、配布したその場で記録できることが実務上望ましい。admin 限定にすると、教員から admin への伝達コストが発生し、記録の遅延・漏れにつながりやすい
- 記録内容自体（学生×スタンプ×取得日）は、既存の `POST /api/stickers`（🔑 職員全員がスタンプを新規作成できる、§7.1）と権限モデルの粒度が近く、既存の RBAC 設計（ADR-016）と一貫性がある
- 実績記録はデフォルト非公開（ADR-026）で作成されるため、記録権限を広げても学生の同意なく公開情報が増える経路にはならない

**検討した代替案**

- admin 限定にする → 記録の正確性チェックは強くなるが、現場の実務（教員が授業内でその場配布する）に合わず不採用

**トレードオフ**

- 記録内容の正確性は職員個々の入力に依存する。誤記録は `DELETE /api/achievements/:id`（同じく🔑職員全員が可）で訂正する運用とし、admin による事後監査の仕組み（§9.8 の学生アカウント一覧等からの確認）を必要に応じて追加検討する

---

### ADR-032：QRコード外部公開の導入 ── 固定URL方式・トークン方式不採用・キオスクモード廃止（SkillsStampConnect v11.0）

**ステータス**：採用

**文脈**
学生プロフィールをQRコード化し、ステッカーやチャームに物理印刷して配布したいという要望が挙がった。この検討の過程で、以下の2点が明らかになった。

1. 既存の `is_visible`（ADR-026）は「学内公開」と呼ばれていたが、実態は JWT 認証を通過すれば誰でもアクセスできる `🔑（全ロール）` エンドポイントであり、`role='student'` は在学生に限らず卒業生・社会人・（大学とは無関係な文脈での）高校生等の「学び続ける登録者」全般を含む。したがって `is_visible=true` は地理的・組織的に「学内」に限定されたものではなく、ログイン済み登録者全体への公開に近い。
2. QRコード・ステッカー・チャームへの物理印刷という運用上、プロフィールURLは**印刷後恒久的に不変**でなければならない。当初検討したランダムトークン発行・再発行方式（`public_token`）は、この制約と本質的に相容れない。

また、v10.0 で導入したキオスクモード（`kiosk_tokens`・`X-Kiosk-Token` ヘッダー認証、ADR-029）は、就職説明会会場のタブレット限定というユースケースを前提にしていたが、QRコードによる個人単位の固定URL公開が実現すれば、イベント単位のトークン発行・失効という運用は不要になる。

**決定**

1. `student_profiles.kiosk_public` を `student_profiles.external_public`（デフォルト `false`）に置き換える。`is_visible=true` の実績のうち、**ログイン不要・不特定多数への公開**を追加で許可するかどうかの、プロフィール単位の同意とする。
2. 固定URL `GET /api/public/profile/:loginId`（認証不要）を新設する。`login_id` をそのままパス変数として使い、`external_public=true` の間だけ内容を返す（`false` の場合は 404 相当で存在自体を秘匿する）。トークンの発行・再発行は行わない。
3. `kiosk_tokens` テーブル、`X-Kiosk-Token` ヘッダー認証、`requireKioskToken` ミドルウェア、`POST/DELETE /api/kiosk-tokens`、`GET /api/kiosk/*`、`KioskTokenEditor`、`kioskFetch.ts` をすべて廃止する。就職説明会会場・オンラインイベントいずれも、学生本人のQRコード（固定URL）を経由する運用に一本化する。
4. `login_id` を公開URLの識別子としてそのまま用いる（ADR-025・028 で定義した既存の識別子を再利用し、新規の識別子は導入しない）。

**理由**

- **物理印刷との整合**：トークン方式は「ONにする度に新しいURLが発行される」ことを前提にしており、印刷物のQRコードが指すURLと食い違う。固定URL方式のみがこの運用要件を満たす。
- **既存の同意モデルとの整合**：`is_visible`（ログイン済み登録者への公開）と `external_public`（ログイン不要の公開）という二層構造自体はADR-026の設計思想を維持しており、レイヤーを増やすのではなく、対象範囲の呼称・境界をより正確なものに修正する変更である。
- **運用コストの削減**：イベントごとのトークン発行・失効という管理者の作業（ADR-029）が不要になる。就職説明会もオンラインイベントも同じ仕組みで扱える。
- **同意の明確化**：「学内公開」という呼称は実態（ログイン済みなら誰でも見える）と乖離しており、学生に誤った公開範囲の期待を抱かせるリスクがあった。`external_public` という呼称と、ON時の確認ダイアログ（§9.11）により、公開範囲の説明を実態に合わせる。

**検討した代替案**

- **`public_token` によるランダムトークン発行方式**：ON/OFFの度に新しいトークンを発行し、URLに埋め込む案。セキュリティ上は `login_id` を晒さずに済む利点があったが、「一度印刷したQRコードが将来にわたって有効であり続ける」という要件を満たせず、再発行のたびに古いQRコード・ステッカー・チャームが無効になってしまうため不採用。
- **`kiosk_public` を残したまま `external_public` を新設し三層構造にする**：就職説明会向け（トークン限定）と一般外部公開（QRコード）を別々に維持する案。しかし就職説明会もQRコードでカバーできるため、運用が二重化するだけでメリットが薄く、シンプルさを優先して `kiosk_public` は廃止・統合する方を選んだ。
- **`login_id` とは別の公開用ID列を`student_profiles`に追加する**：`login_id` を公開に使うことへの懸念（下記トレードオフ）に対応する案。導入コストと比較し、`login_id` はパスワードなしでは認証に使えずレート制限もあるため、当面はリスクが許容範囲と判断し不採用（ただし将来的な再検討の余地は残す）。

**トレードオフ**

- `login_id` が印刷物・URLを通じて第三者に知られる状態になる。ログイン試行そのものにはパスワードが別途必要で、既存の `express-rate-limit`（15分10回、ADR未採番・§9セキュリティ要件表）が総当たり探索を抑止するが、ADR-025・028が前提としていた「`login_id` は無作為な文字列としてのみ機能し、外部に積極的に晒されることは想定していない」という当初の設計意図とは性質が変わる。将来的に懸念が顕在化した場合は、`login_id` とは別の公開用識別子を追加する再設計（上記代替案）を検討する。
- 固定URLであるため、いったん `external_public=true` にして配布したQRコードは、`false` に戻せば内容非表示にはできるが、**URL自体を失効させることはできない**（トークン方式と異なり「無効化」ではなく「非表示化」になる）。学生が同意を完全に取り消したい場合も、同じ `login_id` を使い続ける限り同じURLが存在し続ける点を、UI上の説明文で明示する必要がある。
- **「その場にいる学生の一覧をタブレットで一括閲覧する」機能は、旧キオスクモード（v10.0）の時点でも実質的に実現できていなかった**。`kiosk_public=true` の学生一覧は「公開設定済みの学生全体」であり、システムは物理的な位置情報やイベント参加者を一切持たないため、会場やイベントで絞り込まれた一覧にはなり得なかった（`kiosk_tokens.label` はイベント名の記録に過ぎず、参加者の絞り込みには使われていなかった）。したがって本ADRはこの機能を「代替できない」のではなく、**そもそも成立していなかった機能を要件から外す**という決定でもある。個別学生のQRコードをスキャンしてプロフィールを閲覧できれば要件を満たすため、一覧閲覧のための追加エンドポイントは設けない。

---

### ADR-033：QRコード画像生成に qrcode.react を採用（SkillsStampConnect v11.0）

**ステータス**：採用

**文脈**
ADR-032 により、学生の外部公開プロフィールは固定URL（`GET /api/public/profile/:loginId`）として実現された。当初の実装（§9.11 MyProfileEditor）では、このURLをテキスト表示＋コピーボタンとして提示するのみで、QRコード画像そのものの生成は範囲外としていた。QRコード・ステッカー・チャームへの物理印刷という当初の要望を満たすには、URLをQRコード画像に変換する手段が別途必要になる。

**決定**
QRコード画像の生成に `qrcode.react`（4.x）を採用する。`MyProfileEditor.tsx` の固定URL表示部分に `<QRCodeSVG value={publicUrl} />` を追加し、ブラウザ内でSVGとしてレンダリングする。

**理由**
QRコード生成には3つの方式を検討した。

1. **npmライブラリによるオフライン生成**（採用）：外部通信なし、ブラウザ内で完結
2. **外部APIサービス（例：`api.qrserver.com`）への都度リクエスト**：npm依存は不要だが、外部サービスへの毎回の通信が発生し、CSP設定（`img-src`）の緩和も必要になる。当該サービスが利用不可になった場合にQRコードが表示できなくなる
3. **自前実装**：QRコードのエンコードアルゴリズムは相応に複雑で、バグを埋め込みやすい

本プロジェクトは `@fastify/busboy` の直接使用（multer 不使用）、JWT・scrypt の `node:crypto` による自前実装など、**実行時の外部サービス依存を避け自己完結させる**方針を一貫して採用してきた（→ ADR-004・ADR-021 等）。この方針との整合性から (1) を採用する。`qrcode.react` は React の宣言的コンポーネントとして提供され、既存の TSX コードベースと親和性が高い。

**検討した代替案**

- **`qrcode`（素のJSライブラリ）**：`toDataURL()` で data URL を生成し `<img>` に渡す方式。Reactに依存しない分汎用的だが、コンポーネント化を自前で書く必要があり、`qrcode.react` の方が実装コストが低い
- **外部APIサービス**：上記「理由」参照。不採用

**トレードオフ**

- 新規の npm 依存が1つ増える（`qrcode.react` および内部依存）。ただし peer dependency は React のみで、既存スタックへの影響は軽微
- QRコードの見た目（エラー訂正レベル・サイズ・マージン）はコンポーネントの props で制御するため、デザイン変更のたびにコード側の調整が必要になる（外部APIサービス方式であればURLパラメータで完結する場合もあるが、ADR本文の理由により不採用とした）

