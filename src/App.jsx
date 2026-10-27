import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip as RechartsTooltip, Legend, ResponsiveContainer
} from 'recharts';
import { 
  PieChart as PieIcon, ArrowUpCircle, ArrowDownCircle, RefreshCw, Settings, 
  TrendingUp, DollarSign, Briefcase, FileText, AlertCircle, BarChart2, 
  Loader2, Wifi, WifiOff, LineChart as LineIcon, Info, AlertTriangle, 
  ArrowUp, ArrowDown, ArrowUpDown, Move, Sparkles, Bot, ChevronDown, ChevronUp, 
  FileSearch, Save, Key, Cpu, Calculator, Globe, CheckCircle, Database, 
  BrainCircuit, Lock, MessageSquare, Send, Target, Clock, Activity, 
  ClipboardCheck, ShieldAlert, Crosshair, Repeat, BarChart4, TrendingDown, 
  Percent, Layers, Link as LinkIcon, XCircle, PlusCircle, Trash2, Edit, Cloud
} from 'lucide-react';

/**
 * Alpha 投資戰情室 v56.04 (投資策略與設定雲端雙向同步完整版)
 */

const DEMO_DATA = [
  { 日期: '2015-01-15', 標的: '2330.TW', 名稱: '台積電', 類別: '股票', 價格: 140, 股數: 1000, 策略: '基礎買入', 金額: 140000, 自動分析: 'ON' },
  { 日期: '2020-03-20', 標的: '2330.TW', 名稱: '台積電', 類別: '股票', 價格: 270, 股數: 500, 策略: '金字塔_S1', 金額: 135000, 自動分析: 'ON' },
  { 日期: '2018-02-20', 標的: '0050.TW', 名稱: '元大台灣50', 類別: '股票', 價格: 80, 股數: 2000, 策略: '基礎買入', 金額: 160000, 自動分析: 'ON' },
  { 日期: '2021-03-10', 標的: '00679B.TWO', 名稱: '元大美債20年', 類別: '債券', 價格: 30, 股數: 1000, 策略: '基礎買入', 金額: 30000, 自動分析: 'ON' }
];

const COLORS = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#6366F1'];

const STRATEGY_CONFIG = {
  '基礎買入': { color: '#EF4444', label: '基礎買入', shape: 'circle' },
  '金字塔_S1': { color: '#F97316', label: '金字塔_S1', shape: 'triangle' },
  '金字塔_S2': { color: '#EAB308', label: '金字塔_S2', shape: 'triangle' },
  '金字塔_S3': { color: '#84CC16', label: '金字塔_S3', shape: 'triangle' },
  'K值超賣': { color: '#3B82F6', label: 'K值超賣', shape: 'diamond' },
  'MA60有撐': { color: '#8B5CF6', label: 'MA60有撐', shape: 'star' },
  'MA120有撐': { color: '#06B6D4', label: 'MA120有撐', shape: 'square' },
  'default': { color: '#64748B', label: '其他策略', shape: 'cross' }
};

const CATEGORY_STYLES = {
  '股票': { color: '#3B82F6', badge: 'bg-blue-900 text-blue-200' },        
  '債券': { color: '#A855F7', badge: 'bg-purple-900 text-purple-200' },    
  '定存': { color: '#22C55E', badge: 'bg-green-900 text-green-200' },      
  'default': { color: '#64748B', badge: 'bg-slate-700 text-slate-300' }    
};

const AVAILABLE_MODELS = [
  { id: 'gemini-3.8-flash', name: 'Gemini 3.8 Flash (最新穩定版)' },
  { id: 'gemini-3.6-flash', name: 'Gemini 3.6 Flash (穩定)' },
  { id: 'gemini-3.5-flash-lite', name: 'Gemini 3.5 Flash-Lite (快速穩定)' },
];

const ASSET_TYPES = {
  'CORE': { label: '核心資產', color: 'text-blue-300', bg: 'bg-blue-900/50', border: 'border-blue-500/50' },
  'SATELLITE': { label: '衛星資產', color: 'text-orange-300', bg: 'bg-orange-900/50', border: 'border-orange-500/50' }
};

const CARD_STYLES = {
  active: 'border-blue-500 bg-slate-800 text-white shadow-md',
  inactive: 'border-slate-700 bg-slate-800/60 text-slate-300 hover:bg-slate-700'
};

const Card = ({ children, title, className = "", noPadding = false }) => (
  <div className={`border border-slate-700 bg-slate-800 rounded-xl flex flex-col shadow-lg overflow-hidden ${className}`}>
    {title && (
      <div className="border-b border-slate-700 bg-slate-900/50 px-3 py-2 text-sm font-semibold text-slate-200 text-center flex-none">
        {title}
      </div>
    )}
    <div className={`flex-1 relative flex flex-col ${noPadding ? '' : 'p-3'}`}>
      {children}
    </div>
  </div>
);

const TextRow = ({ label, value, valueColor = "text-white" }) => (
  <div className="flex justify-between items-center py-0.5 text-xs">
    <span className="text-slate-400">{label}</span>
    <span className={`font-mono ${valueColor}`}>{value}</span>
  </div>
);

const IndicatorDot = ({ color }) => {
  const colorMap = {
    green: "bg-green-500 shadow-[0_0_8px_#22c55e]",
    red: "bg-red-500 shadow-[0_0_8px_#ef4444]",
    yellow: "bg-yellow-500 shadow-[0_0_8px_#eab308]",
    gray: "bg-slate-600"
  };
  return <div className={`w-3 h-3 md:w-4 md:h-4 rounded-full ${colorMap[color]}`}></div>;
};

const formatCurrency = (value) => new Intl.NumberFormat('zh-TW', { style: 'currency', currency: 'TWD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value || 0);
const formatPercent = (value) => `${((value || 0) * 100).toFixed(2)}%`;
const formatPrice = (value) => {
  if (typeof value === 'number') return value.toFixed(2);
  if (Array.isArray(value)) return value.map(v => typeof v === 'number' ? v.toFixed(2) : String(v)).join(' - ');
  if (typeof value === 'object' && value !== null) return ''; 
  return value ? String(value) : '0.00';
};

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

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const getTaipeiTime = () => {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Taipei', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', hour12: false }).formatToParts(new Date());
    let hash = {};
    parts.forEach(p => { hash[p.type] = p.value; });
    return { y: parseInt(hash.year), m: parseInt(hash.month), d: parseInt(hash.day), h: parseInt(hash.hour) % 24, min: parseInt(hash.minute) };
};

const getTodayDate = () => {
    let { y, m, d, h } = getTaipeiTime();
    if (h < 9) {
        const tempDate = new Date(y, m - 1, d - 1);
        y = tempDate.getFullYear(); m = tempDate.getMonth() + 1; d = tempDate.getDate();
    }
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
};

const isTaiwanTradingHours = () => {
    const { h, min } = getTaipeiTime();
    const now = new Date();
    const day = now.getDay(); 
    if (day >= 1 && day <= 5) {
        const currentMinutes = h * 60 + min;
        return currentMinutes >= 540 && currentMinutes <= 825; 
    }
    return false;
};

const getPureCode = (symbol) => {
    if (!symbol) return '';
    return String(symbol).toUpperCase().replace(/\.TWO$|\.TW$/i, '').trim();
};

const renderShape = (shape, cx, cy, color, size = 5) => {
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

const withTimer = async (name, promiseFn) => {
    const start = performance.now();
    try {
        return await promiseFn();
    } finally {
        console.log(`[Timer] ${name} 耗時: ${(performance.now() - start).toFixed(2)} ms`);
    }
};

const smartFetch = async (targetUrl, returnType = 'json', timeoutMs = 4500, parentSignal = null) => {
    if (parentSignal?.aborted) throw new Error('AbortError: 手動中止');
    const isYahoo = targetUrl.includes('yahoo.com');
    const bypassUrl = targetUrl + (targetUrl.includes('?') ? '&' : '?') + `_t=${Date.now()}`;

    try {
        const controller = new AbortController();
        const tid = setTimeout(() => controller.abort(), 1500); 
        let abortHandler;
        if (parentSignal) {
            abortHandler = () => controller.abort();
            parentSignal.addEventListener('abort', abortHandler);
        }
        
        const res = await fetch(bypassUrl, {
            method: 'GET', credentials: 'omit', cache: 'no-store',
            headers: isYahoo ? { 'Accept': '*/*' } : undefined,
            signal: controller.signal
        });
        const text = await res.text(); 
        clearTimeout(tid); 
        if (parentSignal && abortHandler) parentSignal.removeEventListener('abort', abortHandler);
        
        if (res.ok && !text.trim().toLowerCase().startsWith('<html')) {
            return returnType === 'json' ? JSON.parse(text) : text;
        }
    } catch(e) {
        if (parentSignal?.aborted) throw new Error('AbortError: 手動中止');
    }

    const encodedUrl = encodeURIComponent(bypassUrl);
    const proxyCb = `__pcb=${Date.now()}`;
    let proxies = [
        { name: 'cors.lol', url: `https://api.cors.lol/?url=${encodedUrl}`, type: 'raw' },
        { name: 'codetabs', url: `https://api.codetabs.com/v1/proxy?quest=${encodedUrl}&${proxyCb}`, type: 'raw' },
        { name: 'allorigins-raw', url: `https://api.allorigins.win/raw?url=${encodedUrl}&disableCache=true&${proxyCb}`, type: 'raw' }
    ];

    try {
        const customProxy = localStorage.getItem('custom_proxy_url');
        if (customProxy && customProxy.trim() !== '') {
            let pUrl = customProxy.trim();
            const finalUrl = pUrl.includes('?') ? (pUrl.endsWith('=') ? pUrl + encodedUrl : pUrl + '&url=' + encodedUrl) : pUrl + '?url=' + encodedUrl;
            proxies.unshift({ name: '自訂 Proxy', url: finalUrl, type: 'raw' });
        }
    } catch(e) {}

    for (const proxy of proxies) {
        if (parentSignal?.aborted) throw new Error('AbortError: 手動中止');
        try {
            const controller = new AbortController();
            const tid = setTimeout(() => controller.abort(), timeoutMs);
            const res = await fetch(proxy.url, { method: 'GET', credentials: 'omit', cache: 'no-store', signal: controller.signal });
            const text = await res.text(); 
            clearTimeout(tid);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return returnType === 'json' ? JSON.parse(text) : text;
        } catch (e) {
            if (parentSignal?.aborted) throw new Error('AbortError: 手動中止');
        }
    }
    return null;
};

const fetchOfficialDataWithDegradation = async (url, parentSignal = null) => {
    if (parentSignal?.aborted) throw new Error('AbortError: 手動中止');
    const isHugeFile = url.includes('STOCK_DAY_ALL') || url.includes('tpex_mainboard_quotes');
    try {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), 2000); 
        const res = await fetch(`${url}?_t=${Date.now()}`, { method: 'GET', credentials: 'omit', cache: 'no-store', signal: controller.signal });
        const text = await res.text();
        clearTimeout(id);
        if (res.ok && !text.trim().toLowerCase().startsWith('<html')) {
             try { return JSON.parse(text); } catch(e) {}
        }
    } catch(e) {}
    if (isHugeFile) return null;
    return await smartFetch(url, 'json', 4500, parentSignal); 
};

const fetchTradingEconomicsYields = async (parentSignal = null) => {
    try {
        const html = await smartFetch('https://tradingeconomics.com/united-states/government-bond-yield', 'text', 6000, parentSignal);
        if (typeof html !== 'string') return {};
        const extractYield = (code) => {
            const regex = new RegExp(`data-symbol="${code}"[\\s\\S]*?id="p"[^>]*>([\\d.]+)`, 'i');
            const match = html.match(regex);
            return match ? parseFloat(match[1]) : null;
        };
        return { '10Y': extractYield('USGG10YR:IND'), '20Y': extractYield('USGG20YR:IND'), '30Y': extractYield('USGG30YR:IND') };
    } catch (e) { return {}; }
};

const calculateSMA = (data, period) => data.map((item, index, arr) => { if (index < period - 1) return { ...item, [`MA${period}`]: null }; const slice = arr.slice(index - period + 1, index + 1); return { ...item, [`MA${period}`]: slice.reduce((acc, curr) => acc + (curr.close || 0), 0) / period }; });
const calculateEMA = (data, period, key = 'close') => { const k = 2 / (period + 1); let emaArray = new Array(data.length).fill(null); let firstValidIdx = -1; for(let i=0; i<data.length; i++) { if (data[i][key] !== null && data[i][key] !== undefined) { firstValidIdx = i; break; } } if (firstValidIdx === -1 || (data.length - firstValidIdx) < period) return emaArray; let sum = 0; for (let i = 0; i < period; i++) { sum += data[firstValidIdx + i][key]; } emaArray[firstValidIdx + period - 1] = sum / period; for (let i = firstValidIdx + period; i < data.length; i++) { const val = data[i][key]; const prevEma = emaArray[i - 1]; if (val !== null && prevEma !== null) { emaArray[i] = (val - prevEma) * k + prevEma; } } return emaArray; };
const calculateRSI = (data, period) => { let rsiArray = new Array(data.length).fill(null); if (data.length < period + 1) return rsiArray; let changes = []; for (let i = 1; i < data.length; i++) { changes.push(data[i].close - data[i-1].close); } let gains = 0; let losses = 0; for (let i = 0; i < period; i++) { if (changes[i] > 0) gains += changes[i]; else losses += Math.abs(changes[i]); } let avgGain = gains / period; let avgLoss = losses / period; rsiArray[period] = 100 - (100 / (1 + (avgGain / (avgLoss === 0 ? 1 : avgLoss)))); for (let i = period + 1; i < data.length; i++) { const change = changes[i-1]; const gain = change > 0 ? change : 0; const loss = change < 0 ? Math.abs(change) : 0; avgGain = ((avgGain * (period - 1)) + gain) / period; avgLoss = ((avgLoss * (period - 1)) + loss) / period; rsiArray[i] = 100 - (100 / (1 + (avgGain / (avgLoss === 0 ? 1 : avgLoss)))); } return rsiArray; };
const calculateBollingerBands = (data, period = 20, multiplier = 2) => { const sma = calculateSMA(data, period); return data.map((item, i) => { if (i < period - 1) return { ...item, BBU: null, BBL: null, BBM: null }; const slice = data.slice(i - period + 1, i + 1); const mean = sma[i][`MA${period}`]; const variance = slice.map(d => Math.pow(d.close - mean, 2)).reduce((a, b) => a + b, 0) / period; const stdDev = Math.sqrt(variance); return { ...item, BBM: mean, BBU: mean + (multiplier * stdDev), BBL: mean - (multiplier * stdDev) }; }); };
const calculateKD = (data, period = 9) => { let k = 50; let d = 50; return data.map((item, index, arr) => { if (index < period - 1) return { ...item, K: null, D: null }; const slice = arr.slice(index - period + 1, index + 1); const highestHigh = Math.max(...slice.map(d => d.high)); const lowestLow = Math.min(...slice.map(d => d.low)); let rsv = 50; if (highestHigh !== lowestLow) { rsv = ((item.close - lowestLow) / (highestHigh - lowestLow)) * 100; } k = (2/3) * k + (1/3) * rsv; d = (2/3) * d + (1/3) * k; return { ...item, K: k, D: d }; }); };
const calculateMACD = (data) => { const ema12 = calculateEMA(data, 12, 'close'); const ema26 = calculateEMA(data, 26, 'close'); const difArray = data.map((d, i) => ({ ...d, DIF: (ema12[i] === null || ema26[i] === null) ? null : ema12[i] - ema26[i] })); const signalArray = calculateEMA(difArray, 9, 'DIF'); return difArray.map((d, i) => ({ ...d, Signal: signalArray[i], OSC: (d.DIF !== null && signalArray[i] !== null) ? d.DIF - signalArray[i] : null })); };
const processTechnicalData = (rawData) => { 
  if (!rawData || rawData.length === 0) return []; 
  let d = calculateSMA(rawData, 5); 
  d = calculateSMA(d, 20); 
  d = calculateSMA(d, 60); 
  d = calculateSMA(d, 120); 
  d = calculateKD(d, 9); 
  d = calculateMACD(d); 
  const rsi6 = calculateRSI(d, 6); 
  const rsi12 = calculateRSI(d, 12); 
  const rsi14 = calculateRSI(d, 14);
  const bbData = calculateBollingerBands(d, 20, 2); 
  return d.map((item, i) => ({ ...item, ...bbData[i], RSI6: rsi6[i], RSI12: rsi12[i], RSI14: rsi14[i], BB_Range: [bbData[i].BBL, bbData[i].BBU] })); 
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
  if (!message) return null;
  return (<div className="fixed bottom-20 md:bottom-10 left-1/2 transform -translate-x-1/2 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg flex items-center z-[100] animate-fade-in-up"><CheckCircle className="w-5 h-5 mr-2" /><span>{String(message)}</span></div>);
};

const App = () => {
  const [sheetUrl, setSheetUrl] = useState('');
  const [gasUrl, setGasUrl] = useState('');
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
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState(null); 
  const [timeframe, setTimeframe] = useState('1y_1d'); 
  const [isLastTradingDay, setIsLastTradingDay] = useState(false);
  const [twseHolidays, setTwseHolidays] = useState(['20240228', '20250228', '20260227', '20260403', '20260406', '20260501', '20261231']); 
    
  const [sortConfig, setSortConfig] = useState({ key: 'manual', direction: 'asc' });
  const [customOrder, setCustomOrder] = useState([]);

  const [aiSummary, setAiSummary] = useState(null);
  const [aiDetail, setAiDetail] = useState(null);
  const [isAiSummarizing, setIsAiSummarizing] = useState(false);
  const [aiProgressMsg, setAiProgressMsg] = useState(''); 
  const [isDetailExpanded, setIsDetailExpanded] = useState(false);
  const [usedModel, setUsedModel] = useState(null); 
  const [isCachedResult, setIsCachedResult] = useState(false); 
  const [selectedModel, setSelectedModel] = useState('gemini-3.8-flash'); 
  const [analysisMode, setAnalysisMode] = useState('comprehensive'); 
  const [aiSignals, setAiSignals] = useState({}); 
  const [cloudReports, setCloudReports] = useState({}); 

  const [portfolioHealth, setPortfolioHealth] = useState(null);
  const [isHealthChecking, setIsHealthChecking] = useState(false);
  const [investmentSettings, setInvestmentSettings] = useState({}); 
  const [autoSettings, setAutoSettings] = useState({}); 
  const [assetClassifications, setAssetClassifications] = useState({});

  const [chatMessages, setChatMessages] = useState([{ role: 'assistant', content: '您好！我是您的 AI 投資助理。請試著問我：「核心資產績效如何？」' }]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatEndRef = useRef(null);
  const [feeDiscount, setFeeDiscount] = useState(1); 
  const [toast, setToast] = useState(null);
  const [appLogs, setAppLogs] = useState([]); 
  const [customProxyUrl, setCustomProxyUrl] = useState(''); 

  const [showManualPatch, setShowManualPatch] = useState(false);
  const [patchDate, setPatchDate] = useState('');
  const [patchPrice, setPatchPrice] = useState('');
  const [patchOpen, setPatchOpen] = useState('');
  const [patchHigh, setPatchHigh] = useState('');
  const [patchLow, setPatchLow] = useState('');
  const [patchVolume, setPatchVolume] = useState('');
  const [manualKLinesState, setManualKLinesState] = useState({});
  
  const [zoom, setZoom] = useState({ endIndex: null, count: 80 }); 
  const [activeSubChart, setActiveSubChart] = useState('MACD'); 
  const [hoverIndex, setHoverIndex] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const svgRef = useRef(null);
  const touchRef = useRef({ startX: 0, startDist: 0, isPinching: false, isPanning: false });

  const globalAbortRef = useRef(null);
  const logsContainerRef = useRef(null);
  const activeHistorySymbolRef = useRef(null); 
  const fetchingHistoryRef = useRef({});
  const aiAbortControllerRef = useRef(null); 
  const cloudReportsRef = useRef({});

  useEffect(() => {
    cloudReportsRef.current = cloudReports;
  }, [cloudReports]);

  const isUiLocked = historyLoading || isAiSummarizing;

  const loadCloudReportsFromSheet = async (targetGasUrl) => {
    if (!targetGasUrl) return;
    try {
      const url = targetGasUrl.includes('?') ? `${targetGasUrl}&action=GET_REPORTS` : `${targetGasUrl}?action=GET_REPORTS`;
      const res = await fetch(url);
      const json = await res.json();
      if (json.status === "success" && Array.isArray(json.rows)) {
        const reportsMap = {};
        const signalsMap = {};
        json.rows.slice(1).forEach(row => {
          const time = row[0];
          const symbol = String(row[1] || "").trim();
          const signal = row[3];
          const summary = row[4];
          const detail = row[5];
          if (symbol) {
            reportsMap[symbol] = { time, symbol, signal, summary, detail };
            reportsMap[symbol.toUpperCase().replace(/\.TWO$|\.TW$/i, '')] = reportsMap[symbol];
            if (signal) signalsMap[symbol] = signal;
          }
        });
        setCloudReports(reportsMap);
        setAiSignals(signalsMap);

        if (json.settings) {
          setInvestmentSettings(json.settings);
          localStorage.setItem('investment_settings', JSON.stringify(json.settings));
          const flatClass = {}; 
          Object.keys(json.settings).forEach(key => { flatClass[key] = json.settings[key].type; }); 
          setAssetClassifications(flatClass);
        }

        if (selectedHistorySymbol && reportsMap[selectedHistorySymbol]) {
          const r = reportsMap[selectedHistorySymbol];
          setAiSummary(r.summary);
          setAiDetail(r.detail);
          setIsCachedResult(true);
        }
      }
    } catch (e) {
      console.error("讀取雲端報告失敗:", e);
    }
  };

  const syncSettingsToCloud = async (newSettings) => {
    if (!gasUrl) return;
    try {
      const url = gasUrl.includes('?') ? `${gasUrl}&action=SAVE_SETTINGS&settings=${encodeURIComponent(JSON.stringify(newSettings))}` : `${gasUrl}?action=SAVE_SETTINGS&settings=${encodeURIComponent(JSON.stringify(newSettings))}`;
      await fetch(url);
      setToast("✅ 投資策略與設定已同步至雲端表單！");
    } catch (e) {
      console.error("同步設定至雲端失敗:", e);
    }
  };

  const saveReportToCloud = async (symbol, name, signal, summary, detail) => {
    if (!gasUrl) return;
    try {
      const timeStr = new Intl.DateTimeFormat('zh-TW', { timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(new Date()).replace(/\//g, '-');
      const url = gasUrl.includes('?') ? 
        `${gasUrl}&action=SAVE_REPORT&symbol=${encodeURIComponent(symbol)}&name=${encodeURIComponent(name)}&signal=${encodeURIComponent(signal)}&summary=${encodeURIComponent(summary)}&detail=${encodeURIComponent(detail)}&time=${encodeURIComponent(timeStr)}` : 
        `${gasUrl}?action=SAVE_REPORT&symbol=${encodeURIComponent(symbol)}&name=${encodeURIComponent(name)}&signal=${encodeURIComponent(signal)}&summary=${encodeURIComponent(summary)}&detail=${encodeURIComponent(detail)}&time=${encodeURIComponent(timeStr)}`;
      
      await fetch(url);
      setCloudReports(prev => ({ ...prev, [symbol]: { time: timeStr, symbol, signal, summary, detail } }));
      setToast(`✅ ${symbol} 分析結果已同步至雲端表單！`);
    } catch (e) {
      console.error("同步至表單失敗:", e);
      setToast(`❌ 同步至表單失敗: ${e.message}`);
    }
  };

  const updateAutoSettingToCloud = async (symbol, val) => {
    setAutoSettings(prev => ({ ...prev, [symbol]: val }));
    if (!gasUrl) return;
    try {
      const url = gasUrl.includes('?') ? `${gasUrl}&action=UPDATE_AUTO_SETTING&symbol=${encodeURIComponent(symbol)}&autoAnalyze=${val}` : `${gasUrl}?action=UPDATE_AUTO_SETTING&symbol=${encodeURIComponent(symbol)}&autoAnalyze=${val}`;
      await fetch(url);
      setToast(`✅ ${symbol} 自動分析已設為 ${val ? 'ON' : 'OFF'} 並同步！`);
    } catch (e) {
      console.error("更新自動分析設定失敗:", e);
    }
  };

  useEffect(() => {
    const originalLog = console.log; const originalWarn = console.warn; const originalError = console.error;
    const handleLog = (level, originalFn, ...args) => {
      const msg = args.map(a => {
        if (a instanceof Error) return a.message;
        if (typeof a === 'object') { try { return JSON.stringify(a); } catch(e) { return String(a); } }
        return String(a);
      }).join(' ');
      if (level === 'warn' && msg.includes('of chart should be greater than 0')) return;
      originalFn(...args); 
      setAppLogs(prev => [...prev, { time: new Date().toLocaleTimeString('zh-TW', { hour12: false }), level, msg }].slice(-200));
    };
    console.log = (...args) => handleLog('info', originalLog, ...args);
    console.warn = (...args) => handleLog('warn', originalWarn, ...args);
    console.error = (...args) => handleLog('error', originalError, ...args);
    return () => { console.log = originalLog; console.warn = originalWarn; console.error = originalError; };
  }, []);

  useEffect(() => {
    if (logsContainerRef.current) logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight;
  }, [appLogs]);

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
    return Object.keys(group).map(key => { const pct = total > 0 ? (group[key] / total) : 0; return { name: key, value: group[key], percentage: pct, percent: pct }; });
  }, [portfolioData]);

  const aggregatedHoldings = useMemo(() => {
    const map = new Map();
    portfolioData.forEach(item => {
      const key = item['標的'];
      if (!map.has(key)) { map.set(key, { ...item, shares: 0, costBasis: 0, costBasisRaw: 0, marketValue: 0, profitLoss: 0, grossProfit: 0, estimateFee: 0, estimateTax: 0, dates: new Set(), isUS: item.isUS }); }
      const entry = map.get(key);
      entry.shares += item.shares; entry.costBasis += item.costBasis; entry.marketValue += item.marketValue; 
      entry.costBasisRaw += (item.buyPriceRaw * item.shares); entry.profitLoss += item.profitLoss; 
      entry.grossProfit += item.grossProfit;
      entry.estimateFee += item.estimateFee; entry.estimateTax += item.estimateTax; entry.dates.add(item['日期']);
      if (item.currentPrice !== item.buyPrice) entry.currentPrice = item.currentPrice;
      if (item.currentPriceRaw) entry.currentPriceRaw = item.currentPriceRaw; 
    });
    return Array.from(map.values()).map(item => {
      const roi = item.costBasis > 0 ? item.profitLoss / item.costBasis : 0;
      const sortedDates = Array.from(item.dates).sort((a, b) => new Date(a) - new Date(b));
      const latestDate = sortedDates[sortedDates.length - 1];
      const avgPriceTwd = item.shares > 0 ? item.costBasis / item.shares : 0;
      const avgPriceRaw = item.shares > 0 ? item.costBasisRaw / item.shares : 0;
      return { ...item, buyPrice: item.isUS ? avgPriceRaw : avgPriceTwd, currentPrice: item.isUS ? item.currentPriceRaw : item.currentPrice, buyPriceRaw: avgPriceRaw, currentPriceRaw: item.currentPriceRaw, roi, '日期': latestDate };
    });
  }, [portfolioData]);

  const sortedHoldings = useMemo(() => {
    let sortableItems = [...aggregatedHoldings];
    if (sortConfig.key === 'manual') {
       sortableItems.sort((a, b) => {
         const idxA = customOrder.indexOf(a['標的']); const idxB = customOrder.indexOf(b['標的']);
         return (idxA === -1 ? 9999 : idxA) - (idxB === -1 ? 9999 : idxB);
       });
    } else if (sortConfig.key !== null) {
      sortableItems.sort((a, b) => {
        let aValue = a[sortConfig.key]; let bValue = b[sortConfig.key];
        if (sortConfig.key === '標的') aValue = a['標的']; 
        if (sortConfig.key === '類別') aValue = a['類別'];
        if (['buyPrice', 'currentPrice', 'shares', 'profitLoss', 'roi', 'marketValue', 'costBasis'].includes(sortConfig.key)) {
            const numA = typeof aValue === 'number' ? aValue : (Number(aValue) || 0);
            const numB = typeof bValue === 'number' ? bValue : (Number(bValue) || 0);
            return sortConfig.direction === 'asc' ? numA - numB : numB - numA;
        } else {
            if (aValue === undefined || aValue === null) aValue = ''; if (bValue === undefined || bValue === null) bValue = '';
            if (typeof aValue === 'string' && typeof bValue === 'string') { aValue = aValue.toLowerCase(); bValue = bValue.toLowerCase(); }
            if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        }
      });
    }
    return sortableItems;
  }, [aggregatedHoldings, sortConfig, customOrder]);

  const tradableSymbols = useMemo(() => sortedHoldings.filter(h => h['類別'] !== '定存'), [sortedHoldings]);

  const prevSortRef = useRef(sortConfig);
  const prevOrderRef = useRef(customOrder);
  const prevDataHashRef = useRef('');
  
  useEffect(() => {
    const currentDataHash = tradableSymbols.map(t => t['標的']).join(',');
    const isSymbolValid = tradableSymbols.some(t => t['標的'] === selectedHistorySymbol);

    if (prevSortRef.current !== sortConfig || prevOrderRef.current !== customOrder) {
      if (tradableSymbols.length > 0 && (!selectedHistorySymbol || !isSymbolValid)) {
          setSelectedHistorySymbol(tradableSymbols[0]['標的']);
          setTimeframe('1y_1d'); 
      }
      prevSortRef.current = sortConfig; prevOrderRef.current = customOrder;
    } else if (prevDataHashRef.current !== currentDataHash) {
      if (tradableSymbols.length > 0 && (!selectedHistorySymbol || !isSymbolValid)) {
          setSelectedHistorySymbol(tradableSymbols[0]['標的']);
          setTimeframe('1y_1d'); 
      } else if (tradableSymbols.length === 0) {
          setSelectedHistorySymbol(null);
      }
    }
    prevDataHashRef.current = currentDataHash;
  }, [sortConfig, customOrder, tradableSymbols, selectedHistorySymbol]);
  
  useEffect(() => {
    setZoom({ endIndex: null, count: timeframe === '1y_1d' ? 80 : 120 });
    setHoverIndex(null);
  }, [selectedHistorySymbol, timeframe]);
   
  const currentChartData = useMemo(() => {
    const baseData = historicalData[`${selectedHistorySymbol}_${timeframe}`];
    if (!baseData || !selectedHistorySymbol) return [];
    
    let merged = [...baseData];
    const currentPrice = realTimePrices[selectedHistorySymbol];
    const extraData = etfExtraData[selectedHistorySymbol];
    
    if (currentPrice && merged.length > 0) {
        let latestDateStr = getTodayDate(); 
        if (extraData && extraData.dateStr) {
            const dStr = extraData.dateStr.split(' ')[0]; const parts = dStr.split('/'); const today = new Date();
            if (parts.length === 2) { latestDateStr = `${today.getFullYear()}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
            } else if (parts.length === 3) {
                let year = parseInt(parts[0]); if (year < 1911) year += 1911; 
                latestDateStr = `${year}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
            }
        }
        
        const [y, m, d] = latestDateStr.split('-');
        let patchDateObj = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
        const isTwAsset = selectedHistorySymbol?.includes('.TW') || selectedHistorySymbol?.includes('.TWO');

        while (true) {
            const dayOfWeek = patchDateObj.getDay();
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
            const formattedDateStr = `${patchDateObj.getFullYear()}${String(patchDateObj.getMonth() + 1).padStart(2, '0')}${String(patchDateObj.getDate()).padStart(2, '0')}`;
            const isHoliday = isTwAsset && twseHolidays.includes(formattedDateStr);
            if (isWeekend || isHoliday) { patchDateObj.setDate(patchDateObj.getDate() - 1); } else { break; }
        }

        const formatY = patchDateObj.getFullYear(); const formatM = String(patchDateObj.getMonth() + 1).padStart(2, '0'); const formatD = String(patchDateObj.getDate()).padStart(2, '0');
        latestDateStr = `${formatY}-${formatM}-${formatD}`;
        
        const lastPoint = merged[merged.length - 1];
        if (lastPoint.date < latestDateStr) { 
             merged.push({ 
                ...lastPoint, date: latestDateStr, 
                close: currentPrice, open: currentPrice, high: currentPrice, low: currentPrice, volume: 0, 
                isPatched: true, ts: patchDateObj.getTime()
             });
        } else if (lastPoint.date === latestDateStr && !lastPoint.isManual) { 
             merged[merged.length - 1] = { 
                ...lastPoint, close: currentPrice, 
                high: Math.max(lastPoint.high, currentPrice), 
                low: Math.min(lastPoint.low, currentPrice) 
             }; 
        }
    }

    const buys = portfolioData.filter(p => p['標的'] === selectedHistorySymbol);
    buys.forEach(buy => {
        const rawDate = (buy['日期'] || '').toString().trim().replace(/\//g, '-');
        let closestIdx = merged.findIndex(pt => pt.date === rawDate);
        if (closestIdx === -1) {
            const buyDateTs = new Date(rawDate).getTime();
            if (!isNaN(buyDateTs)) {
                let minDiff = Infinity;
                merged.forEach((pt, i) => { const diff = Math.abs(buyDateTs - new Date(pt.date).getTime()); if (diff < minDiff && diff < 604800000) { minDiff = diff; closestIdx = i; } });
            }
        }
        if (closestIdx !== -1) { merged[closestIdx] = { ...merged[closestIdx], buyPricePoint: buy['價格'], buyAction: buy }; }
    });
    return merged;
  }, [historicalData, selectedHistorySymbol, timeframe, portfolioData, realTimePrices, etfExtraData, twseHolidays]);

  useEffect(() => {
    const svgEl = svgRef.current;
    if (svgEl) {
      const preventScroll = (e) => e.preventDefault();
      svgEl.addEventListener('wheel', preventScroll, { passive: false });
      return () => svgEl.removeEventListener('wheel', preventScroll);
    }
  }, [currentChartData, activeTab]);

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
          if (currency === 'TWD') { fxRate = 1; } else { const ticker = currency === 'USD' ? 'TWD=X' : `${currency}TWD=X`; fxRate = pricesMap[ticker] || 1; }
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
      const estimateFee = Math.round(marketValueTwd * feeRate); const estimateTax = category === '定存' ? 0 : Math.round(marketValueTwd * taxRate);
      const feeFinal = category === '定存' ? 0 : estimateFee;
      const grossProfit = marketValueTwd - costBasisTwd; const netProfit = grossProfit - feeFinal - estimateTax;
      const calculatedBuyPriceTwd = shares > 0 ? costBasisTwd / shares : 0; const roi = costBasisTwd > 0 ? netProfit / costBasisTwd : 0;
      
      return { 
        ...item, id: index, shares, isUS, isTD,
        buyPrice: calculatedBuyPriceTwd, currentPrice: currentPriceTwd, currentPriceRaw,
        buyPriceRaw, costBasis: costBasisTwd, marketValue: marketValueTwd, 
        profitLoss: netProfit, grossProfit, estimateFee: feeFinal, estimateTax, roi, 
        isRealData: !!(pricesMap?.[symbol] || (isTD && pricesMap?.[isTD ? (symbol.replace('-TD','')==='USD'?'TWD=X':`${symbol.replace('-TD','')}TWD=X`) : ''])),
        priceDate: extraMap[symbol]?.dateStr, priceSource: extraMap[symbol]?.priceSource
      };
    });
    setPortfolioData(enrichedData); setRawData(data);
  };

  const fetchRealTimePrices = async (data) => {
    if (globalAbortRef.current) globalAbortRef.current.abort();
    globalAbortRef.current = new AbortController();
    const signal = globalAbortRef.current.signal;
    setPriceLoading(true); setUpdateError(null); setLoadingMessage('更新即時股價中...');
    
    const uniqueSymbols = [...new Set(data.map(item => item['標的']))];
    const symbolsToFetchList = uniqueSymbols.filter(s => s !== '定存' && !s.includes('-TD'));
    if (!symbolsToFetchList.includes('TWD=X')) symbolsToFetchList.push('TWD=X');
    if (!symbolsToFetchList.includes('^TNX')) symbolsToFetchList.push('^TNX');
    
    const tePromise = fetchTradingEconomicsYields(signal);
    const symbolToName = {}; data.forEach(item => { symbolToName[item['標的']] = item['名稱']; });
    const newPrices = { ...realTimePrices }; const newEtfData = { ...etfExtraData }; 
    const misPriceMap = {}; const misPrevPriceMap = {}; const misTimeMap = {}; const misEtfNavMap = {}; const misEtfPriceMap = {};

    try {
        if (signal.aborted) throw new Error('AbortError');
        const [twseEodRes, tpexEodRes] = await Promise.all([
            fetchOfficialDataWithDegradation('https://openapi.twse.com.tw/v1/exchangeReport/STOCK_DAY_ALL', signal),
            fetchOfficialDataWithDegradation('https://www.tpex.org.tw/openapi/v1/tpex_mainboard_quotes', signal)
        ]);

        if (Array.isArray(twseEodRes)) { twseEodRes.forEach(item => { const code = getPureCode(item.Code || item.code); const rawPrice = item.ClosingPrice || item.closingPrice; if (code && rawPrice && rawPrice !== '--' && rawPrice !== '---') { const price = parseFloat(String(rawPrice).replace(/,/g, '')); if (!isNaN(price) && price > 0) misPriceMap[code] = price; } }); }
        if (Array.isArray(tpexEodRes)) { tpexEodRes.forEach(item => { const code = getPureCode(item.SecuritiesCompanyCode || item.Symbol || item.SecuCode || item.code); const rawPrice = item.Close || item.ClosePrice || item.close; if (code && rawPrice && rawPrice !== '--' && rawPrice !== '---') { const price = parseFloat(String(rawPrice).replace(/,/g, '')); if (!isNaN(price) && price > 0) misPriceMap[code] = price; } }); }

        if (signal.aborted) throw new Error('AbortError');
        const etfSymbols = symbolsToFetchList.filter(s => symbolToName[s]?.includes('ETF') || s.startsWith('00'));
        if (etfSymbols.length > 0) {
            const misCacheBuster = isTaiwanTradingHours() ? Date.now() : getTodayDate().replace(/-/g, '');
            const misEtfText = await smartFetch(`https://mis.twse.com.tw/stock/data/all_etf.txt?_=${misCacheBuster}`, 'text', 6000, signal);
            let misEtfRes = null;
            if (misEtfText) { try { misEtfRes = JSON.parse(misEtfText); localStorage.setItem('ALPHA_ETF_BACKUP', misEtfText); } catch (e) {} } 
            else { const backup = localStorage.getItem('ALPHA_ETF_BACKUP'); if (backup) { try { misEtfRes = JSON.parse(backup); } catch (e) {} } }
            if (misEtfRes && misEtfRes.a1) {
                let etfData = []; misEtfRes.a1.forEach((investmentTrust) => { if (investmentTrust.msgArray !== undefined) { investmentTrust.msgArray.forEach((etf) => etfData.push(etf)); } });
                etfData.forEach(item => {
                    const code = getPureCode(item.a);
                    if (item.f && item.f !== '-') { const nav = parseFloat(String(item.f).replace(/,/g, '')); if (!isNaN(nav)) misEtfNavMap[code] = nav; }
                    if (item.e && item.e !== '-') { const price = parseFloat(String(item.e).replace(/,/g, '')); if (!isNaN(price) && price > 0) misEtfPriceMap[code] = price; }
                });
            }
        }

        const symbolsForYahoo = symbolsToFetchList.filter(symbol => (!newPrices[symbol] || isUsAsset(symbol) || symbol === 'TWD=X' || symbol.startsWith('^')));
        if (symbolsForYahoo.length > 0) {
            for (const symbol of symbolsForYahoo) {
                if (signal.aborted) throw new Error('AbortError');
                try {
                    const result = await smartFetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`, 'json', 4500, signal);
                    const meta = result?.chart?.result?.[0]?.meta;
                    if (meta && meta.regularMarketPrice !== undefined) {
                        newPrices[symbol] = meta.regularMarketPrice; const extra = { ...newEtfData[symbol] }; extra.priceSource = "Yahoo";
                        if (meta.regularMarketTime) extra.dateStr = new Intl.DateTimeFormat('zh-TW', {timeZone: 'Asia/Taipei', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit'}).format(new Date(meta.regularMarketTime * 1000));
                        if (meta.previousClose !== undefined) extra.prevClose = meta.previousClose;
                        newEtfData[symbol] = extra;
                    }
                } catch (e) {}
                if (!signal.aborted) await delay(500); 
            }
        }
        
        const teYields = await tePromise;
        setUsBondYields({ '10Y': teYields['10Y'] || newPrices['^TNX'] || null, '20Y': teYields['20Y'] || null, '30Y': teYields['30Y'] || null });

        setRealTimePrices(newPrices); setEtfExtraData(newEtfData); 
        setPriceLoading(false); setLastUpdated(new Date()); 
        processData(data, newPrices, newEtfData);

    } catch(e) {
        if (e.message.includes('AbortError') || signal.aborted) return;
        setPriceLoading(false);
    }
  };

  const callGeminiWithFallback = async (prompt, customTemperature = 0.2, parentSignal = null) => {
    if (!geminiApiKey) {
      if (window.confirm("尚未設定 AI 金鑰。\n單機版需要您自己的 Google Gemini API Key 才能運作 AI 分析功能。\n是否現在前往「設定」頁面輸入？")) setActiveTab('config');
      throw new Error("請先設定 API Key");
    }
    const models = [...new Set([selectedModel, ...AVAILABLE_MODELS.map(m => m.id)])];
    const backoffDelays = [1000, 2000, 4000];

    for (const model of models) {
        if (parentSignal?.aborted) throw new Error('AbortError: 手動中止');
        let lastErr = null;

        for (let retry = 0; retry <= 3; retry++) {
            if (parentSignal?.aborted) throw new Error('AbortError: 手動中止');
            if (retry > 0) await new Promise(res => setTimeout(res, backoffDelays[retry - 1]));

            const controller = new AbortController(); const timeoutId = setTimeout(() => controller.abort(), 45000); 
            let abortHandler;
            if (parentSignal) {
                abortHandler = () => controller.abort();
                parentSignal.addEventListener('abort', abortHandler);
            }
            
            try {
              const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`, {
                  method: 'POST', headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { maxOutputTokens: 8192, temperature: customTemperature } }),
                  signal: controller.signal
              });
              clearTimeout(timeoutId);
              if (parentSignal && abortHandler) parentSignal.removeEventListener('abort', abortHandler);
              
              if (!response.ok) {
                  let errMsg = await response.text(); try { const errData = JSON.parse(errMsg); if (errData.error?.message) errMsg = errData.error.message; } catch (e) {}
                  if ((response.status === 400 && errMsg.toLowerCase().includes('api key')) || response.status === 403) throw new Error(`API Key 無效 (${errMsg})`);
                  throw new Error(`HTTP ${response.status} - ${errMsg}`);
              }
              const data = await response.json(); 
              const parts = data.candidates?.[0]?.content?.parts;
              const text = parts ? parts.map(p => p.text || '').join('') : '';
              
              if (text) return { text, model }; 
            } catch (err) {
              clearTimeout(timeoutId);
              if (parentSignal?.aborted) throw new Error('AbortError: 手動中止');
              if (String(err.message).includes('API Key 無效')) throw err;
              lastErr = err;
            }
        }
    }
    throw new Error(`AI 連線失敗，請檢查 API Key 或網路狀態`);
  };

  const generatePortfolioHealthCheck = async () => {
    if (!geminiApiKey) return;
    if (isHealthChecking) return;
    setIsHealthChecking(true); setPortfolioHealth(null);
    const totalAsset = summary.totalValue;
    const holdingsSummary = sortedHoldings.map(h => `${h['標的']}(${formatPercent(h.marketValue / totalAsset)})`).join(', ');
    const prompt = `分析這個投資組合：［${holdingsSummary}］總資產 ${formatCurrency(totalAsset)}。
找出集中風險、產業曝險、地區曝險、重複押注、隱藏關聯，以及市場拋售時可能同步反應的部位。
接著模擬：
- 市場修正10%
- 熊市下跌20%
- 利率上升
- 經濟衰退
提出可行的分散或避險方式，並說明各自取捨。
嚴格格式輸出(無Markdown代碼)：
[SCORE] 0-100分數
[RISK] 低風險/中低風險/中風險/中高風險/高風險
[COMMENT] 200字總評
[SUGGESTION] 列3點建議，每點一行`;
    try {
        const { text } = await callGeminiWithFallback(prompt);
        const scoreMatch = text.match(/\[SCORE\]\s*(\d+)/i); const riskMatch = text.match(/\[RISK\]\s*(.+)/i); const commentMatch = text.match(/\[COMMENT\]\s*([\s\S]*?)\s*(?=\[SUGGESTION\]|$)/i); const suggestionMatch = text.match(/\[SUGGESTION\]\s*([\s\S]*)/i);
        setPortfolioHealth({ score: scoreMatch ? parseInt(scoreMatch[1]) : 0, risk: riskMatch ? String(riskMatch[1]).trim() : "未知", comment: commentMatch ? String(commentMatch[1]).trim() : "解析失敗", suggestions: suggestionMatch ? String(suggestionMatch[1]).trim().split('\n').filter(s => s.trim().length > 0) : [] });
    } catch (err) { setPortfolioHealth({ score: 0, risk: "Error", comment: String(err.message), suggestions: [] }); } finally { setIsHealthChecking(false); }
  };

  const generateFullAnalysis = async (symbol, data, forceUpdate = false) => {
    if (!data || data.length === 0) return;
    if (aiAbortControllerRef.current) aiAbortControllerRef.current.abort();
    aiAbortControllerRef.current = new AbortController();
    const signal = aiAbortControllerRef.current.signal;

    if (activeHistorySymbolRef.current === symbol) {
        setIsAiSummarizing(true); setAiSummary(null); setAiDetail(null); setUsedModel(null); setIsCachedResult(false);
        setAiProgressMsg(analysisMode === 'comprehensive' ? "AI 正在進行綜合趨勢與定價分析..." : "AI 正在回測交易策略..."); 
    }

    const assetInfo = tradableSymbols.find(t => t['標的'] === symbol);
    const stockName = assetInfo?.['名稱'] || symbol; 
    const latest = data[data.length - 1]; 
    const prevDay = data.length > 1 ? data[data.length - 2] : latest;

    const settings = investmentSettings[symbol] || { type: 'CORE', isDCA: false, addon: 'PYRAMID', addon2: 'NONE' };
    const currentMonthPrefix = getTodayDate().substring(0, 7); 
    const hasBoughtThisMonth = portfolioData.some(item => item['標的'] === symbol && String(item['日期'] || '').startsWith(currentMonthPrefix) && (item['策略'] === '基礎買入' || item['策略'].includes('基礎')));

    let prompt = "";
    if (analysisMode === 'comprehensive') {
      const dcaText = settings.isDCA ? (hasBoughtThisMonth ? '定期定額 (本月已完成基礎買入，僅評估加碼)' : '定期定額 (尋找買點)') : '單筆投入';
      prompt = `角色：專業股票研究分析師。請深入分析 ${stockName}/${symbol}。
投資設定：${dcaText}。加碼策略：${settings.addon}, ${settings.addon2}。
1. 看懂市場正在定價什麼：檢視最新財報、財測、估值、主要催化因素、競爭地位、近期股價走勢，以及相關總體經濟因素。請區分哪些資訊可能已反映在股價中，哪些仍可能讓市場意外。最後整理3個最大利多催化因素、3個最大風險，以及接下來應關注的關鍵發展。
2. 把新聞轉化為市場影響：整理近期影響該產業與個股的重要新聞，說明實際發生什麼事、投資人為何關注、影響偏短期或長期、哪些財務指標受影響、市場隱含假設，並依重要性由高至低排序。
最新K線日期:${latest.date} 現價:${latest.close}
嚴格格式輸出(無Markdown)：
[SUMMARY] (50字綜合趨勢簡評)
[DETAIL] (詳細綜合分析報告與催化因素、風險)
[SIGNAL] (僅輸出 ADD_ALL/ADD_BASIC/ADD_BONUS/REDUCE/HOLD 之一)`;
    } else {
      const dcaText = settings.isDCA ? (hasBoughtThisMonth ? '定期定額 (本月已完成基礎買入，僅評估加碼)' : '定期定額 (尋找買點)') : '單筆投入';
      prompt = `使用可取得的歷史資料，評估［${dcaText} ＋ 加碼策略: ${settings.addon}, ${settings.addon2}］交易策略在［${symbol} (${stockName})］於［${timeframe}］內的表現。
計算交易次數、勝率、平均獲利、平均虧損、最大回撤、獲利因子，以及不同市場環境下的績效。
接著找出策略最有效與失效的情況，並提出下一步可測試、但不過度擬合歷史資料的規則。
嚴格格式輸出(無Markdown)：
[SUMMARY] (50字回測績效簡評)
[DETAIL] (詳細回測報告與最有效/失效情況分析)
[SIGNAL] (僅輸出 ADD_ALL/ADD_BASIC/ADD_BONUS/REDUCE/HOLD 之一)`;
    }

    try {
      const { text, model } = await callGeminiWithFallback(prompt, 0.3, signal);
      if (signal.aborted) return;

      const summaryMatch = text.match(/\[SUMMARY\]\s*([\s\S]*?)\s*(?=\[DETAIL\]|$)/i);
      const detailMatch = text.match(/\[DETAIL\]\s*([\s\S]*?)\s*(?=\[SIGNAL\]|$)/i);
      const signalMatch = text.match(/\[SIGNAL\]\s*[:：\-]?\s*(ADD_ALL|ADD_BASIC|ADD_BONUS|REDUCE|HOLD)/i);

      const resSummary = summaryMatch ? summaryMatch[1].trim() : "分析完成";
      const resDetail = detailMatch ? detailMatch[1].trim() : text;
      const resSignal = signalMatch ? signalMatch[1].toUpperCase() : 'HOLD';

      if (activeHistorySymbolRef.current === symbol) {
        setAiSummary(resSummary);
        setAiDetail(resDetail);
        setAiSignals(prev => ({ ...prev, [symbol]: resSignal }));
        setUsedModel(model);
        setIsCachedResult(false);
        setIsDetailExpanded(true);
      }

      await saveReportToCloud(symbol, stockName, resSignal, resSummary, resDetail);

    } catch (e) {
      if (!signal.aborted && activeHistorySymbolRef.current === symbol) {
        setAiSummary(`分析失敗: ${e.message}`);
      }
    } finally {
      if (activeHistorySymbolRef.current === symbol) {
        setIsAiSummarizing(false);
        setAiProgressMsg('');
      }
    }
  };

  const fetchHistoricalData = async (symbol, tf) => {
    if (!symbol || symbol.includes('TD') || symbol === '定存') return;
    if (activeHistorySymbolRef.current === symbol) {
        setHistoryLoading(true); setHistoryError(null); 
    }

    try {
      let range = '1y'; let interval = '1d';
      if (tf === '5y_1wk') { range = '5y'; interval = '1wk'; }
      if (tf === '10y_1mo') { range = '10y'; interval = '1mo'; }
      
      const result = await smartFetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=${interval}&range=${range}`, 'json', 8000);
      if (!result || !result.chart?.result?.[0]) throw new Error('Yahoo API 查無資料');

      const chartData = result.chart.result[0];
      const timestamps = chartData.timestamp; 
      const quote = chartData.indicators.quote[0];
      
      let rawPoints = timestamps.map((ts, i) => ({ 
          date: new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Taipei' }).format(new Date(ts * 1000)), 
          close: quote.close[i], high: quote.high[i], low: quote.low[i], open: quote.open[i],
          volume: quote.volume[i] || 0, ts: ts * 1000
      })).filter(d => d.close != null && d.high != null);
      
      const manualKLines = JSON.parse(localStorage.getItem('investment_manual_klines') || '{}');
      const symbolManualData = manualKLines[symbol] || {};
      Object.keys(symbolManualData).forEach(date => {
          const p = symbolManualData[date]; 
          const existingIdx = rawPoints.findIndex(pt => pt.date === date);
          const newData = { date, close: p.close, open: p.open, high: p.high, low: p.low, volume: p.volume, isManual: true };
          if (existingIdx >= 0) rawPoints[existingIdx] = { ...rawPoints[existingIdx], ...newData }; 
          else rawPoints.push(newData);
      });
      rawPoints.sort((a, b) => new Date(a.date) - new Date(b.date));

      const processedData = processTechnicalData(rawPoints);
      setHistoricalData(prev => ({ ...prev, [`${symbol}_${tf}`]: processedData }));
      
      if (activeHistorySymbolRef.current === symbol) {
          setHistoryLoading(false);
          if (cloudReportsRef.current[symbol]) {
              const r = cloudReportsRef.current[symbol];
              setAiSummary(r.summary);
              setAiDetail(r.detail);
              setIsCachedResult(true);
          } else {
              setAiSummary(null);
              setAiDetail(null);
          }
      }
    } catch (err) { 
        if (activeHistorySymbolRef.current === symbol) { 
            setHistoryError(String(err.message)); 
            setHistoryLoading(false); 
        }
    }
  };

  useEffect(() => {
    if (activeTab === 'history' && selectedHistorySymbol) {
      if (activeHistorySymbolRef.current !== selectedHistorySymbol) {
          activeHistorySymbolRef.current = selectedHistorySymbol;
      }
      const key = `${selectedHistorySymbol}_${timeframe}`;
      if (!historicalData[key]) {
          if (!fetchingHistoryRef.current[key]) {
              fetchingHistoryRef.current[key] = true;
              fetchHistoricalData(selectedHistorySymbol, timeframe).finally(() => {
                  fetchingHistoryRef.current[key] = false;
              });
          }
      } else {
          if (cloudReportsRef.current[selectedHistorySymbol]) {
              const r = cloudReportsRef.current[selectedHistorySymbol];
              setAiSummary(r.summary);
              setAiDetail(r.detail);
              setIsCachedResult(true);
          }
      }
    }
  }, [activeTab, selectedHistorySymbol, timeframe]);

  const performFetch = async (url) => {
    setLoading(true); setError(null); setUpdateError(null); 
    let cleanUrl = url ? String(url).trim() : '';
    if (!cleanUrl) { setError('請輸入有效的網址'); setLoading(false); return; }

    try {
      const Papa = await loadPapaParse();
      let csvText = null;
      try { const res = await fetch(cleanUrl, { method: 'GET', credentials: 'omit', cache: 'no-store' }); if (res.ok) csvText = await res.text(); } catch (e) {}
      if (!csvText || csvText.trim().toLowerCase().startsWith('<html')) csvText = await smartFetch(cleanUrl, 'text', 8000);

      Papa.parse(csvText, {
        header: true, skipEmptyLines: true,
        complete: (results) => {
          const valid = results.data.filter(r => r['標的'] && r['價格']);
          processData(valid, {});
          fetchRealTimePrices(valid);
          setLoading(false);
          localStorage.setItem('investment_sheet_url', cleanUrl);
        },
        error: (err) => { setError(`解析失敗: ${err.message}`); setLoading(false); }
      });
    } catch (e) { setError(`讀取失敗: ${e.message}`); setLoading(false); }
  };

  const handleSettingChange = (symbol, key, value) => {
    const current = investmentSettings[symbol] || { type: 'CORE', isDCA: false, addon: 'PYRAMID', addon2: 'NONE' };
    const updated = { ...investmentSettings, [symbol]: { ...current, [key]: value } };
    setInvestmentSettings(updated);
    localStorage.setItem('investment_settings', JSON.stringify(updated));
    syncSettingsToCloud(updated);
    if (key === 'type') {
      setAssetClassifications(prev => ({ ...prev, [symbol]: value }));
    }
  };

  const requestSort = (key) => {
    let direction = 'desc'; if (sortConfig.key === key && sortConfig.direction === 'desc') direction = 'asc';
    const newSortConfig = { key, direction }; setSortConfig(newSortConfig); localStorage.setItem('investment_sort_config', JSON.stringify(newSortConfig));
  };

  const moveItem = (symbol, direction) => {
    if (sortConfig.key !== 'manual') { const manualConfig = { key: 'manual', direction: 'asc' }; setSortConfig(manualConfig); localStorage.setItem('investment_sort_config', JSON.stringify(manualConfig)); }
    setCustomOrder(prev => {
      let newOrder = [...prev]; tradableSymbols.forEach(t => { if (!newOrder.includes(t['標的'])) newOrder.push(t['標的']); });
      const currentIndex = newOrder.indexOf(symbol); if (currentIndex === -1) return newOrder;
      const newIndex = currentIndex + direction; if (newIndex < 0 || newIndex >= newOrder.length) return newOrder;
      [newOrder[currentIndex], newOrder[newIndex]] = [newOrder[newIndex], newOrder[currentIndex]];
      localStorage.setItem('investment_custom_order', JSON.stringify(newOrder)); return newOrder;
    });
  };

  const handleAddPatch = () => {
    if (!patchDate || !patchPrice || !selectedHistorySymbol) return;
    const p = parseFloat(patchPrice);
    const o = patchOpen ? parseFloat(patchOpen) : p;
    const h = patchHigh ? parseFloat(patchHigh) : p;
    const l = patchLow ? parseFloat(patchLow) : p;
    const v = patchVolume ? parseInt(patchVolume) : 0;

    const currentObj = JSON.parse(localStorage.getItem('investment_manual_klines') || '{}');
    if (!currentObj[selectedHistorySymbol]) currentObj[selectedHistorySymbol] = {};
    currentObj[selectedHistorySymbol][patchDate] = { open: o, high: h, low: l, close: p, volume: v };
    
    localStorage.setItem('investment_manual_klines', JSON.stringify(currentObj)); 
    setManualKLinesState(currentObj); 
    setPatchDate(''); setPatchPrice(''); setPatchOpen(''); setPatchHigh(''); setPatchLow(''); setPatchVolume('');
    setToast(`已新增 ${selectedHistorySymbol} 完整 K 線點位，重新繪製中...`);
    setHistoricalData(prev => { const next = { ...prev }; delete next[`${selectedHistorySymbol}_${timeframe}`]; return next; });
  };

  const handleDeletePatch = (date) => {
    if (!selectedHistorySymbol) return;
    const currentObj = JSON.parse(localStorage.getItem('investment_manual_klines') || '{}');
    if (currentObj[selectedHistorySymbol] && currentObj[selectedHistorySymbol][date]) {
        delete currentObj[selectedHistorySymbol][date]; 
        localStorage.setItem('investment_manual_klines', JSON.stringify(currentObj)); 
        setManualKLinesState(currentObj); 
        setToast(`已移除 ${date} 的點位...`);
        setHistoricalData(prev => { const next = { ...prev }; delete next[`${selectedHistorySymbol}_${timeframe}`]; return next; });
    }
  };

  useEffect(() => {
    const savedUrl = localStorage.getItem('investment_sheet_url'); 
    const savedGas = localStorage.getItem('gas_url');
    const savedKey = localStorage.getItem('gemini_api_key'); 
    const savedDiscount = localStorage.getItem('fee_discount'); 
    const savedSort = localStorage.getItem('investment_sort_config'); 
    const savedOrder = localStorage.getItem('investment_custom_order'); 
    const savedSettings = localStorage.getItem('investment_settings'); 
    const savedProxyUrl = localStorage.getItem('custom_proxy_url'); 
    const savedManualKLines = localStorage.getItem('investment_manual_klines');
    
    if (savedGas) {
      setGasUrl(savedGas);
      loadCloudReportsFromSheet(savedGas);
    }
    if (savedKey) setGeminiApiKey(savedKey);
    if (savedDiscount) setFeeDiscount(parseFloat(savedDiscount)); 
    if (savedSort) setSortConfig(JSON.parse(savedSort)); 
    if (savedOrder) setCustomOrder(JSON.parse(savedOrder)); 
    if (savedProxyUrl) setCustomProxyUrl(savedProxyUrl); 
    if (savedManualKLines) setManualKLinesState(JSON.parse(savedManualKLines));

    if (savedSettings) {
      const parsed = JSON.parse(savedSettings);
      setInvestmentSettings(parsed);
      const flatClass = {}; Object.keys(parsed).forEach(key => { flatClass[key] = parsed[key].type; }); 
      setAssetClassifications(flatClass);
    }

    if (savedUrl) { 
      setSheetUrl(savedUrl); 
      performFetch(savedUrl); 
    } else { 
      processData(DEMO_DATA, {}); 
      fetchRealTimePrices(DEMO_DATA); 
    }
  }, []);

  const handleWheel = (e) => {
    if (!currentChartData.length || isUiLocked) return;
    setZoom(prev => {
       const delta = e.deltaY > 0 ? 5 : -5;
       const newCount = Math.max(20, Math.min(currentChartData.length, prev.count + delta));
       return { ...prev, count: newCount };
    });
    setHoverIndex(null); 
  };

  const handleMouseDown = (e) => { if(!isUiLocked) { setIsDragging(true); setStartX(e.clientX); } };
  const handleMouseUp = () => setIsDragging(false);
  const handleMouseLeave = () => { setIsDragging(false); setHoverIndex(null); }; 
 
  const handleMouseMove = (e) => {
     if (!currentChartData.length || isUiLocked) return;
     if (isDragging) {
         const deltaX = e.clientX - startX;
         if (Math.abs(deltaX) > 8) {
             setZoom(prev => {
                 const shift = deltaX > 0 ? -1 : 1; 
                 let currentEnd = prev.endIndex === null ? currentChartData.length : prev.endIndex;
                 let newEnd = Math.max(prev.count, Math.min(currentChartData.length, currentEnd + shift));
                 return { ...prev, endIndex: newEnd };
             });
             setStartX(e.clientX);
         }
         setHoverIndex(null); 
     } else {
         const rect = e.currentTarget.getBoundingClientRect();
         const x = e.clientX - rect.left;
         const endIdx = zoom.endIndex === null ? currentChartData.length : zoom.endIndex;
         const startIdx = Math.max(0, endIdx - zoom.count);
         const displayedCount = endIdx - startIdx;
         const spacing = rect.width / displayedCount;
         let idx = Math.floor(x / spacing);
         idx = Math.max(0, Math.min(displayedCount - 1, idx));
         setHoverIndex(idx); 
     }
  };

  const updateHoverIndexFromTouch = useCallback((touch) => {
      if (!svgRef.current || !currentChartData.length) return;
      const rect = svgRef.current.getBoundingClientRect();
      const x = touch.clientX - rect.left;
      const endIdx = zoom.endIndex === null ? currentChartData.length : zoom.endIndex;
      const startIdx = Math.max(0, endIdx - zoom.count);
      const displayedCount = endIdx - startIdx;
      const spacing = rect.width / displayedCount;
      let idx = Math.floor(x / spacing);
      idx = Math.max(0, Math.min(displayedCount - 1, idx));
      setHoverIndex(idx);
  }, [currentChartData, zoom]);

  const handleTouchStart = (e) => {
      if (isUiLocked) return;
      if (e.touches.length === 2) {
          const dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
          touchRef.current = { startX: 0, startDist: dist, isPinching: true, isPanning: false };
      } else if (e.touches.length === 1) {
          touchRef.current = { startX: e.touches[0].clientX, startDist: 0, isPinching: false, isPanning: true };
          updateHoverIndexFromTouch(e.touches[0]);
      }
  };

  const handleTouchMove = (e) => {
      if (!currentChartData.length || isUiLocked) return;
      if (touchRef.current.isPinching && e.touches.length === 2) {
          const dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
          const deltaDist = touchRef.current.startDist - dist;
          if (Math.abs(deltaDist) > 5) {
              setZoom(prev => {
                  const shift = deltaDist > 0 ? 4 : -4;
                  const newCount = Math.max(20, Math.min(currentChartData.length, prev.count + shift));
                  return { ...prev, count: newCount };
              });
              touchRef.current.startDist = dist;
              setHoverIndex(null);
          }
      } else if (touchRef.current.isPanning && e.touches.length === 1) {
          const deltaX = e.touches[0].clientX - touchRef.current.startX;
          if (Math.abs(deltaX) > 8) {
              setZoom(prev => {
                  const shift = deltaX > 0 ? -2 : 2;
                  let currentEnd = prev.endIndex === null ? currentChartData.length : prev.endIndex;
                  let newEnd = Math.max(prev.count, Math.min(currentChartData.length, currentEnd + shift));
                  return { ...prev, endIndex: newEnd };
              });
              touchRef.current.startX = e.touches[0].clientX;
              setHoverIndex(null);
          } else {
              updateHoverIndexFromTouch(e.touches[0]);
          }
      }
  };

  const handleTouchEnd = () => {
      touchRef.current = { startX: 0, startDist: 0, isPinching: false, isPanning: false };
  };

  const endIdx = zoom.endIndex === null ? currentChartData.length : zoom.endIndex;
  const startIdx = Math.max(0, endIdx - zoom.count);
  const displayChartData = currentChartData.slice(startIdx, endIdx);

  const activeIdx = hoverIndex !== null ? hoverIndex : (displayChartData.length - 1);
  const activeCandle = displayChartData[activeIdx] || { open: 0, high: 0, low: 0, close: 0, volume: 0, ts: Date.now() };
  const prevC = activeIdx > 0 ? displayChartData[activeIdx-1].close : activeCandle.open;
  
  const activeChange = activeCandle.close - prevC;
  const activeChangePercent = prevC > 0 ? (activeChange / prevC) * 100 : 0;
  const activeColorClass = activeChange > 0 ? 'text-red-500' : activeChange < 0 ? 'text-green-500' : 'text-white';
  const activeSign = activeChange > 0 ? '▲ ' : activeChange < 0 ? '▼ ' : '';
  
  const dateObj = activeCandle.ts ? new Date(activeCandle.ts) : new Date();
  const dateStr = hoverIndex !== null ? `日期: ${dateObj.getFullYear()}/${dateObj.getMonth()+1}/${dateObj.getDate()}` : '今日動態';

  const currentMA5 = activeCandle.MA5 || 0;
  const currentMA20 = activeCandle.MA20 || 0;
  const currentMA60 = activeCandle.MA60 || 0;
  const currentBBUpper = activeCandle.BBU || 0;
  const currentBBLower = activeCandle.BBL || 0;
  const currentMACD = activeCandle.OSC || 0;
  const currentK = activeCandle.K || 50;
  const currentD = activeCandle.D || 50;
  const currentRSI = activeCandle.RSI14 || 50;

  const bias20 = currentMA20 > 0 ? ((activeCandle.close - currentMA20) / currentMA20) * 100 : 0;
  const stockPrice = currentChartData.length > 0 ? currentChartData[currentChartData.length - 1].close : 0;

  let bbStatus = "區間內震盪";
  let bbColor = "text-yellow-400";
  if (stockPrice > activeCandle.BBU && activeCandle.BBU > 0) {
      bbStatus = "突破上軌 (強勢)"; bbColor = "text-red-500";
  } else if (stockPrice < activeCandle.BBL && activeCandle.BBL > 0) {
      bbStatus = "跌破下軌 (弱勢)"; bbColor = "text-green-500";
  } else if (stockPrice > currentMA20) {
      bbStatus = "中軌之上 (偏多)"; bbColor = "text-red-400";
  } else if (stockPrice < currentMA20) {
      bbStatus = "中軌之下 (偏空)"; bbColor = "text-green-400";
  }

  const latestChangePercent = currentChartData.length > 1 ? ((currentChartData[currentChartData.length - 1].close - currentChartData[currentChartData.length - 2].close) / currentChartData[currentChartData.length - 2].close) * 100 : 0;
  const extRatio = Math.min(Math.max(Math.round(50 + latestChangePercent * 3), 20), 80);
  const intRatio = 100 - extRatio;
  
  const bodySize = Math.abs(activeCandle.close - activeCandle.open);
  const upperShadow = activeCandle.high - Math.max(activeCandle.close, activeCandle.open);
  const lowerShadow = Math.min(activeCandle.close, activeCandle.open) - activeCandle.low;
  
  const isRedK = activeCandle.close >= activeCandle.open;
  const isLongRed = isRedK && (activeCandle.close - activeCandle.open) / activeCandle.open > 0.03;
  const isLongBlack = !isRedK && (activeCandle.open - activeCandle.close) / activeCandle.open > 0.03;
  const hasUpperShadow = upperShadow > bodySize * 2 && upperShadow > (activeCandle.open * 0.01);
  const hasLowerShadow = lowerShadow > bodySize * 2 && lowerShadow > (activeCandle.open * 0.01);

  const last10 = displayChartData.slice(-10);
  const winDays = last10.filter(d => d.close >= d.open).length;
  const winRate = last10.length > 0 ? Math.round((winDays / last10.length) * 100) : 50;
  const volMA5 = displayChartData.length >= 5 ? displayChartData.slice(-5).reduce((acc, curr) => acc + (curr.volume || 0), 0) / 5 : activeCandle.volume;
  const isVolUp = (activeCandle.volume) > volMA5;

  let paddedMin = 0, paddedMax = 0, mapPriceY = () => 0;
  if (displayChartData.length > 0) {
      const allLows = displayChartData.map(d => d.low);
      const allHighs = displayChartData.map(d => d.high);
      const validMAs = displayChartData.map(d => [d.MA5, d.MA20, d.MA60, d.BBU, d.BBL]).flat().filter(v => v !== null && v !== undefined);
      const minPrice = Math.min(...allLows, ...validMAs);
      const maxPrice = Math.max(...allHighs, ...validMAs);
      const priceRange = maxPrice - minPrice || 1;
      paddedMin = minPrice - priceRange * 0.05;
      paddedMax = maxPrice + priceRange * 0.05;
      const paddedRange = paddedMax - paddedMin;
      mapPriceY = (val) => 280 - ((val - paddedMin) / paddedRange) * 260;
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans pb-20 md:pb-0">
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
      <nav className="hidden md:block border-b border-slate-700 bg-slate-800/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <div className="flex items-center"><div className="bg-blue-600 p-2 rounded-lg"><TrendingUp className="h-6 w-6 text-white" /></div><span className="ml-3 text-xl font-bold tracking-wider">Alpha 投資戰情室 v56.04</span>{usdRate !== 1 && <span className="ml-4 text-xs bg-slate-700 px-2 py-1 rounded text-slate-300 flex items-center"><Globe className="w-3 h-3 mr-1"/> USD/TWD: {usdRate.toFixed(2)}</span>}</div>
          <div className="flex space-x-4">{['overview', 'history', 'chat', 'holdings', 'config'].map(tab => (<button key={tab} onClick={() => setActiveTab(tab)} className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === tab ? 'bg-slate-900 text-blue-400' : 'text-slate-300 hover:bg-slate-700'}`}>{tab === 'overview' ? '資產總覽' : tab === 'history' ? '歷史走勢' : tab === 'chat' ? 'AI 助理' : tab === 'holdings' ? '持股明細' : '設定'}</button>))}</div>
        </div>
      </nav>

      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-800 border-t border-slate-700 z-50 flex justify-around py-3 pb-safe">
        {[ { id: 'overview', icon: PieIcon, label: '總覽' }, { id: 'history', icon: LineIcon, label: '走勢' }, { id: 'chat', icon: MessageSquare, label: 'AI助理' }, { id: 'holdings', icon: FileText, label: '明細' }, { id: 'config', icon: Settings, label: '設定' } ].map(tab => (<button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex flex-col items-center justify-center w-full ${activeTab === tab.id ? 'text-blue-400' : 'text-slate-400'}`}><tab.icon className="h-6 w-6 mb-1" /><span className="text-[10px]">{String(tab.label)}</span></button>))}
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-8">
        {priceLoading && (
            <div className="mb-6 bg-blue-900/30 border border-blue-500/30 rounded-lg p-3 flex items-center justify-between animate-pulse"><div className="flex items-center"><Loader2 className="w-5 h-5 text-blue-400 animate-spin mr-3" /><span className="text-sm text-blue-200">{loadingMessage}</span></div><button onClick={() => { if (globalAbortRef.current) { globalAbortRef.current.abort(); } setPriceLoading(false); setUpdateError('已手動取消資料更新'); }} className="text-xs bg-red-900/50 text-red-200 px-2 py-1 rounded border border-red-500/50 flex items-center hover:bg-red-900/70"><XCircle className="w-3 h-3 mr-1" />停止</button></div>
        )}
        {updateError && <div className="mb-6 bg-red-900/30 border border-red-500/30 rounded-lg p-3 flex items-center"><AlertTriangle className="w-5 h-5 text-red-400 mr-3 flex-shrink-0" /><span className="text-sm text-red-200">{String(updateError)}</span></div>}

        {activeTab === 'overview' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
               {[ { label: '總資產現值', value: formatCurrency(summary.totalValue), icon: DollarSign, color: 'text-yellow-400', bg: 'bg-blue-900/50', iColor: 'text-blue-400' }, { label: '投入成本', value: formatCurrency(summary.totalCost), icon: Briefcase, color: 'text-white', bg: 'bg-purple-900/50', iColor: 'text-purple-400' }, { label: '未實現淨損益 (已扣稅費)', value: `${summary.totalPL > 0 ? '+' : ''}${formatCurrency(summary.totalPL)}`, icon: summary.totalPL >= 0 ? ArrowUpCircle : ArrowDownCircle, color: summary.totalPL >= 0 ? 'text-red-500' : 'text-green-500', bg: summary.totalPL >= 0 ? 'bg-red-900/30' : 'bg-green-900/30', iColor: summary.totalPL >= 0 ? 'text-red-500' : 'text-green-500' }, { label: '投資報酬率 (ROI)', value: `${summary.totalROI > 0 ? '+' : ''}${formatPercent(summary.totalROI)}`, icon: PieIcon, color: summary.totalROI >= 0 ? 'text-red-500' : 'text-green-500', bg: 'bg-slate-700', iColor: 'text-slate-300' } ].map((item, idx) => (
                   <div key={idx} className="bg-slate-800 p-5 rounded-xl border border-slate-700 shadow flex items-center"><div className={`flex-shrink-0 ${item.bg} rounded-md p-3`}><item.icon className={`h-6 w-6 ${item.iColor}`} /></div><div className="ml-5 flex-1 min-w-0"><p className="text-sm font-medium text-slate-400 truncate">{String(item.label)}</p><p className={`${getResponsiveFontSize(item.value)} font-bold ${item.color} whitespace-nowrap overflow-hidden text-ellipsis`}>{String(item.value)}</p></div></div>
               ))}
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center"><PieIcon className="w-5 h-5 mr-2 text-blue-400" /> 資產類別配置</h3>
                  <div className="h-80 w-full min-h-[320px]" style={{ height: 400 }}>
                    {allocationData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}><PieChart><Pie data={allocationData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value">{allocationData.map((entry, index) => <Cell key={`cell-${index}`} fill={CATEGORY_STYLES[entry.name]?.color || COLORS[index % COLORS.length]} />)}</Pie><RechartsTooltip itemStyle={{ color: '#f1f5f9' }} contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f1f5f9' }} formatter={(value) => formatCurrency(value)} /><Legend formatter={(value, entry) => { const p = entry?.payload?.percent ?? entry?.payload?.payload?.percent ?? 0; return `${String(value)} (${(p * 100).toFixed(1)}%)`; }} /></PieChart></ResponsiveContainer>
                    ) : <div className="flex h-full items-center justify-center text-slate-500">暫無數據</div>}
                  </div>
                </div>
                <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center"><BarChart2 className="w-5 h-5 mr-2 text-purple-400" /> 持股標的分佈</h3>
                  <div className="h-80 w-full min-h-[320px]" style={{ height: 400 }}>
                    {tradableSymbols.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}><BarChart data={tradableSymbols.map(item => ({ name: item['名稱'], value: item.marketValue })).sort((a, b) => b.value - a.value)} layout="vertical"><CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} /><XAxis type="number" stroke="#94a3b8" tickFormatter={(val) => `${val / 1000}k`} /><YAxis dataKey="name" type="category" stroke="#94a3b8" width={80} /><RechartsTooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f1f5f9' }} formatter={(value) => formatCurrency(value)} /><Bar dataKey="value" fill="#8B5CF6" radius={[0, 4, 4, 0]}>{tradableSymbols.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}</Bar></BarChart></ResponsiveContainer>
                    ) : <div className="flex h-full items-center justify-center text-slate-500">暫無數據</div>}
                  </div>
                </div>
            </div>
            
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-6 rounded-xl border border-slate-700 shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 z-10 relative">
                    <div><h3 className="text-xl font-bold text-white flex items-center"><Activity className="w-6 h-6 mr-2 text-purple-400" /> AI 投資組合總體健檢室</h3><p className="text-sm text-slate-400 mt-1">由 AI 擔任首席投資長，針對您的資產配置、風險分散度與績效進行綜合評分與壓力測試。</p></div>
                    {!portfolioHealth && !isHealthChecking && (<button onClick={generatePortfolioHealthCheck} className="mt-4 md:mt-0 px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium shadow-lg hover:shadow-purple-500/25 transition-all flex items-center"><BrainCircuit className="w-5 h-5 mr-2" />開始健檢與壓力測試</button>)}
                </div>
                {isHealthChecking && <div className="flex flex-col items-center justify-center py-12"><Loader2 className="w-12 h-12 text-purple-500 animate-spin mb-4" /><p className="text-slate-300 font-medium">AI 正在進行極端市況壓力測試與風險結構分析...</p></div>}
                {portfolioHealth && (
                    <div className="animate-fade-in-up">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                            <div className="bg-slate-800/50 rounded-lg p-5 border border-slate-700 flex flex-col items-center justify-center text-center"><span className="text-slate-400 text-sm mb-2">健康度評分</span><div className="relative"><svg className="w-24 h-24 transform -rotate-90"><circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-slate-700" /><circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="8" fill="transparent" strokeDasharray={251.2} strokeDashoffset={251.2 - (251.2 * portfolioHealth.score) / 100} className={portfolioHealth.score >= 80 ? "text-green-500" : portfolioHealth.score >= 60 ? "text-yellow-500" : "text-red-500"} /></svg><span className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-3xl font-bold text-white">{portfolioHealth.score}</span></div></div>
                            <div className="bg-slate-800/50 rounded-lg p-5 border border-slate-700 flex flex-col items-center justify-center text-center"><span className="text-slate-400 text-sm mb-2">風險屬性判定</span><ShieldAlert className={`w-12 h-12 mb-2 ${portfolioHealth.risk.includes('高') ? 'text-red-400' : portfolioHealth.risk.includes('低') ? 'text-green-400' : 'text-yellow-400'}`} /><span className="text-xl font-bold text-white">{String(portfolioHealth.risk)}</span></div>
                            <div className="bg-slate-800/50 rounded-lg p-5 border border-slate-700 md:col-span-1"><span className="text-slate-400 text-sm mb-2 block text-center md:text-left">AI 調整建議</span><ul className="space-y-2 mt-2">{portfolioHealth.suggestions.slice(0, 3).map((suggestion, idx) => (<li key={idx} className="flex items-start text-sm text-slate-300"><ClipboardCheck className="w-4 h-4 text-purple-400 mr-2 mt-0.5 flex-shrink-0" />{String(suggestion).replace(/^\d+\.\s*/, '').replace(/^- /, '')}</li>))}</ul></div>
                        </div>
                        <div className="bg-slate-900/50 rounded-lg p-5 border border-slate-700/50"><h4 className="text-white font-medium mb-2 flex items-center"><MessageSquare className="w-4 h-4 mr-2 text-blue-400" /> 壓力測試與總體分析報告</h4><p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">{String(portfolioHealth.comment)}</p></div>
                        <div className="mt-4 flex justify-end"><button onClick={generatePortfolioHealthCheck} className="text-xs text-slate-500 hover:text-slate-300 flex items-center"><RefreshCw className="w-3 h-3 mr-1" /> 重新健檢</button></div>
                    </div>
                )}
            </div>
          </div>
        )}

        {activeTab !== 'overview' && activeTab !== 'chat' && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
             {[ { label: '總資產現值', value: formatCurrency(summary.totalValue), icon: DollarSign, color: 'text-yellow-400', bg: 'bg-blue-900/50', iColor: 'text-blue-400' }, { label: '投入成本', value: formatCurrency(summary.totalCost), icon: Briefcase, color: 'text-white', bg: 'bg-purple-900/50', iColor: 'text-purple-400' }, { label: '未實現淨損益 (已扣稅費)', value: `${summary.totalPL > 0 ? '+' : ''}${formatCurrency(summary.totalPL)}`, icon: summary.totalPL >= 0 ? ArrowUpCircle : ArrowDownCircle, color: summary.totalPL >= 0 ? 'text-red-500' : 'text-green-500', bg: summary.totalPL >= 0 ? 'bg-red-900/30' : 'bg-green-900/30', iColor: summary.totalPL >= 0 ? 'text-red-500' : 'text-green-500' }, { label: '投資報酬率 (ROI)', value: `${summary.totalROI > 0 ? '+' : ''}${formatPercent(summary.totalROI)}`, icon: PieIcon, color: summary.totalROI >= 0 ? 'text-red-500' : 'text-green-500', bg: 'bg-slate-700', iColor: 'text-slate-300' } ].map((item, idx) => (
                 <div key={idx} className="bg-slate-800 p-5 rounded-xl border border-slate-700 shadow flex items-center"><div className={`flex-shrink-0 ${item.bg} rounded-md p-3`}><item.icon className={`h-6 w-6 ${item.iColor}`} /></div><div className="ml-5 flex-1 min-w-0"><p className="text-sm font-medium text-slate-400 truncate">{String(item.label)}</p><p className={`${getResponsiveFontSize(item.value)} font-bold ${item.color} whitespace-nowrap overflow-hidden text-ellipsis`}>{String(item.value)}</p></div></div>
             ))}
          </div>
        )}
        
        {activeTab === 'chat' && (
            <div className="max-w-4xl mx-auto h-[70vh] flex flex-col bg-slate-800 rounded-xl border border-slate-700 shadow-lg overflow-hidden">
                <div className="p-4 border-b border-slate-700 bg-slate-900/50 flex items-center"><Bot className="w-6 h-6 text-purple-400 mr-2" /><h3 className="font-semibold text-white">AI 投資顧問</h3></div>
                <div className="flex-1 overflow-y-auto p-4 space-y-4">{chatMessages.map((msg, idx) => (<div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[80%] p-3 rounded-lg ${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-200'}`}><p className="text-sm whitespace-pre-wrap break-words leading-relaxed">{String(msg.content)}</p></div></div>))}{isChatLoading && (<div className="flex justify-start"><div className="bg-slate-700 p-3 rounded-lg flex items-center"><Loader2 className="w-4 h-4 animate-spin text-purple-400 mr-2" /><span className="text-xs text-slate-400">AI 正在思考中...</span></div></div>)}<div ref={chatEndRef} /></div>
                <div className="p-4 border-t border-slate-700 bg-slate-900/50">
                    <div className="flex gap-2 items-end">
                        <textarea 
                            value={chatInput} 
                            onChange={(e) => setChatInput(e.target.value)} 
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    if (chatInput.trim()) {
                                        const userMsg = { role: 'user', content: chatInput }; 
                                        setChatMessages(prev => [...prev, userMsg]); 
                                        setChatInput(''); 
                                        setIsChatLoading(true);
                                        callGeminiWithFallback(`專業投資顧問問題回答：${chatInput}`).then(({text}) => {
                                            setChatMessages(prev => [...prev, { role: 'assistant', content: text }]);
                                        }).catch(err => {
                                            setChatMessages(prev => [...prev, { role: 'assistant', content: `抱歉，發生錯誤: ${err.message}` }]);
                                        }).finally(() => setIsChatLoading(false));
                                    }
                                }
                            }} 
                            placeholder="輸入您的問題... (Shift + Enter 換行)" 
                            className="flex-1 bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500 text-sm resize-y min-h-[42px] max-h-[150px] custom-scrollbar" 
                            rows={2}
                            disabled={isChatLoading} 
                        />
                        <button onClick={() => {
                            if (!chatInput.trim()) return;
                            const userMsg = { role: 'user', content: chatInput }; 
                            setChatMessages(prev => [...prev, userMsg]); 
                            setChatInput(''); 
                            setIsChatLoading(true);
                            callGeminiWithFallback(`專業投資顧問問題回答：${chatInput}`).then(({text}) => {
                                setChatMessages(prev => [...prev, { role: 'assistant', content: text }]);
                            }).catch(err => {
                                setChatMessages(prev => [...prev, { role: 'assistant', content: `抱歉，發生錯誤: ${err.message}` }]);
                            }).finally(() => setIsChatLoading(false));
                        }} disabled={isChatLoading || !chatInput.trim()} className="bg-purple-600 hover:bg-purple-700 text-white px-4 rounded-lg disabled:opacity-50 transition-colors h-[42px] flex items-center justify-center mb-[2px]">
                            <Send className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>
        )}

        {activeTab === 'history' && (
          <div className="flex flex-col lg:grid lg:grid-cols-4 gap-6 h-full pb-20 md:pb-0 items-start">
            <div className={`lg:col-span-1 w-full bg-slate-800 rounded-xl border border-slate-700 shadow-lg overflow-hidden flex flex-col h-48 lg:h-[calc(100vh-7rem)] lg:sticky lg:top-20 flex-none transition-opacity duration-300 ${isUiLocked ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
              <div className="p-4 border-b border-slate-700 bg-slate-900/50 flex justify-between items-center sticky top-0 z-10"><h3 className="font-semibold text-white flex items-center"><LineIcon className="w-5 h-5 mr-2 text-blue-400" /> 持股列表</h3></div>
              <div className="overflow-y-auto flex-1 p-2 space-y-2">
                {tradableSymbols.map((item) => (
                  <button key={item['標的']} disabled={isUiLocked} onClick={() => { if(isUiLocked) return; setHoverIndex(null); setSelectedHistorySymbol(item['標的']); setTimeframe('1y_1d'); }} className={`w-full text-left px-4 py-3 rounded-lg transition-all border ${selectedHistorySymbol === item['標的'] ? 'bg-blue-600 border-blue-500 text-white shadow-md' : 'bg-slate-700/30 border-transparent text-slate-300 hover:bg-slate-700'} ${isUiLocked ? 'cursor-not-allowed' : ''}`}>
                    <div className="flex justify-between items-center"><span className="font-bold">{String(item['標的'])}</span><span className="text-xs opacity-70">{String(item['類別'])}</span></div>
                    <div className="text-sm mt-1 truncate">{String(item['名稱'])}</div>
                    <div className="flex justify-between mt-1 text-xs opacity-60"><span>{formatCurrency(item.marketValue)}</span><span className={item.profitLoss >= 0 ? 'text-red-300' : 'text-green-300'}>{formatPercent(item.roi)}</span></div>
                  </button>
                ))}
              </div>
            </div>

            <div className="lg:col-span-3 w-full flex flex-col relative h-auto gap-4">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center border border-slate-700 bg-slate-800 rounded-xl p-3 shadow-lg gap-4">
                <div className="flex items-center gap-4 flex-wrap">
                  <h1 className="text-2xl font-bold text-white tracking-wider">{String(selectedHistorySymbol || '')}</h1>
                  <h2 className="text-lg font-bold text-slate-300">{String(tradableSymbols.find(t => t['標的'] === selectedHistorySymbol)?.['名稱'] || '')}</h2>
                  <div className={`text-2xl font-mono ${activeColorClass} font-bold ml-2 md:ml-4`}>{formatPrice(stockPrice)}</div>
                  <div className={`flex flex-col ${activeColorClass} text-xs md:text-sm font-mono`}>
                    <span>{activeSign}{Math.abs(activeChange).toFixed(2)}</span>
                    <span>({Math.abs(activeChangePercent).toFixed(2)}%)</span>
                  </div>
                  {historyError && <span className="ml-2 text-[10px] text-red-400 bg-red-950/30 px-1.5 py-0.5 rounded border border-red-900/50">{String(historyError)}</span>}
                </div>
                
                <div className={`flex items-center gap-4 flex-wrap ${isUiLocked ? 'opacity-50 pointer-events-none' : ''}`}>
                   <div className="flex bg-slate-900 rounded-lg border border-slate-700 p-0.5">
                      {[{ id: '1y_1d', label: '1年日線' }, { id: '5y_1wk', label: '5年週線' }, { id: '10y_1mo', label: '10年月線' }].map(tf => (
                         <button key={tf.id} disabled={isUiLocked} onClick={() => { setHoverIndex(null); setTimeframe(tf.id); }} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${timeframe === tf.id ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}>{String(tf.label)}</button>
                      ))}
                   </div>
                   <button
                       onClick={() => {
                           if (isUiLocked) return;
                           const key = `${selectedHistorySymbol}_${timeframe}`;
                           fetchingHistoryRef.current[key] = false;
                           setHistoricalData(prev => { const next = { ...prev }; delete next[key]; return next; });
                           fetchHistoricalData(selectedHistorySymbol, timeframe).finally(() => { fetchingHistoryRef.current[key] = false; });
                       }}
                       disabled={isUiLocked}
                       className="px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-600 text-slate-300 hover:bg-slate-700 transition-colors flex items-center bg-slate-800" title="重新抓取"
                   >
                       <RefreshCw className={`w-3 h-3 ${historyLoading ? 'animate-spin' : ''} md:mr-1`} /><span className="hidden md:inline">重抓</span>
                   </button>
                </div>
              </div>

              {historyLoading ? (
                 <div className="flex-1 flex items-center justify-center min-h-[400px] bg-slate-800 border border-slate-700 rounded-xl"><div className="flex flex-col items-center"><Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-3" /><span className="text-blue-300">計算技術指標中...</span></div></div>
              ) : currentChartData && currentChartData.length > 0 ? (
                <>
                  <Card className="h-[450px] md:h-[500px]" noPadding>
                     <div className="flex justify-between items-center p-2 border-b border-slate-700 text-xs bg-slate-900/50 z-10 relative">
                        <div className="flex gap-4 flex-wrap">
                           <span className="bg-blue-900/50 px-2 py-0.5 border border-blue-700/50 rounded flex items-center gap-1 text-blue-200 shadow-sm">主圖指標</span>
                           <span className="text-yellow-500 font-mono flex items-center">MA5: {currentMA5 > 0 ? currentMA5.toFixed(2) : '--'}</span>
                           <span className="text-cyan-400 font-mono flex items-center">MA20: {currentMA20 > 0 ? currentMA20.toFixed(2) : '--'}</span>
                           <span className="text-purple-400 font-mono flex items-center">MA60: {currentMA60 > 0 ? currentMA60.toFixed(2) : '--'}</span>
                        </div>
                     </div>
                     
                     <div className="relative flex-1 p-2 flex h-full overflow-hidden">
                        <div className="w-28 border-r border-slate-700/50 pr-2 flex flex-col gap-1 text-[11px] font-mono shrink-0 z-10 bg-slate-800">
                           <div className={`border-b border-slate-700 pb-1 mb-1 truncate ${hoverIndex !== null ? 'text-blue-400 font-bold' : 'text-slate-400'}`}>
                              {dateStr}
                           </div>
                           <TextRow label="開" value={activeCandle.open.toFixed(2)} />
                           <TextRow label="高" value={activeCandle.high.toFixed(2)} valueColor="text-red-500" />
                           <TextRow label="低" value={activeCandle.low.toFixed(2)} valueColor="text-green-500" />
                           <TextRow label="收" value={activeCandle.close.toFixed(2)} valueColor={activeColorClass} />
                           <TextRow label="量" value={Math.floor((activeCandle.volume||0)/1000).toLocaleString()} valueColor="text-yellow-500" />
                           <div className={`py-1 ${activeColorClass} border-b border-slate-700 mb-1`}>{activeSign}{Math.abs(activeChange).toFixed(2)}</div>
                           
                           <div className="text-slate-400 border-b border-slate-700 pb-1 mt-2 flex justify-between items-center">
                              <span>通道/副圖</span>
                           </div>
                           <TextRow label="布林上" value={currentBBUpper > 0 ? currentBBUpper.toFixed(2) : '--'} valueColor="text-slate-300" />
                           <TextRow label="布林下" value={currentBBLower > 0 ? currentBBLower.toFixed(2) : '--'} valueColor="text-slate-300" />
                           
                           <div className="flex gap-1 mb-1 mt-2">
                              <button onClick={() => setActiveSubChart('MACD')} className={`flex-1 py-1 rounded text-[10px] ${activeSubChart === 'MACD' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'}`}>MACD</button>
                              <button onClick={() => setActiveSubChart('KD')} className={`flex-1 py-1 rounded text-[10px] ${activeSubChart === 'KD' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'}`}>KD</button>
                              <button onClick={() => setActiveSubChart('RSI')} className={`flex-1 py-1 rounded text-[10px] ${activeSubChart === 'RSI' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'}`}>RSI</button>
                           </div>
                           {activeSubChart === 'MACD' && <TextRow label="MACD" value={currentMACD.toFixed(2)} valueColor={currentMACD > 0 ? "text-red-500" : "text-green-500"} />}
                           {activeSubChart === 'KD' && (<><TextRow label="K(9)" value={currentK.toFixed(1)} valueColor="text-yellow-400" /><TextRow label="D(9)" value={currentD.toFixed(1)} valueColor="text-blue-400" /></>)}
                           {activeSubChart === 'RSI' && <TextRow label="RSI(14)" value={currentRSI.toFixed(1)} valueColor="text-purple-400" />}
                        </div>

                        <div 
                           className="flex-1 relative bg-slate-900/30 overflow-hidden cursor-crosshair ml-1 touch-none"
                           ref={svgRef}
                           onMouseDown={handleMouseDown} onMouseUp={handleMouseUp} onMouseLeave={handleMouseLeave} onMouseMove={handleMouseMove} onWheel={handleWheel}
                           onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd} onTouchCancel={handleTouchEnd}
                        >
                           <svg width="100%" height="100%" viewBox="0 0 800 520" preserveAspectRatio="none">
                              <g stroke="#334155" strokeWidth="0.5" strokeDasharray="4 4" opacity="0.5">
                                 <line x1="0" y1="50" x2="800" y2="50" />
                                 <line x1="0" y1="150" x2="800" y2="150" />
                                 <line x1="0" y1="250" x2="800" y2="250" />
                                 {activeSubChart === 'MACD' && <line x1="0" y1="470" x2="800" y2="470" stroke="#64748b" opacity="0.3" strokeDasharray="0"/>}
                                 {activeSubChart === 'KD' && (<><line x1="0" y1="440" x2="800" y2="440" stroke="#ef4444" opacity="0.5" /><line x1="0" y1="500" x2="800" y2="500" stroke="#22c55e" opacity="0.5" /></>)}
                                 {activeSubChart === 'RSI' && (<><line x1="0" y1="450" x2="800" y2="450" stroke="#ef4444" opacity="0.5" /><line x1="0" y1="490" x2="800" y2="490" stroke="#22c55e" opacity="0.5" /></>)}
                              </g>

                              {(() => {
                                 const maxV = Math.max(...displayChartData.map(d => d.volume)) || 1;
                                 const mapVolH = (val) => (val / maxV) * 70;
                                 const maxMacdAbs = Math.max(...displayChartData.map(d => Math.abs(d.OSC || 0)), 0.01);
                                 const mapMacdY = (val) => 470 - (val / maxMacdAbs) * 45; 
                                 const spacing = 800 / Math.max(displayChartData.length, 1);
                                 const barW = Math.max(1, spacing * 0.7);

                                 return displayChartData.map((d, i) => {
                                    const x = spacing * 0.5 + i * spacing;
                                    const isUpK = d.close >= d.open;
                                    const kColor = isUpK ? "#ef4444" : "#22c55e";
                                    const osc = d.OSC || 0;
                                    const oscColor = osc >= 0 ? "#ef4444" : "#22c55e";

                                    return (
                                      <g key={i}>
                                        <line x1={x} y1={mapPriceY(d.high)} x2={x} y2={mapPriceY(d.low)} stroke={kColor} strokeWidth={barW>3?1.5:1} />
                                        <rect x={x-barW/2} y={mapPriceY(Math.max(d.open, d.close))} width={barW} height={Math.max(1, Math.abs(mapPriceY(d.open) - mapPriceY(d.close)))} fill={kColor} />
                                        <rect x={x-barW/2} y={400 - mapVolH(d.volume)} width={barW} height={mapVolH(d.volume)} fill={kColor} opacity="0.5" />
                                        {activeSubChart === 'MACD' && <rect x={x-barW/2} y={osc >= 0 ? mapMacdY(osc) : 470} width={barW} height={Math.max(1, Math.abs(mapMacdY(osc) - 470))} fill={oscColor} opacity="0.7" />}
                                      </g>
                                    );
                                 });
                              })()}

                              {(() => {
                                 const maxMacdAbs = Math.max(...displayChartData.map(d => Math.abs(d.OSC || 0)), 0.01);
                                 const mapMacdY = (val) => 470 - (val / maxMacdAbs) * 45;
                                 const mapKdY = (val) => 520 - (val / 100) * 100;
                                 const mapRsiY = (val) => 520 - (val / 100) * 100;
                                 const spacing = 800 / Math.max(displayChartData.length, 1);
                                 
                                 const buildPath = (dataKey, mapFn) => {
                                    return displayChartData.map((d, i) => {
                                       const val = d[dataKey];
                                       if (val === null || val === undefined) return '';
                                       const x = spacing * 0.5 + i * spacing;
                                       return `${i===0?'M':'L'} ${x},${mapFn(val)}`;
                                    }).join(' ');
                                 };

                                 return (
                                    <g fill="none" strokeWidth="1.5">
                                       <path d={buildPath('BBU', mapPriceY)} stroke="#8b5cf6" strokeWidth="1" strokeDasharray="3 3" opacity="0.6" />
                                       <path d={buildPath('BBL', mapPriceY)} stroke="#8b5cf6" strokeWidth="1" strokeDasharray="3 3" opacity="0.6" />
                                       <path d={buildPath('MA5', mapPriceY)} stroke="#eab308" />
                                       <path d={buildPath('MA20', mapPriceY)} stroke="#22d3ee" />
                                       <path d={buildPath('MA60', mapPriceY)} stroke="#c084fc" />
                                       {activeSubChart === 'MACD' && (<><path d={buildPath('DIF', mapMacdY)} stroke="#f59e0b" strokeWidth="1" /><path d={buildPath('Signal', mapMacdY)} stroke="#3b82f6" strokeWidth="1" /></>)}
                                       {activeSubChart === 'KD' && (<><path d={buildPath('K', mapKdY)} stroke="#facc15" strokeWidth="1.2" /><path d={buildPath('D', mapKdY)} stroke="#60a5fa" strokeWidth="1.2" /></>)}
                                       {activeSubChart === 'RSI' && <path d={buildPath('RSI14', mapRsiY)} stroke="#c084fc" strokeWidth="1.2" />}
                                    </g>
                                 );
                              })()}

                              {(() => {
                                 const spacing = 800 / Math.max(displayChartData.length, 1);
                                 return displayChartData.map((d, i) => {
                                    if (!d.buyAction) return null;
                                    const x = spacing * 0.5 + i * spacing;
                                    const buyPrice = d.buyPricePoint || d.close;
                                    const y = mapPriceY(buyPrice);
                                    const strategy = d.buyAction['策略'] || 'default';
                                    const config = STRATEGY_CONFIG[strategy] || STRATEGY_CONFIG['default'];
                                    return <g key={`buy-${i}`}>{renderShape(config.shape, x, y, config.color, 5)}</g>;
                                 });
                              })()}

                              {safeHoverIndex !== null && displayChartData[safeHoverIndex] && (() => {
                                  const spacing = 800 / displayChartData.length;
                                  const x = spacing * 0.5 + safeHoverIndex * spacing;
                                  const y = mapPriceY(displayChartData[safeHoverIndex].close);
                                  return (
                                     <g>
                                        <line x1={x} y1="0" x2={x} y2="520" stroke="#94a3b8" strokeWidth="1" strokeDasharray="3 3" opacity="0.8" />
                                        <line x1="0" y1={y} x2="800" y2={y} stroke="#94a3b8" strokeWidth="1" strokeDasharray="3 3" opacity="0.8" />
                                        <circle cx={x} cy={y} r="3" fill={displayChartData[safeHoverIndex].close >= displayChartData[safeHoverIndex].open ? "#ef4444" : "#22c55e"} />
                                     </g>
                                  );
                              })()}
                           </svg>
                        </div>
                        
                        <div className="w-10 border-l border-slate-700/50 pl-1 py-1 flex flex-col text-[10px] text-slate-500 font-mono relative shrink-0 bg-slate-800">
                           {displayChartData.length > 0 && (
                              <div className="absolute top-0 bottom-0 w-full flex flex-col py-0">
                                 <div className="flex flex-col justify-between" style={{ height: '57.69%' }}>
                                    <span>{paddedMax.toFixed(0)}</span>
                                    <span>{((paddedMax+paddedMin)/2).toFixed(0)}</span>
                                    <span>{paddedMin.toFixed(0)}</span>
                                 </div>
                                 <div style={{ height: '3.85%' }}></div>
                                 <div className="flex flex-col justify-end text-yellow-500 pb-1" style={{ height: '15.38%' }}>Vol</div>
                                 <div style={{ height: '3.85%' }}></div>
                                 <div className="flex flex-col justify-between pt-1 pb-1" style={{ height: '19.23%' }}>
                                    {activeSubChart === 'MACD' && <div className="h-full flex items-center text-blue-400">MACD</div>}
                                    {activeSubChart === 'KD' && (<><span className="text-yellow-400">80</span><span className="text-slate-600">KD</span><span className="text-yellow-400">20</span></>)}
                                    {activeSubChart === 'RSI' && (<><span className="text-purple-400">70</span><span className="text-slate-600">RSI</span><span className="text-purple-400">30</span></>)}
                                 </div>
                              </div>
                           )}
                        </div>
                     </div>

                     <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 px-2 py-1.5 border-t border-slate-700/50 text-[10px] text-slate-400 bg-slate-900/50">
                        <span className="font-semibold text-slate-300">圖例說明:</span>
                        {Object.entries(STRATEGY_CONFIG).map(([key, config]) => key === 'default' ? null : (
                           <div key={key} className="flex items-center">
                              <svg width="14" height="14" className="mr-1 overflow-visible">{renderShape(config.shape, 7, 7, config.color, 4)}</svg>
                              {String(config.label)}
                           </div>
                        ))}
                     </div>
                  </Card>

                  <div className="mt-4 bg-slate-800 rounded-xl border border-slate-700 shadow-lg p-4">
                      <div className="flex items-center justify-between cursor-pointer" onClick={() => setShowManualPatch(!showManualPatch)}>
                        <h4 className="text-sm font-semibold text-slate-300 flex items-center"><Edit className="w-4 h-4 mr-2 text-purple-400" /> 手動補齊 / 修正歷史 K 線 (OHLCV)</h4>
                        {showManualPatch ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                      </div>
                      {showManualPatch && (
                          <div className="mt-4 pt-4 border-t border-slate-700 space-y-4 animate-fade-in">
                              <p className="text-xs text-slate-400 leading-relaxed">完整支援開盤、最高、最低、收盤與成交量手動修補。</p>
                              <div className="grid grid-cols-2 md:grid-cols-6 gap-3 items-end">
                                  <div><label className="block text-[10px] text-slate-500 mb-1">日期</label><input type="date" value={patchDate} onChange={(e)=>setPatchDate(e.target.value)} className="bg-slate-900 border border-slate-600 text-white px-2 py-1.5 rounded text-xs w-full" /></div>
                                  <div><label className="block text-[10px] text-slate-500 mb-1">開盤價</label><input type="number" step="0.01" value={patchOpen} onChange={(e)=>setPatchOpen(e.target.value)} className="bg-slate-900 border border-slate-600 text-white px-2 py-1.5 rounded text-xs w-full" placeholder="選填" /></div>
                                  <div><label className="block text-[10px] text-slate-500 mb-1">最高價</label><input type="number" step="0.01" value={patchHigh} onChange={(e)=>setPatchHigh(e.target.value)} className="bg-slate-900 border border-slate-600 text-white px-2 py-1.5 rounded text-xs w-full" placeholder="選填" /></div>
                                  <div><label className="block text-[10px] text-slate-500 mb-1">最低價</label><input type="number" step="0.01" value={patchLow} onChange={(e)=>setPatchLow(e.target.value)} className="bg-slate-900 border border-slate-600 text-white px-2 py-1.5 rounded text-xs w-full" placeholder="選填" /></div>
                                  <div><label className="block text-[10px] text-slate-500 mb-1">收盤價</label><input type="number" step="0.01" value={patchPrice} onChange={(e)=>setPatchPrice(e.target.value)} className="bg-slate-900 border border-slate-600 text-white px-2 py-1.5 rounded text-xs w-full" placeholder="必填" /></div>
                                  <div><label className="block text-[10px] text-slate-500 mb-1">成交量</label><input type="number" value={patchVolume} onChange={(e)=>setPatchVolume(e.target.value)} className="bg-slate-900 border border-slate-600 text-white px-2 py-1.5 rounded text-xs w-full" placeholder="選填" /></div>
                              </div>
                              <button onClick={handleAddPatch} className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-1.5 rounded text-xs transition-colors shadow-lg">新增 / 覆寫點位</button>
                          </div>
                      )}
                  </div>

                  <div className="flex flex-col mt-4 relative z-10 bg-slate-800 rounded-xl border border-slate-700 shadow-lg p-4">
                    <div className="flex-none flex items-center justify-between mb-4 flex-wrap gap-2">
                        <div className="flex items-center flex-wrap gap-2">
                            <Sparkles className="w-5 h-5 text-purple-400 mr-2 flex-none" />
                            <h4 className="text-white font-semibold">AI 智能分析與決策</h4>
                            {cloudReports[selectedHistorySymbol] && (
                                <span className="text-[11px] bg-blue-900/40 text-blue-300 px-2 py-0.5 rounded border border-blue-500/30 flex items-center">
                                    <Cloud className="w-3 h-3 mr-1" /> 雲端同步報告: {cloudReports[selectedHistorySymbol].time}
                                </span>
                            )}
                        </div>
                        <div className="flex gap-2 items-center flex-wrap">
                            <select value={analysisMode} onChange={(e) => setAnalysisMode(e.target.value)} className="bg-slate-900 border border-slate-700 text-xs px-3 py-1.5 rounded text-white focus:outline-none">
                                <option value="comprehensive">綜合趨勢分析 (市場定價與新聞影響)</option>
                                <option value="backtest">回測交易策略</option>
                            </select>
                            <button onClick={() => generateFullAnalysis(selectedHistorySymbol, historicalData[`${selectedHistorySymbol}_${timeframe}`], true)} disabled={isAiSummarizing} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-xs flex items-center">
                                {isAiSummarizing ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Sparkles className="w-3 h-3 mr-1" />} 重新分析並同步至表單
                            </button>
                        </div>
                    </div>
                    <div className="bg-slate-900/50 rounded-lg p-4 md:p-5 border border-slate-700 shadow-inner min-h-[100px]">
                      {isAiSummarizing ? (
                        <div className="flex items-center text-slate-400 text-sm py-4"><Loader2 className="w-5 h-5 animate-spin mr-2" />{String(aiProgressMsg || 'AI 正在運算中...')}</div>
                      ) : (
                        <>
                          {aiSummary ? <div className="mb-4"><p className="text-slate-200 text-sm md:text-base font-medium leading-relaxed border-l-4 border-purple-500 pl-4">{String(aiSummary)}</p></div> : <div className="text-slate-500 text-sm py-4">尚未進行分析，請點擊上方「重新分析並同步至表單」。</div>}
                          {aiDetail && (<div className={`pt-4 border-t border-slate-700/50 transition-all duration-300 ${isDetailExpanded ? 'block' : 'hidden'}`}><div className="prose prose-invert max-w-none text-slate-300 whitespace-pre-wrap leading-relaxed text-sm md:text-base">{String(aiDetail)}</div></div>)}
                        </>
                      )}
                    </div>
                  </div>
                </>
              ) : <div className="flex-1 flex items-center justify-center min-h-[400px] text-slate-500 bg-slate-800 border border-slate-700 rounded-xl">{historyError ? <span className="text-red-400">{String(historyError)}</span> : "請選擇左側標的以查看走勢"}</div>}
            </div>
          </div>
        )}

        {activeTab === 'holdings' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center px-2">
              <h3 className="text-lg font-semibold text-white flex items-center"><FileText className="w-5 h-5 mr-2 text-blue-400" /> 持股策略與自動分析雲端設定</h3>
              <button onClick={() => fetchRealTimePrices(rawData)} className="text-xs flex items-center text-blue-400 hover:text-blue-300 transition-colors"><RefreshCw className={`w-3 h-3 mr-1 ${priceLoading ? 'animate-spin' : ''}`} />{priceLoading ? '更新中...' : '立即更新股價'}</button>
            </div>
            
            <div className="bg-slate-800 rounded-xl border border-slate-700 shadow-lg overflow-x-auto p-4">
              <table className="min-w-full divide-y divide-slate-700 text-sm">
                <thead>
                  <tr className="text-slate-400 text-left">
                    <th className="p-3">標的</th>
                    <th className="p-3">名稱</th>
                    <th className="p-3">資產定位</th>
                    <th className="p-3">定期定額 (DCA)</th>
                    <th className="p-3">加碼策略 1</th>
                    <th className="p-3">加碼策略 2</th>
                    <th className="p-3">雲端自動分析</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {tradableSymbols.map(row => {
                    const s = investmentSettings[row['標的']] || { type: 'CORE', isDCA: false, addon: 'PYRAMID', addon2: 'NONE' };
                    const autoVal = autoSettings[row['標的']] !== undefined ? autoSettings[row['標的']] : (s.autoAnalyze !== false);
                    return (
                      <tr key={row['標的']} className="hover:bg-slate-700/50">
                        <td className="p-3 font-bold text-white">{row['標的']}</td>
                        <td className="p-3 text-slate-300">{row['名稱']}</td>
                        <td className="p-3">
                          <select value={s.type} onChange={(e) => handleSettingChange(row['標的'], 'type', e.target.value)} className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white">
                            <option value="CORE">核心</option>
                            <option value="SATELLITE">衛星</option>
                          </select>
                        </td>
                        <td className="p-3">
                          <input type="checkbox" checked={s.isDCA} onChange={(e) => handleSettingChange(row['標的'], 'isDCA', e.target.checked)} className="w-4 h-4 accent-blue-600 cursor-pointer" />
                        </td>
                        <td className="p-3">
                          <select value={s.addon} onChange={(e) => handleSettingChange(row['標的'], 'addon', e.target.value)} className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white">
                            <option value="PYRAMID">跌幅金字塔</option>
                            <option value="TECHNICAL">技術指標</option>
                            <option value="YIELD_MACRO">總經/殖利率</option>
                          </select>
                        </td>
                        <td className="p-3">
                          <select value={s.addon2} onChange={(e) => handleSettingChange(row['標的'], 'addon2', e.target.value)} className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white">
                            <option value="NONE">無</option>
                            <option value="PYRAMID">跌幅金字塔</option>
                            <option value="TECHNICAL">技術指標</option>
                            <option value="YIELD_MACRO">總經/殖利率</option>
                          </select>
                        </td>
                        <td className="p-3">
                          <button onClick={() => updateAutoSettingToCloud(row['標的'], !autoVal)} className={`px-3 py-1 rounded text-xs font-bold transition-colors ${autoVal ? 'bg-green-600 text-white' : 'bg-slate-700 text-slate-400'}`}>
                            {autoVal ? 'ON' : 'OFF'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'config' && (
          <div className="max-w-xl mx-auto bg-slate-800 p-8 rounded-xl border border-slate-700 space-y-4 mb-20">
            <h2 className="text-xl font-bold text-white flex items-center"><Settings className="w-5 h-5 mr-2 text-blue-400" /> 系統與雲端雙向同步設定</h2>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Google Sheets CSV 連結</label>
              <input type="text" value={sheetUrl} onChange={(e) => setSheetUrl(e.target.value)} placeholder="https://docs.google.com/spreadsheets/d/.../pub?output=csv" className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white text-sm" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Google Apps Script (GAS) 部署網址</label>
              <input type="text" value={gasUrl} onChange={(e) => setGasUrl(e.target.value)} placeholder="https://script.google.com/macros/s/.../exec" className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white text-sm" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Gemini API Key</label>
              <input type="password" value={geminiApiKey} onChange={(e) => setGeminiApiKey(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white text-sm" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">選擇 AI 模型</label>
              <select value={selectedModel} onChange={(e) => setSelectedModel(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white text-sm">
                {AVAILABLE_MODELS.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
            <button onClick={() => {
              localStorage.setItem('investment_sheet_url', sheetUrl);
              localStorage.setItem('gas_url', gasUrl);
              localStorage.setItem('gemini_api_key', geminiApiKey);
              localStorage.setItem('gemini_model', selectedModel);
              setToast("設定已儲存！");
              loadCloudReportsFromSheet(gasUrl);
            }} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded font-medium text-sm">儲存設定</button>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;