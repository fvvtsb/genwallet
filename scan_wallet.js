const { execSync, spawn } = require('child_process');
const readline = require('readline');
const fs = require('fs');
const path = require('path');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const PROFANITY_DIR = path.join(__dirname, 'profanity2');
const PROFANITY_EXEC = path.join(PROFANITY_DIR, 'profanity2.x64');

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
        console.log("[🚀] Đang kích hoạt GPU để tìm kiếm địa chỉ kết thúc bằng 88888888...\n");
        console.log("-----------------------------------------------------");
        
        // Cấu hình tham số cho profanity2
        const args = [
            '--matching', 'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX88888888',
            '-n',
            '-z', pubKey
        ];

        // Khởi chạy tiến trình đào
        const profanityProcess = spawn(PROFANITY_EXEC, args, { cwd: PROFANITY_DIR, stdio: 'inherit' });

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
}

main();
