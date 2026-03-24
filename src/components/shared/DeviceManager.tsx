import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { 
  Monitor, Desktop, 
  MapPin, Clock, SignOut, DeviceMobile, ChartLine, Phone
} from '@phosphor-icons/react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

interface DeviceSession {
  sessionID: number;
  deviceInfo: string;
  ipAddress: string;
  isActive: boolean;
  loginAt: string;
  lastActiveAt: string;
  isCurrentDevice: boolean;
}

export function DeviceManager() {
  const [devices, setDevices] = useState<DeviceSession[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const token = localStorage.getItem('auth_token') || '';

  const fetchDevices = async () => {
    try {
      const res = await api.get<any>('/devices', token);
      setDevices(res.result || []);
    } catch (err) {
      console.error("Fetch devices error", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, []);

  const handleKick = async (id: number) => {
    if (!confirm("Bạn có chắc muốn đăng xuất thiết bị này không?")) return;
    try {
      await api.authDelete(`/devices/${id}`, token);
      fetchDevices();
    } catch (err) {
      alert("Lỗi khi đăng xuất thiết bị");
    }
  };

  const getDeviceIcon = (info: string) => {
    const low = info.toLowerCase();
    if (low.includes('mobile') || low.includes('iphone') || low.includes('android')) return <Phone size={32} />;
    if (low.includes('tablet') || low.includes('ipad')) return <DeviceMobile size={32} />;
    if (low.includes('macintosh') || low.includes('windows')) return <Desktop size={32} />;
    return <Monitor size={32} />;
  };

  return (
    <div className="p-6 space-y-6 animate-in slide-in-from-bottom-5 duration-500">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-[#FF6B4A]/10 flex items-center justify-center text-[#FF6B4A]">
          <Monitor size={28} weight="fill" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-[#1A1A1A]">Thiết bị đã đăng nhập</h1>
          <p className="text-gray-500 text-sm font-semibold italic">Tối đa 3 thiết bị đồng thời. Thiết bị cũ nhất sẽ bị kick nếu vượt quá.</p>
        </div>
      </div>

      {loading ? (
          <div className="flex justify-center p-20">
            <div className="w-10 h-10 border-4 border-[#FF6B4A] border-t-transparent rounded-full animate-spin"></div>
          </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {devices.map((device: DeviceSession) => (
            <div 
              key={device.sessionID}
              className={`bg-white rounded-3xl p-6 border-2 transition-all relative group overflow-hidden ${
                device.isCurrentDevice 
                ? 'border-[#FF6B4A] shadow-xl shadow-orange-100/50 after:absolute after:top-0 after:left-0 after:w-full after:h-1 after:bg-[#FF6B4A]' 
                : 'border-white shadow-lg shadow-gray-200/40 hover:border-gray-100 hover:shadow-xl'
              }`}
            >
              <div className="flex items-start justify-between mb-6">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
                  device.isCurrentDevice ? 'bg-[#FF6B4A] text-white' : 'bg-gray-100 text-gray-500'
                }`}>
                  {getDeviceIcon(device.deviceInfo)}
                </div>
                {device.isCurrentDevice && (
                  <span className="bg-[#FF6B4A] text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider">Hiện tại</span>
                )}
              </div>

              <div className="space-y-4">
                <h3 className="font-extrabold text-lg text-[#1A1A1A] truncate">{device.deviceInfo}</h3>
                
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2.5 text-gray-500 text-xs font-bold">
                    <MapPin size={16} className="shrink-0" />
                    <span className="truncate">{device.ipAddress}</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-gray-500 text-xs font-bold">
                    <Clock size={16} className="shrink-0" />
                    <span>Đăng nhập: {format(new Date(device.loginAt), 'dd/MM/yyyy HH:mm', { locale: vi })}</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-gray-400 text-[11px] font-bold">
                    <ChartLine size={16} className="shrink-0" />
                    <span>HĐ cuối: {format(new Date(device.lastActiveAt), 'HH:mm', { locale: vi })}</span>
                  </div>
                </div>

                {!device.isCurrentDevice && (
                  <button 
                    onClick={() => handleKick(device.sessionID)}
                    className="w-full mt-4 flex items-center justify-center gap-2 py-3 rounded-2xl bg-red-50 text-red-500 font-extrabold text-sm hover:bg-red-500 hover:text-white transition-all duration-300 border border-red-100"
                  >
                    <SignOut size={18} weight="bold" />
                    Đăng xuất thiết bị
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {devices.length === 0 && !loading && (
        <div className="bg-white rounded-3xl p-16 text-center border-2 border-dashed border-gray-100">
           <Monitor size={64} className="mx-auto text-gray-200 mb-4" />
           <p className="text-gray-400 font-extrabold text-lg">Không tìm thấy thiết bị nào</p>
        </div>
      )}
    </div>
  );
}
