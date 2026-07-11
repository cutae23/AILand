/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { LandRegulatoryAnalysis, FARRelaxationResult, ScenarioResult, AllocatedUnitResult } from '../types';
import { CircleDollarSign, Coins, TrendingUp, Building2, Layers, Compass, HelpCircle, ArrowRight, Table, Sparkles, Loader2, RefreshCw, AlertTriangle, Home, Briefcase, Info, Plus, Trash2, Calculator, Activity, Puzzle } from 'lucide-react';
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
  const [aboveGroundFloors, setAboveGroundFloors] = useState<number>(() => inputs?.aboveGroundFloors ?? 7);
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

  // [USER ADDITIONS] New States: Typical Floor Range (기준층 범위 설정)
  const [typicalFloorStart, setTypicalFloorStart] = useState<number>(() => inputs?.typicalFloorStart ?? 2);
  const [typicalFloorEnd, setTypicalFloorEnd] = useState<number>(() => inputs?.typicalFloorEnd ?? 7);

  // [USER ADDITIONS] Layout Simulation parameters
  const [useLayoutSimulation, setUseLayoutSimulation] = useState<boolean>(() => inputs?.useLayoutSimulation ?? true);
  const [floorCalculationMode, setFloorCalculationMode] = useState<'auto' | 'manual'>(() => inputs?.floorCalculationMode ?? 'auto');
  const [towerCount, setTowerCount] = useState<number>(() => inputs?.towerCount ?? 2);
  const [unitsPerFloorLine, setUnitsPerFloorLine] = useState<number>(() => inputs?.unitsPerFloorLine ?? 4);
  const [podiumFloors, setPodiumFloors] = useState<number>(() => inputs?.podiumFloors ?? 2);
  const [buildingSeparationDistance, setBuildingSeparationDistance] = useState<number>(() => inputs?.buildingSeparationDistance ?? 40);
  const [boundarySeparationDistance, setBoundarySeparationDistance] = useState<number>(() => inputs?.boundarySeparationDistance ?? 12);
  const [buildingSeparationRatio, setBuildingSeparationRatio] = useState<number>(() => inputs?.buildingSeparationRatio ?? 0.8);
  const [sunlightBoundaryRatio, setSunlightBoundaryRatio] = useState<number>(() => inputs?.sunlightBoundaryRatio ?? 0.5);
  
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
    setAptConfigs(prev => prev.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        if (field === 'sizeM2') {
          updated.pyung = parseFloat((Number(value) * 0.3025).toFixed(1));
        } else if (field === 'pyung') {
          updated.sizeM2 = parseFloat((Number(value) / 0.3025).toFixed(1));
        }
        return updated;
      }
      return item;
    }));
  };

  const handleUpdateOfficetelField = (id: string, field: keyof HousingConfig, value: any) => {
    setOfficetelConfigs(prev => prev.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        if (field === 'sizeM2') {
          updated.pyung = parseFloat((Number(value) * 0.3025).toFixed(1));
        } else if (field === 'pyung') {
          updated.sizeM2 = parseFloat((Number(value) / 0.3025).toFixed(1));
        }
        return updated;
      }
      return item;
    }));
  };

  const handleDeleteApt = (id: string) => {
    setAptConfigs(prev => prev.filter(item => item.id !== id));
  };

  const handleDeleteOfficetel = (id: string) => {
    setOfficetelConfigs(prev => prev.filter(item => item.id !== id));
  };

  const handleAddAptConfig = () => {
    const newId = `apt_custom_${Date.now()}`;
    setAptConfigs(prev => [
      ...prev,
      { id: newId, name: '새 공동주택 평형', sizeM2: 84, pyung: 25, salesPricePerPyung: 4500, count: 5 }
    ]);
  };

  const handleAddOfficetelConfig = () => {
    const newId = `officetel_custom_${Date.now()}`;
    setOfficetelConfigs(prev => [
      ...prev,
      { id: newId, name: '새 오피스텔 타입', sizeM2: 59, pyung: 18, salesPricePerPyung: 3000, count: 5 }
    ]);
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
      rentMultiplier: number
    ) => {
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

      const finalSalesRevenue = exitStrategy === 'sales'
        ? parseFloat(((aptSales + officetelSales + 
                      (hotelRoomCount * hotelRoomSizePyung * (hotelPricePerPyung * pricePerPyungMultiplier)) + 
                      ((retailB1Area * (retailB1Price * pricePerPyungMultiplier)) + (retail1FArea * (retail1FPrice * pricePerPyungMultiplier)) + (retail2FArea * (retail2FPrice * pricePerPyungMultiplier)) + (retail3FArea * (retail3FPrice * pricePerPyungMultiplier))) + 
                      (officeArea * (officePricePerPyung * pricePerPyungMultiplier)) + customAllSalesVal) / 10000).toFixed(2))
        : totalSalesRevenue;

      const finalLeaseDeposits = exitStrategy === 'sales' ? 0 : totalLeaseDeposits;
      const finalAnnualRent = exitStrategy === 'sales' ? 0 : totalAnnualRent;

      const leaseExitValue = finalAnnualRent * 18; // ~5.5% cap rate exit value

      // Comprehensive NPV/Inflow Evaluation based on scenario
      const totalRevenues = exitStrategy === 'sales'
        ? finalSalesRevenue
        : exitStrategy === 'lease-exit'
          ? parseFloat((finalSalesRevenue + finalLeaseDeposits + (finalAnnualRent * 5) + leaseExitValue).toFixed(2))
          : parseFloat((finalSalesRevenue + finalLeaseDeposits + (finalAnnualRent * 15)).toFixed(2));

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
      cashFlows[1] = parseFloat(((finalSalesRevenue * 0.3) - (constructionAndOther * 0.5)).toFixed(2));

      // Year 2 (Construction Year 2)
      cashFlows[2] = parseFloat(((finalSalesRevenue * 0.4) - (constructionAndOther * 0.5)).toFixed(2));

      // Year 3 (Completion & Operational Year 1)
      cashFlows[3] = parseFloat(((finalSalesRevenue * 0.3) + finalLeaseDeposits + finalAnnualRent).toFixed(2));

      // Year 4 to 20 (Operational Years)
      for (let t = 4; t <= 20; t++) {
        if (exitStrategy === 'sales') {
          cashFlows[t] = 0;
        } else if (exitStrategy === 'lease-exit') {
          if (t === 5) {
            cashFlows[t] = parseFloat((finalAnnualRent + leaseExitValue).toFixed(2)); // rent + bulk exit sale in Year 5
          } else {
            cashFlows[t] = 0; // sold already
          }
        } else {
          // lease-permanent
          cashFlows[t] = parseFloat(finalAnnualRent.toFixed(2));
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
          bepRequiredUnits
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
    useLayoutSimulation, towerCount, unitsPerFloorLine, podiumFloors, buildingSeparationDistance, boundarySeparationDistance, buildingSeparationRatio, sunlightBoundaryRatio,
    useCustomResidentFacilities, residentFacilities
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
          useLayoutSimulation, towerCount, unitsPerFloorLine, podiumFloors, buildingSeparationDistance, boundarySeparationDistance, buildingSeparationRatio, sunlightBoundaryRatio,
          useCustomResidentFacilities, residentFacilities
        },
        result
      });
    }
  }, [result, onScenarioChange]);

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
          { category: '스터디 및 소통형 에듀 공간', yield: '4.7%', description: '학군 수요 대응 프리미엄 독서실 및 영유아 웰니스 클럽 권장' }
        ],
        risksText: '상업적 폭발력이나 자산 가치 단기 폭증 가능성은 매우 낮음. 인구 감소 지역의 경우 장기 배후 세대 정체에 따른 임대수익 정밀 조율 필요.'
      };
    }
  };

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
            {activeStep === 3 ? (
              <>
                <h2 className="text-lg font-semibold text-[#2C251F] flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-[#5F7161]" />
                  Step 3: 계획안 개요 (건축 기획 및 상품 구성)
                </h2>
                <p className="text-xs text-[#8D7B68] font-normal mt-1 leading-relaxed">
                  지상/지하 용도별 구성안을 기획하고 각 상품의 평형과 호실(세대)수를 배분하여 법정 주차 대수 및 용적률 설계 정합성을 확인하는 설계 개요 단계입니다.
                </p>
              </>
            ) : (
              <>
                <h2 className="text-lg font-semibold text-[#2C251F] flex items-center gap-2">
                  <CircleDollarSign className="w-5 h-5 text-indigo-600" />
                  Step 4: 사업성 분석 (재무 수지 및 시뮬레이션)
                </h2>
                <p className="text-xs text-[#8D7B68] font-normal mt-1 leading-relaxed">
                  대지 수매가와 건축비 예산, 주변 시세를 반영한 평당 분양/임대가 조건을 기반으로 ROI, 내부수익률(IRR), 손익분기점(BEP) 등 종합 재무성을 시뮬레이션합니다.
                </p>
              </>
            )}
          </div>
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
                <span className="text-xs font-bold uppercase tracking-wider">용적률 한도 및 기획 연면적 검토</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${result.isFarExceeded ? 'bg-red-200 text-red-900' : 'bg-emerald-100 text-emerald-900'}`}>
                  {result.isFarExceeded ? '용적률 초과 (설계 재조정 필요)' : '설계 정합성 양호 (법정 이내)'}
                </span>
              </div>
              <div className="text-xs">
                대지면적: <strong className="text-gray-900">{landArea.toLocaleString()}㎡</strong> | 
                적용 용적률: <strong className={result.isFarExceeded ? 'text-red-700' : 'text-emerald-700'}>{result.consumedFAR.toFixed(2)}%</strong> (허용: {appliedFAR}%) | 
                기획 연면적: <strong>{result.aboveGroundGFA.toLocaleString()}㎡</strong> / <strong>{result.totalGFA.toLocaleString()}㎡</strong> (지상/총)
              </div>
            </div>
          </div>
        </div>

        {/* AI Market Analysis Report Card */}
        {activeStep !== 3 && marketAnalysisReport && (
          <div className="p-5 bg-gradient-to-br from-amber-50/40 to-orange-50/20 border border-[#EDDBC7]/80 rounded-2xl space-y-4 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#EDDBC7]/40 pb-3">
              <div className="flex items-center gap-2 text-[#2C251F] font-bold text-sm">
                <Sparkles className="w-4 h-4 text-amber-600 animate-pulse" />
                <span>AI 주변 입지·실거래 기반 수지분석 추천값 동기화</span>
              </div>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                실시간 주변 분석 동기화 완료
              </span>
            </div>

            <p className="text-xs text-[#6E5D4F] leading-relaxed whitespace-pre-wrap font-medium">{marketAnalysisReport}</p>

            {aiRecommendations && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                <div className="p-2.5 bg-white/70 rounded-xl border border-[#EDDBC7]/40 space-y-1">
                  <div className="text-[10px] text-gray-400 font-semibold">AI 권장 토지비</div>
                  <div className="text-xs font-bold text-gray-900">
                    {aiRecommendations.landPricePerPyung 
                      ? `평당 ${aiRecommendations.landPricePerPyung.toLocaleString()} 만원`
                      : `${aiRecommendations.landPurchasePrice?.toLocaleString()} 억원`
                    }
                  </div>
                  <div className="text-[9px] text-gray-400">
                    {aiRecommendations.landPricePerPyung 
                      ? `총 약 ${aiRecommendations.landPurchasePrice?.toLocaleString()} 억원`
                      : '공시지가 및 실거래 분석'
                    }
                  </div>
                </div>
                <div className="p-2.5 bg-white/70 rounded-xl border border-[#EDDBC7]/40 space-y-1">
                  <div className="text-[10px] text-gray-400 font-semibold">AI 권장 평당 공사비</div>
                  <div className="text-xs font-bold text-gray-900">{aiRecommendations.constructionCostPerPyung?.toLocaleString()} 만원</div>
                  <div className="text-[9px] text-gray-400">현 시점 자재·노무비 반영</div>
                </div>
                <div className="p-2.5 bg-white/70 rounded-xl border border-[#EDDBC7]/40 space-y-1">
                  <div className="text-[10px] text-gray-400 font-semibold">오피스 권장 평당임대</div>
                  <div className="text-xs font-bold text-gray-900">보 {aiRecommendations.officeDepositPerPyung?.toLocaleString()}만 / 월 {aiRecommendations.officeRentPerPyung?.toLocaleString()}만</div>
                  <div className="text-[9px] text-gray-400">주변 오피스 공실률 보정</div>
                </div>
                <div className="p-2.5 bg-white/70 rounded-xl border border-[#EDDBC7]/40 space-y-1">
                  <div className="text-[10px] text-gray-400 font-semibold">상가 1F 권장 평당임대</div>
                  <div className="text-xs font-bold text-gray-900">보 {aiRecommendations.retail1FDeposit?.toLocaleString()}만 / 월 {aiRecommendations.retail1FRent?.toLocaleString()}만</div>
                  <div className="text-[9px] text-gray-400">핵심 배후 상권 요율</div>
                </div>
              </div>
            )}

            <div className="text-[10px] text-[#8D7B68] flex items-center gap-1 font-semibold">
              <Info className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
              <span>위 파라미터는 AI가 대상지 주소({currentLand?.address}) 주변의 실거래가 및 임대수요 트렌드를 추출하여 산정한 값으로, 하단의 수지분석 시뮬레이션에 자동 대입되었습니다.</span>
            </div>
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
                            <th className="p-2.5 w-1/3">평형 타입명</th>
                            <th className="p-2.5 w-[14%] text-right">전용(㎡)</th>
                            <th className="p-2.5 w-[14%] text-right">실평수(평)</th>
                            {activeStep !== 3 && <th className="p-2.5 w-1/5 text-right">평당분양가(만)</th>}
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
                                    onChange={(e) => handleUpdateAptField(cfg.id, 'name', e.target.value)}
                                    placeholder="예: 공동주택 84A형"
                                    className="w-full font-bold text-[#2C251F] bg-slate-50/20 hover:bg-slate-50 focus:bg-white border border-gray-200 focus:border-[#5F7161] rounded-lg px-2 py-1 focus:outline-none text-[11px]"
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
                                      value={cfg.salesPricePerPyung || ''}
                                      onChange={(e) => handleUpdateAptField(cfg.id, 'salesPricePerPyung', parseInt(e.target.value) || 0)}
                                      className="w-16 text-right font-mono font-bold text-[#5F7161] bg-slate-50/20 hover:bg-slate-50 focus:bg-white border border-gray-200 focus:border-[#5F7161] rounded-lg px-1.5 py-1 focus:outline-none text-[11px]"
                                    />
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
                            <th className="p-2.5 w-1/3">타입명</th>
                            <th className="p-2.5 w-[14%] text-right">전용(㎡)</th>
                            <th className="p-2.5 w-[14%] text-right">실평수(평)</th>
                            {activeStep !== 3 && <th className="p-2.5 w-1/5 text-right">평당분양가(만)</th>}
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
                                    onChange={(e) => handleUpdateOfficetelField(cfg.id, 'name', e.target.value)}
                                    placeholder="예: 오피스텔 30형 원룸"
                                    className="w-full font-bold text-[#2C251F] bg-slate-50/20 hover:bg-slate-50 focus:bg-white border border-gray-200 focus:border-[#5F7161] rounded-lg px-2 py-1 focus:outline-none text-[11px]"
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
                                      value={cfg.salesPricePerPyung || ''}
                                      onChange={(e) => handleUpdateOfficetelField(cfg.id, 'salesPricePerPyung', parseInt(e.target.value) || 0)}
                                      className="w-16 text-right font-mono font-bold text-indigo-700 bg-slate-50/20 hover:bg-slate-50 focus:bg-white border border-gray-200 focus:border-[#5F7161] rounded-lg px-1.5 py-1 focus:outline-none text-[11px]"
                                    />
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
                          <span>평당 토지 매입비</span>
                          <span className="font-bold text-[#5F7161]">{landPricePerPyung.toLocaleString()} 만원/평</span>
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
                          <span>㎡당 토지비 환산</span>
                          <span>약 {Math.round(landPricePerPyung / 3.3058).toLocaleString()} 만원/㎡</span>
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

          {/* RIGHT: RESULTS (7 Columns) */}
          <div className="lg:col-span-7 space-y-6">
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
                            <td className="py-2 px-3 font-semibold bg-gray-50/50 border-r border-gray-100">건폐율 (BCR)</td>
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
                            <td className="py-2 px-3 font-semibold bg-gray-50/50 border-r border-gray-100">용적률 (FAR)</td>
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
                              <td className="py-2 px-2.5 font-bold bg-gray-50/40 border-r border-gray-100">🏠 공동주택 (아파트)</td>
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
                          <th className="py-2.5 px-2 text-right text-indigo-600">ROI (%)</th>
                          <th className="py-2.5 px-2 text-right text-emerald-700">IRR (%)</th>
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

            {result.totalAllocatedUnits > 0 || result.allocatedUnits.length > 0 ? (
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

                {activeStep === 4 ? (
                  <>
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

                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 text-center">
                        <div>
                          <span className="text-[10px] text-slate-400 block">총 투자비 (원가)</span>
                          <span className="font-bold text-sm text-gray-800 block mt-0.5">{result.financials.totalProjectCost} 억</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block">총 매출가치 (Inflows)</span>
                          <span className="font-bold text-sm text-[#5F7161] block mt-0.5">{result.financials.totalRevenues} 억</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block">투자 수익률 (ROI)</span>
                          <span className={`font-bold text-sm ${result.financials.roi >= 0 ? 'text-[#5F7161]' : 'text-rose-600'} block mt-0.5`}>
                            {result.financials.roi}%
                          </span>
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
                          <p className="text-gray-600">규모: <strong className="text-[#5F7161]">{aptAuxArea}평</strong> (약 {Math.round(aptAuxArea * 3.3)}㎡)</p>
                          <p className="text-[10px] text-gray-400 mt-1">주민공동시설, 관리사무소, 경로당, 어린이놀이터</p>
                        </div>
                        <div className="p-3 bg-[#FCFAF7] rounded-xl border border-gray-100">
                          <span className="font-bold text-[#2C251F] block mb-1">오피스텔 부대시설</span>
                          <p className="text-gray-600">규모: <strong className="text-[#5F7161]">{officetelAuxArea}평</strong> (약 {Math.round(officetelAuxArea * 3.3)}㎡)</p>
                          <p className="text-[10px] text-gray-400 mt-1">공유 택배함, 코인 세탁실, 입주민 공유 미팅룸</p>
                        </div>
                        <div className="p-3 bg-[#FCFAF7] rounded-xl border border-gray-100">
                          <span className="font-bold text-[#2C251F] block mb-1">호텔 부대복리시설</span>
                          <p className="text-gray-600">규모: <strong className="text-[#5F7161]">{hotelAuxArea}평</strong> (약 {Math.round(hotelAuxArea * 3.3)}㎡)</p>
                          <p className="text-[10px] text-gray-400 mt-1">로비 라운지, 컨시어지 데스크, 조식 레스토랑, 스파</p>
                        </div>
                        <div className="p-3 bg-[#FCFAF7] rounded-xl border border-gray-100">
                          <span className="font-bold text-[#2C251F] block mb-1">업무시설 공용시설</span>
                          <p className="text-gray-600">규모: <strong className="text-[#5F7161]">{officeAuxArea}평</strong> (약 {Math.round(officeAuxArea * 3.3)}㎡)</p>
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
