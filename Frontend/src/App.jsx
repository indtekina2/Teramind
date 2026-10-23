import { useCallback, useEffect, useState } from "react";

const agents = [
  { name: "Interpreter", role: "Finds the real question", color: "violet", icon: "◈" },
  { name: "PastProblems", label: "Past problems", role: "Finds relevant history", color: "violet", icon: "◷" },
  { name: "Optimist", role: "Builds a path forward", color: "green", icon: "↗" },
  { name: "Pessimist", role: "Pressure-tests the plan", color: "orange", icon: "⌁" },
  { name: "Critic", role: "Checks the reasoning", color: "blue", icon: "◎" },
  { name: "Summary", role: "Brings it together", color: "violet", icon: "✦" },
];

const examples = [
  "How can I make a career change into product design?",
  "Help me decide whether to build or buy our analytics platform.",
  "I want to start a small online business while working full time.",
];

async function request(path, options) {
  const response = await fetch(path, {
    ...options,
    headers: { "Content-Type": "application/json", ...options?.headers },
  });
  const data = await response.json();
  if (!response.ok) {
    const error = new Error(data.error || "Something went wrong. Please try again.");
    error.runId = data.runId;
    throw error;
  }
  return data;
}

function Icon({ name, size = 18 }) {
  const paths = {
    plus: <><path d="M12 5v14" /><path d="M5 12h14" /></>,
    spark: <><path d="m12 3 1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2L12 3Z" /><path d="m19 14 1 2.5 2.5 1-2.5 1L19 21l-1-2.5-2.5-1 2.5-1 1-2.5Z" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    grid: <><rect x="3" y="3" width="8" height="8" rx="2" /><rect x="13" y="3" width="8" height="5" rx="2" /><rect x="13" y="10" width="8" height="11" rx="2" /><rect x="3" y="13" width="8" height="8" rx="2" /></>,
    arrow: <><path d="M7 17 17 7" /><path d="M7 7h10v10" /></>,
    send: <><path d="m22 2-7 20-4-9-9-4Z" /><path d="M22 2 11 13" /></>,
    chevron: <path d="m9 18 6-6-6-6" />,
    check: <path d="m5 12 4 4L19 6" />,
    back: <><path d="m15 18-6-6 6-6" /><path d="M9 12h11" /></>,
    menu: <><path d="M4 6h16" /><path d="M4 12h16" /><path d="M4 18h16" /></>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name]}
    </svg>
  );
}

function StatusDot({ state }) {
  return <span className={`status-dot ${state === "ok" ? "is-ok" : "is-offline"}`} />;
}

function App() {
  const [runs, setRuns] = useState([]);
  const [health, setHealth] = useState(null);
  const [prompt, setPrompt] = useState("");
  const [humanInLoop, setHumanInLoop] = useState(true);
  const [activeRun, setActiveRun] = useState(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState("home");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [error, setError] = useState("");

  const loadRuns = useCallback(async () => {
    try {
      const [{ runs: recent }, service] = await Promise.all([
        request("/api/runs"),
        request("/api/health"),
      ]);
      setRuns(recent);
      setHealth(service);
    } catch {
      setHealth({ status: "offline", database: "disconnected", modelConfigured: false });
    }
  }, []);

  useEffect(() => {
    loadRuns();
  }, [loadRuns]);

  const startNew = () => {
    setPage("home");
    setActiveRun(null);
    setPrompt("");
    setError("");
    setSidebarOpen(false);
  };

  const openRun = async (runId) => {
    setError("");
    setSidebarOpen(false);
    try {
      const { run } = await request(`/api/runs/${runId}`);
      setActiveRun(run);
      setPage("run");
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const submitPrompt = async (event) => {
    event.preventDefault();
    if (!prompt.trim() || loading) return;
    setLoading(true);
    setError("");
    setActiveRun(null);
    setPage("run");
    try {
      const { run } = await request("/api/runs", {
        method: "POST",
        body: JSON.stringify({ prompt: prompt.trim(), humanInLoop }),
      });
      setActiveRun(run);
      setPrompt("");
      await loadRuns();
    } catch (requestError) {
      if (requestError.runId) {
        try {
          const { run } = await request(`/api/runs/${requestError.runId}`);
          setActiveRun(run);
        } catch (loadError) {
          setError(loadError.message);
        }
      } else {
        setError(requestError.message);
      }
      await loadRuns();
    } finally {
      setLoading(false);
    }
  };

  const respondToRun = async (answer) => {
    if (!activeRun || loading) return;
    setLoading(true);
    setError("");
    try {
      const { run } = await request(`/api/runs/${activeRun._id}/respond`, {
        method: "POST",
        body: JSON.stringify({ answer }),
      });
      setActiveRun(run);
      await loadRuns();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  const togglePage = (value) => {
    setPage(value);
    setActiveRun(null);
    setError("");
    setSidebarOpen(false);
  };

  return (
    <div className="app-shell">
      <aside className={`sidebar ${sidebarOpen ? "sidebar-open" : ""}`}>
        <button className="brand" onClick={startNew} aria-label="Teramind home">
          <span className="brand-mark"><span /><span /><span /><span /></span>
          <span>teramind<span className="brand-period">.</span></span>
        </button>
        <div className="workspace-label">WORKSPACE</div>
        <button className={`nav-item ${page === "home" || page === "run" ? "active" : ""}`} onClick={startNew}>
          <Icon name="grid" size={17} /><span>New analysis</span><span className="nav-shortcut">⌘ K</span>
        </button>
        <button className={`nav-item ${page === "history" ? "active" : ""}`} onClick={() => togglePage("history")}>
          <Icon name="clock" size={17} /><span>History</span>
        </button>
        <div className="sidebar-divider" />
        <div className="recent-heading"><span>RECENT ANALYSES</span><span className="recent-count">{runs.length}</span></div>
        <div className="recent-list">
          {runs.slice(0, 8).map((run) => (
            <button key={run._id} className={`recent-item ${activeRun?._id === run._id ? "selected" : ""}`} onClick={() => openRun(run._id)} title={run.title}>
              <span className={`recent-status ${run.status}`} />
              <span>{run.title}</span>
            </button>
          ))}
          {!runs.length && <p className="recent-empty">Your analyses will live here.</p>}
        </div>
        <div className="sidebar-bottom">
          <div className="service-card">
            <div className="service-top"><span className="service-icon"><Icon name="spark" size={15} /></span><span>System status</span><StatusDot state={health?.status === "ok" && health.modelConfigured ? "ok" : "offline"} /></div>
            <p>{health?.status === "ok" && health.modelConfigured ? "All systems operational" : "Setup required"}</p>
            <div className="service-meta"><span>Database</span><span>{health?.database === "connected" ? "Connected" : "Offline"}</span></div>
            <div className="service-meta"><span>AI engine</span><span>{health?.modelConfigured ? "Ready" : "Not configured"}</span></div>
          </div>
          <div className="user-profile"><span className="avatar">T</span><span className="user-copy"><strong>My workspace</strong><small>Personal account</small></span><span className="profile-menu">···</span></div>
        </div>
      </aside>

      {sidebarOpen && <button className="mobile-scrim" onClick={() => setSidebarOpen(false)} aria-label="Close menu" />}
      <main className="main-panel">
        <header className="topbar">
          <button className="mobile-menu" onClick={() => setSidebarOpen(!sidebarOpen)} aria-label="Toggle menu"><Icon name="menu" /></button>
          <div className="breadcrumbs"><span>Workspace</span><Icon name="chevron" size={14} /><strong>{page === "history" ? "History" : page === "run" ? "Analysis" : "New analysis"}</strong></div>
          <div className="topbar-right"><span className="secure-label"><span className="secure-dot" />Private workspace</span><span className="top-avatar">T</span></div>
        </header>

        {page === "home" && (
          <section className="home-page">
            <div className="welcome-line"><span className="welcome-spark"><Icon name="spark" size={15} /></span> A little clarity goes a long way</div>
            <h1>Think it <span>through.</span></h1>
            <p className="hero-copy">Big decisions deserve more than a quick answer.<br className="desktop-break" /> Bring your question — we’ll bring the perspectives.</p>

            <div className="agent-strip">
              <div className="agent-strip-heading"><span>YOUR THINKING TEAM</span><span className="agent-availability"><span className="availability-dot" /> 6 specialists</span></div>
              <div className="agent-list">{agents.map((agent, index) => <div className="agent-chip" key={agent.name}><span className={`agent-icon ${agent.color}`}>{agent.icon}</span><span className="agent-text"><strong>{agent.label || agent.name}</strong><small>{agent.role}</small></span>{index < agents.length - 1 && <span className="agent-connector" />}</div>)}</div>
            </div>

            <form className="composer" onSubmit={submitPrompt}>
              <label htmlFor="prompt">What’s on your mind?</label>
              <textarea id="prompt" value={prompt} onChange={(event) => setPrompt(event.target.value)} maxLength={8000} placeholder="Describe a decision, challenge, or idea you’d like to think through…" rows={4} disabled={loading} />
              <label className="human-loop-setting">
                <input type="checkbox" checked={humanInLoop} onChange={(event) => setHumanInLoop(event.target.checked)} disabled={loading} />
                <span><strong>Ask me when more information is needed</strong><small>Pause the analysis so you can clarify details when an agent is unsure.</small></span>
              </label>
              <div className="composer-bottom"><span className="composer-hint"><Icon name="spark" size={14} /> The more context you share, the better.</span><span className="composer-actions"><span className="char-count">{prompt.length.toLocaleString()} / 8,000</span><button className="submit-button" type="submit" disabled={!prompt.trim() || loading}>{loading ? <><span className="button-spinner" /> Thinking</> : <>Start analysis <Icon name="arrow" size={16} /></>}</button></span></div>
            </form>
            {error && <div className="error-banner" role="alert">{error}<button onClick={() => setError("")} aria-label="Dismiss error">×</button></div>}
            <div className="examples"><span className="examples-label">NEED A STARTING POINT?</span><div className="example-list">{examples.map((example) => <button key={example} onClick={() => setPrompt(example)}>{example}<Icon name="arrow" size={14} /></button>)}</div></div>
            <div className="home-footer"><span>Thoughtful answers, from multiple points of view.</span><span>Built for the decisions that matter.</span></div>
          </section>
        )}

        {page === "run" && (
          <section className="result-page">
            <button className="back-link" onClick={startNew}><Icon name="back" size={16} /> New analysis</button>
            {loading ? <LoadingState prompt={activeRun?.prompt || prompt} /> : activeRun ? <RunResult run={activeRun} onResume={respondToRun} /> : <div className="error-state"><span className="error-symbol">!</span><h2>We couldn’t complete that analysis.</h2><p>{error || "The run is unavailable. Please check your connection and try again."}</p><button className="submit-button" onClick={startNew}>Try another question <Icon name="arrow" size={15} /></button></div>}
            {error && activeRun && <div className="error-banner" role="alert">{error}</div>}
          </section>
        )}

        {page === "history" && (
          <section className="history-page">
            <div className="history-heading"><div><span className="eyebrow">YOUR WORKSPACE</span><h1>Analysis history</h1><p>Revisit the questions you’ve thought through.</p></div><button className="submit-button" onClick={startNew}><Icon name="plus" size={16} /> New analysis</button></div>
            {runs.length ? <div className="history-table"><div className="table-head"><span>ANALYSIS</span><span>STATUS</span><span>STEPS</span><span>DATE</span><span /></div>{runs.map((run) => <button className="history-row" key={run._id} onClick={() => openRun(run._id)}><span className="history-title"><span className={`history-icon ${run.status}`}><Icon name={run.status === "completed" ? "check" : "spark"} size={16} /></span><span><strong>{run.title}</strong><small>{run.prompt.slice(0, 92)}{run.prompt.length > 92 ? "…" : ""}</small></span></span><span><span className={`status-pill ${run.status}`}>{run.status === "completed" ? "Complete" : run.status === "running" ? "In progress" : run.status === "awaiting_input" ? "Waiting for you" : "Needs attention"}</span></span><span className="step-number">{run.iterations || "—"}</span><span className="date-label">{new Date(run.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</span><Icon name="chevron" size={16} /></button>)}</div> : <div className="empty-history"><span className="empty-icon"><Icon name="clock" size={22} /></span><h2>No analyses yet</h2><p>Your completed questions will appear here.</p><button className="submit-button" onClick={startNew}><Icon name="plus" size={16} /> Start your first analysis</button></div>}
            {error && <div className="error-banner">{error}</div>}
          </section>
        )}
      </main>
    </div>
  );
}

function LoadingState({ prompt }) {
  return <div className="loading-state"><div className="loading-orbit"><span /><span /><span /><span /></div><span className="eyebrow">YOUR TEAM IS THINKING</span><h2>Finding a clearer way forward.</h2><p className="loading-prompt">“{prompt}”</p><div className="loading-steps">{agents.map((agent, index) => <div className="loading-step" key={agent.name}><span className={`agent-icon ${agent.color}`}>{agent.icon}</span><span>{agent.label || agent.name}</span><span className={`loading-indicator ${index === 0 ? "is-active" : ""}`} /></div>)}</div><p className="loading-note">This may take a minute. Keep this page open while your team works.</p></div>;
}

function RunResult({ run, onResume }) {
  const [expandedStep, setExpandedStep] = useState(0);
  const [answer, setAnswer] = useState("");
  const finalAnswer = [...(run.history || [])].reverse().find((step) => step.response?.success && step.response?.data);
  const success = run.status === "completed";
  const awaitingInput = run.status === "awaiting_input";
  const submitAnswer = (event) => {
    event.preventDefault();
    if (answer.trim()) onResume(answer.trim());
  };

  return <div className="run-content">
    <div className="run-header"><span className="eyebrow">{success ? "ANALYSIS COMPLETE" : awaitingInput ? "YOUR TEAM NEEDS A LITTLE MORE" : "ANALYSIS INCOMPLETE"} <span className="result-dot" /></span><h1>{run.title}</h1><div className="run-meta"><span><Icon name="clock" size={14} />{new Date(run.createdAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}</span><span><Icon name="spark" size={14} />{run.iterations} {run.iterations === 1 ? "step" : "steps"}</span><span className={`status-pill ${run.status}`}>{success ? "Complete" : awaitingInput ? "Waiting for you" : "Needs attention"}</span></div></div>
    {awaitingInput && <form className="clarification-card" onSubmit={submitAnswer}><span className="eyebrow">A QUICK CLARIFICATION</span><h2>An agent needs a bit more context</h2><ul>{run.pendingQuestions.map((question, index) => <li key={`${question}-${index}`}>{question}</li>)}</ul><label htmlFor="clarification-answer">Your response</label><textarea id="clarification-answer" value={answer} onChange={(event) => setAnswer(event.target.value)} maxLength={8000} rows={4} placeholder="Add the details that will help your team continue…" required /><button className="submit-button" type="submit" disabled={!answer.trim()}>Continue analysis <Icon name="arrow" size={15} /></button></form>}
    {!success && !awaitingInput && <div className="error-banner" role="alert">{run.error || "The analysis could not be completed."}</div>}
    <div className="run-grid">
      <div className="run-primary">
        {finalAnswer ? <AnswerCard step={finalAnswer} /> : <div className="answer-card"><span className="eyebrow">YOUR QUESTION</span><p>{run.prompt}</p><p className="no-answer">No completed agent response was returned for this analysis.</p></div>}
        {run.finalContext?.length > 0 && <section className="context-card"><div className="section-label">KEY TAKEAWAYS <span>{run.finalContext.length}</span></div><div className="takeaway-list">{run.finalContext.map((item, index) => <div className="takeaway" key={`${item.information}-${index}`}><span>{String(index + 1).padStart(2, "0")}</span><div><strong>{item.information}</strong>{item.reasoning && <p>{item.reasoning}</p>}</div></div>)}</div></section>}
      </div>
      <aside className="timeline-card"><div className="section-label">THINKING PROCESS <span>{run.history?.length || 0}</span></div><div className="timeline">{(run.history || []).map((step, index) => {
        const agent = agents.find((item) => item.name === step.agent) || agents[0];
        return <div className="timeline-item" key={`${step.step}-${step.agent}`}><div className={`timeline-marker ${agent.color}`}>{step.response?.success ? <Icon name="check" size={13} /> : "!"}</div><button className="timeline-trigger" onClick={() => setExpandedStep(expandedStep === index ? -1 : index)}><span className="timeline-title">{agent.label || step.agent}<small>Step {step.step}</small></span><Icon name="chevron" size={15} /></button>{step.reasoning && <p className="timeline-reasoning">{step.reasoning}</p>}{expandedStep === index && <StepDetails step={step} />}</div>;
      })}{!run.history?.length && <p className="timeline-empty">No steps were recorded.</p>}</div></aside>
    </div>
    <div className="result-bottom"><span><span className="secure-dot" /> Your analysis is saved to your private workspace.</span><button className="submit-button" onClick={() => { window.scrollTo({ top: 0, behavior: "smooth" }); document.querySelector("#prompt")?.focus(); }}>Think through another <Icon name="arrow" size={15} /></button></div>
  </div>;
}

function AnswerCard({ step }) {
  const data = step.response.data || {};
  const main = data.bestSolution || data.summary || data.verdict || data.worstCaseScenario || "Your team has completed its analysis.";
  const lists = [
    ["Implementation steps", data.implementationSteps?.map((item) => item.step ? `${item.step}: ${item.action}` : item)],
    ["Opportunities", data.opportunities],
    ["Strengths", data.leveragedStrengths || data.strengths],
    ["Risks to consider", data.risksAndVulnerabilities?.map((item) => `${item.vulnerability} — ${item.impact}`) || data.flaws?.map((item) => `${item.issue} — ${item.explanation}`)],
    ["Worth clarifying", data.missingInformation || data.additional_needed_info],
    ["Key considerations", data.keyConsiderations],
    ["Important risks", data.importantRisks],
    ["Unresolved concerns", data.unresolvedConcerns],
  ].filter(([, items]) => Array.isArray(items) && items.length);

  return <article className="answer-card"><div className="answer-card-top"><span className="answer-mark"><Icon name="spark" size={17} /></span><span className="eyebrow">{step.agent === "Interpreter" ? "A CLEARER FRAME" : `THE ${step.agent.toUpperCase()} PERSPECTIVE`}</span></div><h2>{main}</h2>{data.recommendation && <p className="recommendation">{data.recommendation}</p>}{lists.map(([title, items]) => <div className="answer-section" key={title}><h3>{title}</h3><ul>{items.map((item, index) => <li key={index}>{item}</li>)}</ul></div>)}{!lists.length && <p className="answer-detail">This is one perspective from your team. Expand the thinking process to explore each step.</p>}</article>;
}

function StepDetails({ step }) {
  const data = step.response?.data;
  return <div className="step-details">{!step.response?.success ? <p className="step-error">{step.response?.error || "This agent did not complete successfully."}</p> : data ? <pre>{JSON.stringify(data, null, 2)}</pre> : <p>No structured response was returned.</p>}<p className="step-input"><strong>Input</strong>{step.inputs?.join("\n") || "No input recorded."}</p></div>;
}

export default App;
