type ToukenState = "toku" | "kiwame";

type ToukenType =
  | "tantou"
  | "wakizashi"
  | "uchigatana_R3"
  | "uchigatana_R4"
  | "tachi"
  | "ootachi"
  | "yari"
  | "naginata";

/**
 * Root EXP data structure
 */
type ExpData = {
  version: string;

  base: {
    /**
     * Max level for non-kiwame (特)
     */
    maxLevel: 99;

    /**
     * Cumulative EXP to reach level L.
     * Index = level
     * cumExp[1] === 0
     */
    cumExp: number[];
  };

  kiwame: {
    /**
     * Max level for kiwame (極)
     */
    maxLevel: 199;

    shared: {
      /**
       * Cumulative EXP for Lv1–Lv34 (shared by all types).
       * Index 0 => Lv1
       * Length = 34
       */
      prefix_1_34_cumExp: number[];

      /**
       * Shared cumulative EXP delta from Lv100.
       * Index 0 => Lv100 (0)
       * Index 1 => Lv101
       * ...
       * Index 99 => Lv199
       * Length = 100
       */
      post_100_199_cumExp_from100: number[];
    };

    /**
     * Kiwame EXP curves by touken type (strict keys)
     */
    variants: {
      tantou: KiwameVariant;
      wakizashi: KiwameVariant;
      uchigatana_R3: KiwameVariant;
      uchigatana_R4: KiwameVariant;
      tachi: KiwameVariant;
      ootachi: KiwameVariant;
      yari: KiwameVariant;
      naginata: KiwameVariant;
    };
  };
};

/**
 * Per-kiwame-type EXP data
 */
type KiwameVariant = {
  /**
   * Absolute cumulative EXP at Lv35–Lv99.
   * Index 0 => Lv35
   * Index 64 => Lv99
   * Length = 65
   */
  mid_35_99_cumExp: number[];

  /**
   * Base (特) level required to unlock kiwame training.
   * e.g. tantou 60, wakizashi/yari/naginata 65,
   * uchigatana 70, tachi 75, ootachi 80
   */
  trainingUnlockBaseLevel: number;

  /**
   * Absolute cumulative EXP at Lv100 for this type.
   * Used as the offset for shared Lv100–199 EXP.
   */
  cumExpAt100: number;
};

export type { ToukenState, ToukenType, ExpData, KiwameVariant };
