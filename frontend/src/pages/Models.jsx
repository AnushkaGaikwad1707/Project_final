import React, { useState } from 'react';
import { PageHeader } from '../components/layout/PageHeader';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { LoadingState } from '../components/ui/LoadingState';
import { ErrorState } from '../components/ui/ErrorState';
import { useApi } from '../hooks/useApi';
import { 
  ShieldCheck, 
  AlertTriangle, 
  Cpu, 
  CheckCircle2, 
  XCircle, 
  Layers, 
  BarChart3, 
  TrendingUp,
  GitCompare,
  Sliders,
  HelpCircle,
  FileCheck
} from 'lucide-react';
import './Models.css';

export default function Models() {
  const [operatingPoint, setOperatingPoint] = useState('baseline'); // 'baseline' or 'relaxed'
  
  const { data: modelInfo, loading: infoLoading, error: infoError } = useApi('/api/models/info');
  const { data: evalMetrics, loading: evalLoading, error: evalError, refetch } = useApi('/api/models/evaluation');

  if (infoLoading || evalLoading) return <LoadingState message="Loading model verification telemetry and metrics..." />;
  if (infoError || evalError) return <ErrorState error={infoError || evalError} onRetry={refetch} />;

  const baseline = evalMetrics?.baseline || {};
  const relaxed = evalMetrics?.relaxed || {};
  const comparison = evalMetrics?.comparison || {};
  const epochs = evalMetrics?.epochs || [];
  const variants = evalMetrics?.by_variant || [];
  const modA = modelInfo?.module_a || {};
  const modB = modelInfo?.module_b || {};
  const integration = modelInfo?.integration || {};

  const currentPoint = operatingPoint === 'baseline' ? baseline : relaxed;

  return (
    <div className="page-models">
      <PageHeader 
        title="Model Performance & Evaluation Telemetry" 
        subtitle="Authoritative confusion matrices, operating threshold sensitivity, and frozen pipeline specifications."
      >
        <div className="models-header-chips">
          <span className="spec-chip">
            <span className="spec-dot live" />
            EVAL SPLIT: HOLDOUT (168H)
          </span>
          <span className="spec-chip">
            POPULATION: 1,343 COMPONENTS
          </span>
        </div>
      </PageHeader>

      {/* Top Headline Telemetry Strip */}
      <div className="eval-strip-grid">
        <div className="eval-strip-card">
          <span className="strip-label">F2 SCORE (RECALL-FOCUSED)</span>
          <div className="strip-val text-accent">{(baseline.f2 * 100 || 74.2).toFixed(2)}%</div>
          <span className="strip-sub">Frozen Operating Point</span>
        </div>
        <div className="eval-strip-card">
          <span className="strip-label">RECALL / SENSITIVITY</span>
          <div className="strip-val text-pass">{(baseline.recall * 100 || 72.2).toFixed(2)}%</div>
          <span className="strip-sub">{baseline.tp || 65} / {baseline.positives || 90} Defects Flagged</span>
        </div>
        <div className="eval-strip-card">
          <span className="strip-label">PRECISION (PPV)</span>
          <div className="strip-val">{(baseline.precision * 100 || 83.3).toFixed(2)}%</div>
          <span className="strip-sub">{baseline.tp || 65} / {baseline.flagged || 78} Alerts True</span>
        </div>
        <div className="eval-strip-card">
          <span className="strip-label">FPR (FALSE ALARM RATE)</span>
          <div className="strip-val">{(baseline.fpr * 100 || 1.04).toFixed(2)}%</div>
          <span className="strip-sub">{baseline.fp || 13} / {baseline.negatives || 1253} Healthy Parts</span>
        </div>
        <div className="eval-strip-card">
          <span className="strip-label">ACCURACY</span>
          <div className="strip-val">{(baseline.accuracy * 100 || 97.2).toFixed(2)}%</div>
          <span className="strip-sub">1,305 / 1,343 Correct</span>
        </div>
      </div>

      {/* Interactive Confusion Matrix Section */}
      <Card title="Authoritative Confusion Matrix (Holdout @ 168h)" className="confusion-matrix-card">
        <div className="cm-controls">
          <div className="cm-toggle-group">
            <span className="toggle-label">Select Operating Threshold:</span>
            <button 
              className={`btn-toggle ${operatingPoint === 'baseline' ? 'active' : ''}`}
              onClick={() => setOperatingPoint('baseline')}
            >
              1% FPR Baseline (Frozen Production)
            </button>
            <button 
              className={`btn-toggle ${operatingPoint === 'relaxed' ? 'active' : ''}`}
              onClick={() => setOperatingPoint('relaxed')}
            >
              Relaxed Cutoff (+1 Caught Defect)
            </button>
          </div>
          <div className="cm-active-description">
            <Sliders size={14} className="text-accent" />
            <span>{currentPoint.description}</span>
          </div>
        </div>

        <div className="cm-main-layout">
          {/* 2x2 Matrix Table */}
          <div className="cm-matrix-container">
            <div className="cm-matrix-headers">
              <div className="col-empty" />
              <div className="col-header">PREDICTED ABNORMAL</div>
              <div className="col-header">PREDICTED HEALTHY</div>
            </div>

            <div className="cm-matrix-row">
              <div className="row-header">ACTUAL DEFECT (P=90)</div>
              <div className="cm-cell tp-cell">
                <span className="cell-label">TRUE POSITIVE (TP)</span>
                <span className="cell-val text-pass">{currentPoint.tp}</span>
                <span className="cell-sub">Defect caught by screen</span>
              </div>
              <div className="cm-cell fn-cell">
                <span className="cell-label">FALSE NEGATIVE (FN)</span>
                <span className="cell-val text-reject">{currentPoint.fn}</span>
                <span className="cell-sub">Defect passed undetected</span>
              </div>
            </div>

            <div className="cm-matrix-row">
              <div className="row-header">ACTUAL HEALTHY (N=1253)</div>
              <div className="cm-cell fp-cell">
                <span className="cell-label">FALSE POSITIVE (FP)</span>
                <span className="cell-val text-monitor">{currentPoint.fp}</span>
                <span className="cell-sub">Healthy flagged (false alarm)</span>
              </div>
              <div className="cm-cell tn-cell">
                <span className="cell-label">TRUE NEGATIVE (TN)</span>
                <span className="cell-val">{currentPoint.tn}</span>
                <span className="cell-sub">Healthy confirmed & cleared</span>
              </div>
            </div>
          </div>

          {/* Metric Derivation Card */}
          <div className="cm-derivations-panel">
            <h4 className="derivation-title">Calculated Performance Derivations</h4>
            <div className="derivation-list">
              <div className="derivation-row">
                <span className="d-label">Recall / Sensitivity:</span>
                <span className="d-formula">TP / (TP + FN) = {currentPoint.tp}/90 =</span>
                <strong className="d-val text-pass">{(currentPoint.recall * 100).toFixed(2)}%</strong>
              </div>
              <div className="derivation-row">
                <span className="d-label">Precision (PPV):</span>
                <span className="d-formula">TP / (TP + FP) = {currentPoint.tp}/({currentPoint.tp + currentPoint.fp}) =</span>
                <strong className="d-val">{(currentPoint.precision * 100).toFixed(2)}%</strong>
              </div>
              <div className="derivation-row">
                <span className="d-label">Specificity (TNR):</span>
                <span className="d-formula">TN / (TN + FP) = {currentPoint.tn}/1253 =</span>
                <strong className="d-val">{(currentPoint.specificity * 100).toFixed(2)}%</strong>
              </div>
              <div className="derivation-row">
                <span className="d-label">False Positive Rate (FPR):</span>
                <span className="d-formula">FP / (FP + TN) = {currentPoint.fp}/1253 =</span>
                <strong className="d-val">{(currentPoint.fpr * 100).toFixed(2)}%</strong>
              </div>
              <div className="derivation-row">
                <span className="d-label">F1 Score:</span>
                <span className="d-formula">2·P·R / (P + R) =</span>
                <strong className="d-val">{(currentPoint.f1 * 100).toFixed(2)}%</strong>
              </div>
              <div className="derivation-row highlight">
                <span className="d-label">F2 Score (β=2):</span>
                <span className="d-formula">5·TP / (5·TP + FP + 4·FN) =</span>
                <strong className="d-val text-accent">{(currentPoint.f2 * 100).toFixed(2)}%</strong>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Operating Point Tradeoff & Decision D2 Card */}
      <Card title="Threshold Sensitivity & Decision D2 Operating Tradeoff" className="tradeoff-card">
        <div className="tradeoff-grid">
          <div className="tradeoff-table-wrapper">
            <table className="comparison-table">
              <thead>
                <tr>
                  <th>Operating Point</th>
                  <th>Cutoff Threshold</th>
                  <th>FN (Defects Missed)</th>
                  <th>FP (False Alarms)</th>
                  <th>Recall</th>
                  <th>Precision</th>
                  <th>F2 Score</th>
                </tr>
              </thead>
              <tbody>
                <tr className={operatingPoint === 'baseline' ? 'active-row' : ''}>
                  <td>
                    <strong>Baseline (1% FPR Budget)</strong>
                    <Badge status="PASS" size="sm">FROZEN</Badge>
                  </td>
                  <td className="code-font">0.900</td>
                  <td className="code-font text-reject font-bold">{baseline.fn || 25}</td>
                  <td className="code-font">{baseline.fp || 13}</td>
                  <td className="code-font">{(baseline.recall * 100 || 72.2).toFixed(2)}%</td>
                  <td className="code-font">{(baseline.precision * 100 || 83.3).toFixed(2)}%</td>
                  <td className="code-font text-accent font-bold">{(baseline.f2 * 100 || 74.2).toFixed(2)}%</td>
                </tr>
                <tr className={operatingPoint === 'relaxed' ? 'active-row' : ''}>
                  <td>
                    <strong>Relaxed Threshold</strong>
                    <Badge status="MONITOR" size="sm">EXPLORATORY</Badge>
                  </td>
                  <td className="code-font">0.880</td>
                  <td className="code-font text-pass font-bold">{relaxed.fn || 24} (-1 caught)</td>
                  <td className="code-font text-monitor font-bold">{relaxed.fp || 18} (+5 false alarms)</td>
                  <td className="code-font">{(relaxed.recall * 100 || 73.3).toFixed(2)}% (+1.11%)</td>
                  <td className="code-font">{(relaxed.precision * 100 || 78.6).toFixed(2)}% (-4.76%)</td>
                  <td className="code-font text-accent font-bold">{(relaxed.f2 * 100 || 74.3).toFixed(2)}% (+0.12%)</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="tradeoff-explanation-box">
            <h4 className="tradeoff-title">
              <GitCompare size={16} className="text-accent" />
              Mathematical Derivation of F2 Stability (Decision D2)
            </h4>
            <div className="f2-math-block">
              <code>F₂ = 5·TP / (5·TP + FP + 4·FN)</code>
            </div>
            <p className="tradeoff-text">
              When relaxing the threshold to catch 1 more defect (FN: 25 → 24, TP: 65 → 66), the numerator increases by 5 (325 → 330). However, doing so immediately triggers 5 additional false alarms (FP: 13 → 18). In the denominator:
            </p>
            <div className="f2-math-sub">
              <code>Baseline: 325 / (325 + 13 + 100) = 325 / 438 = 74.20%</code>
              <code>Relaxed:  330 / (330 + 18 + 96)  = 330 / 444 = 74.32%</code>
            </div>
            <p className="tradeoff-conclusion">
              <strong>Engineering Conclusion:</strong> Incurring 5 unnecessary component quarantine investigations for an imperceptible +0.12% F2 gain was rejected under Decision D2. The baseline operating point was locked in.
            </p>
          </div>
        </div>
      </Card>

      {/* Epoch Evolution & Variant Breakdown Grid */}
      <div className="eval-subgrids">
        {/* Multi-Epoch Screening Evolution */}
        <Card title="Defect Emergence Over Burn-in Epochs (0h → 168h)" className="subgrid-card">
          <div className="table-responsive">
            <table className="epoch-eval-table">
              <thead>
                <tr>
                  <th>Epoch</th>
                  <th>TP Caught</th>
                  <th>FN Missed</th>
                  <th>FP Alarms</th>
                  <th>Recall</th>
                  <th>Precision</th>
                  <th>Accuracy</th>
                </tr>
              </thead>
              <tbody>
                {epochs.map(e => (
                  <tr key={e.epoch} className={e.epoch === '168h' ? 'highlight-epoch' : ''}>
                    <td className="code-font font-bold">
                      {e.epoch} {e.epoch === '168h' && <Badge status="PASS" size="sm">FINAL</Badge>}
                    </td>
                    <td className="code-font text-pass font-bold">{e.tp}</td>
                    <td className="code-font text-reject">{e.fn}</td>
                    <td className="code-font">{e.fp}</td>
                    <td className="code-font">{(e.recall * 100).toFixed(1)}%</td>
                    <td className="code-font">{(e.precision * 100).toFixed(1)}%</td>
                    <td className="code-font">{(e.accuracy * 100).toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="subgrid-note">
            Notice how physical electrical anomalies manifest progressively from 0h (Recall: 15.6%) up to final 168h burn-in (Recall: 72.2%).
          </div>
        </Card>

        {/* Variant Breakdown */}
        <Card title="Performance by Device Variant (18 Holdout Lots)" className="subgrid-card">
          <div className="table-responsive">
            <table className="epoch-eval-table">
              <thead>
                <tr>
                  <th>Device Variant</th>
                  <th>Holdout Parts</th>
                  <th>TP</th>
                  <th>FN</th>
                  <th>FP</th>
                  <th>Recall</th>
                  <th>Precision</th>
                </tr>
              </thead>
              <tbody>
                {variants.map(v => (
                  <tr key={v.device_variant}>
                    <td><Badge variant={v.device_variant}>{v.device_variant}</Badge></td>
                    <td className="code-font">{v.components}</td>
                    <td className="code-font text-pass">{v.tp}</td>
                    <td className="code-font text-reject">{v.fn}</td>
                    <td className="code-font">{v.fp}</td>
                    <td className="code-font font-bold">{(v.recall * 100).toFixed(1)}%</td>
                    <td className="code-font">{(v.precision * 100).toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="subgrid-note">
            Evaluated on whole-lot holdout partitions (6 lots per variant) ensuring zero cross-lot contamination.
          </div>
        </Card>
      </div>

      {/* Model Manifests & Test Verification */}
      <div className="manifests-grid">
        <Card title="Module A: Release Manifest & Claim Verifications">
          <div className="manifest-body">
            <div className="manifest-row">
              <span className="m-label">Model Pipeline:</span>
              <span className="m-val code-font">{modA.model_version || 'ModuleA-FINAL01'}</span>
            </div>
            <div className="manifest-row">
              <span className="m-label">Dataset ID:</span>
              <span className="m-val code-font">{modA.dataset_id || 'SIH26170-FINAL-01'}</span>
            </div>
            <div className="manifest-row">
              <span className="m-label">Unit Test Suite:</span>
              <span className="m-val text-pass font-bold">151 passed (0 failed)</span>
            </div>
            <div className="manifest-row">
              <span className="m-label">Verified Claims:</span>
              <span className="m-val text-pass font-bold">166 verified (0 failed)</span>
            </div>
            <div className="manifest-row">
              <span className="m-label">Operating Threshold:</span>
              <span className="m-val code-font">0.900 (Decision D2)</span>
            </div>
            <div className="manifest-row">
              <span className="m-label">Confirmed Floor:</span>
              <span className="m-val code-font">0.900 (Datasheet Exceedance)</span>
            </div>
          </div>
        </Card>

        <Card title="Module B: Release Manifest & Claim Verifications">
          <div className="manifest-body">
            <div className="manifest-row">
              <span className="m-label">Release Candidate:</span>
              <span className="m-val code-font">{modB.release_candidate || 'ModuleB-FINAL01-RC2'}</span>
            </div>
            <div className="manifest-row">
              <span className="m-label">Release State:</span>
              <span className="m-val code-font">{modB.release_state || 'SPENT_HOLDOUT'}</span>
            </div>
            <div className="manifest-row">
              <span className="m-label">Unit & Integration Tests:</span>
              <span className="m-val text-pass font-bold">102 passed (0 failed)</span>
            </div>
            <div className="manifest-row">
              <span className="m-label">Verified Claims:</span>
              <span className="m-val text-pass font-bold">210 verified (0 failed)</span>
            </div>
            <div className="manifest-row">
              <span className="m-label">Holdout Completeness:</span>
              <span className="m-val text-pass font-bold">Enforced (18 Whole Lots)</span>
            </div>
            <div className="manifest-row">
              <span className="m-label">Disposition Rule:</span>
              <span className="m-val text-muted">Defers to Fusion (Decision D1)</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
