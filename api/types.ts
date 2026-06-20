/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface LandRegulatoryAnalysis {
  id?: string;
  address: string;
  zoning: string;
  baselineFAR: number; // 기준 용적률 (%)
  baselineBCR: number; // 기준 건폐율 (%)
  heightLimit: string; // 높이 제한 내용
  areaSize: number; // 대지 면적 (m²)
  regulations: Array<{
    title: string;
    status: 'warning' | 'safe' | 'info';
    desc: string;
  }>;
  developmentPotential: string; // 개발 가치 및 분석 의견
  recommendations: string[]; // 검토 제언 사항들
}

export interface FARRelaxationInput {
  landArea: number;
  baselineFAR: number;
  donatedArea: number; // 기부채납 면적 (m²)
  hasPublicOpenSpace: boolean;
  publicOpenSpaceRatio: number; // 공개공지 비율 (%)
  ecoFriendlyCert: 'none' | 'green' | 'energy' | 'both'; // 친환경 인증 여부
  rentalHousingRatio: number; // 임대주택 추가 비율 (%)
}

export interface FARRelaxationResult {
  finalFAR: number; // 완화 적용 최종 용적률 (%)
  breakdown: {
    base: number;
    donation: number;
    openSpace: number;
    eco: number;
    rental: number;
  };
  explanation: string;
}

export interface UnitConfig {
  id: string;
  name: string;
  sizeM2: number; // 전용 면적 m²
  pyung: number; // 전용 면적 평형
  salesPricePerPyung: number; // 평당 분양가 (만원)
  percentage: number; // 세대 배분 비율 (%)
}

export interface ScenarioInput {
  landArea: number;
  appliedFAR: number; // 적용할 용적률 (%)
  appliedBCR: number; // 적용할 건폐율 (%)
  netRatio: number; // 전용률 (%)
  landPurchasePrice: number; // 토지매입가 (억원)
  constructionCostPerPyung: number; // 평당 공사비 (만원)
  unitConfigs: UnitConfig[];
  otherCostsRatio: number; // 기타 사업비 비율 (%)
}

export interface AllocatedUnitResult {
  id: string;
  name: string;
  sizeM2: number;
  pyung: number;
  count: number; // 세대수
  unitSalesPrice: number; // 세대당 분양가 (억원)
  totalSalesPrice: number; // 전체 분양가 (억원)
}

export interface ScenarioResult {
  aboveGroundGFA: number; // 지상 연면적 (m²)
  undergroundGFA: number; // 지하 연면적 (m²)
  totalGFA: number; // 총 연면적 (m²)
  totalGFAByPyung: number; // 총 연면적 (평)
  aboveGroundGFAByPyung: number; // 지상 연면적 (평)
  allocatedUnits: AllocatedUnitResult[];
  totalAllocatedUnits: number; // 총 배분 세대수
  financials: {
    landCost: number; // 토지비 (억원)
    constructionCost: number; // 건축 공사비 (억원)
    otherCosts: number; // 기타 비용 (억원)
    totalProjectCost: number; // 총 사업비 (억원)
    totalSalesRevenue: number; // 총 분양 매출 (억원)
    operatingProfit: number; // 예상 영업 이익 (억원)
    roi: number; // 투자 대비 수익률 (%)
    breakEvenRatio: number; // 손익분기 분양률 (%)
  };
}

export interface SampleLand {
  id: string;
  address: string;
  zoning: string;
  areaSize: number;
  baselineFAR: number;
  baselineBCR: number;
  heightLimit: string;
  description: string;
  eumLink: string;
}
