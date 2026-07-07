import cors from 'cors';
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import {config, ROOT, APP_INFO} from './config.ts';
import {requireLicense} from './auth.ts';
import './db.ts'; // khởi tạo & seed DB
import {adminRouter} from './routes/admin.ts';
import {aiRouter} from './routes/aiRoutes.ts';
import {publicRouter} from './routes/public.ts';
import {reportRouter} from './routes/reportRoutes.ts';

const app = express();
app.use(cors());
app.use(express.json({limit: '2mb'}));

// Thông tin sản phẩm / kiểm tra sức khỏe
app.get('/api/health', (_req, res) => res.json({ok: true, product: APP_INFO}));

// Quản trị + bản quyền (không khóa: cần để kích hoạt & đăng nhập)
app.use('/api/admin', adminRouter);

// Nghiệp vụ công khai + AI + báo cáo -> yêu cầu đã kích hoạt bản quyền
app.use('/api/public', requireLicense, publicRouter);
app.use('/api/ai', requireLicense, aiRouter);
app.use('/api/reports', requireLicense, reportRouter);

// Phục vụ frontend đã build (bản thương mại cài chạy ngay)
const distDir = path.join(ROOT, 'dist');
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(distDir, 'index.html'));
  });
}

app.listen(config.port, () => {
  console.log('\n============================================================');
  console.log(`  ${APP_INFO.product} v${APP_INFO.version} (${APP_INFO.edition})`);
  console.log(`  ${APP_INFO.copyright}`);
  console.log('------------------------------------------------------------');
  console.log(`  API server:  http://localhost:${config.port}/api`);
  if (fs.existsSync(distDir)) console.log(`  Ứng dụng:    http://localhost:${config.port}`);
  else console.log(`  (Dev) Web:   http://localhost:3000  (chạy: npm run dev)`);
  console.log('============================================================\n');
});
