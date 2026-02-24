import React from 'react';
import { Check } from 'lucide-react';

const StepIndicator = ({ currentStep, totalSteps = 3, labels = [] }) => {
    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0',
            padding: '1rem 0',
        }}>
            {Array.from({ length: totalSteps }, (_, i) => {
                const step = i + 1;
                const isCompleted = step < currentStep;
                const isActive = step === currentStep;

                return (
                    <React.Fragment key={step}>
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '0.375rem',
                        }}>
                            <div style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.875rem',
                                fontWeight: '600',
                                transition: 'all 0.3s ease',
                                background: isCompleted
                                    ? 'var(--primary-gradient)'
                                    : isActive
                                        ? 'var(--primary-gradient)'
                                        : 'var(--border-light)',
                                color: isCompleted || isActive ? 'var(--white)' : 'var(--text-light)',
                                boxShadow: isActive ? 'var(--shadow-red)' : 'none',
                            }}>
                                {isCompleted ? <Check size={16} strokeWidth={3} /> : step}
                            </div>
                            {labels[i] && (
                                <span style={{
                                    fontSize: '0.7rem',
                                    fontWeight: isActive ? '600' : '400',
                                    color: isActive ? 'var(--primary-red)' : 'var(--text-light)',
                                    whiteSpace: 'nowrap',
                                }}>
                                    {labels[i]}
                                </span>
                            )}
                        </div>
                        {step < totalSteps && (
                            <div style={{
                                flex: 1,
                                height: '2px',
                                maxWidth: '60px',
                                background: isCompleted
                                    ? 'var(--primary-red)'
                                    : 'var(--border-light)',
                                marginBottom: labels.length ? '1.25rem' : '0',
                                transition: 'background 0.3s ease',
                            }} />
                        )}
                    </React.Fragment>
                );
            })}
        </div>
    );
};

export default StepIndicator;
