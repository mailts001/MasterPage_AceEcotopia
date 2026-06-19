// X68 i18n string dictionary — EN + ZH-SG
// Add keys here, consume via useLocale() hook

export type Locale = 'en' | 'zh'

export const strings = {
  // ── Nav ──────────────────────────────────────────────────────────
  nav_help:       { en: 'Help',       zh: '帮助' },
  nav_city:       { en: 'Live City',  zh: '实时城市' },
  nav_pricing:    { en: 'Pricing',    zh: '价格' },
  nav_signin:     { en: 'Sign In',    zh: '登录' },
  nav_join:       { en: 'Join Free',  zh: '免费注册' },

  // ── Hero ─────────────────────────────────────────────────────────
  hero_badge:     { en: 'AI Agents Active',      zh: 'AI 代理运行中' },
  hero_h1a:       { en: 'One Account.',           zh: '一个账户。' },
  hero_h1b:       { en: 'Five AI Districts.',     zh: '五大智能区。' },
  hero_sub:       {
    en: 'X68 runs AI agents on property, stocks, flights, commerce and wellness — 24/7. You get alerts when something is worth acting on.',
    zh: 'X68 的 AI 代理全天候监测房产、股票、机票、电商与健康资讯。有价值的机会出现时，即时通知您。',
  },
  hero_cta1:      { en: 'Join as a Citizen — Free', zh: '免费加入公民计划' },
  hero_cta2:      { en: 'Explore Districts',         zh: '探索各区' },

  // ── Hero value pills ─────────────────────────────────────────────
  pill_property:  { en: '🏠 Refinance alert before rates move',        zh: '🏠 利率变动前收到再融资提醒' },
  pill_stocks:    { en: '📈 Stock squeeze signal before breakout',      zh: '📈 突破前捕捉挤压信号' },
  pill_travel:    { en: '✈️ Fare drop on your saved route',            zh: '✈️ 关注航线价格下跌提醒' },
  pill_commerce:  { en: '🛒 Arbitrage gap: buy low, sell high',        zh: '🛒 跨平台套利差价：低买高卖' },
  pill_wellness:  { en: '🌿 Morning wellness brief + SG events radar', zh: '🌿 每日健康简报＋新加坡活动雷达' },

  // ── Hero stats ───────────────────────────────────────────────────
  stat_properties: { en: 'Properties Monitored', zh: '监测中的房产' },
  stat_signals:    { en: 'Signals Today',         zh: '今日信号' },
  stat_citizens:   { en: 'Citizens',              zh: '公民数量' },
  stat_alerts:     { en: 'Alerts Sent',           zh: '已发送提醒' },

  // ── Districts section ────────────────────────────────────────────
  districts_h2a:  { en: 'Five',      zh: '五大' },
  districts_h2b:  { en: 'Districts', zh: '智能区' },
  districts_sub:  {
    en: 'Each district has AI agents running 24/7. As a citizen, you decide which ones work for you.',
    zh: '每个智能区的 AI 代理全天候运行。作为公民，您自主选择所需服务。',
  },
  districts_live:       { en: 'LIVE',          zh: '运行中' },
  districts_loading:    { en: 'Loading...',     zh: '加载中…' },
  districts_alerts:     { en: 'alerts today',  zh: '今日提醒' },
  districts_monitors:   { en: 'monitors active', zh: '监测项目' },
  districts_visit:      { en: 'Visit District →', zh: '进入智能区 →' },
  districts_join:       { en: 'Join to Access →', zh: '注册后访问 →' },

  // ── District names + descriptions ───────────────────────────────
  d_propos_name:    { en: 'PropOS District',      zh: 'PropOS 房产区' },
  d_propos_tag:     { en: 'Property Intelligence', zh: '房产智能' },
  d_propos_desc:    {
    en: 'AI monitors Singapore property market 24/7. Get alerts on refinance opportunities, valuation changes, and sell signals before your neighbours.',
    zh: 'AI 全天候监测新加坡房产市场。在邻居之前收到再融资机会、估值变化及出售信号。',
  },
  d_finance_name:   { en: 'Financial District',     zh: '金融区' },
  d_finance_tag:    { en: 'Investment Intelligence', zh: '投资智能' },
  d_finance_desc:   {
    en: 'AI tracks your watchlist across US stocks, HK equities, REITs and ETFs. Get momentum signals and earnings alerts before the crowd.',
    zh: 'AI 追踪您的美股、港股、房产信托及 ETF 自选列表，率先获取动能信号与财报提醒。',
  },
  d_travel_name:    { en: 'NexusTravel District', zh: 'NexusTravel 旅行区' },
  d_travel_tag:     { en: 'Travel Intelligence',  zh: '旅行智能' },
  d_travel_desc:    {
    en: 'AI monitors your saved routes and hotels. Get instant alerts when flight prices drop below your threshold.',
    zh: 'AI 监测您保存的航线与酒店，机票价格跌破设定值时立即通知。',
  },
  d_commerce_name:  { en: 'E-commerce District',     zh: '电商区' },
  d_commerce_tag:   { en: 'Arbitrage Intelligence',  zh: '套利智能' },
  d_commerce_desc:  {
    en: 'AI scans price gaps across Shopee, Lazada and Amazon. Surface arbitrage opportunities and optimise your listings automatically.',
    zh: 'AI 扫描 Shopee、Lazada 与亚马逊的价差，自动发现套利机会并优化您的商品列表。',
  },
  d_serenity_name:  { en: 'SerenityOS District',        zh: 'SerenityOS 健康区' },
  d_serenity_tag:   { en: 'Wellness + Events Intelligence', zh: '健康与活动智能' },
  d_serenity_desc:  {
    en: 'AI surfaces SG events matched to your taste, tracks your daily Serenity Score, and delivers a morning wellness brief with breathing exercises.',
    zh: 'AI 推送符合您喜好的新加坡活动，追踪每日宁静评分，并发送含呼吸练习的早间健康简报。',
  },

  // ── How it works ─────────────────────────────────────────────────
  hiw_h2a:    { en: 'How',          zh: '如何' },
  hiw_h2b:    { en: 'Citizenship',  zh: '成为公民' },
  hiw_h2c:    { en: 'Works',        zh: '' },
  hiw_sub:    { en: 'Four steps from visitor to AI-powered citizen', zh: '四步完成，从访客到 AI 赋能公民' },
  hiw_s1t:    { en: 'Enter Free',   zh: '免费探索' },
  hiw_s1d:    { en: 'Explore all districts. See live AI activity. No account needed.',        zh: '探索所有智能区，查看实时 AI 活动，无需账户。' },
  hiw_s2t:    { en: 'Register',     zh: '注册' },
  hiw_s2d:    { en: 'Create your citizen profile. Save properties, stocks, routes.',          zh: '创建公民档案，保存房产、股票及航线。' },
  hiw_s3t:    { en: 'Get Alerts',   zh: '接收提醒' },
  hiw_s3d:    { en: 'AI monitors your assets 24/7. Alerts via Telegram or email.',            zh: 'AI 全天候监测您的资产，通过 Telegram 或邮件即时提醒。' },
  hiw_s4t:    { en: 'Act & Earn',   zh: '行动与奖励' },
  hiw_s4d:    { en: 'Act on signals. Save money. Earn credits by referring friends.',         zh: '依据信号行动，节省开支，邀请好友赚取积分。' },

  // ── Pricing ──────────────────────────────────────────────────────
  pricing_h2:      { en: 'Simple Pricing',        zh: '简单透明的价格' },
  pricing_sub:     { en: 'Start free. Upgrade when the AI pays for itself.', zh: '免费开始，当 AI 为您创造价值时再升级。' },
  pricing_free:    { en: 'Free',          zh: '免费' },
  pricing_forever: { en: 'forever',       zh: '永久免费' },
  pricing_month:   { en: '/month',        zh: '/月' },
  pricing_popular: { en: '★ Most Popular', zh: '★ 最受欢迎' },
  tier_explorer:   { en: 'Explorer',      zh: '探索者' },
  tier_citizen:    { en: 'Citizen',       zh: '公民' },
  tier_enterprise: { en: 'Enterprise',    zh: '企业版' },
  tier_e_desc:     { en: 'See what the AI finds. No commitment.',      zh: '探索 AI 发现的机会，无需承诺。' },
  tier_c_desc:     { en: 'Unlimited AI monitoring. Telegram delivery.', zh: '无限 AI 监测，Telegram 即时送达。' },
  tier_ent_desc:   { en: 'For teams and businesses.',                   zh: '适合团队与企业。' },
  cta_start_free:  { en: 'Start Free',        zh: '免费开始' },
  cta_become:      { en: 'Become a Citizen',  zh: '成为公民' },
  cta_contact:     { en: 'Contact Us',        zh: '联系我们' },

  // ── Pricing features ─────────────────────────────────────────────
  pf_alerts3:      { en: '3 alerts/month across all 5 districts',    zh: '每月 3 条提醒，覆盖全部 5 个智能区' },
  pf_readonly:     { en: 'Read-only access to all district dashboards', zh: '只读访问所有智能区仪表板' },
  pf_watchlist5:   { en: 'Basic watchlist (up to 5 assets)',          zh: '基础自选列表（最多 5 项资产）' },
  pf_api100:       { en: '100 API calls/day (1 key)',                 zh: '每日 100 次 API 调用（1 个密钥）' },
  pf_credits50:    { en: '50 Nexus Credits on signup',               zh: '注册获赠 50 积分' },
  pf_refer:        { en: 'Earn credits by referring friends',         zh: '邀请好友赚取积分' },
  pf_unlimited:    { en: 'Unlimited alerts — all 5 districts',       zh: '无限提醒——覆盖 5 个智能区' },
  pf_telegram:     { en: 'Telegram instant delivery (before email)',  zh: 'Telegram 即时送达（优先于邮件）' },
  pf_watchlistU:   { en: 'Unlimited watchlist assets',               zh: '自选列表资产无上限' },
  pf_api10k:       { en: '10,000 API calls/day (3 keys)',            zh: '每日 10,000 次 API 调用（3 个密钥）' },
  pf_credits100:   { en: '100 bonus Nexus Credits/month',            zh: '每月赠送 100 积分' },
  pf_priority:     { en: 'Priority signals queue',                   zh: '优先信号队列' },
  pf_fullwrite:    { en: 'Full write access to all districts',       zh: '所有智能区完整写入权限' },
  pf_custom:       { en: 'Custom alert volume',                      zh: '自定义提醒量' },
  pf_sla:          { en: 'SLA + dedicated support',                  zh: 'SLA 协议＋专属支持' },
  pf_whitelabel:   { en: 'White-label option',                       zh: '白标方案可选' },
  pf_api_bulk:     { en: 'Bulk API access',                          zh: '批量 API 访问' },
} as const

export type StringKey = keyof typeof strings
