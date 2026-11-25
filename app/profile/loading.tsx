export default function Loading() {
  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="h-48 bg-gray-200 animate-pulse" />
      <div className="px-4 -mt-10 mb-4">
        <div className="w-20 h-20 rounded-full bg-gray-300 animate-pulse border-4 border-white" />
      </div>
      <div className="px-4 flex flex-col gap-3">
        <div className="h-6 w-36 bg-gray-200 rounded-xl animate-pulse" />
        <div className="h-4 w-48 bg-gray-100 rounded-xl animate-pulse" />
        <div className="h-24 bg-white rounded-3xl animate-pulse border border-gray-100 mt-2" />
        <div className="h-24 bg-white rounded-3xl animate-pulse border border-gray-100" />
      </div>
    </div>
  )
}
