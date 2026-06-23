import express from 'express';
import cors from 'cors';
import db from './db.js'; // 引入我們剛剛寫好的資料庫連線

const app = express();

// Middleware (中介軟體) 設定
app.use(cors()); // 允許跨網域請求 (讓之後的 Vue 前端可以順利呼叫)
app.use(express.json()); // 解析 JSON 格式的請求
app.use(express.urlencoded({ extended: false }));

// ---------------------------------------------------
// 🚀 API 路由設定區
// ---------------------------------------------------

// 1. 測試伺服器是否正常運作
app.get('/', (req, res) => {
    res.send('逢甲大學教授專長系統 API 伺服器已啟動！');
});

// 2. 取得所有教授清單 (對應你圖一的「教授搜尋」預設畫面)
app.get('/api/professors', (req, res) => {
    // 撰寫 SQL 語法：從 Professors 表中撈取所有資料
    const sql = `SELECT * FROM Professors`;
    
    // 執行 SQL 查詢
    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error(err.message);
            res.status(500).json({ error: '資料庫查詢失敗' });
            return;
        }
        
        // 將撈到的資料以 JSON 格式回傳給前端
        res.json({
            message: "success",
            data: rows
        });
    });
});

// 3. 取得特定領域的教授與專長 (對應圖二：領域搜尋結果頁)
app.get('/api/domains/:domain_name/professors', (req, res) => {
    // 從網址列取得使用者想要查詢的領域名稱
    const domainName = req.params.domain_name;

    // 撰寫 SQL 關聯查詢 (JOIN)
    // 技巧：使用 GROUP_CONCAT 把多個專長用逗號串成一個字串，方便前端顯示
    const sql = `
        SELECT 
            p.id, 
            p.name, 
            p.department,
            GROUP_CONCAT(e.keyword) AS expertises
        FROM Professors p
        JOIN Professor_Expertise_Map m ON p.id = m.prof_id
        JOIN Expertises e ON m.exp_id = e.id
        WHERE e.domain_name = ?
        GROUP BY p.id
    `;

    // 執行查詢，? 的地方會自動被替換成 domainName，這樣寫可以防止 SQL 注入攻擊
    db.all(sql, [domainName], (err, rows) => {
        if (err) {
            console.error('查詢特定領域失敗:', err.message);
            res.status(500).json({ error: '資料庫查詢失敗' });
            return;
        }

        // 為了讓前端更好處理資料，我們把字串格式的 expertises 切割回陣列 (Array)
        const formattedRows = rows.map(row => ({
            ...row,
            expertises: row.expertises ? row.expertises.split(',') : []
        }));

        res.json({
            message: "success",
            domain: domainName,
            data: formattedRows
        });
    });
});

// 4. 取得單一教授詳細資訊與專長分類 (對應圖三：教授個人專屬頁)
app.get('/api/professors/:id', (req, res) => {
    const profId = req.params.id;

    // 第一步：先抓取教授的基本資料
    const profSql = `SELECT * FROM Professors WHERE id = ?`;
    
    db.get(profSql, [profId], (err, professor) => {
        if (err) {
            return res.status(500).json({ error: '資料庫查詢失敗' });
        }
        if (!professor) {
            return res.status(404).json({ error: '找不到該名教授' });
        }

        // 第二步：抓取該名教授的所有專長與對應領域
        const expSql = `
            SELECT e.keyword, e.domain_name 
            FROM Expertises e
            JOIN Professor_Expertise_Map m ON e.id = m.exp_id
            WHERE m.prof_id = ?
        `;

        db.all(expSql, [profId], (err, expertises) => {
            if (err) {
                return res.status(500).json({ error: '專長查詢失敗' });
            }

            // 第三步：將專長依照 domain_name 進行分組歸類
            // 目標格式: { "軟體工程學群": ["人工智慧", "機器學習"], "電腦系統學群": ["影像處理"] }
            const groupedExpertises = {};
            
            expertises.forEach(exp => {
                // 如果該領域還沒建立陣列，就先初始化一個空陣列
                if (!groupedExpertises[exp.domain_name]) {
                    groupedExpertises[exp.domain_name] = [];
                }
                // 將專長推入對應的領域陣列中
                groupedExpertises[exp.domain_name].push(exp.keyword);
            });

            // 將整理好的資料合併回傳
            res.json({
                message: "success",
                data: {
                    id: professor.id,
                    name: professor.name,
                    department: professor.department,
                    expertises: groupedExpertises
                }
            });
        });
    });
});

// ---------------------------------------------------

export default app;