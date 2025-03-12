// src/components/EmailDashboard.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { Email, EmailAction, EmailCategory, Label } from '@/types/email';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  emailData?: Email | Email[];
}

export default function EmailDashboard() {
  const [emails, setEmails] = useState<Email[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetchedRef = useRef(false);
  const [labels, setLabels] = useState<Label[]>([
    { id: '1', name: 'Important', color: 'bg-red-100' },
    { id: '2', name: 'Work', color: 'bg-blue-100' },
    { id: '3', name: 'Personal', color: 'bg-green-100' },
  ]);
  const [newLabelName, setNewLabelName] = useState('');
  const [showLabelInput, setShowLabelInput] = useState(false);
  const [labelError, setLabelError] = useState<string | null>(null);
  const [isCreatingLabel, setIsCreatingLabel] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch emails
        const emailResponse = await fetch('/api/email');
        if (!emailResponse.ok) {
          throw new Error(`Failed to fetch emails: ${emailResponse.status}`);
        }
        const { emails: emailData } = await emailResponse.json();
        setEmails(emailData);

        // Fetch labels
        const labelResponse = await fetch('/api/email/label');
        if (labelResponse.ok) {
          const labelData = await labelResponse.json();
          setLabels(labelData);
        }

        // Add initial AI message
        setMessages([{
          role: 'assistant',
          content: 'Hello! I\'m your email assistant. I can help you manage your emails and labels. What would you like to do?',
          timestamp: new Date()
        }]);
      } catch (error) {
        console.error('Error in fetchData:', error);
        setError(error instanceof Error ? error.message : 'Failed to fetch data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const addNewLabel = async () => {
    if (!newLabelName.trim()) return;
    
    setLabelError(null);
    setIsCreatingLabel(true);
    
    const newLabel: Label = {
      id: Date.now().toString(),
      name: newLabelName.trim(),
      color: 'bg-gray-100'  // Default color
    };
    
    try {
      const response = await fetch('/api/email/label', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'create',
          label: newLabel,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create label');
      }

      const createdLabel = await response.json();
      setLabels([...labels, createdLabel]);
      setNewLabelName('');
      setShowLabelInput(false);
    } catch (error) {
      console.error('Error creating label:', error);
      setLabelError(error instanceof Error ? error.message : 'Failed to create label');
    } finally {
      setIsCreatingLabel(false);
    }
  };

  const toggleEmailLabel = async (emailId: string, label: Label) => {
    if (!label.gmailLabelId) return;

    const hasLabel = selectedEmail?.labels.some(l => l.id === label.id);
    const action = hasLabel ? 'remove' : 'add';

    try {
      const response = await fetch('/api/email/label', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          emailId,
          labelId: label.gmailLabelId,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to ${action} label`);
      }

      // Update local state
      setEmails(emails.map(email => {
        if (email.id === emailId) {
          return {
            ...email,
            labels: hasLabel
              ? email.labels.filter(l => l.id !== label.id)
              : [...email.labels, label],
          };
        }
        return email;
      }));

      if (selectedEmail?.id === emailId) {
        setSelectedEmail(prev => {
          if (!prev) return null;
          return {
            ...prev,
            labels: hasLabel
              ? prev.labels.filter(l => l.id !== label.id)
              : [...prev.labels, label],
          };
        });
      }
    } catch (error) {
      console.error(`Error ${action}ing label:`, error);
      // You might want to show an error message to the user
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: inputMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');

    // TODO: Add AI response processing here
    // For now, just echo back
    const aiMessage: ChatMessage = {
      role: 'assistant',
      content: 'I received your message. AI response processing will be implemented soon.',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, aiMessage]);
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-4xl mx-auto px-4 py-6 flex flex-col h-screen">
        <h1 className="text-2xl font-semibold mb-8 text-center">Friday Email Assistant</h1>
        
        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto mb-6 space-y-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-4 py-2 ${
                  message.role === 'user'
                    ? 'bg-white text-black'
                    : 'bg-gray-800 text-white'
                }`}
              >
                <p className="text-sm">{message.content}</p>
                <p className="text-xs mt-1 opacity-50">
                  {message.timestamp.toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Form */}
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Ask about your emails..."
            className="flex-1 bg-gray-800 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-white"
          />
          <button
            type="submit"
            className="px-6 py-2 bg-white text-black rounded-lg hover:bg-gray-200 transition-colors"
          >
            Send
          </button>
        </form>

        {/* Loading State */}
        {loading && (
          <div className="fixed top-4 right-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          </div>
        )}
      </div>
    </div>
  );
}