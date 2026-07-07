// Search + optional sort toggle for long lists (issue #53) — the Add
// Countries search pattern, extracted. Controlled component: each page owns
// its own search/sort state and filtering, this just renders the controls.
export default function ListControls({ search, onSearch, placeholder, sort, onSort, sortOptions }) {
  return (
    <div className="flex flex-col sm:flex-row gap-2 sm:items-center mb-4">
      <input
        type="search"
        value={search}
        onChange={(e) => onSearch(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="flex-1 border border-hairline bg-panel rounded-md px-4 py-2.5 text-sm text-ink focus:outline-none focus:border-compass"
      />
      {sortOptions && (
        <div className="flex gap-1 bg-panel border border-hairline rounded-md p-1 self-start" role="group" aria-label="Sort order">
          {sortOptions.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => onSort(key)}
              className={`px-3 py-2 rounded smallcaps transition-colors ${
                sort === key ? 'bg-ink text-paper' : 'text-ink-soft hover:text-ink'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
