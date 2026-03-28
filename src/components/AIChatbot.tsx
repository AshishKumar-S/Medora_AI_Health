import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, Sparkles, Calendar, Stethoscope } from 'lucide-react';
import { aiService, AIProvider, AIMessage } from '../lib/ai-service';
import { UserProfile } from '../types';
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'motion/react';

export default function AIChatbot({ user }: { user: UserProfile }) {
  const [messages, setMessages] = useState<AIMessage[]>([
    { role: 'bot', content: `Hello ${user.name}! I'm your AI Health Assistant. How can I help you today?` }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [provider, setProvider] = useState<AIProvider>('auto');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    const newMessages: AIMessage[] = [...messages, { role: 'user', content: userMessage }];
    setMessages(newMessages);
    setLoading(true);

    try {
      const response = await aiService.generateContent(
        userMessage,
        {
          systemInstruction: "You are a helpful and empathetic medical assistant. Provide health advice, symptom-based suggestions, and recommend booking an appointment if necessary. Always include a disclaimer that you are an AI and not a doctor. Keep responses concise and use Markdown for formatting.",
          maxOutputTokens: 1024,
        },
        provider,
        messages.slice(1) // Exclude the initial greeting from history
      );

      setMessages(prev => [...prev, { role: 'bot', content: response.text || 'I apologize, but encountered an error. Please try again.' }]);
    } catch (err: any) {
      console.error("Chatbot Error:", err);
      let errorMessage = "Trouble connecting right now.";
      
      if (err.message?.includes("API Key")) {
        errorMessage = `API Key Error: ${err.message}`;
      } else if (err.message?.includes("tokens")) {
        errorMessage = "Conversation too long. Please clear chat and start new one.";
      } else {
        errorMessage = `AI Error: ${err.message || "Something went wrong."}`;
      }
      
      setMessages(prev => [...prev, { role: 'bot', content: errorMessage }]);
    } finally {
      setLoading(false);
    }
  };

  const suggestedPrompts = [
    { text: "Check symptoms", icon: Stethoscope },
    { text: "Book appointment", icon: Calendar },
    { text: "Healthy diet tips", icon: Sparkles },
  ];

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-8rem)] flex flex-col gap-4 p-4">
      <header className="text-center space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">AI Medical Assistant</h1>
        <p className="text-white/40 text-sm">Real-time health guidance and support</p>
      </header>

      <div className="flex-1 glass-card overflow-hidden flex flex-col relative">
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          <AnimatePresence initial={false}>
            {messages.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: msg.role === 'user' ? 20 : -20 }}
                animate={{ opacity: 1, x: 0 }}
                className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  msg.role === 'user' ? 'bg-[#00d2ff]' : 'bg-white/10'
                }`}>
                  {msg.role === 'user' ? <User className="w-6 h-6" /> : <Bot className="w-6 h-6" />}
                </div>
                <div className={`max-w-[80%] p-4 rounded-2xl text-sm leading-relaxed ${
                  msg.role === 'user' ? 'bg-[#00d2ff]/10 border border-[#00d2ff]/20' : 'bg-white/5 border border-white/10'
                }`}>
                  <div className="prose prose-invert prose-sm max-w-none">
                    <ReactMarkdown>{typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)}</ReactMarkdown>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {loading && (
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-white/40" />
              </div>
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" />
                <span className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce [animation-delay:0.2s]" />
                <span className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce [animation-delay:0.4s]" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-6 border-t border-white/10 space-y-4">
          <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
            {suggestedPrompts.map((prompt, i) => (
              <button
                key={i}
                onClick={() => setInput(prompt.text)}
                className="flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-xs font-medium hover:bg-white/10 transition-all"
              >
                <prompt.icon className="w-3 h-3 text-[#00d2ff]" />
                {prompt.text}
              </button>
            ))}
          </div>
          <div className="relative">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-6 pr-16 focus:outline-none focus:border-[#00d2ff]/50 transition-all"
              placeholder="Type your health query..."
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || loading}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-[#00d2ff] rounded-xl flex items-center justify-center hover:bg-[#00d2ff]/80 transition-all disabled:opacity-50"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
