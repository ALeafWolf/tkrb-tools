import { useState, useEffect, useMemo, useCallback, memo } from "react";
import { useTranslation } from "react-i18next";
import type { ToukenState, ToukenType, ExpData } from "../../lib/types/touken";
import {
  getExpBetweenLevels,
  getCumExpToLevel,
} from "../../lib/helpers";
import { useLocalStorageObject } from "../../lib/hooks";
import { Button } from "../Shared/Button";
import { ContentContainer } from "../Shared/ContentContainer";
import { Select } from "../Shared/Select";

const TOUKEN_TYPES: ToukenType[] = [
  "tantou",
  "wakizashi",
  "uchigatana_R3",
  "uchigatana_R4",
  "tachi",
  "ootachi",
  "yari",
  "naginata",
];

const STORAGE_KEY = "expCalculator";

type StoredInputs = {
  currentState: ToukenState;
  targetState: ToukenState;
  toukenType: ToukenType | null;
  currentLevel: number;
  targetLevel: number;
};

const DEFAULT_INPUTS: StoredInputs = {
  currentState: "toku",
  targetState: "kiwame",
  toukenType: null,
  currentLevel: 1,
  targetLevel: 1,
};

function isToukenState(value: unknown): value is ToukenState {
  return value === "toku" || value === "kiwame";
}

function isToukenType(value: unknown): value is ToukenType {
  return typeof value === "string" && TOUKEN_TYPES.includes(value as ToukenType);
}

function parseStoredInputs(raw: unknown): StoredInputs {
  const parsed = raw as Partial<StoredInputs> | null;
  if (!parsed || typeof parsed !== "object") return DEFAULT_INPUTS;

  const next: StoredInputs = { ...DEFAULT_INPUTS };

  if (isToukenState(parsed.currentState)) {
    next.currentState = parsed.currentState;
  }

  if (isToukenState(parsed.targetState)) {
    next.targetState = parsed.targetState;
  }

  if (parsed.toukenType == null) {
    next.toukenType = null;
  } else if (isToukenType(parsed.toukenType)) {
    next.toukenType = parsed.toukenType;
  }

  if (typeof parsed.currentLevel === "number" && Number.isFinite(parsed.currentLevel) && parsed.currentLevel >= 1) {
    next.currentLevel = parsed.currentLevel;
  }

  if (typeof parsed.targetLevel === "number" && Number.isFinite(parsed.targetLevel) && parsed.targetLevel >= 1) {
    next.targetLevel = parsed.targetLevel;
  }

  return next;
}

interface StateRadioGroupProps {
  value: ToukenState;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  t: (key: string) => string;
}

const StateRadioGroup = memo(function StateRadioGroup({
  value,
  onChange,
  t,
}: StateRadioGroupProps) {
  return (
    <div className="flex gap-4">
      <label className="flex items-center">
        <input
          type="radio"
          value="toku"
          checked={value === "toku"}
          onChange={onChange}
          className="mr-2"
        />
        <span>{t("states.toku")}</span>
      </label>
      <label className="flex items-center">
        <input
          type="radio"
          value="kiwame"
          checked={value === "kiwame"}
          onChange={onChange}
          className="mr-2"
        />
        <span>{t("states.kiwame")}</span>
      </label>
    </div>
  );
});

export default function ExpCalculator() {
  const { t, i18n } = useTranslation();

  const formatNumber = useCallback(
    (num: number): string => {
      return new Intl.NumberFormat(i18n.language).format(num);
    },
    [i18n.language]
  );

  const [expData, setExpData] = useState<ExpData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { initialValue: initialInputs, save, remove } = useLocalStorageObject(
    STORAGE_KEY,
    DEFAULT_INPUTS,
    parseStoredInputs,
  );

  const [currentState, setCurrentState] = useState<ToukenState>(
    () => initialInputs.currentState,
  );
  const [toukenType, setToukenType] = useState<ToukenType | null>(
    () => initialInputs.toukenType,
  );
  const [currentLevel, setCurrentLevel] = useState<number | "">(
    () => initialInputs.currentLevel,
  );

  const [targetState, setTargetState] = useState<ToukenState>(
    () => initialInputs.targetState,
  );
  const [targetLevel, setTargetLevel] = useState<number | "">(
    () => initialInputs.targetLevel,
  );

  const [result, setResult] = useState<{
    value: number;
    kind: "delta" | "requiredStoredCumulative";
  } | null>(null);

  const [validationErrors, setValidationErrors] = useState<{
    currentLevel?: boolean;
    targetLevel?: boolean;
    type?: boolean;
    messages?: Array<{ key: string; params?: Record<string, string | number> }>;
  }>({});

  // Load exp.json on mount
  useEffect(() => {
    async function loadExpData() {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch("/exp.json");
        if (!response.ok) {
          throw new Error(t("errors.failedToLoadExpData"));
        }
        const data: ExpData = await response.json();
        setExpData(data);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : t("errors.failedToLoadExpData"),
        );
      } finally {
        setLoading(false);
      }
    }

    loadExpData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist user inputs to localStorage
  useEffect(() => {
    if (typeof currentLevel !== "number" || typeof targetLevel !== "number") {
      return;
    }
    save({
      currentState,
      targetState,
      toukenType,
      currentLevel,
      targetLevel,
    });
  }, [save, currentState, targetState, toukenType, currentLevel, targetLevel]);


  function validateInputs(): {
    isValid: boolean;
    errors: {
      currentLevel?: boolean;
      targetLevel?: boolean;
      type?: boolean;
      messages: Array<{ key: string; params?: Record<string, string | number> }>;
    };
  } {
    const errors: {
      currentLevel?: boolean;
      targetLevel?: boolean;
      type?: boolean;
      messages: Array<{ key: string; params?: Record<string, string | number> }>;
    } = {
      messages: [],
    };

    if (!expData) {
      errors.messages.push({ key: "errors.expDataNotLoaded" });
      return { isValid: false, errors };
    }

    if ((currentState === "kiwame" || targetState === "kiwame") && !toukenType) {
      errors.type = true;
      errors.messages.push({ key: "errors.selectTypeCurrentKiwame" });
    }

    const currentMaxLevel = currentState === "toku" ? 99 : 199;
    const targetMaxLevel = targetState === "toku" ? 99 : 199;

    // Check current level - allow empty string during typing
    if (currentLevel === "" || typeof currentLevel !== "number") {
      errors.currentLevel = true;
      errors.messages.push({
        key: "errors.currentLevelRange",
        params: { max: currentMaxLevel },
      });
    } else if (currentLevel < 1 || currentLevel > currentMaxLevel) {
      errors.currentLevel = true;
      errors.messages.push({
        key: "errors.currentLevelRange",
        params: { max: currentMaxLevel },
      });
    }

    // Check target level - allow empty string during typing
    if (targetLevel === "" || typeof targetLevel !== "number") {
      errors.targetLevel = true;
      errors.messages.push({
        key: "errors.targetLevelRange",
        params: { max: targetMaxLevel },
      });
    } else if (targetLevel < 1 || targetLevel > targetMaxLevel) {
      errors.targetLevel = true;
      errors.messages.push({
        key: "errors.targetLevelRange",
        params: { max: targetMaxLevel },
      });
    }

    // Check for invalid state transitions
    if (currentState === "kiwame" && targetState === "toku") {
      errors.messages.push({ key: "errors.cannotDowngrade" });
    }

    return {
      isValid: errors.messages.length === 0,
      errors,
    };
  }

  function handleCalculate() {
    const validation = validateInputs();
    if (!validation.isValid) {
      setValidationErrors(validation.errors);
      setResult(null);
      setError(null);
      return;
    }

    // Clear validation errors if validation passes
    setValidationErrors({});

    if (!expData) return;

    // Ensure levels are numbers (not empty strings) before calculation
    const currentLevelNum =
      typeof currentLevel === "number" ? currentLevel : 1;
    const targetLevelNum = typeof targetLevel === "number" ? targetLevel : 1;

    try {
      setError(null);

      let value = 0;
      let kind: "delta" | "requiredStoredCumulative" = "delta";

      if (currentState === targetState) {
        // Same state calculation
        if (currentState === "toku") {
          value = getExpBetweenLevels(
            expData,
            "toku",
            currentLevelNum,
            targetLevelNum,
          );
        } else {
          // kiwame to kiwame (types should match, use toukenType)
          value = getExpBetweenLevels(
            expData,
            "kiwame",
            currentLevelNum,
            targetLevelNum,
            toukenType || undefined,
          );
        }
      } else {
        // Cross-state: toku -> kiwame
        // Show required stored cumulative EXP (wiki "特累積レベリング必要参考値(極)"):
        // baseCumExp(trainingUnlockBaseLevel) + kiwameCumExp(targetLevel)
        const expFromKiwameLv1ToTarget = getCumExpToLevel(
          expData,
          "kiwame",
          targetLevelNum,
          toukenType || undefined,
        );

        const trainingUnlockLevel =
          expData.kiwame.variants[toukenType!].trainingUnlockBaseLevel;
        const trainingUnlockLevelExp = getCumExpToLevel(
          expData,
          "toku",
          trainingUnlockLevel,
        );
        value = trainingUnlockLevelExp + expFromKiwameLv1ToTarget;
        kind = "requiredStoredCumulative";
      }

      setResult({ value, kind });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t("errors.calculationFailed"),
      );
      setResult(null);
    }
  }

  function handleReset() {
    setCurrentState("toku");
    setToukenType(null);
    setCurrentLevel(1);
    setTargetState("kiwame");
    setTargetLevel(1);
    setResult(null);
    setValidationErrors({});
    setError(null);
    remove();
  }

  // Memoize options arrays to prevent recreation on every render
  // Only include placeholder option when no type is selected
  const typeOptions = useMemo(
    () => [
      ...(toukenType === null ? [{ value: "", label: t("common.selectType") }] : []),
      ...TOUKEN_TYPES.map((type) => ({
        value: type,
        label: t(`types.${type}`),
      })),
    ],
    [toukenType, t]
  );

  // Create reusable level change handler
  const createLevelChangeHandler = useCallback(
    (setter: (value: number | "") => void) =>
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        if (val === "") {
          setter("");
        } else {
          const num = parseInt(val);
          setter(isNaN(num) ? "" : num);
        }
        // Clear validation errors when user starts typing
        setValidationErrors((prev) =>
          prev.messages && prev.messages.length > 0 ? {} : prev,
        );
      },
    [],
  );

  // Handlers for state changes with type reset logic
  const handleCurrentStateChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newState = e.target.value as ToukenState;
      setCurrentState(newState);
      if (newState === "toku" && targetState === "toku") {
        setToukenType(null);
      } else if (newState === "kiwame" && !toukenType) {
        setToukenType("tantou");
      }
    },
    [targetState, toukenType]
  );

  const handleTargetStateChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newState = e.target.value as ToukenState;
      setTargetState(newState);
      if (newState === "toku" && currentState === "toku") {
        setToukenType(null);
      } else if (newState === "kiwame" && !toukenType) {
        setToukenType("tantou");
      }
    },
    [currentState, toukenType]
  );

  const isCalculateDisabled = loading || !expData;

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <h2 className="mb-8 text-center text-3xl font-bold">
        {t("calculator.title")}
      </h2>

      {loading && (
        <div className="py-8 text-center text-gray-600">
          {t("common.loading")}
        </div>
      )}

      {error && !loading && (
        <div className="px-4 py-3 text-red-700">
          {error}
        </div>
      )}

      {!loading && expData && (
        <div className="flex flex-col gap-4">
          <ContentContainer className="space-y-4">
            {/* Row 1 - type, only when kiwame is involved */}
            {(currentState === "kiwame" || targetState === "kiwame") && (
              <Select
                label={t("calculator.type")}
                value={toukenType || ""}
                options={typeOptions}
                onChange={(value) => {
                  setToukenType(value === "" ? null : (value as ToukenType));
                  if (validationErrors.type) {
                    setValidationErrors((prev) => ({
                      ...prev,
                      type: false,
                      messages: prev.messages?.filter(
                        (msg) => msg.key !== "errors.selectTypeCurrentKiwame"
                      ),
                    }));
                  }
                }}
                placeholder={t("common.selectType")}
                className="w-full"
                hasError={validationErrors.type}
              />
            )}

            {/* Row 2 - state: current → target */}
            <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  {t("calculator.currentState")}
                </label>
                <StateRadioGroup
                  value={currentState}
                  onChange={handleCurrentStateChange}
                  t={t}
                />
              </div>
              <span className="pt-6 text-center">→</span>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  {t("calculator.targetState")}
                </label>
                <StateRadioGroup
                  value={targetState}
                  onChange={handleTargetStateChange}
                  t={t}
                />
              </div>
            </div>

            {/* Row 3 - level: current → target */}
            <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  {t("calculator.level")} (1-
                  {currentState === "toku" ? 99 : 199})
                </label>
                <input
                  type="number"
                  max={currentState === "toku" ? 99 : 199}
                  value={currentLevel}
                  onChange={createLevelChangeHandler(setCurrentLevel)}
                  className={`w-full border px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none ${validationErrors.currentLevel
                      ? "border-red-500"
                      : "border-black"
                    }`}
                />
              </div>
              <span className="pb-2 text-center">→</span>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  {t("calculator.level")} (1-
                  {targetState === "toku" ? 99 : 199})
                </label>
                <input
                  type="number"
                  max={targetState === "toku" ? 99 : 199}
                  value={targetLevel}
                  onChange={createLevelChangeHandler(setTargetLevel)}
                  className={`w-full border px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none ${validationErrors.targetLevel
                      ? "border-red-500"
                      : "border-black"
                    }`}
                />
              </div>
            </div>
          </ContentContainer>
          {/* Calculate Button */}
          <div className="col-span-2 flex rounded-lg gap-4">
            <ContentContainer className="col-span-2 rounded-lg border flex-1">
              {validationErrors.messages && validationErrors.messages.length > 0 ? (
                <>
                  <h3 className="text-xl font-semibold text-red-600 mb-3">
                    {t("errors.invalidInput")}
                  </h3>
                  <div className="space-y-2">
                    {validationErrors.messages.map((message, index) => (
                      <div key={index} className="text-red-600">
                        {t(message.key, message.params)}
                      </div>
                    ))}
                  </div>
                </>
              ) : result ? (
                <>
                  <h3 className="text-xl font-semibold">
                    {t("calculator.calculationResults")}
                  </h3>

                  <div className="space-y-3">
                    <div>
                      <span className="font-medium">
                        {result.kind === "requiredStoredCumulative"
                          ? t("results.requiredStoredCumulative")
                          : t("results.expNeededDelta")}
                      </span>{" "}
                      <span className="text-2xl font-bold">
                        {formatNumber(result.value)}
                      </span>
                    </div>
                  </div>
                </>
              ) : null}
            </ContentContainer>
            <div className="grid gap-2 ml-auto w-26">
              <Button
                onClick={handleReset}
                className="bg-info"
                cornerClassName="border-b-info-accent"
              >
                {t("common.reset")}
              </Button>
              <Button
                onClick={handleCalculate}
                disabled={isCalculateDisabled}
                className={`bg-danger ${isCalculateDisabled ? "cursor-not-allowed" : "cursor-pointer"}`}
                cornerClassName="border-b-danger-accent"
              >
                {t("common.calculate")}
              </Button>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
