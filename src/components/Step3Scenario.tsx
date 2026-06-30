/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { LandRegulatoryAnalysis, FARRelaxationResult, ScenarioResult, AllocatedUnitResult } from '../types';
import { CircleDollarSign, Coins, TrendingUp, Building2, Layers, Compass, HelpCircle, ArrowRight, Table, Sparkles, Loader2, RefreshCw, AlertTriangle, Home, Briefcase, Info } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';

interface Step3ScenarioProps {
  currentLand: LandRegulatoryAnalysis | null;
  currentRelaxation: FARRelaxationResult | null;
  onScenarioChange?: (data: { inputs: any; result: any }) => void;
}

interface HousingConfig {
  id: string;
  name: string;
  sizeM2: number;
  pyung: number;
  salesPricePerPyung: number; // 만원 단위 (AI 분석 산출)
  count: number; // 직접 입력 세대수
}

export default function Step3Scenario({ currentLand, currentRelaxation, onScenarioChange }: Step3ScenarioProps) {
  // 1. Core Architectural Spec
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

  // 2. Unit Configurations with separate Apartments and Officetels
  const [aptConfigs, setAptConfigs] = useState<HousingConfig[]>([
    { id: 'apt_small', name: '공동주택 소형 (전용 59㎡ / 실 18평)', sizeM2: 59, pyung: 18, salesPricePerPyung: 4200, count: 12 },
    { id: 'apt_medium', name: '공동주택 중형 (전용 84㎡ / 실 25평)', sizeM2: 84, pyung: 25, salesPricePerPyung: 4500, count: 8 },
    { id: 'apt_large', name: '공동주택 대형 (전용 114㎡ / 실 34평)', sizeM2: 114, pyung: 34, salesPricePerPyung: 5000, count: 4 }
  ]);

  const [officetelConfigs, setOfficetelConfigs] = useState<HousingConfig[]>([
    { id: 'officetel_studio', name: '오피스텔 원룸 (전용 30㎡ / 실 9평)', sizeM2: 30, pyung: 9, salesPricePerPyung: 2600, count: 0 },
    { id: 'officetel_tworoom', name: '오피스텔 투룸 (전용 59㎡ / 실 18평)', sizeM2: 59, pyung: 18, salesPricePerPyung: 3000, count: 0 },
    { id: 'officetel_threeroom', name: '오피스텔 쓰리룸 (전용 84㎡ / 실 25평)', sizeM2: 84, pyung: 25, salesPricePerPyung: 3400, count: 0 }
  ]);

  // Hotel state variables
  const [hotelRoomCount, setHotelRoomCount] = useState<number>(0);
  const [hotelRoomSizePyung, setHotelRoomSizePyung] = useState<number>(12); // 평균 객실 전용평수
  const [hotelPricePerPyung, setHotelPricePerPyung] = useState<number>(2000); // 평당 분양가 (만원)
  const [hotelNetRatio, setHotelNetRatio] = useState<number>(60); // 전용률 (%)
  const [hotelType, setHotelType] = useState<'sales' | 'lease'>('sales'); // 분양 vs 임대
  const [hotelDepositPerRoom, setHotelDepositPerRoom] = useState<number>(3000); // 객실당 보증금 (만원)
  const [hotelRentPerRoom, setHotelRentPerRoom] = useState<number>(150); // 객실당 월 임대료 (만원)

  // Retail state variables
  const [retailNetRatio, setRetailNetRatio] = useState<number>(55); // 전용률 (%)
  const [retailType, setRetailType] = useState<'sales' | 'lease'>('sales'); // 분양 vs 임대
  const [retailB1Area, setRetailB1Area] = useState<number>(0); // 전용평수
  const [retail1FArea, setRetail1FArea] = useState<number>(0);
  const [retail2FArea, setRetail2FArea] = useState<number>(0);
  const [retail3FArea, setRetail3FArea] = useState<number>(0);

  const [retailB1Price, setRetailB1Price] = useState<number>(1500); // 평당 분양가 (만원)
  const [retail1FPrice, setRetail1FPrice] = useState<number>(3500);
  const [retail2FPrice, setRetail2FPrice] = useState<number>(2000);
  const [retail3FPrice, setRetail3FPrice] = useState<number>(1500);

  const [retailB1Deposit, setRetailB1Deposit] = useState<number>(200); // 평당 보증금 (만원)
  const [retail1FDeposit, setRetail1FDeposit] = useState<number>(500);
  const [retail2FDeposit, setRetail2FDeposit] = useState<number>(300);
  const [retail3FDeposit, setRetail3FDeposit] = useState<number>(200);

  const [retailB1Rent, setRetailB1Rent] = useState<number>(10); // 평당 월 임대료 (만원/월)
  const [retail1FRent, setRetail1FRent] = useState<number>(25);
  const [retail2FRent, setRetail2FRent] = useState<number>(15);
  const [retail3FRent, setRetail3FRent] = useState<number>(10);

  // Office state variables
  const [officeArea, setOfficeArea] = useState<number>(0); // 전용평수
  const [officePricePerPyung, setOfficePricePerPyung] = useState<number>(1850); // 평당 분양가 (만원)
  const [officeDepositPerPyung, setOfficeDepositPerPyung] = useState<number>(150); // 평당 보증금 (만원)
  const [officeRentPerPyung, setOfficeRentPerPyung] = useState<number>(8); // 평당 월세 (만원)
  const [officeType, setOfficeType] = useState<'sales' | 'lease'>('sales'); // 분양 vs 임대
  const [officeNetRatio, setOfficeNetRatio] = useState<number>(65); // 전용률 (%)

  // Input tab control
  const [activeInputTab, setActiveInputTab] = useState<'residential' | 'hotel' | 'retail' | 'office'>('residential');

  // AI Market Price Analysis States
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [marketAnalysisReport, setMarketAnalysisReport] = useState<string>('');
  const [analysisError, setAnalysisError] = useState<string>('');

  // Sync state if step 1 or step 2 changes
  useEffect(() => {
    if (currentLand) {
      setLandArea(currentLand.areaSize);
      setAppliedBCR(currentLand.baselineBCR);
      setLandPurchasePrice(currentLand.id === 'gangnam-yeoksam' ? 120 : currentLand.id === 'seocho-banpo' ? 70 : 35);
      
      // Reset analysis or trigger on land change
      fetchMarketPrices(currentLand.address, currentLand.zoning);
    }
  }, [currentLand]);

  useEffect(() => {
    if (currentRelaxation) {
      setAppliedFAR(currentRelaxation.finalFAR);
    }
  }, [currentRelaxation]);

  // AI Market Price Fetching
  const fetchMarketPrices = async (address: string, zoning: string) => {
    setIsAnalyzing(true);
    setAnalysisError('');
    try {
      const finalApiKey = localStorage.getItem('user_gemini_api_key') || '';
      const response = await fetch('/api/analyze-market-price', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(finalApiKey ? { 'x-gemini-key': finalApiKey } : {})
        },
        body: JSON.stringify({ address, zoning })
      });
      const data = await response.json();
      if (response.ok && data && !data.error) {
        setAptConfigs(prev => prev.map(cfg => {
          if (cfg.id === 'apt_small' && data.apartment?.small) return { ...cfg, salesPricePerPyung: data.apartment.small };
          if (cfg.id === 'apt_medium' && data.apartment?.medium) return { ...cfg, salesPricePerPyung: data.apartment.medium };
          if (cfg.id === 'apt_large' && data.apartment?.large) return { ...cfg, salesPricePerPyung: data.apartment.large };
          return cfg;
        }));

        setOfficetelConfigs(prev => prev.map(cfg => {
          if (cfg.id === 'officetel_studio' && data.officetel?.studio) return { ...cfg, salesPricePerPyung: data.officetel.studio };
          if (cfg.id === 'officetel_tworoom' && data.officetel?.tworoom) return { ...cfg, salesPricePerPyung: data.officetel.tworoom };
          if (cfg.id === 'officetel_threeroom' && data.officetel?.threeroom) return { ...cfg, salesPricePerPyung: data.officetel.threeroom };
          return cfg;
        }));

        if (data.hotel) {
          setHotelPricePerPyung(data.hotel);
        }
        if (data.retail) {
          if (data.retail.b1) setRetailB1Price(data.retail.b1);
          if (data.retail.f1) setRetail1FPrice(data.retail.f1);
          if (data.retail.f2) setRetail2FPrice(data.retail.f2);
          if (data.retail.f3) setRetail3FPrice(data.retail.f3);
        }
        if (data.office) {
          setOfficePricePerPyung(data.office);
        }

        setMarketAnalysisReport(data.marketAnalysis || '성공적으로 분양가를 도출했습니다.');
      } else {
        const errMsg = data.error || '시세 정보 수집 중 예기치 못한 문제가 발생했습니다.';
        setAnalysisError(errMsg);
      }
    } catch (err: any) {
      console.error('Market analysis fetch failed:', err);
      setAnalysisError('서버 연결 및 인공지능 분석 연동 과정에 실패했습니다.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleUpdateAptCount = (id: string, count: number) => {
    setAptConfigs(prev => prev.map(item => item.id === id ? { ...item, count: Math.max(0, count) } : item));
  };

  const handleUpdateOfficetelCount = (id: string, count: number) => {
    setOfficetelConfigs(prev => prev.map(item => item.id === id ? { ...item, count: Math.max(0, count) } : item));
  };

  // 3. Dynamic Calculation logic
  const result = useMemo(() => {
    const PYUNG_TO_M2 = 3.30578;

    // A. Net area & Above-ground Gross Floor Area (GFA)
    const aptNetArea = aptConfigs.reduce((sum, item) => sum + (item.count * item.sizeM2), 0);
    const aptAboveGFA = aptNetArea / (netRatio / 100);

    const officetelNetArea = officetelConfigs.reduce((sum, item) => sum + (item.count * item.sizeM2), 0);
    const officetelAboveGFA = officetelNetArea / (netRatio / 100);

    const hotelNetAreaPyung = hotelRoomCount * hotelRoomSizePyung;
    const hotelNetAreaM2 = hotelNetAreaPyung * PYUNG_TO_M2;
    const hotelAboveGFA = hotelNetAreaM2 / (hotelNetRatio / 100);

    const retailNetAreaAboveGroundPyung = retail1FArea + retail2FArea + retail3FArea;
    const retailNetAreaAboveGroundM2 = retailNetAreaAboveGroundPyung * PYUNG_TO_M2;
    const retailAboveGFA = retailNetAreaAboveGroundM2 / (retailNetRatio / 100);

    const officeNetAreaPyung = officeArea;
    const officeNetAreaM2 = officeNetAreaPyung * PYUNG_TO_M2;
    const officeAboveGFA = officeNetAreaM2 / (officeNetRatio / 100);

    // Sum of ground-floor areas
    const aboveGroundGFA = parseFloat((aptAboveGFA + officetelAboveGFA + hotelAboveGFA + retailAboveGFA + officeAboveGFA).toFixed(2));
    
    // Consumed Floor Area Ratio (FAR) = (aboveGroundGFA / landArea) * 100
    const consumedFAR = landArea > 0 ? parseFloat(((aboveGroundGFA / landArea) * 100).toFixed(2)) : 0;
    const isFarExceeded = consumedFAR > appliedFAR;

    // B. Underground Gross Floor Area (GFA)
    const retailNetAreaB1M2 = retailB1Area * PYUNG_TO_M2;
    const retailB1GFA = retailNetAreaB1M2 / (retailNetRatio / 100);
    const baseUndergroundGFA = aboveGroundGFA * 0.35; // standard parking/machinery GFA
    const undergroundGFA = parseFloat((baseUndergroundGFA + retailB1GFA).toFixed(2));

    // C. Total GFA
    const totalGFA = aboveGroundGFA + undergroundGFA;
    const M2_TO_PYUNG = 0.3025;
    const totalGFAByPyung = parseFloat((totalGFA * M2_TO_PYUNG).toFixed(2));
    const aboveGroundGFAByPyung = parseFloat((aboveGroundGFA * M2_TO_PYUNG).toFixed(2));

    // D. Consolidated active units and segments
    const allocatedUnits: AllocatedUnitResult[] = [
      ...aptConfigs.filter(cfg => cfg.count > 0).map(cfg => {
        const unitSalesPriceInWon = cfg.pyung * cfg.salesPricePerPyung * 10000;
        const unitSalesPriceInBillion = parseFloat((unitSalesPriceInWon / 100000000).toFixed(2));
        const totalSalesPrice = parseFloat((cfg.count * unitSalesPriceInBillion).toFixed(2));
        return {
          id: cfg.id,
          name: cfg.name,
          sizeM2: cfg.sizeM2,
          pyung: cfg.pyung,
          count: cfg.count,
          unitSalesPrice: unitSalesPriceInBillion,
          totalSalesPrice
        };
      }),
      ...officetelConfigs.filter(cfg => cfg.count > 0).map(cfg => {
        const unitSalesPriceInWon = cfg.pyung * cfg.salesPricePerPyung * 10000;
        const unitSalesPriceInBillion = parseFloat((unitSalesPriceInWon / 100000000).toFixed(2));
        const totalSalesPrice = parseFloat((cfg.count * unitSalesPriceInBillion).toFixed(2));
        return {
          id: cfg.id,
          name: cfg.name,
          sizeM2: cfg.sizeM2,
          pyung: cfg.pyung,
          count: cfg.count,
          unitSalesPrice: unitSalesPriceInBillion,
          totalSalesPrice
        };
      })
    ];

    if (hotelRoomCount > 0) {
      const isSales = hotelType === 'sales';
      const valueBillion = isSales 
        ? parseFloat(((hotelRoomCount * hotelRoomSizePyung * hotelPricePerPyung) / 10000).toFixed(2))
        : parseFloat(((hotelRoomCount * hotelDepositPerRoom + (hotelRoomCount * hotelRentPerRoom * 12 * 10)) / 10000).toFixed(2)); // 보증금 + 10년 월세
      allocatedUnits.push({
        id: 'facility_hotel',
        name: `호텔 (${hotelRoomCount}실, ${isSales ? '분양형' : '임대형'})`,
        sizeM2: Math.round(hotelNetAreaM2),
        pyung: hotelNetAreaPyung,
        count: hotelRoomCount,
        unitSalesPrice: parseFloat((valueBillion / hotelRoomCount).toFixed(2)),
        totalSalesPrice: valueBillion
      });
    }

    const retailFloors = [
      { id: 'retail_b1', name: '지하 1층 상가', area: retailB1Area, price: retailB1Price, deposit: retailB1Deposit, rent: retailB1Rent },
      { id: 'retail_1f', name: '지상 1층 상가', area: retail1FArea, price: retail1FPrice, deposit: retail1FDeposit, rent: retail1FRent },
      { id: 'retail_2f', name: '지상 2층 상가', area: retail2FArea, price: retail2FPrice, deposit: retail2FDeposit, rent: retail2FRent },
      { id: 'retail_3f', name: '지상 3층 상가', area: retail3FArea, price: retail3FPrice, deposit: retail3FDeposit, rent: retail3FRent }
    ];

    retailFloors.forEach(floor => {
      if (floor.area > 0) {
        const isSales = retailType === 'sales';
        const valueBillion = isSales
          ? parseFloat(((floor.area * floor.price) / 10000).toFixed(2))
          : parseFloat(((floor.area * floor.deposit + (floor.area * floor.rent * 12 * 10)) / 10000).toFixed(2));
        allocatedUnits.push({
          id: floor.id,
          name: `${floor.name} (${Math.round(floor.area)}평, ${isSales ? '분양형' : '임대형'})`,
          sizeM2: Math.round(floor.area * PYUNG_TO_M2),
          pyung: floor.area,
          count: 1,
          unitSalesPrice: valueBillion,
          totalSalesPrice: valueBillion
        });
      }
    });

    if (officeArea > 0) {
      const isSales = officeType === 'sales';
      const valueBillion = isSales
        ? parseFloat(((officeArea * officePricePerPyung) / 10000).toFixed(2))
        : parseFloat(((officeArea * officeDepositPerPyung + (officeArea * officeRentPerPyung * 12 * 10)) / 10000).toFixed(2));
      allocatedUnits.push({
        id: 'facility_office',
        name: `업무시설 (${Math.round(officeArea)}평, ${isSales ? '분양형' : '임대형'})`,
        sizeM2: Math.round(officeArea * PYUNG_TO_M2),
        pyung: officeArea,
        count: 1,
        unitSalesPrice: valueBillion,
        totalSalesPrice: valueBillion
      });
    }

    const totalAllocatedUnits = allocatedUnits.length > 0 ? allocatedUnits.reduce((acc, curr) => acc + curr.count, 0) : 0;

    // E. Financial Analysis Calculations
    const landCost = landPurchasePrice;
    const constructionCostWon = totalGFAByPyung * constructionCostPerPyung * 10000;
    const constructionCost = parseFloat((constructionCostWon / 100000000).toFixed(2));
    const otherCosts = parseFloat(((landCost + constructionCost) * (otherCostsRatio / 100)).toFixed(2));
    const totalProjectCost = parseFloat((landCost + constructionCost + otherCosts).toFixed(2));

    // Revenues Breakdown
    const aptSales = aptConfigs.reduce((sum, item) => sum + (item.count * item.pyung * item.salesPricePerPyung), 0);
    const officetelSales = officetelConfigs.reduce((sum, item) => sum + (item.count * item.pyung * item.salesPricePerPyung), 0);
    const hotelSalesVal = hotelType === 'sales' ? (hotelRoomCount * hotelRoomSizePyung * hotelPricePerPyung) : 0;
    const retailSalesVal = retailType === 'sales' ? (
      (retailB1Area * retailB1Price) +
      (retail1FArea * retail1FPrice) +
      (retail2FArea * retail2FPrice) +
      (retail3FArea * retail3FPrice)
    ) : 0;
    const officeSalesVal = officeType === 'sales' ? (officeArea * officePricePerPyung) : 0;

    const totalSalesRevenue = parseFloat(((aptSales + officetelSales + hotelSalesVal + retailSalesVal + officeSalesVal) / 10000).toFixed(2));

    // Lease Deposits
    const hotelDepositsVal = hotelType === 'lease' ? (hotelRoomCount * hotelDepositPerRoom) : 0;
    const retailDepositsVal = retailType === 'lease' ? (
      (retailB1Area * retailB1Deposit) +
      (retail1FArea * retail1FDeposit) +
      (retail2FArea * retail2FDeposit) +
      (retail3FArea * retail3FDeposit)
    ) : 0;
    const officeDepositsVal = officeType === 'lease' ? (officeArea * officeDepositPerPyung) : 0;

    const totalLeaseDeposits = parseFloat(((hotelDepositsVal + retailDepositsVal + officeDepositsVal) / 10000).toFixed(2));

    // Monthly Rent -> Annual Rent
    const hotelAnnualRentVal = hotelType === 'lease' ? (hotelRoomCount * hotelRentPerRoom * 12) : 0;
    const retailAnnualRentVal = retailType === 'lease' ? (
      ((retailB1Area * retailB1Rent) +
       (retail1FArea * retail1FRent) +
       (retail2FArea * retail2FRent) +
       (retail3FArea * retail3FRent)) * 12
    ) : 0;
    const officeAnnualRentVal = officeType === 'lease' ? (officeArea * officeRentPerPyung * 12) : 0;

    const totalAnnualRent = parseFloat(((hotelAnnualRentVal + retailAnnualRentVal + officeAnnualRentVal) / 10000).toFixed(2));

    // Comprehensive NPV/Inflow Evaluation (Deposits + Sales + 10 Years lease streams)
    const totalRevenues = parseFloat((totalSalesRevenue + totalLeaseDeposits + (totalAnnualRent * 10)).toFixed(2));

    // Profitability
    const operatingProfit = parseFloat((totalRevenues - totalProjectCost).toFixed(2));
    const roi = totalProjectCost > 0 ? parseFloat(((operatingProfit / totalProjectCost) * 100).toFixed(1)) : 0;

    const breakEvenRatio = totalRevenues > 0 
      ? Math.round(Math.min(100, (totalProjectCost / totalRevenues) * 100))
      : 100;

    // F. 20-Year Cash Flow Timeline Simulation (To find exact BEP crossing point)
    // Realistic Model:
    // - Year 0: Land cost is paid upfront (-landCost).
    // - Year 1 & 2 (Construction phase):
    //   * Outflow: Construction & other costs are paid over 2 years (50% each year).
    //   * Inflow: Sales revenues collected as progress payments (30% in Yr 1, 40% in Yr 2).
    //   * No lease deposits or rental incomes (building under construction).
    // - Year 3 (Completion & Operation Start):
    //   * Inflow: 30% balance sales + 100% lease deposits + 1st year of annual rent.
    // - Year 4 to 20 (Operational phase):
    //   * Inflow: Annual rental income.
    const cashFlows: number[] = Array(21).fill(0);
    cashFlows[0] = -landCost;

    const constructionAndOther = constructionCost + otherCosts;

    // Year 1 (Construction Year 1)
    cashFlows[1] = parseFloat(((totalSalesRevenue * 0.3) - (constructionAndOther * 0.5)).toFixed(2));

    // Year 2 (Construction Year 2)
    cashFlows[2] = parseFloat(((totalSalesRevenue * 0.4) - (constructionAndOther * 0.5)).toFixed(2));

    // Year 3 (Completion & Operational Year 1)
    cashFlows[3] = parseFloat(((totalSalesRevenue * 0.3) + totalLeaseDeposits + totalAnnualRent).toFixed(2));

    // Year 4 to 20 (Operational Years 2 to 18)
    for (let t = 4; t <= 20; t++) {
      cashFlows[t] = parseFloat(totalAnnualRent.toFixed(2));
    }

    const cumulativeCashFlow: number[] = Array(21).fill(0);
    cumulativeCashFlow[0] = cashFlows[0];
    let bepYear = -1;

    for (let t = 1; t <= 20; t++) {
      cumulativeCashFlow[t] = parseFloat((cumulativeCashFlow[t - 1] + cashFlows[t]).toFixed(2));
      if (cumulativeCashFlow[t] >= 0 && bepYear === -1) {
        bepYear = t;
      }
    }

    // Numerical solver for Internal Rate of Return (IRR)
    const calculateIRR = (cfs: number[]): number => {
      if (cfs.length === 0 || cfs[0] >= 0) return 0;
      const sum = cfs.reduce((a, b) => a + b, 0);
      if (sum <= 0) return -5.0; // Negative yield fallback

      let r = 0.1;
      let low = -0.99;
      let high = 5.0;
      for (let i = 0; i < 60; i++) {
        let npv = 0;
        for (let t = 0; t < cfs.length; t++) {
          npv += cfs[t] / Math.pow(1 + r, t);
        }
        if (Math.abs(npv) < 0.01) {
          return parseFloat((r * 100).toFixed(1));
        }
        if (npv > 0) {
          low = r;
        } else {
          high = r;
        }
        r = (low + high) / 2;
      }
      return parseFloat((r * 100).toFixed(1));
    };

    const irr = calculateIRR(cashFlows);

    // G. Value Diagnosis Scoring and Radar Chart
    // Normalize axis values to 0-100 scales for Radar Chart presentation
    const salesScore = Math.round(Math.min(100, Math.max(10, (totalSalesRevenue / (totalProjectCost * 0.5 + 1)) * 100)));
    const leaseScore = Math.round(Math.min(100, Math.max(10, (((totalLeaseDeposits + totalAnnualRent * 10) / (totalProjectCost * 0.5 + 1)) * 100))));
    const expenditureScore = Math.round(Math.max(15, Math.min(100, 100 - (totalProjectCost / (totalRevenues + 1) * 80))));
    const bepScore = Math.round(Math.max(10, 100 - breakEvenRatio));
    const irrScore = Math.round(Math.min(100, Math.max(10, (irr > 0 ? (irr / 25) * 100 : 10))));

    const radarData = [
      { subject: '분양수입', score: salesScore },
      { subject: '보증금+임대수익', score: leaseScore },
      { subject: '지출 통제력', score: expenditureScore },
      { subject: 'BEP 안전성', score: bepScore },
      { subject: 'IRR 수익성', score: irrScore }
    ];

    const diagnosisScore = totalAllocatedUnits > 0 
      ? Math.round(radarData.reduce((sum, item) => sum + item.score, 0) / 5)
      : 0;

    const totalSaleablePyung = allocatedUnits.reduce((acc, curr) => acc + curr.pyung, 0);
    const bepPricePerPyung = totalSaleablePyung > 0 
      ? parseFloat(((totalProjectCost * 10000) / totalSaleablePyung).toFixed(0)) 
      : 0;
    const bepRequiredUnits = Math.min(totalAllocatedUnits, Math.ceil(totalAllocatedUnits * (breakEvenRatio / 100)));

    return {
      aboveGroundGFA,
      undergroundGFA,
      totalGFA,
      totalGFAByPyung,
      aboveGroundGFAByPyung,
      allocatedUnits,
      totalAllocatedUnits,
      consumedFAR,
      isFarExceeded,
      cashFlows,
      cumulativeCashFlow,
      bepYear,
      irr,
      radarData,
      diagnosisScore,
      financials: {
        landCost,
        constructionCost,
        otherCosts,
        totalProjectCost,
        totalSalesRevenue,
        totalLeaseDeposits,
        totalAnnualRent,
        totalRevenues,
        operatingProfit,
        roi,
        breakEvenRatio,
        totalSaleablePyung,
        bepPricePerPyung,
        bepRequiredUnits
      }
    };
  }, [
    landArea, appliedFAR, appliedBCR, netRatio, landPurchasePrice, constructionCostPerPyung, otherCostsRatio, 
    aptConfigs, officetelConfigs, hotelRoomCount, hotelRoomSizePyung, hotelPricePerPyung, hotelNetRatio, 
    hotelType, hotelDepositPerRoom, hotelRentPerRoom, retailNetRatio, retailType, retailB1Area, retail1FArea, 
    retail2FArea, retail3FArea, retailB1Price, retail1FPrice, retail2FPrice, retail3FPrice, retailB1Deposit, 
    retail1FDeposit, retail2FDeposit, retail3FDeposit, retailB1Rent, retail1FRent, retail2FRent, retail3FRent, 
    officeArea, officePricePerPyung, officeDepositPerPyung, officeRentPerPyung, officeType, officeNetRatio
  ]);

  useEffect(() => {
    if (onScenarioChange) {
      onScenarioChange({
        inputs: {
          landArea, appliedFAR, appliedBCR, netRatio, landPurchasePrice, constructionCostPerPyung, otherCostsRatio, 
          aptConfigs, officetelConfigs, hotelRoomCount, hotelRoomSizePyung, hotelPricePerPyung, hotelNetRatio, 
          hotelType, hotelDepositPerRoom, hotelRentPerRoom, retailNetRatio, retailType, retailB1Area, retail1FArea, 
          retail2FArea, retail3FArea, retailB1Price, retail1FPrice, retail2FPrice, retail3FPrice, retailB1Deposit, 
          retail1FDeposit, retail2FDeposit, retail3FDeposit, retailB1Rent, retail1FRent, retail2FRent, retail3FRent, 
          officeArea, officePricePerPyung, officeDepositPerPyung, officeRentPerPyung, officeType, officeNetRatio
        },
        result
      });
    }
  }, [result, onScenarioChange]);

  // Chart configuration
  const CHART_GREEN = '#5F7161';
  const CHART_BEIGE = '#EDDBC7';
  const COLORS = [CHART_GREEN, '#8D7B68', CHART_BEIGE, '#A89F94', '#3E362E', '#D9D1C7'];

  const costVsRevData = [
    { name: '투입 총사업비', '상세 금액(억원)': result.financials.totalProjectCost },
    { name: '예상 분양매출', '상세 금액(억원)': result.financials.totalSalesRevenue }
  ];

  const costBreakdownData = [
    { name: '토지 수매비', value: result.financials.landCost },
    { name: '공동 건축 공비', value: result.financials.constructionCost },
    { name: '금융 및 사업공과금', value: result.financials.otherCosts }
  ];

  return (
    <div className="space-y-6" id="step3-container">
      {/* Intro Header */}
      <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-50 pb-4">
          <div>
            <h2 className="text-lg font-semibold text-[#2C251F] flex items-center gap-2">
              <Building2 className="w-5 h-5 text-[#5F7161]" />
              Step 3: 평형별 세대기획 & 주변시세 AI 사업성 분석
            </h2>
            <p className="text-xs text-[#8D7B68] font-normal mt-1 leading-relaxed">
              공동주택과 오피스텔의 세대수를 직접 구성하고, 해당 지역 주소 기반으로 AI가 분석한 평당 분양가를 자동 적용하여 마진율과 타당성을 검토합니다.
            </p>
          </div>
          <button
            onClick={() => currentLand && fetchMarketPrices(currentLand.address, currentLand.zoning)}
            disabled={isAnalyzing || !currentLand}
            className="flex-shrink-0 flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold rounded-xl text-white bg-[#5F7161] hover:bg-[#4E5D50] disabled:bg-gray-300 transition-colors cursor-pointer self-start sm:self-center"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                시세 AI 분석 중...
              </>
            ) : (
              <>
                <RefreshCw className="w-3.5 h-3.5" />
                주변 시세 AI 재분석
              </>
            )}
          </button>
        </div>

        {/* Regulatory Floor Area Ratio Tracker Alert */}
        <div className={`p-4 rounded-xl border transition-all duration-300 ${result.isFarExceeded ? 'bg-red-50 border-red-100 text-red-850' : 'bg-[#F4F6F4] border-gray-100 text-gray-800'}`}>
          <div className="flex items-start gap-3">
            {result.isFarExceeded ? (
              <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            ) : (
              <Layers className="w-5 h-5 text-[#5F7161] flex-shrink-0 mt-0.5" />
            )}
            <div className="flex-1 space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold uppercase tracking-wider">용적률 설계 정합성 검정</span>
                <span className={`text-xs font-extrabold ${result.isFarExceeded ? 'text-red-700' : 'text-[#5F7161]'}`}>
                  {result.consumedFAR}% / {appliedFAR}% (허용 한도)
                </span>
              </div>
              <div className="w-full bg-gray-200/60 h-2.5 rounded-full overflow-hidden mt-1.5">
                <div
                  className={`h-full transition-all duration-500 ${result.isFarExceeded ? 'bg-red-500' : 'bg-[#5F7161]'}`}
                  style={{ width: `${Math.min(100, (result.consumedFAR / appliedFAR) * 100)}%` }}
                ></div>
              </div>
              <div className="flex justify-between items-center text-[10px] text-gray-500 pt-0.5">
                <span>지상 연면적 요구량: {result.aboveGroundGFA.toLocaleString()} ㎡</span>
                {result.isFarExceeded ? (
                  <span className="font-bold text-red-650">⚠️ 허용 한도 대비 {(result.consumedFAR - appliedFAR).toFixed(2)}% 초과! 세대수를 줄이십시오.</span>
                ) : (
                  <span className="font-semibold text-emerald-700">✓ 한도 여유 수지: {(appliedFAR - result.consumedFAR).toFixed(2)}% 잔여</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* AI Market Analysis Report Card */}
        {marketAnalysisReport && (
          <div className="p-4 bg-amber-50/30 border border-[#EDDBC7]/70 rounded-xl space-y-2">
            <div className="flex items-center gap-1.5 text-[#2C251F] font-bold text-xs">
              <Sparkles className="w-4 h-4 text-[#8D7B68]" />
              <span>AI 주변 실거래 및 분양 시세 분석 피드백</span>
            </div>
            <p className="text-xs text-[#8D7B68] leading-relaxed whitespace-pre-wrap">{marketAnalysisReport}</p>
          </div>
        )}

        {analysisError && (
          <div className="p-3 bg-red-50 rounded-lg border border-red-100 flex items-start gap-2 text-xs text-red-700">
            <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="leading-relaxed">{analysisError}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* LEFT: INPUTS (5 Columns) */}
          <div className="lg:col-span-5 space-y-6">
            {/* Input tabs */}
            <div className="flex border-b border-gray-100 mb-5 bg-gray-50/50 p-1 rounded-xl gap-1">
              <button
                type="button"
                onClick={() => setActiveInputTab('residential')}
                className={`flex-1 text-center py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${activeInputTab === 'residential' ? 'bg-white text-[#2C251F] shadow-sm border border-gray-100' : 'text-gray-500 hover:text-gray-800'}`}
              >
                주거시설
              </button>
              <button
                type="button"
                onClick={() => setActiveInputTab('hotel')}
                className={`flex-1 text-center py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${activeInputTab === 'hotel' ? 'bg-white text-[#2C251F] shadow-sm border border-gray-100' : 'text-gray-500 hover:text-gray-800'}`}
              >
                호텔
              </button>
              <button
                type="button"
                onClick={() => setActiveInputTab('retail')}
                className={`flex-1 text-center py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${activeInputTab === 'retail' ? 'bg-white text-[#2C251F] shadow-sm border border-gray-100' : 'text-gray-500 hover:text-gray-800'}`}
              >
                판매시설
              </button>
              <button
                type="button"
                onClick={() => setActiveInputTab('office')}
                className={`flex-1 text-center py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${activeInputTab === 'office' ? 'bg-white text-[#2C251F] shadow-sm border border-gray-100' : 'text-gray-500 hover:text-gray-800'}`}
              >
                업무시설
              </button>
            </div>

            {/* TAB CONTENT */}
            {activeInputTab === 'residential' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xs font-bold text-[#8D7B68] uppercase tracking-widest flex items-center gap-1.5 mb-3">
                    <Home className="w-4 h-4 text-[#5F7161]" />
                    공동주택(다세대/아파트) 세대수 기획
                  </h3>
                  <div className="space-y-3">
                    {aptConfigs.map((cfg) => (
                      <div key={cfg.id} className="p-3 border border-gray-100 rounded-xl bg-[#FCFAF7] flex justify-between items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <span className="text-xs font-bold text-[#2C251F] block truncate">{cfg.name.split(' (')[0]}</span>
                          <div className="flex items-center gap-2 text-[10px] text-gray-500 mt-1">
                            <span>전용 {cfg.sizeM2}㎡ ({cfg.pyung}평형)</span>
                            <span className="text-gray-300">|</span>
                            <span className="font-bold text-[#5F7161]">평당 {cfg.salesPricePerPyung.toLocaleString()}만원</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleUpdateAptCount(cfg.id, cfg.count - 1)}
                            className="w-7 h-7 flex items-center justify-center border border-gray-200 bg-white rounded-lg hover:bg-gray-50 text-xs font-bold text-gray-600 cursor-pointer"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            value={cfg.count}
                            onChange={(e) => handleUpdateAptCount(cfg.id, parseInt(e.target.value) || 0)}
                            className="w-10 text-center text-xs font-bold bg-white border border-gray-200 py-1 rounded-lg focus:outline-none"
                          />
                          <button
                            onClick={() => handleUpdateAptCount(cfg.id, cfg.count + 1)}
                            className="w-7 h-7 flex items-center justify-center border border-gray-200 bg-white rounded-lg hover:bg-gray-50 text-xs font-bold text-gray-600 cursor-pointer"
                          >
                            +
                          </button>
                          <span className="text-xs font-medium text-gray-500 ml-1">세대</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-bold text-[#8D7B68] uppercase tracking-widest flex items-center gap-1.5 mb-3">
                    <Briefcase className="w-4 h-4 text-indigo-600" />
                    오피스텔(O/T 주거형) 세대수 기획
                  </h3>
                  <div className="space-y-3">
                    {officetelConfigs.map((cfg) => (
                      <div key={cfg.id} className="p-3 border border-gray-100 rounded-xl bg-[#FCFAF7] flex justify-between items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <span className="text-xs font-bold text-[#2C251F] block truncate">{cfg.name.split(' (')[0]}</span>
                          <div className="flex items-center gap-2 text-[10px] text-gray-500 mt-1">
                            <span>전용 {cfg.sizeM2}㎡ ({cfg.pyung}평형)</span>
                            <span className="text-gray-300">|</span>
                            <span className="font-bold text-indigo-700">평당 {cfg.salesPricePerPyung.toLocaleString()}만원</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleUpdateOfficetelCount(cfg.id, cfg.count - 1)}
                            className="w-7 h-7 flex items-center justify-center border border-gray-200 bg-white rounded-lg hover:bg-gray-50 text-xs font-bold text-gray-600 cursor-pointer"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            value={cfg.count}
                            onChange={(e) => handleUpdateOfficetelCount(cfg.id, parseInt(e.target.value) || 0)}
                            className="w-10 text-center text-xs font-bold bg-white border border-gray-200 py-1 rounded-lg focus:outline-none"
                          />
                          <button
                            onClick={() => handleUpdateOfficetelCount(cfg.id, cfg.count + 1)}
                            className="w-7 h-7 flex items-center justify-center border border-gray-200 bg-white rounded-lg hover:bg-gray-50 text-xs font-bold text-gray-600 cursor-pointer"
                          >
                            +
                          </button>
                          <span className="text-xs font-medium text-gray-500 ml-1">세대</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                  <div className="flex justify-between font-medium text-xs mb-1">
                    <span className="text-gray-500">주거시설 전용률 설정</span>
                    <span className="font-bold text-[#5F7161]">{netRatio}%</span>
                  </div>
                  <input
                    type="range"
                    min="40"
                    max="90"
                    step="1"
                    value={netRatio}
                    onChange={(e) => setNetRatio(Number(e.target.value))}
                    className="w-full accent-[#5F7161]"
                  />
                </div>
              </div>
            )}

            {activeInputTab === 'hotel' && (
              <div className="space-y-5">
                <div className="border-b border-gray-100 pb-3">
                  <h3 className="text-xs font-bold text-[#8D7B68] uppercase tracking-widest flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-emerald-600" />
                    호텔 및 숙박시설 기획
                  </h3>
                  <p className="text-[10px] text-gray-400 mt-1">객실수와 면적을 조율하여 숙박 상품을 구성합니다.</p>
                </div>

                <div className="space-y-4">
                  {/* 객실수 입력 */}
                  <div className="p-3 border border-gray-100 rounded-xl bg-[#FCFAF7] space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-[#2C251F]">기획 객실 수</span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setHotelRoomCount(Math.max(0, hotelRoomCount - 5))}
                          className="w-7 h-7 flex items-center justify-center border border-gray-200 bg-white rounded-lg hover:bg-gray-50 text-xs font-bold text-gray-600 cursor-pointer"
                        >
                          -5
                        </button>
                        <input
                          type="number"
                          value={hotelRoomCount}
                          onChange={(e) => setHotelRoomCount(Math.max(0, parseInt(e.target.value) || 0))}
                          className="w-12 text-center text-xs font-bold bg-white border border-gray-200 py-1 rounded-lg focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setHotelRoomCount(hotelRoomCount + 5)}
                          className="w-7 h-7 flex items-center justify-center border border-gray-200 bg-white rounded-lg hover:bg-gray-50 text-xs font-bold text-gray-600 cursor-pointer"
                        >
                          +5
                        </button>
                        <span className="text-xs font-medium text-gray-500 ml-1">실</span>
                      </div>
                    </div>
                  </div>

                  {/* 객실당 전용평수 */}
                  <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-1">
                    <div className="flex justify-between font-medium text-xs">
                      <span className="text-gray-500">평균 객실 전용평수</span>
                      <span className="font-bold text-gray-800">{hotelRoomSizePyung} 평 (약 {Math.round(hotelRoomSizePyung * 3.3)}㎡)</span>
                    </div>
                    <input
                      type="range"
                      min="6"
                      max="40"
                      step="1"
                      value={hotelRoomSizePyung}
                      onChange={(e) => setHotelRoomSizePyung(Number(e.target.value))}
                      className="w-full accent-[#5F7161]"
                    />
                  </div>

                  {/* 전용률 */}
                  <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-1">
                    <div className="flex justify-between font-medium text-xs">
                      <span className="text-gray-500">호텔 전용률 설정</span>
                      <span className="font-bold text-gray-800">{hotelNetRatio}%</span>
                    </div>
                    <input
                      type="range"
                      min="40"
                      max="85"
                      step="5"
                      value={hotelNetRatio}
                      onChange={(e) => setHotelNetRatio(Number(e.target.value))}
                      className="w-full accent-[#5F7161]"
                    />
                  </div>

                  {/* 사업 운영 방식 */}
                  <div className="space-y-2">
                    <label className="block text-[11px] font-semibold text-gray-500">호텔 사업 모델 선택</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setHotelType('sales')}
                        className={`py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${hotelType === 'sales' ? 'bg-[#5F7161] text-white border-[#5F7161]' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                      >
                        분양형 호텔 (수매 매각)
                      </button>
                      <button
                        type="button"
                        onClick={() => setHotelType('lease')}
                        className={`py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${hotelType === 'lease' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                      >
                        임대/직영형 (보증금+임대료)
                      </button>
                    </div>
                  </div>

                  {/* 가격 및 수입 변수 */}
                  {hotelType === 'sales' ? (
                    <div className="p-3 border border-amber-100 rounded-xl bg-amber-50/10 space-y-2">
                      <div className="flex justify-between text-xs font-medium">
                        <span className="text-amber-800">평당 분양가 (AI 시세 시뮬레이션)</span>
                        <span className="font-bold text-amber-900">{hotelPricePerPyung.toLocaleString()} 만원</span>
                      </div>
                      <input
                        type="range"
                        min="1000"
                        max="6000"
                        step="50"
                        value={hotelPricePerPyung}
                        onChange={(e) => setHotelPricePerPyung(Number(e.target.value))}
                        className="w-full accent-amber-600"
                      />
                      <div className="text-[10px] text-gray-500 pt-1 flex justify-between">
                        <span>예상 호텔 분양매출:</span>
                        <strong className="text-amber-800">
                          {((hotelRoomCount * hotelRoomSizePyung * hotelPricePerPyung) / 10000).toFixed(2)} 억원
                        </strong>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 border border-indigo-100 rounded-xl bg-indigo-50/10 space-y-3">
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs font-medium">
                          <span className="text-indigo-800">객실당 평균 임대 보증금</span>
                          <span className="font-bold text-indigo-900">{hotelDepositPerRoom.toLocaleString()} 만원</span>
                        </div>
                        <input
                          type="range"
                          min="1000"
                          max="15000"
                          step="500"
                          value={hotelDepositPerRoom}
                          onChange={(e) => setHotelDepositPerRoom(Number(e.target.value))}
                          className="w-full accent-indigo-600"
                        />
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs font-medium">
                          <span className="text-indigo-800">객실당 월 임대 수익/수수료</span>
                          <span className="font-bold text-indigo-900">{hotelRentPerRoom.toLocaleString()} 만원/월</span>
                        </div>
                        <input
                          type="range"
                          min="50"
                          max="500"
                          step="10"
                          value={hotelRentPerRoom}
                          onChange={(e) => setHotelRentPerRoom(Number(e.target.value))}
                          className="w-full accent-indigo-600"
                        />
                      </div>
                      <div className="text-[10px] text-gray-500 pt-1 border-t border-indigo-50 flex flex-col gap-1">
                        <div className="flex justify-between">
                          <span>보증금 입금액:</span>
                          <strong className="text-indigo-800">{((hotelRoomCount * hotelDepositPerRoom) / 10000).toFixed(2)} 억원</strong>
                        </div>
                        <div className="flex justify-between">
                          <span>연간 호텔 운영임대료:</span>
                          <strong className="text-emerald-700">{((hotelRoomCount * hotelRentPerRoom * 12) / 10000).toFixed(2)} 억원/년</strong>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeInputTab === 'retail' && (
              <div className="space-y-5">
                <div className="border-b border-gray-100 pb-3">
                  <h3 className="text-xs font-bold text-[#8D7B68] uppercase tracking-widest flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-orange-600" />
                    판매시설 (층별 상가) 기획
                  </h3>
                  <p className="text-[10px] text-gray-400 mt-1">지하 및 지상 층별로 전용 면적과 평당 시세를 개별 설정합니다.</p>
                </div>

                <div className="space-y-4">
                  {/* 상가 전용률 */}
                  <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-1">
                    <div className="flex justify-between font-medium text-xs">
                      <span className="text-gray-500">판매시설 전용률 설정</span>
                      <span className="font-bold text-gray-800">{retailNetRatio}%</span>
                    </div>
                    <input
                      type="range"
                      min="35"
                      max="75"
                      step="5"
                      value={retailNetRatio}
                      onChange={(e) => setRetailNetRatio(Number(e.target.value))}
                      className="w-full accent-[#5F7161]"
                    />
                  </div>

                  {/* 사업 모델 */}
                  <div className="space-y-2">
                    <label className="block text-[11px] font-semibold text-gray-500">판매시설 사업 모델 선택</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setRetailType('sales')}
                        className={`py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${retailType === 'sales' ? 'bg-[#5F7161] text-white border-[#5F7161]' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                      >
                        분양형 상가 (통 분양)
                      </button>
                      <button
                        type="button"
                        onClick={() => setRetailType('lease')}
                        className={`py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${retailType === 'lease' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                      >
                        임대형 상가 (에셋 홀딩)
                      </button>
                    </div>
                  </div>

                  {/* 층별 면적 및 시세 정보 */}
                  <div className="space-y-3.5 pt-1">
                    {/* B1 상가 */}
                    <div className="p-3 border border-gray-100 rounded-xl bg-[#FCFAF7] space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-[#2C251F]">지하 1층 (B1) 전용면적</span>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            value={retailB1Area}
                            onChange={(e) => setRetailB1Area(Math.max(0, parseInt(e.target.value) || 0))}
                            className="w-16 text-center text-xs font-bold bg-white border border-gray-200 py-1 rounded-lg focus:outline-none"
                          />
                          <span className="text-xs text-gray-500">평</span>
                        </div>
                      </div>
                      {retailB1Area > 0 && (
                        <div className="pt-2 border-t border-gray-100/60 space-y-2">
                          {retailType === 'sales' ? (
                            <div className="flex justify-between items-center text-[11px]">
                              <span className="text-slate-500">B1 평당 분양가:</span>
                              <div className="flex items-center gap-1.5">
                                <input
                                  type="number"
                                  value={retailB1Price}
                                  onChange={(e) => setRetailB1Price(Math.max(0, parseInt(e.target.value) || 0))}
                                  className="w-16 text-center text-[11px] font-bold bg-white border border-gray-200 py-0.5 rounded"
                                />
                                <span className="text-slate-500">만원</span>
                              </div>
                            </div>
                          ) : (
                            <div className="grid grid-cols-2 gap-2 text-[10px]">
                              <div className="flex justify-between items-center">
                                <span className="text-slate-500">평당 보증금:</span>
                                <input
                                  type="number"
                                  value={retailB1Deposit}
                                  onChange={(e) => setRetailB1Deposit(Math.max(0, parseInt(e.target.value) || 0))}
                                  className="w-12 text-center font-bold bg-white border border-gray-200 py-0.5 rounded"
                                />
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-slate-500">평당 월세:</span>
                                <input
                                  type="number"
                                  value={retailB1Rent}
                                  onChange={(e) => setRetailB1Rent(Math.max(0, parseInt(e.target.value) || 0))}
                                  className="w-12 text-center font-bold bg-white border border-gray-200 py-0.5 rounded"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* 1F 상가 */}
                    <div className="p-3 border border-gray-100 rounded-xl bg-[#FCFAF7] space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-[#2C251F]">지상 1층 (1F) 전용면적</span>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            value={retail1FArea}
                            onChange={(e) => setRetail1FArea(Math.max(0, parseInt(e.target.value) || 0))}
                            className="w-16 text-center text-xs font-bold bg-white border border-gray-200 py-1 rounded-lg focus:outline-none"
                          />
                          <span className="text-xs text-gray-500">평</span>
                        </div>
                      </div>
                      {retail1FArea > 0 && (
                        <div className="pt-2 border-t border-gray-100/60 space-y-2">
                          {retailType === 'sales' ? (
                            <div className="flex justify-between items-center text-[11px]">
                              <span className="text-slate-500">1F 평당 분양가:</span>
                              <div className="flex items-center gap-1.5">
                                <input
                                  type="number"
                                  value={retail1FPrice}
                                  onChange={(e) => setRetail1FPrice(Math.max(0, parseInt(e.target.value) || 0))}
                                  className="w-16 text-center text-[11px] font-bold bg-white border border-gray-200 py-0.5 rounded"
                                />
                                <span className="text-slate-500">만원</span>
                              </div>
                            </div>
                          ) : (
                            <div className="grid grid-cols-2 gap-2 text-[10px]">
                              <div className="flex justify-between items-center">
                                <span className="text-slate-500">평당 보증금:</span>
                                <input
                                  type="number"
                                  value={retail1FDeposit}
                                  onChange={(e) => setRetail1FDeposit(Math.max(0, parseInt(e.target.value) || 0))}
                                  className="w-12 text-center font-bold bg-white border border-gray-200 py-0.5 rounded"
                                />
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-slate-500">평당 월세:</span>
                                <input
                                  type="number"
                                  value={retail1FRent}
                                  onChange={(e) => setRetail1FRent(Math.max(0, parseInt(e.target.value) || 0))}
                                  className="w-12 text-center font-bold bg-white border border-gray-200 py-0.5 rounded"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* 2F 상가 */}
                    <div className="p-3 border border-gray-100 rounded-xl bg-[#FCFAF7] space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-[#2C251F]">지상 2층 (2F) 전용면적</span>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            value={retail2FArea}
                            onChange={(e) => setRetail2FArea(Math.max(0, parseInt(e.target.value) || 0))}
                            className="w-16 text-center text-xs font-bold bg-white border border-gray-200 py-1 rounded-lg focus:outline-none"
                          />
                          <span className="text-xs text-gray-500">평</span>
                        </div>
                      </div>
                      {retail2FArea > 0 && (
                        <div className="pt-2 border-t border-gray-100/60 space-y-2">
                          {retailType === 'sales' ? (
                            <div className="flex justify-between items-center text-[11px]">
                              <span className="text-slate-500">2F 평당 분양가:</span>
                              <div className="flex items-center gap-1.5">
                                <input
                                  type="number"
                                  value={retail2FPrice}
                                  onChange={(e) => setRetail2FPrice(Math.max(0, parseInt(e.target.value) || 0))}
                                  className="w-16 text-center text-[11px] font-bold bg-white border border-gray-200 py-0.5 rounded"
                                />
                                <span className="text-slate-500">만원</span>
                              </div>
                            </div>
                          ) : (
                            <div className="grid grid-cols-2 gap-2 text-[10px]">
                              <div className="flex justify-between items-center">
                                <span className="text-slate-500">평당 보증금:</span>
                                <input
                                  type="number"
                                  value={retail2FDeposit}
                                  onChange={(e) => setRetail2FDeposit(Math.max(0, parseInt(e.target.value) || 0))}
                                  className="w-12 text-center font-bold bg-white border border-gray-200 py-0.5 rounded"
                                />
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-slate-500">평당 월세:</span>
                                <input
                                  type="number"
                                  value={retail2FRent}
                                  onChange={(e) => setRetail2FRent(Math.max(0, parseInt(e.target.value) || 0))}
                                  className="w-12 text-center font-bold bg-white border border-gray-200 py-0.5 rounded"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* 3F 상가 */}
                    <div className="p-3 border border-gray-100 rounded-xl bg-[#FCFAF7] space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-[#2C251F]">지상 3층 (3F) 전용면적</span>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            value={retail3FArea}
                            onChange={(e) => setRetail3FArea(Math.max(0, parseInt(e.target.value) || 0))}
                            className="w-16 text-center text-xs font-bold bg-white border border-gray-200 py-1 rounded-lg focus:outline-none"
                          />
                          <span className="text-xs text-gray-500">평</span>
                        </div>
                      </div>
                      {retail3FArea > 0 && (
                        <div className="pt-2 border-t border-gray-100/60 space-y-2">
                          {retailType === 'sales' ? (
                            <div className="flex justify-between items-center text-[11px]">
                              <span className="text-slate-500">3F 평당 분양가:</span>
                              <div className="flex items-center gap-1.5">
                                <input
                                  type="number"
                                  value={retail3FPrice}
                                  onChange={(e) => setRetail3FPrice(Math.max(0, parseInt(e.target.value) || 0))}
                                  className="w-16 text-center text-[11px] font-bold bg-white border border-gray-200 py-0.5 rounded"
                                />
                                <span className="text-slate-500">만원</span>
                              </div>
                            </div>
                          ) : (
                            <div className="grid grid-cols-2 gap-2 text-[10px]">
                              <div className="flex justify-between items-center">
                                <span className="text-slate-500">평당 보증금:</span>
                                <input
                                  type="number"
                                  value={retail3FDeposit}
                                  onChange={(e) => setRetail3FDeposit(Math.max(0, parseInt(e.target.value) || 0))}
                                  className="w-12 text-center font-bold bg-white border border-gray-200 py-0.5 rounded"
                                />
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-slate-500">평당 월세:</span>
                                <input
                                  type="number"
                                  value={retail3FRent}
                                  onChange={(e) => setRetail3FRent(Math.max(0, parseInt(e.target.value) || 0))}
                                  className="w-12 text-center font-bold bg-white border border-gray-200 py-0.5 rounded"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeInputTab === 'office' && (
              <div className="space-y-5">
                <div className="border-b border-gray-100 pb-3">
                  <h3 className="text-xs font-bold text-[#8D7B68] uppercase tracking-widest flex items-center gap-1.5">
                    <Briefcase className="w-4 h-4 text-indigo-600" />
                    업무시설 (섹션 오피스/사무실) 기획
                  </h3>
                  <p className="text-[10px] text-gray-400 mt-1">업무용 시설의 기획 면적과 계약 형태를 조율합니다.</p>
                </div>

                <div className="space-y-4">
                  {/* 총 전용면적 */}
                  <div className="p-3 border border-gray-100 rounded-xl bg-[#FCFAF7] space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-[#2C251F]">업무시설 총 전용면적</span>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          value={officeArea}
                          onChange={(e) => setOfficeArea(Math.max(0, parseInt(e.target.value) || 0))}
                          className="w-20 text-center text-xs font-bold bg-white border border-gray-200 py-1 rounded-lg focus:outline-none"
                        />
                        <span className="text-xs text-gray-500">평</span>
                      </div>
                    </div>
                    {officeArea > 0 && (
                      <p className="text-[10px] text-gray-400 text-right">약 {(officeArea * 3.3).toLocaleString()}㎡ 연면적 규모</p>
                    )}
                  </div>

                  {/* 업무시설 전용률 */}
                  <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-1">
                    <div className="flex justify-between font-medium text-xs">
                      <span className="text-gray-500">업무시설 전용률 설정</span>
                      <span className="font-bold text-gray-800">{officeNetRatio}%</span>
                    </div>
                    <input
                      type="range"
                      min="40"
                      max="80"
                      step="5"
                      value={officeNetRatio}
                      onChange={(e) => setOfficeNetRatio(Number(e.target.value))}
                      className="w-full accent-[#5F7161]"
                    />
                  </div>

                  {/* 사업 운영 방식 */}
                  <div className="space-y-2">
                    <label className="block text-[11px] font-semibold text-gray-500">업무시설 사업 모델 선택</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setOfficeType('sales')}
                        className={`py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${officeType === 'sales' ? 'bg-[#5F7161] text-white border-[#5F7161]' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                      >
                        분양형 오피스 (매각 전매)
                      </button>
                      <button
                        type="button"
                        onClick={() => setOfficeType('lease')}
                        className={`py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${officeType === 'lease' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                      >
                        임대형 오피스 (에셋 임대)
                      </button>
                    </div>
                  </div>

                  {/* 수입 조건 */}
                  {officeType === 'sales' ? (
                    <div className="p-3 border border-amber-100 rounded-xl bg-amber-50/10 space-y-2">
                      <div className="flex justify-between text-xs font-medium">
                        <span className="text-amber-800">평당 오피스 분양가 (AI 권장시세)</span>
                        <span className="font-bold text-amber-900">{officePricePerPyung.toLocaleString()} 만원</span>
                      </div>
                      <input
                        type="range"
                        min="1000"
                        max="5000"
                        step="50"
                        value={officePricePerPyung}
                        onChange={(e) => setOfficePricePerPyung(Number(e.target.value))}
                        className="w-full accent-amber-600"
                      />
                      <div className="text-[10px] text-gray-500 pt-1 flex justify-between">
                        <span>예상 오피스 분양매출:</span>
                        <strong className="text-amber-800">
                          {((officeArea * officePricePerPyung) / 10000).toFixed(2)} 억원
                        </strong>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 border border-indigo-100 rounded-xl bg-indigo-50/10 space-y-3">
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs font-medium">
                          <span className="text-indigo-800">오피스 평당 보증금 (만원)</span>
                          <span className="font-bold text-indigo-900">{officeDepositPerPyung.toLocaleString()} 만원</span>
                        </div>
                        <input
                          type="range"
                          min="50"
                          max="1000"
                          step="10"
                          value={officeDepositPerPyung}
                          onChange={(e) => setOfficeDepositPerPyung(Number(e.target.value))}
                          className="w-full accent-indigo-600"
                        />
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs font-medium">
                          <span className="text-indigo-800">오피스 평당 월 임대료 (만원/월)</span>
                          <span className="font-bold text-indigo-900">{officeRentPerPyung.toLocaleString()} 만원</span>
                        </div>
                        <input
                          type="range"
                          min="2"
                          max="30"
                          step="1"
                          value={officeRentPerPyung}
                          onChange={(e) => setOfficeRentPerPyung(Number(e.target.value))}
                          className="w-full accent-indigo-600"
                        />
                      </div>
                      <div className="text-[10px] text-gray-500 pt-1 border-t border-indigo-50 flex flex-col gap-1">
                        <div className="flex justify-between">
                          <span>보증금 입금 총액:</span>
                          <strong className="text-indigo-800">{((officeArea * officeDepositPerPyung) / 10000).toFixed(2)} 억원</strong>
                        </div>
                        <div className="flex justify-between">
                          <span>연간 오피스 임대료:</span>
                          <strong className="text-emerald-700">{((officeArea * officeRentPerPyung * 12) / 10000).toFixed(2)} 억원/년</strong>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="h-px bg-gray-100 my-4"></div>

            {/* General parameters */}
            <div>
              <h3 className="text-xs font-bold text-[#8D7B68] uppercase tracking-widest flex items-center gap-1 mb-3">
                <Compass className="w-4 h-4 text-[#5F7161]" />
                기초 변수 및 재무조건 조율
              </h3>
              
              <div className="space-y-4 text-xs text-gray-600">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-500 mb-1">총 대지 면적 (㎡)</label>
                    <input
                      type="number"
                      value={landArea}
                      onChange={(e) => setLandArea(Number(e.target.value))}
                      className="w-full text-xs px-3 py-2 bg-[#F9F7F2] border border-[#E5E2DD] rounded-xl focus:outline-none focus:border-[#5F7161] font-bold text-gray-800"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-500 mb-1">용적률 한도 (%)</label>
                    <input
                      type="number"
                      value={appliedFAR}
                      onChange={(e) => setAppliedFAR(Number(e.target.value))}
                      className="w-full text-xs px-3 py-2 bg-[#F9F7F2] border border-[#E5E2DD] rounded-xl focus:outline-none focus:border-[#5F7161] font-bold text-gray-800"
                    />
                  </div>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-2">
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

                <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-2">
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

                <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-2">
                  <div className="flex justify-between font-medium">
                    <span>기타 부대비용 비율 (금융, 설계 등)</span>
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
            </div>
          </div>

          {/* RIGHT: RESULTS (7 Columns) */}
          <div className="lg:col-span-7 space-y-6">
            {result.totalAllocatedUnits > 0 || result.allocatedUnits.length > 0 ? (
              <div className="space-y-6">
                {/* Visual scorecard */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide block">총건립 상품 규모</span>
                    <span className="text-lg font-extrabold text-gray-900 mt-1 block">
                      {result.totalAllocatedUnits}개 실/세대
                    </span>
                    <p className="text-[10px] text-gray-500 mt-0.5">상업/업무 구역 전체 합산</p>
                  </div>
                  <div className="bg-indigo-50/25 p-4 rounded-xl border border-indigo-100/50">
                    <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wide block">총건축 연면적</span>
                    <span className="text-lg font-extrabold text-indigo-950 mt-1 block">
                      {Math.round(result.totalGFAByPyung).toLocaleString()} 평
                    </span>
                    <p className="text-[10px] text-indigo-700 mt-0.5">지상 {Math.round(result.aboveGroundGFAByPyung).toLocaleString()}평 설계</p>
                  </div>
                  <div className="bg-emerald-50/30 p-4 rounded-xl border border-emerald-100/40 col-span-2 sm:col-span-1">
                    <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wide block">예상 영업이익</span>
                    <span className={`text-lg font-extrabold ${result.financials.operatingProfit >= 0 ? 'text-[#5F7161]' : 'text-rose-600'} mt-1 block`}>
                      {result.financials.operatingProfit} 억원
                    </span>
                    <p className="text-[10px] text-gray-500 mt-0.5">분양 및 임대 10년 합산수지</p>
                  </div>
                </div>

                {/* Financial overview */}
                <div className="bg-[#FAF9F5] p-5 rounded-2xl border border-[#EDDBC7]/60 space-y-4">
                  <h4 className="text-xs font-bold text-[#2C251F] uppercase tracking-widest border-b border-[#EDDBC7]/40 pb-2">
                    사업 종합수지 재무분석 평가서
                  </h4>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    <div>
                      <span className="text-[10px] text-slate-400 block">총 투자비 (원가)</span>
                      <span className="font-bold text-sm text-gray-800 block mt-0.5">{result.financials.totalProjectCost} 억</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">총 매출가치 (Inflows)</span>
                      <span className="font-bold text-sm text-[#5F7161] block mt-0.5">{result.financials.totalRevenues} 억</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">장래 내부수익률 (IRR)</span>
                      <span className={`font-bold text-sm ${result.irr >= 0 ? 'text-[#5F7161]' : 'text-rose-600'} block mt-0.5`}>
                        {result.irr}%
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
                      <span>수익 마진 완충 여력</span>
                      <span className="font-semibold text-gray-600">위험 한계 안전률: 약 {100 - result.financials.breakEvenRatio}% 가용가능</span>
                    </div>
                  </div>
                </div>

                {/* RE-ARCHITECTED BENTO GRID FOR VALUE DIAGNOSIS RADAR CHART & BEP TIMELINE CHART */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* CHART 1: VALUE DIAGNOSIS RADAR */}
                  <div className="bg-white p-5 rounded-2xl border border-gray-100 flex flex-col justify-between shadow-sm relative overflow-hidden" style={{ minHeight: '360px' }}>
                    <div>
                      <span className="text-[9px] font-extrabold text-[#5F7161] tracking-wider uppercase">사업성 진단</span>
                      <h4 className="text-sm font-bold text-gray-900 tracking-tight leading-tight mt-0.5">Value Diagnosis</h4>
                    </div>

                    <div className="h-48 w-full flex items-center justify-center mt-3">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart cx="50%" cy="50%" outerRadius="75%" data={result.radarData}>
                          <PolarGrid stroke="#f1f1f1" />
                          <PolarAngleAxis dataKey="subject" tick={{ fill: '#6e6e6e', fontSize: 10, fontWeight: 600 }} />
                          <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9 }} />
                          <Radar name="진단 점수" dataKey="score" stroke="#5F7161" fill="#5F7161" fillOpacity={0.18} />
                          <Tooltip formatter={(val) => [`${val}점`, '진단 점수']} />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>

                    {/* BIG SCORE IN BOTTOM RIGHT/LEFT */}
                    <div className="mt-4 pt-3 border-t border-gray-50 flex items-center justify-between">
                      <span className="text-[10px] text-gray-400 leading-normal font-semibold">종합 재무 건전성 점수</span>
                      <div className="flex items-baseline gap-1 bg-[#F4F6F4] px-2.5 py-1 rounded-lg">
                        <span className="text-xl font-black text-[#5F7161] tracking-tight">{result.diagnosisScore}</span>
                        <span className="text-xs text-gray-400">/ 100점</span>
                      </div>
                    </div>
                  </div>

                  {/* CHART 2: BEP TIMELINE COLUMN CHART */}
                  <div className="bg-white p-5 rounded-2xl border border-gray-100 flex flex-col justify-between shadow-sm relative overflow-hidden" style={{ minHeight: '360px' }}>
                    <div>
                      <span className="text-[9px] font-extrabold text-indigo-600 tracking-wider uppercase">손익분기점</span>
                      <h4 className="text-sm font-bold text-gray-900 tracking-tight leading-tight mt-0.5">BEP(Break-Even Point) Simulation</h4>
                    </div>

                    {/* YEAR BAR CHART */}
                    <div className="h-44 w-full mt-3 relative">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart 
                          data={result.cumulativeCashFlow.map((val, idx) => ({
                            name: `${idx}년`,
                            '누적수지': val,
                            isBepCross: idx === result.bepYear
                          })).slice(0, 15)} 
                          margin={{ top: 15, right: 5, left: -25, bottom: 0 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f1f1" />
                          <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#888' }} />
                          <YAxis tick={{ fontSize: 9, fill: '#888' }} />
                          <Tooltip formatter={(value) => [`${value} 억원`, '누적 수지']} />
                          <Bar dataKey="누적수지" radius={[3, 3, 0, 0]}>
                            {result.cumulativeCashFlow.slice(0, 15).map((entry, index) => {
                              // Style: highlight crossover year in indigo, negative values in warm beige, positive in sage
                              let fill = '#D9D1C7'; // Negative
                              if (entry >= 0) fill = '#8D7B68'; // Positive but general
                              if (index === result.bepYear) fill = '#4F46E5'; // BEP CROSS POINT
                              return <Cell key={`cell-${index}`} fill={fill} />;
                            })}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>

                      {/* Cute indicator speech bubble if BEP crosses */}
                      {result.bepYear > 0 && result.bepYear < 15 && (
                        <div className="absolute top-1.5 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow-md flex items-center gap-1">
                          <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping" />
                          {result.bepYear}년차 회수 완료
                        </div>
                      )}
                    </div>

                    {/* BIG YEAR RANK METRIC */}
                    <div className="mt-4 pt-3 border-t border-gray-50 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-gray-400 block leading-none font-semibold">원금 회수 소요 기간</span>
                        <span className="text-[9px] text-indigo-500 font-bold block mt-0.5">BEP Timeline crossing</span>
                      </div>
                      <div className="text-right">
                        <span className="text-2xl font-black text-indigo-600 tracking-tight">
                          {result.bepYear > 0 ? `${result.bepYear}년` : '20년 초과'}
                        </span>
                        <span className="text-[10px] text-gray-400 block -mt-1 font-bold">bep crossover</span>
                      </div>
                    </div>
                  </div>

                </div>

                {/* 기획된 평형 세대 배분 구조 */}
                <div className="p-5 bg-white rounded-2xl border border-gray-100 shadow-sm space-y-4">
                  <h5 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5 border-b border-gray-50 pb-2">
                    <Table className="w-4 h-4 text-[#5F7161]" />
                    기획 상품 구성 명세서
                  </h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {result.allocatedUnits.map((u) => {
                      const isRes = u.id.startsWith('apt_') || u.id.startsWith('officetel_');
                      const isHotel = u.id === 'hotel';
                      const isOffice = u.id === 'office';
                      const isRetail = u.id.startsWith('retail_');

                      let badgeColor = "bg-emerald-50 text-emerald-800";
                      if (isHotel) badgeColor = "bg-purple-50 text-purple-800";
                      if (isOffice) badgeColor = "bg-indigo-50 text-indigo-800";
                      if (isRetail) badgeColor = "bg-orange-50 text-orange-800";

                      return (
                        <div key={u.id} className="p-3 bg-gray-50/50 rounded-xl text-xs flex justify-between items-center border border-gray-50">
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className={`px-1.5 py-0.5 text-[9px] font-bold rounded ${badgeColor}`}>
                                {isRes ? '주거' : isHotel ? '호텔' : isOffice ? '업무' : '상가'}
                              </span>
                              <span className="font-bold text-gray-800 text-[11px]">{u.name.split(' (')[0]}</span>
                            </div>
                            <p className="text-[10px] text-gray-400 mt-1">단위단가: {u.unitSalesPrice.toFixed(2)}억 / 규모: {u.pyung}평</p>
                          </div>
                          <div className="text-right">
                            <span className="font-bold text-gray-900">{u.count}실/세대</span>
                            <p className="text-[10px] text-[#5F7161] font-bold">총 {u.totalSalesPrice.toFixed(2)} 억</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Dynamic diagnostic review feedback */}
                <div className="p-4 bg-[#FAF9F5] rounded-xl border border-[#EDDBC7]/60 space-y-1 text-xs text-slate-600">
                  <div className="flex items-center gap-1.5 font-bold text-[#2C251F] mb-1">
                    <Sparkles className="w-4 h-4 text-[#8D7B68]" />
                    <span>재무 타당성 및 리스크 종합 평가</span>
                  </div>
                  {result.financials.operatingProfit >= 0 ? (
                    <p className="leading-relaxed text-[11px]">
                      현재 기획안은 주변 실거래 분석 결과 평당 분양/임대단가가 잘 매칭되어 있으며, <strong>총 {result.financials.totalRevenues}억원의 매출 가치</strong>가 발생할 것으로 예측됩니다.
                      전체 사업 투입비 <strong>{result.financials.totalProjectCost}억원</strong> 대비 손익분기 안전률이 준수하며, <strong>{result.bepYear > 0 ? `${result.bepYear}년차` : '안정적 기간내'}</strong>에 원금 회수가 완료되어 개발 리스크가 매우 낮습니다.
                    </p>
                  ) : (
                    <p className="leading-relaxed text-[11px]">
                      현재 기획안은 <strong>{Math.abs(result.financials.operatingProfit)}억원의 사업 적자</strong>가 발생하고 있어 손익분기를 미달합니다.
                      원금 자본 회수가 어려우므로 <strong>분양/임대 면적을 증대</strong>하거나, <strong>각 시설별 평당 가격(예: 분양 평당가)을 보수 시세 상한선까지 상향</strong>하여 수익 완충 수지를 회복해야 합니다.
                    </p>
                  )}
                </div>

                {/* 사업성 진단 기준 가이드라인 */}
                <div className="p-4 bg-white rounded-2xl border border-gray-100 shadow-sm space-y-2.5 text-xs text-slate-600">
                  <h6 className="font-bold text-[#2C251F] border-b border-gray-100 pb-1.5 flex items-center gap-1.5">
                    <Info className="w-4 h-4 text-indigo-500" />
                    <span>💡 사업성 진단 및 점수 산정 기준</span>
                  </h6>
                  <div className="space-y-2 text-[10px] leading-relaxed">
                    <p>
                      <strong>1. 내부수익률 (IRR 수익성):</strong> 사업 20년 현금흐름의 연평균 복리수익률입니다. <span className="font-semibold text-[#5F7161]">15% 이상(S등급: 우수)</span>, <span className="font-semibold text-amber-650">8~15%(A/B등급: 양호)</span>, <span className="font-semibold text-rose-600">8% 미만(C이하: 미흡)</span>으로 자본 비용 극복 여부를 판정합니다.
                    </p>
                    <p>
                      <strong>2. 손익분기 분양률 (BEP 안전성):</strong> 총 원가를 회수하기 위해 필수로 완료해야 하는 누적 분양 매출률입니다. <span className="font-semibold text-[#5F7161]">60% 이하(안전)</span>, <span className="font-semibold text-rose-600">80% 초과(위험)</span>로 평가합니다.
                    </p>
                    <p>
                      <strong>3. BEP 1~2년 회수 vs 안전성 점수 괴리:</strong>
                      <br />
                      현금흐름 시뮬레이션 상 2~3년차 만에 BEP(누적현금 +전환)를 달성하더라도, <strong>손익분기 분양률(원가율) 자체가 80%를 넘으면 안전성 점수는 낮게 나옵니다.</strong> 원금 회수 속도가 빠른 것(유동성/회전율 우수)과, 최종 미분양 시 사업이 도산할 위험(마진폭 안전성)은 별개의 리스크 지표이기 때문입니다.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-64 border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center text-center p-6 bg-gray-50/50">
                <HelpCircle className="w-10 h-10 text-gray-300 mb-2 animate-pulse" />
                <p className="text-sm font-semibold text-gray-600">설계 공간 정보 미입력</p>
                <p className="text-xs text-gray-400 mt-1 max-w-sm leading-relaxed">
                  좌측 기획 리스트에서 세대수 혹은 면적(평)을 1단위 이상 기입해 주십시오. 즉시 실거래 기반 AI 시세에 연동되어 개발 사업의 총 비용 및 투자 마진율 분석이 실행됩니다.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
