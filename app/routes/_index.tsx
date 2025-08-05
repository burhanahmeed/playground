import { Link } from "react-router";

export function meta() {
  return [
    { title: "Time Playground" },
    { name: "description", content: "A collection of time-related tools and utilities" },
  ];
}

export default function Index() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-800 mb-4">
            Time Playground
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            A collection of time-related tools and utilities to help you work with dates, times, and productivity.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Moment.js Playground Card */}
          <Link
            to="/home"
            className="group bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 p-8 border border-gray-200"
          >
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-blue-200 transition-colors">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-2xl font-semibold text-gray-800 mb-3 group-hover:text-blue-600 transition-colors">
                Moment.js Playground
              </h2>
              <p className="text-gray-600 leading-relaxed">
                Interactive code playground for Moment.js API with autocomplete and live execution. 
                Test date manipulations, timezone conversions, and formatting in real-time.
              </p>
              <div className="mt-4 inline-flex items-center text-blue-600 font-medium group-hover:text-blue-700">
                Try it out
                <svg className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </Link>

          {/* Pomodoro Timer Card */}
          <Link
            to="/pomodoro"
            className="group bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 p-8 border border-gray-200"
          >
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-red-200 transition-colors">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-2xl font-semibold text-gray-800 mb-3 group-hover:text-red-600 transition-colors">
                Pomodoro Timer
              </h2>
              <p className="text-gray-600 leading-relaxed">
                A full-featured Pomodoro timer with task management, YouTube music integration, 
                and productivity tracking to help you stay focused and organized.
              </p>
              <div className="mt-4 inline-flex items-center text-red-600 font-medium group-hover:text-red-700">
                Start focusing
                <svg className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </Link>
        </div>

        <div className="text-center mt-12">
          <p className="text-gray-500">
            Built with React Router v7 and Tailwind CSS
          </p>
        </div>
      </div>
    </div>
  );
}
