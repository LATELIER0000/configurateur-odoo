// ===== CORE FUNCTIONS - Fonctions de base du configurateur =====

class ConfiguratorCore {
    constructor() {
        this.config = null;
        this.options = null;
        this.texts = null;
        this.dataTable = [];
        this.currentStep = 1;
        this.userSelections = {};
        this.currentUser = null;
        this.elements = {};
    }

    // ===== INITIALISATION =====
    
    async loadConfigurations() {
        try {
            console.log('🔧 Chargement des configurations...');
            
            // Charger les fichiers de configuration
            const configPromise = this.loadJSON('config.json');
            const optionsPromise = this.loadJSON('options.json');
            const textsPromise = this.loadJSON('texts.json');
            
            const [config, options, texts] = await Promise.all([
                configPromise, optionsPromise, textsPromise
            ]);
            
            this.config = config;
            this.options = options;
            this.texts = texts;
            
            console.log('✅ Configurations chargées');
            return true;
        } catch (error) {
            console.error('❌ Erreur chargement configs:', error);
            throw error;
        }
    }
    
    async loadJSON(filename) {
        const baseUrl = 'https://raw.githubusercontent.com/LATELIER0000/configurateur-odoo/main/';
        const response = await fetch(baseUrl + filename);
        if (!response.ok) {
            throw new Error(`Erreur chargement ${filename}: ${response.status}`);
        }
        return await response.json();
    }

    // ===== GESTION DES DONNÉES CSV =====
    
    async loadCSVData() {
        try {
            const response = await fetch(this.config.data.csvUrl);
            if (!response.ok) {
                throw new Error(`Erreur HTTP: ${response.status}`);
            }
            const csvText = await response.text();
            this.parseCSVData(csvText);
            console.log(`✅ ${this.dataTable.length} lignes de données chargées`);
        } catch (error) {
            console.error('❌ Erreur chargement CSV:', error);
            throw error;
        }
    }

    parseCSVData(csvText) {
        // Supprimer BOM si présent
        csvText = csvText.replace(/^\uFEFF/, '');
        const lines = csvText.trim().split('\n');
        const headers = lines[0].split(';');

        this.dataTable = lines.slice(1).map(line => {
            const values = line.split(';');
            const row = {};
            headers.forEach((header, index) => {
                row[header] = values[index] || '';
            });
            return row;
        });
    }

    // ===== GESTION DES ÉLÉMENTS DOM =====
    
    initializeElements() {
        this.elements = {
            loading: document.getElementById('loading'),
            error: document.getElementById('error'),
            form: document.getElementById('configuratorForm'),
            progressLine: document.getElementById('progressLine'),
            priceResult: document.getElementById('priceResult'),
            priceMain: document.getElementById('priceMain'),
            repairType: document.getElementById('repairType'),
            deviceInfo: document.getElementById('deviceInfo'),
            qualityInfo: document.getElementById('qualityInfo'),
            timeEstimate: document.getElementById('timeEstimate'),
            contactBtn: document.getElementById('contactBtn'),
            contactSection: document.getElementById('contactSection'),
            summaryBox: document.getElementById('summaryBox'),
            summaryRepair: document.getElementById('summaryRepair'),
            summaryRepairValue: document.getElementById('summaryRepairValue'),
            summaryQuality: document.getElementById('summaryQuality'),
            summaryQualityValue: document.getElementById('summaryQualityValue'),
            summaryBrand: document.getElementById('summaryBrand'),
            summaryBrandValue: document.getElementById('summaryBrandValue'),
            summarySeries: document.getElementById('summarySeries'),
            summarySeriesValue: document.getElementById('summarySeriesValue'),
            brandOptions: document.getElementById('brandOptions'),
            seriesOptions: document.getElementById('seriesOptions'),
            modelOptions: document.getElementById('modelOptions')
        };
    }

    // ===== NAVIGATION ENTRE ÉTAPES =====
    
    showStep(stepNumber) {
        // Masquer toutes les étapes
        document.querySelectorAll('.form-step').forEach(step => {
            step.classList.remove('active');
            step.style.display = 'none';
        });

        // Afficher l'étape courante
        const currentStepElement = document.getElementById(`step-${stepNumber}`);
        if (currentStepElement) {
            currentStepElement.style.display = 'block';
            currentStepElement.classList.add('active');
        }

        // Mettre à jour la progression visuelle
        this.updateStepIndicators(stepNumber);
    }

    updateStepIndicators(stepNumber) {
        document.querySelectorAll('.step-item').forEach((item, index) => {
            const step = index + 1;
            const circle = item.querySelector('.step-circle');

            item.classList.remove('active', 'completed');
            circle.classList.remove('active', 'completed');

            if (step < stepNumber) {
                item.classList.add('completed');
                circle.classList.add('completed');
            } else if (step === stepNumber) {
                item.classList.add('active');
                circle.classList.add('active');
            }
        });
    }

    updateProgress() {
        const progress = ((this.currentStep - 1) / (this.config.ui.totalSteps - 1)) * 100;
        this.elements.progressLine.style.width = `${progress}%`;
    }

    goToStep(targetStep) {
        if (targetStep <= this.currentStep || 
            (targetStep === this.currentStep + 1 && this.isCurrentStepValid())) {
            
            // Masquer les résultats si on navigue
            if (this.elements.priceResult.style.display === 'block') {
                this.hideResults();
            }

            this.currentStep = targetStep;
            this.showStep(this.currentStep);
            this.updateProgress();
        }
    }

    isCurrentStepValid() {
        switch(this.currentStep) {
            case 1: return this.userSelections.repair !== undefined && this.userSelections.repair !== '';
            case 2: return this.userSelections.quality !== undefined && this.userSelections.quality !== '';
            case 3: return this.userSelections.brand !== undefined && this.userSelections.brand !== '';
            case 4: return this.userSelections.series !== undefined && this.userSelections.series !== '';
            case 5: return this.userSelections.model !== undefined && this.userSelections.model !== '';
            default: return false;
        }
    }

    // ===== CALCUL DE PRIX =====
    
    calculatePrice() {
        const { repair, quality, brand, series, model } = this.userSelections;
        
        if (!repair || !quality || !brand || !series || !model) {
            console.warn('⚠️ Sélections incomplètes pour le calcul de prix');
            return;
        }

        const row = this.dataTable.find(r =>
            r["Marque"] === brand &&
            r["Série"] === series &&
            r["Modèle"] === model &&
            r["Type de réparation"] === repair &&
            r["Qualité"] === quality
        );

        if (row) {
            const priceKey = Object.keys(row).find(key => key.includes("Prix Standard"));
            const price = row[priceKey];

            if (price && price.toString().trim() !== "" && price.toString().trim() !== "0") {
                this.showPrice(price);
            } else {
                this.showUnavailable();
            }
        } else {
            this.showUnavailable();
        }
    }

    showPrice(price) {
        const { repair, quality, brand, series, model } = this.userSelections;
        
        this.elements.priceMain.textContent = `${price} €`;
        this.elements.priceResult.className = 'price-result';
        this.elements.priceResult.style.display = 'block';

        this.elements.repairType.textContent = repair;
        this.elements.deviceInfo.textContent = `${brand} ${series} ${model}`;
        this.elements.qualityInfo.textContent = quality;
        this.elements.timeEstimate.textContent = this.texts.priceResult.consult;

        this.elements.contactSection.style.display = 'block';
        
        // Pour les réparations non disponibles, toujours proposer le contact
        this.elements.contactBtn.textContent = this.texts.buttons.contact;
        this.elements.contactBtn.onclick = () => window.location.href = `tel:${this.config.contact.phoneNumber}`;

        this.hideCurrentStepAndMoveNavigation();
    }

    updateContactButton() {
        if (this.currentUser) {
            this.elements.contactBtn.textContent = this.texts.buttons.appointment;
        } else {
            this.elements.contactBtn.textContent = this.texts.buttons.login;
        }
    }

    hideResults() {
        this.elements.priceResult.style.display = 'none';
        this.elements.contactSection.style.display = 'none';
        this.restoreNormalView();
    }

    restoreNormalView() {
        const currentStepElement = document.getElementById(`step-${this.currentStep}`);
        if (currentStepElement) {
            currentStepElement.style.display = 'block';
        }

        const navigation = document.querySelector('.navigation');
        const lastFormStep = document.getElementById('step-5');
        if (navigation && lastFormStep) {
            lastFormStep.parentNode.insertBefore(navigation, lastFormStep.nextSibling);
        }
    }

    hideCurrentStepAndMoveNavigation() {
        const currentStepElement = document.getElementById(`step-${this.currentStep}`);
        if (currentStepElement) {
            currentStepElement.style.display = 'none';
        }

        const navigation = document.querySelector('.navigation');
        const contactSection = this.elements.contactSection;
        if (navigation && contactSection) {
            contactSection.parentNode.insertBefore(navigation, contactSection.nextSibling);
        }
    }

    // ===== GESTION DU RÉSUMÉ =====
    
    updateSummary() {
        let hasSelections = false;

        // Réparation
        if (this.userSelections.repair) {
            this.elements.summaryRepairValue.childNodes[0].textContent = this.userSelections.repair;
            this.elements.summaryRepair.style.display = 'flex';
            hasSelections = true;
        } else {
            this.elements.summaryRepair.style.display = 'none';
        }

        // Qualité
        if (this.userSelections.quality) {
            this.elements.summaryQualityValue.childNodes[0].textContent = this.userSelections.quality;
            this.elements.summaryQuality.style.display = 'flex';
            hasSelections = true;
        } else {
            this.elements.summaryQuality.style.display = 'none';
        }

        // Marque
        if (this.userSelections.brand) {
            this.elements.summaryBrandValue.childNodes[0].textContent = this.userSelections.brand;
            this.elements.summaryBrand.style.display = 'flex';
            hasSelections = true;
        } else {
            this.elements.summaryBrand.style.display = 'none';
        }

        // Série
        if (this.userSelections.series) {
            this.elements.summarySeriesValue.childNodes[0].textContent = this.userSelections.series;
            this.elements.summarySeries.style.display = 'flex';
            hasSelections = true;
        } else {
            this.elements.summarySeries.style.display = 'none';
        }

        // Afficher/masquer le résumé
        if (hasSelections) {
            this.elements.summaryBox.classList.add('visible');
        } else {
            this.elements.summaryBox.classList.remove('visible');
        }
    }

    // ===== POPULATION DES OPTIONS =====
    
    populateBrands() {
        if (!this.dataTable.length) return;
        
        const brands = [...new Set(this.dataTable.map(r => r["Marque"]).filter(Boolean))].sort();
        
        this.elements.brandOptions.innerHTML = '';
        brands.forEach(brand => {
            const button = this.createOptionButton(brand, this.options.defaultIcons.brand, brand, '', true, 'brand');
            this.elements.brandOptions.appendChild(button);

            // Pré-sélectionner si déjà choisi
            if (this.userSelections.brand === brand) {
                button.classList.add('selected');
            }
        });
    }

    populateSeries(brand) {
        if (!this.dataTable.length || !brand) return;
        
        const series = [...new Set(this.dataTable
            .filter(r => r["Marque"] === brand)
            .map(r => r["Série"])
            .filter(Boolean))]
            .sort();

        this.elements.seriesOptions.innerHTML = '';
        series.forEach(s => {
            const button = this.createOptionButton(s, this.options.defaultIcons.series, s, '', true, 'series');
            this.elements.seriesOptions.appendChild(button);

            // Pré-sélectionner si déjà choisi
            if (this.userSelections.series === s) {
                button.classList.add('selected');
            }
        });
    }

    populateModels(brand, series) {
        if (!this.dataTable.length || !brand || !series) return;
        
        let models = [...new Set(this.dataTable
            .filter(r => r["Marque"] === brand && r["Série"] === series)
            .map(r => r["Modèle"])
            .filter(Boolean))];

        // Tri intelligent pour Apple
        if (brand === 'Apple' && this.options.sorting.appleSorting.enabled) {
            models = this.sortAppleModels(models);
        } else {
            models.sort();
        }

        this.elements.modelOptions.innerHTML = '';
        models.forEach(m => {
            const button = this.createOptionButton(m, this.options.defaultIcons.model, m, '', true, 'model');
            this.elements.modelOptions.appendChild(button);

            // Pré-sélectionner si déjà choisi
            if (this.userSelections.model === m) {
                button.classList.add('selected');
            }
        });
    }

    sortAppleModels(models) {
        return models.sort((a, b) => {
            const getIphoneNumber = (model) => {
                const match = model.match(/iPhone (\d+)/);
                return match ? parseInt(match[1]) : 999;
            };

            const numA = getIphoneNumber(a);
            const numB = getIphoneNumber(b);

            // Si même numéro, trier par variante
            if (numA === numB) {
                const getVariantOrder = (model) => {
                    const variantOrder = this.options.sorting.appleSorting.variantOrder;
                    if (model.includes('Mini')) return variantOrder.Mini;
                    if (model.includes('Pro Max')) return variantOrder['Pro Max'];
                    if (model.includes('Plus')) return variantOrder.Plus;
                    if (model.includes('Pro')) return variantOrder.Pro;
                    return variantOrder.Standard;
                };

                return getVariantOrder(a) - getVariantOrder(b);
            }

            return numA - numB;
        });
    }

    // ===== CRÉATION D'ÉLÉMENTS =====
    
    createOptionButton(value, icon, title, subtitle, isAvailable, type) {
        const button = document.createElement('div');
        button.className = `option-button ${!isAvailable ? 'disabled' : ''}`;
        button.setAttribute('data-value', value);

        if (isAvailable) {
            button.onclick = () => this.selectOption(type, value, button);
            button.style.opacity = this.options.styles.availableOpacity;
            button.style.cursor = 'pointer';
            button.title = '';
        } else {
            button.style.opacity = this.options.styles.unavailableOpacity;
            button.style.cursor = 'not-allowed';
            button.title = this.texts.tooltips.optionUnavailable;
            button.onclick = null;
        }

        let content = `
            <div class="option-icon">${icon}</div>
            <div class="option-title">${title}</div>
        `;
        
        if (subtitle) {
            content += `<div class="option-subtitle">${subtitle}</div>`;
        }
        
        if (!isAvailable) {
            content += `<div class="option-subtitle" style="color: ${this.options.styles.unavailableColor};">${this.options.styles.unavailableMessage}</div>`;
        }

        button.innerHTML = content;
        return button;
    }

    // ===== SÉLECTION D'OPTIONS =====
    
    selectOption(type, value, buttonElement) {
        // Désélectionner les autres boutons du même groupe
        const container = buttonElement.parentElement;
        container.querySelectorAll('.option-button').forEach(btn => {
            btn.classList.remove('selected');
        });

        // Sélectionner le bouton cliqué
        buttonElement.classList.add('selected');

        // Sauvegarder la sélection
        this.userSelections[type] = value;

        // Mettre à jour le récapitulatif
        this.updateSummary();

        // Actions spécifiques selon le type
        this.handleSelection(type, value);
    }

    handleSelection(type, value) {
        switch(type) {
            case 'repair':
            case 'quality':
                break;
            case 'brand':
                this.populateSeries(value);
                // Reset les sélections suivantes
                this.userSelections.series = '';
                this.userSelections.model = '';
                break;
            case 'series':
                this.populateModels(this.userSelections.brand, value);
                // Reset le modèle
                this.userSelections.model = '';
                break;
            case 'model':
                this.calculatePrice();
                return; // On ne veut pas avancer automatiquement pour le modèle
        }

        // Avancer automatiquement à l'étape suivante
        if (this.config.ui.autoAdvance && this.currentStep < this.config.ui.totalSteps) {
            setTimeout(() => {
                this.currentStep++;
                this.showStep(this.currentStep);
                this.updateProgress();
            }, this.config.ui.animationDuration);
        }
    }

    // ===== RÉINITIALISATION =====
    
    resetForm() {
        console.log('🔄 Réinitialisation complète du formulaire...');

        // Vider toutes les sélections
        this.userSelections = {};
        this.currentStep = 1;

        // Masquer les éléments de résultat
        this.elements.priceResult.style.display = 'none';
        this.elements.contactSection.style.display = 'none';
        this.elements.summaryBox.classList.remove('visible');

        // Masquer les formulaires
        const appointmentForm = document.getElementById('appointmentForm');
        const loginSection = document.getElementById('loginSection');
        if (appointmentForm) appointmentForm.style.display = 'none';
        if (loginSection) loginSection.style.display = 'none';

        // Vider les conteneurs dynamiques
        this.elements.seriesOptions.innerHTML = '';
        this.elements.modelOptions.innerHTML = '';

        // Désélectionner tous les boutons
        document.querySelectorAll('.option-button.selected').forEach(btn => {
            btn.classList.remove('selected');
        });

        // Remettre la navigation à sa place
        this.restoreNormalView();

        // Mettre à jour l'affichage
        this.updateSummary();
        this.showStep(1);
        this.updateProgress();

        console.log('✅ Réinitialisation terminée');
    }

    // ===== UTILITAIRES =====
    
    showForm() {
        this.elements.loading.style.display = 'none';
        this.elements.form.style.display = 'block';
        this.updateProgress();
    }

    showError() {
        this.elements.loading.style.display = 'none';
        this.elements.error.style.display = 'block';
    }

    log(message, data = null) {
        if (this.config && this.config.debug.enableLogging) {
            console.log(message, data);
        }
    }

    // ===== GETTERS =====
    
    get totalSteps() {
        return this.config ? this.config.ui.totalSteps : 5;
    }

    get isComplete() {
        return this.userSelections.repair && 
               this.userSelections.quality && 
               this.userSelections.brand && 
               this.userSelections.series && 
               this.userSelections.model;
    }
}

// Export pour utilisation
window.ConfiguratorCore = ConfiguratorCore;ityInfo.textContent = quality;
        this.elements.timeEstimate.textContent = this.config.repair.times[repair] || '30-60 minutes';

        this.elements.contactSection.style.display = 'block';

        // Adapter le texte du bouton selon l'état de connexion
        this.updateContactButton();
        this.hideCurrentStepAndMoveNavigation();
    }

    showUnavailable() {
        const { repair, quality, brand, series, model } = this.userSelections;
        
        this.elements.priceMain.textContent = this.texts.priceResult.unavailable;
        this.elements.priceResult.className = 'price-result unavailable';
        this.elements.priceResult.style.display = 'block';

        this.elements.repairType.textContent = repair;
        this.elements.deviceInfo.textContent = `${brand} ${series} ${model}`;
        this.elements.qual
