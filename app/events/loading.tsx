export default function Loading() {
  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <div className="bg-white border-b border-gray-100 px-4 pt-12 pb-3">
        <div className="h-8 w-32 bg-gray-200 rounded-xl animate-pulse mb-3" />
        <div className="h-8 bg-gray-100 rounded-xl animate-pulse mb-3" />
        <div className="flex gap-2">
          {[1,2,3,4].map(i => <div key={i} className="h-8 w-16 bg-gray-100 rounded-2xl animate-pulse" />)}
        </div>
      </div>
      <div className="flex-1 px-4 pt-4 flex flex-col gap-4">
        {[1,2,3].map(i => <div key={i} className="h-40 bg-white rounded-3xl animate-pulse border border-gray-100" />)}
      </div>
    </div>
  )
}
