import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  ComposedChart, Line, Area, Bar, BarChart, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, 
  Tooltip as RechartsTooltip, Legend, ResponsiveContainer, ReferenceLine, Scatter
} from 'recharts';
import { 
  PieChart as PieIcon, ArrowUpCircle, ArrowDownCircle, RefreshCw, Settings, 
  TrendingUp, DollarSign, Briefcase, FileText, AlertCircle, BarChart2, 
  Loader2, Wifi, WifiOff, LineChart as LineIcon, Info, AlertTriangle, 
  ArrowUp, ArrowDown, ArrowUpDown, Move, Sparkles, Bot, ChevronDown, ChevronUp, FileSearch, Save, Key, Cpu, Calculator, Globe, CheckCircle, Database, BrainCircuit, Lock, MessageSquare, Send, Target, Clock, Activity, ClipboardCheck, ShieldAlert, Crosshair
} from 'lucide-react';

/**
 * Alpha 投資戰情室 v40.3
 * * 修復日誌：
 * 1. [Critical Fix] 強化日期匹配邏輯：
 * 針對使用者匯入的「台灣日期」可能與「美股/國際股市日期」存在時差 (T+1) 或落於假日的問題，
 * 實作了「智慧鄰近匹配 (Smart Nearest Matching)」。若無法精確匹配日期，會自動尋找前後 7 天內最近的交易日 K 線進行標記。
 */

// --- 靜態配置與輔助函式 ---

const DEMO_DATA = [
  { 日期: '2015-01-15', 標的: '2330.TW', 名稱: '台積電', 類別: '股票', 價格: 140, 股數: 1000, 策略: '基礎買入', 金額: 140000 },
  { 日期: '2019-08-15', 標的: '2330.TW', 名稱: '台積電', 類別: '股票', 價格: 250, 股數: 500, 策略: 'MA60有撐', 金額: 125000 },
  { 日期: '2020-03-20', 標的: '2330.TW', 名稱: '台積電', 類別: '股票', 價格: 270, 股數: 500, 策略: '金字塔_S1', 金額: 135000 },
  { 日期: '2021-05-15', 標的: '2330.TW', 名稱: '台積電', 類別: '股票', 價格: 550, 股數: 200, 策略: 'K值超賣', 金額: 110000 },
  { 日期: '2022-01-10', 標的: '2330.TW', 名稱: '台積電', 類別: '股票', 價格: 600, 股數: 100, 策略: '金字塔_S2', 金額: 60000 },
  { 日期: '2018-02-20', 標的: '0050.TW', 名稱: '元大台灣50', 類別: '股票', 價格: 80, 股數: 2000, 策略: '基礎買入', 金額: 160000 },
  { 日期: '2022-10-25', 標的: '0050.TW', 名稱: '元大台灣50', 類別: '股票', 價格: 100, 股數: 1000, 策略: 'MA120有撐', 金額: 100000 },
  { 日期: '2021-03-10', 標的: 'BND', 名稱: '總體債券ETF', 類別: '債券', 價格: 85, 股數: 100, 策略: '基礎買入', 金額: 255000 },
  { 日期: '2023-06-01', 標的: 'USD-TD', 名稱: '美元定存', 類別: '定存', 價格: 1, 股數: 10000, 策略: '基礎買入', 金額: 305000 }, 
  { 日期: '2023-07-01', 標的: 'TWD-TD', 名稱: '台幣定存', 類別: '定存', 價格: 1, 股數: 100000, 策略: '基礎買入', 金額: 100000 }, 
];

const COLORS = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#6366F1'];

const STRATEGY_CONFIG = {
  '基礎買入':     { color: '#EF4444', label: '基礎買入',      shape: 'circle' },
  '金字塔_S1':    { color: '#F97316', label: '金字塔_S1',     shape: 'triangle' },
  '金字塔_S2':    { color: '#EAB308', label: '金字塔_S2',     shape: 'triangle' },
  '金字塔_S3':    { color: '#84CC16', label: '金字塔_S3',     shape: 'triangle' },
  'K值超賣':      { color: '#3B82F6', label: 'K值超賣',       shape: 'diamond' },
  'MA60有撐':     { color: '#8B5CF6', label: 'MA60有撐',      shape: 'star' },
  'MA120有撐':    { color: '#06B6D4', label: 'MA120有撐',     shape: 'square' },
  'default':      { color: '#64748B', label: '其他策略',      shape: 'cross' }
};

const CATEGORY_STYLES = {
  '股票': { color: '#3B82F6', badge: 'bg-blue-900 text-blue-200' },       
  '債券': { color: '#A855F7', badge: 'bg-purple-900 text-purple-200' },   
  '定存': { color: '#22C55E', badge: 'bg-green-900 text-green-200' },     
  'default': { color: '#64748B', badge: 'bg-slate-700 text-slate-300' }   
};

// UPDATED MODEL LIST
const AVAILABLE_MODELS = [
  { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash Preview (最新快速)' },
  { id: 'gemini-3-pro-preview', name: 'Gemini 3 Pro Preview (最新精準)' },
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash (平衡)' },
  { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro (進階)' },
];

const ASSET_TYPES = {
  'CORE': { label: '核心資產', color: 'text-blue-300', bg: 'bg-blue-900/50', border: 'border-blue-500/50' },
  'SATELLITE': { label: '衛星資產', color: 'text-orange-300', bg: 'bg-orange-900/50', border: 'border-orange-500/50' }
};

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
const savePriceCache = (newPrices) => {
    const cache = getPriceCache();
    const today = getTodayDate();
    const updatedCache = { ...cache };
    Object.keys(newPrices).forEach(symbol => { updatedCache[symbol] = { price: newPrices[symbol], date: today, timestamp: Date.now() }; });
    localStorage.setItem('investment_price_cache', JSON.stringify(updatedCache));
};

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

const detectAssetType = (symbol, name, category) => {
  if (category === '債券' || name.includes('債')) return 'BOND';
  if (category === '股票') {
    if (symbol.startsWith('00') || name.toUpperCase().includes('ETF') || name.includes('基金')) {
      return 'ETF';
    }
    return 'STOCK';
  }
  return 'STOCK'; 
};

const isUsAsset = (symbol) => {
    return !symbol.includes('.TW') && !symbol.includes('.TWO') && symbol !== '定存' && !symbol.includes('TWD=X');
};

const fetchWithProxyFallback = async (targetUrl) => {
  const proxies = [
    (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
    (url) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
    (url) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
  ];
  for (const proxyGen of proxies) {
    try {
      const response = await fetch(proxyGen(targetUrl));
      if (!response.ok) throw new Error('Proxy error');
      return await response.json();
    } catch (e) { console.warn('Proxy failed, trying next...', e); await delay(500); }
  }
  throw new Error('All proxies failed');
};

// --- 技術指標計算 ---
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

const calculateKD = (data, period = 9) => {
  let k = 50; let d = 50; 
  return data.map((item, index, arr) => {
    if (index < period - 1) return { ...item, K: null, D: null };
    const slice = arr.slice(index - period + 1, index + 1);
    const highs = slice.map(d => d.high);
    const lows = slice.map(d => d.low);
    const highestHigh = Math.max(...highs);
    const lowestLow = Math.min(...lows);
    let rsv = 50;
    if (highestHigh !== lowestLow) { rsv = ((item.close - lowestLow) / (highestHigh - lowestLow)) * 100; }
    k = (2/3) * k + (1/3) * rsv;
    d = (2/3) * d + (1/3) * k;
    return { ...item, K: k, D: d };
  });
};

const calculateMACD = (data) => {
  const ema12 = calculateEMA(data, 12, 'close');
  const ema26 = calculateEMA(data, 26, 'close');
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
  let d = calculateSMA(rawData, 20);
  d = calculateSMA(d, 60);
  d = calculateSMA(d, 120);
  d = calculateKD(d, 9);
  d = calculateMACD(d);
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

// UI Component: Toast Notification
const Toast = ({ message, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed bottom-20 md:bottom-10 left-1/2 transform -translate-x-1/2 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg flex items-center z-[100] animate-fade-in-up">
      <CheckCircle className="w-5 h-5 mr-2" />
      <span>{message}</span>
    </div>
  );
};

// --- 主要元件 ---

const Dashboard = () => {
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
  const [usdRate, setUsdRate] = useState(1); 
  const [updateError, setUpdateError] = useState(null);
  const [historicalData, setHistoricalData] = useState({});
  const [selectedHistorySymbol, setSelectedHistorySymbol] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState(null); 
  const [timeframe, setTimeframe] = useState('5y_1wk'); 
   
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
  const [selectedModel, setSelectedModel] = useState('gemini-2.5-flash'); 
  const [aiSignals, setAiSignals] = useState({}); 

  // Portfolio Health Check State
  const [portfolioHealth, setPortfolioHealth] = useState(null);
  const [isHealthChecking, setIsHealthChecking] = useState(false);
   
  // Asset Classifications (Core/Satellite)
  const [assetClassifications, setAssetClassifications] = useState({});

  // Chat State
  const [chatMessages, setChatMessages] = useState([
    { role: 'assistant', content: '您好！我是您的 AI 投資助理。我可以根據您的持股狀況與投資分類回答問題，請試著問我：「我的核心資產績效如何？」或「目前投資組合風險？」' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatEndRef = useRef(null);

  // Race Condition Control
  const analysisInProgressRef = useRef({});

  // Fee Settings
  const [feeDiscount, setFeeDiscount] = useState(1); 
  const [toast, setToast] = useState(null);

  const processData = (data, pricesMap) => {
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
       
      let fxRate = 1;
      let currentPriceRaw = buyPriceRaw;

      if (isTD) {
          const currency = symbol.replace('-TD', '');
          if (currency === 'TWD') {
              fxRate = 1;
          } else {
              const ticker = currency === 'USD' ? 'TWD=X' : `${currency}TWD=X`;
              fxRate = pricesMap[ticker] || 1; 
          }
          currentPriceRaw = 1; 
      } else if (isUS) {
          fxRate = currentUsdRate; 
          currentPriceRaw = pricesMap?.[symbol] || buyPriceRaw;
      } else {
          fxRate = 1;
          currentPriceRaw = category === '定存' ? buyPriceRaw : (pricesMap?.[symbol] || buyPriceRaw);
      }

      const buyPriceTwd = buyPriceRaw * fxRate;
      const currentPriceTwd = currentPriceRaw * fxRate;
      const costBasisTwd = costBasisRaw; 

      const marketValueTwd = shares * currentPriceTwd;
       
      const assetType = detectAssetType(symbol, name, category);
      let taxRate = 0;
      let feeRate = 0;

      if (!isUS && category !== '定存') {
          feeRate = 0.001425 * feeDiscount;
          if (assetType === 'ETF') taxRate = 0.001;
          else if (assetType === 'BOND') taxRate = 0;
          else taxRate = 0.003; 
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
        isRealData: !!(pricesMap?.[symbol] || (isTD && pricesMap?.[isTD ? (symbol.replace('-TD','')==='USD'?'TWD=X':`${symbol.replace('-TD','')}TWD=X`) : '']))
      };
    });
    setPortfolioData(enrichedData);
    setRawData(data);
  };

  const fetchRealTimePrices = async (data, forceUpdate = false) => {
    setPriceLoading(true);
    setUpdateError(null);
    setLoadingMessage('更新即時股價中...');
    
    const uniqueSymbols = [...new Set(data.map(item => item['標的']))];
    if (!uniqueSymbols.includes('TWD=X')) uniqueSymbols.push('TWD=X');

    data.forEach(item => {
        if (item['類別'] === '定存' && item['標的'].includes('-TD')) {
            const currency = item['標的'].replace('-TD', '');
            if (currency !== 'TWD') { 
                const ticker = currency === 'USD' ? 'TWD=X' : `${currency}TWD=X`;
                if (!uniqueSymbols.includes(ticker)) uniqueSymbols.push(ticker);
            }
        }
    });

    const today = getTodayDate();
    const cache = getPriceCache();
    const newPrices = { ...realTimePrices }; 
    
    const symbolsToFetch = uniqueSymbols.filter(symbol => {
        if (symbol === '定存' || symbol.includes('-TD')) return false; 
        if (!cache[symbol]) return true;
        if (cache[symbol].date !== today) return true;
        if (forceUpdate) return true;
        newPrices[symbol] = cache[symbol].price;
        return false; 
    });

    if (symbolsToFetch.length > 0) {
        const failedSymbols = [];
        const promises = symbolsToFetch.map(async (symbol) => {
          const maxRetries = 2;
          let attempts = 0;
          let success = false;
          await delay(Math.random() * 1500); 

          while(attempts <= maxRetries && !success) {
            try {
              const targetUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d&t=${Date.now()}`;
              const result = await fetchWithProxyFallback(targetUrl);
              const meta = result?.chart?.result?.[0]?.meta;
              
              if (meta && meta.regularMarketPrice) {
                newPrices[symbol] = meta.regularMarketPrice;
                success = true;
              } else { throw new Error('Data format error'); }
            } catch (err) {
              attempts++;
              if (attempts <= maxRetries) {
                setLoadingMessage(`更新 ${symbol} 失敗，正在重試 (${attempts}/${maxRetries})...`);
                await delay(1000);
              } else {
                console.warn(`標的 ${symbol} 更新失敗:`, err);
                failedSymbols.push(symbol);
              }
            }
          }
        });

        await Promise.all(promises);
        if (failedSymbols.length > 0) setUpdateError(`更新失敗的標的: ${failedSymbols.join(', ')}`);
        savePriceCache(newPrices);
    }
    
    if (newPrices['TWD=X']) setUsdRate(newPrices['TWD=X']);
    setRealTimePrices(newPrices);
    
    // Clear Caches for Re-calculation
    setHistoricalData({}); // Clear Technical Cache (Memory)
    localStorage.removeItem('gemini_analysis_cache'); // Clear AI Cache (Storage)
    setAiSignals({}); // Clear Signals (Signal Clearing)
    setAiSummary(null); // Clear Display
    setAiDetail(null);
    setUsedModel(null);
    setPortfolioHealth(null); // Clear Health Check
    
    setPriceLoading(false);
    setLastUpdated(new Date()); 
    setLoadingMessage('更新即時股價中...'); 
    processData(data, newPrices);
  };

  const callGeminiWithFallback = async (prompt) => {
    if (!geminiApiKey) {
      const confirm = window.confirm("尚未設定 AI 金鑰。\n\n單機版需要您自己的 Google Gemini API Key 才能運作 AI 分析功能。\n\n是否現在前往「設定」頁面輸入？");
      if (confirm) setActiveTab('config');
      throw new Error("請先至「設定」頁面儲存 API Key");
    }

    const defaultModels = AVAILABLE_MODELS.map(m => m.id);
    const models = [selectedModel, ...defaultModels.filter(m => m !== selectedModel)];

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); 

    try {
      for (const model of models) {
        try {
          const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                  maxOutputTokens: 8192,
                }
              }),
              signal: controller.signal
            }
          );

          if (!response.ok) {
            console.warn(`Model ${model} failed: ${response.status}`);
            continue;
          }

          const data = await response.json();
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            return { text, model }; 
          }
        } catch (err) {
          console.error(`Error calling ${model}:`, err);
        }
      }
    } finally {
      clearTimeout(timeoutId);
    }
    throw new Error("AI 服務連線失敗，請檢查 API Key 權限或網路狀態。");
  };

  const handleClassificationChange = (symbol, value) => {
    const newClassifications = { ...assetClassifications, [symbol]: value };
    setAssetClassifications(newClassifications);
    localStorage.setItem('investment_asset_classifications', JSON.stringify(newClassifications));
  };

  // --- Portfolio Health Check Function ---
  const generatePortfolioHealthCheck = async () => {
    if (!geminiApiKey) {
        alert("請先設定 API Key");
        setActiveTab('config');
        return;
    }
    if (isHealthChecking) return;
    setIsHealthChecking(true);
    setPortfolioHealth(null);

    // Prepare Summary Data
    const totalAsset = summary.totalValue;
    const topHoldings = sortedHoldings.slice(0, 5).map(h => `${h['名稱']}(${h['標的']}): ${formatPercent(h.marketValue / totalAsset)}`);
    const allocationStr = allocationData.map(d => `${d.name} ${formatPercent(d.percentage)}`).join(', ');

    const prompt = `
      角色：首席投資長 (CIO) 與風險控管經理。
      任務：對目前的投資組合進行總體風險與健康度健檢。
      
      【資產數據】
      - 總資產：${formatCurrency(summary.totalValue)}
      - 總損益：${formatCurrency(summary.totalPL)} (ROI: ${formatPercent(summary.totalROI)})
      - 資產配置：${allocationStr}
      - 前五大持股 (集中度風險)：${topHoldings.join(', ')}
      
      請分析並輸出以下格式 (請嚴格遵守 TAG 格式，不要使用 Markdown 代碼區塊)：
      
      [SCORE]
      (請給出 0-100 的分數，根據風險分散性與配置合理性評分)
      
      [RISK]
      (低風險 / 中低風險 / 中風險 / 中高風險 / 高風險 - 請選一個)
      
      [COMMENT]
      (200字以內的總評，包含風險提示與資產配置建議。語氣專業、客觀)
      
      [SUGGESTION]
      (請列出 3 點具體調整方向，每點一行，例如「增加債券部位以降低波動」或「減少單一持股佔比」)
    `;

    try {
        const { text } = await callGeminiWithFallback(prompt);
        
        // Simple Parsing Logic
        const scoreMatch = text.match(/\[SCORE\]\s*(\d+)/i);
        const riskMatch = text.match(/\[RISK\]\s*(.+)/i);
        const commentMatch = text.match(/\[COMMENT\]\s*([\s\S]*?)\s*(?=\[SUGGESTION\]|$)/i);
        const suggestionMatch = text.match(/\[SUGGESTION\]\s*([\s\S]*)/i);

        setPortfolioHealth({
            score: scoreMatch ? parseInt(scoreMatch[1]) : 0,
            risk: riskMatch ? riskMatch[1].trim() : "未知",
            comment: commentMatch ? commentMatch[1].trim() : "無法解析評論",
            suggestions: suggestionMatch ? suggestionMatch[1].trim().split('\n').filter(s => s.trim().length > 0) : []
        });

    } catch (err) {
        setPortfolioHealth({
            score: 0,
            risk: "Error",
            comment: "AI 分析失敗，請稍後再試。",
            suggestions: []
        });
    } finally {
        setIsHealthChecking(false);
    }
  };

  const generateFullAnalysis = async (symbol, data, forceUpdate = false) => {
    if (!data || data.length === 0) return;
    
    if (analysisInProgressRef.current[symbol]) return;
    analysisInProgressRef.current[symbol] = true;

    const latest = data[data.length - 1];
    const dataDate = latest.date;
    const today = getTodayDate();
    const cache = getAiCache();

    if (!forceUpdate && cache[symbol] && cache[symbol].date === today && cache[symbol].summary && cache[symbol].detail) {
      setAiSummary(String(cache[symbol].summary));
      setAiDetail(String(cache[symbol].detail));
      if (cache[symbol].signal) setAiSignals(prev => ({ ...prev, [symbol]: cache[symbol].signal }));
      setUsedModel(cache[symbol].model); 
      setIsCachedResult(true); 
      setAnalysisSymbol(symbol);
      setIsDetailExpanded(true); 
      setIsAiSummarizing(false); 
      delete analysisInProgressRef.current[symbol];
      return;
    }

    setIsAiSummarizing(true); 
    setAiSummary(null);
    setAiDetail(null); 
    setUsedModel(null); 
    setIsCachedResult(false); 
    setAnalysisSymbol(symbol); 
    
    setAiSignals(prev => {
        const next = { ...prev };
        delete next[symbol];
        return next;
    });

    const assetInfo = tradableSymbols.find(t => t['標的'] === symbol);
    const stockName = assetInfo?.['名稱'] || symbol;
    const category = assetInfo?.['類別'] || '股票';
    const assetType = detectAssetType(symbol, stockName, category);
    
    const classification = assetClassifications[symbol] || 'CORE'; 
    const classLabel = ASSET_TYPES[classification].label;
    const performanceInfo = assetInfo ? `目前損益：${formatCurrency(assetInfo.profitLoss)} (ROI: ${formatPercent(assetInfo.roi)})。` : "";

    const currentPrice = realTimePrices[symbol] || latest.close;

    // Enhanced Strategy Logic based on User Selection
    const strategyLogic = classification === 'CORE' 
        ? "【核心資產策略 (CORE)】此類資產追求長期穩健，以「左側交易」為主。策略：(1) 股價跌破季線(MA60)或半年線(MA120)為佈局點，視為「價值浮現」(SIGNAL:ADD)。(2) 若基本面未變，價格下跌不應恐慌，而是分批承接。(3) 僅在乖離率過大或基本面轉差時才考慮減碼。"
        : "【衛星資產策略 (SATELLITE)】此類資產追求波段價差，以「右側交易」為主。策略：(1) 股價站上月線(MA20)且KD/MACD指標轉強，視為「動能增強」，建議追價(SIGNAL:ADD)。(2) 跌破月線或高檔爆量，代表動能轉弱，應嚴格執行停損/停利(SIGNAL:REDUCE)。(3) 不建議長期凹單。";

    const prompt = `
      請以一位專業股票分析師的角色，進行個股深度分析。
      
      **分析標的確認**：
      - 股票代號 (Symbol)：${symbol}
      - 股票名稱 (Name)：${stockName}
      - 資產屬性：${assetType}
      
      **基本資訊**：
      - 投資定位：${classLabel} (這非常重要，請依此定位給出建議)
      - ${performanceInfo}
      - K線收盤價 (Data Date): ${formatPrice(latest.close)}
      - **目前即時價 (Real-time): ${formatPrice(currentPrice)}** (請以此價格判斷當下操作)
      
      **技術指標**：
      - 均線：MA20 ${latest.MA20?formatPrice(latest.MA20):'-'} / MA60 ${latest.MA60?formatPrice(latest.MA60):'-'} / MA120 ${latest.MA120?formatPrice(latest.MA120):'-'}
      - KD指標：K=${latest.K?formatPrice(latest.K):'-'}, D=${latest.D?formatPrice(latest.D):'-'}
      - MACD：OSC=${latest.OSC?formatPrice(latest.OSC):'-'}

      **策略判斷邏輯**：
      ${strategyLogic}
      
      請綜合考量目前即時價位與技術支撐/壓力位，給出符合「${classLabel}」屬性的操作建議。
      
      請依序輸出 (請勿使用 Markdown 代碼區塊)：
      
      [SUMMARY]
      (50字內簡評，結合投資定位與目前損益狀況)
      
      [DETAIL]
      (完整分析報告。包含：1. 目前趨勢判斷 2. 重要支撐/壓力位 3. 針對 ${classLabel} 的具體操作建議。請使用 Markdown 排版)
      
      [SIGNAL]
      (請輸出單一詞彙：ADD 或 REDUCE 或 HOLD)
    `;

    try {
      const { text, model } = await callGeminiWithFallback(prompt);
      
      setUsedModel(model);

      const summaryMatch = text.match(/\[SUMMARY\]\s*([\s\S]*?)\s*(?=\[DETAIL\]|$)/i);
      const detailMatch = text.match(/\[DETAIL\]\s*([\s\S]*?)\s*(?=\[SIGNAL\]|$)/i);
      const signalMatch = text.match(/\[SIGNAL\]\s*(ADD|REDUCE|HOLD)/i);

      let summary = summaryMatch ? summaryMatch[1].trim() : "分析完成";
      summary = summary.replace(/[`*#]/g, '').replace(/\n/g, ' ').trim();

      const detail = detailMatch ? detailMatch[1].trim() : text;
      const signal = signalMatch ? signalMatch[1].toUpperCase() : 'HOLD';

      setAiSummary(String(summary));
      setAiDetail(String(detail));
      setAiSignals(prev => ({ ...prev, [symbol]: signal }));
      
      updateAiCache(symbol, { summary, detail, signal, model }, dataDate); 
      setIsDetailExpanded(true); 
    } catch (err) {
      setAiSummary(String(err.message) || "分析暫時無法使用。");
    } finally {
      setIsAiSummarizing(false); 
      delete analysisInProgressRef.current[symbol];
    }
  };

  const fetchHistoricalData = async (symbol, tf) => {
    if (!symbol || symbol.includes('TD') || symbol === '定存') return;
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
    } else {
       setAiSummary(null);
       setAiDetail(null);
       setUsedModel(null);
    }

    try {
      let range = '5y'; let interval = '1wk';
      if (tf === '1y_1d') { range = '2y'; interval = '1d'; } if (tf === '10y_1mo') { range = '10y'; interval = '1mo'; } if (tf === '5y_1wk') { range = '5y'; interval = '1wk'; }
      const targetUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=${interval}&range=${range}`;
      const result = await fetchWithProxyFallback(targetUrl);
      const chartData = result?.chart?.result?.[0];
      if (chartData && chartData.timestamp) {
        const timestamps = chartData.timestamp;
        const quote = chartData.indicators.quote[0];
        const rawPoints = timestamps.map((ts, i) => ({ date: new Date(ts * 1000).toISOString().slice(0, 10), close: quote.close[i], high: quote.high[i], low: quote.low[i], open: quote.open[i] })).filter(d => d.close != null && d.high != null);
        const processedData = processTechnicalData(rawPoints);
        setHistoricalData(prev => ({ ...prev, [`${symbol}_${tf}`]: processedData }));
        
        if (geminiApiKey) {
             generateFullAnalysis(symbol, processedData); 
        } else {
             if(!aiSummary) setAiSummary("請設定 API Key 以啟用 AI 分析。");
        }

      } else { throw new Error('No chart data found'); }
    } catch (err) { console.warn(`無法取得 ${symbol} 的歷史數據:`, err); setHistoryError("無法載入圖表數據，可能是代號錯誤或來源不穩，請稍後再試。"); setIsAiSummarizing(false); } finally { setHistoryLoading(false); }
  };

  const performFetch = async (url) => {
    setLoading(true); setError(null); setUpdateError(null); setRealTimePrices({}); setHistoricalData({}); setPortfolioHealth(null);
    try {
      const Papa = await loadPapaParse();
      Papa.parse(url, {
        download: true, header: true,
        complete: (results) => {
          if (results.data && results.data.length > 0) {
            const validData = results.data.filter(row => row['標的'] && row['價格']);
            setRawData(validData);
            
            const cachedPrices = getPriceCache();
            setRealTimePrices(cachedPrices.prices || {});
            setUsdRate(cachedPrices.prices?.['TWD=X'] || 1);
            
            processData(validData, cachedPrices.prices || {}); 
            setLoading(false); 
            fetchRealTimePrices(validData, false); 
            
            const first = validData.find(d => d['類別'] !== '定存');
            if (first) {
                setSelectedHistorySymbol(first['標的']);
            }
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

    const prompt = `
      角色：專業投資顧問。
      使用者投資組合數據：${JSON.stringify(contextData)}。
      核心資產(CORE)定義：追求穩健、長期持有、防守型。
      衛星資產(SATELLITE)定義：追求超額報酬、波段操作、攻擊型。
      
      使用者問題：${userMsg.content}
      請根據上述數據與分類提供簡短、專業的回答。
    `;

    try {
        const { text: reply } = await callGeminiWithFallback(prompt);
        setChatMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    } catch (err) {
        setChatMessages(prev => [...prev, { role: 'assistant', content: "抱歉，AI 暫時無法回應，請檢查網路或 API Key。" }]);
    } finally {
        setIsChatLoading(false);
    }
  };

  const getResponsiveFontSize = (text) => {
    const str = String(text); const len = str.length;
    if (len > 25) return 'text-xs';
    if (len > 18) return 'text-sm';
    if (len > 14) return 'text-base';
    if (len > 11) return 'text-lg';
    if (len > 9) return 'text-xl';
    return 'text-2xl';
  };

  useEffect(() => {
    const savedUrl = localStorage.getItem('investment_sheet_url');
    const savedKey = localStorage.getItem('gemini_api_key');
    const savedModel = localStorage.getItem('gemini_model');
    const savedDiscount = localStorage.getItem('fee_discount');
    const savedSort = localStorage.getItem('investment_sort_config');
    const savedOrder = localStorage.getItem('investment_custom_order');
    const savedClassifications = localStorage.getItem('investment_asset_classifications');

    if (savedKey) setGeminiApiKey(savedKey);
    if (savedModel) setSelectedModel(savedModel);
    if (savedDiscount) setFeeDiscount(parseFloat(savedDiscount));
    if (savedSort) setSortConfig(JSON.parse(savedSort));
    if (savedOrder) setCustomOrder(JSON.parse(savedOrder));
    if (savedClassifications) setAssetClassifications(JSON.parse(savedClassifications));

    const cache = getAiCache();
    const signals = {};
    Object.keys(cache).forEach(key => { if (cache[key].signal) signals[key] = cache[key].signal; });
    setAiSignals(signals);

    const today = new Date().toISOString().split('T')[0];
    let cacheModified = false;
    Object.keys(cache).forEach(key => { if (cache[key].date !== today) { delete cache[key]; cacheModified = true; } });
    if (cacheModified) localStorage.setItem('gemini_analysis_cache', JSON.stringify(cache));

    if (savedUrl) { setSheetUrl(savedUrl); performFetch(savedUrl); } 
    else { processData(DEMO_DATA, {}); fetchRealTimePrices(DEMO_DATA); const firstStock = DEMO_DATA.find(d => d['類別'] === '股票' || d['類別'] === '債券'); if (firstStock) { setSelectedHistorySymbol(firstStock['標的']); } }
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

  useEffect(() => {
    if (aggregatedHoldings.length > 0) {
      setCustomOrder(prev => {
        const currentSymbols = aggregatedHoldings.map(h => h['標的']);
        if (prev.length === 0) return currentSymbols;
        const existing = prev.filter(s => currentSymbols.includes(s));
        const newSymbols = currentSymbols.filter(s => !prev.includes(s));
        const combined = [...existing, ...newSymbols];
        if (JSON.stringify(prev) !== JSON.stringify(combined)) return combined;
        return prev;
      });
    }
  }, [aggregatedHoldings]);

  useEffect(() => {
    if (customOrder.length > 0) {
      localStorage.setItem('investment_custom_order', JSON.stringify(customOrder));
    }
  }, [customOrder]);

  useEffect(() => {
    localStorage.setItem('investment_sort_config', JSON.stringify(sortConfig));
  }, [sortConfig]);

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

  const tradableSymbols = useMemo(() => sortedHoldings.filter(h => h['類別'] !== '定存'), [sortedHoldings]);
  const currentChartData = useMemo(() => {
    const baseData = historicalData[`${selectedHistorySymbol}_${timeframe}`];
    if (!baseData || !selectedHistorySymbol) return [];
    const buys = portfolioData.filter(p => p['標的'] === selectedHistorySymbol);
    const merged = [...baseData];
    buys.forEach(buy => {
        // 標準化日期格式：處理潛在的空白與分隔符
        const rawDate = (buy['日期'] || '').toString().trim().replace(/\//g, '-');
        
        // 1. 嘗試精確字串比對 (優先)
        let closestIdx = merged.findIndex(pt => pt.date === rawDate);

        // 2. 若無精確匹配 (例如假日買入或時差問題)，找前後7天內最近的交易日
        if (closestIdx === -1) {
            const buyDateTs = new Date(rawDate).getTime();
            if (!isNaN(buyDateTs)) {
                let minDiff = Infinity;
                merged.forEach((pt, i) => {
                    const ptDateTs = new Date(pt.date).getTime();
                    const diff = Math.abs(buyDateTs - ptDateTs);
                    // 限制誤差在 7 天 (604800000ms) 內，避免匹配到錯誤年份
                    if (diff < minDiff && diff < 604800000) { 
                        minDiff = diff; 
                        closestIdx = i; 
                    }
                });
            }
        }

        if (closestIdx !== -1) {
            // 合併買點數據：若同一天有多筆，可能會覆蓋，但視覺上同一點即可
            merged[closestIdx] = { ...merged[closestIdx], buyPricePoint: buy['價格'], buyAction: buy };
        }
    });
    return merged;
  }, [historicalData, selectedHistorySymbol, timeframe, portfolioData]);

  const SortIcon = ({ columnKey }) => {
    if (sortConfig.key !== columnKey) return <ArrowUpDown className="w-3 h-3 ml-1 text-slate-600 opacity-50" />;
    return sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3 ml-1 text-blue-400" /> : <ArrowDown className="w-3 h-3 ml-1 text-blue-400" />;
  };

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
        {priceLoading && <div className="mb-6 bg-blue-900/30 border border-blue-500/30 rounded-lg p-3 flex items-center animate-pulse"><Loader2 className="w-5 h-5 text-blue-400 animate-spin mr-3" /><span className="text-sm text-blue-200">{loadingMessage}</span></div>}
        {updateError && <div className="mb-6 bg-red-900/30 border border-red-500/30 rounded-lg p-3 flex items-center"><AlertTriangle className="w-5 h-5 text-red-400 mr-3 flex-shrink-0" /><span className="text-sm text-red-200">{updateError}</span></div>}

        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* 1. Summary Cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
               {[
                 { label: '總資產現值', value: formatCurrency(summary.totalValue), icon: DollarSign, color: 'text-yellow-400', bg: 'bg-blue-900/50', iColor: 'text-blue-400' },
                 { label: '投入成本', value: formatCurrency(summary.totalCost), icon: Briefcase, color: 'text-white', bg: 'bg-purple-900/50', iColor: 'text-purple-400' },
                 { label: '未實現淨損益 (已扣稅費)', value: `${summary.totalPL > 0 ? '+' : ''}${formatCurrency(summary.totalPL)}`, icon: summary.totalPL >= 0 ? ArrowUpCircle : ArrowDownCircle, color: summary.totalPL >= 0 ? 'text-red-500' : 'text-green-500', bg: summary.totalPL >= 0 ? 'bg-red-900/30' : 'bg-green-900/30', iColor: summary.totalPL >= 0 ? 'text-red-500' : 'text-green-500' },
                 { label: '投資報酬率 (ROI)', value: `${summary.totalROI > 0 ? '+' : ''}${formatPercent(summary.totalROI)}`, icon: PieIcon, color: summary.totalROI >= 0 ? 'text-red-500' : 'text-green-500', bg: 'bg-slate-700', iColor: 'text-slate-300' }
               ].map((item, idx) => {
                 const fontSizeClass = getResponsiveFontSize(item.value);
                 return (
                   <div key={idx} className="bg-slate-800 p-5 rounded-xl border border-slate-700 shadow flex items-center">
                     <div className={`flex-shrink-0 ${item.bg} rounded-md p-3`}><item.icon className={`h-6 w-6 ${item.iColor}`} /></div>
                     <div className="ml-5 flex-1 min-w-0">
                       <p className="text-sm font-medium text-slate-400 truncate">{item.label}</p>
                       <p className={`${fontSizeClass} font-bold ${item.color} whitespace-nowrap overflow-hidden text-ellipsis`}>{item.value}</p>
                     </div>
                   </div>
                 );
               })}
            </div>
            
            {/* 2. Charts */}
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
                          <RechartsTooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f1f5f9' }} itemStyle={{ color: '#FACC15' }} formatter={(value) => formatCurrency(value)} />
                          <Legend content={(props) => <ul className="flex flex-wrap justify-center gap-4 mt-4">{props.payload.map((entry, index) => <li key={`item-${index}`} className="flex items-center text-sm text-slate-300"><span className="block w-3 h-3 rounded-full mr-2" style={{ backgroundColor: entry.color }}></span>{entry.value} <span className="ml-1 text-slate-400">({formatPercent(allocationData.find(d => d.name === entry.value)?.percentage)})</span></li>)}</ul>} verticalAlign="bottom" />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex h-full items-center justify-center text-slate-500">暫無數據</div>
                    )}
                  </div>
                </div>
                <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center"><BarChart2 className="w-5 h-5 mr-2 text-purple-400" /> 持股標的分佈 (不含定存)</h3>
                  <div className="h-80 w-full min-h-[320px]" style={{ height: 400 }}>
                    {tradableSymbols.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={tradableSymbols.map(item => ({ name: item['名稱'], value: item.marketValue })).sort((a, b) => b.value - a.value)} layout="vertical" margin={{ top: 5, right: 40, left: 40, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                          <XAxis type="number" stroke="#94a3b8" tickFormatter={(val) => `${val / 1000}k`} />
                          <YAxis dataKey="name" type="category" stroke="#94a3b8" width={80} />
                          <RechartsTooltip cursor={{fill: '#334155', opacity: 0.4}} contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f1f5f9' }} itemStyle={{ color: '#FACC15' }} formatter={(value) => formatCurrency(value)} />
                          <Bar dataKey="value" fill="#8B5CF6" radius={[0, 4, 4, 0]} barSize={30}>
                            {tradableSymbols.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex h-full items-center justify-center text-slate-500">暫無數據</div>
                    )}
                  </div>
                </div>
            </div>

            {/* 3. NEW AI Portfolio Health Check Section */}
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-6 rounded-xl border border-slate-700 shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 z-10 relative">
                    <div>
                        <h3 className="text-xl font-bold text-white flex items-center">
                            <Activity className="w-6 h-6 mr-2 text-purple-400" /> 
                            AI 投資組合總體健檢室
                        </h3>
                        <p className="text-sm text-slate-400 mt-1">由 AI 擔任首席投資長，針對您的資產配置、風險分散度與績效進行綜合評分。</p>
                    </div>
                    {!portfolioHealth && !isHealthChecking && (
                        <button 
                            onClick={generatePortfolioHealthCheck}
                            className="mt-4 md:mt-0 px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium shadow-lg hover:shadow-purple-500/25 transition-all flex items-center"
                        >
                            <BrainCircuit className="w-5 h-5 mr-2" />
                            開始健檢
                        </button>
                    )}
                </div>

                {isHealthChecking && (
                    <div className="flex flex-col items-center justify-center py-12">
                        <Loader2 className="w-12 h-12 text-purple-500 animate-spin mb-4" />
                        <p className="text-slate-300 font-medium">AI 正在分析您的投資組合風險結構...</p>
                        <p className="text-slate-500 text-sm mt-1">正在計算夏普比率、集中度風險與資產相關性</p>
                    </div>
                )}

                {portfolioHealth && (
                    <div className="animate-fade-in-up">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                            {/* Score Card */}
                            <div className="bg-slate-800/50 rounded-lg p-5 border border-slate-700 flex flex-col items-center justify-center text-center">
                                <span className="text-slate-400 text-sm mb-2">健康度評分</span>
                                <div className="relative">
                                    <svg className="w-24 h-24 transform -rotate-90">
                                        <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-slate-700" />
                                        <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="8" fill="transparent" strokeDasharray={251.2} strokeDashoffset={251.2 - (251.2 * portfolioHealth.score) / 100} className={portfolioHealth.score >= 80 ? "text-green-500" : portfolioHealth.score >= 60 ? "text-yellow-500" : "text-red-500"} />
                                    </svg>
                                    <span className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-3xl font-bold text-white">{portfolioHealth.score}</span>
                                </div>
                            </div>

                            {/* Risk Level */}
                            <div className="bg-slate-800/50 rounded-lg p-5 border border-slate-700 flex flex-col items-center justify-center text-center">
                                <span className="text-slate-400 text-sm mb-2">風險屬性判定</span>
                                <ShieldAlert className={`w-12 h-12 mb-2 ${portfolioHealth.risk.includes('高') ? 'text-red-400' : portfolioHealth.risk.includes('低') ? 'text-green-400' : 'text-yellow-400'}`} />
                                <span className="text-xl font-bold text-white">{portfolioHealth.risk}</span>
                            </div>

                            {/* Suggestions Summary */}
                            <div className="bg-slate-800/50 rounded-lg p-5 border border-slate-700 md:col-span-1">
                                <span className="text-slate-400 text-sm mb-2 block text-center md:text-left">AI 調整建議</span>
                                <ul className="space-y-2 mt-2">
                                    {portfolioHealth.suggestions.slice(0, 3).map((suggestion, idx) => (
                                        <li key={idx} className="flex items-start text-sm text-slate-300">
                                            <ClipboardCheck className="w-4 h-4 text-purple-400 mr-2 mt-0.5 flex-shrink-0" />
                                            {suggestion.replace(/^\d+\.\s*/, '').replace(/^- /, '')}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>

                        {/* Detailed Comment */}
                        <div className="bg-slate-900/50 rounded-lg p-5 border border-slate-700/50">
                            <h4 className="text-white font-medium mb-2 flex items-center"><MessageSquare className="w-4 h-4 mr-2 text-blue-400" /> 總體分析報告</h4>
                            <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">{portfolioHealth.comment}</p>
                        </div>
                        
                        <div className="mt-4 flex justify-end">
                            <button onClick={generatePortfolioHealthCheck} className="text-xs text-slate-500 hover:text-slate-300 flex items-center">
                                <RefreshCw className="w-3 h-3 mr-1" /> 重新健檢
                            </button>
                        </div>
                    </div>
                )}
            </div>
          </div>
        )}

        {/* ... (Holdings, History, Chat, Config tabs remain mostly the same, just keeping structure) ... */}
        {activeTab !== 'overview' && activeTab !== 'chat' && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
             {[
               { label: '總資產現值', value: formatCurrency(summary.totalValue), icon: DollarSign, color: 'text-yellow-400', bg: 'bg-blue-900/50', iColor: 'text-blue-400' },
               { label: '投入成本', value: formatCurrency(summary.totalCost), icon: Briefcase, color: 'text-white', bg: 'bg-purple-900/50', iColor: 'text-purple-400' },
               { label: '未實現淨損益 (已扣稅費)', value: `${summary.totalPL > 0 ? '+' : ''}${formatCurrency(summary.totalPL)}`, icon: summary.totalPL >= 0 ? ArrowUpCircle : ArrowDownCircle, color: summary.totalPL >= 0 ? 'text-red-500' : 'text-green-500', bg: summary.totalPL >= 0 ? 'bg-red-900/30' : 'bg-green-900/30', iColor: summary.totalPL >= 0 ? 'text-red-500' : 'text-green-500' },
               { label: '投資報酬率 (ROI)', value: `${summary.totalROI > 0 ? '+' : ''}${formatPercent(summary.totalROI)}`, icon: PieIcon, color: summary.totalROI >= 0 ? 'text-red-500' : 'text-green-500', bg: 'bg-slate-700', iColor: 'text-slate-300' }
             ].map((item, idx) => {
               const fontSizeClass = getResponsiveFontSize(item.value);
               return (
                 <div key={idx} className="bg-slate-800 p-5 rounded-xl border border-slate-700 shadow flex items-center">
                   <div className={`flex-shrink-0 ${item.bg} rounded-md p-3`}><item.icon className={`h-6 w-6 ${item.iColor}`} /></div>
                   <div className="ml-5 flex-1 min-w-0">
                     <p className="text-sm font-medium text-slate-400 truncate">{item.label}</p>
                     <p className={`${fontSizeClass} font-bold ${item.color} whitespace-nowrap overflow-hidden text-ellipsis`}>{item.value}</p>
                   </div>
                 </div>
               );
             })}
          </div>
        )}
        
        {activeTab === 'chat' && (
            <div className="max-w-4xl mx-auto h-[70vh] flex flex-col bg-slate-800 rounded-xl border border-slate-700 shadow-lg overflow-hidden">
                <div className="p-4 border-b border-slate-700 bg-slate-900/50 flex items-center">
                    <Bot className="w-6 h-6 text-purple-400 mr-2" />
                    <h3 className="font-semibold text-white">AI 投資顧問</h3>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {chatMessages.map((msg, idx) => (
                        <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[80%] p-3 rounded-lg ${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-200'}`}>
                                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                            </div>
                        </div>
                    ))}
                    {isChatLoading && (
                        <div className="flex justify-start">
                            <div className="bg-slate-700 p-3 rounded-lg flex items-center">
                                <Loader2 className="w-4 h-4 animate-spin text-purple-400 mr-2" />
                                <span className="text-xs text-slate-400">AI 正在思考中...</span>
                            </div>
                        </div>
                    )}
                    <div ref={chatEndRef} />
                </div>

                <div className="p-4 border-t border-slate-700 bg-slate-900/50">
                    <div className="flex gap-2">
                        <input 
                            type="text" 
                            value={chatInput} 
                            onChange={(e) => setChatInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleChatSend()}
                            placeholder="輸入您的問題..." 
                            className="flex-1 bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500 text-sm"
                            disabled={isChatLoading}
                        />
                        <button 
                            onClick={handleChatSend} 
                            disabled={isChatLoading || !chatInput.trim()}
                            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg disabled:opacity-50 transition-colors"
                        >
                            <Send className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>
        )}

        {activeTab === 'history' && (
          <div className="flex flex-col lg:grid lg:grid-cols-4 gap-6">
            <div className="lg:col-span-1 bg-slate-800 rounded-xl border border-slate-700 shadow-lg overflow-hidden flex flex-col h-48 lg:h-[700px]">
              <div className="p-4 border-b border-slate-700 bg-slate-900/50 flex justify-between items-center sticky top-0 z-10"><h3 className="font-semibold text-white flex items-center"><LineIcon className="w-5 h-5 mr-2 text-blue-400" /> 持股列表</h3></div>
              <div className="overflow-y-auto flex-1 p-2 space-y-2">
                {tradableSymbols.map((item) => (
                  <button 
                      key={item['標的']} 
                      onClick={() => { 
                          if (selectedHistorySymbol !== item['標的']) {
                              setSelectedHistorySymbol(item['標的']);
                          }
                      }} 
                      className={`w-full text-left px-4 py-3 rounded-lg transition-all border ${selectedHistorySymbol === item['標的'] ? 'bg-blue-600 border-blue-500 text-white shadow-md' : 'bg-slate-700/30 border-transparent text-slate-300 hover:bg-slate-700'}`}
                  >
                    <div className="flex justify-between items-center"><span className="font-bold">{item['標的']}</span><span className="text-xs opacity-70">{item['類別']}</span></div>
                    <div className="text-sm mt-1 truncate">{item['名稱']}</div>
                    <div className="flex justify-between mt-1 text-xs opacity-60"><span>{formatCurrency(item.marketValue)}</span><span className={item.profitLoss >= 0 ? 'text-red-300' : 'text-green-300'}>{formatPercent(item.roi)}</span></div>
                  </button>
                ))}
              </div>
            </div>

            <div className="lg:col-span-3 bg-slate-800 rounded-xl border border-slate-700 shadow-lg p-4 md:p-6 flex flex-col relative" style={{ minHeight: '600px' }}>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
                <h3 className="text-xl font-bold text-white flex items-center">{selectedHistorySymbol} <span className="ml-2 text-base font-normal text-slate-400">{tradableSymbols.find(t => t['標的'] === selectedHistorySymbol)?.['名稱']}</span></h3>
                <div className="flex space-x-2 self-end sm:self-auto">
                  {[{ id: '1y_1d', label: '1年日線' }, { id: '5y_1wk', label: '5年週線' }, { id: '10y_1mo', label: '10年月線' }].map(tf => (
                    <button key={tf.id} onClick={() => setTimeframe(tf.id)} className={`px-2 py-1 md:px-3 md:py-1 rounded text-xs font-medium border ${timeframe === tf.id ? 'bg-blue-600 border-blue-500 text-white' : 'border-slate-600 text-slate-400 hover:bg-slate-700'}`}>{tf.label}</button>
                  ))}
                </div>
              </div>

              <div className="mb-4 bg-slate-900/50 p-3 rounded-lg border border-slate-700 overflow-x-auto">
                <div className="text-xs text-slate-400 mb-2 flex items-center whitespace-nowrap"><Info className="w-3 h-3 mr-1" /> 買點策略圖示說明</div>
                <div className="flex gap-4 min-w-max">
                  {Object.entries(STRATEGY_CONFIG).filter(([key]) => key !== 'default').map(([key, config]) => (
                    <div key={key} className="flex items-center space-x-2"><svg width="12" height="12" className="overflow-visible">{renderShape(config.shape, 6, 6, config.color, 5)}</svg><span className="text-xs text-slate-300">{config.label}</span></div>
                  ))}
                </div>
              </div>
              
              {historyLoading ? <div className="flex-1 flex items-center justify-center min-h-[400px]"><div className="flex flex-col items-center"><Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-3" /><span className="text-blue-300">計算技術指標中...</span></div></div> : currentChartData && currentChartData.length > 0 ? (
                <div className="flex flex-col space-y-2">
                  <div className="h-72 w-full"><ResponsiveContainer width="100%" height="100%"><ComposedChart data={currentChartData} syncId="anyId"><defs><linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/><stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/></linearGradient></defs><CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} /><XAxis dataKey="date" stroke="#94a3b8" tick={{ fontSize: 10 }} minTickGap={50} /><YAxis stroke="#94a3b8" domain={['auto', 'auto']} tickFormatter={formatPrice} /><RechartsTooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f1f5f9' }} labelFormatter={(label) => `日期: ${label}`} formatter={(val) => formatPrice(val)} /><Legend verticalAlign="top" height={36}/><Area type="monotone" dataKey="close" name="股價" stroke="#3B82F6" fillOpacity={1} fill="url(#colorPrice)" strokeWidth={2} /><Line type="monotone" dataKey="MA20" name="MA20" stroke="#EAB308" dot={false} strokeWidth={1} /><Line type="monotone" dataKey="MA60" name="MA60" stroke="#F97316" dot={false} strokeWidth={1} /><Line type="monotone" dataKey="MA120" name="MA120" stroke="#EF4444" dot={false} strokeWidth={1} /><Scatter name="買入點" dataKey="buyPricePoint" shape={<CustomStrategyDot />} legendType="none" /></ComposedChart></ResponsiveContainer></div>
                  <div className="h-32 w-full border-t border-slate-700 pt-2"><p className="text-xs text-slate-400 mb-1 ml-2">KD (9, 3, 3)</p><ResponsiveContainer width="100%" height="100%"><ComposedChart data={currentChartData} syncId="anyId"><CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} /><XAxis dataKey="date" hide /><YAxis stroke="#94a3b8" domain={[0, 100]} ticks={[20, 50, 80]} tick={{fontSize: 10}} tickFormatter={formatPrice} /><RechartsTooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f1f5f9' }} formatter={(val) => formatPrice(val)} /><ReferenceLine y={80} stroke="#EF4444" strokeDasharray="3 3" /><ReferenceLine y={20} stroke="#10B981" strokeDasharray="3 3" /><Line type="monotone" dataKey="K" stroke="#F59E0B" dot={false} strokeWidth={1} /><Line type="monotone" dataKey="D" stroke="#3B82F6" dot={false} strokeWidth={1} /></ComposedChart></ResponsiveContainer></div>
                  <div className="h-32 w-full border-t border-slate-700 pt-2"><p className="text-xs text-slate-400 mb-1 ml-2">MACD (12, 26, 9)</p><ResponsiveContainer width="100%" height="100%"><ComposedChart data={currentChartData} syncId="anyId"><CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} /><XAxis dataKey="date" hide /><YAxis stroke="#94a3b8" tick={{fontSize: 10}} tickFormatter={formatPrice} /><RechartsTooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f1f5f9' }} formatter={(val) => formatPrice(val)} /><Bar dataKey="OSC" name="OSC" barSize={4}>{currentChartData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.OSC >= 0 ? '#EF4444' : '#10B981'} />)}</Bar><Line type="monotone" dataKey="DIF" stroke="#3B82F6" dot={false} strokeWidth={1} /><Line type="monotone" dataKey="Signal" name="MACD" stroke="#F59E0B" dot={false} strokeWidth={1} /></ComposedChart></ResponsiveContainer></div>
                </div>
              ) : <div className="flex-1 flex items-center justify-center min-h-[400px] text-slate-500">{historyError ? <span className="text-red-400">{historyError}</span> : "請選擇左側標的以查看走勢"}</div>}

              <div className="mt-4 pt-4 border-t border-slate-700">
                <div className="flex items-center justify-between mb-3"><div className="flex items-center"><Sparkles className="w-5 h-5 text-purple-400 mr-2" /><h4 className="text-white font-semibold">AI 智能觀點</h4>{usedModel && <span className="ml-2 text-xs px-2 py-0.5 rounded bg-slate-700 text-slate-300 border border-slate-600">{(AVAILABLE_MODELS.find(m => m.id === usedModel)?.name || usedModel)} {isCachedResult ? <span className="text-slate-500">(歷史紀錄)</span> : <span className="text-green-400">(本次生成)</span>} {selectedModel !== usedModel && isCachedResult && <span className="text-orange-400 ml-1 text-[10px]">(與設定不符)</span>} {selectedModel !== usedModel && !isCachedResult && <span className="text-yellow-400 ml-1 text-[10px]">(自動切換)</span>}</span>}{aiSignals[selectedHistorySymbol] === 'ADD' && (<div className="flex items-center ml-3 bg-green-900/30 px-2 py-1 rounded border border-green-500/30"><div className="w-2 h-2 rounded-full bg-green-500 animate-pulse mr-2" /><span className="text-xs text-green-400 font-bold">建議加碼</span></div>)}{aiSignals[selectedHistorySymbol] === 'REDUCE' && (<div className="flex items-center ml-3 bg-red-900/30 px-2 py-1 rounded border border-red-500/30"><div className="w-2 h-2 rounded-full bg-red-500 animate-pulse mr-2" /><span className="text-xs text-red-400 font-bold">建議減碼</span></div>)}{aiSignals[selectedHistorySymbol] === 'HOLD' && (<div className="flex items-center ml-3 bg-yellow-900/30 px-2 py-1 rounded border border-yellow-500/30"><div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse mr-2" /><span className="text-xs text-yellow-400 font-bold">建議觀望</span></div>)}</div>
                
                <div className="flex items-center space-x-2">
                  {aiDetail && (
                    <button 
                        onClick={() => setIsDetailExpanded(!isDetailExpanded)} 
                        className="text-xs text-blue-400 hover:text-blue-300 flex items-center transition-colors"
                      >
                        <FileSearch className="w-3 h-3 mr-1" />
                        {isDetailExpanded ? "收合完整報告" : "展開完整報告"}
                    </button>
                  )}
                  {geminiApiKey && !isAiSummarizing && (
                      <button 
                        onClick={() => generateFullAnalysis(selectedHistorySymbol, historicalData[`${selectedHistorySymbol}_${timeframe}`], true)}
                        className={`text-xs flex items-center transition-colors text-red-400 hover:text-red-300`}
                      >
                        <RefreshCw className={`w-3 h-3 mr-1`} /> 
                        重新載入分析
                      </button>
                  )}
                </div>
                </div>

                <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700 shadow-inner">
                  {isAiSummarizing ? (
                    <div className="flex items-center text-slate-400 text-sm"><Loader2 className="w-4 h-4 animate-spin mr-2" />AI 正在分析中...</div>
                  ) : (
                    <>
                      {aiSummary ? <div className="mb-3"><p className="text-slate-300 text-sm leading-relaxed border-l-2 border-purple-500 pl-3">{String(aiSummary)}</p></div> : <div className="text-slate-500 text-sm">暫無 AI 分析數據 (請點擊上方按鈕重試)</div>}
                      {aiDetail && (
                        <div className={`mt-3 pt-3 border-t border-slate-700/50 transition-all duration-500 ease-in-out ${isDetailExpanded ? 'opacity-100 max-h-[1000px]' : 'opacity-0 max-h-0 overflow-hidden'}`}>
                          <div><div className="flex justify-between items-center mb-2"><span className="text-xs font-semibold text-purple-300">完整技術報告</span></div><div className="prose prose-invert prose-sm max-w-none text-slate-300 whitespace-pre-wrap leading-relaxed text-xs max-h-64 overflow-y-auto pr-2 custom-scrollbar">{String(aiDetail)}</div></div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ... (Holdings and Config tabs remain the same) ... */}
        {activeTab === 'holdings' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center px-2">
              <h3 className="text-lg font-semibold text-white flex items-center"><FileText className="w-5 h-5 mr-2 text-blue-400" /> 持股明細表</h3>
              <button onClick={() => fetchRealTimePrices(rawData, true)} className="text-xs flex items-center text-blue-400 hover:text-blue-300 transition-colors"><RefreshCw className={`w-3 h-3 mr-1 ${priceLoading ? 'animate-spin' : ''}`} />{priceLoading ? '更新中...' : '立即更新股價'}</button>
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
                const classification = assetClassifications[row['標的']] || 'CORE';
                return (
                <div key={row['標的']} className="bg-slate-800 p-4 rounded-xl border border-slate-700 shadow-md relative">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="flex items-center space-x-2">
                        {signal === 'ADD' && <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse mr-1" />}
                        {signal === 'REDUCE' && <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse mr-1" />}
                        {signal === 'HOLD' && <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse mr-1" />}
                        <span className="text-lg font-bold text-white">{row['標的']}</span>
                        <span className={`text-xs px-2 py-0.5 rounded ${CATEGORY_STYLES[row['類別']]?.badge || CATEGORY_STYLES['default'].badge}`}>{row['類別']}</span>
                      </div>
                      <div className="text-sm text-slate-400 mt-1">{row['名稱']}</div>
                      
                      {/* Mobile Classification Switcher */}
                      <div className="mt-2 flex items-center space-x-2">
                          <span className="text-xs text-slate-500">定位:</span>
                          <select 
                            value={classification}
                            onChange={(e) => handleClassificationChange(row['標的'], e.target.value)}
                            className={`text-xs px-2 py-0.5 rounded border focus:outline-none cursor-pointer bg-slate-700 ${ASSET_TYPES[classification].color} ${ASSET_TYPES[classification].border}`}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <option value="CORE">核心 (穩健)</option>
                            <option value="SATELLITE">衛星 (波段)</option>
                          </select>
                      </div>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className={`text-lg font-bold ${(row.roi || 0) >= 0 ? 'text-red-500' : 'text-green-500'}`}>{formatPercent(row.roi)}</span>
                      <span className={`text-xs ${(row.profitLoss || 0) >= 0 ? 'text-red-400' : 'text-green-400'}`}>{(row.profitLoss || 0) > 0 ? '+' : ''}{formatCurrency(row.profitLoss)}</span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                    <div><span className="text-slate-500 block text-xs">現價</span><span className="text-white font-medium">{row.isUS ? '$' : ''}{formatPrice(row.currentPriceRaw || row.currentPrice)}</span></div>
                    <div><span className="text-slate-500 block text-xs">成本</span><span className="text-slate-300">{row.isUS ? '$' : ''}{formatPrice(row.buyPriceRaw || row.buyPrice)}</span></div>
                    <div><span className="text-slate-500 block text-xs">市值</span><span className="text-white">{formatCurrency(row.marketValue)}</span></div>
                    <div><span className="text-slate-500 block text-xs">股數</span><span className="text-slate-300">{row.shares.toLocaleString()}</span></div>
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
                      {[ { label: '標的代號', key: '標的' }, { label: '名稱/類別', key: '類別' }, { label: '投資定位', key: 'class' }, { label: '平均成本', key: 'buyPrice' }, { label: 'Yahoo即時價', key: 'currentPrice' }, { label: '總股數', key: 'shares' }, { label: '總損益 (淨)', key: 'profitLoss' }, { label: '報酬率 (淨)', key: 'roi' } ].map(header => (
                        <th key={header.key} onClick={() => header.key !== 'class' && requestSort(header.key)} className={`px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider ${header.key !== 'class' ? 'cursor-pointer hover:text-white' : ''} transition-colors group ${header.label.includes('代號') || header.label.includes('名稱') ? 'text-left' : 'text-right'}`}><div className={`flex items-center ${header.label.includes('代號') || header.label.includes('名稱') ? 'justify-start' : 'justify-end'}`}>{header.label}{header.key !== 'class' && <SortIcon columnKey={header.key} />}</div></th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-slate-800 divide-y divide-slate-700">
                    {sortedHoldings.map((row, index) => {
                      const signal = aiSignals[row['標的']];
                      const classification = assetClassifications[row['標的']] || 'CORE';
                      return (
                      <tr key={row['標的']} className="hover:bg-slate-700/50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap"><div className="flex flex-col space-y-1">{index > 0 && <button onClick={(e) => { e.stopPropagation(); moveItem(row['標的'], -1); }} className="p-1 rounded hover:bg-slate-600 text-slate-400 hover:text-white"><ArrowUp className="w-3 h-3" /></button>}{index < sortedHoldings.length - 1 && <button onClick={(e) => { e.stopPropagation(); moveItem(row['標的'], 1); }} className="p-1 rounded hover:bg-slate-600 text-slate-400 hover:text-white"><ArrowDown className="w-3 h-3" /></button>}</div></td>
                        <td className="px-6 py-4 whitespace-nowrap text-left"><div className="text-sm text-white font-medium flex items-center">{signal === 'ADD' && <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse mr-2" title="AI建議: 加碼" />}{signal === 'REDUCE' && <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse mr-2" title="AI建議: 減碼" />}{signal === 'HOLD' && <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse mr-2" title="AI建議: 觀望" />}{row['標的']}{row.isRealData ? <Wifi className="w-3 h-3 ml-1 text-green-500" /> : row['類別'] !== '定存' && <WifiOff className="w-3 h-3 ml-1 text-slate-600" />}</div><div className="text-xs text-slate-500">最近交易: {row['日期']}</div></td>
                        <td className="px-6 py-4 whitespace-nowrap text-left"><div className="text-sm text-slate-200">{row['名稱']}</div><span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium mt-1 ${CATEGORY_STYLES[row['類別']]?.badge || CATEGORY_STYLES['default'].badge}`}>{row['類別']}</span></td>
                        
                        {/* Classification Dropdown - Desktop Style Enhanced */}
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="flex justify-end">
                            <select 
                              value={classification}
                              onChange={(e) => handleClassificationChange(row['標的'], e.target.value)}
                              className={`text-xs px-3 py-1.5 rounded-full border-2 focus:outline-none cursor-pointer bg-slate-800 transition-colors appearance-none text-center font-medium ${ASSET_TYPES[classification].color} ${ASSET_TYPES[classification].border} hover:bg-slate-700`}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <option value="CORE">◉ 核心資產</option>
                              <option value="SATELLITE">⚡ 衛星資產</option>
                            </select>
                          </div>
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-slate-300">{row.isUS ? '$' : ''}{formatPrice(row.buyPriceRaw || row.buyPrice)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold text-yellow-400">{row.isUS ? '$' : ''}{formatPrice(row.currentPriceRaw || row.currentPrice)}</td>
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

        {/* ... (Config tab same) ... */}
        {activeTab === 'config' && (
          <div className="max-w-2xl mx-auto bg-slate-800 p-8 rounded-xl border border-slate-700 shadow-lg">
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

              {/* Model Selection Dropdown */}
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

              {error && <div className="p-3 bg-red-900/30 border border-red-500/50 text-red-300 rounded-md text-sm">{error}</div>}
              <button onClick={handleFetchButton} disabled={loading} className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 focus:ring-offset-slate-800 transition-colors ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}>{loading ? '資料載入中...' : '匯入並更新股價'}</button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default function App() {
  return <Dashboard />;
}
