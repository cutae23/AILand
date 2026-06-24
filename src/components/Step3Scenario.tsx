/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { LandRegulatoryAnalysis, FARRelaxationResult, ScenarioInput, ScenarioResult, UnitConfig, AllocatedUnitResult } from '../types';
import { CircleDollarSign, Coins, TrendingUp, Building2, Layers, Compass, HelpCircle, ArrowRight, Table } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface Step3ScenarioProps {
  currentLand: LandRegulatoryAnalysis | null;
  currentRelaxation: FARRelaxationResult | null;
}

export default function Step3Scenario({ currentLand, currentRelaxation }: Step3ScenarioProps) {
  // 1. Core Inputs
  const initialLandArea = currentLand ? currentLand.areaSize : 500;
  const initialFAR = currentRelaxation ? currentRelaxation.finalFAR : 200;
  const initialBCR = currentLand ? currentLand.baselineBCR : 60;

  const [landArea, setLandArea] = useState<number>(initialLandArea);
  const [appliedFAR, setAppliedFAR] = useState<number>(initialFAR);
  const [appliedBCR, setAppliedBCR] = useState<number>(initialBCR);
  const [netRatio, setNetRatio] = useState<number>(75); // 전용률 (%)
  
  // Financial parameters
  const [landPurchasePrice, setLandPurchasePrice] = useState<number>(
    currentLand?.id === 'gangnam-yeoksam' ? 120 : currentLand?.id === 'seocho-banpo' ? 70 : 35
  ); // 토지매입가 (억원)
  const [constructionCostPerPyung, setConstructionCostPerPyung] = useState<number>(850); // 평당 공사비 (만원, 예: 850만원)
  const [otherCostsRatio, setOtherCostsRatio] = useState<number>(20); // 기타 비용 비율 (%)

  // Sync state if step 1 or step 2 changes
  useEffect(() => {
    if (currentLand) {
      setLandArea(currentLand.areaSize);
      setAppliedBCR(currentLand.baselineBCR);
      setLandPurchasePrice(currentLand.id === 'gangnam-yeoksam' ? 120 : currentLand.id === 'seocho-banpo' ? 70 : 35);
    }
  }, [currentLand]);

  useEffect(() => {
    if (currentRelaxation) {
      setAppliedFAR(currentRelaxation.finalFAR);
    }
  }, [currentRelaxation]);

  // Unit Configurations
  const [unitConfigs, setUnitConfigs] = useState<UnitConfig[]>([
    { id: 'small', name: '소형 (59㎡ / 실 전용 18평형)', sizeM2: 59, pyung: 18, salesPricePerPyung: 4200, percentage: 30 },
    { id: 'medium', name: '중형 (84㎡ / 실 전용 25평형)', sizeM2: 84, pyung: 25, salesPricePerPyung: 4500, percentage: 50 },
    { id: 'large', name: '대형 (114㎡ / 실 전용 34평형)', sizeM2: 114, pyung: 34, salesPricePerPyung: 5000, percentage: 20 }
  ]);

  const handleUpdateUnitPercentage = (id: string, value: number) => {
    setUnitConfigs(prev => {
      const idx = prev.findIndex(item => item.id === id);
      if (idx === -1) return prev;
      
      const newConfigs = [...prev];
      newConfigs[idx].percentage = value;
      return newConfigs;
    });
  };

  const handleUpdateUnitSalesPrice = (id: string, value: number) => {
    setUnitConfigs(prev => {
      const idx = prev.findIndex(item => item.id === id);
      if (idx === -1) return prev;
      
      const newConfigs = [...prev];
      newConfigs[idx].salesPricePerPyung = value;
      return newConfigs;
    });
  };

  // Safe normalize percentages if not equal 100
  const totalPercentage = unitConfigs.reduce((acc, curr) => acc + curr.percentage, 0);

  // Compute Results
  const [result, setResult] = useState<ScenarioResult | null>(null);

  useEffect(() => {
    // 1. Calculate Gross Floor Areas
    // 지상 연면적 (㎡) = 대지면적 * 용적률 (%) / 100
    const aboveGroundGFA = parseFloat((landArea * (appliedFAR / 100)).toFixed(2));
    // 지하층 면적 (㎡) (통상 주차장용으로 지상층 연면적의 약 35% 산정 확보)
    const undergroundGFA = parseFloat((aboveGroundGFA * 0.35).toFixed(2));
    const totalGFA = aboveGroundGFA + undergroundGFA;

    const M2_TO_PYUNG = 0.3025;
    const totalGFAByPyung = parseFloat((totalGFA * M2_TO_PYUNG).toFixed(2));
    const aboveGroundGFAByPyung = parseFloat((aboveGroundGFA * M2_TO_PYUNG).toFixed(2));

    // 2. Household allocation using Net ratio
    // 분양 가능한 전용 총 연면적 = 지상 연면적 * 전용률 (%)
    const netGFA = aboveGroundGFA * (netRatio / 100);

    const normalizedConfigs = unitConfigs.map((cfg, i) => {
      // If sum of percentages isn't 100, normalize on the fly for calculation
      const shareRatio = totalPercentage > 0 ? (cfg.percentage / totalPercentage) : (1 / 3);
      return { ...cfg, shareRatio };
    });

    const allocatedUnits: AllocatedUnitResult[] = normalizedConfigs.map(cfg => {
      // Allocated exclusive m² to this category
      const allocatedM2ForType = netGFA * cfg.shareRatio;
      
      // Since Korean apartment areas have service & common spaces, 
      // let's compute approximate household count by dividing allocated net GFA by specific unit size.
      const count = Math.max(0, Math.floor(allocatedM2ForType / cfg.sizeM2));

      // 세대당 분양가 (평형 * 평당분양가) / 10000 (억원단위 변동)
      const unitSalesPriceInWon = cfg.pyung * cfg.salesPricePerPyung * 10000;
      const unitSalesPriceInBillion = parseFloat((unitSalesPriceInWon / 100000000).toFixed(2));

      const totalSalesPrice = parseFloat((count * unitSalesPriceInBillion).toFixed(2));

      return {
        id: cfg.id,
        name: cfg.name,
        sizeM2: cfg.sizeM2,
        pyung: cfg.pyung,
        count,
        unitSalesPrice: unitSalesPriceInBillion,
        totalSalesPrice
      };
    });

    const totalAllocatedUnits = allocatedUnits.reduce((acc, curr) => acc + curr.count, 0);

    // 3. Project Cost & Financial Structure
    // 토지비 (억원)
    const landCost = landPurchasePrice;
    
    // 공사비 (총 연면적(평) * 평당공사비(만원))
    const constructionCostWon = totalGFAByPyung * constructionCostPerPyung * 10000;
    const constructionCost = parseFloat((constructionCostWon / 100000000).toFixed(2)); // 억원

    // 기타 비용 (설계/감리, 금융이자, 마케팅, 인허가 공과금 등) 
    const otherCosts = parseFloat(((landCost + constructionCost) * (otherCostsRatio / 100)).toFixed(2));

    const totalProjectCost = parseFloat((landCost + constructionCost + otherCosts).toFixed(2));

    // 총 분양 수입 (억원)
    const totalSalesRevenue = parseFloat(allocatedUnits.reduce((acc, curr) => acc + curr.totalSalesPrice, 0).toFixed(2));

    // 영업 이익 (억원)
    const operatingProfit = parseFloat((totalSalesRevenue - totalProjectCost).toFixed(2));

    // ROI
    const roi = parseFloat(((operatingProfit / totalProjectCost) * 100).toFixed(1));

    // Break-even sales occupancy ratio (%) (총 사업비 / 총분양 수입 * 100)
    const breakEvenRatio = totalSalesRevenue > 0 
      ? Math.round(Math.min(100, (totalProjectCost / totalSalesRevenue) * 100))
      : 100;

    setResult({
      aboveGroundGFA,
      undergroundGFA,
      totalGFA,
      totalGFAByPyung,
      aboveGroundGFAByPyung,
      allocatedUnits,
      totalAllocatedUnits,
      financials: {
        landCost,
        constructionCost,
        otherCosts,
        totalProjectCost,
        totalSalesRevenue,
        operatingProfit,
        roi,
        breakEvenRatio
      }
    });

  }, [landArea, appliedFAR, appliedBCR, netRatio, landPurchasePrice, constructionCostPerPyung, otherCostsRatio, unitConfigs, totalPercentage]);

  // Color theme variables mapped to Sage Natural Tone palette
  const CHART_GREEN = '#5F7161';
  const CHART_BEIGE = '#EDDBC7';
  const CHART_MUTED = '#A89F94';
  const CHART_DEEP = '#3E362E';
  const COLORS = [CHART_GREEN, '#8D7B68', CHART_BEIGE, '#D9D1C7'];

  // Data prepped for charts
  const costVsRevData = result ? [
    { name: '투입 총사업비', '상세 금액(억원)': result.financials.totalProjectCost },
    { name: '예상 분양매출', '상세 금액(억원)': result.financials.totalSalesRevenue }
  ] : [];

  const costBreakdownData = result ? [
    { name: '토지 수매비', value: result.financials.landCost },
    { name: '공동 건축 공비', value: result.financials.constructionCost },
    { name: '금융 및 사업공과금', value: result.financials.otherCosts }
  ] : [];

  return (
    <div className="space-y-6" id="step3-container">
      {/* Intro header */}
      <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
        <h2 className="text-lg font-semibold text-[#2C251F] flex items-center gap-2">
          <Building2 className="w-5 h-5 text-[#5F7161]" />
          Step 3: 공동주택 세대 배분 & 정밀 사업 수지 시나리오
        </h2>
        <p className="text-sm text-[#8D7B68] leading-relaxed mb-6 font-normal">
          전 단계에서 결정된 대지면적, 건폐율 및 완화 용적률을 근거로 지상/지하 연면적을 연계 도출하고, 
          공동주택 중소형 평형별 세대 배분 비율과 평당 분양가를 입력하여 예상 사업 수지 분석 결과를 도출합니다.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Inputs Section - Left 5 Columns */}
          <div className="lg:col-span-5 space-y-5">
            <h3 className="text-xs font-bold text-[#8D7B68] uppercase tracking-widest flex items-center gap-1">
              <Layers className="w-4 h-4" />
              개발 건축 기본조건 설정
            </h3>

            {/* Sub-grid of Architectural specifications */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 mb-1">대지 면적 (㎡)</label>
                <input
                  type="number"
                  value={landArea}
                  onChange={(e) => setLandArea(Number(e.target.value))}
                  className="w-full text-xs px-3 py-2 bg-[#F9F7F2] border border-[#E5E2DD] rounded-xl focus:outline-none focus:border-[#5F7161] font-semibold text-gray-800"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 mb-1">기본 건폐율 (%)</label>
                <input
                  type="number"
                  value={appliedBCR}
                  onChange={(e) => setAppliedBCR(Number(e.target.value))}
                  className="w-full text-xs px-3 py-2 bg-[#F9F7F2] border border-[#E5E2DD] rounded-xl focus:outline-none focus:border-[#5F7161] font-semibold text-gray-800"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 mb-1">적용 용적률 (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={appliedFAR}
                  onChange={(e) => setAppliedFAR(Number(e.target.value))}
                  className="w-full text-xs px-3 py-2 bg-[#F9F7F2] border border-[#E5E2DD] rounded-xl focus:outline-none focus:border-[#5F7161] font-semibold text-gray-800"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 mb-1">복도/공용 전용률 (%)</label>
                <input
                  type="number"
                  value={netRatio}
                  onChange={(e) => setNetRatio(Number(e.target.value))}
                  className="w-full text-xs px-3 py-2 bg-[#F9F7F2] border border-[#E5E2DD] rounded-xl focus:outline-none focus:border-[#5F7161] font-semibold text-gray-800"
                />
              </div>
            </div>

            <div className="h-px bg-gray-100"></div>

            {/* Cost inputs */}
            <h3 className="text-xs font-bold text-[#8D7B68] uppercase tracking-widest flex items-center gap-1 pt-1">
              <Compass className="w-4 h-4" />
              개발 재무 투입 지표
            </h3>

            <div className="space-y-3.5 text-xs text-gray-600">
              <div className="p-3 bg-slate-50 rounded-xl space-y-2">
                <div className="flex justify-between font-medium">
                  <span>총 토지 매입비</span>
                  <span className="font-bold text-gray-950">{landPurchasePrice} 억원</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="500"
                  step="1"
                  value={landPurchasePrice}
                  onChange={(e) => setLandPurchasePrice(Number(e.target.value))}
                  className="w-full accent-[#5F7161]"
                />
              </div>

              <div className="p-3 bg-slate-50 rounded-xl space-y-2">
                <div className="flex justify-between font-medium">
                  <span>평당 공사비 (지상/지하 통합)</span>
                  <span className="font-bold text-gray-950">{constructionCostPerPyung.toLocaleString()} 만원</span>
                </div>
                <input
                  type="range"
                  min="500"
                  max="1500"
                  step="10"
                  value={constructionCostPerPyung}
                  onChange={(e) => setConstructionCostPerPyung(Number(e.target.value))}
                  className="w-full accent-[#5F7161]"
                />
              </div>

              <div className="p-3 bg-slate-50 rounded-xl space-y-2">
                <div className="flex justify-between font-medium">
                  <span>간접비 비율 (설계, 이자, 감리 등)</span>
                  <span className="font-bold text-gray-950">{otherCostsRatio} %</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="40"
                  step="1"
                  value={otherCostsRatio}
                  onChange={(e) => setOtherCostsRatio(Number(e.target.value))}
                  className="w-full accent-[#5F7161]"
                />
              </div>
            </div>

            <div className="h-px bg-gray-100"></div>

            {/* Proportion matrix - 세대 평형 비율 */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-bold text-[#8D7B68] uppercase tracking-widest">실 전용평형 배분 및 분양가</h3>
                {totalPercentage !== 100 && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${totalPercentage > 100 ? 'bg-red-50 text-red-650' : 'bg-amber-50 text-amber-700'}`}>
                    비율 합계: {totalPercentage}% (100%조정요망)
                  </span>
                )}
              </div>

              <div className="space-y-3.5 text-xs">
                {unitConfigs.map((cfg) => (
                  <div key={cfg.id} className="p-3 border border-gray-100 rounded-xl bg-[#FCFAF7] space-y-2.5">
                    <div className="flex justify-between font-semibold text-gray-800">
                      <span>{cfg.name}</span>
                      <span className="text-[#5F7161] font-bold">비율: {cfg.percentage}%</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mt-1.5">
                      <div>
                        <span className="text-[10px] text-gray-400 block mb-1">분양 배분 비중</span>
                        <input
                          type="number"
                          value={cfg.percentage}
                          onChange={(e) => handleUpdateUnitPercentage(cfg.id, Number(e.target.value))}
                          className="w-full px-2 py-1 bg-white border border-gray-200 rounded text-center font-medium"
                          min="0"
                          max="100"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-400 block mb-1">평당 분양단가 (만원)</span>
                        <input
                          type="number"
                          value={cfg.salesPricePerPyung}
                          onChange={(e) => handleUpdateUnitSalesPrice(cfg.id, Number(e.target.value))}
                          className="w-full px-2 py-1 bg-white border border-gray-200 rounded text-center font-medium"
                          step="50"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Results dashboard - Right 7 Columns */}
          <div className="lg:col-span-7 space-y-6">
            
            {result && (
              <div className="space-y-5">
                {/* Visual scorecard */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide block">총건립 가구수</span>
                    <span className="text-xl font-bold text-gray-900 mt-1 block">{result.totalAllocatedUnits} 세대</span>
                    <p className="text-[10px] text-gray-500 mt-0.5">전용률 {netRatio}% 법정기준</p>
                  </div>
                  <div className="bg-indigo-50/25 p-4 rounded-xl border border-indigo-100/50">
                    <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wide block">총공사 연면적</span>
                    <span className="text-xl font-bold text-indigo-950 mt-1 block">
                      {Math.round(result.totalGFAByPyung).toLocaleString()} 평
                    </span>
                    <p className="text-[10px] text-indigo-700 mt-0.5">지상 {Math.round(result.aboveGroundGFAByPyung)}평 + 지하</p>
                  </div>
                  <div className="bg-amber-50/20 p-4 rounded-xl border border-amber-100/40 col-span-2 sm:col-span-1">
                    <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wide block">예상 영업이익</span>
                    <span className={`text-xl font-bold ${result.financials.operatingProfit >= 0 ? 'text-[#5F7161]' : 'text-rose-600'} mt-1 block`}>
                      {result.financials.operatingProfit} 억원
                    </span>
                    <p className="text-[10px] text-gray-500 mt-0.5">세전 수지 기준</p>
                  </div>
                </div>

                {/* Sub-card detail numbers */}
                <div className="bg-[#FAF9F5] p-5 rounded-2xl border border-[#EDDBC7]/60 space-y-4">
                  <h4 className="text-xs font-bold text-[#2C251F] uppercase tracking-widest border-b border-gray-100 pb-2">
                    사업 종합수리 재무분석 평가서
                  </h4>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    <div>
                      <span className="text-[10px] text-slate-400 block">총 사업비</span>
                      <span className="font-bold text-sm text-gray-800 block mt-0.5">{result.financials.totalProjectCost} 억</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">총 분양매출</span>
                      <span className="font-bold text-sm text-[#5F7161] block mt-0.5">{result.financials.totalSalesRevenue} 억</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">투자수익 장래 (ROI)</span>
                      <span className={`font-bold text-sm ${result.financials.roi >= 0 ? 'text-[#5F7161]' : 'text-rose-600'} block mt-0.5`}>
                        {result.financials.roi}%
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">손익분기 분양률</span>
                      <span className="font-bold text-sm text-indigo-600 block mt-0.5">{result.financials.breakEvenRatio}%</span>
                    </div>
                  </div>

                  <div className="pt-2">
                    <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#5F7161]"
                        style={{ width: `${Math.min(100, Math.max(0, result.financials.roi + 30))}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                      <span>수익 마진 한계선</span>
                      <span className="font-semibold text-gray-600">위험 완충율: 약 {100 - result.financials.breakEvenRatio}% 가용가능</span>
                    </div>
                  </div>
                </div>

                {/* Split layout: Tables & Visual charts */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Detailed allocation table */}
                  <div className="p-4 bg-white rounded-xl border border-gray-100">
                    <h5 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                      <Table className="w-3.5 h-3.5 text-indigo-500" />
                      타입 주택형별 세대 배분 구조
                    </h5>
                    <div className="space-y-3">
                      {result.allocatedUnits.map((u) => (
                        <div key={u.id} className="p-2.5 bg-gray-50/50 rounded-lg text-xs flex justify-between items-center text-gray-600">
                          <div>
                            <span className="font-semibold text-gray-800 text-[11px]">{u.name.split(' (')[0]}</span>
                            <p className="text-[9px] text-gray-400">세대당 {u.unitSalesPrice}억 / 전용 {u.pyung}평</p>
                          </div>
                          <div className="text-right">
                            <span className="font-bold text-gray-900">{u.count} 세대</span>
                            <p className="text-[9px] text-[#5F7161] font-semibold">총 {u.totalSalesPrice} 억</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Profit Bar Chart */}
                  <div className="p-4 bg-white rounded-xl border border-gray-100 flex flex-col justify-between" style={{ minHeight: '220px' }}>
                    <h5 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                      <CircleDollarSign className="w-3.5 h-3.5 text-indigo-500" />
                      총 투자비 vs 예상 분양매출
                    </h5>
                    
                    <div className="h-40 w-full text-xs">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={costVsRevData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                          <YAxis tick={{ fontSize: 10 }} />
                          <Tooltip />
                          <Bar dataKey="상세 금액(억원)" radius={[4, 4, 0, 0]}>
                            {costVsRevData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={index === 0 ? '#8D7B68' : '#5F7161'} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                {/* Construction cost structure */}
                <div className="p-4 bg-white rounded-xl border border-gray-100 flex flex-col sm:flex-row items-center gap-5">
                  <div className="flex-1 space-y-2">
                    <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">프로젝트 세부 비용 분석</span>
                    <div className="space-y-1.5 text-[11px]">
                      <div className="flex justify-between text-gray-600">
                        <span>• 순수 토지 확보비:</span>
                        <span className="font-semibold text-gray-800">{result.financials.landCost} 억원 ({Math.round(result.financials.landCost / result.financials.totalProjectCost * 100)}%)</span>
                      </div>
                      <div className="flex justify-between text-gray-600">
                        <span>• 단지 공동 건축공사비:</span>
                        <span className="font-semibold text-gray-800">{result.financials.constructionCost} 억원 ({Math.round(result.financials.constructionCost / result.financials.totalProjectCost * 100)}%)</span>
                      </div>
                      <div className="flex justify-between text-gray-600">
                        <span>• 부대 금융/설계 비용:</span>
                        <span className="font-semibold text-gray-800">{result.financials.otherCosts} 억원 ({Math.round(result.financials.otherCosts / result.financials.totalProjectCost * 100)}%)</span>
                      </div>
                    </div>
                  </div>

                  {/* Micro Pie Chart from Recharts */}
                  <div className="w-28 h-28 flex-shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={costBreakdownData}
                          cx="50%"
                          cy="50%"
                          innerRadius={20}
                          outerRadius={40}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {costBreakdownData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => `${value} 억원`} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

              </div>
            )}

            {/* Empty view suggestion */}
            {!result && (
              <div className="h-64 border-2 border-dashed border-gray-250 rounded-xl flex flex-col items-center justify-center text-center p-6 bg-gray-50/50">
                <HelpCircle className="w-10 h-10 text-gray-300 mb-2" />
                <p className="text-sm font-semibold text-gray-600">건밀도 연계 연산 정보 준비 중</p>
                <p className="text-xs text-gray-400 mt-1 max-w-sm">
                  좌측 기획 도면의 대지면적, 건폐율, 적용 용적률 수치들을 기입하면 즉시 분양 매출 시뮬레이터가 연동 구성됩니다.
                </p>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
