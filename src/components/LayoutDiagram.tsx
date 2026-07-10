import React, { useState, useMemo, useEffect } from 'react';
import { Compass, Building2, Layers, Info, Check, Plus, Minus, LayoutGrid, HelpCircle, Sparkles, RefreshCw, Sliders, Move, HelpCircle as AlertTriangle } from 'lucide-react';

interface HousingConfig {
  id: string;
  name: string;
  sizeM2: number;
  pyung: number;
  salesPricePerPyung: number;
  count: number;
}

interface LayoutDiagramProps {
  towerCount: number;
  setTowerCount: (val: number) => void;
  unitsPerFloorLine: number;
  setUnitsPerFloorLine: (val: number) => void;
  aboveGroundFloors: number;
  setAboveGroundFloors: (val: number) => void;
  podiumFloors: number;
  setPodiumFloors: (val: number) => void;
  undergroundFloors: number;
  setUndergroundFloors: (val: number) => void;
  buildingSeparationDistance: number;
  setBuildingSeparationDistance: (val: number) => void;
  boundarySeparationDistance: number;
  setBoundarySeparationDistance: (val: number) => void;
  landArea: number;
  currentLand: any;
  aptConfigs: HousingConfig[];
  setAptConfigs?: React.Dispatch<React.SetStateAction<HousingConfig[]>>;
  officetelConfigs: HousingConfig[];
  setOfficetelConfigs?: React.Dispatch<React.SetStateAction<HousingConfig[]>>;
  calculatedTypicalFloors: number;
  totalBuildingHeight: number;
  requiredSeparationDistance: number;
  isSeparationSatisfied: boolean;
  requiredBoundaryDistance: number;
  isBoundarySatisfied: boolean;
  isCommercialZone: boolean;
  useLayoutSimulation?: boolean;
  undergroundGFA?: number;
}

export const TOWER_PRESETS = [
  {
    id: 'plate-4bay',
    name: '국민평형 판상형 4Bay (4호 조합)',
    desc: '가장 선호도 높은 대형 건설사 표준 구조. 전면 채광 및 완벽한 맞통풍 판상형 설계.',
    unitsPerFloorLine: 4,
    aptConfigs: [
      { id: 'apt_small', name: '공동주택 소형 (전용 59㎡ / 실 18평)', sizeM2: 59, pyung: 18, salesPricePerPyung: 4200, count: 12 },
      { id: 'apt_medium', name: '공동주택 중형 (전용 84㎡ / 실 25평)', sizeM2: 84, pyung: 25, salesPricePerPyung: 4500, count: 8 },
      { id: 'apt_large', name: '공동주택 대형 (전용 114㎡ / 실 34평)', sizeM2: 114, pyung: 34, salesPricePerPyung: 5000, count: 4 }
    ],
    officetelConfigs: [
      { id: 'officetel_studio', name: '오피스텔 원룸 (전용 30㎡ / 실 9평)', sizeM2: 30, pyung: 9, salesPricePerPyung: 2600, count: 0 },
      { id: 'officetel_tworoom', name: '오피스텔 투룸 (전용 59㎡ / 실 18평)', sizeM2: 59, pyung: 18, salesPricePerPyung: 3000, count: 0 },
      { id: 'officetel_threeroom', name: '오피스텔 쓰리룸 (전용 84㎡ / 실 25평)', sizeM2: 84, pyung: 25, salesPricePerPyung: 3400, count: 0 }
    ]
  },
  {
    id: 'tower-y',
    name: '랜드마크 타워형 Y자 (3호 조합)',
    desc: '조망권을 극대화하며 세대간 프라이버시 침해를 방지하는 고품격 날개형 타워 설계.',
    unitsPerFloorLine: 3,
    aptConfigs: [
      { id: 'apt_small', name: '공동주택 소형 (전용 59㎡ / 실 18평)', sizeM2: 59, pyung: 18, salesPricePerPyung: 4200, count: 0 },
      { id: 'apt_medium', name: '공동주택 중형 (전용 84㎡ / 실 25평)', sizeM2: 84, pyung: 25, salesPricePerPyung: 4600, count: 15 },
      { id: 'apt_large', name: '공동주택 대형 (전용 114㎡ / 실 34평)', sizeM2: 114, pyung: 34, salesPricePerPyung: 5200, count: 3 }
    ],
    officetelConfigs: [
      { id: 'officetel_studio', name: '오피스텔 원룸 (전용 30㎡ / 실 9평)', sizeM2: 30, pyung: 9, salesPricePerPyung: 2600, count: 0 },
      { id: 'officetel_tworoom', name: '오피스텔 투룸 (전용 59㎡ / 실 18평)', sizeM2: 59, pyung: 18, salesPricePerPyung: 3000, count: 0 },
      { id: 'officetel_threeroom', name: '오피스텔 쓰리룸 (전용 84㎡ / 실 25평)', sizeM2: 84, pyung: 25, salesPricePerPyung: 3400, count: 0 }
    ]
  },
  {
    id: 'compact-l',
    name: '도심 고밀 L자형 (5호 조합)',
    desc: '소형 아파트 및 주거 오피스텔에 특화된 고밀도 청년주택형 콤팩트 라인업 조합.',
    unitsPerFloorLine: 5,
    aptConfigs: [
      { id: 'apt_small', name: '공동주택 소형 (전용 59㎡ / 실 18평)', sizeM2: 59, pyung: 18, salesPricePerPyung: 4200, count: 10 },
      { id: 'apt_medium', name: '공동주택 중형 (전용 84㎡ / 실 25평)', sizeM2: 84, pyung: 25, salesPricePerPyung: 4500, count: 0 },
      { id: 'apt_large', name: '공동주택 대형 (전용 114㎡ / 실 34평)', sizeM2: 114, pyung: 34, salesPricePerPyung: 5000, count: 0 }
    ],
    officetelConfigs: [
      { id: 'officetel_studio', name: '오피스텔 원룸 (전용 30㎡ / 실 9평)', sizeM2: 30, pyung: 9, salesPricePerPyung: 2700, count: 20 },
      { id: 'officetel_tworoom', name: '오피스텔 투룸 (전용 59㎡ / 실 18평)', sizeM2: 59, pyung: 18, salesPricePerPyung: 3100, count: 15 },
      { id: 'officetel_threeroom', name: '오피스텔 쓰리룸 (전용 84㎡ / 실 25평)', sizeM2: 84, pyung: 25, salesPricePerPyung: 3500, count: 5 }
    ]
  },
  {
    id: 'luxury-pent',
    name: '하이엔드 럭셔리 대형 (2호 조합)',
    desc: '전 세대 양면 조망 개방형 거실 확보. 프라이빗 엘리베이터 홀을 포함한 하이엔드 전용 조합.',
    unitsPerFloorLine: 2,
    aptConfigs: [
      { id: 'apt_small', name: '공동주택 소형 (전용 59㎡ / 실 18평)', sizeM2: 59, pyung: 18, salesPricePerPyung: 4200, count: 0 },
      { id: 'apt_medium', name: '공동주택 중형 (전용 84㎡ / 실 25평)', sizeM2: 84, pyung: 25, salesPricePerPyung: 4500, count: 0 },
      { id: 'apt_large', name: '공동주택 대형 (전용 114㎡ / 실 34평)', sizeM2: 114, pyung: 34, salesPricePerPyung: 5600, count: 12 }
    ],
    officetelConfigs: [
      { id: 'officetel_studio', name: '오피스텔 원룸 (전용 30㎡ / 실 9평)', sizeM2: 30, pyung: 9, salesPricePerPyung: 2600, count: 0 },
      { id: 'officetel_tworoom', name: '오피스텔 투룸 (전용 59㎡ / 실 18평)', sizeM2: 59, pyung: 18, salesPricePerPyung: 3000, count: 0 },
      { id: 'officetel_threeroom', name: '오피스텔 쓰리룸 (전용 84㎡ / 실 25평)', sizeM2: 84, pyung: 25, salesPricePerPyung: 3400, count: 0 }
    ]
  }
];

export default function LayoutDiagram({
  towerCount,
  setTowerCount,
  unitsPerFloorLine,
  setUnitsPerFloorLine,
  aboveGroundFloors,
  setAboveGroundFloors,
  podiumFloors,
  setPodiumFloors,
  undergroundFloors,
  setUndergroundFloors,
  buildingSeparationDistance,
  setBuildingSeparationDistance,
  boundarySeparationDistance,
  setBoundarySeparationDistance,
  landArea,
  currentLand,
  aptConfigs,
  setAptConfigs,
  officetelConfigs,
  setOfficetelConfigs,
  calculatedTypicalFloors,
  totalBuildingHeight,
  requiredSeparationDistance,
  isSeparationSatisfied,
  requiredBoundaryDistance,
  isBoundarySatisfied,
  isCommercialZone,
  useLayoutSimulation = false,
  undergroundGFA = 0
}: LayoutDiagramProps) {
  // Local state for active selected tower
  const [selectedTowerIdx, setSelectedTowerIdx] = useState<number>(0);
  const [hoveredUnit, setHoveredUnit] = useState<{
    dong: string;
    floor: number;
    ho: number;
    name: string;
    sizeM2: number;
    pyung: number;
    price: number;
  } | null>(null);

  // Cadastral shape configuration (EUM actual shape, perfect rectangle, irregular challenge)
  const [selectedShapeType, setSelectedShapeType] = useState<'eum' | 'rect' | 'irregular'>('eum');
  
  // Drag and drop state
  const [activeDragIdx, setActiveDragIdx] = useState<number | null>(null);

  // Selected tower preset ID
  const [activePresetId, setActivePresetId] = useState<string>('plate-4bay');

  // Pick colors for different unit sizes
  const getUnitColorClass = (size: number) => {
    if (size >= 100) return { bg: 'bg-purple-100 border-purple-300 text-purple-700 hover:bg-purple-200', badge: 'bg-purple-600' };
    if (size >= 80) return { bg: 'bg-emerald-100 border-emerald-300 text-emerald-700 hover:bg-emerald-200', badge: 'bg-emerald-600' };
    if (size >= 50) return { bg: 'bg-sky-100 border-sky-300 text-sky-700 hover:bg-sky-200', badge: 'bg-sky-600' };
    return { bg: 'bg-amber-100 border-amber-300 text-amber-700 hover:bg-amber-200', badge: 'bg-amber-600' };
  };

  // Pre-generate lot boundaries and scale factor to fit within SVG (450 x 280)
  const landInfo = useMemo(() => {
    const landId = currentLand?.id || '';
    const address = currentLand?.address || '';
    
    let type: 'gangnam' | 'yeonnam' | 'seocho' | 'custom' = 'custom';
    if (landId === 'gangnam-yeoksam' || address.includes('역삼') || address.includes('강남')) {
      type = 'gangnam';
    } else if (landId === 'yeonnam-forest' || address.includes('연남') || address.includes('마포')) {
      type = 'yeonnam';
    } else if (landId === 'seocho-banpo' || address.includes('서초') || address.includes('반포')) {
      type = 'seocho';
    }

    // Centered around coordinate origin (0, 0) in meters
    let pointsM: { x: number; y: number }[] = [];
    let widthM = 0;
    let heightM = 0;
    let surroundingContext = { north: '북측 도로', west: '서측 도로', desc: '대지 경계', parcels: [] as string[] };
    
    if (type === 'gangnam') {
      // 642 m2. Roughly 18m x 35.6m
      widthM = 18;
      heightM = 35.6;
      
      if (selectedShapeType === 'rect') {
        pointsM = [
          { x: -widthM/2, y: -heightM/2 },
          { x: widthM/2, y: -heightM/2 },
          { x: widthM/2, y: heightM/2 },
          { x: -widthM/2, y: heightM/2 },
        ];
      } else if (selectedShapeType === 'irregular') {
        pointsM = [
          { x: -widthM/2 - 3, y: -heightM/2 },
          { x: widthM/2, y: -heightM/2 + 4 },
          { x: widthM/2 - 2, y: heightM/2 },
          { x: -widthM/2 + 4, y: heightM/2 + 2 },
        ];
      } else {
        // EUM actual irregular shape (skews and organic polygon boundaries)
        pointsM = [
          { x: -widthM/2 - 0.8, y: -heightM/2 + 1.2 },
          { x: widthM/2 + 0.5, y: -heightM/2 },
          { x: widthM/2 - 0.4, y: heightM/2 - 0.8 },
          { x: -widthM/2 + 1.5, y: heightM/2 + 0.5 },
          { x: -widthM/2 - 1.2, y: 3.5 }
        ];
      }
      
      surroundingContext = {
        north: '북측 12m 보조간선도로 (테헤란로 이면)',
        west: '서측 8m 내부 진입도로',
        desc: `강남구 역삼동 대지 (${(landArea || 642.0).toFixed(1)}㎡, 일반상업지역) - 토지이음 지적형상`,
        parcels: ['824-21 대', '824-19 대', '824-12 잡']
      };
    } else if (type === 'yeonnam') {
      // 228 m2. Cozy trapezoid/pentagon roughly 14m x 16.3m
      widthM = 14;
      heightM = 16.3;

      if (selectedShapeType === 'rect') {
        pointsM = [
          { x: -widthM/2, y: -heightM/2 },
          { x: widthM/2, y: -heightM/2 },
          { x: widthM/2, y: heightM/2 },
          { x: -widthM/2, y: heightM/2 },
        ];
      } else if (selectedShapeType === 'irregular') {
        pointsM = [
          { x: -widthM/2, y: -heightM/2 },
          { x: widthM/2 - 4, y: -heightM/2 },
          { x: widthM/2, y: heightM/2 },
          { x: -widthM/2, y: heightM/2 - 4 },
        ];
      } else {
        // EUM actual irregular shape
        pointsM = [
          { x: -widthM/2 + 1.2, y: -heightM/2 + 0.5 },
          { x: widthM/2 - 1.0, y: -heightM/2 + 1.8 },
          { x: widthM/2 + 0.8, y: heightM/2 - 3.2 },
          { x: 0.5, y: heightM/2 + 2.4 }, // Pointed bottom corner near park
          { x: -widthM/2 - 0.5, y: heightM/2 - 2.8 }
        ];
      }

      surroundingContext = {
        north: '북측 4m 보행자 중심도로 (경의선 숲길변)',
        west: '서측 인접대지 경계선',
        desc: `마포구 연남동 대지 (${(landArea || 228.0).toFixed(1)}㎡, 제2종일반주거지역) - 토지이음 지적형상`,
        parcels: ['241-11 대', '241-15 대']
      };
    } else if (type === 'seocho') {
      // 415 m2. Corner lot roughly 19m x 22m with chamfered corner
      widthM = 19;
      heightM = 22;

      if (selectedShapeType === 'rect') {
        pointsM = [
          { x: -widthM/2, y: -heightM/2 },
          { x: widthM/2, y: -heightM/2 },
          { x: widthM/2, y: heightM/2 },
          { x: -widthM/2, y: heightM/2 },
        ];
      } else if (selectedShapeType === 'irregular') {
        pointsM = [
          { x: -widthM/2 + 5, y: -heightM/2 },
          { x: widthM/2, y: -heightM/2 + 5 },
          { x: widthM/2 - 5, y: heightM/2 },
          { x: -widthM/2, y: heightM/2 - 5 },
        ];
      } else {
        // EUM actual shape with road corner widening chamfers (가각전제)
        pointsM = [
          { x: -widthM/2 + 3.0, y: -heightM/2 }, // chamfer
          { x: widthM/2, y: -heightM/2 },
          { x: widthM/2, y: heightM/2 - 1.5 },
          { x: -widthM/2 + 0.5, y: heightM/2 },
          { x: -widthM/2, y: -heightM/2 + 3.0 }
        ];
      }

      surroundingContext = {
        north: '북측 10m 도로 (법원 삼거리 이면)',
        west: '서측 6m 일방통행도로',
        desc: `서초구 반포동 대지 (${(landArea || 415.0).toFixed(1)}㎡, 제3종일반주거지역) - 토지이음 지적형상`,
        parcels: ['1524-11 대', '1524-8 대']
      };
    } else {
      // Custom land or other. Make a clean rectangle with aspect ratio 1.4
      const customArea = landArea || 500;
      widthM = Math.sqrt(customArea / 1.4);
      heightM = widthM * 1.4;
      pointsM = [
        { x: -widthM/2, y: -heightM/2 },
        { x: widthM/2, y: -heightM/2 },
        { x: widthM/2, y: heightM/2 },
        { x: -widthM/2, y: heightM/2 },
      ];
      surroundingContext = {
        north: '북측 인접 도로',
        west: '서측 진입 도로',
        desc: `커스텀 대지 기획안 (${customArea.toLocaleString()}㎡) - 토지이음 연계`,
        parcels: ['산 11-1 대']
      };
    }

    // Scale proportional coordinates if landArea is scaled by user
    if (type !== 'custom') {
      const defaultArea = type === 'gangnam' ? 642 : (type === 'yeonnam' ? 228 : 415);
      const customArea = landArea || defaultArea;
      if (Math.abs(customArea - defaultArea) > 0.1) {
        const areaScale = Math.sqrt(customArea / defaultArea);
        widthM = widthM * areaScale;
        heightM = heightM * areaScale;
        pointsM = pointsM.map(p => ({ x: p.x * areaScale, y: p.y * areaScale }));
      }
    }

    // SVG Viewport size is 450 x 280.
    // Fit bounding box inside 320 x 180 (allowing margins)
    const maxPxWidth = 330;
    const maxPxHeight = 165;
    
    const scaleX = maxPxWidth / widthM;
    const scaleY = maxPxHeight / heightM;
    const scale = Math.min(scaleX, scaleY);

    const centerX = 225;
    const centerY = 145; // slightly lower for northern road context

    // Map meter points to SVG pixels
    const pointsPx = pointsM.map(p => ({
      x: centerX + p.x * scale,
      y: centerY + p.y * scale
    }));

    return {
      type,
      widthM,
      heightM,
      pointsPx,
      scale,
      centerX,
      centerY,
      pointsM,
      surroundingContext
    };
  }, [currentLand, landArea, selectedShapeType]);

  // Dimensions of a tower in meters
  const towerDepthM = 12; // Realistic standard block depth
  const towerWidthM = useMemo(() => {
    // 1 line of 84m2 needs roughly 7.5m width
    return Math.max(14, unitsPerFloorLine * 7.5);
  }, [unitsPerFloorLine]);

  // Default positions generated based on geometry
  const defaultPositions = useMemo(() => {
    const { widthM, heightM } = landInfo;
    let positionsM: { x: number; y: number; name: string }[] = [];

    if (towerCount === 1) {
      positionsM = [{ x: 0, y: 0, name: '101동' }];
    } else if (towerCount === 2) {
      if (widthM > heightM) {
        positionsM = [
          { x: -widthM * 0.23, y: 0, name: '101동' },
          { x: widthM * 0.23, y: 0, name: '102동' }
        ];
      } else {
        positionsM = [
          { x: 0, y: -heightM * 0.22, name: '101동' },
          { x: 0, y: heightM * 0.22, name: '102동' }
        ];
      }
    } else if (towerCount === 3) {
      positionsM = [
        { x: -widthM * 0.23, y: heightM * 0.18, name: '101동' },
        { x: widthM * 0.23, y: heightM * 0.18, name: '102동' },
        { x: 0, y: -heightM * 0.22, name: '103동' }
      ];
    } else if (towerCount === 4) {
      positionsM = [
        { x: -widthM * 0.23, y: -heightM * 0.22, name: '101동' },
        { x: widthM * 0.23, y: -heightM * 0.22, name: '102동' },
        { x: -widthM * 0.23, y: heightM * 0.22, name: '103동' },
        { x: widthM * 0.23, y: heightM * 0.22, name: '104동' }
      ];
    } else {
      const cols = Math.ceil(Math.sqrt(towerCount));
      const rows = Math.ceil(towerCount / cols);
      for (let i = 0; i < towerCount; i++) {
        const r = Math.floor(i / cols);
        const c = i % cols;
        const xOffset = cols > 1 ? (c / (cols - 1) - 0.5) : 0;
        const yOffset = rows > 1 ? (r / (rows - 1) - 0.5) : 0;
        positionsM.push({
          x: widthM * xOffset * 0.65,
          y: heightM * yOffset * 0.65,
          name: `${101 + i}동`
        });
      }
    }
    return positionsM;
  }, [towerCount, landInfo]);

  const [customPositions, setCustomPositions] = useState<{ name: string; x: number; y: number }[]>([]);

  // Synchronize when defaultPositions changes (e.g. towerCount changes)
  useEffect(() => {
    setCustomPositions(defaultPositions);
  }, [defaultPositions]);

  // Pre-generate tower coordinates in meters and map to pixels
  const towerPositions = useMemo(() => {
    const { centerX, centerY, scale } = landInfo;
    const sourcePositions = customPositions.length === towerCount ? customPositions : defaultPositions;
    
    return sourcePositions.map(pos => ({
      x: centerX + pos.x * scale,
      y: centerY + pos.y * scale,
      name: pos.name,
      xM: pos.x,
      yM: pos.y
    }));
  }, [customPositions, defaultPositions, landInfo, towerCount]);

  // Handler to apply selected preset
  const applyPreset = (presetId: string) => {
    const preset = TOWER_PRESETS.find(p => p.id === presetId);
    if (!preset) return;
    
    setActivePresetId(presetId);
    setUnitsPerFloorLine(preset.unitsPerFloorLine);
    
    if (setAptConfigs && preset.aptConfigs) {
      setAptConfigs(preset.aptConfigs);
    }
    if (setOfficetelConfigs && preset.officetelConfigs) {
      setOfficetelConfigs(preset.officetelConfigs);
    }
  };

  // Drag and drop mouse handlers
  const handleSVGMouseDown = (idx: number, e: React.MouseEvent<SVGElement>) => {
    setActiveDragIdx(idx);
    setSelectedTowerIdx(idx);
    e.stopPropagation();
  };

  const handleSVGMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (activeDragIdx === null) return;
    
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;
    
    // Convert to SVG viewBox coordinates (0 to 450, 0 to 280)
    const svgX = (clientX / rect.width) * 450;
    const svgY = (clientY / rect.height) * 280;
    
    const { centerX, centerY, scale, widthM, heightM } = landInfo;
    const xM = (svgX - centerX) / scale;
    const yM = (svgY - centerY) / scale;
    
    // Clamp to parcel boundaries with safety margin
    const clampedXM = Math.max(-widthM/2 + 2, Math.min(widthM/2 - 2, xM));
    const clampedYM = Math.max(-heightM/2 + 2, Math.min(heightM/2 - 2, yM));
    
    const currentList = customPositions.length === towerCount ? customPositions : defaultPositions;
    
    setCustomPositions(currentList.map((pos, idx) => {
      if (idx === activeDragIdx) {
        return {
          ...pos,
          x: parseFloat(clampedXM.toFixed(1)),
          y: parseFloat(clampedYM.toFixed(1))
        };
      }
      return pos;
    }));
  };

  const handleSVGMouseUp = () => {
    setActiveDragIdx(null);
  };

  const runAutoPlacement = () => {
    const { widthM, heightM } = landInfo;
    const requiredSep = requiredSeparationDistance;
    const requiredBound = requiredBoundaryDistance;
    
    const minY = -heightM / 2 + requiredBound + towerDepthM / 2;
    const maxY = heightM / 2 - towerDepthM / 2;
    const minX = -widthM / 2 + towerWidthM / 2;
    const maxX = widthM / 2 - towerWidthM / 2;

    let optimalPositions: { name: string; x: number; y: number }[] = [];

    if (towerCount === 1) {
      const optimalY = Math.min(maxY, Math.max(0, minY));
      optimalPositions = [{ name: '101동', x: 0, y: optimalY }];
    } else if (towerCount === 2) {
      const spacingX = Math.max(requiredSep, towerWidthM + 4);
      const halfSpacingX = spacingX / 2;
      
      if (halfSpacingX < maxX) {
        const optimalY = Math.min(maxY, Math.max(0, minY));
        optimalPositions = [
          { name: '101동', x: -halfSpacingX, y: optimalY },
          { name: '102동', x: halfSpacingX, y: optimalY }
        ];
      } else {
        const spacingY = Math.max(requiredSep, towerDepthM + 4);
        const y1 = Math.min(maxY - spacingY, Math.max(minY, -heightM * 0.15));
        const y2 = y1 + spacingY;
        
        optimalPositions = [
          { name: '101동', x: -widthM * 0.15, y: y1 },
          { name: '102동', x: widthM * 0.15, y: Math.min(maxY, y2) }
        ];
      }
    } else if (towerCount === 3) {
      const spacingX = Math.max(requiredSep, towerWidthM + 4);
      const spacingY = Math.max(requiredSep, towerDepthM + 4);
      
      const topY = Math.min(maxY - spacingY, Math.max(minY, -heightM * 0.18));
      const bottomY = Math.min(maxY, topY + spacingY);
      const halfSpacingX = Math.min(maxX - 2, spacingX / 2);
      
      optimalPositions = [
        { name: '101동', x: -halfSpacingX, y: topY },
        { name: '102동', x: halfSpacingX, y: topY },
        { name: '103동', x: 0, y: bottomY }
      ];
    } else {
      const cols = Math.ceil(Math.sqrt(towerCount));
      const rows = Math.ceil(towerCount / cols);
      
      const spacingY = Math.max(requiredSep, towerDepthM + 4);
      
      for (let i = 0; i < towerCount; i++) {
        const r = Math.floor(i / cols);
        const c = i % cols;
        
        const xVal = minX + (cols > 1 ? (c / (cols - 1)) * (maxX - minX) : 0);
        const yVal = Math.min(maxY, minY + r * spacingY);
        
        optimalPositions.push({
          name: `${101 + i}동`,
          x: parseFloat(xVal.toFixed(1)),
          y: parseFloat(yVal.toFixed(1))
        });
      }
    }

    setCustomPositions(optimalPositions);
    
    // Update distance sliders to match optimization target
    setBuildingSeparationDistance(parseFloat(requiredSep.toFixed(1)));
    setBoundarySeparationDistance(parseFloat(requiredBound.toFixed(1)));
  };

  // Real-time actual separation distance between towers
  const actualBuildingSeparation = useMemo(() => {
    const positionsToUse = customPositions.length === towerCount ? customPositions : defaultPositions;
    if (positionsToUse.length <= 1) return buildingSeparationDistance;
    let minD = Infinity;
    for (let i = 0; i < positionsToUse.length; i++) {
      for (let j = i + 1; j < positionsToUse.length; j++) {
        const dx = positionsToUse[i].x - positionsToUse[j].x;
        const dy = positionsToUse[i].y - positionsToUse[j].y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist < minD) minD = dist;
      }
    }
    return parseFloat(minD.toFixed(1));
  }, [customPositions, defaultPositions, towerCount, buildingSeparationDistance]);

  // Real-time actual distance from the North boundary
  const actualBoundarySeparation = useMemo(() => {
    const positionsToUse = customPositions.length === towerCount ? customPositions : defaultPositions;
    if (positionsToUse.length === 0) return boundarySeparationDistance;
    const minD = positionsToUse.reduce((min, pos) => {
      // North boundary is yM = -heightM / 2
      const dist = pos.y - (-landInfo.heightM / 2) - towerDepthM / 2;
      return dist < min ? dist : min;
    }, Infinity);
    return parseFloat(Math.max(0.1, minD).toFixed(1));
  }, [customPositions, defaultPositions, towerCount, landInfo.heightM, towerDepthM, boundarySeparationDistance]);

  // Distribute flat configs across available units per floor
  const combinedConfigs = useMemo(() => {
    const list = [...aptConfigs, ...officetelConfigs].filter(c => c.count > 0);
    if (list.length === 0) {
      // Default placeholder if none defined
      return [{ id: 'def', name: '표준 84㎡타입', sizeM2: 84, pyung: 25, salesPricePerPyung: 4000, count: 10 }];
    }
    return list;
  }, [aptConfigs, officetelConfigs]);

  // Map each line (1호, 2호...) to a flat config
  const lineConfigs = useMemo(() => {
    const configMap: Record<number, typeof combinedConfigs[0]> = {};
    for (let i = 1; i <= unitsPerFloorLine; i++) {
      const idx = (i - 1) % combinedConfigs.length;
      configMap[i] = combinedConfigs[idx];
    }
    return configMap;
  }, [unitsPerFloorLine, combinedConfigs]);

  // Total residential units calculated in this tower
  const towerTotalFloors = podiumFloors + calculatedTypicalFloors;

  const averageUnitSizeM2 = useMemo(() => {
    if (combinedConfigs.length === 0) return 84;
    return combinedConfigs.reduce((sum, item) => sum + item.sizeM2, 0) / combinedConfigs.length;
  }, [combinedConfigs]);

  const towerFootprintM2 = useMemo(() => {
    // Standard common ratio assumption of 1.25 (25% common area)
    return unitsPerFloorLine * averageUnitSizeM2 * 1.25;
  }, [unitsPerFloorLine, averageUnitSizeM2]);

  // Converted to pixels
  const blockWidth = useMemo(() => {
    return Math.max(28, towerWidthM * landInfo.scale);
  }, [towerWidthM, landInfo.scale]);

  const blockHeight = useMemo(() => {
    return Math.max(20, towerDepthM * landInfo.scale);
  }, [towerDepthM, landInfo.scale]);

  // Ground footprint of all towers combined in m2
  const totalFootprintM2 = useMemo(() => {
    return towerCount * towerFootprintM2;
  }, [towerCount, towerFootprintM2]);

  // Simulated Building Coverage Ratio (건폐율)
  const simulatedBCR = useMemo(() => {
    if (landArea <= 0) return 0;
    return parseFloat(((totalFootprintM2 / landArea) * 100).toFixed(1));
  }, [totalFootprintM2, landArea]);

  const maxAllowedBCR = currentLand?.baselineBCR || 60;
  const isBcrExceeded = simulatedBCR > maxAllowedBCR;

  // Check if any building is physically overlapping with the land boundaries
  const isEncroachingBoundary = useMemo(() => {
    const halfW = landInfo.widthM / 2;
    const halfH = landInfo.heightM / 2;
    return towerPositions.some(pos => {
      const left = pos.xM - towerWidthM / 2;
      const right = pos.xM + towerWidthM / 2;
      const top = pos.yM - towerDepthM / 2;
      const bottom = pos.yM + towerDepthM / 2;
      return left < -halfW || right > halfW || top < -halfH || bottom > halfH;
    });
  }, [towerPositions, towerWidthM, towerDepthM, landInfo]);

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* Visual Header / Instructions */}
      <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex items-start gap-2.5">
        <Info className="w-4 h-4 text-indigo-500 mt-0.5 flex-shrink-0" />
        <div className="text-[11px] text-gray-500 leading-relaxed">
          <span className="font-bold text-gray-700 block text-[11.5px]">💡 실시간 단지 배치도 & 동호수 기획 사용법</span>
          <p>
            지상/지하 층수 및 동 수, 몇 호조합을 설정하면 실시간으로 <strong>2D 마스터 배치도</strong>와 <strong>동호수 배면조서(Dong-Ho Matrix)</strong>가 자동 산출됩니다. 배치도 상의 동을 클릭하여 상세 동호 배치 및 실별 전용면적과 예상 분양가를 확인하세요.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        {/* Left Side: Layout Map (7 Columns) */}
        <div className="xl:col-span-7 bg-white p-4 rounded-xl border border-gray-150 space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-gray-100">
            <span className="text-[11px] font-bold text-gray-800 flex items-center gap-1.5">
              <Compass className="w-4 h-4 text-indigo-600 animate-spin-slow" />
              대지 단지 배치도 (Site Layout Plan)
            </span>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 text-[10px] text-gray-400 font-mono">
                <span className="w-2.5 h-2.5 bg-emerald-500 rounded-xs"></span>
                <span>대지</span>
              </div>
              <div className="flex items-center gap-1 text-[10px] text-gray-400 font-mono">
                <span className="w-2.5 h-2.5 bg-indigo-600 rounded-xs"></span>
                <span>선택 동</span>
              </div>
            </div>
          </div>

          {/* Preset Sample Selector */}
          <div className="bg-indigo-50/35 p-3 rounded-xl border border-indigo-100/50 space-y-2">
            <span className="text-[11px] font-bold text-indigo-950 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600 animate-pulse" />
              호조합 타워 기획 샘플 선택 (Pre-configured Tower Presets)
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              {TOWER_PRESETS.map((p) => {
                const isSelected = activePresetId === p.id;
                return (
                  <button
                    type="button"
                    key={p.id}
                    onClick={() => applyPreset(p.id)}
                    className={`p-2 rounded-lg border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-600 text-white border-indigo-700 shadow-sm'
                        : 'bg-white hover:bg-slate-50 text-gray-700 border-gray-200'
                    }`}
                  >
                    <div className="font-extrabold text-[11px] flex justify-between items-center">
                      <span>{p.name}</span>
                      <span className={`text-[9px] px-1 rounded-sm ${isSelected ? 'bg-indigo-500/80 text-indigo-50' : 'bg-slate-100 text-gray-500'}`}>
                        {p.unitsPerFloorLine}라인
                      </span>
                    </div>
                    <div className={`text-[9.5px] mt-0.5 font-medium leading-tight ${isSelected ? 'text-indigo-100' : 'text-gray-400'}`}>
                      {p.desc}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Interactive controls inside Layout tab */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50/50 p-2.5 rounded-xl border border-slate-100 text-[11px]">
            <div className="space-y-1">
              <span className="text-gray-400 font-medium block">동수 기획</span>
              <div className="flex items-center gap-1.5 bg-white px-2 py-1 rounded-lg border border-gray-150 justify-between">
                <button
                  type="button"
                  onClick={() => setTowerCount(Math.max(1, towerCount - 1))}
                  className="p-0.5 text-gray-400 hover:text-indigo-600 cursor-pointer"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <strong className="text-gray-800 font-mono">{towerCount}동</strong>
                <button
                  type="button"
                  onClick={() => setTowerCount(towerCount + 1)}
                  className="p-0.5 text-gray-400 hover:text-indigo-600 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-gray-400 font-medium block">호조합 (라인 수)</span>
              <div className="flex items-center gap-1.5 bg-white px-2 py-1 rounded-lg border border-gray-150 justify-between">
                <button
                  type="button"
                  onClick={() => setUnitsPerFloorLine(Math.max(1, unitsPerFloorLine - 1))}
                  className="p-0.5 text-gray-400 hover:text-indigo-600 cursor-pointer"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <strong className="text-gray-800 font-mono">{unitsPerFloorLine}호</strong>
                <button
                  type="button"
                  onClick={() => setUnitsPerFloorLine(unitsPerFloorLine + 1)}
                  className="p-0.5 text-gray-400 hover:text-indigo-600 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Aboveground Floors */}
            <div className="space-y-1">
              <span className="text-gray-400 font-medium block">지상 층수 {useLayoutSimulation ? '(자동 산식)' : '기획'}</span>
              {useLayoutSimulation ? (
                <div className="bg-indigo-50/70 border border-indigo-150 px-2 py-1 rounded-lg text-indigo-950 font-bold font-mono text-center relative group cursor-help">
                  {aboveGroundFloors}층
                  <div className="hidden group-hover:block absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 p-2 bg-slate-900 text-white text-[10px] rounded-lg shadow-xl w-56 text-left leading-normal z-50 font-sans">
                    <strong>지상층수 자동산식:</strong>
                    <p>포디움 {podiumFloors}층 + 주동 기준층 {calculatedTypicalFloors}층 = {aboveGroundFloors}층</p>
                    <p className="mt-1 text-[9.5px] text-gray-300">※ 주동 기준층 = Math.ceil(공동주택 {combinedConfigs.reduce((sum, item) => sum + item.count, 0)}세대 / ({towerCount}동 × {unitsPerFloorLine}호))</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 bg-white px-2 py-1 rounded-lg border border-gray-150 justify-between">
                  <button
                    type="button"
                    onClick={() => setAboveGroundFloors(Math.max(1, aboveGroundFloors - 1))}
                    className="p-0.5 text-gray-400 hover:text-indigo-600 cursor-pointer"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <strong className="text-gray-800 font-mono">{aboveGroundFloors}층</strong>
                  <button
                    type="button"
                    onClick={() => setAboveGroundFloors(aboveGroundFloors + 1)}
                    className="p-0.5 text-gray-400 hover:text-indigo-600 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* Underground Floors */}
            <div className="space-y-1">
              <span className="text-gray-400 font-medium block">지하 층수 {useLayoutSimulation ? '(자동 산식)' : '기획'}</span>
              {useLayoutSimulation ? (
                <div className="bg-emerald-50/70 border border-emerald-150 px-2 py-1 rounded-lg text-emerald-950 font-bold font-mono text-center relative group cursor-help">
                  {undergroundFloors}층
                  <div className="hidden group-hover:block absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 p-2 bg-slate-900 text-white text-[10px] rounded-lg shadow-xl w-56 text-left leading-normal z-50 font-sans">
                    <strong>지하층수 자동산식:</strong>
                    <p>지하층수 = Math.ceil(지하연면적 ({undergroundGFA.toLocaleString()}㎡) / (대지면적 ({landArea.toLocaleString()}㎡) × 75%)) = {undergroundFloors}층</p>
                    <p className="mt-1 text-[9.5px] text-gray-300">※ 지하연면적 = 지하 주차장 + 기전실 + 지하상가</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 bg-white px-2 py-1 rounded-lg border border-gray-150 justify-between">
                  <button
                    type="button"
                    onClick={() => setUndergroundFloors(Math.max(0, undergroundFloors - 1))}
                    className="p-0.5 text-gray-400 hover:text-indigo-600 cursor-pointer"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <strong className="text-gray-800 font-mono">{undergroundFloors}층</strong>
                  <button
                    type="button"
                    onClick={() => setUndergroundFloors(undergroundFloors + 1)}
                    className="p-0.5 text-gray-400 hover:text-indigo-600 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* SVG Site Layout Map */}
          <div className="relative bg-slate-100 rounded-xl border border-gray-200 overflow-hidden flex flex-col items-center justify-center p-2" style={{ height: '340px' }}>
            {/* Top Toolbar for Map Settings */}
            <div className="absolute top-2 left-2 right-2 flex justify-between items-center z-10 w-[95%]">
              {/* EUM Cadastral Shape Selector */}
              <div className="flex bg-white/95 backdrop-blur-xs p-1 rounded-lg border border-gray-150 gap-1 shadow-xs text-[10px] font-bold">
                <span className="text-gray-400 px-1 py-0.5 flex items-center">지적형상:</span>
                <button
                  type="button"
                  onClick={() => setSelectedShapeType('eum')}
                  className={`px-1.5 py-0.5 rounded-md cursor-pointer transition-all ${selectedShapeType === 'eum' ? 'bg-indigo-600 text-white shadow-xs' : 'text-gray-600 hover:bg-slate-100'}`}
                >
                  토지이음 지적도
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedShapeType('rect')}
                  className={`px-1.5 py-0.5 rounded-md cursor-pointer transition-all ${selectedShapeType === 'rect' ? 'bg-indigo-600 text-white shadow-xs' : 'text-gray-600 hover:bg-slate-100'}`}
                >
                  정형(사각형)
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedShapeType('irregular')}
                  className={`px-1.5 py-0.5 rounded-md cursor-pointer transition-all ${selectedShapeType === 'irregular' ? 'bg-indigo-600 text-white shadow-xs' : 'text-gray-600 hover:bg-slate-100'}`}
                >
                  부정형 쐐기형
                </button>
              </div>

              {/* Auto Placement Optimizer Button */}
              <button
                type="button"
                onClick={runAutoPlacement}
                className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-white px-2.5 py-1 rounded-lg text-[10px] font-extrabold shadow-sm cursor-pointer transition-all active:scale-95"
                title="채광·인동 등 건축 심의 기준에 맞춰 동을 자동 배치합니다."
              >
                <Sparkles className="w-3 h-3 text-indigo-200 animate-pulse" />
                채광·인동 자동 배치
              </button>
            </div>

            <svg
              viewBox="0 0 450 280"
              className="w-full h-full select-none"
              onMouseMove={handleSVGMouseMove}
              onMouseUp={handleSVGMouseUp}
              onMouseLeave={handleSVGMouseUp}
            >
              {/* Surrounding Background */}
              <rect x="0" y="0" width="450" height="280" fill="#f8fafc" />
              
              {/* Surrounding Roads & Context based on Land Info */}
              {/* North Road */}
              <rect x="0" y="0" width="450" height="26" fill="#f1f5f9" />
              <line x1="0" y1="26" x2="450" y2="26" stroke="#cbd5e1" strokeWidth="1.5" />
              <line x1="0" y1="13" x2="450" y2="13" stroke="#cbd5e1" strokeWidth="6" strokeDasharray="5 4" />
              <text x="225" y="8" fill="#475569" fontSize="8.5" fontWeight="black" textAnchor="middle">
                {landInfo.surroundingContext.north}
              </text>

              {/* West Road */}
              <rect x="0" y="26" width="28" height="254" fill="#f1f5f9" />
              <line x1="28" y1="26" x2="28" y2="280" stroke="#cbd5e1" strokeWidth="1.5" />
              <line x1="14" y1="26" x2="14" y2="280" stroke="#cbd5e1" strokeWidth="6" strokeDasharray="5 4" />
              <text x="8.5" y="153" fill="#475569" fontSize="8.5" fontWeight="black" textAnchor="middle" transform="rotate(-90, 8.5, 153)">
                {landInfo.surroundingContext.west}
              </text>

              {/* Adjacent Parcels Labels (Korean style engineering land drawing) */}
              {landInfo.surroundingContext.parcels.map((p, idx) => {
                const xPos = 290 + idx * 45;
                const yPos = 45 + idx * 30;
                return (
                  <text key={p} x={xPos} y={yPos} fill="#cbd5e1" fontSize="7.5" fontWeight="bold" opacity="0.8">
                    {p}
                  </text>
                );
              })}

              {/* Grid Lines to simulate engineering look */}
              <defs>
                <pattern id="grid" width="15" height="15" patternUnits="userSpaceOnUse">
                  <path d="M 15 0 L 0 0 0 15" fill="none" stroke="#e2e8f0" strokeWidth="0.5" />
                </pattern>
              </defs>
              <rect x="28" y="26" width="422" height="254" fill="url(#grid)" opacity="0.6" />

              {/* Property Lot Boundary line (대지경계선 - 스케일에 최적화) */}
              <polygon
                points={landInfo.pointsPx.map(p => `${p.x},${p.y}`).join(' ')}
                fill={isBcrExceeded || isEncroachingBoundary ? '#fef2f2' : '#f0fdf4'}
                stroke={isBcrExceeded || isEncroachingBoundary ? '#ef4444' : '#16a34a'}
                strokeWidth="2.5"
                strokeDasharray="4 2"
                opacity="0.85"
              />
              
              {/* Land description overlay */}
              <text x="36" y="42" fill={isBcrExceeded || isEncroachingBoundary ? '#b91c1c' : '#15803d'} fontSize="8" fontWeight="bold">
                📍 {landInfo.surroundingContext.desc}
              </text>

              {/* North Arrow Symbol */}
              <g transform="translate(415, 60)">
                <circle cx="0" cy="0" r="14" fill="white" stroke="#64748b" strokeWidth="1.5" />
                <polygon points="0,-10 -5,2 0,0 5,2" fill="#ef4444" />
                <polygon points="0,10 -5,2 0,0 5,2" fill="#94a3b8" />
                <text x="0" y="-13" fill="#334155" fontSize="8" fontWeight="black" textAnchor="middle">N</text>
              </g>

              {/* Separation distances / dimensions */}
              {/* Building separation line */}
              {towerPositions.length > 1 && (
                <g>
                  <line
                    x1={towerPositions[0].x + blockWidth / 2}
                    y1={(towerPositions[0].y + towerPositions[1].y) / 2}
                    x2={towerPositions[1].x - blockWidth / 2}
                    y2={(towerPositions[0].y + towerPositions[1].y) / 2}
                    stroke={actualBuildingSeparation < requiredSeparationDistance ? '#ef4444' : '#4f46e5'}
                    strokeWidth="1.5"
                    strokeDasharray="3 2"
                  />
                  <polygon points={`${towerPositions[0].x + blockWidth / 2},${(towerPositions[0].y + towerPositions[1].y) / 2} ${towerPositions[0].x + blockWidth / 2 + 5},${(towerPositions[0].y + towerPositions[1].y) / 2 - 3} ${towerPositions[0].x + blockWidth / 2 + 5},${(towerPositions[0].y + towerPositions[1].y) / 2 + 3}`} fill={actualBuildingSeparation < requiredSeparationDistance ? '#ef4444' : '#4f46e5'} />
                  <polygon points={`${towerPositions[1].x - blockWidth / 2},${(towerPositions[0].y + towerPositions[1].y) / 2} ${towerPositions[1].x - blockWidth / 2 - 5},${(towerPositions[0].y + towerPositions[1].y) / 2 - 3} ${towerPositions[1].x - blockWidth / 2 - 5},${(towerPositions[0].y + towerPositions[1].y) / 2 + 3}`} fill={actualBuildingSeparation < requiredSeparationDistance ? '#ef4444' : '#4f46e5'} />
                  <rect x={(towerPositions[0].x + towerPositions[1].x) / 2 - 25} y={(towerPositions[0].y + towerPositions[1].y) / 2 - 8} width="50" height="15" fill="white" rx="3" stroke={actualBuildingSeparation < requiredSeparationDistance ? '#fecaca' : '#e0e7ff'} strokeWidth="1" />
                  <text
                    x={(towerPositions[0].x + towerPositions[1].x) / 2}
                    y={(towerPositions[0].y + towerPositions[1].y) / 2 + 2}
                    fill={actualBuildingSeparation < requiredSeparationDistance ? '#b91c1c' : '#4338ca'}
                    fontSize="8"
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    {actualBuildingSeparation}m
                  </text>
                </g>
              )}

              {/* Boundary separation line (from North boundary to uppermost tower) */}
              {towerPositions.length > 0 && (
                <g>
                  {(() => {
                    const minBoundaryY = -landInfo.heightM / 2;
                    // North separation line (일조사선제한 이격시각화)
                    const startY = landInfo.centerY + minBoundaryY * landInfo.scale;
                    const endY = towerPositions[0].y - blockHeight / 2;
                    const lineX = towerPositions[0].x;
                    return (
                      <>
                        <line
                          x1={lineX}
                          y1={startY}
                          x2={lineX}
                          y2={endY}
                          stroke={actualBoundarySeparation < requiredBoundaryDistance ? '#ef4444' : '#16a34a'}
                          strokeWidth="1.2"
                          strokeDasharray="2 2"
                        />
                        <circle cx={lineX} cy={startY} r="2" fill={actualBoundarySeparation < requiredBoundaryDistance ? '#ef4444' : '#16a34a'} />
                        <polygon points={`${lineX},${endY} ${lineX - 2.5},${endY - 4} ${lineX + 2.5},${endY - 4}`} fill={actualBoundarySeparation < requiredBoundaryDistance ? '#ef4444' : '#16a34a'} />
                        <rect x={lineX - 18} y={(startY + endY) / 2 - 5.5} width="36" height="11" fill="white" rx="2" stroke={actualBoundarySeparation < requiredBoundaryDistance ? '#fecaca' : '#dcfce7'} strokeWidth="1" />
                        <text
                          x={lineX}
                          y={(startY + endY) / 2 + 2.5}
                          fill={actualBoundarySeparation < requiredBoundaryDistance ? '#b91c1c' : '#15803d'}
                          fontSize="7"
                          fontWeight="bold"
                          textAnchor="middle"
                        >
                          {actualBoundarySeparation}m
                        </text>
                      </>
                    );
                  })()}
                </g>
              )}

              {/* Towers (동) drawing */}
              {towerPositions.map((pos, idx) => {
                const isSelected = selectedTowerIdx === idx;
                
                // Check if this specific tower is encroaching boundaries
                const halfW = landInfo.widthM / 2;
                const halfH = landInfo.heightM / 2;
                const isTowerEncroaching = pos.xM - towerWidthM / 2 < -halfW ||
                                           pos.xM + towerWidthM / 2 > halfW ||
                                           pos.yM - towerDepthM / 2 < -halfH ||
                                           pos.yM + towerDepthM / 2 > halfH;

                return (
                  <g
                    key={pos.name}
                    className="cursor-pointer select-none"
                    onClick={() => setSelectedTowerIdx(idx)}
                    onMouseDown={(e) => handleSVGMouseDown(idx, e)}
                    style={{ cursor: activeDragIdx === idx ? 'grabbing' : 'grab' }}
                  >
                    {/* Shadow / Glow for Selected or Encroached Tower */}
                    {(isSelected || isTowerEncroaching) && (
                      <rect
                        x={pos.x - blockWidth / 2 - 4}
                        y={pos.y - blockHeight / 2 - 4}
                        width={blockWidth + 8}
                        height={blockHeight + 8}
                        rx="8"
                        fill="none"
                        stroke={isTowerEncroaching ? '#ef4444' : '#4f46e5'}
                        strokeWidth={isTowerEncroaching ? '2' : '2.5'}
                        strokeDasharray="3 1"
                        opacity="0.8"
                      />
                    )}

                    {/* Tower footprint box */}
                    <rect
                      x={pos.x - blockWidth / 2}
                      y={pos.y - blockHeight / 2}
                      width={blockWidth}
                      height={blockHeight}
                      rx="4"
                      fill={isTowerEncroaching ? '#fef2f2' : isSelected ? '#e0e7ff' : '#ffffff'}
                      stroke={isTowerEncroaching ? '#ef4444' : isSelected ? '#4f46e5' : '#475569'}
                      strokeWidth={isSelected ? '2.5' : '1.5'}
                      className="transition-all hover:opacity-90"
                    />

                    {/* Drag Handle Overlay icon at top right */}
                    {isSelected && (
                      <g transform={`translate(${pos.x + blockWidth / 2 - 8}, ${pos.y - blockHeight / 2 + 2})`}>
                        <rect width="6" height="6" rx="1.5" fill="#4f46e5" opacity="0.9" />
                        <circle cx="3" cy="3" r="1" fill="white" />
                      </g>
                    )}

                    {/* Tower Roof Pitch (Architectural style) */}
                    <line
                      x1={pos.x - blockWidth / 2}
                      y1={pos.y - blockHeight / 2}
                      x2={pos.x}
                      y2={pos.y - blockHeight / 2 - 4}
                      stroke={isTowerEncroaching ? '#ef4444' : isSelected ? '#4f46e5' : '#475569'}
                      strokeWidth="1"
                    />
                    <line
                      x1={pos.x + blockWidth / 2}
                      y1={pos.y - blockHeight / 2}
                      x2={pos.x}
                      y2={pos.y - blockHeight / 2 - 4}
                      stroke={isTowerEncroaching ? '#ef4444' : isSelected ? '#4f46e5' : '#475569'}
                      strokeWidth="1"
                    />

                    {/* Tower label text */}
                    <text
                      x={pos.x}
                      y={pos.y - 2}
                      fill={isTowerEncroaching ? '#991b1b' : isSelected ? '#312e81' : '#1e293b'}
                      fontSize="9.5"
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      {pos.name}
                    </text>

                    {/* Floor & Units text */}
                    <text
                      x={pos.x}
                      y={pos.y + 7}
                      fill={isTowerEncroaching ? '#ef4444' : isSelected ? '#4338ca' : '#64748b'}
                      fontSize="7"
                      fontWeight="medium"
                      textAnchor="middle"
                    >
                      {towerTotalFloors}F · {unitsPerFloorLine}라인
                    </text>

                    {/* Small grid representing units top-down */}
                    <g transform={`translate(${pos.x - (unitsPerFloorLine * 6) / 2}, ${pos.y + 9})`}>
                      {Array.from({ length: unitsPerFloorLine }).map((_, lIdx) => {
                        const lineNum = lIdx + 1;
                        const lineConfig = lineConfigs[lineNum];
                        const colHex = lineConfig?.sizeM2 >= 85 ? '#10b981' : lineConfig?.sizeM2 >= 60 ? '#0ea5e9' : '#f59e0b';
                        return (
                          <rect
                            key={lIdx}
                            x={lIdx * 6}
                            y="0"
                            width="4.5"
                            height="3.5"
                            rx="0.5"
                            fill={colHex}
                            opacity="0.75"
                          />
                        );
                      })}
                    </g>
                  </g>
                );
              })}
            </svg>

            {/* Float HUD Information */}
            <div className="absolute bottom-2 left-2 right-2 flex justify-between items-center text-[10px] bg-white/95 backdrop-blur-xs p-2 rounded-lg border border-gray-150">
              <div className="flex gap-2.5">
                <span className="flex items-center gap-1 font-semibold text-gray-700">
                  <span className="w-2.5 h-2.5 bg-emerald-500 rounded-xs"></span>
                  대형 ({'>'}85㎡)
                </span>
                <span className="flex items-center gap-1 font-semibold text-gray-700">
                  <span className="w-2.5 h-2.5 bg-sky-500 rounded-xs"></span>
                  중형 (60~85㎡)
                </span>
                <span className="flex items-center gap-1 font-semibold text-gray-700">
                  <span className="w-2.5 h-2.5 bg-amber-500 rounded-xs"></span>
                  소형 ({'<'}60㎡)
                </span>
              </div>
              <div className="text-[9px] text-[#5F7161] font-bold">
                {isCommercialZone ? '🟢 상업지역 규제면제 대상' : isSeparationSatisfied && isBoundarySatisfied ? '🟢 건축심의 한계 적합' : '⚠️ 규제 한계값 검토 필요'}
              </div>
            </div>
          </div>

          {/* Quick Regulatory Spec check */}
          <div className="grid grid-cols-2 gap-3.5">
            <div className={`p-2.5 rounded-xl border text-[11px] ${isSeparationSatisfied ? 'bg-emerald-50/40 border-emerald-100 text-emerald-900' : 'bg-red-50/40 border-red-100 text-red-950'}`}>
              <div className="flex justify-between font-bold items-center mb-1">
                <span>동간 인동간격</span>
                <span className={`px-1 rounded text-[9px] ${isSeparationSatisfied ? 'bg-emerald-200/50' : 'bg-red-200/50'}`}>
                  {isSeparationSatisfied ? '적합' : '이격 부족'}
                </span>
              </div>
              <p className="text-[10px] text-gray-500 leading-normal">
                기준: {requiredSeparationDistance}m 이상 (현재: {buildingSeparationDistance}m)
              </p>
            </div>

            <div className={`p-2.5 rounded-xl border text-[11px] ${isBoundarySatisfied ? 'bg-emerald-50/40 border-emerald-100 text-emerald-900' : 'bg-red-50/40 border-red-100 text-red-950'}`}>
              <div className="flex justify-between font-bold items-center mb-1">
                <span>일조 사선제한</span>
                <span className={`px-1 rounded text-[9px] ${isBoundarySatisfied ? 'bg-emerald-200/50' : 'bg-red-200/50'}`}>
                  {isBoundarySatisfied ? '적합' : '이격 부족'}
                </span>
              </div>
              <p className="text-[10px] text-gray-500 leading-normal">
                기준: {requiredBoundaryDistance}m 이상 (현재: {boundarySeparationDistance}m)
              </p>
            </div>
          </div>
        </div>

        {/* Right Side: Dong-Ho distribution matrix (5 Columns) */}
        <div className="xl:col-span-5 bg-white p-4 rounded-xl border border-gray-150 flex flex-col justify-between min-h-[460px]">
          <div className="space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-gray-100">
              <span className="text-[11px] font-bold text-gray-800 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-indigo-600" />
                {towerPositions[selectedTowerIdx]?.name || '101동'} 세대수 및 층별 배치표
              </span>
              <span className="text-[10px] text-gray-400 font-bold font-mono">
                지상 {towerTotalFloors}개층
              </span>
            </div>

            {/* Unit Details Tooltip HUD */}
            <div className="h-16 bg-slate-50 p-2 rounded-xl border border-gray-150 text-[11px] flex items-center justify-center">
              {hoveredUnit ? (
                <div className="w-full grid grid-cols-2 gap-2 text-left">
                  <div>
                    <span className="text-gray-400 text-[9px] block">선택 세대</span>
                    <strong className="text-gray-800 text-xs font-mono">{hoveredUnit.dong} {hoveredUnit.floor}0{hoveredUnit.ho}호</strong>
                  </div>
                  <div className="text-right">
                    <span className="text-gray-400 text-[9px] block">타입 및 전용면적</span>
                    <strong className="text-gray-800 text-[11.5px]">{hoveredUnit.name} ({hoveredUnit.sizeM2}㎡ / {hoveredUnit.pyung}평)</strong>
                  </div>
                  <div className="col-span-2 pt-0.5 border-t border-slate-200/60 flex justify-between items-center text-[10px]">
                    <span className="text-[#5F7161] font-semibold">예상 분양가격</span>
                    <strong className="text-indigo-600 font-extrabold font-mono">약 {hoveredUnit.price.toLocaleString()} 만원</strong>
                  </div>
                </div>
              ) : (
                <p className="text-[10px] text-gray-400 italic text-center leading-relaxed">
                  아래 동호수 표의 세대 셀에 마우스를 올리시면<br />전용 평형, 배정 타입, 세부 예상 분양가를 볼 수 있습니다.
                </p>
              )}
            </div>

            {/* Dong-Ho Map Grid */}
            <div className="overflow-y-auto max-h-[300px] border border-gray-100 rounded-xl pr-1.5">
              <div className="space-y-1 pt-1.5 pb-2 pl-2">
                {/* Roof cap */}
                <div className="w-full text-center text-[9px] text-gray-400 font-extrabold tracking-widest border-b border-gray-200 pb-1 uppercase font-mono">
                  {towerPositions[selectedTowerIdx]?.name || '101동'} ROOF TOP
                </div>

                {/* Render reverse floor grid (High floors to Ground floors) */}
                {Array.from({ length: towerTotalFloors }).map((_, fIdx) => {
                  const floorNum = towerTotalFloors - fIdx;
                  const isPodium = floorNum <= podiumFloors;

                  return (
                    <div key={floorNum} className="flex items-center gap-1.5">
                      {/* Floor label */}
                      <span className={`w-8 text-[9px] font-bold font-mono text-center py-1 rounded-sm ${isPodium ? 'bg-amber-50 text-amber-800 border border-amber-100' : 'bg-slate-50 text-slate-600'}`}>
                        {floorNum}F
                      </span>

                      {/* Units in this floor */}
                      {isPodium ? (
                        <div className="flex-1 bg-amber-50/40 border border-dashed border-amber-200 text-amber-800 text-[9.5px] font-bold text-center py-1.5 rounded-lg">
                          포디움 지상 상업용 시설 및 주민편의 커뮤니티 공간
                        </div>
                      ) : (
                        <div className="flex-1 grid gap-1" style={{ gridTemplateColumns: `repeat(${unitsPerFloorLine}, minmax(0, 1fr))` }}>
                          {Array.from({ length: unitsPerFloorLine }).map((_, uIdx) => {
                            const hoNum = uIdx + 1;
                            const lineConfig = lineConfigs[hoNum];
                            const designColor = getUnitColorClass(lineConfig?.sizeM2 || 84);

                            // Calculate estimated flat price
                            const totalFlatPrice = lineConfig
                              ? Math.round(lineConfig.salesPricePerPyung * lineConfig.pyung)
                              : 100000;

                            return (
                              <div
                                key={hoNum}
                                onMouseEnter={() => setHoveredUnit({
                                  dong: towerPositions[selectedTowerIdx]?.name || '101동',
                                  floor: floorNum,
                                  ho: hoNum,
                                  name: lineConfig?.name || '평형타입',
                                  sizeM2: lineConfig?.sizeM2 || 84,
                                  pyung: lineConfig?.pyung || 25,
                                  price: totalFlatPrice
                                })}
                                onMouseLeave={() => setHoveredUnit(null)}
                                className={`py-1 text-center font-mono font-bold text-[9px] rounded-md border transition-all cursor-help select-none ${designColor.bg}`}
                              >
                                {floorNum}0{hoNum}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Basement floors indicators */}
                {undergroundFloors > 0 && (
                  <div className="pt-2 border-t border-gray-200 space-y-1">
                    {Array.from({ length: undergroundFloors }).map((_, bIdx) => {
                      const bFloorNum = bIdx + 1;
                      return (
                        <div key={bFloorNum} className="flex items-center gap-1.5 opacity-80">
                          <span className="w-8 text-[9px] font-bold font-mono text-center py-1 rounded-sm bg-gray-100 text-gray-500">
                            B{bFloorNum}
                          </span>
                          <div className="flex-1 bg-gray-100 text-gray-500 text-[9px] text-center py-1.5 rounded-lg font-bold border border-gray-200">
                            지하 주차장 및 정밀 하중 기계 설비·전기동 ({bFloorNum}층)
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Core breakdown summary at the bottom */}
          <div className="bg-slate-50/70 p-3 rounded-xl border border-gray-150 space-y-1.5 text-[10.5px]">
            <span className="font-bold text-gray-700 block text-[11px]">🧩 배치 배정 라인업 정보</span>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1">
              {Object.entries(lineConfigs).map(([lineNum, configVal]) => {
                const lineConfig = configVal as any;
                const designColor = getUnitColorClass(lineConfig?.sizeM2 || 84);
                return (
                  <div key={lineNum} className="flex justify-between items-center border-b border-gray-100 py-0.5">
                    <span className="text-gray-500 font-medium">{lineNum}호 라인:</span>
                    <strong className="text-gray-800 flex items-center gap-1">
                      <span className={`w-1.5 h-1.5 rounded-full ${designColor.badge}`}></span>
                      {lineConfig?.name}
                    </strong>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
