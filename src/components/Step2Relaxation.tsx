/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { FARRelaxationInput, FARRelaxationResult, LandRegulatoryAnalysis } from '../types';
import { ArrowRight, HelpCircle, ShieldCheck, Award, Home, Trees, Coins, Sliders, Hotel, Sparkles, Leaf, Building2 } from 'lucide-react';
import { motion } from 'motion/react';

interface Step2RelaxationProps {
  currentLand: LandRegulatoryAnalysis | null;
  onCalculationComplete: (result: FARRelaxationResult) => void;
  savedResult: FARRelaxationResult | null;
}

export const getIncentiveLegality = (id: string, zoning: string | undefined, area: number) => {
  if (!zoning) {
    return {
      allowed: true,
      reason: '대지 정보가 연동되지 않아 가상 시뮬레이션이 활성화되었습니다. 실제 대지 연동 시 용도지역에 따른 법적 규제가 엄격히 적용됩니다.'
    };
  }

  const isCommercial = zoning.includes('상업');
  const isQuasiResidential = zoning.includes('준주거');
  const isResidential7 = zoning.includes('7층이하') || zoning.includes('제2종') || zoning.includes('제1종');

  switch (id) {
    case 'donation': // 1. 기부채납
      return {
        allowed: true,
        reason: '모든 용도지역에서 기부채납을 통한 용적률 및 건폐율 완화 혜택을 법적으로 적극 지원합니다.'
      };
    
    case 'openSpace': // 2. 공개공지
      if (isResidential7 && area < 400) {
        return {
          allowed: false,
          reason: '대지면적 400㎡ 미만의 소규모 저층주거지역(7층이하)은 조례상 공개공지 의무 대상이 아니며 완화 가산 적용이 법적으로 제외됩니다.'
        };
      }
      return {
        allowed: true,
        reason: '건축법 및 서울시 조례에 따라 공개공지 설치 비율에 부합하는 용적률/높이 완화 인센티브를 적용할 수 있습니다.'
      };
      
    case 'eco': // 3. 친환경
      return {
        allowed: true,
        reason: '녹색건축물 조성 지원법에 따라 모든 용도지역에서 친환경 및 제로에너지 인증에 따른 가산 혜택(최대 12%p)이 가능합니다.'
      };

    case 'rental': // 4. 임대주택
      if (isResidential7) {
        return {
          allowed: false,
          reason: '제2종일반주거지역(7층이하) 등 저층 규제구역은 역세권 고밀 임대주택 완화 조항(법정상한 용적률 상향)의 수혜 대상이 아닙니다.'
        };
      }
      return {
        allowed: true,
        reason: '역세권 및 조례 완화 조항에 정합하여, 일정 비율의 공공임대 공급을 통한 법정상한 용적률 완화 가점을 받을 수 있습니다.'
      };

    case 'hotel': // 5. 관광숙박
      if (!isCommercial && !isQuasiResidential) {
        return {
          allowed: false,
          reason: '관광숙박시설 활성화 특별조례에 따라 일반 주거지역(7층제한 포함)은 주거환경 정온성 보호를 위해 인센티브 대상에서 제외됩니다.'
        };
      }
      return {
        allowed: true,
        reason: '상업/준주거지역 내 관광숙박시설(관광호텔 등) 도입 특례 규정에 의거하여 특별 용적률 완화 혜택이 주어집니다.'
      };

    case 'specialArchitectural': // 6. 특별건축구역
      if (area < 400) {
        return {
          allowed: false,
          reason: '대지면적 400㎡ 미만의 소형 필지는 건축법상 창의적 도시미관 기여 기준에 부합하지 않아 특별건축구역 지정 대상에서 법적으로 제외됩니다.'
        };
      }
      return {
        allowed: true,
        reason: '지정 규모 조건에 부합하며, 디자인 및 공공성 확보 시 높이/일조/사선 제한 유연화 및 용적률 완화를 병행 적용할 수 있습니다.'
      };

    case 'openGreen': // 7. 개방형 녹지
      if (!isCommercial) {
        return {
          allowed: false,
          reason: '개방형 녹지 인센티브는 서울시 "녹지생태도심 재창조 가이드라인"에 따라 중심 도심권의 상업지역에만 국한 적용되는 특별법적 규정입니다.'
        };
      }
      return {
        allowed: true,
        reason: '상업지역 고밀복합개발 가이드라인에 따라 개방형 녹지비율 조성을 통한 획기적인 친녹색 도심 인센티브를 산정합니다.'
      };

    case 'creativeDesign': // 8. 창의혁신 디자인
      if (isResidential7) {
        return {
          allowed: false,
          reason: '서울시 "도시·건축 디자인 혁신 방안"에 따라 저층 노후주거지역(7층이하) 소규모 개발은 심의 대상 및 특별 인센티브 수혜에서 법적으로 제외됩니다.'
        };
      }
      return {
        allowed: true,
        reason: '지자체 창의·혁신 공모 가이드라인을 통과할 경우, 독창적 디자인 및 예술적 가점을 부여받을 수 있습니다.'
      };

    case 'mixedUse': // 9. 주거·비주거 복합용도
      if (!isCommercial && !isQuasiResidential) {
        return {
          allowed: false,
          reason: '주거·비주거 비율 및 복합용도 개발 인센티브는 상업지역 및 준주거지역 내의 주상복합 건축물에 한해 조례로 규정된 특례입니다.'
        };
      }
      return {
        allowed: true,
        reason: '상업/준주거구역 내 주상복합 용도 배분 조례에 정합하여, 비주거 비율 확보 시 고밀 완화 특례가 자동 가산 연산됩니다.'
      };

    default:
      return { allowed: true, reason: '' };
  }
};

export default function Step2Relaxation({ currentLand, onCalculationComplete, savedResult }: Step2RelaxationProps) {
  // Setup inputs depending on whether we have Step 1 land profile loaded
  const landArea = currentLand ? currentLand.areaSize : 500;
  const baselineFAR = currentLand ? currentLand.baselineFAR : 200;

  // 기부채납 유형별 상태 변수
  const [donatedArea, setDonatedArea] = useState<number>(
    savedResult && savedResult.breakdown.donatedLandArea !== undefined
      ? savedResult.breakdown.donatedLandArea
      : (savedResult && savedResult.breakdown.donation > 0 ? 15 : 0)
  );
  
  const [hasDonatedLand, setHasDonatedLand] = useState<boolean>(
    savedResult && savedResult.breakdown.donatedLandArea !== undefined
      ? savedResult.breakdown.donatedLandArea > 0
      : (savedResult && savedResult.breakdown.donation > 0)
  );

  const [hasDonatedBuilding, setHasDonatedBuilding] = useState<boolean>(
    savedResult && savedResult.breakdown.donatedBuildingArea !== undefined
      ? savedResult.breakdown.donatedBuildingArea > 0
      : false
  );
  const [donatedBuildingArea, setDonatedBuildingArea] = useState<number>(
    savedResult && savedResult.breakdown.donatedBuildingArea !== undefined
      ? savedResult.breakdown.donatedBuildingArea
      : 0
  );
  const [facilityType, setFacilityType] = useState<'community' | 'childcare' | 'library' | 'startup'>(
    savedResult && savedResult.breakdown.facilityType
      ? (savedResult.breakdown.facilityType as any)
      : 'community'
  );

  const [hasDonatedCash, setHasDonatedCash] = useState<boolean>(
    savedResult && savedResult.breakdown.donatedCashAmount !== undefined
      ? savedResult.breakdown.donatedCashAmount > 0
      : false
  );
  const [donatedCashAmount, setDonatedCashAmount] = useState<number>(
    savedResult && savedResult.breakdown.donatedCashAmount !== undefined
      ? savedResult.breakdown.donatedCashAmount
      : 0
  );
  const [landAppraisalValue, setLandAppraisalValue] = useState<number>(
    savedResult && savedResult.breakdown.landAppraisalValue !== undefined
      ? savedResult.breakdown.landAppraisalValue
      : 800 // default 800만원/㎡
  );

  const [hasPublicOpenSpace, setHasPublicOpenSpace] = useState<boolean>(savedResult ? savedResult.breakdown.openSpace > 0 : false);
  const [publicOpenSpaceRatio, setPublicOpenSpaceRatio] = useState<number>(savedResult ? 6 : 5);
  const [ecoFriendlyCert, setEcoFriendlyCert] = useState<'none' | 'green' | 'energy' | 'both'>(
    savedResult 
      ? (savedResult.breakdown.eco > 10 ? 'both' : savedResult.breakdown.eco > 5 ? 'green' : 'none')
      : 'none'
  );
  const [rentalHousingRatio, setRentalHousingRatio] = useState<number>(savedResult ? (savedResult.breakdown.rental > 0 ? 10 : 0) : 0);
  
  const [hasHotelIncentive, setHasHotelIncentive] = useState<boolean>(
    savedResult && savedResult.breakdown.hotel && savedResult.breakdown.hotel > 0 ? true : false
  );
  const [hotelIncentiveLevel, setHotelIncentiveLevel] = useState<'standard' | 'premium' | 'luxury'>(
    savedResult && savedResult.breakdown.hotel
      ? (savedResult.breakdown.hotel >= 50 ? 'luxury' : savedResult.breakdown.hotel >= 30 ? 'premium' : 'standard')
      : 'standard'
  );

  const [hasSpecialArchitecturalZone, setHasSpecialArchitecturalZone] = useState<boolean>(
    savedResult && savedResult.breakdown.specialArchitecturalZone && savedResult.breakdown.specialArchitecturalZone > 0 ? true : false
  );
  const [specialArchitecturalZoneType, setSpecialArchitecturalZoneType] = useState<'standard' | 'excellence' | 'innovative'>(
    savedResult && savedResult.breakdown.specialArchitecturalZone
      ? (savedResult.breakdown.specialArchitecturalZone >= 20 ? 'innovative' : savedResult.breakdown.specialArchitecturalZone >= 15 ? 'excellence' : 'standard')
      : 'standard'
  );

  const [hasOpenGreenSpace, setHasOpenGreenSpace] = useState<boolean>(
    savedResult && savedResult.breakdown.openGreenSpace && savedResult.breakdown.openGreenSpace > 0 ? true : false
  );
  const [openGreenSpaceRatio, setOpenGreenSpaceRatio] = useState<number>(
    savedResult && savedResult.breakdown.openGreenSpace
      ? Math.round(savedResult.breakdown.openGreenSpace / 1.2)
      : 25
  );

  const [hasCreativeDesign, setHasCreativeDesign] = useState<boolean>(
    savedResult && savedResult.breakdown.creativeDesign && savedResult.breakdown.creativeDesign > 0 ? true : false
  );
  const [creativeDesignLevel, setCreativeDesignLevel] = useState<'standard' | 'excellence'>(
    savedResult && savedResult.breakdown.creativeDesign
      ? (savedResult.breakdown.creativeDesign >= 40 ? 'excellence' : 'standard')
      : 'standard'
  );

  const [hasMixedUseIncentive, setHasMixedUseIncentive] = useState<boolean>(
    savedResult && savedResult.breakdown.mixedUse && savedResult.breakdown.mixedUse > 0 ? true : false
  );
  const [nonResidentialRatio, setNonResidentialRatio] = useState<number>(
    savedResult && savedResult.breakdown.nonResidentialRatio !== undefined
      ? savedResult.breakdown.nonResidentialRatio
      : 20
  );

  // Evaluate legalities
  const legalityDonation = getIncentiveLegality('donation', currentLand?.zoning, landArea);
  const legalityOpenSpace = getIncentiveLegality('openSpace', currentLand?.zoning, landArea);
  const legalityEco = getIncentiveLegality('eco', currentLand?.zoning, landArea);
  const legalityRental = getIncentiveLegality('rental', currentLand?.zoning, landArea);
  const legalityHotel = getIncentiveLegality('hotel', currentLand?.zoning, landArea);
  const legalitySpecialArchitectural = getIncentiveLegality('specialArchitectural', currentLand?.zoning, landArea);
  const legalityOpenGreen = getIncentiveLegality('openGreen', currentLand?.zoning, landArea);
  const legalityCreativeDesign = getIncentiveLegality('creativeDesign', currentLand?.zoning, landArea);
  const legalityMixedUse = getIncentiveLegality('mixedUse', currentLand?.zoning, landArea);

  // Auto-reset disallowed options when land zoning changes
  useEffect(() => {
    if (!currentLand) return;
    const zoning = currentLand.zoning;
    const area = currentLand.areaSize;

    if (!getIncentiveLegality('openSpace', zoning, area).allowed) {
      setHasPublicOpenSpace(false);
    }
    if (!getIncentiveLegality('rental', zoning, area).allowed) {
      setRentalHousingRatio(0);
    }
    if (!getIncentiveLegality('hotel', zoning, area).allowed) {
      setHasHotelIncentive(false);
    }
    if (!getIncentiveLegality('specialArchitectural', zoning, area).allowed) {
      setHasSpecialArchitecturalZone(false);
    }
    if (!getIncentiveLegality('openGreen', zoning, area).allowed) {
      setHasOpenGreenSpace(false);
    }
    if (!getIncentiveLegality('creativeDesign', zoning, area).allowed) {
      setHasCreativeDesign(false);
    }
    if (!getIncentiveLegality('mixedUse', zoning, area).allowed) {
      setHasMixedUseIncentive(false);
    }
  }, [currentLand]);

  // Unified calculations
  const buildingEquivalentArea = hasDonatedBuilding ? (donatedBuildingArea * 0.3) : 0;
  const cashEquivalentArea = hasDonatedCash ? (donatedCashAmount * 10000 / landAppraisalValue) : 0;
  const totalEquivalentDonatedArea = (hasDonatedLand ? donatedArea : 0) + buildingEquivalentArea + cashEquivalentArea;
  const remainingArea = Math.max(1, landArea - (hasDonatedLand ? donatedArea : 0));

  const donationLandBonus = legalityDonation.allowed && remainingArea > 0 ? parseFloat((baselineFAR * 1.5 * ((hasDonatedLand ? donatedArea : 0) / remainingArea)).toFixed(2)) : 0;
  const donationBuildingBonus = legalityDonation.allowed && remainingArea > 0 ? parseFloat((baselineFAR * 1.5 * (buildingEquivalentArea / remainingArea)).toFixed(2)) : 0;
  const donationCashBonus = legalityDonation.allowed && remainingArea > 0 ? parseFloat((baselineFAR * 1.5 * (cashEquivalentArea / remainingArea)).toFixed(2)) : 0;
  const donationBonus = parseFloat((donationLandBonus + donationBuildingBonus + donationCashBonus).toFixed(2));

  const openSpaceBonus = legalityOpenSpace.allowed && hasPublicOpenSpace ? parseFloat((baselineFAR * 0.12 * (publicOpenSpaceRatio / 10)).toFixed(2)) : 0;
  
  let ecoBonus = 0;
  if (legalityEco.allowed) {
    if (ecoFriendlyCert === 'green') ecoBonus = parseFloat((baselineFAR * 0.05).toFixed(2));
    else if (ecoFriendlyCert === 'energy') ecoBonus = parseFloat((baselineFAR * 0.08).toFixed(2));
    else if (ecoFriendlyCert === 'both') ecoBonus = parseFloat((baselineFAR * 0.12).toFixed(2));
  }

  const rentalBonus = legalityRental.allowed ? parseFloat((rentalHousingRatio * 1.5).toFixed(2)) : 0;

  const hotelBonus = legalityHotel.allowed && hasHotelIncentive 
    ? (hotelIncentiveLevel === 'standard' ? 15 : hotelIncentiveLevel === 'premium' ? 30 : 50) 
    : 0;

  const specialArchitecturalZoneBonus = legalitySpecialArchitectural.allowed && hasSpecialArchitecturalZone 
    ? (specialArchitecturalZoneType === 'standard' ? 10 : specialArchitecturalZoneType === 'excellence' ? 15 : 25) 
    : 0;

  const openGreenSpaceBonus = legalityOpenGreen.allowed && hasOpenGreenSpace ? parseFloat((openGreenSpaceRatio * 1.2).toFixed(2)) : 0;

  const creativeDesignBonus = legalityCreativeDesign.allowed && hasCreativeDesign 
    ? (creativeDesignLevel === 'standard' ? 20 : 40) 
    : 0;

  const mixedUseBonus = legalityMixedUse.allowed && hasMixedUseIncentive ? Math.min(40, nonResidentialRatio) : 0;

  const currentTotalFAR = parseFloat((baselineFAR + donationBonus + openSpaceBonus + ecoBonus + rentalBonus + hotelBonus + specialArchitecturalZoneBonus + openGreenSpaceBonus + creativeDesignBonus + mixedUseBonus).toFixed(1));

  // Auto-run calculation whenever inputs change
  useEffect(() => {
    // Generate friendly explanation
    let explParts: string[] = [];
    if (donationBonus > 0) {
      const parts = [];
      if (hasDonatedLand && donatedArea > 0) {
        parts.push(`토지 기부채납 면적 ${donatedArea}㎡ 확보 (+${donationLandBonus}%p)`);
      }
      if (hasDonatedBuilding && donatedBuildingArea > 0) {
        const facLabel = facilityType === 'community' ? '주민공동시설' : facilityType === 'childcare' ? '국공립어린이집' : facilityType === 'library' ? '공공도서관' : '청년창업지원센터';
        parts.push(`건물 기부채납 연면적 ${donatedBuildingArea}㎡ 기여 (${facLabel}, 환산부지 ${buildingEquivalentArea.toFixed(1)}㎡, +${donationBuildingBonus}%p)`);
      }
      if (hasDonatedCash && donatedCashAmount > 0) {
        parts.push(`현금 기부채납 ${donatedCashAmount}억원 납부 (환산부지 ${cashEquivalentArea.toFixed(1)}㎡, +${donationCashBonus}%p)`);
      }
      explParts.push(`기부채납 공공기여 가산점: 총 환산부지 ${totalEquivalentDonatedArea.toFixed(1)}㎡를 통한 용적률 완화 가점 +${donationBonus}%p가 반영되었습니다. (${parts.join(', ')})`);
    }
    if (openSpaceBonus > 0) {
      explParts.push(`상시 개방되는 공개공지(${publicOpenSpaceRatio}%) 설치로 도시경관 기여도 완화 기준 +${openSpaceBonus}%p 가 적용됩니다.`);
    }
    if (ecoBonus > 0) {
      const label = ecoFriendlyCert === 'both' ? '우수 친환경 및 에너지 자립인증' : ecoFriendlyCert === 'green' ? '녹색건축 우수등급' : '에너지 효율 1등급';
      explParts.push(`${label}을 통해 에너지 환경 인센티브 +${ecoBonus}%p가 추가 산정되었습니다.`);
    }
    if (rentalBonus > 0) {
      explParts.push(`공공 기여 임대주택 지분 분양(${rentalHousingRatio}%) 연계를 통해 역세권 고밀 복합 개발 완화 혜택 +${rentalBonus}%p 가 반영되어 최대치 규제 허들을 상향 조율했습니다.`);
    }
    if (hotelBonus > 0) {
      const hotelLabel = hotelIncentiveLevel === 'luxury' ? '특급 관광호텔급 특례' : hotelIncentiveLevel === 'premium' ? '우수 비즈니스 호텔급' : '중소형 관광숙박';
      explParts.push(`관광진흥 조례에 의거한 [${hotelLabel}] 도입 지정에 따른 특별 인센티브 수혜로 용적률 +${hotelBonus}%p가 전격 가산 완화되었습니다.`);
    }
    if (specialArchitecturalZoneBonus > 0) {
      const sazLabel = specialArchitecturalZoneType === 'innovative' ? '창의혁신 유도형' : specialArchitecturalZoneType === 'excellence' ? '디자인 특화형' : '일반 지정형';
      explParts.push(`특별건축구역 [${sazLabel}] 지정에 따라 도시 미관 향상 및 창의적 입면 기여 인센티브 +${specialArchitecturalZoneBonus}%p 가 가산되었습니다.`);
    }
    if (openGreenSpaceBonus > 0) {
      explParts.push(`녹지생태도심 가이드라인에 따른 개방형 녹지비율(${openGreenSpaceRatio}%) 조성을 통해 도심 녹지 생태 공간 기여 인센티브 +${openGreenSpaceBonus}%p가 연동 산정되었습니다.`);
    }
    if (creativeDesignBonus > 0) {
      const designLabel = creativeDesignLevel === 'excellence' ? '최우수 디자인 혁신' : '우수 디자인 혁신';
      explParts.push(`서울시/지자체 도시·건축 창의혁신 디자인 공모 및 심의 통과 [${designLabel}] 특례 조항에 따라 용적률 +${creativeDesignBonus}%p가 대폭 가산 완화되었습니다.`);
    }
    if (mixedUseBonus > 0) {
      explParts.push(`주거·비주거 복합용도 개발 유도에 따라 비주거 비율 ${nonResidentialRatio}%를 확보하여 상업·문화 기능 연계 인센티브 용적률 +${mixedUseBonus}%p가 가산되었습니다.`);
    }

    const explanation = explParts.length > 0 
      ? explParts.join('\n\n')
      : '현재 완화 옵션이 가동되지 않았습니다. 기부채납, 공개공지, 친환경 자격 등을 선택하여 추가 용적률 혜택을 시뮬레이션 하세요.';

    const calcResult: FARRelaxationResult = {
      finalFAR: currentTotalFAR,
      breakdown: {
        base: baselineFAR,
        donation: donationBonus,
        openSpace: openSpaceBonus,
        eco: ecoBonus,
        rental: rentalBonus,
        hotel: hotelBonus,
        specialArchitecturalZone: specialArchitecturalZoneBonus,
        openGreenSpace: openGreenSpaceBonus,
        creativeDesign: creativeDesignBonus,
        mixedUse: mixedUseBonus,
        hasMixedUseIncentive,
        nonResidentialRatio,
        
        donationLand: donationLandBonus,
        donationBuilding: donationBuildingBonus,
        donationCash: donationCashBonus,
        donatedLandArea: hasDonatedLand ? donatedArea : 0,
        donatedBuildingArea: hasDonatedBuilding ? donatedBuildingArea : 0,
        donatedCashAmount: hasDonatedCash ? donatedCashAmount : 0,
        facilityType,
        landAppraisalValue
      },
      explanation
    };

    onCalculationComplete(calcResult);
  }, [
    landArea, 
    baselineFAR, 
    donatedArea, 
    hasDonatedLand,
    hasDonatedBuilding,
    donatedBuildingArea,
    facilityType,
    hasDonatedCash,
    donatedCashAmount,
    landAppraisalValue,
    hasPublicOpenSpace, 
    publicOpenSpaceRatio, 
    ecoFriendlyCert, 
    rentalHousingRatio, 
    hasHotelIncentive, 
    hotelIncentiveLevel,
    hasSpecialArchitecturalZone,
    specialArchitecturalZoneType,
    hasOpenGreenSpace,
    openGreenSpaceRatio,
    hasCreativeDesign,
    creativeDesignLevel,
    hasMixedUseIncentive,
    nonResidentialRatio,
    mixedUseBonus,
    currentTotalFAR
  ]);

  // Max legal range indicator for UI
  const maxLegalFAR = Math.round(
    baselineFAR * 1.5 + 
    (hasHotelIncentive ? 50 : 0) + 
    (hasSpecialArchitecturalZone ? 25 : 0) + 
    (hasOpenGreenSpace ? 60 : 0) + 
    (hasCreativeDesign ? 40 : 0) +
    (hasMixedUseIncentive ? 40 : 0)
  );

  // Percentage bar fill helper
  const barWidthPercent = Math.min(100, Math.max(10, (currentTotalFAR / maxLegalFAR) * 100));

  return (
    <div className="space-y-6" id="step2-container">
      {/* Introduction Card */}
      <div className="bg-white p-5 rounded-2xl border border-[#EDDBC7]/60 shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
          <h2 className="text-lg font-semibold text-[#2C251F] flex items-center gap-2">
            <Sliders className="w-5 h-5 text-[#5F7161]" />
            Step 2: 인센티브 조건별 용적률 완화 계산기
          </h2>
          {currentLand ? (
            <span className="text-xs font-semibold px-2.5 py-1 bg-[#F2F0ED] text-[#5F7161] rounded-full border border-[#E5E2DD]">
              📍 {currentLand.address.split(' ').slice(0, 3).join(' ')} 대지 연동 중
            </span>
          ) : (
            <span className="text-xs font-medium px-2.5 py-1 bg-amber-50 text-amber-700 rounded-full border border-amber-100 animate-pulse">
              ⚠️ 미연동 (기본 500㎡ 기준 시뮬레이션)
            </span>
          )}
        </div>

        <p className="text-sm text-[#8D7B68] leading-relaxed mb-6 font-normal">
          지방자치단체 조례 및 건축법 규정에 따른 기부채납 설계, 공개공지 식재 계획, 친환경 제로에너지건축물 등급 및 
          의무 임대주택 공급 약정 비율을 조절해가며 최종 완화 적용 용적률을 시뮬레이션 합니다.
        </p>

        <div className="flex flex-col gap-8">
          {/* Controls - Left (Full Width for mobile & sequential flow) */}
          <div className="w-full space-y-6">
            
            {/* Input 1: Comprehensive Public Contribution (기부채납) */}
            <div className={`p-4 rounded-xl border transition-all ${
              !legalityDonation.allowed ? 'bg-gray-100/50 border-gray-200 opacity-70 select-none' : 'bg-[#FCFAF7] border-gray-100'
            } space-y-4`}>
              <div className="flex justify-between items-center border-b border-[#EDDBC7]/60 pb-2">
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-bold text-[#3E362E] flex items-center gap-1.5">
                    <Coins className="w-4 h-4 text-[#5F7161]" />
                    1. 기부채납(공공 기여) 종합 계획
                  </span>
                  <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-bold self-start inline-block">
                    ✓ 법정 상시 적용 가능
                  </span>
                </div>
                <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full">
                  총 완화 가점 +{donationBonus.toFixed(1)}%p
                </span>
              </div>
              <p className="text-[11px] text-[#8D7B68] leading-relaxed">
                서울시 및 지자체 조례에 따라 공공 기여 방식은 <strong className="text-[#3E362E]">토지</strong>뿐만 아니라, 공공 수요가 높은 <strong className="text-[#3E362E]">건물(공공시설)</strong> 및 <strong className="text-[#3E362E]">현금(재정 기여)</strong> 기부채납도 모두 인정되어 통합 합산 연산됩니다.
              </p>

              {/* Sub-item A: Land Donation */}
              <div className="pt-2 border-t border-gray-100/60 space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                    <input
                      type="checkbox"
                      checked={hasDonatedLand}
                      onChange={(e) => {
                        setHasDonatedLand(e.target.checked);
                        if (!e.target.checked) setDonatedArea(0);
                      }}
                      className="w-3.5 h-3.5 rounded text-[#5F7161] focus:ring-[#5F7161]"
                    />
                    A. 토지 기부채납 (부지 무상 양도)
                  </label>
                  {hasDonatedLand && (
                    <span className="text-[11px] font-bold text-[#5F7161]">{donatedArea}㎡ 확보</span>
                  )}
                </div>
                {hasDonatedLand && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="pl-5 space-y-1.5"
                  >
                    <input
                      type="range"
                      min="0"
                      max={Math.floor(landArea * 0.25)}
                      step="1"
                      value={donatedArea}
                      onChange={(e) => setDonatedArea(Number(e.target.value))}
                      className="w-full accent-[#5F7161]"
                    />
                    <div className="flex justify-between text-[9px] text-gray-400">
                      <span>0㎡</span>
                      <span>최대 {Math.floor(landArea * 0.25)}㎡ (총 면적의 25%)</span>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Sub-item B: Building Donation */}
              <div className="pt-2 border-t border-gray-100/60 space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                    <input
                      type="checkbox"
                      checked={hasDonatedBuilding}
                      onChange={(e) => {
                        setHasDonatedBuilding(e.target.checked);
                        if (!e.target.checked) setDonatedBuildingArea(0);
                      }}
                      className="w-3.5 h-3.5 rounded text-[#5F7161] focus:ring-[#5F7161]"
                    />
                    B. 건물 기부채납 (공공시설 설치 및 양도)
                  </label>
                  {hasDonatedBuilding && (
                    <span className="text-[11px] font-bold text-[#5F7161]">{donatedBuildingArea}㎡ 기여</span>
                  )}
                </div>
                {hasDonatedBuilding && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="pl-5 space-y-3"
                  >
                    <p className="text-[10px] text-gray-400 leading-normal">
                      어린이집, 도서관 등을 건축하여 지자체에 기부하는 경우로, 표준건축비 and 대지감정평가 비율에 맞춰 부지 면적으로 환산 적용됩니다 (약 1㎡ ➔ 0.3㎡ 대지 환산).
                    </p>
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] text-gray-500">
                        <span>공급 연면적:</span>
                        <span className="font-semibold text-gray-700">{donatedBuildingArea}㎡ (환산 대지: {buildingEquivalentArea.toFixed(1)}㎡)</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="1000"
                        step="10"
                        value={donatedBuildingArea}
                        onChange={(e) => setDonatedBuildingArea(Number(e.target.value))}
                        className="w-full accent-[#5F7161]"
                      />
                      <div className="flex justify-between text-[9px] text-gray-400">
                        <span>0㎡</span>
                        <span>최대 1,000㎡</span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] text-gray-400 font-semibold block">기부채납 공공시설 용도 선택:</span>
                      <div className="grid grid-cols-4 gap-1.5">
                        {[
                          { value: 'community', label: '주민공동' },
                          { value: 'childcare', label: '어린이집' },
                          { value: 'library', label: '도서관' },
                          { value: 'startup', label: '청년창업' },
                        ].map((item) => (
                          <button
                            key={item.value}
                            type="button"
                            onClick={() => setFacilityType(item.value as any)}
                            className={`py-1 text-[9px] rounded-md border text-center font-medium transition ${
                              facilityType === item.value
                                ? 'border-[#5F7161] bg-[#5F7161]/5 text-[#5F7161] font-semibold'
                                : 'border-gray-200 hover:bg-gray-50 text-gray-500'
                            }`}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Sub-item C: Cash Donation */}
              <div className="pt-2 border-t border-gray-100/60 space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                    <input
                      type="checkbox"
                      checked={hasDonatedCash}
                      onChange={(e) => {
                        setHasDonatedCash(e.target.checked);
                        if (!e.target.checked) setDonatedCashAmount(0);
                      }}
                      className="w-3.5 h-3.5 rounded text-[#5F7161] focus:ring-[#5F7161]"
                    />
                    C. 현금 기부채납 (재정 기여 및 펀딩)
                  </label>
                  {hasDonatedCash && (
                    <span className="text-[11px] font-bold text-[#5F7161]">{donatedCashAmount}억원 기여</span>
                  )}
                </div>
                {hasDonatedCash && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="pl-5 space-y-3"
                  >
                    <p className="text-[10px] text-gray-400 leading-normal">
                      토지나 건물 대신 현금을 직접 납부하는 공공기여 방식입니다. 납부액을 인근 공공감정가격으로 환산하여 equivalent 부지 면적으로 환산 산정합니다.
                    </p>
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] text-gray-500">
                        <span>공동 납입액:</span>
                        <span className="font-semibold text-gray-700">{donatedCashAmount}억원 (환산 대지: {cashEquivalentArea.toFixed(1)}㎡)</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="5"
                        value={donatedCashAmount}
                        onChange={(e) => setDonatedCashAmount(Number(e.target.value))}
                        className="w-full accent-[#5F7161]"
                      />
                      <div className="flex justify-between text-[9px] text-gray-400">
                        <span>0억원</span>
                        <span>최대 100억원</span>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-lg bg-white border border-gray-200/60 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] text-gray-500 font-medium">대지 감정평가액 설정:</span>
                        <span className="text-[10px] font-bold text-gray-700">{landAppraisalValue}만 원/㎡</span>
                      </div>
                      <input
                        type="range"
                        min="300"
                        max="2000"
                        step="50"
                        value={landAppraisalValue}
                        onChange={(e) => setLandAppraisalValue(Number(e.target.value))}
                        className="w-full h-1 accent-[#5F7161]"
                      />
                      <div className="flex justify-between text-[8px] text-gray-400">
                        <span>300만원/㎡</span>
                        <span>2,000만원/㎡ (평당 약 6,600만원)</span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Donation Summary Panel */}
              {totalEquivalentDonatedArea > 0 && (
                <div className="p-2.5 rounded-lg bg-[#5F7161]/5 border border-[#5F7161]/15 text-[10px] text-[#5F7161] flex justify-between items-center">
                  <span>총 합산 환산 기부 면적: <strong>{totalEquivalentDonatedArea.toFixed(1)}㎡</strong></span>
                  <span>(실제 남은 대지면적: {remainingArea.toFixed(0)}㎡)</span>
                </div>
              )}
            </div>

            {/* Input 2: Public Open Space (공개공지) */}
            <div className={`p-4 rounded-xl border transition-all ${
              !legalityOpenSpace.allowed ? 'bg-gray-100/50 border-gray-200 opacity-70' : 'bg-[#FCFAF7] border-gray-100'
            } space-y-3`}>
              <div className="flex justify-between items-start">
                <div className="flex flex-col gap-1 max-w-[85%]">
                  <span className="text-xs font-bold text-[#3E362E] flex items-center gap-1.5">
                    <Trees className="w-4 h-4 text-[#5F7161]" />
                    2. 공개공지(Public Open Space) 확보 계획
                  </span>
                  {!legalityOpenSpace.allowed ? (
                    <div className="mt-1 p-2 bg-amber-50 border border-amber-200/60 rounded-lg text-[10px] text-amber-800 font-medium leading-relaxed">
                      ⚠️ {legalityOpenSpace.reason}
                    </div>
                  ) : (
                    <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-bold self-start mt-1 inline-block">
                      ✓ 법적 가능: {legalityOpenSpace.reason}
                    </span>
                  )}
                </div>
                <input
                  type="checkbox"
                  disabled={!legalityOpenSpace.allowed}
                  checked={hasPublicOpenSpace}
                  onChange={(e) => setHasPublicOpenSpace(e.target.checked)}
                  className="w-4 h-4 rounded text-[#5F7161] focus:ring-[#5F7161] disabled:opacity-40"
                />
              </div>
              <p className="text-[11px] text-[#8D7B68]">
                도심 주민들이 자유롭게 거닐며 쉴 수 있도록 단지 앞 정원, 조경 벤치를 조성하여 개방하는 비율입니다.
              </p>

              {hasPublicOpenSpace && legalityOpenSpace.allowed && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="pt-2 pl-3 border-l-2 border-[#EDDBC7] space-y-2"
                >
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">대지면적 대비 확보 비율:</span>
                    <span className="font-semibold text-[#5F7161]">{publicOpenSpaceRatio}%</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="15"
                    step="0.5"
                    value={publicOpenSpaceRatio}
                    onChange={(e) => setPublicOpenSpaceRatio(Number(e.target.value))}
                    className="w-full accent-[#5F7161]"
                  />
                  <div className="flex justify-between text-[10px] text-gray-400">
                    <span>최소 5% 의무형</span>
                    <span>15% 고품격 개방형</span>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Input 3: Green Arch & Energy efficient certifications (친환경 및 안전) */}
            <div className={`p-4 rounded-xl border transition-all ${
              !legalityEco.allowed ? 'bg-gray-100/50 border-gray-200 opacity-70 select-none' : 'bg-[#FCFAF7] border-gray-100'
            } space-y-3`}>
              <div className="flex flex-col gap-1 border-b border-[#EDDBC7]/60 pb-2">
                <span className="text-xs font-bold text-[#3E362E] flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-[#5F7161]" />
                  3. 친환경 건축 인증 및 제로에너지 등급 여부
                </span>
                <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-bold self-start inline-block">
                  ✓ 법적 가능: {legalityEco.reason}
                </span>
              </div>
              <p className="text-[11px] text-[#8D7B68]">
                ESG 녹색 기여도에 맞춰 지자체가 최대 12%의 용적률을 가산해 줍니다.
              </p>
              <div className="grid grid-cols-2 gap-2 mt-1">
                {[
                  { value: 'none', label: '인증 없음 (+0%)' },
                  { value: 'green', label: '녹색건축인증 (+5%)' },
                  { value: 'energy', label: '에너지효율 1+ (+8%)' },
                  { value: 'both', label: '초에너지 복합형 (+12%)' },
                ].map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    disabled={!legalityEco.allowed}
                    onClick={() => setEcoFriendlyCert(item.value as any)}
                    className={`py-2 px-3 text-[11px] rounded-lg border text-left font-medium transition ${
                      ecoFriendlyCert === item.value
                        ? 'border-[#5F7161] bg-[#5F7161]/5 text-[#5F7161] font-semibold'
                        : 'border-gray-200 hover:bg-gray-50 text-gray-600'
                    } disabled:opacity-40`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Input 4: Public Rental Housing (공동주택 상생 임대주택) */}
            <div className={`p-4 rounded-xl border transition-all ${
              !legalityRental.allowed ? 'bg-gray-100/50 border-gray-200 opacity-70' : 'bg-[#FCFAF7] border-gray-100'
            } space-y-3`}>
              <div className="flex justify-between items-start">
                <div className="flex flex-col gap-1 max-w-[85%]">
                  <span className="text-xs font-bold text-[#3E362E] flex items-center gap-1.5">
                    <Home className="w-4 h-4 text-[#5F7161]" />
                    4. 공공기여 장기전세/공공임대 임대비율 추가
                  </span>
                  {!legalityRental.allowed ? (
                    <div className="mt-1 p-2 bg-amber-50 border border-amber-200/60 rounded-lg text-[10px] text-amber-800 font-medium leading-relaxed">
                      ⚠️ {legalityRental.reason}
                    </div>
                  ) : (
                    <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-bold self-start mt-1 inline-block">
                      ✓ 법적 가능: {legalityRental.reason}
                    </span>
                  )}
                </div>
                {legalityRental.allowed && (
                  <span className="text-xs font-semibold text-indigo-700">{rentalHousingRatio}% 연계</span>
                )}
              </div>
              <p className="text-[11px] text-[#8D7B68]">
                연면적 중 일정 지분을 지자체 공임 주택용으로 기부 및 위탁 운영 약정 시, 법정상한선(조례의 최대 1.5배)까지 파격 상향 완화됩니다.
              </p>
              {legalityRental.allowed && (
                <>
                  <input
                    type="range"
                    min="0"
                    max="25"
                    step="1"
                    value={rentalHousingRatio}
                    onChange={(e) => setRentalHousingRatio(Number(e.target.value))}
                    className="w-full accent-[#5F7161]"
                  />
                  <div className="flex justify-between text-[10px] text-gray-400">
                    <span>0% (일반 분양 올인)</span>
                    <span>25% (공동상생 역세권 복합형 임대)</span>
                  </div>
                </>
              )}
            </div>

            {/* Input 5: Tourism Accommodation Facility (관광숙박시설 완화 인센티브) */}
            <div className={`p-4 rounded-xl border transition-all ${
              !legalityHotel.allowed ? 'bg-gray-100/50 border-gray-200 opacity-70' : 'bg-[#FCFAF7] border-gray-100'
            } space-y-3`}>
              <div className="flex justify-between items-start">
                <div className="flex flex-col gap-1 max-w-[85%]">
                  <span className="text-xs font-bold text-[#3E362E] flex items-center gap-1.5">
                    <Hotel className="w-4 h-4 text-[#5F7161]" />
                    5. 관광숙박시설(관광호텔 등) 완화 인센티브 추가
                  </span>
                  {!legalityHotel.allowed ? (
                    <div className="mt-1 p-2 bg-amber-50 border border-amber-200/60 rounded-lg text-[10px] text-amber-800 font-medium leading-relaxed">
                      ⚠️ {legalityHotel.reason}
                    </div>
                  ) : (
                    <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-bold self-start mt-1 inline-block">
                      ✓ 법적 가능: {legalityHotel.reason}
                    </span>
                  )}
                </div>
                <input
                  type="checkbox"
                  disabled={!legalityHotel.allowed}
                  checked={hasHotelIncentive}
                  onChange={(e) => setHasHotelIncentive(e.target.checked)}
                  className="w-4 h-4 rounded text-[#5F7161] focus:ring-[#5F7161] disabled:opacity-40"
                />
              </div>
              <p className="text-[11px] text-[#8D7B68]">
                관광진흥 조례 및 지자체 건축 특별 조항에 의거, 관광숙박 목적의 시설 설계를 기획할 때 부여되는 고밀 특별 완화 수혜 혜택입니다.
              </p>

              {hasHotelIncentive && legalityHotel.allowed && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="pt-2 pl-3 border-l-2 border-[#EDDBC7] space-y-2"
                >
                  <span className="text-[10px] text-gray-400 font-semibold block">숙박시설 인센티브 등급 선택</span>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { value: 'standard', label: '일반/중소형 (+15%p)' },
                      { value: 'premium', label: '비즈니스 호텔 (+30%p)' },
                      { value: 'luxury', label: '특급 관광호텔 (+50%p)' },
                    ].map((item) => (
                      <button
                        key={item.value}
                        type="button"
                        onClick={() => setHotelIncentiveLevel(item.value as any)}
                        className={`py-1.5 px-2 text-[10px] rounded-lg border text-center font-medium transition ${
                          hotelIncentiveLevel === item.value
                            ? 'border-[#5F7161] bg-[#5F7161]/5 text-[#5F7161] font-semibold'
                            : 'border-gray-200 hover:bg-gray-50 text-gray-500'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </div>

            {/* Input 6: Special Architectural Zone (특별건축구역) */}
            <div className={`p-4 rounded-xl border transition-all ${
              !legalitySpecialArchitectural.allowed ? 'bg-gray-100/50 border-gray-200 opacity-70' : 'bg-[#FCFAF7] border-gray-100'
            } space-y-3`}>
              <div className="flex justify-between items-start">
                <div className="flex flex-col gap-1 max-w-[85%]">
                  <span className="text-xs font-bold text-[#3E362E] flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-[#5F7161]" />
                    6. 특별건축구역 지정 인센티브
                  </span>
                  {!legalitySpecialArchitectural.allowed ? (
                    <div className="mt-1 p-2 bg-amber-50 border border-amber-200/60 rounded-lg text-[10px] text-amber-800 font-medium leading-relaxed">
                      ⚠️ {legalitySpecialArchitectural.reason}
                    </div>
                  ) : (
                    <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-bold self-start mt-1 inline-block">
                      ✓ 법적 가능: {legalitySpecialArchitectural.reason}
                    </span>
                  )}
                </div>
                <input
                  type="checkbox"
                  disabled={!legalitySpecialArchitectural.allowed}
                  checked={hasSpecialArchitecturalZone}
                  onChange={(e) => setHasSpecialArchitecturalZone(e.target.checked)}
                  className="w-4 h-4 rounded text-[#5F7161] focus:ring-[#5F7161] disabled:opacity-40"
                />
              </div>
              <p className="text-[11px] text-[#8D7B68]">
                디자인 자유도와 공공성 확보를 위해 특별건축구역으로 지정받을 경우, 일조 사선제한 및 높이 규제가 유연화되며 완화 특례 혜택이 부여됩니다.
              </p>

              {hasSpecialArchitecturalZone && legalitySpecialArchitectural.allowed && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="pt-2 pl-3 border-l-2 border-[#EDDBC7] space-y-2"
                >
                  <span className="text-[10px] text-gray-400 font-semibold block">지정 및 특화 기획 등급 선택</span>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { value: 'standard', label: '일반 지정 (+10%p)' },
                      { value: 'excellence', label: '디자인 특화 (+15%p)' },
                      { value: 'innovative', label: '창의혁신 유도 (+25%p)' },
                    ].map((item) => (
                      <button
                        key={item.value}
                        type="button"
                        onClick={() => setSpecialArchitecturalZoneType(item.value as any)}
                        className={`py-1.5 px-2 text-[10px] rounded-lg border text-center font-medium transition ${
                          specialArchitecturalZoneType === item.value
                            ? 'border-[#5F7161] bg-[#5F7161]/5 text-[#5F7161] font-semibold'
                            : 'border-gray-200 hover:bg-gray-50 text-gray-500'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </div>

            {/* Input 7: Open Green Space (개방형 녹지) */}
            <div className={`p-4 rounded-xl border transition-all ${
              !legalityOpenGreen.allowed ? 'bg-gray-100/50 border-gray-200 opacity-70' : 'bg-[#FCFAF7] border-gray-100'
            } space-y-3`}>
              <div className="flex justify-between items-start">
                <div className="flex flex-col gap-1 max-w-[85%]">
                  <span className="text-xs font-bold text-[#3E362E] flex items-center gap-1.5">
                    <Leaf className="w-4 h-4 text-[#5F7161]" />
                    7. 개방형 녹지(Open Green Space) 도입 인센티브
                  </span>
                  {!legalityOpenGreen.allowed ? (
                    <div className="mt-1 p-2 bg-amber-50 border border-amber-200/60 rounded-lg text-[10px] text-amber-800 font-medium leading-relaxed">
                      ⚠️ {legalityOpenGreen.reason}
                    </div>
                  ) : (
                    <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-bold self-start mt-1 inline-block">
                      ✓ 법적 가능: {legalityOpenGreen.reason}
                    </span>
                  )}
                </div>
                <input
                  type="checkbox"
                  disabled={!legalityOpenGreen.allowed}
                  checked={hasOpenGreenSpace}
                  onChange={(e) => setHasOpenGreenSpace(e.target.checked)}
                  className="w-4 h-4 rounded text-[#5F7161] focus:ring-[#5F7161] disabled:opacity-40"
                />
              </div>
              <p className="text-[11px] text-[#8D7B68]">
                녹지생태도심 재창조 가이드라인에 부합하여, 지상부에 시민들을 위한 개방형 숲 및 테마 공원을 조성할 때 기여도 비례 추가 완화 혜택을 받습니다.
              </p>

              {hasOpenGreenSpace && legalityOpenGreen.allowed && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="pt-2 pl-3 border-l-2 border-[#EDDBC7] space-y-2"
                >
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">조성 녹지 면적 비율:</span>
                    <span className="font-semibold text-[#5F7161]">{openGreenSpaceRatio}%</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="50"
                    step="5"
                    value={openGreenSpaceRatio}
                    onChange={(e) => setOpenGreenSpaceRatio(Number(e.target.value))}
                    className="w-full accent-[#5F7161]"
                  />
                  <div className="flex justify-between text-[10px] text-gray-400">
                    <span>10% 확보 (+12%p)</span>
                    <span>50% 녹지숲 완충 (+60%p)</span>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Input 8: Creative & Innovative Design (도시·건축 창의혁신 디자인) */}
            <div className={`p-4 rounded-xl border transition-all ${
              !legalityCreativeDesign.allowed ? 'bg-gray-100/50 border-gray-200 opacity-70' : 'bg-[#FCFAF7] border-gray-100'
            } space-y-3`}>
              <div className="flex justify-between items-start">
                <div className="flex flex-col gap-1 max-w-[85%]">
                  <span className="text-xs font-bold text-[#3E362E] flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-[#5F7161]" />
                    8. 창의·혁신 디자인 설계 인센티브
                  </span>
                  {!legalityCreativeDesign.allowed ? (
                    <div className="mt-1 p-2 bg-amber-50 border border-amber-200/60 rounded-lg text-[10px] text-amber-800 font-medium leading-relaxed">
                      ⚠️ {legalityCreativeDesign.reason}
                    </div>
                  ) : (
                    <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-bold self-start mt-1 inline-block">
                      ✓ 법적 가능: {legalityCreativeDesign.reason}
                    </span>
                  )}
                </div>
                <input
                  type="checkbox"
                  disabled={!legalityCreativeDesign.allowed}
                  checked={hasCreativeDesign}
                  onChange={(e) => setHasCreativeDesign(e.target.checked)}
                  className="w-4 h-4 rounded text-[#5F7161] focus:ring-[#5F7161] disabled:opacity-40"
                />
              </div>
              <p className="text-[11px] text-[#8D7B68]">
                서울시 "도시·건축 디자인 혁신 방안"에 정합하여 독창적이고 예술적인 입면 및 혁신 외관 공모에 선정 시 부여받는 강력한 인센티브입니다.
              </p>

              {hasCreativeDesign && legalityCreativeDesign.allowed && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="pt-2 pl-3 border-l-2 border-[#EDDBC7] space-y-2"
                >
                  <span className="text-[10px] text-gray-400 font-semibold block">디자인 심의 등급 선택</span>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { value: 'standard', label: '우수 디자인 가점 (+20%p)' },
                      { value: 'excellence', label: '최우수 디자인 혁신 (+40%p)' },
                    ].map((item) => (
                      <button
                        key={item.value}
                        type="button"
                        onClick={() => setCreativeDesignLevel(item.value as any)}
                        className={`py-1.5 px-2 text-[10px] rounded-lg border text-center font-medium transition ${
                          creativeDesignLevel === item.value
                            ? 'border-[#5F7161] bg-[#5F7161]/5 text-[#5F7161] font-semibold'
                            : 'border-gray-200 hover:bg-gray-50 text-gray-500'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </div>

            {/* Input 9: Residential/Non-Residential Ratio (주거, 비주거 비율 및 복합 인센티브) */}
            <div className={`p-4 rounded-xl border transition-all ${
              !legalityMixedUse.allowed ? 'bg-gray-100/50 border-gray-200 opacity-70' : 'bg-[#FCFAF7] border-gray-100'
            } space-y-3`}>
              <div className="flex justify-between items-start">
                <div className="flex flex-col gap-1 max-w-[85%]">
                  <span className="text-xs font-bold text-[#3E362E] flex items-center gap-1.5">
                    <Sliders className="w-4 h-4 text-[#5F7161]" />
                    9. 주거·비주거 비율 및 복합용도 인센티브
                  </span>
                  {!legalityMixedUse.allowed ? (
                    <div className="mt-1 p-2 bg-amber-50 border border-amber-200/60 rounded-lg text-[10px] text-amber-800 font-medium leading-relaxed">
                      ⚠️ {legalityMixedUse.reason}
                    </div>
                  ) : (
                    <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-bold self-start mt-1 inline-block">
                      ✓ 법적 가능: {legalityMixedUse.reason}
                    </span>
                  )}
                </div>
                <input
                  type="checkbox"
                  disabled={!legalityMixedUse.allowed}
                  checked={hasMixedUseIncentive}
                  onChange={(e) => setHasMixedUseIncentive(e.target.checked)}
                  className="w-4 h-4 rounded text-[#5F7161] focus:ring-[#5F7161] disabled:opacity-40"
                />
              </div>
              <p className="text-[11px] text-[#8D7B68]">
                상업·준주거지역 내 주거복합 건축물에서 상업·업무·문화 목적의 비주거 의무비율을 상향하여 복합 활성화에 기여할 시 주어지는 보너스 가산 혜택입니다.
              </p>

              {hasMixedUseIncentive && legalityMixedUse.allowed && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="pt-2 pl-3 border-l-2 border-[#EDDBC7] space-y-2"
                >
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">계획 비주거 비율 (연면적 대비):</span>
                    <span className="font-semibold text-[#5F7161]">{nonResidentialRatio}% 확보</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="50"
                    step="5"
                    value={nonResidentialRatio}
                    onChange={(e) => setNonResidentialRatio(Number(e.target.value))}
                    className="w-full accent-[#5F7161]"
                  />
                  <div className="flex justify-between text-[10px] text-gray-400">
                    <span>10% 이상 의무 (+10%p)</span>
                    <span>50% 업무특화단지 (+40%p)</span>
                  </div>
                  <p className="text-[10px] text-emerald-600 font-medium pt-1">
                    * 비주거 비율 확보를 통해 복합개발 유도 용적률 가점 +{mixedUseBonus}%p 가산 적용
                  </p>
                </motion.div>
              )}
            </div>

            {/* NEW SECTION: Other Regulatory Relaxations Unlocked */}
            <div className="p-4 rounded-xl border border-[#EDDBC7]/60 bg-[#FAF6F0] space-y-3">
              <span className="text-xs font-bold text-[#3E362E] flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#C19A6B]" />
                용적률(FAR) 외 다른 규제 완화 검토 (높이·건폐율 등)
              </span>
              <p className="text-[11px] text-[#8D7B68] leading-relaxed">
                인센티브는 용적률뿐만 아니라, 특정 설계 요소 도입 시 <strong>건폐율 완화, 높이 제한 해제, 사선제한 완화</strong>가 병행하여 입체적으로 적용됩니다.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1 text-[11px]">
                {/* 1. 건폐율 완화 */}
                <div className={`p-2.5 rounded-lg border flex flex-col justify-between transition ${
                  hasCreativeDesign || hasOpenGreenSpace
                    ? 'bg-emerald-50/40 border-emerald-100 text-[#3E362E]'
                    : 'bg-gray-50 border-gray-100 text-gray-400'
                }`}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-semibold">① 건폐율 완화 (BCR Relaxation)</span>
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                      hasCreativeDesign || hasOpenGreenSpace ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {hasCreativeDesign || hasOpenGreenSpace ? '활성화 (최대 1.2배)' : '일반 제한'}
                    </span>
                  </div>
                  <span className="text-[10px] leading-normal text-gray-500">
                    {hasCreativeDesign || hasOpenGreenSpace 
                      ? '창의디자인/개방녹지 지정으로 지상부 공지 확보를 위해 법정 건폐율 기준이 유연화됩니다.' 
                      : '창의디자인 또는 개방형 녹지를 활성화하면 건폐율 완화가 가동됩니다.'}
                  </span>
                </div>

                {/* 2. 높이 제한 완화 */}
                <div className={`p-2.5 rounded-lg border flex flex-col justify-between transition ${
                  hasSpecialArchitecturalZone || hasCreativeDesign || hasOpenGreenSpace
                    ? 'bg-emerald-50/40 border-emerald-100 text-[#3E362E]'
                    : 'bg-gray-50 border-gray-100 text-gray-400'
                }`}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-semibold">② 높이 제한 완화 (Height Limit)</span>
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                      hasSpecialArchitecturalZone || hasCreativeDesign || hasOpenGreenSpace ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {hasSpecialArchitecturalZone || hasCreativeDesign || hasOpenGreenSpace ? '활성화 (규제 배제)' : '일반 제한'}
                    </span>
                  </div>
                  <span className="text-[10px] leading-normal text-gray-500">
                    {hasSpecialArchitecturalZone || hasCreativeDesign || hasOpenGreenSpace
                      ? '특별건축구역 지정 및 디자인 혁신 시, 서울시 가로구역별 최고높이가 심의를 통해 완화 또는 배제됩니다.'
                      : '특별건축구역, 창의디자인, 개방형 녹지 적용 시 높이 해제가 연동됩니다.'}
                  </span>
                </div>

                {/* 3. 일조사선 규제 완화 */}
                <div className={`p-2.5 rounded-lg border flex flex-col justify-between transition ${
                  hasSpecialArchitecturalZone || hasCreativeDesign
                    ? 'bg-emerald-50/40 border-emerald-100 text-[#3E362E]'
                    : 'bg-gray-50 border-gray-100 text-gray-400'
                }`}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-semibold">③ 일조권 사선제한 (Setbacks)</span>
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                      hasSpecialArchitecturalZone || hasCreativeDesign ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {hasSpecialArchitecturalZone || hasCreativeDesign ? '활성화 (최대 120%)' : '일반 제한'}
                    </span>
                  </div>
                  <span className="text-[10px] leading-normal text-gray-500">
                    {hasSpecialArchitecturalZone || hasCreativeDesign
                      ? '정북방향 일조 사선 완화 기준(법정 1.2배 또는 전면 배제)이 연계되어 독창적인 입체 매스 설계가 가능해집니다.'
                      : '특별건축구역 및 혁신 디자인 시 일조권 사선제한이 완화됩니다.'}
                  </span>
                </div>

                {/* 4. 부설주차장 설치 완화 */}
                <div className={`p-2.5 rounded-lg border flex flex-col justify-between transition ${
                  hasHotelIncentive || rentalHousingRatio > 0
                    ? 'bg-emerald-50/40 border-emerald-100 text-[#3E362E]'
                    : 'bg-gray-50 border-gray-100 text-gray-400'
                }`}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-semibold">④ 부설 주차장 완화 (Parking)</span>
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                      hasHotelIncentive || rentalHousingRatio > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {hasHotelIncentive || rentalHousingRatio > 0 ? '활성화 (조례 완화)' : '일반 제한'}
                    </span>
                  </div>
                  <span className="text-[10px] leading-normal text-gray-500">
                    {hasHotelIncentive || rentalHousingRatio > 0
                      ? '관광호텔 및 역세권 청년주택(공임상생형) 연계 시 세대당 주차대수 산정 기준이 대폭 유연해져 지하 파기 면적이 경감됩니다.'
                      : '청년 임대주택이나 관광호텔 도입 시 주차장 완화 조항이 가동됩니다.'}
                  </span>
                </div>
              </div>
            </div>

          </div>

          {/* Results Gauge - Right Side (Full Width for mobile & sequential flow) */}
          <div className="w-full bg-[#F2F0ED] p-5 rounded-2xl border border-[#E5E2DD] flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-bold text-[#8D7B68] uppercase tracking-widest mb-6">완화 후 건축 가용성</h3>
              
              {/* Massive FAR display */}
              <div className="text-center py-5 bg-white rounded-xl border border-[#EDDBC7] shadow-sm mb-6">
                <span className="text-[11px] font-bold text-[#A89F94] uppercase tracking-wider block">최종 적용 가능한 가용 용적률</span>
                <div className="text-4xl font-serif text-[#2C251F] font-bold mt-1">
                  {currentTotalFAR}%
                </div>
                <div className="text-[11px] text-emerald-600 font-semibold mt-1">
                  기준 용적률 대비 {Math.round(currentTotalFAR - baselineFAR)}%p 가점 확보
                </div>
              </div>

              {/* Progress Bar of Legal Cap */}
              <div className="space-y-1.5 mb-6">
                <div className="flex justify-between text-[11px] font-medium text-gray-500">
                  <span>기준 용적률: {baselineFAR}%</span>
                  <span>최대 기대 한도: {maxLegalFAR}%</span>
                </div>
                <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#5F7161] transition-all duration-300"
                    style={{ width: `${barWidthPercent}%` }}
                    id="far-bar-indicator"
                  ></div>
                </div>
                <div className="text-right text-[10px] text-gray-400">
                  선택 등급 한도 대비 현재 진행도: {Math.round(barWidthPercent)}%
                </div>
              </div>

              {/* Dynamic Breakdown items */}
              <div className="space-y-2.5 text-xs">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">인센티브 완화 수지표 (Breakdown)</span>
                <div className="flex justify-between text-gray-600 pb-1.5 border-b border-[#E5E2DD]">
                  <span>대지 기초 기준 용적률:</span>
                  <span className="font-semibold text-gray-800">{baselineFAR}%</span>
                </div>
                <div className="flex justify-between text-gray-600 pb-1.5 border-b border-[#E5E2DD]">
                  <span>기부채납 공공 기여 (종합):</span>
                  <span className={`font-semibold ${donationBonus > 0 ? 'text-[#5F7161]' : 'text-gray-400'}`}>
                    +{donationBonus.toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between text-gray-600 pb-1.5 border-b border-[#E5E2DD]">
                  <span>공개공지 정원 조성 개방:</span>
                  <span className={`font-semibold ${hasPublicOpenSpace ? 'text-[#5F7161]' : 'text-gray-400'}`}>
                    +{hasPublicOpenSpace ? (baselineFAR * 0.12 * (publicOpenSpaceRatio / 10)).toFixed(1) : '0'}%
                  </span>
                </div>
                <div className="flex justify-between text-gray-600 pb-1.5 border-b border-[#E5E2DD]">
                  <span>친환경 녹색 스마트 에너지 인증:</span>
                  <span className={`font-semibold ${ecoFriendlyCert !== 'none' ? 'text-[#5F7161]' : 'text-gray-400'}`}>
                    +{ecoFriendlyCert === 'both' ? (baselineFAR * 0.12).toFixed(1) : ecoFriendlyCert === 'green' ? (baselineFAR * 0.05).toFixed(1) : ecoFriendlyCert === 'energy' ? (baselineFAR * 0.08).toFixed(1) : '0'}%
                  </span>
                </div>
                <div className="flex justify-between text-gray-600 pb-1.5 border-b border-[#E5E2DD]">
                  <span>공임상생 주택 약정 비율형:</span>
                  <span className={`font-semibold ${rentalHousingRatio > 0 ? 'text-[#5F7161]' : 'text-gray-400'}`}>
                    +{(rentalHousingRatio * 1.5).toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between text-gray-600 pb-1.5 border-b border-[#E5E2DD]">
                  <span>관광숙박시설 도입 특례형:</span>
                  <span className={`font-semibold ${hasHotelIncentive ? 'text-[#5F7161]' : 'text-gray-400'}`}>
                    +{hasHotelIncentive ? (hotelIncentiveLevel === 'standard' ? 15 : hotelIncentiveLevel === 'premium' ? 30 : 50) : 0}%
                  </span>
                </div>
                <div className="flex justify-between text-gray-600 pb-1.5 border-b border-[#E5E2DD]">
                  <span>특별건축구역 지정 가점형:</span>
                  <span className={`font-semibold ${hasSpecialArchitecturalZone ? 'text-[#5F7161]' : 'text-gray-400'}`}>
                    +{hasSpecialArchitecturalZone ? (specialArchitecturalZoneType === 'standard' ? 10 : specialArchitecturalZoneType === 'excellence' ? 15 : 25) : 0}%
                  </span>
                </div>
                <div className="flex justify-between text-gray-600 pb-1.5 border-b border-[#E5E2DD]">
                  <span>개방형 녹지 생태도심 기여형:</span>
                  <span className={`font-semibold ${hasOpenGreenSpace ? 'text-[#5F7161]' : 'text-gray-400'}`}>
                    +{hasOpenGreenSpace ? (openGreenSpaceRatio * 1.2).toFixed(1) : 0}%
                  </span>
                </div>
                <div className="flex justify-between text-gray-600 pb-1.5 border-b border-[#E5E2DD]">
                  <span>창의혁신 디자인 인센티브형:</span>
                  <span className={`font-semibold ${hasCreativeDesign ? 'text-indigo-600' : 'text-gray-400'}`}>
                    +{hasCreativeDesign ? (creativeDesignLevel === 'standard' ? 20 : 40) : 0}%
                  </span>
                </div>
                <div className="flex justify-between text-[#2C251F] font-bold pb-1">
                  <span>주거복합 비주거 가점형:</span>
                  <span className={`font-bold ${hasMixedUseIncentive ? 'text-indigo-600' : 'text-gray-400'}`}>
                    +{mixedUseBonus}%
                  </span>
                </div>
              </div>
            </div>

            {/* Explanation box */}
            <div className="mt-6 p-3.5 bg-white/60 rounded-xl text-[11px] leading-relaxed text-[#8D7B68] border border-[#EDDBC7]" id="relaxation-explanation">
              <span className="font-bold text-[#2C251F] flex items-center gap-1 mb-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                지자체 도시계획심의 위원회 가이드라인
              </span>
              <p className="whitespace-pre-line text-slate-600 font-normal">
                {donatedArea > 0 || hasPublicOpenSpace || ecoFriendlyCert !== 'none' || rentalHousingRatio > 0 || hasHotelIncentive || hasSpecialArchitecturalZone || hasOpenGreenSpace || hasCreativeDesign || hasMixedUseIncentive
                  ? `본 완화 수지 시뮬레이션은 서울시 도시계획 특별 배분조례에 부합하도록 즉각 대응 반영되었습니다.\n\n` + 
                    `- ${donatedArea > 0 ? `도로·공공 시설용 토지 기부면적 ${donatedArea}㎡에 인센티브를 연산해 지자체 기여도가 매우 우수합니다.` : ''}\n` +
                    `- ${hasPublicOpenSpace ? `도심 쌈지 숲 테마의 공개공지는 도시 쾌적성을 극대화하여 인센티브 조건에 적극 소구합니다.` : ''}\n` +
                    `- ${rentalHousingRatio > 0 ? `공공임대 주택 추가 배치는 역세권 청년주택 등 고밀 완화 특례조항 기입을 보장합니다.` : ''}\n` +
                    `- ${hasHotelIncentive ? `관광숙박시설(특례등급 ${hotelIncentiveLevel === 'luxury' ? '특급' : hotelIncentiveLevel === 'premium' ? '우수 비즈니스' : '일반'}) 배정 설계를 통하여 특별조례 기준에 도합 가산점이 부여됩니다.` : ''}\n` +
                    `- ${hasSpecialArchitecturalZone ? `특별건축구역 지정을 통해 사선 제한 규제 등을 입체적으로 해소하며 우수한 도시 미관을 기획합니다.` : ''}\n` +
                    `- ${hasOpenGreenSpace ? `지상부의 풍부한 개방형 녹지공간(${openGreenSpaceRatio}%) 구성은 친자연주의 생태도심 기준에 부합하여 가점 수혜를 촉진합니다.` : ''}\n` +
                    `- ${hasCreativeDesign ? `독창적인 랜드마크 창의혁신 디자인 설계가 반영되어 기획 완성도 수준이 매우 우수합니다.` : ''}\n` +
                    `- ${hasMixedUseIncentive ? `연면적 ${nonResidentialRatio}%를 비주거용(업무, 상업, 문화)으로 배분 기획하여 복합도심 인센티브 조항에 따른 특례 수혜가 성사되었습니다.` : ''}`
                  : '기부채납 또는 공개공지 확보 등 상향 옵션을 좌측 슬라이더에서 조절해 보세요. 산정된 최종 용적률 수치가 즉시 Step 3 건축 설계 모델에 대입됩니다.'}
              </p>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
