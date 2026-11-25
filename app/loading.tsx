export default function Loading() {
  return (
    <div className="min-h-screen bg-gray-50 px-4 pt-16 pb-24">
      <div className="h-8 w-40 bg-gray-200 rounded-xl animate-pulse mb-6" />
      <div className="flex flex-col gap-4">
        <div className="h-36 bg-white rounded-3xl animate-pulse border border-gray-100" />
        <div className="h-36 bg-white rounded-3xl animate-pulse border border-gray-100" />
        <div className="h-36 bg-white rounded-3xl animate-pulse border border-gray-100" />
      </div>
    </div>
  )
}
