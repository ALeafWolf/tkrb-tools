import { useState, useEffect, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import type { ToukenState, ToukenType, ExpData } from "../../lib/types/touken";
import {
  getExpBetweenLevels,
  getCumExpToLevel,
} from "../../lib/helpers";
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

interface StateRadioGroupProps {
  value: ToukenState;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  t: (key: string) => string;
}

const StateRadioGroup = ({ value, onChange, t }: StateRadioGroupProps) => (
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

  const [currentState, setCurrentState] = useState<ToukenState>("toku");
  const [currentType, setCurrentType] = useState<ToukenType | null>(null);
  const [currentLevel, setCurrentLevel] = useState<number | "">(1);

  const [targetState, setTargetState] = useState<ToukenState>("kiwame");
  const [targetType, setTargetType] = useState<ToukenType | null>(null);
  const [targetLevel, setTargetLevel] = useState<number | "">(1);

  const [result, setResult] = useState<{
    value: number;
    kind: "delta" | "requiredStoredCumulative";
  } | null>(null);

  const [validationErrors, setValidationErrors] = useState<{
    currentLevel?: boolean;
    targetLevel?: boolean;
    currentType?: boolean;
    targetType?: boolean;
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


  function validateInputs(): {
    isValid: boolean;
    errors: {
      currentLevel?: boolean;
      targetLevel?: boolean;
      currentType?: boolean;
      targetType?: boolean;
      messages: Array<{ key: string; params?: Record<string, string | number> }>;
    };
  } {
    const errors: {
      currentLevel?: boolean;
      targetLevel?: boolean;
      currentType?: boolean;
      targetType?: boolean;
      messages: Array<{ key: string; params?: Record<string, string | number> }>;
    } = {
      messages: [],
    };

    if (!expData) {
      errors.messages.push({ key: "errors.expDataNotLoaded" });
      return { isValid: false, errors };
    }

    if (currentState === "kiwame" && !currentType) {
      errors.currentType = true;
      errors.messages.push({ key: "errors.selectTypeCurrentKiwame" });
    }

    if (targetState === "kiwame" && !targetType) {
      errors.targetType = true;
      errors.messages.push({ key: "errors.selectTypeTargetKiwame" });
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

    // If both states are kiwame, types should match
    if (
      currentState === "kiwame" &&
      targetState === "kiwame" &&
      currentType !== targetType
    ) {
      errors.messages.push({ key: "errors.kiwameTypeMustMatch" });
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
          // kiwame to kiwame (types should match, use currentType)
          value = getExpBetweenLevels(
            expData,
            "kiwame",
            currentLevelNum,
            targetLevelNum,
            currentType || undefined,
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
          targetType || undefined,
        );

        const trainingUnlockLevel =
          expData.kiwame.variants[targetType!].trainingUnlockBaseLevel;
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

  // Memoize options arrays to prevent recreation on every render
  // Only include placeholder option when no type is selected
  const currentTypeOptions = useMemo(
    () => [
      ...(currentType === null ? [{ value: "", label: t("common.selectType") }] : []),
      ...TOUKEN_TYPES.map((type) => ({
        value: type,
        label: t(`types.${type}`),
      })),
    ],
    [currentType, t]
  );

  const targetTypeOptions = useMemo(
    () => [
      ...(targetType === null ? [{ value: "", label: t("common.selectType") }] : []),
      ...TOUKEN_TYPES.map((type) => ({
        value: type,
        label: t(`types.${type}`),
      })),
    ],
    [targetType, t]
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
        if (validationErrors.messages && validationErrors.messages.length > 0) {
          setValidationErrors({});
        }
      },
    [validationErrors.messages]
  );

  // Handlers for state changes with type reset logic
  const handleCurrentStateChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newState = e.target.value as ToukenState;
      setCurrentState(newState);
      if (newState === "toku") {
        setCurrentType(null);
      } else if (!currentType) {
        setCurrentType("tantou");
      }
    },
    [currentType]
  );

  const handleTargetStateChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newState = e.target.value as ToukenState;
      setTargetState(newState);
      if (newState === "toku") {
        setTargetType(null);
      } else if (!targetType) {
        setTargetType("tantou");
      }
    },
    [targetType]
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
        <div className="rounded border border-red-400 bg-red-100 px-4 py-3 text-red-700">
          {error}
        </div>
      )}

      {!loading && expData && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Current State Section */}
            <ContentContainer className="space-y-4">
              <h3 className="mb-4 text-xl font-semibold">
                {t("calculator.currentState")}
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    {t("calculator.state")}
                  </label>
                  <StateRadioGroup
                    value={currentState}
                    onChange={handleCurrentStateChange}
                    t={t}
                  />
                </div>

                {currentState === "kiwame" && (
                  <Select
                    label={t("calculator.type")}
                    value={currentType || ""}
                    options={currentTypeOptions}
                    onChange={(value) => {
                      setCurrentType(value === "" ? null : (value as ToukenType));
                      // Clear validation errors when user selects a type
                      if (validationErrors.currentType) {
                        setValidationErrors((prev) => ({
                          ...prev,
                          currentType: false,
                          messages: prev.messages?.filter(
                            (msg) => msg.key !== "errors.selectTypeCurrentKiwame"
                          ),
                        }));
                      }
                    }}
                    placeholder={t("common.selectType")}
                    className="w-full"
                    hasError={validationErrors.currentType}
                  />
                )}

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
                    className={`w-full border px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none ${
                      validationErrors.currentLevel
                        ? "border-red-500"
                        : "border-black"
                    }`}
                  />
                </div>
              </div>
            </ContentContainer>

            {/* Target State Section */}
            <ContentContainer className="space-y-4">
              <h3 className="mb-4 text-xl font-semibold">
                {t("calculator.targetState")}
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    {t("calculator.state")}
                  </label>
                  <StateRadioGroup
                    value={targetState}
                    onChange={handleTargetStateChange}
                    t={t}
                  />
                </div>

                {targetState === "kiwame" && (
                  <Select
                    label={t("calculator.type")}
                    value={targetType || ""}
                    options={targetTypeOptions}
                    onChange={(value) => {
                      setTargetType(value === "" ? null : (value as ToukenType));
                      // Clear validation errors when user selects a type
                      if (validationErrors.targetType) {
                        setValidationErrors((prev) => ({
                          ...prev,
                          targetType: false,
                          messages: prev.messages?.filter(
                            (msg) => msg.key !== "errors.selectTypeTargetKiwame"
                          ),
                        }));
                      }
                    }}
                    placeholder={t("common.selectType")}
                    className="w-full"
                    hasError={validationErrors.targetType}
                  />
                )}

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    {t("calculator.level")} (1-{targetState === "toku" ? 99 : 199}
                    )
                  </label>
                  <input
                    type="number"
                    max={targetState === "toku" ? 99 : 199}
                    value={targetLevel}
                    onChange={createLevelChangeHandler(setTargetLevel)}
                    className={`w-full border px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none ${
                      validationErrors.targetLevel
                        ? "border-red-500"
                        : "border-black"
                    }`}
                  />
                </div>
              </div>
            </ContentContainer>
          </div>
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
            <Button
              onClick={handleCalculate}
              disabled={isCalculateDisabled}
              className={`px-8 py-3 ml-auto bg-danger ${isCalculateDisabled ? "cursor-not-allowed" : "cursor-pointer"}`}
              cornerClassName="border-b-danger-accent"
            >
              {t("common.calculate")}
            </Button>
          </div>

        </div>
      )}
    </div>
  );
}
