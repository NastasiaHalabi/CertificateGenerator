import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { CertificateTemplate } from "../types/template.types";
import type { ExcelData } from "../types/excel.types";
import type { VariableMapping } from "../types/mapping.types";
import type { TextVariable } from "../types/variable.types";

interface CertificateContextValue {
  template: CertificateTemplate | null;
  variables: TextVariable[];
  selectedVariableId: string | null;
  excelData: ExcelData | null;
  mappings: VariableMapping[];
  setTemplate: (template: CertificateTemplate | null) => void;
  setVariables: (variables: TextVariable[]) => void;
  updateVariable: (id: string, updates: Partial<TextVariable>) => void;
  addVariable: (variable: TextVariable) => void;
  removeVariable: (id: string) => void;
  setSelectedVariableId: (id: string | null) => void;
  setExcelData: (data: ExcelData | null) => void;
  setMappings: (mappings: VariableMapping[] | ((prev: VariableMapping[]) => VariableMapping[])) => void;
}

const CertificateContext = createContext<CertificateContextValue | undefined>(undefined);

export function CertificateProvider({ children }: { children: React.ReactNode }) {
  const [template, setTemplate] = useState<CertificateTemplate | null>(null);
  const [variables, setVariables] = useState<TextVariable[]>([]);
  const [selectedVariableId, setSelectedVariableId] = useState<string | null>(null);
  const [excelData, setExcelData] = useState<ExcelData | null>(null);
  const [mappings, setMappingsState] = useState<VariableMapping[]>([]);

  const updateVariable = useCallback((id: string, updates: Partial<TextVariable>) => {
    setVariables((prev) =>
      prev.map((variable) =>
        variable.id === id
          ? {
              ...variable,
              ...Object.fromEntries(
                Object.entries(updates).filter(([, value]) => value !== undefined),
              ),
            }
          : variable,
      ),
    );
  }, []);

  const addVariable = useCallback((variable: TextVariable) => {
    setVariables((prev) => [...prev, variable]);
  }, []);

  const removeVariable = useCallback((id: string) => {
    setVariables((prev) => prev.filter((variable) => variable.id !== id));
    setSelectedVariableId((prev) => (prev === id ? null : prev));
  }, []);

  const value = useMemo(
    () => ({
      template,
      variables,
      selectedVariableId,
      excelData,
      mappings,
      setTemplate,
      setVariables,
      updateVariable,
      addVariable,
      removeVariable,
      setSelectedVariableId,
      setExcelData,
      setMappings: setMappingsState,
    }),
    [
      template,
      variables,
      selectedVariableId,
      excelData,
      mappings,
      updateVariable,
      addVariable,
      removeVariable,
    ],
  );

  return <CertificateContext.Provider value={value}>{children}</CertificateContext.Provider>;
}

export function useCertificateContext() {
  const context = useContext(CertificateContext);
  if (!context) {
    throw new Error("useCertificateContext must be used within CertificateProvider");
  }
  return context;
}
