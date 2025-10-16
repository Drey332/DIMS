# HydroSafe Fire Aladdin — Phase 1 Fire Intelligence Dataset

HydroSafe Fire Aladdin ("Fire Guard") relies on a comprehensive historical record of industrial fire events to train and validate proactive risk models. Phase 1 establishes that foundation by collecting, normalizing, and enriching external and internal sources into a unified Fire Intelligence Lake.

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

## Next Steps

- Prioritize ingestion of regulatory and association datasets to seed the lake with high-quality causal narratives.
- Define automated refresh cadences (monthly/quarterly) per source and monitor for schema drift.
- Coordinate with Fire Guard feature engineering to ensure new fields (e.g., barrier failure taxonomy) propagate to model training and inference endpoints.

