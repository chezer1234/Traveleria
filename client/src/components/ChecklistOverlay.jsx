import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getChecklistStatusLocal } from '../lib/queries';

const ITEMS = [
  {
    key: 'hasCountry',
    label: 'Add your first country',
    hint: 'Log somewhere you\'ve been on the Add Countries page',
    link: '/add-countries',
  },
  {
    key: 'hasProvince',
    label: 'Log a province',
    hint: 'Open a country\'s detail page and mark a province as visited',
    link: null,
  },
  {
    key: 'hasCity',
    label: 'Log a city',
    hint: 'Open a country\'s detail page and mark a city as visited',
    link: null,
  },
  {
    key: 'hasSubregion',
    label: 'Claim a subregion',
    hint: 'Visit the Subregions page once you\'ve covered all countries in a region',
    link: '/subregions',
  },
];

export default function ChecklistOverlay({ isOpen, onClose }) {
  const { user, db, dbStatus } = useAuth();
  const [status, setStatus] = useState(null);

  useEffect(() => {
    if (!isOpen || dbStatus !== 'ready' || !db || !user) return;
    getChecklistStatusLocal(db, user.id).then(setStatus).catch(console.error);
  }, [isOpen, db, user?.id, dbStatus]);

  if (!isOpen) return null;

  const completed = status ? Object.values(status).filter(Boolean).length : 0;
  const total = ITEMS.length;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel — anchored near top-left below the nav */}
      <div
        role="dialog"
        aria-label="Explorer checklist"
        className="fixed top-20 left-4 z-50 bg-panel rounded-lg shadow-md border border-hairline w-72 max-w-[calc(100vw-2rem)] p-5"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-display font-bold text-ink">Explorer Checklist</h2>
            <p className="text-xs text-ink-soft mt-0.5">{completed} of {total} completed</p>
          </div>
          <button
            onClick={onClose}
            className="text-ink-soft/70 hover:text-ink p-2 rounded"
            aria-label="Close checklist"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-3">
          {ITEMS.map((item) => {
            const done = status ? !!status[item.key] : false;
            return (
              <div key={item.key} className="flex items-start gap-3">
                <div
                  className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                    done ? 'bg-atlas border-atlas' : 'border-hairline'
                  }`}
                  aria-hidden="true"
                >
                  {done && (
                    <svg className="w-3 h-3 text-paper" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium leading-snug ${done ? 'text-ink-soft/70 line-through' : 'text-ink'}`}>
                    {item.label}
                  </p>
                  {!done && item.hint && (
                    <p className="text-xs text-ink-soft/70 mt-0.5 leading-snug">{item.hint}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {status && completed === total && (
          <p className="mt-4 text-center text-sm text-atlas font-medium">
            All done! Keep exploring.
          </p>
        )}
      </div>
    </>
  );
}
