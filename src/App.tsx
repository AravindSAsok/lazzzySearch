import { useEffect, useMemo, useState } from "react";
import { Search, Settings2, CircleHelp, ArrowUpRight, Copy, Download, Plus, Trash2, X, Sparkles, Globe2, LoaderCircle, Check, ChevronDown, ExternalLink, Clock3, KeyRound, WandSparkles } from "lucide-react";

type Provider = "Gemini" | "OpenRouter" | "Grok" | "Firecrawl";
type ApiKey = { id: string; provider: Provider; label: string; key: string; model: string; enabled: boolean };
type Plan = { query: string; limit: number; sources: string[]; intent: string };
type SearchResult = { url?: string; title?: string; description?: string; markdown?: string; content?: string; metadata?: Record<string, unknown>; [key: string]: unknown };
const STORE = "lazzzys-search-v1";
const defaults: Record<Provider, string> = { Gemini: "", OpenRouter: "openrouter/auto", Grok: "grok-3-mini", Firecrawl: "" };
const providerInfo: Record<Provider, { hint: string; url: string }> = {
  Gemini: { hint: "Google AI Studio", url: "https://aistudio.google.com/apikey" },
  OpenRouter: { hint: "OpenRouter", url: "https://openrouter.ai/keys" },
  Grok: { hint: "xAI Console", url: "https://console.x.ai/" },
  Firecrawl: { hint: "Firecrawl", url: "https://www.firecrawl.dev/app/api-keys" }
};
const makeId = () => Math.random().toString(36).slice(2, 10);
function load<T>(key: string, fallback: T): T { try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) as T : fallback; } catch { return fallback; } }
function errorMessage(error: unknown) { return error instanceof Error ? error.message : "Something went wrong. Please try again."; }

export default function App() {
  const [keys, setKeys] = useState<ApiKey[]>(() => load(STORE + ":keys", []));
  const [provider, setProvider] = useState<Provider>(() => load(STORE + ":provider", "Gemini"));
  const [prompt, setPrompt] = useState("");
  const [plan, setPlan] = useState<Plan | null>(null);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [raw, setRaw] = useState<unknown>(null);
  const [busy, setBusy] = useState<"plan" | "search" | "test" | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showPlan, setShowPlan] = useState(false);
  const [history, setHistory] = useState<string[]>(() => load(STORE + ":history", []));
  const [draftProvider, setDraftProvider] = useState<Provider>("Gemini");
  const [draftLabel, setDraftLabel] = useState("");
  const [draftKey, setDraftKey] = useState("");
  const [draftModel, setDraftModel] = useState(defaults.Gemini);
  const [showRaw, setShowRaw] = useState(false);
  const [geminiModels, setGeminiModels] = useState<Record<string, string[]>>({});
  const [draftGeminiModels, setDraftGeminiModels] = useState<string[]>([]);
  const [modelUsed, setModelUsed] = useState("");
  const [modelAttempts, setModelAttempts] = useState<string[]>([]);

  useEffect(() => { localStorage.setItem(STORE + ":keys", JSON.stringify(keys)); }, [keys]);
  useEffect(() => { localStorage.setItem(STORE + ":provider", JSON.stringify(provider)); }, [provider]);
  useEffect(() => { localStorage.setItem(STORE + ":history", JSON.stringify(history.slice(0, 12))); }, [history]);

  const activeAi = useMemo(() => keys.find(k => k.provider === provider && k.enabled), [keys, provider]);
  const firecrawl = keys.find(k => k.provider === "Firecrawl" && k.enabled);
  const aiProviders: Provider[] = ["Gemini", "OpenRouter", "Grok"];

  function addKey() {
    if (!draftKey.trim()) return;
    setKeys(prev => [...prev, { id: makeId(), provider: draftProvider, label: draftLabel.trim() || draftProvider + " key " + (prev.filter(k => k.provider === draftProvider).length + 1), key: draftKey.trim(), model: draftModel || defaults[draftProvider], enabled: true }]);
    setDraftKey(""); setDraftLabel(""); setDraftGeminiModels([]); setNotice("Key saved in this browser.");
  }
  function removeKey(id: string) { setKeys(prev => prev.filter(k => k.id !== id)); }
  function updateKey(id: string, patch: Partial<ApiKey>) { setKeys(prev => prev.map(k => k.id === id ? { ...k, ...patch } : k)); }

  async function discoverGeminiModels(apiKey: string): Promise<string[]> {
    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models?key=" + encodeURIComponent(apiKey));
    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || "Gemini could not list models (" + response.status + ").");
    // Use the key-specific model list, retaining text-capable Gemini/Gemma models for Interactions.
    // Exclude image, audio, embedding and agent-only models from this text planner.
    const models = (data.models || [])
      .filter((model: { name?: string; supportedGenerationMethods?: string[] }) => {
        if (!model.name) return false;
        const id = model.name.replace(/^models\//, "").toLowerCase();
        if (!/^(gemini|gemma)-/.test(id) || /(image|tts|audio|embedding|veo|lyria|deep-research|antigravity)/.test(id)) return false;
        const methods = model.supportedGenerationMethods || [];
        return methods.length === 0 || methods.includes("generateContent") || methods.includes("interactions");
      })
      .map((model: { name: string }) => model.name.replace(/^models\//, ""));
    if (!models.length) throw new Error("Google returned no text-capable Gemini/Gemma models for this API key.");
    return [...new Set(models)].sort((a, b) => a.localeCompare(b));
  }

  async function loadModelsForKey(item: ApiKey) {
    setBusy("test"); setError(""); setNotice("");
    try {
      const models = await discoverGeminiModels(item.key);
      setGeminiModels(prev => ({ ...prev, [item.id]: models }));
      const selected = models.includes(item.model) ? item.model : (models.includes("gemini-3.8-flash") ? "gemini-3.8-flash" : models[0]);
      updateKey(item.id, { model: selected });
      setNotice("Loaded " + models.length + " Gemini models for " + item.label + ".");
    } catch (e) { setError(errorMessage(e)); }
    finally { setBusy(null); }
  }

  async function loadDraftModels() {
    if (!draftKey.trim()) { setError("Paste your Gemini API key first."); return; }
    setBusy("test"); setError(""); setNotice("");
    try {
      const models = await discoverGeminiModels(draftKey.trim());
      setDraftGeminiModels(models);
      setDraftModel(models.includes("gemini-3.8-flash") ? "gemini-3.8-flash" : models[0]);
      setNotice("Loaded " + models.length + " models available to this key.");
    } catch (e) { setError(errorMessage(e)); }
    finally { setBusy(null); }
  }

  async function testKey(item: ApiKey) {
    setBusy("test"); setError(""); setNotice("");
    try {
      if (item.provider === "Firecrawl") {
        const response = await fetch("https://api.firecrawl.dev/v2/scrape", { method: "POST", headers: { Authorization: "Bearer " + item.key, "Content-Type": "application/json" }, body: JSON.stringify({ url: "https://example.com", formats: ["markdown"] }) });
        if (!response.ok && response.status !== 402) throw new Error("Firecrawl returned " + response.status + ". Check the key.");
      } else if (item.provider === "Gemini") {
        const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models?key=" + encodeURIComponent(item.key));
        if (!response.ok) throw new Error("Gemini rejected this key (" + response.status + ").");
      } else if (item.provider === "OpenRouter") {
        const response = await fetch("https://openrouter.ai/api/v1/models", { headers: { Authorization: "Bearer " + item.key } });
        if (!response.ok) throw new Error("OpenRouter rejected this key (" + response.status + ").");
      } else {
        const response = await fetch("https://api.x.ai/v1/models", { headers: { Authorization: "Bearer " + item.key } });
        if (!response.ok) throw new Error("xAI rejected this key (" + response.status + ").");
      }
      setNotice(item.label + " connection looks good.");
    } catch (e) { setError(errorMessage(e)); }
    finally { setBusy(null); }
  }

  async function askAI(instruction: string): Promise<{ text: string; model: string; attempts: string[] }> {
    if (!activeAi) throw new Error("Add and enable an API key for " + provider + " in Settings first.");
    const system = "You are the planning assistant for lazzzySearch. Turn the user's request into a concise Firecrawl web search plan. Return ONLY valid JSON with keys query (string), limit (integer 1-50), sources (array containing web, images, news where relevant; default [web]), intent (short string). Preserve the user's target website/domain and search terms. If a URL is present, include it in query. Do not invent results.";
    if (provider === "Gemini") {
      if (!activeAi.model) throw new Error("Choose a Gemini model in Settings. Load the models available to your API key first.");
      let candidates = geminiModels[activeAi.id];
      if (!candidates?.length) {
        candidates = await discoverGeminiModels(activeAi.key);
        setGeminiModels(prev => ({ ...prev, [activeAi.id]: candidates }));
      }
      const ordered = [activeAi.model, ...candidates.filter(model => model !== activeAi.model)];
      const attempted: string[] = [];
      const failures: string[] = [];
      for (const model of ordered) {
        attempted.push(model);
        setModelAttempts([...attempted]);
        const response = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
          method: "POST",
          headers: { "x-goog-api-key": activeAi.key, "Content-Type": "application/json" },
          body: JSON.stringify({
            model,
            input: instruction,
            system_instruction: system,
            response_format: {
              type: "text",
              mime_type: "application/json",
              schema: {
                type: "object",
                properties: {
                  query: { type: "string" },
                  limit: { type: "integer" },
                  sources: { type: "array", items: { type: "string" } },
                  intent: { type: "string" }
                },
                required: ["query", "limit", "sources", "intent"]
              }
            },
            generation_config: { temperature: 0.2, max_output_tokens: 1024 },
            store: false
          })
        });
        const data = await response.json();
        if (response.ok) {
          const output = (data.steps || [])
            .filter((step: { type?: string }) => step.type === "model_output")
            .flatMap((step: { content?: Array<{ type?: string; text?: string }> }) => step.content || [])
            .filter((part: { type?: string; text?: string }) => part.type === "text")
            .map((part: { text?: string }) => part.text || "")
            .join("");
          if (output) {
            if (model !== activeAi.model) updateKey(activeAi.id, { model });
            setModelUsed(model);
            return { text: output, model, attempts: attempted };
          }
          failures.push(model + ": no text output");
          continue;
        }
        const message = data.error?.message || ("HTTP " + response.status);
        failures.push(model + ": " + message);
        const retryable = [408, 429, 500, 502, 503, 504].includes(response.status);
        const modelUnavailable = response.status === 400 || response.status === 404;
        if (!retryable && !modelUnavailable) throw new Error(message);
      }
      throw new Error("All " + attempted.length + " available Gemini text models were tried, but none succeeded. " + failures.join(" | "));
    }
    const endpoint = provider === "OpenRouter" ? "https://openrouter.ai/api/v1/chat/completions" : "https://api.x.ai/v1/chat/completions";
    const response = await fetch(endpoint, { method: "POST", headers: { Authorization: "Bearer " + activeAi.key, "Content-Type": "application/json" }, body: JSON.stringify({ model: activeAi.model || defaults[provider], messages: [{ role: "system", content: system }, { role: "user", content: instruction }], temperature: 0.2, response_format: { type: "json_object" } }) });
    const data = await response.json(); if (!response.ok) throw new Error(data.error?.message || provider + " request failed.");
    const model = data.model || activeAi.model || defaults[provider];
    setModelUsed(model);
    return { text: data.choices?.[0]?.message?.content || "", model, attempts: [model] };
  }

  async function createPlan() {
    if (!prompt.trim()) return;
    setBusy("plan"); setError(""); setNotice(""); setPlan(null); setResults([]); setRaw(null); setModelUsed(""); setModelAttempts([]);
    try {
      let parsed: Plan;
      if (activeAi) {
        const text = await askAI(prompt);
        parsed = JSON.parse(text.replace(/^```(?:json)?|\`\`\`$/g, "").trim()) as Plan;
      } else {
        const url = prompt.match(/https?:\/\/[^\s]+/)?.[0];
        parsed = { query: prompt, limit: 10, sources: ["web"], intent: url ? "Search the supplied website or URL" : "Search the web for the requested information" };
        setNotice("No AI key enabled. Created a direct search plan from your prompt.");
      }
      parsed.query = String(parsed.query || prompt).slice(0, 1000);
      parsed.limit = Math.min(50, Math.max(1, Number(parsed.limit) || 10));
      parsed.sources = Array.isArray(parsed.sources) ? parsed.sources : ["web"];
      parsed.intent = String(parsed.intent || "Search for matching pages");
      setPlan(parsed); setShowPlan(true);
    } catch (e) { setError(errorMessage(e)); }
    finally { setBusy(null); }
  }

  async function runSearch() {
    if (!plan) return;
    if (!firecrawl) { setError("Add and enable a Firecrawl API key in Settings to run searches."); setShowSettings(true); return; }
    setBusy("search"); setError(""); setNotice(""); setResults([]); setRaw(null);
    try {
      const response = await fetch("https://api.firecrawl.dev/v2/search", { method: "POST", headers: { Authorization: "Bearer " + firecrawl.key, "Content-Type": "application/json" }, body: JSON.stringify({ query: plan.query, limit: plan.limit, sources: plan.sources, scrapeOptions: { formats: ["markdown"] } }) });
      const data = await response.json();
      if (!response.ok || data.success === false) throw new Error(data.error || "Firecrawl search failed (" + response.status + ").");
      const groups = data.data ?? [];
      const grouped = Array.isArray(groups)
        ? groups
        : Object.entries(groups).flatMap(([source, items]) =>
            Array.isArray(items) ? items.map((item: SearchResult) => ({ ...item, _source: item._source || source })) : []
          );
      const found = [...grouped, ...(Array.isArray(data.images) ? data.images : []), ...(Array.isArray(data.news) ? data.news : [])] as SearchResult[];
      setResults(found); setRaw(data); setHistory(prev => [prompt, ...prev.filter(x => x !== prompt)].slice(0, 12));
      setNotice(found.length + " result" + (found.length === 1 ? "" : "s") + " returned.");
    } catch (e) { setError(errorMessage(e)); }
    finally { setBusy(null); }
  }

  function copy(value: string) { navigator.clipboard?.writeText(value).then(() => setNotice("Copied to clipboard.")).catch(() => setError("Clipboard permission was not available.")); }
  function exportResults() { const blob = new Blob([JSON.stringify(raw ?? results, null, 2)], { type: "application/json" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = "lazzzys-search-results.json"; a.click(); URL.revokeObjectURL(url); }

  return <div className="app-shell">
    <header className="topbar"><a className="brand" href="#"><span className="brand-mark">z</span><span>lazzzy<span className="brand-light">Search</span></span></a><div className="top-actions"><span className="local-pill"><span/> local workspace</span><button className="icon-btn" onClick={() => setShowHelp(true)} aria-label="Help"><CircleHelp size={18}/></button><button className="icon-btn" onClick={() => setShowSettings(true)} aria-label="Settings"><Settings2 size={18}/></button></div></header>
    <main className="main">
      <section className="hero"><div className="eyebrow"><Sparkles size={14}/> YOUR SEARCH, WITH A LITTLE AI</div><h1>Search less.<br/><span>Find more.</span></h1><p className="subhead">Tell us what you're looking for. We'll figure out how to find it.</p>
        <div className="search-card"><div className="search-input-wrap"><Search size={20}/><textarea value={prompt} onChange={e => setPrompt(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); createPlan(); } }} placeholder="Search anything, anywhere... e.g. Find all posts about Kaboom on Reddit" rows={2}/></div><div className="search-bottom"><div className="provider-select"><WandSparkles size={15}/><select value={provider} onChange={e => setProvider(e.target.value as Provider)}>{aiProviders.map(p => <option key={p} value={p}>{p}</option>)}</select><span className="key-indicator" title={activeAi ? "AI key ready" : "No AI key; direct search plan"}>{activeAi ? <Check size={13}/> : "no key"}</span></div><button className="search-button" onClick={createPlan} disabled={!prompt.trim() || busy !== null}>{busy === "plan" ? <LoaderCircle className="spin" size={17}/> : <Sparkles size={16}/>} Plan search <span>↗</span></button></div></div>
        {activeAi && <div className="active-model">AI model: <strong>{activeAi.model || defaults[provider] || "Choose in Settings"}</strong>{modelUsed && modelUsed !== activeAi.model && <span> · actually used: {modelUsed}</span>}</div>}
        <div className="quick-hints"><span>Try:</span>{["Find PDFs about RAG agents","Search Reddit for browser automation","Find recent AI engineer jobs in India"].map(s => <button key={s} onClick={() => setPrompt(s)}>{s}</button>)}</div>
      </section>

      {(error || notice) && <div className={error ? "alert error" : "alert success"}>{error || notice}<button onClick={() => { setError(""); setNotice(""); }}><X size={14}/></button></div>}

      {plan && <section className="plan-panel"><div className="section-heading"><div><span className="section-kicker">READY WHEN YOU ARE</span><h2>Search plan</h2></div><button className="text-btn" onClick={() => setShowPlan(!showPlan)}>{showPlan ? "Hide" : "Edit"} <ChevronDown size={15}/></button></div>{showPlan && <>{modelUsed && <div className="model-used">AI model used: <strong>{modelUsed}</strong>{modelAttempts.length > 1 && <span> · {modelAttempts.length - 1} fallback model(s) tried before success</span>}</div>}<label className="field-label">Search query</label><textarea className="plan-query" value={plan.query} onChange={e => setPlan({ ...plan, query: e.target.value })}/><div className="plan-meta"><label>Maximum results <input type="number" min="1" max="50" value={plan.limit} onChange={e => setPlan({ ...plan, limit: Math.min(50, Math.max(1, Number(e.target.value))) })}/></label><span>{plan.intent}</span></div><div className="source-tags">{plan.sources.map(s => <span key={s}>{s}</span>)}</div><button className="run-button" onClick={runSearch} disabled={busy !== null}>{busy === "search" ? <><LoaderCircle className="spin" size={17}/> Searching…</> : <><Search size={17}/> Run with Firecrawl <span>↗</span></>}</button></>}</section>}

      {(results.length > 0 || busy === "search") && <section className="results-section"><div className="section-heading"><div><span className="section-kicker">FROM THE WEB</span><h2>Results <span className="count">{results.length}</span></h2></div>{results.length > 0 && <div className="result-actions"><button className="text-btn" onClick={() => setShowRaw(!showRaw)}>{showRaw ? "Hide JSON" : "Raw JSON"}</button><button className="text-btn" onClick={exportResults}><Download size={15}/> Export</button></div>}</div>{busy === "search" && <div className="loading-line"><LoaderCircle className="spin" size={18}/> Asking Firecrawl to find it…</div>}{results.map((item, i) => <article className="result-card" key={(item.url || "") + i}><div className="result-number">{String(i + 1).padStart(2, "0")}</div><div className="result-content"><a className="result-title" href={item.url || "#"} target="_blank" rel="noreferrer">{item.title || item.url || "Untitled result"} <ExternalLink size={13}/></a>{item.url && <div className="result-url">{item.url}</div>}<p>{String(item.description || item.markdown || item.content || "No preview was returned.").slice(0, 420)}</p><div className="result-footer"><span><Globe2 size={12}/> {item._source ? String(item._source) : item.metadata?.sourceURL ? String(item.metadata.sourceURL) : "Firecrawl result"}</span><button onClick={() => copy(JSON.stringify(item, null, 2))}><Copy size={13}/> Copy</button></div></div></article>)}{showRaw && <pre className="raw-json">{JSON.stringify(raw, null, 2)}</pre>}</section>}

      {!plan && history.length > 0 && <section className="history"><div className="section-heading"><div><span className="section-kicker">PICK UP WHERE YOU LEFT OFF</span><h2>Recent searches</h2></div><Clock3 size={17}/></div>{history.slice(0, 5).map((h, i) => <button className="history-item" key={i} onClick={() => setPrompt(h)}><Search size={14}/><span>{h}</span><ArrowUpRight size={14}/></button>)}</section>}
      <footer><span>Made for curious, slightly lazy people.</span><span>Powered by your keys + <a href="https://www.firecrawl.dev/" target="_blank" rel="noreferrer">Firecrawl</a></span></footer>
    </main>

    {(showSettings || showHelp) && <div className="overlay" onMouseDown={e => { if (e.target === e.currentTarget) { setShowSettings(false); setShowHelp(false); } }}><aside className="drawer"><div className="drawer-head"><div><span className="section-kicker">{showSettings ? "YOUR CONNECTIONS" : "A QUICK GUIDE"}</span><h2>{showSettings ? "Settings" : "How it works"}</h2></div><button className="icon-btn" onClick={() => { setShowSettings(false); setShowHelp(false); }}><X size={18}/></button></div>
      {showSettings ? <><p className="drawer-copy">Bring your own API keys. They're saved only in this browser for now.</p><div className="key-list">{keys.map(k => <div className="key-row" key={k.id}><div className="key-icon"><KeyRound size={16}/></div><div className="key-details"><strong>{k.label}</strong><span>{k.provider} · {k.model || "choose a model"} · ••••••••</span>{k.provider === "Gemini" && geminiModels[k.id] && <select aria-label={"Model for " + k.label} value={k.model} onChange={e => updateKey(k.id, { model: e.target.value })}>{geminiModels[k.id].map(model => <option key={model} value={model}>{model}</option>)}</select>}</div>{k.provider === "Gemini" && <button className="tiny-icon" onClick={() => loadModelsForKey(k)} title="Load available Gemini models" disabled={busy !== null}><WandSparkles size={14}/></button>}<label className="toggle"><input type="checkbox" checked={k.enabled} onChange={e => updateKey(k.id, { enabled: e.target.checked })}/><span/></label><button className="tiny-icon" onClick={() => testKey(k)} title="Test key" disabled={busy !== null}><Check size={15}/></button><button className="tiny-icon danger" onClick={() => removeKey(k.id)} title="Delete key"><Trash2 size={15}/></button></div>)}</div>
      <div className="add-key"><h3><Plus size={16}/> Add an API key</h3><label className="field-label">Provider</label><select value={draftProvider} onChange={e => { const p = e.target.value as Provider; setDraftProvider(p); setDraftModel(defaults[p]); setDraftGeminiModels([]); }}><option>Gemini</option><option>OpenRouter</option><option>Grok</option><option>Firecrawl</option></select><label className="field-label">Label (optional)</label><input value={draftLabel} onChange={e => setDraftLabel(e.target.value)} placeholder="My personal key"/>{draftProvider !== "Firecrawl" && <><label className="field-label">Model</label><div className="model-load-row"><input value={draftModel} onChange={e => setDraftModel(e.target.value)} placeholder={draftProvider === "Gemini" ? "Load models or enter a model ID" : "Model ID"}/>{draftProvider === "Gemini" && <button type="button" className="text-btn" onClick={loadDraftModels} disabled={busy !== null || !draftKey.trim()}>{busy === "test" ? "Loading…" : "Load models"}</button>}</div>{draftProvider === "Gemini" && draftGeminiModels.length > 0 && <select className="model-picker" value={draftModel} onChange={e => setDraftModel(e.target.value)}>{draftGeminiModels.map(model => <option key={model} value={model}>{model}</option>)}</select>}</>}<label className="field-label">API key</label><input type="password" autoComplete="off" value={draftKey} onChange={e => setDraftKey(e.target.value)} placeholder="Paste your API key"/><button className="run-button" onClick={addKey} disabled={!draftKey.trim()}><Plus size={16}/> Save key</button><p className="micro-copy">Keys remain in localStorage on this device. Anyone with access to this browser profile may be able to inspect them. Avoid shared devices.</p></div>
      <div className="provider-links"><h3>Get an API key</h3>{(["Gemini","OpenRouter","Grok","Firecrawl"] as Provider[]).map(p => <a key={p} href={providerInfo[p].url} target="_blank" rel="noreferrer">{p} <ArrowUpRight size={13}/></a>)}</div>
      </> : <div className="guide-content"><p>lazzzySearch takes your plain-English request, turns it into a search plan, and asks Firecrawl to find matching pages and content.</p><div className="guide-step"><span>01</span><div><strong>Describe what you want</strong><p>Tell us the topic, website, filters, or file type. A URL or domain helps narrow the target.</p></div></div><div className="guide-step"><span>02</span><div><strong>Let AI make a plan</strong><p>Choose Gemini, OpenRouter, or Grok and add a key in Settings. Without an AI key, the app creates a simple direct-search plan.</p></div></div><div className="guide-step"><span>03</span><div><strong>Search with Firecrawl</strong><p>Add a Firecrawl key. Review the query and result limit, then run the search.</p></div></div><div className="guide-step"><span>04</span><div><strong>Keep what you find</strong><p>Open sources, copy results, or export the raw response as JSON.</p></div></div><h3>Official docs & keys</h3>{[["Firecrawl docs","https://docs.firecrawl.dev/"],["Gemini API docs","https://ai.google.dev/gemini-api/docs"],["OpenRouter models","https://openrouter.ai/models"],["xAI API docs","https://docs.x.ai/"]].map(([name, url]) => <a className="guide-link" href={url} target="_blank" rel="noreferrer" key={url}>{name}<ArrowUpRight size={14}/></a>)}<div className="privacy-note"><strong>Local-first MVP</strong><p>No account or database. Keys and recent searches are stored in this browser only. Provider requests are sent directly from your browser to the selected AI provider and Firecrawl. This means keys are not protected by a server-side vault; use a personal device and rotate keys if needed.</p></div></div>}
    </aside></div>}
  </div>;
}