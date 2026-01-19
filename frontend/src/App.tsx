import { useEffect, useMemo, useRef, useState } from "react";
import logo from "./assets/antoine-logo.png";
import { TemplateUploader } from "./components/TemplateUploader";
import { CertificateCanvas } from "./components/CertificateCanvas";
import { VariablesPanel } from "./components/VariablesPanel";
import { VariableEditor } from "./components/VariableEditor";
import { SelectedVariablesBar } from "./components/SelectedVariablesBar";
import { EmailSettingsPanel } from "./components/EmailSettingsPanel";
import { ExcelImporter } from "./components/ExcelImporter";
import { VariableMapper } from "./components/VariableMapper";
import { PDFGenerator } from "./components/PDFGenerator";
import { useCertificateContext } from "./context/CertificateContext";
import { createTextVariable } from "./utils/variableFactory";
import { applyMappings, buildAutoMappings } from "./utils/mapping";
import type { VariableMapping } from "./types/mapping.types";

const VARIABLE_NAME_REGEX = /^[a-z0-9_]+$/i;

/**
 * Root certificate generator application.
 */
function App() {
  const {
    template,
    variables,
    selectedVariableId,
    excelData,
    mappings,
    setTemplate,
    addVariable,
    updateVariable,
    removeVariable,
    setSelectedVariableId,
    setExcelData,
    setMappings,
  } = useCertificateContext();
  const [error, setError] = useState<string | null>(null);
  const [previewFirstRow, setPreviewFirstRow] = useState(false);
  const [zoom, setZoom] = useState(1.1);
  const generatorRef = useRef<HTMLDivElement | null>(null);
  const [sendEmail, setSendEmail] = useState(false);
  const [emailSubject, setEmailSubject] = useState("Your certificate");
  const [emailBody, setEmailBody] = useState("Please find your certificate attached.");
  const [emailCc, setEmailCc] = useState("");
  const [emailBcc, setEmailBcc] = useState("");
  const [emailColumn, setEmailColumn] = useState("");
  const [filenameColumn, setFilenameColumn] = useState("");

  const selectedVariable = useMemo(
    () => variables.find((variable) => variable.id === selectedVariableId) || null,
    [variables, selectedVariableId],
  );

  const previewTextMap = useMemo(() => {
    if (!previewFirstRow || !excelData) return null;
    const mappedRows = applyMappings(variables, excelData, mappings);
    return mappedRows[0] || null;
  }, [previewFirstRow, excelData, variables, mappings]);

  const getUniqueName = (baseName: string) => {
    let name = baseName;
    let counter = 1;
    while (variables.some((variable) => variable.name.toLowerCase() === name.toLowerCase())) {
      name = `${baseName}_${counter}`;
      counter += 1;
    }
    return name;
  };

  useEffect(() => {
    if (!excelData) {
      setMappings([]);
      return;
    }
    setMappings((prev: VariableMapping[]) => {
      if (prev.length === variables.length) return prev;
      const auto = buildAutoMappings(variables, excelData);
      return auto.map(
        (entry) =>
          prev.find((item: VariableMapping) => item.variableName === entry.variableName) || entry,
      );
    });
  }, [excelData, variables, setMappings]);

  const handleAddVariable = (name: string, x = 120, y = 120) => {
    if (!VARIABLE_NAME_REGEX.test(name)) {
      setError("Variable names must be alphanumeric with underscores only.");
      return;
    }
    if (variables.some((variable) => variable.name.toLowerCase() === name.toLowerCase())) {
      setError("Variable names must be unique.");
      return;
    }
    addVariable(createTextVariable(name, x, y));
    setError(null);
  };

  const handleDuplicate = (id: string) => {
    const variable = variables.find((item) => item.id === id);
    if (!variable) return;
    addVariable({
      ...variable,
      id: crypto.randomUUID(),
      name: getUniqueName(`${variable.name}_copy`),
      x: variable.x + 20,
      y: variable.y + 20,
    });
  };

  const handleZoomChange = (value: number) => {
    setZoom(Math.min(2, Math.max(0.5, Number(value.toFixed(2)))));
  };


  return (
    <div className="min-h-screen bg-slate-100 pb-16">
      <header className="border-b border-slate-200 bg-white">
        <div className="flex w-full items-center justify-between px-2 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-16 w-16 items-center justify-center rounded-md bg-white">
              <img src={logo} alt="Antoine logo" className="h-14 w-14 object-contain" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-slate-900">Certificate Generator</h1>
              <p className="text-sm text-slate-500">Build certificates with drag-and-drop variables.</p>
            </div>
          </div>
        </div>
      </header>

      <main className="mt-6 grid w-full items-start gap-4 px-0 lg:grid-cols-[280px_1fr_340px]">
        <div className="space-y-4">
          {template && <TemplateUploader template={template} onUpload={setTemplate} />}
          {template && (
            <VariablesPanel
              variables={variables}
              selectedVariableId={selectedVariableId}
              onSelect={setSelectedVariableId}
              onAddVariable={(name) => handleAddVariable(name)}
              onQuickAdd={(name) => handleAddVariable(name)}
              onDeleteVariable={removeVariable}
              onDuplicateVariable={handleDuplicate}
            />
          )}
        </div>

        <div className="space-y-4">
          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Certificate Canvas</h2>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span>Zoom</span>
                <button
                  type="button"
                  onClick={() => handleZoomChange(zoom - 0.1)}
                  className="rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-600"
                >
                  -
                </button>
                <input
                  type="range"
                  min={0.5}
                  max={2}
                  step={0.1}
                  value={zoom}
                  onChange={(event) => handleZoomChange(Number(event.target.value))}
                  className="w-24"
                />
                <button
                  type="button"
                  onClick={() => handleZoomChange(zoom + 0.1)}
                  className="rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-600"
                >
                  +
                </button>
                <span>{Math.round(zoom * 100)}%</span>
              </div>
            </div>
          </div>
          <CertificateCanvas
            key={`${template?.id ?? "template"}-${previewFirstRow ? "preview" : "normal"}`}
            template={template}
            variables={variables}
            selectedVariableId={selectedVariableId}
            onSelect={setSelectedVariableId}
            onUpdate={updateVariable}
            onPlaceVariable={(name, x, y) => handleAddVariable(name, x, y)}
            previewTextMap={previewTextMap}
            zoom={zoom}
            onTemplateUpload={setTemplate}
          />
          {template && (
            <>
              <ExcelImporter excelData={excelData} onImport={setExcelData} />
              <VariableMapper
                variables={variables}
                excelData={excelData}
                mappings={mappings}
                onChange={setMappings}
                previewFirstRow={previewFirstRow}
                onTogglePreview={setPreviewFirstRow}
              />
              {excelData && (
                <EmailSettingsPanel
                  availableHeaders={excelData.headers}
                  sendEmail={sendEmail}
                  onToggleSendEmail={setSendEmail}
                  emailColumn={emailColumn}
                  onEmailColumnChange={setEmailColumn}
                  filenameColumn={filenameColumn}
                  onFilenameColumnChange={setFilenameColumn}
                  emailSubject={emailSubject}
                  onEmailSubjectChange={setEmailSubject}
                  emailBody={emailBody}
                  onEmailBodyChange={setEmailBody}
                  emailCc={emailCc}
                  onEmailCcChange={setEmailCc}
                  emailBcc={emailBcc}
                  onEmailBccChange={setEmailBcc}
                />
              )}
            </>
          )}
        </div>

        <div className="space-y-4">
          {template && (
            <>
              <SelectedVariablesBar
                variables={variables}
                selectedVariableId={selectedVariableId}
                onSelect={setSelectedVariableId}
              />
              <VariableEditor
                variable={selectedVariable}
                onChange={(updates) => selectedVariable && updateVariable(selectedVariable.id, updates)}
              />
            </>
          )}
          {excelData && (
            <div ref={generatorRef}>
              <PDFGenerator
                template={template}
                variables={variables}
                excelData={excelData}
                mappings={mappings}
                sendEmail={sendEmail}
                emailSubject={emailSubject}
                emailBody={emailBody}
                emailCc={emailCc}
                emailBcc={emailBcc}
                emailColumn={emailColumn}
                filenameColumn={filenameColumn}
              />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
