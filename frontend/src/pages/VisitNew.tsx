import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { Mic, MicOff, X } from "lucide-react";
import { PageShell } from "../components/PageShell";
import { BigButton } from "../components/BigButton";
import { NumberPad } from "../components/NumberPad";
import { getPatient, recordVisit } from "../db/repo";
import { newId } from "../lib/ids";
import { nextVisitDate } from "../lib/dates";
import { assessRisk } from "../risk/riskEngine";
import { getRecognitionCtor } from "../voice/speak";
import type { Patient, SugarType, Visit } from "../types";

const DANGER = [
  "chest_pain",
  "breathlessness",
  "fainting",
  "confusion",
  "vomiting_blood",
  "coughing_blood"
];
const PREG_DANGER = [
  "severe_headache",
  "blurred_vision",
  "swelling_face",
  "bleeding",
  "reduced_fetal_movement",
  "convulsions"
];

export default function VisitNewPage() {
  const { t, i18n } = useTranslation();
  const { patientId = "" } = useParams();
  const navigate = useNavigate();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);

  const [systolic, setSystolic] = useState("");
  const [diastolic, setDiastolic] = useState("");
  const [sugar, setSugar] = useState("");
  const [sugarType, setSugarType] = useState<SugarType>("random");
  const [missedDoses, setMissedDoses] = useState(0);
  const [medicineTaken, setMedicineTaken] = useState<boolean | null>(null);
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [showPlausibility, setShowPlausibility] = useState(false);
  const [listening, setListening] = useState(false);

  useEffect(() => {
    void (async () => {
      const p = await getPatient(patientId);
      setPatient(p ?? null);
      setLoading(false);
    })();
  }, [patientId]);

  const condition = patient?.condition ?? "hypertension";

  const symptomList = useMemo(() => {
    const list = condition === "pregnancy" ? [...PREG_DANGER, ...DANGER] : DANGER;
    return list.filter((v, i, a) => a.indexOf(v) === i);
  }, [condition]);

  const toggleSymptom = (s: string) =>
    setSymptoms((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));

  const readings = useMemo(() => {
    const sys = systolic ? Number(systolic) : null;
    const dia = diastolic ? Number(diastolic) : null;
    const sug = sugar ? Number(sugar) : null;
    return { sys, dia, sug };
  }, [systolic, diastolic, sugar]);

  // Live risk preview for the plausibility gate.
  const riskPreview = useMemo(
    () =>
      assessRisk({
        condition,
        age: patient?.age ?? 0,
        systolic: readings.sys,
        diastolic: readings.dia,
        sugarMgDl: readings.sug,
        sugarType: readings.sug != null ? sugarType : null,
        medicineTaken,
        missedDoses,
        symptoms
      }),
    [condition, patient, readings, sugarType, medicineTaken, missedDoses, symptoms]
  );

  const isImplausible = riskPreview.reasonCodes.includes("IMPLAUSIBLE_READING");

  const satisfies = () => {
    if ((condition === "hypertension" || condition === "pregnancy") && (systolic === "" || diastolic === "")) return false;
    if (condition === "diabetes" && sugar === "") return false;
    return true;
  };

  const doSave = async (force: boolean) => {
    if (!patient) return;
    if (isImplausible && !force) {
      setShowPlausibility(true);
      return;
    }
    const visitedAt = new Date().toISOString();
    const risk = assessRisk({
      condition: patient.condition,
      age: patient.age,
      systolic: readings.sys,
      diastolic: readings.dia,
      sugarMgDl: readings.sug,
      sugarType: readings.sug != null ? sugarType : null,
      medicineTaken,
      missedDoses,
      symptoms
    });
    const visitInput: Visit = {
      id: newId(),
      patient_id: patient.id,
      worker_id: null,
      visited_at: visitedAt,
      systolic: readings.sys,
      diastolic: readings.dia,
      sugar_mg_dl: readings.sug,
      sugar_type: readings.sug != null ? sugarType : null,
      medicine_taken: medicineTaken === null ? null : medicineTaken ? 1 : 0,
      missed_doses: missedDoses,
      symptoms,
      notes: notes.trim() || null,
      risk_level: risk.level,
      reason_codes: risk.reasonCodes,
      advice_key: risk.adviceKey,
      created_at: visitedAt,
      updated_at: visitedAt
    };
    const nextDate = nextVisitDate(visitedAt, risk.nextVisitInDays);
    const { patient: updated, visit } = await recordVisit(patient, visitInput, nextDate);
    navigate("/risk/result", { state: { patient: updated, visit } });
  };

  const recCtor = getRecognitionCtor();
  const langTag = i18n.language === "hi" ? "hi-IN" : "en-IN";

  const toggleMic = () => {
    if (!recCtor || listening) {
      setListening(false);
      return;
    }
    const rec = new recCtor();
    rec.lang = langTag;
    rec.interimResults = false;
    rec.onresult = (e) => {
      const transcript = Array.from(e.results)
        .map((r) => r[0].transcript)
        .join(" ");
      setNotes((prev) => (prev ? `${prev.trim()} ${transcript}` : transcript));
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    setListening(true);
    rec.start();
  };

  if (loading) return <PageShell />;
  if (!patient)
    return (
      <PageShell>
        <p>{t("patients.emptyTitle")}</p>
      </PageShell>
    );

  return (
    <PageShell noNav>
      <div className="flex items-center justify-between">
        <h1 className="text-page font-extrabold">{t("visit.title")}</h1>
        <button className="btn-ghost min-h-[48px] px-3" onClick={() => navigate(-1)} aria-label={t("common.back")}>
          <X className="size-6" aria-hidden="true" />
        </button>
      </div>
      <p className="text-body font-bold text-neem-dark">{patient.name}</p>

      <div className="mt-5 flex flex-col gap-8">
        {(condition === "hypertension" || condition === "pregnancy") && (
          <>
            <NumberPad value={systolic} onChange={(v) => setSystolic(v)} maxLength={3} label={t("visit.systolic")} />
            <NumberPad
              value={diastolic}
              onChange={(v) => setDiastolic(v.replace(/^0+/, ""))}
              maxLength={3}
              label={t("visit.diastolic")}
            />
          </>
        )}

        {condition === "diabetes" && (
          <>
            <div role="group" aria-label={t("visit.sugarType")} className="flex gap-3">
              {(["fasting", "random"] as SugarType[]).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setSugarType(st)}
                  className={`min-h-[56px] flex-1 rounded-button text-body font-bold ${
                    sugarType === st ? "bg-neem text-white" : "bg-mist text-neem-dark"
                  }`}
                >
                  {t(`visit.${st}`)}
                </button>
              ))}
            </div>
            <NumberPad value={sugar} onChange={(v) => setSugar(v)} maxLength={3} label={t("visit.sugar")} />
          </>
        )}

        {condition === "tb" && (
          <div>
            <label htmlFor="missed" className="text-body font-bold text-ink">
              {t("visit.missedDoses")}
            </label>
            <div className="mt-2 flex min-h-[56px] items-center gap-3 rounded-button bg-white p-2">
              <button
                type="button"
                className="num-key"
                aria-label="minus"
                onClick={() => setMissedDoses((v) => Math.max(0, v - 1))}
              >
                −
              </button>
              <span className="flex-1 text-center text-4xl font-extrabold tabular-nums">{missedDoses}</span>
              <button
                type="button"
                className="num-key"
                aria-label="plus"
                onClick={() => setMissedDoses((v) => Math.min(7, v + 1))}
              >
                +
              </button>
            </div>
          </div>
        )}

        <div>
          <span className="text-body font-bold text-ink">{t("visit.tookMedicine")}</span>
          <div className="mt-1 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setMedicineTaken(true)}
              className={`min-h-[56px] rounded-button text-body font-bold ${
                medicineTaken === true ? "bg-home text-white" : "bg-mist text-neem-dark"
              }`}
            >
              {t("visit.yes")}
            </button>
            <button
              type="button"
              onClick={() => setMedicineTaken(false)}
              className={`min-h-[56px] rounded-button text-body font-bold ${
                medicineTaken === false ? "bg-urgent text-white" : "bg-mist text-neem-dark"
              }`}
            >
              {t("visit.no")}
            </button>
          </div>
        </div>

        <div>
          <span className="text-body font-bold text-ink">{t("visit.symptomsTitle")}</span>
          <div className="mt-2 flex flex-wrap gap-2">
            {symptomList.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => toggleSymptom(s)}
                className={`tag min-h-[48px] ${
                  symptoms.includes(s) ? "bg-urgent text-white" : "bg-mist text-neem-dark"
                }`}
              >
                {t(`symptom.${s}`)}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="notes" className="text-body font-bold text-ink">
            {t("visit.notes")}
          </label>
          <textarea
            id="notes"
            rows={3}
            className="mt-1 w-full rounded-button border border-mist bg-white px-4 py-3"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t("visit.notesPlaceholder")}
          />
          {recCtor ? (
            <button
              type="button"
              className={`btn-secondary mt-2 ${listening ? "bg-urgent text-white" : ""}`}
              onClick={toggleMic}
              aria-label={listening ? t("visit.micListening") : t("visit.mic")}
            >
              {listening ? <MicOff className="size-5" aria-hidden="true" /> : <Mic className="size-5" aria-hidden="true" />}
              {listening ? t("visit.micListening") : t("visit.mic")}
            </button>
          ) : (
            <p className="mt-2 text-base text-neem-dark">{t("visit.micUnsupported")}</p>
          )}
        </div>

        <BigButton disabled={!satisfies()} onClick={() => void doSave(false)}>
          {t("visit.save")}
        </BigButton>
      </div>

      {showPlausibility && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/50" role="presentation">
          <div
            role="alertdialog"
            aria-modal="true"
            aria-label={t("visit.implausibleTitle")}
            className="w-full max-w-[480px] rounded-t-card bg-paper p-5 shadow-sheet animate-sheet-up"
          >
            <p className="text-section font-extrabold text-urgent">{t("visit.implausibleTitle")}</p>
            <p className="mt-2 text-body text-ink">{t("visit.implausibleBody")}</p>
            <div className="mt-5 flex flex-col gap-3">
              <BigButton variant="danger" onClick={() => setShowPlausibility(false)}>
                {t("visit.recheck")}
              </BigButton>
              <BigButton variant="secondary" onClick={() => void doSave(true)}>
                {t("visit.saveAnyway")}
              </BigButton>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}