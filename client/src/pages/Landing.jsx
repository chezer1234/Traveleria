import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';

export default function Landing() {
  const { user } = useAuth();

  if (user) return <Navigate to="/dashboard" replace />;

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 sm:py-20 text-center">
      <h1 className="text-3xl sm:text-5xl font-bold text-gray-900 mb-4 sm:mb-6">
        Track Your Travels, Earn Points
      </h1>
      <p className="text-lg sm:text-xl text-gray-600 mb-8 sm:mb-10 max-w-2xl mx-auto">
        Log the countries and cities you've visited. Earn Travel Points based on how far you've gone
        and how deeply you've explored. Compare your score with friends.
      </p>
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
        <Link
          to="/register"
          className="bg-indigo-600 text-white px-8 py-3 rounded-lg text-lg font-medium hover:bg-indigo-700"
        >
          Get Started
        </Link>
        <Link
          to="/login"
          className="border border-gray-300 text-gray-700 px-8 py-3 rounded-lg text-lg font-medium hover:bg-gray-50"
        >
          Log in
        </Link>
      </div>

      <div className="mt-12 sm:mt-20 grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 text-left">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="text-3xl mb-3">+</div>
          <h3 className="font-semibold text-gray-900 mb-2">Log Countries</h3>
          <p className="text-gray-600 text-sm">
            Search and add the countries you've visited. Each one earns you baseline Travel Points.
          </p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="text-3xl mb-3">%</div>
          <h3 className="font-semibold text-gray-900 mb-2">Explore Cities</h3>
          <p className="text-gray-600 text-sm">
            Log cities within each country to increase your exploration percentage and earn bonus points.
          </p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="text-3xl mb-3">#</div>
          <h3 className="font-semibold text-gray-900 mb-2">Compare Scores</h3>
          <p className="text-gray-600 text-sm">
            See how your Travel Points stack up against other explorers on the leaderboard.
          </p>
        </div>
      </div>
    </div>
  );
}
