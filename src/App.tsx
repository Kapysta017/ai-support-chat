import React, { useState, useRef, useEffect } from "react";
import { sendMessageToSupport } from "./services/gemini";
import "./App.css";

interface Message {
  id: string;
  role: "user" | "ai";
  text: string;
}
export default function App() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "ai",
      text: "Welcome to SaaSJet Support! How can I help you?",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessageText = input;
    setInput("");

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      text: userMessageText,
    };
    setMessages((prev) => [...prev, userMessage]);

    setIsLoading(true);

    const aiResponseText = await sendMessageToSupport(userMessageText);
    const aiMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: "ai",
      text: aiResponseText,
    };
    setMessages((prev) => [...prev, aiMessage]);

    setIsLoading(false);
  };

  return (
    <div className="app-container">
      <header className="chat-header">
        <h1>SaaSJet AI Support</h1>
        <p>Online technical support assistant</p>
      </header>

      <main className="chat-window">
        {messages.map((msg) => (
          <div key={msg.id} className={`message-wrapper ${msg.role}`}>
            <div className="message-sender">
              {msg.role === "user" ? "You" : "SaaSJet Agent"}
            </div>
            <div className="message-text">{msg.text}</div>
          </div>
        ))}
        {isLoading && (
          <div className="message-wrapper ai loading">
            <div className="message-text">...</div>
          </div>
        )}
        <div ref={chatEndRef} />
      </main>

      <footer className="chat-footer">
        <form onSubmit={handleSend} className="chat-form">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Describe your problem..."
            disabled={isLoading}
          />
          <button type="submit" disabled={isLoading || !input.trim()}>
            Send
          </button>
        </form>
      </footer>
    </div>
  );
}
