import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Baby, Droplets, HeartPulse, Stethoscope, UserRound, Users, X } from "lucide-react";
import type { ComponentType } from "react";
import { PageShell } from "../components/PageShell";
import { BigButton } from "../components/BigButton";
import { ConsentSheet } from "../components/ConsentSheet";
import { createPatient } from "../db/repo";
import { newId } from "../lib/ids";
import type { Condition, Language, Patient, Sex } from "../types";

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
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [sex, setSex] = useState<Sex>("F");
  const [village, setVillage] = useState("");
  const [phone, setPhone] = useState("");
  const [condition, setCondition] = useState<Condition>("hypertension");
  const [language, setLanguage] = useState<Language>("hi");
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
      language,
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
    <PageShell>
      <div className="flex items-center justify-between">
        <h1 className="text-page font-extrabold">{t("patientNew.title")}</h1>
        <button className="btn-ghost min-h-[48px] px-3" onClick={() => navigate(-1)} aria-label={t("common.back")}>
          <X className="size-6" aria-hidden="true" />
        </button>
      </div>

      {fieldError ? (
        <p role="alert" className="mt-3 text-body font-bold text-urgent">
          {fieldError}
        </p>
      ) : null}

      <div className="mt-4 flex flex-col gap-5">
        <div>
          <label htmlFor="pName" className="text-body font-bold text-ink">
            {t("patientNew.name")}
          </label>
          <input
            id="pName"
            className="mt-1 min-h-[56px] w-full rounded-button border border-mist bg-white px-4"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-4 gap-3">
          <div>
            <label htmlFor="pAge" className="text-body font-bold text-ink">
              {t("patientNew.age")}
            </label>
            <input
              id="pAge"
              inputMode="numeric"
              className="mt-1 min-h-[56px] w-full rounded-button border border-mist bg-white px-3 text-xl font-extrabold"
              value={age}
              onChange={(e) => setAge(e.target.value.replace(/\D/g, ""))}
            />
          </div>
          <div className="col-span-3" role="group" aria-label={t("patientNew.sex")}>
            <span className="text-body font-bold text-ink" aria-hidden="true">{t("patientNew.sex")}</span>
            <div className="mt-1 grid grid-cols-3 gap-3">
              {SEX_OPTIONS.map(({ value, key, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setSex(value)}
                  aria-pressed={sex === value}
                  className={`flex min-h-[56px] flex-col items-center justify-center gap-1 rounded-button text-base font-bold ${
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

        <div>
          <label htmlFor="pVillage" className="text-body font-bold text-ink">
            {t("patientNew.village")}
          </label>
          <input
            id="pVillage"
            className="mt-1 min-h-[56px] w-full rounded-button border border-mist bg-white px-4"
            value={village}
            onChange={(e) => setVillage(e.target.value)}
          />
        </div>

        <div>
          <label htmlFor="pPhone" className="text-body font-bold text-ink">
            {t("patientNew.phone")}
          </label>
          <input
            id="pPhone"
            inputMode="numeric"
            className="mt-1 min-h-[56px] w-full rounded-button border border-mist bg-white px-4"
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
            placeholder={t("patientNew.phoneHint")}
          />
        </div>

        <div role="group" aria-label={t("patientNew.condition")}>
          <span className="text-body font-bold text-ink" aria-hidden="true">{t("patientNew.condition")}</span>
          <div className="mt-1 grid grid-cols-2 gap-3">
            {CONDITION_OPTIONS.map(({ value, icon: Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => setCondition(value)}
                aria-pressed={condition === value}
                className={`flex min-h-[64px] items-center gap-2 rounded-button px-4 text-body font-bold ${
                  condition === value ? "bg-neem text-white" : "bg-mist text-neem-dark"
                }`}
              >
                <Icon className="size-6 shrink-0" aria-hidden="true" />
                {t(`condition.${value}`)}
              </button>
            ))}
          </div>
        </div>

        <div role="group" aria-label={t("patientNew.preferredLang")}>
          <span className="text-body font-bold text-ink" aria-hidden="true">{t("patientNew.preferredLang")}</span>
          <div className="mt-1 grid grid-cols-2 gap-3">
            {(["en", "hi"] as Language[]).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setLanguage(l)}
                aria-pressed={language === l}
                className={`min-h-[56px] rounded-button text-body font-bold ${
                  language === l ? "bg-neem text-white" : "bg-mist text-neem-dark"
                }`}
              >
                {l === "en" ? "English" : "हिन्दी"}
              </button>
            ))}
          </div>
        </div>

        <BigButton disabled={!basicOk} onClick={() => setSheetOpen(true)}>
          {t("patientNew.save")}
        </BigButton>
      </div>

      <ConsentSheet
        open={sheetOpen}
        checked={consent}
        onCheck={setConsent}
        onClose={() => setSheetOpen(false)}
        onSave={() => void save()}
      />
    </PageShell>
  );
}