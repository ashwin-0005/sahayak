import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { PageShell } from "../components/PageShell";
import { BigButton } from "../components/BigButton";

export default function LandingPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [showDemo, setShowDemo] = useState(false);

  return (
    <PageShell noNav>
      <div className="flex min-h-dvh flex-col items-center justify-center px-5 py-8 text-center">
        <h1 className="text-page font-extrabold text-ink">{t("landing.title")}</h1>
        <p className="mt-2 text-body font-semibold text-neem">{t("landing.tagline")}</p>

        <ul className="mt-6 w-full max-w-[320px] space-y-3 text-left">
          {[
            t("landing.feature1"),
            t("landing.feature2"),
            t("landing.feature3"),
          ].map((feature, i) => (
            <li key={i} className="flex items-start gap-3 text-body text-ink">
              <span className="mt-1.5 size-2 shrink-0 rounded-full bg-neem" aria-hidden="true" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>

        <div className="mt-8 w-full max-w-[320px]">
          <BigButton className="w-full" onClick={() => navigate("/login")}>
            {t("landing.continue")}
            <ChevronRight className="size-6" aria-hidden="true" />
          </BigButton>
        </div>

        <button
          type="button"
          className="mt-4 text-base font-semibold text-neem underline"
          onClick={() => setShowDemo(!showDemo)}
          aria-expanded={showDemo}
        >
          {showDemo ? t("landing.hideDemo") : t("landing.showDemo")}
        </button>

        {showDemo && (
          <div
            role="region"
            aria-label={t("landing.demoTitle")}
            className="mt-3 w-full max-w-[320px] rounded-card bg-mist p-4 text-left text-base text-ink"
          >
            <p className="font-semibold mb-2">{t("landing.demoTitle")}</p>
            <p className="mb-1">{t("landing.demoId")}</p>
            <p className="mb-3">{t("landing.demoPin")}</p>
            <BigButton
              variant="secondary"
              className="w-full"
              onClick={() => navigate("/login", { state: { workerId: "demo" } })}
            >
              {t("landing.openLogin")}
              <ChevronRight className="size-6" aria-hidden="true" />
            </BigButton>
          </div>
        )}
      </div>
    </PageShell>
  );
}