const KEYS = {
  TODAY_DATE: 'today_date',
  DUROOD_COUNT: 'durood_count',
  PENALTY_ACTIVE: 'penalty_active',
  SNOOZE_UNTIL: 'snooze_until',
  BLOCKED_SITES: 'blocked_sites',
  BLOCK_SHORTS: 'block_shorts',
  SHORTS_COOLDOWN_UNTIL: 'shorts_cooldown_until',
  ANTI_UNINSTALL: 'anti_uninstall',
};

// অ্যাডমিনের দেওয়া সিক্রেট মাস্টার কোড (যা আপনি টেলিগ্রামে দিবেন)
export const ADMIN_SECRET_CODE = '7860';
export const TELEGRAM_ADMIN_LINK = 'https://t.me/your_telegram_username'; // আপনার টেলিগ্রাম লিঙ্ক

export const ADULT_KEYWORDS = ['porn', 'xxx', 'xvideos', 'xnxx', 'adult', 'sex'];
export const GAMBLING_KEYWORDS = ['1xbet', 'bet365', 'melbet', 'casino', 'gambling', 'baji', 'jeetbuzz'];
export const SHORTS_KEYWORDS = ['shorts', 'reels', 'tiktok', 'stories'];

export const getTodayDateString = () => {
  return new Date().toISOString().split('T')[0];
};

export const checkDailyStatus = () => {
  const savedDate = localStorage.getItem(KEYS.TODAY_DATE);
  const currentDate = getTodayDateString();
  const currentCount = parseInt(localStorage.getItem(KEYS.DUROOD_COUNT) || '0', 10);

  if (savedDate && savedDate !== currentDate) {
    if (currentCount < 100) {
      localStorage.setItem(KEYS.PENALTY_ACTIVE, 'true');
    }
    localStorage.setItem(KEYS.DUROOD_COUNT, '0');
    localStorage.setItem(KEYS.TODAY_DATE, currentDate);
  } else if (!savedDate) {
    localStorage.setItem(KEYS.TODAY_DATE, currentDate);
    localStorage.setItem(KEYS.DUROOD_COUNT, '0');
    localStorage.setItem(KEYS.PENALTY_ACTIVE, 'false');
    localStorage.setItem(KEYS.BLOCK_SHORTS, 'true');
    localStorage.setItem(KEYS.ANTI_UNINSTALL, 'true');
    localStorage.setItem(KEYS.BLOCKED_SITES, JSON.stringify(['instagram.com', 'tiktok.com']));
  }
};

export const incrementDuroodCount = () => {
  const current = parseInt(localStorage.getItem(KEYS.DUROOD_COUNT) || '0', 10);
  const newCount = current + 1;
  localStorage.setItem(KEYS.DUROOD_COUNT, newCount.toString());

  const isPenalty = localStorage.getItem(KEYS.PENALTY_ACTIVE) === 'true';
  if (isPenalty && newCount >= 100) {
    localStorage.setItem(KEYS.PENALTY_ACTIVE, 'false');
  }
  return newCount;
};

export const setSnooze = (hours = 1) => {
  const unlockTime = Date.now() + hours * 60 * 60 * 1000;
  localStorage.setItem(KEYS.SNOOZE_UNTIL, unlockTime.toString());
};

export const isSnoozed = () => {
  const snoozeTime = parseInt(localStorage.getItem(KEYS.SNOOZE_UNTIL) || '0', 10);
  return Date.now() < snoozeTime;
};

export const getAppSettings = () => {
  return {
    blockShorts: localStorage.getItem(KEYS.BLOCK_SHORTS) !== 'false',
    antiUninstall: localStorage.getItem(KEYS.ANTI_UNINSTALL) === 'true',
    cooldownUntil: parseInt(localStorage.getItem(KEYS.SHORTS_COOLDOWN_UNTIL) || '0', 10),
    customSites: JSON.parse(localStorage.getItem(KEYS.BLOCKED_SITES) || '[]'),
  };
};

// শর্টস টগল লজিক (৩০ মিনিটের কুলডাউন সহ)
export const toggleShortsGuard = () => {
  const settings = getAppSettings();
  const now = Date.now();

  if (now < settings.cooldownUntil) {
    const remainingMins = Math.ceil((settings.cooldownUntil - now) / (60 * 1000));
    return { success: false, message: `কুলডাউন সক্রিয়! আর ${remainingMins} মিনিট পর পরিবর্তন করতে পারবেন।` };
  }

  const newState = !settings.blockShorts;
  localStorage.setItem(KEYS.BLOCK_SHORTS, newState.toString());
  // ৩০ মিনিটের কুলডাউন টাইমার সেট
  localStorage.setItem(KEYS.SHORTS_COOLDOWN_UNTIL, (now + 30 * 60 * 1000).toString());

  return { success: true, state: newState };
};

// টেলিগ্রাম কোড দিয়ে আনইনস্টল গার্ড নিষ্ক্রিয় করা
export const unlockAdminWithSecretCode = (inputCode) => {
  if (inputCode.trim() === ADMIN_SECRET_CODE) {
    localStorage.setItem(KEYS.ANTI_UNINSTALL, 'false');
    return true;
  }
  return false;
};

export const addCustomBlockSite = (url) => {
  const sites = JSON.parse(localStorage.getItem(KEYS.BLOCKED_SITES) || '[]');
  const cleanUrl = url.toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, '').trim();
  if (cleanUrl && !sites.includes(cleanUrl)) {
    sites.push(cleanUrl);
    localStorage.setItem(KEYS.BLOCKED_SITES, JSON.stringify(sites));
  }
  return sites;
};

export const removeCustomBlockSite = (url) => {
  let sites = JSON.parse(localStorage.getItem(KEYS.BLOCKED_SITES) || '[]');
  sites = sites.filter((s) => s !== url);
  localStorage.setItem(KEYS.BLOCKED_SITES, JSON.stringify(sites));
  return sites;
};

export const checkIsUrlBlocked = (url) => {
  const clean = url.toLowerCase();
  const settings = getAppSettings();

  // ১. পর্ন ও জুয়া চিরতরে ব্লকড
  if (ADULT_KEYWORDS.some((kw) => clean.includes(kw))) return { blocked: true, reason: '🚫 পর্নোগ্রাফি চিরতরে নিষিদ্ধ' };
  if (GAMBLING_KEYWORDS.some((kw) => clean.includes(kw))) return { blocked: true, reason: '🚫 জুয়া ও বেটিং চিরতরে নিষিদ্ধ' };
  
  // ২. শর্টস গার্ড চেক
  if (settings.blockShorts && SHORTS_KEYWORDS.some((kw) => clean.includes(kw))) return { blocked: true, reason: '⚡ শর্টস ও রিলস গার্ড দ্বারা ব্লকড' };

  // ৩. কাস্টম সাইট
  if (settings.customSites.some((site) => clean.includes(site))) return { blocked: true, reason: 'কাস্টম ব্লকলিস্ট' };

  return { blocked: false, reason: '' };
};