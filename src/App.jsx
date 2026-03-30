import { useState } from "react";
import {
  GitBranch,
  Search,
  AlertTriangle,
  CheckCircle,
  Loader2,
  Terminal,
  ChevronRight,
  ExternalLink,
  Sparkles,
  ClipboardList,
} from "lucide-react";
import "./App.css";

const WEBHOOK_URL = "/api/analyze";

function isValidGithubUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.hostname === "github.com" && parsed.pathname.length > 1;
  } catch {
    return false;
  }
}

export default function App() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [touched, setTouched] = useState(false);

  const isValid = isValidGithubUrl(url);
  const showValidation = touched && url.length > 0;

  async function handleAnalyze(e) {
    e.preventDefault();
    if (!isValid) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch(WEBHOOK_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify([{ url }]),
      });

      if (!response.ok) {
        throw new Error(`Server responded with status ${response.status}`);
      }

      const data = await response.json();
      // Normalize: response is [ { output: { problems, prompt } } ]
      const normalized =
        Array.isArray(data) && data[0]?.output
          ? data[0].output
          : data?.output ?? data;
      setResult(normalized);
    } catch (err) {
      if (err.name === "TypeError" && err.message.includes("fetch")) {
        setError(
          "Network error — this may be a CORS issue. Make sure the n8n webhook has CORS enabled, or use a proxy."
        );
      } else if (err.message?.includes("Unexpected end of JSON")) {
        setError(
          "The n8n webhook returned an empty response. Make sure the workflow is active and the test webhook is listening in n8n."
        );
      } else {
        setError(err.message || "An unexpected error occurred.");
      }
    } finally {
      setLoading(false);
    }
  }

  // result is already normalized to { problems, prompt }
  const problems = Array.isArray(result?.problems)
    ? result.problems
    : typeof result?.problems === "string"
    ? result.problems.split("\n").filter(Boolean)
    : [];

  const prompt = result?.prompt ?? null;

  // Fallback: if we got something unexpected, show raw JSON
  const rawFallback =
    result && !prompt && problems.length === 0
      ? JSON.stringify(result, null, 2)
      : null;

  return (
    <div className="app">
      <div className="bg-orbs">
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />
      </div>

      <header className="header">
        <div className="logo">
          <GitBranch size={28} />
          <span>RepoAnalyzer</span>
        </div>
        <div className="badge">
          <Sparkles size={13} />
          AI Powered
        </div>
      </header>

      <main className="main">
        <section className="hero">
          <h1>
            Analyze any
            <span className="gradient-text"> GitHub Repo</span>
          </h1>
          <p className="subtitle">
            Paste a GitHub repository URL and get an AI-generated diagnostic
            report — identifying issues and how to fix them.
          </p>
        </section>

        <form className="input-card" onSubmit={handleAnalyze}>
          <div className={`input-row ${showValidation ? (isValid ? "valid" : "invalid") : ""}`}>
            <GitBranch size={20} className="input-icon" />
            <input
              type="text"
              placeholder="https://github.com/username/repository"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onBlur={() => setTouched(true)}
              spellCheck={false}
              autoComplete="off"
            />
            {showValidation && (
              <span className="validation-icon">
                {isValid ? (
                  <CheckCircle size={18} className="icon-valid" />
                ) : (
                  <AlertTriangle size={18} className="icon-invalid" />
                )}
              </span>
            )}
          </div>
          {showValidation && !isValid && (
            <p className="field-error">Please enter a valid GitHub repository URL.</p>
          )}

          <button
            type="submit"
            className={`analyze-btn ${loading ? "loading" : ""}`}
            disabled={!isValid || loading}
          >
            {loading ? (
              <>
                <Loader2 size={18} className="spin" />
                Analyzing…
              </>
            ) : (
              <>
                <Search size={18} />
                Analyze Repository
                <ChevronRight size={16} />
              </>
            )}
          </button>
        </form>

        {error && (
          <div className="error-card">
            <AlertTriangle size={20} />
            <div>
              <strong>Request failed</strong>
              <p>{error}</p>
            </div>
          </div>
        )}

        {loading && (
          <div className="loading-card">
            <div className="pulse-dots">
              <span /><span /><span />
            </div>
            <p>Connecting to AI workflow and scanning repository…</p>
          </div>
        )}

        {result && !loading && (
          <div className="results">
            <div className="results-header">
              <CheckCircle size={20} className="icon-success" />
              <span>Analysis Complete</span>
              <a href={url} target="_blank" rel="noreferrer" className="repo-link">
                {url.replace("https://github.com/", "")}
                <ExternalLink size={12} />
              </a>
            </div>

            {prompt && (
              <div className="result-block prompt-block">
                <div className="block-title">
                  <Terminal size={16} />
                  AI Prompt / Summary
                </div>
                <pre className="prompt-text">{prompt}</pre>
              </div>
            )}

            {problems.length > 0 && (
              <div className="result-block problems-block">
                <div className="block-title">
                  <ClipboardList size={16} />
                  Issues &amp; Fixes
                  <span className="count-badge">{problems.length}</span>
                </div>
                <ul className="problems-list">
                  {problems.map((problem, i) => {
                    const severityMatch = problem.match(/^\[(High|Medium|Low)\]\s*/i);
                    const severity = severityMatch ? severityMatch[1].toLowerCase() : null;
                    const text = severityMatch ? problem.slice(severityMatch[0].length) : problem;
                    return (
                      <li key={i} className="problem-item">
                        <span className="problem-index">{i + 1}</span>
                        <span className="problem-content">
                          {severity && (
                            <span className={`severity-badge severity-${severity}`}>
                              {severityMatch[1]}
                            </span>
                          )}
                          <span className="problem-text">{text}</span>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {rawFallback && (
              <div className="result-block">
                <div className="block-title">Raw Response</div>
                <pre className="prompt-text">{rawFallback}</pre>
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="footer">
        <p>Powered by n8n &amp; AI · RepoAnalyzer</p>
      </footer>
    </div>
  );
}
