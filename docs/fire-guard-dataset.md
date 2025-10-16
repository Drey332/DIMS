Here’s the fully **resolved, merged version** of your document — preserving the **Phase 1 dataset clarity from `main`** while integrating the **extended roadmap and modeling plan from `codex/add-fire-guard-feature-for-risk-anticipation-v7lw1u`**, and removing all conflict markers:

---

# HydroSafe Fire Aladdin — Fire Intelligence Roadmap

HydroSafe Fire Aladdin ("Fire Guard") relies on a continuously expanding intelligence lake that captures every relevant industrial fire signal on Earth.
Phase 1 establishes the data foundation; Phases 2–5 standardize, model, and productize those insights into investor- and regulator-grade capabilities.

## Objectives

1. Capture global industrial fire incidents across offshore, refinery, petrochemical, mining, manufacturing, and logistics operations.
2. Preserve regulatory-grade findings (root causes, barrier failures, recommendations) alongside quantitative telemetry such as ignition source, materials involved, containment time, and loss severity.
3. Align each external incident with the Fire Guard feature schema so historical patterns are comparable with DIMS asset, emergency, and muster data.

## Priority Data Sources

| Category                    | Sources                                                                                                                                                                                                                                                                                                                                            | Key Signals Captured                                                                         |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Regulatory accident reports | - US Chemical Safety Board (CSB) refinery & chemical incidents  <br> - Mine Safety and Health Administration (MSHA) fire investigations  <br> - Bureau of Safety and Environmental Enforcement (BSEE) offshore reports  <br> - Pipeline and Hazardous Materials Safety Administration (PHMSA) releases  <br> - UK HSE RIDDOR dangerous occurrences | Barrier failures, ignition sequences, causal chains, regulatory findings                     |
| Industry associations       | - IOGP safety flashes and Life-Saving Rules deviations  <br> - API incident statistics  <br> - ICMM & IMCA safety alerts                                                                                                                                                                                                                           | Cross-operator patterns in ignition sources, human error precursors, response timing         |
| Insurance & underwriting    | - Marsh risk engineering bulletins  <br> - AIG loss prevention case studies  <br> - FM Global property loss prevention data                                                                                                                                                                                                                        | Exposure metrics, estimated financial loss, recurrence likelihood                            |
| Public datasets             | - Kaggle Industrial Fire datasets  <br> - Fire Department Incident Data (NFIRS subsets)  <br> - City/municipal open-data fire logs                                                                                                                                                                                                                 | Frequency distributions, environmental context (weather, geography), suppression performance |
| Academic & standards        | - NFPA fire investigation reports  <br> - OSHA accident abstracts  <br> - IEC 60079 / ISO 45001 compliance data                                                                                                                                                                                                                                    | Baseline risk factors, equipment classification, standards conformance                       |

## Data Ingestion Workflow

1. **Source Acquisition**

   * Establish API or bulk download routines where available (e.g., CSB investigation PDFs, NFIRS CSV exports).
   * For narrative PDFs, use document ingestion with text extraction (OCR + NLP parsing).
   * Track source metadata (retrieval date, version, license) for audit and refresh scheduling.

2. **Normalization & Schema Mapping**

   * Map each incident into Fire Guard’s canonical schema: incident metadata, asset context, ignition profile, barrier status, response timeline, consequence metrics, and remediation actions.
   * Apply controlled vocabularies (e.g., ignition source taxonomy, equipment classes) shared with DIMS asset catalogues to ensure cross-compatibility.

3. **Quality & Validation**

   * Implement validation rules for mandatory fields and confidence scoring for extracted narratives.
   * Use de-duplication heuristics to avoid double-counting multi-reported incidents.

4. **Enrichment & Linking**

   * Augment incidents with weather (NOAA), satellite thermal anomalies (NASA FIRMS), and socioeconomic impact indices.
   * Link similar incidents to DIMS asset archetypes (e.g., FPSO, refinery distillation unit).

5. **Storage & Access**

   * Persist curated records into `fireGuard/intelligenceLake` collections, versioned by source and ingestion run.
   * Provide transformation pipelines to emit training-ready parquet/JSONL files for ML workflows and Firestore snapshots for app services.

---

## Phase 2 — Structure & Enrich the Data

### 1. Standardize with a Fire Event Ontology

| Dimension            | Representative Fields                                                                            |
| -------------------- | ------------------------------------------------------------------------------------------------ |
| Who / Where          | Operator, asset/site, geography, operating mode (FPSO, refinery, plant, rig, warehouse)          |
| When                 | Date, time, shift, season, local weather regime                                                  |
| What (event)         | Ignition source, fuel type, containment status, work activity in progress                        |
| Why (root cause)     | Human error classification, equipment failure type, maintenance backlog, electrostatic discharge |
| Environment          | Temperature, humidity, wind, sea state, confined vs open space                                   |
| Detection / Response | Sensor detection flag, detection delay, suppression method, response time, muster performance    |
| Outcome              | Damage severity, downtime, injuries/fatalities, financial loss                                   |
| Barriers             | Failed barriers (training, inspection, suppression system, design), barrier maturity score       |
| Lessons              | Narrative summary, recommended mitigations, standards referenced                                 |

**Actions:**

* Codify controlled vocabularies shared with DIMS asset catalogs and muster analytics.
* Maintain ontology versions for feature-drift management.

### 2. Enrich Each Event

* Append historical weather/metocean snapshots (NOAA, ECMWF).
* Join asset metadata (age, throughput, maintenance intervals, inspections).
* Perform semantic clustering to surface similar-incident families.
* Estimate barrier effectiveness using causal inference.

---

## Phase 3 — Train the Fire Intelligence Model

### 1. ML Stack

| Model Type                                     | Purpose                                                               |
| ---------------------------------------------- | --------------------------------------------------------------------- |
| Transformer-based NLP (e.g., BERT, Longformer) | Parse unstructured reports into causal graphs and taxonomy labels.    |
| Gradient-boosted trees (XGBoost/LightGBM)      | Predict fire likelihood and severity from structured ontology fields. |
| Time-series networks (LSTM, TFT)               | Forecast near-term risk using live telemetry.                         |
| Graph neural networks                          | Model interdependencies between equipment, human roles, and barriers. |
| Causal inference (DoWhy, EconML)               | Quantify which interventions most reduce ignition probability.        |

**Model lifecycle:**
Automate incremental retraining as new incidents arrive. Track lineage between datasets, features, and model versions.

### 2. Outputs

* **Global Fire Risk Index (FRI):** 0–100 contextual score.
* **Ignition Pathway Predictor:** Top ignition scenarios for current operations.
* **Barrier Effectiveness Estimator:** Highlights degraded or impactful controls.
* **Lessons in Context:** Summarized analog incidents and mitigations.

### 3. Explainability

Use SHAP/LIME for structured models and attention visualization for NLP.
Store explanation artifacts with each inference for regulator-ready traceability.

---

## Phase 4 — Productize the Intelligence

### 1. Fire Intelligence Dashboard

* Live global fire map with clustering by cause and severity.
* Predictive overlays showing risk forecast and drivers.
* Scenario simulator for “what-if” changes in fuel, weather, crew, or barriers.
* Lessons overlay with mitigations and compliance references.

### 2. ERP & Operations Integration

* Push Fire Guard risk deltas into HydroSafe ERP for permits and staffing.
* Deliver response playbooks from historical analogs.
* Provide API hooks for insurers and partners.

### 3. Regulatory & Investor Credibility

* Align reporting with NFPA, OSHA, API RP 14C, IEC 61508.
* Generate Fire Safety Performance Reports for ESG/board transparency.
* Maintain audit trails linking each insight to source data and model version.

---

## Phase 5 — Revenue, Partnerships, and Edge Expansion

* Tiered subscriptions for operators, contractors, refineries, insurers, regulators.
* Partnerships with NFPA, Lloyd’s Register, DNV, IOGP, ABS.
* Enable edge deployments with offline Fire Index models.
* Extend framework to other hazards (explosion, gas release, mechanical failure, man-overboard).

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
4. Maintain continuous LEL monitoring — pattern mirrors Chevron El Segundo 2019.

---

## Future Expansion

* Introduce additional hazard domains (explosion, gas release, mechanical failure, man-overboard).
* Provide cross-hazard analytics correlating precursors and barrier performance.
* Build subscription APIs for insurer and regulator benchmarking.

---

## Immediate Next Steps

* Prioritize ingestion of regulatory and association datasets to seed the lake.
* Define automated refresh cadences (monthly/quarterly) and monitor schema drift.
* Coordinate with Fire Guard feature engineering so new fields (e.g., barrier failure taxonomy) propagate to model training and inference endpoints.

---

✅ **Conflict resolved** — combines `main`’s concise Phase 1 foundation and `codex`’s extended roadmap for a unified, comprehensive plan.


