import { useMemo, useRef, useState } from "react";
import {
  buildEvidenceItems,
  createDecisionBrief,
  deriveDecisionState,
} from "../core/decision";
import {
  calculateMetrics,
  calculateScenario,
  evaluateQualityGates,
} from "../core/metrics";
import type { ScenarioInputs } from "../core/types";
import {
  datasetMetadata,
  syntheticCases,
} from "../data/syntheticCases";

type TabId = "overview" | "quality" | "scenarios" | "story";

const tabs: Array<{ id: TabId; label: string; eyebrow: string }> = [
  { id: "overview", label: "Portfolio overview", eyebrow: "01" },
  { id: "quality", label: "Data quality", eyebrow: "02" },
  { id: "scenarios", label: "Scenario lab", eyebrow: "03" },
  { id: "story", label: "Decision story", eyebrow: "04" },
];

const currency = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

function Metric({
  label,
  value,
  note,
  accent,
}: {
  label: string;
  value: string;
  note: string;
  accent?: boolean;
}) {
  return (
    <article className={`metric-card${accent ? " metric-card--accent" : ""}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <p>{note}</p>
    </article>
  );
}

function EvidenceTag({ children }: { children: React.ReactNode }) {
  return <span className="evidence-tag">{children}</span>;
}

export function DecisionDeckLab() {
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [actionMessage, setActionMessage] = useState("");
  const [scenario, setScenario] = useState<ScenarioInputs>({
    monthlyVolume: 2400,
    escalationReduction: 6,
    escalationCost: 92,
  });
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const metrics = useMemo(() => calculateMetrics(syntheticCases), []);
  const gates = useMemo(() => evaluateQualityGates(metrics), [metrics]);
  const scenarioResult = useMemo(
    () => calculateScenario(scenario),
    [scenario],
  );
  const evidenceItems = useMemo(
    () => buildEvidenceItems(metrics, gates, scenario, scenarioResult),
    [gates, metrics, scenario, scenarioResult],
  );
  const decisionState = useMemo(
    () => deriveDecisionState(gates, evidenceItems),
    [evidenceItems, gates],
  );

  const selectTab = (id: TabId) => {
    setActiveTab(id);
    document
      .getElementById("workspace")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const onTabKeyDown = (
    event: React.KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) {
      return;
    }
    event.preventDefault();
    let next = index;
    if (event.key === "ArrowRight") next = (index + 1) % tabs.length;
    if (event.key === "ArrowLeft")
      next = (index - 1 + tabs.length) % tabs.length;
    if (event.key === "Home") next = 0;
    if (event.key === "End") next = tabs.length - 1;
    setActiveTab(tabs[next].id);
    tabRefs.current[next]?.focus();
  };

  const downloadBrief = () => {
    const result = createDecisionBrief({
      product: "DecisionDeck Lab",
      demonstration: "Synthetic Triage+ healthcare case",
      dataset: datasetMetadata,
      metrics,
      qualityGates: gates,
      evidenceItems,
      decisionState,
      scenario: { inputs: scenario, results: scenarioResult },
      recommendation:
        "Pilot decision support for repeatable lower-urgency triage contacts while preserving A0, A1 and A2 escalation controls.",
      limitations: [
        "No live AI is used.",
        "No real patient, clinical or operational data is included.",
        "Urgency assignments and scenario values are illustrative and require clinical and operational validation.",
      ],
    });

    if (!result.ok) {
      const names = result.failedGates.map((gate) => gate.label).join(", ");
      setActionMessage(
        `Export blocked. ${result.reason}${
          names ? ` Review: ${names}.` : ""
        } No decision brief was generated.`,
      );
      selectTab("quality");
      return;
    }

    const blob = new Blob([JSON.stringify(result.brief, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "decisiondeck-lab-brief.json";
    anchor.click();
    URL.revokeObjectURL(url);
    setActionMessage(
      "Evidence brief exported. The downloaded values match the visible calculated state.",
    );
  };

  return (
    <main>
      <section className="hero">
        <nav className="topbar" aria-label="Primary">
          <a className="brand" href="#top" aria-label="DecisionDeck Lab home">
            <span className="brand-mark">DD</span>
            <span>
              <strong>DecisionDeck</strong>
              <small>LAB</small>
            </span>
          </a>
          <div className="topbar-links">
            <a href="#workflow">Workflow</a>
            <a href="#architecture">Trust model</a>
            <button
              type="button"
              onClick={downloadBrief}
              aria-disabled={!decisionState.canExport}
              aria-describedby="export-state"
            >
              Export brief
            </button>
          </div>
        </nav>

        <div className="hero-grid" id="top">
          <div className="hero-copy">
            <div className="kicker">
              Analytics → evidence → executive decision
            </div>
            <h1>
              Turn validated data into a decision story people can{" "}
              <em>trust.</em>
            </h1>
            <p className="hero-lead">
              A browser-based portfolio demonstration connecting data quality,
              transparent KPIs, scenarios, recommendations and executive
              communication in one reproducible workflow.
            </p>
            <div className="hero-actions">
              <button
                className="button button--primary"
                type="button"
                onClick={() => selectTab("overview")}
              >
                Explore the sample analysis
              </button>
              <button
                className="button button--secondary"
                type="button"
                onClick={() => selectTab("quality")}
              >
                Inspect quality gates
              </button>
            </div>
            <div className="trust-strip" aria-label="Demonstration boundaries">
              <span>Synthetic data</span>
              <span>Deterministic calculations</span>
              <span>Not for clinical use</span>
              <span>No live AI</span>
              <span>No API key</span>
            </div>
            <span className="sr-only" id="export-state">
              {decisionState.exportStatusLabel}. {decisionState.explanation}
            </span>
          </div>

          <aside className="hero-brief" aria-label="Executive brief preview">
            <div className="brief-topline">
              <span>Executive brief</span>
              <span
                className={`status ${
                  decisionState.canPresent
                    ? "status--ready"
                    : "status--blocked"
                }`}
              >
                {decisionState.readinessLabel}
              </span>
            </div>
            <h2>Triage+ Synthetic Case Study</h2>
            <p>
              Improve consistency for lower-urgency contacts without weakening
              A0, A1 or A2 safety controls.
            </p>
            <div className="brief-chart" aria-label="Quality gate score">
              <div>
                <strong>
                  {decisionState.passedGateCount}/{gates.length}
                </strong>
                <span>quality gates passed</span>
              </div>
              <div
                className="ring"
                style={{
                  "--score": `${
                    (decisionState.passedGateCount / gates.length) * 360
                  }deg`,
                } as React.CSSProperties}
              >
                <span>
                  {Math.round(
                    (decisionState.passedGateCount / gates.length) * 100,
                  )}
                  %
                </span>
              </div>
            </div>
            <div className="brief-finding">
              <span>
                {decisionState.canPresent
                  ? "Recommended next move"
                  : "Required next move"}
              </span>
              <p>
                {decisionState.canPresent
                  ? "Pilot triage decision support for lower-urgency contacts, with unchanged safety-critical escalation rules."
                  : "Resolve every failed quality gate before presenting or exporting a decision brief."}
              </p>
            </div>
            <div className="brief-footer">
              <EvidenceTag>Dataset {datasetMetadata.version}</EvidenceTag>
              <EvidenceTag>48 fictional cases</EvidenceTag>
              <EvidenceTag>{decisionState.exportStatusLabel}</EvidenceTag>
            </div>
          </aside>
        </div>
      </section>

      <section className="workflow-band" id="workflow">
        <p>One controlled analytical chain</p>
        <ol>
          {[
            "Use sample",
            "Validate",
            "Measure",
            "Model",
            "Recommend",
            "Present",
          ].map((step, index) => (
            <li key={step}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              {step}
            </li>
          ))}
        </ol>
      </section>

      {actionMessage && (
        <div
          className={`action-message ${
            decisionState.canExport
              ? "action-message--success"
              : "action-message--blocked"
          }`}
          role="status"
          aria-live="polite"
        >
          <p>{actionMessage}</p>
          {!decisionState.canExport && (
            <button type="button" onClick={() => selectTab("quality")}>
              Review failed gates
            </button>
          )}
        </div>
      )}

      <section className="workspace" id="workspace">
        <div className="section-heading">
          <div>
            <span className="section-index">WORKSPACE / SYNTHETIC CASE</span>
            <h2>From synthetic triage evidence to a board-ready recommendation</h2>
          </div>
          <p>
            Every result below is calculated from deterministic fictional
            triage cases. Nothing represents an actual patient, clinician,
            healthcare organisation or operational system.
          </p>
        </div>

        <div className="planned-strip" aria-label="Planned capabilities">
          {["CSV import", "XLSX import", "Baseline comparison"].map(
            (feature) => (
              <div key={feature}>
                <strong>{feature}</strong>
                <span>Planned · unavailable</span>
              </div>
            ),
          )}
        </div>

        <div className="tab-shell">
          <div className="tabs" role="tablist" aria-label="Analysis sections">
            {tabs.map((tab, index) => (
              <button
                key={tab.id}
                ref={(element) => {
                  tabRefs.current[index] = element;
                }}
                role="tab"
                id={`tab-${tab.id}`}
                aria-controls={`panel-${tab.id}`}
                aria-selected={activeTab === tab.id}
                tabIndex={activeTab === tab.id ? 0 : -1}
                onClick={() => setActiveTab(tab.id)}
                onKeyDown={(event) => onTabKeyDown(event, index)}
                type="button"
              >
                <span>{tab.eyebrow}</span>
                {tab.label}
              </button>
            ))}
          </div>

          <div
            className="tab-panel"
            role="tabpanel"
            id={`panel-${activeTab}`}
            aria-labelledby={`tab-${activeTab}`}
          >
            {activeTab === "overview" && (
              <div className="panel-grid">
                <div className="panel-main">
                  <div className="panel-title">
                    <div>
                      <span>Current analytical position</span>
                      <h3>Synthetic urgency-classification performance</h3>
                    </div>
                    <EvidenceTag>{datasetMetadata.version}</EvidenceTag>
                  </div>
                  <div className="metrics-grid">
                    <Metric
                      label="Synthetic triage cases"
                      value={String(metrics.total)}
                      note="Frozen evaluation corpus"
                    />
                    <Metric
                      label="Overall agreement"
                      value={`${metrics.agreement.toFixed(1)}%`}
                      note="Exact urgency-code matches"
                      accent
                    />
                    <Metric
                      label="Data completeness"
                      value={`${metrics.completeness.toFixed(1)}%`}
                      note="Required fields populated"
                    />
                    <Metric
                      label="Average assessment"
                      value={`${metrics.averageHandling.toFixed(0)} min`}
                      note="Illustrative contact time"
                    />
                  </div>
                  <div className="category-section">
                    <div className="subheading">
                      <h4>Symptom-category mix</h4>
                      <span>Share of 48 cases</span>
                    </div>
                    {[
                      "Chest pain",
                      "Breathing difficulty",
                      "Neurological",
                      "Other acute",
                    ].map(
                      (category) => {
                        const count = syntheticCases.filter(
                          (item) => item.category === category,
                        ).length;
                        return (
                          <div className="bar-row" key={category}>
                            <span>{category}</span>
                            <div>
                              <i
                                style={{
                                  width: `${(count / metrics.total) * 100}%`,
                                }}
                              />
                            </div>
                            <strong>{count}</strong>
                          </div>
                        );
                      },
                    )}
                  </div>
                </div>
                <aside className="insight-card">
                  <span className="insight-number">01 / FINDING</span>
                  <h3>
                    The improvement opportunity is consistency for lower-urgency
                    contacts, not weaker safety controls.
                  </h3>
                  <p>
                    Agreement already clears the demonstration threshold.
                    Scenario testing should focus on repeatable C1 and C2
                    contacts while preserving A0, A1 and A2 escalation.
                  </p>
                  <div className="evidence-stack">
                    <EvidenceTag>Agreement gate</EvidenceTag>
                    <EvidenceTag>Safety-critical recall</EvidenceTag>
                    <EvidenceTag>Scenario assumptions</EvidenceTag>
                  </div>
                </aside>
              </div>
            )}

            {activeTab === "quality" && (
              <div>
                <div className="panel-title">
                  <div>
                    <span>Quality before conclusions</span>
                    <h3>Automated analytical gates</h3>
                  </div>
                  <span
                    className={`status ${
                      decisionState.failedGates.length === 0
                        ? "status--ready"
                        : "status--blocked"
                    }`}
                  >
                    {decisionState.passedGateCount}/{gates.length} passed
                  </span>
                </div>
                <div className="gate-grid">
                  {gates.map((gate) => (
                    <article className="gate-card" key={gate.label}>
                      <div className="gate-card__top">
                        <span
                          className={`gate-mark ${
                            gate.passed ? "gate-mark--pass" : "gate-mark--fail"
                          }`}
                        >
                          {gate.passed ? "PASS" : "HOLD"}
                        </span>
                        <strong>{gate.measured}</strong>
                      </div>
                      <h4>{gate.label}</h4>
                      <p>{gate.explanation}</p>
                      <small>Required: {gate.required}</small>
                    </article>
                  ))}
                </div>
                <div className="method-note">
                  <strong>Why the harness matters</strong>
                  <p>
                    Final presentation and export are blocked when required
                    quality gates fail. The same rules are applied to the same
                    frozen dataset so results remain reproducible.
                  </p>
                </div>
                {decisionState.failedGates.length > 0 && (
                  <div className="blocking-panel" role="alert">
                    <span>Decision and export blocked</span>
                    <h3>Resolve every failed gate before continuing.</h3>
                    <ul>
                      {decisionState.failedGates.map((gate) => (
                        <li key={gate.id}>
                          <strong>{gate.label}</strong>: {gate.measured};
                          required {gate.required}. {gate.explanation}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {activeTab === "scenarios" && (
              <div className="scenario-layout">
                <div className="scenario-controls">
                  <div className="panel-title">
                    <div>
                      <span>Transparent assumptions</span>
                      <h3>Triage capacity scenario</h3>
                    </div>
                  </div>
                  <label>
                    <span>
                      Monthly triage-contact volume
                      <strong>{scenario.monthlyVolume.toLocaleString()}</strong>
                    </span>
                    <input
                      type="range"
                      min="1000"
                      max="5000"
                      step="100"
                      value={scenario.monthlyVolume}
                      onChange={(event) =>
                        setScenario((current) => ({
                          ...current,
                          monthlyVolume: Number(event.target.value),
                        }))
                      }
                    />
                  </label>
                  <label>
                    <span>
                      Avoidable lower-urgency escalation reduction
                      <strong>{scenario.escalationReduction}%</strong>
                    </span>
                    <input
                      type="range"
                      min="1"
                      max="15"
                      value={scenario.escalationReduction}
                      onChange={(event) =>
                        setScenario((current) => ({
                          ...current,
                          escalationReduction: Number(event.target.value),
                        }))
                      }
                    />
                  </label>
                  <label>
                    <span>
                      Cost per avoidable escalation
                      <strong>{currency.format(scenario.escalationCost)}</strong>
                    </span>
                    <input
                      type="range"
                      min="40"
                      max="180"
                      step="2"
                      value={scenario.escalationCost}
                      onChange={(event) =>
                        setScenario((current) => ({
                          ...current,
                          escalationCost: Number(event.target.value),
                        }))
                      }
                    />
                  </label>
                  <p className="assumption-note">
                    These values are illustrative assumptions. A real business
                    case would require validated finance and operations owners.
                  </p>
                </div>
                <aside className="scenario-output">
                  <span>Illustrative annual opportunity</span>
                  <strong>{currency.format(scenarioResult.grossSavings)}</strong>
                  <p>
                    from approximately{" "}
                    <b>{scenarioResult.avoidedEscalations}</b> avoided
                    lower-urgency escalations.
                  </p>
                  <div className="scenario-stats">
                    <div>
                      <span>Annual triage contacts</span>
                      <strong>
                        {scenarioResult.annualVolume.toLocaleString()}
                      </strong>
                    </div>
                    <div>
                      <span>Hours released</span>
                      <strong>
                        {scenarioResult.hoursReleased.toLocaleString()}
                      </strong>
                    </div>
                  </div>
                  <div className="scenario-caveat">
                    Decision status: <b>{decisionState.decisionStatusLabel}</b>
                  </div>
                </aside>
              </div>
            )}

            {activeTab === "story" && !decisionState.canPresent && (
              <div className="blocking-panel blocking-panel--story" role="alert">
                <span>{decisionState.decisionStatusLabel}</span>
                <h3>The final decision brief is not available.</h3>
                <p>
                  {decisionState.explanation} Presenting or exporting a final
                  recommendation now could misrepresent the evidence.
                </p>
                <ul>
                  {decisionState.failedGates.map((gate) => (
                    <li key={gate.id}>
                      <strong>{gate.label}</strong>: {gate.measured}; required{" "}
                      {gate.required}.
                    </li>
                  ))}
                </ul>
                <button
                  className="button button--primary"
                  type="button"
                  onClick={() => selectTab("quality")}
                >
                  Return to data quality
                </button>
              </div>
            )}

            {activeTab === "story" && decisionState.canPresent && (
              <div className="story-layout">
                <article className="story-page">
                  <div className="story-page__header">
                    <span>Decision brief / 25 July 2026</span>
                    <EvidenceTag>Demonstration only</EvidenceTag>
                  </div>
                  <h3>
                    Pilot bounded decision support for repeatable C1 and C2
                    triage contacts.
                  </h3>
                  <p className="story-intro">
                    The synthetic evidence supports a bounded pilot, not a
                    clinical deployment. Existing A0, A1 and A2 escalation
                    rules should remain unchanged.
                  </p>
                  <div className="story-columns">
                    <section>
                      <span>WHAT THE DATA SAYS</span>
                      <strong>{metrics.agreement.toFixed(1)}% agreement</strong>
                      <p>
                        The fictional urgency-classification rules meet the
                        demonstration agreement threshold on the frozen sample.
                      </p>
                    </section>
                    <section>
                      <span>WHAT TO TEST</span>
                      <strong>
                        {scenario.escalationReduction}% reduction scenario
                      </strong>
                      <p>
                        Test whether guided triage reduces avoidable
                        lower-urgency escalations without worsening
                        safety-critical recall.
                      </p>
                    </section>
                    <section>
                      <span>WHAT NOT TO CLAIM</span>
                      <strong>No proven financial benefit yet</strong>
                      <p>
                        Savings are scenario outputs, not observed results or
                        forecasts.
                      </p>
                    </section>
                  </div>
                  <div className="decision-box">
                    <div>
                      <span>PROPOSED DECISION</span>
                      <p>
                        Authorise a time-boxed synthetic evaluation design with
                        named clinical-safety, operations, finance and
                        data-quality owners.
                      </p>
                    </div>
                    <span className="status status--conditional">
                      {decisionState.decisionStatusLabel}
                    </span>
                  </div>
                </article>
                <aside className="story-evidence">
                  <span>Evidence coverage</span>
                  <strong>{decisionState.evidenceCoverage.toFixed(0)}%</strong>
                  <p>
                    {evidenceItems.filter((item) => item.available).length} of{" "}
                    {evidenceItems.length} required evidence sources are
                    available.
                  </p>
                  <button
                    className="button button--primary"
                    type="button"
                    onClick={downloadBrief}
                    aria-disabled={!decisionState.canExport}
                  >
                    {decisionState.exportStatusLabel}
                  </button>
                </aside>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="architecture" id="architecture">
        <div className="section-heading section-heading--light">
          <div>
            <span className="section-index">TRUST MODEL</span>
            <h2>The interface separates facts, assumptions and narrative.</h2>
          </div>
          <p>
            This first version deliberately uses deterministic browser logic.
            A future AI service could suggest wording, but it would not be
            permitted to change source data, calculations or quality gates.
          </p>
        </div>
        <div className="architecture-grid">
          <article>
            <span>01</span>
            <h3>Validated inputs</h3>
            <p>Typed fields, completeness rules and duplicate checks.</p>
          </article>
          <article>
            <span>02</span>
            <h3>Transparent calculations</h3>
            <p>Pure functions produce metrics and scenario outputs.</p>
          </article>
          <article>
            <span>03</span>
            <h3>Evidence-linked story</h3>
            <p>Claims distinguish measured facts from assumptions.</p>
          </article>
          <article>
            <span>04</span>
            <h3>Human decision</h3>
            <p>Automated gates inform approval; they do not replace it.</p>
          </article>
        </div>
      </section>

      <footer>
        <div className="brand">
          <span className="brand-mark">DD</span>
          <span>
            <strong>DecisionDeck</strong>
            <small>LAB</small>
          </span>
        </div>
        <p>
          Synthetic healthcare portfolio demonstration · No real patients or
          clinical records · Not for clinical use · No live AI model
        </p>
        <a href="#top">Back to top ↑</a>
      </footer>
    </main>
  );
}
