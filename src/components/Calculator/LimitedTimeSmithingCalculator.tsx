import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useLocalStorageObject } from "../../lib/hooks";
import { Button } from "../Shared/Button";
import { ContentContainer } from "../Shared/ContentContainer";

const SMITHING_COST = 700;
const POINTS_PER_SMITH = 5;

const OFUDA_BONUS = {
  ume: 10,
  take: 15,
  matsu: 20,
  fuji: 60,
} as const;

const STORAGE_KEY = "limitedSmithingCalculator";

type StoredInputs = {
  pityCap: number;
  currentScore: number;
  umeCount: number;
  takeCount: number;
  matsuCount: number;
  fujiCount: number;
  charcoal: number;
  steel: number;
  coolant: number;
  whetstone: number;
};

const DEFAULT_INPUTS: StoredInputs = {
  pityCap: 5000,
  currentScore: 0,
  umeCount: 0,
  takeCount: 0,
  matsuCount: 0,
  fujiCount: 0,
  charcoal: 0,
  steel: 0,
  coolant: 0,
  whetstone: 0,
};

function parseNum(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
    return value;
  }
  return null;
}

function parseStoredInputs(raw: unknown): StoredInputs {
  const parsed = raw as Partial<StoredInputs> | null;
  if (!parsed || typeof parsed !== "object") return DEFAULT_INPUTS;
  const next = { ...DEFAULT_INPUTS };
  const keys = Object.keys(DEFAULT_INPUTS) as (keyof StoredInputs)[];
  for (const key of keys) {
    const v = parseNum(parsed[key]);
    if (v !== null) next[key] = v;
  }
  if (typeof parsed.pityCap === "number" && parsed.pityCap > 0) {
    next.pityCap = parsed.pityCap;
  }
  return next;
}

type ResultState = {
  scoreGap: number;
  pityForges: number;
  pityTotalResources: number;
  ticketPoints: number;
  remainingGap: number;
  ticketPathForges: number;
  ticketPathResources: number;
  resourceGaps: {
    charcoal: { pity: number; ticket: number };
    steel: { pity: number; ticket: number };
    coolant: { pity: number; ticket: number };
    whetstone: { pity: number; ticket: number };
  };
};

const RESOURCE_KEYS = ["charcoal", "steel", "coolant", "whetstone"] as const;

export default function LimitedTimeSmithingCalculator() {
  const { t, i18n } = useTranslation();

  const formatNumber = useCallback(
    (num: number): string => {
      return new Intl.NumberFormat(i18n.language).format(num);
    },
    [i18n.language]
  );

  const { initialValue: initialInputs, save, remove } = useLocalStorageObject(
    STORAGE_KEY,
    DEFAULT_INPUTS,
    parseStoredInputs,
  );

  const [pityCap, setPityCap] = useState<number | "">(() => initialInputs.pityCap);
  const [currentScore, setCurrentScore] = useState<number | "">(() => initialInputs.currentScore);
  const [umeCount, setUmeCount] = useState<number | "">(() => initialInputs.umeCount);
  const [takeCount, setTakeCount] = useState<number | "">(() => initialInputs.takeCount);
  const [matsuCount, setMatsuCount] = useState<number | "">(() => initialInputs.matsuCount);
  const [fujiCount, setFujiCount] = useState<number | "">(() => initialInputs.fujiCount);
  const [charcoal, setCharcoal] = useState<number | "">(() => initialInputs.charcoal);
  const [steel, setSteel] = useState<number | "">(() => initialInputs.steel);
  const [coolant, setCoolant] = useState<number | "">(() => initialInputs.coolant);
  const [whetstone, setWhetstone] = useState<number | "">(() => initialInputs.whetstone);

  const [result, setResult] = useState<ResultState | null>(null);
  const [validationErrors, setValidationErrors] = useState<{
    messages: Array<{ key: string; params?: Record<string, string | number> }>;
  }>({ messages: [] });

  useEffect(() => {
    const num = (v: number | ""): number => (typeof v === "number" ? v : 0);
    save({
      pityCap: num(pityCap) || DEFAULT_INPUTS.pityCap,
      currentScore: num(currentScore),
      umeCount: num(umeCount),
      takeCount: num(takeCount),
      matsuCount: num(matsuCount),
      fujiCount: num(fujiCount),
      charcoal: num(charcoal),
      steel: num(steel),
      coolant: num(coolant),
      whetstone: num(whetstone),
    });
  }, [
    save,
    pityCap,
    currentScore,
    umeCount,
    takeCount,
    matsuCount,
    fujiCount,
    charcoal,
    steel,
    coolant,
    whetstone,
  ]);

  function validate(): {
    isValid: boolean;
    messages: Array<{ key: string; params?: Record<string, string | number> }>;
  } {
    const messages: Array<{ key: string; params?: Record<string, string | number> }> = [];
    const cap = typeof pityCap === "number" ? pityCap : 0;
    const score = typeof currentScore === "number" ? currentScore : -1;

    if (cap <= 0) {
      messages.push({ key: "limitedSmithing.errors.pityCapPositive" });
    }
    if (score < 0) {
      messages.push({ key: "limitedSmithing.errors.currentScoreNonNegative" });
    } else if (score >= cap) {
      messages.push({ key: "limitedSmithing.errors.currentScoreBelowPity" });
    }
    const n = (v: number | "") => (typeof v === "number" ? v : -1);
    if (n(umeCount) < 0 || n(takeCount) < 0 || n(matsuCount) < 0 || n(fujiCount) < 0) {
      messages.push({ key: "limitedSmithing.errors.ofudaNonNegative" });
    }
    if (n(charcoal) < 0 || n(steel) < 0 || n(coolant) < 0 || n(whetstone) < 0) {
      messages.push({ key: "limitedSmithing.errors.resourcesNonNegative" });
    }
    return { isValid: messages.length === 0, messages };
  }

  function handleCalculate() {
    const { isValid, messages } = validate();
    if (!isValid) {
      setValidationErrors({ messages });
      setResult(null);
      return;
    }
    setValidationErrors({ messages: [] });

    const cap = typeof pityCap === "number" ? pityCap : 5000;
    const score = typeof currentScore === "number" ? currentScore : 0;
    const u = typeof umeCount === "number" ? umeCount : 0;
    const tk = typeof takeCount === "number" ? takeCount : 0;
    const m = typeof matsuCount === "number" ? matsuCount : 0;
    const f = typeof fujiCount === "number" ? fujiCount : 0;
    const ch = typeof charcoal === "number" ? charcoal : 0;
    const st = typeof steel === "number" ? steel : 0;
    const co = typeof coolant === "number" ? coolant : 0;
    const wh = typeof whetstone === "number" ? whetstone : 0;

    const scoreGap = cap - score;
    const pityForges = Math.ceil(scoreGap / POINTS_PER_SMITH);
    const pityTotalResources = pityForges * SMITHING_COST;

    const ticketPoints =
      u * OFUDA_BONUS.ume +
      tk * OFUDA_BONUS.take +
      m * OFUDA_BONUS.matsu +
      f * OFUDA_BONUS.fuji;
    const remainingGap = Math.max(0, scoreGap - ticketPoints);
    const additionalForges = Math.ceil(remainingGap / POINTS_PER_SMITH);
    const totalTickets = u + tk + m + f;
    const ticketPathResources =
      totalTickets * SMITHING_COST + additionalForges * SMITHING_COST;
    const ticketPathForges = totalTickets + additionalForges;

    setResult({
      scoreGap,
      pityForges,
      pityTotalResources,
      ticketPoints,
      remainingGap,
      ticketPathForges,
      ticketPathResources,
      resourceGaps: {
        charcoal: { pity: pityTotalResources - ch, ticket: ticketPathResources - ch },
        steel: { pity: pityTotalResources - st, ticket: ticketPathResources - st },
        coolant: { pity: pityTotalResources - co, ticket: ticketPathResources - co },
        whetstone: { pity: pityTotalResources - wh, ticket: ticketPathResources - wh },
      },
    });
  }

  function handleReset() {
    setPityCap(DEFAULT_INPUTS.pityCap);
    setCurrentScore(DEFAULT_INPUTS.currentScore);
    setUmeCount(DEFAULT_INPUTS.umeCount);
    setTakeCount(DEFAULT_INPUTS.takeCount);
    setMatsuCount(DEFAULT_INPUTS.matsuCount);
    setFujiCount(DEFAULT_INPUTS.fujiCount);
    setCharcoal(DEFAULT_INPUTS.charcoal);
    setSteel(DEFAULT_INPUTS.steel);
    setCoolant(DEFAULT_INPUTS.coolant);
    setWhetstone(DEFAULT_INPUTS.whetstone);
    setResult(null);
    setValidationErrors({ messages: [] });
    remove();
  }

  const createNumberHandler = useCallback(
    (setter: (v: number | "") => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      if (val === "") {
        setter("");
      } else {
        const num = parseInt(val, 10);
        setter(Number.isNaN(num) ? "" : num);
      }
      setValidationErrors((prev) =>
        prev.messages.length > 0 ? { messages: [] } : prev,
      );
    },
    [],
  );

  const inputClass =
    "w-full border px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none border-black";

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <h2 className="mb-8 text-center text-3xl font-bold">
        {t("limitedSmithing.title")}
      </h2>

      <div className="flex flex-col gap-4">
        <ContentContainer className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                {t("limitedSmithing.pityCap")}
              </label>
              <input
                type="number"
                min={1}
                value={pityCap}
                onChange={createNumberHandler(setPityCap)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                {t("limitedSmithing.currentScore")}
              </label>
              <input
                type="number"
                min={0}
                value={currentScore}
                onChange={createNumberHandler(setCurrentScore)}
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <h3 className="mb-2 text-sm font-medium text-gray-700">
              {t("limitedSmithing.ofuda")}
            </h3>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div>
                <label className="mb-1 block text-xs text-gray-600">
                  {t("limitedSmithing.ofudaUme")}
                </label>
                <input
                  type="number"
                  min={0}
                  value={umeCount}
                  onChange={createNumberHandler(setUmeCount)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-gray-600">
                  {t("limitedSmithing.ofudaTake")}
                </label>
                <input
                  type="number"
                  min={0}
                  value={takeCount}
                  onChange={createNumberHandler(setTakeCount)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-gray-600">
                  {t("limitedSmithing.ofudaMatsu")}
                </label>
                <input
                  type="number"
                  min={0}
                  value={matsuCount}
                  onChange={createNumberHandler(setMatsuCount)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-gray-600">
                  {t("limitedSmithing.ofudaFuji")}
                </label>
                <input
                  type="number"
                  min={0}
                  value={fujiCount}
                  onChange={createNumberHandler(setFujiCount)}
                  className={inputClass}
                />
              </div>
            </div>
          </div>

          <div>
            <h3 className="mb-2 text-sm font-medium text-gray-700">
              {t("limitedSmithing.currentResources")}
            </h3>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div>
                <label className="mb-1 block text-xs text-gray-600">
                  {t("limitedSmithing.charcoal")}
                </label>
                <input
                  type="number"
                  min={0}
                  value={charcoal}
                  onChange={createNumberHandler(setCharcoal)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-gray-600">
                  {t("limitedSmithing.steel")}
                </label>
                <input
                  type="number"
                  min={0}
                  value={steel}
                  onChange={createNumberHandler(setSteel)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-gray-600">
                  {t("limitedSmithing.coolant")}
                </label>
                <input
                  type="number"
                  min={0}
                  value={coolant}
                  onChange={createNumberHandler(setCoolant)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-gray-600">
                  {t("limitedSmithing.whetstone")}
                </label>
                <input
                  type="number"
                  min={0}
                  value={whetstone}
                  onChange={createNumberHandler(setWhetstone)}
                  className={inputClass}
                />
              </div>
            </div>
          </div>
        </ContentContainer>

        <div className="flex flex-col gap-4 rounded-lg sm:flex-row sm:items-start">
          <ContentContainer className="flex-1">
            {validationErrors.messages.length > 0 ? (
              <>
                <h3 className="mb-3 text-xl font-semibold text-red-600">
                  {t("errors.invalidInput")}
                </h3>
                <div className="space-y-2">
                  {validationErrors.messages.map((msg, i) => (
                    <div key={i} className="text-red-600">
                      {t(msg.key, msg.params)}
                    </div>
                  ))}
                </div>
              </>
            ) : result ? (
              <>
                <h3 className="mb-3 text-xl font-semibold">
                  {t("limitedSmithing.calculationResults")}
                </h3>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-gray-700">
                      {t("limitedSmithing.pityPathLabel")}
                    </h4>
                    <p className="text-lg">
                      {t("limitedSmithing.forgesNeeded")}:{" "}
                      <strong>{formatNumber(result.pityForges)}</strong>
                      {" · "}
                      {t("limitedSmithing.totalResources")}:{" "}
                      <strong>{formatNumber(result.pityTotalResources)}</strong>
                    </p>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-700">
                      {t("limitedSmithing.ticketPathLabel")}
                    </h4>
                    <p className="text-lg">
                      {t("limitedSmithing.forgesNeeded")}:{" "}
                      <strong>{formatNumber(result.ticketPathForges)}</strong>
                      {" · "}
                      {t("limitedSmithing.totalResources")}:{" "}
                      <strong>{formatNumber(result.ticketPathResources)}</strong>
                    </p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full border border-black text-left text-sm">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className="border-b border-black px-2 py-1">
                            {t("limitedSmithing.resource")}
                          </th>
                          <th className="border-b border-l border-black px-2 py-1">
                            {t("limitedSmithing.pityPathGap")}
                          </th>
                          <th className="border-b border-l border-black px-2 py-1">
                            {t("limitedSmithing.ticketPathGap")}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {RESOURCE_KEYS.map((key) => (
                          <tr key={key} className="border-b border-gray-300">
                            <td className="px-2 py-1">
                              {t(`limitedSmithing.${key}`)}
                            </td>
                            <td
                              className={`border-l border-black px-2 py-1 ${
                                result.resourceGaps[key].pity < 0
                                  ? "text-green-700"
                                  : "text-red-700"
                              }`}
                            >
                              {formatNumber(result.resourceGaps[key].pity)}
                            </td>
                            <td
                              className={`border-l border-black px-2 py-1 ${
                                result.resourceGaps[key].ticket < 0
                                  ? "text-green-700"
                                  : "text-red-700"
                              }`}
                            >
                              {formatNumber(result.resourceGaps[key].ticket)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ) : null}
          </ContentContainer>
          <div className="flex gap-2 sm:ml-auto sm:flex-col sm:w-26">
            <Button
              onClick={handleReset}
              className="bg-info"
              cornerClassName="border-b-info-accent"
            >
              {t("common.reset")}
            </Button>
            <Button
              onClick={handleCalculate}
              className="bg-danger cursor-pointer"
              cornerClassName="border-b-danger-accent"
            >
              {t("common.calculate")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
