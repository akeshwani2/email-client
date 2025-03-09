// src/components/EmailDashboard.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { Email, EmailAction, EmailCategory, Label } from '@/types/email';

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
      } catch (error) {
        console.error('Error in fetchData:', error);
        setError(error instanceof Error ? error.message : 'Failed to fetch data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

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

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <h1 className="text-3xl font-semibold text-black mb-8">Friday Email Assistant</h1>
        
        <div className="flex gap-6">
          {/* Left Sidebar */}
          <div className="w-1/3 space-y-8">
            {/* Labels Section */}
            <div className="border-b border-gray-200 pb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-medium text-black">Labels</h2>
                <button
                  onClick={() => setShowLabelInput(true)}
                  className="text-sm text-gray-600 hover:text-black"
                >
                  + Add Label
                </button>
              </div>
              
              {showLabelInput && (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newLabelName}
                      onChange={(e) => setNewLabelName(e.target.value)}
                      placeholder="Label name"
                      className="flex-1 px-3 py-1 border border-gray-200 rounded-lg text-sm"
                      onKeyDown={(e) => e.key === 'Enter' && !isCreatingLabel && addNewLabel()}
                      disabled={isCreatingLabel}
                    />
                    <button
                      onClick={addNewLabel}
                      disabled={isCreatingLabel}
                      className={`px-3 py-1 rounded-lg text-sm ${
                        isCreatingLabel
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          : 'bg-black text-white hover:bg-gray-800'
                      }`}
                    >
                      {isCreatingLabel ? 'Adding...' : 'Add'}
                    </button>
                  </div>
                  {labelError && (
                    <p className="text-sm text-red-600">{labelError}</p>
                  )}
                </div>
              )}
              
              <div className="space-y-1">
                {labels.map(label => (
                  <div
                    key={label.id}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-50 cursor-pointer"
                  >
                    <div className={`w-2 h-2 rounded-full ${label.color}`} />
                    <span className="text-sm text-gray-700">{label.name}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Inbox Section */}
            <div>
              <h2 className="text-lg font-medium text-black mb-4">Inbox</h2>
              {loading ? (
                <div className="text-gray-500">Loading emails...</div>
              ) : error ? (
                <div className="text-red-600">{error}</div>
              ) : emails.length === 0 ? (
                <div className="text-gray-500">No emails to display</div>
              ) : (
                <div className="space-y-1">
                  {emails.map(email => (
                    <div
                      key={email.id}
                      className={`p-3 rounded-lg cursor-pointer transition-colors ${
                        selectedEmail?.id === email.id 
                          ? 'bg-gray-100' 
                          : 'hover:bg-gray-50'
                      }`}
                      onClick={() => setSelectedEmail(email)}
                    >
                      <div className="font-medium text-black truncate">{email.from}</div>
                      <div className="text-sm text-gray-600 truncate">{email.subject}</div>
                      <div className="mt-1 flex items-center gap-2">
                        {email.category && (
                          <span className={`text-xs px-2 py-0.5 rounded-full border ${
                            email.category === EmailCategory.URGENT
                              ? 'border-red-200 text-red-800 bg-red-50'
                              : email.category === EmailCategory.IMPORTANT
                              ? 'border-yellow-200 text-yellow-800 bg-yellow-50'
                              : 'border-gray-200 text-gray-600 bg-gray-50'
                          }`}>
                            {email.category}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Main Content - Email View */}
          <div className="w-2/3">
            {selectedEmail ? (
              <div className="space-y-6">
                <div className="border-b border-gray-200 pb-4">
                  <div className="flex justify-between items-start mb-2">
                    <h2 className="text-xl font-semibold text-black">{selectedEmail.subject}</h2>
                    <div className="flex gap-2">
                      {labels.map(label => (
                        <button
                          key={label.id}
                          onClick={() => toggleEmailLabel(selectedEmail.id, label)}
                          className={`text-xs px-2 py-1 rounded-full border border-gray-200 ${
                            selectedEmail.labels.some(l => l.id === label.id)
                              ? label.color
                              : 'bg-white'
                          } hover:opacity-80`}
                        >
                          {label.name}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="text-sm text-gray-600">From: {selectedEmail.from}</div>
                </div>
                
                {selectedEmail.aiSummary && (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <h3 className="font-medium text-black mb-2">AI Analysis</h3>
                    <p className="text-gray-700">{selectedEmail.aiSummary}</p>
                  </div>
                )}
                
                <div className="prose max-w-none">
                  <div className="text-gray-800 whitespace-pre-wrap">{selectedEmail.body}</div>
                </div>
                
                {selectedEmail.suggestedResponse && (
                  <div className="border border-gray-200 rounded-lg p-4 bg-white">
                    <h3 className="font-medium text-black mb-2">Suggested Response</h3>
                    <p className="text-gray-700 mb-4">{selectedEmail.suggestedResponse}</p>
                    <button 
                      className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
                      onClick={() => {/* Implement send response */}}
                    >
                      Send Response
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500">
                Select an email to view details
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}