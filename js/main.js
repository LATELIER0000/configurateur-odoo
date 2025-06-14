// ===== CONFIGURATEUR PRINCIPAL - Orchestrateur =====

class Configurator {
    constructor() {
        this.core = null;
        this.filtering = null;
        this.odoo = null;
        this.isInitialized = false;
    }

    // ===== INITIALISATION PRINCIPALE =====
    
    async init() {
        try {
            console.log('🚀 Démarrage du configurateur L\'Atelier...');

            // 1. Initialiser le core
            this.core = new ConfiguratorCore();
            
            // 2. Charger les configurations JSON
            await this.core.loadConfigurations();
            console.log('✅ Configurations chargées');

            // 3. Initialiser les éléments DOM
            this.core.initializeElements();
            console.log('✅ Éléments DOM initialisés');

            // 4. Charger les données CSV
            await this.core.loadCSVData();
            console.log('✅ Données CSV chargées');

            // 5. Initialiser le filtrage intelligent
            this.filtering = new SmartFiltering(this.core);
            if (this.filtering.initialize()) {
                console.log('✅ Filtrage intelligent activé');
                
                // Remplacer les méthodes du core par celles avec filtrage
                this.overrideCoreMethods();
            } else {
                console.log('⚠️ Filtrage intelligent désactivé, mode standard');
            }

            // 6. Initialiser l'intégration Odoo
            this.odoo = new OdooIntegration(this.core);
            console.log('✅ Intégration Odoo initialisée');

            // 7. Exposer les méthodes globales
            this.exposeGlobalMethods();
            
            // 8. Configurer les événements
            this.setupEventListeners();
            
            // 9. Peupler les options initiales
            this.core.populateBrands();
            console.log('✅ Options initiales peuplées');

            // 10. Configurer les dropdowns du résumé
            this.setupSummaryDropdowns();
            console.log('✅ Dropdowns configurés');

            // 11. Vérifier l'authentification
            await this.odoo.checkUserAuthentication();
            console.log('✅ Authentification vérifiée');

            // 12. Afficher le formulaire
            this.core.showForm();
            console.log('✅ Formulaire affiché');

            // 13. Restaurer l'état si nécessaire
            this.odoo.restoreFormState();
            console.log('✅ État restauré si nécessaire');

            this.isInitialized = true;
            console.log('🎉 Configurateur initialisé avec succès !');

            // 14. Debug info
            this.logInitializationSummary();

        } catch (error) {
            console.error('❌ Erreur d\'initialisation:', error);
            this.handleInitializationError(error);
        }
    }

    // ===== OVERRIDE DES MÉTHODES =====
    
    overrideCoreMethods() {
        if (this.filtering && this.filtering.isActive) {
            // Les méthodes sont déjà overridées dans SmartFiltering
            console.log('🔄 Méthodes du core remplacées par le filtrage intelligent');
        }
    }

    // ===== MÉTHODES GLOBALES =====
    
    exposeGlobalMethods() {
        // Méthodes principales accessibles globalement
        window.selectOption = (type, value, button) => {
            if (this.filtering && this.filtering.isActive) {
                this.filtering.selectOptionWithFiltering(type, value, button);
            } else {
                this.core.selectOption(type, value, button);
            }
        };

        window.goToStep = (step) => {
            this.core.goToStep(step);
        };

        window.resetForm = () => {
            this.resetForm();
        };

        window.checkAuthenticationAndShowForm = () => {
            this.odoo.checkAuthenticationAndShowForm();
        };

        window.showAppointmentForm = () => {
            this.odoo.showAppointmentForm();
        };

        window.hideAppointmentForm = () => {
            this.odoo.hideAppointmentForm();
        };

        window.submitAppointment = () => {
            this.odoo.submitAppointment();
        };

        window.showLoginSection = () => {
            this.odoo.showLoginSection();
        };

        window.hideLoginSection = () => {
            this.odoo.hideLoginSection();
        };

        window.redirectToLogin = () => {
            this.odoo.redirectToLogin();
        };

        window.redirectToRegister = () => {
            this.odoo.redirectToRegister();
        };

        window.redirectToPortal = () => {
            this.odoo.redirectToPortal();
        };

        window.logout = () => {
            this.odoo.logout();
        };

        window.selectFromDropdown = (type, value) => {
            if (this.filtering && this.filtering.isActive) {
                this.filtering.selectFromDropdown(type, value);
            } else {
                this.selectFromDropdownStandard(type, value);
            }
        };

        // Méthodes de debug
        if (this.core.config.debug.exposeFunctions) {
            window.configurator = this;
            window.debugFiltering = () => {
                if (this.filtering) {
                    this.filtering.debugFilteringState();
                } else {
                    console.log('Filtrage non actif');
                }
            };
            window.forceRefresh = () => {
                if (this.filtering && this.filtering.isActive) {
                    this.filtering.refreshAllSteps();
                } else {
                    this.core.populateBrands();
                }
            };
        }

        console.log('🌐 Méthodes globales exposées');
    }

    // ===== CONFIGURATION DES ÉVÉNEMENTS =====
    
    setupEventListeners() {
        // Raccourcis clavier
        document.addEventListener('keydown', (e) => {
            // Échap pour reset rapide
            if (e.key === 'Escape') {
                e.preventDefault();
                this.quickReset();
                console.log('⌨️ Reset rapide via Échap');
            }

            // Ctrl/Cmd + Delete pour reset complet
            if ((e.ctrlKey || e.metaKey) && e.key === 'Delete') {
                e.preventDefault();
                this.resetForm();
                console.log('⌨️ Reset complet via raccourci clavier');
            }

            // Ctrl/Cmd + D pour debug
            if ((e.ctrlKey || e.metaKey) && e.key === 'd' && this.core.config.debug.enableLogging) {
                e.preventDefault();
                this.showDebugInfo();
            }
        });

        // Gestion de la fermeture des dropdowns
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.summary-value')) {
                document.querySelectorAll('.summary-dropdown.show').forEach(dropdown => {
                    dropdown.classList.remove('show');
                });
            }
        });

        // Gestion du redimensionnement
        window.addEventListener('resize', () => {
            this.handleResize();
        });

        console.log('🎧 Événements configurés');
    }

    setupSummaryDropdowns() {
        const summaryValues = document.querySelectorAll('.summary-value[data-type]');
        summaryValues.forEach(element => {
            element.addEventListener('click', (e) => {
                e.stopPropagation();
                const type = element.getAttribute('data-type');
                this.showDropdown(type, element);
            });
        });
    }

    // ===== GESTION DES DROPDOWNS =====
    
    showDropdown(type, element) {
        // Fermer tous les autres dropdowns
        document.querySelectorAll('.summary-dropdown').forEach(dropdown => {
            dropdown.classList.remove('show');
        });

        const dropdown = element.querySelector('.summary-dropdown');
        if (!dropdown) return;

        dropdown.innerHTML = '';

        let options = [];
        let currentValue = '';

        switch(type) {
            case 'repair':
                options = this.core.options.dropdownContent.repair;
                currentValue = this.core.userSelections.repair;
                break;

            case 'quality':
                options = this.core.options.dropdownContent.quality;
                currentValue = this.core.userSelections.quality;
                break;

            case 'brand':
                if (this.core.dataTable.length > 0) {
                    const brands = [...new Set(this.core.dataTable.map(r => r["Marque"]).filter(Boolean))].sort();
                    options = brands.map(brand => ({ value: brand, text: brand }));
                }
                currentValue = this.core.userSelections.brand;
                break;

            case 'series':
                if (this.core.userSelections.brand && this.core.dataTable.length > 0) {
                    const series = [...new Set(this.core.dataTable
                        .filter(r => r["Marque"] === this.core.userSelections.brand)
                        .map(r => r["Série"])
                        .filter(Boolean))]
                        .sort();
                    options = series.map(s => ({ value: s, text: s }));
                }
                currentValue = this.core.userSelections.series;
                break;
        }

        // Positionnement intelligent
        this.positionDropdown(dropdown, element);

        // Créer les éléments
        options.forEach(option => {
            const item = document.createElement('div');
            item.className = 'dropdown-item';
            if (option.value === currentValue) {
                item.classList.add('selected');
            }
            item.textContent = option.text;
            item.onclick = (e) => {
                e.stopPropagation();
                window.selectFromDropdown(type, option.value);
                dropdown.classList.remove('show');
            };
            dropdown.appendChild(item);
        });

        dropdown.classList.add('show');

        // Fermer en cliquant ailleurs
        setTimeout(() => {
            document.addEventListener('click', function closeDropdown(e) {
                if (!element.contains(e.target)) {
                    dropdown.classList.remove('show');
                    document.removeEventListener('click', closeDropdown);
                }
            });
        }, 100);
    }

    positionDropdown(dropdown, element) {
        const containerRect = document.querySelector('.configurateur-card').getBoundingClientRect();
        const elementRect = element.getBoundingClientRect();
        const dropdownWidth = this.core.config.ui.dropdownWidth;

        const spaceRight = containerRect.right - elementRect.right;
        const spaceLeft = elementRect.left - containerRect.left;

        if (spaceRight < dropdownWidth && spaceLeft >= dropdownWidth) {
            dropdown.style.left = 'auto';
            dropdown.style.right = '0';
        } else {
            dropdown.style.left = '0';
            dropdown.style.right = 'auto';
        }
    }

    // ===== SÉLECTION STANDARD (SANS FILTRAGE) =====
    
    selectFromDropdownStandard(type, value) {
        const oldValue = this.core.userSelections[type];
        this.core.userSelections[type] = value;

        // Mettre à jour les boutons visuellement
        this.updateButtonSelections(type, value);

        switch(type) {
            case 'brand':
                if (oldValue !== value) {
                    this.core.userSelections.series = '';
                    this.core.userSelections.model = '';
                    this.core.populateSeries(value);
                }
                break;
            case 'series':
                if (oldValue !== value) {
                    this.core.userSelections.model = '';
                    this.core.populateModels(this.core.userSelections.brand, value);
                }
                break;
        }

        this.core.updateSummary();

        // Recalculer le prix si nécessaire
        if (this.core.isComplete) {
            this.core.calculatePrice();
        } else if (this.core.elements.priceResult.style.display === 'block') {
            this.core.hideResults();
        }
    }

    updateButtonSelections(type, value) {
        let container;
        switch(type) {
            case 'repair':
                container = document.getElementById('repairOptions');
                break;
            case 'quality':
                container = document.getElementById('qualityOptions');
                break;
            case 'brand':
                container = this.core.elements.brandOptions;
                break;
            case 'series':
                container = this.core.elements.seriesOptions;
                break;
            case 'model':
                container = this.core.elements.modelOptions;
                break;
        }

        if (container) {
            container.querySelectorAll('.option-button').forEach(btn => {
                btn.classList.remove('selected');
                if (btn.getAttribute('data-value') === value) {
                    btn.classList.add('selected');
                }
            });
        }
    }

    // ===== RÉINITIALISATION =====
    
    resetForm() {
        console.log('🔄 Réinitialisation complète...');

        // Réinitialiser le filtrage si actif
        if (this.filtering && this.filtering.isActive) {
            this.filtering.resetFiltering();
        }

        // Réinitialiser le core
        this.core.resetForm();

        // Remettre l'état de l'utilisateur
        if (this.odoo && this.odoo.currentUser) {
            this.core.currentUser = this.odoo.currentUser;
        }

        console.log('✅ Réinitialisation terminée');
    }

    quickReset() {
        console.log('⚡ Reset rapide...');

        // Vider les sélections
        this.core.userSelections = {};

        // Désélectionner tous les boutons
        document.querySelectorAll('.option-button.selected').forEach(btn => {
            btn.classList.remove('selected');
        });

        // Vider les conteneurs dynamiques
        this.core.elements.seriesOptions.innerHTML = '';
        this.core.elements.modelOptions.innerHTML = '';

        // Mettre à jour l'affichage
        this.core.updateSummary();
        this.core.hideResults();

        // Refresh avec le filtrage si actif
        if (this.filtering && this.filtering.isActive) {
            this.filtering.refreshAllSteps();
        }

        console.log('✅ Reset rapide terminé');
    }

    // ===== GESTION DES ERREURS =====
    
    handleInitializationError(error) {
        console.error('💥 Erreur fatale d\'initialisation:', error);
        
        // Afficher un message d'erreur à l'utilisateur
        const errorElement = document.getElementById('error');
        if (errorElement) {
            errorElement.style.display = 'block';
            errorElement.innerHTML = `
                <div style="text-align: center; padding: 20px;">
                    <h3>❌ Erreur de chargement</h3>
                    <p>Une erreur est survenue lors du chargement du configurateur.</p>
                    <button onclick="location.reload()" class="btn btn-primary" style="margin-top: 10px;">
                        🔄 Recharger la page
                    </button>
                </div>
            `;
        }

        // Masquer le loading
        const loadingElement = document.getElementById('loading');
        if (loadingElement) {
            loadingElement.style.display = 'none';
        }
    }

    handleResize() {
        // Réajuster les dropdowns si ouverts
        const openDropdowns = document.querySelectorAll('.summary-dropdown.show');
        openDropdowns.forEach(dropdown => {
            dropdown.classList.remove('show');
        });
    }

    // ===== DEBUG ET MONITORING =====
    
    showDebugInfo() {
        console.group('🔍 Debug Configurateur');
        console.log('État d\'initialisation:', this.isInitialized);
        console.log('Core:', this.core);
        console.log('Filtrage actif:', this.filtering?.isActive);
        console.log('Utilisateur connecté:', this.odoo?.currentUser);
        console.log('Sélections actuelles:', this.core?.userSelections);
        console.log('Étape courante:', this.core?.currentStep);
        console.log('Données chargées:', this.core?.dataTable?.length || 0, 'lignes');
        
        if (this.filtering && this.filtering.isActive) {
            this.filtering.debugFilteringState();
        }
        
        console.groupEnd();
    }

    logInitializationSummary() {
        if (this.core.config.debug.enableLogging) {
            console.group('📊 Résumé d\'initialisation');
            console.log('✅ Core initialisé');
            console.log('✅ Configurations chargées:', Object.keys(this.core.config).length, 'sections');
            console.log('✅ Données CSV:', this.core.dataTable.length, 'lignes');
            console.log('✅ Filtrage intelligent:', this.filtering?.isActive ? 'ACTIF' : 'INACTIF');
            console.log('✅ Intégration Odoo: ACTIVE');
            console.log('✅ Utilisateur:', this.odoo?.currentUser ? 'CONNECTÉ' : 'NON CONNECTÉ');
            console.log('✅ Méthodes globales exposées');
            console.log(this.core.texts.debugging.shortcuts);
            console.groupEnd();
        }
    }

    // ===== UTILITAIRES =====
    
    getCurrentState() {
        return {
            isInitialized: this.isInitialized,
            userSelections: this.core?.userSelections || {},
            currentStep: this.core?.currentStep || 1,
            currentUser: this.odoo?.currentUser || null,
            filteringActive: this.filtering?.isActive || false,
            dataLoaded: (this.core?.dataTable?.length || 0) > 0
        };
    }

    async reload() {
        console.log('🔄 Rechargement du configurateur...');
        await this.init();
    }

    // ===== GETTERS =====
    
    get isReady() {
        return this.isInitialized && 
               this.core && 
               this.core.dataTable.length > 0 && 
               this.odoo;
    }

    get version() {
        return this.core?.config?.app?.version || 'inconnue';
    }
}

// ===== INITIALISATION AUTOMATIQUE =====

// Instance globale
let configurator = null;

// Fonction d'initialisation principale
async function initConfigurator() {
    try {
        configurator = new Configurator();
        await configurator.init();
        
        // Exposer globalement
        window.configurator = configurator;
        
        return configurator;
    } catch (error) {
        console.error('💥 Échec de l\'initialisation du configurateur:', error);
        throw error;
    }
}

// Démarrage automatique
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initConfigurator);
} else {
    initConfigurator();
}

// Ajouter les styles d'animation pour les notifications
if (!document.getElementById('configurator-animations')) {
    const style = document.createElement('style');
    style.id = 'configurator-animations';
    style.textContent = `
        @keyframes slideInRight {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOutRight {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
        @keyframes dropdownSlide {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideIn {
            from { opacity: 0; transform: translateY(16px); }
            to { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
    `;
    document.head.appendChild(style);
}

// Message de chargement initial
console.log('🔧 Configurateur L\'Atelier - Chargement en cours...');

// Export pour utilisation externe
window.Configurator = Configurator;
window.initConfigurator = initConfigurator;
