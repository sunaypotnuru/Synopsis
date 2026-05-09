/**
 * AI Consultation Interface Component
 * 
 * Enhanced AI consultation interface for healthcare professionals
 * Features:
 * - Streaming AI responses
 * - Prompt template selection
 * - Quality feedback
 * - Rate limit monitoring
 * - Context viewer
 * - Token usage tracking
 */

import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { aiAPI } from '@/services/api';
import {
  Brain,
  Send,
  Loader2,
  User,
  Bot,
  Sparkles,
  AlertCircle,
  RefreshCcw,
} from 'lucide-react';
import { toast } from 'sonner';
import { PromptTemplateSelector } from './PromptTemplateSelector';
import { AIQualityFeedback } from './AIQualityFeedback';
import { AIRateLimitIndicator } from './AIRateLimitIndicator';
import { ContextViewer } from './ContextViewer';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  confidence?: number;
  tokens?: number;
}

interface AIConsultationInterfaceProps {
  patientContext?: {
    age?: number;
    gender?: string;
    medical_history?: string[];
    current_medications?: string[];
  };
  onClose?: () => void;
}

export function AIConsultationInterface({
  patientContext,
  onClose,
}: AIConsultationInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showContext, setShowContext] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [selectedMessageForFeedback, setSelectedMessageForFeedback] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (text?: string) => {
    const messageText = text || input.trim();
    if (!messageText || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: messageText,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Build context
      const context = patientContext
        ? `Patient Context:\n- Age: ${patientContext.age || 'N/A'}\n- Gender: ${patientContext.gender || 'N/A'}\n- Medical History: ${patientContext.medical_history?.join(', ') || 'None'}\n- Current Medications: ${patientContext.current_medications?.join(', ') || 'None'}`
        : '';

      // Call AI API
      const response = await aiAPI.createAIRequest({
        model: 'default',
        prompt: messageText,
        template_id: selectedTemplate || undefined,
        context: context ? { notes: context } : undefined,
      });

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.content || 'I apologize, but I encountered an error.',
        timestamp: new Date(),
        confidence: response.confidence_score,
        tokens: response.tokens_used,
      };

      setMessages((prev) => [...prev, aiMessage]);

      // Check for emergency (if available in response)
      if ((response as any).emergency_detected) {
        toast.error('Emergency symptoms detected! Please seek immediate medical attention.');
      }
    } catch (error) {
      console.error('AI consultation error:', error);
      toast.error('Failed to get AI response. Please try again.');
    } finally {
      setIsLoading(false);
      setSelectedTemplate(null);
    }
  };

  const handleTemplateSelect = (templateId: string, prompt: string) => {
    setSelectedTemplate(templateId);
    setInput(prompt);
    setShowTemplates(false);
  };

  const handleFeedback = (messageId: string) => {
    setSelectedMessageForFeedback(messageId);
    setShowFeedback(true);
  };

  const handleClearChat = () => {
    setMessages([]);
    setInput('');
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-100 rounded-2xl">
              <Brain className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                AI Consultation Assistant
                <Sparkles className="w-5 h-5 text-purple-600" />
              </h2>
              <p className="text-sm text-gray-500">
                Powered by advanced medical AI
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={() => setShowContext(!showContext)}
              variant="outline"
              size="sm"
            >
              {showContext ? 'Hide' : 'Show'} Context
            </Button>

            <Button
              onClick={() => setShowTemplates(!showTemplates)}
              variant="outline"
              size="sm"
            >
              Templates
            </Button>

            <Button
              onClick={handleClearChat}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <RefreshCcw className="w-4 h-4" />
              Clear
            </Button>

            {onClose && (
              <Button onClick={onClose} variant="ghost" size="sm">
                Close
              </Button>
            )}
          </div>
        </div>

        {/* Rate Limit Indicator */}
        <div className="mt-4">
          <AIRateLimitIndicator />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Context Viewer (Sidebar) */}
        {showContext && (
          <div className="w-80 border-r border-gray-200 bg-white overflow-y-auto">
            <ContextViewer context={patientContext} />
          </div>
        )}

        {/* Messages Area */}
        <div className="flex-1 flex flex-col">
          {/* Template Selector */}
          {showTemplates && (
            <div className="p-4 bg-white border-b border-gray-200">
              <PromptTemplateSelector onSelect={handleTemplateSelect} />
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <Brain className="w-16 h-16 mb-4 opacity-20" />
                <p className="text-lg font-medium">Start a consultation</p>
                <p className="text-sm">Ask a medical question or use a template</p>
              </div>
            ) : (
              messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  {/* Avatar */}
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                      message.role === 'user'
                        ? 'bg-gradient-to-br from-blue-500 to-blue-600'
                        : 'bg-gradient-to-br from-purple-500 to-purple-600'
                    }`}
                  >
                    {message.role === 'user' ? (
                      <User className="w-5 h-5 text-white" />
                    ) : (
                      <Bot className="w-5 h-5 text-white" />
                    )}
                  </div>

                  {/* Message Content */}
                  <div className="flex-1 max-w-3xl">
                    <Card
                      className={`p-4 ${
                        message.role === 'user'
                          ? 'bg-blue-50 border-blue-200'
                          : 'bg-white border-gray-200'
                      }`}
                    >
                      <div className="prose prose-sm max-w-none">
                        <p className="whitespace-pre-wrap">{message.content}</p>
                      </div>

                      {/* Message Metadata */}
                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span>
                            {message.timestamp.toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                          {message.confidence && (
                            <span className="flex items-center gap-1">
                              <Sparkles className="w-3 h-3" />
                              Confidence: {(message.confidence * 100).toFixed(0)}%
                            </span>
                          )}
                          {message.tokens && (
                            <span>Tokens: {message.tokens}</span>
                          )}
                        </div>

                        {message.role === 'assistant' && (
                          <Button
                            onClick={() => handleFeedback(message.id)}
                            variant="ghost"
                            size="sm"
                            className="text-xs"
                          >
                            Provide Feedback
                          </Button>
                        )}
                      </div>
                    </Card>
                  </div>
                </motion.div>
              ))
            )}

            {isLoading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex gap-3"
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <Card className="p-4 bg-white">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
                    <span className="text-sm text-gray-600">AI is thinking...</span>
                  </div>
                </Card>
              </motion.div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="border-t border-gray-200 bg-white p-4">
            {selectedTemplate && (
              <div className="mb-3 p-2 bg-purple-50 border border-purple-200 rounded-lg flex items-center justify-between">
                <span className="text-xs text-purple-700">Using template</span>
                <button
                  onClick={() => setSelectedTemplate(null)}
                  className="text-xs text-purple-600 hover:text-purple-800"
                >
                  Clear
                </button>
              </div>
            )}

            <div className="flex gap-3">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder="Ask a medical question... (Shift+Enter for new line)"
                rows={3}
                className="flex-1 resize-none px-4 py-3 rounded-xl border border-gray-200 focus:border-purple-400 focus:ring-2 focus:ring-purple-200 outline-none text-sm"
              />
              <Button
                onClick={() => handleSendMessage()}
                disabled={!input.trim() || isLoading}
                className="bg-gradient-to-br from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white px-6 rounded-xl"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </Button>
            </div>

            {/* Disclaimer */}
            <div className="mt-3 flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800">
                AI-generated guidance only. Always verify with professional medical judgment.
                Not a substitute for clinical diagnosis.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Feedback Modal */}
      {showFeedback && selectedMessageForFeedback && (
        <AIQualityFeedback
          messageId={selectedMessageForFeedback}
          onClose={() => {
            setShowFeedback(false);
            setSelectedMessageForFeedback(null);
          }}
        />
      )}
    </div>
  );
}
