import { useEffect, useState } from "react";
import "./App.css";

const API_URL = "http://127.0.0.1:8000";

function App() {
  const [analysis, setAnalysis] = useState(null);
  const [selectedComponent, setSelectedComponent] = useState(null);
  const [searchId, setSearchId] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  
  const [measurementForm, setMeasurementForm] = useState({
    component_id: "",
    lot_id: "",
    device_variant: "CMOS_A",
    epoch_h: 0,
    IDDQ: "",
    Input_Leakage_Current: "",
    Active_Supply_Current: "",
    Propagation_Delay: "",
    Output_Rise_Time: "",
    Output_Fall_Time: "",
  });

  const [measurementMessage, setMeasurementMessage] = useState("");
  const [measurementError, setMeasurementError] = useState("");
  const [measurementLoading, setMeasurementLoading] = useState(false);
  // ============================================================
  // LOAD COMPLETE ANALYSIS
  // ============================================================

  useEffect(() => {
    fetch(`${API_URL}/analysis`)
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to load analysis");
        }

        return response.json();
      })
      .then((data) => {
        setAnalysis(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError(
          "Could not connect to the FastAPI backend. Make sure the backend is running."
        );
        setLoading(false);
      });
  }, []);

  // ============================================================
  // SEARCH COMPONENT
  // ============================================================

  const searchComponent = async () => {
    const id = searchId.trim().toUpperCase();

    if (!id) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/analysis/${id}`);
      const data = await response.json();

      if (data.error) {
        setSelectedComponent(null);
        setError("Component not found.");
        return;
      }

      setSelectedComponent(data);
      setError("");
    } catch (err) {
      console.error(err);
      setError("Could not connect to the backend.");
    }
  };
 
    // ============================================================
  // ADD OPERATIONAL MEASUREMENT
  // ============================================================

  const submitMeasurement = async (event) => {
    event.preventDefault();

    setMeasurementMessage("");
    setMeasurementError("");
    setMeasurementLoading(true);

    try {
      const payload = {
        component_id: measurementForm.component_id.trim().toUpperCase(),
        lot_id: measurementForm.lot_id.trim(),
        device_variant: measurementForm.device_variant,
        epoch_h: Number(measurementForm.epoch_h),
        IDDQ: Number(measurementForm.IDDQ),
        Input_Leakage_Current: Number(
          measurementForm.Input_Leakage_Current
        ),
        Active_Supply_Current: Number(
          measurementForm.Active_Supply_Current
        ),
        Propagation_Delay: Number(
          measurementForm.Propagation_Delay
        ),
        Output_Rise_Time: Number(
          measurementForm.Output_Rise_Time
        ),
        Output_Fall_Time: Number(
          measurementForm.Output_Fall_Time
        ),
      };

      const response = await fetch(
        `${API_URL}/api/measurements`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || data.message || "Failed to add measurement."
        );
      }

      setMeasurementMessage(
        `Measurement added successfully for ${payload.component_id} at ${payload.epoch_h}h.`
      );

      setMeasurementForm({
        component_id: "",
        lot_id: "",
        device_variant: "CMOS_A",
        epoch_h: 0,
        IDDQ: "",
        Input_Leakage_Current: "",
        Active_Supply_Current: "",
        Propagation_Delay: "",
        Output_Rise_Time: "",
        Output_Fall_Time: "",
      });
    } catch (err) {
      console.error(err);
      setMeasurementError(err.message);
    } finally {
      setMeasurementLoading(false);
    }
  };
  // ============================================================
  // SELECT COMPONENT FROM TABLE
  // ============================================================

  const openComponent = async (componentId) => {
    try {
      const response = await fetch(
        `${API_URL}/analysis/${componentId}`
      );

      const data = await response.json();

      if (data.error) {
        setError("Component not found.");
        return;
      }

      setSelectedComponent(data);
      setSearchId(componentId);
      setError("");

      window.scrollTo({
        top: document.body.scrollHeight,
        behavior: "smooth",
      });
    } catch (err) {
      console.error(err);
      setError("Could not load component.");
    }
  };

  // ============================================================
  // LOADING
  // ============================================================

  if (loading) {
    return (
      <div className="app">
        <div className="loading">
          <h1>SIH26170</h1>
          <p>Loading component analysis...</p>
        </div>
      </div>
    );
  }

  // ============================================================
  // CONNECTION ERROR
  // ============================================================

  if (error && !analysis) {
    return (
      <div className="app">
        <div className="error-box">
          <h1>SIH26170</h1>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  const decisionCounts = analysis?.decision_counts || {};

  const passCount = decisionCounts.PASS || 0;
  const monitorCount = decisionCounts.MONITOR || 0;
  const rejectCount = decisionCounts.REJECT || 0;

  const components = analysis?.components || [];

  // ============================================================
  // FILTER TABLE
  // ============================================================

  const filteredComponents =
    filter === "ALL"
      ? components
      : components.filter(
          (component) =>
            component.final_decision === filter
        );

  // ============================================================
  // DASHBOARD
  // ============================================================

  return (
    <div className="app">

      {/* ======================================================
          HEADER
          ====================================================== */}

      <header className="header">

        <div>
          <p className="eyebrow">SIH26170</p>

          <h1>
            Component Analysis Dashboard
          </h1>

          <p className="subtitle">
            AI-assisted semiconductor component screening and
            explainability
          </p>
        </div>

        <div className="status">
          <span className="status-dot"></span>
          Backend Connected
        </div>

      </header>


      {/* ======================================================
          SUMMARY CARDS
          ====================================================== */}

      <section className="summary-grid">

        <div className="summary-card">
          <p>Total Components</p>
          <h2>{analysis?.total_components || 0}</h2>
        </div>

        <div className="summary-card pass">
          <p>PASS</p>
          <h2>{passCount}</h2>
        </div>

        <div className="summary-card monitor">
          <p>MONITOR</p>
          <h2>{monitorCount}</h2>
        </div>

        <div className="summary-card reject">
          <p>REJECT</p>
          <h2>{rejectCount}</h2>
        </div>

      </section>

      {/* ======================================================
          ADD OPERATIONAL MEASUREMENT
          ====================================================== */}

      <section className="measurement-section">

        <div className="section-heading">
          <div>
            <p className="eyebrow">Operational Layer</p>
            <h2>Add Burn-in Measurement</h2>
            <p className="section-description">
              Enter a new measurement observation for a Digital CMOS component.
            </p>
          </div>

          <div className="epoch-indicator">
            <span>Burn-in</span>
            <strong>{measurementForm.epoch_h}h</strong>
          </div>
        </div>

        <form onSubmit={submitMeasurement}>

          <div className="form-row">

            <div className="form-field">
              <label>Component ID</label>
              <input
                type="text"
                placeholder="e.g. DEMO001"
                value={measurementForm.component_id}
                onChange={(event) =>
                  setMeasurementForm({
                    ...measurementForm,
                    component_id: event.target.value,
                  })
                }
                required
              />
            </div>

            <div className="form-field">
              <label>Lot ID</label>
              <input
                type="text"
                placeholder="e.g. LOT_01"
                value={measurementForm.lot_id}
                onChange={(event) =>
                  setMeasurementForm({
                    ...measurementForm,
                    lot_id: event.target.value,
                  })
                }
                required
              />
            </div>

            <div className="form-field">
              <label>Device Variant</label>
              <select
                value={measurementForm.device_variant}
                onChange={(event) =>
                  setMeasurementForm({
                    ...measurementForm,
                    device_variant: event.target.value,
                  })
                }
              >
                <option value="CMOS_A">CMOS_A</option>
                <option value="CMOS_B">CMOS_B</option>
                <option value="CMOS_C">CMOS_C</option>
              </select>
            </div>

            <div className="form-field">
              <label>Burn-in Epoch</label>
              <select
                value={measurementForm.epoch_h}
                onChange={(event) =>
                  setMeasurementForm({
                    ...measurementForm,
                    epoch_h: Number(event.target.value),
                  })
                }
              >
                <option value={0}>0h</option>
                <option value={24}>24h</option>
                <option value={96}>96h</option>
                <option value={168}>168h</option>
              </select>
            </div>

          </div>


          <div className="parameter-grid">

            <div className="parameter-field">
              <label>IDDQ</label>
              <input
                type="number"
                step="any"
                min="0"
                value={measurementForm.IDDQ}
                onChange={(event) =>
                  setMeasurementForm({
                    ...measurementForm,
                    IDDQ: event.target.value,
                  })
                }
                required
              />
            </div>

            <div className="parameter-field">
              <label>Input Leakage Current</label>
              <input
                type="number"
                step="any"
                min="0"
                value={measurementForm.Input_Leakage_Current}
                onChange={(event) =>
                  setMeasurementForm({
                    ...measurementForm,
                    Input_Leakage_Current: event.target.value,
                  })
                }
                required
              />
            </div>

            <div className="parameter-field highlight">
              <label>Active Supply Current</label>
              <input
                type="number"
                step="any"
                min="0"
                value={measurementForm.Active_Supply_Current}
                onChange={(event) =>
                  setMeasurementForm({
                    ...measurementForm,
                    Active_Supply_Current: event.target.value,
                  })
                }
                required
              />
            </div>

            <div className="parameter-field">
              <label>Propagation Delay</label>
              <input
                type="number"
                step="any"
                min="0"
                value={measurementForm.Propagation_Delay}
                onChange={(event) =>
                  setMeasurementForm({
                    ...measurementForm,
                    Propagation_Delay: event.target.value,
                  })
                }
                required
              />
            </div>

            <div className="parameter-field">
              <label>Output Rise Time</label>
              <input
                type="number"
                step="any"
                min="0"
                value={measurementForm.Output_Rise_Time}
                onChange={(event) =>
                  setMeasurementForm({
                    ...measurementForm,
                    Output_Rise_Time: event.target.value,
                  })
                }
                required
              />
            </div>

            <div className="parameter-field">
              <label>Output Fall Time</label>
              <input
                type="number"
                step="any"
                min="0"
                value={measurementForm.Output_Fall_Time}
                onChange={(event) =>
                  setMeasurementForm({
                    ...measurementForm,
                    Output_Fall_Time: event.target.value,
                  })
                }
                required
              />
            </div>

          </div>


          <div className="measurement-actions">

            <button
              type="submit"
              className="add-measurement-button"
              disabled={measurementLoading}
            >
              {measurementLoading
                ? "Adding Measurement..."
                : "＋ Add Measurement"}
            </button>

            {measurementMessage && (
              <p className="success-message">
                {measurementMessage}
              </p>
            )}

            {measurementError && (
              <p className="error-text">
                {measurementError}
              </p>
            )}

          </div>

        </form>

      </section>

      {/* ======================================================
          SEARCH
          ====================================================== */}

      <section className="search-section">

        <h2>Component Lookup</h2>

        <div className="search-box">

          <input
            type="text"
            placeholder="Enter component ID e.g. C0310"
            value={searchId}
            onChange={(event) =>
              setSearchId(event.target.value)
            }
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                searchComponent();
              }
            }}
          />

          <button onClick={searchComponent}>
            Search
          </button>

        </div>

        {error && analysis && (
          <p className="error-text">{error}</p>
        )}

      </section>


      {/* ======================================================
          COMPONENT TABLE
          ====================================================== */}

      <section className="table-section">

        <div className="table-header">

          <div>
            <p className="eyebrow">Component Inventory</p>

            <h2>
              Component Overview
            </h2>
          </div>

          <span className="component-count">
            Showing {filteredComponents.length} of{" "}
            {components.length}
          </span>

        </div>


        {/* FILTER BUTTONS */}

        <div className="filter-buttons">

          <button
            className={filter === "ALL" ? "active" : ""}
            onClick={() => setFilter("ALL")}
          >
            ALL
          </button>

          <button
            className={filter === "PASS" ? "active pass-filter" : ""}
            onClick={() => setFilter("PASS")}
          >
            PASS
          </button>

          <button
            className={
              filter === "MONITOR"
                ? "active monitor-filter"
                : ""
            }
            onClick={() => setFilter("MONITOR")}
          >
            MONITOR
          </button>

          <button
            className={
              filter === "REJECT"
                ? "active reject-filter"
                : ""
            }
            onClick={() => setFilter("REJECT")}
          >
            REJECT
          </button>

        </div>


        {/* TABLE */}

        <div className="table-wrapper">

          <table>

            <thead>
              <tr>
                <th>Component</th>
                <th>Lot</th>
                <th>Variant</th>
                <th>Module A</th>
                <th>Module B</th>
                <th>Final Decision</th>
              </tr>
            </thead>

            <tbody>

              {filteredComponents.map(
                (component) => (

                  <tr
                    key={component.component_id}
                    onClick={() =>
                      openComponent(
                        component.component_id
                      )
                    }
                  >

                    <td className="component-id">
                      {component.component_id}
                    </td>

                    <td>
                      {component.lot_id}
                    </td>

                    <td>
                      {component.device_variant}
                    </td>

                    <td>
                      <span
                        className={`table-badge ${String(
                          component.module_A_decision || ""
                        ).toLowerCase()}`}
                      >
                        {component.module_A_decision}
                      </span>
                    </td>

                    <td>
                      <span
                        className={`table-badge ${String(
                          component.module_B_decision || ""
                        ).toLowerCase()}`}
                      >
                        {component.module_B_decision}
                      </span>
                    </td>

                    <td>
                      <span
                        className={`table-badge ${String(
                          component.final_decision || ""
                        ).toLowerCase()}`}
                      >
                        {component.final_decision}
                      </span>
                    </td>

                  </tr>

                )
              )}

            </tbody>

          </table>

        </div>

      </section>


      {/* ======================================================
          COMPONENT DETAILS
          ====================================================== */}

      {selectedComponent && (

        <section className="details-section">

          <div className="details-header">

            <div>
              <p className="eyebrow">
                Selected Component
              </p>

              <h2>
                {selectedComponent.component_id}
              </h2>
            </div>

            <div
              className={`decision ${String(
                selectedComponent.final_decision
              ).toLowerCase()}`}
            >
              {selectedComponent.final_decision}
            </div>

          </div>


          {/* BASIC INFORMATION */}

          <div className="info-grid">

            <div className="info-card">
              <span>Lot</span>
              <strong>
                {selectedComponent.lot_id}
              </strong>
            </div>

            <div className="info-card">
              <span>Device Variant</span>
              <strong>
                {selectedComponent.device_variant}
              </strong>
            </div>

            <div className="info-card">
              <span>Driving Parameter</span>
              <strong>
                {selectedComponent.driving_parameter}
              </strong>
            </div>

            <div className="info-card">
              <span>Unit</span>
              <strong>
                {selectedComponent.unit}
              </strong>
            </div>

          </div>


          {/* MODULE DECISIONS */}

          <div className="section-block">

            <h3>Module Decisions</h3>

            <div className="module-grid">

              <div className="module-card">

                <p>Module A</p>

                <strong>
                  {selectedComponent.module_A_decision}
                </strong>

                <span>
                  Risk: {selectedComponent.module_A_risk}
                </span>

                <small>
                  {selectedComponent.module_A_reason_code}
                </small>

              </div>


              <div className="module-card">

                <p>Module B</p>

                <strong>
                  {selectedComponent.module_B_decision}
                </strong>

                <span>
                  Risk: {selectedComponent.module_B_risk}
                </span>

                <small>
                  {selectedComponent.module_B_reason_code}
                </small>

              </div>

            </div>

          </div>


          {/* PREDICTION */}

          <div className="section-block">

            <h3>
              Prediction & Specification
            </h3>

            <div className="measurement-grid">

              <div>
                <span>0h Value</span>

                <strong>
                  {selectedComponent.value_0h}{" "}
                  {selectedComponent.unit}
                </strong>
              </div>

              <div>
                <span>24h Value</span>

                <strong>
                  {selectedComponent.value_24h}{" "}
                  {selectedComponent.unit}
                </strong>
              </div>

              <div>
                <span>Predicted 168h</span>

                <strong>
                  {selectedComponent.predicted_168h}{" "}
                  {selectedComponent.unit}
                </strong>
              </div>

              <div>
                <span>Specification Limit</span>

                <strong>
                  {selectedComponent.spec_limit}{" "}
                  {selectedComponent.unit}
                </strong>
              </div>

              <div>
                <span>Headroom</span>

                <strong>
                  {selectedComponent.headroom_abs}{" "}
                  {selectedComponent.unit}
                </strong>
              </div>

              <div>
                <span>Headroom Fraction</span>

                <strong>
                  {selectedComponent.headroom_frac}
                </strong>
              </div>

            </div>

          </div>


          {/* CONFIDENCE */}

          <div className="section-block">

            <h3>
              Confidence & Uncertainty
            </h3>

            <div className="confidence-grid">

              <div>
                <span>Module A Confidence</span>

                <strong>
                  {selectedComponent.confidence_A}
                </strong>
              </div>

              <div>
                <span>Module B Confidence</span>

                <strong>
                  {selectedComponent.confidence_B}
                </strong>
              </div>

              <div>
                <span>Extrapolation</span>

                <strong>
                  {selectedComponent.extrapolation_flag
                    ? "YES"
                    : "NO"}
                </strong>
              </div>

            </div>

          </div>


          {/* EXPLANATION */}

          <div className="explanation">

            <h3>
              Why this decision?
            </h3>

            <p>
              {selectedComponent.explanation}
            </p>

          </div>

        </section>

      )}

    </div>
  );
}

export default App;