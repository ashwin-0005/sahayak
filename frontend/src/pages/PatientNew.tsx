import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Baby, Check, Droplets, HeartPulse, Stethoscope, UserRound, Users, X } from "lucide-react";
import type { ComponentType } from "react";
import { VantagePageShell } from "../components/VantagePageShell";
import { BigButton } from "../components/BigButton";
import { ConsentSheet } from "../components/ConsentSheet";
import { LanguageToggle } from "../components/LanguageToggle";
import { createPatient } from "../db/repo";
import { newId } from "../lib/ids";
import type { Condition, Patient, Sex } from "../types";

const SEX_OPTIONS: { value: Sex; key: "sexFemale" | "sexMale" | "sexOther"; icon: ComponentType<{ className?: string }> }[] = [
  { value: "F", key: "sexFemale", icon: UserRound },
  { value: "M", key: "sexMale", icon: Users },
  { value: "O", key: "sexOther", icon: UserRound }
];

const CONDITION_OPTIONS: { value: Condition; icon: ComponentType<{ className?: string }> }[] = [
  { value: "hypertension", icon: HeartPulse },
  { value: "diabetes", icon: Droplets },
  { value: "tb", icon: Stethoscope },
  { value: "pregnancy", icon: Baby }
];

export default function PatientNewPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [sex, setSex] = useState<Sex>("F");
  const [village, setVillage] = useState("");
  const [phone, setPhone] = useState("");
  const [condition, setCondition] = useState<Condition>("hypertension");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [consent, setConsent] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);

  const phoneOk = phone === "" || /^[0-9]{10}$/.test(phone);
  const basicOk = name.trim().length > 0 && village.trim().length > 0 && phoneOk && Number(age) > 0 && Number(age) <= 120;

  const save = async () => {
    if (!basicOk) {
      setFieldError(
        !name.trim()
          ? t("patientNew.nameRequired")
          : !village.trim()
            ? t("patientNew.villageRequired")
            : !phoneOk
              ? t("patientNew.phoneInvalid")
              : t("patientNew.plausibleAge")
      );
      return;
    }
    const nowIso = new Date().toISOString();
    const patient: Patient = {
      id: newId(),
      worker_id: null,
      name: name.trim(),
      age: Number(age),
      sex,
      village: village.trim(),
      phone: phone || null,
      condition,
      language: (i18n.language ?? "en").startsWith("hi") ? "hi" : "en",
      consent_given: 1,
      consent_at: nowIso,
      next_visit_date: null,
      created_at: nowIso,
      updated_at: nowIso,
      deleted_at: null
    };
    await createPatient(patient);
    navigate("/patients");
  };

  return (
    <VantagePageShell>
      <div className="motion-fade flex items-center justify-between" style={{ animationDelay: "180ms" }}>
        <h1 className="text-page font-extrabold text-white">{t("patientNew.title")}</h1>
        <button className="btn-ghost min-h-[48px] px-3" onClick={() => navigate(-1)} aria-label={t("common.back")}>
          <X className="size-6" aria-hidden="true" />
        </button>
      </div>

      {fieldError ? (
        <p role="alert" className="mt-3 motion-fade text-body font-bold text-danger" style={{ animationDelay: "220ms" }}>
          {fieldError}
        </p>
      ) : null}

      <div className="mt-4 motion-fade flex flex-col gap-5" style={{ animationDelay: "260ms" }}>
        <div className="motion-rise" style={{ animationDelay: "280ms" }}>
          <label htmlFor="pName" className="text-body font-bold text-white">
            {t("patientNew.name")}
          </label>
          <input
            id="pName"
            className="mt-1 input"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-4 gap-3">
          <div className="motion-rise" style={{ animationDelay: "300ms" }}>
            <label htmlFor="pAge" className="text-body font-bold text-white">
              {t("patientNew.age")}
            </label>
            <input
              id="pAge"
              inputMode="numeric"
              className="mt-1 min-h-[56px] w-full rounded-button border border-white/60 bg-white px-3 text-body font-extrabold"
              value={age}
              onChange={(e) => setAge(e.target.value.replace(/\D/g, ""))}
            />
          </div>
          <div className="col-span-3 motion-rise" role="group" aria-label={t("patientNew.sex")} style={{ animationDelay: "320ms" }}>
            <span className="text-body font-bold text-white" aria-hidden="true">{t("patientNew.sex")}</span>
            <div className="mt-1 grid grid-cols-3 gap-3">
              {SEX_OPTIONS.map(({ value, key, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setSex(value)}
                  aria-pressed={sex === value}
                  className={`flex min-h-[56px] flex-col items-center justify-center gap-1 rounded-button text-body font-bold ${
                    sex === value ? "bg-neem text-white" : "bg-mist text-neem-dark"
                  }`}
                >
                  <Icon className="size-5" aria-hidden="true" />
                  {t(`patientNew.${key}`)}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="motion-rise" style={{ animationDelay: "340ms" }}>
          <label htmlFor="pVillage" className="text-body font-bold text-white">
            {t("patientNew.village")}
          </label>
          <input
            id="pVillage"
            className="mt-1 input"
            value={village}
            onChange={(e) => setVillage(e.target.value)}
          />
        </div>

        <div className="motion-rise" style={{ animationDelay: "360ms" }}>
          <label htmlFor="pPhone" className="text-body font-bold text-white">
            {t("patientNew.phone")}
          </label>
          <input
            id="pPhone"
            inputMode="numeric"
            className="mt-1 input"
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
            placeholder={t("patientNew.phoneHint")}
          />
        </div>

        <div role="group" aria-label={t("patientNew.condition")} className="motion-rise" style={{ animationDelay: "380ms" }}>
          <span className="text-body font-bold text-white" aria-hidden="true">{t("patientNew.condition")}</span>
          <div className="mt-1 grid grid-cols-2 gap-3">
            {CONDITION_OPTIONS.map(({ value, icon: Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => setCondition(value)}
                aria-pressed={condition === value}
                className={`relative flex min-h-[88px] flex-col items-center justify-center gap-1.5 rounded-button px-2 py-3 text-body font-bold ${
                  condition === value ? "bg-neem text-white shadow-raised" : "border border-mist bg-white/90 text-neem-dark"
                }`}
              >
                <Icon className="size-7 shrink-0" aria-hidden="true" />
                <span>{t(`condition.${value}`)}</span>
                {condition === value ? (
                  <Check className="absolute right-2 top-2 size-5" strokeWidth={3} aria-hidden="true" />
                ) : null}
              </button>
            ))}
          </div>
        </div>

        <div className="motion-fade" style={{ animationDelay: "400ms" }}>
          <LanguageToggle labelKey="patientNew.preferredLang" />
        </div>

        <div className="motion-rise" style={{ animationDelay: "440ms" }}>
          <BigButton disabled={!basicOk} onClick={() => setSheetOpen(true)}>
            {t("patientNew.save")}
          </BigButton>
        </div>
      </div>

      <ConsentSheet
        open={sheetOpen}
        checked={consent}
        onCheck={setConsent}
        onClose={() => setSheetOpen(false)}
        onSave={() => void save()}
      />
    </VantagePageShell>
  );
}