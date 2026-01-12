"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import LogoutButton from "./LogoutButton";

interface MenuItem {
  icon: string;
  label: string;
  href: string;
  visible: string[];
}

interface MenuSection {
  title: string;
  items: MenuItem[];
}

interface MenuClientProps {
  sections: MenuSection[];
  role: string | null;
}

const MenuClient = ({ sections, role }: MenuClientProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const root = document.querySelector<HTMLElement>('[data-dashboard-layout-root]');

    if (!root) {
      return () => {
        // no-op cleanup when root is not found
      };
    }

    if (isExpanded) {
      root.classList.add("sidebar-expanded");
    } else {
      root.classList.remove("sidebar-expanded");
    }

    return () => {
      root.classList.remove("sidebar-expanded");
    };
  }, [isExpanded]);

  const handleToggle = () => {
    setIsExpanded((previous) => !previous);
  };

  return (
    <div className="mt-4 text-sm">
      <button
        type="button"
        onClick={handleToggle}
        className="mb-2 flex w-full items-center justify-center lg:justify-start gap-2 text-gray-500 py-2 md:px-2 rounded-md hover:bg-lamaSkyLight"
        aria-label={isExpanded ? "Collapse menu" : "Expand menu"}
        title={isExpanded ? "Collapse menu" : "Expand menu"}
      >
        <Image src="/stairs.png" alt="" width={18} height={18} />
      </button>

      {sections.map((section) => {
        const financeItems = section.items.filter(
          (item) =>
            item.href.startsWith("/finance/") &&
            (item.visible.includes("admin") || item.visible.includes("accountant")),
        );

        const otherItems = section.items.filter((item) => !financeItems.includes(item));

        const showFinanceGroup =
          financeItems.length > 0 && (role === "admin" || role === "accountant");

        return (
          <div className="flex flex-col gap-2" key={section.title}>
            <span
              className={`${isExpanded ? "block" : "hidden"} lg:block text-gray-400 font-light my-4`}
            >
              {section.title}
            </span>

            {otherItems.map((item) => {
              if (!role || !item.visible.includes(role)) {
                return null;
              }

              if (item.label === "Logout") {
                return (
                  <div
                    key={item.label}
                    className="flex items-center justify-center lg:justify-start gap-4 text-gray-500 py-2 md:px-2 rounded-md hover:bg-lamaSkyLight"
                  >
                    <Image src={item.icon} alt="" width={20} height={20} />
                    <span
                      className={`${isExpanded ? "block" : "hidden"} lg:block flex-1`}
                    >
                      {item.label}
                    </span>
                    <LogoutButton />
                  </div>
                );
              }

              return (
                <Link
                  href={item.href}
                  key={item.label}
                  className="flex items-center justify-center lg:justify-start gap-4 text-gray-500 py-2 md:px-2 rounded-md hover:bg-lamaSkyLight"
                >
                  <Image src={item.icon} alt="" width={20} height={20} />
                  <span
                    className={`${isExpanded ? "block" : "hidden"} lg:block`}
                  >
                    {item.label}
                  </span>
                </Link>
              );
            })}

            {showFinanceGroup && (
              <details className="mt-1">
                <summary className="flex cursor-pointer items-center justify-center lg:justify-start gap-4 text-gray-500 py-2 md:px-2 rounded-md hover:bg-lamaSkyLight">
                  <Image src="/finance.png" alt="" width={20} height={20} />
                  <span
                    className={`${isExpanded ? "block" : "hidden"} lg:block`}
                  >
                    Finance
                  </span>
                </summary>
                <div className="mt-1 flex flex-col gap-1 lg:ml-6">
                  {financeItems.map((item) => {
                    if (!role || !item.visible.includes(role)) {
                      return null;
                    }

                    return (
                      <Link
                        href={item.href}
                        key={item.label}
                        className="flex items-center justify-center lg:justify-start gap-3 text-gray-500 py-1.5 md:px-2 rounded-md hover:bg-lamaSkyLight"
                      >
                        <Image src={item.icon} alt="" width={18} height={18} />
                        <span
                          className={`${isExpanded ? "block" : "hidden"} lg:block text-xs`}
                        >
                          {item.label}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </details>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default MenuClient;
