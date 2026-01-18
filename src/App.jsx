import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  ComposedChart, Line, Area, Bar, BarChart, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, 
  Tooltip as RechartsTooltip, Legend, ResponsiveContainer, ReferenceLine, Scatter
} from 'recharts';
import { 
  PieChart as PieIcon, ArrowUpCircle, ArrowDownCircle, RefreshCw, Settings, 
  TrendingUp, DollarSign, Briefcase, FileText, AlertCircle, BarChart2, 
  Loader2, Wifi, WifiOff, LineChart as LineIcon, Info, AlertTriangle, 
  ArrowUp, ArrowDown, ArrowUpDown, Move, Sparkles, Bot, ChevronDown, ChevronUp, FileSearch, Save, Key
} from 'lucide-react';

/**
 * 專業理財經理人技術筆記 (Technical Note) v9.3 (AI Sync Fix):
 * * [功能修復] AI 分析連動與自動更新
 * 1. 狀態管理 (State Management):
 * - 新增 `analysisSymbol` 狀態，用於追蹤目前 AI 分析內容所屬的標的。
 * 2. 邏輯解耦 (Decoupling):
 * - `fetchHistoricalData` 不再直接呼叫 `generateSummary`，避免職責過重與重複呼叫。
 * - 改由 `useEffect` 統一管理：當 (有數據) 且 (分析標的 != 當前標的) 時，自動觸發 AI 分析。
 * 3. 體驗優化 (UX):
 * - 切換標的物 (`selectedHistorySymbol` 改變) 時，立即清除舊的 AI 分析結果 (`aiSummary`, `aiDetail`)。
 * - 確保切換到已快取的股票時，AI 分析也會自動重新生成或更新。
 */

// --- 靜態配置與輔助函式 (Defined OUTSIDE component) ---

const DEMO_DATA = [
  { 日期: '2015-01-15', 標的: '2330.TW', 名稱: '台積電', 類別: '股票', 價格: 140, 股數: 1000, 策略: '基礎買入', 金額: 140000 },
  { 日期: '2019-08-15', 標的: '2330.TW', 名稱: '台積電', 類別: '股票', 價格: 250, 股數: 500, 策略: 'MA60有撐', 金額: 125000 },
  { 日期: '2020-03-20', 標的: '2330.TW', 名稱: '台積電', 類別: '股票', 價格: 270, 股數: 500, 策略: '金字塔_S1', 金額: 135000 },
  { 日期: '2021-05-15', 標的: '2330.TW', 名稱: '台積電', 類別: '股票', 價格: 550, 股數: 200, 策略: 'K值超賣', 金額: 110000 },
  { 日期: '2022-01-10', 標的: '2330.TW', 名稱: '台積電', 類別: '股票', 價格: 600, 股數: 100, 策略: '金字塔_S2', 金額: 60000 },
  { 日期: '2018-02-20', 標的: '0050.TW', 名稱: '元大台灣50', 類別: '股票', 價格: 80, 股數: 2000, 策略: '基礎買入', 金額: 160000 },
  { 日期: '2022-10-25', 標的: '0050.TW', 名稱: '元大台灣50', 類別: '股票', 價格: 100, 股數: 1000, 策略: 'MA120有撐', 金額: 100000 },
  { 日期: '2021-03-10', 標的: 'BND', 名稱: '總體債券ETF', 類別: '債券', 價格: 85, 股數: 100, 策略: '基礎買入', 金額: 255000 },
  { 日期: '2023-06-01', 標的: 'USD-TD', 名稱: '美元定存', 類別: '定存', 價格: 30, 股數: 10000, 策略: '基礎買入', 金額: 300000 },
];

const COLORS = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#6366F1'];
const CATEGORY_COLORS = { '股票': '#3B82F6', '債券': '#8B5CF6', '定存': '#10B981' };

const STRATEGY_CONFIG = {
  '基礎買入':     { color: '#EF4444', label: '基礎買入',     shape: 'circle' },
  '金字塔_S1':    { color: '#F97316', label: '金字塔_S1',    shape: 'triangle' },
  '金字塔_S2':    { color: '#EAB308', label: '金字塔_S2',    shape: 'triangle' },
  '金字塔_S3':    { color: '#84CC16', label: '金字塔_S3',    shape: 'triangle' },
  'K值超賣':      { color: '#3B82F6', label: 'K值超賣',      shape: 'diamond' },
  'MA60有撐':     { color: '#8B5CF6', label: 'MA60有撐',     shape: 'star' },
  'MA120有撐':    { color: '#06B6D4', label: 'MA120有撐',    shape: 'square' },
  'default':      { color: '#64748B', label: '其他策略',     shape: 'cross' }
};

const formatCurrency = (value) => new Intl.NumberFormat('zh-TW', { style: 'currency', currency: 'TWD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
const formatPercent = (value) => `${(value * 100).toFixed(2)}%`;
const formatPrice = (value) => typeof value === 'number' ? value.toFixed(2) : value;
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

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
  if (!payload.buyAction) return null;
  const strategy = payload.buyAction['策略'];
  const config = STRATEGY_CONFIG[strategy] || STRATEGY_CONFIG['default'];
  return renderShape(config.shape, cx, cy, config.color, 6);
};

// --- Proxy Fetch Helper ---
const fetchWithProxyFallback = async (targetUrl) => {
  const proxies = [
    (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
    (url) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
  ];

  for (const proxyGen of proxies) {
    try {
      const response = await fetch(proxyGen(targetUrl));
      if (!response.ok) throw new Error('Proxy error');
      return await response.json();
    } catch (e) {
      console.warn('Proxy failed, trying next...', e);
    }
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
  let k = 2 / (period + 1);
  let emaArray = [];
  let ema = data[0][key]; 
  for (let i = 0; i < data.length; i++) {
    if (i === 0) { ema = data[i][key]; } else { ema = data[i][key] * k + emaArray[i - 1] * (1 - k); }
    emaArray.push(ema);
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
  const difArray = data.map((d, i) => ({ ...d, DIF: ema12[i] - ema26[i] }));
  let macdArray = [];
  let signal = 0;
  const k = 2 / (9 + 1);
  for (let i = 0; i < difArray.length; i++) {
     if (i === 0) { signal = difArray[i].DIF; } else { signal = difArray[i].DIF * k + macdArray[i-1].Signal * (1 - k); }
     const osc = difArray[i].DIF - signal;
     macdArray.push({ ...difArray[i], Signal: signal, OSC: osc });
  }
  return macdArray;
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

// --- 主要元件 (Defined INSIDE component) ---

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
  const [isAiDetailing, setIsAiDetailing] = useState(false);
  const [isDetailExpanded, setIsDetailExpanded] = useState(false);
  const [usedModel, setUsedModel] = useState(null); 
  const [analysisSymbol, setAnalysisSymbol] = useState(null); // Track which symbol the analysis belongs to

  // Functions defined INSIDE component
  const processData = (data, pricesMap) => {
    const enrichedData = data.map((item, index) => {
      const shares = parseFloat(item['股數']);
      const buyPrice = parseFloat(item['價格']);
      const costBasis = parseFloat(item['金額']);
      const symbol = item['標的'];
      const category = item['類別'];
      let currentPrice = category === '定存' ? buyPrice : (pricesMap?.[symbol] || buyPrice);
      const marketValue = shares * currentPrice;
      const profitLoss = marketValue - costBasis;
      const roi = costBasis > 0 ? profitLoss / costBasis : 0;
      return { ...item, id: index, shares, buyPrice, currentPrice, costBasis, marketValue, profitLoss, roi, isRealData: !!(pricesMap?.[symbol]) };
    });
    setPortfolioData(enrichedData);
    setRawData(data);
  };

  const fetchRealTimePrices = async (data) => {
    setPriceLoading(true);
    setUpdateError(null);
    setLoadingMessage('更新即時股價中...');
    const uniqueSymbols = [...new Set(data.map(item => item['標的']))];
    const newPrices = {};
    const failedSymbols = [];

    const promises = uniqueSymbols.map(async (symbol) => {
      if (!symbol || symbol.includes('TD') || symbol === '定存') return;

      const maxRetries = 2;
      let attempts = 0;
      let success = false;

      while(attempts <= maxRetries && !success) {
        try {
          const targetUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`;
          const result = await fetchWithProxyFallback(targetUrl);
          const meta = result?.chart?.result?.[0]?.meta;
          
          if (meta && meta.regularMarketPrice) {
            newPrices[symbol] = meta.regularMarketPrice;
            success = true;
          } else {
            throw new Error('Data format error');
          }
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
    
    setRealTimePrices(prev => ({ ...prev, ...newPrices }));
    setPriceLoading(false);
    setLastUpdated(new Date()); 
    
    if (failedSymbols.length > 0) {
      setUpdateError(`更新失敗的標的: ${failedSymbols.join(', ')}`);
    }

    processData(data, newPrices);
  };

  const callGeminiWithFallback = async (prompt) => {
    if (!geminiApiKey) {
      const confirm = window.confirm("尚未設定 AI 金鑰。\n\n單機版需要您自己的 Google Gemini API Key 才能運作 AI 分析功能。\n\n是否現在前往「設定」頁面輸入？");
      if (confirm) setActiveTab('config');
      throw new Error("請先至「設定」頁面儲存 API Key");
    }

    const models = ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-2.5-flash-preview-09-2025'];
    for (const model of models) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
          }
        );

        if (!response.ok) {
          console.warn(`Model ${model} failed: ${response.status}`);
          continue;
        }

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          setUsedModel(model);
          return text;
        }
      } catch (err) {
        console.error(`Error calling ${model}:`, err);
      }
    }
    throw new Error("AI 服務連線失敗，請檢查 API Key 權限或網路狀態。");
  };

  const generateSummary = async (symbol, data) => {
    if (!data || data.length === 0) return;
    setIsAiSummarizing(true);
    setAiSummary(null);
    setAiDetail(null); 
    setIsDetailExpanded(false);
    setAnalysisSymbol(symbol); // Reset symbol marker initially

    const latest = data[data.length - 1];
    const stockName = tradableSymbols.find(t => t['標的'] === symbol)?.['名稱'] || symbol;
    
    const prompt = `
      請以一位專業股票分析師的角色，針對 ${symbol} (${stockName}) 進行極簡短技術分析。
      數據：收盤 ${formatPrice(latest.close)}, MA20 ${latest.MA20 ? formatPrice(latest.MA20) : '-'}, MA60 ${latest.MA60 ? formatPrice(latest.MA60) : '-'}, KD(K=${latest.K ? formatPrice(latest.K) : '-'}, D=${latest.D ? formatPrice(latest.D) : '-'}), MACD(OSC=${latest.OSC ? formatPrice(latest.OSC) : '-'}).
      限制：請用繁體中文，50 字以內，直接講重點（如：趨勢多空、關鍵支撐/壓力、KD交叉狀況）。
    `;

    try {
      const text = await callGeminiWithFallback(prompt);
      setAiSummary(text);
      // Ensure symbol is set (in case of race condition)
      setAnalysisSymbol(symbol); 
    } catch (err) {
      setAiSummary(err.message || "分析暫時無法使用。");
      setAnalysisSymbol(symbol); // Still mark as handled even if error
    } finally {
      setIsAiSummarizing(false);
    }
  };

  const generateDetail = async () => {
    if (!selectedHistorySymbol) return;
    const key = `${selectedHistorySymbol}_${timeframe}`;
    const chartData = historicalData[key];
    if (!chartData || chartData.length === 0) return;

    setIsAiDetailing(true);
    setIsDetailExpanded(true); 

    const latest = chartData[chartData.length - 1];
    const stockName = tradableSymbols.find(t => t['標的'] === selectedHistorySymbol)?.['名稱'] || selectedHistorySymbol;
    
    const prompt = `
      請以一位專業股票分析師的角色，提供 ${selectedHistorySymbol} (${stockName}) 的完整技術面分析報告。
      週期：${timeframe === '1y_1d' ? '日線' : timeframe === '5y_1wk' ? '週線' : '月線'}
      
      最新技術指標：
      - 價格: ${formatPrice(latest.close)}
      - 均線: MA20=${latest.MA20 ? formatPrice(latest.MA20) : 'N/A'}, MA60=${latest.MA60 ? formatPrice(latest.MA60) : 'N/A'}, MA120=${latest.MA120 ? formatPrice(latest.MA120) : 'N/A'}
      - 動能: KD(9,3,3) K=${latest.K ? formatPrice(latest.K) : 'N/A'}, D=${latest.D ? formatPrice(latest.D) : 'N/A'}
      - 趨勢: MACD(12,26,9) DIF=${latest.DIF ? formatPrice(latest.DIF) : 'N/A'}, MACD=${latest.Signal ? formatPrice(latest.Signal) : 'N/A'}, OSC=${latest.OSC ? formatPrice(latest.OSC) : 'N/A'}

      輸出格式 (Markdown)：
      1. **趨勢研判**：均線排列與多空方向。
      2. **訊號解讀**：KD 與 MACD 的交叉與背離狀況。
      3. **關鍵價位**：觀察支撐與壓力。
      4. **操作建議**：針對持股者與空手者的具體建議。
    `;

    try {
      const text = await callGeminiWithFallback(prompt);
      setAiDetail(text);
    } catch (err) {
      setAiDetail(err.message || "詳細分析生成失敗，請稍後再試。");
    } finally {
      setIsAiDetailing(false);
    }
  };

  const fetchHistoricalData = async (symbol, tf) => {
    if (!symbol || symbol.includes('TD') || symbol === '定存') return;

    setHistoryLoading(true);
    setHistoryError(null);
    
    // 不在此處呼叫 generateSummary，避免職責混淆，改由 useEffect 監聽數據變化來觸發
    setAnalysisSymbol(null); // Reset analysis marker to indicate "not analyzed yet" for this new selection
    
    // Clear UI immediately
    setAiSummary(null);
    setAiDetail(null);
    setIsDetailExpanded(false);

    try {
      let range = '5y'; let interval = '1wk';
      if (tf === '1y_1d') { range = '2y'; interval = '1d'; } 
      if (tf === '10y_1mo') { range = '10y'; interval = '1mo'; }
      if (tf === '5y_1wk') { range = '5y'; interval = '1wk'; }

      const targetUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=${interval}&range=${range}`;
      const result = await fetchWithProxyFallback(targetUrl);
      const chartData = result?.chart?.result?.[0];
      
      if (chartData && chartData.timestamp) {
        const timestamps = chartData.timestamp;
        const quote = chartData.indicators.quote[0];
        const rawPoints = timestamps.map((ts, i) => ({ date: new Date(ts * 1000).toISOString().slice(0, 10), close: quote.close[i], high: quote.high[i], low: quote.low[i], open: quote.open[i] })).filter(d => d.close != null && d.high != null);
        const processedData = processTechnicalData(rawPoints);
        setHistoricalData(prev => ({ ...prev, [`${symbol}_${tf}`]: processedData }));
        // Note: We don't call generateSummary here anymore. The useEffect will handle it.
      } else {
        throw new Error('No chart data found');
      }
    } catch (err) {
      console.warn(`無法取得 ${symbol} 的歷史數據:`, err);
      setHistoryError("無法載入圖表數據，可能是代號錯誤或來源不穩，請稍後再試。");
    } finally {
      setHistoryLoading(false);
    }
  };

  const performFetch = async (url) => {
    setLoading(true); setError(null); setUpdateError(null); setRealTimePrices({}); setHistoricalData({});
    try {
      const Papa = await loadPapaParse();
      Papa.parse(url, {
        download: true, header: true,
        complete: (results) => {
          if (results.data && results.data.length > 0) {
            const validData = results.data.filter(row => row['標的'] && row['價格']);
            processData(validData, {}); setLoading(false); fetchRealTimePrices(validData);
            const first = validData.find(d => d['類別'] !== '定存');
            if (first) setSelectedHistorySymbol(first['標的']);
            localStorage.setItem('investment_sheet_url', url);
          } else { setError('讀取到的資料為空'); setLoading(false); }
        },
        error: (err) => { setError(`讀取失敗: ${err.message}`); setLoading(false); }
      });
    } catch (e) { setError('無法載入解析庫'); setLoading(false); }
  };

  const handleFetchButton = () => { if (!sheetUrl) { alert("請輸入 URL"); return; } performFetch(sheetUrl); };
  
  const handleSaveApiKey = () => {
    localStorage.setItem('gemini_api_key', geminiApiKey);
    alert("Gemini API Key 已儲存！您可以開始使用 AI 功能了。");
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
    if (savedKey) setGeminiApiKey(savedKey);

    if (savedUrl) { setSheetUrl(savedUrl); performFetch(savedUrl); } 
    else { processData(DEMO_DATA, {}); fetchRealTimePrices(DEMO_DATA); const firstStock = DEMO_DATA.find(d => d['類別'] === '股票' || d['類別'] === '債券'); if (firstStock) setSelectedHistorySymbol(firstStock['標的']); }
  }, []);

  // Main Effect for History Tab: Handles both Data Fetching AND AI Generation Logic
  useEffect(() => {
    if (activeTab === 'history' && selectedHistorySymbol) {
      const key = `${selectedHistorySymbol}_${timeframe}`;
      const hasData = !!historicalData[key];
      const isAnalysisOutdated = analysisSymbol !== selectedHistorySymbol;

      // 1. Clear UI immediately if switching symbols
      if (isAnalysisOutdated && aiSummary && !isAiSummarizing) {
         setAiSummary(null);
         setAiDetail(null);
         setIsDetailExpanded(false);
      }

      if (!hasData) {
        // 2. No data found -> Fetch Data
        if (!historyLoading) {
           fetchHistoricalData(selectedHistorySymbol, timeframe);
        }
      } else {
        // 3. Has Data -> Check if we need to Generate AI Summary
        // Trigger condition: Analysis symbol doesn't match current symbol, AND we have API key, AND not currently generating
        if (isAnalysisOutdated && geminiApiKey && !isAiSummarizing) {
           generateSummary(selectedHistorySymbol, historicalData[key]);
        }
      }
    }
  }, [activeTab, selectedHistorySymbol, timeframe, historicalData, analysisSymbol, geminiApiKey, isAiSummarizing, historyLoading, aiSummary]);

  const summary = useMemo(() => {
    const totalCost = portfolioData.reduce((sum, item) => sum + item.costBasis, 0);
    const totalValue = portfolioData.reduce((sum, item) => sum + item.marketValue, 0);
    const totalPL = totalValue - totalCost;
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
      if (!map.has(key)) { map.set(key, { ...item, shares: 0, costBasis: 0, marketValue: 0, dates: new Set() }); }
      const entry = map.get(key);
      entry.shares += item.shares; entry.costBasis += item.costBasis; entry.marketValue += item.marketValue; entry.dates.add(item['日期']);
      if (item.currentPrice !== item.buyPrice) entry.currentPrice = item.currentPrice;
    });
    return Array.from(map.values()).map(item => {
      const profitLoss = item.marketValue - item.costBasis;
      const roi = item.costBasis > 0 ? profitLoss / item.costBasis : 0;
      return { ...item, buyPrice: item.shares > 0 ? item.costBasis / item.shares : 0, profitLoss, roi, dates: Array.from(item.dates).sort().slice(-1)[0] };
    });
  }, [portfolioData]);

  useEffect(() => {
    if (aggregatedHoldings.length > 0) {
      setCustomOrder(prev => {
        const currentSymbols = aggregatedHoldings.map(h => h['標的']);
        if (prev.length === 0) return currentSymbols;
        const existing = prev.filter(s => currentSymbols.includes(s));
        const newSymbols = currentSymbols.filter(s => !prev.includes(s));
        return [...existing, ...newSymbols];
      });
    }
  }, [aggregatedHoldings]);

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
        const buyDate = new Date(buy['日期']);
        let closestIdx = -1; let minDiff = Infinity;
        merged.forEach((pt, i) => {
            const ptDate = new Date(pt.date);
            const diff = Math.abs(buyDate - ptDate);
            if (diff < minDiff) { minDiff = diff; closestIdx = i; }
        });
        if (closestIdx !== -1) merged[closestIdx] = { ...merged[closestIdx], buyPricePoint: buy['價格'], buyAction: buy };
    });
    return merged;
  }, [historicalData, selectedHistorySymbol, timeframe, portfolioData]);

  const SortIcon = ({ columnKey }) => {
    if (sortConfig.key !== columnKey) return <ArrowUpDown className="w-3 h-3 ml-1 text-slate-600 opacity-50" />;
    return sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3 ml-1 text-blue-400" /> : <ArrowDown className="w-3 h-3 ml-1 text-blue-400" />;
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans pb-20 md:pb-0">
      <nav className="hidden md:block border-b border-slate-700 bg-slate-800/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <div className="flex items-center">
            <div className="bg-blue-600 p-2 rounded-lg"><TrendingUp className="h-6 w-6 text-white" /></div>
            <span className="ml-3 text-xl font-bold tracking-wider">Alpha 投資戰情室</span>
          </div>
          <div className="flex space-x-4">
            {['overview', 'history', 'holdings', 'config'].map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === tab ? 'bg-slate-900 text-blue-400' : 'text-slate-300 hover:bg-slate-700'}`}>
                {tab === 'overview' ? '資產總覽' : tab === 'history' ? '歷史走勢' : tab === 'holdings' ? '持股明細' : '設定'}
              </button>
            ))}
          </div>
        </div>
      </nav>

      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-800 border-t border-slate-700 z-50 flex justify-around py-3 pb-safe">
        {[ { id: 'overview', icon: PieIcon, label: '總覽' }, { id: 'history', icon: LineIcon, label: '走勢' }, { id: 'holdings', icon: FileText, label: '明細' }, { id: 'config', icon: Settings, label: '設定' } ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex flex-col items-center justify-center w-full ${activeTab === tab.id ? 'text-blue-400' : 'text-slate-400'}`}><tab.icon className="h-6 w-6 mb-1" /><span className="text-[10px]">{tab.label}</span></button>
        ))}
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-8">
        {priceLoading && <div className="mb-6 bg-blue-900/30 border border-blue-500/30 rounded-lg p-3 flex items-center animate-pulse"><Loader2 className="w-5 h-5 text-blue-400 animate-spin mr-3" /><span className="text-sm text-blue-200">{loadingMessage}</span></div>}
        {updateError && <div className="mb-6 bg-red-900/30 border border-red-500/30 rounded-lg p-3 flex items-center"><AlertTriangle className="w-5 h-5 text-red-400 mr-3 flex-shrink-0" /><span className="text-sm text-red-200">{updateError}</span></div>}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          {[
            { label: '總資產現值', value: formatCurrency(summary.totalValue), icon: DollarSign, color: 'text-yellow-400', bg: 'bg-blue-900/50', iColor: 'text-blue-400' },
            { label: '投入成本', value: formatCurrency(summary.totalCost), icon: Briefcase, color: 'text-white', bg: 'bg-purple-900/50', iColor: 'text-purple-400' },
            { label: '未實現損益', value: `${summary.totalPL > 0 ? '+' : ''}${formatCurrency(summary.totalPL)}`, icon: summary.totalPL >= 0 ? ArrowUpCircle : ArrowDownCircle, color: summary.totalPL >= 0 ? 'text-red-500' : 'text-green-500', bg: summary.totalPL >= 0 ? 'bg-red-900/30' : 'bg-green-900/30', iColor: summary.totalPL >= 0 ? 'text-red-500' : 'text-green-500' },
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

        {activeTab === 'history' && (
          <div className="flex flex-col lg:grid lg:grid-cols-4 gap-6">
            <div className="lg:col-span-1 bg-slate-800 rounded-xl border border-slate-700 shadow-lg overflow-hidden flex flex-col h-48 lg:h-[700px]">
              <div className="p-4 border-b border-slate-700 bg-slate-900/50 flex justify-between items-center sticky top-0 z-10"><h3 className="font-semibold text-white flex items-center"><LineIcon className="w-5 h-5 mr-2 text-blue-400" /> 持股列表</h3></div>
              <div className="overflow-y-auto flex-1 p-2 space-y-2">
                {tradableSymbols.map((item) => (
                  <button key={item['標的']} onClick={() => setSelectedHistorySymbol(item['標的'])} className={`w-full text-left px-4 py-3 rounded-lg transition-all border ${selectedHistorySymbol === item['標的'] ? 'bg-blue-600 border-blue-500 text-white shadow-md' : 'bg-slate-700/30 border-transparent text-slate-300 hover:bg-slate-700'}`}>
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
                <div className="flex items-center justify-between mb-3"><div className="flex items-center"><Sparkles className="w-5 h-5 text-purple-400 mr-2" /><h4 className="text-white font-semibold">AI 智能觀點</h4>{usedModel && <span className="ml-2 text-xs px-2 py-0.5 rounded bg-slate-700 text-slate-300 border border-slate-600">{usedModel}</span>}</div>{!aiDetail && !isAiDetailing && <button onClick={generateDetail} className="text-xs text-blue-400 hover:text-blue-300 flex items-center transition-colors"><FileSearch className="w-3 h-3 mr-1" />查看完整分析</button>}</div>
                <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700 shadow-inner">
                  {isAiSummarizing ? <div className="flex items-center text-slate-400 text-sm"><Loader2 className="w-4 h-4 animate-spin mr-2" />正在生成 50 字摘要...</div> : aiSummary ? <div className="mb-3"><p className="text-slate-300 text-sm leading-relaxed border-l-2 border-purple-500 pl-3">{aiSummary}</p></div> : <div className="text-slate-500 text-sm">等待分析數據...</div>}
                  {(isAiDetailing || aiDetail) && <div className={`mt-3 pt-3 border-t border-slate-700/50 transition-all duration-500 ease-in-out ${isDetailExpanded ? 'opacity-100 max-h-[1000px]' : 'opacity-0 max-h-0 overflow-hidden'}`}>{isAiDetailing ? <div className="flex flex-col items-center justify-center py-4 text-slate-400"><Loader2 className="w-6 h-6 animate-spin mb-2 text-purple-500" /><span className="text-xs">正在進行深度運算 (Trend, KD, MACD)...</span></div> : <div><div className="flex justify-between items-center mb-2"><span className="text-xs font-semibold text-purple-300">完整技術報告</span><button onClick={() => setIsDetailExpanded(!isDetailExpanded)} className="text-slate-500 hover:text-white">{isDetailExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}</button></div><div className="prose prose-invert prose-sm max-w-none text-slate-300 whitespace-pre-wrap leading-relaxed text-xs max-h-64 overflow-y-auto pr-2 custom-scrollbar">{aiDetail}</div></div>}</div>}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center"><PieIcon className="w-5 h-5 mr-2 text-blue-400" /> 資產類別配置</h3>
              <div className="h-80 w-full"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={allocationData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value">{allocationData.map((entry, index) => <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[entry.name] || COLORS[index % COLORS.length]} />)}</Pie><RechartsTooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f1f5f9' }} itemStyle={{ color: '#FACC15' }} formatter={(value) => formatCurrency(value)} /><Legend content={(props) => <ul className="flex flex-wrap justify-center gap-4 mt-4">{props.payload.map((entry, index) => <li key={`item-${index}`} className="flex items-center text-sm text-slate-300"><span className="block w-3 h-3 rounded-full mr-2" style={{ backgroundColor: entry.color }}></span>{entry.value} <span className="ml-1 text-slate-400">({formatPercent(allocationData.find(d => d.name === entry.value)?.percentage)})</span></li>)}</ul>} verticalAlign="bottom" /></PieChart></ResponsiveContainer></div>
            </div>
            <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center"><BarChart2 className="w-5 h-5 mr-2 text-purple-400" /> 持股標的分佈 (不含定存)</h3>
              <div className="h-80 w-full"><ResponsiveContainer width="100%" height="100%"><BarChart data={tradableSymbols.map(item => ({ name: item['名稱'], value: item.marketValue })).sort((a, b) => b.value - a.value)} layout="vertical" margin={{ top: 5, right: 40, left: 40, bottom: 5 }}><CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} /><XAxis type="number" stroke="#94a3b8" tickFormatter={(val) => `${val / 1000}k`} /><YAxis dataKey="name" type="category" stroke="#94a3b8" width={80} /><RechartsTooltip cursor={{fill: '#334155', opacity: 0.4}} contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f1f5f9' }} itemStyle={{ color: '#FACC15' }} formatter={(value) => formatCurrency(value)} /><Bar dataKey="value" fill="#8B5CF6" radius={[0, 4, 4, 0]} barSize={30}>{tradableSymbols.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}</Bar></BarChart></ResponsiveContainer></div>
            </div>
          </div>
        )}

        {activeTab === 'holdings' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center px-2">
              <h3 className="text-lg font-semibold text-white flex items-center"><FileText className="w-5 h-5 mr-2 text-blue-400" /> 持股明細表</h3>
              <button onClick={() => fetchRealTimePrices(rawData)} className="text-xs flex items-center text-blue-400 hover:text-blue-300 transition-colors"><RefreshCw className={`w-3 h-3 mr-1 ${priceLoading ? 'animate-spin' : ''}`} />{priceLoading ? '更新中...' : '立即更新股價'}</button>
            </div>

            <div className="block md:hidden space-y-4">
              <div className="bg-slate-800 p-3 rounded-lg border border-slate-700 flex items-center space-x-2 overflow-x-auto">
                <span className="text-xs text-slate-400 whitespace-nowrap">排序依據:</span>
                {[ { id: 'manual', label: '自訂' }, { id: 'buyPrice', label: '成本' }, { id: 'profitLoss', label: '損益' }, { id: 'roi', label: '報酬' } ].map(opt => (
                  <button key={opt.id} onClick={() => requestSort(opt.id)} className={`px-3 py-1 rounded text-xs border ${sortConfig.key === opt.id ? 'bg-blue-600 border-blue-500 text-white' : 'border-slate-600 text-slate-400'}`}>{opt.label} {sortConfig.key === opt.id && (sortConfig.direction === 'asc' ? '↑' : '↓')}</button>
                ))}
              </div>

              {sortedHoldings.map((row, index) => (
                <div key={row['標的']} className="bg-slate-800 p-4 rounded-xl border border-slate-700 shadow-md relative">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-lg font-bold text-white">{row['標的']}</span>
                        <span className={`text-xs px-2 py-0.5 rounded ${row['類別'] === '股票' ? 'bg-blue-900 text-blue-200' : 'bg-purple-900 text-purple-200'}`}>{row['類別']}</span>
                      </div>
                      <div className="text-sm text-slate-400 mt-1">{row['名稱']}</div>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className={`text-lg font-bold ${row.profitLoss >= 0 ? 'text-red-500' : 'text-green-500'}`}>{formatPercent(row.roi)}</span>
                      <span className={`text-xs ${row.profitLoss >= 0 ? 'text-red-400' : 'text-green-400'}`}>{row.profitLoss > 0 ? '+' : ''}{formatCurrency(row.profitLoss)}</span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                    <div><span className="text-slate-500 block text-xs">現價</span><span className="text-white font-medium">{row.currentPrice.toFixed(2)}</span></div>
                    <div><span className="text-slate-500 block text-xs">成本</span><span className="text-slate-300">{row.buyPrice.toFixed(2)}</span></div>
                    <div><span className="text-slate-500 block text-xs">市值</span><span className="text-white">{formatCurrency(row.marketValue)}</span></div>
                    <div><span className="text-slate-500 block text-xs">股數</span><span className="text-slate-300">{row.shares.toLocaleString()}</span></div>
                  </div>

                  <div className="flex justify-end space-x-2 pt-2 border-t border-slate-700/50">
                    <button onClick={(e) => { e.stopPropagation(); moveItem(row['標的'], -1); }} className="p-2 bg-slate-700 rounded hover:bg-slate-600 text-slate-300"><ArrowUp className="w-4 h-4" /></button>
                    <button onClick={(e) => { e.stopPropagation(); moveItem(row['標的'], 1); }} className="p-2 bg-slate-700 rounded hover:bg-slate-600 text-slate-300"><ArrowDown className="w-4 h-4" /></button>
                  </div>
                </div>
              ))}
            </div>

            <div className="hidden md:block bg-slate-800 rounded-xl border border-slate-700 shadow-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-700">
                  <thead className="bg-slate-900/50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider w-20">排序</th>
                      {[ { label: '標的代號', key: '標的' }, { label: '名稱/類別', key: '類別' }, { label: '平均成本', key: 'buyPrice' }, { label: 'Yahoo即時價', key: 'currentPrice' }, { label: '總股數', key: 'shares' }, { label: '總損益', key: 'profitLoss' }, { label: '報酬率', key: 'roi' } ].map(header => (
                        <th key={header.key} onClick={() => requestSort(header.key)} className={`px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider cursor-pointer hover:text-white transition-colors group ${header.label.includes('代號') || header.label.includes('名稱') ? 'text-left' : 'text-right'}`}><div className={`flex items-center ${header.label.includes('代號') || header.label.includes('名稱') ? 'justify-start' : 'justify-end'}`}>{header.label}<SortIcon columnKey={header.key} /></div></th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-slate-800 divide-y divide-slate-700">
                    {sortedHoldings.map((row, index) => (
                      <tr key={row['標的']} className="hover:bg-slate-700/50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap"><div className="flex flex-col space-y-1">{index > 0 && <button onClick={(e) => { e.stopPropagation(); moveItem(row['標的'], -1); }} className="p-1 rounded hover:bg-slate-600 text-slate-400 hover:text-white"><ArrowUp className="w-3 h-3" /></button>}{index < sortedHoldings.length - 1 && <button onClick={(e) => { e.stopPropagation(); moveItem(row['標的'], 1); }} className="p-1 rounded hover:bg-slate-600 text-slate-400 hover:text-white"><ArrowDown className="w-3 h-3" /></button>}</div></td>
                        <td className="px-6 py-4 whitespace-nowrap text-left"><div className="text-sm text-white font-medium flex items-center">{row['標的']}{row.isRealData ? <Wifi className="w-3 h-3 ml-1 text-green-500" /> : row['類別'] !== '定存' && <WifiOff className="w-3 h-3 ml-1 text-slate-600" />}</div><div className="text-xs text-slate-500">最近交易: {row['日期']}</div></td>
                        <td className="px-6 py-4 whitespace-nowrap text-left"><div className="text-sm text-slate-200">{row['名稱']}</div><span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium mt-1 ${row['類別'] === '股票' ? 'bg-blue-900 text-blue-200' : row['類別'] === '債券' ? 'bg-purple-900 text-purple-200' : 'bg-green-900 text-green-200'}`}>{row['類別']}</span></td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-slate-300">{row.buyPrice.toFixed(2)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold text-yellow-400">{row.currentPrice.toFixed(2)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-slate-300">{row.shares.toLocaleString()}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold relative group">
                          <span className={`cursor-help border-b border-dotted ${row.profitLoss >= 0 ? 'text-red-500 border-red-500' : 'text-green-500 border-green-500'}`}>{row.profitLoss > 0 ? '+' : ''}{formatCurrency(row.profitLoss)}</span>
                          <div className={`absolute right-0 z-50 w-48 p-3 bg-slate-700 border border-slate-600 rounded-lg shadow-xl text-left pointer-events-none hidden group-hover:block ${index < 2 ? 'top-full mt-2' : 'bottom-full mb-2'}`}><div className="text-xs text-slate-400 mb-1">損益詳情</div><div className="flex justify-between text-xs mb-1"><span className="text-slate-300">總成本:</span><span className="text-white font-medium">{formatCurrency(row.costBasis)}</span></div><div className="flex justify-between text-xs"><span className="text-slate-300">總市值:</span><span className="text-yellow-400 font-medium">{formatCurrency(row.marketValue)}</span></div><div className={`absolute right-4 border-4 border-transparent ${index < 2 ? 'bottom-full -mb-1 border-b-slate-600' : 'top-full -mt-1 border-t-slate-600'}`}></div></div>
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-right text-sm font-bold ${row.roi >= 0 ? 'text-red-500' : 'text-green-500'}`}>{formatPercent(row.roi)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'config' && (
          <div className="max-w-2xl mx-auto bg-slate-800 p-8 rounded-xl border border-slate-700 shadow-lg">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center"><Settings className="w-6 h-6 mr-3 text-blue-500" /> 資料來源設定</h2>
            <div className="space-y-4">
              <div><label className="block text-sm font-medium text-slate-300 mb-2">Google Sheets CSV 連結</label><div className="flex rounded-md shadow-sm"><input type="text" value={sheetUrl} onChange={(e) => setSheetUrl(e.target.value)} placeholder="https://docs.google.com/spreadsheets/d/.../pub?output=csv" className="flex-1 min-w-0 block w-full px-4 py-3 rounded-md bg-slate-900 border border-slate-600 text-white focus:ring-blue-500 focus:border-blue-500 sm:text-sm" /></div></div>
              
              <div className="pt-4 border-t border-slate-700">
                <label className="block text-sm font-medium text-slate-300 mb-2">Google Gemini API Key (AI 分析用)</label>
                <div className="flex gap-2">
                    <input type="password" value={geminiApiKey} onChange={(e) => setGeminiApiKey(e.target.value)} placeholder="請輸入 API Key (例如: AIzaSy...)" className="flex-1 min-w-0 block w-full px-4 py-3 rounded-md bg-slate-900 border border-slate-600 text-white focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                    <button onClick={handleSaveApiKey} className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md text-sm font-medium transition-colors"><Save className="w-4 h-4 mr-1 inline" />儲存</button>
                </div>
                <p className="mt-2 text-xs text-slate-500">* 單機版需自行申請 API Key 才能使用 AI 功能。<a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-blue-400 hover:text-blue-300 ml-1 underline">前往申請</a></p>
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
