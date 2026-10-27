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
 * Alpha 投資戰情室 v56.04 (投資策略與設定雲端雙向同步版)
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

const formatCurrency = (value) => new Intl.NumberFormat('zh-TW', { style: 'currency', currency: 'TWD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value || 0);
const formatPercent = (value) => `${((value || 0) * 100).toFixed(2)}%`;
const formatPrice = (value) => {
  if (typeof value === 'number') return value.toFixed(2);
  if (Array.isArray(value)) return value.map(v => typeof v === 'number' ? v.toFixed(2) : String(v)).join(' - ');
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
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Taipei',
    year: 'numeric', month: 'numeric', day: 'numeric',
    hour: 'numeric', minute: 'numeric', weekday: 'short', hour12: false
  }).formatToParts(new Date());
  let hash = {};
  parts.forEach(p => { hash[p.type] = p.value; });
  return {
    y: parseInt(hash.year),
    m: parseInt(hash.month),
    d: parseInt(hash.day),
    h: parseInt(hash.hour) % 24,
    min: parseInt(hash.minute),
    weekday: hash.weekday
  };
};

const getTodayDate = () => {
  const { y, m, d } = getTaipeiTime();
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
};

const getPureCode = (symbol) => {
  if (!symbol) return '';
  return String(symbol).toUpperCase().replace(/\.TWO$|\.TW$/i, '').trim();
};

const extractSpreadsheetId = (url) => {
  if (!url) return null;
  const clean = String(url).trim();
  const match = clean.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : null;
};

const App = () => {
  const [sheetUrl, setSheetUrl] = useState('');
  const [gasUrl, setGasUrl] = useState('');
  const [geminiApiKey, setGeminiApiKey] = useState(''); 
  const [rawData, setRawData] = useState([]);
  const [portfolioData, setPortfolioData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [priceLoading, setPriceLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
    
  const [realTimePrices, setRealTimePrices] = useState({});
  const [etfExtraData, setEtfExtraData] = useState({}); 
  const [usdRate, setUsdRate] = useState(1); 
  const [historicalData, setHistoricalData] = useState({});
  const [selectedHistorySymbol, setSelectedHistorySymbol] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState(null); 
  const [timeframe, setTimeframe] = useState('1y_1d'); 
  
  const [sortConfig, setSortConfig] = useState({ key: 'manual', direction: 'asc' });
  const [customOrder, setCustomOrder] = useState([]);

  const [aiSummary, setAiSummary] = useState(null);
  const [aiDetail, setAiDetail] = useState(null);
  const [isAiSummarizing, setIsAiSummarizing] = useState(false);
  const [aiProgressMsg, setAiProgressMsg] = useState(''); 
  const [usedModel, setUsedModel] = useState(null); 
  const [isCachedResult, setIsCachedResult] = useState(false); 
  const [selectedModel, setSelectedModel] = useState('gemini-3.7-flash'); 
  const [analysisMode, setAnalysisMode] = useState('comprehensive'); 
  const [aiSignals, setAiSignals] = useState({}); 
  const [cloudReports, setCloudReports] = useState({}); 

  const [investmentSettings, setInvestmentSettings] = useState({}); 
  const [autoSettings, setAutoSettings] = useState({}); 
  const [toast, setToast] = useState(null);

  const activeHistorySymbolRef = useRef(null); 
  const aiAbortControllerRef = useRef(null); 
  const cloudReportsRef = useRef({});

  useEffect(() => {
    cloudReportsRef.current = cloudReports;
  }, [cloudReports]);

  const loadCloudReportsFromSheet = async (targetGasUrl, currentHoldings) => {
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
    } catch (e) {
      console.error("更新自動分析設定失敗:", e);
    }
  };

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
    }
    return sortableItems;
  }, [aggregatedHoldings, sortConfig, customOrder]);

  const tradableSymbols = useMemo(() => sortedHoldings.filter(h => h['類別'] !== '定存'), [sortedHoldings]);

  useEffect(() => {
    if (tradableSymbols.length > 0 && !selectedHistorySymbol) {
      setSelectedHistorySymbol(tradableSymbols[0]['標的']);
    }
  }, [tradableSymbols, selectedHistorySymbol]);

  const currentChartData = useMemo(() => {
    const baseData = historicalData[`${selectedHistorySymbol}_${timeframe}`];
    if (!baseData || !selectedHistorySymbol) return [];
    let merged = [...baseData];
    const currentPrice = realTimePrices[selectedHistorySymbol];
    if (currentPrice && merged.length > 0) {
      const todayStr = getTodayDate();
      const lastPoint = merged[merged.length - 1];
      if (lastPoint.date === todayStr) {
        merged[merged.length - 1] = { ...lastPoint, close: currentPrice };
      }
    }
    return merged;
  }, [historicalData, selectedHistorySymbol, timeframe, realTimePrices]);

  const processData = (data, pricesMap) => {
    const currentUsdRate = pricesMap['TWD=X'] || 30; 
    const enrichedData = data.map((item, index) => {
      const shares = parseFloat(item['股數']) || 0;
      const buyPriceRaw = parseFloat(item['價格']) || 0; 
      const costBasisRaw = parseFloat(item['金額']) || 0; 
      const symbol = item['標的'];
      const category = item['類別'];
      let currentPriceRaw = pricesMap?.[symbol] || buyPriceRaw;
      const marketValueTwd = shares * currentPriceRaw;
      const grossProfit = marketValueTwd - costBasisRaw;
      const roi = costBasisTwd > 0 ? grossProfit / costBasisTwd : 0;
      
      return { 
        ...item, id: index, shares,
        buyPrice: buyPriceRaw, currentPrice: currentPriceRaw,
        costBasis: costBasisRaw, marketValue: marketValueTwd, 
        profitLoss: grossProfit, grossProfit, roi
      };
    });
    setPortfolioData(enrichedData); setRawData(data);
  };

  const fetchRealTimePrices = async (data) => {
    const uniqueSymbols = [...new Set(data.map(item => item['標的']))];
    const newPrices = { ...realTimePrices };
    for (const symbol of uniqueSymbols) {
      if (symbol === '定存') continue;
      try {
        const res = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`);
        const json = await res.json();
        const price = json?.chart?.result?.[0]?.meta?.regularMarketPrice;
        if (price) newPrices[symbol] = price;
      } catch (e) {}
    }
    setRealTimePrices(newPrices);
    processData(data, newPrices);
  };

  const generateFullAnalysis = async (symbol, data, forceUpdate = false) => {
    if (!data || data.length === 0) return;
    if (aiAbortControllerRef.current) aiAbortControllerRef.current.abort();
    aiAbortControllerRef.current = new AbortController();
    const signal = aiAbortControllerRef.current.signal;

    setIsAiSummarizing(true);
    setAiSummary(null); setAiDetail(null);

    const assetInfo = tradableSymbols.find(t => t['標的'] === symbol);
    const stockName = assetInfo?.['名稱'] || symbol;
    const latest = data[data.length - 1];
    const prevDay = data.length > 1 ? data[data.length - 2] : latest;

    const settings = investmentSettings[symbol] || { type: 'CORE', isDCA: false, addon: 'PYRAMID', addon2: 'NONE' };
    const currentMonthPrefix = getTodayDate().substring(0, 7);
    const hasBoughtThisMonth = portfolioData.some(item => item['標的'] === symbol && String(item['日期'] || '').startsWith(currentMonthPrefix) && item['策略'] === '基礎買入');

    let prompt = "";
    if (analysisMode === 'comprehensive') {
      prompt = `角色：專業分析師。深度分析 ${symbol}(${stockName})。
模式：${settings.isDCA ? (hasBoughtThisMonth ? '定期定額(本月已扣款僅評估加碼)' : '定期定額(尋找買點)') : '單筆投入'}。加碼策略：${settings.addon}, ${settings.addon2}。
最新K線日期:${latest.date} 昨收:${prevDay.close} 現價:${latest.close}
指標：MA20=${latest.MA20}, KD(${latest.K},${latest.D}), MACD=${latest.OSC}, RSI=${latest.RSI14}
1. 請以股票研究分析師角度，分析［${stockName}/${symbol}］。檢視估值、催化因素與走勢。
2. 整理近期重要新聞影響。
嚴格格式輸出(無Markdown)：
[SUMMARY] (50字簡評)
[DETAIL] (詳細綜合分析報告)
[SIGNAL] (僅輸出 ADD_ALL/ADD_BASIC/ADD_BONUS/REDUCE/HOLD 之一)`;
    } else {
      prompt = `使用可取得的歷史資料，評估［${settings.addon}］交易策略在［${symbol}］於［${timeframe}］內的表現。
計算交易次數、勝率、平均獲利、平均虧損、最大回撒、獲利因子。
嚴格格式輸出(無Markdown)：
[SUMMARY] (50字回測簡評)
[DETAIL] (詳細回測報告)
[SIGNAL] (僅輸出 ADD_ALL/ADD_BASIC/ADD_BONUS/REDUCE/HOLD 之一)`;
    }

    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${geminiApiKey}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
        signal
      });
      const json = await res.json();
      const text = json.candidates?.[0]?.content?.parts?.map(p => p.text).join('') || '';

      const summaryMatch = text.match(/\[SUMMARY\]\s*([\s\S]*?)\s*(?=\[DETAIL\]|$)/i);
      const detailMatch = text.match(/\[DETAIL\]\s*([\s\S]*?)\s*(?=\[SIGNAL\]|$)/i);
      const signalMatch = text.match(/\[SIGNAL\]\s*[:：\-]?\s*(ADD_ALL|ADD_BASIC|ADD_BONUS|REDUCE|HOLD)/i);

      const resSummary = summaryMatch ? summaryMatch[1].trim() : "分析完成";
      const resDetail = detailMatch ? detailMatch[1].trim() : text;
      const resSignal = signalMatch ? signalMatch[1].toUpperCase() : 'HOLD';

      setAiSummary(resSummary);
      setAiDetail(resDetail);
      setAiSignals(prev => ({ ...prev, [symbol]: resSignal }));
      setUsedModel(selectedModel);
      setIsCachedResult(false);

      // 同時同步至雲端表單
      await saveReportToCloud(symbol, stockName, resSignal, resSummary, resDetail);

    } catch (e) {
      if (!signal.aborted) setAiSummary(`分析失敗: ${e.message}`);
    } finally {
      setIsAiSummarizing(false);
    }
  };

  const fetchHistoricalData = async (symbol) => {
    if (!symbol || symbol === '定存') return;
    setHistoryLoading(true);
    try {
      const res = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1y`);
      const json = await res.json();
      const chart = json.chart.result[0];
      const timestamps = chart.timestamp;
      const quote = chart.indicators.quote[0];
      let rawPoints = timestamps.map((ts, i) => ({
        date: new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Taipei' }).format(new Date(ts * 1000)),
        close: quote.close[i], high: quote.high[i], low: quote.low[i], open: quote.open[i]
      })).filter(d => d.close != null);
      
      // 計算簡易 MA
      const processed = rawPoints.map((item, idx, arr) => {
        if (idx < 19) return { ...item, MA20: null, K: 50, D: 50, OSC: 0, RSI14: 50, BBL: item.close * 0.9 };
        const slice = arr.slice(idx - 19, idx + 1);
        const ma20 = slice.reduce((a, b) => a + b.close, 0) / 20;
        return { ...item, MA20: ma20, K: 55, D: 52, OSC: 0.5, RSI14: 55, BBL: ma20 * 0.95 };
      });

      setHistoricalData(prev => ({ ...prev, [`${symbol}_1y_1d`]: processed }));
      
      // 優先載入雲端表單報告
      if (cloudReportsRef.current[symbol]) {
        const r = cloudReportsRef.current[symbol];
        setAiSummary(r.summary);
        setAiDetail(r.detail);
        setIsCachedResult(true);
      } else {
        setAiSummary(null);
        setAiDetail(null);
      }
    } catch (e) {
      setHistoryError(e.message);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'history' && selectedHistorySymbol) {
      fetchHistoricalData(selectedHistorySymbol);
    }
  }, [activeTab, selectedHistorySymbol]);

  const handleSettingChange = (symbol, key, value) => {
    const current = investmentSettings[symbol] || { type: 'CORE', isDCA: false, addon: 'PYRAMID', addon2: 'NONE' };
    const updated = { ...investmentSettings, [symbol]: { ...current, [key]: value } };
    setInvestmentSettings(updated);
    localStorage.setItem('investment_settings', JSON.stringify(updated));
    syncSettingsToCloud(updated);
  };

  const performFetch = async (url) => {
    setLoading(true);
    try {
      const res = await fetch(url);
      const text = await res.text();
      Papa.parse(text, {
        header: true, skipEmptyLines: true,
        complete: (results) => {
          const valid = results.data.filter(r => r['標的'] && r['價格']);
          processData(valid, {});
          fetchRealTimePrices(valid);
          setLoading(false);
        }
      });
    } catch (e) {
      setError(e.message);
      setLoading(false);
    }
  };

  useEffect(() => {
    const savedUrl = localStorage.getItem('investment_sheet_url');
    const savedGas = localStorage.getItem('gas_url');
    const savedKey = localStorage.getItem('gemini_api_key');
    const savedSettings = localStorage.getItem('investment_settings');
    
    if (savedGas) {
      setGasUrl(savedGas);
      loadCloudReportsFromSheet(savedGas);
    }
    if (savedKey) setGeminiApiKey(savedKey);
    if (savedUrl) { setSheetUrl(savedUrl); performFetch(savedUrl); } else { processData(DEMO_DATA, {}); }
    if (savedSettings) setInvestmentSettings(JSON.parse(savedSettings));
  }, []);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans pb-20 md:pb-0">
      {toast && <div className="fixed bottom-20 left-1/2 transform -translate-x-1/2 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg z-[100] text-xs">{toast}</div>}
      
      <nav className="hidden md:block border-b border-slate-700 bg-slate-800/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-16">
          <div className="flex items-center"><TrendingUp className="h-6 w-6 text-blue-500 mr-2" /><span className="text-xl font-bold">Alpha 投資戰情室 v56.04</span></div>
          <div className="flex space-x-4">{['overview', 'history', 'holdings', 'config'].map(tab => (<button key={tab} onClick={() => setActiveTab(tab)} className={`px-3 py-2 rounded text-sm font-medium ${activeTab === tab ? 'bg-slate-900 text-blue-400' : 'text-slate-300'}`}>{tab === 'overview' ? '總覽' : tab === 'history' ? '歷史走勢' : tab === 'holdings' ? '持股明細' : '設定'}</button>))}</div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card title="總資產現值"><div className="text-2xl font-bold text-yellow-400">{formatCurrency(summary.totalValue)}</div></Card>
            <Card title="投入成本"><div className="text-2xl font-bold text-white">{formatCurrency(summary.totalCost)}</div></Card>
            <Card title="未實現損益"><div className={`text-2xl font-bold ${summary.totalPL >= 0 ? 'text-red-500' : 'text-green-500'}`}>{formatCurrency(summary.totalPL)}</div></Card>
            <Card title="報酬率"><div className={`text-2xl font-bold ${summary.totalROI >= 0 ? 'text-red-500' : 'text-green-500'}`}>{formatPercent(summary.totalROI)}</div></Card>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="bg-slate-800 rounded-xl p-4 border border-slate-700 h-[600px] overflow-y-auto">
              <h3 className="font-bold text-white mb-3">標的清單</h3>
              {tradableSymbols.map(s => (
                <button key={s['標的']} onClick={() => setSelectedHistorySymbol(s['標的'])} className={`w-full text-left p-3 rounded mb-2 border ${selectedHistorySymbol === s['標的'] ? 'bg-blue-600 border-blue-500' : 'bg-slate-700/30 border-transparent'}`}>
                  <div className="font-bold">{s['標的']}</div>
                  <div className="text-xs text-slate-400">{s['名稱']}</div>
                </button>
              ))}
            </div>
            
            <div className="lg:col-span-3 bg-slate-800 rounded-xl p-6 border border-slate-700 space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-white">{selectedHistorySymbol} 走勢與 AI 分析</h2>
                <div className="flex gap-2">
                  <select value={analysisMode} onChange={(e) => setAnalysisMode(e.target.value)} className="bg-slate-900 border border-slate-700 text-xs px-2 py-1 rounded text-white">
                    <option value="comprehensive">綜合趨勢分析</option>
                    <option value="backtest">回測交易策略</option>
                  </select>
                  <button onClick={() => generateFullAnalysis(selectedHistorySymbol, historicalData[`${selectedHistorySymbol}_1y_1d`], true)} disabled={isAiSummarizing} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs flex items-center">
                    {isAiSummarizing ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Sparkles className="w-3 h-3 mr-1" />} 重新分析並同步
                  </button>
                </div>
              </div>

              <div className="bg-slate-900/50 p-5 rounded-lg border border-slate-700 min-h-[150px]">
                {cloudReports[selectedHistorySymbol] && (
                  <div className="text-[10px] text-blue-400 mb-2 flex items-center">
                    <Cloud className="w-3 h-3 mr-1" /> 雲端報告時間: {cloudReports[selectedHistorySymbol].time}
                  </div>
                )}
                {isAiSummarizing ? <div className="text-slate-400 text-sm flex items-center"><Loader2 className="w-4 h-4 animate-spin mr-2"/> AI 運算中...</div> : (
                  <>
                    <p className="text-white font-medium mb-2">{aiSummary || "尚未進行分析，請點擊上方重新分析。"}</p>
                    <div className="text-sm text-slate-300 whitespace-pre-wrap">{aiDetail}</div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'holdings' && (
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 overflow-x-auto">
            <h3 className="text-lg font-bold text-white mb-4">持股策略與自動分析設定</h3>
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
                  const autoVal = autoSettings[row['標的']] !== undefined ? autoSettings[row['標的']] : true;
                  return (
                    <tr key={row['標的']}>
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
                        <button onClick={() => updateAutoSettingToCloud(row['標的'], !autoVal)} className={`px-2 py-1 rounded text-xs font-bold ${autoVal ? 'bg-green-600 text-white' : 'bg-slate-700 text-slate-400'}`}>
                          {autoVal ? 'ON' : 'OFF'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'config' && (
          <div className="max-w-xl mx-auto bg-slate-800 p-8 rounded-xl border border-slate-700 space-y-4">
            <h2 className="text-xl font-bold text-white">系統設定</h2>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Google Sheets CSV 連結</label>
              <input type="text" value={sheetUrl} onChange={(e) => setSheetUrl(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white text-sm" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Google Apps Script (GAS) 部署網址</label>
              <input type="text" value={gasUrl} onChange={(e) => setGasUrl(e.target.value)} placeholder="https://script.google.com/macros/s/.../exec" className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white text-sm" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Gemini API Key</label>
              <input type="password" value={geminiApiKey} onChange={(e) => setGeminiApiKey(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white text-sm" />
            </div>
            <button onClick={() => {
              localStorage.setItem('investment_sheet_url', sheetUrl);
              localStorage.setItem('gas_url', gasUrl);
              localStorage.setItem('gemini_api_key', geminiApiKey);
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