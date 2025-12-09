'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useRef, useEffect } from 'react';
import { X, Send, Sparkles, Loader2 } from 'lucide-react';

interface Message {
    role: 'user' | 'assistant';
    content: string;
    suggestions?: string[];
    timestamp: Date;
}

interface DraftInquiry {
    type?: string;
    title?: string;
    description?: string;
    evidence: string[];
    connections: string[];
    credibilityScore?: number;
}

interface ConversationalInquiryModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (inquiry: any) => void;
    selectedText?: string;
    targetNode?: { id: string; title: string };
}

export function ConversationalInquiryModal({
    isOpen,
    onClose,
    onSubmit,
    selectedText,
    targetNode,
}: ConversationalInquiryModalProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [draft, setDraft] = useState<DraftInquiry>({
        evidence: selectedText ? [selectedText] : [],
        connections: [],
    });
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const hasGreeted = useRef(false);

    // Auto-scroll to bottom of chat
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Initial AI greeting
    useEffect(() => {
        if (isOpen && messages.length === 0 && !hasGreeted.current) {
            hasGreeted.current = true;
            setTimeout(() => {
                const greeting = selectedText
                    ? "Hi! I'll help you create a formal inquiry. I can see you've selected some text. What's your concern or question about it?"
                    : "Hi! I'll help you create a formal inquiry. What topic or claim would you like to investigate today?";

                const suggestions = selectedText
                    ? ['This claim is factually incorrect', 'The logic here is flawed', 'Important context is missing']
                    : ['I want to check a fact', 'I found a logical fallacy', 'I want to report missing context'];

                addAIMessage(greeting, suggestions);
            }, 500);
        } else if (!isOpen) {
            hasGreeted.current = false; // Reset on close
        }
    }, [isOpen, selectedText]);

    const addAIMessage = (content: string, suggestions?: string[]) => {
        setMessages((prev) => [
            ...prev,
            {
                role: 'assistant',
                content,
                suggestions,
                timestamp: new Date(),
            },
        ]);
    };

    const handleSend = async () => {
        if (!input.trim()) return;

        // Add user message
        const userMessage: Message = {
            role: 'user',
            content: input,
            timestamp: new Date(),
        };
        setMessages((prev) => [...prev, userMessage]);
        setInput('');
        setIsTyping(true);

        // Simulate AI processing (replace with actual AI call)
        setTimeout(() => {
            processUserInput(input);
            setIsTyping(false);
        }, 1500);
    };

    const processUserInput = (userInput: string) => {
        // Simple keyword-based responses (replace with actual AI)
        const lowerInput = userInput.toLowerCase();

        // First message - classify type
        if (messages.length === 1) {
            let type = 'factual_accuracy';
            let typeLabel = 'Factual Accuracy';

            if (lowerInput.includes('logic') || lowerInput.includes('fallacy')) {
                type = 'logical_fallacy';
                typeLabel = 'Logical Fallacy';
            } else if (lowerInput.includes('context') || lowerInput.includes('missing')) {
                type = 'missing_context';
                typeLabel = 'Missing Context';
            }

            setDraft((prev) => ({
                ...prev,
                type,
                title: `${typeLabel} Inquiry`,
                description: userInput,
            }));

            addAIMessage(
                `I understand. This appears to be a **${typeLabel}** inquiry. I've started drafting it for you.\n\nDo you have any evidence or sources to support your concern?`,
                ['Yes, I have evidence', 'No, just my observation', 'Let me upload a document']
            );
        }
        // Second message - evidence
        else if (messages.length === 3) {
            if (lowerInput.includes('yes') || lowerInput.includes('evidence')) {
                addAIMessage(
                    "Great! You can:\n1. Describe your evidence in text\n2. Upload a document\n3. Link to an existing node\n\nWhat would you like to do?",
                    ['Describe it', 'Upload file', 'Link to node']
                );
            } else {
                addAIMessage(
                    "That's okay. Your selected text is already included as evidence. Would you like me to suggest some related nodes that might strengthen your inquiry?",
                    ['Yes, show suggestions', 'No, continue']
                );
            }
        }
        // Third message - finalize
        else if (messages.length === 5) {
            const targetTitle = targetNode?.title ? ` - ${targetNode.title}` : '';
            setDraft((prev) => ({
                ...prev,
                title: `${prev.type?.replace(/_/g, ' ')}${targetTitle}`,
                credibilityScore: 0.72,
            }));

            addAIMessage(
                "Perfect! I've updated your inquiry. Here's what we have:\n\n✅ Type classified\n✅ Evidence added\n✅ Initial credibility score: 72%\n\nWould you like to refine anything, or are you ready to publish?",
                ['Refine title', 'Add more evidence', 'Publish now']
            );
        }
        // Publish
        else if (lowerInput.includes('publish')) {
            handlePublish();
        }
        // Default
        else {
            addAIMessage(
                "I've updated the inquiry based on your input. What would you like to do next?",
                ['Add more details', 'Review and publish', 'Start over']
            );
        }
    };

    const handlePublish = () => {
        addAIMessage(
            "🎉 Publishing your inquiry now...",
            []
        );

        setTimeout(() => {
            onSubmit({
                ...draft,
                targetNodeId: targetNode?.id,
            });
            addAIMessage(
                "✅ **Inquiry Published Successfully!**\n\nYour inquiry is now live and the community can start engaging with it.",
                []
            );
            setTimeout(() => {
                onClose();
            }, 2000);
        }, 1000);
    };

    const handleSuggestionClick = (suggestion: string) => {
        setInput(suggestion);
        setTimeout(() => handleSend(), 100);
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
            >
                <motion.div
                    className="relative w-full max-w-7xl h-[85vh] overflow-hidden rounded-2xl bg-zinc-950 border border-zinc-800 shadow-2xl flex"
                    initial={{ scale: 0.9, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.9, y: 20 }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Left Side - Chat */}
                    <div className="flex-1 flex flex-col border-r border-zinc-800">
                        {/* Header */}
                        <div className="p-6 border-b border-zinc-800">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-white/10">
                                        <Sparkles className="w-5 h-5 text-white" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-zinc-50">Create Formal Inquiry</h2>
                                        {targetNode && (
                                            <p className="text-sm text-zinc-400">
                                                Investigating: {targetNode.title}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="p-2 rounded-lg hover:bg-zinc-800 transition-colors"
                                >
                                    <X className="w-5 h-5 text-zinc-400" />
                                </button>
                            </div>
                        </div>

                        {/* Context Box */}
                        <div className="p-4 border-b border-zinc-800 bg-zinc-900/50">
                            <div className="text-xs font-semibold text-zinc-400 mb-2">SELECTED CONTEXT</div>
                            <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800">
                                <p className="text-sm text-zinc-300 italic">"{selectedText}"</p>
                            </div>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-4">
                            {messages.map((message, index) => (
                                <motion.div
                                    key={index}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div
                                        className={`max-w-[80%] rounded-2xl px-4 py-3 ${message.role === 'user'
                                            ? 'bg-zinc-50 text-zinc-950'
                                            : 'bg-zinc-800 text-zinc-50'
                                            }`}
                                    >
                                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>

                                        {/* Suggestions */}
                                        {message.suggestions && message.suggestions.length > 0 && (
                                            <div className="mt-3 space-y-2">
                                                {message.suggestions.map((suggestion, i) => (
                                                    <button
                                                        key={i}
                                                        onClick={() => handleSuggestionClick(suggestion)}
                                                        className="block w-full text-left px-3 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-700 text-sm text-zinc-300 transition-colors"
                                                    >
                                                        {suggestion}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            ))}

                            {/* Typing indicator */}
                            {isTyping && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="flex justify-start"
                                >
                                    <div className="bg-zinc-800 rounded-2xl px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <Loader2 className="w-4 h-4 text-zinc-400 animate-spin" />
                                            <span className="text-sm text-zinc-400">AI is thinking...</span>
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input */}
                        <div className="p-4 border-t border-zinc-800">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                                    placeholder="Type your message..."
                                    className="flex-1 px-4 py-3 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-50 placeholder-zinc-500 focus:border-zinc-600 focus:ring-2 focus:ring-zinc-600/20 outline-none transition-all"
                                />
                                <button
                                    onClick={handleSend}
                                    disabled={!input.trim() || isTyping}
                                    className="px-4 py-3 rounded-lg bg-zinc-50 hover:bg-zinc-200 text-zinc-950 font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <Send className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Right Side - Canvas Preview */}
                    <div className="w-[40%] flex flex-col bg-zinc-900/30">
                        {/* Canvas Header */}
                        <div className="p-6 border-b border-zinc-800">
                            <h3 className="text-lg font-semibold text-zinc-50">Live Preview</h3>
                            <p className="text-sm text-zinc-400">Updates as you chat</p>
                        </div>

                        {/* Canvas Content */}
                        <div className="flex-1 overflow-y-auto p-6">
                            <AnimatePresence mode="wait">
                                {draft.type ? (
                                    <motion.div
                                        key="preview"
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="space-y-6"
                                    >
                                        {/* Type Badge */}
                                        <div className="flex items-center gap-2 text-zinc-400">
                                            <Sparkles className="w-4 h-4" />
                                            <span className="text-xs font-semibold uppercase tracking-wider">
                                                {draft.type.replace(/_/g, ' ')}
                                            </span>
                                        </div>

                                        {/* Title */}
                                        <div>
                                            <div className="text-xs font-semibold text-zinc-500 mb-2">TITLE</div>
                                            <h4 className="text-xl font-bold text-zinc-50">{draft.title || 'Untitled'}</h4>
                                        </div>

                                        {/* Description */}
                                        {draft.description && (
                                            <div>
                                                <div className="text-xs font-semibold text-zinc-500 mb-2">DESCRIPTION</div>
                                                <p className="text-sm text-zinc-300">{draft.description}</p>
                                            </div>
                                        )}

                                        {/* Evidence */}
                                        {draft.evidence.length > 0 && (
                                            <div>
                                                <div className="text-xs font-semibold text-zinc-500 mb-2">
                                                    EVIDENCE ({draft.evidence.length})
                                                </div>
                                                <div className="space-y-2">
                                                    {draft.evidence.map((evidence, i) => (
                                                        <div
                                                            key={i}
                                                            className="p-3 rounded-lg bg-zinc-900 border border-zinc-800"
                                                        >
                                                            <p className="text-xs text-zinc-400 line-clamp-2">"{evidence}"</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Credibility Score */}
                                        {draft.credibilityScore !== undefined && (
                                            <div>
                                                <div className="text-xs font-semibold text-zinc-500 mb-2">
                                                    ESTIMATED CREDIBILITY
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <div className="flex-1 h-2 rounded-full bg-zinc-800 overflow-hidden">
                                                        <motion.div
                                                            className="h-full bg-gradient-to-r from-green-600 to-green-400"
                                                            initial={{ width: 0 }}
                                                            animate={{ width: `${draft.credibilityScore * 100}%` }}
                                                            transition={{ duration: 0.8, ease: 'easeOut' }}
                                                        />
                                                    </div>
                                                    <span className="text-sm font-semibold text-zinc-300">
                                                        {Math.round(draft.credibilityScore * 100)}%
                                                    </span>
                                                </div>
                                            </div>
                                        )}
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        key="empty"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="h-full flex items-center justify-center"
                                    >
                                        <div className="text-center text-zinc-500">
                                            <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                            <p className="text-sm">Start chatting to build your inquiry</p>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
