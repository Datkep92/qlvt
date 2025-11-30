class MedicalEquipmentDB {
    constructor() {
        this.dbName = 'MedicalEquipmentDB';
        this.version = 6; // Tăng version để tạo lại stores
        this.db = null;
        this.initialized = false;
        this.initPromise = this.init();
    }

    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);

            request.onerror = () => reject(request.error);
            
            request.onsuccess = () => {
                this.db = request.result;
                this.initialized = true;
                console.log('✅ Database initialized successfully');
                this.initializeSampleData().then(() => resolve(this.db));
            };

            request.onupgradeneeded = (event) => {
                console.log('🔄 Database upgrade needed');
                const db = event.target.result;
                this.createAllStores(db); // LUÔN tạo stores khi upgrade
            };
        });
    }

    createAllStores(db) {
        // Xóa tất cả stores cũ nếu có
        const storeNames = ['devices', 'maintenance', 'activities', 'departments', 'units', 'staff'];
        storeNames.forEach(storeName => {
            if (db.objectStoreNames.contains(storeName)) {
                db.deleteObjectStore(storeName);
            }
        });

        const devicesStore = db.createObjectStore('devices', { 
        keyPath: 'id', 
        autoIncrement: true 
    });
    devicesStore.createIndex('serial_number', 'serial_number', { unique: true });
    devicesStore.createIndex('ten_thiet_bi', 'ten_thiet_bi');
    devicesStore.createIndex('tinh_trang', 'tinh_trang');
    devicesStore.createIndex('phong_ban', 'phong_ban');
    devicesStore.createIndex('thanh_tien', 'thanh_tien'); // THÊM INDEX MỚI
    console.log('✅ Created devices store with thanh_tien field');

        const maintenanceStore = db.createObjectStore('maintenance', {
            keyPath: 'id',
            autoIncrement: true
        });
        maintenanceStore.createIndex('device_id', 'device_id');
        console.log('✅ Created maintenance store');

        const activitiesStore = db.createObjectStore('activities', {
            keyPath: 'id',
            autoIncrement: true
        });
        activitiesStore.createIndex('timestamp', 'timestamp');
        console.log('✅ Created activities store');

        const departmentsStore = db.createObjectStore('departments', {
            keyPath: 'id',
            autoIncrement: true
        });
        departmentsStore.createIndex('ten_phong', 'ten_phong', { unique: true });
        console.log('✅ Created departments store');

        const unitsStore = db.createObjectStore('units', {
            keyPath: 'id',
            autoIncrement: true
        });
        unitsStore.createIndex('ten_don_vi', 'ten_don_vi', { unique: true });
        console.log('✅ Created units store');

        const staffStore = db.createObjectStore('staff', {
            keyPath: 'id',
            autoIncrement: true
        });
        staffStore.createIndex('ten_nhan_vien', 'ten_nhan_vien');
        console.log('✅ Created staff store');
    }

    async ensureInitialized() {
        if (!this.initialized) {
            await this.initPromise;
        }
        return this.db;
    }

    // Generic CRUD operations
    async addRecord(storeName, record) {
        await this.ensureInitialized();
        const transaction = this.db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        
        if (storeName === 'devices') {
            record.created_at = new Date().toISOString();
            record.updated_at = new Date().toISOString();
        }
        
        return new Promise((resolve, reject) => {
            const request = store.add(record);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getAllRecords(storeName) {
        await this.ensureInitialized();
        const transaction = this.db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        
        return new Promise((resolve, reject) => {
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });
    }

    async updateRecord(storeName, id, updates) {
        await this.ensureInitialized();
        const transaction = this.db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        
        return new Promise(async (resolve, reject) => {
            const getRequest = store.get(id);
            getRequest.onsuccess = () => {
                const record = getRequest.result;
                if (record) {
                    Object.assign(record, updates);
                    if (storeName === 'devices') {
                        record.updated_at = new Date().toISOString();
                    }
                    
                    const updateRequest = store.put(record);
                    updateRequest.onsuccess = () => resolve(updateRequest.result);
                    updateRequest.onerror = () => reject(updateRequest.error);
                } else {
                    reject(new Error('Record not found'));
                }
            };
            getRequest.onerror = () => reject(getRequest.error);
        });
    }

    async deleteRecord(storeName, id) {
        await this.ensureInitialized();
        const transaction = this.db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        
        return new Promise((resolve, reject) => {
            const request = store.delete(id);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // Device-specific methods
    async addDevice(device) {
        return this.addRecord('devices', device);
    }

    async getAllDevices() {
        return this.getAllRecords('devices');
    }

    async updateDevice(id, updates) {
        return this.updateRecord('devices', id, updates);
    }

    async deleteDevice(id) {
        return this.deleteRecord('devices', id);
    }

    async getDevice(id) {
        await this.ensureInitialized();
        const transaction = this.db.transaction(['devices'], 'readonly');
        const store = transaction.objectStore('devices');
        
        return new Promise((resolve, reject) => {
            const request = store.get(id);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // Reference data methods
    async getAllDepartments() { 
        try {
            return await this.getAllRecords('departments');
        } catch (error) {
            console.warn('Error loading departments:', error);
            return [];
        }
    }
    
    async getAllUnits() { 
        try {
            return await this.getAllRecords('units');
        } catch (error) {
            console.warn('Error loading units:', error);
            return [];
        }
    }
    
    async getAllStaff() { 
        try {
            return await this.getAllRecords('staff');
        } catch (error) {
            console.warn('Error loading staff:', error);
            return [];
        }
    }

    async addDepartment(dept) { 
        return this.addRecord('departments', dept);
    }
    
    async addUnit(unit) { 
        return this.addRecord('units', unit);
    }
    
    async addStaff(staff) { 
        return this.addRecord('staff', staff);
    }

    // Activities
    async addActivity(activity) {
        activity.timestamp = new Date().toISOString();
        return this.addRecord('activities', activity);
    }

    async getRecentActivities(limit = 10) {
        try {
            const activities = await this.getAllRecords('activities');
            return activities
                .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                .slice(0, limit);
        } catch (error) {
            console.warn('Error loading activities:', error);
            return [];
        }
    }

    // Import/Export
    async importDevicesFromData(data) {
        const devices = this.transformExcelData(data);
        const results = { success: 0, errors: 0, errorsList: [] };

        for (const device of devices) {
            try {
                await this.addDevice(device);
                results.success++;
                
                await this.addActivity({
                    type: 'import',
                    description: `Import thiết bị: ${device.ten_thiet_bi}`,
                    user: 'Hệ thống'
                });
            } catch (error) {
                results.errors++;
                results.errorsList.push({
                    device: device.ten_thiet_bi,
                    error: error.message
                });
            }
        }

        return results;
    }

    transformExcelData(excelData) {
    console.log('🔄 Starting transformExcelData with', excelData.length, 'rows');
    console.log('📋 Available columns:', excelData.length > 0 ? Object.keys(excelData[0]) : []);
    
    const devices = excelData.map((row, index) => {
        console.log(`\n--- Processing row ${index} ---`);
        console.log('📊 Row data:', row);
        
        const tenThietBi = this.extractDeviceName(row);
        if (!tenThietBi) {
            console.log(`❌ Skipping row ${index}: No device name`);
            return null;
        }

        const soLuong = this.extractQuantity(row);
        const nguyenGia = this.extractPrice(row); // Đơn giá
        const thanhTien = this.extractTotalPrice(row); // Thành tiền
        
        console.log(`📊 Row ${index} Summary:`, {
            name: tenThietBi,
            quantity: soLuong,
            unitPrice: nguyenGia,
            totalPrice: thanhTien
        });

        return {
            serial_number: `DEV_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 5)}`,
            ten_thiet_bi: tenThietBi,
            nam_san_xuat: this.extractYear(row),
            so_luong: soLuong,
            nguyen_gia: nguyenGia, // Lưu đơn giá
            thanh_tien: thanhTien, // LƯU THÊM THÀNH TIỀN
            phan_loai: this.determineCategory(tenThietBi),
            don_vi_tinh: 'cái',
            phong_ban: 'Khoa Gây mê hồi sức',
            tinh_trang: 'Đang sử dụng',
            nha_san_xuat: this.extractManufacturer(tenThietBi),
            model: this.extractModel(tenThietBi),
            ghi_chu: `Import từ Excel - ${new Date().toLocaleDateString('vi-VN')}`,
            nhan_vien_ql: 'Quản trị viên',
            ngay_nhap: new Date().toISOString().split('T')[0],
            vi_tri: 'Khoa Gây mê hồi sức',
            is_active: true,
            parent_id: null
        };
    }).filter(device => device !== null);
    
    console.log('✅ Transform completed:', devices.length, 'devices created');
    
    // Thống kê
    const totalValue = devices.reduce((sum, device) => sum + (device.thanh_tien || device.nguyen_gia * device.so_luong), 0);
    console.log('💰 Total imported value:', this.formatCurrency(totalValue));
    
    return devices;
}
formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(amount);
}


    // THÊM DEBUG vào extractDeviceName
extractDeviceName(row) {
    console.log('🔍 DEBUG extractDeviceName - Row data:', row);
    
    const nameKeys = ['Tên công cụ dụng cụ', 'Tên thiết bị', 'Tên', 'Device Name', 'TEN', 'A'];
    
    for (const key of nameKeys) {
        const value = row[key];
        console.log(`🔍 Checking name key "${key}":`, value);
        
        if (value !== undefined && value !== null && value.toString().trim() !== '') {
            const name = value.toString().trim();
            console.log(`✅ Found device name from "${key}":`, name);
            return name;
        }
    }
    
    // Fallback: tìm cột đầu tiên có dữ liệu
    for (const [key, value] of Object.entries(row)) {
        if (value !== undefined && value !== null && value.toString().trim() !== '') {
            const name = value.toString().trim();
            console.log(`🔄 Fallback device name from "${key}":`, name);
            return name;
        }
    }
    
    console.log('❌ No device name found');
    return '';
}

    // SỬA LẠI phương thức extractQuantity trong database.js
extractQuantity(row) {
    console.log('🔍 DEBUG extractQuantity - Row data:', row);
    
    const quantityKeys = ['Số lượng', 'SL', 'SoLuong', 'Quantity', 'Qty', 'Theo sổ kế toán', 'C'];
    
    for (const key of quantityKeys) {
        const value = row[key];
        console.log(`🔍 Checking quantity key "${key}":`, value);
        
        if (this.isValidValue(value)) {
            const quantity = this.parseQuantityValue(value);
            if (quantity > 0) {
                console.log(`✅ Found quantity from "${key}":`, quantity);
                return quantity;
            }
        }
    }
    
    console.log('❌ No valid quantity found, defaulting to 1');
    return 1;
}

// THÊM PHƯƠM THỨC PARSE SỐ LƯỢNG
parseQuantityValue(value) {
    if (typeof value === 'number') return Math.max(1, value);
    
    let strValue = value.toString().trim();
    
    // Bỏ qua công thức Excel
    if (strValue.startsWith('=')) {
        // Thử extract số từ công thức đơn giản như =C3
        const match = strValue.match(/=C(\d+)/);
        if (match) {
            const rowNum = parseInt(match[1]);
            // Giả sử số lượng là số hàng (đơn giản hóa)
            return Math.max(1, rowNum);
        }
        return 1;
    }
    
    // Parse số thông thường
    strValue = strValue.replace(/[^\d.]/g, '');
    const quantity = parseInt(strValue);
    return isNaN(quantity) ? 1 : Math.max(1, quantity);
}


// GIẢI QUYẾT LỖI LẤY THÀNH TIỀN = 0

extractTotalPrice(row) {
    const totalPriceKeys = [
        'Thành tiền', 'Thanh tien', 'Tổng tiền', 'Tong tien',
        'Total Price', 'Total Cost', 'Amount'
    ];

    // 1️⃣ Cố tìm theo đúng tên cột
    for (const key of totalPriceKeys) {
        let val = row[key];
        if (this.isValidPriceValue(val)) {
            let price = this.parsePriceValue(val);
            console.log(`✅ Found total price from "${key}":`, price);
            return price;
        }
    }

    // 2️⃣ AUTO-DETECT: tìm cột nào có giá trị lớn nhất → chính là Thành tiền
    let maxValue = 0;
    for (const [key, value] of Object.entries(row)) {
        if (this.isValidPriceValue(value)) {
            let p = this.parsePriceValue(value);
            if (p > maxValue) {
                maxValue = p;
            }
        }
    }

    if (maxValue > 0) {
        console.log(`🔍 Auto-detected total price = ${maxValue}`);
        return maxValue;
    }

    console.log("❌ No total price found");
    return 0;
}



// LẤY ĐƠN GIÁ — KHÔNG ĐƯỢC GỌI extractTotalPrice() TRONG NÀY!
extractPrice(row) {
    const unitPriceKeys = [
        'Đơn giá', 'Don gia', 'Nguyên giá', 'Nguyen gia',
        'Price', 'Unit Price', 'Cost'
    ];

    for (const key of unitPriceKeys) {
        let val = row[key];
        if (this.isValidPriceValue(val)) {
            let price = this.parsePriceValue(val);
            console.log(`✅ Found unit price from "${key}":`, price);
            return price;
        }
    }

    console.log("❌ No unit price found → return 0");
    return 0;
}



// KIỂM TRA GIÁ TRỊ HỢP LỆ
isValidPriceValue(value) {
    if (value === undefined || value === null) return false;

    let s = value.toString().trim();
    if (s === "" || s === "0" || s === "0.00") return false;
    if (s.startsWith("=")) return false; // bỏ công thức Excel

    const parsed = this.parsePriceValue(s);
    return !isNaN(parsed) && parsed > 0;
}



// PARSE GIÁ CHUẨN VIỆT NAM – HỖ TRỢ MỌI ĐỊNH DẠNG
parsePriceValue(value) {
    if (typeof value === "number") return value;

    let s = value.toString().trim();

    // Xóa ký tự không phải số
    // "1.234.567,89" → "1234567.89"
    s = s.replace(/[^\d.,]/g, '')
         .replace(/\./g, '')  
         .replace(',', '.');

    let n = parseFloat(s);
    return isNaN(n) ? 0 : n;
}



// THÊM PHƯƠNG THỨC KIỂM TRA NĂM
looksLikeYear(value) {
    if (typeof value !== 'number') return false;
    return (value >= 1900 && value <= 2030);
}


// THÊM PHƯƠNG THỨC EXTRACT NĂM CẢI TIẾN
extractYear(row) {
    const yearKeys = [
        'Năm sản xuất', 'Năm SX', 'Nam san xuat', 'Year', 
        'Năm', 'Năm sản xuất', 'Năm sản xuất', 'Năm sản xuất'
    ];
    
    for (const key of yearKeys) {
        const value = row[key];
        if (this.isValidYearValue(value)) {
            const year = parseInt(value.toString().trim());
            if (!isNaN(year) && year >= 1900 && year <= 2030) {
                console.log(`✅ Found year from "${key}":`, year);
                return year;
            }
        }
    }
    
    // Tìm trong tất cả các cột có chứa từ "năm"
    for (const [key, value] of Object.entries(row)) {
        if (key.toLowerCase().includes('năm') && this.isValidYearValue(value)) {
            const year = parseInt(value.toString().trim());
            if (!isNaN(year) && year >= 1900 && year <= 2030) {
                console.log(`✅ Found year from auto-detected key "${key}":`, year);
                return year;
            }
        }
    }
    
    console.log('❌ No valid year found');
    return null;
}

isValidYearValue(value) {
    if (value === undefined || value === null) return false;
    const strValue = value.toString().trim();
    if (strValue === '') return false;
    if (strValue.startsWith('=')) return false; // Bỏ qua công thức Excel
    return true;
}

// THÊM PHƯƠNG THỨC KIỂM TRA GIÁ TRỊ HỢP LỆ
isValidValue(value) {
    if (value === undefined || value === null) return false;
    
    const strValue = value.toString().trim();
    if (strValue === '' || strValue === '0') return false;
    
    // Bỏ qua công thức Excel
    if (strValue.startsWith('=')) return false;
    
    return true;
}



    extractManufacturer(deviceName) {
        const manufacturers = ['Olympus', 'Stryker', 'Johnson & Johnson', 'Medtronic', 'Siemens', 'GE Healthcare'];
        return manufacturers.find(mfg => deviceName.toLowerCase().includes(mfg.toLowerCase())) || '';
    }

    extractModel(deviceName) {
        const modelMatch = deviceName.match(/([A-Z]{1,4}\d+[A-Z]*)/g);
        return modelMatch ? modelMatch[0] : '';
    }

    determineCategory(deviceName) {
        const name = deviceName.toLowerCase();
        if (name.includes('bàn') || name.includes('ghế') || name.includes('tủ')) return 'THIẾT BỊ NỘI THẤT';
        if (name.includes('kềm') || name.includes('kẹp') || name.includes('dao') || name.includes('kéo')) return 'DỤNG CỤ PHẪU THUẬT';
        if (name.includes('máy') || name.includes('đèn') || name.includes('monitor')) return 'THIẾT BỊ Y TẾ';
        if (name.includes('bóp bóng') || name.includes('ống') || name.includes('bông')) return 'VẬT TƯ Y TẾ';
        return 'DỤNG CỤ Y TẾ';
    }

    async initializeSampleData() {
        try {
            const departments = await this.getAllDepartments();
            const units = await this.getAllUnits();
            const staff = await this.getAllStaff();

            if (departments.length === 0) {
                const sampleDepts = ['Khoa Gây mê hồi sức', 'Khoa Phẫu thuật', 'Khoa Cấp cứu', 'Khoa Nội', 'Khoa Ngoại'];
                for (const dept of sampleDepts) {
                    await this.addDepartment({ ten_phong: dept });
                }
            }

            if (units.length === 0) {
                const sampleUnits = ['Đơn vị Phẫu thuật 1', 'Đơn vị Phẫu thuật 2', 'Đơn vị Hồi sức', 'Đơn vị Cấp cứu'];
                for (const unit of sampleUnits) {
                    await this.addUnit({ ten_don_vi: unit });
                }
            }

            if (staff.length === 0) {
                const sampleStaff = [
                    { ten_nhan_vien: 'Nguyễn Văn A', chuc_vu: 'Bác sĩ' },
                    { ten_nhan_vien: 'Trần Thị B', chuc_vu: 'Điều dưỡng' },
                    { ten_nhan_vien: 'Lê Văn C', chuc_vu: 'Kỹ thuật viên' },
                    { ten_nhan_vien: 'Phạm Thị D', chuc_vu: 'Quản lý thiết bị' }
                ];
                for (const staffMember of sampleStaff) {
                    await this.addStaff(staffMember);
                }
            }
        } catch (error) {
            console.error('Error initializing sample data:', error);
        }
    }
}

// Global instance
let medicalDB;
try {
    medicalDB = new MedicalEquipmentDB();
    console.log('🎯 Medical Equipment DB instance created');
} catch (error) {
    console.error('❌ Failed to initialize database:', error);
}