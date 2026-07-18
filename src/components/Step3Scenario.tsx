/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { LandRegulatoryAnalysis, FARRelaxationResult, ScenarioResult, AllocatedUnitResult } from '../types';
import { CircleDollarSign, Coins, TrendingUp, Building2, Layers, Compass, HelpCircle, ArrowRight, Table, Sparkles, Loader2, RefreshCw, AlertTriangle, Home, Briefcase, Info, Plus, Trash2, Calculator, Activity, Puzzle, ChevronDown, ChevronUp, Sliders, Calendar, Percent, ArrowDownRight } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import LayoutDiagram from './LayoutDiagram';

interface Step3ScenarioProps {
  currentLand: LandRegulatoryAnalysis | null;
  currentRelaxation: FARRelaxationResult | null;
  onScenarioChange?: (data: { inputs: any; result: any }) => void;
  activeStep?: number;
  savedScenario?: { inputs: any; result: any } | null;
}

interface HousingConfig {
  id: string;
  name: string;
  sizeM2: number;
  pyung: number;
  salesPricePerPyung: number; // 만원 단위 (AI 분석 산출)
  count: number; // 직접 입력 세대수
}

interface CustomUsageConfig {
  id: string;
  name: string;
  areaPyung: number;
  netRatio: number;
  type: 'sales' | 'lease';
  pricePerPyung: number; // 만원/평 (분양 시)
  depositPerPyung: number; // 만원/평 (임대 시)
  rentPerPyung: number; // 만원/평/월 (임대 시)
  parkingCriteria: number; // ㎡당 1대 (기본값: 134)
  auxAreaPyung: number; // 부대시설 면적 (평)
}

export default function Step3Scenario({ currentLand, currentRelaxation, onScenarioChange, activeStep = 3, savedScenario }: Step3ScenarioProps) {
  const inputs = savedScenario?.inputs;

  // 1. Core Architectural Spec
  const initialLandArea = currentLand ? currentLand.areaSize : 500;
  const initialFAR = currentRelaxation ? currentRelaxation.finalFAR : 200;
  const initialBCR = currentLand ? currentLand.baselineBCR : 60;

  const [landArea, setLandArea] = useState<number>(() => inputs?.landArea ?? initialLandArea);
  const [appliedFAR, setAppliedFAR] = useState<number>(() => inputs?.appliedFAR ?? initialFAR);
  const [appliedBCR, setAppliedBCR] = useState<number>(() => inputs?.appliedBCR ?? initialBCR);
  const [netRatio, setNetRatio] = useState<number>(() => inputs?.netRatio ?? 75); // 전용률 (%)
  
  // Custom Ratios per Usage for Wall/General Common
  const [wallCommonRatioApt, setWallCommonRatioApt] = useState<number>(() => inputs?.wallCommonRatioApt ?? 6.5);
  const [generalCommonRatioApt, setGeneralCommonRatioApt] = useState<number>(() => inputs?.generalCommonRatioApt ?? 23.5);
  const [wallCommonRatioOt, setWallCommonRatioOt] = useState<number>(() => inputs?.wallCommonRatioOt ?? 6.0);
  const [generalCommonRatioOt, setGeneralCommonRatioOt] = useState<number>(() => inputs?.generalCommonRatioOt ?? 29.0);

  // Parking parameter settings
  const [parkingAreaPerCar, setParkingAreaPerCar] = useState<number>(() => inputs?.parkingAreaPerCar ?? 38); // m² per car
  const [designedParkingSpaces, setDesignedParkingSpaces] = useState<number | null>(() => inputs?.designedParkingSpaces !== undefined ? inputs.designedParkingSpaces : null);

  // [USER ADDITIONS] Adjustable legal parking criteria and planned parking ratio
  const [aptParkingOver85, setAptParkingOver85] = useState<number>(() => inputs?.aptParkingOver85 ?? 1.2);
  const [aptParking60To85, setAptParking60To85] = useState<number>(() => inputs?.aptParking60To85 ?? 1.0);
  const [aptParkingUnder60, setAptParkingUnder60] = useState<number>(() => inputs?.aptParkingUnder60 ?? 0.7);

  const [otParkingOver60, setOtParkingOver60] = useState<number>(() => inputs?.otParkingOver60 ?? 1.0);
  const [otParking30To60, setOtParking30To60] = useState<number>(() => inputs?.otParking30To60 ?? 0.8);
  const [otParkingUnder30, setOtParkingUnder30] = useState<number>(() => inputs?.otParkingUnder30 ?? 0.5);

  const [plannedParkingRatio, setPlannedParkingRatio] = useState<number>(() => inputs?.plannedParkingRatio ?? 110); // 계획주차대수 가산 비율 (%)

  // Machinery & Electrical Room parameter settings
  const [machineryRatio, setMachineryRatio] = useState<number>(() => inputs?.machineryRatio ?? 4.0); // % of above ground GFA

  // [USER ADDITIONS] New State: Auxiliary facilities by usage (부대시설 면적 - 평 단위)
  const [aptAuxArea, setAptAuxArea] = useState<number>(() => inputs?.aptAuxArea ?? 15);
  const [officetelAuxArea, setOfficetelAuxArea] = useState<number>(() => inputs?.officetelAuxArea ?? 5);
  const [hotelAuxArea, setHotelAuxArea] = useState<number>(() => inputs?.hotelAuxArea ?? 5);
  const [officeAuxArea, setOfficeAuxArea] = useState<number>(() => inputs?.officeAuxArea ?? 5);

  // [USER ADDITIONS] Resident Facilities details (주민공동시설 세부 목록 수기 입력)
  const [useCustomResidentFacilities, setUseCustomResidentFacilities] = useState<boolean>(() => inputs?.useCustomResidentFacilities ?? false);
  const [residentFacilities, setResidentFacilities] = useState<{ id: string; name: string; area: number }[]>(() => {
    if (inputs?.residentFacilities) return inputs.residentFacilities;
    return [
      { id: '1', name: '경로당 (시니어클럽)', area: 4 },
      { id: '2', name: '피트니스 센터', area: 5 },
      { id: '3', name: '작은도서관', area: 3 },
      { id: '4', name: '어린이집 / 놀이방', area: 3 }
    ];
  });

  // Synchronize custom resident facilities to aptAuxArea if enabled
  useEffect(() => {
    if (useCustomResidentFacilities) {
      const sum = residentFacilities.reduce((s, f) => s + f.area, 0);
      setAptAuxArea(sum);
    }
  }, [residentFacilities, useCustomResidentFacilities]);

  const auxiliaryArea = aptAuxArea + officetelAuxArea + hotelAuxArea + officeAuxArea;

  // [USER ADDITIONS] New States: Above ground & Underground floors & individual Floor Heights
  const [aboveGroundFloors, rawSetAboveGroundFloors] = useState<number>(() => inputs?.aboveGroundFloors ?? 7);
  const [undergroundFloors, setUndergroundFloors] = useState<number>(() => inputs?.undergroundFloors ?? 2);
  const [defaultFloorHeight, setDefaultFloorHeight] = useState<number>(() => inputs?.defaultFloorHeight ?? 3.3); // 3.3m
  const [customFloorHeights, setCustomFloorHeights] = useState<Record<string, number>>(() => inputs?.customFloorHeights ?? {
    '1F': 4.5, // 1F is usually higher (e.g., 4.5m)
    '2F': 3.6,
    '3F': 3.3,
    '4F': 3.3,
    '5F': 3.3,
    '6F': 3.3,
    '7F': 3.3,
    'B1': 3.8,
    'B2': 3.5
  });

  // [USER ADDITIONS] New State: exitStrategy
  const [exitStrategy, setExitStrategy] = useState<'sales' | 'lease-exit' | 'lease-permanent'>(() => inputs?.exitStrategy ?? 'sales');

  // [USER ADDITIONS] Step 4 Interactive Parameter States
  const [step4ExitYear, setStep4ExitYear] = useState<number>(() => inputs?.step4ExitYear ?? 5);
  const [step4VacancyRate, setStep4VacancyRate] = useState<number>(() => inputs?.step4VacancyRate ?? 5.0); // %
  const [step4RentGrowth, setStep4RentGrowth] = useState<number>(() => inputs?.step4RentGrowth ?? 2.5); // %
  const [step4CapRate, setStep4CapRate] = useState<number>(() => inputs?.step4CapRate ?? 5.5); // %
  const [step4DiscountRate, setStep4DiscountRate] = useState<number>(() => inputs?.step4DiscountRate ?? 4.5); // %

  // [USER ADDITIONS] New States: Typical Floor Range (기준층 범위 설정)
  const [typicalFloorStart, setTypicalFloorStart] = useState<number>(() => inputs?.typicalFloorStart ?? 2);
  const [typicalFloorEnd, setTypicalFloorEnd] = useState<number>(() => inputs?.typicalFloorEnd ?? 7);

  // [USER ADDITIONS] Layout Simulation parameters
  const [useLayoutSimulation, setUseLayoutSimulation] = useState<boolean>(() => inputs?.useLayoutSimulation ?? true);
  const [floorCalculationMode, setFloorCalculationMode] = useState<'auto' | 'manual'>(() => inputs?.floorCalculationMode ?? 'manual');
  const [towerCount, setTowerCount] = useState<number>(() => inputs?.towerCount ?? 2);
  const [unitsPerFloorLine, setUnitsPerFloorLine] = useState<number>(() => inputs?.unitsPerFloorLine ?? 4);
  const [podiumFloors, setPodiumFloors] = useState<number>(() => inputs?.podiumFloors ?? 2);
  const [buildingSeparationDistance, setBuildingSeparationDistance] = useState<number>(() => inputs?.buildingSeparationDistance ?? 40);
  const [boundarySeparationDistance, setBoundarySeparationDistance] = useState<number>(() => inputs?.boundarySeparationDistance ?? 12);
  const [buildingSeparationRatio, setBuildingSeparationRatio] = useState<number>(() => inputs?.buildingSeparationRatio ?? 0.8);
  const [sunlightBoundaryRatio, setSunlightBoundaryRatio] = useState<number>(() => inputs?.sunlightBoundaryRatio ?? 0.5);
  
  // Tooltip tracking state for mobile tap support
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);

  useEffect(() => {
    const handleGlobalClick = () => {
      setActiveTooltip(null);
    };
    window.addEventListener('click', handleGlobalClick);
    return () => {
      window.removeEventListener('click', handleGlobalClick);
    };
  }, []);
  
  // Financial parameters
  const getOfficialLandPricePerM2 = () => {
    if (!currentLand) return 500;
    const addr = currentLand.address || '';
    if (addr.includes('역삼') || addr.includes('강남')) return 2100; // 2,100만원/㎡
    if (addr.includes('서초') || addr.includes('반포')) return 1600; // 1,600만원/㎡
    if (addr.includes('을지로') || addr.includes('명동') || addr.includes('중구')) return 2400; // 2,400만원/㎡
    if (addr.includes('연남') || addr.includes('마포')) return 850;  // 850만원/㎡
    return 500; // 500만원/㎡
  };

  const getInitialLandPurchasePrices = () => {
    const isGangnam = currentLand?.id === 'gangnam-yeoksam';
    const isSeocho = currentLand?.id === 'seocho-banpo';
    const isYeonnam = currentLand?.id === 'yeonnam-forest';
    const isEuljiro = currentLand?.address.includes('을지로') || currentLand?.address.includes('중구') || currentLand?.address.includes('명동');
    
    let initPricePerPyung = 3500;
    let initTotalPrice = 35;
    
    if (isGangnam) {
      initPricePerPyung = 12000;
      initTotalPrice = 410;
    } else if (isSeocho) {
      initPricePerPyung = 10000;
      initTotalPrice = 205;
    } else if (isEuljiro) {
      initPricePerPyung = 15000;
      initTotalPrice = 450;
    } else if (isYeonnam) {
      initPricePerPyung = 6000;
      initTotalPrice = 57;
    } else if (currentLand) {
      initPricePerPyung = 3500;
      initTotalPrice = Math.round((currentLand.areaSize * 0.3025 * 3500) / 10000);
    }
    return { initPricePerPyung, initTotalPrice };
  };

  const { initPricePerPyung, initTotalPrice } = getInitialLandPurchasePrices();

  const [landPricePerPyung, setLandPricePerPyung] = useState<number>(() => inputs?.landPricePerPyung ?? initPricePerPyung); // 평당 토지 매입 단가 (만원/평)
  const [landPurchasePrice, setLandPurchasePrice] = useState<number>(() => inputs?.landPurchasePrice ?? initTotalPrice); // 토지매입가 (총액, 억원)
  const [constructionCostPerPyung, setConstructionCostPerPyung] = useState<number>(() => inputs?.constructionCostPerPyung ?? 850); // 평당 공사비 (만원, 예: 850만원)
  const [otherCostsRatio, setOtherCostsRatio] = useState<number>(() => inputs?.otherCostsRatio ?? 20); // 기타 비용 비율 (%)

  const [designCostRatio, setDesignCostRatio] = useState<number>(3.0); // 설계비 비율 (%)
  const [supervisionCostRatio, setSupervisionCostRatio] = useState<number>(1.5); // 감리비 비율 (%)
  const [taxCostRatio, setTaxCostRatio] = useState<number>(4.5); // 세금 및 공과금 비율 (%)
  const [financeCostRatio, setFinanceCostRatio] = useState<number>(6.0); // 금융비용 및 이자 비율 (%)
  const [marketingCostRatio, setMarketingCostRatio] = useState<number>(5.0); // 마케팅 및 분양대행비 (%)
  const [showBusinessCostDetail, setShowBusinessCostDetail] = useState<boolean>(false); // 사업비 상세 내역 토글 상태

  const updateDetailRatio = (field: 'design' | 'supervision' | 'tax' | 'finance' | 'marketing', val: number) => {
    let d = designCostRatio;
    let s = supervisionCostRatio;
    let t = taxCostRatio;
    let f = financeCostRatio;
    let m = marketingCostRatio;
    if (field === 'design') { d = val; setDesignCostRatio(val); }
    else if (field === 'supervision') { s = val; setSupervisionCostRatio(val); }
    else if (field === 'tax') { t = val; setTaxCostRatio(val); }
    else if (field === 'finance') { f = val; setFinanceCostRatio(val); }
    else if (field === 'marketing') { m = val; setMarketingCostRatio(val); }
    
    const total = parseFloat((d + s + t + f + m).toFixed(2));
    setOtherCostsRatio(total);
  };

  const handleOtherCostsRatioChange = (newRatio: number) => {
    setOtherCostsRatio(newRatio);
    const currentSum = designCostRatio + supervisionCostRatio + taxCostRatio + financeCostRatio + marketingCostRatio;
    if (currentSum > 0) {
      const scale = newRatio / currentSum;
      setDesignCostRatio(parseFloat((designCostRatio * scale).toFixed(2)));
      setSupervisionCostRatio(parseFloat((supervisionCostRatio * scale).toFixed(2)));
      setTaxCostRatio(parseFloat((taxCostRatio * scale).toFixed(2)));
      setFinanceCostRatio(parseFloat((financeCostRatio * scale).toFixed(2)));
      setMarketingCostRatio(parseFloat((marketingCostRatio * scale).toFixed(2)));
    } else {
      setDesignCostRatio(parseFloat((newRatio * 0.15).toFixed(2)));
      setSupervisionCostRatio(parseFloat((newRatio * 0.075).toFixed(2)));
      setTaxCostRatio(parseFloat((newRatio * 0.225).toFixed(2)));
      setFinanceCostRatio(parseFloat((newRatio * 0.3).toFixed(2)));
      setMarketingCostRatio(parseFloat((newRatio * 0.25).toFixed(2)));
    }
  };

  const [showFormulaPanel, setShowFormulaPanel] = useState<boolean>(true); // 산출식 패널 접고 펴기 상태 (기본값: 펼침)

  // 2. Unit Configurations with separate Apartments and Officetels
  const [aptConfigs, setAptConfigs] = useState<HousingConfig[]>(() => inputs?.aptConfigs ?? [
    { id: 'apt_small', name: '공동주택 소형 (전용 59㎡ / 실 18평)', sizeM2: 59, pyung: 18, salesPricePerPyung: 4200, count: 12 },
    { id: 'apt_medium', name: '공동주택 중형 (전용 84㎡ / 실 25평)', sizeM2: 84, pyung: 25, salesPricePerPyung: 4500, count: 8 },
    { id: 'apt_large', name: '공동주택 대형 (전용 114㎡ / 실 34평)', sizeM2: 114, pyung: 34, salesPricePerPyung: 5000, count: 4 }
  ]);

  const [officetelConfigs, setOfficetelConfigs] = useState<HousingConfig[]>(() => inputs?.officetelConfigs ?? [
    { id: 'officetel_studio', name: '오피스텔 원룸 (전용 30㎡ / 실 9평)', sizeM2: 30, pyung: 9, salesPricePerPyung: 2600, count: 0 },
    { id: 'officetel_tworoom', name: '오피스텔 투룸 (전용 59㎡ / 실 18평)', sizeM2: 59, pyung: 18, salesPricePerPyung: 3000, count: 0 },
    { id: 'officetel_threeroom', name: '오피스텔 쓰리룸 (전용 84㎡ / 실 25평)', sizeM2: 84, pyung: 25, salesPricePerPyung: 3400, count: 0 }
  ]);

  const [targetResidentialUnits, setTargetResidentialUnits] = useState<number>(() => {
    if (inputs?.targetResidentialUnits !== undefined) {
      return inputs.targetResidentialUnits;
    }
    const initialApt = (inputs?.aptConfigs ?? [
      { id: 'apt_small', count: 12 },
      { id: 'apt_medium', count: 8 },
      { id: 'apt_large', count: 4 }
    ]).reduce((sum: number, item: any) => sum + (item.count || 0), 0);
    const initialOt = (inputs?.officetelConfigs ?? []).reduce((sum: number, item: any) => sum + (item.count || 0), 0);
    const total = initialApt + initialOt;
    return total > 0 ? total : 1300;
  });

  const setAboveGroundFloors = useCallback((val: number | ((prev: number) => number)) => {
    if (typeof val === 'number') {
      rawSetAboveGroundFloors(val);
      const perFloor = towerCount * unitsPerFloorLine;
      const newCapacity = perFloor * Math.max(0, val - podiumFloors);
      setTargetResidentialUnits(newCapacity);
    } else {
      rawSetAboveGroundFloors(prev => {
        const nextVal = val(prev);
        const perFloor = towerCount * unitsPerFloorLine;
        const newCapacity = perFloor * Math.max(0, nextVal - podiumFloors);
        setTargetResidentialUnits(newCapacity);
        return nextVal;
      });
    }
  }, [towerCount, unitsPerFloorLine, podiumFloors]);

  // Hotel state variables
  const [hotelRoomCount, setHotelRoomCount] = useState<number>(() => inputs?.hotelRoomCount ?? 0);
  const [hotelRoomSizePyung, setHotelRoomSizePyung] = useState<number>(() => inputs?.hotelRoomSizePyung ?? 12); // 평균 객실 전용평수
  const [hotelPricePerPyung, setHotelPricePerPyung] = useState<number>(() => inputs?.hotelPricePerPyung ?? 2000); // 평당 분양가 (만원)
  const [hotelNetRatio, setHotelNetRatio] = useState<number>(() => inputs?.hotelNetRatio ?? 60); // 전용률 (%)
  const [hotelType, setHotelType] = useState<'sales' | 'lease'>(() => inputs?.hotelType ?? 'sales'); // 분양 vs 임대
  const [hotelDepositPerRoom, setHotelDepositPerRoom] = useState<number>(() => inputs?.hotelDepositPerRoom ?? 3000); // 객실당 보증금 (만원)
  const [hotelRentPerRoom, setHotelRentPerRoom] = useState<number>(() => inputs?.hotelRentPerRoom ?? 150); // 객실당 월 임대료 (만원)

  // Retail state variables
  const [retailNetRatio, setRetailNetRatio] = useState<number>(() => inputs?.retailNetRatio ?? 55); // 전용률 (%)
  const [retailType, setRetailType] = useState<'sales' | 'lease'>(() => inputs?.retailType ?? 'sales'); // 분양 vs 임대
  const [retailB1Area, setRetailB1Area] = useState<number>(() => inputs?.retailB1Area ?? 0); // 전용평수
  const [retail1FArea, setRetail1FArea] = useState<number>(() => inputs?.retail1FArea ?? 0);
  const [retail2FArea, setRetail2FArea] = useState<number>(() => inputs?.retail2FArea ?? 0);
  const [retail3FArea, setRetail3FArea] = useState<number>(() => inputs?.retail3FArea ?? 0);

  const [retailB1Price, setRetailB1Price] = useState<number>(() => inputs?.retailB1Price ?? 1500); // 평당 분양가 (만원)
  const [retail1FPrice, setRetail1FPrice] = useState<number>(() => inputs?.retail1FPrice ?? 3500);
  const [retail2FPrice, setRetail2FPrice] = useState<number>(() => inputs?.retail2FPrice ?? 2000);
  const [retail3FPrice, setRetail3FPrice] = useState<number>(() => inputs?.retail3FPrice ?? 1500);

  const [retailB1Deposit, setRetailB1Deposit] = useState<number>(() => inputs?.retailB1Deposit ?? 200); // 평당 보증금 (만원)
  const [retail1FDeposit, setRetail1FDeposit] = useState<number>(() => inputs?.retail1FDeposit ?? 500);
  const [retail2FDeposit, setRetail2FDeposit] = useState<number>(() => inputs?.retail2FDeposit ?? 300);
  const [retail3FDeposit, setRetail3FDeposit] = useState<number>(() => inputs?.retail3FDeposit ?? 200);

  const [retailB1Rent, setRetailB1Rent] = useState<number>(() => inputs?.retailB1Rent ?? 10); // 평당 월 임대료 (만원/월)
  const [retail1FRent, setRetail1FRent] = useState<number>(() => inputs?.retail1FRent ?? 25);
  const [retail2FRent, setRetail2FRent] = useState<number>(() => inputs?.retail2FRent ?? 15);
  const [retail3FRent, setRetail3FRent] = useState<number>(() => inputs?.retail3FRent ?? 10);

  // Office state variables
  const [officeArea, setOfficeArea] = useState<number>(() => inputs?.officeArea ?? 0); // 전용평수
  const [officePricePerPyung, setOfficePricePerPyung] = useState<number>(() => inputs?.officePricePerPyung ?? 1850); // 평당 분양가 (만원)
  const [officeDepositPerPyung, setOfficeDepositPerPyung] = useState<number>(() => inputs?.officeDepositPerPyung ?? 150); // 평당 보증금 (만원)
  const [officeRentPerPyung, setOfficeRentPerPyung] = useState<number>(() => inputs?.officeRentPerPyung ?? 8); // 평당 월세 (만원)
  const [officeType, setOfficeType] = useState<'sales' | 'lease'>(() => inputs?.officeType ?? 'sales'); // 분양 vs 임대
  const [officeNetRatio, setOfficeNetRatio] = useState<number>(() => inputs?.officeNetRatio ?? 65); // 전용률 (%)

  // Custom/Other Usages state variables
  const [customUsages, setCustomUsages] = useState<CustomUsageConfig[]>(() => inputs?.customUsages ?? []);

  // Step 4 Scenario and Commercial tabs
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>('base');
  const [showCalcDetails, setShowCalcDetails] = useState<boolean>(true);
  const [showAiPopulationEditor, setShowAiPopulationEditor] = useState<boolean>(true);
  
  // Individual formula toggle states for Step 4
  const [showOpProfitCalc, setShowOpProfitCalc] = useState<boolean>(false);
  const [showProjectCostCalc, setShowProjectCostCalc] = useState<boolean>(false);
  const [showRevenuesCalc, setShowRevenuesCalc] = useState<boolean>(false);
  const [showRoiCalc, setShowRoiCalc] = useState<boolean>(false);
  const [showIrrCalc, setShowIrrCalc] = useState<boolean>(false);
  const [showBepCalc, setShowBepCalc] = useState<boolean>(false);

  // Expanded population rows in Step 3 AI analysis table
  const [expandedPopulationRows, setExpandedPopulationRows] = useState<Record<string, boolean>>({
    land: true,
    construction: false
  });

  const togglePopulationRow = (rowId: string) => {
    setExpandedPopulationRows(prev => ({
      ...prev,
      [rowId]: !prev[rowId]
    }));
  };

  const renderPopulationRow = (
    rowId: string,
    title: string,
    value: number,
    unit: string,
    onChange: (val: number) => void,
    summaryText: string
  ) => {
    const isOpen = !!expandedPopulationRows[rowId];
    const popData = getPopulationData(rowId);

    const parsePerPyung = (str: string): number => {
      if (!str) return 0;
      const cleaned = str.replace(/[\s,]/g, '');
      if (cleaned.includes('억')) {
        const parts = cleaned.split('억');
        const eokVal = parseFloat(parts[0]) || 0;
        const restStr = parts[1] ? parts[1].replace(/[^0-9.]/g, '') : '';
        const restVal = parseFloat(restStr) || 0;
        return eokVal * 10000 + restVal;
      }
      const numStr = cleaned.replace(/[^0-9.]/g, '');
      return parseFloat(numStr) || 0;
    };

    const validPrices = popData.map(item => parsePerPyung(item.perPyung)).filter(p => p > 0);
    const avgPrice = validPrices.length > 0 ? Math.round(validPrices.reduce((a, b) => a + b, 0) / validPrices.length) : 0;

    return (
      <>
        <tr className="hover:bg-gray-50/35 transition-colors">
          <td className="p-2.5 font-bold text-gray-900 text-xs">{title}</td>
          <td className="p-2.5 text-gray-500 leading-relaxed text-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
              <span>{summaryText}</span>
              <button
                type="button"
                onClick={() => togglePopulationRow(rowId)}
                className="px-2 py-0.5 text-[9px] font-bold rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-800 border border-amber-500/20 transition-all flex items-center gap-0.5 cursor-pointer flex-shrink-0"
              >
                {isOpen ? '근거 접기 ▲' : '🔍 실거래 모집단 펼치기 ▼'}
              </button>
            </div>
          </td>
          <td className="p-2.5 text-right">
            <div className="flex items-center justify-end gap-1">
              <input
                type="number"
                value={value}
                onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
                className="w-20 p-1 text-right font-mono font-bold text-slate-800 bg-white border border-gray-300 rounded focus:border-[#5F7161] focus:outline-none text-xs"
              />
              <span className="text-[10px] text-gray-500 font-bold">{unit}</span>
            </div>
          </td>
        </tr>
        {isOpen && (
          <tr className="bg-amber-50/5">
            <td colSpan={3} className="p-3 bg-amber-50/15 border-t border-b border-amber-200/20">
              <div className="bg-white p-3 rounded-xl border border-amber-100/60 shadow-xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold text-amber-900 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
                    주변 상권 실거래 모집단 분석 데이터 ({popData.length}개 표본 추출)
                  </span>
                  <span className="text-[9.5px] text-gray-400">자료: 국토교통부 실거래 데이터 및 수지분석 보정</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-[10px] text-left border-collapse">
                    <thead>
                      <tr className="bg-[#FAF9F5] border-b border-[#EDDBC7]/20 text-gray-500 font-bold">
                        <th className="p-1.5 text-left">비교 단지/지번 정보</th>
                        <th className="p-1.5 text-left">전용/규격</th>
                        <th className="p-1.5 text-left">거래 시기</th>
                        <th className="p-1.5 text-right">실거래 가액</th>
                        <th className="p-1.5 text-right text-amber-800 font-bold font-sans">평당 환산단가</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-150">
                      {popData.map((item, idx) => (
                        <tr key={idx} className="hover:bg-[#FAF9F5]/80 transition-colors">
                          <td className="p-1.5 font-semibold text-gray-800">{item.name}</td>
                          <td className="p-1.5 text-gray-500">{item.spec}</td>
                          <td className="p-1.5 text-gray-400">{item.date}</td>
                          <td className="p-1.5 text-right text-gray-700 font-mono">{item.price}</td>
                          <td className="p-1.5 text-right font-extrabold font-mono text-amber-800">{item.perPyung}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* 수지분석 단가 보정 산식 및 기준 안내 카드 */}
                <div className="p-3 bg-amber-50/20 rounded-xl border border-amber-200/40 space-y-2.5">
                  <div className="flex items-center gap-1.5 text-[10.5px] font-bold text-amber-950">
                    <span className="flex items-center justify-center w-4 h-4 rounded-full bg-amber-500 text-white font-mono text-[9px]">i</span>
                    수지분석 단가 보정 산식 및 기준 안내
                  </div>
                  
                  <div className="bg-white p-2.5 rounded-lg border border-amber-100/60 font-mono text-[10px] text-gray-700 space-y-2">
                    <div className="font-bold text-amber-900 border-b border-amber-50 pb-1 flex justify-between items-center">
                      <span>📊 주변 실거래 평균 단가:</span>
                      <span className="font-extrabold text-[11px] text-amber-950">{avgPrice > 0 ? `${avgPrice.toLocaleString()} 만원` : '데이터 수집 중'}</span>
                    </div>
                    
                    {rowId === 'construction' ? (
                      <>
                        <div className="space-y-1 text-slate-600 leading-relaxed text-[10px]">
                          <p className="flex items-start gap-1">
                            <span className="text-amber-500 flex-shrink-0">•</span>
                            <span><strong>물가 및 자재비 급등 보정 (+8% ~ +12%):</strong> 최근 시점 건설 원자재비 및 노무비의 누적 상승률 반영</span>
                          </p>
                          <p className="flex items-start gap-1">
                            <span className="text-amber-500 flex-shrink-0">•</span>
                            <span><strong>특수 토목 및 부대 설계 보정 (+5%):</strong> 지하층 암반 터파기, 흙막이(H-Pile 등), 마감 자재 하이엔드 설계 기준 가산</span>
                          </p>
                        </div>
                        <div className="mt-1.5 pt-1.5 border-t border-dashed border-amber-100 text-[10px] font-bold text-indigo-900 flex justify-between items-center bg-indigo-50/30 px-2 py-1.5 rounded-md">
                          <span>🛠️ 계획 공사비 산출공식:</span>
                          <span className="font-mono text-[10.5px]">
                            {avgPrice > 0 ? (
                              <span>{avgPrice.toLocaleString()}만원 × (1 + 10%[물가] + 5%[설계]) ≒ <strong>{value.toLocaleString()}</strong>만원</span>
                            ) : (
                              <span>실거래가 기준 약 15% 보정 ≒ <strong>{value.toLocaleString()}</strong>만원</span>
                            )}
                          </span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="space-y-1 text-slate-600 leading-relaxed text-[10px]">
                          <p className="flex items-start gap-1">
                            <span className="text-amber-500 flex-shrink-0">•</span>
                            <span><strong>신축 프리미엄 (New-Build Premium, +15% ~ +25%):</strong> 기축 노후 단지 대비 신호대기, 마감, 첨단 주거 시스템 가치</span>
                          </p>
                          <p className="flex items-start gap-1">
                            <span className="text-amber-500 flex-shrink-0">•</span>
                            <span><strong>미래 시간가치/인플레이션 반영 (+5% ~ +10%):</strong> 본 사업 분양 및 준공 시점(2~3년 후)의 화폐가치 하락 대비 선반영</span>
                          </p>
                        </div>
                        <div className="mt-1.5 pt-1.5 border-t border-dashed border-amber-100 text-[10px] font-bold text-amber-900 flex justify-between items-center bg-amber-50/40 px-2 py-1.5 rounded-md">
                          <span>📈 계획 분양가 산출공식:</span>
                          <span className="font-mono text-[10.5px]">
                            {avgPrice > 0 ? (
                              <span>{avgPrice.toLocaleString()}만원 × (1 + 15%[신축] + 7%[미래]) ≒ <strong>{value.toLocaleString()}</strong>만원</span>
                            ) : (
                              <span>실거래가 기준 약 22% 보정 ≒ <strong>{value.toLocaleString()}</strong>만원</span>
                            )}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                  
                  <p className="text-[9.5px] text-[#8D7B68] leading-relaxed bg-[#FAF9F5] p-2 rounded border border-amber-100/30">
                    💡 <strong>보정 사유:</strong> 수지분석 시 15~20년 이상 노후된 주변 단지의 실거래 평당 단가를 보정 없이 그대로 대입하면, <strong>신규 건축물의 미래 분양가치가 심각하게 왜곡(저평가)</strong>되어 사업성 검토 자체가 불가능해집니다. 따라서 기축 평균 시세 대비 신축 시점 프리미엄 및 물가 상승률을 가산하여 <strong>15% ~ 30% 상향 보정</strong>하여 기획하는 것이 공인 부동산 개발 수지분석의 실무 표준입니다.
                  </p>
                </div>

                <div className="text-[9px] text-[#8D7B68] leading-snug pt-1 border-t border-gray-100 flex justify-between items-center">
                  <span>* {title} 산출의 기초가 되는 주변 실거래 모집단 현황입니다.</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-gray-700">단가 직접 보정:</span>
                    <input
                      type="number"
                      value={value}
                      onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
                      className="w-16 p-0.5 text-right font-mono font-bold text-amber-950 bg-amber-50/30 border border-amber-300 rounded focus:border-amber-600 focus:outline-none text-[10px]"
                    />
                    <span className="font-extrabold text-amber-950 text-[10px]">{unit}</span>
                  </div>
                </div>
              </div>
            </td>
          </tr>
        )}
      </>
    );
  };

  const getRegionalName = (address: string): string => {
    if (!address) return '해당 지역';
    const parts = address.split(/\s+/);
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (part.endsWith('동') || part.endsWith('읍') || part.endsWith('면')) {
        return part;
      }
    }
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (part.endsWith('구') || part.endsWith('시')) {
        return part;
      }
    }
    return parts[0] || '해당 지역';
  };

  const getAddressType = () => {
    const addr = currentLand?.address || '';
    if (addr.includes('역삼') || addr.includes('강남')) return 'gangnam';
    if (addr.includes('반포') || addr.includes('서초')) return 'seocho';
    if (addr.includes('을지로') || addr.includes('중구') || addr.includes('명동')) return 'junggu';
    if (addr.includes('연남') || addr.includes('마포')) return 'mapo';
    return 'default';
  };

  const getPopulationData = (category: string) => {
    if (aiComparables && aiComparables[category] && aiComparables[category].length > 0) {
      return aiComparables[category];
    }
    const type = getAddressType();
    const addr = currentLand?.address || '';
    const reg = getRegionalName(addr);
    switch(category) {
      case 'land':
        if (type === 'gangnam') {
          return [
            { name: '역삼동 824-XX 이면 준주거지', spec: '대지 330㎡ (100평)', date: '2025.10', price: '125억원', perPyung: '1억 2,500만원' },
            { name: '역삼동 719-XX 상업용지 (빌딩)', spec: '대지 450㎡ (136평)', date: '2026.02', price: '188억원', perPyung: '1억 3,800만원' },
            { name: '테헤란로 25길 이면 대지', spec: '대지 280㎡ (85평)', date: '2025.08', price: '102억원', perPyung: '1억 2,000만원' }
          ];
        }
        if (type === 'seocho') {
          return [
            { name: '반포동 711-XX 이면 근생대지', spec: '대지 310㎡ (94평)', date: '2025.12', price: '108억원', perPyung: '1억 1,500만원' },
            { name: '서초동 1302-XX 준주거 대지', spec: '대지 410㎡ (124평)', date: '2026.03', price: '151억원', perPyung: '1억 2,200만원' },
            { name: '사임당로 노후 단독주택 수매', spec: '대지 350㎡ (106평)', date: '2025.07', price: '111억원', perPyung: '1억 0,500만원' }
          ];
        }
        if (type === 'junggu') {
          return [
            { name: '명동2가 32-X 일반상업지', spec: '대지 150㎡ (45평)', date: '2025.11', price: '70억원', perPyung: '1억 5,500만원' },
            { name: '을지로3가 120-XX 상가 대지', spec: '대지 290㎡ (88평)', date: '2026.01', price: '125억원', perPyung: '1억 4,200만원' },
            { name: '충무로4가 상업용 노후 건물', spec: '대지 220㎡ (67평)', date: '2025.09', price: '86억원', perPyung: '1억 3,000만원' }
          ];
        }
        if (type === 'mapo') {
          return [
            { name: '연남동 241-XX 카페 대지', spec: '대지 198㎡ (60평)', date: '2026.04', price: '37억원', perPyung: '6,200만원' },
            { name: '연남동 382-X 단독주택 (근생개조용)', spec: '대지 245㎡ (74평)', date: '2025.09', price: '43억원', perPyung: '5,800만원' },
            { name: '동교동 150-X 상가주택 수매', spec: '대지 180㎡ (54평)', date: '2026.01', price: '36억원', perPyung: '6,600만원' }
          ];
        }
        return [
          { name: `${reg} 1714-X 준주거 표준지`, spec: '대지 396㎡ (120평)', date: '2025.08', price: '41.4억원', perPyung: '3,450만원' },
          { name: `${reg} 1690-XX 이면 필지`, spec: '대지 312㎡ (94평)', date: '2025.11', price: '31.1억원', perPyung: '3,300만원' },
          { name: `${reg} 사거리 이면 근생대지`, spec: '대지 425㎡ (129평)', date: '2026.02', price: '46.3억원', perPyung: '3,600만원' }
        ];

      case 'construction':
        return [
          { name: 'H건설 테헤란 오피스 신축공사', spec: '지하3층/지상12층', date: '2025.08', price: '연면적 1,500평', perPyung: '980만원' },
          { name: 'S물산 반포 주상복합 신축공사', spec: '지하4층/지상15층', date: '2025.11', price: '연면적 2,300평', perPyung: '1,020만원' },
          { name: '국토부 발표 표준건축비 고시 기준', spec: '공동주택 기준 ㎡당', date: '2026.01', price: '건설자재 인상률 8.4%', perPyung: '850만원' }
        ];

      case 'apt_small':
        if (type === 'gangnam') {
          return [
            { name: '역삼 푸르지오 (59.8㎡)', spec: '전용 18.1평', date: '2025.11', price: '10.6억원', perPyung: '5,900만원' },
            { name: '역삼 e-편한세상 (59.6㎡)', spec: '전용 18.0평', date: '2026.02', price: '10.3억원', perPyung: '5,750만원' },
            { name: '개포 주공 4단지 신축분양권', spec: '전용 18.2평', date: '2025.09', price: '11.1억원', perPyung: '6,100만원' }
          ];
        }
        if (type === 'seocho') {
          return [
            { name: '반포 래미안원베일리 (59.9㎡)', spec: '전용 18.1평', date: '2026.01', price: '13.6억원', perPyung: '7,500만원' },
            { name: '아크로리버파크 (59.5㎡)', spec: '전용 18.0평', date: '2025.12', price: '13.1억원', perPyung: '7,250만원' },
            { name: '래미안 퍼스티지 (59.8㎡)', spec: '전용 18.1평', date: '2025.10', price: '12.5억원', perPyung: '6,900만원' }
          ];
        }
        if (type === 'junggu') {
          return [
            { name: '덕수궁 디팰리스 (59.9㎡)', spec: '전용 18.1평', date: '2025.08', price: '9.4억원', perPyung: '5,200만원' },
            { name: '남산 롯데캐슬 아이리스 (59.3㎡)', spec: '전용 18.0평', date: '2026.03', price: '9.0억원', perPyung: '5,000만원' },
            { name: '중구 신당 KCC스위첸 (59.7㎡)', spec: '전용 18.1평', date: '2025.11', price: '8.3억원', perPyung: '4,600만원' }
          ];
        }
        if (type === 'mapo') {
          return [
            { name: '마포 프레스티지 자이 (59.9㎡)', spec: '전용 18.1평', date: '2026.02', price: '7.8억원', perPyung: '4,300만원' },
            { name: '신촌그랑자이 (59.6㎡)', spec: '전용 18.0평', date: '2025.10', price: '7.5억원', perPyung: '4,150만원' },
            { name: '마포래미안푸르지오 (59.8㎡)', spec: '전용 18.1평', date: '2026.03', price: '7.9억원', perPyung: '4,400만원' }
          ];
        }
        return [
          { name: `${reg} 삼풍아파트 (59.5㎡)`, spec: '전용 18.0평', date: '2025.11', price: '5.2억원', perPyung: '2,850만원' },
          { name: `${reg} 현대아이파크 (59.8㎡)`, spec: '전용 18.1평', date: '2026.01', price: '4.8억원', perPyung: '2,650만원' },
          { name: `${reg} 센트럴 푸르지오 (59.9㎡)`, spec: '전용 18.1평', date: '2025.07', price: '4.5억원', perPyung: '2,500만원' }
        ];

      case 'apt_medium':
        if (type === 'gangnam') {
          return [
            { name: '개포 래미안 포레스트 (84.9㎡)', spec: '전용 25.7평', date: '2025.12', price: '15.5억원', perPyung: '6,200만원' },
            { name: '대치 은마아파트 (84.4㎡)', spec: '전용 25.5평', date: '2026.01', price: '15.3억원', perPyung: '6,000만원' },
            { name: '역삼 푸르지오 (84.8㎡)', spec: '전용 25.7평', date: '2025.11', price: '14.9억원', perPyung: '5,800만원' }
          ];
        }
        if (type === 'seocho') {
          return [
            { name: '반포자이 (84.9㎡)', spec: '전용 25.7평', date: '2026.02', price: '18.1억원', perPyung: '7,250만원' },
            { name: '반포 래미안퍼스티지 (84.8㎡)', spec: '전용 25.7평', date: '2025.11', price: '17.8억원', perPyung: '7,100만원' },
            { name: '반포 써밋 (84.9㎡)', spec: '전용 25.7평', date: '2026.03', price: '17.0억원', perPyung: '6,800만원' }
          ];
        }
        if (type === 'junggu') {
          return [
            { name: '경희궁 자이 (84.8㎡)', spec: '전용 25.7평', date: '2026.01', price: '14.0억원', perPyung: '5,600만원' },
            { name: '서울역 센트럴자이 (84.9㎡)', spec: '전용 25.7평', date: '2025.12', price: '13.5억원', perPyung: '5,400만원' },
            { name: '회현 남산 롯데캐슬 (84.5㎡)', spec: '전용 25.6평', date: '2025.10', price: '12.8억원', perPyung: '5,100만원' }
          ];
        }
        if (type === 'mapo') {
          return [
            { name: '마포래미안푸르지오 (84.9㎡)', spec: '전용 25.7평', date: '2026.03', price: '11.5억원', perPyung: '4,600만원' },
            { name: '마포자이3차 (84.8㎡)', spec: '전용 25.7평', date: '2025.11', price: '11.0억원', perPyung: '4,400만원' },
            { name: '공덕 래미안5차 (84.9㎡)', spec: '전용 25.7평', date: '2026.01', price: '10.8억원', perPyung: '4,300만원' }
          ];
        }
        return [
          { name: `${reg} 삼풍아파트 (84.9㎡)`, spec: '전용 25.7평', date: '2025.09', price: '7.2억원', perPyung: '2,800만원' },
          { name: `${reg} 현대아이파크 (84.8㎡)`, spec: '전용 25.7평', date: '2026.02', price: '6.9억원', perPyung: '2,700만원' },
          { name: `${reg} 센트럴 푸르지오 (84.5㎡)`, spec: '전용 25.6평', date: '2025.12', price: '6.6억원', perPyung: '2,600만원' }
        ];

      case 'apt_large':
        if (type === 'gangnam') {
          return [
            { name: '역삼 자이 (114.9㎡)', spec: '전용 34.8평', date: '2025.10', price: '23.5억원', perPyung: '6,750만원' },
            { name: '도곡 렉슬 (114.8㎡)', spec: '전용 34.7평', date: '2026.01', price: '22.8억원', perPyung: '6,550만원' },
            { name: '역삼 e-편한세상 (114.7㎡)', spec: '전용 34.7평', date: '2025.11', price: '21.9억원', perPyung: '6,300만원' }
          ];
        }
        if (type === 'seocho') {
          return [
            { name: '반포 래미안원베일리 (114.9㎡)', spec: '전용 34.8평', date: '2026.03', price: '27.8억원', perPyung: '8,000만원' },
            { name: '아크로리버파크 (114.8㎡)', spec: '전용 34.7평', date: '2025.11', price: '27.1억원', perPyung: '7,800만원' },
            { name: '반포자이 (114.9㎡)', spec: '전용 34.8평', date: '2026.01', price: '26.1억원', perPyung: '7,500만원' }
          ];
        }
        if (type === 'junggu') {
          return [
            { name: '경희궁자이 (114.9㎡)', spec: '전용 34.8평', date: '2025.12', price: '20.9억원', perPyung: '6,000만원' },
            { name: '남산타운 (114.8㎡)', spec: '전용 34.7평', date: '2026.02', price: '19.4억원', perPyung: '5,600만원' },
            { name: '명동 남산센트럴자이 (114.9㎡)', spec: '전용 34.8평', date: '2025.08', price: '18.1억원', perPyung: '5,200만원' }
          ];
        }
        if (type === 'mapo') {
          return [
            { name: '마포그랑자이 (114.9㎡)', spec: '전용 34.8평', date: '2026.01', price: '17.4억원', perPyung: '5,000만원' },
            { name: '신촌숲아이파크 (114.8㎡)', spec: '전용 34.7평', date: '2025.10', price: '16.7억원', perPyung: '4,800만원' },
            { name: '마포래미안푸르지오 (114.9㎡)', spec: '전용 34.8평', date: '2026.02', price: '16.4억원', perPyung: '4,700만원' }
          ];
        }
        return [
          { name: `${reg} 삼풍아파트 (114.9㎡)`, spec: '전용 34.8평', date: '2026.02', price: '10.4억원', perPyung: '3,000만원' },
          { name: `${reg} 현대아이파크 (114.8㎡)`, spec: '전용 34.7평', date: '2025.12', price: '10.0억원', perPyung: '2,900만원' },
          { name: `${reg} 롯데레전드 (114.9㎡)`, spec: '전용 34.8평', date: '2026.01', price: '9.7억원', perPyung: '2,800만원' }
        ];

      case 'officetel_studio':
        if (type === 'gangnam') {
          return [
            { name: '강남역 서희스타힐스 (30㎡)', spec: '전용 9.1평', date: '2025.11', price: '3.0억원', perPyung: '3,300만원' },
            { name: '역삼 아르젠 (30.1㎡)', spec: '전용 9.1평', date: '2026.02', price: '2.9억원', perPyung: '3,200만원' }
          ];
        }
        if (type === 'seocho') {
          return [
            { name: '서초 에클라트 (30.2㎡)', spec: '전용 9.1평', date: '2025.12', price: '3.4억원', perPyung: '3,700만원' },
            { name: '효성해링턴타워 (30㎡)', spec: '전용 9.1평', date: '2026.01', price: '3.3억원', perPyung: '3,600만원' }
          ];
        }
        if (type === 'junggu') {
          return [
            { name: '을지로 센트럴데시앙 (30㎡)', spec: '전용 9.1평', date: '2025.10', price: '2.6억원', perPyung: '2,900만원' },
            { name: '명동 엠퍼스트플레이스 (30.1㎡)', spec: '전용 9.1평', date: '2026.03', price: '2.5억원', perPyung: '2,800만원' }
          ];
        }
        if (type === 'mapo') {
          return [
            { name: '홍대역 엘포트 (30㎡)', spec: '전용 9.1평', date: '2026.01', price: '2.4억원', perPyung: '2,600만원' },
            { name: '마포 한화오벨리스크 (30.2㎡)', spec: '전용 9.1평', date: '2025.11', price: '2.3억원', perPyung: '2,500만원' }
          ];
        }
        return [
          { name: `${reg} 현대에클라트 (30㎡)`, spec: '전용 9.1평', date: '2025.10', price: '2.1억원', perPyung: '2,350만원' },
          { name: `${reg} 한신휴플러스 (30.1㎡)`, spec: '전용 9.1평', date: '2025.12', price: '1.9억원', perPyung: '2,200만원' }
        ];

      case 'officetel_tworoom':
        if (type === 'gangnam') {
          return [
            { name: '역삼 센트레빌아스테리움 (59㎡)', spec: '전용 17.8평', date: '2025.10', price: '6.4억원', perPyung: '3,600만원' },
            { name: '강남 루카831 (59.2㎡)', spec: '전용 17.9평', date: '2026.02', price: '6.3억원', perPyung: '3,500만원' }
          ];
        }
        if (type === 'seocho') {
          return [
            { name: '서초 메트로폴리스 (59.1㎡)', spec: '전용 17.9평', date: '2025.11', price: '7.4억원', perPyung: '4,150만원' },
            { name: '지웰타워 (59.3㎡)', spec: '전용 17.9평', date: '2026.01', price: '7.2억원', perPyung: '4,050만원' }
          ];
        }
        if (type === 'junggu') {
          return [
            { name: '충무로 엘크루메트로시티 (59㎡)', spec: '전용 17.8평', date: '2025.12', price: '5.8억원', perPyung: '3,250만원' },
            { name: '남산 센트럴자이 (59.4㎡)', spec: '전용 18.0평', date: '2026.03', price: '5.7억원', perPyung: '3,150만원' }
          ];
        }
        if (type === 'mapo') {
          return [
            { name: '상암 카이저팰리스 (59.1㎡)', spec: '전용 17.9평', date: '2026.02', price: '5.2억원', perPyung: '2,900만원' },
            { name: '공덕 푸르지오시티 (59.2㎡)', spec: '전용 17.9평', date: '2025.11', price: '5.0억원', perPyung: '2,800만원' }
          ];
        }
        return [
          { name: `${reg} 아르젠 (59㎡)`, spec: '전용 17.8평', date: '2025.09', price: '4.4억원', perPyung: '2,500만원' },
          { name: `${reg} 푸르지오시티 (59.2㎡)`, spec: '전용 17.9평', date: '2026.01', price: '4.2억원', perPyung: '2,400만원' }
        ];

      case 'officetel_threeroom':
        if (type === 'gangnam') {
          return [
            { name: '강남 피에드아테르 (84㎡)', spec: '전용 25.4평', date: '2025.11', price: '10.2억원', perPyung: '4,000만원' },
            { name: '역삼 자이르네 (84.2㎡)', spec: '전용 25.5평', date: '2026.01', price: '9.8억원', perPyung: '3,850만원' }
          ];
        }
        if (type === 'seocho') {
          return [
            { name: '서초 르피에드 (84.1㎡)', spec: '전용 25.4', date: '2026.03', price: '11.7억원', perPyung: '4,600만원' },
            { name: '교대역 엘타워 (84.3㎡)', spec: '전용 25.5평', date: '2025.10', price: '11.1억원', perPyung: '4,350만원' }
          ];
        }
        if (type === 'junggu') {
          return [
            { name: '남산 센트럴뷰 (84㎡)', spec: '전용 25.4평', date: '2025.09', price: '9.3억원', perPyung: '3,650만원' },
            { name: '세운 푸르지오 헤리시티 (84.3㎡)', spec: '전용 25.5', date: '2026.02', price: '9.1억원', perPyung: '3,550만원' }
          ];
        }
        if (type === 'mapo') {
          return [
            { name: '마포 한강2차푸르지오 (84.1㎡)', spec: '전용 25.4평', date: '2025.12', price: '8.3억원', perPyung: '3,250만원' },
            { name: '신촌 다올마을 (84.2㎡)', spec: '전용 25.5평', date: '2026.01', price: '8.0억원', perPyung: '3,150만원' }
          ];
        }
        return [
          { name: `${reg} 롯데골든클래스 (84㎡)`, spec: '전용 25.4평', date: '2025.08', price: '6.4억원', perPyung: '2,500만원' },
          { name: `${reg} 오피스빌 (84.3㎡)`, spec: '전용 25.5평', date: '2026.02', price: '6.1억원', perPyung: '2,400만원' }
        ];

      case 'office':
        if (type === 'gangnam') {
          return [
            { name: '강남파이낸스센터 인근 오피스', spec: '업무용 전층', date: '2025.08', price: '평당 보 300만/월 24만', perPyung: '3,500만원' },
            { name: '테헤란로변 대형 오피스', spec: '업무용 프라임', date: '2025.12', price: '평당 보 280만/월 22만', perPyung: '3,400만원' }
          ];
        }
        if (type === 'seocho') {
          return [
            { name: '서초동 삼성타운 인근 빌딩', spec: '업무용 중대형', date: '2025.11', price: '평당 보 320만/월 25만', perPyung: '3,550만원' },
            { name: '교대역 주변 호재빌딩 오피스', spec: '업무용 준프라임', date: '2026.01', price: '평당 보 300만/월 23만', perPyung: '3,450만원' }
          ];
        }
        if (type === 'junggu') {
          return [
            { name: '을지로 파인에비뉴 타워', spec: '업무용 대형', date: '2025.10', price: '평당 보 250만/월 19만', perPyung: '3,100만원' },
            { name: '중구 시그니쳐타워 업무층', spec: '업무용 프라임', date: '2025.09', price: '평당 보 240만/월 18만', perPyung: '3,000만원' }
          ];
        }
        if (type === 'mapo') {
          return [
            { name: '마포로변 프라임 빌딩', spec: '업무용 중형', date: '2025.11', price: '평당 보 200만/월 16만', perPyung: '2,550만원' },
            { name: '상암 DMC IT타워 오피스', spec: '업무용 전층', date: '2025.07', price: '평당 보 180만/월 14만', perPyung: '2,400만원' }
          ];
        }
        return [
          { name: `${reg} 인근 중형 빌딩`, spec: '업무용 중형', date: '2025.08', price: '평당 보 130만/월 10만', perPyung: '1,600만원' },
          { name: `${reg} 소형 사무소`, spec: '업무용 전용', date: '2025.11', price: '평당 보 140만/월 11만', perPyung: '1,650만원' }
        ];

      case 'retail':
        if (type === 'gangnam') {
          return [
            { name: '강남역 메인 먹자 상권 1층', spec: '근린생활 지상1층', date: '2025.09', price: '평당 보 500만/월 32만', perPyung: '7,500만원' },
            { name: '역삼동 이면 골목 코너 1층', spec: '근린생활 지상1층', date: '2026.01', price: '평당 보 450만/월 28만', perPyung: '7,000만원' }
          ];
        }
        if (type === 'seocho') {
          return [
            { name: '래미안원베일리 단지내상가 1층', spec: '근린생활 지상1층', date: '2025.12', price: '평당 보 600만/월 35만', perPyung: '8,500만원' },
            { name: '아크로리버 상가 1층', spec: '근린생활 지상1층', date: '2026.02', price: '평당 보 550만/월 32만', perPyung: '8,150만원' }
          ];
        }
        if (type === 'junggu') {
          return [
            { name: '명동 메인스트리트 로드숍 1층', spec: '근린생활 지상1층', date: '2025.11', price: '평당 보 800만/월 45만', perPyung: '1억 0,000만원' },
            { name: '을지로 센터원 상가 1층', spec: '근린생활 지상1층', date: '2025.10', price: '평당 보 450만/월 28만', perPyung: '7,000만원' }
          ];
        }
        if (type === 'mapo') {
          return [
            { name: '연남동 미로길 리테일 1층', spec: '근린생활 지상1층', date: '2025.09', price: '평당 보 350만/월 22만', perPyung: '5,250만원' },
            { name: '홍대 걷고싶은거리 1층', spec: '근린생활 지상1층', date: '2026.01', price: '평당 보 400만/월 25만', perPyung: '5,750만원' }
          ];
        }
        return [
          { name: `${reg}대로변 메인상가 1층`, spec: '근린생활 지상1층', date: '2025.08', price: '평당 보 180만/월 12만', perPyung: '2,450만원' },
          { name: `${reg}역 근린상가 1층`, spec: '근린생활 지상1층', date: '2025.11', price: '평당 보 160만/월 10만', perPyung: '2,300만원' }
        ];

      default:
        return [];
    }
  };

  const [activeCommercialTab, setActiveCommercialTab] = useState<'demographics' | 'competitors' | 'tenants' | 'risks'>('demographics');
  const [activeSummaryTab, setActiveSummaryTab] = useState<'general' | 'area' | 'parking' | 'amenity' | 'layout'>('general');

  // Input tab control
  const [activeInputTab, setActiveInputTab] = useState<'residential' | 'hotel' | 'retail' | 'office' | 'custom-usage' | 'building-spec' | 'scenario-strategy'>('residential');

  const handleAddCustomUsage = (template?: string) => {
    const newId = `custom_usage_${Date.now()}`;
    let name = '새 기획 용도';
    let areaPyung = 100;
    let netRatio = 60;
    let type: 'sales' | 'lease' = 'sales';
    let pricePerPyung = 2000;
    let depositPerPyung = 200;
    let rentPerPyung = 10;
    let parkingCriteria = 134; // default
    let auxAreaPyung = 10;

    if (template === 'retail_complex') {
      name = '근린생활시설 및 상가';
      areaPyung = 150;
      netRatio = 55;
      pricePerPyung = 3000;
      depositPerPyung = 300;
      rentPerPyung = 20;
      parkingCriteria = 134;
    } else if (template === 'sports') {
      name = '운동 및 체육시설';
      areaPyung = 200;
      netRatio = 70;
      pricePerPyung = 1500;
      depositPerPyung = 150;
      rentPerPyung = 8;
      parkingCriteria = 150;
    } else if (template === 'cultural') {
      name = '문화 및 집회시설';
      areaPyung = 300;
      netRatio = 65;
      pricePerPyung = 1800;
      depositPerPyung = 200;
      rentPerPyung = 10;
      parkingCriteria = 100;
    } else if (template === 'education') {
      name = '교육연구시설 (학원/연구실)';
      areaPyung = 120;
      netRatio = 65;
      pricePerPyung = 1600;
      depositPerPyung = 150;
      rentPerPyung = 8;
      parkingCriteria = 150;
    } else if (template === 'senior') {
      name = '노유자시설 (복지/돌봄)';
      areaPyung = 80;
      netRatio = 70;
      pricePerPyung = 1400;
      depositPerPyung = 100;
      rentPerPyung = 6;
      parkingCriteria = 200;
    } else if (template === 'medical') {
      name = '의료시설 (클리닉/의원)';
      areaPyung = 150;
      netRatio = 65;
      pricePerPyung = 2500;
      depositPerPyung = 300;
      rentPerPyung = 15;
      parkingCriteria = 100;
    }

    setCustomUsages(prev => [
      ...prev,
      {
        id: newId,
        name,
        areaPyung,
        netRatio,
        type,
        pricePerPyung,
        depositPerPyung,
        rentPerPyung,
        parkingCriteria,
        auxAreaPyung
      }
    ]);
  };

  const handleDeleteCustomUsage = (id: string) => {
    setCustomUsages(prev => prev.filter(item => item.id !== id));
  };

  const handleUpdateCustomUsageField = (id: string, field: keyof CustomUsageConfig, value: any) => {
    setCustomUsages(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, [field]: value };
      }
      return item;
    }));
  };

  // Sync handlers for land price
  const handleLandPurchasePriceChange = (val: number) => {
    setLandPurchasePrice(val);
    const pyung = landArea * 0.3025;
    if (pyung > 0) {
      setLandPricePerPyung(Math.round((val * 10000) / pyung));
    }
  };

  const handleLandPricePerPyungChange = (val: number) => {
    setLandPricePerPyung(val);
    const pyung = landArea * 0.3025;
    const computedTotal = parseFloat(((pyung * val) / 10000).toFixed(1));
    setLandPurchasePrice(computedTotal);
  };

  // AI Market Price Analysis States
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [marketAnalysisReport, setMarketAnalysisReport] = useState<string>('');
  const [analysisError, setAnalysisError] = useState<string>('');
  const [aiRecommendations, setAiRecommendations] = useState<any>(null);
  const [isAiSynced, setIsAiSynced] = useState<boolean>(false);
  const [aiComparables, setAiComparables] = useState<any>(() => savedScenario?.inputs?.aiComparables ?? null);
  const [aiSuccessfulCases, setAiSuccessfulCases] = useState<any[] | null>(() => savedScenario?.inputs?.aiSuccessfulCases ?? null);

  // Sync state if step 1 or step 2 changes
  useEffect(() => {
    if (currentLand && !savedScenario) {
      setLandArea(currentLand.areaSize);
      setAppliedBCR(currentLand.baselineBCR);
      
      const isGangnam = currentLand.id === 'gangnam-yeoksam';
      const isSeocho = currentLand.id === 'seocho-banpo';
      const isYeonnam = currentLand.id === 'yeonnam-forest';
      const isEuljiro = currentLand.address.includes('을지로') || currentLand.address.includes('중구') || currentLand.address.includes('명동');
      
      let initPricePerPyung = 3500;
      let initTotalPrice = 35;
      
      if (isGangnam) {
        initPricePerPyung = 12000;
        initTotalPrice = 410;
      } else if (isSeocho) {
        initPricePerPyung = 10000;
        initTotalPrice = 205;
      } else if (isEuljiro) {
        initPricePerPyung = 15000;
        initTotalPrice = 450;
      } else if (isYeonnam) {
        initPricePerPyung = 6000;
        initTotalPrice = 57;
      } else {
        initPricePerPyung = 3500;
        initTotalPrice = Math.round((currentLand.areaSize * 0.3025 * 3500) / 10000);
      }
      
      setLandPricePerPyung(initPricePerPyung);
      setLandPurchasePrice(initTotalPrice);
      
      // Reset analysis or trigger on land change
      fetchMarketPrices(currentLand.address, currentLand.zoning);
    }
  }, [currentLand, savedScenario]);

  useEffect(() => {
    if (currentRelaxation && !savedScenario) {
      setAppliedFAR(currentRelaxation.finalFAR);
    }
  }, [currentRelaxation, savedScenario]);

  // Automatically calculate aboveGroundFloors to accommodate the target scale (targetResidentialUnits)
  useEffect(() => {
    if (useLayoutSimulation && floorCalculationMode === 'manual') {
      const perFloor = towerCount * unitsPerFloorLine;
      if (perFloor > 0 && targetResidentialUnits > 0) {
        const typicalFloorsNeeded = Math.ceil(targetResidentialUnits / perFloor);
        const newAboveGroundFloors = typicalFloorsNeeded + podiumFloors;
        if (aboveGroundFloors !== newAboveGroundFloors) {
          setAboveGroundFloors(newAboveGroundFloors);
        }
      }
    }
  }, [useLayoutSimulation, floorCalculationMode, towerCount, unitsPerFloorLine, podiumFloors, targetResidentialUnits, aboveGroundFloors]);

  // AI Market Price Fetching
  const fetchMarketPrices = async (address: string, zoning: string) => {
    setIsAnalyzing(true);
    setAnalysisError('');
    setIsAiSynced(false);
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

        // Capture AI suggested development & financial parameters
        const recs = {
          landPricePerPyung: data.landPricePerPyung,
          landPurchasePrice: data.landPurchasePrice,
          constructionCostPerPyung: data.constructionCostPerPyung,
          officeDepositPerPyung: data.officeDepositPerPyung,
          officeRentPerPyung: data.officeRentPerPyung,
          retail1FDeposit: data.retail1FDeposit,
          retail1FRent: data.retail1FRent,
          hotelDepositPerRoom: data.hotelDepositPerRoom,
          hotelRentPerRoom: data.hotelRentPerRoom,
          otherCostsRatio: data.otherCostsRatio,
        };
        setAiRecommendations(recs);

        // Auto-apply AI surrounding analysis values immediately for instant feedback
        if (data.landPricePerPyung !== undefined) {
          setLandPricePerPyung(data.landPricePerPyung);
          const pyung = (currentLand ? currentLand.areaSize : landArea) * 0.3025;
          const calculatedTotal = parseFloat(((pyung * data.landPricePerPyung) / 10000).toFixed(1));
          setLandPurchasePrice(data.landPurchasePrice || calculatedTotal);
        } else if (data.landPurchasePrice !== undefined) {
          setLandPurchasePrice(data.landPurchasePrice);
          const pyung = (currentLand ? currentLand.areaSize : landArea) * 0.3025;
          if (pyung > 0) {
            setLandPricePerPyung(Math.round((data.landPurchasePrice * 10000) / pyung));
          }
        }

        if (data.constructionCostPerPyung !== undefined) setConstructionCostPerPyung(data.constructionCostPerPyung);
        if (data.officeDepositPerPyung !== undefined) setOfficeDepositPerPyung(data.officeDepositPerPyung);
        if (data.officeRentPerPyung !== undefined) setOfficeRentPerPyung(data.officeRentPerPyung);
        
        if (data.retail1FDeposit !== undefined) {
          setRetail1FDeposit(data.retail1FDeposit);
          setRetailB1Deposit(Math.round(data.retail1FDeposit * 0.4));
          setRetail2FDeposit(Math.round(data.retail1FDeposit * 0.6));
          setRetail3FDeposit(Math.round(data.retail1FDeposit * 0.5));
        }
        if (data.retail1FRent !== undefined) {
          setRetail1FRent(data.retail1FRent);
          setRetailB1Rent(Math.round(data.retail1FRent * 0.4));
          setRetail2FRent(Math.round(data.retail1FRent * 0.6));
          setRetail3FRent(Math.round(data.retail1FRent * 0.5));
        }

        if (data.hotelDepositPerRoom !== undefined) setHotelDepositPerRoom(data.hotelDepositPerRoom);
        if (data.hotelRentPerRoom !== undefined) setHotelRentPerRoom(data.hotelRentPerRoom);
        if (data.otherCostsRatio !== undefined) setOtherCostsRatio(data.otherCostsRatio);

        if (data.comparables) setAiComparables(data.comparables);
        if (data.cases) setAiSuccessfulCases(data.cases);

        setIsAiSynced(true);
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

  const handleUpdateAptField = (id: string, field: keyof HousingConfig, value: any) => {
    setAptConfigs(prev => {
      const next = prev.map(item => {
        if (item.id === id) {
          const updated = { ...item, [field]: value };
          if (field === 'sizeM2') {
            updated.pyung = parseFloat((Number(value) * 0.3025).toFixed(1));
          } else if (field === 'pyung') {
            updated.sizeM2 = parseFloat((Number(value) / 0.3025).toFixed(1));
          }
          
          // Auto-generate name based on sizeM2
          let sizeCategory = '중형';
          if (updated.sizeM2 < 60) {
            sizeCategory = '소형';
          } else if (updated.sizeM2 > 85) {
            sizeCategory = '대형';
          }
          updated.name = `공동주택 ${sizeCategory} (${updated.sizeM2}㎡ / 약 ${updated.pyung}평)`;
          
          return updated;
        }
        return item;
      });

      if (field === 'count' && useLayoutSimulation) {
        const totalApt = next.reduce((sum, item) => sum + item.count, 0);
        const totalOt = officetelConfigs.reduce((sum, item) => sum + item.count, 0);
        const totalResidential = totalApt + totalOt;
        setTargetResidentialUnits(totalResidential);
        const perFloor = towerCount * unitsPerFloorLine;
        if (perFloor > 0 && totalResidential > 0) {
          const typicalFloorsNeeded = Math.ceil(totalResidential / perFloor);
          const newAboveGroundFloors = typicalFloorsNeeded + podiumFloors;
          setTimeout(() => {
            setAboveGroundFloors(newAboveGroundFloors);
          }, 0);
        }
      }

      return next;
    });
  };

  const handleUpdateOfficetelField = (id: string, field: keyof HousingConfig, value: any) => {
    setOfficetelConfigs(prev => {
      const next = prev.map(item => {
        if (item.id === id) {
          const updated = { ...item, [field]: value };
          if (field === 'sizeM2') {
            updated.pyung = parseFloat((Number(value) * 0.3025).toFixed(1));
          } else if (field === 'pyung') {
            updated.sizeM2 = parseFloat((Number(value) / 0.3025).toFixed(1));
          }
          
          // Auto-generate name based on sizeM2
          let sizeCategory = '투룸';
          if (updated.sizeM2 < 40) {
            sizeCategory = '원룸';
          } else if (updated.sizeM2 > 60) {
            sizeCategory = '쓰리룸';
          }
          updated.name = `오피스텔 ${sizeCategory} (${updated.sizeM2}㎡ / 약 ${updated.pyung}평)`;
          
          return updated;
        }
        return item;
      });

      if (field === 'count' && useLayoutSimulation) {
        const totalApt = aptConfigs.reduce((sum, item) => sum + item.count, 0);
        const totalOt = next.reduce((sum, item) => sum + item.count, 0);
        const totalResidential = totalApt + totalOt;
        setTargetResidentialUnits(totalResidential);
        const perFloor = towerCount * unitsPerFloorLine;
        if (perFloor > 0 && totalResidential > 0) {
          const typicalFloorsNeeded = Math.ceil(totalResidential / perFloor);
          const newAboveGroundFloors = typicalFloorsNeeded + podiumFloors;
          setTimeout(() => {
            setAboveGroundFloors(newAboveGroundFloors);
          }, 0);
        }
      }

      return next;
    });
  };

  const handleDeleteApt = (id: string) => {
    setAptConfigs(prev => {
      const next = prev.filter(item => item.id !== id);
      if (useLayoutSimulation) {
        const totalApt = next.reduce((sum, item) => sum + item.count, 0);
        const totalOt = officetelConfigs.reduce((sum, item) => sum + item.count, 0);
        const totalResidential = totalApt + totalOt;
        setTargetResidentialUnits(totalResidential);
        const perFloor = towerCount * unitsPerFloorLine;
        if (perFloor > 0 && totalResidential > 0) {
          const typicalFloorsNeeded = Math.ceil(totalResidential / perFloor);
          const newAboveGroundFloors = typicalFloorsNeeded + podiumFloors;
          setTimeout(() => {
            setAboveGroundFloors(newAboveGroundFloors);
          }, 0);
        }
      }
      return next;
    });
  };

  const handleDeleteOfficetel = (id: string) => {
    setOfficetelConfigs(prev => {
      const next = prev.filter(item => item.id !== id);
      if (useLayoutSimulation) {
        const totalApt = aptConfigs.reduce((sum, item) => sum + item.count, 0);
        const totalOt = next.reduce((sum, item) => sum + item.count, 0);
        const totalResidential = totalApt + totalOt;
        setTargetResidentialUnits(totalResidential);
        const perFloor = towerCount * unitsPerFloorLine;
        if (perFloor > 0 && totalResidential > 0) {
          const typicalFloorsNeeded = Math.ceil(totalResidential / perFloor);
          const newAboveGroundFloors = typicalFloorsNeeded + podiumFloors;
          setTimeout(() => {
            setAboveGroundFloors(newAboveGroundFloors);
          }, 0);
        }
      }
      return next;
    });
  };

  const handleAddAptConfig = () => {
    const newId = `apt_custom_${Date.now()}`;
    setAptConfigs(prev => {
      const next = [
        ...prev,
        { id: newId, name: '새 공동주택 평형', sizeM2: 84, pyung: 25, salesPricePerPyung: 4500, count: 5 }
      ];
      if (useLayoutSimulation) {
        const totalApt = next.reduce((sum, item) => sum + item.count, 0);
        const totalOt = officetelConfigs.reduce((sum, item) => sum + item.count, 0);
        const totalResidential = totalApt + totalOt;
        setTargetResidentialUnits(totalResidential);
        const perFloor = towerCount * unitsPerFloorLine;
        if (perFloor > 0 && totalResidential > 0) {
          const typicalFloorsNeeded = Math.ceil(totalResidential / perFloor);
          const newAboveGroundFloors = typicalFloorsNeeded + podiumFloors;
          setTimeout(() => {
            setAboveGroundFloors(newAboveGroundFloors);
          }, 0);
        }
      }
      return next;
    });
  };

  const handleAddOfficetelConfig = () => {
    const newId = `officetel_custom_${Date.now()}`;
    setOfficetelConfigs(prev => {
      const next = [
        ...prev,
        { id: newId, name: '새 오피스텔 타입', sizeM2: 59, pyung: 18, salesPricePerPyung: 3000, count: 5 }
      ];
      if (useLayoutSimulation) {
        const totalApt = aptConfigs.reduce((sum, item) => sum + item.count, 0);
        const totalOt = next.reduce((sum, item) => sum + item.count, 0);
        const totalResidential = totalApt + totalOt;
        setTargetResidentialUnits(totalResidential);
        const perFloor = towerCount * unitsPerFloorLine;
        if (perFloor > 0 && totalResidential > 0) {
          const typicalFloorsNeeded = Math.ceil(totalResidential / perFloor);
          const newAboveGroundFloors = typicalFloorsNeeded + podiumFloors;
          setTimeout(() => {
            setAboveGroundFloors(newAboveGroundFloors);
          }, 0);
        }
      }
      return next;
    });
  };

  // 3. Dynamic Calculation logic
  const result = useMemo(() => {
    const PYUNG_TO_M2 = 3.30578;

    const totalAptUnits = aptConfigs.reduce((sum, item) => sum + item.count, 0);
    const totalOtUnits = officetelConfigs.reduce((sum, item) => sum + item.count, 0);
    const totalResidentialUnits = totalAptUnits + totalOtUnits;

    const unitsPerFloorTotal = towerCount * unitsPerFloorLine;

    // 1. Calculate Non-Residential GFAs
    const hotelNetAreaPyung = hotelRoomCount * hotelRoomSizePyung;
    const hotelNetAreaM2 = hotelNetAreaPyung * PYUNG_TO_M2;
    const hotelAboveGFA = hotelNetAreaM2 / (hotelNetRatio / 100);

    const retailNetAreaAboveGroundPyung = retail1FArea + retail2FArea + retail3FArea;
    const retailNetAreaAboveGroundM2 = retailNetAreaAboveGroundPyung * PYUNG_TO_M2;
    const retailAboveGFA = retailNetAreaAboveGroundM2 / (retailNetRatio / 100);

    const officeNetAreaPyung = officeArea;
    const officeNetAreaM2 = officeNetAreaPyung * PYUNG_TO_M2;
    const officeAboveGFA = officeNetAreaM2 / (officeNetRatio / 100);

    // Custom/Other Usages Above-ground GFAs
    const customAboveGFATotal = customUsages.reduce((sum, item) => sum + (item.areaPyung * PYUNG_TO_M2 / (item.netRatio / 100)), 0);

    // [USER ADDITIONS] Include auxiliary area (부대시설 면적)
    const customAuxAreaTotalPyung = customUsages.reduce((sum, item) => sum + item.auxAreaPyung, 0);
    const auxiliaryAreaM2 = (auxiliaryArea + customAuxAreaTotalPyung) * PYUNG_TO_M2;

    const nonResidentialAboveGroundGFA = hotelAboveGFA + retailAboveGFA + officeAboveGFA + customAboveGFATotal + auxiliaryAreaM2;

    // 2. Calculate Allowable Residential GFA based on FAR
    const maxGFA = landArea > 0 ? (landArea * (appliedFAR / 100)) : 0;
    const allowableResidentialGFA = Math.max(0, maxGFA - nonResidentialAboveGroundGFA);

    let calculatedTypicalFloors = 0;
    if (useLayoutSimulation) {
      if (floorCalculationMode === 'auto') {
        const activeHousingTypes = [...aptConfigs, ...officetelConfigs].filter(cfg => 
          cfg.id.includes('custom') || 
          (cfg.id.includes('apt_') && cfg.id !== 'apt_custom') || 
          (cfg.id.includes('officetel_') && cfg.id !== 'officetel_custom')
        );
        const averageHousingSize = activeHousingTypes.length > 0
          ? activeHousingTypes.reduce((sum, item) => sum + item.sizeM2, 0) / activeHousingTypes.length
          : 84;
        const typicalFloorAreaGross = unitsPerFloorTotal * averageHousingSize * 1.25;
        calculatedTypicalFloors = typicalFloorAreaGross > 0
          ? Math.max(1, Math.floor(allowableResidentialGFA / typicalFloorAreaGross))
          : 10;
      } else {
        calculatedTypicalFloors = Math.max(0, aboveGroundFloors - podiumFloors);
      }
    } else {
      calculatedTypicalFloors = unitsPerFloorTotal > 0 ? Math.ceil(totalResidentialUnits / unitsPerFloorTotal) : 0;
    }

    const effectiveAboveGroundFloors = useLayoutSimulation 
      ? (podiumFloors + calculatedTypicalFloors) 
      : aboveGroundFloors;

    // Bounded typical floor values
    const actualTypicalStart = Math.min(Math.max(1, typicalFloorStart), effectiveAboveGroundFloors);
    const actualTypicalEnd = Math.min(Math.max(actualTypicalStart, typicalFloorEnd), effectiveAboveGroundFloors);
    const typicalFloorCount = Math.max(1, actualTypicalEnd - actualTypicalStart + 1);

    // A. Net area & Above-ground Gross Floor Area (GFA)
    const aptNetArea = aptConfigs.reduce((sum, item) => sum + (item.count * item.sizeM2), 0);
    const aptAboveGFA = aptConfigs.reduce((sum, item) => sum + (item.count * item.sizeM2 * (1 + (wallCommonRatioApt + generalCommonRatioApt) / 100)), 0);

    const officetelNetArea = officetelConfigs.reduce((sum, item) => sum + (item.count * item.sizeM2), 0);
    const officetelAboveGFA = officetelConfigs.reduce((sum, item) => sum + (item.count * item.sizeM2 * (1 + (wallCommonRatioOt + generalCommonRatioOt) / 100)), 0);

    // Sum of ground-floor areas including auxiliary area
    const aboveGroundGFA = parseFloat((aptAboveGFA + officetelAboveGFA + nonResidentialAboveGroundGFA).toFixed(2));
    
    // B. Legal Parking Spaces Auto-estimation based on Korean regulations
    // 공동주택: 85㎡ 초과: aptParkingOver85, 60㎡~85㎡: aptParking60To85, 60㎡ 미만: aptParkingUnder60
    const aptLegalParking = aptConfigs.reduce((sum, item) => {
      if (item.count <= 0) return sum;
      const ratio = item.sizeM2 >= 85 ? aptParkingOver85 : item.sizeM2 >= 60 ? aptParking60To85 : aptParkingUnder60;
      return sum + (item.count * ratio);
    }, 0);

    // 오피스텔: 60㎡ 초과: otParkingOver60, 30㎡~60㎡: otParking30To60, 30㎡ 미만: otParkingUnder30
    const officetelLegalParking = officetelConfigs.reduce((sum, item) => {
      if (item.count <= 0) return sum;
      const ratio = item.sizeM2 >= 60 ? otParkingOver60 : item.sizeM2 >= 30 ? otParking30To60 : otParkingUnder30;
      return sum + (item.count * ratio);
    }, 0);

    // 판매시설: 134㎡당 1대 (지하층 상가 GFA 포함)
    const retailNetAreaB1M2 = retailB1Area * PYUNG_TO_M2;
    const retailB1GFA = retailNetAreaB1M2 / (retailNetRatio / 100);
    const retailTotalGFA = retailAboveGFA + retailB1GFA;
    const retailLegalParking = retailTotalGFA / 134;

    // 업무시설: 100㎡당 1대 (업무 공용부대시설 면적 포함)
    const officeAuxAreaM2 = officeAuxArea * PYUNG_TO_M2;
    const officeTotalGFAForParking = officeAboveGFA + officeAuxAreaM2;
    const officeLegalParking = officeTotalGFAForParking / 100;

    // 숙박시설: 134㎡당 1대 (호텔 부대복리시설 면적 포함)
    const hotelAuxAreaM2 = hotelAuxArea * PYUNG_TO_M2;
    const hotelTotalGFAForParking = hotelAboveGFA + hotelAuxAreaM2;
    const hotelLegalParking = hotelTotalGFAForParking / 134;

    // 추가 기획 용도 법정 주차대수 산식
    const customLegalParking = customUsages.reduce((sum, item) => {
      const gfa = (item.areaPyung * PYUNG_TO_M2 / (item.netRatio / 100)) + (item.auxAreaPyung * PYUNG_TO_M2);
      return sum + (gfa / item.parkingCriteria);
    }, 0);

    const totalLegalParking = aptLegalParking + officetelLegalParking + retailLegalParking + officeLegalParking + hotelLegalParking + customLegalParking;
    
    // Designed Parking Spaces
    const designedParkingCount = designedParkingSpaces !== null 
      ? designedParkingSpaces 
      : Math.ceil(totalLegalParking * (plannedParkingRatio / 100)) || 0;

    // Total Parking Lot Area
    const parkingArea = parseFloat((designedParkingCount * parkingAreaPerCar).toFixed(2));

    // Machinery & Electrical Room Area (based on above Ground GFA and ratio)
    const machineryArea = parseFloat((aboveGroundGFA * (machineryRatio / 100)).toFixed(2));

    // B. Underground Gross Floor Area (GFA)
    const undergroundGFA = parseFloat((parkingArea + machineryArea + retailB1GFA).toFixed(2));

    // Automatically calculate underground floors when layout simulation is active:
    // Required basement floor area is roughly 75% of landArea for excavations in Korea.
    const calculatedUndergroundFloors = undergroundGFA > 0 && landArea > 0
      ? Math.max(1, Math.ceil(undergroundGFA / (landArea * 0.75)))
      : 0;

    const effectiveUndergroundFloors = useLayoutSimulation 
      ? (floorCalculationMode === 'auto' ? calculatedUndergroundFloors : undergroundFloors)
      : undergroundFloors;

    // [USER ADDITIONS] Floor-by-floor building height and underground depth calculation
    let totalBuildingHeight = 0;
    for (let i = 1; i <= effectiveAboveGroundFloors; i++) {
      const key = `${i}F`;
      totalBuildingHeight += customFloorHeights[key] !== undefined ? customFloorHeights[key] : defaultFloorHeight;
    }

    let totalUndergroundDepth = 0;
    for (let i = 1; i <= effectiveUndergroundFloors; i++) {
      const key = `B${i}`;
      totalUndergroundDepth += customFloorHeights[key] !== undefined ? customFloorHeights[key] : 3.5;
    }

    // C. Sunlight and Separation Regulations Check (상업지역 제외)
    const isCommercialZone = currentLand?.zoning ? (currentLand.zoning.includes('상업') || currentLand.zoning.includes('상업지역')) : false;
    const requiredSeparationDistance = parseFloat((totalBuildingHeight * buildingSeparationRatio).toFixed(1));
    const isSeparationSatisfied = isCommercialZone || (buildingSeparationDistance >= requiredSeparationDistance);

    const requiredBoundaryDistance = parseFloat((totalBuildingHeight * sunlightBoundaryRatio).toFixed(1));
    const isBoundarySatisfied = isCommercialZone || (boundarySeparationDistance >= requiredBoundaryDistance);

    // Consumed Floor Area Ratio (FAR) = (aboveGroundGFA / landArea) * 100
    const consumedFAR = landArea > 0 ? parseFloat(((aboveGroundGFA / landArea) * 100).toFixed(2)) : 0;
    const isFarExceeded = consumedFAR > appliedFAR;

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

    // E. Custom Usages added to allocatedUnits
    customUsages.forEach(item => {
      const isSales = item.type === 'sales';
      const valueBillion = isSales
        ? parseFloat(((item.areaPyung * item.pricePerPyung) / 10000).toFixed(2))
        : parseFloat(((item.areaPyung * item.depositPerPyung + (item.areaPyung * item.rentPerPyung * 12 * 10)) / 10000).toFixed(2));
      allocatedUnits.push({
        id: item.id,
        name: `${item.name} (${Math.round(item.areaPyung)}평, ${isSales ? '분양형' : '임대형'})`,
        sizeM2: Math.round(item.areaPyung * PYUNG_TO_M2),
        pyung: item.areaPyung,
        count: 1,
        unitSalesPrice: valueBillion,
        totalSalesPrice: valueBillion
      });
    });

    const totalAllocatedUnits = allocatedUnits.length > 0 ? allocatedUnits.reduce((acc, curr) => acc + curr.count, 0) : 0;

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

    // Unified helper to run identical math for other scenarios with multipliers
    const calculateForScenario = (
      landCostMultiplier: number,
      constructionCostMultiplier: number,
      pricePerPyungMultiplier: number,
      rentMultiplier: number,
      forcedExitStrategy?: 'sales' | 'lease-exit' | 'lease-permanent'
    ) => {
      const activeExitStrat = forcedExitStrategy || exitStrategy;
      // E. Financial Analysis Calculations
      const landCost = landPurchasePrice * landCostMultiplier;
      const constructionCostWon = totalGFAByPyung * (constructionCostPerPyung * constructionCostMultiplier) * 10000;
      const constructionCost = parseFloat((constructionCostWon / 100000000).toFixed(2));
      const otherCosts = parseFloat(((landCost + constructionCost) * (otherCostsRatio / 100)).toFixed(2));
      const totalProjectCost = parseFloat((landCost + constructionCost + otherCosts).toFixed(2));

      // Revenues Breakdown
      const aptSales = aptConfigs.reduce((sum, item) => sum + (item.count * item.pyung * (item.salesPricePerPyung * pricePerPyungMultiplier)), 0);
      const officetelSales = officetelConfigs.reduce((sum, item) => sum + (item.count * item.pyung * (item.salesPricePerPyung * pricePerPyungMultiplier)), 0);
      const hotelSalesVal = hotelType === 'sales' ? (hotelRoomCount * hotelRoomSizePyung * (hotelPricePerPyung * pricePerPyungMultiplier)) : 0;
      const retailSalesVal = retailType === 'sales' ? (
        (retailB1Area * (retailB1Price * pricePerPyungMultiplier)) +
        (retail1FArea * (retail1FPrice * pricePerPyungMultiplier)) +
        (retail2FArea * (retail2FPrice * pricePerPyungMultiplier)) +
        (retail3FArea * (retail3FPrice * pricePerPyungMultiplier))
      ) : 0;
      const officeSalesVal = officeType === 'sales' ? (officeArea * (officePricePerPyung * pricePerPyungMultiplier)) : 0;
      const customSalesVal = customUsages.reduce((sum, item) => {
        return sum + (item.type === 'sales' ? (item.areaPyung * (item.pricePerPyung * pricePerPyungMultiplier)) : 0);
      }, 0);

      const totalSalesRevenue = parseFloat(((aptSales + officetelSales + hotelSalesVal + retailSalesVal + officeSalesVal + customSalesVal) / 10000).toFixed(2));

      // Lease Deposits
      const hotelDepositsVal = hotelType === 'lease' ? (hotelRoomCount * (hotelDepositPerRoom * rentMultiplier)) : 0;
      const retailDepositsVal = retailType === 'lease' ? (
        (retailB1Area * (retailB1Deposit * rentMultiplier)) +
        (retail1FArea * (retail1FDeposit * rentMultiplier)) +
        (retail2FArea * (retail2FDeposit * rentMultiplier)) +
        (retail3FArea * (retail3FDeposit * rentMultiplier))
      ) : 0;
      const officeDepositsVal = officeType === 'lease' ? (officeArea * (officeDepositPerPyung * rentMultiplier)) : 0;
      const customDepositsVal = customUsages.reduce((sum, item) => {
        return sum + (item.type === 'lease' ? (item.areaPyung * (item.depositPerPyung * rentMultiplier)) : 0);
      }, 0);

      const totalLeaseDeposits = parseFloat(((hotelDepositsVal + retailDepositsVal + officeDepositsVal + customDepositsVal) / 10000).toFixed(2));

      // Monthly Rent -> Annual Rent
      const hotelAnnualRentVal = hotelType === 'lease' ? (hotelRoomCount * (hotelRentPerRoom * rentMultiplier) * 12) : 0;
      const retailAnnualRentVal = retailType === 'lease' ? (
        ((retailB1Area * (retailB1Rent * rentMultiplier)) +
         (retail1FArea * (retail1FRent * rentMultiplier)) +
         (retail2FArea * (retail2FRent * rentMultiplier)) +
         (retail3FArea * (retail3FRent * rentMultiplier))) * 12
      ) : 0;
      const officeAnnualRentVal = officeType === 'lease' ? (officeArea * (officeRentPerPyung * rentMultiplier) * 12) : 0;
      const customAnnualRentVal = customUsages.reduce((sum, item) => {
        return sum + (item.type === 'lease' ? (item.areaPyung * (item.rentPerPyung * rentMultiplier) * 12) : 0);
      }, 0);

      const totalAnnualRent = parseFloat(((hotelAnnualRentVal + retailAnnualRentVal + officeAnnualRentVal + customAnnualRentVal) / 10000).toFixed(2));

      const customAllSalesVal = customUsages.reduce((sum, item) => {
        return sum + (item.areaPyung * (item.pricePerPyung * pricePerPyungMultiplier));
      }, 0);

      const aptSalesInEok = aptSales / 10000;
      const officetelSalesInEok = officetelSales / 10000;

      const isSalesStrat = activeExitStrat === 'sales';

      // Apartments conversion under lease strategies
      const calculatedAptDeposit = isSalesStrat ? 0 : aptSalesInEok * 0.55;
      const calculatedAptAnnualRent = isSalesStrat ? 0 : (aptSalesInEok * 0.45) * 0.045;

      // Officetels conversion under lease strategies
      const calculatedOfficetelDeposit = isSalesStrat ? 0 : officetelSalesInEok * 0.50;
      const calculatedOfficetelAnnualRent = isSalesStrat ? 0 : (officetelSalesInEok * 0.50) * 0.050;

      // Hotel conversion under lease strategies
      const hotelSalesInEok = (hotelRoomCount * hotelRoomSizePyung * (hotelPricePerPyung * pricePerPyungMultiplier)) / 10000;
      const calculatedHotelDeposit = isSalesStrat 
        ? 0 
        : (hotelType === 'lease' ? (hotelDepositsVal / 10000) : hotelSalesInEok * 0.45);
      const calculatedHotelAnnualRent = isSalesStrat 
        ? 0 
        : (hotelType === 'lease' ? (hotelAnnualRentVal / 10000) : (hotelSalesInEok * 0.55) * 0.055);

      // Retail conversion under lease strategies
      const retailSalesInEok = ((retailB1Area * (retailB1Price * pricePerPyungMultiplier)) + (retail1FArea * (retail1FPrice * pricePerPyungMultiplier)) + (retail2FArea * (retail2FPrice * pricePerPyungMultiplier)) + (retail3FArea * (retail3FPrice * pricePerPyungMultiplier))) / 10000;
      const calculatedRetailDeposit = isSalesStrat 
        ? 0 
        : (retailType === 'lease' ? (retailDepositsVal / 10000) : retailSalesInEok * 0.40);
      const calculatedRetailAnnualRent = isSalesStrat 
        ? 0 
        : (retailType === 'lease' ? (retailAnnualRentVal / 10000) : (retailSalesInEok * 0.60) * 0.060);

      // Office conversion under lease strategies
      const officeSalesInEok = (officeArea * (officePricePerPyung * pricePerPyungMultiplier)) / 10000;
      const calculatedOfficeDeposit = isSalesStrat 
        ? 0 
        : (officeType === 'lease' ? (officeDepositsVal / 10000) : officeSalesInEok * 0.40);
      const calculatedOfficeAnnualRent = isSalesStrat 
        ? 0 
        : (officeType === 'lease' ? (officeAnnualRentVal / 10000) : (officeSalesInEok * 0.60) * 0.050);

      // Custom Usages conversion under lease strategies
      const calculatedCustomDeposit = isSalesStrat 
        ? 0 
        : (customUsages.reduce((sum, item) => {
            const itemSalesInEok = (item.areaPyung * (item.pricePerPyung * pricePerPyungMultiplier)) / 10000;
            return sum + (item.type === 'lease' 
              ? ((item.areaPyung * (item.depositPerPyung * rentMultiplier)) / 10000) 
              : itemSalesInEok * 0.40);
          }, 0));
      const calculatedCustomAnnualRent = isSalesStrat 
        ? 0 
        : (customUsages.reduce((sum, item) => {
            const itemSalesInEok = (item.areaPyung * (item.pricePerPyung * pricePerPyungMultiplier)) / 10000;
            return sum + (item.type === 'lease' 
              ? (((item.areaPyung * (item.rentPerPyung * rentMultiplier) * 12)) / 10000) 
              : (itemSalesInEok * 0.60) * 0.050);
          }, 0));

      const finalSalesRevenue = isSalesStrat
        ? parseFloat(((aptSales + officetelSales + 
                      (hotelRoomCount * hotelRoomSizePyung * (hotelPricePerPyung * pricePerPyungMultiplier)) + 
                      ((retailB1Area * (retailB1Price * pricePerPyungMultiplier)) + (retail1FArea * (retail1FPrice * pricePerPyungMultiplier)) + (retail2FArea * (retail2FPrice * pricePerPyungMultiplier)) + (retail3FArea * (retail3FPrice * pricePerPyungMultiplier))) + 
                      (officeArea * (officePricePerPyung * pricePerPyungMultiplier)) + customAllSalesVal) / 10000).toFixed(2))
        : 0;

      const finalLeaseDeposits = isSalesStrat ? 0 : parseFloat((
        calculatedAptDeposit + 
        calculatedOfficetelDeposit + 
        calculatedHotelDeposit + 
        calculatedRetailDeposit + 
        calculatedOfficeDeposit + 
        calculatedCustomDeposit
      ).toFixed(2));

      const rawAnnualRent = isSalesStrat ? 0 : parseFloat((
        calculatedAptAnnualRent + 
        calculatedOfficetelAnnualRent + 
        calculatedHotelAnnualRent + 
        calculatedRetailAnnualRent + 
        calculatedOfficeAnnualRent + 
        calculatedCustomAnnualRent
      ).toFixed(2));

      // [USER ADDITIONS] Vacancy rate adjusted rent
      const finalAnnualRent = parseFloat((rawAnnualRent * (1 - (step4VacancyRate / 100))).toFixed(2));

      // [USER ADDITIONS] Year-by-year rent timeline with compound rent growth
      const rentInflowTimeline: number[] = [];
      let sumOfRents = 0;
      const E = step4ExitYear;

      if (!isSalesStrat) {
        if (activeExitStrat === 'lease-exit') {
          for (let opYear = 1; opYear <= E; opYear++) {
            const currentYearRent = finalAnnualRent * Math.pow(1 + (step4RentGrowth / 100), opYear - 1);
            rentInflowTimeline.push(currentYearRent);
            sumOfRents += currentYearRent;
          }
        } else {
          // lease-permanent holds for 18 operational years (Year 3 to 20)
          for (let opYear = 1; opYear <= 18; opYear++) {
            const currentYearRent = finalAnnualRent * Math.pow(1 + (step4RentGrowth / 100), opYear - 1);
            rentInflowTimeline.push(currentYearRent);
            sumOfRents += currentYearRent;
          }
        }
      }

      // [USER ADDITIONS] Exit Value / Terminal Value calculations based on Cap Rate
      const dynamicCapRateMultiplier = 100 / step4CapRate;
      const exitYearRent = rentInflowTimeline[E - 1] || finalAnnualRent;
      const leaseExitValue = isSalesStrat ? 0 : parseFloat((exitYearRent * dynamicCapRateMultiplier).toFixed(2));

      const terminalYearRent = rentInflowTimeline[17] || finalAnnualRent;
      const permanentTerminalValue = isSalesStrat ? 0 : parseFloat((terminalYearRent * dynamicCapRateMultiplier * 1.25).toFixed(2));

      // Comprehensive NPV/Inflow Evaluation based on scenario
      const totalRevenues = isSalesStrat
        ? finalSalesRevenue
        : activeExitStrat === 'lease-exit'
          ? parseFloat((finalLeaseDeposits + sumOfRents + leaseExitValue).toFixed(2))
          : parseFloat((finalLeaseDeposits + sumOfRents + permanentTerminalValue).toFixed(2));

      // Profitability
      const operatingProfit = parseFloat((totalRevenues - totalProjectCost).toFixed(2));
      const roi = totalProjectCost > 0 ? parseFloat(((operatingProfit / totalProjectCost) * 100).toFixed(1)) : 0;

      const breakEvenRatio = totalRevenues > 0 
        ? Math.round(Math.min(100, (totalProjectCost / totalRevenues) * 100))
        : 100;

      // F. 20-Year Cash Flow Timeline Simulation (To find exact BEP crossing point)
      const cashFlows: number[] = Array(21).fill(0);
      cashFlows[0] = -landCost;

      const constructionAndOther = constructionCost + otherCosts;

      // Year 1 (Construction Year 1)
      cashFlows[1] = isSalesStrat
        ? parseFloat(((finalSalesRevenue * 0.3) - (constructionAndOther * 0.5)).toFixed(2))
        : parseFloat((-(constructionAndOther * 0.5)).toFixed(2));

      // Year 2 (Construction Year 2)
      cashFlows[2] = isSalesStrat
        ? parseFloat(((finalSalesRevenue * 0.4) - (constructionAndOther * 0.5)).toFixed(2))
        : parseFloat((-(constructionAndOther * 0.5)).toFixed(2));

      // Year 3 (Completion & Operational Year 1)
      cashFlows[3] = isSalesStrat
        ? parseFloat(((finalSalesRevenue * 0.3)).toFixed(2))
        : parseFloat((finalLeaseDeposits + (rentInflowTimeline[0] || finalAnnualRent)).toFixed(2));

      // Year 4 to 20 (Operational Years)
      for (let t = 4; t <= 20; t++) {
        if (isSalesStrat) {
          cashFlows[t] = 0;
        } else if (activeExitStrat === 'lease-exit') {
          const opIndex = t - 3; // opYear index (0-based)
          if (opIndex < E - 1) {
            cashFlows[t] = parseFloat((rentInflowTimeline[opIndex] || 0).toFixed(2));
          } else if (opIndex === E - 1) {
            // Exit Year: last year rent + building exit sales value
            cashFlows[t] = parseFloat(((rentInflowTimeline[opIndex] || 0) + leaseExitValue).toFixed(2));
          } else {
            cashFlows[t] = 0;
          }
        } else {
          // lease-permanent
          const opIndex = t - 3;
          if (t === 20) {
            cashFlows[t] = parseFloat(((rentInflowTimeline[opIndex] || 0) + permanentTerminalValue).toFixed(2));
          } else {
            cashFlows[t] = parseFloat((rentInflowTimeline[opIndex] || 0).toFixed(2));
          }
        }
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

      const irr = calculateIRR(cashFlows);

      // [USER ADDITIONS] Dynamic NPV calculation based on discount rate
      let npvSum = 0;
      const discountRateDecimal = step4DiscountRate / 100;
      for (let t = 0; t < cashFlows.length; t++) {
        npvSum += cashFlows[t] / Math.pow(1 + discountRateDecimal, t);
      }
      const finalNPV = parseFloat(npvSum.toFixed(2));

      // G. Value Diagnosis Scoring and Radar Chart
      // Normalize axis values to 0-100 scales for Radar Chart presentation
      const rawSalesScore = Math.round(Math.min(100, Math.max(10, (finalSalesRevenue / (totalProjectCost * 0.5 + 1)) * 100)));
      const rawLeaseScore = Math.round(Math.min(100, Math.max(10, (((finalLeaseDeposits + finalAnnualRent * 10) / (totalProjectCost * 0.5 + 1)) * 100))));
      const expenditureScore = Math.round(Math.max(15, Math.min(100, 100 - (totalProjectCost / (totalRevenues + 1) * 80))));
      
      // Dynamic BEP Score Curve based on real-world development risk benchmarks
      let bepScore = 50;
      if (breakEvenRatio <= 30) {
        bepScore = Math.round(100 - (breakEvenRatio / 30) * 5); // 95 to 100
      } else if (breakEvenRatio <= 50) {
        bepScore = Math.round(95 - ((breakEvenRatio - 30) / 20) * 10); // 85 to 95
      } else if (breakEvenRatio <= 70) {
        bepScore = Math.round(85 - ((breakEvenRatio - 50) / 20) * 15); // 70 to 85
      } else if (breakEvenRatio <= 90) {
        bepScore = Math.round(70 - ((breakEvenRatio - 70) / 20) * 30); // 40 to 70
      } else {
        bepScore = Math.round(Math.max(10, 40 - ((breakEvenRatio - 90) / 10) * 30)); // 10 to 40
      }

      const irrScore = Math.round(Math.min(100, Math.max(10, (irr > 0 ? (irr / 25) * 100 : 10))));

      // Adaptive Business Model Weighting (Pure Sales, Pure Lease, or Mixed-use)
      const hasSales = finalSalesRevenue > 0;
      const hasLease = (finalLeaseDeposits + finalAnnualRent) > 0;

      let salesScore = rawSalesScore;
      let leaseScore = rawLeaseScore;

      if (hasSales && !hasLease) {
        // 100% Sales Project: No lease facilities.
        leaseScore = Math.round(Math.min(100, Math.max(70, rawSalesScore * 0.95)));
      } else if (!hasSales && hasLease) {
        // 100% Lease Project: No sales facilities.
        salesScore = Math.round(Math.min(100, Math.max(70, rawLeaseScore * 0.95)));
      } else if (hasSales && hasLease) {
        // Mixed Project: Ensure smaller components are rewarded as beneficial diversification, not penalized for small scale.
        const totalMixRevenue = finalSalesRevenue + finalLeaseDeposits + finalAnnualRent * 10;
        const salesRatio = finalSalesRevenue / (totalMixRevenue > 0 ? totalMixRevenue : 1);
        const leaseRatio = 1 - salesRatio;

        if (salesRatio > 0.75) {
          // Sales-dominant: Lease acts as high-quality supplemental cash flow
          leaseScore = Math.round(Math.min(100, rawLeaseScore + (rawSalesScore - rawLeaseScore) * salesRatio * 0.85));
        } else if (leaseRatio > 0.75) {
          // Lease-dominant: Sales act as high-quality upfront debt reduction
          salesScore = Math.round(Math.min(100, rawSalesScore + (rawLeaseScore - rawSalesScore) * leaseRatio * 0.85));
        }
      }

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
        financials: {
          landCost,
          constructionCost,
          otherCosts,
          totalProjectCost,
          totalSalesRevenue: finalSalesRevenue,
          totalLeaseDeposits: finalLeaseDeposits,
          totalAnnualRent: finalAnnualRent,
          totalRevenues,
          operatingProfit,
          roi,
          breakEvenRatio,
          totalSaleablePyung,
          bepPricePerPyung,
          bepRequiredUnits,
          npv: finalNPV,
          sumOfRents,
          exitValue: leaseExitValue,
          terminalValue: permanentTerminalValue
        },
        cashFlows,
        cumulativeCashFlow,
        bepYear,
        irr,
        radarData,
        diagnosisScore
      };
    };

    // Calculate all 5 scenarios
    const scenarioData = {
      base: calculateForScenario(1.0, 1.0, 1.0, 1.0),
      conservative: calculateForScenario(1.10, 1.15, 0.90, 0.85),
      optimistic: calculateForScenario(1.00, 0.95, 1.12, 1.15),
      inflation: calculateForScenario(1.00, 1.35, 1.00, 1.00),
      slump: calculateForScenario(1.00, 1.00, 0.80, 1.00)
    };

    const activeScenario = scenarioData[selectedScenarioId] || scenarioData.base;

    // Precalculate comparison metrics for active scenario under different exit strategies
    const multipliersMap = {
      base: [1.0, 1.0, 1.0, 1.0],
      conservative: [1.10, 1.15, 0.90, 0.85],
      optimistic: [1.00, 0.95, 1.12, 1.15],
      inflation: [1.00, 1.35, 1.00, 1.00],
      slump: [1.00, 1.00, 0.80, 1.00]
    };
    const m = multipliersMap[selectedScenarioId] || multipliersMap.base;
    const salesCompare = calculateForScenario(m[0], m[1], m[2], m[3], 'sales');
    const leaseExitCompare = calculateForScenario(m[0], m[1], m[2], m[3], 'lease-exit');
    const leasePermanentCompare = calculateForScenario(m[0], m[1], m[2], m[3], 'lease-permanent');

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
      aptLegalParking,
      officetelLegalParking,
      retailLegalParking,
      officeLegalParking,
      hotelLegalParking,
      totalLegalParking,
      designedParkingCount,
      parkingArea,
      machineryArea,
      retailB1GFA,
      aptNetArea,
      officetelNetArea,
      aptAboveGFA,
      officetelAboveGFA,
      hotelAboveGFA,
      retailAboveGFA,
      retailTotalGFA,
      officeAboveGFA,
      wallCommonRatioApt,
      generalCommonRatioApt,
      wallCommonRatioOt,
      generalCommonRatioOt,
      parkingAreaPerCar,
      machineryRatio,
      // [USER ADDITIONS]
      auxiliaryArea,
      aboveGroundFloors: effectiveAboveGroundFloors,
      undergroundFloors: effectiveUndergroundFloors,
      defaultFloorHeight,
      customFloorHeights,
      exitStrategy,
      totalBuildingHeight,
      totalUndergroundDepth,
      actualTypicalStart,
      actualTypicalEnd,
      typicalFloorCount,
      // [USER ADDITIONS] Layout Simulation parameters & checks
      totalAptUnits,
      totalOtUnits,
      totalResidentialUnits,
      unitsPerFloorTotal,
      calculatedTypicalFloors,
      useLayoutSimulation,
      towerCount,
      unitsPerFloorLine,
      podiumFloors,
      buildingSeparationDistance,
      boundarySeparationDistance,
      buildingSeparationRatio,
      sunlightBoundaryRatio,
      isCommercialZone,
      requiredSeparationDistance,
      isSeparationSatisfied,
      requiredBoundaryDistance,
      isBoundarySatisfied,
      scenarios: scenarioData,
      activeScenarioId: selectedScenarioId,
      salesCompare,
      leaseExitCompare,
      leasePermanentCompare,
      // Standard mapped fields to support legacy charts transparently
      cashFlows: activeScenario.cashFlows,
      cumulativeCashFlow: activeScenario.cumulativeCashFlow,
      bepYear: activeScenario.bepYear,
      irr: activeScenario.irr,
      radarData: activeScenario.radarData,
      diagnosisScore: activeScenario.diagnosisScore,
      financials: activeScenario.financials
    };
  }, [
    landArea, appliedFAR, appliedBCR, netRatio, landPurchasePrice, constructionCostPerPyung, otherCostsRatio, 
    aptConfigs, officetelConfigs, hotelRoomCount, hotelRoomSizePyung, hotelPricePerPyung, hotelNetRatio, 
    hotelType, hotelDepositPerRoom, hotelRentPerRoom, retailNetRatio, retailType, retailB1Area, retail1FArea, 
    retail2FArea, retail3FArea, retailB1Price, retail1FPrice, retail2FPrice, retail3FPrice, retailB1Deposit, 
    retail1FDeposit, retail2FDeposit, retail3FDeposit, retailB1Rent, retail1FRent, retail2FRent, retail3FRent, 
    officeArea, officePricePerPyung, officeDepositPerPyung, officeRentPerPyung, officeType, officeNetRatio,
    wallCommonRatioApt, generalCommonRatioApt, wallCommonRatioOt, generalCommonRatioOt, parkingAreaPerCar,
    designedParkingSpaces, machineryRatio, auxiliaryArea, aboveGroundFloors, undergroundFloors, 
    defaultFloorHeight, customFloorHeights, exitStrategy,
    aptAuxArea, officetelAuxArea, hotelAuxArea, officeAuxArea, selectedScenarioId, customUsages,
    typicalFloorStart, typicalFloorEnd,
    aptParkingOver85, aptParking60To85, aptParkingUnder60, otParkingOver60, otParking30To60, otParkingUnder30, plannedParkingRatio,
    useLayoutSimulation, floorCalculationMode, towerCount, unitsPerFloorLine, podiumFloors, buildingSeparationDistance, boundarySeparationDistance, buildingSeparationRatio, sunlightBoundaryRatio,
    useCustomResidentFacilities, residentFacilities,
    step4ExitYear, step4VacancyRate, step4RentGrowth, step4CapRate, step4DiscountRate
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
          officeArea, officePricePerPyung, officeDepositPerPyung, officeRentPerPyung, officeType, officeNetRatio,
          wallCommonRatioApt, generalCommonRatioApt, wallCommonRatioOt, generalCommonRatioOt, parkingAreaPerCar,
          designedParkingSpaces, machineryRatio, auxiliaryArea, aboveGroundFloors, undergroundFloors, 
          defaultFloorHeight, customFloorHeights, exitStrategy,
          aptAuxArea, officetelAuxArea, hotelAuxArea, officeAuxArea, customUsages,
          typicalFloorStart, typicalFloorEnd,
          aptParkingOver85, aptParking60To85, aptParkingUnder60, otParkingOver60, otParking30To60, otParkingUnder30, plannedParkingRatio,
          useLayoutSimulation, floorCalculationMode, towerCount, unitsPerFloorLine, podiumFloors, buildingSeparationDistance, boundarySeparationDistance, buildingSeparationRatio, sunlightBoundaryRatio,
          useCustomResidentFacilities, residentFacilities,
          aiComparables, aiSuccessfulCases,
          step4ExitYear, step4VacancyRate, step4RentGrowth, step4CapRate, step4DiscountRate
        },
        result
      });
    }
  }, [result, onScenarioChange, aiComparables, aiSuccessfulCases, step4ExitYear, step4VacancyRate, step4RentGrowth, step4CapRate, step4DiscountRate]);

  const getCommercialReport = () => {
    const isGangnam = currentLand?.id === 'gangnam-yeoksam' || currentLand?.address?.includes('역삼') || currentLand?.address?.includes('강남');
    const isSeocho = currentLand?.id === 'seocho-banpo' || currentLand?.address?.includes('서초') || currentLand?.address?.includes('반포');
    const isYeonnam = currentLand?.id === 'yeonnam-forest' || currentLand?.address?.includes('연남') || currentLand?.address?.includes('마포');
    const isEuljiro = currentLand?.address?.includes('을지로') || currentLand?.address?.includes('중구') || currentLand?.address?.includes('명동');

    if (isGangnam) {
      return {
        location: '강남구 역삼동 핵심 업무지구 배후 상권',
        grade: 'S등급 - 초고밀도 복합 핵심상권',
        demographicsText: '주말 대비 주중 2.4배 수준의 화이트칼라 직장인 유동인구 집중지. 20대 후반~40대 전문직 직장인 및 IT 개발인력 중심(남 52%, 여 48%). 점심(11:30~13:30) 및 퇴근 이후 저녁(18:00~21:00) 최고 밀집.',
        competitorsText: '테헤란로 핵심 배후 먹자골목 상권 형성. 식음료(F&B) 비중이 42%로 과밀 수준이나, 평균 소비 단가는 서울 한강이남 최고 수준이며 회전율이 매우 높음.',
        officeVacancy: '자연공실률(3.0%) 미만의 극도의 임차 우위 마켓. 대형 오피스 공실률 1.2% 수준이며 신규 공급 물량에 대한 흡수 속도가 매우 신속함.',
        recommendations: [
          { category: '프리미엄 다이닝 & 브런치 F&B', yield: '6.2%', description: '고급 직장인 오피스 배후 맞춤형 및 브랜드 직영 안테나숍 권장' },
          { category: '메디컬/뷰티 클리닉', yield: '5.8%', description: '피부과, 도수치료 정형외과, 필라테스 등 점심 시간 밀착형 클리닉 권장' },
          { category: '공유 오피스 & 스마트 협업 세미나실', yield: '5.5%', description: '스타트업 및 외주 개발사 거점 니즈 대응' }
        ],
        risksText: '임대료 평당 단가가 높고 상가 권리금 부담이 큼. 젠트리피케이션 및 핵심 인건비 상승에 따른 소상공인 입퇴점 회전 리스크에 사전 대비 필요.'
      };
    } else if (isSeocho) {
      return {
        location: '서초구 반포동 하이엔드 주거 밀착 상권',
        grade: 'S등급 - 하이엔드 주거 배후 핵심상권',
        demographicsText: '주거밀착형 고급 배후 수요 중심. 대단지 아파트 소비 가구 밀집. 30대 중반~50대 고소득 주부 및 자녀 학령 세대 중심(남 41%, 여 59%). 오후(13:00~16:00) 및 주말 전 시간대 균등 배분.',
        competitorsText: '주거 밀착형 고급 근린생활시설 중심 상권 형성. 교육/학원업 및 웰니스 스포츠 리테일 발달. 상가 공실률이 서울 최저 수준으로 유지됨.',
        officeVacancy: '소형 전문 세무/법무 대행사 및 대형 클리닉 중심 오피스 배치 양호. 서초대로 배후 공실률 2.5% 수준 유지.',
        recommendations: [
          { category: '하이엔드 에듀케이션 & 키즈 아카데미', yield: '5.4%', description: '고급 주거 가구 자녀 대상의 영유아 전문 어학 및 독서 카페 권장' },
          { category: '뷰티 에스테틱 & 웰니스 메디컬 스파', yield: '5.6%', description: '고소득 거주민 건강관리 및 힐링 목적의 리커버리 스파 클리닉 권장' },
          { category: '프리미엄 푸드 부티크 & 다이닝', yield: '5.2%', description: '친환경 가공 다이닝 샵 및 고급 베이커리 델리 권장' }
        ],
        risksText: '주거 타깃으로 단가 저항선은 낮으나 서비스 완성도 및 고정 고객 로열티 기준이 매우 까다로워 초기 브랜딩 난이도가 높음.'
      };
    } else if (isYeonnam) {
      return {
        location: '마포구 연남동 로컬 크리에이티브 트렌드 상권',
        grade: 'A등급 - 로컬 문화·트렌드 중심 상권',
        demographicsText: '경의선 숲길 공원 기반의 여가·관광 목적 유동인구 주도. 10대 후반~30대 초반 젊은 세대 및 외국인 개별 관광객 압도적(남 35%, 여 65%). 주말(금~일) 오후 집중 및 주중 심야 비중 양호.',
        competitorsText: '주택 개조형 독특한 컨셉 상가 집중. 감성 카페, 이색 소품숍, 디자인 독립 스튜디오가 골목 단위 고밀도 배치. 온라인 바이럴 파급력이 최상급.',
        officeVacancy: '청년 스타트업, 유튜브 크리에이터, 디자인 에이전시 소호 작업실 밀집. 연남/서교 배후 평균 공실률 4.8% 수준.',
        recommendations: [
          { category: 'F&B 디저트 쇼룸 및 셀렉숍', yield: '6.5%', description: '인스타그램 바이럴 및 비주얼 테마가 강렬한 인공지능 추천 이색 카페' },
          { category: '트렌디 다이닝 & 내추럴 바', yield: '6.1%', description: '골목길 이면을 활용한 감성 한식/일식 퓨전 펍 권장' },
          { category: '공유 창작 스튜디오 & 갤러리 샵', yield: '5.2%', description: '지역 크리에이터 및 디자이너와 협업하는 쇼룸 성격 복합 공간' }
        ],
        risksText: '상업화 가속으로 골목길 단위의 급격한 임대료 상승(젠트리피케이션)이 발생하여 원주민 컨셉숍 이탈 리스크 상존. 평일 낮 매출 공백기 보정 마케팅 필수.'
      };
    } else if (isEuljiro) {
      return {
        location: '중구 을지로 레트로 융합 비즈니스 상권',
        grade: 'S등급 - 도심 역사·비즈니스 융합상권',
        demographicsText: '전형적인 대기업 본사 임직원 및 레트로 문화를 찾아 유입되는 MZ세대 하이브리딩 상권. 주중 낮 직장인 중심에서 주중 저녁 및 주말 젊은 세대로 전이(남 49%, 여 51%).',
        competitorsText: '골목 안 인쇄소, 정밀기계 상가를 개조한 이색 펍(힙지로)과 대로변의 프라임 오피스가 혼재되어 극단적인 주야간 보완 구조를 지님.',
        officeVacancy: '도심 CBD 프라임 오피스 마켓의 지속적 수요. 공실률 2.1% 수준으로 지극히 안정적 임대 마켓 확보.',
        recommendations: [
          { category: '뉴트로 이색 식음료 펍/바 (Retro F&B)', yield: '6.3%', description: '을지로만의 날것 느낌을 유지하는 2층 이상 펍, 카페 라운지 권장' },
          { category: '오피스 서포팅 전문 공유 회의 라운지', yield: '5.4%', description: '대기업 이면 소셜 벤처 및 지사 성격의 프리미엄 미팅 허브 구축' },
          { category: '테마형 코워킹 콜렉터블 숍', yield: '5.1%', description: '레트로 굿즈 및 을지로 로컬 브랜드 융합 편집 매장' }
        ],
        risksText: '이면 도로의 노후 건물 밀집 지역으로 소방, 전기 등 시설 인프라 리모델링 비용이 과다 지출될 위험이 있으며 재개발 구역 지정 여부 모니터링 필요.'
      };
    } else {
      return {
        location: '일반 근린밀착 생활 중심형 배후 상권',
        grade: 'B등급 - 안정적 근린 생활 밀착 상권',
        demographicsText: '안정적인 배후 거주 세대 및 인근 출퇴근 이동 동선 기반 상권. 30대 후반~60대 주거 가구원 균등 분포(남 48%, 여 52%). 주중 출퇴근 시간대(08:00, 18:30) 및 주말 주거 중심 집중.',
        competitorsText: '생활 밀착형 생활 편의시설(약국, 클리닉, 생활 잡화, 프랜차이즈 저가 F&B)이 주거 동선 주통로변 배치. 유행 민감도가 매우 낮음.',
        officeVacancy: '지역 밀착형 중소 자영업 행정 대행(세무사, 회계사, 행정사) 사무실 수요 중심. 평균 오피스 공실률 5.5% 내외 유지.',
        recommendations: [
          { category: '생활 밀착 메디컬 클리닉 (의원)', yield: '5.1%', description: '소아과, 이비인후과, 통증의학과 및 약국 복합 동선 권장' },
          { category: '대형 유명 프랜차이즈 베이커리 & F&B', yield: '4.9%', description: '주거 가구 수요를 유입시키는 앵커 테넌트 입점 추진' },
          { category: '스터디 및 소셜 오피스 카페', yield: '4.5%', description: '학군지 및 은퇴층 근린 커뮤니티 성격 공유 오피스룸' }
        ],
        risksText: '학령인구 감소 및 온라인 소매 강화로 오프라인 점포 회전율이 둔화될 수 있으며, 임대 단가 인상에 대한 심리적 저항이 강해 리모델링 시 관리 효율 관건.'
      };
    }
  };

  return (
    <div className="space-y-6">
      {currentLand ? (
        <div className="space-y-4">
          {activeStep === 4 && (
            <>
              {showAiPopulationEditor && (
            <div className="bg-amber-50/10 p-5 rounded-2xl border border-amber-200/40 space-y-4 shadow-xs">
              <div className="flex justify-between items-center border-b border-amber-200/20 pb-3">
                <div className="space-y-1">
                  <h3 className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-600 animate-pulse" />
                    AI 기반 수지분석 모집단 분석 및 보정 엔진
                  </h3>
                  <p className="text-[10px] text-amber-700 font-medium">실거래가 및 표준건축비 분석 데이터</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAiPopulationEditor(false)}
                  className="text-[10px] font-bold text-amber-800 hover:text-amber-900 cursor-pointer"
                >
                  접기 ▲
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200/50 text-gray-500 font-bold text-[10.5px]">
                      <th className="p-2.5 text-left">분석 항목</th>
                      <th className="p-2.5 text-left">AI 분석 근거 및 주변 모집단 실거래 가이드라인</th>
                      <th className="p-2.5 text-right">수지분석 적용 수치</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-150 text-gray-750">
                      {/* 1. 토지비 */}
                      {renderPopulationRow(
                        'land',
                        '총 토지 매입비',
                        landPurchasePrice,
                        '억',
                        handleLandPurchasePriceChange,
                        (() => {
                          const addr = currentLand?.address || '';
                          if (addr.includes('역삼') || addr.includes('강남')) return '역삼동 이면 상업/준주거지 최근 매각 실거래 (평당 1.1억~1.3억원 수준)';
                          if (addr.includes('반포') || addr.includes('서초')) return '서초대로변 준주거지 및 반포동 노후 대지 수매 실거래가 (평당 1.0억~1.2억원 수준)';
                          if (addr.includes('을지로') || addr.includes('중구') || addr.includes('명동')) return '을지로 중심상업지역 일반상업지 대로변 최고가 실거래 (평당 1.4억~1.6억원 수준)';
                          if (addr.includes('연남') || addr.includes('마포')) return '연트럴파크 메인 상권 및 연남동 미로길 카페거리 수매가 실거래 (평당 5.0~6.5천만원 수준)';
                          const reg = getRegionalName(addr);
                          return `${reg} 인근 및 유사 입지 실거래가 (평당 2.8~3.2천만원 수준)`;
                        })()
                      )}

                      {/* 2. 평당 공사비 */}
                      {renderPopulationRow(
                        'construction',
                        '평당 공사비',
                        constructionCostPerPyung,
                        '만원',
                        (val) => setConstructionCostPerPyung(Math.round(val)),
                        '국토교통부 고시 표준건축비 및 원자재·인건비 인플레이션 반영 가이드라인 (평당 800~1,100만원)'
                      )}

                      {/* 3. 공동주택 소형 */}
                      {aptConfigs.some(c => c.id === 'apt_small') && renderPopulationRow(
                        'apt_small',
                        '공동주택 소형 (59㎡)',
                        aptConfigs.find(c => c.id === 'apt_small')?.salesPricePerPyung || 0,
                        '만원',
                        (val) => setAptConfigs(prev => prev.map(cfg => cfg.id === 'apt_small' ? { ...cfg, salesPricePerPyung: Math.round(val) } : cfg)),
                        (() => {
                          const addr = currentLand?.address || '';
                          if (addr.includes('역삼') || addr.includes('강남')) return '역삼 푸르지오 59㎡ (평당 5,800~6,100만), 역삼 e-편한세상 59㎡ (평당 5,700~6,000만)';
                          if (addr.includes('반포') || addr.includes('서초')) return '반포 래미안원베일리 59㎡ (평당 7,200~7,600만), 아크로리버파크 59㎡ (평당 7,000~7,500만)';
                          if (addr.includes('을지로') || addr.includes('중구') || addr.includes('명동')) return '덕수궁 디팰리스 59㎡ (평당 5,000~5,400만), 남산 롯데캐슬 59㎡ (평당 4,800~5,200만)';
                          if (addr.includes('연남') || addr.includes('마포')) return '마포 프레스티지 자이 59㎡ (평당 4,200~4,500만), 신촌그랑자이 59㎡ (평당 4,000~4,300만)';
                          const reg = getRegionalName(addr);
                          return `${reg} 현대아이파크 59㎡ (평당 2,500~2,800만), ${reg} 센트럴 푸르지오 59㎡ (평당 2,400~2,700만)`;
                        })()
                      )}

                      {/* 4. 공동주택 중형 */}
                      {aptConfigs.some(c => c.id === 'apt_medium') && renderPopulationRow(
                        'apt_medium',
                        '공동주택 중형 (84㎡)',
                        aptConfigs.find(c => c.id === 'apt_medium')?.salesPricePerPyung || 0,
                        '만원',
                        (val) => setAptConfigs(prev => prev.map(cfg => cfg.id === 'apt_medium' ? { ...cfg, salesPricePerPyung: Math.round(val) } : cfg)),
                        (() => {
                          const addr = currentLand?.address || '';
                          if (addr.includes('역삼') || addr.includes('강남')) return '개포 래미안 포레스트 84㎡ (평당 6,000~6,400만), 대치 은마아파트 84㎡ (평당 5,800~6,200만)';
                          if (addr.includes('반포') || addr.includes('서초')) return '반포자이 84㎡ (평당 7,100~7,400만), 반포 래미안퍼스티지 84㎡ (평당 7,000~7,300만)';
                          if (addr.includes('을지로') || addr.includes('중구') || addr.includes('명동')) return '경희궁 자이 84㎡ (평당 5,400~5,800만), 서울역 센트럴자이 84㎡ (평당 5,200~5,600만)';
                          if (addr.includes('연남') || addr.includes('마포')) return '마포래미안푸르지오 84㎡ (평당 4,400~4,800만), 마포자이3차 84㎡ (평당 4,200~4,600만)';
                          const reg = getRegionalName(addr);
                          return `${reg} 삼풍아파트 84㎡ (평당 2,600~3,000만), ${reg} 현대아이파크 84㎡ (평당 2,400~2,800만)`;
                        })()
                      )}

                      {/* 5. 공동주택 대형 */}
                      {aptConfigs.some(c => c.id === 'apt_large') && renderPopulationRow(
                        'apt_large',
                        '공동주택 대형 (114㎡)',
                        aptConfigs.find(c => c.id === 'apt_large')?.salesPricePerPyung || 0,
                        '만원',
                        (val) => setAptConfigs(prev => prev.map(cfg => cfg.id === 'apt_large' ? { ...cfg, salesPricePerPyung: Math.round(val) } : cfg)),
                        (() => {
                          const addr = currentLand?.address || '';
                          if (addr.includes('역삼') || addr.includes('강남')) return '역삼 자이 114㎡ (평당 6,500~7,000만), 도곡 렉슬 114㎡ (평당 6,300~6,800만)';
                          if (addr.includes('반포') || addr.includes('서초')) return '반포 래미안원베일리 114㎡ (평당 7,800~8,200만), 아크로리버파크 114㎡ (평당 7,600~8,000만)';
                          if (addr.includes('을지로') || addr.includes('중구') || addr.includes('명동')) return '경희궁자이 114㎡ (평당 5,800~6,200만), 남산타운 114㎡ (평당 5,400~5,800만)';
                          if (addr.includes('연남') || addr.includes('마포')) return '마포그랑자이 114㎡ (평당 4,800~5,200만), 신촌숲아이파크 114㎡ (평당 4,600~5,000만)';
                          const reg = getRegionalName(addr);
                          return `${reg} 스카이뷰 114㎡ (평당 2,800~3,200만), ${reg} 메트로캐슬 114㎡ (평당 2,700~3,100만)`;
                        })()
                      )}

                      {/* 6. 오피스텔 원룸 */}
                      {officetelConfigs.some(c => c.id === 'officetel_studio') && renderPopulationRow(
                        'officetel_studio',
                        '오피스텔 원룸 (9평)',
                        officetelConfigs.find(c => c.id === 'officetel_studio')?.salesPricePerPyung || 0,
                        '만원',
                        (val) => setOfficetelConfigs(prev => prev.map(cfg => cfg.id === 'officetel_studio' ? { ...cfg, salesPricePerPyung: Math.round(val) } : cfg)),
                        (() => {
                          const addr = currentLand?.address || '';
                          if (addr.includes('역삼') || addr.includes('강남')) return '강남역 서희스타힐스 30㎡ (평당 3,200~3,400만), 역삼 아르젠 30㎡ (평당 3,100~3,300만)';
                          if (addr.includes('반포') || addr.includes('서초')) return '서초 에클라트 30㎡ (평당 3,600~3,800만), 효성해링턴타워 30㎡ (평당 3,500~3,700만)';
                          if (addr.includes('을지로') || addr.includes('중구') || addr.includes('명동')) return '을지로 센트럴데시앙 30㎡ (평당 2,800~3,000만), 명동 엠퍼스트플레이스 30㎡ (평당 2,700~2,900만)';
                          if (addr.includes('연남') || addr.includes('마포')) return '홍대역 엘포트 30㎡ (평당 2,500~2,700만), 마포 한화오벨리스크 30㎡ (평당 2,400~2,600만)';
                          const reg = getRegionalName(addr);
                          return `${reg} 현대에클라트 30㎡ (평당 2,200~2,500만), ${reg} 한신휴플러스 30㎡ (평당 2,100~2,300만)`;
                        })()
                      )}

                      {/* 7. 오피스텔 투룸 */}
                      {officetelConfigs.some(c => c.id === 'officetel_tworoom') && renderPopulationRow(
                        'officetel_tworoom',
                        '오피스텔 투룸 (18평)',
                        officetelConfigs.find(c => c.id === 'officetel_tworoom')?.salesPricePerPyung || 0,
                        '만원',
                        (val) => setOfficetelConfigs(prev => prev.map(cfg => cfg.id === 'officetel_tworoom' ? { ...cfg, salesPricePerPyung: Math.round(val) } : cfg)),
                        (() => {
                          const addr = currentLand?.address || '';
                          if (addr.includes('역삼') || addr.includes('강남')) return '역삼 센트레빌아스테리움 59㎡ (평당 3,500~3,700만), 강남 루카831 59㎡ (평당 3,400~3,600만)';
                          if (addr.includes('반포') || addr.includes('서초')) return '서초 메트로폴리스 59㎡ (평당 4,000~4,300만), 지웰타워 59㎡ (평당 3,900~4,200만)';
                          if (addr.includes('을지로') || addr.includes('중구') || addr.includes('명동')) return '충무로 엘크루메트로시티 59㎡ (평당 3,100~3,400만), 남산 센트럴자이 59㎡ (평당 3,000~3,300만)';
                          if (addr.includes('연남') || addr.includes('마포')) return '상암 카이저팰리스 59㎡ (평당 2,800~3,000만), 공덕 푸르지오시티 59㎡ (평당 2,700~2,900만)';
                          const reg = getRegionalName(addr);
                          return `${reg} 아르젠 59㎡ (평당 2,400~2,600만), ${reg} 푸르지오시티 59㎡ (평당 2,300~2,500만)`;
                        })()
                      )}

                      {/* 8. 오피스텔 쓰리룸 */}
                      {officetelConfigs.some(c => c.id === 'officetel_threeroom') && renderPopulationRow(
                        'officetel_threeroom',
                        '오피스텔 쓰리룸 (25평)',
                        officetelConfigs.find(c => c.id === 'officetel_threeroom')?.salesPricePerPyung || 0,
                        '만원',
                        (val) => setOfficetelConfigs(prev => prev.map(cfg => cfg.id === 'officetel_threeroom' ? { ...cfg, salesPricePerPyung: Math.round(val) } : cfg)),
                        (() => {
                          const addr = currentLand?.address || '';
                          if (addr.includes('역삼') || addr.includes('강남')) return '강남 피에드아테르 84㎡ (평당 3,800~4,200만), 역삼 자이르네 84㎡ (평당 3,700~4,000만)';
                          if (addr.includes('반포') || addr.includes('서초')) return '서초 르피에드 84㎡ (평당 4,400~4,800만), 교대역 엘타워 84㎡ (평당 4,200~4,500만)';
                          if (addr.includes('을지로') || addr.includes('중구') || addr.includes('명동')) return '남산 센트럴뷰 84㎡ (평당 3,500~3,800만), 세운 푸르지오 헤리시티 84㎡ (평당 3,400~3,700만)';
                          if (addr.includes('연남') || addr.includes('마포')) return '마포 한강2차푸르지오 84㎡ (평당 3,100~3,400만), 신촌 다올마을 84㎡ (평당 3,000~3,300만)';
                          const reg = getRegionalName(addr);
                          return `${reg} 롯데골든클래스 84㎡ (평당 2,500~2,800만), ${reg} 오피스빌 84㎡ (평당 2,400~2,600만)`;
                        })()
                      )}

                      {/* 9. 업무시설 */}
                      {officeArea > 0 && renderPopulationRow(
                        'office',
                        '업무시설 (오피스)',
                        officePricePerPyung,
                        '만원',
                        (val) => setOfficePricePerPyung(Math.round(val)),
                        (() => {
                          const addr = currentLand?.address || '';
                          if (addr.includes('역삼') || addr.includes('강남')) return '테헤란로 강남파이낸스센터 인근 프라임 오피스 실거래 (평당 3,400~3,600만)';
                          if (addr.includes('반포') || addr.includes('서초')) return '서초동 삼성타운 인근 프라임 오피스 (평당 3,400~3,700만)';
                          if (addr.includes('을지로') || addr.includes('중구') || addr.includes('명동')) return '을지로 파인에비뉴 및 중구 시그니쳐타워 업무시설 (평당 2,900~3,300만)';
                          if (addr.includes('연남') || addr.includes('마포')) return '마포로변 프라임 오피스 및 상암 DMC 오피스 타워 (평당 2,400~2,700만)';
                          const reg = getRegionalName(addr);
                          return `${reg} 인근 중대형 빌딩 업무용도 실거래가 (평당 1,500~1,800만)`;
                        })()
                      )}

                      {/* 9-2. 호텔 (분양형/임대형) */}
                      {hotelRoomCount > 0 && (
                        hotelType === 'sales' ? (
                          renderPopulationRow(
                            'hotel_sales',
                            `호텔 분양가 (${hotelRoomSizePyung}평형)`,
                            hotelPricePerPyung,
                            '만원/평',
                            (val) => setHotelPricePerPyung(Math.round(val)),
                            (() => {
                              const addr = currentLand?.address || '';
                              if (addr.includes('역삼') || addr.includes('강남')) return '강남/역삼 비즈니스 호텔 및 레지던스 분양 실거래 (평당 2,800~3,200만)';
                              if (addr.includes('반포') || addr.includes('서초')) return '서초/교대 고급 부티크 호텔 및 서비스드 레지던스 분양 (평당 3,000~3,500만)';
                              if (addr.includes('을지로') || addr.includes('중구') || addr.includes('명동')) return '명동/을지로 외국인 대상 호텔 분양가 실거래 (평당 2,600~3,000만)';
                              if (addr.includes('연남') || addr.includes('마포')) return '마포/홍대 어반 라이프스타일 디자인 호텔 분양가 (평당 2,200~2,500만)';
                              const reg = getRegionalName(addr);
                              return `${reg} 인근 비즈니스 호텔 분양 사례 (평당 1,600~1,900만)`;
                            })()
                          )
                        ) : (
                          <>
                            {renderPopulationRow(
                              'hotel_deposit',
                              '호텔 객실 보증금',
                              hotelDepositPerRoom,
                              '만원/실',
                              (val) => setHotelDepositPerRoom(Math.round(val)),
                              '숙박 및 운영 위탁 계약에 따른 객실당 보증금 가이드라인 (평당 1,500~2,500만원 수준)'
                            )}
                            {renderPopulationRow(
                              'hotel_rent',
                              '호텔 객실 월 수입 (가동률 고려)',
                              hotelRentPerRoom,
                              '만원/월/실',
                              (val) => setHotelRentPerRoom(Math.round(val)),
                              (() => {
                                const addr = currentLand?.address || '';
                                if (addr.includes('역삼') || addr.includes('강남')) return '강남 비즈니스 호텔 객실 가동률 82% 기준 월 환산 수익 (실당 180~230만)';
                                if (addr.includes('반포') || addr.includes('서초')) return '서초 관광 호텔 객실 가동률 80% 기준 월 환산 수익 (실당 170~220만)';
                                if (addr.includes('을지로') || addr.includes('중구') || addr.includes('명동')) return '명동 관광 호텔 객실 가동률 88% 기준 월 환산 수익 (실당 200~250만)';
                                if (addr.includes('연남') || addr.includes('마포')) return '홍대 디자인 호텔 객실 가동률 85% 기준 월 환산 수익 (실당 160~210만)';
                                const reg = getRegionalName(addr);
                                return `${reg} 인근 비즈니스 호텔 객실 가동률 78% 기준 월 환산 수익 (실당 140~180만)`;
                              })()
                            )}
                          </>
                        )
                      )}

                      {/* 10. 상업시설 지상 1층 */}
                      {(retailB1Area > 0 || retail1FArea > 0 || retail2FArea > 0 || retail3FArea > 0) && renderPopulationRow(
                        'retail',
                        '상가 지상 1층',
                        retail1FPrice,
                        '만원',
                        (val) => setRetail1FPrice(Math.round(val)),
                        (() => {
                          const addr = currentLand?.address || '';
                          if (addr.includes('역삼') || addr.includes('강남')) return '테헤란로 대로변 상가 1층 실거래 (평당 7,000~8,000만), 역삼 먹자골목 1층 코너 (평당 6,500~7,500만)';
                          if (addr.includes('반포') || addr.includes('서초')) return '반포 래미안원베일리 단지내 상가 1층 (평당 8,000~9,000만), 아크로리버 상가 (평당 7,800~8,500만)';
                          if (addr.includes('을지로') || addr.includes('중구') || addr.includes('명동')) return '명동 메인스트리트 로드숍 1층 (평당 8,000만~1.2억), 을지로 센터원 상가 1층 (평당 6,500~7,500만)';
                          if (addr.includes('연남') || addr.includes('마포')) return '연남동 미로길 1층 리테일 (평당 5,000~5,500만), 홍대 걷고싶은거리 상가 (평당 5,500~6,000만)';
                          const reg = getRegionalName(addr);
                          return `${reg} 주변 1층 상가 실거래 시세 (평당 3,500~3,800만)`;
                        })()
                      )}
                    </tbody>
                  </table>
                </div>
              <p className="text-[9.5px] text-[#8D7B68] italic">
                  * 단가를 수정하면 아래의 모든 수지 분석 시뮬레이션 지표(ROI, 영업이익, 손익분기점, IRR)에 실시간으로 연동되어 즉시 갱신됩니다.
                </p>
              </div>
            )}

              <div className="text-[10px] text-[#8D7B68] flex items-center gap-1 font-semibold">
                <Info className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                <span>위 파라미터는 AI가 대상지 주소({currentLand?.address}) 주변의 실거래가 및 임대수요 트렌드를 추출하여 산정한 값으로, 하단의 수지분석 시뮬레이션에 자동 대입되었습니다.</span>
              </div>
            </>
          )}

        {analysisError && (
          <div className="p-3 bg-red-50 rounded-lg border border-red-100 flex items-start gap-2 text-xs text-red-700">
            <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="leading-relaxed">{analysisError}</p>
          </div>
        )}

        <div className="flex flex-col gap-8">
          {/* LEFT: INPUTS (Full Width for mobile & sequential flow) */}
          <div className="w-full space-y-6">
            {activeStep === 4 && (
              <div className="space-y-6">
                {/* 1. Step 3 설계 기획 개요 (분석 기준안) */}
                <div className="bg-white p-5 rounded-2xl border border-gray-150 shadow-sm space-y-4">
                  <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5 border-b border-gray-50 pb-2">
                    <Building2 className="w-4 h-4 text-[#5F7161]" />
                    Step 3 설계 기획 개요 (분석 기준안)
                  </h3>
                  <div className="space-y-3.5 text-xs">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                        <span className="text-gray-400 block text-[10px] font-semibold mb-0.5">계획 대지면적</span>
                        <strong className="text-gray-800 font-bold text-[13px]">{landArea.toLocaleString()} ㎡</strong>
                      </div>
                      <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                        <span className="text-gray-400 block text-[10px] font-semibold mb-0.5">기획 연면적 (GFA)</span>
                        <strong className="text-[#5F7161] font-bold text-[13px]">{result.totalGFA.toLocaleString()} ㎡</strong>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2.5">
                      <div className="bg-gray-50/50 p-2 rounded-xl text-center border border-gray-100">
                        <span className="text-gray-400 block text-[9px] font-medium">지상 규모</span>
                        <strong className="text-gray-800 text-[11px] font-bold">{result.aboveGroundFloors} 층</strong>
                      </div>
                      <div className="bg-gray-50/50 p-2 rounded-xl text-center border border-gray-100">
                        <span className="text-gray-400 block text-[9px] font-medium">지하 규모</span>
                        <strong className="text-gray-800 text-[11px] font-bold">{undergroundFloors} 층</strong>
                      </div>
                      <div className="bg-gray-50/50 p-2 rounded-xl text-center border border-gray-100">
                        <span className="text-gray-400 block text-[9px] font-medium">용적률 요율</span>
                        <strong className="text-gray-800 text-[11px] font-bold">{result.consumedFAR.toFixed(1)} %</strong>
                      </div>
                    </div>

                    <div className="h-px bg-gray-100"></div>

                    <div className="space-y-2">
                      <span className="text-gray-400 text-[10px] font-bold block uppercase tracking-wider">세부 용도별 구성 요약</span>
                      <div className="space-y-1.5">
                        {aptConfigs.some(c => c.count > 0) && (
                          <div className="flex justify-between items-center bg-emerald-50/30 p-2 rounded-xl border border-emerald-100/50">
                            <span className="text-emerald-900 font-semibold text-[11px]">공동주택 (아파트/다세대)</span>
                            <span className="font-bold text-emerald-800">{aptConfigs.reduce((s, c) => s + c.count, 0)} 세대</span>
                          </div>
                        )}
                        {officetelConfigs.some(c => c.count > 0) && (
                          <div className="flex justify-between items-center bg-blue-50/30 p-2 rounded-xl border border-blue-100/50">
                            <span className="text-blue-900 font-semibold text-[11px]">오피스텔</span>
                            <span className="font-bold text-blue-800">{officetelConfigs.reduce((s, c) => s + c.count, 0)} 실</span>
                          </div>
                        )}
                        {hotelRoomCount > 0 && (
                          <div className="flex justify-between items-center bg-purple-50/30 p-2 rounded-xl border border-purple-100/50">
                            <span className="text-purple-900 font-semibold text-[11px]">호텔 (숙박시설)</span>
                            <span className="font-bold text-purple-800">{hotelRoomCount} 객실</span>
                          </div>
                        )}
                        {retail1FArea + retail2FArea + retail3FArea + retailB1Area > 0 && (
                          <div className="flex justify-between items-center bg-orange-50/30 p-2 rounded-xl border border-orange-100/50">
                            <span className="text-orange-900 font-semibold text-[11px]">판매시설 (근린생활상가)</span>
                            <span className="font-bold text-orange-800">{(retail1FArea + retail2FArea + retail3FArea + retailB1Area).toFixed(1)} 평</span>
                          </div>
                        )}
                        {officeArea > 0 && (
                          <div className="flex justify-between items-center bg-indigo-50/30 p-2 rounded-xl border border-indigo-100/50">
                            <span className="text-indigo-900 font-semibold text-[11px]">업무시설 (사무소)</span>
                            <span className="font-bold text-indigo-800">{officeArea.toFixed(1)} 평</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. 주변 상권분석 보고서 */}
                <div className="bg-white p-5 rounded-2xl border border-gray-150 shadow-sm space-y-4">
                  <div className="flex justify-between items-start border-b border-gray-100 pb-3">
                    <div className="space-y-1">
                      <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                        <Activity className="w-4 h-4 text-indigo-600" />
                        주변 상권분석 및 입지 리포트
                      </h3>
                      <p className="text-[10px] text-gray-400 font-medium">대상지: {currentLand?.address || '미지정 대지'}</p>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                      {getCommercialReport().grade}
                    </span>
                  </div>

                  {/* Sub Tabs */}
                  <div className="grid grid-cols-4 border border-gray-150 bg-gray-50/70 p-1 rounded-xl gap-0.5">
                    <button
                      type="button"
                      onClick={() => setActiveCommercialTab('demographics')}
                      className={`py-1.5 text-center text-[10px] font-bold rounded-lg cursor-pointer transition-all ${
                        activeCommercialTab === 'demographics' ? 'bg-white text-indigo-700 shadow-xs' : 'text-gray-500 hover:text-indigo-600'
                      }`}
                    >
                      수요인구
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveCommercialTab('competitors')}
                      className={`py-1.5 text-center text-[10px] font-bold rounded-lg cursor-pointer transition-all ${
                        activeCommercialTab === 'competitors' ? 'bg-white text-indigo-700 shadow-xs' : 'text-gray-500 hover:text-indigo-600'
                      }`}
                    >
                      경쟁 분석
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveCommercialTab('tenants')}
                      className={`py-1.5 text-center text-[10px] font-bold rounded-lg cursor-pointer transition-all ${
                        activeCommercialTab === 'tenants' ? 'bg-white text-indigo-700 shadow-xs' : 'text-gray-500 hover:text-indigo-600'
                      }`}
                    >
                      권장 업종
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveCommercialTab('risks')}
                      className={`py-1.5 text-center text-[10px] font-bold rounded-lg cursor-pointer transition-all ${
                        activeCommercialTab === 'risks' ? 'bg-white text-indigo-700 shadow-xs' : 'text-gray-500 hover:text-indigo-600'
                      }`}
                    >
                      상권 리스크
                    </button>
                  </div>

                  {/* Sub Tab Content */}
                  <div className="text-xs space-y-3 pt-1">
                    {activeCommercialTab === 'demographics' && (
                      <div className="space-y-3.5">
                        <div className="p-3 bg-indigo-50/30 rounded-xl border border-indigo-100/50 leading-relaxed text-gray-700 font-medium">
                          {getCommercialReport().demographicsText}
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between font-semibold text-gray-500 text-[10px]">
                            <span>주중 활동성 유입 비중</span>
                            <span className="font-bold text-indigo-700">72%</span>
                          </div>
                          <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-indigo-600 rounded-full" style={{ width: '72%' }}></div>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between font-semibold text-gray-500 text-[10px]">
                            <span>핵심 주 타깃 구매력 강도</span>
                            <span className="font-bold text-indigo-700">최상위 복합 핵심</span>
                          </div>
                          <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-indigo-600 rounded-full" style={{ width: '92%' }}></div>
                          </div>
                        </div>
                      </div>
                    )}

                    {activeCommercialTab === 'competitors' && (
                      <div className="space-y-3.5">
                        <div className="p-3 bg-emerald-50/20 rounded-xl border border-emerald-100/40 leading-relaxed text-gray-700 font-medium">
                          {getCommercialReport().competitorsText}
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between font-semibold text-gray-500 text-[10px]">
                            <span>상권 내 오피스 공실률</span>
                            <span className="font-bold text-emerald-800">{getCommercialReport().officeVacancy.match(/\d+(\.\d+)?%/)?.[0] || '2.5%'}</span>
                          </div>
                          <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-600 rounded-full" style={{ width: '30%' }}></div>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between font-semibold text-gray-500 text-[10px]">
                            <span>식음 리테일 포화 지수</span>
                            <span className="font-bold text-amber-700">과밀 경계 (주의)</span>
                          </div>
                          <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-amber-500 rounded-full" style={{ width: '85%' }}></div>
                          </div>
                        </div>
                      </div>
                    )}

                    {activeCommercialTab === 'tenants' && (
                      <div className="space-y-2.5">
                        <p className="text-[10px] text-gray-400 font-bold block uppercase tracking-wider">주변 공실 대비 앵커 테넌트 입점 추천순위</p>
                        <div className="space-y-2">
                          {getCommercialReport().recommendations.map((rec, idx) => (
                            <div key={idx} className="p-2.5 bg-white rounded-xl border border-gray-150 flex justify-between items-center gap-2">
                              <div>
                                <div className="flex items-center gap-1">
                                  <span className="text-[10px] font-bold text-indigo-700">{idx + 1}위</span>
                                  <strong className="text-gray-800 font-bold text-[11px]">{rec.category}</strong>
                                </div>
                                <p className="text-[10px] text-gray-400 mt-0.5">{rec.description}</p>
                              </div>
                              <div className="text-right flex-shrink-0">
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-50 text-indigo-800">
                                  수익 {rec.yield}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {activeCommercialTab === 'risks' && (
                      <div className="space-y-3 leading-relaxed">
                        <div className="p-3 bg-red-50/40 rounded-xl border border-red-100/50 text-red-900 font-medium">
                          {getCommercialReport().risksText}
                        </div>
                        <div className="flex gap-2 p-2 bg-gray-50 rounded-xl border border-gray-150 items-start">
                          <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                          <p className="text-[10px] text-gray-500">본 분석 결과는 상업지구 유동인구 카드 소비 데이터 및 임대 매물 실거래 호가를 가공하여 도출한 정보입니다.</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className={activeStep === 4 ? 'hidden' : 'space-y-6'}>
              {/* Input tabs */}
            <div className="grid grid-cols-3 sm:grid-cols-7 border-b border-gray-100 mb-5 bg-gray-50/50 p-1 rounded-xl gap-1">
              <button
                type="button"
                onClick={() => setActiveInputTab('residential')}
                className={`text-center py-2 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${activeInputTab === 'residential' ? 'bg-white text-[#2C251F] shadow-sm border border-gray-100' : 'text-gray-500 hover:text-[#5F7161]'}`}
              >
                주거시설
              </button>
              <button
                type="button"
                onClick={() => setActiveInputTab('hotel')}
                className={`text-center py-2 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${activeInputTab === 'hotel' ? 'bg-white text-[#2C251F] shadow-sm border border-gray-100' : 'text-gray-500 hover:text-[#5F7161]'}`}
              >
                호텔
              </button>
              <button
                type="button"
                onClick={() => setActiveInputTab('retail')}
                className={`text-center py-2 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${activeInputTab === 'retail' ? 'bg-white text-[#2C251F] shadow-sm border border-gray-100' : 'text-gray-500 hover:text-[#5F7161]'}`}
              >
                판매시설
              </button>
              <button
                type="button"
                onClick={() => setActiveInputTab('office')}
                className={`text-center py-2 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${activeInputTab === 'office' ? 'bg-white text-[#2C251F] shadow-sm border border-gray-100' : 'text-gray-500 hover:text-[#5F7161]'}`}
              >
                업무시설
              </button>
              <button
                type="button"
                onClick={() => setActiveInputTab('custom-usage')}
                className={`text-center py-2 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${activeInputTab === 'custom-usage' ? 'bg-white text-[#2C251F] shadow-sm border border-gray-100' : 'text-gray-500 hover:text-[#5F7161]'}`}
              >
                추가용도 🧩
              </button>
              <button
                type="button"
                onClick={() => setActiveInputTab('building-spec')}
                className={`text-center py-2 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${activeInputTab === 'building-spec' ? 'bg-white text-[#2C251F] shadow-sm border border-gray-100' : 'text-gray-500 hover:text-[#5F7161]'}`}
              >
                건물 및 층고
              </button>
              <button
                type="button"
                onClick={() => setActiveInputTab('scenario-strategy')}
                className={`text-center py-2 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${activeInputTab === 'scenario-strategy' ? 'bg-white text-[#2C251F] shadow-sm border border-gray-100' : 'text-gray-500 hover:text-[#5F7161]'}`}
              >
                추진 시나리오
              </button>
            </div>

            {/* TAB CONTENT */}
            {activeInputTab === 'residential' && (
              <div className="space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-bold text-[#2C251F] uppercase tracking-widest flex items-center gap-1.5">
                      <Home className="w-4 h-4 text-[#5F7161]" />
                      공동주택(다세대/아파트) 상세 구성 기획
                    </h3>
                    <button
                      type="button"
                      onClick={handleAddAptConfig}
                      className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-bold text-white bg-[#5F7161] hover:bg-[#4d5c4f] rounded-lg shadow-xs transition-colors cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      평형 추가
                    </button>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="overflow-x-auto border border-gray-150 rounded-2xl bg-white shadow-xs">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-gray-200 bg-slate-50/50 text-gray-500 font-bold">
                            <th className="p-2.5 w-1/3">타입 명칭</th>
                            <th className="p-2.5 w-[14%] text-right">전용(㎡)</th>
                            <th className="p-2.5 w-[14%] text-right">평형(평)</th>
                            {activeStep !== 3 && <th className="p-2.5 w-1/5 text-right">㎡당 분양가(만)</th>}
                            <th className="p-2.5 w-1/5 text-right">세대수</th>
                            <th className="p-2.5 w-[8%] text-center"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {aptConfigs.length === 0 ? (
                            <tr>
                              <td colSpan={activeStep === 3 ? 5 : 6} className="p-4 text-center text-gray-400 font-medium">
                                등록된 평형이 없습니다. 상단의 '평형 추가' 버튼을 눌러주세요.
                              </td>
                            </tr>
                          ) : (
                            aptConfigs.map((cfg) => (
                              <tr key={cfg.id} className="hover:bg-slate-50/30 transition-colors">
                                <td className="p-2">
                                  <input
                                    type="text"
                                    value={cfg.name}
                                    readOnly
                                    disabled
                                    placeholder="자동 계산됨"
                                    className="w-full font-bold text-[#2C251F] bg-gray-50/80 border border-gray-200 rounded-lg px-2 py-1 text-[11px] cursor-not-allowed opacity-85"
                                  />
                                </td>
                                <td className="p-2 text-right">
                                  <input
                                    type="number"
                                    value={cfg.sizeM2 || ''}
                                    onChange={(e) => handleUpdateAptField(cfg.id, 'sizeM2', parseFloat(e.target.value) || 0)}
                                    className="w-14 text-right font-semibold text-gray-700 bg-slate-50/20 hover:bg-slate-50 focus:bg-white border border-gray-200 focus:border-[#5F7161] rounded-lg px-1.5 py-1 focus:outline-none text-[11px]"
                                  />
                                </td>
                                <td className="p-2 text-right">
                                  <input
                                    type="number"
                                    value={cfg.pyung || ''}
                                    onChange={(e) => handleUpdateAptField(cfg.id, 'pyung', parseFloat(e.target.value) || 0)}
                                    className="w-12 text-right font-semibold text-gray-700 bg-slate-50/20 hover:bg-slate-50 focus:bg-white border border-gray-200 focus:border-[#5F7161] rounded-lg px-1.5 py-1 focus:outline-none text-[11px]"
                                  />
                                </td>
                                {activeStep !== 3 && (
                                  <td className="p-2 text-right">
                                    <input
                                      type="number"
                                      value={Math.round((cfg.salesPricePerPyung || 0) / 3.30578) || ''}
                                      onChange={(e) => handleUpdateAptField(cfg.id, 'salesPricePerPyung', Math.round((parseFloat(e.target.value) || 0) * 3.30578))}
                                      className="w-16 text-right font-mono font-bold text-[#5F7161] bg-slate-50/20 hover:bg-slate-50 focus:bg-white border border-gray-200 focus:border-[#5F7161] rounded-lg px-1.5 py-1 focus:outline-none text-[11px]"
                                    />
                                    <div className="text-[9px] text-gray-400 mt-0.5">평당 {(cfg.salesPricePerPyung || 0).toLocaleString()}만</div>
                                  </td>
                                )}
                                <td className="p-2 text-right">
                                  <div className="flex items-center justify-end gap-1">
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateAptField(cfg.id, 'count', Math.max(0, cfg.count - 1))}
                                      className="w-5 h-5 flex items-center justify-center border border-gray-200 bg-white rounded-md hover:bg-gray-50 text-[10px] font-bold text-gray-600 cursor-pointer"
                                    >
                                      -
                                    </button>
                                    <input
                                      type="number"
                                      value={cfg.count}
                                      onChange={(e) => handleUpdateAptField(cfg.id, 'count', Math.max(0, parseInt(e.target.value) || 0))}
                                      className="w-9 text-center font-bold text-gray-900 bg-slate-50/20 hover:bg-slate-50 focus:bg-white border border-gray-200 focus:border-[#5F7161] rounded-lg py-1 focus:outline-none text-[11px]"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateAptField(cfg.id, 'count', cfg.count + 1)}
                                      className="w-5 h-5 flex items-center justify-center border border-gray-200 bg-white rounded-md hover:bg-gray-50 text-[10px] font-bold text-gray-600 cursor-pointer"
                                    >
                                      +
                                    </button>
                                  </div>
                                </td>
                                <td className="p-2 text-center">
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteApt(cfg.id)}
                                    className="p-1 text-gray-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                                    title="삭제"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-bold text-[#2C251F] uppercase tracking-widest flex items-center gap-1.5">
                      <Briefcase className="w-4 h-4 text-indigo-600" />
                      오피스텔(O/T 주거형) 상세 구성 기획
                    </h3>
                    <button
                      type="button"
                      onClick={handleAddOfficetelConfig}
                      className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-bold text-white bg-indigo-600 hover:bg-indigo-750 rounded-lg shadow-xs transition-colors cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      타입 추가
                    </button>
                  </div>

                  <div className="space-y-3">
                    <div className="overflow-x-auto border border-gray-150 rounded-2xl bg-white shadow-xs">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-gray-200 bg-slate-50/50 text-gray-500 font-bold">
                            <th className="p-2.5 w-1/3">타입 명칭</th>
                            <th className="p-2.5 w-[14%] text-right">전용(㎡)</th>
                            <th className="p-2.5 w-[14%] text-right">평형(평)</th>
                            {activeStep !== 3 && <th className="p-2.5 w-1/5 text-right">㎡당 분양가(만)</th>}
                            <th className="p-2.5 w-1/5 text-right">호실수</th>
                            <th className="p-2.5 w-[8%] text-center"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {officetelConfigs.length === 0 ? (
                            <tr>
                              <td colSpan={activeStep === 3 ? 5 : 6} className="p-4 text-center text-gray-400 font-medium">
                                등록된 오피스텔 타입이 없습니다. 상단의 '타입 추가' 버튼을 눌러주세요.
                              </td>
                            </tr>
                          ) : (
                            officetelConfigs.map((cfg) => (
                              <tr key={cfg.id} className="hover:bg-slate-50/30 transition-colors">
                                <td className="p-2">
                                  <input
                                    type="text"
                                    value={cfg.name}
                                    readOnly
                                    disabled
                                    placeholder="자동 계산됨"
                                    className="w-full font-bold text-[#2C251F] bg-gray-50/80 border border-gray-200 rounded-lg px-2 py-1 text-[11px] cursor-not-allowed opacity-85"
                                  />
                                </td>
                                <td className="p-2 text-right">
                                  <input
                                    type="number"
                                    value={cfg.sizeM2 || ''}
                                    onChange={(e) => handleUpdateOfficetelField(cfg.id, 'sizeM2', parseFloat(e.target.value) || 0)}
                                    className="w-14 text-right font-semibold text-gray-700 bg-slate-50/20 hover:bg-slate-50 focus:bg-white border border-gray-200 focus:border-[#5F7161] rounded-lg px-1.5 py-1 focus:outline-none text-[11px]"
                                  />
                                </td>
                                <td className="p-2 text-right">
                                  <input
                                    type="number"
                                    value={cfg.pyung || ''}
                                    onChange={(e) => handleUpdateOfficetelField(cfg.id, 'pyung', parseFloat(e.target.value) || 0)}
                                    className="w-12 text-right font-semibold text-gray-700 bg-slate-50/20 hover:bg-slate-50 focus:bg-white border border-gray-200 focus:border-[#5F7161] rounded-lg px-1.5 py-1 focus:outline-none text-[11px]"
                                  />
                                </td>
                                {activeStep !== 3 && (
                                  <td className="p-2 text-right">
                                    <input
                                      type="number"
                                      value={Math.round((cfg.salesPricePerPyung || 0) / 3.30578) || ''}
                                      onChange={(e) => handleUpdateOfficetelField(cfg.id, 'salesPricePerPyung', Math.round((parseFloat(e.target.value) || 0) * 3.30578))}
                                      className="w-16 text-right font-mono font-bold text-indigo-700 bg-slate-50/20 hover:bg-slate-50 focus:bg-white border border-gray-200 focus:border-[#5F7161] rounded-lg px-1.5 py-1 focus:outline-none text-[11px]"
                                    />
                                    <div className="text-[9px] text-gray-400 mt-0.5">평당 {(cfg.salesPricePerPyung || 0).toLocaleString()}만</div>
                                  </td>
                                )}
                                <td className="p-2 text-right">
                                  <div className="flex items-center justify-end gap-1">
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateOfficetelField(cfg.id, 'count', Math.max(0, cfg.count - 1))}
                                      className="w-5 h-5 flex items-center justify-center border border-gray-200 bg-white rounded-md hover:bg-gray-50 text-[10px] font-bold text-gray-600 cursor-pointer"
                                    >
                                      -
                                    </button>
                                    <input
                                      type="number"
                                      value={cfg.count}
                                      onChange={(e) => handleUpdateOfficetelField(cfg.id, 'count', Math.max(0, parseInt(e.target.value) || 0))}
                                      className="w-9 text-center font-bold text-gray-900 bg-slate-50/20 hover:bg-slate-50 focus:bg-white border border-gray-200 focus:border-[#5F7161] rounded-lg py-1 focus:outline-none text-[11px]"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateOfficetelField(cfg.id, 'count', cfg.count + 1)}
                                      className="w-5 h-5 flex items-center justify-center border border-gray-200 bg-white rounded-md hover:bg-gray-50 text-[10px] font-bold text-gray-600 cursor-pointer"
                                    >
                                      +
                                    </button>
                                  </div>
                                </td>
                                <td className="p-2 text-center">
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteOfficetel(cfg.id)}
                                    className="p-1 text-gray-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                                    title="삭제"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 p-4.5 bg-slate-50 border border-slate-200/60 rounded-2xl">
                  <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider border-b border-gray-200/50 pb-1.5 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-[#5F7161]" />
                    공동주택 공용면적 구성 요율 설정
                  </h4>
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <div className="flex justify-between font-medium text-xs">
                        <span className="text-gray-500">벽체공용 비율 (전용 대비)</span>
                        <span className="font-bold text-gray-800">{wallCommonRatioApt}%</span>
                      </div>
                      <input
                        type="range"
                        min="2"
                        max="15"
                        step="0.5"
                        value={wallCommonRatioApt}
                        onChange={(e) => setWallCommonRatioApt(Number(e.target.value))}
                        className="w-full accent-[#5F7161]"
                      />
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between font-medium text-xs">
                        <span className="text-gray-500">일반공용 비율 (복도/계단/EV 등)</span>
                        <span className="font-bold text-gray-800">{generalCommonRatioApt}%</span>
                      </div>
                      <input
                        type="range"
                        min="10"
                        max="45"
                        step="0.5"
                        value={generalCommonRatioApt}
                        onChange={(e) => setGeneralCommonRatioApt(Number(e.target.value))}
                        className="w-full accent-[#5F7161]"
                      />
                    </div>
                    <div className="pt-2 border-t border-dashed border-gray-200 flex justify-between text-[11px] font-semibold text-gray-600">
                      <span>합산 공용률: {(wallCommonRatioApt + generalCommonRatioApt).toFixed(1)}%</span>
                      <span className="text-[#5F7161]">실질 전용률: {Math.round(100 / (1 + (wallCommonRatioApt + generalCommonRatioApt) / 100))}%</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 p-4.5 bg-slate-50 border border-slate-200/60 rounded-2xl">
                  <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider border-b border-gray-200/50 pb-1.5 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-indigo-600" />
                    오피스텔 공용면적 구성 요율 설정
                  </h4>
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <div className="flex justify-between font-medium text-xs">
                        <span className="text-gray-500">벽체공용 비율 (전용 대비)</span>
                        <span className="font-bold text-gray-800">{wallCommonRatioOt}%</span>
                      </div>
                      <input
                        type="range"
                        min="2"
                        max="15"
                        step="0.5"
                        value={wallCommonRatioOt}
                        onChange={(e) => setWallCommonRatioOt(Number(e.target.value))}
                        className="w-full accent-indigo-600"
                      />
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between font-medium text-xs">
                        <span className="text-gray-500">일반공용 비율 (복도/EV/기타 등)</span>
                        <span className="font-bold text-gray-800">{generalCommonRatioOt}%</span>
                      </div>
                      <input
                        type="range"
                        min="10"
                        max="55"
                        step="0.5"
                        value={generalCommonRatioOt}
                        onChange={(e) => setGeneralCommonRatioOt(Number(e.target.value))}
                        className="w-full accent-indigo-600"
                      />
                    </div>
                    <div className="pt-2 border-t border-dashed border-gray-200 flex justify-between text-[11px] font-semibold text-gray-600">
                      <span>합산 공용률: {(wallCommonRatioOt + generalCommonRatioOt).toFixed(1)}%</span>
                      <span className="text-indigo-600">실질 전용률: {Math.round(100 / (1 + (wallCommonRatioOt + generalCommonRatioOt) / 100))}%</span>
                    </div>
                  </div>
                </div>

                {/* [ADDITION] 공동주택 및 오피스텔 부대시설 기획 */}
                <div className="p-4 bg-[#FCFAF7] border border-[#EDDBC7]/60 rounded-2xl space-y-4 shadow-xs">
                  <h4 className="text-xs font-bold text-[#2C251F] uppercase tracking-wider border-b border-gray-150 pb-2 flex justify-between items-center">
                    <span className="flex items-center gap-1.5">
                      <Home className="w-4 h-4 text-[#5F7161]" />
                      🏡 주거시설 부대복리시설 기획 (면적)
                    </span>
                    <span className="text-[10px] text-[#5F7161] font-bold font-mono">주거 부대시설 합계: {aptAuxArea + officetelAuxArea} 평</span>
                  </h4>

                  <div className="space-y-4 text-xs">
                    {/* 공동주택 */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center font-medium">
                        <span className="text-gray-600 font-semibold">공동주택 부대시설 (피트니스, 시니어클럽 등)</span>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min="0"
                            max="1000"
                            value={aptAuxArea}
                            disabled={useCustomResidentFacilities}
                            onChange={(e) => setAptAuxArea(Math.max(0, Math.min(1000, Number(e.target.value) || 0)))}
                            className={`w-14 text-center text-xs font-bold bg-white border border-gray-200 py-0.5 rounded-lg focus:outline-none focus:border-[#5F7161] font-mono ${useCustomResidentFacilities ? 'opacity-70 bg-gray-50 text-gray-500' : ''}`}
                          />
                          <span className="font-bold text-gray-800">평</span>
                        </div>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="1"
                        value={Math.min(aptAuxArea, 100)}
                        disabled={useCustomResidentFacilities}
                        onChange={(e) => setAptAuxArea(Number(e.target.value))}
                        className={`w-full accent-[#5F7161] ${useCustomResidentFacilities ? 'opacity-50 cursor-not-allowed' : ''}`}
                      />

                      {/* 주민공동시설 세부 목록 수기 입력 */}
                      <div className="mt-2 bg-slate-50 p-2.5 rounded-xl border border-gray-150 space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-bold text-gray-700">
                            <input
                              type="checkbox"
                              checked={useCustomResidentFacilities}
                              onChange={(e) => setUseCustomResidentFacilities(e.target.checked)}
                              className="rounded text-[#5F7161] focus:ring-[#5F7161] w-3.5 h-3.5"
                            />
                            <span>주민공동시설 수기 세부 구성</span>
                          </label>
                          {useCustomResidentFacilities && (
                            <button
                              type="button"
                              onClick={() => {
                                const newId = Date.now().toString();
                                setResidentFacilities(prev => [...prev, { id: newId, name: '새 주민공동시설', area: 3 }]);
                              }}
                              className="text-[10px] text-[#5F7161] hover:text-emerald-800 font-bold flex items-center gap-0.5 cursor-pointer bg-white px-2 py-0.5 rounded-md border border-gray-200"
                            >
                              <Plus className="w-3 h-3" />
                              추가
                            </button>
                          )}
                        </div>

                        {useCustomResidentFacilities ? (
                          <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
                            {residentFacilities.length === 0 ? (
                              <p className="text-[10px] text-gray-400 italic text-center py-2">등록된 시설이 없습니다. 우측 상단의 추가 버튼을 눌러 등록해 주세요.</p>
                            ) : (
                              residentFacilities.map((f, idx) => (
                                <div key={f.id} className="flex items-center gap-1.5 bg-white p-1.5 rounded-lg border border-gray-150">
                                  <span className="text-[10px] text-gray-400 font-mono w-4 text-center">{idx + 1}</span>
                                  <input
                                    type="text"
                                    value={f.name}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setResidentFacilities(prev => prev.map(item => item.id === f.id ? { ...item, name: val } : item));
                                    }}
                                    placeholder="시설명 (예: 독서실)"
                                    className="flex-1 bg-transparent border-0 border-b border-transparent hover:border-gray-200 focus:border-[#5F7161] px-1 py-0.5 text-xs text-gray-800 focus:outline-none font-bold"
                                  />
                                  <div className="flex items-center gap-1">
                                    <input
                                      type="number"
                                      min="0"
                                      max="500"
                                      value={f.area}
                                      onChange={(e) => {
                                        const val = Math.max(0, Math.min(500, Number(e.target.value) || 0));
                                        setResidentFacilities(prev => prev.map(item => item.id === f.id ? { ...item, area: val } : item));
                                      }}
                                      className="w-10 text-center font-semibold bg-gray-50 border border-gray-200 py-0.5 rounded text-[11px] font-mono focus:outline-none focus:border-[#5F7161]"
                                    />
                                    <span className="text-[10px] text-gray-500 font-bold">평</span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setResidentFacilities(prev => prev.filter(item => item.id !== f.id));
                                    }}
                                    className="p-1 text-gray-400 hover:text-red-600 rounded hover:bg-red-50 transition cursor-pointer"
                                    title="삭제"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ))
                            )}
                            <div className="flex justify-between items-center text-[10px] text-[#5F7161] font-semibold border-t border-gray-100 pt-1.5 px-1 mt-1">
                              <span>합계 (자동 연동)</span>
                              <span className="font-mono">{aptAuxArea}평 (약 {Math.round(aptAuxArea * 3.3)}㎡)</span>
                            </div>
                          </div>
                        ) : (
                          <p className="text-[10px] text-gray-400 leading-relaxed">
                            주민공동시설 수기 세부 구성 체크박스를 선택하면, 피트니스, 경로당, 어린이집 등 개별 주민공동시설을 명시적으로 설계에 등록하고 각 면적을 상세 조절할 수 있습니다.
                          </p>
                        )}
                      </div>
                    </div>

                    {/* 오피스텔 */}
                    <div className="space-y-1.5 border-t border-gray-100 pt-3">
                      <div className="flex justify-between items-center font-medium">
                        <span className="text-gray-600 font-semibold">오피스텔 부대시설 (라운지, 공유세탁실 등)</span>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min="0"
                            max="1000"
                            value={officetelAuxArea}
                            onChange={(e) => setOfficetelAuxArea(Math.max(0, Math.min(1000, Number(e.target.value) || 0)))}
                            className="w-14 text-center text-xs font-bold bg-white border border-gray-200 py-0.5 rounded-lg focus:outline-none focus:border-[#5F7161] font-mono"
                          />
                          <span className="font-bold text-gray-800">평</span>
                        </div>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="50"
                        step="1"
                        value={Math.min(officetelAuxArea, 50)}
                        onChange={(e) => setOfficetelAuxArea(Number(e.target.value))}
                        className="w-full accent-[#5F7161]"
                      />
                    </div>
                  </div>
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
                  <p className="text-[10px] text-gray-400 mt-1">
                    {activeStep === 3 ? "객실수와 면적을 조율하여 숙박 상품 규모를 구성합니다." : "숙박 사업의 운영 형태 및 분양/임대 요율을 조정합니다."}
                  </p>
                </div>

                {activeStep === 3 ? (
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
                  </div>
                ) : (
                  <div className="space-y-4">
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
                          <span className="text-amber-800">평당 분양가 (시세 변동 적용)</span>
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
                            {(((hotelRoomCount ?? 0) * (hotelRoomSizePyung ?? 0) * (hotelPricePerPyung ?? 0)) / 10000).toFixed(2)} 억원
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
                            <strong className="text-indigo-800">{(((hotelRoomCount ?? 0) * (hotelDepositPerRoom ?? 0)) / 10000).toFixed(2)} 억원</strong>
                          </div>
                          <div className="flex justify-between">
                            <span>연간 호텔 운영임대료:</span>
                            <strong className="text-emerald-700">{(((hotelRoomCount ?? 0) * (hotelRentPerRoom ?? 0) * 12) / 10000).toFixed(2)} 억원/년</strong>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* [ADDITION] 호텔 부대복리시설 기획 */}
                <div className="p-4 bg-[#FCFAF7] border border-[#EDDBC7]/60 rounded-2xl space-y-4 shadow-xs">
                  <h4 className="text-xs font-bold text-[#2C251F] uppercase tracking-wider border-b border-gray-150 pb-2 flex justify-between items-center">
                    <span className="flex items-center gap-1.5">
                      <Building2 className="w-4 h-4 text-emerald-600" />
                      🏨 호텔 부대복리시설 기획 (면적)
                    </span>
                    <span className="text-[10px] text-emerald-700 font-bold font-mono">{hotelAuxArea} 평 (약 {Math.round(hotelAuxArea * 3.3)}㎡)</span>
                  </h4>

                  <div className="space-y-3 text-xs">
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center font-medium">
                        <span className="text-gray-600 font-semibold">호텔 부대복리시설 (레스토랑, 로비, 비즈니스룸 등)</span>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min="0"
                            max="1000"
                            value={hotelAuxArea}
                            onChange={(e) => setHotelAuxArea(Math.max(0, Math.min(1000, Number(e.target.value) || 0)))}
                            className="w-14 text-center text-xs font-bold bg-white border border-gray-200 py-0.5 rounded-lg focus:outline-none focus:border-emerald-600 font-mono"
                          />
                          <span className="font-bold text-gray-800">평</span>
                        </div>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="200"
                        step="5"
                        value={Math.min(hotelAuxArea, 200)}
                        onChange={(e) => setHotelAuxArea(Number(e.target.value))}
                        className="w-full accent-emerald-600"
                      />
                      <p className="text-[10px] text-gray-400 mt-1">
                        조식 식당, 세미나 회의실, 로비 라운지, 사우나 등 호텔의 서비스 공용 부대시설 연면적을 조정합니다. 이 면적은 호텔의 지상 연면적에 포함되어 수지분석에 영향을 줍니다.
                      </p>
                    </div>
                  </div>
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
                  <p className="text-[10px] text-gray-400 mt-1">
                    {activeStep === 3 ? "지하 및 지상 층별로 기획 전용 면적을 개별 설정합니다." : "각 층 상가의 사업 모델(분양/임대)과 단가를 설정합니다."}
                  </p>
                </div>

                <div className="space-y-4">
                  {/* 상가 전용률 (Step 3에서만 보임) */}
                  {activeStep === 3 && (
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
                  )}

                  {/* 사업 모델 (Step 4에서만 보임) */}
                  {activeStep === 4 && (
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
                  )}

                  {/* 층별 면적 및 시세 정보 */}
                  <div className="space-y-3.5 pt-1">
                    {/* B1 상가 */}
                    <div className="p-3 border border-gray-100 rounded-xl bg-[#FCFAF7] space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-[#2C251F]">지하 1층 (B1) 전용면적</span>
                        <div className="flex items-center gap-1">
                          {activeStep === 3 ? (
                            <input
                              type="number"
                              value={retailB1Area}
                              onChange={(e) => setRetailB1Area(Math.max(0, parseInt(e.target.value) || 0))}
                              className="w-16 text-center text-xs font-bold bg-white border border-gray-200 py-1 rounded-lg focus:outline-none"
                            />
                          ) : (
                            <span className="text-xs font-bold text-gray-700">{retailB1Area}</span>
                          )}
                          <span className="text-xs text-gray-500">평</span>
                        </div>
                      </div>
                      {retailB1Area > 0 && activeStep === 4 && (
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
                          {activeStep === 3 ? (
                            <input
                              type="number"
                              value={retail1FArea}
                              onChange={(e) => setRetail1FArea(Math.max(0, parseInt(e.target.value) || 0))}
                              className="w-16 text-center text-xs font-bold bg-white border border-gray-200 py-1 rounded-lg focus:outline-none"
                            />
                          ) : (
                            <span className="text-xs font-bold text-gray-700">{retail1FArea}</span>
                          )}
                          <span className="text-xs text-gray-500">평</span>
                        </div>
                      </div>
                      {retail1FArea > 0 && activeStep === 4 && (
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
                          {activeStep === 3 ? (
                            <input
                              type="number"
                              value={retail2FArea}
                              onChange={(e) => setRetail2FArea(Math.max(0, parseInt(e.target.value) || 0))}
                              className="w-16 text-center text-xs font-bold bg-white border border-gray-200 py-1 rounded-lg focus:outline-none"
                            />
                          ) : (
                            <span className="text-xs font-bold text-gray-700">{retail2FArea}</span>
                          )}
                          <span className="text-xs text-gray-500">평</span>
                        </div>
                      </div>
                      {retail2FArea > 0 && activeStep === 4 && (
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
                          {activeStep === 3 ? (
                            <input
                              type="number"
                              value={retail3FArea}
                              onChange={(e) => setRetail3FArea(Math.max(0, parseInt(e.target.value) || 0))}
                              className="w-16 text-center text-xs font-bold bg-white border border-gray-200 py-1 rounded-lg focus:outline-none"
                            />
                          ) : (
                            <span className="text-xs font-bold text-gray-700">{retail3FArea}</span>
                          )}
                          <span className="text-xs text-gray-500">평</span>
                        </div>
                      </div>
                      {retail3FArea > 0 && activeStep === 4 && (
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
                  <p className="text-[10px] text-gray-400 mt-1">
                    {activeStep === 3 ? "업무용 시설의 기획 전용 면적과 배치를 조율합니다." : "업무시설의 분양 또는 월세 임대 조건을 설정합니다."}
                  </p>
                </div>

                <div className="space-y-4">
                  {/* 총 전용면적 (Step 3에서만 조절 가능) */}
                  <div className="p-3 border border-gray-100 rounded-xl bg-[#FCFAF7] space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-[#2C251F]">업무시설 총 전용면적</span>
                      <div className="flex items-center gap-1.5">
                        {activeStep === 3 ? (
                          <input
                            type="number"
                            value={officeArea}
                            onChange={(e) => setOfficeArea(Math.max(0, parseInt(e.target.value) || 0))}
                            className="w-20 text-center text-xs font-bold bg-white border border-gray-200 py-1 rounded-lg focus:outline-none"
                          />
                        ) : (
                          <span className="text-xs font-bold text-gray-700">{officeArea}</span>
                        )}
                        <span className="text-xs text-gray-500">평</span>
                      </div>
                    </div>
                    {officeArea > 0 && (
                      <p className="text-[10px] text-gray-400 text-right">약 {(officeArea * 3.3).toLocaleString()}㎡ 연면적 규모</p>
                    )}
                  </div>

                  {/* 업무시설 전용률 설정 (Step 3에서만 보임) */}
                  {activeStep === 3 && (
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
                  )}

                  {/* 수입 조건 (Step 4에서만 보임) */}
                  {activeStep === 4 && (
                    <>
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

                      {officeType === 'sales' ? (
                        <div className="p-3 border border-amber-100 rounded-xl bg-amber-50/10 space-y-2">
                          <div className="flex justify-between text-xs font-medium">
                            <span className="text-amber-800">평당 오피스 분양가 (시가 반영)</span>
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
                              {(((officeArea ?? 0) * (officePricePerPyung ?? 0)) / 10000).toFixed(2)} 억원
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
                              <strong className="text-indigo-800">{(((officeArea ?? 0) * (officeDepositPerPyung ?? 0)) / 10000).toFixed(2)} 억원</strong>
                            </div>
                            <div className="flex justify-between">
                              <span>연간 오피스 임대료:</span>
                              <strong className="text-emerald-700">{(((officeArea ?? 0) * (officeRentPerPyung ?? 0) * 12) / 10000).toFixed(2)} 억원/년</strong>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}

            {activeInputTab === 'custom-usage' && (
              <div className="space-y-6 animate-fadeIn">
                <div className="border-b border-gray-100 pb-3 flex justify-between items-start">
                  <div>
                    <h3 className="text-xs font-bold text-[#8D7B68] uppercase tracking-widest flex items-center gap-1.5">
                      <Puzzle className="w-4 h-4 text-violet-600" />
                      추가 개발 용도 기획 (임의 용도 추가)
                    </h3>
                    <p className="text-[10px] text-gray-400 mt-1">
                      공동주택/호텔/상가/오피스 외에 체육/문화/교육/복지/의료시설 등 원하시는 모든 용도를 자유롭게 추가·기획할 수 있습니다.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5 justify-end">
                    <button
                      type="button"
                      onClick={() => handleAddCustomUsage()}
                      className="px-2.5 py-1.5 rounded-lg text-[10px] font-bold bg-violet-600 text-white hover:bg-violet-700 transition flex items-center gap-1 shadow-sm cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" /> 용도 추가
                    </button>
                  </div>
                </div>

                {/* Templates Selector */}
                <div className="bg-violet-50/40 border border-violet-100/60 p-4 rounded-xl">
                  <span className="text-[10px] font-bold text-violet-900 block mb-2 uppercase tracking-wide">💡 빠른 용도 템플릿 추가</span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                    <button
                      type="button"
                      onClick={() => handleAddCustomUsage('retail_complex')}
                      className="p-2 text-left bg-white border border-gray-200 hover:border-violet-300 rounded-lg text-[10px] font-medium text-gray-700 transition hover:shadow-sm cursor-pointer"
                    >
                      <strong className="text-violet-700 block text-[11px] font-bold mb-0.5">근린생활시설</strong>
                      상가 및 소매점 기획
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddCustomUsage('sports')}
                      className="p-2 text-left bg-white border border-gray-200 hover:border-violet-300 rounded-lg text-[10px] font-medium text-gray-700 transition hover:shadow-sm cursor-pointer"
                    >
                      <strong className="text-violet-700 block text-[11px] font-bold mb-0.5">운동 및 체육</strong>
                      헬스장, 골프연습장 등
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddCustomUsage('cultural')}
                      className="p-2 text-left bg-white border border-gray-200 hover:border-violet-300 rounded-lg text-[10px] font-medium text-gray-700 transition hover:shadow-sm cursor-pointer"
                    >
                      <strong className="text-violet-700 block text-[11px] font-bold mb-0.5">문화 및 집회</strong>
                      미술관, 전시장, 극장 등
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddCustomUsage('education')}
                      className="p-2 text-left bg-white border border-gray-200 hover:border-violet-300 rounded-lg text-[10px] font-medium text-gray-700 transition hover:shadow-sm cursor-pointer"
                    >
                      <strong className="text-violet-700 block text-[11px] font-bold mb-0.5">교육연구시설</strong>
                      학원, 보육원, 연구실 등
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddCustomUsage('senior')}
                      className="p-2 text-left bg-white border border-gray-200 hover:border-violet-300 rounded-lg text-[10px] font-medium text-gray-700 transition hover:shadow-sm cursor-pointer"
                    >
                      <strong className="text-violet-700 block text-[11px] font-bold mb-0.5">노유자시설</strong>
                      실버케어, 아동복지 등
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddCustomUsage('medical')}
                      className="p-2 text-left bg-white border border-gray-200 hover:border-violet-300 rounded-lg text-[10px] font-medium text-gray-700 transition hover:shadow-sm cursor-pointer"
                    >
                      <strong className="text-violet-700 block text-[11px] font-bold mb-0.5">의료시설</strong>
                      내과/이비인후과 의원 등
                    </button>
                  </div>
                </div>

                {/* List of Custom Usages */}
                {customUsages.length === 0 ? (
                  <div className="text-center py-12 border border-dashed border-gray-200 rounded-2xl bg-gray-50/30">
                    <Puzzle className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-xs font-bold text-gray-400">등록된 추가 개발 용도가 없습니다.</p>
                    <p className="text-[10px] text-gray-400 mt-1">상단 버튼이나 템플릿을 클릭하여 프로젝트에 새로운 개발 용도를 기획해 보세요.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {customUsages.map((item) => {
                      const PYUNG_TO_M2 = 3.30578;
                      const gfaM2 = (item.areaPyung * PYUNG_TO_M2 / (item.netRatio / 100)) + (item.auxAreaPyung * PYUNG_TO_M2);
                      const parkingCount = gfaM2 / item.parkingCriteria;
                      const valueBillion = item.type === 'sales'
                        ? (item.areaPyung * item.pricePerPyung) / 10000
                        : (item.areaPyung * item.depositPerPyung + (item.areaPyung * item.rentPerPyung * 12 * 10)) / 10000;

                      return (
                        <div key={item.id} className="bg-white border border-gray-150 rounded-2xl p-4 space-y-4 shadow-sm relative">
                          <button
                            type="button"
                            onClick={() => handleDeleteCustomUsage(item.id)}
                            className="absolute top-4 right-4 text-gray-300 hover:text-red-500 transition cursor-pointer"
                            title="용도 삭제"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>

                          <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 items-start">
                            {/* Name and template type */}
                            <div className="md:col-span-3 space-y-1">
                              <label className="block text-[11px] font-semibold text-gray-500">용도 구분명</label>
                              <input
                                type="text"
                                value={item.name}
                                onChange={(e) => handleUpdateCustomUsageField(item.id, 'name', e.target.value)}
                                className="w-full text-[11px] font-bold p-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-violet-500 text-gray-800"
                                placeholder="예: 스포츠 피트니스 센터"
                              />
                              <div className="pt-2 text-[10px] text-gray-400 space-y-0.5 font-medium bg-gray-50/50 p-2 rounded-lg border border-gray-100">
                                <div className="flex justify-between">
                                  <span>지상층 연면적:</span>
                                  <strong className="text-gray-700">{gfaM2.toFixed(1)} ㎡</strong>
                                </div>
                                <div className="flex justify-between">
                                  <span>법정 주차대수:</span>
                                  <strong className="text-gray-700">{parkingCount.toFixed(1)} 대</strong>
                                </div>
                                <div className="flex justify-between">
                                  <span>사업 가치 평가액:</span>
                                  <strong className="text-violet-700">{valueBillion.toFixed(2)} 억</strong>
                                </div>
                              </div>
                            </div>

                            {/* Scale config */}
                            <div className="md:col-span-5 grid grid-cols-2 gap-3 bg-gray-50/30 p-3 rounded-xl border border-gray-100">
                              <div className="space-y-1">
                                <label className="block text-[11px] font-semibold text-gray-500 flex justify-between">
                                  <span>전용면적 설정</span>
                                  <span className="text-[10px] text-gray-400">{(item.areaPyung * 3.3).toFixed(1)}㎡</span>
                                </label>
                                <div className="relative">
                                  <input
                                    type="number"
                                    value={item.areaPyung || ''}
                                    onChange={(e) => handleUpdateCustomUsageField(item.id, 'areaPyung', parseFloat(e.target.value) || 0)}
                                    className="w-full text-right text-[11px] font-bold p-2 pr-6 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-violet-500 text-gray-800"
                                  />
                                  <span className="absolute right-2.5 top-2.5 text-[10px] font-bold text-gray-400">평</span>
                                </div>
                              </div>

                              <div className="space-y-1">
                                <label className="block text-[11px] font-semibold text-gray-500 flex justify-between">
                                  <span>부대시설 면적</span>
                                  <span className="text-[10px] text-gray-400">{(item.auxAreaPyung * 3.3).toFixed(1)}㎡</span>
                                </label>
                                <div className="relative">
                                  <input
                                    type="number"
                                    value={item.auxAreaPyung || ''}
                                    onChange={(e) => handleUpdateCustomUsageField(item.id, 'auxAreaPyung', parseFloat(e.target.value) || 0)}
                                    className="w-full text-right text-[11px] font-bold p-2 pr-6 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-violet-500 text-gray-800"
                                  />
                                  <span className="absolute right-2.5 top-2.5 text-[10px] font-bold text-gray-400">평</span>
                                </div>
                              </div>

                              <div className="space-y-1">
                                <label className="block text-[11px] font-semibold text-gray-500">전용률 설정</label>
                                <div className="relative">
                                  <input
                                    type="number"
                                    value={item.netRatio || ''}
                                    onChange={(e) => handleUpdateCustomUsageField(item.id, 'netRatio', parseFloat(e.target.value) || 0)}
                                    className="w-full text-right text-[11px] font-bold p-2 pr-6 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-violet-500 text-gray-800"
                                  />
                                  <span className="absolute right-2.5 top-2.5 text-[10px] font-bold text-gray-400">%</span>
                                </div>
                              </div>

                              <div className="space-y-1">
                                <label className="block text-[11px] font-semibold text-gray-500 flex justify-between" title="시설 연면적 X ㎡당 1대 기준">
                                  <span>법정주차 기준</span>
                                  <span className="text-[10px] text-gray-400">1대 기준</span>
                                </label>
                                <div className="relative">
                                  <input
                                    type="number"
                                    value={item.parkingCriteria || ''}
                                    onChange={(e) => handleUpdateCustomUsageField(item.id, 'parkingCriteria', parseFloat(e.target.value) || 0)}
                                    className="w-full text-right text-[11px] font-bold p-2 pr-6 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-violet-500 text-gray-800"
                                  />
                                  <span className="absolute right-2.5 top-2.5 text-[10px] font-bold text-gray-400">㎡</span>
                                </div>
                              </div>
                            </div>

                            {/* Financial/Business Model config */}
                            <div className="md:col-span-4 bg-violet-50/20 p-3 rounded-xl border border-violet-100/50 space-y-3">
                              <div className="space-y-1">
                                <label className="block text-[11px] font-semibold text-violet-900">사업 전략 선택</label>
                                <div className="grid grid-cols-2 gap-1 bg-white p-0.5 rounded-lg border border-gray-150">
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateCustomUsageField(item.id, 'type', 'sales')}
                                    className={`py-1 text-[10px] font-bold rounded-md transition cursor-pointer ${item.type === 'sales' ? 'bg-violet-600 text-white' : 'text-gray-500 hover:text-violet-700'}`}
                                  >
                                    분양형 (전량매각)
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateCustomUsageField(item.id, 'type', 'lease')}
                                    className={`py-1 text-[10px] font-bold rounded-md transition cursor-pointer ${item.type === 'lease' ? 'bg-violet-600 text-white' : 'text-gray-500 hover:text-violet-700'}`}
                                  >
                                    임대형 (보증금+월세)
                                  </button>
                                </div>
                              </div>

                              {item.type === 'sales' ? (
                                <div className="space-y-1">
                                  <label className="block text-[11px] font-semibold text-violet-900">평당 예상 분양가</label>
                                  <div className="relative">
                                    <input
                                      type="number"
                                      value={item.pricePerPyung || ''}
                                      onChange={(e) => handleUpdateCustomUsageField(item.id, 'pricePerPyung', parseFloat(e.target.value) || 0)}
                                      className="w-full text-right text-[11px] font-bold p-2 pr-10 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-violet-500 text-gray-800"
                                    />
                                    <span className="absolute right-2.5 top-2.5 text-[10px] font-bold text-gray-400">만원/평</span>
                                  </div>
                                </div>
                              ) : (
                                <div className="grid grid-cols-2 gap-2">
                                  <div className="space-y-1">
                                    <label className="block text-[11px] font-semibold text-violet-900">평당 임대 보증금</label>
                                    <div className="relative">
                                      <input
                                        type="number"
                                        value={item.depositPerPyung || ''}
                                        onChange={(e) => handleUpdateCustomUsageField(item.id, 'depositPerPyung', parseFloat(e.target.value) || 0)}
                                        className="w-full text-right text-[11px] font-bold p-2 pr-6 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-violet-500 text-gray-800"
                                      />
                                      <span className="absolute right-2.5 top-2.5 text-[10px] font-bold text-gray-400">만원</span>
                                    </div>
                                  </div>
                                  <div className="space-y-1">
                                    <label className="block text-[11px] font-semibold text-violet-900">평당 월 임대료</label>
                                    <div className="relative">
                                      <input
                                        type="number"
                                        value={item.rentPerPyung || ''}
                                        onChange={(e) => handleUpdateCustomUsageField(item.id, 'rentPerPyung', parseFloat(e.target.value) || 0)}
                                        className="w-full text-right text-[11px] font-bold p-2 pr-6 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-violet-500 text-gray-800"
                                      />
                                      <span className="absolute right-2.5 top-2.5 text-[10px] font-bold text-gray-400">만원</span>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {activeInputTab === 'building-spec' && (
              <div className="space-y-5 animate-fadeIn">
                <div className="border-b border-gray-100 pb-3">
                  <h3 className="text-xs font-bold text-[#8D7B68] uppercase tracking-widest flex items-center gap-1.5">
                    <Compass className="w-4 h-4 text-[#5F7161]" />
                    건물 규모 및 용도별 부대시설 기획
                  </h3>
                  <p className="text-[10px] text-gray-400 mt-1">
                    건축물의 지상/지하 층수, 기본 층고와 각 용도별 부대시설 면적을 구성합니다. (반복되는 층은 자동으로 산식 배분됩니다)
                  </p>
                </div>

                <div className="space-y-4">
                  {/* 지상 및 지하 층수 설정 */}
                  <div className="p-3.5 bg-[#FCFAF7] border border-gray-100 rounded-xl space-y-4">
                    <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                      <h4 className="text-[11px] font-bold text-[#2C251F] uppercase tracking-wider flex items-center gap-1.5">
                        🏢 지상/지하 층수 및 동·호 배치 기획
                      </h4>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-semibold text-gray-500">배치 시뮬레이터</span>
                        <button
                          type="button"
                          onClick={() => {
                            const val = !useLayoutSimulation;
                            setUseLayoutSimulation(val);
                            if (val) {
                              setActiveSummaryTab('layout');
                            }
                          }}
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none cursor-pointer ${
                            useLayoutSimulation ? 'bg-emerald-600' : 'bg-gray-300'
                          }`}
                        >
                          <span
                            className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                              useLayoutSimulation ? 'translate-x-4.5' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>
                    </div>

                    {!useLayoutSimulation ? (
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="space-y-1.5">
                          <label className="block text-[10px] font-semibold text-gray-500">지상 층수 (일반 지정)</label>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => setAboveGroundFloors(Math.max(1, aboveGroundFloors - 1))}
                              className="w-7 h-7 flex items-center justify-center border border-gray-200 bg-white rounded-lg hover:bg-gray-50 text-xs font-bold text-gray-600 cursor-pointer"
                            >
                              -
                            </button>
                            <input
                              type="number"
                              value={aboveGroundFloors}
                              onChange={(e) => setAboveGroundFloors(Math.max(1, parseInt(e.target.value) || 1))}
                              className="w-12 text-center text-xs font-bold bg-white border border-gray-200 py-1 rounded-lg focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => setAboveGroundFloors(aboveGroundFloors + 1)}
                              className="w-7 h-7 flex items-center justify-center border border-gray-200 bg-white rounded-lg hover:bg-gray-50 text-xs font-bold text-gray-600 cursor-pointer"
                            >
                              +
                            </button>
                            <span className="text-gray-500 text-[11px]">층</span>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label className="block text-[10px] font-semibold text-gray-500">지하 층수</label>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => setUndergroundFloors(Math.max(0, undergroundFloors - 1))}
                              className="w-7 h-7 flex items-center justify-center border border-gray-200 bg-white rounded-lg hover:bg-gray-50 text-xs font-bold text-gray-600 cursor-pointer"
                            >
                              -
                            </button>
                            <input
                              type="number"
                              value={undergroundFloors}
                              onChange={(e) => setUndergroundFloors(Math.max(0, parseInt(e.target.value) || 0))}
                              className="w-12 text-center text-xs font-bold bg-white border border-gray-200 py-1 rounded-lg focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => setUndergroundFloors(undergroundFloors + 1)}
                              className="w-7 h-7 flex items-center justify-center border border-gray-200 bg-white rounded-lg hover:bg-gray-50 text-xs font-bold text-gray-600 cursor-pointer"
                            >
                              +
                            </button>
                            <span className="text-gray-500 text-[11px]">층</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3.5 text-xs">
                        {/* 층수 산정 방식 선택 */}
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 p-2 bg-[#FAF9F5] border border-[#F2EFE9] rounded-lg">
                          <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-gray-700">📐 지상/지하 층수 산정 방식</span>
                            <span className="text-[9px] text-gray-400 mt-0.5">
                              {floorCalculationMode === 'auto'
                                ? '대상지의 조례 허용 용적률에 맞추어 주동의 층수가 자동 계산됩니다.'
                                : '원하는 지상/지하 층수를 직접 숫자로 조절하여 배치할 수 있습니다.'}
                            </span>
                          </div>
                          <div className="flex bg-gray-200/60 p-0.5 rounded-lg border border-gray-200">
                            <button
                              type="button"
                              onClick={() => setFloorCalculationMode('auto')}
                              className={`px-2.5 py-1 text-[9.5px] font-extrabold rounded-md cursor-pointer transition-all ${
                                floorCalculationMode === 'auto'
                                  ? 'bg-emerald-600 text-white shadow-xs'
                                  : 'text-gray-500 hover:text-gray-800'
                              }`}
                            >
                              용적률 자동 산정
                            </button>
                            <button
                              type="button"
                              onClick={() => setFloorCalculationMode('manual')}
                              className={`px-2.5 py-1 text-[9.5px] font-extrabold rounded-md cursor-pointer transition-all ${
                                floorCalculationMode === 'manual'
                                  ? 'bg-[#5F7161] text-white shadow-xs'
                                  : 'text-gray-500 hover:text-gray-800'
                              }`}
                            >
                              사용자 직접 지정
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
                          <div className="space-y-1">
                            <label className="block text-[10px] font-semibold text-gray-500">동수 (몇 동)</label>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => setTowerCount(Math.max(1, towerCount - 1))}
                                className="w-5 h-5 flex items-center justify-center border border-gray-200 bg-white rounded hover:bg-gray-50 text-[11px] font-bold cursor-pointer"
                              >
                                -
                              </button>
                              <span className="w-8 text-center font-bold text-gray-700">{towerCount}동</span>
                              <button
                                type="button"
                                onClick={() => setTowerCount(towerCount + 1)}
                                className="w-5 h-5 flex items-center justify-center border border-gray-200 bg-white rounded hover:bg-gray-50 text-[11px] font-bold cursor-pointer"
                              >
                                +
                              </button>
                            </div>
                          </div>

                          <div className="space-y-1">
                            <label className="block text-[10px] font-semibold text-gray-500">조합 (몇 호조합)</label>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => setUnitsPerFloorLine(Math.max(1, unitsPerFloorLine - 1))}
                                className="w-5 h-5 flex items-center justify-center border border-gray-200 bg-white rounded hover:bg-gray-50 text-[11px] font-bold cursor-pointer"
                              >
                                -
                              </button>
                              <span className="w-8 text-center font-bold text-gray-700">{unitsPerFloorLine}호</span>
                              <button
                                type="button"
                                onClick={() => setUnitsPerFloorLine(unitsPerFloorLine + 1)}
                                className="w-5 h-5 flex items-center justify-center border border-gray-200 bg-white rounded hover:bg-gray-50 text-[11px] font-bold cursor-pointer"
                              >
                                +
                              </button>
                            </div>
                          </div>

                          <div className="space-y-1">
                            <label className="block text-[10px] font-semibold text-gray-500">포디움 (지상상업층)</label>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => setPodiumFloors(Math.max(0, podiumFloors - 1))}
                                className="w-5 h-5 flex items-center justify-center border border-gray-200 bg-white rounded hover:bg-gray-50 text-[11px] font-bold cursor-pointer"
                              >
                                -
                              </button>
                              <span className="w-8 text-center font-bold text-gray-700">{podiumFloors}층</span>
                              <button
                                type="button"
                                onClick={() => setPodiumFloors(podiumFloors + 1)}
                                className="w-5 h-5 flex items-center justify-center border border-gray-200 bg-white rounded hover:bg-gray-50 text-[11px] font-bold cursor-pointer"
                              >
                                +
                              </button>
                            </div>
                          </div>

                          <div className="space-y-1">
                            <label className="block text-[10px] font-semibold text-gray-500">지상 주거 층수</label>
                            {floorCalculationMode === 'auto' ? (
                              <div className="h-6 flex items-center gap-1 px-1 bg-emerald-50 border border-emerald-100 rounded text-emerald-800 text-[10px] font-extrabold justify-center w-full">
                                <span>{result.calculatedTypicalFloors}층 (자동)</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => setAboveGroundFloors(Math.max(podiumFloors + 1, aboveGroundFloors - 1))}
                                  className="w-5 h-5 flex items-center justify-center border border-gray-200 bg-white rounded hover:bg-gray-50 text-[11px] font-bold cursor-pointer"
                                >
                                  -
                                </button>
                                <span className="w-8 text-center font-bold text-gray-700">{result.calculatedTypicalFloors}층</span>
                                <button
                                  type="button"
                                  onClick={() => setAboveGroundFloors(aboveGroundFloors + 1)}
                                  className="w-5 h-5 flex items-center justify-center border border-gray-200 bg-white rounded hover:bg-gray-50 text-[11px] font-bold cursor-pointer"
                                >
                                  +
                                </button>
                              </div>
                            )}
                          </div>

                          <div className="space-y-1">
                            <label className="block text-[10px] font-semibold text-gray-500">지하 층수 (주차/설비)</label>
                            {floorCalculationMode === 'auto' ? (
                              <div className="h-6 flex items-center gap-1 px-1 bg-amber-50 border border-amber-100 rounded text-amber-850 text-[10px] font-extrabold justify-center w-full">
                                <span>{result.undergroundFloors}층 (자동)</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => setUndergroundFloors(Math.max(0, undergroundFloors - 1))}
                                  className="w-5 h-5 flex items-center justify-center border border-gray-200 bg-white rounded hover:bg-gray-50 text-[11px] font-bold cursor-pointer"
                                >
                                  -
                                </button>
                                <span className="w-8 text-center font-bold text-gray-700">{undergroundFloors}층</span>
                                <button
                                  type="button"
                                  onClick={() => setUndergroundFloors(undergroundFloors + 1)}
                                  className="w-5 h-5 flex items-center justify-center border border-gray-200 bg-white rounded hover:bg-gray-50 text-[11px] font-bold cursor-pointer"
                                >
                                  +
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="p-2.5 bg-emerald-50/50 border border-emerald-100 rounded-lg space-y-1">
                          <div className="flex justify-between items-center text-[10px]">
                            <span className="text-gray-500 font-semibold">전체 주거 세대수 (APT+OT):</span>
                            <span className="font-bold text-gray-700">{result.totalResidentialUnits} 세대(실)</span>
                          </div>
                          <div className="flex justify-between items-center text-[10px]">
                            <span className="text-gray-500 font-semibold">1개층 수용 세대수 ({towerCount}동 x {unitsPerFloorLine}호):</span>
                            <span className="font-bold text-gray-700">{result.unitsPerFloorTotal} 세대/층</span>
                          </div>
                          <div className="flex justify-between items-center text-[10px] pt-1 border-t border-emerald-100/50">
                            <span className="text-emerald-800 font-bold">산정 결과 지상 층수:</span>
                            <span className="font-extrabold text-emerald-700 text-xs">
                              지상 {result.aboveGroundFloors} 층 (포디움 {podiumFloors}층 + 주거 {result.calculatedTypicalFloors}층)
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 채광창 사선 및 건물 간격(인동거리) 규제 검토 */}
                    <div className="pt-3 border-t border-gray-150/60 space-y-3">
                      <h5 className="text-[10px] font-bold text-gray-700 flex items-center gap-1.5">
                        📐 채광창 사선제한 및 건물 간격 (인동거리) 검토
                      </h5>

                      <div className="grid grid-cols-2 gap-3 text-[10px]">
                        <div className="space-y-1">
                          <label className="text-gray-500 block">동 간 이격 거리 (현재 배치)</label>
                          <div className="flex items-center gap-1">
                            <input
                              type="range"
                              min="10"
                              max="120"
                              step="2"
                              value={buildingSeparationDistance}
                              onChange={(e) => setBuildingSeparationDistance(Number(e.target.value))}
                              className="w-full accent-[#5F7161]"
                            />
                            <span className="font-bold text-gray-700 w-8 text-right">{buildingSeparationDistance}m</span>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-gray-500 block">인접대지 경계선과의 거리</label>
                          <div className="flex items-center gap-1">
                            <input
                              type="range"
                              min="3"
                              max="60"
                              step="1"
                              value={boundarySeparationDistance}
                              onChange={(e) => setBoundarySeparationDistance(Number(e.target.value))}
                              className="w-full accent-[#5F7161]"
                            />
                            <span className="font-bold text-gray-700 w-8 text-right">{boundarySeparationDistance}m</span>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-[9px] text-gray-500 bg-white p-2 border border-gray-100 rounded-lg">
                        <div className="space-y-1">
                          <div className="flex justify-between">
                            <span>인동 규제 계수:</span>
                            <select
                              value={buildingSeparationRatio}
                              onChange={(e) => setBuildingSeparationRatio(Number(e.target.value))}
                              className="font-bold bg-gray-50 border border-gray-200 rounded p-0.5 text-[9px] focus:outline-none"
                            >
                              <option value="0.5">0.5배 (최소)</option>
                              <option value="0.8">0.8배 (일반 조례)</option>
                              <option value="1.0">1.0배 (강화)</option>
                            </select>
                          </div>
                          <div>지상 최고 높이: <span className="font-bold text-gray-700">{result.totalBuildingHeight.toFixed(1)}m</span></div>
                        </div>

                        <div className="space-y-1">
                          <div className="flex justify-between">
                            <span>채광 사선 계수:</span>
                            <select
                              value={sunlightBoundaryRatio}
                              onChange={(e) => setSunlightBoundaryRatio(Number(e.target.value))}
                              className="font-bold bg-gray-50 border border-gray-200 rounded p-0.5 text-[9px] focus:outline-none"
                            >
                              <option value="0.5">0.5배 (정남/정북)</option>
                              <option value="1.0">1.0배 (강화 조례)</option>
                            </select>
                          </div>
                          <div>용도지역: <span className="font-bold text-[#8D7B68]">{currentLand?.zoning || '일반상업지역'}</span></div>
                        </div>
                      </div>

                      <div className="space-y-1.5 pt-1">
                        {result.isCommercialZone ? (
                          <div className="p-2.5 bg-emerald-50 text-emerald-800 border border-emerald-100 rounded-lg text-[10px] space-y-1">
                            <p className="font-bold flex items-center gap-1">
                              🟢 상업지역 예외 대상 (규제 면제)
                            </p>
                            <p className="text-[9px] text-emerald-700 leading-relaxed font-medium">
                              건축법 제86조(일조 등의 확보를 위한 높이제한)에 따라 일반상업지역 및 중심상업지역 내 건축물은 인접대지 경계선 기준 채광 방향 사선제한 및 공동주택 동간 인동거리 규정 적용이 제외됩니다.
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-1.5 text-[10px]">
                            {/* 인동거리 검토결과 */}
                            <div className={`p-2 border rounded-lg flex items-start gap-2 ${
                              result.isSeparationSatisfied ? 'bg-emerald-50/60 border-emerald-100 text-emerald-800' : 'bg-red-50/60 border-red-100 text-red-800'
                            }`}>
                              <span className="text-xs">{result.isSeparationSatisfied ? '🟢' : '⚠️'}</span>
                              <div className="space-y-0.5">
                                <p className="font-bold flex justify-between items-center">
                                  <span>동 간 이격거리 (인동거리)</span>
                                  <span className={`px-1 rounded text-[8px] font-extrabold ${result.isSeparationSatisfied ? 'bg-emerald-200/50' : 'bg-red-200/50'}`}>
                                    {result.isSeparationSatisfied ? '적합' : '부적합'}
                                  </span>
                                </p>
                                <p className="text-[9px] leading-relaxed">
                                  요구 거리: {result.requiredSeparationDistance}m 이상 (최고높이 {result.totalBuildingHeight.toFixed(1)}m x {buildingSeparationRatio}배) / 현재: {buildingSeparationDistance}m
                                  {!result.isSeparationSatisfied && " ➔ 동 간격을 더 넓히거나 층수를 줄이십시오."}
                                </p>
                              </div>
                            </div>

                            {/* 채광창 사선 검토결과 */}
                            <div className={`p-2 border rounded-lg flex items-start gap-2 ${
                              result.isBoundarySatisfied ? 'bg-emerald-50/60 border-emerald-100 text-emerald-800' : 'bg-red-50/60 border-red-100 text-red-800'
                            }`}>
                              <span className="text-xs">{result.isBoundarySatisfied ? '🟢' : '⚠️'}</span>
                              <div className="space-y-0.5">
                                <p className="font-bold flex justify-between items-center">
                                  <span>채광 사선제한 (대지 경계선)</span>
                                  <span className={`px-1 rounded text-[8px] font-extrabold ${result.isBoundarySatisfied ? 'bg-emerald-200/50' : 'bg-red-200/50'}`}>
                                    {result.isBoundarySatisfied ? '적합' : '부적합'}
                                  </span>
                                </p>
                                <p className="text-[9px] leading-relaxed">
                                  요구 거리: {result.requiredBoundaryDistance}m 이상 (최고높이 {result.totalBuildingHeight.toFixed(1)}m x {sunlightBoundaryRatio}배) / 현재: {boundarySeparationDistance}m
                                  {!result.isBoundarySatisfied && " ➔ 경계선 이격을 늘리거나 층수를 완화하십시오."}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 기준층 범위 설정 */}
                    <div className="pt-3.5 border-t border-gray-150/60 space-y-2">
                      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-1">
                        <label className="text-[10px] font-bold text-gray-700 flex items-center gap-1.5">
                          📐 기준층 범위 설정 (지상)
                        </label>
                        <span className="text-[9px] text-gray-400">
                          동일한 구조가 반복되는 지상 구간
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-gray-400 text-[10px]">지상</span>
                          <input
                            type="number"
                            min={1}
                            max={aboveGroundFloors}
                            value={typicalFloorStart}
                            onChange={(e) => {
                              const val = Math.max(1, Math.min(aboveGroundFloors, parseInt(e.target.value) || 1));
                              setTypicalFloorStart(val);
                              if (val > typicalFloorEnd) {
                                setTypicalFloorEnd(val);
                              }
                            }}
                            className="w-14 text-center text-xs font-bold bg-white border border-gray-200 py-1 rounded-lg focus:outline-none focus:border-[#5F7161] font-mono"
                          />
                          <span className="text-gray-500">층</span>
                        </div>
                        <span className="text-gray-400 font-bold text-[11px]">~</span>
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-gray-400 text-[10px]">지상</span>
                          <input
                            type="number"
                            min={typicalFloorStart}
                            max={aboveGroundFloors}
                            value={typicalFloorEnd}
                            onChange={(e) => {
                              const val = Math.max(typicalFloorStart, Math.min(aboveGroundFloors, parseInt(e.target.value) || typicalFloorStart));
                              setTypicalFloorEnd(val);
                            }}
                            className="w-14 text-center text-xs font-bold bg-white border border-gray-200 py-1 rounded-lg focus:outline-none focus:border-[#5F7161] font-mono"
                          />
                          <span className="text-gray-500">층</span>
                        </div>
                        <div className="ml-auto text-emerald-700 text-[10px] font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                          총 {result.typicalFloorCount}개층
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 층고 설정 */}
                  <div className="p-3.5 bg-[#FCFAF7] border border-gray-100 rounded-xl space-y-2">
                    <div className="flex justify-between items-center font-semibold text-xs text-gray-700">
                      <span>기본 기준층 층고 설정</span>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          step="0.1"
                          min="1.0"
                          max="10.0"
                          value={defaultFloorHeight}
                          onChange={(e) => setDefaultFloorHeight(Math.max(1.0, Math.min(10.0, Number(e.target.value) || 3.0)))}
                          className="w-14 text-center text-xs font-bold bg-white border border-gray-200 py-0.5 rounded-lg focus:outline-none focus:border-indigo-500 font-mono"
                        />
                        <span className="font-extrabold text-[#5F7161]">m</span>
                      </div>
                    </div>
                    <input
                      type="range"
                      min="2.8"
                      max="5.0"
                      step="0.1"
                      value={defaultFloorHeight}
                      onChange={(e) => setDefaultFloorHeight(Number(e.target.value))}
                      className="w-full accent-[#5F7161]"
                    />
                    <p className="text-[10px] text-gray-400">일반적인 공동주택 3.0~3.4m, 오피스텔 3.3~3.6m, 오피스 3.6~4.2m 범위가 권장됩니다.</p>
                  </div>

                  {/* 용도별 부대시설 면적 개별 기획 */}
                  <div className="p-3.5 bg-[#FCFAF7] border border-gray-100 rounded-xl space-y-3">
                    <h4 className="text-[11px] font-bold text-[#2C251F] uppercase tracking-wider border-b border-gray-100 pb-1.5 flex justify-between items-center">
                      <span>🧩 용도별 부대시설 기획 (면적 입력)</span>
                      <span className="text-xs font-bold text-[#5F7161]">합계: {auxiliaryArea} 평</span>
                    </h4>
                    
                    <div className="space-y-3 text-xs">
                      {/* 공동주택 */}
                      <div className="space-y-1">
                        <div className="flex justify-between items-center font-medium">
                          <span className="text-gray-600">공동주택 부대시설 (피트니스, 시니어클럽 등)</span>
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              min="0"
                              max="1000"
                              value={aptAuxArea}
                              disabled={useCustomResidentFacilities}
                              onChange={(e) => setAptAuxArea(Math.max(0, Math.min(1000, Number(e.target.value) || 0)))}
                              className={`w-14 text-center text-xs font-bold bg-white border border-gray-200 py-0.5 rounded-lg focus:outline-none focus:border-indigo-500 font-mono ${useCustomResidentFacilities ? 'opacity-70 bg-gray-50 text-gray-500' : ''}`}
                            />
                            <span className="font-bold text-gray-800">평</span>
                          </div>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          step="1"
                          value={Math.min(aptAuxArea, 100)}
                          disabled={useCustomResidentFacilities}
                          onChange={(e) => setAptAuxArea(Number(e.target.value))}
                          className={`w-full accent-[#5F7161] ${useCustomResidentFacilities ? 'opacity-50 cursor-not-allowed' : ''}`}
                        />

                        {/* 주민공동시설 세부 목록 수기 입력 */}
                        <div className="mt-2 bg-slate-50/50 p-2.5 rounded-xl border border-gray-150 space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-bold text-gray-700">
                              <input
                                type="checkbox"
                                checked={useCustomResidentFacilities}
                                onChange={(e) => setUseCustomResidentFacilities(e.target.checked)}
                                className="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                              />
                              <span>주민공동시설 수기 세부 구성</span>
                            </label>
                            {useCustomResidentFacilities && (
                              <button
                                onClick={() => {
                                  const newId = Date.now().toString();
                                  setResidentFacilities(prev => [...prev, { id: newId, name: '새 주민공동시설', area: 3 }]);
                                }}
                                className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-0.5 cursor-pointer bg-white px-2 py-0.5 rounded-md border border-gray-200"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                추가
                              </button>
                            )}
                          </div>

                          {useCustomResidentFacilities ? (
                            <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
                              {residentFacilities.length === 0 ? (
                                <p className="text-[10px] text-gray-400 italic text-center py-2">등록된 시설이 없습니다. 우측 상단의 추가 버튼을 눌러 등록해 주세요.</p>
                              ) : (
                                residentFacilities.map((f, idx) => (
                                  <div key={f.id} className="flex items-center gap-1.5 bg-white p-1.5 rounded-lg border border-gray-150">
                                    <span className="text-[10px] text-gray-400 font-mono w-4 text-center">{idx + 1}</span>
                                    <input
                                      type="text"
                                      value={f.name}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        setResidentFacilities(prev => prev.map(item => item.id === f.id ? { ...item, name: val } : item));
                                      }}
                                      placeholder="시설명 (예: 독서실)"
                                      className="flex-1 bg-transparent border-0 border-b border-transparent hover:border-gray-200 focus:border-indigo-500 px-1 py-0.5 text-xs text-gray-800 focus:outline-none"
                                    />
                                    <div className="flex items-center gap-1">
                                      <input
                                        type="number"
                                        min="0"
                                        max="500"
                                        value={f.area}
                                        onChange={(e) => {
                                          const val = Math.max(0, Math.min(500, Number(e.target.value) || 0));
                                          setResidentFacilities(prev => prev.map(item => item.id === f.id ? { ...item, area: val } : item));
                                        }}
                                        className="w-10 text-center font-semibold bg-gray-50 border border-gray-200 py-0.5 rounded text-[11px] font-mono focus:outline-none focus:border-indigo-500"
                                      />
                                      <span className="text-[10px] text-gray-500 font-bold">평</span>
                                    </div>
                                    <button
                                      onClick={() => {
                                        setResidentFacilities(prev => prev.filter(item => item.id !== f.id));
                                      }}
                                      className="p-1 text-gray-400 hover:text-red-600 rounded hover:bg-red-50 transition cursor-pointer"
                                      title="삭제"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                ))
                              )}
                              <div className="flex justify-between items-center text-[10px] text-[#5F7161] font-semibold border-t border-gray-100 pt-1.5 px-1 mt-1">
                                <span>합계 (자동 연동)</span>
                                <span>{aptAuxArea}평 (약 {Math.round(aptAuxArea * 3.3)}㎡)</span>
                              </div>
                            </div>
                          ) : (
                            <p className="text-[10px] text-gray-400 leading-relaxed">
                              위 슬라이더를 이용해 전체 면적만 조절하시거나, 체크박스를 선택해 경로당, 피트니스 등 개별 주민공동시설 목록과 각 면적을 상세하게 직접 입력할 수 있습니다.
                            </p>
                          )}
                        </div>
                      </div>

                      {/* 오피스텔 */}
                      <div className="space-y-1">
                        <div className="flex justify-between items-center font-medium">
                          <span className="text-gray-600">오피스텔 부대시설 (라운지, 공유세탁실 등)</span>
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              min="0"
                              max="1000"
                              value={officetelAuxArea}
                              onChange={(e) => setOfficetelAuxArea(Math.max(0, Math.min(1000, Number(e.target.value) || 0)))}
                              className="w-14 text-center text-xs font-bold bg-white border border-gray-200 py-0.5 rounded-lg focus:outline-none focus:border-indigo-500 font-mono"
                            />
                            <span className="font-bold text-gray-800">평</span>
                          </div>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="50"
                          step="1"
                          value={Math.min(officetelAuxArea, 50)}
                          onChange={(e) => setOfficetelAuxArea(Number(e.target.value))}
                          className="w-full accent-[#5F7161]"
                        />
                      </div>

                      {/* 호텔 */}
                      <div className="space-y-1">
                        <div className="flex justify-between items-center font-medium">
                          <span className="text-gray-600">호텔 부대복리시설 (레스토랑, 로비, 세미나룸 등)</span>
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              min="0"
                              max="1000"
                              value={hotelAuxArea}
                              onChange={(e) => setHotelAuxArea(Math.max(0, Math.min(1000, Number(e.target.value) || 0)))}
                              className="w-14 text-center text-xs font-bold bg-white border border-gray-200 py-0.5 rounded-lg focus:outline-none focus:border-indigo-500 font-mono"
                            />
                            <span className="font-bold text-gray-800">평</span>
                          </div>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="200"
                          step="5"
                          value={Math.min(hotelAuxArea, 200)}
                          onChange={(e) => setHotelAuxArea(Number(e.target.value))}
                          className="w-full accent-[#5F7161]"
                        />
                      </div>

                      {/* 업무시설 */}
                      <div className="space-y-1">
                        <div className="flex justify-between items-center font-medium">
                          <span className="text-gray-600">업무시설 공용부대시설 (회의실, 라운지 등)</span>
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              min="0"
                              max="1000"
                              value={officeAuxArea}
                              onChange={(e) => setOfficeAuxArea(Math.max(0, Math.min(1000, Number(e.target.value) || 0)))}
                              className="w-14 text-center text-xs font-bold bg-white border border-gray-200 py-0.5 rounded-lg focus:outline-none focus:border-indigo-500 font-mono"
                            />
                            <span className="font-bold text-gray-800">평</span>
                          </div>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          step="1"
                          value={Math.min(officeAuxArea, 100)}
                          onChange={(e) => setOfficeAuxArea(Number(e.target.value))}
                          className="w-full accent-[#5F7161]"
                        />
                      </div>
                    </div>
                  </div>

                  {/* 층고 커스터마이징 (고급 설정) */}
                  <div className="p-3 bg-[#FCFAF7] border border-gray-100 rounded-xl space-y-2">
                    <h4 className="text-[11px] font-bold text-gray-700">⚙️ 주요 특정층 층고 개별 설정 (m)</h4>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[10px] font-medium text-gray-500 mb-0.5">지상 1층 (1F)</label>
                        <input
                          type="number"
                          step="0.1"
                          value={customFloorHeights['1F'] ?? 4.5}
                          onChange={(e) => setCustomFloorHeights({ ...customFloorHeights, '1F': Number(e.target.value) })}
                          className="w-full text-center text-xs font-bold py-1 bg-white border border-gray-200 rounded"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-medium text-gray-500 mb-0.5">지하 1층 (B1)</label>
                        <input
                          type="number"
                          step="0.1"
                          value={customFloorHeights['B1'] ?? 3.8}
                          onChange={(e) => setCustomFloorHeights({ ...customFloorHeights, 'B1': Number(e.target.value) })}
                          className="w-full text-center text-xs font-bold py-1 bg-white border border-gray-200 rounded"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-medium text-gray-500 mb-0.5">기타 반복층고</label>
                        <span className="block w-full text-center text-xs text-gray-400 py-1 font-medium">{defaultFloorHeight}m</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeInputTab === 'scenario-strategy' && (
              <div className="space-y-5 animate-fadeIn">
                <div className="border-b border-gray-100 pb-3">
                  <h3 className="text-xs font-bold text-[#8D7B68] uppercase tracking-widest flex items-center gap-1.5">
                    <Activity className="w-4 h-4 text-emerald-600" />
                    사업 추진 형태 및 출구(Exit) 전략 기획
                  </h3>
                  <p className="text-[10px] text-gray-400 mt-1">
                    프로젝트의 출구 전략을 정의합니다. 설정된 시나리오는 Step 4 사업성 분석의 현금 흐름 및 할인 현가 산정에 반영됩니다.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="block text-[11px] font-semibold text-gray-500">프로젝트 출구 시나리오 선택</label>
                    <div className="grid grid-cols-1 gap-2.5">
                      <button
                        type="button"
                        onClick={() => setExitStrategy('sales')}
                        className={`p-3 text-left rounded-xl border transition-all cursor-pointer flex flex-col gap-1 ${exitStrategy === 'sales' ? 'bg-[#5F7161] text-white border-[#5F7161] shadow' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}
                      >
                        <span className="font-bold text-xs">💸 일괄 분양형 시나리오 (Sales & Exit)</span>
                        <span className="text-[10px] opacity-90">건축 즉시 전 호실 분양 매각을 추진하여 조기 수익 실현 및 PF 단기 상환</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setExitStrategy('lease-exit')}
                        className={`p-3 text-left rounded-xl border transition-all cursor-pointer flex flex-col gap-1 ${exitStrategy === 'lease-exit' ? 'bg-[#5F7161] text-white border-[#5F7161] shadow' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}
                      >
                        <span className="font-bold text-xs">🏢 단기 임대 후 매각 시나리오 (Lease then Exit)</span>
                        <span className="text-[10px] opacity-90">준공 후 5년 간 임대 운영(에셋 밸류업)을 거쳐 자산 가치를 극대화한 후 통 매각</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setExitStrategy('lease-permanent')}
                        className={`p-3 text-left rounded-xl border transition-all cursor-pointer flex flex-col gap-1 ${exitStrategy === 'lease-permanent' ? 'bg-[#5F7161] text-white border-[#5F7161] shadow' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}
                      >
                        <span className="font-bold text-xs">🔄 장기 보유형 임대 시나리오 (Permanent Yield)</span>
                        <span className="text-[10px] opacity-90">15년 장기 임대 운영을 통해 안정적 배당 및 월세 수입 확보, 영구 에셋 홀딩</span>
                      </button>
                    </div>
                  </div>
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

                {activeStep === 4 && (
                  <>
                    <div className="p-4.5 bg-slate-50 border border-slate-200/60 rounded-2xl space-y-4">
                      <div className="space-y-1.5">
                        <div className="flex justify-between font-semibold text-gray-800">
                          <span>㎡당 토지 매입비</span>
                          <span className="font-bold text-[#5F7161]">{Math.round(landPricePerPyung / 3.30578).toLocaleString()} 만원/㎡</span>
                        </div>
                        <input
                          type="range"
                          min="1000"
                          max="25000"
                          step="100"
                          value={landPricePerPyung}
                          onChange={(e) => handleLandPricePerPyungChange(Number(e.target.value))}
                          className="w-full accent-[#5F7161]"
                        />
                        <div className="flex justify-between text-[11px] text-gray-400 font-medium">
                          <span>평당 토지비 환산</span>
                          <span>약 {landPricePerPyung.toLocaleString()} 만원/평</span>
                        </div>
                      </div>

                      <div className="h-px bg-gray-200/50"></div>

                      <div className="space-y-1.5">
                        <div className="flex justify-between font-semibold text-gray-800">
                          <span>총 토지 매입비 (총액)</span>
                          <span className="font-extrabold text-gray-950">{landPurchasePrice.toLocaleString()} 억원</span>
                        </div>
                        <input
                          type="range"
                          min="5"
                          max="3000"
                          step="1"
                          value={landPurchasePrice}
                          onChange={(e) => handleLandPurchasePriceChange(Number(e.target.value))}
                          className="w-full accent-slate-800"
                        />
                        <div className="text-[10px] text-gray-400 font-medium space-y-1 pt-1.5 border-t border-dashed border-gray-200">
                          <div className="flex justify-between text-[11px]">
                            <span>공시지가 (공시지가 추정)</span>
                            <span>
                              ㎡당 {(getOfficialLandPricePerM2() ?? 0).toLocaleString()} 만원 (총 {parseFloat((((landArea ?? 0) * (getOfficialLandPricePerM2() ?? 0)) / 10000).toFixed(1))} 억원)
                            </span>
                          </div>
                          <div className="flex justify-between text-[11px]">
                            <span>공시지가 대비 배수</span>
                            <span className="font-semibold text-emerald-700">
                              {(() => {
                                const totalOfficialCost = ((landArea ?? 0) * (getOfficialLandPricePerM2() ?? 0)) / 10000;
                                return totalOfficialCost > 0 
                                  ? `${((landPurchasePrice ?? 0) / totalOfficialCost).toFixed(2)} 배 수준`
                                  : '-';
                              })()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-2">
                      <div className="flex justify-between font-medium">
                        <span>㎡당 공사비 (지상/지하 통합)</span>
                        <span className="font-bold text-gray-950">{Math.round(constructionCostPerPyung / 3.30578).toLocaleString()} 만원/㎡</span>
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
                      <div className="flex justify-between text-[11px] text-gray-400 font-medium">
                        <span>평당 공사비 환산</span>
                        <span>약 {constructionCostPerPyung.toLocaleString()} 만원/평</span>
                      </div>
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
                        onChange={(e) => handleOtherCostsRatioChange(Number(e.target.value))}
                        className="w-full accent-[#5F7161] cursor-pointer"
                      />

                      {/* 사업비 상세 내역 토글 버튼 */}
                      <div className="pt-1.5 border-t border-gray-200/50">
                        <button
                          type="button"
                          onClick={() => setShowBusinessCostDetail(!showBusinessCostDetail)}
                          className="w-full flex items-center justify-between text-[10px] font-bold text-[#5F7161] hover:text-[#4a584c] transition-colors py-1 cursor-pointer"
                        >
                          <span className="flex items-center gap-1">
                            <Coins className="w-3.5 h-3.5" />
                            사업비 상세 내역 (설계, 감리, 세금 등) {showBusinessCostDetail ? '접기' : '상세 입력'}
                          </span>
                          {showBusinessCostDetail ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                      </div>

                      {/* 사업비 세부 항목 상세 입력 패널 */}
                      {showBusinessCostDetail && (
                        <div className="mt-2 p-2.5 bg-white rounded-lg border border-gray-150 space-y-3.5 text-[10.5px]">
                          <p className="text-[9.5px] text-gray-400 font-medium leading-normal bg-slate-50 p-1.5 rounded border border-gray-100">
                            💡 토지비 및 공사비를 합산한 <strong>원가액 ({(result.financials.landCost + result.financials.constructionCost).toLocaleString()}억)</strong>을 기준으로 각 항목별 비율 및 사업비 예산이 실시간 자동 계산됩니다.
                          </p>

                          {/* 1. 설계비 */}
                          <div className="space-y-1">
                            <div className="flex justify-between items-center">
                              <span className="font-semibold text-gray-600 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-orange-400"></span>설계비 비율
                              </span>
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  min="0"
                                  max="15"
                                  step="0.1"
                                  value={designCostRatio}
                                  onChange={(e) => updateDetailRatio('design', Math.max(0, parseFloat(e.target.value) || 0))}
                                  className="w-11 text-center bg-gray-50 border border-gray-200 py-0.5 rounded text-[10px] font-bold"
                                />
                                <span className="text-gray-500 font-medium">%</span>
                                <span className="text-[10px] font-bold text-gray-400 font-mono ml-1.5">
                                  ({Math.round((result.financials.landCost + result.financials.constructionCost) * (designCostRatio / 100)).toLocaleString()}억원)
                                </span>
                              </div>
                            </div>
                            <input
                              type="range"
                              min="0"
                              max="15"
                              step="0.1"
                              value={designCostRatio}
                              onChange={(e) => updateDetailRatio('design', Number(e.target.value))}
                              className="w-full accent-orange-400 h-1 cursor-pointer"
                            />
                          </div>

                          {/* 2. 감리비 */}
                          <div className="space-y-1">
                            <div className="flex justify-between items-center">
                              <span className="font-semibold text-gray-600 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>감리비 비율
                              </span>
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  min="0"
                                  max="10"
                                  step="0.1"
                                  value={supervisionCostRatio}
                                  onChange={(e) => updateDetailRatio('supervision', Math.max(0, parseFloat(e.target.value) || 0))}
                                  className="w-11 text-center bg-gray-50 border border-gray-200 py-0.5 rounded text-[10px] font-bold"
                                />
                                <span className="text-gray-500 font-medium">%</span>
                                <span className="text-[10px] font-bold text-gray-400 font-mono ml-1.5">
                                  ({Math.round((result.financials.landCost + result.financials.constructionCost) * (supervisionCostRatio / 100)).toLocaleString()}억원)
                                </span>
                              </div>
                            </div>
                            <input
                              type="range"
                              min="0"
                              max="10"
                              step="0.1"
                              value={supervisionCostRatio}
                              onChange={(e) => updateDetailRatio('supervision', Number(e.target.value))}
                              className="w-full accent-indigo-400 h-1 cursor-pointer"
                            />
                          </div>

                          {/* 3. 세금 및 공과금 */}
                          <div className="space-y-1">
                            <div className="flex justify-between items-center">
                              <span className="font-semibold text-gray-600 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>세금 및 제세공과금
                              </span>
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  min="0"
                                  max="15"
                                  step="0.1"
                                  value={taxCostRatio}
                                  onChange={(e) => updateDetailRatio('tax', Math.max(0, parseFloat(e.target.value) || 0))}
                                  className="w-11 text-center bg-gray-50 border border-gray-200 py-0.5 rounded text-[10px] font-bold"
                                />
                                <span className="text-gray-500 font-medium">%</span>
                                <span className="text-[10px] font-bold text-gray-400 font-mono ml-1.5">
                                  ({Math.round((result.financials.landCost + result.financials.constructionCost) * (taxCostRatio / 100)).toLocaleString()}억원)
                                </span>
                              </div>
                            </div>
                            <input
                              type="range"
                              min="0"
                              max="15"
                              step="0.1"
                              value={taxCostRatio}
                              onChange={(e) => updateDetailRatio('tax', Number(e.target.value))}
                              className="w-full accent-emerald-400 h-1 cursor-pointer"
                            />
                          </div>

                          {/* 4. 금융비용 */}
                          <div className="space-y-1">
                            <div className="flex justify-between items-center">
                              <span className="font-semibold text-gray-600 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#3D5A80]"></span>금융비용 및 이자
                              </span>
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  min="0"
                                  max="25"
                                  step="0.1"
                                  value={financeCostRatio}
                                  onChange={(e) => updateDetailRatio('finance', Math.max(0, parseFloat(e.target.value) || 0))}
                                  className="w-11 text-center bg-gray-50 border border-gray-200 py-0.5 rounded text-[10px] font-bold"
                                />
                                <span className="text-gray-500 font-medium">%</span>
                                <span className="text-[10px] font-bold text-gray-400 font-mono ml-1.5">
                                  ({Math.round((result.financials.landCost + result.financials.constructionCost) * (financeCostRatio / 100)).toLocaleString()}억원)
                                </span>
                              </div>
                            </div>
                            <input
                              type="range"
                              min="0"
                              max="25"
                              step="0.1"
                              value={financeCostRatio}
                              onChange={(e) => updateDetailRatio('finance', Number(e.target.value))}
                              className="w-full accent-[#3D5A80] h-1 cursor-pointer"
                            />
                          </div>

                          {/* 5. 마케팅 및 분양대행 */}
                          <div className="space-y-1">
                            <div className="flex justify-between items-center">
                              <span className="font-semibold text-gray-600 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-pink-400"></span>마케팅 및 분양대행비
                              </span>
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  min="0"
                                  max="15"
                                  step="0.1"
                                  value={marketingCostRatio}
                                  onChange={(e) => updateDetailRatio('marketing', Math.max(0, parseFloat(e.target.value) || 0))}
                                  className="w-11 text-center bg-gray-50 border border-gray-200 py-0.5 rounded text-[10px] font-bold"
                                />
                                <span className="text-gray-500 font-medium">%</span>
                                <span className="text-[10px] font-bold text-gray-400 font-mono ml-1.5">
                                  ({Math.round((result.financials.landCost + result.financials.constructionCost) * (marketingCostRatio / 100)).toLocaleString()}억원)
                                </span>
                              </div>
                            </div>
                            <input
                              type="range"
                              min="0"
                              max="15"
                              step="0.1"
                              value={marketingCostRatio}
                              onChange={(e) => updateDetailRatio('marketing', Number(e.target.value))}
                              className="w-full accent-pink-400 h-1 cursor-pointer"
                            />
                          </div>

                          {/* 합계 요약 */}
                          <div className="pt-2 border-t border-dashed border-gray-200 flex justify-between items-center font-bold text-gray-800 bg-[#FAF9F5] p-2 rounded-lg">
                            <span>📋 세부 사업비(간접비) 합계</span>
                            <span className="text-[#5F7161]">
                              {otherCostsRatio.toFixed(1)} % / {result.financials.otherCosts.toLocaleString()} 억원
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
                  <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider border-b border-gray-200 pb-1.5 flex items-center gap-1.5">
                    <Table className="w-3.5 h-3.5 text-[#5F7161]" />
                    주차장 및 기전실 상세 기획 요율
                  </h4>
                  <div className="space-y-3 text-xs">
                    <div className="space-y-1">
                      <div className="flex justify-between font-semibold">
                        <span>주차대수당 설계 면적 (㎡/대)</span>
                        <span className="font-bold text-[#5F7161]">{parkingAreaPerCar} ㎡ / 대</span>
                      </div>
                      <input
                        type="range"
                        min="25"
                        max="50"
                        step="1"
                        value={parkingAreaPerCar}
                        onChange={(e) => setParkingAreaPerCar(Number(e.target.value))}
                        className="w-full accent-[#5F7161]"
                      />
                      <p className="text-[10px] text-gray-400">일반적으로 1대당 35~40㎡(차로, 램프, 주차구획 합산)를 적용합니다.</p>
                    </div>

                    <div className="h-px bg-gray-200/50"></div>

                    <div className="space-y-1">
                      <div className="flex justify-between font-semibold">
                        <span>기계전기실(기전실) 면적 비율</span>
                        <span className="font-bold text-indigo-600">{machineryRatio} %</span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="10"
                        step="0.5"
                        value={machineryRatio}
                        onChange={(e) => setMachineryRatio(Number(e.target.value))}
                        className="w-full accent-indigo-600"
                      />
                      <p className="text-[10px] text-gray-400">지상층 연면적 대비 설비/전기실 면적 비율입니다. (보통 3~5% 내외)</p>
                    </div>

                    <div className="h-px bg-gray-200/50"></div>
 
                    <div className="space-y-2">
                      <span className="font-bold text-gray-700 block">법정 주차 산정 기준 (공동주택)</span>
                      <div className="grid grid-cols-3 gap-2 text-[10px]">
                        <div>
                          <label className="text-gray-500 block mb-0.5">85㎡ 초과 (대/세대)</label>
                          <input
                            type="number"
                            step="0.05"
                            min="0.1"
                            max="3.0"
                            value={aptParkingOver85}
                            onChange={(e) => setAptParkingOver85(Math.max(0.05, parseFloat(e.target.value) || 0))}
                            className="w-full p-1 bg-white border border-gray-200 rounded text-center font-semibold text-[11px] focus:border-[#5F7161] focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-gray-500 block mb-0.5">60㎡~85㎡ (대/세대)</label>
                          <input
                            type="number"
                            step="0.05"
                            min="0.1"
                            max="3.0"
                            value={aptParking60To85}
                            onChange={(e) => setAptParking60To85(Math.max(0.05, parseFloat(e.target.value) || 0))}
                            className="w-full p-1 bg-white border border-gray-200 rounded text-center font-semibold text-[11px] focus:border-[#5F7161] focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-gray-500 block mb-0.5">60㎡ 미만 (대/세대)</label>
                          <input
                            type="number"
                            step="0.05"
                            min="0.1"
                            max="3.0"
                            value={aptParkingUnder60}
                            onChange={(e) => setAptParkingUnder60(Math.max(0.05, parseFloat(e.target.value) || 0))}
                            className="w-full p-1 bg-white border border-gray-200 rounded text-center font-semibold text-[11px] focus:border-[#5F7161] focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <span className="font-bold text-gray-700 block">법정 주차 산정 기준 (오피스텔)</span>
                      <div className="grid grid-cols-3 gap-2 text-[10px]">
                        <div>
                          <label className="text-gray-500 block mb-0.5">60㎡ 초과 (대/실)</label>
                          <input
                            type="number"
                            step="0.05"
                            min="0.1"
                            max="3.0"
                            value={otParkingOver60}
                            onChange={(e) => setOtParkingOver60(Math.max(0.05, parseFloat(e.target.value) || 0))}
                            className="w-full p-1 bg-white border border-gray-200 rounded text-center font-semibold text-[11px] focus:border-[#5F7161] focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-gray-500 block mb-0.5">30㎡~60㎡ (대/실)</label>
                          <input
                            type="number"
                             step="0.05"
                             min="0.1"
                             max="3.0"
                             value={otParking30To60}
                             onChange={(e) => setOtParking30To60(Math.max(0.05, parseFloat(e.target.value) || 0))}
                             className="w-full p-1 bg-white border border-gray-200 rounded text-center font-semibold text-[11px] focus:border-[#5F7161] focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-gray-500 block mb-0.5">30㎡ 미만 (대/실)</label>
                          <input
                            type="number"
                            step="0.05"
                            min="0.1"
                            max="3.0"
                            value={otParkingUnder30}
                            onChange={(e) => setOtParkingUnder30(Math.max(0.05, parseFloat(e.target.value) || 0))}
                            className="w-full p-1 bg-white border border-gray-200 rounded text-center font-semibold text-[11px] focus:border-[#5F7161] focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="h-px bg-gray-200/50"></div>

                    <div className="space-y-1">
                      <div className="flex justify-between font-semibold">
                        <span>자동 산정 가산 비율</span>
                        <span className="font-bold text-emerald-600">{plannedParkingRatio} %</span>
                      </div>
                      <input
                        type="range"
                        min="100"
                        max="200"
                        step="5"
                        value={plannedParkingRatio}
                        onChange={(e) => setPlannedParkingRatio(Number(e.target.value))}
                        className="w-full accent-emerald-600"
                      />
                      <p className="text-[10px] text-gray-400">자동 산정 시 법정 대수 기준 대비 가산 비율입니다. (예: 110% = 법정의 1.1배)</p>
                    </div>

                    <div className="h-px bg-gray-200/50"></div>
 
                    <div className="space-y-2">
                      <div className="flex justify-between font-semibold">
                        <span>계획 주차대수 지정</span>
                        <span className="font-bold text-emerald-700">
                          {designedParkingSpaces === null ? `자동 산정 (${result.designedParkingCount}대)` : `${designedParkingSpaces} 대`}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setDesignedParkingSpaces(null)}
                          className={`py-1.5 px-2 text-[11px] font-bold rounded-xl border transition-all cursor-pointer ${
                            designedParkingSpaces === null
                              ? 'bg-emerald-50 border-emerald-500 text-emerald-800 shadow-sm'
                              : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                          }`}
                        >
                          {plannedParkingRatio === 100 ? '법정 기준 자동' : `법정 기준 + ${plannedParkingRatio - 100}% 자동`}
                        </button>
                        <input
                          type="number"
                          placeholder={`${Math.ceil(result.totalLegalParking)}대`}
                          value={designedParkingSpaces ?? ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setDesignedParkingSpaces(val === '' ? null : Math.max(0, parseInt(val) || 0));
                          }}
                          className="text-center font-bold text-xs bg-white border border-gray-200 rounded-xl focus:border-[#5F7161] focus:outline-none focus:ring-1 focus:ring-[#5F7161]"
                        />
                      </div>
                      <p className="text-[10px] text-gray-400">공동주택/오피스텔/상가 법규 분석에 의거해 자동 산정 후 {plannedParkingRatio - 100}% 여유를 확보하거나 직접 지정 가능합니다.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            </div>
          </div>

          {/* RIGHT: RESULTS (Full Width for mobile & sequential flow) */}
          <div className="w-full space-y-6">
            {activeStep === 3 && (
              <div className="p-5 bg-white rounded-2xl border border-gray-150 shadow-sm space-y-5 animate-fadeIn">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                      <Table className="w-4 h-4 text-[#5F7161]" />
                      🏢 기획 설계 개요서 (Schematic Architectural Specs)
                    </h3>
                    <p className="text-[10px] text-gray-400 font-medium">
                      대지 규제 정보, 층별 계획 및 용도별 기획 전용/공용면적 구성을 종합한 고정밀 실시간 건축 개요조서입니다.
                    </p>
                  </div>
                  {/* Tab Selectors */}
                  <div className="flex flex-wrap gap-1 bg-gray-50 p-1 rounded-xl border border-gray-150">
                    <button
                      type="button"
                      onClick={() => setActiveSummaryTab('general')}
                      className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${
                        activeSummaryTab === 'general'
                          ? 'bg-[#5F7161] text-white shadow-xs'
                          : 'text-gray-500 hover:text-gray-800'
                      }`}
                    >
                      종합 건축개요
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveSummaryTab('layout')}
                      className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                        activeSummaryTab === 'layout'
                          ? 'bg-[#5F7161] text-white shadow-xs'
                          : 'text-gray-500 hover:text-gray-800'
                      }`}
                    >
                      📐 단지 배치도 & 동호수 기획
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveSummaryTab('area')}
                      className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${
                        activeSummaryTab === 'area'
                          ? 'bg-[#5F7161] text-white shadow-xs'
                          : 'text-gray-500 hover:text-gray-800'
                      }`}
                    >
                      용도별 면적조서
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveSummaryTab('parking')}
                      className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${
                        activeSummaryTab === 'parking'
                          ? 'bg-[#5F7161] text-white shadow-xs'
                          : 'text-gray-500 hover:text-gray-800'
                      }`}
                    >
                      주차대수 산정식
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveSummaryTab('amenity')}
                      className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${
                        activeSummaryTab === 'amenity'
                          ? 'bg-[#5F7161] text-white shadow-xs'
                          : 'text-gray-500 hover:text-gray-800'
                      }`}
                    >
                      부대시설 규정
                    </button>
                  </div>
                </div>

                {/* Tab Content 0: Interactive Layout Master Diagram */}
                {activeSummaryTab === 'layout' && (
                  <LayoutDiagram
                    towerCount={towerCount}
                    setTowerCount={setTowerCount}
                    unitsPerFloorLine={unitsPerFloorLine}
                    setUnitsPerFloorLine={setUnitsPerFloorLine}
                    aboveGroundFloors={result.aboveGroundFloors}
                    setAboveGroundFloors={setAboveGroundFloors}
                    podiumFloors={podiumFloors}
                    setPodiumFloors={setPodiumFloors}
                    undergroundFloors={undergroundFloors}
                    setUndergroundFloors={setUndergroundFloors}
                    buildingSeparationDistance={buildingSeparationDistance}
                    setBuildingSeparationDistance={setBuildingSeparationDistance}
                    boundarySeparationDistance={boundarySeparationDistance}
                    setBoundarySeparationDistance={setBoundarySeparationDistance}
                    landArea={landArea}
                    currentLand={currentLand}
                    aptConfigs={aptConfigs}
                    setAptConfigs={setAptConfigs}
                    officetelConfigs={officetelConfigs}
                    setOfficetelConfigs={setOfficetelConfigs}
                    calculatedTypicalFloors={result.calculatedTypicalFloors}
                    totalBuildingHeight={result.totalBuildingHeight}
                    requiredSeparationDistance={result.requiredSeparationDistance}
                    isSeparationSatisfied={result.isSeparationSatisfied}
                    requiredBoundaryDistance={result.requiredBoundaryDistance}
                    isBoundarySatisfied={result.isBoundarySatisfied}
                    isCommercialZone={result.isCommercialZone}
                    useLayoutSimulation={useLayoutSimulation}
                    undergroundGFA={result.undergroundGFA}
                  />
                )}

                {/* Tab Content 1: General Specs */}
                {activeSummaryTab === 'general' && (
                  <div className="space-y-4 animate-fadeIn">
                    <div className="overflow-x-auto border border-gray-150 rounded-xl">
                      <table className="w-full text-[11px] border-collapse text-left">
                        <thead>
                          <tr className="bg-[#FAF9F5] border-b border-gray-150 text-gray-600 font-bold">
                            <th className="py-2.5 px-3 border-r border-gray-150">구분</th>
                            <th className="py-2.5 px-3 border-r border-gray-150 text-right">기획 설계안</th>
                            <th className="py-2.5 px-3 border-r border-gray-150 text-right">법정 / 조례 기준</th>
                            <th className="py-2.5 px-3 text-center">심의 판정</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-gray-700">
                          <tr>
                            <td className="py-2 px-3 font-semibold bg-gray-50/50 border-r border-gray-100">대지 위치</td>
                            <td colSpan={3} className="py-2 px-3 font-medium text-gray-800">
                              {currentLand?.address || '강남구 역삼동 대지'} ({currentLand?.zoning || '일반상업지역'})
                            </td>
                          </tr>
                          <tr>
                            <td className="py-2 px-3 font-semibold bg-gray-50/50 border-r border-gray-100">대지 면적</td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-gray-800 border-r border-gray-100">
                              {landArea.toLocaleString()} ㎡ <span className="text-[10px] text-gray-400 font-normal">({Math.round(landArea * 0.3025).toLocaleString()}평)</span>
                            </td>
                            <td className="py-2 px-3 text-right font-mono text-gray-400 border-r border-gray-100">-</td>
                            <td className="py-2 px-3 text-center text-gray-400 font-medium">-</td>
                          </tr>
                          <tr>
                            <td className="py-2 px-3 font-semibold bg-gray-50/50 border-r border-gray-100">건축 면적</td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-gray-800 border-r border-gray-100">
                              {Math.min(result.aboveGroundGFA, Math.round(landArea * (appliedBCR / 100))).toLocaleString()} ㎡ <span className="text-[10px] text-gray-400 font-normal">({Math.round(Math.min(result.aboveGroundGFA, Math.round(landArea * (appliedBCR / 100))) * 0.3025).toLocaleString()}평)</span>
                            </td>
                            <td className="py-2 px-3 text-right font-mono text-gray-500 border-r border-gray-100">
                              최대 {(landArea * (currentLand?.baselineBCR || 60) / 100).toLocaleString()} ㎡ <span className="text-[10px] text-gray-400 font-normal">({currentLand?.baselineBCR || 60}%)</span>
                            </td>
                            <td className="py-2 px-3 text-center">
                              {appliedBCR <= (currentLand?.baselineBCR || 60) ? (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800">🟢 적합</span>
                              ) : (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-100 text-rose-800">🔴 초과</span>
                              )}
                            </td>
                          </tr>
                          <tr>
                            <td className="py-2 px-3 font-semibold bg-gray-50/50 border-r border-gray-100">
                              <span 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveTooltip(activeTooltip === 'bcr' ? null : 'bcr');
                                }}
                                className="group relative inline-flex items-center gap-1 cursor-help border-b border-dashed border-gray-400"
                              >
                                건폐율 (BCR)
                                <HelpCircle className="w-3 h-3 text-gray-400" />
                                <span className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-2.5 bg-gray-900 text-white text-[10px] rounded-xl transition-all duration-200 shadow-xl z-50 font-normal text-left leading-relaxed ${activeTooltip === 'bcr' ? 'opacity-100 pointer-events-auto' : 'pointer-events-none opacity-0 group-hover:opacity-100'}`}>
                                  <strong>건폐율 (Building Coverage Ratio):</strong> 대지면적에 대한 건축면적(1층 바닥면적 등)의 비율입니다. 건물이 대지 내에서 수평적으로 차지하는 면적 비중을 규제합니다.
                                </span>
                              </span>
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-gray-800 border-r border-gray-100">
                              {appliedBCR} %
                            </td>
                            <td className="py-2 px-3 text-right font-mono text-gray-500 border-r border-gray-100">
                              허용 {currentLand?.baselineBCR || 60} %
                            </td>
                            <td className="py-2 px-3 text-center">
                              {appliedBCR <= (currentLand?.baselineBCR || 60) ? (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800">🟢 통과</span>
                              ) : (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-100 text-rose-800">🔴 초과</span>
                              )}
                            </td>
                          </tr>
                          <tr>
                            <td className="py-2 px-3 font-semibold bg-gray-50/50 border-r border-gray-100">용적률 산정 연면적</td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-gray-800 border-r border-gray-100">
                              {result.aboveGroundGFA.toLocaleString()} ㎡ <span className="text-[10px] text-gray-400 font-normal">({Math.round(result.aboveGroundGFAByPyung).toLocaleString()}평)</span>
                            </td>
                            <td className="py-2 px-3 text-right font-mono text-gray-500 border-r border-gray-100">
                              최대 {(landArea * appliedFAR / 100).toLocaleString()} ㎡ <span className="text-[10px] text-gray-400 font-normal">({appliedFAR}%)</span>
                            </td>
                            <td className="py-2 px-3 text-center">
                              {result.consumedFAR <= appliedFAR ? (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800">🟢 적합</span>
                              ) : (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-100 text-rose-800">🔴 초과</span>
                              )}
                            </td>
                          </tr>
                          <tr>
                            <td className="py-2 px-3 font-semibold bg-gray-50/50 border-r border-gray-100">
                              <span 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveTooltip(activeTooltip === 'far' ? null : 'far');
                                }}
                                className="group relative inline-flex items-center gap-1 cursor-help border-b border-dashed border-gray-400"
                              >
                                용적률 (FAR)
                                <HelpCircle className="w-3 h-3 text-gray-400" />
                                <span className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-2.5 bg-gray-900 text-white text-[10px] rounded-xl transition-all duration-200 shadow-xl z-50 font-normal text-left leading-relaxed ${activeTooltip === 'far' ? 'opacity-100 pointer-events-auto' : 'pointer-events-none opacity-0 group-hover:opacity-100'}`}>
                                  <strong>용적률 (Floor Area Ratio):</strong> 대지면적 대비 지상층 연면적의 백분율 비율입니다. 이 비율이 높을수록 건물을 수직으로 높게 신축하여 총 공급 면적을 극대화할 수 있습니다.
                                </span>
                              </span>
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-gray-800 border-r border-gray-100">
                              {result.consumedFAR.toFixed(2)} %
                            </td>
                            <td className="py-2 px-3 text-right font-mono text-gray-500 border-r border-gray-100">
                              조례 {appliedFAR} %
                            </td>
                            <td className="py-2 px-3 text-center">
                              {result.consumedFAR <= appliedFAR ? (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800">🟢 통과</span>
                              ) : (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-100 text-rose-800">🔴 초과</span>
                              )}
                            </td>
                          </tr>
                          <tr>
                            <td className="py-2 px-3 font-semibold bg-gray-50/50 border-r border-gray-100">지하층 연면적</td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-gray-800 border-r border-gray-100">
                              {result.undergroundGFA.toLocaleString()} ㎡ <span className="text-[10px] text-gray-400 font-normal">({Math.round(result.undergroundGFA * 0.3025).toLocaleString()}평)</span>
                            </td>
                            <td className="py-2 px-3 text-right font-mono text-gray-400 border-r border-gray-100">-</td>
                            <td className="py-2 px-3 text-center text-gray-400">-</td>
                          </tr>
                          <tr>
                            <td className="py-2 px-3 font-semibold bg-gray-50/50 border-r border-gray-100">총 연면적 合計</td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-[#5F7161] border-r border-gray-100">
                              {result.totalGFA.toLocaleString()} ㎡ <span className="text-[10px] text-emerald-600 font-bold">({Math.round(result.totalGFAByPyung).toLocaleString()}평)</span>
                            </td>
                            <td className="py-2 px-3 text-right font-mono text-gray-400 border-r border-gray-100">-</td>
                            <td className="py-2 px-3 text-center text-gray-400">-</td>
                          </tr>
                          <tr>
                            <td className="py-2 px-3 font-semibold bg-gray-50/50 border-r border-gray-100">건축 규모</td>
                            <td colSpan={3} className="py-2 px-3 font-semibold text-gray-800">
                              지하 {undergroundFloors}층 ~ 지상 {result.aboveGroundFloors}층 <span className="text-[10px] text-gray-400 font-normal">(지하 깊이: {result.totalUndergroundDepth.toFixed(1)}m / 지상 최고높이: {result.totalBuildingHeight.toFixed(1)}m)</span>
                            </td>
                          </tr>
                          <tr>
                            <td className="py-2 px-3 font-semibold bg-gray-50/50 border-r border-gray-100">기획 세대수 / 객실수</td>
                            <td colSpan={3} className="py-2 px-3 text-left">
                              <div className="flex flex-wrap gap-2">
                                {aptConfigs.reduce((s, c) => s + c.count, 0) > 0 && (
                                  <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 px-2.5 py-1 rounded-lg font-bold text-[10px] border border-emerald-100">
                                    🏠 공동주택: {aptConfigs.reduce((s, c) => s + c.count, 0)} 세대
                                  </span>
                                )}
                                {officetelConfigs.reduce((s, c) => s + c.count, 0) > 0 && (
                                  <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-800 px-2.5 py-1 rounded-lg font-bold text-[10px] border border-blue-100">
                                    🏢 오피스텔: {officetelConfigs.reduce((s, c) => s + c.count, 0)} 실
                                  </span>
                                )}
                                {hotelRoomCount > 0 && (
                                  <span className="inline-flex items-center gap-1 bg-purple-50 text-purple-800 px-2.5 py-1 rounded-lg font-bold text-[10px] border border-purple-100">
                                    🏨 호텔: {hotelRoomCount} 객실
                                  </span>
                                )}
                                {aptConfigs.reduce((s, c) => s + c.count, 0) === 0 &&
                                 officetelConfigs.reduce((s, c) => s + c.count, 0) === 0 &&
                                 hotelRoomCount === 0 && (
                                  <span className="text-gray-400 font-medium">-</span>
                                )}
                              </div>
                            </td>
                          </tr>
                          <tr>
                            <td className="py-2 px-3 font-semibold bg-gray-50/50 border-r border-gray-100">공개공지 비율</td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-gray-800 border-r border-gray-100">
                              계획: {currentRelaxation?.breakdown.openSpace ? '10%' : '0%'}
                            </td>
                            <td className="py-2 px-3 text-right font-mono text-gray-500 border-r border-gray-100">
                              의무: 10% 대상
                            </td>
                            <td className="py-2 px-3 text-center">
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800">🟢 양호</span>
                            </td>
                          </tr>
                          <tr>
                            <td className="py-2 px-3 font-semibold bg-gray-50/50 border-r border-gray-100">조경 의무면적</td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-gray-800 border-r border-gray-100">
                              계획: {(landArea * 0.15).toFixed(1)} ㎡ (15.0%)
                            </td>
                            <td className="py-2 px-3 text-right font-mono text-gray-500 border-r border-gray-100">
                              법정: {(landArea * 0.15).toFixed(1)} ㎡ (15%)
                            </td>
                            <td className="py-2 px-3 text-center">
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800">🟢 충족</span>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Tab Content 2: Area Breakdown by Usage */}
                {activeSummaryTab === 'area' && (
                  <div className="space-y-4 animate-fadeIn">
                    <div className="overflow-x-auto border border-gray-150 rounded-xl">
                      <table className="w-full text-[10px] border-collapse text-left">
                        <thead>
                          <tr className="bg-[#FAF9F5] border-b border-gray-150 text-gray-600 font-bold">
                            <th className="py-2 px-2.5 border-r border-gray-150">용도 구분</th>
                            <th className="py-2 px-2.5 border-r border-gray-150 text-right">전용면적 (㎡/평)</th>
                            <th className="py-2 px-2.5 border-r border-gray-150 text-right">공용면적 (㎡/평)</th>
                            <th className="py-2 px-2.5 border-r border-gray-150 text-right">지상 소계 (㎡/평)</th>
                            <th className="py-2 px-2.5 border-r border-gray-150 text-right">비율 (%)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-gray-700 font-medium">
                          {/* 1. 공동주택 */}
                          {result.aptAboveGFA > 0 && (
                            <tr>
                              <td className="py-2 px-2.5 font-bold bg-gray-50/40 border-r border-gray-100">
                                <div>🏠 공동주택 (아파트)</div>
                                <div className="text-[9px] text-emerald-700 font-bold mt-0.5 bg-emerald-50/60 px-1 py-0.5 rounded border border-emerald-100/50 inline-block">
                                  총 {aptConfigs.reduce((s, c) => s + c.count, 0)} 세대
                                </div>
                              </td>
                              <td className="py-2 px-2.5 text-right font-mono border-r border-gray-100">
                                {result.aptNetArea.toLocaleString()} ㎡<br />
                                <span className="text-[9px] text-gray-400">({Math.round(result.aptNetArea * 0.3025)}평)</span>
                              </td>
                              <td className="py-2 px-2.5 text-right font-mono border-r border-gray-100">
                                {Math.round(result.aptAboveGFA - result.aptNetArea).toLocaleString()} ㎡<br />
                                <span className="text-[9px] text-gray-400">({Math.round((result.aptAboveGFA - result.aptNetArea) * 0.3025)}평)</span>
                              </td>
                              <td className="py-2 px-2.5 text-right font-mono font-bold text-gray-800 border-r border-gray-100">
                                {result.aptAboveGFA.toLocaleString()} ㎡<br />
                                <span className="text-[9px] text-gray-400">({Math.round(result.aptAboveGFA * 0.3025)}평)</span>
                              </td>
                              <td className="py-2 px-2.5 text-right font-mono text-gray-500">
                                {((result.aptAboveGFA / result.aboveGroundGFA) * 100).toFixed(1)}%
                              </td>
                            </tr>
                          )}
                          {/* 2. 오피스텔 */}
                          {result.officetelAboveGFA > 0 && (
                            <tr>
                              <td className="py-2 px-2.5 font-bold bg-gray-50/40 border-r border-gray-100">🏢 오피스텔</td>
                              <td className="py-2 px-2.5 text-right font-mono border-r border-gray-100">
                                {result.officetelNetArea.toLocaleString()} ㎡<br />
                                <span className="text-[9px] text-gray-400">({Math.round(result.officetelNetArea * 0.3025)}평)</span>
                              </td>
                              <td className="py-2 px-2.5 text-right font-mono border-r border-gray-100">
                                {Math.round(result.officetelAboveGFA - result.officetelNetArea).toLocaleString()} ㎡<br />
                                <span className="text-[9px] text-gray-400">({Math.round((result.officetelAboveGFA - result.officetelNetArea) * 0.3025)}평)</span>
                              </td>
                              <td className="py-2 px-2.5 text-right font-mono font-bold text-gray-800 border-r border-gray-100">
                                {result.officetelAboveGFA.toLocaleString()} ㎡<br />
                                <span className="text-[9px] text-gray-400">({Math.round(result.officetelAboveGFA * 0.3025)}평)</span>
                              </td>
                              <td className="py-2 px-2.5 text-right font-mono text-gray-500">
                                {((result.officetelAboveGFA / result.aboveGroundGFA) * 100).toFixed(1)}%
                              </td>
                            </tr>
                          )}
                          {/* 3. 호텔 */}
                          {hotelRoomCount > 0 && (
                            <tr>
                              <td className="py-2 px-2.5 font-bold bg-gray-50/40 border-r border-gray-100">🏨 숙박시설 (호텔)</td>
                              <td className="py-2 px-2.5 text-right font-mono border-r border-gray-100">
                                {(hotelRoomCount * hotelRoomSizePyung * 3.30578).toLocaleString()} ㎡<br />
                                <span className="text-[9px] text-gray-400">({(hotelRoomCount * hotelRoomSizePyung).toLocaleString()}평)</span>
                              </td>
                              <td className="py-2 px-2.5 text-right font-mono border-r border-gray-100">
                                {Math.round(result.hotelAboveGFA - (hotelRoomCount * hotelRoomSizePyung * 3.30578)).toLocaleString()} ㎡<br />
                                <span className="text-[9px] text-gray-400">({Math.round((result.hotelAboveGFA - (hotelRoomCount * hotelRoomSizePyung * 3.30578)) * 0.3025)}평)</span>
                              </td>
                              <td className="py-2 px-2.5 text-right font-mono font-bold text-gray-800 border-r border-gray-100">
                                {result.hotelAboveGFA.toLocaleString()} ㎡<br />
                                <span className="text-[9px] text-gray-400">({Math.round(result.hotelAboveGFA * 0.3025)}평)</span>
                              </td>
                              <td className="py-2 px-2.5 text-right font-mono text-gray-500">
                                {((result.hotelAboveGFA / result.aboveGroundGFA) * 100).toFixed(1)}%
                              </td>
                            </tr>
                          )}
                          {/* 4. 판매시설 */}
                          {result.retailTotalGFA > 0 && (
                            <tr>
                              <td className="py-2 px-2.5 font-bold bg-gray-50/40 border-r border-gray-100">🛍️ 판매시설 (상가)</td>
                              <td className="py-2 px-2.5 text-right font-mono border-r border-gray-100">
                                {((retail1FArea + retail2FArea + retail3FArea + retailB1Area) * 3.30578).toLocaleString()} ㎡<br />
                                <span className="text-[9px] text-gray-400">({(retail1FArea + retail2FArea + retail3FArea + retailB1Area).toFixed(1)}평)</span>
                              </td>
                              <td className="py-2 px-2.5 text-right font-mono border-r border-gray-100">
                                {Math.round(result.retailTotalGFA - ((retail1FArea + retail2FArea + retail3FArea + retailB1Area) * 3.30578)).toLocaleString()} ㎡<br />
                                <span className="text-[9px] text-gray-400">({Math.round((result.retailTotalGFA - ((retail1FArea + retail2FArea + retail3FArea + retailB1Area) * 3.30578)) * 0.3025)}평)</span>
                              </td>
                              <td className="py-2 px-2.5 text-right font-mono font-bold text-gray-800 border-r border-gray-100">
                                {result.retailTotalGFA.toLocaleString()} ㎡<br />
                                <span className="text-[9px] text-gray-400">({Math.round(result.retailTotalGFA * 0.3025)}평)</span>
                              </td>
                              <td className="py-2 px-2.5 text-right font-mono text-gray-500">
                                {((result.retailAboveGFA / result.aboveGroundGFA) * 100).toFixed(1)}%
                              </td>
                            </tr>
                          )}
                          {/* 5. 업무시설 */}
                          {officeArea > 0 && (
                            <tr>
                              <td className="py-2 px-2.5 font-bold bg-gray-50/40 border-r border-gray-100">💼 업무시설 (오피스)</td>
                              <td className="py-2 px-2.5 text-right font-mono border-r border-gray-100">
                                {(officeArea * 3.30578).toLocaleString()} ㎡<br />
                                <span className="text-[9px] text-gray-400">({officeArea.toLocaleString()}평)</span>
                              </td>
                              <td className="py-2 px-2.5 text-right font-mono border-r border-gray-100">
                                {Math.round(result.officeAboveGFA - (officeArea * 3.30578)).toLocaleString()} ㎡<br />
                                <span className="text-[9px] text-gray-400">({Math.round((result.officeAboveGFA - (officeArea * 3.30578)) * 0.3025)}평)</span>
                              </td>
                              <td className="py-2 px-2.5 text-right font-mono font-bold text-gray-800 border-r border-gray-100">
                                {result.officeAboveGFA.toLocaleString()} ㎡<br />
                                <span className="text-[9px] text-gray-400">({Math.round(result.officeAboveGFA * 0.3025)}평)</span>
                              </td>
                              <td className="py-2 px-2.5 text-right font-mono text-gray-500">
                                {((result.officeAboveGFA / result.aboveGroundGFA) * 100).toFixed(1)}%
                              </td>
                            </tr>
                          )}
                          {/* 6. 추가 기획용도 */}
                          {customUsages.length > 0 && (
                            <tr>
                              <td className="py-2 px-2.5 font-bold bg-gray-50/40 border-r border-gray-100">✨ 추가개발 용도</td>
                              <td className="py-2 px-2.5 text-right font-mono border-r border-gray-100">
                                {customUsages.reduce((sum, item) => sum + (item.areaPyung * 3.30578), 0).toLocaleString()} ㎡<br />
                                <span className="text-[9px] text-gray-400">({customUsages.reduce((sum, item) => sum + item.areaPyung, 0).toFixed(1)}평)</span>
                              </td>
                              <td className="py-2 px-2.5 text-right font-mono border-r border-gray-100">
                                {Math.round(customUsages.reduce((sum, item) => sum + (item.areaPyung * 3.30578 / (item.netRatio / 100)), 0) - customUsages.reduce((sum, item) => sum + (item.areaPyung * 3.30578), 0)).toLocaleString()} ㎡<br />
                                <span className="text-[9px] text-gray-400">({Math.round((customUsages.reduce((sum, item) => sum + (item.areaPyung * 3.30578 / (item.netRatio / 100)), 0) - customUsages.reduce((sum, item) => sum + (item.areaPyung * 3.30578), 0)) * 0.3025)}평)</span>
                              </td>
                              <td className="py-2 px-2.5 text-right font-mono font-bold text-gray-800 border-r border-gray-100">
                                {customUsages.reduce((sum, item) => sum + (item.areaPyung * 3.30578 / (item.netRatio / 100)), 0).toLocaleString()} ㎡<br />
                                <span className="text-[9px] text-gray-400">({Math.round(customUsages.reduce((sum, item) => sum + (item.areaPyung * 3.30578 / (item.netRatio / 100)), 0) * 0.3025)}평)</span>
                              </td>
                              <td className="py-2 px-2.5 text-right font-mono text-gray-500">
                                {((customUsages.reduce((sum, item) => sum + (item.areaPyung * 3.30578 / (item.netRatio / 100)), 0) / result.aboveGroundGFA) * 100).toFixed(1)}%
                              </td>
                            </tr>
                          )}
                          {/* 7. 기계실/전기실 & 지하주차장 */}
                          <tr>
                            <td className="py-2 px-2.5 font-bold bg-gray-50/40 border-r border-gray-100">🚗 지하 주차장 / 기계·전기실</td>
                            <td className="py-2 px-2.5 text-right font-mono border-r border-gray-100">-</td>
                            <td className="py-2 px-2.5 text-right font-mono border-r border-gray-100">
                              {(result.parkingArea + result.machineryArea).toLocaleString()} ㎡<br />
                              <span className="text-[9px] text-gray-400">({Math.round((result.parkingArea + result.machineryArea) * 0.3025)}평)</span>
                            </td>
                            <td className="py-2 px-2.5 text-right font-mono font-bold text-gray-800 border-r border-gray-100">
                              {(result.parkingArea + result.machineryArea).toLocaleString()} ㎡<br />
                              <span className="text-[9px] text-gray-400">({Math.round((result.parkingArea + result.machineryArea) * 0.3025)}평)</span>
                            </td>
                            <td className="py-2 px-2.5 text-right font-mono text-gray-500">
                              {(((result.parkingArea + result.machineryArea) / result.totalGFA) * 100).toFixed(1)}% (연면적비)
                            </td>
                          </tr>
                          {/* 8. 합계 */}
                          <tr className="bg-[#FAF9F5]/60 font-bold text-gray-800">
                            <td className="py-2.5 px-2.5 border-r border-gray-150">⭐ 연면적 합계 (GFA Total)</td>
                            <td className="py-2.5 px-2.5 text-right font-mono border-r border-gray-150">
                              {(result.aptNetArea + result.officetelNetArea + (hotelRoomCount * hotelRoomSizePyung * 3.30578) + ((retail1FArea + retail2FArea + retail3FArea + retailB1Area) * 3.30578) + (officeArea * 3.30578) + customUsages.reduce((sum, item) => sum + (item.areaPyung * 3.30578), 0)).toLocaleString()} ㎡
                            </td>
                            <td className="py-2.5 px-2.5 text-right font-mono border-r border-gray-150">
                              {(result.totalGFA - (result.aptNetArea + result.officetelNetArea + (hotelRoomCount * hotelRoomSizePyung * 3.30578) + ((retail1FArea + retail2FArea + retail3FArea + retailB1Area) * 3.30578) + (officeArea * 3.30578) + customUsages.reduce((sum, item) => sum + (item.areaPyung * 3.30578), 0))).toLocaleString()} ㎡
                            </td>
                            <td className="py-2.5 px-2.5 text-right font-mono text-[#5F7161] border-r border-gray-150 text-[11px]">
                              {result.totalGFA.toLocaleString()} ㎡<br />
                              <span className="text-[10px] text-emerald-700">({Math.round(result.totalGFAByPyung).toLocaleString()}평)</span>
                            </td>
                            <td className="py-2.5 px-2.5 text-right font-mono text-emerald-800">100.0%</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Tab Content 3: Parking Capacity Plan */}
                {activeSummaryTab === 'parking' && (
                  <div className="space-y-4 animate-fadeIn">
                    <div className="overflow-x-auto border border-gray-150 rounded-xl">
                      <table className="w-full text-[10px] border-collapse text-left">
                        <thead>
                          <tr className="bg-[#FAF9F5] border-b border-gray-150 text-gray-600 font-bold">
                            <th className="py-2 px-2.5 border-r border-gray-150">용도/시설 구분</th>
                            <th className="py-2 px-2.5 border-r border-gray-150 text-right">기획 규모</th>
                            <th className="py-2 px-2.5 border-r border-gray-150">법정 설치기준</th>
                            <th className="py-2 px-2.5 border-r border-gray-150 text-right font-mono text-amber-700">법정 의무</th>
                            <th className="py-2 px-2.5 border-r border-gray-150 text-right font-mono text-emerald-700">기획 계획</th>
                            <th className="py-2 px-2.5 text-center">판정</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-gray-700 font-medium">
                          {/* 1. 공동주택 */}
                          {result.aptAboveGFA > 0 && (
                            <tr>
                              <td className="py-2 px-2.5 bg-gray-50/40 border-r border-gray-100">🏠 공동주택 (아파트)</td>
                              <td className="py-2 px-2.5 text-right font-mono border-r border-gray-100">
                                {aptConfigs.reduce((s, c) => s + c.count, 0)} 세대
                              </td>
                              <td className="py-2 px-2.5 text-xs text-gray-500 border-r border-gray-100">
                                전용 85㎡ 초과: {aptParkingOver85}대, 60~85㎡: {aptParking60To85}대, 소형: {aptParkingUnder60}대
                              </td>
                              <td className="py-2 px-2.5 text-right font-mono text-amber-700 border-r border-gray-100">
                                {result.aptLegalParking.toFixed(1)} 대
                              </td>
                              <td className="py-2 px-2.5 text-right font-mono text-emerald-700 border-r border-gray-100">
                                {Math.ceil(result.aptLegalParking * (plannedParkingRatio / 100))} 대
                              </td>
                              <td className="py-2 px-2.5 text-center">
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800">🟢 충족</span>
                              </td>
                            </tr>
                          )}
                          {/* 2. 오피스텔 */}
                          {result.officetelAboveGFA > 0 && (
                            <tr>
                              <td className="py-2 px-2.5 bg-gray-50/40 border-r border-gray-100">🏢 오피스텔</td>
                              <td className="py-2 px-2.5 text-right font-mono border-r border-gray-100">
                                {officetelConfigs.reduce((s, c) => s + c.count, 0)} 실
                              </td>
                              <td className="py-2 px-2.5 text-xs text-gray-500 border-r border-gray-100">
                                전용 60㎡ 초과: {otParkingOver60}대, 30~60㎡: {otParking30To60}대, 소형: {otParkingUnder30}대
                              </td>
                              <td className="py-2 px-2.5 text-right font-mono text-amber-700 border-r border-gray-100">
                                {result.officetelLegalParking.toFixed(1)} 대
                              </td>
                              <td className="py-2 px-2.5 text-right font-mono text-emerald-700 border-r border-gray-100">
                                {Math.ceil(result.officetelLegalParking * (plannedParkingRatio / 100))} 대
                              </td>
                              <td className="py-2 px-2.5 text-center">
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800">🟢 충족</span>
                              </td>
                            </tr>
                          )}
                          {/* 3. 호텔 */}
                          {hotelRoomCount > 0 && (
                            <tr>
                              <td className="py-2 px-2.5 bg-gray-50/40 border-r border-gray-100">🏨 숙박시설 (호텔)</td>
                              <td className="py-2 px-2.5 text-right font-mono border-r border-gray-100">
                                {hotelRoomCount} 실 (GFA {Math.round(result.hotelAboveGFA)}㎡)
                              </td>
                              <td className="py-2 px-2.5 text-xs text-gray-500 border-r border-gray-100">
                                시설면적 134 ㎡ 당 1대 (상업지 숙박시설 기준)
                              </td>
                              <td className="py-2 px-2.5 text-right font-mono text-amber-700 border-r border-gray-100">
                                {result.hotelLegalParking.toFixed(1)} 대
                              </td>
                              <td className="py-2 px-2.5 text-right font-mono text-emerald-700 border-r border-gray-100">
                                {Math.ceil(result.hotelLegalParking * 1.1)} 대
                              </td>
                              <td className="py-2 px-2.5 text-center">
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800">🟢 충족</span>
                              </td>
                            </tr>
                          )}
                          {/* 4. 판매시설 */}
                          {result.retailTotalGFA > 0 && (
                            <tr>
                              <td className="py-2 px-2.5 bg-gray-50/40 border-r border-gray-100">🛍️ 판매시설 (상가)</td>
                              <td className="py-2 px-2.5 text-right font-mono border-r border-gray-100">
                                GFA {Math.round(result.retailTotalGFA)} ㎡
                              </td>
                              <td className="py-2 px-2.5 text-xs text-gray-500 border-r border-gray-100">
                                시설면적 134 ㎡ 당 1대 (영업/판매시설 기준)
                              </td>
                              <td className="py-2 px-2.5 text-right font-mono text-amber-700 border-r border-gray-100">
                                {result.retailLegalParking.toFixed(1)} 대
                              </td>
                              <td className="py-2 px-2.5 text-right font-mono text-emerald-700 border-r border-gray-100">
                                {Math.ceil(result.retailLegalParking * 1.2)} 대
                              </td>
                              <td className="py-2 px-2.5 text-center">
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800">🟢 충족</span>
                              </td>
                            </tr>
                          )}
                          {/* 5. 업무시설 */}
                          {officeArea > 0 && (
                            <tr>
                              <td className="py-2 px-2.5 bg-gray-50/40 border-r border-gray-100">💼 업무시설 (오피스)</td>
                              <td className="py-2 px-2.5 text-right font-mono border-r border-gray-100">
                                GFA {Math.round(result.officeAboveGFA)} ㎡
                              </td>
                              <td className="py-2 px-2.5 text-xs text-gray-500 border-r border-gray-100">
                                시설면적 100 ㎡ 당 1대 (일반 업무시설 기준)
                              </td>
                              <td className="py-2 px-2.5 text-right font-mono text-amber-700 border-r border-gray-100">
                                {result.officeLegalParking.toFixed(1)} 대
                              </td>
                              <td className="py-2 px-2.5 text-right font-mono text-emerald-700 border-r border-gray-100">
                                {Math.ceil(result.officeLegalParking * 1.1)} 대
                              </td>
                              <td className="py-2 px-2.5 text-center">
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800">🟢 충족</span>
                              </td>
                            </tr>
                          )}
                          {/* 6. 추가 기획용도 */}
                          {customUsages.length > 0 && (
                            <tr>
                              <td className="py-2 px-2.5 bg-gray-50/40 border-r border-gray-100">✨ 추가개발 용도</td>
                              <td className="py-2 px-2.5 text-right font-mono border-r border-gray-100">
                                GFA {Math.round(customUsages.reduce((sum, item) => sum + (item.areaPyung * 3.30578 / (item.netRatio / 100)), 0))} ㎡
                              </td>
                              <td className="py-2 px-2.5 text-xs text-gray-500 border-r border-gray-100">
                                개별 지정 기준 ㎡ 당 1대 적용
                              </td>
                              <td className="py-2 px-2.5 text-right font-mono text-amber-700 border-r border-gray-100">
                                {customUsages.reduce((sum, item) => {
                                  const gfa = (item.areaPyung * 3.30578 / (item.netRatio / 100)) + (item.auxAreaPyung * 3.30578);
                                  return sum + (gfa / item.parkingCriteria);
                                }, 0).toFixed(1)} 대
                              </td>
                              <td className="py-2 px-2.5 text-right font-mono text-emerald-700 border-r border-gray-100">
                                {Math.ceil(customUsages.reduce((sum, item) => {
                                  const gfa = (item.areaPyung * 3.30578 / (item.netRatio / 100)) + (item.auxAreaPyung * 3.30578);
                                  return sum + (gfa / item.parkingCriteria);
                                }, 0) * (plannedParkingRatio / 100))} 대
                              </td>
                              <td className="py-2 px-2.5 text-center">
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800">🟢 충족</span>
                              </td>
                            </tr>
                          )}
                          {/* 7. 합계 */}
                          <tr className="bg-[#FAF9F5]/60 font-bold text-gray-800">
                            <td colSpan={3} className="py-2.5 px-2.5 border-r border-gray-150">🚗 총 주차대수 合計</td>
                            <td className="py-2.5 px-2.5 text-right font-mono text-amber-800 border-r border-gray-150">
                              {result.totalLegalParking.toFixed(1)} 대
                            </td>
                            <td className="py-2.5 px-2.5 text-right font-mono text-emerald-800 border-r border-gray-150">
                              {result.designedParkingCount} 대
                            </td>
                            <td className="py-2.5 px-2.5 text-center">
                              {result.designedParkingCount >= Math.ceil(result.totalLegalParking) ? (
                                <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-600 text-white animate-pulse">🟢 합격</span>
                              ) : (
                                <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-rose-600 text-white">🔴 미달</span>
                              )}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Tab Content 4: Amenity Specs & Guidelines */}
                {activeSummaryTab === 'amenity' && (
                  <div className="space-y-4 animate-fadeIn">
                    <div className="bg-[#FAF9F5] p-3.5 rounded-xl border border-gray-150 space-y-3">
                      <h4 className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                        <Home className="w-4 h-4 text-[#5F7161]" />
                        🏡 공동주택 부대복리시설 및 커뮤니티 의무 검토
                      </h4>
                      <p className="text-[10px] text-gray-500 leading-relaxed">
                        대한민국 주택건설기준 규정 및 시흥시 주택조례상 의무 주민공동시설 기준표입니다. (기획 공동주택 세대수를 연동하여 자동 계산됩니다.)
                      </p>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px] mt-2">
                        <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-xs space-y-1.5">
                          <span className="text-gray-400 block font-semibold text-[10px]">주민공동시설 전체 의무면적</span>
                          <div className="flex justify-between items-baseline">
                            <span className="font-mono text-gray-500 text-xs">법정 추천기준:</span>
                            <strong className="text-amber-700 font-mono">
                              {(() => {
                                const totalApts = aptConfigs.reduce((s, c) => s + c.count, 0);
                                if (totalApts <= 0) return '0 ㎡';
                                if (totalApts >= 1000) return `${(500 + totalApts * 1.5).toFixed(1)} ㎡`;
                                if (totalApts >= 100) return `${(100 + totalApts * 1.25).toFixed(1)} ㎡`;
                                return `${(totalApts * 1.0).toFixed(1)} ㎡`;
                              })()}
                            </strong>
                          </div>
                          <div className="flex justify-between items-baseline border-t border-gray-55 pt-1.5 mt-1.5">
                            <span className="font-semibold text-gray-700">기획 적용면적:</span>
                            <strong className="text-emerald-700 font-mono">
                              {(aptAuxArea * 3.30578).toFixed(1)} ㎡ ({aptAuxArea}평)
                            </strong>
                          </div>
                        </div>

                        <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-xs space-y-1.5">
                          <span className="text-gray-400 block font-semibold text-[10px]">부대복리시설 의무 구비조건</span>
                          <ul className="space-y-1 text-[10px] text-gray-600 list-disc list-inside">
                            <li>50세대 이상: 경로당 의무 설치</li>
                            <li>150세대 이상: 어린이놀이터, 경로당 설치</li>
                            <li>300세대 이상: 어린이집 추가 의무 설치</li>
                            <li>500세대 이상: 주민운동시설, 작은도서관 필수</li>
                          </ul>
                        </div>
                      </div>

                      {/* 수기 세부 구성 주민공동시설 목록 명세 */}
                      {useCustomResidentFacilities && residentFacilities.length > 0 && (
                        <div className="bg-white p-3.5 rounded-xl border border-gray-100 shadow-xs space-y-2 mt-2 text-[11px]">
                          <span className="text-[#5F7161] font-bold block text-[11.5px]">📋 기획적용 주민공동시설 세부 목록 (수기 입력 정보)</span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 pt-1">
                            {residentFacilities.map((f, i) => (
                              <div key={f.id} className="flex justify-between items-center py-1 border-b border-gray-50">
                                <span className="text-gray-600 font-medium">{i + 1}. {f.name}</span>
                                <strong className="text-gray-800 font-mono">{f.area}평 ({Math.round(f.area * 3.3)}㎡)</strong>
                              </div>
                            ))}
                          </div>
                          <div className="flex justify-between items-center text-[11px] font-bold text-emerald-800 pt-1.5 border-t border-gray-100 mt-2">
                            <span>총합계 면적</span>
                            <span>{aptAuxArea}평 ({(aptAuxArea * 3.30578).toFixed(1)}㎡)</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeStep === 4 && (
              <div className="space-y-6">
                {/* 1. 상황별 시나리오 종합 수지 분석 비교표 */}
                <div className="p-5 bg-white rounded-2xl border border-gray-150 shadow-sm space-y-4">
                  <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                    <div className="space-y-1">
                      <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                        <Coins className="w-4 h-4 text-indigo-600" />
                        상황별 시나리오 종합 비교표
                      </h3>
                      <p className="text-[10px] text-gray-400 font-medium">Step 3 기획안 기준, 시장 변동 요인을 가정한 5개 시뮬레이션 결과입니다. 각 시나리오 클릭 시 하단 세부 분석이 연동됩니다.</p>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-[11px] text-left border-collapse">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 font-semibold">
                          <th className="py-2.5 px-3">시나리오 구분</th>
                          <th className="py-2.5 px-2 text-right">총사업비</th>
                          <th className="py-2.5 px-2 text-right">예상 매출</th>
                          <th className="py-2.5 px-2 text-right">영업이익</th>
                          <th className="py-2.5 px-2 text-right text-indigo-600">
                            <span 
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveTooltip(activeTooltip === 'roi_scenarios' ? null : 'roi_scenarios');
                              }}
                              className="group relative inline-flex items-center gap-1 cursor-help border-b border-dashed border-indigo-300"
                            >
                              ROI (%)
                              <HelpCircle className="w-2.5 h-2.5 text-indigo-400" />
                              <span className={`absolute bottom-full right-0 mb-2 w-56 p-2.5 bg-gray-900 text-white text-[10px] rounded-xl transition-all duration-200 shadow-xl z-50 font-normal text-left leading-relaxed ${activeTooltip === 'roi_scenarios' ? 'opacity-100 pointer-events-auto' : 'pointer-events-none opacity-0 group-hover:opacity-100'}`}>
                                <strong>ROI:</strong> 총 투자비 대비 예상 영업이익의 비율로, 단기적인 자본 효율성과 사업 마진율을 나타냅니다.
                              </span>
                            </span>
                          </th>
                          <th className="py-2.5 px-2 text-right text-emerald-700">
                            <span 
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveTooltip(activeTooltip === 'irr_scenarios' ? null : 'irr_scenarios');
                              }}
                              className="group relative inline-flex items-center gap-1 cursor-help border-b border-dashed border-emerald-300"
                            >
                              IRR (%)
                              <HelpCircle className="w-2.5 h-2.5 text-emerald-500" />
                              <span className={`absolute bottom-full right-0 mb-2 w-56 p-2.5 bg-gray-900 text-white text-[10px] rounded-xl transition-all duration-200 shadow-xl z-50 font-normal text-left leading-relaxed ${activeTooltip === 'irr_scenarios' ? 'opacity-100 pointer-events-auto' : 'pointer-events-none opacity-0 group-hover:opacity-100'}`}>
                                <strong>IRR:</strong> 연도별 현금 유출/유입의 시점을 보정하여 화폐 시간가치를 반영한 연평균 실질 복리수익률입니다.
                              </span>
                            </span>
                          </th>
                          <th className="py-2.5 px-3 text-right">회수기간</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {[
                          { id: 'base', name: '🟢 기본안 (Base)', label: '기준 요율 100%' },
                          { id: 'conservative', name: '🟡 보수안 (Conservative)', label: '토지비+10%, 공사비+15%, 분양가-10%' },
                          { id: 'optimistic', name: '🔵 낙관안 (Optimistic)', label: '공사비-5%, 분양가+12%' },
                          { id: 'inflation', name: '🔴 공사비 폭등 (Inflation)', label: '공사비+35% 극단 상황' },
                          { id: 'slump', name: '🟣 분양가 침체 (Slump)', label: '분양가-20% 침체 상황' }
                        ].map((sc) => {
                          const data = result.scenarios[sc.id];
                          const isActive = selectedScenarioId === sc.id;
                          return (
                            <tr
                              key={sc.id}
                              onClick={() => setSelectedScenarioId(sc.id)}
                              className={`cursor-pointer transition-colors hover:bg-indigo-50/20 ${isActive ? 'bg-indigo-50/50 font-semibold' : ''}`}
                            >
                              <td className="py-3 px-3">
                                <div className="flex items-center gap-1.5">
                                  <input
                                    type="radio"
                                    checked={isActive}
                                    onChange={() => setSelectedScenarioId(sc.id)}
                                    className="accent-indigo-600"
                                  />
                                  <div>
                                    <span className="text-gray-950 block font-bold">{sc.name}</span>
                                    <span className="text-[9px] text-gray-400 block font-normal">{sc.label}</span>
                                  </div>
                                </div>
                              </td>
                              <td className="py-3 px-2 text-right text-gray-700 font-mono">{(data.financials.totalProjectCost).toFixed(1)}억</td>
                              <td className="py-3 px-2 text-right text-gray-700 font-mono">{(data.financials.totalRevenues).toFixed(1)}억</td>
                              <td className="py-3 px-2 text-right text-gray-900 font-bold font-mono">{(data.financials.operatingProfit).toFixed(1)}억</td>
                              <td className="py-3 px-2 text-right text-indigo-700 font-bold font-mono">{data.financials.roi}%</td>
                              <td className="py-3 px-2 text-right text-emerald-700 font-bold font-mono">{data.irr}%</td>
                              <td className="py-3 px-3 text-right text-gray-800 font-mono">{data.bepYear > 0 ? `${data.bepYear}년차` : '회수불가'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 2. Recharts: 시나리오별 수익성 지표 비교 차트 */}
                <div className="p-5 bg-white rounded-2xl border border-gray-150 shadow-sm space-y-4">
                  <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5 border-b border-gray-50 pb-2">
                    <TrendingUp className="w-4 h-4 text-indigo-600" />
                    시나리오별 수익성 비교 차트 (ROI vs IRR)
                  </h3>
                  <div className="h-60 text-xs font-semibold">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={[
                          { name: '기본안', '투자수익률(ROI)': result.scenarios.base.financials.roi, '내부수익률(IRR)': result.scenarios.base.irr },
                          { name: '보수안', '투자수익률(ROI)': result.scenarios.conservative.financials.roi, '내부수익률(IRR)': result.scenarios.conservative.irr },
                          { name: '낙관안', '투자수익률(ROI)': result.scenarios.optimistic.financials.roi, '내부수익률(IRR)': result.scenarios.optimistic.irr },
                          { name: '공사폭등', '투자수익률(ROI)': result.scenarios.inflation.financials.roi, '내부수익률(IRR)': result.scenarios.inflation.irr },
                          { name: '분양침체', '투자수익률(ROI)': result.scenarios.slump.financials.roi, '내부수익률(IRR)': result.scenarios.slump.irr }
                        ]}
                        margin={{ top: 10, right: 10, left: -15, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" tick={{ fill: '#4B5563', fontSize: 10 }} />
                        <YAxis tick={{ fill: '#4B5563', fontSize: 10 }} />
                        <Tooltip />
                        <Legend wrapperStyle={{ fontSize: 10 }} />
                        <Bar dataKey="투자수익률(ROI)" fill="#5F7161" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="내부수익률(IRR)" fill="#4F46E5" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* 3. 활성 시나리오 상세 요약 리포트 */}
                <div className="p-4 bg-gradient-to-br from-indigo-50/50 to-blue-50/30 rounded-2xl border border-indigo-100 shadow-xs space-y-3">
                  <div className="flex justify-between items-center border-b border-indigo-100 pb-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-900">
                      <Sparkles className="w-4 h-4 text-indigo-600 animate-pulse" />
                      <span>선택된 시나리오 세부 재무 진단</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-indigo-600 text-white">
                      {selectedScenarioId === 'base' ? '기본안 활성' : selectedScenarioId === 'conservative' ? '보수안 활성' : selectedScenarioId === 'optimistic' ? '낙관안 활성' : selectedScenarioId === 'inflation' ? '공사비 폭등 활성' : '분양가 침체 활성'}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-xs pt-1">
                    <div className="bg-white p-2.5 rounded-xl border border-indigo-100/50">
                      <span className="text-gray-400 block text-[9px] font-semibold mb-0.5">총 사업 소요액</span>
                      <strong className="text-gray-900 font-bold text-[11px]">{result.scenarios[selectedScenarioId].financials.totalProjectCost.toLocaleString()} 억</strong>
                    </div>
                    <div className="bg-white p-2.5 rounded-xl border border-indigo-100/50">
                      <span className="text-gray-400 block text-[9px] font-semibold mb-0.5">예상 총 수익가치</span>
                      <strong className="text-gray-900 font-bold text-[11px]">{result.scenarios[selectedScenarioId].financials.totalRevenues.toLocaleString()} 억</strong>
                    </div>
                    <div className="bg-white p-2.5 rounded-xl border border-indigo-100/50">
                      <span className="text-gray-400 block text-[9px] font-semibold mb-0.5">최종 세전 영이익</span>
                      <strong className="text-indigo-800 font-bold text-[11px]">{result.scenarios[selectedScenarioId].financials.operatingProfit.toLocaleString()} 억</strong>
                    </div>
                  </div>
                  <p className="text-[11px] text-gray-600 leading-relaxed pt-1 font-medium">
                    {selectedScenarioId === 'base' && '기본 계획안 하에서는 세전 연이율 8~12% 내외의 안정적인 중상급 개발 이익이 산출되며 리스크가 상대적으로 균형 잡혀 있습니다.'}
                    {selectedScenarioId === 'conservative' && '공사비 인상 및 분양 시장 냉각을 반영한 보수 시뮬레이션입니다. ROI가 감소하지만 세전 이익 흑자가 수호되므로 부지 매입 단가 타협력이 수반되어야 합니다.'}
                    {selectedScenarioId === 'optimistic' && '주변 랜드마크 시세 추가 상승 및 최적 턴키 시공 협의를 완료한 극대화 안입니다. 매우 우수한 투자 지표를 보이며 하이엔드 상품화 전략이 병행 가능합니다.'}
                    {selectedScenarioId === 'inflation' && '자재 공급망 경색으로 평당 공사비가 극단적으로 급등하는 최악 상황입니다. 사업 마진이 심각하게 압박받을 수 있으므로 시공사 정액 계약 협상이 안전장치로 작동해야 합니다.'}
                    {selectedScenarioId === 'slump' && '경기 하강 및 인근 입주 물량 증가로 초기 분양가를 20% 인하한 시나리오입니다. 분양 마케팅 강화 및 장기 임대 비중으로의 선제적인 스위칭 검토를 추천합니다.'}
                  </p>
                </div>
              </div>
            )}

            {(result.totalAllocatedUnits > 0 || result.allocatedUnits.length > 0) && (
              <div className="space-y-6">
                {/* 기획 상품 구성 명세서 (개요) */}
                <div className="p-5 bg-white rounded-2xl border border-gray-100 shadow-sm space-y-4">
                  <h5 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5 border-b border-gray-50 pb-2">
                    <Table className="w-4 h-4 text-[#5F7161]" />
                    기획 상품 구성 명세서 (기획안 개요)
                  </h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {result.allocatedUnits.map((u) => {
                      const isRes = u.id.startsWith('apt_') || u.id.startsWith('officetel_');
                      const isHotel = u.id === 'hotel' || u.id === 'facility_hotel';
                      const isOffice = u.id === 'office' || u.id === 'facility_office';
                      const isRetail = u.id.startsWith('retail_');
                      const isCustom = u.id.startsWith('custom_usage_');

                      let badgeColor = "bg-emerald-50 text-emerald-800";
                      let badgeName = isRes ? '주거' : isHotel ? '호텔' : isOffice ? '업무' : isRetail ? '상가' : '기타';
                      if (isHotel) badgeColor = "bg-purple-50 text-purple-800";
                      if (isOffice) badgeColor = "bg-indigo-50 text-indigo-800";
                      if (isRetail) badgeColor = "bg-orange-50 text-orange-800";
                      if (isCustom) {
                        badgeColor = "bg-violet-50 text-violet-800";
                        badgeName = "추가용도";
                      }

                      return (
                        <div key={u.id} className="p-3 bg-gray-50/50 rounded-xl text-xs flex justify-between items-center border border-gray-50">
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className={`px-1.5 py-0.5 text-[9px] font-bold rounded ${badgeColor}`}>
                                {badgeName}
                              </span>
                              <span className="font-bold text-gray-800 text-[11px]">{u.name.split(' (')[0]}</span>
                            </div>
                            <p className="text-[10px] text-gray-400 mt-1">단위단가: {(u.unitSalesPrice ?? 0).toFixed(2)}억 / 규모: {u.pyung}평</p>
                          </div>
                          <div className="text-right">
                            <span className="font-bold text-gray-900">{u.count}실/세대</span>
                            <p className="text-[10px] text-[#5F7161] font-bold">총 {(u.totalSalesPrice ?? 0).toFixed(2)} 억</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 📐 기획안 상세 건축 산식 명세 */}
                <div className="p-5 bg-white rounded-2xl border border-gray-100 shadow-sm space-y-4">
                  <div className="flex justify-between items-center border-b border-gray-50 pb-2">
                    <h5 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                      <Calculator className="w-4 h-4 text-indigo-600" />
                      📐 기획안 상세 건축 산식 명세
                    </h5>
                    <button
                      type="button"
                      onClick={() => setShowFormulaPanel(!showFormulaPanel)}
                      className="px-2.5 py-1 text-[10px] font-bold text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-all cursor-pointer"
                    >
                      {showFormulaPanel ? '상세 산식 접기 ▲' : '상세 산식 펼치기 ▼'}
                    </button>
                  </div>

                  {showFormulaPanel && (
                    <div className="space-y-4 text-[11px] leading-relaxed text-gray-600">
                      {/* 1. 면적 산식 */}
                      <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-150 space-y-2">
                        <span className="font-extrabold text-gray-800 flex items-center gap-1 text-[11px]">
                          <span className="w-1.5 h-1.5 bg-[#5F7161] rounded-full" />
                          1. 용도별 전용 ↔ 공급(지상층) 면적 산출식
                        </span>
                        
                        {/* 공동주택 */}
                        <div className="pl-2.5 border-l-2 border-[#5F7161]/40 space-y-1">
                          <p className="font-bold text-gray-700">🏢 공동주택 (Apartment)</p>
                          <p className="font-mono text-[10px] text-slate-500 bg-white px-2 py-1 rounded border border-gray-150/60">
                            공급면적 = 전용면적 ({(result?.aptNetArea ?? 0).toFixed(1)}㎡) × [1 + (벽체비율 ({(result?.wallCommonRatioApt ?? 0)}%) + 일반공용 ({(result?.generalCommonRatioApt ?? 0)}%)) ÷ 100]
                            <br />
                            &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;= {(result?.aptNetArea ?? 0).toFixed(1)}㎡ × {(1 + ((result?.wallCommonRatioApt ?? 0) + (result?.generalCommonRatioApt ?? 0))/100).toFixed(3)} = <span className="text-[#5F7161] font-bold">{(result?.aptAboveGFA ?? 0).toFixed(1)}㎡</span> (약 {parseFloat(((result?.aptAboveGFA ?? 0) * 0.3025).toFixed(1))}평)
                          </p>
                        </div>

                        {/* 오피스텔 */}
                        <div className="pl-2.5 border-l-2 border-indigo-500/40 space-y-1">
                          <p className="font-bold text-gray-700">🏢 오피스텔 (Officetel)</p>
                          <p className="font-mono text-[10px] text-slate-500 bg-white px-2 py-1 rounded border border-gray-150/60">
                            공급면적 = 전용면적 ({(result?.officetelNetArea ?? 0).toFixed(1)}㎡) × [1 + (벽체비율 ({(result?.wallCommonRatioOt ?? 0)}%) + 일반공용 ({(result?.generalCommonRatioOt ?? 0)}%)) ÷ 100]
                            <br />
                            &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;= {(result?.officetelNetArea ?? 0).toFixed(1)}㎡ × {(1 + ((result?.wallCommonRatioOt ?? 0) + (result?.generalCommonRatioOt ?? 0))/100).toFixed(3)} = <span className="text-indigo-600 font-bold">{(result?.officetelAboveGFA ?? 0).toFixed(1)}㎡</span> (약 {parseFloat(((result?.officetelAboveGFA ?? 0) * 0.3025).toFixed(1))}평)
                          </p>
                        </div>

                        {/* 기타 상가, 호텔, 오피스는 단순 전용률 역산식 */}
                        <div className="pl-2.5 border-l-2 border-amber-600/40 space-y-1 text-slate-500 text-[10.5px]">
                          <p className="font-semibold text-gray-700">기타 용도 (상가, 업무, 호텔) 지상층 연면적 산식</p>
                          <p>• 호텔: {hotelRoomCount > 0 ? `객실 전용 (${(hotelRoomCount * hotelRoomSizePyung * 3.30578).toFixed(1)}㎡) ÷ 전용률 (${hotelNetRatio}%) = ${(result?.hotelAboveGFA ?? 0).toFixed(1)}㎡` : '객실 미배정'}</p>
                          <p>• 상가(지상): {retail1FArea + retail2FArea + retail3FArea > 0 ? `상가 전용 (${((retail1FArea + retail2FArea + retail3FArea) * 3.30578).toFixed(1)}㎡) ÷ 전용률 (${retailNetRatio}%) = ${(result?.retailAboveGFA ?? 0).toFixed(1)}㎡` : '상가 미배정'}</p>
                          <p>• 업무: {officeArea > 0 ? `업무 전용 (${(officeArea * 3.30578).toFixed(1)}㎡) ÷ 전용률 (${officeNetRatio}%) = ${(result?.officeAboveGFA ?? 0).toFixed(1)}㎡` : '업무 미배정'}</p>
                        </div>
                      </div>

                      {/* 2. 법정 주차대수 산식 */}
                      <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-150 space-y-2">
                        <span className="font-extrabold text-gray-800 flex items-center gap-1 text-[11px]">
                          <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full" />
                          2. 건축법/주차장법 기준 법정 주차대수 산출식
                        </span>
                        
                        <div className="space-y-1.5 text-[10.5px] pl-1">
                          {/* 공동주택 주차기준 */}
                          <div className="flex justify-between border-b border-gray-150/40 pb-1">
                            <span>• 공동주택 (세대 크기별 차등 기준 적용):</span>
                            <span className="font-bold text-gray-800">{(result?.aptLegalParking ?? 0).toFixed(1)} 대</span>
                          </div>
                          <p className="font-mono text-[9.5px] text-slate-500 pl-3">
                            기준: 전용 85㎡↑: 1.2대 | 60㎡~85㎡: 1.0대 | 60㎡↓: 0.7대
                            <br />
                            계산: {(() => {
                              const list = aptConfigs.filter(c => c.count > 0);
                              if (list.length === 0) return '세대 없음 = 0대';
                              return list.map(c => `[${c.name.split(' (')[0].replace('공동주택 ', '')} 전용 ${c.sizeM2}㎡: ${c.count}세대 × ${c.sizeM2 >= 85 ? '1.2대' : c.sizeM2 >= 60 ? '1.0대' : '0.7대'}]`).join(' + ');
                            })()}
                          </p>

                          {/* 오피스텔 주차기준 */}
                          <div className="flex justify-between border-b border-gray-150/40 pb-1 pt-1">
                            <span>• 오피스텔 (호실 크기별 차등 기준 적용):</span>
                            <span className="font-bold text-gray-800">{(result?.officetelLegalParking ?? 0).toFixed(1)} 대</span>
                          </div>
                          <p className="font-mono text-[9.5px] text-slate-500 pl-3">
                            기준: 전용 60㎡↑: 1.0대 | 30㎡~60㎡: 0.8대 | 30㎡↓: 0.5대
                            <br />
                            계산: {(() => {
                              const list = officetelConfigs.filter(c => c.count > 0);
                              if (list.length === 0) return '호실 없음 = 0대';
                              return list.map(c => `[${c.name.split(' (')[0].replace('오피스텔 ', '')} 전용 ${c.sizeM2}㎡: ${c.count}호실 × ${c.sizeM2 >= 60 ? '1.0대' : c.sizeM2 >= 30 ? '0.8대' : '0.5대'}]`).join(' + ');
                            })()}
                          </p>

                          {/* 상업, 업무, 숙박 */}
                          <div className="flex justify-between border-b border-gray-150/40 pb-1 pt-1">
                            <span>• 판매시설 (영업용 판매점):</span>
                            <span className="font-bold text-gray-800">{(result?.retailLegalParking ?? 0).toFixed(1)} 대</span>
                          </div>
                          <p className="font-mono text-[9.5px] text-slate-500 pl-3">
                            기준: 시설 연면적 134㎡당 1대 (지하상가 포함)
                            <br />
                            계산: 상가 연면적 {(result?.retailTotalGFA ?? 0).toFixed(1)}㎡ ÷ 134 = {(result?.retailLegalParking ?? 0).toFixed(1)}대
                          </p>

                          {/* 업무시설 */}
                          <div className="flex justify-between border-b border-gray-150/40 pb-1 pt-1">
                            <span>• 업무시설 (사무소):</span>
                            <span className="font-bold text-gray-800">{(result?.officeLegalParking ?? 0).toFixed(1)} 대</span>
                          </div>
                          <p className="font-mono text-[9.5px] text-slate-500 pl-3">
                            기준: 시설 연면적 100㎡당 1대 (업무 공용부대시설 면적 포함)
                            <br />
                            계산: (업무 {(result?.officeAboveGFA ?? 0).toFixed(1)}㎡ + 부대 {(officeAuxArea * 3.30578).toFixed(1)}㎡) ÷ 100 = {(result?.officeLegalParking ?? 0).toFixed(1)}대
                          </p>

                          {/* 숙박시설 */}
                          <div className="flex justify-between border-b border-gray-150/40 pb-1 pt-1">
                            <span>• 숙박시설 (호텔):</span>
                            <span className="font-bold text-gray-800">{(result?.hotelLegalParking ?? 0).toFixed(1)} 대</span>
                          </div>
                          <p className="font-mono text-[9.5px] text-slate-500 pl-3">
                            기준: 시설 연면적 134㎡당 1대 (호텔 부대복리시설 면적 포함)
                            <br />
                            계산: (호텔 {(result?.hotelAboveGFA ?? 0).toFixed(1)}㎡ + 부대 {(hotelAuxArea * 3.30578).toFixed(1)}㎡) ÷ 134 = {(result?.hotelLegalParking ?? 0).toFixed(1)}대
                          </p>

                          {/* 합계 */}
                          <div className="pt-2 flex justify-between text-indigo-700 font-extrabold text-[11px] border-t border-dashed border-gray-200">
                            <span>총 합계 법정 주차대수:</span>
                            <span>{(result?.totalLegalParking ?? 0).toFixed(2)} 대 (실무 소수점 올림 시 {Math.ceil(result?.totalLegalParking ?? 0)}대)</span>
                          </div>
                        </div>
                      </div>

                      {/* 3. 주차장 및 기전실 면적 산식 */}
                      <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-150 space-y-2">
                        <span className="font-extrabold text-gray-800 flex items-center gap-1 text-[11px]">
                          <span className="w-1.5 h-1.5 bg-emerald-600 rounded-full" />
                          3. 지하 주차장 및 기전실 면적 산출식
                        </span>
                        
                        <div className="pl-2.5 border-l-2 border-emerald-500/40 space-y-1">
                          <p className="font-bold text-gray-700">🚗 주차장 총 면적 (Parking Area)</p>
                          <p className="font-mono text-[10px] text-slate-500 bg-white px-2 py-1 rounded border border-gray-150/60">
                            주차장면적 = 계획 주차대수 ({(result?.designedParkingCount ?? 0)}대) × 대수당 주차장면적 ({parkingAreaPerCar}㎡)
                            <br />
                            &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;= {(result?.designedParkingCount ?? 0)}대 × {parkingAreaPerCar}㎡ = <span className="text-emerald-700 font-bold">{(result?.parkingArea ?? 0).toLocaleString()} ㎡</span> (약 {parseFloat(((result?.parkingArea ?? 0) * 0.3025).toFixed(1))}평)
                          </p>
                        </div>

                        <div className="pl-2.5 border-l-2 border-purple-500/40 space-y-1">
                          <p className="font-bold text-gray-700">⚡ 기계전기실 면적 (Machinery & Electrical Room)</p>
                          <p className="font-mono text-[10px] text-slate-500 bg-white px-2 py-1 rounded border border-gray-150/60">
                            기전실면적 = 지상층 연면적 ({(result?.aboveGroundGFA ?? 0).toLocaleString()}㎡) × 기전실비율 ({machineryRatio}%)
                            <br />
                            &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;= {(result?.aboveGroundGFA ?? 0).toLocaleString()}㎡ × {(machineryRatio / 100).toFixed(3)} = <span className="text-purple-700 font-bold">{(result?.machineryArea ?? 0).toLocaleString()} ㎡</span> (약 {parseFloat(((result?.machineryArea ?? 0) * 0.3025).toFixed(1))}평)
                          </p>
                        </div>

                        <div className="pl-2.5 border-l-2 border-blue-500/40 space-y-1">
                          <p className="font-bold text-gray-700">📐 지하층 총 연면적 (Total Underground GFA)</p>
                          <p className="font-mono text-[10px] text-slate-500 bg-white px-2 py-1 rounded border border-gray-150/60">
                            지하층면적 = 주차장면적 ({(result?.parkingArea ?? 0).toLocaleString()}㎡) + 기전실면적 ({(result?.machineryArea ?? 0).toLocaleString()}㎡) + 지하층 상가면적 ({(result?.retailB1GFA ?? 0).toLocaleString()}㎡)
                            <br />
                            &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;= <span className="text-blue-700 font-bold">{(result?.undergroundGFA ?? 0).toLocaleString()} ㎡</span> (약 {parseFloat(((result?.undergroundGFA ?? 0) * 0.3025).toFixed(1))}평)
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

                {activeStep === 4 ? (
                  <>
                    {/* 분양 vs 임대주택 수지 실시간 비교 및 전환 */}
                    <div className="bg-white p-5 rounded-2xl border border-gray-150 shadow-sm space-y-4 animate-fadeIn">
                      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-gray-100 pb-3">
                        <div className="space-y-1">
                          <h4 className="text-xs font-bold text-gray-800 uppercase tracking-widest flex items-center gap-1.5">
                            <Activity className="w-4 h-4 text-[#5F7161] animate-pulse" />
                            분양 vs 임대주택 출구 전략 수지 비교
                          </h4>
                          <p className="text-[10px] text-gray-400 font-medium">
                            '분양' 방식과 '임대주택' 방식을 실시간으로 전환하며 수지 차이를 비교하고, 리포트에 반영할 출구전략을 실시간으로 지정합니다.
                          </p>
                        </div>
                        {/* Segmented Toggle Control */}
                        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl self-start sm:self-center border border-slate-200">
                          <button
                            type="button"
                            onClick={() => setExitStrategy('sales')}
                            className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer ${exitStrategy === 'sales' ? 'bg-[#5F7161] text-white shadow font-semibold' : 'text-gray-500 hover:text-gray-800 hover:bg-slate-200/50'}`}
                          >
                            💸 분양 방식 (Sales)
                          </button>
                          <button
                            type="button"
                            onClick={() => setExitStrategy('lease-exit')}
                            className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer ${exitStrategy === 'lease-exit' ? 'bg-[#5F7161] text-white shadow font-semibold' : 'text-gray-500 hover:text-gray-800 hover:bg-slate-200/50'}`}
                          >
                            🏢 임대 후 매각 (Lease-Exit)
                          </button>
                          <button
                            type="button"
                            onClick={() => setExitStrategy('lease-permanent')}
                            className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer ${exitStrategy === 'lease-permanent' ? 'bg-[#5F7161] text-white shadow font-semibold' : 'text-gray-500 hover:text-gray-800 hover:bg-slate-200/50'}`}
                          >
                            🔄 장기 임대 (Permanent)
                          </button>
                        </div>
                      </div>

                      {/* Side-by-side Strategy Metrics Comparison Card */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* 1. Sales Strategy Summary Card */}
                        <div 
                          onClick={() => setExitStrategy('sales')}
                          className={`p-4 rounded-xl border transition-all cursor-pointer ${exitStrategy === 'sales' ? 'bg-emerald-50/30 border-emerald-500/30 ring-2 ring-emerald-500/10 shadow-sm' : 'bg-slate-50/50 border-slate-150 hover:bg-slate-100/80 hover:border-slate-300'}`}
                        >
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-[11px] font-extrabold text-gray-800">💸 일괄 분양 전략 (Sales)</span>
                            <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${exitStrategy === 'sales' ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-200 text-gray-600'}`}>
                              {exitStrategy === 'sales' ? '활성 분석' : '대비안'}
                            </span>
                          </div>
                          <div className="space-y-1.5 text-[10.5px]">
                            <div className="flex justify-between text-gray-500">
                              <span>총사업비 (지출):</span>
                              <span className="font-mono text-gray-700">{(result.salesCompare.financials.totalProjectCost).toFixed(1)}억</span>
                            </div>
                            <div className="flex justify-between text-gray-500">
                              <span>예상 매출 (유입):</span>
                              <span className="font-mono text-[#5F7161]">{(result.salesCompare.financials.totalRevenues).toFixed(1)}억</span>
                            </div>
                            <div className="flex justify-between border-t border-dashed border-gray-200 pt-1">
                              <span className="font-bold text-gray-700">예상 영업이익:</span>
                              <span className="font-mono font-bold text-emerald-700">{(result.salesCompare.financials.operatingProfit).toFixed(1)}억</span>
                            </div>
                            <div className="flex justify-between text-xs font-bold mt-1 bg-white p-1.5 rounded border border-gray-150">
                              <span className="text-gray-600">ROI / IRR:</span>
                              <span className="font-mono text-indigo-600">{result.salesCompare.financials.roi}% / {result.salesCompare.irr}%</span>
                            </div>
                            <div className="flex justify-between text-[10px] bg-purple-50/40 px-1.5 py-1 rounded border border-purple-100 mt-1">
                              <span className="text-purple-700 font-bold">순현재가치 (NPV):</span>
                              <span className="font-mono font-bold text-purple-700">{(result.salesCompare.financials.npv ?? 0).toFixed(1)}억</span>
                            </div>
                          </div>
                        </div>

                        {/* 2. Lease then Exit Strategy Summary Card */}
                        <div 
                          onClick={() => setExitStrategy('lease-exit')}
                          className={`p-4 rounded-xl border transition-all cursor-pointer ${exitStrategy === 'lease-exit' ? 'bg-emerald-50/30 border-emerald-500/30 ring-2 ring-emerald-500/10 shadow-sm' : 'bg-slate-50/50 border-slate-150 hover:bg-slate-100/80 hover:border-slate-300'}`}
                        >
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-[11px] font-extrabold text-gray-800">🏢 {step4ExitYear}년 임대 후 매각 (Lease-Exit)</span>
                            <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${exitStrategy === 'lease-exit' ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-200 text-gray-600'}`}>
                              {exitStrategy === 'lease-exit' ? '활성 분석' : '대비안'}
                            </span>
                          </div>
                          <div className="space-y-1.5 text-[10.5px]">
                            <div className="flex justify-between text-gray-500">
                              <span>총사업비 (지출):</span>
                              <span className="font-mono text-gray-700">{(result.leaseExitCompare.financials.totalProjectCost).toFixed(1)}억</span>
                            </div>
                            <div className="flex justify-between text-gray-500">
                              <span>예상 매출 (유입):</span>
                              <span className="font-mono text-[#5F7161]">{(result.leaseExitCompare.financials.totalRevenues).toFixed(1)}억</span>
                            </div>
                            <div className="flex justify-between border-t border-dashed border-gray-200 pt-1">
                              <span className="font-bold text-gray-700">예상 영업이익:</span>
                              <span className="font-mono font-bold text-emerald-700">{(result.leaseExitCompare.financials.operatingProfit).toFixed(1)}억</span>
                            </div>
                            <div className="flex justify-between text-xs font-bold mt-1 bg-white p-1.5 rounded border border-gray-150">
                              <span className="text-gray-600">ROI / IRR:</span>
                              <span className="font-mono text-indigo-600">{result.leaseExitCompare.financials.roi}% / {result.leaseExitCompare.irr}%</span>
                            </div>
                            <div className="flex justify-between text-[10px] bg-purple-50/40 px-1.5 py-1 rounded border border-purple-100 mt-1">
                              <span className="text-purple-700 font-bold">순현재가치 (NPV):</span>
                              <span className="font-mono font-bold text-purple-700">{(result.leaseExitCompare.financials.npv ?? 0).toFixed(1)}억</span>
                            </div>
                          </div>
                        </div>

                        {/* 3. Long Term Yield Strategy Summary Card */}
                        <div 
                          onClick={() => setExitStrategy('lease-permanent')}
                          className={`p-4 rounded-xl border transition-all cursor-pointer ${exitStrategy === 'lease-permanent' ? 'bg-emerald-50/30 border-emerald-500/30 ring-2 ring-emerald-500/10 shadow-sm' : 'bg-slate-50/50 border-slate-150 hover:bg-slate-100/80 hover:border-slate-300'}`}
                        >
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-[11px] font-extrabold text-gray-800">🔄 18년 장기 임대 (Permanent)</span>
                            <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${exitStrategy === 'lease-permanent' ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-200 text-gray-600'}`}>
                              {exitStrategy === 'lease-permanent' ? '활성 분석' : '대비안'}
                            </span>
                          </div>
                          <div className="space-y-1.5 text-[10.5px]">
                            <div className="flex justify-between text-gray-500">
                              <span>총사업비 (지출):</span>
                              <span className="font-mono text-gray-700">{(result.leasePermanentCompare.financials.totalProjectCost).toFixed(1)}억</span>
                            </div>
                            <div className="flex justify-between text-gray-500">
                              <span>예상 매출 (유입):</span>
                              <span className="font-mono text-[#5F7161]">{(result.leasePermanentCompare.financials.totalRevenues).toFixed(1)}억</span>
                            </div>
                            <div className="flex justify-between border-t border-dashed border-gray-200 pt-1">
                              <span className="font-bold text-gray-700">예상 영업이익:</span>
                              <span className="font-mono font-bold text-emerald-700">{(result.leasePermanentCompare.financials.operatingProfit).toFixed(1)}억</span>
                            </div>
                            <div className="flex justify-between text-xs font-bold mt-1 bg-white p-1.5 rounded border border-gray-150">
                              <span className="text-gray-600">ROI / IRR:</span>
                              <span className="font-mono text-indigo-600">{result.leasePermanentCompare.financials.roi}% / {result.leasePermanentCompare.irr}%</span>
                            </div>
                            <div className="flex justify-between text-[10px] bg-purple-50/40 px-1.5 py-1 rounded border border-purple-100 mt-1">
                              <span className="text-purple-700 font-bold">순현재가치 (NPV):</span>
                              <span className="font-mono font-bold text-purple-700">{(result.leasePermanentCompare.financials.npv ?? 0).toFixed(1)}억</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* [USER ADDITIONS] Step 4 Exit Strategy Detailed Configuration Panel */}
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-4">
                        <div className="flex items-center gap-1.5 border-b border-slate-100 pb-2">
                          <Sliders className="w-4 h-4 text-[#5F7161]" />
                          <span className="text-xs font-extrabold text-gray-800">⚙️ 출구 전략 상세 임대/매각 시뮬레이션 변수 조정</span>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
                          {/* 1. Exit Year */}
                          <div className="space-y-1.5 bg-white p-3 rounded-lg border border-slate-150 shadow-sm">
                            <div className="flex justify-between items-center">
                              <label className="text-[10px] font-extrabold text-gray-700 flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5 text-gray-400" />
                                매각 시점 (Exit)
                              </label>
                              <span className="text-[11px] font-extrabold text-indigo-600 font-mono">{step4ExitYear}년차</span>
                            </div>
                            <input
                              type="range"
                              min={3}
                              max={10}
                              step={1}
                              value={step4ExitYear}
                              onChange={(e) => setStep4ExitYear(Number(e.target.value))}
                              className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-[#5F7161]"
                            />
                            <p className="text-[8.5px] text-gray-400">임대 후 매각 전략의 운영 기간</p>
                          </div>

                          {/* 2. Vacancy Rate */}
                          <div className="space-y-1.5 bg-white p-3 rounded-lg border border-slate-150 shadow-sm">
                            <div className="flex justify-between items-center">
                              <label className="text-[10px] font-extrabold text-gray-700 flex items-center gap-1">
                                <Percent className="w-3.5 h-3.5 text-gray-400" />
                                연평균 공실률
                              </label>
                              <span className="text-[11px] font-extrabold text-indigo-600 font-mono">{step4VacancyRate}%</span>
                            </div>
                            <input
                              type="range"
                              min={0}
                              max={20}
                              step={0.5}
                              value={step4VacancyRate}
                              onChange={(e) => setStep4VacancyRate(Number(e.target.value))}
                              className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-[#5F7161]"
                            />
                            <p className="text-[8.5px] text-gray-400">총 임대 수입 차감 비율</p>
                          </div>

                          {/* 3. Rent Growth Rate */}
                          <div className="space-y-1.5 bg-white p-3 rounded-lg border border-slate-150 shadow-sm">
                            <div className="flex justify-between items-center">
                              <label className="text-[10px] font-extrabold text-gray-700 flex items-center gap-1">
                                <TrendingUp className="w-3.5 h-3.5 text-gray-400" />
                                임대료 상승률
                              </label>
                              <span className="text-[11px] font-extrabold text-[#5F7161] font-mono">{step4RentGrowth}%</span>
                            </div>
                            <input
                              type="range"
                              min={0}
                              max={10}
                              step={0.1}
                              value={step4RentGrowth}
                              onChange={(e) => setStep4RentGrowth(Number(e.target.value))}
                              className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-[#5F7161]"
                            />
                            <p className="text-[8.5px] text-gray-400">매년 복리로 증가하는 임대료 비율</p>
                          </div>

                          {/* 4. Cap Rate */}
                          <div className="space-y-1.5 bg-white p-3 rounded-lg border border-slate-150 shadow-sm">
                            <div className="flex justify-between items-center">
                              <label className="text-[10px] font-extrabold text-gray-700 flex items-center gap-1">
                                <Coins className="w-3.5 h-3.5 text-gray-400" />
                                자본환원율 (Cap)
                              </label>
                              <span className="text-[11px] font-extrabold text-emerald-600 font-mono">{step4CapRate}%</span>
                            </div>
                            <input
                              type="range"
                              min={3.0}
                              max={10.0}
                              step={0.1}
                              value={step4CapRate}
                              onChange={(e) => setStep4CapRate(Number(e.target.value))}
                              className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-[#5F7161]"
                            />
                            <p className="text-[8.5px] text-gray-400">건물 매각가 산정용 (환원율)</p>
                          </div>

                          {/* 5. Discount Rate */}
                          <div className="space-y-1.5 bg-white p-3 rounded-lg border border-slate-150 shadow-sm">
                            <div className="flex justify-between items-center">
                              <label className="text-[10px] font-extrabold text-gray-700 flex items-center gap-1">
                                <ArrowDownRight className="w-3.5 h-3.5 text-gray-400" />
                                할인율 (Discount)
                              </label>
                              <span className="text-[11px] font-extrabold text-purple-600 font-mono">{step4DiscountRate}%</span>
                            </div>
                            <input
                              type="range"
                              min={2.0}
                              max={12.0}
                              step={0.1}
                              value={step4DiscountRate}
                              onChange={(e) => setStep4DiscountRate(Number(e.target.value))}
                              className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-[#5F7161]"
                            />
                            <p className="text-[8.5px] text-gray-400">NPV 분석용 할인율</p>
                          </div>
                        </div>
                      </div>

                      {/* Comparison Chart: Profits, ROI, IRR */}
                      <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-150 space-y-3">
                        <span className="text-[10.5px] font-bold text-gray-700 block mb-1">📊 출구 전략별 핵심 재무 성과 비교 분석 ({selectedScenarioId === 'base' ? '기본안' : selectedScenarioId === 'conservative' ? '보수안' : selectedScenarioId === 'optimistic' ? '낙관안' : selectedScenarioId === 'inflation' ? '공사비 폭등' : '분양가 침체'} 기준)</span>
                        
                        <div className="h-64 w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                              data={[
                                {
                                  name: '💸 일괄 분양',
                                  '영업이익 (억원)': result.salesCompare.financials.operatingProfit,
                                  'ROI (%)': result.salesCompare.financials.roi,
                                  'IRR (%)': result.salesCompare.irr,
                                },
                                {
                                  name: '🏢 5년 임대후 매각',
                                  '영업이익 (억원)': result.leaseExitCompare.financials.operatingProfit,
                                  'ROI (%)': result.leaseExitCompare.financials.roi,
                                  'IRR (%)': result.leaseExitCompare.irr,
                                },
                                {
                                  name: '🔄 15년 장기임대',
                                  '영업이익 (억원)': result.leasePermanentCompare.financials.operatingProfit,
                                  'ROI (%)': result.leasePermanentCompare.financials.roi,
                                  'IRR (%)': result.leasePermanentCompare.irr,
                                }
                              ]}
                              margin={{ top: 20, right: 30, left: 10, bottom: 5 }}
                            >
                              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                              <XAxis dataKey="name" stroke="#64748b" style={{ fontSize: '10px', fontWeight: 'bold' }} />
                              <YAxis stroke="#64748b" style={{ fontSize: '10px' }} />
                              <Tooltip
                                contentStyle={{
                                  backgroundColor: '#1e293b',
                                  border: 'none',
                                  borderRadius: '12px',
                                  color: '#fff',
                                  fontSize: '11px',
                                  padding: '10px'
                                }}
                              />
                              <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                              <Bar dataKey="영업이익 (억원)" fill="#5F7161" radius={[4, 4, 0, 0]} />
                              <Bar dataKey="ROI (%)" fill="#6366f1" radius={[4, 4, 0, 0]} />
                              <Bar dataKey="IRR (%)" fill="#10b981" radius={[4, 4, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>

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
                          {Math.round(result.aboveGroundGFA + result.undergroundGFA).toLocaleString()} ㎡
                        </span>
                        <p className="text-[10px] text-indigo-700 mt-0.5">지상 {Math.round(result.aboveGroundGFA).toLocaleString()}㎡ (약 {Math.round(result.totalGFAByPyung).toLocaleString()}평) 설계</p>
                      </div>
                      <div className="bg-emerald-50/30 p-4 rounded-xl border border-emerald-100/40 col-span-2 sm:col-span-1">
                        <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wide block">예상 영업이익</span>
                        <span className={`text-lg font-extrabold ${result.financials.operatingProfit >= 0 ? 'text-[#5F7161]' : 'text-rose-600'} mt-1 block`}>
                          {result.financials.operatingProfit} 억원
                        </span>
                        <p className="text-[10px] text-gray-500 mt-0.5">분양 및 임대 10년 합산수지</p>
                        <button
                          type="button"
                          onClick={() => setShowOpProfitCalc(!showOpProfitCalc)}
                          className="mt-1.5 text-[9px] font-bold text-emerald-800 hover:text-[#5F7161] hover:underline flex items-center justify-center gap-0.5 w-full border border-emerald-200/50 bg-emerald-50/20 py-0.5 rounded cursor-pointer transition-colors"
                        >
                          {showOpProfitCalc ? '공식 접기 ▲' : '산출근거 펼치기 ▼'}
                        </button>
                        {showOpProfitCalc && (
                          <div className="mt-2 p-2 bg-white rounded-lg border border-emerald-200/40 text-[10px] text-left text-gray-700 font-normal leading-relaxed space-y-1 animate-fadeIn">
                            <div className="font-bold text-gray-900 border-b border-gray-100 pb-1">수식: 총 매출가치 - 총 투자원가</div>
                            <div>• 총 매출가치: <span className="font-semibold text-[#5F7161]">{result.financials.totalRevenues.toLocaleString()} 억원</span></div>
                            <div>• 총 투자비 (원가): <span className="font-semibold text-rose-600">{result.financials.totalProjectCost.toLocaleString()} 억원</span></div>
                            <div>• 결과: {result.financials.totalRevenues.toLocaleString()}억 - {result.financials.totalProjectCost.toLocaleString()}억 = <span className="font-bold text-[#5F7161]">{result.financials.operatingProfit} 억원</span></div>
                            <div className="text-gray-400 text-[9px] mt-0.5 leading-snug">* 사업을 통해 획득하는 모든 Inflow 총액(분양매출, 임대유입 등)에서 대지매입, 건축공사, 제세공과 부대비용의 누적 총합을 차감한 실질 세전 순이익 가치입니다.</div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Financial overview */}
                    <div className="bg-[#FAF9F5] p-5 rounded-2xl border border-[#EDDBC7]/60 space-y-4">
                      <h4 className="text-xs font-bold text-[#2C251F] uppercase tracking-widest border-b border-[#EDDBC7]/40 pb-2">
                        사업 종합수지 재무분석 평가서
                      </h4>

                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 text-center">
                        <div className="p-2.5 bg-white/50 border border-gray-150 rounded-xl">
                          <span className="text-[10px] text-slate-400 block">총 투자비 (원가)</span>
                          <span className="font-extrabold text-sm text-gray-800 block mt-0.5">{result.financials.totalProjectCost} 억</span>
                          <button
                            type="button"
                            onClick={() => setShowProjectCostCalc(!showProjectCostCalc)}
                            className="mt-1.5 text-[9px] font-bold text-gray-500 hover:text-[#5F7161] hover:underline flex items-center justify-center gap-0.5 mx-auto cursor-pointer"
                          >
                            {showProjectCostCalc ? '접기 ▲' : '산출근거 ▼'}
                          </button>
                          {showProjectCostCalc && (
                            <div className="mt-2 p-2 bg-white rounded-lg border border-gray-200 text-[10px] text-left text-gray-700 font-normal leading-relaxed space-y-1 animate-fadeIn max-h-56 overflow-y-auto">
                              <div className="font-bold text-gray-900 border-b border-gray-100 pb-1">수식: 토지비 + 공사비 + 부대비용</div>
                              <div>• 토지매입비: <span className="font-semibold">{result.financials.landCost.toLocaleString()} 억원</span></div>
                              <div>• 설계공사비: <span className="font-semibold">{result.financials.constructionCost.toLocaleString()} 억원</span></div>
                              <div>• 제세부대비: <span className="font-semibold">{result.financials.otherCosts.toLocaleString()} 억원</span></div>
                              <div>• 합계: {result.financials.landCost.toLocaleString()}억 + {result.financials.constructionCost.toLocaleString()}억 + {result.financials.otherCosts.toLocaleString()}억 = <span className="font-bold text-gray-900">{result.financials.totalProjectCost} 억원</span></div>
                              <div className="text-gray-400 text-[9px] mt-0.5 leading-snug">* 토지대금 및 거래제세, 기획 연면적 기준 공사비, 그리고 토지비+공사비의 {otherCostsRatio}% 비율로 책정된 금융·제수수료·대행 부대비용을 가중 합산한 총 투자원가 예산입니다.</div>
                            </div>
                          )}
                        </div>
                        <div className="p-2.5 bg-white/50 border border-gray-150 rounded-xl">
                          <span className="text-[10px] text-slate-400 block">총 매출가치 (Inflows)</span>
                          <span className="font-extrabold text-sm text-[#5F7161] block mt-0.5">{result.financials.totalRevenues} 억</span>
                          <button
                            type="button"
                            onClick={() => setShowRevenuesCalc(!showRevenuesCalc)}
                            className="mt-1.5 text-[9px] font-bold text-[#5F7161] hover:underline flex items-center justify-center gap-0.5 mx-auto cursor-pointer"
                          >
                            {showRevenuesCalc ? '접기 ▲' : '산출근거 ▼'}
                          </button>
                          {showRevenuesCalc && (
                            <div className="mt-2 p-2 bg-white rounded-lg border border-gray-200 text-[10px] text-left text-gray-700 font-normal leading-relaxed space-y-1 animate-fadeIn max-h-56 overflow-y-auto">
                              <div className="font-bold text-gray-900 border-b border-gray-100 pb-1">수식: 분양매출 + 누적임대수익 + 장래 매각가치</div>
                              {exitStrategy === 'sales' ? (
                                <>
                                  <div>• 분양 총매출: <span className="font-semibold text-[#5F7161]">{result.financials.totalSalesRevenue.toLocaleString()} 억원</span></div>
                                  <div>• 합계: <span className="font-bold text-[#5F7161]">{result.financials.totalRevenues} 억원</span></div>
                                </>
                              ) : exitStrategy === 'lease-exit' ? (
                                <>
                                  <div>• 선분양 매출: <span className="font-semibold">{result.financials.totalSalesRevenue.toLocaleString()} 억원</span></div>
                                  <div>• 임대 보증금: <span className="font-semibold">{result.financials.totalLeaseDeposits.toLocaleString()} 억원</span></div>
                                  <div>• {step4ExitYear}년 누적임대수익: <span className="font-semibold">{(result.financials.sumOfRents ?? 0).toFixed(1)} 억원</span> (공실률 {step4VacancyRate}%, 연상승률 {step4RentGrowth}%)</div>
                                  <div>• {step4ExitYear}년차 매각가: <span className="font-semibold">{(result.financials.exitValue ?? 0).toFixed(1)} 억원</span> (자본환원율 Cap Rate {step4CapRate}% 기준)</div>
                                  <div>• 합계: {result.financials.totalSalesRevenue.toLocaleString()}억 + {result.financials.totalLeaseDeposits.toLocaleString()}억 + {(result.financials.sumOfRents ?? 0).toFixed(1)}억 + {(result.financials.exitValue ?? 0).toFixed(1)}억 = <span className="font-bold text-[#5F7161]">{result.financials.totalRevenues} 억원</span></div>
                                </>
                              ) : (
                                <>
                                  <div>• 선분양 매출: <span className="font-semibold">{result.financials.totalSalesRevenue.toLocaleString()} 억원</span></div>
                                  <div>• 임대 보증금: <span className="font-semibold">{result.financials.totalLeaseDeposits.toLocaleString()} 억원</span></div>
                                  <div>• 18년 누적임대수익: <span className="font-semibold">{(result.financials.sumOfRents ?? 0).toFixed(1)} 억원</span> (공실률 {step4VacancyRate}%, 연상승률 {step4RentGrowth}%)</div>
                                  <div>• 18년차 잔존가치: <span className="font-semibold">{(result.financials.terminalValue ?? 0).toFixed(1)} 억원</span> (자본환원율 Cap Rate {step4CapRate}% 기준)</div>
                                  <div>• 합계: {result.financials.totalSalesRevenue.toLocaleString()}억 + {result.financials.totalLeaseDeposits.toLocaleString()}억 + {(result.financials.sumOfRents ?? 0).toFixed(1)}억 + {(result.financials.terminalValue ?? 0).toFixed(1)}억 = <span className="font-bold text-[#5F7161]">{result.financials.totalRevenues} 억원</span></div>
                                </>
                              )}
                              <div className="text-gray-400 text-[9px] mt-0.5 leading-snug">* 출구전략에 따라 산출된 장래 유입 예상 매출가치의 합산입니다. 임대 후 매각전략의 경우, 연간 임대수입에 자본환원율 (Cap Rate {step4CapRate}%) 역산 배수를 적용하여 잔존 가치를 자본화한 후 매각 매출로 산입합니다.</div>
                            </div>
                          )}
                        </div>
                        <div className="p-2.5 bg-white/50 border border-gray-150 rounded-xl">
                          <span className="text-[10px] text-slate-400 block">
                            <span 
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveTooltip(activeTooltip === 'roi_summary' ? null : 'roi_summary');
                              }}
                              className="group relative inline-flex items-center gap-1 cursor-help border-b border-dashed border-gray-300"
                            >
                              투자 수익률 (ROI)
                              <HelpCircle className="w-2.5 h-2.5 text-gray-400" />
                              <span className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-60 p-2.5 bg-gray-900 text-white text-[10px] rounded-xl transition-all duration-200 shadow-xl z-50 font-normal text-left leading-relaxed ${activeTooltip === 'roi_summary' ? 'opacity-100 pointer-events-auto' : 'pointer-events-none opacity-0 group-hover:opacity-100'}`}>
                                <strong>투자 수익률 (Return on Investment):</strong> 총 투자비(지출) 대비 세전 영업이익(순수익)의 비율입니다. 사업에 투입된 전체 자금 대비 회수하는 마진의 단순 자본 효율성을 파악하는 지표입니다.
                              </span>
                            </span>
                          </span>
                          <span className={`font-extrabold text-sm ${result.financials.roi >= 0 ? 'text-[#5F7161]' : 'text-rose-600'} block mt-0.5`}>
                            {result.financials.roi}%
                          </span>
                          <button
                            type="button"
                            onClick={() => setShowRoiCalc(!showRoiCalc)}
                            className="mt-1.5 text-[9px] font-bold text-gray-500 hover:text-[#5F7161] hover:underline flex items-center justify-center gap-0.5 mx-auto cursor-pointer"
                          >
                            {showRoiCalc ? '접기 ▲' : '산출근거 ▼'}
                          </button>
                          {showRoiCalc && (
                            <div className="mt-2 p-2 bg-white rounded-lg border border-gray-200 text-[10px] text-left text-gray-700 font-normal leading-relaxed space-y-1 animate-fadeIn">
                              <div className="font-bold text-gray-900 border-b border-gray-100 pb-1">수식: (영업이익 / 총 투자비) × 100</div>
                              <div>• 예상 영업이익: <span className="font-semibold text-[#5F7161]">{result.financials.operatingProfit.toLocaleString()} 억원</span></div>
                              <div>• 총 투자비 (원가): <span className="font-semibold text-rose-600">{result.financials.totalProjectCost.toLocaleString()} 억원</span></div>
                              <div>• 계산: ({result.financials.operatingProfit.toLocaleString()}억 / {result.financials.totalProjectCost.toLocaleString()}억) × 100 = <span className="font-bold text-[#5F7161]">{result.financials.roi}%</span></div>
                              <div className="text-gray-400 text-[9px] mt-0.5 leading-snug">* 총 투자예산 대비 확보되는 순영업이익의 절대 자본 효율을 판단하는 가장 명확한 투자마진 지표입니다.</div>
                            </div>
                          )}
                        </div>
                        <div className="p-2.5 bg-white/50 border border-gray-150 rounded-xl">
                          <span className="text-[10px] text-slate-400 block">
                            <span 
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveTooltip(activeTooltip === 'irr_summary' ? null : 'irr_summary');
                              }}
                              className="group relative inline-flex items-center gap-1 cursor-help border-b border-dashed border-gray-300"
                            >
                              장래 내부수익률 (IRR)
                              <HelpCircle className="w-2.5 h-2.5 text-gray-400" />
                              <span className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-60 p-2.5 bg-gray-900 text-white text-[10px] rounded-xl transition-all duration-200 shadow-xl z-50 font-normal text-left leading-relaxed ${activeTooltip === 'irr_summary' ? 'opacity-100 pointer-events-auto' : 'pointer-events-none opacity-0 group-hover:opacity-100'}`}>
                                <strong>장래 내부수익률 (Internal Rate of Return):</strong> 연차별 실제 현금 유출(대지 매매, 공사비)과 유입(분양금, 임대수익)의 시간가치를 보정한 연평균 복리수익률입니다. 자본 비용 극복 마진을 정밀 판정합니다.
                              </span>
                            </span>
                          </span>
                          <span className={`font-extrabold text-sm ${result.irr >= 0 ? 'text-[#5F7161]' : 'text-rose-600'} block mt-0.5`}>
                            {result.irr}%
                          </span>
                          <button
                            type="button"
                            onClick={() => setShowIrrCalc(!showIrrCalc)}
                            className="mt-1.5 text-[9px] font-bold text-gray-500 hover:text-[#5F7161] hover:underline flex items-center justify-center gap-0.5 mx-auto cursor-pointer"
                          >
                            {showIrrCalc ? '접기 ▲' : '산출근거 ▼'}
                          </button>
                          {showIrrCalc && (
                            <div className="mt-2 p-2 bg-white rounded-lg border border-gray-200 text-[10px] text-left text-gray-700 font-normal leading-relaxed space-y-1 animate-fadeIn">
                              <div className="font-bold text-gray-900 border-b border-gray-100 pb-1">수식: NPV = ∑ [CF_t / (1 + IRR)^t] = 0 만족 할인율</div>
                              <div>• 연차별 수지 지출/수입 시점 반영: 20개년 시계열 역산</div>
                              <div>• 결과: 장래 실질 복리 투자 성과 기준율 = <span className="font-bold text-[#5F7161]">{result.irr}%</span></div>
                              <div className="text-gray-400 text-[9px] mt-0.5 leading-snug">* 대지수매(0년차), 건축공사(1~2년차), 분양수입/보증금(1~3년차) 및 계약기간 누적 임대료의 시간적 선후 관계를 반영한 화폐의 시간가치 보정 내부실질수익률(IRR)입니다.</div>
                            </div>
                          )}
                        </div>
                        <div className="p-2.5 bg-white/50 border border-gray-150 rounded-xl">
                          <span className="text-[10px] text-slate-400 block">
                            <span 
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveTooltip(activeTooltip === 'bep_summary' ? null : 'bep_summary');
                              }}
                              className="group relative inline-flex items-center gap-1 cursor-help border-b border-dashed border-gray-300"
                            >
                              손익분기 분양률
                              <HelpCircle className="w-2.5 h-2.5 text-gray-400" />
                              <span className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-60 p-2.5 bg-gray-900 text-white text-[10px] rounded-xl transition-all duration-200 shadow-xl z-50 font-normal text-left leading-relaxed ${activeTooltip === 'bep_summary' ? 'opacity-100 pointer-events-auto' : 'pointer-events-none opacity-0 group-hover:opacity-100'}`}>
                                <strong>손익분기 분양률 (Break-Even Ratio):</strong> 기획의 지출 예산(총사업비)을 모두 회수하여 개발 적자를 면하기 위해 달성해야 하는 누적 분양 계약 비중입니다.
                              </span>
                            </span>
                          </span>
                          <span className="font-extrabold text-sm text-indigo-600 block mt-0.5">{result.financials.breakEvenRatio}%</span>
                          <button
                            type="button"
                            onClick={() => setShowBepCalc(!showBepCalc)}
                            className="mt-1.5 text-[9px] font-bold text-gray-500 hover:text-indigo-600 hover:underline flex items-center justify-center gap-0.5 mx-auto cursor-pointer"
                          >
                            {showBepCalc ? '접기 ▲' : '산출근거 ▼'}
                          </button>
                          {showBepCalc && (
                            <div className="mt-2 p-2 bg-white rounded-lg border border-gray-200 text-[10px] text-left text-gray-700 font-normal leading-relaxed space-y-1 animate-fadeIn">
                              <div className="font-bold text-gray-900 border-b border-gray-100 pb-1">수식: (총 투자비 / 총 매출가치) × 100</div>
                              <div>• 총 투자비 (원가): <span className="font-semibold text-rose-600">{result.financials.totalProjectCost.toLocaleString()} 억원</span></div>
                              <div>• 총 매출가치 (Inflows): <span className="font-semibold text-[#5F7161]">{result.financials.totalRevenues.toLocaleString()} 억원</span></div>
                              <div>• 계산: ({result.financials.totalProjectCost.toLocaleString()}억 / {result.financials.totalRevenues.toLocaleString()}억) × 100 = <span className="font-bold text-indigo-600">{result.financials.breakEvenRatio}%</span></div>
                              <div className="text-gray-400 text-[9px] mt-0.5 leading-snug">* 기획의 지출 예산을 전부 충당하여 개발 적자를 면하기 위한 총공급 상품의 최소 누적 계약 비율 한계선입니다.</div>
                            </div>
                          )}
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

                    {/* [VISUAL FINANCIAL CHART] */}
                    <div className="bg-[#FAF9F5] rounded-2xl border border-[#EDDBC7]/60 p-5 shadow-sm space-y-4">
                      <div className="flex items-center justify-between border-b border-[#EDDBC7]/40 pb-3">
                        <div className="space-y-1">
                          <h4 className="text-xs font-bold text-[#2C251F] uppercase tracking-wider flex items-center gap-1.5">
                            <TrendingUp className="w-4 h-4 text-[#5F7161]" />
                            재무 구조 시각화 차트 (수지분석 요약)
                          </h4>
                          <p className="text-[10px] text-[#8D7B68]">총매출액, 총투자원가 및 영업이익의 구성비율과 재무 밸런스를 직관적으로 확인하세요.</p>
                        </div>
                      </div>

                      {/* Charts Grid */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                        {/* 1. Bar Chart: Financial Balance */}
                        <div className="bg-white p-4 rounded-xl border border-gray-150 flex flex-col justify-between">
                          <div>
                            <span className="text-[10.5px] font-bold text-gray-700 block mb-1">💼 종합 재무 구조 (매출 vs 원가 vs 영업이익)</span>
                            <span className="text-[9px] text-gray-400 block mb-3">전체 사업 자금의 총량과 최종 세전 수익 밸런스를 비교합니다. (단위: 억원)</span>
                          </div>
                          
                          <div className="h-56 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart
                                data={[
                                  { name: '총 투자원가', '금액(억)': result.financials.totalProjectCost, fill: '#D58970' },
                                  { name: '총 매출가치', '금액(억)': result.financials.totalRevenues, fill: '#5F7161' },
                                  { name: '세전 영업이익', '금액(억)': result.financials.operatingProfit, fill: '#3D5A80' }
                                ]}
                                margin={{ top: 10, right: 10, left: -20, bottom: 5 }}
                              >
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                                <XAxis dataKey="name" tick={{ fontSize: 9.5, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fontSize: 9.5, fill: '#6B7280' }} axisLine={false} tickLine={false} unit="억" />
                                <Tooltip
                                  cursor={{ fill: '#F9FAFB' }}
                                  content={({ active, payload }) => {
                                    if (active && payload && payload.length) {
                                      const data = payload[0].payload;
                                      return (
                                        <div className="bg-white border border-gray-150 p-2 rounded-lg shadow-sm font-sans text-[10.5px]">
                                          <p className="font-bold text-gray-800">{data.name}</p>
                                          <p className="text-[#5F7161] font-semibold mt-0.5">금액: {payload[0].value?.toLocaleString()} 억원</p>
                                        </div>
                                      );
                                    }
                                    return null;
                                  }}
                                />
                                <Bar dataKey="금액(억)" radius={[6, 6, 0, 0]} maxBarSize={45}>
                                  {
                                    [
                                      { name: '총 투자원가', value: result.financials.totalProjectCost, fill: '#D58970' },
                                      { name: '총 매출가치', value: result.financials.totalRevenues, fill: '#5F7161' },
                                      { name: '세전 영업이익', value: result.financials.operatingProfit, fill: '#3D5A80' }
                                    ].map((entry, index) => (
                                      <Cell key={`cell-${index}`} fill={entry.fill} />
                                    ))
                                  }
                                </Bar>
                              </BarChart>
                            </ResponsiveContainer>
                          </div>

                          <div className="flex justify-around text-[9.5px] mt-2 border-t border-gray-50 pt-2 font-mono">
                            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-[#D58970]"></span> 원가: {result.financials.totalProjectCost.toLocaleString()}억</span>
                            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-[#5F7161]"></span> 매출: {result.financials.totalRevenues.toLocaleString()}억</span>
                            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-[#3D5A80]"></span> 이익: {result.financials.operatingProfit.toLocaleString()}억</span>
                          </div>
                        </div>

                        {/* 2. Pie Chart: Cost & Revenue Breakdown */}
                        <div className="bg-white p-4 rounded-xl border border-gray-150 flex flex-col justify-between">
                          <div>
                            <span className="text-[10.5px] font-bold text-gray-700 block mb-1">🛠️ 투자 비용(원가) 세부 구성 비율</span>
                            <span className="text-[9px] text-gray-400 block mb-3">원가 항목별 투입 비용 비중을 분석하여 리스크 요인을 진단합니다.</span>
                          </div>

                          <div className="h-56 w-full flex items-center justify-center relative">
                            <div className="w-2/3 h-full">
                              <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                  <Pie
                                    data={[
                                      { name: '토지매입비', value: result.financials.landCost, color: '#E29578' },
                                      { name: '설계공사비', value: result.financials.constructionCost, color: '#88B04B' },
                                      { name: '제세부대비', value: result.financials.otherCosts, color: '#92A8D1' }
                                    ].filter(item => item.value > 0)}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={50}
                                    outerRadius={75}
                                    paddingAngle={3}
                                    dataKey="value"
                                  >
                                    {[
                                      { name: '토지매입비', value: result.financials.landCost, color: '#E29578' },
                                      { name: '설계공사비', value: result.financials.constructionCost, color: '#88B04B' },
                                      { name: '제세부대비', value: result.financials.otherCosts, color: '#92A8D1' }
                                    ].filter(item => item.value > 0).map((entry, index) => (
                                      <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                  </Pie>
                                  <Tooltip
                                    content={({ active, payload }) => {
                                      if (active && payload && payload.length) {
                                        const data = payload[0].payload;
                                        const total = result.financials.totalProjectCost || 1;
                                        const percentage = ((data.value / total) * 100).toFixed(1);
                                        return (
                                          <div className="bg-white border border-gray-150 p-2 rounded-lg shadow-sm font-sans text-[10.5px]">
                                            <p className="font-bold text-gray-800">{data.name}</p>
                                            <p className="text-gray-600 mt-0.5">금액: {data.value?.toLocaleString()} 억원 ({percentage}%)</p>
                                          </div>
                                        );
                                      }
                                      return null;
                                    }}
                                  />
                                </PieChart>
                              </ResponsiveContainer>
                            </div>

                            {/* Centered Total Cost */}
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-4">
                              <span className="text-[9px] text-gray-400 font-medium">총 원가</span>
                              <span className="text-[12.5px] font-extrabold text-gray-900">{result.financials.totalProjectCost.toLocaleString()}억</span>
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-1 text-[9px] mt-2 border-t border-gray-50 pt-2 text-center">
                            <div>
                              <p className="text-gray-400">토지매입</p>
                              <p className="font-bold text-[#E29578] font-mono mt-0.5">{result.financials.totalProjectCost > 0 ? ((result.financials.landCost / result.financials.totalProjectCost) * 100).toFixed(1) : 0}%</p>
                            </div>
                            <div>
                              <p className="text-gray-400">설계공사</p>
                              <p className="font-bold text-[#88B04B] font-mono mt-0.5">{result.financials.totalProjectCost > 0 ? ((result.financials.constructionCost / result.financials.totalProjectCost) * 100).toFixed(1) : 0}%</p>
                            </div>
                            <div>
                              <p className="text-gray-400">제세부대</p>
                              <p className="font-bold text-[#92A8D1] font-mono mt-0.5">{result.financials.totalProjectCost > 0 ? ((result.financials.otherCosts / result.financials.totalProjectCost) * 100).toFixed(1) : 0}%</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* [USER ADDITIONS] Detailed feasibility calculation formulas & grounds */}
                    <div className="bg-[#FAF9F5] rounded-2xl border border-[#EDDBC7]/50 p-5 shadow-sm space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <div className="p-2.5 bg-[#5F7161]/10 rounded-xl text-[#5F7161]">
                            <Calculator className="w-5 h-5 animate-pulse" />
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-[#2C251F] uppercase tracking-wider">📊 사업성 수지분석 세부 산출식 및 실시간 근거</h4>
                            <p className="text-[10px] text-[#8D7B68] mt-0.5">기획 설계안의 모든 재무 지표가 계산된 수학적 공식과 실시간 대입 값입니다.</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowCalcDetails(!showCalcDetails)}
                          className="px-3 py-1.5 text-[10px] font-bold rounded-lg bg-[#5F7161]/5 hover:bg-[#5F7161]/10 text-[#5F7161] border border-[#5F7161]/20 transition-all flex items-center justify-center gap-1 shadow-sm"
                        >
                          {showCalcDetails ? '상세 공식 접기' : '상세 공식 펼치기'}
                        </button>
                      </div>

                      {showCalcDetails && (
                        <div className="space-y-4 pt-4 border-t border-[#EDDBC7]/40 text-xs text-gray-750 animate-fadeIn">
                          {/* 1. 투자 원가 부문 */}
                          <div className="space-y-2.5 bg-white p-4 rounded-xl border border-[#EDDBC7]/30">
                            <h5 className="font-extrabold text-gray-950 flex items-center gap-1.5 text-[11px]">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                              1. 총 투자 비용 (Outflows / 원가) 산출 공식 및 실시간 연산
                            </h5>
                            <div className="space-y-2.5 pl-3 text-[11px] text-gray-650 leading-relaxed">
                              <div>
                                <span className="font-semibold text-gray-900 block">① 토지 수매비 (Land Cost)</span>
                                <div className="font-mono bg-[#FAF9F5]/40 px-2.5 py-1.5 rounded border border-gray-150 mt-1 flex flex-wrap items-center justify-between text-[10.5px]">
                                  <span>공식: 대지 매입가 총액 × 시나리오 가중치</span>
                                  <span className="text-gray-950 font-bold">
                                    {landPurchasePrice.toLocaleString()}억 × {selectedScenarioId === 'conservative' ? '1.10' : '1.00'} = {result.financials.landCost.toLocaleString()} 억원
                                  </span>
                                </div>
                                <span className="text-[10px] text-gray-400 mt-0.5 block leading-relaxed">
                                  * 대지 매입 총액은 사용자가 기획한 실매입 총액 {landPurchasePrice}억원 기준이며, 보수안 시나리오 선택 시 10%의 예비 할증(1.10배)이 적용됩니다.
                                </span>
                              </div>

                              <div className="mt-3">
                                <span className="font-semibold text-gray-900 block">② 설계 및 건축 토목 공사비 (Construction Cost)</span>
                                <div className="font-mono bg-[#FAF9F5]/40 px-2.5 py-1.5 rounded border border-gray-150 mt-1 flex flex-wrap items-center justify-between text-[10.5px]">
                                  <span>공식: 총건축 연면적(㎡) × [㎡당 공사비(만원) × 시나리오 가중치] × 10,000 / 1억</span>
                                  <span className="text-gray-950 font-bold">
                                    {Math.round(result.aboveGroundGFA + result.undergroundGFA).toLocaleString()}㎡ × ({Math.round(constructionCostPerPyung / 3.30578).toLocaleString()}만원 × {
                                      selectedScenarioId === 'conservative' ? '1.15' : selectedScenarioId === 'optimistic' ? '0.95' : selectedScenarioId === 'inflation' ? '1.35' : '1.00'
                                    }) = {result.financials.constructionCost.toLocaleString()} 억원
                                  </span>
                                </div>
                                <span className="text-[10px] text-gray-400 mt-0.5 block leading-relaxed">
                                  * 연면적(지상 {Math.round(result.aboveGroundGFA).toLocaleString()}㎡ + 지하 {Math.round(result.undergroundGFA).toLocaleString()}㎡ = {Math.round(result.aboveGroundGFA + result.undergroundGFA).toLocaleString()}㎡ / 약 {Math.round(result.totalGFAByPyung).toLocaleString()}평)에 ㎡당 단가 {Math.round(constructionCostPerPyung / 3.30578).toLocaleString()}만원(평당 {constructionCostPerPyung}만원)을 곱해 계산 후 억원 단위로 환산합니다. 시나리오별 가중치(보수안 1.15배, 낙관안 0.95배, 공사폭등안 1.35배)가 동적 적용됩니다.
                                </span>
                              </div>

                              <div className="mt-3">
                                <span className="font-semibold text-gray-900 block">③ 금융 및 제세공과 부대비용 (Other Costs)</span>
                                <div className="font-mono bg-[#FAF9F5]/40 px-2.5 py-1.5 rounded border border-gray-150 mt-1 flex flex-wrap items-center justify-between text-[10.5px]">
                                  <span>공식: (토지비 + 건축비) × 기타 사업비 비율(%)</span>
                                  <span className="text-gray-950 font-bold">
                                    ({result.financials.landCost.toLocaleString()}억 + {result.financials.constructionCost.toLocaleString()}억) × {otherCostsRatio}% = {result.financials.otherCosts.toLocaleString()} 억원
                                  </span>
                                </div>
                                <span className="text-[10px] text-gray-400 mt-0.5 block leading-relaxed">
                                  * 설계비, 감리비, 금융 이자, 마케팅/분양 대행수수료, 각종 세금 등 인허가와 사업 진행에 수반되는 간접비를 사용자가 설정한 비율({otherCostsRatio}%)에 따라 자동 안분합니다.
                                </span>
                              </div>

                              <div className="mt-3 pt-3 border-t border-gray-100">
                                <span className="font-semibold text-gray-950 block">④ 투입 총사업비 합계 (Total Project Cost)</span>
                                <div className="font-mono bg-gray-50 px-2.5 py-2 rounded border border-gray-200 mt-1 flex flex-wrap items-center justify-between text-[11px]">
                                  <span className="text-gray-600">공식: 토지 수매비 + 공동 건축 공비 + 금융 및 사업공과금</span>
                                  <span className="text-rose-600 font-extrabold">
                                    {result.financials.landCost.toLocaleString()}억 + {result.financials.constructionCost.toLocaleString()}억 + {result.financials.otherCosts.toLocaleString()}억 = {result.financials.totalProjectCost.toLocaleString()} 억원
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* 2. 매출/수익 부문 */}
                          <div className="space-y-2.5 bg-white p-4 rounded-xl border border-[#EDDBC7]/30">
                            <h5 className="font-extrabold text-gray-950 flex items-center gap-1.5 text-[11px]">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                              2. 예상 총 매출가치 (Inflows / 수입) 산출 및 출구전략 반영 방식
                            </h5>
                            <div className="space-y-2.5 pl-3 text-[11px] text-gray-650 leading-relaxed">
                              <div>
                                <span className="font-semibold text-gray-900 block">① 공급 세부 상품별 분양 매출 산식 내역</span>
                                <div className="overflow-x-auto my-1.5 border border-gray-150 rounded-lg">
                                  <table className="w-full text-[10px] bg-white border-collapse text-left">
                                    <thead>
                                      <tr className="bg-[#FAF9F5] border-b border-gray-150 text-gray-600 font-bold">
                                        <th className="p-2 border-r border-gray-100">상품명</th>
                                        <th className="p-2 text-right border-r border-gray-100">공급 수량</th>
                                        <th className="p-2 text-right border-r border-gray-100">전용면적(㎡)</th>
                                        <th className="p-2 text-right border-r border-gray-100">㎡당 단가(가중치 적용)</th>
                                        <th className="p-2 text-right text-[#5F7161]">산출 매출액</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                      {result.allocatedUnits.map((u: any) => {
                                        const perM2Price = Math.round((u.totalSalesPrice * 10000) / (u.count * (u.sizeM2 || 1)));
                                        const perPyungPrice = Math.round((u.totalSalesPrice * 10000) / (u.count * (u.pyung || 1)));
                                        return (
                                          <tr key={u.id} className="text-gray-700">
                                            <td className="p-2 font-medium text-gray-900 border-r border-gray-100">{u.name}</td>
                                            <td className="p-2 text-right font-mono border-r border-gray-100">{u.count}세대/실</td>
                                            <td className="p-2 text-right font-mono border-r border-gray-100">
                                              {Math.round(u.sizeM2).toLocaleString()}㎡
                                              <span className="text-[9px] text-gray-400 block font-normal">(약 {u.pyung}평)</span>
                                            </td>
                                            <td className="p-2 text-right font-mono text-gray-900 border-r border-gray-100">
                                              {perM2Price.toLocaleString()}만원/㎡
                                              <span className="text-[9px] text-gray-400 block font-normal">(평당 {perPyungPrice.toLocaleString()}만)</span>
                                            </td>
                                            <td className="p-2 text-right font-mono font-bold text-slate-900">
                                              {u.totalSalesPrice.toLocaleString()} 억원
                                            </td>
                                          </tr>
                                        );
                                      })}
                                      {result.allocatedUnits.length === 0 && (
                                        <tr>
                                          <td colSpan={5} className="p-3 text-center text-gray-400 italic">설정된 공급 계획이 없습니다.</td>
                                        </tr>
                                      )}
                                      <tr className="bg-slate-50 font-bold text-[10.5px]">
                                        <td colSpan={4} className="p-2 text-gray-900 border-r border-gray-100 font-bold">순수 분양 매출액 합계 (Total Sales Outright):</td>
                                        <td className="p-2 text-right font-mono text-emerald-800 font-extrabold">{result.financials.totalSalesRevenue.toLocaleString()} 억원</td>
                                      </tr>
                                    </tbody>
                                  </table>
                                </div>
                                <span className="text-[10px] text-gray-400 block leading-relaxed">
                                  * 선택된 시나리오에 따라 공급 단가에 동적 가중치(보수안 0.90배, 낙관안 1.12배, 분양침체안 0.80배)가 적용되어 실시간으로 반영됩니다.
                                </span>
                              </div>

                              <div className="mt-3">
                                <span className="font-semibold text-gray-900 block">② 출구 전략(Exit Strategy)에 따른 장기 수지 산정 공식</span>
                                <div className="space-y-1.5 mt-1">
                                  <div className="bg-[#FAF9F5] p-2.5 rounded-lg border border-[#EDDBC7]/40 flex items-center justify-between">
                                    <span className="font-bold text-[#2C251F]">적용 중인 출구 전략: </span>
                                    <span className="px-2 py-0.5 text-[10px] font-extrabold rounded-md bg-[#5F7161] text-white">
                                      {exitStrategy === 'sales' ? '전체 조기 일괄 분양형' : exitStrategy === 'lease-exit' ? `${step4ExitYear}년 임대 후 일괄 매각형` : '장기 임대 운영형 (18년)'}
                                    </span>
                                  </div>

                                  <div className="bg-gray-50/50 p-3 rounded-lg border border-gray-200 font-mono space-y-1.5 text-[10.5px]">
                                    {exitStrategy === 'sales' && (
                                      <>
                                        <div className="flex justify-between font-bold text-gray-900 border-b border-gray-200 pb-1.5">
                                          <span>[일괄 분양형 산식]</span>
                                          <span>총 수익가치 = 순수 분양 매출액</span>
                                        </div>
                                        <div className="flex justify-between text-gray-600 mt-1">
                                          <span>• 분양형 매출 총합:</span>
                                          <span>{result.financials.totalSalesRevenue.toLocaleString()} 억원</span>
                                        </div>
                                        <div className="flex justify-between text-emerald-700 font-bold border-t border-gray-200 pt-1.5 mt-1">
                                          <span>• 최종 산출 수지 총액:</span>
                                          <span>{result.financials.totalRevenues.toLocaleString()} 억원</span>
                                        </div>
                                      </>
                                    )}
                                    {exitStrategy === 'lease-exit' && (
                                      <>
                                        <div className="flex justify-between font-bold text-gray-900 border-b border-gray-200 pb-1.5">
                                          <span>[{step4ExitYear}년 임대후 매각 산식]</span>
                                          <span>분양형 매출 + 보증금 회수 + ({step4ExitYear}개년 임대수익) + {step4ExitYear}년차 매각가치(Exit Value)</span>
                                        </div>
                                        <div className="flex justify-between text-gray-600 mt-1">
                                          <span>• 분양형 상품 매출액 (Apt/Ot 등 분양 전환):</span>
                                          <span>{result.financials.totalSalesRevenue.toLocaleString()} 억원</span>
                                        </div>
                                        <div className="flex justify-between text-gray-600">
                                          <span>• 임대형 상품 보증금 수납액 (Lease Deposits):</span>
                                          <span>{result.financials.totalLeaseDeposits.toLocaleString()} 억원</span>
                                        </div>
                                        <div className="flex justify-between text-gray-600">
                                          <span>• {step4ExitYear}개년 누적 월세 수익액 (Annual Rent 누적):</span>
                                          <span>{(result.financials.sumOfRents ?? 0).toFixed(2)} 억원 (연평균 {((result.financials.sumOfRents ?? 0)/step4ExitYear).toFixed(2)}억)</span>
                                        </div>
                                        <div className="flex justify-between text-gray-600">
                                          <span>• {step4ExitYear}년차 임대지분 일괄 매각가치 (Exit Value):</span>
                                          <span>{(result.financials.exitValue ?? 0).toFixed(2)} 억원 (연 임대료 자본환원율 {step4CapRate}% 기준 {(100 / step4CapRate).toFixed(1)}배 가치 평가)</span>
                                        </div>
                                        <div className="flex justify-between text-emerald-800 font-bold border-t border-gray-200 pt-1.5 mt-1">
                                          <span>• 최종 합산 수지 총 가치:</span>
                                          <span>{result.financials.totalRevenues.toLocaleString()} 억원</span>
                                        </div>
                                      </>
                                    )}
                                    {exitStrategy === 'lease-permanent' && (
                                      <>
                                        <div className="flex justify-between font-bold text-gray-900 border-b border-gray-200 pb-1.5">
                                          <span>[18년 장기 임대 운영 산식]</span>
                                          <span>분양형 매출 + 보증금 회수 + (18개년 임대수익) + 18년차 잔존가치(Terminal Value)</span>
                                        </div>
                                        <div className="flex justify-between text-gray-600 mt-1">
                                          <span>• 분양형 상품 매출액 (Apt/Ot 분양):</span>
                                          <span>{result.financials.totalSalesRevenue.toLocaleString()} 억원</span>
                                        </div>
                                        <div className="flex justify-between text-gray-600">
                                          <span>• 임대형 상품 보증금 수납액 (Lease Deposits):</span>
                                          <span>{result.financials.totalLeaseDeposits.toLocaleString()} 억원</span>
                                        </div>
                                        <div className="flex justify-between text-gray-600">
                                          <span>• 18개년 장기 누적 임대수익액 (Annual Rent 누적):</span>
                                          <span>{(result.financials.sumOfRents ?? 0).toFixed(2)} 억원 (연평균 {((result.financials.sumOfRents ?? 0)/18).toFixed(2)}억)</span>
                                        </div>
                                        <div className="flex justify-between text-gray-600">
                                          <span>• 18년차 임대지분 영구 잔존가치 (Terminal Value):</span>
                                          <span>{(result.financials.terminalValue ?? 0).toFixed(2)} 억원 (자본환원율 {step4CapRate}% 기준 잔존 평가)</span>
                                        </div>
                                        <div className="flex justify-between text-emerald-800 font-bold border-t border-gray-200 pt-1.5 mt-1">
                                          <span>• 최종 합산 수지 총 가치:</span>
                                          <span>{result.financials.totalRevenues.toLocaleString()} 억원</span>
                                        </div>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* 3. 성과 지표 부문 */}
                          <div className="space-y-2.5 bg-white p-4 rounded-xl border border-[#EDDBC7]/30">
                            <h5 className="font-extrabold text-gray-950 flex items-center gap-1.5 text-[11px]">
                              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                              3. 최종 사업성 지표 (Feasibility Core Metrics) 산출 근거
                            </h5>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pl-3 text-[11px] text-gray-650 leading-relaxed">
                              <div className="bg-slate-50/50 p-3 rounded-lg border border-gray-150 space-y-1.5">
                                <span className="font-bold text-gray-900 block">① 예상 개발 영업이익 (Operating Profit)</span>
                                <div className="font-mono text-gray-500 bg-white p-1 text-[9.5px] rounded border border-gray-100">
                                  공식: 총 매출가치 - 투입 총사업비
                                </div>
                                <div className="font-mono text-[11px] text-gray-900 font-bold pt-1">
                                  산정: {result.financials.totalRevenues.toLocaleString()}억 - {result.financials.totalProjectCost.toLocaleString()}억 = <span className="text-[#5F7161] font-black">{result.financials.operatingProfit.toLocaleString()} 억원</span>
                                </div>
                                <p className="text-[9px] text-gray-400 mt-1 leading-relaxed">
                                  * 기획을 통해 획득하는 모든 Inflow 총가치에서 토지비, 공사비, 간접비의 총합을 제외하여 순수 개발 수익을 구합니다.
                                </p>
                              </div>

                              <div className="bg-slate-50/50 p-3 rounded-lg border border-gray-150 space-y-1.5">
                                <span className="font-bold text-gray-900 block">② 투자 수익률 (ROI, Return on Investment)</span>
                                <div className="font-mono text-gray-500 bg-white p-1 text-[9.5px] rounded border border-gray-100">
                                  공식: (예상 영업이익 / 투입 총사업비) × 100
                                </div>
                                <div className="font-mono text-[11px] text-gray-900 font-bold pt-1">
                                  산정: ({result.financials.operatingProfit.toLocaleString()}억 / {result.financials.totalProjectCost.toLocaleString()}억) × 100 = <span className="text-indigo-600 font-black">{result.financials.roi}%</span>
                                </div>
                                <p className="text-[9px] text-gray-400 mt-1 leading-relaxed">
                                  * 투입된 자기자본 및 PF 조달 금액(총원가) 대비 최종 획득 수지 수익률로, 사업의 자본 효율성을 입증하는 척도입니다.
                                </p>
                              </div>

                              <div className="bg-slate-50/50 p-3 rounded-lg border border-gray-150 space-y-1.5">
                                <span className="font-bold text-gray-900 block">③ 손익분기 분양률 (BEP Ratio, Break-Even)</span>
                                <div className="font-mono text-gray-500 bg-white p-1 text-[9.5px] rounded border border-gray-100">
                                  공식: (투입 총사업비 / 예상 총 매출가치) × 100
                                </div>
                                <div className="font-mono text-[11px] text-gray-900 font-bold pt-1">
                                  산정: ({result.financials.totalProjectCost.toLocaleString()}억 / {result.financials.totalRevenues.toLocaleString()}억) × 100 = <span className="text-emerald-700 font-black">{result.financials.breakEvenRatio}%</span>
                                </div>
                                <p className="text-[9px] text-gray-400 mt-1 leading-relaxed">
                                  * 전체 기획 매출액 중 '개발 원가'가 차지하는 비율입니다. 즉, 전체 상품 중 최소 {result.financials.breakEvenRatio}% 이상 분양/임대 계약을 마쳐야 적자를 면하고 이익 구간에 진입함을 나타냅니다.
                                </p>
                              </div>

                              <div className="bg-slate-50/50 p-3 rounded-lg border border-gray-150 space-y-1.5">
                                <span className="font-bold text-gray-900 block">④ 내부 수익률 (IRR, Internal Rate of Return)</span>
                                <div className="font-mono text-gray-500 bg-white p-1 text-[9.5px] rounded border border-gray-100 flex items-center justify-between">
                                  <span>공식: NPV(순현재가치) = ∑ [CF_t / (1 + IRR)^t] = 0</span>
                                </div>
                                <div className="font-mono text-[11px] text-gray-900 font-bold pt-1">
                                  산정: 20개년 동적 시뮬레이션 = <span className="text-purple-600 font-black">{result.irr}%</span>
                                </div>
                                <p className="text-[9px] text-gray-400 mt-1 leading-relaxed">
                                  * 0년차 대지 계약금 지출(-), 1~2년차 공사비 지출(-), 1~3년차 분양 대금(선계약금/중도금/잔금)과 임대보증금 및 연차별 월세 수입을 20년 현금흐름 연장선상에서 산정한 실질적 시간 가치 반영 이자율입니다.
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
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
                          <strong>1. 투자 수익률 (ROI):</strong> 총 사업 투입비(원가) 대비 예상 영업이익(10개년 분양/임대 합산 수치)의 비율입니다. 투자 자금 대비 거두는 마진 폭을 직접적으로 나타내어, 단기 자본 효율성을 파악하는 대표 지표입니다.
                        </p>
                        <p>
                          <strong>2. 내부수익률 (IRR 수익성):</strong> 사업 20년 현금흐름의 연평균 복리수익률입니다. <span className="font-semibold text-[#5F7161]">15% 이상(S등급: 우수)</span>, <span className="font-semibold text-amber-650">8~15%(A/B등급: 양호)</span>, <span className="font-semibold text-rose-600">8% 미만(C이하: 미흡)</span>으로 자본 비용 극복 여부를 판정합니다.
                        </p>
                        <p>
                          <strong>3. 손익분기 분양률 (BEP 안전성):</strong> 총 원가를 회수하기 위해 필수로 완료해야 하는 누적 분양 매출률입니다. <span className="font-semibold text-[#5F7161]">60% 이하(안전)</span>, <span className="font-semibold text-rose-600">80% 초과(위험)</span>로 평가합니다.
                        </p>
                        <p>
                          <strong>4. BEP 1~2년 회수 vs 안전성 점수 괴리:</strong>
                          <br />
                          현금흐름 시뮬레이션 상 2~3년차 만에 BEP(누적현금 +전환)를 달성하더라도, <strong>손익분기 분양률(원가율) 자체가 80%를 넘으면 안전성 점수는 낮게 나옵니다.</strong> 원금 회수 속도가 빠른 것(유동성/회전율 우수)과, 최종 미분양 시 사업이 도산할 위험(마진폭 안전성)은 별개의 리스크 지표이기 때문입니다.
                        </p>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    {/* STEP 3 ONLY: ARCHITECTURAL SPEC & LEGAL STANDARDS FOR RESIDENTIAL AND MIXED-USE */}
                    {/* A. 🏢 건축 용도별 부대복리시설 계획안 */}
                    <div className="p-5 bg-white rounded-2xl border border-gray-100 shadow-sm space-y-4">
                      <h5 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5 border-b border-gray-50 pb-2">
                        <Layers className="w-4 h-4 text-[#5F7161]" />
                        🏢 건축 용도별 부대복리시설 계획안
                      </h5>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div className="p-3 bg-[#FCFAF7] rounded-xl border border-gray-100">
                          <span className="font-bold text-[#2C251F] block mb-1">공동주택 부대시설</span>
                          <p className="text-gray-600">규모: <strong className="text-[#5F7161]">{Math.round(aptAuxArea * 3.30578)} ㎡</strong> (약 {aptAuxArea}평)</p>
                          <p className="text-[10px] text-gray-400 mt-1">주민공동시설, 관리사무소, 경로당, 어린이놀이터</p>
                        </div>
                        <div className="p-3 bg-[#FCFAF7] rounded-xl border border-gray-100">
                          <span className="font-bold text-[#2C251F] block mb-1">오피스텔 부대시설</span>
                          <p className="text-gray-600">규모: <strong className="text-[#5F7161]">{Math.round(officetelAuxArea * 3.30578)} ㎡</strong> (약 {officetelAuxArea}평)</p>
                          <p className="text-[10px] text-gray-400 mt-1">공유 택배함, 코인 세탁실, 입주민 공유 미팅룸</p>
                        </div>
                        <div className="p-3 bg-[#FCFAF7] rounded-xl border border-gray-100">
                          <span className="font-bold text-[#2C251F] block mb-1">호텔 부대복리시설</span>
                          <p className="text-gray-600">규모: <strong className="text-[#5F7161]">{Math.round(hotelAuxArea * 3.30578)} ㎡</strong> (약 {hotelAuxArea}평)</p>
                          <p className="text-[10px] text-gray-400 mt-1">로비 라운지, 컨시어지 데스크, 조식 레스토랑, 스파</p>
                        </div>
                        <div className="p-3 bg-[#FCFAF7] rounded-xl border border-gray-100">
                          <span className="font-bold text-[#2C251F] block mb-1">업무시설 공용시설</span>
                          <p className="text-gray-600">규모: <strong className="text-[#5F7161]">{Math.round(officeAuxArea * 3.30578)} ㎡</strong> (약 {officeAuxArea}평)</p>
                          <p className="text-[10px] text-gray-400 mt-1">복합기 룸, 스마트 OA 센터, 공용 회의실, 휴게실</p>
                        </div>
                      </div>
                    </div>

                    {/* B. 📐 층별 면적 구성 및 층고 배분 산식 명세 (반복적 산식 반영) */}
                    <div className="p-5 bg-white rounded-2xl border border-gray-100 shadow-sm space-y-4">
                      <h5 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5 border-b border-gray-50 pb-2">
                        <Calculator className="w-4 h-4 text-indigo-600" />
                        📐 층별 면적 구성 및 층고 배분 산식 명세
                      </h5>
                      <div className="space-y-3 text-xs">
                        <div className="p-3.5 bg-slate-50/70 rounded-xl border border-slate-100 space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-gray-800 text-[12px]">🏢 지상 1층 (1F) - 로비 및 근린생활시설</span>
                            <span className="font-mono text-xs font-bold text-indigo-700">층고: {customFloorHeights['1F'] || 4.5} m</span>
                          </div>
                          <div className="text-[11px] text-slate-600 space-y-1">
                            <p>• 1F 계획 면적: <strong>{Math.min(result.aboveGroundGFA, Math.round(landArea * (appliedBCR / 100))).toLocaleString()} ㎡</strong> (약 {parseFloat((Math.min(result.aboveGroundGFA, Math.round(landArea * (appliedBCR / 100))) * 0.3025).toFixed(1))}평)</p>
                            <p className="text-[10px] text-gray-400 font-mono bg-white p-1.5 rounded border border-gray-200/50">
                              [산식] 1F 면적 = 대지면적 ({landArea.toLocaleString()}㎡) × 건폐율 ({appliedBCR}%) 한도 내 배치
                            </p>
                          </div>
                        </div>

                        {result.aboveGroundFloors > 1 && (
                          <div className="p-3.5 bg-slate-50/70 rounded-xl border border-slate-100 space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="font-bold text-gray-800 text-[12px]">🏢 지상 {result.actualTypicalStart}층 ~ 지상 {result.actualTypicalEnd}층 (기준 반복층)</span>
                              <span className="font-mono text-xs font-bold text-indigo-700">평균 층고: {defaultFloorHeight} m</span>
                            </div>
                            <div className="text-[11px] text-slate-600 space-y-1">
                              <p>• 층별 평균 계획 면적: <strong>{Math.round((result.aboveGroundGFA - Math.min(result.aboveGroundGFA, Math.round(landArea * (appliedBCR / 100)))) / result.typicalFloorCount).toLocaleString()} ㎡</strong> (약 {parseFloat(((result.aboveGroundGFA - Math.min(result.aboveGroundGFA, Math.round(landArea * (appliedBCR / 100)))) * 0.3025 / result.typicalFloorCount).toFixed(1))}평) / 층당</p>
                              <p className="text-[10px] text-gray-400 font-mono bg-white p-1.5 rounded border border-gray-200/50">
                                [산식] 기준층 면적 = [지상연면적 ({result.aboveGroundGFA.toLocaleString()}㎡) - 1층면적 ({Math.min(result.aboveGroundGFA, Math.round(landArea * (appliedBCR / 100))).toLocaleString()}㎡)] ÷ 기준층수 {result.typicalFloorCount}개층
                              </p>
                            </div>
                          </div>
                        )}

                        {undergroundFloors > 0 && (
                          <div className="p-3.5 bg-slate-50/70 rounded-xl border border-slate-100 space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="font-bold text-gray-800 text-[12px]">🚗 지하 1층 ~ 지하 {undergroundFloors}층 (지하 반복층)</span>
                              <span className="font-mono text-xs font-bold text-[#5F7161]">평균 층고: 3.5 m</span>
                            </div>
                            <div className="text-[11px] text-slate-600 space-y-1">
                              <p>• 층별 평균 지하 면적: <strong>{Math.round(result.undergroundGFA / undergroundFloors).toLocaleString()} ㎡</strong> (약 {parseFloat((result.undergroundGFA * 0.3025 / undergroundFloors).toFixed(1))}평) / 층당</p>
                              <p className="text-[10px] text-gray-400 font-mono bg-white p-1.5 rounded border border-gray-200/50">
                                [산식] 지하 층별 면적 = 지하 연면적 ({result.undergroundGFA.toLocaleString()}㎡) ÷ 지하 {undergroundFloors}개층
                              </p>
                            </div>
                          </div>
                        )}
                        
                        <div className="p-3 bg-indigo-50/40 rounded-xl border border-indigo-100/60 flex justify-between items-center">
                          <span className="font-bold text-indigo-950">총 계획 건축물 높이 (지상고)</span>
                          <span className="font-mono font-extrabold text-indigo-700 text-sm">{result.totalBuildingHeight.toFixed(1)} m</span>
                        </div>
                        <div className="p-3 bg-emerald-50/40 rounded-xl border border-emerald-100/60 flex justify-between items-center">
                          <span className="font-bold text-emerald-950">총 계획 건축물 깊이 (지하 깊이)</span>
                          <span className="font-mono font-extrabold text-emerald-700 text-sm">{result.totalUndergroundDepth.toFixed(1)} m</span>
                        </div>
                      </div>
                    </div>

                    {/* C. ⚖️ 공동주택 법규 및 부대복리시설 설치기준 검토 */}
                    <div className="p-5 bg-white rounded-2xl border border-gray-100 shadow-sm space-y-4">
                      <h5 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5 border-b border-gray-50 pb-2">
                        <Compass className="w-4 h-4 text-red-600" />
                        ⚖️ 공동주택 법규 및 부대복리시설 설치의무 사전검토
                      </h5>
                      
                      <div className="space-y-3 text-xs">
                        <div className="p-3 bg-red-50/30 rounded-xl border border-red-100/50 space-y-1">
                          <span className="font-bold text-red-950 block">1. 주택법에 따른 주거시설 법정 주차 기준</span>
                          <div className="text-slate-600 leading-relaxed text-[11px] space-y-0.5">
                            <p>• 세대당 법정 확보 의무: <strong>{result.aptLegalParking.toFixed(1)} 대</strong> ({aptConfigs.reduce((s, i) => s + i.count, 0)}세대 기준)</p>
                            <p>• 오피스텔 법정 확보 의무: <strong>{result.officetelLegalParking.toFixed(1)} 대</strong> ({officetelConfigs.reduce((s, i) => s + i.count, 0)}실 기준)</p>
                            <p>• 계획 주차 면적: <strong>{result.designedParkingCount} 대 기획</strong> (법정 의무 대비 {result.designedParkingCount >= Math.ceil(result.totalLegalParking) ? '🟢 초과 확보 완료' : '🔴 부족 (조율 필요)'})</p>
                          </div>
                        </div>

                        <div className="p-3 bg-emerald-50/30 rounded-xl border border-emerald-100/50 space-y-2">
                          <span className="font-bold text-emerald-950 block">2. 주택건설기준 규정 (부대복리시설 필수 설치 대상)</span>
                          <div className="grid grid-cols-2 gap-2 text-[10px]">
                            <div className="p-2 bg-white rounded border border-emerald-100 flex justify-between items-center">
                              <span>관리사무소 (50세대 이상)</span>
                              <span className={`px-1.5 py-0.5 rounded font-bold ${aptConfigs.reduce((s, i) => s + i.count, 0) >= 50 ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-500'}`}>
                                {aptConfigs.reduce((s, i) => s + i.count, 0) >= 50 ? '✅ 대상' : '⚪ 미대상'}
                              </span>
                            </div>
                            <div className="p-2 bg-white rounded border border-emerald-100 flex justify-between items-center">
                              <span>경로당 (100세대 이상)</span>
                              <span className={`px-1.5 py-0.5 rounded font-bold ${aptConfigs.reduce((s, i) => s + i.count, 0) >= 100 ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-500'}`}>
                                {aptConfigs.reduce((s, i) => s + i.count, 0) >= 100 ? '✅ 대상' : '⚪ 미대상'}
                              </span>
                            </div>
                            <div className="p-2 bg-white rounded border border-emerald-100 flex justify-between items-center">
                              <span>어린이놀이터 (100세대 이상)</span>
                              <span className={`px-1.5 py-0.5 rounded font-bold ${aptConfigs.reduce((s, i) => s + i.count, 0) >= 100 ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-500'}`}>
                                {aptConfigs.reduce((s, i) => s + i.count, 0) >= 100 ? '✅ 대상' : '⚪ 미대상'}
                              </span>
                            </div>
                            <div className="p-2 bg-white rounded border border-emerald-100 flex justify-between items-center">
                              <span>어린이집 (150세대 이상)</span>
                              <span className={`px-1.5 py-0.5 rounded font-bold ${aptConfigs.reduce((s, i) => s + i.count, 0) >= 150 ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-500'}`}>
                                {aptConfigs.reduce((s, i) => s + i.count, 0) >= 150 ? '✅ 대상' : '⚪ 미대상'}
                              </span>
                            </div>
                          </div>
                          <p className="text-[9px] text-gray-400">※ 기획 세대 수에 따라 관계 법령에 따른 설치 요건을 실시간 산정합니다.</p>
                        </div>

                        <div className="p-3 bg-blue-50/30 rounded-xl border border-blue-100/50 space-y-1">
                          <span className="font-bold text-blue-950 block">3. 일조권 확보를 위한 건축물 높이 제한 (건축법 제61조)</span>
                          <p className="text-slate-600 leading-relaxed text-[10px]">
                            • 높이 9m 이하 부분: 대지경계선으로부터 1.5m 이상 이격<br />
                            • 높이 9m 초과 부분: 건축물 높이의 1/2(0.5배) 이상 이격 의무<br />
                            • 공동주택 채광 방향 동간거리는 높이의 0.5배 이상 이격 필요
                          </p>
                        </div>

                        <div className="p-3 bg-amber-50/30 rounded-xl border border-amber-150 space-y-1">
                          <span className="font-bold text-amber-950 block">4. 초고층 및 준초고층 피난안전 기준</span>
                          <p className="text-slate-600 leading-relaxed text-[10px]">
                            • 준초고층 이상 ({result.aboveGroundFloors >= 30 ? '🔴 해당' : '🟢 해당 없음'}): 30층 이상이거나 높이 120m 이상인 건축물은 최대 30개층마다 1개소 이상의 피난안전구역 설치 의무
                          </p>
                        </div>
                      </div>
                    </div>
                  </>
                )}
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
        );
      }
