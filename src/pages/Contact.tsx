import {useEffect, useState} from 'react';
import {Clock, Facebook, Mail, MapPin, Phone} from 'lucide-react';
import {api} from '../lib/api';

export default function Contact() {
  const [clinic, setClinic] = useState<any>({});
  useEffect(() => {
    api.get('/public/clinic').then(setClinic).catch(() => {});
  }, []);
  return (
    <div className="max-w-4xl mx-auto px-4 py-14">
      <h1 className="text-3xl font-extrabold text-gray-800 mb-2 text-center">Liên hệ với MeHeal</h1>
      <p className="text-gray-500 text-center mb-10">Chúng tôi luôn sẵn sàng lắng nghe và đồng hành cùng bạn.</p>

      <div className="grid md:grid-cols-2 gap-4 mb-8">
        <a href={`tel:${(clinic.hotline || '0523175175').replace(/\./g, '')}`} className="card p-6 flex items-center gap-4 hover:border-brand-300">
          <div className="w-12 h-12 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center">
            <Phone />
          </div>
          <div>
            <div className="text-xs text-gray-400">Hotline</div>
            <div className="font-bold text-lg text-gray-800">{clinic.hotline || '0523.175.175'}</div>
          </div>
        </a>
        <a href={clinic.facebook || 'https://www.facebook.com/phongkhammeheal'} target="_blank" className="card p-6 flex items-center gap-4 hover:border-brand-300">
          <div className="w-12 h-12 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center">
            <Facebook />
          </div>
          <div>
            <div className="text-xs text-gray-400">Fanpage</div>
            <div className="font-bold text-lg text-gray-800">Phòng khám MeHeal</div>
          </div>
        </a>
        <div className="card p-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center">
            <Mail />
          </div>
          <div>
            <div className="text-xs text-gray-400">Email</div>
            <div className="font-bold text-gray-800">{clinic.email || 'lienhe@meheal.vn'}</div>
          </div>
        </div>
        <div className="card p-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center">
            <Clock />
          </div>
          <div>
            <div className="text-xs text-gray-400">Giờ làm việc</div>
            <div className="font-bold text-gray-800">{clinic.workingHours || 'Thứ 2 - CN: 7:30 - 17:30'}</div>
          </div>
        </div>
      </div>

      <h2 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
        <MapPin className="text-brand-500" /> Hệ thống cơ sở
      </h2>
      <div className="grid md:grid-cols-2 gap-4">
        {(clinic.facilities || []).map((f: any) => (
          <div key={f.code} className="card p-5">
            <div className="font-bold text-brand-600">{f.name}</div>
            <div className="text-gray-600 text-sm mt-1">{f.address}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
