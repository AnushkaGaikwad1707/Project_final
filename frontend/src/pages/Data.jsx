import React, { useState } from 'react';
import { PageHeader } from '../components/layout/PageHeader';
import { Card } from '../components/ui/Card';
import { DataTable } from '../components/ui/DataTable';
import { LoadingState } from '../components/ui/LoadingState';
import { ErrorState } from '../components/ui/ErrorState';
import { Badge } from '../components/ui/Badge';
import { api } from '../services/api';
import { useApi } from '../hooks/useApi';
import { Database, PlusCircle, CheckCircle, RefreshCw, Layers, ShieldCheck } from 'lucide-react';
import './Data.css';

export default function Data() {
  const [activeTab, setActiveTab] = useState('view');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleRecordAdded = () => {
    setRefreshTrigger(prev => prev + 1);
  };
  
  return (
    <div className="page-data">
      <PageHeader 
        title="Operational Screening Data" 
        subtitle="Manage live test floor measurements safely separated from frozen benchmark models."
      >
        <div className="tabs">
          <button 
            className={`tab ${activeTab === 'view' ? 'active' : ''}`} 
            onClick={() => setActiveTab('view')}
          >
            <Database size={16} /> View Records
          </button>
          <button 
            className={`tab ${activeTab === 'add' ? 'active' : ''}`} 
            onClick={() => setActiveTab('add')}
          >
            <PlusCircle size={16} /> Add / Update Record
          </button>
        </div>
      </PageHeader>
      
      {activeTab === 'view' ? (
        <ViewRecords key={refreshTrigger} onAddNew={() => setActiveTab('add')} />
      ) : (
        <AddRecordWizard onComplete={handleRecordAdded} onCancel={() => setActiveTab('view')} />
      )}
    </div>
  );
}

function ViewRecords({ onAddNew }) {
  const { data, loading, error, refetch } = useApi('/api/dashboard/summary');

  if (loading) return <LoadingState message="Loading operational dataset records..." />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;

  const recentMeasurements = data?.recent_measurements || [];
  const recentComponents = data?.recently_updated_components || [];

  return (
    <div className="view-records">
      <div className="data-protection-banner">
        <ShieldCheck size={20} className="shield-icon" />
        <div>
          <strong>Frozen Benchmark Isolation Active:</strong> Operational data additions only modify the local operational database (<span className="code-font">operational.db</span>). The authoritative frozen Module A and Module B evaluation sets remain immutable.
        </div>
      </div>

      <div className="summary-grid">
        <Card title="Registered Components">
          <div className="stat-value">{data?.total_components || 0}</div>
          <div className="stat-sub">Tracked in operational DB</div>
        </Card>
        <Card title="Total Measurements">
          <div className="stat-value text-accent">{data?.total_measurements || 0}</div>
          <div className="stat-sub">Across all burn-in epochs</div>
        </Card>
        <Card title="Latest Ingestion">
          <div className="stat-value stat-small">
            {data?.latest_measurement?.measured_at || 'None recorded'}
          </div>
          <div className="stat-sub">
            {data?.latest_measurement ? `Epoch ${data.latest_measurement.epoch_h}h for ${data.latest_measurement.component_id}` : 'No activity yet'}
          </div>
        </Card>
      </div>

      <div className="records-tables-grid">
        <Card title="Recent Ingested Measurements">
          {recentMeasurements.length === 0 ? (
            <div className="empty-inline">
              No operational measurements entered yet.
              <button className="btn-inline" onClick={onAddNew}>Add First Record</button>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="operational-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Component</th>
                    <th>Epoch</th>
                    <th>Timestamp</th>
                    <th>Source</th>
                  </tr>
                </thead>
                <tbody>
                  {recentMeasurements.map(m => (
                    <tr key={m.measurement_id}>
                      <td>#{m.measurement_id}</td>
                      <td><strong>{m.component_id}</strong></td>
                      <td><span className="epoch-pill">{m.epoch_h}h</span></td>
                      <td>{m.measured_at || '-'}</td>
                      <td><span className="source-tag">{m.source || 'manual'}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card title="Operational Components Registry">
          {recentComponents.length === 0 ? (
            <div className="empty-inline">No components registered yet.</div>
          ) : (
            <div className="table-responsive">
              <table className="operational-table">
                <thead>
                  <tr>
                    <th>Component ID</th>
                    <th>Lot ID</th>
                    <th>Variant</th>
                    <th>Latest Update</th>
                  </tr>
                </thead>
                <tbody>
                  {recentComponents.map(c => (
                    <tr key={c.component_id}>
                      <td><strong>{c.component_id}</strong></td>
                      <td>{c.lot_id || '-'}</td>
                      <td><Badge>{c.device_variant || 'Unknown'}</Badge></td>
                      <td>{c.latest_measurement_at || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function AddRecordWizard({ onComplete, onCancel }) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    component_id: '',
    lot_id: '',
    device_variant: 'CMOS_A',
    epoch_h: '0',
    measurements: {
      IDDQ: '',
      Input_Leakage_Current: '',
      Active_Supply_Current: '',
      Propagation_Delay: '',
      Output_Rise_Time: '',
      Output_Fall_Time: ''
    }
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [successResult, setSuccessResult] = useState(null);

  const handleNext = () => setStep(s => s + 1);
  const handlePrev = () => setStep(s => s - 1);

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        component_id: formData.component_id.trim().toUpperCase(),
        lot_id: formData.lot_id.trim(),
        device_variant: formData.device_variant,
        epoch_h: parseInt(formData.epoch_h, 10),
        IDDQ: parseFloat(formData.measurements.IDDQ),
        Input_Leakage_Current: parseFloat(formData.measurements.Input_Leakage_Current),
        Active_Supply_Current: parseFloat(formData.measurements.Active_Supply_Current),
        Propagation_Delay: parseFloat(formData.measurements.Propagation_Delay),
        Output_Rise_Time: parseFloat(formData.measurements.Output_Rise_Time),
        Output_Fall_Time: parseFloat(formData.measurements.Output_Fall_Time)
      };
      
      const res = await api.post('/api/measurements', payload);
      setSuccessResult(res);
      if (onComplete) onComplete();
    } catch (err) {
      setError(err.message || 'Failed to submit operational measurement.');
    } finally {
      setSubmitting(false);
    }
  };

  const isStep1Valid = formData.component_id.trim() && formData.lot_id.trim() && formData.device_variant;
  const isStep2Valid = formData.epoch_h !== '';
  const isStep3Valid = Object.values(formData.measurements).every(v => v !== '' && !isNaN(v) && parseFloat(v) > 0);

  if (successResult) {
    return (
      <Card className="wizard-card">
        <div className="wizard-success">
          <div className="success-icon-wrap">
            <CheckCircle size={44} color="var(--status-pass)" />
          </div>
          <h3>Operational Measurement Stored Successfully</h3>
          <p className="success-desc">
            Measurement record #{successResult.measurement_id} for component <strong>{formData.component_id.toUpperCase()}</strong> at epoch <strong>{formData.epoch_h}h</strong> has been committed to the operational screening database.
          </p>
          
          <div className="stored-summary">
            <div className="stored-item"><span>Component:</span> <strong>{formData.component_id.toUpperCase()}</strong></div>
            <div className="stored-item"><span>Lot:</span> <strong>{formData.lot_id}</strong></div>
            <div className="stored-item"><span>Variant:</span> <strong>{formData.device_variant}</strong></div>
            <div className="stored-item"><span>Epoch:</span> <strong>{formData.epoch_h}h</strong></div>
          </div>

          <div className="success-actions">
            <button 
              className="btn-primary" 
              onClick={() => {
                setSuccessResult(null);
                setStep(1);
                setFormData({
                  ...formData,
                  component_id: '',
                  measurements: {
                    IDDQ: '',
                    Input_Leakage_Current: '',
                    Active_Supply_Current: '',
                    Propagation_Delay: '',
                    Output_Rise_Time: '',
                    Output_Fall_Time: ''
                  }
                });
              }}
            >
              Add Another Record
            </button>
            <button className="btn-secondary" onClick={onCancel}>
              View All Records
            </button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="wizard-card">
      <div className="wizard-header">
        <div className={`step-indicator ${step >= 1 ? 'active' : ''}`}>1. Identifiers</div>
        <div className="step-line"></div>
        <div className={`step-indicator ${step >= 2 ? 'active' : ''}`}>2. Epoch</div>
        <div className="step-line"></div>
        <div className={`step-indicator ${step >= 3 ? 'active' : ''}`}>3. Measurements</div>
        <div className="step-line"></div>
        <div className={`step-indicator ${step >= 4 ? 'active' : ''}`}>4. Verification</div>
      </div>

      <div className="wizard-content">
        {step === 1 && (
          <div className="form-group-list">
            <div className="form-group">
              <label>Component ID *</label>
              <input 
                type="text" 
                value={formData.component_id} 
                onChange={e => setFormData({...formData, component_id: e.target.value})} 
                placeholder="e.g. COMP_0991 or C00158" 
                autoFocus
              />
              <span className="field-hint">Unique identifier for the tested die or package.</span>
            </div>
            <div className="form-group">
              <label>Lot ID *</label>
              <input 
                type="text" 
                value={formData.lot_id} 
                onChange={e => setFormData({...formData, lot_id: e.target.value})} 
                placeholder="e.g. LOT_A01" 
              />
              <span className="field-hint">Manufacturing production batch identifier.</span>
            </div>
            <div className="form-group">
              <label>Device Variant *</label>
              <select 
                value={formData.device_variant} 
                onChange={e => setFormData({...formData, device_variant: e.target.value})}
              >
                <option value="CMOS_A">CMOS_A (Standard Speed / High Density)</option>
                <option value="CMOS_B">CMOS_B (High Performance / High Drive)</option>
                <option value="CMOS_C">CMOS_C (Low Power / Tight Leakage)</option>
              </select>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="form-group">
            <label>Burn-in Screening Epoch *</label>
            <div className="radio-group">
              {[0, 24, 96, 168].map(h => (
                <label key={h} className={`radio-label ${formData.epoch_h === String(h) ? 'selected' : ''}`}>
                  <input 
                    type="radio" 
                    name="epoch" 
                    value={h} 
                    checked={formData.epoch_h === String(h)} 
                    onChange={e => setFormData({...formData, epoch_h: e.target.value})} 
                  />
                  <div>
                    <strong>{h}h</strong>
                    <span>{h === 0 ? 'Baseline (Pre-burn-in)' : h === 168 ? 'Final Test Point' : 'Interim Inspection'}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="measurements-section">
            <div className="measurements-intro">
              Enter all 6 physical electrical and timing measurements. Values must be positive numbers.
            </div>
            <div className="measurements-grid">
              {[
                { key: 'IDDQ', label: 'IDDQ Quiescent Current', unit: 'uA', placeholder: 'e.g. 1.75' },
                { key: 'Input_Leakage_Current', label: 'Input Leakage Current', unit: 'uA', placeholder: 'e.g. 0.016' },
                { key: 'Active_Supply_Current', label: 'Active Supply Current', unit: 'uA', placeholder: 'e.g. 96.5' },
                { key: 'Propagation_Delay', label: 'Propagation Delay', unit: 'ns', placeholder: 'e.g. 9.83' },
                { key: 'Output_Rise_Time', label: 'Output Rise Time', unit: 'ns', placeholder: 'e.g. 7.94' },
                { key: 'Output_Fall_Time', label: 'Output Fall Time', unit: 'ns', placeholder: 'e.g. 8.15' }
              ].map(param => (
                <div key={param.key} className="form-group">
                  <label>{param.label} ({param.unit}) *</label>
                  <input 
                    type="number" 
                    step="any"
                    min="0.000001"
                    value={formData.measurements[param.key]} 
                    onChange={e => setFormData({
                      ...formData, 
                      measurements: { ...formData.measurements, [param.key]: e.target.value }
                    })} 
                    placeholder={param.placeholder} 
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="review-section">
            <h4>Verify Entered Measurement Specification</h4>
            {error && <div className="error-message">{error}</div>}
            
            <div className="review-grid">
              <div><span className="review-label">Component:</span> <strong>{formData.component_id.toUpperCase()}</strong></div>
              <div><span className="review-label">Lot:</span> <strong>{formData.lot_id}</strong></div>
              <div><span className="review-label">Variant:</span> <strong>{formData.device_variant}</strong></div>
              <div><span className="review-label">Epoch:</span> <strong>{formData.epoch_h}h</strong></div>
            </div>

            <h5 className="review-subhead">Parametric Values to Store:</h5>
            <div className="measurements-review-table">
              {Object.entries(formData.measurements).map(([k, v]) => (
                <div key={k} className="review-meas-row">
                  <span className="meas-name">{k.replace(/_/g, ' ')}:</span>
                  <span className="meas-val">{v}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="wizard-footer">
        {step > 1 && (
          <button className="btn-secondary" onClick={handlePrev} disabled={submitting}>
            Back
          </button>
        )}
        <div style={{ flex: 1 }}></div>
        {step < 4 && (
          <button 
            className="btn-primary" 
            onClick={handleNext} 
            disabled={(step === 1 && !isStep1Valid) || (step === 2 && !isStep2Valid) || (step === 3 && !isStep3Valid)}
          >
            Next
          </button>
        )}
        {step === 4 && (
          <button className="btn-primary" onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Submitting to Database...' : 'Commit Operational Record'}
          </button>
        )}
      </div>
    </Card>
  );
}
