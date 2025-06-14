// ===== FILTRAGE INTELLIGENT - Système de filtrage réversible =====

class SmartFiltering {
    constructor(core) {
        this.core = core;
        this.isActive = false;
    }

    // ===== INITIALISATION =====
    
    initialize() {
        try {
            console.log('🚀 Initialisation du filtrage intelligent...');

            if (!this.core.dataTable || this.core.dataTable.length === 0) {
                console.warn('⚠️ Pas de données, filtrage intelligent désactivé');
                return false;
            }

            // Remplacer les fonctions par les versions avec filtrage
            this.overrideMethods();
            
            // Ajouter les styles pour les options désactivées
            this.addFilteringStyles();

            this.isActive = true;
            console.log('✅ Filtrage intelligent activé');
            return true;

        } catch (error) {
            console.error('❌ Erreur lors de l\'initialisation du filtrage:', error);
            return false;
        }
    }

    overrideMethods() {
        // Sauvegarder les méthodes originales
        this.originalMethods = {
            selectOption: this.core.selectOption.bind(this.core),
            populateBrands: this.core.populateBrands.bind(this.core),
            populateSeries: this.core.populateSeries.bind(this.core),
            populateModels: this.core.populateModels.bind(this.core)
        };

        // Remplacer par les versions avec filtrage
        this.core.selectOption = this.selectOptionWithFiltering.bind(this);
        this.core.populateBrands = this.populateBrandsWithFiltering.bind(this);
        this.core.populateSeries = this.populateSeriesWithFiltering.bind(this);
        this.core.populateModels = this.populateModelsWithFiltering.bind(this);
    }

    addFilteringStyles() {
        if (!document.getElementById('smart-filtering-styles')) {
            const style = document.createElement('style');
            style.id = 'smart-filtering-styles';
            style.textContent = `
                .configurateur-container .option-button.disabled {
                    opacity: 0.3 !important;
                    cursor: not-allowed !important;
                    pointer-events: none;
                }

                .configurateur-container .option-button.disabled:hover {
                    transform: none !important;
                    box-shadow: none !important;
                    border-color: #dee2e6 !important;
                    background: white !important;
                }

                .configurateur-container .option-button.disabled .option-subtitle {
                    color: #dc3545 !important;
                    font-weight: 600;
                }
            `;
            document.head.appendChild(style);
        }
    }

    // ===== CALCUL DES OPTIONS DISPONIBLES =====
    
    calculateAvailableOptions() {
        try {
            if (!this.core.dataTable || this.core.dataTable.length === 0) {
                console.warn('⚠️ dataTable vide ou non défini');
                return { 
                    available: { repairs: new Set(), qualities: new Set(), brands: new Set(), series: new Set(), models: new Set() }, 
                    validRows: [] 
                };
            }

            const available = {
                repairs: new Set(),
                qualities: new Set(),
                brands: new Set(),
                series: new Set(),
                models: new Set()
            };

            // Trouver la colonne de prix
            const firstRow = this.core.dataTable[0];
            const priceKey = Object.keys(firstRow).find(key =>
                key.toLowerCase().includes('prix') && key.toLowerCase().includes('standard')
            ) || Object.keys(firstRow).find(key => key.toLowerCase().includes('prix'));

            if (!priceKey) {
                console.warn('⚠️ Colonne prix non trouvée, utilisation de toutes les lignes');
                this.core.dataTable.forEach(row => {
                    if (row["Type de réparation"]) available.repairs.add(row["Type de réparation"]);
                    if (row["Qualité"]) available.qualities.add(row["Qualité"]);
                    if (row["Marque"]) available.brands.add(row["Marque"]);
                    if (row["Série"]) available.series.add(row["Série"]);
                    if (row["Modèle"]) available.models.add(row["Modèle"]);
                });
                return { available, validRows: this.core.dataTable };
            }

            // Filtrer les lignes avec prix valide
            const validRows = this.core.dataTable.filter(row => {
                const price = row[priceKey];
                return price && price.toString().trim() !== "" && price.toString().trim() !== "0";
            });

            // Collecter toutes les combinaisons valides
            validRows.forEach(row => {
                if (row["Type de réparation"]) available.repairs.add(row["Type de réparation"]);
                if (row["Qualité"]) available.qualities.add(row["Qualité"]);
                if (row["Marque"]) available.brands.add(row["Marque"]);
                if (row["Série"]) available.series.add(row["Série"]);
                if (row["Modèle"]) available.models.add(row["Modèle"]);
            });

            return { available, validRows };

        } catch (error) {
            console.error('❌ Erreur dans calculateAvailableOptions:', error);
            return { 
                available: { repairs: new Set(), qualities: new Set(), brands: new Set(), series: new Set(), models: new Set() }, 
                validRows: [] 
            };
        }
    }

    getFilteredOptions(currentSelections = {}) {
        try {
            const { validRows } = this.calculateAvailableOptions();

            // Filtrer les lignes selon les sélections actuelles
            let filteredRows = validRows.filter(row => {
                if (currentSelections.repair && row["Type de réparation"] !== currentSelections.repair) return false;
                if (currentSelections.quality && row["Qualité"] !== currentSelections.quality) return false;
                if (currentSelections.brand && row["Marque"] !== currentSelections.brand) return false;
                if (currentSelections.series && row["Série"] !== currentSelections.series) return false;
                if (currentSelections.model && row["Modèle"] !== currentSelections.model) return false;
                return true;
            });

            // Calculer les options disponibles
            const availableOptions = {
                repairs: new Set(),
                qualities: new Set(),
                brands: new Set(),
                series: new Set(),
                models: new Set()
            };

            filteredRows.forEach(row => {
                if (row["Type de réparation"]) availableOptions.repairs.add(row["Type de réparation"]);
                if (row["Qualité"]) availableOptions.qualities.add(row["Qualité"]);
                if (row["Marque"]) availableOptions.brands.add(row["Marque"]);
                if (row["Série"]) availableOptions.series.add(row["Série"]);
                if (row["Modèle"]) availableOptions.models.add(row["Modèle"]);
            });

            return availableOptions;

        } catch (error) {
            console.error('❌ Erreur dans getFilteredOptions:', error);
            return { repairs: new Set(), qualities: new Set(), brands: new Set(), series: new Set(), models: new Set() };
        }
    }

    // ===== SÉLECTION AVEC FILTRAGE =====
    
    selectOptionWithFiltering(type, value, buttonElement) {
        try {
            console.log(`🎯 Sélection: ${type} = ${value}`);

            // Vérifier que l'option est disponible
            const currentOptions = this.getFilteredOptions(this.core.userSelections);
            let isAvailable = false;

            switch(type) {
                case 'repair':
                    isAvailable = currentOptions.repairs.has(value);
                    break;
                case 'quality':
                    isAvailable = currentOptions.qualities.has(value);
                    break;
                case 'brand':
                    isAvailable = currentOptions.brands.has(value);
                    break;
                case 'series':
                    isAvailable = currentOptions.series.has(value);
                    break;
                case 'model':
                    isAvailable = currentOptions.models.has(value);
                    break;
            }

            if (!isAvailable) {
                console.warn(`⚠️ Option ${value} non disponible pour ${type}`);
                return;
            }

            // Sauvegarder l'ancien état
            const oldSelections = { ...this.core.userSelections };

            // Mettre à jour la sélection
            this.core.userSelections[type] = value;

            // Nettoyer les sélections qui deviennent invalides
            this.validateSelections(type);

            // Mettre à jour visuellement TOUTES les étapes
            this.refreshAllSteps();

            // Mettre à jour le résumé
            this.core.updateSummary();

            // Gérer l'UI
            this.updateButtonSelection(buttonElement, type);

            // Calculer le prix si on a un modèle complet
            if (this.core.isComplete) {
                this.core.calculatePrice();
                return;
            } else {
                // Masquer le prix si la sélection est incomplète
                if (this.core.elements.priceResult.style.display === 'block') {
                    this.core.hideResults();
                }
            }

            // Avancement automatique
            const hasAdvanced = JSON.stringify(oldSelections) !== JSON.stringify(this.core.userSelections);
            if (hasAdvanced && this.core.config.ui.autoAdvance && this.core.currentStep < this.core.totalSteps) {
                setTimeout(() => {
                    this.core.currentStep++;
                    this.core.showStep(this.core.currentStep);
                    this.core.updateProgress();
                }, this.core.config.ui.animationDuration);
            }

            console.log('✅ Sélection terminée, état:', this.core.userSelections);

        } catch (error) {
            console.error('❌ Erreur dans selectOptionWithFiltering:', error);
            // Fallback vers la méthode originale
            if (this.originalMethods.selectOption) {
                this.originalMethods.selectOption(type, value, buttonElement);
            }
        }
    }

    validateSelections(changedType) {
        switch(changedType) {
            case 'repair':
            case 'quality':
                this.validateSelectionsInReverse();
                break;
            case 'brand':
                this.core.userSelections.series = '';
                this.core.userSelections.model = '';
                break;
            case 'series':
                this.core.userSelections.model = '';
                break;
        }
    }

    validateSelectionsInReverse() {
        let hasChanged = false;
        const baseOptions = this.getFilteredOptions({});

        // Validation en cascade (de la fin vers le début)
        if (this.core.userSelections.model) {
            const modelOptions = this.getFilteredOptions({
                repair: this.core.userSelections.repair,
                quality: this.core.userSelections.quality,
                brand: this.core.userSelections.brand,
                series: this.core.userSelections.series
            });

            if (!modelOptions.models.has(this.core.userSelections.model)) {
                this.core.userSelections.model = '';
                hasChanged = true;
            }
        }

        if (this.core.userSelections.series) {
            const seriesOptions = this.getFilteredOptions({
                repair: this.core.userSelections.repair,
                quality: this.core.userSelections.quality,
                brand: this.core.userSelections.brand
            });

            if (!seriesOptions.series.has(this.core.userSelections.series)) {
                this.core.userSelections.series = '';
                this.core.userSelections.model = '';
                hasChanged = true;
            }
        }

        if (this.core.userSelections.brand) {
            const brandOptions = this.getFilteredOptions({
                repair: this.core.userSelections.repair,
                quality: this.core.userSelections.quality
            });

            if (!brandOptions.brands.has(this.core.userSelections.brand)) {
                this.core.userSelections.brand = '';
                this.core.userSelections.series = '';
                this.core.userSelections.model = '';
                hasChanged = true;
            }
        }

        if (this.core.userSelections.quality) {
            const qualityOptions = this.getFilteredOptions({
                repair: this.core.userSelections.repair
            });

            if (!qualityOptions.qualities.has(this.core.userSelections.quality)) {
                this.core.userSelections.quality = '';
                hasChanged = true;
            }
        }

        if (this.core.userSelections.repair && !baseOptions.repairs.has(this.core.userSelections.repair)) {
            this.core.userSelections.repair = '';
            hasChanged = true;
        }

        return hasChanged;
    }

    updateButtonSelection(buttonElement, type) {
        // Désélectionner tous les boutons du même groupe
        const container = buttonElement.parentElement;
        container.querySelectorAll('.option-button').forEach(btn => {
            btn.classList.remove('selected');
        });

        // Sélectionner le bouton cliqué
        buttonElement.classList.add('selected');
    }

    // ===== POPULATION AVEC FILTRAGE =====
    
    populateBrandsWithFiltering() {
        try {
            if (!this.core.dataTable || this.core.dataTable.length === 0) {
                return this.originalMethods.populateBrands();
            }

            const allBrands = [...new Set(this.core.dataTable.map(r => r["Marque"]).filter(Boolean))].sort();
            const availableOptions = this.getFilteredOptions(this.core.userSelections);

            this.core.elements.brandOptions.innerHTML = '';

            allBrands.forEach(brand => {
                const isAvailable = availableOptions.brands.has(brand);
                const button = this.createFilteredOptionButton(brand, this.core.options.defaultIcons.brand, brand, '', isAvailable, 'brand');
                this.core.elements.brandOptions.appendChild(button);

                if (this.core.userSelections.brand === brand && isAvailable) {
                    button.classList.add('selected');
                }
            });

        } catch (error) {
            console.error('❌ Erreur dans populateBrandsWithFiltering:', error);
            return this.originalMethods.populateBrands();
        }
    }

    populateSeriesWithFiltering(brand) {
        try {
            if (!this.core.dataTable || this.core.dataTable.length === 0) {
                return this.originalMethods.populateSeries(brand);
            }

            const allSeries = [...new Set(this.core.dataTable
                .filter(r => r["Marque"] === brand)
                .map(r => r["Série"])
                .filter(Boolean))]
                .sort();

            const availableOptions = this.getFilteredOptions(this.core.userSelections);

            this.core.elements.seriesOptions.innerHTML = '';

            allSeries.forEach(series => {
                const isAvailable = availableOptions.series.has(series);
                const button = this.createFilteredOptionButton(series, this.core.options.defaultIcons.series, series, '', isAvailable, 'series');
                this.core.elements.seriesOptions.appendChild(button);

                if (this.core.userSelections.series === series && isAvailable) {
                    button.classList.add('selected');
                }
            });

        } catch (error) {
            console.error('❌ Erreur dans populateSeriesWithFiltering:', error);
            return this.originalMethods.populateSeries(brand);
        }
    }

    populateModelsWithFiltering(brand, series) {
        try {
            if (!this.core.dataTable || this.core.dataTable.length === 0) {
                return this.originalMethods.populateModels(brand, series);
            }

            let allModels = [...new Set(this.core.dataTable
                .filter(r => r["Marque"] === brand && r["Série"] === series)
                .map(r => r["Modèle"])
                .filter(Boolean))];

            // Tri intelligent pour Apple
            if (brand === 'Apple' && this.core.options.sorting.appleSorting.enabled) {
                allModels = this.core.sortAppleModels(allModels);
            } else {
                allModels.sort();
            }

            const availableOptions = this.getFilteredOptions(this.core.userSelections);

            this.core.elements.modelOptions.innerHTML = '';

            allModels.forEach(model => {
                const isAvailable = availableOptions.models.has(model);
                const button = this.createFilteredOptionButton(model, this.core.options.defaultIcons.model, model, '', isAvailable, 'model');
                this.core.elements.modelOptions.appendChild(button);

                if (this.core.userSelections.model === model && isAvailable) {
                    button.classList.add('selected');
                }
            });

        } catch (error) {
            console.error('❌ Erreur dans populateModelsWithFiltering:', error);
            return this.originalMethods.populateModels(brand, series);
        }
    }

    createFilteredOptionButton(value, icon, title, subtitle, isAvailable, type) {
        const button = document.createElement('div');
        button.className = `option-button ${!isAvailable ? 'disabled' : ''}`;
        button.setAttribute('data-value', value);

        if (isAvailable) {
            button.onclick = () => this.selectOptionWithFiltering(type, value, button);
            button.style.opacity = this.core.options.styles.availableOpacity;
            button.style.cursor = 'pointer';
            button.title = '';
        } else {
            button.style.opacity = this.core.options.styles.unavailableOpacity;
            button.style.cursor = 'not-allowed';
            button.title = this.core.texts.tooltips.optionUnavailable;
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
            content += `<div class="option-subtitle" style="color: ${this.core.options.styles.unavailableColor};">${this.core.options.styles.unavailableMessage}</div>`;
        }

        button.innerHTML = content;
        return button;
    }

    // ===== REFRESH COMPLET =====
    
    refreshAllSteps() {
        try {
            console.log('🔄 Refresh complet de toutes les étapes...');

            const availableOptions = this.getFilteredOptions(this.core.userSelections);

            // Mettre à jour toutes les étapes
            this.refreshRepairOptions(availableOptions);
            this.refreshQualityOptions(availableOptions);
            this.refreshBrandOptions(availableOptions);

            if (this.core.userSelections.brand) {
                this.refreshSeriesOptions(availableOptions);
            } else {
                this.core.elements.seriesOptions.innerHTML = '';
            }

            if (this.core.userSelections.brand && this.core.userSelections.series) {
                this.refreshModelOptions(availableOptions);
            } else {
                this.core.elements.modelOptions.innerHTML = '';
            }

            console.log('✅ Refresh terminé');

        } catch (error) {
            console.error('❌ Erreur dans refreshAllSteps:', error);
        }
    }

    refreshRepairOptions(availableOptions) {
        const repairOptions = this.core.options.repairOptions;
        
        Object.keys(repairOptions).forEach(repairKey => {
            const repair = repairOptions[repairKey];
            const button = document.querySelector(`#repairOptions .option-button[data-value="${repair.value}"]`);
            if (button) {
                const isAvailable = availableOptions.repairs.has(repair.value);
                this.updateButtonState(button, isAvailable, repair.value, 'repair');

                // Remettre le contenu correct si nécessaire
                if (!button.querySelector('.option-icon')) {
                    button.innerHTML = `
                        <div class="option-icon">${repair.icon}</div>
                        <div class="option-title">${repair.title}</div>
                        <div class="option-subtitle">${repair.subtitle}</div>
                    `;
                }
            }
        });
    }

    refreshQualityOptions(availableOptions) {
        const qualityOptions = this.core.options.qualityOptions;
        
        Object.keys(qualityOptions).forEach(qualityKey => {
            const quality = qualityOptions[qualityKey];
            const button = document.querySelector(`#qualityOptions .option-button[data-value="${quality.value}"]`);
            if (button) {
                const isAvailable = availableOptions.qualities.has(quality.value);
                this.updateButtonState(button, isAvailable, quality.value, 'quality');

                // Remettre le contenu correct si nécessaire
                if (!button.querySelector('.option-icon')) {
                    button.innerHTML = `
                        <div class="option-icon">${quality.icon}</div>
                        <div class="option-title">${quality.title}</div>
                        <div class="option-subtitle">${quality.subtitle}</div>
                    `;
                }
            }
        });
    }

    refreshBrandOptions(availableOptions) {
        if (!this.core.dataTable || this.core.dataTable.length === 0) return;

        const allBrands = [...new Set(this.core.dataTable.map(r => r["Marque"]).filter(Boolean))].sort();

        this.core.elements.brandOptions.innerHTML = '';

        allBrands.forEach(brand => {
            const isAvailable = availableOptions.brands.has(brand);
            const button = this.createFilteredOptionButton(brand, this.core.options.defaultIcons.brand, brand, '', isAvailable, 'brand');
            this.core.elements.brandOptions.appendChild(button);

            if (this.core.userSelections.brand === brand && isAvailable) {
                button.classList.add('selected');
            }
        });
    }

    refreshSeriesOptions(availableOptions) {
        if (!this.core.userSelections.brand || !this.core.dataTable || this.core.dataTable.length === 0) return;

        const allSeries = [...new Set(this.core.dataTable
            .filter(r => r["Marque"] === this.core.userSelections.brand)
            .map(r => r["Série"])
            .filter(Boolean))]
            .sort();

        this.core.elements.seriesOptions.innerHTML = '';

        allSeries.forEach(series => {
            const isAvailable = availableOptions.series.has(series);
            const button = this.createFilteredOptionButton(series, this.core.options.defaultIcons.series, series, '', isAvailable, 'series');
            this.core.elements.seriesOptions.appendChild(button);

            if (this.core.userSelections.series === series && isAvailable) {
                button.classList.add('selected');
            }
        });
    }

    refreshModelOptions(availableOptions) {
        if (!this.core.userSelections.brand || !this.core.userSelections.series || !this.core.dataTable || this.core.dataTable.length === 0) return;

        let allModels = [...new Set(this.core.dataTable
            .filter(r => r["Marque"] === this.core.userSelections.brand && r["Série"] === this.core.userSelections.series)
            .map(r => r["Modèle"])
            .filter(Boolean))];

        // Tri intelligent pour Apple
        if (this.core.userSelections.brand === 'Apple' && this.core.options.sorting.appleSorting.enabled) {
            allModels = this.core.sortAppleModels(allModels);
        } else {
            allModels.sort();
        }

        this.core.elements.modelOptions.innerHTML = '';

        allModels.forEach(model => {
            const isAvailable = availableOptions.models.has(model);
            const button = this.createFilteredOptionButton(model, this.core.options.defaultIcons.model, model, '', isAvailable, 'model');
            this.core.elements.modelOptions.appendChild(button);

            if (this.core.userSelections.model === model && isAvailable) {
                button.classList.add('selected');
            }
        });
    }

    updateButtonState(button, isAvailable, value, type) {
        if (isAvailable) {
            button.classList.remove('disabled');
            button.style.opacity = this.core.options.styles.availableOpacity;
            button.style.cursor = 'pointer';
            button.title = '';
            button.onclick = () => this.selectOptionWithFiltering(type, value, button);

            // Supprimer le message "Non disponible" s'il existe
            const unavailableMsg = button.querySelector(`.option-subtitle[style*="color: ${this.core.options.styles.unavailableColor}"]`);
            if (unavailableMsg) {
                unavailableMsg.remove();
            }
        } else {
            button.classList.add('disabled');
            button.style.opacity = this.core.options.styles.unavailableOpacity;
            button.style.cursor = 'not-allowed';
            button.title = this.core.texts.tooltips.optionUnavailable;
            button.onclick = null;

            // Ajouter le message "Non disponible" s'il n'existe pas
            if (!button.querySelector(`.option-subtitle[style*="color: ${this.core.options.styles.unavailableColor}"]`)) {
                const unavailableMsg = document.createElement('div');
                unavailableMsg.className = 'option-subtitle';
                unavailableMsg.style.color = this.core.options.styles.unavailableColor;
                unavailableMsg.style.fontWeight = '600';
                unavailableMsg.textContent = this.core.options.styles.unavailableMessage;
                button.appendChild(unavailableMsg);
            }
        }

        // Maintenir la sélection si c'est l'option courante ET qu'elle est disponible
        if (this.core.userSelections[type] === value && isAvailable) {
            button.classList.add('selected');
        } else if (!isAvailable) {
            button.classList.remove('selected');
        }
    }

    // ===== SÉLECTION DEPUIS DROPDOWN =====
    
    selectFromDropdown(type, value) {
        console.log(`🎯 Sélection dropdown: ${type} = ${value}`);

        // Vérifier que l'option est disponible
        const availableOptions = this.getFilteredOptions(this.core.userSelections);
        let isValid = false;

        switch(type) {
            case 'repair':
                isValid = availableOptions.repairs.has(value);
                break;
            case 'quality':
                isValid = availableOptions.qualities.has(value);
                break;
            case 'brand':
                isValid = availableOptions.brands.has(value);
                break;
            case 'series':
                isValid = availableOptions.series.has(value);
                break;
        }

        if (!isValid) {
            alert(this.core.texts.errors.optionUnavailable);
            return;
        }

        // Simuler un clic sur le bon bouton
        let targetButton = null;

        switch(type) {
            case 'repair':
                targetButton = document.querySelector(`#repairOptions .option-button[data-value="${value}"]`);
                break;
            case 'quality':
                targetButton = document.querySelector(`#qualityOptions .option-button[data-value="${value}"]`);
                break;
            case 'brand':
                targetButton = document.querySelector(`#brandOptions .option-button[data-value="${value}"]`);
                break;
            case 'series':
                targetButton = document.querySelector(`#seriesOptions .option-button[data-value="${value}"]`);
                break;
        }

        if (targetButton && !targetButton.classList.contains('disabled')) {
            this.selectOptionWithFiltering(type, value, targetButton);
        } else {
            console.warn(`⚠️ Bouton non trouvé ou désactivé pour ${type} = ${value}`);
        }
    }

    // ===== RÉINITIALISATION =====
    
    resetFiltering() {
        console.log('🔄 Reset du système de filtrage...');

        // Supprimer tous les messages "Non disponible"
        this.removeAllUnavailableMessages();

        // Remettre toutes les options comme disponibles
        this.resetAllOptionsToAvailable();

        console.log('✅ Filtrage réinitialisé');
    }

    removeAllUnavailableMessages() {
        console.log('🧹 Suppression de tous les messages "Non disponible"...');

        try {
            document.querySelectorAll('.option-button').forEach(button => {
                const subtitles = button.querySelectorAll('.option-subtitle');
                subtitles.forEach(subtitle => {
                    if (subtitle.textContent.toLowerCase().includes('non disponible') ||
                        subtitle.textContent.toLowerCase().includes('indisponible') ||
                        subtitle.style.color.includes(this.core.options.styles.unavailableColor)) {
                        subtitle.remove();
                    }
                });
            });

            console.log('✅ Tous les messages "Non disponible" supprimés');

        } catch (error) {
            console.error('❌ Erreur lors de la suppression des messages:', error);
        }
    }

    resetAllOptionsToAvailable() {
        console.log('🔓 Réactivation de toutes les options...');

        try {
            // Réactiver toutes les options de réparation
            const repairButtons = document.querySelectorAll('#repairOptions .option-button');
            repairButtons.forEach(button => {
                this.resetButtonToAvailable(button, 'repair');
            });

            // Réactiver toutes les options de qualité
            const qualityButtons = document.querySelectorAll('#qualityOptions .option-button');
            qualityButtons.forEach(button => {
                this.resetButtonToAvailable(button, 'quality');
            });

            // Repeupler et réactiver toutes les marques
            this.resetBrandOptions();

            console.log('✅ Toutes les options réactivées');

        } catch (error) {
            console.error('❌ Erreur lors de la réactivation des options:', error);
        }
    }

    resetButtonToAvailable(button, type) {
        if (!button) return;

        const value = button.getAttribute('data-value');

        // Remettre l'apparence normale
        button.classList.remove('disabled', 'selected');
        button.style.opacity = this.core.options.styles.availableOpacity;
        button.style.cursor = 'pointer';
        button.title = '';
        button.style.pointerEvents = 'auto';

        // Remettre le onclick approprié
        button.onclick = () => this.selectOptionWithFiltering(type, value, button);

        // Supprimer le message "Non disponible" s'il existe
        const unavailableMsg = button.querySelector(`.option-subtitle[style*="color: ${this.core.options.styles.unavailableColor}"]`);
        if (unavailableMsg) {
            unavailableMsg.remove();
        }
    }

    resetBrandOptions() {
        if (!this.core.dataTable || this.core.dataTable.length === 0) return;

        console.log('🏭 Repopulation complète des marques...');

        const allBrands = [...new Set(this.core.dataTable.map(r => r["Marque"]).filter(Boolean))].sort();

        // Vider et repeupler complètement
        this.core.elements.brandOptions.innerHTML = '';

        allBrands.forEach(brand => {
            const button = document.createElement('div');
            button.className = 'option-button';
            button.setAttribute('data-value', brand);
            button.onclick = () => this.selectOptionWithFiltering('brand', brand, button);

            button.innerHTML = `
                <div class="option-icon">${this.core.options.defaultIcons.brand}</div>
                <div class="option-title">${brand}</div>
            `;

            this.core.elements.brandOptions.appendChild(button);
        });

        console.log(`✅ ${allBrands.length} marques repeuplées et réactivées`);
    }

    // ===== UTILITAIRES =====
    
    isOptionAvailable(type, value, selections = null) {
        const currentSelections = selections || this.core.userSelections;
        const availableOptions = this.getFilteredOptions(currentSelections);
        
        switch(type) {
            case 'repair': return availableOptions.repairs.has(value);
            case 'quality': return availableOptions.qualities.has(value);
            case 'brand': return availableOptions.brands.has(value);
            case 'series': return availableOptions.series.has(value);
            case 'model': return availableOptions.models.has(value);
            default: return false;
        }
    }

    getAvailableCount(type, selections = null) {
        const currentSelections = selections || this.core.userSelections;
        const availableOptions = this.getFilteredOptions(currentSelections);
        
        switch(type) {
            case 'repair': return availableOptions.repairs.size;
            case 'quality': return availableOptions.qualities.size;
            case 'brand': return availableOptions.brands.size;
            case 'series': return availableOptions.series.size;
            case 'model': return availableOptions.models.size;
            default: return 0;
        }
    }

    // ===== DEBUGGING =====
    
    debugFilteringState() {
        if (this.core.config && this.core.config.debug.showFiltering) {
            console.log('🔍 État du filtrage intelligent:', {
                isActive: this.isActive,
                userSelections: this.core.userSelections,
                availableOptions: this.getFilteredOptions(this.core.userSelections),
                availableCounts: {
                    repairs: this.getAvailableCount('repair'),
                    qualities: this.getAvailableCount('quality'),
                    brands: this.getAvailableCount('brand'),
                    series: this.getAvailableCount('series'),
                    models: this.getAvailableCount('model')
                }
            });
        }
    }
}

// Exposer pour utilisation
window.SmartFiltering = SmartFiltering;
