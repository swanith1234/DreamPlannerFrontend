import { useState, useRef, useEffect } from 'react';

import MessageBubble, { type ChatMessage } from './MessageBubble';
import ChatInput from './ChatInput';
import TypingIndicator from './TypingIndicator';
import api from '../../api/client';

export default function ChatContainer() {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [isTyping, setIsTyping] = useState(false);
    const [editableContent, setEditableContent] = useState<string | undefined>();
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Fetch history or initial greeting if empty
    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const res = await api.get('/chat/history');
                const data = res.data;
                
                if (data && data.length > 0) {
                    setMessages(data);
                    // Mark as seen once history is loaded
                    api.patch('/chat/seen').catch(() => {});
                } else {
                    setMessages([{
                        id: crypto.randomUUID(),
                        text: "Hey! What are we crushing today?",
                        sender: 'AI',
                        timestamp: Date.now()
                    }]);
                }
            } catch (error) {
                console.error('Failed to fetch chat history:', error);
                setMessages([{
                    id: crypto.randomUUID(),
                    text: "Hey! What are we crushing today?",
                    sender: 'AI',
                    timestamp: Date.now()
                }]);
            }
        };
        fetchHistory();
    }, []);

    // Auto-scroll on new messages or typing state changes
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isTyping]);

    const handleSend = async (text: string) => {
        if (!text.trim()) return;

        // 1. Add user message
        const userMsg: ChatMessage = {
            id: crypto.randomUUID(),
            text,
            sender: 'USER',
            timestamp: Date.now()
        };
        setMessages(prev => [...prev, userMsg]);
        setEditableContent(undefined); // Clear any pending editable content
        setIsTyping(true);

        // 2. Send to backend
        try {
            const res = await api.post('/chat', { message: text });
            const data = res.data;

            // Backend returns: { text, responseMode, editableContent? }
            if (res.status === 200) {
                const aiMsg: ChatMessage = {
                    id: crypto.randomUUID(),
                    text: data.text || data.reply, // Fallback to raw .reply if older format slips thru
                    sender: 'AI',
                    timestamp: Date.now(),
                    responseMode: data.responseMode
                };

                setMessages(prev => [...prev, aiMsg]);

                // Mark current session messages as seen
                api.patch('/chat/seen').catch(() => {});

                if (data.editableContent) {
                    setEditableContent(data.editableContent);
                }
            } else {
                // Return Error bubble
                setMessages(prev => [...prev, {
                    id: crypto.randomUUID(),
                    text: data.error || 'Connection failed. Please try again.',
                    sender: 'AI',
                    timestamp: Date.now(),
                    responseMode: 'ERROR'
                }]);
            }

        } catch (error: any) {
            console.error('Chat error:', error);
            const errorMessage = error.response?.data?.error || 'Network error. Please check your connection.';
            setMessages(prev => [...prev, {
                id: crypto.randomUUID(),
                text: errorMessage,
                sender: 'AI',
                timestamp: Date.now(),
                responseMode: 'ERROR'
            }]);
        } finally {
            setIsTyping(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-[var(--color-bg-primary)]">

            {/* Scrollable Message Feed */}
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 scrollbar-hide">
                <div className="max-w-4xl mx-auto flex flex-col w-full h-full justify-start pb-4">
                    {messages.map((msg) => (
                        <MessageBubble key={msg.id} message={msg} />
                    ))}

                    {isTyping && <TypingIndicator />}

                    {/* Anchor for auto-scroll */}
                    <div ref={messagesEndRef} className="h-4" />
                </div>
            </div>

            {/* Input Fixed at bottom */}
            <div className="flex-none max-w-4xl mx-auto w-full pb- safe-area-inset-bottom">
                <ChatInput
                    onSend={handleSend}
                    disabled={isTyping}
                    editableContent={editableContent}
                />
            </div>

        </div>
    );
}
