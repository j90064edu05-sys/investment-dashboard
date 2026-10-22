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
 * Alpha 投資戰情室 v56.00 (完整整合版 - 基於 v55.00 架構升級)
 * * [核心功能與架構說明]
 * 1. AI 模型升級：支援 gemini-3.7-flash (預設)、gemini-3.6-flash、gemini-3.7-flash-lite。
 * 2. 邏輯交易日精準校正：非交易時間（假日、早於 09:00 或盤後 API 早於 15:00）自動對齊最近一次真實交易日。
 * 3. 完整 OHLCV 手動 K 線修補：支援開、高、低、收、量完整欄位輸入與重新計算，並放寬左側資訊欄寬度避免日期截斷。
 * 4. 歷史走勢 AI 分析與回測：提供「綜合趨勢分析 (含市場定價與新聞影響)」與「回測交易策略」兩種模式，由使用者手動決定分析時機。
 * 5. 投資組合壓力測試：AI 總體健檢室整合集中風險、產業曝險與極端市況（修正10%、熊市20%、升息、衰退）模擬。
 * 6. 雲端表單雙向同步 (v56.00)：分析結果自動同步至 Google 表單 (`AI_分析報告`) 供下次使用；持股明細可設定單一個股是否啟用自動分析。
 */

const DEMO_DATA = [
  { 日期: '2015-01-15', 標的: '2330.TW', 名稱: '台積電', 類別: '股票', 價格: 140, 股數: 1000, 策略: '基礎買入', 金額: 140000 },
  { 日期: '2020-03-20', 標的: '2330.TW', 名稱: '台積電', 類別: '股票', 價格: 270, 股數: 500, 策略: '金字塔_S1', 金額: 135000 },
  { 日期: '2018-02-20', 標的: '0050.TW', 名稱: '元大台灣50', 類別: '股票', 價格: 80, 股數: 2000, 策略: '基礎買入', 金額: 160000 },
  { 日期: '2021-03-10', 標的: '00679B.TWO', 名稱: '元大美債20年', 類別: '債券', 價格: 30, 股數: 1000, 策略: '基礎買入', 金額: 30000 }
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
  { id: 'gemini-3.7-flash', name: 'Gemini 3.7 Flash (最新穩定版)' },
  { id: 'gemini-3.6-flash', name: 'Gemini 3.6 Flash (穩定)' },
  { id: 'gemini-3.7-flash-lite', name: 'Gemini 3.7 Flash-Lite (快速穩定)' },
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

const getLogicalTradingDate = (holidays = [], isEodApi = false) => {
    let { y, m, d, h } = getTaipeiTime();
    let dt = new Date(y, m - 1, d);
    
    // 若為盤後資料 API 且早於 15:00，或一般即時報價早於 09:00，先退回前一日
    if ((isEodApi && h < 15) || (!isEodApi && h < 9)) {
        dt.setDate(dt.getDate() - 1);
    }
    
    // 若遇到週末或國定假日，持續往回推算至最近一次交易日
    while (true) {
        const dayOfWeek = dt.getDay();
        const yStr = String(dt.getFullYear());
        const mStr = String(dt.getMonth() + 1).padStart(2, '0');
        const dStr = String(dt.getDate()).padStart(2, '0');
        const compactStr = `${yStr}${mStr}${dStr}`;
        if (dayOfWeek === 0 || dayOfWeek === 6 || (holidays && holidays.includes(compactStr))) {
            dt.setDate(dt.getDate() - 1);
        } else {
            break;
        }
    }
    
    const finalY = dt.getFullYear();
    const finalM = String(dt.getMonth() + 1).padStart(2, '0');
    const finalD = String(dt.getDate()).padStart(2, '0');
    return {
        full: `${finalY}-${finalM}-${finalD}`,
        short: `${finalM}/${finalD}`,
        compact: `${finalY}${finalM}${finalD}`
    };
};

const getTodayDate = (holidays = []) => getLogicalTradingDate(holidays, false).full;

const isTaiwanTradingHours = (holidays = []) => {
    const { y, m, d, h, min } = getTaipeiTime();
    const dt = new Date(y, m - 1, d);
    const day = dt.getDay(); 
    const compactStr = `${y}${String(m).padStart(2, '0')}${String(d).padStart(2, '0')}`;
    if (holidays && holidays.includes(compactStr)) return false;
    if (day >= 1 && day <= 5) {
        const currentMinutes = h * 60 + min;
        return currentMinutes >= 540 && currentMinutes <= 810; // 09:00 ~ 13:30
    }
    return false;
};

const getPureCode = (symbol) => {
    if (!symbol) return '';
    return String(symbol).toUpperCase().replace(/\.TWO$|\.TW$/i, '').trim();
};

const getAiCache = () => { try { return JSON.parse(localStorage.getItem('gemini_analysis_cache') || '{}'); } catch { return {}; } };
const updateAiCache = (symbol, data, dataDate) => { 
  const today = getTodayDate();
  const cache = getAiCache();
  const existing = cache[symbol] || {};
  const newEntry = { date: dataDate || today, ...existing, ...data, dataDate }; 
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
            priceSource: extraData[symbol]?.priceSource || existing.priceSource,
            prevClose: extraData[symbol]?.prevClose || existing.prevClose
        }; 
    });
    localStorage.setItem('investment_price_cache', JSON.stringify(updatedCache));
};

const renderShape = (shape, cx, cy, color, size = 5) => {
  const stroke = "#fff";
  const strokeWidth = 1.5;
  switch (shape) {
    case 'circle': return <circle cx={cx} cy={cy} r={size} fill={color} stroke={stroke} strokeWidth={strokeWidth} />;
    case 'triangle': return <path d={`M${cx},${cy-size} L${cx+size},${cy+size*0.8} L${cx-size},${cy+size*0.8} Z`} fill={color} stroke={stroke} strokeWidth={strokeWidth} />;
    case 'diamond': return <path d={`M${cx},${cy-size} L${cx+size},${cy} L${cx},${cy+size} L${cx-size},${cy} Z`} fill={color} stroke={stroke} strokeWidth={strokeWidth} />;
    case 'star': {
      const s = size * 1.2; 
      return <path d={`M${cx},${cy-s} L${cx+s*0.3},${cy-s*0.3} L${cx+s},${cy-s*0.3} L${cx+s*0.5},${cy+s*0.2} L${cx+s*0.7},${cy+s} L${cx},${cy+s*0.5} L${cx-s*0.7},${cy+s} L${cx-s*0.5},${cy+s*0.2} L${cx-s},${cy-s*0.3} L${cx-s*0.3},${cy-s*0.3} Z`} fill={color} stroke={stroke} strokeWidth={strokeWidth} />;
    }
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

    console.log(`[Network] 🌐 嘗試直連: ${targetUrl}`);
    let abortHandler;
    try {
        const controller = new AbortController();
        const tid = setTimeout(() => controller.abort(), 1500); 
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
            console.log(`[Network] 🟢 直連成功!`);
            return returnType === 'json' ? JSON.parse(text) : text;
        }
    } catch(e) {
        if (parentSignal && abortHandler) parentSignal.removeEventListener('abort', abortHandler);
        if (parentSignal?.aborted) throw new Error('AbortError: 手動中止');
        console.log(`[Network] 🟡 直連遭遇 CORS 或超時，啟動「快刀序列」代理備援 (Fast-Fail)`);
    }

    const encodedUrl = encodeURIComponent(bypassUrl);
    const proxyCb = `__pcb=${Date.now()}`;
    
    let proxies = [
        { name: 'cors.lol', url: `https://api.cors.lol/?url=${encodedUrl}`, type: 'raw' },
        { name: 'codetabs', url: `https://api.codetabs.com/v1/proxy?quest=${encodedUrl}&${proxyCb}`, type: 'raw' },
        { name: 'allorigins-raw', url: `https://api.allorigins.win/raw?url=${encodedUrl}&disableCache=true&${proxyCb}`, type: 'raw' },
        { name: 'cors-proxy.htmldriven', url: `https://cors-proxy.htmldriven.com/?url=${encodedUrl}`, type: 'raw' },
        { name: 'thingproxy', url: `https://thingproxy.freeboard.io/fetch/${bypassUrl}`, type: 'raw' }
    ];

    try {
        const customProxy = localStorage.getItem('custom_proxy_url');
        if (customProxy && customProxy.trim() !== '') {
            let pUrl = customProxy.trim();
            const finalUrl = pUrl.includes('?') 
                ? (pUrl.endsWith('=') ? pUrl + encodedUrl : pUrl + '&url=' + encodedUrl)
                : pUrl + '?url=' + encodedUrl;
            proxies.unshift({ name: '自訂 Proxy', url: finalUrl, type: 'raw' });
        }
    } catch(e) {}

    if (!isYahoo) {
        proxies.push({ name: 'allorigins-get', url: `https://api.allorigins.win/get?url=${encodedUrl}&disableCache=true&${proxyCb}`, type: 'wrapper' });
    }

    for (const proxy of proxies) {
        if (parentSignal?.aborted) throw new Error('AbortError: 手動中止');
        console.log(`[Network] 🔄 嘗試 Proxy [${proxy.name}]...`);
        let proxyAbortHandler;
        try {
            const controller = new AbortController();
            const tid = setTimeout(() => controller.abort(), timeoutMs);
            if (parentSignal) {
                proxyAbortHandler = () => controller.abort();
                parentSignal.addEventListener('abort', proxyAbortHandler);
            }
            
            const res = await fetch(proxy.url, { method: 'GET', credentials: 'omit', cache: 'no-store', signal: controller.signal });
            const text = await res.text(); 
            clearTimeout(tid);
            if (parentSignal && proxyAbortHandler) parentSignal.removeEventListener('abort', proxyAbortHandler);

            let resultData;
            if (proxy.type === 'wrapper') {
                const wrapper = JSON.parse(text);
                if (wrapper.status && wrapper.status.http_code >= 400) throw new Error(`HTTP ${wrapper.status.http_code}`);
                if (!wrapper.contents) throw new Error('No contents in wrapper');
                const contentText = wrapper.contents;
                
                if (typeof contentText === 'string') {
                    if (contentText.includes('Oops...') || contentText.includes('Rate limit')) throw new Error('Rate Limited by Proxy');
                    if (contentText.trim().toLowerCase().startsWith('<html') && !targetUrl.includes('tradingeconomics')) throw new Error('HTML Blocked');
                }
                
                resultData = returnType === 'json' ? (typeof contentText === 'string' ? JSON.parse(contentText) : contentText) : contentText;
            } else {
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                if (typeof text === 'string') {
                    if (text.includes('Oops...') || text.includes('Edge: Too') || text.includes('Rate limit') || text.includes('429 Too Many Requests')) throw new Error('Rate Limited by Proxy');
                    if (text.trim().toLowerCase().startsWith('<html') && !targetUrl.includes('tradingeconomics')) throw new Error('HTML Blocked');
                    if (targetUrl.includes('all_etf.txt') && text.length < 500) throw new Error('Data too short (Blocked)');
                }
                resultData = returnType === 'json' ? JSON.parse(text) : text;
            }

            if (isYahoo && returnType === 'json' && resultData) {
                if (resultData.chart && resultData.chart.error) throw new Error(`Yahoo API Error: ${resultData.chart.error.code}`);
            }

            console.log(`[Network] 🟢 [${proxy.name}] 成功取得資料!`);
            return resultData; 

        } catch (e) {
            if (parentSignal && proxyAbortHandler) parentSignal.removeEventListener('abort', proxyAbortHandler);
            if (parentSignal?.aborted) throw new Error('AbortError: 手動中止');
            const errName = e.name === 'AbortError' ? `超時 (>${timeoutMs}ms)` : e.message;
            console.log(`[Network] 🔴 [${proxy.name}] 失敗: ${errName}`);
        }
    }
    
    if (parentSignal?.aborted) throw new Error('AbortError: 手動中止');
    console.warn(`[Network] ❌ 所有 Proxy 皆失敗: ${targetUrl}`);
    return null;
};

const fetchOfficialDataWithDegradation = async (url, parentSignal = null) => {
    if (parentSignal?.aborted) throw new Error('AbortError: 手動中止');
    const isHugeFile = url.includes('STOCK_DAY_ALL') || 
                       url.includes('BWIBBU_ALL') || 
                       url.includes('tpex_mainboard_quotes') || 
                       url.includes('pera_result') || 
                       url.includes('a1271825') || 
                       url.includes('net_value_result');
                       
    console.log(`[Network] 🌐 嘗試直連開放資料: ${url.split('/').pop().split('?')[0]}`);
    let abortHandler;
    try {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), 2000); 
        if (parentSignal) {
            abortHandler = () => controller.abort();
            parentSignal.addEventListener('abort', abortHandler);
        }
        
        const bypassUrl = url.includes('?') ? `${url}&_t=${Date.now()}` : `${url}?_t=${Date.now()}`;
        const res = await fetch(bypassUrl, { method: 'GET', credentials: 'omit', cache: 'no-store', signal: controller.signal });
        const text = await res.text();
        clearTimeout(id);
        if (parentSignal && abortHandler) parentSignal.removeEventListener('abort', abortHandler);
        
        if (res.ok && !text.trim().toLowerCase().startsWith('<html')) {
             try { 
                 const parsed = JSON.parse(text); 
                 console.log(`[Network] 🟢 OpenAPI 直連成功, 筆數: ${Array.isArray(parsed) ? parsed.length : 'Object'}`);
                 return parsed;
             } catch(e) { }
        }
    } catch(e) {
        if (parentSignal && abortHandler) parentSignal.removeEventListener('abort', abortHandler);
        if (parentSignal?.aborted) throw new Error('AbortError: 手動中止');
        console.log(`[Network] 直連發生例外或超時`);
    }
    
    if (isHugeFile) {
        console.log(`[Network] 🛑 絕對阻擋官方大檔案 Proxy 備援，以保護代理健康: ${url.split('/').pop().split('?')[0]}`);
        return null;
    }

    console.log(`[Network] 🔄 啟動 Proxy 快刀序列備援抓取微型官方資料: ${url.split('/').pop().split('?')[0]}`);
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
  useEffect(() => { const timer = setTimeout(onClose, 3500); return () => clearTimeout(timer); }, [onClose]);
  if (!message) return null;
  return (<div className="fixed bottom-20 md:bottom-10 left-1/2 transform -translate-x-1/2 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg flex items-center z-[100] animate-fade-in-up"><CheckCircle className="w-5 h-5 mr-2 flex-shrink-0" /><span className="text-sm">{String(message)}</span></div>);
};

const App = () => {
  const [sheetUrl, setSheetUrl] = useState('');
  const [gasWebAppUrl, setGasWebAppUrl] = useState('');
  const [isSyncingCloud, setIsSyncingCloud] = useState(false);
  const [cloudReports, setCloudReports] = useState({});
  const [cloudReportTime, setCloudReportTime] = useState(null);
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
  const [selectedModel, setSelectedModel] = useState('gemini-3.7-flash'); 
  const [aiSignals, setAiSignals] = useState({}); 
  const [aiAnalysisType, setAiAnalysisType] = useState('DEFAULT');

  const [portfolioHealth, setPortfolioHealth] = useState(null);
  const [isHealthChecking, setIsHealthChecking] = useState(false);
  const [investmentSettings, setInvestmentSettings] = useState({}); 
  const [assetClassifications, setAssetClassifications] = useState({});

  const [chatMessages, setChatMessages] = useState([{ role: 'assistant', content: '您好！我是您的 AI 投資助理。請試著問我：「核心資產績效如何？」' }]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatEndRef = useRef(null);
  const analysisInProgressRef = useRef({});
  const [feeDiscount, setFeeDiscount] = useState(1); 
  const [toast, setToast] = useState(null);
  const [appLogs, setAppLogs] = useState([]); 
  const [customProxyUrl, setCustomProxyUrl] = useState(''); 

  // 手動補齊 OHLCV 狀態
  const [showManualPatch, setShowManualPatch] = useState(false);
  const [patchDate, setPatchDate] = useState('');
  const [patchOpen, setPatchOpen] = useState('');
  const [patchHigh, setPatchHigh] = useState('');
  const [patchLow, setPatchLow] = useState('');
  const [patchPrice, setPatchPrice] = useState('');
  const [patchVolume, setPatchVolume] = useState('');
  const [manualKLinesState, setManualKLinesState] = useState({});
  
  // SVG 看板互動狀態
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

  const isUiLocked = historyLoading || isAiSummarizing;

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

  useEffect(() => {
      const loadHolidays = async () => {
          try {
              const res = await fetchOfficialDataWithDegradation('https://openapi.twse.com.tw/v1/holidaySchedule/holidaySchedule');
              if (res && Array.isArray(res)) {
                  const apiHols = res.map(item => {
                      const dStr = item.Date || item.date || '';
                      const parts = dStr.split('/');
                      if (parts.length === 3) return `${parseInt(parts[0]) + 1911}${parts[1].padStart(2, '0')}${parts[2].padStart(2, '0')}`;
                      return dStr.replace(/\//g, '');
                  });
                  setTwseHolidays(prev => {
                      const newHols = [...new Set([...prev, ...apiHols])];
                      evaluateLastTradingDay(newHols);
                      return newHols;
                  });
              }
          } catch(e) {}
      };
      
      const evaluateLastTradingDay = (hols) => {
          const logicalToday = getLogicalTradingDate(hols, false).full;
          const todayStr = logicalToday.replace(/-/g, '');
          const [y, m] = logicalToday.split('-');
          
          let dt = new Date(parseInt(y), parseInt(m), 0); 
          let foundDateStr = '';
          
          while (true) {
              const day = dt.getDay(); 
              const dateStr = `${dt.getFullYear()}${String(dt.getMonth() + 1).padStart(2, '0')}${String(dt.getDate()).padStart(2, '0')}`;
              if (day === 0 || day === 6 || hols.includes(dateStr)) { 
                  dt.setDate(dt.getDate() - 1); 
              } else { 
                  foundDateStr = dateStr; 
                  break; 
              }
          }
          setIsLastTradingDay(foundDateStr === todayStr);
      };

      loadHolidays();
      evaluateLastTradingDay(['20240228', '20250228', '20260227', '20260403', '20260406', '20260501', '20261231']);
  }, []);

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
        const isEod = extraData?.priceSource === '官方收盤';
        let latestDateStr = getLogicalTradingDate(twseHolidays, isEod).full;
        
        if (extraData && extraData.dateStr) {
            const dStr = extraData.dateStr.split(' ')[0]; const parts = dStr.split('/'); const today = new Date();
            if (parts.length === 2) { 
                latestDateStr = `${today.getFullYear()}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
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

  const fetchRealTimePrices = async (data, forceUpdate = false) => {
    console.log("=== 開始更新股價與數據 (v56.00 Engine) ===");
    if (globalAbortRef.current) globalAbortRef.current.abort();
    globalAbortRef.current = new AbortController();
    const signal = globalAbortRef.current.signal;
    setPriceLoading(true); setUpdateError(null); setLoadingMessage('更新即時股價中...');
    
    const uniqueSymbols = [...new Set(data.map(item => item['標的']))];
    const symbolsToFetchList = uniqueSymbols.filter(s => s !== '定存' && !s.includes('-TD'));
    if (!symbolsToFetchList.includes('TWD=X')) symbolsToFetchList.push('TWD=X');
    if (!symbolsToFetchList.includes('^TNX')) symbolsToFetchList.push('^TNX');
    if (!symbolsToFetchList.includes('^TYX')) symbolsToFetchList.push('^TYX'); 
    
    const fetchTEWithTimer = async () => { const start = performance.now(); const res = await fetchTradingEconomicsYields(signal); console.log(`[Timer] TradingEconomics: ${(performance.now() - start).toFixed(2)} ms`); return res; };
    const tePromise = fetchTEWithTimer();

    const symbolToName = {}; data.forEach(item => { symbolToName[item['標的']] = item['名稱']; });
    const newPrices = { ...realTimePrices }; const newEtfData = { ...etfExtraData }; 
    const misPriceMap = {}; const misPrevPriceMap = {}; const misTimeMap = {}; const misEtfNavMap = {}; const misEtfPriceMap = {};
    const twseEtfMap = {}; const tpexEtfMap = {}; 

    try {
        if (signal.aborted) throw new Error('AbortError');
        const [twseEodRes, tpexEodRes] = await Promise.all([
            withTimer("TWSE_EOD", () => fetchOfficialDataWithDegradation('https://openapi.twse.com.tw/v1/exchangeReport/STOCK_DAY_ALL', signal)),
            withTimer("TPEx_EOD", () => fetchOfficialDataWithDegradation('https://www.tpex.org.tw/openapi/v1/tpex_mainboard_quotes', signal))
        ]);

        if (Array.isArray(twseEodRes)) { twseEodRes.forEach(item => { const code = getPureCode(item.Code || item.code); const rawPrice = item.ClosingPrice || item.closingPrice; if (code && rawPrice && rawPrice !== '--' && rawPrice !== '---') { const price = parseFloat(String(rawPrice).replace(/,/g, '')); if (!isNaN(price) && price > 0) misPriceMap[code] = price; } }); }
        if (Array.isArray(tpexEodRes)) { tpexEodRes.forEach(item => { const code = getPureCode(item.SecuritiesCompanyCode || item.Symbol || item.SecuCode || item.code); const rawPrice = item.Close || item.ClosePrice || item.close; if (code && rawPrice && rawPrice !== '--' && rawPrice !== '---') { const price = parseFloat(String(rawPrice).replace(/,/g, '')); if (!isNaN(price) && price > 0) misPriceMap[code] = price; } }); }

        if (signal.aborted) throw new Error('AbortError');
        const etfSymbols = symbolsToFetchList.filter(s => symbolToName[s]?.includes('ETF') || s.startsWith('00'));
        if (etfSymbols.length > 0) {
            const misCacheBuster = isTaiwanTradingHours(twseHolidays) ? Date.now() : getLogicalTradingDate(twseHolidays, false).compact;
            const misEtfText = await withTimer("MIS_ETF", () => smartFetch(`https://mis.twse.com.tw/stock/data/all_etf.txt?_=${misCacheBuster}`, 'text', 6000, signal));
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

        const twSymbols = symbolsToFetchList.filter(s => s.includes('.TW') || s.includes('.TWO'));
        const missingTwSymbols = twSymbols.filter(s => !misEtfPriceMap[getPureCode(s)] && !misPriceMap[getPureCode(s)]);
        if (missingTwSymbols.length > 0) {
            for (let i = 0; i < missingTwSymbols.length; i += 40) {
                if (signal.aborted) throw new Error('AbortError');
                const chunk = missingTwSymbols.slice(i, i + 40);
                const queryList = chunk.map(s => `${s.includes('.TWO') ? 'otc' : 'tse'}_${getPureCode(s)}.tw`).join('|');
                const priceRes = await withTimer(`MIS_Price_Chunk_${i/40}`, () => smartFetch(`https://mis.twse.com.tw/stock/api/getStockInfo.jsp?ex_ch=${queryList}`, 'json', 4500, signal));
                if (priceRes && priceRes.msgArray) {
                    priceRes.msgArray.forEach(item => {
                        const pureCode = getPureCode(item.c); const price = parseFloat(item.z !== '-' ? item.z : item.y); const yClose = parseFloat(item.y); 
                        if (!isNaN(price) && price > 0) { misPriceMap[pureCode] = price; misTimeMap[pureCode] = `${item.d.substring(4,6)}/${item.d.substring(6,8)} ${item.t}`; }
                        if (!isNaN(yClose) && yClose > 0) { misPrevPriceMap[pureCode] = yClose; }
                    });
                }
            }
        }

        if (signal.aborted) throw new Error('AbortError');

        const logicalRealtimeDate = getLogicalTradingDate(twseHolidays, false);
        const logicalEodDate = getLogicalTradingDate(twseHolidays, true);

        symbolsToFetchList.forEach(symbol => {
            const pureCode = getPureCode(symbol); const extra = newEtfData[symbol] || {}; const isEtf = symbolToName[symbol]?.includes('ETF') || symbol.startsWith('00');
            if (isEtf && misEtfPriceMap[pureCode]) {
                newPrices[symbol] = misEtfPriceMap[pureCode]; extra.priceSource = "MIS(e)現價";
                if (isTaiwanTradingHours(twseHolidays)) {
                    const { h, min } = getTaipeiTime();
                    extra.dateStr = `${logicalRealtimeDate.short} ${String(h).padStart(2,'0')}:${String(min).padStart(2,'0')}`;
                } else {
                    extra.dateStr = `${logicalRealtimeDate.short} 13:30`;
                }
            } else if (misPriceMap[pureCode]) {
                newPrices[symbol] = misPriceMap[pureCode]; 
                extra.dateStr = misTimeMap[pureCode] || logicalEodDate.short; 
                extra.priceSource = misTimeMap[pureCode] ? "MIS個股" : "官方收盤";
            }
            if (misPrevPriceMap[pureCode]) extra.prevClose = misPrevPriceMap[pureCode];
            if (isEtf && misEtfNavMap[pureCode]) { extra.nav = misEtfNavMap[pureCode]; extra.navSource = "MIS(f)淨值"; 
            } else if (twseEtfMap[pureCode]) { extra.nav = twseEtfMap[pureCode]; extra.navSource = "Off(TW)"; 
            } else if (tpexEtfMap[pureCode]) { extra.nav = tpexEtfMap[pureCode]; extra.navSource = "Off(TP)"; }
            newEtfData[symbol] = extra;
        });

        const symbolsForYahoo = symbolsToFetchList.filter(symbol => (!newPrices[symbol] || isUsAsset(symbol) || symbol === 'TWD=X' || symbol.startsWith('^')));
        if (symbolsForYahoo.length > 0) {
            for (const symbol of symbolsForYahoo) {
                if (signal.aborted) throw new Error('AbortError');
                try {
                    const result = await withTimer(`Yahoo_Chart_${symbol}`, () => smartFetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`, 'json', 4500, signal));
                    const meta = result?.chart?.result?.[0]?.meta;
                    if (meta && meta.regularMarketPrice !== undefined) {
                        newPrices[symbol] = meta.regularMarketPrice; const extra = { ...newEtfData[symbol] }; extra.priceSource = "Yahoo";
                        if (meta.regularMarketTime) extra.dateStr = new Intl.DateTimeFormat('zh-TW', {timeZone: 'Asia/Taipei', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit'}).format(new Date(meta.regularMarketTime * 1000));
                        if (meta.previousClose !== undefined) extra.prevClose = meta.previousClose;
                        newEtfData[symbol] = extra;
                    }
                } catch (e) { console.warn(`Yahoo Chart 例外 (${symbol}):`, e.message); }
                if (!signal.aborted) await delay(1000); 
            }
        }
        
        const teYields = await tePromise;
        setUsBondYields({ '10Y': teYields['10Y'] || newPrices['^TNX'] || null, '20Y': teYields['20Y'] || newPrices['^TYX'] || null, '30Y': teYields['30Y'] || newPrices['^TYX'] || null });

        symbolsToFetchList.forEach(symbol => {
             const extra = newEtfData[symbol] || {}; const name = symbolToName[symbol] || '';
             if (!extra.yield && (name.includes('美債') || name.includes('債'))) {
                 if (name.includes('20年')) { extra.yield = teYields['20Y'] || newPrices['^TYX']; extra.yieldSource = "BM(20Y)"; } 
                 else { extra.yield = teYields['10Y'] || newPrices['^TNX']; extra.yieldSource = "BM(10Y)"; }
             }
             newEtfData[symbol] = extra;
        });

        savePriceCache(newPrices, newEtfData);
        setRealTimePrices(newPrices); setEtfExtraData(newEtfData); setHistoricalData({});
        setPortfolioHealth(null); 
        setPriceLoading(false); setLastUpdated(new Date()); setLoadingMessage('更新即時股價中...'); 
        processData(data, newPrices, newEtfData);

    } catch(e) {
        if (e.message.includes('AbortError') || signal.aborted) return;
        setPriceLoading(false);
    }
  };

  const callGeminiWithFallback = async (prompt, customTemperature = 0.2, parentSignal = null) => {
    if (!geminiApiKey) {
      setToast("尚未設定 AI 金鑰，請先於「設定」頁面輸入 Google Gemini API Key。");
      setActiveTab('config');
      throw new Error("請先設定 API Key");
    }
    const models = [...new Set([selectedModel, ...AVAILABLE_MODELS.map(m => m.id)])];
    const backoffDelays = [1000, 2000, 4000, 8000, 16000];

    for (const model of models) {
        if (parentSignal?.aborted) throw new Error('AbortError: 手動中止');
        let lastErr = null;

        for (let retry = 0; retry <= 5; retry++) {
            if (parentSignal?.aborted) throw new Error('AbortError: 手動中止');
            if (retry > 0) await new Promise(res => setTimeout(res, backoffDelays[retry - 1]));

            const controller = new AbortController(); const timeoutId = setTimeout(() => controller.abort(), 45000); 
            const abortHandler = () => controller.abort();
            if (parentSignal) parentSignal.addEventListener('abort', abortHandler);
            
            try {
              const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`, {
                  method: 'POST', headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { maxOutputTokens: 8192, temperature: customTemperature } }),
                  signal: controller.signal
              });
              clearTimeout(timeoutId);
              
              if (!response.ok) {
                  let errMsg = await response.text(); try { const errData = JSON.parse(errMsg); if (errData.error?.message) errMsg = errData.error.message; } catch (e) {}
                  if ((response.status === 400 && errMsg.toLowerCase().includes('api key')) || response.status === 403) throw new Error(`API Key 無效 (${errMsg})`);
                  throw new Error(`HTTP ${response.status} - ${errMsg}`);
              }
              const data = await response.json(); 
              const parts = data.candidates?.[0]?.content?.parts;
              const text = parts ? parts.map(p => p.text || '').join('') : '';
              
              if (text) {
                  return { text, model }; 
              }
            } catch (err) {
              clearTimeout(timeoutId);
              if (err.name === 'AbortError' || String(err.message).includes('AbortError')) {
                  if (parentSignal?.aborted) throw new Error('AbortError: 手動中止');
              }
              if (String(err.message).includes('API Key 無效')) throw err;
              lastErr = err;
            } finally {
              if (parentSignal) parentSignal.removeEventListener('abort', abortHandler);
            }
        }
        console.error(`[AI Analysis] 模型 ${model} 失敗: ${lastErr?.message}`);
    }
    throw new Error(`AI 連線失敗 (已達嘗試上限)，請稍後再試或檢查額度狀態`);
  };

  const generatePortfolioHealthCheck = async () => {
    if (!geminiApiKey) {
      setToast("請先於「設定」頁面填入 Gemini API Key 才能進行投資組合健檢。");
      setActiveTab('config');
      return;
    }
    if (isHealthChecking) return;
    setIsHealthChecking(true); setPortfolioHealth(null);
    const totalAsset = summary.totalValue || 1;
    const allHoldingsStr = sortedHoldings.map(h => `${h['名稱']}(${h['標的']}): ${formatPercent(h.marketValue / totalAsset)}`).join(', ');
    const allocationStr = allocationData.map(d => `${d.name} ${formatPercent(d.percentage)}`).join(', ');
    const prompt = `角色：首席風險經理。評估投資組合：總資產${formatCurrency(summary.totalValue)}, 總損益${formatCurrency(summary.totalPL)}, 資產大類配置：${allocationStr}。

請結合原本的風險評估邏輯，並針對此投資組合執行深度【壓力測試】：
分析這個投資組合：［${allHoldingsStr}］。
找出集中風險、產業曝險、地區曝險、重複押注、隱藏關聯，以及市場拋售時可能同步反應的部位。
接著模擬以下四種情境對投資組合的具體衝擊：
1. 市場修正10%
2. 熊市下跌20%
3. 利率上升
4. 經濟衰退
提出可行的分散或避險方式，並說明各自取捨。

嚴格格式輸出(無Markdown代碼)：
[SCORE] 0-100分數
[RISK] 低風險/中低風險/中風險/中高風險/高風險
[COMMENT] 綜合總評與上述壓力測試完整分析報告(包含集中風險、曝險、隱藏關聯與四種模擬情境分析)
[SUGGESTION] 列3點最具體的分散或避險建議(含各自取捨)，每點一行`;
    try {
        const { text } = await callGeminiWithFallback(prompt);
        const scoreMatch = text.match(/\[SCORE\]\s*(\d+)/i); const riskMatch = text.match(/\[RISK\]\s*(.+)/i); const commentMatch = text.match(/\[COMMENT\]\s*([\s\S]*?)\s*(?=\[SUGGESTION\]|$)/i); const suggestionMatch = text.match(/\[SUGGESTION\]\s*([\s\S]*)/i);
        setPortfolioHealth({ score: scoreMatch ? parseInt(scoreMatch[1]) : 0, risk: riskMatch ? String(riskMatch[1]).trim() : "未知", comment: commentMatch ? String(commentMatch[1]).trim() : "解析失敗", suggestions: suggestionMatch ? String(suggestionMatch[1]).trim().split('\n').filter(s => s.trim().length > 0) : [] });
    } catch (err) { setPortfolioHealth({ score: 0, risk: "Error", comment: String(err.message), suggestions: [] }); } finally { setIsHealthChecking(false); }
  };

  const syncReportToSheet = async (symbol, name, signal, summaryText, detailText) => {
    const nowStr = new Intl.DateTimeFormat('sv-SE', {
      timeZone: 'Asia/Taipei',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    }).format(new Date());

    // 1. 優先更新本地與雲端快取狀態，供下次切換或重整時直接使用
    const updatedReport = { time: nowStr, signal, summary: summaryText, detail: detailText };
    setCloudReports(prev => {
      const next = { ...prev, [symbol]: updatedReport };
      localStorage.setItem('alpha_synced_cloud_reports', JSON.stringify(next));
      return next;
    });
    setCloudReportTime(nowStr);

    // 2. 若有設定 GAS Web App 網址，發送 POST 同步寫入 Google Sheets 表單
    if (!gasWebAppUrl || !gasWebAppUrl.trim()) {
      setToast(`✅ ${symbol} 分析結果已儲存供下次使用 (若需寫回雲端表單請於設定填入 GAS 網址)`);
      return;
    }

    setIsSyncingCloud(true);
    try {
      const res = await fetch(gasWebAppUrl.trim(), {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'SAVE_REPORT',
          time: nowStr,
          symbol,
          name,
          signal,
          summary: summaryText,
          detail: detailText
        })
      });
      const resData = await res.json();
      if (resData.status === 'success') {
        setToast(`☁️ ${symbol} AI 分析報告已同步寫入 Google 表單！`);
      } else {
        throw new Error(resData.message || '寫入失敗');
      }
    } catch (e) {
      console.warn(`[Cloud Sync] 同步報告至表單失敗:`, e.message);
      setToast(`⚠️ 已儲存於快取，但雲端表單同步失敗: ${e.message}`);
    } finally {
      setIsSyncingCloud(false);
    }
  };

  const syncAutoSettingToSheet = async (symbol, autoAnalyze) => {
    if (!gasWebAppUrl || !gasWebAppUrl.trim()) return;
    try {
      await fetch(gasWebAppUrl.trim(), {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'UPDATE_AUTO_SETTING',
          symbol,
          autoAnalyze
        })
      });
      console.log(`[Cloud Sync] 🟢 已同步 ${symbol} 自動分析設定 (${autoAnalyze ? 'ON' : 'OFF'}) 至雲端表單`);
    } catch (e) {
      console.warn(`[Cloud Sync] 同步自動分析設定失敗:`, e.message);
    }
  };

  const fetchCloudReports = async (sheetId) => {
    if (!sheetId) return;
    try {
        console.log(`[Cloud Engine] ☁️ 嘗試從試算表同步 AI_分析報告 (${sheetId})...`);
        const reportCsvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent('AI_分析報告')}`;
        const csvText = await smartFetch(reportCsvUrl, 'text', 6000);
        if (csvText && !String(csvText).trim().toLowerCase().startsWith('<html')) {
            const Papa = await loadPapaParse();
            Papa.parse(csvText, {
                header: true,
                skipEmptyLines: true,
                complete: (results) => {
                    if (!results.data || results.data.length === 0) return;
                    const reports = {};
                    results.data.forEach(row => {
                        const sym = row['標的'];
                        if (sym && !reports[sym]) {
                            reports[sym] = {
                                time: row['分析時間'] || '',
                                signal: row['燈號'] || 'HOLD',
                                summary: row['簡評 (Summary)'] || row['簡評'] || '',
                                detail: row['詳細報告 (Detail)'] || row['詳細報告'] || ''
                            };
                        }
                    });
                    setCloudReports(prev => {
                        const localSynced = JSON.parse(localStorage.getItem('alpha_synced_cloud_reports') || '{}');
                        return { ...localSynced, ...reports };
                    });
                    console.log(`[Cloud Engine] 🟢 同步完成，共載入 ${Object.keys(reports).length} 檔標的雲端報告`);
                    
                    setAiSignals(prev => {
                        const next = { ...prev };
                        Object.keys(reports).forEach(sym => { if (!next[sym]) next[sym] = reports[sym].signal; });
                        const cache = getAiCache();
                        const today = getLogicalTradingDate(twseHolidays, false).full;
                        Object.keys(cache).forEach(sym => { if (cache[sym].date === today && cache[sym].signal) next[sym] = cache[sym].signal; });
                        return next;
                    });
                }
            });
        }
    } catch(e) {
        console.log(`[Cloud Engine] 雲端報告同步略過:`, e.message);
    }
  };

  const generateFullAnalysis = async (symbol, data, forceUpdate = false, metaPrevCloseOverride = null, customAnalysisType = 'DEFAULT') => {
    console.log(`[AI Master] 🟢 啟動分析流程: ${symbol}, forceUpdate: ${forceUpdate}, Type: ${customAnalysisType}`);
    if (!data || data.length === 0) { 
        console.warn(`[AI Master] 🟡 取消分析: 無圖表資料 (${symbol})`); 
        setIsAiSummarizing(false); 
        return; 
    }
    
    if (aiAbortControllerRef.current) {
        console.log(`[AI Master] 🛑 強制中斷前次 AI 分析請求`);
        aiAbortControllerRef.current.abort();
    }
    aiAbortControllerRef.current = new AbortController();
    const signal = aiAbortControllerRef.current.signal;
    analysisInProgressRef.current[symbol] = true;

    try {
        const latest = data[data.length - 1]; const prevDay = data.length > 1 ? data[data.length - 2] : null; const dataDate = latest.date;
        const cache = getAiCache();

        if (!forceUpdate && cache[symbol] && cache[symbol].date === dataDate && cache[symbol].summary && cache[symbol].detail) {
          console.log(`[AI Master] 🟢 命中本地快取: ${symbol}`);
          if (activeHistorySymbolRef.current === symbol) {
              setAiSummary(String(cache[symbol].summary)); setAiDetail(String(cache[symbol].detail));
              if (cache[symbol].signal) setAiSignals(prev => ({ ...prev, [symbol]: cache[symbol].signal }));
              setUsedModel(cache[symbol].model); setIsCachedResult(true); setIsDetailExpanded(true); 
              setCloudReportTime(null);
              setIsAiSummarizing(false); 
          }
          delete analysisInProgressRef.current[symbol];
          return;
        }

        if (activeHistorySymbolRef.current === symbol) {
            setIsAiSummarizing(true); setAiSummary(null); setAiDetail(null); setUsedModel(null); setIsCachedResult(false); setCloudReportTime(null);
            setAiProgressMsg("準備進行多次獨立分析..."); 
        }
        setAiSignals(prev => { const next = { ...prev }; delete next[symbol]; return next; });

        const assetInfo = tradableSymbols.find(t => t['標的'] === symbol);
        const stockName = assetInfo?.['名稱'] || symbol; const category = assetInfo?.['類別'] || '股票'; const assetType = detectAssetType(symbol, stockName, category);
        
        const todayStr = getLogicalTradingDate(twseHolidays, false).full;
        const currentMonthPrefix = todayStr.substring(0, 7); 
        const hasBoughtThisMonth = portfolioData.some(item => item['標的'] === symbol && String(item['日期'] || '').startsWith(currentMonthPrefix) && item['策略'] === '基礎買入');
        
        const isLongBond = isLongTermBond(stockName); const benchmarkYield = isLongBond ? (usBondYields['20Y'] || usBondYields['30Y']) : usBondYields['10Y'];
        
        const etfData = etfExtraData[symbol];
        const settings = investmentSettings[symbol] || { type: 'CORE', isDCA: false, addon: 'PYRAMID', addon2: 'NONE', autoAnalyze: true };
        const classification = settings.type || 'CORE'; const classLabel = ASSET_TYPES[classification]?.label || '核心資產'; const isDCA = settings.isDCA; 
        
        const currentPrice = realTimePrices[symbol] || latest.close; 
        let prevClose = prevDay ? prevDay.close : latest.close;
        const truePrevClose = metaPrevCloseOverride ?? etfData?.prevClose;
        if (truePrevClose !== undefined && truePrevClose !== null && !isNaN(truePrevClose)) prevClose = truePrevClose;
        
        let keyMetrics = "";
        if (assetType === 'ETF' || assetType === 'BOND_ETF') keyMetrics += `\n- 淨值: ${etfData?.nav ? etfData.nav : '無'}`;
        if (assetType === 'BOND' || assetType === 'BOND_ETF' || (assetType === 'ETF' && etfData?.yield)) keyMetrics += `\n- 殖利率: ${etfData?.yield ? (etfData.yield < 1 ? etfData.yield*100 : etfData.yield).toFixed(2)+'%' : '無'}`;
        if (assetType === 'BOND' || assetType === 'BOND_ETF' || isUsAsset(symbol)) keyMetrics += `\n- 基準殖利率: ${benchmarkYield || '無'}`;

        let dcaStrategy = "";
        let signalRules = "";

        if (isDCA && hasBoughtThisMonth) {
            dcaStrategy = `3. 【定期定額 (本月已扣款)】：本月已完成基礎買入。目前**僅需**評估是否觸發加碼條件，不再產生基礎扣款訊號。`;
            signalRules = `燈號規則 (本月已扣款，僅評估加碼)：\n- REDUCE (轉空未跌)\n- ADD_BONUS (加碼邏輯成立且今日未漲)\n- HOLD (加碼不成立或遭鐵律阻擋)\n* 絕對不可輸出 ADD_ALL 或 ADD_BASIC。`;
        } else if (isDCA) {
            dcaStrategy = `3. 【定期定額 (尋找買點)】：尋找低點扣款。月底強制扣款判斷: ${isLastTradingDay?'是':'否'}。若強制扣款成立，請視為基礎扣款條件成立。`;
            signalRules = `燈號規則：\n- REDUCE (轉空未跌)\n- ADD_ALL (基礎+加碼皆成立且未漲)\n- ADD_BASIC (僅基礎成立未漲)\n- ADD_BONUS (僅加碼成立未漲)\n- HOLD (其他或遭鐵律阻擋)`;
        } else {
            dcaStrategy = `3. 【單筆投入】：純粹依據加碼條件尋找買點。`;
            signalRules = `燈號規則 (單筆投入)：\n- REDUCE (轉空未跌)\n- ADD_BONUS (加碼邏輯成立且今日未漲)\n- HOLD (加碼不成立或遭鐵律阻擋)\n* 絕對不可輸出 ADD_ALL 或 ADD_BASIC。`;
        }

        let rulesAndFormat = `嚴格格式輸出(無Markdown)：\n[SUMMARY] (50字簡評)\n[DETAIL] (詳細分析報告)\n[SIGNAL] (僅輸出 ADD_ALL/ADD_BASIC/ADD_BONUS/REDUCE/HOLD 之一)`;
        let baseContext = `投資定位：${classLabel}。模式：${dcaStrategy}\n最新K線日期:${dataDate} 昨收:${formatPrice(prevClose)} 現價:${formatPrice(currentPrice)}\n數據：${keyMetrics}\n指標：MA20=${latest.MA20?formatPrice(latest.MA20):'-'}, MA60=${latest.MA60?formatPrice(latest.MA60):'-'}, KD(${latest.K?formatPrice(latest.K):'-'},${latest.D?formatPrice(latest.D):'-'}), MACD=${latest.OSC?formatPrice(latest.OSC):'-'}, RSI=${latest.RSI6?formatPrice(latest.RSI6):'-'}, 布林下=${latest.BBL?formatPrice(latest.BBL):'-'}\n鐵律：現價>昨收絕對禁買(HOLD/REDUCE)；現價<昨收絕對禁賣(HOLD/ADD)。\n濾網：1.大波動(MACD綠柱收斂/DIF金叉) 2.小波動(布林下緣) 3.大盤ETF(KD<20) 4.科技ETF(折價/RSI<30) 5.債券ETF(殖利率創高)。\n${signalRules}`;

        let prompt = "";
        switch (customAnalysisType) {
            case 'STRATEGY_BACKTEST': {
                const addonLogic = investmentSettings[symbol]?.addon || 'PYRAMID';
                const strategyName = isDCA ? `定期定額 + 加碼(${addonLogic})` : `單筆加碼(${addonLogic})`;
                const tfLabel = timeframe === '1y_1d' ? '近1年' : timeframe.includes('wk') ? '近5年' : '近10年';
                prompt = `角色：量化交易員。

任務：回測交易策略。
使用可取得的歷史資料，評估「${strategyName}」策略在 ${symbol}(${stockName}) 於「${tfLabel}」期間內的表現。
計算交易次數、勝率、平均獲利、平均虧損、最大回撤、獲利因子，以及不同市場環境下的績效。
接著找出策略最有效與失效的情況，並提出下一步可測試、但不過度擬合歷史資料的規則。

現況資料參考：
${baseContext}

${rulesAndFormat}`;
                break;
            }
            default:
                prompt = `角色：專業分析師。對 ${symbol}(${stockName})(${assetType}) 產生綜合趨勢分析與決策建議。

除了依據原本的技術分析與籌碼邏輯外，請務必涵蓋以下兩大重點進行深度綜合研判：

1. 看懂市場正在定價什麼：
請以股票研究分析師角度，分析此公司/股票代號/產業。
檢視最新財報、財測、估值、主要催化因素、競爭地位、近期股價走勢，以及相關總體經濟因素。
請區分哪些資訊可能已反映在股價中，哪些仍可能讓市場意外。
最後整理3個最大利多催化因素、3個最大風險，以及接下來應關注的關鍵發展。

2. 把新聞轉化為市場影響：
整理近期影響此公司/產業的重要新聞。
針對每項發展說明：實際發生什麼事、投資人為何需要關注、影響偏短期或長期、哪些財務指標可能受影響、市場可能隱含哪些假設。
依重要性由高至低排序，並說明哪些因素可能改變目前的市場反應。

原本分析邏輯與現況資料參考：
${baseContext}
策略要求：綜合以上所有觀點，給出最終的操作燈號，並根據技術支撐提供【預估目標價】。

${rulesAndFormat}`;
        }

        try {
            const MAX_VOTES = 3; let results = [];
            for (let i = 1; i <= MAX_VOTES; i++) {
                if (activeHistorySymbolRef.current === symbol) setAiProgressMsg(`AI 委員會投票中... (第 ${i}/${MAX_VOTES} 次)`);
                try {
                    if (signal.aborted) throw new Error('AbortError: 手動中止');
                    const { text, model } = await callGeminiWithFallback(prompt, 0.5, signal);
                    const summaryMatch = text.match(/\[SUMMARY\]\s*([\s\S]*?)\s*(?=\[DETAIL\]|$)/i);
                    const detailMatch = text.match(/\[DETAIL\]\s*([\s\S]*?)\s*(?=\[SIGNAL\]|$)/i);
                    const signalMatch = text.match(/\[SIGNAL\]\s*[:：\-]?\s*(ADD_ALL|ADD_BASIC|ADD_BONUS|REDUCE|HOLD)/i);
                    results.push({ summary: summaryMatch ? String(summaryMatch[1]).trim().replace(/[`*#]/g, '').replace(/\n/g, ' ') : "分析完成", detail: detailMatch ? String(detailMatch[1]).trim() : String(text), signal: signalMatch ? String(signalMatch[1]).toUpperCase() : 'HOLD', model });
                } catch (err) {
                    if (String(err.message).includes('AbortError')) throw err;
                    console.error(`[AI Master] 解析錯誤 (${symbol} - 第 ${i} 次):`, err.message);
                }
                if (i < MAX_VOTES && !signal.aborted) await delay(3000);
            }
            
            if (signal.aborted) throw new Error('AbortError: 手動中止');
            if (results.length === 0) throw new Error("所有獨立分析皆失敗");

            const signalCounts = {}; results.forEach(r => { signalCounts[r.signal] = (signalCounts[r.signal] || 0) + 1; });
            let majoritySignal = results[0].signal; let maxCount = 0;
            for (const sig in signalCounts) { if (signalCounts[sig] > maxCount) { maxCount = signalCounts[sig]; majoritySignal = sig; } }

            const finalResult = results.find(r => r.signal === majoritySignal) || results[0];
            const consensusSummary = `【多數決共識 (${maxCount}/${results.length})】${finalResult.summary}`;
            
            if (activeHistorySymbolRef.current === symbol && !signal.aborted) {
                console.log(`[AI Master] 🟢 更新 UI 畫面: ${symbol}`);
                setAiSummary(consensusSummary); setAiDetail(finalResult.detail); setAiSignals(prev => ({ ...prev, [symbol]: majoritySignal }));
                setUsedModel(finalResult.model); setIsDetailExpanded(true); 
            }
            if (!signal.aborted) {
                updateAiCache(symbol, { summary: consensusSummary, detail: finalResult.detail, signal: majoritySignal, model: finalResult.model }, dataDate); 
                await syncReportToSheet(symbol, stockName, majoritySignal, consensusSummary, finalResult.detail);
            }
        } catch (err) { 
            console.error(`[AI Master] 🔴 迴圈捕捉錯誤 (${symbol}):`, err);
            if (activeHistorySymbolRef.current === symbol) {
                if (String(err.message).includes('AbortError') || signal.aborted) {
                    setAiSummary("已手動中斷 AI 分析，或因切換標的已取消。");
                } else {
                    setAiSummary(`分析暫時無法使用: ${err.message}`); 
                }
            }
        } 
    } catch(err) { 
        console.error(`[AI Master] 🔴 嚴重全域錯誤 (${symbol}):`, err);
        if (activeHistorySymbolRef.current === symbol) setAiSummary(`分析發生嚴重錯誤: ${err.message}`); 
    } finally { 
        console.log(`[AI Master] ⚪ 結束分析流程清理狀態: ${symbol}`);
        if (activeHistorySymbolRef.current === symbol) { setIsAiSummarizing(false); setAiProgressMsg(''); }
        delete analysisInProgressRef.current[symbol]; 
    }
  };

  const fetchHistoricalData = async (symbol, tf) => {
    if (!symbol || symbol.includes('TD') || symbol === '定存') return;
    
    if (activeHistorySymbolRef.current === symbol) {
        setHistoryLoading(true); setHistoryError(null); setAiSummary(null); setAiDetail(null); setUsedModel(null); setIsAiSummarizing(false); setIsCachedResult(false);
    }

    try {
      let range = '1y'; let interval = '1d';
      if (tf === '5y_1wk') { range = '5y'; interval = '1wk'; }
      if (tf === '10y_1mo') { range = '10y'; interval = '1mo'; }
      
      const result = await smartFetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=${interval}&range=${range}`, 'json', 8000);
      if (!result) throw new Error('連線超時或遭阻擋');
      if (result.chart && result.chart.error) throw new Error(`Yahoo API 錯誤: ${result.chart.error.description || result.chart.error.code}`);

      const chartData = result?.chart?.result?.[0];
      
      if (chartData && chartData.timestamp) {
        const timestamps = chartData.timestamp; const quote = chartData.indicators.quote[0];
        let rawPoints = timestamps.map((ts, i) => ({ 
            date: new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Taipei' }).format(new Date(ts * 1000)), 
            close: quote.close[i], 
            high: quote.high[i], 
            low: quote.low[i], 
            open: quote.open[i],
            volume: quote.volume[i] || 0,
            ts: ts * 1000
        })).filter(d => d.close != null && d.high != null);
        
        const manualKLines = JSON.parse(localStorage.getItem('investment_manual_klines') || '{}');
        const symbolManualData = manualKLines[symbol] || {};
        Object.keys(symbolManualData).forEach(date => {
            const entry = symbolManualData[date];
            const isObj = typeof entry === 'object' && entry !== null;
            const cVal = parseFloat(isObj ? entry.close : entry);
            if (isNaN(cVal)) return;

            const existingIdx = rawPoints.findIndex(p => p.date === date);
            const existingPt = existingIdx >= 0 ? rawPoints[existingIdx] : null;

            const oVal = (isObj && entry.open !== undefined && !isNaN(parseFloat(entry.open))) ? parseFloat(entry.open) : (existingPt ? existingPt.open : cVal);
            let hVal = (isObj && entry.high !== undefined && !isNaN(parseFloat(entry.high))) ? parseFloat(entry.high) : (existingPt ? Math.max(existingPt.high, cVal, oVal) : Math.max(cVal, oVal));
            let lVal = (isObj && entry.low !== undefined && !isNaN(parseFloat(entry.low))) ? parseFloat(entry.low) : (existingPt ? Math.min(existingPt.low, cVal, oVal) : Math.min(cVal, oVal));
            hVal = Math.max(hVal, cVal, oVal);
            lVal = Math.min(lVal, cVal, oVal);
            const vVal = (isObj && entry.volume !== undefined && !isNaN(parseFloat(entry.volume))) ? parseFloat(entry.volume) : (existingPt ? existingPt.volume : 0);

            const [y, m, d] = date.split('-');
            const tsVal = existingPt?.ts || new Date(parseInt(y), parseInt(m) - 1, parseInt(d)).getTime();

            const newData = { date, close: cVal, open: oVal, high: hVal, low: lVal, volume: vVal, ts: tsVal, isManual: true };
            if (existingIdx >= 0) rawPoints[existingIdx] = { ...rawPoints[existingIdx], ...newData }; else rawPoints.push(newData);
        });
        rawPoints.sort((a, b) => new Date(a.date) - new Date(b.date));

        const processedData = processTechnicalData(rawPoints);
        setHistoricalData(prev => ({ ...prev, [`${symbol}_${tf}`]: processedData }));
        
        if (activeHistorySymbolRef.current === symbol) {
            setHistoryLoading(false);
            const latestDate = processedData.length > 0 ? processedData[processedData.length - 1].date : getTodayDate(twseHolidays);
            const cache = getAiCache();
            if (cache[symbol] && cache[symbol].date === latestDate && (cache[symbol].summary || cache[symbol].detail)) {
                setAiSummary(String(cache[symbol].summary)); setAiDetail(String(cache[symbol].detail));
                if (cache[symbol].signal) setAiSignals(prev => ({ ...prev, [symbol]: cache[symbol].signal }));
                setUsedModel(cache[symbol].model); setIsCachedResult(true); setIsDetailExpanded(true); setCloudReportTime(null);
            } else if (cloudReports[symbol]) {
                setAiSummary(String(cloudReports[symbol].summary)); setAiDetail(String(cloudReports[symbol].detail));
                if (cloudReports[symbol].signal) setAiSignals(prev => ({ ...prev, [symbol]: cloudReports[symbol].signal }));
                setUsedModel('雲端自動排程'); setCloudReportTime(cloudReports[symbol].time); setIsCachedResult(true); setIsDetailExpanded(true);
            } else {
                setAiSummary(null); setAiDetail(null); setUsedModel(null); setIsCachedResult(false); setCloudReportTime(null);
            }
        }
      } else { throw new Error('解析不到圖表數據'); }
    } catch (err) { 
        if (activeHistorySymbolRef.current === symbol) { setHistoryError(String(err.message)); setIsAiSummarizing(false); }
    } finally { 
        if (activeHistorySymbolRef.current === symbol) { setHistoryLoading(false); }
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
              if (aiAbortControllerRef.current) aiAbortControllerRef.current.abort(); 
              if (activeHistorySymbolRef.current === selectedHistorySymbol) {
                  setAiSummary(null); setAiDetail(null); setUsedModel(null); setHistoryError(null); setCloudReportTime(null);
              }
              fetchHistoricalData(selectedHistorySymbol, timeframe).finally(() => {
                  fetchingHistoryRef.current[key] = false;
              });
          }
      } else {
          const dataArr = historicalData[key];
          const latestDate = dataArr && dataArr.length > 0 ? dataArr[dataArr.length - 1].date : getTodayDate(twseHolidays);
          const cache = getAiCache();
          if (cache[selectedHistorySymbol] && cache[selectedHistorySymbol].date === latestDate && (cache[selectedHistorySymbol].summary || cache[selectedHistorySymbol].detail)) {
              if (activeHistorySymbolRef.current === selectedHistorySymbol) {
                  setAiSummary(String(cache[selectedHistorySymbol].summary));
                  setAiDetail(String(cache[selectedHistorySymbol].detail));
                  if (cache[selectedHistorySymbol].signal) setAiSignals(prev => ({ ...prev, [selectedHistorySymbol]: cache[selectedHistorySymbol].signal }));
                  setUsedModel(cache[selectedHistorySymbol].model);
                  setIsCachedResult(true);
                  setIsDetailExpanded(true);
                  setCloudReportTime(null);
                  setHistoryLoading(false);
              }
          } else if (cloudReports[selectedHistorySymbol]) {
              if (activeHistorySymbolRef.current === selectedHistorySymbol) {
                  setAiSummary(String(cloudReports[selectedHistorySymbol].summary));
                  setAiDetail(String(cloudReports[selectedHistorySymbol].detail));
                  if (cloudReports[selectedHistorySymbol].signal) setAiSignals(prev => ({ ...prev, [selectedHistorySymbol]: cloudReports[selectedHistorySymbol].signal }));
                  setUsedModel('雲端自動排程');
                  setCloudReportTime(cloudReports[selectedHistorySymbol].time);
                  setIsCachedResult(true);
                  setIsDetailExpanded(true);
                  setHistoryLoading(false);
              }
          } else {
              if (activeHistorySymbolRef.current === selectedHistorySymbol) {
                  setAiSummary(null);
                  setAiDetail(null);
                  setUsedModel(null);
                  setIsCachedResult(false);
                  setCloudReportTime(null);
                  setHistoryLoading(false);
              }
          }
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, selectedHistorySymbol, timeframe, cloudReports]); 

  const performFetch = async (url) => {
    setLoading(true); setError(null); setUpdateError(null); setRealTimePrices({}); setHistoricalData({}); setPortfolioHealth(null);
    let cleanUrl = url ? String(url).trim() : '';
    if (!cleanUrl) { setError('請輸入有效的網址'); setLoading(false); return; }

    try {
      const match = cleanUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
      if (match && match[1]) {
          fetchCloudReports(match[1]);
      }

      const Papa = await loadPapaParse();
      let csvText = null;
      try { const res = await fetch(cleanUrl, { method: 'GET', credentials: 'omit', cache: 'no-store' }); if (res.ok) csvText = await res.text(); } catch (e) {}
      if (!csvText || (csvText && String(csvText).trim().toLowerCase().startsWith('<html'))) csvText = await smartFetch(cleanUrl, 'text', 8000);

      const processCSVResults = (results) => {
          if (results.data && results.data.length > 0) {
            const validData = results.data.filter(row => row['標的'] && row['價格']);
            if (validData.length === 0) throw new Error('CSV 中找不到資料');
            setRawData(validData);

            // 若表單內含有「自動分析」欄位，同步至前端設定
            setInvestmentSettings(prev => {
                const updated = { ...prev };
                validData.forEach(row => {
                    const sym = row['標的'];
                    if (sym && row['自動分析'] !== undefined && row['自動分析'] !== '') {
                        const valStr = String(row['自動分析']).trim().toUpperCase();
                        const isAuto = !(valStr === 'OFF' || valStr === 'FALSE' || valStr === '否');
                        updated[sym] = { ...(updated[sym] || { type: 'CORE', isDCA: false, addon: 'PYRAMID', addon2: 'NONE' }), autoAnalyze: isAuto };
                    }
                });
                localStorage.setItem('investment_settings', JSON.stringify(updated));
                return updated;
            });

            const cachedPrices = getPriceCache(); const flatPrices = {};
            Object.keys(cachedPrices).forEach(key => { if (cachedPrices[key] && cachedPrices[key].price) flatPrices[key] = cachedPrices[key].price; });
            setRealTimePrices(flatPrices); setUsdRate(flatPrices['TWD=X'] || 1);
            setUsBondYields({ '10Y': flatPrices['^TNX'] || null, '20Y': flatPrices['^TYX'] || null, '30Y': flatPrices['^TYX'] || null });
            const cachedEtfData = {};
            Object.keys(cachedPrices).forEach(key => {
                if(cachedPrices[key]?.nav) cachedEtfData[key] = { ...cachedEtfData[key], nav: cachedPrices[key].nav, navSource: cachedPrices[key].navSource };
                if(cachedPrices[key]?.yield) cachedEtfData[key] = { ...cachedEtfData[key], yield: cachedPrices[key].yield, yieldSource: cachedPrices[key].yieldSource };
                if(cachedPrices[key]?.prevClose) cachedEtfData[key] = { ...cachedEtfData[key], prevClose: cachedPrices[key].prevClose };
            });
            setEtfExtraData(cachedEtfData); processData(validData, flatPrices, cachedEtfData); setLoading(false); fetchRealTimePrices(validData, false); 
            localStorage.setItem('investment_sheet_url', cleanUrl);
          } else { throw new Error('讀取到的資料為空'); }
      };

      if (csvText && !String(csvText).trim().toLowerCase().startsWith('<html')) {
          Papa.parse(csvText, { header: true, skipEmptyLines: true, complete: processCSVResults, error: (err) => { setError(`解析失敗: ${err.message}`); setLoading(false); } });
      } else {
          Papa.parse(cleanUrl, { download: true, header: true, skipEmptyLines: true, complete: processCSVResults, error: (err) => { setError(`全部讀取皆失敗: ${err.message}`); setLoading(false); } });
      }
    } catch (e) { setError(`讀取失敗: ${e.message}`); setLoading(false); }
  };

  const handleFetchButton = () => { 
    localStorage.setItem('gemini_api_key', geminiApiKey); localStorage.setItem('gemini_model', selectedModel); localStorage.setItem('fee_discount', feeDiscount); localStorage.setItem('custom_proxy_url', customProxyUrl); localStorage.setItem('gas_webapp_url', gasWebAppUrl); localStorage.setItem('investment_sort_config', JSON.stringify(sortConfig));
    if (customOrder.length > 0) localStorage.setItem('investment_custom_order', JSON.stringify(customOrder));
    setToast("設定已儲存！開始更新資料..."); 
    if (!sheetUrl) { if (rawData.length > 0) processData(rawData, realTimePrices, etfExtraData); return; } 
    performFetch(sheetUrl); 
  };
  
  const handleChatSend = async () => {
    if (!chatInput.trim() || !geminiApiKey) return;
    const userMsg = { role: 'user', content: chatInput }; setChatMessages(prev => [...prev, userMsg]); setChatInput(''); setIsChatLoading(true);
    const contextData = { totalAssets: summary.totalValue, totalProfit: summary.totalPL, roi: summary.totalROI, holdings: aggregatedHoldings.map(h => ({ symbol: h['標的'], name: h['名稱'], value: h.marketValue, roi: h.roi, type: assetClassifications[h['標的']] || 'CORE' })) };
    const prompt = `角色：專業投資顧問。使用者數據：${JSON.stringify(contextData)}。核心(追求穩健)、衛星(追求波段)。使用者問題：${userMsg.content} 請簡短、專業回答。`;
    try {
        const { text: reply } = await callGeminiWithFallback(prompt); setChatMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    } catch (err) { setChatMessages(prev => [...prev, { role: 'assistant', content: `抱歉，AI 暫時無法回應 (${String(err.message)})` }]); } finally { setIsChatLoading(false); }
  };

  const handleSettingChange = (symbol, key, value) => {
    const currentSettings = investmentSettings[symbol] || { type: 'CORE', isDCA: false, addon: 'PYRAMID', addon2: 'NONE', autoAnalyze: true };
    const newSettings = { ...investmentSettings, [symbol]: { ...currentSettings, [key]: value } };
    setInvestmentSettings(newSettings); localStorage.setItem('investment_settings', JSON.stringify(newSettings));
    if (key === 'type') { const newClassifications = { ...assetClassifications, [symbol]: value }; setAssetClassifications(newClassifications); localStorage.setItem('investment_asset_classifications', JSON.stringify(newClassifications)); }
    if (key === 'autoAnalyze') {
      setToast(`${symbol} 自動分析已設為：${value ? '開啟 (ON)' : '關閉 (OFF)'}`);
      syncAutoSettingToSheet(symbol, value);
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
    const cVal = parseFloat(patchPrice);
    if (isNaN(cVal)) return;
    const oVal = patchOpen !== '' && !isNaN(parseFloat(patchOpen)) ? parseFloat(patchOpen) : cVal;
    let hVal = patchHigh !== '' && !isNaN(parseFloat(patchHigh)) ? parseFloat(patchHigh) : Math.max(oVal, cVal);
    let lVal = patchLow !== '' && !isNaN(parseFloat(patchLow)) ? parseFloat(patchLow) : Math.min(oVal, cVal);
    hVal = Math.max(hVal, oVal, cVal);
    lVal = Math.min(lVal, oVal, cVal);
    const vVal = patchVolume !== '' && !isNaN(parseFloat(patchVolume)) ? parseFloat(patchVolume) : 0;

    const currentObj = JSON.parse(localStorage.getItem('investment_manual_klines') || '{}');
    if (!currentObj[selectedHistorySymbol]) currentObj[selectedHistorySymbol] = {};
    currentObj[selectedHistorySymbol][patchDate] = { open: oVal, high: hVal, low: lVal, close: cVal, volume: vVal };
    localStorage.setItem('investment_manual_klines', JSON.stringify(currentObj)); 
    setManualKLinesState(currentObj); 
    setPatchDate(''); setPatchOpen(''); setPatchHigh(''); setPatchLow(''); setPatchPrice(''); setPatchVolume(''); 
    setToast(`已新增/更新 ${selectedHistorySymbol} (${patchDate}) K線數據，重新計算中...`);
    setHistoricalData(prev => { const next = { ...prev }; delete next[`${selectedHistorySymbol}_${timeframe}`]; return next; });
  };

  const handleDeletePatch = (date) => {
    if (!selectedHistorySymbol) return;
    const currentObj = JSON.parse(localStorage.getItem('investment_manual_klines') || '{}');
    if (currentObj[selectedHistorySymbol] && currentObj[selectedHistorySymbol][date] !== undefined) {
        delete currentObj[selectedHistorySymbol][date]; localStorage.setItem('investment_manual_klines', JSON.stringify(currentObj)); setManualKLinesState(currentObj); setToast(`已移除 ${date} 的點位...`);
        setHistoricalData(prev => { const next = { ...prev }; delete next[`${selectedHistorySymbol}_${timeframe}`]; return next; });
    }
  };

  const SortIcon = ({ columnKey }) => {
    if (sortConfig.key !== columnKey) return <ArrowUpDown className="w-3 h-3 ml-1 text-slate-600 opacity-50" />;
    return sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3 ml-1 text-blue-400" /> : <ArrowDown className="w-3 h-3 ml-1 text-blue-400" />;
  };

  useEffect(() => {
    const savedUrl = localStorage.getItem('investment_sheet_url'); const savedGasUrl = localStorage.getItem('gas_webapp_url'); const savedKey = localStorage.getItem('gemini_api_key'); const savedModel = localStorage.getItem('gemini_model'); const savedDiscount = localStorage.getItem('fee_discount'); const savedSort = localStorage.getItem('investment_sort_config'); const savedOrder = localStorage.getItem('investment_custom_order'); const savedSettings = localStorage.getItem('investment_settings'); const savedClassifications = localStorage.getItem('investment_asset_classifications'); const savedProxyUrl = localStorage.getItem('custom_proxy_url'); const savedManualKLines = localStorage.getItem('investment_manual_klines'); const savedSyncedReports = localStorage.getItem('alpha_synced_cloud_reports');
    if (savedKey) setGeminiApiKey(savedKey);
    if (savedGasUrl) setGasWebAppUrl(savedGasUrl);
    if (savedSyncedReports) { try { setCloudReports(JSON.parse(savedSyncedReports)); } catch(e) {} }
    const isValidModel = AVAILABLE_MODELS.some(m => m.id === savedModel); if (savedModel && isValidModel) { setSelectedModel(savedModel); } else { setSelectedModel(AVAILABLE_MODELS[0].id); }
    if (savedDiscount) setFeeDiscount(parseFloat(savedDiscount)); if (savedSort) setSortConfig(JSON.parse(savedSort)); if (savedOrder) setCustomOrder(JSON.parse(savedOrder)); if (savedProxyUrl) setCustomProxyUrl(savedProxyUrl); if (savedManualKLines) setManualKLinesState(JSON.parse(savedManualKLines));

    let initialSettings = {};
    if (savedSettings) { initialSettings = JSON.parse(savedSettings); Object.keys(initialSettings).forEach(key => { if(!initialSettings[key].addon2) initialSettings[key].addon2 = 'NONE'; if(initialSettings[key].autoAnalyze === undefined) initialSettings[key].autoAnalyze = true; });
    } else if (savedClassifications) { const oldClass = JSON.parse(savedClassifications); Object.keys(oldClass).forEach(key => { initialSettings[key] = { type: oldClass[key], isDCA: false, addon: 'PYRAMID', addon2: 'NONE', autoAnalyze: true }; }); }
    setInvestmentSettings(initialSettings);
    const flatClass = {}; Object.keys(initialSettings).forEach(key => { flatClass[key] = initialSettings[key].type; }); setAssetClassifications(flatClass);

    const cache = getAiCache(); const signals = {}; Object.keys(cache).forEach(key => { if (cache[key].signal) signals[key] = cache[key].signal; }); setAiSignals(signals);

    if (savedUrl) { setSheetUrl(savedUrl); performFetch(savedUrl); } else { processData(DEMO_DATA, {}); fetchRealTimePrices(DEMO_DATA); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- SVG 看板引擎與互動邏輯 (支援滑鼠與手機觸控) ---
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

  const endIdx = zoom.endIndex === null ? currentChartData.length : Math.min(zoom.endIndex, currentChartData.length);
  const startIdx = Math.max(0, endIdx - zoom.count);
  const displayChartData = currentChartData.slice(startIdx, endIdx);

  const safeHoverIndex = (hoverIndex !== null && hoverIndex >= 0 && hoverIndex < displayChartData.length) ? hoverIndex : null;
  const activeIdx = safeHoverIndex !== null ? safeHoverIndex : Math.max(0, displayChartData.length - 1);
  const activeCandle = displayChartData[activeIdx] || { open: 0, high: 0, low: 0, close: 0, volume: 0, ts: Date.now() };
  const prevC = activeIdx > 0 && displayChartData[activeIdx - 1] ? displayChartData[activeIdx - 1].close : activeCandle.open;
  
  const activeChange = (activeCandle.close || 0) - (prevC || 0);
  const activeChangePercent = prevC > 0 ? (activeChange / prevC) * 100 : 0;
  const activeColorClass = activeChange > 0 ? 'text-red-500' : activeChange < 0 ? 'text-green-500' : 'text-white';
  const activeSign = activeChange > 0 ? '▲ ' : activeChange < 0 ? '▼ ' : '';
  
  const dateStr = activeCandle.date ? String(activeCandle.date).replace(/-/g, '/') : '今日動態';

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
      bbStatus = "突破上軌 (強勢)";
      bbColor = "text-red-500";
  } else if (stockPrice < activeCandle.BBL && activeCandle.BBL > 0) {
      bbStatus = "跌破下軌 (弱勢)";
      bbColor = "text-green-500";
  } else if (stockPrice > currentMA20) {
      bbStatus = "中軌之上 (偏多)";
      bbColor = "text-red-400";
  } else if (stockPrice < currentMA20) {
      bbStatus = "中軌之下 (偏空)";
      bbColor = "text-green-400";
  }

  const latestChangePercent = currentChartData.length > 1 ? ((currentChartData[currentChartData.length - 1].close - currentChartData[currentChartData.length - 2].close) / currentChartData[currentChartData.length - 2].close) * 100 : 0;
  const extRatio = Math.min(Math.max(Math.round(50 + latestChangePercent * 3), 20), 80);
  const intRatio = 100 - extRatio;
  
  const bodySize = Math.abs(activeCandle.close - activeCandle.open);
  const upperShadow = activeCandle.high - Math.max(activeCandle.close, activeCandle.open);
  const lowerShadow = Math.min(activeCandle.close, activeCandle.open) - activeCandle.low;
  
  const isRedK = activeCandle.close >= activeCandle.open;
  const isLongRed = isRedK && activeCandle.open > 0 && (activeCandle.close - activeCandle.open) / activeCandle.open > 0.03;
  const isLongBlack = !isRedK && activeCandle.open > 0 && (activeCandle.open - activeCandle.close) / activeCandle.open > 0.03;
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
      const paddedRange = paddedMax - paddedMin || 1;
      
      mapPriceY = (val) => 280 - ((val - paddedMin) / paddedRange) * 260;
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans pb-20 md:pb-0">
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
      <nav className="hidden md:block border-b border-slate-700 bg-slate-800/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <div className="flex items-center"><div className="bg-blue-600 p-2 rounded-lg"><TrendingUp className="h-6 w-6 text-white" /></div><span className="ml-3 text-xl font-bold tracking-wider">Alpha 投資戰情室 <span className="text-xs font-mono text-blue-400 bg-blue-950/60 px-2 py-0.5 rounded border border-blue-500/30 ml-1">v56.00</span></span>{usdRate !== 1 && <span className="ml-4 text-xs bg-slate-700 px-2 py-1 rounded text-slate-300 flex items-center"><Globe className="w-3 h-3 mr-1"/> USD/TWD: {usdRate.toFixed(2)}</span>}</div>
          <div className="flex space-x-4">{['overview', 'history', 'chat', 'holdings', 'config'].map(tab => (<button key={tab} onClick={() => setActiveTab(tab)} className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === tab ? 'bg-slate-900 text-blue-400' : 'text-slate-300 hover:bg-slate-700'}`}>{tab === 'overview' ? '資產總覽' : tab === 'history' ? '歷史走勢' : tab === 'chat' ? 'AI 助理' : tab === 'holdings' ? '持股明細' : '設定'}</button>))}</div>
        </div>
      </nav>

      <div className="md:hidden fixed bottom-0 lef
t-0 right-0 bg-slate-800 border-t border-slate-700 z-50 flex justify-around py-3 pb-safe">
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
                      <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}><BarChart data={tradableSymbols.map(item => ({ name: item['名稱'], value: item.marketValue })).sort((a, b) => b.value - a.value)} layout="vertical"><CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} /><XAxis type="number" stroke="#94a3b8" tickFormatter={(val) => `${val /