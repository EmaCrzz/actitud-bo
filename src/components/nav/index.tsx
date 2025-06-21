"use client";

import { cn } from "@/lib/utils";
import HomeIcon from "@/components/icons/home";
import PersonsIcon from "@/components/icons/persons";
import StatsIcon from "@/components/icons/stats";
import PersonPlus from "@/components/icons/person-plus";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { ROUTES } from "@/consts/routes";

const navigationItems = [
  {
    id: ROUTES.HOME,
    icon: HomeIcon,
    href: ROUTES.HOME,
  },
  {
    id: ROUTES.CUSTOMER,
    icon: PersonsIcon,
    href: ROUTES.CUSTOMER,
  },
  {
    id: ROUTES.STATS,
    icon: StatsIcon,
    href: ROUTES.STATS,
    disabled: false,
  },
  {
    id: ROUTES.CUSTOMER_NEW,
    icon: PersonPlus,
    href: ROUTES.CUSTOMER_NEW,
    disabled: false,
  },
];

export default function FooterNavigation() {
  const pathname = usePathname();

  return (
    <nav className="p-4 pb-9 safe-area-pb shadow-[0px_0px_8px_0px_rgba(255,255,255,0.30)] rounded-t-[8px]">
      <div className="max-w-3xl mx-auto">
        <ul className="flex justify-around items-center">
          {navigationItems.map(({ icon, id, disabled, href }) => {
            const Icon = icon;
            const isActive = pathname === id;

            return (
              <li key={id}>
                <button
                  className={cn(
                    "flex flex-col items-center justify-center p-2 rounded-lg transition-colors duration-200 min-w-[60px] hover:cursor-pointer",
                    isActive
                      ? "white"
                      : disabled
                      ? "text-white/20 hover:cursor-not-allowed"
                      : "text-white/20 hover:text-gray-700"
                  )}
                >
                  {disabled && (
                    <Icon
                      className={cn("size-8 transition-all duration-200")}
                    />
                  )}
                  {!disabled && (
                    <Link href={href}>
                      <Icon
                        className={cn("size-8 transition-all duration-200")}
                      />
                    </Link>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
