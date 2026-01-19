import { useMemo, useRef } from "react";

interface EmailSettingsPanelProps {
  availableHeaders: string[];
  sendEmail: boolean;
  onToggleSendEmail: (value: boolean) => void;
  emailColumn: string;
  onEmailColumnChange: (value: string) => void;
  filenameColumn: string;
  onFilenameColumnChange: (value: string) => void;
  emailSubject: string;
  onEmailSubjectChange: (value: string) => void;
  emailBody: string;
  onEmailBodyChange: (value: string) => void;
  emailCc: string;
  onEmailCcChange: (value: string) => void;
  emailBcc: string;
  onEmailBccChange: (value: string) => void;
}

/**
 * Email settings panel shown in the middle column.
 */
export function EmailSettingsPanel({
  availableHeaders,
  sendEmail,
  onToggleSendEmail,
  emailColumn,
  onEmailColumnChange,
  filenameColumn,
  onFilenameColumnChange,
  emailSubject,
  onEmailSubjectChange,
  emailBody,
  onEmailBodyChange,
  emailCc,
  onEmailCcChange,
  emailBcc,
  onEmailBccChange,
}: EmailSettingsPanelProps) {
  const emailBodyRef = useRef<HTMLTextAreaElement | null>(null);
  const defaultEmailColumn = useMemo(
    () => availableHeaders.find((header) => /email/i.test(header)) || "",
    [availableHeaders],
  );
  const defaultNameColumn = useMemo(
    () => availableHeaders.find((header) => /name/i.test(header)) || "",
    [availableHeaders],
  );

  const insertToken = (token: string) => {
    const textarea = emailBodyRef.current;
    if (!textarea) {
      onEmailBodyChange(`${emailBody}${token}`);
      return;
    }
    const start = textarea.selectionStart ?? emailBody.length;
    const end = textarea.selectionEnd ?? emailBody.length;
    const nextValue = `${emailBody.slice(0, start)}${token}${emailBody.slice(end)}`;
    onEmailBodyChange(nextValue);
    requestAnimationFrame(() => {
      textarea.focus();
      const cursor = start + token.length;
      textarea.setSelectionRange(cursor, cursor);
    });
  };

  const handleTokenDrop = (event: React.DragEvent<HTMLTextAreaElement>) => {
    event.preventDefault();
    const token = event.dataTransfer.getData("text/token");
    if (token) {
      insertToken(token);
    }
  };

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-base font-semibold text-slate-900">Email Settings</h3>
      <p className="text-xs text-slate-500">Send certificates by email after generation.</p>

      <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
        <label className="flex items-center gap-2 text-xs font-medium text-slate-700">
          <input
            type="checkbox"
            checked={sendEmail}
            onChange={(event) => onToggleSendEmail(event.target.checked)}
          />
          Send emails after generation
        </label>

        {sendEmail && (
          <div className="mt-3 grid gap-3">
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="text-xs font-medium text-slate-500">Email column</label>
                <select
                  value={emailColumn || defaultEmailColumn}
                  onChange={(event) => onEmailColumnChange(event.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                >
                  <option value="">Select column</option>
                  {availableHeaders.map((header) => (
                    <option key={header} value={header}>
                      {header}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500">Filename column</label>
                <select
                  value={filenameColumn || defaultNameColumn}
                  onChange={(event) => onFilenameColumnChange(event.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                >
                  <option value="">Select column</option>
                  {availableHeaders.map((header) => (
                    <option key={header} value={header}>
                      {header}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500">Subject</label>
              <input
                value={emailSubject}
                onChange={(event) => onEmailSubjectChange(event.target.value)}
                className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500">Body</label>
              <textarea
                value={emailBody}
                onChange={(event) => onEmailBodyChange(event.target.value)}
                rows={4}
                ref={emailBodyRef}
                onDragOver={(event) => event.preventDefault()}
                onDrop={handleTokenDrop}
                className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
              />
              {availableHeaders.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                  {availableHeaders.map((header) => {
                    const token = `{${header}}`;
                    return (
                      <button
                        key={header}
                        type="button"
                        draggable
                        onDragStart={(event) => event.dataTransfer.setData("text/token", token)}
                        onClick={() => insertToken(token)}
                        className="rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-100"
                      >
                        {token}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="text-xs font-medium text-slate-500">CC</label>
                <input
                  value={emailCc}
                  onChange={(event) => onEmailCcChange(event.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                  placeholder="cc1@example.com, cc2@example.com"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500">BCC</label>
                <input
                  value={emailBcc}
                  onChange={(event) => onEmailBccChange(event.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                  placeholder="bcc1@example.com, bcc2@example.com"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
