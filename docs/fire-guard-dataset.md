Here’s your **fully cleaned and merged version** — all Git conflict markers removed and both branches (`main` + `codex/add-fire-guard-feature-for-risk-anticipation-8urpr8`) fully integrated into one consistent roadmap:

---

# HydroSafe Fire Aladdin — Fire Intelligence Roadmap

HydroSafe Fire Aladdin ("Fire Guard") relies on a continuously expanding intelligence lake that captures every relevant industrial fire signal on Earth.
Phase 1 establishes the data foundation; Phases 2–5 standardize, model, and productize those insights into investor- and regulator-grade capabilities.

---

## Objectives

1. Capture global industrial fire incidents across offshore, refinery, petrochemical, mining, manufacturing, and logistics operations.
2. Preserve regulatory-grade findings (root causes, barrier failures, recommendations) alongside quantitative telemetry such as ignition source, materials involved, containment time, and loss severity.
3. Align each external incident with the Fire Guard feature schema so historical patterns are comparable with DIMS asset, emergency, and muster data.

---

## Priority Data Sources

| Category                    | Sources                                                                                                                                                                                                                                                                                                                                            | Key Signals Captured                                                                         |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Regulatory accident reports | - US Chemical Safety Board (CSB) refinery & chemical incidents  <br> - Mine Safety and Health Administration (MSHA) fire investigations  <br> - Bureau of Safety and Environmental Enforcement (BSEE) offshore reports  <br> - Pipeline and Hazardous Materials Safety Administration (PHMSA) releases  <br> - UK HSE RIDDOR dangerous occurrences | Barrier failures, ignition sequences, causal chains, regulatory findings                     |
| Industry associations       | - IOGP safety flashes and Life-Saving Rules deviations  <br> - API incident statistics  <br> - ICMM & IMCA safety alerts                                                                                                                                                                                                                           | Cross-operator patterns in ignition sources, human error precursors, response timing         |
| Insurance & underwriting    | - Marsh risk engineering bulletins  <br> - AIG loss prevention case studies  <br> - FM Global property loss prevention data                                                                                                                                                                                                                        | Exposure metrics, estimated financial loss, recurrence likelihood                            |
| Public datasets             | - Kaggle Industrial Fire datasets  <br> - Fire Department Incident Data (NFIRS subsets)  <br> - City/municipal open-data fire logs                                                                                                                                                                                                                 | Frequency distributions, environmental context (weather, geography), suppression performance |
| Academic & standards        | - NFPA fire investigation reports  <br> - OSHA accident abstracts  <br> - IEC 60079 / ISO 45001 compliance data                                                                                                                                                                                                                                    | Baseline risk factors, equipment classification, standards conformance                       |

### Prototype Seed Dataset

* **Historic Offshore Benchmarks:** *Piper Alpha (1988)* and *Deepwater Horizon (2010)* are live in `data/fire-incidents.seed.json` and conform to `shared/fire-intel/schema.ts`.
  `server/fire-guard-harvester.ts` loads them as the default static source, while `server/fire-intel/ingest.ts` validates, persists, and vectorizes the same records for advisor prompts.
* Fire Guard automatically ingests the seed file on server start via `ensureFireIncidentSeeds()`, so `/api/erp/ask-ai` and `/api/fire/risk` have contextual lessons even without external network access.
* Remote connectors (CSB, BSEE, NFIRS) remain available but must be explicitly passed in the `sources` array to avoid failed fetches in constrained environments.

---

## Data Ingestion Workflow

1. **Source Acquisition**

   * Establish API or bulk download routines (e.g., CSB PDFs, NFIRS CSVs).
   * For narrative PDFs, use OCR + NLP extraction to capture structured fields.
   * Track retrieval date, version, and license for audit scheduling.

2. **Normalization & Schema Mapping**

   * Map each incident into Fire Guard’s canonical schema: metadata, asset context, ignition profile, barrier status, response timeline, consequence metrics, and remediation actions.
   * Apply controlled vocabularies shared with DIMS asset catalogues.

3. **Quality & Validation**

   * Enforce mandatory fields and apply confidence scoring to text extraction.
   * Use fuzzy de-duplication to prevent multi-report double counting.

4. **Enrichment & Linking**

   * Add weather (NOAA), satellite thermal anomalies (NASA FIRMS), and socioeconomic indices.
   * Link incidents to DIMS asset archetypes for transfer-learning relevance.

5. **Storage & Access**

   * Persist curated records in `fireGuard/intelligenceLake`, versioned by source and ingestion run.
   * Export training-ready parquet/JSONL files and Firestore snapshots for app consumption.

---

## Phase 2 — Structure & Enrich the Data

### 1. Standardize with a Fire Event Ontology

| Dimension            | Representative Fields                                                                   |
| -------------------- | --------------------------------------------------------------------------------------- |
| Who / Where          | Operator, asset/site, geography, operating mode (FPSO, refinery, plant, rig, warehouse) |
| When                 | Date, time, shift, season, local weather regime                                         |
| What (event)         | Ignition source, fuel type, containment status, work activity in progress               |
| Why (root cause)     | Human error class, equipment failure type, maintenance backlog, ESD event               |
| Environment          | Temperature, humidity, wind, sea state, confined vs open space                          |
| Detection / Response | Sensor flag, detection delay, suppression method, response time, muster performance     |
| Outcome              | Damage severity, downtime, injuries/fatalities, financial loss                          |
| Barriers             | Failed barriers (training, inspection, suppression system, design), maturity score      |
| Lessons              | Narrative summary, mitigations, standards referenced                                    |

**Actions**

* Codify controlled vocabularies shared with DIMS catalogs & muster analytics.
* Maintain ontology versioning to manage feature drift.

### 2. Enrich Each Event

* Append historical weather/metocean snapshots (NOAA, ECMWF).
* Join asset metadata (age, throughput, maintenance, inspections).
* Perform semantic clustering to surface “similar incident” families.
* Estimate barrier effectiveness via causal inference.

---

## Phase 3 — Train the Fire Intelligence Model

| Model Type                                | Purpose                                                         |
| ----------------------------------------- | --------------------------------------------------------------- |
| Transformer NLP (BERT/Longformer)         | Parse unstructured reports into causal graphs & taxonomy labels |
| Gradient-boosted trees (XGBoost/LightGBM) | Predict fire likelihood & severity from structured fields       |
| Time-series networks (LSTM/TFT)           | Forecast near-term risk from live sensor/operations telemetry   |
| Graph neural networks                     | Model interdependencies between equipment, roles, and barriers  |
| Causal inference (DoWhy/EconML)           | Quantify which interventions most reduce ignition probability   |

**Model Lifecycle**

* Automate incremental retraining as new incidents arrive.
* Track lineage between datasets, features, and model versions.

**Outputs**

* **Global Fire Risk Index (FRI):** 0–100 contextual risk score.
* **Ignition Pathway Predictor:** Top ignition scenarios for current operations.
* **Barrier Effectiveness Estimator:** Highlights degraded or impactful controls.
* **Lessons in Context:** Summarized analog incidents & mitigations.

**Explainability**

* Apply SHAP/LIME and attention visualization.
* Store explanation artifacts with each inference for regulator traceability.

---

## Phase 4 — Productize the Intelligence

### 1. Fire Intelligence Dashboard

* Live global fire map with clustering by cause & severity.
* Predictive overlays showing Fire Risk Forecast and contributing factors.
* Scenario simulator for “what-if” adjustments to fuel, weather, crew, or barriers.
* Lessons overlay surfacing analog incidents and compliance references.

### 2. ERP & Operations Integration

* Push Fire Guard risk deltas into HydroSafe ERP for permits, muster, and staffing.
* Deliver recommended response playbooks from historical analogs.
* Provide API hooks for insurers & partners to consume risk scores.

### 3. Regulatory & Investor Credibility

* Align reporting with NFPA, OSHA, API RP 14C, IEC 61508.
* Generate Fire Safety Performance Reports for ESG & board transparency.
* Maintain audit trails linking each insight to data & model version.

---

## Phase 5 — Revenue, Partnerships, and Edge Expansion

* Tiered subscriptions for operators, contractors, refineries, insurers, regulators.
* Partnerships with NFPA, Lloyd’s Register, DNV, IOGP, ABS.
* Enable edge deployments with offline Fire Index models that sync when connected.
* Extend to adjacent hazards (explosions, gas releases, mechanical failures, man-overboard).

---

## Example Fire Guard Output Snapshot

| Parameter                     | Live Value          | Risk Weight |
| ----------------------------- | ------------------- | ----------- |
| Hot-work active               | Yes (4 concurrent)  | +22         |
| LEL fluctuations              | 8–11 % (last 5 min) | +30         |
| Wind speed                    | 28 kt               | +10         |
| Foam system pump A offline    | Yes                 | +18         |
| Housekeeping score            | 0.7 / 1             | −5          |
| Ambient temperature           | 34 °C               | +6          |
| **Predicted Fire Risk Index** | **81 / 100 (High)** | —           |

**Recommended Mitigations**

1. Delay hot-work until wind < 20 kt.
2. Engage auxiliary foam system and verify redundancy.
3. Assign secondary fire watch with portable suppression.
4. Maintain continuous LEL monitoring — mirrors Chevron El Segundo 2019 scenario.

---

## Future Expansion

* Introduce explosion, gas release, mechanical failure, and man-overboard intelligence using the same framework.
* Provide unified safety analytics correlating cross-hazard precursors and barrier performance.
* Build subscription APIs for insurer & regulator benchmarking.

---

## Immediate Next Steps

* Prioritize ingestion of regulatory & association datasets to seed the lake.
* Define automated refresh cadences (monthly/quarterly) and monitor schema drift.
* Coordinate with Fire Guard feature engineering to propagate new fields (e.g., barrier failure taxonomy) into training & inference.
* Operationalize `server/fire-guard-harvester.ts` with the built-in historic offshore dataset first, then progressively add remote sources (CSB, BSEE, NFIRS) via `/api/fire-guard/harvest`; analyze snapshots via `/api/fire-guard/analyze` for explainable pattern intelligence.

---

✅ **Conflict resolved — final unified document ready for commit.**

