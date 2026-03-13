import React, { useState, useEffect } from 'react';
import { CURRENT_ENVIRONMENT, API_CONFIG } from '../config/apiConfig';

const EnvironmentSwitcher = () => {
  const [currentEnv, setCurrentEnv] = useState(CURRENT_ENVIRONMENT);
  const [isOpen, setIsOpen] = useState(false);

  const environments = Object.keys(API_CONFIG);

  const handleEnvironmentChange = (env) => {
    // Store in localStorage
    localStorage.setItem('preferred_environment', env);
    // Reload page to apply new environment
    window.location.reload();
  };

  useEffect(() => {
    // Check for preferred environment in localStorage
    const preferredEnv = localStorage.getItem('preferred_environment');
    if (preferredEnv && preferredEnv !== CURRENT_ENVIRONMENT) {
      console.log(`Preferred environment (${preferredEnv}) differs from current (${CURRENT_ENVIRONMENT})`);
    }
  }, [CURRENT_ENVIRONMENT]);

  const getEnvironmentColor = (env) => {
    switch (env) {
      case 'localhost': return 'bg-blue-100 text-blue-800';
      case 'development': return 'bg-green-100 text-green-800';
      case 'raspberryPi': return 'bg-orange-100 text-orange-800';
      case 'production': return 'bg-red-100 text-red-800';
      case 'mobile': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getEnvironmentIcon = (env) => {
    switch (env) {
      case 'localhost': return 'Computer';
      case 'development': return 'Render';
      case 'raspberryPi': return 'RPI';
      case 'production': return 'world';
      case 'mobile': return 'phone';
      default: return '?';
    }
  };

  return (
    <div className="fixed top-4 right-4 z-50">
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium ${getEnvironmentColor(currentEnv)} hover:opacity-80 transition-opacity`}
        >
          <span>{getEnvironmentIcon(currentEnv)}</span>
          <span>{currentEnv}</span>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {isOpen && (
          <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200">
            <div className="p-2">
              <div className="text-xs font-medium text-gray-500 mb-2">Switch Environment:</div>
              {environments.map((env) => (
                <button
                  key={env}
                  onClick={() => handleEnvironmentChange(env)}
                  className={`w-full text-left px-3 py-2 rounded text-sm flex items-center space-x-2 hover:bg-gray-100 ${
                    env === currentEnv ? 'bg-gray-50 font-medium' : ''
                  }`}
                >
                  <span>{getEnvironmentIcon(env)}</span>
                  <span>{env}</span>
                  {env === currentEnv && (
                    <svg className="w-4 h-4 ml-auto text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
            
            <div className="border-t border-gray-200 p-2">
              <div className="text-xs text-gray-500">
                <div className="font-medium mb-1">Current URLs:</div>
                <div className="space-y-1">
                  <div>API: {API_CONFIG[currentEnv].baseUrl}</div>
                  <div>Socket: {API_CONFIG[currentEnv].socketUrl}</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EnvironmentSwitcher;
