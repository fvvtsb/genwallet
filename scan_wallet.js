const { execSync, spawn } = require('child_process');
const readline = require('readline');
const fs = require('fs');
const path = require('path');
const https = require('https');

// ==========================================
// CẤU HÌNH NHẬN THÔNG BÁO QUA TELEGRAM BOT
// ==========================================
const TELEGRAM_BOT_TOKEN = ''; // Ví dụ: '123456789:ABCdefGHIjklMNOpqrSTUvwxYZ'
const TELEGRAM_CHAT_ID = '';   // Ví dụ: '123456789'

function sendTelegramNotification(message) {
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return;
    
    const data = JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: message, parse_mode: 'Markdown' });
    const options = {
        hostname: 'api.telegram.org',
        path: `/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': data.length }
    };
    
    const req = https.request(options, (res) => {});
    req.on('error', (e) => console.error("Lỗi gửi Telegram:", e));
    req.write(data);
    req.end();
}

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const PROFANITY_DIR = path.join(__dirname, 'profanity2');
const PROFANITY_EXEC = path.join(PROFANITY_DIR, 'profanity2.x64');

// Hàm tự động tính toán thông số tối ưu dựa trên VRAM của GPU NVIDIA
function getOptimalGPUConfig() {
    let optimalI = 16384; // Mặc định
    let optimalW = 64;    // Mặc định
    try {
        // Lấy dung lượng VRAM của GPU đầu tiên (tính bằng MB)
        const vramStr = execSync('nvidia-smi --query-gpu=memory.total --format=csv,noheader,nounits', { encoding: 'utf8' }).trim();
        const vramMB = parseInt(vramStr.split('\n')[0]);
        if (!isNaN(vramMB)) {
            // Công thức: 1.7GB VRAM tương đương với Inverse Multiple 32768
            // Dành 2GB cho OS, dùng 80% dung lượng còn lại cho Profanity2
            const usableVRAM = (vramMB - 2000) * 0.8;
            if (usableVRAM > 0) {
                const calculatedI = Math.floor((usableVRAM / 1700) * 32768);
                // Giới hạn max là 262144 (~13.6GB VRAM) để tránh tràn bộ nhớ
                optimalI = Math.min(262144, Math.max(16384, calculatedI));
                
                // Làm tròn về bội số của 16384
                optimalI = Math.floor(optimalI / 16384) * 16384;
            }
            optimalW = 256; // Tối ưu mặc định cho NVIDIA
        }
    } catch (e) {
        // Bỏ qua nếu không phải NVIDIA hoặc bị lỗi lệnh
    }
    return { I: optimalI.toString(), w: optimalW.toString() };
}

async function main() {
    console.log("=====================================================");
    console.log("   Săn Ví BEP20 Đuôi 88888888 Bằng Public Key (GPU)");
    console.log("=====================================================\n");
    
    // Kiểm tra và cài đặt công cụ profanity2 nếu chưa có
    if (!fs.existsSync(PROFANITY_EXEC)) {
        console.log("[*] Không tìm thấy Profanity2. Đang tiến hành cài đặt và biên dịch...");
        try {
            // Cài đặt các thư viện cần thiết cho việc biên dịch C++ và OpenCL
            console.log("[*] Đang cài đặt thư viện hệ thống và cấu hình OpenCL (cần quyền root/sudo)...");
            execSync('apt-get update && apt-get install -y ocl-icd-opencl-dev gcc g++ make git', { stdio: 'inherit' });
            execSync('mkdir -p /etc/OpenCL/vendors && echo "libnvidia-opencl.so.1" > /etc/OpenCL/vendors/nvidia.icd', { stdio: 'inherit' });
            
            if (!fs.existsSync(PROFANITY_DIR)) {
                console.log("[*] Đang clone mã nguồn từ 1inch/profanity2...");
                execSync('git clone https://github.com/1inch/profanity2.git', { stdio: 'inherit' });
            }
            
            console.log("[*] Đang biên dịch mã nguồn...");
            execSync('cd profanity2 && make', { stdio: 'inherit' });
            
            console.log("[✅] Đã cài đặt xong Profanity2.\n");
        } catch (error) {
            console.error("❌ Lỗi trong quá trình cài đặt profanity2:", error.message);
            console.log("Hãy đảm bảo bạn đang chạy script này với quyền root (hoặc dùng sudo).");
            process.exit(1);
        }
    } else {
        console.log("[*] Đang cập nhật mã nguồn C++...");
        try {
            execSync('cd profanity2 && make', { stdio: 'inherit' });
        } catch (e) {}
        console.log("[✅] Profanity2 đã sẵn sàng.\n");
    }

    rl.question("Hãy nhập Seed Public Key của bạn (128 ký tự Hex, KHÔNG có tiền tố 0x04):\n> ", (pubKey) => {
        pubKey = pubKey.trim();
        
        // Kiểm tra tính hợp lệ của Public Key
        if (pubKey.length !== 128 || !/^[0-9a-fA-F]+$/.test(pubKey)) {
            console.error("\n❌ CẢNH BÁO: Public Key không hợp lệ! Nó phải dài chính xác 128 ký tự Hex (0-9, a-f).");
            process.exit(1);
        }
        
        console.log("\n[✅] Đã nhận Public Key hợp lệ.");
        
        rl.question("\nHãy nhập chuỗi đuôi ví bạn muốn tìm (VD: 88888888 hoặc 999999999):\n> ", (suffix) => {
            suffix = suffix.trim().toLowerCase();
            
            if (suffix.length === 0 || suffix.length > 40 || !/^[0-9a-f]+$/.test(suffix)) {
                console.error("\n❌ CẢNH BÁO: Chuỗi đuôi không hợp lệ! Vui lòng nhập các ký tự Hex (0-9, a-f) và độ dài <= 40.");
                process.exit(1);
            }

            const pattern = 'X'.repeat(40 - suffix.length) + suffix;
            const minScore = Math.ceil(suffix.length / 2);

            // Tự động đo lường và cấu hình GPU
            const gpuConfig = getOptimalGPUConfig();
            console.log(`\n[🚀] Đang kích hoạt GPU tìm đuôi '${suffix}' (Tự động phân bổ VRAM: -I ${gpuConfig.I}, -w ${gpuConfig.w})...`);
            console.log("-----------------------------------------------------");
            
            // Cấu hình tham số cho profanity2
            const args = [
                '--matching', pattern,
                '-n',
                '-z', pubKey,
                '-I', gpuConfig.I, 
                '-w', gpuConfig.w  
            ];

        // Khởi chạy tiến trình đào (Chặn stdout để đọc kết quả)
        const profanityProcess = spawn(PROFANITY_EXEC, args, { 
            cwd: PROFANITY_DIR, 
            stdio: ['inherit', 'pipe', 'inherit'],
            env: { ...process.env, MIN_SCORE: minScore.toString() }
        });

        // Bắt đầu đọc kết quả in ra từ C++
        profanityProcess.stdout.on('data', (data) => {
            const output = data.toString();
            process.stdout.write(output); // Vẫn in ra terminal như bình thường
            
            // Nếu phát hiện ví được in ra, gửi qua Telegram
            if (output.includes('Private:')) {
                const lines = output.split('\n');
                for (const line of lines) {
                    if (line.includes('Private:') && line.includes('Address:')) {
                        sendTelegramNotification(`🎉 **Đã đào được ví đuôi ${suffix}!**\n\n\`${line.trim()}\``);
                    }
                }
            }
        });

        profanityProcess.on('close', (code) => {
            console.log(`\n[*] Tiến trình kết thúc (Mã: ${code})`);
            console.log("-----------------------------------------------------");
            console.log("Nếu bạn đã tìm thấy Modifier, hãy mang nó về máy cá nhân (offline) để thực hiện phép toán cộng với Seed Private Key ban đầu.");
            rl.close();
        });
        
        // Bắt lỗi nếu không chạy được
        profanityProcess.on('error', (err) => {
             console.error("\n❌ Lỗi khi khởi chạy Profanity2:", err.message);
             rl.close();
        });
        });
    });
}

main();
