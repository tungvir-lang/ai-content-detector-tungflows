import { useEffect, useState } from "react";
import { api, type ScheduledPost } from "../api.js";
import { fmtDate } from "../format.js";

function statusClass(s: string): string {
  if (s === "posted") return "pill posted";
  if (s === "failed") return "pill failed";
  if (s === "pending") return "pill pending";
  return "pill";
}

export function Schedule() {
  const [posts, setPosts] = useState<ScheduledPost[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ caption: "", videoUrl: "", when: "" });

  const load = () => api.schedule().then(setPosts).catch((e: unknown) => setError(String(e)));
  useEffect(() => {
    void load();
  }, []);

  const add = async () => {
    const scheduledAt = form.when ? new Date(form.when).getTime() : Date.now();
    await api.addPost({ caption: form.caption, videoUrl: form.videoUrl || undefined, scheduledAt });
    setForm({ caption: "", videoUrl: "", when: "" });
    void load();
  };

  return (
    <>
      <div className="panel">
        <h2>Lên lịch bài đăng mới</h2>
        <div className="form-row">
          <div className="field" style={{ flex: 2 }}>
            <label>Caption</label>
            <input value={form.caption} onChange={(e) => setForm({ ...form, caption: e.target.value })} placeholder="Nội dung bài đăng…" />
          </div>
          <div className="field" style={{ flex: 2 }}>
            <label>URL video (công khai)</label>
            <input value={form.videoUrl} onChange={(e) => setForm({ ...form, videoUrl: e.target.value })} placeholder="https://…/video.mp4" />
          </div>
          <div className="field">
            <label>Thời điểm đăng</label>
            <input type="datetime-local" value={form.when} onChange={(e) => setForm({ ...form, when: e.target.value })} />
          </div>
          <button className="action" onClick={() => void add()}>Thêm vào lịch</button>
        </div>
      </div>

      <div className="panel">
        <h2>Hàng đợi đăng bài</h2>
        {error && <p className="error">{error}</p>}
        {posts.length === 0 ? (
          <p className="empty">Chưa có bài nào trong lịch.</p>
        ) : (
          <table>
            <thead>
              <tr><th>Caption</th><th>Thời điểm</th><th>Trạng thái</th><th></th></tr>
            </thead>
            <tbody>
              {posts.map((p) => (
                <tr key={p.id}>
                  <td>{p.caption}</td>
                  <td>{fmtDate(p.scheduledAt)}</td>
                  <td><span className={statusClass(p.status)}>{p.status}</span>{p.error ? ` — ${p.error}` : ""}</td>
                  <td>
                    {p.status === "pending" && (
                      <button className="ghost" onClick={() => api.cancelPost(p.id).then(load)}>Hủy</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
