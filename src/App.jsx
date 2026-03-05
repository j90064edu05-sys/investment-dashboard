import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  ComposedChart, Line, Area, Bar, BarChart, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, 
  Tooltip as RechartsTooltip, Legend, ResponsiveContainer, ReferenceLine, Scatter
} from 'recharts';
import { 
  PieChart as PieIcon, ArrowUpCircle, ArrowDownCircle, RefreshCw, Settings, 
  TrendingUp, DollarSign, Briefcase, FileText, AlertCircle, BarChart2, 
  Loader2, Wifi, WifiOff, LineChart as LineIcon, Info, AlertTriangle, 
  ArrowUp, ArrowDown, ArrowUpDown, Move, Sparkles, Bot, ChevronDown, ChevronUp, FileSearch, Save, Key, Cpu, Calculator, Globe, CheckCircle, Database, BrainCircuit, Lock, MessageSquare, Send, Target, Clock, Activity, ClipboardCheck, ShieldAlert, Crosshair, Repeat, BarChart4, TrendingDown, Percent, Layers, Link as LinkIcon, XCircle, PlusCircle
} from 'lucide-react';

/**
 * Alpha 投資戰情室 v54.5 (Smart DCA Timing)
 * * [修正內容]
 * 1. 更新 AI Prompt，讓定期定額 (DCA) 在非最後一個交易日時，能主動尋找當月相對低點作為基礎扣款時機。
 */

// --- 靜態配置 ---

const DEMO_DATA = [
  { 日期: '2015-01-15', 標的: '2330.TW', 名稱: '台積電', 類別: '股票', 價格: 140, 股數: 1000, 策略: '基礎買入', 金額: 140000 },
  { 日期: '2019-08-15', 標的: '2330.TW', 名稱: '台積電', 類別: '股票', 價格: 250, 股數: 500, 策略: 'MA60有撐', 金額: 125000 },
  { 日期: '2020-03-20', 標的: '2330.TW', 名稱: '台積電', 類別: '股票', 價格: 270, 股數: 500, 策略: '金字塔_S1', 金額: 135000 },
  { 日期: '2021-05-15', 標的: '2330.TW', 名稱: '台積電', 類別: '股票', 價格: 550, 股數: 200, 策略: 'K值超賣', 金額: 110000 },
  { 日期: '2022-01-10', 標的: '2330.TW', 名稱: '台積電', 類別: '股票', 價格: 600, 股數: 100, 策略: '金字塔_S2', 金額: 60000 },
  { 日期: '2018-02-20', 標的: '0050.TW', 名稱: '元大台灣50', 類別: '股票', 價格: 80, 股數: 2000, 策略: '基礎買入', 金額: 160000 },
  { 日期: '2022-10-25', 標的: '0050.TW', 名稱: '元大台灣50', 類別: '股票', 價格: 100, 股數: 1000, 策略: 'MA120有撐', 金額: 100000 },
  { 日期: '2021-03-10', 標的: '00679B.TWO', 名稱: '元大美債20年', 類別: '債券', 價格: 30, 股數: 1000, 策略: '基礎買入', 金額: 30000 },
  { 日期: '2023-06-01', 標的: 'USD-TD', 名稱: '美元定存', 類別: '定存', 價格: 1, 股數: 10000, 策略: '基礎買入', 金額: 305000 }, 
  { 日期: '2023-07-01', 標的: 'TWD-TD', 名稱: '台幣定存', 類別: '定存', 價格: 1, 股數: 100000, 策略: '基礎買入', 金額: 100000 }, 
];

const COLORS = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#6366F1'];

const STRATEGY_CONFIG = {
  '基礎買入':      { color: '#EF4444', label: '基礎買入',       shape: 'circle' },
  '金字塔_S1':    { color: '#F97316', label: '金字塔_S1',      shape: 'triangle' },
  '金字塔_S2':    { color: '#EAB308', label: '金字塔_S2',      shape: 'triangle' },
  '金字塔_S3':    { color: '#84CC16', label: '金字塔_S3',      shape: 'triangle' },
  'K值超賣':       { color: '#3B82F6', label: 'K值超賣',        shape: 'diamond' },
  'MA60有撐':      { color: '#8B5CF6', label: 'MA60有撐',       shape: 'star' },
  'MA120有撐':     { color: '#06B6D4', label: 'MA120有撐',      shape: 'square' },
  'default':       { color: '#64748B', label: '其他策略',       shape: 'cross' }
};

const CATEGORY_STYLES = {
  '股票': { color: '#3B82F6', badge: 'bg-blue-900 text-blue-200' },        
  '債券': { color: '#A855F7', badge: 'bg-purple-900 text-purple-200' },    
  '定存': { color: '#22C55E', badge: 'bg-green-900 text-green-200' },      
  'default': { color: '#64748B', badge: 'bg-slate-700 text-slate-300' }    
};

const AVAILABLE_MODELS = [
  { id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro Preview (最強大)' },
  { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash Preview (最新快速)' },
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash (平衡)' },
  { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro (穩定)' },
];

const ASSET_TYPES = {
  'CORE': { label: '核心資產', color: 'text-blue-300', bg: 'bg-blue-900/50', border: 'border-blue-500/50' },
  'SATELLITE': { label: '衛星資產', color: 'text-orange-300', bg: 'bg-orange-900/50', border: 'border-orange-500/50' }
};

const ADDON_LOGICS = {
    'NONE': { label: '無 (None)', icon: Minus },
    'PYRAMID': { label: '跌幅金字塔', icon: TrendingDown },
    'TECHNICAL': { label: '技術指標', icon: BarChart4 },
    'YIELD_MACRO': { label: '殖利率/總經訊號', icon: Globe }
};

const INDICATOR_TYPES = {
    'KD': { label: 'KD指標' },
    'MACD': { label: 'MACD' },
    'RSI': { label: 'RSI相對強弱' }
};

// --- 輔助函式 (Helpers) ---
const Minus = (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinelinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line></svg>;

const formatCurrency = (value) => new Intl.NumberFormat('zh-TW', { style: 'currency', currency: 'TWD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value || 0);
const formatPercent = (value) => `${((value || 0) * 100).toFixed(2)}%`;
const formatPrice = (value) => typeof value === 'number' ? value.toFixed(2) : (value || '0.00');
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const getTodayDate = () => {
    const d = new Date();
    const offset = d.getTimezoneOffset() * 60000;
    const localDate = new Date(d.getTime() - offset);
    return localDate.toISOString().split('T')[0];
};

const isTaiwanTradingHours = () => {
    const now = new Date();
    const day = now.getDay(); 
    const hour = now.getHours();
    const minute = now.getMinutes();
    if (day >= 1 && day <= 5) {
        const currentMinutes = hour * 60 + minute;
        return currentMinutes >= 540 && currentMinutes <= 825; 
    }
    return false;
};

// --- 快取管理 ---
const getAiCache = () => { try { return JSON.parse(localStorage.getItem('gemini_analysis_cache') || '{}'); } catch { return {}; } };
const updateAiCache = (symbol, data, dataDate) => { 
  const today = getTodayDate();
  const cache = getAiCache();
  const existing = cache[symbol] || {};
  const newEntry = { date: today, ...existing, ...data, dataDate }; 
  const newCache = { ...cache, [symbol]: newEntry };
  localStorage.setItem('gemini_analysis_cache', JSON.stringify(newCache));
};

const getPriceCache = () => { try { return JSON.parse(localStorage.getItem('investment_price_cache') || '{}'); } catch { return {}; } };
const savePriceCache = (newPrices, extraData) => {
    const cache = getPriceCache();
    const today = getTodayDate();
    const updatedCache = { ...cache };
    Object.keys(newPrices).forEach(symbol => { 
        const existing = updatedCache[symbol] || {};
        updatedCache[symbol] = { 
            ...existing,
            price: newPrices[symbol], 
            date: today, 
            timestamp: Date.now(),
            nav: extraData[symbol]?.nav || existing.nav,
            navSource: extraData[symbol]?.navSource || existing.navSource,
            yield: extraData[symbol]?.yield || existing.yield,
            yieldSource: extraData[symbol]?.yieldSource || existing.yieldSource,
            dateStr: extraData[symbol]?.dateStr || existing.dateStr,
            priceSource: extraData[symbol]?.priceSource || existing.priceSource
        }; 
    });
    localStorage.setItem('investment_price_cache', JSON.stringify(updatedCache));
};

// --- 圖表繪製輔助 ---
const renderShape = (shape, cx, cy, color, size = 6) => {
  const stroke = "#fff";
  const strokeWidth = 1.5;
  switch (shape) {
    case 'circle': return <circle cx={cx} cy={cy} r={size} fill={color} stroke={stroke} strokeWidth={strokeWidth} />;
    case 'triangle': return <path d={`M${cx},${cy-size} L${cx+size},${cy+size*0.8} L${cx-size},${cy+size*0.8} Z`} fill={color} stroke={stroke} strokeWidth={strokeWidth} />;
    case 'diamond': return <path d={`M${cx},${cy-size} L${cx+size},${cy} L${cx},${cy+size} L${cx-size},${cy} Z`} fill={color} stroke={stroke} strokeWidth={strokeWidth} />;
    case 'star': const s = size * 1.2; return <path d={`M${cx},${cy-s} L${cx+s*0.3},${cy-s*0.3} L${cx+s},${cy-s*0.3} L${cx+s*0.5},${cy+s*0.2} L${cx+s*0.7},${cy+s} L${cx},${cy+s*0.5} L${cx-s*0.7},${cy+s} L${cx-s*0.5},${cy+s*0.2} L${cx-s},${cy-s*0.3} L${cx-s*0.3},${cy-s*0.3} Z`} fill={color} stroke={stroke} strokeWidth={strokeWidth} />;
    case 'square': return <rect x={cx-size} y={cy-size} width={size*2} height={size*2} fill={color} stroke={stroke} strokeWidth={strokeWidth} />;
    default: return <g stroke={color} strokeWidth={2}><line x1={cx-size} y1={cy-size} x2={cx+size} y2={cy+size} /><line x1={cx-size} y1={cy+size} x2={cx+size} y2={cy-size} /></g>;
  }
};

const CustomStrategyDot = (props) => {
  const { cx, cy, payload } = props;
  if (!payload || !payload.buyAction) return null;
  const strategy = payload.buyAction['策略'];
  const config = STRATEGY_CONFIG[strategy] || STRATEGY_CONFIG['default'];
  return renderShape(config.shape, cx, cy, config.color, 6);
};

// --- 資產類型判斷 ---
const detectAssetType = (symbol, name, category) => {
  const isBondEtfSymbol = /^00\d{2,3}B/i.test(symbol);
  const nameUpper = name ? name.toUpperCase() : '';
  const categoryUpper = category ? category.toUpperCase() : '';

  if (isBondEtfSymbol || (categoryUpper.includes('債') && (nameUpper.includes('ETF') || symbol.startsWith('00')))) {
      return 'BOND_ETF';
  }
  if (categoryUpper === '債券' || nameUpper.includes('債')) {
      return 'BOND';
  }
  if (symbol.startsWith('00') || nameUpper.includes('ETF') || nameUpper.includes('基金')) {
    return 'ETF';
  }
  return 'STOCK'; 
};

const isLongTermBond = (name) => {
    return name && (name.includes('20年') || name.includes('25年') || name.includes('30年') || name.includes('長天期') || name.includes('20+'));
};

const isUsAsset = (symbol) => {
    return !symbol.includes('.TW') && !symbol.includes('.TWO') && symbol !== '定存' && !symbol.includes('TWD=X');
};

// --- 效能追蹤包裝器 ---
const withTimer = async (name, promiseFn) => {
    const start = performance.now();
    try {
        return await promiseFn();
    } finally {
        console.log(`[Timer] ${name} 耗時: ${(performance.now() - start).toFixed(2)} ms`);
    }
};

// --- 網路請求與代理 (v54.3: 強制防快取) ---
const fetchWithProxyFallback = async (targetUrl, method = 'GET', body = null) => {
  // 檢查是否已自帶防快取參數 (如 _=)
  const hasCacheBuster = targetUrl.includes('_=');
  // 加入雙重亂數，改用標準 _= 徹底避免瀏覽器、CDN或中繼伺服器快取
  const urlWithTime = hasCacheBuster ? targetUrl : (targetUrl.includes('?') 
      ? `${targetUrl}&_=${Date.now()}&r=${Math.random()}` 
      : `${targetUrl}?_=${Date.now()}&r=${Math.random()}`);
  
  console.log(`[Network] 🌐 準備請求完整網址: ${urlWithTime}`);
  
  const proxies = [
    // allorigins 加上 disableCache=true 強制不快取
    { url: (url) => `https://api.allorigins.win/get?url=${encodeURIComponent(url)}&disableCache=true`, isAllOrigins: true },
    { url: (url) => `https://corsproxy.io/?${encodeURIComponent(url)}`, isAllOrigins: false },
    { url: (url) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`, isAllOrigins: false },
  ];
  
  const options = { 
      method, 
      headers: {
          ...(body ? { 'Content-Type': 'application/json' } : {}),
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
      }, 
      body: body ? JSON.stringify(body) : undefined,
      cache: 'no-store' // Fetch API 強制不快取
  };

  // 1. 優先嘗試直連 (若允許跨域)
  try {
      if(targetUrl.includes('openapi.twse.com.tw') || targetUrl.includes('mis.twse.com.tw')) {
          const response = await fetch(urlWithTime, options);
          if (response.ok) return await response.json();
      }
  } catch(e) { /* ignore */ } 

  // 2. 代理伺服器競速模式 (Race Condition)
  const promises = proxies.map(proxy => new Promise(async (resolve, reject) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => { controller.abort(); reject(new Error('Timeout')); }, 4500);
      try {
          const response = await fetch(proxy.url(urlWithTime), { ...options, signal: controller.signal });
          clearTimeout(timeoutId);
          if (!response.ok) throw new Error(`Proxy HTTP error: ${response.status}`);
          
          const data = await response.json();
          if (proxy.isAllOrigins && data.contents) {
              if (typeof data.contents === 'string') {
                  try { resolve(JSON.parse(data.contents)); } catch (e) { resolve(data.contents); }
              } else { resolve(data.contents); }
          } else { 
              resolve(data); 
          }
      } catch (e) {
          clearTimeout(timeoutId);
          reject(e); // 靜默拒絕，讓 Promise.any 處理
      }
  }));

  try {
      // 只要有一個 Proxy 成功回傳就會立刻 resolve
      return await Promise.any(promises);
  } catch (e) {
      // 抑制 AggregateError 洗版，改為單行警告
      if (e instanceof AggregateError || e.name === 'AggregateError') {
          console.warn(`[Proxy Failed] 代理伺服器皆無回應 (可能遭遇限流): ${targetUrl.substring(0, 50)}...`);
      } else {
          console.warn(`[Proxy Error] ${e.message}`);
      }
      return null;
  }
};

// --- Trading Economics Scraper (TE) ---
const fetchTradingEconomicsYields = async () => {
    try {
        const html = await fetchWithProxyFallback('https://tradingeconomics.com/united-states/government-bond-yield');
        if (typeof html !== 'string') return {};
        
        const extractYield = (code) => {
            const regex = new RegExp(`data-symbol="${code}"[\\s\\S]*?id="p"[^>]*>([\\d.]+)`, 'i');
            const match = html.match(regex);
            return match ? parseFloat(match[1]) : null;
        };

        return {
            '10Y': extractYield('USGG10YR:IND'),
            '20Y': extractYield('USGG20YR:IND'),
            '30Y': extractYield('USGG30YR:IND')
        };
    } catch (e) { return {}; }
};

// --- 技術指標計算函式 (保持不變) ---
const calculateSMA = (data, period) => {
  return data.map((item, index, arr) => {
    if (index < period - 1) return { ...item, [`MA${period}`]: null };
    const slice = arr.slice(index - period + 1, index + 1);
    const sum = slice.reduce((acc, curr) => acc + (curr.close || 0), 0);
    return { ...item, [`MA${period}`]: sum / period };
  });
};

const calculateEMA = (data, period, key = 'close') => {
  const k = 2 / (period + 1);
  let emaArray = new Array(data.length).fill(null);
  let firstValidIdx = -1;
  for(let i=0; i<data.length; i++) { if (data[i][key] !== null && data[i][key] !== undefined) { firstValidIdx = i; break; } }
  if (firstValidIdx === -1 || (data.length - firstValidIdx) < period) return emaArray;
  let sum = 0;
  for (let i = 0; i < period; i++) { sum += data[firstValidIdx + i][key]; }
  const sma = sum / period;
  emaArray[firstValidIdx + period - 1] = sma;
  for (let i = firstValidIdx + period; i < data.length; i++) {
    const val = data[i][key];
    const prevEma = emaArray[i - 1];
    if (val !== null && prevEma !== null) { emaArray[i] = (val - prevEma) * k + prevEma; }
  }
  return emaArray;
};

const calculateRSI = (data, period) => {
    let rsiArray = new Array(data.length).fill(null);
    if (data.length < period + 1) return rsiArray;
    let changes = [];
    for (let i = 1; i < data.length; i++) { changes.push(data[i].close - data[i-1].close); }
    let gains = 0; let losses = 0;
    for (let i = 0; i < period; i++) { if (changes[i] > 0) gains += changes[i]; else losses += Math.abs(changes[i]); }
    let avgGain = gains / period; let avgLoss = losses / period;
    rsiArray[period] = 100 - (100 / (1 + (avgGain / (avgLoss === 0 ? 1 : avgLoss))));
    for (let i = period + 1; i < data.length; i++) {
        const change = changes[i-1];
        const gain = change > 0 ? change : 0;
        const loss = change < 0 ? Math.abs(change) : 0;
        avgGain = ((avgGain * (period - 1)) + gain) / period;
        avgLoss = ((avgLoss * (period - 1)) + loss) / period;
        rsiArray[i] = 100 - (100 / (1 + (avgGain / (avgLoss === 0 ? 1 : avgLoss))));
    }
    return rsiArray;
};

const calculateBollingerBands = (data, period = 20, multiplier = 2) => {
    const sma = calculateSMA(data, period);
    return data.map((item, i) => {
        if (i < period - 1) return { ...item, BBU: null, BBL: null, BBM: null };
        const slice = data.slice(i - period + 1, i + 1);
        const mean = sma[i][`MA${period}`];
        const squaredDiffs = slice.map(d => Math.pow(d.close - mean, 2));
        const variance = squaredDiffs.reduce((a, b) => a + b, 0) / period;
        const stdDev = Math.sqrt(variance);
        return { ...item, BBM: mean, BBU: mean + (multiplier * stdDev), BBL: mean - (multiplier * stdDev) };
    });
};

const calculateKD = (data, period = 9) => {
  let k = 50; let d = 50; 
  return data.map((item, index, arr) => {
    if (index < period - 1) return { ...item, K: null, D: null };
    const slice = arr.slice(index - period + 1, index + 1);
    const highs = slice.map(d => d.high); const lows = slice.map(d => d.low);
    const highestHigh = Math.max(...highs); const lowestLow = Math.min(...lows);
    let rsv = 50;
    if (highestHigh !== lowestLow) { rsv = ((item.close - lowestLow) / (highestHigh - lowestLow)) * 100; }
    k = (2/3) * k + (1/3) * rsv; d = (2/3) * d + (1/3) * k;
    return { ...item, K: k, D: d };
  });
};

const calculateMACD = (data) => {
  const ema12 = calculateEMA(data, 12, 'close'); const ema26 = calculateEMA(data, 26, 'close');
  const difArray = data.map((d, i) => {
    const e12 = ema12[i]; const e26 = ema26[i];
    if (e12 === null || e26 === null) return { ...d, DIF: null };
    return { ...d, DIF: e12 - e26 };
  });
  const signalArray = calculateEMA(difArray, 9, 'DIF');
  return difArray.map((d, i) => {
      const dif = d.DIF; const signal = signalArray[i]; let osc = null;
      if (dif !== null && signal !== null) { osc = dif - signal; }
      return { ...d, Signal: signal, OSC: osc };
  });
};

const processTechnicalData = (rawData) => {
  if (!rawData || rawData.length === 0) return [];
  let d = calculateSMA(rawData, 20); d = calculateSMA(d, 60); d = calculateSMA(d, 120); d = calculateKD(d, 9); d = calculateMACD(d);
  const rsi6 = calculateRSI(d, 6); const rsi12 = calculateRSI(d, 12); const bbData = calculateBollingerBands(d, 20, 2);
  d = d.map((item, i) => ({ ...item, ...bbData[i], RSI6: rsi6[i], RSI12: rsi12[i], BB_Range: [bbData[i].BBL, bbData[i].BBU] }));
  return d;
};

const loadPapaParse = () => {
  return new Promise((resolve, reject) => {
    if (window.Papa) { resolve(window.Papa); return; }
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/PapaParse/5.4.1/papaparse.min.js';
    script.onload = () => resolve(window.Papa);
    script.onerror = reject;
    document.head.appendChild(script);
  });
};

const Toast = ({ message, onClose }) => {
  useEffect(() => { const timer = setTimeout(onClose, 3000); return () => clearTimeout(timer); }, [onClose]);
  return (<div className="fixed bottom-20 md:bottom-10 left-1/2 transform -translate-x-1/2 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg flex items-center z-[100] animate-fade-in-up"><CheckCircle className="w-5 h-5 mr-2" /><span>{message}</span></div>);
};

const CustomChartTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (<div className="p-3 border border-slate-700 rounded-lg shadow-xl bg-slate-800 text-slate-100 text-xs"><p className="mb-2 font-bold text-slate-300">{`日期: ${label}`}</p>{payload.filter(p => p.dataKey !== 'BB_Range').map((entry, index) => (<div key={index} className="flex items-center justify-between gap-4 mb-1"><span style={{ color: entry.color }}>{entry.name}</span><span className="font-mono font-medium">{formatPrice(entry.value)}</span></div>))}</div>);
  }
  return null;
};

// --- 主應用程式 ---

const App = () => {
  // 1. State Declarations
  const [sheetUrl, setSheetUrl] = useState('');
  const [geminiApiKey, setGeminiApiKey] = useState(''); 
  const [rawData, setRawData] = useState([]);
  const [portfolioData, setPortfolioData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [priceLoading, setPriceLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('更新即時股價中...');
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(new Date()); 
  const [activeTab, setActiveTab] = useState('overview');
    
  const [realTimePrices, setRealTimePrices] = useState({});
  const [etfExtraData, setEtfExtraData] = useState({}); 
  const [usdRate, setUsdRate] = useState(1); 
  const [usBondYields, setUsBondYields] = useState({ '10Y': null, '20Y': null, '30Y': null }); 
  const [updateError, setUpdateError] = useState(null);
  const [historicalData, setHistoricalData] = useState({});
  const [selectedHistorySymbol, setSelectedHistorySymbol] = useState(null);
  const [isLocked, setIsLocked] = useState(false); 
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState(null); 
  const [timeframe, setTimeframe] = useState('1y_1d'); 
  const [isLastTradingDay, setIsLastTradingDay] = useState(false);
  const [selectedIndicator, setSelectedIndicator] = useState('KD'); 
    
  const [sortConfig, setSortConfig] = useState({ key: 'manual', direction: 'asc' });
  const [customOrder, setCustomOrder] = useState([]);

  // AI Analysis State
  const [aiSummary, setAiSummary] = useState(null);
  const [aiDetail, setAiDetail] = useState(null);
  const [isAiSummarizing, setIsAiSummarizing] = useState(false);
  const [isDetailExpanded, setIsDetailExpanded] = useState(false);
  const [usedModel, setUsedModel] = useState(null); 
  const [isCachedResult, setIsCachedResult] = useState(false); 
  const [analysisSymbol, setAnalysisSymbol] = useState(null); 
  const [selectedModel, setSelectedModel] = useState('gemini-3-flash-preview'); 
  const [aiSignals, setAiSignals] = useState({}); 

  const [portfolioHealth, setPortfolioHealth] = useState(null);
  const [isHealthChecking, setIsHealthChecking] = useState(false);
  const [investmentSettings, setInvestmentSettings] = useState({}); 
  const [assetClassifications, setAssetClassifications] = useState({});

  const [chatMessages, setChatMessages] = useState([
    { role: 'assistant', content: '您好！我是您的 AI 投資助理。我可以根據您的持股狀況與投資分類回答問題，請試著問我：「我的核心資產績效如何？」或「目前投資組合風險？」' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatEndRef = useRef(null);
  const analysisInProgressRef = useRef({});
  const [feeDiscount, setFeeDiscount] = useState(1); 
  const [toast, setToast] = useState(null);

  // 2. Memos - Core Data
  const summary = useMemo(() => {
    const totalCost = portfolioData.reduce((sum, item) => sum + item.costBasis, 0);
    const totalValue = portfolioData.reduce((sum, item) => sum + item.marketValue, 0);
    const totalPL = portfolioData.reduce((sum, item) => sum + item.profitLoss, 0); 
    const totalROI = totalCost > 0 ? totalPL / totalCost : 0;
    return { totalCost, totalValue, totalPL, totalROI };
  }, [portfolioData]);

  const allocationData = useMemo(() => {
    const group = {};
    portfolioData.forEach(item => { const cat = item['類別'] || '其他'; group[cat] = (group[cat] || 0) + item.marketValue; });
    const total = Object.values(group).reduce((a, b) => a + b, 0);
    return Object.keys(group).map(key => ({ name: key, value: group[key], percentage: total > 0 ? (group[key] / total) : 0 }));
  }, [portfolioData]);

  const aggregatedHoldings = useMemo(() => {
    const map = new Map();
    portfolioData.forEach(item => {
      const key = item['標的'];
      if (!map.has(key)) { map.set(key, { ...item, shares: 0, costBasis: 0, costBasisRaw: 0, marketValue: 0, profitLoss: 0, estimateFee: 0, estimateTax: 0, dates: new Set(), isUS: item.isUS }); }
      const entry = map.get(key);
      entry.shares += item.shares; entry.costBasis += item.costBasis; entry.marketValue += item.marketValue; 
      entry.costBasisRaw += (item.buyPriceRaw * item.shares); 
      entry.profitLoss += item.profitLoss; 
      entry.estimateFee += item.estimateFee;
      entry.estimateTax += item.estimateTax;
      entry.dates.add(item['日期']);
      if (item.currentPrice !== item.buyPrice) entry.currentPrice = item.currentPrice;
      if (item.currentPriceRaw) entry.currentPriceRaw = item.currentPriceRaw; 
    });
    return Array.from(map.values()).map(item => {
      const roi = item.costBasis > 0 ? item.profitLoss / item.costBasis : 0;
      const sortedDates = Array.from(item.dates).sort((a, b) => new Date(a) - new Date(b));
      const latestDate = sortedDates[sortedDates.length - 1];
      
      const avgPriceTwd = item.shares > 0 ? item.costBasis / item.shares : 0;
      const avgPriceRaw = item.shares > 0 ? item.costBasisRaw / item.shares : 0;
      
      const finalBuyPrice = item.isUS ? avgPriceRaw : avgPriceTwd;
      const finalCurrentPrice = item.isUS ? item.currentPriceRaw : item.currentPrice;
      
      return { 
        ...item, 
        buyPrice: finalBuyPrice, 
        currentPrice: finalCurrentPrice, 
        buyPriceRaw: avgPriceRaw, 
        currentPriceRaw: item.currentPriceRaw,
        roi, 
        '日期': latestDate 
      };
    });
  }, [portfolioData]);

  const sortedHoldings = useMemo(() => {
    let sortableItems = [...aggregatedHoldings];
    if (sortConfig.key === 'manual') {
       sortableItems.sort((a, b) => {
         const idxA = customOrder.indexOf(a['標的']);
         const idxB = customOrder.indexOf(b['標的']);
         if (idxA === -1) return 1; if (idxB === -1) return -1;
         return idxA - idxB;
       });
    } else if (sortConfig.key !== null) {
      sortableItems.sort((a, b) => {
        let aValue = a[sortConfig.key]; let bValue = b[sortConfig.key];
        if (sortConfig.key === '標的') aValue = a['標的']; if (sortConfig.key === '類別') aValue = a['類別'];
        if (typeof aValue === 'string') { aValue = aValue.toLowerCase(); bValue = bValue.toLowerCase(); }
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sortableItems;
  }, [aggregatedHoldings, sortConfig, customOrder]);

  const tradableSymbols = useMemo(() => sortedHoldings.filter(h => h['類別'] !== '定存'), [sortedHoldings]);

  // Sync selected symbol whenever tradable symbols change order or contents
  const prevSortRef = useRef(sortConfig);
  const prevOrderRef = useRef(customOrder);
  const prevDataHashRef = useRef('');
  
  useEffect(() => {
    const currentDataHash = tradableSymbols.map(t => t['標的']).join(',');
    if (prevSortRef.current !== sortConfig || prevOrderRef.current !== customOrder) {
      if (tradableSymbols.length > 0) {
        setSelectedHistorySymbol(tradableSymbols[0]['標的']);
      }
      prevSortRef.current = sortConfig;
      prevOrderRef.current = customOrder;
    } else if (currentDataHash !== '' && prevDataHashRef.current !== currentDataHash) {
      if (tradableSymbols.length > 0) {
        setSelectedHistorySymbol(tradableSymbols[0]['標的']);
      }
    }
    prevDataHashRef.current = currentDataHash;
  }, [sortConfig, customOrder, tradableSymbols]);
   
  const currentChartData = useMemo(() => {
    const baseData = historicalData[`${selectedHistorySymbol}_${timeframe}`];
    if (!baseData || !selectedHistorySymbol) return [];
    const buys = portfolioData.filter(p => p['標的'] === selectedHistorySymbol);
    const merged = [...baseData];
    buys.forEach(buy => {
        const rawDate = (buy['日期'] || '').toString().trim().replace(/\//g, '-');
        let closestIdx = merged.findIndex(pt => pt.date === rawDate);
        if (closestIdx === -1) {
            const buyDateTs = new Date(rawDate).getTime();
            if (!isNaN(buyDateTs)) {
                let minDiff = Infinity;
                merged.forEach((pt, i) => {
                    const ptDateTs = new Date(pt.date).getTime();
                    const diff = Math.abs(buyDateTs - ptDateTs);
                    if (diff < minDiff && diff < 604800000) { minDiff = diff; closestIdx = i; }
                });
            }
        }
        if (closestIdx !== -1) { merged[closestIdx] = { ...merged[closestIdx], buyPricePoint: buy['價格'], buyAction: buy }; }
    });
    return merged;
  }, [historicalData, selectedHistorySymbol, timeframe, portfolioData]);

  // 3. UI Helpers
  const getResponsiveFontSize = (text) => {
    const str = String(text); 
    const len = str.length;
    if (len > 25) return 'text-xs';
    if (len > 18) return 'text-sm';
    if (len > 14) return 'text-base';
    if (len > 11) return 'text-lg';
    if (len > 9) return 'text-xl';
    return 'text-2xl';
  };

  // 4. Data Processing Functions
  const processData = (data, pricesMap, extraMap = {}) => {
    const currentUsdRate = pricesMap['TWD=X'] || 30; 
    const enrichedData = data.map((item, index) => {
      const shares = parseFloat(item['股數']) || 0;
      const buyPriceRaw = parseFloat(item['價格']) || 0; 
      const costBasisRaw = parseFloat(item['金額']) || 0; 
      const symbol = item['標的'];
      const category = item['類別'];
      const name = item['名稱'] || '';
      const isTD = category === '定存' && symbol.includes('-TD');
      const isUS = isUsAsset(symbol) || isTD; 
      let fxRate = 1; let currentPriceRaw = buyPriceRaw;
      if (isTD) {
          const currency = symbol.replace('-TD', '');
          if (currency === 'TWD') { fxRate = 1; } 
          else { const ticker = currency === 'USD' ? 'TWD=X' : `${currency}TWD=X`; fxRate = pricesMap[ticker] || 1; }
          currentPriceRaw = 1; 
      } else if (isUS) { fxRate = currentUsdRate; currentPriceRaw = pricesMap?.[symbol] || buyPriceRaw;
      } else { fxRate = 1; currentPriceRaw = category === '定存' ? buyPriceRaw : (pricesMap?.[symbol] || buyPriceRaw); }
      const buyPriceTwd = buyPriceRaw * fxRate; const currentPriceTwd = currentPriceRaw * fxRate; const costBasisTwd = costBasisRaw; 
      const marketValueTwd = shares * currentPriceTwd;
      const assetType = detectAssetType(symbol, name, category);
      let taxRate = 0; let feeRate = 0;
      if (!isUS && category !== '定存') {
          feeRate = 0.001425 * feeDiscount;
          if (assetType === 'ETF') taxRate = 0.001; else if (assetType === 'BOND') taxRate = 0; else taxRate = 0.003; 
      }
      const estimateFee = Math.round(marketValueTwd * feeRate);
      const estimateTax = category === '定存' ? 0 : Math.round(marketValueTwd * taxRate);
      const feeFinal = category === '定存' ? 0 : estimateFee;
      const grossProfit = marketValueTwd - costBasisTwd;
      const netProfit = grossProfit - feeFinal - estimateTax;
      const calculatedBuyPriceTwd = shares > 0 ? costBasisTwd / shares : 0;
      const roi = costBasisTwd > 0 ? netProfit / costBasisTwd : 0;
      
      return { 
        ...item, id: index, shares, isUS, isTD,
        buyPrice: calculatedBuyPriceTwd, currentPrice: currentPriceTwd, currentPriceRaw,
        buyPriceRaw, costBasis: costBasisTwd, marketValue: marketValueTwd, 
        profitLoss: netProfit, grossProfit, estimateFee: feeFinal, estimateTax, roi, 
        isRealData: !!(pricesMap?.[symbol] || (isTD && pricesMap?.[isTD ? (symbol.replace('-TD','')==='USD'?'TWD=X':`${symbol.replace('-TD','')}TWD=X`) : ''])),
        priceDate: extraMap[symbol]?.dateStr 
      };
    });
    setPortfolioData(enrichedData);
    setRawData(data);
  };

  const checkLastTradingDay = async () => {
        const getLocalStr = (dt) => {
            const y = dt.getFullYear();
            const m = String(dt.getMonth() + 1).padStart(2, '0');
            const d = String(dt.getDate()).padStart(2, '0');
            return `${y}${m}${d}`;
        };

        const today = new Date(); 
        const todayStr = getLocalStr(today);
        
        // 建立已知假日備援清單
        let holidays = ['20240228', '20250228', '20260227', '20260403', '20260501', '20261231'];
        
        try {
            const response = await fetchWithProxyFallback('https://openapi.twse.com.tw/v1/holidaySchedule/holidaySchedule');
            if (response && Array.isArray(response)) { 
                const apiHolidays = response.map(item => {
                    const dateStr = item.Date || item.date || '';
                    const parts = dateStr.split('/');
                    if (parts.length === 3) {
                        const y = parseInt(parts[0]) + 1911;
                        const m = parts[1].padStart(2, '0');
                        const d = parts[2].padStart(2, '0');
                        return `${y}${m}${d}`;
                    }
                    return dateStr.replace(/\//g, '');
                }); 
                holidays = [...new Set([...holidays, ...apiHolidays])];
            }
        } catch (e) { console.warn('Failed to fetch holidays, using fallback', e); }
        
        let d = new Date(today.getFullYear(), today.getMonth() + 1, 0); 
        let foundDateStr = '';
        while (d.getDate() > 0) {
            const day = d.getDay(); 
            const dateStr = getLocalStr(d);
            
            if (day === 0 || day === 6 || holidays.includes(dateStr)) { 
                d.setDate(d.getDate() - 1); 
            } else { 
                foundDateStr = dateStr; 
                break; 
            }
        }
        
        setIsLastTradingDay(foundDateStr === todayStr);
    };

  const fetchRealTimePrices = async (data, forceUpdate = false) => {
    console.log("=== 開始更新股價與數據 (v54.1 限流防禦版) ===");
    const tTotalStart = performance.now();
    setPriceLoading(true); setUpdateError(null); setLoadingMessage('更新即時股價中...');
    const uniqueSymbols = [...new Set(data.map(item => item['標的']))];
    const symbolsToFetchList = uniqueSymbols.filter(s => s !== '定存' && !s.includes('-TD'));
    
    // Always fetch critical reference data
    if (!symbolsToFetchList.includes('TWD=X')) symbolsToFetchList.push('TWD=X');
    if (!symbolsToFetchList.includes('^TNX')) symbolsToFetchList.push('^TNX');
    if (!symbolsToFetchList.includes('^TVC')) symbolsToFetchList.push('^TVC'); // 20 Year
    if (!symbolsToFetchList.includes('^TYX')) symbolsToFetchList.push('^TYX'); // 30 Year
    
    const hasLongTermBond = data.some(item => isLongTermBond(item['名稱']));
    if (hasLongTermBond && !symbolsToFetchList.includes('^TVC')) { symbolsToFetchList.push('^TVC'); }

    const fetchTEWithTimer = async () => {
        const start = performance.now();
        const res = await fetchTradingEconomicsYields();
        console.log(`[Timer] TradingEconomics 總耗時: ${(performance.now() - start).toFixed(2)} ms`);
        return res;
    };
    const tePromise = fetchTEWithTimer();

    const symbolToName = {};
    data.forEach(item => { symbolToName[item['標的']] = item['名稱']; });

    const today = getTodayDate();
    const cache = getPriceCache();
    const newPrices = { ...realTimePrices }; 
    const newEtfData = { ...etfExtraData }; 
    const isTrading = isTaiwanTradingHours();
    
    const twseEtfMap = {};
    const tpexEtfMap = {}; 
    const twseYieldMap = {}; 
    const tpexYieldMap = {}; 
    const misEtfMap = {}; 
    const misEtfPriceMap = {}; // 新增：用於存放 e 欄位市價
    const misPriceMap = {}; 
    const misTimeMap = {};

    // 依據是否為交易時間決定 all_etf.txt 的快取策略：
    // 交易時間：使用當下毫秒數 (Date.now()) 強制抓最新
    // 非交易時間：使用當日日期字串，避免過度頻繁抓取相同靜態檔案
    const misCacheBuster = isTrading ? Date.now() : getTodayDate().replace(/-/g, '');
    const misEtfUrl = `https://mis.twse.com.tw/stock/data/all_etf.txt?_=${misCacheBuster}`;

    // 1. 官方資料源全面併發抓取 (Parallel Fetch)
    console.log("Fetching Official Data in Parallel...");
    const [misRes, navRes, yieldRes, tpexNavRes, tpexYieldRes] = await Promise.all([
        withTimer("MIS_NAV", () => fetchWithProxyFallback(misEtfUrl).catch(()=>null)),
        withTimer("TWSE_NAV", () => fetchWithProxyFallback('https://openapi.twse.com.tw/v1/exchangeReport/a1271825').catch(()=>null)),
        withTimer("TWSE_Yield", () => fetchWithProxyFallback('https://openapi.twse.com.tw/v1/exchangeReport/BWIBBU_ALL').catch(()=>null)),
        withTimer("TPEx_NAV", () => fetchWithProxyFallback('https://www.tpex.org.tw/web/stock/etf/net_value/net_value_result.php?l=zh-tw&o=json').catch(()=>null)),
        withTimer("TPEx_Yield", () => fetchWithProxyFallback('https://www.tpex.org.tw/web/stock/aftertrading/peratio_analysis/pera_result.php?l=zh-tw&o=json').catch(()=>null))
    ]);

    // 解析 MIS NAV & ETF市價 (e欄位)
    if (misRes) {
        const processMisItem = (item) => {
            if (item.a) {
                const code = String(item.a).trim();
                if (item.f && item.f !== '-') misEtfMap[code] = parseFloat(String(item.f).replace(/,/g, ''));
                if (item.e && item.e !== '-') misEtfPriceMap[code] = parseFloat(String(item.e).replace(/,/g, ''));
            }
        };
        if (misRes.msgArray) misRes.msgArray.forEach(processMisItem);
        if (misRes.a1 && Array.isArray(misRes.a1)) {
            misRes.a1.forEach(subObj => {
                if (subObj.msgArray) subObj.msgArray.forEach(processMisItem);
            });
        }
    }

    // 解析 TWSE
    if (Array.isArray(navRes)) navRes.forEach(item => { twseEtfMap[item.Code] = parseFloat(item.NetAssetValue); });
    if (Array.isArray(yieldRes)) yieldRes.forEach(item => { twseYieldMap[item.Code] = parseFloat(item.DividendYield); });

    // 解析 TPEx
    if (tpexNavRes && tpexNavRes.aaData) tpexNavRes.aaData.forEach(item => { const nav = parseFloat(item[3]); if (!isNaN(nav)) tpexEtfMap[item[0]] = nav; });
    if (tpexYieldRes && tpexYieldRes.aaData) tpexYieldRes.aaData.forEach(item => { const y = parseFloat(item[5]); if (!isNaN(y)) tpexYieldMap[item[0]] = y; });

    // 1.5 MIS TWSE (Realtime Price) for .TW and .TWO
    try {
       const twSymbols = symbolsToFetchList.filter(s => {
           if (!(s.includes('.TW') || s.includes('.TWO'))) return false;
           const pureCode = s.replace(/\.TWO$|\.TW$/i, '');
           if (misEtfPriceMap[pureCode]) return false; // 已在 all_etf.txt 取得 e 欄位市價的 ETF 則自動跳過，節省請求
           return true;
       });
       if (twSymbols.length > 0) {
           const pricePromises = [];
           for (let i = 0; i < twSymbols.length; i += 50) {
               const chunk = twSymbols.slice(i, i + 50);
               const queryList = chunk.map(s => {
                   const code = s.split('.')[0];
                   const prefix = s.includes('.TWO') ? 'otc' : 'tse';
                   return `${prefix}_${code}.tw`;
               }).join('|');
               
               pricePromises.push(withTimer(`MIS_Price_Chunk_${i}`, () => fetchWithProxyFallback(`https://mis.twse.com.tw/stock/api/getStockInfo.jsp?ex_ch=${queryList}`)));
           }
           
           const priceResponses = await Promise.all(pricePromises);
           priceResponses.forEach((priceRes, idx) => {
               if (priceRes && priceRes.msgArray) {
                   const chunk = twSymbols.slice(idx * 50, (idx + 1) * 50);
                   priceRes.msgArray.forEach(item => {
                       const originalSymbol = chunk.find(s => s.startsWith(item.c + '.'));
                       if (originalSymbol) {
                           const price = parseFloat(item.z !== '-' ? item.z : item.y);
                           if (!isNaN(price)) {
                               misPriceMap[originalSymbol] = price;
                               if (item.d && item.t) {
                                   misTimeMap[originalSymbol] = `${item.d.substring(4,6)}/${item.d.substring(6,8)} ${item.t}`;
                               }
                           }
                       }
                   });
               }
           });
       }
    } catch (e) { console.warn("MIS Price Fetch Failed", e); }

    // PRE-FILL STEP: 填入官方資料
    symbolsToFetchList.forEach(symbol => {
        const pureCode = symbol.replace(/\.TWO$|\.TW$/i, '');
        const extra = newEtfData[symbol] || {};
        
        // 優先套用 ETF 的 e 欄位市價
        if (misEtfPriceMap[pureCode]) {
            newPrices[symbol] = misEtfPriceMap[pureCode];
            extra.priceSource = "MIS(e)";
            const d = new Date();
            extra.dateStr = `${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
        } else if (misPriceMap[symbol]) {
            newPrices[symbol] = misPriceMap[symbol];
            extra.dateStr = misTimeMap[symbol];
            extra.priceSource = "MIS";
        }

        if (misEtfMap[pureCode]) { extra.nav = misEtfMap[pureCode]; extra.navSource = "MIS"; }
        else if (twseEtfMap[pureCode]) { extra.nav = twseEtfMap[pureCode]; extra.navSource = "Off(TW)"; } 
        else if (tpexEtfMap[pureCode]) { extra.nav = tpexEtfMap[pureCode]; extra.navSource = "Off(TP)"; }

        if (twseYieldMap[pureCode]) { extra.yield = twseYieldMap[pureCode]; extra.yieldSource = "Off(TW)"; }
        else if (tpexYieldMap[pureCode]) { extra.yield = tpexYieldMap[pureCode]; extra.yieldSource = "Off(TP)"; }

        newEtfData[symbol] = extra;
    });

    const symbolsToFetch = symbolsToFetchList.filter(symbol => {
        if (forceUpdate) return true;
        const cachedItem = cache[symbol];
        if (!cachedItem) return true;
        if (cachedItem.date !== today) return true;
        if (isTrading && (symbol.includes('.TW') || symbol.includes('.TWO') || symbol === 'TWD=X')) {
            const cacheAge = Date.now() - (cachedItem.timestamp || 0);
            if (cacheAge > 300000) return true; 
        }
        newPrices[symbol] = cachedItem.price;
        if (cachedItem.nav) newEtfData[symbol] = { ...newEtfData[symbol], nav: cachedItem.nav, navSource: cachedItem.navSource };
        if (cachedItem.yield) newEtfData[symbol] = { ...newEtfData[symbol], yield: cachedItem.yield, yieldSource: cachedItem.yieldSource };
        if (cachedItem.dateStr) newEtfData[symbol] = { ...newEtfData[symbol], dateStr: cachedItem.dateStr };
        if (cachedItem.priceSource) newEtfData[symbol] = { ...newEtfData[symbol], priceSource: cachedItem.priceSource };
        return false; 
    });

    // 智慧過濾 (Smart Skip)
    const symbolsForYahoo = [];
    symbolsToFetch.forEach(symbol => {
        const extra = newEtfData[symbol] || {};
        const pureCode = symbol.replace(/\.TWO$|\.TW$/i, '');
        const name = symbolToName[symbol] || '';
        const isEtf = name.includes('ETF') || symbol.startsWith('00');
        const isUs = isUsAsset(symbol);
        
        let needYahoo = false;
        // 修正：同時檢查一般市價與 ETF專屬(e欄位)市價，只要有任一個存在就代表已經抓到了
        const hasMisPrice = misPriceMap[symbol] || misEtfPriceMap[pureCode];
        
        if (!hasMisPrice) needYahoo = true; // 沒有股價，必須查
        if (isEtf && !extra.nav) needYahoo = true;  // ETF 缺淨值，去 Yahoo 補
        if (isUs || symbol === 'TWD=X' || symbol.startsWith('^')) needYahoo = true; // 美股/匯率/指數必查
        
        if (needYahoo) {
            symbolsForYahoo.push(symbol);
        } else {
            console.log(`[Timer] 🚀 智慧跳過 Yahoo 查詢: ${symbol}`);
        }
    });

    try {
        if (symbolsForYahoo.length > 0) {
            // 分批處理 (Chunking)，避免一次發出過多請求導致代理伺服器全部拒絕 (Rate Limit)
            const chunkSize = 3; 
            for (let i = 0; i < symbolsForYahoo.length; i += chunkSize) {
                const chunk = symbolsForYahoo.slice(i, i + chunkSize);
                const promises = chunk.map(async (symbol) => {
                    const maxRetries = 2; let attempts = 0; let success = false;
                    await delay(Math.random() * 500); // 減少批次內的併發擁堵
                    
                    while(attempts <= maxRetries && !success) {
                        try {
                            const summaryUrl = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${symbol}?modules=summaryDetail,defaultKeyStatistics,price,fundProfile`;
                            let summaryData = null;
                            
                            try {
                                const summaryRes = await withTimer(`Yahoo_Summary_${symbol}`, () => fetchWithProxyFallback(summaryUrl));
                                summaryData = summaryRes?.quoteSummary?.result?.[0];
                            } catch (e) { /* ignore */ }

                            const quoteUrl = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbol}&t=${Date.now()}`;
                            const result = await withTimer(`Yahoo_Quote_${symbol}`, () => fetchWithProxyFallback(quoteUrl));
                            const quote = result?.quoteResponse?.result?.[0];

                            if (quote && quote.regularMarketPrice !== undefined) {
                                const extra = { ...newEtfData[symbol] }; 
                                const pureCodeInner = symbol.replace(/\.TWO$|\.TW$/i, '');
                                const hasMisPriceInner = misPriceMap[symbol] || misEtfPriceMap[pureCodeInner];
                                
                                // 修正：確保我們不會用 Yahoo 的市價去覆蓋辛苦抓來的 MIS(e) 或 MIS 市價
                                if (!hasMisPriceInner) {
                                    newPrices[symbol] = quote.regularMarketPrice;
                                    extra.priceSource = "Yahoo";
                                    if(quote.regularMarketTime) {
                                        extra.dateStr = new Date(quote.regularMarketTime * 1000).toLocaleString('zh-TW', {month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit'});
                                    }
                                }

                                if (!extra.nav) {
                                    if (quote.navPrice) { extra.nav = quote.navPrice; extra.navSource = "Yahoo"; }
                                    else if (summaryData?.defaultKeyStatistics?.bookValue) { extra.nav = summaryData.defaultKeyStatistics.bookValue.raw; extra.navSource = "Yahoo(Est)"; }
                                    if (!extra.nav && quote.priceToBook) { extra.nav = (quote.regularMarketPrice / quote.priceToBook).toFixed(2); extra.navSource = "Calc(P/B)"; }
                                }

                                if (!extra.yield) {
                                    if (summaryData?.summaryDetail?.yield?.raw) { extra.yield = summaryData.summaryDetail.yield.raw * 100; extra.yieldSource = "Yahoo(Sum)"; }
                                    else if (quote.trailingAnnualDividendYield) { extra.yield = quote.trailingAnnualDividendYield * 100; extra.yieldSource = "Yahoo"; } 
                                    else if (quote.yield) { extra.yield = quote.yield * 100; extra.yieldSource = "Yahoo"; }
                                    else if (quote.dividendYield) { extra.yield = quote.dividendYield * 100; extra.yieldSource = "Yahoo"; }
                                    
                                    if (!extra.yield) {
                                        if (quote.trailingAnnualDividendRate && quote.regularMarketPrice) { 
                                            extra.yield = (quote.trailingAnnualDividendRate / quote.regularMarketPrice) * 100; 
                                            extra.yieldSource = "Calc";
                                        } else if (quote.dividendRate && quote.regularMarketPrice) {
                                             extra.yield = (quote.dividendRate / quote.regularMarketPrice) * 100; 
                                             extra.yieldSource = "Calc";
                                        }
                                    }
                                }

                                newEtfData[symbol] = extra;
                                success = true;
                            } else { throw new Error('Quote API No Data'); }
                        } catch (quoteErr) {
                            try {
                                const chartUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d&t=${Date.now()}`;
                                const result = await withTimer(`Yahoo_Chart_${symbol}`, () => fetchWithProxyFallback(chartUrl));
                                const meta = result?.chart?.result?.[0]?.meta;
                                if (meta && meta.regularMarketPrice !== undefined) {
                                    const extra = { ...newEtfData[symbol] };
                                    const pureCodeInner = symbol.replace(/\.TWO$|\.TW$/i, '');
                                    const hasMisPriceInner = misPriceMap[symbol] || misEtfPriceMap[pureCodeInner];
                                    
                                    // 修正：同樣的保護機制
                                    if (!hasMisPriceInner) {
                                        newPrices[symbol] = meta.regularMarketPrice;
                                        extra.priceSource = "Yahoo";
                                        if(meta.regularMarketTime) {
                                            extra.dateStr = new Date(meta.regularMarketTime * 1000).toLocaleString('zh-TW', {month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit'});
                                        }
                                    }
                                    
                                    newEtfData[symbol] = extra;
                                    success = true;
                                } else { throw new Error('Chart API No Data'); }
                            } catch (chartErr) {
                                attempts++;
                                if (attempts <= maxRetries) { await delay(1000); } 
                            }
                        }
                    }
                });
                await Promise.all(promises);
                
                // 批次間隔，讓代理伺服器喘息
                if (i + chunkSize < symbolsForYahoo.length) {
                    await delay(1200); 
                }
            }
        }
    } catch(e) {
        console.error("Fetch Loop Error:", e);
    } finally {
        const teYields = await tePromise;
        
        setUsBondYields({
            '10Y': teYields['10Y'] || newPrices['^TNX'] || null,
            '20Y': teYields['20Y'] || newPrices['^TVC'] || null, 
            '30Y': teYields['30Y'] || newPrices['^TYX'] || null
        });

        symbolsToFetchList.forEach(symbol => {
             const extra = newEtfData[symbol] || {};
             const name = symbolToName[symbol] || '';
             
             if (!extra.yield && (name.includes('美債') || name.includes('債'))) {
                 if (name.includes('20年')) {
                     extra.yield = teYields['20Y'] || newPrices['^TVC'] || newPrices['^TYX'];
                     extra.yieldSource = "BM(20Y)";
                 } else {
                     extra.yield = teYields['10Y'] || newPrices['^TNX'];
                     extra.yieldSource = "BM(10Y)";
                 }
             }
             newEtfData[symbol] = extra;
        });

        savePriceCache(newPrices, newEtfData);
        
        console.log(`=== 股價更新完成，總耗時: ${(performance.now() - tTotalStart).toFixed(2)} ms ===`);

        setRealTimePrices(newPrices);
        setEtfExtraData(newEtfData);
        setHistoricalData({});
        localStorage.removeItem('gemini_analysis_cache');
        setAiSignals({}); setAiSummary(null); setAiDetail(null); setUsedModel(null); setPortfolioHealth(null); 
        setPriceLoading(false); setLastUpdated(new Date()); setLoadingMessage('更新即時股價中...'); 
        processData(data, newPrices, newEtfData);
    }
  };

  const callGeminiWithFallback = async (prompt) => {
    if (!geminiApiKey) {
      const confirm = window.confirm("尚未設定 AI 金鑰。\n\n單機版需要您自己的 Google Gemini API Key 才能運作 AI 分析功能。\n\n是否現在前往「設定」頁面輸入？");
      if (confirm) setActiveTab('config');
      throw new Error("請先至「設定」頁面儲存 API Key");
    }
    
    const defaultModels = AVAILABLE_MODELS.map(m => m.id);
    const models = [...new Set([selectedModel, ...defaultModels])];
    let errorMessages = [];

    try {
      for (const model of models) {
        const controller = new AbortController();
        // 將等待時間延長至 45 秒，避免 Pro 模型因思考較久而觸發逾時
        const timeoutId = setTimeout(() => controller.abort(), 45000); 
        try {
          const aiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
          console.log(`[Network] 🧠 呼叫 AI 模型網址: ${aiUrl} (隱藏金鑰)`);
          
          const response = await fetch(`${aiUrl}?key=${geminiApiKey}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { maxOutputTokens: 4096, temperature: 0.2 } }),
              signal: controller.signal
            });
          clearTimeout(timeoutId);
          
          if (!response.ok) { 
              let errMsg = await response.text();
              try {
                  const errData = JSON.parse(errMsg);
                  if (errData.error && errData.error.message) errMsg = errData.error.message;
              } catch (e) { /* ignore parse error */ }
              
              console.error(`[Gemini API 錯誤] Model ${model} HTTP ${response.status}:`, errMsg);
              errorMessages.push(`[${model}] ${response.status} - ${errMsg}`);
              
              if (model !== models[models.length - 1]) {
                  console.warn(`[模型切換] 模型 ${model} 失敗，準備切換至下一個備用模型。詳細原因: HTTP ${response.status} - ${errMsg}`);
              }

              // 針對 API Key 錯誤 (400 且包含 API key 相關字眼 或 403 權限不足)，直接停止重試所有其他模型
              if ((response.status === 400 && errMsg.toLowerCase().includes('api key')) || response.status === 403) {
                  throw new Error(`API Key 無效或權限不足 (${errMsg})`);
              }
              continue; 
          }
          const data = await response.json();
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) { 
              if (model !== models[0]) {
                  console.log(`[模型切換成功] 原設定模型 ${models[0]} 失敗，已自動切換至 ${model} 並順利完成分析。`);
              }
              return { text, model }; 
          }
          else {
              errorMessages.push(`[${model}] 回傳資料格式異常或無內容`);
              if (model !== models[models.length - 1]) {
                  console.warn(`[模型切換] 模型 ${model} 回傳空內容，準備切換至下一個備用模型。`);
              }
          }
        } catch (err) {
          clearTimeout(timeoutId);
          if (err.message.includes('API Key 無效')) throw err;
          
          if (err.name === 'AbortError') { 
              console.warn(`[Gemini API 逾時] Model ${model} timed out after 45s.`); 
              errorMessages.push(`[${model}] 連線逾時 (>45秒)`);
          } else { 
              console.error(`[Gemini API 例外錯誤] Model ${model}:`, err); 
              errorMessages.push(`[${model}] ${err.message}`);
          }

          if (model !== models[models.length - 1]) {
              console.warn(`[模型切換] 模型 ${model} 發生例外錯誤 (${err.message})，準備切換至下一個備用模型。`);
          }
        } 
      }
    } catch (err) {
        if (err.message.includes('API Key 無效')) throw err;
        console.error(`[Gemini API 全域錯誤]:`, err);
    }
    
    throw new Error(`AI 服務連線失敗，請檢查 API Key 或網路狀態。\n(歷程:\n${errorMessages.join('\n')})`);
  };

  const generatePortfolioHealthCheck = async () => {
    if (!geminiApiKey) { alert("請先設定 API Key"); setActiveTab('config'); return; }
    if (isHealthChecking) return;
    setIsHealthChecking(true); setPortfolioHealth(null);
    const totalAsset = summary.totalValue;
    const topHoldings = sortedHoldings.slice(0, 5).map(h => `${h['名稱']}(${h['標的']}): ${formatPercent(h.marketValue / totalAsset)}`);
    const allocationStr = allocationData.map(d => `${d.name} ${formatPercent(d.percentage)}`).join(', ');
    const prompt = `角色：首席投資長 (CIO) 與風險控管經理。任務：對目前的投資組合進行總體風險與健康度健檢。【資產數據】- 總資產：${formatCurrency(summary.totalValue)}- 總損益：${formatCurrency(summary.totalPL)} (ROI: ${formatPercent(summary.totalROI)})- 資產配置：${allocationStr}- 前五大持股 (集中度風險)：${topHoldings.join(', ')} 請分析並輸出以下格式 (請嚴格遵守 TAG 格式，不要使用 Markdown 代碼區塊)：[SCORE] (請給出 0-100 的分數，根據風險分散性與配置合理性評分) [RISK] (低風險 / 中低風險 / 中風險 / 中高風險 / 高風險 - 請選一個) [COMMENT] (200字以內的總評，包含風險提示與資產配置建議。語氣專業、客觀) [SUGGESTION] (請列出 3 點具體調整方向，每點一行)`;
    try {
        console.log(`[AI 健檢發送字句 (Prompt)]:\n`, prompt);
        const aiStart = performance.now();
        const { text } = await callGeminiWithFallback(prompt);
        console.log(`[Timer] AI 健檢總耗時: ${(performance.now() - aiStart).toFixed(2)} ms`);
        const scoreMatch = text.match(/\[SCORE\]\s*(\d+)/i); const riskMatch = text.match(/\[RISK\]\s*(.+)/i); const commentMatch = text.match(/\[COMMENT\]\s*([\s\S]*?)\s*(?=\[SUGGESTION\]|$)/i); const suggestionMatch = text.match(/\[SUGGESTION\]\s*([\s\S]*)/i);
        setPortfolioHealth({ score: scoreMatch ? parseInt(scoreMatch[1]) : 0, risk: riskMatch ? riskMatch[1].trim() : "未知", comment: commentMatch ? commentMatch[1].trim() : "無法解析評論", suggestions: suggestionMatch ? suggestionMatch[1].trim().split('\n').filter(s => s.trim().length > 0) : [] });
    } catch (err) { 
        console.error("[Health Check Error]", err);
        setPortfolioHealth({ score: 0, risk: "Error", comment: `AI 分析失敗：${err.message}`, suggestions: [] }); 
    } finally { setIsHealthChecking(false); }
  };

  const generateFullAnalysis = async (symbol, data, forceUpdate = false) => {
    if (!data || data.length === 0) { console.warn("AI Analysis Aborted: No Chart Data"); return; }
    if (analysisInProgressRef.current[symbol]) { console.warn("AI Analysis Aborted: Already in progress"); return; }
    
    console.log("=== Triggering AI Analysis ===", symbol, "Force:", forceUpdate);
    analysisInProgressRef.current[symbol] = true;

    try {
        const latest = data[data.length - 1]; const prevDay = data.length > 1 ? data[data.length - 2] : null; const dataDate = latest.date;
        const today = getTodayDate(); const cache = getAiCache();

        if (!forceUpdate && cache[symbol] && cache[symbol].date === today && cache[symbol].summary && cache[symbol].detail) {
          setAiSummary(String(cache[symbol].summary)); setAiDetail(String(cache[symbol].detail));
          if (cache[symbol].signal) setAiSignals(prev => ({ ...prev, [symbol]: cache[symbol].signal }));
          setUsedModel(cache[symbol].model); setIsCachedResult(true); setAnalysisSymbol(symbol); setIsDetailExpanded(true); setIsAiSummarizing(false); 
          return;
        }

        setIsAiSummarizing(true); setAiSummary(null); setAiDetail(null); setUsedModel(null); setIsCachedResult(false); setAnalysisSymbol(symbol); 
        setAiSignals(prev => { const next = { ...prev }; delete next[symbol]; return next; });

        const assetInfo = tradableSymbols.find(t => t['標的'] === symbol);
        const stockName = assetInfo?.['名稱'] || symbol; const category = assetInfo?.['類別'] || '股票';
        const assetType = detectAssetType(symbol, stockName, category);
        
        // Check if user already bought the "Basic" portion THIS month
        const currentMonthPrefix = today.substring(0, 7); 
        const hasBoughtThisMonth = portfolioData.some(item => 
            item['標的'] === symbol && 
            (item['日期'] || '').startsWith(currentMonthPrefix) &&
            item['策略'] === '基礎買入'
        );
        
        const isLongBond = isLongTermBond(stockName);
        const benchmarkYield = isLongBond 
            ? (usBondYields['20Y'] || usBondYields['30Y']) 
            : usBondYields['10Y'];
        const benchmarkLabel = isLongBond ? '美國長天期公債殖利率 (20yr+ Benchmark)' : '美國10年期公債殖利率 (市場基準)';

        const etfData = etfExtraData[symbol];
        
        const settings = investmentSettings[symbol] || { type: 'CORE', isDCA: false, addon: 'PYRAMID', addon2: 'NONE' };
        const classification = settings.type || 'CORE'; 
        const classLabel = ASSET_TYPES[classification]?.label || '核心資產';
        const isDCA = settings.isDCA; 
        
        const addonLogic = settings.addon || 'NONE'; 
        const addon2Logic = settings.addon2 || 'NONE';
        
        const getAddonText = (logic) => {
            if (logic === 'PYRAMID') return "「跌幅金字塔 (Pyramid)」：分析回檔幅度與乖離率。若股價較近期高點回檔>5%~10%或觸及長期均線支撐，視為加碼訊號。";
            if (logic === 'TECHNICAL') return "「技術指標 (Technical)」：分析動能訊號。若 KD 低檔黃金交叉(K<20金叉)、MACD 柱狀體翻紅或 RSI 突破 50，視為加碼訊號。";
            if (logic === 'YIELD_MACRO') return "「殖利率/總經 (Yield/Macro)」：分析殖利率吸引力。若殖利率高於歷史平均(>4%~5%)，或債券價格位於歷史低檔區(殖利率倒數)，視為加碼訊號。";
            return "";
        };

        let addonStrategy = "【加碼邏輯 (雙重驗證)】：";
        if (addonLogic !== 'NONE') addonStrategy += `\n - 條件一 (主要)：${getAddonText(addonLogic)}`;
        if (addon2Logic !== 'NONE') addonStrategy += `\n - 條件二 (次要)：${getAddonText(addon2Logic)}`;
        if (addonLogic !== 'NONE' && addon2Logic !== 'NONE') {
            addonStrategy += `\n * 判定標準：必須綜合參考「條件一」與「條件二」，若兩者皆出現正向訊號，加碼訊號最強；若僅單一條件成立，請依據市況判斷是否視為「加碼邏輯成立」。`;
        } else if (addonLogic === 'NONE' && addon2Logic === 'NONE') {
            addonStrategy += "\n - 無設定特別加碼條件，依據基礎定位操作。";
        }

        const performanceInfo = assetInfo ? `目前損益：${formatCurrency(assetInfo.profitLoss)} (ROI: ${formatPercent(assetInfo.roi)})。` : "";
        const currentPrice = realTimePrices[symbol] || latest.close; const prevClose = prevDay ? prevDay.close : latest.close;
        
        let keyMetrics = "";
        
        if (assetType === 'ETF' || assetType === 'BOND_ETF') {
            if (etfData && etfData.nav) {
                const pd = (currentPrice - etfData.nav) / etfData.nav;
                const source = etfData.navSource ? `(${etfData.navSource})` : '';
                keyMetrics += `\n- 折溢價 (P/D): ${(pd*100).toFixed(2)}% (淨值: ${etfData.nav} ${source})`;
            } else { 
                keyMetrics += `\n- 折溢價: 資料缺失 (無法取得淨值)`; 
            }
        }

        if (assetType === 'BOND' || assetType === 'BOND_ETF') {
            if (etfData && etfData.yield) {
                const yieldVal = etfData.yield < 1 ? etfData.yield * 100 : etfData.yield;
                const source = etfData.yieldSource ? `(${etfData.yieldSource})` : '';
                keyMetrics += `\n- 殖利率 (Yield): ${yieldVal.toFixed(2)}% ${source}`;
            } else {
                keyMetrics += `\n- 殖利率: 資料缺失`;
            }
        } else if (assetType === 'ETF' && etfData && etfData.yield) {
            const yieldVal = etfData.yield < 1 ? etfData.yield * 100 : etfData.yield;
            const source = etfData.yieldSource ? `(${etfData.yieldSource})` : '';
            keyMetrics += `\n- 殖利率 (Yield): ${yieldVal.toFixed(2)}% ${source}`;
        }
        
        if (assetType === 'BOND' || assetType === 'BOND_ETF' || isUsAsset(symbol)) {
            keyMetrics += `\n- 參考匯率 (USD/TWD): ${usdRate}`;
            if (benchmarkYield) keyMetrics += `\n- ${benchmarkLabel}: ${benchmarkYield}%`;
        }

        let strategyContext = classification === 'CORE' ? "【核心資產 (CORE)】策略屬性：左側交易、價值投資。目標：長期持有，跌破季線(MA60)或半年線(MA120)視為價值浮現。" : "【衛星資產 (SATELLITE)】策略屬性：右側交易、波段操作。目標：抓取波段價差，站上月線(MA20)且動能強視為買進，跌破月線應停利停損。"; 

        const goldenRule = `
**【最高交易鐵律 (大原則絕對遵守)】**
1. **追高禁令 (漲時不買)**：若「目前即時價」大於「昨日收盤價」(今日上漲)，**絕對不可**產生任何買進或加碼訊號！(強制作為觀望 HOLD 或減碼 REDUCE)。
2. **殺低禁令 (跌時不賣)**：若「目前即時價」小於「昨日收盤價」(今日下跌)，**絕對不可**產生任何賣出或減碼訊號！(強制作為觀望 HOLD 或加碼 ADD)。
`;

        const specializedRules = `
**【資產屬性分類與分析邏輯 (第一優先遵守)】**
請先判斷標的屬於以下哪一類，並**只使用**該類別的指標進行判斷：

1. **波動大股票 (科技股、飆股)**
   - **主要 (第一濾網)**：MACD (綠柱收斂、DIF 黃金交叉)。
   - **輔助 (確認訊號)**：RSI (底背離)。
   - **地雷 (忽略)**：KD (易鈍化)。

2. **波動小股票 (金融股、傳產股)**
   - **主要 (第一濾網)**：布林通道 (觸碰下緣)。
   - **輔助 (確認訊號)**：KD (低檔金叉)、殖利率 (>歷史平均)。
   - **地雷 (忽略)**：MACD (反應太慢)。

3. **大盤型 ETF (如 0050, 006208)**
   - **主要 (第一濾網)**：KD 指標 (日/週 KD < 20)。
   - **輔助 (確認訊號)**：均線 (回測季線/年線)。
   - **地雷 (忽略)**：個股財報。

4. **科技型/成長型 ETF (如 00895, QQQ)**
   - **主要 (第一濾網)**：折溢價 (確認市價 < 淨值，即折價)。
   - **輔助 (確認訊號)**：RSI (跌破 30)。
   - **地雷 (忽略)**：殖利率 (意義不大)。

5. **債券型 ETF (如 00679B, TLT)**
   - **主要 (第一濾網)**：美債殖利率 (Yield 創新高時為買點)。(針對名稱含"20年"的標的，請務必參考 ^TVC 20年期數據)
   - **輔助 (確認訊號)**：匯率 (台幣強升段有利)、折溢價 (市價 < 淨值)。
   - **地雷 (忽略)**：MACD / RSI (易失真)。
`;

        let dcaStrategy = "";
        let dcaBasicInfo = "";
        if (isDCA) {
           dcaBasicInfo = `\n      - 今日是否為本月最後一個交易日 (月底扣款日)：${isLastTradingDay ? '【是】' : '【否】'}\n      - 本月是否已完成基礎買入：${hasBoughtThisMonth ? '【是】(僅評估加碼)' : '【否】(需尋找買點)'}`;
           if (hasBoughtThisMonth) {
               dcaStrategy = `3. 【定期定額 (本月已扣款)】：本月已完成基礎買入。目前**僅**需評估是否觸發加碼條件，不再產生基礎扣款訊號。`;
           } else {
               dcaStrategy = `3. 【定期定額 (智慧尋找買點)】：
   - 目標：在當月尋找相對低點買入，而非盲目扣款。
   - 判斷邏輯：請依據該標的物特性（參考上述專屬分類規則），判斷目前的價格、技術指標（如布林下軌、KD 低檔等）或籌碼面，**是否暗示目前為當月相對低點區間**。
   - 若判斷【是】：則「基礎扣款條件」成立。
   - 若判斷【否】：則「基礎扣款條件」暫不成立，建議繼續等待更佳買點。
   - **最後防線 (強制扣款)**：若「今日是否為月底扣款日」為【是】，則代表本月已無時間繼續等待，此時**無論技術指標為何，強制判定「基礎扣款條件」成立！**`;
           }
        } else {
           dcaStrategy = `3. 【單筆投入】：此標的非定期定額，純粹依據【策略疊加】的加碼條件與【最高交易鐵律】來尋找買點，無須考慮月底扣款日。`;
        }

        const prompt = `請以一位專業股票分析師的角色，進行個股深度分析。
      **分析標的確認**：
      - 股票代號 (Symbol)：${symbol}
      - 股票名稱 (Name)：${stockName}
      - 資產屬性：${assetType} (詳細分類)
      **基本資訊**：
      - 今日日期：${today}${dcaBasicInfo}
      - 投資定位：${classLabel}
      - 投資模式：${isDCA ? '定期定額 (DCA)' : '單筆投入'}
      - ${performanceInfo}
      - K線收盤價 (Data Date): ${formatPrice(latest.close)}
      - 昨日收盤價 (Prev Close): ${formatPrice(prevClose)}
      - **目前即時價 (Real-time): ${formatPrice(currentPrice)}** (請以此價格判斷當下操作)
      **關鍵數據 (Key Metrics - 必備)**：${keyMetrics}
      **技術指標**：
      - 均線：MA20 ${latest.MA20?formatPrice(latest.MA20):'-'} / MA60 ${latest.MA60?formatPrice(latest.MA60):'-'} / MA120 ${latest.MA120?formatPrice(latest.MA120):'-'}
      - KD指標：K=${latest.K?formatPrice(latest.K):'-'}, D=${latest.D?formatPrice(latest.D):'-'}
      - MACD：OSC=${latest.OSC?formatPrice(latest.OSC):'-'}
      - RSI指標：RSI6=${latest.RSI6?formatPrice(latest.RSI6):'-'}, RSI12=${latest.RSI12?formatPrice(latest.RSI12):'-'}
      - 布林通道：上軌=${latest.BBU?formatPrice(latest.BBU):'-'}, 中軌=${latest.BBM?formatPrice(latest.BBM):'-'}, 下軌=${latest.BBL?formatPrice(latest.BBL):'-'}
      
      ${goldenRule}
      
      ${specializedRules}

      **使用者策略模組 (需疊加分析)**：
      1. ${strategyContext}
      2. ${addonStrategy}
      ${dcaStrategy}
      **目標價與操作區間分析 (Mandatory)**：
      請在 [DETAIL] 的最後一段，根據上述分析提供明確的價格指引：
      - 若建議為 **ADD (加碼) / REDUCE (減碼)**：請根據技術支撐/壓力位(如布林通道、均線)，提供一個【預估目標價 (Target Price)】或【合理操作區間】。
      - 若建議為 **ADD_BASIC (定期定額基礎扣款)**：請分析目前的【安全扣款價格上限】或【建議扣款區間】，避免在乖離過大時盲目扣款。若因月底強制扣款，請明示。
      **最終燈號判定規則 (複合燈號 - 極重要)**：
      請確保您的 [SIGNAL] 輸出與您的文字分析**完全一致**。
      - **必須優先套用【最高交易鐵律】**：因今日上漲被阻擋的買入，或因今日下跌被阻擋的賣出，均視為觀望。
      - **SIGNAL: REDUCE**：(紅燈) 趨勢轉空且今日未下跌。
      - **SIGNAL: ADD_ALL**：(綠燈) 「基礎扣款成立」且「加碼邏輯成立」且今日未上漲。
      - **SIGNAL: ADD_BASIC**：(綠燈) 「基礎扣款成立」但「加碼邏輯不成立」且今日未上漲。
      - **SIGNAL: ADD_BONUS**：(綠燈) 「基礎扣款不成立(或本月已扣或非定期定額)」但「加碼邏輯成立」且今日未上漲。
      - **SIGNAL: HOLD**：(黃燈) 若上述皆不成立，或因【最高交易鐵律】被阻擋 (建議觀望)。
      請依序輸出 (請勿使用 Markdown 代碼區塊)：
      [SUMMARY] (50字內簡評，結合投資定位與目前損益狀況)
      [DETAIL] (完整分析報告，請詳細且重點明確地說明。請分點：1. 資產歸類確認 2. 第一濾網分析 3. 輔助訊號分析 4. 策略疊加與鐵律檢驗 (含DCA低點判斷) 5. 目標價與操作建議。)
      [SIGNAL] (請輸出單一詞彙，例如：ADD_ALL)`;

        try {
          console.log(`[AI 個股分析發送字句 (Prompt) - ${symbol}]:\n`, prompt);
          const aiStart = performance.now();
          const { text, model } = await callGeminiWithFallback(prompt);
          console.log(`[Timer] AI 分析 (${symbol}) 耗時: ${(performance.now() - aiStart).toFixed(2)} ms`);
          setUsedModel(model);
          const summaryMatch = text.match(/\[SUMMARY\]\s*([\s\S]*?)\s*(?=\[DETAIL\]|$)/i);
          const detailMatch = text.match(/\[DETAIL\]\s*([\s\S]*?)\s*(?=\[SIGNAL\]|$)/i);
          const signalMatch = text.match(/\[SIGNAL\]\s*[:：\-]?\s*(ADD_ALL|ADD_BASIC|ADD_BONUS|REDUCE|HOLD)/i);
          
          let summary = summaryMatch ? summaryMatch[1].trim() : "分析完成"; summary = summary.replace(/[`*#]/g, '').replace(/\n/g, ' ').trim();
          const detail = detailMatch ? detailMatch[1].trim() : text;
          const signalCode = signalMatch ? signalMatch[1].toUpperCase() : 'HOLD';
          setAiSummary(String(summary)); setAiDetail(String(detail)); setAiSignals(prev => ({ ...prev, [symbol]: signalCode }));
          updateAiCache(symbol, { summary, detail, signal: signalCode, model }, dataDate); 
          setIsDetailExpanded(true); 
        } catch (err) { 
            console.error(`[AI 分析解析錯誤 - ${symbol}]:`, err);
            setAiSummary(String(err.message) || "分析暫時無法使用。"); 
        } 
    } catch(err) {
        console.error(`[AI 分析全域錯誤 - ${symbol}]:`, err);
        setAiSummary("分析發生預期外錯誤，請稍後再試。");
    } finally {
        setIsAiSummarizing(false); 
        delete analysisInProgressRef.current[symbol];
    }
  };

  const fetchHistoricalData = async (symbol, tf) => {
    if (!symbol || symbol.includes('TD') || symbol === '定存') return;
    
    // UI Lock Mechanism
    if (isLocked) return;
    setIsLocked(true);
    
    setHistoryLoading(true); setHistoryError(null); 
    setAnalysisSymbol(symbol); 
    
    setIsAiSummarizing(false); 
    setIsCachedResult(false);

    const today = getTodayDate();
    const cache = getAiCache();
    if (cache[symbol] && cache[symbol].date === today && (cache[symbol].summary || cache[symbol].detail)) {
      setAiSummary(String(cache[symbol].summary));
      setAiDetail(String(cache[symbol].detail));
      if (cache[symbol].signal) setAiSignals(prev => ({ ...prev, [symbol]: cache[symbol].signal }));
      setUsedModel(cache[symbol].model); 
      setIsCachedResult(true); 
      setIsDetailExpanded(true);
      setHistoryLoading(false);
      setIsLocked(false); 
      
      const chartKey = `${symbol}_${tf}`;
      if (!historicalData[chartKey]) {
          try {
             // Let next try block handle it if missing
          } catch(e) {}
      }
    } else {
       setAiSummary(null);
       setAiDetail(null);
       setUsedModel(null);
    }

    try {
      let range = '1y'; let interval = '1d';
      if (tf === '5y_1wk') { range = '5y'; interval = '1wk'; }
      if (tf === '10y_1mo') { range = '10y'; interval = '1mo'; }
      
      const targetUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=${interval}&range=${range}`;
      const result = await fetchWithProxyFallback(targetUrl);
      const chartData = result?.chart?.result?.[0];
      if (chartData && chartData.timestamp) {
        const timestamps = chartData.timestamp;
        const quote = chartData.indicators.quote[0];
        const rawPoints = timestamps.map((ts, i) => ({ date: new Date(ts * 1000).toISOString().slice(0, 10), close: quote.close[i], high: quote.high[i], low: quote.low[i], open: quote.open[i] })).filter(d => d.close != null && d.high != null);
        
        const techStart = performance.now();
        const processedData = processTechnicalData(rawPoints);
        console.log(`[Timer] 計算技術指標 (${symbol}) 耗時: ${(performance.now() - techStart).toFixed(2)} ms`);
        
        setHistoricalData(prev => ({ ...prev, [`${symbol}_${tf}`]: processedData }));
        
        // 提前解除圖表的 loading 狀態，讓圖表能先顯示，不用等 AI 分析
        setHistoryLoading(false);

        if (geminiApiKey) {
             await generateFullAnalysis(symbol, processedData); 
        } else {
             if(!aiSummary) setAiSummary("請設定 API Key 以啟用 AI 分析。");
        }

      } else { throw new Error('No chart data found'); }
    } catch (err) { console.warn(`無法取得 ${symbol} 的歷史數據:`, err); setHistoryError("無法載入圖表數據，可能是代號錯誤或來源不穩，請稍後再試。"); setIsAiSummarizing(false); } 
    finally { 
        setHistoryLoading(false); 
        setIsLocked(false); 
    }
  };

  const performFetch = async (url) => {
    setLoading(true); setError(null); setUpdateError(null); setRealTimePrices({}); setHistoricalData({}); setPortfolioHealth(null);
    console.log(`[Network] 📊 讀取使用者 CSV 試算表網址: ${url}`);
    
    try {
      const Papa = await loadPapaParse();
      Papa.parse(url, {
        download: true, header: true,
        complete: (results) => {
          if (results.data && results.data.length > 0) {
            const validData = results.data.filter(row => row['標的'] && row['價格']);
            setRawData(validData);
            
            const cachedPrices = getPriceCache();
            const flatPrices = {};
            Object.keys(cachedPrices).forEach(key => {
                if (cachedPrices[key] && cachedPrices[key].price) {
                    flatPrices[key] = cachedPrices[key].price;
                }
            });
            
            setRealTimePrices(flatPrices);
            setUsdRate(flatPrices['TWD=X'] || 1);
            setUsBondYields({
                '10Y': flatPrices['^TNX'] || null,
                '20Y': flatPrices['^TVC'] || null,
                '30Y': flatPrices['^TYX'] || null
            });
            
            const cachedEtfData = {};
            Object.keys(cachedPrices).forEach(key => {
                if(cachedPrices[key]?.nav) {
                    cachedEtfData[key] = { ...cachedEtfData[key], nav: cachedPrices[key].nav, navSource: cachedPrices[key].navSource };
                }
                if(cachedPrices[key]?.yield) {
                    cachedEtfData[key] = { ...cachedEtfData[key], yield: cachedPrices[key].yield, yieldSource: cachedPrices[key].yieldSource };
                }
            });
            setEtfExtraData(cachedEtfData);
            
            processData(validData, flatPrices, cachedEtfData); 
            setLoading(false); 
            fetchRealTimePrices(validData, false); 
            
            localStorage.setItem('investment_sheet_url', url);
          } else { setError('讀取到的資料為空'); setLoading(false); }
        },
        error: (err) => { setError(`讀取失敗: ${err.message}`); setLoading(false); }
      });
    } catch (e) { setError('無法載入解析庫'); setLoading(false); }
  };

  const handleFetchButton = () => { if (!sheetUrl) { alert("請輸入 URL"); return; } performFetch(sheetUrl); };
  
  const handleSaveSettings = () => {
    localStorage.setItem('gemini_api_key', geminiApiKey);
    localStorage.setItem('gemini_model', selectedModel);
    localStorage.setItem('fee_discount', feeDiscount);
    localStorage.setItem('investment_sort_config', JSON.stringify(sortConfig));
    if (customOrder.length > 0) localStorage.setItem('investment_custom_order', JSON.stringify(customOrder));
    setToast("設定已儲存！"); 
    if (rawData.length > 0) processData(rawData, realTimePrices);
  };
  
  const handleChatSend = async () => {
    if (!chatInput.trim() || !geminiApiKey) return;
    
    const userMsg = { role: 'user', content: chatInput };
    setChatMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setIsChatLoading(true);

    const contextData = {
        totalAssets: summary.totalValue,
        totalProfit: summary.totalPL,
        roi: summary.totalROI,
        holdings: aggregatedHoldings.map(h => ({ 
            symbol: h['標的'], 
            name: h['名稱'], 
            value: h.marketValue, 
            roi: h.roi,
            type: assetClassifications[h['標的']] || 'CORE'
        }))
    };

    const prompt = `角色：專業投資顧問。使用者投資組合數據：${JSON.stringify(contextData)}。核心資產(CORE)定義：追求穩健、長期持有、防守型。衛星資產(SATELLITE)定義：追求超額報酬、波段操作、攻擊型。使用者問題：${userMsg.content} 請根據上述數據與分類提供簡短、專業的回答。`;

    try {
        const { text: reply } = await callGeminiWithFallback(prompt);
        setChatMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    } catch (err) {
        console.error("[Chat Send Error]", err);
        setChatMessages(prev => [...prev, { role: 'assistant', content: `抱歉，AI 暫時無法回應 (${err.message})` }]);
    } finally {
        setIsChatLoading(false);
    }
  };

  const handleSettingChange = (symbol, key, value) => {
    const currentSettings = investmentSettings[symbol] || { type: 'CORE', isDCA: false, addon: 'PYRAMID', addon2: 'NONE' };
    const newSettings = { ...investmentSettings, [symbol]: { ...currentSettings, [key]: value } };
    setInvestmentSettings(newSettings);
    localStorage.setItem('investment_settings', JSON.stringify(newSettings));
    
    if (key === 'type') {
        const newClassifications = { ...assetClassifications, [symbol]: value };
        setAssetClassifications(newClassifications);
        localStorage.setItem('investment_asset_classifications', JSON.stringify(newClassifications));
    }
  };

  const requestSort = (key) => {
    let direction = 'desc'; 
    if (sortConfig.key === key && sortConfig.direction === 'desc') direction = 'asc';
    setSortConfig({ key, direction });
  };

  const moveItem = (symbol, direction) => {
    if (sortConfig.key !== 'manual') setSortConfig({ key: 'manual', direction: 'asc' });
    setCustomOrder(prev => {
      const currentIndex = prev.indexOf(symbol);
      if (currentIndex === -1) return prev;
      const newIndex = currentIndex + direction;
      if (newIndex < 0 || newIndex >= prev.length) return prev;
      const newOrder = [...prev];
      [newOrder[currentIndex], newOrder[newIndex]] = [newOrder[newIndex], newOrder[currentIndex]];
      return newOrder;
    });
  };

  const SortIcon = ({ columnKey }) => {
    if (sortConfig.key !== columnKey) return <ArrowUpDown className="w-3 h-3 ml-1 text-slate-600 opacity-50" />;
    return sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3 ml-1 text-blue-400" /> : <ArrowDown className="w-3 h-3 ml-1 text-blue-400" />;
  };

  useEffect(() => {
    const savedUrl = localStorage.getItem('investment_sheet_url');
    const savedKey = localStorage.getItem('gemini_api_key');
    const savedModel = localStorage.getItem('gemini_model');
    const savedDiscount = localStorage.getItem('fee_discount');
    const savedSort = localStorage.getItem('investment_sort_config');
    const savedOrder = localStorage.getItem('investment_custom_order');
    const savedSettings = localStorage.getItem('investment_settings');
    const savedClassifications = localStorage.getItem('investment_asset_classifications');

    if (savedKey) setGeminiApiKey(savedKey);
    const isValidModel = AVAILABLE_MODELS.some(m => m.id === savedModel);
    if (savedModel && isValidModel) { setSelectedModel(savedModel); } 
    else { setSelectedModel(AVAILABLE_MODELS[0].id); }
    
    if (savedDiscount) setFeeDiscount(parseFloat(savedDiscount));
    if (savedSort) setSortConfig(JSON.parse(savedSort));
    if (savedOrder) setCustomOrder(JSON.parse(savedOrder));

    let initialSettings = {};
    if (savedSettings) {
        initialSettings = JSON.parse(savedSettings);
        Object.keys(initialSettings).forEach(key => {
            if(!initialSettings[key].addon2) initialSettings[key].addon2 = 'NONE';
        });
    } else if (savedClassifications) {
        const oldClass = JSON.parse(savedClassifications);
        Object.keys(oldClass).forEach(key => {
            initialSettings[key] = { type: oldClass[key], isDCA: false, addon: 'PYRAMID', addon2: 'NONE' };
        });
    }
    setInvestmentSettings(initialSettings);
    
    const flatClass = {};
    Object.keys(initialSettings).forEach(key => {
        flatClass[key] = initialSettings[key].type;
    });
    setAssetClassifications(flatClass);

    checkLastTradingDay();

    const cache = getAiCache();
    const signals = {};
    Object.keys(cache).forEach(key => { if (cache[key].signal) signals[key] = cache[key].signal; });
    setAiSignals(signals);

    const today = new Date().toISOString().split('T')[0];
    let cacheModified = false;
    Object.keys(cache).forEach(key => { if (cache[key].date !== today) { delete cache[key]; cacheModified = true; } });
    if (cacheModified) localStorage.setItem('gemini_analysis_cache', JSON.stringify(cache));

    if (savedUrl) { setSheetUrl(savedUrl); performFetch(savedUrl); } 
    else { processData(DEMO_DATA, {}); fetchRealTimePrices(DEMO_DATA); }
  }, []);

  useEffect(() => {
    if (activeTab === 'history' && selectedHistorySymbol) {
      const key = `${selectedHistorySymbol}_${timeframe}`;
      if (!historicalData[key] && !historyLoading) {
         fetchHistoricalData(selectedHistorySymbol, timeframe);
      } else if (historicalData[key]) {
         const cache = getAiCache();
         const today = getTodayDate();
         if (!cache[selectedHistorySymbol] || cache[selectedHistorySymbol].date !== today) {
             generateFullAnalysis(selectedHistorySymbol, historicalData[key]);
         } else {
             setAiSummary(String(cache[selectedHistorySymbol].summary));
             setAiDetail(String(cache[selectedHistorySymbol].detail));
             setUsedModel(cache[selectedHistorySymbol].model);
             setIsCachedResult(true);
             setIsDetailExpanded(true);
         }
      }
    }
  }, [activeTab, selectedHistorySymbol, timeframe, historicalData]); 
  
  useEffect(() => {
    if (chatEndRef.current) {
        chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages]);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans pb-20 md:pb-0">
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
      <nav className="hidden md:block border-b border-slate-700 bg-slate-800/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <div className="flex items-center">
            <div className="bg-blue-600 p-2 rounded-lg"><TrendingUp className="h-6 w-6 text-white" /></div>
            <span className="ml-3 text-xl font-bold tracking-wider">Alpha 投資戰情室</span>
            {usdRate !== 1 && <span className="ml-4 text-xs bg-slate-700 px-2 py-1 rounded text-slate-300 flex items-center"><Globe className="w-3 h-3 mr-1"/> USD/TWD: {usdRate.toFixed(2)}</span>}
          </div>
          <div className="flex space-x-4">
            {['overview', 'history', 'chat', 'holdings', 'config'].map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === tab ? 'bg-slate-900 text-blue-400' : 'text-slate-300 hover:bg-slate-700'}`}>
                {tab === 'overview' ? '資產總覽' : tab === 'history' ? '歷史走勢' : tab === 'chat' ? 'AI 助理' : tab === 'holdings' ? '持股明細' : '設定'}
              </button>
            ))}
          </div>
        </div>
      </nav>

      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-800 border-t border-slate-700 z-50 flex justify-around py-3 pb-safe">
        {[ { id: 'overview', icon: PieIcon, label: '總覽' }, { id: 'history', icon: LineIcon, label: '走勢' }, { id: 'chat', icon: MessageSquare, label: 'AI助理' }, { id: 'holdings', icon: FileText, label: '明細' }, { id: 'config', icon: Settings, label: '設定' } ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex flex-col items-center justify-center w-full ${activeTab === tab.id ? 'text-blue-400' : 'text-slate-400'}`}><tab.icon className="h-6 w-6 mb-1" /><span className="text-[10px]">{tab.label}</span></button>
        ))}
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-8">
        {priceLoading && <div className="mb-6 bg-blue-900/30 border border-blue-500/30 rounded-lg p-3 flex items-center justify-between animate-pulse"><div className="flex items-center"><Loader2 className="w-5 h-5 text-blue-400 animate-spin mr-3" /><span className="text-sm text-blue-200">{loadingMessage}</span></div><button onClick={() => setPriceLoading(false)} className="text-xs bg-red-900/50 text-red-200 px-2 py-1 rounded border border-red-500/50 flex items-center hover:bg-red-900/70"><XCircle className="w-3 h-3 mr-1" />停止</button></div>}
        {updateError && <div className="mb-6 bg-red-900/30 border border-red-500/30 rounded-lg p-3 flex items-center"><AlertTriangle className="w-5 h-5 text-red-400 mr-3 flex-shrink-0" /><span className="text-sm text-red-200">{String(updateError)}</span></div>}

        {activeTab === 'overview' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
               {[
                 { label: '總資產現值', value: formatCurrency(summary.totalValue), icon: DollarSign, color: 'text-yellow-400', bg: 'bg-blue-900/50', iColor: 'text-blue-400' },
                 { label: '投入成本', value: formatCurrency(summary.totalCost), icon: Briefcase, color: 'text-white', bg: 'bg-purple-900/50', iColor: 'text-purple-400' },
                 { label: '未實現淨損益 (已扣稅費)', value: `${summary.totalPL > 0 ? '+' : ''}${formatCurrency(summary.totalPL)}`, icon: summary.totalPL >= 0 ? ArrowUpCircle : ArrowDownCircle, color: summary.totalPL >= 0 ? 'text-red-500' : 'text-green-500', bg: summary.totalPL >= 0 ? 'bg-red-900/30' : 'bg-green-900/30', iColor: summary.totalPL >= 0 ? 'text-red-500' : 'text-green-500' },
                 { label: '投資報酬率 (ROI)', value: `${summary.totalROI > 0 ? '+' : ''}${formatPercent(summary.totalROI)}`, icon: PieIcon, color: summary.totalROI >= 0 ? 'text-red-500' : 'text-green-500', bg: 'bg-slate-700', iColor: 'text-slate-300' }
               ].map((item, idx) => (
                   <div key={idx} className="bg-slate-800 p-5 rounded-xl border border-slate-700 shadow flex items-center">
                     <div className={`flex-shrink-0 ${item.bg} rounded-md p-3`}><item.icon className={`h-6 w-6 ${item.iColor}`} /></div>
                     <div className="ml-5 flex-1 min-w-0"><p className="text-sm font-medium text-slate-400 truncate">{item.label}</p><p className={`${getResponsiveFontSize(item.value)} font-bold ${item.color} whitespace-nowrap overflow-hidden text-ellipsis`}>{item.value}</p></div>
                   </div>
               ))}
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center"><PieIcon className="w-5 h-5 mr-2 text-blue-400" /> 資產類別配置</h3>
                  <div className="h-80 w-full min-h-[320px]" style={{ height: 400 }}>
                    {allocationData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={allocationData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value">
                            {allocationData.map((entry, index) => <Cell key={`cell-${index}`} fill={CATEGORY_STYLES[entry.name]?.color || COLORS[index % COLORS.length]} />)}
                          </Pie>
                          <RechartsTooltip itemStyle={{ color: '#f1f5f9' }} contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f1f5f9' }} formatter={(value) => formatCurrency(value)} />
                          <Legend formatter={(value, entry) => { const { payload } = entry; return `${value} (${(payload?.percent * 100).toFixed(1)}%)`; }} />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : <div className="flex h-full items-center justify-center text-slate-500">暫無數據</div>}
                  </div>
                </div>
                <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center"><BarChart2 className="w-5 h-5 mr-2 text-purple-400" /> 持股標的分佈</h3>
                  <div className="h-80 w-full min-h-[320px]" style={{ height: 400 }}>
                    {tradableSymbols.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%"><BarChart data={tradableSymbols.map(item => ({ name: item['名稱'], value: item.marketValue })).sort((a, b) => b.value - a.value)} layout="vertical"><CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} /><XAxis type="number" stroke="#94a3b8" tickFormatter={(val) => `${val / 1000}k`} /><YAxis dataKey="name" type="category" stroke="#94a3b8" width={80} /><RechartsTooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f1f5f9' }} formatter={(value) => formatCurrency(value)} /><Bar dataKey="value" fill="#8B5CF6" radius={[0, 4, 4, 0]}>{tradableSymbols.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}</Bar></BarChart></ResponsiveContainer>
                    ) : <div className="flex h-full items-center justify-center text-slate-500">暫無數據</div>}
                  </div>
                </div>
            </div>
            
            {/* AI Health Check Section */}
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-6 rounded-xl border border-slate-700 shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 z-10 relative">
                    <div><h3 className="text-xl font-bold text-white flex items-center"><Activity className="w-6 h-6 mr-2 text-purple-400" /> AI 投資組合總體健檢室</h3><p className="text-sm text-slate-400 mt-1">由 AI 擔任首席投資長，針對您的資產配置、風險分散度與績效進行綜合評分。</p></div>
                    {!portfolioHealth && !isHealthChecking && (<button onClick={generatePortfolioHealthCheck} className="mt-4 md:mt-0 px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium shadow-lg hover:shadow-purple-500/25 transition-all flex items-center"><BrainCircuit className="w-5 h-5 mr-2" />開始健檢</button>)}
                </div>
                {isHealthChecking && <div className="flex flex-col items-center justify-center py-12"><Loader2 className="w-12 h-12 text-purple-500 animate-spin mb-4" /><p className="text-slate-300 font-medium">AI 正在分析您的投資組合風險結構...</p></div>}
                {portfolioHealth && (
                    <div className="animate-fade-in-up">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                            <div className="bg-slate-800/50 rounded-lg p-5 border border-slate-700 flex flex-col items-center justify-center text-center"><span className="text-slate-400 text-sm mb-2">健康度評分</span><div className="relative"><svg className="w-24 h-24 transform -rotate-90"><circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-slate-700" /><circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="8" fill="transparent" strokeDasharray={251.2} strokeDashoffset={251.2 - (251.2 * portfolioHealth.score) / 100} className={portfolioHealth.score >= 80 ? "text-green-500" : portfolioHealth.score >= 60 ? "text-yellow-500" : "text-red-500"} /></svg><span className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-3xl font-bold text-white">{portfolioHealth.score}</span></div></div>
                            <div className="bg-slate-800/50 rounded-lg p-5 border border-slate-700 flex flex-col items-center justify-center text-center"><span className="text-slate-400 text-sm mb-2">風險屬性判定</span><ShieldAlert className={`w-12 h-12 mb-2 ${portfolioHealth.risk.includes('高') ? 'text-red-400' : portfolioHealth.risk.includes('低') ? 'text-green-400' : 'text-yellow-400'}`} /><span className="text-xl font-bold text-white">{portfolioHealth.risk}</span></div>
                            <div className="bg-slate-800/50 rounded-lg p-5 border border-slate-700 md:col-span-1"><span className="text-slate-400 text-sm mb-2 block text-center md:text-left">AI 調整建議</span><ul className="space-y-2 mt-2">{portfolioHealth.suggestions.slice(0, 3).map((suggestion, idx) => (<li key={idx} className="flex items-start text-sm text-slate-300"><ClipboardCheck className="w-4 h-4 text-purple-400 mr-2 mt-0.5 flex-shrink-0" />{suggestion.replace(/^\d+\.\s*/, '').replace(/^- /, '')}</li>))}</ul></div>
                        </div>
                        <div className="bg-slate-900/50 rounded-lg p-5 border border-slate-700/50"><h4 className="text-white font-medium mb-2 flex items-center"><MessageSquare className="w-4 h-4 mr-2 text-blue-400" /> 總體分析報告</h4><p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">{portfolioHealth.comment}</p></div>
                        <div className="mt-4 flex justify-end"><button onClick={generatePortfolioHealthCheck} className="text-xs text-slate-500 hover:text-slate-300 flex items-center"><RefreshCw className="w-3 h-3 mr-1" /> 重新健檢</button></div>
                    </div>
                )}
            </div>
          </div>
        )}

        {activeTab !== 'overview' && activeTab !== 'chat' && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
             {[
               { label: '總資產現值', value: formatCurrency(summary.totalValue), icon: DollarSign, color: 'text-yellow-400', bg: 'bg-blue-900/50', iColor: 'text-blue-400' },
               { label: '投入成本', value: formatCurrency(summary.totalCost), icon: Briefcase, color: 'text-white', bg: 'bg-purple-900/50', iColor: 'text-purple-400' },
               { label: '未實現淨損益 (已扣稅費)', value: `${summary.totalPL > 0 ? '+' : ''}${formatCurrency(summary.totalPL)}`, icon: summary.totalPL >= 0 ? ArrowUpCircle : ArrowDownCircle, color: summary.totalPL >= 0 ? 'text-red-500' : 'text-green-500', bg: summary.totalPL >= 0 ? 'bg-red-900/30' : 'bg-green-900/30', iColor: summary.totalPL >= 0 ? 'text-red-500' : 'text-green-500' },
               { label: '投資報酬率 (ROI)', value: `${summary.totalROI > 0 ? '+' : ''}${formatPercent(summary.totalROI)}`, icon: PieIcon, color: summary.totalROI >= 0 ? 'text-red-500' : 'text-green-500', bg: 'bg-slate-700', iColor: 'text-slate-300' }
             ].map((item, idx) => (
                 <div key={idx} className="bg-slate-800 p-5 rounded-xl border border-slate-700 shadow flex items-center">
                   <div className={`flex-shrink-0 ${item.bg} rounded-md p-3`}><item.icon className={`h-6 w-6 ${item.iColor}`} /></div>
                   <div className="ml-5 flex-1 min-w-0"><p className="text-sm font-medium text-slate-400 truncate">{item.label}</p><p className={`${getResponsiveFontSize(item.value)} font-bold ${item.color} whitespace-nowrap overflow-hidden text-ellipsis`}>{item.value}</p></div>
                 </div>
             ))}
          </div>
        )}
        
        {activeTab === 'chat' && (
            <div className="max-w-4xl mx-auto h-[70vh] flex flex-col bg-slate-800 rounded-xl border border-slate-700 shadow-lg overflow-hidden">
                <div className="p-4 border-b border-slate-700 bg-slate-900/50 flex items-center"><Bot className="w-6 h-6 text-purple-400 mr-2" /><h3 className="font-semibold text-white">AI 投資顧問</h3></div>
                <div className="flex-1 overflow-y-auto p-4 space-y-4">{chatMessages.map((msg, idx) => (<div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[80%] p-3 rounded-lg ${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-200'}`}><p className="text-sm whitespace-pre-wrap">{msg.content}</p></div></div>))}{isChatLoading && (<div className="flex justify-start"><div className="bg-slate-700 p-3 rounded-lg flex items-center"><Loader2 className="w-4 h-4 animate-spin text-purple-400 mr-2" /><span className="text-xs text-slate-400">AI 正在思考中...</span></div></div>)}<div ref={chatEndRef} /></div>
                <div className="p-4 border-t border-slate-700 bg-slate-900/50"><div className="flex gap-2"><input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleChatSend()} placeholder="輸入您的問題..." className="flex-1 bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500 text-sm" disabled={isChatLoading} /><button onClick={handleChatSend} disabled={isChatLoading || !chatInput.trim()} className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg disabled:opacity-50 transition-colors"><Send className="w-4 h-4" /></button></div></div>
            </div>
        )}

        {activeTab === 'history' && (
          <div className="flex flex-col lg:grid lg:grid-cols-4 gap-6 h-full pb-20 md:pb-0">
            <div className={`lg:col-span-1 bg-slate-800 rounded-xl border border-slate-700 shadow-lg overflow-hidden flex flex-col h-48 lg:h-[700px] flex-none transition-opacity duration-300 ${isLocked ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
              <div className="p-4 border-b border-slate-700 bg-slate-900/50 flex justify-between items-center sticky top-0 z-10"><h3 className="font-semibold text-white flex items-center"><LineIcon className="w-5 h-5 mr-2 text-blue-400" /> 持股列表</h3></div>
              <div className={`overflow-y-auto flex-1 p-2 space-y-2 ${isAiSummarizing ? 'opacity-50 pointer-events-none' : ''}`}>
                {tradableSymbols.map((item) => (
                  <button key={item['標的']} disabled={isAiSummarizing || isLocked} onClick={() => setSelectedHistorySymbol(item['標的'])} className={`w-full text-left px-4 py-3 rounded-lg transition-all border ${selectedHistorySymbol === item['標的'] ? 'bg-blue-600 border-blue-500 text-white shadow-md' : 'bg-slate-700/30 border-transparent text-slate-300 hover:bg-slate-700'}`}>
                    <div className="flex justify-between items-center"><span className="font-bold">{item['標的']}</span><span className="text-xs opacity-70">{item['類別']}</span></div>
                    <div className="text-sm mt-1 truncate">{item['名稱']}</div>
                    <div className="flex justify-between mt-1 text-xs opacity-60"><span>{formatCurrency(item.marketValue)}</span><span className={item.profitLoss >= 0 ? 'text-red-300' : 'text-green-300'}>{formatPercent(item.roi)}</span></div>
                  </button>
                ))}
              </div>
            </div>

            <div className="lg:col-span-3 bg-slate-800 rounded-xl border border-slate-700 shadow-lg p-2 md:p-6 block md:flex md:flex-col relative h-auto md:h-[700px]">
              <div className="flex-none flex flex-col sm:flex-row justify-between items-start sm:items-center mb-2 gap-2">
                <h3 className="text-xl font-bold text-white flex items-center">{selectedHistorySymbol} <span className="ml-2 text-base font-normal text-slate-400">{tradableSymbols.find(t => t['標的'] === selectedHistorySymbol)?.['名稱']}</span></h3>
                <div className={`flex space-x-2 self-end sm:self-auto ${isAiSummarizing || isLocked ? 'opacity-50 pointer-events-none' : ''}`}>{[{ id: '1y_1d', label: '1年日線' }, { id: '5y_1wk', label: '5年週線' }, { id: '10y_1mo', label: '10年月線' }].map(tf => (<button key={tf.id} disabled={isAiSummarizing || isLocked} onClick={() => setTimeframe(tf.id)} className={`px-2 py-1 md:px-3 md:py-1 rounded text-xs font-medium border ${timeframe === tf.id ? 'bg-blue-600 border-blue-500 text-white' : 'border-slate-600 text-slate-400 hover:bg-slate-700'}`}>{tf.label}</button>))}</div>
              </div>
              
              <div className="flex-none flex flex-col space-y-1 h-auto min-h-[400px] md:h-[400px]">
              {historyLoading ? <div className="flex-1 flex items-center justify-center h-full"><div className="flex flex-col items-center"><Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-3" /><span className="text-blue-300">計算技術指標中...</span></div></div> : currentChartData && currentChartData.length > 0 ? (
                <>
                  <div className="h-64 w-full"><ResponsiveContainer width="100%" height="100%"><ComposedChart data={currentChartData} syncId="anyId"><defs><linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/><stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/></linearGradient></defs><CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} /><XAxis dataKey="date" stroke="#94a3b8" tick={{ fontSize: 10 }} minTickGap={50} /><YAxis stroke="#94a3b8" domain={['auto', 'auto']} tickFormatter={formatPrice} /><RechartsTooltip content={<CustomChartTooltip />} /><Legend verticalAlign="top" height={36}/><Area type="monotone" dataKey="close" name="股價" stroke="#3B82F6" fillOpacity={1} fill="url(#colorPrice)" strokeWidth={2} /><Line type="monotone" dataKey="MA20" name="MA20" stroke="#EAB308" dot={false} strokeWidth={1} /><Line type="monotone" dataKey="MA60" name="MA60" stroke="#F97316" dot={false} strokeWidth={1} /><Line type="monotone" dataKey="MA120" name="MA120" stroke="#EF4444" dot={false} strokeWidth={1} /><Area type="monotone" dataKey="BB_Range" stroke="none" fill="#8B5CF6" fillOpacity={0.1} legendType="none" /><Line type="monotone" dataKey="BBU" name="布林上軌" stroke="#8B5CF6" strokeDasharray="3 3" dot={false} strokeWidth={1} /><Line type="monotone" dataKey="BBL" name="布林下軌" stroke="#8B5CF6" strokeDasharray="3 3" dot={false} strokeWidth={1} /><Scatter name="買入點" dataKey="buyPricePoint" shape={<CustomStrategyDot />} legendType="none" /></ComposedChart></ResponsiveContainer></div>
                  
                  <div className="h-32 w-full border-t border-slate-700 pt-1 relative group">
                      <div className="md:hidden absolute top-1 right-2 z-10 flex space-x-1">
                          {Object.keys(INDICATOR_TYPES).map(key => (
                              <button 
                                key={key} 
                                onClick={() => setSelectedIndicator(key)} 
                                className={`text-[10px] px-2 py-0.5 rounded border ${selectedIndicator === key ? 'bg-slate-700 text-white border-slate-500' : 'bg-slate-800 text-slate-500 border-slate-700'}`}
                              >
                                {key}
                              </button>
                          ))}
                      </div>

                      <div className="hidden md:flex absolute top-1 right-2 z-10 space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                           {Object.keys(INDICATOR_TYPES).map(key => (
                              <button 
                                key={key} 
                                onClick={() => setSelectedIndicator(key)} 
                                className={`text-[10px] px-2 py-0.5 rounded border ${selectedIndicator === key ? 'bg-slate-700 text-white border-slate-500' : 'bg-slate-800 text-slate-500 border-slate-700'}`}
                              >
                                {key}
                              </button>
                          ))}
                      </div>
                      
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={currentChartData} syncId="anyId">
                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                            <XAxis dataKey="date" hide />
                            {selectedIndicator === 'KD' && <YAxis stroke="#94a3b8" domain={[0, 100]} ticks={[20, 50, 80]} tick={{fontSize: 10}} tickFormatter={formatPrice} />}
                            {selectedIndicator !== 'KD' && <YAxis stroke="#94a3b8" domain={['auto', 'auto']} tick={{fontSize: 10}} />}
                            <RechartsTooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f1f5f9' }} formatter={(val) => formatPrice(val)} />
                            
                            {selectedIndicator === 'KD' && (
                                <>
                                    <ReferenceLine y={80} stroke="#EF4444" strokeDasharray="3 3" />
                                    <ReferenceLine y={20} stroke="#10B981" strokeDasharray="3 3" />
                                    <Line type="monotone" dataKey="K" stroke="#F59E0B" dot={false} strokeWidth={1} />
                                    <Line type="monotone" dataKey="D" stroke="#3B82F6" dot={false} strokeWidth={1} />
                                </>
                            )}
                            {selectedIndicator === 'MACD' && (
                                <>
                                    <ReferenceLine y={0} stroke="#94a3b8" />
                                    <Bar dataKey="OSC" fill="#8B5CF6" />
                                    <Line type="monotone" dataKey="DIF" stroke="#F59E0B" dot={false} strokeWidth={1} />
                                    <Line type="monotone" dataKey="Signal" stroke="#3B82F6" dot={false} strokeWidth={1} />
                                </>
                            )}
                            {selectedIndicator === 'RSI' && (
                                <>
                                    <ReferenceLine y={70} stroke="#EF4444" strokeDasharray="3 3" />
                                    <ReferenceLine y={30} stroke="#10B981" strokeDasharray="3 3" />
                                    <Line type="monotone" dataKey="RSI6" stroke="#F59E0B" dot={false} strokeWidth={1} />
                                    <Line type="monotone" dataKey="RSI12" stroke="#3B82F6" dot={false} strokeWidth={1} />
                                </>
                            )}
                        </ComposedChart>
                      </ResponsiveContainer>
                  </div>
                  
                  <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 mt-3 pt-2 border-t border-slate-700/50 text-[10px] text-slate-400">
                      <span className="font-semibold text-slate-300">圖例說明:</span>
                      {Object.entries(STRATEGY_CONFIG).map(([key, config]) => {
                          if (key === 'default') return null;
                          return (
                              <div key={key} className="flex items-center">
                                  <svg width="14" height="14" className="mr-1 overflow-visible">
                                      {renderShape(config.shape, 7, 7, config.color, 4)}
                                  </svg>
                                  {config.label}
                              </div>
                          );
                      })}
                  </div>
                  
                </>
              ) : <div className="flex-1 flex items-center justify-center h-full text-slate-500">{historyError ? <span className="text-red-400">{historyError}</span> : "請選擇左側標的以查看走勢"}</div>}
              </div>

              <div className="flex-none px-2 py-1 mt-2 text-[10px] text-slate-500 flex items-center space-x-3 border-t border-dashed border-slate-700/50">
                  <span className="flex items-center"><DollarSign className="w-3 h-3 mr-1" /> 價: {etfExtraData[selectedHistorySymbol]?.priceSource || 'Yahoo'}</span>
                  <span className="flex items-center"><Layers className="w-3 h-3 mr-1" /> 淨: {etfExtraData[selectedHistorySymbol]?.navSource || '-'}</span>
                  <span className="flex items-center"><Percent className="w-3 h-3 mr-1" /> 殖: {etfExtraData[selectedHistorySymbol]?.yieldSource || '-'}</span>
              </div>

              <div className="flex-1 md:min-h-0 flex flex-col mt-4 md:mt-4 pt-2 border-t-2 border-dashed border-slate-600/50 md:overflow-hidden relative z-10 bg-slate-800">
                <div className="flex-none flex items-center justify-between mb-2">
                    <div className="flex items-center"><Sparkles className="w-5 h-5 text-purple-400 mr-2" /><h4 className="text-white font-semibold">AI 智能觀點</h4>{usedModel && <span className="hidden md:inline ml-2 text-xs px-2 py-0.5 rounded bg-slate-700 text-slate-300 border border-slate-600">{(AVAILABLE_MODELS.find(m => m.id === usedModel)?.name || usedModel)} {isCachedResult ? <span className="text-slate-500">(歷史紀錄)</span> : <span className="text-green-400">(本次生成)</span>} {selectedModel !== usedModel && isCachedResult && <span className="text-orange-400 ml-1 text-[10px]">(與設定不符)</span>} {selectedModel !== usedModel && !isCachedResult && <span className="text-yellow-400 ml-1 text-[10px]">(自動切換)</span>}</span>}
                    {aiSignals[selectedHistorySymbol] === 'REDUCE' && (<div className="flex items-center ml-3 bg-red-900/30 px-2 py-1 rounded border border-red-500/30"><div className="w-2 h-2 rounded-full bg-red-500 animate-pulse mr-2" /><span className="text-xs text-red-400 font-bold">建議減少持股</span></div>)}
                    {aiSignals[selectedHistorySymbol] === 'ADD_ALL' && (<div className="flex items-center ml-3 bg-green-900/30 px-2 py-1 rounded border border-green-500/30"><div className="w-2 h-2 rounded-full bg-green-500 animate-pulse mr-2" /><span className="text-xs text-green-400 font-bold">建議基礎及加碼投資</span></div>)}
                    {aiSignals[selectedHistorySymbol] === 'ADD_BASIC' && (<div className="flex items-center ml-3 bg-green-900/30 px-2 py-1 rounded border border-green-500/30"><div className="w-2 h-2 rounded-full bg-green-500 animate-pulse mr-2" /><span className="text-xs text-green-400 font-bold">建議基礎投資</span></div>)}
                    {aiSignals[selectedHistorySymbol] === 'ADD_BONUS' && (<div className="flex items-center ml-3 bg-green-900/30 px-2 py-1 rounded border border-green-500/30"><div className="w-2 h-2 rounded-full bg-green-500 animate-pulse mr-2" /><span className="text-xs text-green-400 font-bold">建議加碼投資</span></div>)}
                    {aiSignals[selectedHistorySymbol] === 'HOLD' && (<div className="flex items-center ml-3 bg-yellow-900/30 px-2 py-1 rounded border border-yellow-500/30"><div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse mr-2" /><span className="text-xs text-yellow-400 font-bold">建議觀望</span></div>)}
                    </div>
                    
                    <div className="flex items-center space-x-2">
                    {aiDetail && (
                        <button 
                            onClick={() => setIsDetailExpanded(!isDetailExpanded)} 
                            className="text-xs text-blue-400 hover:text-blue-300 flex items-center transition-colors"
                        >
                            <FileSearch className="w-3 h-3 mr-1" />
                            {isDetailExpanded ? "收合" : "展開"}
                        </button>
                    )}
                    {geminiApiKey && (
                        <button 
                            onClick={() => {
                                const data = historicalData[`${selectedHistorySymbol}_${timeframe}`];
                                if (data && data.length > 0) {
                                    generateFullAnalysis(selectedHistorySymbol, data, true);
                                } else {
                                    fetchHistoricalData(selectedHistorySymbol, timeframe);
                                }
                            }}
                            className={`text-xs flex items-center transition-colors text-red-400 hover:text-red-300 ${isLocked || isAiSummarizing ? 'opacity-50 cursor-not-allowed' : ''}`}
                            disabled={isLocked || isAiSummarizing}
                        >
                            <RefreshCw className={`w-3 h-3 mr-1 ${isAiSummarizing ? 'animate-spin' : ''}`} /> 
                            重新分析
                        </button>
                    )}
                    </div>
                </div>

                <div className="flex-1 md:overflow-y-auto bg-slate-900/50 rounded-lg p-3 border border-slate-700 shadow-inner custom-scrollbar">
                  {isAiSummarizing ? (
                    <div className="flex items-center text-slate-400 text-sm"><Loader2 className="w-4 h-4 animate-spin mr-2" />AI 正在分析中...</div>
                  ) : (
                    <>
                      {aiSummary ? <div className="mb-2"><p className="text-slate-300 text-sm leading-relaxed border-l-2 border-purple-500 pl-3">{String(aiSummary)}</p></div> : <div className="text-slate-500 text-sm">暫無 AI 分析數據 (請點擊重新分析)</div>}
                      {aiDetail && (
                        <div className={`pt-2 border-t border-slate-700/50 transition-all duration-300 ${isDetailExpanded ? 'block' : 'hidden'}`}>
                          <div className="prose prose-invert prose-sm max-w-none text-slate-300 whitespace-pre-wrap leading-relaxed text-xs">{String(aiDetail)}</div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'holdings' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center px-2">
              <h3 className="text-lg font-semibold text-white flex items-center"><FileText className="w-5 h-5 mr-2 text-blue-400" /> 持股明細表</h3>
              <button onClick={() => fetchRealTimePrices(rawData, true)} className="text-xs flex items-center text-blue-400 hover:text-blue-300 transition-colors"><RefreshCw className={`w-3 h-3 mr-1 ${priceLoading ? 'animate-spin' : ''}`} />{priceLoading ? '更新中(強制)...' : '立即更新股價'}</button>
            </div>

            <div className="block md:hidden space-y-4">
              <div className="bg-slate-800 p-3 rounded-lg border border-slate-700 flex items-center space-x-2 overflow-x-auto">
                <span className="text-xs text-slate-400 whitespace-nowrap">排序依據:</span>
                {[ { id: 'manual', label: '自訂' }, { id: '類別', label: '類別' }, { id: 'buyPrice', label: '成本' }, { id: 'profitLoss', label: '損益' }, { id: 'roi', label: '報酬' } ].map(opt => (
                  <button key={opt.id} onClick={() => requestSort(opt.id)} className={`px-3 py-1 rounded text-xs border ${sortConfig.key === opt.id ? 'bg-blue-600 border-blue-500 text-white' : 'border-slate-600 text-slate-400'}`}>{opt.label} {sortConfig.key === opt.id && (sortConfig.direction === 'asc' ? '↑' : '↓')}</button>
                ))}
              </div>

              {sortedHoldings.map((row, index) => {
                const signal = aiSignals[row['標的']];
                const settings = investmentSettings[row['標的']] || { type: 'CORE', isDCA: false, addon: 'PYRAMID', addon2: 'NONE' };
                const classification = settings.type;
                const isDCA = settings.isDCA;
                const addonLogic = settings.addon;
                const addon2Logic = settings.addon2;
                
                const assetType = detectAssetType(row['標的'], row['名稱'], row['類別']);
                const isBondETF = assetType === 'BOND_ETF';
                const isBond = assetType === 'BOND';
                const isETF = assetType === 'ETF';

                const etfData = etfExtraData[row['標的']];
                let premDisc = null;
                if (etfData && etfData.nav) {
                    const price = row.isUS ? row.currentPriceRaw : row.currentPrice;
                    if (price) {
                       premDisc = (price - etfData.nav) / etfData.nav;
                    }
                }
                
                const yieldVal = etfData && etfData.yield ? (etfData.yield < 1 ? etfData.yield * 100 : etfData.yield) : null;

                return (
                <div key={row['標的']} className="bg-slate-800 p-4 rounded-xl border border-slate-700 shadow-md relative">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="flex items-center space-x-2">
                        {signal?.includes('ADD') && <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse mr-1" />}
                        {signal === 'REDUCE' && <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse mr-1" />}
                        {signal === 'HOLD' && <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse mr-1" />}
                        <span className="text-lg font-bold text-white">{row['標的']}</span>
                        <span className={`text-xs px-2 py-0.5 rounded ${CATEGORY_STYLES[row['類別']]?.badge || CATEGORY_STYLES['default'].badge}`}>{row['類別']}</span>
                        {premDisc !== null && (
                            <span className={`text-[10px] px-1.5 py-0.5 rounded border ${premDisc > 0 ? 'bg-red-900/30 text-red-300 border-red-500/30' : 'bg-green-900/30 text-green-300 border-green-500/30'}`}>
                                {premDisc > 0 ? '溢' : '折'} {Math.abs(premDisc * 100).toFixed(2)}%
                            </span>
                        )}
                      </div>
                      <div className="text-sm text-slate-400 mt-1">{row['名稱']}</div>
                      
                      <div className="mt-3 bg-slate-700/50 p-2 rounded-lg space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-slate-400">定位</span>
                            <select 
                                value={classification}
                                onChange={(e) => handleSettingChange(row['標的'], 'type', e.target.value)}
                                className={`text-xs px-2 py-0.5 rounded border focus:outline-none cursor-pointer bg-slate-800 ${ASSET_TYPES[classification].color} ${ASSET_TYPES[classification].border}`}
                                onClick={(e) => e.stopPropagation()}
                            >
                                <option value="CORE">核心</option>
                                <option value="SATELLITE">衛星</option>
                            </select>
                          </div>
                          <div className="flex items-center justify-between">
                             <span className="text-xs text-slate-400 flex items-center"><Repeat className="w-3 h-3 mr-1" />定期定額</span>
                             <button 
                                onClick={(e) => { e.stopPropagation(); handleSettingChange(row['標的'], 'isDCA', !isDCA); }}
                                className={`w-8 h-4 rounded-full transition-colors relative ${isDCA ? 'bg-green-500' : 'bg-slate-600'}`}
                             >
                                <div className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-transform ${isDCA ? 'translate-x-4' : 'translate-x-0'}`} />
                             </button>
                          </div>
                          <div className="flex flex-col space-y-1 mt-1 border-t border-slate-600/50 pt-1">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] text-slate-400 flex items-center"><Crosshair className="w-3 h-3 mr-1 text-blue-400" />加碼 1</span>
                                <select 
                                    value={addonLogic}
                                    onChange={(e) => handleSettingChange(row['標的'], 'addon', e.target.value)}
                                    className="text-[10px] px-2 py-0.5 rounded border border-slate-600 bg-slate-800 text-slate-300 focus:outline-none max-w-[100px]"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <option value="NONE">無 (None)</option>
                                    <option value="PYRAMID">跌幅金字塔</option>
                                    <option value="TECHNICAL">技術指標</option>
                                    <option value="YIELD_MACRO">殖利率/總經</option>
                                </select>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] text-slate-400 flex items-center"><PlusCircle className="w-3 h-3 mr-1 opacity-50" />加碼 2</span>
                                <select 
                                    value={addon2Logic}
                                    onChange={(e) => handleSettingChange(row['標的'], 'addon2', e.target.value)}
                                    className="text-[10px] px-2 py-0.5 rounded border border-slate-600 bg-slate-800 text-slate-300 focus:outline-none max-w-[100px]"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <option value="NONE">無 (None)</option>
                                    <option value="PYRAMID">跌幅金字塔</option>
                                    <option value="TECHNICAL">技術指標</option>
                                    <option value="YIELD_MACRO">殖利率/總經</option>
                                </select>
                              </div>
                          </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className={`text-lg font-bold ${(row.roi || 0) >= 0 ? 'text-red-500' : 'text-green-500'}`}>{formatPercent(row.roi)}</span>
                      <span className={`text-xs ${(row.profitLoss || 0) >= 0 ? 'text-red-400' : 'text-green-400'}`}>{(row.profitLoss || 0) > 0 ? '+' : ''}{formatCurrency(row.profitLoss)}</span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm mb-3 border-t border-slate-700/50 pt-3">
                    <div><span className="text-slate-500 block text-xs">現價</span><span className="text-white font-medium">{row.isUS ? '$' : ''}{formatPrice(row.currentPriceRaw || row.currentPrice)} <span className="text-[10px] text-slate-500 ml-1 block">{row.priceDate || ''}</span></span></div>
                    <div><span className="text-slate-500 block text-xs">成本</span><span className="text-slate-300">{row.isUS ? '$' : ''}{formatPrice(row.buyPriceRaw || row.buyPrice)}</span></div>
                    <div><span className="text-slate-500 block text-xs">市值</span><span className="text-white">{formatCurrency(row.marketValue)}</span></div>
                    <div><span className="text-slate-500 block text-xs">股數</span><span className="text-slate-300">{row.shares.toLocaleString()}</span></div>
                    
                    {(isETF || isBondETF) && (
                        <div className="col-span-2 flex justify-between bg-slate-700/30 p-2 rounded">
                            <span className="text-slate-400 text-xs">參考淨值</span>
                            <span className="text-slate-200 text-xs font-medium">
                                {etfData?.nav ? `${formatPrice(etfData.nav)} ${etfData.navSource ? `(${etfData.navSource})` : ''}` : '查無資料'}
                            </span>
                        </div>
                    )}
                    {(isBond || isBondETF) && (
                        <div className="col-span-2 flex justify-between bg-slate-700/30 p-2 rounded -mt-2">
                            <span className="text-slate-400 text-xs">參考殖利率</span>
                            <span className="text-slate-200 text-xs font-medium">
                                {yieldVal !== null ? `${yieldVal.toFixed(2)}% ${etfData?.yieldSource ? `(${etfData.yieldSource})` : ''}` : '查無資料'}
                            </span>
                        </div>
                    )}
                  </div>

                  <div className="flex justify-end space-x-2 pt-2 border-t border-slate-700/50">
                    <button onClick={(e) => { e.stopPropagation(); moveItem(row['標的'], -1); }} className="p-2 bg-slate-700 rounded hover:bg-slate-600 text-slate-300"><ArrowUp className="w-4 h-4" /></button>
                    <button onClick={(e) => { e.stopPropagation(); moveItem(row['標的'], 1); }} className="p-2 bg-slate-700 rounded hover:bg-slate-600 text-slate-300"><ArrowDown className="w-4 h-4" /></button>
                  </div>
                </div>
              )})}
            </div>

            <div className="hidden md:block bg-slate-800 rounded-xl border border-slate-700 shadow-lg"> 
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-700">
                  <thead className="bg-slate-900/50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider w-20">排序</th>
                      {[ { label: '標的代號', key: '標的' }, { label: '名稱/類別', key: '類別' }, { label: '參考淨值', key: 'nav' }, { label: '參考殖利率', key: 'yield' }, { label: '策略與設定', key: 'class' }, { label: '平均成本', key: 'buyPrice' }, { label: 'Yahoo即時價', key: 'currentPrice' }, { label: '總股數', key: 'shares' }, { label: '總損益 (淨)', key: 'profitLoss' }, { label: '報酬率 (淨)', key: 'roi' } ].map(header => (
                        <th key={header.key} onClick={() => header.key !== 'class' && header.key !== 'nav' && header.key !== 'yield' && requestSort(header.key)} className={`px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider ${header.key !== 'class' && header.key !== 'nav' && header.key !== 'yield' ? 'cursor-pointer hover:text-white' : ''} transition-colors group ${['標的', '類別', 'nav', 'yield', 'class'].includes(header.key) ? 'text-left' : 'text-right'}`}><div className={`flex items-center ${['標的', '類別', 'nav', 'yield', 'class'].includes(header.key) ? 'justify-start' : 'justify-end'}`}>{header.label}{header.key !== 'class' && header.key !== 'nav' && header.key !== 'yield' && <SortIcon columnKey={header.key} />}</div></th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-slate-800 divide-y divide-slate-700">
                    {sortedHoldings.map((row, index) => {
                      const signal = aiSignals[row['標的']];
                      const settings = investmentSettings[row['標的']] || { type: 'CORE', isDCA: false, addon: 'PYRAMID', addon2: 'NONE' };
                      const classification = settings.type;
                      const isDCA = settings.isDCA;
                      const addonLogic = settings.addon;
                      const addon2Logic = settings.addon2;
                      
                      const assetType = detectAssetType(row['標的'], row['名稱'], row['類別']);
                      const isBondETF = assetType === 'BOND_ETF';
                      const isBond = assetType === 'BOND';
                      const isETF = assetType === 'ETF';

                      const etfData = etfExtraData[row['標的']];
                      let premDisc = null;
                      if ((isETF || isBondETF) && etfData && etfData.nav && row.isRealData) {
                          const price = row.isUS ? row.currentPriceRaw : row.currentPrice;
                          premDisc = (price - etfData.nav) / etfData.nav;
                      }
                      const yieldVal = etfData && etfData.yield ? (etfData.yield < 1 ? etfData.yield * 100 : etfData.yield) : null;

                      return (
                      <tr key={row['標的']} className="hover:bg-slate-700/50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap"><div className="flex flex-col space-y-1">{index > 0 && <button onClick={(e) => { e.stopPropagation(); moveItem(row['標的'], -1); }} className="p-1 rounded hover:bg-slate-600 text-slate-400 hover:text-white"><ArrowUp className="w-3 h-3" /></button>}{index < sortedHoldings.length - 1 && <button onClick={(e) => { e.stopPropagation(); moveItem(row['標的'], 1); }} className="p-1 rounded hover:bg-slate-600 text-slate-400 hover:text-white"><ArrowDown className="w-3 h-3" /></button>}</div></td>
                        <td className="px-6 py-4 whitespace-nowrap text-left"><div className="text-sm text-white font-medium flex items-center">{signal?.includes('ADD') && <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse mr-2" title="AI建議: 加碼" />}{signal === 'REDUCE' && <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse mr-2" title="AI建議: 減碼" />}{signal === 'HOLD' && <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse mr-2" title="AI建議: 觀望" />}{row['標的']}{row.isRealData ? <Wifi className="w-3 h-3 ml-1 text-green-500" /> : row['類別'] !== '定存' && <WifiOff className="w-3 h-3 ml-1 text-slate-600" />}</div><div className="text-xs text-slate-500">最近交易: {row['日期']}</div></td>
                        <td className="px-6 py-4 whitespace-nowrap text-left">
                            <div className="text-sm text-slate-200">{row['名稱']}</div>
                            <div className="flex flex-wrap items-center gap-2 mt-1">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${CATEGORY_STYLES[row['類別']]?.badge || CATEGORY_STYLES['default'].badge}`}>{row['類別']}</span>
                            </div>
                        </td>
                        
                        <td className="px-6 py-4 whitespace-nowrap text-left">
                            { (isETF || isBondETF) ? (
                                etfData?.nav ? (
                                    <div className="flex flex-col">
                                        <span className="text-sm text-slate-300 font-medium">{formatPrice(etfData.nav)} <span className="text-[10px] text-slate-500">{etfData.navSource ? `(${etfData.navSource})` : ''}</span></span>
                                        {premDisc !== null && (
                                            <span className={`text-[10px] mt-0.5 ${premDisc > 0 ? 'text-red-400' : 'text-green-400'}`}>
                                                {premDisc > 0 ? '溢價' : '折價'} {Math.abs(premDisc * 100).toFixed(2)}%
                                            </span>
                                        )}
                                    </div>
                                ) : <span className="text-xs text-slate-500">查無資料</span>
                            ) : <span className="text-slate-600">-</span> }
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap text-left">
                            { (isBond || isBondETF) ? (
                                yieldVal !== null ? (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-900/30 text-purple-300 border border-purple-500/30" title={etfData.yieldSource}>
                                        {yieldVal.toFixed(2)}% <span className="ml-1 text-[8px] opacity-70">{etfData.yieldSource ? `(${etfData.yieldSource})` : ''}</span>
                                    </span>
                                ) : <span className="text-xs text-slate-500">查無資料</span>
                            ) : <span className="text-slate-600">-</span> }
                        </td>
                        
                        <td className="px-6 py-4 whitespace-nowrap text-left">
                          <div className="flex flex-col space-y-1">
                             <div className="flex items-center space-x-2">
                                <select 
                                  value={classification}
                                  onChange={(e) => handleSettingChange(row['標的'], 'type', e.target.value)}
                                  className={`text-[10px] px-2 py-0.5 rounded border focus:outline-none cursor-pointer bg-slate-800 ${ASSET_TYPES[classification].color} ${ASSET_TYPES[classification].border}`}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <option value="CORE">核心</option>
                                  <option value="SATELLITE">衛星</option>
                                </select>
                                <button 
                                    onClick={(e) => { e.stopPropagation(); handleSettingChange(row['標的'], 'isDCA', !isDCA); }}
                                    className={`px-2 py-0.5 rounded text-[10px] border transition-colors ${isDCA ? 'bg-green-900/50 border-green-500 text-green-400' : 'bg-slate-800 border-slate-600 text-slate-500'}`}
                                    title="定期定額開關"
                                >
                                    {isDCA ? 'DCA:ON' : 'DCA:OFF'}
                                </button>
                             </div>
                             <div className="flex items-center space-x-1 pt-1 border-t border-slate-700/50">
                                <span className="text-[10px] text-slate-500 w-8">加碼1:</span>
                                <select 
                                    value={addonLogic}
                                    onChange={(e) => handleSettingChange(row['標的'], 'addon', e.target.value)}
                                    className="text-[10px] px-1 py-0.5 rounded border border-slate-600 bg-slate-800 text-slate-300 focus:outline-none cursor-pointer hover:border-slate-500 flex-1"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <option value="NONE">無</option>
                                    <option value="PYRAMID">跌幅金字塔</option>
                                    <option value="TECHNICAL">技術指標</option>
                                    <option value="YIELD_MACRO">殖利率/總經</option>
                                </select>
                             </div>
                             <div className="flex items-center space-x-1">
                                <span className="text-[10px] text-slate-500 w-8">加碼2:</span>
                                <select 
                                    value={addon2Logic}
                                    onChange={(e) => handleSettingChange(row['標的'], 'addon2', e.target.value)}
                                    className="text-[10px] px-1 py-0.5 rounded border border-slate-600 bg-slate-800 text-slate-300 focus:outline-none cursor-pointer hover:border-slate-500 flex-1"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <option value="NONE">無</option>
                                    <option value="PYRAMID">跌幅金字塔</option>
                                    <option value="TECHNICAL">技術指標</option>
                                    <option value="YIELD_MACRO">殖利率/總經</option>
                                </select>
                             </div>
                          </div>
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-slate-300">{formatPrice(row.buyPriceRaw || row.buyPrice)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold text-yellow-400">
                            {formatPrice(row.currentPriceRaw || row.currentPrice)}
                            <div className="text-[10px] text-slate-500 font-normal">{row.priceDate || ''}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-slate-300">{row.shares.toLocaleString()}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold relative group">
                          <span className={`cursor-help border-b border-dotted ${(row.profitLoss || 0) >= 0 ? 'text-red-500 border-red-500' : 'text-green-500 border-green-500'}`}>{(row.profitLoss || 0) > 0 ? '+' : ''}{formatCurrency(row.profitLoss)}</span>
                          <div className={`absolute right-0 z-50 w-56 p-3 bg-slate-700 border border-slate-600 rounded-lg shadow-xl text-left pointer-events-none hidden group-hover:block ${index < 2 ? 'top-full mt-2' : 'bottom-full mb-2'}`}>
                            <div className="text-xs text-slate-400 mb-2 font-semibold border-b border-slate-600 pb-1">損益結構 (Net P/L)</div>
                            <div className="space-y-1">
                                <div className="flex justify-between text-xs"><span className="text-slate-300">總成本:</span><span className="text-white font-medium">{formatCurrency(row.costBasis)}</span></div>
                                <div className="flex justify-between text-xs"><span className="text-slate-300">總市值:</span><span className="text-yellow-400 font-medium">{formatCurrency(row.marketValue)}</span></div>
                                <div className="flex justify-between text-xs pt-1 border-t border-slate-600/50"><span className="text-slate-400">帳面損益:</span><span className={(row.grossProfit || 0) >= 0 ? 'text-red-300' : 'text-green-300'}>{formatCurrency(row.grossProfit)}</span></div>
                                <div className="flex justify-between text-xs"><span className="text-slate-400">預估手續費:</span><span className="text-slate-300">-{formatCurrency(row.estimateFee)}</span></div>
                                <div className="flex justify-between text-xs"><span className="text-slate-400">預估稅金:</span><span className="text-slate-300">-{formatCurrency(row.estimateTax)}</span></div>
                            </div>
                            <div className={`absolute right-4 border-4 border-transparent ${index < 2 ? 'bottom-full -mb-1 border-b-slate-600' : 'top-full -mt-1 border-t-slate-600'}`}></div>
                          </div>
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-right text-sm font-bold ${(row.roi || 0) >= 0 ? 'text-red-500' : 'text-green-500'}`}>{formatPercent(row.roi)}</td>
                      </tr>
                    )})}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'config' && (
          <div className="max-w-2xl mx-auto bg-slate-800 p-8 rounded-xl border border-slate-700 shadow-lg mb-20">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center"><Settings className="w-6 h-6 mr-3 text-blue-500" /> 資料來源設定</h2>
            <div className="space-y-4">
              <div><label className="block text-sm font-medium text-slate-300 mb-2">Google Sheets CSV 連結</label><div className="flex rounded-md shadow-sm"><input type="text" value={sheetUrl} onChange={(e) => setSheetUrl(e.target.value)} placeholder="https://docs.google.com/spreadsheets/d/.../pub?output=csv" className="flex-1 min-w-0 block w-full px-4 py-3 rounded-md bg-slate-900 border border-slate-600 text-white focus:ring-blue-500 focus:border-blue-500 sm:text-sm" /></div></div>
              
              <div className="pt-4 border-t border-slate-700">
                <h4 className="text-sm font-semibold text-slate-300 mb-4 flex items-center"><Calculator className="w-4 h-4 mr-2" /> 交易成本設定</h4>
                <div>
                   <label className="block text-xs text-slate-400 mb-1">手續費折扣 (例如 6折請輸入 0.6)</label>
                   <input type="number" step="0.01" min="0" max="1" value={feeDiscount} onChange={(e) => setFeeDiscount(parseFloat(e.target.value))} className="w-24 px-3 py-2 rounded-md bg-slate-900 border border-slate-600 text-white text-sm focus:ring-blue-500 focus:border-blue-500" />
                   <span className="text-xs text-slate-500 ml-2">目前設定: {feeDiscount === 1 ? '無折扣' : `${(feeDiscount * 10).toFixed(1)} 折`}</span>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-700">
                <label className="block text-sm font-medium text-slate-300 mb-2">Google Gemini API Key (AI 分析用)</label>
                <div className="flex gap-2">
                    <input type="password" value={geminiApiKey} onChange={(e) => setGeminiApiKey(e.target.value)} placeholder="請輸入 API Key (例如: AIzaSy...)" className="flex-1 min-w-0 block w-full px-4 py-3 rounded-md bg-slate-900 border border-slate-600 text-white focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                    <button onClick={handleSaveSettings} className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md text-sm font-medium transition-colors"><Save className="w-4 h-4 mr-1 inline" />儲存</button>
                </div>
                <p className="mt-2 text-xs text-slate-500">* 單機版需自行申請 API Key 才能使用 AI 功能。<a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-blue-400 hover:text-blue-300 ml-1 underline">前往申請</a></p>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-slate-300 mb-2">選擇 AI 模型</label>
                <div className="flex gap-2 items-center">
                  <Cpu className="w-5 h-5 text-slate-400" />
                  <select 
                    value={selectedModel} 
                    onChange={(e) => setSelectedModel(e.target.value)}
                    className="flex-1 px-4 py-2 rounded-md bg-slate-900 border border-slate-600 text-white focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  >
                    {AVAILABLE_MODELS.map(model => (
                      <option key={model.id} value={model.id}>{model.name}</option>
                    ))}
                  </select>
                </div>
                <p className="mt-1 text-xs text-slate-500 ml-7">* 預設使用 Flash 模型以節省額度，Pro 模型分析更精準但速度較慢。</p>
              </div>

              {error && <div className="p-3 bg-red-900/30 border border-red-500/50 text-red-300 rounded-md text-sm">{String(error)}</div>}
              <button onClick={handleFetchButton} disabled={loading} className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 focus:ring-offset-slate-800 transition-colors ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}>{loading ? '資料載入中...' : '匯入並更新股價'}</button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;