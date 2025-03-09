'use client';

import React, { useState, useEffect } from 'react';
import { Label, EmailAction } from '@/types/email';

interface AutomationRule {
  id: string;
  label: Label;
  trigger: 'new_email' | 'label_added';
  action: EmailAction;
  enabled: boolean;
}

export default function AutomationsPage() {
  const [automations, setAutomations] = useState<AutomationRule[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newAutomation, setNewAutomation] = useState({
    trigger: '',
    label: '',
    action: ''
  });
  
  // Load automations from localStorage on mount
  useEffect(() => {
    const savedAutomations = localStorage.getItem('emailAutomations');
    if (savedAutomations) {
      setAutomations(JSON.parse(savedAutomations));
    }
  }, []);
  
  const handleCreateAutomation = () => {
    const automation: AutomationRule = {
      id: Date.now().toString(),
      trigger: newAutomation.trigger as 'new_email' | 'label_added',
      label: JSON.parse(newAutomation.label),
      action: newAutomation.action as EmailAction,
      enabled: true
    };
    
    const updatedAutomations = [...automations, automation];
    setAutomations(updatedAutomations);
    localStorage.setItem('emailAutomations', JSON.stringify(updatedAutomations));
    setIsModalOpen(false);
    setNewAutomation({ trigger: '', label: '', action: '' });
  };

  const handleDeleteAutomation = (id: string) => {
    const updatedAutomations = automations.filter(a => a.id !== id);
    setAutomations(updatedAutomations);
    localStorage.setItem('emailAutomations', JSON.stringify(updatedAutomations));
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

  return (
    <div className="p-6 max-w-7xl mx-auto min-h-screen bg-black text-white">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">Email Automations</h1>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
          Create Automation
        </button>
      </div>

      {/* Existing Automations */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {automations.map(automation => (
          <div key={automation.id} className="bg-zinc-900 p-6 rounded-xl border border-zinc-800">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="bg-blue-900 text-blue-100 px-3 py-1 rounded-full text-sm font-medium">
                  {automation.label.name}
                </div>
                <div 
                  className="w-12 h-6 bg-zinc-800 rounded-full relative cursor-pointer"
                  onClick={() => handleToggleAutomation(automation.id)}
                >
                  <div className={`w-4 h-4 rounded-full absolute top-1 transition-all ${automation.enabled ? 'bg-green-500 right-1' : 'bg-gray-500 left-1'}`}></div>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-gray-400">Trigger</h3>
                <p className="text-gray-200">When email is labeled as "{automation.label.name}"</p>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-gray-400">Action</h3>
                <p className="text-gray-200">{automation.action}</p>
              </div>
            </div>

            <div className="mt-6 flex gap-2">
              <button className="text-gray-400 hover:text-gray-200">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                </svg>
              </button>
              <button 
                onClick={() => handleDeleteAutomation(automation.id)}
                className="text-gray-400 hover:text-red-500"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Create Automation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-zinc-900 p-6 rounded-xl w-full max-w-md border border-zinc-800">
            <h2 className="text-xl font-bold mb-4">Create Automation</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Trigger</label>
                <select 
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-2 text-white"
                  value={newAutomation.trigger}
                  onChange={(e) => setNewAutomation({...newAutomation, trigger: e.target.value})}
                >
                  <option value="">Select a trigger</option>
                  <option value="label_added">When label is added</option>
                  <option value="new_email">When new email arrives</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Label</label>
                <select 
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-2 text-white"
                  value={newAutomation.label}
                  onChange={(e) => setNewAutomation({...newAutomation, label: e.target.value})}
                >
                  <option value="">Select a label</option>
                  <option value='{"id":"1","name":"Needs Action","color":"bg-blue-100"}'>Needs Action</option>
                  <option value='{"id":"2","name":"Investor Email","color":"bg-purple-100"}'>Investor Email</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Action</label>
                <select 
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-2 text-white"
                  value={newAutomation.action}
                  onChange={(e) => setNewAutomation({...newAutomation, action: e.target.value})}
                >
                  <option value="">Select an action</option>
                  <option value={EmailAction.REPLY}>Auto Draft Reply</option>
                  <option value={EmailAction.ARCHIVE}>Archive</option>
                  <option value={EmailAction.FLAG}>Flag</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-gray-400 hover:text-white"
              >
                Cancel
              </button>
              <button 
                onClick={handleCreateAutomation}
                className="bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded-lg"
                disabled={!newAutomation.trigger || !newAutomation.label || !newAutomation.action}
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Available Options Section */}
      <div className="bg-zinc-900 rounded-xl p-6 border border-zinc-800">
        <h2 className="text-lg font-semibold mb-4">Available Triggers</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-zinc-800 p-4 rounded-lg border border-zinc-700">
            <h3 className="font-medium">New Email Received</h3>
            <p className="text-sm text-gray-400 mt-1">Trigger when a new email arrives in your inbox</p>
          </div>
          <div className="bg-zinc-800 p-4 rounded-lg border border-zinc-700">
            <h3 className="font-medium">Label Added</h3>
            <p className="text-sm text-gray-400 mt-1">Trigger when a specific label is added to an email</p>
          </div>
          <div className="bg-zinc-800 p-4 rounded-lg border border-zinc-700">
            <h3 className="font-medium">Time-based</h3>
            <p className="text-sm text-gray-400 mt-1">Trigger at specific times or after delays</p>
          </div>
        </div>

        <h2 className="text-lg font-semibold mb-4 mt-8">Available Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-zinc-800 p-4 rounded-lg border border-zinc-700">
            <h3 className="font-medium">Auto Draft Reply</h3>
            <p className="text-sm text-gray-400 mt-1">AI generates and saves a draft reply</p>
          </div>
          <div className="bg-zinc-800 p-4 rounded-lg border border-zinc-700">
            <h3 className="font-medium">Add Label</h3>
            <p className="text-sm text-gray-400 mt-1">Automatically add a specific label</p>
          </div>
          <div className="bg-zinc-800 p-4 rounded-lg border border-zinc-700">
            <h3 className="font-medium">Send Notification</h3>
            <p className="text-sm text-gray-400 mt-1">Get notified when automation runs</p>
          </div>
        </div>
      </div>
    </div>
  );
}