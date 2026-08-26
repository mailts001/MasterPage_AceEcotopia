// X68 i18n string dictionary — EN + ZH-SG
// Add keys here, consume via useLocale() hook

export type Locale = 'en' | 'zh'

export const strings = {
  // ── Nav ──────────────────────────────────────────────────────────
  nav_humans:     { en: 'Experts',  zh: '人类专家' },
  nav_help:       { en: 'Help',       zh: '帮助' },
  nav_city:       { en: 'Live City',  zh: '实时城市' },
  nav_pricing:    { en: 'Pricing',    zh: '价格' },
  nav_signin:     { en: 'Sign In',    zh: '登录' },
  nav_join:       { en: 'Join Free',  zh: '免费注册' },

  // ── Hero ─────────────────────────────────────────────────────────
  hero_badge:     { en: 'AI Agents Active',      zh: 'AI 代理运行中' },
  hero_h1a:       { en: 'One Account.',           zh: '一个账户。' },
  hero_h1b:       { en: 'Eight AI Districts.',    zh: '八大智能区。' },
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
  districts_h2a:  { en: 'Eight',     zh: '八大' },
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

  d_marketing_name: { en: 'MarketingOS District',      zh: 'MarketingOS 营销区' },
  d_marketing_tag:  { en: 'AI Video Marketing',         zh: 'AI 视频营销' },
  d_marketing_desc: {
    en: 'Submit your product and receive TikTok-ready EN + Chinese videos within 24h — AI writes the script, records the voiceover, and edits the final cut.',
    zh: '提交产品资料，24小时内获得英文与中文双语短视频——AI 自动撰写脚本、配音并完成剪辑。',
  },

  d_careergenome_name: { en: 'CareerGenome District',  zh: 'CareerGenome 职业区' },
  d_careergenome_tag:  { en: 'Career Intelligence',     zh: '职业智能' },
  d_careergenome_desc: {
    en: 'AI narrative interview maps your Career Genome across 10 dimensions, simulates trajectory paths, and predicts hiring cycles before roles are posted.',
    zh: 'AI 叙事访谈绘制您的十维职业基因图谱，模拟职业发展路径，并在职位发布前预测招聘周期。',
  },

  d_deepqi_name: { en: 'Alternative HealthCare',  zh: '中医替代健康区' },
  d_deepqi_tag:  { en: 'TCM Wellness & BaZi',      zh: '中医健康与八字' },
  d_deepqi_desc: {
    en: 'TCM symptom analysis meets BaZi astrology — maps your constitution pattern, cross-references your birth chart, and delivers personalised herb & diet recommendations via Telegram.',
    zh: '中医症状分析与八字星盘结合——分析体质类型，交叉比对命盘，通过 Telegram 推送个性化草药与饮食建议。',
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
  pf_alerts3:      { en: '3 alerts/month across all 8 districts',    zh: '每月 3 条提醒，覆盖全部 8 个智能区' },
  pf_readonly:     { en: 'Read-only access to all district dashboards', zh: '只读访问所有智能区仪表板' },
  pf_watchlist5:   { en: 'Basic watchlist (up to 5 assets)',          zh: '基础自选列表（最多 5 项资产）' },
  pf_api100:       { en: '100 API calls/day (1 key)',                 zh: '每日 100 次 API 调用（1 个密钥）' },
  pf_credits50:    { en: '50 Nexus Credits on signup',               zh: '注册获赠 50 积分' },
  pf_refer:        { en: 'Earn credits by referring friends',         zh: '邀请好友赚取积分' },
  pf_unlimited:    { en: 'Unlimited alerts — all 8 districts',       zh: '无限提醒——覆盖全部 8 个智能区' },
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
  // ── Register page ────────────────────────────────────────────────
  reg_already_title:  { en: "You're already a Citizen!",                        zh: '您已是公民！' },
  reg_already_sub:    { en: 'Your X68 account covers all 8 districts — including', zh: '您的 X68 账户已覆盖全部 8 个智能区，包括' },
  reg_already_note:   { en: 'No separate join needed. Head to your dashboard to access', zh: '无需单独加入。前往仪表板访问' },
  reg_already_note2:  { en: 'and configure your watchlist.',                    zh: '并配置您的自选列表。' },
  reg_go_dashboard:   { en: 'Go to Dashboard →',                                zh: '前往仪表板 →' },
  reg_back_home:      { en: 'Back to Home',                                     zh: '返回首页' },
  reg_title:          { en: 'Become a Citizen',                                 zh: '成为公民' },
  reg_label_name:     { en: 'Display Name',                                     zh: '显示名称' },
  reg_ph_name:        { en: 'How should we call you?',                          zh: '请输入您的昵称' },
  reg_label_email:    { en: 'Email',                                            zh: '电子邮件' },
  reg_label_password: { en: 'Password',                                         zh: '密码' },
  reg_ph_password:    { en: 'At least 8 characters',                            zh: '至少 8 个字符' },
  reg_label_referral: { en: 'Referral Code',                                    zh: '推荐码' },
  reg_optional:       { en: '(optional)',                                        zh: '（选填）' },
  reg_ph_referral:    { en: 'e.g. AB12CD34',                                    zh: '例如 AB12CD34' },
  reg_btn_loading:    { en: 'Creating account…',                                zh: '创建中…' },
  reg_btn_join:       { en: 'Join as a Citizen — Free',                         zh: '免费加入公民计划' },
  reg_free_includes:  { en: 'Free tier includes:',                              zh: '免费版包含：' },
  reg_signin_prompt:  { en: 'Already a citizen?',                               zh: '已有账户？' },
  reg_signin_link:    { en: 'Sign in',                                          zh: '立即登录' },
  reg_success:        {
    en: "Check your email to confirm your account. You'll receive 50 Nexus Credits on first login!",
    zh: '请查收确认邮件以激活账户，首次登录即获赠 50 积分！',
  },

  // ── District themes (register page) ─────────────────────────────
  dt_propos_name:       { en: 'PropOS District',      zh: 'PropOS 房产区' },
  dt_propos_tag:        { en: 'Property Intelligence', zh: '房产智能' },
  dt_propos_benefit:    { en: 'Get refinance alerts & property deal signals worth $300–800/month', zh: '获取每月价值 $300–800 的再融资提醒与房产交易信号' },
  dt_finance_name:      { en: 'Financial District',     zh: '金融区' },
  dt_finance_tag:       { en: 'Investment Intelligence', zh: '投资智能' },
  dt_finance_benefit:   { en: 'Get stock momentum signals, earnings alerts & REIT tracking', zh: '获取股票动能信号、财报提醒与房产信托追踪' },
  dt_travel_name:       { en: 'NexusTravel District', zh: 'NexusTravel 旅行区' },
  dt_travel_tag:        { en: 'Travel Intelligence',  zh: '旅行智能' },
  dt_travel_benefit:    { en: 'Get flight price drop alerts & hotel deals — save $100–400 per trip', zh: '获取机票降价与酒店特价提醒——每次旅行节省 $100–400' },
  dt_commerce_name:     { en: 'Commerce District',     zh: '电商区' },
  dt_commerce_tag:      { en: 'Arbitrage Intelligence', zh: '套利智能' },
  dt_commerce_benefit:  { en: 'Get price gap signals across Shopee, Lazada & Amazon', zh: '获取 Shopee、Lazada 与亚马逊跨平台价差信号' },
  dt_default_name:      { en: 'X68',                  zh: 'X68' },
  dt_default_tag:       { en: 'AI Economic Ecosystem', zh: 'AI 经济生态系统' },
  dt_default_benefit:   { en: 'Access all 8 districts — property, stocks, travel, commerce, wellness, marketing, career & TCM AI agents', zh: '访问全部 8 个智能区——房产、股票、旅行、电商、健康、营销、职业与中医 AI 代理' },

} as const

export type StringKey = keyof typeof strings

// ── Array strings (not passed through t()) ───────────────────────
// Access directly: districtFeatures['aceeconomy'][locale]
export const districtFeatures = {
  propos: {
    en: ['🏠 Property valuation alerts','📊 Refinance opportunity signals','📍 District price trend reports','💰 50 Nexus Credits on signup','🔗 Earn 100 credits per referral'],
    zh: ['🏠 房产估值提醒','📊 再融资机会信号','📍 区域价格趋势报告','💰 注册赠 50 积分','🔗 每次推荐赚 100 积分'],
  },
  aceeconomy: {
    en: ['📈 Stock momentum signals (US & HK)','🔔 Earnings surprise alerts','🏦 REIT & ETF tracking','💰 50 Nexus Credits on signup','🔗 Earn 100 credits per referral'],
    zh: ['📈 美港股动能信号','🔔 财报超预期提醒','🏦 房产信托与 ETF 追踪','💰 注册赠 50 积分','🔗 每次推荐赚 100 积分'],
  },
  nexustravel: {
    en: ['✈️ Flight price drop alerts','🏨 Hotel deal notifications','💱 Currency signals for your routes','💰 50 Nexus Credits on signup','🔗 Earn 100 credits per referral'],
    zh: ['✈️ 机票降价提醒','🏨 酒店特价通知','💱 航线汇率信号','💰 注册赠 50 积分','🔗 每次推荐赚 100 积分'],
  },
  commerce: {
    en: ['🛒 Multi-platform arbitrage signals','💹 Demand & supply gap analysis','📦 Net margin calculator (fees + shipping)','💰 50 Nexus Credits on signup','🔗 Earn 100 credits per referral'],
    zh: ['🛒 跨平台套利信号','💹 供需差距分析','📦 净利润计算器（含费用与运费）','💰 注册赠 50 积分','🔗 每次推荐赚 100 积分'],
  },
  marketingos: {
    en: ['🎬 AI-written video scripts','🎙️ Automatic EN + Chinese voiceover','📱 TikTok, IG Reels, YouTube Shorts, LinkedIn','⚡ 24h turnaround from submission','🔗 Optional affiliate link in video CTA'],
    zh: ['🎬 AI 自动撰写视频脚本','🎙️ 英文与中文双语自动配音','📱 支持 TikTok、IG Reels、YouTube Shorts、LinkedIn','⚡ 提交后 24 小时内完成','🔗 可在视频 CTA 中加入联盟链接'],
  },
  careergenome: {
    en: ['🧬 AI narrative interview → Career Genome (10 dimensions)','🗺️ Trajectory Simulator with probability scores','📡 Hiring cycle prediction before roles post','👔 Recruiter search access (B2B)','💰 50 Nexus Credits on signup'],
    zh: ['🧬 AI 叙事访谈生成十维职业基因图谱','🗺️ 职业路径模拟器（含概率评分）','📡 职位发布前预测招聘周期','👔 招聘方搜索权限（B2B）','💰 注册赠 50 积分'],
  },
  default: {
    en: ['🌐 Access all 8 AI districts','🔔 3 free alerts per month','💰 50 Nexus Credits on signup','🔗 Earn 100 credits per referral','👤 Citizen profile & watchlist'],
    zh: ['🌐 访问全部 8 个智能区','🔔 每月 3 条免费提醒','💰 注册赠 50 积分','🔗 每次推荐赚 100 积分','👤 公民档案与自选列表'],
  },
} as const
