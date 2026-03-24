import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { 
  Users, ChartBar, ShieldCheck, Monitor, MapPin, 
  UserMinus, CheckCircle, Warning, Clock, Trash, ChartLine
} from '@phosphor-icons/react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

interface ActiveUser {
  userID: number;
  username: string;
  fullName: string;
  roleName: string;
  deviceInfo: string;
  ipAddress: string;
  lastActiveAt: string;
  loginAt: string;
  activeDeviceCount: number;
  recentActivityCount: number;
  status: string;
}

interface Violation {
  violationID: number;
  username: string;
  fullName: string;
  roleName: string;
  violationType: string;
  description: string;
  action: string;
  bannedUntil: string | null;
  isResolved: boolean;
  createdAt: string;
}

export function AdminActivityMonitor() {
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);
  const [violations, setViolations] = useState<Violation[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const token = localStorage.getItem('auth_token') || '';

  const fetchData = async () => {
    try {
      const activeRes = await api.get<any>('/monitoring/active-users', token);
      const violationsRes = await api.get<any>('/violations', token);
      
      setActiveUsers(activeRes.result || []);
      setViolations(violationsRes.result || []);
    } catch (err) {
      console.error("Fetch monitor error", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000); // Poll every 10s
    return () => clearInterval(interval);
  }, []);

  const handleKickUser = async (username: string) => {
    if (!confirm(`Bạn có chắc muốn kick người dùng ${username}?`)) return;
    try {
      // Find a session ID for this user or implement kick-by-username
      // For now, assume we'd have a specific session to kick
      await api.authPost(`/monitoring/kick/${activeUsers.find(u => u.username === username)?.userID}`, {}, token);
      fetchData();
    } catch (err) {
      alert("Lỗi khi kick user");
    }
  };

  const handleResolve = async (id: number, action: 'UNBAN' | 'PERMANENT_BAN') => {
    const note = prompt("Nhập lý do/ghi chú:");
    if (note === null) return;
    
    try {
      await api.authPost(`/violations/${id}/resolve`, { action, note }, token);
      fetchData();
    } catch (err) {
      alert("Lỗi khi xử lý vi phạm");
    }
  };

  const handleDeleteViolation = async (id: number) => {
    if (!confirm("Bạn có chắc muốn xóa bản ghi vi phạm này?")) return;
    try {
      await api.authDelete(`/violations/${id}`, token);
      fetchData();
    } catch (err) {
      alert("Lỗi khi xóa vi phạm");
    }
  };

  return (
    <div className="p-6 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-[#1A1A1A] flex items-center gap-2">
            <ChartBar className="text-[#FF6B4A]" size={32} />
            Giám sát hệ thống
          </h1>
          <p className="text-gray-500 text-sm font-semibold">Theo dõi trạng thái hoạt động và xử lý vi phạm</p>
        </div>
        <button 
          onClick={fetchData}
          className="p-2 rounded-xl bg-white shadow-sm border border-gray-100 hover:bg-gray-50 transition-colors"
        >
          <ChartLine className="text-[#FF6B4A]" size={20} />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Active Users Section */}
        <section className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden flex flex-col">
          <div className="p-5 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
            <h2 className="flex items-center gap-2 font-extrabold text-[#1a1a1a]">
              <Users size={20} className="text-blue-500" />
              Người dùng đang hoạt động ({activeUsers.length})
            </h2>
          </div>
          <div className="flex-1 overflow-auto max-h-[500px]">
            {activeUsers.length === 0 ? (
              <div className="p-8 text-center text-gray-400 font-semibold italic">Không có người dùng nào đang hoạt động</div>
            ) : (
              <div className="divide-y divide-gray-50">
                {activeUsers.map((u) => (
                  <div key={u.username} className="p-4 hover:bg-gray-50 transition-colors flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                        {u.fullName[0].toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-extrabold text-[#1a1a1a]">{u.fullName}</p>
                          <span className="text-[10px] text-gray-400 font-bold uppercase">{u.username}</span>
                        </div>
                        <div className="flex items-center gap-3 text-[10px] text-gray-500 font-bold uppercase mt-1">
                          <span className={u.roleName === 'ADMIN' ? 'text-purple-600' : u.roleName === 'TEACHER' ? 'text-blue-600' : 'text-green-600'}>
                            {u.roleName}
                          </span>
                                <span className="flex items-center gap-1 font-bold text-blue-500">
                                  <Monitor size={12} /> {u.activeDeviceCount} thiết bị
                                </span>
                          <span className="flex items-center gap-1"><MapPin size={12} /> {u.ipAddress}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-right">
                      <div className="hidden sm:block">
                        <p className="text-[10px] font-bold text-gray-400 mb-1">REQ (30s)</p>
                        <span className={`text-xs font-extrabold px-2 py-0.5 rounded-full ${u.recentActivityCount > 20 ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'}`}>
                          {u.recentActivityCount}
                        </span>
                      </div>
                      {u.roleName !== 'ADMIN' && (
                        <button 
                          onClick={() => handleKickUser(u.username)}
                          className="p-2 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
                          title="Kick user"
                        >
                          <UserMinus size={18} weight="bold" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Violations Section */}
        <section className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden flex flex-col">
          <div className="p-5 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
            <h2 className="flex items-center gap-2 font-extrabold text-[#1a1a1a]">
              <ShieldCheck size={20} className="text-[#FF6B4A]" />
              Lịch sử vi phạm ({violations.length})
            </h2>
          </div>
          <div className="flex-1 overflow-auto max-h-[500px]">
            {violations.length === 0 ? (
              <div className="p-8 text-center text-gray-400 font-semibold italic">Chưa có bản ghi vi phạm nào</div>
            ) : (
              <div className="divide-y divide-gray-50">
                {violations.map((v) => (
                  <div key={v.violationID} className={`p-4 transition-colors ${!v.isResolved ? 'bg-amber-50/30' : ''}`}>
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-extrabold text-[#1a1a1a]">{v.fullName}</p>
                        <span className="text-[10px] text-gray-400 font-bold uppercase">{v.username}</span>
                      </div>
                      <div className="flex gap-2 items-center">
                        <span className="text-[10px] font-extrabold text-gray-400">
                          {format(new Date(v.createdAt), 'HH:mm dd/MM/yyyy', { locale: vi })}
                        </span>
                        <button 
                          onClick={() => handleDeleteViolation(v.violationID)}
                          className="p-1.5 rounded-lg bg-gray-50 text-gray-400 hover:bg-red-50 hover:text-red-500 transition-all border border-transparent hover:border-red-100"
                          title="Xóa lịch sử"
                        >
                          <Trash size={14} />
                        </button>
                      </div>
                    </div>
                    
                    <div className="bg-white p-2.5 rounded-xl border border-gray-100 mb-3 shadow-sm">
                      <p className="text-xs font-bold text-[#FF6B4A] mb-1 flex items-center gap-1">
                        <Warning size={14} weight="fill" /> {v.violationType}
                      </p>
                      <p className="text-xs text-gray-600 leading-relaxed font-semibold">{v.description}</p>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                         <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md ${
                           v.action === 'TEMP_BAN_30M' ? 'bg-amber-100 text-amber-600' : 'bg-red-100 text-red-600'
                         }`}>
                           {v.action === 'TEMP_BAN_30M' ? 'KHOÁ 30P' : 'CẢNH CÁO/KHÁC'}
                         </span>
                         {!v.isResolved && v.bannedUntil && (
                           <span className="text-[10px] text-amber-500 font-bold flex items-center gap-1">
                             <Clock size={12} /> Hết hạn: {format(new Date(v.bannedUntil), 'HH:mm')}
                           </span>
                         )}
                         {v.isResolved && (
                            <span className="text-[10px] text-green-500 font-bold flex items-center gap-1 bg-green-50 px-2 py-0.5 rounded-md">
                              <CheckCircle size={12} weight="fill" /> ĐÃ XỬ LÝ
                            </span>
                         )}
                      </div>
                      
                      {!v.isResolved && (
                        <div className="flex gap-2">
                          <button 
                            onClick={() => handleResolve(v.violationID, 'UNBAN')}
                            className="bg-green-500 text-white text-[10px] font-extrabold px-3 py-1.5 rounded-lg hover:bg-green-600 transition-colors shadow-sm shadow-green-200"
                          >
                            MỞ KHÓA
                          </button>
                          <button 
                            onClick={() => handleResolve(v.violationID, 'PERMANENT_BAN')}
                            className="bg-red-500 text-white text-[10px] font-extrabold px-3 py-1.5 rounded-lg hover:bg-red-600 transition-colors shadow-sm shadow-red-200"
                          >
                            KHÓA VV
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
