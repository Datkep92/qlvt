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
async checkSerialNumberExists(serialNumber) {
    await this.ensureInitialized();
    const transaction = this.db.transaction(['devices'], 'readonly');
    const store = transaction.objectStore('devices');
    const index = store.index('serial_number');
    
    return new Promise((resolve, reject) => {
        const request = index.get(serialNumber);
        request.onsuccess = () => resolve(!!request.result);
        request.onerror = () => reject(request.error);
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



extractDeviceName(row) {
    const nameKeys = [
        'Tên công cụ dụng cụ', 'Tên thiết bị', 'Tên',
        'Device Name', 'TEN', 'A'
    ];

    for (const key of nameKeys) {
        if (row[key] !== undefined && row[key] !== null) {
            const name = row[key].toString().trim();
            if (name !== "") return name;
        }
    }

    // Fallback: lấy cột đầu tiên có dữ liệu rõ ràng
    for (const [key, val] of Object.entries(row)) {
        if (val !== undefined && val !== null && val.toString().trim() !== "") {
            return val.toString().trim();
        }
    }

    return "";
}


extractQuantity(row) {
    const keys = ['Số lượng', 'SL', 'SoLuong', 'Quantity', 'Qty', 'Theo sổ kế toán', 'C'];

    for (const key of keys) {
        let val = row[key];

        if (this.isValidValue(val)) {
            let q = this.parseQuantityValue(val);
            if (q > 0) return q;
        }
    }

    // Nếu không tìm thấy → trả 1 nhưng có log cảnh báo
    console.warn("⚠ extractQuantity: không tìm thấy số lượng, tự đặt = 1", row);
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


extractTotalPrice(row) {
    const keys = [
        'Thành tiền', 'Thanh tien', 'Tổng tiền', 'Tong tien',
        'Total Price', 'Total Cost', 'Amount'
    ];

    for (const key of keys) {
        let val = row[key];
        if (this.isValidPriceValue(val)) {
            return this.parsePriceValue(val);
        }
    }

    // AUTO-DETECT cột lớn nhất → chính là Thành tiền
    let max = 0;
    for (const [key, value] of Object.entries(row)) {
        if (this.isValidPriceValue(value)) {
            let p = this.parsePriceValue(value);
            if (p > max) max = p;
        }
    }

    return max > 0 ? max : 0;
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
transformExcelData(excelData) {
    console.log('🔄 Starting transformExcelData with', excelData.length, 'rows');
    console.log('📋 Available columns:', excelData.length > 0 ? Object.keys(excelData[0]) : []);
    
    // Detect columns từ hàng đầu tiên
    const columnMapping = this.detectColumnNames(excelData[0] || {});
    console.log('🗺️ Column mapping:', columnMapping);
    
    const devices = excelData.map((row, index) => {
        console.log(`\n--- Processing row ${index + 1} ---`);
        console.log('📊 Row data:', row);
        
        // 1. Extract device name - có ưu tiên column mapping
        const tenThietBi = this.extractDeviceName(row, columnMapping);
        if (!tenThietBi || tenThietBi.trim() === '') {
            console.log(`❌ Skipping row ${index + 1}: No device name`);
            return null;
        }

        // 2. Extract values với column mapping
        const soLuong = this.extractQuantity(row, columnMapping);
        const nguyenGia = this.extractPrice(row, columnMapping); // Đơn giá
        const thanhTien = this.extractTotalPrice(row, columnMapping); // Thành tiền
        const namSanXuat = this.extractYear(row, columnMapping);
        const model = this.extractModelFromRow(row, columnMapping);
        const nhaSanXuat = this.extractManufacturerFromRow(row, columnMapping);
        
        console.log(`📊 Row ${index + 1} Summary:`, {
            name: tenThietBi,
            model: model,
            manufacturer: nhaSanXuat,
            year: namSanXuat,
            quantity: soLuong,
            unitPrice: nguyenGia,
            totalPrice: thanhTien
        });

        // Tính thành tiền nếu không có
        let finalThanhTien = thanhTien;
        if (finalThanhTien === 0 && nguyenGia > 0 && soLuong > 0) {
            finalThanhTien = nguyenGia * soLuong;
            console.log(`💰 Calculated thanh_tien = ${nguyenGia} × ${soLuong} = ${finalThanhTien}`);
        }

        return {
            serial_number: `IMPORT_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 5)}`,
            ten_thiet_bi: tenThietBi,
            model: model || this.extractModel(tenThietBi),
            nha_san_xuat: nhaSanXuat || this.extractManufacturer(tenThietBi),
            nam_san_xuat: namSanXuat,
            so_luong: soLuong,
            nguyen_gia: nguyenGia,
            thanh_tien: finalThanhTien,
            phan_loai: this.determineCategory(tenThietBi),
            don_vi_tinh: 'cái',
            phong_ban: 'Khoa Gây mê hồi sức',
            tinh_trang: 'Đang sử dụng',
            ghi_chu: `Import từ Excel - ${new Date().toLocaleDateString('vi-VN')}`,
            nhan_vien_ql: 'Quản trị viên',
            ngay_nhap: new Date().toISOString().split('T')[0],
            vi_tri: 'Khoa Gây mê hồi sức',
            don_vi: '',
            is_active: true,
            parent_id: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
    }).filter(device => device !== null);
    
    console.log('✅ Transform completed:', devices.length, 'devices created');
    
    // Thống kê chi tiết
    const stats = {
        totalDevices: devices.length,
        totalValue: devices.reduce((sum, device) => sum + (device.thanh_tien), 0),
        totalQuantity: devices.reduce((sum, device) => sum + (device.so_luong), 0),
        hasModel: devices.filter(d => d.model && d.model.trim() !== '').length,
        hasYear: devices.filter(d => d.nam_san_xuat).length,
        hasManufacturer: devices.filter(d => d.nha_san_xuat && d.nha_san_xuat.trim() !== '').length
    };
    
    console.log('📈 Import Statistics:', {
        'Total Devices': stats.totalDevices,
        'Total Value': this.formatCurrency(stats.totalValue),
        'Total Quantity': stats.totalQuantity,
        'With Model': `${stats.hasModel} (${Math.round(stats.hasModel/stats.totalDevices*100)}%)`,
        'With Year': `${stats.hasYear} (${Math.round(stats.hasYear/stats.totalDevices*100)}%)`,
        'With Manufacturer': `${stats.hasManufacturer} (${Math.round(stats.hasManufacturer/stats.totalDevices*100)}%)`
    });
    
    return devices;
}

// SỬA PHƯƠNG THỨC extractYear trong database.js
extractYear(row, columnMapping = null) {
    console.log('🔍 DEBUG extractYear - Row:', row);
    
    // Ưu tiên dùng column mapping nếu có
    if (columnMapping) {
        for (const [excelKey, dbKey] of Object.entries(columnMapping)) {
            if (dbKey === 'nam_san_xuat') {
                const value = row[excelKey];
                if (this.isValidYearValue(value)) {
                    const year = this.parseYearValue(value);
                    console.log(`✅ Found year from mapped column "${excelKey}":`, year);
                    return year;
                }
            }
        }
    }
    
    // Fallback: tìm theo keywords
    const yearKeys = [
        'Năm sản xuất', 'Năm SX', 'Nam san xuat', 'Year', 
        'Năm', 'Nam', 'Năm Sản Xuất', 'Năm s/x',
        'C', 'C_NămSX', 'C_NamSX', 'C_Năm', 'C_Nam'
    ];
    
    for (const key of yearKeys) {
        const value = row[key];
        if (value !== undefined && value !== null) {
            console.log(`🔍 Checking year key "${key}":`, value);
            if (this.isValidYearValue(value)) {
                const year = this.parseYearValue(value);
                console.log(`✅ Found year from key "${key}":`, year);
                return year;
            }
        }
    }
    
    // Tìm cột có chứa "năm" hoặc "year"
    for (const [key, value] of Object.entries(row)) {
        const lowerKey = key.toLowerCase();
        if ((lowerKey.includes('năm') || lowerKey.includes('nam') || lowerKey.includes('year')) && 
            this.isValidYearValue(value)) {
            const year = this.parseYearValue(value);
            console.log(`✅ Found year from auto-detected key "${key}":`, year);
            return year;
        }
    }
    
    console.log('❌ No valid year found');
    return null;
}

// THÊM PHƯƠNG THỨC PARSE YEAR CẢI TIẾN
parseYearValue(value) {
    if (typeof value === 'number') {
        // Xử lý số Excel date (ví dụ: 44008 = 2020)
        if (value > 10000 && value < 60000) {
            // Có thể là Excel date serial number
            const date = new Date((value - 25569) * 86400 * 1000);
            const year = date.getFullYear();
            if (year >= 1900 && year <= 2030) {
                console.log(`📅 Converted Excel date ${value} to year:`, year);
                return year;
            }
        }
        // Nếu là số bình thường
        if (value >= 1900 && value <= 2030) return value;
    }
    
    // Xử lý string
    let strValue = value.toString().trim();
    
    // Bỏ công thức Excel
    if (strValue.startsWith('=')) {
        // Nếu có dạng =2020 hoặc ="2020"
        const match = strValue.match(/(\d{4})/);
        if (match) {
            const year = parseInt(match[1]);
            if (year >= 1900 && year <= 2030) return year;
        }
        return null;
    }
    
    // Lấy 4 số liên tiếp
    const yearMatch = strValue.match(/\b(19[0-9]{2}|20[0-2][0-9])\b/);
    if (yearMatch) {
        return parseInt(yearMatch[1]);
    }
    
    // Parse số thông thường
    strValue = strValue.replace(/[^\d]/g, '');
    const year = parseInt(strValue);
    
    if (!isNaN(year) && year >= 1900 && year <= 2030) {
        return year;
    }
    
    return null;
}

// CẢI THIỆN isValidYearValue
isValidYearValue(value) {
    if (value === undefined || value === null) return false;
    
    const strValue = value.toString().trim();
    if (strValue === '') return false;
    
    // Kiểm tra xem có phải số hợp lệ không
    const year = this.parseYearValue(value);
    return year !== null;
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
// Thêm vào class MedicalEquipmentDB trong database.js

async getStaff(id) {
    await this.ensureInitialized();
    const transaction = this.db.transaction(['staff'], 'readonly');
    const store = transaction.objectStore('staff');
    
    return new Promise((resolve, reject) => {
        const request = store.get(id);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async updateStaff(id, updates) {
    return this.updateRecord('staff', id, updates);
}

async deleteStaff(id) {
    return this.deleteRecord('staff', id);
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