import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">
        404 - Strona nie znaleziona
      </h2>
      <p className="text-gray-600 mb-8">
        Przepraszamy, ale strona której szukasz nie istnieje.
      </p>
      <Link
        href="/"
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
      >
        Wróć na stronę główną
      </Link>
    </div>
  );
}
