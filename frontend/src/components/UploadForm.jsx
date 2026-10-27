import { useEffect, useState } from 'react'

const API_URL = 'http://localhost:8000'

// `{ onParsed }` pulls the onParsed prop out of the props object.
// The parent (App) decides what happens with the parsed receipt.
export default function UploadForm({ onParsed }) {
  // Each piece of UI state gets its own useState.
  const [file, setFile] = useState(null)          // the chosen image File
  const [previewUrl, setPreviewUrl] = useState('') // temporary URL to show it
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // When the file changes, make a temporary URL so <img> can display it.
  // The returned function runs before the next change (or on unmount) and
  // frees the old URL so we don't leak memory.
  useEffect(() => {
    if (!file) return
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  async function handleSubmit(event) {
    event.preventDefault() // stop the browser from reloading the page
    if (!file) return

    setLoading(true)
    setError('')

    // FormData builds a multipart/form-data body, the format FastAPI's
    // UploadFile expects. The field name "file" must match the backend.
    const body = new FormData()
    body.append('file', file)

    try {
      // fetch sends an HTTP request and returns a Promise of the response.
      // `await` waits for it without freezing the page.
      const response = await fetch(`${API_URL}/parse`, { method: 'POST', body })

      // fetch only throws on network failures, not on 4xx/5xx statuses,
      // so we check response.ok ourselves.
      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`)
      }

      // .json() reads the body and parses it (also returns a Promise).
      const data = await response.json()
      onParsed(data)
    } catch (err) {
      setError(`Couldn't parse the receipt: ${err.message}`)
    } finally {
      // runs whether the request succeeded or failed
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mb-6 rounded-xl bg-white p-4 shadow-sm">
      <label className="mb-2 block text-sm font-medium text-gray-700">Receipt photo</label>
      <input
        type="file"
        accept="image/*"
        onChange={(e) => setFile(e.target.files[0] ?? null)}
        className="block w-full text-sm text-gray-700 file:mr-3 file:rounded-lg file:border-0 file:bg-gray-100 file:px-4 file:py-2 file:font-medium"
      />

      {file && previewUrl && (
        <img src={previewUrl} alt="Receipt preview" className="mt-4 max-h-80 w-full rounded-lg object-contain" />
      )}

      <button
        type="submit"
        disabled={!file || loading}
        className="mt-4 w-full rounded-lg bg-emerald-700 py-3 font-semibold text-white disabled:opacity-50"
      >
        {loading ? 'Parsing…' : 'Parse receipt'}
      </button>

      {loading && <p className="mt-3 text-sm text-gray-500">Reading your receipt…</p>}
      {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
    </form>
  )
}
