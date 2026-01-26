import { useState, useEffect } from "react";
import type { ToukenState, ToukenType, ExpData } from "../../lib/types/touken";
import { getExpBetweenLevels, getCumExpToLevel } from "../../lib/helpers/exp-calculate";

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

const TYPE_LABELS: Record<ToukenType, string> = {
  tantou: "短刀 (Tantou)",
  wakizashi: "脇差 (Wakizashi)",
  uchigatana_R3: "打刀 R3 (Uchigatana R3)",
  uchigatana_R4: "打刀 R4 (Uchigatana R4)",
  tachi: "太刀 (Tachi)",
  ootachi: "大太刀 (Ootachi)",
  yari: "槍 (Yari)",
  naginata: "薙刀 (Naginata)",
};

function formatNumber(num: number): string {
  return num.toLocaleString("en-US");
}

export default function ExpCalculator() {
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
          throw new Error(`Failed to load exp data: ${response.statusText}`);
        }
        const data: ExpData = await response.json();
        setExpData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load exp data");
      } finally {
        setLoading(false);
      }
    }

    loadExpData();
  }, []);

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
    if (!expData) return "Exp data not loaded";

    if (currentState === "kiwame" && !currentType) {
      return "Please select a type for current kiwame state";
    }

    if (targetState === "kiwame" && !targetType) {
      return "Please select a type for target kiwame state";
    }

    const currentMaxLevel = currentState === "toku" ? 99 : 199;
    const targetMaxLevel = targetState === "toku" ? 99 : 199;

    if (currentLevel < 1 || currentLevel > currentMaxLevel) {
      return `Current level must be between 1 and ${currentMaxLevel}`;
    }

    if (targetLevel < 1 || targetLevel > targetMaxLevel) {
      return `Target level must be between 1 and ${targetMaxLevel}`;
    }

    // Check for invalid state transitions
    if (currentState === "kiwame" && targetState === "toku") {
      return "Cannot calculate from kiwame to toku (downgrade not possible)";
    }

    // If both states are kiwame, types should match
    if (
      currentState === "kiwame" &&
      targetState === "kiwame" &&
      currentType !== targetType
    ) {
      return "Kiwame type must be the same for current and target state";
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
            targetLevel
          );
        } else {
          // kiwame to kiwame (types should match, use currentType)
          value = getExpBetweenLevels(
            expData,
            "kiwame",
            currentLevel,
            targetLevel,
            currentType || undefined
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
          targetType || undefined
        );

        const trainingUnlockLevel = expData.kiwame.variants[targetType!].trainingUnlockBaseLevel;
        const trainingUnlockLevelExp = getCumExpToLevel(expData, "toku", trainingUnlockLevel);
        value = trainingUnlockLevelExp + expFromKiwameLv1ToTarget;
        kind = "requiredStoredCumulative";
      }

      setResult({ value, kind });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Calculation failed"
      );
      setResult(null);
    }
  }

  const isCalculateDisabled =
    loading || !expData || validateInputs() !== null;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <h2 className="text-3xl font-bold text-center mb-8">
        EXP Calculator
      </h2>

      {loading && (
        <div className="text-center py-8 text-gray-600">
          Loading exp data...
        </div>
      )}

      {error && !loading && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {!loading && expData && (
        <div className="grid grid-cols-2 gap-4">
          {/* Current State Section */}
          <div className="bg-white rounded-lg shadow-md p-6 space-y-4">
            <h3 className="text-xl font-semibold mb-4">Current State</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  State
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
                    <span>特 (Toku)</span>
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
                    <span>極 (Kiwame)</span>
                  </label>
                </div>
              </div>

              {currentState === "kiwame" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Type
                  </label>
                  <select
                    value={currentType || ""}
                    onChange={(e) =>
                      setCurrentType(e.target.value as ToukenType)
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select type...</option>
                    {TOUKEN_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {TYPE_LABELS[type]}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Level (1-{currentState === "toku" ? 99 : 199})
                </label>
                <input
                  type="number"
                  min={1}
                  max={currentState === "toku" ? 99 : 199}
                  value={currentLevel}
                  onChange={(e) =>
                    setCurrentLevel(parseInt(e.target.value) || 1)
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Target State Section */}
          <div className="bg-white rounded-lg shadow-md p-6 space-y-4">
            <h3 className="text-xl font-semibold mb-4">Target State</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  State
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
                    <span>特 (Toku)</span>
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
                    <span>極 (Kiwame)</span>
                  </label>
                </div>
              </div>

              {targetState === "kiwame" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Type
                  </label>
                  <select
                    value={targetType || ""}
                    onChange={(e) =>
                      setTargetType(e.target.value as ToukenType)
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select type...</option>
                    {TOUKEN_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {TYPE_LABELS[type]}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Level (1-{targetState === "toku" ? 99 : 199})
                </label>
                <input
                  type="number"
                  min={1}
                  max={targetState === "toku" ? 99 : 199}
                  value={targetLevel}
                  onChange={(e) =>
                    setTargetLevel(parseInt(e.target.value) || 1)
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Calculate Button */}
          <div className="flex justify-center col-span-2">
            <button
              onClick={handleCalculate}
              disabled={isCalculateDisabled}
              className={`px-8 py-3 rounded-lg font-semibold text-white transition-colors ${
                isCalculateDisabled
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700 active:bg-blue-800"
              }`}
            >
              Calculate
            </button>
          </div>

          {/* Results Section */}
          {result && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-6 space-y-4 col-span-2">
              <h3 className="text-xl font-semibold text-green-800">
                Calculation Results
              </h3>

              <div className="space-y-3">
                <div>
                  <span className="font-medium text-gray-700">
                    {result.kind === "requiredStoredCumulative"
                      ? "Required stored cumulative EXP (before training):"
                      : "EXP needed (delta):"}
                  </span>{" "}
                  <span className="text-2xl font-bold text-green-700">
                    {formatNumber(result.value)}
                  </span>
                </div>
                {result.kind === "requiredStoredCumulative" && (
                  <p className="text-sm text-gray-600">
                    Matches the wiki’s「特累積レベリング必要参考値(極)」calculation:
                    base cumulative EXP at the training unlock level + kiwame cumulative EXP to the target level.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
