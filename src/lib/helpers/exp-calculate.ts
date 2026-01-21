import type { ToukenState, ToukenType, ExpData } from "../types/touken";

function assertLevelInRange(level: number, min: number, max: number) {
  if (!Number.isInteger(level) || level < min || level > max) {
    throw new Error(`level must be integer in [${min}, ${max}], got ${level}`);
  }
}

function assertKiwameType(type: ToukenType | undefined): asserts type is ToukenType {
  if (!type) throw new Error("kiwameType is required for stage=kiwame");
}

export function getCumExpToLevel(
  data: ExpData,
  toukenState: ToukenState,
  level: number,
  kiwameType?: ToukenType
): number {
  if (toukenState === "toku") {
    assertLevelInRange(level, 1, data.base.maxLevel);
    // cumExp[1] = 0
    return data.base.cumExp[level] ?? 0;
  }

  // kiwame
  assertLevelInRange(level, 1, data.kiwame.maxLevel);
  assertKiwameType(kiwameType);

  if (level <= 34) {
    return data.kiwame.shared.prefix_1_34_cumExp[level - 1];
  }

  if (level <= 99) {
    const mid = data.kiwame.variants[kiwameType].mid_35_99_cumExp;
    return mid[level - 35];
  }

  // 100..199
  const at100 = data.kiwame.variants[kiwameType].cumExpAt100;
  const delta = data.kiwame.shared.post_100_199_cumExp_from100[level - 100];
  return at100 + delta;
}

export function getExpBetweenLevels(
  data: ExpData,
  toukenState: ToukenState,
  currentLevel: number,
  targetLevel: number,
  kiwameType?: ToukenType
): number {
  if (targetLevel < currentLevel) return 0;

  const cur = getCumExpToLevel(data, toukenState, currentLevel, kiwameType);
  const tar = getCumExpToLevel(data, toukenState, targetLevel, kiwameType);
  return tar - cur;
}

export function getExpToTargetLevel(
  data: ExpData,
  toukenState: ToukenState,
  targetLevel: number,
  kiwameType?: ToukenType
): number {
  return getCumExpToLevel(data, toukenState, targetLevel, kiwameType);
}