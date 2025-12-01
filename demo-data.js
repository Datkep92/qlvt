// demo-data.js - Tạo dữ liệu demo đơn giản
class DemoData {
    constructor() {
        this.demoDevices = this.createDemoDevices();
    }

    createDemoDevices() {
        return [
            {
                serial_number: "DEMO-001",
                ten_thiet_bi: "Máy theo dõi bệnh nhân",
                model: "Monitor A100",
                nha_san_xuat: "GE Healthcare",
                nam_san_xuat: 2022,
                so_luong: 2,
                nguyen_gia: 50000000,
                thanh_tien: 100000000,
                phan_loai: "THIẾT BỊ Y TẾ",
                don_vi_tinh: "cái",
                phong_ban: "Khoa Cấp cứu",
                tinh_trang: "Đang sử dụng",
                ghi_chu: "Thiết bị demo 1",
                nhan_vien_ql: "Nguyễn Văn A",
                ngay_nhap: "2023-01-15"
            },
            {
                serial_number: "DEMO-002",
                ten_thiet_bi: "Máy thở",
                model: "Ventilator B200",
                nha_san_xuat: "Philips",
                nam_san_xuat: 2021,
                so_luong: 1,
                nguyen_gia: 150000000,
                thanh_tien: 150000000,
                phan_loai: "THIẾT BỊ Y TẾ",
                don_vi_tinh: "cái",
                phong_ban: "Khoa Hồi sức",
                tinh_trang: "Đang sử dụng",
                ghi_chu: "Thiết bị demo 2",
                nhan_vien_ql: "Trần Thị B",
                ngay_nhap: "2023-02-20"
            },
            {
                serial_number: "DEMO-003",
                ten_thiet_bi: "Máy siêu âm",
                model: "Ultrasound C300",
                nha_san_xuat: "Siemens",
                nam_san_xuat: 2020,
                so_luong: 1,
                nguyen_gia: 800000000,
                thanh_tien: 800000000,
                phan_loai: "THIẾT BỊ CHẨN ĐOÁN",
                don_vi_tinh: "cái",
                phong_ban: "Khoa Chẩn đoán hình ảnh",
                tinh_trang: "Bảo trì",
                ghi_chu: "Thiết bị demo 3 - Đang bảo trì",
                nhan_vien_ql: "Lê Văn C",
                ngay_nhap: "2022-11-10"
            },
            {
                serial_number: "DEMO-004",
                ten_thiet_bi: "Máy X-quang",
                model: "X-ray D400",
                nha_san_xuat: "GE Healthcare",
                nam_san_xuat: 2019,
                so_luong: 1,
                nguyen_gia: 1200000000,
                thanh_tien: 1200000000,
                phan_loai: "THIẾT BỊ CHẨN ĐOÁN",
                don_vi_tinh: "cái",
                phong_ban: "Khoa Chẩn đoán hình ảnh",
                tinh_trang: "Đang sử dụng",
                ghi_chu: "Thiết bị demo 4",
                nhan_vien_ql: "Phạm Thị D",
                ngay_nhap: "2020-05-30"
            },
            {
                serial_number: "DEMO-005",
                ten_thiet_bi: "Máy điện tim",
                model: "ECG E500",
                nha_san_xuat: "Mindray",
                nam_san_xuat: 2023,
                so_luong: 3,
                nguyen_gia: 25000000,
                thanh_tien: 75000000,
                phan_loai: "THIẾT BỊ Y TẾ",
                don_vi_tinh: "cái",
                phong_ban: "Khoa Nội",
                tinh_trang: "Mới",
                ghi_chu: "Thiết bị demo 5 - Mới nhập",
                nhan_vien_ql: "Hoàng Văn E",
                ngay_nhap: "2023-12-01"
            }
        ];
    }

    async loadDemoData() {
        try {
            console.log('📥 Đang tạo dữ liệu demo...');
            
            let successCount = 0;
            let errorCount = 0;
            
            for (const device of this.demoDevices) {
                try {
                    // Thêm các trường bắt buộc
                    const fullDevice = {
                        ...device,
                        vi_tri: "Khoa Gây mê hồi sức",
                        don_vi: "",
                        is_active: true,
                        parent_id: null,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    };
                    
                    await medicalDB.addDevice(fullDevice);
                    successCount++;
                    
                    console.log(`✅ Đã thêm: ${device.ten_thiet_bi}`);
                    
                } catch (error) {
                    errorCount++;
                    console.error(`❌ Lỗi thêm ${device.ten_thiet_bi}:`, error.message);
                }
            }
            
            // Thêm log activity
            await medicalDB.addActivity({
                type: 'demo',
                description: `Tạo ${successCount} thiết bị demo`,
                user: 'Hệ thống'
            });
            
            console.log(`✅ Hoàn thành! Đã tạo ${successCount} thiết bị demo`);
            console.log(`❌ Lỗi: ${errorCount}`);
            
            return {
                success: successCount,
                errors: errorCount,
                total: this.demoDevices.length
            };
            
        } catch (error) {
            console.error('❌ Lỗi tạo dữ liệu demo:', error);
            throw error;
        }
    }
}

// Thêm nút vào giao diện
function addDemoButton() {
    if (document.getElementById('demo-btn')) return;
    
    const btn = document.createElement('button');
    btn.id = 'demo-btn';
    btn.innerHTML = '🎭 Tạo Demo';
    btn.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        padding: 10px 20px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-weight: bold;
        z-index: 999;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    `;
    
    btn.onclick = async () => {
        if (!confirm('Tạo 5 thiết bị demo?\nDữ liệu sẽ được thêm vào cơ sở dữ liệu.')) return;
        
        btn.disabled = true;
        btn.innerHTML = '⏳ Đang tạo...';
        
        try {
            const demo = new DemoData();
            const result = await demo.loadDemoData();
            
            alert(`✅ Đã tạo ${result.success} thiết bị demo thành công!`);
            
            // Refresh nếu đang ở trang danh sách
            if (window.refreshDeviceList) {
                window.refreshDeviceList();
            }
            
        } catch (error) {
            alert('❌ Lỗi khi tạo demo: ' + error.message);
        } finally {
            btn.disabled = false;
            btn.innerHTML = '🎭 Tạo Demo';
        }
    };
    
    document.body.appendChild(btn);
}

// Tự động thêm nút khi trang load
if (typeof medicalDB !== 'undefined') {
    setTimeout(addDemoButton, 1000);
}

// Export
window.DemoData = DemoData;
window.addDemoButton = addDemoButton;