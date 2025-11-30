class DevicesExportManager {
    constructor(manager) {
        this.manager = manager;
    }

    async exportMaintenanceSchedule() {
        try {
            // SỬA LỖI: Sử dụng dbExtended
            const maintenanceRecords = dbExtended ? await dbExtended.getMaintenanceRecords() : [];
            const devicesNeedingMaintenance = this.manager.allDevices.filter(device => 
                device.tinh_trang === 'Bảo trì'
            );

            if (devicesNeedingMaintenance.length === 0 && maintenanceRecords.length === 0) {
                this.manager.showError('Không có dữ liệu bảo trì để export');
                return;
            }

            const workbook = XLSX.utils.book_new();
            
            // Worksheet thiết bị cần bảo trì
            const maintenanceData = [
                ['THIẾT BỊ CẦN BẢO TRÌ'],
                ['STT', 'Tên Thiết Bị', 'Phòng Ban', 'Tình Trạng', 'Nhân Viên QL', 'Ghi Chú']
            ];

            devicesNeedingMaintenance.forEach((device, index) => {
                maintenanceData.push([
                    index + 1,
                    device.ten_thiet_bi,
                    device.phong_ban,
                    device.tinh_trang,
                    device.nhan_vien_ql,
                    device.ghi_chu || ''
                ]);
            });

            const maintenanceWorksheet = XLSX.utils.aoa_to_sheet(maintenanceData);
            XLSX.utils.book_append_sheet(workbook, maintenanceWorksheet, 'CanBaoTri');

            // Worksheet lịch sử bảo trì
            if (maintenanceRecords.length > 0) {
                const historyData = [
                    ['LỊCH SỬ BẢO TRÌ'],
                    ['STT', 'Tên Thiết Bị', 'Ngày Bảo Trì', 'Loại Bảo Trì', 'Chi Phí', 'Ghi Chú']
                ];

                maintenanceRecords.forEach((record, index) => {
                    historyData.push([
                        index + 1,
                        record.ten_thiet_bi || 'N/A',
                        record.ngay_bao_tri || '',
                        record.loai_bao_tri || '',
                        record.chi_phi || 0,
                        record.ghi_chu || ''
                    ]);
                });

                const historyWorksheet = XLSX.utils.aoa_to_sheet(historyData);
                XLSX.utils.book_append_sheet(workbook, historyWorksheet, 'LichSuBaoTri');
            }

            const fileName = `Lich_Bao_Tri_${new Date().toISOString().split('T')[0]}.xlsx`;
            XLSX.writeFile(workbook, fileName);

            await medicalDB.addActivity({
                type: 'export',
                description: 'Export lịch bảo trì thiết bị',
                user: 'Quản trị viên'
            });

            this.manager.showSuccess('Đã export lịch bảo trì thành công');

        } catch (error) {
            console.error('Error exporting maintenance schedule:', error);
            this.manager.showError('Lỗi khi export lịch bảo trì: ' + error.message);
        }
    }


    async exportDevices() {
        try {
            const devices = this.manager.filteredDevices.length > 0 ? 
                this.manager.filteredDevices : 
                this.manager.allDevices;

            if (devices.length === 0) {
                this.manager.showError('Không có dữ liệu để export');
                return;
            }

            this.manager.showNotification('🔄 Đang chuẩn bị dữ liệu export...', 'info');

            // Tạo workbook
            const workbook = XLSX.utils.book_new();
            
            // Tạo worksheet chính
            const worksheetData = this.prepareExportData(devices);
            const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
            XLSX.utils.book_append_sheet(workbook, worksheet, 'ThietBi');

            // Tạo worksheet thống kê
            const statsWorksheet = this.createStatsWorksheet(devices);
            XLSX.utils.book_append_sheet(workbook, statsWorksheet, 'ThongKe');

            // Export file
            const fileName = `ThietBi_YTe_${new Date().toISOString().split('T')[0]}.xlsx`;
            XLSX.writeFile(workbook, fileName);

            // Log activity
            await medicalDB.addActivity({
                type: 'export',
                description: `Export ${devices.length} thiết bị ra Excel`,
                user: 'Quản trị viên'
            });

            this.manager.showSuccess(`Đã export ${devices.length} thiết bị thành công`);

        } catch (error) {
            console.error('Error exporting devices:', error);
            this.manager.showError('Lỗi khi export dữ liệu: ' + error.message);
        }
    }

    prepareExportData(devices) {
        const headers = [
            'STT', 'Tên Thiết Bị', 'Model', 'Nhà Sản Xuất', 'Năm SX', 
            'Số Lượng', 'Nguyên Giá', 'Thành Tiền', 'Đơn Vị Tính',
            'Phòng Ban', 'Đơn Vị', 'Nhân Viên QL', 'Tình Trạng', 
            'Phân Loại', 'Vị Trí', 'Ngày Nhập', 'Ghi Chú'
        ];

        const data = [headers];

        devices.forEach((device, index) => {
            const row = [
                index + 1,
                device.ten_thiet_bi || '',
                device.model || '',
                device.nha_san_xuat || '',
                device.nam_san_xuat || '',
                device.so_luong || 0,
                device.nguyen_gia || 0,
                (device.nguyen_gia || 0) * (device.so_luong || 0),
                device.don_vi_tinh || 'cái',
                device.phong_ban || '',
                device.don_vi || '',
                device.nhan_vien_ql || '',
                device.tinh_trang || '',
                device.phan_loai || '',
                device.vi_tri || '',
                device.ngay_nhap || '',
                device.ghi_chu || ''
            ];
            data.push(row);
        });

        return data;
    }

    createStatsWorksheet(devices) {
        const stats = this.calculateStats(devices);
        
        const statsData = [
            ['THỐNG KÊ THIẾT BỊ Y TẾ'],
            [''],
            ['Tổng số thiết bị:', stats.totalDevices],
            ['Tổng giá trị:', this.manager.formatCurrency(stats.totalValue)],
            [''],
            ['CHI TIẾT THEO TRẠNG THÁI'],
            ...Object.entries(stats.statusCounts).map(([status, count]) => [status, count]),
            [''],
            ['CHI TIẾT THEO PHÒNG BAN'],
            ...Object.entries(stats.departmentCounts).map(([dept, count]) => [dept, count]),
            [''],
            ['THIẾT BỊ CẦN BẢO TRÌ'],
            ...stats.maintenanceNeeded.map(device => [device.ten_thiet_bi, device.phong_ban, device.tinh_trang])
        ];

        return XLSX.utils.aoa_to_sheet(statsData);
    }

    calculateStats(devices) {
        const totalDevices = devices.length;
        const totalValue = devices.reduce((sum, device) => sum + (device.nguyen_gia * device.so_luong), 0);
        
        const statusCounts = {};
        const departmentCounts = {};
        
        devices.forEach(device => {
            statusCounts[device.tinh_trang] = (statusCounts[device.tinh_trang] || 0) + 1;
            departmentCounts[device.phong_ban] = (departmentCounts[device.phong_ban] || 0) + 1;
        });

        const maintenanceNeeded = devices.filter(device => 
            device.tinh_trang === 'Bảo trì' || device.tinh_trang === 'Hỏng'
        ).slice(0, 10); // Giới hạn 10 thiết bị

        return {
            totalDevices,
            totalValue,
            statusCounts,
            departmentCounts,
            maintenanceNeeded
        };
    }

    async bulkExport() {
        if (this.manager.selectedDevices.size === 0) {
            this.manager.showError('Vui lòng chọn ít nhất một thiết bị để export');
            return;
        }

        try {
            const selectedDevices = Array.from(this.manager.selectedDevices).map(id => 
                this.manager.allDevices.find(d => d.id === id)
            ).filter(device => device !== undefined);

            this.manager.showNotification('🔄 Đang export thiết bị đã chọn...', 'info');

            const workbook = XLSX.utils.book_new();
            const worksheetData = this.prepareExportData(selectedDevices);
            const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
            XLSX.utils.book_append_sheet(workbook, worksheet, 'ThietBi_DaChon');

            const fileName = `ThietBi_DaChon_${new Date().toISOString().split('T')[0]}.xlsx`;
            XLSX.writeFile(workbook, fileName);

            await medicalDB.addActivity({
                type: 'export',
                description: `Export ${selectedDevices.length} thiết bị đã chọn`,
                user: 'Quản trị viên'
            });

            this.manager.showSuccess(`Đã export ${selectedDevices.length} thiết bị đã chọn`);

        } catch (error) {
            console.error('Error in bulk export:', error);
            this.manager.showError('Lỗi khi export thiết bị: ' + error.message);
        }
    }

    async generateQRCode() {
        if (this.manager.selectedDevices.size === 0 && this.manager.filteredDevices.length === 0) {
            this.manager.showError('Không có thiết bị để tạo QR Code');
            return;
        }

        try {
            const devicesToGenerate = this.manager.selectedDevices.size > 0 ?
                Array.from(this.manager.selectedDevices).map(id => 
                    this.manager.allDevices.find(d => d.id === id)
                ).filter(device => device !== undefined) :
                this.manager.filteredDevices.slice(0, 20); // Giới hạn 20 thiết bị

            if (devicesToGenerate.length > 20) {
                if (!confirm(`Sẽ tạo QR Code cho ${devicesToGenerate.length} thiết bị. Bạn có muốn tiếp tục?`)) {
                    return;
                }
            }

            this.manager.showNotification('🔄 Đang tạo QR Code...', 'info');

            // Tạo PDF chứa QR Code
            const pdfWindow = window.open('', '_blank');
            pdfWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>QR Code Thiết Bị</title>
                    <style>
                        body { font-family: Arial, sans-serif; margin: 20px; }
                        .qr-container { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
                        .qr-item { text-align: center; padding: 10px; border: 1px solid #ddd; }
                        .qr-title { font-size: 12px; margin-bottom: 10px; word-break: break-word; }
                        .qr-code { width: 120px; height: 120px; background: #f5f5f5; display: flex; align-items: center; justify-content: center; margin: 0 auto; }
                    </style>
                </head>
                <body>
                    <h1>QR Code Thiết Bị Y Tế</h1>
                    <p>Ngày tạo: ${new Date().toLocaleDateString('vi-VN')}</p>
                    <div class="qr-container" id="qr-container">
                        ${devicesToGenerate.map(device => `
                            <div class="qr-item">
                                <div class="qr-title">${this.manager.escapeHtml(device.ten_thiet_bi)}</div>
                                <div class="qr-code">
                                    <div style="text-align: center;">
                                        <div>📱</div>
                                        <small>QR Code</small>
                                        <br>
                                        <small>${device.serial_number || 'N/A'}</small>
                                    </div>
                                </div>
                                <div style="font-size: 10px; margin-top: 5px;">
                                    ${device.phong_ban || ''} • ${device.tinh_trang || ''}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                    <script>
                        window.onload = function() {
                            window.print();
                        }
                    </script>
                </body>
                </html>
            `);

            await medicalDB.addActivity({
                type: 'export',
                description: `Tạo QR Code cho ${devicesToGenerate.length} thiết bị`,
                user: 'Quản trị viên'
            });

            this.manager.showSuccess(`Đã tạo QR Code cho ${devicesToGenerate.length} thiết bị`);

        } catch (error) {
            console.error('Error generating QR code:', error);
            this.manager.showError('Lỗi khi tạo QR Code: ' + error.message);
        }
    }

}