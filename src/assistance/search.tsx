"use client";

import { useState, useRef, useEffect, ChangeEvent, KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import PlusRoundedIcon from "@/components/icons/plus-rounded";
import { useRouter } from "next/navigation";
import { useDebounce } from "use-debounce";
import { Customer } from "@/customer/types";
import { searchCustomer } from "@/customer/api/client";
import { CUSTOMER_NEW, REGISTER_ASSISTANCE } from "@/consts/routes";
import Link from "next/link";

export default function AutocompleteInput() {
  const [inputValue, setInputValue] = useState("");
  const [selectedValue, setSelectedValue] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const router = useRouter();
  const [query] = useDebounce(inputValue, 750);
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;

    setLoading(true);
    setInputValue(value);
    setSelectedValue("");
    setIsOpen(value.length > 0);
    setHighlightedIndex(-1);
  };

  const handleOptionSelect = (option: Customer) => {
    setInputValue(`${option.first_name} ${option.last_name}`);
    setSelectedValue(option.id);
    setIsOpen(false);
    setHighlightedIndex(-1);
    inputRef.current?.focus();
  };

  const handleClear = () => {
    setInputValue("");
    setSelectedValue("");
    setIsOpen(false);
    setHighlightedIndex(-1);
    inputRef.current?.focus();
    setCustomers([]);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (!isOpen) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < customers.length - 1 ? prev + 1 : 0
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev > 0 ? prev - 1 : customers.length - 1
        );
        break;
      case "Enter":
        e.preventDefault();
        if (highlightedIndex >= 0 && customers[highlightedIndex]) {
          handleOptionSelect(customers[highlightedIndex]);
        }
        break;
      case "Escape":
        setIsOpen(false);
        setHighlightedIndex(-1);
        break;
    }
  };

  // Cerrar cuando se hace clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        inputRef.current &&
        !inputRef.current.contains(event.target as Node) &&
        listRef.current &&
        !listRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setHighlightedIndex(-1);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!query) return;
    const fetchCustomers = async () => {
      const dataCustomers = await searchCustomer(query);

      setCustomers(dataCustomers);
      setLoading(false);
    };

    fetchCustomers();
  }, [query]);

  const handleNavigation = () => {
    router.push(`${REGISTER_ASSISTANCE}/${selectedValue}`);
  };

  return (
    <div className="px-4 flex flex-col gap-14 w-full mt-16">
      <div className="space-y-2">
        <Label className="font-light" htmlFor="assistance">
          Registrar asistencia
        </Label>
        <div className="relative">
          <div className="relative">
            <Input
              ref={inputRef}
              className="w-full font-light"
              placeholder="¿A quien quieres registar hoy?"
              type="text"
              value={inputValue}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
            />
            {inputValue && (
              <Button
                className="absolute right-1 rounded-full top-1/2 -translate-y-1/2 h-6 w-6 p-0 hover:bg-transparent"
                size="icon"
                type="button"
                variant="ghost"
                onClick={handleClear}
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Limpiar</span>
              </Button>
            )}
          </div>

          {/* Lista de opciones */}
          {isOpen && (
            <ul
              ref={listRef}
              className="absolute z-50 w-full mt-1 bg-input-background border border-input-border shadow-lg max-h-60 overflow-auto font-light text-md rounded-[4px]"
            >
              {loading && (
                <li className="px-2 py-4 text-white/30 flex items-center justify-center border-b border-input-border">
                  Buscando...
                </li>
              )}
              {!loading &&
                customers.length > 0 &&
                customers.map((option, index) => {
                  return (
                    <li
                      key={option.id}
                      className={cn(
                        "px-2 py-4 cursor-pointer flex items-center justify-between hover:bg-input-hover-background border-b border-input-border",
                        highlightedIndex === index && "bg-input-hover-background",
                        selectedValue === option.id && "bg-input-hover-background"
                      )}
                      onClick={() => handleOptionSelect(option)}
                      onMouseEnter={() => setHighlightedIndex(index)}
                    >
                      <span className="capitalize">{`${option.first_name} ${option.last_name}`}</span>
                      {selectedValue === option.id && (
                        <Check className="h-4 w-4 text-white" />
                      )}
                    </li>
                  );
                })}
              {!loading && customers.length === 0 && (
                <li
                  className={cn(
                    "px-2 py-4 hover:cursor-default text-white/30 flex items-center justify-between border-b border-input-border"
                  )}
                >
                  <span>No se encontraron resultados</span>
                </li>
              )}
              <li
                className={cn(
                  "px-2 py-4 cursor-pointer hover:bg-input-hover-background gap-2"
                )}
              >
                <Link
                  className="flex justify-start gap-x-2 items-center"
                  href={CUSTOMER_NEW}
                >
                  <PlusRoundedIcon className="h-4 w-4 text-white/30" />
                  <span>Crear nuevo cliente</span>
                </Link>
              </li>
            </ul>
          )}
        </div>
      </div>
      {selectedValue && (
        <Button className="h-14" onClick={handleNavigation}>
          Buscar cliente
        </Button>
      )}
    </div>
  );
}
