// Money arrives as integer cents; convert to dollars only for display.
function formatDollars(cents) {
  return `$${(cents / 100).toFixed(2)}`
}

// Props: `items` is [{ id, name, price_cents }], `taxCents` is a number.
// ItemList has no state of its own; it just displays what it's given.
export default function ItemList({ items, taxCents }) {
  return (
    <section className="rounded-xl bg-white p-4 shadow-sm">
      <h2 className="mb-3 text-lg font-semibold text-gray-900">Items</h2>
      <ul className="divide-y divide-gray-100">
        {/* .map turns each item into a <li>. React needs a unique `key` per
            row to track it; item.id is unique even when two names match. */}
        {items.map((item) => (
          <li key={item.id} className="flex justify-between gap-4 py-2">
            <span className="text-gray-800">{item.name}</span>
            <span className="tabular-nums text-gray-900">{formatDollars(item.price_cents)}</span>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex justify-between border-t border-gray-200 pt-3 text-gray-600">
        <span>Tax</span>
        <span className="tabular-nums">{formatDollars(taxCents)}</span>
      </div>
    </section>
  )
}
