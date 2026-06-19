/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { FARRelaxationInput, FARRelaxationResult, LandRegulatoryAnalysis } from '../types.js';
import { ArrowRight, HelpCircle, ShieldCheck, Award, Home, Trees, Coins, Sliders } from 'lucide-react';
import { motion } from 'motion/react';

interface Step2RelaxationProps {
  currentLand: LandRegulatoryAnalysis | null;
  onCalculationComplete: (result: FARRelaxationResult) => void;
  savedResult: FARRelaxationResult | null;
}

export default function Step2Relaxation({ currentLand, onCalculationComplete, savedResult }: Step2RelaxationProps) {
  // Setup inputs depending on whether we have Step 1 land profile loaded
  const landArea = currentLand ? currentLand.areaSize : 500;
  const baselineFAR = currentLand ? currentLand.baselineFAR : 200;

  const [donatedArea, setDonatedArea] = useState<number>(savedResult ? (savedResult.breakdown.donation > 0 ? 15 : 0) : 0);
  const [hasPublicOpenSpace, setHasPublicOpenSpace] = useState<boolean>(savedResult ? savedResult.breakdown.openSpace > 0 : false);
  const [publicOpenSpaceRatio, setPublicOpenSpaceRatio] = useState<number>(savedResult ? 6 : 5);
  const [ecoFriendlyCert, setEcoFriendlyCert] = useState<'none' | 'green' | 'energy' | 'both'>(
    savedResult 
      ? (savedResult.breakdown.eco > 10 ? 'both' : savedResult.breakdown.eco > 5 ? 'green' : 'none')
      : 'none'
  );
  const [rentalHousingRatio, setRentalHousingRatio] = useState<number>(savedResult ? (savedResult.breakdown.rental > 0 ? 10 : 0) : 0);

  // Auto-run calculation whenever inputs change
  useEffect(() => {
    // 1. Calculate Donation Incentive
    // Formula in Korea urban planning usually: Baseline * 1.5 * (Donated Area / Net Area)
    let donationBonus = 0;
    const remainingArea = landArea - donatedArea;
    if (donatedArea > 0 && remainingArea > 0) {
      donationBonus = parseFloat((baselineFAR * 1.5 * (donatedArea / remainingArea)).toFixed(2));
    }

    // 2. Public Open Space (공개공지) Incentive
    // Usually provides up to 1.2x baseline FAR based on ratio of open space area.
    // Let's model: if enabled, gives (publicOpenSpaceRatio * 2)% bonus to FAR, capped at 15% bonus.
    let openSpaceBonus = 0;
    if (hasPublicOpenSpace) {
      openSpaceBonus = parseFloat((baselineFAR * 0.12 * (publicOpenSpaceRatio / 10)).toFixed(2));
    }

    // 3. Green/Eco-Friendly certification
    // Green architecture rating / Energy efficiency index:
    // none: 0%, green: +5%, energy: +8%, both: +12%
    let ecoBonus = 0;
    if (ecoFriendlyCert === 'green') ecoBonus = parseFloat((baselineFAR * 0.05).toFixed(2));
    else if (ecoFriendlyCert === 'energy') ecoBonus = parseFloat((baselineFAR * 0.08).toFixed(2));
    else if (ecoFriendlyCert === 'both') ecoBonus = parseFloat((baselineFAR * 0.12).toFixed(2));

    // 4. Public Rental Housing (국민임대/역세권 청년임대)
    // Increases legal cap. For example, if you allocate X% of gross area, you can receive additional FAR.
    // Model: adds rentalHousingRatio * 1.5 percent point bonus.
    let rentalBonus = parseFloat((rentalHousingRatio * 1.5).toFixed(2));

    const finalFAR = parseFloat((baselineFAR + donationBonus + openSpaceBonus + ecoBonus + rentalBonus).toFixed(2));

    // Generate friendly explanation
    let explParts: string[] = [];
    if (donationBonus > 0) {
      explParts.push(`기부채납 면적 ${donatedArea}㎡ 확보에 따라 기본 용적률의 약 1.5배 가중치를 적용받아 +${donationBonus}%p 가산되었습니다.`);
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

    const explanation = explParts.length > 0 
      ? explParts.join('\n\n')
      : '현재 완화 옵션이 가동되지 않았습니다. 기부채납, 공개공지, 친환경 자격 등을 선택하여 추가 용적률 혜택을 시뮬레이션 하세요.';

    const calcResult: FARRelaxationResult = {
      finalFAR,
      breakdown: {
        base: baselineFAR,
        donation: donationBonus,
        openSpace: openSpaceBonus,
        eco: ecoBonus,
        rental: rentalBonus
      },
      explanation
    };

    onCalculationComplete(calcResult);
  }, [landArea, baselineFAR, donatedArea, hasPublicOpenSpace, publicOpenSpaceRatio, ecoFriendlyCert, rentalHousingRatio]);

  // Max legal range indicator for UI
  const maxLegalFAR = Math.round(baselineFAR * 1.5);
  const currentTotalFAR = parseFloat((
    baselineFAR + 
    (donatedArea > 0 ? (baselineFAR * 1.5 * (donatedArea / (landArea - donatedArea))) : 0) + 
    (hasPublicOpenSpace ? (baselineFAR * 0.12 * (publicOpenSpaceRatio / 10)) : 0) +
    (ecoFriendlyCert === 'both' ? baselineFAR * 0.12 : ecoFriendlyCert === 'green' ? baselineFAR * 0.05 : ecoFriendlyCert === 'energy' ? baselineFAR * 0.08 : 0) +
    (rentalHousingRatio * 1.5)
  ).toFixed(1));

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

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Controls - Left */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Input 1: Land Contribution (기부채납) */}
            <div className="p-4 rounded-xl border border-gray-100 bg-[#FCFAF7] space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-[#3E362E] flex items-center gap-1.5">
                  <Coins className="w-4 h-4 text-[#5F7161]" />
                  1. 기부채납 부지 면적공기 (도로·공원 등)
                </span>
                <span className="text-xs font-semibold text-indigo-700">{donatedArea}㎡ 기여</span>
              </div>
              <p className="text-[11px] text-[#8D7B68]">
                국가나 지자체에 무상 양도하는 도로 확장분, 소공원 부지 면적입니다. (전체 {landArea}㎡ 중 배분)
              </p>
              <input
                type="range"
                min="0"
                max={Math.floor(landArea * 0.25)}
                step="1"
                value={donatedArea}
                onChange={(e) => setDonatedArea(Number(e.target.value))}
                className="w-full accent-[#5F7161]"
              />
              <div className="flex justify-between text-[10px] text-gray-400">
                <span>0㎡ (기여 없음)</span>
                <span>최대 {Math.floor(landArea * 0.25)}㎡ (총 면적의 25%)</span>
              </div>
            </div>

            {/* Input 2: Public Open Space (공개공지) */}
            <div className="p-4 rounded-xl border border-gray-100 bg-[#FCFAF7] space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-[#3E362E] flex items-center gap-1.5">
                  <Trees className="w-4 h-4 text-[#5F7161]" />
                  2. 공개공지(Public Open Space) 확보 계획
                </span>
                <input
                  type="checkbox"
                  checked={hasPublicOpenSpace}
                  onChange={(e) => setHasPublicOpenSpace(e.target.checked)}
                  className="w-4 h-4 rounded text-[#5F7161] focus:ring-[#5F7161]"
                />
              </div>
              <p className="text-[11px] text-[#8D7B68]">
                도심 주민들이 자유롭게 거닐며 쉴 수 있도록 단지 앞 정원, 조경 벤치를 조성하여 개방하는 비율입니다.
              </p>

              {hasPublicOpenSpace && (
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
            <div className="p-4 rounded-xl border border-gray-100 bg-[#FCFAF7] space-y-3">
              <span className="text-xs font-bold text-[#3E362E] flex items-center gap-1.5">
                <Award className="w-4 h-4 text-[#5F7161]" />
                3. 친환경 건축 인증 및 제로에너지 등급 여부
              </span>
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
                    onClick={() => setEcoFriendlyCert(item.value as any)}
                    className={`py-2 px-3 text-[11px] rounded-lg border text-left font-medium transition ${
                      ecoFriendlyCert === item.value
                        ? 'border-[#5F7161] bg-[#5F7161]/5 text-[#5F7161] font-semibold'
                        : 'border-gray-200 hover:bg-gray-50 text-gray-600'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Input 4: Public Rental Housing (공동주택 상생 임대주택) */}
            <div className="p-4 rounded-xl border border-gray-100 bg-[#FCFAF7] space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-[#3E362E] flex items-center gap-1.5">
                  <Home className="w-4 h-4 text-[#5F7161]" />
                  4. 공공기여 장기전세/공공임대 임대비율 추가
                </span>
                <span className="text-xs font-semibold text-indigo-700">{rentalHousingRatio}% 연계</span>
              </div>
              <p className="text-[11px] text-[#8D7B68]">
                연면적 중 일정 지분을 지자체 공임 주택용으로 기부 및 위탁 운영 약정 시, 법정상한선(조례의 최대 1.5배)까지 파격 상향 완화됩니다.
              </p>
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
            </div>

          </div>

          {/* Results Gauge - Right Side */}
          <div className="lg:col-span-5 bg-[#F2F0ED] p-5 rounded-2xl border border-[#E5E2DD] flex flex-col justify-between">
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
                    className="h-full bg-indigo-600 transition-all duration-300"
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
                  <span>기부채납 공공 기여:</span>
                  <span className={`font-semibold ${donatedArea > 0 ? 'text-[#5F7161]' : 'text-gray-400'}`}>
                    +{(baselineFAR * 1.5 * (donatedArea / (landArea - donatedArea || 1))).toFixed(1)}%
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
                <div className="flex justify-between text-[#2C251F] font-bold">
                  <span>공임상생 주택 약정 비율형:</span>
                  <span className={`font-bold ${rentalHousingRatio > 0 ? 'text-indigo-600' : 'text-gray-400'}`}>
                    +{(rentalHousingRatio * 1.5).toFixed(1)}%
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
                {donatedArea > 0 || hasPublicOpenSpace || ecoFriendlyCert !== 'none' || rentalHousingRatio > 0
                  ? `본 완화 수지 시뮬레이션은 서울시 도시계획 특별 배분조례에 부합하도록 즉각 대응 반영되었습니다.\n\n` + 
                    `- ${donatedArea > 0 ? `도로·공공 시설용 토지 기부면적 ${donatedArea}㎡에 인센티브를 연산해 지자체 기여도가 매우 우수합니다.` : ''}\n` +
                    `- ${hasPublicOpenSpace ? `도심 쌈지 숲 테마의 공개공지는 도시 쾌적성을 극대화하여 인센티브 조건에 적극 소구합니다.` : ''}\n` +
                    `- ${rentalHousingRatio > 0 ? `공공임대 주택 추가 배치는 역세권 청년주택 등 고밀 완화 특례조항 기입을 보장합니다.` : ''}`
                  : '기부채납 또는 공개공지 확보 등 상향 옵션을 좌측 슬라이더에서 조절해 보세요. 산정된 최종 용적률 수치가 즉시 Step 3 건축 설계 모델에 대입됩니다.'}
              </p>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
