const fs = require('fs');

const langs = ['en', 'ja', 'fr'];
const translations = {
  en: {
    title: "Premium & Subscription",
    current_plan: "Current Plan",
    upgrade_btn: "Upgrade to Premium",
    redeem_title: "Complimentary Access",
    redeem_hint: "Enter an access code to unlock Premium features.",
    code_placeholder: "Enter code",
    redeem_btn: "Redeem",
    redeeming: "Redeeming...",
    invalid_code: "This Premium access code is invalid or unavailable.",
    redeem_success: "Code successfully redeemed! You now have Premium access.",
    book_limit_reached: "Free limit reached (30/30 books)",
    books: "books",
    search_limit_reached: "Search limit reached today",
    searches_remaining: "{{remaining}} of 10 searches remaining today",
    feat_unlimited: "Unlimited Books & Searches",
    feat_unlimited_desc: "Register unlimited books and perform unlimited metadata searches.",
    feat_ai: "Advanced AI Suite",
    feat_ai_desc: "AI Note Assistant, AI Quiz, Automatic Synopsis, AI Dictionary, and Conversational Web Search.",
    feat_media: "Focus Media",
    feat_media_desc: "Embed YouTube playlists directly into your reading environment for deep focus.",
    upgrade_coming_soon: "Premium Subscriptions Coming Soon",
    redeem_hint_modal: "Have a complimentary access code? Redeem it in Settings."
  },
  ja: {
    title: "プレミアムとサブスクリプション",
    current_plan: "現在のプラン",
    upgrade_btn: "プレミアムにアップグレード",
    redeem_title: "優待アクセスコード",
    redeem_hint: "プレミアム機能をアンロックするためのアクセスコードを入力してください。",
    code_placeholder: "コードを入力",
    redeem_btn: "適用する",
    redeeming: "適用中...",
    invalid_code: "このプレミアムアクセスコードは無効であるか、利用できません。",
    redeem_success: "コードが正常に適用されました！プレミアムアクセスが有効になりました。",
    book_limit_reached: "無料枠の上限に達しました（30/30冊）",
    books: "冊",
    search_limit_reached: "本日の検索上限に達しました",
    searches_remaining: "本日の残り検索回数: {{remaining}} / 10",
    feat_unlimited: "無制限のライブラリと検索",
    feat_unlimited_desc: "無制限に本を登録し、メタデータ検索を回数制限なしで利用できます。",
    feat_ai: "高度なAI機能",
    feat_ai_desc: "AIノートアシスタント、AIクイズ、自動あらすじ生成、AI辞書、対話型ウェブ検索。",
    feat_media: "集中を深めるメディア",
    feat_media_desc: "読書環境にYouTubeプレイリストを埋め込み、理想的な集中空間を作ります。",
    upgrade_coming_soon: "プレミアムサブスクリプションは近日提供予定です",
    redeem_hint_modal: "優待アクセスコードをお持ちですか？設定から適用できます。"
  },
  fr: {
    title: "Premium et Abonnement",
    current_plan: "Plan Actuel",
    upgrade_btn: "Passer à Premium",
    redeem_title: "Accès Gratuit",
    redeem_hint: "Saisissez un code d'accès pour débloquer les fonctionnalités Premium.",
    code_placeholder: "Entrez le code",
    redeem_btn: "Utiliser",
    redeeming: "En cours...",
    invalid_code: "Ce code d'accès Premium est invalide ou indisponible.",
    redeem_success: "Code utilisé avec succès ! Vous avez maintenant accès à Premium.",
    book_limit_reached: "Limite gratuite atteinte (30/30 livres)",
    books: "livres",
    search_limit_reached: "Limite de recherche atteinte pour aujourd'hui",
    searches_remaining: "{{remaining}} sur 10 recherches restantes aujourd'hui",
    feat_unlimited: "Livres et Recherches Illimités",
    feat_unlimited_desc: "Enregistrez un nombre illimité de livres et effectuez des recherches de métadonnées illimitées.",
    feat_ai: "Suite IA Avancée",
    feat_ai_desc: "Assistant de Notes IA, Quiz IA, Synopsis Automatique, Dictionnaire IA et Recherche Web Conversationnelle.",
    feat_media: "Médias de Concentration",
    feat_media_desc: "Intégrez des playlists YouTube directement dans votre environnement de lecture pour une concentration optimale.",
    upgrade_coming_soon: "Abonnements Premium bientôt disponibles",
    redeem_hint_modal: "Vous avez un code d'accès gratuit ? Utilisez-le dans les Paramètres."
  }
};

for (const lang of langs) {
  const path = `./src/locales/${lang}.json`;
  const data = JSON.parse(fs.readFileSync(path, 'utf8'));
  data.premium = translations[lang];
  fs.writeFileSync(path, JSON.stringify(data, null, 2), 'utf8');
}
