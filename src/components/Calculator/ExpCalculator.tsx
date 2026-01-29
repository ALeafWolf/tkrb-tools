import { useState, useEffect } from "react";
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
export default function ExpCalculator() {
  const { t, i18n } = useTranslation();

  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat(i18n.language).format(num);
  };

  const [expData, setExpData] = useState<ExpData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [currentState, setCurrentState] = useState<ToukenState>("toku");
  const [currentType, setCurrentType] = useState<ToukenType | null>(null);
  const [currentLevel, setCurrentLevel] = useState<number>(1);

  const [targetState, setTargetState] = useState<ToukenState>("kiwame");
  const [targetType, setTargetType] = useState<ToukenType | null>(null);
  const [targetLevel, setTargetLevel] = useState<number>(1);

  const [result, setResult] = useState<{
    value: number;
    kind: "delta" | "requiredStoredCumulative";
  } | null>(null);

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
  }, [t]);

  // Reset type when state changes
  useEffect(() => {
    if (currentState === "toku") {
      setCurrentType(null);
    } else if (!currentType) {
      setCurrentType("tantou");
    }
  }, [currentState, currentType]);

  useEffect(() => {
    if (targetState === "toku") {
      setTargetType(null);
    } else if (!targetType) {
      setTargetType("tantou");
    }
  }, [targetState, targetType]);

  function validateInputs(): string | null {
    if (!expData) return t("errors.expDataNotLoaded");

    if (currentState === "kiwame" && !currentType) {
      return t("errors.selectTypeCurrentKiwame");
    }

    if (targetState === "kiwame" && !targetType) {
      return t("errors.selectTypeTargetKiwame");
    }

    const currentMaxLevel = currentState === "toku" ? 99 : 199;
    const targetMaxLevel = targetState === "toku" ? 99 : 199;

    if (currentLevel < 1 || currentLevel > currentMaxLevel) {
      return t("errors.currentLevelRange", { max: currentMaxLevel });
    }

    if (targetLevel < 1 || targetLevel > targetMaxLevel) {
      return t("errors.targetLevelRange", { max: targetMaxLevel });
    }

    // Check for invalid state transitions
    if (currentState === "kiwame" && targetState === "toku") {
      return t("errors.cannotDowngrade");
    }

    // If both states are kiwame, types should match
    if (
      currentState === "kiwame" &&
      targetState === "kiwame" &&
      currentType !== targetType
    ) {
      return t("errors.kiwameTypeMustMatch");
    }

    return null;
  }

  function handleCalculate() {
    const validationError = validateInputs();
    if (validationError) {
      setError(validationError);
      setResult(null);
      return;
    }

    if (!expData) return;

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
            currentLevel,
            targetLevel,
          );
        } else {
          // kiwame to kiwame (types should match, use currentType)
          value = getExpBetweenLevels(
            expData,
            "kiwame",
            currentLevel,
            targetLevel,
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
          targetLevel,
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

  const isCalculateDisabled = loading || !expData || validateInputs() !== null;

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
        <div className="grid grid-cols-2 gap-4">
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
                <div className="flex gap-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="toku"
                      checked={currentState === "toku"}
                      onChange={(e) =>
                        setCurrentState(e.target.value as ToukenState)
                      }
                      className="mr-2"
                    />
                    <span>{t("states.toku")}</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="kiwame"
                      checked={currentState === "kiwame"}
                      onChange={(e) =>
                        setCurrentState(e.target.value as ToukenState)
                      }
                      className="mr-2"
                    />
                    <span>{t("states.kiwame")}</span>
                  </label>
                </div>
              </div>

              {currentState === "kiwame" && (
                <Select
                  label={t("calculator.type")}
                  value={currentType || ""}
                  options={[
                    { value: "", label: t("common.selectType") },
                    ...TOUKEN_TYPES.map((type) => ({
                      value: type,
                      label: t(`types.${type}`),
                    })),
                  ]}
                  onChange={(value) =>
                    setCurrentType(value === "" ? null : (value as ToukenType))
                  }
                  placeholder={t("common.selectType")}
                  className="w-full"
                />
              )}

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  {t("calculator.level")} (1-
                  {currentState === "toku" ? 99 : 199})
                </label>
                <input
                  type="number"
                  min={1}
                  max={currentState === "toku" ? 99 : 199}
                  value={currentLevel}
                  onChange={(e) =>
                    setCurrentLevel(parseInt(e.target.value) || 1)
                  }
                  className="w-full border border-black px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
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
                <div className="flex gap-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="toku"
                      checked={targetState === "toku"}
                      onChange={(e) =>
                        setTargetState(e.target.value as ToukenState)
                      }
                      className="mr-2"
                    />
                    <span>{t("states.toku")}</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="kiwame"
                      checked={targetState === "kiwame"}
                      onChange={(e) =>
                        setTargetState(e.target.value as ToukenState)
                      }
                      className="mr-2"
                    />
                    <span>{t("states.kiwame")}</span>
                  </label>
                </div>
              </div>

              {targetState === "kiwame" && (
                <Select
                  label={t("calculator.type")}
                  value={targetType || ""}
                  options={[
                    { value: "", label: t("common.selectType") },
                    ...TOUKEN_TYPES.map((type) => ({
                      value: type,
                      label: t(`types.${type}`),
                    })),
                  ]}
                  onChange={(value) =>
                    setTargetType(value === "" ? null : (value as ToukenType))
                  }
                  placeholder={t("common.selectType")}
                  className="w-full"
                />
              )}

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  {t("calculator.level")} (1-{targetState === "toku" ? 99 : 199}
                  )
                </label>
                <input
                  type="number"
                  min={1}
                  max={targetState === "toku" ? 99 : 199}
                  value={targetLevel}
                  onChange={(e) =>
                    setTargetLevel(parseInt(e.target.value) || 1)
                  }
                  className="w-full border border-black px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>
          </ContentContainer>

          {/* Calculate Button */}
          <div className="col-span-2 flex rounded-lg gap-4">
            <ContentContainer className="col-span-2 rounded-lg border flex-1">
              {result && (
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
              )}
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
