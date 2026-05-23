import { useNavigate } from 'react-router-dom'

export default function NotFound() {
  const navigate = useNavigate()

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 text-center px-4">
      <h1 className="text-9xl font-bold text-purple-500">404</h1>
      <h2 className="text-2xl font-semibold text-gray-700 mt-4">
        Página não encontrada
      </h2>
      <p className="text-gray-500 mt-2 mb-8">
        O link que você acessou não existe ou foi removido.
      </p>
      <button
        onClick={() => navigate('/')}
        className="bg-purple-600 text-white px-6 py-3 rounded-xl hover:bg-purple-700 transition"
      >
        Voltar para o Início
      </button>
    </div>
  )
}
