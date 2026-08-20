const fs = require('fs');
let code = fs.readFileSync('frontend/src/components/ui.tsx', 'utf8');

const oldSelect = \export function Select({
  value,
  onChange,
  options,
  className,
  ariaLabel,
}: {
  value: string
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void
  options: { label: string; value: string }[]
  className?: string
  /** Accessible name for a select with no visible <label> - required wherever
   *  the control sits in a repeating row (UI-SPEC A 7). */
  ariaLabel?: string
}) {
  return (
    <div className={cx("relative", className)}>
      <select
        value={value}
        onChange={onChange}
        aria-label={ariaLabel}
        className="w-full appearance-none rounded-xl border border-white/10 bg-onyx px-3.5 py-2.5 pr-10 text-[14px] text-offwhite focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/40"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-graytext-mid">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  )
}\;

const newSelect = \export function Select({
  value,
  onChange,
  options,
  className,
  ariaLabel,
}: {
  value: string
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void
  options: { label: string; value: string }[]
  className?: string
  ariaLabel?: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const selected = options.find((o) => o.value === value)

  return (
    <div className={cx('relative', className)} ref={ref}>
      <button
        type="button"
        aria-label={ariaLabel}
        onClick={() => setOpen(!open)}
        className={cx(
          'flex w-full items-center justify-between rounded-xl border border-white/10 bg-onyx px-3.5 py-2.5 text-left text-[14px] transition-colors focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/40',
          !selected ? 'text-graytext-mid' : 'text-offwhite'
        )}
      >
        <span className="truncate">{selected ? selected.label : 'Select...'}</span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={cx('shrink-0 text-graytext-mid transition-transform', open && 'rotate-180')}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-2 max-h-60 w-full overflow-y-auto rounded-xl border border-white/10 bg-onyx/95 p-1.5 shadow-[0_8px_32px_rgba(0,0,0,0.5)] backdrop-blur-xl animate-fade-up scrollbar-hide">
          {options.length === 0 ? (
            <div className="px-3 py-2 text-[13px] text-graytext-mid">No options</div>
          ) : (
            options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange({ target: { value: opt.value } } as React.ChangeEvent<HTMLSelectElement>)
                  setOpen(false)
                }}
                className={cx(
                  'block w-full truncate rounded-lg px-3 py-2 text-left text-[13px] font-medium transition-colors',
                  value === opt.value ? 'bg-teal/20 text-teal' : 'text-graytext-mid hover:bg-white/5 hover:text-offwhite'
                )}
              >
                {opt.label}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}\;

const replaced = code.replace(oldSelect, newSelect);
if (replaced === code) {
  console.log("Could not find oldSelect exact match. Let's do it with replace_file_content instead.");
} else {
  fs.writeFileSync('frontend/src/components/ui.tsx', replaced);
  console.log("Replaced Select component successfully.");
}
