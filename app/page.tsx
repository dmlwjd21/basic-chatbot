"use client";

import { FormEvent, useState } from "react";

type Message = {
  id: number;
  role: "assistant" | "user";
  content: string;
  time: string;
};

const starterPrompts = [
  "이번 주 우선순위를 정리해줘",
  "회의 내용을 요약해줘",
  "아이디어를 함께 발전시켜줘",
];

const initialMessages: Message[] = [
  {
    id: 1,
    role: "assistant",
    content:
      "안녕하세요. 오늘은 어떤 일을 함께 정리해볼까요? 아이디어를 구체화하거나, 복잡한 내용을 깔끔하게 정리하는 일을 도와드릴게요.",
    time: "오전 10:42",
  },
  {
    id: 2,
    role: "user",
    content: "새로운 프로젝트를 시작하려고 해. 어디서부터 정리하면을까?",
    time: "오전 10:43",
  },
  {
    id: 3,
    role: "assistant",
    content:
      "좋아요. 먼저 프로젝트의 목표, 대상 사용자, 그리고 이번 주에 만들 수 있는 가장 작은 결과물을 정해보면 좋아요. 지금 떠오르는 목표를 한 문장으로 적어볼까요?",
    time: "오전 10:43",
  },
];

const conversations = [
  { title: "새 프로젝트 정리", date: "오늘", active: true },
  { title: "콘텐츠 아이디어 브레인스토밍", date: "어제" },
  { title: "주간 회고 질문", date: "3일 전" },
];

export default function Home() {
  const [messages, setMessages] = useState(initialMessages);
  const [draft, setDraft] = useState("");
  const [activeConversation, setActiveConversation] = useState("새 프로젝트 정리");

  function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedDraft = draft.trim();

    if (!trimmedDraft) return;

    setMessages((currentMessages) => [
      ...currentMessages,
      { id: Date.now(), role: "user", content: trimmedDraft, time: "방금 전" },
      {
        id: Date.now() + 1,
        role: "assistant",
        content:
          "좋은 질문이에요. 목업 응답이지만, 실제 API가 연결되면 이 자리에서 더 구체적인 답변을 드릴 수 있어요. 다음 단계로 무엇을 정리해볼까요?",
        time: "방금 전",
      },
    ]);
    setDraft("");
  }

  function startNewChat() {
    setActiveConversation("새 대화");
    setMessages([]);
    setDraft("");
  }

  return (
    <main className="chat-app-shell">
      <aside className="sidebar">
        <div className="brand-row">
          <div className="brand-mark">N</div>
          <span>nora</span>
          <span className="brand-beta">BETA</span>
        </div>

        <button className="new-chat-button" onClick={startNewChat} type="button">
          <span className="plus-icon">+</span>
          새 대화
          <span className="shortcut">⌘ K</span>
        </button>

        <div className="sidebar-section">
          <p className="section-label">최근 대화</p>
          <nav className="conversation-list" aria-label="최근 대화">
            {conversations.map((conversation) => (
              <button
                className={`conversation-item ${activeConversation === conversation.title ? "selected" : ""}`}
                key={conversation.title}
                onClick={() => setActiveConversation(conversation.title)}
                type="button"
              >
                <span className="conversation-icon">○</span>
                <span className="conversation-copy">
                  <strong>{conversation.title}</strong>
                  <small>{conversation.date}</small>
                </span>
              </button>
            ))}
          </nav>
        </div>

        <div className="sidebar-footer">
          <button className="workspace-link" type="button">
            <span className="avatar small-avatar">M</span>
            <span className="workspace-copy">
              <strong>민지의 워크스페이스</strong>
              <small>개인 플랜</small>
            </span>
            <span className="chevron">›</span>
          </button>
          <div className="footer-links">
            <button type="button">설정</button>
            <button type="button">도움말</button>
          </div>
        </div>
      </aside>

      <section className="chat-panel">
        <header className="chat-header">
          <div className="chat-title-wrap">
            <span className="status-dot" />
            <div>
              <h1>{activeConversation}</h1>
              <p>Nora · 개인 AI 어시스턴트</p>
            </div>
          </div>
          <div className="header-actions">
            <button className="icon-button" aria-label="대화 검색" type="button">⌕</button>
            <button className="icon-button" aria-label="더 보기" type="button">•••</button>
          </div>
        </header>

        <div className="message-scroll-area">
          {messages.length === 0 ? (
            <div className="empty-state">
              <div className="empty-mark">N</div>
              <h2>무엇을 도와드릴까요?</h2>
              <p>생각을 정리하고, 새로운 아이디어를 시작해보세요.</p>
            </div>
          ) : (
            <div className="message-thread">
              <div className="date-divider"><span>오늘</span></div>
              {messages.map((message) => (
                <article className={`message-row ${message.role}`} key={message.id}>
                  {message.role === "assistant" && <div className="avatar assistant-avatar">N</div>}
                  <div className="message-content">
                    <div className="message-meta">
                      <strong>{message.role === "assistant" ? "Nora" : "민지"}</strong>
                      <span>{message.time}</span>
                    </div>
                    <p>{message.content}</p>
                  </div>
                  {message.role === "user" && <div className="avatar user-avatar">M</div>}
                </article>
              ))}
            </div>
          )}
        </div>

        <div className="composer-area">
          <div className="prompt-row" aria-label="추천 프롬프트">
            {starterPrompts.map((prompt) => (
              <button key={prompt} onClick={() => setDraft(prompt)} type="button">
                {prompt}
              </button>
            ))}
          </div>
          <form className="composer" onSubmit={sendMessage}>
            <textarea
              aria-label="메시지 입력"
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  event.currentTarget.form?.requestSubmit();
                }
              }}
              placeholder="Nora에게 메시지를 보내보세요..."
              rows={1}
              value={draft}
            />
            <div className="composer-tools">
              <button aria-label="파일 첨부" className="tool-button" type="button">+</button>
              <span className="input-hint">Shift + Enter 줄바꿈</span>
              <button aria-label="메시지 보내기" className="send-button" type="submit">↑</button>
            </div>
          </form>
          <p className="privacy-note">Nora는 실수를 할 수 있어요. 중요한 정보는 한 번 더 확인해주세요.</p>
        </div>
      </section>
    </main>
  );
}
