"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { ChevronDown, Check, Search } from "lucide-react";

export interface SelectOption {
  value: string;
  label: string;
  sublabel?: string;
  badge?: string;
}

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: (SelectOption | string)[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export const CustomSelect: React.FC<CustomSelectProps> = ({
  value,
  onChange,
  options,
  placeholder = "Select an option...",
  className = "",
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [openUpward, setOpenUpward] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  // Normalize options to SelectOption format
  const normalizedOptions: SelectOption[] = useMemo(() => options.map((opt) =>
    typeof opt === "string" ? { value: opt, label: opt } : opt
  ), [options]);

  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return normalizedOptions;
    const lowerQuery = searchQuery.toLowerCase();
    return normalizedOptions.filter((opt) => 
      opt.label.toLowerCase().includes(lowerQuery) || 
      opt.sublabel?.toLowerCase().includes(lowerQuery)
    );
  }, [normalizedOptions, searchQuery]);

  const selectedOption = normalizedOptions.find((opt) => opt.value === value);

  // Detect whether to open upward or downward based on viewport position
  useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      if (spaceBelow < 260 && rect.top > 260) {
        setOpenUpward(true);
      } else {
        setOpenUpward(false);
      }
    }
  }, [isOpen]);

  // Reset search when closed
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery("");
    }
  }, [isOpen]);

  // Close on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
      document.addEventListener("touchstart", handleOutsideClick);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("touchstart", handleOutsideClick);
    };
  }, [isOpen]);

  // Handle keyboard events
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (e.key === "Escape") {
      setIsOpen(false);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setIsOpen((prev) => !prev);
    } else if (e.key === "ArrowDown" && isOpen) {
      e.preventDefault();
      const currentIndex = normalizedOptions.findIndex((opt) => opt.value === value);
      const nextIndex = (currentIndex + 1) % normalizedOptions.length;
      onChange(normalizedOptions[nextIndex].value);
    } else if (e.key === "ArrowUp" && isOpen) {
      e.preventDefault();
      const currentIndex = normalizedOptions.findIndex((opt) => opt.value === value);
      const prevIndex = (currentIndex - 1 + normalizedOptions.length) % normalizedOptions.length;
      onChange(normalizedOptions[prevIndex].value);
    }
  };

  return (
    <div ref={containerRef} className={`relative select-none ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        onKeyDown={handleKeyDown}
        className={`w-full px-4 py-2.5 text-left rounded-2xl flex items-center justify-between transition-all outline-none border ${
          isOpen
            ? "bg-white border-slate-900 shadow-md ring-2 ring-slate-900/5"
            : "bg-slate-50 border-slate-200 hover:bg-slate-100/80 hover:border-slate-300"
        } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
      >
        <div className="flex items-center gap-2 truncate pr-2">
          {selectedOption ? (
            <div className="truncate">
              <span className="text-sm font-semibold text-slate-900">
                {selectedOption.label}
              </span>
              {selectedOption.sublabel && (
                <span className="text-xs text-slate-400 ml-1.5 font-normal">
                  {selectedOption.sublabel}
                </span>
              )}
            </div>
          ) : (
            <span className="text-sm font-medium text-slate-400">{placeholder}</span>
          )}
        </div>

        <ChevronDown
          className={`w-4 h-4 text-slate-500 shrink-0 transition-transform duration-200 ${
            isOpen ? "rotate-180 text-slate-900" : ""
          }`}
        />
      </button>

      {/* Popover Dropdown Menu */}
      {isOpen && (
        <div
          className={`absolute left-0 right-0 ${
            openUpward ? "bottom-full mb-1.5" : "top-full mt-1.5"
          } z-50 bg-white rounded-2xl border border-slate-200 shadow-2xl p-1.5 max-h-72 flex flex-col animate-in fade-in-0 duration-100`}
        >
          
          {/* Search Bar */}
          <div className="p-1 mb-1 border-b border-slate-100 shrink-0">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                autoFocus
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-slate-300 focus:bg-white transition-all"
              />
            </div>
          </div>

          <div className="overflow-y-auto space-y-1">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => {
                const isSelected = option.value === value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      onChange(option.value);
                      setIsOpen(false);
                    }}
                    className={`w-full px-3.5 py-2.5 text-left rounded-xl flex items-center justify-between text-xs transition-all ${
                      isSelected
                        ? "bg-slate-900 text-white font-bold shadow-xs"
                        : "text-slate-700 hover:bg-slate-100 hover:text-slate-900 font-medium"
                    }`}
                  >
                    <div className="flex flex-col truncate pr-2">
                      <span className="truncate">{option.label}</span>
                      {option.sublabel && (
                        <span
                          className={`text-[10px] truncate mt-0.5 ${
                            isSelected ? "text-slate-300" : "text-slate-400"
                          }`}
                        >
                          {option.sublabel}
                        </span>
                      )}
                    </div>

                    {isSelected && (
                      <Check className="w-4 h-4 text-emerald-400 shrink-0 ml-2" />
                    )}
                  </button>
                );
              })
            ) : (
              <div className="text-center py-4 text-xs text-slate-400 font-medium">
                No results found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
