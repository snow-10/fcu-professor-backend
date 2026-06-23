import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

// 在 ES Module 中，沒有內建的 __dirname，所以我們需要自己轉換出來
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 設定資料庫檔案的絕對路徑 (指向 db/professors.db)
const dbPath = path.join(__dirname, 'db', 'professors.db');

// 建立並開啟資料庫連線
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ 資料庫連線失敗：', err.message);
    } else {
        console.log('✅ 成功連線至 SQLite 資料庫 (professors.db)');
    }
});

// 匯出 db 實例，讓其他檔案 (如 app.js 或 routes) 可以使用
export default db;