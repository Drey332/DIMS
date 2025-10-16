# HydroSafe Fire Aladdin — Fire Intelligence Roadmap

HydroSafe Fire Aladdin ("Fire Guard") relies on a continuously expanding intelligence lake that captures every relevant industrial fire signal on Earth. Phase 1 establishes the data foundation; Phases 2–5 standardize, model, and productize those insights into investor- and regulator-grade capabilities.

## Objectives

1. Capture global industrial fire incidents across offshore, refinery, petrochemical, mining, manufacturing, and logistics operations.
2. Preserve regulatory-grade findings (root causes, barrier failures, recommendations) alongside quantitative telemetry such as ignition source, materials involved, containment time, and loss severity.
3. Align each external incident with the Fire Guard feature schema so historical patterns are comparable with DIMS asset, emergency, and muster data.

## Priority Data Sources

| Category | Sources | Key Signals Captured |
| --- | --- | --- |
| Regulatory accident reports | - US Chemical Safety Board (CSB) refinery & chemical incidents  \\ - Mine Safety and Health Administration (MSHA) fire investigations  \\ - Bureau of Safety and Environmental Enforcement (BSEE) offshore reports  \\ - Pipeline and Hazardous Materials Safety Administration (PHMSA) releases  \\ - UK HSE RIDDOR dangerous occurrences | Barrier failures, ignition sequences, causal chains, regulatory findings |
| Industry associations | - IOGP safety flashes and Life-Saving Rules deviations  \\ - API incident statistics  \\ - ICMM & IMCA safety alerts | Cross-operator patterns in ignition sources, human error precursors, response timing |
| Insurance & underwriting | - Marsh risk engineering bulletins  \\ - AIG loss prevention case studies  \\ - FM Global property loss prevention data | Exposure metrics, estimated financial loss, recurrence likelihood |
| Public datasets | - Kaggle Industrial Fire datasets  \\ - Fire Department Incident Data (NFIRS subsets)  \\ - City/municipal open-data fire logs | Frequency distributions, environmental context (weather, geography), suppression performance |
| Academic & standards | - NFPA fire investigation reports  \\ - OSHA accident abstracts  \\ - IEC 60079/ISO 45001 compliance data | Baseline risk factors, equipment classification, standards conformance |

## Data Ingestion Workflow

1. **Source Acquisition**
   - Establish API or bulk download routines where available (e.g., CSB investigation PDFs, NFIRS CSV exports).
   - For narrative-focused PDFs, use document ingestion with text extraction (e.g., OCR + NLP parsing) to capture structured fields.
   - Track source metadata (retrieval date, version, license) for audit and refresh scheduling.

2. **Normalization & Schema Mapping**
   - Map each incident into Fire Guard's canonical schema: incident metadata, asset context, ignition profile, barrier status, response timeline, consequence metrics, and remediation actions.
   - Apply controlled vocabularies (e.g., ignition source taxonomy, equipment classes) shared with DIMS asset catalogues to ensure cross-compatibility.

3. **Quality & Validation**
   - Implement validation rules for mandatory fields (incident date, location, incident type) and confidence scoring for extracted narratives.
   - Use de-duplication heuristics (source IDs, fuzzy matching on title/date/location) to avoid double-counting multi-reported incidents.

4. **Enrichment & Linking**
   - Augment incidents with external context such as weather (NOAA), satellite thermal anomalies (NASA FIRMS), or socioeconomic impact indices.
   - Link similar incidents to DIMS asset archetypes (e.g., FPSO, refinery distillation unit) for transfer learning relevance.

5. **Storage & Access**
   - Persist curated records into `fireGuard/intelligenceLake` collections, versioned by source and ingestion run.
   - Provide transformation pipelines to emit training-ready parquet/JSONL files for ML workflows, plus Firestore snapshots consumable by application services.

## Phase 2 — Structure & Enrich the Data

### 1. Standardize with a Fire Event Ontology

| Dimension | Representative Fields |
| --- | --- |
| Who / Where | Operator, asset/site, geography, operating mode (FPSO, refinery, plant, rig, warehouse) |
| When | Date, time, shift, season, local weather regime |
| What (event) | Ignition source, fuel type, containment status, work activity in progress |
| Why (root cause) | Human error classification, equipment failure type, maintenance backlog, electrostatic discharge |
| Environment | Temperature, humidity, wind, sea state, confined vs. open space |
| Detection / Response | Sensor detection flag, detection delay, suppression method, response time, muster performance |
| Outcome | Damage severity, downtime, injuries/fatalities, financial loss |
| Barriers | Failed barriers (training, inspection, suppression system, design), barrier maturity score |
| Lessons | Narrative summary, recommended mitigations, standards referenced |

Actions:
- Codify controlled vocabularies shared with DIMS asset catalogs, muster analytics, and ERP generators.
- Maintain ontology versions so downstream ML can reconcile feature drift.

### 2. Enrich Each Event

- Append historical weather and metocean snapshots (e.g., NOAA, ECMWF) for time-synchronized environmental context.
- Join asset metadata (age, throughput, maintenance intervals, inspection findings) when available from HydroSafe projects.
- Perform semantic clustering (e.g., sentence transformers) to surface "similar incident" families for transfer learning and user explainability.
- Estimate barrier effectiveness scores using causal inference on comparable incidents.

## Phase 3 — Train the Fire Intelligence Model

### 1. ML Stack

| Model Type | Purpose |
| --- | --- |
| Transformer-based NLP (e.g., BERT, Longformer) | Parse unstructured reports into causal graphs and taxonomy labels. |
| Gradient-boosted trees (XGBoost/LightGBM) | Predict fire likelihood and severity from structured ontology fields. |
| Time-series networks (LSTM, TFT) | Forecast near-term risk using live sensor, weather, and operations telemetry. |
| Graph neural networks | Model interdependencies between equipment, human roles, and barriers. |
| Causal inference (DoWhy, EconML) | Quantify which barrier interventions most reduce ignition probability. |

Model lifecycle considerations:
- Each new global incident becomes a training datapoint; automate incremental retraining pipelines.
- Track lineage between model versions, datasets, and feature schemas for auditability.

### 2. Outputs

- **Global Fire Risk Index (FRI)**: 0–100 score contextualized by activity, environment, and barrier posture.
- **Ignition Pathway Predictor**: Ranks the top ignition scenarios most aligned with current operations.
- **Barrier Effectiveness Estimator**: Highlights which controls most reduce local risk and where they are degraded.
- **Lessons in Context**: Auto-summarizes similar cases with recommended mitigations and references.

### 3. Explainability

- Apply SHAP/LIME feature attributions to structured models and attention visualizations for NLP outputs.
- Present narrative analogs: e.g., "Pattern matches Chevron El Segundo 2019 (welding + vapor + 28 kt wind + failed LEL monitor)."
- Store explanation artifacts with each inference for regulator-ready traceability.

## Phase 4 — Productize the Intelligence

### 1. Fire Intelligence Dashboard

- Live global fire map with clustering by cause and severity, updated via streaming ingestion.
- Predictive overlays per asset/job showing Fire Risk Forecast and contributing factors.
- Scenario simulator to adjust fuel, weather, crew size, or barrier status and observe predicted risk and expected loss in real time.
- Lessons overlay that surfaces similar incidents, mitigations, and compliance references inline.

### 2. ERP & Operations Integration

- Push Fire Guard risk deltas into HydroSafe ERP generators to auto-update permits, muster expectations, and staffing.
- During active emergencies, deliver recommended response playbooks derived from successful historical analogs.
- Provide API hooks for insurers and partners to consume risk scores and barrier insights.

### 3. Regulatory & Investor Credibility

- Align reporting with NFPA, OSHA, API RP 14C, IEC 61508 frameworks and include citation back to source incidents.
- Generate Fire Safety Performance Reports benchmarked against global peers for ESG and board transparency.
- Maintain audit trails linking each insight to underlying data and model version.

## Phase 5 — Revenue, Partnerships, and Edge Expansion

- Target operators, offshore contractors, refineries, insurers, and regulators with tiered subscriptions (platform, API, analytics-as-a-service).
- Pursue partnerships with NFPA, Lloyd's Register, DNV, IOGP, ABS, and major underwriters for data sharing and validation.
- Enable edge deployments (e.g., vessel gateways) that run compact Fire Index models offline and sync with the cloud lake when connected.
- Extend the pipeline to adjacent hazards (explosions, gas releases, mechanical failures, man-overboard) once fire intelligence is mature.

## Example Fire Guard Output Snapshot

| Parameter | Live Value | Risk Weight |
| --- | --- | --- |
| Hot-work active | Yes (4 concurrent) | +22 |
| LEL fluctuations | 8–11% last 5 min | +30 |
| Wind speed | 28 kt | +10 |
| Foam system pump A offline | Yes | +18 |
| Housekeeping score | 0.7 / 1 | −5 |
| Ambient temperature | 34 °C | +6 |
| **Predicted Fire Risk Index** | **81 / 100 (High)** | — |

**Recommended Mitigations**

1. Delay hot-work until wind < 20 kt.
2. Engage auxiliary foam system and verify redundancy.
3. Assign secondary fire watch with portable suppression.
4. Maintain continuous LEL monitoring — pattern mirrors Chevron El Segundo 2019 scenario.

## Future Expansion

- Introduce explosion, gas release, mechanical failure, and man-overboard intelligence using the same ingestion and modeling framework.
- Provide unified safety analytics that correlate cross-hazard precursors and barrier performance.
- Build subscription APIs that allow insurers and regulators to benchmark fleets against anonymized industry aggregates.

## Immediate Next Steps

- Prioritize ingestion of regulatory and association datasets to seed the lake with high-quality causal narratives.
- Define automated refresh cadences (monthly/quarterly) per source and monitor for schema drift.
- Coordinate with Fire Guard feature engineering to ensure new fields (e.g., barrier failure taxonomy) propagate to model training and inference endpoints.

