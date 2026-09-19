"use client";

import { FormEvent, useState, useRef, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

type Stance = "help" | "no_help";

type Message = {
  id: number;
  role: "assistant" | "user";
  content: string;
  time: string;
  turn?: number;
};

type ElementDetail = {
  score: number;
  grade: string;
  title: string;
  commentary: string;
  strengths: string[];
};

type ReportData = {
  overallScore: number;
  summary: string;
  verdict: {
    resultTitle: string;
    winner: "user" | "ai" | "draw";
    punchline: string;
  };
  elements: {
    logic: ElementDetail;
    empathy: ElementDetail;
    consistency: ElementDetail;
  };
  highlights: Array<{
    turn: number;
    userQuote: string;
    evaluation: string;
  }>;
};

export type SavedRecord = {
  id: string;
  stance: string;
  messages: Message[];
  report: ReportData;
  created_at: string;
};

const PROMPT_SUGGESTIONS: Record<Stance, string[]> = {
  help: [
    "음식이 겹쳐서 못 먹는 걸 도와주는 건 단순한 테이블 매너야.",
    "여자친구가 보고 있는 자리에서 도와주는 게 무슨 흑심이야?",
    "두 장 다 가져가서 짜게 먹는 걸 보고만 있는 게 더 이상하지 않아?",
    "젓가락으로 잡아만 주는 거지 내 숟가락에 올려주는 게 아니잖아!",
  ],
  no_help: [
    "여자친구 앞인데 다른 이성 깻잎을 잡아주는 건 선 넘는 행동이야.",
    "깻잎은 떼어주는 순간 젓가락이 닿고 눈이 마주치잖아!",
    "친구 본인이 알아서 떼어먹거나 두 장 먹으면 그만이지.",
    "내 연인의 서운함이나 불안감이 작은 매너보다 훨씬 중요해.",
  ],
};

export default function Home() {
  // Application Stage: 'select' | 'chat' | 'report'
  const [stage, setStage] = useState<"select" | "chat" | "report">("select");
  const [stance, setStance] = useState<Stance | null>(null);

  // Chat State
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [currentTurn, setCurrentTurn] = useState(1);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Report State
  const [report, setReport] = useState<ReportData | null>(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [savedRecordId, setSavedRecordId] = useState<string | null>(null);

  // Supabase Saved History State
  const [savedRecords, setSavedRecords] = useState<SavedRecord[]>([]);
  const [isLoadingRecords, setIsLoadingRecords] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isAiThinking]);

  // Load records from Supabase
  const loadSavedRecords = async () => {
    setIsLoadingRecords(true);
    try {
      const { data, error } = await supabase
        .from("debate_records")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(15);

      if (!error && data) {
        setSavedRecords(data as SavedRecord[]);
      }
    } catch (err) {
      console.error("Failed to fetch records:", err);
    } finally {
      setIsLoadingRecords(false);
    }
  };

  useEffect(() => {
    loadSavedRecords();
  }, [stage]);

  // Start Debate
  const handleStartDebate = (selectedStance: Stance) => {
    setStance(selectedStance);
    setStage("chat");
    setCurrentTurn(1);
    setReport(null);
    setSavedRecordId(null);
    setErrorMsg(null);

    const initialAiMsg: Message = {
      id: Date.now(),
      role: "assistant",
      content:
        selectedStance === "help"
          ? "당신은 '깻잎을 떼어준다'는 입장이시군요! 하지만 저는 절대 반대합니다. 여자친구가 옆에 있는데 친구의 깻잎을 떼어주는 건 선을 넘는 행위죠. 첫 번째 주장을 펼쳐보세요!"
          : "당신은 '깻잎을 떼어주지 않는다'는 입장이시군요! 하지만 저는 반대입니다. 밥 먹을 때 반찬 하나 잡아주는 단순한 매너인데, 그걸 질투하고 의심하는 건 너무 쩨쩨하지 않나요? 어디 첫 번째 주장을 들려주시죠!",
      time: new Date().toLocaleTimeString("ko-KR", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };
    setMessages([initialAiMsg]);
  };

  // Send User Message in Debate
  const handleSendMessage = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    const text = draft.trim();
    if (!text || isAiThinking || currentTurn > 5 || !stance) return;

    setErrorMsg(null);
    const userMsgTime = new Date().toLocaleTimeString("ko-KR", {
      hour: "2-digit",
      minute: "2-digit",
    });

    const userMessage: Message = {
      id: Date.now(),
      role: "user",
      content: text,
      time: userMsgTime,
      turn: currentTurn,
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setDraft("");
    setIsAiThinking(true);

    try {
      const res = await fetch("/api/debate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stance,
          messages: newMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          currentTurn,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "응답을 받지 못했습니다.");
      }

      const aiMsgTime = new Date().toLocaleTimeString("ko-KR", {
        hour: "2-digit",
        minute: "2-digit",
      });

      const aiMessage: Message = {
        id: Date.now() + 1,
        role: "assistant",
        content: data.reply,
        time: aiMsgTime,
        turn: currentTurn,
      };

      setMessages((prev) => [...prev, aiMessage]);

      if (currentTurn < 5) {
        setCurrentTurn((prev) => prev + 1);
      }
    } catch (err: unknown) {
      console.error(err);
      setErrorMsg(
        err instanceof Error
          ? err.message
          : "오류가 발생했습니다. 다시 시도해주세요."
      );
    } finally {
      setIsAiThinking(false);
    }
  };

  // Generate and View Report (Saves to Supabase)
  const handleViewReport = async () => {
    if (!stance || messages.length === 0) return;
    setIsGeneratingReport(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stance,
          messages: messages.filter((m) => m.turn !== undefined),
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "리포트 생성에 실패했습니다.");
      }

      setReport(data.report);
      if (data.recordId) {
        setSavedRecordId(data.recordId);
      }
      setStage("report");
      loadSavedRecords(); // refresh saved records list
    } catch (err: unknown) {
      console.error(err);
      setErrorMsg(
        err instanceof Error ? err.message : "리포트를 불러올 수 없습니다."
      );
    } finally {
      setIsGeneratingReport(false);
    }
  };

  // Open a past record from Supabase
  const handleOpenRecord = (record: SavedRecord) => {
    setStance(record.stance.includes("떼어준다") && !record.stance.includes("않는다") ? "help" : "no_help");
    setMessages(record.messages || []);
    setReport(record.report);
    setSavedRecordId(record.id);
    setCurrentTurn(5);
    setStage("report");
    setShowHistoryModal(false);
  };

  // Reset Everything
  const handleRestart = () => {
    setStage("select");
    setStance(null);
    setMessages([]);
    setDraft("");
    setCurrentTurn(1);
    setReport(null);
    setSavedRecordId(null);
    setErrorMsg(null);
  };

  const isDebateFinished =
    currentTurn === 5 &&
    messages.some((m) => m.role === "assistant" && m.turn === 5);

  return (
    <main className="app-container">
      {/* Background Decor */}
      <div className="bg-glow bg-glow-1" />
      <div className="bg-glow bg-glow-2" />

      {/* Main Container Card */}
      <div className="app-window">
        {/* Top App Header */}
        <header className="app-header">
          <div className="header-brand">
            <div className="perilla-leaf-logo">🍃</div>
            <div>
              <div className="brand-title-wrap">
                <h1 className="brand-title">깻잎논쟁 끝장토론</h1>
                <span className="badge-model">Gemini 3.7 Flash</span>
                <span className="badge-db">Supabase DB 연동</span>
              </div>
              <p className="brand-subtitle">
                대한민국 최대의 난제, AI와 5턴으로 승부하고 기록하세요!
              </p>
            </div>
          </div>

          <div className="header-controls">
            <button
              className="btn-secondary btn-history-header"
              onClick={() => {
                loadSavedRecords();
                setShowHistoryModal(true);
              }}
              type="button"
            >
              📜 역대 기록 보관함 ({savedRecords.length})
            </button>
            {stage !== "select" && (
              <button
                className="btn-secondary"
                onClick={handleRestart}
                type="button"
              >
                🔄 처음으로
              </button>
            )}
          </div>
        </header>

        {/* Global Error Banner if any */}
        {errorMsg && (
          <div className="error-banner">
            <span>⚠️ {errorMsg}</span>
            <button onClick={() => setErrorMsg(null)}>✕</button>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SCREEN 1: STANCE SELECTION                                                */}
        {/* ========================================================================= */}
        {stage === "select" && (
          <div className="screen-select">
            <div className="select-hero">
              <div className="hero-tag">🔥 깻잎논쟁 밸런스 게임</div>
              <h2 className="hero-title">
                식사 중 여자친구의 친구가 <br />
                <span className="text-highlight">깻잎 두 장</span>을 못 떼고
                있을 때, 당신의 선택은?
              </h2>
              <p className="hero-desc">
                당신의 입장을 선택하면, <strong>Gemini 3.7 Flash</strong>가
                정반대 입장에서 당신을 논리적으로 공격합니다. 5턴 동안 치열하게
                논쟁하고 <strong>Supabase</strong>에 기록된 요약 리포트를 받아보세요!
              </p>
            </div>

            <div className="stance-grid">
              {/* Option 1: 떼어준다 */}
              <button
                className="stance-card stance-help"
                onClick={() => handleStartDebate("help")}
                type="button"
              >
                <div className="card-badge">입장 1</div>
                <div className="stance-icon">🌿</div>
                <h3 className="stance-heading">1. 떼어준다</h3>
                <p className="stance-text">
                  &ldquo;식탁 위의 작은 배려이자 매너! 눈앞에서 고생하는데
                  잡아주는 건 당연하다.&rdquo;
                </p>
                <div className="vs-tag">
                  <span className="my-stance">나: 떼어준다 (배려파)</span>
                  <span className="ai-stance">AI: 떼어주면 안 됨 (질투파)</span>
                </div>
                <div className="card-action">이 입장으로 토론 시작하기 →</div>
              </button>

              {/* Option 2: 떼어주지 않는다 */}
              <button
                className="stance-card stance-no-help"
                onClick={() => handleStartDebate("no_help")}
                type="button"
              >
                <div className="card-badge">입장 2</div>
                <div className="stance-icon">🚫</div>
                <h3 className="stance-heading">2. 떼어주지 않는다</h3>
                <p className="stance-text">
                  &ldquo;연인에 대한 예의와 선이 우선! 젓가락이 닿는 순간 오해와
                  서운함이 시작된다.&rdquo;
                </p>
                <div className="vs-tag">
                  <span className="my-stance">나: 안 떼어준다 (철벽파)</span>
                  <span className="ai-stance">AI: 떼어줘야 함 (매너파)</span>
                </div>
                <div className="card-action">이 입장으로 토론 시작하기 →</div>
              </button>
            </div>

            {/* Recent Debate Records Quick Bar */}
            {savedRecords.length > 0 && (
              <div className="quick-history-section">
                <div className="quick-history-header">
                  <span>💾 최근 Supabase에 저장된 토론 기록</span>
                  <button
                    className="btn-text"
                    onClick={() => setShowHistoryModal(true)}
                    type="button"
                  >
                    전체보기 ({savedRecords.length}) ›
                  </button>
                </div>
                <div className="quick-history-list">
                  {savedRecords.slice(0, 3).map((rec) => (
                    <button
                      className="quick-history-item"
                      key={rec.id}
                      onClick={() => handleOpenRecord(rec)}
                      type="button"
                    >
                      <span className="quick-stance-badge">
                        {rec.stance.includes("떼어준다") && !rec.stance.includes("않는다")
                          ? "🌿 떼어준다"
                          : "🚫 안 떼어준다"}
                      </span>
                      <strong className="quick-title">
                        {rec.report?.verdict?.resultTitle || "토론 기록"}
                      </strong>
                      <span className="quick-score">
                        {rec.report?.overallScore}점
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="debate-rules-bar">
              <div className="rule-item">
                <span className="rule-num">1</span>
                <span>총 5턴 동안 발언과 반박이 오갑니다.</span>
              </div>
              <div className="rule-item">
                <span className="rule-num">2</span>
                <span>Gemini 3.7 Flash가 날카롭게 반박합니다.</span>
              </div>
              <div className="rule-item">
                <span className="rule-num">3</span>
                <span>결과가 3대 요소로 시각화되어 Supabase에 저장됩니다.</span>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SCREEN 2: 5-TURN DEBATE CHAT                                              */}
        {/* ========================================================================= */}
        {stage === "chat" && (
          <div className="screen-chat">
            {/* Debate Status & Progress Bar */}
            <div className="debate-status-bar">
              <div className="status-info">
                <div className="stance-indicator">
                  <span className="indicator-label">나의 선택:</span>
                  <span
                    className={`indicator-pill ${
                      stance === "help" ? "pill-help" : "pill-no-help"
                    }`}
                  >
                    {stance === "help"
                      ? "🌿 떼어준다 (배려)"
                      : "🚫 떼어주지 않는다 (철벽)"}
                  </span>
                  <span className="indicator-vs">VS</span>
                  <span className="indicator-ai">
                    AI 반박:{" "}
                    {stance === "help" ? "떼어주면 안 됨" : "떼어줘야 함"}
                  </span>
                </div>

                <div className="turn-count-badge">
                  <span className="turn-fire">🔥</span>
                  <strong>{currentTurn}</strong> / 5 턴
                </div>
              </div>

              {/* Visual Progress Bar */}
              <div className="turn-progress-track">
                <div
                  className="turn-progress-fill"
                  style={{
                    width: `${
                      isDebateFinished
                        ? 100
                        : ((currentTurn - (isAiThinking ? 0.5 : 1)) / 5) * 100
                    }%`,
                  }}
                />
              </div>
            </div>

            {/* Chat Messages Scroll Area */}
            <div className="chat-messages-scroll">
              <div className="messages-wrapper">
                {messages.map((message) => {
                  const isUser = message.role === "user";
                  return (
                    <article
                      className={`chat-bubble-row ${
                        isUser ? "row-user" : "row-ai"
                      }`}
                      key={message.id}
                    >
                      {!isUser && (
                        <div className="chat-avatar ai-avatar">
                          <span>🤖</span>
                        </div>
                      )}

                      <div className="chat-bubble-container">
                        <div className="bubble-meta">
                          <span className="sender-name">
                            {isUser ? "나 (토론자)" : "Gemini 3.7 Flash 반박봇"}
                          </span>
                          {message.turn && (
                            <span className="turn-tag">
                              Turn {message.turn}
                            </span>
                          )}
                          <span className="message-time">{message.time}</span>
                        </div>
                        <div
                          className={`bubble-box ${
                            isUser ? "bubble-user" : "bubble-ai"
                          }`}
                        >
                          <p>{message.content}</p>
                        </div>
                      </div>

                      {isUser && (
                        <div className="chat-avatar user-avatar">
                          <span>👤</span>
                        </div>
                      )}
                    </article>
                  );
                })}

                {/* AI Thinking Animation */}
                {isAiThinking && (
                  <div className="chat-bubble-row row-ai">
                    <div className="chat-avatar ai-avatar">
                      <span>🤖</span>
                    </div>
                    <div className="chat-bubble-container">
                      <div className="bubble-meta">
                        <span className="sender-name">
                          Gemini 3.7 Flash 반박봇
                        </span>
                        <span className="turn-tag">
                          Turn {currentTurn} 분석 중...
                        </span>
                      </div>
                      <div className="bubble-box bubble-ai thinking-bubble">
                        <span className="dot" />
                        <span className="dot" />
                        <span className="dot" />
                        <span className="thinking-text">
                          반박 논리를 구성하고 있습니다...
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Bottom Debate Action Area */}
            <div className="debate-bottom-section">
              {/* When Debate is FINISHED: Show Active Summary Report Button */}
              {isDebateFinished ? (
                <div className="finish-banner">
                  <div className="finish-congrats">
                    <div className="finish-icon">🎊</div>
                    <div>
                      <h3 className="finish-title">
                        5턴의 치열한 논쟁이 완료되었습니다!
                      </h3>
                      <p className="finish-desc">
                        Gemini 3.7 Flash 심판관이 리포트를 생성하고 Supabase DB에
                        자동 저장합니다.
                      </p>
                    </div>
                  </div>

                  <button
                    className="btn-view-report animate-pulse"
                    disabled={isGeneratingReport}
                    onClick={handleViewReport}
                    type="button"
                  >
                    {isGeneratingReport ? (
                      <>
                        <span className="spinner" /> 리포트 분석 및 DB 저장 중...
                      </>
                    ) : (
                      <>📊 요약 리포트 보기 및 저장 →</>
                    )}
                  </button>
                </div>
              ) : (
                /* While Debate is ACTIVE: Show Suggestions + Input Area */
                <div className="composer-container">
                  {/* Prompt Suggestions */}
                  {stance && PROMPT_SUGGESTIONS[stance] && (
                    <div className="suggestion-chips">
                      <span className="chips-label">💡 추천 주장:</span>
                      {PROMPT_SUGGESTIONS[stance].map((text, idx) => (
                        <button
                          className="chip-btn"
                          key={idx}
                          onClick={() => setDraft(text)}
                          type="button"
                        >
                          {text}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Input Form */}
                  <form className="chat-composer-form" onSubmit={handleSendMessage}>
                    <textarea
                      aria-label="논쟁 발언 입력"
                      className="composer-textarea"
                      disabled={isAiThinking}
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      placeholder={
                        isAiThinking
                          ? "AI가 반박을 작성 중입니다..."
                          : `[Turn ${currentTurn}/5] 반박에 맞설 주장을 입력하세요 (Enter로 전송)`
                      }
                      rows={2}
                      value={draft}
                    />
                    <div className="composer-footer">
                      <span className="composer-hint">
                        Shift + Enter 줄바꿈 | 남은 턴: {6 - currentTurn}회
                      </span>
                      <button
                        className="btn-send"
                        disabled={isAiThinking || !draft.trim()}
                        type="submit"
                      >
                        발언하기 🚀
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SCREEN 3: VISUAL SUMMARY REPORT (3 ELEMENTS VISUALIZED)                   */}
        {/* ========================================================================= */}
        {stage === "report" && report && (
          <div className="screen-report">
            {/* Supabase Saved Notice Badge */}
            {savedRecordId && (
              <div className="db-saved-badge">
                <span>💾 Supabase `debate_records` 테이블에 정상 저장되었습니다. (ID: {savedRecordId.slice(0, 8)}...)</span>
              </div>
            )}

            {/* Header / Verdict Banner */}
            <div
              className={`report-verdict-banner ${
                report.verdict.winner === "user"
                  ? "verdict-win"
                  : report.verdict.winner === "ai"
                  ? "verdict-ai-win"
                  : "verdict-draw"
              }`}
            >
              <div className="verdict-trophy">
                {report.verdict.winner === "user"
                  ? "🏆"
                  : report.verdict.winner === "ai"
                  ? "🤖"
                  : "🤝"}
              </div>
              <div className="verdict-content">
                <div className="verdict-badge">
                  {report.verdict.winner === "user"
                    ? "사용자 판정승!"
                    : report.verdict.winner === "ai"
                    ? "Gemini AI 판정승!"
                    : "치열한 무승부!"}
                </div>
                <h2 className="verdict-title">{report.verdict.resultTitle}</h2>
                <p className="verdict-punchline">
                  &ldquo;{report.verdict.punchline}&rdquo;
                </p>
              </div>

              <div className="overall-score-circle">
                <div className="score-num">{report.overallScore}</div>
                <div className="score-label">종합 논쟁 점수</div>
              </div>
            </div>

            {/* 3 Core Debate Elements Visualization Section */}
            <section className="report-elements-section">
              <div className="section-title-wrap">
                <h3 className="section-title">📊 3대 핵심 평가 요소 시각화</h3>
                <span className="section-desc">
                  Gemini 3.7 Flash가 다각도로 채점한 당신의 토론력 지표입니다.
                </span>
              </div>

              <div className="elements-grid">
                {/* 1. Logic & Persuasion */}
                <div className="element-card element-logic">
                  <div className="element-card-header">
                    <div className="element-icon">🧠</div>
                    <div className="element-titles">
                      <h4>1. 논리력 & 설득력</h4>
                      <span className="element-sub">Logic & Persuasion</span>
                    </div>
                    <span className="grade-badge">
                      {report.elements.logic.grade}
                    </span>
                  </div>

                  <div className="score-gauge-wrap">
                    <div className="gauge-header">
                      <span>점수</span>
                      <strong className="gauge-score">
                        {report.elements.logic.score}점
                      </strong>
                    </div>
                    <div className="gauge-track">
                      <div
                        className="gauge-fill gauge-fill-logic"
                        style={{ width: `${report.elements.logic.score}%` }}
                      />
                    </div>
                  </div>

                  <p className="element-commentary">
                    {report.elements.logic.commentary}
                  </p>

                  <div className="strengths-tags">
                    {report.elements.logic.strengths.map((str, idx) => (
                      <span className="tag tag-logic" key={idx}>
                        ✓ {str}
                      </span>
                    ))}
                  </div>
                </div>

                {/* 2. Emotional Empathy */}
                <div className="element-card element-empathy">
                  <div className="element-card-header">
                    <div className="element-icon">❤️</div>
                    <div className="element-titles">
                      <h4>2. 감정 & 공감도</h4>
                      <span className="element-sub">Emotional Empathy</span>
                    </div>
                    <span className="grade-badge">
                      {report.elements.empathy.grade}
                    </span>
                  </div>

                  <div className="score-gauge-wrap">
                    <div className="gauge-header">
                      <span>점수</span>
                      <strong className="gauge-score">
                        {report.elements.empathy.score}점
                      </strong>
                    </div>
                    <div className="gauge-track">
                      <div
                        className="gauge-fill gauge-fill-empathy"
                        style={{ width: `${report.elements.empathy.score}%` }}
                      />
                    </div>
                  </div>

                  <p className="element-commentary">
                    {report.elements.empathy.commentary}
                  </p>

                  <div className="strengths-tags">
                    {report.elements.empathy.strengths.map((str, idx) => (
                      <span className="tag tag-empathy" key={idx}>
                        ✓ {str}
                      </span>
                    ))}
                  </div>
                </div>

                {/* 3. Consistency & Defense */}
                <div className="element-card element-consistency">
                  <div className="element-card-header">
                    <div className="element-icon">🛡️</div>
                    <div className="element-titles">
                      <h4>3. 일관성 & 방어력</h4>
                      <span className="element-sub">Consistency & Defense</span>
                    </div>
                    <span className="grade-badge">
                      {report.elements.consistency.grade}
                    </span>
                  </div>

                  <div className="score-gauge-wrap">
                    <div className="gauge-header">
                      <span>점수</span>
                      <strong className="gauge-score">
                        {report.elements.consistency.score}점
                      </strong>
                    </div>
                    <div className="gauge-track">
                      <div
                        className="gauge-fill gauge-fill-consistency"
                        style={{
                          width: `${report.elements.consistency.score}%`,
                        }}
                      />
                    </div>
                  </div>

                  <p className="element-commentary">
                    {report.elements.consistency.commentary}
                  </p>

                  <div className="strengths-tags">
                    {report.elements.consistency.strengths.map((str, idx) => (
                      <span className="tag tag-consistency" key={idx}>
                        ✓ {str}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {/* Total Summary & Best Moments */}
            <div className="report-secondary-grid">
              {/* Summary Card */}
              <div className="report-card summary-card">
                <h4 className="card-heading">📝 5턴 토론 종합 총평</h4>
                <p className="summary-body">{report.summary}</p>
                <div className="debate-meta-tags">
                  <span className="meta-pill">
                    나의 입장:{" "}
                    {stance === "help"
                      ? "🌿 떼어준다 (배려파)"
                      : "🚫 떼어주지 않는다 (철벽파)"}
                  </span>
                  <span className="meta-pill">총 5턴 풀 매치 완료</span>
                </div>
              </div>

              {/* Best Highlights */}
              <div className="report-card highlights-card">
                <h4 className="card-heading">🌟 토론 명장면 & 결정적 발언</h4>
                <div className="highlights-list">
                  {report.highlights.map((item, idx) => (
                    <div className="highlight-item" key={idx}>
                      <div className="highlight-turn">Turn {item.turn}</div>
                      <div className="highlight-content">
                        <blockquote className="user-quote">
                          &ldquo;{item.userQuote}&rdquo;
                        </blockquote>
                        <p className="highlight-eval">💡 {item.evaluation}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Past Records Viewer on Report Page */}
            {savedRecords.length > 0 && (
              <div className="report-history-section">
                <div className="history-section-header">
                  <h4 className="history-title">📚 Supabase 역대 토론 기록 보관함</h4>
                  <button
                    className="btn-secondary"
                    onClick={loadSavedRecords}
                    type="button"
                  >
                    🔄 기록 새로고침
                  </button>
                </div>
                <div className="history-cards-grid">
                  {savedRecords.map((rec) => (
                    <div
                      className={`history-card-item ${
                        rec.id === savedRecordId ? "active-record" : ""
                      }`}
                      key={rec.id}
                    >
                      <div className="history-card-top">
                        <span
                          className={`history-stance-badge ${
                            rec.stance.includes("떼어준다") && !rec.stance.includes("않는다")
                              ? "pill-help"
                              : "pill-no-help"
                          }`}
                        >
                          {rec.stance}
                        </span>
                        <span className="history-date">
                          {new Date(rec.created_at).toLocaleDateString("ko-KR", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>

                      <h5 className="history-verdict-title">
                        {rec.report?.verdict?.resultTitle || "토론 결과"}
                      </h5>
                      <p className="history-punchline">
                        {rec.report?.verdict?.punchline || ""}
                      </p>

                      <div className="history-card-bottom">
                        <span className="history-score-tag">
                          점수: <strong>{rec.report?.overallScore}점</strong>
                        </span>
                        <button
                          className="btn-history-load"
                          onClick={() => handleOpenRecord(rec)}
                          type="button"
                        >
                          {rec.id === savedRecordId ? "현재 보고 있음" : "기록 불러오기 👁️"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Bottom Actions */}
            <div className="report-actions">
              <button
                className="btn-primary btn-large"
                onClick={handleRestart}
                type="button"
              >
                🔄 다른 입장으로 다시 도전하기
              </button>
              <button
                className="btn-secondary btn-large"
                onClick={() => setStage("chat")}
                type="button"
              >
                💬 5턴 대화 다시 보기
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* HISTORY MODAL (GLOBAL)                                                    */}
        {/* ========================================================================= */}
        {showHistoryModal && (
          <div className="modal-backdrop" onClick={() => setShowHistoryModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <div>
                  <h3 className="modal-title">📜 Supabase 역대 토론 기록 보관함</h3>
                  <p className="modal-subtitle">
                    `debate_records` 테이블에 저장된 모든 토론 세션을 다시 확인할 수 있습니다.
                  </p>
                </div>
                <button
                  className="btn-close"
                  onClick={() => setShowHistoryModal(false)}
                  type="button"
                >
                  ✕
                </button>
              </div>

              <div className="modal-body">
                {isLoadingRecords ? (
                  <div className="loading-state">
                    <span className="spinner" /> 기록을 불러오는 중...
                  </div>
                ) : savedRecords.length === 0 ? (
                  <div className="empty-history-state">
                    <div className="empty-icon">📂</div>
                    <p>아직 저장된 토론 기록이 없습니다.</p>
                    <small>5턴 토론을 완료하고 첫 기록을 남겨보세요!</small>
                  </div>
                ) : (
                  <div className="modal-history-list">
                    {savedRecords.map((rec) => (
                      <div className="modal-history-row" key={rec.id}>
                        <div className="modal-row-left">
                          <span
                            className={`history-stance-badge ${
                              rec.stance.includes("떼어준다") && !rec.stance.includes("않는다")
                                ? "pill-help"
                                : "pill-no-help"
                            }`}
                          >
                            {rec.stance}
                          </span>
                          <div className="modal-record-titles">
                            <strong className="modal-record-heading">
                              {rec.report?.verdict?.resultTitle || "토론 결과"}
                            </strong>
                            <span className="modal-record-date">
                              {new Date(rec.created_at).toLocaleString("ko-KR")}
                            </span>
                          </div>
                        </div>

                        <div className="modal-row-right">
                          <span className="modal-score-pill">
                            {rec.report?.overallScore}점
                          </span>
                          <button
                            className="btn-primary btn-modal-load"
                            onClick={() => handleOpenRecord(rec)}
                            type="button"
                          >
                            상세 보기 →
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
