import { LogOut, BookOpen, User as UserIcon, GraduationCap, Settings } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { User } from '../types/auth';
import { useEffect, useState } from 'react';

export function Dashboard() {
  const { user, logout } = useAuth();
  const [isLoaded, setIsLoaded] = useState(false);
  const userData = user as User;

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      <nav className="bg-white shadow-md sticky top-0 z-50 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-green-500 rounded-lg flex items-center justify-center shadow-lg">
                <BookOpen className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">Slothub</span>
            </div>
            <div className="flex items-center gap-4">
              <button
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Cài đặt"
              >
                <Settings className="w-6 h-6 text-gray-700" />
              </button>
              <button
                onClick={logout}
                className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-red-50 hover:text-red-600 rounded-lg transition-all font-medium"
              >
                <LogOut className="w-5 h-5" />
                <span>Đăng xuất</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className={`transform transition-all duration-1000 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="bg-white rounded-2xl shadow-2xl overflow-hidden mb-8">
            <div className="h-32 bg-gradient-to-r from-blue-500 via-green-500 to-blue-600"></div>

            <div className="px-8 pb-8">
              <div className="flex items-start gap-6 -mt-16 mb-8 relative z-10">
                <div className="w-32 h-32 bg-gradient-to-br from-blue-100 to-green-100 rounded-2xl shadow-xl flex items-center justify-center border-4 border-white">
                  <UserIcon className="w-16 h-16 text-blue-600" />
                </div>
                <div className="pt-4">
                  <h1 className="text-4xl font-bold text-gray-900">Chào mừng, {userData.name}!</h1>
                  <p className="text-gray-600 mt-2">
                    Vai trò: <span className="font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
                      {userData.role === 'teacher' ? 'Giáo viên' : 'Học sinh'}
                    </span>
                  </p>
                  <p className="text-gray-600 mt-1">
                    Email: <span className="font-medium text-gray-900">{userData.email}</span>
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 my-8">
                <div className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border-2 border-blue-200 hover:shadow-lg transition-all hover:-translate-y-1">
                  <BookOpen className="w-8 h-8 text-blue-600 mb-3" />
                  <h3 className="font-bold text-gray-900">Nội dung</h3>
                  <p className="text-sm text-gray-600 mt-1">Truy cập tất cả bài giảng và tài liệu</p>
                </div>
                <div className="p-6 bg-gradient-to-br from-green-50 to-green-100 rounded-xl border-2 border-green-200 hover:shadow-lg transition-all hover:-translate-y-1">
                  <GraduationCap className="w-8 h-8 text-green-600 mb-3" />
                  <h3 className="font-bold text-gray-900">Khóa học</h3>
                  <p className="text-sm text-gray-600 mt-1">Theo dõi tiến trình học tập của bạn</p>
                </div>
                <div className="p-6 bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl border-2 border-amber-200 hover:shadow-lg transition-all hover:-translate-y-1">
                  <Settings className="w-8 h-8 text-amber-600 mb-3" />
                  <h3 className="font-bold text-gray-900">Cài đặt</h3>
                  <p className="text-sm text-gray-600 mt-1">Quản lý tài khoản và tùy chỉnh</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-2xl p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
              <span className="w-1 h-8 bg-gradient-to-b from-blue-600 to-green-600 rounded"></span>
              {userData.role === 'teacher' ? 'Bài giảng của bạn' : 'Khóa học của bạn'}
            </h2>
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-12 text-center border-2 border-dashed border-gray-300 hover:border-gray-400 transition-all">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gray-200 rounded-full mb-4 animate-pulse">
                <BookOpen className="w-10 h-10 text-gray-500" />
              </div>
              <p className="text-lg text-gray-600 font-medium">
                {userData.role === 'teacher'
                  ? 'Bạn có thể bắt đầu đăng bài giảng tại đây'
                  : 'Các khóa học của bạn sẽ hiển thị ở đây'}
              </p>
              <p className="text-sm text-gray-500 mt-2">
                Hãy chờ đợi các bài giảng và khóa học sắp tới
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
