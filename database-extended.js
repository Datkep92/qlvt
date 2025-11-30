// Extended database functions for maintenance and reference data
class DatabaseExtended {
    constructor(medicalDB) {
        this.db = medicalDB;
    }

    // ========== MAINTENANCE METHODS ==========
    async addMaintenanceRecord(record) {
        try {
            await this.db.ensureInitialized();
            const transaction = this.db.db.transaction(['maintenance'], 'readwrite');
            const store = transaction.objectStore('maintenance');
            
            record.created_at = new Date().toISOString();
            
            return new Promise((resolve, reject) => {
                const request = store.add(record);
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.error('Error adding maintenance record:', error);
            throw error;
        }
    }

    async getMaintenanceRecords() {
        try {
            await this.db.ensureInitialized();
            const transaction = this.db.db.transaction(['maintenance'], 'readonly');
            const store = transaction.objectStore('maintenance');
            
            return new Promise((resolve) => {
                const request = store.getAll();
                request.onsuccess = () => resolve(request.result || []);
                request.onerror = () => resolve([]);
            });
        } catch (error) {
            console.warn('Error loading maintenance records:', error);
            return [];
        }
    }

    async updateMaintenance(id, updates) {
        try {
            await this.db.ensureInitialized();
            const transaction = this.db.db.transaction(['maintenance'], 'readwrite');
            const store = transaction.objectStore('maintenance');
            
            return new Promise(async (resolve, reject) => {
                const getRequest = store.get(id);
                getRequest.onsuccess = () => {
                    const record = getRequest.result;
                    if (record) {
                        Object.assign(record, updates);
                        record.updated_at = new Date().toISOString();
                        
                        const updateRequest = store.put(record);
                        updateRequest.onsuccess = () => resolve(updateRequest.result);
                        updateRequest.onerror = () => reject(updateRequest.error);
                    } else {
                        reject(new Error('Maintenance record not found'));
                    }
                };
                getRequest.onerror = () => reject(getRequest.error);
            });
        } catch (error) {
            console.error('Error updating maintenance record:', error);
            throw error;
        }
    }

    async deleteMaintenance(id) {
        try {
            await this.db.ensureInitialized();
            const transaction = this.db.db.transaction(['maintenance'], 'readwrite');
            const store = transaction.objectStore('maintenance');
            
            return new Promise((resolve, reject) => {
                const request = store.delete(id);
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.error('Error deleting maintenance record:', error);
            throw error;
        }
    }

    // ========== REFERENCE DATA MANAGEMENT ==========
    async addDepartment(department) {
        return this.addReferenceData('departments', department);
    }

    async addUnit(unit) {
        return this.addReferenceData('units', unit);
    }

    async addStaff(staff) {
        return this.addReferenceData('staff', staff);
    }

    async addReferenceData(storeName, data) {
        try {
            await this.db.ensureInitialized();
            const transaction = this.db.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            
            return new Promise((resolve, reject) => {
                const request = store.add(data);
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.error(`Error adding ${storeName}:`, error);
            throw error;
        }
    }

    async deleteReferenceData(storeName, id) {
        try {
            await this.db.ensureInitialized();
            const transaction = this.db.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            
            return new Promise((resolve, reject) => {
                const request = store.delete(id);
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.error(`Error deleting ${storeName}:`, error);
            throw error;
        }
    }

    async updateReferenceData(storeName, id, updates) {
        try {
            await this.db.ensureInitialized();
            const transaction = this.db.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            
            return new Promise(async (resolve, reject) => {
                const getRequest = store.get(id);
                getRequest.onsuccess = () => {
                    const record = getRequest.result;
                    if (record) {
                        Object.assign(record, updates);
                        const updateRequest = store.put(record);
                        updateRequest.onsuccess = () => resolve(updateRequest.result);
                        updateRequest.onerror = () => reject(updateRequest.error);
                    } else {
                        reject(new Error('Record not found'));
                    }
                };
                getRequest.onerror = () => reject(getRequest.error);
            });
        } catch (error) {
            console.error(`Error updating ${storeName}:`, error);
            throw error;
        }
    }
}

// Initialize extended database
let dbExtended;
document.addEventListener('DOMContentLoaded', () => {
    if (medicalDB) {
        dbExtended = new DatabaseExtended(medicalDB);
        console.log('✅ Database Extended initialized');
    }
});