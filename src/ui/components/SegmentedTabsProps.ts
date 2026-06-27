// Un tab de un control segmentado. `count` es opcional (muestra un contador discreto).
export interface SegmentedTab<T extends string> {
  value: T;
  label: string;
  count?: number;
}

export interface SegmentedTabsProps<T extends string> {
  tabs: SegmentedTab<T>[];
  value: T;
  onChange: (value: T) => void;
}
