import { useMemo, useRef, useState } from "react";
import {
  activateValidatedCandidate,
  cancelCandidate,
  replaceCandidate,
} from "../import/activation";
import { IMPORT_LIMITS, IMPORT_RULES } from "../import/config";
import {
  analyseHeaders,
  suggestMapping,
} from "../import/mapping";
import { ImportFileError, parseLocalFile } from "../import/parsers";
import {
  DECISIONDECK_FIELDS,
  type ActiveDataset,
  type ColumnMapping,
  type DecisionDeckField,
  type ImportCandidate,
  type RawCell,
} from "../import/types";
import { validateSheet } from "../import/validation";

type ImportPhase =
  | "empty"
  | "reading"
  | "preview"
  | "validating"
  | "invalid"
  | "valid"
  | "active-import"
  | "reset"
  | "error";

const fieldLabels: Record<DecisionDeckField, string> = {
  id: "Case ID",
  category: "Symptom category",
  complete: "Information complete",
  safetyCritical: "Safety-critical flag",
  referenceUrgency: "Reference urgency",
  predictedUrgency: "Predicted urgency",
  assessmentMinutes: "Assessment minutes",
};

function displayCell(value: RawCell | undefined): string {
  if (value === null || value === undefined || value === "") return "—";
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

export function DataImportPanel({
  activeDataset,
  onActivate,
  onReset,
}: {
  activeDataset: ActiveDataset;
  onActivate: (dataset: ActiveDataset) => void;
  onReset: () => void;
}) {
  const [candidate, setCandidate] = useState<ImportCandidate | null>(null);
  const [phase, setPhase] = useState<ImportPhase>(
    activeDataset.provenance.sourceType === "synthetic-demo"
      ? "empty"
      : "active-import",
  );
  const [statusMessage, setStatusMessage] = useState(
    "Synthetic demo dataset is active.",
  );
  const [errorMessage, setErrorMessage] = useState("");
  const statusRef = useRef<HTMLDivElement>(null);

  const sheet = candidate
    ? candidate.workbook.sheets[candidate.selectedSheetIndex]
    : null;
  const headerAnalysis = useMemo(
    () => analyseHeaders(sheet?.rows[0]),
    [sheet],
  );
  const previewRows = sheet?.rows.slice(1, IMPORT_LIMITS.previewRows + 1) ?? [];

  const announce = (message: string) => {
    setStatusMessage(message);
    window.requestAnimationFrame(() => statusRef.current?.focus());
  };

  const createCandidate = (
    workbook: Awaited<ReturnType<typeof parseLocalFile>>,
    selectedSheetIndex = 0,
  ): ImportCandidate => {
    const selectedSheet = workbook.sheets[selectedSheetIndex];
    return {
      workbook,
      selectedSheetIndex,
      mapping: suggestMapping(
        analyseHeaders(selectedSheet?.rows[0]).headers,
      ),
      validation: null,
    };
  };

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setPhase("reading");
    setErrorMessage("");
    announce(`Reading ${file.name} locally in this browser.`);
    try {
      const workbook = await parseLocalFile(file);
      if (workbook.sheets.length === 0) {
        throw new ImportFileError(
          "The workbook does not contain any readable sheets.",
          "parse-error",
        );
      }
      const next = createCandidate(workbook);
      setCandidate((current) => replaceCandidate(current, next));
      setPhase("preview");
      announce(
        `${file.name} is ready. Inspect the selected sheet and column mappings.`,
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "The selected file could not be read.";
      setCandidate(cancelCandidate());
      setErrorMessage(message);
      setPhase("error");
      announce(`Import error. ${message}`);
    }
  };

  const handleSheetChange = (selectedSheetIndex: number) => {
    if (!candidate) return;
    const next = createCandidate(candidate.workbook, selectedSheetIndex);
    setCandidate(next);
    setPhase("preview");
    announce(
      `Selected sheet ${candidate.workbook.sheets[selectedSheetIndex].name}. Review the mappings and validate again.`,
    );
  };

  const handleMappingChange = (
    field: DecisionDeckField,
    value: string,
  ) => {
    if (!candidate) return;
    const mapping: ColumnMapping = {
      ...candidate.mapping,
      [field]: value === "" ? null : Number(value),
    };
    setCandidate({ ...candidate, mapping, validation: null });
    setPhase("preview");
  };

  const handleValidate = () => {
    if (!candidate || !sheet) return;
    setPhase("validating");
    announce("Validating mapped rows.");
    window.setTimeout(() => {
      const validation = validateSheet(
        sheet,
        candidate.mapping,
        candidate.workbook.sourceType,
      );
      setCandidate({ ...candidate, validation });
      setPhase(validation.valid ? "valid" : "invalid");
      announce(
        validation.valid
          ? `${validation.rowCount} rows passed structural validation. Confirmation is required before activation.`
          : `Validation found ${validation.issues.length} blocking issues. The active dataset has not changed.`,
      );
    }, 0);
  };

  const handleConfirm = () => {
    if (!candidate?.validation?.valid) return;
    const active = activateValidatedCandidate(
      candidate,
      candidate.validation,
      new Date().toISOString(),
    );
    onActivate(active);
    setCandidate(cancelCandidate());
    setPhase("active-import");
    announce(
      `${active.provenance.displayName} is now active. KPIs, quality gates, scenarios and decision readiness have been recalculated.`,
    );
  };

  const handleCancel = () => {
    setCandidate(cancelCandidate());
    setErrorMessage("");
    setPhase(
      activeDataset.provenance.sourceType === "synthetic-demo"
        ? "empty"
        : "active-import",
    );
    announce("Pending import cancelled. The active dataset did not change.");
  };

  const handleReset = () => {
    onReset();
    setCandidate(cancelCandidate());
    setErrorMessage("");
    setPhase("reset");
    announce("The original 48-case synthetic demo dataset has been restored.");
  };

  const selectedColumns = candidate
    ? new Set(
        Object.values(candidate.mapping).filter(
          (value): value is number => value !== null,
        ),
      )
    : new Set<number>();

  return (
    <section className="import-panel" aria-labelledby="import-title">
      <div className="import-panel__heading">
        <div>
          <span className="section-index">LOCAL DATA IMPORT</span>
          <h3 id="import-title">CSV/XLSX validation workspace</h3>
        </div>
        <span className="status status--neutral">
          {activeDataset.provenance.sourceType === "synthetic-demo"
            ? "Demo active"
            : "Imported data active"}
        </span>
      </div>

      <p className="import-intro">
        Files are processed locally in memory and are not uploaded or stored.
        Do not use identifiable patient or confidential operational data.
      </p>

      <div className="active-dataset-card">
        <div>
          <span>Active evidence source</span>
          <strong>{activeDataset.provenance.displayName}</strong>
        </div>
        <dl>
          <div>
            <dt>Source</dt>
            <dd>{activeDataset.provenance.sourceType}</dd>
          </div>
          <div>
            <dt>Rows</dt>
            <dd>{activeDataset.provenance.rowCount}</dd>
          </div>
          {activeDataset.provenance.sheetName && (
            <div>
              <dt>Sheet</dt>
              <dd>{activeDataset.provenance.sheetName}</dd>
            </div>
          )}
          {activeDataset.provenance.importedAt && (
            <div>
              <dt>Imported</dt>
              <dd>
                {new Date(
                  activeDataset.provenance.importedAt,
                ).toLocaleString()}
              </dd>
            </div>
          )}
        </dl>
      </div>

      <div className="import-actions">
        <label className="file-picker">
          <span>
            {candidate ? "Replace pending file" : "Select CSV or XLSX file"}
          </span>
          <input
            type="file"
            accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={(event) => {
              const file = event.currentTarget.files?.[0];
              void handleFile(file);
              event.currentTarget.value = "";
            }}
          />
        </label>
        {candidate && (
          <button
            className="button button--secondary"
            type="button"
            onClick={handleCancel}
          >
            Cancel staged import
          </button>
        )}
        {activeDataset.provenance.sourceType !== "synthetic-demo" && (
          <button
            className="button button--secondary"
            type="button"
            onClick={handleReset}
          >
            Reset to synthetic demo
          </button>
        )}
      </div>

      <p className="import-limits">
        Limits: {IMPORT_LIMITS.maxFileLabel},{" "}
        {IMPORT_LIMITS.maxDataRows.toLocaleString()} data rows,{" "}
        {IMPORT_LIMITS.maxColumns} columns and {IMPORT_LIMITS.previewRows} preview
        rows. Supported formats: CSV and XLSX only.
      </p>

      <div
        className="import-live"
        ref={statusRef}
        role="status"
        aria-live="polite"
        tabIndex={-1}
      >
        {phase === "reading" && <span className="import-spinner" aria-hidden />}
        {statusMessage}
      </div>

      {phase === "error" && (
        <div className="import-error" role="alert">
          <strong>File not accepted</strong>
          <p>{errorMessage}</p>
        </div>
      )}

      {candidate && sheet && (
        <>
          {candidate.workbook.sourceType === "xlsx-import" &&
            candidate.workbook.sheets.length > 1 && (
              <label className="sheet-selector">
                <span>Workbook sheet</span>
                <select
                  value={candidate.selectedSheetIndex}
                  onChange={(event) =>
                    handleSheetChange(Number(event.target.value))
                  }
                >
                  {candidate.workbook.sheets.map((workbookSheet, index) => (
                    <option value={index} key={workbookSheet.name}>
                      {workbookSheet.name}
                    </option>
                  ))}
                </select>
              </label>
            )}

          <div className="import-summary">
            <span>Selected sheet: {sheet.name}</span>
            <span>
              Detected rows: {Math.max(sheet.rows.length - 1, 0)}
            </span>
            <span>Detected columns: {headerAnalysis.headers.length}</span>
            <span>Formula cells detected: {sheet.formulaCells.length}</span>
          </div>

          <div className="import-table-wrap" tabIndex={0}>
            <table className="preview-table">
              <caption>
                Raw preview of up to {IMPORT_LIMITS.previewRows} data rows
              </caption>
              <thead>
                <tr>
                  <th scope="col">Source row</th>
                  {headerAnalysis.headers.map((header, index) => (
                    <th scope="col" key={`${header}-${index}`}>
                      {header || `Blank header ${index + 1}`}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewRows.length === 0 ? (
                  <tr>
                    <td colSpan={headerAnalysis.headers.length + 1}>
                      No previewable data rows.
                    </td>
                  </tr>
                ) : (
                  previewRows.map((row, rowIndex) => (
                    <tr key={rowIndex}>
                      <th scope="row">{rowIndex + 2}</th>
                      {headerAnalysis.headers.map((_, columnIndex) => (
                        <td key={columnIndex}>
                          {displayCell(row[columnIndex])}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="mapping-section">
            <div>
              <span className="section-index">COLUMN MAPPING</span>
              <h4>Map every required DecisionDeck field</h4>
            </div>
            <div className="mapping-grid">
              {DECISIONDECK_FIELDS.map((field) => {
                const current = candidate.mapping[field];
                return (
                  <label key={field}>
                    <span>{fieldLabels[field]}</span>
                    <select
                      value={current ?? ""}
                      onChange={(event) =>
                        handleMappingChange(field, event.target.value)
                      }
                    >
                      <option value="">Not mapped</option>
                      {headerAnalysis.headers.map((header, index) => (
                        <option
                          value={index}
                          key={`${header}-${index}`}
                          disabled={
                            selectedColumns.has(index) && current !== index
                          }
                        >
                          {header || `Blank header ${index + 1}`}
                        </option>
                      ))}
                    </select>
                  </label>
                );
              })}
            </div>
            <div className="import-rules">
              <p>{IMPORT_RULES.whitespace}</p>
              <p>{IMPORT_RULES.booleans}</p>
              <p>{IMPORT_RULES.enums}</p>
              <p>{IMPORT_RULES.formulas}</p>
            </div>
            <button
              className="button button--primary"
              type="button"
              onClick={handleValidate}
              disabled={phase === "validating"}
            >
              {phase === "validating" ? "Validating…" : "Validate mapped data"}
            </button>
          </div>

          {candidate.validation && !candidate.validation.valid && (
            <div className="validation-results" role="alert">
              <div>
                <span className="section-index">BLOCKING ISSUES</span>
                <h4>
                  {candidate.validation.issues.length} issues must be resolved
                </h4>
                <p>
                  The active dataset is unchanged. Correct the source file or
                  mapping, then rerun validation.
                </p>
              </div>
              <div className="import-table-wrap" tabIndex={0}>
                <table className="issue-table">
                  <caption>Row-level import issues</caption>
                  <thead>
                    <tr>
                      <th scope="col">Row</th>
                      <th scope="col">Field</th>
                      <th scope="col">Issue</th>
                      <th scope="col">Correction</th>
                    </tr>
                  </thead>
                  <tbody>
                    {candidate.validation.issues.map((validationIssue, index) => (
                      <tr
                        key={`${validationIssue.code}-${validationIssue.row}-${index}`}
                      >
                        <td>{validationIssue.row ?? "File"}</td>
                        <td>{validationIssue.field ?? "Structure"}</td>
                        <td>{validationIssue.message}</td>
                        <td>{validationIssue.correction}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {candidate.validation?.valid && (
            <div className="validation-ready">
              <div>
                <span className="section-index">VALIDATED CANDIDATE</span>
                <h4>
                  {candidate.validation.rowCount} rows are ready for confirmation
                </h4>
                <p>
                  KPIs remain unchanged until you explicitly activate this
                  candidate.
                </p>
              </div>
              <button
                className="button button--primary"
                type="button"
                onClick={handleConfirm}
              >
                Confirm and activate import
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
