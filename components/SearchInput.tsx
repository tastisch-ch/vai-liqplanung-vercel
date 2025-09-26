"use client";

import * as React from "react";
import { cx } from "@/lib/utils";
import { RiSearchLine } from "@remixicon/react";

type Props = {
  value?: string;
  onChange?: (val: string) => void;
  placeholder?: string;
  className?: string;
  name?: string;
  id?: string;
};

// Tremor-style Search Input (icon-left, neutral gray)
export function SearchInput({ value, onChange, placeholder = "Suche...", className, name, id }: Props) {
  const [internal, setInternal] = React.useState<string>(value ?? "");

  React.useEffect(() => { setInternal(value ?? ""); }, [value]);

  return (
    <div className={cx("relative", className)}>
      <RiSearchLine className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" aria-hidden="true" />
      <input
        id={id}
        name={name}
        type="text"
        value={internal}
        onChange={(e) => {
          const v = e.target.value;
          setInternal(v);
          onChange?.(v);
        }}
        placeholder={placeholder}
        className={
          "peer w-60 sm:w-72 appearance-none rounded-md border px-3 py-2 pl-9 text-sm outline-hidden transition-all " +
          "bg-white dark:bg-gray-950 border-gray-300 dark:border-gray-800 text-gray-900 dark:text-gray-50 placeholder-gray-400 dark:placeholder-gray-500 " +
          "hover:bg-gray-50 dark:hover:bg-gray-900/60 focus:ring-2 focus:ring-gray-200 focus:border-gray-400 dark:focus:ring-gray-700/30"
        }
      />
    </div>
  );
}


