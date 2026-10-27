import { useState } from 'react'
import UploadForm from './components/UploadForm.jsx'
import ItemList from './components/ItemList.jsx'

export default function App() {
  // useState gives a component memory that survives re-renders.
  // It returns [currentValue, setterFunction]. Calling the setter stores the
  // new value AND tells React to re-render this component with it.
  // `receipt` starts as null (nothing parsed yet) and later holds
  // { items: [...], tax_cents: 123 } from the backend.
  const [receipt, setReceipt] = useState(null)

  return (
    <main className="mx-auto max-w-md px-4 py-6">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Receipt Splitter</h1>

      {/* Props are how a parent passes data down to a child component.
          Here we hand UploadForm a function; it calls onParsed(data) when
          the backend responds, which updates the state up here in App. */}
      <UploadForm onParsed={setReceipt} />

      {/* `&&` renders the right side only when the left side is truthy,
          so ItemList appears only after a receipt has been parsed. */}
      {receipt && <ItemList items={receipt.items} taxCents={receipt.tax_cents} />}
    </main>
  )
}
