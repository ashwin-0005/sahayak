import { useTranslation } from "react-i18next";
import { NavLink, useLocation } from "react-router-dom";
import { Home, Settings, SquarePlus, Users } from "lucide-react";

const NAV_ITEMS = [
  { to: "/home", key: "home", icon: Home, end: true },
  { to: "/patients", key: "patients", icon: Users, end: false },
  { to: "/patients/new", key: "add", icon: SquarePlus, end: false },
  { to: "/settings", key: "settings", icon: Settings, end: false }
];

const HIDE_NAV = ["/login"];

export function BottomNav() {
  const { t } = useTranslation();
  const { pathname } = useLocation();

  if (HIDE_NAV.some((p) => pathname.startsWith(p))) return null;

  return (
    <nav
      aria-label={t("a11y.navPrimary")}
      className="fixed inset-x-0 bottom-0 z-40 mx-auto h-16 max-w-[480px] border-t border-mist bg-paper"
    >
      <ul className="grid h-full grid-cols-4">
        {NAV_ITEMS.map(({ to, key, icon: Icon, end }) => (
          <li key={key}>
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex h-16 flex-col items-center justify-center gap-0.5 text-base font-semibold ${
                  isActive ? "text-neem" : "text-neem-dark"
                }`
              }
            >
              <Icon className="size-6" aria-hidden="true" />
              {t(`nav.${key}`)}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}