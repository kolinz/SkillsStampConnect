-- SkillsStampConnect 初期データ
-- SDD §4.2〜4.5 テーブル定義 / §4.7 スタンプ ID 命名規則 準拠
-- すべて INSERT OR IGNORE により冪等（重複実行しても安全）

-- ============================================================
-- categories（4件）
-- ============================================================

INSERT OR IGNORE INTO categories (
  id, name, name_en, area_code, emoji, color, image_key, description,
  target_roles, recruit_message, sort_order
) VALUES (
  'cat-webdev',
  'Webアプリ開発',
  'Web Application Development',
  'WEB',
  '🌐',
  '#2563EB',
  NULL,
  'HTML/CSS・JavaScript を基礎に、フロントエンドからバックエンドまでを一貫して開発できる力を可視化するカテゴリーです。授業内の演習・チーム開発プロジェクトを通じて、要件定義からデプロイまでの一連の工程を経験した証として付与されます。',
  '["エンジニア", "Web開発", "SIer"]',
  'このスタンプを持つ学生は、フレームワークを使った実装だけでなく、Gitでのチーム開発やAPI設計の基礎を経験しています。配属後すぐに開発チームへ合流できる素地があります。',
  1
);

INSERT OR IGNORE INTO categories (
  id, name, name_en, area_code, emoji, color, image_key, description,
  target_roles, recruit_message, sort_order
) VALUES (
  'cat-ai',
  'AI・データサイエンス',
  'AI & Data Science',
  'AI',
  '🤖',
  '#059669',
  NULL,
  'データの収集・前処理から機械学習モデルの構築・評価までを扱うカテゴリーです。Pythonを用いた分析演習や、生成AIを活用したプロトタイピング課題を通じて、データに基づく意思決定支援のスキルを身につけたことを示します。',
  '["データアナリスト", "AIエンジニア", "DX推進"]',
  'このスタンプを持つ学生は、データの前処理から可視化、簡単なモデル構築までを自走できます。DX推進担当や分析職の初期戦力として期待できます。',
  2
);

INSERT OR IGNORE INTO categories (
  id, name, name_en, area_code, emoji, color, image_key, description,
  target_roles, recruit_message, sort_order
) VALUES (
  'cat-ux',
  'UX・プロダクトデザイン',
  'UX & Product Design',
  'UX',
  '🎨',
  '#DB2777',
  NULL,
  'ユーザーリサーチ・ワイヤーフレーム作成・プロトタイピングを通じて、使いやすいプロダクトを設計する力を可視化するカテゴリーです。ユーザーインタビューからデザイン検証までの一連のプロセスを実践した証として付与されます。',
  '["UXデザイナー", "プロダクトマネージャー", "企画職"]',
  'このスタンプを持つ学生は、感覚だけでなくユーザー調査に基づいたデザイン判断ができます。企画・デザイン職はもちろん、開発職との橋渡し役としても活躍が期待できます。',
  3
);

INSERT OR IGNORE INTO categories (
  id, name, name_en, area_code, emoji, color, image_key, description,
  target_roles, recruit_message, sort_order
) VALUES (
  'cat-pm',
  'プロジェクト・ビジネス',
  'Project & Business Management',
  'PM',
  '📋',
  '#DC2626',
  NULL,
  'チームでのプロジェクト進行管理、要件整理、ステークホルダーとの合意形成など、ビジネス職に求められる基礎力を可視化するカテゴリーです。実際のプロジェクト演習でのスケジュール管理・進捗報告の経験に基づいて付与されます。',
  '["営業", "プロジェクトマネージャー", "企画職", "コンサルタント"]',
  'このスタンプを持つ学生は、タスク分解・スケジュール管理・報連相の基本を実践経験として身につけています。配属先チームにすぐに馴染み、進行管理を任せられる素地があります。',
  4
);

-- ============================================================
-- stickers（各カテゴリー 1 件ずつ、計 4 件）
-- ============================================================

INSERT OR IGNORE INTO stickers (
  id, primary_category_id, created_by, name, name_en, type, color, emoji,
  image_key, description, skills, level, version, sort_order
) VALUES (
  'NSS-WEB-K001v01',
  'cat-webdev',
  NULL,
  'Webアプリ基礎実装',
  'Web Application Fundamentals',
  'practical',
  '#2563EB',
  '⚙️',
  NULL,
  'フロントエンドとバックエンドを組み合わせたWebアプリケーションを、要件定義からデプロイまで一人称で実装できる。',
  '["HTML/CSS", "JavaScript", "REST API設計", "Git", "データベース設計"]',
  '実践',
  'v01',
  1
);

INSERT OR IGNORE INTO stickers (
  id, primary_category_id, created_by, name, name_en, type, color, emoji,
  image_key, description, skills, level, version, sort_order
) VALUES (
  'NSS-AI-K001v01',
  'cat-ai',
  NULL,
  'データ分析・AI活用基礎',
  'Data Analysis & AI Fundamentals',
  'practical',
  '#059669',
  '🧠',
  NULL,
  'Pythonを用いてデータの収集・前処理・可視化を行い、生成AIツールを活用して分析結果から示唆を導き出せる。',
  '["Python", "データ前処理", "可視化", "生成AI活用", "統計基礎"]',
  '実践',
  'v01',
  1
);

INSERT OR IGNORE INTO stickers (
  id, primary_category_id, created_by, name, name_en, type, color, emoji,
  image_key, description, skills, level, version, sort_order
) VALUES (
  'NSS-UX-K001v01',
  'cat-ux',
  NULL,
  'UXリサーチ・プロトタイピング基礎',
  'UX Research & Prototyping Fundamentals',
  'practical',
  '#DB2777',
  '✏️',
  NULL,
  'ユーザーインタビューを実施し、その結果をもとにワイヤーフレーム・プロトタイプを作成してユーザビリティ検証まで行える。',
  '["ユーザーインタビュー", "ワイヤーフレーム", "プロトタイピング", "ユーザビリティテスト"]',
  '実践',
  'v01',
  1
);

INSERT OR IGNORE INTO stickers (
  id, primary_category_id, created_by, name, name_en, type, color, emoji,
  image_key, description, skills, level, version, sort_order
) VALUES (
  'NSS-PM-K001v01',
  'cat-pm',
  NULL,
  'プロジェクト進行管理基礎',
  'Project Management Fundamentals',
  'practical',
  '#DC2626',
  '📌',
  NULL,
  'チーム開発・チーム演習において、タスク分解とスケジュール管理を行い、進捗報告と課題共有を主体的に実施できる。',
  '["タスク分解", "スケジュール管理", "進捗報告", "ステークホルダー調整", "議事録作成"]',
  '実践',
  'v01',
  1
);

-- ============================================================
-- sticker_categories（各スタンプを primary_category_id のカテゴリーに紐づけ）
-- ============================================================

INSERT OR IGNORE INTO sticker_categories (sticker_id, category_id, sort_order)
VALUES ('NSS-WEB-K001v01', 'cat-webdev', 1);

INSERT OR IGNORE INTO sticker_categories (sticker_id, category_id, sort_order)
VALUES ('NSS-AI-K001v01', 'cat-ai', 1);

INSERT OR IGNORE INTO sticker_categories (sticker_id, category_id, sort_order)
VALUES ('NSS-UX-K001v01', 'cat-ux', 1);

INSERT OR IGNORE INTO sticker_categories (sticker_id, category_id, sort_order)
VALUES ('NSS-PM-K001v01', 'cat-pm', 1);

-- ============================================================
-- courses（各スタンプに curriculum_year=2025 の授業 1 件）
-- ============================================================

INSERT OR IGNORE INTO courses (
  id, sticker_id, name, code, type, hours, curriculum_year, content_note, sort_order
) VALUES (
  'course-web301-2025',
  'NSS-WEB-K001v01',
  'Webアプリケーション開発演習',
  'WEB301',
  'practical',
  30,
  2025,
  'チーム開発形式でTodoアプリを題材に、要件定義・DB設計・API実装・フロントエンド実装・デプロイまでの一連の工程を演習する。前半はペアプログラミング、後半は3〜4名のチームでのGit運用を経験する。',
  1
);

INSERT OR IGNORE INTO courses (
  id, sticker_id, name, code, type, hours, curriculum_year, content_note, sort_order
) VALUES (
  'course-ai201-2025',
  'NSS-AI-K001v01',
  'データサイエンス実践演習',
  'AI201',
  'practical',
  24,
  2025,
  'オープンデータを題材に、Pandasによる前処理とMatplotlibによる可視化を行った上で、生成AIツールを用いた分析支援・レポート作成までを一連のワークフローとして演習する。',
  1
);

INSERT OR IGNORE INTO courses (
  id, sticker_id, name, code, type, hours, curriculum_year, content_note, sort_order
) VALUES (
  'course-ux201-2025',
  'NSS-UX-K001v01',
  'UXデザイン実践演習',
  'UX201',
  'practical',
  24,
  2025,
  '架空のサービスを題材に、ユーザーインタビューの設計・実施からペルソナ作成、Figmaでのワイヤーフレーム作成、簡易ユーザビリティテストまでを一連のプロセスとして演習する。',
  1
);

INSERT OR IGNORE INTO courses (
  id, sticker_id, name, code, type, hours, curriculum_year, content_note, sort_order
) VALUES (
  'course-pm201-2025',
  'NSS-PM-K001v01',
  'プロジェクトマネジメント演習',
  'PM201',
  'practical',
  18,
  2025,
  '学内合同プロジェクトを題材に、WBSによるタスク分解・ガントチャートでの進捗管理・週次の進捗報告会運営を実践する。チームリーダー役を全員が一度は経験する構成とする。',
  1
);
