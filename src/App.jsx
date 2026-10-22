// ... existing code ...
import { 
  PieChart as PieIcon, ArrowUpCircle, ArrowDownCircle, RefreshCw, Settings, 
  TrendingUp, DollarSign, Briefcase, FileText, AlertCircle, BarChart2, 
  Loader2, Wifi, WifiOff, LineChart as LineIcon, Info, AlertTriangle, 
  ArrowUp, ArrowDown, ArrowUpDown, Move, Sparkles, Bot, ChevronDown, ChevronUp, FileSearch, Save, Key, Cpu, Calculator, Globe, CheckCircle, Database, BrainCircuit, Lock, MessageSquare, Send, Target, Clock, Activity, ClipboardCheck, ShieldAlert, Crosshair, Repeat, BarChart4, TrendingDown, Percent, Layers, Link as LinkIcon, XCircle, PlusCircle, Trash2, Edit, Cloud
} from 'lucide-react';

/**
 * Alpha 投資戰情室 v56.00 (Stable Resilience Engine - Two-Way Cloud Sync & Auto-Analysis Control)
 * * [重大更新 v56.00]
 * 1. 版本升級至 v56.00。
 * 2. 歷史走勢 AI 手動分析與表單雙向同步：使用者可自行決定是否重新分析，分析結果會自動同步寫回 Google 表單 (`AI_分析報告`) 供下次跨裝置或重整時使用，亦提供手動「同步至表單」按鈕。
 * 3. 持股明細個股自動分析開關：於持股明細中可針對單一個股設定是否啟用「自動分析 (AI排程)」，設定將同步回表單與本地快取。
 * 4. 延續 v55.00 核心：支援 Gemini 3.7/3.6 模型、回測交易策略與投資組合壓力測試。
 */

const DEMO_DATA = [
// ... existing code ...
// --- 主應用程式 ---
const App = () => {
  const [sheetUrl, setSheetUrl] = useState('');
  const [gasWebAppUrl, setGasWebAppUrl] = useState('');
  const [isSyncingCloud, setIsSyncingCloud] = useState(false);
  const [geminiApiKey, setGeminiApiKey] = useState(''); 
  const [rawData, setRawData] = useState([]);
// ... existing code ...
  const [InvestmentSettingsStatePlaceholder] = useState(null); // Reference anchor
// ... existing code ...
        setPortfolioHealth({ score: scoreMatch ? parseInt(scoreMatch[1]) : 0, risk: riskMatch ? String(riskMatch[1]).trim() : "未知", comment: commentMatch ? String(commentMatch[1]).trim() : "解析失敗", suggestions: suggestionMatch ? String(suggestionMatch[1]).trim().split('\n').filter(s => s.trim().length > 0) : [] });
    } catch (err) { setPortfolioHealth({ score: 0, risk: "Error", comment: String(err.message), suggestions: [] }); } finally { setIsHealthChecking(false); }
  };

  const syncReportToSheet = async (symbol, name, signal, summary, detail) => {
    const nowStr = new Intl.DateTimeFormat('sv-SE', {
      timeZone: 'Asia/Taipei',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    }).format(new Date());

    // 1. 優先更新本地與雲端快取狀態，確保下次切換或重整時可立即使用
    const updatedReport = { time: nowStr, signal, summary, detail };
    setCloudReports(prev => {
      const next = { ...prev, [symbol]: updatedReport };
      localStorage.setItem('alpha_synced_cloud_reports', JSON.stringify(next));
      return next;
    });
    setCloudReportTime(nowStr);

    // 2. 若有設定 GAS Web App 網址，則發送 POST 同步寫入 Google Sheets 表單
    if (!gasWebAppUrl || !gasWebAppUrl.trim()) {
      setToast(`✅ 分析結果已儲存於本地快取 (若需寫回雲端表單請於設定填入 GAS 網址)`);
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
          summary,
          detail
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
      setToast(`⚠️ 已儲存本地快取，但雲端表單同步失敗: ${e.message}`);
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
                // 自動同步寫回表單與持久快取供下次使用
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
// ... existing code ...
                    setCloudReports(prev => {
                        const localSynced = JSON.parse(localStorage.getItem('alpha_synced_cloud_reports') || '{}');
                        return { ...localSynced, ...reports };
                    });
                    console.log(`[Cloud Engine] 同步完成，共載入 ${Object.keys(reports).length} 檔標的雲端報告`);
                    
                    // 預先將雲端燈號注入全域訊號池，供「持股明細」即時顯示
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
        } else {
             console.log(`[Cloud Engine] 找不到或無法讀取 AI_分析報告 工作表`);
        }
    } catch(e) {
        console.log(`[Cloud Engine] 雲端報告同步失敗:`, e.message);
    }
  };

  const performFetch = async (url) => {
    setLoading(true); setError(null); setUpdateError(null); setRealTimePrices({}); setHistoricalData({}); setPortfolioHealth(null);
    let cleanUrl = url ? String(url).trim() : '';
    if (!cleanUrl) { setError('請輸入有效的網址'); setLoading(false); return; }

    try {
      // 擷取 Sheet ID 並觸發雲端報告同步
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

            // 若表單內含有「自動分析」欄位，將其同步至前端設定中
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
            setUsBondYields({ '10Y': flatPrices['^TNX'] || null, '20Y': flatPrices['^TVC'] || null, '30Y': flatPrices['^TYX'] || null });
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
// ... existing code ...
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
// ... existing code ...
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
// ... existing code ...
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans pb-20 md:pb-0">
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
      <nav className="hidden md:block border-b border-slate-700 bg-slate-800/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <div className="flex items-center"><div className="bg-blue-600 p-2 rounded-lg"><TrendingUp className="h-6 w-6 text-white" /></div><span className="ml-3 text-xl font-bold tracking-wider">Alpha 投資戰情室 <span className="text-xs font-mono text-blue-400 bg-blue-950/60 px-2 py-0.5 rounded border border-blue-500/30 ml-1">v56.00</span></span>{usdRate !== 1 && <span className="ml-4 text-xs bg-slate-700 px-2 py-1 rounded text-slate-300 flex items-center"><Globe className="w-3 h-3 mr-1"/> USD/TWD: {usdRate.toFixed(2)}</span>}</div>
          <div className="flex space-x-4">{['overview', 'history', 'chat', 'holdings', 'config'].map(tab => (<button key={tab} onClick={() => setActiveTab(tab)} className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === tab ? 'bg-slate-900 text-blue-400' : 'text-slate-300 hover:bg-slate-700'}`}>{tab === 'overview' ? '資產總覽' : tab === 'history' ? '歷史走勢' : tab === 'chat' ? 'AI 助理' : tab === 'holdings' ? '持股明細' : '設定'}</button>))}</div>
        </div>
      </nav>
// ... existing code ...
                  {/* ========================================================== */}
                  {/* ====== 完美保留原始系統的 AI 核心模組 (Master Sync) ====== */}
                  {/* ========================================================== */}
                  <div className="flex flex-col mt-4 relative z-10 bg-slate-800 rounded-xl border border-slate-700 shadow-lg p-4">
                    <div className="flex-none flex items-center justify-between mb-4 flex-wrap gap-2">
                        <div className="flex items-center flex-wrap gap-2">
                            <Sparkles className="w-5 h-5 text-purple-400 mr-2 flex-none" />
                            <h4 className="text-white font-semibold">AI 智能分析與決策</h4>
                            {usedModel === '雲端自動排程' ? (
                                <span className="hidden lg:inline ml-2 text-xs px-2 py-0.5 rounded bg-blue-900/50 text-blue-300 border border-blue-600 shadow-sm">
                                    ☁️ 雲端表單報告 ({cloudReportTime})
                                </span>
                            ) : usedModel && (
                                <span className="hidden lg:inline ml-2 text-xs px-2 py-0.5 rounded bg-slate-700 text-slate-300 border border-slate-600">
                                    {String(AVAILABLE_MODELS.find(m => m.id === usedModel)?.name || usedModel)} 
                                    {isCachedResult ? <span className="text-slate-500">(已快取/同步)</span> : <span className="text-green-400">(本次生成並同步)</span>}
                                </span>
                            )}
                            {aiSignals[selectedHistorySymbol] === 'REDUCE' && (<div className="flex items-center lg:ml-3 bg-red-900/30 px-2 py-1 rounded border border-red-500/30"><div className="w-2 h-2 rounded-full bg-red-500 animate-pulse mr-2" /><span className="text-xs text-red-400 font-bold">建議減少持股</span></div>)}
                            {aiSignals[selectedHistorySymbol] === 'ADD_ALL' && (<div className="flex items-center lg:ml-3 bg-green-900/30 px-2 py-1 rounded border border-green-500/30"><div className="w-2 h-2 rounded-full bg-green-500 animate-pulse mr-2" /><span className="text-xs text-green-400 font-bold">建議基礎及加碼投資</span></div>)}
                            {aiSignals[selectedHistorySymbol] === 'ADD_BASIC' && (<div className="flex items-center lg:ml-3 bg-green-900/30 px-2 py-1 rounded border border-green-500/30"><div className="w-2 h-2 rounded-full bg-green-500 animate-pulse mr-2" /><span className="text-xs text-green-400 font-bold">建議基礎投資</span></div>)}
                            {aiSignals[selectedHistorySymbol] === 'ADD_BONUS' && (<div className="flex items-center lg:ml-3 bg-green-900/30 px-2 py-1 rounded border border-green-500/30"><div className="w-2 h-2 rounded-full bg-green-500 animate-pulse mr-2" /><span className="text-xs text-green-400 font-bold">建議加碼投資</span></div>)}
                            {aiSignals[selectedHistorySymbol] === 'HOLD' && (<div className="flex items-center lg:ml-3 bg-yellow-900/30 px-2 py-1 rounded border border-yellow-500/30"><div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse mr-2" /><span className="text-xs text-yellow-400 font-bold">建議觀望</span></div>)}
                        </div>
                        <div className="flex gap-2 flex-wrap">
                            {isAiSummarizing && (
                                <button onClick={() => { if (aiAbortControllerRef.current) aiAbortControllerRef.current.abort(); }} className="text-[10px] md:text-xs bg-red-900/50 hover:bg-red-900/80 text-red-200 border border-red-500/50 px-2 md:px-3 py-1.5 rounded flex items-center transition-colors shadow-sm">
                                    <XCircle className="w-3 h-3 mr-1" />中斷分析
                                </button>
                            )}
                            {!isAiSummarizing && (
                                <div className="flex items-center gap-2 flex-wrap">
                                    <select 
                                        value={aiAnalysisType} 
                                        onChange={(e) => setAiAnalysisType(e.target.value)} 
                                        className="text-[10px] md:text-xs bg-slate-900 border border-slate-600 text-slate-300 rounded px-2 py-1.5 outline-none focus:border-blue-500 max-w-[140px] md:max-w-xs"
                                    >
                                        <option value="DEFAULT">綜合趨勢分析 (預設)</option>
                                        <option value="STRATEGY_BACKTEST">回測交易策略</option>
                                    </select>
                                    <button 
                                        onClick={() => { 
                                            const data = historicalData[`${selectedHistorySymbol}_${timeframe}`]; 
                                            if (data && data.length > 0) { 
                                                generateFullAnalysis(selectedHistorySymbol, data, true, etfExtraData[selectedHistorySymbol]?.prevClose, aiAnalysisType); 
                                            } else { 
                                                fetchHistoricalData(selectedHistorySymbol, timeframe); 
                                            } 
                                        }} 
                                        className="text-[10px] md:text-xs flex items-center transition-colors text-blue-300 hover:text-white bg-blue-600/40 hover:bg-blue-600 border border-blue-500/50 px-2.5 md:px-3 py-1.5 rounded shadow-sm font-medium"
                                    >
                                        <RefreshCw className="w-3 h-3 mr-1" />
                                        {isCachedResult || aiDetail || usedModel === '雲端自動排程' ? '重新分析並同步' : '開始 AI 分析'}
                                    </button>
                                    {aiDetail && (
                                        <button
                                            onClick={() => {
                                                const assetInfo = tradableSymbols.find(t => t['標的'] === selectedHistorySymbol);
                                                syncReportToSheet(
                                                    selectedHistorySymbol,
                                                    assetInfo?.['名稱'] || selectedHistorySymbol,
                                                    aiSignals[selectedHistorySymbol] || 'HOLD',
                                                    aiSummary,
                                                    aiDetail
                                                );
                                            }}
                                            disabled={isSyncingCloud}
                                            className="text-[10px] md:text-xs flex items-center transition-colors text-emerald-300 hover:text-white bg-emerald-900/40 hover:bg-emerald-700 border border-emerald-500/40 px-2.5 py-1.5 rounded shadow-sm disabled:opacity-50"
                                            title="將目前顯示的分析報告同步寫入 Google 表單供下次使用"
                                        >
                                            {isSyncingCloud ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Cloud className="w-3 h-3 mr-1" />}
                                            同步至表單
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="bg-slate-900/50 rounded-lg p-4 md:p-5 border border-slate-700 shadow-inner min-h-[100px]">
                      {isAiSummarizing ? (
                        <div className="flex items-center text-slate-400 text-sm py-4"><Loader2 className="w-5 h-5 animate-spin mr-2" />{String(aiProgressMsg || 'AI 正在分析中...')}</div>
                      ) : (
                        <>
                          {aiSummary ? <div className="mb-4"><p className="text-slate-200 text-sm md:text-base font-medium leading-relaxed border-l-4 border-purple-500 pl-4 whitespace-pre-wrap">{String(aiSummary)}</p></div> : <div className="text-slate-500 text-sm py-4">暫無 AI 分析數據 (請點擊上方按鈕決定是否進行分析)</div>}
                          {aiDetail && (<div className={`pt-4 border-t border-slate-700/50 transition-all duration-300 ${isDetailExpanded ? 'block' : 'hidden'}`}><div className="prose prose-invert max-w-none text-slate-300 whitespace-pre-wrap leading-relaxed text-sm md:text-base">{String(aiDetail)}</div></div>)}
                        </>
                      )}
                    </div>
                  </div>
// ... existing code ...
        {activeTab === 'holdings' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center px-2">
              <h3 className="text-lg font-semibold text-white flex items-center"><FileText className="w-5 h-5 mr-2 text-blue-400" /> 持股明細表</h3>
              <button onClick={() => fetchRealTimePrices(rawData, true)} className="text-xs flex items-center text-blue-400 hover:text-blue-300 transition-colors"><RefreshCw className={`w-3 h-3 mr-1 ${priceLoading ? 'animate-spin' : ''}`} />{priceLoading ? '更新中(強制)...' : '立即更新股價'}</button>
            </div>
            <div className="block md:hidden space-y-4">
              <div className="bg-slate-800 p-3 rounded-lg border border-slate-700 flex items-center space-x-2 overflow-x-auto">
                <span className="text-xs text-slate-400 whitespace-nowrap">排序依據:</span>
                {[ { id: 'manual', label: '自訂' }, { id: '類別', label: '類別' }, { id: 'buyPrice', label: '成本' }, { id: 'profitLoss', label: '損益' }, { id: 'roi', label: '報酬' } ].map(opt => (<button key={opt.id} onClick={() => requestSort(opt.id)} className={`px-3 py-1 rounded text-xs border ${sortConfig.key === opt.id ? 'bg-blue-600 border-blue-500 text-white' : 'border-slate-600 text-slate-400'}`}>{String(opt.label)} {sortConfig.key === opt.id && (sortConfig.direction === 'asc' ? '↑' : '↓')}</button>))}
              </div>
              {sortedHoldings.map((row, index) => {
                const signal = aiSignals[row['標的']]; const settings = investmentSettings[row['標的']] || { type: 'CORE', isDCA: false, addon: 'PYRAMID', addon2: 'NONE', autoAnalyze: true }; const classification = settings.type; const isDCA = settings.isDCA; const addonLogic = settings.addon; const addon2Logic = settings.addon2; const autoAnalyze = settings.autoAnalyze !== false; const assetType = detectAssetType(row['標的'], row['名稱'], row['類別']); const isBondETF = assetType === 'BOND_ETF'; const isBond = assetType === 'BOND'; const isETF = assetType === 'ETF'; const etfData = etfExtraData[row['標的']]; let premDisc = null;
                if (etfData && etfData.nav) { const price = row.isUS ? row.currentPriceRaw : row.currentPrice; if (price) premDisc = (price - etfData.nav) / etfData.nav; }
                const yieldVal = etfData && etfData.yield ? (etfData.yield < 1 ? etfData.yield * 100 : etfData.yield) : null;
                return (
                <div key={row['標的']} className="bg-slate-800 p-4 rounded-xl border border-slate-700 shadow-md relative">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="flex items-center space-x-2">
                        {signal?.includes('ADD') && <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse mr-1" />}
                        {signal === 'REDUCE' && <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse mr-1" />}
                        {signal === 'HOLD' && <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse mr-1" />}
                        <span className="text-lg font-bold text-white">{String(row['標的'])}</span>
                        <span className={`text-xs px-2 py-0.5 rounded ${CATEGORY_STYLES[row['類別']]?.badge || CATEGORY_STYLES['default'].badge}`}>{String(row['類別'])}</span>
                        {premDisc !== null && (<span className={`text-[10px] px-1.5 py-0.5 rounded border ${premDisc > 0 ? 'bg-red-900/30 text-red-300 border-red-500/30' : 'bg-green-900/30 text-green-300 border-green-500/30'}`}>{premDisc > 0 ? '溢' : '折'} {Math.abs(premDisc * 100).toFixed(2)}%</span>)}
                      </div>
                      <div className="text-sm text-slate-400 mt-1">{String(row['名稱'])}</div>
                      <div className="mt-3 bg-slate-700/50 p-2 rounded-lg space-y-2">
                          <div className="flex items-center justify-between"><span className="text-xs text-slate-400">定位</span><select value={classification} onChange={(e) => handleSettingChange(row['標的'], 'type', e.target.value)} className={`text-xs px-2 py-0.5 rounded border focus:outline-none cursor-pointer bg-slate-800 ${ASSET_TYPES[classification].color} ${ASSET_TYPES[classification].border}`} onClick={(e) => e.stopPropagation()}><option value="CORE">核心</option><option value="SATELLITE">衛星</option></select></div>
                          <div className="flex items-center justify-between"><span className="text-xs text-slate-400 flex items-center"><Repeat className="w-3 h-3 mr-1" />定期定額</span><button onClick={(e) => { e.stopPropagation(); handleSettingChange(row['標的'], 'isDCA', !isDCA); }} className={`w-8 h-4 rounded-full transition-colors relative ${isDCA ? 'bg-green-500' : 'bg-slate-600'}`}><div className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-transform ${isDCA ? 'translate-x-4' : 'translate-x-0'}`} /></button></div>
                          {row['類別'] !== '定存' && (
                            <div className="flex items-center justify-between"><span className="text-xs text-slate-400 flex items-center"><Bot className="w-3 h-3 mr-1 text-purple-400" />自動分析</span><button onClick={(e) => { e.stopPropagation(); handleSettingChange(row['標的'], 'autoAnalyze', !autoAnalyze); }} className={`w-8 h-4 rounded-full transition-colors relative ${autoAnalyze ? 'bg-purple-500' : 'bg-slate-600'}`}><div className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-transform ${autoAnalyze ? 'translate-x-4' : 'translate-x-0'}`} /></button></div>
                          )}
                          <div className="flex flex-col space-y-1 mt-1 border-t border-slate-600/50 pt-1">
                              <div className="flex items-center justify-between"><span className="text-[10px] text-slate-400 flex items-center"><Crosshair className="w-3 h-3 mr-1 text-blue-400" />加碼 1</span><select value={addonLogic} onChange={(e) => handleSettingChange(row['標的'], 'addon', e.target.value)} className="text-[10px] px-2 py-0.5 rounded border border-slate-600 bg-slate-800 text-slate-300 focus:outline-none max-w-[100px]" onClick={(e) => e.stopPropagation()}><option value="NONE">無</option><option value="PYRAMID">跌幅金字塔</option><option value="TECHNICAL">技術指標</option><option value="YIELD_MACRO">殖利率/總經</option></select></div>
                              <div className="flex items-center justify-between"><span className="text-[10px] text-slate-400 flex items-center"><PlusCircle className="w-3 h-3 mr-1 opacity-50" />加碼 2</span><select value={addon2Logic} onChange={(e) => handleSettingChange(row['標的'], 'addon2', e.target.value)} className="text-[10px] px-2 py-0.5 rounded border border-slate-600 bg-slate-800 text-slate-300 focus:outline-none max-w-[100px]" onClick={(e) => e.stopPropagation()}><option value="NONE">無 (None)</option><option value="PYRAMID">跌幅金字塔</option><option value="TECHNICAL">技術指標</option><option value="YIELD_MACRO">殖利率/總經</option></select></div>
                          </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end"><span className={`text-lg font-bold ${(row.roi || 0) >= 0 ? 'text-red-500' : 'text-green-500'}`}>{formatPercent(row.roi)}</span><span className={`text-xs ${(row.profitLoss || 0) >= 0 ? 'text-red-400' : 'text-green-400'}`}>{(row.profitLoss || 0) > 0 ? '+' : ''}{formatCurrency(row.profitLoss)}</span></div>
                  </div>
// ... existing code ...
                  <tbody className="bg-slate-800 divide-y divide-slate-700">
                    {sortedHoldings.map((row, index) => {
                      const signal = aiSignals[row['標的']]; const settings = investmentSettings[row['標的']] || { type: 'CORE', isDCA: false, addon: 'PYRAMID', addon2: 'NONE', autoAnalyze: true }; const classification = settings.type; const isDCA = settings.isDCA; const addonLogic = settings.addon; const addon2Logic = settings.addon2; const autoAnalyze = settings.autoAnalyze !== false; const assetType = detectAssetType(row['標的'], row['名稱'], row['類別']); const isBondETF = assetType === 'BOND_ETF'; const isBond = assetType === 'BOND'; const isETF = assetType === 'ETF'; const etfData = etfExtraData[row['標的']]; let premDisc = null;
                      if ((isETF || isBondETF) && etfData && etfData.nav && row.isRealData) { const price = row.isUS ? row.currentPriceRaw : row.currentPrice; premDisc = (price - etfData.nav) / etfData.nav; }
                      const yieldVal = etfData && etfData.yield ? (etfData.yield < 1 ? etfData.yield * 100 : etfData.yield) : null;
                      return (
                      <tr key={row['標的']} className="hover:bg-slate-700/50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap"><div className="flex flex-col space-y-1">{index > 0 && <button onClick={(e) => { e.stopPropagation(); moveItem(row['標的'], -1); }} className="p-1 rounded hover:bg-slate-600 text-slate-400 hover:text-white"><ArrowUp className="w-3 h-3" /></button>}{index < sortedHoldings.length - 1 && <button onClick={(e) => { e.stopPropagation(); moveItem(row['標的'], 1); }} className="p-1 rounded hover:bg-slate-600 text-slate-400 hover:text-white"><ArrowDown className="w-3 h-3" /></button>}</div></td>
                        <td className="px-6 py-4 whitespace-nowrap text-left"><div className="text-sm text-white font-medium flex items-center">{signal?.includes('ADD') && <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse mr-2" title="AI建議: 加碼" />}{signal === 'REDUCE' && <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse mr-2" title="AI建議: 減碼" />}{signal === 'HOLD' && <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse mr-2" title="AI建議: 觀望" />}{String(row['標的'])}{row.isRealData ? <Wifi className="w-3 h-3 ml-1 text-green-500" /> : row['類別'] !== '定存' && <WifiOff className="w-3 h-3 ml-1 text-slate-600" />}</div><div className="text-xs text-slate-500">最近交易: {String(row['日期'])}</div></td>
                        <td className="px-6 py-4 whitespace-nowrap text-left"><div className="text-sm text-slate-200">{String(row['名稱'])}</div><div className="flex flex-wrap items-center gap-2 mt-1"><span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${CATEGORY_STYLES[row['類別']]?.badge || CATEGORY_STYLES['default'].badge}`}>{String(row['類別'])}</span></div></td>
                        <td className="px-6 py-4 whitespace-nowrap text-left">{ (isETF || isBondETF) ? ( etfData?.nav ? ( <div className="flex flex-col"><span className="text-sm text-slate-300 font-medium">{formatPrice(etfData.nav)} <span className="text-[10px] text-slate-500">{etfData.navSource ? `(${etfData.navSource})` : ''}</span></span>{premDisc !== null && (<span className={`text-[10px] mt-0.5 ${premDisc > 0 ? 'text-red-400' : 'text-green-400'}`}>{premDisc > 0 ? '溢價' : '折價'} {Math.abs(premDisc * 100).toFixed(2)}%</span>)}</div>) : <span className="text-xs text-slate-500">查無資料</span> ) : <span className="text-slate-600">-</span> }</td>
                        <td className="px-6 py-4 whitespace-nowrap text-left">{ (isBond || isBondETF) ? ( yieldVal !== null ? ( <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-900/30 text-purple-300 border border-purple-500/30" title={etfData.yieldSource}>{yieldVal.toFixed(2)}% <span className="ml-1 text-[8px] opacity-70">{etfData.yieldSource ? `(${etfData.yieldSource})` : ''}</span></span> ) : <span className="text-xs text-slate-500">查無資料</span> ) : <span className="text-slate-600">-</span> }</td>
                        <td className="px-6 py-4 whitespace-nowrap text-left">
                          <div className="flex flex-col space-y-1">
                             <div className="flex items-center space-x-1.5">
                               <select value={classification} onChange={(e) => handleSettingChange(row['標的'], 'type', e.target.value)} className={`text-[10px] px-2 py-0.5 rounded border focus:outline-none cursor-pointer bg-slate-800 ${ASSET_TYPES[classification].color} ${ASSET_TYPES[classification].border}`} onClick={(e) => e.stopPropagation()}><option value="CORE">核心</option><option value="SATELLITE">衛星</option></select>
                               <button onClick={(e) => { e.stopPropagation(); handleSettingChange(row['標的'], 'isDCA', !isDCA); }} className={`px-2 py-0.5 rounded text-[10px] border transition-colors ${isDCA ? 'bg-green-900/50 border-green-500 text-green-400' : 'bg-slate-800 border-slate-600 text-slate-500'}`} title="定期定額開關">{isDCA ? 'DCA:ON' : 'DCA:OFF'}</button>
                               {row['類別'] !== '定存' && (
                                 <button onClick={(e) => { e.stopPropagation(); handleSettingChange(row['標的'], 'autoAnalyze', !autoAnalyze); }} className={`px-2 py-0.5 rounded text-[10px] border transition-colors flex items-center ${autoAnalyze ? 'bg-purple-900/50 border-purple-500 text-purple-300' : 'bg-slate-800 border-slate-600 text-slate-500'}`} title="設定是否納入雲端定時自動 AI 分析"><Bot className="w-2.5 h-2.5 mr-1" />{autoAnalyze ? '自動分析:ON' : '自動分析:OFF'}</button>
                               )}
                             </div>
                             <div className="flex items-center space-x-1 pt-1 border-t border-slate-700/50"><span className="text-[10px] text-slate-500 w-8">加碼1:</span><select value={addonLogic} onChange={(e) => handleSettingChange(row['標的'], 'addon', e.target.value)} className="text-[10px] px-1 py-0.5 rounded border border-slate-600 bg-slate-800 text-slate-300 focus:outline-none cursor-pointer hover:border-slate-500 flex-1" onClick={(e) => e.stopPropagation()}><option value="NONE">無</option><option value="PYRAMID">跌幅金字塔</option><option value="TECHNICAL">技術指標</option><option value="YIELD_MACRO">殖利率/總經</option></select></div>
                             <div className="flex items-center space-x-1"><span className="text-[10px] text-slate-500 w-8">加碼2:</span><select value={addon2Logic} onChange={(e) => handleSettingChange(row['標的'], 'addon2', e.target.value)} className="text-[10px] px-2 py-0.5 rounded border border-slate-600 bg-slate-800 text-slate-300 focus:outline-none cursor-pointer hover:border-slate-500 flex-1" onClick={(e) => e.stopPropagation()}><option value="NONE">無 (None)</option><option value="PYRAMID">跌幅金字塔</option><option value="TECHNICAL">技術指標</option><option value="YIELD_MACRO">殖利率/總經</option></select></div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-slate-300">{formatPrice(row.buyPriceRaw || row.buyPrice)}</td>
// ... existing code ...
              <div className="pt-4 border-t border-slate-700 mt-4">
                <h4 className="text-sm font-semibold text-slate-300 mb-2 flex items-center">
                  <Cloud className="w-4 h-4 mr-2 text-blue-400" /> 雲端自動排程與表單雙向同步 (v56.00)
                </h4>
                <div className="mb-3">
                  <label className="block text-xs text-slate-400 mb-1">Google Apps Script 網頁應用程式網址 (選填，供前端將分析結果與自動分析設定寫回表單)</label>
                  <input
                    type="text"
                    value={gasWebAppUrl}
                    onChange={(e) => setGasWebAppUrl(e.target.value)}
                    placeholder="https://script.google.com/macros/s/.../exec"
                    className="flex-1 min-w-0 block w-full px-4 py-2.5 rounded-md bg-slate-900 border border-slate-600 text-white focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
                <p className="text-xs text-slate-400 leading-relaxed mb-2">
                  系統會自動從上方 Google Sheets 讀取 <code>AI_分析報告</code>。若進一步填入部署後的 GAS 網址（以 <code>/exec</code> 結尾），您在前端點擊「重新分析並同步」或切換持股明細的「自動分析:ON/OFF」時，將直接同步寫回 Google 表單內供下次使用。
                </p>
                <div className="bg-blue-900/20 border border-blue-500/30 p-3 rounded-lg text-xs text-blue-300 flex items-start">
                  <span className="mr-2">💡</span>
                  <div>
                    <strong className="text-blue-200">設定提醒：</strong><br/>
                    1. 請確保您的 Google Sheet 共用設定為「<span className="text-white">知道連結的使用者皆可查看</span>」。<br/>
                    2. 在 Apps Script 點擊右上角「部署」→「新增部署」→ 選擇「網頁應用程式」→ 誰可以存取設為「<span className="text-white">所有人</span>」，即可取得上方同步網址。
                  </div>
                </div>
              </div>

              {error && <div className="p-3 bg-red-900/30 border border-red-500/50 text-red-300 rounded-md text-sm">{String(error)}</div>}
// ... existing code ...