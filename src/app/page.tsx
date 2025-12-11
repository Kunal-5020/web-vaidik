export default function HomePage() {
  return (
    <div className="min-h-screen from-yellow-50 to-orange-50 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-yellow-500 mb-4">Vaidik</h1>
        <p className="text-xl text-gray-700 mb-8">Connect with Expert Astrologers</p>
        <div className="space-x-4">
          <a
            href="/astrologers-chat"
            className="bg-yellow-400 text-black px-8 py-3 rounded-lg font-semibold hover:bg-yellow-500 transition-colors"
          >
            Chat Now
          </a>
          <a
            href="/register-astrologer"
            className="border-2 border-yellow-400 text-yellow-600 px-8 py-3 rounded-lg font-semibold hover:bg-yellow-50 transition-colors"
          >
            Register Astrologer
          </a>
        </div>
      </div>
    </div>
  );
}
