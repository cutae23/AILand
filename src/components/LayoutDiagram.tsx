import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Compass, Building2, Layers, Info, Check, Plus, Minus, LayoutGrid, HelpCircle, Sparkles, RefreshCw, Sliders, Move, HelpCircle as AlertTriangle } from 'lucide-react';

// Ray casting point-in-polygon algorithm to check if a tower's corner is inside the lot boundaries
function isPointInPolygon(point: { x: number; y: number }, polygon: { x: number; y: number }[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y;
    const xj = polygon[j].x, yj = polygon[j].y;
    
    const intersect = ((yi > point.y) !== (yj > point.y))
        && (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

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
  defaultFloorHeight?: number;
  customFloorHeights?: Record<string, number>;
  basementLandUtilRatio?: number;
  floorCalculationMode?: 'auto' | 'manual';
}

export const TOWER_PRESETS = [
  {
    id: 'gold-balance',
    name: '🏆 국평 골드 밸런스형 (4호 조합)',
    desc: '분양률 1위 조합. 59㎡와 84㎡를 전면에 배치하여 초기 자금 회수 및 환금성을 극대화합니다.',
    unitsPerFloorLine: 4,
    lineSetup: [59, 84, 84, 59],
    towerCount: 2,
    aboveGroundFloors: 8,
    podiumFloors: 2,
    tag: '분양성 최우수',
    tagColor: 'bg-emerald-50 text-emerald-700 border-emerald-150',
    target: '3040세대 주 실수요층 및 신혼부부',
    speed: '매우 빠름 (조기 완판)',
    margin: '안정적 수익률',
    aptConfigs: [
      { id: 'apt_small', name: '공동주택 소형 (전용 59㎡ / 실 18평)', sizeM2: 59, pyung: 18, salesPricePerPyung: 4200, count: 24 },
      { id: 'apt_medium', name: '공동주택 중형 (전용 84㎡ / 실 25평)', sizeM2: 84, pyung: 25, salesPricePerPyung: 4500, count: 24 }
    ],
    officetelConfigs: [
      { id: 'officetel_studio', name: '오피스텔 원룸 (전용 30㎡ / 실 9평)', sizeM2: 30, pyung: 9, salesPricePerPyung: 2600, count: 0 },
      { id: 'officetel_tworoom', name: '오피스텔 투룸 (전용 59㎡ / 실 18평)', sizeM2: 59, pyung: 18, salesPricePerPyung: 3000, count: 0 },
      { id: 'officetel_threeroom', name: '오피스텔 쓰리룸 (전용 84㎡ / 실 25평)', sizeM2: 84, pyung: 25, salesPricePerPyung: 3400, count: 0 }
    ]
  },
  {
    id: 'luxury-prestige',
    name: '💎 하이엔드 중대형형 (3호 조합)',
    desc: '강남 재건축 및 명품 단지 특화. 양면 개방형 거실 및 4Bay 조망 중심의 고품격 분양 전략.',
    unitsPerFloorLine: 3,
    lineSetup: [84, 114, 155],
    towerCount: 1,
    aboveGroundFloors: 12,
    podiumFloors: 2,
    tag: '수익성 극대화',
    tagColor: 'bg-purple-50 text-purple-700 border-purple-150',
    target: '고소득 자산가 및 대형 대체 수요',
    speed: '보통 (고가 프리미엄 분양)',
    margin: '평당 최고가 달성',
    aptConfigs: [
      { id: 'apt_small', name: '공동주택 소형 (전용 59㎡ / 실 18평)', sizeM2: 59, pyung: 18, salesPricePerPyung: 4200, count: 0 },
      { id: 'apt_medium', name: '공동주택 중형 (전용 84㎡ / 실 25평)', sizeM2: 84, pyung: 25, salesPricePerPyung: 4600, count: 10 },
      { id: 'apt_large', name: '공동주택 대형 (전용 114㎡ / 실 34평)', sizeM2: 114, pyung: 34, salesPricePerPyung: 5200, count: 10 },
      { id: 'apt_luxury', name: '공동주택 하이엔드 (전용 155㎡ / 실 47평)', sizeM2: 155, pyung: 47, salesPricePerPyung: 5500, count: 10 }
    ],
    officetelConfigs: [
      { id: 'officetel_studio', name: '오피스텔 원룸 (전용 30㎡ / 실 9평)', sizeM2: 30, pyung: 9, salesPricePerPyung: 2600, count: 0 },
      { id: 'officetel_tworoom', name: '오피스텔 투룸 (전용 59㎡ / 실 18평)', sizeM2: 59, pyung: 18, salesPricePerPyung: 3000, count: 0 },
      { id: 'officetel_threeroom', name: '오피스텔 쓰리룸 (전용 84㎡ / 실 25평)', sizeM2: 84, pyung: 25, salesPricePerPyung: 3400, count: 0 }
    ]
  },
  {
    id: 'urban-compact',
    name: '⚡ 도심형 컴팩트 임대 수익형 (5호 조합)',
    desc: '초소형/소형 중심 구성. 역세권 청년주택이나 도심 고밀도 지역 공실률 제로 분양 최적 상품.',
    unitsPerFloorLine: 5,
    lineSetup: [30, 39, 49, 59, 59],
    towerCount: 1,
    aboveGroundFloors: 10,
    podiumFloors: 2,
    tag: '임대수익 특화',
    tagColor: 'bg-amber-50 text-amber-700 border-amber-150',
    target: '1-2인 가구 및 소형 주택 투자수요',
    speed: '매우 빠름 (초고속 임대 분양)',
    margin: '높은 연수익률 보장',
    aptConfigs: [
      { id: 'apt_custom_39', name: '공동주택 초소형 (전용 39㎡ / 실 12평)', sizeM2: 39, pyung: 12, salesPricePerPyung: 4000, count: 8 },
      { id: 'apt_custom_49', name: '공동주택 강소형 (전용 49㎡ / 실 15평)', sizeM2: 49, pyung: 15, salesPricePerPyung: 4100, count: 8 },
      { id: 'apt_small', name: '공동주택 소형 (전용 59㎡ / 실 18평)', sizeM2: 59, pyung: 18, salesPricePerPyung: 4200, count: 16 }
    ],
    officetelConfigs: [
      { id: 'officetel_studio', name: '오피스텔 원룸 (전용 30㎡ / 실 9평)', sizeM2: 30, pyung: 9, salesPricePerPyung: 2700, count: 8 },
      { id: 'officetel_tworoom', name: '오피스텔 투룸 (전용 59㎡ / 실 18평)', sizeM2: 59, pyung: 18, salesPricePerPyung: 3100, count: 0 },
      { id: 'officetel_threeroom', name: '오피스텔 쓰리룸 (전용 84㎡ / 실 25평)', sizeM2: 84, pyung: 25, salesPricePerPyung: 3400, count: 0 }
    ]
  },
  {
    id: 'hybrid-officetel',
    name: '🏢 주거형 아파텔 복합형 (4호 조합)',
    desc: '규제 완화 혜택 및 오피스텔 주거 수요 흡수. 아파트 59/84와 고효율 투룸 오피스텔 결합 상품.',
    unitsPerFloorLine: 4,
    lineSetup: [59, 84, 59, 30],
    towerCount: 2,
    aboveGroundFloors: 12,
    podiumFloors: 2,
    tag: '청약회피 틈새',
    tagColor: 'bg-sky-50 text-sky-700 border-sky-150',
    target: '청약가점 낮은 젊은 맞벌이 부부',
    speed: '매우 빠름 (분양 장벽 최소)',
    margin: '고밀도 상업지 최적',
    aptConfigs: [
      { id: 'apt_small', name: '공동주택 소형 (전용 59㎡ / 실 18평)', sizeM2: 59, pyung: 18, salesPricePerPyung: 4200, count: 40 },
      { id: 'apt_medium', name: '공동주택 중형 (전용 84㎡ / 실 25평)', sizeM2: 84, pyung: 25, salesPricePerPyung: 4500, count: 20 },
      { id: 'apt_large', name: '공동주택 대형 (전용 114㎡ / 실 34평)', sizeM2: 114, pyung: 34, salesPricePerPyung: 5000, count: 0 }
    ],
    officetelConfigs: [
      { id: 'officetel_studio', name: '오피스텔 원룸 (전용 30㎡ / 실 9평)', sizeM2: 30, pyung: 9, salesPricePerPyung: 2600, count: 20 },
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
  undergroundGFA = 0,
  defaultFloorHeight = 3.3,
  customFloorHeights = {},
  basementLandUtilRatio = 70,
  floorCalculationMode = 'manual'
}: LayoutDiagramProps) {
  // View mode toggle: 'layout' for site layout plan, 'section' for building cross-section
  const [viewMode, setViewMode] = useState<'layout' | 'section'>('layout');
  const [hoveredFloorName, setHoveredFloorName] = useState<string | null>(null);

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
  
  // Drag and drop state
  const [activeDragIdx, setActiveDragIdx] = useState<number | null>(null);

  // Selected tower preset ID
  const [activePresetId, setActivePresetId] = useState<string>('gold-balance');

  // Sizes (m2) of each unit line (1호, 2호, 3호...)
  const [lineSizes, setLineSizes] = useState<number[]>([59, 84, 84, 59]);

  // Whether to automatically sync custom layouts with parent business model counts
  const [autoSync, setAutoSync] = useState<boolean>(true);

  // Distribute flat configs across available units per floor
  const combinedConfigs = useMemo(() => {
    const list = [...aptConfigs, ...officetelConfigs].filter(c => c.count > 0);
    if (list.length === 0) {
      // Default placeholder if none defined
      return [{ id: 'def', name: '표준 84㎡타입', sizeM2: 84, pyung: 25, salesPricePerPyung: 4000, count: 10 }];
    }
    return list;
  }, [aptConfigs, officetelConfigs]);

  const averageUnitSizeM2 = useMemo(() => {
    if (combinedConfigs.length === 0) return 84;
    return combinedConfigs.reduce((sum, item) => sum + item.sizeM2, 0) / combinedConfigs.length;
  }, [combinedConfigs]);

  const towerFootprintM2 = useMemo(() => {
    // Standard common ratio assumption of 1.25 (25% common area)
    return unitsPerFloorLine * averageUnitSizeM2 * 1.25;
  }, [unitsPerFloorLine, averageUnitSizeM2]);

  // Dimensions of a tower in meters
  const towerDepthM = 12; // Realistic standard block depth
  const towerWidthM = useMemo(() => {
    // Width is exactly footprint divided by depth so that the drawn rectangle's geometric area
    // matches the numerical footprint area perfectly.
    return Math.max(14, towerFootprintM2 / towerDepthM);
  }, [towerFootprintM2, towerDepthM]);

  // --- Building Cross-Section (단면도) Computations ---
  const floorElevations = useMemo(() => {
    const list: {
      name: string;
      type: 'underground' | 'podium' | 'typical' | 'roof';
      height: number;
      bottomElev: number;
      topElev: number;
    }[] = [];

    // 1. Underground floors (from bottom to top, e.g. B3, B2, B1)
    let currentElev = 0;
    const ugList = [];
    for (let i = 1; i <= undergroundFloors; i++) {
      const fName = `B${i}`;
      const fHeight = customFloorHeights?.[fName] ?? 3.5;
      currentElev -= fHeight;
      ugList.push({
        name: fName,
        type: 'underground' as const,
        height: fHeight,
        bottomElev: currentElev,
        topElev: currentElev + fHeight
      });
    }
    ugList.reverse();
    list.push(...ugList);

    // 2. Aboveground floors (from 1F to aboveGroundFloors)
    currentElev = 0;
    for (let i = 1; i <= aboveGroundFloors; i++) {
      const fName = `${i}F`;
      let fHeight = defaultFloorHeight;
      if (i === 1) {
        fHeight = customFloorHeights?.['1F'] ?? 4.5;
      } else if (i <= podiumFloors) {
        fHeight = customFloorHeights?.[fName] ?? defaultFloorHeight;
      }
      const bottom = currentElev;
      currentElev += fHeight;
      list.push({
        name: fName,
        type: (i <= podiumFloors) ? ('podium' as const) : ('typical' as const),
        height: fHeight,
        bottomElev: bottom,
        topElev: currentElev
      });
    }

    // 3. Roof / Parapet
    list.push({
      name: '옥탑(PH)',
      type: 'roof' as const,
      height: 1.5,
      bottomElev: currentElev,
      topElev: currentElev + 1.5
    });

    return list;
  }, [undergroundFloors, aboveGroundFloors, podiumFloors, defaultFloorHeight, customFloorHeights]);

  const maxAboveElev = useMemo(() => {
    const topFloor = floorElevations.find(f => f.name === `${aboveGroundFloors}F`);
    return topFloor ? topFloor.topElev : (totalBuildingHeight || 30);
  }, [floorElevations, aboveGroundFloors, totalBuildingHeight]);

  const minUndergroundElev = useMemo(() => {
    const ugFloors = floorElevations.filter(f => f.type === 'underground');
    if (ugFloors.length === 0) return 0;
    return Math.min(...ugFloors.map(f => f.bottomElev));
  }, [floorElevations]);

  // Viewport mapping configurations
  const glY = 190; // Y coordinate for Ground Level
  const maxAboveHeightPx = 145; // 190 to 45 (for above ground height)
  const maxUndergroundHeightPx = 65; // 190 to 255 (for basement depth)

  const scaleAbove = useMemo(() => {
    return maxAboveHeightPx / Math.max(10, maxAboveElev);
  }, [maxAboveElev]);

  const scaleBelow = useMemo(() => {
    return maxUndergroundHeightPx / Math.max(3.5, Math.abs(minUndergroundElev));
  }, [minUndergroundElev]);

  const sectionTowers = useMemo(() => {
    const towerWidth = towerCount === 1 ? 160 : towerCount === 2 ? 100 : 70;
    const towerGap = towerCount === 1 ? 0 : towerCount === 2 ? 40 : 20;
    const startX = 225 - (towerCount * towerWidth + (towerCount - 1) * towerGap) / 2;

    return Array.from({ length: towerCount }).map((_, idx) => {
      const xLeft = startX + idx * (towerWidth + towerGap);
      return {
        index: idx + 1,
        name: `${idx + 1}동`,
        xLeft,
        width: towerWidth,
        xCenter: xLeft + towerWidth / 2
      };
    });
  }, [towerCount]);

  // Pick colors for different unit sizes
  const getUnitColorClass = (size: number) => {
    if (size >= 155) return { 
      bg: 'bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100/70', 
      badge: 'bg-purple-600',
      svgFill: 'fill-purple-50',
      svgStroke: 'stroke-purple-200',
      svgText: 'fill-purple-700'
    };
    if (size >= 114) return { 
      bg: 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100/70', 
      badge: 'bg-indigo-600',
      svgFill: 'fill-indigo-50',
      svgStroke: 'stroke-indigo-200',
      svgText: 'fill-indigo-700'
    };
    if (size >= 84) return { 
      bg: 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100/70', 
      badge: 'bg-emerald-600',
      svgFill: 'fill-emerald-50',
      svgStroke: 'stroke-emerald-200',
      svgText: 'fill-emerald-700'
    };
    if (size >= 59) return { 
      bg: 'bg-sky-50 border-sky-200 text-sky-700 hover:bg-sky-100/70', 
      badge: 'bg-sky-600',
      svgFill: 'fill-sky-50',
      svgStroke: 'stroke-sky-200',
      svgText: 'fill-sky-700'
    };
    return { 
      bg: 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100/70', 
      badge: 'bg-amber-600',
      svgFill: 'fill-amber-50',
      svgStroke: 'stroke-amber-200',
      svgText: 'fill-amber-700'
    };
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
      // Custom land or other. Make a clean rectangle with aspect ratio 1.4 or actual irregular/wedge shape
      const customArea = landArea || 500;
      widthM = Math.sqrt(customArea / 1.4);
      heightM = widthM * 1.4;
      
      if (selectedShapeType === 'rect') {
        pointsM = [
          { x: -widthM/2, y: -heightM/2 },
          { x: widthM/2, y: -heightM/2 },
          { x: widthM/2, y: heightM/2 },
          { x: -widthM/2, y: heightM/2 },
        ];
      } else if (selectedShapeType === 'irregular') {
        // Wedge/Trapezoid shape (부정형 쐐기형)
        pointsM = [
          { x: -widthM * 0.38, y: -heightM/2 },
          { x: widthM * 0.42, y: -heightM/2 + heightM * 0.08 },
          { x: widthM * 0.55, y: heightM/2 },
          { x: -widthM * 0.52, y: heightM/2 - heightM * 0.04 },
        ];
      } else {
        // EUM actual irregular shape (토지이음 지적도)
        // Multi-segment realistic cadastral shape with organic non-parallel boundaries
        pointsM = [
          { x: -widthM * 0.46, y: -heightM/2 + heightM * 0.12 },
          { x: widthM * 0.42, y: -heightM/2 },
          { x: widthM * 0.52, y: heightM * 0.18 },
          { x: widthM * 0.38, y: heightM/2 },
          { x: -widthM * 0.44, y: heightM/2 - heightM * 0.08 },
          { x: -widthM * 0.54, y: -heightM * 0.06 }
        ];
      }
      
      surroundingContext = {
        north: '북측 인접 도로',
        west: '서측 진입 도로',
        desc: `커스텀 대지 기획안 (${customArea.toLocaleString()}㎡) - 토지이음 연계`,
        parcels: ['산 11-1 대']
      };
    }

    // Mathematically exact geometric scale so that the drawn polygon's area is exactly equal to landArea.
    // This prevents any mismatch between visual boundaries and numerical lot area (대지면적).
    let currentGeoArea = 0;
    const numPoints = pointsM.length;
    if (numPoints >= 3) {
      let areaSum = 0;
      for (let i = 0; i < numPoints; i++) {
        const j = (i + 1) % numPoints;
        areaSum += pointsM[i].x * pointsM[j].y;
        areaSum -= pointsM[j].x * pointsM[i].y;
      }
      currentGeoArea = Math.abs(areaSum) / 2;
    }

    const targetArea = landArea || (type === 'gangnam' ? 642 : (type === 'yeonnam' ? 228 : 415));
    if (currentGeoArea > 0 && targetArea > 0) {
      const correctionScale = Math.sqrt(targetArea / currentGeoArea);
      pointsM = pointsM.map(p => ({
        x: p.x * correctionScale,
        y: p.y * correctionScale
      }));
      widthM = widthM * correctionScale;
      heightM = heightM * correctionScale;
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
      const lastRowTowersCount = towerCount - (rows - 1) * cols;
      for (let i = 0; i < towerCount; i++) {
        const r = Math.floor(i / cols);
        const c = i % cols;
        const isLastRow = r === rows - 1;
        
        let xOffset = 0;
        if (isLastRow && lastRowTowersCount < cols) {
          // Center the incomplete last row
          const cOffset = lastRowTowersCount > 1 ? (c - (lastRowTowersCount - 1) / 2) : 0;
          xOffset = cols > 1 ? (cOffset / (cols - 1)) : 0;
        } else {
          xOffset = cols > 1 ? (c / (cols - 1) - 0.5) : 0;
        }
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
    
    if (preset.towerCount !== undefined) {
      setTowerCount(preset.towerCount);
    }
    if (preset.podiumFloors !== undefined) {
      setPodiumFloors(preset.podiumFloors);
    }
    
    if (preset.lineSetup) {
      setLineSizes(preset.lineSetup);
    }
    
    // Calculate current total units in parent to see if we should scale counts
    const currentTotalApt = (aptConfigs || []).reduce((sum, item) => sum + item.count, 0);
    const currentTotalOt = (officetelConfigs || []).reduce((sum, item) => sum + item.count, 0);
    const prevTotalUnits = currentTotalApt + currentTotalOt;

    let finalAptConfigs = preset.aptConfigs ? [...preset.aptConfigs] : [];
    let finalOfficetelConfigs = preset.officetelConfigs ? [...preset.officetelConfigs] : [];
    let calculatedFloors = preset.aboveGroundFloors || 8;

    if (prevTotalUnits > 10) {
      const presetTotalApt = (preset.aptConfigs || []).reduce((sum, item) => sum + item.count, 0);
      const presetTotalOt = (preset.officetelConfigs || []).reduce((sum, item) => sum + item.count, 0);
      const presetTotal = presetTotalApt + presetTotalOt;

      if (presetTotal > 0) {
        finalAptConfigs = (preset.aptConfigs || []).map(cfg => {
          const ratio = cfg.count / presetTotal;
          const scaledCount = Math.round(prevTotalUnits * ratio);
          return { ...cfg, count: scaledCount };
        });

        finalOfficetelConfigs = (preset.officetelConfigs || []).map(cfg => {
          const ratio = cfg.count / presetTotal;
          const scaledCount = Math.round(prevTotalUnits * ratio);
          return { ...cfg, count: scaledCount };
        });

        const finalTowerCount = preset.towerCount !== undefined ? preset.towerCount : towerCount;
        const finalLineCount = preset.unitsPerFloorLine;
        const perFloor = finalTowerCount * finalLineCount;
        if (perFloor > 0) {
          const typicalFloors = Math.ceil(prevTotalUnits / perFloor);
          calculatedFloors = typicalFloors + (preset.podiumFloors || 2);
        }
      }
    }

    setAboveGroundFloors(calculatedFloors);
    
    if (setAptConfigs) {
      setAptConfigs(finalAptConfigs);
    }
    if (setOfficetelConfigs) {
      setOfficetelConfigs(finalOfficetelConfigs);
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
      
      // Determine spacing but distribute if they don't fit
      let spacingY = Math.max(requiredSep, towerDepthM + 4);
      if (minY + (rows - 1) * spacingY > maxY && rows > 1) {
        spacingY = (maxY - minY) / (rows - 1);
      }
      
      const lastRowTowersCount = towerCount - (rows - 1) * cols;
      
      for (let i = 0; i < towerCount; i++) {
        const r = Math.floor(i / cols);
        const c = i % cols;
        const isLastRow = r === rows - 1;
        
        let xVal = 0;
        if (isLastRow && lastRowTowersCount < cols) {
          // Center the incomplete last row
          const cOffset = lastRowTowersCount > 1 ? (c - (lastRowTowersCount - 1) / 2) : 0;
          const xOffsetNorm = cols > 1 ? (cOffset / (cols - 1)) : 0;
          xVal = (minX + maxX) / 2 + xOffsetNorm * (maxX - minX);
        } else {
          xVal = minX + (cols > 1 ? (c / (cols - 1)) * (maxX - minX) : 0);
        }
        
        const yVal = minY + r * spacingY;
        
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

  // Synthesize or find appropriate configuration for a given unit size
  const getConfigForSize = useCallback((sizeM2: number) => {
    const allConfigs = [...aptConfigs, ...officetelConfigs];
    const found = allConfigs.find(c => Math.abs(c.sizeM2 - sizeM2) <= 1);
    if (found) return found;
    
    // Synthesize one if none matches
    const pyung = Math.round(sizeM2 * 0.3025);
    let name = `공동주택 (${sizeM2}㎡ / ${pyung}평)`;
    let salesPrice = 4500;
    if (sizeM2 === 30) { name = '오피스텔 원룸 (전용 30㎡ / 실 9평)'; salesPrice = 2600; }
    else if (sizeM2 === 39) { name = '공동주택 초소형 (39㎡ / 12평)'; salesPrice = 4000; }
    else if (sizeM2 === 49) { name = '공동주택 강소형 (49㎡ / 15평)'; salesPrice = 4100; }
    else if (sizeM2 === 59) { name = '공동주택 소형 (59㎡ / 18평)'; salesPrice = 4200; }
    else if (sizeM2 === 84) { name = '공동주택 중형 (84㎡ / 25평)'; salesPrice = 4500; }
    else if (sizeM2 === 114) { name = '공동주택 대형 (114㎡ / 34평)'; salesPrice = 5000; }
    else if (sizeM2 === 155) { name = '공동주택 하이엔드 (155㎡ / 47평)'; salesPrice = 5500; }
    
    return {
      id: `custom_apt_${sizeM2}`,
      name,
      sizeM2,
      pyung,
      salesPricePerPyung: salesPrice,
      count: 0
    };
  }, [aptConfigs, officetelConfigs]);

  // Synchronize line configurations to parent's business analysis counts
  const syncCountsToParent = useCallback((currentLineSizes: number[]) => {
    if (!setAptConfigs || !setOfficetelConfigs) return;
    
    const floors = Math.max(1, aboveGroundFloors - podiumFloors);
    
    // Count occurrences of each size
    const occurrences: Record<number, number> = {};
    currentLineSizes.forEach(sz => {
      occurrences[sz] = (occurrences[sz] || 0) + 1;
    });
    
    // Map existing aptConfigs or generate matching ones
    const updatedApts = aptConfigs.map(cfg => {
      const hasAptActive = aptConfigs.some(c => c.sizeM2 === cfg.sizeM2 && c.count > 0);
      const hasOtActive = officetelConfigs.some(c => c.sizeM2 === cfg.sizeM2 && c.count > 0);
      
      let isActive = false;
      if (hasAptActive) {
        isActive = true;
      } else if (!hasOtActive) {
        // Neither is active, use default mapping: 30 is officetel by default, others are apartments
        isActive = cfg.sizeM2 !== 30;
      }
      
      const lineOccurrenceCount = isActive ? (occurrences[cfg.sizeM2] || 0) : 0;
      const calculatedCount = towerCount * floors * lineOccurrenceCount;
      return { ...cfg, count: calculatedCount };
    });
    
    // Also support officetel configs
    const updatedOts = officetelConfigs.map(cfg => {
      const hasAptActive = aptConfigs.some(c => c.sizeM2 === cfg.sizeM2 && c.count > 0);
      const hasOtActive = officetelConfigs.some(c => c.sizeM2 === cfg.sizeM2 && c.count > 0);
      
      let isActive = false;
      if (hasOtActive && !hasAptActive) {
        isActive = true;
      } else if (!hasOtActive && !hasAptActive) {
        // Neither is active, use default mapping: 30 is officetel by default, others are apartments
        isActive = cfg.sizeM2 === 30;
      }
      
      const lineOccurrenceCount = isActive ? (occurrences[cfg.sizeM2] || 0) : 0;
      const calculatedCount = towerCount * floors * lineOccurrenceCount;
      return { ...cfg, count: calculatedCount };
    });
    
    // Check if there are size selections not present in either config list
    // We can add them to apartments by default
    const allKnownSizes = [...aptConfigs, ...officetelConfigs].map(c => c.sizeM2);
    const missingSizes = Object.keys(occurrences).map(Number).filter(sz => !allKnownSizes.includes(sz));
    
    const extraAptConfigs = [...updatedApts];
    missingSizes.forEach(sz => {
      const pyung = Math.round(sz * 0.3025);
      const lineOccurrenceCount = occurrences[sz] || 0;
      const calculatedCount = towerCount * floors * lineOccurrenceCount;
      extraAptConfigs.push({
        id: `apt_custom_${sz}`,
        name: `공동주택 특화 (전용 ${sz}㎡ / 실 ${pyung}평)`,
        sizeM2: sz,
        pyung,
        salesPricePerPyung: sz >= 114 ? 5200 : sz >= 84 ? 4500 : 4200,
        count: calculatedCount
      });
    });
    
    const finalApts = extraAptConfigs.filter(cfg => cfg.count > 0 || ['apt_small', 'apt_medium', 'apt_large'].includes(cfg.id));
    const finalOts = updatedOts.filter(cfg => cfg.count > 0 || ['officetel_studio', 'officetel_tworoom', 'officetel_threeroom'].includes(cfg.id));
    
    // Perform a deep comparison to avoid unnecessary state updates and prevent infinite React render loops
    const aptsDiffer = finalApts.length !== aptConfigs.length || finalApts.some((item, idx) => {
      const orig = aptConfigs[idx];
      return !orig || item.id !== orig.id || item.count !== orig.count || item.sizeM2 !== orig.sizeM2 || item.name !== orig.name;
    });

    const otsDiffer = finalOts.length !== officetelConfigs.length || finalOts.some((item, idx) => {
      const orig = officetelConfigs[idx];
      return !orig || item.id !== orig.id || item.count !== orig.count || item.sizeM2 !== orig.sizeM2 || item.name !== orig.name;
    });

    if (aptsDiffer) {
      setAptConfigs(finalApts);
    }
    if (otsDiffer) {
      setOfficetelConfigs(finalOts);
    }
  }, [aptConfigs, officetelConfigs, towerCount, aboveGroundFloors, podiumFloors, setAptConfigs, setOfficetelConfigs]);

  // Synchronize with parent whenever relevant variables change
  useEffect(() => {
    if (autoSync) {
      syncCountsToParent(lineSizes);
    }
  }, [lineSizes, towerCount, aboveGroundFloors, podiumFloors, autoSync, syncCountsToParent]);

  // Handle automatic size tracking whenever unitsPerFloorLine changes
  useEffect(() => {
    if (lineSizes.length !== unitsPerFloorLine) {
      setLineSizes(prev => {
        const next = [...prev];
        if (next.length < unitsPerFloorLine) {
          while (next.length < unitsPerFloorLine) {
            next.push(84); // pad with standard 84m2
          }
        } else if (next.length > unitsPerFloorLine) {
          next.splice(unitsPerFloorLine);
        }
        return next;
      });
    }
  }, [unitsPerFloorLine, lineSizes.length]);

  // Map each line (1호, 2호...) to a config based on lineSizes
  const lineConfigs = useMemo(() => {
    const configMap: Record<number, any> = {};
    for (let i = 1; i <= unitsPerFloorLine; i++) {
      const sz = lineSizes[i - 1] || 84;
      configMap[i] = getConfigForSize(sz);
    }
    return configMap;
  }, [unitsPerFloorLine, lineSizes, getConfigForSize]);

  // Total residential units calculated in this tower
  const towerTotalFloors = aboveGroundFloors;

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
    return towerPositions.some(pos => {
      const corners = [
        { x: pos.xM - towerWidthM / 2, y: pos.yM - towerDepthM / 2 },
        { x: pos.xM + towerWidthM / 2, y: pos.yM - towerDepthM / 2 },
        { x: pos.xM + towerWidthM / 2, y: pos.yM + towerDepthM / 2 },
        { x: pos.xM - towerWidthM / 2, y: pos.yM + towerDepthM / 2 }
      ];
      return corners.some(corner => !isPointInPolygon(corner, landInfo.pointsM));
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
              {viewMode === 'layout' ? '대지 단지 배치도 (Site Layout Plan)' : '건축물 주단면도 (Building Cross-Section)'}
            </span>
            <div className="flex items-center gap-2">
              {viewMode === 'layout' && (
                <div className="hidden sm:flex items-center gap-3 mr-2">
                  <div className="flex items-center gap-1 text-[10px] text-gray-400 font-mono">
                    <span className="w-2.5 h-2.5 bg-emerald-500 rounded-xs"></span>
                    <span>대지</span>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-gray-400 font-mono">
                    <span className="w-2.5 h-2.5 bg-indigo-600 rounded-xs"></span>
                    <span>선택동</span>
                  </div>
                </div>
              )}
              {/* View Switch Segmented Control */}
              <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-150">
                <button
                  type="button"
                  onClick={() => setViewMode('layout')}
                  className={`px-2 py-0.5 rounded text-[9.5px] font-extrabold transition-all cursor-pointer ${
                    viewMode === 'layout' ? 'bg-white text-indigo-700 shadow-xs' : 'text-gray-400 hover:text-gray-700'
                  }`}
                >
                  배치도
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('section')}
                  className={`px-2 py-0.5 rounded text-[9.5px] font-extrabold transition-all cursor-pointer ${
                    viewMode === 'section' ? 'bg-white text-indigo-700 shadow-xs' : 'text-gray-400 hover:text-gray-700'
                  }`}
                >
                  단면도
                </button>
              </div>
            </div>
          </div>

          {/* Preset Sample Selector */}
          <div className="bg-indigo-50/35 p-3 rounded-xl border border-indigo-100/50 space-y-2">
            <span className="text-[11px] font-bold text-indigo-950 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600 animate-pulse" />
              호조합 타워 기획 샘플 선택 (Pre-configured Tower Presets)
            </span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {TOWER_PRESETS.map((p) => {
                const isSelected = activePresetId === p.id;
                return (
                  <button
                    type="button"
                    key={p.id}
                    onClick={() => applyPreset(p.id)}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'bg-indigo-600 text-white border-indigo-700 shadow-sm ring-2 ring-indigo-500/25'
                        : 'bg-white hover:bg-slate-50 text-gray-700 border-gray-200'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="font-extrabold text-[11px] flex justify-between items-start gap-1">
                        <span className="leading-snug">{p.name}</span>
                        <span className={`text-[8.5px] px-1.5 py-0.5 rounded-full shrink-0 font-bold ${isSelected ? 'bg-indigo-500/80 text-white' : 'bg-slate-100 text-gray-600'}`}>
                          {p.unitsPerFloorLine}라인
                        </span>
                      </div>
                      <div className={`text-[9.5px] font-medium leading-relaxed ${isSelected ? 'text-indigo-100' : 'text-gray-400'}`}>
                        {p.desc}
                      </div>
                    </div>
                    
                    {/* Commercial characteristics tags */}
                    <div className="mt-3 pt-2 border-t border-dashed border-gray-150/10 flex flex-wrap items-center justify-between gap-1 text-[8.5px]">
                      <div className="flex flex-wrap gap-1">
                        {p.tag && (
                          <span className={`px-1.5 py-0.5 rounded font-extrabold tracking-tight border ${
                            isSelected 
                              ? 'bg-indigo-700/50 border-indigo-500 text-indigo-50' 
                              : p.tagColor || 'bg-slate-100 text-slate-700 border-slate-200'
                          }`}>
                            {p.tag}
                          </span>
                        )}
                        <span className={`px-1.5 py-0.5 rounded font-medium border ${
                          isSelected 
                            ? 'bg-indigo-700/30 border-indigo-500 text-indigo-200' 
                            : 'bg-slate-50 border-slate-150 text-gray-500'
                        }`}>
                          완판속도: <strong className={isSelected ? 'text-white' : 'text-gray-700'}>{p.speed}</strong>
                        </span>
                      </div>
                      <span className={`font-semibold shrink-0 ${isSelected ? 'text-indigo-200' : 'text-indigo-600'}`}>
                        {p.margin}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Redundant controls removed to avoid duplication and synchronize with the main architectural plan sidebar */}

          {/* SVG Site Layout Map or Cross-Section */}
          <div 
            className={`relative rounded-xl border overflow-hidden flex flex-col items-center justify-center p-2 transition-all duration-300 ${
              viewMode === 'layout' 
                ? 'bg-slate-100 border-gray-200' 
                : 'bg-[#0f172a] border-slate-700'
            }`} 
            style={{ height: '340px' }}
          >
            {viewMode === 'layout' ? (
              <>
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
                  <text x="36" y="52" fill="#475569" fontSize="7.5" fontWeight="bold">
                    📏 실스케일 대지: 가로 약 {Math.round(landInfo.widthM)}m × 세로 약 {Math.round(landInfo.heightM)}m | 건물(동): 가로 약 {Math.round(towerWidthM)}m × 세로 약 {Math.round(towerDepthM)}m
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
                    const corners = [
                      { x: pos.xM - towerWidthM / 2, y: pos.yM - towerDepthM / 2 },
                      { x: pos.xM + towerWidthM / 2, y: pos.yM - towerDepthM / 2 },
                      { x: pos.xM + towerWidthM / 2, y: pos.yM + towerDepthM / 2 },
                      { x: pos.xM - towerWidthM / 2, y: pos.yM + towerDepthM / 2 }
                    ];
                    const isTowerEncroaching = corners.some(corner => !isPointInPolygon(corner, landInfo.pointsM));

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

                        {/* Base footprint box of the tower */}
                        <rect
                          x={pos.x - blockWidth / 2}
                          y={pos.y - blockHeight / 2}
                          width={blockWidth}
                          height={blockHeight}
                          rx="4"
                          fill={isTowerEncroaching ? '#fef2f2' : isSelected ? '#fafafc' : '#ffffff'}
                          stroke={isTowerEncroaching ? '#ef4444' : isSelected ? '#4f46e5' : '#475569'}
                          strokeWidth={isSelected ? '2.5' : '1.5'}
                          className="transition-all hover:opacity-95 shadow-sm"
                        />

                        {/* Sub-units (호수별 분할 도면) */}
                        {!isTowerEncroaching && Array.from({ length: unitsPerFloorLine }).map((_, uIdx) => {
                          const unitSize = lineSizes[uIdx] || 84;
                          const unitColor = getUnitColorClass(unitSize);
                          const unitWidth = blockWidth / unitsPerFloorLine;
                          const subX = pos.x - blockWidth / 2 + uIdx * unitWidth;
                          const subY = pos.y - blockHeight / 2;
                          
                          return (
                            <g key={uIdx}>
                              {/* Sub unit block */}
                              <rect
                                x={subX + 1}
                                y={subY + 1}
                                width={unitWidth - 2}
                                height={blockHeight - 2}
                                rx="2"
                                className={`${unitColor.svgFill} ${unitColor.svgStroke} transition-all`}
                                strokeWidth="1"
                              />
                              {/* Separator line */}
                              {uIdx > 0 && (
                                <line
                                  x1={subX}
                                  y1={subY + 1}
                                  x2={subX}
                                  y2={subY + blockHeight - 1}
                                  stroke={isSelected ? '#cbd5e1' : '#e2e8f0'}
                                  strokeWidth="0.8"
                                  strokeDasharray="1.5 1.5"
                                />
                              )}
                              {/* Text labeling unit size in each sub-rect (if blockWidth is large enough) */}
                              {unitWidth > 16 && (
                                <text
                                  x={subX + unitWidth / 2}
                                  y={pos.y + 2.5}
                                  className={`${unitColor.svgText} font-mono font-extrabold`}
                                  fontSize="6.5"
                                  textAnchor="middle"
                                >
                                  {unitSize}
                                </text>
                              )}
                            </g>
                          );
                        })}

                        {/* Drag Handle Overlay icon at top right */}
                        {isSelected && (
                          <g transform={`translate(${pos.x + blockWidth / 2 - 8}, ${pos.y - blockHeight / 2 + 2})`}>
                            <rect width="6" height="6" rx="1.5" fill="#4f46e5" opacity="0.9" />
                            <circle cx="3" cy="3" r="1" fill="white" />
                          </g>
                        )}

                        {/* Tower label badge centered above tower */}
                        <g transform={`translate(${pos.x}, ${pos.y - blockHeight / 2 - 9})`}>
                          <rect
                            x="-19"
                            y="-6"
                            width="38"
                            height="12"
                            rx="6"
                            fill="white"
                            stroke={isTowerEncroaching ? '#ef4444' : isSelected ? '#4f46e5' : '#475569'}
                            strokeWidth="1.2"
                            className="shadow-sm"
                          />
                          <text
                            x="0"
                            y="2.5"
                            fill={isTowerEncroaching ? '#b91c1c' : isSelected ? '#4f46e5' : '#1e293b'}
                            fontSize="8"
                            fontWeight="black"
                            textAnchor="middle"
                          >
                            {pos.name}
                          </text>
                        </g>

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
              </>
            ) : (
              <>
                {/* Midnight blueprint grid background */}
                <div className="absolute inset-0 bg-[#0f172a] opacity-30 pointer-events-none" />
                
                {/* Section Diagram Top Header */}
                <div className="absolute top-2 left-2 right-2 flex justify-between items-center z-10 w-[95%]">
                  <div className="flex bg-slate-900/90 backdrop-blur-xs p-1 rounded-lg border border-slate-700 gap-1.5 shadow-xs text-[9px] font-bold text-gray-300">
                    <span className="text-slate-500 px-1 py-0.5">용도:</span>
                    <span className="flex items-center gap-1 px-1 py-0.5 text-amber-400 bg-amber-500/10 rounded">부대/상업(Podium)</span>
                    <span className="flex items-center gap-1 px-1 py-0.5 text-sky-400 bg-sky-500/10 rounded">아파트(Typical)</span>
                    <span className="flex items-center gap-1 px-1 py-0.5 text-slate-400 bg-slate-500/10 rounded">지하주차장(Parking)</span>
                  </div>
                  <div className="text-[9.5px] font-extrabold text-sky-400 bg-sky-950/80 border border-sky-800/80 px-2.5 py-0.5 rounded-lg flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 animate-pulse text-sky-400" />
                    <span>최고 높이:</span>
                    <strong className="font-mono text-white text-[11px]">{totalBuildingHeight.toFixed(1)}m</strong>
                  </div>
                </div>

                {/* Building Cross-Section SVG */}
                <svg
                  viewBox="0 0 450 280"
                  className="w-full h-full select-none z-1"
                >
                  {/* Grid Lines Pattern */}
                  <defs>
                    <pattern id="section-grid" width="10" height="10" patternUnits="userSpaceOnUse">
                      <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#1e293b" strokeWidth="0.5" opacity="0.4" />
                    </pattern>
                  </defs>
                  <rect x="0" y="0" width="450" height="280" fill="url(#section-grid)" opacity="0.3" />

                  {/* Ground Level Axis line */}
                  <line x1="10" y1={glY} x2="440" y2={glY} stroke="#334155" strokeWidth="2.5" />
                  <line x1="10" y1={glY} x2="80" y2={glY} stroke="#10b981" strokeWidth="3" opacity="0.8" />
                  <line x1="370" y1={glY} x2="440" y2={glY} stroke="#10b981" strokeWidth="3" opacity="0.8" />
                  <text x="25" y={glY - 6} fill="#10b981" fontSize="8" fontWeight="black" opacity="0.8">GL (0.0m)</text>

                  {/* Property Boundaries */}
                  <line x1="90" y1="20" x2="90" y2="265" stroke="#22c55e" strokeWidth="1" strokeDasharray="4 4" opacity="0.6" />
                  <line x1="360" y1="20" x2="360" y2="265" stroke="#22c55e" strokeWidth="1" strokeDasharray="4 4" opacity="0.6" />
                  <text x="94" y="32" fill="#22c55e" fontSize="7" fontWeight="bold" opacity="0.6">대지경계선</text>
                  <text x="356" y="32" fill="#22c55e" fontSize="7" fontWeight="bold" opacity="0.6" textAnchor="end">대지경계선</text>

                  {/* Left Elevation Scale Bar */}
                  <line x1="75" y1="20" x2="75" y2="260" stroke="#475569" strokeWidth="1" />
                  {floorElevations.map((f, fIdx) => {
                    const yTop = f.type === 'underground' 
                      ? glY + Math.abs(f.topElev) * scaleBelow 
                      : glY - f.topElev * scaleAbove;
                    const yBot = f.type === 'underground' 
                      ? glY + Math.abs(f.bottomElev) * scaleBelow 
                      : glY - f.bottomElev * scaleAbove;
                    const yMid = (yTop + yBot) / 2;

                    // Skip every second tick for text readability if there are more than 12 floors
                    const isTextVisible = floorElevations.length <= 12 || fIdx % 2 === 0 || f.name === 'PH' || f.name === 'B' + undergroundFloors || f.name === '1F';

                    return (
                      <g key={f.name} opacity={hoveredFloorName === f.name ? 1 : 0.8}>
                        {/* Scale Tick mark */}
                        <line x1="71" y1={yTop} x2="75" y2={yTop} stroke="#475569" strokeWidth="1" />
                        {isTextVisible && (
                          <>
                            {/* Floor Name */}
                            <text x="66" y={yMid + 2.5} fill="#94a3b8" fontSize="7.5" fontWeight="black" textAnchor="end">
                              {f.name}
                            </text>
                            {/* Elevation value */}
                            <text x="80" y={yTop + 2.5} fill="#64748b" fontSize="6.5" fontWeight="bold">
                              {f.topElev >= 0 ? '+' : ''}{f.topElev.toFixed(1)}m
                            </text>
                          </>
                        )}
                      </g>
                    );
                  })}

                  {/* 1. Underground Structure Box (Concrete Basement) */}
                  {undergroundFloors > 0 && (
                    <g>
                      {floorElevations.filter(f => f.type === 'underground').map((f) => {
                        const yTop = glY + Math.abs(f.topElev) * scaleBelow;
                        const yBot = glY + Math.abs(f.bottomElev) * scaleBelow;
                        const fHeightPx = yBot - yTop;
                        const isHovered = hoveredFloorName === f.name;

                        return (
                          <g 
                            key={f.name}
                            onMouseEnter={() => setHoveredFloorName(f.name)}
                            onMouseLeave={() => setHoveredFloorName(null)}
                            className="transition-all duration-150 cursor-help"
                          >
                            {/* Basement Concrete Block */}
                            <rect
                              x="100"
                              y={yTop}
                              width="250"
                              height={fHeightPx}
                              fill={isHovered ? '#334155' : '#1e293b'}
                              stroke="#475569"
                              strokeWidth="1.5"
                              opacity="0.95"
                            />
                            {/* Parking space guidelines inside basement */}
                            {Array.from({ length: 8 }).map((_, i) => (
                              <line 
                                key={i} 
                                x1={115 + i * 30} 
                                y1={yTop + 2} 
                                x2={115 + i * 30} 
                                y2={yBot - 2} 
                                stroke="#475569" 
                                strokeWidth="0.8" 
                                strokeDasharray="2 2" 
                                opacity="0.4"
                              />
                            ))}
                            {/* Small simple car shapes (little triangles / rects) */}
                            <rect x="122" y={yBot - 8} width="12" height="5" rx="1" fill="#475569" opacity="0.6" />
                            <circle cx="125" cy={yBot - 3} r="1.2" fill="#94a3b8" />
                            <circle cx="131" cy={yBot - 3} r="1.2" fill="#94a3b8" />

                            <rect x="242" y={yBot - 8} width="12" height="5" rx="1" fill="#475569" opacity="0.6" />
                            <circle cx="245" cy={yBot - 3} r="1.2" fill="#94a3b8" />
                            <circle cx="251" cy={yBot - 3} r="1.2" fill="#94a3b8" />

                            {/* Floor label centered */}
                            <text 
                              x="225" 
                              y={(yTop + yBot) / 2 + 3} 
                              fill={isHovered ? '#38bdf8' : '#64748b'} 
                              fontSize="8" 
                              fontWeight="bold" 
                              textAnchor="middle"
                            >
                              {f.name} 주차장 및 설비실 (층고 {f.height}m)
                            </text>
                          </g>
                        );
                      })}
                    </g>
                  )}

                  {/* 2. Podium Block (Commercial / Facilities) */}
                  {podiumFloors > 0 && (
                    <g>
                      {floorElevations.filter(f => f.type === 'podium').map((f) => {
                        const yTop = glY - f.topElev * scaleAbove;
                        const yBot = glY - f.bottomElev * scaleAbove;
                        const fHeightPx = yBot - yTop;
                        const isHovered = hoveredFloorName === f.name;

                        return (
                          <g 
                            key={f.name}
                            onMouseEnter={() => setHoveredFloorName(f.name)}
                            onMouseLeave={() => setHoveredFloorName(null)}
                            className="transition-all duration-150 cursor-help"
                          >
                            {/* Commercial Podium block */}
                            <rect
                              x="100"
                              y={yTop}
                              width="250"
                              height={fHeightPx}
                              fill={isHovered ? '#78350f' : '#3c1e08'}
                              stroke="#f59e0b"
                              strokeWidth="1.5"
                              opacity="0.9"
                            />
                            {/* Inner columns representing shopping center pillars */}
                            {Array.from({ length: 6 }).map((_, i) => (
                              <line 
                                key={i} 
                                x1={115 + i * 40} 
                                y1={yTop + 1} 
                                x2={115 + i * 40} 
                                y2={yBot - 1} 
                                stroke="#f59e0b" 
                                strokeWidth="0.8" 
                                opacity="0.25"
                              />
                            ))}
                            <text 
                              x="225" 
                              y={(yTop + yBot) / 2 + 3} 
                              fill={isHovered ? '#fbbf24' : '#d97706'} 
                              fontSize="8" 
                              fontWeight="extrabold" 
                              textAnchor="middle"
                            >
                              🛍️ {f.name} 근린생활 및 커뮤니티 (층고 {f.height}m)
                            </text>
                          </g>
                        );
                      })}
                    </g>
                  )}

                  {/* 3. Tower Blocks (Typical Floors) */}
                  <g>
                    {sectionTowers.map((t) => {
                      return (
                        <g key={t.name}>
                          {/* Tower identifier background shaft */}
                          <rect 
                            x={t.xLeft} 
                            y={glY - maxAboveElev * scaleAbove} 
                            width={t.width} 
                            height={maxAboveElev * scaleAbove - (podiumFloors > 0 ? (floorElevations.find(f => f.name === `${podiumFloors}F`)?.topElev || 0) * scaleAbove : 0)} 
                            fill="#0f172a" 
                            stroke="#1e293b" 
                            strokeWidth="0.5" 
                            opacity="0.1"
                          />

                          {/* Stacking Typical Floors */}
                          {floorElevations.filter(f => f.type === 'typical').map((f) => {
                            const yTop = glY - f.topElev * scaleAbove;
                            const yBot = glY - f.bottomElev * scaleAbove;
                            const fHeightPx = yBot - yTop;
                            const isHovered = hoveredFloorName === f.name;

                            return (
                              <g 
                                key={`${t.name}-${f.name}`}
                                onMouseEnter={() => setHoveredFloorName(f.name)}
                                onMouseLeave={() => setHoveredFloorName(null)}
                                className="transition-all duration-150 cursor-help"
                              >
                                {/* Floor block for this tower */}
                                <rect
                                  x={t.xLeft}
                                  y={yTop}
                                  width={t.width}
                                  height={fHeightPx}
                                  fill={isHovered ? '#0c4a6e' : '#032840'}
                                  stroke="#0ea5e9"
                                  strokeWidth="1"
                                  opacity="0.9"
                                />

                                {/* EV Core shaft in middle */}
                                <rect 
                                  x={t.xCenter - 7} 
                                  y={yTop} 
                                  width="14" 
                                  height={fHeightPx} 
                                  fill="#1e293b" 
                                  stroke="#334155" 
                                  strokeWidth="0.5" 
                                  opacity="0.8" 
                                />
                                <text x={t.xCenter} y={yTop + fHeightPx/2 + 2} fill="#38bdf8" fontSize="5.5" fontWeight="bold" textAnchor="middle">
                                  EV
                                </text>

                                {/* Unit lines partitions */}
                                {unitsPerFloorLine > 1 && Array.from({ length: unitsPerFloorLine }).map((_, uIdx) => {
                                  const unitW = (t.width - 14) / unitsPerFloorLine;
                                  const isLeftOfCore = uIdx < unitsPerFloorLine / 2;
                                  const uX = isLeftOfCore 
                                    ? t.xLeft + uIdx * unitW
                                    : t.xCenter + 7 + (uIdx - Math.ceil(unitsPerFloorLine/2)) * unitW;

                                  if (uX >= t.xLeft && uX + unitW <= t.xLeft + t.width && (uX < t.xCenter - 7 || uX >= t.xCenter + 6)) {
                                    return (
                                      <g key={uIdx}>
                                        {/* Outer partition lines */}
                                        <line x1={uX} y1={yTop} x2={uX} y2={yBot} stroke="#38bdf8" strokeWidth="0.4" opacity="0.3" />
                                        {/* Little window block */}
                                        <rect x={uX + 3} y={yTop + 2.5} width={Math.max(3, unitW - 6)} height={fHeightPx - 5} rx="0.5" fill="#bae6fd" opacity="0.45" />
                                      </g>
                                    );
                                  }
                                  return null;
                                })}

                                {/* Tiny text indicating floor & tower on first/top floor */}
                                {(f.name === `${aboveGroundFloors}F` || f.name === `${podiumFloors + 1}F`) && (
                                  <text x={t.xCenter} y={yTop - 1.5} fill="#38bdf8" fontSize="6.5" fontWeight="bold" textAnchor="middle">
                                    {t.name}
                                  </text>
                                )}
                              </g>
                            );
                          })}
                        </g>
                      );
                    })}
                  </g>

                  {/* 4. Roof / Parapet / Heliport top decoration */}
                  {floorElevations.filter(f => f.type === 'roof').map((f) => {
                    const yTop = glY - f.topElev * scaleAbove;
                    const yBot = glY - f.bottomElev * scaleAbove;

                    return (
                      <g key={f.name}>
                        {sectionTowers.map(t => (
                          <g key={t.name}>
                            {/* Parapet */}
                            <path 
                              d={`M ${t.xLeft} ${yBot} L ${t.xLeft} ${yTop} L ${t.xLeft + 4} ${yTop} L ${t.xLeft + 4} ${yBot}`} 
                              fill="#64748b" 
                            />
                            <path 
                              d={`M ${t.xLeft + t.width} ${yBot} L ${t.xLeft + t.width} ${yTop} L ${t.xLeft + t.width - 4} ${yTop} L ${t.xLeft + t.width - 4} ${yBot}`} 
                              fill="#64748b" 
                            />
                            {/* Heliport core in the middle of each tower roof */}
                            <rect 
                              x={t.xCenter - 15} 
                              y={yBot - 4} 
                              width="30" 
                              height="4" 
                              fill="#475569" 
                              stroke="#64748b" 
                              strokeWidth="0.5" 
                            />
                            <text x={t.xCenter} y={yBot - 1} fill="#ffffff" fontSize="4.5" fontWeight="black" textAnchor="middle">
                              H
                            </text>
                          </g>
                        ))}
                      </g>
                    );
                  })}

                  {/* 5. Sunlight Angle Line (사선제한) from Right boundary */}
                  <line 
                    x1="360" 
                    y1={glY} 
                    x2={360 - maxAboveElev * 1.0} 
                    y2={glY - maxAboveElev * scaleAbove} 
                    stroke="#ef4444" 
                    strokeWidth="1.2" 
                    strokeDasharray="3 3" 
                    opacity="0.7" 
                  />
                  <text 
                    x="330" 
                    y={glY - 20} 
                    fill="#ef4444" 
                    fontSize="7.5" 
                    fontWeight="bold" 
                    transform={`rotate(${-Math.atan2(scaleAbove, 1) * (180/Math.PI)}, 330, ${glY - 20})`}
                    opacity="0.8"
                  >
                    일조사선 한도선 (D:H = 1:2)
                  </text>

                  {/* 6. Spacing Dimension Lines */}
                  {/* Tower Separator Line (if towerCount >= 2) */}
                  {towerCount >= 2 && (
                    <g>
                      {(() => {
                        const t1Right = sectionTowers[0].xLeft + sectionTowers[0].width;
                        const t2Left = sectionTowers[1].xLeft;
                        const dimY = glY - 45;
                        const isSeparationOk = buildingSeparationDistance >= requiredSeparationDistance;

                        return (
                          <g>
                            <line x1={t1Right} y1={dimY} x2={t2Left} y2={dimY} stroke={isSeparationOk ? '#38bdf8' : '#f87171'} strokeWidth="1" strokeDasharray="2 2" />
                            <polygon points={`${t1Right},${dimY} ${t1Right + 4},${dimY - 2.5} ${t1Right + 4},${dimY + 2.5}`} fill={isSeparationOk ? '#38bdf8' : '#f87171'} />
                            <polygon points={`${t2Left},${dimY} ${t2Left - 4},${dimY - 2.5} ${t2Left - 4},${dimY + 2.5}`} fill={isSeparationOk ? '#38bdf8' : '#f87171'} />
                            {/* Label Box */}
                            <rect x={(t1Right + t2Left)/2 - 32} y={dimY - 6} width="64" height="12" fill="#0f172a" rx="2" stroke={isSeparationOk ? '#0284c7' : '#ef4444'} strokeWidth="0.5" />
                            <text x={(t1Right + t2Left)/2} y={dimY + 2.5} fill={isSeparationOk ? '#38bdf8' : '#f87171'} fontSize="7" fontWeight="black" textAnchor="middle">
                              인동 {buildingSeparationDistance}m ({isSeparationOk ? '합격' : '부족'})
                            </text>
                          </g>
                        );
                      })()}
                    </g>
                  )}

                  {/* Boundary Clearance Dimension Line */}
                  {(() => {
                    const tLast = sectionTowers[sectionTowers.length - 1];
                    const tRight = tLast.xLeft + tLast.width;
                    const boundX = 360;
                    const dimY = glY - 20;
                    const isBoundaryOk = boundarySeparationDistance >= requiredBoundaryDistance;

                    return (
                      <g>
                        <line x1={tRight} y1={dimY} x2={boundX} y2={dimY} stroke={isBoundaryOk ? '#4ade80' : '#f87171'} strokeWidth="1" strokeDasharray="2 2" />
                        <polygon points={`${tRight},${dimY} ${tRight + 4},${dimY - 2.5} ${tRight + 4},${dimY + 2.5}`} fill={isBoundaryOk ? '#4ade80' : '#f87171'} />
                        <polygon points={`${boundX},${dimY} ${boundX - 4},${dimY - 2.5} ${boundX - 4},${dimY + 2.5}`} fill={isBoundaryOk ? '#4ade80' : '#f87171'} />
                        {/* Label Box */}
                        <rect x={(tRight + boundX)/2 - 32} y={dimY - 6} width="64" height="12" fill="#0f172a" rx="2" stroke={isBoundaryOk ? '#22c55e' : '#ef4444'} strokeWidth="0.5" />
                        <text x={(tRight + boundX)/2} y={dimY + 2.5} fill={isBoundaryOk ? '#4ade80' : '#f87171'} fontSize="7" fontWeight="black" textAnchor="middle">
                          이격 {boundarySeparationDistance}m ({isBoundaryOk ? '합격' : '부족'})
                        </text>
                      </g>
                    );
                  })()}
                </svg>

                {/* Dynamic Interactive Section HUD */}
                <div className="absolute bottom-2 left-2 right-2 flex justify-between items-center text-[10px] bg-slate-900/95 backdrop-blur-xs p-2 rounded-lg border border-slate-700/80 text-gray-300 w-[95%] z-10">
                  {hoveredFloorName ? (
                    (() => {
                      const f = floorElevations.find(item => item.name === hoveredFloorName);
                      if (!f) return <span>마우스를 층 위로 올리면 상세 정보가 제공됩니다.</span>;
                      
                      let useDesc = '';
                      let subInfo = '';
                      if (f.type === 'underground') {
                        useDesc = `지하 주차장 및 부속 설비 (Concrete Basement)`;
                        subInfo = `예상 면적: 약 ${(landArea * 0.75).toLocaleString()}㎡`;
                      } else if (f.type === 'podium') {
                        useDesc = `근린생활시설 및 커뮤니티 (Commercial Retail/Podium)`;
                        subInfo = `예상 면적: 약 ${(landArea * (currentLand?.baselineBCR || 60) / 100).toLocaleString()}㎡`;
                      } else if (f.type === 'typical') {
                        useDesc = `공동주택 (Typical Residential Apartment)`;
                        subInfo = `층당 세대수: ${towerCount * unitsPerFloorLine}세대 | 예상 면적: 약 ${(towerCount * towerFootprintM2).toFixed(1)}㎡`;
                      } else {
                        useDesc = `옥탑 조경 및 엘리베이터 기계실 (Roof Parapet)`;
                        subInfo = `높이 제한 한계선 내 완벽 수용`;
                      }

                      return (
                        <div className="flex justify-between items-center w-full">
                          <div className="flex items-center gap-1.5">
                            <span className="bg-sky-500/20 text-sky-400 px-1.5 py-0.5 rounded-xs font-black text-[11px]">{f.name}</span>
                            <span className="text-white font-extrabold">{useDesc}</span>
                          </div>
                          <div className="text-slate-400 text-[9px] font-mono">
                            {subInfo} | 층고: <strong className="text-sky-300">{f.height}m</strong> (EL {f.bottomElev.toFixed(1)}m ~ {f.topElev.toFixed(1)}m)
                          </div>
                        </div>
                      );
                    })()
                  ) : (
                    <div className="flex justify-between items-center w-full">
                      <span className="flex items-center gap-1 text-slate-400">
                        <Info className="w-3.5 h-3.5 text-sky-400" />
                        단면도 상의 각 층에 마우스를 올려 실시간 층고 및 층별 설계 세부 내역을 확인해 보세요.
                      </span>
                      <span className="text-[9px] text-emerald-400 font-bold bg-emerald-950/50 px-1.5 py-0.5 rounded-sm border border-emerald-900/50">
                        실시간 스케일 연동형
                      </span>
                    </div>
                  )}
                </div>
              </>
            )}
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

          {/* Interactive Line Customizer & Core breakdown summary */}
          <div className="bg-slate-50/70 p-3.5 rounded-xl border border-gray-200 space-y-3.5 text-[10.5px]">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
              <div className="space-y-0.5">
                <span className="font-extrabold text-gray-800 text-[11.5px] flex items-center gap-1.5">
                  <Sliders className="w-4 h-4 text-indigo-600" />
                  동별 라인 평형 개별 커스텀 (Floor Plan Line Designer)
                </span>
                <span className="text-gray-400 text-[10px] block">
                  원하는 호수(라인)의 평형 크기를 클릭하여 서로 다른 구성으로 동플랜을 설계하세요.
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <label className="flex items-center gap-1 cursor-pointer select-none bg-indigo-50 text-indigo-950 px-2 py-0.5 rounded-md border border-indigo-100/70 font-semibold text-[10px]">
                  <input
                    type="checkbox"
                    checked={autoSync}
                    onChange={(e) => setAutoSync(e.target.checked)}
                    className="w-3 h-3 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 cursor-pointer"
                  />
                  <span>수지분석 실시간 자동 동기화</span>
                </label>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {Array.from({ length: unitsPerFloorLine }).map((_, idx) => {
                const lineNum = idx + 1;
                const currentSize = lineSizes[idx] || 84;
                const lineConfig = lineConfigs[lineNum] || { name: '표준 84㎡타입', sizeM2: 84 };
                const designColor = getUnitColorClass(currentSize);

                return (
                  <div key={lineNum} className="bg-white p-2.5 rounded-lg border border-gray-150 space-y-1.5 flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-gray-700">{lineNum}호 라인</span>
                      <span className={`w-2 h-2 rounded-full ${designColor.badge}`} title={`${currentSize}㎡`}></span>
                    </div>

                    <select
                      value={currentSize}
                      onChange={(e) => {
                        const newSize = Number(e.target.value);
                        setLineSizes(prev => {
                          const next = [...prev];
                          next[idx] = newSize;
                          return next;
                        });
                        setActivePresetId('custom');
                      }}
                      className="w-full text-[10.5px] font-bold bg-slate-50 border border-gray-250 rounded px-1.5 py-1 text-gray-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                    >
                      <option value={30}>30㎡ (임대 원룸 / 9평)</option>
                      <option value={39}>39㎡ (초소형 투룸 / 12평)</option>
                      <option value={49}>49㎡ (소형 투룸 / 15평)</option>
                      <option value={59}>59㎡ (소형 아파트 / 18평)</option>
                      <option value={84}>84㎡ (국민평형 / 25평)</option>
                      <option value={114}>114㎡ (중대형 랜드마크 / 34평)</option>
                      <option value={155}>155㎡ (하이엔드 펜트 / 47평)</option>
                    </select>

                    <div className="text-[9.5px] text-gray-400 font-medium text-center bg-slate-50 rounded py-0.5 border border-slate-100">
                      평당 분양가 약 {lineConfig.salesPricePerPyung || 4500}만원
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-2 border-t border-gray-200/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-gray-500">
                <span className="font-semibold text-gray-600">🧩 실시간 배치 라인업:</span>
                {Object.entries(lineConfigs).map(([lineNum, configVal]) => {
                  const lineConfig = configVal as any;
                  const designColor = getUnitColorClass(lineConfig?.sizeM2 || 84);
                  return (
                    <span key={lineNum} className="inline-flex items-center gap-1 text-[10px]">
                      <span className={`w-1.5 h-1.5 rounded-full ${designColor.badge}`}></span>
                      <strong>{lineNum}호:</strong> {lineConfig?.name?.split('(')[0] || '공동주택'}
                    </span>
                  );
                })}
              </div>

              {!autoSync && (
                <button
                  type="button"
                  onClick={() => syncCountsToParent(lineSizes)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] px-3 py-1.5 rounded shadow-sm flex items-center gap-1.5 cursor-pointer transition-colors self-end"
                >
                  <RefreshCw className="w-3 h-3 animate-spin" style={{ animationDuration: '3s' }} />
                  현재 구성을 사업 수지분석 모델에 즉시 적용
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
