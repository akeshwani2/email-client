'use client';

import React, { useState, useEffect } from 'react';
import { Label, EmailAction } from '@/types/email';

interface AutomationRule {
  id: string;
  label: Label;
  action: EmailAction;
  enabled: boolean;
  template?: string;
}

export default function AutomationsPage() {
  const [automations, setAutomations] = useState<AutomationRule[]>([]);
  const [availableLabels, setAvailableLabels] = useState<Label[]>([]);
  const [selectedLabel, setSelectedLabel] = useState<Label | null>(null);
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [selectedAction, setSelectedAction] = useState<EmailAction | ''>('');
  const [replyTemplate, setReplyTemplate] = useState(`Hi {sender_name},

Thank you for your email about {email_subject}.

{ai_response}

Best regards,
{my_name}`);

  // Load automations and labels from localStorage on mount
  useEffect(() => {
    const savedAutomations = localStorage.getItem('emailAutomations');
    if (savedAutomations) {
      setAutomations(JSON.parse(savedAutomations));
    }

    // Load labels from localStorage or set defaults if none exist
    const savedLabels = localStorage.getItem('emailLabels');
    if (savedLabels) {
      setAvailableLabels(JSON.parse(savedLabels));
    } else {
      // Default labels
      const defaultLabels: Label[] = [
        {
          id: '1',
          name: 'Needs Action',
          color: 'bg-red-100',
          gmailLabelId: 'Label_1'
        },
        {
          id: '2',
          name: 'Investor Email',
          color: 'bg-purple-100',
          gmailLabelId: 'Label_2'
        },
        {
          id: '3',
          name: 'Newsletter',
          color: 'bg-blue-100',
          gmailLabelId: 'Label_3'
        }
      ];
      
      setAvailableLabels(defaultLabels);
      localStorage.setItem('emailLabels', JSON.stringify(defaultLabels));
    }
  }, []);

  const handleLabelClick = (label: Label) => {
    setSelectedLabel(label);
    setIsActionModalOpen(true);
  };

  const handleCreateAutomation = () => {
    if (!selectedLabel || !selectedAction) return;

    const automation: AutomationRule = {
      id: Date.now().toString(),
      label: selectedLabel,
      action: selectedAction as EmailAction,
      enabled: true,
      template: selectedAction === EmailAction.REPLY ? replyTemplate : undefined
    };
    
    // Remove any existing automation for this label
    const filteredAutomations = automations.filter(a => a.label.id !== selectedLabel.id);
    
    const updatedAutomations = [...filteredAutomations, automation];
    setAutomations(updatedAutomations);
    localStorage.setItem('emailAutomations', JSON.stringify(updatedAutomations));
    
    setIsActionModalOpen(false);
    setSelectedLabel(null);
    setSelectedAction('');
  };

  const handleToggleAutomation = (id: string) => {
    const updatedAutomations = automations.map(automation => 
      automation.id === id 
        ? { ...automation, enabled: !automation.enabled }
        : automation
    );
    setAutomations(updatedAutomations);
    localStorage.setItem('emailAutomations', JSON.stringify(updatedAutomations));
  };

  const handleDeleteAutomation = (id: string) => {
    const updatedAutomations = automations.filter(a => a.id !== id);
    setAutomations(updatedAutomations);
    localStorage.setItem('emailAutomations', JSON.stringify(updatedAutomations));
  };

  return (
    <div className="p-6 max-w-7xl mx-auto min-h-screen bg-black text-white">
      <h1 className="text-2xl font-bold mb-8">Email Automations</h1>

      {/* Available Labels */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {availableLabels.map(label => {
          const existingAutomation = automations.find(a => a.label.id === label.id);
          
          return (
            <div 
              key={label.id} 
              className={`bg-zinc-900 p-6 rounded-xl border border-zinc-800 cursor-pointer transition-all
                ${existingAutomation ? 'ring-2 ring-blue-500' : 'hover:border-zinc-700'}`}
              onClick={() => handleLabelClick(label)}
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`${label.color} text-blue-900 px-3 py-1 rounded-full text-sm font-medium`}>
                  {label.name}
                </div>
                {existingAutomation && (
                  <div 
                    className="w-12 h-6 bg-zinc-800 rounded-full relative"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleAutomation(existingAutomation.id);
                    }}
                  >
                    <div className={`w-4 h-4 rounded-full absolute top-1 transition-all 
                      ${existingAutomation.enabled ? 'bg-green-500 right-1' : 'bg-gray-500 left-1'}`}
                    />
                  </div>
                )}
              </div>

              {existingAutomation && (
                <div className="mt-4">
                  <p className="text-sm text-gray-400">Current Automation:</p>
                  <p className="text-gray-200">{existingAutomation.action}</p>
                  {existingAutomation.template && (
                    <pre className="text-xs text-gray-400 mt-2 whitespace-pre-wrap font-mono bg-zinc-800 p-2 rounded">
                      {existingAutomation.template.split('\n').slice(0, 2).join('\n')}...
                    </pre>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Action Selection Modal */}
      {isActionModalOpen && selectedLabel && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-zinc-900 p-6 rounded-xl w-full max-w-md border border-zinc-800">
            <h2 className="text-xl font-bold mb-4">
              Select Action for "{selectedLabel.name}"
            </h2>

            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3">
                <button
                  className={`p-4 rounded-lg border text-left
                    ${selectedAction === EmailAction.REPLY 
                      ? 'bg-blue-500 border-blue-400' 
                      : 'bg-zinc-800 border-zinc-700 hover:border-zinc-600'}`}
                  onClick={() => setSelectedAction(EmailAction.REPLY)}
                >
                  <h3 className="font-medium">Draft a Reply</h3>
                  <p className="text-sm text-gray-400 mt-1">
                    Automatically create a draft reply using AI
                  </p>
                </button>

                <button
                  className={`p-4 rounded-lg border text-left
                    ${selectedAction === EmailAction.MARK_IMPORTANT 
                      ? 'bg-blue-500 border-blue-400' 
                      : 'bg-zinc-800 border-zinc-700 hover:border-zinc-600'}`}
                  onClick={() => setSelectedAction(EmailAction.MARK_IMPORTANT)}
                >
                  <h3 className="font-medium">Mark as Important</h3>
                  <p className="text-sm text-gray-400 mt-1">
                    Add importance flag to matching emails
                  </p>
                </button>
              </div>

              {selectedAction === EmailAction.REPLY && (
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">
                    Response Template
                    <span className="block text-xs text-gray-500 mt-1">
                      Available variables: {'{sender_name}'}, {'{email_subject}'}, {'{ai_response}'}, {'{my_name}'}
                    </span>
                  </label>
                  <textarea 
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-2 text-white h-40 font-mono"
                    value={replyTemplate}
                    onChange={(e) => setReplyTemplate(e.target.value)}
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button 
                onClick={() => {
                  setIsActionModalOpen(false);
                  setSelectedLabel(null);
                  setSelectedAction('');
                }}
                className="px-4 py-2 text-gray-400 hover:text-white"
              >
                Cancel
              </button>
              <button 
                onClick={handleCreateAutomation}
                className="bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded-lg"
                disabled={!selectedAction}
              >
                Save Automation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}