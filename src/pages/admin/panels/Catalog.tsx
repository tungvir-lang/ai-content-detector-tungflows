import {useEffect, useState} from 'react';
import {Plus, X} from 'lucide-react';
import {api, money} from '../../../lib/api';

export default function Catalog() {
  const [tab, setTab] = useState<'doctors' | 'services'>('doctors');
  return (
    <div>
      <h1 className="text-2xl font-extrabold text-gray-800 mb-1">Danh mục</h1>
      <p className="text-gray-400 text-sm mb-5">Quản lý đội ngũ bác sỹ và bảng dịch vụ của phòng khám.</p>
      <div className="flex gap-2 mb-5">
        <button className={`btn ${tab === 'doctors' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab('doctors')}>
          Bác sỹ
        </button>
        <button className={`btn ${tab === 'services' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab('services')}>
          Dịch vụ
        </button>
      </div>
      {tab === 'doctors' ? <Doctors /> : <Services />}
    </div>
  );
}

function Doctors() {
  const [rows, setRows] = useState<any[]>([]);
  const [edit, setEdit] = useState<any>(null);
  const load = () => api.aget('/admin/doctors').then(setRows);
  useEffect(() => {
    load();
  }, []);

  async function save() {
    if (edit.id) await api.aput(`/admin/doctors/${edit.id}`, edit);
    else await api.apost('/admin/doctors', edit);
    setEdit(null);
    load();
  }

  return (
    <div>
      <button className="btn btn-primary mb-4" onClick={() => setEdit({name: '', title: '', specialty: '', room: '', facility: 'CS1', bio: '', active: true})}>
        <Plus size={16} /> Thêm bác sỹ
      </button>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {rows.map((d) => (
          <div key={d.id} className={`card p-5 ${!d.active ? 'opacity-50' : ''}`}>
            <div className="flex justify-between">
              <h3 className="font-bold">{d.name}</h3>
              <span className="badge bg-brand-50 text-brand-600">{d.room} · {d.facility}</span>
            </div>
            <p className="text-xs text-brand-600 font-semibold">{d.title}</p>
            <p className="text-sm text-gray-500 mt-1">{d.specialty}</p>
            <div className="flex gap-2 mt-3">
              <button className="btn btn-ghost !py-1 !px-3 text-xs" onClick={() => setEdit({...d, active: !!d.active})}>
                Sửa
              </button>
              {d.active ? (
                <button className="btn !py-1 !px-3 text-xs text-red-500 hover:bg-red-50" onClick={() => api.adel(`/admin/doctors/${d.id}`).then(load)}>
                  Ẩn
                </button>
              ) : (
                <button className="btn !py-1 !px-3 text-xs text-green-600 hover:bg-green-50" onClick={() => api.aput(`/admin/doctors/${d.id}`, {...d, active: true}).then(load)}>
                  Hiện lại
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {edit && (
        <Modal title={edit.id ? 'Sửa bác sỹ' : 'Thêm bác sỹ'} onClose={() => setEdit(null)}>
          {[
            ['name', 'Họ tên'],
            ['title', 'Chức danh'],
            ['specialty', 'Chuyên môn'],
            ['room', 'Phòng'],
          ].map(([k, l]) => (
            <div key={k} className="mb-3">
              <label className="label">{l}</label>
              <input className="input" value={edit[k] || ''} onChange={(e) => setEdit({...edit, [k]: e.target.value})} />
            </div>
          ))}
          <label className="label">Cơ sở</label>
          <select className="input mb-3" value={edit.facility} onChange={(e) => setEdit({...edit, facility: e.target.value})}>
            <option value="CS1">CS1 - Hưng Yên</option>
            <option value="CS2">CS2 - Ninh Bình</option>
          </select>
          <label className="label">Giới thiệu</label>
          <textarea className="input mb-4" rows={2} value={edit.bio || ''} onChange={(e) => setEdit({...edit, bio: e.target.value})} />
          <button className="btn btn-primary w-full" onClick={save} disabled={!edit.name}>
            Lưu
          </button>
        </Modal>
      )}
    </div>
  );
}

function Services() {
  const [rows, setRows] = useState<any[]>([]);
  const [edit, setEdit] = useState<any>(null);
  const load = () => api.aget('/admin/services').then(setRows);
  useEffect(() => {
    load();
  }, []);

  async function save() {
    if (edit.id) await api.aput(`/admin/services/${edit.id}`, edit);
    else await api.apost('/admin/services', edit);
    setEdit(null);
    load();
  }

  return (
    <div>
      <button className="btn btn-primary mb-4" onClick={() => setEdit({name: '', description: '', duration: 30, price: 0, active: true})}>
        <Plus size={16} /> Thêm dịch vụ
      </button>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm min-w-[600px]">
          <thead className="bg-brand-50 text-gray-600">
            <tr>
              <th className="text-left p-3">Dịch vụ</th>
              <th className="text-left p-3">Mô tả</th>
              <th className="text-center p-3">Thời lượng</th>
              <th className="text-right p-3">Giá</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => (
              <tr key={s.id} className={`border-t border-brand-50 ${!s.active ? 'opacity-50' : ''}`}>
                <td className="p-3 font-semibold">{s.name}</td>
                <td className="p-3 text-gray-500">{s.description}</td>
                <td className="p-3 text-center">{s.duration}'</td>
                <td className="p-3 text-right font-bold text-brand-600">{money(s.price)}</td>
                <td className="p-3 text-right">
                  <button className="btn btn-ghost !py-1 !px-3 text-xs" onClick={() => setEdit({...s, active: !!s.active})}>
                    Sửa
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {edit && (
        <Modal title={edit.id ? 'Sửa dịch vụ' : 'Thêm dịch vụ'} onClose={() => setEdit(null)}>
          <label className="label">Tên dịch vụ</label>
          <input className="input mb-3" value={edit.name} onChange={(e) => setEdit({...edit, name: e.target.value})} />
          <label className="label">Mô tả</label>
          <textarea className="input mb-3" rows={2} value={edit.description || ''} onChange={(e) => setEdit({...edit, description: e.target.value})} />
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className="label">Thời lượng (phút)</label>
              <input className="input" type="number" value={edit.duration} onChange={(e) => setEdit({...edit, duration: Number(e.target.value)})} />
            </div>
            <div>
              <label className="label">Giá (VNĐ)</label>
              <input className="input" type="number" value={edit.price} onChange={(e) => setEdit({...edit, price: Number(e.target.value)})} />
            </div>
          </div>
          <button className="btn btn-primary w-full" onClick={save} disabled={!edit.name}>
            Lưu
          </button>
        </Modal>
      )}
    </div>
  );
}

function Modal({title, children, onClose}: {title: string; children: React.ReactNode; onClose: () => void}) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-800">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
