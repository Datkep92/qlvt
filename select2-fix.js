// select2-fix.js - Fix accessibility issues for Select2
class Select2Fix {
    constructor() {
        this.init();
    }
    
    init() {
        // Listen for Select2 initialization
        $(document).on('select2:open', this.fixSelect2Accessibility.bind(this));
        
        // Fix existing Select2 on page load
        setTimeout(() => this.fixAllSelect2(), 500);
        
        // Fix after dynamic content changes
        AppEvents.on('select2:initialized', () => this.fixAllSelect2());
    }
    
    fixAllSelect2() {
        document.querySelectorAll('.select2-hidden-accessible').forEach(select => {
            this.fixSelectElement(select);
        });
    }
    
    fixSelectElement(selectElement) {
        // Remove aria-hidden
        selectElement.removeAttribute('aria-hidden');
        
        // Ensure aria-label exists
        if (!selectElement.hasAttribute('aria-label')) {
            const label = this.findLabelForElement(selectElement);
            if (label) {
                selectElement.setAttribute('aria-label', label.textContent.trim());
            } else {
                // Try to get label from parent
                const parentLabel = selectElement.closest('.form-group, .filter-field, .bulk-field')?.querySelector('label');
                if (parentLabel) {
                    selectElement.setAttribute('aria-label', parentLabel.textContent.trim());
                } else {
                    selectElement.setAttribute('aria-label', 'Lựa chọn');
                }
            }
        }
        
        // Fix Select2 container
        const container = selectElement.nextElementSibling;
        if (container && container.classList.contains('select2-container')) {
            container.removeAttribute('aria-hidden');
            container.setAttribute('role', 'combobox');
            container.setAttribute('aria-expanded', 'false');
            container.setAttribute('aria-haspopup', 'listbox');
            
            // Fix hidden input
            const hiddenInput = container.querySelector('.select2-hidden-accessible');
            if (hiddenInput) {
                hiddenInput.removeAttribute('aria-hidden');
                hiddenInput.setAttribute('aria-label', selectElement.getAttribute('aria-label'));
            }
            
            // Fix search field
            const searchField = container.querySelector('.select2-search__field');
            if (searchField && !searchField.hasAttribute('aria-label')) {
                searchField.setAttribute('aria-label', `Tìm kiếm ${selectElement.getAttribute('aria-label')}`);
            }
        }
    }
    
    findLabelForElement(element) {
        const id = element.id;
        if (!id) return null;
        
        // Try direct label[for]
        const label = document.querySelector(`label[for="${id}"]`);
        if (label) return label;
        
        // Try to find in parent container
        const parent = element.closest('.form-group, .field-group, .control-group');
        if (parent) {
            return parent.querySelector('label');
        }
        
        return null;
    }
    
    fixSelect2Accessibility(e) {
        const selectElement = e.target;
        setTimeout(() => {
            this.fixSelectElement(selectElement);
            
            // Also fix dropdown
            const dropdown = document.querySelector('.select2-container--open .select2-dropdown');
            if (dropdown) {
                dropdown.removeAttribute('aria-hidden');
                dropdown.setAttribute('role', 'listbox');
            }
        }, 50);
    }
}

// Initialize
window.select2Fix = new Select2Fix();