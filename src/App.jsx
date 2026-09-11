import React, { useState, useEffect, useRef } from 'react';
import {
  checkDailyStatus,
  incrementDuroodCount,
  setSnooze,
  isSnoozed,
  getAppSettings,
  toggleShortsGuard,
  unlockAdminWithSecretCode,
  TELEGRAM_ADMIN_LINK,
  addCustomBlockSite,
  removeCustomBlockSite,
  checkIsUrlBlocked,
} from './storage';

export default function App() {
  const [tab, setTab] = useState('tracker');
  const [count, setCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState({ h: '00', m: '00', s: '00' });
  const [isPenalty, setIsPenalty] = useState(false);
  const [showUnlockPopup, setShowUnlockPopup] = useState(false);

  const [settings, setSettings] = useState(getAppSettings());
  const [cooldownCountdown, setCooldownCountdown] = useState('');
  const [showTelegramModal, setShowTelegramModal] = useState(false);
  const [secretCodeInput, setSecretCodeInput] = useState('');
  const [codeError, setCodeError] = useState(false);

  const [newSiteInput, setNewSiteInput] = useState('');
  const [testUrlInput, setTestUrlInput] = useState('');
  const [blockCheckResult, setBlockCheckResult] = useState(null);

  const audioRef = useRef(null);
  const target = 100;
  const progress = Math.min((count / target) * 100, 100);

  useEffect(() => {
    checkDailyStatus();
    refreshData();

    const timer = setInterval(() => {
      const now = new Date();
      const midnight = new Date();
      midnight.setHours(24, 0, 0, 0);

      const diff = midnight - now;
      const h = String(Math.floor(diff / (1000 * 60 * 60))).padStart(2, '0');
      const m = String(Math.floor((diff / (1000 * 60)) % 60)).padStart(2, '0');
      const s = String(Math.floor((diff / 1000) % 60)).padStart(2, '0');

      setTimeLeft({ h, m, s });

      // ৩০ মিনিটের কুলডাউন গণনা
      const currentSettings = getAppSettings();
      if (currentSettings.cooldownUntil > Date.now()) {
        const remaining = Math.ceil((currentSettings.cooldownUntil - Date.now()) / 1000);
        const mins = Math.floor(remaining / 60);
        const secs = remaining % 60;
        setCooldownCountdown(`${mins}মি. ${secs}সে.`);
      } else {
        setCooldownCountdown('');
      }

      if (diff <= 1000) {
        checkDailyStatus();
        refreshData();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const refreshData = () => {
    setCount(parseInt(localStorage.getItem('durood_count') || '0', 10));
    setIsPenalty(localStorage.getItem('penalty_active') === 'true');
    setSettings(getAppSettings());
  };

  const playDuroodAudio = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    }
  };

  const handleRead = () => {
    const updated = incrementDuroodCount();
    setCount(updated);
    if (updated >= target && isPenalty) {
      setIsPenalty(false);
    }
  };

  const handleSnooze = () => {
    setSnooze(1);
    setShowUnlockPopup(false);
  };

  const simulateUnlock = () => {
    playDuroodAudio();
    if (isSnoozed()) {
      alert('দরূদের অডিও বেজেছে! (১ ঘণ্টার জন্য স্নুজ করা)');
    } else {
      setShowUnlockPopup(true);
    }
  };

  const handleToggleShorts = () => {
    const res = toggleShortsGuard();
    if (!res.success) {
      alert(res.message);
    } else {
      setSettings(getAppSettings());
    }
  };

  const handleAdminCodeSubmit = (e) => {
    e.preventDefault();
    if (unlockAdminWithSecretCode(secretCodeInput)) {
      setSettings(getAppSettings());
      setShowTelegramModal(false);
      setSecretCodeInput('');
      setCodeError(false);
      alert('সফল হয়েছে! ডিভাইস অ্যাডমিন গার্ড সাময়িকভাবে বন্ধ করা হয়েছে।');
    } else {
      setCodeError(true);
    }
  };

  const handleAddSite = (e) => {
    e.preventDefault();
    if (!newSiteInput) return;
    addCustomBlockSite(newSiteInput);
    setNewSiteInput('');
    setSettings(getAppSettings());
  };

  const handleRemoveSite = (site) => {
    removeCustomBlockSite(site);
    setSettings(getAppSettings());
  };

  const handleTestUrl = () => {
    if (!testUrlInput) return;
    setBlockCheckResult(checkIsUrlBlocked(testUrlInput));
  };

  const radius = 76;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div style={styles.page}>
      <audio ref={audioRef} src="/durood.mp3" preload="auto" />

      <div style={{ ...styles.phoneBody, borderColor: isPenalty ? '#ef4444' : '#1e293b' }}>
        <div style={styles.notchContainer}><div style={styles.cameraNotch} /></div>

        {/* পেনাল্টি লক */}
        {isPenalty && (
          <div style={styles.penaltyOverlay}>
            <div style={styles.penaltyCard}>
              <div style={{ fontSize: '38px' }}>🔒</div>
              <h3 style={{ color: '#fca5a5', margin: '8px 0 4px 0', fontSize: '20px' }}>স্ক্রিন সম্পূর্ণ লকড</h3>
              <p style={{ fontSize: '12px', color: '#f87171', lineHeight: '1.4', margin: '0 0 16px 0' }}>
                আগের দিনের ১০০ বার দরূদ পাঠ সম্পন্ন হয়নি। আজকের ১০০ বার শেষ না করা পর্যন্ত কোনো অ্যাপ ব্যবহার করা যাবে না।
              </p>
              <div style={styles.penaltyCounter}>{count} <span style={{ fontSize: '18px', color: '#fca5a5' }}>/ 100</span></div>
              <button style={styles.penaltyBtn} onClick={handleRead}>+ ১ বার পাঠ করেছি</button>
            </div>
          </div>
        )}

        {/* টেলিগ্রাম অ্যাডমিন আনলক মডাল */}
        {showTelegramModal && (
          <div style={styles.pinModalOverlay}>
            <div style={styles.pinModalCard}>
              <div style={{ fontSize: '32px' }}>✈️</div>
              <h4 style={{ color: '#f8fafc', margin: '8px 0 4px 0' }}>অ্যাডমিন পারমিশন প্রয়োজন</h4>
              <p style={{ fontSize: '11px', color: '#94a3b8', lineHeight: '1.4', margin: '0 0 12px 0' }}>
                আনইনস্টল করতে টেলিগ্রামে অ্যাডমিনকে নক দিয়ে স্পেশাল সিক্রেট কোড সংগ্রহ করুন।
              </p>
              
              <a
                href={TELEGRAM_ADMIN_LINK}
                target="_blank"
                rel="noreferrer"
                style={styles.telegramLinkBtn}
              >
                টেলিগ্রামে অ্যাডমিনকে নক দিন
              </a>

              <form onSubmit={handleAdminCodeSubmit} style={{ marginTop: '12px' }}>
                <input
                  type="password"
                  placeholder="অ্যাডমিনের দেওয়া কোড দিন"
                  value={secretCodeInput}
                  onChange={(e) => setSecretCodeInput(e.target.value)}
                  style={{ ...styles.pinInputField, borderColor: codeError ? '#ef4444' : '#334155' }}
                  autoFocus
                />
                {codeError && <div style={{ color: '#ef4444', fontSize: '10px', marginTop: '4px' }}>ভুল কোড! অ্যাডমিনের কোড মিলছে না।</div>}
                <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                  <button type="button" style={styles.cancelBtn} onClick={() => setShowTelegramModal(false)}>বাতিল</button>
                  <button type="submit" style={styles.confirmPinBtn}>আনলক করুন</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* আনলক রিমাইন্ডার */}
        {showUnlockPopup && !isPenalty && (
          <div style={styles.popupOverlay}>
            <div style={styles.popupCard}>
              <div style={styles.audioBadge}>🔊 অডিও চলছে</div>
              <div style={styles.arabicHeaderSmall}>اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ</div>
              <p style={{ fontSize: '13px', color: '#cbd5e1', margin: '8px 0' }}>
                আজকের অগ্রগতি: <b style={{ color: '#10b981' }}>{count}</b> / {target}
              </p>
              <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '14px' }}>
                রিসেট বাকি: {timeLeft.h}:{timeLeft.m}:{timeLeft.s}
              </div>
              <button style={styles.primaryBtn} onClick={handleRead}>+ ১ বার পাঠ করেছি</button>
              <button style={styles.snoozeBtn} onClick={handleSnooze}>পরে পড়ব (১ ঘণ্টা পর মনে করাও)</button>
            </div>
          </div>
        )}

        <div style={styles.appContainer}>
          <div style={styles.tabBar}>
            <button style={{ ...styles.tabBtn, ...(tab === 'tracker' ? styles.activeTab : {}) }} onClick={() => setTab('tracker')}>দরূদ</button>
            <button style={{ ...styles.tabBtn, ...(tab === 'shield' ? styles.activeTab : {}) }} onClick={() => setTab('shield')}>শিল্ড ও শর্টস</button>
            <button style={{ ...styles.tabBtn, ...(tab === 'security' ? styles.activeTab : {}) }} onClick={() => setTab('security')}>🔒 আনইনস্টল গার্ড</button>
          </div>

          {/* ট্যাব ১: দরূদ */}
          {tab === 'tracker' && (
            <div style={styles.tabContent}>
              <div style={styles.timerCard}>
                <span style={{ fontSize: '10px', color: '#94a3b8' }}>রিসেট হতে বাকি</span>
                <div style={styles.timerDisplay}>
                  <span>{timeLeft.h}ঘ</span>:<span>{timeLeft.m}মি</span>:<span>{timeLeft.s}সে</span>
                </div>
              </div>
              <div style={styles.arabicHeader}>اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ</div>
              <div style={styles.translation}>“হে আল্লাহ! আপনি মুহাম্মদ (সা.)-এর ওপর রহমত বর্ষণ করুন”</div>

              <div style={styles.circleContainer} onClick={handleRead}>
                <svg width="186" height="186" style={styles.svgCircle}>
                  <circle cx="93" cy="93" r={radius} stroke="#1e293b" strokeWidth="10" fill="transparent" />
                  <circle cx="93" cy="93" r={radius} stroke="url(#emeraldGradient)" strokeWidth="10" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round" fill="transparent" style={{ transition: 'stroke-dashoffset 0.3s ease' }} />
                  <defs>
                    <linearGradient id="emeraldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#10b981" />
                      <stop offset="100%" stopColor="#06b6d4" />
                    </linearGradient>
                  </defs>
                </svg>
                <div style={styles.circleInner}>
                  <span style={styles.counterNum}>{count}</span>
                  <span style={styles.counterSub}>লক্ষ্য: {target}</span>
                </div>
              </div>
              <button style={styles.tasbihTapBtn} onClick={handleRead}>+ ১ বার পাঠ করেছি</button>
            </div>
          )}

          {/* ট্যাব ২: শিল্ড ও শর্টস */}
          {tab === 'shield' && (
            <div style={{ ...styles.tabContent, justifyContent: 'flex-start', gap: '8px' }}>
              
              {/* পর্ন ও জুয়া (নো টগল - চিরতরে সক্রিয়) */}
              <div style={{ ...styles.toggleCard, border: '1px solid rgba(239, 68, 68, 0.4)' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ ...styles.cardTitle, color: '#fca5a5' }}>🚫 পর্ন ও জুয়া ব্লকার (স্থায়ী)</div>
                  <div style={styles.cardSub}>চিরতরে সক্রিয়। কোনোভাবেই বন্ধ করা যাবে না।</div>
                </div>
                <span style={styles.lockedBadge}>সর্বদা অন 🔒</span>
              </div>

              {/* শর্টস ও রিলস (৩০ মিনিট লিমিট) */}
              <div style={styles.toggleCard}>
                <div style={{ flex: 1 }}>
                  <div style={styles.cardTitle}>⚡ শর্টস ও রিলস গার্ড</div>
                  <div style={styles.cardSub}>
                    {cooldownCountdown ? `কুলডাউন: আর ${cooldownCountdown} বাকি` : 'ক্লিক করে চালু/বন্ধ করুন'}
                  </div>
                </div>
                <button
                  style={{
                    ...styles.switchBtn,
                    background: settings.blockShorts ? '#10b981' : '#64748b',
                    opacity: cooldownCountdown ? 0.6 : 1,
                  }}
                  onClick={handleToggleShorts}
                >
                  {settings.blockShorts ? 'চালু' : 'বন্ধ'}
                </button>
              </div>

              <form onSubmit={handleAddSite} style={styles.addForm}>
                <input type="text" placeholder="কাস্টম সাইট..." value={newSiteInput} onChange={(e) => setNewSiteInput(e.target.value)} style={styles.textInput} />
                <button type="submit" style={styles.addBtn}>+ যোগ</button>
              </form>

              <div style={styles.listSection}>
                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 'bold' }}>কাস্টম ব্লকলিস্ট:</span>
                <div style={styles.scrollList}>
                  {settings.customSites.map((site, index) => (
                    <div key={index} style={styles.blockedItem}>
                      <span style={{ fontSize: '12px' }}>🚫 {site}</span>
                      <button style={styles.delBtn} onClick={() => handleRemoveSite(site)}>✕</button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ট্যাব ৩: টেলিগ্রাম আনইনস্টল গার্ড */}
          {tab === 'security' && (
            <div style={{ ...styles.tabContent, justifyContent: 'flex-start', gap: '10px' }}>
              <div style={{ ...styles.toggleCard, border: '1px solid #ef4444' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ ...styles.cardTitle, color: '#fca5a5' }}>🛡️ ডিভাইস অ্যাডমিন গার্ড</div>
                  <div style={styles.cardSub}>অ্যাডমিনের টেলিগ্রাম কোড ছাড়া আনইনস্টল অসম্ভব।</div>
                </div>
                {settings.antiUninstall ? (
                  <button style={{ ...styles.switchBtn, background: '#ef4444' }} onClick={() => setShowTelegramModal(true)}>
                    লকড 🔒
                  </button>
                ) : (
                  <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 'bold' }}>আনলকড</span>
                )}
              </div>

              <div style={styles.securityInfoBox}>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '12px', color: '#38bdf8' }}>✈️ টেলিগ্রাম ভেরিফিকেশন নিয়ম:</h4>
                <p style={{ margin: 0, fontSize: '11px', color: '#94a3b8', lineHeight: '1.5' }}>
                  এই অ্যাপটি আপনার ইচ্ছাশক্তি দুর্বল হলেও আনইনস্টল হতে দেবে না। আনইনস্টল করতে হলে টেলিগ্রামে অ্যাডমিনের কাছে সঠিক কারণ জানিয়ে মাস্টার কোড আনতে হবে।
                </p>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* টেস্ট কন্ট্রোল প্যানেল */}
      <div style={styles.debugPanel}>
        <div style={styles.debugHeader}>🧪 সিস্টেম টেস্ট প্যানেল</div>
        <button style={styles.debugButton} onClick={simulateUnlock}>📱 আনলক টেস্ট (অডিও)</button>
        <div style={{ fontSize: '11px', color: '#94a3b8' }}>অ্যাডমিন মাস্টার কোড: <b>7860</b></div>

        <div style={styles.testSection}>
          <span style={{ fontSize: '11px', color: '#94a3b8' }}>ওয়েব / শর্টস টেস্ট</span>
          <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
            <input type="text" placeholder="pornhub, reels, etc..." value={testUrlInput} onChange={(e) => setTestUrlInput(e.target.value)} style={styles.debugInput} />
            <button style={styles.checkBtn} onClick={handleTestUrl}>চেক</button>
          </div>
          {blockCheckResult && blockCheckResult.blocked && (
            <div style={styles.blockedAlert}>{blockCheckResult.reason}</div>
          )}
          {blockCheckResult && !blockCheckResult.blocked && (
            <div style={styles.allowedAlert}>✅ অনুমোদিত লিঙ্ক!</div>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: { display: 'flex', minHeight: '100vh', background: '#040914', color: '#fff', fontFamily: 'Inter, system-ui, sans-serif', justifyContent: 'center', alignItems: 'center', padding: '20px', gap: '30px', flexWrap: 'wrap', boxSizing: 'border-box' },
  phoneBody: { width: '330px', height: '610px', background: '#0b1326', borderRadius: '36px', border: '4px solid #1e293b', display: 'flex', flexDirection: 'column', position: 'relative', boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.8)', overflow: 'hidden' },
  notchContainer: { width: '100%', height: '22px', display: 'flex', justifyContent: 'center', alignItems: 'center' },
  cameraNotch: { width: '60px', height: '12px', background: '#040914', borderRadius: '8px' },
  appContainer: { flex: 1, display: 'flex', flexDirection: 'column', padding: '8px 18px 18px 18px' },
  tabBar: { display: 'flex', background: '#111c38', borderRadius: '14px', padding: '4px', marginBottom: '12px', gap: '2px' },
  tabBtn: { flex: 1, padding: '8px 4px', border: 'none', background: 'transparent', color: '#64748b', fontSize: '11px', fontWeight: '600', borderRadius: '10px', cursor: 'pointer' },
  activeTab: { background: '#1e293b', color: '#10b981' },
  tabContent: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between' },
  timerCard: { background: 'rgba(17, 28, 56, 0.7)', border: '1px solid rgba(255,255,255,0.05)', padding: '6px 14px', borderRadius: '14px', display: 'flex', flexDirection: 'column', alignItems: 'center' },
  timerDisplay: { display: 'flex', gap: '4px', color: '#38bdf8', fontWeight: 'bold', fontSize: '13px' },
  arabicHeader: { fontSize: '20px', fontWeight: 'bold', color: '#34d399', textAlign: 'center', marginTop: '4px' },
  translation: { fontSize: '10px', color: '#64748b', textAlign: 'center' },
  circleContainer: { position: 'relative', width: '186px', height: '186px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', userSelect: 'none' },
  svgCircle: { transform: 'rotate(-90deg)' },
  circleInner: { position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center' },
  counterNum: { fontSize: '44px', fontWeight: '800', color: '#ffffff', lineHeight: '1' },
  counterSub: { fontSize: '11px', color: '#10b981', marginTop: '4px', fontWeight: '600' },
  tasbihTapBtn: { width: '100%', padding: '13px', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', border: 'none', borderRadius: '18px', color: '#fff', fontSize: '15px', fontWeight: 'bold', cursor: 'pointer' },
  toggleCard: { width: '100%', display: 'flex', alignItems: 'center', background: '#111c38', border: '1px solid #1e293b', padding: '10px 12px', borderRadius: '14px', boxSizing: 'border-box', gap: '8px' },
  cardTitle: { fontWeight: 'bold', fontSize: '12px', color: '#f8fafc' },
  cardSub: { fontSize: '10px', color: '#94a3b8', marginTop: '2px', lineHeight: '1.3' },
  switchBtn: { border: 'none', color: '#fff', padding: '6px 12px', borderRadius: '10px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' },
  lockedBadge: { background: '#450a0a', color: '#f87171', padding: '4px 8px', borderRadius: '8px', fontSize: '10px', fontWeight: 'bold', border: '1px solid #ef4444' },
  securityInfoBox: { width: '100%', background: 'rgba(15, 23, 42, 0.8)', border: '1px solid #1e293b', borderRadius: '14px', padding: '12px', boxSizing: 'border-box', marginTop: '10px' },
  addForm: { display: 'flex', gap: '8px', width: '100%', boxSizing: 'border-box', marginTop: '4px' },
  textInput: { flex: 1, background: '#111c38', border: '1px solid #1e293b', borderRadius: '10px', padding: '8px 10px', color: '#fff', fontSize: '11px', outline: 'none' },
  addBtn: { background: '#0284c7', border: 'none', color: '#fff', borderRadius: '10px', padding: '0 12px', fontWeight: 'bold', cursor: 'pointer', fontSize: '11px' },
  listSection: { width: '100%', flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  scrollList: { flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '5px', marginTop: '6px' },
  blockedItem: { background: '#111c38', padding: '6px 10px', borderRadius: '8px', color: '#fca5a5', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  delBtn: { background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '12px' },
  pinModalOverlay: { position: 'absolute', inset: 0, background: 'rgba(4, 9, 20, 0.95)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', zIndex: 110 },
  pinModalCard: { background: '#0e1830', border: '1px solid rgba(56, 189, 248, 0.3)', borderRadius: '20px', padding: '20px', textAlign: 'center', width: '100%' },
  telegramLinkBtn: { display: 'inline-block', background: '#0284c7', color: '#fff', textDecoration: 'none', padding: '8px 14px', borderRadius: '10px', fontSize: '11px', fontWeight: 'bold', marginBottom: '8px' },
  pinInputField: { width: '140px', textAlign: 'center', fontSize: '16px', background: '#111c38', color: '#fff', border: '1px solid #334155', borderRadius: '10px', padding: '8px', outline: 'none', margin: '0 auto', display: 'block' },
  cancelBtn: { flex: 1, background: '#334155', color: '#cbd5e1', border: 'none', padding: '8px', borderRadius: '10px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' },
  confirmPinBtn: { flex: 1, background: '#ef4444', color: '#fff', border: 'none', padding: '8px', borderRadius: '10px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' },
  popupOverlay: { position: 'absolute', inset: 0, background: 'rgba(4, 9, 20, 0.9)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', zIndex: 90 },
  popupCard: { background: '#0e1830', border: '1px solid rgba(52, 211, 153, 0.2)', borderRadius: '24px', padding: '20px', textAlign: 'center', width: '100%' },
  audioBadge: { fontSize: '11px', color: '#34d399', background: 'rgba(52, 211, 153, 0.1)', padding: '4px 10px', borderRadius: '20px', display: 'inline-block', marginBottom: '8px' },
  arabicHeaderSmall: { fontSize: '16px', fontWeight: 'bold', color: '#f8fafc' },
  primaryBtn: { width: '100%', padding: '12px', background: '#10b981', border: 'none', borderRadius: '14px', color: '#fff', fontWeight: 'bold', cursor: 'pointer', marginBottom: '8px' },
  snoozeBtn: { background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '12px', textDecoration: 'underline', cursor: 'pointer' },
  penaltyOverlay: { position: 'absolute', inset: 0, background: '#280606', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', zIndex: 100 },
  penaltyCard: { textAlign: 'center', width: '100%' },
  penaltyCounter: { fontSize: '48px', fontWeight: 'bold', color: '#ef4444', margin: '10px 0' },
  penaltyBtn: { width: '100%', padding: '13px', background: '#ef4444', border: 'none', borderRadius: '16px', color: '#fff', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer' },
  debugPanel: { background: '#0b1326', border: '1px solid #1e293b', borderRadius: '20px', padding: '18px', width: '230px', display: 'flex', flexDirection: 'column', gap: '10px' },
  debugHeader: { fontSize: '12px', fontWeight: 'bold', color: '#38bdf8' },
  debugButton: { background: '#1e293b', border: '1px solid #334155', color: '#fff', padding: '9px', borderRadius: '10px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' },
  testSection: { borderTop: '1px solid #1e293b', paddingTop: '10px' },
  debugInput: { flex: 1, background: '#111c38', border: '1px solid #1e293b', borderRadius: '8px', padding: '6px 8px', color: '#fff', fontSize: '11px', width: '110px' },
  checkBtn: { background: '#3b82f6', border: 'none', color: '#fff', padding: '6px 10px', borderRadius: '8px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' },
  blockedAlert: { background: 'rgba(239, 68, 68, 0.2)', color: '#f87171', padding: '8px', borderRadius: '6px', fontSize: '11px', marginTop: '6px', textAlign: 'left' },
  allowedAlert: { background: 'rgba(16, 185, 129, 0.2)', color: '#34d399', padding: '8px', borderRadius: '6px', fontSize: '11px', marginTop: '6px', textAlign: 'left' },
};